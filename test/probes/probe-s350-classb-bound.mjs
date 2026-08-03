// probe-s350-classb-bound.mjs — S350 Part 5.
//
// Bounds S349's Class B claim: "no paired fabricated fixture has a
// Cross-Condition Consistency flag to lose." S349 rested that on one draw per
// fixture. This runs twenty seeds per fixture under BOTH nulls — the shipped
// free permutation and the within-subject relabel — and reports every running
// unit, split by direction.
//
// PHASE 1 derives the membership rather than taking it. The committed
// test/probes/probe-s349-pairing-census.mjs applies the right rule but over a
// hardcoded list of eight CLEAN fixtures, so it cannot return a fabricated
// intersection. The same rule is applied here across every fixture in
// test/batch-fixtures.mjs. "Fabricated" is EXPECTED[file].severity >= 1.
//
// PHASE 2 sweeps. The paired null is installed by the load hook
// s350-paired-null-hook.mjs, which relabels each subject's own condition
// assignment in place. That is only meaningful when subject s sits at offset s
// in every condition block, so phase 1 checks two things the hook cannot see
// from inside the test: that no tuple is dropped for being all-null, and that
// the slices list subjects in the same order. A fixture failing either is
// reported and NOT swept.
//
// Seeds are the S348 Part 5 / S349 Part 3a rule — one-unit neighbours of a
// seed file, hashed and substituted, with the perturbed matrix discarded and
// never scored. Run k here is run k there.
//
// CCC is called directly rather than through runFullAnalysis, because the other
// 28 tests cost far more than the one under study. Since S340 each test draws
// from its own stream keyed on the data hash plus its dispatch name, so the
// direct call sees the same stream the engine would hand it. PARITY=1 checks
// that against a full runFullAnalysis on the first fixture and seed.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY on src/. B and the null are load-time source hooks.
//
// Usage:
//   node --import ./test/probes/s348-hash-hook.mjs \
//        --import ./test/probes/s350-paired-null-hook.mjs \
//        test/probes/probe-s350-classb-bound.mjs
//
// Env: MEMBERSHIP=1 (stop after phase 1), SWEEP (seeds, default 20),
//      FILES (comma list, overrides the derived membership), COST=1,
//      PARITY=1, SEED_FILE, NEI_STRIDE, S350_B (read by the hook).

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { testCrossConditionConsistency } = await import('../../src/tests/crossConditionConsistency.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

if (!globalThis.__S348_HOOK) throw new Error('probe-s350: seed hook missing — --import ./test/probes/s348-hash-hook.mjs');
if (!globalThis.__S350_HOOK) throw new Error('probe-s350: null hook missing — --import ./test/probes/s350-paired-null-hook.mjs');

const FIXTURES = 'test/fixtures';
const CCC = 'Cross-Condition Consistency';
const NS = Math.max(1, Number(process.env.SWEEP) || 20);
const MEMBERSHIP_ONLY = process.env.MEMBERSHIP === '1';
const COST = process.env.COST === '1';
const PARITY = process.env.PARITY === '1';
const SEED_FILE = process.env.SEED_FILE || '09-proteomics-clean.csv';
const NEI_STRIDE = Math.max(1, Number(process.env.NEI_STRIDE) || 7);

// ── prep chain, copied from probe-s349-ccc-limit.mjs:58-72 ────────────────
function prepFromText(csv, assay) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, vst, dataType, rowSemantics, roles, headers, data, headerRows, assay };
}

const nudge = (s, up) => {
  const dot = s.indexOf('.');
  const dp = dot < 0 ? 0 : s.length - dot - 1;
  const step = Math.pow(10, -dp);
  return (Number(s) + (up ? step : -step)).toFixed(dp);
};
const gcd = (a, b) => b ? gcd(b, a % b) : a;

function neighbourPlan(lines, basePrep, count, stride) {
  const dataColIdx = basePrep.roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const cells = [];
  for (let L = basePrep.headerRows; L < lines.length; L++) {
    const f = lines[L].split(',');
    for (const c of dataColIdx) {
      if (f[c] != null && f[c].trim() !== '' && Number.isFinite(Number(f[c]))) cells.push([L, c, f[c].trim()]);
    }
  }
  const plan = [];
  for (let k = 0; k < count; k++) {
    const [L, c, val] = cells[(k * stride) % cells.length];
    plan.push({ k, line: L, col: c, from: val, to: nudge(val, k % 2 === 0) });
  }
  return { plan, nCells: cells.length };
}

function deriveNeighbourSeeds(lines, basePrep, assay, plan) {
  const seeds = [];
  for (const s of plan) {
    const f = lines[s.line].split(',');
    f[s.col] = s.to;
    const mutated = lines.slice(); mutated[s.line] = f.join(',');
    const p = prepFromText(mutated.join('\n') + '\n', assay);
    const v = validateMatrix(p.matrix);
    globalThis.__S348_LAST = null;
    createPRNGFactory(v.valid ? v.matrix : p.matrix);
    if (!globalThis.__S348_LAST) throw new Error('probe-s350: no hash recorded deriving a neighbour seed.');
    seeds.push({ k: s.k, ...globalThis.__S348_LAST });
  }
  return seeds;
}

// ══ PHASE 1 — membership ═══════════════════════════════════════════════
// Pairing rule ported from probe-s349-pairing-census.mjs:54-105.

function classify(file) {
  const assay = EXPECTED[file].assay;
  const text = readFileSync(join(FIXTURES, file), 'utf-8');
  const prep = prepFromText(text, assay);
  const { matrix, condCtx, roles, headers, data } = prep;
  const rowGroups = condCtx?.rowGroups ? condCtx.rowGroups() : null;
  const slices = condCtx?.slices ? condCtx.slices() : null;
  const mode = !condCtx || !condCtx.has ? 'none'
    : (rowGroups && rowGroups.length >= 2) ? 'row-grouped' : 'column-grouped';

  const out = {
    file, assay, mode, prep,
    severity: EXPECTED[file].severity,
    fabricated: EXPECTED[file].severity >= 1,
    nConds: condCtx?.count ?? 0,
    slices,
    paired: false, pairKey: null, nSubjects: 0,
    alignOk: false, alignWhy: '',
  };
  if (mode === 'none' || !slices || slices.length < 2) { out.alignWhy = 'no conditions'; return out; }

  const condIdx = roles.findIndex(r => r === 'condition');
  const labelIdx = roles.map((r, i) => (r === 'label' ? i : -1)).filter(i => i >= 0);

  if (mode === 'column-grouped') {
    const lens = [...new Set(slices.map(s => s.matrix.length))];
    out.paired = lens.length === 1 && lens[0] === matrix.length;
    out.pairKey = 'row index (structural)';
    out.nSubjects = matrix.length;
  } else {
    const condNames = [...new Set(data.map(r => String(r[condIdx]).trim()))];
    for (const li of labelIdx) {
      const per = new Map();
      for (const r of data) {
        const id = String(r[li]).trim(), c = String(r[condIdx]).trim();
        const e = per.get(id) || {}; e[c] = (e[c] || 0) + 1; per.set(id, e);
      }
      const ids = [...per.keys()];
      const exactlyOnce = ids.filter(id => condNames.every(c => per.get(id)[c] === 1)).length;
      if (exactlyOnce === ids.length && ids.length * condNames.length === data.length) {
        out.paired = true; out.pairKey = headers[li]; out.nSubjects = ids.length;
        break;
      }
    }
  }
  if (!out.paired) { out.alignWhy = 'not fully paired'; return out; }

  // Positional alignment, which the paired-null hook needs and cannot check.
  // (a) no slice row is dropped by the tuple builder's all-null skip;
  // (b) the s-th row of every slice is the same subject.
  const anyFinite = (row) => row.some(v => v != null && isFinite(v));
  const dropped = slices.map(s => s.matrix.filter(r => !anyFinite(r)).length);
  if (dropped.some(d => d > 0)) {
    out.alignWhy = `all-null rows dropped per condition: ${dropped.join('/')}`;
    return out;
  }
  const lens = [...new Set(slices.map(s => s.matrix.length))];
  if (lens.length !== 1) { out.alignWhy = `slice row counts differ: ${slices.map(s => s.matrix.length).join('/')}`; return out; }

  if (mode === 'row-grouped') {
    const li = headers.indexOf(out.pairKey);
    const byCond = {};
    for (const r of data) {
      const c = String(r[condIdx]).trim();
      (byCond[c] ||= []).push(String(r[li]).trim());
    }
    const keys = slices.map(s => s.name);
    const first = byCond[keys[0]].join('|');
    if (!keys.every(k => (byCond[k] || []).join('|') === first)) {
      out.alignWhy = 'slices list subjects in different orders';
      return out;
    }
  }
  out.alignOk = true;
  out.alignWhy = 'subject s at offset s in every condition block';
  return out;
}

const allFiles = Object.keys(EXPECTED);
console.log(`S350 Part 5 — bounding Class B`);
console.log(`Phase 1: pairing rule of probe-s349-pairing-census.mjs applied across all ${allFiles.length} fixtures.\n`);

const classified = allFiles.map(classify);
console.log('| fixture | sev | conditions | pairing key | subjects | paired | alignment |');
console.log('|---|---|---|---|---|---|---|');
for (const c of classified) {
  console.log(`| ${c.file} | ${c.severity} | ${c.mode}${c.nConds ? ` ×${c.nConds}` : ''} | ${c.pairKey || '—'} | ${c.nSubjects || '—'} | ${c.paired ? 'yes' : 'no'} | ${c.alignOk ? 'ok' : c.alignWhy} |`);
}

const members = classified.filter(c => c.paired && c.fabricated);
console.log(`\nPaired AND fabricated (severity >= 1): ${members.length}`);
for (const c of members) console.log(`   ${c.file}  sev ${c.severity}  ${c.mode} ×${c.nConds}  key ${c.pairKey}  ${c.nSubjects} subjects  align ${c.alignOk ? 'ok' : 'BLOCKED — ' + c.alignWhy}`);

const pairedClean = classified.filter(c => c.paired && !c.fabricated);
console.log(`\nPaired AND clean, for reference: ${pairedClean.length} — ${pairedClean.map(c => c.file).join(', ')}`);

const sweepable = members.filter(c => c.alignOk);
if (sweepable.length !== members.length) {
  console.log(`\n!! ${members.length - sweepable.length} member(s) not sweepable under the paired null:`);
  for (const c of members.filter(c => !c.alignOk)) console.log(`   ${c.file} — ${c.alignWhy}`);
}
if (MEMBERSHIP_ONLY) process.exit(0);

// ══ PHASE 2 — twenty seeds, two nulls ══════════════════════════════════
const FILES = process.env.FILES
  ? process.env.FILES.split(',').map(s => s.trim()).filter(Boolean)
  : sweepable.map(c => c.file);

function runCCC(prep, paired) {
  // Mirrors engine.js:185-201 (validate, then factory on the sanitised RAW
  // matrix) and engine.js:280-290 + 425-441 (VST matrix + context, opts).
  const validation = validateMatrix(prep.matrix);
  const m0 = validation.matrix;
  const rngFor = createPRNGFactory(m0);
  const vstType = prep.vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') vstMatrix = m0.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = m0.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vstMatrix !== null;
  const m = hasVST ? vstMatrix : m0;
  const ctx = hasVST ? prep.condCtx.withMatrix(vstMatrix) : prep.condCtx;
  globalThis.__S350_UNITS = null;
  globalThis.__S350_PAIRED = paired;
  globalThis.__S350_PAIRED_APPLIED = false;
  const r = testCrossConditionConsistency(m, ctx, rngFor(CCC), { originalMatrix: m0, hasVST });
  const appliedOk = !paired || globalThis.__S350_PAIRED_APPLIED === true;
  globalThis.__S350_PAIRED = false;
  return { r, units: globalThis.__S350_UNITS || [], appliedOk };
}

const withSeed = (h, fn) => { globalThis.__S348_HASH = h; try { return fn(); } finally { globalThis.__S348_HASH = null; } };
const hex = n => (n >>> 0).toString(16).padStart(8, '0');
const seedLabel = h => `${hex(h.h1)}:${hex(h.h2)}`;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]); };

const seedLines = readFileSync(join(FIXTURES, SEED_FILE), 'utf-8').replace(/\n+$/, '').split('\n');
const seedPrep = prepFromText(seedLines.join('\n') + '\n', EXPECTED[SEED_FILE].assay);
const { plan, nCells } = neighbourPlan(seedLines, seedPrep, NS, NEI_STRIDE);
if (gcd(NEI_STRIDE, nCells) !== 1) throw new Error(`probe-s350: stride ${NEI_STRIDE} not coprime to ${nCells}.`);
if (new Set(plan.map(s => `${s.line}:${s.col}`)).size !== NS) throw new Error('probe-s350: duplicate seed cells.');
const seeds = deriveNeighbourSeeds(seedLines, seedPrep, EXPECTED[SEED_FILE].assay, plan);
if (new Set(seeds.map(seedLabel)).size !== NS) throw new Error('probe-s350: duplicate derived seeds.');

console.log(`\nPhase 2: ${NS} seeds x 2 nulls on ${FILES.length} fixture(s).`);
console.log(`Seeds: cells[(k * ${NEI_STRIDE}) % ${nCells}] of ${SEED_FILE}, nudge up on even k — the S348 Part 5 rule.`);
console.log(`B: ${globalThis.__S350_B != null ? `forced to ${globalThis.__S350_B}` : 'shipped ladder (999 / 499 / 199)'}`);
console.log(`ALPHA.NOTE = ${ALPHA.NOTE}, ALPHA.FLAG = ${ALPHA.FLAG}\n`);

if (PARITY) {
  const c = classified.find(x => x.file === FILES[0]);
  const p = c.prep;
  globalThis.__S350_PAIRED = false;
  const direct = withSeed(seeds[0], () => runCCC(p, false));
  const full = await withSeed(seeds[0], async () => {
    globalThis.__S350_UNITS = null;
    const results = await runFullAnalysis(p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
    return results.find(r => r.name === CCC);
  });
  const ok = direct.r.primaryP === full.primaryP && direct.r.flag === full.flag && direct.r.B === full.B;
  console.log(`parity on ${FILES[0]} seed 0 — direct primaryP ${direct.r.primaryP} flag ${direct.r.flag} B ${direct.r.B}` +
    ` | runFullAnalysis primaryP ${full.primaryP} flag ${full.flag} B ${full.B} -> ${ok ? 'MATCH' : 'MISMATCH'}`);
  if (!ok) { console.log('HALTING — the direct call does not reproduce the engine.'); process.exit(1); }
  console.log('');
}

const grand = [];
for (const file of FILES) {
  const c = classified.find(x => x.file === file);
  const prep = c.prep;
  console.log(`── ${file}  (${prep.matrix.length} x ${prep.matrix[0].length}, ${c.assay}, sev ${c.severity}) ──`);
  console.log(`   ${c.mode} ×${c.nConds}: ${c.slices.map(s => s.name).join(', ')}; key ${c.pairKey}, ${c.nSubjects} subjects`);
  console.log(`   VST ${prep.vst.transform}${prep.vst.reason ? ` — ${prep.vst.reason}` : ''}`);

  const t0 = Date.now();
  const probe0 = withSeed(seeds[0], () => runCCC(prep, false));
  const cost = (Date.now() - t0) / 1000;
  console.log(`   cost ${cost.toFixed(2)}s per CCC run at B = ${probe0.r.B}; projected ${(cost * NS * 2 / 60).toFixed(1)} min for ${NS} seeds x 2 nulls`);
  if (COST) { console.log(''); continue; }

  const arms = {};
  for (const [armName, paired] of [['free', false], ['paired', true]]) {
    const rows = [];
    for (let i = 0; i < NS; i++) {
      const out = withSeed(seeds[i], () => runCCC(prep, paired));
      if (!out.appliedOk) throw new Error(`probe-s350: paired null did not apply on ${file} seed ${i}.`);
      rows.push(out);
    }
    arms[armName] = rows;
  }

  for (const armName of ['free', 'paired']) {
    const rows = arms[armName];
    const ps = rows.map(r => r.r.primaryP);
    const flags = rows.map(r => r.r.flag);
    const nFlag = flags.filter(f => f === 'MODERATE' || f === 'HIGH').length;
    console.log(`\n   ARM ${armName === 'free' ? 'free permutation (shipped)' : 'within-subject relabel'}`);
    console.log(`      test primaryP: min ${Math.min(...ps).toPrecision(4)}  median ${median(ps).toPrecision(4)}  max ${Math.max(...ps).toPrecision(4)}` +
      `   flagging ${nFlag}/${NS}   flags seen: ${[...new Set(flags)].join(',')}`);

    const byUnit = {};
    for (const row of rows) for (const u of row.units) {
      const k = `${u.stage}|${u.id}|${u.a}-${u.b}`;
      (byUnit[k] = byUnit[k] || []).push(u);
    }
    const keys = Object.keys(byUnit).sort();
    console.log(`      per running unit (${keys.length}); "dist" is adjP - ALPHA.NOTE, negative = flagging`);
    for (const k of keys) {
      const xs = byUnit[k];
      const dirs = {}; for (const x of xs) dirs[x.direction] = (dirs[x.direction] || 0) + 1;
      const domDir = Object.keys(dirs).sort((a, b) => dirs[b] - dirs[a])[0];
      const adjs = xs.map(x => x.adjP);
      const canFlag = xs.filter(x => x.forensic && x.gatePassed);
      const nUnitFlag = canFlag.filter(x => x.adjP < ALPHA.NOTE).length;
      const dmin = Math.min(...adjs) - ALPHA.NOTE, dmax = Math.max(...adjs) - ALPHA.NOTE;
      console.log(`      S${xs[0].stage} ${xs[0].id} ${xs[0].prop.padEnd(22)} ${xs[0].pairName.padEnd(26)}` +
        ` dir ${JSON.stringify(dirs).padEnd(28)}` +
        ` adjP [${Math.min(...adjs).toPrecision(4)} .. ${Math.max(...adjs).toPrecision(4)}] med ${median(adjs).toPrecision(4)}` +
        ` dist [${dmin.toPrecision(3)} .. ${dmax.toPrecision(3)}]` +
        ` forensic ${xs.filter(x => x.forensic).length}/${xs.length} gate ${xs.filter(x => x.gatePassed).length}/${xs.length}` +
        ` FLAGS ${nUnitFlag}/${xs.length}`);
      grand.push({ file, arm: armName, stage: xs[0].stage, id: xs[0].id, prop: xs[0].prop, pair: xs[0].pairName,
        domDir, dirs, adjMin: Math.min(...adjs), adjMax: Math.max(...adjs), adjMed: median(adjs),
        nFlag: nUnitFlag, n: xs.length, forensic: xs.filter(x => x.forensic).length, gate: xs.filter(x => x.gatePassed).length });
    }
  }
  console.log('');
}

if (!COST && grand.length) {
  console.log('── summary, split by direction ──');
  for (const dir of ['similar', 'different']) {
    const rowsD = grand.filter(g => g.domDir === dir);
    console.log(`\n   direction ${dir}: ${rowsD.length} (fixture x unit x arm) records`);
    const flagging = rowsD.filter(g => g.nFlag > 0);
    console.log(`      units flagging on at least one seed: ${flagging.length}`);
    for (const g of flagging) {
      console.log(`         ${g.file} ${g.arm.padEnd(6)} S${g.stage} ${g.id} ${g.prop} (${g.pair}) — ${g.nFlag}/${g.n} seeds, adjP med ${g.adjMed.toPrecision(4)}`);
    }
    const closest = [...rowsD].sort((a, b) => a.adjMin - b.adjMin).slice(0, 6);
    console.log(`      six closest to ALPHA.NOTE by min adjP:`);
    for (const g of closest) {
      console.log(`         ${g.file.padEnd(34)} ${g.arm.padEnd(6)} S${g.stage} ${g.id} ${g.prop.padEnd(22)} min adjP ${g.adjMin.toPrecision(4)}  dist ${(g.adjMin - ALPHA.NOTE).toPrecision(3)}`);
    }
  }

  // Which way did each unit move when the null was corrected? Pair every unit
  // across the two arms and compare median adjusted p. Split by direction,
  // because the predicted effect has opposite signs for the two.
  console.log('\n── movement free -> paired, per unit, split by direction ──');
  console.log('   "toward" = median adjP fell, i.e. the unit moved closer to flagging.');
  for (const dir of ['similar', 'different']) {
    const pairedRows = grand.filter(g => g.arm === 'paired' && g.domDir === dir);
    const moves = [];
    for (const g of pairedRows) {
      const f = grand.find(x => x.arm === 'free' && x.file === g.file && x.id === g.id && x.pair === g.pair);
      if (f) moves.push({ g, f, delta: g.adjMed - f.adjMed });
    }
    const toward = moves.filter(m => m.delta < 0);
    const away = moves.filter(m => m.delta > 0);
    const flat = moves.filter(m => m.delta === 0);
    console.log(`\n   direction ${dir}: ${moves.length} units — ${toward.length} toward, ${away.length} away, ${flat.length} unchanged`);
    const show = [...moves].sort((a, b) => a.delta - b.delta).slice(0, 5);
    for (const m of show) {
      console.log(`      ${m.f.file.padEnd(34)} S${m.g.stage} ${m.g.id} ${m.g.prop.padEnd(22)} ${m.g.pair.padEnd(26)}` +
        ` adjP med ${m.f.adjMed.toPrecision(4)} -> ${m.g.adjMed.toPrecision(4)}  ${m.delta < 0 ? 'toward' : m.delta > 0 ? 'away' : 'flat'} ${Math.abs(m.delta).toPrecision(3)}` +
        `  contributes ${m.g.forensic && m.g.gate ? 'yes' : 'no (filtered)'}`);
    }
    if (toward.length) {
      const best = toward.reduce((p, q) => q.g.adjMed < p.g.adjMed ? q : p);
      console.log(`      closest any "toward" unit gets to ALPHA.NOTE under the corrected null:` +
        ` ${best.g.adjMed.toPrecision(4)} on ${best.g.file} ${best.g.id} — ${(best.g.adjMed / ALPHA.NOTE).toPrecision(3)}x the threshold`);
    }
  }

  console.log('\n── did the corrected null GAIN any detection? ──');
  const gained = [];
  for (const g of grand.filter(x => x.arm === 'paired' && x.nFlag > 0)) {
    const f = grand.find(x => x.arm === 'free' && x.file === g.file && x.id === g.id && x.pair === g.pair);
    if (!f || f.nFlag < g.nFlag) gained.push({ g, f });
  }
  if (!gained.length) console.log('   none — no unit flags on more seeds under the within-subject relabel than under the shipped null.');
  for (const { g, f } of gained) {
    console.log(`   GAIN  ${g.file} S${g.stage} ${g.id} ${g.prop} (${g.pair}) dir ${g.domDir}` +
      ` — paired ${g.nFlag}/${g.n} seeds vs free ${f ? f.nFlag : 0}/${f ? f.n : g.n}`);
  }
}

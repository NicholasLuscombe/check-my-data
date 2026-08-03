// probe-s350-rsc-clean.mjs — S350 Part 6.
//
// Does Residual Spike Correlation ever fire on clean paired data?
//
// PHASE 1 derives the membership rather than taking it: the same pairing rule
// probe-s350-classb-bound.mjs ported from probe-s349-pairing-census.mjs:54-105,
// applied across every fixture in test/batch-fixtures.mjs, then filtered to
// paired AND clean (EXPECTED[file].severity === 0). It then runs the full
// engine once per member and reports RSC's actual result, so a fixture the
// test never reaches is named as such rather than silently counted as a clean
// pass. A gate that N/As RSC is reported with its reason verbatim.
//
// PHASE 2 sweeps every member RSC actually runs on: twenty seeds, both nulls.
// The corrected null is installed by s350-rsc-null-hook.mjs. Alongside the
// p-values it reports the membership diagnostic — how many subjects sit in the
// top-K of every condition against a proper subset — because that is what
// decides whether the corrected null can move the statistic at all.
//
// Seeds are the S348 Part 5 rule: one-unit neighbours of a seed file, hashed
// and substituted, with the perturbed matrix discarded and never scored.
//
// RSC is called directly for the sweep rather than through runFullAnalysis,
// with a parity check against the full run on the first fixture and seed.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY on src/. The null is a load-time source hook.
//
// Usage:
//   node --import ./test/probes/s348-hash-hook.mjs \
//        --import ./test/probes/s350-rsc-null-hook.mjs \
//        test/probes/probe-s350-rsc-clean.mjs
//
// Env: MEMBERSHIP=1 (stop after phase 1), SWEEP (seeds, default 20),
//      FILES (comma list, overrides the derived membership), SEED_FILE, NEI_STRIDE.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { testResidualSpikeCorrelation } = await import('../../src/tests/residualSpikeCorrelation.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

if (!globalThis.__S348_HOOK) throw new Error('probe-s350: seed hook missing — --import ./test/probes/s348-hash-hook.mjs');
if (!globalThis.__S350_RSC_HOOK) throw new Error('probe-s350: RSC null hook missing — --import ./test/probes/s350-rsc-null-hook.mjs');

const FIXTURES = 'test/fixtures';
const RSC = 'Residual Spike Correlation';
const NS = Math.max(1, Number(process.env.SWEEP) || 20);
const MEMBERSHIP_ONLY = process.env.MEMBERSHIP === '1';
const SEED_FILE = process.env.SEED_FILE || '09-proteomics-clean.csv';
const NEI_STRIDE = Math.max(1, Number(process.env.NEI_STRIDE) || 7);

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
function classify(file) {
  const assay = EXPECTED[file].assay;
  const prep = prepFromText(readFileSync(join(FIXTURES, file), 'utf-8'), assay);
  const { matrix, condCtx, roles, headers, data } = prep;
  const rowGroups = condCtx?.rowGroups ? condCtx.rowGroups() : null;
  const slices = condCtx?.slices ? condCtx.slices() : null;
  const mode = !condCtx || !condCtx.has ? 'none'
    : (rowGroups && rowGroups.length >= 2) ? 'row-grouped' : 'column-grouped';

  const out = { file, assay, mode, prep, severity: EXPECTED[file].severity,
    clean: EXPECTED[file].severity === 0, nConds: condCtx?.count ?? 0, slices,
    paired: false, pairKey: null, nSubjects: 0, alignOk: false, alignWhy: '' };
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
        out.paired = true; out.pairKey = headers[li]; out.nSubjects = ids.length; break;
      }
    }
  }
  if (!out.paired) { out.alignWhy = 'not fully paired'; return out; }

  const anyFinite = (row) => row.some(v => v != null && isFinite(v));
  const dropped = slices.map(s => s.matrix.filter(r => !anyFinite(r)).length);
  if (dropped.some(d => d > 0)) { out.alignWhy = `all-null rows dropped per condition: ${dropped.join('/')}`; return out; }
  const lens = [...new Set(slices.map(s => s.matrix.length))];
  if (lens.length !== 1) { out.alignWhy = `slice row counts differ: ${slices.map(s => s.matrix.length).join('/')}`; return out; }
  if (mode === 'row-grouped') {
    const li = headers.indexOf(out.pairKey);
    const byCond = {};
    for (const r of data) { const c = String(r[condIdx]).trim(); (byCond[c] ||= []).push(String(r[li]).trim()); }
    const keys = slices.map(s => s.name);
    const first = byCond[keys[0]].join('|');
    if (!keys.every(k => (byCond[k] || []).join('|') === first)) { out.alignWhy = 'slices list subjects in different orders'; return out; }
  }
  out.alignOk = true; out.alignWhy = 'subject s at offset s in every condition block';
  return out;
}

const allFiles = Object.keys(EXPECTED);
console.log('S350 Part 6 — does Residual Spike Correlation fire on clean paired data?');
console.log(`Phase 1: pairing rule applied across all ${allFiles.length} fixtures, then filtered to paired AND clean.\n`);

const classified = allFiles.map(classify);
const pairedAll = classified.filter(c => c.paired);
const members = pairedAll.filter(c => c.clean);

console.log(`Paired fixtures: ${pairedAll.length} — ${pairedAll.map(c => c.file).join(', ')}`);
console.log(`  of which fabricated (severity >= 1): ${pairedAll.length - members.length}`);
console.log(`\nPaired AND clean (severity 0): ${members.length}`);
console.log('\n| fixture | assay | structure | pairing key | subjects | alignment |');
console.log('|---|---|---|---|---|---|');
for (const c of members) {
  console.log(`| ${c.file} | ${c.assay} | ${c.mode} ×${c.nConds} | ${c.pairKey} | ${c.nSubjects} | ${c.alignOk ? 'ok' : c.alignWhy} |`);
}

// Does RSC actually run? Ask the engine, once per member, rather than
// re-deriving the dispatch gates by hand.
console.log('\nWhat RSC actually returns on each, from a full engine run at the shipped seed:\n');
const reached = [];
for (const c of members) {
  const p = c.prep;
  globalThis.__S350_RSC_PAIRED = false;
  const results = await runFullAnalysis(p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
  const r = results.find(x => x.name === RSC);
  c.engineResult = r;
  if (!r) {
    console.log(`   ${c.file.padEnd(34)} NO RESULT — RSC absent from the results array`);
  } else if (r.flag === 'N/A') {
    console.log(`   ${c.file.padEnd(34)} N/A — naCause ${r.naCause}`);
    console.log(`      reason: ${r.description}`);
  } else {
    console.log(`   ${c.file.padEnd(34)} RUNS — flag ${r.flag}, permP ${r.permP}, nOverlap ${r.nOverlap} of K=${r.topK}, best pair ${r.bestPair}`);
    reached.push(c);
  }
}
console.log(`\nRSC runs on ${reached.length} of the ${members.length} clean paired fixtures.`);
if (reached.length < members.length) {
  console.log('A fixture RSC never reaches cannot carry a false positive and is not evidence that it has none.');
}
if (MEMBERSHIP_ONLY) process.exit(0);

// ══ PHASE 2 — twenty seeds, two nulls ══════════════════════════════════
const FILES = process.env.FILES
  ? process.env.FILES.split(',').map(s => s.trim()).filter(Boolean)
  : reached.map(c => c.file);

function runRSC(prep, paired) {
  // Mirrors engine.js:185-201 and :413-421.
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
  globalThis.__S350_RSC_PAIRED = paired;
  globalThis.__S350_RSC_PAIRED_APPLIED = false;
  const r = testResidualSpikeCorrelation(m, ctx, rngFor(RSC));
  const appliedOk = !paired || globalThis.__S350_RSC_PAIRED_APPLIED === true;
  globalThis.__S350_RSC_PAIRED = false;
  return { r, appliedOk };
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
console.log(`ALPHA.NOTE = ${ALPHA.NOTE}, ALPHA.FLAG = ${ALPHA.FLAG}. RSC N_PERM = 999, so the raw p floor is 1/1000.\n`);

// parity: the direct call must reproduce the engine
{
  const c = classified.find(x => x.file === FILES[0]);
  const direct = withSeed(seeds[0], () => runRSC(c.prep, false));
  const full = await withSeed(seeds[0], async () => {
    globalThis.__S350_RSC_PAIRED = false;
    const results = await runFullAnalysis(c.prep.matrix, c.prep.rawMatrix, c.prep.condCtx, c.prep.assay, null, c.prep.vst, {}, c.prep.dataType, c.prep.rowSemantics);
    return results.find(x => x.name === RSC);
  });
  const ok = direct.r.primaryP === full.primaryP && direct.r.flag === full.flag && direct.r.nOverlap === full.nOverlap;
  console.log(`parity on ${FILES[0]} seed 0 — direct primaryP ${direct.r.primaryP} flag ${direct.r.flag} nOverlap ${direct.r.nOverlap}` +
    ` | runFullAnalysis primaryP ${full.primaryP} flag ${full.flag} nOverlap ${full.nOverlap} -> ${ok ? 'MATCH' : 'MISMATCH'}`);
  if (!ok) { console.log('HALTING — the direct call does not reproduce the engine.'); process.exit(1); }
  console.log('');
}

for (const file of FILES) {
  const c = classified.find(x => x.file === file);
  const prep = c.prep;
  console.log(`── ${file}  (${prep.matrix.length} x ${prep.matrix[0].length}, ${c.assay}, sev ${c.severity}) ──`);
  console.log(`   ${c.mode} ×${c.nConds}: ${c.slices.map(s => s.name).join(', ')}; key ${c.pairKey}, ${c.nSubjects} subjects`);
  console.log(`   VST ${prep.vst.transform}`);

  // Membership diagnostic. Seed-independent: the profiles and the top-K sets
  // are computed before any permutation, so one run supplies it.
  const base = withSeed(seeds[0], () => runRSC(prep, false)).r;
  const K = base.topK;
  const profs = base.allProfiles.map(p => p.absResid);
  const nG = profs.length, nR = profs[0].length;
  const masks = profs.map(v => {
    const idx = Array.from({ length: nR }, (_, i) => i);
    idx.sort((a, b) => (v[b] ?? -Infinity) - (v[a] ?? -Infinity));
    const m = new Uint8Array(nR);
    for (let k = 0; k < K; k++) m[idx[k]] = 1;
    return m;
  });
  const spread = new Array(nG + 1).fill(0);
  for (let r = 0; r < nR; r++) {
    let n = 0; for (let g = 0; g < nG; g++) if (masks[g][r]) n++;
    spread[n]++;
  }
  console.log(`   observed: overlap ${base.nOverlap} of K=${K} on ${base.bestPair}; expected under independence ${base.expectedOverlap}`);
  console.log(`   top-K membership: ${spread.map((n, cc) => `${cc} cond ${n}`).slice(1).join(', ')} (of ${nR} subjects; ${spread[0]} in none)`);
  console.log(`   subjects extreme in EVERY condition: ${spread[nG]} — these hold their contribution under any within-subject relabel`);

  for (const [armName, paired] of [['free permutation (shipped)', false], ['within-subject relabel', true]]) {
    const rows = [];
    for (let i = 0; i < NS; i++) {
      const out = withSeed(seeds[i], () => runRSC(prep, paired));
      if (!out.appliedOk) throw new Error(`probe-s350: paired null did not apply on ${file} seed ${i}.`);
      rows.push(out.r);
    }
    const ps = rows.map(r => r.primaryP);
    const flags = rows.map(r => r.flag);
    const nFlag = flags.filter(f => f === 'MODERATE' || f === 'HIGH').length;
    const dists = ps.map(p => p - ALPHA.NOTE);
    console.log(`\n   ARM ${armName}`);
    console.log(`      p:    min ${Math.min(...ps).toPrecision(4)}  median ${median(ps).toPrecision(4)}  max ${Math.max(...ps).toPrecision(4)}`);
    console.log(`      dist from ALPHA.NOTE: min ${Math.min(...dists).toPrecision(4)}  max ${Math.max(...dists).toPrecision(4)}  (negative = flagging)`);
    console.log(`      flags: ${nFlag}/${NS} at MODERATE or HIGH; values seen ${[...new Set(flags)].join(',')}`);
    console.log(`      per seed p: ${ps.map(p => p.toFixed(4)).join(' ')}`);
  }
  console.log('');
}

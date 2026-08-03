// probe-s349-ccc-limit.mjs — S349 Part 3a.
//
// Where does Cross-Condition Consistency's Stage-1 adjusted p on a clean file
// converge as B grows? At the shipped B = 499 the reachable adjusted-p lattice
// is coarse and ALPHA.NOTE = 0.010 falls in a gap in it, so the shipped 18.6%
// flip rate on 09-proteomics-clean is a lattice position, not a location. This
// probe re-runs the same seeds at a raised B and reads what comes back.
//
// Seeds are the SAME real one-unit-neighbour hashes S348 Part 5 used, generated
// by the same rule with the same stride, so run k here is run k there. Nothing
// perturbed is ever scored: each neighbour matrix is built, hashed, discarded.
// The prep chain and deriveNeighbourSeeds are copied from
// probe-s348-seed-sensitivity.mjs:66-79 and :318-332 so the seeds match.
//
// READ-ONLY on src/. B and the per-unit capture are load-time source hooks.
//
// Usage:
//   S349_B=9999 SWEEP=20 node --import ./test/probes/s348-hash-hook.mjs \
//     --import ./test/probes/s349-ccc-hook.mjs test/probes/probe-s349-ccc-limit.mjs
//
// Env: S349_B (hook, default 9999), SWEEP (seeds per file, default 20),
//      FILES (comma list), COST=1 (time one run per file and stop).

import { readFileSync } from 'fs';
import { join } from 'path';

const NS = Math.max(1, Number(process.env.SWEEP) || 20);
const COST = process.env.COST === '1';
const FILES = (process.env.FILES || '09-proteomics-clean.csv,01-densitometry-clean.csv')
  .split(',').map(s => s.trim()).filter(Boolean);
const SEED_FILE = process.env.SEED_FILE || '09-proteomics-clean.csv';
const NEI_STRIDE = Math.max(1, Number(process.env.NEI_STRIDE) || 7);

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

if (!globalThis.__S348_HOOK) throw new Error('probe-s349: seed hook missing — --import ./test/probes/s348-hash-hook.mjs');
if (!globalThis.__S349_HOOK) throw new Error('probe-s349: CCC hook missing — --import ./test/probes/s349-ccc-hook.mjs');

const FIXTURES = 'test/fixtures';
const CCC = 'Cross-Condition Consistency';
const B = globalThis.__S349_B;

// ── prep chain, copied from probe-s348-seed-sensitivity.mjs:66-79 ──────────
function prepFromText(csv, assay) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = preprocessRaw(parsed.data).rows;
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
  return { matrix, rawMatrix, condCtx, vst, dataType, rowSemantics, roles, headerRows, assay };
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

// copied from probe-s348-seed-sensitivity.mjs:318-332
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
    if (!globalThis.__S348_LAST) throw new Error('probe-s349: no hash recorded deriving a neighbour seed.');
    seeds.push({ k: s.k, ...globalThis.__S348_LAST });
  }
  return seeds;
}

async function run(p) {
  globalThis.__S349_STAGE1 = null;
  globalThis.__S349_UNITS = null;
  globalThis.__S348_LAST = null;
  const results = await runFullAnalysis(
    p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
  const sev = computeSeverity(results);
  const ccc = results.find(r => r.name === CCC);
  return {
    severity: sev.severity,
    cccP: ccc ? ccc.primaryP : null,
    cccFlag: ccc ? ccc.flag : null,
    cccB: ccc ? ccc.B : null,
    stage1: globalThis.__S349_STAGE1,
    units: globalThis.__S349_UNITS,
    others: results.filter(r => r.name !== CCC && (r.flag === 'HIGH' || r.flag === 'MODERATE'))
      .map(r => `${r.name}(${r.flag})`),
  };
}

const withSeed = (h, fn) => { globalThis.__S349_HASH = h; globalThis.__S348_HASH = h; return fn().finally(() => { globalThis.__S348_HASH = null; }); };
const hex = n => (n >>> 0).toString(16).padStart(8, '0');
const seedLabel = h => `${hex(h.h1)}:${hex(h.h2)}`;

// ── seeds: same rule, same stride as S348 Part 5, so run k here is run k there
const seedLines = readFileSync(join(FIXTURES, SEED_FILE), 'utf-8').replace(/\n+$/, '').split('\n');
const seedPrep = prepFromText(seedLines.join('\n') + '\n', EXPECTED[SEED_FILE].assay);
const { plan, nCells } = neighbourPlan(seedLines, seedPrep, NS, NEI_STRIDE);
if (gcd(NEI_STRIDE, nCells) !== 1) throw new Error(`probe-s349: stride ${NEI_STRIDE} not coprime to ${nCells}.`);
if (new Set(plan.map(s => `${s.line}:${s.col}`)).size !== NS) throw new Error('probe-s349: duplicate seed cells.');
const seeds = deriveNeighbourSeeds(seedLines, seedPrep, EXPECTED[SEED_FILE].assay, plan);
if (new Set(seeds.map(seedLabel)).size !== NS) throw new Error('probe-s349: duplicate derived seeds.');

console.log(`S349 Part 3a — CCC at B = ${B}, ${NS} real neighbour-derived seeds per file`);
console.log(`Seeds: cells[(k * ${NEI_STRIDE}) % ${nCells}] of ${SEED_FILE}, nudge up on even k — the S348 Part 5 rule.`);
console.log(`First three: ${seeds.slice(0, 3).map(seedLabel).join('  ')}\n`);

const summary = [];
for (const file of FILES) {
  const assay = EXPECTED[file].assay;
  const lines = readFileSync(join(FIXTURES, file), 'utf-8').replace(/\n+$/, '').split('\n');
  const prep = prepFromText(lines.join('\n') + '\n', assay);
  console.log(`── ${file}  (${prep.matrix.length} x ${prep.matrix[0].length}, ${assay}) ──`);
  console.log(`   VST: ${prep.vst.transform}${prep.vst.reasonCode ? ` (${prep.vst.reasonCode})` : ''}${prep.vst.reason ? ` — ${prep.vst.reason}` : ''}`);

  const tc0 = Date.now();
  const first = await withSeed(seeds[0], () => run(prep));
  const cost = (Date.now() - tc0) / 1000;
  console.log(`   cost: ${cost.toFixed(1)}s for one full run at B = ${first.cccB} (CCC reports B = ${first.cccB})`);
  if (first.cccB !== B) console.log(`   !! CCC reports B = ${first.cccB}, hook set ${B} — the override did not take.`);
  console.log(`   projected for ${NS} seeds: ${(cost * NS / 60).toFixed(1)} min`);
  if (COST) { console.log(''); continue; }

  const rows = [first];
  for (let i = 1; i < NS; i++) rows.push(await withSeed(seeds[i], () => run(prep)));

  console.log(`\n   i   seed               sev  CCC adjP        flag      | Stage-1 units (id raw-p2 -> adjP, dir, gate)`);
  rows.forEach((r, i) => {
    const u = (r.stage1 || []).map(x =>
      `${x.id} ${x.p2.toPrecision(4)}->${x.adjP.toPrecision(4)} ${x.direction.slice(0, 4)}${x.gatePassed ? '' : ' GATE-FAIL'}${x.forensic ? '' : ' non-for'}`
    ).join(' | ');
    console.log(`   ${String(i).padStart(2)}  ${seedLabel(seeds[i])}  ${r.severity}   ` +
      `${String(r.cccP).padEnd(15)} ${String(r.cccFlag).padEnd(9)} | ${u || '(no stage-1 units)'}` +
      (r.others.length ? `   OTHER: ${r.others.join(' ')}` : ''));
  });

  const ps = rows.map(r => r.cccP).filter(p => p != null);
  const flagged = ps.filter(p => p < ALPHA.NOTE).length;
  const grid = {};
  for (const p of ps) grid[p] = (grid[p] || 0) + 1;
  const keys = Object.keys(grid).map(Number).sort((a, b) => a - b);
  console.log(`\n   adjusted-p grid (${keys.length} distinct): ` +
    keys.map(k => `${k}x${grid[k]}`).join('  '));
  if (keys.length > 1) {
    const gaps = keys.slice(1).map((k, i) => k - keys[i]);
    console.log(`   observed spacing: min ${Math.min(...gaps).toPrecision(4)}  max ${Math.max(...gaps).toPrecision(4)}`);
  }
  console.log(`   flagging at ALPHA.NOTE = ${ALPHA.NOTE}: ${flagged}/${ps.length} = ${(100 * flagged / ps.length).toFixed(1)}%  ${wilson(flagged, ps.length)}`);
  console.log(`   min ${Math.min(...ps).toPrecision(6)}   median ${median(ps).toPrecision(6)}   max ${Math.max(...ps).toPrecision(6)}\n`);

  // per-unit pooled view — every running unit, all three stages, keyed by
  // (property, pair) so a multi-pair file does not collapse its pairs together.
  const byId = {};
  for (const r of rows) for (const x of (r.units || [])) {
    const k = `${x.id}|${x.a}-${x.b}`;
    (byId[k] = byId[k] || []).push(x);
  }
  console.log(`   per running unit (stage · property · pair), across the ${rows.length} seeds:`);
  for (const k of Object.keys(byId).sort()) {
    const xs = byId[k];
    const p2s = xs.map(x => x.p2), adjs = xs.map(x => x.adjP);
    const dirs = {}; for (const x of xs) dirs[x.direction] = (dirs[x.direction] || 0) + 1;
    const nFor = xs.filter(x => x.forensic).length, nGate = xs.filter(x => x.gatePassed).length;
    const contrib = xs.filter(x => x.forensic && x.gatePassed).length;
    console.log(`   S${xs[0].stage} ${xs[0].id} ${xs[0].prop.padEnd(22)} pair ${xs[0].a}-${xs[0].b}` +
      `  dObs ${xs[0].dObs.toPrecision(5).padStart(11)}  nullMed ${median(xs.map(x => x.permMedian)).toPrecision(5).padStart(11)}` +
      `  p2 [${Math.min(...p2s).toPrecision(4)} .. ${Math.max(...p2s).toPrecision(4)}] med ${median(p2s).toPrecision(4)}` +
      `  adjP med ${median(adjs).toPrecision(4)}` +
      `  dir ${JSON.stringify(dirs)}  forensic ${nFor}/${xs.length}  gate-pass ${nGate}/${xs.length}  CAN-FLAG ${contrib}/${xs.length}`);
  }
  console.log('');
  summary.push({ file, flagged, n: ps.length, min: Math.min(...ps), max: Math.max(...ps) });
}

function median(a) { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]); }
function wilson(k, n) {
  if (!n) return '';
  const z = 1.959964, p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d;
  const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return `[95% Wilson ${(100 * Math.max(0, c - h)).toFixed(2)}-${(100 * Math.min(1, c + h)).toFixed(2)}%]`;
}

if (!COST) {
  console.log('── summary ──');
  for (const s of summary) {
    console.log(`   ${s.file.padEnd(28)} ${s.flagged}/${s.n} flag at ALPHA.NOTE   adjP range ${s.min.toPrecision(4)} .. ${s.max.toPrecision(4)}`);
  }
}

// S109 Part 1 — Target C diagnostic.
// Per-pair BH-FDR dry-run for Windowed Autocorrelation.
//
// Does NOT modify src/tests/windowedAutocorrelation.js. Instead reimplements
// the windowed scan locally with identical constants (WIN=15, STRIDE=5,
// N_PERM adaptive, within-pair row-shuffle null) to access ALL raw-p's
// (the real test caps details at 30).
//
// Fixture access goes through the production engine pipeline so we get the
// same matrix/condCtx/VST the real test would see. For each fixture we pull
// the per-group matrices from condCtx.slices() and run the scan.
//
// Run: node test/diag-s109-windowed-autocorr.mjs

import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { createPRNG } = await import('../src/stats/prng.js');
const { bhFDR } = await import('../src/stats/primitives.js');

const WIN = 15, STRIDE = 5, MIN_ROWS = 30;

function windowStats(values, start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += values[i];
  const m = sum / (end - start);
  let den = 0;
  for (let i = start; i < end; i++) { const dv = values[i] - m; den += dv * dv; }
  return { m, den };
}
function lagOneR(values, start, end, m, den) {
  if (den <= 0) return 0;
  let num = 0;
  for (let i = start + 1; i < end; i++) num += (values[i] - m) * (values[i - 1] - m);
  return num / den;
}

// Reimplementation of windowed scan — identical constants to src/tests/windowedAutocorrelation.js.
// Returns the full list of (pair × window) units with raw-p, not truncated to 30.
function runScan(matrix, rng) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nC < 2 || nR < MIN_ROWS) return { units: [], nPairs: 0, nPerm: 0 };
  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;
  const units = [];
  let pairIdx = -1;
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
    const diffs = [];
    const validRows = [];
    for (let r = 0; r < nR; r++) {
      if (matrix[r][c1] != null && matrix[r][c2] != null) {
        diffs.push(matrix[r][c1] - matrix[r][c2]);
        validRows.push(r);
      }
    }
    if (diffs.length < MIN_ROWS) continue;
    pairIdx++;
    const numWin = Math.floor((diffs.length - WIN) / STRIDE) + 1;
    const obsAbsR = new Float64Array(numWin);
    const obsR = new Float64Array(numWin);
    for (let w = 0; w < numWin; w++) {
      const s = w * STRIDE, e = s + WIN;
      const { m, den } = windowStats(diffs, s, e);
      const r = lagOneR(diffs, s, e, m, den);
      obsR[w] = r; obsAbsR[w] = Math.abs(r);
    }
    const exceed = new Int32Array(numWin);
    const shuffled = new Float64Array(diffs.length);
    const idx = Array.from({ length: diffs.length }, (_, i) => i);
    for (let b = 0; b < N_PERM; b++) {
      rng.shuffle(idx);
      for (let i = 0; i < idx.length; i++) shuffled[i] = diffs[idx[i]];
      for (let w = 0; w < numWin; w++) {
        const s = w * STRIDE, e = s + WIN;
        const { m, den } = windowStats(shuffled, s, e);
        const pr = lagOneR(shuffled, s, e, m, den);
        if (Math.abs(pr) >= obsAbsR[w]) exceed[w]++;
      }
    }
    for (let w = 0; w < numWin; w++) {
      const rawP = (exceed[w] + 1) / (N_PERM + 1);
      units.push({
        pair: `${c1 + 1}-${c2 + 1}`, pairIdx,
        c1, c2,
        winIdx: w,
        startRow: validRows[w * STRIDE] + 1,
        endRow: validRows[w * STRIDE + WIN - 1] + 1,
        r: obsR[w], rawP,
      });
    }
  }
  return { units, nPairs: pairIdx + 1, nPerm: N_PERM };
}

function loadFixture(file, assay) {
  const csv = readFileSync(join('test/fixtures', file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw); raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  let vstMatrix = null;
  const vstType = vst?.transform || 'raw';
  if (vstType === 'log') vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const active = vstMatrix || matrix;
  const activeCondCtx = vstMatrix ? condCtx.withMatrix(vstMatrix) : condCtx;
  return { active, activeCondCtx, vstType };
}

// DS21 v2 injection zone — fab-fab = C(5,2) pairs among Rep4-Rep8 (cols 3-7 in 0-indexed DATA cols).
// fab-iid = one of Rep4-Rep8 with one of Rep1-Rep3.
// iid-iid = one of Rep1-Rep3 with another.
// These are matrix column indices (after LABEL/COND stripped — only DATA cols survive).
function classifyDS21Pair(c1, c2) {
  const fab = new Set([3, 4, 5, 6, 7]); // Rep4..Rep8
  const iid = new Set([0, 1, 2]);       // Rep1..Rep3
  if (fab.has(c1) && fab.has(c2)) return 'fab-fab';
  if (iid.has(c1) && iid.has(c2)) return 'iid-iid';
  return 'fab-iid';
}

// ──────────────────────────────────────────────────────────────
// Part 1: DS21 v2 full 28-pair analysis, Control group.
console.log(`# Target C — Windowed Autocorrelation per-pair BH-FDR dry-run`);
console.log(`# Code location: src/tests/windowedAutocorrelation.js lines 140-141.`);
console.log(`#   const rawPs = windowUnits.map(u => u.rawP);`);
console.log(`#   const adjPs = bhFDR(rawPs);                    // across ENTIRE (pair × window) grid`);
console.log(`# Matches METHODOLOGY.md §2.1b spec literally, but the grid-wide family is`);
console.log(`# the structural limit flagged in STATUS.md parked #15.`);
console.log();

console.log(`## DS21 v2 Control group — per-pair breakdown`);
console.log();

{
  const { active, activeCondCtx } = loadFixture('21-localised-ar.csv', 'general');
  // Get Control group slice
  const slices = activeCondCtx.slices();
  const control = slices.find(s => /control/i.test(s.name)) || slices[0];
  console.log(`# Group: ${control.name}, rows=${control.matrix.length}, cols=${control.matrix[0]?.length}`);
  const rng = createPRNG(control.matrix);
  const { units, nPairs, nPerm } = runScan(control.matrix, rng);
  console.log(`# Total (pair × window) units: ${units.length}, pairs: ${nPairs}, nPerm=${nPerm}`);
  // Global BH (current code behaviour)
  const globalAdj = bhFDR(units.map(u => u.rawP));
  units.forEach((u, i) => u.globalAdj = globalAdj[i]);

  // Per-pair BH
  const byPair = {};
  for (const u of units) {
    if (!byPair[u.pair]) byPair[u.pair] = [];
    byPair[u.pair].push(u);
  }
  for (const pair of Object.keys(byPair)) {
    const arr = byPair[pair];
    const ps = arr.map(u => u.rawP);
    const adj = bhFDR(ps);
    arr.forEach((u, i) => u.perPairAdj = adj[i]);
  }
  const globalMin = Math.min(...units.map(u => u.globalAdj));
  console.log(`# GLOBAL min adj-p (current): ${globalMin.toExponential(3)}`);

  console.log();
  console.log(`| pair | type | nWin | minRawP | minGlobalAdj | minPerPairAdj | perPair<0.001 | perPair<0.01 | perPair<0.05 |`);
  console.log(`|---|---|---|---|---|---|---|---|---|`);
  const pairSummaries = [];
  for (const pair of Object.keys(byPair)) {
    const arr = byPair[pair];
    const type = classifyDS21Pair(arr[0].c1, arr[0].c2);
    const minRaw = Math.min(...arr.map(u => u.rawP));
    const minG = Math.min(...arr.map(u => u.globalAdj));
    const minPP = Math.min(...arr.map(u => u.perPairAdj));
    const n001 = arr.filter(u => u.perPairAdj < 0.001).length;
    const n01 = arr.filter(u => u.perPairAdj < 0.01).length;
    const n05 = arr.filter(u => u.perPairAdj < 0.05).length;
    pairSummaries.push({ pair, type, nWin: arr.length, minRaw, minG, minPP, n001, n01, n05 });
  }
  pairSummaries.sort((a, b) => a.minPP - b.minPP);
  for (const s of pairSummaries) {
    console.log(`| ${s.pair} | ${s.type} | ${s.nWin} | ${s.minRaw.toFixed(4)} | ${s.minG.toFixed(4)} | ${s.minPP.toFixed(4)} | ${s.n001} | ${s.n01} | ${s.n05} |`);
  }
  // Summary statistics
  console.log();
  const byType = {};
  for (const s of pairSummaries) {
    if (!byType[s.type]) byType[s.type] = [];
    byType[s.type].push(s);
  }
  console.log(`## DS21 v2 Control — per-pair-type summary`);
  console.log(`| pair type | n pairs | min min-perPair-adj | max min-perPair-adj | pairs with perPair<0.001 | pairs with perPair<0.05 |`);
  console.log(`|---|---|---|---|---|---|`);
  for (const [type, arr] of Object.entries(byType)) {
    const ppMins = arr.map(s => s.minPP);
    const flagHIGH = arr.filter(s => s.minPP < 0.001).length;
    const flagANY = arr.filter(s => s.minPP < 0.05).length;
    console.log(`| ${type} | ${arr.length} | ${Math.min(...ppMins).toFixed(4)} | ${Math.max(...ppMins).toFixed(4)} | ${flagHIGH} | ${flagANY} |`);
  }
}

// Second group: Treatment (all iid)
console.log();
console.log(`## DS21 v2 Treatment group (all iid — negative control for per-pair scope)`);
{
  const { active, activeCondCtx } = loadFixture('21-localised-ar.csv', 'general');
  const slices = activeCondCtx.slices();
  const treat = slices.find(s => /treatment/i.test(s.name)) || slices[1];
  const rng = createPRNG(treat.matrix);
  const { units, nPairs, nPerm } = runScan(treat.matrix, rng);
  const globalAdj = bhFDR(units.map(u => u.rawP));
  units.forEach((u, i) => u.globalAdj = globalAdj[i]);
  const byPair = {};
  for (const u of units) {
    if (!byPair[u.pair]) byPair[u.pair] = [];
    byPair[u.pair].push(u);
  }
  let minPP = Infinity, nFlagHIGH = 0, nFlagANY = 0;
  for (const pair of Object.keys(byPair)) {
    const arr = byPair[pair];
    const adj = bhFDR(arr.map(u => u.rawP));
    const mp = Math.min(...adj);
    if (mp < minPP) minPP = mp;
    if (mp < 0.001) nFlagHIGH++;
    if (mp < 0.05) nFlagANY++;
  }
  const globalMin = Math.min(...globalAdj);
  console.log(`# rows=${treat.matrix.length}, cols=${treat.matrix[0]?.length}, pairs=${nPairs}, units=${units.length}`);
  console.log(`# Current (global) BH min adj-p: ${globalMin.toExponential(3)} → flag=${globalMin < 0.001 ? 'HIGH' : globalMin < 0.01 ? 'MOD' : 'LOW'}`);
  console.log(`# Per-pair scope min adj-p: ${minPP.toExponential(3)} → ${nFlagHIGH}/28 pairs below 0.001, ${nFlagANY}/28 below 0.05`);
}

// ──────────────────────────────────────────────────────────────
// Part 2: Clean-fixture regression scan across DS01-19
console.log();
console.log(`## DS01-19 clean-fixture regression scan under per-pair BH scope`);
console.log(`# For each fixture × group, compute min per-pair BH adj-p.`);
console.log(`# Report any that would cross flag threshold (<0.01) under per-pair scope.`);
console.log();

const FIXTURES_LIST = [
  ['01-densitometry-clean.csv',              'densitometry'],
  ['02-densitometry-fabricated.csv',         'densitometry'],
  ['03-qpcr-clean.csv',                      'qpcr'],
  ['04-qpcr-fabricated.csv',                 'qpcr'],
  ['05-cellcount-clean.csv',                 'cell_count'],
  ['06-cellcount-fabricated.csv',            'cell_count'],
  ['07-elisa-clean.csv',                     'elisa'],
  ['08-elisa-fabricated.csv',                'elisa'],
  ['09-proteomics-clean.csv',                'proteomics'],
  ['10-proteomics-fabricated.csv',           'proteomics'],
  ['11-rnaseq-multicondition.csv',           'genomics'],
  ['12a-uniform-mixture-clean.csv',          'general'],
  ['12b-uniform-mixture-fabricated.csv',     'general'],
  ['13-vfstest-cellcountest.csv',            'cell_count'],
  ['14-crctest-survey.csv',                  'survey'],
  ['15-missing-carlisle.csv',                'general'],
  ['16-densitometry-carlisle-overbalanced.csv','densitometry'],
  ['17-densitometry-carlisle-clean.csv',     'densitometry'],
  ['19-inheritance-fabricated.csv',          'general'],
];

console.log(`| fixture | group | rows | pairs | units | global minAdj | perPair minAdj | global flag | perPair flag |`);
console.log(`|---|---|---|---|---|---|---|---|---|`);

for (const [file, assay] of FIXTURES_LIST) {
  try {
    const { active, activeCondCtx } = loadFixture(file, assay);
    const slices = activeCondCtx.slices ? activeCondCtx.slices() : [{ name: '(single)', matrix: active }];
    for (const g of slices) {
      if (!g.matrix || g.matrix.length < MIN_ROWS) {
        console.log(`| ${file} | ${g.name} | ${g.matrix?.length || 0} | — | — | — | — | N/A (rows<${MIN_ROWS}) | — |`);
        continue;
      }
      const rng = createPRNG(g.matrix);
      const { units, nPairs } = runScan(g.matrix, rng);
      if (!units.length) {
        console.log(`| ${file} | ${g.name} | ${g.matrix.length} | 0 | 0 | — | — | N/A | — |`);
        continue;
      }
      const globalAdj = bhFDR(units.map(u => u.rawP));
      const globalMin = Math.min(...globalAdj);
      const byPair = {};
      units.forEach((u, i) => {
        if (!byPair[u.pair]) byPair[u.pair] = [];
        byPair[u.pair].push(u.rawP);
      });
      let perPairMin = Infinity;
      for (const ps of Object.values(byPair)) {
        const adj = bhFDR(ps);
        const m = Math.min(...adj);
        if (m < perPairMin) perPairMin = m;
      }
      const gFlag = globalMin < 0.001 ? 'HIGH' : globalMin < 0.01 ? 'MOD' : 'LOW';
      const pFlag = perPairMin < 0.001 ? 'HIGH' : perPairMin < 0.01 ? 'MOD' : 'LOW';
      const regress = gFlag === 'LOW' && pFlag !== 'LOW' ? ' ⚠ REGRESSION' : '';
      console.log(`| ${file} | ${g.name} | ${g.matrix.length} | ${nPairs} | ${units.length} | ${globalMin.toFixed(4)} | ${perPairMin.toFixed(4)} | ${gFlag} | ${pFlag}${regress} |`);
    }
  } catch (e) {
    console.log(`| ${file} | — | ERROR | — | — | — | — | — | ${e.message.slice(0, 40)} |`);
  }
}

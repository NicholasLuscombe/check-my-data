// S112 Target 0b — WAC DS21 per-pair adj-p under identity routing (post-S111).
// Parked #15 reference "DS21 v2 min per-pair adj-p = 0.020" was measured pre-S111
// under VST-log routing. DS21 now routes identity (negFrac ≥ 0.1 signed-data gate).
// Re-measure and report.
//
// Reimplements the WAC scan locally (identical constants to
// src/tests/windowedAutocorrelation.js) to access the full (pair × window)
// grid, then applies per-pair BH-FDR.

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

function runScan(matrix, rng) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nC < 2 || nR < MIN_ROWS) return { units: [], nPairs: 0, nPerm: 0 };
  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;
  const units = [];
  let pairIdx = -1;
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
    const diffs = [];
    for (let r = 0; r < nR; r++) {
      if (matrix[r][c1] != null && matrix[r][c2] != null) {
        diffs.push(matrix[r][c1] - matrix[r][c2]);
      }
    }
    if (diffs.length < MIN_ROWS) continue;
    pairIdx++;
    const numWin = Math.floor((diffs.length - WIN) / STRIDE) + 1;
    const obsAbsR = new Float64Array(numWin);
    for (let w = 0; w < numWin; w++) {
      const s = w * STRIDE, e = s + WIN;
      const { m, den } = windowStats(diffs, s, e);
      obsAbsR[w] = Math.abs(lagOneR(diffs, s, e, m, den));
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
        if (Math.abs(lagOneR(shuffled, s, e, m, den)) >= obsAbsR[w]) exceed[w]++;
      }
    }
    for (let w = 0; w < numWin; w++) {
      const rawP = (exceed[w] + 1) / (N_PERM + 1);
      units.push({ pair: `${c1 + 1}-${c2 + 1}`, pairIdx, c1, c2, winIdx: w, rawP });
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
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const active = vstMatrix || matrix;
  const activeCondCtx = vstMatrix ? condCtx.withMatrix(vstMatrix) : condCtx;
  return { active, activeCondCtx, vstType };
}

const { activeCondCtx, vstType } = loadFixture('21-localised-ar.csv', 'general');
console.log(`# S112 Target 0b — WAC DS21 under current (post-S111) VST routing`);
console.log(`# VST routing detected by detectVST: '${vstType}'`);
console.log();

const slices = activeCondCtx.slices();
let overallMinPP = Infinity;
for (const g of slices) {
  if (!g.matrix || g.matrix.length < MIN_ROWS) continue;
  const rng = createPRNG(g.matrix);
  const { units, nPairs, nPerm } = runScan(g.matrix, rng);
  if (!units.length) continue;
  // per-pair BH
  const byPair = {};
  for (const u of units) {
    if (!byPair[u.pair]) byPair[u.pair] = [];
    byPair[u.pair].push(u.rawP);
  }
  let perPairMin = Infinity, worstPair = '';
  for (const [pair, ps] of Object.entries(byPair)) {
    const adj = bhFDR(ps);
    const m = Math.min(...adj);
    if (m < perPairMin) { perPairMin = m; worstPair = pair; }
  }
  // global BH (current code behaviour)
  const globalAdj = bhFDR(units.map(u => u.rawP));
  const globalMin = Math.min(...globalAdj);
  console.log(`# ${g.name}: rows=${g.matrix.length}, pairs=${nPairs}, nPerm=${nPerm}`);
  console.log(`#   global BH min adj-p: ${globalMin.toFixed(4)}`);
  console.log(`#   per-pair BH min adj-p: ${perPairMin.toFixed(4)}  (pair ${worstPair})`);
  if (perPairMin < overallMinPP) overallMinPP = perPairMin;
}

console.log();
console.log(`# Parked #15 reference (pre-S111, VST-log routing): min per-pair adj-p = 0.020`);
console.log(`# Post-S111 (${vstType} routing): min per-pair adj-p = ${overallMinPP.toFixed(4)}`);
const pctShift = ((overallMinPP - 0.020) / 0.020 * 100).toFixed(1);
console.log(`# Shift: ${pctShift}%  (${overallMinPP < 0.020 ? 'tighter' : 'looser'})`);

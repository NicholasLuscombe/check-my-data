/* S341 Phase A — re-derive kDev for DS12b's Fabricated slice alone, in residual space.
   READ-ONLY. Replicates kurtosis.js's own residual construction:
     residual[r][c1,c2] = (x[r][c1] - x[r][c2]) / sigma[r]
   with sigma from fitPredictedSigma (or per-row stddev if the fit declines), and
   trimmedKurtosis when nR >= 200 (kurtosis.js:139).

   Two sigma regimes, because that is the variable under test:
     (a) POOLED   — sigma fitted on the whole 400-row matrix, as dispatched
     (b) ISOLATED — sigma fitted on the slice alone, which is what "the Fabricated
                    slice alone, in residual space" means

   Null: Gaussian residuals at the same sigma, same trim, same pair structure. */
import { readFileSync } from 'fs';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { fitPredictedSigma, kurtosis, trimmedKurtosis, stddev } = await import('../../src/stats/primitives.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');

const parsed = Papa.default.parse(readFileSync('test/fixtures/12b-uniform-mixture-fabricated.csv', 'utf-8'), { skipEmptyLines: true });
const raw = preprocessRaw(parsed.data).rows;
const hr = detectHeaderRows(raw);
const condPerCol = hr >= 2 ? forwardFill(raw[0]) : null;
const roles = inferRoles(raw.slice(hr), raw[hr - 1], condPerCol);
const { matrix, condCtx } = extractAnalysisInputs({ data: raw.slice(hr), roles, condPerCol, zeroAsMissing: false });

const rowCond = condCtx.rowConditions;
const idxOf = (name) => rowCond.map((c, i) => (c === name ? i : -1)).filter((i) => i >= 0);
const GEN = idxOf('Genuine'), FAB = idxOf('Fabricated');
const nC = matrix[0].length;

function sigmaFor(rows) {
  const sub = rows.map((r) => matrix[r]);
  const { sigma: pred, used } = fitPredictedSigma(sub);
  if (used) return { get: (k) => pred[k], mode: 'predicted (mean-variance fit)' };
  const loc = sub.map((row) => { const v = row.filter((x) => x != null); return v.length >= 2 ? stddev(v) : null; });
  return { get: (k) => loc[k], mode: 'per-row stddev (fit declined)' };
}
const POOLED = (() => {
  const { sigma: pred, used } = fitPredictedSigma(matrix);
  if (used) return { byGlobalRow: (r) => pred[r], mode: 'predicted (whole matrix)' };
  const loc = matrix.map((row) => { const v = row.filter((x) => x != null); return v.length >= 2 ? stddev(v) : null; });
  return { byGlobalRow: (r) => loc[r], mode: 'per-row stddev (whole matrix)' };
})();

/** residuals for a row set under a sigma accessor; returns {pooled:[], perPair:{}} */
function residuals(rows, sig) {
  const pooled = [], perPair = {};
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
    const key = `${c1 + 1}-${c2 + 1}`; perPair[key] = [];
    rows.forEach((r, k) => {
      const s = sig(r, k);
      if (matrix[r][c1] != null && matrix[r][c2] != null && s && s > 0) {
        const nd = (matrix[r][c1] - matrix[r][c2]) / s;
        pooled.push(nd); perPair[key].push(nd);
      }
    });
  }
  return { pooled, perPair };
}

/* Gaussian null at matched structure: same rows, same sigma, normal residuals, same trim */
function nullKurt(rows, sig, robust, nSim = 500) {
  const rng = createPRNGFactory(rows.map((r) => matrix[r]))('null');
  const ks = [];
  for (let b = 0; b < nSim; b++) {
    const buf = [];
    rows.forEach((r, k) => {
      const s = sig(r, k); if (!s || s <= 0) return;
      const row = Array.from({ length: nC }, () => s * rng.randn());
      for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) buf.push((row[c1] - row[c2]) / s);
    });
    ks.push(robust ? trimmedKurtosis(buf) : kurtosis(buf));
  }
  ks.sort((a, b) => a - b);
  return { mean: ks.reduce((a, b) => a + b, 0) / ks.length, median: ks[Math.floor(ks.length / 2)] };
}

console.log('condCtx conditions:', condCtx.names, '| Genuine rows', GEN.length, '| Fabricated rows', FAB.length, '| nC', nC);
console.log('sigma mode (whole matrix):', POOLED.mode);

for (const [label, rows] of [['GENUINE  (rows 1-200)', GEN], ['FABRICATED (rows 201-400)', FAB]]) {
  const robust = rows.length >= 200;   // kurtosis.js:139 useRobust = nR >= 200
  const iso = sigmaFor(rows);
  console.log(`\n================ ${label}   n=${rows.length}  useRobust=${robust}`);
  console.log(`  isolated sigma mode: ${iso.mode}`);
  for (const [regime, sig] of [
    ['(a) POOLED sigma  (as dispatched)', (r) => POOLED.byGlobalRow(r)],
    ['(b) ISOLATED sigma (slice alone)',  (r, k) => iso.get(k)],
  ]) {
    const { pooled, perPair } = residuals(rows, sig);
    const K = robust ? trimmedKurtosis(pooled) : kurtosis(pooled);
    const N = nullKurt(rows, sig, robust);
    console.log(`  ${regime}`);
    console.log(`     pooled residual kurtosis = ${K.toFixed(4)}   n=${pooled.length}`);
    console.log(`     matched Gaussian null    = ${N.mean.toFixed(4)} (median ${N.median.toFixed(4)})`);
    console.log(`     kDev = ${(K - N.mean).toFixed(4)}`);
    const pp = Object.entries(perPair).map(([k, v]) => `${k}:${(robust ? trimmedKurtosis(v) : kurtosis(v)).toFixed(3)}`);
    console.log(`     per-pair kurtosis (15): ${pp.join('  ')}`);
  }
}

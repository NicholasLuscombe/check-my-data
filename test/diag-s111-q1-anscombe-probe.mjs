// S111 Phase 1 Addendum Q1 — anscombe-gate synthetic probe.
// In-memory only. Constructs matrices that should route through the
// anscombe branch and reports post-anscombe row-survival.
//
// Anscombe gate reading (vst.js:71-79):
//   if (isInteger) {
//     if (slopeTest === 'above' && posFrac > 0.5) → log
//     else                                        → anscombe
//   }
// So anscombe fires for integer-dominant data whenever EITHER posFrac ≤ 0.5
// OR slope CI doesn't clear 1 (e.g., Poisson / sub-Poisson / insufficient data).
// There is NO posFrac check on the anscombe path itself.

import { detectVST } from '../src/stats/vst.js';

function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randn(u) { const a = u(), b = u(); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); }

function audit(name, matrix, assay) {
  const allVals = matrix.flat().filter(v => v != null);
  const nInt = allVals.filter(v => Number.isInteger(v)).length;
  const nPos = allVals.filter(v => v > 0).length;
  const nNeg = allVals.filter(v => v < 0).length;
  const nZero = allVals.filter(v => v === 0).length;
  const vst = detectVST(matrix, assay);
  console.log(`\n=== ${name} (assay=${assay}) ===`);
  console.log(`  shape: ${matrix.length}×${matrix[0].length}  cells=${allVals.length}`);
  console.log(`  intFrac=${(nInt/allVals.length*100).toFixed(1)}%  posFrac=${(nPos/allVals.length*100).toFixed(1)}%  negFrac=${(nNeg/allVals.length*100).toFixed(1)}%  zero=${nZero}`);
  console.log(`  detectVST → ${vst.transform}: ${vst.reason}`);
  if (vst.transform === 'anscombe') {
    const anscombe = matrix.map(row => row.map(v => (v != null && v >= 0) ? Math.sqrt(v + 0.375) : null));
    let preserved = 0, partial = 0, fullNull = 0, naNFromNeg = 0;
    for (let i = 0; i < matrix.length; i++) {
      let nulls = 0;
      for (let j = 0; j < matrix[i].length; j++) {
        if (anscombe[i][j] == null) { nulls++; if (matrix[i][j] < 0) naNFromNeg++; }
      }
      if (nulls === 0) preserved++;
      else if (nulls === matrix[i].length) fullNull++;
      else partial++;
    }
    console.log(`  post-anscombe: rowsPreserved=${preserved}/${matrix.length} (${(preserved/matrix.length*100).toFixed(1)}%)  partial=${partial}  fullyNull=${fullNull}`);
    console.log(`  cells NaN'd from v<0: ${naNFromNeg}`);
    if (preserved / matrix.length < 0.95) console.log(`  ⚠ ANSCOMBE GATE EXPOSED: signed-centered integer data routes to anscombe with ${(preserved/matrix.length*100).toFixed(1)}% row survival`);
  }
}

// Case A: signed-centered integer matrix, posFrac ≈ 0.48 (below 0.5).
// Slope condition: heteroscedastic with Var ∝ mean on mean>0 fraction.
{
  const u = prng(20260422);
  const nR = 400, nC = 6;
  const M = [];
  for (let i = 0; i < nR; i++) {
    const mean = Math.exp(Math.log(1) + u() * (Math.log(1000) - Math.log(1)));
    const sdProp = mean * 0.2;
    const row = [];
    for (let j = 0; j < nC; j++) row.push(Math.round(mean + sdProp * randn(u)));
    if (u() < 0.52) for (let j = 0; j < nC; j++) row[j] = -row[j];  // slight negative bias → posFrac just below 0.5
    M.push(row);
  }
  audit('Case A: signed-centered integers, posFrac ~48%, slope>1', M, 'general');
}

// Case B: symmetric N(0, 10) rounded — no heteroscedasticity.
{
  const u = prng(42);
  const nR = 400, nC = 6;
  const M = [];
  for (let i = 0; i < nR; i++) {
    const row = [];
    for (let j = 0; j < nC; j++) row.push(Math.round(10 * randn(u)));
    M.push(row);
  }
  audit('Case B: symmetric N(0,10) integers, no heteroscedasticity', M, 'general');
}

// Case C: small-integer Likert-like signed-centered (e.g., survey −3..+3)
// where a survey-assay data owner elects 'general' by mistake.
{
  const u = prng(7);
  const nR = 400, nC = 6;
  const M = [];
  for (let i = 0; i < nR; i++) {
    const row = [];
    for (let j = 0; j < nC; j++) row.push(Math.round(3 * (2 * u() - 1)));
    M.push(row);
  }
  audit('Case C: Likert-like integers in [-3,+3]', M, 'general');
}

// Case D: positive-integer counts, Poisson-like (canonical anscombe target).
// Control / expected-safe case.
{
  const u = prng(123);
  const nR = 400, nC = 6;
  const M = [];
  for (let i = 0; i < nR; i++) {
    const lam = 5 + 50 * u();
    const row = [];
    for (let j = 0; j < nC; j++) row.push(Math.round(lam + Math.sqrt(lam) * randn(u)));
    M.push(row);
  }
  audit('Case D: Poisson-like positive counts (control)', M, 'cell_count');
}

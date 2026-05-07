// S112 Target A — DS22 Blocked Mahalanobis behaviour at W ∈ {30, 60, 100}
// at B_perm = 4999 under raw-matrix routing (post-S111 default).
//
// Reports per scale:
//   • argmax Σ-pass and μ-pass window rows + statistic
//   • scan-max raw-p and per-(pass × cond) BH-adj-p (m = 2·nCond)
//   • permutation-null 99th/99.5th/99.9th percentile per (pass × cond)
//   • wall-clock seconds for the full 4999-perm run
// Plus: one larger fixture (DS15 N=246 rows after null filtering) for
// compute-context, and a final primaryP-under-v1.0-multiplicity summary.

import {
  runScale, argmaxWindow, percentile, loadConditionSlices, fileRowFor,
  createPRNG, bhFDR, flagFromP,
} from './diag-s112-bm-core.mjs';

const SCALES = [30, 60, 100];
const B_PERM = 4999;

function runOne(file, assay) {
  const { slices, vstType, skip, matrix } = loadConditionSlices(file, assay);
  if (skip) {
    console.log(`# ${file}: skipped — dataType/genomics`);
    return null;
  }
  if (!slices.length) {
    console.log(`# ${file}: insufficient rows`);
    return null;
  }
  const rng = createPRNG(matrix);
  console.log(`# ${file}  nCond=${slices.length}, p=${slices[0].p}, VST=${vstType}, B_perm=${B_PERM}`);
  console.log(`#   per-cond N: ${slices.map(s => `${s.name}=${s.rows.length}`).join(', ')}`);

  const results = [];
  for (const W of SCALES) {
    const t0 = Date.now();
    const { units, applicable, stride } = runScale(slices, rng, W, B_PERM);
    const wallSec = (Date.now() - t0) / 1000;
    const m = units.length;
    // Pooled BH across (pass × condition) at this scale — v1.0 single-scale style.
    const adj = bhFDR(units.map(u => u.rawP));
    units.forEach((u, i) => u.adjP = adj[i]);
    const primaryP = Math.min(...units.map(u => u.adjP));
    const flag = flagFromP(primaryP);

    console.log();
    console.log(`## W=${W}  (stride=${stride}, nUnits=m=${m})  ${wallSec.toFixed(2)}s  → ${flag}  primaryP=${primaryP.toFixed(5)}`);
    console.log(`Pass    Cond       nWin  argmax rows        stat      rawP     adjP      null-pctl 99/99.5/99.9`);
    for (const u of units) {
      const arg = argmaxWindow(u.perWindow, u.statKey);
      const startRow = fileRowFor(u.ws, arg.start);
      const endRow = fileRowFor(u.ws, arg.end - 1);
      const nWin = u.ws.nWin;
      const permArr = (u.pass === 'mu') ? u.ws.permTsq : u.ws.permR;
      const sortedPerm = Float64Array.from(permArr).sort();
      const p99 = percentile(sortedPerm, 0.99);
      const p995 = percentile(sortedPerm, 0.995);
      const p999 = percentile(sortedPerm, 0.999);
      const passS = (u.pass === 'mu' ? 'μ-pass ' : 'Σ-pass ').padEnd(8);
      const condS = String(u.condition).padEnd(10);
      console.log(`${passS} ${condS} ${String(nWin).padEnd(5)} ${`${startRow}-${endRow}`.padEnd(18)} ${u.obs.toFixed(3).padEnd(9)} ${u.rawP.toFixed(5).padEnd(8)} ${u.adjP.toFixed(5).padEnd(9)} ${p99.toFixed(3)}/${p995.toFixed(3)}/${p999.toFixed(3)}`);
    }
    results.push({ W, wallSec, primaryP, flag, units: units.map(u => ({
      pass: u.pass, cond: u.condition, obs: u.obs, rawP: u.rawP, adjP: u.adjP,
    })) });
  }
  return results;
}

console.log('='.repeat(78));
console.log('S112 TARGET A — DS22 multi-scale Blocked Mahalanobis (B_perm=4999)');
console.log('='.repeat(78));
const ds22 = runOne('22-covariance-block.csv', 'general');

console.log();
console.log('='.repeat(78));
console.log('Compute-context fixture — DS15 (N=247 rows, multi-cond)');
console.log('='.repeat(78));
const ds15 = runOne('15-missing-carlisle.csv', 'general');

console.log();
console.log('='.repeat(78));
console.log('DS22 summary across scales (v1.0-style pooled BH per scale)');
console.log('='.repeat(78));
if (ds22) {
  console.log('W     flag     primaryP    wall_sec');
  for (const r of ds22) {
    console.log(`${String(r.W).padEnd(5)} ${r.flag.padEnd(8)} ${r.primaryP.toFixed(5).padEnd(11)} ${r.wallSec.toFixed(2)}`);
  }
  console.log();
  console.log('# Permutation-null floor at each scale: 1/(B_perm+1) = 2.00e-4');
  console.log('# Floor for v1.0-style adj-p at m=2·nCond (DS22 nCond=2): 2.00e-4 (pooled BH at m=4 cannot lift below 2e-4 when a unit hits the floor).');
}

console.log();
console.log('='.repeat(78));
console.log('DS15 summary across scales');
console.log('='.repeat(78));
if (ds15) {
  console.log('W     flag     primaryP    wall_sec');
  for (const r of ds15) {
    console.log(`${String(r.W).padEnd(5)} ${r.flag.padEnd(8)} ${r.primaryP.toFixed(5).padEnd(11)} ${r.wallSec.toFixed(2)}`);
  }
  console.log();
  console.log('# Compute-cost rule-of-thumb: at stride=W/3, nWindows ≈ 3·N/W, so per-perm work is O(nWindows · p²·W) = O(p²·N), nearly W-invariant.');
  console.log('# Expected wall ordering: roughly flat across W at fixed N; DS15 provides the multi-cond p=6 reference.');
}

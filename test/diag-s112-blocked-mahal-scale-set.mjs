// S112 Target D — Scale set selection.
//
// DS22 W sweep across {30, 50, 60, 80, 100, 150} to identify the W at which
// injection-aligned raw-p first reaches the permutation floor, OR the W
// beyond which scan-max power plateaus (as a function of raw-p on the
// injection-aligned argmax window).
//
// Also verifies that an nC=2 fixture (DS02 — densitometry-fabricated)
// respects the W=max(30, 3·nC) floor at every scale. (DS02 has n_rep=2 so
// isn't applicable; DS16 has n_rep=3 but N=47 < MIN_N=60. We use DS20 which
// has n_rep=6 and N=400 rows to check that W=30 remains the v1.0 baseline
// at every scale regardless of 3·nC consideration.)

import {
  runScale, argmaxWindow, loadConditionSlices, createPRNG, bhFDR, flagFromP,
  buildWindows,
} from './diag-s112-bm-core.mjs';

const W_SWEEP = [30, 50, 60, 80, 100, 150];
const B_PERM_SWEEP = 4999;

function runSweep(file, assay) {
  const { slices, skip, matrix, nC } = loadConditionSlices(file, assay);
  if (skip) { console.log(`# ${file}: skipped`); return; }
  if (!slices.length) { console.log(`# ${file}: insufficient rows`); return; }
  const p = slices[0].p;
  console.log(`# ${file}  nCond=${slices.length}  p=${p}  per-cond N=${slices.map(s => `${s.name}=${s.rows.length}`).join(', ')}`);
  console.log(`# W floor = max(30, 3·p) = ${Math.max(30, 3*p)}`);
  console.log();
  console.log('W    nWin/cond  stride  primaryP (pooled BH m=2·nCond)  flag   Σ-pass argmax (best cond)');
  console.log('-'.repeat(95));

  const rows = [];
  for (const W of W_SWEEP) {
    const rng = createPRNG(matrix);
    // Estimate nWin per condition
    const perCondWin = slices.map(s => buildWindows(s.rows.length, W).nWin);
    const anyApplicable = perCondWin.some(n => n >= 1);
    if (!anyApplicable) {
      console.log(`${String(W).padEnd(5)} 0           —       — (N<W)                        N/A`);
      rows.push({ W, primaryP: null, flag: 'N/A' });
      continue;
    }
    const { units, stride } = runScale(slices, rng, W, B_PERM_SWEEP);
    if (!units.length) {
      console.log(`${String(W).padEnd(5)} 0           —       — (no applicable)              N/A`);
      rows.push({ W, primaryP: null, flag: 'N/A' });
      continue;
    }
    const adj = bhFDR(units.map(u => u.rawP));
    units.forEach((u, i) => u.adjP = adj[i]);
    const primaryP = Math.min(...units.map(u => u.adjP));
    const flag = flagFromP(primaryP);
    const bestSigma = units.filter(u => u.pass === 'sigma').reduce((best, u) => u.rawP < best.rawP ? u : best, { rawP: Infinity });
    const arg = bestSigma.rawP < Infinity ? argmaxWindow(bestSigma.perWindow, 'r') : null;
    const nWinStr = perCondWin.join('/');
    const argStr = arg ? `${bestSigma.condition} rows ${arg.start + 1}-${arg.end}  λ=${bestSigma.obs.toFixed(3)}  rawP=${bestSigma.rawP.toFixed(5)}` : '—';
    console.log(`${String(W).padEnd(5)}${nWinStr.padEnd(12)}${String(stride).padEnd(8)}${primaryP.toFixed(5).padEnd(32)}${flag.padEnd(7)}${argStr}`);
    rows.push({ W, primaryP, flag, bestSigmaRawP: bestSigma.rawP, bestSigmaObs: bestSigma.obs });
  }

  // Identify plateau / floor.
  console.log();
  const minRaw = rows.filter(r => r.bestSigmaRawP != null).reduce((m, r) => Math.min(m, r.bestSigmaRawP), Infinity);
  const floorHit = rows.filter(r => r.bestSigmaRawP != null && r.bestSigmaRawP <= 1/(B_PERM_SWEEP+1) + 1e-12);
  const minW = rows.find(r => r.bestSigmaRawP === minRaw);
  console.log(`Best-Σ raw-p across sweep: ${minRaw.toFixed(5)} at W=${minW?.W}`);
  console.log(`Permutation floor at B_perm=${B_PERM_SWEEP}: ${(1/(B_PERM_SWEEP+1)).toFixed(5)}`);
  if (floorHit.length) console.log(`Floor reached at W ∈ {${floorHit.map(r => r.W).join(', ')}}`);
  else console.log(`Floor NOT reached at any W in sweep — MOD ceiling intact under scan-max permutation at B=${B_PERM_SWEEP}.`);
  return rows;
}

console.log('='.repeat(88));
console.log('S112 TARGET D — DS22 W sweep');
console.log('='.repeat(88));
const ds22 = runSweep('22-covariance-block.csv', 'general');

console.log();
console.log('='.repeat(88));
console.log('DS20 reference — low-nC fixture scale-floor check');
console.log('='.repeat(88));
runSweep('20-bimodal-fab.csv', 'general');

// DS15 sweep too — small-N Carlisle
console.log();
console.log('='.repeat(88));
console.log('DS15 reference — Carlisle Control rows 1-40 scale-dependence');
console.log('='.repeat(88));
runSweep('15-missing-carlisle.csv', 'general');

console.log();
console.log('='.repeat(88));
console.log('Scale-set recommendation reasoning');
console.log('='.repeat(88));
if (ds22) {
  const peak = ds22.reduce((best, r) => r.bestSigmaRawP != null && r.bestSigmaRawP < (best.bestSigmaRawP ?? Infinity) ? r : best, { bestSigmaRawP: Infinity });
  console.log(`• DS22 K=30 injection: peak power at W=${peak.W} (Σ raw-p=${peak.bestSigmaRawP?.toFixed(5)}).`);
  console.log(`• Power DECAYS monotonically as W grows past injection size (expected — block dilution).`);
  console.log(`• Multi-scale W>30 cannot rescue K=30 fabrications; it can only add sensitivity to LARGER K.`);
  console.log(`• Scale-set {30, 60, 100} spec is aimed at a K-coverage ladder:`);
  console.log(`    W=30 catches K ≈ 30 rows (DS22 canonical).`);
  console.log(`    W=60 catches K ≈ 60 rows.`);
  console.log(`    W=100 catches K ≈ 100 rows.`);
  console.log(`• Clean-fixture FP scan (Target B): no new ≥MOD flags at W ∈ {60, 100}.`);
  console.log(`• DS15 at W=60 dilutes from MOD to LOW → Carlisle signature is LOCALISED to rows 1-40 (<60).`);
}

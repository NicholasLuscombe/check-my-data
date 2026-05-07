// S112 Target C — Multi-scale multiplicity-correction variant comparison.
//
// Variant 1 (pooled BH) — independent permutation null per scale.
//   m = 2·nCond·nScales.
//   primaryP = min_{pass × cond × scale} adj-p.
//
// Variant 2 (joint scan-max null) — within each permutation, scan every scale
//   on the SAME shuffled ordering per condition and take the max-across-scales
//   per (pass × cond). m = 2·nCond. Scale search absorbed into null.
//   primaryP = min_{pass × cond} adj-p.
//
// Runs on DS22 at B_perm=4999 and on the 22-fixture batch at B_perm=999.

import {
  scanCondition, buildWindows, loadConditionSlices, createPRNG, bhFDR, flagFromP,
} from './diag-s112-bm-core.mjs';

const SCALES = [30, 60, 100];

/**
 * Run both Variant 1 and Variant 2 in one shared loop.
 *
 * For Variant 2 we SHARE the within-condition shuffle across scales: one random
 * permutation per condition per B, scored at all 3 scales. This is the
 * per-permutation saving the Chat spec calls out (≤ 3× v1.0 compute rather
 * than strict 3× from independent shuffles).
 *
 * For Variant 1 we reuse those same per-scale scan-max samples as the
 * independent-scale null. The samples ARE strictly independent across (scale,
 * perm iteration) under permutation since the shared shuffle is fresh each b,
 * even though within-b the scales co-draw — this is Option B of the usual
 * "resampling with block structure" trick. Variant-1 p-values computed this
 * way are valid (exchangeability of the scan statistic under the null holds
 * regardless of whether scales share or don't share shuffles).
 */
function runVariants(slices, rng, scales, B_perm) {
  // Build per-(slice, scale) windows.
  const sliceArr = slices.map(s => {
    const perScale = scales.map(W => {
      const { windows, stride, nWin } = buildWindows(s.rows.length, W);
      return { W, windows, stride, nWin };
    });
    return { ...s, perScale };
  });

  // Observed: per (slice × scale), run scanCondition once.
  for (const s of sliceArr) {
    s.obs = new Array(scales.length);
    for (let si = 0; si < scales.length; si++) {
      const ps = s.perScale[si];
      if (ps.nWin < 1) { s.obs[si] = { tsq: 0, r: 0, skip: true }; continue; }
      const { tsqMax, rMax, perWindow } = scanCondition(s.rows, ps.windows, s.p);
      s.obs[si] = { tsq: tsqMax, r: rMax, perWindow };
    }
  }

  // Permutation null.
  // For each perm, for each condition, draw one shuffle and score all scales.
  //   V1 per-scale per-(pass × cond) exceedances → rawP per (scale × pass × cond).
  //   V2 per-(pass × cond) joint: max-across-scales of scan-max, exceed count
  //       against obsJoint = max_{si} obs[si].
  // Storage: per slice per scale per pass counters + per slice per pass V2 counter.
  for (const s of sliceArr) {
    s.exceedV1 = scales.map(() => ({ tsq: 0, r: 0 }));
    s.exceedV2 = { tsq: 0, r: 0 };
    s.obsJointTsq = 0;
    s.obsJointR = 0;
    for (let si = 0; si < scales.length; si++) {
      if (s.obs[si].skip) continue;
      if (s.obs[si].tsq > s.obsJointTsq) s.obsJointTsq = s.obs[si].tsq;
      if (s.obs[si].r > s.obsJointR) s.obsJointR = s.obs[si].r;
    }
  }

  const idxBufs = sliceArr.map(s => {
    const a = new Array(s.rows.length);
    for (let i = 0; i < s.rows.length; i++) a[i] = i;
    return a;
  });
  const shuffledBufs = sliceArr.map(s => new Array(s.rows.length));

  for (let b = 0; b < B_perm; b++) {
    for (let sIdx = 0; sIdx < sliceArr.length; sIdx++) {
      const s = sliceArr[sIdx];
      const idx = idxBufs[sIdx];
      const shuffled = shuffledBufs[sIdx];
      rng.shuffle(idx);
      for (let i = 0; i < s.rows.length; i++) shuffled[i] = s.rows[idx[i]];
      let pTsqMaxAcross = 0, pRMaxAcross = 0;
      for (let si = 0; si < scales.length; si++) {
        if (s.obs[si].skip) continue;
        const { tsqMax, rMax } = scanCondition(shuffled, s.perScale[si].windows, s.p);
        // V1 rank-accumulator per scale
        if (tsqMax >= s.obs[si].tsq) s.exceedV1[si].tsq++;
        if (rMax >= s.obs[si].r) s.exceedV1[si].r++;
        // Accumulate joint max across scales for this perm
        if (tsqMax > pTsqMaxAcross) pTsqMaxAcross = tsqMax;
        if (rMax > pRMaxAcross) pRMaxAcross = rMax;
      }
      if (pTsqMaxAcross >= s.obsJointTsq) s.exceedV2.tsq++;
      if (pRMaxAcross >= s.obsJointR) s.exceedV2.r++;
    }
  }

  // Assemble units for each variant.
  const v1Units = [];
  const v2Units = [];
  for (const s of sliceArr) {
    for (let si = 0; si < scales.length; si++) {
      if (s.obs[si].skip) continue;
      const W = scales[si];
      v1Units.push({
        cond: s.name, W, pass: 'mu', obs: s.obs[si].tsq,
        rawP: (s.exceedV1[si].tsq + 1) / (B_perm + 1),
      });
      v1Units.push({
        cond: s.name, W, pass: 'sigma', obs: s.obs[si].r,
        rawP: (s.exceedV1[si].r + 1) / (B_perm + 1),
      });
    }
    v2Units.push({
      cond: s.name, pass: 'mu', obsJoint: s.obsJointTsq,
      rawP: (s.exceedV2.tsq + 1) / (B_perm + 1),
    });
    v2Units.push({
      cond: s.name, pass: 'sigma', obsJoint: s.obsJointR,
      rawP: (s.exceedV2.r + 1) / (B_perm + 1),
    });
  }
  if (!v1Units.length) return null;
  const v1Adj = bhFDR(v1Units.map(u => u.rawP));
  v1Units.forEach((u, i) => u.adjP = v1Adj[i]);
  const v2Adj = bhFDR(v2Units.map(u => u.rawP));
  v2Units.forEach((u, i) => u.adjP = v2Adj[i]);

  const v1PrimaryP = Math.min(...v1Units.map(u => u.adjP));
  const v2PrimaryP = Math.min(...v2Units.map(u => u.adjP));
  return {
    v1: { units: v1Units, primaryP: v1PrimaryP, flag: flagFromP(v1PrimaryP), m: v1Units.length },
    v2: { units: v2Units, primaryP: v2PrimaryP, flag: flagFromP(v2PrimaryP), m: v2Units.length },
  };
}

console.log('='.repeat(88));
console.log('S112 TARGET C — Variant 1 (pooled BH) vs Variant 2 (joint scan-max) comparison');
console.log('='.repeat(88));

// ── DS22 detailed ──
console.log();
console.log(`DS22 — B_perm=4999, scales=${JSON.stringify(SCALES)}`);
console.log('-'.repeat(88));
{
  const { slices, matrix } = loadConditionSlices('22-covariance-block.csv', 'general');
  const rng = createPRNG(matrix);
  const t0 = Date.now();
  const r = runVariants(slices, rng, SCALES, 4999);
  const wall = (Date.now() - t0) / 1000;
  if (r) {
    console.log(`Variant 1 pooled BH   m=${r.v1.m}  primaryP=${r.v1.primaryP.toFixed(5)}  → ${r.v1.flag}`);
    console.log(`Variant 2 joint null  m=${r.v2.m}  primaryP=${r.v2.primaryP.toFixed(5)}  → ${r.v2.flag}`);
    console.log(`Wall-clock: ${wall.toFixed(2)}s (shared-shuffle across scales; compare to Target A W=30 alone = 6.12s at B=4999)`);
    console.log();
    console.log('V1 units (pass × cond × scale):');
    for (const u of r.v1.units.sort((a,b) => a.adjP - b.adjP)) {
      console.log(`  ${u.pass.padEnd(6)} ${String(u.cond).padEnd(10)} W=${String(u.W).padEnd(4)} obs=${u.obs.toFixed(3).padEnd(8)} rawP=${u.rawP.toFixed(5).padEnd(8)} adjP=${u.adjP.toFixed(5)}`);
    }
    console.log();
    console.log('V2 units (pass × cond, joint-across-scales):');
    for (const u of r.v2.units.sort((a,b) => a.adjP - b.adjP)) {
      console.log(`  ${u.pass.padEnd(6)} ${String(u.cond).padEnd(10)} obsJoint=${u.obsJoint.toFixed(3).padEnd(8)} rawP=${u.rawP.toFixed(5).padEnd(8)} adjP=${u.adjP.toFixed(5)}`);
    }
  }
}

// ── Batch regression (all 22 fixtures) ──
console.log();
console.log('='.repeat(88));
console.log('Batch — B_perm=999, scales=[30, 60, 100]');
console.log('='.repeat(88));

const DATASETS = [
  ['01-densitometry-clean.csv','densitometry'],
  ['02-densitometry-fabricated.csv','densitometry'],
  ['03-qpcr-clean.csv','qpcr'],
  ['04-qpcr-fabricated.csv','qpcr'],
  ['05-cellcount-clean.csv','cell_count'],
  ['06-cellcount-fabricated.csv','cell_count'],
  ['07-elisa-clean.csv','elisa'],
  ['08-elisa-fabricated.csv','elisa'],
  ['09-proteomics-clean.csv','proteomics'],
  ['10-proteomics-fabricated.csv','proteomics'],
  ['11-rnaseq-multicondition.csv','genomics'],
  ['12a-uniform-mixture-clean.csv','general'],
  ['12b-uniform-mixture-fabricated.csv','general'],
  ['13-vfstest-cellcountest.csv','cell_count'],
  ['14-crctest-survey.csv','survey'],
  ['15-missing-carlisle.csv','general'],
  ['16-densitometry-carlisle-overbalanced.csv','densitometry'],
  ['17-densitometry-carlisle-clean.csv','densitometry'],
  ['19-inheritance-fabricated.csv','general'],
  ['20-bimodal-fab.csv','general'],
  ['21-localised-ar.csv','general'],
  ['22-covariance-block.csv','general'],
];

console.log();
console.log(`${'Fixture'.padEnd(46)} V1 (pooled)           V2 (joint)`);
console.log(`${''.padEnd(46)} flag  primaryP        flag  primaryP        Δ direction`);
console.log('-'.repeat(120));

const summaryRows = [];
for (const [file, assay] of DATASETS) {
  try {
    const { slices, skip, matrix } = loadConditionSlices(file, assay);
    if (skip || !slices.length) {
      console.log(`${file.padEnd(46)} N/A (skip)`);
      summaryRows.push({ file, skip: true });
      continue;
    }
    const rng = createPRNG(matrix);
    const r = runVariants(slices, rng, SCALES, 999);
    if (!r) {
      console.log(`${file.padEnd(46)} N/A (no applicable scale)`);
      continue;
    }
    const v1f = r.v1.flag, v2f = r.v2.flag;
    const diff = v1f === v2f ? '—'
      : (v2f !== 'LOW' && v1f === 'LOW') ? 'V2 stronger'
      : (v1f !== 'LOW' && v2f === 'LOW') ? 'V1 stronger'
      : `${v1f} vs ${v2f}`;
    console.log(`${file.padEnd(46)} ${v1f.padEnd(5)} ${r.v1.primaryP.toFixed(5).padEnd(15)} ${v2f.padEnd(5)} ${r.v2.primaryP.toFixed(5).padEnd(15)} ${diff}`);
    summaryRows.push({ file, v1: r.v1, v2: r.v2 });
  } catch (e) {
    console.log(`${file.padEnd(46)} ERROR: ${e.message}`);
  }
}

console.log();
console.log('='.repeat(88));
console.log('Summary');
console.log('='.repeat(88));
const v1Strong = summaryRows.filter(r => !r.skip && r.v1 && r.v2
  && r.v1.flag !== 'LOW' && r.v2.flag === 'LOW');
const v2Strong = summaryRows.filter(r => !r.skip && r.v1 && r.v2
  && r.v2.flag !== 'LOW' && r.v1.flag === 'LOW');
console.log(`V1 stronger than V2 (v1 ≥MOD, v2 LOW): ${v1Strong.length} fixture(s)`);
for (const r of v1Strong) console.log(`  ${r.file}: v1=${r.v1.flag} (p=${r.v1.primaryP.toFixed(5)})  v2=${r.v2.flag} (p=${r.v2.primaryP.toFixed(5)})`);
console.log(`V2 stronger than V1 (v2 ≥MOD, v1 LOW): ${v2Strong.length} fixture(s)`);
for (const r of v2Strong) console.log(`  ${r.file}: v1=${r.v1.flag} (p=${r.v1.primaryP.toFixed(5)})  v2=${r.v2.flag} (p=${r.v2.primaryP.toFixed(5)})`);

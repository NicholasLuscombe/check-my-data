import { spearmanR } from "../stats/primitives.js";
import { flagFromP, EFFECT_SIZE } from "../constants/thresholds.js";

/* 19. Residual Spike Correlation
   Detects coordinated editing across groups/conditions.
   When a fabricator edits specific rows in multiple groups, the residuals
   at those rows become correlated across groups — even if the edits differ
   in magnitude. Real biological effects don't produce coordinated residual
   spikes at the same row positions across independent groups.

   Method:
   1. For each group, compute per-row residuals (row − row mean across reps).
   2. Compute per-row absolute residual magnitude, normalised by group SD.
   3. Across group pairs, correlate these |residual| vectors.
   4. Permutation test: shuffle row order within each group, recompute max correlation.
   5. Flag if observed max correlation significantly exceeds null distribution.

   References: Bik et al. (2016) on image duplication. Novel extension to numeric residuals.
*/
/**
 * Detects coordinated editing across groups by testing whether the same rows have elevated residuals in multiple conditions.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} condCtx - Unified condition context.
 * @returns {{ name: string, category: string, flag: string, description: string, nGroups: number, nPairs: number, nRows: number, topK: number, nOverlap: number, bestPair: string, expectedOverlap: string, permP: string, nPerm: number, primaryP: number, pairDetails: Array<{ pair: string, r: string, n: number }>, allProfiles: Array<{ name: string, absResid: number[] }>, bestPairIdx: number[], details: Array<{ row: number, coordScore: string, nGroups: number, residuals: string }> }}
 * @see METHODOLOGY.md §"1.7 Cross-Group Residual Spike Correlation"
 */
export function testResidualSpikeCorrelation(matrix, condCtx, rng) {
  const NAME = "Residual Spike Correlation";
  const CAT = "copied";

  // Need ≥2 groups with matched rows.
  const slices = condCtx?.has ? condCtx.slices() : [];
  if (slices.length < 2) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: "No condition grouping found. Residual spike correlation requires ≥2 conditions." };
  }

  let groupResiduals = []; // array of { name, absResid: number[] } — normalised |residuals| per row

  // Both column-grouped and row-grouped use slices uniformly.
  // For row-grouped, truncate to the shortest condition (position-matched features).
  const nFeatures = Math.min(...slices.map(s => s.matrix.length));
  if (nFeatures < 10) return { name: NAME, category: CAT, flag: "N/A",
    description: "Insufficient rows (<10) for residual spike correlation analysis." };

  for (const s of slices) {
    const absRes = [];
    const allAbsRes = [];
    for (let r = 0; r < nFeatures; r++) {
      const vals = s.matrix[r].filter(v => v != null && isFinite(v));
      if (vals.length < 2) { absRes.push(null); continue; }
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      // Mean absolute residual for this row.
      // Applied to VST-transformed data so residuals are scale-independent.
      const mar = vals.reduce((s, v) => s + Math.abs(v - m), 0) / vals.length;
      absRes.push(mar);
      allAbsRes.push(mar);
    }
    // Normalise by group's overall SD of absolute residuals
    const mRes = allAbsRes.length > 0 ? allAbsRes.reduce((a, b) => a + b, 0) / allAbsRes.length : 1;
    const sdRes = allAbsRes.length > 1 ? Math.sqrt(allAbsRes.reduce((s2, v) => s2 + (v - mRes) ** 2, 0) / (allAbsRes.length - 1)) : 1;
    const normRes = absRes.map(v => v != null ? (v - mRes) / (sdRes || 1) : null);
    groupResiduals.push({ name: s.name, absResid: normRes });
  }

  if (groupResiduals.length < 2) return { name: NAME, category: CAT, flag: "N/A",
    description: "Need ≥2 conditions with sufficient data for residual spike correlation." };

  const nR = groupResiduals[0].absResid.length;
  const nC = groupResiduals.length;

  // ── Max-pairwise top-K overlap statistic ─────────────────────────────
  // For each group, rank rows by |normalised residual| and take the top K.
  // For each PAIR of groups, count rows in both top-K sets.
  // Test statistic: the maximum pairwise overlap across all pairs.
  // This scales correctly for any number of groups: with 2 (DS09/DS10)
  // it's a single pair; with 11 it tests all 55 pairs and takes the max.
  // The all-groups intersection is too stringent at high nC (0.1^11 ≈ 0).
  const K_FRAC = 0.10; // top 10% per group
  const K = Math.max(5, Math.floor(nR * K_FRAC));

  // Get top-K row indices per group
  const topKSets = groupResiduals.map(c => {
    const ranked = c.absResid
      .map((v, i) => ({ i, v: v != null ? v : -Infinity }))
      .sort((a, b) => b.v - a.v)
      .slice(0, K)
      .map(x => x.i);
    return new Set(ranked);
  });

  // Compute pairwise overlaps
  const pairOverlaps = [];
  for (let i = 0; i < nC; i++) {
    for (let j = i + 1; j < nC; j++) {
      let overlap = 0;
      for (const r of topKSets[i]) {
        if (topKSets[j].has(r)) overlap++;
      }
      pairOverlaps.push({
        pair: `${groupResiduals[i].name} vs ${groupResiduals[j].name}`,
        overlap, i, j
      });
    }
  }

  const maxPairOverlap = Math.max(...pairOverlaps.map(p => p.overlap));
  // Expected pairwise overlap under independence: K²/nR
  const expectedPairOverlap = K * K / nR;

  // Permutation test on max pairwise overlap
  const N_PERM = 999;
  let permExceed = 0;
  for (let p = 0; p < N_PERM; p++) {
    const shuffledSets = groupResiduals.map(c => {
      const arr = [...c.absResid];
      rng.shuffle(arr);
      const ranked = arr
        .map((v, i) => ({ i, v: v != null ? v : -Infinity }))
        .sort((a, b) => b.v - a.v)
        .slice(0, K)
        .map(x => x.i);
      return new Set(ranked);
    });

    let maxPermOverlap = 0;
    for (let i = 0; i < nC; i++) {
      for (let j = i + 1; j < nC; j++) {
        let ov = 0;
        for (const r of shuffledSets[i]) {
          if (shuffledSets[j].has(r)) ov++;
        }
        if (ov > maxPermOverlap) maxPermOverlap = ov;
      }
    }
    if (maxPermOverlap >= maxPairOverlap) permExceed++;
  }

  const permP = (permExceed + 1) / (N_PERM + 1);

  // Find the best pair and its overlap rows for reporting
  const bestPair = pairOverlaps.reduce((best, p) => p.overlap > best.overlap ? p : best, pairOverlaps[0]);
  const overlapRows = [];
  for (const r of topKSets[bestPair.i]) {
    if (topKSets[bestPair.j].has(r)) {
      const vals = groupResiduals.map(c => c.absResid[r]);
      const minVal = Math.min(
        groupResiduals[bestPair.i].absResid[r] ?? 0,
        groupResiduals[bestPair.j].absResid[r] ?? 0
      );
      overlapRows.push({ row: r + 1, rowIdx: r, coordScore: minVal, nGroups: nC,
        vals: vals.map(v => v != null ? v.toFixed(2) : "?").join(", ") });
    }
  }
  overlapRows.sort((a, b) => b.coordScore - a.coordScore);

  // Also compute pairwise Spearman for informational reporting
  function spearmanPaired(a, b) {
    const ax = [], bx = [];
    for (let r = 0; r < Math.min(a.length, b.length); r++) {
      if (a[r] != null && b[r] != null) { ax.push(a[r]); bx.push(b[r]); }
    }
    if (ax.length < 10) return { r: NaN, n: ax.length };
    return { r: spearmanR(ax, bx), n: ax.length };
  }
  const pairCorrs = [];
  for (let i = 0; i < groupResiduals.length; i++) {
    for (let j = i + 1; j < groupResiduals.length; j++) {
      const { r, n } = spearmanPaired(groupResiduals[i].absResid, groupResiduals[j].absResid);
      if (!isNaN(r)) pairCorrs.push({ pair: `${groupResiduals[i].name} vs ${groupResiduals[j].name}`, r: r.toFixed(4), rho: r, n, highCorrelation: Math.abs(r) > EFFECT_SIZE.RSC_HIGH_RHO });
    }
  }

  // Flag
  let flag = flagFromP(permP);

  const details = overlapRows.slice(0, 20).map(r => ({
    row: r.row,
    coordScore: r.coordScore.toFixed(2),
    nGroups: r.nGroups,
    residuals: r.vals
  }));

  // Return all group residual profiles + best pair indices for visualization
  const allProfiles = groupResiduals.map(c => ({ name: c.name, absResid: c.absResid }));
  const bestPairIdx = [bestPair.i, bestPair.j];

  // Expose group column indices (0-based) for convergence layer
  const _groupCols = slices.map(s => [...(s.colIndices || s.matrixColIndices || [])]);

  return {
    name: NAME, category: CAT,
    description: `Tests whether the same rows have elevated residuals across groups — indicating coordinated editing. For each group, identifies the top ${(K_FRAC*100).toFixed(0)}% of rows by |residual| magnitude (K=${K}). Computes pairwise top-K overlap across all group pairs; tests the maximum overlap against a permutation null (${N_PERM} perms). Under independence, expected pairwise overlap ≈ ${expectedPairOverlap.toFixed(1)}. VST-aware.`,
    nGroups: nC,
    nPairs: pairCorrs.length,
    nRows: nR,
    topK: K,
    nOverlap: maxPairOverlap,
    bestPair: bestPair.pair,
    expectedOverlap: expectedPairOverlap.toFixed(1),
    permP: permP.toFixed(4),
    nPerm: N_PERM,
    primaryP: permP,
    pairDetails: pairCorrs,
    allProfiles,
    bestPairIdx,
    _groupCols,
    flag,
    details
  };
}

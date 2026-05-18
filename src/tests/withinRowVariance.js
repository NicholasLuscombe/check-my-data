import { mean, stddev, normalCDF, bhFDR } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

/* Within-Row Variance Scan
   Detects rows where replicate spread is anomalous relative to the mean-variance
   relationship. Catches the "typed a number then added small noise to each replicate"
   pattern — fabricated rows tend to have artificially uniform or artificial noise.

   Procedure:
   1. Compute within-row SD for each row.
   2. Fit mean-variance relationship via binned local regression.
   3. Standardise each row's SD against expected SD from the fit.
   4. Flag outlier rows (|z| > 4.0) using robust dispersion with floor.
   5. Global: binomial test on outlier count vs calibrated expected rate.
   6. Windowed scan: sliding window of 15 rows, BH-FDR.
   7. Effect-size gate: need ≥3 outliers AND >1% outlier fraction to flag. */
/**
 * Detects rows with anomalous within-row replicate variance relative to the mean-variance trend.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns).
 * @param {{ random: Function }} rng - PRNG instance (reserved for future permutation null).
 * @param {string} [rowSemantics='ordered'] - When 'arbitrary' (S118 Track H), the windowed scan (Step 6) is suppressed; the global binomial test on the smooth-outlier count (Step 5) continues to run.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, nOutliers: number, expectedOutliers: string, flaggedRows: object[], zScores: number[] }}
 */
export function testWithinRowVariance(matrix, rng, rowSemantics = 'ordered') {
  const NAME = "Within-Row Variance";
  const CAT = "replicate";
  const nR = matrix.length, nC = matrix[0]?.length || 0;

  if (nC < 3) return { name: NAME, category: CAT, flag: "N/A", description: "Need ≥3 replicate columns for meaningful within-row SD." };
  if (nR < 40) return { name: NAME, category: CAT, flag: "N/A", description: `Insufficient rows (${nR}). Need ≥40 for stable mean-variance fit.` };

  // Step 1: Compute per-row mean and SD
  const rowStats = [];
  for (let r = 0; r < nR; r++) {
    const vals = matrix[r].filter(v => v != null);
    if (vals.length < 3) { rowStats.push(null); continue; }
    const m = mean(vals);
    const s = stddev(vals);
    rowStats.push({ mean: m, sd: s, n: vals.length });
  }

  const validRows = rowStats.map((s, i) => s ? { ...s, idx: i } : null).filter(Boolean);
  if (validRows.length < 40) return { name: NAME, category: CAT, flag: "N/A", description: `Only ${validRows.length} rows with ≥3 valid replicates. Need ≥40.` };

  // Step 2: Fit mean-variance relationship via binned local regression
  // Sort by mean, bin, compute median SD and MAD per bin
  const sorted = [...validRows].sort((a, b) => a.mean - b.mean);
  const nBins = Math.max(5, Math.min(20, Math.floor(sorted.length / 10)));
  const binSize = Math.floor(sorted.length / nBins);

  const bins = [];
  for (let b = 0; b < nBins; b++) {
    const start = b * binSize;
    const end = b === nBins - 1 ? sorted.length : start + binSize;
    const slice = sorted.slice(start, end);
    const sds = slice.map(r => r.sd);
    const medMean = _median(slice.map(r => r.mean));
    const medSD = _median(sds);
    const madSD = _mad(sds);
    bins.push({ medMean, medSD, madSD, n: slice.length });
  }

  // Compute global MAD of all SDs as a dispersion floor.
  // Bins with very homogeneous SDs can have MAD→0, producing inflated z-scores.
  // Floor at 20% of the global MAD to prevent this.
  const allSDs = validRows.map(r => r.sd);
  const globalMAD = _mad(allSDs);
  const dispersionFloor = globalMAD * 0.20;

  // Step 3: For each row, interpolate expected SD and local dispersion from bins
  const flaggedRows = [];
  const zScores = [];
  const Z_THRESH = 4.0;
  // Theoretical expected rate under N(0,1): P(|z| > 4.0) ≈ 6.33×10⁻⁵.
  const EXPECTED_RATE = 2 * (1 - normalCDF(Z_THRESH)); // ≈ 0.0000633

  for (const row of validRows) {
    const { expectedSD, localMAD } = _interpolate(row.mean, bins);
    // Apply dispersion floor: max(localMAD, dispersionFloor)
    const effectiveMAD = Math.max(localMAD, dispersionFloor);
    if (effectiveMAD <= 0 || expectedSD <= 0) {
      zScores.push(0);
      continue;
    }
    const scale = effectiveMAD * 1.4826; // convert MAD to σ-equivalent
    const z = (row.sd - expectedSD) / scale;
    zScores.push(z);

    if (Math.abs(z) > Z_THRESH) {
      flaggedRows.push({
        row: row.idx + 1, // 1-indexed
        z: z.toFixed(2),
        direction: z < 0 ? "too smooth" : "too noisy",
        rowMean: row.mean.toFixed(2),
        rowSD: row.sd.toFixed(4),
        expectedSD: expectedSD.toFixed(4),
      });
    }
  }

  const nOutliers = flaggedRows.length;
  const nValid = validRows.length;
  const expectedOutliers = EXPECTED_RATE * nValid;

  // "Too smooth" (z < -threshold) is the primary fabrication signal.
  // "Too noisy" rows are noted but don't drive the flag — biological heterogeneity
  // (e.g. high-variance proteins in proteomics) commonly produces extreme positive z.
  const nSmooth = flaggedRows.filter(r => r.direction === "too smooth").length;

  // Step 5: Global binomial test on smooth outliers: P(k >= nSmooth | n, p=one-tail rate)
  // Only the left tail (smooth) counts for the fabrication hypothesis.
  // One-tail rate: P(z < -4.0) ≈ 3.17×10⁻⁵.
  const SMOOTH_RATE = 1 - normalCDF(Z_THRESH); // ≈ 0.0000317
  const globalP = _binomialUpperTail(nSmooth, nValid, SMOOTH_RATE);

  // Step 6: Windowed scan (smooth outliers only).
  // S118 Track H sub-unit suppression: under rowSemantics='arbitrary' the
  // sliding window over row order has no forensic interpretation. Step 5's
  // global binomial on the dataset-wide smooth-outlier count continues to
  // run; primaryP collapses to globalP in that mode.
  const suppressWindowed = rowSemantics === 'arbitrary';
  const WIN = 15, STRIDE = 5;
  const windowPs = [];
  if (!suppressWindowed) {
    for (let start = 0; start + WIN <= nValid; start += STRIDE) {
      const windowZ = zScores.slice(start, start + WIN);
      const wSmooth = windowZ.filter(z => z < -Z_THRESH).length;
      const wP = _binomialUpperTail(wSmooth, WIN, SMOOTH_RATE);
      windowPs.push(wP);
    }
  }
  const windowAdjPs = windowPs.length > 0 ? bhFDR(windowPs) : [];
  const windowSigCount = windowAdjPs.filter(p => p < 0.05).length;
  const windowScanP = windowAdjPs.length > 0 ? Math.min(...windowAdjPs) : 1;

  // Step 7: Overall flag — more severe of global and windowed
  // Effect-size gate: need ≥3 smooth outliers AND >1% smooth fraction to flag
  const globalFlag = flagFromP(globalP);
  const windowFlag = flagFromP(windowScanP);
  const flagRank = f => f === "HIGH" ? 3 : f === "MODERATE" ? 2 : f === "LOW" ? 1 : 0;
  let flag = flagRank(windowFlag) > flagRank(globalFlag) ? windowFlag : globalFlag;
  const primaryP = Math.min(globalP, windowScanP);

  const outlierFrac = nOutliers / nValid;
  const smoothFrac = nSmooth / nValid;
  if (flag !== "LOW" && (nSmooth < 3 || smoothFrac < 0.01)) {
    flag = "LOW";
  }

  // Sort flagged rows: "too smooth" first (more suspicious), then by |z| descending
  flaggedRows.sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === "too smooth" ? -1 : 1;
    return Math.abs(parseFloat(b.z)) - Math.abs(parseFloat(a.z));
  });

  return {
    name: NAME, category: CAT,
    description: "Real replicate measurements show a predictable relationship between row mean and row-to-row spread. This test checks each row's within-replicate SD against the expected value from the overall mean-variance trend. Rows that are much smoother or noisier than expected may indicate fabrication — especially 'too smooth' rows where someone typed a value and added identical small noise to each replicate.",
    flag, primaryP,
    nOutliers, nValid,
    outlierFrac: (outlierFrac * 100).toFixed(2) + "%",
    expectedOutliers: expectedOutliers.toFixed(1),
    globalP: globalP.toFixed(6),
    windowScanP: windowScanP.toFixed(6),
    windowSigCount,
    nWindowsTested: windowPs.length,
    subunitsSuppressed: suppressWindowed ? ['windowed-scan'] : [],
    flaggedRows: flaggedRows.slice(0, 50),
    // Full uncapped 1-indexed row indices of every flagged row (both
    // "too smooth" and "too noisy" directions, matching `nOutliers`).
    // Additive to `flaggedRows` (which caps at 50 and carries per-row
    // stats for the evidence table) so a downstream consumer needing the
    // complete index set does not have to reconstruct from `flaggedRows`.
    flaggedRowIndices: flaggedRows.map(r => r.row),
    // For MiniCard histogram: sample of z-scores
    zScores: zScores.length > 300
      ? zScores.filter((_, i) => i % Math.ceil(zScores.length / 300) === 0)
      : zScores,
    details: flaggedRows.slice(0, 50).map(r => ({
      Row: r.row, z: r.z, Direction: r.direction, Mean: r.rowMean, SD: r.rowSD, Expected: r.expectedSD,
    })),
  };
}

// ── Helpers ──

function _median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

function _mad(arr) {
  const med = _median(arr);
  return _median(arr.map(v => Math.abs(v - med)));
}

/** Interpolate expected SD and local MAD for a given row mean from bin data. */
function _interpolate(rowMean, bins) {
  if (bins.length === 1) return { expectedSD: bins[0].medSD, localMAD: bins[0].madSD };

  // Clamp to range
  if (rowMean <= bins[0].medMean) return { expectedSD: bins[0].medSD, localMAD: bins[0].madSD };
  if (rowMean >= bins[bins.length - 1].medMean)
    return { expectedSD: bins[bins.length - 1].medSD, localMAD: bins[bins.length - 1].madSD };

  // Linear interpolation between flanking bins
  for (let i = 0; i < bins.length - 1; i++) {
    if (rowMean >= bins[i].medMean && rowMean <= bins[i + 1].medMean) {
      const t = (rowMean - bins[i].medMean) / (bins[i + 1].medMean - bins[i].medMean || 1);
      return {
        expectedSD: bins[i].medSD + t * (bins[i + 1].medSD - bins[i].medSD),
        localMAD: bins[i].madSD + t * (bins[i + 1].madSD - bins[i].madSD),
      };
    }
  }
  return { expectedSD: bins[0].medSD, localMAD: bins[0].madSD };
}

/** Binomial upper tail: P(X >= k | n, p) using normal approximation. */
function _binomialUpperTail(k, n, p) {
  if (k === 0) return 1;
  const mu = n * p;
  const sigma = Math.sqrt(n * p * (1 - p));
  if (sigma <= 0) return k > 0 ? 0 : 1;
  const z = (k - 0.5 - mu) / sigma; // continuity correction
  return 1 - normalCDF(z);
}

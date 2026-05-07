import { normalCDF, chiSquaredP, invertMatrix, chiSquaredQuantile, bhFDR } from "../stats/primitives.js";
import { ALPHA } from "../constants/thresholds.js";

/* 16. Mahalanobis Row Outlier
   Detects rows whose multivariate distance from the centroid is unexpectedly large.
   D² = (x - μ)ᵀ Σ⁻¹ (x - μ), compared against χ²(nC).
   Two-stage approach: binomial test on outlier rate → per-row identification.
   Reference: Mahalanobis (1936), De Maesschalck et al. (2000),
   Filzmoser et al. (2005) for robust covariance estimation. */
/**
 * Detects multivariate row outliers via Mahalanobis D² distance from the dataset centroid.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @param {string} [assay='general'] - Assay type identifier (e.g. 'qpcr', 'plate_reader', 'general')
 * @returns {{ name: string, category: string, flag: string, description: string, nRows: number, nCols: number, nOutliers: number, nExceedP01: number, expectedExceedP01: string, exceedFrac: string, outlierFraction: string, plotD2: number[], plotThreshold: number, outlierThreshold: number|null, binomZ: string, binomP: string, primaryP: number, internalLogApplied: boolean, details: Array<{ Row: number, Distance: string, "p-value": string }> }}
 * @see METHODOLOGY.md §"2.6 Mahalanobis Row Outlier"
 */
export function testMahalanobisOutlier(matrix, assay='general') {
  const nC = matrix[0]?.length || 0;
  const nR = matrix.length;
  const NAME = "Mahalanobis Row Outlier";
  const CAT = "replicate";

  // Minimum requirements: need ≥3 columns for invertible covariance, and N ≥ 3×nC for stability
  if (nC < 3) return { name: NAME, category: CAT, flag: "N/A",
    description: "Requires ≥3 replicate columns for invertible covariance matrix." };
  if (nR < 3 * nC) return { name: NAME, category: CAT, flag: "N/A",
    description: `Insufficient rows (${nR}) for ${nC} columns — need ≥${3*nC} for stable covariance estimate.` };

  // Build valid-rows matrix (skip rows with any null)
  const validIdx = [];
  const validData = [];
  for (let i = 0; i < nR; i++) {
    const row = matrix[i];
    if (row.every(v => v != null && isFinite(v))) {
      validIdx.push(i);
      validData.push(row.slice());
    }
  }
  const N = validData.length;
  if (N < 3 * nC) return { name: NAME, category: CAT, flag: "N/A",
    description: `Insufficient valid rows (${N}) after removing incomplete rows.` };

  // Internal normality correction: D² assumes multivariate normality.
  // If global VST is raw but data is strongly right-skewed (log-normal), raw values
  // violate this assumption → high-value rows appear as false outliers.
  // Assessment: if all values > 0 and global skewness > 1.5, apply log internally.
  // This is independent of the user's global VST choice (which may be "Keep raw"
  // to preserve kurtosis signal for other tests). Log is applied only within this
  // test for the D² calculation.
  const allValid = validData.flat();
  const allPositive = allValid.every(v => v > 0);
  let internalLogApplied = false;
  if (allPositive) {
    const vMu = allValid.reduce((s, v) => s + v, 0) / allValid.length;
    const vV = allValid.reduce((s, v) => s + (v - vMu) ** 2, 0) / allValid.length;
    const vSd = Math.sqrt(vV);
    const skewness = vSd > 0
      ? allValid.reduce((s, v) => s + ((v - vMu) / vSd) ** 3, 0) / allValid.length
      : 0;
    if (skewness > 1.5) {
      for (let i = 0; i < validData.length; i++) {
        validData[i] = validData[i].map(v => Math.log(v));
      }
      internalLogApplied = true;
    }
  }

  // Step 1: Compute column means (μ)
  const mu = new Array(nC).fill(0);
  for (const row of validData) for (let j = 0; j < nC; j++) mu[j] += row[j];
  for (let j = 0; j < nC; j++) mu[j] /= N;

  // Step 2: Compute covariance matrix Σ (sample covariance, unbiased)
  const cov = Array.from({ length: nC }, () => new Array(nC).fill(0));
  for (const row of validData) {
    for (let a = 0; a < nC; a++) {
      for (let b = a; b < nC; b++) {
        const v = (row[a] - mu[a]) * (row[b] - mu[b]);
        cov[a][b] += v;
        if (a !== b) cov[b][a] += v;
      }
    }
  }
  for (let a = 0; a < nC; a++) for (let b = 0; b < nC; b++) cov[a][b] /= (N - 1);

  // Step 3: Invert covariance matrix using Cholesky decomposition
  // For small nC (typically 3-6), this is numerically stable
  const invCov = invertMatrix(cov, nC);
  if (!invCov) return { name: NAME, category: CAT, flag: "N/A",
    description: "Covariance matrix is singular — cannot compute Mahalanobis distances. This may indicate perfectly collinear columns." };

  // Step 4: Compute D² for each row
  const dSquared = new Array(N);
  for (let i = 0; i < N; i++) {
    const row = validData[i];
    const diff = row.map((v, j) => v - mu[j]);
    let d2 = 0;
    for (let a = 0; a < nC; a++) {
      for (let b = 0; b < nC; b++) {
        d2 += diff[a] * invCov[a][b] * diff[b];
      }
    }
    dSquared[i] = Math.max(0, d2); // clamp numerical noise
  }

  // Step 5: Compute per-row p-values from χ²(nC) distribution
  // Then use binomial test on count of rows with p < 0.01 (expecting 1% by chance)
  const rowPvals = new Array(N);
  for (let i = 0; i < N; i++) {
    rowPvals[i] = chiSquaredP(dSquared[i], nC);
  }

  // Step 6: Two-stage outlier identification + verdict.
  //
  // Stage 1 (binomial): count rows with raw p < 0.01, compare against the
  //   1%-of-N expectation under H₀ via normal approximation.
  // Stage 2 (per-row BH-FDR at α=0.001): identify which specific rows survive
  //   multiplicity correction. Empty when the dataset-level signal is real
  //   in aggregate but no individual row is sufficiently extreme to attribute.
  //
  // Verdict (S126b add-5b — semantic alignment with test name):
  //   The test's user-facing name + display name + description ("Mahalanobis
  //   Row Outlier" / "Unusual Rows" / "Rows with unusual combinations of
  //   values") all promise per-row identification. Pre-add-5b the flag
  //   read off the binomial alone, allowing FLAGGED + "0 outliers" footer
  //   on fixtures where the dataset-level rate is elevated but no row
  //   survives BH-FDR (e.g. DS15). Post-add-5b: if Stage 2 finds zero
  //   rows, flag is LOW regardless of binomial elevation. The dataset-
  //   level binomial p (binomP / nExceedP01) stays in the result object
  //   as informational metadata; severity tiering when Stage 2 has
  //   survivors continues to use binomP via the existing ALPHA.FLAG /
  //   ALPHA.NOTE thresholds. METHODOLOGY.md §2.6 Step 5 (test-level flag
  //   via binomial p) needs alignment to reflect this gate; flagged for
  //   the next docs pass — no statistical loosening (BH-FDR α=0.001
  //   per-row + binomial effect-size gates both unchanged).

  // Stage 1: dataset-level binomial on raw-p<0.01 exceedance rate.
  const ALPHA_BIN = 0.01;
  const nExceed = rowPvals.filter(p => p < ALPHA_BIN).length;
  const expectedExceed = N * ALPHA_BIN;
  const binMu = expectedExceed;
  const binSigma = Math.sqrt(N * ALPHA_BIN * (1 - ALPHA_BIN));
  const binZ = binSigma > 0 ? (nExceed - binMu) / binSigma : 0;
  const binomP = binZ > 0 ? (1 - normalCDF(binZ)) : 1;
  const exceedFrac = nExceed / N;

  // Stage 2: per-row identification via BH-FDR at α=0.001 (S95 Track A
  // Item 2). Replaces the previous flat α=0.01 row threshold; proper
  // multiple-comparison correction prevents spurious per-row calls at
  // large N.
  const ROW_ALPHA = 0.001;
  const adjRowPvals = bhFDR(rowPvals);
  const outlierRows = [];
  for (let i = 0; i < N; i++) {
    if (adjRowPvals[i] < ROW_ALPHA) {
      outlierRows.push({
        Row: validIdx[i] + 1,
        Distance: dSquared[i].toFixed(2),
        "p-value": rowPvals[i].toExponential(2),
      });
    }
  }
  const nOut = outlierRows.length;
  const outlierFrac = nOut / N;

  // Verdict: per-row evidence required (nOut > 0) + dataset-level
  // binomial tier + effect-size gate.
  let flag;
  const gated = exceedFrac < 2 * ALPHA_BIN;
  if (nOut === 0) flag = "LOW";              // S126b add-5b — no per-row evidence → CLEAR
  else if (gated) flag = "LOW";              // dataset-level rate too low to be meaningful
  else if (binomP < ALPHA.FLAG) flag = "HIGH";
  else if (binomP < ALPHA.NOTE) flag = "MODERATE";
  else flag = "LOW";

  // Sort outliers by D² descending
  outlierRows.sort((a, b) => parseFloat(b.Distance) - parseFloat(a.Distance));

  // Two thresholds — separate concerns:
  //   plotThreshold      raw χ²(nC, 0.99) reference. Used for chart
  //                      subsampling-keep (preserve elevated dots in
  //                      the every-Nth render cap) and as a fall-back
  //                      threshold for legacy callers.
  //   outlierThreshold   the smallest D² among rows that survived the
  //                      Stage-2 BH-FDR per-row identification (α=0.001).
  //                      Chart's threshold line + outlier-dot coloring
  //                      use this value so the chart matches the
  //                      `nOutliers` / `details` table count. When no
  //                      row survived, set to null — chart skips the
  //                      threshold line and paints all dots blue
  //                      (S126b add-5: prevents the chart from showing
  //                      red "outlier" dots that don't appear in the
  //                      footer's BH-FDR-corrected count).
  const plotThreshold = chiSquaredQuantile(nC, 1 - ALPHA_BIN);
  const outlierThreshold = nOut > 0
    ? Math.min(...outlierRows.map(r => parseFloat(r.Distance)))
    : null;

  // Build sorted D² array for chart with row indices (cap at 200 for rendering)
  const allD2pairs = dSquared.map((d, i) => ({ d2: d, rowIdx: validIdx[i] }));
  allD2pairs.sort((a, b) => a.d2 - b.d2);
  const plotPairs = allD2pairs.length <= 200 ? allD2pairs
    : allD2pairs.filter((v, i) => i % Math.ceil(allD2pairs.length / 200) === 0 || v.d2 > plotThreshold);
  const plotD2 = plotPairs.map(p => p.d2);
  const plotD2Rows = plotPairs.map(p => p.rowIdx);
  const plateAssay = assay === 'qpcr' || assay === 'plate_reader';

  return {
    name: NAME, category: CAT,
    description: "Values across replicate columns tend to move together \u2014 if a value is high, others in the column are often high too. This card tests how far a row sits from the dataset's typical pattern.",
    plateNote: plateAssay ? "In high-throughput plate formats, individual well failures from pipetting errors, edge effects, or condensation are routine. Outlier wells should be cross-referenced against plate layout." : null,
    logNote: internalLogApplied ? "Internal log transform applied (skewness > 1.5) to satisfy multivariate normality assumption. Global VST unaffected." : null,
    nRows: N, nCols: nC, nOutliers: nOut,
    nExceedP01: nExceed, expectedExceedP01: expectedExceed.toFixed(1),
    exceedFrac: (exceedFrac * 100).toFixed(1) + "%",
    outlierFraction: (outlierFrac * 100).toFixed(2) + "%",
    plotD2, plotD2Rows, plotThreshold, outlierThreshold,
    binomZ: binZ.toFixed(2), binomP: binomP.toFixed(6),
    primaryP: binomP,
    internalLogApplied,
    flag,
    details: outlierRows.slice(0, 100)
  };
}

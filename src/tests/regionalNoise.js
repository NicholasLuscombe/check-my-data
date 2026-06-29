import { stddev, fitPredictedSigma, bhFDR } from "../stats/primitives.js";
import { flagFromP, ALPHA } from "../constants/thresholds.js";

/* 15. Regional Noise Homogeneity
   Tests whether any replicate column has locally anomalous noise compared
   to its own global variance. Complements global Selective Noise (Bartlett
   on full dataset) by detecting column-specific anomalies affecting a
   subset of rows — e.g. one column artificially smoothed for a stretch
   of observations (DS08: Plate3 reduced variance rows 50–64).

   Method: standardise residuals via mean-variance predicted σ, then for
   each (window × column) compute the ratio of window variance to that
   column's global variance. Scan statistic = max ratio across all pairs.
   Permutation null (row-shuffle) preserves global variance but
   redistributes which rows fall into each window.

   More powerful than omnibus Bartlett at small k because it directly tests
   "is this column unusually quiet/noisy HERE vs ITSELF overall?" rather
   than "are all columns equal in this window?"
*/
/**
 * Detects locally anomalous noise in column subregions where a replicate's local variance diverges from its global variance.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @returns {{ name: string, category: string, flag: string, description: string, nWindows: number, scanStat: string, scanP: number, nPerm: number, nRows: number, bestWindowRows: string, bestVarRatio: string, bestAnomCol: number|string, usedPredictedSigma: boolean, primaryP: number, interpretation: string, details: Array<{ rows: string, ratio: string, anomCol: number|string }> }}
 * @see METHODOLOGY.md §"4.2 Regional Noise Homogeneity"
 */
export function testRegionalNoise(matrix, rng) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nC < 3 || nR < 20) return { name: "Regional Noise Homogeneity", category: "replicate", flag: "N/A",
    description: "Need ≥3 replicate columns and ≥20 rows." };

  // ── Step 1: predicted σ per row from mean-variance fit ──
  const { sigma: predictedSigma, used: usePredicted, rowMeans: rowMeansArr } = fitPredictedSigma(matrix);
  const rowSigma = new Array(nR).fill(null);
  for (let r = 0; r < nR; r++) {
    if (usePredicted && predictedSigma[r]) { rowSigma[r] = predictedSigma[r]; }
    else {
      const vals = matrix[r].filter(v => v != null);
      if (vals.length >= 2) { const s = stddev(vals); if (s > 0) rowSigma[r] = s; }
    }
  }

  // ── Step 2: compute standardised residuals per cell ──
  // e_{i,c} = (x_{i,c} − μ_i) / σ̂(μ_i)
  // Build valid-row index: rows with σ > 0 and all nC values present
  const validRows = [];
  for (let r = 0; r < nR; r++) {
    if (rowSigma[r] && rowMeansArr[r] != null) {
      const nValid = matrix[r].filter(v => v != null).length;
      if (nValid >= nC) validRows.push(r);
    }
  }
  if (validRows.length < 20) return { name: "Regional Noise Homogeneity", category: "replicate", flag: "N/A",
    description: `Only ${validRows.length} rows with complete data and valid σ — need ≥20.` };

  // Standardised residuals matrix: validRows.length × nC
  const residuals = validRows.map(r => {
    const mu = rowMeansArr[r], sig = rowSigma[r];
    return matrix[r].map(v => v != null ? (v - mu) / sig : 0);
  });

  // ── Step 3: sliding-window column-vs-global scan ──
  // For each column, compare its window variance to its GLOBAL variance.
  // Tests: "is this column unusually quiet/noisy HERE compared to ITSELF
  // overall?" This is the most targeted question for localised anomalies
  // in one replicate, and avoids the multiple-column comparison penalty
  // of testing each column against the others in each window.
  // Scan statistic: max ratio (global/window or window/global) across all
  // (window × column) pairs. Permutation null: row-shuffle preserves
  // global variance but redistributes window membership.
  const WIN = 15;
  if (validRows.length < WIN) return { name: "Regional Noise Homogeneity", category: "replicate", flag: "N/A",
    description: `Only ${validRows.length} valid rows — need ≥${WIN} for windowed scan.` };
  const stride = Math.max(1, Math.floor(WIN / 3));

  // Compute global variance per column (across all valid rows)
  const globalColVars = [];
  for (let c = 0; c < nC; c++) {
    let s = 0, s2 = 0, n = 0;
    for (let i = 0; i < residuals.length; i++) {
      const v = residuals[i][c]; s += v; s2 += v * v; n++;
    }
    globalColVars.push(n >= 2 ? Math.max((s2 - s * s / n) / (n - 1), 1e-20) : 1e-20);
  }

  // Helper: compute per-column variances within a window, writing into a
  // caller-supplied Float64Array(nCol) scratch buffer. Returns true on
  // success, false if any column had < 2 valid points. S159c — replaces
  // the per-call `const colVars = []` allocation that fired once per
  // window per permutation.
  function windowColVarsInto(resid, start, win, nCol, out) {
    for (let c = 0; c < nCol; c++) {
      let s = 0, s2 = 0, n = 0;
      for (let i = start; i < start + win; i++) {
        const v = resid[i][c]; s += v; s2 += v * v; n++;
      }
      if (n < 2) return false;
      out[c] = Math.max((s2 - s * s / n) / (n - 1), 1e-20);
    }
    return true;
  }

  // Compute observed scan statistic: max ratio across all windows × columns
  // Also track per-column max ratios for pair-level BH-FDR promotion.
  // S159c — shared Float64Array(nC) scratch reused for observed pass + every
  // permutation × window call below.
  const wvBuf = new Float64Array(nC);
  const allWindows = [];
  let obsScanStat = 0;
  let bestWinIdx = -1;
  const obsColMaxRatios = new Array(nC).fill(1);

  for (let s = 0; s + WIN <= validRows.length; s += stride) {
    if (!windowColVarsInto(residuals, s, WIN, nC, wvBuf)) continue;
    let maxR = 0, anomCol = -1;
    for (let c = 0; c < nC; c++) {
      const r = Math.max(wvBuf[c] / globalColVars[c], globalColVars[c] / wvBuf[c]);
      if (r > maxR) { maxR = r; anomCol = c; }
      if (r > obsColMaxRatios[c]) obsColMaxRatios[c] = r;
    }
    const direction = anomCol >= 0 ? (wvBuf[anomCol] < globalColVars[anomCol] ? "reduced" : "elevated") : "anomalous";
    const startRow = validRows[s];
    const endRow = validRows[Math.min(s + WIN - 1, validRows.length - 1)];
    const winVar = anomCol >= 0 ? wvBuf[anomCol] : 0;
    const globVar = anomCol >= 0 ? globalColVars[anomCol] : 0;
    allWindows.push({
      startRow: startRow + 1, endRow: endRow + 1,
      maxRatio: maxR, anomCol, direction, winVar, globVar
    });
    if (maxR > obsScanStat) { obsScanStat = maxR; bestWinIdx = allWindows.length - 1; }
  }

  if (!allWindows.length) return { name: "Regional Noise Homogeneity", category: "replicate", flag: "N/A",
    description: "No valid windows for scan." };

  // ── Step 4: permutation null ──
  // Shuffle row order, recompute max ratio across windows × cols.
  // Per-column max ratios tracked for BH-FDR promotion.
  // Pre-allocate arrays outside loop to avoid GC pressure.
  const N_PERM = validRows.length <= 100 ? 4999 : 499;
  let exceedCount = 0;
  const colExceed = new Array(nC).fill(0);
  const idx = Array.from({ length: residuals.length }, (_, i) => i);
  const shuffled = new Array(residuals.length);
  const permColMax = new Array(nC);

  for (let perm = 0; perm < N_PERM; perm++) {
    rng.shuffle(idx);
    for (let i = 0; i < idx.length; i++) shuffled[i] = residuals[idx[i]];
    let permMax = 0;
    for (let c = 0; c < nC; c++) permColMax[c] = 1;
    for (let s = 0; s + WIN <= shuffled.length; s += stride) {
      if (!windowColVarsInto(shuffled, s, WIN, nC, wvBuf)) continue;
      for (let c = 0; c < nC; c++) {
        const r = Math.max(wvBuf[c] / globalColVars[c], globalColVars[c] / wvBuf[c]);
        if (r > permMax) permMax = r;
        if (r > permColMax[c]) permColMax[c] = r;
      }
    }
    if (permMax >= obsScanStat) exceedCount++;
    for (let c = 0; c < nC; c++) {
      if (permColMax[c] >= obsColMaxRatios[c]) colExceed[c]++;
    }
  }
  const scanP = (exceedCount + 1) / (N_PERM + 1);

  // Per-column permutation p-values and BH-FDR promotion
  const colPermPs = colExceed.map(e => (e + 1) / (N_PERM + 1));
  const colAdjPs = bhFDR(colPermPs);
  const anyColSig = colAdjPs.some(p => p < ALPHA.FLAG);

  // ── Step 5: flag with effect-size gate ──
  const bestWin = bestWinIdx >= 0 ? allWindows[bestWinIdx] : null;
  const bestRatio = bestWin ? bestWin.maxRatio : 1;
  const bestAnomCol = bestWin ? bestWin.anomCol : -1;

  const esGate = nR >= 500 && bestRatio < 2.0;
  let flag = esGate ? "LOW" : flagFromP(scanP);
  // Column-level BH-FDR promotion
  if (!esGate && flag === "LOW" && anyColSig) flag = "MODERATE";

  // Build interpretation
  let interpretation = "";
  if (flag === "HIGH" || flag === "MODERATE") {
    const w = bestWin;
    const colIdx = w ? w.anomCol : -1;
    const direction = w ? w.direction : "anomalous";
    interpretation = `Column-vs-global windowed scan detects locally ${direction} noise in column ${colIdx + 1} (scan p=${scanP.toFixed(4)}). Most anomalous window: rows ${w.startRow}–${w.endRow} (${bestRatio.toFixed(1)}× deviation from column's global variance).`;
  } else if (esGate) {
    interpretation = `Scan statistic suppressed by effect-size gate: worst window variance ratio ${bestRatio.toFixed(2)}× is below 2.0× threshold at N≥500. Regional variance heterogeneity is statistically detectable but too small to be forensically meaningful.`;
  } else {
    interpretation = `Regional noise structure is consistent with uniform variance across replicates. No localised anomalies detected (scan p=${scanP.toFixed(4)}).`;
  }

  // Details: top windows sorted by ratio descending
  const sortedWindows = [...allWindows].sort((a, b) => b.maxRatio - a.maxRatio);
  const detailWindows = (flag === "HIGH" || flag === "MODERATE")
    ? sortedWindows.filter(w => w.maxRatio >= obsScanStat * 0.5).slice(0, 10)
    : sortedWindows.slice(0, 5);
  const details = detailWindows.map(w => ({
    rows: `${w.startRow}–${w.endRow}`,
    ratio: w.maxRatio.toFixed(2) + "×",
    anomCol: w.anomCol >= 0 ? w.anomCol + 1 : "—",
    direction: w.direction || "anomalous",
    windowSD: Math.sqrt(w.winVar).toFixed(3),
    globalSD: Math.sqrt(w.globVar).toFixed(3),
    // Single-sourced SD ratio (raw): sqrt of the variance ratio. Both the
    // footer and the evidence table read this one value and format identically,
    // avoiding the double-rounding that diverged 4.37× vs 4.38× (Fix S192).
    sdRatio: Math.sqrt(w.maxRatio)
  }));

  return {
    name: "Regional Noise Homogeneity", category: "replicate",
    description: "If one replicate column is artificially smoothed or noisied up, it won't match its own noise level everywhere — some regions will be conspicuously quiet or loud compared to the column's average. This card slides a window down each column and flags regions where a column's local noise diverges from its overall pattern.",
    nWindows: allWindows.length, scanStat: obsScanStat.toFixed(2),
    scanP, nPerm: N_PERM, nRows: validRows.length,
    bestWindowRows: bestWin ? `${bestWin.startRow}–${bestWin.endRow}` : "—",
    bestVarRatio: bestRatio.toFixed(2) + "×",
    bestSDRatio: Math.sqrt(bestRatio),
    bestAnomCol: bestAnomCol >= 0 ? bestAnomCol + 1 : "—",
    // Per-column promoters retained for a later per-unit display (S288).
    // The verdict's per-column BH decision (adjP from colPermPs ← colExceed,
    // both discarded after this point) cannot be re-derived card-side, so it
    // is stored here beside the surviving worst-column fields. Report-only:
    // the flag was already decided above from anyColSig; this adds no input.
    colPromoters: obsColMaxRatios.map((ratio, c) => ({
      col: c + 1,
      sdRatio: Math.sqrt(ratio),
      adjP: colAdjPs[c],
      promoted: colAdjPs[c] < ALPHA.FLAG
    })),
    usedPredictedSigma: !!usePredicted,
    primaryP: scanP,
    interpretation, flag, details
  };
}

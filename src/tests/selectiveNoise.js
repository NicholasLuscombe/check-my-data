import { mean, variance, chiSquaredP, bhFDR, regIncBeta } from "../stats/primitives.js";
import { flagFromP, ALPHA } from "../constants/thresholds.js";

/**
 * One-vs-rest Levene test: compare one column's residual variance against pooled rest.
 * Returns F-statistic and p-value using absolute-deviation formulation (robust to non-normality).
 * @param {number[][]} residuals - 2D array of residuals (rows × columns)
 * @param {number} targetCol - 0-indexed column to test
 * @returns {{F: number, p: number, direction: string}} F-stat, p-value, and direction
 */
function _leveneOneVsRest(residuals, targetCol) {
  const nR = residuals.length, nC = residuals[0].length;
  // Group 1: target column residuals, Group 2: all other columns' residuals
  const g1 = [], g2 = [];
  for (let r = 0; r < nR; r++) {
    const v = residuals[r][targetCol];
    if (v != null) g1.push(v);
    for (let c = 0; c < nC; c++) {
      if (c === targetCol) continue;
      const v2 = residuals[r][c];
      if (v2 != null) g2.push(v2);
    }
  }
  if (g1.length < 3 || g2.length < 3) return { F: 0, p: 1, direction: "equal" };

  // Levene's test: compute absolute deviations from group median
  const median = arr => { const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const med1 = median(g1), med2 = median(g2);
  const z1 = g1.map(v => Math.abs(v - med1));
  const z2 = g2.map(v => Math.abs(v - med2));

  // F-test on absolute deviations (two groups, df1=1)
  const n1 = z1.length, n2 = z2.length, N = n1 + n2;
  const m1 = mean(z1), m2 = mean(z2);
  const grandMean = (m1 * n1 + m2 * n2) / N;
  const ssBetween = n1 * (m1 - grandMean) ** 2 + n2 * (m2 - grandMean) ** 2;
  let ssWithin = 0;
  for (const v of z1) ssWithin += (v - m1) ** 2;
  for (const v of z2) ssWithin += (v - m2) ** 2;
  if (ssWithin === 0) return { F: 0, p: 1, direction: "equal" };

  const df1 = 1, df2 = N - 2;
  const F = (ssBetween / df1) / (ssWithin / df2);

  // F-distribution p-value via regularized incomplete beta
  const x = df1 * F / (df1 * F + df2);
  const pVal = 1 - regIncBeta(df1 / 2, df2 / 2, x);

  // Direction based on variance of target vs rest
  const var1 = variance(g1), var2 = variance(g2);
  const direction = var1 > var2 ? "noisier" : var1 < var2 ? "quieter" : "equal";

  return { F, p: Math.max(0, Math.min(1, pVal)), direction };
}

/* 3. Selective Noise Partitioning */

/**
 * Core Bartlett computation on a single matrix.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns).
 * @returns {null|{colVars: object[], ratio: number, bartlett: number, df: number, pBartlett: number, N: number}} Null if insufficient data.
 */
function _runBartlett(matrix) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nC < 3 || nR < 10) return null;
  const rowMeans = matrix.map(row => { const v = row.filter(x => x != null); return v.length ? mean(v) : null; });
  const colVars = [];
  for (let c = 0; c < nC; c++) {
    const res = [];
    for (let r = 0; r < nR; r++) { if (matrix[r][c] != null && rowMeans[r] != null) res.push(matrix[r][c] - rowMeans[r]); }
    if (res.length >= 5) { const v = variance(res); colVars.push({ col: c + 1, variance: v, std: Math.sqrt(v).toFixed(6), n: res.length }); }
  }
  if (colVars.length < 2) return null;
  const vars = colVars.map(c => c.variance);
  const maxV = Math.max(...vars), minV = Math.min(...vars), ratio = minV > 0 ? maxV / minV : Infinity;

  const N = colVars.reduce((s, c) => s + c.n, 0);
  const k = colVars.length;
  const dfTotal = N - k;
  const pooledVar = colVars.reduce((s, c) => s + c.variance * (c.n - 1), 0) / dfTotal;
  if (pooledVar <= 0) return null;
  const lnPooled = Math.log(pooledVar);
  const sumLn = colVars.reduce((s, c) => s + (c.n - 1) * Math.log(c.variance), 0);
  const B = dfTotal * lnPooled - sumLn;
  const C = 1 + (1 / (3 * (k - 1))) * (colVars.reduce((s, c) => s + 1 / (c.n - 1), 0) - 1 / dfTotal);
  const bartlett = B / C;
  const pBartlett = chiSquaredP(bartlett, k - 1);

  return { colVars, ratio, bartlett, df: k - 1, pBartlett, N };
}

/**
 * Compute per-column one-vs-rest Levene tests with BH-FDR correction.
 * Returns per-column residual SD, variance ratio vs median, direction, and adjusted p.
 */
function _perColumnLevene(matrix) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nC < 3 || nR < 10) return null;
  const rowMeans = matrix.map(row => { const v = row.filter(x => x != null); return v.length ? mean(v) : null; });
  // Build residual matrix
  const residuals = [];
  for (let r = 0; r < nR; r++) {
    if (rowMeans[r] == null) continue;
    const row = [];
    let allValid = true;
    for (let c = 0; c < nC; c++) {
      if (matrix[r][c] == null) { allValid = false; break; }
      row.push(matrix[r][c] - rowMeans[r]);
    }
    if (allValid) residuals.push(row);
  }
  if (residuals.length < 10) return null;

  // Per-column variance for ratio computation
  const colVars = [];
  for (let c = 0; c < nC; c++) {
    let s = 0, s2 = 0;
    for (let r = 0; r < residuals.length; r++) { const v = residuals[r][c]; s += v; s2 += v * v; }
    colVars.push(Math.max((s2 - s * s / residuals.length) / (residuals.length - 1), 1e-20));
  }
  const sortedVars = [...colVars].sort((a, b) => a - b);
  const medianVar = sortedVars[sortedVars.length >> 1];

  // One-vs-rest Levene for each column
  const rawPs = [];
  const colResults = [];
  for (let c = 0; c < nC; c++) {
    const lev = _leveneOneVsRest(residuals, c);
    rawPs.push(lev.p);
    const sd = Math.sqrt(colVars[c]);
    const varRatio = medianVar > 0 ? colVars[c] / medianVar : 1;
    colResults.push({ col: c + 1, residualStd: sd, varRatio, direction: lev.direction, rawP: lev.p });
  }

  const adjPs = bhFDR(rawPs);
  for (let c = 0; c < nC; c++) {
    colResults[c].adjP = adjPs[c];
    colResults[c].flagged = adjPs[c] < ALPHA.FLAG;
  }
  return colResults;
}

/**
 * Detects non-uniform noise allocation across replicate columns using Bartlett's test for homogeneity of variances.
 * When row-grouped conditions exist, runs Bartlett per condition independently and combines via BH-FDR.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns, minimum 3 columns and 10 rows).
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} [condCtx=null] - Condition context for per-condition stratification.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, maxMinVarianceRatio: string, bartlettChi: string, pBartlett: string, colDetails: object[], condResults?: object[] }} Result with variance ratio, Bartlett chi-squared statistic, p-value, per-column residual standard deviations, and optional per-condition breakdown.
 * @see METHODOLOGY.md §"1.3 Selective Noise Partitioning"
 */
export function testSelectiveNoise(matrix, condCtx) {
  const NAME = "Selective Noise Partitioning";
  const CAT = "replicate";
  const DESC = "Tests whether noise is uniformly distributed across columns using Bartlett's test for homogeneity of variances. Uneven variance allocation — some columns appearing suspiciously 'clean' — can indicate selective addition or suppression of noise (Al-Marzouki et al. 2005).";

  // ── Per-condition stratification (row-grouped only) ──
  if (condCtx && condCtx.type === 'row-grouped' && condCtx.count >= 2) {
    const slices = condCtx.slices();
    const condResults = [];
    const pValues = [];

    for (const slice of slices) {
      const b = _runBartlett(slice.matrix);
      if (!b) {
        condResults.push({ condition: slice.name, flag: "N/A", reason: "Insufficient data" });
        continue;
      }
      // Apply same effect-size gate as pooled path
      const esGate = b.N >= 500 && b.ratio < 3.0;
      const flag = esGate ? "LOW" : flagFromP(b.pBartlett);
      pValues.push(esGate ? 1.0 : b.pBartlett);
      condResults.push({
        condition: slice.name,
        nRows: slice.matrix.length,
        maxMinVarianceRatio: b.ratio.toFixed(3),
        bartlettChi: b.bartlett.toFixed(3),
        df: b.df,
        pBartlett: b.pBartlett.toFixed(4),
        flag,
        colDetails: b.colVars.map(c => ({ col: c.col, residualStd: c.std, n: c.n })),
      });
    }

    if (pValues.length === 0) {
      return { name: NAME, category: CAT, flag: "N/A", description: "No conditions with sufficient data." };
    }

    // BH-FDR across per-condition p-values
    const adjusted = bhFDR(pValues);
    const minAdjP = Math.min(...adjusted);
    const overallFlag = flagFromP(minAdjP);

    // Also run pooled for reporting context
    const pooled = _runBartlett(matrix);

    // Per-column one-vs-rest Levene on pooled matrix (display-only, does not affect flag)
    const perCol = _perColumnLevene(matrix);

    return {
      name: NAME, category: CAT, flag: overallFlag, primaryP: minAdjP,
      description: DESC,
      maxMinVarianceRatio: pooled ? pooled.ratio.toFixed(3) : "—",
      bartlettChi: pooled ? pooled.bartlett.toFixed(3) : "—",
      df: pooled ? pooled.df : 0,
      pBartlett: pooled ? pooled.pBartlett.toFixed(4) : "—",
      colDetails: pooled ? pooled.colVars.map(c => ({ col: c.col, residualStd: c.std, n: c.n })) : [],
      condResults,
      stratified: true,
      ...(perCol ? { perColumnResults: perCol } : {}),
    };
  }

  // ── Single-run path (no conditions or column-grouped) ──
  const b = _runBartlett(matrix);
  if (!b) {
    const nC = matrix[0]?.length || 0;
    if (nC < 3) return { name: NAME, category: CAT, flag: "N/A", description: "Need ≥3 replicate columns and ≥10 rows." };
    return { name: NAME, category: CAT, flag: "N/A", description: "Insufficient valid columns after filtering." };
  }

  // Flag: Bartlett p-value with effect-size gate at large N.
  // At N > 500, Bartlett detects trivially small variance ratios (e.g. 2× at N=30K).
  // Require ratio ≥ 3.0 for forensic relevance — anomalous datasets produce 3–13×
  // (DS06=12.9, DS08=3.5), while clean large-N data shows 1.5–2.0.
  // Gate only activates at large N; small datasets use p-value alone.
  // Rationale: same dual-gating principle as DESeq2 lfcThreshold (Love et al. 2014).
  const esGate = b.N >= 500 && b.ratio < 3.0;
  const flag = esGate ? "LOW" : flagFromP(b.pBartlett);

  // Per-column one-vs-rest Levene results (display-only, does not affect flag)
  const perCol = _perColumnLevene(matrix);

  return {
    name: NAME, category: CAT, flag, primaryP: b.pBartlett,
    description: DESC,
    maxMinVarianceRatio: b.ratio.toFixed(3),
    bartlettChi: b.bartlett.toFixed(3), df: b.df, pBartlett: b.pBartlett.toFixed(4),
    colDetails: b.colVars.map(c => ({ col: c.col, residualStd: c.std, n: c.n })),
    ...(perCol ? { perColumnResults: perCol } : {}),
  };
}

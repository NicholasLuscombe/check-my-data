/* ── Variance-Stabilizing Transform detection ────────────────────────
   @see METHODOLOGY.md §"Variance-Stabilizing Transform (VST) Preprocessing" */

/** Flat-cell signedness stats (null/NaN-skipped). Shared helper consumed by
 *  `detectVST` and available to test-script callers. */
export function computeSignednessStats(matrix) {
  let n = 0, nPos = 0, nNeg = 0, nZero = 0;
  for (const row of matrix) {
    for (const v of row) {
      if (v == null || !isFinite(v)) continue;
      n++;
      if (v > 0) nPos++;
      else if (v < 0) nNeg++;
      else nZero++;
    }
  }
  return {
    n, nPos, nNeg, nZero,
    posFrac: n > 0 ? nPos / n : 0,
    negFrac: n > 0 ? nNeg / n : 0,
    zeroFrac: n > 0 ? nZero / n : 0,
  };
}

/** Signed-data gate (S111). Both log and anscombe transforms NaN on v<0
 *  (log requires v>0; anscombe `√(x+3/8)` requires x≥0 in our impl at
 *  engine.js). When negFrac is non-negligible, either transform drops
 *  a row-survival proportion equal to the cell-level v<0 rate — Phase 1
 *  Target A showed DS21/DS22 at negFrac ≈ 0.50 losing 99%+ of rows under
 *  VST-log, and the synthetic anscombe probe (Addendum Q1) confirmed the
 *  same mechanism on the anscombe branch.
 *
 *  Threshold = 0.1: the detectVST slope regression conditions on mean>0
 *  rows. At negFrac < 0.1, conditioning drops at most ~10% of rows
 *  (estimator bias acceptable). At negFrac ≥ 0.1, conditioning becomes
 *  a selection bias on the positive half only, and the fitted slope is
 *  an upper-tail Jensen artefact rather than a true mean-variance
 *  relationship. The gate blocks both slope-driven and assay-fallback
 *  log/anscombe selections on signed-centered data.
 *
 *  @see METHODOLOGY.md §"Signed-data gate" */
export function requiresPositiveDomain(matrix) {
  const { negFrac } = computeSignednessStats(matrix);
  return negFrac < 0.1;
}

/** Detect the appropriate variance-stabilizing transform at import time.
 *  Uses log-log mean-variance slope with 95% CI hypothesis test against slope = 1.
 *  Falls back to assay-specific defaults when inconclusive. S111 added a
 *  signed-data gate (`requiresPositiveDomain`) ahead of both log and
 *  anscombe branches — signed-centered data with negFrac ≥ 0.1 routes to
 *  `raw` with reasonCode `signedData` regardless of slope / assay.
 *  @param {Array<Array<?number>>} matrix - Numeric data matrix
 *  @param {string} assay - Assay type key (e.g. 'general', 'elisa', 'genomics')
 *  @returns {{transform: 'raw'|'log'|'anscombe', reason: string,
 *    reasonCode?: string, dataSlope: ?number, slopeSE: ?number,
 *    slopeCI: ?number[], slopeTest: ?string, isInteger: boolean,
 *    negFrac?: number}} */
export function detectVST(matrix, assay) {
  // Determine integer fraction
  const allVals = matrix.flat().filter(v => v != null);
  if (allVals.length === 0) return { transform: 'raw', reason: 'No data', dataSlope: null };
  const intCount = allVals.filter(v => Number.isInteger(v)).length;
  const intFrac = intCount / allVals.length;
  const isInteger = intFrac > 0.95;

  // Positive fraction (needed for log safety)
  const posCount = allVals.filter(v => v > 0).length;
  const posFrac = posCount / allVals.length;

  // Compute log-log slope with SE: row mean vs row variance
  // Then test H₀: slope = 1 (Poisson reference) using 95% CI.
  //   CI entirely above 1 → proportional noise → log
  //   CI entirely below 1 → additive noise → raw
  //   CI contains 1       → Poisson-like → Anscombe (integer) or assay fallback
  // This replaces arbitrary cutpoints (1.5/0.5) with a formal hypothesis test.
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  let dataSlope = null, slopeSE = null, slopeCI = null, slopeTest = null;
  if (nC >= 3 && nR >= 10) {
    const points = [];
    for (let r = 0; r < nR; r++) {
      const vals = matrix[r].filter(v => v != null && v > 0);
      if (vals.length >= 3) {
        const m = vals.reduce((a, b) => a + b, 0) / vals.length;
        const v = vals.reduce((s, x) => s + (x - m) ** 2, 0) / (vals.length - 1);
        if (m > 0 && v > 0) points.push({ lm: Math.log(m), lv: Math.log(v) });
      }
    }
    if (points.length >= 10) {
      const n = points.length;
      const sx = points.reduce((s, p) => s + p.lm, 0);
      const sy = points.reduce((s, p) => s + p.lv, 0);
      const sxx = points.reduce((s, p) => s + p.lm * p.lm, 0);
      const sxy = points.reduce((s, p) => s + p.lm * p.lv, 0);
      const denom = n * sxx - sx * sx;
      if (Math.abs(denom) > 1e-10) {
        dataSlope = (n * sxy - sx * sy) / denom;
        const intercept = (sy - dataSlope * sx) / n;
        // Residual variance → SE of slope
        const ssr = points.reduce((s, p) => s + (p.lv - intercept - dataSlope * p.lm) ** 2, 0);
        const mse = ssr / Math.max(n - 2, 1);
        const sxxCentered = sxx - sx * sx / n;
        slopeSE = sxxCentered > 0 ? Math.sqrt(mse / sxxCentered) : null;
        if (slopeSE !== null && slopeSE > 0) {
          // 95% CI: slope ± 1.96 × SE (normal approx, n≥10)
          slopeCI = [dataSlope - 1.96 * slopeSE, dataSlope + 1.96 * slopeSE];
          // Test against slope = 1 (Poisson reference)
          if (slopeCI[0] > 1) slopeTest = 'above';      // CI entirely above 1 → proportional
          else if (slopeCI[1] < 1) slopeTest = 'below';  // CI entirely below 1 → additive
          else slopeTest = 'contains';                    // CI contains 1 → Poisson-like
        }
      }
    }
  }

  const ciStr = slopeCI ? `[${slopeCI[0].toFixed(2)}, ${slopeCI[1].toFixed(2)}]` : null;

  // Signed-data gate (S111). Evaluated once; referenced by both log and
  // anscombe decision points. negFrac ≥ 0.1 → refuse positive-domain
  // transforms; fall through to raw regardless of slope / assay / integer
  // status. See METHODOLOGY.md §"Signed-data gate".
  const positiveDomain = requiresPositiveDomain(matrix);
  const { negFrac } = computeSignednessStats(matrix);

  // Decision: integer check first
  if (isInteger) {
    if (slopeTest === 'above' && posFrac > 0.5 && positiveDomain) {
      // NB overdispersion: Var ∝ mean² at high expression → log is correct.
      // Reference: Love et al. (2014) DESeq2 — rlog for NB count data.
      return { transform: 'log', reason: `Integer data, slope=${dataSlope.toFixed(2)}, 95% CI ${ciStr} entirely above 1 → NB overdispersion → log`, dataSlope, slopeSE, slopeCI, slopeTest, isInteger: true, negFrac };
    }
    if (!positiveDomain) {
      // S111: integer-dominant signed-centered data (e.g. centered z-rounded
      // counts, signed Likert) would route to anscombe under the pre-S111
      // default and NaN on v<0. Fall through to raw.
      return { transform: 'raw', reason: `Integer data with ${(negFrac * 100).toFixed(0)}% negative cells — signed-data gate (negFrac ≥ 0.1) blocks positive-domain transforms → raw`, reasonCode: 'signedData', dataSlope, slopeSE, slopeCI, slopeTest, isInteger: true, negFrac };
    }
    // CI contains 1 or below 1 → Poisson-like or sub-Poisson → Anscombe
    const slopeNote = dataSlope !== null ? `, slope=${dataSlope.toFixed(2)}` + (ciStr ? `, 95% CI ${ciStr}` : '') : '';
    return { transform: 'anscombe', reason: `Integer data (${(intFrac * 100).toFixed(0)}%)${slopeNote} → Anscombe √(x+⅜)`, dataSlope, slopeSE, slopeCI, slopeTest, isInteger: true, negFrac };
  }

  // Continuous data: use CI test if available.
  // CI above 1 -> log (confident) ONLY when assay === 'general'.
  // For domain-specific assays, the user's selection is authoritative:
  // qpcr/physiological are on a ratio scale where log is physically wrong;
  // elisa/densitometry already route to log via fallback.
  if (slopeTest === 'above' && posFrac > 0.5 && assay === 'general' && positiveDomain) {
    return { transform: 'log', reason: `Slope=${dataSlope.toFixed(2)}, 95% CI ${ciStr} entirely above 1 → proportional noise → log`, dataSlope, slopeSE, slopeCI, slopeTest, isInteger: false, negFrac };
  }

  // Assay-type fallback (only when slope test is inconclusive or unavailable)
  const assayMap = {
    elisa: 'log', densitometry: 'log',
    genomics: 'log',  // continuous genomics (normalised) — integer caught above
    proteomics: 'log',  // log-normal intensity data — proportional error
    cell_count: 'raw', plate_reader: 'raw',
    qpcr: 'raw', physiological: 'raw', general: 'raw'
  };
  const t = assayMap[assay] || 'raw';

  // S111 signed-data gate: block log fallback on signed-centered data even
  // when the assay map recommends log. This catches the DS21/DS22 failure
  // mode surfaced Phase 1 Target A (posFrac ≈ 0.5, slope CI > 1 from
  // mean>0-only conditioning, row loss ≈ 99% post-log). Pre-S111 this
  // path was reachable via the posFrac > 0.5 continuous-general branch
  // above; the gate now applies to ALL log fallbacks uniformly.
  if (t === 'log' && !positiveDomain) {
    return { transform: 'raw', reason: `Assay (${assay}) suggests log, but ${(negFrac * 100).toFixed(0)}% of cells are negative — signed-data gate (negFrac ≥ 0.1) blocks log → raw`, reasonCode: 'signedData', dataSlope, slopeSE, slopeCI, slopeTest, isInteger: false, negFrac };
  }

  // Safety: log requires >50% positive (retained as secondary check behind
  // the S111 signed-data gate — catches zero-heavy non-negative data where
  // negFrac < 0.1 but posFrac ≤ 0.5 due to a large zero fraction).
  if (t === 'log' && posFrac <= 0.5) {
    return { transform: 'raw', reason: `Assay (${assay}) suggests log, but only ${(posFrac * 100).toFixed(0)}% positive → raw`, dataSlope, slopeSE, slopeCI, slopeTest, isInteger: false, negFrac };
  }

  const slopeNote = slopeCI
    ? `slope=${dataSlope.toFixed(2)}, CI ${ciStr} ${slopeTest === 'below' ? 'below' : 'contains'} 1 → inconclusive`
    : 'insufficient range for slope';
  return { transform: t, reason: `${slopeNote} → assay fallback (${assay}) → ${t}`, dataSlope, slopeSE, slopeCI, slopeTest, isInteger: false, negFrac };
}

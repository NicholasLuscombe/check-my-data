/* 10. Decimal Precision Consistency — trailing-zero binomial model */
/**
 * Detects inconsistent decimal places across values using a principled
 * trailing-zero-stripping binomial model.
 *
 * If true instrument precision is K decimal places, trailing-zero
 * stripping (as Excel and CSV do) produces apparent precision j < K
 * with probability P(apparent = j) = (1/10)^(K-j) × (9/10) for 1 ≤ j < K.
 *
 * For each intermediate level j, a one-tailed binomial deficit test checks
 * whether the observed count is significantly lower than the model predicts.
 * BH-FDR correction across all tested levels.
 *
 * @param {number[][]} matrix - 2D array of parsed numeric values (rows x replicate columns)
 * @param {string[][]|null} rawMatrix - 2D array of raw string values preserving trailing zeros, or null
 * @param {string} assay - Assay type identifier (e.g. 'qpcr', 'general')
 * @returns {object}
 * @see METHODOLOGY.md §"3.3 Decimal Precision Consistency"
 */
import { regIncBeta, bhFDR } from '../stats/primitives.js';
import { flagFromP } from '../constants/thresholds.js';

export function testDecimalPrecision(matrix, rawMatrix, assay) {
  // Use rawMatrix (string values) when available so that trailing zeros are preserved.
  const sourceMatrix = rawMatrix || matrix;
  const vals = rawMatrix
    ? rawMatrix.flat().filter(v => v != null)
    : matrix.flat().filter(v => v != null && isFinite(v));
  const withDec = rawMatrix
    ? vals.filter(v => String(v).includes("."))
    : vals.filter(v => !Number.isInteger(v));
  if (withDec.length < 30) return { name: "Decimal Precision Consistency", category: "digits", flag: "N/A", description: "Insufficient decimal-valued data (need ≥30 non-integer values)." };

  // Count values per decimal-place level
  const prec = {};
  for (const v of withDec) {
    const s = rawMatrix ? String(v) : String(Math.abs(v));
    const dp = s.includes(".") ? s.split(".")[1].length : 0;
    prec[dp] = (prec[dp] || 0) + 1;
  }
  const total = withDec.length;
  const dps = Object.keys(prec).map(Number).sort((a, b) => a - b);
  const maxDp = Math.max(...dps);
  const dominantDp = dps.reduce((a, b) => prec[a] > prec[b] ? a : b);
  const dominantFrac = prec[dominantDp] / total;
  const nDistinct = dps.length;
  const det = dps.map(dp => ({ decimalPlaces: dp, count: prec[dp], fraction: ((prec[dp] / total) * 100).toFixed(1) + "%" }));

  // ── Trailing-zero binomial model ──
  // Under single-instrument model with true precision K = maxDp,
  // expected fraction at intermediate level j:
  //   P(j) = (1/10)^(K-j) × (9/10)   for 1 ≤ j < K
  //   P(K) = 1 - sum(P(j) for j=1..K-1)
  // One-tailed deficit test: are there fewer values at level j than expected?

  // Only apply the binomial model when multiple dp levels are present —
  // that's evidence trailing-zero stripping HAS occurred.  When nDistinct === 1,
  // all values sit at the same precision (no stripping artefact to model).
  const perLevel = [];
  if (maxDp > 1 && nDistinct > 1) {
    for (let j = 1; j < maxDp; j++) {
      const expectedP = Math.pow(0.1, maxDp - j) * 0.9;
      const observed = prec[j] || 0;
      const expectedCount = expectedP * total;
      // Binomial CDF: P(X ≤ observed | n, expectedP)
      // Using regularised incomplete beta: I_{1-p}(n-k, k+1)
      const p = observed >= total ? 1.0 : regIncBeta(total - observed, observed + 1, 1 - expectedP);
      perLevel.push({ dp: j, observed, expected: Math.round(expectedCount * 10) / 10, expectedP, p });
    }
  }

  let primaryP = 1.0;
  let flag = "LOW";
  let interpretation;

  if (perLevel.length > 0) {
    const rawPs = perLevel.map(l => l.p);
    const adjPs = bhFDR(rawPs);
    perLevel.forEach((l, i) => { l.adjP = adjPs[i]; });
    primaryP = Math.min(...adjPs);
    flag = flagFromP(primaryP);
  }

  // Gap detection for display — keep for UI (Implications text)
  const gapDps = [];
  for (let d = Math.min(...dps) + 1; d < maxDp; d++) {
    if (!prec[d]) gapDps.push(d);
  }
  const gapCount = gapDps.length;

  if (flag === "LOW") {
    if (nDistinct === 1) {
      interpretation = `All values at ${dominantDp}dp — consistent with single fixed-precision instrument. Not suspicious.`;
    } else {
      interpretation = `Smooth distribution from 1–${maxDp}dp — consistent with ${maxDp}dp instrument output with trailing zeros stripped by Excel/CSV parser.`;
    }
  } else {
    const deficitLevels = perLevel.filter(l => l.adjP < 0.01).map(l => l.dp);
    interpretation = deficitLevels.length > 0
      ? `Values at ${deficitLevels.join(", ")}dp are significantly rarer than trailing-zero stripping predicts — precision distribution inconsistent with any single fixed-precision source.`
      : `Precision distribution deviates from the trailing-zero model (p = ${primaryP.toExponential(1)}).`;
  }

  return {
    name: "Decimal Precision Consistency", category: "digits",
    description: "Checks whether the distribution of decimal places is consistent with a single fixed-precision instrument (possibly with trailing zeros stripped by Excel). Uses a binomial model for the expected frequency of each intermediate precision level under trailing-zero stripping." + (assay === 'qpcr' ? ' Note: mixed precision in Ct data is common when qPCR software concatenates float32/float64 outputs, or when data is assembled from multiple export runs — verify data provenance before treating as suspicious.' : ''),
    nDecimalValues: total, dominantDecimalPlaces: dominantDp,
    dominantFraction: (dominantFrac * 100).toFixed(1) + "%", distinctPrecisionLevels: nDistinct,
    maxDecimalPlaces: maxDp, gapsDetected: gapCount, gapAtDp: gapDps.join(",") || "none",
    primaryP, interpretation, flag, details: det, perLevel
  };
}

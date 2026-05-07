/* 25. Shannon Entropy Test
   Detects columns whose value-frequency distribution has anomalous entropy —
   either too few distinct values (fabrication via copy-paste or a restricted value set)
   or too uniform (over-randomised to look "real").

   Procedure:
   1. Compute Shannon entropy H of each DATA column's value frequency distribution.
   2. Bootstrap null: fit parametric model (Normal/Poisson/NB), simulate 999 columns,
      discretise to the observed modal decimal precision, compute H for each.
   3. Two-sided p: compare H_obs to null distribution.
   4. BH-FDR across columns.

   @param {number[][]} matrix - Numeric data matrix (rows × DATA columns).
   @param {{ random: Function, randn: Function }} rng - PRNG factory instance.
   @param {string} dataType - 'continuous' | 'count' | 'ordinal'.
   @returns {{ name: string, category: string, flag: string, primaryP: number, columns: object[], ... }}
   @see METHODOLOGY.md §"Shannon Entropy Test"
*/

import { mean, variance, bhFDR, modalPrecision } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

export function testEntropy(matrix, rng, dataType) {
  const NAME = "Entropy / Zipf Analysis";
  const CAT = "shapes";

  if (dataType === "ordinal") {
    return { name: NAME, category: CAT, flag: "N/A",
      description: "Not applicable to ordinal data — discrete ordinal scales have inherently constrained entropy." };
  }

  const nR = matrix.length;
  const nC = matrix[0]?.length || 0;
  if (nC < 1) return { name: NAME, category: CAT, flag: "N/A", description: "No DATA columns." };

  const B = 999; // bootstrap iterations
  const columnResults = [];

  for (let ci = 0; ci < nC; ci++) {
    // Extract non-null values for this column
    const vals = [];
    for (let ri = 0; ri < nR; ri++) {
      const v = matrix[ri][ci];
      if (v != null && isFinite(v)) vals.push(v);
    }

    if (vals.length < 20) {
      columnResults.push({ col: ci, skip: true, reason: "< 20 observations" });
      continue;
    }

    // Modal decimal precision for this column
    const prec = modalPrecision(vals);

    // Shannon entropy of observed values
    const hObs = _shannonEntropy(vals, prec);

    // Fit parametric model
    const mu = mean(vals);
    const v2 = variance(vals);
    const sd = Math.sqrt(v2);

    // Bootstrap null distribution
    const hNull = new Float64Array(B);
    const isCount = dataType === "count";

    for (let b = 0; b < B; b++) {
      const synth = new Array(vals.length);
      if (isCount && v2 / mu > 1.5 && mu > 0) {
        // Negative Binomial via Normal approximation (pragmatic)
        for (let i = 0; i < synth.length; i++) {
          synth[i] = Math.max(0, Math.round(mu + sd * rng.randn()));
        }
      } else if (isCount) {
        // Poisson
        for (let i = 0; i < synth.length; i++) {
          synth[i] = _samplePoisson(mu, rng);
        }
      } else {
        // Continuous → Normal(mu, sd)
        for (let i = 0; i < synth.length; i++) {
          synth[i] = mu + sd * rng.randn();
        }
      }
      hNull[b] = _shannonEntropy(synth, isCount ? 0 : prec);
    }

    // Two-sided p-value
    let countLow = 1, countHigh = 1; // +1 for H_obs itself
    for (let b = 0; b < B; b++) {
      if (hNull[b] <= hObs) countLow++;
      if (hNull[b] >= hObs) countHigh++;
    }
    const pLow = countLow / (1 + B);
    const pHigh = countHigh / (1 + B);
    const direction = pLow < pHigh ? "low" : "high";
    const rawP = Math.min(1.0, Math.min(pLow, pHigh) * 2);

    // Median of null for ratio
    const sortedNull = Array.from(hNull).sort((a, b) => a - b);
    const hMedian = sortedNull[Math.floor(B / 2)];
    const ratio = hMedian > 0 ? hObs / hMedian : (hObs > 0 ? Infinity : 1);

    columnResults.push({
      col: ci, skip: false,
      hObs, hExpected: hMedian, ratio, rawP, direction, precision: prec,
    });
  }

  // Collect non-skipped columns
  const tested = columnResults.filter(c => !c.skip);
  if (tested.length === 0) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: "All columns had insufficient observations (< 20) for entropy analysis." };
  }

  // BH-FDR across tested columns
  const rawPs = tested.map(c => c.rawP);
  const adjPs = bhFDR(rawPs);

  // Effect-size gate: only flag columns where entropy deviates meaningfully.
  // The parametric null is slightly idealised (perfect Normal/Poisson), so real data
  // often has marginally lower entropy due to measurement discretisation, rounding,
  // or natural clustering. Require ratio < 0.85 or > 1.15 for a column to count.
  const RATIO_GATE = 0.15;
  for (let i = 0; i < tested.length; i++) {
    tested[i].adjP = adjPs[i];
    const deviant = Math.abs(tested[i].ratio - 1) >= RATIO_GATE;
    tested[i].flag = deviant ? flagFromP(adjPs[i]) : "LOW";
  }

  const primaryP = Math.min(...adjPs);

  const nFlagged = tested.filter(c => c.flag === "HIGH" || c.flag === "MODERATE").length;

  // Test-level flag: require ≥1 column with meaningful effect size
  let flag = nFlagged > 0 ? flagFromP(Math.min(...tested.filter(c => c.flag !== "LOW").map(c => c.adjP))) : "LOW";

  const nLow = tested.filter(c => c.direction === "low" && (c.flag === "HIGH" || c.flag === "MODERATE")).length;
  const nHigh = tested.filter(c => c.direction === "high" && (c.flag === "HIGH" || c.flag === "MODERATE")).length;

  // Build details for card/report
  const details = tested
    .filter(c => c.flag !== "LOW")
    .sort((a, b) => a.adjP - b.adjP)
    .slice(0, 30)
    .map(c => ({
      Col: c.col + 1,
      Direction: c.direction === "low" ? "Low entropy" : "High entropy",
      H_obs: c.hObs.toFixed(3),
      H_expected: c.hExpected.toFixed(3),
      Ratio: c.ratio.toFixed(3),
      adjP: c.adjP,
    }));

  // Column ratios for MiniCard bar chart (all tested columns)
  const colRatios = tested.map(c => ({
    col: c.col + 1,
    ratio: c.ratio,
    direction: c.direction,
    flagged: c.flag === "HIGH" || c.flag === "MODERATE",
  }));

  const fewColumns = tested.length < 5;

  return {
    name: NAME, category: CAT, flag, primaryP,
    description: "Shannon entropy measures how spread-out the value distribution is. " +
      "Fabricated columns often have too few distinct values (low entropy — suggests values were drawn from a restricted set) " +
      "or artificially uniform distributions (high entropy — over-randomised). " +
      "A parametric bootstrap null calibrates what entropy to expect for each column given its mean and variance.",
    nTested: tested.length,
    nFlagged, nLow, nHigh,
    fewColumnsNote: fewColumns ? "Fewer than 5 columns tested — BH-FDR correction may be conservative." : null,
    colRatios,
    details,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Shannon entropy (bits) of a numeric array, discretised to `prec` decimal places. */
function _shannonEntropy(arr, prec) {
  const factor = Math.pow(10, prec);
  const freq = new Map();
  for (let i = 0; i < arr.length; i++) {
    const key = Math.round(arr[i] * factor);
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  const n = arr.length;
  let h = 0;
  for (const count of freq.values()) {
    const p = count / n;
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/** Sample from Poisson(λ) using inverse-transform for small λ, Normal approx for large λ. */
function _samplePoisson(lambda, rng) {
  if (lambda <= 0) return 0;
  if (lambda >= 30) {
    // Normal approximation
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * rng.randn()));
  }
  // Inverse-transform (Knuth)
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do {
    k++;
    p *= rng.random();
  } while (p > L);
  return k - 1;
}

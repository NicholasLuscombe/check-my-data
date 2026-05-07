import { mean, normalCDF, regIncBeta } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

/* Carlisle Baseline Balance Test
   Detects suspiciously perfect or imperfect balance between experimental conditions.
   Under honest random allocation or independent sampling, per-feature between-group
   p-values should be approximately U(0,1). Clustering near 1.0 indicates someone
   ensured the groups match too well (fabrication). Clustering near 0 indicates
   non-random allocation.

   Procedure:
   1. For each feature, compute one-way ANOVA F-stat across condition groups.
   2. Convert to p-value via F-distribution.
   3. Test p-value distribution against U(0,1):
      (a) Binomial test: excess p > 0.95 (too-balanced signal).
      (b) KS test for general departure from uniform.
   4. Combined flag: min(binomP, ksP) → flag.

   Applicability:
   - Requires condCtx with ≥2 conditions.
   - Row-grouped: features = DATA columns, conditions = COND groups. Need ≥5 columns.
   - Column-grouped: features = rows, conditions = column groups. Need ≥10 rows.
   - Skip if >50% of features show significant (p < 0.05) differences — conditions are
     genuinely different and p-values are expected non-uniform.

   Reference: Carlisle (2017). Data fabrication and other reasons for non-random sampling
   in 5087 randomised, controlled trials. Anaesthesia, 72(8), 944–952. */
/**
 * Detects suspiciously uniform or non-uniform balance between experimental conditions.
 * @param {number[][]} matrix - Numeric matrix.
 * @param {import('../analysis/conditionContext.js').ConditionContext} condCtx - Condition context.
 * @returns {{ name: string, category: string, flag: string, primaryP: number|null, nFeatures: number, nExcess: number, binomP: number, ksD: number, ksP: number, featurePValues: number[] }}
 * @see METHODOLOGY.md §X.X (pending)
 */
export function testCarlisleBalance(matrix, condCtx) {
  const NAME = "Baseline Balance";
  const CAT = "group";

  if (!condCtx || !condCtx.has || condCtx.count < 2) {
    return _na(NAME, CAT, "Requires ≥2 experimental conditions.");
  }

  // Determine features and condition groups based on condCtx type
  const featurePValues = [];
  const featureDetails = [];

  if (condCtx.type === "row-grouped") {
    // Features = DATA columns, conditions = COND row groups
    const slices = condCtx.slices();
    if (slices.length < 2) return _na(NAME, CAT, "Requires ≥2 conditions with ≥3 rows each.");

    const nC = matrix[0]?.length || 0;
    if (nC < 5) return _na(NAME, CAT, `Only ${nC} DATA columns — need ≥5 features for meaningful balance test.`);

    for (let c = 0; c < nC; c++) {
      // Collect values per condition for this column
      const groups = [];
      const condMeans = [];
      for (const slice of slices) {
        const vals = slice.matrix.map(row => row[c]).filter(v => v != null);
        if (vals.length < 3) continue;
        groups.push(vals);
        condMeans.push(+mean(vals).toFixed(3));
      }
      if (groups.length < 2) continue;

      const p = _oneWayAnovaP(groups);
      if (p !== null && isFinite(p)) {
        featurePValues.push(p);
        featureDetails.push({ feature: `Col ${c + 1}`, p: +p.toFixed(6), condMeans });
      }
    }
  } else if (condCtx.type === "column-grouped") {
    // Features = rows, conditions = column groups
    const slices = condCtx.slices();
    if (slices.length < 2) return _na(NAME, CAT, "Requires ≥2 condition column groups.");

    const nR = matrix.length;
    if (nR < 10) return _na(NAME, CAT, `Only ${nR} rows — need ≥10 features for meaningful balance test.`);

    for (let r = 0; r < nR; r++) {
      const groups = [];
      const condMeans = [];
      for (const slice of slices) {
        // slice.colIndices tells us which columns belong to this condition
        const vals = (slice.colIndices || []).map(ci => matrix[r][ci]).filter(v => v != null);
        if (vals.length < 2) continue;
        groups.push(vals);
        condMeans.push(+mean(vals).toFixed(3));
      }
      if (groups.length < 2) continue;

      const p = _oneWayAnovaP(groups);
      if (p !== null && isFinite(p)) {
        featurePValues.push(p);
        if (featureDetails.length < 100) {
          featureDetails.push({ feature: `Row ${r + 1}`, p: +p.toFixed(6), condMeans });
        }
      }
    }
  } else {
    return _na(NAME, CAT, "No condition structure available.");
  }

  const nFeatures = featurePValues.length;
  if (nFeatures < 5) return _na(NAME, CAT, `Only ${nFeatures} testable features — need ≥5 for meaningful balance test.`);

  // Gate: skip if >50% of features show significant differences (conditions genuinely different)
  const nSig = featurePValues.filter(p => p < 0.05).length;
  if (nSig / nFeatures > 0.50) {
    return _na(NAME, CAT, `${nSig}/${nFeatures} features (${(nSig / nFeatures * 100).toFixed(0)}%) show significant condition differences — conditions are genuinely different. Balance test not applicable.`);
  }

  // ── Test (a): Binomial test for excess p > 0.95 (too balanced) ──
  const TAIL = 0.95;
  const nExcess = featurePValues.filter(p => p > TAIL).length;
  const expectedExcess = nFeatures * (1 - TAIL); // 5% expected under U(0,1)
  const binomP = _binomialUpperTail(nExcess, nFeatures, 1 - TAIL);

  // ── Test (b): KS test against U(0,1) ──
  const sorted = [...featurePValues].sort((a, b) => a - b);
  let ksD = 0;
  for (let i = 0; i < nFeatures; i++) {
    const ecdf = (i + 1) / nFeatures;
    const d1 = Math.abs(ecdf - sorted[i]);
    const d2 = Math.abs(sorted[i] - i / nFeatures);
    ksD = Math.max(ksD, d1, d2);
  }
  const ksP = _ksSurvival(ksD, nFeatures);

  // ── Combined flag ──
  const primaryP = Math.min(binomP, ksP);
  let flag = flagFromP(primaryP);

  // Effect-size gate: require ≥50% of features with p > 0.95 for flag above LOW.
  // With few features (<10), sampling variation easily produces 1-2 high p-values
  // by chance. Genuine fabricated balance produces most or all p-values near 1.0.
  const excessFrac = nExcess / nFeatures;
  if (flag !== "LOW" && excessFrac < 0.50) {
    flag = "LOW";
  }

  // Build p-value histogram for MiniCard (10 bins, 0.0–1.0)
  const histBins = new Array(10).fill(0);
  for (const p of featurePValues) {
    const bin = Math.min(9, Math.floor(p * 10));
    histBins[bin]++;
  }

  // Determine balance direction
  const direction = nExcess > expectedExcess + 1
    ? "too balanced"
    : nSig > nFeatures * 0.15
      ? "imbalanced"
      : "normal";

  return {
    name: NAME, category: CAT,
    description: "Under honest random allocation or independent sampling, between-group comparison p-values " +
      "should follow a uniform distribution. If conditions are suspiciously similar (all p-values near 1.0), " +
      "someone may have fabricated matched groups. If conditions differ more than expected, allocation may not be random.",
    flag, primaryP,
    nFeatures,
    nExcess,
    expectedExcess: +expectedExcess.toFixed(1),
    binomP: +binomP.toFixed(8),
    ksD: +ksD.toFixed(4),
    ksP: +ksP.toFixed(8),
    direction,
    nSignificant: nSig,
    histBins,
    featurePValues: nFeatures > 200
      ? featurePValues.filter((_, i) => i % Math.ceil(nFeatures / 200) === 0)
      : featurePValues,
    details: featureDetails.slice(0, 30).map(d => ({
      Feature: d.feature, "ANOVA p": d.p < 0.0001 ? "<0.0001" : d.p.toFixed(4),
      Means: d.condMeans.join(" / "),
    })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function _na(name, cat, desc) {
  return { name, category: cat, flag: "N/A", primaryP: null, description: desc };
}

/** One-way ANOVA F-test. Returns p-value. groups = [[vals], [vals], ...]. */
function _oneWayAnovaP(groups) {
  const k = groups.length;
  if (k < 2) return null;
  const allVals = groups.flat();
  const N = allVals.length;
  if (N <= k) return null;

  const grandMean = mean(allVals);

  // Between-group sum of squares
  let ssBetween = 0;
  for (const g of groups) {
    const gMean = mean(g);
    ssBetween += g.length * (gMean - grandMean) ** 2;
  }

  // Within-group sum of squares
  let ssWithin = 0;
  for (const g of groups) {
    const gMean = mean(g);
    for (const v of g) ssWithin += (v - gMean) ** 2;
  }

  const dfBetween = k - 1;
  const dfWithin = N - k;
  if (dfWithin <= 0 || ssWithin === 0) return null;

  const F = (ssBetween / dfBetween) / (ssWithin / dfWithin);
  if (!isFinite(F) || F < 0) return null;

  // F-distribution CDF via regularized incomplete beta
  // P(F ≤ x | d1, d2) = I(d1·x/(d1·x+d2), d1/2, d2/2)
  const x = dfBetween * F / (dfBetween * F + dfWithin);
  const cdf = regIncBeta(dfBetween / 2, dfWithin / 2, x);
  return Math.max(0, Math.min(1, 1 - cdf));
}

/** Binomial upper tail: P(X ≥ k | n, p) via normal approximation with continuity correction. */
function _binomialUpperTail(k, n, p) {
  if (k === 0) return 1;
  const mu = n * p;
  const sigma = Math.sqrt(n * p * (1 - p));
  if (sigma <= 0) return k > 0 ? 0 : 1;
  const z = (k - 0.5 - mu) / sigma;
  return 1 - normalCDF(z);
}

/** KS survival function: P(D > d) for KS test against U(0,1).
 *  Uses the asymptotic Kolmogorov distribution. */
function _ksSurvival(d, n) {
  if (d <= 0) return 1;
  const s = d * Math.sqrt(n);
  if (s > 5) return 0; // effectively zero
  // Kolmogorov's formula: Q(s) = 2 Σ_{k=1}^{∞} (-1)^{k+1} exp(-2k²s²)
  let q = 0;
  for (let k = 1; k <= 100; k++) {
    const term = (k % 2 === 1 ? 1 : -1) * Math.exp(-2 * k * k * s * s);
    q += term;
    if (Math.abs(term) < 1e-15) break;
  }
  return Math.max(0, Math.min(1, 2 * q));
}

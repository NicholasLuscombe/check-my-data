/* Column Goodness-of-Fit (Track E (b), §3.7)
   Tests whether each DATA column's CDF shape matches its fitted parametric family
   (Normal / Poisson / NB), complementary to §3.6 Shannon. Hand-typed, truncated, or
   copy-from-different-shape columns produce shape mismatches the entropy test can miss
   when the distinct-value count happens to align; RNG-padded columns produce too-tight
   fits that a one-sided test would miss entirely.

   Procedure (METHODOLOGY.md §3.7, v1.0):
   1. Applicability: ≥30 obs, ≥10 distinct values (ordinal skipped upstream).
   2. Family routing (inherit §3.6):
      • count + var/mean ≤ 1.5 → Poisson
      • count + var/mean > 1.5 → NB (Normal-approx, pragmatic per §3.6)
      • continuous → Normal, with N-adaptive γ₁/γ₂ pre-skip:
          |γ₁| > 1.5 → N/A (log-normal / heavy-skew); γ₂ < −1.2 → N/A (uniform-or-flatter,
          universal); γ₂ < −0.8 AND N ≥ 100 → N/A (strict gate where γ₂ is precise).
   3. Classical AD² against fitted CDF, F̂ clipped to [1e-6, 1−1e-6].
   4. Refit bootstrap null (B=999): draw → discretise to modal precision → REFIT → A²
      against refit CDF. Refit is load-bearing; fixed-param bootstrap is anti-conservative.
   5. Two-sided p: p = min(p_low, p_high) × 2, capped at 1.
   6. BH-FDR across applicable columns.
   7. Effect-size gate: ratio = A²_obs / median(A²_null); flag requires
      ratio ≥ 2.0 (shape mismatch, direction = "high") OR ratio ≤ 0.5 (too-tight, direction = "low").

   @param {number[][]} matrix - Numeric data matrix (rows × DATA columns).
   @param {{ random, randn }} rng - Deterministic PRNG.
   @param {string} dataType - 'continuous' | 'count' | 'ordinal'.
   @returns {object} Test result with engine-owned classification fields.
   @see METHODOLOGY.md §3.7 Column Goodness-of-Fit */

import { mean, variance, bhFDR, modalPrecision, normalCDF, chiSquaredP } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

const NAME = "Column Goodness-of-Fit";
const CAT  = "shapes";
const B    = 999;
const CLIP_LO = 1e-6;
const CLIP_HI = 1 - 1e-6;
const RATIO_HIGH = 2.0;   // mismatch direction: A²_obs / median ≥ this
const RATIO_LOW  = 0.5;   // too-tight direction: A²_obs / median ≤ this
const SKEW_GATE = 1.5;          // |γ₁| > this → pre-skip (log-normal / heavy skew)
const EXKURT_FLOOR = -1.2;      // γ₂ < this → pre-skip at any N (uniform-flatter; uniform γ₂ = -1.2 is the reference)
const EXKURT_GATE_HIGHN = -0.8; // γ₂ < this → pre-skip only when N ≥ 100 (where γ₂ is precise enough)
const GAMMA_N_ADAPTIVE_THRESHOLD = 100;

export function testColumnGof(matrix, rng, dataType) {
  if (dataType === "ordinal") {
    return { name: NAME, category: CAT, flag: "N/A",
      description: "Not applicable to ordinal data — discrete ordinal scales do not fit {Normal, Poisson, NB} families." };
  }

  const nR = matrix.length;
  const nC = matrix[0]?.length || 0;
  if (nC < 1) return { name: NAME, category: CAT, flag: "N/A", description: "No DATA columns." };

  const isCount = dataType === "count";
  const columnResults = [];

  for (let ci = 0; ci < nC; ci++) {
    const vals = [];
    for (let ri = 0; ri < nR; ri++) {
      const v = matrix[ri][ci];
      if (v != null && isFinite(v)) vals.push(v);
    }

    if (vals.length < 30) {
      columnResults.push({ col: ci, skip: true, reason: "< 30 observations" });
      continue;
    }
    const distinct = new Set(vals).size;
    if (distinct < 10) {
      columnResults.push({ col: ci, skip: true, reason: "< 10 distinct values" });
      continue;
    }

    const mu = mean(vals);
    const v2 = variance(vals);
    const sd = Math.sqrt(v2);

    // Family routing (inherits §3.6). Continuous columns get a γ₁/γ₂ pre-skip
    // to avoid false-flagging against a misspecified family — log-normal biology
    // and uniform clean data are the common offenders.
    let family, fitted;
    let g1 = NaN, g2 = NaN;
    if (isCount) {
      if (mu > 0 && v2 / mu <= 1.5) {
        family = "poisson";
        fitted = { lambda: mu };
      } else {
        // NB via Normal-approx — pragmatic match to §3.6 sampling convention.
        // v1.1 may promote to true NB(r, p) via regIncBeta CDF.
        family = "nb";
        fitted = { mu, sd };
      }
    } else {
      const { m2, m3, m4 } = centralMoments(vals, mu);
      g1 = m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
      g2 = m2 > 0 ? m4 / (m2 * m2) - 3 : 0;
      // N-adaptive γ hybrid (S107 calibration, anchored to uniform γ₂ = -1.2):
      //   |γ₁| > 1.5                              → skip (log-normal / heavy skew)
      //   γ₂ < -1.2                               → skip (uniform-or-flatter, universal)
      //   γ₂ < -0.8 AND N ≥ 100                   → skip (strict gate where γ₂ is precise)
      // The γ₂ floor at -1.2 anchors to the uniform distribution's excess kurtosis, not a
      // round number; at N < 100 the sample γ₂ is noisy, so only the universal -1.2 floor
      // applies — this admits marginally-platykurtic clean batches (DS01/DS17 γ₂ ∈ [-0.97,
      // -0.82]) that were spuriously N/A under the flat -0.8 gate while still excluding
      // structurally-flat batches (DS03 qpcr γ₂ ≈ -1.42).
      const skewFail = Math.abs(g1) > SKEW_GATE;
      const kurtFailFloor = g2 < EXKURT_FLOOR;
      const kurtFailHighN = g2 < EXKURT_GATE_HIGHN && vals.length >= GAMMA_N_ADAPTIVE_THRESHOLD;
      if (skewFail || kurtFailFloor || kurtFailHighN) {
        columnResults.push({ col: ci, skip: true,
          reason: `Pre-skip: γ₁=${g1.toFixed(2)}, γ₂=${g2.toFixed(2)} — family set {Normal, Poisson, NB} does not cover this shape (v1.1 extension planned)`,
          g1, g2 });
        continue;
      }
      family = "normal";
      fitted = { mu, sd };
    }

    const prec = modalPrecision(vals);
    const cdf = makeCDF(family, fitted);

    // Observed AD²
    const sortedObs = vals.slice().sort((a, b) => a - b);
    const A2_obs = andersonDarling(sortedObs, cdf);

    // Bootstrap null with refit
    const A2_null = new Float64Array(B);
    const factor = Math.pow(10, prec);
    for (let b = 0; b < B; b++) {
      const synth = sampleFamily(family, fitted, vals.length, rng);
      // Discretise to modal precision (matches §3.6 bootstrap treatment).
      if (prec > 0) {
        for (let i = 0; i < synth.length; i++) synth[i] = Math.round(synth[i] * factor) / factor;
      } else if (family !== "poisson") {
        // Integer round for NB/Normal when modal precision is 0 (integer column).
        for (let i = 0; i < synth.length; i++) synth[i] = Math.round(synth[i]);
      }

      // Refit family parameters on the bootstrap sample.
      const smu = mean(synth);
      const sv2 = variance(synth);
      const ssd = Math.sqrt(sv2);
      let refit;
      if (family === "poisson") refit = { lambda: smu > 0 ? smu : 1e-9 };
      else refit = { mu: smu, sd: ssd > 0 ? ssd : 1e-9 };  // normal, nb
      const refitCDF = makeCDF(family, refit);

      const sortedSynth = synth.slice().sort((a, b) => a - b);
      A2_null[b] = andersonDarling(sortedSynth, refitCDF);
    }

    // Two-sided p-values (permutation convention: +1 in numerator and denominator).
    let cLow = 1, cHigh = 1;
    for (let b = 0; b < B; b++) {
      if (A2_null[b] <= A2_obs) cLow++;
      if (A2_null[b] >= A2_obs) cHigh++;
    }
    const pLow  = cLow  / (1 + B);
    const pHigh = cHigh / (1 + B);
    // p_high ≤ p_low → "high" A² → shape mismatch. Else "low" → too-tight fit.
    const direction = pHigh <= pLow ? "high" : "low";
    const rawP = Math.min(1, Math.min(pLow, pHigh) * 2);

    // Median of null for effect-size ratio.
    const sortedNull = Array.from(A2_null).sort((a, b) => a - b);
    const A2_median = sortedNull[Math.floor(B / 2)];
    const ratio = A2_median > 0 ? A2_obs / A2_median : (A2_obs > 0 ? Infinity : 1);

    columnResults.push({
      col: ci, skip: false,
      family, fitted, precision: prec, n: vals.length, distinct,
      g1, g2,
      A2_obs, A2_median, ratio, rawP, direction,
    });
  }

  const tested = columnResults.filter(c => !c.skip);
  const skipped = columnResults.filter(c => c.skip);

  if (tested.length === 0) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: `All columns routed to N/A (${skipped.length} columns; most common: ${skipped[0]?.reason || "n/a"}).`,
      skippedColumns: skipped.map(s => ({ col: s.col + 1, reason: s.reason })) };
  }

  // BH-FDR across applicable columns only (skipped columns excluded from denominator).
  const rawPs = tested.map(c => c.rawP);
  const adjPs = bhFDR(rawPs);
  for (let i = 0; i < tested.length; i++) tested[i].adjP = adjPs[i];

  // Effect-size gate (Tier 2). Flag above LOW requires ratio on the correct side.
  for (const c of tested) {
    const mismatchOK = c.direction === "high" && c.ratio >= RATIO_HIGH;
    const tooTightOK = c.direction === "low"  && c.ratio <= RATIO_LOW;
    c.flag = (mismatchOK || tooTightOK) ? flagFromP(c.adjP) : "LOW";
  }

  const primaryP = Math.min(...adjPs);
  const flaggedCols = tested.filter(c => c.flag === "HIGH" || c.flag === "MODERATE");
  const flag = flaggedCols.length > 0 ? flagFromP(Math.min(...flaggedCols.map(c => c.adjP))) : "LOW";

  const nHigh = tested.filter(c => c.direction === "high" && (c.flag === "HIGH" || c.flag === "MODERATE")).length;
  const nLow  = tested.filter(c => c.direction === "low"  && (c.flag === "HIGH" || c.flag === "MODERATE")).length;

  const details = tested
    .filter(c => c.flag !== "LOW")
    .sort((a, b) => a.adjP - b.adjP)
    .slice(0, 30)
    .map(c => ({
      Col: c.col + 1,
      Family: c.family,
      Direction: c.direction === "high" ? "Shape mismatch" : "Too-tight fit",
      A2_obs: c.A2_obs.toFixed(3),
      A2_null_median: c.A2_median.toFixed(3),
      Ratio: c.ratio.toFixed(3),
      adjP: c.adjP,
    }));

  const colRatios = tested.map(c => ({
    col: c.col + 1, ratio: c.ratio, direction: c.direction,
    flagged: c.flag === "HIGH" || c.flag === "MODERATE",
  }));

  const fewColumns = tested.length < 5;

  return {
    name: NAME, category: CAT, flag, primaryP,
    description: "Anderson–Darling goodness-of-fit per column against a moment-matched {Normal, Poisson, NB} family. " +
      "Parametric bootstrap null with refit (B=999) calibrates the per-column AD² distribution; two-sided test flags " +
      "both shape mismatch (AD too large) and too-tight fits (AD too small, suggesting RNG padding).",
    nTested: tested.length,
    nSkipped: skipped.length,
    nFlagged: flaggedCols.length,
    nHigh, nLow,
    fewColumnsNote: fewColumns ? "Fewer than 5 columns tested — BH-FDR correction may be conservative." : null,
    colRatios,
    details,
    skippedColumns: skipped.map(s => ({ col: s.col + 1, reason: s.reason })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Classical Anderson–Darling A² against a fitted CDF. Values must be pre-sorted ascending. */
function andersonDarling(sorted, cdf) {
  const N = sorted.length;
  let S = 0;
  for (let i = 1; i <= N; i++) {
    let Fi  = cdf(sorted[i - 1]);
    let FNi = cdf(sorted[N - i]);
    if (Fi  < CLIP_LO) Fi  = CLIP_LO; else if (Fi  > CLIP_HI) Fi  = CLIP_HI;
    if (FNi < CLIP_LO) FNi = CLIP_LO; else if (FNi > CLIP_HI) FNi = CLIP_HI;
    S += (2 * i - 1) * (Math.log(Fi) + Math.log(1 - FNi));
  }
  return -N - S / N;
}

/** Central moments m₂, m₃, m₄ (biased /N denominator — matches γ₁/γ₂ convention). */
function centralMoments(vals, mu) {
  let m2 = 0, m3 = 0, m4 = 0;
  for (const v of vals) {
    const d = v - mu;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  const N = vals.length;
  return { m2: m2 / N, m3: m3 / N, m4: m4 / N };
}

/** Build a CDF closure for the fitted family. Normal and NB share the Normal CDF
 *  (NB uses Normal-approx per §3.6 convention). Poisson uses the χ²/Gamma identity. */
function makeCDF(family, params) {
  if (family === "normal" || family === "nb") {
    const { mu, sd } = params;
    const safe = sd > 0 ? sd : 1e-9;
    return (x) => normalCDF((x - mu) / safe);
  }
  if (family === "poisson") {
    const { lambda } = params;
    const lam = lambda > 0 ? lambda : 1e-9;
    // Poisson(λ) CDF at k ≥ 0: P(X ≤ k) = P(χ²_{2(k+1)} ≥ 2λ) = chiSquaredP(2λ, 2(k+1))
    return (x) => {
      if (x < 0) return 0;
      const k = Math.floor(x);
      return chiSquaredP(2 * lam, 2 * (k + 1));
    };
  }
  throw new Error(`Unknown family: ${family}`);
}

/** Draw N values from the fitted family. NB uses Normal-approx (clamped ≥0, integer). */
function sampleFamily(family, params, n, rng) {
  const out = new Array(n);
  if (family === "normal") {
    const { mu, sd } = params;
    for (let i = 0; i < n; i++) out[i] = mu + sd * rng.randn();
  } else if (family === "poisson") {
    const { lambda } = params;
    for (let i = 0; i < n; i++) out[i] = samplePoisson(lambda, rng);
  } else if (family === "nb") {
    const { mu, sd } = params;
    for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.round(mu + sd * rng.randn()));
  }
  return out;
}

/** Poisson(λ) sampler — inverse-transform for small λ, Normal-approx for large λ.
 *  Duplicates the helper in entropyTest.js rather than exporting, to keep commit focused. */
function samplePoisson(lambda, rng) {
  if (lambda <= 0) return 0;
  if (lambda >= 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * rng.randn()));
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng.random(); } while (p > L);
  return k - 1;
}

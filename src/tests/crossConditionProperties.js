/* ══════════════════════════════════════════════════════════════════════
   CROSS-CONDITION PROPERTY REGISTRY — Track D framework scaffolding
   @see docs/shared/TRACK-D-SPEC.md §"Framework scaffolding" and §"Stage 1"

   Each entry defines one property the framework compares across condition pairs:
     id             Stable ID (P1..P9)
     displayName    Human-readable label for evidence tables / card headline
     minN           Per-condition N floor for applicability
     epsilon        Threshold below which a statistic is "near-zero" for log-ratio
                    degenerate / fallback cascade (continuous: 1e-10; discrete: 0)
     needsReplicates  true if the statistic requires ≥2 values per row per
                    condition (Stages 2–3 residual properties; Stage 1 false)
     isCDF          true if statistic returns the sorted array itself (KS)
     kind           "pool" (Stage 1 P1/P2/P3), "residual" (Stage 2 P4/P5/P6),
                    or "mvslope" (Stage 3 P9). Drives what input bundle the
                    driver feeds `statistic`:
                      - "pool":     sorted Float64Array of pooled values.
                      - "residual": a residual bundle from the shared helper
                                    { pool, poolLen, dfTotal, perRep,
                                      perRepLens, nReps, nRow } built from
                                    row-centered replicate residuals per spec
                                    §1.9 "Shared residual computation".
                      - "mvslope":  a mean-variance bundle
                                    { logMeans, logVars, len, logMeanSpan }
                                    built from per-tuple (mean, variance)
                                    pairs on ORIGINAL (pre-VST) values, for
                                    rows with n_rep ≥ 3 AND mean > 0 AND
                                    Var > 0 (row-level degenerate excluded
                                    BEFORE the applicability count).
     useOriginalValues  boolean (default false). When true, the driver routes
                    the original (pre-VST) matrix rather than the active
                    matrix. P9 sets this because VST is designed to flatten
                    the mean-variance slope — running P9 post-VST returns
                    β ≈ 0 for every condition by construction and destroys
                    the forensic signal. Analogous to digit-level tests per
                    §Data Types routing. Spec §1.9 Stage 3 "Not VST-aware".
     applicable(bundle) -> { applicable: boolean, reason?: string }
                    Optional per-property per-condition applicability
                    callback (Stage 3 framework extension per spec §1.9
                    Stage 3 "Framework extension — per-property
                    applicability"). Evaluated by the driver on each
                    condition's bundle BEFORE the distance call; if either
                    condition in a pair returns applicable=false, the
                    (property × pair) unit is N/A with the returned reason.
                    Stages 1/2 use the shared pooled-cell / residual gates
                    in the driver and do not define this callback. P9 uses
                    it for the "N_rows ≥ 50 AND row-mean span ≥ 1 OOM"
                    floor. P7/P8 will plug in identically.
     statistic(input) -> stat
                    For kind="pool": `input` is a pre-sorted ascending
                    Float64Array. Returns a scalar for log-ratio properties;
                    returns the sorted array itself for CDF/KS.
                    For kind="residual": `input` is the residual bundle.
                    Returns a scalar (NaN for condition-level degenerate).
                    For kind="mvslope": `input` is the mv-slope bundle.
                    Returns a scalar OLS slope (NaN for singular fit, i.e.
                    fewer than 2 distinct row-mean bins).
     distance(sA, sB) -> { d, degenerate?, reason?, fallback? }
                    Pairwise distance. Uses the spec §"Degenerate statistic
                    handling" cascade for log-ratio properties. KS is always
                    well-defined for non-empty samples — no degenerate case.
                    NaN statistics (Stage 2 condition-level degenerate)
                    short-circuit to { d: 0, degenerate: true }.
     effectSizeGate({ dObs, permMedian, direction }) -> boolean
                    Direction-aware effect-size gate, applied only when
                    min(N_a, N_b) ≥ 500 per spec §"Effect-size gates"
                    (below that floor the driver skips the call and the gate
                    always passes). Semantics per direction:
                      - direction = "different": large d_obs is the forensic
                        signal, gate passes when d_obs clears an absolute
                        threshold (`d_obs ≥ differentThreshold`).
                      - direction = "similar": small d_obs is the forensic
                        signal, gate passes when d_obs is anomalously small
                        *relative to the permutation null*
                        (`d_obs / median(d_perm) ≤ similarRatio`). A pure
                        absolute threshold on d_obs is inverted for this
                        direction — the gate would demote exactly the units
                        the test is designed to catch (S99 fix for the
                        direction-blind gate defect, see
                        docs/shared/TRACK-D-SPEC.md §"Parked issues" item 1).
                        Ratio formulation is scale-invariant: it asks how
                        many times smaller than expected the observed
                        distance is, without depending on the statistic's
                        absolute scale.
                    `permMedian` is the median of the permutation
                    distribution for this (property × pair) unit. Guarded
                    degeneracy: if permMedian ≤ 0 (null pile-up at zero),
                    the ratio is undefined and the gate passes only for
                    d_obs = 0 exactly (treated as matching-null-zero, not
                    as evidence). Not expected to fire in normal operation
                    on continuous data.
     forensicDirections string[]
                    Subset of ["similar", "different"] — which directions
                    of deviation from the permutation null are forensically
                    actionable for this property. The two-sided permutation
                    p-value and BH-FDR still run over all (property × pair)
                    units regardless of direction; but only units whose
                    observed direction is in this set contribute to the test
                    flag, amber highlighting, headline, and "N additional"
                    counts. Location/scale/CDF shifts between conditions are
                    expected biology in honest experiments — only
                    forensically anomalous *similarity* between conditions is
                    actionable for Stage 1 properties. Two-sided statistical
                    machinery + one-sided forensic interpretation: this keeps
                    the Type I rate calibrated under the null while matching
                    the tool's forensic posture that "conditions differ" is
                    not a fabrication signal on these properties. See
                    docs/shared/TRACK-D-SPEC.md §"Flag rule" (S97 Part B
                    revision) and §"Known limitations".

   Stage 1 — P1 Trimmed span, P2 Dispersion (MAD), P3 CDF/KS.
                all forensic-direction = ["similar"] only. kind="pool".
   Stage 2 — P4 Residual SD, P5 Residual lag-1 AC (Fisher-z averaged across
                replicates), P6 Residual excess kurtosis. All kind="residual"
                and forensic-direction = ["similar", "different"] — both
                tails are forensically meaningful because residual structure
                is assay-intrinsic (not a condition property) in honest data.
   Stage 3 — P9 Mean-variance slope (v1.0). kind="mvslope",
                useOriginalValues=true, per-property applicable callback.
                forensic-direction = ["similar", "different"] — β is an
                assay-intrinsic structural invariant preserved across
                conditions in honest data. P7 (first-digit) and P8 (entropy)
                deferred to v1.1+ pending calibration fixtures.
══════════════════════════════════════════════════════════════════════ */

/** Linear-interpolated quantile on a pre-sorted ascending array. */
function quantileOfSorted(sorted, q) {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const pos = q * (n - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Median of a pre-sorted ascending array. */
function medianOfSorted(sorted) {
  const n = sorted.length;
  if (n === 0) return NaN;
  return n % 2 ? sorted[(n - 1) / 2] : 0.5 * (sorted[n / 2 - 1] + sorted[n / 2]);
}

/** Log-ratio distance with the degenerate / fallback cascade from spec
 *  §"Degenerate statistic handling". */
function logRatioDistance(sA, sB, epsilon) {
  const absA = Math.abs(sA), absB = Math.abs(sB);
  if (Math.max(absA, absB) < epsilon) {
    return { d: 0, degenerate: true, reason: "both conditions near-constant" };
  }
  if (Math.min(absA, absB) < epsilon) {
    return { d: Math.abs(sA - sB), fallback: true };
  }
  return { d: Math.abs(Math.log(absA) - Math.log(absB)) };
}

/** Two-sample KS: sup_x |F_a(x) − F_b(x)|. Both inputs pre-sorted ascending. */
function ksDistance(sortedA, sortedB) {
  const nA = sortedA.length, nB = sortedB.length;
  if (nA === 0 || nB === 0) return { d: 0 };
  let i = 0, j = 0, maxDiff = 0;
  while (i < nA || j < nB) {
    let x;
    if (i >= nA) x = sortedB[j];
    else if (j >= nB) x = sortedA[i];
    else x = sortedA[i] <= sortedB[j] ? sortedA[i] : sortedB[j];
    // Advance past all values equal to x (tie-correct)
    while (i < nA && sortedA[i] === x) i++;
    while (j < nB && sortedB[j] === x) j++;
    const diff = Math.abs(i / nA - j / nB);
    if (diff > maxDiff) maxDiff = diff;
  }
  return { d: maxDiff };
}

/** Lag-1 Pearson correlation of a row-ordered series. Returns NaN if series is
 *  too short or has zero variance on either side of the shift (degenerate). */
function lag1Pearson(series, n) {
  const n1 = n - 1;
  if (n1 < 2) return NaN;
  let mx = 0, my = 0;
  for (let i = 0; i < n1; i++) { mx += series[i]; my += series[i + 1]; }
  mx /= n1; my /= n1;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n1; i++) {
    const dx = series[i] - mx;
    const dy = series[i + 1] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  const denom = Math.sqrt(sxx * syy);
  if (!(denom > 1e-20)) return NaN;
  let r = sxy / denom;
  if (r > 0.999999) r = 0.999999;
  if (r < -0.999999) r = -0.999999;
  return r;
}

/** Fisher-z gap distance |atanh(r_a) − atanh(r_b)|. Degenerate when either
 *  statistic is NaN (condition-level degenerate). */
function fisherZGapDistance(rA, rB) {
  if (!isFinite(rA) || !isFinite(rB)) {
    return { d: 0, degenerate: true, reason: "condition-level degenerate (no usable replicate for lag-1)" };
  }
  const zA = Math.atanh(rA);
  const zB = Math.atanh(rB);
  return { d: Math.abs(zA - zB) };
}

/** Absolute-gap distance. Degenerate when either statistic is NaN. */
function absGapDistance(sA, sB, reason = "condition-level degenerate") {
  if (!isFinite(sA) || !isFinite(sB)) {
    return { d: 0, degenerate: true, reason };
  }
  return { d: Math.abs(sA - sB) };
}

/** Direction-aware gate builder. `differentThreshold` is the absolute
 *  `d_obs ≥ t` floor for direction="different"; `similarRatio` is the
 *  relative `d_obs / permMedian ≤ R` ceiling for direction="similar".
 *  The driver only calls this when min(N_a, N_b) ≥ 500 — below that floor
 *  the gate always passes. */
function makeGate(differentThreshold, similarRatio) {
  return function effectSizeGate({ dObs, permMedian, direction }) {
    if (direction === "similar") {
      if (!(permMedian > 0)) return dObs === 0;
      return (dObs / permMedian) <= similarRatio;
    }
    // direction = "different"
    return dObs >= differentThreshold;
  };
}

/** P5 structural metrics (K, N_row) extracted from a residual bundle.
 *  K counts replicate positions with perRepLens ≥ 3 AND finite lag-1 Pearson —
 *  the same definition as P5's statistic(). N_row is the min perRepLens across
 *  contributing replicates (conservative, matches the rep whose Fisher-z
 *  estimate has the largest SE and therefore drives the combined floor). */
function p5StructuralMetrics(bundle) {
  if (!bundle) return { K: 0, nRow: 0 };
  const perRep = bundle.perRep;
  const perRepLens = bundle.perRepLens;
  const nReps = bundle.nReps;
  let K = 0;
  let minRowLen = Infinity;
  for (let rep = 0; rep < nReps; rep++) {
    const n = perRepLens[rep];
    if (n < 3) continue;
    const r = lag1Pearson(perRep[rep], n);
    if (!isFinite(r)) continue;
    K++;
    if (n < minRowLen) minRowLen = n;
  }
  return { K, nRow: K > 0 ? minRowLen : 0 };
}

/** P5 different-direction structural resolvability floor.
 *  H₀ SE of |Δz| under Fisher-z-with-replicate-averaging theory:
 *    SE(z_rep) ≈ 1/√(N_row − 3)                  (Fisher approx)
 *    SE(z̄_c)  ≈ 1/√(n_rep × (N_row − 3))         (rep averaging)
 *    SE(|Δz|) ≈ √2 / √(n_rep_min × (N_row_min − 3))   (cross-condition gap)
 *  See METHODOLOGY.md §1.9 P5 paragraph for full derivation. */
function p5ResolvabilityFloor(bundleA, bundleB) {
  const mA = p5StructuralMetrics(bundleA);
  const mB = p5StructuralMetrics(bundleB);
  const nRepMin = Math.min(mA.K, mB.K);
  const nRowMin = Math.min(mA.nRow, mB.nRow);
  if (nRepMin < 1 || nRowMin < 4) return NaN;
  return Math.SQRT2 / Math.sqrt(nRepMin * (nRowMin - 3));
}

export const CROSS_COND_PROPERTIES = [
  {
    id: "P1",
    displayName: "Trimmed span (5–95%)",
    minN: 30,
    epsilon: 1e-10,
    kind: "pool",
    forensicDirections: ["similar"], // location/scale — "different" is legitimate biology
    statistic(sorted) {
      if (!sorted || sorted.length < 2) return 0;
      return quantileOfSorted(sorted, 0.95) - quantileOfSorted(sorted, 0.05);
    },
    distance(sA, sB) { return logRatioDistance(sA, sB, 1e-10); },
    // "different": log-ratio ≥ 0.1 ≈ 10% span difference.
    // "similar":   d_obs ≤ 0.5 × null median — observed span-log-ratio is
    //               at most half what random label re-assignment produces.
    effectSizeGate: makeGate(0.1, 0.5),
  },
  {
    id: "P2",
    displayName: "Dispersion (MAD)",
    minN: 30,
    epsilon: 1e-10,
    kind: "pool",
    forensicDirections: ["similar"], // location/scale — "different" is legitimate biology
    statistic(sorted) {
      const n = sorted.length;
      if (n < 2) return 0;
      const med = medianOfSorted(sorted);
      // |x − median| for each x; sort; median is unscaled MAD.
      const absDev = new Float64Array(n);
      for (let k = 0; k < n; k++) absDev[k] = Math.abs(sorted[k] - med);
      absDev.sort();
      return medianOfSorted(absDev);
    },
    distance(sA, sB) { return logRatioDistance(sA, sB, 1e-10); },
    // "different": log-ratio ≥ 0.2 (MAD less efficient than span).
    // "similar":   d_obs ≤ 0.5 × null median.
    effectSizeGate: makeGate(0.2, 0.5),
  },
  {
    id: "P3",
    displayName: "CDF shape (KS)",
    minN: 30,
    kind: "pool",
    isCDF: true,
    forensicDirections: ["similar"], // location-inclusive KS — "different" is legitimate biology
    statistic(sorted) { return sorted; },
    distance(sA, sB) { return ksDistance(sA, sB); },
    // "different": KS D ≥ 0.1 at large N.
    // "similar":   d_obs ≤ 0.5 × null median. DS19 P3 observed ratio is
    //              0.008 / 0.047 = 0.177, well below 0.5 → passes.
    effectSizeGate: makeGate(0.1, 0.5),
  },

  // ── Stage 2 — Residual-structure properties ────────────────────────
  // Row-centered replicate residuals, computed per row per condition before
  // pooling. See §1.9 "Shared residual computation". All three properties:
  //   - kind = "residual" (driver feeds residual bundle rather than sorted pool)
  //   - forensicDirections = ["similar", "different"] (residual structure is
  //     assay-intrinsic; both tails forensic per §1.9 Stage 2 lead-in)
  //   - similar-direction gate: ratio T = 0.5 (shared Stage 1 constant)
  //   - different-direction gate: per-property d_min per §1.9 derivation
  //     (≈ 1.4 × combined cross-condition SE at minimum N)
  //   - minN per condition: 30 / 50 / 100 (pooled cell count; matches Stage 1
  //     N convention — the SE-derived row-count floors of the spec are at or
  //     below these for n_rep ≥ 2)

  {
    id: "P4",
    displayName: "Residual SD",
    minN: 30,
    epsilon: 1e-10,
    kind: "residual",
    forensicDirections: ["similar", "different"],
    // Unbiased residual SD: s_c = √( Σ r² / Σ_row (n_rep_row − 1) ).
    // Generalised denominator handles variable-width rows (nulls). NaN when
    // no residuals contributed (all rows had <2 cells — filtered upstream
    // by the residual-applicability check so in practice the branch is a
    // guard for empty pools under permutation).
    statistic(resData) {
      if (!resData.dfTotal || resData.poolLen === 0) return NaN;
      const pool = resData.pool;
      let sumSq = 0;
      for (let i = 0; i < resData.poolLen; i++) sumSq += pool[i] * pool[i];
      return Math.sqrt(sumSq / resData.dfTotal);
    },
    distance(sA, sB) { return logRatioDistance(sA, sB, 1e-10); },
    // "different": log-ratio ≥ 0.5 (≈ 1.65× ratio). Anchored against
    //              biologically plausible post-VST cross-condition noise
    //              variation (< 0.26 typical).
    // "similar":   d_obs ≤ 0.5 × null median.
    effectSizeGate: makeGate(0.5, 0.5),
  },

  {
    id: "P5",
    displayName: "Residual lag-1 AC",
    minN: 50,
    kind: "residual",
    forensicDirections: ["similar", "different"],
    // r̄_c = tanh( (1/K_c) × Σ_rep atanh( r_lag1( R_c[:, rep] ) ) )
    // where K_c is the count of non-degenerate replicate positions.
    // Condition-level degenerate (returned as NaN) when no replicate position
    // has a non-degenerate lag-1 Pearson — e.g. all positions have < 2 values
    // or zero variance on one side of the shift.
    statistic(resData) {
      const perRep = resData.perRep;
      const perRepLens = resData.perRepLens;
      const nReps = resData.nReps;
      let sumZ = 0;
      let K = 0;
      for (let rep = 0; rep < nReps; rep++) {
        const n = perRepLens[rep];
        if (n < 3) continue; // need n-1 ≥ 2 pairs for a correlation
        const r = lag1Pearson(perRep[rep], n);
        if (!isFinite(r)) continue;
        sumZ += Math.atanh(r);
        K++;
      }
      if (K === 0) return NaN;
      return Math.tanh(sumZ / K);
    },
    // Fisher-z gap: |atanh(r̄_a) − atanh(r̄_b)|.
    distance(rA, rB) { return fisherZGapDistance(rA, rB); },
    // Per-pair structural resolvability floor (S113 close-out):
    //   different: |Δz| ≥ √2 / √(n_rep_min × (N_row_min − 3))
    //   similar:   d_obs ≤ 0.5 × null median (ratio form, unchanged)
    // Floor is the H₀ SE of |Δz| under Fisher-z-with-replicate-averaging theory
    // — the weakest meaningful different-direction claim that the statistic has
    // resolved the effect above its own sampling noise. Coefficient = 1, not
    // calibrated. See METHODOLOGY.md §1.9 P5 paragraph for full derivation and
    // retired 0.3 fixed-floor rationale.
    //
    // Driver passes observed residual bundles A and B; structural floor is
    // re-derived per pair. `gateAlwaysEvaluates: true` overrides the Stage 1
    // nMin<500 bypass — the structural floor auto-adjusts with N so no floor
    // of bypass is needed.
    gateAlwaysEvaluates: true,
    effectSizeGate({ dObs, permMedian, direction, bundleA, bundleB }) {
      if (direction === "similar") {
        if (!(permMedian > 0)) return dObs === 0;
        return (dObs / permMedian) <= 0.5;
      }
      // direction = "different" — structural resolvability floor
      const floor = p5ResolvabilityFloor(bundleA, bundleB);
      if (!isFinite(floor) || floor <= 0) return true; // pre-filtered by min-N=50
      return dObs >= floor;
    },
  },

  {
    id: "P6",
    displayName: "Residual kurtosis",
    minN: 100,
    kind: "residual",
    forensicDirections: ["similar", "different"],
    // Excess kurtosis on pooled residuals:
    //   σ_c² = (1/n) × Σ r²    (residuals are zero-mean per row; no centring term needed)
    //   κ_c  = (1/n) × Σ (r/σ_c)^4 − 3
    // Condition-level degenerate (NaN) when σ < 1e-10 (residuals collapse).
    statistic(resData) {
      const pool = resData.pool;
      const n = resData.poolLen;
      if (n === 0) return NaN;
      let sumSq = 0;
      for (let i = 0; i < n; i++) sumSq += pool[i] * pool[i];
      const sigmaSq = sumSq / n;
      if (!(sigmaSq > 1e-20)) return NaN;
      const sigma = Math.sqrt(sigmaSq);
      let sum4 = 0;
      for (let i = 0; i < n; i++) {
        const z = pool[i] / sigma;
        const z2 = z * z;
        sum4 += z2 * z2;
      }
      return sum4 / n - 3;
    },
    distance(sA, sB) { return absGapDistance(sA, sB); },
    // "different": |Δκ| ≥ 1.0 (≈ one distributional-family shape drift;
    //              Gaussian-to-Laplace region ≈ 3 units).
    // "similar":   d_obs ≤ 0.5 × null median.
    effectSizeGate: makeGate(1.0, 0.5),
  },

  // ── Stage 3 — Structural-invariant properties ──────────────────────
  // Pool-level statistics preserved across conditions independent of the
  // biological effect. v1.0 ships P9 only — P7 (first-digit) and P8 (entropy)
  // deferred pending purpose-built calibration fixtures. See §1.9 Stage 3.

  {
    id: "P9",
    displayName: "Mean-variance slope",
    kind: "mvslope",
    useOriginalValues: true, // VST flattens β by construction — use pre-VST
    forensicDirections: ["similar", "different"],
    // Per-property applicability (spec §1.9 Stage 3 "Framework extension").
    // N/A when fewer than 50 rows per condition have n_rep ≥ 3 valid cells
    // (post row-level degenerate exclusion for mean_i ≤ 0 or Var_i ≤ 0), or
    // when the within-condition log-row-mean span is less than 1 order of
    // magnitude. SE(β̂) ≤ 0.25 at N_rows = 48 under typical residual scatter
    // — the 50-row floor targets ≈ 1.47 × combined cross-condition SE at the
    // different-direction gate of |Δβ| ≥ 0.5 (Stage 2 calibration rule).
    applicable(bundle) {
      if (bundle.len < 50) {
        return { applicable: false, reason: "fewer than 50 rows with n_rep ≥ 3 per condition" };
      }
      if (!(bundle.logMeanSpan >= Math.LN10)) {
        return { applicable: false, reason: "row-mean span < 1 order of magnitude" };
      }
      return { applicable: true };
    },
    // OLS slope of logVar on logMean. Rows excluded from the bundle when
    // mean_i ≤ 0 or Var_i ≤ 0 (log undefined); bundle contains only
    // qualifying rows. NaN when fewer than 2 distinct row-mean bins
    // (singular fit — degenerate per spec §1.9 Stage 3).
    statistic(bundle) {
      const n = bundle.len;
      if (n < 2) return NaN;
      const xs = bundle.logMeans;
      const ys = bundle.logVars;
      let sumX = 0, sumY = 0;
      for (let i = 0; i < n; i++) { sumX += xs[i]; sumY += ys[i]; }
      const mx = sumX / n, my = sumY / n;
      let sxy = 0, sxx = 0;
      for (let i = 0; i < n; i++) {
        const dx = xs[i] - mx;
        sxy += dx * (ys[i] - my);
        sxx += dx * dx;
      }
      if (!(sxx > 1e-20)) return NaN; // singular — all contributing rows share one mean
      return sxy / sxx;
    },
    distance(sA, sB) { return absGapDistance(sA, sB, "condition-level degenerate (singular slope)"); },
    // "different": |Δβ| ≥ 0.5 (half an assay-type mismatch: qPCR≈0,
    //              plate-reader≈1, densitometry/RNA-seq≈2).
    // "similar":   d_obs ≤ 0.5 × null median.
    effectSizeGate: makeGate(0.5, 0.5),
  },
];

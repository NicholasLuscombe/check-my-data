/* Modality Test (Track E (b), §3.8)
   Tests whether each DATA column's empirical distribution is unimodal against a
   multimodal alternative. Uses Hartigan's dip statistic against a uniform-reference
   bootstrap null — the uniform is the unimodal ceiling, so observed-exceeds-uniform
   rules out any unimodal distribution.

   Distinct forensic target from §3.6 and §3.7: a column may pass Shannon (correct
   distinct-value count) and Column GoF (correct CDF shape-class) and still be bimodal,
   e.g. a condition fabricated as a mixture of two sources with different central
   tendencies.

   Procedure (METHODOLOGY.md §3.8, v1.0):
   1. Applicability: ≥50 obs, ≥15 distinct values (ordinal skipped upstream).
      Additional γ₂ pre-skip (S107): γ₂ < −1.2 skip (universal), γ₂ < −0.8 at
      N ≥ 100 skip. No γ₁ pre-skip — uniform-reference null is family-agnostic.
   2. Dip statistic: Hartigan's D_N via GCM/LCM construction.
   3. Uniform-reference bootstrap (B = 999): Uniform(min, max) draws, dip per draw.
   4. One-sided p: p = (1 + #{D_null ≥ D_obs}) / (1 + B).
   5. BH-FDR across applicable columns (separate family from Column GoF per SP4).
   6. Effect-size gate (Tier 2): raw D_obs ≥ 0.04 → MOD+ eligible.

   @param {number[][]} matrix
   @param {{ random, randn }} rng
   @param {string} dataType - 'continuous' | 'count' | 'ordinal'
   @returns {object}
   @see METHODOLOGY.md §3.8 Modality Test */

import { mean, variance, bhFDR } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

const NAME = "Modality Test";
const CAT  = "shapes";
const B    = 999;
const DIP_GATE = 0.04;            // effect-size gate per §3.8 step 6
// γ₁ > 1.5 pre-skip is NOT applied to Modality (S107 calibration decision):
// Modality's uniform-reference null is family-agnostic by design, so the skew
// pre-skip that protects §3.7's parametric fit is philosophically mismatched.
// The γ₂ hybrid below is retained to suppress meaningless adj-p ≈ 1 entries on
// near-uniform noise columns (load-bearing for qpcr-style bounded ranges).
const EXKURT_FLOOR = -1.2;
const EXKURT_GATE_HIGHN = -0.8;
const GAMMA_N_ADAPTIVE_THRESHOLD = 100;
const MIN_N = 50;
const MIN_DISTINCT = 15;

export function testModality(matrix, rng, dataType) {
  if (dataType === "ordinal") {
    return { name: NAME, category: CAT, flag: "N/A",
      description: "Not applicable to ordinal data — Hartigan dip is not meaningful on sparse discrete support." };
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

    if (vals.length < MIN_N) {
      columnResults.push({ col: ci, skip: true, reason: `< ${MIN_N} observations` });
      continue;
    }
    const distinct = new Set(vals).size;
    if (distinct < MIN_DISTINCT) {
      columnResults.push({ col: ci, skip: true, reason: `< ${MIN_DISTINCT} distinct values` });
      continue;
    }

    // γ₂ pre-skip only (S107 calibration). Continuous only; count data has its own
    // shape constraints. No γ₁ gate — uniform-reference null handles skewed shapes
    // conservatively by construction.
    let g1 = NaN, g2 = NaN;
    if (!isCount) {
      const mu = mean(vals);
      const { m2, m3, m4 } = centralMoments(vals, mu);
      g1 = m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
      g2 = m2 > 0 ? m4 / (m2 * m2) - 3 : 0;
      const kurtFailFloor = g2 < EXKURT_FLOOR;
      const kurtFailHighN = g2 < EXKURT_GATE_HIGHN && vals.length >= GAMMA_N_ADAPTIVE_THRESHOLD;
      if (kurtFailFloor || kurtFailHighN) {
        columnResults.push({ col: ci, skip: true,
          reason: `Pre-skip: γ₂=${g2.toFixed(2)} — near-uniform shape would dominate the uniform-reference null`,
          g1, g2 });
        continue;
      }
    }

    const sorted = vals.slice().sort((a, b) => a - b);
    const D_obs = hartiganDip(sorted);
    const xMin = sorted[0];
    const xMax = sorted[sorted.length - 1];

    // Uniform-reference bootstrap null.
    const D_null = new Float64Array(B);
    const span = xMax - xMin;
    for (let b = 0; b < B; b++) {
      const synth = new Array(vals.length);
      for (let i = 0; i < synth.length; i++) synth[i] = xMin + span * rng.random();
      synth.sort((a, b) => a - b);
      D_null[b] = hartiganDip(synth);
    }

    // One-sided p: only upper tail is forensic.
    let cHigh = 1;
    for (let b = 0; b < B; b++) if (D_null[b] >= D_obs) cHigh++;
    const rawP = cHigh / (1 + B);

    columnResults.push({
      col: ci, skip: false,
      n: vals.length, distinct, g1, g2,
      D_obs, rawP,
    });
  }

  const tested = columnResults.filter(c => !c.skip);
  const skipped = columnResults.filter(c => c.skip);

  if (tested.length === 0) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: `All columns routed to N/A (${skipped.length} columns; most common: ${skipped[0]?.reason || "n/a"}).`,
      skippedColumns: skipped.map(s => ({ col: s.col + 1, reason: s.reason })) };
  }

  const rawPs = tested.map(c => c.rawP);
  const adjPs = bhFDR(rawPs);
  for (let i = 0; i < tested.length; i++) tested[i].adjP = adjPs[i];

  for (const c of tested) {
    c.flag = c.D_obs >= DIP_GATE ? flagFromP(c.adjP) : "LOW";
  }

  const primaryP = Math.min(...adjPs);
  const flaggedCols = tested.filter(c => c.flag === "HIGH" || c.flag === "MODERATE");
  const flag = flaggedCols.length > 0 ? flagFromP(Math.min(...flaggedCols.map(c => c.adjP))) : "LOW";

  const details = tested
    .filter(c => c.flag !== "LOW")
    .sort((a, b) => a.adjP - b.adjP)
    .slice(0, 30)
    .map(c => ({
      Col: c.col + 1,
      Dip: c.D_obs.toFixed(4),
      adjP: c.adjP,
    }));

  const colDips = tested.map(c => ({
    col: c.col + 1, dip: c.D_obs,
    flagged: c.flag === "HIGH" || c.flag === "MODERATE",
  }));

  const fewColumns = tested.length < 5;

  return {
    name: NAME, category: CAT, flag, primaryP,
    description: "Hartigan's dip statistic tests each column for unimodality against a uniform-reference bootstrap null. " +
      "Uniform is the unimodal ceiling — observed dip exceeding the uniform ceiling rules out any unimodal distribution " +
      "and is a strong fingerprint of mixture fabrication (two sources combined into one declared condition).",
    nTested: tested.length,
    nSkipped: skipped.length,
    nFlagged: flaggedCols.length,
    fewColumnsNote: fewColumns ? "Fewer than 5 columns tested — BH-FDR correction may be conservative." : null,
    colDips,
    details,
    skippedColumns: skipped.map(s => ({ col: s.col + 1, reason: s.reason })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

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

/** Hartigan's dip statistic via mode-enumeration over data points.
 *  For each candidate mode index k, computes max(F − GCM) on the left prefix
 *  and max(LCM − F) on the right suffix; dip_k = max of the two maxima. The
 *  dip is (1/2) · min over k of dip_k. Reference: Hartigan & Hartigan (1985).
 *  @param {number[]} sorted - Values in ascending order.
 *  @returns {number} D_N ∈ [0, 1/4]. */
function hartiganDip(sorted) {
  const n = sorted.length;
  if (n < 4) return 0;

  // Precompute GCM-prefix max deviations and LCM-suffix max deviations.
  // leftMaxDev[k] = max over i ∈ [0, k] of (F_n(x_i) − gcm_{[0,k]}(x_i))
  // rightMaxDev[k] = max over i ∈ [k, n−1] of (lcm_{[k,n−1]}(x_i) − F_n(x_i))
  // We compute each in O(n²) via one hull construction per prefix/suffix.
  const leftMaxDev = new Float64Array(n);
  const rightMaxDev = new Float64Array(n);

  for (let k = 1; k < n; k++) {
    leftMaxDev[k] = maxDevAboveHull(sorted, 0, k, n, /* isGCM = */ true);
  }
  for (let k = n - 2; k >= 0; k--) {
    rightMaxDev[k] = maxDevAboveHull(sorted, k, n - 1, n, /* isGCM = */ false);
  }

  // Find min over k of max(leftMaxDev[k], rightMaxDev[k]).
  let minDip = Infinity;
  for (let k = 1; k < n - 1; k++) {
    const cand = Math.max(leftMaxDev[k], rightMaxDev[k]);
    if (cand < minDip) minDip = cand;
  }
  return Number.isFinite(minDip) ? minDip / 2 : 0;
}

/** Build a monotone hull (GCM or LCM) over the range [a, b] of sorted values and
 *  return the maximum vertical deviation between F_n and the hull.
 *  - isGCM = true: convex hull from below (slopes non-decreasing); returns max(F − hull).
 *  - isGCM = false: concave hull from above (slopes non-increasing); returns max(hull − F).
 *  F_n(x_i) = (i + 1) / n (right-continuous empirical CDF at the i-th sorted value). */
function maxDevAboveHull(x, a, b, n, isGCM) {
  if (b - a < 2) return 0;

  // Build hull indices via monotone stack.
  const hull = [a];
  for (let i = a + 1; i <= b; i++) {
    while (hull.length >= 2) {
      const p2 = hull[hull.length - 1];
      const p1 = hull[hull.length - 2];
      const dx12 = x[p2] - x[p1];
      const dx2i = x[i]  - x[p2];
      // Skip duplicate-x collapses.
      if (dx12 === 0) { hull.pop(); continue; }
      if (dx2i === 0) { break; }
      // Slope comparison via cross-multiplication (no division).
      // GCM: require slope(p1,p2) ≤ slope(p2,i) → remove p2 if slope(p1,p2) > slope(p2,i)
      //   i.e., (p2-p1) * dx2i > (i-p2) * dx12
      // LCM: require slope(p1,p2) ≥ slope(p2,i) → remove p2 if slope(p1,p2) < slope(p2,i)
      //   i.e., (p2-p1) * dx2i < (i-p2) * dx12
      const lhs = (p2 - p1) * dx2i;
      const rhs = (i  - p2) * dx12;
      const drop = isGCM ? lhs > rhs : lhs < rhs;
      if (drop) hull.pop();
      else break;
    }
    hull.push(i);
  }

  // Compute max deviation along each hull segment.
  let maxDev = 0;
  for (let s = 0; s < hull.length - 1; s++) {
    const p1 = hull[s], p2 = hull[s + 1];
    const x1 = x[p1], x2 = x[p2];
    const dx = x2 - x1;
    if (dx === 0) continue;
    const F1 = (p1 + 1) / n;
    const F2 = (p2 + 1) / n;
    const slope = (F2 - F1) / dx;
    for (let i = p1 + 1; i < p2; i++) {
      const line = F1 + (x[i] - x1) * slope;
      const Fi = (i + 1) / n;
      const dev = isGCM ? Fi - line : line - Fi;
      if (dev > maxDev) maxDev = dev;
    }
  }
  return maxDev;
}

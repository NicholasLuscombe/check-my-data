import { robustLogSpan, chiSquaredP } from "../stats/primitives.js";
import { ALPHA } from "../constants/thresholds.js";

/* 17. Second-Digit Benford
   Complements first-digit Benford's Law (test 12). Fabricators who know about
   Benford's Law may correct first digits but neglect second digits.
   Expected distribution: P(d₂ = k) = Σ_{d₁=1}^{9} log₁₀(1 + 1/(10d₁+k))
   Reference: Nigrini (2012). Hill (1995) on second-digit distributions. */
/**
 * Detects deviation from Benford's law in the second significant digit distribution.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @returns {{ name: string, category: string, flag: string, description: string, chiSquared: string, df: number, pChi: string, MAD: string, MADConformity: string, pMAD: string, primaryP: number, nSimulations: number, simN: number, nValues: number, details: Array<{ digit: number, observed: number, expected: string, benfordPct: string, observedPct: string }> }}
 * @see METHODOLOGY.md §"3.4 Benford's Second Digit"
 */
export function testBenford2(matrix, rng) {
  const allVals = matrix.flat().filter(v => v != null && isFinite(v) && v !== 0);
  const NAME = "Benford's Law (Second Digit)";
  const CAT = "digits";

  if (allVals.length < 100) return { name: NAME, category: CAT, flag: "N/A",
    description: "Insufficient data (need ≥100 non-zero values)." };

  const absVals = allVals.map(Math.abs).filter(v => v > 0);
  const actualSpan = robustLogSpan(absVals);
  if (actualSpan < 1.0) return { name: NAME, category: CAT, flag: "N/A",
    description: `Data spans only ${actualSpan.toFixed(1)} orders of magnitude — Benford's Law requires ≥1 for meaningful application.` };

  // Expected second-digit probabilities: P(d₂=k) = Σ_{d₁=1}^{9} log₁₀(1+1/(10d₁+k))
  const benf2 = [];
  for (let k = 0; k <= 9; k++) {
    let p = 0;
    for (let d1 = 1; d1 <= 9; d1++) p += Math.log10(1 + 1 / (10 * d1 + k));
    benf2.push(p);
  }

  // Extract second significant digits.
  // S159c — numeric path replaces the prior `toExponential(10) + split + replace`
  // chain. For an arbitrary positive value v, scale to scientific-notation
  // mantissa m ∈ [1, 10) via m = v / 10^floor(log10(v)), then take
  // d2 = floor((m − floor(m)) × 10). Matches the simulated-path extraction
  // below so the null and observed counts are computed under the same
  // algorithm (the calibration concern was inter-path divergence; both paths
  // truncate identically now).
  const counts = new Array(10).fill(0);
  let total = 0;
  for (const v of allVals) {
    const a = Math.abs(v);
    if (a <= 0) continue;
    const exp = Math.floor(Math.log10(a));
    const m = a / Math.pow(10, exp); // m ∈ [1, 10)
    const d1 = Math.floor(m);
    const d2 = Math.floor((m - d1) * 10);
    if (d2 >= 0 && d2 <= 9) {
      counts[d2]++;
      total++;
    }
  }
  if (total < 50) return { name: NAME, category: CAT, flag: "N/A",
    description: "Insufficient valid second digits." };

  // χ² goodness-of-fit
  let chi = 0;
  const det = counts.map((c, i) => {
    const e = benf2[i] * total;
    chi += (c - e) ** 2 / e;
    return {
      digit: i, observed: c, expected: e.toFixed(1),
      benfordPct: (benf2[i] * 100).toFixed(1) + "%",
      observedPct: ((c / total) * 100).toFixed(1) + "%"
    };
  });

  // MAD (mean absolute deviation from expected proportions)
  let mad = 0;
  for (let i = 0; i <= 9; i++) mad += Math.abs(counts[i] / total - benf2[i]);
  mad /= 10;

  const pChi = chiSquaredP(chi, 9); // df=9 for 10 categories

  // Simulation-based MAD p-value (same approach as first-digit)
  // Generate second digits from the exact Benford second-digit distribution
  // Method: generate values as 10^U where U~Uniform(0,1), extract second digit
  const N_SIM = 5000;
  const simN = Math.min(total, 10000);
  let madExceedCount = 0;

  // S159c — numeric digit extraction replaces the prior string chain
  // (`val.toExponential(10) + split("e") + replace(".", "")`). Inner-loop
  // generator `Math.pow(10, rng.random())` always returns a value in [1, 10),
  // so the second significant digit is `floor((val − floor(val)) × 10)`
  // directly — no normalisation needed. Eliminates ~5 small string/Array
  // allocations + 4 expensive string operations per inner iter (~190 ns →
  // ~15 ns/iter). PRNG call count and sequence are preserved verbatim.
  // simCounts hoisted to a pre-allocated Uint16Array(10) reset via .fill(0)
  // per outer iter.
  const simCounts = new Uint16Array(10);
  for (let s = 0; s < N_SIM; s++) {
    simCounts.fill(0);
    for (let j = 0; j < simN; j++) {
      const val = Math.pow(10, rng.random());
      const d1 = Math.floor(val);
      const d = Math.floor((val - d1) * 10);
      if (d >= 0 && d <= 9) simCounts[d]++;
    }
    let simMad = 0;
    for (let i = 0; i <= 9; i++) simMad += Math.abs(simCounts[i] / simN - benf2[i]);
    simMad /= 10;
    if (simMad >= mad) madExceedCount++;
  }
  const pMAD = madExceedCount / N_SIM;

  // MAD conformity labels (Nigrini 2012: second-digit thresholds are less strict)
  let madLabel;
  if (mad > 0.008) madLabel = "Nonconforming";
  else if (mad > 0.006) madLabel = "Marginal";
  else madLabel = mad > 0.004 ? "Acceptable" : "Close conformity";

  // Flag: require MAD ≥ 0.008 (Nigrini's second-digit nonconformity threshold)
  let flag;
  if (mad < 0.008) flag = "LOW"; // Below forensic threshold
  else if (pMAD < ALPHA.FLAG) flag = "HIGH";
  else if (pMAD < ALPHA.NOTE) flag = "MODERATE";
  else flag = "LOW";

  return {
    name: NAME, category: CAT,
    description: "Tests whether second significant digits follow the Benford second-digit distribution: P(d₂=k) = Σlog₁₀(1+1/(10d₁+k)). Second digits provide an independent check even when first digits appear normal. MAD conformity per Nigrini (2012). Simulation p-value from 5000 draws.",
    chiSquared: chi.toFixed(3), df: 9, pChi: pChi.toFixed(4),
    MAD: mad.toFixed(4), MADConformity: madLabel,
    pMAD: pMAD.toFixed(4), primaryP: pMAD,
    nSimulations: N_SIM, simN, nValues: total,
    flag, details: det
  };
}

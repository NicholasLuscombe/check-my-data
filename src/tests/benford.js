import { robustLogSpan, chiSquaredP } from "../stats/primitives.js";
import { ALPHA } from "../constants/thresholds.js";

/* 9. Benford's Law */
/**
 * Detects deviation from Benford's law in the first significant digit distribution.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @param {{ random: () => number }} rng - PRNG instance from createPRNG().
 * @returns {{ name: string, category: string, flag: string, description: string, chiSquared: string, df: number, pChi: string, MAD: string, MADConformity: string, pMAD: string, primaryP: number, nSimulations: number, simN: number, nValues: number, details: Array<{ digit: number, observed: number, expected: string, benfordPct: string, observedPct: string }> }}
 * @see METHODOLOGY.md §"3.2 Benford's First Digit Test"
 */
export function testBenford(matrix, rng) {
  const allVals=matrix.flat().filter(v=>v!=null&&isFinite(v)&&v!==0);
  if(allVals.length<100) return {name:"Benford's Law (First Digit)",category:"digits",flag:"N/A",description:"Insufficient data (need ≥100 non-zero values)."};
  // S109 Part 2 applicability tighten (METHODOLOGY §3.2):
  // (i) Positivity-fraction pretest. Benford's Law requires a positive-scale,
  //     scale-invariant multiplicative process. Centered-symmetric distributions
  //     (e.g. N(0, 1)) pass the span check because |values| spans ~3 OOM but are
  //     not positive-scale. Require ≥80% of non-zero values to be positive.
  // (ii) OOM span tightened 1.0 → 1.5 to match spec.
  const positivityFrac = allVals.filter(v => v > 0).length / allVals.length;
  if (positivityFrac < 0.80) return {name:"Benford's Law (First Digit)",category:"digits",flag:"N/A",description:`Not positive-scale data (${(positivityFrac*100).toFixed(0)}% positive) — Benford's Law assumes a positive-scale multiplicative process.`};
  const absVals=allVals.map(Math.abs).filter(v=>v>0);
  const actualSpan=robustLogSpan(absVals);
  if(actualSpan<1.5) return {name:"Benford's Law (First Digit)",category:"digits",flag:"N/A",description:`OOM span ${actualSpan.toFixed(1)} < 1.5 — Benford's Law requires ≥1.5 orders of magnitude for meaningful application.`};
  const benf=[]; for(let d=1;d<=9;d++) benf.push(Math.log10(1+1/d));
  const counts=new Array(9).fill(0); let total=0;
  for(const v of allVals){const s=Math.abs(v).toExponential();const ld=parseInt(s[0]);if(ld>=1&&ld<=9){counts[ld-1]++;total++;}}
  if(total<50) return {name:"Benford's Law (First Digit)",category:"digits",flag:"N/A",description:"Insufficient valid leading digits."};
  let chi=0;
  const det=counts.map((c,i)=>{const e=benf[i]*total;chi+=(c-e)**2/e;
    return{digit:i+1,observed:c,expected:e.toFixed(1),benfordPct:(benf[i]*100).toFixed(1)+"%",observedPct:((c/total)*100).toFixed(1)+"%"};});
  let mad=0; for(let i=0;i<9;i++) mad+=Math.abs(counts[i]/total-benf[i]); mad/=9;
  const p=chiSquaredP(chi,8);

  // Nigrini's MAD labels retained for reference, but flagging uses simulation-based p-value.
  let madLabel;
  if(mad>0.015) madLabel="Nonconforming";
  else if(mad>0.012) madLabel="Marginal";
  else madLabel=mad>0.006?"Acceptable":"Close conformity";

  // Simulation-based MAD null: Nigrini's thresholds (0.006/0.012/0.015) were calibrated for
  // audit datasets with n >> 1000. At n=195, sampling noise easily pushes MAD above 0.015
  // even for genuinely conforming data. Instead: simulate drawing `total` leading digits from
  // the exact Benford distribution, compute MAD for each draw, get a proper p-value.
  // 10^U where U~Uniform(0,1) has leading digit distributed exactly per Benford's law.
  // PERFORMANCE: At N > 10000, chi-squared is an excellent approximation and the simulation
  // (5000 × N draws) becomes prohibitively expensive. Use chi-squared p-value directly.
  let pMAD;
  const N_SIM_BENFORD = 5000;
  // Subsample simulation: at any N, simulate drawing from the exact
  // Benford distribution and compute MAD. For N > 10K, cap simulation draws at 10K
  // to keep compute feasible — this gives a valid p-value calibrated to N=10K,
  // which is conservative (real N is larger → real MAD SE is smaller → real p is
  // even lower than our estimate if the data deviates). No Nigrini threshold mapping.
  const simN = Math.min(total, 10000);
  let madExceedCount = 0;
  for(let s=0; s<N_SIM_BENFORD; s++){
    const simCounts = new Array(9).fill(0);
    for(let j=0; j<simN; j++){
      const d = Math.floor(Math.pow(10, rng.random()));
      if(d>=1 && d<=9) simCounts[d-1]++;
    }
    let simMad=0;
    for(let i=0;i<9;i++) simMad+=Math.abs(simCounts[i]/simN-benf[i]);
    simMad/=9;
    if(simMad>=mad) madExceedCount++;
  }
  pMAD = madExceedCount / N_SIM_BENFORD;

  // Flag: simulation p-value with Nigrini MAD Nonconformity gate .
  // At large N, the simulation correctly detects MAD values (e.g. 0.009) that would
  // be acceptable per Nigrini (2012) Table 7.1 — the p-value tests whether the data
  // deviates more than chance, but "Acceptable Conformity" (MAD < 0.012) is not
  // forensically concerning. Require MAD ≥ 0.015 ("Nonconformity" per Nigrini 2012)
  // for the flag to activate. This is the published forensic standard for Benford's
  // analysis, not an arbitrary threshold.
  // Reference: Nigrini (2012), Benford's Law: Applications for Forensic Accounting,
  // Auditing, and Fraud Detection, Table 7.1 p.160.
  // Also: Druicǎ, Oancea & Vâlsan (2018) document the "excess power problem" where
  // naturally generated data fails Benford's chi-squared at large N.
  let flag;
  if(mad<0.015) flag="LOW";  // Nigrini: Close/Acceptable/Marginal conformity → not suspicious
  else if(pMAD<ALPHA.FLAG) flag="HIGH";
  else if(pMAD<ALPHA.NOTE) flag="MODERATE";
  else flag="LOW";
  return { name:"Benford's Law (First Digit)", category:"digits",
    description:"Tests whether leading digits follow log₁₀(1+1/d). Multi-order-of-magnitude data naturally conforms; manually constructed data often does not. MAD conformity labels per Nigrini (2012). Flagging uses simulation-calibrated p-value: 5000 draws from the exact Benford distribution at sample size min(N, 10K), producing a valid p-value at any N without arbitrary thresholds.",
    chiSquared:chi.toFixed(3), df:8, pChi:p.toFixed(4), MAD:mad.toFixed(4), MADConformity:madLabel,
    pMAD:pMAD.toFixed(4), primaryP:pMAD, nSimulations:N_SIM_BENFORD, simN, nValues:total,
    flag, details:det };
}

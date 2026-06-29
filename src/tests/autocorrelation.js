import { mean, acfAtLag, zToP, bhFDR, oneSampleT, stddev, normalQuantile, tQuantileTwoSided } from "../stats/primitives.js";
import { flagFromP, flagRankOf, ALPHA, EFFECT_SIZE } from "../constants/thresholds.js";

/* 5. Autocorrelation */
const MAX_LAG = 10;
const HIGHER_LAGS = [2, 3, 4, 5]; // sub-unit evidence; lag 1 remains primary
const PAIR_CORROB_ALPHA = 0.05;   // per-pair adj-p threshold for (iii) corroboration
const PAIR_CORROB_MIN = 2;        // minimum pairs passing (iii) to allow promotion

/**
 * Detects serial correlation in inter-replicate differences, indicating sequential row construction.
 * Lag-1 drives the primary flag and statistic (unchanged). Lags 2–5 provide sub-unit evidence
 * via pooled t-tests and BH-FDR across the 5 pooled p-values, with MODERATE-capped promotion
 * per the S95 Track A unified sub-unit rule. Sub-unit promotion additionally requires distributed
 * per-pair evidence (S96 Track E follow-up) to block pooled-t pair-lottery artifacts.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns, minimum 2 columns and 10 rows).
 * @returns {{ name: string, category: string, flag: string, primaryP: number, nSignificant: number, nPairs: number, pooledMeanR1: string, pooledT: string, pooledP: string, decayCurve: number[]|null, lagTable: object[], higherLagPromoted: boolean, details: object[] }} Result with lag-1 autocorrelation per pair, pooled one-sample t-test, BH-FDR pair-level promotion, decay curve, per-lag pooled summary (lags 1–5) with per-pair corroboration counts, and a triggered-lag marker for display highlighting.
 * @see METHODOLOGY.md §"2.1 Autocorrelation of Differences"
 */
export function testAutocorrelation(matrix) {
  const nR=matrix.length, nC=matrix[0]?.length||0;
  if(nC<2||nR<10) return {name:"Autocorrelation",category:"replicate",flag:"N/A",description:"Insufficient data (≥2 cols, ≥10 rows)."};
  const res=[];
  const lagAcc=new Array(MAX_LAG).fill(0);
  let lagN=0;
  const allR1=[];  // pool lag-1 values across all pairs for pooled t-test
  // Parallel pools for lags 2..5 — same pooling strategy as lag-1.
  const allRk = { 2:[], 3:[], 4:[], 5:[] };
  const pairN = []; // per-pair effective sample size, parallel to res
  for(let c1=0;c1<nC;c1++) for(let c2=c1+1;c2<nC;c2++){
    const diffs=[];
    for(let r=0;r<nR;r++){if(matrix[r][c1]!=null&&matrix[r][c2]!=null)diffs.push(matrix[r][c1]-matrix[r][c2]);}
    if(diffs.length<10) continue;
    const m=mean(diffs);
    const den=diffs.reduce((s,d)=>s+(d-m)**2,0);
    const lagVals=[];
    for(let lag=1;lag<=MAX_LAG;lag++) lagVals.push(acfAtLag(diffs,m,den,lag));
    lagVals.forEach((v,i)=>{ lagAcc[i]+=v; });
    lagN++;
    const r1=lagVals[0], se=1/Math.sqrt(diffs.length), z=r1/se, p=zToP(z);
    allR1.push(r1);
    for (const k of HIGHER_LAGS) allRk[k].push(lagVals[k-1]);
    pairN.push(diffs.length);
    res.push({pair:`${c1+1}–${c2+1}`,lag1:r1.toFixed(4),z:z.toFixed(3),p:p.toFixed(4),rawP:p});
  }
  // BH-FDR over pairs
  const acfAdjPs=bhFDR(res.map(r=>r.rawP));
  res.forEach((r,i)=>{r.significant=acfAdjPs[i]<0.01;r.adjP=acfAdjPs[i];});
  const nSig=res.filter(r=>r.significant).length;
  const decayCurve = lagN>0 ? lagAcc.map(v=>v/lagN) : null;

  // Pooled test: one-sample t on all lag-1 values (H0: mean r1 = 0).
  // More powerful than proportion heuristic, especially for small nC.
  const pooled=allR1.length>=2?oneSampleT(allR1):{t:0,df:0,p:1};
  const pooledMeanR1=allR1.length?mean(allR1):0;
  // S253 (parked #9c): band that pictures the verdict. The critical value
  // mirrors the oneSampleT(allR1) verdict's per-branch convention — the normal
  // quantile at df>30 (where the verdict's p uses zToP), the exact inverse-t
  // otherwise (ALPHA.NOTE edge against the same pooledMeanR1, pooledR1SE and
  // df the verdict reads). Display only — no flag logic reads this. Empty
  // array when n<2 (no interval defined).
  const pooledR1SD = allR1.length >= 2 ? stddev(allR1) : 0;
  const pooledR1SE = allR1.length >= 2 ? pooledR1SD / Math.sqrt(allR1.length) : 0;
  const r1Crit = pooled.df > 30
    ? normalQuantile(1 - ALPHA.NOTE / 2)
    : tQuantileTwoSided(ALPHA.NOTE, pooled.df);
  const pooledR1CI = allR1.length >= 2
    ? [pooledMeanR1 - r1Crit * pooledR1SE, pooledMeanR1 + r1Crit * pooledR1SE]
    : null;
  // Flag: pooled t-test p-value with effect-size gate at large N .
  // At N > 500, genomic autocorrelation (co-regulated neighboring genes) produces
  // r₁ ≈ 0.10–0.15 with extreme significance. Require |mean r₁| ≥ 0.25 for
  // forensic relevance — fabrication produces 0.44–0.81 (DS08=0.55),
  // while genomic/biological background is 0.03–0.15.
  // Reference: Simonsohn (2013) identifies autocorrelation as a fabrication signal.
  const absR1 = Math.abs(pooledMeanR1);
  const effectSizeClass = absR1 >= EFFECT_SIZE.AUTOCORR_STRONG ? "strong"
    : absR1 >= EFFECT_SIZE.AUTOCORR_MODERATE ? "moderate" : "weak";
  const esGate = nR>=500 && absR1<EFFECT_SIZE.AUTOCORR_STRONG;
  const pooledFlag=esGate?"LOW":flagFromP(pooled.p);
  // Pair-level promotion: if any individual pair survives BH-FDR at ALPHA.FLAG,
  // promote to at least MODERATE. One strong outlier pair shouldn't be diluted
  // by many weak pairs in the pooled test.
  const anyPairFlagged = acfAdjPs.some(p => p < ALPHA.FLAG);
  const pairPromotedFlag = anyPairFlagged ? "MODERATE" : "LOW";
  let flag = flagRankOf(pairPromotedFlag) > flagRankOf(pooledFlag) ? pairPromotedFlag : pooledFlag;
  // Capture flag BEFORE the higher-lag conditional bump so consumers can tell
  // when higher-lag evidence was the decisive promoter vs corroborative noise
  // alongside an already-flagged lag-1. S166 A2: the legacy `higherLagPromoted`
  // boolean is set independent of whether the bump actually moved the flag;
  // the footer copy that reads it falsely claims promotion on HIGH cards.
  const flagBeforeHigherLag = flag;

  // ── Higher-lag sub-unit evidence (lags 2–5) ────────────────────────
  // Pooled one-sample t per lag; BH-FDR across the 5 pooled p-values.
  // Sub-unit promotion (MODERATE-capped, never demotes) fires on a lag k
  // iff ALL three conditions hold FOR THAT LAG:
  //   (i)   lagAdjPs[k] < ALPHA.FLAG  (pooled evidence)
  //   (ii)  effect-size gate: nR < 500 OR |mean r_k| ≥ AUTOCORR_STRONG
  //   (iii) ≥ PAIR_CORROB_MIN pairs have per-pair adj-p < PAIR_CORROB_ALPHA
  //         at lag k, where per-pair adj-p is computed via BH-FDR across
  //         all (pair × lag) units k ∈ {2..5} within this group.
  // (iii) is the S96 pair-lottery suppressor — the pooled t is seed-
  // sensitive at moderate pair counts, so we require distributed per-pair
  // evidence before trusting the pooled signal. Scope is per-group.
  const lagPooledPs = [pooled.p];
  const lagPooledMeans = [pooledMeanR1];
  for (const k of HIGHER_LAGS) {
    const vals = allRk[k];
    const pk = vals.length>=2 ? oneSampleT(vals).p : 1;
    const mk = vals.length ? mean(vals) : 0;
    lagPooledPs.push(pk);
    lagPooledMeans.push(mk);
  }
  const lagAdjPs = bhFDR(lagPooledPs);

  // (iii) per-pair per-lag corroboration — BH-FDR across (pair × lag)
  // flat units for k ∈ HIGHER_LAGS within this group.
  const pairLagFlat = [];
  for (let pi = 0; pi < pairN.length; pi++) {
    const n = pairN[pi];
    const se = 1 / Math.sqrt(n);
    for (const k of HIGHER_LAGS) {
      const rk = allRk[k][pi];
      const z = rk / se;
      const rawP = zToP(z);
      pairLagFlat.push({ pi, lag: k, rawP });
    }
  }
  const pairLagAdjPs = pairLagFlat.length ? bhFDR(pairLagFlat.map(x => x.rawP)) : [];
  pairLagFlat.forEach((x, i) => { x.adjP = pairLagAdjPs[i]; });
  const pairsSigByLag = {}; for (const k of HIGHER_LAGS) pairsSigByLag[k] = 0;
  for (const x of pairLagFlat) if (x.adjP < PAIR_CORROB_ALPHA) pairsSigByLag[x.lag]++;

  // Evaluate (i) ∧ (ii) ∧ (iii) per higher lag; amber highlight ↔ triggered.
  const triggeredByLag = {}; for (const k of HIGHER_LAGS) triggeredByLag[k] = false;
  for (const k of HIGHER_LAGS) {
    const idx = HIGHER_LAGS.indexOf(k) + 1;
    const poolPassed = lagAdjPs[idx] < ALPHA.FLAG;
    const gatePassed = !(nR >= 500 && Math.abs(lagPooledMeans[idx]) < EFFECT_SIZE.AUTOCORR_STRONG);
    const pairsPassed = (pairsSigByLag[k] || 0) >= PAIR_CORROB_MIN;
    triggeredByLag[k] = poolPassed && gatePassed && pairsPassed;
  }
  const higherLagPromoted = HIGHER_LAGS.some(k => triggeredByLag[k]);
  if (flag === "LOW" && higherLagPromoted) flag = "MODERATE";
  // S166 A2: true iff higher-lag evidence was the decisive promoter (lag-1 was
  // LOW and the bump moved it to MODERATE). The legacy `higherLagPromoted` flag
  // also fires when lag-1 already flagged at MOD/HIGH — leading the MiniCard
  // footer + findingComposers to falsely assert "promoted to MODERATE" on a
  // HIGH card. Footer copy conditions on this new boolean instead.
  const higherLagWasDecisive = higherLagPromoted && flagBeforeHigherLag === "LOW";

  const lagTable = [1, ...HIGHER_LAGS].map((k, i) => ({
    lag: k,
    pooledR: lagPooledMeans[i].toFixed(4),
    p: lagPooledPs[i].toFixed(4),
    adjP: lagAdjPs[i].toFixed(4),
    rawP: lagPooledPs[i],
    rawAdjP: lagAdjPs[i],
    pairsSig: i === 0 ? null : (pairsSigByLag[k] ?? 0),
    pairsTotal: i === 0 ? null : pairN.length,
    isPromotionTrigger: i === 0 ? false : !!triggeredByLag[k],
  }));

  return { name:"Autocorrelation", category:"replicate",
    description:"The random error in row 5 should tell you nothing about the error in row 6. When data is constructed by hand, each row tends to be influenced by the one before it — creating a detectable pattern in the noise down the rows.",
    nSignificant:nSig, nPairs:res.length,
    pooledMeanR1:pooledMeanR1.toFixed(4),
    pooledT:pooled.t.toFixed(3), pooledP:pooled.p.toFixed(4),
    primaryP: Math.min(pooled.p, ...(anyPairFlagged ? acfAdjPs.filter(p=>p<ALPHA.FLAG) : [1])),
    effectSizeClass,
    pooledR1SD, pooledR1SE, pooledR1CI,
    lagTable, higherLagPromoted, higherLagWasDecisive,
    decayCurve, flag, details:res.slice(0,15) };
}

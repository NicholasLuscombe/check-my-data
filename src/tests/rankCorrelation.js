import { mean, spearmanR, normalCDF, bhFDR } from "../stats/primitives.js";
import { flagFromP, ALPHA } from "../constants/thresholds.js";

/* 4c. Cross-Condition Spearman Rank Correlation */
/**
 * Detects preserved rank ordering across conditions, suggesting shared data sources between conditions.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns).
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} condCtx - Unified condition context.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, nConditionPairs: number, nSuspicious: number, meanRho: string, details: object[] }} Result with pairwise Spearman rho, leave-one-out outlier detection, BH-FDR-corrected p-values (flag capped at MODERATE).
 * @see METHODOLOGY.md §"1.5 Cross-Condition Rank Correlation"
 */
export function testSpearmanCrossCondition(matrix, condCtx) {
  let condProfiles = [];

  const slices = condCtx?.has ? condCtx.slices() : [];
  if (slices.length >= 2) {
    for (const s of slices) {
      const m = s.matrix;
      const profile = m.map(row => { const v = row.filter(v => v != null); return v.length ? mean(v) : null; }).filter(v => v !== null);
      if (profile.length >= 5) condProfiles.push({ name: s.name, profile });
    }
  }

  if(condProfiles.length<2)
    return {name:"Cross-Condition Rank Correlation",category:"group",flag:"N/A",
      description:"Need ≥2 conditions with ≥5 rows each."};

  // Compute per-pair ρ
  const results=[];
  for(let i=0;i<condProfiles.length;i++) for(let j=i+1;j<condProfiles.length;j++){
    const p1=condProfiles[i].profile, p2=condProfiles[j].profile;
    const n=Math.min(p1.length,p2.length);
    if(n<5) continue;
    const rho=spearmanR(p1.slice(0,n), p2.slice(0,n));
    if(isNaN(rho)) continue;
    results.push({ pair:`${condProfiles[i].name} vs ${condProfiles[j].name}`,
      spearmanR:rho.toFixed(4), n });
  }

  if(!results.length) return {name:"Cross-Condition Rank Correlation",category:"group",flag:"N/A",
    description:"Insufficient data per condition pair (need ≥5 rows each)."};

  // With fewer than 4 pairs, LOO null has too few degrees of freedom for reliable
  // z-testing (3 pairs → LOO uses only 2 as the null reference). Below threshold,
  // mark informational only — high ρ cannot be distinguished from biological similarity.
  if(results.length < 4) {
    const rho = parseFloat(results[0]?.spearmanR);
    return { name:"Cross-Condition Rank Correlation", category:"group",
      flag:"N/A",
      insufficientPairs:true,
      description:"With fewer than 4 condition pairs, LOO null has too few degrees of freedom to distinguish fabrication from routine biological similarity (most features non-differentially expressed). This test requires ≥4 condition pairs to make statistical inference. Shown here as contextual information only.",
      nConditionPairs:results.length, nSuspicious:0,
      details:results };
  }

  // ── Leave-one-out outlier detection  ──────────────────
  // Instead of testing against an arbitrary fixed null (ρ₀=0.85),
  // test whether any single pair is an outlier relative to the others.
  // For each pair, compute leave-one-out mean of all OTHER Fisher z values.
  // Test whether the pair's z is significantly above the LOO mean.
  // This asks "is this pair suspiciously more correlated than the rest?"
  // without needing an absolute biological reference value.
  const zVals = results.map(r => {
    const rho = Math.min(Math.max(parseFloat(r.spearmanR), -0.9999), 0.9999);
    return 0.5 * Math.log((1+rho)/(1-rho));
  });
  const n = results[0]?.n || 20;
  const zSE = 1 / Math.sqrt(Math.max(n - 3, 1));
  const meanZ = zVals.reduce((a,b)=>a+b,0)/zVals.length;
  const meanRho = Math.tanh(meanZ);

  // Per-pair LOO test
  const nPairs = zVals.length;
  const looResults = results.map((r,i) => {
    const others = zVals.filter((_,j) => j !== i);
    const looMean = others.reduce((a,b)=>a+b,0)/others.length;
    const looSE = nPairs > 2 ? zSE * Math.sqrt(nPairs / (nPairs - 1)) : zSE;
    const zStat = (zVals[i] - looMean) / looSE;
    const p = zStat > 0 ? 1 - normalCDF(zStat) : 1;
    return {...r,
      fisherZ: zVals[i].toFixed(3),
      looMean: Math.tanh(looMean).toFixed(4),
      zStat: zStat.toFixed(3),
      rawP: p,
      interpretation: parseFloat(r.spearmanR) > 0.97 ? "Very high" :
        parseFloat(r.spearmanR) > 0.85 ? "High" : "Moderate"
    };
  });

  // BH-FDR across pair-level LOO tests
  const xcrAdjPs = bhFDR(looResults.map(r => r.rawP));
  looResults.forEach((r,i) => { r.adjP = xcrAdjPs[i]; r.suspicious = xcrAdjPs[i] < ALPHA.FLAG; });
  const nSuspicious = looResults.filter(r => r.suspicious).length;

  // flagFromP on best adjP, capped at MODERATE:
  // High ρ between conditions can always reflect genuine biological similarity.
  // This test is corroborating evidence only — cap prevents standalone escalation.
  const bestXcrP = Math.min(...looResults.map(r => r.adjP != null ? r.adjP : 1));
  const rawFlag = flagFromP(bestXcrP);
  const flagRankCap = {"HIGH":"MODERATE","MODERATE":"MODERATE","LOW":"LOW","N/A":"N/A"};
  const flag = flagRankCap[rawFlag] || rawFlag;

  return { name:"Cross-Condition Rank Correlation", category:"group",
    description:"Conditions should differ from each other — if two conditions rank samples in almost the same order, their data may share a common source. This card compares the rank similarity of each condition pair against the others to find outliers. Capped at NOTED because genuine biological similarity can also produce high correlation.",
    nConditionPairs:results.length, nSuspicious,
    meanRho:meanRho.toFixed(4), primaryP: Math.min(...looResults.map(r => r.adjP != null ? r.adjP : 1)),
    flag, details:looResults };
}

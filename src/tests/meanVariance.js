import { mean, variance, stddev, arrayMin, arrayMax, chiSquaredP, zToP } from "../stats/primitives.js";
import { flagFromP, ALPHA } from "../constants/thresholds.js";

/* 11. Mean–Variance Relationship */
/**
 * Detects absence of expected mean-variance scaling by testing the log-log slope of variance vs mean against assay-specific expectations.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @param {string} assay - Assay type identifier (e.g. 'qpcr', 'densitometry', 'plate_reader', 'general')
 * @returns {{ name: string, category: string, flag: string, description: string, observedSlope: string, slopeSE: string, regressionSE: string, blockRobust: boolean, expectedSlope: string, assay: string, nPoints: number, logCentroid: number[], logPoints: Array<{ lm: number, lv: number }>, primaryP: number, interpretation: string }}
 * @see METHODOLOGY.md §"4.1 Mean-Variance Relationship"
 */
export function testMeanVariance(matrix, assay) {
  const nC=matrix[0]?.length||0;
  if(nC<3) return {name:"Noise Scaling With Measurement Size",category:"replicate",flag:"N/A",description:"Need ≥3 replicate columns to estimate within-row variance."};
  const points=[];
  for(let r=0;r<matrix.length;r++){
    const vals=matrix[r].filter(v=>v!=null);
    if(vals.length<3) continue;
    const m=mean(vals), v=variance(vals);
    if(m>0&&v>0) points.push({mean:m,variance:v});
  }
  if(points.length<5) return {name:"Noise Scaling With Measurement Size",category:"replicate",flag:"N/A",description:"Need ≥5 rows with ≥3 valid non-zero replicates."};
  const expectedSlopes={general:null,qpcr:0,densitometry:2,plate_reader:1,cell_count:1,elisa:2,genomics:2,physiological:0};
  const expSlope=expectedSlopes[assay]??null;
  // Check dynamic range of row means — log-log slope is unreliable when data spans
  // less than ~1.0 orders of magnitude (regression has too little x-axis spread).
  // EXCEPTION: when expected slope is 0 (additive noise — qPCR, physiological),
  // detecting deviation from 0 doesn't need range. A slope of -1.12 vs expected 0
  // is clearly wrong even with a narrow x-axis. The guard only matters when we need
  // to distinguish slope=1 from slope=2 (Poisson vs proportional).
  const ptMeans=points.map(p=>p.mean);
  const meanRange = Math.log10(arrayMax(ptMeans)) - Math.log10(arrayMin(ptMeans));
  if(meanRange<1.0 && expSlope!==0) return {name:"Noise Scaling With Measurement Size",category:"replicate",flag:"N/A",
    description:`Row means span only ${meanRange.toFixed(1)} orders of magnitude — need ≥1.0 for a reliable log-log slope estimate. Noise Scaling test is inapplicable for narrow-range data.`};
  const logM=points.map(p=>Math.log(p.mean));
  const logV=points.map(p=>Math.log(p.variance));
  const mLM=mean(logM), mLV=mean(logV);
  let num=0, den=0;
  for(let i=0;i<logM.length;i++){num+=(logM[i]-mLM)*(logV[i]-mLV);den+=(logM[i]-mLM)**2;}
  const slope=den>0?num/den:0;

  // Regression SE for the slope estimate
  const intercept = mLV - slope * mLM;
  let rss = 0;
  for(let i=0;i<logM.length;i++){ const pred = intercept + slope*logM[i]; rss += (logV[i]-pred)**2; }
  const slopeVariance = den > 0 && logM.length > 2 ? rss / ((logM.length-2) * den) : Infinity;
  const regressionSE = Math.sqrt(slopeVariance);

  // Robust block-SE with Hausman-type specification test.
  //
  // Problem: regression SE assumes the log-log model is perfectly linear. At large N,
  // regression SE becomes tiny, making even biologically normal slope deviations significant.
  //
  // Solution: Cochran's Q heterogeneity test from meta-analysis.
  // Split into blocks sorted by mean, fit per-block slopes, then test whether block
  // slopes vary MORE than their individual sampling variances predict.
  //   - Q = Σ w_b (β̂_b − β̄_w)² where w_b = 1/Var(β̂_b), β̄_w = Σ(w_b β̂_b)/Σw_b
  //   - Under H0 (correct linear model): Q ~ χ²(k−1)
  //   - If Q is significant (p < 0.05): genuine non-linearity → use blockSE
  //   - If Q is not significant: block slope variation is sampling noise → use regressionSE
  const nBlocks = Math.min(10, Math.floor(logM.length / 5));
  let blockSE = 0;
  let blockRobust = false;
  if(nBlocks >= 3) {
    const sortedIdx = logM.map((_,i)=>i).sort((a,b)=>logM[a]-logM[b]);
    const blockSize = Math.floor(sortedIdx.length / nBlocks);
    const blockResults = []; // {slope, slopeVar}
    for(let b = 0; b < nBlocks; b++) {
      const start = b * blockSize;
      const end = b === nBlocks-1 ? sortedIdx.length : start + blockSize;
      const bi = sortedIdx.slice(start, end);
      if(bi.length < 4) continue; // need ≥4 for slope + meaningful residual df
      const bLogM = bi.map(i=>logM[i]), bLogV = bi.map(i=>logV[i]);
      const bMM = mean(bLogM), bMV = mean(bLogV);
      let bNum=0, bDen=0;
      for(let j=0;j<bi.length;j++){bNum+=(bLogM[j]-bMM)*(bLogV[j]-bMV);bDen+=(bLogM[j]-bMM)**2;}
      if(bDen > 0) {
        const bSlope = bNum/bDen;
        const bInt = bMV - bSlope * bMM;
        let bRSS = 0;
        for(let j=0;j<bi.length;j++){ const pred=bInt+bSlope*bLogM[j]; bRSS+=(bLogV[j]-pred)**2; }
        const bSigma2 = bRSS / (bi.length - 2);
        const bSlopeVar = bSigma2 / bDen; // Var(β̂_b) = σ²_b / SS_x_b
        if(bSlopeVar > 0 && isFinite(bSlopeVar)) {
          blockResults.push({slope: bSlope, slopeVar: bSlopeVar});
        }
      }
    }
    if(blockResults.length >= 3) {
      // Cochran's Q test for heterogeneity
      const weights = blockResults.map(r => 1 / r.slopeVar);
      const sumW = weights.reduce((a,b)=>a+b, 0);
      const weightedMean = weights.reduce((s,w,i) => s + w * blockResults[i].slope, 0) / sumW;
      const Q = weights.reduce((s,w,i) => s + w * (blockResults[i].slope - weightedMean)**2, 0);
      const qDF = blockResults.length - 1;
      const qP = chiSquaredP(Q, qDF); // upper-tail: P(χ² > Q)
      // If significant heterogeneity: block slopes genuinely disagree → model misspecified
      if(qP < 0.05) {
        blockSE = stddev(blockResults.map(r=>r.slope)) / Math.sqrt(blockResults.length);
        blockRobust = blockSE > regressionSE;
      }
    }
  }
  const slopeSE = blockRobust ? blockSE : regressionSE;

  let flag="LOW", interpretation="", primaryP=1;
  if(expSlope!==null){
    const dev=Math.abs(slope-expSlope);
    const zSlope = slopeSE > 0 && slopeSE < Infinity ? (slope - expSlope) / slopeSE : 0;
    const pSlope = zToP(zSlope);
    primaryP = pSlope;
    flag=flagFromP(pSlope);
    interpretation=`Expected log-log slope ≈ ${expSlope} for ${assay} (0=additive, 1=Poisson, 2=proportional). Observed: ${slope.toFixed(2)} ± ${slopeSE.toFixed(3)} SE${blockRobust?" (block-robust: Cochran's Q detects non-linear mean-variance relationship)":""}. Deviation: ${dev.toFixed(2)}, z=${zSlope.toFixed(2)}, p=${pSlope.toFixed(4)}.`;
  } else {
    const z0 = slopeSE > 0 && slopeSE < Infinity ? slope / slopeSE : 0;
    const z2 = slopeSE > 0 && slopeSE < Infinity ? (slope - 2) / slopeSE : 0;
    const pNearest = slope < 0 ? zToP(z0) : slope > 2 ? zToP(z2) : 1;
    primaryP = pNearest;
    if(pNearest < ALPHA.FLAG) flag = "HIGH";
    else if(pNearest < ALPHA.NOTE) flag = "MODERATE";
    interpretation=`Observed log-log mean–variance slope: ${slope.toFixed(2)} ± ${slopeSE.toFixed(3)} SE${blockRobust?" (block-robust)":""}. Reference: 0=additive noise, 1=Poisson, 2=proportional. ${flag==="LOW"?"Within plausible range.":"Slope is significantly outside the [0, 2] range of known noise models."} Select an assay type for instrument-specific assessment.`;
  }
  // Pass log-space points for scatter plot (cap at 200 for render performance)
  const logPoints = points.map(p=>({lm:Math.log10(p.mean), lv:Math.log10(p.variance)}));
  const sample = logPoints.length>200 ? logPoints.filter((_,i)=>i%Math.ceil(logPoints.length/200)===0) : logPoints;
  return { name:"Noise Scaling With Measurement Size", category:"replicate",
    description:"Real instruments produce a predictable relationship between measurement size and replicate spread — bigger values are noisier in characteristic ways. This card tests the log-log slope of variance vs mean against the expected value for the measurement type.",
    observedSlope:slope.toFixed(3), slopeSE:slopeSE<Infinity?slopeSE.toFixed(4):"∞",
    regressionSE:regressionSE<Infinity?regressionSE.toFixed(4):"∞",
    blockRobust,
    expectedSlope:expSlope!==null?String(expSlope):"—", assay, nPoints:points.length,
    logCentroid:[mLM/Math.LN10, mLV/Math.LN10],
    logPoints:sample, primaryP,
    interpretation, flag };
}

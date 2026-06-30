import { mean, variance, zToP, bhFDR } from "../stats/primitives.js";
import { flagFromP, ALPHA, flagRankOf } from "../constants/thresholds.js";

/**
 * Detects implausibly uniform pairwise Pearson correlation among replicates, suggesting non-independent columns.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns).
 * @param {object[]} [pairGroups] - Condition-aware column groups; when provided, correlation is computed within each condition's replicates.
 * @param {{ random: Function }} rng - PRNG instance for the windowed-scan permutation null.
 * @param {string} [rowSemantics='ordered'] - When 'arbitrary' (long-format pivot, gene list, etc.) the windowed sub-unit is suppressed; the global LOO winsorized-Pearson pairwise test continues to run.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, nPairs: number, meanR: string, nSuspicious: number, iccPredicted: string, windowScanP: number, interpretation: string, details: object[] }} Result with per-pair correlations, leave-one-out ICC comparison, windowed permutation scan, and flagged suspicious pairs.
 * @see METHODOLOGY.md §"2.5 Inter-Replicate Correlation"
 */
export function testPearsonUniformity(matrix, pairGroups, rng, rowSemantics = 'ordered') {
  // Use pairGroups (condition-aware column groups) when available so we only
  // compute pairwise r within each condition's replicates, not across conditions.
  // Cross-condition r is handled by the Spearman rank test.
  const groups = pairGroups && pairGroups.length > 0
    ? pairGroups
    : [{ name:"All data", matrix }];

  // Helper: winsorize a vector at the pth and (1-p)th percentiles
  // Caps extreme values rather than removing them — preserves array length.
  // Standard robust statistics approach (Wilcox 2012). p=0.05 tolerates up to
  // 5% contamination, covering realistic QC outlier rates (1–3% in proteomics)
  // while retaining sensitivity to block-level patterns affecting >10% of rows.
  function winsorize(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const lo = sorted[Math.floor(p * sorted.length)];
    const hi = sorted[Math.ceil((1 - p) * sorted.length) - 1];
    return arr.map(v => v < lo ? lo : v > hi ? hi : v);
  }
  const WINSOR_P = 0.05;

  // Winsorized Pearson r: clips leverage outliers.
  // Used for global pairwise r where 1–3% outlier contamination inflates r.
  // Windowed scan uses raw Pearson (in 8–15 row windows, every point is signal).
  function winPearsonR(a, b) {
    const wa = winsorize(a, WINSOR_P), wb = winsorize(b, WINSOR_P);
    const ma = mean(wa), mb = mean(wb);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < wa.length; i++) { num += (wa[i] - ma) * (wb[i] - mb); da += (wa[i] - ma) ** 2; db += (wb[i] - mb) ** 2; }
    return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
  }
  // ICC-predicted winsorized r for a single-condition matrix
  // Winsorize each column independently, then compute ICC on winsorized values
  function iccFromMatrix(m) {
    const nR = m.length, nC = m[0]?.length || 0;
    // Winsorize each column
    const winM = Array.from({ length: nR }, () => new Array(nC).fill(null));
    for (let c = 0; c < nC; c++) {
      const vals = [], idxs = [];
      for (let r = 0; r < nR; r++) { if (m[r][c] != null) { vals.push(m[r][c]); idxs.push(r); } }
      if (vals.length < 3) continue;
      const wv = winsorize(vals, WINSOR_P);
      wv.forEach((v, i) => { winM[idxs[i]][c] = v; });
    }
    const rMeans = [], rVars = [];
    for (let r = 0; r < nR; r++) {
      const vals = winM[r].filter(v => v != null);
      if (vals.length >= 2) { rMeans.push(mean(vals)); rVars.push(variance(vals)); }
    }
    if (rMeans.length < 3) return null;
    const sigB = Math.max(0, variance(rMeans) - mean(rVars) / nC);
    const sigW = mean(rVars);
    return sigB + sigW > 0 ? sigB / (sigB + sigW) : null;
  }

  const allPairs=[];
  const pairRowVecs=[]; // parallel: {aVals,bVals,rowIdxs} for windowed scan
  let totalHighSNR=0;

  for(const grp of groups){
    const m=grp.matrix;
    const nRows=m.length, nCols=m[0]?.length||0;
    if(nCols<2||nRows<6) continue;
    // Global matrix column indices for this group (identity when no conditions)
    const grpColIdx = grp.colIndices || Array.from({length:nCols},(_,i)=>i);

    const icc=iccFromMatrix(m);
    const highSNR=icc!==null&&icc>0.99;
    if(highSNR) totalHighSNR++;

    // Compute all pairwise winsorized Pearson r (robust to leverage outliers)
    // Also store per-row aligned vectors for windowed scanning (Item 4)
    const pairData=[];
    for(let c1=0;c1<nCols;c1++) for(let c2=c1+1;c2<nCols;c2++){
      const a=[], b=[], rowIdxs=[];
      for(let r=0;r<nRows;r++){
        if(m[r][c1]!=null&&m[r][c2]!=null){a.push(m[r][c1]);b.push(m[r][c2]);rowIdxs.push(r);}
      }
      if(a.length<6) pairData.push(null);
      else pairData.push({c1,c2,r:winPearsonR(a,b),n:a.length,aVals:a,bVals:b,rowIdxs});
    }
    const validPairs=pairData.filter(p=>p!==null);
    const kPairs=validPairs.length;

    for(let pi=0;pi<pairData.length;pi++){
      const pd=pairData[pi];
      if(!pd) continue;

      // Leave-one-out ICC: null for this pair is the mean r of all OTHER pairs.
      // Eliminates circularity — the pair being tested does not influence its own null.
      const otherRs=validPairs.filter((_,j)=>j!==validPairs.indexOf(pd)).map(p=>p.r);
      const looICC=otherRs.length>0?mean(otherRs):null;

      const excess=looICC!==null?pd.r-looICC:null;
      const zObs=Math.abs(pd.r)<0.9999?0.5*Math.log((1+pd.r)/(1-pd.r)):6;
      const zNull=looICC!==null&&Math.abs(looICC)<0.9999?0.5*Math.log((1+looICC)/(1-looICC)):null;

      // SE: pair sampling uncertainty + leave-one-out null estimation uncertainty.
      // Both are Fisher z scale: SE_pair = 1/√(n-3), SE_null = SE_pair/√(k-1)
      // Combined = √(k / ((k-1)(n-3)))
      const sePair=1/Math.sqrt(Math.max(pd.n-3,1));
      const se=kPairs>1?sePair*Math.sqrt(kPairs/(kPairs-1)):sePair;
      const zStat=zNull!==null?(zObs-zNull)/se:null;
      const p=zStat!==null?zToP(zStat):null;
      allPairs.push({
        condition:grp.name,
        pair:`${pd.c1+1}–${pd.c2+1}`,
        matCol1:grpColIdx[pd.c1], matCol2:grpColIdx[pd.c2],
        r:pd.r.toFixed(4),
        rawR:pd.r,
        iccExpected:looICC!==null?looICC.toFixed(4):"n/a",
        excess:excess!==null?(excess>=0?"+":"")+excess.toFixed(4):"n/a",
        rawExcess:excess,
        p:p!==null?p.toFixed(4):"n/a",
        rawP:p,
        n:pd.n,
        highSNR,
        rawLooICC:looICC,
        zObs, zNull, se, zStat,
      });
      pairRowVecs.push({aVals:pd.aVals, bVals:pd.bVals, rowIdxs:pd.rowIdxs});
    }
  }

  if(!allPairs.length) return {name:"Inter-Replicate Correlation",category:"replicate",flag:"N/A",
    description:"No valid within-condition replicate pairs found."};

  // BH-FDR correction across all per-pair p-values
  const iccRawPs=allPairs.map(p=>p.rawP!==null?p.rawP:1);
  const iccAdjPs=bhFDR(iccRawPs);
  allPairs.forEach((p,i)=>{
    p.adjP=iccAdjPs[i];
    // Suspicious requires adjP<0.001: with k=3 pairs, natural variability in r easily
    // produces adjP ≈ 0.002–0.005 for the most extreme pair. adjP<0.01 was overpowered
    // for high-ICC datasets (e.g. ELISA spanning 4+ orders of magnitude, ICC≈0.98).
    // adjP<0.001 is consistent with HIGH-level thresholds across the battery and
    // corresponds to family-wise α≈0.003 with k=3, appropriate for forensic screening.
    // Genuine column-copy (r≈0.999, zStat≈8–20) clears this threshold trivially.
    //
    // At large N (≥500 per pair), the Fisher z SE is so small that even
    // trivial excess (0.01–0.03) reaches adjP<0.001. Raise the minimum forensic
    // excess to 0.05 at large N to avoid false positives from high-dynamic-range data.
    const minExcess = p.n>=500 ? 0.05 : 0.01;
    p.suspicious=!p.highSNR&&iccAdjPs[i]<ALPHA.FLAG&&parseFloat(p.excess)>minExcess;
  });

  // ── Windowed ICC permutation scan (Item 4) ──
  // Scan statistic: max windowed r-excess across all pairs × windows.
  // Permutation null: shuffle row order per pair, recompute scan statistic.
  // Correctly handles signal heterogeneity (high-value rows naturally have
  // high r) without arbitrary effect-size gates — permuted data preserves
  // the marginal value distribution, so extreme-value windows appear in both
  // observed and null distributions when driven by signal range.
  //
  // S118 Track H sub-unit suppression: under rowSemantics='arbitrary'
  // (long-format pivots, gene lists, alphabetised protein IDs) the windowed
  // scan is suppressed — sliding windows over arbitrary row order have no
  // forensic interpretation. The global LOO winsorized-Pearson pairwise
  // test continues to run; primaryP excludes scanP in that mode.
  const suppressWindowed = rowSemantics === 'arbitrary';
  let allWinResults=[];
  const MAX_WIN_IRC_PAIRS=30;

  // Collect scannable pairs (skipped under arbitrary row semantics).
  const scanPairs=[];
  if(!suppressWindowed){
    for(let pi=0;pi<allPairs.length&&scanPairs.length<MAX_WIN_IRC_PAIRS;pi++){
      const ap=allPairs[pi], rv=pairRowVecs[pi];
      if(ap.highSNR||ap.rawLooICC===null) continue;
      const n=rv.aVals.length;
      const win=Math.max(8,Math.min(15,Math.floor(n/3)));
      if(n<win+2) continue;
      // At large N, increase stride to limit window count (non-overlapping at N>1000)
      const stride=n>1000?win:Math.max(1,Math.floor(win/3));
      scanPairs.push({pi,ap,rv,n,win,stride,baseline:ap.rawLooICC});
    }
  }

  // Helper: index-based Pearson r on a window starting at s with length win — no array allocation
  function winPearsonRIdx(arr, aVals, bVals, s, win) {
    let sa=0, sb=0;
    for(let k=s;k<s+win;k++){ const i=arr[k]; sa+=aVals[i]; sb+=bVals[i]; }
    const ma=sa/win, mb=sb/win;
    let num=0, da=0, db=0;
    for(let k=s;k<s+win;k++){ const i=arr[k]; const a=aVals[i]-ma, b=bVals[i]-mb; num+=a*b; da+=a*a; db+=b*b; }
    return da>0&&db>0?num/Math.sqrt(da*db):0;
  }

  // Helper: max windowed r-excess using index array (no slice/map allocations)
  function maxWinExcessIdx(arr,aVals,bVals,n,win,stride,baseline){
    let mx=0;
    for(let s=0;s+win<=n;s+=stride){
      const ex=winPearsonRIdx(arr,aVals,bVals,s,win)-baseline;
      if(ex>mx) mx=ex;
    }
    return mx;
  }

  // Identity index array for observed computation
  const _identIdx = scanPairs.length > 0 ? Array.from({length: Math.max(...scanPairs.map(sp=>sp.n))}, (_,i)=>i) : [];

  // Observed scan statistic + individual window results
  let obsScanStat=0;
  for(const sp of scanPairs){
    const {ap,rv,n,win,stride,baseline}=sp;
    for(let s=0;s+win<=n;s+=stride){
      const rW=winPearsonRIdx(_identIdx,rv.aVals,rv.bVals,s,win);
      const rExcess=rW-baseline;
      if(rExcess>0){
        allWinResults.push({
          pair:ap.pair, condition:ap.condition,
          matCol1:ap.matCol1, matCol2:ap.matCol2,
          startRow:rv.rowIdxs[s]+1,
          endRow:rv.rowIdxs[Math.min(s+win-1,n-1)]+1,
          rWin:rW.toFixed(4), baseline:baseline.toFixed(4),
          excess:"+"+(rExcess).toFixed(4), rExcess
        });
        if(rExcess>obsScanStat) obsScanStat=rExcess;
      }
    }
  }

  // Permutation null: shuffle row order per pair, recompute max excess.
  // Pre-allocate index array once at max size — reused across all perms/pairs.
  let scanP=1;
  if(obsScanStat>0&&scanPairs.length>0){
    const maxN=Math.max(...scanPairs.map(sp=>sp.n));
    const N_PERM=maxN<=100?999:maxN<=1000?499:199;
    const permIdx=Array.from({length:maxN},(_,i)=>i);
    let exceedCount=0;
    for(let perm=0;perm<N_PERM;perm++){
      let permMax=0;
      for(const sp of scanPairs){
        const {rv,n,win,stride,baseline}=sp;
        // Reset index to identity then shuffle only first n elements
        for(let i=0;i<n;i++) permIdx[i]=i;
        for(let i=n-1;i>0;i--){
          const j=Math.floor(rng.random()*(i+1));
          const tmp=permIdx[i]; permIdx[i]=permIdx[j]; permIdx[j]=tmp;
        }
        const pm=maxWinExcessIdx(permIdx,rv.aVals,rv.bVals,n,win,stride,baseline);
        if(pm>permMax) permMax=pm;
      }
      if(permMax>=obsScanStat) exceedCount++;
    }
    scanP=(exceedCount+1)/(N_PERM+1);
  }

  // Sort windows by excess; flag from scan p
  allWinResults.sort((a,b)=>b.rExcess-a.rExcess);
  const windowIrcFlag=scanP<ALPHA.FLAG?"HIGH":scanP<ALPHA.NOTE?"MODERATE":null;
  const winIrcSig=windowIrcFlag?allWinResults.slice(0,20):[];
  winIrcSig.forEach(w=>{w.significant=true;w.scanP=scanP;w.source="window";});
  const nWinSig=winIrcSig.length;

  const rVals=allPairs.map(p=>parseFloat(p.r));
  const meanR=mean(rVals);
  const nSuspicious=allPairs.filter(p=>p.suspicious).length;
  const allHighSNR=totalHighSNR===groups.length;

  // Pool ICC estimates across groups for display
  const iccVals=groups.map(g=>iccFromMatrix(g.matrix)).filter(v=>v!==null);
  const meanICC=iccVals.length?mean(iccVals):null;

  let flag="LOW", interpretation="";
  if(allHighSNR){
    flag="LOW";
    interpretation=`High signal-to-noise ratio across all conditions (mean ICC-predicted r ≈ ${meanICC!==null?meanICC.toFixed(3):"N/A"}). Inter-replicate r is expected to be near 1.0 — limited discriminating power. Observed mean r = ${meanR.toFixed(4)}.`;
  } else if(nSuspicious>0){
    // flagFromP on the best adjP among suspicious pairs
    const suspPairs = allPairs.filter(p => p.suspicious);
    const bestSuspP = Math.min(...suspPairs.map(p => p.adjP));
    flag = flagFromP(bestSuspP);
    interpretation = flag === "HIGH"
      ? `${nSuspicious} within-condition replicate pair${nSuspicious>1?"s":""} have r significantly above the leave-one-out predicted value (BH-adjusted p<${ALPHA.FLAG}), suggesting those replicates may not be genuinely independent.`
      : `${nSuspicious} within-condition replicate pair${nSuspicious>1?"s":""} ${nSuspicious>1?"have":"has"} r above the leave-one-out prediction (BH-adjusted p<${ALPHA.FLAG}). May warrant inspection.`;
  } else {
    // BH-FDR pair-level promotion: if any pair adjP < ALPHA.FLAG, promote to MODERATE
    // Consistent with Autocorr/Runs pair-level promotion
    const anyPairSig = !allHighSNR && allPairs.some(p => p.adjP != null && p.adjP < ALPHA.FLAG);
    if (anyPairSig) {
      flag = "MODERATE";
      interpretation = `One replicate pair survives BH-FDR correction at α=${ALPHA.FLAG} — promoted to MODERATE for consistency with pair-level analysis.`;
    } else {
      interpretation=`Within-condition inter-replicate correlations (mean r=${meanR.toFixed(3)}) are consistent with ICC-predicted values given each condition's signal-to-noise ratio.`;
    }
  }
 // Combined: take more severe of global and windowed (Item 4)
  if(!allHighSNR&&windowIrcFlag&&flagRankOf(windowIrcFlag)>flagRankOf(flag)){
    flag=windowIrcFlag;
    const winEx=winIrcSig.slice(0,3).map(w=>`${w.condition} ${w.pair} rows ${w.startRow}–${w.endRow} (r=${w.rWin})`).join("; ");
    interpretation=`Windowed permutation scan detected locally elevated inter-replicate correlation (scan p=${scanP.toFixed(4)}): ${winEx}. This suggests non-independence in a subset of rows that is diluted by the global analysis.`;
  }

  // Per-pair promotion contributor (S289): a report-only mark of whether a
  // pair drove the verdict, by EITHER per-pair arm. In the suspicious arm
  // (nSuspicious > 0) only suspicious pairs drive; in the fallback arm (no
  // suspicious pair, the anyPairSig promotion above) any pair below ALPHA.FLAG
  // drives; under all-high-SNR no pair drives. The card's forest and matrix read
  // this so a fallback-arm driver no longer reads cleared while the verdict says
  // Moderate. Reads already-computed values only — feeds no flag input, so the
  // verdict logic is unchanged, just exposed. Mirrors the per-unit
  // isPromotionTrigger field Autocorrelation's lag table already exposes.
  allPairs.forEach(p => {
    p.isPromotionTrigger = !allHighSNR && (
      nSuspicious > 0 ? p.suspicious === true
                      : (p.adjP != null && p.adjP < ALPHA.FLAG)
    );
  });

  // primaryP: best of global and windowed scan. When the windowed scan is
  // suppressed (S118 Track H, rowSemantics='arbitrary') it contributes
  // scanP=1 by construction — primaryP collapses to the global best.
  const globalBestP=allHighSNR?1:Math.min(...allPairs.map(p=>p.adjP!=null?p.adjP:1));
  const bestP=Math.min(globalBestP,scanP);

  return { name:"Inter-Replicate Correlation", category:"replicate",
    description:"Replicate columns should correlate — but if a replicate pair is more similar to each other than others, they may not be as independent as the others. This card searches for rows of data in which a replicate pair's correlation is unusually high.",
    nPairs:allPairs.length, nConditions:groups.length, meanR:meanR.toFixed(4),
    nRows:matrix.length,
    iccPredicted:meanICC!==null?meanICC.toFixed(4):"n/a",
    highSNRWarning:allHighSNR, nSuspicious,
    windowScanP:scanP, windowSigCount:nWinSig, nWindowsTested:allWinResults.length,
    subunitsSuppressed: suppressWindowed ? ['windowed-scan'] : [],
    primaryP:bestP,
    interpretation, flag,
    details:[...winIrcSig,...allPairs] };

}

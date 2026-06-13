import { mean, zToP, oneSampleT, bhFDR, stddev } from "../stats/primitives.js";
import { flagFromP, ALPHA, flagRankOf } from "../constants/thresholds.js";

/* 7. Runs Test */
/**
 * Detects non-random sign patterns in inter-replicate differences, indicating sequential fabrication.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns, minimum 2 columns).
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} condCtx - Unified condition context for condition-stratified windowed scanning.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, nSignificant: number, nPairs: number, pooledMeanZ: string, pooledT: string, pooledP: string, windowScanP: number, firstPairSigns: number[]|null, details: object[] }} Result with per-pair runs counts, pooled t-test on z-scores, windowed permutation scan, and sign sequence for strip plot.
 * @see METHODOLOGY.md §"2.3 Runs Test"
 */
export function testRuns(matrix, condCtx, rng) {
  const rowConditions = condCtx?.rowConditions || null;
  const nC=matrix[0]?.length||0;
  const nR=matrix.length;
  if(nC<2) return {name:"Runs Test",category:"replicate",flag:"N/A",description:"Need \u22652 replicate columns."};
  const res=[];
  const allZ=[];

  let totalRuns=0, totalExp=0, pairCount=0;
  let worstPair=null;    // R1-R2 sign sequence for strip plot
  let extremePair=null;  // most extreme pair by |z| across all pairs

  for(let c1=0;c1<nC;c1++) for(let c2=c1+1;c2<nC;c2++){
    const diffs=[], pos=[];
    for(let r=0;r<nR;r++){
      if(matrix[r][c1]!=null&&matrix[r][c2]!=null){
        diffs.push(matrix[r][c1]-matrix[r][c2]); pos.push(r);
      }
    }
    if(diffs.length<10) continue;

    // SIGN METHOD: classify each position as positive (>0), negative (<0), or tied (=0).
    // This preserves the long-range sign persistence structure — the key fabrication signal.
    // Above/below-median recenters the series and destroys that global structure.
    // Scale-free by construction: heteroscedasticity doesn't distort run counts.
    const signs=diffs.map(d=>d>0?1:d<0?-1:0);

    const nP=signs.filter(s=>s>0).length, nM=signs.filter(s=>s<0).length;
    // Count runs on non-zero signs only (ties stripped per Wald-Wolfowitz)
    const nonZero=signs.filter(s=>s!==0);
    let runs=nonZero.length?1:0;
    for(let i=1;i<nonZero.length;i++){
      if(nonZero[i]!==nonZero[i-1]) runs++;
    }
    const n=nP+nM; if(nP===0||nM===0||n<10) continue;
    const er=(2*nP*nM)/n+1, vr=(2*nP*nM*(2*nP*nM-n))/(n*n*(n-1)); if(vr<=0) continue;
    const z=(runs-er)/Math.sqrt(vr), p=zToP(z);
    allZ.push(z); totalRuns+=runs; totalExp+=er; pairCount++;
    // Strip: always show R1-R2 (first pair) — consistent cross-group reference,
    // matches the scoping document convention. Pooled test covers all pairs.
    if(c1===0&&c2===1){
      worstPair={signs, runs, expected:Math.round(er), z,
        label:`R1\u2212R2 (${runs} runs, exp: ${Math.round(er)})`};
    }
    // Also track most extreme pair by |z| — used for strip plot display
    if(!extremePair||Math.abs(z)>Math.abs(extremePair.z)){
      extremePair={pair:`R${c1+1}\u2212R${c2+1}`, col1:c1, col2:c2, signs, pos, runs, expected:Math.round(er), z};
    }
    res.push({pair:`${c1+1}\u2013${c2+1}`, col1:c1, col2:c2, signs, pos, runs, expected:er.toFixed(1),z:z.toFixed(3),p:p.toFixed(4),
      interpretation:z<-1.96?"Too few (clustered)":z>1.96?"Too many (alternating)":"Normal",
      rawP:p});
  }

  const meanRuns=pairCount>0?Math.round(totalRuns/pairCount):null;
  const meanExp=pairCount>0?Math.round(totalExp/pairCount):null;

  // BH-FDR over pairs
  const runsAdjPs=bhFDR(res.map(r=>r.rawP));
  // S218: stamp the BH-adjusted per-pair p onto res[i] alongside significant,
  // index-aligned to runsAdjPs before any sort. This is the value the verdict
  // reads (anyPairFlagged = runsAdjPs.some(p<ALPHA.FLAG)); the card displays it
  // as Adj. p and gates the per-pair Finding word on it. No new bhFDR call.
  res.forEach((r,i)=>{r.significant=runsAdjPs[i]<ALPHA.NOTE; r.adjP=runsAdjPs[i];});
  const nSig=res.filter(r=>r.significant).length;
  const pooled=allZ.length>=2?oneSampleT(allZ):{t:0,df:0,p:1};
  const pooledMeanZ=allZ.length?mean(allZ):0;
  // S166 A5: additive 99.9% CI on the pooled mean-z for the headline marker.
  // Normal-approximation interval (mean ± 3.29·SE) consistent with the
  // oneSampleT df>30 branch. CI's relation to z=0 IS the pooled-t verdict
  // (negative-of-zero = too few runs across pairs). Null when n<2.
  const pooledZSD = allZ.length >= 2 ? stddev(allZ) : 0;
  const pooledZSE = allZ.length >= 2 ? pooledZSD / Math.sqrt(allZ.length) : 0;
  const pooledZCI95 = allZ.length >= 2
    ? [pooledMeanZ - 3.29 * pooledZSE, pooledMeanZ + 3.29 * pooledZSE]
    : null;

  // ── Windowed permutation scan ──
  // Scan statistic: min(windowed z) across all pairs × sequences × windows.
  // Negative z = too few runs = clustered = primary fabrication signal.
  // Permutation null: Fisher-Yates shuffle of difference sequence per pair
  // (preserves marginal distribution, breaks spatial ordering). Consistent
  // with permutation approach for Constant-Offset and Windowed ICC.
  const WIN=15;
  let allWindowResults=[], nWindows=0;

  const MAX_WIN_PAIRS=30;
  const allPairsW=[];
  for(let c1=0;c1<nC;c1++) for(let c2=c1+1;c2<nC;c2++) allPairsW.push([c1,c2]);
  let winPairs=allPairsW;
  if(allPairsW.length>MAX_WIN_PAIRS){
    winPairs=[[0,1]];
    const step=allPairsW.length/MAX_WIN_PAIRS;
    for(let i=1;winPairs.length<MAX_WIN_PAIRS&&i<allPairsW.length;i=Math.round(winPairs.length*step)){
      const p=allPairsW[i]; if(p[0]!==0||p[1]!==1) winPairs.push(p);
    }
  }

  // Build sequences to scan: full matrix + per-condition subsets
  const seqsToScan=[{label:"all", rows:matrix.map((_,i)=>i)}];
  if(rowConditions && rowConditions.some(c=>c)){
    const condIdx={};
    for(let r=0;r<rowConditions.length;r++){
      const c=rowConditions[r];
      if(c){if(!condIdx[c])condIdx[c]=[];condIdx[c].push(r);}
    }
    for(const [cond,idxs] of Object.entries(condIdx)){
      if(idxs.length>=WIN) seqsToScan.push({label:`cond:${cond}`, rows:idxs});
    }
  }

  // Helper: compute runs z for a single window of diffs.
  // S159c — sign counting + run counting in one pass; no signs Array, no
  // .filter() calls. Caller may reuse the returned object reference because
  // we never store it — the perm-loop path only reads `.z`.
  function windowRunsZ(diffs,start,win){
    let nP=0, nM=0;
    for(let i=start;i<start+win;i++){
      const d=diffs[i];
      if(d>0) nP++; else if(d<0) nM++;
    }
    const n=nP+nM; if(nP===0||nM===0||n<8) return null;
    // Count runs over non-zero signs by walking diffs and tracking last non-zero sign.
    let runs=0, lastSign=0;
    for(let i=start;i<start+win;i++){
      const d=diffs[i];
      if(d===0) continue;
      const s = d>0 ? 1 : -1;
      if(s!==lastSign){ runs++; lastSign=s; }
    }
    const er=(2*nP*nM)/n+1, vr=(2*nP*nM*(2*nP*nM-n))/(n*n*(n-1));
    if(vr<=0) return null;
    return {z:(runs-er)/Math.sqrt(vr), runs, er, nP, nM};
  }

  // Pre-compute difference arrays and collect observed window results
  const scanSeqs=[]; // [{diffs, stride, label, pair, rowIdxs}]
  for(const seq of seqsToScan){
    for(const [c1,c2] of winPairs){
      const diffs=[], rowIdxs=[];
      for(const r of seq.rows){
        const a=matrix[r]?.[c1], b=matrix[r]?.[c2];
        if(a!=null&&b!=null){ diffs.push(a-b); rowIdxs.push(r); }
      }
      if(diffs.length<WIN) continue;
      // At large N, increase stride to limit window count
      const stride=diffs.length>1000?WIN:Math.max(1,Math.floor(WIN/3));
      const pairLabel=`R${c1+1}\u2013R${c2+1}`;
      scanSeqs.push({diffs,stride,label:seq.label,pair:pairLabel,rowIdxs});

      // Compute observed window results for display
      for(let s=0;s+WIN<=diffs.length;s+=stride){
        nWindows++;
        const wr=windowRunsZ(diffs,s,WIN);
        if(!wr) continue;
        allWindowResults.push({
          pair:pairLabel, sequence:seq.label,
          startRow:rowIdxs[s]+1, endRow:rowIdxs[Math.min(s+WIN-1,diffs.length-1)]+1,
          runs:wr.runs, expected:Math.round(wr.er), z:parseFloat(wr.z.toFixed(2)),
          rawZ:wr.z
        });
      }
    }
  }

  // Observed scan statistic: min(z) across ALL windows (most negative = most clustered)
  let obsScanStat=Infinity;
  for(const w of allWindowResults){
    if(w.rawZ<obsScanStat) obsScanStat=w.rawZ;
  }

  // Helper: compute min windowed z for a difference array (no allocation of result objects)
  function minWindowZ(diffs,win,stride){
    let minZ=Infinity;
    for(let s=0;s+win<=diffs.length;s+=stride){
      const wr=windowRunsZ(diffs,s,win);
      if(wr&&wr.z<minZ) minZ=wr.z;
    }
    return minZ;
  }

  // Global flag (computed before scan to determine esGate)
  const runsRatio = totalExp>0 ? totalRuns/totalExp : 1;
  const esGate = nR>=500 && runsRatio>0.70;
  const globalFlag=esGate?"LOW":flagFromP(pooled.p);

  // Permutation scan — skip entirely when esGate fires (large N, trivial deficit)
  let scanP=1;
  if(!esGate&&obsScanStat<Infinity&&scanSeqs.length>0){
    const maxN=Math.max(...scanSeqs.map(s=>s.diffs.length));
    const N_PERM=maxN<=100?999:maxN<=1000?499:199;
    // S159c — one Float64Array shuffle buffer per scanSeq, allocated once.
    // Replaces `seq.diffs.slice()` per perm and the destructuring swap temp.
    const shuffledBufs = scanSeqs.map(seq => new Float64Array(seq.diffs.length));
    let exceedCount=0;
    for(let perm=0;perm<N_PERM;perm++){
      let permMin=Infinity;
      for(let si=0; si<scanSeqs.length; si++){
        const seq = scanSeqs[si];
        const n=seq.diffs.length;
        const shuffled = shuffledBufs[si];
        // Refill from diffs then Fisher-Yates shuffle in place.
        for(let i=0;i<n;i++) shuffled[i]=seq.diffs[i];
        for(let i=n-1;i>0;i--){
          const j=Math.floor(rng.random()*(i+1));
          const tmp=shuffled[i]; shuffled[i]=shuffled[j]; shuffled[j]=tmp;
        }
        const pm=minWindowZ(shuffled,WIN,seq.stride);
        if(pm<permMin) permMin=pm;
      }
      if(permMin<=obsScanStat) exceedCount++;
    }
    scanP=(exceedCount+1)/(N_PERM+1);
  }

  // Sort windows by z (most negative first) for display
  allWindowResults.sort((a,b)=>a.rawZ-b.rawZ);

  // S95 Track A Item 4: sub-unit BH-FDR escalation capped at MODERATE.
  // Previously the overall flag was "more severe of global and windowed scan,"
  // which allowed the windowed scan to escalate to HIGH. Now windows and pairs
  // act as sub-units that can PROMOTE to MODERATE only — never above, never demote.
  // Consistent with Autocorrelation, Kurtosis, ConstOffset, IRC, LOESS, Regional Noise, Selective Noise.
  const windowRawPs = esGate ? [] : allWindowResults.map(w => zToP(w.rawZ));
  const windowAdjPs = windowRawPs.length ? bhFDR(windowRawPs) : [];
  const anyWindowFlagged = windowAdjPs.some(p => p < ALPHA.FLAG);
  const anyPairFlagged = runsAdjPs.some(p => p < ALPHA.FLAG);
  const subUnitPromoted = anyWindowFlagged || anyPairFlagged;
  const promotedFlag = subUnitPromoted ? "MODERATE" : "LOW";
  // Start from globalFlag; allow sub-unit to promote only up to MODERATE, never demote.
  const flag = flagRankOf(promotedFlag) > flagRankOf(globalFlag) ? promotedFlag : globalFlag;

  // Display: keep windows flagged at raw z < -1.96 for evidence listing.
  const windowScanFlag = anyWindowFlagged ? "MODERATE" : null;
  const winSig = anyWindowFlagged ? allWindowResults.filter(w => w.rawZ < -1.96).slice(0, 20) : [];
  winSig.forEach(w => { w.significant = true; w.scanP = scanP; w.source = "window"; });

  // primaryP: best of pooled, scan p, strongest pair, strongest window (for display only)
  const bestPairP = anyPairFlagged ? Math.min(...runsAdjPs.filter(p => p < ALPHA.FLAG)) : 1;
  const bestWindowP = anyWindowFlagged ? Math.min(...windowAdjPs.filter(p => p < ALPHA.FLAG)) : 1;
  const bestP = Math.min(pooled.p, scanP, bestPairP, bestWindowP);

  // Generate matched simulated permutation for strip display
  // Shuffle the worst pair's sign array ~50 times, pick closest to expected runs
  const displayPair = extremePair || worstPair;
  let simSigns = displayPair?.signs || null;
  let simRuns = 0;
  if (simSigns && rng && simSigns.length >= 5) {
    const targetRuns = displayPair.expected;
    const buf = [...simSigns];
    let bestSim = [...buf], bestDist = Infinity;
    for (let trial = 0; trial < 50; trial++) {
      for (let i = buf.length - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        const tmp = buf[i]; buf[i] = buf[j]; buf[j] = tmp;
      }
      const bufNZ = buf.filter(s => s !== 0);
      let runs = bufNZ.length ? 1 : 0;
      for (let i = 1; i < bufNZ.length; i++) if (bufNZ[i] !== bufNZ[i-1]) runs++;
      const dist = Math.abs(runs - targetRuns);
      if (dist < bestDist) { bestDist = dist; bestSim = [...buf]; simRuns = runs; if (dist === 0) break; }
    }
    simSigns = bestSim;
  } else if (simSigns) {
    const simNZ = simSigns.filter(s => s !== 0);
    simRuns = simNZ.length ? 1 : 0;
    for (let i = 1; i < simNZ.length; i++) if (simNZ[i] !== simNZ[i-1]) simRuns++;
  }

  return { name:"Runs Test", category:"replicate",
    description:"In random data, which replicate is larger should switch back and forth unpredictably as you go down the rows. If one replicate stays consistently above another for long stretches, the row ordering is not random \u2014 suggesting the values were constructed sequentially rather than measured independently.",
    nRows: matrix.length,
    nSignificant:nSig, nPairs:res.length,
    pooledMeanZ:pooledMeanZ.toFixed(3), pooledT:pooled.t.toFixed(3), pooledP:pooled.p.toFixed(4), primaryP:bestP,
    pooledZSD, pooledZSE, pooledZCI95,
    // Observed/expected runs ratio over all pairs. Drives the N>=500
    // effect-size gate (runsRatio > 0.70 → LOW even when p-value would
    // otherwise flag). METHODOLOGY Tier 2 references this gate; field
    // exposed so downstream diagnostics and audits can read the same
    // value the test gates on.
    obsOverExp: runsRatio,
    windowScanP:scanP, windowSigCount:winSig.length, nWindowsTested:nWindows,
    // Display pair: use the most extreme pair (worst by |z|), not R1-R2
    firstPairSigns:(extremePair||worstPair)?.signs||null,
    firstPairPos:(extremePair||worstPair)?.pos||null,
    firstPairRuns:(extremePair||worstPair)?.runs||null,
    firstPairExp:(extremePair||worstPair)?.expected||null,
    firstPairCol1:(extremePair||worstPair)?.col1??0,
    firstPairCol2:(extremePair||worstPair)?.col2??1,
    worstPairLabel:(extremePair||worstPair)?.pair||null,
    mostExtremePair:extremePair?`${extremePair.pair}: ${extremePair.runs} runs (exp: ${extremePair.expected}, z=${extremePair.z.toFixed(1)})`:null,
    // Matched simulated permutation for strip display
    matchedSimSigns: simSigns, matchedSimRuns: simRuns,
    // Per-pair sign sequences for significant pairs (for multi-strip display, capped at 20)
    pairSignSeqs: [...res].sort((a,b) => parseFloat(a.z) - parseFloat(b.z))
      .filter(r => r.significant)
      .slice(0, 20)
      .map(r => ({ pair: r.pair, col1: r.col1, col2: r.col2, signs: r.signs, pos: r.pos, runs: r.runs, expected: Math.round(parseFloat(r.expected)) })),
    // All pair stats for evidence table (no sign arrays — lightweight)
    allPairStats: [...res].sort((a,b) => parseFloat(a.z) - parseFloat(b.z))
      .map(r => ({ pair: r.pair, col1: r.col1, col2: r.col2, runs: r.runs, expected: r.expected, z: r.z, p: r.p, adjP: r.adjP, significant: r.significant })),
    flag, details:[...winSig.map(w=>({...w,source:"window"})),...res.slice(0,15)] };
}

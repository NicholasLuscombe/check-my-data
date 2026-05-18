import { mean, stddev, kurtosis, trimmedKurtosis, normalCDF, zToP, fitPredictedSigma, bhFDR } from "../stats/primitives.js";
import { flagFromP, ALPHA, EFFECT_SIZE } from "../constants/thresholds.js";

/* 6. Excess Kurtosis */

// ── S159b scratch-buffer helpers ──────────────────────────────────────
// The N_SIM = 1999 simulation loop calls trimmedKurtosis/kurtosis + adStatistic
// on a per-sim batchDiffs array. Pre-S159b each sim allocated:
//   - batchDiffs = []            (1× per sim)
//   - simRow = []                (× nValidRows per sim → ~600k allocs/fixture)
//   - sorted = arr.slice().sort()   inside adStatistic     (1× per sim)
//   - sorted + trimmed slices       inside trimmedKurtosis (2× per sim, useRobust)
// On DS20 this compounded to tens of thousands of length-~8k Array allocations
// + hundreds of thousands of length-nC Array allocations per testKurtosis call.
// Browser GC contention dominated wallclock; Node V8 absorbed it cheaply.
// The helpers below accept pre-allocated Float64Array scratch and avoid all
// per-call slicing/sorting/spreading. Statistical results are bit-identical
// to the primitives versions (same formulas, same operation order; mean uses
// arr.reduce style fold but with explicit indexed loops over a typed buffer).

/** Kurtosis on buf[start..end) — matches primitives.kurtosis exactly:
 *  m = Σx / N, s = √(Σ(x−m)² / (N−1)), return Σ((x−m)/s)⁴ / N − 3. */
function kurtosisOfRange(buf, start, end) {
  const N = end - start;
  if (N < 4) return NaN;
  let sumX = 0;
  for (let i = start; i < end; i++) sumX += buf[i];
  const m = sumX / N;
  let sumD2 = 0;
  for (let i = start; i < end; i++) { const d = buf[i] - m; sumD2 += d * d; }
  const variance = sumD2 / Math.max(N - 1, 1);
  if (variance === 0) return NaN;
  const s = Math.sqrt(variance);
  let sum4 = 0;
  for (let i = start; i < end; i++) {
    const z = (buf[i] - m) / s;
    sum4 += z * z * z * z;
  }
  return sum4 / N - 3;
}

/** trimmedKurtosis equivalent on a sorted region. Caller must have already
 *  sorted buf[0..n) ascending. cut = max(1, floor(n × 0.02)); kurtosis is
 *  computed over buf[cut..n−cut). Mirrors primitives.trimmedKurtosis. */
function trimmedKurtosisOfSorted(sortedBuf, n) {
  const cut = Math.max(1, Math.floor(n * 0.02));
  if (n - 2 * cut < 4) return NaN;
  return kurtosisOfRange(sortedBuf, cut, n - cut);
}

/** Anderson-Darling A² against N(0, √2) on a sorted region. Caller must have
 *  already sorted buf[0..n) ascending. Mirrors the inner adStatistic in the
 *  pre-S159b code (identical formula, no slice/sort allocation). */
function adStatisticOfSorted(sortedBuf, n) {
  if (n < 8) return NaN;
  const sqrt2 = Math.SQRT2;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const Fi  = Math.max(1e-10, Math.min(1 - 1e-10, normalCDF(sortedBuf[i] / sqrt2)));
    const Fni = Math.max(1e-10, Math.min(1 - 1e-10, normalCDF(sortedBuf[n - 1 - i] / sqrt2)));
    sum += (2 * (i + 1) - 1) * (Math.log(Fi) + Math.log(Fni));
  }
  return -n - sum / n;
}

/**
 * Detects non-normal noise distributions (platykurtic from uniform RNG or leptokurtic anomalies) via kurtosis and Anderson-Darling tests.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns, minimum 2 columns and 20 rows).
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} condCtx - Unified condition context for condition-stratified analysis.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, pooledKurtosis: number|null, simKurtosis: number|null, kurtDeviation: string, pooledP: string, normDiffs: number[], simDiffs: number[], condKurtosis: object[]|null, details: object[] }} Result with pooled kurtosis, simulation-based p-value, Anderson-Darling statistic, condition-stratified analysis, and normalized difference histograms.
 * @see METHODOLOGY.md §"2.2 Excess Kurtosis + Anderson-Darling"
 */
export function testKurtosis(matrix, condCtx, rng) {
  // Extract row conditions from condCtx (properly scoped to this matrix)
  const rowConditions = condCtx?.rowConditions || null;
  const rowConditionsCols = condCtx?.rowConditionsCols || null;
  const nR=matrix.length, nC=matrix[0]?.length||0;
  if(nC<2||nR<20) return {name:"Excess Kurtosis",category:"replicate",flag:"N/A",description:"Insufficient data (≥2 cols, ≥20 rows)."};

  // Per-row local sigma and means
  const localSigma=matrix.map(row=>{
    const vals=row.filter(v=>v!=null);
    return vals.length>=2?stddev(vals):null;
  });

  // ── Predicted-σ via mean-variance fit (Item 3, §5.2) ─────────────────
  // At small nC (≤3), per-row σ bounds d/σ near ±√(nC-1), creating
  // artefactual platykurtosis that matches the simulation null → test blind.
  // Predicted σ from the global mean-variance fit breaks this dependency.
  const { sigma: predictedSigma, used: usePredicted } = fitPredictedSigma(matrix);

  // Choose normalization: predicted σ when available, else per-row σ
  const sigma = usePredicted ? predictedSigma : localSigma;

  const res=[];
  const histDiffs=[];
  const HIST_CAP = 50000;
  let _hN=0, _hM=0, _hM2=0, _hM4=0;

  for(let c1=0;c1<nC;c1++) for(let c2=c1+1;c2<nC;c2++){
    const diffs=[];
    for(let r=0;r<nR;r++){
      if(matrix[r][c1]!=null&&matrix[r][c2]!=null){
        const d=matrix[r][c1]-matrix[r][c2];
        diffs.push(d);
        if(sigma[r]&&sigma[r]>0){
          const nd=d/sigma[r];
          _hN++; const d1=nd-_hM; _hM+=d1/_hN; const d2=nd-_hM; _hM2+=d1*d2;
          if(histDiffs.length<HIST_CAP) histDiffs.push(nd);
          else { const j=Math.floor(rng.random()*_hN); if(j<HIST_CAP) histDiffs[j]=nd; }
        }
      }
    }
    if(diffs.length<20) continue;
    const m=mean(diffs), s=stddev(diffs); if(s===0) continue;
    const z_norm=diffs.map(d=>(d-m)/s);
    const k=kurtosis(z_norm); if(isNaN(k)) continue;
    const se=Math.sqrt(24/z_norm.length), z=k/se, p=zToP(z);
    res.push({pair:`${c1+1}–${c2+1}`,kurtosis:k.toFixed(4),z:z.toFixed(3),p:p.toFixed(4),
      interpretation:k<-1?"Platykurtic (too uniform)":k>1?"Leptokurtic (too peaked)":"Near normal",
      rawP:p});
  }
  const kurtAdjPs=bhFDR(res.map(r=>r.rawP));
  res.forEach((r,i)=>{r.pAdj=kurtAdjPs[i].toFixed(4);r.significant=kurtAdjPs[i]<0.01;});
  const nSig=res.filter(r=>r.significant).length;
  const nPlat=res.filter(r=>parseFloat(r.kurtosis)<-1&&r.significant).length;
  // Robust kurtosis: trim top/bottom 2% to suppress outlier-driven leptokurtosis.
  // Only at nR >= 200 — small datasets can't afford to lose rows, and outliers
  // don't dominate the 4th moment with few pairs. Same trim on observed + simulated.
  const useRobust = nR >= 200;
  const pooledKurtosis=histDiffs.length>=20?(useRobust?trimmedKurtosis(histDiffs):kurtosis(histDiffs)):NaN;

  // --- Anderson-Darling statistic (Item 3 enhancement) ---
  // A-D tests full distributional shape against N(0, √2) — the expected distribution
  // of d/σ̂ under H₀. More powerful than kurtosis (a single 4th-moment) for detecting
  // uniform noise because it uses all CDF information, especially tail deficiency.
  // CDF of N(0, √2) at x: Φ(x/√2)
  function adStatistic(arr) {
    if (arr.length < 8) return NaN;
    const sorted = arr.slice().sort((a, b) => a - b);
    const n = sorted.length;
    const sqrt2 = Math.SQRT2;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const Fi = Math.max(1e-10, Math.min(1 - 1e-10, normalCDF(sorted[i] / sqrt2)));
      const Fni = Math.max(1e-10, Math.min(1 - 1e-10, normalCDF(sorted[n - 1 - i] / sqrt2)));
      sum += (2 * (i + 1) - 1) * (Math.log(Fi) + Math.log(Fni));
    }
    return -n - sum / n;
  }
  const observedAD = histDiffs.length >= 20 ? adStatistic(histDiffs) : NaN;

  // --- Simulation-based p-value ---
  // Run independent simulation batches, compute BOTH pooled κ AND A² for each batch.
  // Rank observed statistics against null distributions. Use the more powerful of the two.
  const validRowCount = sigma.reduce((n, s, r) =>
    s && s > 0 && matrix[r].some(v => v != null) ? n + 1 : n, 0);
  const N_SIM = 1999; // p-value floor = 1/2000 = 0.0005 — allows FLAGGED (p < 0.001)
  const MAX_SIM_ROWS = 500;
  const MAX_SIM_PAIRS = 30; // Cap pairs in simulation — null distribution shape doesn't depend on using all pairs
  const simSubsample = validRowCount > MAX_SIM_ROWS;
  const simKurts = [];
  const simADs = [];
  const simDiffs = [];
  let _sN = 0;

  const validRowIdxs = [];
  for (let r = 0; r < nR; r++) {
    if (sigma[r] && sigma[r] > 0 && matrix[r].some(v => v != null)) validRowIdxs.push(r);
  }

  // Pre-select pairs for simulation (subsample if many)
  const allPairIndices = [];
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) allPairIndices.push([c1, c2]);
  let simPairs = allPairIndices;
  if (allPairIndices.length > MAX_SIM_PAIRS) {
    // Deterministic subsample: evenly spaced
    simPairs = [];
    const step = allPairIndices.length / MAX_SIM_PAIRS;
    for (let i = 0; i < MAX_SIM_PAIRS; i++) simPairs.push(allPairIndices[Math.floor(i * step)]);
  }

  // S159b — pre-allocate sim-loop scratch buffers. Caps are upper bounds on
  // the per-sim working set; actual fills are tracked by batchLen each sim.
  // nRowsForBatch caps validRowIdxs.length at MAX_SIM_ROWS when simSubsample
  // is active; simPairs is already bounded by MAX_SIM_PAIRS. Worst case
  // batchCap = 500 × 30 = 15000 doubles = 120 KB.
  const nRowsForBatch = simSubsample ? MAX_SIM_ROWS : validRowIdxs.length;
  const batchCap = Math.max(1, nRowsForBatch * simPairs.length);
  const batchBuf  = new Float64Array(batchCap);
  const sortBuf   = new Float64Array(batchCap);
  const simRowBuf = new Float64Array(nC);
  // Shuffle buffer only allocated when subsampling actually fires.
  const shuffledBuf = simSubsample ? new Int32Array(validRowIdxs.length) : null;

  // S159d — pilot-simulation early-skip gate (kurtP branch / nC ≥ 4 only).
  // Run a short pilot of N_PILOT iterations; if the observed pooledKurtosis
  // sits clearly within the null body (|obs − pilotMedian| < pilotMAD ×
  // PILOT_GATE_FACTOR), the test is mathematically destined for LOW and the
  // remaining 1949 simulation iterations are wasted compute. Audit
  // (SESSION159d) showed this gate fires on essentially all clean fixtures
  // and never on the HIGH-Kurtosis fixtures (DS20 obsDev ≈ 1.0 vs MAD ≈ 0.07,
  // 14× margin against the gate threshold).
  //
  // Spec/literal-form note: the S159d prompt's gate `abs(obs) < median ×
  // GATE_FACTOR` is degenerate for this branch because simKurts is
  // approximately symmetric around 0 under H₀ on the kurtP branch (zero
  // excess kurtosis is the asymptotic Gaussian null). The MAD-around-median
  // form captured here matches the prompt's stated intent ("less than half
  // the typical null kurtosis — a 2× safety margin") and the post-loop
  // two-sided p-value's `|sk − simMedian| ≥ obsDev` counting formula.
  //
  // PRNG preservation: 10 tests downstream of Kurtosis in engine.js
  // dispatch consume rng (Entropy, Column GoF, Autocorrelation, Windowed
  // Autocorrelation, Runs Test, Within-Row Variance, LOESS, Row-Mean Runs,
  // Regional Noise, plus the kept-for-signature Modality slot). Skipping
  // remaining iterations without burning their PRNG calls would diverge
  // every downstream test. The per-iter call count is deterministic given
  // the fixture (all validRowIdxs have sigR > 0 by construction at filter
  // line above), so the burn loop replays the exact (random, randn) call
  // pattern of the would-have-been sim iter — `random()` first if
  // simSubsample fires, then `randn()` × rowsForBatch × nC. Box-Muller's
  // internal `_bmSpare` state evolves identically because the call order
  // and count match.
  const N_PILOT = 50;
  const PILOT_GATE_FACTOR = 0.5;
  const burnRandomPerIter = simSubsample ? MAX_SIM_ROWS : 0;
  const burnRandnPerIter  = (simSubsample ? MAX_SIM_ROWS : validRowIdxs.length) * nC;
  let earlyExit = false;

  for (let b = 0; b < N_SIM; b++) {
    if (earlyExit) {
      // Burn this iter's PRNG quota to preserve downstream-test reproducibility.
      for (let i = 0; i < burnRandomPerIter; i++) rng.random();
      for (let i = 0; i < burnRandnPerIter;  i++) rng.randn();
      continue;
    }
    let batchLen = 0;
    let rowsToUse = validRowIdxs;
    let rowsStart = 0;
    let rowsEnd = validRowIdxs.length;
    if (simSubsample) {
      // Copy validRowIdxs into shuffledBuf (Int32 view), then partial
      // Fisher-Yates on the trailing MAX_SIM_ROWS slots — preserves the
      // exact PRNG call count and order of the pre-S159b path.
      for (let i = 0; i < validRowIdxs.length; i++) shuffledBuf[i] = validRowIdxs[i];
      for (let i = shuffledBuf.length - 1; i > 0 && shuffledBuf.length - i <= MAX_SIM_ROWS; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        const tmp = shuffledBuf[i]; shuffledBuf[i] = shuffledBuf[j]; shuffledBuf[j] = tmp;
      }
      rowsToUse = shuffledBuf;
      rowsStart = shuffledBuf.length - MAX_SIM_ROWS;
      rowsEnd = shuffledBuf.length;
    }
    if (usePredicted) {
      for (let ri = rowsStart; ri < rowsEnd; ri++) {
        const r = rowsToUse[ri];
        const sigR = predictedSigma[r];
        if (!sigR || sigR <= 0) continue;
        for (let c = 0; c < nC; c++) simRowBuf[c] = sigR * rng.randn();
        for (let pi = 0; pi < simPairs.length; pi++) {
          const pair = simPairs[pi];
          batchBuf[batchLen++] = (simRowBuf[pair[0]] - simRowBuf[pair[1]]) / sigR;
        }
      }
    } else {
      for (let ri = rowsStart; ri < rowsEnd; ri++) {
        const r = rowsToUse[ri];
        const sigR = localSigma[r];
        if (!sigR || sigR <= 0) continue;
        for (let c = 0; c < nC; c++) simRowBuf[c] = sigR * rng.randn();
        let simSum = 0;
        for (let c = 0; c < nC; c++) simSum += simRowBuf[c];
        const simMean = simSum / nC;
        let simSS = 0;
        for (let c = 0; c < nC; c++) { const d = simRowBuf[c] - simMean; simSS += d * d; }
        const simSD = Math.sqrt(simSS / Math.max(nC - 1, 1));
        if (simSD <= 0) continue;
        for (let pi = 0; pi < simPairs.length; pi++) {
          const pair = simPairs[pi];
          batchBuf[batchLen++] = (simRowBuf[pair[0]] - simRowBuf[pair[1]]) / simSD;
        }
      }
    }
    if (batchLen >= 20) {
      // Both adStatistic and trimmedKurtosis need sorted input. Sort once
      // into sortBuf and have the two helpers consume the same sorted view.
      // Non-robust kurtosis is order-invariant, so reading from sortBuf is
      // numerically identical to reading from batchBuf.
      for (let i = 0; i < batchLen; i++) sortBuf[i] = batchBuf[i];
      // Float64Array.sort() is numerical-ascending by default — no comparator
      // needed (avoids the `(a,b)=>a-b` closure entirely).
      sortBuf.subarray(0, batchLen).sort();
      simKurts.push(useRobust
        ? trimmedKurtosisOfSorted(sortBuf, batchLen)
        : kurtosisOfRange(sortBuf, 0, batchLen));
      simADs.push(adStatisticOfSorted(sortBuf, batchLen));
      if (b === 0) { for (let i = 0; i < batchLen; i++) { simDiffs.push(batchBuf[i]); _sN++; } }
    }
    // S159d — pilot-gate evaluation, ONCE after iter N_PILOT-1 (b+1 == N_PILOT).
    // Restricted to kurtP branch (nC ≥ 4); A-D branch always runs full sim per
    // S159d audit (Marsaglia analytic is structurally wrong under small-nC
    // studentization-bounded d/σ̂). The check is cheap (≤ 50 entries to sort +
    // 50 abs-deviations to sort), evaluated once per testKurtosis call.
    if (!earlyExit && b + 1 === N_PILOT && nC >= 4 && simKurts.length >= 20 && !isNaN(pooledKurtosis)) {
      const sortedPilot = simKurts.slice().sort((x, y) => x - y);
      const pilotSimMedian = sortedPilot[Math.floor(sortedPilot.length / 2)];
      const pilotDevs = new Array(simKurts.length);
      for (let i = 0; i < simKurts.length; i++) pilotDevs[i] = Math.abs(simKurts[i] - pilotSimMedian);
      pilotDevs.sort((x, y) => x - y);
      const pilotSimMAD = pilotDevs[Math.floor(pilotDevs.length / 2)];
      const obsDev = Math.abs(pooledKurtosis - pilotSimMedian);
      if (pilotSimMAD > 0 && obsDev < pilotSimMAD * PILOT_GATE_FACTOR) {
        earlyExit = true;
      }
    }
  }
  const simKurt = simKurts.length >= 20 ? mean(simKurts) : NaN;

  const pooledN = _hN;
  const kurtDeviation = !isNaN(pooledKurtosis) && !isNaN(simKurt) ? pooledKurtosis - simKurt : 0;

  // Kurtosis simulation p-value (two-sided).
  // S159d — when the pilot gate fired, the observed stat is within half-MAD
  // of the null body; the two-sided formula would compute kurtP ≥ 0.5
  // (by construction: gate-firing condition implies ≥ half of simKurts have
  // larger absolute deviation than the observed). Override to 1.0 explicitly
  // per the S159d spec ("return p = 1.0, definitively null") so the reported
  // primaryP reads as the null result rather than a fractional value derived
  // from the 50-entry pilot null.
  let kurtP = 1;
  if (earlyExit) {
    kurtP = 1.0;
  } else if (simKurts.length >= 20 && !isNaN(pooledKurtosis)) {
    const simMedian = simKurts.slice().sort((a, b) => a - b)[Math.floor(simKurts.length / 2)];
    const obsDev = Math.abs(pooledKurtosis - simMedian);
    const nExceed = simKurts.filter(sk => Math.abs(sk - simMedian) >= obsDev).length;
    kurtP = (nExceed + 1) / (simKurts.length + 1);
  }

  // Anderson-Darling simulation p-value (one-sided: observed A² > simulated)
  let adP = 1;
  if (earlyExit) {
    // adP is unused downstream on the gate-firing path (kurtP branch is
    // active iff nC ≥ 4; pooledP = kurtP). Override for return-shape
    // consistency.
    adP = 1.0;
  } else if (simADs.length >= 20 && !isNaN(observedAD)) {
    const nExceed = simADs.filter(a => a >= observedAD).length;
    adP = (nExceed + 1) / (simADs.length + 1);
  }

  // Flag: adaptive p-value selection based on n_rep.
  // At n_rep ≤ 3, studentization bounds d/σ near ±√2, compressing the kurtosis
  // distribution so the 4th moment has almost no power. A-D (full CDF shape)
  // fills this gap. At n_rep ≥ 4, kurtosis has enough room and A-D's undirected
  // power becomes a false-positive liability on clean data.
  const pooledP = nC <= 3 ? adP : kurtP;

  // S109 Part 2 gate rewrite (METHODOLOGY §2.2): forensically, "too smooth"
  // (platykurtic, κDev < 0) flags fabrication; "too noisy" (leptokurtic,
  // κDev ≥ 0) is biological heavy-tailedness, informational only.
  // (i) Directional suppression: κDev ≥ 0 → no flag contribution regardless
  //     of pooledP. Lept. displayed in evidence table as informational.
  // (ii) N-adaptive effect-size floor: 1.96·SD(κ̂) = 1.96·√(24/pooledN) is
  //      the asymptotic 95% null SE; floor at 0.20 (min effect size).
  //      At pooledN=600 this is ~0.40; at pooledN=2863 (DS21 v2) ~0.18 → 0.20 floor.
  //      Suppresses small-N true-FP zone (N=200/nRep=3) where κ̂ variance
  //      pushes |κDev|>0.20 by chance alone on iid-Gaussian.
  const adaptiveThreshold = Math.max(0.20, 1.96 * Math.sqrt(24 / Math.max(pooledN, 1)));
  const directionalSuppress = kurtDeviation >= 0;
  const effectSizeSuppress = Math.abs(kurtDeviation) < adaptiveThreshold;
  const esGate = directionalSuppress || effectSizeSuppress;
  const flag = esGate ? "LOW" : flagFromP(pooledP);

  // ── Condition-stratified kurtosis ──────────────────────────────────────
  // When condition labels are present, compute per-condition κDev using the
  // same simulation null already built above. A large spread in κDev across
  // conditions (especially platykurtic in one, normal in another) is the
  // primary signal for condition-localised fabrication (e.g. Ariely Cambria/Calibri).
  // When multiple COND columns are present, stratify on each independently
  // so the fabrication signal isn't diluted by 4-way merged labels.
  let condKurtosis = null;
  if (simKurts.length >= 20) {
    // Build list of condition arrays to stratify on:
    // prefer per-column arrays (each COND col independently) over merged labels
    const condArraysToTest = rowConditionsCols && rowConditionsCols.length >= 2
      ? rowConditionsCols
      : (rowConditions ? [rowConditions] : []);

    // Helper: compute κDev + p for a given condition grouping
    function stratifyKurtosis(condArray) {
      const condIdx = {};
      for (let r = 0; r < nR; r++) {
        const c = condArray[r];
        if (c) { if (!condIdx[c]) condIdx[c] = []; condIdx[c].push(r); }
      }
      const results = [];
      for (const [cond, idxs] of Object.entries(condIdx)) {
        if (idxs.length < 20) continue;
        const condDiffs = [];
        for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
          for (const r of idxs) {
            if (matrix[r][c1] != null && matrix[r][c2] != null && sigma[r] && sigma[r] > 0) {
              condDiffs.push((matrix[r][c1] - matrix[r][c2]) / sigma[r]);
            }
          }
        }
        if (condDiffs.length < 20) continue;
        const condK = useRobust ? trimmedKurtosis(condDiffs) : kurtosis(condDiffs);
        if (isNaN(condK)) continue;
        const condKDev = condK - (isNaN(simKurt) ? 0 : simKurt);
        const simMedian = simKurts.slice().sort((a, b) => a - b)[Math.floor(simKurts.length / 2)];
        const obsDev = Math.abs(condK - simMedian);
        const nExceed = simKurts.filter(sk => Math.abs(sk - simMedian) >= obsDev).length;
        const condP = (nExceed + 1) / (simKurts.length + 1);
        const condFlag = flagFromP(condP);
        const condIsLepto = condKDev > EFFECT_SIZE.KURTOSIS_DEV && condFlag !== "LOW";
        results.push({
          condition: cond, n: idxs.length, nDiffs: condDiffs.length,
          kurtosis: condK.toFixed(4), kurtDeviation: condKDev.toFixed(4),
          p: condP.toFixed(4), rawP: condP, flag: condFlag,
          verdict: condFlag === "HIGH" ? "flagged" : condFlag === "MODERATE" ? "noted" : "clear",
          platykurtic: condKDev < -EFFECT_SIZE.KURTOSIS_DEV,
          isLeptokurtic: condIsLepto,
          normDiffs: condDiffs  // stored for per-condition histogram display
        });
      }
      return results.sort((a, b) => parseFloat(a.kurtDeviation) - parseFloat(b.kurtDeviation));
    }

    // Run stratification on each condition axis and pick the most informative
    let bestResults = null;
    let bestSpread = 0;
    for (const condArray of condArraysToTest) {
      const res = stratifyKurtosis(condArray);
      if (res.length < 2) continue;
      const spread = parseFloat(res[res.length-1].kurtDeviation) - parseFloat(res[0].kurtDeviation);
      if (spread > bestSpread) { bestSpread = spread; bestResults = res; }
    }
    // Also run on merged labels if different from best
    if (rowConditions && condArraysToTest.length > 1) {
      const mergedRes = stratifyKurtosis(rowConditions);
      if (mergedRes.length >= 2) {
        const mergedSpread = parseFloat(mergedRes[mergedRes.length-1].kurtDeviation) - parseFloat(mergedRes[0].kurtDeviation);
        if (mergedSpread > bestSpread) { bestSpread = mergedSpread; bestResults = mergedRes; }
      }
    }

    if (bestResults && bestResults.length >= 2) {
      condKurtosis = bestResults;
      // Condition-level BH-FDR promotion: collect per-condition p-values,
      // apply BH-FDR, promote if any survives ALPHA.FLAG. Consistent with
      // Autocorr/Runs/IRC pair-level promotion.
      // S109 Part 2: directional suppression also applies per-condition — only
      // platykurtic (κDev < 0) conditions can promote. Leptokurtic-positive
      // per-condition signals are informational only.
      const platyResults = bestResults.filter(c => parseFloat(c.kurtDeviation) < 0);
      const condPs = platyResults.map(c => c.rawP).filter(p => p != null && isFinite(p) && p > 0);
      if (condPs.length >= 1 && flag === "LOW") {
        const condAdjPs = bhFDR(condPs);
        if (condAdjPs.some(p => p < ALPHA.FLAG)) {
          Object.assign(condKurtosis, { promoted: true, promotedFlag: "MODERATE" });
        }
      }
    }
  }

  // Final flag: if condition stratification promoted and pooled missed, use MODERATE
  const finalFlag = (condKurtosis?.promoted && flag === "LOW") ? "MODERATE" : flag;

  return { name:"Excess Kurtosis", category:"replicate",
    description:`Random noise between replicates follows a bell-shaped pattern — most differences are small, with fewer large ones. This card tests whether the noise shape is unusual: too flat (values too evenly spaced) or too peaked (clustered near zero with occasional large jumps).`,
    adNote: nC<=3 ? `With ${nC} replicates, full-distribution shape (Anderson-Darling) is tested instead of kurtosis alone.` : null,
    nSignificant:nSig, nPlatykurtic:nPlat, nPairs:res.length,
    pooledKurtosis:isNaN(pooledKurtosis)?null:pooledKurtosis,
    simKurtosis:isNaN(simKurt)?null:simKurt,
    kurtDeviation:kurtDeviation.toFixed(4),
    nSimulations: simKurts.length,
    ...(nC <= 3
      ? { andersonDarlingP: adP.toFixed(4) }
      : { kurtosisP: kurtP.toFixed(4) }),
    _kurtosisP: kurtP.toFixed(4), _andersonDarlingP: adP.toFixed(4),
    pooledN, pooledP:pooledP.toFixed(4), primaryP: finalFlag==="MODERATE" && condKurtosis?.promoted
      ? Math.min(pooledP, condKurtosis[0].rawP)
      : pooledP,
    // S109 Part 2 gate rewrite — report threshold and suppression mode used.
    adaptiveThreshold: adaptiveThreshold.toFixed(4),
    esGateMode: directionalSuppress ? "directional (leptokurtic, informational)"
      : effectSizeSuppress ? `effect-size (|κDev| < ${adaptiveThreshold.toFixed(4)})`
      : "active (flag from p-value)",
    normDiffs:histDiffs, simDiffs,
    condKurtosis, isPromoted: !!(condKurtosis?.promoted),
    flag: finalFlag, details:res.slice(0,15) };
}

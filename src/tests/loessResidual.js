import { mean, variance, cusumStat, loessSmooth, bhFDR, fitPredictedSigma } from "../stats/primitives.js";
import { flagFromP, ALPHA, flagRankOf } from "../constants/thresholds.js";

/* 20. LOESS Residual Analysis
   Detects regions where noise character changes — indicating partial fabrication
   (e.g., rows 80–120 have smoother noise from extrapolation or manual editing).

   Method: For each replicate pair, compute absolute inter-replicate differences.
   Fit a LOESS smoother to |diff| vs row index. Compute LOESS residuals.
   Sliding-window variance of LOESS residuals detects regions where the residual
   variance is systematically different from the rest. Permutation null (row-shuffle).

   This complements Regional Noise (which tests column-vs-global variance) by
   detecting changes in noise CHARACTER — a region where residuals are too smooth
   (low variance of |diff|) or too rough, regardless of mean level.

   Reference: Cleveland & Devlin (1988) LOESS. Killick & Eckley (2014) changepoint.
*/
/**
 * Detects regions where noise character changes using LOESS residual variance scan and CUSUM changepoint detection.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @returns {{ name: string, category: string, flag: string, description: string, nWindows: number, scanStat: string, scanP: number, cusumP: number, changepointRow: number, changepointDirection: string, nPerm: number, bestWindowRows: string, bestVarRatio: string, bestDirection: string, loessSpan: string, globalResidVar: string, nValidRows: number, noiseProfile: Array<{ row: number, noise: number, fit: number }>, primaryP: number, pairPromoted: boolean, interpretation: string, details: Array }}
 * @see METHODOLOGY.md §"2.7 LOESS Residual Analysis with CUSUM Changepoint"
 */
export function testLoessResidual(matrix, rng) {
  const NAME = "LOESS Residual Analysis";
  const CAT = "replicate";
  const nR = matrix.length, nC = matrix[0]?.length || 0;

  if (nC < 2 || nR < 30) return { name: NAME, category: CAT, flag: "N/A",
    description: `Need ≥2 replicate columns and ≥30 rows for LOESS analysis (have ${nR} rows × ${nC} cols).` };

  // Step 1: compute mean absolute inter-replicate difference per row
  const rowAbsDiffs = [];
  const validRows = [];
  for (let r = 0; r < nR; r++) {
    const vals = matrix[r].filter(v => v != null && isFinite(v));
    if (vals.length < 2) { rowAbsDiffs.push(null); continue; }
    let sumAD = 0, nPairs = 0;
    for (let i = 0; i < vals.length - 1; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        sumAD += Math.abs(vals[i] - vals[j]);
        nPairs++;
      }
    }
    const mad = nPairs > 0 ? sumAD / nPairs : 0;
    rowAbsDiffs.push(mad);
    if (mad >= 0) validRows.push(r);
  }

  if (validRows.length < 30) return { name: NAME, category: CAT, flag: "N/A",
    description: `Only ${validRows.length} rows with valid replicate differences — need ≥30.` };

  // Step 2: LOESS smooth of |diff| vs row index
  const xs = validRows.map((_, i) => i);
  const ys = validRows.map(r => rowAbsDiffs[r]);
  const maxSpanRows = 50;
  const span = Math.min(0.3, maxSpanRows / validRows.length);
  const fitted = loessSmooth(xs, ys, span);

  // Step 3: LOESS residuals = observed - fitted
  const loessResiduals = ys.map((y, i) => y - fitted[i]);

  // Step 4a: sliding-window variance scan (existing)
  const WIN = Math.min(20, Math.floor(validRows.length / 3));
  if (WIN < 8) return { name: NAME, category: CAT, flag: "N/A",
    description: `Insufficient data for windowed scan (window=${WIN}, need ≥8).` };

  const stride = Math.max(1, Math.floor(WIN / 3));
  const globalVar = variance(loessResiduals);
  if (globalVar < 1e-30) return { name: NAME, category: CAT, flag: "LOW",
    description: "LOESS residuals have near-zero variance — uniform noise structure.",
    primaryP: 1, scanP: 1, interpretation: "Noise structure is uniform across all rows." };

  const allWindows = [];
  let obsScanStat = 0;
  let bestWinIdx = -1;

  for (let s = 0; s + WIN <= validRows.length; s += stride) {
    const winResids = loessResiduals.slice(s, s + WIN);
    const winVar = variance(winResids);
    const ratio = Math.max(winVar / globalVar, globalVar / winVar);
    const startRow = validRows[s];
    const endRow = validRows[Math.min(s + WIN - 1, validRows.length - 1)];
    allWindows.push({
      startRow: startRow + 1, endRow: endRow + 1,
      winVar, ratio,
      direction: winVar < globalVar ? "smoother" : "rougher"
    });
    if (ratio > obsScanStat) { obsScanStat = ratio; bestWinIdx = allWindows.length - 1; }
  }

  if (!allWindows.length) return { name: NAME, category: CAT, flag: "N/A",
    description: "No valid windows for scan." };

  // Step 4b: CUSUM changepoint detection on the raw noise measure (ys)
  // We run on the raw noise (ys), not LOESS residuals, because the changepoint
  // should detect a shift in the LEVEL of noise, not in residual variance.
  const globalMeanNoise = mean(ys);
  const cs = cusumStat(ys, globalMeanNoise);
  const cusum = cs.cusum;
  const obsCusumStat = cs.maxAbs;
  const cpIdx = cs.cpIdx;

  // Determine changepoint direction: negative CUSUM at peak → noise was ABOVE mean
  // before this point (so it DECREASES here); positive → noise was below mean before
  // this point (so it INCREASES here). Convention: we describe what happens AFTER the cp.
  const cpCusumSign = cusum[cpIdx];
  // If CUSUM is positive at the changepoint, noise before cp was below mean → noise
  // increases after cp. If negative, noise before was above mean → noise decreases.
  // Actually: CUSUM rises when ys[i] > mean. So positive peak means the sum of
  // above-mean deviations accumulated → the left side had higher noise.
  // After the changepoint, noise drops. So: positive peak → noise DECREASES at cp.
  const cpDirection = cpCusumSign > 0 ? "decreases" : "increases";
  const cpRow = validRows[cpIdx] + 1; // 1-indexed for display

  // ── Binary segmentation: test for secondary changepoint within each segment ──
  // Split at the primary CP, run independent CUSUM + permutation null on each segment.
  let secondaryRow = null, secondaryP = null, secondaryDirection = null, secondarySegment = null;
  const MIN_SEG = 15; // minimum segment length for CUSUM to be meaningful
  const segments = [
    { label: "before", data: ys.slice(0, cpIdx), offset: 0 },
    { label: "after",  data: ys.slice(cpIdx),    offset: cpIdx },
  ].filter(seg => seg.data.length >= MIN_SEG);

  let bestSegP = 1, bestSegRow = null, bestSegDir = null, bestSegLabel = null;
  for (const seg of segments) {
    const segMean = mean(seg.data);
    const segCS = cusumStat(seg.data, segMean);
    const segObsStat = segCS.maxAbs;
    const segCpIdx = segCS.cpIdx;
    if (segObsStat === 0) continue;

    // Permutation null: shuffle within segment only
    const segNPerm = seg.data.length <= 100 ? 4999 : 499;
    const segIdx = Array.from({ length: seg.data.length }, (_, i) => i);
    const segShuf = new Array(seg.data.length);
    let segExceed = 0;
    for (let p = 0; p < segNPerm; p++) {
      rng.shuffle(segIdx);
      for (let i = 0; i < segIdx.length; i++) segShuf[i] = seg.data[segIdx[i]];
      let cs2 = 0, permMax = 0;
      for (let i = 0; i < segShuf.length; i++) {
        cs2 += segShuf[i] - segMean;
        const ac = Math.abs(cs2);
        if (ac > permMax) permMax = ac;
      }
      if (permMax >= segObsStat) segExceed++;
    }
    const segP = (segExceed + 1) / (segNPerm + 1);
    if (segP < bestSegP) {
      bestSegP = segP;
      bestSegRow = validRows[seg.offset + segCpIdx] + 1;
      const segCusumSign = segCS.cusum[segCpIdx];
      bestSegDir = segCusumSign > 0 ? "decreases" : "increases";
      bestSegLabel = seg.label;
    }
  }
  if (bestSegP < 0.01 && bestSegRow != null) {
    secondaryRow = bestSegRow;
    secondaryP = bestSegP;
    secondaryDirection = bestSegDir;
    secondarySegment = bestSegLabel;
  }

  // Step 5: joint permutation null — row-shuffle for BOTH scan stat and CUSUM
  // Pre-allocate arrays outside loop.
  const N_PERM = validRows.length <= 100 ? 4999 : 499;
  let exceedScan = 0;
  let exceedCusum = 0;
  const permIdx = Array.from({ length: validRows.length }, (_, i) => i);
  const shuffledResid = new Array(validRows.length);
  const shuffledYs = new Array(validRows.length);

  for (let perm = 0; perm < N_PERM; perm++) {
    rng.shuffle(permIdx);
    for (let i = 0; i < permIdx.length; i++) {
      shuffledResid[i] = loessResiduals[permIdx[i]];
      shuffledYs[i] = ys[permIdx[i]];
    }

    // Scan stat on shuffled LOESS residuals — running-sum variance (no slice/allocation)
    let permScanMax = 0;
    for (let s = 0; s + WIN <= shuffledResid.length; s += stride) {
      let sm = 0, sm2 = 0;
      for (let k = s; k < s + WIN; k++) { const v = shuffledResid[k]; sm += v; sm2 += v * v; }
      const wv = (sm2 - sm * sm / WIN) / (WIN - 1);
      const r = Math.max(wv / globalVar, globalVar / wv);
      if (r > permScanMax) permScanMax = r;
    }
    if (permScanMax >= obsScanStat) exceedScan++;

    // CUSUM on shuffled noise
    let cs = 0, permCusumMax = 0;
    for (let i = 0; i < shuffledYs.length; i++) {
      cs += shuffledYs[i] - globalMeanNoise;
      const ac = Math.abs(cs);
      if (ac > permCusumMax) permCusumMax = ac;
    }
    if (permCusumMax >= obsCusumStat) exceedCusum++;
  }
  const scanP = (exceedScan + 1) / (N_PERM + 1);
  const cusumP = (exceedCusum + 1) / (N_PERM + 1);

  // Step 6: flag — combine scan and CUSUM (take the more significant)
  const bestWin = bestWinIdx >= 0 ? allWindows[bestWinIdx] : null;
  const bestRatio = bestWin ? bestWin.ratio : 1;
  const esGate = nR >= 500 && bestRatio < 2.0;

  // Primary p-value: min of scan and CUSUM (each tested independently via flagFromP)
  // Consistent with max-flag "can only promote" pattern used across all tests.
  const scanFlag = flagFromP(scanP);
  const cusumFlag = cusumP < 1 ? flagFromP(cusumP) : "LOW";
  const combinedP = Math.min(scanP, cusumP);
  const combinedFlag = flagRankOf(scanFlag) >= flagRankOf(cusumFlag) ? scanFlag : cusumFlag;
  const flag = esGate ? "LOW" : combinedFlag;

  // Step 7: interpretation — combine region (scan) and boundary (CUSUM)
  let interpretation = "";
  if (flag === "HIGH" || flag === "MODERATE") {
    const w = bestWin;
    const parts = [];
    if (scanP < 0.01) {
      parts.push(`Windowed scan detects a region with ${w.direction} noise (rows ${w.startRow}–${w.endRow}, ${bestRatio.toFixed(1)}× variance ratio, p=${scanP.toFixed(4)}).`);
    }
    if (cusumP < 0.01) {
      let cpDesc = `CUSUM changepoint: noise ${cpDirection} at row ${cpRow} (p=${cusumP.toFixed(4)})`;
      if (secondaryRow) cpDesc += `; secondary at row ${secondaryRow} (noise ${secondaryDirection}, segment p=${secondaryP.toFixed(4)})`;
      cpDesc += ".";
      parts.push(cpDesc);
    }
    parts.push("A subset of rows has different noise character than the rest, suggesting smoothing, extrapolation, or manual editing in that region.");
    interpretation = parts.join(" ");
  } else if (esGate) {
    interpretation = `Scan statistic suppressed by effect-size gate: worst window variance ratio ${bestRatio.toFixed(2)}× below 2.0× at N≥500.`;
  } else {
    interpretation = `Noise character is consistent across all rows. No localised smoothing or changepoints detected (scan p=${scanP.toFixed(4)}, CUSUM p=${cusumP.toFixed(4)}).`;
  }

  // Details: windows + changepoints
  const sortedWindows = [...allWindows].sort((a, b) => b.ratio - a.ratio);
  const detailWindows = (flag === "HIGH" || flag === "MODERATE")
    ? sortedWindows.filter(w => w.ratio >= obsScanStat * 0.5).slice(0, 8)
    : sortedWindows.slice(0, 3);
  const details = [
    // Changepoint entries first (marked with type for display)
    ...(cusumP < 0.05 ? [{
      type: "changepoint",
      rows: String(cpRow),
      direction: `noise ${cpDirection}`,
      cusumP: cusumP.toFixed(4),
      cusumStat: obsCusumStat.toFixed(3)
    }] : []),
    ...(secondaryRow ? [{
      type: "changepoint",
      rows: String(secondaryRow),
      direction: `noise ${secondaryDirection}`,
      cusumP: secondaryP.toFixed(4),
      segment: secondarySegment
    }] : []),
    // Window entries
    ...detailWindows.map(w => ({
      type: "window",
      rows: `${w.startRow}–${w.endRow}`,
      ratio: w.ratio.toFixed(2) + "×",
      direction: w.direction,
      winVar: w.winVar.toFixed(6)
    }))
  ];

    // Noise profile for plotting (row index + noise level + LOESS fit)
    // Downsample if many rows to keep payload manageable
    const profileStride = validRows.length > 300 ? Math.ceil(validRows.length / 300) : 1;
    const noiseProfile = [];
    for (let i = 0; i < validRows.length; i += profileStride) {
      noiseProfile.push({ row: validRows[i] + 1, noise: ys[i], fit: fitted[i] });
    }

    // ── Region comparison around changepoint(s) ──
    // Split rows by changepoint(s), compute mean observed noise vs predicted noise per region.
    const regionComparison = [];
    if ((cusumP < 0.05 || flag === "HIGH" || flag === "MODERATE") && cpIdx >= 0) {
      const { sigma: predSigma } = fitPredictedSigma(matrix);
      // Split at primary CP; add secondary split if significant
      let regions;
      if (secondaryRow != null) {
        // Find secondary CP index in validRows
        const secIdx = validRows.findIndex(r => r + 1 >= secondaryRow);
        const boundaries = [cpIdx, secIdx >= 0 ? secIdx : cpIdx].sort((a, b) => a - b);
        // Deduplicate if they're the same
        const uniq = [...new Set(boundaries)];
        if (uniq.length === 2) {
          regions = [
            { label: "Before 1st changepoint", s: 0, e: uniq[0] },
            { label: "Between changepoints", s: uniq[0], e: uniq[1] },
            { label: "After 2nd changepoint", s: uniq[1], e: validRows.length },
          ];
        } else {
          regions = [
            { label: "Before changepoint", s: 0, e: cpIdx },
            { label: "After changepoint", s: cpIdx, e: validRows.length },
          ];
        }
      } else {
        regions = [
          { label: "Before changepoint", s: 0, e: cpIdx },
          { label: "After changepoint", s: cpIdx, e: validRows.length },
        ];
      }

      for (const reg of regions) {
        if (reg.e <= reg.s) continue;
        const regionRows = validRows.slice(reg.s, reg.e);
        const regionNoise = [];
        const regionExpected = [];
        for (let ii = reg.s; ii < reg.e; ii++) {
          regionNoise.push(ys[ii]);
          const ps = predSigma[validRows[ii]];
          if (ps != null && ps > 0) regionExpected.push(ps);
        }
        const obsSD = mean(regionNoise);
        const expSD = regionExpected.length >= regionRows.length * 0.5
          ? mean(regionExpected) : globalMeanNoise;
        const ratio = expSD > 0 ? obsSD / expSD : 1;
        const finding = ratio > 1.5 ? "Noisier"
          : ratio < 0.67 ? "Quieter" : "As expected";
        const startRow1 = regionRows[0] + 1;
        const endRow1 = regionRows[regionRows.length - 1] + 1;
        regionComparison.push({
          region: reg.label,
          rows: `${startRow1}–${endRow1}`,
          observedNoise: obsSD.toFixed(4),
          expectedNoise: expSD.toFixed(4),
          ratio: ratio.toFixed(2) + "×",
          finding
        });
      }
    }

    // ── Per-pair LOESS decomposition for BH-FDR sub-unit promotion ──
    // For each replicate pair, run independent LOESS + scan + CUSUM.
    // BH-FDR across per-pair p-values; promote to MODERATE if any survives ALPHA.FLAG.
    // Consistent with Autocorr, Runs, Kurtosis, ConstOffset, RegNoise, IRC.
    const pairResults = [];
    const MAX_LOESS_PAIRS = 30;
    const PP_PERM = 499;
    let pairCount = 0;
    for (let c1 = 0; c1 < nC && pairCount < MAX_LOESS_PAIRS; c1++) {
      for (let c2 = c1 + 1; c2 < nC && pairCount < MAX_LOESS_PAIRS; c2++) {
        const pDiffs = [], pVR = [];
        for (let r = 0; r < nR; r++) {
          const v1 = matrix[r][c1], v2 = matrix[r][c2];
          if (v1 != null && isFinite(v1) && v2 != null && isFinite(v2)) {
            pDiffs.push(Math.abs(v1 - v2));
            pVR.push(r);
          }
        }
        if (pVR.length < 30) continue;
        pairCount++;

        const pxs = pVR.map((_, i) => i);
        const pSpan = Math.min(0.3, maxSpanRows / pVR.length);
        const pFitted = loessSmooth(pxs, pDiffs, pSpan);
        const pResid = pDiffs.map((y, i) => y - pFitted[i]);

        const pWIN = Math.min(20, Math.floor(pVR.length / 3));
        if (pWIN < 8) continue;
        const pStride = Math.max(1, Math.floor(pWIN / 3));
        const pGV = variance(pResid);
        if (pGV < 1e-30) continue;

        // Observed scan stat — running-sum variance (no slice allocation)
        let pObsScan = 0;
        for (let s = 0; s + pWIN <= pVR.length; s += pStride) {
          let sm = 0, sm2 = 0;
          for (let k = s; k < s + pWIN; k++) { const v = pResid[k]; sm += v; sm2 += v * v; }
          const wv = (sm2 - sm * sm / pWIN) / (pWIN - 1);
          const rat = Math.max(wv / pGV, pGV / wv);
          if (rat > pObsScan) pObsScan = rat;
        }

        // Observed CUSUM stat
        const pMu = mean(pDiffs);
        const pObsCusum = cusumStat(pDiffs, pMu).maxAbs;

        // Joint permutation null (row-shuffle) — pre-allocate idx once per pair
        let ppExS = 0, ppExC = 0;
        const ppIdx = Array.from({ length: pVR.length }, (_, i) => i);
        for (let perm = 0; perm < PP_PERM; perm++) {
          for (let i = 0; i < pVR.length; i++) ppIdx[i] = i;
          rng.shuffle(ppIdx);
          let permScan = 0;
          for (let s = 0; s + pWIN <= ppIdx.length; s += pStride) {
            let sm = 0, sm2 = 0;
            for (let k = s; k < s + pWIN; k++) { const v = pResid[ppIdx[k]]; sm += v; sm2 += v * v; }
            const wv = (sm2 - sm * sm / pWIN) / (pWIN - 1);
            const rat = Math.max(wv / pGV, pGV / wv);
            if (rat > permScan) permScan = rat;
          }
          if (permScan >= pObsScan) ppExS++;

          let cs2 = 0, permCusum = 0;
          for (let i = 0; i < ppIdx.length; i++) {
            cs2 += pDiffs[ppIdx[i]] - pMu;
            const ac = Math.abs(cs2);
            if (ac > permCusum) permCusum = ac;
          }
          if (permCusum >= pObsCusum) ppExC++;
        }

        const ppSP = (ppExS + 1) / (PP_PERM + 1);
        const ppCP = (ppExC + 1) / (PP_PERM + 1);
        pairResults.push({
          pair: `${c1 + 1}\u2013${c2 + 1}`,
          scanP: ppSP, cusumP: ppCP,
          combinedP: Math.min(ppSP, ppCP),
          nRows: pVR.length
        });
      }
    }

    // BH-FDR across per-pair combined p-values
    let pairPromoted = false;
    if (pairResults.length > 0) {
      const pairAdjPs = bhFDR(pairResults.map(pr => pr.combinedP));
      pairResults.forEach((pr, i) => { pr.adjP = pairAdjPs[i]; });
      if (pairAdjPs.some(p => p < ALPHA.FLAG)) pairPromoted = true;
    }

    // Apply promotion: can only promote, never demote
    const finalFlag = (pairPromoted && flagRankOf(flag) < flagRankOf("MODERATE")) ? "MODERATE" : flag;
    let finalInterpretation = interpretation;
    if (pairPromoted && finalFlag !== flag) {
      const bp = pairResults.reduce((a, b) => a.adjP < b.adjP ? a : b);
      finalInterpretation += ` Pair-level: cols ${bp.pair} show significant noise inconsistency (BH-adj p=${bp.adjP < 0.0001 ? "<0.0001" : bp.adjP.toFixed(4)}) — promoted to MODERATE.`;
    }

    // Primary p: min of pooled and best per-pair adjP
    const pairBestAdjP = pairResults.length > 0 ? Math.min(...pairResults.map(pr => pr.adjP != null ? pr.adjP : 1)) : 1;
    const finalPrimaryP = Math.min(combinedP, pairBestAdjP);

    return {
    name: NAME, category: CAT,
    description: "In genuine data, measurement noise stays consistent from the first row to the last. This card scans for regions where the noise character changes — such as rows that are smoother or noisier than the rest — and pinpoints where that shift begins. A change in noise partway through a dataset suggests part of it was generated differently.",
    nWindows: allWindows.length, scanStat: obsScanStat.toFixed(2),
    scanP, cusumP,
    changepointRow: cpRow, changepointDirection: cpDirection,
    ...(secondaryRow ? { secondaryRow, secondaryP, secondaryDirection, secondarySegment } : {}),
    nPerm: N_PERM,
    bestWindowRows: bestWin ? `${bestWin.startRow}–${bestWin.endRow}` : "—",
    bestVarRatio: bestRatio.toFixed(2) + "×",
    bestDirection: bestWin ? bestWin.direction : "—",
    loessSpan: span.toFixed(3),
    globalResidVar: globalVar.toFixed(6),
    nValidRows: validRows.length,
    noiseProfile,
    ...(regionComparison.length > 0 ? { regionComparison } : {}),
    primaryP: finalPrimaryP,
    pairResults: pairResults.length > 0 ? pairResults : undefined,
    pairPromoted,
    interpretation: finalInterpretation, flag: finalFlag, details
  };
}

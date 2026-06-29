import { mean, zToP, bhFDR, arrayMin } from "../stats/primitives.js";
import { flagFromP, ALPHA, flagRankOf } from "../constants/thresholds.js";

/* 7b. Row-Mean Runs Test (Item 2 — METHODOLOGY §5.5)
 * Detects uniform additive shifts applied to all replicates of a row block.
 * Unlike the inter-replicate Runs Test, this operates on row means — a shift
 * applied equally to all reps cancels in differences but shifts the mean.
 * Procedure: row means → linear detrend → Wald-Wolfowitz runs on sign residuals
 *            + windowed BH-FDR scan. Per-condition when row conditions present.
 */
/**
 * Detects uniform additive shifts applied to row blocks by testing for non-random clustering in detrended row means.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns, minimum 2 columns and 10 rows).
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} condCtx - Unified condition context (required; test returns N/A without row conditions).
 * @returns {{ name: string, category: string, flag: string, primaryP: number, globalP: string, bestSequence: string, bestRuns: number, bestExpected: number, bestZ: string, nSequences: number, windowSigCount: number, firstPairSigns: number[], details: object[] }} Result with per-condition Wald-Wolfowitz runs analysis, windowed BH-FDR scan, and sign sequence for strip plot.
 * @see METHODOLOGY.md §"2.4 Row-Mean Runs Test"
 */
export function testRowMeanRuns(matrix, condCtx, rng) {
  const rowConditions = condCtx?.rowConditions || null;
  const nC = matrix[0]?.length || 0;
  const nR = matrix.length;
  if (nC < 2 || nR < 10) return { name: "Row-Mean Runs", category: "replicate", flag: "N/A",
    description: "Need \u22652 replicate columns and \u226510 rows." };

  // Require row-level condition labels. Without them, row means carry biological
  // variation (different samples have different true values) which produces natural
  // clustering that linear detrending cannot remove. The test is only forensically
  // meaningful within-condition, where biological between-condition signal is absent.
  const hasConditions = rowConditions && rowConditions.some(c => c);
  if (!hasConditions) return { name: "Row-Mean Runs", category: "replicate", flag: "N/A",
    description: "Requires row-level condition labels. Without per-condition grouping, biological variation in row means produces natural clustering that cannot be distinguished from data concerns." };

  // ── helpers ──────────────────────────────────────────────────────────
  function rowMeans(rowIdxs) {
    return rowIdxs.map(r => {
      const vals = matrix[r].filter(v => v != null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
  }

  function linearDetrend(values) {
    // Simple OLS: y = slope*x + intercept, return residuals
    const valid = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] != null) valid.push({ x: i, y: values[i] });
    }
    if (valid.length < 5) return null;
    const mx = mean(valid.map(v => v.x));
    const my = mean(valid.map(v => v.y));
    let num = 0, den = 0;
    for (const v of valid) { num += (v.x - mx) * (v.y - my); den += (v.x - mx) ** 2; }
    const slope = den > 0 ? num / den : 0;
    const intercept = my - slope * mx;
    return values.map((v, i) => v != null ? v - (slope * i + intercept) : null);
  }

  function wwRuns(residuals) {
    const nonNull = residuals.filter(r => r != null);
    const signs = nonNull.map(r => r > 0 ? 1 : r < 0 ? -1 : 0);
    const nonZero = signs.filter(s => s !== 0);
    if (nonZero.length < 8) return null;
    const nP = nonZero.filter(s => s > 0).length;
    const nM = nonZero.filter(s => s < 0).length;
    if (nP === 0 || nM === 0) return null;
    const n = nP + nM;
    let runs = 1;
    for (let i = 1; i < nonZero.length; i++) { if (nonZero[i] !== nonZero[i - 1]) runs++; }
    const er = (2 * nP * nM) / n + 1;
    const vr = (2 * nP * nM * (2 * nP * nM - n)) / (n * n * (n - 1));
    if (vr <= 0) return null;
    const z = (runs - er) / Math.sqrt(vr);
    const p = zToP(z);  // two-sided: both too few (block shifts) and too many (human alternation) are forensic signals
    return { runs, expected: er, z, p, n, signs: nonZero };
  }

  // ── build per-condition sequences ────────────────────────────────────
  const sequences = [];

  const condIdx = {};
  for (let i = 0; i < rowConditions.length; i++) {
    const c = rowConditions[i];
    if (c) { if (!condIdx[c]) condIdx[c] = []; condIdx[c].push(i); }
  }
  for (const [cond, idxs] of Object.entries(condIdx)) {
    if (idxs.length < 10) continue;
    const means = rowMeans(idxs);
    const resid = linearDetrend(means);
    if (!resid) continue;
    const r = wwRuns(resid);
    if (r) sequences.push({ label: `Cond: ${cond}`, ...r, rowIdxs: idxs, residuals: resid });
  }

  if (!sequences.length) return { name: "Row-Mean Runs", category: "replicate", flag: "N/A",
    description: "Per-condition sequences too short for runs analysis (need \u226510 rows per condition)." };

  // ── global: best p across per-condition sequences ──────────────────
  const globalBestP = Math.min(...sequences.map(s => s.p));
  const globalFlag = flagFromP(globalBestP);

  // ── windowed scan across per-condition sequences ────────────────────
  const WIN = 15;
  const allWindowResults = [];
  for (const seq of sequences) {
    // Build contiguous non-null residual array with index mapping
    const validResid = [], validOrigIdx = [];
    for (let i = 0; i < seq.residuals.length; i++) {
      if (seq.residuals[i] != null) { validResid.push(seq.residuals[i]); validOrigIdx.push(seq.rowIdxs[i]); }
    }
    if (validResid.length < WIN) continue;
    const stride = Math.max(1, Math.floor(WIN / 3));
    for (let start = 0; start + WIN <= validResid.length; start += stride) {
      const win = validResid.slice(start, start + WIN);
      const signs = win.map(r => r > 0 ? 1 : r < 0 ? -1 : 0);
      const nP = signs.filter(s => s > 0).length, nM = signs.filter(s => s < 0).length;
      const n = nP + nM;
      if (nP === 0 || nM === 0 || n < 8) continue;
      const nonZero = signs.filter(s => s !== 0);
      let runs = 1;
      for (let i = 1; i < nonZero.length; i++) { if (nonZero[i] !== nonZero[i - 1]) runs++; }
      const er = (2 * nP * nM) / n + 1;
      const vr = (2 * nP * nM * (2 * nP * nM - n)) / (n * n * (n - 1));
      if (vr <= 0) continue;
      const z = (runs - er) / Math.sqrt(vr);
      const p = zToP(z);
      allWindowResults.push({
        sequence: seq.label,
        startRow: validOrigIdx[start] + 1,
        endRow: validOrigIdx[Math.min(start + WIN - 1, validOrigIdx.length - 1)] + 1,
        runs, expected: Math.round(er), z: z.toFixed(2), p: p.toFixed(4), rawP: p
      });
    }
  }

  // BH-FDR correction across ALL windows
  const windowAllPs = allWindowResults.map(w => w.rawP);
  const windowAllAdjPs = bhFDR(windowAllPs);
  const windowSig = allWindowResults.filter((_, i) => windowAllAdjPs[i] < ALPHA.NOTE);
  windowSig.forEach(w => { w.adjP = windowAllAdjPs[allWindowResults.indexOf(w)]; });

  // S95 Track A Item 4: sub-unit BH-FDR promotion capped at MODERATE.
  // Previously windows could escalate to HIGH via "more severe of global and windowed."
  // Now a significant window (BH-adj < ALPHA.FLAG) promotes the overall flag to at most
  // MODERATE — never above, never demote. Consistent with Autocorrelation, Kurtosis,
  // ConstOffset, IRC, LOESS, Regional Noise, Selective Noise, Runs.
  const anyWindowFlagged = windowAllAdjPs.some(p => p < ALPHA.FLAG);
  const promotedFlag = anyWindowFlagged ? "MODERATE" : "LOW";
  const flag = flagRankOf(promotedFlag) > flagRankOf(globalFlag) ? promotedFlag : globalFlag;

  // Best sequence for display
  const bestSeq = sequences.reduce((a, b) => a.p < b.p ? a : b);
  // Compute raw row means for the best sequence (for trend plot)
  const bestMeans = rowMeans(bestSeq.rowIdxs);
  const bestGrandMean = mean(bestMeans.filter(v => v != null));

  // Generate matched simulated permutation: pick the draw whose crossing
  // count is closest to expected crossings (expectedRuns - 1)
  const targetCrossings = Math.round(bestSeq.expected) - 1;
  const validMeans = bestMeans.filter(v => v != null);
  let bestSimMeans = validMeans; // fallback: original order
  if (rng && validMeans.length >= 5) {
    let bestDist = Infinity;
    const buf = [...validMeans];
    for (let trial = 0; trial < 50; trial++) {
      // Fisher-Yates shuffle with deterministic PRNG
      for (let i = buf.length - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        const tmp = buf[i]; buf[i] = buf[j]; buf[j] = tmp;
      }
      // Count crossings (sign changes relative to grand mean)
      let crossings = 0;
      for (let i = 1; i < buf.length; i++) {
        if ((buf[i - 1] >= bestGrandMean) !== (buf[i] >= bestGrandMean)) crossings++;
      }
      const dist = Math.abs(crossings - targetCrossings);
      if (dist < bestDist) {
        bestDist = dist;
        bestSimMeans = [...buf];
        if (dist === 0) break;
      }
    }
  }

  return {
    name: "Row-Mean Runs", category: "replicate",
    description: "Tests whether row-level means show non-random clustering along the sequence after linear detrending. Detects uniform additive shifts applied to all replicates of a row block \u2014 invisible to inter-replicate difference tests (Wald & Wolfowitz 1940). When condition labels are present, tests per-condition sequences only (cross-condition mean differences would confound the global test).",
    nRows: matrix.length,
    flag,
    primaryP: Math.min(globalBestP, windowAllAdjPs.length ? Math.min(...windowAllAdjPs) : 1),
    globalP: globalBestP.toFixed(4),
    bestSequence: bestSeq.label,
    bestRuns: bestSeq.runs,
    bestExpected: Math.round(bestSeq.expected),
    bestZ: bestSeq.z.toFixed(3),
    nSequences: sequences.length,
    windowSigCount: windowSig.length,
    nWindowsTested: allWindowResults.length,
    windowBestP: allWindowResults.length ? arrayMin(allWindowResults.map(w => w.rawP)).toFixed(4) : "1.0000",
    // Row means for trend plot
    bestRowMeans: bestMeans,
    bestRowIdxs: bestSeq.rowIdxs,
    bestGrandMean,
    bestSimMeans,
    // For sign strip plot (reuse SignStripPlot)
    firstPairSigns: bestSeq.signs,
    firstPairRuns: bestSeq.runs,
    firstPairExp: Math.round(bestSeq.expected),
    worstPairLabel: `${bestSeq.label} (${bestSeq.runs} runs, exp: ${Math.round(bestSeq.expected)})`,
    // S247: per-condition sign sequences + run stats for the multi-strip and
    // run-length evidence table (mirrors Runs' pairSignSeqs). Additive — drives
    // the SignStrip + table only; changes no verdict-path field. signs/pos are
    // reconstructed from each sequence's detrended residuals, so the strip shows
    // runs around the FITTED TREND (the tested quantity), not the grand mean,
    // with each sign aligned to its 0-indexed matrix row for the file-row axis.
    condSignSeqs: sequences.map(s => {
      const signs = [], pos = [];
      for (let i = 0; i < s.residuals.length; i++) {
        const v = s.residuals[i];
        if (v == null) continue;
        const sg = v > 0 ? 1 : v < 0 ? -1 : 0;
        if (sg === 0) continue;
        signs.push(sg); pos.push(s.rowIdxs[i]);
      }
      return { label: s.label, signs, pos, runs: s.runs,
        expected: Math.round(s.expected), z: s.z.toFixed(3), p: s.p };
    }),
    details: [
      ...windowSig.slice(0, 20).map(w => ({ ...w, source: "window" })),
      ...sequences.map(s => ({
        sequence: s.label, runs: s.runs, expected: s.expected.toFixed(1),
        z: s.z.toFixed(3), p: s.p.toFixed(4), n: s.n,
        // 0-indexed matrix-row indices of the condition's row slice — read by
        // extractCellFlags to paint the flagged sequence's row band (A2 fix #4).
        rowIdxs: s.rowIdxs,
      }))
    ]
  };
}

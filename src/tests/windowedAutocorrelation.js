import { bhFDR } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

/* 25. Windowed Autocorrelation
   Detects localised lag-1 serial structure in replicate differences within
   sliding windows, complementing global Autocorrelation. A dataset with
   most rows honestly measured but a stretch of rows fabricated by hand
   (e.g. template-copied then jittered) can leave lag-1 serial structure
   concentrated in that stretch while the global pooled r₁ stays close to
   zero. This test slides 15-row windows (stride 5) along each pair's
   difference series and tests each window's lag-1 r against a within-pair
   row-shuffle permutation null. BH-FDR across (pair × window) units.

   Mirrors the permutation infrastructure of Regional Noise Homogeneity
   (row-shuffle null + BH-FDR across the sub-unit grid). Uses rank-
   accumulator counting (count of permuted |r| ≥ observed |r|) rather
   than storing the full null matrix, so memory stays O(pairs × windows).
*/

const WIN = 15;
const STRIDE = 5;
const MIN_ROWS = 30;
const DETAILS_CAP = 30;

/**
 * Compute lag-1 Pearson r on a window of values, given its mean and
 * centred sum-of-squares. Zero-variance windows return 0.
 */
function lagOneR(values, start, end, m, den) {
  if (den <= 0) return 0;
  let num = 0;
  for (let i = start + 1; i < end; i++) num += (values[i] - m) * (values[i - 1] - m);
  return num / den;
}

/**
 * Compute (mean, den) for a window. Shared helper — also used inside
 * the permutation loop against the shuffled series.
 */
function windowStats(values, start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += values[i];
  const m = sum / (end - start);
  let den = 0;
  for (let i = start; i < end; i++) { const dv = values[i] - m; den += dv * dv; }
  return { m, den };
}

/**
 * Sliding-window lag-1 autocorrelation scan with within-pair permutation null.
 * @param {number[][]} matrix - 2D numeric matrix (rows × replicate columns, nulls allowed)
 * @param {{shuffle: function(any[]): void}} rng - seeded PRNG from createPRNG
 * @returns {object} result with name/category/flag/primaryP/details etc.
 * @see METHODOLOGY.md §"2.1b Windowed Autocorrelation"
 */
export function testWindowedAutocorrelation(matrix, rng) {
  const NAME = "Windowed Autocorrelation";
  const CAT = "replicate";
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nC < 2) return { name: NAME, category: CAT, flag: "N/A",
    description: "Need ≥2 replicate columns for paired differences." };
  if (nR < MIN_ROWS) return { name: NAME, category: CAT, flag: "N/A",
    description: `Need ≥${MIN_ROWS} rows for ≥4 windows at size ${WIN} / stride ${STRIDE} (got ${nR}).` };

  // Adaptive permutation count: keep total work bounded on large datasets.
  // Regional Noise precedent: 4999/499 split at 100 rows. Here windows are
  // smaller and per-pair shuffles are cheap, so we can be more generous.
  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;

  const windowUnits = []; // { pair, pairIdx, startRow, endRow, winIdx, r, absR, rawP, adjP? }
  const nWindowsByPair = [];
  let pairIdx = -1;

  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
    // Collect (matrixRow, diff) pairs for non-null rows in this pair.
    const validRows = [];
    const diffs = [];
    for (let r = 0; r < nR; r++) {
      if (matrix[r][c1] != null && matrix[r][c2] != null) {
        validRows.push(r);
        diffs.push(matrix[r][c1] - matrix[r][c2]);
      }
    }
    if (diffs.length < MIN_ROWS) continue;
    pairIdx++;

    // Observed windowed r values.
    const numWin = Math.floor((diffs.length - WIN) / STRIDE) + 1;
    const obsAbsR = new Float64Array(numWin);
    const obsR    = new Float64Array(numWin);
    for (let w = 0; w < numWin; w++) {
      const s = w * STRIDE, e = s + WIN;
      const { m, den } = windowStats(diffs, s, e);
      const r = lagOneR(diffs, s, e, m, den);
      obsR[w] = r;
      obsAbsR[w] = Math.abs(r);
    }

    // Permutation null: shuffle d_i within this pair only (not within window).
    // Rank-accumulator count — avoids storing the full null matrix.
    const exceed = new Int32Array(numWin);
    const shuffled = new Float64Array(diffs.length);
    for (let i = 0; i < diffs.length; i++) shuffled[i] = diffs[i];
    const idx = Array.from({ length: diffs.length }, (_, i) => i);
    for (let b = 0; b < N_PERM; b++) {
      rng.shuffle(idx);
      for (let i = 0; i < idx.length; i++) shuffled[i] = diffs[idx[i]];
      for (let w = 0; w < numWin; w++) {
        const s = w * STRIDE, e = s + WIN;
        const { m, den } = windowStats(shuffled, s, e);
        const pr = lagOneR(shuffled, s, e, m, den);
        if (Math.abs(pr) >= obsAbsR[w]) exceed[w]++;
      }
    }

    // Per-window two-sided p with (k+1)/(B+1) smoothing.
    for (let w = 0; w < numWin; w++) {
      const rawP = (exceed[w] + 1) / (N_PERM + 1);
      const s = w * STRIDE, e = s + WIN - 1;
      windowUnits.push({
        pair: `${c1 + 1}–${c2 + 1}`,
        pairIdx,
        startRow: validRows[s] + 1,      // 1-indexed matrix row
        endRow: validRows[e] + 1,
        winIdx: w,
        r: obsR[w],
        absR: obsAbsR[w],
        rawP,
      });
    }
    nWindowsByPair.push(numWin);
  }

  if (!windowUnits.length) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: "No pair produced ≥4 valid windows after null-filtering." };
  }

  // S109 Part 2: BH-FDR scope restricted to per-pair (each pair is a distinct
  // replicate-relationship hypothesis; full pair × window grid is over-conservative
  // when fabrication is sparse across pairs, per METHODOLOGY §2.1b S108 finding).
  // DS01-19 per-pair dry-run (S109 Part 1) confirmed zero clean-fixture regressions.
  // Arithmetic floor: with N_PERM=999 and nWindows≈18/pair, min reachable
  // per-pair adj-p ≈ 1/1000 × nWindows ≈ 0.018 (MOD floor at ALPHA.FLAG=0.01).
  // HIGH at <0.001 is unreachable without N_PERM ≥ 9999; deferred to a separate
  // N_PERM / W calibration session.
  const byPair = new Map();
  for (const u of windowUnits) {
    if (!byPair.has(u.pairIdx)) byPair.set(u.pairIdx, []);
    byPair.get(u.pairIdx).push(u);
  }
  for (const pairUnits of byPair.values()) {
    const pairAdjPs = bhFDR(pairUnits.map(u => u.rawP));
    pairUnits.forEach((u, i) => { u.adjP = pairAdjPs[i]; });
  }

  // Primary statistic: min per-pair adj-p across all pairs.
  const minAdjP = Math.min(...windowUnits.map(u => u.adjP));
  const primaryP = minAdjP;
  const flag = flagFromP(primaryP);

  // Significant-unit counts (for diagnostics / summary).
  const nSig05 = windowUnits.filter(u => u.adjP < 0.05).length;
  const nSig01 = windowUnits.filter(u => u.adjP < 0.01).length;

  // Sort details by adj-p ascending; mark the significant ones as source:window
  // so convergence.js picks up the row ranges for highlighting.
  const sorted = [...windowUnits].sort((a, b) => a.adjP - b.adjP);
  const details = sorted.slice(0, DETAILS_CAP).map(u => ({
    source: "window",
    pair: u.pair,
    startRow: u.startRow,
    endRow: u.endRow,
    rows: `${u.startRow}–${u.endRow}`,
    r: u.r.toFixed(4),
    rawP: u.rawP,
    adjP: u.adjP,
    significant: u.adjP < 0.05,
  }));

  // Build best-window summary for the card footer.
  const best = sorted[0];
  const interpretation = flag === "LOW"
    ? `No localised lag-1 autocorrelation detected across ${windowUnits.length} (pair × window) units (min adj-p = ${minAdjP.toFixed(4)}).`
    : `Localised lag-1 autocorrelation in ${nSig05} of ${windowUnits.length} (pair × window) units (${nSig01} at adj-p < 0.01). Most extreme: pair ${best.pair} rows ${best.startRow}–${best.endRow} (r = ${best.r.toFixed(3)}, adj-p = ${best.adjP < 0.0001 ? "<0.0001" : best.adjP.toFixed(4)}).`;

  return {
    name: NAME, category: CAT,
    description: "Autocorrelation across the whole dataset can miss fabrication that only affects a stretch of rows. This card slides a 15-row window through each replicate pair's differences and tests each window's lag-1 correlation against a within-pair row-shuffle null. Localised serial structure — e.g. a template-copied region jittered then inserted — stays visible here even when the pooled r stays near zero.",
    flag, primaryP,
    nWindowsTotal: windowUnits.length,
    nPairs: nWindowsByPair.length,
    nSig05, nSig01,
    nPerm: N_PERM,
    windowSize: WIN, stride: STRIDE,
    interpretation,
    details,
  };
}

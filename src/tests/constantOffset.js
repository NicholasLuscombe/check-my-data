import { bhFDR } from "../stats/primitives.js";
import { flagFromP, ALPHA, EFFECT_SIZE } from "../constants/thresholds.js";

/* 2. Constant-Offset Blocks (Additive + Multiplicative)
   Null model: birthday-problem on the observed *difference* distribution.
   P(two consecutive differences coincidentally match) = Σ(freq(d)/n)².

   Two passes:
   - Additive: d = col_j - col_i (detects col_j = col_i + k)
   - Multiplicative: d_log = log(col_j) - log(col_i) (detects col_j = col_i × k,
     since log(x×k) = log(x) + log(k) — multiplicative becomes additive in log-space)
   The multiplicative pass is skipped for any column pair where either column contains ≤0.
   Combined result takes the pass with the minimum p-value. */
/**
 * Detects rows shifted by a constant additive or multiplicative offset from other rows.
 * @param {number[][]} matrix - Numeric matrix (rows x replicate columns).
 * @param {{ random: Function }} rng - PRNG instance for permutation test.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, offsetType: string, consecutiveEqualDiffs: number, totalConsecutivePairs: number, permP: string, details: object[] }}
 * @see METHODOLOGY.md §"1.2 Constant-Offset Blocks"
 */
export function testConstantOffset(matrix, rng) {
  const NAME = "Constant-Offset Blocks";
  const CAT = "copied";
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nC < 2 || nR < 4) return { name: NAME, category: CAT, flag: "N/A", description: "Insufficient data (≥2 cols, ≥4 rows required)." };

  // ── Additive pass: d = col_j - col_i ──
  const addDiffVecs = [];
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
    const diffs = [];
    for (let r = 0; r < nR; r++) {
      if (matrix[r][c1] != null && matrix[r][c2] != null) {
        const d = Math.round((matrix[r][c1] - matrix[r][c2]) * 10000) / 10000;
        diffs.push({ pos: r + 1, d });
      } else {
        diffs.push(null);
      }
    }
    addDiffVecs.push({ c1, c2, diffs });
  }
  const addResult = _runBlockDetection(addDiffVecs, rng, nR);

  // ── Multiplicative pass: d_log = log(col_j) - log(col_i) ──
  // Only for pairs where both columns are strictly positive.
  const mulDiffVecs = [];
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
    // Check that both columns have all non-null values > 0
    let allPos = true;
    for (let r = 0; r < nR; r++) {
      if (matrix[r][c1] != null && matrix[r][c1] <= 0) { allPos = false; break; }
      if (matrix[r][c2] != null && matrix[r][c2] <= 0) { allPos = false; break; }
    }
    if (!allPos) continue;
    const diffs = [];
    for (let r = 0; r < nR; r++) {
      if (matrix[r][c1] != null && matrix[r][c2] != null) {
        const d = Math.round((Math.log(matrix[r][c1]) - Math.log(matrix[r][c2])) * 10000) / 10000;
        diffs.push({ pos: r + 1, d });
      } else {
        diffs.push(null);
      }
    }
    mulDiffVecs.push({ c1, c2, diffs });
  }
  const mulResult = mulDiffVecs.length > 0 ? _runBlockDetection(mulDiffVecs, rng, nR) : null;

  // ── Combine: pick the pass with the better (lower) p-value ──
  let best, offsetType;
  if (!mulResult || addResult.permP <= mulResult.permP) {
    best = addResult;
    offsetType = 'additive';
  } else {
    best = mulResult;
    offsetType = 'multiplicative';
  }

  // Convert multiplicative offsets to ratio format for display
  const details = best.found.map(d => {
    if (offsetType === 'multiplicative') {
      // d.diff is log-space difference; ratio = exp(d.diff)
      const ratio = Math.exp(parseFloat(d.diff));
      return { ...d, diff: `×${ratio.toFixed(4)}` };
    }
    return d;
  });

  const desc = offsetType === 'multiplicative'
    ? "When one replicate is a scaled copy of another (multiplied by a constant factor), the log-ratio between them stays the same from row to row. This card detected multiplicative offsets — consecutive rows sharing the same inter-replicate ratio beyond chance expectation."
    : "When one replicate is copied from another with a fixed amount added or subtracted, the difference between them stays exactly the same from row to row. This card counts how often consecutive rows share the same inter-replicate difference — more than chance predicts means some rows may share a common offset.";

  // Flag: permutation p-value with block rate gate at large N
  const blockRate = best.blocks / Math.max(best.totalPairs, 1);
  const esGate = nR >= 500 && blockRate < 0.01;
  let flag = esGate ? "LOW" : flagFromP(best.permP);
  if (!esGate && flag === "LOW" && best.anyPairSig) flag = "MODERATE";

  const severityClass = best.blocks >= EFFECT_SIZE.CONST_OFFSET_HIGH_BLOCKS ? "high"
    : best.blocks >= 2 ? "moderate" : "low";

  return {
    name: NAME, category: CAT,
    description: desc,
    offsetType, severityClass,
    consecutiveEqualDiffs: best.blocks, totalConsecutivePairs: best.totalPairs, nRows: nR,
    blockRate: (blockRate * 100).toFixed(2) + "%",
    expectedByChance: best.expectedCount.toFixed(1), expectedRate: (best.pMatch * 100).toFixed(2) + "%",
    excessZ: best.zExcess.toFixed(2), permP: best.permP.toFixed(4), nPerm: best.nPerm, primaryP: best.permP,
    flag, details,
    // Include both passes for diagnostics
    addP: addResult.permP, mulP: mulResult ? mulResult.permP : null,
    // Group data for convergence layer — 0-based row pairs
    groups: details.slice(0, 20).map((d, i) => {
      const m = String(d.positions || "").match(/(\d+)\s*[–-]\s*(\d+)/);
      if (!m) return null;
      return { id: i, rows: [parseInt(m[1]) - 1, parseInt(m[2]) - 1], type: "offset", testKey: "constOffset", offset: d.diff, pair: d.pair };
    }).filter(Boolean),
  };
}

/**
 * Core block-detection + permutation null algorithm.
 * Shared by additive and multiplicative passes.
 */
function _runBlockDetection(pairDiffVecs, rng, nR) {
  // Count observed consecutive equal-difference pairs
  function countBlocksPerPair(diffVecs) {
    const perPair = [];
    let bTotal = 0, tpTotal = 0;
    for (const { diffs } of diffVecs) {
      let b = 0, tp = 0;
      for (let i = 0; i < diffs.length - 1; i++) {
        if (diffs[i] && diffs[i + 1]) { tp++; if (diffs[i].d === diffs[i + 1].d && diffs[i].d !== 0) b++; }
      }
      perPair.push(b);
      bTotal += b; tpTotal += tp;
    }
    return { b: bTotal, tp: tpTotal, perPair };
  }

  const obs = countBlocksPerPair(pairDiffVecs);
  const blocks = obs.b, totalPairs = obs.tp;

  // Collect display instances
  const found = [];
  for (const { c1, c2, diffs } of pairDiffVecs) {
    for (let i = 0; i < diffs.length - 1; i++) {
      if (diffs[i] && diffs[i + 1] && diffs[i].d === diffs[i + 1].d && diffs[i].d !== 0 && found.length < 20)
        found.push({ pair: `R${c1 + 1}–R${c2 + 1}`, positions: `${diffs[i].pos}–${diffs[i + 1].pos}`, diff: diffs[i].d.toFixed(4) });
    }
  }

  // Birthday-problem z-test (diagnostic reference)
  const allDiffs = [];
  for (const { diffs } of pairDiffVecs) for (const d of diffs) if (d !== null) allDiffs.push(d.d);
  const diffFreq = {};
  for (const d of allDiffs) diffFreq[d] = (diffFreq[d] || 0) + 1;
  const nD = allDiffs.length;
  const pMatch = nD > 0 ? Object.values(diffFreq).reduce((s, c) => s + (c / nD) ** 2, 0) : 0;
  const expectedCount = pMatch * totalPairs;
  const sigma = totalPairs > 0 && pMatch > 0 && pMatch < 1 ? Math.sqrt(totalPairs * pMatch * (1 - pMatch)) : 1;
  const zExcess = sigma > 0 ? (blocks - expectedCount - 0.5) / sigma : 0;

  // ── Permutation null ──
  const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;
  const MAX_PERM_PAIRS = 30;
  const permVecs = pairDiffVecs.length > MAX_PERM_PAIRS
    ? pairDiffVecs.filter((_, i) => i % Math.ceil(pairDiffVecs.length / MAX_PERM_PAIRS) === 0)
    : pairDiffVecs;
  const obsSubset = permVecs === pairDiffVecs ? obs : countBlocksPerPair(permVecs);
  const nPermPairs = permVecs.length;

  // S159c — pre-allocate per-pair scratch:
  //   nonNullValsOrig — Float64Array of the original (un-shuffled) non-null d-values
  //   nonNullValsShuf — Float64Array same length, refilled+shuffled per perm
  //   rankAt          — Int32Array(diffs.length) mapping diffs index → rank in non-null subset (-1 for null)
  // The original code re-built fresh Array structures per perm (filter+map+
  // destructuring-swap+map → ~5 arrays/objects per pair). The hoisted form
  // does O(nValid) per perm with no allocation.
  const permScratch = permVecs.map(({ diffs }) => {
    const nValid = diffs.reduce((n, d) => n + (d !== null ? 1 : 0), 0);
    const valsOrig = new Float64Array(nValid);
    const valsShuf = new Float64Array(nValid);
    const rankAt   = new Int32Array(diffs.length);
    let k = 0;
    for (let i = 0; i < diffs.length; i++) {
      if (diffs[i] !== null) { valsOrig[k] = diffs[i].d; rankAt[i] = k; k++; }
      else rankAt[i] = -1;
    }
    return { valsOrig, valsShuf, rankAt, nValid, diffs };
  });

  // countBlocksFromShuffled — operates on the shuffled non-null vals using
  // pre-computed rankAt. Same semantics as countBlocksPerPair on a freshly
  // shuffled diffs view: consecutive original-space pair (i, i+1) contributes
  // when both positions are non-null AND vals[rankAt[i]] === vals[rankAt[i+1]]
  // AND that value ≠ 0.
  function countBlocksFromShuffled(diffs, valsShuf, rankAt) {
    let b = 0, tp = 0;
    for (let i = 0; i < diffs.length - 1; i++) {
      if (diffs[i] && diffs[i + 1]) {
        tp++;
        const v1 = valsShuf[rankAt[i]];
        const v2 = valsShuf[rankAt[i + 1]];
        if (v1 === v2 && v1 !== 0) b++;
      }
    }
    return { b, tp };
  }

  let permExceed = 0;
  const pairExceed = new Array(nPermPairs).fill(0);
  for (let p = 0; p < N_PERM; p++) {
    let permTotalB = 0;
    for (let pi = 0; pi < nPermPairs; pi++) {
      const sc = permScratch[pi];
      const valsShuf = sc.valsShuf;
      const valsOrig = sc.valsOrig;
      const nValid = sc.nValid;
      // Refill + Fisher-Yates shuffle in place
      for (let i = 0; i < nValid; i++) valsShuf[i] = valsOrig[i];
      for (let i = nValid - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        const tmp = valsShuf[i]; valsShuf[i] = valsShuf[j]; valsShuf[j] = tmp;
      }
      const pObs = countBlocksFromShuffled(sc.diffs, valsShuf, sc.rankAt);
      permTotalB += pObs.b;
      if (pObs.b >= obsSubset.perPair[pi]) pairExceed[pi]++;
    }
    if (permTotalB >= obsSubset.b) permExceed++;
  }
  const permP = (permExceed + 1) / (N_PERM + 1);

  // Per-pair BH-FDR promotion
  const pairPermPs = pairExceed.map(e => (e + 1) / (N_PERM + 1));
  const pairAdjPs = bhFDR(pairPermPs);
  const anyPairSig = pairAdjPs.some(p => p < ALPHA.FLAG);

  return { blocks, totalPairs, found, permP, nPerm: N_PERM, expectedCount, pMatch, zExcess, anyPairSig };
}

import { bhFDR } from "../stats/primitives.js";
import { flagFromP, ALPHA } from "../constants/thresholds.js";

/* 27. Blocked Mahalanobis Covariance-Anomaly Detection
   Detects contiguous row blocks whose cross-replicate covariance Σ or mean μ
   diverges from the rest of the condition — a signature of factor-model
   injection, block copy-paste with perturbation, or unrecorded localised
   batch effects that §2.6 row-level D² misses (individual rows may be
   marginally consistent while the joint structure is anomalous).

   Two passes per window per condition:
     μ-pass — Hotelling T² on block-vs-complement mean separation with
       Ledoit-Wolf-shrunk pooled within-group covariance.
     Σ-pass — eigenvalue ratio R = λ_max(Σ̂_B · Σ̂_{\B}^{-1}) on independently
       LW-shrunk block and complement covariances (one-sided, inflation only).

   Per-condition scan statistic = max across windows. Within-condition row-
   shuffle permutation null with rank-accumulator counting. BH-FDR across
   (pass × condition) units, m = 2·nCond. primaryP = min adj-p.

   Reference: Ledoit, O. & Wolf, M. (2004). A well-conditioned estimator for
   large-dimensional covariance matrices. J. Multivariate Analysis 88(2).
   Anderson (2003) §10.8 for the LR / two-sample T² framework.

   S159 — pre-allocated scratch buffers. The permutation null calls
   scanCondition N_PERM × nCond times; each call entered the window loop
   nWin times and allocated ~50 fresh small arrays (covariance matrices,
   means, augmented inversion buffer, eigenvector scratch). On DS21
   (N_PERM=4999, 2 conds, 18 windows) that compounds to tens of millions
   of allocations. V8 in Node absorbs the churn; browser GC does not.
   The arithmetic is unchanged — every per-window matrix that was
   allocated fresh is now pre-allocated once per slice and written into
   in place. The local invertInto helper replaces primitives.invertMatrix
   for the same reason (its augmented matrix + .map(row.slice) return
   path allocated ~2n+2 arrays per call).

   See METHODOLOGY.md §"2.6b Blocked Mahalanobis".
*/

const MIN_N_CONSTRUCT = 60;
const MIN_NC = 3;
const DETAILS_CAP = 30;

/** Compute p×p sample covariance (unbiased, N-1 denominator) of `rows`
 *  about the supplied `mean`. Writes into `outS` (Array<Float64Array>,
 *  pre-allocated by caller). Caller guarantees rows have length p. */
function sampleCov(rows, mean, p, outS) {
  // Zero the output (sampleCov uses += for the upper triangle).
  for (let a = 0; a < p; a++) outS[a].fill(0);
  const N = rows.length;
  if (N < 2) return;
  for (let i = 0; i < N; i++) {
    const row = rows[i];
    for (let a = 0; a < p; a++) {
      const da = row[a] - mean[a];
      const rowA = outS[a];
      for (let b = a; b < p; b++) {
        rowA[b] += da * (row[b] - mean[b]);
      }
    }
  }
  const denom = N - 1;
  for (let a = 0; a < p; a++) {
    const rowA = outS[a];
    for (let b = a; b < p; b++) {
      rowA[b] /= denom;
      if (a !== b) outS[b][a] = rowA[b];
    }
  }
}

/** Ledoit-Wolf linear shrinkage toward the scaled-identity target
 *  T = (trace(S)/p)·I, per Ledoit & Wolf (2004) Theorem 1. Closed-form
 *  shrinkage intensity α̂ = min(1, max(0, β̂² / δ̂²)) with
 *  β̂² = (1/N²) Σ_i ‖(x_i − μ̂)(x_i − μ̂)^T − S‖²_F and
 *  δ̂² = ‖S − T‖²_F. Output Σ̂ = (1 − α̂)·S + α̂·T written into `outShrunk`. */
function ledoitWolfShrink(rows, mean, S, p, outShrunk) {
  const N = rows.length;
  if (N < 2) {
    for (let a = 0; a < p; a++) {
      const inRow = S[a], outRow = outShrunk[a];
      for (let b = 0; b < p; b++) outRow[b] = inRow[b];
    }
    return 0;
  }

  // target diagonal entry = trace(S) / p
  let trS = 0;
  for (let i = 0; i < p; i++) trS += S[i][i];
  const mu = trS / p;

  // δ² = Σ (S_ij − T_ij)²
  let delta2 = 0;
  for (let a = 0; a < p; a++) {
    const rowA = S[a];
    for (let b = 0; b < p; b++) {
      const t = (a === b) ? mu : 0;
      const d = rowA[b] - t;
      delta2 += d * d;
    }
  }

  // β² = (1/N²) Σ_i ‖x_i x_i^T − S‖²_F where x_i is the centered row.
  let sumBeta = 0;
  for (let i = 0; i < N; i++) {
    const row = rows[i];
    for (let a = 0; a < p; a++) {
      const da = row[a] - mean[a];
      const rowA = S[a];
      for (let b = 0; b < p; b++) {
        const diff = da * (row[b] - mean[b]) - rowA[b];
        sumBeta += diff * diff;
      }
    }
  }
  const beta2Raw = sumBeta / (N * N);
  // Clip β² at δ² per Ledoit & Wolf — ensures α̂ ∈ [0, 1].
  const beta2 = Math.min(beta2Raw, delta2);

  let alpha = delta2 > 0 ? beta2 / delta2 : 0;
  if (alpha < 0) alpha = 0;
  if (alpha > 1) alpha = 1;

  const oneMinus = 1 - alpha;
  for (let a = 0; a < p; a++) {
    const outRow = outShrunk[a], inRow = S[a];
    for (let b = 0; b < p; b++) {
      const t = (a === b) ? mu : 0;
      outRow[b] = oneMinus * inRow[b] + alpha * t;
    }
  }
  return alpha;
}

/** Dominant (largest positive) eigenvalue of A (p×p) via power iteration
 *  with Rayleigh-quotient estimate. A is expected similar to a PD matrix
 *  (for the caller's use Σ_B · Σ_{\B}^{-1}), so the dominant eigenvalue
 *  is real and positive. Returns 0 on numerical breakdown.
 *  `v` and `w` are caller-supplied Float64Array(p) scratch buffers. */
function dominantEigenvalue(A, p, v, w) {
  const MAX_IT = 200;
  const TOL = 1e-9;
  v.fill(0);
  v[0] = 1;
  let lambda = 0;
  for (let it = 0; it < MAX_IT; it++) {
    for (let i = 0; i < p; i++) {
      const Ai = A[i];
      let s = 0;
      for (let j = 0; j < p; j++) s += Ai[j] * v[j];
      w[i] = s;
    }
    // Rayleigh quotient: λ ≈ (vᵀ A v) / (vᵀ v) = (vᵀ w) / (vᵀ v)
    let num = 0, den = 0;
    for (let i = 0; i < p; i++) { num += w[i] * v[i]; den += v[i] * v[i]; }
    const newLambda = den > 0 ? num / den : 0;
    // Normalise for next iter
    let norm = 0;
    for (let i = 0; i < p; i++) norm += w[i] * w[i];
    norm = Math.sqrt(norm);
    if (!isFinite(norm) || norm < 1e-300) return lambda;
    for (let i = 0; i < p; i++) v[i] = w[i] / norm;
    if (it > 0 && Math.abs(newLambda - lambda) < TOL * (1 + Math.abs(newLambda))) {
      return newLambda;
    }
    lambda = newLambda;
  }
  return lambda;
}

/** In-place Gauss-Jordan inverter. Writes M⁻¹ into `out`
 *  (Array<Float64Array>); uses `aug` (Array<Float64Array> of width 2n)
 *  as workspace. Returns true on success, false if M is singular at the
 *  1e-12 pivot tolerance. Replaces primitives.invertMatrix to avoid its
 *  Array.from(...) augmented-matrix allocation + .map(row.slice) return
 *  path — both ran twice per window per permutation. */
function invertInto(M, n, aug, out) {
  // Build augmented [M | I] into the pre-allocated aug buffer.
  for (let i = 0; i < n; i++) {
    const augRow = aug[i];
    augRow.fill(0);
    const Mi = M[i];
    for (let j = 0; j < n; j++) augRow[j] = Mi[j];
    augRow[n + i] = 1;
  }
  const twoN = 2 * n;
  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(aug[row][col]);
      if (v > maxVal) { maxVal = v; maxRow = row; }
    }
    if (maxVal < 1e-12) return false; // singular

    if (maxRow !== col) {
      const tmp = aug[col]; aug[col] = aug[maxRow]; aug[maxRow] = tmp;
    }

    // Scale pivot row
    const pivotRow = aug[col];
    const pivot = pivotRow[col];
    for (let j = 0; j < twoN; j++) pivotRow[j] /= pivot;

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const augRow = aug[row];
      const factor = augRow[col];
      if (factor === 0) continue;
      for (let j = 0; j < twoN; j++) augRow[j] -= factor * pivotRow[j];
    }
  }

  // Extract inverse into out
  for (let i = 0; i < n; i++) {
    const outRow = out[i];
    const augRow = aug[i];
    for (let j = 0; j < n; j++) outRow[j] = augRow[n + j];
  }
  return true;
}

/** Allocate one set of scratch buffers for a single condition slice. All
 *  buffers depend only on p, W (block size), and Ncomp (= N − W). Sized
 *  once and reused across the observed pass + N_PERM permutations. */
function makeScratch(p, B, Ncomp) {
  const mat = () => {
    const m = new Array(p);
    for (let i = 0; i < p; i++) m[i] = new Float64Array(p);
    return m;
  };
  const aug = new Array(p);
  for (let i = 0; i < p; i++) aug[i] = new Float64Array(2 * p);
  return {
    totalSum: new Float64Array(p),
    muB: new Float64Array(p),
    blockSum: new Float64Array(p),
    muC: new Float64Array(p),
    dmu: new Float64Array(p),
    eigV: new Float64Array(p),
    eigW: new Float64Array(p),
    S_B: mat(), S_C: mat(),
    sigB: mat(), sigC: mat(),
    sigP: mat(),
    invSigP: mat(), invSigC: mat(),
    M_prod: mat(),
    aug,
    blockRows: new Array(B),
    compRows: new Array(Ncomp),
  };
}

/** Compute block-vs-complement scan statistics on one condition's row
 *  set. Returns { tsqMax, rMax }. If `perWindowOut` is non-null, also
 *  writes per-window observed { start, end, tsq, r } into it (observed
 *  pass only — permutation pass passes null). All numeric scratch is
 *  pre-allocated in `scratch` (see makeScratch). */
function scanCondition(rows, windows, p, scratch, perWindowOut) {
  const N = rows.length;
  const {
    totalSum, muB, blockSum, muC, dmu, eigV, eigW,
    S_B, S_C, sigB, sigC, sigP, invSigP, invSigC, M_prod,
    aug, blockRows, compRows,
  } = scratch;

  let tsqMax = 0, rMax = 0;

  // Pre-compute row contributions for complement mean: total sum across all
  // rows, then complement mean = (total − block_sum) / (N − B).
  totalSum.fill(0);
  for (let i = 0; i < N; i++) {
    const row = rows[i];
    for (let j = 0; j < p; j++) totalSum[j] += row[j];
  }

  for (let wIdx = 0; wIdx < windows.length; wIdx++) {
    const win = windows[wIdx];
    const start = win.start, end = win.end;
    const B = end - start;
    const Ncomp = N - B;

    // Block mean
    muB.fill(0);
    for (let i = start; i < end; i++) {
      const row = rows[i];
      for (let j = 0; j < p; j++) muB[j] += row[j];
    }
    for (let j = 0; j < p; j++) {
      blockSum[j] = muB[j];
      muB[j] /= B;
    }

    // Complement mean from totalSum − blockSum
    for (let j = 0; j < p; j++) muC[j] = (totalSum[j] - blockSum[j]) / Ncomp;

    // Assemble block and complement row views (into pre-allocated buffers)
    for (let i = 0; i < B; i++) blockRows[i] = rows[start + i];
    let k = 0;
    for (let i = 0; i < start; i++) compRows[k++] = rows[i];
    for (let i = end; i < N; i++) compRows[k++] = rows[i];

    // Sample covariances (unbiased) — write into S_B / S_C
    sampleCov(blockRows, muB, p, S_B);
    sampleCov(compRows, muC, p, S_C);

    // Ledoit-Wolf shrinkage (independent per side) — write into sigB / sigC
    ledoitWolfShrink(blockRows, muB, S_B, p, sigB);
    ledoitWolfShrink(compRows, muC, S_C, p, sigC);

    // μ-pass: pool shrunk covariances weighted by DoF.
    for (let a = 0; a < p; a++) {
      const rowP = sigP[a], rowB = sigB[a], rowC = sigC[a];
      for (let b = 0; b < p; b++) {
        rowP[b] = ((B - 1) * rowB[b] + (Ncomp - 1) * rowC[b]) / (N - 2);
      }
    }
    let tsq = 0;
    if (invertInto(sigP, p, aug, invSigP)) {
      for (let j = 0; j < p; j++) dmu[j] = muB[j] - muC[j];
      let quad = 0;
      for (let a = 0; a < p; a++) {
        const inv_a = invSigP[a];
        let rowSum = 0;
        for (let b = 0; b < p; b++) rowSum += inv_a[b] * dmu[b];
        quad += dmu[a] * rowSum;
      }
      tsq = quad * (B * Ncomp) / N;
      if (!isFinite(tsq) || tsq < 0) tsq = 0;
    }

    // Σ-pass: R = λ_max(sigB · sigC^{-1})
    let r = 0;
    if (invertInto(sigC, p, aug, invSigC)) {
      for (let a = 0; a < p; a++) {
        const rowOut = M_prod[a], rowB = sigB[a];
        for (let b = 0; b < p; b++) {
          let s = 0;
          for (let kk = 0; kk < p; kk++) s += rowB[kk] * invSigC[kk][b];
          rowOut[b] = s;
        }
      }
      r = dominantEigenvalue(M_prod, p, eigV, eigW);
      if (!isFinite(r) || r < 0) r = 0;
    }

    if (tsq > tsqMax) tsqMax = tsq;
    if (r > rMax) rMax = r;
    if (perWindowOut) {
      perWindowOut[wIdx] = { start, end, tsq, r };
    }
  }

  return { tsqMax, rMax };
}

/**
 * Blocked Mahalanobis covariance-anomaly scan.
 *
 * Applicability gates (fail-fast, in order):
 *   1. dataType === 'continuous' (count + survey route to N/A upstream via
 *      DATATYPE_SKIP; still double-checked here).
 *   2. nC ≥ 3 replicate columns.
 *   3. Per-condition row count ≥ 60 after null filtering.
 *   4. Enough rows for ≥ 1 full window at W = max(30, 3·nC), stride W/3.
 *
 * @param {number[][]} matrix - Numeric matrix (rows × replicate cols).
 *   VST-transformed when VST is active (routed by engine).
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} condCtx
 * @param {{shuffle: function(any[]): void}} rng - Seeded PRNG from engine.
 * @param {string} [dataType='continuous']
 * @returns {object} Standard test-result object with primaryP + details.
 * @see METHODOLOGY.md §"2.6b Blocked Mahalanobis"
 */
export function testBlockedMahalanobis(matrix, condCtx, rng, dataType = 'continuous') {
  const NAME = "Blocked Mahalanobis";
  const CAT = "replicate";

  if (dataType !== 'continuous') {
    return { name: NAME, category: CAT, flag: "N/A",
      description: `Not applicable to ${dataType} data (covariance structure null is only stable on continuous measurements).` };
  }

  const nR = matrix.length;
  const nC = matrix[0]?.length || 0;
  if (nC < MIN_NC) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: `Need ≥${MIN_NC} replicate columns for a non-degenerate covariance estimate (have ${nC}).` };
  }

  // Resolve per-condition slices. Falls back to a single "All data" slice when
  // no condition labels are present.
  const slices = (condCtx && condCtx.has && condCtx.count >= 1)
    ? condCtx.slices()
    : [{ name: "All data", matrix }];

  // Build working slices: collect complete (no-null) rows per slice; drop
  // slices below MIN_N_CONSTRUCT.
  const workSlices = [];
  for (const s of slices) {
    const sMatrix = s.matrix;
    const p = sMatrix[0]?.length || 0;
    if (p < MIN_NC) continue;
    const completeRows = [];
    const origIdx = [];  // index within s.matrix
    for (let i = 0; i < sMatrix.length; i++) {
      const row = sMatrix[i];
      if (row.every(v => v != null && isFinite(v))) {
        completeRows.push(row);
        origIdx.push(i);
      }
    }
    if (completeRows.length < MIN_N_CONSTRUCT) continue;
    workSlices.push({
      name: s.name,
      rows: completeRows,
      origIdx,
      rowIndices: s.rowIndices || null,  // row-grouped only: maps origIdx → full-matrix row
      p,
    });
  }

  if (!workSlices.length) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: `Need ≥${MIN_N_CONSTRUCT} complete rows per condition (have ${nR} total rows across conditions).` };
  }

  // Window size is governed by the first slice's replicate count; all column-
  // grouped slices share the same p, and row-grouped conditions always do.
  const p = workSlices[0].p;
  const W = Math.max(30, 3 * p);
  const S_STRIDE = Math.max(10, Math.floor(W / 3));

  // Build per-slice window schedule.
  for (const ws of workSlices) {
    const N = ws.rows.length;
    const nWin = Math.floor((N - W) / S_STRIDE) + 1;
    if (nWin < 1) { ws.skip = true; continue; }
    ws.N = N;
    ws.nWindows = nWin;
    ws.windows = new Array(nWin);
    for (let i = 0; i < nWin; i++) {
      const start = i * S_STRIDE;
      ws.windows[i] = { start, end: start + W };
    }
  }
  const applicable = workSlices.filter(ws => !ws.skip);
  if (!applicable.length) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: `Insufficient rows per condition for the windowed scan (W=${W}, stride=${S_STRIDE}).` };
  }

  // S159 — pre-allocate one scratch bundle per slice, reused across
  // observed + N_PERM permutation calls. Buffer shapes depend on p (column
  // count) and N (slice row count) only; both are fixed at this point.
  for (const ws of applicable) {
    ws.scratch = makeScratch(p, W, ws.N - W);
  }

  // ── Observed statistics ──
  for (const ws of applicable) {
    const perWindowOut = new Array(ws.windows.length);
    const { tsqMax, rMax } = scanCondition(ws.rows, ws.windows, p, ws.scratch, perWindowOut);
    ws.obsTsq = tsqMax;
    ws.obsR = rMax;
    ws.obsPerWindow = perWindowOut;
  }

  // Adaptive permutation count: matches LOESS §2.7 precedent on max-N.
  const maxN = Math.max(...applicable.map(ws => ws.N));
  const N_PERM = maxN <= 500 ? 4999 : 999;

  // ── Permutation null (within-condition row shuffle; rank-accumulator) ──
  for (const ws of applicable) {
    ws.exceedTsq = 0;
    ws.exceedR = 0;
  }

  const idxBufs = applicable.map(ws => {
    const idx = new Array(ws.N);
    for (let i = 0; i < ws.N; i++) idx[i] = i;
    return idx;
  });
  const shuffledBufs = applicable.map(ws => new Array(ws.N));

  // S159d — LOW-path early-exit. Exceedance counters are monotone
  // non-decreasing, so the (k+1)/(B+1) rawP can only grow as more
  // permutations are tried. The floor rawP at iteration b — computed
  // assuming zero future exceedances — equals (exceed_now+1)/(N_PERM+1).
  // Apply BH-FDR to the floor-rawP vector; if min adj-p already exceeds
  // ALPHA.NOTE, no future permutation can pull primaryP back into
  // MOD/HIGH territory — the test is mathematically determined to be LOW.
  //
  // PRNG preservation: many downstream tests in engine.js (Kurtosis,
  // Entropy, Column GoF, Autocorrelation et al.) consume rng AFTER BM in
  // the dispatch sequence. Skipping `rng.shuffle(idx)` here would advance
  // the engine PRNG by fewer calls, changing every downstream test's
  // output. To preserve batch reproducibility, the shuffle is kept live
  // on every iteration; only the expensive `scanCondition` + the
  // shuffled-row write loop are skipped. Shuffle cost is ~N random()
  // calls vs scanCondition's ~25k FP ops per slice per iter (ratio
  // ~125:1), so the saving is ~99% of the per-iter cost on the
  // skipped path.
  //
  // Minimum burn-in b ≥ 20 — avoids premature exit when the first few
  // permutations happen to over-exceed before the null is well-sampled.
  const EARLY_EXIT_BURN_IN = 20;
  let earlyExit = false;
  for (let b = 0; b < N_PERM; b++) {
    for (let si = 0; si < applicable.length; si++) {
      const ws = applicable[si];
      const idx = idxBufs[si];
      rng.shuffle(idx); // ALWAYS — preserves engine PRNG state
      if (earlyExit) continue;
      const shuffled = shuffledBufs[si];
      for (let i = 0; i < ws.N; i++) shuffled[i] = ws.rows[idx[i]];
      const { tsqMax, rMax } = scanCondition(shuffled, ws.windows, p, ws.scratch, null);
      if (tsqMax >= ws.obsTsq) ws.exceedTsq++;
      if (rMax >= ws.obsR) ws.exceedR++;
    }
    // Early-exit check (only when in-flight; one-shot decision)
    if (!earlyExit && b >= EARLY_EXIT_BURN_IN) {
      const floorRawPs = new Array(applicable.length * 2);
      let k = 0;
      for (const ws of applicable) {
        floorRawPs[k++] = (ws.exceedTsq + 1) / (N_PERM + 1);
        floorRawPs[k++] = (ws.exceedR + 1) / (N_PERM + 1);
      }
      const floorAdjPs = bhFDR(floorRawPs);
      let minFloorAdjP = Infinity;
      for (const p of floorAdjPs) if (p < minFloorAdjP) minFloorAdjP = p;
      if (minFloorAdjP > ALPHA.NOTE) {
        earlyExit = true;
      }
    }
  }

  // ── BH-FDR across (pass × condition) units ──
  const units = [];
  for (const ws of applicable) {
    const rawMu = (ws.exceedTsq + 1) / (N_PERM + 1);
    const rawSig = (ws.exceedR + 1) / (N_PERM + 1);
    units.push({ pass: 'mu', condition: ws.name, rawP: rawMu, obs: ws.obsTsq, perWindow: ws.obsPerWindow, ws });
    units.push({ pass: 'sigma', condition: ws.name, rawP: rawSig, obs: ws.obsR, perWindow: ws.obsPerWindow, ws });
  }
  const adjPs = bhFDR(units.map(u => u.rawP));
  units.forEach((u, i) => { u.adjP = adjPs[i]; });

  const primaryP = Math.min(...units.map(u => u.adjP));
  const flag = flagFromP(primaryP);

  // ── Build details: one row per unit × best window ──
  // Per-window: report the argmax window for each (pass × condition) unit, plus
  // all windows whose per-window stat is within 5% of the max (so forensically
  // relevant neighbouring windows surface even though BH runs at condition-
  // level scan-max). Cap total at DETAILS_CAP; sort by adj-p asc, then stat desc.
  const detailRows = [];
  for (const u of units) {
    const statKey = u.pass === 'mu' ? 'tsq' : 'r';
    // Find argmax for this unit
    let maxStat = -Infinity;
    for (const pw of u.perWindow) if (pw[statKey] > maxStat) maxStat = pw[statKey];
    const cutoff = maxStat * 0.95;
    // Filter windows above cutoff; clamp to top 3 per unit to keep table lean
    const hits = u.perWindow
      .filter(pw => pw[statKey] >= cutoff && pw[statKey] > 0)
      .sort((a, b) => b[statKey] - a[statKey])
      .slice(0, 3);
    for (const pw of hits) {
      const startFileRow = u.ws.rowIndices
        ? u.ws.rowIndices[u.ws.origIdx[pw.start]] + 1
        : u.ws.origIdx[pw.start] + 1;
      // end is exclusive; last row index is end - 1
      const endFileRow = u.ws.rowIndices
        ? u.ws.rowIndices[u.ws.origIdx[pw.end - 1]] + 1
        : u.ws.origIdx[pw.end - 1] + 1;
      detailRows.push({
        source: 'block',
        pass: u.pass === 'mu' ? 'μ-pass' : 'Σ-pass',
        passKey: u.pass,
        condition: u.condition,
        startRow: startFileRow,
        endRow: endFileRow,
        rows: `${startFileRow}–${endFileRow}`,
        statType: u.pass === 'mu' ? 'T²' : 'λ',
        stat: pw[statKey].toFixed(3),
        rawP: u.rawP,
        adjP: u.adjP,
        significant: u.adjP < 0.01,
        isBest: pw[statKey] === maxStat,
      });
    }
  }
  detailRows.sort((a, b) => a.adjP - b.adjP || parseFloat(b.stat) - parseFloat(a.stat));
  const details = detailRows.slice(0, DETAILS_CAP);

  // Best-of-best row for interpretation string
  const bestRow = details[0];
  let interpretation;
  if (flag === "LOW") {
    interpretation = `No block-localised covariance or mean anomaly detected across ${units.length} (pass × condition) units (min adj-p = ${primaryP.toFixed(4)}).`;
  } else if (bestRow) {
    const dirWord = bestRow.passKey === 'mu' ? 'block mean shift' : 'block covariance inflation';
    interpretation = `${dirWord.charAt(0).toUpperCase() + dirWord.slice(1)} in ${bestRow.condition} rows ${bestRow.startRow}–${bestRow.endRow} (${bestRow.statType} = ${bestRow.stat}, adj-p = ${bestRow.adjP < 0.0001 ? '<0.0001' : bestRow.adjP.toFixed(4)}).`;
  } else {
    interpretation = `Flagged at primaryP = ${primaryP.toFixed(4)}.`;
  }

  return {
    name: NAME, category: CAT,
    description: "Looks for contiguous row blocks whose cross-replicate covariance or mean diverges from the rest of the condition. Two passes scan each sliding window — the μ-pass tests block-vs-complement mean separation via Hotelling T² with Ledoit-Wolf-shrunk pooled covariance; the Σ-pass tests block-vs-complement covariance inflation via λ_max(Σ̂_B · Σ̂_{\\B}^{-1}) with independently shrunk covariances. Factor-model value injection, block copy-paste with noise perturbation, and unrecorded localised batch effects all leave signatures this card picks up — complementary to §2.6 Mahalanobis Row Outlier which tests individual rows against a global (μ, Σ).",
    flag, primaryP,
    nConditions: applicable.length,
    nUnits: units.length,
    windowSize: W, stride: S_STRIDE,
    nPerm: N_PERM,
    nWindowsTotal: applicable.reduce((s, ws) => s + ws.nWindows, 0),
    interpretation,
    details,
    conditionNames: applicable.map(ws => ws.name),
  };
}

/** Registry prototype for UI and applicability table. Category/mechanism
 *  routing is governed by TEST_MECHANISM in constants/mechanisms.js. */
export const BLOCKED_MAHALANOBIS_PROTOTYPE = {
  name: "Blocked Mahalanobis",
  category: "replicate",
  dim: "III",
  subgroup: "C",
};

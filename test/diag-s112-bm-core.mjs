// S112 Blocked Mahalanobis shared diagnostic core.
// Reimplements the production scan with parameterizable W so diagnostics
// can sweep scales without mutating src/tests/blockedMahalanobis.js.
// Logic mirrors that file line-for-line — sampleCov, ledoitWolfShrink
// (closed-form β²/δ² with β² clipping), dominantEigenvalue via power iteration,
// and scanCondition are identical to the production versions. MIN_NC, MIN_N
// and BH routing match engine.js dispatch.

import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { createPRNG } = await import('../src/stats/prng.js');
const { bhFDR, invertMatrix } = await import('../src/stats/primitives.js');

export { Papa, extractAnalysisInputs, detectVST, inferRoles, forwardFill,
  preprocessRaw, detectHeaderRows, createPRNG, bhFDR, invertMatrix };

export const MIN_N = 60;
export const MIN_NC = 3;

export function sampleCov(rows, mean, p) {
  const N = rows.length;
  const S = Array.from({ length: p }, () => new Array(p).fill(0));
  if (N < 2) return S;
  for (const row of rows) {
    for (let a = 0; a < p; a++) {
      const da = row[a] - mean[a];
      for (let b = a; b < p; b++) S[a][b] += da * (row[b] - mean[b]);
    }
  }
  const denom = N - 1;
  for (let a = 0; a < p; a++) {
    for (let b = a; b < p; b++) {
      S[a][b] /= denom;
      if (a !== b) S[b][a] = S[a][b];
    }
  }
  return S;
}

export function ledoitWolfShrink(rows, mean, S, p) {
  const N = rows.length;
  if (N < 2) return { shrunk: S.map(r => r.slice()), alpha: 0 };
  let trS = 0;
  for (let i = 0; i < p; i++) trS += S[i][i];
  const mu = trS / p;
  let delta2 = 0;
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
    const t = (a === b) ? mu : 0;
    const d = S[a][b] - t;
    delta2 += d * d;
  }
  let sumBeta = 0;
  for (const row of rows) {
    for (let a = 0; a < p; a++) {
      const da = row[a] - mean[a];
      for (let b = 0; b < p; b++) {
        const diff = da * (row[b] - mean[b]) - S[a][b];
        sumBeta += diff * diff;
      }
    }
  }
  const beta2Raw = sumBeta / (N * N);
  const beta2 = Math.min(beta2Raw, delta2);
  let alpha = delta2 > 0 ? beta2 / delta2 : 0;
  if (alpha < 0) alpha = 0;
  if (alpha > 1) alpha = 1;
  const out = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
    const t = (a === b) ? mu : 0;
    out[a][b] = (1 - alpha) * S[a][b] + alpha * t;
  }
  return { shrunk: out, alpha };
}

export function dominantEigenvalue(A, p) {
  const MAX_IT = 200;
  const TOL = 1e-9;
  let v = new Array(p).fill(0);
  v[0] = 1;
  let lambda = 0;
  for (let it = 0; it < MAX_IT; it++) {
    const w = new Array(p);
    for (let i = 0; i < p; i++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += A[i][j] * v[j];
      w[i] = s;
    }
    let num = 0, den = 0;
    for (let i = 0; i < p; i++) { num += w[i] * v[i]; den += v[i] * v[i]; }
    const newLambda = den > 0 ? num / den : 0;
    let norm = 0;
    for (let i = 0; i < p; i++) norm += w[i] * w[i];
    norm = Math.sqrt(norm);
    if (!isFinite(norm) || norm < 1e-300) return lambda;
    for (let i = 0; i < p; i++) v[i] = w[i] / norm;
    if (it > 0 && Math.abs(newLambda - lambda) < TOL * (1 + Math.abs(newLambda))) return newLambda;
    lambda = newLambda;
  }
  return lambda;
}

/** scanCondition — returns per-window { start, end, tsq, r } + tsqMax/rMax.
 *  Identical to production version. */
export function scanCondition(rows, windows, p) {
  const N = rows.length;
  const perWindow = new Array(windows.length);
  let tsqMax = 0, rMax = 0;
  const totalSum = new Array(p).fill(0);
  for (let i = 0; i < N; i++) for (let j = 0; j < p; j++) totalSum[j] += rows[i][j];

  for (let wIdx = 0; wIdx < windows.length; wIdx++) {
    const { start, end } = windows[wIdx];
    const B = end - start;
    const Ncomp = N - B;
    const muB = new Array(p).fill(0);
    for (let i = start; i < end; i++) for (let j = 0; j < p; j++) muB[j] += rows[i][j];
    const blockSum = muB.slice();
    for (let j = 0; j < p; j++) muB[j] /= B;
    const muC = new Array(p);
    for (let j = 0; j < p; j++) muC[j] = (totalSum[j] - blockSum[j]) / Ncomp;
    const blockRows = new Array(B);
    for (let i = 0; i < B; i++) blockRows[i] = rows[start + i];
    const compRows = new Array(Ncomp);
    let k = 0;
    for (let i = 0; i < start; i++) compRows[k++] = rows[i];
    for (let i = end; i < N; i++) compRows[k++] = rows[i];
    const S_B = sampleCov(blockRows, muB, p);
    const S_C = sampleCov(compRows, muC, p);
    const { shrunk: sigB } = ledoitWolfShrink(blockRows, muB, S_B, p);
    const { shrunk: sigC } = ledoitWolfShrink(compRows, muC, S_C, p);
    const sigP = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
      sigP[a][b] = ((B - 1) * sigB[a][b] + (Ncomp - 1) * sigC[a][b]) / (N - 2);
    }
    const invSigP = invertMatrix(sigP, p);
    let tsq = 0;
    if (invSigP) {
      const dmu = new Array(p);
      for (let j = 0; j < p; j++) dmu[j] = muB[j] - muC[j];
      let quad = 0;
      for (let a = 0; a < p; a++) {
        let row = 0;
        for (let b = 0; b < p; b++) row += invSigP[a][b] * dmu[b];
        quad += dmu[a] * row;
      }
      tsq = quad * (B * Ncomp) / N;
      if (!isFinite(tsq) || tsq < 0) tsq = 0;
    }
    const invSigC = invertMatrix(sigC, p);
    let r = 0;
    if (invSigC) {
      const M = Array.from({ length: p }, () => new Array(p).fill(0));
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
        let s = 0;
        for (let kk = 0; kk < p; kk++) s += sigB[a][kk] * invSigC[kk][b];
        M[a][b] = s;
      }
      r = dominantEigenvalue(M, p);
      if (!isFinite(r) || r < 0) r = 0;
    }
    if (tsq > tsqMax) tsqMax = tsq;
    if (r > rMax) rMax = r;
    perWindow[wIdx] = { start, end, tsq, r };
  }
  return { tsqMax, rMax, perWindow };
}

/** Build sliding-window schedule at custom W (with stride max(10, W/3)). */
export function buildWindows(N, W) {
  const stride = Math.max(10, Math.floor(W / 3));
  const nWin = Math.floor((N - W) / stride) + 1;
  if (nWin < 1) return { windows: [], stride, nWin: 0 };
  const windows = new Array(nWin);
  for (let i = 0; i < nWin; i++) {
    const start = i * stride;
    windows[i] = { start, end: start + W };
  }
  return { windows, stride, nWin };
}

/**
 * One-scale run: for each applicable condition, observed stats + permutation
 * null (within-condition row-shuffle, rank-accumulator). Records the full
 * scan-max permutation distribution (nPerm entries) per (pass × condition)
 * so caller can inspect null percentiles and apply alternative multiplicity
 * corrections. Returns per-(pass × condition) units with rawP and obs stat.
 *
 * @param {Array<{name:string, rows:number[][], p:number}>} slices
 * @param {object} rng  - from createPRNG(matrix); caller decides seed source
 * @param {number} W
 * @param {number} B_perm
 */
export function runScale(slices, rng, W, B_perm) {
  // Build windows per slice; drop below-window slices.
  const applicable = [];
  for (const s of slices) {
    const { windows, stride, nWin } = buildWindows(s.rows.length, W);
    if (nWin < 1) continue;
    applicable.push({ ...s, windows, stride, nWin, N: s.rows.length });
  }
  if (!applicable.length) return { applicable: [], units: [], W, B_perm };

  const p = applicable[0].p;

  // Observed.
  for (const ws of applicable) {
    const { tsqMax, rMax, perWindow } = scanCondition(ws.rows, ws.windows, p);
    ws.obsTsq = tsqMax;
    ws.obsR = rMax;
    ws.obsPerWindow = perWindow;
  }

  // Permutation nulls — store FULL per-perm scan-max distribution per unit.
  // This enables percentile reports and joint-null variant reuse.
  const idxBufs = applicable.map(ws => {
    const idx = new Array(ws.N);
    for (let i = 0; i < ws.N; i++) idx[i] = i;
    return idx;
  });
  const shuffledBufs = applicable.map(ws => new Array(ws.N));
  for (const ws of applicable) {
    ws.permTsq = new Float64Array(B_perm);
    ws.permR = new Float64Array(B_perm);
  }
  for (let b = 0; b < B_perm; b++) {
    for (let si = 0; si < applicable.length; si++) {
      const ws = applicable[si];
      const idx = idxBufs[si];
      const shuffled = shuffledBufs[si];
      rng.shuffle(idx);
      for (let i = 0; i < ws.N; i++) shuffled[i] = ws.rows[idx[i]];
      const { tsqMax, rMax } = scanCondition(shuffled, ws.windows, p);
      ws.permTsq[b] = tsqMax;
      ws.permR[b] = rMax;
    }
  }

  // Per-unit raw-p from the full null (same as production rank-accum).
  const units = [];
  for (const ws of applicable) {
    let exceedTsq = 0, exceedR = 0;
    for (let b = 0; b < B_perm; b++) {
      if (ws.permTsq[b] >= ws.obsTsq) exceedTsq++;
      if (ws.permR[b] >= ws.obsR) exceedR++;
    }
    const rawMu = (exceedTsq + 1) / (B_perm + 1);
    const rawSig = (exceedR + 1) / (B_perm + 1);
    units.push({
      pass: 'mu', condition: ws.name, obs: ws.obsTsq, rawP: rawMu,
      perWindow: ws.obsPerWindow, ws, statKey: 'tsq',
    });
    units.push({
      pass: 'sigma', condition: ws.name, obs: ws.obsR, rawP: rawSig,
      perWindow: ws.obsPerWindow, ws, statKey: 'r',
    });
  }
  return { applicable, units, W, B_perm, stride: applicable[0].stride };
}

/** argmax-window helper for detail reporting. */
export function argmaxWindow(perWindow, statKey) {
  let best = { start: 0, end: 0, stat: -Infinity };
  for (const pw of perWindow) {
    if (pw[statKey] > best.stat) best = { start: pw.start, end: pw.end, stat: pw[statKey] };
  }
  return best;
}

/** Percentile of a sorted Float64Array (linear interpolation). */
export function percentile(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

/** Load a fixture through the production engine pipeline; return per-condition
 *  slice of complete (no-null) rows. origIdx maps back to the original
 *  condition-slice row index (for file-row computation with +1). */
export function loadConditionSlices(file, assay) {
  const csv = readFileSync(join('test/fixtures', file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw); raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const skip = dataType !== 'continuous' || assay === 'genomics';
  const vst = detectVST(matrix, assay);
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const active = vstMatrix || matrix;
  const activeCondCtx = vstMatrix ? condCtx.withMatrix(vstMatrix) : condCtx;

  const rawSlices = (activeCondCtx && activeCondCtx.has && activeCondCtx.count >= 1)
    ? activeCondCtx.slices()
    : [{ name: 'All data', matrix: active }];
  const slices = [];
  for (const s of rawSlices) {
    const sMatrix = s.matrix;
    const p = sMatrix[0]?.length || 0;
    if (p < MIN_NC) continue;
    const completeRows = [];
    const origIdx = [];
    for (let i = 0; i < sMatrix.length; i++) {
      const row = sMatrix[i];
      if (row.every(v => v != null && isFinite(v))) {
        completeRows.push(row);
        origIdx.push(i);
      }
    }
    if (completeRows.length < MIN_N) continue;
    slices.push({
      name: s.name,
      rows: completeRows,
      origIdx,
      rowIndices: s.rowIndices || null,
      p,
    });
  }
  return { slices, vstType, dataType, skip, matrix, nC: matrix[0]?.length || 0 };
}

/** Compute BH-FDR severity flag from primaryP (min adj-p across units). */
export function flagFromP(p) {
  if (p == null || !isFinite(p)) return 'N/A';
  if (p < 0.001) return 'HIGH';
  if (p < 0.01) return 'MOD';
  if (p < 0.05) return 'LOW';
  return 'LOW';
}

/** file-row for slice row index i — origIdx[i] maps into s.matrix; add 1 for 1-based;
 *  row-grouped conditions also need rowIndices mapping. */
export function fileRowFor(ws, sliceRowIdx) {
  const origI = ws.origIdx[sliceRowIdx];
  if (ws.rowIndices) return ws.rowIndices[origI] + 1;
  return origI + 1;
}

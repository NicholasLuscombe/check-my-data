// S364 part B, Step 2 — the matched-n measurement, read at block level.
// READ-ONLY over `src/`. The matched-n null is a diagnostic re-implementation
// inside this probe; nothing in `src/` moves and no batch gate runs.
//
// Step 0.4 established that the 478 condition-units of the S361-family grid are
// really 160 BLOCKS — one (assay, replicates, seed, condition) draw read at three
// `condNoiseRatio` rungs, because `gen-copy-fidelity.mjs:307-308` / `:351-352`
// re-scale already-drawn noise rather than re-drawing it. Measured within-block
// correlation ran 0.92-0.99 and the one Step 0.3b rejection (`general` 6rep)
// STRENGTHENED at block level, because dependence makes three occupied blocks
// more surprising rather than less. So everything here is read at block level.
//
// Three modes:
//
//   --step2a   One read before the measurement, on data already in hand.
//              (1) SOURCE: is the per-condition κ standardised, and by what? —
//                  answered by file and line, then demonstrated numerically on
//                  one seed at two rungs.
//              (2) ρ̂ for the POOLED arm by the same estimator Step 0.4 used on
//                  the per-condition arm. The falsifier is stated in the output.
//
//   --predict  Writes out-s364b/predictions.json from the PRE-matched census
//              alone — the residual `s` after dividing out the √2 the n-mismatch
//              predicts, its implied per-unit floor rate, and the block rate that
//              implies at the pre-matched ρ̂. Written to disk BEFORE --step2b
//              runs so the predictions are on record rather than asserted after
//              the fact. --step2b refuses to run without it.
//
//   --step2b   Rebuilds the per-condition null at the OBSERVED n inside this
//              probe, same seeds and parameters, and recomputes the block
//              structure on the matched-n output (the p-values all move, so the
//              old blocks cannot be carried over).
//
// Reads test/probes/out-s364/units.json, written by probe-s364-promotion-gap.mjs
// --census. Regenerate that first if it is absent (out-* is gitignored, so it
// does not survive a worktree teardown).
//
//   node test/probes/probe-s364-promotion-gap.mjs --census     # ~4 min
//   node test/probes/probe-s364b-matched-n.mjs --step2a
//   node test/probes/probe-s364b-matched-n.mjs --predict
//   node test/probes/probe-s364b-matched-n.mjs --step2b        # ~15 min

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { fitPredictedSigma, kurtosis, trimmedKurtosis, stddev } = await import('../../src/stats/primitives.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { generate } = await import('../gen-copy-fidelity.mjs');

const UNITS = process.env.UNITS || 'test/probes/out-s364/units.json';
const OUTDIR = 'test/probes/out-s364b';
const PRED = `${OUTDIR}/predictions.json`;

// Same grid parameters as probe-s364-promotion-gap.mjs --census, so the draws
// this probe regenerates are the same draws the census recorded.
const SUBJECTS = 120;
const SEED_BASE = 6100;
const gen = (opts) => generate({ k: 1, sigmaS: 0, nSubjects: SUBJECTS, ...opts });

// ── Gaussian helpers — the same forms probe-s364b-mis-centred.mjs and
// probe-s364b-block-recount.mjs use, so a fitted `s` here is directly
// comparable to Step 0's and Step 0.4's. A&S 7.1.26.
function erf(x) {
  const sgn = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sgn * (1 - poly * Math.exp(-x * x));
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const phi = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
function PhiInv(p) {
  let lo = -12, hi = 12;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const MED_ABS_Z = PhiInv(0.75);
const fitS = (medP) => PhiInv(1 - medP / 2) / MED_ABS_Z;

function* zNodes(step = 0.0005, zMax = 9) {
  for (let z = step / 2; z < zMax; z += step) yield [z, 2 * phi(z) * step];
}
function binomBands(q, B) {
  if (q <= 0) return { atFloor: 1, moderate: 0 };
  if (q >= 1) return { atFloor: 0, moderate: 0 };
  const p0 = Math.exp(B * Math.log1p(-q));
  let pmf = p0, mod = 0;
  for (let k = 0; k < 18; k++) { pmf = pmf * ((B - k) / (k + 1)) * (q / (1 - q)); mod += pmf; }
  return { atFloor: p0, moderate: mod };
}
function predict(s, B, bandEdges) {
  let atFloor = 0, moderate = 0, below05 = 0;
  const bands = new Array(bandEdges.length - 1).fill(0);
  for (const [z, w] of zNodes()) {
    const q = 2 * (1 - Phi(s * z));
    const bb = binomBands(q, B);
    atFloor += w * bb.atFloor; moderate += w * bb.moderate;
    if (q < 0.5) below05 += w;
    for (let i = 0; i < bands.length; i++) if (q > bandEdges[i] && q <= bandEdges[i + 1]) { bands[i] += w; break; }
  }
  return { atFloor, moderate, below05, bands };
}

// P(block floors) by nested deterministic quadrature — Step 0.4's machinery,
// unchanged. A Monte-Carlo estimate cannot decide a value a few thousandths
// from 0.05, which is where the corrected tails landed.
const QSTEP = 0.008, QMAX = 8.5;
const QGRID = [];
for (let z = -QMAX; z <= QMAX; z += QSTEP) QGRID.push([z, phi(z) * QSTEP]);
const notFloor = (z, B) => {
  const q = 2 * (1 - Phi(Math.abs(z)));
  return 1 - (q <= 0 ? 1 : q >= 1 ? 0 : Math.exp(B * Math.log1p(-q)));
};
function blockFloorProb(s, B, R, rho) {
  const a = Math.sqrt(Math.max(0, rho)), b = Math.sqrt(Math.max(0, 1 - rho));
  if (b === 0) { let acc = 0; for (const [g, w] of QGRID) acc += w * Math.pow(notFloor(s * a * g, B), R); return 1 - acc; }
  if (a === 0) { let inner = 0; for (const [e, w] of QGRID) inner += w * notFloor(s * b * e, B); return 1 - Math.pow(inner, R); }
  let acc = 0;
  for (const [g, wg] of QGRID) {
    let inner = 0;
    for (const [e, we] of QGRID) inner += we * notFloor(s * (a * g + b * e), B);
    acc += wg * Math.pow(inner, R);
  }
  return 1 - acc;
}

function binomTail(k, n, p) {
  if (!(p > 0 && p < 1)) return NaN;
  const lp = Math.log(p), l1p = Math.log1p(-p);
  let lc = n * l1p;
  const pmfs = [Math.exp(lc)];
  for (let i = 0; i < n; i++) { lc += Math.log((n - i) / (i + 1)) + lp - l1p; pmfs.push(Math.exp(lc)); }
  const above = k > n * p;
  let sum = 0;
  for (let i = 0; i <= n; i++) if (above ? i >= k : i <= k) sum += pmfs[i];
  return sum;
}

const median = (xs) => {
  const s = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const pct = (a, b) => (b ? (100 * a / b).toFixed(2) + '%' : '—');
const f = (x, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : '—');
const tf = (t) => (Number.isFinite(t) ? (t < 0.001 ? t.toExponential(1) : t.toFixed(3)) : '—');

// Spearman with average ranks for ties.
function spearman(xs, ys) {
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(a.length);
    let i = 0;
    while (i < idx.length) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs), ry = rank(ys), n = xs.length;
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = rx[i] - mx, b = ry[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxy / Math.sqrt(sxx * syy);
}
const toRho = (rs) => (Number.isFinite(rs) ? Math.max(0, Math.min(1, 2 * Math.sin(Math.PI * rs / 6))) : NaN);

// ── Engine inputs for one generated draw, without running the battery ────
// Mirrors probe-s364-promotion-gap.mjs's `battery` up to extractAnalysisInputs,
// then engine.js:293-300 for the transformed matrix. `detectVST` returns a
// DECISION, not a matrix (S357) — the matrix is built here the way engine.js
// builds it, not read off the return.
function inputsFor(csv, assay) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, null);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol: null, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  let vstMatrix = null;
  if (vst.transform === 'log') vstMatrix = matrix.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vst.transform === 'anscombe') vstMatrix = matrix.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vstMatrix !== null;
  // engine.js:581 → runPairVST → :310 (hasVST) or :312 (fall through to runPair).
  // useAggregate needs condCtx.type === 'column-grouped'; this fixture is
  // row-grouped, so the test sees the whole matrix either way.
  return { matrix, testMatrix: hasVST ? vstMatrix : matrix, condCtx, vst, hasVST };
}

// kurtosis.js:90-102 — the normaliser the per-condition arm divides by.
function sigmaFor(m) {
  const localSigma = m.map(row => {
    const vals = row.filter(v => v != null);
    return vals.length >= 2 ? stddev(vals) : null;
  });
  const { sigma: predictedSigma, used } = fitPredictedSigma(m);
  return { sigma: used ? predictedSigma : localSigma, usePredicted: used, predictedSigma, localSigma };
}

// kurtosis.js:411-418 — the observed per-condition difference vector, in the
// producer's own (c1 < c2, then rows) order.
function condDiffsFor(m, sigma, idxs) {
  const nC = m[0].length;
  const d = [];
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
    for (const r of idxs) {
      if (m[r][c1] != null && m[r][c2] != null && sigma[r] && sigma[r] > 0) d.push((m[r][c1] - m[r][c2]) / sigma[r]);
    }
  }
  return d;
}

const condIndexOf = (condCtx, nR) => {
  const ci = {};
  const arr = condCtx?.rowConditions || [];
  for (let r = 0; r < nR; r++) { const c = arr[r]; if (c) (ci[c] ||= []).push(r); }
  return ci;
};

// ══ the null, re-implemented ═════════════════════════════════════════════
//
// kurtosis.js:165-326, with the row set as a parameter. `rowIdxs` is what the
// shipped code calls `validRowIdxs` (:176-179) — ALL valid rows. Passing one
// condition's rows instead is the ONLY change the matched-n arm makes; the
// draws, the pair set, the trim fraction, B and the two-sided counting rule are
// untouched.
//
// The multiplications by `sigR` and the division by `sigR` are kept literally
// rather than cancelled: they cancel in algebra, not necessarily in floating
// point, and the shipped run is the thing being reproduced.
function simulateNulls({ rng, rowIdxs, nC, simPairs, sigma, useRobust, B, pilot }) {
  const batchCap = Math.max(1, rowIdxs.length * simPairs.length);
  const batchBuf = new Float64Array(batchCap);
  const sortBuf = new Float64Array(batchCap);
  const simRowBuf = new Float64Array(nC);
  const simKurts = [];
  let earlyExit = false;
  const N_PILOT = 50, PILOT_GATE_FACTOR = 0.5;
  const burnRandnPerIter = rowIdxs.length * nC;

  for (let b = 0; b < B; b++) {
    if (earlyExit) { for (let i = 0; i < burnRandnPerIter; i++) rng.randn(); continue; }
    let batchLen = 0;
    for (let ri = 0; ri < rowIdxs.length; ri++) {
      const r = rowIdxs[ri];
      const sigR = sigma[r];
      if (!sigR || sigR <= 0) continue;
      for (let c = 0; c < nC; c++) simRowBuf[c] = sigR * rng.randn();
      for (let pi = 0; pi < simPairs.length; pi++) {
        const pr = simPairs[pi];
        batchBuf[batchLen++] = (simRowBuf[pr[0]] - simRowBuf[pr[1]]) / sigR;
      }
    }
    if (batchLen >= 20) {
      for (let i = 0; i < batchLen; i++) sortBuf[i] = batchBuf[i];
      sortBuf.subarray(0, batchLen).sort();
      simKurts.push(useRobust ? trimKurtSorted(sortBuf, batchLen) : kurtRange(sortBuf, 0, batchLen));
    }
    if (pilot && !earlyExit && b + 1 === N_PILOT && nC >= 4 && simKurts.length >= 20 && !isNaN(pilot.pooledKurtosis)) {
      const sp = simKurts.slice().sort((x, y) => x - y);
      const med = sp[Math.floor(sp.length / 2)];
      const devs = simKurts.map(v => Math.abs(v - med)).sort((x, y) => x - y);
      const mad = devs[Math.floor(devs.length / 2)];
      if (mad > 0 && Math.abs(pilot.pooledKurtosis - med) < mad * PILOT_GATE_FACTOR) earlyExit = true;
    }
  }
  return { simKurts, earlyExit };
}

// kurtosis.js:30-56, verbatim in arithmetic.
function kurtRange(buf, start, end) {
  const N = end - start;
  if (N < 4) return NaN;
  let sumX = 0; for (let i = start; i < end; i++) sumX += buf[i];
  const m = sumX / N;
  let sumD2 = 0; for (let i = start; i < end; i++) { const d = buf[i] - m; sumD2 += d * d; }
  const v = sumD2 / Math.max(N - 1, 1);
  if (v === 0) return NaN;
  const s = Math.sqrt(v);
  let s4 = 0; for (let i = start; i < end; i++) { const z = (buf[i] - m) / s; s4 += z * z * z * z; }
  return s4 / N - 3;
}
function trimKurtSorted(buf, n) {
  const cut = Math.max(1, Math.floor(n * 0.02));
  if (n - 2 * cut < 4) return NaN;
  return kurtRange(buf, cut, n - cut);
}

// kurtosis.js:422-425 — two-sided about the null MEDIAN, (nExceed + 1)/(B + 1).
function condPFrom(simKurts, condK) {
  const med = simKurts.slice().sort((a, b) => a - b)[Math.floor(simKurts.length / 2)];
  const obsDev = Math.abs(condK - med);
  const nExceed = simKurts.filter(sk => Math.abs(sk - med) >= obsDev).length;
  return (nExceed + 1) / (simKurts.length + 1);
}

// ── census load, shared by every mode ────────────────────────────────────
function loadCensus() {
  const recs = JSON.parse(readFileSync(UNITS, 'utf8'));
  const draws = recs.filter(x => x.kurt);
  const units = draws.flatMap(x => x.kurt.conds.map(c => ({
    ...c, assay: x.assay, nReps: x.nReps, ratio: x.ratio, seed: x.seed,
    nRows: x.nRows, nCols: x.nCols, transform: x.transform, B: x.kurt.nSimulations,
  })));
  const CELLS = [];
  for (const assay of [...new Set(units.map(u => u.assay))])
    for (const nReps of [...new Set(units.map(u => u.nReps))].sort((a, b) => a - b))
      if (units.some(u => u.assay === assay && u.nReps === nReps)) CELLS.push({ assay, nReps });
  const RUNGS = [...new Set(units.map(u => u.ratio))].sort((a, b) => a - b);
  return { recs, draws, units, CELLS, RUNGS };
}

const isFloored = (c) => c.rawP != null && c.rawP < ALPHA.FLAG;
const isModerate = (c) => c.rawP != null && c.rawP >= ALPHA.FLAG && c.rawP < ALPHA.NOTE;

// Blocks: one (assay, replicates, seed, condition) draw read at every rung.
function blocksOf(units, keyName = 'name') {
  const bs = new Map();
  for (const u of units) {
    const k = `${u.assay}|${u.nReps}|${u.seed}|${u[keyName]}`;
    if (!bs.has(k)) bs.set(k, { assay: u.assay, nReps: u.nReps, seed: u.seed, cond: u[keyName], rungs: [] });
    bs.get(k).rungs.push(u);
  }
  for (const b of bs.values()) {
    b.rungs.sort((x, y) => x.ratio - y.ratio);
    b.nRungs = b.rungs.length;
    b.flooredRungs = b.rungs.filter(isFloored);
    b.event = b.flooredRungs.length > 0;
  }
  return [...bs.values()];
}

// Step 0.4's ρ̂: reconstruct each unit's signed statistic from the reported p and
// the sign of κDev, then Spearman over within-block rung pairs.
const zOfUnit = (x) => (parseFloat(x.kurtDeviation) < 0 ? -1 : 1) * PhiInv(1 - x.rawP / 2);
function rhoOverBlocks(blocks, valueOf) {
  const px = [], py = [];
  for (const b of blocks) for (let i = 0; i < b.rungs.length; i++) for (let j = i + 1; j < b.rungs.length; j++) {
    const a = valueOf(b.rungs[i]), c = valueOf(b.rungs[j]);
    if (Number.isFinite(a) && Number.isFinite(c)) { px.push(a); py.push(c); }
  }
  if (px.length < 10) return { rs: NaN, rho: NaN, n: px.length };
  const rs = spearman(px, py);
  return { rs, rho: toRho(rs), n: px.length };
}

// ══════════════════════════════════════════════════════════════════════════
// --step2a
// ══════════════════════════════════════════════════════════════════════════
async function step2a() {
  const { draws, units, CELLS, RUNGS } = loadCensus();
  const out = [];
  out.push('# S364 part B, Step 2a — one read before the measurement');
  out.push('');
  out.push(`Source: \`${UNITS}\` — ${draws.length} draws, ${units.length} condition-units. ` +
    'The source answer below is read at `src/`; the numbers are a fresh generator run plus a read ' +
    'off the census. Nothing in `src/` moves.');
  out.push('');

  // ── 2a.1 source ────────────────────────────────────────────────────────
  out.push('## 2a.1 Is the per-condition κ standardised? — by file and line');
  out.push('');
  out.push('**It is standardised, and by a sigma from `fitPredictedSigma` — not by raw within-condition ' +
    'differences.** The chain, in the order the code applies it:');
  out.push('');
  out.push('| site | what it does |');
  out.push('|---|---|');
  out.push('| `kurtosis.js:99` | `const { sigma: predictedSigma, used: usePredicted } = fitPredictedSigma(matrix)` — one fit over the WHOLE matrix |');
  out.push('| `kurtosis.js:102` | `const sigma = usePredicted ? predictedSigma : localSigma` — the normaliser the rest of the test uses |');
  out.push('| `kurtosis.js:413-414` | `condDiffs.push((matrix[r][c1] − matrix[r][c2]) / sigma[r])` — the per-condition statistic divides by it |');
  out.push('| `primitives.js:71-96` | `fitPredictedSigma` regresses `log(variance)` on `log(row mean)` across rows and returns `σ̂_r = exp((intercept + slope·log m_r)/2)` |');
  out.push('');
  out.push('So the dispatch\'s second branch is the live one: the denominator IS a sigma from ' +
    '`fitPredictedSigma`, which is fitted on POOLED rows, so changing `condNoiseRatio` changes the ' +
    'fit and exact scale invariance is not automatic. **But the fit is condition-BLIND** ' +
    '(`primitives.js:73` builds `rowMeans` from the row alone; nothing in the function sees a ' +
    'condition label — the same fact S363 recorded when it found the pooled dose-response), and the ' +
    'ratio changes each condition\'s replicate noise by a constant multiplier. Two rows of the same ' +
    'condition therefore have their σ̂ moved by the SAME factor, and κ is invariant to a constant ' +
    'multiplier. **The prediction is therefore that invariance is approximate but very tight, and ' +
    'the residue is measurable rather than argued.** That is what 2a.1b measures.');
  out.push('');

  // ── 2a.1b numeric ──────────────────────────────────────────────────────
  out.push('## 2a.1b The same question, arithmetically');
  out.push('');
  out.push('One seed, 6 replicates, both assay labels, at the ladder\'s two ends. For each condition: ' +
    'the per-row σ̂ ratio between the rungs, and the ratio of the FULLY STANDARDISED per-cell value ' +
    '`(d / σ̂)` between the rungs. **A coefficient of variation of zero on the second column means the ' +
    'whole `condDiffs` vector at r = 2.5 is a constant multiple of the one at r = 1, and κ cannot ' +
    'move at all.** `sigmaA = sigma·√(2/(1+r²))`, so the constant is not 1 and its value carries no ' +
    'information — only its constancy does.');
  out.push('');
  out.push('| assay | transform | cond | σ̂ ratio: mean | σ̂ ratio: CV | (d/σ̂) ratio: mean | (d/σ̂) ratio: CV | κ at r=1 | κ at r=2.5 | Δκ |');
  out.push('|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
  const cvOf = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return { mean: m, cv: stddev(a) / Math.abs(m) }; };
  for (const assay of [...new Set(CELLS.map(c => c.assay))]) {
    const lo = gen({ seed: SEED_BASE, nReps: 6, condNoiseRatio: 1 });
    const hi = gen({ seed: SEED_BASE, nReps: 6, condNoiseRatio: 2.5 });
    const iLo = inputsFor(lo.rowGroupedCsv, assay), iHi = inputsFor(hi.rowGroupedCsv, assay);
    const sLo = sigmaFor(iLo.testMatrix), sHi = sigmaFor(iHi.testMatrix);
    const ciLo = condIndexOf(iLo.condCtx, iLo.testMatrix.length);
    const useRobust = iLo.testMatrix.length >= 200;
    for (const cond of Object.keys(ciLo)) {
      const idxs = ciLo[cond];
      const sig = idxs.map(r => sHi.sigma[r] / sLo.sigma[r]);
      const dLo = condDiffsFor(iLo.testMatrix, sLo.sigma, idxs);
      const dHi = condDiffsFor(iHi.testMatrix, sHi.sigma, idxs);
      const rat = dHi.map((v, i) => v / dLo[i]).filter(Number.isFinite);
      const kLo = useRobust ? trimmedKurtosis(dLo) : kurtosis(dLo);
      const kHi = useRobust ? trimmedKurtosis(dHi) : kurtosis(dHi);
      const cs = cvOf(sig), cr = cvOf(rat);
      out.push(`| ${assay} | \`${iLo.vst.transform}\` | ${cond} | ${f(cs.mean, 6)} | ${cs.cv.toExponential(2)} | ` +
        `${f(cr.mean, 6)} | ${cr.cv.toExponential(2)} | ${f(kLo, 6)} | ${f(kHi, 6)} | ${(kHi - kLo).toExponential(2)} |`);
    }
  }
  out.push('');
  out.push('**Read the CV columns, not the means.** A mean far from 1 is the ratio doing its job; a CV ' +
    'at machine level is the statement that the move is a pure rescale, which κ discards.');
  out.push('');

  // ── 2a.2 ρ̂ both arms ───────────────────────────────────────────────────
  out.push('## 2a.2 ρ̂ for the pooled arm, by the estimator Step 0.4 used');
  out.push('');
  out.push('Two estimators are reported for each arm, because they fail in different ways and agreeing ' +
    'is the point. **(i) Step 0.4\'s**: reconstruct each unit\'s signed statistic as ' +
    '`ẑ = sign(κDev)·Φ⁻¹(1 − p/2)`, Spearman over within-block rung pairs, converted by ' +
    '`ρ = 2·sin(π·ρ_s/6)`. It is directly comparable to the 0.92-0.99 Step 0.4 published, and it is ' +
    'censored wherever p sits at the floor. **(ii) On the OBSERVED κ itself** — `parseFloat(c.kurtosis)` ' +
    'per condition, `pooledKurtosis` pooled — which is uncensored and carries no null-side noise at all. ' +
    'For the pooled arm a block is (assay, replicates, seed): there is no condition index.');
  out.push('');
  out.push('| arm | cell | blocks | pairs | ρ̂ from ẑ (Step 0.4 form) | ρ̂ from the observed κ |');
  out.push('|---|---|---:|---:|---:|---:|');
  const rows2a = [];
  for (const c of CELLS) {
    const uc = units.filter(x => x.assay === c.assay && x.nReps === c.nReps);
    const bc = blocksOf(uc, 'name');
    const a1 = rhoOverBlocks(bc, zOfUnit);
    const a2 = rhoOverBlocks(bc, (x) => parseFloat(x.kurtosis));
    const dr = draws.filter(x => x.assay === c.assay && x.nReps === c.nReps).map(x => ({
      assay: x.assay, nReps: x.nReps, seed: x.seed, ratio: x.ratio, name: 'POOLED',
      rawP: x.kurt.pooledP, kurtDeviation: String(x.kurt.kurtDeviation), kurtosis: x.kurt.pooledKurtosis,
    }));
    const bp = blocksOf(dr, 'name');
    const p1 = rhoOverBlocks(bp, zOfUnit);
    const p2 = rhoOverBlocks(bp, (x) => x.kurtosis);
    out.push(`| per-condition | ${c.assay} ${c.nReps}rep | ${bc.length} | ${a1.n} | **${f(a1.rho, 3)}** | **${f(a2.rho, 3)}** |`);
    out.push(`| pooled | ${c.assay} ${c.nReps}rep | ${bp.length} | ${p1.n} | **${f(p1.rho, 3)}** | **${f(p2.rho, 3)}** |`);
    rows2a.push({ ...c, condZ: a1.rho, condK: a2.rho, poolZ: p1.rho, poolK: p2.rho });
  }
  out.push('');
  const anyPooledHigh = rows2a.some(r => r.poolK >= 0.95);
  out.push('**The falsifier, as stated in the dispatch.** If the pooled arm also reads ~0.95, scale ' +
    'invariance is not the mechanism and the seed is simply dominating everything. Measured: the ' +
    `pooled arm reads ${rows2a.map(r => f(r.poolK, 3)).join(' / ')} on the observed κ across the four ` +
    `cells, against ${rows2a.map(r => f(r.condK, 3)).join(' / ')} per-condition. ` +
    (anyPooledHigh
      ? '**At least one pooled cell is at or above 0.95, so the falsifier fires** — read the per-cell rows before concluding anything about the mechanism.'
      : '**No pooled cell reaches 0.95, so the falsifier does not fire**: the two arms separate, and the per-condition arm\'s near-unit ρ̂ is the scale invariance 2a.1b measured rather than seed dominance.'));
  out.push('');
  out.push('For the pooled arm this is the same fact S363 reported from the other side — its median p ' +
    'falls three orders of magnitude across the ladder — seen as a correlation instead of as a trend.');
  out.push('');
  out.push('## 2a.3 What this costs the programme');
  out.push('');
  out.push('**Reported, not scoped.** If the per-condition arm is invariant to the knob the ladder ' +
    'turns, the condition-noise ladder cannot exercise that arm at all: the effective sample behind ' +
    `every per-condition rate in this programme is **${blocksOf(units, 'name').length} blocks**, not ` +
    `**${units.length} units**. That bears on P106's disposition and on how a false-positive run ` +
    'would have to be designed — neither is scoped here.');
  out.push('');
  const md = out.join('\n');
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(`${OUTDIR}/step2a.md`, md);
  console.log(md);
  console.error('\nwrote ' + OUTDIR + '/step2a.md');
}

// ══════════════════════════════════════════════════════════════════════════
// --predict   (writes predictions.json BEFORE --step2b may run)
// ══════════════════════════════════════════════════════════════════════════
async function predictMode() {
  const { units, CELLS } = loadCensus();
  const rows = [];
  for (const c of CELLS) {
    const u = units.filter(x => x.assay === c.assay && x.nReps === c.nReps);
    const bl = blocksOf(u, 'name');
    const B = median(u.map(x => x.B));
    const sNow = fitS(median(u.map(x => x.rawP)));
    // The n-mismatch is exactly 2 (Step 0), so it predicts a √2 inflation. What
    // the scale model says should be LEFT after matching n is s / √2.
    const sResid = sNow / Math.SQRT2;
    const p1 = predict(sResid, B, [0, 1]).atFloor;
    const rhoHat = rhoOverBlocks(bl, zOfUnit).rho;
    const expBlocks = bl.reduce((a, b) => a + blockFloorProb(sResid, B, b.nRungs, rhoHat), 0);
    rows.push({
      assay: c.assay, nReps: c.nReps, nUnits: u.length, nBlocks: bl.length,
      flooredUnitsNow: u.filter(isFloored).length, flooredBlocksNow: bl.filter(b => b.event).length,
      B, sNow, sResid, predUnitRate: p1, rhoHatPre: rhoHat,
      predBlockRate: expBlocks / bl.length, predBlocks: expBlocks,
    });
  }
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(PRED, JSON.stringify({ writtenBefore: 'step2b', units: UNITS, rows }, null, 1));
  const out = [];
  out.push('# S364 part B, Step 2 — predictions, on record before the measurement');
  out.push('');
  out.push('Written to `' + PRED + '` from the PRE-matched census alone. `--step2b` refuses to run ' +
    'without this file, so the ordering is enforced rather than asserted.');
  out.push('');
  out.push('`s` is fitted per cell from the median `rawP` alone (Step 0\'s estimator). The n-mismatch ' +
    'is exactly 2 (Step 0, verified on all 478 units), so the scale model predicts a √2 inflation and ' +
    '`s_resid = s/√2` is what it says should be LEFT once the null is rebuilt at the observed n. ' +
    '`ρ̂` here is the PRE-matched value — it is all that exists before the run; the test in Step 2b ' +
    're-estimates it on the matched output.');
  out.push('');
  out.push('| cell | units | blocks | floored units now | floored blocks now | `s` now | `s`/√2 | predicted UNIT rate | pre-matched ρ̂ | **predicted BLOCK rate** | predicted blocks of 40 |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of rows) {
    out.push(`| ${r.assay} ${r.nReps}rep | ${r.nUnits} | ${r.nBlocks} | ${r.flooredUnitsNow} ` +
      `(${pct(r.flooredUnitsNow, r.nUnits)}) | ${r.flooredBlocksNow} (${pct(r.flooredBlocksNow, r.nBlocks)}) | ` +
      `${f(r.sNow, 4)} | ${f(r.sResid, 4)} | **${(100 * r.predUnitRate).toFixed(2)}%** | ${f(r.rhoHatPre, 3)} | ` +
      `**${(100 * r.predBlockRate).toFixed(2)}%** | **${f(r.predBlocks, 2)}** |`);
  }
  out.push('');
  out.push('The `predicted UNIT rate` column is the check against the dispatch\'s own table ' +
    '(general 4rep 0.09%, general 6rep 0.02%, plate 4rep 1.05%, plate 6rep 3.80%). If it does not ' +
    'reproduce those, the reading of that table is wrong and the discrepancy is the first thing to ' +
    'report.');
  out.push('');
  out.push('**The decisive cell is `general` 6rep**, predicted at essentially no floored units at all ' +
    'and currently holding ' + rows.find(r => r.assay === 'general' && r.nReps === 6)?.flooredBlocksNow +
    ' blocks while rejecting the scale model. If those blocks survive matched-n, the scale model is ' +
    'comprehensively wrong for that cell and the mechanism is something not yet named.');
  out.push('');
  const md = out.join('\n');
  writeFileSync(`${OUTDIR}/step2-predictions.md`, md);
  console.log(md);
  console.error('\nwrote ' + PRED + ' and ' + OUTDIR + '/step2-predictions.md');
}

// ══════════════════════════════════════════════════════════════════════════
// --step2b
// ══════════════════════════════════════════════════════════════════════════
//
// ANCHOR-FIRST. Before any matched-n number is produced, the same machinery is
// pointed at the SHIPPED row set (all valid rows) on a subset of records and
// must reproduce the census's `rawP` exactly. A re-implementation that cannot
// reproduce the thing it is modifying is not measuring the modification.
async function step2b() {
  if (!existsSync(PRED)) {
    console.error(`refusing to run: ${PRED} is absent. Run --predict first so the predictions are on record.`);
    process.exit(2);
  }
  const predictions = JSON.parse(readFileSync(PRED, 'utf8'));
  const { recs, draws, units, CELLS, RUNGS } = loadCensus();
  const ANCHORS = Number(process.env.ANCHORS ?? 16);

  const out = [];
  out.push('# S364 part B, Step 2b — the matched-n measurement');
  out.push('');
  out.push(`Source: \`${UNITS}\` — ${draws.length} draws, ${units.length} condition-units, ` +
    `${blocksOf(units, 'name').length} blocks. The per-condition null is rebuilt at the OBSERVED n ` +
    'inside this probe, same seeds and same parameters. Nothing in `src/` moves.');
  out.push('');
  out.push('**What changes and what does not.** The shipped null batch walks ALL valid rows ' +
    '(`kurtosis.js:176-179`, consumed at `:265`) — 240 of them — while the observed per-condition κ ' +
    'walks ONE condition\'s rows (`:411-418`) — 120. The matched arm passes the condition\'s own row ' +
    'set to the same loop. B = 1999, the pair set, the 2% trim, the sort, and the two-sided count ' +
    'about the null median (`:422-425`) are untouched. **One matched null per record, shared by both ' +
    'of its conditions**, because that is how `simKurts` is shared in the shipped code — changing the ' +
    'sharing as well as the n would confound the two.');
  out.push('');
  out.push('**The pilot gate is NOT applied on the matched arm, and that is a choice.** ' +
    '`kurtosis.js:314-325` truncates the null to 50 batches when the POOLED observed κ sits inside ' +
    'the pilot body. A wider matched null makes that gate fire more often, which would mechanically ' +
    'suppress floored units and confound "matched-n calibrates the arm" with "matched-n triggers a ' +
    'compute optimisation". Its incidence on the shipped side is reported below so the cost of the ' +
    'choice is visible rather than assumed.');
  out.push('');

  // ── the pilot-gate incidence, so the choice above is auditable ──────────
  const gated = draws.filter(x => x.kurt.nSimulations < 1999);
  const gatedUnits = units.filter(u => u.B < 1999);
  out.push(`Shipped pilot gate: **${gated.length} of ${draws.length} draws** ran a truncated null ` +
    `(\`nSimulations\` < 1999), carrying ${gatedUnits.length} condition-units. Floored units among ` +
    `them: **${gatedUnits.filter(isFloored).length}** — a truncated null has floor 1/51 = 0.0196 and ` +
    'cannot produce a floored unit at all, which is why the floored-count comparison is unaffected by ' +
    'the choice. Median-`rawP` and band comparisons are reported both over the full set and over the ' +
    'untruncated subset.');
  out.push('');

  // ── run ────────────────────────────────────────────────────────────────
  const t0 = Date.now();
  const matched = [];
  const anchorRows = [];
  let done = 0;
  const bySeedAssay = new Map();
  for (const rec of recs) bySeedAssay.set(`${rec.assay}|${rec.nReps}|${rec.ratio}|${rec.seed}`, rec);

  // One anchor record per cell at each of the first two seeds, so both assay
  // labels and both replicate counts are covered rather than whichever cells the
  // record order happens to reach first.
  const anchorPick = new Set();
  for (const c of CELLS) for (const sd of [SEED_BASE, SEED_BASE + 1]) {
    anchorPick.add(`${c.assay}|${c.nReps}|${RUNGS[0]}|${sd}`);
  }
  const LIMIT = Number(process.env.LIMIT) || recs.length;
  let nullRowMismatch = 0;

  for (const rec of recs.slice(0, LIMIT)) {
    const d = gen({ seed: rec.seed, nReps: rec.nReps, condNoiseRatio: rec.ratio });
    const { matrix, testMatrix, condCtx, vst } = inputsFor(d.rowGroupedCsv, rec.assay);
    const nR = testMatrix.length, nC = testMatrix[0].length;
    const { sigma } = sigmaFor(testMatrix);
    const useRobust = nR >= 200;                                        // :139
    const validRowIdxs = [];
    for (let r = 0; r < nR; r++) if (sigma[r] && sigma[r] > 0 && testMatrix[r].some(v => v != null)) validRowIdxs.push(r);
    const simPairs = [];
    for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) simPairs.push([c1, c2]);
    // MAX_SIM_PAIRS = 30 (:169); 6 reps gives 15 pairs, 4 gives 6 — never binds here.
    const ci = condIndexOf(condCtx, nR);
    const condNames = Object.keys(ci).filter(k => ci[k].length >= 20);

    // pooled κ, for the pilot gate on the anchor arm (:140).
    const histDiffs = [];
    for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) for (let r = 0; r < nR; r++) {
      if (testMatrix[r][c1] != null && testMatrix[r][c2] != null && sigma[r] && sigma[r] > 0) {
        histDiffs.push((testMatrix[r][c1] - testMatrix[r][c2]) / sigma[r]);
      }
    }
    const pooledKurtosis = histDiffs.length >= 20 ? (useRobust ? trimmedKurtosis(histDiffs) : kurtosis(histDiffs)) : NaN;

    const key = `${rec.assay}|${rec.nReps}|${rec.ratio}|${rec.seed}`;

    // ── anchor arm: the SHIPPED row set on the SHIPPED stream ────────────
    if (anchorPick.has(key) && anchorRows.length < ANCHORS) {
      const rngA = createPRNGFactory(matrix)('Kurtosis');   // engine.js:214, :581 — dispatch key 'Kurtosis'
      const { simKurts, earlyExit } = simulateNulls({
        rng: rngA, rowIdxs: validRowIdxs, nC, simPairs, sigma, useRobust, B: 1999,
        pilot: { pooledKurtosis },
      });
      for (const cond of condNames) {
        const dd = condDiffsFor(testMatrix, sigma, ci[cond]);
        const cK = useRobust ? trimmedKurtosis(dd) : kurtosis(dd);
        const shipped = rec.kurt.conds.find(x => x.name === cond);
        anchorRows.push({
          key, cond, earlyExit, B: simKurts.length,
          shippedK: shipped?.kurtosis, mineK: cK.toFixed(4),
          shippedP: shipped?.rawP, mineP: simKurts.length >= 20 ? condPFrom(simKurts, cK) : null,
        });
      }
    }

    // ── matched arm: one null at the per-condition row count ─────────────
    const rngM = createPRNGFactory(matrix)('Kurtosis');
    const nCondRows = median(condNames.map(c => ci[c].length));
    const matchedRowIdxs = condNames.length ? ci[condNames[0]] : validRowIdxs;
    const { simKurts: simM } = simulateNulls({
      rng: rngM, rowIdxs: matchedRowIdxs, nC, simPairs, sigma, useRobust, B: 1999, pilot: null,
    });
    const simMeanM = simM.length ? simM.reduce((a, b) => a + b, 0) / simM.length : NaN;
    // The matched null's own centre and spread, kept so the observed statistic can
    // be standardised against it directly. A z built this way is model-free: it
    // does not pass through the median fit, so it separates a wrong CENTRE from a
    // wrong SPREAD, which a single `s` cannot.
    const simSortedM = simM.slice().sort((a, b) => a - b);
    const simMedM = simSortedM[Math.floor(simSortedM.length / 2)];
    const simSdM = stddev(simM);
    for (const cond of condNames) {
      if (ci[cond].length !== matchedRowIdxs.length) nullRowMismatch++;
      const dd = condDiffsFor(testMatrix, sigma, ci[cond]);
      const cK = useRobust ? trimmedKurtosis(dd) : kurtosis(dd);
      const shipped = rec.kurt.conds.find(x => x.name === cond);
      matched.push({
        assay: rec.assay, nReps: rec.nReps, ratio: rec.ratio, seed: rec.seed,
        transform: vst.transform, name: cond, n: ci[cond].length, nDiffs: dd.length,
        nNullRows: matchedRowIdxs.length, nNull: matchedRowIdxs.length * simPairs.length,
        kurtosis: cK.toFixed(4), kurtDeviation: (cK - simMeanM).toFixed(4),
        rawP: condPFrom(simM, cK), B: simM.length,
        simMedian: simMedM, simSD: simSdM, zVsNull: (cK - simMedM) / simSdM,
        shippedRawP: shipped?.rawP ?? null, shippedB: shipped ? rec.kurt.nSimulations : null,
        shippedKurtDeviation: shipped?.kurtDeviation ?? null,
      });
    }
    done++;
    if (done % 10 === 0) {
      const rate = (Date.now() - t0) / done;
      process.stderr.write(`  ${done}/${recs.length}  eta ${((recs.length - done) * rate / 60000).toFixed(1)} min\n`);
    }
  }
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(`${OUTDIR}/matched-units.json`, JSON.stringify(matched, null, 1));

  // ── the anchor, reported first ─────────────────────────────────────────
  out.push('## 2b.0 The anchor — does the re-implementation reproduce the shipped null?');
  out.push('');
  out.push('The same loop pointed at the SHIPPED row set, driven by the SHIPPED stream ' +
    '(`createPRNGFactory(matrix)(\'Kurtosis\')` — the dispatch key at `engine.js:581`, not the ' +
    'result name). If these do not match the census exactly, nothing below means anything.');
  out.push('');
  out.push('| record | cond | shipped κ | re-derived κ | shipped rawP | re-derived rawP | B | pilot gate | verdict |');
  out.push('|---|---|---|---|---:|---:|---:|:--|:--|');
  let anchorOk = 0;
  for (const a of anchorRows) {
    const ok = a.shippedK === a.mineK && a.shippedP != null && a.mineP != null &&
      Math.abs(a.shippedP - a.mineP) < 1e-12;
    if (ok) anchorOk++;
    out.push(`| \`${a.key}\` | ${a.cond} | ${a.shippedK} | ${a.mineK} | ${f(a.shippedP, 6)} | ` +
      `${f(a.mineP, 6)} | ${a.B} | ${a.earlyExit ? 'fired' : '—'} | ${ok ? '**exact**' : '**MISMATCH**'} |`);
  }
  out.push('');
  out.push(`**${anchorOk} of ${anchorRows.length} anchor units reproduce byte for byte.**` +
    (anchorOk === anchorRows.length
      ? ' The re-implementation is the shipped null; the only thing the matched arm changes is the row set.'
      : ' **Stop here** — a mismatch means the matched-n figures below are measuring the re-implementation, not the change.'));
  out.push('');
  out.push(`Condition-units whose own row count differs from the shared matched null\'s row count: ` +
    `**${nullRowMismatch}** of ${matched.length}. The generator interleaves the two conditions row for ` +
    'row, so both hold 120; a non-zero count here would mean one matched null is serving two ' +
    'different observed n and the arm is not matched after all.');
  out.push('');

  // ── the measurement ────────────────────────────────────────────────────
  const blNow = blocksOf(units, 'name');
  const blM = blocksOf(matched, 'name');

  out.push('## 2b.1 Per cell — blocks first, units beside them');
  out.push('');
  out.push('`n_null` is the value count entering one simulated κ. It was `240 × pairs`; it is now ' +
    '`120 × pairs`, which is `n_obs` exactly.');
  out.push('');
  out.push('| cell | n_obs | n_null now | n_null matched | blocks | floored blocks NOW | matched | block rate NOW | **matched** | floored units NOW | matched | unit rate NOW | **matched** |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  const cellRows = [];
  for (const c of CELLS) {
    const uN = units.filter(x => x.assay === c.assay && x.nReps === c.nReps);
    const uM = matched.filter(x => x.assay === c.assay && x.nReps === c.nReps);
    const bN = blNow.filter(x => x.assay === c.assay && x.nReps === c.nReps);
    const bM = blM.filter(x => x.assay === c.assay && x.nReps === c.nReps);
    const r = {
      ...c, uN, uM, bN, bM,
      nObs: median(uM.map(x => x.nDiffs)), nNullNow: median(uN.map(x => x.nRows * (x.nCols * (x.nCols - 1) / 2))),
      nNullM: median(uM.map(x => x.nNull)),
      flUN: uN.filter(isFloored).length, flUM: uM.filter(isFloored).length,
      flBN: bN.filter(x => x.event).length, flBM: bM.filter(x => x.event).length,
    };
    cellRows.push(r);
    out.push(`| ${c.assay} ${c.nReps}rep | ${r.nObs} | ${r.nNullNow} | ${r.nNullM} | ${bM.length} | ` +
      `${r.flBN} | **${r.flBM}** | ${pct(r.flBN, bN.length)} | **${pct(r.flBM, bM.length)}** | ` +
      `${r.flUN} | **${r.flUM}** | ${pct(r.flUN, uN.length)} | **${pct(r.flUM, uM.length)}** |`);
  }
  out.push('');

  // ── 2b.2 the test at the re-estimated ρ̂ ────────────────────────────────
  out.push('## 2b.2 The exact tail, at ρ̂ re-estimated on the matched-n output');
  out.push('');
  out.push('`s` is re-fitted per cell on the MATCHED median `rawP` — the same estimator, on the new ' +
    'output. `ρ̂` is re-estimated on the matched output by Step 0.4\'s form. The block probability is ' +
    'the same deterministic quadrature Step 0.4 used; a Monte-Carlo estimate cannot decide a value ' +
    'this close to the line.');
  out.push('');
  out.push('| cell | matched median rawP | matched `s` | predicted `s`/√2 | ρ̂ pre | **ρ̂ matched** | obs blocks | exp blocks | direction | tail | ×4 |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|:--|---:|---:|');
  const testRows = [];
  for (const r of cellRows) {
    const B = median(r.uM.map(x => x.B));
    const medM = median(r.uM.map(x => x.rawP));
    const sM = fitS(medM);
    const pre = predictions.rows.find(x => x.assay === r.assay && x.nReps === r.nReps);
    const rhoPre = pre?.rhoHatPre;
    const rhoM = rhoOverBlocks(r.bM, zOfUnit).rho;
    const exp = r.bM.reduce((a, b) => a + blockFloorProb(sM, B, b.nRungs, rhoM), 0);
    const pm = exp / r.bM.length;
    const tail = binomTail(r.flBM, r.bM.length, pm);
    const dir = r.flBM > exp ? 'above' : r.flBM < exp ? 'below' : 'equal';
    const adj = Math.min(1, tail * CELLS.length);
    testRows.push({ ...r, B, medM, sM, sPredResid: pre?.sResid, rhoPre, rhoM, exp, pm, tail, dir, adj });
    out.push(`| ${r.assay} ${r.nReps}rep | ${f(medM)} | **${f(sM, 4)}** | ${f(pre?.sResid, 4)} | ` +
      `${f(rhoPre, 3)} | **${f(rhoM, 3)}** | **${r.flBM}** | ${f(exp, 2)} | ${dir} | ${tf(tail)} | ${tf(adj)} |`);
  }
  out.push('');
  out.push('**Multiplicity was fixed before the numbers arrived and is not revisited**: four cells, ' +
    'Bonferroni ×4, the same correction Step 0.4 used. A cell counts as rejecting at a corrected tail ' +
    'below 0.05 and nowhere else. **Only high-side tails are eligible** — a cell below expectation is ' +
    'evidence against the ρ that produced the expectation, not against the scale model.');
  out.push('');
  const rejecting = testRows.filter(r => r.dir === 'above' && r.adj < 0.05);
  out.push(`Cells rejecting after correction: **${rejecting.length}** — ` +
    (rejecting.length ? rejecting.map(r => `${r.assay} ${r.nReps}rep (×4 = ${tf(r.adj)})`).join('; ') : 'none') + '.');
  out.push('');

  // ── 2b.3 prediction against outcome ────────────────────────────────────
  out.push('## 2b.3 Each prediction beside its outcome');
  out.push('');
  out.push('The predictions were written to `' + PRED + '` before this run; they are read back here, ' +
    'not recomputed.');
  out.push('');
  out.push('| cell | predicted UNIT rate | measured | predicted BLOCK rate | predicted blocks | **measured blocks** | held? |');
  out.push('|---|---:|---:|---:|---:|---:|:--|');
  for (const r of testRows) {
    const pre = predictions.rows.find(x => x.assay === r.assay && x.nReps === r.nReps);
    // "Held" = the measured block count is inside a two-sided 95% interval of the
    // PREDICTED block rate. Stated as an interval, not as a point match.
    const tailPre = binomTail(r.flBM, r.bM.length, pre.predBlockRate);
    const held = tailPre >= 0.025;
    out.push(`| ${r.assay} ${r.nReps}rep | ${(100 * pre.predUnitRate).toFixed(2)}% | ` +
      `**${pct(r.flUM, r.uM.length)}** | ${(100 * pre.predBlockRate).toFixed(2)}% | ${f(pre.predBlocks, 2)} | ` +
      `**${r.flBM}** | ${held ? 'yes' : '**NO**'} (tail vs prediction ${tf(tailPre)}) |`);
  }
  out.push('');

  // ── 2b.4 the distribution ──────────────────────────────────────────────
  out.push('## 2b.4 The `rawP` distribution — median, mass below 0.5, band table');
  out.push('');
  out.push('The whole point of Step 0 was that the distribution is a floor spike ON TOP OF a ' +
    'left-shifted body. A fix that removes the spike and leaves the body has not found the cause.');
  out.push('');
  out.push('| cell | median NOW | **median matched** | mass < 0.5 NOW | **matched** | untruncated subset: median | mass < 0.5 |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const r of cellRows) {
    const uNfull = r.uN, uMfull = r.uM;
    const uNsub = r.uN.filter(x => x.B >= 1999);
    const keySub = new Set(uNsub.map(x => `${x.seed}|${x.ratio}|${x.name}`));
    const uMsub = r.uM.filter(x => keySub.has(`${x.seed}|${x.ratio}|${x.name}`));
    out.push(`| ${r.assay} ${r.nReps}rep | ${f(median(uNfull.map(x => x.rawP)))} | ` +
      `**${f(median(uMfull.map(x => x.rawP)))}** | ${pct(uNfull.filter(x => x.rawP < 0.5).length, uNfull.length)} | ` +
      `**${pct(uMfull.filter(x => x.rawP < 0.5).length, uMfull.length)}** | ` +
      `${f(median(uMsub.map(x => x.rawP)))} | ${pct(uMsub.filter(x => x.rawP < 0.5).length, uMsub.length)} |`);
  }
  out.push('');
  const EDGES = [0, 0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  out.push('Band table, matched arm, against uniform. A calibrated arm puts each band\'s share on its ' +
    'width.');
  out.push('');
  out.push('| band | width | ' + CELLS.map(c => `${c.assay} ${c.nReps}rep`).join(' | ') + ' |');
  out.push('|---|---:|' + CELLS.map(() => '---:').join('|') + '|');
  for (let i = 0; i < EDGES.length - 1; i++) {
    const w = EDGES[i + 1] - EDGES[i];
    const cells = cellRows.map(r => {
      const n = r.uM.filter(x => x.rawP > EDGES[i] && x.rawP <= EDGES[i + 1]).length;
      return `${n} (${pct(n, r.uM.length)})`;
    });
    out.push(`| (${EDGES[i]}, ${EDGES[i + 1]}] | ${(100 * w).toFixed(1)}% | ${cells.join(' | ')} |`);
  }
  out.push('');

  // ── 2b.5 sign split, since site A is a directional gate ────────────────
  out.push('## 2b.4b The same question without the median fit — the observed κ standardised against its own null');
  out.push('');
  out.push('`s` is fitted on the median and so answers "how wide", assuming the centre is right. This ' +
    'read makes no such assumption: each unit\'s observed κ is standardised against the median and sd ' +
    'of the very null it was ranked against, `z = (κ_obs − median(simKurts)) / sd(simKurts)`. **Under a ' +
    'correct null this has mean 0 and sd 1.** A mean away from zero is a mis-CENTRED statistic; an sd ' +
    'above 1 is a null that is too narrow. The two are different faults and `s` cannot tell them apart.');
  out.push('');
  out.push('| cell | units | mean z (0 expected) | **sd z (1 expected)** | matched `s` from the median | agree? |');
  out.push('|---|---:|---:|---:|---:|:--|');
  for (const r of testRows) {
    const zs = r.uM.map(x => x.zVsNull).filter(Number.isFinite);
    const mz = zs.reduce((a, b) => a + b, 0) / zs.length;
    const sz = stddev(zs);
    out.push(`| ${r.assay} ${r.nReps}rep | ${zs.length} | ${f(mz, 3)} | **${f(sz, 3)}** | ${f(r.sM, 3)} | ` +
      `${Math.abs(sz - r.sM) < 0.15 ? 'yes' : '**no**'} |`);
  }
  out.push('');
  out.push('## 2b.4c Small-p mass against the matched fitted `s` — descriptive, NOT the pre-registered test');
  out.push('');
  out.push('The pre-registered test is the block-level floor test in 2b.2 and multiplicity was fixed ' +
    'for it alone. These tails are uncorrected and are reported because "a fix that removes the spike ' +
    'and leaves the body has not found the cause" needs the body measured, not assumed.');
  out.push('');
  out.push('| cell | p < 0.05 obs / exp | tail | p < 0.01 obs / exp | tail | p < 0.005 obs / exp | tail |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const r of testRows) {
    const cells = [0.05, 0.01, 0.005].map(thr => {
      const obs = r.uM.filter(x => x.rawP < thr).length;
      // Under the fitted scale model the chance a unit's continuous tail falls
      // below thr is P(2(1 − Φ(s|Z|)) < thr) = 2(1 − Φ(Φ⁻¹(1 − thr/2)/s)).
      const q = 2 * (1 - Phi(PhiInv(1 - thr / 2) / r.sM));
      return { obs, exp: q * r.uM.length, tail: binomTail(obs, r.uM.length, q) };
    });
    out.push(`| ${r.assay} ${r.nReps}rep | ${cells.map(c => `${c.obs} / ${f(c.exp, 1)}`)[0]} | ${tf(cells[0].tail)} | ` +
      `${cells.map(c => `${c.obs} / ${f(c.exp, 1)}`)[1]} | ${tf(cells[1].tail)} | ` +
      `${cells.map(c => `${c.obs} / ${f(c.exp, 1)}`)[2]} | ${tf(cells[2].tail)} |`);
  }
  out.push('');

  out.push('## 2b.5 The floored units\' sign, since P120\'s site A is a directional gate');
  out.push('');
  out.push('`kurtosis.js:476-477` admits only `parseFloat(c.kurtDeviation) < 0`. Part A measured all ' +
    '28 site-A stops as strictly POSITIVE κDev. The matched arm recomputes κDev against the matched ' +
    'null mean, so the split can move.');
  out.push('');
  out.push('| cell | floored matched | κDev < 0 | κDev ≥ 0 |');
  out.push('|---|---:|---:|---:|');
  for (const r of cellRows) {
    const fl = r.uM.filter(isFloored);
    out.push(`| ${r.assay} ${r.nReps}rep | ${fl.length} | ${fl.filter(x => parseFloat(x.kurtDeviation) < 0).length} | ` +
      `${fl.filter(x => parseFloat(x.kurtDeviation) >= 0).length} |`);
  }
  out.push('');
  out.push('## 2b.6 Where the residual sits — mean z by condition and rung');
  out.push('');
  out.push('Step 3\'s two candidates make different predictions about WHERE on the grid a residual ' +
    'concentrates, so the mean z of 2b.4b is broken out. `sigmaA = sigma·√(2/(1+r²))` and ' +
    '`sigmaB = r·sigmaA`, so as the rung rises CondA gets QUIETER and CondB gets NOISIER while the ' +
    'total is held fixed. A residual that tracks a condition\'s own noise scale is a property of the ' +
    'value scale; one that is flat in both is not.');
  out.push('');
  out.push('| cell | rung | σ of CondA | σ of CondB | mean z CondA | mean z CondB | split (B − A) |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  const SIGMA0 = 0.25;   // gen-copy-fidelity.mjs DEFAULTS.sigma
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  for (const c of CELLS) for (const rung of RUNGS) {
    const sA = SIGMA0 * Math.sqrt(2 / (1 + rung * rung)), sB = rung * sA;
    const pick = (cd) => matched.filter(x => x.assay === c.assay && x.nReps === c.nReps && x.ratio === rung && x.name === cd);
    const zA = pick('CondA').map(x => x.zVsNull), zB = pick('CondB').map(x => x.zVsNull);
    if (!zA.length || !zB.length) continue;
    out.push(`| ${c.assay} ${c.nReps}rep | ${rung} | ${f(sA, 3)} | ${f(sB, 3)} | ${f(mean(zA), 3)} | ` +
      `${f(mean(zB), 3)} | **${f(mean(zB) - mean(zA), 3)}** |`);
  }
  out.push('');
  out.push(`Wrote per-unit matched output to \`${OUTDIR}/matched-units.json\` — ${matched.length} units. ` +
    `The matched arm computes the per-condition statistic directly and so bypasses the family ` +
    `selector at \`kurtosis.js:441-449\`; the two units the four-decimal tie deleted from the census ` +
    `(part A's \`general\` 6rep seed 6105 r = 2.5) are therefore present here, which is why this is ` +
    `${matched.length} against the census's ${units.length}. Both read rawP ≈ 0.49 and neither floors.`);
  out.push('');
  const md = out.join('\n');
  writeFileSync(`${OUTDIR}/step2b.md`, md);
  console.log(md);
  console.error('\nwrote ' + OUTDIR + '/step2b.md and matched-units.json');
}

// ── entry ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--step2a')) await step2a();
if (args.includes('--predict')) await predictMode();
if (args.includes('--step2b')) await step2b();
if (!args.length) console.log('pass --step2a, --predict and/or --step2b');

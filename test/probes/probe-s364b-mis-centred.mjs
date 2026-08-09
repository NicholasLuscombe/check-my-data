// S364 part B, Step 0 — three reads off the census JSON. Read-only over `src/`.
//
// S364 part A left P120's cause open: the per-condition `rawP` distribution is a
// floor spike on top of a left-shifted body (median 0.256 against 0.5, 67.8%
// below 0.5, 30 units at the 1/2000 floor). One candidate is on the board — the
// null batch is built over ALL valid rows (`kurtosis.js:176-179`, consumed at
// `:265`/`:276`) while the observed per-condition κ uses ONE condition's rows
// (`:411-418`).
//
// Step 0 asks, before anything is spent on that candidate, whether it can be the
// main term. Three reads, no engine runs:
//
//   0.1  Split the floored rate by replicate count. A pure standard-deviation
//        mismatch is scale-free — if the null's sd is too small by a constant
//        factor, the tail rate does not depend on n, because both sides scale
//        together. A BIAS in κ is not scale-free: a fixed offset over a shrinking
//        sd gives a growing z, so its tail rate rises with n.
//
//   0.2  Fit ONE inflation factor `s` from the median alone, then use it to
//        predict the floor rate and the MODERATE-band rate — neither of which it
//        was fitted on — and the whole band table.
//
//   0.3  The same three readings per assay label.
//
// Reads test/probes/out-s364/units.json, written by probe-s364-promotion-gap.mjs
// --census. Regenerate that first if it is absent (the out-* directories are
// gitignored, so they do not survive a worktree teardown).
//
//   node test/probes/probe-s364b-mis-centred.mjs --step0

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const { ALPHA } = await import('../../src/constants/thresholds.js');

const UNITS = process.env.UNITS || 'test/probes/out-s364/units.json';

// ── Gaussian helpers ────────────────────────────────────────────────────
// Abramowitz-Stegun 7.1.26-class erf; adequate at the four significant figures
// anything below is quoted to. normalCDF is not imported from primitives.js on
// purpose — this is a diagnostic model of the test, not a re-use of it.
// A&S 7.1.26 — max absolute error 1.5e-7 in erf, so ~1e-7 in Φ. Against tail
// probabilities of order 5e-4 that is a relative error of ~1e-4, well inside the
// band the dispatch asks these predictions to be read at.
function erf(x) {
  const sgn = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sgn * (1 - poly * Math.exp(-x * x));
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const phi = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
// Inverse by bisection — no approximation formula to get subtly wrong.
function PhiInv(p) {
  let lo = -12, hi = 12;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (Phi(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

const median = (xs) => {
  const s = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const pct = (a, b) => (b ? (100 * a / b).toFixed(2) + '%' : '—');
const f = (x, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : '—');

// ── The one-parameter model ─────────────────────────────────────────────
//
// Null: κ_null ~ N(0, σ). Observed: κ_obs ~ N(0, s·σ), s ≥ 1 the inflation.
// The shipped p counts |κ_null − median| ≥ |κ_obs − median| with median ≈ 0, so
// the CONTINUOUS tail probability for a draw at z standard units of the OBSERVED
// law is  q(z) = 2(1 − Φ(s·|z|)).  The REPORTED p is then (1 + K)/(B + 1) with
// K ~ Binomial(B, q). Both layers are kept: the floor is K = 0, which a
// continuous reading cannot express.
//
// `s` is fitted from the median of the reported p and from nothing else.
//   median p = 2(1 − Φ(s · median|Z|)),  median|Z| = Φ⁻¹(0.75) = 0.674490
// so   s = Φ⁻¹(1 − medianP/2) / 0.674490.
const MED_ABS_Z = PhiInv(0.75);
const fitS = (medP) => PhiInv(1 - medP / 2) / MED_ABS_Z;

// Quadrature over the observed law's z, exploiting symmetry.
function* zNodes(step = 0.0005, zMax = 9) {
  for (let z = step / 2; z < zMax; z += step) yield [z, 2 * phi(z) * step];
}

// P(K = 0) and P(1 ≤ K ≤ 18) under Binomial(B, q), by pmf recursion.
function binomBands(q, B) {
  if (q <= 0) return { atFloor: 1, moderate: 0 };
  if (q >= 1) return { atFloor: 0, moderate: 0 };
  const p0 = Math.exp(B * Math.log1p(-q));
  let pmf = p0, mod = 0;
  for (let k = 0; k < 18; k++) {
    pmf = pmf * ((B - k) / (k + 1)) * (q / (1 - q));
    mod += pmf;
  }
  return { atFloor: p0, moderate: mod };
}

// Predicted rates under the fitted s. `atFloor` and `moderate` use the exact
// binomial layer; the wider bands use q directly, where the binomial smearing is
// negligible against the band width.
function predict(s, B, bandEdges) {
  let atFloor = 0, moderate = 0, below05 = 0;
  const bands = new Array(bandEdges.length - 1).fill(0);
  for (const [z, w] of zNodes()) {
    const q = 2 * (1 - Phi(s * z));
    const bb = binomBands(q, B);
    atFloor += w * bb.atFloor;
    moderate += w * bb.moderate;
    if (q < 0.5) below05 += w;
    for (let i = 0; i < bands.length; i++) {
      if (q > bandEdges[i] && q <= bandEdges[i + 1]) { bands[i] += w; break; }
    }
  }
  return { atFloor, moderate, below05, bands };
}

// ── Load ────────────────────────────────────────────────────────────────
const recs = JSON.parse(readFileSync(UNITS, 'utf8'));
const draws = recs.filter(x => x.kurt);
const units = draws.flatMap(x => x.kurt.conds.map(c => ({
  ...c, assay: x.assay, nReps: x.nReps, ratio: x.ratio, seed: x.seed,
  nRows: x.nRows, nCols: x.nCols, transform: x.transform, B: x.kurt.nSimulations,
})));
const isFloored = (c) => c.rawP != null && c.rawP < ALPHA.FLAG;
const isModerate = (c) => c.rawP >= ALPHA.FLAG && c.rawP < ALPHA.NOTE;

const out = [];
out.push('# S364 part B, Step 0 — can the n-mismatch be the main term?');
out.push('');
out.push(`Source: \`${UNITS}\` — ${draws.length} draws, ${units.length} condition-units. ` +
  'No engine run; every number below is a read off the census part A wrote.');
out.push('');

// ── 0.1 ─────────────────────────────────────────────────────────────────
out.push('## 0.1 The discriminator — floored rate by replicate count');
out.push('');
out.push('`n_obs` is the observed per-condition difference count (`c.nDiffs`, built at ' +
  '`kurtosis.js:411-418` over ONE condition\'s rows). `n_null` is the count entering one simulated κ ' +
  '(`validRowIdxs` × `simPairs`, `:176-179` / `:265-292`), computed here as rows × pairs. ' +
  '**Rows per condition and pairs per row are reported separately, because they do not move together.**');
out.push('');
out.push('| reps | cols | pairs/row | rows/condition | n_obs | n_null (rows × pairs) | units | floored | rate | MODERATE | rate |');
out.push('|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
const repSet = [...new Set(units.map(u => u.nReps))].sort();
for (const nReps of repSet) {
  const u = units.filter(x => x.nReps === nReps);
  const nCols = u[0].nCols;
  const pairs = nCols * (nCols - 1) / 2;
  const rowsPerCond = median(u.map(x => x.n));
  const nObs = median(u.map(x => x.nDiffs));
  const fl = u.filter(isFloored).length, md = u.filter(isModerate).length;
  out.push(`| ${nReps} | ${nCols} | ${pairs} | ${rowsPerCond} | ${nObs} | ${u[0].nRows * pairs} | ` +
    `${u.length} | ${fl} | **${pct(fl, u.length)}** | ${md} | ${pct(md, u.length)} |`);
}
out.push('');
out.push('| assay | reps | units | floored | rate | median rawP | mass < 0.5 |');
out.push('|---|---:|---:|---:|---:|---:|---:|');
for (const assay of [...new Set(units.map(u => u.assay))]) for (const nReps of repSet) {
  const u = units.filter(x => x.assay === assay && x.nReps === nReps);
  if (!u.length) continue;
  const fl = u.filter(isFloored).length;
  out.push(`| ${assay} | ${nReps} | ${u.length} | ${fl} | **${pct(fl, u.length)}** | ` +
    `${f(median(u.map(x => x.rawP)))} | ${pct(u.filter(x => x.rawP < 0.5).length, u.length)} |`);
}
out.push('');
out.push('Floored rate by ratio rung, as a control — the per-condition κ does not move along the ' +
  'S361 axis (S363: "neither condition moves"), so this column should be flat and a trend here ' +
  'would mean the floored units are tracking `condNoiseRatio` rather than a calibration fault:');
out.push('');
out.push('| rung | units | floored | rate | median rawP |');
out.push('|---:|---:|---:|---:|---:|');
for (const r of [...new Set(units.map(u => u.ratio))].sort((a, b) => a - b)) {
  const u = units.filter(x => x.ratio === r);
  out.push(`| ${r} | ${u.length} | ${u.filter(isFloored).length} | ${pct(u.filter(isFloored).length, u.length)} | ${f(median(u.map(x => x.rawP)))} |`);
}
out.push('');

// ── 0.2 ─────────────────────────────────────────────────────────────────
const EDGES = [0, 0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
function block(label, u) {
  const B = median(u.map(x => x.B));
  const medP = median(u.map(x => x.rawP));
  const s = fitS(medP);
  const pr = predict(s, B, EDGES);
  const obsFloor = u.filter(isFloored).length, obsMod = u.filter(isModerate).length;
  const obsBelow = u.filter(x => x.rawP < 0.5).length;
  const rows = [];
  rows.push(`### ${label}`);
  rows.push('');
  rows.push(`Fitted from the median alone: median \`rawP\` = **${f(medP)}**, ` +
    `so \`s\` = Φ⁻¹(1 − ${f(medP)}/2) / ${f(MED_ABS_Z, 6)} = **${f(s, 4)}**. B = ${B}.`);
  rows.push('');
  rows.push('| quantity | observed | predicted from `s` alone | obs / pred |');
  rows.push('|---|---:|---:|---:|');
  rows.push(`| floored rate (K = 0) | **${pct(obsFloor, u.length)}** (${obsFloor}/${u.length}) | ` +
    `**${(100 * pr.atFloor).toFixed(2)}%** | ${f(obsFloor / u.length / pr.atFloor, 2)}× |`);
  rows.push(`| MODERATE band | ${pct(obsMod, u.length)} (${obsMod}/${u.length}) | ` +
    `${(100 * pr.moderate).toFixed(2)}% | ${f(obsMod / u.length / pr.moderate, 2)}× |`);
  rows.push(`| mass below 0.5 | ${pct(obsBelow, u.length)} | ${(100 * pr.below05).toFixed(2)}% | ` +
    `${f(obsBelow / u.length / pr.below05, 2)}× |`);
  rows.push('');
  rows.push('Whole band table — one parameter against fifteen bins:');
  rows.push('');
  rows.push('| band | observed | predicted | obs − pred |');
  rows.push('|---|---:|---:|---:|');
  for (let i = 0; i < EDGES.length - 1; i++) {
    const n = u.filter(x => x.rawP > EDGES[i] && x.rawP <= EDGES[i + 1]).length;
    const o = 100 * n / u.length, p = 100 * pr.bands[i];
    rows.push(`| (${EDGES[i]}, ${EDGES[i + 1]}] | ${o.toFixed(2)}% | ${p.toFixed(2)}% | ${(o - p >= 0 ? '+' : '') + (o - p).toFixed(2)} |`);
  }
  rows.push('');
  return { rows, s, medP, obsFloorRate: obsFloor / u.length, predFloor: pr.atFloor };
}

out.push('## 0.2 Does one inflation factor describe the whole distribution?');
out.push('');
out.push('Model: null κ ~ N(0, σ), observed κ ~ N(0, `s`·σ). The continuous tail probability is ' +
  '`q(z) = 2(1 − Φ(s·|z|))`; the reported p is `(1 + K)/(B + 1)` with `K ~ Binomial(B, q)`, so the ' +
  'floor is `K = 0` and is computed exactly rather than read off `q`. `s` is fitted from the median ' +
  'of `rawP` and from nothing else; the floor rate, the MODERATE rate and the band table are then ' +
  'predictions.');
out.push('');
const all = block('All units', units);
out.push(...all.rows);

// ── 0.3 ─────────────────────────────────────────────────────────────────
out.push('## 0.3 The same readings per assay label');
out.push('');
const perAssay = {};
for (const assay of [...new Set(units.map(u => u.assay))]) {
  const u = units.filter(x => x.assay === assay);
  const b = block(`${assay} (transform \`${u[0].transform}\`)`, u);
  perAssay[assay] = b;
  out.push(...b.rows);
}

// ── 0.3b — the homogeneous cells ────────────────────────────────────────
//
// 0.1 shows the floored rate moving with replicate count and 0.3 shows it moving
// with assay, so neither the pooled block nor a per-assay block is homogeneous.
// A MIXTURE of two scaled Gaussians has heavier tails than either component, so
// a pooled fit manufactures exactly the tail excess this step is trying to
// detect. The four assay × replicate cells are the smallest homogeneous unit
// available, and the fit has to be read there before any tail excess is claimed.
out.push('## 0.3b The four homogeneous cells — the only fit that cannot be a mixture artefact');
out.push('');
out.push('The floored counts per cell are 2 to 19, so an exact two-sided-ish binomial tail is quoted ' +
  'beside each: `P(X ≥ k)` when the observation is above prediction, `P(X ≤ k)` when below, at ' +
  '`n` = the cell\'s unit count and `p` = the predicted floor rate. **Without it a 5-against-1 reads ' +
  'like a finding and a 4-against-8 reads like a refutation, and only one of those survives.**');
out.push('');
out.push('| assay | transform | reps | units | median rawP | fitted `s` | obs floor | pred floor | obs/pred | binomial tail | `s`/√2 |');
out.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
// Exact binomial tail at (n, p): sum of pmf over the observed side.
function binomTail(k, n, p) {
  if (!(p > 0 && p < 1)) return NaN;
  const lp = Math.log(p), l1p = Math.log1p(-p);
  let lc = n * l1p, sum = 0;               // lc = log pmf(0)
  const pmfs = [Math.exp(lc)];
  for (let i = 0; i < n; i++) { lc += Math.log((n - i) / (i + 1)) + lp - l1p; pmfs.push(Math.exp(lc)); }
  const above = k > n * p;
  for (let i = 0; i <= n; i++) if (above ? i >= k : i <= k) sum += pmfs[i];
  return sum;
}
const cells = [];
for (const assay of [...new Set(units.map(u => u.assay))]) for (const nReps of repSet) {
  const u = units.filter(x => x.assay === assay && x.nReps === nReps);
  if (u.length < 2) continue;
  const B = median(u.map(x => x.B));
  const medP = median(u.map(x => x.rawP));
  const s = fitS(medP);
  const pr = predict(s, B, EDGES);
  const obsFloor = u.filter(isFloored).length;
  const rate = obsFloor / u.length;
  const tail = binomTail(obsFloor, u.length, pr.atFloor);
  cells.push({ assay, nReps, transform: u[0].transform, n: u.length, medP, s, rate,
    pred: pr.atFloor, obsFloor, tail });
  out.push(`| ${assay} | \`${u[0].transform}\` | ${nReps} | ${u.length} | ${f(medP)} | **${f(s, 4)}** | ` +
    `${(100 * rate).toFixed(2)}% (${obsFloor}) | ${(100 * pr.atFloor).toFixed(2)}% (${f(pr.atFloor * u.length, 1)}) | ` +
    `${f(rate / pr.atFloor, 2)}× | ${tail < 0.001 ? tail.toExponential(1) : f(tail, 3)} | ${f(s / Math.SQRT2, 3)} |`);
}
out.push('');
const survivors = cells.filter(c => c.tail < 0.05);
out.push(`Cells where the single-parameter model is rejected at 0.05: **${survivors.length} of ${cells.length}**` +
  (survivors.length ? ` — ${survivors.map(c => `${c.assay} ${c.nReps}rep (${c.obsFloor} against ${f(c.pred * c.n, 1)}, p = ${c.tail < 0.001 ? c.tail.toExponential(1) : f(c.tail, 3)})`).join('; ')}` : '') + '.');
out.push('');
out.push('√2 = 1.4142 is what the n-mismatch alone predicts for `s`. **The null and the observed ' +
  'differ only in row count — 240 against 120 — and carry an identical pair structure within a ' +
  'cell, so the correlation between pairs of the same row cancels between the two sides and the ' +
  '√2 is robust to it.** (It does not cancel across replicate counts, which is why the 0.1 ' +
  'comparison keeps its confound and this one does not.)');
out.push('');

out.push('## Fitted `s`, side by side');
out.push('');
out.push('| block | median rawP | fitted `s` | observed floor | predicted floor | obs/pred |');
out.push('|---|---:|---:|---:|---:|---:|');
out.push(`| all | ${f(all.medP)} | ${f(all.s, 4)} | ${(100 * all.obsFloorRate).toFixed(2)}% | ${(100 * all.predFloor).toFixed(2)}% | ${f(all.obsFloorRate / all.predFloor, 2)}× |`);
for (const [a, b] of Object.entries(perAssay)) {
  out.push(`| ${a} | ${f(b.medP)} | ${f(b.s, 4)} | ${(100 * b.obsFloorRate).toFixed(2)}% | ${(100 * b.predFloor).toFixed(2)}% | ${f(b.obsFloorRate / b.predFloor, 2)}× |`);
}
out.push('');
// What removing a factor of sqrt(2) from each fitted s would predict — the Step 2
// arithmetic, stated here so the prediction is on record before Step 2 runs.
out.push('## If the n-mismatch were the whole of `s`');
out.push('');
out.push('Matching n removes a factor of √2 from the ratio of the two standard deviations, IF the ' +
  'variance of a sample kurtosis goes as 1/n on both sides and nothing else moves. Applying that to ' +
  'each fitted `s` and re-predicting the floor rate:');
out.push('');
out.push('| block | `s` now | `s`/√2 | floor now | floor predicted after matched n |');
out.push('|---|---:|---:|---:|---:|');
const B0 = median(units.map(x => x.B));
for (const [label, b] of [['all', all], ...Object.entries(perAssay)]) {
  const s2 = b.s / Math.SQRT2;
  const p2 = predict(s2, B0, EDGES);
  out.push(`| ${label} | ${f(b.s, 4)} | ${f(s2, 4)} | ${(100 * b.obsFloorRate).toFixed(2)}% | **${(100 * p2.atFloor).toFixed(2)}%** |`);
}
out.push('');
out.push('Per homogeneous cell — the version to hold Step 2 to, since the pooled rows above mix ' +
  'cells whose `s` runs from 1.32 to 2.43:');
out.push('');
out.push('| assay | reps | `s` now | `s`/√2 | floor now | floor predicted after matched n | median rawP predicted |');
out.push('|---|---:|---:|---:|---:|---:|---:|');
for (const c of cells) {
  const s2 = c.s / Math.SQRT2;
  const p2 = predict(s2, 1999, EDGES);
  const medPred = 2 * (1 - Phi(s2 * MED_ABS_Z));
  out.push(`| ${c.assay} | ${c.nReps} | ${f(c.s, 4)} | ${f(s2, 4)} | ${(100 * c.rate).toFixed(2)}% | ` +
    `**${(100 * p2.atFloor).toFixed(2)}%** | ${f(medPred, 3)} |`);
}
out.push('');
out.push('Nominal is 0.05%. **The prediction is that matching `n` repairs the transformed block ' +
  'outright and leaves the untransformed one tens of times above nominal** — not that it improves ' +
  'both by a similar factor. `s`/√2 below 1 means the matched-n arm would come out CONSERVATIVE, ' +
  'which is a falsifiable outcome and not a rounding of "calibrated".');
out.push('');

const md = out.join('\n');
mkdirSync('test/probes/out-s364b', { recursive: true });
writeFileSync('test/probes/out-s364b/step0.md', md);
console.log(md);
console.log('\nwrote test/probes/out-s364b/step0.md');

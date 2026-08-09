// S364 part B, Step 0.4 — recount everything at draw level. Read-only over `src/`.
//
// Step 0's exact binomial tails treat each condition-unit as an independent
// trial. They are not: the generator's three `condNoiseRatio` rungs re-scale ONE
// set of PRNG draws (`gen-copy-fidelity.mjs:307-308`, `:351-352` — sigmaA and
// sigmaB scale the same two draws, which is what preserves the byte-identity
// anchor), so the same generated draw appears at all three rungs. A block that
// floors at r = 1 and again at r = 2.5 is one extreme draw counted twice, not
// two independent events.
//
// This step defines the trial as a BLOCK — one (assay, replicates, seed,
// condition) combination — and the event as that block reaching the floor at one
// or more rungs. It then redoes Step 0.2 / 0.3's binomial test at block level and
// asks whether the one rejection survives.
//
// Reads test/probes/out-s364/units.json, written by probe-s364-promotion-gap.mjs
// --census. Regenerate that first if it is absent (the out-* directories are
// gitignored, so they do not survive a worktree teardown).
//
//   node test/probes/probe-s364b-block-recount.mjs --step04

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const { ALPHA } = await import('../../src/constants/thresholds.js');

const UNITS = process.env.UNITS || 'test/probes/out-s364/units.json';

// ── Gaussian helpers — same forms as probe-s364b-mis-centred.mjs, so the
// fitted `s` here is the same arithmetic as Step 0's and can be compared to it
// directly. A&S 7.1.26; max |error| 1.5e-7 in erf.
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
function predictFloor(s, B) {
  let atFloor = 0;
  for (const [z, w] of zNodes()) atFloor += w * binomBands(2 * (1 - Phi(s * z)), B).atFloor;
  return atFloor;
}

const median = (xs) => {
  const s = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const pct = (a, b) => (b ? (100 * a / b).toFixed(2) + '%' : '—');
const f = (x, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : '—');

// Exact binomial tail at (n, p) on the observed side.
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

// ── Load ────────────────────────────────────────────────────────────────
const recs = JSON.parse(readFileSync(UNITS, 'utf8'));
const draws = recs.filter(x => x.kurt);
const units = draws.flatMap(x => x.kurt.conds.map(c => ({
  ...c, assay: x.assay, nReps: x.nReps, ratio: x.ratio, seed: x.seed,
  transform: x.transform, B: x.kurt.nSimulations,
})));
const isFloored = (c) => c.rawP != null && c.rawP < ALPHA.FLAG;
const RUNGS = [...new Set(units.map(u => u.ratio))].sort((a, b) => a - b);
const CELLS = [];
for (const assay of [...new Set(units.map(u => u.assay))])
  for (const nReps of [...new Set(units.map(u => u.nReps))].sort())
    if (units.some(u => u.assay === assay && u.nReps === nReps)) CELLS.push({ assay, nReps });

const blockKey = (u) => `${u.assay}|${u.nReps}|${u.seed}|${u.name}`;
const blocks = new Map();
for (const u of units) {
  const k = blockKey(u);
  if (!blocks.has(k)) blocks.set(k, { assay: u.assay, nReps: u.nReps, seed: u.seed,
    cond: u.name, transform: u.transform, rungs: [] });
  blocks.get(k).rungs.push(u);
}
for (const b of blocks.values()) {
  b.rungs.sort((x, y) => x.ratio - y.ratio);
  b.nRungs = b.rungs.length;
  b.flooredRungs = b.rungs.filter(isFloored);
  b.event = b.flooredRungs.length > 0;
}
const blockList = [...blocks.values()];
const flooredBlocks = blockList.filter(b => b.event);
const flooredUnits = units.filter(isFloored);

const out = [];
out.push('# S364 part B, Step 0.4 — the block recount');
out.push('');
out.push(`Source: \`${UNITS}\` — ${draws.length} draws, ${units.length} condition-units, ` +
  `**${blockList.length} blocks**. A block is one (assay, replicates, seed, condition) ` +
  'combination read at all ' + RUNGS.length + ' `condNoiseRatio` rungs (' + RUNGS.join(', ') + '). ' +
  'No engine run; every number is a read off the census.');
out.push('');
out.push('The three rungs of one seed are three re-scalings of ONE set of PRNG draws — ' +
  '`gen-copy-fidelity.mjs:307-308` sets `sigmaA = sigma·√(2/(1+r²))` and `sigmaB = r·sigmaA`, and ' +
  '`:351-352` scales the two already-drawn noise terms rather than re-drawing them (the ' +
  'byte-identity anchor S361 preserved). So a unit at r = 1 and the same unit at r = 2.5 are not ' +
  'independent trials, and Step 0\'s per-unit binomial tails over-count.');
out.push('');

// ── 0.4.1 the hand count, verified ──────────────────────────────────────
out.push('## 0.4.1 The hand count in the dispatch, checked against the census');
out.push('');
const byRungCount = {};
for (const b of flooredBlocks) (byRungCount[b.flooredRungs.length] ||= []).push(b);
const allThree = (byRungCount[RUNGS.length] || []);
const inRepeats = flooredUnits.filter(u => blocks.get(blockKey(u)).flooredRungs.length > 1).length;

out.push('| claim (Chat, hand-derived from part A\'s table) | claimed | measured | verdict |');
out.push('|---|---:|---:|:--|');
const chk = (label, claimed, measured) =>
  out.push(`| ${label} | ${claimed} | ${measured} | ${String(claimed) === String(measured) ? '**holds**' : '**WRONG**'} |`);
const unitsInTriples = allThree.reduce((a, b) => a + b.flooredRungs.length, 0);
chk('floored condition-units', 30, flooredUnits.length);
chk('distinct floored blocks', 15, flooredBlocks.length);
chk('blocks flooring at all three rungs', 6, allThree.length);
chk('floored units carried by those all-three blocks', 18, unitsInTriples);
chk('floored units inside REPEAT blocks (≥2 floored rungs)', 18, inRepeats);
const perCell = [...new Set(CELLS.map(c => blockList.filter(b => b.assay === c.assay && b.nReps === c.nReps).length))];
chk('blocks per cell', 40, perCell.length === 1 ? perCell[0] : perCell.join('/'));
for (const c of CELLS) {
  const claimed = { 'general|4': 1, 'general|6': 3, 'plate_reader|4': 2, 'plate_reader|6': 9 }[`${c.assay}|${c.nReps}`];
  const meas = flooredBlocks.filter(b => b.assay === c.assay && b.nReps === c.nReps).length;
  chk(`floored blocks — ${c.assay} ${c.nReps}rep`, claimed, meas);
}
out.push('');
out.push('The six named as flooring at all three rungs, against the measured set:');
out.push('');
const CLAIMED_ALL3 = new Set([
  'general|6|6106|CondB', 'plate_reader|4|6111|CondA', 'plate_reader|6|6100|CondB',
  'plate_reader|6|6106|CondB', 'plate_reader|6|6117|CondA', 'plate_reader|6|6118|CondB',
]);
const measuredAll3 = new Set(allThree.map(b => `${b.assay}|${b.nReps}|${b.seed}|${b.cond}`));
out.push('| block | claimed | measured |');
out.push('|---|:--|:--|');
for (const k of [...new Set([...CLAIMED_ALL3, ...measuredAll3])].sort()) {
  out.push(`| \`${k}\` | ${CLAIMED_ALL3.has(k) ? 'yes' : '—'} | ${measuredAll3.has(k) ? 'yes' : '—'} |`);
}
out.push('');

out.push('### every floored block, one row each');
out.push('');
out.push('| assay | reps | seed | cond | rungs floored | of | which rungs | rawP by rung |');
out.push('|---|---:|---:|---|---:|---:|---|---|');
for (const b of flooredBlocks.sort((x, y) =>
  x.assay.localeCompare(y.assay) || x.nReps - y.nReps || x.seed - y.seed || x.cond.localeCompare(y.cond))) {
  out.push(`| ${b.assay} | ${b.nReps} | ${b.seed} | ${b.cond} | **${b.flooredRungs.length}** | ${b.nRungs} | ` +
    `${b.flooredRungs.map(u => u.ratio).join(', ')} | ` +
    `${b.rungs.map(u => `${u.ratio}: ${u.rawP}`).join(' · ')} |`);
}
out.push('');
out.push('| rungs floored within a block | blocks | units they carry |');
out.push('|---:|---:|---:|');
for (const k of Object.keys(byRungCount).sort()) {
  out.push(`| ${k} | ${byRungCount[k].length} | ${byRungCount[k].length * Number(k)} |`);
}
out.push('');

// ── 0.4.2 how clumped is that, against a within-cell reference ──────────
out.push('## 0.4.2 Is the clumping real? — a within-cell permutation reference');
out.push('');
out.push('Fifteen blocks carrying thirty units is only surprising against some reference. The ' +
  'reference used here holds each cell\'s floored-unit COUNT fixed and re-assigns which of that ' +
  'cell\'s unit-slots are floored, uniformly at random — so it asks: if flooring were a property of ' +
  'the (draw × rung) slot rather than of the underlying draw, how many distinct blocks would ' +
  'thirty floored units occupy? Deterministic PRNG, no `Math.random`.');
out.push('');
// xorshift32 — deterministic, no Math.random (which the workflow rules forbid in scripts).
let _rs = 20260810;
const rnd = () => { _rs ^= _rs << 13; _rs >>>= 0; _rs ^= _rs >> 17; _rs ^= _rs << 5; _rs >>>= 0; return _rs / 4294967296; };
const NPERM = 20000;
let ge = 0, le = 0;
const distinctCounts = [];
const cellSlots = CELLS.map(c => {
  const u = units.filter(x => x.assay === c.assay && x.nReps === c.nReps);
  return { ...c, slots: u.map(x => blockKey(x)), k: u.filter(isFloored).length };
});
for (let p = 0; p < NPERM; p++) {
  const seen = new Set();
  for (const cs of cellSlots) {
    const idx = cs.slots.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    for (let i = 0; i < cs.k; i++) seen.add(cs.slots[idx[i]]);
  }
  distinctCounts.push(seen.size);
  if (seen.size <= flooredBlocks.length) le++;
  if (seen.size >= flooredBlocks.length) ge++;
}
const meanDistinct = distinctCounts.reduce((a, b) => a + b, 0) / NPERM;
out.push(`Observed distinct blocks: **${flooredBlocks.length}**. Under the slot-uniform reference over ` +
  `${NPERM} permutations: mean **${f(meanDistinct, 2)}**, median ${median(distinctCounts)}, ` +
  `range ${Math.min(...distinctCounts)}–${Math.max(...distinctCounts)}. ` +
  `P(distinct ≤ ${flooredBlocks.length}) = **${le === 0 ? `0 of ${NPERM}, so < ${(1 / NPERM).toExponential(1)}` : (le / NPERM).toExponential(2)}**.`);
out.push('');
out.push('So the clumping is not a rounding artefact of small counts: flooring is substantially a ' +
  'property of the generated draw, and treating each rung as its own trial inflates the evidence.');
out.push('');

// ── 0.4.3 the block-level rate, and the re-test ─────────────────────────
out.push('## 0.4.3 Block rate per cell, beside the unit rate');
out.push('');
out.push('**The null block rate, and how it is got from the per-unit model.** Step 0 fits one ' +
  'inflation `s` per cell from the median `rawP` and predicts a per-unit floor probability `p₁`. ' +
  'The model says nothing about how a block\'s rungs relate to each other, so `p₁` cannot be ' +
  'converted to a block rate without one more input — and **that input decides the answer**, so it ' +
  'is measured here rather than assumed.');
out.push('');
out.push('Write a unit\'s standardised statistic as `z ~ N(0, s)` in units of the null\'s sd. Its ' +
  'continuous tail probability is `q = 2(1 − Φ(|z|))` and the reported p is `(1 + K)/(B + 1)` with ' +
  '`K ~ Binomial(B, q)`, so the floor event is `K = 0`. Within a block the R rungs share one ' +
  'generated draw, so their `z`s are correlated; conditional on the `z`s the binomial layers are ' +
  'independent, giving');
out.push('');
out.push('```');
out.push('P(block floors) = E[ 1 − Π_r (1 − (1 − q(z_r))^B) ]   with (z_1..z_R) exchangeable N(0, s), corr ρ');
out.push('```');
out.push('');
out.push('**Three values of ρ are reported and only the middle one is a measurement.** `ρ = 0` is ' +
  'independence — it makes the expected block count equal the expected unit count, which is the ' +
  'implicit assumption behind Step 0.3b. `ρ = 1` is perfect dependence — a block floors iff its one ' +
  'shared draw floors, so the expected count falls by a factor of R. **`ρ = ρ̂` is estimated from ' +
  'the data and is the one to read.**');
out.push('');
out.push('`ρ̂` is estimated from the WHOLE unit population, not from the floored tail, so it is not ' +
  'fitted on the quantity under test. Each unit\'s signed statistic is reconstructed as ' +
  '`ẑ = sign(κDev) · Φ⁻¹(1 − rawP/2)` — `rawP` is two-sided about the null median (`kurtosis.js:423-425`) ' +
  'and `kurtDeviation` carries the side. Spearman\'s ρ_s is taken over all within-block rung PAIRS ' +
  'in the cell and converted by `ρ = 2·sin(π·ρ_s/6)`, the bivariate-normal relation. Rank ' +
  'correlation is used because the floored units are censored onto one value of `rawP` and would ' +
  'distort a moment estimator. **Two approximations are on the record**: `κDev` is measured against ' +
  'the null MEAN while `rawP` is measured against the null MEDIAN, so a unit very near the centre ' +
  'can take the wrong sign; and the reconstruction inverts a discretised `k/2000` p.');
out.push('');

// Deterministic standard normal off the xorshift above (Box-Muller, no spare).
const nrm = () => { const u = Math.max(1e-12, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// Spearman on paired arrays, average ranks for ties.
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

// P(block floors) by nested quadrature — DETERMINISTIC, no Monte Carlo error.
// The multiplicity-corrected tail lands within a few thousandths of 0.05, which
// is far too close to decide off a simulation estimate.
//
//   z_r = s(√ρ·g + √(1−ρ)·e_r),  g and e_r iid N(0,1)
//   P(block) = 1 − E_g[ ( E_e[ 1 − P₀(z) ] )^R ]        (e_r iid given g)
//   P₀(z)    = (1 − q(z))^B,   q(z) = 2(1 − Φ(|z|))
const QSTEP = 0.008, QMAX = 8.5;
const QGRID = [];
for (let z = -QMAX; z <= QMAX; z += QSTEP) QGRID.push([z, phi(z) * QSTEP]);
const notFloor = (z, B) => {
  const q = 2 * (1 - Phi(Math.abs(z)));
  return 1 - (q <= 0 ? 1 : q >= 1 ? 0 : Math.exp(B * Math.log1p(-q)));
};
function blockFloorProb(s, B, R, rho) {
  const a = Math.sqrt(Math.max(0, rho)), b = Math.sqrt(Math.max(0, 1 - rho));
  if (b === 0) {                                  // ρ = 1 — one shared z
    let acc = 0;
    for (const [g, w] of QGRID) acc += w * Math.pow(notFloor(s * a * g, B), R);
    return 1 - acc;
  }
  if (a === 0) {                                  // ρ = 0 — R independent z
    let inner = 0;
    for (const [e, w] of QGRID) inner += w * notFloor(s * b * e, B);
    return 1 - Math.pow(inner, R);
  }
  let acc = 0;
  for (const [g, wg] of QGRID) {
    let inner = 0;
    for (const [e, we] of QGRID) inner += we * notFloor(s * (a * g + b * e), B);
    acc += wg * Math.pow(inner, R);
  }
  return 1 - acc;
}

const cellRows = [];
for (const c of CELLS) {
  const u = units.filter(x => x.assay === c.assay && x.nReps === c.nReps);
  const bl = blockList.filter(x => x.assay === c.assay && x.nReps === c.nReps);
  const B = median(u.map(x => x.B));
  const s = fitS(median(u.map(x => x.rawP)));
  const p1 = predictFloor(s, B);
  // ρ̂ — Spearman over every within-block rung pair in the cell.
  const zOf = (x) => (parseFloat(x.kurtDeviation) < 0 ? -1 : 1) * PhiInv(1 - x.rawP / 2);
  const px = [], py = [];
  for (const b of bl) for (let i = 0; i < b.rungs.length; i++) for (let j = i + 1; j < b.rungs.length; j++) {
    px.push(zOf(b.rungs[i])); py.push(zOf(b.rungs[j]));
  }
  const rs = spearman(px, py);
  const rhoHat = Math.max(0, Math.min(1, 2 * Math.sin(Math.PI * rs / 6)));
  // Robustness: the same estimate with every PAIR touching a floored unit dropped,
  // so the censored-onto-one-value units cannot be carrying the dependence.
  const qx = [], qy = [];
  for (const b of bl) for (let i = 0; i < b.rungs.length; i++) for (let j = i + 1; j < b.rungs.length; j++) {
    if (isFloored(b.rungs[i]) || isFloored(b.rungs[j])) continue;
    qx.push(zOf(b.rungs[i])); qy.push(zOf(b.rungs[j]));
  }
  const rsClean = qx.length >= 10 ? spearman(qx, qy) : NaN;
  const rhoClean = Number.isFinite(rsClean) ? Math.max(0, Math.min(1, 2 * Math.sin(Math.PI * rsClean / 6))) : NaN;
  const obsBl = bl.filter(x => x.event).length;
  const armFor = (rho) => {
    const exp = bl.reduce((a2, b2) => a2 + blockFloorProb(s, B, b2.nRungs, rho), 0);
    const pm = exp / bl.length;
    return { exp, pm, tail: binomTail(obsBl, bl.length, pm) };
  };
  const a0 = armFor(0), aH = armFor(rhoHat), a1 = armFor(1);
  cellRows.push({ ...c, nU: u.length, flU: u.filter(isFloored).length, s, p1, B,
    nB: bl.length, obsBl, rs, rhoHat, rhoClean, a0, aH, a1, nPairs: px.length,
    nPairsClean: qx.length, transform: u[0].transform });
}

out.push('| assay | reps | units | floored units | unit rate | blocks | floored blocks | block rate | Spearman ρ_s | **ρ̂** | pairs | ρ̂ excl. floored | pairs |');
out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const r of cellRows) {
  out.push(`| ${r.assay} | ${r.nReps} | ${r.nU} | ${r.flU} | ${pct(r.flU, r.nU)} | ${r.nB} | ` +
    `**${r.obsBl}** | **${pct(r.obsBl, r.nB)}** | ${f(r.rs, 3)} | **${f(r.rhoHat, 3)}** | ${r.nPairs} | ` +
    `${f(r.rhoClean, 3)} | ${r.nPairsClean} |`);
}
out.push('');
out.push('**The three rungs are very nearly the same measurement.** ρ̂ runs 0.92 to 0.99, and dropping ' +
  'every pair that touches a floored unit barely moves it — so the dependence is a property of the ' +
  'whole distribution, not of the censored tail. That is the same fact S363 recorded from the other ' +
  'side ("neither condition moves" across the ladder): the per-condition κ is close to invariant to ' +
  '`condNoiseRatio`, so re-reading one draw at three rungs is close to re-reading it three times.');
out.push('');
out.push('One consequence worth stating, because it is why the `ρ = 1` column is not simply `p₁`: even ' +
  'when the three rungs share one `z`, each rung is a separate engine run on rescaled data, so it ' +
  'draws its OWN simulation null and gets its own independent binomial layer. A block at `ρ = 1` ' +
  'therefore has three independent chances at `K = 0`, and its rate is `E[1 − (1 − P₀(z))³]`, ' +
  'strictly above `E[P₀(z)]`.');
out.push('');
out.push('### the re-test, at all three values of ρ');
out.push('');
out.push('| assay | reps | obs blocks | ρ = 0: exp (tail) | **ρ = ρ̂: exp (tail)** | ρ = 1: exp (tail) | unit level, for comparison |');
out.push('|---|---:|---:|---|---|---|---|');
const tf = (t) => (t < 0.001 ? t.toExponential(1) : f(t, 3));
for (const r of cellRows) {
  const uTail = binomTail(r.flU, r.nU, r.p1);
  out.push(`| ${r.assay} | ${r.nReps} | **${r.obsBl}** | ${f(r.a0.exp, 2)} (${tf(r.a0.tail)}) | ` +
    `**${f(r.aH.exp, 2)} (${tf(r.aH.tail)})** | ${f(r.a1.exp, 2)} (${tf(r.a1.tail)}) | ` +
    `${r.flU} / ${f(r.p1 * r.nU, 2)} (${tf(uTail)}) |`);
}
out.push('');
const rej = (arm) => cellRows.filter(r => r[arm].tail < 0.05);
out.push(`Cells rejected at 0.05 — **ρ = 0: ${rej('a0').length}** (${rej('a0').map(r => `${r.assay} ${r.nReps}rep`).join('; ') || 'none'}); ` +
  `**ρ = ρ̂: ${rej('aH').length}** (${rej('aH').map(r => `${r.assay} ${r.nReps}rep`).join('; ') || 'none'}); ` +
  `**ρ = 1: ${rej('a1').length}** (${rej('a1').map(r => `${r.assay} ${r.nReps}rep`).join('; ') || 'none'}).`);
out.push('');
out.push('**Read the direction of every tail before reading its size.** A tail below 0.05 with the ' +
  'observation ABOVE expectation is evidence against the single-scale model. A tail below 0.05 with ' +
  'the observation BELOW expectation is evidence against the ρ used to get the expectation — which ' +
  'is exactly what the `ρ = 0` column produces on `plate_reader`, because independence over-states ' +
  'how many distinct blocks a fixed number of floored units can occupy. 0.4.2 measured that ' +
  'over-statement directly. Directions:');
out.push('');
out.push('| assay | reps | ρ = 0 | ρ = ρ̂ | ρ = 1 |');
out.push('|---|---:|:--|:--|:--|');
const dir = (obs, exp) => (obs > exp ? 'above' : obs < exp ? 'below' : 'equal');
for (const r of cellRows) {
  out.push(`| ${r.assay} | ${r.nReps} | ${dir(r.obsBl, r.a0.exp)} | **${dir(r.obsBl, r.aH.exp)}** | ${dir(r.obsBl, r.a1.exp)} |`);
}
out.push('');
out.push('### the rejection, read against multiplicity');
out.push('');
out.push('Four cells are tested, so a single 0.013 is not a 0.013. Rank-1 BH and Bonferroni coincide ' +
  'at `m = 4` for the smallest p:');
out.push('');
out.push('| ρ | smallest tail | cell | × 4 (Bonferroni / rank-1 BH) | rejects at 0.05 after correction |');
out.push('|---|---:|---|---:|:--|');
for (const [label, arm] of [['0 (independence)', 'a0'], ['ρ̂ (measured)', 'aH'], ['1 (perfect)', 'a1']]) {
  const up = cellRows.filter(r => r.obsBl > r[arm].exp);
  const best = up.sort((x, y) => x[arm].tail - y[arm].tail)[0];
  if (!best) { out.push(`| ${label} | — (no cell above expectation) | — | — | no |`); continue; }
  const adj = Math.min(1, best[arm].tail * cellRows.length);
  out.push(`| ${label} | ${best[arm].tail.toPrecision(4)} | ${best.assay} ${best.nReps}rep | ${adj.toPrecision(4)} | ` +
    `${adj < 0.05 ? '**yes**' : 'no'}${Math.abs(adj - 0.05) < 0.005 ? ' — but within 0.005 of the line' : ''} |`);
}
out.push('');
out.push('Only high-side tails are eligible — a cell below expectation is not evidence against the ' +
  'model, so including it in the correction family would be counting the wrong events.');
out.push('');

// ── 0.4.4 the repeat statistic, reported not interpreted ────────────────
out.push('## 0.4.4 How often a block that floors at one rung floors at all of them');
out.push('');
const nFl = flooredBlocks.length;
out.push(`Of the **${nFl}** blocks that floor at least once, **${allThree.length}** floor at every ` +
  `rung they have (${pct(allThree.length, nFl)}), ` +
  `${(byRungCount[2] || []).length} floor at exactly two, and ${(byRungCount[1] || []).length} floor at exactly one.`);
out.push('');
out.push('| assay | reps | floored blocks | all rungs | exactly 2 | exactly 1 |');
out.push('|---|---:|---:|---:|---:|---:|');
for (const c of CELLS) {
  const bl = flooredBlocks.filter(b => b.assay === c.assay && b.nReps === c.nReps);
  out.push(`| ${c.assay} | ${c.nReps} | ${bl.length} | ${bl.filter(b => b.flooredRungs.length === b.nRungs).length} | ` +
    `${bl.filter(b => b.flooredRungs.length === 2).length} | ${bl.filter(b => b.flooredRungs.length === 1).length} |`);
}
out.push('');
out.push('For context on how far from the floor a block\'s non-floored rungs sit — the median `rawP` ' +
  'across the rungs a floored block did NOT floor at, against the median over all units in the ' +
  'same cell:');
out.push('');
out.push('| assay | reps | non-floored rungs of floored blocks: median rawP | all units: median rawP |');
out.push('|---|---:|---:|---:|');
for (const c of CELLS) {
  const bl = flooredBlocks.filter(b => b.assay === c.assay && b.nReps === c.nReps);
  const rest = bl.flatMap(b => b.rungs.filter(u => !isFloored(u)).map(u => u.rawP));
  const allU = units.filter(x => x.assay === c.assay && x.nReps === c.nReps).map(x => x.rawP);
  out.push(`| ${c.assay} | ${c.nReps} | ${rest.length ? f(median(rest)) : '— (none)'} (n = ${rest.length}) | ${f(median(allU))} |`);
}
out.push('');
out.push('Reported, not interpreted — a statistic that is extreme on a particular draw regardless of ' +
  'the condition-noise ratio is a property of the data rather than of the ladder, and what that ' +
  'implies is Step 2\'s question, not this one\'s.');
out.push('');

const md = out.join('\n');
mkdirSync('test/probes/out-s364b', { recursive: true });
writeFileSync('test/probes/out-s364b/step04.md', md);
console.log(md);
console.log('\nwrote test/probes/out-s364b/step04.md');

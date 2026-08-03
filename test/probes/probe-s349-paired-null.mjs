// probe-s349-paired-null.mjs — S349 Part 3b.
//
// The three Stage-1 distances on 09-proteomics-clean, against two nulls.
//
//   ARM 1  free permutation — shuffle all 400 row-tuples, take the first 200 as
//          pseudo-condition A. This is what the engine does
//          (crossConditionConsistency.js:456-474).
//   ARM 2  within-pair permutation — for each protein independently, swap or
//          keep its Vehicle and Treatment rows. This is the exchangeability a
//          matched-pair design actually has.
//
// The statistics are re-implemented here rather than imported, so arm 1 is an
// independent check on the engine and not a restatement of it. If arm 1's
// doubled p disagrees with the engine's Part 3a value beyond Monte Carlo error,
// something is wrong and the run says so.
//
// Transform: the engine applies natural log to this file (detectVST -> 'log',
// engine.js:283, no shift). Reproduced here. P1/P2 use |log(sA) - log(sB)|,
// which is invariant to the log base anyway; KS is invariant to any increasing
// transform. The dObs self-check against the engine's captured values settles it.
//
// READ-ONLY on src/. Reads the fixture and three pure helpers from src/, runs
// no engine test.
//
// Usage:  node test/probes/probe-s349-paired-null.mjs
// Env: BPERM (default 9999), SEED (default 12345), FILE.

import { readFileSync } from 'fs';
import { join } from 'path';

const BPERM = Math.max(1, Number(process.env.BPERM) || 9999);
const SEED = Number(process.env.SEED) || 12345;
const FILE = process.env.FILE || '09-proteomics-clean.csv';
const FIXTURES = 'test/fixtures';

// The engine's captured observed distances at B = 9999 (S349 Part 3a), for the
// dObs self-check. These come from the per-unit capture, not from a doc.
const ENGINE_DOBS = { P1: 0.00012099, P2: 0.013353, P3: 0.021667 };
const ENGINE_P2 = { P1: 0.006400, P2: 0.2213, P3: 0.001200 }; // median over 20 seeds

// ── local PRNG, so this probe does not touch the engine's streams ──────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── the three Stage-1 statistics, re-implemented from the registry spec ────
function quantileOfSorted(s, q) {
  const n = s.length;
  if (n === 0) return NaN;
  if (n === 1) return s[0];
  const pos = q * (n - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
function medianOfSorted(s) {
  const n = s.length;
  if (n === 0) return NaN;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
}
const p1Stat = s => quantileOfSorted(s, 0.95) - quantileOfSorted(s, 0.05);
function p2Stat(s) {
  const n = s.length, med = medianOfSorted(s);
  const ad = new Float64Array(n);
  for (let k = 0; k < n; k++) ad[k] = Math.abs(s[k] - med);
  ad.sort();
  return medianOfSorted(ad);
}
const logRatio = (a, b) => Math.abs(Math.log(Math.abs(a)) - Math.log(Math.abs(b)));
function ksDistance(a, b) {
  const nA = a.length, nB = b.length;
  let i = 0, j = 0, maxDiff = 0;
  while (i < nA || j < nB) {
    let x;
    if (i >= nA) x = b[j]; else if (j >= nB) x = a[i]; else x = a[i] <= b[j] ? a[i] : b[j];
    while (i < nA && a[i] === x) i++;
    while (j < nB && b[j] === x) j++;
    const d = Math.abs(i / nA - j / nB);
    if (d > maxDiff) maxDiff = d;
  }
  return maxDiff;
}

// ── build the row-tuples straight from the CSV ────────────────────────────
const lines = readFileSync(join(FIXTURES, FILE), 'utf-8').replace(/\n+$/, '').split('\n');
const header = lines[0].split(',');
const idCol = 0, condCol = 1, firstData = 2;
const rows = [];
for (let L = 1; L < lines.length; L++) {
  const f = lines[L].split(',');
  const cells = [];
  for (let c = firstData; c < f.length; c++) {
    const v = Number(f[c]);
    if (f[c].trim() !== '' && Number.isFinite(v) && v > 0) cells.push(Math.log(v)); // engine.js:283
  }
  rows.push({ id: f[idCol], cond: f[condCol], cells });
}
const condNames = [...new Set(rows.map(r => r.cond))];
if (condNames.length !== 2) throw new Error(`probe-s349b: expected 2 conditions, got ${condNames.length}`);

// pairing index: for each identifier, its row index in each condition
const pairs = new Map();
for (let i = 0; i < rows.length; i++) {
  const e = pairs.get(rows[i].id) || {};
  e[rows[i].cond] = i;
  pairs.set(rows[i].id, e);
}
const pairList = [...pairs.values()];
const unpaired = pairList.filter(e => e[condNames[0]] == null || e[condNames[1]] == null).length;

console.log(`S349 Part 3b — paired vs free permutation null on ${FILE}`);
console.log(`${rows.length} rows, ${condNames.length} conditions (${condNames.join(', ')}), transform: natural log (engine.js:283)`);
console.log(`${pairList.length} identifiers, ${unpaired} not present in both conditions`);
if (unpaired) throw new Error('probe-s349b: arm 2 needs every identifier in both conditions.');
const nPerCond = rows.filter(r => r.cond === condNames[0]).length;
console.log(`${nPerCond} rows per condition, ${rows.reduce((s, r) => s + r.cells.length, 0)} usable cells total`);
console.log(`B = ${BPERM} per arm, local Mulberry32 seeded ${SEED} (the engine's streams are untouched)\n`);

// ── pooled arrays for an assignment: assign[i] = 0 or 1 ────────────────────
function pools(assign) {
  const A = [], Bv = [];
  for (let i = 0; i < rows.length; i++) (assign[i] === 0 ? A : Bv).push(...rows[i].cells);
  const a = Float64Array.from(A); a.sort();
  const b = Float64Array.from(Bv); b.sort();
  return [a, b];
}
function distances(a, b) {
  return {
    P1: logRatio(p1Stat(a), p1Stat(b)),
    P2: logRatio(p2Stat(a), p2Stat(b)),
    P3: ksDistance(a, b),
  };
}

// observed assignment
const obsAssign = rows.map(r => r.cond === condNames[0] ? 0 : 1);
const [obsA, obsB] = pools(obsAssign);
const dObs = distances(obsA, obsB);

console.log('── observed distances (self-check against the engine\'s captured dObs) ──');
let selfCheckOK = true;
for (const k of ['P1', 'P2', 'P3']) {
  const rel = Math.abs(dObs[k] - ENGINE_DOBS[k]) / Math.abs(ENGINE_DOBS[k]);
  const ok = rel < 1e-4;
  if (!ok) selfCheckOK = false;
  console.log(`   ${k}  this probe ${dObs[k].toPrecision(8).padStart(14)}   engine ${String(ENGINE_DOBS[k]).padStart(12)}   rel diff ${rel.toExponential(2)}  ${ok ? 'MATCH' : 'MISMATCH'}`);
}
if (!selfCheckOK) throw new Error('probe-s349b: observed distances do not match the engine — inputs differ, halting.');
console.log('');

// ── arm 1: free permutation of all rows, nPerCond into pseudo-condition A ──
function armFree(rng) {
  const idx = Uint32Array.from(rows.keys());
  for (let i = idx.length - 1; i > 0; i--) {
    const r = Math.floor(rng() * (i + 1));
    const t = idx[i]; idx[i] = idx[r]; idx[r] = t;
  }
  const assign = new Uint8Array(rows.length);
  for (let t = nPerCond; t < idx.length; t++) assign[idx[t]] = 1;
  return assign;
}

// ── arm 2: within-pair swap-or-keep, independently per identifier ──────────
function armPaired(rng) {
  const assign = new Uint8Array(rows.length);
  for (const e of pairList) {
    const swap = rng() < 0.5;
    assign[e[condNames[0]]] = swap ? 1 : 0;
    assign[e[condNames[1]]] = swap ? 0 : 1;
  }
  return assign;
}

function runArm(label, gen) {
  const rng = mulberry32(SEED);
  const dist = { P1: new Float64Array(BPERM), P2: new Float64Array(BPERM), P3: new Float64Array(BPERM) };
  let nSplit = 0;
  for (let b = 0; b < BPERM; b++) {
    const assign = gen(rng);
    // how many identifiers land one-in-each — the structural axis
    let s = 0;
    for (const e of pairList) if (assign[e[condNames[0]]] !== assign[e[condNames[1]]]) s++;
    nSplit += s;
    const [a, bb] = pools(assign);
    const d = distances(a, bb);
    dist.P1[b] = d.P1; dist.P2[b] = d.P2; dist.P3[b] = d.P3;
  }
  console.log(`── ${label} ──`);
  console.log(`   identifiers split one-per-pseudo-condition: mean ${(nSplit / BPERM).toFixed(1)} of ${pairList.length}   (observed assignment: ${pairList.length})`);
  const out = {};
  for (const k of ['P1', 'P2', 'P3']) {
    const v = dist[k];
    const sorted = Float64Array.from(v); sorted.sort();
    const mean = v.reduce((s, x) => s + x, 0) / BPERM;
    const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (BPERM - 1));
    let nUpper = 0, nLower = 0;
    for (let i = 0; i < BPERM; i++) { if (v[i] >= dObs[k]) nUpper++; if (v[i] <= dObs[k]) nLower++; }
    const pU = (1 + nUpper) / (BPERM + 1), pL = (1 + nLower) / (BPERM + 1);
    const p2 = Math.min(1, 2 * Math.min(pU, pL));
    const pct = 100 * nLower / BPERM;
    const med = medianOfSorted(sorted);
    const dir = dObs[k] <= med ? 'similar' : 'different';
    out[k] = { p2, pct, med, mean, sd, nLower, nUpper, q05: quantileOfSorted(sorted, 0.05), q95: quantileOfSorted(sorted, 0.95) };
    console.log(`   ${k}  dObs ${dObs[k].toPrecision(6).padStart(13)} | null med ${med.toPrecision(6).padStart(12)} mean ${mean.toPrecision(6).padStart(12)} sd ${sd.toPrecision(4).padStart(11)}` +
      ` | 5-95% [${quantileOfSorted(sorted, 0.05).toPrecision(4)}, ${quantileOfSorted(sorted, 0.95).toPrecision(4)}]`);
    console.log(`       nLower ${String(nLower).padStart(5)}/${BPERM}  percentile ${pct.toFixed(3)}%  direction ${dir}  doubled p = ${p2.toPrecision(5)}`);
  }
  console.log('');
  return out;
}

const free = runArm(`ARM 1 — free permutation (what the engine does)`, armFree);
const paired = runArm(`ARM 2 — within-pair swap-or-keep (matched-pair exchangeability)`, armPaired);

// ── validity gate on arm 1 against the engine ─────────────────────────────
console.log('── validity gate: arm 1 vs the engine\'s Part 3a doubled p (median over 20 seeds, B = 9999) ──');
let gateOK = true;
for (const k of ['P1', 'P2', 'P3']) {
  const mine = free[k].p2, theirs = ENGINE_P2[k];
  // Monte Carlo band on a proportion at B = 9999: 3 SE on the one-sided tail,
  // doubled. Wide enough not to fire on noise, tight enough to catch a real
  // structural disagreement.
  const t = Math.min(free[k].nLower, free[k].nUpper) / BPERM;
  const se = Math.sqrt(Math.max(t, 1 / BPERM) * (1 - t) / BPERM);
  const band = 2 * 3 * se;
  const ok = Math.abs(mine - theirs) <= band + 1e-12;
  if (!ok) gateOK = false;
  console.log(`   ${k}  probe ${mine.toPrecision(5).padStart(10)}   engine ${String(theirs).padStart(10)}   |diff| ${Math.abs(mine - theirs).toPrecision(3).padStart(10)}   3-SE band ${band.toPrecision(3).padStart(10)}   ${ok ? 'AGREE' : 'DISAGREE'}`);
}
console.log(gateOK
  ? '   GATE PASS — arm 1 reproduces the engine, so arm 2 is comparing like with like.'
  : '   GATE FAIL — HALT. Either the probe is wrong or the Part 1 source read missed something.');

console.log('\n── side by side ──');
console.log(`   stat  dObs            arm1 nullMed     arm1 p        arm1 pctile   arm2 nullMed     arm2 p        arm2 pctile`);
for (const k of ['P1', 'P2', 'P3']) {
  console.log(`   ${k}    ${dObs[k].toPrecision(6).padEnd(15)} ${free[k].med.toPrecision(6).padEnd(16)} ${free[k].p2.toPrecision(5).padEnd(13)} ${(free[k].pct.toFixed(3) + '%').padEnd(13)} ` +
    `${paired[k].med.toPrecision(6).padEnd(16)} ${paired[k].p2.toPrecision(5).padEnd(13)} ${paired[k].pct.toFixed(3)}%`);
}

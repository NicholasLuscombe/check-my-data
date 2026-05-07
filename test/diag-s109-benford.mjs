// S109 Part 1 — Target A diagnostic.
// Imports the ACTUAL Benford First Digit test from src/tests/benford.js
// and runs it against a grid of (distribution, N) with ≥50 realisations.
// Reports empirical flag distribution + mean pMAD per cell.
//
// No test-code modifications. Run: node test/diag-s109-benford.mjs
//
// Also reproduces the DS21 v2 / DS22 report: Benford HIGH at p≈0 on
// pure N(0,1) replicate cols at N=400.

import { readFileSync } from 'fs';
import { join } from 'path';
import { testBenford } from '../src/tests/benford.js';
import { createPRNG } from '../src/stats/prng.js';

// Outer PRNG (Mulberry32) — seeded, independent of test's internal PRNG.
// The test's PRNG is seeded from the data matrix, so each realisation gets
// its own seed via the unique random draw.
function makeOuterRNG(seed) {
  let state = seed | 0;
  function random() {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // Box-Muller
  let spare = null, hasSpare = false;
  function randn() {
    if (hasSpare) { hasSpare = false; return spare; }
    let u, v, s;
    do { u = random() * 2 - 1; v = random() * 2 - 1; s = u*u + v*v; } while (s >= 1 || s === 0);
    const f = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * f; hasSpare = true;
    return u * f;
  }
  return { random, randn };
}

function genNormal(N, orng) {
  const arr = [];
  for (let i = 0; i < N; i++) arr.push(orng.randn());
  return arr;
}
function genAbsNormal(N, orng) {
  return genNormal(N, orng).map(Math.abs);
}
function genUniform(N, orng) {
  const arr = [];
  for (let i = 0; i < N; i++) arr.push(orng.random());
  return arr;
}
function genLogNormal(N, orng) {
  return genNormal(N, orng).map(z => Math.exp(z));
}

const DISTRIBUTIONS = [
  ['N(0,1)',       genNormal],
  ['|N(0,1)|',     genAbsNormal],
  ['Uniform(0,1)', genUniform],
  ['LogNormal(0,1)', genLogNormal],
];
const N_VALUES = [100, 200, 400, 1000, 5000];
const REALISATIONS = 50;

console.log(`# Target A — Benford First Digit applicability-gate diagnostic`);
console.log(`# Code location: src/tests/benford.js — applicability gate line 13-21.`);
console.log(`#   Line 14: allVals.length < 100 → N/A`);
console.log(`#   Line 17: robustLogSpan(absVals) < 1.0 → N/A (METHODOLOGY §3.2 says ≥1.5)`);
console.log(`#   Line 21: total (valid leading digits) < 50 → N/A`);
console.log(`# Flag ladder (line 74-78): MAD<0.015 → LOW; else pMAD<0.001 HIGH, <0.01 MODERATE, else LOW`);
console.log();
console.log(`# Realisations per cell: ${REALISATIONS}`);
console.log();

const header = `| dist | N | flag: LOW | MOD | HIGH | N/A | meanPMAD | meanMAD | meanSpan |`;
const sep    = `|---|---|---|---|---|---|---|---|---|`;
console.log(header);
console.log(sep);

// For DS21/DS22 reproduction — also record at N=400 "pooled" 2-col case
for (const [distName, gen] of DISTRIBUTIONS) {
  for (const N of N_VALUES) {
    const counts = { LOW: 0, MODERATE: 0, HIGH: 0, 'N/A': 0 };
    let sumPMAD = 0, nPMAD = 0;
    let sumMAD = 0, nMAD = 0;
    let sumSpan = 0, nSpan = 0;
    for (let rep = 0; rep < REALISATIONS; rep++) {
      const orng = makeOuterRNG(distName.charCodeAt(0) * 1000 + N + rep * 100003);
      const vals = gen(N, orng);
      // Matrix: single-column N-row matrix (test flattens anyway)
      const matrix = vals.map(v => [v]);
      const rng = createPRNG(matrix);
      const res = testBenford(matrix, rng);
      counts[res.flag] = (counts[res.flag] || 0) + 1;
      if (res.flag !== 'N/A' && res.primaryP != null) {
        sumPMAD += res.primaryP; nPMAD++;
        sumMAD += parseFloat(res.MAD); nMAD++;
      }
    }
    console.log(`| ${distName} | ${N} | ${counts.LOW} | ${counts.MODERATE} | ${counts.HIGH} | ${counts['N/A']} | ${nPMAD ? (sumPMAD/nPMAD).toFixed(4) : '—'} | ${nMAD ? (sumMAD/nMAD).toFixed(4) : '—'} | — |`);
  }
}

// ──────────────────────────────────────────────────────────────
// DS21 v2 / DS22 reproduction at N=400 — pure N(0,1) replicate cols
// DS21 v2: 400 rows × 8 Rep cols, Control AR in [60,140), else iid N(0,1).
// DS22:    400 rows × 7 Rep cols, covariance block in [80,110) per condition.
// Benford flattens across all cols → N_total ≈ 3200 (DS21) / 2800 (DS22).
// Single-condition isolated test: N=400 with 8 reps of iid N(0,1) flattened.
console.log();
console.log(`# DS21 v2 / DS22 reproduction: pure N(0,1) cross-rep matrix`);
console.log();
console.log(`| scenario | N_rows | n_rep | total vals | flag | pMAD | MAD | span |`);
console.log(`|---|---|---|---|---|---|---|---|`);

for (const [rowsN, nRep, label] of [
  [400, 8, 'DS21-style 400×8 iid N(0,1)'],
  [400, 7, 'DS22-style 400×7 iid N(0,1)'],
  [200, 8, 'DS21 per-condition 200×8 iid N(0,1)'],
  [400, 1, '400×1 single col'],
]) {
  let flagCounts = { LOW: 0, MODERATE: 0, HIGH: 0, 'N/A': 0 };
  let sumP = 0, nP = 0, sumMAD = 0, sumSpan = 0;
  for (let rep = 0; rep < REALISATIONS; rep++) {
    const orng = makeOuterRNG(rowsN * 31 + nRep * 7 + rep * 100003);
    const matrix = [];
    for (let r = 0; r < rowsN; r++) {
      const row = [];
      for (let c = 0; c < nRep; c++) row.push(orng.randn());
      matrix.push(row);
    }
    const rng = createPRNG(matrix);
    const res = testBenford(matrix, rng);
    flagCounts[res.flag] = (flagCounts[res.flag] || 0) + 1;
    if (res.flag !== 'N/A') { sumP += res.primaryP; nP++; sumMAD += parseFloat(res.MAD); }
  }
  const flagLine = `LOW=${flagCounts.LOW} MOD=${flagCounts.MODERATE} HIGH=${flagCounts.HIGH} NA=${flagCounts['N/A']}`;
  console.log(`| ${label} | ${rowsN} | ${nRep} | ${rowsN * nRep} | ${flagLine} | ${nP ? (sumP/nP).toFixed(4) : '—'} | ${nP ? (sumMAD/nP).toFixed(4) : '—'} | — |`);
}

// S109 Part 1 — Target B diagnostic.
// Imports the ACTUAL Excess Kurtosis test from src/tests/kurtosis.js
// and runs it on iid N(0,1) replicate-difference matrices across
// (N_rows, n_rep) cells. Characterises small-sample FP rate.
//
// No test-code modifications. Run: node test/diag-s109-kurtosis.mjs

import { testKurtosis } from '../src/tests/kurtosis.js';
import { createPRNG } from '../src/stats/prng.js';

function makeOuterRNG(seed) {
  let state = seed | 0;
  function random() {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
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

const N_ROWS = [100, 200, 400, 800, 2000];
const N_REP  = [3, 4, 6];
const REALISATIONS = 50;

console.log(`# Target B — Excess Kurtosis small-sample FP diagnostic`);
console.log(`# Code location: src/tests/kurtosis.js line 191.`);
console.log(`#   esGate = pooledN >= 500 && Math.abs(kurtDeviation) < 0.20`);
console.log(`#   DIVERGENCE vs METHODOLOGY.md §2.2: spec also suppresses when κDev > 0`);
console.log(`#   (leptokurtic / biological count data). Code only checks |κDev|<0.20.`);
console.log(`#   No effect-size gate applies at N < 500.`);
console.log(`# Flag ladder: flagFromP(pooledP) — <0.001 HIGH, <0.01 MODERATE, else LOW`);
console.log(`# pooledP = nC <= 3 ? adP : kurtP (line 187)`);
console.log();
console.log(`# iid N(0,1) replicate-difference FP characterisation`);
console.log(`# Realisations per cell: ${REALISATIONS}`);
console.log();

console.log(`| N_rows | n_rep | LOW | MOD | HIGH | meanKurtP | meanAdP | meanPooledP | meanKurtDev | esGateHits |`);
console.log(`|---|---|---|---|---|---|---|---|---|---|`);

for (const nRows of N_ROWS) {
  for (const nRep of N_REP) {
    const counts = { LOW: 0, MODERATE: 0, HIGH: 0, 'N/A': 0 };
    let sumKurtP = 0, sumAdP = 0, sumPooled = 0, sumKDev = 0, nValid = 0;
    let esGateHits = 0;
    for (let rep = 0; rep < REALISATIONS; rep++) {
      const orng = makeOuterRNG(nRows * 1000 + nRep * 37 + rep * 100003);
      const matrix = [];
      for (let r = 0; r < nRows; r++) {
        const row = [];
        for (let c = 0; c < nRep; c++) row.push(orng.randn());
        matrix.push(row);
      }
      const rng = createPRNG(matrix);
      const res = testKurtosis(matrix, null, rng);
      counts[res.flag] = (counts[res.flag] || 0) + 1;
      if (res.flag !== 'N/A' && res._kurtosisP != null) {
        sumKurtP += parseFloat(res._kurtosisP);
        sumAdP += parseFloat(res._andersonDarlingP);
        sumPooled += parseFloat(res.pooledP);
        sumKDev += parseFloat(res.kurtDeviation);
        nValid++;
        const pooledN = res.pooledN || 0;
        const kDev = parseFloat(res.kurtDeviation);
        if (pooledN >= 500 && Math.abs(kDev) < 0.20) esGateHits++;
      }
    }
    const fmt = (n, d) => n ? (d / n).toFixed(4) : '—';
    console.log(`| ${nRows} | ${nRep} | ${counts.LOW} | ${counts.MODERATE} | ${counts.HIGH} | ${fmt(nValid, sumKurtP)} | ${fmt(nValid, sumAdP)} | ${fmt(nValid, sumPooled)} | ${fmt(nValid, sumKDev)} | ${esGateHits} |`);
  }
}

// DS21 v2 / DS22 reproduction — pure iid N(0,1) at N_rows=400, nRep=8 (DS21) or 7 (DS22)
console.log();
console.log(`# DS21 v2 / DS22 reproduction — iid N(0,1) at N_rows=400`);
console.log(`| scenario | n_rep | flag dist | meanPooledP | meanKurtP | meanAdP | meanKDev |`);
console.log(`|---|---|---|---|---|---|---|`);

for (const [nRep, label] of [[8, 'DS21 v2 (400×8)'], [7, 'DS22 (400×7)']]) {
  const counts = { LOW: 0, MODERATE: 0, HIGH: 0, 'N/A': 0 };
  let sumK = 0, sumA = 0, sumP = 0, sumKd = 0, nV = 0;
  for (let rep = 0; rep < REALISATIONS; rep++) {
    const orng = makeOuterRNG(400 * 1000 + nRep * 37 + rep * 100003 + 7777);
    const matrix = [];
    for (let r = 0; r < 400; r++) {
      const row = [];
      for (let c = 0; c < nRep; c++) row.push(orng.randn());
      matrix.push(row);
    }
    const rng = createPRNG(matrix);
    const res = testKurtosis(matrix, null, rng);
    counts[res.flag] = (counts[res.flag] || 0) + 1;
    if (res.flag !== 'N/A') {
      sumK += parseFloat(res._kurtosisP);
      sumA += parseFloat(res._andersonDarlingP);
      sumP += parseFloat(res.pooledP);
      sumKd += parseFloat(res.kurtDeviation);
      nV++;
    }
  }
  const fmt = (n, d) => n ? (d / n).toFixed(4) : '—';
  const flagLine = `LOW=${counts.LOW} MOD=${counts.MODERATE} HIGH=${counts.HIGH}`;
  console.log(`| ${label} | ${nRep} | ${flagLine} | ${fmt(nV, sumP)} | ${fmt(nV, sumK)} | ${fmt(nV, sumA)} | ${fmt(nV, sumKd)} |`);
}

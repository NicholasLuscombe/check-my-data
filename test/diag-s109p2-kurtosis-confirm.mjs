// S109 Part 2 — Kurtosis post-fix confirmation.
// Focused grid: targets the small-N true-FP zone (N=200/nRep=3) and
// adjacent cells, plus DS21/DS22-shape iid baseline.

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

const REALISATIONS = 50;

console.log(`# S109 Part 2 — Kurtosis post-fix confirmation (iid N(0,1))`);
console.log(`# Realisations per cell: ${REALISATIONS}`);
console.log();
console.log(`| N_rows | n_rep | LOW | MOD | HIGH | meanPooledP | meanKurtDev | meanThreshold |`);
console.log(`|---|---|---|---|---|---|---|---|`);

for (const [nRows, nRep] of [
  [100, 3],
  [200, 3],   // true-FP zone, pre-fix was 12/50 HIGH
  [200, 4],
  [200, 8],   // DS21 shape
  [200, 7],   // DS22 shape
  [400, 3],
  [400, 6],
  [800, 3],
]) {
  const counts = { LOW: 0, MODERATE: 0, HIGH: 0, 'N/A': 0 };
  let sumP = 0, sumKd = 0, sumThr = 0, nV = 0;
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
    if (res.flag !== 'N/A') {
      sumP += parseFloat(res.pooledP);
      sumKd += parseFloat(res.kurtDeviation);
      sumThr += parseFloat(res.adaptiveThreshold || 0.20);
      nV++;
    }
  }
  const fmt = (d) => nV ? (d / nV).toFixed(4) : '—';
  console.log(`| ${nRows} | ${nRep} | ${counts.LOW} | ${counts.MODERATE} | ${counts.HIGH} | ${fmt(sumP)} | ${fmt(sumKd)} | ${fmt(sumThr)} |`);
}

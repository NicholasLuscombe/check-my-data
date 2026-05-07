// S109 Part 1 — Target B DS21/DS22 reproduction focused run.
// Pure N(0,1) at N_rows=200 (DS21/DS22 per-group shape) × nRep=8 or 7.
// Confirms that the aggregated per-group flag fires HIGH.

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

console.log(`# DS21 v2 / DS22 Kurtosis reproduction — per-group shape (200 rows × nRep, iid N(0,1))`);
console.log();
console.log(`| scenario | nRep | LOW | MOD | HIGH | meanPooledP | meanKurtP | meanKurtDev | esGateHits |`);
console.log(`|---|---|---|---|---|---|---|---|---|`);

for (const [nRows, nRep, label] of [
  [200, 8, 'DS21 v2 per-group 200×8'],
  [200, 7, 'DS22    per-group 200×7'],
  [400, 8, 'DS21 pooled-both-groups 400×8'],
  [400, 7, 'DS22 pooled-both-groups 400×7'],
  [200, 3, 'small-N control 200×3'],
]) {
  const counts = { LOW: 0, MODERATE: 0, HIGH: 0, 'N/A': 0 };
  let sumP = 0, sumK = 0, sumKd = 0, nV = 0, esHits = 0;
  let maxKDev = 0;
  for (let rep = 0; rep < REALISATIONS; rep++) {
    const orng = makeOuterRNG(nRows * 1000 + nRep * 37 + rep * 100003 + 42);
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
      sumK += parseFloat(res._kurtosisP);
      const kd = parseFloat(res.kurtDeviation);
      sumKd += kd;
      if (Math.abs(kd) > maxKDev) maxKDev = Math.abs(kd);
      nV++;
      if ((res.pooledN || 0) >= 500 && Math.abs(kd) < 0.20) esHits++;
    }
  }
  const fmt = (d) => nV ? (d / nV).toFixed(4) : '—';
  const flagLine = `${counts.LOW} / ${counts.MODERATE} / ${counts.HIGH}`;
  console.log(`| ${label} | ${nRep} | ${counts.LOW} | ${counts.MODERATE} | ${counts.HIGH} | ${fmt(sumP)} | ${fmt(sumK)} | ${fmt(sumKd)} | ${esHits} |`);
}

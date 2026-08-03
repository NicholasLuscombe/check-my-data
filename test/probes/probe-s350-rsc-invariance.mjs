// probe-s350-rsc-invariance.mjs — S350 Part 3.
//
// Measures whether Residual Spike Correlation's test statistic survives a
// within-subject swap of condition values, on a fixture whose subjects really
// are matched across conditions.
//
// The statistic is the maximum pairwise top-K overlap of per-row absolute
// residual magnitude (residualSpikeCorrelation.js:73-110). Three nulls are
// drawn against the same observed value:
//
//   arm 1  shipped        each group's residual vector shuffled independently
//                         across row positions (residualSpikeCorrelation.js:135-154)
//   arm 2  within-subject each subject independently keeps or swaps its two
//                         conditions' residual magnitudes; row positions never move
//   arm 3  all-swap       every subject swapped, once — a determinism check, not a null
//
// Arm 3 must return the observed value exactly: the pair statistic is symmetric
// in the two groups, so swapping every subject relabels the pair and nothing else.
//
// The residual profile is rebuilt here rather than imported, because the test
// module returns only the finished statistic. Lines 47-65 of the module are
// reproduced verbatim in `profileOf` below; the parity block prints the module's
// own nOverlap beside this file's, so a drift shows up as a MISMATCH rather than
// as a quietly wrong percentile.
//
// READ-ONLY on src/. Imports the import chain and the test module; changes nothing.
//
// Usage:  node test/probes/probe-s350-rsc-invariance.mjs
//         FILES=09-proteomics-clean.csv,01-densitometry-clean.csv node test/probes/probe-s350-rsc-invariance.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { testResidualSpikeCorrelation } = await import('../../src/tests/residualSpikeCorrelation.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const FILES = (process.env.FILES || '09-proteomics-clean.csv,17-densitometry-carlisle-clean.csv')
  .split(',').map(s => s.trim()).filter(Boolean);
const N_DRAW = Number(process.env.N_DRAW || 9999);
const SEED   = Number(process.env.SEED || 12345);

// Mulberry32 — same generator family the engine uses, seeded independently here
// so the probe's draws never touch the engine's stream.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const K_FRAC = 0.10;

/** Per-group normalised |residual| profile — residualSpikeCorrelation.js:47-65. */
function profileOf(sliceMatrix, nFeatures) {
  const absRes = [], allAbsRes = [];
  for (let r = 0; r < nFeatures; r++) {
    const vals = sliceMatrix[r].filter(v => v != null && isFinite(v));
    if (vals.length < 2) { absRes.push(null); continue; }
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const mar = vals.reduce((s, v) => s + Math.abs(v - m), 0) / vals.length;
    absRes.push(mar);
    allAbsRes.push(mar);
  }
  const mRes = allAbsRes.length > 0 ? allAbsRes.reduce((a, b) => a + b, 0) / allAbsRes.length : 1;
  const sdRes = allAbsRes.length > 1
    ? Math.sqrt(allAbsRes.reduce((s2, v) => s2 + (v - mRes) ** 2, 0) / (allAbsRes.length - 1))
    : 1;
  return absRes.map(v => v != null ? (v - mRes) / (sdRes || 1) : null);
}

/** Top-K mask over a value vector, nulls sunk to -Infinity — module lines 84-91. */
function topKMask(vec, K) {
  const n = vec.length;
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => (vec[b] ?? -Infinity) - (vec[a] ?? -Infinity));
  const mask = new Uint8Array(n);
  for (let k = 0; k < K; k++) mask[idx[k]] = 1;
  return mask;
}

/** Max pairwise top-K overlap across all group pairs — module lines 93-108. */
function maxOverlap(vectors, K) {
  const masks = vectors.map(v => topKMask(v, K));
  let best = 0;
  for (let i = 0; i < masks.length; i++) {
    for (let j = i + 1; j < masks.length; j++) {
      let ov = 0;
      for (let r = 0; r < masks[i].length; r++) if (masks[i][r] && masks[j][r]) ov++;
      if (ov > best) best = ov;
    }
  }
  return best;
}

function summarise(draws, observed) {
  const sorted = [...draws].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = draws.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(draws.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1));
  const distinct = new Set(draws).size;
  const nGE = draws.filter(d => d >= observed).length;
  return {
    min: sorted[0],
    max: sorted[n - 1],
    median: n % 2 ? sorted[(n - 1) / 2] : 0.5 * (sorted[n / 2 - 1] + sorted[n / 2]),
    mean, sd, distinct,
    pUpper: (nGE + 1) / (n + 1),
  };
}

const fmt = (x, d = 4) => Number.isFinite(x) ? x.toFixed(d) : String(x);

console.log('S350 Part 3 — Residual Spike Correlation under a within-subject swap');
console.log(`${N_DRAW} draws per arm, probe seed ${SEED}. Statistic = max pairwise top-K overlap.\n`);

for (const file of FILES) {
  const assay = EXPECTED[file]?.assay ?? '(not in EXPECTED)';
  const text = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(text, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

  // Same matrix the engine hands the test (engine.js:280-290, 416-417).
  const vst = detectVST(matrix, EXPECTED[file]?.assay);
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') {
    vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  } else if (vstType === 'anscombe') {
    vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  }
  const hasVST = vstMatrix !== null;
  const m = hasVST ? vstMatrix : matrix;
  const ctx = hasVST ? condCtx.withMatrix(m) : condCtx;

  const slices = ctx.slices();
  const nFeatures = Math.min(...slices.map(s => s.matrix.length));
  const nG = slices.length;
  const K = Math.max(5, Math.floor(nFeatures * K_FRAC));

  console.log(`── ${file}  (${matrix.length} x ${matrix[0]?.length ?? 0} data, ${assay}) ──`);
  console.log(`   VST ${vstType}; ${nG} condition(s): ${slices.map(s => `${s.name}(${s.matrix.length})`).join(', ')}`);
  console.log(`   nFeatures ${nFeatures}, K ${K}`);

  const profiles = slices.map(s => profileOf(s.matrix, nFeatures));
  const observed = maxOverlap(profiles, K);

  // Parity against the shipped module's own statistic.
  const rng0 = mulberry32(1);
  const shipped = testResidualSpikeCorrelation(m, ctx, { random: rng0 });
  const parity = shipped.nOverlap === observed ? 'MATCH' : 'MISMATCH';
  // The module is called on a probe-owned stream, not the engine's, so its permP
  // is the shipped SHAPE (999 draws, within-group shuffle) rather than the batch
  // value. The arm 1 / arm 2 contrast below is the comparison that carries weight.
  console.log(`   observed overlap ${observed} of ${K}; module nOverlap ${shipped.nOverlap} -> ${parity}` +
    `; module permP ${shipped.permP} flag ${shipped.flag} (probe stream, 999 draws)`);
  if (parity === 'MISMATCH') {
    console.log('   HALTING this fixture — the rebuilt profile does not reproduce the module.\n');
    continue;
  }

  // Membership spread of the observed data: how many subjects sit in the top-K
  // of exactly 1, 2, ... nG conditions. This is what decides whether a
  // within-subject relabel can move the statistic. A subject extreme in EVERY
  // condition stays extreme in every condition under any relabel, so it holds
  // its overlap contribution; a subject extreme in only some conditions has its
  // contribution scattered across the pairs.
  {
    const masks = profiles.map(v => topKMask(v, K));
    const spread = new Array(nG + 1).fill(0);
    for (let r = 0; r < nFeatures; r++) {
      let c = 0;
      for (let g = 0; g < nG; g++) if (masks[g][r]) c++;
      spread[c]++;
    }
    console.log(`   observed top-K membership: ${spread.map((n, c) => `${c} cond ${n}`).slice(1).join(', ')}` +
      ` (of ${nFeatures} subjects; ${spread[0]} in none)`);
  }

  const rng = mulberry32(SEED);

  // ── arm 1 — shipped null: independent within-group position shuffle ──
  const arm1 = [];
  for (let p = 0; p < N_DRAW; p++) {
    const shuffled = profiles.map(prof => {
      const v = prof.slice();
      for (let i = v.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = v[i]; v[i] = v[j]; v[j] = t;
      }
      return v;
    });
    arm1.push(maxOverlap(shuffled, K));
  }

  // ── arm 2 — within-subject permutation of the condition labels ──
  // Each subject independently permutes its own nG values across the groups.
  // Row positions never move; only which condition holds which of the subject's
  // own values. At nG = 2 this is swap-or-keep.
  const arm2 = [];
  let movedCounts = 0;
  for (let p = 0; p < N_DRAW; p++) {
    const cols = profiles.map(prof => prof.slice());
    let nMoved = 0;
    const perm = new Array(nG);
    for (let r = 0; r < nFeatures; r++) {
      for (let g = 0; g < nG; g++) perm[g] = g;
      for (let i = nG - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
      }
      const vals = profiles.map(prof => prof[r]);
      for (let g = 0; g < nG; g++) cols[g][r] = vals[perm[g]];
      if (perm.some((v, g) => v !== g)) nMoved++;
    }
    movedCounts += nMoved;
    arm2.push(maxOverlap(cols, K));
  }

  // ── arm 3 — one global cyclic relabel of the groups. Determinism check. ──
  // The max-pairwise statistic is symmetric under a relabelling of the groups,
  // so applying the SAME permutation to every subject must return the observed
  // value. A mismatch means the statistic is not what this probe thinks it is.
  const arm3 = maxOverlap(profiles.map((_, g) => profiles[(g + 1) % nG].slice()), K);

  const s1 = summarise(arm1, observed);
  const s2 = summarise(arm2, observed);

  console.log(`   arm 1  shipped         min ${s1.min}  median ${s1.median}  max ${s1.max}  ` +
    `mean ${fmt(s1.mean, 3)}  sd ${fmt(s1.sd, 3)}  distinct ${s1.distinct}  p(upper) ${fmt(s1.pUpper)}`);
  console.log(`   arm 2  within-subject  min ${s2.min}  median ${s2.median}  max ${s2.max}  ` +
    `mean ${fmt(s2.mean, 3)}  sd ${fmt(s2.sd, 3)}  distinct ${s2.distinct}  p(upper) ${fmt(s2.pUpper)}`);
  console.log(`   arm 3  global relabel   ${arm3}  ${arm3 === observed ? '= observed (symmetry holds)' : '!= observed — CHECK'}`);
  console.log(`   arm 2 mean subjects moved per draw: ${fmt(movedCounts / N_DRAW, 1)} of ${nFeatures}`);

  const invariant = s2.distinct === 1 && arm2[0] === observed;
  console.log(`   verdict: arm 2 is ${invariant ? 'DEGENERATE — statistic invariant under the swap' :
    `non-degenerate (${s2.distinct} distinct values, sd ${fmt(s2.sd, 3)}) — statistic NOT invariant`}`);
  console.log('');
}

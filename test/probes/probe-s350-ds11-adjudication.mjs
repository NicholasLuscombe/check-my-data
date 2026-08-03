// probe-s350-ds11-adjudication.mjs — S350 Part 4.
//
// Asks whether Residual Spike Correlation's evidence on DS11 lies inside the
// mechanism the fixture generator actually planted.
//
// The planted set is NOT taken from engine output. It comes from
// generate-test-datasets.py, whose gen_rnaseq_multicondition() prints its own
// targets and whose output for this fixture is byte-identical to the shipped
// one (md5 e431e36e7b632ae08c1750efb3b90cf6 both sides). Two flaws are planted:
//
//   flaw 1  20 genes carry a correlated residual spike — one replicate position
//           is chosen per gene and multiplied by (1 + magnitude * 0.3) in ALL
//           THREE conditions, same position and same magnitude each time.
//           This is RSC's target.
//   flaw 2  30 other genes get an inflated fold-change in CondB only. That
//           scales the condition mean, so under the log VST it is a shift and
//           the row-centred residuals are unchanged. Expected to be invisible
//           to RSC; the probe checks rather than assumes.
//
// The hardcoded index lists are cross-checked structurally against the fixture
// before they are used. A flaw-1 gene shares one replicate's spike across all
// three conditions, so its per-replicate row-centred residual vectors should
// correlate across conditions; an unplanted gene's should not. The probe
// measures both rates and halts if the planted rate is not clearly separated
// from the unplanted one, rather than building a table on the wrong set.
//
// The spike is not always the largest residual — a 1.6x to 2.2x multiplier is
// 0.47 to 0.79 on the log scale against a noise sd of 0.25, so roughly two to
// three sigma over four replicates. The correlation check tolerates that; an
// argmax-agreement check does not, and is reported alongside as context only.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY on src/. Imports the import chain and nothing else.
//
// Usage:  node test/probes/probe-s350-ds11-adjudication.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { testResidualSpikeCorrelation } = await import('../../src/tests/residualSpikeCorrelation.js');

const FILE = '11-rnaseq-multicondition.csv';
const ASSAY = 'genomics';

// Verbatim from `python3 generate-test-datasets.py`, 0-indexed gene numbers.
const FLAW1_SPIKE = [7, 54, 61, 73, 83, 101, 105, 118, 177, 211, 239, 241, 342, 353, 393, 416, 423, 427, 458, 491];
const FLAW2_FC_CONDB = [37, 46, 52, 69, 102, 126, 129, 130, 139, 144, 174, 179, 185, 191, 197, 202, 221, 270, 285, 324, 330, 356, 357, 367, 379, 389, 413, 432, 438, 471];

const K_FRAC = 0.10;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
  const mRes = allAbsRes.reduce((a, b) => a + b, 0) / (allAbsRes.length || 1);
  const sdRes = allAbsRes.length > 1
    ? Math.sqrt(allAbsRes.reduce((s2, v) => s2 + (v - mRes) ** 2, 0) / (allAbsRes.length - 1))
    : 1;
  return absRes.map(v => v != null ? (v - mRes) / (sdRes || 1) : null);
}

function topKMask(vec, K) {
  const idx = Array.from({ length: vec.length }, (_, i) => i);
  idx.sort((a, b) => (vec[b] ?? -Infinity) - (vec[a] ?? -Infinity));
  const mask = new Uint8Array(vec.length);
  for (let k = 0; k < K; k++) mask[idx[k]] = 1;
  return mask;
}

// ── Load the fixture the way the engine does ────────────────────────────
const text = readFileSync(join('test/fixtures', FILE), 'utf-8');
const parsed = Papa.default.parse(text, { skipEmptyLines: true });
const raw = preprocessRaw(parsed.data).rows;
const headerRows = detectHeaderRows(raw);
const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

const vst = detectVST(matrix, ASSAY);
const vstType = vst?.transform || 'raw';
let vstMatrix = null;
if (vstType === 'log') vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
else if (vstType === 'anscombe') vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
const hasVST = vstMatrix !== null;
const m = hasVST ? vstMatrix : matrix;
const ctx = hasVST ? condCtx.withMatrix(m) : condCtx;

const slices = ctx.slices();
const nG = slices.length;
const nFeatures = Math.min(...slices.map(s => s.matrix.length));
const K = Math.max(5, Math.floor(nFeatures * K_FRAC));

console.log(`S350 Part 4 — DS11 adjudication inside the planted region`);
console.log(`${FILE}: ${matrix.length} x ${matrix[0].length} data, VST ${vstType}`);
console.log(`conditions: ${slices.map(s => `${s.name}(${s.matrix.length})`).join(', ')}; nFeatures ${nFeatures}, K ${K}\n`);

// ── Structural cross-check of the planted list against the fixture ──────
// A flaw-1 gene has one replicate multiplied by the same factor in all three
// conditions, so on the log scale its largest |row-centred residual| should sit
// at the same replicate position in every condition. Check that before using
// the list for anything.
function argmaxAbsResidRep(row) {
  const vals = row.filter(v => v != null && isFinite(v));
  if (vals.length < 2) return -1;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  let best = -1, bestAbs = -Infinity;
  for (let c = 0; c < row.length; c++) {
    const v = row[c];
    if (v == null || !isFinite(v)) continue;
    const a = Math.abs(v - mean);
    if (a > bestAbs) { bestAbs = a; best = c; }
  }
  return best;
}
/** Row-centred residual vector of one slice row, nulls dropped by position. */
function residVec(row) {
  const vals = row.filter(v => v != null && isFinite(v));
  if (vals.length < 2) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return row.map(v => (v == null || !isFinite(v)) ? null : v - mean);
}
function pearson(a, b) {
  const xs = [], ys = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] != null && b[i] != null) { xs.push(a[i]); ys.push(b[i]); }
  }
  if (xs.length < 3) return NaN;
  const mx = xs.reduce((p, q) => p + q, 0) / xs.length;
  const my = ys.reduce((p, q) => p + q, 0) / ys.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  const d = Math.sqrt(sxx * syy);
  return d > 1e-20 ? sxy / d : NaN;
}
/** Mean pairwise correlation of a gene's residual vectors across conditions. */
function crossCondResidCorr(g) {
  const vecs = slices.map(s => residVec(s.matrix[g]));
  const rs = [];
  for (let i = 0; i < nG; i++) {
    for (let j = i + 1; j < nG; j++) {
      if (!vecs[i] || !vecs[j]) continue;
      const r = pearson(vecs[i], vecs[j]);
      if (isFinite(r)) rs.push(r);
    }
  }
  return rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : NaN;
}

const plantedSetForCheck = new Set(FLAW1_SPIKE);
const unplanted = [];
for (let g = 0; g < nFeatures; g++) {
  if (!plantedSetForCheck.has(g) && !FLAW2_FC_CONDB.includes(g)) unplanted.push(g);
}
const corrPlanted = FLAW1_SPIKE.map(crossCondResidCorr).filter(isFinite);
const corrUnplanted = unplanted.map(crossCondResidCorr).filter(isFinite);
const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length;
const share = (a, t) => a.filter(v => v > t).length / a.length;

let agree = 0, agreeControl = 0;
for (const g of FLAW1_SPIKE) {
  const reps = slices.map(s => argmaxAbsResidRep(s.matrix[g]));
  if (reps.every(r => r === reps[0] && r >= 0)) agree++;
}
for (const g of unplanted) {
  const reps = slices.map(s => argmaxAbsResidRep(s.matrix[g]));
  if (reps.every(r => r === reps[0] && r >= 0)) agreeControl++;
}

console.log('cross-check: does the hardcoded flaw-1 list correspond to this fixture?');
console.log(`   mean cross-condition residual correlation — planted ${mean(corrPlanted).toFixed(3)}` +
  ` (n=${corrPlanted.length}), unplanted ${mean(corrUnplanted).toFixed(3)} (n=${corrUnplanted.length})`);
console.log(`   share with correlation > 0.5 — planted ${(share(corrPlanted, 0.5) * 100).toFixed(0)}%,` +
  ` unplanted ${(share(corrUnplanted, 0.5) * 100).toFixed(0)}%`);
console.log(`   context: same argmax-|residual| replicate in all ${nG} conditions —` +
  ` planted ${agree}/${FLAW1_SPIKE.length}, unplanted ${agreeControl}/${unplanted.length}` +
  ` (chance ${(100 / 16).toFixed(1)}%)`);
if (!(mean(corrPlanted) > 0.3 && mean(corrPlanted) > mean(corrUnplanted) + 0.25)) {
  console.log('\nHALT — the hardcoded flaw-1 list is not separated from the background. Table not built.');
  process.exit(1);
}
console.log('   -> list corresponds to the fixture.\n');

// ── Top-K membership per gene ───────────────────────────────────────────
const profiles = slices.map(s => profileOf(s.matrix, nFeatures));
const masks = profiles.map(v => topKMask(v, K));
const memberCount = new Array(nFeatures).fill(0);
const memberConds = new Array(nFeatures).fill(null).map(() => []);
for (let r = 0; r < nFeatures; r++) {
  for (let g = 0; g < nG; g++) if (masks[g][r]) { memberCount[r]++; memberConds[r].push(slices[g].name); }
}

const planted = new Set(FLAW1_SPIKE);
const fcSet = new Set(FLAW2_FC_CONDB);

function tally(pred) {
  let inP = 0, outP = 0;
  for (let r = 0; r < nFeatures; r++) {
    if (!pred(r)) continue;
    if (planted.has(r)) inP++; else outP++;
  }
  return { inP, outP };
}
const rAll    = tally(r => memberCount[r] === nG);
const rSubset = tally(r => memberCount[r] > 0 && memberCount[r] < nG);
const rNone   = tally(r => memberCount[r] === 0);

console.log('Contingency over all 500 genes — planted set is flaw 1 (20 correlated-spike genes)\n');
console.log('|                                              | in the planted set | not in the planted set |');
console.log('|---|---|---|');
console.log(`| in the top-K of all ${nG} conditions            | ${rAll.inP} | ${rAll.outP} |`);
console.log(`| in the top-K of a proper subset of conditions | ${rSubset.inP} | ${rSubset.outP} |`);
console.log(`| in no top-K                                  | ${rNone.inP} | ${rNone.outP} |`);
console.log(`| total                                        | ${rAll.inP + rSubset.inP + rNone.inP} | ${rAll.outP + rSubset.outP + rNone.outP} |\n`);

// ── The statistic's own evidence: the best pair and its overlap set ─────
let best = null;
for (let i = 0; i < nG; i++) {
  for (let j = i + 1; j < nG; j++) {
    let ov = 0;
    const rows = [];
    for (let r = 0; r < nFeatures; r++) if (masks[i][r] && masks[j][r]) { ov++; rows.push(r); }
    if (!best || ov > best.ov) best = { i, j, ov, rows };
  }
}
const bestAll3 = best.rows.filter(r => memberCount[r] === nG);
const bestPairOnly = best.rows.filter(r => memberCount[r] < nG);

const shipped = testResidualSpikeCorrelation(m, ctx, { random: mulberry32(1) });
console.log(`RSC statistic: best pair ${slices[best.i].name} vs ${slices[best.j].name}, overlap ${best.ov} of K=${K}` +
  ` (module nOverlap ${shipped.nOverlap} -> ${shipped.nOverlap === best.ov ? 'MATCH' : 'MISMATCH'})`);
console.log(`   decomposition: ${bestAll3.length} in all ${nG} conditions + ${bestPairOnly.length} in this pair only = ${best.ov}`);

const inP = (arr) => arr.filter(r => planted.has(r));
console.log(`\n   the ${bestAll3.length} genes extreme in all ${nG} conditions:`);
console.log(`      indices (0-idx): ${bestAll3.join(', ')}`);
console.log(`      in the planted set: ${inP(bestAll3).length}/${bestAll3.length}` +
  (inP(bestAll3).length ? ` -> ${inP(bestAll3).join(', ')}` : ''));
console.log(`   the ${bestPairOnly.length} genes extreme in this pair only:`);
console.log(`      indices (0-idx): ${bestPairOnly.join(', ')}`);
console.log(`      in the planted set: ${inP(bestPairOnly).length}/${bestPairOnly.length}` +
  (inP(bestPairOnly).length ? ` -> ${inP(bestPairOnly).join(', ')}` : ''));

// ── Where did the 20 planted genes actually land? ───────────────────────
console.log(`\nWhere the ${FLAW1_SPIKE.length} planted flaw-1 genes landed:`);
const byCount = new Array(nG + 1).fill(0);
for (const g of FLAW1_SPIKE) byCount[memberCount[g]]++;
for (let c = nG; c >= 0; c--) console.log(`   in ${c} condition(s): ${byCount[c]}`);
console.log(`   per gene: ${FLAW1_SPIKE.map(g => `${g}:${memberCount[g]}`).join(' ')}`);

// ── Flaw 2 control: fold-change genes should be invisible under log VST ─
console.log(`\nFlaw 2 control — ${FLAW2_FC_CONDB.length} genes with inflated CondB fold-change:`);
const fcByCount = new Array(nG + 1).fill(0);
for (const g of FLAW2_FC_CONDB) fcByCount[memberCount[g]]++;
for (let c = nG; c >= 0; c--) console.log(`   in ${c} condition(s): ${fcByCount[c]}`);
const baseRate = (rAll.outP + rSubset.outP) / (nFeatures - planted.size - fcSet.size);
console.log(`   background rate of any top-K membership among unplanted genes: ${(baseRate * 100).toFixed(1)}%`);

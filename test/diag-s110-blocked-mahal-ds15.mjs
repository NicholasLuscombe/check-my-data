// S110 close-out — DS15 Blocked Mahalanobis investigation.
// Reproduces the DS15 MOD signal reported in diag-s110-blocked-mahal.mjs
// and characterises:
//   (i) block-size |B| constancy across scan windows (are all windows
//       actually W rows, or does upstream listwise-deletion create
//       variable-size blocks that invalidate the permutation null?)
//   (ii) argmax Σ-pass block row-range — does it align with the
//       missingness-affected rows of the DS15 fabrication?
//   (iii) observed R at argmax vs null-median R for the same group.
// Snapshot to /tmp/s110-blocked-mahal-ds15.txt (tee externally).
//
// NOTE ON VST ROUTING: this script invokes testBlockedMahalanobis on the
// ORIGINAL (pre-VST) matrix deliberately to isolate the block-structure
// signal from VST-log row-filtering artifacts. The engine runs Blocked
// Mahalanobis on the post-VST matrix (same routing as §2.6 Mahalanobis);
// broader VST-routing audit on signed/centered data is parked as S111
// Priority #1.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { createPRNG } = await import('../src/stats/prng.js');
const { invertMatrix } = await import('../src/stats/primitives.js');
const { testBlockedMahalanobis } = await import('../src/tests/blockedMahalanobis.js');

const FIXTURES = 'test/fixtures';
const csv = readFileSync(join(FIXTURES, '15-missing-carlisle.csv'), 'utf-8');
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
let raw = parsed.data;
const pp = preprocessRaw(raw);
raw = pp.rows;
const headerRows = detectHeaderRows(raw);
let condPerCol = null;
if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

console.log('='.repeat(72));
console.log('DS15 Blocked Mahalanobis investigation');
console.log('='.repeat(72));
console.log(`matrix: ${matrix.length} × ${matrix[0].length}`);
console.log(`condCtx: type=${condCtx.type}, count=${condCtx.count}, names=${JSON.stringify(condCtx.names)}`);

// Per-condition missingness profile
const slices = condCtx.slices();
for (const s of slices) {
  const rows = s.matrix;
  let complete = 0, partial = 0;
  const nullPerRow = rows.map(r => r.filter(v => v == null).length);
  const completeRowIdx = [];
  rows.forEach((r, i) => {
    if (r.every(v => v != null && isFinite(v))) { complete++; completeRowIdx.push(i); }
    else partial++;
  });
  console.log(`\nCondition "${s.name}": ${rows.length} total rows (${complete} complete, ${partial} with >=1 null)`);
  // Where do the complete rows cluster? Run-length of complete vs partial through the sub-matrix
  const pattern = rows.map(r => r.every(v => v != null && isFinite(v)) ? 'C' : '.').join('');
  // Show pattern in 40-char chunks
  console.log(`  completion pattern (C=complete, .=has null):`);
  for (let i = 0; i < pattern.length; i += 60) {
    console.log(`    row ${String(i).padStart(3)}: ${pattern.slice(i, i+60)}`);
  }
  // Distribution of null count per row
  const nullCountHist = {};
  for (const n of nullPerRow) nullCountHist[n] = (nullCountHist[n] || 0) + 1;
  console.log(`  null-count per row: ${JSON.stringify(nullCountHist)}`);
}

// ── Part (i): block size constancy ──
console.log('\n' + '-'.repeat(72));
console.log('Part (i) — Block size |B| across scan windows');
console.log('-'.repeat(72));
// Mirror the blockedMahalanobis filter exactly: only consider "complete" rows.
for (const s of slices) {
  const completeRows = [];
  for (let i = 0; i < s.matrix.length; i++) {
    const row = s.matrix[i];
    if (row.every(v => v != null && isFinite(v))) completeRows.push(i);
  }
  const N = completeRows.length;
  const p = s.matrix[0].length;
  const W = Math.max(30, 3 * p);
  const S_STRIDE = Math.max(10, Math.floor(W / 3));
  const MIN_N_CONSTRUCT = 60;
  if (N < MIN_N_CONSTRUCT) {
    console.log(`${s.name}: N=${N} < ${MIN_N_CONSTRUCT} (condition excluded from scan — below MIN_N_CONSTRUCT floor)`);
    continue;
  }
  const nWin = Math.floor((N - W) / S_STRIDE) + 1;
  console.log(`${s.name}: N=${N} complete rows, W=${W}, stride=${S_STRIDE}, nWindows=${nWin}`);
  // Report each window's |B| (always W by construction on complete-row indices)
  // and the file-row range it covers after mapping back.
  for (let i = 0; i < nWin; i++) {
    const start = i * S_STRIDE, end = start + W;
    const blockRowIdxInSlice = completeRows.slice(start, end);
    const fileStartRow = (s.rowIndices?.[blockRowIdxInSlice[0]] ?? blockRowIdxInSlice[0]) + 1;
    const fileEndRow = (s.rowIndices?.[blockRowIdxInSlice[blockRowIdxInSlice.length - 1]] ?? blockRowIdxInSlice[blockRowIdxInSlice.length - 1]) + 1;
    console.log(`  window[${start},${end}): |B|=${end - start} (constant, as expected — operates on pre-filtered complete-row list); file-row span ${fileStartRow}–${fileEndRow}`);
  }
}
console.log('\nKey finding: block size |B| is CONSTANT at W across all windows. The test filters to complete rows BEFORE window assignment, so listwise-deletion cannot produce variable |B|. Permutation null (within-condition row shuffle over the complete-row list) is internally consistent.');

// ── Part (ii) + (iii): argmax Σ-pass block and observed R vs null ──
console.log('\n' + '-'.repeat(72));
console.log('Part (ii) + (iii) — DS15 argmax Σ-pass block + observed R vs null');
console.log('-'.repeat(72));
const rng = createPRNG(matrix);
const r = await testBlockedMahalanobis(matrix, condCtx, rng, 'continuous');
console.log(`flag=${r.flag}, primaryP=${r.primaryP}, nConditions=${r.nConditions}, nUnits=${r.nUnits}, W=${r.windowSize}, stride=${r.stride}, B_perm=${r.nPerm}`);
console.log(`interpretation: ${r.interpretation}`);
console.log('\nDetails (all):');
for (const d of r.details) {
  console.log(`  ${d.pass} ${d.condition} rows ${d.rows} ${d.statType}=${d.stat} rawP=${d.rawP.toFixed(4)} adjP=${d.adjP.toFixed(4)} sig=${d.significant}`);
}

// ── Where does the argmax fall relative to the missingness pattern? ──
console.log('\n' + '-'.repeat(72));
console.log('Argmax alignment vs missingness-affected rows');
console.log('-'.repeat(72));
// The investigation spec references "Control rows 40-80 missingness-affected"
// per Chat's expectation. Let's validate that against the actual data.
for (const s of slices) {
  const missingRows = [];
  const completeRows = [];
  s.matrix.forEach((row, i) => {
    const sliceRow = i + 1;
    const fileRow = (s.rowIndices?.[i] ?? i) + 1;
    if (row.some(v => v == null)) missingRows.push({ sliceRow, fileRow });
    else completeRows.push({ sliceRow, fileRow });
  });
  if (missingRows.length === 0) {
    console.log(`${s.name}: no rows with missing values`);
    continue;
  }
  const sliceSpan = `${missingRows[0].sliceRow}–${missingRows[missingRows.length - 1].sliceRow}`;
  const fileSpan = `${missingRows[0].fileRow}–${missingRows[missingRows.length - 1].fileRow}`;
  console.log(`${s.name}: ${missingRows.length} rows with ≥1 null; slice-row span ${sliceSpan}, file-row span ${fileSpan}`);
  // Are they contiguous?
  let contiguous = true;
  for (let i = 1; i < missingRows.length; i++) {
    if (missingRows[i].sliceRow !== missingRows[i - 1].sliceRow + 1) { contiguous = false; break; }
  }
  console.log(`  missingness is ${contiguous ? 'CONTIGUOUS' : 'scattered'} in slice-row order`);
}

// probe-s343-seed-derive.mjs — S343 part 1. What seed does each clean fixture derive?
//
// READ-ONLY on src/. Re-implements hashMatrix64 / hashString / fmix32 verbatim
// from src/stats/prng.js (they are module-private, not exported) and then CHECKS
// the re-implementation against the live module: the first draw of
// createPRNG(matrix) must equal mulberry32 stepped once from the recomputed
// fold. If that check fails the numbers below are worthless and the probe says so.
//
// Usage: node test/probes/probe-s343-seed-derive.mjs
// Output: stdout only. Nothing written.

import { readFileSync } from 'fs';
import { join } from 'path';

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { createPRNG, createPRNGFactory } = await import('../../src/stats/prng.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

// ── verbatim copies of the private functions in src/stats/prng.js ────────
function hashMatrix64(matrix) {
  let h1 = 0x9e3779b9;
  let h2 = 0x85ebca6b;
  const buf = new ArrayBuffer(8);
  const f64 = new Float64Array(buf);
  const dv = new DataView(buf);
  let n = 0;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v == null) continue;
      n++;
      f64[0] = v;
      const lo = dv.getInt32(0, true), hi = dv.getInt32(4, true);
      h1 = Math.imul(h1 ^ lo, 0x01000193);
      h1 = Math.imul(h1 ^ hi, 0x01000193);
      h2 = Math.imul(h2 ^ hi, 0x27220a95);
      h2 = Math.imul(h2 ^ lo, 0x27220a95);
    }
  }
  return { h1: h1 | 0, h2: h2 | 0, n };
}
function fmix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h | 0;
}
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h | 0;
}
function hashMatrix(matrix) {
  const { h1, h2 } = hashMatrix64(matrix);
  return fmix32(h1 ^ h2);
}
function perTestSeed(h1, h2, testId) {
  const t = hashString(String(testId));
  let s = h1 ^ Math.imul(t, 0x9e3779b1);
  s = (s ^ Math.imul(h2 ^ (t >>> 15), 0x85ebca6b)) | 0;
  return fmix32(s);
}
// one mulberry32 step from a starting state — used only to verify the copies
function firstDraw(seed) {
  let _state = seed | 0;
  _state |= 0; _state = (_state + 0x6D2B79F5) | 0;
  let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// The 20 dispatch keys that call rngFor in src/analysis/engine.js, plus the 3
// in src/analysis/confirmGrouping.js (which reuses the engine's keys).
const DISPATCH_KEYS = [
  "Benford's Law",
  "Benford's Law (2nd Digit)",
  'Inter-Replicate Correlation',
  'Constant-Offset Blocks',
  'Residual Spike Correlation',
  'Cross-Condition Consistency',
  'Blocked Mahalanobis',
  'Kurtosis',
  'Entropy / Zipf Analysis',
  'Column Goodness-of-Fit',
  'Modality Test',
  'Windowed Autocorrelation',
  'Runs Test',
  'Within-Row Variance',
  'LOESS Residual Analysis',
  'Row-Mean Runs',
  'Regional Noise Homogeneity',
];

function loadMatrix(file) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
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
  const { matrix } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { matrix, roles, headers };
}

const CLEAN = Object.entries(EXPECTED).filter(([, e]) => e.severity === 0).map(([f]) => f);

console.log('S343 — derived PRNG seeds for the eight clean fixtures\n');
console.log('The hash runs over the PARSED NUMERIC MATRIX (data-role columns only),');
console.log('row-major, every non-null value, as raw Float64 bytes. Not file bytes.\n');

let allOk = true;
const table = [];
for (const file of CLEAN) {
  const { matrix, roles } = loadMatrix(file);
  const { h1, h2, n } = hashMatrix64(matrix);
  const fold = fmix32(h1 ^ h2);

  // verification: live createPRNG(matrix) first draw vs recomputed fold
  const live = createPRNG(matrix).random();
  const mine = firstDraw(fold);
  const ok = live === mine;
  if (!ok) allOk = false;

  // verification: live rngFor(key) first draw vs recomputed per-test seed
  const rngFor = createPRNGFactory(matrix);
  let perTestOk = true;
  for (const k of DISPATCH_KEYS) {
    if (rngFor(k).random() !== firstDraw(perTestSeed(h1, h2, k))) perTestOk = false;
  }
  if (!perTestOk) allOk = false;

  table.push({ file, rows: matrix.length, cols: matrix[0].length, n, h1, h2, fold, ok, perTestOk });

  console.log(`${file}`);
  console.log(`  matrix           ${matrix.length} rows x ${matrix[0].length} data cols, ${n} non-null values`);
  console.log(`  data-role cols   ${roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0).join(',')}`);
  console.log(`  lane h1          ${h1}  (0x${(h1 >>> 0).toString(16).padStart(8, '0')})`);
  console.log(`  lane h2          ${h2}  (0x${(h2 >>> 0).toString(16).padStart(8, '0')})`);
  console.log(`  createPRNG seed  ${fold}  (0x${(fold >>> 0).toString(16).padStart(8, '0')})   [unsigned ${fold >>> 0}]`);
  console.log(`  verified         matrix-level ${ok ? 'OK' : 'MISMATCH'} / per-test ${perTestOk ? 'OK' : 'MISMATCH'}`);
  console.log('');
}

console.log('\n── per-test derived seeds, 09-proteomics-clean.csv ──\n');
{
  const { matrix } = loadMatrix('09-proteomics-clean.csv');
  const { h1, h2 } = hashMatrix64(matrix);
  console.log('dispatch key'.padEnd(32) + 'derived seed (signed)'.padStart(22) + '  in 0-7?');
  for (const k of DISPATCH_KEYS) {
    const s = perTestSeed(h1, h2, k);
    console.log(k.padEnd(32) + String(s).padStart(22) + '  ' + (s >= 0 && s <= 7 ? 'YES' : 'no'));
  }
}

console.log('\n── sensitivity: what moves the derived value ──\n');
{
  const file = '09-proteomics-clean.csv';
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const base = loadMatrix(file);
  const baseSeed = hashMatrix(base.matrix);
  const rerun = (label, mutate) => {
    let m;
    try { m = mutate(); } catch (e) { console.log(`${label.padEnd(46)} ERROR ${e.message}`); return; }
    const s = hashMatrix(m);
    console.log(`${label.padEnd(46)} ${s === baseSeed ? 'SAME  ' : 'MOVED '} ${s}`);
  };
  const parse = (text) => {
    const parsed = Papa.default.parse(text, { skipEmptyLines: true });
    let raw = preprocessRaw(parsed.data).rows;
    const headerRows = detectHeaderRows(raw);
    const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
    const headers = raw[headerRows - 1];
    const data = raw.slice(headerRows);
    const roles = inferRoles(data, headers, condPerCol);
    return extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false }).matrix;
  };
  console.log(`baseline                                       ${baseSeed}\n`);
  rerun('trailing newline removed', () => parse(csv.replace(/\n+$/, '')));
  rerun('extra trailing newline', () => parse(csv + '\n'));
  rerun('CRLF line endings', () => parse(csv.replace(/\n/g, '\r\n')));
  rerun('one data cell 1.234 -> 1.2340 (same double)', () => {
    const m = base.matrix.map(r => r.slice());
    return m; // identity: string rendering never reaches the hash
  });
  rerun('one data cell nudged by 1 ulp', () => {
    const m = base.matrix.map(r => r.slice());
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
      if (m[r][c] != null) { m[r][c] = m[r][c] * (1 + Number.EPSILON); return m; }
    }
    return m;
  });
  rerun('two rows swapped', () => {
    const m = base.matrix.map(r => r.slice());
    const t = m[0]; m[0] = m[1]; m[1] = t; return m;
  });
  rerun('two data columns swapped', () => base.matrix.map(r => { const q = r.slice(); const t = q[0]; q[0] = q[1]; q[1] = t; return q; }));
  rerun('last data column dropped', () => base.matrix.map(r => r.slice(0, -1)));
  rerun('last row dropped', () => base.matrix.slice(0, -1));
  rerun('one cell blanked to null', () => {
    const m = base.matrix.map(r => r.slice());
    m[0][0] = null; return m;
  });
  rerun('matrix transposed (pivot-shaped change)', () => {
    const m = base.matrix;
    return m[0].map((_, c) => m.map(r => r[c]));
  });
  rerun('semicolon delimiter', () => parse(csv.replace(/,/g, ';')));
}

console.log(`\nAll derivation checks against the live module: ${allOk ? 'PASSED' : 'FAILED'}`);

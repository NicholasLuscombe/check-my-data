// S327 — what the sequence scan actually costs.
//
// BLOCK_SCAN_LIMIT = 5000 appears in two files and guards two different
// algorithms. Nobody has measured either. This times both against real corpus
// data at several sizes and reports the growth shape.
//
// HOW THE GUARD IS BYPASSED, since the point is to measure ABOVE the ceiling:
// the probe reads each test module's real source at run time, replaces the one
// token `const BLOCK_SCAN_LIMIT = 5000` with a caller-supplied value, writes
// the result to a temp file and imports that. The transformation is asserted to
// match exactly once, so the timed code cannot drift from src — it IS src, with
// one number changed. Nothing in src/ is modified.
//
// For Sequential Duplication the whole test is the guarded scan, so the whole
// test is timed. For Duplicate Detection only the block-copy sub-test is
// guarded, so it is timed twice — limit Infinity (scan on) and limit 0 (scan
// off) — and the block scan's cost is the difference.
//
// Usage: node test/probes/probe-s327-scan-cost.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CORPUS = '/Users/hedgehog/Projects/check-my-data/corpus-data';
const SRC = new URL('../../src/tests/', import.meta.url).pathname;
const TMP = mkdtempSync(join(tmpdir(), 's327-scan-'));

// Adaptive run count. Duplicate Detection's block scan is ~35x the cost of the
// sequence scan, so a fixed count either wastes minutes on the expensive points
// or under-samples the cheap ones. One warm-up, one probe run to size the cost,
// then enough timed runs to get a median without burning the budget.
const RUNS_FAST = 7;   // point costs under 250 ms
const RUNS_MID  = 5;   // under 2 s
const RUNS_SLOW = 3;   // over 2 s

// ── Guard bypass ────────────────────────────────────────────────────
// One-token rewrite of the real source. Asserted unique so it cannot silently
// no-op or hit something else.
async function loadWithLimit(file, limitLiteral, tag) {
  const src = readFileSync(join(SRC, file), 'utf-8');
  const needle = 'const BLOCK_SCAN_LIMIT = 5000;';
  const count = src.split(needle).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly 1 "${needle}", found ${count}`);
  const patched = src.replace(needle, `const BLOCK_SCAN_LIMIT = ${limitLiteral};`);
  // Rewrite relative imports so the temp copy resolves against real src.
  const rebased = patched.replace(/from ["']\.\.\/([^"']+)["']/g,
    (_, p) => `from "${pathToFileURL(join(SRC, '..', p)).href}"`);
  const out = join(TMP, `${tag}-${file}`);
  writeFileSync(out, rebased);
  return await import(pathToFileURL(out).href);
}

// ── Timing ──────────────────────────────────────────────────────────
function timeIt(fn) {
  fn();                                    // warm-up, discarded
  const t0 = performance.now(); fn();
  const first = performance.now() - t0;    // sizing run, kept
  const runs = first < 250 ? RUNS_FAST : first < 2000 ? RUNS_MID : RUNS_SLOW;
  const ts = [first];
  for (let i = 1; i < runs; i++) {
    const t1 = performance.now(); fn();
    ts.push(performance.now() - t1);
  }
  ts.sort((a, b) => a - b);
  const median = ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2;
  return { median, min: ts[0], max: ts[ts.length - 1], runs };
}

const fmt = (ms) => ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(1)} ms`;

// ── Prep ────────────────────────────────────────────────────────────
function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('empty after preprocessing');
  const blocks = detectBlocks(preprocessed);
  let blockRows = blocks.length > 1 ? blocks[0] : preprocessed;
  const maxC0 = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const minCells0 = Math.max(2, Math.ceil(maxC0 * 0.1));
  while (blockRows.length > 2) {
    const nb = blockRows[0].filter(v => v != null && String(v).trim() !== '').length;
    if (nb < minCells0) blockRows = blockRows.slice(1); else break;
  }
  const nH = detectHeaderRows(blockRows);
  const maxC = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = r => { const o = [...r]; while (o.length < maxC) o.push(null); return o; };
  let hdrs, data, condPerCol = null;
  if (nH === 0) {
    hdrs = Array.from({ length: maxC }, (_, i) => 'Col ' + (i + 1));
    data = blockRows.map(pad);
  } else if (nH === 1) {
    hdrs = pad(blockRows[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(1).map(pad);
  } else {
    const rawGR = pad(blockRows[0]), nameRow = pad(blockRows[1]);
    const groups = forwardFill(rawGR);
    condPerCol = new Array(maxC).fill(null);
    for (let i = 0; i < maxC; i++) {
      const g = groups[i] != null ? String(groups[i]).trim() : '';
      if (g) condPerCol[i] = g;
    }
    hdrs = nameRow.map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(2).map(pad);
  }
  const longFormatDetected = !!detectLongFormat(hdrs, data);
  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, longFormatDetected };
}

async function loadMatrix(file, sheet) {
  const path = `${CORPUS}/${file}`;
  const { rows, sheetName } = await parseExcel(new Blob([readFileSync(path)]), sheet);
  const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(rows);
  const auto = detectAssay(basename(path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';
  const { matrix } = extractAnalysisInputs({
    data, roles, hdrs, condPerCol, zeroAsMissing: false, assay, dataType,
    fileName: path, colRelationship: 'replicates', rowSemantics });
  return { matrix, assay, sheetName };
}

// ── Modules under test ──────────────────────────────────────────────
const seqOn = await loadWithLimit('sequentialDuplication.js', 'Infinity', 'on');
const dupOn = await loadWithLimit('duplicateDetection.js', 'Infinity', 'on');
const dupOff = await loadWithLimit('duplicateDetection.js', '0', 'off');

console.log('S327 — sequence-scan cost');
console.log(`  node ${process.version} · ${process.platform} ${process.arch} · Apple M3`);
console.log(`  1 warm-up run then 3-7 timed runs per point (adaptive); median (min-max) reported`);
console.log(`  maxOffset is capped at 200 above 500 rows in BOTH scans`);
console.log(`  (sequentialDuplication.js:36, duplicateDetection.js:372)`);

async function measure(label, file, sheet, sizes) {
  const { matrix, assay, sheetName } = await loadMatrix(file, sheet);
  const nCols = matrix[0]?.length || 0;
  console.log(`\n${'='.repeat(74)}`);
  console.log(`${label} — ${file} / ${JSON.stringify(sheetName)}`);
  console.log(`  full analysis matrix: ${matrix.length} rows x ${nCols} data cols`);
  console.log(`${'='.repeat(74)}`);
  console.log(`  rows   cols |  SeqDup scan        | DupDet total       | DupDet block scan`);
  console.log(`  ${'-'.repeat(70)}`);
  const table = [];
  for (const n of sizes) {
    if (n > matrix.length) continue;
    const sub = matrix.slice(0, n);
    const seq = timeIt(() => seqOn.testSequentialDuplication(sub, assay));
    // Duplicate Detection's block scan grows fast enough that above this size a
    // single run costs minutes. Measured where tractable, declared where not —
    // never silently omitted.
    const DUPDET_CEILING = 20000;
    let on = null, off = null, block = NaN;
    if (n <= DUPDET_CEILING) {
      off = timeIt(() => dupOff.testDuplicates(sub, sub, null, assay));
      on = timeIt(() => dupOn.testDuplicates(sub, sub, null, assay));
      block = on.median - off.median;
    }
    table.push({ n, nCols, seq: seq.median, dupOn: on?.median ?? NaN, dupOff: off?.median ?? NaN, block });
    console.log(`  ${String(n).padStart(6)} ${String(nCols).padStart(4)} | ` +
      `${fmt(seq.median).padStart(9)} (${fmt(seq.min)}-${fmt(seq.max)}, n=${seq.runs})`.padEnd(28) + '| ' +
      `${(on ? fmt(on.median) : 'not measured').padStart(12)}`.padEnd(14) + '| ' +
      `${(Number.isFinite(block) ? fmt(block) : 'not measured').padStart(12)}`);
  }
  // Growth shape — ratio of time to rows, normalised against the first point.
  console.log(`\n  growth shape (normalised to the smallest point):`);
  console.log(`  rows factor | SeqDup factor | DupDet block factor | linear would be`);
  const base = table[0];
  for (const t of table) {
    const rf = t.n / base.n;
    const sf = t.seq / base.seq;
    const bf = base.block > 0.05 ? t.block / base.block : NaN;
    console.log(`  ${rf.toFixed(2).padStart(6)}x     | ${sf.toFixed(2).padStart(6)}x        | ` +
      `${(Number.isFinite(bf) ? bf.toFixed(2) + 'x' : '  n/a').padStart(7)}             | ${rf.toFixed(2)}x`);
  }
  return table;
}

const C14 = await measure('C14', 'C14.xlsx', 'Data', [1250, 2500, 5000, 7500, 9398]);
const C25 = await measure('C25 (largest corpus sheet by rows)', 'C25.xlsx', 'Fig. 2c', [5000, 10000, 20000, 43201]);
// C10 is the widest of the large sheets — 26 data columns against C25's few.
const C10 = await measure('C10 (widest large sheet)', 'C10.xlsx', 'B. cereus Experiment1', [5000, 10000, 16522]);

console.log(`\n${'='.repeat(74)}`);
console.log('per-row cost at the largest point of each sheet');
console.log(`${'='.repeat(74)}`);
for (const [name, t] of [['C14 Data', C14], ['C25 Fig. 2c', C25], ['C10 B. cereus Exp1', C10]]) {
  const last = t[t.length - 1];
  if (!last) continue;
  console.log(`  ${name.padEnd(20)} ${String(last.n).padStart(6)} rows x ${String(last.nCols).padStart(3)} cols  ` +
    `SeqDup ${fmt(last.seq).padStart(9)}  =  ${(last.seq / last.n * 1000).toFixed(2)} µs/row  ` +
    `(${(last.seq / (last.n * last.nCols) * 1000).toFixed(3)} µs per row-column)`);
}
console.log('');

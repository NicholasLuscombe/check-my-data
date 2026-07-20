// S327 — before/after timing for the dedup optimisation.
//
// Same method as the s327-scan-cost read: one warm-up, then adaptive timed runs
// (7 under 250 ms, 5 under 2 s, 3 above), median with min-max spread. Both sides
// are the real source with BLOCK_SCAN_LIMIT rewritten to Infinity and nothing
// else changed; BEFORE comes from git main so it cannot drift.
//
// Usage: node test/probes/probe-s327-dedup-timing.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(REPO, 'src', 'tests');
const CORPUS = '/Users/hedgehog/Projects/check-my-data/corpus-data';
const TMP = mkdtempSync(join(tmpdir(), 's327-time-'));
const SIZES = [1250, 2500, 5000, 7500, 9398];

const RUNS_FAST = 7, RUNS_MID = 5, RUNS_SLOW = 3;

async function loadVariant(src, tag) {
  const needle = 'const BLOCK_SCAN_LIMIT = 5000;';
  if (src.split(needle).length - 1 !== 1) throw new Error(`${tag}: guard token not unique`);
  const rebased = src.replace(needle, 'const BLOCK_SCAN_LIMIT = Infinity;')
    .replace(/from ["']\.\.\/([^"']+)["']/g, (_, p) => `from "${pathToFileURL(join(SRC, '..', p)).href}"`);
  const out = join(TMP, `${tag}.js`); writeFileSync(out, rebased);
  return await import(pathToFileURL(out).href);
}

function timeIt(fn) {
  fn();
  const t0 = performance.now(); fn();
  const first = performance.now() - t0;
  const runs = first < 250 ? RUNS_FAST : first < 2000 ? RUNS_MID : RUNS_SLOW;
  const ts = [first];
  for (let i = 1; i < runs; i++) { const t = performance.now(); fn(); ts.push(performance.now() - t); }
  ts.sort((a, b) => a - b);
  const median = ts.length % 2 ? ts[(ts.length - 1) / 2] : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2;
  return { median, min: ts[0], max: ts[ts.length - 1], runs };
}
const fmt = (ms) => ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(1)} ms`;

function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  let blockRows = prep.rows;
  const blocks = detectBlocks(blockRows);
  if (blocks.length > 1) blockRows = blocks[0];
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
  if (nH === 0) { hdrs = Array.from({ length: maxC }, (_, i) => 'Col ' + (i + 1)); data = blockRows.map(pad); }
  else if (nH === 1) {
    hdrs = pad(blockRows[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(1).map(pad);
  } else {
    const rawGR = pad(blockRows[0]), nameRow = pad(blockRows[1]);
    const groups = forwardFill(rawGR);
    condPerCol = new Array(maxC).fill(null);
    for (let i = 0; i < maxC; i++) { const g = groups[i] != null ? String(groups[i]).trim() : ''; if (g) condPerCol[i] = g; }
    hdrs = nameRow.map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(2).map(pad);
  }
  const longFormatDetected = !!detectLongFormat(hdrs, data);
  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, longFormatDetected };
}

const before = await loadVariant(execFileSync('git', ['-C', REPO, 'show', 'main:src/tests/sequentialDuplication.js'], { encoding: 'utf-8' }), 'before');
const after = await loadVariant(readFileSync(join(SRC, 'sequentialDuplication.js'), 'utf-8'), 'after');

const path = `${CORPUS}/C14.xlsx`;
const { rows } = await parseExcel(new Blob([readFileSync(path)]), 'Data');
const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(rows);
const auto = detectAssay(basename(path), hdrs);
const assay = auto ? auto.assay : 'general';
const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';
const { matrix } = extractAnalysisInputs({
  data, roles, hdrs, condPerCol, zeroAsMissing: false, assay, dataType,
  fileName: path, colRelationship: 'replicates', rowSemantics });

console.log('S327 — dedup optimisation, before vs after');
console.log(`  node ${process.version} · ${process.platform} ${process.arch} · Apple M3`);
console.log(`  1 warm-up then 3-7 adaptive timed runs; median (min-max)`);
console.log(`  C14.xlsx / "Data" — ${matrix.length} rows x ${matrix[0]?.length || 0} data cols\n`);
console.log('   rows |            before |             after | speed-up');
console.log('  ' + '-'.repeat(62));

const table = [];
for (const n of SIZES) {
  if (n > matrix.length) continue;
  const sub = matrix.slice(0, n);
  const b = timeIt(() => before.testSequentialDuplication(sub, assay));
  const a = timeIt(() => after.testSequentialDuplication(sub, assay));
  table.push({ n, before: b.median, after: a.median });
  console.log(`  ${String(n).padStart(5)} | ${fmt(b.median).padStart(9)} (${fmt(b.min)}-${fmt(b.max)})`.padEnd(38) +
    `| ${fmt(a.median).padStart(9)} (${fmt(a.min)}-${fmt(a.max)})`.padEnd(28) + `| ${(b.median / a.median).toFixed(1)}x`);
}

console.log('\n  growth shape, normalised to the smallest point:');
console.log('   rows factor | before factor | after factor | linear would be');
const base = table[0];
for (const t of table) {
  console.log(`  ${(t.n / base.n).toFixed(2).padStart(7)}x     | ${(t.before / base.before).toFixed(2).padStart(7)}x      | ` +
    `${(t.after / base.after).toFixed(2).padStart(6)}x      | ${(t.n / base.n).toFixed(2)}x`);
}

// Empirical exponent from the endpoints: time ~ rows^k.
const first = table[0], last = table[table.length - 1];
const kBefore = Math.log(last.before / first.before) / Math.log(last.n / first.n);
const kAfter = Math.log(last.after / first.after) / Math.log(last.n / first.n);
console.log(`\n  empirical exponent k where time ~ rows^k (endpoints ${first.n} -> ${last.n}):`);
console.log(`     before k = ${kBefore.toFixed(2)}`);
console.log(`     after  k = ${kAfter.toFixed(2)}      (1.0 = linear, 2.0 = quadratic)`);
console.log('');

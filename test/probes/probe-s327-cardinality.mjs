// S327 — is C14's Sequential Duplication HIGH driven by its categorical columns?
//
// primaryP is min(pAdj) over kept sequences (sequentialDuplication.js:128), and
// pAdj = min(1, colHHI[c]^h * nOppForHeight(h)) — colHHI depends only on column
// c, nOppForHeight only on nR and the offset cap. Neither depends on the column
// COUNT. So dropping a column changes nothing about any other column's pAdj, and
// the dominance dedup is already per-column. Every counterfactual below is
// therefore EXACT from a single run, not a re-estimate.
//
// BLOCK_SCAN_LIMIT is raised in a run-time copy of the real source so the scan
// completes on 9,398 rows. Nothing in src/ is modified.
//
// Usage: node test/probes/probe-s327-cardinality.mjs

import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as XLSX from 'xlsx';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';
import { flagFromP } from '../../src/constants/thresholds.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(REPO, 'src', 'tests');
const CORPUS = '/Users/hedgehog/Projects/check-my-data/corpus-data';
const TMP = mkdtempSync(join(tmpdir(), 's327-card-'));

// Run-time copy: lift the guard, and expose the full kept list (the shipped
// return caps `sequences` at 50, which is not enough to decompose per column).
async function loadScan() {
  const src = readFileSync(join(SRC, 'sequentialDuplication.js'), 'utf-8');
  const needle = 'const BLOCK_SCAN_LIMIT = 5000;';
  if (src.split(needle).length - 1 !== 1) throw new Error('guard token not unique');
  const patched = src
    .replace(needle, 'const BLOCK_SCAN_LIMIT = Infinity;')
    .replace('sequences: kept.slice(0, 50),', 'sequences: kept.slice(0, 50), _allKept: kept, _colHHI: colHHI,')
    .replace(/from ["']\.\.\/([^"']+)["']/g, (_, p) => `from "${pathToFileURL(join(SRC, '..', p)).href}"`);
  const out = join(TMP, 'scan.js'); writeFileSync(out, patched);
  return await import(pathToFileURL(out).href);
}

function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  let blockRows = prep.rows;
  const blocks = detectBlocks(blockRows);
  if (blocks.length > 1) blockRows = blocks[0];
  const maxC0 = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const minCells0 = Math.max(2, Math.ceil(maxC0 * 0.1));
  let stripped = 0;
  while (blockRows.length > 2) {
    const nb = blockRows[0].filter(v => v != null && String(v).trim() !== '').length;
    if (nb < minCells0) { blockRows = blockRows.slice(1); stripped++; } else break;
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
  return { hdrs, data, condPerCol, roles, longFormatDetected, nH, stripped };
}

async function loadSheet(file, sheet) {
  const path = `${CORPUS}/${file}`;
  const { rows, sheetName } = await parseExcel(new Blob([readFileSync(path)]), sheet);
  const p = prepStructure(rows);
  const auto = detectAssay(basename(path), p.hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: p.longFormatDetected }).value || 'ordered';
  const { matrix, filteredIndices } = extractAnalysisInputs({
    data: p.data, roles: p.roles, hdrs: p.hdrs, condPerCol: p.condPerCol, zeroAsMissing: false,
    assay, dataType, fileName: path, colRelationship: 'replicates', rowSemantics });
  // matrix column j corresponds to sheet column dataCols[j] (engine.js:111).
  const dataCols = p.roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const colNames = dataCols.map(i => p.hdrs[i]);
  return { matrix, colNames, assay, sheetName, filteredIndices, prep: p };
}

const scan = await loadScan();
const { matrix, colNames, assay, sheetName, filteredIndices, prep } = await loadSheet('C14.xlsx', 'Data');
const nR = matrix.length, nC = matrix[0]?.length || 0;

console.log('S327 — what drives C14\'s Sequential Duplication verdict');
console.log(`  sheet   : C14.xlsx / ${JSON.stringify(sheetName)}`);
console.log(`  matrix  : ${nR} rows x ${nC} data cols`);
console.log(`  primaryP = min(pAdj) over kept sequences; pAdj = min(1, colHHI[c]^h * nOpp(h))`);
console.log(`  -> decomposes per column exactly. Each column contributes its own min pAdj.\n`);

const r = scan.testSequentialDuplication(matrix, assay);
const kept = r._allKept, hhi = r._colHHI;

// ── Per-column table ───────────────────────────────────────────────
const per = [];
for (let c = 0; c < nC; c++) {
  const vals = [];
  for (const row of matrix) if (row[c] != null) vals.push(row[c]);
  const distinct = new Set(vals);
  const mine = kept.filter(s => s.col === c);
  let best = null;
  for (const s of mine) if (!best || s.pAdj < best.pAdj) best = s;
  // Largest single-value share — the quantity DupDet's guard keys on.
  const freq = new Map();
  for (const v of vals) freq.set(v, (freq.get(v) || 0) + 1);
  let maxG = 0; for (const n of freq.values()) if (n > maxG) maxG = n;
  per.push({ c, name: colNames[c], distinct: distinct.size, n: vals.length,
    kept: mine.length, minPAdj: best ? best.pAdj : null,
    topH: best ? best.height : null, topOff: best ? best.offset : null,
    hhi: hhi[c], maxShare: vals.length ? maxG / vals.length : 0,
    values: distinct.size <= 20 ? [...distinct].sort((a, b) => a - b) : null });
}

console.log('  col  name                 distinct     HHI  maxshare   kept seqs      min pAdj   top run');
console.log('  ' + '-'.repeat(96));
for (const p of [...per].sort((a, b) => (a.minPAdj ?? 2) - (b.minPAdj ?? 2))) {
  const pv = p.minPAdj == null ? '        —' : p.minPAdj.toExponential(2);
  const top = p.topH == null ? '—' : `h=${p.topH} d=${p.topOff}`;
  console.log(`  ${String(p.c).padStart(3)}  ${String(p.name).slice(0, 18).padEnd(20)} ${String(p.distinct).padStart(6)}  ${p.hhi.toFixed(4)}  ${(p.maxShare * 100).toFixed(1).padStart(6)}%  ${String(p.kept).padStart(8)}  ${pv.padStart(12)}   ${top}`);
}

console.log(`\n  overall: flag=${r.flag}  primaryP=${r.primaryP}  nSequences=${r.nSequences}`);

// ── Counterfactuals — exact, by filtering kept ─────────────────────
function verdictExcluding(excl) {
  const set = new Set(excl);
  const surv = kept.filter(s => !set.has(s.col));
  let best = null;
  for (const s of surv) if (!best || s.pAdj < best.pAdj) best = s;
  const p = best ? best.pAdj : 1;
  return { flag: flagFromP(p), p, n: surv.length, drivenBy: best ? colNames[best.col] : null,
    drivenCol: best ? best.col : null, h: best?.height, d: best?.offset };
}

console.log(`\n${'='.repeat(96)}`);
console.log('COUNTERFACTUAL — exact, since dropping a column cannot change another column\'s pAdj');
console.log(`${'='.repeat(96)}`);

const show = (label, excl) => {
  const v = verdictExcluding(excl);
  console.log(`  ${label.padEnd(46)} flag=${v.flag.padEnd(9)} p=${v.p.toExponential(3).padStart(11)}  kept=${String(v.n).padStart(6)}  driver=${v.drivenBy ?? '—'}${v.h ? ` (h=${v.h} d=${v.d})` : ''}`);
};

show('all 14 columns (current result)', []);
show('excluding col 2 and col 10 (the 95%)', [2, 10]);

// Series over distinct-value thresholds. Chosen to bracket the two categorical
// columns (5 and 16 distinct) and continue up past the next tier (34, 65, 90,
// 113) so the shape is visible either side of them. Not a threshold proposal.
console.log('');
for (const t of [6, 17, 35, 66, 100, 200, 600, 1000]) {
  const excl = per.filter(p => p.distinct < t).map(p => p.c);
  show(`excluding columns with < ${String(t).padStart(4)} distinct values (${String(excl.length).padStart(2)} dropped)`, excl);
}

// ── Are they categorical? ──────────────────────────────────────────
console.log(`\n${'='.repeat(96)}`);
console.log('ARE THE LOW-CARDINALITY COLUMNS CATEGORICAL?');
console.log(`${'='.repeat(96)}`);
for (const p of per.filter(x => x.values)) {
  console.log(`  col ${p.c} "${p.name}" — ${p.distinct} distinct over ${p.n} values`);
  console.log(`     values: ${p.values.join(', ')}`);
  const ints = p.values.every(v => Number.isInteger(v));
  const consec = ints && p.values.every((v, i) => i === 0 || v === p.values[i - 1] + 1);
  console.log(`     all integers: ${ints}   consecutive run: ${consec}   min=${p.values[0]} max=${p.values[p.values.length - 1]}`);
}

// ── Documented defects ─────────────────────────────────────────────
// PubPeer / spec name FILE rows. Matrix rows are 0-indexed after header removal
// and sparse-row filtering, so the mapping is reported rather than assumed.
console.log(`\n${'='.repeat(96)}`);
console.log('DOCUMENTED DEFECTS — do kept sequences cover them?');
console.log(`${'='.repeat(96)}`);
console.log(`  header rows detected: ${prep.nH}, preamble rows stripped: ${prep.stripped}`);
console.log(`  rows surviving the sparse filter: ${filteredIndices.length} of ${prep.data.length}`);
const contiguous = filteredIndices.every((v, i) => i === 0 || v === filteredIndices[i - 1] + 1);
console.log(`  filtered indices contiguous: ${contiguous}  (if true, file row = matrix row + ${prep.nH + prep.stripped + 1})`);
const OFF = prep.nH + prep.stripped + 1;

const TARGETS = [
  { label: 'PubPeer run A  file rows 696-706 -> 707-718', src: [696, 706], dst: [707, 718] },
  { label: 'PubPeer run B  file rows 4921-4930 -> 4974-4983', src: [4921, 4930], dst: [4974, 4983] },
  { label: 'Spec L153      file rows 260 <-> 261', src: [260, 261], dst: [260, 261] },
];
for (const t of TARGETS) {
  const ms = [t.src[0] - OFF, t.src[1] - OFF];
  // Any kept sequence whose src range overlaps the named source range.
  const hits = kept.filter(s => s.srcRows[0] <= ms[1] && s.srcRows[1] >= ms[0]);
  const lowCard = hits.filter(s => s.col === 2 || s.col === 10);
  const highCard = hits.filter(s => s.col !== 2 && s.col !== 10);
  console.log(`\n  ${t.label}`);
  console.log(`     matrix rows ~${ms[0]}-${ms[1]}`);
  console.log(`     kept sequences overlapping: ${hits.length}  (in col 2/10: ${lowCard.length}, elsewhere: ${highCard.length})`);
  if (highCard.length) {
    const b = highCard.reduce((m, s) => s.pAdj < m.pAdj ? s : m, highCard[0]);
    console.log(`     best OUTSIDE the categorical columns: col ${b.col} "${colNames[b.col]}" h=${b.height} d=${b.offset} pAdj=${b.pAdj.toExponential(2)}`);
  } else {
    console.log(`     nothing outside the categorical columns covers this range`);
  }
}

// ── Corpus shape sweep ─────────────────────────────────────────────
console.log(`\n${'='.repeat(96)}`);
console.log('OTHER CORPUS SHEETS WITH A LOW-CARDINALITY NUMERIC COLUMN');
console.log(`${'='.repeat(96)}`);
console.log('  (sheets the sequence scan runs on = analysis matrix >= 4 rows; <=20 distinct counts as low)');
for (const f of readdirSync(CORPUS).filter(x => /\.(xlsx|xls)$/i.test(x)).sort()) {
  let wb; try { wb = XLSX.read(readFileSync(`${CORPUS}/${f}`), { type: 'buffer' }); } catch { continue; }
  for (const sn of wb.SheetNames) {
    let m;
    try { m = await loadSheet(f, sn); } catch { continue; }
    const rows = m.matrix.length, cols = m.matrix[0]?.length || 0;
    if (rows < 4 || cols < 1) continue;
    const low = [];
    for (let c = 0; c < cols; c++) {
      const s = new Set();
      for (const row of m.matrix) if (row[c] != null) s.add(row[c]);
      if (s.size <= 20 && s.size >= 2) low.push(`${m.colNames[c]}(${s.size})`);
    }
    if (low.length) console.log(`  ${f} / ${JSON.stringify(m.sheetName)} — ${rows}x${cols} — ${low.length} low-card: ${low.slice(0, 6).join(', ')}${low.length > 6 ? ' …' : ''}`);
  }
}
console.log('');

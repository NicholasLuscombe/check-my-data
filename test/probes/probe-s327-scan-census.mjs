// S327 companion probe — two questions the timing raised.
//
// 1. CENSUS. How many corpus sheets actually reach the 5,000-row ceiling in the
//    ANALYSIS matrix? Raw sheet extent is not analysis row count — preprocessing
//    strips sparse rows and detectBlocks takes the first block, so a 43,000-row
//    sheet can analyse as 3,600. The ceiling applies to the analysis matrix, so
//    that is what has to be counted.
//
// 2. MECHANISM. Why is the sequence scan super-linear on real C14 data when it
//    is linear on synthetic data of the same shape? Counts the runs the scan
//    finds and the distinct-value cardinality per column.
//
// Usage: node test/probes/probe-s327-scan-census.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';
import * as XLSX from 'xlsx';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const CORPUS = '/Users/hedgehog/Projects/check-my-data/corpus-data';
const LIMIT = 5000;

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

async function analysisMatrix(path, sheet) {
  const { rows, sheetName } = await parseExcel(new Blob([readFileSync(path)]), sheet);
  const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(rows);
  const auto = detectAssay(basename(path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';
  const { matrix } = extractAnalysisInputs({
    data, roles, hdrs, condPerCol, zeroAsMissing: false, assay, dataType,
    fileName: path, colRelationship: 'replicates', rowSemantics });
  return { matrix, sheetName, rawRows: rows.length };
}

console.log('S327 — corpus census against the 5,000-row ceiling\n');
console.log('Raw sheet extent vs the matrix the ceiling actually sees:\n');
console.log('  raw    analysis  cols  file / sheet');
console.log('  ' + '-'.repeat(68));

const candidates = [];
for (const f of readdirSync(CORPUS).filter(x => /\.(xlsx|xls)$/i.test(x)).sort()) {
  const path = `${CORPUS}/${f}`;
  let wb;
  try { wb = XLSX.read(readFileSync(path), { type: 'buffer' }); } catch { continue; }
  for (const n of wb.SheetNames) {
    const ref = wb.Sheets[n]?.['!ref']; if (!ref) continue;
    const r = XLSX.utils.decode_range(ref);
    const rawRows = r.e.r - r.s.r + 1;
    if (rawRows <= LIMIT) continue;      // cannot reach the ceiling
    try {
      const { matrix, sheetName } = await analysisMatrix(path, n);
      const nR = matrix.length, nC = matrix[0]?.length || 0;
      const over = nR > LIMIT;
      console.log(`  ${String(rawRows).padStart(6)} ${String(nR).padStart(8)}  ${String(nC).padStart(4)}  ${f} / ${JSON.stringify(sheetName)}${over ? '   <-- OVER THE CEILING' : ''}`);
      if (over) candidates.push({ f, sheet: sheetName, nR, nC });
    } catch (e) {
      console.log(`  ${String(rawRows).padStart(6)}   FAILED   —     ${f} / ${JSON.stringify(n)}  (${e.message})`);
    }
  }
}

console.log(`\n  Sheets whose ANALYSIS matrix exceeds ${LIMIT} rows: ${candidates.length}`);
for (const c of candidates) console.log(`     ${c.f} / ${JSON.stringify(c.sheet)} — ${c.nR} rows x ${c.nC} cols`);

// ── Mechanism ───────────────────────────────────────────────────────
console.log(`\n${'='.repeat(72)}`);
console.log('Mechanism — why the scan is super-linear on real data');
console.log(`${'='.repeat(72)}`);

const { matrix } = await analysisMatrix(`${CORPUS}/C14.xlsx`, 'Data');
const nC = matrix[0]?.length || 0;
console.log(`\nC14 Data column cardinality (distinct non-null values over ${matrix.length} rows):`);
for (let c = 0; c < nC; c++) {
  const s = new Set();
  for (const row of matrix) if (row[c] != null) s.add(row[c]);
  const frac = s.size / matrix.length;
  const flagLow = s.size <= 20;
  console.log(`  col ${String(c).padStart(2)}: ${String(s.size).padStart(6)} distinct  (${(frac * 100).toFixed(2)}% of rows)${flagLow ? '   <-- low cardinality' : ''}`);
}

// Count the runs the scan would find, without running the scan — same walk,
// no object construction, no p-value work.
function countRuns(m, MIN_H = 3) {
  const nR = m.length, nCol = m[0]?.length || 0;
  const maxOffset = nR > 500 ? Math.min(nR - 1, 200) : nR - 1;
  let runs = 0;
  for (let c = 0; c < nCol; c++) {
    for (let d = 1; d <= maxOffset; d++) {
      let start = -1;
      for (let r = 0; r + d < nR; r++) {
        const a = m[r]?.[c], b = m[r + d]?.[c];
        const match = a != null && b != null && a === b;
        if (match) { if (start < 0) start = r; }
        else { if (start >= 0 && r - start >= MIN_H) runs++; start = -1; }
      }
      if (start >= 0 && (nR - d) - start >= MIN_H) runs++;
    }
  }
  return { runs, maxOffset };
}

console.log(`\nRuns of height >= 3 the scan walks into, by size:`);
console.log(`  rows  maxOffset   runs found   nOppForHeight calls   inner iterations`);
for (const n of [1250, 2500, 5000, 7500, 9398]) {
  if (n > matrix.length) continue;
  const { runs, maxOffset } = countRuns(matrix.slice(0, n));
  // nOppForHeight is called once per kept run and loops maxOffset times.
  const iters = runs * maxOffset;
  console.log(`  ${String(n).padStart(5)}  ${String(maxOffset).padStart(9)}   ${String(runs).padStart(10)}   ${String(runs).padStart(19)}   ${iters.toLocaleString('en-US').padStart(16)}`);
}
console.log('');

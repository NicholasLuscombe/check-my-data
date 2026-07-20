// S327 probe B — does any real-world corpus file exceed 50 DATA columns on the
// sheet that would be analysed?
//
// The gate is missingDataPattern.js:58 — `if (nC <= 50)` wraps the entire
// pairwise Fisher missingness scan (sub-signal (a) of three). Above 50 columns
// that scan never runs, and nothing in the returned object records it:
// nPairwiseHits reads 0, indistinguishable from a scan that ran and found
// nothing. So "does any real file cross it" decides whether that silence
// matters in practice or is purely theoretical.
//
// nC is the DATA-column count of the analysis matrix, AFTER role inference has
// held out identifier / index / condition columns — not the raw sheet width.
//
// Method. Raw sheet width is a strict upper bound on the data-column count
// (inference only ever removes columns). So a sheet whose raw width is <= 50
// cannot possibly cross the gate and needs no prep run. Only sheets wider than
// 50 raw columns get the full pipeline prep, which is where the real answer is.
// This keeps the sweep cheap without weakening it.
//
// Every sheet of every workbook is bounded, not only the PubPeer-flagged one.
// That is deliberate: if no sheet anywhere crosses, the flagged sheet cannot
// either, and the question is settled without needing each flagged-sheet
// designation resolved out of the spec prose.
//
// Usage: node test/probes/probe-s327-column-width.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname } from 'node:path';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { summarize } from '../../src/import/summary.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CORPUS = '/Users/hedgehog/Projects/check-my-data/corpus-data';
const GATE = 50;   // missingDataPattern.js:58 — `if (nC <= 50)`

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

async function dataColsFor(path, sheet) {
  const ext = extname(path).toLowerCase();
  let raw;
  if (ext === '.xlsx' || ext === '.xls') {
    const { rows } = await parseExcel(new Blob([readFileSync(path)]), sheet);
    raw = rows;
  } else {
    raw = Papa.parse(readFileSync(path, 'utf-8'), { header: false, skipEmptyLines: false }).data;
  }
  const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(raw);
  const auto = detectAssay(basename(path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';
  const { matrix } = extractAnalysisInputs({
    data, roles, hdrs, condPerCol, zeroAsMissing,
    assay, dataType, fileName: path, colRelationship: 'replicates', rowSemantics,
  });
  return matrix[0]?.length || 0;
}

// Raw column width per sheet — the upper bound.
function sheetWidths(path) {
  const ext = extname(path).toLowerCase();
  if (ext !== '.xlsx' && ext !== '.xls') {
    const rows = Papa.parse(readFileSync(path, 'utf-8'), { header: false, skipEmptyLines: false }).data;
    return [{ sheet: null, width: rows.reduce((m, r) => Math.max(m, r.length), 0) }];
  }
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', bookSheets: false });
  return wb.SheetNames.map(n => {
    const ref = wb.Sheets[n]?.['!ref'];
    if (!ref) return { sheet: n, width: 0 };
    const range = XLSX.utils.decode_range(ref);
    return { sheet: n, width: range.e.c - range.s.c + 1 };
  });
}

console.log('S327 probe B — 50-column gate (missingDataPattern.js:58)');
console.log(`Gate: the pairwise Fisher missingness scan runs only when nC <= ${GATE}.\n`);

const files = readdirSync(CORPUS)
  .filter(f => /\.(xlsx|xls|csv)$/i.test(f))
  .sort();

const overWide = [];
let maxRawSeen = 0, maxRawWhere = '';

for (const f of files) {
  const path = `${CORPUS}/${f}`;
  let widths;
  try { widths = sheetWidths(path); }
  catch (e) { console.log(`${f.padEnd(22)} FAILED to read: ${e.message}`); continue; }

  const max = widths.reduce((m, w) => Math.max(m, w.width), 0);
  const widest = widths.find(w => w.width === max);
  if (max > maxRawSeen) { maxRawSeen = max; maxRawWhere = `${f} / ${widest?.sheet ?? '(csv)'}`; }

  const crossers = widths.filter(w => w.width > GATE);
  const verdict = crossers.length
    ? `${crossers.length} sheet(s) raw-wider than ${GATE} — prep needed`
    : `all ${widths.length} sheet(s) <= ${GATE} raw — cannot cross`;
  console.log(`${f.padEnd(22)} sheets=${String(widths.length).padStart(2)}  widest raw=${String(max).padStart(4)}  ${verdict}`);

  for (const c of crossers) overWide.push({ file: f, path, sheet: c.sheet, rawWidth: c.width });
}

console.log(`\nWidest raw sheet anywhere in the corpus: ${maxRawSeen} columns (${maxRawWhere})`);

if (!overWide.length) {
  console.log(`\nNo sheet in any corpus file is raw-wider than ${GATE} columns.`);
  console.log('Raw width bounds the data-column count from above, so no file can');
  console.log(`reach nC > ${GATE}. The pairwise missingness scan runs on every corpus`);
  console.log('file. The gate is never crossed in practice.');
} else {
  console.log(`\n${overWide.length} sheet(s) raw-wider than ${GATE} — running full prep to get real nC:\n`);
  for (const w of overWide) {
    try {
      const nC = await dataColsFor(w.path, w.sheet);
      const crosses = nC > GATE;
      console.log(`  ${w.file} / ${JSON.stringify(w.sheet)}`);
      console.log(`     raw width ${w.rawWidth} -> ${nC} DATA cols after inference — ` +
        `${crosses ? `CROSSES the gate (scan skipped)` : 'does not cross (scan runs)'}`);
    } catch (e) {
      console.log(`  ${w.file} / ${JSON.stringify(w.sheet)} — prep failed: ${e.message}`);
    }
  }
}
console.log('');

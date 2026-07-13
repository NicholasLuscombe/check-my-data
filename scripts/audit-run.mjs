#!/usr/bin/env node
// Corpus audit — run one dataset through the real import + engine pipeline and
// print an auditable report. It answers the questions a corpus adjudication
// asks: what shape is the table, what role did each column get, which columns
// did §2.8 hold out as group attributes and why, and what did each test find
// (flag, p-value, and the columns it fired on).
//
// This is the audit companion to test/validate-batch.mjs. That runner asserts
// severities across the fixture set; this one narrates a single run so a real
// deposit can be read without scrolling console noise. It changes no engine
// behaviour — it calls the same modules the app calls.
//
// Usage:
//   node scripts/audit-run.mjs <file.csv|file.xlsx|file.xls> [assay]
//   node scripts/audit-run.mjs <file> --json      machine-readable dump
//
// Assay defaults to detectAssay(fileName, headers); pass an explicit assay key
// (general, qpcr, densitometry, elisa, cell_count, plate_reader, genomics) to
// override. The first sheet of a workbook is used. A single header row is
// assumed unless the parser's two-row-header detector fires.

import { readFileSync } from 'fs';
import { basename, extname } from 'path';

// The engine schedules a little work through requestAnimationFrame; Node has no
// such global, so provide the same shim validate-batch.mjs uses.
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = (await import('papaparse')).default;
const XLSX = await import('xlsx');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferBaseRoles, detectGroupAttributes } = await import('../src/import/roles.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');
const { extractCellFlags } = await import('../src/analysis/convergence.js');

// ── args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const positional = args.filter(a => !a.startsWith('--'));
const file = positional[0];
const assayOverride = positional[1] || null;
if (!file) {
  console.error('usage: node scripts/audit-run.mjs <file.csv|file.xlsx|file.xls> [assay] [--json]');
  process.exit(1);
}

// ── load rows (CSV or Excel) into a 2D array ──────────────────────
function loadRows(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsm') {
    const wb = XLSX.readFile(path, { cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  }
  return Papa.parse(readFileSync(path, 'utf-8'), { skipEmptyLines: true }).data;
}

let raw = loadRows(file);
if (!raw.length) { console.error(`No rows read from ${file}`); process.exit(1); }
raw = preprocessRaw(raw).rows;

const headerRows = detectHeaderRows(raw);
const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const nRows = data.length;
const nCols = headers.length;

// ── roles + §2.8 provenance ───────────────────────────────────────
const baseRoles = inferBaseRoles(data, headers, condPerCol);
const { roles, groupings } = detectGroupAttributes(data, baseRoles);

// ── assay / VST / data type / row semantics ───────────────────────
const assay = assayOverride || detectAssay(basename(file), headers)?.assay || 'general';
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
const lfDet = detectLongFormat(headers, data);
const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';

const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
const { severity } = computeSeverity(results);

// ── helpers ───────────────────────────────────────────────────────
const nameOf = c => (headers[c] != null && String(headers[c]).trim()) ? String(headers[c]).trim() : `Col ${c + 1}`;
const SEV_WORD = ['clean', 'low', 'moderate', 'high'];

// dataCols maps a matrix column index back to its full-table column index, so a
// test's flagged matrix columns can be named. extractCellFlags reports columns
// relative to the analysis matrix (data columns only).
const dataCols = roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);

// Which grouping columns explain each excluded column (§2.8 provenance).
const explainedBy = {};
for (const g of groupings) for (const c of g.attrCols) (explainedBy[c] ||= []).push({ groupCol: g.groupCol, nLevels: g.nLevels });

const attrNote = (c) => {
  const ex = explainedBy[c];
  if (!ex || !ex.length) return '';
  const head = ex[0];
  const more = ex.length > 1 ? ` (+${ex.length - 1} more)` : '';
  return `constant within ${head.nLevels} levels of ${nameOf(head.groupCol)}${more}`;
};

const fmtP = (p) => {
  if (p == null || Number.isNaN(p)) return '—';
  if (p <= 0) return '<1e-300';
  if (p < 1e-4) return p.toExponential(1);
  return p.toPrecision(3);
};

const TIER_ORDER = { HIGH: 0, MODERATE: 1, LOW: 2, 'N/A': 3, ERROR: 4 };
const tierRank = f => TIER_ORDER[f] ?? 5;

// Per test: the distinct full-table columns and the row count it flagged.
function firedOn(r) {
  const regions = extractCellFlags(r, matrix.length, matrix[0]?.length || 0);
  if (!regions.length) return { cols: [], nRows: 0 };
  const colSet = new Set();
  const rowSet = new Set();
  for (const reg of regions) {
    if (reg.cols) for (const mc of reg.cols) { if (mc != null && dataCols[mc] != null) colSet.add(dataCols[mc]); }
    if (reg.rows) for (const rw of reg.rows) rowSet.add(rw);
  }
  return { cols: [...colSet].sort((a, b) => a - b), nRows: rowSet.size };
}

// ── JSON mode ─────────────────────────────────────────────────────
if (jsonMode) {
  const out = {
    file: basename(file), nRows, nCols, headerRows, assay,
    vst: { transform: vst?.transform || 'raw', reason: vst?.reason || null },
    rowSemantics, severity, severityWord: SEV_WORD[severity],
    roles: headers.map((h, c) => ({ col: c, header: nameOf(c), role: roles[c], base: baseRoles[c], note: attrNote(c) || null })),
    groupAttributes: groupings.map(g => ({ groupCol: g.groupCol, groupHeader: nameOf(g.groupCol), nLevels: g.nLevels, attrCols: g.attrCols.map(c => ({ col: c, header: nameOf(c) })) })),
    tests: results.map(r => { const f = firedOn(r); return { name: r.name, flag: r.flag, primaryP: r.primaryP ?? null, firedCols: f.cols.map(nameOf), firedRows: f.nRows }; }),
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

// ── text report ───────────────────────────────────────────────────
const nData = roles.filter(r => r === 'data').length;
const nAttr = roles.filter(r => r === 'attribute').length;
const bar = '─'.repeat(72);

console.log(`\nCORPUS AUDIT  ${basename(file)}`);
console.log(bar);
console.log(`Rows ${nRows}  ·  Columns ${nCols}  ·  header rows ${headerRows}`);
console.log(`Assay  ${assay}${assayOverride ? ' (override)' : ' (detected)'}     VST  ${vst?.transform || 'raw'}${vst?.reason ? ` (${vst.reason})` : ''}     Row semantics  ${rowSemantics}`);
console.log(`Data columns in matrix  ${nData}     Group attributes held out (§2.8)  ${nAttr}`);

console.log(`\nROLES`);
console.log(`  ${'#'.padEnd(4)}${'column'.padEnd(28)}${'role'.padEnd(11)}note`);
for (let c = 0; c < nCols; c++) {
  const note = roles[c] === 'attribute' ? attrNote(c) : '';
  console.log(`  ${String(c).padEnd(4)}${nameOf(c).slice(0, 27).padEnd(28)}${roles[c].padEnd(11)}${note}`);
}
if (nAttr) {
  console.log(`\n  §2.8: ${nAttr} of ${nData + nAttr} numeric columns held out as group attributes across ${groupings.length} grouping column(s).`);
}

console.log(`\nTEST RESULTS  (severity ${severity} · ${SEV_WORD[severity]})`);
const sorted = [...results].sort((a, b) => tierRank(a.flag) - tierRank(b.flag) || a.name.localeCompare(b.name));
for (const r of sorted) {
  const f = firedOn(r);
  const cols = f.cols.length ? `  cols: ${f.cols.slice(0, 8).map(nameOf).join(', ')}${f.cols.length > 8 ? ` …(${f.cols.length})` : ''}` : '';
  const rows = f.nRows ? `  rows: ${f.nRows}` : '';
  const p = (r.flag === 'HIGH' || r.flag === 'MODERATE') ? `  p=${fmtP(r.primaryP)}` : '';
  console.log(`  ${(r.flag || '?').padEnd(9)}${r.name}${p}${cols}${rows}`);
}
console.log('');

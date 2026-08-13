// probe-s373-corpus-shape-census.mjs — S373 Part A.
//
// Parse geometry and role inference for every sheet of every real-world deposit.
// REALWORLD-CORPUS-SPEC.md §0's Shape column was marked "(inf.)" — Chat's
// inference from title and journal, carrying a standing instruction to overwrite
// on data pull. This is that measurement.
//
// Per sheet: rows and columns as the sheet holds them and as the parser hands
// them on, which columns role inference tags condition / label / data /
// attribute, the count of numeric data columns entering the matrix, the grouping
// outcome (column-grouped, row-grouped or neither) with group count and sizes,
// and the valid row count after completeness filtering.
//
// The route is scripts/corpus-run.mjs's own — parseExcel -> preprocessRaw ->
// detectBlocks -> detectHeaderRows -> inferBaseRoles -> detectGroupAttributes ->
// extractAnalysisInputs — so "row-grouped with N groups" here means what the
// product means by it. prepStructure below is copied from that runner rather
// than reimplemented; a census that builds its own parser measures a parser
// nobody ships.
//
// READ-ONLY on src/. Imports the import chain and STOPS before runFullAnalysis.
// No test runs, no verdict, flag or severity is computed at any point. Because
// nothing is scored, §0.3's ecology-cluster gate is not engaged: that gate
// blocks READING row-grouped results as findings, and this probe produces none.
//
// ── Scope: two sets, reported separately ────────────────────────────────────
// FILES    the 27 enumerated deposits — C07..C25 plus the 8 update pairs. These
//          are the rows whose Shape cell reads "(inf.)".
// ADDENDUM CORPUS-01 / -02 / -03, whose Shape cells were already measured and
//          carry no "(inf.)". Censused through the same route so that a
//          "largest anywhere" claim is answerable either way, and so the §0.3
//          cross-check below can reach the two CORPUS rows that census records.
// Every figure this probe prints comes from reading corpus-data/. It never reads
// corpus-out/ — those artefacts are battery output from an earlier session and
// carry no group sizes (their `structure` block predates rowGroupStatus).
//
// ── Three named file hazards (from the spec's own S305 sweep) ───────────────
// Handled by enumerating explicitly. Do not replace FILES with a glob:
//   * C13's update is `C13-updated.xlsx` (past tense) against `-update.xlsx`
//     everywhere else, so `*-update.xlsx` silently drops that pair;
//   * C11 and C24 are legacy `.xls`;
//   * there are 8 update pairs, not 7 — C22-update.xlsx is on disk with no
//     PubPeer marker in the thread cell.
//
// ── Where the data lives ────────────────────────────────────────────────────
// corpus-data/ is gitignored (.gitignore:61), so it exists in the main checkout
// and NOT in a worktree. The resolver tries the working directory first and then
// walks up to the main checkout, and prints which one it used — same shape as
// probe-s352-corpus-pairing.mjs.
//
// Usage:
//   node test/probes/probe-s373-corpus-shape-census.mjs
//   CORPUS_DIR=/path/to/corpus-data node test/probes/probe-s373-corpus-shape-census.mjs
//
// Env: JSON_OUT — also write the full per-sheet record as JSON, including every
//      column name by role (too wide for the console table).

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferBaseRoles, detectGroupAttributes } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { summarize } = await import('../../src/import/summary.js');
const { parseExcel, getSheetNames } = await import('../../src/import/excel.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');

// ── Corpus directory ────────────────────────────────────────────────────────
const CANDIDATES = [
  process.env.CORPUS_DIR,
  'corpus-data',
  resolve(process.cwd(), '../../../corpus-data'),   // worktree -> main checkout
].filter(Boolean);
const CORPUS = CANDIDATES.find(d => existsSync(d)) || null;
if (!CORPUS) {
  console.log('corpus directory NOT FOUND. Tried: ' + CANDIDATES.map(c => resolve(c)).join(', '));
  process.exit(1);
}

const FILES = [
  'C07.xlsx', 'C07-update.xlsx',
  'C08.xlsx',
  'C09.xlsx', 'C09-update.xlsx',
  'C10.xlsx',
  'C11.xls',
  'C12.xlsx',
  'C13.xlsx', 'C13-updated.xlsx',
  'C14.xlsx',
  'C15.xlsx',
  'C16.xlsx', 'C16-update.xlsx',
  'C17.xlsx', 'C17-update.xlsx',
  'C18.xlsx', 'C18-update.xlsx',
  'C19.xlsx',
  'C20.xlsx',
  'C21.xlsx', 'C21-update.xlsx',
  'C22.xlsx', 'C22-update.xlsx',
  'C23.xlsx',
  'C24.xls',
  'C25.xlsx',
];

const ADDENDUM = ['CORPUS-01.xlsx', 'CORPUS-02.xlsx', 'CORPUS-03.xlsx'];

// ── prepStructure — copied from scripts/corpus-run.mjs:146-195, minus the
// conditionsHint override (no file in this census carries a hint). Kept a copy
// rather than an import because the runner is a script, not a module: it parses
// argv and runs at load. `nBlocks` is the one addition — detectBlocks' result is
// discarded by the runner and is worth recording here, since taking block 1 of
// several is a silent narrowing of what the sheet contained.
function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('Empty after preprocessing.');

  const blocks = detectBlocks(preprocessed);
  let blockRows = blocks.length > 1 ? blocks[0] : preprocessed;
  const nBlocks = blocks.length;

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
  const { roles, groupings } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, groupings, longFormatDetected, nH, nBlocks };
}

const median = a => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const nameOf = (hdrs, c) => (hdrs[c] != null && String(hdrs[c]).trim()) ? String(hdrs[c]).trim() : `Col ${c + 1}`;

async function censusSheet(path, sheetName) {
  const blob = new Blob([readFileSync(path)]);
  const { rows: raw, sheetName: sheetUsed } = await parseExcel(blob, sheetName);
  const rawRows = raw.length;
  const rawCols = raw.reduce((m, r) => Math.max(m, r.length), 0);

  const { hdrs, data, condPerCol, roles, longFormatDetected, nH, nBlocks } = prepStructure(raw);

  // assay / dataType / zeroAsMissing — corpus-run.mjs's no-override path. Not
  // cosmetic: zeroAsMissing decides which rows survive completeness filtering,
  // so a census that skipped it would report the wrong valid row count on any
  // genomics or cell-count deposit.
  const auto = detectAssay(basename(path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;

  const dataCols = roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const dataColHeaders = dataCols.map(c => nameOf(hdrs, c));

  const { matrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing,
    colRelationship: 'replicates', dataColHeaders,
  });

  const byRole = {};
  roles.forEach((r, c) => { (byRole[r] ||= []).push(nameOf(hdrs, c)); });

  let grouping;
  if (condCtx.type === 'column-grouped') {
    // A column-grouped "group" is a block of replicate COLUMNS over the same
    // rows, so its size is a column count — a different unit from the row-
    // grouped case below. sizeUnit carries the distinction so a reader cannot
    // compare the two numbers by accident.
    const sizes = condCtx.slices().map(s => (s.colIndices || []).length);
    grouping = {
      kind: 'column-grouped', nGroups: condCtx.count, groupNames: condCtx.names,
      sizeUnit: 'columns per group',
      min: sizes.length ? Math.min(...sizes) : null, median: median(sizes),
      max: sizes.length ? Math.max(...sizes) : null, sizes,
    };
  } else if (condCtx.type === 'row-grouped') {
    const st = condCtx.rowGroupsStatus();
    const sizes = st.sizes || [];
    grouping = {
      kind: 'row-grouped', nGroups: st.nGroups ?? null,
      usable: st.usable, reason: st.reason,
      sizeUnit: 'rows per group',
      min: sizes.length ? Math.min(...sizes) : null, median: st.medianSize,
      max: sizes.length ? Math.max(...sizes) : null, sizes,
    };
  } else {
    grouping = { kind: 'neither', nGroups: 0, sizeUnit: null, min: null, median: null, max: null, sizes: [] };
  }

  return {
    sheet: sheetUsed, rawRows, rawCols, headerRows: nH, nBlocks,
    parsedRows: data.length, parsedCols: hdrs.length,
    assay, dataType, zeroAsMissing, longFormatDetected,
    roleCounts: {
      condition: (byRole.condition || []).length,
      label: (byRole.label || []).length,
      data: (byRole.data || []).length,
      attribute: (byRole.attribute || []).length,
      ignore: (byRole.ignore || []).length,
    },
    conditionCols: byRole.condition || [],
    labelCols: byRole.label || [],
    dataColsNamed: byRole.data || [],
    attributeCols: byRole.attribute || [],
    nNumericDataCols: matrix[0]?.length || 0,
    validRows: matrix.length,
    grouping,
  };
}

async function censusFile(fileName) {
  const path = join(CORPUS, fileName);
  const out = { file: fileName, path: resolve(path), sheets: [], errors: [] };
  let names;
  try {
    names = await getSheetNames(new Blob([readFileSync(path)]));
  } catch (e) {
    out.fileError = e.message;
    return out;
  }
  out.sheetCount = names.length;
  out.sheetNames = names;
  for (const s of names) {
    // A sheet that will not parse is a RESULT, not an absence — recorded per
    // sheet rather than thrown, so one metadata tab cannot abort a file.
    try { out.sheets.push(await censusSheet(path, s)); }
    catch (e) { out.errors.push({ sheet: s, error: e.message }); }
  }
  return out;
}

// ── Run ─────────────────────────────────────────────────────────────────────
console.log('S373 Part A — corpus deposit shape census');
console.log('Parse geometry and role inference only. No test runs.\n');
console.log(`corpus directory: ${resolve(CORPUS)}`);
console.log(`  ${FILES.length} enumerated deposits + ${ADDENDUM.length} addendum (CORPUS-01/-02/-03)\n`);

const results = { primary: [], addendum: [] };
for (const f of FILES) results.primary.push(await censusFile(f));
for (const f of ADDENDUM) results.addendum.push(await censusFile(f));

const gtxt = g => g.kind === 'neither' ? 'neither'
  : g.kind === 'column-grouped' ? `col-grouped ${g.nGroups}g  cols/grp ${g.min}/${g.median}/${g.max}`
  : `row-grouped ${g.nGroups}g${g.usable ? '' : ' UNUSABLE'}  rows/grp ${g.min}/${g.median}/${g.max}`;

for (const set of ['primary', 'addendum']) {
  console.log(set === 'primary' ? '══ The 27 enumerated deposits ══\n' : '\n══ Addendum — Shape already measured, censused for comparison ══\n');
  for (const f of results[set]) {
    if (f.fileError) { console.log(`── ${f.file} — FAILED TO LOAD: ${f.fileError}\n`); continue; }
    console.log(`── ${f.file}  (${f.sheetCount} sheet${f.sheetCount === 1 ? '' : 's'}` +
      `${f.errors.length ? `, ${f.errors.length} did not load` : ''})`);
    for (const s of f.sheets) {
      const rc = s.roleCounts;
      console.log(`   ${s.sheet.padEnd(34).slice(0, 34)} raw ${s.rawRows}x${s.rawCols}`.padEnd(72) +
        ` parsed ${s.parsedRows}x${s.parsedCols}`.padEnd(20) +
        ` cond/label/data/attr ${rc.condition}/${rc.label}/${rc.data}/${rc.attribute}`.padEnd(30) +
        ` -> ${s.validRows} valid x ${s.nNumericDataCols} data   ${gtxt(s.grouping)}`);
      if (s.conditionCols.length) console.log(`      condition columns: ${s.conditionCols.join(', ')}`);
    }
    for (const e of f.errors) console.log(`   ${e.sheet.padEnd(34).slice(0, 34)} DID NOT LOAD: ${e.error}`);
    console.log('');
  }
}

// ── The four questions this census was run to answer ────────────────────────
const rows = [];
for (const set of ['primary', 'addendum']) for (const f of results[set]) for (const s of f.sheets) rows.push({ set, file: f.file, ...s });

console.log('══ Answers ══\n');
const q1 = rows.filter(x => x.nNumericDataCols === 2);
console.log(`Q1  sheets presenting exactly two data columns: ${q1.length ? 'YES, ' + q1.length : 'NO'}`);
q1.forEach(x => console.log(`      ${x.file} / "${x.sheet}"  ${x.validRows} valid rows, ${x.grouping.kind}`));

const cg = rows.filter(x => x.grouping.kind === 'column-grouped');
const q2 = cg.filter(x => x.validRows > 100);
console.log(`\nQ2  column-grouped with >100 valid rows: ${q2.length ? 'YES, ' + q2.length : 'NO'}   (${cg.length} column-grouped sheets in all)`);
q2.forEach(x => console.log(`      ${x.file} / "${x.sheet}"  ${x.validRows} rows, ${x.grouping.nGroups} groups`));

const q3 = cg.filter(x => x.grouping.nGroups > 3);
console.log(`\nQ3  column-grouped with >3 groups: ${q3.length ? 'YES, ' + q3.length : 'NO'}`);
q3.forEach(x => console.log(`      ${x.file} / "${x.sheet}"  ${x.grouping.nGroups} groups, ${x.validRows} rows`));

console.log('\nQ4  largest counts anywhere');
const top = (key, n) => [...rows].sort((a, b) => b[key] - a[key]).slice(0, n);
console.log('      valid rows:  ' + top('validRows', 3).map(x => `${x.validRows} (${x.file}/"${x.sheet}")`).join('  |  '));
console.log('      raw rows:    ' + top('rawRows', 3).map(x => `${x.rawRows} (${x.file}/"${x.sheet}")`).join('  |  '));
console.log('      data cols:   ' + top('nNumericDataCols', 3).map(x => `${x.nNumericDataCols} (${x.file}/"${x.sheet}")`).join('  |  '));

// ── Cross-check against §0.3's published S317/S322 census ───────────────────
// The route's own control. These figures were measured by a different session
// through the same pipeline; reproducing them is what licenses the rest of the
// table. Sheet names are the spec's, corrected where it abbreviated.
const KNOWN = [
  ['C12.xlsx', 'Field survey-data', 2412, 132, 16.5, 3],
  ['C16.xlsx', 'Sheet1', 60, 60, null, null],
  ['C22.xlsx', 'Exp. WA', 176, 44, 4, 4],
  ['C20.xlsx', 'Microcosm soil B', 204, 37, 3, 3],
  ['C08.xlsx', 'DATA', 350, 35, 10, 10],
  ['C09.xlsx', 'Sheet1', 60, 20, 3, 3],
  ['C21.xlsx', 'precipitation experiment', 162, 9, 18, 18],  // §0.3 abbreviates to "precipitation exp"
  ['C07.xlsx', 'Mastersheet', 72, 6, 12, 12],
  ['C13.xlsx', 'Soil CO2', 178, 2, 89, 85],
  ['C17.xlsx', 'Neural', 41, 2, 20.5, 19],
  ['CORPUS-01.xlsx', 'Sheet1', 105, 10, 10.5, 6],
  ['CORPUS-03.xlsx', 'Clonal molly behavioral individ', 373, 3, 124, 121],
];
console.log('\n══ Cross-check against §0.3 (S317 census + S322 correction) ══\n');
let ok = 0;
for (const [file, sheet, R, G, M, N] of KNOWN) {
  const x = rows.find(y => y.file === file && y.sheet === sheet);
  if (!x) { console.log(`  ${file} / "${sheet}": NOT FOUND`); continue; }
  const g = x.grouping;
  const match = x.validRows === R && g.nGroups === G && (M === null || g.median === M) && (N === null || g.min === N);
  if (match) ok++;
  console.log(`  ${(file + ' / ' + sheet).padEnd(48)} §0.3 ${R}r ${G}g ${M}/${N}`.padEnd(76) +
    `| measured ${x.validRows}r ${g.nGroups}g ${g.median}/${g.min}  ${match ? 'MATCH' : '** DIFFERS **'}`);
}
console.log(`\n  ${ok}/${KNOWN.length} reproduce exactly.`);
// C14 is deliberately outside KNOWN: §0.3's "9426 rows" is the PARSED count and
// this table's row figure is the VALID count, which is 9398 there. It is the one
// file where the two diverge materially, so listing it would compare two
// different quantities and read as a failure. Its group figures (236, min 1) do
// reproduce — see the C14 row in the table above.

if (process.env.JSON_OUT) {
  writeFileSync(process.env.JSON_OUT, JSON.stringify(results, null, 2));
  console.log(`\nwrote ${process.env.JSON_OUT}`);
}

// probe-s375-p93-census.mjs — S375, the P93 structural census.
//
// P93: the battery has no replicate-identity check. Where a column group holds
// a measurement axis beside a signal — a wavelength column next to an intensity
// column — the engine reads the two as replicates of one measurand, and every
// replicate-based test then runs on a pair that was never a pair.
//
// This probe MEASURES what is there. It decides nothing, adopts no rule and
// changes no behaviour. READ-ONLY on src/: it imports the import chain and
// stops at extractAnalysisInputs, before runFullAnalysis. No test runs, so no
// verdict, flag or severity is computed at any point.
//
// ── The unit is the COLUMN ──────────────────────────────────────────────────
// Not the sheet and not the group. The operative question for each column is
// whether it enters the analysis matrix. Confirmed at source: the sole entry
// is `const dataCols = roles.map((r,i)=>r==="data"?i:-1).filter(i=>i>=0)` at
// src/analysis/engine.js:113 inside extractAnalysisInputs. runFullAnalysis
// receives the matrix as a parameter and never builds one; confirmGrouping.js
// routes through the same function and only ever demotes condition -> label,
// leaving data columns untouched. V1X-DECIDED.md cites this as engine.js:109,
// which is the leading comment of the block — the construct is at :113.
//
// ── Route ───────────────────────────────────────────────────────────────────
// Corpus sheets go through probe-s373-corpus-shape-census.mjs's route, which is
// scripts/corpus-run.mjs's own: parseExcel -> preprocessRaw -> detectBlocks ->
// detectHeaderRows -> inferBaseRoles -> detectGroupAttributes ->
// extractAnalysisInputs. prepStructure below is copied from that probe rather
// than reimplemented. Fixtures go through validate-batch.mjs's own preparation
// block (Papa -> preprocessRaw -> detectHeaderRows -> forwardFill -> inferRoles
// -> extractAnalysisInputs). An instrument that builds its own matrix measures
// itself, not the path under test.
//
// ── Where the data lives ────────────────────────────────────────────────────
// corpus-data/ is gitignored (.gitignore:61), so it exists in the main checkout
// and NOT in a worktree. The resolver walks up and prints which directory it
// used. test/fixtures/ is tracked and present in the worktree.
//
// Usage:
//   node test/probes/probe-s375-p93-census.mjs              # all three parts
//   node test/probes/probe-s375-p93-census.mjs --sheets     # Part 1 only
//   node test/probes/probe-s375-p93-census.mjs --fixtures   # Part 2 only
//   node test/probes/probe-s375-p93-census.mjs --tabulate   # Part 3 (runs 1+2)
//   CORPUS_DIR=/path/to/corpus-data node ... --sheets
//
// Env: JSON_OUT — also write the full per-column record as JSON.

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, join, resolve } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles, inferBaseRoles, detectGroupAttributes } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { summarize } = await import('../../src/import/summary.js');
const { parseExcel, getSheetNames } = await import('../../src/import/excel.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const ARGS = process.argv.slice(2);
const ALL = !ARGS.some(a => a.startsWith('--'));
const WANT_PASS2 = ALL || ARGS.includes('--pass2');
const WANT_SHEETS = ALL || ARGS.includes('--sheets') || ARGS.includes('--tabulate') || WANT_PASS2;
const WANT_FIX = ALL || ARGS.includes('--fixtures') || ARGS.includes('--tabulate') || WANT_PASS2;
const WANT_TAB = ALL || ARGS.includes('--tabulate');

// ── Corpus directory ────────────────────────────────────────────────────────
const CANDIDATES = [
  process.env.CORPUS_DIR,
  'corpus-data',
  resolve(process.cwd(), '../../../corpus-data'),   // worktree -> main checkout
].filter(Boolean);
const CORPUS = CANDIDATES.find(d => existsSync(d)) || null;

// The two files that hold every column-grouped sheet in the corpus, per the
// S373 census. Enumerated rather than globbed so the Part 1 gate below is a
// re-count from the files and not a re-read of that census's answer: the sweep
// walks every sheet of both files and keeps the ones the pipeline
// column-groups.
const SHEET_FILES = ['C25.xlsx', 'C15.xlsx'];
const FIXTURES = 'test/fixtures';

// ── prepStructure — copied verbatim from probe-s373-corpus-shape-census.mjs,
// which copied it from scripts/corpus-run.mjs:146-195. ─────────────────────
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
  const { roles } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, longFormatDetected, nH, nBlocks, prep };
}

const nameOf = (hdrs, c) => (hdrs[c] != null && String(hdrs[c]).trim()) ? String(hdrs[c]).trim() : `Col ${c + 1}`;

// ── The per-column measurement ──────────────────────────────────────────────
// Applied to a column of the ANALYSIS MATRIX — post-pipeline, valid rows only.
// That is what every replicate-based test reads, so it is the honest subject.
//
// Policies, stated because each one could reasonably be set the other way:
//   * monotonicity and first differences are taken over consecutive NON-NULL
//     values in row order. A null is skipped, not treated as a break.
//   * strictly increasing means every step is > 0; strictly decreasing every
//     step < 0. A repeated value makes a column neither.
//   * the coefficient of variation of the first differences is
//     sd(diffs) / |mean(diffs)|, sample sd (n-1). Undefined and reported null
//     when there are fewer than two differences or the mean difference is 0.
//   * distinct counts exact float values.
// Ten values from the head, ten from the tail and ten from the middle of the
// NON-NULL series, in row order. Enough to adjudicate a column by eye without
// printing a spectrum. The middle block is centred on the series midpoint.
function sampleValues(values, n = 10) {
  const v = values.filter(x => x !== null && x !== undefined && Number.isFinite(x));
  if (!v.length) return { first: [], mid: [], last: [], n: 0, midFrom: null };
  const midStart = Math.max(0, Math.floor(v.length / 2) - Math.floor(n / 2));
  return {
    n: v.length,
    first: v.slice(0, n),
    mid: v.slice(midStart, midStart + n),
    midFrom: midStart,
    last: v.slice(Math.max(0, v.length - n)),
  };
}

function measureColumn(values) {
  const vals = [];
  let nNull = 0;
  for (const v of values) {
    if (v === null || v === undefined || !Number.isFinite(v)) { nNull++; continue; }
    vals.push(v);
  }
  const n = vals.length;
  const out = {
    nRows: values.length, nNull, nValues: n,
    min: null, max: null, nDistinct: null, mean: null, sd: null, cv: null,
    monotone: 'n/a', diffCV: null, meanDiff: null, sdDiff: null, nZeroDiff: null,
  };
  if (!n) return out;
  const mu = vals.reduce((a, b) => a + b, 0) / n;
  out.mean = mu;
  if (n >= 2) {
    out.sd = Math.sqrt(vals.reduce((a, b) => a + (b - mu) * (b - mu), 0) / (n - 1));
    if (mu !== 0) out.cv = out.sd / Math.abs(mu);
  }
  let mn = vals[0], mx = vals[0];
  const seen = new Set();
  for (const v of vals) { if (v < mn) mn = v; if (v > mx) mx = v; seen.add(v); }
  out.min = mn; out.max = mx; out.nDistinct = seen.size;
  if (n < 2) { out.monotone = 'n/a'; return out; }

  let inc = true, dec = true, nZero = 0;
  const diffs = new Array(n - 1);
  for (let i = 1; i < n; i++) {
    const d = vals[i] - vals[i - 1];
    diffs[i - 1] = d;
    if (!(d > 0)) inc = false;
    if (!(d < 0)) dec = false;
    if (d === 0) nZero++;
  }
  out.monotone = inc ? 'increasing' : dec ? 'decreasing' : 'neither';
  out.nZeroDiff = nZero;
  const m = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  out.meanDiff = m;
  if (diffs.length >= 2) {
    const v = diffs.reduce((a, b) => a + (b - m) * (b - m), 0) / (diffs.length - 1);
    out.sdDiff = Math.sqrt(v);
    if (m !== 0) out.diffCV = out.sdDiff / Math.abs(m);
  }
  return out;
}

// ── Cross-group identity, measured two ways ─────────────────────────────────
// For each POSITION within a group, take that position's column from every
// group and ask two separate questions:
//   (1) value-identical across all groups on the rows they share, where "the
//       rows they share" are the rows on which every one of those columns is
//       non-null;
//   (2) if not identical, the largest number of LEADING rows on which they do
//       agree — walked from row 0, stopping at the first row where any of them
//       is null or any two differ.
// Exact float equality. The ground truth this is aimed at (a spectrum starting
// at 414.2 nm against 400.0) is not a floating-point question.
function crossGroupIdentity(getCol, groupColsByPos, nRows) {
  const out = [];
  for (let p = 0; p < groupColsByPos.length; p++) {
    const cols = groupColsByPos[p];
    if (cols.length < 2) { out.push({ position: p + 1, nGroups: cols.length, comparable: false }); continue; }
    const series = cols.map(getCol);
    let shared = 0, agreeOnShared = 0, leading = 0, leadingOpen = true;
    for (let r = 0; r < nRows; r++) {
      const vs = series.map(s => s[r]);
      const allPresent = vs.every(v => v !== null && v !== undefined && Number.isFinite(v));
      const allEqual = allPresent && vs.every(v => v === vs[0]);
      if (allPresent) { shared++; if (allEqual) agreeOnShared++; }
      if (leadingOpen) { if (allPresent && allEqual) leading++; else leadingOpen = false; }
    }
    out.push({
      position: p + 1, nGroups: cols.length, comparable: true,
      sharedRows: shared, agreeingSharedRows: agreeOnShared,
      identical: shared > 0 && agreeOnShared === shared,
      leadingAgreement: leading,
    });
  }
  return out;
}

// ── Part 1 — the fifteen column-grouped sheets ──────────────────────────────
async function censusSheet(path, sheetName) {
  const blob = new Blob([readFileSync(path)]);
  const { rows: raw, sheetName: sheetUsed } = await parseExcel(blob, sheetName);
  const rawRows = raw.length;
  const rawCols = raw.reduce((m, r) => Math.max(m, r.length), 0);

  const { hdrs, data, condPerCol, roles, nH, nBlocks, prep } = prepStructure(raw);

  // The trim has TWO stages and they are not the same quantity. preprocessRaw
  // drops empty columns and sparse rows BEFORE anything is parsed; the
  // completeness filter inside extractAnalysisInputs drops rows where every
  // data cell is null. Reporting one number for "the trim" hides which stage
  // moved, and on these sheets the two answers are very different.
  const parseTrim = { trimmedRows: prep.trimmedRows ?? null, skippedRows: prep.skippedRows ?? null, removedCols: prep.removedCols ?? [] };

  // Pre-trim column shape, so a column TRUNCATED by the parse-stage trim is
  // visible in the census rather than only in the post-trim numbers. Only
  // computed when the raw sheet maps cleanly onto the parsed one: a single
  // block, no leading rows stripped, and the header row matching. Otherwise
  // reported unavailable rather than guessed.
  const kept = [];
  const removedSet = new Set(parseTrim.removedCols);
  const rawWidth = raw.reduce((m, r) => Math.max(m, r.length), 0);
  for (let c = 0; c < rawWidth; c++) if (!removedSet.has(c)) kept.push(c);
  // The header row is LOCATED in the raw sheet by content rather than assumed
  // to sit at index nH-1. preprocessRaw's row trim and prepStructure's leading-
  // row strip both shift it, and an assumed index silently mis-maps instead of
  // refusing. If no raw row matches the parsed header exactly, the pre-trim
  // read is reported unavailable.
  const norm = v => v == null ? '' : String(v).trim();
  let rawColOfParsed = null, rawHeaderIdx = -1;
  if (nBlocks === 1 && kept.length >= hdrs.length) {
    const candidate = kept.slice(0, hdrs.length);
    for (let ri = 0; ri < raw.length; ri++) {
      const row = raw[ri] || [];
      if (candidate.every((rc, pc) => norm(row[rc]) === norm(hdrs[pc]) || norm(hdrs[pc]).startsWith('Col '))) {
        rawColOfParsed = candidate; rawHeaderIdx = ri; break;
      }
    }
  }
  const rawDataRows = rawColOfParsed ? raw.slice(rawHeaderIdx + 1) : null;

  const auto = detectAssay(basename(path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;

  const dataCols = roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const dataColHeaders = dataCols.map(c => nameOf(hdrs, c));

  const { matrix, condCtx, filteredIndices } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing,
    colRelationship: 'replicates', dataColHeaders,
  });

  if (condCtx.type !== 'column-grouped') {
    return { sheet: sheetUsed, columnGrouped: false, groupingKind: condCtx.type,
             rawRows, rawCols, parsedRows: data.length, parsedCols: hdrs.length, validRows: matrix.length };
  }

  const slices = condCtx.slices();
  // matrix column -> raw column
  const rawOfMatrixCol = dataCols;

  const groups = slices.map(s => ({
    name: s.name,
    matrixCols: s.colIndices || [],
    rawCols: (s.colIndices || []).map(mc => rawOfMatrixCol[mc]),
  }));

  // Every column in the two-row-header span, whether or not it became data.
  // A group span holding a non-data column is exactly the case a data-column-
  // only enumeration would miss, so it is enumerated from condPerCol.
  const spanMembers = {};
  condPerCol.forEach((g, c) => { if (g) (spanMembers[g] ||= []).push(c); });

  const columns = [];
  for (const g of groups) {
    const span = spanMembers[g.name] || g.rawCols;
    span.forEach((rc, posInSpan) => {
      const mc = dataCols.indexOf(rc);
      const inMatrix = mc >= 0;
      const rec = {
        group: g.name, positionInGroup: posInSpan + 1,
        rawCol: rc, header: nameOf(hdrs, rc), role: roles[rc],
        entersDataCols: inMatrix, matrixCol: inMatrix ? mc : null,
      };
      // Post-pipeline (analysis-matrix) measurement — what the tests read.
      if (inMatrix) Object.assign(rec, measureColumn(matrix.map(r => r[mc])));
      // Post-parse, pre-completeness-filter measurement.
      const parsedVals = data.map(r => { const v = r[rc]; if (v == null || v === '') return null; const n = Number(v); return Number.isNaN(n) ? null : n; });
      rec.parsed = measureColumn(parsedVals);
      if (inMatrix) rec.sample = sampleValues(matrix.map(r => r[mc]));
      // Pre-trim measurement — the sheet as deposited. A column whose span
      // shrinks between here and the matrix was TRUNCATED by the parse trim.
      if (rawDataRows) {
        const src = rawColOfParsed[rc];
        const rawVals = rawDataRows.map(r => { const v = r[src]; if (v == null || String(v).trim() === '') return null; const n = Number(v); return Number.isNaN(n) ? null : n; });
        rec.preTrim = measureColumn(rawVals);
        rec.truncatedByParseTrim = rec.preTrim.nValues > 0 && rec.nValues > 0 &&
          (rec.preTrim.max !== rec.max || rec.preTrim.min !== rec.min);
      } else {
        rec.preTrim = null; rec.truncatedByParseTrim = null;
      }
      columns.push(rec);
    });
  }

  // Cross-group identity, on the matrix and again on the parsed rows.
  const sizes = groups.map(g => g.matrixCols.length);
  const maxSize = Math.max(...sizes);
  const byPosMatrix = [], byPosParsed = [];
  for (let p = 0; p < maxSize; p++) {
    byPosMatrix.push(groups.filter(g => g.matrixCols.length > p).map(g => g.matrixCols[p]));
    byPosParsed.push(groups.filter(g => g.rawCols.length > p).map(g => g.rawCols[p]));
  }
  const idMatrix = crossGroupIdentity(mc => matrix.map(r => r[mc]), byPosMatrix, matrix.length);
  const parsedCol = rc => data.map(r => { const v = r[rc]; if (v == null || v === '') return null; const n = Number(v); return Number.isNaN(n) ? null : n; });
  const idParsed = crossGroupIdentity(parsedCol, byPosParsed, data.length);

  return {
    sheet: sheetUsed, columnGrouped: true, headerRows: nH,
    rawRows, rawCols, parsedRows: data.length, parsedCols: hdrs.length,
    validRows: matrix.length, nDataCols: dataCols.length,
    parseTrim, trimmedAtParse: parseTrim.trimmedRows, trimmedAtMatrix: data.length - matrix.length,
    preTrimReadable: !!rawDataRows,
    nGroups: groups.length, groupSizes: sizes, groupNames: groups.map(g => g.name),
    columns, identityMatrix: idMatrix, identityParsed: idParsed,
  };
}

async function runSheets() {
  if (!CORPUS) {
    console.log('corpus directory NOT FOUND. Tried: ' + CANDIDATES.map(c => resolve(c)).join(', '));
    console.log('Part 1 is UNREACHED — not empty. Set CORPUS_DIR and re-run.');
    return null;
  }
  const out = [];
  for (const f of SHEET_FILES) {
    const path = join(CORPUS, f);
    if (!existsSync(path)) { out.push({ file: f, fileError: 'not on disk at ' + resolve(path) }); continue; }
    let names;
    try { names = await getSheetNames(new Blob([readFileSync(path)])); }
    catch (e) { out.push({ file: f, fileError: e.message }); continue; }
    for (const s of names) {
      try {
        const rec = await censusSheet(path, s);
        out.push({ file: f, ...rec });
      } catch (e) {
        // A sheet that will not parse is a RESULT, not an absence.
        out.push({ file: f, sheet: s, sheetError: e.message });
      }
    }
  }
  return out;
}

// ── Part 2 — the 27 fixtures ────────────────────────────────────────────────
function censusFixture(file, expected) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const rawRows = raw.length;
  const rawCols = raw.reduce((m, r) => Math.max(m, r.length), 0);

  const pp = preprocessRaw(raw);
  raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const hdrs = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, hdrs, condPerCol);

  const dataCols = roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

  const kind = condCtx.type;
  let groups;
  if (kind === 'column-grouped') {
    groups = condCtx.slices().map(s => ({
      name: s.name, matrixCols: s.colIndices || [],
      rawCols: (s.colIndices || []).map(mc => dataCols[mc]),
    }));
  } else {
    // One implicit group holding every data column — the shape every
    // replicate-based test sees when nothing column-groups.
    groups = [{ name: '(single implicit group)', matrixCols: dataCols.map((_, i) => i), rawCols: dataCols }];
  }

  const columns = [];
  for (const g of groups) {
    g.matrixCols.forEach((mc, p) => {
      const rc = dataCols[mc];
      columns.push({
        group: g.name, positionInGroup: p + 1,
        rawCol: rc, header: nameOf(hdrs, rc), role: roles[rc],
        entersDataCols: true, matrixCol: mc,
        ...measureColumn(matrix.map(r => r[mc])),
      });
    });
  }

  let identity = [];
  if (groups.length > 1) {
    const sizes = groups.map(g => g.matrixCols.length);
    const byPos = [];
    for (let p = 0; p < Math.max(...sizes); p++) byPos.push(groups.filter(g => g.matrixCols.length > p).map(g => g.matrixCols[p]));
    identity = crossGroupIdentity(mc => matrix.map(r => r[mc]), byPos, matrix.length);
  }

  return {
    file, groupingKind: kind, headerRows,
    rawRows, rawCols, parsedRows: data.length, parsedCols: hdrs.length,
    validRows: matrix.length, trimmedFromParsed: data.length - matrix.length,
    nDataCols: dataCols.length, nGroups: groups.length,
    groupSizes: groups.map(g => g.matrixCols.length), groupNames: groups.map(g => g.name),
    assay: expected?.assay ?? null,
    columns, identity, _matrix: matrix,
  };
}

function runFixtures() {
  const out = [];
  for (const [file, expected] of Object.entries(EXPECTED)) {
    try { out.push(censusFixture(file, expected)); }
    catch (e) { out.push({ file, error: e.message }); }
  }
  return out;
}

// ── Part 3 — the discriminator tabulation ───────────────────────────────────
// Arithmetic over what Parts 1 and 2 returned. No new reads, no rule adopted,
// nothing ranked.
//
// The AXIS reference set is AUTHORED, not measured: it is read off the header
// text of the fifteen sheets' columns and recorded here as an explicit list of
// header strings. It has to be authored, because "which column is the axis" is
// the very thing no measurement in the battery currently answers — that is
// P93. Candidate 4 is therefore partly circular against this reference and the
// report says so.
// Every entry below is a header string this census actually measured on one of
// the fifteen sheets — nothing speculative. The five uncontested members name a
// physical quantity the instrument swept: wavelength, elapsed time, decay time,
// temperature, magnetic field.
const AXIS_HEADERS_CORE = [
  'Wavelength (nm)', 'Time (s)', 'Decay time (s)', 'Temperature (K)', 'Magnetic field (mT)',
];
// CONTESTED. Fig. 4b plots ln(Tm²/βh) against 1/(kB·Tm) — an Arrhenius fit. The
// first is the abscissa of that plot, so it is an axis in the plotting sense,
// but it is DERIVED from the measured peak temperature rather than swept by an
// instrument. Both columns of every Fig. 4b group are strictly decreasing, so
// the choice moves the tabulation. Counted in, and the count without it is
// reported beside it.
const AXIS_HEADERS_CONTESTED = ['1/(KB*Tm) (eV-1)'];
const AXIS_HEADERS = new Set([...AXIS_HEADERS_CORE, ...AXIS_HEADERS_CONTESTED]);
const KEYWORDS = ['time', 'wavelength', 'nm', 's', 'cycle', 'index'];

function keywordHit(header) {
  // Word-level match against the small keyword set, case-insensitive. Split on
  // anything that is not a letter or digit so "Time (s)" yields time and s, and
  // "Intensity (a.u.)" yields intensity, a and u. A substring match would make
  // "s" hit every header that contains the letter, which is not a rule anyone
  // proposed.
  const toks = String(header).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return KEYWORDS.some(k => toks.includes(k));
}

const CANDIDATES_TAB = [
  { id: 1, name: 'strictly monotone', test: c => c.monotone === 'increasing' || c.monotone === 'decreasing' },
  { id: 2, name: 'strictly monotone and first-difference CV < 0.01', test: c => (c.monotone === 'increasing' || c.monotone === 'decreasing') && c.diffCV !== null && c.diffCV < 0.01 },
  { id: 3, name: 'value-identical to same-position column in every other group', test: c => c._identicalAcrossGroups === true },
  { id: 4, name: 'header matches keyword set {time, wavelength, nm, s, cycle, index}', test: c => keywordHit(c.header) },
  { id: 5, name: 'first column position within its group', test: c => c.positionInGroup === 1 },
];

// ── Degenerate-measurement check ────────────────────────────────────────────
// A measurement returning the same value on every unit cannot discriminate
// anything and will look like a clean result. Reported rather than hidden.
function constantFields(rows, fields) {
  const out = [];
  for (const f of fields) {
    const vals = rows.map(r => JSON.stringify(r[f] ?? null));
    const set = new Set(vals);
    if (set.size === 1) out.push({ field: f, value: JSON.parse([...set][0]) });
  }
  return out;
}

// ── Run ─────────────────────────────────────────────────────────────────────
const fmt = (v, d = 4) => v === null || v === undefined ? '—' : (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toPrecision(d)) : String(v));

console.log('S375 — P93 structural census');
console.log('Read-only. Import and role inference only; stops before runFullAnalysis.\n');
if (CORPUS) console.log(`corpus directory: ${resolve(CORPUS)}`);
console.log(`fixture directory: ${resolve(FIXTURES)}\n`);

let sheets = null, fixtures = null;

if (WANT_SHEETS) {
  sheets = await runSheets();
  if (sheets) {
    const cg = sheets.filter(s => s.columnGrouped);
    const byFile = {};
    cg.forEach(s => { (byFile[s.file] ||= []).push(s.sheet); });

    console.log('══ Part 1 — enumeration gate ══\n');
    console.log(`  column-grouped sheets found: ${cg.length}`);
    for (const [f, ss] of Object.entries(byFile)) console.log(`    ${f}  ${ss.length}  — ${ss.join(', ')}`);
    const c25 = (byFile['C25.xlsx'] || []).length, c15 = (byFile['C15.xlsx'] || []).length;
    const gate = cg.length === 15 && c25 === 12 && c15 === 3;
    console.log(`\n  E1 stated: 15 sheets, 12 C25 and 3 C15.  measured: ${cg.length}, ${c25} C25 and ${c15} C15.  ${gate ? 'HELD' : 'INVERTED — STOP'}`);
    console.log(`  E2 stated: C15's three are sheets other than "Data".  measured: ${(byFile['C15.xlsx'] || []).join(', ')}  ` +
      `${(byFile['C15.xlsx'] || []).includes('Data') ? 'INVERTED' : 'HELD'}\n`);

    console.log('══ Part 1 — per-sheet extents and shape ══\n');
    console.log('  The trim has two stages. "at parse" is preprocessRaw dropping sparse rows before');
    console.log('  anything is parsed; "at matrix" is the completeness filter inside');
    console.log('  extractAnalysisInputs dropping all-null rows. They are different quantities.\n');
    console.log('  sheet            raw extent   parsed        valid   trim@parse  trim@matrix  groups  cols/grp');
    for (const s of cg) {
      console.log(`  ${(s.file.replace('.xlsx', '') + '/' + s.sheet).padEnd(16)} ` +
        `${(s.rawRows + 'x' + s.rawCols).padEnd(12)} ${(s.parsedRows + 'x' + s.parsedCols).padEnd(13)} ` +
        `${String(s.validRows).padStart(5)}   ${String(s.trimmedAtParse).padStart(9)}   ${String(s.trimmedAtMatrix).padStart(10)}   ${String(s.nGroups).padStart(6)}  ${s.groupSizes.join('/')}`);
    }
    const totParse = cg.reduce((a, s) => a + (s.trimmedAtParse || 0), 0);
    const totMatrix = cg.reduce((a, s) => a + s.trimmedAtMatrix, 0);
    console.log(`\n  totals across the fifteen sheets: ${totParse} rows dropped at parse, ${totMatrix} at the matrix.`);

    const trunc = cg.flatMap(s => s.columns.filter(c => c.truncatedByParseTrim).map(c => ({ s, c })));
    console.log(`\n  columns whose value range CHANGED across the parse trim (truncated): ${trunc.length}`);
    for (const { s, c } of trunc) {
      console.log(`    ${(s.file.replace('.xlsx', '') + '/' + s.sheet).padEnd(16)} grp "${c.group}" / "${c.header}"`);
      console.log(`      as deposited: ${c.preTrim.nValues} values, ${fmt(c.preTrim.min)} -> ${fmt(c.preTrim.max)}`);
      console.log(`      as analysed:  ${c.nValues} values, ${fmt(c.min)} -> ${fmt(c.max)}`);
    }
    const unreadable = cg.filter(s => !s.preTrimReadable);
    if (unreadable.length) console.log(`  pre-trim shape unreadable on ${unreadable.length} sheet(s): ${unreadable.map(s => s.sheet).join(', ')}`);

    console.log('\n══ Part 1 — per-column measurements ══\n');
    for (const s of cg) {
      console.log(`── ${s.file.replace('.xlsx', '')} / "${s.sheet}"  —  ${s.validRows} valid rows, ${s.nGroups} groups of ${s.groupSizes.join('/')}`);
      console.log('   grp pos  header                                     data?  monotone     diffCV      min          max          distinct  nulls');
      for (const c of s.columns) {
        console.log(`   ${String(s.groupNames.indexOf(c.group) + 1).padStart(3)} ${String(c.positionInGroup).padStart(3)}  ` +
          `${String(c.header).padEnd(42).slice(0, 42)} ${(c.entersDataCols ? 'yes' : 'NO ' + c.role).padEnd(6)} ` +
          `${String(c.monotone ?? '—').padEnd(12)} ${fmt(c.diffCV).padEnd(11)} ${fmt(c.min).padEnd(12)} ${fmt(c.max).padEnd(12)} ` +
          `${String(c.nDistinct ?? '—').padStart(8)}  ${String(c.nNull ?? '—').padStart(5)}`);
      }
      console.log('   cross-group identity (analysis matrix):');
      for (const i of s.identityMatrix) {
        console.log(`     position ${i.position} across ${i.nGroups} groups: ` +
          (i.comparable ? `${i.identical ? 'IDENTICAL' : 'NOT identical'}  ` +
            `(${i.agreeingSharedRows}/${i.sharedRows} shared rows agree; leading agreement ${i.leadingAgreement} rows)` : 'not comparable'));
      }
      console.log('   cross-group identity (parsed rows, pre-trim — diagnostic):');
      for (const i of s.identityParsed) {
        console.log(`     position ${i.position} across ${i.nGroups} groups: ` +
          (i.comparable ? `${i.identical ? 'IDENTICAL' : 'NOT identical'}  ` +
            `(${i.agreeingSharedRows}/${i.sharedRows} shared rows agree; leading agreement ${i.leadingAgreement} rows)` : 'not comparable'));
      }
      console.log('');
    }

    // Degenerate check over sheet columns.
    const allCols = cg.flatMap(s => s.columns);
    const cst = constantFields(allCols, ['entersDataCols', 'monotone', 'role', 'positionInGroup', 'nDistinct', 'nNull', 'truncatedByParseTrim']);
    console.log('  measurements constant across every sheet column (cannot discriminate):');
    console.log(cst.length ? cst.map(x => `    ${x.field} = ${JSON.stringify(x.value)} on all ${allCols.length}`).join('\n') : '    none');
    const cstS = constantFields(cg, ['trimmedAtMatrix', 'columnGrouped', 'preTrimReadable']);
    console.log('  measurements constant across every sheet (cannot discriminate):');
    console.log(cstS.length ? cstS.map(x => `    ${x.field} = ${JSON.stringify(x.value)} on all ${cg.length}`).join('\n') : '    none');

    // ── E3 and E5, read off the measurements above ──────────────────────────
    const mono = allCols.filter(c => c.monotone === 'increasing' || c.monotone === 'decreasing');
    const axisCols = allCols.filter(c => AXIS_HEADERS.has(c.header));
    const axisNotMono = axisCols.filter(c => !(c.monotone === 'increasing' || c.monotone === 'decreasing'));
    const axisUneven = axisCols.filter(c => c.diffCV === null || c.diffCV >= 0.01);
    console.log(`\n  E5 stated: every axis column is strictly monotone with near-constant spacing.`);
    console.log(`     axis columns (authored reference set): ${axisCols.length} of ${allCols.length}`);
    console.log(`     NOT strictly monotone: ${axisNotMono.length}`);
    axisNotMono.forEach(c => {
      const s = cg.find(x => x.columns.includes(c));
      console.log(`       ${s.file.replace('.xlsx', '')}/"${s.sheet}"  grp "${c.group}" / "${c.header}"  ${c.monotone}, ${c.nZeroDiff} zero steps of ${c.nValues - 1}`);
    });
    console.log(`     first-difference CV at or above 0.01 (spacing NOT near-constant): ${axisUneven.length} of ${axisCols.length}`);
    const byCV = [...axisCols].sort((a, b) => (b.diffCV ?? -1) - (a.diffCV ?? -1)).slice(0, 8);
    byCV.forEach(c => {
      const s = cg.find(x => x.columns.includes(c));
      console.log(`       ${(s.file.replace('.xlsx', '') + '/' + s.sheet).padEnd(16)} "${c.header}" diffCV ${fmt(c.diffCV)}`);
    });
    console.log(`     ${axisNotMono.length === 0 && axisUneven.length === 0 ? 'HELD' : 'INVERTED'}`);

    console.log(`\n  E3 stated: half of every C25 group's columns is an axis.`);
    const c25sheets = cg.filter(s => s.file === 'C25.xlsx');
    let e3ok = 0;
    for (const s of c25sheets) {
      const perGroup = {};
      s.columns.forEach(c => { (perGroup[c.group] ||= []).push(c); });
      const ok = Object.values(perGroup).every(cols => cols.filter(c => AXIS_HEADERS.has(c.header)).length * 2 === cols.length);
      if (ok) e3ok++;
      if (!ok) {
        const g0 = Object.values(perGroup)[0];
        console.log(`     ${s.sheet}: NOT half — ${g0.filter(c => AXIS_HEADERS.has(c.header)).length} of ${g0.length} per group; headers ${g0.map(c => JSON.stringify(c.header)).join(', ')}`);
      }
    }
    console.log(`     ${e3ok} of ${c25sheets.length} C25 sheets carry an axis on exactly half of every group's columns.`);

    console.log(`\n  E4 stated: C15's three sheets are not axis-plus-signal.`);
    const c15cols = cg.filter(s => s.file === 'C15.xlsx').flatMap(s => s.columns);
    console.log(`     C15 column headers: ${[...new Set(c15cols.map(c => c.header))].map(h => JSON.stringify(h)).join(', ')}`);
    console.log(`     C15 axis columns under the authored reference set: ${c15cols.filter(c => AXIS_HEADERS.has(c.header)).length} of ${c15cols.length}`);

    console.log(`\n  E6 stated: cross-group value identity fails on Fig. 2b.`);
    const f2b = cg.find(s => s.sheet === 'Fig. 2b');
    if (f2b) f2b.identityMatrix.forEach(i => console.log(`     position ${i.position}: ${i.identical ? 'IDENTICAL' : 'NOT identical'} (leading agreement ${i.leadingAgreement} rows of ${i.sharedRows} shared)`));
    const idPos1 = cg.map(s => ({ sheet: s.file.replace('.xlsx', '') + '/' + s.sheet, id: s.identityMatrix[0] }));
    console.log(`\n  position-1 identity across all fifteen sheets: ${idPos1.filter(x => x.id.identical).length} identical, ${idPos1.filter(x => !x.id.identical).length} not.`);
    console.log(`     identical: ${idPos1.filter(x => x.id.identical).map(x => x.sheet).join(', ') || '(none)'}`);
    console.log('');
  }
}

if (WANT_FIX) {
  fixtures = runFixtures();
  console.log('\n══ Part 2 — the 27 fixtures ══\n');
  console.log('  fixture                              grouping        raw        valid  trim  dcols  groups  cols/grp');
  for (const f of fixtures) {
    if (f.error) { console.log(`  ${f.file.padEnd(36)} ERROR: ${f.error}`); continue; }
    console.log(`  ${f.file.padEnd(36)} ${f.groupingKind.padEnd(15)} ${(f.rawRows + 'x' + f.rawCols).padEnd(10)} ${String(f.validRows).padStart(5)}  ${String(f.trimmedFromParsed).padStart(4)}  ${String(f.nDataCols).padStart(5)}  ${String(f.nGroups).padStart(6)}  ${f.groupSizes.join('/')}`);
  }

  console.log('\n══ Part 2 — per-column measurements ══\n');
  for (const f of fixtures) {
    if (f.error) continue;
    console.log(`── ${f.file}  —  ${f.groupingKind}, ${f.validRows} valid rows, ${f.nGroups} group(s) of ${f.groupSizes.join('/')}`);
    console.log('   grp pos  header                        monotone     diffCV      min          max          distinct  nulls');
    for (const c of f.columns) {
      console.log(`   ${String(f.groupNames.indexOf(c.group) + 1).padStart(3)} ${String(c.positionInGroup).padStart(3)}  ` +
        `${String(c.header).padEnd(29).slice(0, 29)} ${String(c.monotone).padEnd(12)} ${fmt(c.diffCV).padEnd(11)} ` +
        `${fmt(c.min).padEnd(12)} ${fmt(c.max).padEnd(12)} ${String(c.nDistinct).padStart(8)}  ${String(c.nNull).padStart(5)}`);
    }
    if (f.identity.length) {
      console.log('   cross-group identity:');
      for (const i of f.identity) console.log(`     position ${i.position} across ${i.nGroups} groups: ` +
        (i.comparable ? `${i.identical ? 'IDENTICAL' : 'NOT identical'}  (${i.agreeingSharedRows}/${i.sharedRows} shared rows agree; leading ${i.leadingAgreement})` : 'not comparable'));
    }
    console.log('');
  }

  const fixCols = fixtures.filter(f => !f.error).flatMap(f => f.columns);
  const mono = fixCols.filter(c => c.monotone === 'increasing' || c.monotone === 'decreasing');
  console.log(`  E8 stated: no fixture data column is strictly monotone with even spacing.`);
  console.log(`     measured: ${mono.length} of ${fixCols.length} fixture data columns are strictly monotone.`);
  mono.forEach(c => {
    const f = fixtures.find(x => x.columns && x.columns.includes(c));
    console.log(`       ${f.file} / "${c.header}"  ${c.monotone}, diffCV ${fmt(c.diffCV)}, ${c.nDistinct} distinct`);
  });
  const evenMono = mono.filter(c => c.diffCV !== null && c.diffCV < 0.01);
  console.log(`     of those, ${evenMono.length} also carry a first-difference CV below 0.01.`);
  evenMono.forEach(c => {
    const f = fixtures.find(x => x.columns && x.columns.includes(c));
    console.log(`       ${f.file} / "${c.header}"  diffCV ${fmt(c.diffCV)}`);
  });

  const cgFix = fixtures.filter(f => !f.error && f.groupingKind === 'column-grouped');
  console.log(`\n  E7 stated: four fixtures column-group — DS01, DS02, DS16, DS17 — at 35 and 60 rows;`);
  console.log(`     the widest fixture in the corpus is 1,501 rows by 19 columns.`);
  console.log(`     measured column-grouped: ${cgFix.length} — ${cgFix.map(f => f.file + ' (' + f.validRows + 'r)').join(', ')}`);
  const widest = fixtures.filter(f => !f.error).reduce((a, b) => (b.nDataCols > a.nDataCols ? b : a));
  const tallest = fixtures.filter(f => !f.error).reduce((a, b) => (b.validRows > a.validRows ? b : a));
  console.log(`     most data columns: ${widest.file} at ${widest.nDataCols} (${widest.validRows} valid rows)`);
  console.log(`     most valid rows:   ${tallest.file} at ${tallest.validRows} (${tallest.nDataCols} data columns)`);

  // ── The two Part 2 sub-questions ──────────────────────────────────────────
  // Both are claims already on record. Neither is assumed; both are read off
  // the fixture data by the same measurements the rest of Part 2 uses, with a
  // pairwise Pearson correlation added because "are these replicates of one
  // measurand" is partly a question about agreement and not only about scale.
  const pearson = (a, b) => {
    const xs = [], ys = [];
    for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null && Number.isFinite(a[i]) && Number.isFinite(b[i])) { xs.push(a[i]); ys.push(b[i]); }
    const n = xs.length; if (n < 3) return null;
    const mx = xs.reduce((p, q) => p + q, 0) / n, my = ys.reduce((p, q) => p + q, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return (sxx > 0 && syy > 0) ? sxy / Math.sqrt(sxx * syy) : null;
  };

  console.log('\n══ Part 2 — sub-question 1: DS23 and DS24 ══\n');
  console.log('  STATUS records these as three unrelated columns at different scales that the');
  console.log('  engine reads as replicates of one measurand, citing');
  console.log('  archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:27. Read off the fixture data:\n');
  for (const name of ['23-recurrence-null-mixed.csv', '24-recurrence-null-control.csv']) {
    const f = fixtures.find(x => x.file === name);
    if (!f) { console.log(`  ${name}: NOT FOUND`); continue; }
    console.log(`  ${name}  —  ${f.groupingKind}, ${f.validRows} rows, one implicit group of ${f.nDataCols}`);
    console.log('    column     mean         sd           CV        min          max          distinct');
    f.columns.forEach(c => console.log(`    ${c.header.padEnd(10)} ${fmt(c.mean).padEnd(12)} ${fmt(c.sd).padEnd(12)} ${fmt(c.cv).padEnd(9)} ${fmt(c.min).padEnd(12)} ${fmt(c.max).padEnd(12)} ${c.nDistinct}`));
    const means = f.columns.map(c => c.mean).filter(v => v != null);
    const sds = f.columns.map(c => c.sd).filter(v => v != null);
    console.log(`    mean spread: widest/narrowest = ${fmt(Math.max(...means) / Math.min(...means))}x     sd spread: ${fmt(Math.max(...sds) / Math.min(...sds))}x`);
    console.log('    pairwise Pearson r between the columns the engine treats as replicates:');
    for (let i = 0; i < f.columns.length; i++) for (let j = i + 1; j < f.columns.length; j++) {
      const r = pearson(f._matrix.map(row => row[f.columns[i].matrixCol]), f._matrix.map(row => row[f.columns[j].matrixCol]));
      console.log(`      ${f.columns[i].header} vs ${f.columns[j].header}: r = ${fmt(r)}`);
    }
    console.log('');
  }

  console.log('══ Part 2 — sub-question 2: the vfs-* trio ══\n');
  console.log('  Recorded as having replicate status that cannot be established. Measured:\n');
  for (const name of ['vfs-a-pigeonhole-clear.csv', 'vfs-b-recurrence-high.csv', 'vfs-c-deeptail-high.csv']) {
    const f = fixtures.find(x => x.file === name);
    if (!f) { console.log(`  ${name}: NOT FOUND`); continue; }
    console.log(`  ${name}  —  ${f.groupingKind}, ${f.validRows} rows, one implicit group of ${f.nDataCols}`);
    console.log('    column     mean         sd           CV        min          max          distinct');
    f.columns.forEach(c => console.log(`    ${c.header.padEnd(10)} ${fmt(c.mean).padEnd(12)} ${fmt(c.sd).padEnd(12)} ${fmt(c.cv).padEnd(9)} ${fmt(c.min).padEnd(12)} ${fmt(c.max).padEnd(12)} ${c.nDistinct}`));
    for (let i = 0; i < f.columns.length; i++) for (let j = i + 1; j < f.columns.length; j++) {
      const r = pearson(f._matrix.map(row => row[f.columns[i].matrixCol]), f._matrix.map(row => row[f.columns[j].matrixCol]));
      console.log(`    Pearson r  ${f.columns[i].header} vs ${f.columns[j].header}: ${fmt(r)}`);
    }
    console.log('');
  }

  const cstF = constantFields(fixCols, ['monotone', 'positionInGroup', 'nNull', 'entersDataCols']);
  console.log('\n  measurements constant across every fixture column (cannot discriminate):');
  console.log(cstF.length ? cstF.map(x => `    ${x.field} = ${JSON.stringify(x.value)} on all ${fixCols.length}`).join('\n') : '    none');
  console.log('');
}

if (WANT_TAB && sheets && fixtures) {
  console.log('\n══ Part 3 — discriminator tabulation ══\n');

  // Stamp cross-group identity onto each column so candidate 3 can read it.
  const stamp = (cols, identity, groupNames) => cols.forEach(c => {
    const i = identity.find(x => x.position === c.positionInGroup);
    c._identicalAcrossGroups = !!(i && i.comparable && i.identical);
  });
  const cg = sheets.filter(s => s.columnGrouped);
  cg.forEach(s => stamp(s.columns, s.identityMatrix, s.groupNames));
  fixtures.filter(f => !f.error).forEach(f => stamp(f.columns, f.identity, f.groupNames));

  const sheetCols = cg.flatMap(s => s.columns.map(c => ({ ...c, _sheet: s.file.replace('.xlsx', '') + '/' + s.sheet })));
  const axisCols = sheetCols.filter(c => AXIS_HEADERS.has(c.header));
  const nonAxisSheetCols = sheetCols.filter(c => !AXIS_HEADERS.has(c.header));
  const fixCols = fixtures.filter(f => !f.error).flatMap(f => f.columns.map(c => ({ ...c, _fix: f.file })));

  console.log(`  reference axis set (AUTHORED from header text, not measured): ${axisCols.length} of ${sheetCols.length} sheet columns.`);
  console.log(`  distinct axis headers: ${[...new Set(axisCols.map(c => c.header))].map(h => JSON.stringify(h)).join(', ')}`);
  console.log(`  fixture data columns in the control: ${fixCols.length}\n`);

  console.log('  candidate                                                        axis   non-axis  fixture');
  console.log('                                                                  sel/' + String(axisCols.length).padEnd(4) + '  sel/' + String(nonAxisSheetCols.length).padEnd(5) + ' sel/' + fixCols.length);
  for (const cand of CANDIDATES_TAB) {
    const a = axisCols.filter(cand.test).length;
    const na = nonAxisSheetCols.filter(cand.test).length;
    const fx = fixCols.filter(cand.test).length;
    console.log(`  ${(cand.id + '. ' + cand.name).padEnd(64)} ${String(a).padStart(4)}   ${String(na).padStart(6)}    ${String(fx).padStart(6)}`);
  }
  console.log('\n  Nothing is ranked and no rule is recommended. Candidate 4 is partly circular');
  console.log('  against a reference set authored from the same header text it reads.');

  // The same table with the one contested member of the axis set removed, so
  // the choice on Fig. 4b's Arrhenius abscissa is visible rather than buried.
  const axisCore = axisCols.filter(c => AXIS_HEADERS_CORE.includes(c.header));
  const nonAxisCore = sheetCols.filter(c => !AXIS_HEADERS_CORE.includes(c.header));
  console.log(`\n  the same counts with the contested member ${JSON.stringify(AXIS_HEADERS_CONTESTED[0])} moved OUT of the axis set:`);
  console.log(`  candidate                                                        axis   non-axis`);
  console.log('                                                                  sel/' + String(axisCore.length).padEnd(4) + '  sel/' + nonAxisCore.length);
  for (const cand of CANDIDATES_TAB) {
    console.log(`  ${(cand.id + '. ' + cand.name).padEnd(64)} ${String(axisCore.filter(cand.test).length).padStart(4)}   ${String(nonAxisCore.filter(cand.test).length).padStart(6)}`);
  }

  for (const cand of CANDIDATES_TAB) {
    const na = nonAxisSheetCols.filter(cand.test);
    if (na.length) {
      console.log(`\n  candidate ${cand.id} also selects these NON-axis sheet columns:`);
      const by = {};
      na.forEach(c => { (by[c._sheet] ||= []).push(`${c.header} (grp "${c.group}")`); });
      for (const [s, hs] of Object.entries(by)) console.log(`    ${s.padEnd(16)} ${hs.length}: ${hs.slice(0, 3).join('; ')}${hs.length > 3 ? ` … and ${hs.length - 3} more` : ''}`);
    }
  }

  for (const cand of CANDIDATES_TAB) {
    const fx = fixCols.filter(cand.test);
    if (fx.length) {
      console.log(`\n  candidate ${cand.id} selects these fixture columns:`);
      const byFile = {};
      fx.forEach(c => { (byFile[c._fix] ||= []).push(c.header); });
      for (const [f, hs] of Object.entries(byFile)) console.log(`    ${f.padEnd(36)} ${hs.length}: ${hs.slice(0, 8).join(', ')}${hs.length > 8 ? ' …' : ''}`);
    }
  }
  console.log('');
}

// ══════════════════════════════════════════════════════════════════════════
// SECOND PASS — the near neighbour
//
// The first pass tabulated five candidates against two populations: the sixty
// axis columns and the 160 fixture data columns. Both are FAR neighbours. A
// spectrum's own intensity column is the NEAR neighbour, and the first pass
// does not say whether any candidate separates an axis from the signal sitting
// beside it in the same group. Everything below comes out of data the probe
// already holds; nothing new is opened.
// ══════════════════════════════════════════════════════════════════════════

// Percentiles by linear interpolation between closest ranks — the definition R
// and numpy use by default, named here because a nearest-rank reading of the
// same data gives different numbers on populations this small.
function pct(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}
const quantiles = arr => {
  const s = [...arr].sort((a, b) => a - b);
  return { n: s.length, min: s[0], p05: pct(s, 0.05), p25: pct(s, 0.25), p50: pct(s, 0.50), p75: pct(s, 0.75), p95: pct(s, 0.95), max: s[s.length - 1] };
};
const qrow = (label, q) => `  ${label.padEnd(26)} ${String(q.n).padStart(4)}  ` +
  [q.min, q.p05, q.p25, q.p50, q.p75, q.p95, q.max].map(v => fmt(v, 4).padStart(11)).join(' ');

if (WANT_PASS2 && sheets && fixtures) {
  const cg2 = sheets.filter(s => s.columnGrouped);
  const sheetCols2 = cg2.flatMap(s => s.columns.map(c => ({ ...c, _sheet: s.file.replace('.xlsx', '') + '/' + s.sheet, _file: s.file })));
  const axis2 = sheetCols2.filter(c => AXIS_HEADERS.has(c.header));
  const nonAxis2 = sheetCols2.filter(c => !AXIS_HEADERS.has(c.header));
  const fixCols2 = fixtures.filter(f => !f.error).flatMap(f => f.columns.map(c => ({ ...c, _fix: f.file })));
  const isMono = c => c.monotone === 'increasing' || c.monotone === 'decreasing';

  // ── Pass 2, Part 1 — the eight ────────────────────────────────────────────
  console.log('\n\n══ Pass 2, Part 1 — the non-axis sheet columns candidate 1 selects ══\n');
  const eight = nonAxis2.filter(isMono);
  console.log(`  candidate 1 (strictly monotone) selects ${eight.length} non-axis sheet columns.`);
  const byFile2 = {};
  eight.forEach(c => { (byFile2[c._file] ||= []).push(c); });
  console.log(`  by file: ${Object.entries(byFile2).map(([f, cs]) => `${f.replace('.xlsx', '')} ${cs.length}`).join(', ')}`);
  console.log(`  E9 stated: the eight sit MOSTLY IN C15.`);
  console.log(`     measured: C15 ${(byFile2['C15.xlsx'] || []).length}, C25 ${(byFile2['C25.xlsx'] || []).length}  ` +
    `${(byFile2['C15.xlsx'] || []).length > eight.length / 2 ? 'HELD' : 'INVERTED'}\n`);

  for (const c of eight) {
    console.log(`── ${c._sheet}  group "${c.group}"  position ${c.positionInGroup}  header ${JSON.stringify(c.header)}`);
    console.log(`   direction ${c.monotone}   range ${fmt(c.min, 6)} → ${fmt(c.max, 6)}   distinct ${c.nDistinct} of ${c.nValues}   nulls ${c.nNull}   first-difference CV ${fmt(c.diffCV, 4)}`);
    const s = c.sample || { first: [], mid: [], last: [], midFrom: null, n: 0 };
    const show = a => a.map(v => fmt(v, 6)).join(', ');
    console.log(`   first 10 : ${show(s.first)}`);
    if (s.n > 20) console.log(`   mid 10   : ${show(s.mid)}   (from index ${s.midFrom} of ${s.n})`);
    if (s.n > 10) console.log(`   last 10  : ${show(s.last)}`);
    if (s.n <= 10) console.log(`   (the column holds only ${s.n} values, all shown above)`);
    console.log('');
  }

  // ── E10 — the column decomposition, read off the probe ────────────────────
  console.log('══ Pass 2 — E10, the column decomposition ══\n');
  const c25cols = sheetCols2.filter(c => c._file === 'C25.xlsx');
  const c15cols = sheetCols2.filter(c => c._file === 'C15.xlsx');
  const c25axis = c25cols.filter(c => AXIS_HEADERS.has(c.header));
  const c15axis = c15cols.filter(c => AXIS_HEADERS.has(c.header));
  console.log(`  E10 stated: 60 axis and 60 signal in C25, plus 18 in C15, summing to 138 with 78 non-axis.`);
  console.log(`     C25 columns ${c25cols.length} = ${c25axis.length} axis + ${c25cols.length - c25axis.length} signal`);
  console.log(`     C15 columns ${c15cols.length} = ${c15axis.length} axis + ${c15cols.length - c15axis.length} signal`);
  console.log(`     total ${sheetCols2.length}, axis ${axis2.length}, non-axis ${nonAxis2.length}`);
  const e10 = c25axis.length === 60 && (c25cols.length - c25axis.length) === 60 && c15cols.length === 18 &&
    sheetCols2.length === 138 && nonAxis2.length === 78;
  console.log(`     ${e10 ? 'CONFIRMED' : 'REFUTED'}\n`);

  // ── Pass 2, Part 2 — the distributions ────────────────────────────────────
  console.log('══ Pass 2, Part 2 — first-difference CV, all three populations ══\n');
  console.log('  Percentiles by linear interpolation between closest ranks. Columns with no');
  console.log('  defined CV are excluded from the population and counted beside it.\n');
  const cvOf = arr => arr.map(c => c.diffCV).filter(v => v !== null && v !== undefined);
  const qa = quantiles(cvOf(axis2)), qn = quantiles(cvOf(nonAxis2)), qf = quantiles(cvOf(fixCols2));
  console.log('  population                     n          min         5th        25th        50th        75th        95th         max');
  console.log(qrow('axis sheet columns', qa));
  console.log(qrow('non-axis sheet columns', qn));
  console.log(qrow('fixture data columns', qf));
  console.log(`\n  undefined CV: axis ${axis2.length - qa.n}, non-axis ${nonAxis2.length - qn.n}, fixture ${fixCols2.length - qf.n}`);
  fixCols2.filter(c => c.diffCV === null).forEach(c => console.log(`     ${c._fix} / "${c.header}"  mean first difference is exactly 0`));

  console.log('\n  overlap, stated both ways:');
  const belowAxisMax = nonAxis2.filter(c => c.diffCV !== null && c.diffCV < qa.max);
  const aboveNonAxisMin = axis2.filter(c => c.diffCV !== null && c.diffCV > qn.min);
  console.log(`    non-axis sheet columns below the axis maximum (${fmt(qa.max)}): ${belowAxisMax.length} of ${qn.n}`);
  belowAxisMax.forEach(c => console.log(`       ${c._sheet.padEnd(16)} "${c.header}" (grp "${c.group}")  CV ${fmt(c.diffCV)}`));
  console.log(`    axis columns above the non-axis minimum (${fmt(qn.min)}): ${aboveNonAxisMin.length} of ${qa.n}`);
  const ovHeaders = {};
  aboveNonAxisMin.forEach(c => { (ovHeaders[c.header] ||= []).push(c.diffCV); });
  Object.entries(ovHeaders).forEach(([h, vs]) => console.log(`       ${JSON.stringify(h).padEnd(26)} ${vs.length} column(s), CV ${fmt(Math.min(...vs))} to ${fmt(Math.max(...vs))}`));
  const olo = Math.min(qn.min, ...[qa.max]), ohi = Math.max(qn.min, qa.max);
  console.log(`    the two sheet populations overlap on [${fmt(qn.min)}, ${fmt(qa.max)}] — ${belowAxisMax.length} non-axis and ${aboveNonAxisMin.length} axis columns inside it.`);
  console.log(`    E11 stated: the two sheet populations overlap.  ${belowAxisMax.length > 0 && aboveNonAxisMin.length > 0 ? 'HELD' : 'INVERTED — they separate cleanly'}`);

  // ── Candidate 6, as a curve ───────────────────────────────────────────────
  console.log('\n══ Pass 2, Part 2 — candidate 6, first-difference CV below a threshold ══\n');
  console.log('  No monotonicity condition. An undefined CV is NOT selected; the one fixture');
  console.log('  column in that state is named above. Reported as a curve — no threshold is');
  console.log('  chosen here, because how much of each population a rule may lose is a');
  console.log('  question this census does not hold.\n');
  const LADDER = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 1, 2, 5, 10, 15];
  console.log('  threshold      axis sel/' + String(axis2.length).padEnd(4) + '  non-axis sel/' + String(nonAxis2.length).padEnd(4) + '  fixture sel/' + fixCols2.length);
  for (const t of LADDER) {
    const sel = arr => arr.filter(c => c.diffCV !== null && c.diffCV < t).length;
    console.log(`  ${('< ' + t).padEnd(14)} ${String(sel(axis2)).padStart(8)}      ${String(sel(nonAxis2)).padStart(8)}       ${String(sel(fixCols2)).padStart(8)}`);
  }

  // ── Pass 2, Part 3 — the six truncated columns ────────────────────────────
  console.log('\n══ Pass 2, Part 3 — validity check on the six truncated columns ══\n');
  console.log('  A truncated column\'s CV is computed over the SURVIVING part, not the deposited');
  console.log('  column, so the numbers above may describe something the file does not contain.\n');
  const trunc2 = sheetCols2.filter(c => c.truncatedByParseTrim);
  console.log(`  truncated columns: ${trunc2.length}`);
  console.log('  sheet            group / header                              population   CV as computed   CV pre-trim');
  for (const c of trunc2) {
    const pop = AXIS_HEADERS.has(c.header) ? 'axis' : 'non-axis';
    const pre = c.preTrim && c.preTrim.diffCV !== null ? fmt(c.preTrim.diffCV) : (c.preTrim ? 'undefined' : 'unreachable');
    console.log(`  ${c._sheet.padEnd(16)} ${(c.group.slice(0, 28) + ' / ' + c.header).padEnd(44)} ${pop.padEnd(12)} ${fmt(c.diffCV).padEnd(16)} ${pre}`);
  }
  const truncAxis = trunc2.filter(c => AXIS_HEADERS.has(c.header));
  console.log(`\n  split: ${truncAxis.length} axis, ${trunc2.length - truncAxis.length} non-axis.`);

  console.log('\n  Part 2 percentiles with the six excluded:');
  const drop = new Set(trunc2.map(c => c._sheet + '|' + c.group + '|' + c.header));
  const keep = arr => arr.filter(c => !drop.has(c._sheet + '|' + c.group + '|' + c.header));
  const qa2 = quantiles(cvOf(keep(axis2))), qn2 = quantiles(cvOf(keep(nonAxis2)));
  console.log('  population                     n          min         5th        25th        50th        75th        95th         max');
  console.log(qrow('axis (six excluded)', qa2));
  console.log(qrow('non-axis (six excluded)', qn2));
  const moved = [];
  for (const k of ['min', 'p05', 'p25', 'p50', 'p75', 'p95', 'max']) {
    if (qa[k] !== qa2[k]) moved.push(`axis ${k}: ${fmt(qa[k])} -> ${fmt(qa2[k])}`);
    if (qn[k] !== qn2[k]) moved.push(`non-axis ${k}: ${fmt(qn[k])} -> ${fmt(qn2[k])}`);
  }
  console.log(`\n  percentiles that move: ${moved.length ? '\n    ' + moved.join('\n    ') : 'none'}`);
  console.log('  (the fixture population is untouched — no fixture loses a row at either trim stage)');

  // Does the truncation reach either of this pass's two findings? Measured
  // rather than eyeballed off the sheet names.
  const key = c => c._sheet + '|' + c.group + '|' + c.header;
  const eightTrunc = eight.filter(c => drop.has(key(c)));
  console.log(`\n  do the six reach Part 1's eight?  ${eightTrunc.length === 0 ? 'NO — disjoint' : 'YES: ' + eightTrunc.map(c => c._sheet + ' / ' + c.header).join(', ')}`);
  const axMaxCol = axis2.filter(c => c.diffCV !== null).reduce((a, b) => b.diffCV > a.diffCV ? b : a);
  const naMinCol = nonAxis2.filter(c => c.diffCV !== null).reduce((a, b) => b.diffCV < a.diffCV ? b : a);
  console.log(`  do the six reach either overlap endpoint?`);
  console.log(`     axis maximum ${fmt(axMaxCol.diffCV)} is ${axMaxCol._sheet} / "${axMaxCol.header}" — truncated: ${drop.has(key(axMaxCol)) ? 'YES' : 'no'}`);
  console.log(`     non-axis minimum ${fmt(naMinCol.diffCV)} is ${naMinCol._sheet} / "${naMinCol.header}" — truncated: ${drop.has(key(naMinCol)) ? 'YES' : 'no'}`);
  console.log('');
}

if (process.env.JSON_OUT) {
  writeFileSync(process.env.JSON_OUT, JSON.stringify({ sheets, fixtures }, null, 2));
  console.log(`wrote ${process.env.JSON_OUT}`);
}

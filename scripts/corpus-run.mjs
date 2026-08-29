// Headless corpus runner — runs the full analysis pipeline on external
// real-world datasets (published .xlsx or .csv files) and emits a per-test
// results table per dataset, with NO ground-truth comparison.
//
// This is the first consumer of the parked headless-runner item. It is
// plumbing only: it imports the same shared functions the UI and
// validate-batch use and reproduces BatchView's prep-and-run loop in Node.
// It changes no engine logic and reimplements no statistics.
//
// Usage:
//   node scripts/corpus-run.mjs <manifest.json> [--out <file.json>]
//   node scripts/corpus-run.mjs <datafile>      [--assay X] [--dataType Y]
//                                               [--sheet S] [--label L]
//                                               [--out <file.json>]
//   node scripts/corpus-run.mjs <manifest|datafile> --inventory [--out <file.json>]
//
// --inventory is a SECOND MODE, not a flag on the first. It measures every
// sheet of every named file and runs no test at all: import and role inference,
// stopping at extractAnalysisInputs. It is the machinery
// ROUND2-SPECIFICITY-SCREEN.md §6.2 needs to choose one sheet per deposit, and
// §11.3 keeps the ranking out of it — scripts/round2-select.mjs --rank reads
// the artifact this writes and applies §6.2's rule to it. Default output is
// corpus-out/corpus-inventory.json, so an inventory run cannot overwrite an
// analysis run's artifact.
//
// Manifest JSON is either an array of dataset entries or
// { datasets: [...], out?: "..." }. Each entry:
//   { path, sheet?, assay?, dataType?, conditionsHint?, label? }
//
// conditionsHint, when an object, is a DECLARATIVE role override (S293):
//   conditionsHint: { roles: { "<header>": "identifier"|"index"|"condition"|"data" } }
// Declared headers have their inferred role stamped over (identifier/index →
// kept out of the matrix); undeclared columns still infer. A non-object hint
// (e.g. a freeform string) is echoed but otherwise ignored — inference stands.
//
// `assay` / `dataType` override the automatic detectAssay heuristic, which
// falls back to "general"/"continuous" on generic real-world filenames and
// would otherwise silently mis-infer structure. When no override is given the
// runner uses detectAssay (BatchView's behaviour) AND emits the inferred
// structure so the operator can see what the run assumed.
//
// Output: a JSON artifact (primary — it carries the heterogeneous per-test
// evidence dump cleanly) plus a flat CSV of the name/flag/primaryP table for
// quick scanning. JSON path defaults to corpus-out/corpus-results.json.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, extname, dirname, join, resolve } from 'node:path';
import Papa from 'papaparse';

import { extractAnalysisInputs, runFullAnalysis } from '../src/analysis/engine.js';
import { computeSeverity } from '../src/analysis/severity.js';
import { detectVST } from '../src/stats/vst.js';
import { inferBaseRoles, detectGroupAttributes } from '../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../src/import/parser.js';
import { detectLongFormat } from '../src/import/longFormat.js';
import { suggestRowSemantics } from '../src/import/rowSemantics.js';
import { summarize } from '../src/import/summary.js';
import { parseExcel, getSheetNames } from '../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../src/constants/assays.js';

// The engine yields the Blocked-Mahalanobis permutation loop via this; Node
// has no rAF, so polyfill it exactly as validate-batch.mjs does.
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const EVIDENCE_DETAIL_CAP = 10;   // first N raw details entries per flagged test
const EVIDENCE_ROW_CAP = 50;      // first N flaggedRowIndices per flagged test

// ── Declarative role override (S293) ────────────────────────────────
// A hinted file may carry, in author vocabulary:
//   conditionsHint: { roles: { "<header>": "identifier"|"index"|"condition"|"data" } }
// The vocabulary maps to the roles inferRoles emits. "identifier"/"index"
// both resolve to "label" — kept out of the analysis matrix but surviving as
// an identifier column. This is scoped to hinted files ONLY; a file with no
// structured hint never enters the override and its roles come straight from
// inference (batch parity proof).
const HINT_ROLE_MAP = { identifier: 'label', index: 'label', condition: 'condition', data: 'data' };

// ── CLI parsing ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
      flags[key] = val;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

// Build the list of dataset entries from either a manifest file or a single
// data file plus flags.
function resolveEntries({ positional, flags }) {
  if (positional.length === 0) {
    throw new Error('No input. Pass a manifest .json or a data file path.');
  }
  const first = positional[0];
  if (extname(first).toLowerCase() === '.json') {
    const parsed = JSON.parse(readFileSync(first, 'utf-8'));
    const datasets = Array.isArray(parsed) ? parsed : (parsed.datasets || []);
    if (!datasets.length) throw new Error(`Manifest ${first} declares no datasets.`);
    const manifestOut = Array.isArray(parsed) ? null : (parsed.out || null);
    return { datasets, manifestOut };
  }
  // Single-file convenience form.
  const entry = { path: first };
  if (flags.assay) entry.assay = flags.assay;
  if (flags.dataType) entry.dataType = flags.dataType;
  if (flags.vst) entry.vst = flags.vst;
  if (flags.sheet) entry.sheet = flags.sheet;
  if (flags.label) entry.label = flags.label;
  return { datasets: [entry], manifestOut: null };
}

// ── Read adapter ────────────────────────────────────────────────────
// xlsx: wrap the file bytes in a Node Blob and call the existing parseExcel
// (it only needs file.arrayBuffer(), which Blob provides) — this reuses ALL of
// excel.js's row-shaping, no parsing logic duplicated here.
// csv/tsv/txt: the PapaParse path, identical to validate-batch / BatchView.
async function readRawMatrix(entry) {
  const ext = extname(entry.path).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const blob = new Blob([readFileSync(entry.path)]);
    const { rows, sheetName } = await parseExcel(blob, entry.sheet);
    return { raw: rows, sheetUsed: sheetName };
  }
  const text = readFileSync(entry.path, 'utf-8');
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: false });
  return { raw: parsed.data, sheetUsed: null };
}

// Stamp declared roles over inferRoles' output for hinted columns only.
// `conditionsHint` is honoured ONLY when it is an object carrying a `.roles`
// header→vocabulary map; a legacy/freeform string (or any shape without
// `.roles`) is a no-op, so inference stands untouched. Unknown vocabulary or
// an unmatched header logs and skips that one declaration — never throws.
function applyRoleHint(roles, hdrs, conditionsHint) {
  const map = conditionsHint && typeof conditionsHint === 'object' ? conditionsHint.roles : null;
  if (!map || typeof map !== 'object') return;
  for (const [header, vocab] of Object.entries(map)) {
    const role = HINT_ROLE_MAP[vocab];
    if (!role) { console.log(`  hint: unknown role "${vocab}" for column "${header}" — skipped (inference stands)`); continue; }
    const idx = hdrs.indexOf(header);
    if (idx < 0) { console.log(`  hint: declared column "${header}" not found in headers — skipped`); continue; }
    roles[idx] = role;
  }
}

// ── Prep: port of BatchView.handleFiles, from the raw 2D array onward ──
// Header detection → role inference → long-format detection. Returns the
// structural pieces extractAnalysisInputs and the run need.
function prepStructure(raw, conditionsHint) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('Empty after preprocessing.');

  // First block if the file holds several. `nBlocks` is returned rather than
  // discarded because taking block 1 of several is a silent narrowing of what
  // the sheet contained, and the inventory has to be able to report it.
  const blocks = detectBlocks(preprocessed);
  const nBlocks = blocks.length;
  let blockRows = blocks.length > 1 ? blocks[0] : preprocessed;

  // Strip preamble rows that carry too few cells to be data/header.
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
    // Two-row header — group row forward-filled into condPerCol.
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
  // Base per-column inference, then the §2.8 group-attribute pass — kept split
  // so the grouping provenance survives into the artefact. inferRoles is
  // exactly these two steps, so roles stay byte-identical to the UI path.
  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles, groupings } = detectGroupAttributes(data, baseRoles);
  applyRoleHint(roles, hdrs, conditionsHint);
  return { hdrs, data, condPerCol, roles, groupings, longFormatDetected, nH, nBlocks };
}

// ── The analysis config, and the four import settings that decide it ──
// Extracted from runDataset so the --inventory walk preps a sheet exactly as
// arm A analyses it. §7 of ROUND2-SPECIFICITY-SCREEN.md is the reason it is a
// toggle rather than a port: a selection measuring a different prep from the
// one arm A runs is the confound that section exists to prevent.
//
// `entry` supplies the assay / dataType overrides. The inventory passes the
// entry it was given, so a manifest override reaches both paths identically;
// with no override this is corpus-run's own auto-detect path.
//
// Returns the config plus every derived setting runDataset reports, so the
// derivation has one home rather than two.
function buildAnalysisConfig({ entry, hdrs, data, condPerCol, roles, longFormatDetected }) {
  // Assay: explicit override wins; else detectAssay heuristic (filename +
  // headers), falling back to "general". Always recorded with its source.
  const auto = detectAssay(basename(entry.path), hdrs);
  const autoAssay = auto ? auto.assay : 'general';
  const assay = entry.assay || autoAssay;
  const assaySource = entry.assay ? 'override' : 'auto-detected';

  // dataType: explicit override wins; else mapped from the resolved assay.
  const dataType = entry.dataType || ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const dataTypeSource = entry.dataType ? 'override' : 'from-assay';

  // Genomics/cell-count zero-as-missing heuristic (BatchView parity). Not
  // cosmetic on the inventory path either: zeroAsMissing decides which cells
  // are null, so it moves the valid row count §6.2 ranks on.
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;

  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const config = {
    data, roles, hdrs, condPerCol, zeroAsMissing,
    assay, dataType, fileName: entry.path, colRelationship: 'replicates', rowSemantics,
  };

  return { config, assay, assaySource, dataType, dataTypeSource, zeroAsMissing, rsSuggestion, rowSemantics };
}

// Generic per-test evidence dump — no per-test formatting (deferred to v2).
// Granularity: on a result that went through aggregatePerGroup (row- or
// column-grouped dispatch), the per-unit records live in subDetails and
// top-level details holds the per-group summary; on an unaggregated result the
// per-unit records are in details and there is no subDetails. `groupsAssessed`
// is the aggregation marker (set only by aggregatePerGroup) — the same
// discriminator localization.js/convergence.js/ReportView use. Emit the
// per-unit records as `details` either way, and, when aggregated, surface the
// per-group summary separately so a reader can still see which condition
// carried the finding.
function evidenceOf(r) {
  const ev = {};
  const isAgg = !!r.groupsAssessed;
  const perUnit = isAgg ? r.subDetails : r.details;
  if (Array.isArray(perUnit) && perUnit.length) {
    ev.detailsCount = perUnit.length;
    ev.details = perUnit.slice(0, EVIDENCE_DETAIL_CAP);
    if (perUnit.length > EVIDENCE_DETAIL_CAP) ev.detailsTruncated = true;
  }
  if (isAgg && Array.isArray(r.details) && r.details.length) {
    ev.groupSummaryCount = r.details.length;
    ev.groupSummary = r.details.slice(0, EVIDENCE_DETAIL_CAP);
    if (r.details.length > EVIDENCE_DETAIL_CAP) ev.groupSummaryTruncated = true;
  }
  if (Array.isArray(r.flaggedRowIndices) && r.flaggedRowIndices.length) {
    ev.flaggedRowCount = r.flaggedRowIndices.length;
    ev.flaggedRowIndices = r.flaggedRowIndices.slice(0, EVIDENCE_ROW_CAP);
    if (r.flaggedRowIndices.length > EVIDENCE_ROW_CAP) ev.flaggedRowsTruncated = true;
  }
  return Object.keys(ev).length ? ev : null;
}

// ── Run one dataset ─────────────────────────────────────────────────
async function runDataset(entry) {
  const label = entry.label || basename(entry.path);
  const { raw, sheetUsed } = await readRawMatrix(entry);
  const { hdrs, data, condPerCol, roles, groupings, longFormatDetected } = prepStructure(raw, entry.conditionsHint);

  const { config, assay, assaySource, dataType, dataTypeSource, zeroAsMissing, rsSuggestion, rowSemantics } =
    buildAnalysisConfig({ entry, hdrs, data, condPerCol, roles, longFormatDetected });
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs(config);

  // VST: explicit override wins; else detectVST (BatchView's behaviour). A
  // forced transform is stamped over the detected one exactly as --assay stamps
  // over detectAssay, and the source is recorded so a forced run never reads as
  // a detected one. The engine only consults vst.transform, so the forced
  // object carries just that plus a reason naming it as forced.
  let vst, vstSource;
  if (entry.vst) {
    const forced = String(entry.vst).toLowerCase();
    if (!['raw', 'log', 'anscombe'].includes(forced)) {
      throw new Error(`--vst must be one of raw|log|anscombe (got "${entry.vst}")`);
    }
    vst = { transform: forced, reason: `forced via --vst (${forced}); detection bypassed`, forced: true };
    vstSource = 'override';
  } else {
    vst = detectVST(matrix, assay);
    vstSource = 'auto-detected';
  }

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst,
    { isPivoted: false }, dataType, rowSemantics
  );

  const severity = computeSeverity(results);
  const counts = { HIGH: 0, MODERATE: 0, LOW: 0, 'N/A': 0 };
  for (const r of results) counts[r.flag] = (counts[r.flag] || 0) + 1;

  const tests = results.map(r => {
    const row = {
      name: r.name,
      flag: r.flag,
      primaryP: typeof r.primaryP === 'number' ? r.primaryP : null,
    };
    const ev = evidenceOf(r);
    if (ev) row.evidence = ev;
    if (r.flag === 'N/A' && r.description) row.note = r.description;
    return row;
  });

  // §2.8 provenance — the columns held out as group attributes, and for each
  // the grouping column(s) it was found constant within. This is the auditable
  // claim: "Latitude was excluded because it is constant within every level of
  // Site." The bare count is not. Built on the FINAL roles so a role hint that
  // overrides an attribute is reflected.
  const nameOf = c => (hdrs[c] != null && String(hdrs[c]).trim()) ? String(hdrs[c]).trim() : `Col ${c + 1}`;
  const attrExplainedBy = {};
  for (const g of groupings) for (const c of g.attrCols) (attrExplainedBy[c] ||= []).push({ col: g.groupCol, header: nameOf(g.groupCol), nLevels: g.nLevels });
  const attributes = roles
    .map((r, c) => r === 'attribute' ? { col: c, header: nameOf(c), constantWithin: attrExplainedBy[c] || [] } : null)
    .filter(Boolean);

  return {
    label,
    path: entry.path,
    sheet: sheetUsed,
    structure: {
      assay, assaySource,
      dataType, dataTypeSource,
      rowSemantics,
      rowSemanticsSource: rsSuggestion.auto ? 'auto-suggested' : 'default',
      rowSemanticsReason: rsSuggestion.reason || null,
      vst: vst?.transform || 'raw',
      vstSource,
      vstReason: vst?.reason || vst?.reasonCode || null,
      longFormatDetected,
      zeroAsMissing,
      // Echoed verbatim (object or legacy string). When an object with a
      // .roles map, it has already been applied as a declarative role override
      // in prepStructure (S293); nConditions/conditionType below reflect the
      // post-override structure.
      conditionsHint: entry.conditionsHint ?? null,
      nRows: matrix.length,
      nCols: matrix[0]?.length || 0,
      nConditions: condCtx?.count ?? null,
      conditionType: condCtx?.type ?? null,
      // S320 move-2 census gate — the trigger inputs (condition-column count,
      // group sizes + median) and the engine's own pending decision, read off
      // the four routed tests (they carry `groupingPending` when the trigger
      // fires). Lets the census confirm fire/clean per file headless.
      nCondCols: roles.filter(r => r === 'condition').length,
      rowGroupStatus: (() => {
        const s = condCtx?.rowGroupsStatus ? condCtx.rowGroupsStatus() : null;
        return s ? {
          attempted: s.attempted, usable: s.usable, nGroups: s.nGroups ?? null,
          medianSize: Number.isFinite(s.medianSize) ? s.medianSize : null,
          sizes: s.sizes ?? null,
        } : null;
      })(),
      groupingPending: results.find(r => r.groupingPending)?.groupingPending || null,
      // Surface, don't hide: every column in order, the role each got, and the
      // §2.8 exclusions with the grouping column each was constant within.
      // headers/roles span ALL columns (not just the matrix's data columns).
      headers: hdrs,
      roles,
      attributes,
    },
    severity,
    counts,
    tests,
  };
}

// ── Inventory: every sheet measured, no test run ─────────────────────
// ROUND2-SPECIFICITY-SCREEN.md §6.2 picks one sheet per deposit by taking every
// sheet of every considered file through the product's import and role
// inference, stopping at extractAnalysisInputs. This mode is that walk and
// nothing else: no runFullAnalysis, no computeSeverity, no detectVST, no
// verdict of any kind. validateMatrix is not reached either — it is called by
// runFullAnalysis (engine.js:205), never by extractAnalysisInputs.
//
// It does NOT apply §6.2's ranking or tie-break (§11.3 of the pre-registration
// keeps that constraint): it reports measurements, and round2-select.mjs
// --rank applies the rule to them. The field names below are the ones
// rankDeposit reads, so the ordering consumes this artifact directly rather
// than through a translation step that could drift away from it.
//
// A sheet that throws is recorded and the walk continues. The two outcomes are
// different findings and both are kept:
//   passed:false  — parseExcel or prepStructure threw; `error` is verbatim.
//   passed:true with validRows:0 — extractAnalysisInputs returned an empty
//                   matrix, which is what it does rather than throwing on a
//                   metadata or all-text sheet. That is a measurement.
function inventorySheet({ entry, raw, sheetName, sheetIndex, sheetTotal }) {
  const rawRows = raw.length;
  const rawCols = raw.reduce((m, r) => Math.max(m, r.length), 0);

  const { hdrs, data, condPerCol, roles, longFormatDetected, nH, nBlocks } =
    prepStructure(raw, entry.conditionsHint);
  const { config, assay, dataType, zeroAsMissing } =
    buildAnalysisConfig({ entry, hdrs, data, condPerCol, roles, longFormatDetected });
  const { matrix, condCtx } = extractAnalysisInputs(config);
  // STOP. Nothing past this point runs a test or computes a verdict.

  const validRows = matrix.length;
  const nNumericDataCols = matrix[0]?.length || 0;
  const totalCells = validRows * nNumericDataCols;
  let nulls = 0;
  for (const row of matrix) for (const v of row) if (v === null) nulls++;

  // Every role that appears, with the five known ones always present so
  // roleCounts.data is a number on every record.
  const roleCounts = { condition: 0, label: 0, data: 0, attribute: 0, ignore: 0 };
  for (const r of roles) roleCounts[r] = (roleCounts[r] || 0) + 1;

  // groupingTrigger is stamped onto condCtx by extractAnalysisInputs itself
  // (engine.js:172); runFullAnalysis only reads it. So it is available at the
  // stopping point and no test has to run to see it.
  const trig = condCtx.groupingTrigger || { pending: false };

  return {
    sheet: sheetName, sheetIndex, sheetTotal,
    passed: true, error: null,
    rawRows, rawCols, headerRows: nH,
    nBlocks, detectBlocksSplit: nBlocks > 1,
    validRows, nNumericDataCols,
    cellCount: validRows * nNumericDataCols,
    // nulls ÷ total cells of the RETURNED matrix, as a number. null on an empty
    // matrix: 0/0 is not a fraction, and a 0 there would read as "nothing
    // missing" on a sheet that holds nothing.
    missingFraction: totalCells > 0 ? nulls / totalCells : null,
    roleCounts,
    grouping: { kind: condCtx.type },
    groupingPending: !!trig.pending,
    assay, dataType, zeroAsMissing, longFormatDetected,
  };
}

async function inventoryFile(entry) {
  const out = { file: basename(entry.path), path: resolve(entry.path),
                sheetCount: null, sheetNames: null, sheets: [] };
  const ext = extname(entry.path).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    // Read the bytes once; Blob.arrayBuffer() is re-callable, so the workbook
    // is not re-read per sheet.
    const blob = new Blob([readFileSync(entry.path)]);
    let names;
    try { names = await getSheetNames(blob); }
    catch (e) {
      // A workbook whose sheet list will not read is a result, not an absence.
      out.fileError = e.message;
      return out;
    }
    out.sheetCount = names.length;
    out.sheetNames = names;
    for (let i = 0; i < names.length; i++) {
      try {
        const { rows } = await parseExcel(blob, names[i]);
        out.sheets.push(inventorySheet({ entry, raw: rows, sheetName: names[i], sheetIndex: i, sheetTotal: names.length }));
      } catch (e) {
        out.sheets.push({ sheet: names[i], sheetIndex: i, sheetTotal: names.length, passed: false, error: e.message });
      }
    }
    return out;
  }

  // csv/tsv/txt — one pseudo-sheet named for the file, so a delimited file and
  // a single-sheet workbook present the same shape to the ordering. §6.2
  // considers .csv and .tsv alongside .xlsx and .xls.
  out.sheetCount = 1;
  out.sheetNames = [basename(entry.path)];
  try {
    const text = readFileSync(entry.path, 'utf-8');
    const parsed = Papa.parse(text, { header: false, skipEmptyLines: false });
    out.sheets.push(inventorySheet({ entry, raw: parsed.data, sheetName: basename(entry.path), sheetIndex: 0, sheetTotal: 1 }));
  } catch (e) {
    out.sheets.push({ sheet: basename(entry.path), sheetIndex: 0, sheetTotal: 1, passed: false, error: e.message });
  }
  return out;
}

// ── CSV escaping, shared by both writers ─────────────────────────────
const esc = v => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

// ── CSV companion (flat name/flag/primaryP table across datasets) ────
function toCsv(datasets) {
  const lines = ['dataset,test,flag,primaryP'];
  for (const d of datasets) {
    if (d.error) { lines.push([esc(d.label), esc('(error)'), esc(d.error), ''].join(',')); continue; }
    for (const t of d.tests) {
      lines.push([esc(d.label), esc(t.name), esc(t.flag), t.primaryP == null ? '' : esc(t.primaryP)].join(','));
    }
  }
  return lines.join('\n') + '\n';
}

// ── CSV companion for the inventory (one row per sheet) ──────────────
const INVENTORY_CSV_COLS = [
  'path', 'file', 'sheet', 'sheetIndex', 'sheetTotal', 'passed',
  'validRows', 'nNumericDataCols', 'cellCount', 'missingFraction',
  'nBlocks', 'detectBlocksSplit', 'headerRows', 'rawRows', 'rawCols',
  'roleDataCols', 'grouping', 'groupingPending', 'assay', 'dataType', 'error',
];
function inventoryToCsv(files) {
  const lines = [INVENTORY_CSV_COLS.join(',')];
  for (const f of files) {
    if (f.fileError) {
      lines.push([esc(f.path), esc(f.file), '', '', '', 'false',
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', esc(f.fileError)].join(','));
      continue;
    }
    for (const s of f.sheets) {
      lines.push([
        esc(f.path), esc(f.file), esc(s.sheet), s.sheetIndex, s.sheetTotal, s.passed,
        s.validRows ?? '', s.nNumericDataCols ?? '', s.cellCount ?? '',
        s.missingFraction == null ? '' : s.missingFraction,
        s.nBlocks ?? '', s.detectBlocksSplit ?? '', s.headerRows ?? '',
        s.rawRows ?? '', s.rawCols ?? '',
        s.roleCounts ? s.roleCounts.data : '',
        s.grouping ? esc(s.grouping.kind) : '',
        s.groupingPending ?? '', esc(s.assay), esc(s.dataType), esc(s.error),
      ].join(','));
    }
  }
  return lines.join('\n') + '\n';
}

// ── Mode: inventory ─────────────────────────────────────────────────
async function runInventoryMode(entries, outPath, csvPath) {
  const files = [];
  for (const entry of entries) {
    process.stdout.write(`\n▶ ${entry.label || basename(entry.path)} (${entry.path})\n`);
    const f = await inventoryFile(entry);
    files.push(f);
    if (f.fileError) { console.log(`  ✗ workbook did not open: ${f.fileError}`); continue; }
    console.log(`  ${f.sheetCount} sheet(s)`);
    for (const s of f.sheets) {
      const pos = `${String(s.sheetIndex + 1).padStart(3)}/${String(s.sheetTotal).padEnd(3)}`;
      const nm = String(s.sheet).slice(0, 42).padEnd(42);
      if (!s.passed) { console.log(`  ${pos} ${nm}  DID NOT IMPORT: ${s.error}`); continue; }
      console.log(`  ${pos} ${nm} ${String(s.validRows).padStart(6)}r x${String(s.nNumericDataCols).padStart(4)}c` +
        `  cells ${String(s.cellCount).padStart(9)}` +
        `  miss ${s.missingFraction == null ? '  --  ' : s.missingFraction.toFixed(4)}` +
        `  blocks ${s.nBlocks}${s.detectBlocksSplit ? ' (took 1st)' : ''}` +
        (s.validRows === 0 ? '  [no valid rows]' : ''));
    }
  }

  const nSheets = files.reduce((n, f) => n + f.sheets.length, 0);
  const nSheetFail = files.reduce((n, f) => n + f.sheets.filter(s => !s.passed).length, 0);
  const nFileFail = files.filter(f => f.fileError).length;
  const nEmpty = files.reduce((n, f) => n + f.sheets.filter(s => s.passed && s.validRows === 0).length, 0);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({
    generatedBy: 'scripts/corpus-run.mjs --inventory',
    nodeVersion: process.version,
    note: 'Per-sheet measurements only. No test was run and no verdict was computed. ' +
          "ROUND2-SPECIFICITY-SCREEN.md §6.2's ranking and tie-break are NOT applied here — " +
          'scripts/round2-select.mjs --rank reads this artifact and applies them.',
    fileCount: files.length,
    sheetCount: nSheets,
    files,
  }, null, 2));
  writeFileSync(csvPath, inventoryToCsv(files));

  console.log(`\n${files.length} file(s), ${nSheets} sheet(s): ` +
    `${nSheets - nSheetFail} measured, ${nSheetFail} did not import, ${nEmpty} measured with zero valid rows` +
    (nFileFail ? `, ${nFileFail} workbook(s) did not open` : '') + '.');
  console.log('No ranking was applied and no verdict was computed.');
  console.log(`  JSON: ${outPath}`);
  console.log(`  CSV:  ${csvPath}`);
}

// ── Mode: analysis (the default) ────────────────────────────────────
async function runAnalysisMode(entries, outPath, csvPath) {
  const outDatasets = [];
  for (const entry of entries) {
    process.stdout.write(`\n▶ ${entry.label || basename(entry.path)} (${entry.path})\n`);
    try {
      const d = await runDataset(entry);
      outDatasets.push(d);
      const s = d.structure;
      console.log(`  structure: assay=${s.assay} (${s.assaySource}), dataType=${s.dataType} (${s.dataTypeSource}), ` +
        `rowSemantics=${s.rowSemantics}, vst=${s.vst} (${s.vstSource}), ${s.nRows}×${s.nCols}` +
        (s.nConditions ? `, conditions=${s.nConditions} (${s.conditionType})` : '') +
        (d.sheet ? `, sheet="${d.sheet}"` : ''));
      if (s.attributes?.length) {
        console.log(`  §2.8 held out ${s.attributes.length} column(s): ` +
          s.attributes.map(a => a.constantWithin[0] ? `${a.header} (constant within ${a.constantWithin[0].header})` : a.header).join(', '));
      }
      console.log(`  dataset severity: ${d.severity.severity} (HIGH=${d.severity.high} MOD=${d.severity.mod} dims=${d.severity.nFlaggedDimensions})`);
      console.log(`  per-test flags: HIGH=${d.counts.HIGH}  MODERATE=${d.counts.MODERATE}  LOW=${d.counts.LOW}  N/A=${d.counts['N/A']}`);
    } catch (e) {
      console.log(`  ✗ ERROR: ${e.message}`);
      outDatasets.push({ label: entry.label || basename(entry.path), path: entry.path, error: e.message });
    }
}

mkdirSync(dirname(outPath), { recursive: true });
const artifact = {
  generatedBy: 'scripts/corpus-run.mjs',
  nodeVersion: process.version,
  datasetCount: outDatasets.length,
  datasets: outDatasets,
};
writeFileSync(outPath, JSON.stringify(artifact, null, 2));
writeFileSync(csvPath, toCsv(outDatasets));

console.log(`\nWrote ${outDatasets.length} dataset(s):`);
console.log(`  JSON (full, with evidence): ${outPath}`);
console.log(`  CSV  (flat flag table):     ${csvPath}`);
}

// ── Main ────────────────────────────────────────────────────────────
const { positional, flags } = parseArgs(process.argv.slice(2));
const { datasets: entries, manifestOut } = resolveEntries({ positional, flags });
const INVENTORY = !!flags.inventory;

// The two modes default to different artifacts so an inventory run cannot
// silently overwrite an analysis one.
const outPath = flags.out || manifestOut ||
  (INVENTORY ? 'corpus-out/corpus-inventory.json' : 'corpus-out/corpus-results.json');
const csvPath = outPath.replace(/\.json$/i, '') + '.csv';

if (INVENTORY) await runInventoryMode(entries, outPath, csvPath);
else await runAnalysisMode(entries, outPath, csvPath);

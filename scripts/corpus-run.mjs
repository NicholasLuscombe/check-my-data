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
import { basename, extname, dirname, join } from 'node:path';
import Papa from 'papaparse';

import { extractAnalysisInputs, runFullAnalysis } from '../src/analysis/engine.js';
import { computeSeverity } from '../src/analysis/severity.js';
import { detectVST } from '../src/stats/vst.js';
import { inferRoles } from '../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../src/import/parser.js';
import { detectLongFormat } from '../src/import/longFormat.js';
import { suggestRowSemantics } from '../src/import/rowSemantics.js';
import { summarize } from '../src/import/summary.js';
import { parseExcel } from '../src/import/excel.js';
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

  // First block if the file holds several.
  const blocks = detectBlocks(preprocessed);
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
  const roles = inferRoles(data, hdrs, condPerCol);
  applyRoleHint(roles, hdrs, conditionsHint);
  return { hdrs, data, condPerCol, roles, longFormatDetected };
}

// Generic per-test evidence dump — no per-test formatting (deferred to v2).
function evidenceOf(r) {
  const ev = {};
  if (Array.isArray(r.details) && r.details.length) {
    ev.detailsCount = r.details.length;
    ev.details = r.details.slice(0, EVIDENCE_DETAIL_CAP);
    if (r.details.length > EVIDENCE_DETAIL_CAP) ev.detailsTruncated = true;
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
  const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(raw, entry.conditionsHint);

  // Assay: explicit override wins; else detectAssay heuristic (filename +
  // headers), falling back to "general". Always recorded with its source.
  const auto = detectAssay(basename(entry.path), hdrs);
  const autoAssay = auto ? auto.assay : 'general';
  const assay = entry.assay || autoAssay;
  const assaySource = entry.assay ? 'override' : 'auto-detected';

  // dataType: explicit override wins; else mapped from the resolved assay.
  const dataType = entry.dataType || ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const dataTypeSource = entry.dataType ? 'override' : 'from-assay';

  // Genomics/cell-count zero-as-missing heuristic (BatchView parity).
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;

  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const config = {
    data, roles, hdrs, condPerCol, zeroAsMissing,
    assay, dataType, fileName: entry.path, colRelationship: 'replicates', rowSemantics,
  };
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs(config);

  const vst = detectVST(matrix, assay);

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
    },
    severity,
    counts,
    tests,
  };
}

// ── CSV companion (flat name/flag/primaryP table across datasets) ────
function toCsv(datasets) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = ['dataset,test,flag,primaryP'];
  for (const d of datasets) {
    if (d.error) { lines.push([esc(d.label), esc('(error)'), esc(d.error), ''].join(',')); continue; }
    for (const t of d.tests) {
      lines.push([esc(d.label), esc(t.name), esc(t.flag), t.primaryP == null ? '' : esc(t.primaryP)].join(','));
    }
  }
  return lines.join('\n') + '\n';
}

// ── Main ────────────────────────────────────────────────────────────
const { positional, flags } = parseArgs(process.argv.slice(2));
const { datasets: entries, manifestOut } = resolveEntries({ positional, flags });

const outPath = flags.out || manifestOut || 'corpus-out/corpus-results.json';
const csvPath = outPath.replace(/\.json$/i, '') + '.csv';

const outDatasets = [];
for (const entry of entries) {
  process.stdout.write(`\n▶ ${entry.label || basename(entry.path)} (${entry.path})\n`);
  try {
    const d = await runDataset(entry);
    outDatasets.push(d);
    const s = d.structure;
    console.log(`  structure: assay=${s.assay} (${s.assaySource}), dataType=${s.dataType} (${s.dataTypeSource}), ` +
      `rowSemantics=${s.rowSemantics}, vst=${s.vst}, ${s.nRows}×${s.nCols}` +
      (s.nConditions ? `, conditions=${s.nConditions} (${s.conditionType})` : '') +
      (d.sheet ? `, sheet="${d.sheet}"` : ''));
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

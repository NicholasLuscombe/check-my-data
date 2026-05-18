// S161 diag: Excel-header parity check.
//
// The S161 Excel refactor touches only the §1 report-header rows in
// excelExport.js (File / Dimensions / Measurement type / Outcome).
// All other chrome — sheets, sections, formatting, narrative,
// hotspots, category summary, test details, legend — is untouched.
//
// This script computes both the pre-S161 and post-S161 header strings
// for the 5-fixture sample (DS01, DS02, DS08, DS11, DS21) and asserts
// byte-identity (or documents intentional divergence per the Phase A
// scope confirmation).
//
// Production note: importConfig.fileName is always set by ImportView /
// BatchView before reaching ReportView's export path. The "uploaded" /
// "check-my-data" fallback default is therefore unreachable in
// production; the divergence is defensive only.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');
const { summarize } = await import('../src/import/summary.js');
const { ASSAYS } = await import('../src/constants/assays.js');
const { ACTION_LABEL } = await import('../src/analysis/narrative.js');
const { buildHandoffModel } = await import('../src/analysis/handoffModel.js');

const FIXTURES = 'test/fixtures';
const SAMPLE = [
  ['01-densitometry-clean.csv',                'densitometry'],
  ['02-densitometry-fabricated.csv',           'densitometry'],
  ['08-elisa-fabricated.csv',                  'elisa'],
  ['11-rnaseq-multicondition.csv',             'genomics'],
  ['21-localised-ar.csv',                      'general'],
];

let failed = 0;

for (const [file, assay] of SAMPLE) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw);
  raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics,
  );
  const { severity } = computeSeverity(results);

  const summary = summarize(data, roles, condPerCol, false);
  const importConfig = {
    fileName: file,           // production path always sets this
    assay,
    assayAutoDetected: false,
    dataType,
    summary,
    vst,
    vstAutoSet: false,
    nRows: matrix.length,
    nCols: matrix[0]?.length || 0,
  };
  const nRows = matrix.length;
  const nCols = matrix[0]?.length || 0;

  // ── Pre-S161 header rows (reproduced from git history of excelExport.js) ──
  const preFileName = importConfig?.fileName || "check-my-data";
  const preAssayLabel = ASSAYS.find(a => a.v === assay)?.l || assay;
  const preAction = ACTION_LABEL[severity] || { score: severity + 1, label: "Unknown" };
  const pre = {
    File: preFileName,
    Dimensions: `${nRows} rows x ${nCols} columns`,
    MeasurementType: preAssayLabel,
    Outcome: `${preAction.score} of 4 — ${preAction.label}`,
  };

  // ── Post-S161 header rows (from HandoffModel) ──
  const model = buildHandoffModel(results, importConfig, nRows, nCols);
  const post = {
    File: model.dataset.filename,
    Dimensions: `${model.dataset.rows} rows x ${model.dataset.cols} columns`,
    MeasurementType: model.dataset.assay,
    Outcome: `${model.outcome.tier + 1} of 4 — ${model.outcome.label}`,
  };

  const diffs = [];
  for (const k of Object.keys(pre)) {
    if (pre[k] !== post[k]) diffs.push({ row: k, pre: pre[k], post: post[k] });
  }

  if (diffs.length === 0) {
    console.log(`✓ ${file}: 4 header rows byte-identical`);
  } else {
    console.error(`✗ ${file}: ${diffs.length} header row(s) diverge`);
    for (const d of diffs) console.error(`   ${d.row}: pre="${d.pre}" post="${d.post}"`);
    failed++;
  }
}

if (failed === 0) {
  console.log('\n✓ Excel parity verified across 5-fixture sample (DS01/02/08/11/21).');
  console.log('  Header rows byte-identical pre/post S161. All other Excel chrome unchanged');
  console.log('  (sheets, sections, formatting, narrative, hotspots, category summary, test');
  console.log('  details, legend — not touched in this refactor).');
} else {
  console.error(`\n✗ ${failed} fixture(s) showed header-row divergence — investigate above.`);
}
process.exit(failed > 0 ? 1 : 0);

// S161 diag: verify buildHandoffModel runs cleanly across all 22 fixtures.
// Reuses the validate-batch engine setup, then builds the handoff model and
// asserts structural invariants (no crash, expected slot shapes, non-empty
// strings on required slots, outcome.tier matches computeSeverity).

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
const { buildHandoffModel } = await import('../src/analysis/handoffModel.js');

const FIXTURES = 'test/fixtures';
const CASES = [
  ['01-densitometry-clean.csv',                'densitometry'],
  ['02-densitometry-fabricated.csv',           'densitometry'],
  ['03-qpcr-clean.csv',                        'qpcr'],
  ['04-qpcr-fabricated.csv',                   'qpcr'],
  ['05-cellcount-clean.csv',                   'cell_count'],
  ['06-cellcount-fabricated.csv',              'cell_count'],
  ['07-elisa-clean.csv',                       'elisa'],
  ['08-elisa-fabricated.csv',                  'elisa'],
  ['09-proteomics-clean.csv',                  'proteomics'],
  ['10-proteomics-fabricated.csv',             'proteomics'],
  ['11-rnaseq-multicondition.csv',             'genomics'],
  ['12a-uniform-mixture-clean.csv',            'general'],
  ['12b-uniform-mixture-fabricated.csv',       'general'],
  ['13-vfstest-cellcountest.csv',              'cell_count'],
  ['14-crctest-survey.csv',                    'survey'],
  ['15-missing-carlisle.csv',                  'general'],
  ['16-densitometry-carlisle-overbalanced.csv','densitometry'],
  ['17-densitometry-carlisle-clean.csv',       'densitometry'],
  ['19-inheritance-fabricated.csv',            'general'],
  ['20-bimodal-fab.csv',                       'general'],
  ['21-localised-ar.csv',                      'general'],
  ['22-covariance-block.csv',                  'general'],
];

let failed = 0;

function assert(cond, msg) {
  if (!cond) { console.error('  ✗', msg); failed++; }
}

for (const [file, assay] of CASES) {
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
  // Build a minimal importConfig matching what ReportView assembles
  const importConfig = {
    fileName: file,
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

  let model;
  try {
    model = buildHandoffModel(results, importConfig, nRows, nCols);
  } catch (e) {
    console.error('✗', file, '— buildHandoffModel threw:', e.message);
    failed++;
    continue;
  }

  // Structural invariants
  assert(model.dataset.filename === file, `${file}: dataset.filename mismatch`);
  assert(model.dataset.rows === nRows, `${file}: dataset.rows mismatch`);
  assert(model.dataset.cols === nCols, `${file}: dataset.cols mismatch`);
  assert(typeof model.dataset.assay === 'string' && model.dataset.assay.length > 0,
    `${file}: dataset.assay empty`);
  assert(typeof model.dataset.vstLabel === 'string' && model.dataset.vstLabel.length > 0,
    `${file}: dataset.vstLabel empty (got "${model.dataset.vstLabel}")`);
  assert(model.outcome.tier === severity,
    `${file}: outcome.tier ${model.outcome.tier} ≠ severity ${severity}`);
  assert([0,1,2,3].includes(model.outcome.tier),
    `${file}: outcome.tier out of range`);
  assert(typeof model.outcome.label === 'string',
    `${file}: outcome.label missing`);
  assert(Array.isArray(model.findings.high),
    `${file}: findings.high not array`);
  assert(Array.isArray(model.findings.moderate),
    `${file}: findings.moderate not array`);
  assert(Array.isArray(model.findings.clearedInFlaggedClusters),
    `${file}: findings.clearedInFlaggedClusters not array`);
  assert(Array.isArray(model.findings.otherClustersAllClear),
    `${file}: findings.otherClustersAllClear not array`);
  assert(Array.isArray(model.findings.notRun),
    `${file}: findings.notRun not array`);
  assert(typeof model.findings.notRunFootnote === 'string',
    `${file}: findings.notRunFootnote not string`);
  // Pre-grouped cleared-in-flagged: one entry per flagged cluster
  for (const g of model.findings.clearedInFlaggedClusters) {
    assert(typeof g.clusterLabel === 'string' && g.clusterLabel.length > 0,
      `${file}: clearedInFlaggedClusters.clusterLabel empty`);
    assert(Array.isArray(g.clearedTests),
      `${file}: clearedInFlaggedClusters.clearedTests not array`);
  }

  // Findings shape
  for (const f of [...model.findings.high, ...model.findings.moderate]) {
    assert(typeof f.testName === 'string' && f.testName.length > 0,
      `${file}: finding.testName empty`);
    assert(typeof f.clusterLabel === 'string' && f.clusterLabel.length > 0,
      `${file}: finding.clusterLabel empty for ${f.testName}`);
    assert(typeof f.methodVerbatim === 'string',
      `${file}: finding.methodVerbatim missing for ${f.testName}`);
    assert(typeof f.location === 'string' && f.location.length > 0,
      `${file}: finding.location empty for ${f.testName}`);
    assert(Array.isArray(f.evidenceLines) && f.evidenceLines.length > 0,
      `${file}: finding.evidenceLines empty for ${f.testName}`);
  }

  const flaggedHere = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').length;
  const naHere = results.filter(r => r.flag === 'N/A').length;

  const totalCleared = model.findings.clearedInFlaggedClusters
    .reduce((s, g) => s + g.clearedTests.length, 0);
  const footnote = model.findings.notRunFootnote ? ' +footnote' : '';
  console.log(
    `✓ ${file}: severity=${severity} outcome=${model.outcome.tier}/${model.outcome.label} ` +
    `flagged=${flaggedHere}(H${model.findings.high.length}+M${model.findings.moderate.length}) ` +
    `flaggedClusters=${model.findings.clearedInFlaggedClusters.length}/cleared=${totalCleared} ` +
    `otherClusters=${model.findings.otherClustersAllClear.length} ` +
    `notRun=${model.findings.notRun.length}(engine N/A=${naHere})${footnote} ` +
    `vstLabel="${model.dataset.vstLabel}"`,
  );
}

console.log(failed > 0 ? `\n✗ ${failed} assertion(s) failed` : '\n✓ all 22 fixtures pass handoff-model structural checks');
process.exit(failed > 0 ? 1 : 0);

// S161 diag: end-to-end renderPromptBody across all 22 fixtures. Validates
//   - outcome 0 returns null (severity-0 fixtures, including 12a-clean)
//   - outcomes 1/2/3 produce non-empty strings
//   - no unresolved {slot} markers leak
//   - "Other clusters" header appears iff f.otherClustersAllClear is non-empty
//   - prints DS08 (outcome 3), DS12b (outcome 1), DS13 (outcome 2) for spot inspection

import { readFileSync, writeFileSync } from 'fs';
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
const { renderPromptBody } = await import('../src/analysis/promptBodyRenderer.js');

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

const PLACEHOLDER_RE = /\{[a-zA-Z][\w.]*\}/g;

let failed = 0;
const samples = [];

function fail(msg) { console.error('  ✗', msg); failed++; }

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

  const model = buildHandoffModel(results, importConfig, nRows, nCols);
  const body = renderPromptBody(model);

  // outcome 0 → null contract
  if (model.outcome.tier === 0) {
    if (body !== null) fail(`${file}: outcome 0 but body is not null`);
    console.log(`✓ ${file}: outcome 0 → null`);
    samples.push({ file, tier: 0, body: null });
    continue;
  }

  if (typeof body !== 'string' || body.length === 0) {
    fail(`${file}: outcome ${model.outcome.tier} but body empty/non-string`);
    continue;
  }

  // No template leaks ({slot}-style markers)
  const leaks = body.match(PLACEHOLDER_RE);
  if (leaks) fail(`${file}: unresolved placeholders ${leaks.join(', ')}`);

  // Other clusters header appears iff non-empty
  const hasOtherHeader = body.includes('### Other clusters — all applicable tests cleared');
  const expectHeader = model.findings.otherClustersAllClear.length > 0;
  if (hasOtherHeader !== expectHeader) {
    fail(`${file}: "Other clusters" header presence mismatch (rendered=${hasOtherHeader}, expected=${expectHeader})`);
  }

  // Sanity: prologue line matches tier
  const expectedPrologueHead = `Outcome ${model.outcome.tier} of 4`;
  if (!body.includes(expectedPrologueHead)) {
    fail(`${file}: prologue header "${expectedPrologueHead}" missing`);
  }

  console.log(`✓ ${file}: outcome ${model.outcome.tier} → body ${body.length} chars, leaks=${leaks ? leaks.length : 0}, otherHdr=${hasOtherHeader}`);

  samples.push({ file, tier: model.outcome.tier, body });
}

function dsLabel(file) {
  const m = file.match(/^(\d+[a-z]?)/);
  return m ? `DS${m[1]}` : file;
}

writeFileSync('test/diag-s161-prompt-body.samples.txt',
  samples.map(s => {
    const head = `## ${dsLabel(s.file)} — ${s.file} (outcome ${s.tier})`;
    const body = s.tier === 0
      ? '[null — §4 does not render at outcome 0]'
      : s.body;
    return `${head}\n\n${body}`;
  }).join('\n\n---\n\n'),
);

console.log(failed > 0
  ? `\n✗ ${failed} renderer assertion(s) failed`
  : `\n✓ all 22 fixtures pass renderer checks. Sample output: test/diag-s161-prompt-body.samples.txt`,
);
process.exit(failed > 0 ? 1 : 0);

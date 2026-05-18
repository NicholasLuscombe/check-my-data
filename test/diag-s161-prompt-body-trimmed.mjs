// S161 prompt-body emits artefact generator. Writes
// docs/test-artefacts/S161-prompt-body-emits.md — per-fixture trim of the §4
// "Investigate further" clipboard text across all 22 batch fixtures. Keeps
// only the variant sections (Dataset / Outcome calibration / Findings /
// Cleared / Other clusters / Tests not run); drops the invariant template
// surfaces (role-setting intro, About Check My Data, How to think,
// Attachments, Common directions, Discipline) — read the renderer source
// (src/analysis/promptBodyRenderer.js) for those.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');
const { summarize } = await import('../src/import/summary.js');
const { buildHandoffModel } = await import('../src/analysis/handoffModel.js');
const { renderPromptBody } = await import('../src/analysis/promptBodyRenderer.js');

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

const FIXTURES = 'test/fixtures';

function dsLabel(file) {
  const m = file.match(/^(\d+[a-z]?)/);
  return m ? `DS${m[1]}` : file;
}

function trim(body) {
  if (body === null) return '§4 does not render at outcome 0; renderer returns null.';
  // Drop everything before "## Dataset" (intro paragraph + About section).
  // Drop "## How to think" onwards (How to think + Attachments + Discipline).
  const start = body.indexOf('## Dataset');
  const head = start >= 0 ? body.slice(start) : body;
  const tailIdx = head.indexOf('\n\n## How to think about these findings');
  const trimmed = tailIdx >= 0 ? head.slice(0, tailIdx) : head;
  // Down-shift body markdown headers by one level so they nest under the
  // fixture H2 in the artefact file: ### → ####, then ## → ###.
  return trimmed
    .replace(/^### /gm, '#### ')
    .replace(/^## /gm, '### ');
}

const parts = [];

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
  const summary = summarize(data, roles, condPerCol, false);
  const importConfig = {
    fileName: file, assay, assayAutoDetected: false, dataType, summary, vst,
    vstAutoSet: false, nRows: matrix.length, nCols: matrix[0]?.length || 0,
  };
  const model = buildHandoffModel(results, importConfig, matrix.length, matrix[0]?.length || 0);
  const body = renderPromptBody(model);
  parts.push(`## ${dsLabel(file)} — ${file} (outcome ${model.outcome.tier})\n\n${trim(body)}`);
}

const HEADER = `# S161 §4 prompt-body emits — 22-fixture trimmed dump

Each entry trimmed to the variant sections only (Dataset / Outcome calibration / Findings / Cleared / Other clusters / Tests not run). Invariant template surfaces (role-setting intro, About Check My Data, How to think, Attachments, Common directions, Discipline) live verbatim in [src/analysis/promptBodyRenderer.js](../../src/analysis/promptBodyRenderer.js). Generated by [test/diag-s161-prompt-body-trimmed.mjs](../../test/diag-s161-prompt-body-trimmed.mjs); rerun to refresh.

`;

writeFileSync('docs/test-artefacts/S161-prompt-body-emits.md',
  HEADER + parts.join('\n\n---\n\n') + '\n');
console.log('✓ wrote docs/test-artefacts/S161-prompt-body-emits.md');

// S339 — dumps the full section 4 prompt body for every fixture on both
// surfaces into a directory, so BEFORE and AFTER trees can be diffed
// line-for-line rather than trusting a line-matcher.
//
// Each surface's own config construction is replicated, not the batch
// harness's: BatchView derives assayAutoDetected as `provenance.assay !==
// 'user-set'`, ImportView as `confidence === 'high'`. Both are modelled
// unattended, so the 'user-set' provenance state is unreachable here — it
// needs a human on the Zone 1 dropdown.
//
// Usage: node test/probes/probe-s339-clipboard.mjs <outdir>
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { summarize } = await import('../../src/import/summary.js');
const { buildHandoffModel } = await import('../../src/analysis/handoffModel.js');
const { renderPromptBody } = await import('../../src/analysis/promptBodyRenderer.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');
const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });
for (const file of Object.keys(EXPECTED)) {
  const parsed = Papa.default.parse(readFileSync(join('test/fixtures', file), 'utf-8'), { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1], data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const detected = detectAssay(file, headers);
  const assay = detected ? detected.assay : 'general';
  const lf = !!detectLongFormat(headers, data);
  const sum = summarize(data, roles, condPerCol, false);
  const isGen = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGen && sum.zeros > sum.total * 0.1;
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rs = suggestRowSemantics({ assay, longFormatDetected: lf });
  const rowSemantics = rs.value || 'ordered';
  const cfg0 = { data, roles, hdrs: headers, condPerCol, zeroAsMissing, assay, dataType,
                 fileName: file, colRelationship: 'replicates', rowSemantics };
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs(cfg0);
  const vst = detectVST(matrix, assay);
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst,
                                        { isPivoted: false }, dataType, rowSemantics);
  const nRows = matrix.length, nCols = matrix[0]?.length || 0;
  const provenance = { cols: 'assumed', rows: rs.value ? 'auto' : 'assumed',
                       assay: detected ? 'auto' : 'assumed', transform: vst ? 'auto' : 'assumed' };
  const base = { fileName: file, assay, dataType, summary: sum, vst,
                 colRelationship: 'replicates', rowSemantics, provenance };
  for (const [surface, cfg] of [
    ['batch',  { ...base, assayAutoDetected: provenance.assay !== 'user-set' }],
    ['single', { ...base, assayAutoDetected: detected?.confidence === 'high' }],
  ]) {
    const body = renderPromptBody(buildHandoffModel(results, cfg, nRows, nCols));
    writeFileSync(join(OUT, `${file}.${surface}.txt`), body === null ? '((NO BODY — tier 0))\n' : body);
  }
}
console.log('dumped to', OUT);

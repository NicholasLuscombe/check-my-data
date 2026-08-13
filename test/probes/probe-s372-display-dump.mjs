/* S372 — display-fix dump. Run PRE and POST, diff the two.
 *
 * Captures every user-visible engine-side string across all 27 fixtures:
 *   - every result's `description`, keyed by fixture and test name
 *   - the §4 AI prompt body (renderPromptBody over buildHandoffModel)
 *
 * What it deliberately does NOT capture: card-side strings. Regional Noise's
 * headline and Autocorrelation's lag-table caption are composed inside JSX and
 * never reach a result field, so a zero diff here is the proof that a card-side
 * fix moved no engine output — not evidence that the card did not change.
 * The Regional Noise headline flip is measured by probe-s372-rn-direction.mjs.
 *
 *   node test/probes/probe-s372-display-dump.mjs > /tmp/pre.txt
 *   node test/probes/probe-s372-display-dump.mjs > /tmp/post.txt
 *   diff /tmp/pre.txt /tmp/post.txt
 */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { buildHandoffModel } = await import('../../src/analysis/handoffModel.js');
const { renderPromptBody } = await import('../../src/analysis/promptBodyRenderer.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  let raw = Papa.default.parse(csv, { skipEmptyLines: true }).data;
  raw = preprocessRaw(raw).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lf = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lf }).value || 'ordered';
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
  const { severity } = computeSeverity(results);

  console.log(`######## ${file}  severity=${severity}`);
  for (const r of [...results].sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
    console.log(`DESC ${file} :: ${r.name} :: ${r.flag} :: ${String(r.description ?? '').replace(/\s+/g, ' ')}`);
  }

  // §4 prompt body. importConfig shape mirrors what ReportView threads through.
  const importConfig = { fileName: file, assay, hdrs: headers, roles, condPerCol, rowSemantics };
  const model = buildHandoffModel(results, importConfig, matrix.length, (matrix[0] || []).length);
  const body = renderPromptBody(model);
  if (body == null) {
    console.log(`PROMPT ${file} :: (null — outcome 0)`);
  } else {
    for (const line of body.split('\n')) console.log(`PROMPT ${file} :: ${line}`);
  }
}

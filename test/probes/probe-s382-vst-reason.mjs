/* S382 — the VST reason string. Run PRE and POST, diff the two.
 *
 * Three things, in one pass over the 27 fixtures:
 *   1. Which detectVST branch each fixture takes, its slopeTest, and the
 *      reason string in full.
 *   2. The §4 clipboard body line composed from that string — the
 *      handoffModel -> promptBodyRenderer path, with `vst` actually threaded
 *      into importConfig the way App.jsx threads it (probe-s372-display-dump
 *      omits it, so its Dataset line reads "raw ()" and cannot see this).
 *   3. The ReportView "Copy summary" VST line, reproduced from
 *      ReportView.jsx:237 — gated on transform !== 'raw'.
 *
 * Plus a synthetic assay sweep: the same matrix through all ten assay labels,
 * which is what makes the `general`-only restriction visible without needing a
 * fixture per assay.
 *
 *   node test/probes/probe-s382-vst-reason.mjs > /tmp/pre.txt
 *   node test/probes/probe-s382-vst-reason.mjs > /tmp/post.txt
 *   diff /tmp/pre.txt /tmp/post.txt
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAYS, ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { buildHandoffModel } = await import('../../src/analysis/handoffModel.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

/** Which of detectVST's six returns produced this object. Derived from the
 *  shape of the result, not from an added field — src/ is not instrumented. */
function branchOf(v) {
  if (v.reason === 'No data') return 'no-data';
  if (v.reasonCode === 'signedData') return v.isInteger ? 'signed-gate-integer' : 'signed-gate-log-fallback';
  if (v.isInteger && v.transform === 'log') return 'integer-slope-above';
  if (v.isInteger) return 'integer-anscombe';
  if (v.transform === 'log' && v.slopeTest === 'above' && /proportional noise/.test(v.reason)) return 'continuous-general-promote';
  if (/only .* positive/.test(v.reason)) return 'posfrac-safety';
  return 'assay-fallback';   // the branch S382 rewords
}

function prep(file) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  let raw = Papa.default.parse(csv, { skipEmptyLines: true }).data;
  raw = preprocessRaw(raw).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const lf = detectLongFormat(headers, data);
  return { matrix, headers, roles, condPerCol,
    rowSemantics: suggestRowSemantics({ assay: EXPECTED[file].assay, longFormatDetected: !!lf }).value || 'ordered' };
}

console.log('== Part A — the 27 fixtures at their declared assay ==');
for (const [file, expected] of Object.entries(EXPECTED)) {
  const p = prep(file);
  const assay = expected.assay;
  const vst = detectVST(p.matrix, assay);
  console.log(`BRANCH ${file} :: assay=${assay} :: transform=${vst.transform} :: slopeTest=${vst.slopeTest ?? 'null'} :: branch=${branchOf(vst)}`);
  console.log(`REASON ${file} :: ${vst.reason}`);

  // §4 clipboard body — the Dataset "Variance-stabilising transform" line.
  // importConfig mirrors App.jsx:46 (`setImportConfig({...config, vst})`).
  const importConfig = { fileName: file, assay, hdrs: p.headers, roles: p.roles,
    condPerCol: p.condPerCol, rowSemantics: p.rowSemantics,
    dataType: ASSAY_DATATYPE_MAP[assay] || 'continuous', vst };
  const model = buildHandoffModel([], importConfig, p.matrix.length, (p.matrix[0] || []).length);
  console.log(`PROMPT4 ${file} :: - Variance-stabilising transform: ${model.dataset.vstLabel} (${model.dataset.vstProvenance})`);

  // ReportView "Copy summary" — reproduced from ReportView.jsx:236-237.
  console.log(vst.transform !== 'raw'
    ? `COPYSUM ${file} :: VST: ${vst.transform} — ${vst.reason}`
    : `COPYSUM ${file} :: (line not emitted — transform is raw)`);
}

console.log('');
console.log('== Part B — one matrix, all ten assay labels ==');
console.log('Shows which labels can reach the slope-CI promotion and which are');
console.log('turned away by the `assay === \'general\'` clause.');
// A continuous fixture whose interval is decisive above 1. 09-proteomics-clean
// is continuous and its CI sits entirely above 1 at the general label.
for (const file of ['09-proteomics-clean.csv', '01-densitometry-clean.csv']) {
  const p = prep(file);
  console.log(`-- ${file}`);
  for (const a of ASSAYS) {
    const vst = detectVST(p.matrix, a.v);
    console.log(`SWEEP ${file} :: ${a.v.padEnd(14)} :: transform=${vst.transform.padEnd(8)} :: slopeTest=${String(vst.slopeTest).padEnd(8)} :: branch=${branchOf(vst).padEnd(24)} :: ${vst.reason}`);
  }
}

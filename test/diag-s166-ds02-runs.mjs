// S166 C5 / A6 / A7 — DS02 Runs Test worstGroup threading + Row-Mean Runs conditionName
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { buildFindings } = await import('../src/analysis/findings.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');

const csv = readFileSync(join('test/fixtures', '02-densitometry-fabricated.csv'), 'utf-8');
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
const assay = 'densitometry';
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const lfDet = detectLongFormat(headers, data);
const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
const rowSemantics = rsSuggestion.value || 'ordered';
const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, 'continuous', rowSemantics);

const rn = results.find(r => r.name === 'Runs Test');
console.log('DS02 RUNS TEST (column-grouped, expects aggregator path):');
console.log('  flag                =', rn?.flag);
console.log('  groupsAssessed      =', rn?.groupsAssessed);
console.log('  worstGroup          =', rn?.worstGroup);
console.log('  pooledMeanZ         =', rn?.pooledMeanZ);
console.log('  pooledZCI95         =', Array.isArray(rn?.pooledZCI95) ? rn.pooledZCI95.map(v => v.toFixed(4)) : rn?.pooledZCI95);
console.log('  nPairs              =', rn?.nPairs);

const findings = buildFindings(results, matrix.length, matrix[0]?.length || 0);
console.log('\nRow-Mean Runs finding entry (conditionName check):');
const rmFinding = findings.find(f => f.tests?.[0]?.testId === 'Row-Mean Runs');
console.log('  found:', !!rmFinding);
if (rmFinding) {
  console.log('  tests[0].conditionName =', rmFinding.tests[0].conditionName);
  console.log('  locality               =', rmFinding.locality);
}

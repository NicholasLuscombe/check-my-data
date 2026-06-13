// S166 C1 — DS21 Autocorrelation r.flag + higherLagPromoted
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');

const csv = readFileSync(join('test/fixtures', '21-localised-ar.csv'), 'utf-8');
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
const assay = 'general';
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const dataType = 'continuous';
const lfDet = detectLongFormat(headers, data);
const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
const rowSemantics = rsSuggestion.value || 'ordered';
const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);

const ac = results.find(r => r.name === 'Autocorrelation');
const rm = results.find(r => r.name === 'Row-Mean Runs');
const rn = results.find(r => r.name === 'Runs Test');

console.log('AUTOCORRELATION (§2.1):');
console.log('  flag                =', ac?.flag);
console.log('  higherLagPromoted   =', ac?.higherLagPromoted);
console.log('  higherLagWasDecisive=', ac?.higherLagWasDecisive);
console.log('  pooledMeanR1        =', ac?.pooledMeanR1);
console.log('  pooledP             =', ac?.pooledP);
console.log('  pooledR1SD          =', typeof ac?.pooledR1SD === 'number' ? ac.pooledR1SD.toFixed(4) : ac?.pooledR1SD);
console.log('  pooledR1CI          =', Array.isArray(ac?.pooledR1CI) ? ac.pooledR1CI.map(v => v.toFixed(4)) : ac?.pooledR1CI);
console.log('  nPairs              =', ac?.nPairs);
console.log('  effectSizeClass     =', ac?.effectSizeClass);

console.log('\nRUNS TEST (§2.3):');
console.log('  flag                =', rn?.flag);
console.log('  pooledMeanZ         =', rn?.pooledMeanZ);
console.log('  pooledP             =', rn?.pooledP);
console.log('  pooledZSD           =', typeof rn?.pooledZSD === 'number' ? rn.pooledZSD.toFixed(4) : rn?.pooledZSD);
console.log('  pooledZCI95         =', Array.isArray(rn?.pooledZCI95) ? rn.pooledZCI95.map(v => v.toFixed(4)) : rn?.pooledZCI95);
console.log('  nPairs              =', rn?.nPairs);
console.log('  groupsAssessed      =', rn?.groupsAssessed);
console.log('  worstGroup          =', rn?.worstGroup);

console.log('\nROW-MEAN RUNS (§2.4):');
console.log('  flag                =', rm?.flag);
console.log('  bestSequence        =', rm?.bestSequence);
const { buildFindings } = await import('../src/analysis/findings.js');
const findings = buildFindings(results, matrix.length, matrix[0]?.length || 0);
const rmF = findings.find(f => f.tests?.[0]?.testId === 'Row-Mean Runs');
console.log('  findings:', !!rmF);
if (rmF) {
  console.log('  finding.locality           =', rmF.locality);
  console.log('  finding.tests[0].conditionName =', rmF.tests[0].conditionName);
}
const rnF = findings.find(f => f.tests?.[0]?.testId === 'Runs Test');
console.log('\nRUNS TEST finding entry:');
console.log('  finding present:', !!rnF);
if (rnF) {
  console.log('  finding.locality           =', rnF.locality);
}
console.log('  primaryP            =', rm?.primaryP);

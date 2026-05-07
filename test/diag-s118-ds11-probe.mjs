import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('/Users/hedgehog/check-my-data/src/analysis/engine.js');
const { computeSeverity } = await import('/Users/hedgehog/check-my-data/src/analysis/severity.js');
const { detectVST } = await import('/Users/hedgehog/check-my-data/src/stats/vst.js');
const { inferRoles } = await import('/Users/hedgehog/check-my-data/src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('/Users/hedgehog/check-my-data/src/import/parser.js');

const csv = readFileSync('/Users/hedgehog/check-my-data/test/fixtures/11-rnaseq-multicondition.csv', 'utf-8');
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
let raw = parsed.data;
const pp = preprocessRaw(raw); raw = pp.rows;
const headerRows = detectHeaderRows(raw);
let condPerCol = null;
if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, 'genomics');
const dataType = 'continuous';

for (const rs of ['ordered', 'arbitrary']) {
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, 'genomics', null, vst, {}, dataType, rs);
  const sev = computeSeverity(results);
  console.log(`\n=== rowSemantics=${rs} severity=${sev.severity} ===`);
  for (const r of results) {
    if (r.flag === 'HIGH' || r.flag === 'MODERATE') {
      console.log(`  ${r.flag.padEnd(8)} ${r.name}  primaryP=${r.primaryP}`);
    }
  }
  console.log('  N/A list:');
  for (const r of results) {
    if (r.flag === 'N/A') {
      const why = (r.description || '').slice(0, 80);
      console.log(`    N/A    ${r.name}  -- ${why}`);
    }
  }
}

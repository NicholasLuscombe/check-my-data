// Dataset-level diagnostic: show all non-LOW flags + DupDet sub-test p-values
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const [file, assay, dataTypeArg] = process.argv.slice(2);
if (!file) { console.error('usage: node test/ds-diag.mjs <csvfile> <assay> [dataType]'); process.exit(1); }

const csv = readFileSync(join('test/fixtures', file), 'utf-8');
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
let raw = parsed.data;
const pp = preprocessRaw(raw); raw = pp.rows;
const headerRows = detectHeaderRows(raw);
let condPerCol = null; if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
const headers = raw[headerRows - 1]; const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const dataType = dataTypeArg || (assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous'));
const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
console.log(`\n=== ${file} ===`);
for (const r of results) {
  if (r.flag && r.flag !== 'LOW' && r.flag !== 'N/A' && r.flag !== 'CLEAR') {
    console.log(`  ${r.name}: ${r.flag} p=${r.primaryP}`);
  }
}
const dup = results.find(r => r.name === 'Exact Duplicate Detection');
if (dup) {
  console.log('\nDupDet sub-tests:');
  console.log(`  flag=${dup.flag} combined=${dup.primaryP}`);
  console.log(`  T1 obs=${dup.collisionObs} n=${dup.collisionNPairs} p=${dup.collisionP}`);
  console.log(`  T2 rows=${dup.duplicateRows} p=${dup.rowDupPValue}`);
  console.log(`  T3 matches=${dup.withinRowMatches} exp=${dup.withinRowExpected} pairT=${dup.withinRowPairTotal} p=${dup.withinRowP}`);
  console.log(`  T4 bestBlockP=${dup.bestBlockP}`);
}

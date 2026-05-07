// S95 Track A Item 1a baseline: capture which DupDet sub-test drives flagging
// in the current `structuralP = min(bestBlockP, rowDupPValueAdj)` regime.
// Reports Test 2 (row-dup), Test 3 (within-row), Test 4 (block) p-values for each dataset.
// No Test 1 p-value exists today — to be added in 1a.
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';
const TARGETS = [
  ['02-densitometry-fabricated.csv', 'densitometry'],
  ['04-qpcr-fabricated.csv', 'qpcr'],
  ['06-cellcount-fabricated.csv', 'cell_count'],
  ['11-rnaseq-multicondition.csv', 'genomics'],
];

for (const [file, assay] of TARGETS) {
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
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  const dup = results.find(r => r.name === 'Exact Duplicate Detection');
  if (!dup) { console.log(`${file}: no DupDet result`); continue; }
  console.log(`\n=== ${file} ===`);
  console.log(`  flag:           ${dup.flag}`);
  console.log(`  combined p:     ${dup.primaryP}`);
  console.log(`  p1 (HHI):       ${dup.p1} (${dup.p1Source})`);
  console.log(`  Test 1 collisionObs: ${dup.collisionObs}  n_pairs: ${dup.collisionNPairs}  p: ${dup.collisionP}`);
  console.log(`  Test 2 duplicateRows: ${dup.duplicateRows}  rowDupPValue: ${dup.rowDupPValue}`);
  console.log(`  Test 3 withinRowMatches: ${dup.withinRowMatches}  expected: ${dup.withinRowExpected}  pairTotal: ${dup.withinRowPairTotal}  z: ${dup.withinRowZ}  p: ${dup.withinRowP}`);
  console.log(`  Test 4 bestBlockP:   ${dup.bestBlockP}`);
}

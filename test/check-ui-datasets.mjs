// Analyse ui-review-clear.csv and ui-review-flagged.csv.
// Reports severity + flag level for every test.
// Usage: node test/check-ui-datasets.mjs
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FILES = [
  { file: 'test-data/ui-review-clear.csv',   label: 'DS-UIclear',   assay: 'general', expectedSev: 0 },
  { file: 'test-data/ui-review-flagged.csv', label: 'DS-UIflagged', assay: 'general', expectedSev: 3 },
];

for (const { file, label, assay, expectedSev } of FILES) {
  const csv = readFileSync(file, 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: false });
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
  const dataType = 'continuous';

  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  const { severity } = computeSeverity(results);

  const pass = severity === expectedSev;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${pass ? '✓' : '✗'} ${label}  severity=${severity} (expected ${expectedSev})`);
  console.log(`  Matrix: ${matrix.length} rows × ${matrix[0]?.length ?? 0} cols`);
  console.log(`  Conditions: ${condCtx.type}, paired=${condCtx.paired}`);
  console.log(`  VST: ${vst}`);
  console.log('');

  // Group by flag level
  const byFlag = { HIGH: [], MODERATE: [], LOW: [], 'N/A': [], CLEAR: [] };
  for (const r of results) {
    const bucket = byFlag[r.flag] ?? byFlag['CLEAR'];
    bucket.push(r.name);
  }
  for (const [flag, names] of Object.entries(byFlag)) {
    if (names.length) console.log(`  ${flag.padEnd(10)} ${names.join(', ')}`);
  }
}

console.log('\nDone.');

// Diagnostic: check DS08 SelNoise variance ratio before applying effect-size gate fix
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { testSelectiveNoise } = await import('../src/tests/selectiveNoise.js');

const csv = readFileSync(join('test/fixtures', '08-elisa-fabricated.csv'), 'utf-8');
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
const { matrix } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

// Detect VST and apply if needed (SelNoise runs on VST matrix)
const vst = detectVST(matrix, 'elisa');
let testMatrix = matrix;
if (vst?.transform === 'log') {
  testMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
} else if (vst?.transform === 'anscombe') {
  testMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
}

const result = testSelectiveNoise(testMatrix);
console.log('DS08 SelNoise result:');
console.log(`  flag: ${result.flag}`);
console.log(`  pBartlett: ${result.pBartlett}`);
console.log(`  maxMinVarianceRatio: ${result.maxMinVarianceRatio}`);
console.log(`  N (rows): ${testMatrix.length}`);
console.log(`  Ratio >= 3.0? ${parseFloat(result.maxMinVarianceRatio) >= 3.0 ? 'YES - safe to proceed' : 'NO - STOP, need recalibration'}`);

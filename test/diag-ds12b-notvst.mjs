// Check DS12b SelNoise with and without VST, and through engine pipeline
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { testSelectiveNoise } = await import('../src/tests/selectiveNoise.js');

const csv = readFileSync(join('test/fixtures', '12b-uniform-mixture-fabricated.csv'), 'utf-8');
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

const vst = detectVST(matrix, 'general');
console.log('VST:', vst);
console.log('Matrix shape:', matrix.length, 'x', matrix[0].length);
console.log('condCtx type:', condCtx.type, 'names:', condCtx.names);

// Raw (no VST)
const rawResult = testSelectiveNoise(matrix);
console.log('\nRaw (no VST):');
console.log('  ratio:', rawResult.maxMinVarianceRatio, 'p:', rawResult.pBartlett, 'flag:', rawResult.flag);

// With VST
if (vst?.transform === 'log') {
  const vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  const vstResult = testSelectiveNoise(vstMatrix);
  console.log('\nWith log VST:');
  console.log('  ratio:', vstResult.maxMinVarianceRatio, 'p:', vstResult.pBartlett, 'flag:', vstResult.flag);
}

// Full engine run
const results = await runFullAnalysis(matrix, rawMatrix, condCtx, 'general', null, vst, {}, 'continuous');
const sn = results.find(r => r.name?.includes('Selective Noise'));
const rsc = results.find(r => r.name?.includes('Residual Spike'));
console.log('\nFull engine SelNoise:', sn?.flag, 'p:', sn?.pBartlett, 'ratio:', sn?.maxMinVarianceRatio);
console.log('Full engine RSC:', rsc?.flag, 'p:', rsc?.primaryP);

const { severity } = computeSeverity(results);
console.log('\nSeverity:', severity);
const flagged = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => `${r.name}: ${r.flag}`);
console.log('Flagged tests:', flagged.join(', '));

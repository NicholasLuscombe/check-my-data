// Diagnostic: check DS08 and DS12b SelNoise variance ratios
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { testSelectiveNoise } = await import('../src/tests/selectiveNoise.js');
const { mean, variance } = await import('../src/stats/primitives.js');

function analyseDataset(file, assay) {
  const csv = readFileSync(join('test/fixtures', file), 'utf-8');
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
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

  const vst = detectVST(matrix, assay);
  let testMatrix = matrix;
  if (vst?.transform === 'log') {
    testMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  } else if (vst?.transform === 'anscombe') {
    testMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  }

  const result = testSelectiveNoise(testMatrix);

  // Also check per-condition if row-grouped
  console.log(`\n${file} (N=${testMatrix.length}, ${testMatrix[0].length} cols):`);
  console.log(`  VST: ${vst?.transform || 'none'}`);
  console.log(`  Pooled ratio: ${result.maxMinVarianceRatio}`);
  console.log(`  Bartlett p: ${result.pBartlett}`);
  console.log(`  Flag: ${result.flag}`);
  console.log(`  condCtx type: ${condCtx.type}`);

  if (condCtx.type === 'row-grouped') {
    console.log(`  Row conditions: ${condCtx.names.join(', ')}`);
    const slices = condCtx.slices();
    for (const slice of slices) {
      let sm = slice.matrix;
      if (vst?.transform === 'log') {
        sm = sm.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
      } else if (vst?.transform === 'anscombe') {
        sm = sm.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
      }
      const r = testSelectiveNoise(sm);
      console.log(`  ${slice.name} (N=${sm.length}): ratio=${r.maxMinVarianceRatio}, p=${r.pBartlett}, flag=${r.flag}`);
    }
  }
}

analyseDataset('08-elisa-fabricated.csv', 'elisa');
analyseDataset('12b-uniform-mixture-fabricated.csv', 'general');
// Also check some other key datasets
analyseDataset('02-densitometry-fabricated.csv', 'densitometry');
analyseDataset('06-cellcount-fabricated.csv', 'cell_count');

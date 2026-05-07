// Diagnostic — find any flagged localised tests across the 22-fixture
// batch that have empty extractCellFlags output (i.e. the add-8 fallback
// path would fire). Helps confirm Mahalanobis Row Outlier on DS15 is the
// only case in current batch, vs surfacing other tests that silently drop.

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
const { extractCellFlags } = await import('../src/analysis/convergence.js');
const { GLOBAL_TESTS } = await import('../src/constants/mechanisms.js');

const FIXTURES = 'test/fixtures';
const ASSAYS = {
  '01-densitometry-clean.csv': 'densitometry',
  '02-densitometry-fabricated.csv': 'densitometry',
  '03-qpcr-clean.csv': 'qpcr',
  '04-qpcr-fabricated.csv': 'qpcr',
  '05-cellcount-clean.csv': 'cell_count',
  '06-cellcount-fabricated.csv': 'cell_count',
  '07-elisa-clean.csv': 'elisa',
  '08-elisa-fabricated.csv': 'elisa',
  '09-proteomics-clean.csv': 'proteomics',
  '10-proteomics-fabricated.csv': 'proteomics',
  '11-rnaseq-multicondition.csv': 'genomics',
  '12a-uniform-mixture-clean.csv': 'general',
  '12b-uniform-mixture-fabricated.csv': 'general',
  '13-vfstest-cellcountest.csv': 'cell_count',
  '14-crctest-survey.csv': 'survey',
  '15-missing-carlisle.csv': 'general',
  '16-densitometry-carlisle-overbalanced.csv': 'densitometry',
  '17-densitometry-carlisle-clean.csv': 'densitometry',
  '19-inheritance-fabricated.csv': 'general',
  '20-bimodal-fab.csv': 'general',
  '21-localised-ar.csv': 'general',
  '22-covariance-block.csv': 'general',
};

console.log('Looking for flagged localised tests with empty extractCellFlags (would trigger add-8 fallback)...\n');

let hits = 0;
for (const [file, assay] of Object.entries(ASSAYS)) {
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
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false
  });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, () => {}, vst,
    { isPivoted: false }, dataType, rowSemantics
  );
  const nRows = matrix.length;
  const nCols = matrix[0]?.length || 0;
  for (const r of results) {
    if (!r) continue;
    const fl = r.flag;
    if (fl !== 'HIGH' && fl !== 'FLAGGED' && fl !== 'MODERATE' && fl !== 'NOTED') continue;
    if (GLOBAL_TESTS.has(r.name)) continue; // global tests don't need a region
    const raw = extractCellFlags(r, nRows, nCols);
    if (raw.length === 0) {
      hits++;
      const fbFires = (r.nRows > 0);
      console.log(`${file.padEnd(45)} | ${r.name.padEnd(30)} | flag=${fl.padEnd(8)} | r.nRows=${r.nRows ?? '-'} | fallback fires=${fbFires}`);
    }
  }
}

console.log(`\n${hits} flagged localised tests with empty extractCellFlags found.`);

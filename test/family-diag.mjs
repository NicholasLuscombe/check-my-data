// Per-dataset family diversity pre/post Track C
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { TEST_MECHANISM } = await import('../src/constants/mechanisms.js');

const TARGETS = [
  ['01-densitometry-clean.csv','densitometry'], ['02-densitometry-fabricated.csv','densitometry'],
  ['03-qpcr-clean.csv','qpcr'], ['04-qpcr-fabricated.csv','qpcr'],
  ['05-cellcount-clean.csv','cell_count'], ['06-cellcount-fabricated.csv','cell_count'],
  ['07-elisa-clean.csv','elisa'], ['08-elisa-fabricated.csv','elisa'],
  ['09-proteomics-clean.csv','proteomics'], ['10-proteomics-fabricated.csv','proteomics'],
  ['11-rnaseq-multicondition.csv','genomics'],
  ['12a-uniform-mixture-clean.csv','general'], ['12b-uniform-mixture-fabricated.csv','general'],
  ['13-vfstest-cellcountest.csv','cell_count'], ['14-crctest-survey.csv','survey'],
  ['15-missing-carlisle.csv','general'], ['16-densitometry-carlisle-overbalanced.csv','densitometry'],
  ['17-densitometry-carlisle-clean.csv','densitometry'],
];

// Old category map (pre-Track-C) for comparison
const OLD_MAP = {
  "Benford's Law (First Digit)":"digits","Benford's Law (Second Digit)":"digits",
  "Terminal Digit Uniformity":"digits","Decimal Precision Consistency":"digits",
  "Value-Frequency Spike":"digits",
  "Inter-Replicate Correlation":"copied","Exact Duplicate Detection":"copied",
  "Constant-Offset Blocks":"copied","Residual Spike Correlation":"copied",
  "Baseline Balance":"perfect","Cross-Condition Rank Correlation":"perfect",
  "Mahalanobis Row Outlier":"perfect",
  "Noise Scaling With Measurement Size":"noise","Excess Kurtosis":"noise",
  "Entropy / Zipf Analysis":"noise","Autocorrelation":"noise","Runs Test":"noise",
  "Within-Row Variance":"noise",
  "LOESS Residual Analysis":"uneven","Row-Mean Runs":"uneven",
  "Selective Noise Partitioning":"uneven","Regional Noise Homogeneity":"uneven",
  "Missing Data Pattern":"uneven",
};

for (const [file, assay] of TARGETS) {
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
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  const flagged = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE');
  const newFams = new Set(flagged.map(r => TEST_MECHANISM[r.name] || r.category));
  const oldFams = new Set(flagged.map(r => OLD_MAP[r.name] || r.category));
  const high = flagged.filter(r => r.flag === 'HIGH').length;
  const mod = flagged.filter(r => r.flag === 'MODERATE').length;
  const newSev = (high>=3)?3:(high>=2)?3:(high>=1&&newFams.size>=2)?3:(high>=1)?2:(mod>=2&&newFams.size>=2)?3:(mod>=3)?1:(mod>=1)?1:0;
  const oldSev = (high>=3)?3:(high>=2)?3:(high>=1&&oldFams.size>=2)?3:(high>=1)?2:(mod>=2&&oldFams.size>=2)?3:(mod>=3)?1:(mod>=1)?1:0;
  if (oldSev !== newSev) {
    console.log(`*** REGRESSION ${file}: old=${oldSev} new=${newSev}`);
    console.log(`    HIGH:${high} MOD:${mod} | oldFams=${[...oldFams].join(',')} newFams=${[...newFams].join(',')}`);
    console.log(`    Flagged: ${flagged.map(r=>`${r.name}:${r.flag}`).join(' | ')}`);
  } else {
    console.log(`ok   ${file}: sev=${newSev}`);
  }
}

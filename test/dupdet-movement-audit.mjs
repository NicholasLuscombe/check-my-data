// S95 Track A Item 1a — DupDet movement audit
// For every dataset, compute BOTH:
//   Pre-Option-A: structuralP = min(bestBlockP, rowDupP); BH-FDR on [structuralP, oldT3p_via_z]
//   Post-Option-A: BH-FDR on [collisionP, rowDupP, withinRowP_binomial, bestBlockP]
// Report which sub-test drove each flag, severity movement, interpretation.
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { bhFDR, normalCDF } = await import('../src/stats/primitives.js');
const { flagFromP } = await import('../src/constants/thresholds.js');

const FIXTURES = 'test/fixtures';
const TARGETS = [
  ['01-densitometry-clean.csv',            'densitometry'],
  ['02-densitometry-fabricated.csv',       'densitometry'],
  ['03-qpcr-clean.csv',                    'qpcr'],
  ['04-qpcr-fabricated.csv',               'qpcr'],
  ['05-cellcount-clean.csv',               'cell_count'],
  ['06-cellcount-fabricated.csv',          'cell_count'],
  ['07-elisa-clean.csv',                   'elisa'],
  ['08-elisa-fabricated.csv',              'elisa'],
  ['09-proteomics-clean.csv',              'proteomics'],
  ['10-proteomics-fabricated.csv',         'proteomics'],
  ['11-rnaseq-multicondition.csv',         'genomics'],
  ['12a-uniform-mixture-clean.csv',        'general'],
  ['12b-uniform-mixture-fabricated.csv',   'general'],
  ['13-vfstest-cellcountest.csv',          'cell_count'],
  ['14-crctest-survey.csv',                'survey'],
  ['15-missing-carlisle.csv',              'general'],
  ['16-densitometry-carlisle-overbalanced.csv', 'densitometry'],
  ['17-densitometry-carlisle-clean.csv',   'densitometry'],
];

function subTestDriver(adjPs, labels) {
  let minIdx = 0;
  for (let i = 1; i < adjPs.length; i++) if (adjPs[i] < adjPs[minIdx]) minIdx = i;
  return { label: labels[minIdx], p: adjPs[minIdx] };
}

function fmt(p) {
  if (p == null) return '—';
  if (p < 1e-10) return p.toExponential(2);
  if (p < 0.0001) return '<0.0001';
  return p.toFixed(4);
}

const rows = [];
for (const [file, assay] of TARGETS) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
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
  const dup = results.find(r => r.name === 'Exact Duplicate Detection');
  const { severity } = computeSeverity(results);
  if (!dup || !dup._rawPs) { rows.push({ file, severity, dupFlag: dup?.flag||'N/A', note:'no _rawPs' }); continue; }
  const [collisionP, rowDupP, withinRowP_new, bestBlockP] = dup._rawPs;
  // Reconstruct old regime: structuralP = min(block, rowDup); old T3 p = normalCDF-based
  const wrZ = dup._wrZ || 0;
  const oldT3P = wrZ > 0 ? 1 - normalCDF(wrZ) : 1;
  const structuralP = Math.min(bestBlockP, rowDupP);
  const oldRawPs = [structuralP, oldT3P];
  const oldAdj = bhFDR(oldRawPs);
  const oldCombined = Math.min(...oldAdj);
  const oldFlag = flagFromP(oldCombined);
  const oldDriver = subTestDriver(oldAdj, ['structuralP(minBlockRowDup)', 'withinRow(z)']);
  const newRawPs = dup._rawPs;
  const newAdj = bhFDR(newRawPs);
  const newCombined = Math.min(...newAdj);
  const newFlag = flagFromP(newCombined);
  const newDriver = subTestDriver(newAdj, ['T1 collision', 'T2 rowDup', 'T3 withinRow', 'T4 block']);
  rows.push({
    file, severity, assay,
    oldFlag, oldCombined, oldDriver,
    newFlag, newCombined, newDriver,
    rawPs: { T1: collisionP, T2: rowDupP, T3_new: withinRowP_new, T3_old: oldT3P, T4: bestBlockP },
    adjPs: { old: oldAdj, new: newAdj },
  });
}

console.log('\n=== Track A Item 1a — DupDet movement audit ===\n');
for (const r of rows) {
  console.log(`${r.file}  [assay=${r.assay}]`);
  console.log(`  severity (post-1a full engine): ${r.severity}`);
  console.log(`  Old DupDet: flag=${r.oldFlag}  combined=${fmt(r.oldCombined)}  driver=${r.oldDriver.label} (adj=${fmt(r.oldDriver.p)})`);
  console.log(`  New DupDet: flag=${r.newFlag}  combined=${fmt(r.newCombined)}  driver=${r.newDriver.label} (adj=${fmt(r.newDriver.p)})`);
  console.log(`  Raw:  T1=${fmt(r.rawPs.T1)}  T2=${fmt(r.rawPs.T2)}  T3new=${fmt(r.rawPs.T3_new)}  T3old=${fmt(r.rawPs.T3_old)}  T4=${fmt(r.rawPs.T4)}`);
  console.log(`  Adj old=[${r.adjPs.old.map(fmt).join(', ')}]  Adj new=[${r.adjPs.new.map(fmt).join(', ')}]`);
  console.log();
}

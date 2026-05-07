globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { readFileSync } = await import('fs');
const { extractAnalysisInputs, runFullAnalysis } = await import('/Users/hedgehog/check-my-data/src/analysis/engine.js');
const { computeSeverity } = await import('/Users/hedgehog/check-my-data/src/analysis/severity.js');
const { detectVST } = await import('/Users/hedgehog/check-my-data/src/stats/vst.js');
const { inferRoles } = await import('/Users/hedgehog/check-my-data/src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('/Users/hedgehog/check-my-data/src/import/parser.js');
const csv = readFileSync('/Users/hedgehog/check-my-data/test/fixtures/22-covariance-block.csv', 'utf-8');
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
console.log(`DS22 VST: transform=${vst.transform}, reasonCode=${vst.reasonCode || '—'}`);
console.log(`  reason: ${vst.reason}`);
const results = await runFullAnalysis(matrix, rawMatrix, condCtx, 'general', null, vst, {}, 'continuous');
const { severity } = computeSeverity(results);
console.log(`DS22 severity: ${severity}`);
console.log('All non-LOW flags:');
for (const r of results) {
  if (r.flag === 'HIGH' || r.flag === 'MODERATE' || r.flag === 'NOTED' || r.flag === 'FLAGGED') {
    console.log(`  ${r.name}: ${r.flag} (p=${r.primaryP?.toFixed?.(4) ?? r.primaryP})`);
  }
}
console.log('\nExcess Kurtosis status:');
const kurt = results.find(r => r.name === 'Excess Kurtosis');
if (kurt) console.log(`  flag=${kurt.flag}, primaryP=${kurt.primaryP}`);
console.log('\nBlocked Mahalanobis status:');
const bm = results.find(r => r.name === 'Blocked Mahalanobis');
if (bm) console.log(`  flag=${bm.flag}, primaryP=${bm.primaryP}`);

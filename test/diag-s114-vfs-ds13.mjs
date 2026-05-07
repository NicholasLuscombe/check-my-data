// S114 Phase 2 diagnostic — DS13 (VFS-target fabricated fixture) tier
// regressed from severity 2 → 1 after the pass-2 multi-spike gate.
// Dumps pass-1 + pass-2 spike lists to show whether the lost tier came
// from pass-1 degradation or something unexpected.
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { testValueFrequencySpike } = await import('../src/tests/valueFrequencySpike.js');

const FIX = 'test/fixtures/13-vfstest-cellcountest.csv';
const csv = readFileSync(FIX, 'utf-8');
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
let raw = parsed.data;
const pp = preprocessRaw(raw); raw = pp.rows;
const headerRows = detectHeaderRows(raw);
let condPerCol = null;
if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const assay = 'cell_count';
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const dataType = 'count';
const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
const { severity, high, mod } = computeSeverity(results);

console.log(`Severity=${severity}  HIGH=${high}  MOD=${mod}`);
console.log(`Flagged tests:`);
for (const r of results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')) {
  console.log(`  ${r.flag.padEnd(9)} ${r.name}  primaryP=${r.primaryP?.toExponential?.(3) ?? r.primaryP}`);
}

const vfs = results.find(r => r.name === 'Value-Frequency Spike');
console.log(`\nVFS detail:`);
console.log(`  flag=${vfs.flag}  primaryP=${vfs.primaryP?.toExponential?.(3)}`);
console.log(`  nSpikesPass1=${vfs.nSpikesPass1}  nSpikesPass2=${vfs.nSpikesPass2}  drivingPass=${vfs.drivingPass}`);
console.log(`  pass2SpikeCount=${vfs.pass2SpikeCount}  pass2MultiSpikeCleared=${vfs.pass2MultiSpikeCleared}  pass2TierRaw=${vfs.pass2TierRaw}`);
console.log(`  pass1Status=${vfs.pass1Status}`);
console.log(`  pass2Status=${vfs.pass2Status}`);
console.log(`\nTop 20 spike details:`);
for (const d of (vfs.details || []).slice(0, 20)) {
  console.log(`  ${d.pass.padEnd(6)} value=${String(d.value).padEnd(10)} obs=${d.observed} exp=${d.expected} ratio=${d.ratio} adjP=${d.adjP}`);
}

// S114 Phase 2 — DS04 (qpcr-fabricated) pass-2 detail dump. DS04 is
// the single fixture where Track E (c) lifts a NOVEL flag (pass-2-only
// MOD, multi-spike gate cleared). Dumps the 3 digit-pass spike details
// so Chat can verify this is a legitimate fabrication signal, not a
// clean-data false positive.
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { testValueFrequencySpike } = await import('../src/tests/valueFrequencySpike.js');

const FIX = 'test/fixtures/04-qpcr-fabricated.csv';
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
const { matrix, rawMatrix } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

const r = testValueFrequencySpike(matrix, rawMatrix);
console.log(`Matrix: ${matrix.length} rows × ${matrix[0]?.length || 0} cols`);
console.log(`First raw cells: ${JSON.stringify(rawMatrix[0]?.slice(0, 5))}`);
console.log(`\nVFS flag=${r.flag}  primaryP=${r.primaryP.toExponential(3)}  driver=${r.drivingPass}`);
console.log(`Pass 1: ${r.pass1Status || 'active'} — nSpikes=${r.nSpikesPass1}`);
console.log(`Pass 2: ${r.pass2Status || 'active'} — nSpikes=${r.nSpikesPass2}  gate=${r.pass2MultiSpikeCleared}  rawTier=${r.pass2TierRaw}`);
console.log(`Pass 2 diag: ${JSON.stringify(r.pass2Diag, null, 2)}`);
console.log(`\nAll spike details:`);
for (const d of r.details || []) {
  console.log(`  ${d.pass.padEnd(6)} value=${String(d.value).padEnd(10)} obs=${d.observed} exp=${d.expected} ratio=${d.ratio} adjP=${d.adjP}`);
}

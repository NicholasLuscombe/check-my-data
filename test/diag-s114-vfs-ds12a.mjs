// S114 diagnostic — inspect VFS pass-2 output on DS12a (clean fixture
// flagged MODERATE post-S114). Dumps per-pass spike lists and bucket
// diagnostics so we can characterise the false-positive driver.
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { testValueFrequencySpike } = await import('../src/tests/valueFrequencySpike.js');

const FIX = 'test/fixtures/12a-uniform-mixture-clean.csv';
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

console.log(`Matrix: ${matrix.length} rows × ${matrix[0]?.length || 0} cols`);
console.log(`First raw cells: ${JSON.stringify(rawMatrix[0]?.slice(0, 6))}`);

const res = testValueFrequencySpike(matrix, rawMatrix);
console.log(`\nFlag: ${res.flag}  primaryP=${res.primaryP?.toExponential?.(3) ?? res.primaryP}`);
console.log(`drivingPass=${res.drivingPass}`);
console.log(`nSpikesPass1=${res.nSpikesPass1}  nSpikesPass2=${res.nSpikesPass2}  nTested=${res.nTested}`);
console.log(`pass1Status=${res.pass1Status}`);
console.log(`pass2Status=${res.pass2Status}`);
console.log(`pass2Diag=${JSON.stringify(res.pass2Diag, null, 2)}`);
console.log(`\nTop 20 spike details:`);
for (const d of (res.details || []).slice(0, 20)) {
  console.log(`  ${d.pass.padEnd(6)} value=${String(d.value).padEnd(8)} obs=${d.observed} exp=${d.expected} ratio=${d.ratio} adjP=${d.adjP}`);
}

// Per-column base rate of fractional substrings — helps characterise
// which column(s) drive the FP
if (res.drivingPass === 'digit') {
  console.log(`\nPer-column fractional-content base rate:`);
  const nCols = matrix[0]?.length || 0;
  for (let c = 0; c < nCols; c++) {
    let nFrac = 0, nTotal = 0;
    for (let r = 0; r < matrix.length; r++) {
      const v = matrix[r][c];
      if (v == null || !isFinite(v)) continue;
      nTotal++;
      const raw = rawMatrix?.[r]?.[c];
      const s = raw != null ? String(raw) : String(v);
      if (s.includes('.')) nFrac++;
    }
    console.log(`  col ${c} (${headers[c] || '?'}): ${nFrac}/${nTotal} fractional (${(nFrac / (nTotal || 1) * 100).toFixed(1)}%)`);
  }
}

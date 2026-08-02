// probe-s343-ccc.mjs — S343 part 5. Why does Cross-Condition Consistency move?
//
// The offset sweep names CCC as the sole driver of 09-proteomics-clean's
// instability. This dumps CCC's own result object across a few offsets so the
// mechanism is visible rather than inferred: the permutation count B, the
// reported p, and where it sits relative to ALPHA.NOTE = 0.01.
//
// READ-ONLY on src/. Usage: SEEDS=0,1,2,3,4,5,6,7 node test/probes/probe-s343-ccc.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const seedInject = await import('../seed-inject.mjs');
seedInject.registerSeedHook();
const setSeed = seedInject.setSeed;

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FILE = process.env.FILE || '09-proteomics-clean.csv';
const SEEDS = (process.env.SEEDS || '0,1,2,3,4,5,6,7').split(',').map(Number);
const assay = EXPECTED[FILE].assay;

const csv = readFileSync(join('test/fixtures', FILE), 'utf-8');
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
let raw = preprocessRaw(parsed.data).rows;
const headerRows = detectHeaderRows(raw);
const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';

console.log(`S343 — Cross-Condition Consistency on ${FILE}, across PRNG offsets\n`);
console.log('offset 0 is the identity — the stream the shipped tool derives for this file.');
console.log('MODERATE boundary is ALPHA.NOTE = 0.01.\n');

for (const s of SEEDS) {
  setSeed(s);
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, 'ordered');
  const { severity } = computeSeverity(results);
  const c = results.find(r => r.name === 'Cross-Condition Consistency');
  const p = Number(c?.primaryP);
  console.log(`offset ${String(s).padStart(3)}  severity ${severity}  CCC flag ${String(c?.flag).padEnd(9)} p=${c?.primaryP}` +
    (Number.isFinite(p) ? `  (= ${Math.round(p * 500)}/500 at B=499)` : ''));
  if (s === SEEDS[0]) {
    const keys = Object.keys(c || {}).filter(k => !['details', 'subDetails'].includes(k));
    console.log('  CCC result fields: ' + keys.join(', '));
    console.log('  top: ' + JSON.stringify(c?.top));
    console.log('  first 4 details: ');
    for (const d of (c?.details || []).slice(0, 4)) console.log('    ' + JSON.stringify(d).slice(0, 260));
  }
}

/* S388 — full-field dump of the three results the capped-count fix touches.
 *
 * Purpose: the PRE/POST engine check. Dumps EVERY key on `Exact Duplicate
 * Detection`, `Constant-Offset Blocks` and `Sequential Duplication` for all 27
 * batch fixtures, keys sorted, values JSON-serialised in full (evidence arrays
 * included). The pass condition, stated in advance: every pre-existing field
 * byte-identical between the two runs, and the only diff lines are the newly
 * added total fields appearing.
 *
 * Loads each fixture through the identical pipeline `test/validate-batch.mjs`
 * uses, at the default PRNG stream (seed offset 0). Read-only on src/.
 *
 * Usage: node test/probes/probe-s388-capped-count-dump.mjs   (from the repo root)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { EXPECTED } = await import('../batch-fixtures.mjs');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');

const FIXTURES = 'test/fixtures';
const WATCHED = ['Exact Duplicate Detection', 'Constant-Offset Blocks', 'Sequential Duplication'];

// Deterministic serialisation: objects emit their keys in sorted order at every
// depth, so a key-order change in a producer cannot masquerade as a value change.
function ser(v) {
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(ser).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + ser(v[k])).join(',') + '}';
}

for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  let raw = Papa.default.parse(csv, { skipEmptyLines: true }).data;
  const pp = preprocessRaw(raw); raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';

  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);

  for (const name of WATCHED) {
    const r = results.find(x => x.name === name);
    if (!r) { console.log(`${file} | ${name} | <ABSENT>`); continue; }
    for (const k of Object.keys(r).sort()) {
      console.log(`${file} | ${name} | ${k} = ${ser(r[k])}`);
    }
  }
}

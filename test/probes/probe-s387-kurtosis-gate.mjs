/* S387 Part 4 — the Excess Kurtosis in-card gate, read from the live field.
 *
 * Establishes the two values `docs/shared/CONDITION-2-CARD-CLASSIFICATION.md` §Part 4
 * reports, and the correction it carries: DS12b's Fabricated condition returns a
 * BH-adjusted p of 0.0040 (raw permutation p 0.0020, doubled by BH at m = 2) and a
 * `verdict` of "noted" — NOT the 0.0080 the record carried. `MiniCard_Kurtosis.jsx:65`
 * therefore evaluates TRUE and the condition-stratified section is not
 * render-unexercised.
 *
 * Loads the fixture through the same path `test/validate-batch.mjs` uses, at the
 * default PRNG stream. Read-only on src/.
 *
 * Usage: node test/probes/probe-s387-kurtosis-gate.mjs   (from the repo root)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { ALPHA, flagFromP } = await import('../../src/constants/thresholds.js');

const FIXTURES = 'test/fixtures';
const file = '12b-uniform-mixture-fabricated.csv';
const assay = 'general';

const csv = readFileSync(join(FIXTURES, file), 'utf-8');
let raw = Papa.default.parse(csv, { skipEmptyLines: true }).data;
const pp = preprocessRaw(raw); raw = pp.rows;
const headerRows = detectHeaderRows(raw);
let condPerCol = null;
if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
const lfDet = detectLongFormat(headers, data);
const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';

const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
const r = results.find(x => x.name === 'Excess Kurtosis');

console.log('ALPHA.FLAG =', ALPHA.FLAG, '  ALPHA.NOTE =', ALPHA.NOTE);
console.log('card flag  =', JSON.stringify(r.flag));
const condK = r.condKurtosis;
console.log('condKurtosis is array:', Array.isArray(condK), ' length:', condK ? condK.length : null);
console.log('condKurtosis.promoted =', condK ? condK.promoted : null);
if (condK) for (const c of condK) {
  console.log(`  condition=${JSON.stringify(c.condition)}  n=${c.n}` +
    `  kurtosis=${c.kurtosis}  kurtDeviation=${c.kurtDeviation}` +
    `  printed p=${c.p}  rawP=${c.rawP}  pAdjFull=${c.pAdjFull}` +
    `  flag=${JSON.stringify(c.flag)}  verdict=${JSON.stringify(c.verdict)}` +
    `  platykurtic=${c.platykurtic}  isLeptokurtic=${c.isLeptokurtic}` +
    `  condPromoted=${c.condPromoted}`);
}
console.log('--- gate arms (MiniCard_Kurtosis.jsx:65) ---');
const armLen  = (condK?.length ?? 0) >= 2;
const armHigh = r.flag === 'HIGH';
const armSome = !!condK && condK.some(c => c.verdict !== 'clear');
console.log('  condK?.length >= 2                      =', armLen);
console.log('  flag === "HIGH"                         =', armHigh);
console.log('  condK.some(c => c.verdict !== "clear")  =', armSome);
console.log('  GATE =', armLen && (armHigh || armSome));
console.log('--- threshold check on the printed adjusted p ---');
if (condK) for (const c of condK) {
  const p = c.pAdjFull ?? parseFloat(c.p);
  console.log(`  ${c.condition}: p=${p}  < ALPHA.NOTE(${ALPHA.NOTE}) ? ${p < ALPHA.NOTE}` +
    `  flagFromP -> ${flagFromP(p)}`);
}

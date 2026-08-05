/* probe-large-clean-fixture.mjs
 *
 * Runs the full battery on test/fixtures/large-clean-2cond.csv and reports the
 * three code paths the 27-fixture corpus has never reached:
 *
 *   - Cross-Condition Consistency's B = 199 branch
 *   - the N >= 500 effect-size gates in Runs, LOESS and Regional Noise
 *   - any battery behaviour above 1,500 rows
 *
 * The fixture is deliberately NOT in test/batch-fixtures.mjs, so this probe
 * supplies the assay itself. Everything else mirrors validate-batch.mjs's
 * import pipeline exactly.
 *
 * Read-only on src/.
 *
 * Usage: node test/probes/probe-large-clean-fixture.mjs
 *        FILE=test/fixtures/other.csv ASSAY=general node test/probes/probe-large-clean-fixture.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const TARGET = process.env.FILE || 'test/fixtures/large-clean-2cond.csv';
const ASSAY = process.env.ASSAY || 'general';

/** The pipeline validate-batch.mjs uses, with the assay passed in. */
function prep(path, assay) {
  const csv = readFileSync(path, 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lf = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lf });
  const rowSemantics = rsSuggestion.value || 'ordered';
  return { headers, roles, matrix, rawMatrix, condCtx, vst, dataType, rowSemantics, lf, rsSuggestion };
}

async function run(p, assay) {
  const t0 = performance.now();
  const results = await runFullAnalysis(
    p.matrix, p.rawMatrix, p.condCtx, assay, null, p.vst, {}, p.dataType, p.rowSemantics
  );
  const ms = performance.now() - t0;
  return { results, ms, ...computeSeverity(results) };
}

const byName = (rs, n) => rs.find(r => r.name === n);
const num = (v, d = 4) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : String(v));

// ── The fixture ────────────────────────────────────────────────────────
console.log(`=== ${TARGET} (assay: ${ASSAY}) ===\n`);
const p = prep(TARGET, ASSAY);

console.log('-- import --');
console.log(`  headers            ${p.headers.join(', ')}`);
console.log(`  roles              ${p.roles.join(', ')}`);
console.log(`  matrix             ${p.matrix.length} rows x ${p.matrix[0].length} data cols`);
console.log(`  condition context  type=${p.condCtx.type} count=${p.condCtx.count} names=${(p.condCtx.names || []).join(', ')}`);
console.log(`  long-format        ${p.lf ? 'DETECTED' : 'no'}`);
console.log(`  rowSemantics       ${p.rowSemantics} (suggest: ${p.rsSuggestion.reason})`);
console.log(`  VST                ${p.vst.transform}  — ${p.vst.reason}`);

const sp = p.condCtx.subjectPairing;
console.log('\n-- subject pairing (P82) --');
console.log(`  ${JSON.stringify(sp)}`);
console.log(`  => Cross-Condition Consistency and Residual Spike Correlation are ` +
  (sp?.paired ? 'WITHHELD' : 'NOT withheld'));

const slices = p.condCtx.slices();
console.log('\n-- per-condition finite cells (the quantity CCC:166 maximises) --');
let maxN = 0;
for (const s of slices) {
  let n = 0;
  for (const row of s.matrix) for (const v of row) if (v != null && isFinite(v)) n++;
  if (n > maxN) maxN = n;
  console.log(`  ${String(s.name).padEnd(12)} ${s.matrix.length} rows -> ${n} cells`);
}
const predictedB = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;
console.log(`  maxN ${maxN}  =>  predicted B ${predictedB}`);

console.log('\n-- running the battery --');
const out = await run(p, ASSAY);
console.log(`  wall clock         ${out.ms.toFixed(0)} ms`);
console.log(`  severity           ${out.severity}   (HIGH ${out.high}, MOD ${out.mod}, dims ${out.nFlaggedDimensions ?? '-'})`);

// ── Cross-Condition Consistency ───────────────────────────────────────
const ccc = byName(out.results, 'Cross-Condition Consistency');
console.log('\n-- Cross-Condition Consistency --');
if (!ccc) console.log('  absent from results');
else if (ccc.flag === 'N/A') console.log(`  N/A — cause=${ccc.naCause} ${ccc.description || ''}`);
else {
  console.log(`  flag ${ccc.flag}  primaryP ${ccc.primaryP}  B ${ccc.B}`);
  console.log(`  conditionN ${JSON.stringify(ccc.conditionN)}  m1 ${ccc.bhMStage1} m2 ${ccc.bhMStage2} m3 ${ccc.bhMStage3}`);
  const floor = 2 / (ccc.B + 1);
  console.log(`  raw floor 2/(B+1) = ${floor.toFixed(6)}   ALPHA.NOTE 0.01 strict  =>  ` +
    `${floor < 0.01 ? 'MODERATE reachable' : 'CANNOT FLAG at any effect size'}`);
  const units = (ccc.details || []).map(u => `s${u.stage} ${u.property}=${num(u.adjP, 4)}`);
  console.log(`  units: ${units.join('  ')}`);
}

// ── The three N >= 500 effect-size gates ──────────────────────────────
console.log('\n-- the min-N effect-size gates (first corpus-unreachable path) --');
const runsR = byName(out.results, 'Runs Test');
const loessR = byName(out.results, 'LOESS Residual Analysis');
const rnR = byName(out.results, 'Regional Noise Homogeneity');

console.log(`  Runs Test              flag=${runsR?.flag}`);
console.log(`    routing              ${runsR?.groupsAssessed !== undefined ? `per-condition (groupsAssessed=${runsR.groupsAssessed})` : 'pooled'}`);
console.log(`    obsOverExp           ${num(runsR?.obsOverExp, 4)}   gate is nR>=500 && ratio>0.70 (runs.js:206)`);
console.log(`    nPerm                ${runsR?.nPerm ?? 'null'}   (null => the scan was skipped, which esGate does at :222)`);
console.log(`  LOESS Residual         flag=${loessR?.flag}`);
console.log(`    routing              ${loessR?.groupsAssessed !== undefined ? `per-condition (groupsAssessed=${loessR.groupsAssessed})` : 'pooled'}`);
console.log(`    nRows / bestVarRatio ${loessR?.nRows ?? '-'} / ${loessR?.bestVarRatio ?? '-'}   gate is nR>=500 && ratio<2.0 (loessResidual.js:219)`);
console.log(`    interpretation       ${loessR?.interpretation || '(none)'}`);
console.log(`  Regional Noise         flag=${rnR?.flag}`);
console.log(`    routing              ${rnR?.groupsAssessed !== undefined ? `per-condition (groupsAssessed=${rnR.groupsAssessed})` : 'pooled'}`);
console.log(`    nRows / bestVarRatio ${rnR?.nRows ?? '-'} / ${rnR?.bestVarRatio ?? '-'}   gate is nR>=500 && ratio<2.0 (regionalNoise.js:185)`);
console.log(`    interpretation       ${rnR?.interpretation || '(none)'}`);

// ── Kurtosis simulation count ─────────────────────────────────────────
const kurt = byName(out.results, 'Excess Kurtosis');
console.log('\n-- Excess Kurtosis --');
console.log(`  flag ${kurt?.flag}  nSimulations ${kurt?.nSimulations ?? '(absent)'}  (kurtosis.js:535; N_SIM is 1999)`);

// ── Everything at MODERATE or above ───────────────────────────────────
console.log('\n-- every flag at MODERATE or above --');
const flagged = out.results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE');
if (!flagged.length) console.log('  (none)');
for (const r of flagged) console.log(`  ${r.flag.padEnd(9)} ${r.name.padEnd(34)} p=${r.primaryP}`);

console.log('\n-- full coverage --');
const tally = {};
for (const r of out.results) tally[r.flag] = (tally[r.flag] || 0) + 1;
console.log(`  ${Object.entries(tally).map(([k, v]) => `${k}:${v}`).join('  ')}   (${out.results.length} results)`);
for (const r of out.results.filter(x => x.flag === 'N/A')) {
  console.log(`  N/A  ${r.name.padEnd(34)} cause=${r.naCause ?? '-'}`);
}

// ── Comparison fixtures ───────────────────────────────────────────────
const COMPARE = (process.env.COMPARE || '11-rnaseq-multicondition.csv,09-proteomics-clean.csv').split(',').filter(Boolean);
console.log('\n-- comparison: corpus fixtures through the same probe --');
for (const f of COMPARE) {
  const assay = EXPECTED[f]?.assay || 'general';
  const cp = prep(join('test/fixtures', f), assay);
  const co = await run(cp, assay);
  console.log(`  ${f.padEnd(34)} ${String(cp.matrix.length).padStart(5)} rows x ${cp.matrix[0].length} cols  ` +
    `${co.ms.toFixed(0).padStart(6)} ms  severity ${co.severity}`);
}
console.log(`  ${TARGET.split('/').pop().padEnd(34)} ${String(p.matrix.length).padStart(5)} rows x ${p.matrix[0].length} cols  ` +
  `${out.ms.toFixed(0).padStart(6)} ms  severity ${out.severity}`);

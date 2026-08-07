/* S358 part 4 — DS12b's Regional Noise Homogeneity cell, across eight seed offsets.
 *
 * P69 is verdict stability. Reading P51 beside S358's flag-matrix exceptions
 * leaves DS12b / Regional Noise as the technical remainder: nothing asserts the
 * cell, and P51's methodology route cannot house it, because the flag reads a
 * RAW one-sided scan p with no BH step between the p and the tier
 * (regionalNoise.js — `flag = esGate ? "LOW" : flagFromP(scanP)`).
 *
 * This probe answers one question the eight-offset batch sweep cannot: is the
 * OBSERVED STATISTIC near the threshold, or is the null's sampling noise moving
 * the p across a stationary statistic? Those two want different fixes. It also
 * measures where the flagged window sits relative to DS12b's planted region,
 * which decides whether the instability costs a real detection or nothing.
 *
 * Reads only. Changes nothing under src/.
 *
 * Run:  node test/probes/probe-s358-ds12b-regional-noise.mjs
 *
 * Recovering the exceedance count: regionalNoise.js computes
 *   scanP = (exceedCount + 1) / (N_PERM + 1)
 * and publishes both scanP and nPerm, so exceedCount is exactly recoverable as
 *   round(scanP * (nPerm + 1)) - 1
 * without a source hook. Derived rather than instrumented on purpose — a hook
 * that rewrites the module measures a copy of it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// The seed hook must be registered before the first import of engine.js,
// because that import graph pulls in src/stats/prng.js.
const seedInject = await import('../seed-inject.mjs');
seedInject.registerSeedHook();
const { setSeed } = seedInject;

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

const FILE = '12b-uniform-mixture-fabricated.csv';
const TEST = 'Regional Noise Homogeneity';
const OFFSETS = [0, 1, 2, 3, 4, 5, 6, 7];

// DS12b's construction, read from generate-test-datasets.py
// (gen_uniform_mixture_fabricated): 200 Genuine rows drawn with log-normal
// multiplicative noise at sigma 0.18, then 200 Fabricated rows on the SAME base
// means with uniform(0.60*base, 1.40*base) noise. Data rows are 1-indexed and
// the file carries one header row and no skipped rows, so a data row number is
// also the 1-indexed matrix row the test reports.
const PLANTED_FIRST_ROW = 201;
const PLANTED_LAST_ROW = 400;

// ── Build the fixture's engine inputs exactly as validate-batch.mjs does ──
function buildInputs() {
  const csv = readFileSync(join('test/fixtures', FILE), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  const raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = EXPECTED[FILE].assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';
  return { matrix, rawMatrix, condCtx, assay, vst, dataType, rowSemantics, headers, data, roles };
}

const inp = buildInputs();

console.log('='.repeat(78));
console.log(`S358 part 4 — ${FILE} / ${TEST}`);
console.log('='.repeat(78));
console.log(`assay ${inp.assay}   dataType ${inp.dataType}   rowSemantics ${inp.rowSemantics}`);
console.log(`matrix ${inp.matrix.length} rows x ${inp.matrix[0].length} cols`);
console.log(`condition structure: ${inp.condCtx.type}, ${inp.condCtx.count} condition(s)`);
console.log(`VST decision: transform=${inp.vst?.transform} reason=${inp.vst?.reason}`);
console.log(`planted region (from the generator): data rows ${PLANTED_FIRST_ROW}-${PLANTED_LAST_ROW} (Fabricated, uniform noise)`);
console.log('');

const rows = [];
for (const off of OFFSETS) {
  setSeed(off);
  const results = await runFullAnalysis(
    inp.matrix, inp.rawMatrix, inp.condCtx, inp.assay, null, inp.vst, {}, inp.dataType, inp.rowSemantics
  );
  const r = results.find(x => x.name === TEST);
  const { severity } = computeSeverity(results);
  const firing = results.filter(x => x.flag === 'HIGH' || x.flag === 'MODERATE').map(x => `${x.name}:${x.flag}`);
  // Counterfactual severity with this test removed. computeSeverity reads only
  // each result's flag and TEST_MECHANISM[name], so filtering the list is exact
  // rather than an approximation (CLAUDE.md, S351).
  const sevWithout = computeSeverity(results.filter(x => x.name !== TEST)).severity;
  const exceed = Math.round(r.scanP * (r.nPerm + 1)) - 1;
  rows.push({
    off, flag: r.flag, scanStat: r.scanStat, scanP: r.scanP, nPerm: r.nPerm, exceed,
    nRows: r.nRows, nWindows: r.nWindows,
    bestWindowRows: r.bestWindowRows, bestVarRatio: r.bestVarRatio, bestAnomCol: r.bestAnomCol,
    details: r.details, severity, firing, sevWithout,
    colMinAdjP: r.colPromoters ? Math.min(...r.colPromoters.map(c => c.adjP)) : null,
  });
}

// ── 1. The eight rows the dispatch asks for ──
console.log('── Per offset: observed statistic, null exceedances, raw p, flag ──');
console.log('');
console.log('off  observed stat  exceed/B      raw p                 flag      p===ALPHA.NOTE');
for (const x of rows) {
  const isExact = x.scanP === 0.01;
  console.log(
    `  ${x.off}  ${String(x.scanStat).padStart(13)}  ${String(x.exceed).padStart(4)}/${String(x.nPerm).padEnd(5)}  ` +
    `${x.scanP.toFixed(18).slice(0, 20)}  ${x.flag.padEnd(8)}  ${isExact ? 'YES' : 'no'}`
  );
}
console.log('');
console.log(`nRows (valid rows used)  ${[...new Set(rows.map(r => r.nRows))].join(', ')}`);
console.log(`nWindows                 ${[...new Set(rows.map(r => r.nWindows))].join(', ')}`);
console.log(`B rule: N_PERM = validRows.length <= 100 ? 4999 : 499  ->  B = ${rows[0].nPerm}`);
console.log(`grid step = 1/(B+1) = ${(1 / (rows[0].nPerm + 1)).toFixed(6)};  ALPHA.NOTE * (B+1) = ${0.01 * (rows[0].nPerm + 1)}`);
console.log('');

// ── 2. Is the statistic stationary, or is the p moving under it? ──
const stats = [...new Set(rows.map(r => r.scanStat))];
const ps = [...new Set(rows.map(r => r.scanP))];
const exceeds = [...new Set(rows.map(r => r.exceed))];
console.log('── Statistic stationarity ──');
console.log('');
console.log(`distinct observed statistics across 8 offsets : ${stats.length}  ${JSON.stringify(stats)}`);
console.log(`distinct exceedance counts                    : ${exceeds.length}  ${JSON.stringify(exceeds.sort((a, b) => a - b))}`);
console.log(`distinct raw p                                : ${ps.length}  ${JSON.stringify(ps.sort((a, b) => a - b))}`);
console.log('');
if (stats.length === 1) {
  console.log('=> The observed statistic is IDENTICAL at every offset. The seed drives only the');
  console.log('   permutation null, so what moves is the null\'s sampling noise, not the statistic.');
} else {
  console.log('=> The observed statistic MOVES across offsets. The seed reaches the statistic as');
  console.log('   well as the null — read the module again before attributing this to sampling.');
}
const pmean = rows.reduce((s, r) => s + r.scanP, 0) / rows.length;
const psd = Math.sqrt(rows.reduce((s, r) => s + (r.scanP - pmean) ** 2, 0) / (rows.length - 1));
console.log('');
console.log(`p across offsets: mean ${pmean.toFixed(6)}, sd ${psd.toFixed(6)} (sample sd, n=8)`);
console.log(`|mean - ALPHA.NOTE| / sd = ${(Math.abs(pmean - 0.01) / psd).toFixed(3)}`);
console.log('   NOTE: that sd is the spread of the eight ESTIMATED p-values — the Monte Carlo');
console.log('   sampling error of the p estimate. It is not a standard deviation of the statistic.');
console.log('');

// ── 3. Where does the firing sit relative to the planted region? ──
function classifyWindow(label) {
  const m = /^(\d+)[–-](\d+)$/.exec(String(label));
  if (!m) return { label, verdict: 'unparsed' };
  const a = Number(m[1]), b = Number(m[2]);
  const insideLo = Math.max(a, PLANTED_FIRST_ROW), insideHi = Math.min(b, PLANTED_LAST_ROW);
  const overlap = Math.max(0, insideHi - insideLo + 1);
  const span = b - a + 1;
  return {
    label, a, b, span, overlap, frac: overlap / span,
    verdict: overlap === span ? 'FULLY INSIDE planted' : overlap === 0 ? 'FULLY OUTSIDE planted' : 'straddles boundary',
  };
}
console.log('── Flagged window vs the planted region (Fabricated rows 201-400) ──');
console.log('');
for (const x of rows) {
  const c = classifyWindow(x.bestWindowRows);
  console.log(`  offset ${x.off}  best window rows ${String(x.bestWindowRows).padEnd(9)} col ${String(x.bestAnomCol).padEnd(3)} ratio ${String(x.bestVarRatio).padEnd(8)} -> ${c.verdict} (${c.overlap}/${c.span} rows inside)`);
}
console.log('');
console.log('  All windows the result reports, offset 0 (details[]):');
for (const d of rows[0].details) {
  const c = classifyWindow(d.rows);
  console.log(`    rows ${String(d.rows).padEnd(9)} col ${String(d.anomCol).padEnd(3)} ratio ${String(d.ratio).padEnd(8)} ${String(d.direction).padEnd(9)} -> ${c.verdict}`);
}
const allInside = rows.every(x => classifyWindow(x.bestWindowRows).verdict === 'FULLY INSIDE planted');
console.log('');
console.log(allInside
  ? '=> The flagged window sits INSIDE the planted region at every offset.'
  : '=> The flagged window is NOT fully inside the planted region at every offset — read the table.');
console.log('');

// ── 4. What carries DS12b's severity at each offset ──
console.log('── Severity carriers per offset ──');
console.log('');
console.log(`declared severity in batch-fixtures.mjs: ${EXPECTED[FILE].severity}`);
console.log('');
for (const x of rows) {
  console.log(`  offset ${x.off}  severity ${x.severity}  (without ${TEST}: ${x.sevWithout})  firing: ${x.firing.join(', ') || '(none)'}`);
}
console.log('');
// The co-carrier. DS12b's severity is a contested 1 and LOESS is the only other
// firing channel, so what its tier rests on belongs in the same readout.
setSeed(0);
{
  const results = await runFullAnalysis(
    inp.matrix, inp.rawMatrix, inp.condCtx, inp.assay, null, inp.vst, {}, inp.dataType, inp.rowSemantics
  );
  const lo = results.find(x => x.name === 'LOESS Residual Analysis');
  const floor = lo.nPerm ? 1 / (lo.nPerm + 1) : null;
  console.log(`  co-carrier LOESS Residual Analysis at offset 0: flag ${lo.flag} primaryP ${lo.primaryP}` +
    ` cusumP ${lo.cusumP ?? '(field absent)'} nPerm ${lo.nPerm ?? '(none)'}` +
    (floor ? `  permutation floor 1/(B+1) = ${floor}` : ''));
  if (floor != null && lo.cusumP != null) {
    console.log(`  cusumP sits ON the floor: ${lo.cusumP === floor ? 'YES — the tier reports the resample count, not the data' : 'no'}`);
  }
}
console.log('');

const everAlone = rows.some(x => x.firing.length === 1 && x.firing[0].startsWith(TEST));
console.log(`Regional Noise ever the sole MOD/HIGH firing: ${everAlone ? 'YES' : 'no'}`);
console.log(`severity unchanged when Regional Noise is removed, at every offset: ${rows.every(x => x.severity === x.sevWithout) ? 'YES' : 'no'}`);
console.log('');

// ── 5. The other two flag drivers ──
console.log('── The module\'s other two flag drivers ──');
console.log('');
console.log(`effect-size gate (nR >= 500 && bestVarRatio < 2.0): nR = ${inp.matrix.length}, bestVarRatio = ${rows[0].bestVarRatio}`);
console.log(`  -> gate ${inp.matrix.length >= 500 ? 'COULD engage' : 'cannot engage (nR < 500)'}`);
console.log(`per-column BH promotion (LOW -> MODERATE when any column adjP < ALPHA.FLAG = 0.001):`);
for (const x of rows) console.log(`  offset ${x.off}  min column adjP = ${x.colMinAdjP}`);
console.log('');

// ── 6. Is the quiet patch real, or manufactured by pooling the two halves? ──
// The firing is a "reduced"-direction window: the window's variance is BELOW
// the column's global variance. But the global variance is computed over BOTH
// halves, and the Fabricated half carries uniform(0.6, 1.4) noise where the
// Genuine half carries log-normal sigma 0.18 — a wider spread. So a Genuine-half
// window could read quiet purely because the fabrication inflated the pooled
// denominator. Splitting the matrix separates the two readings.
//
// The engine hands Regional Noise the VST-transformed matrix (this fixture takes
// a log), so the halves must be log-transformed too or the comparison is against
// a different quantity. Mirrors engine.js's vstMatrix construction.
const { testRegionalNoise } = await import('../../src/tests/regionalNoise.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');

const vstFull = inp.vst?.transform === 'log'
  ? inp.matrix.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null))
  : inp.matrix;

const halves = {
  'Genuine only (rows 1-200)': vstFull.slice(0, 200),
  'Fabricated only (rows 201-400)': vstFull.slice(200, 400),
  'Both halves pooled (what the engine runs)': vstFull,
};

console.log('── Pooling contrast: the same scan on each half alone ──');
console.log('');
setSeed(0);
for (const [label, m] of Object.entries(halves)) {
  const rng = createPRNGFactory(m)('Regional Noise Homogeneity');
  const r = testRegionalNoise(m, rng);
  const cols = m[0].length;
  // Per-column SD of the raw (untransformed-by-the-test) input, for context.
  const colSD = [];
  for (let c = 0; c < cols; c++) {
    const vals = m.map(row => row[c]).filter(v => v != null && isFinite(v));
    const mu = vals.reduce((s, v) => s + v, 0) / vals.length;
    colSD.push(Math.sqrt(vals.reduce((s, v) => s + (v - mu) ** 2, 0) / (vals.length - 1)));
  }
  console.log(`  ${label}`);
  if (r.flag === 'N/A') {
    console.log(`    N/A — ${r.description}`);
  } else {
    console.log(`    flag ${r.flag}  scanStat ${r.scanStat}  scanP ${r.scanP}  B ${r.nPerm}  nRows ${r.nRows}  nWindows ${r.nWindows}`);
    console.log(`    best window rows ${r.bestWindowRows} col ${r.bestAnomCol} ratio ${r.bestVarRatio} (${r.details[0]?.direction})`);
  }
  console.log(`    per-column SD of the input: ${colSD.map(v => v.toFixed(4)).join(', ')}`);
  console.log('');
}
console.log('  Read: if the Genuine half alone still finds a ~7.8x quiet window at rows 51-65,');
console.log('  the patch is a real feature of the honest data. If its ratio collapses, the');
console.log('  7.83x is an artefact of pooling a wider fabricated half into the denominator.');
console.log('');
console.log('='.repeat(78));

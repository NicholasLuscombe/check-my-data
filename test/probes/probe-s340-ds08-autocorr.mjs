/* S340 step 3 — does plain Autocorrelation fire on DS08?

   DS08's generator plants an AR(1) on the log-residuals at phi = 0.55, across
   every row and every plate. DS07, the clean counterpart, uses iid noise at the
   same site. Autocorrelation is the test built to find lag-1 serial magnitude,
   it is analytic, and it does not move across seeds. It is not in DS08's
   declared channel list.

   Dumps Autocorrelation in full for both fixtures, plus Windowed
   Autocorrelation alongside, plus every user-facing string Windowed
   Autocorrelation produces on DS08 so the localisation claim can be read.

     node test/probes/probe-s340-ds08-autocorr.mjs
     node --import ./test/probes/s340-nperm-hook.mjs test/probes/probe-s340-ds08-autocorr.mjs

   The second form raises Windowed Autocorrelation to 4999 permutations, the
   configuration in which it fires on DS08. Reads src/, writes nothing there. */
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
const { EFFECT_SIZE, ALPHA } = await import('../../src/constants/thresholds.js');
const { keyFinding } = await import('../../src/constants/keyFindingTemplates.js');
const { TEST_METHODS } = await import('../../src/constants/mechanisms.js');
const { composeFinding } = await import('../../src/analysis/findingComposers.js');

const FIXTURES = 'test/fixtures';

async function run(file, assay) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const raw = preprocessRaw(Papa.default.parse(csv, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!detectLongFormat(headers, data) }).value || 'ordered';
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
  return { results, matrix, vst, severity: computeSeverity(results).severity };
}

const p = v => {
  if (v == null) return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!isFinite(n)) return String(v);
  return n === 0 ? '0' : Math.abs(n) < 1e-4 ? n.toExponential(3) : String(Number(n.toPrecision(6)));
};

/* Lag-1 autocorrelation of a pair's log-difference series, over a row subset.
   Reads the delivered CSV, not the generator — the question is what survives in
   the file, since three planting stages overwrite cells after the AR(1) base
   loop lays the residuals down. */
function lagOneOnSubset(rows, c1, c2, keep) {
  const d = [];
  for (let i = 0; i < rows.length; i++) {
    if (!keep(i + 1)) continue;
    const a = rows[i][c1], b = rows[i][c2];
    if (!(a > 0 && b > 0)) continue;
    d.push(Math.log(a) - Math.log(b));
  }
  if (d.length < 10) return { n: d.length, r1: null };
  const m = d.reduce((s, x) => s + x, 0) / d.length;
  let den = 0, num = 0;
  for (let i = 0; i < d.length; i++) den += (d[i] - m) ** 2;
  for (let i = 1; i < d.length; i++) num += (d[i] - m) * (d[i - 1] - m);
  return { n: d.length, r1: den > 0 ? num / den : null };
}

function dumpAutocorr(label, r, nR) {
  console.log(`\n── Autocorrelation — ${label} ──`);
  if (!r) { console.log('  result absent'); return; }
  if (r.flag === 'N/A') { console.log(`  N/A — ${r.description}`); return; }
  console.log(`  flag                 ${r.flag}`);
  console.log(`  primaryP (minAdjP)   ${p(r.primaryP)}`);
  console.log(`  pooled mean r1       ${r.pooledMeanR1}`);
  console.log(`  pooled t / p         t=${r.pooledT}  p=${r.pooledP}`);
  console.log(`  pooled r1 SD / SE    ${p(r.pooledR1SD)} / ${p(r.pooledR1SE)}`);
  console.log(`  pooled r1 CI         [${(r.pooledR1CI || []).map(p).join(', ')}]`);
  console.log(`  effectSizeClass      ${r.effectSizeClass}   (thresholds: strong >= ${EFFECT_SIZE.AUTOCORR_STRONG}, moderate >= ${EFFECT_SIZE.AUTOCORR_MODERATE})`);
  const absR1 = Math.abs(parseFloat(r.pooledMeanR1));
  console.log(`  effect-size gate     esGate = (nR >= 500 && |mean r1| < ${EFFECT_SIZE.AUTOCORR_STRONG}) = (${nR} >= 500 && ${absR1.toFixed(4)} < ${EFFECT_SIZE.AUTOCORR_STRONG}) = ${nR >= 500 && absR1 < EFFECT_SIZE.AUTOCORR_STRONG}`);
  console.log(`  driving pair r1      ${p(r.minAdjPairR1)}`);
  console.log(`  pairs BH-sig (<0.01) ${r.nSignificant} of ${r.nPairs}`);
  console.log(`  higher-lag promoted  ${r.higherLagPromoted} (decisive: ${r.higherLagWasDecisive})`);
  console.log(`  per-pair (lag 1):`);
  console.log(`    ${'pair'.padEnd(7)} ${'r1'.padStart(9)} ${'z'.padStart(9)} ${'raw p'.padStart(11)} ${'BH adj p'.padStart(11)}  sig`);
  for (const d of r.details) {
    console.log(`    ${d.pair.padEnd(7)} ${d.lag1.padStart(9)} ${d.z.padStart(9)} ${p(d.rawP).padStart(11)} ${p(d.adjP).padStart(11)}  ${d.significant ? 'yes' : 'no'}`);
  }
  console.log(`  lag table (pooled):`);
  console.log(`    ${'lag'.padEnd(5)} ${'pooled r'.padStart(10)} ${'p'.padStart(10)} ${'BH adj p'.padStart(10)}  pairsSig  trigger`);
  for (const l of r.lagTable) {
    console.log(`    ${String(l.lag).padEnd(5)} ${l.pooledR.padStart(10)} ${l.p.padStart(10)} ${l.adjP.padStart(10)}  ${String(l.pairsSig ?? '—').padStart(8)}  ${l.isPromotionTrigger}`);
  }
  console.log(`  decay curve (lags 1-10): ${(r.decayCurve || []).map(v => v.toFixed(3)).join(' ')}`);
}

function dumpWindowed(label, r) {
  console.log(`\n── Windowed Autocorrelation — ${label} ──`);
  if (!r) { console.log('  result absent'); return; }
  if (r.flag === 'N/A') { console.log(`  N/A — ${r.description}`); return; }
  console.log(`  flag                 ${r.flag}`);
  console.log(`  primaryP (min adj-p) ${p(r.primaryP)}`);
  console.log(`  nPerm                ${r.nPerm}`);
  console.log(`  units                ${r.nWindowsTotal} (pair x window) over ${r.nPairs} pair(s); window ${r.windowSize}, stride ${r.stride}`);
  console.log(`  significant units    ${r.nSig05} at adj-p < 0.05, ${r.nSig01} at < 0.01`);
  console.log(`  top units by adj-p:`);
  console.log(`    ${'pair'.padEnd(7)} ${'rows'.padEnd(11)} ${'r'.padStart(9)} ${'raw p'.padStart(10)} ${'adj p'.padStart(10)}  sig`);
  for (const d of r.details.slice(0, 8)) {
    console.log(`    ${d.pair.padEnd(7)} ${d.rows.padEnd(11)} ${String(d.r).padStart(9)} ${p(d.rawP).padStart(10)} ${p(d.adjP).padStart(10)}  ${d.significant}`);
  }
}

function dumpWindowedProse(r, nRows, nCols) {
  console.log(`\n── Windowed Autocorrelation — every user-facing string on DS08 ──`);
  console.log(`\n  interpretation (drives the card footer clause):`);
  console.log(`    "${r.interpretation}"`);
  console.log(`\n  key-finding line (§2 / summary):`);
  console.log(`    "${keyFinding(r, x => x)}"`);
  const composed = composeFinding(r, { nRows, nCols, colHeaders: null, toFileRow: x => x });
  console.log(`\n  §4 finding composer:`);
  if (!composed) console.log('    (composer returned null)');
  else {
    console.log(`    location:  "${composed.location}"`);
    for (const l of composed.evidenceLines) console.log(`    evidence:  "${l}"`);
  }
  console.log(`\n  TEST_METHODS prose (card "How this test works", pasted into §4):`);
  console.log(`    "${TEST_METHODS['Windowed Autocorrelation'] || '(none)'}"`);
}

const ds08 = await run('08-elisa-fabricated.csv', 'elisa');
const ds07 = await run('07-elisa-clean.csv', 'elisa');
const get = (x, n) => x.results.find(r => r.name === n);

console.log('S340 step 3 — Autocorrelation on DS08 (phi = 0.55 AR(1) over 100% of rows and columns)');
console.log(`DS08 ${ds08.matrix.length} rows x ${ds08.matrix[0].length} cols, severity ${ds08.severity}, VST ${ds08.vst.transform} (${ds08.vst.reasonCode || ds08.vst.reason || ''})`);
console.log(`DS07 ${ds07.matrix.length} rows x ${ds07.matrix[0].length} cols, severity ${ds07.severity}, VST ${ds07.vst.transform} (${ds07.vst.reasonCode || ds07.vst.reason || ''})`);
console.log(`\nflag thresholds: HIGH p < ${ALPHA.FLAG}, MODERATE p < ${ALPHA.NOTE}`);

dumpAutocorr('DS08 fabricated (AR(1) phi=0.55 planted)', get(ds08, 'Autocorrelation'), ds08.matrix.length);
dumpAutocorr('DS07 clean (iid control)', get(ds07, 'Autocorrelation'), ds07.matrix.length);
dumpWindowed('DS08 fabricated', get(ds08, 'Windowed Autocorrelation'));
dumpWindowed('DS07 clean (control)', get(ds07, 'Windowed Autocorrelation'));
dumpWindowedProse(get(ds08, 'Windowed Autocorrelation'), ds08.matrix.length, ds08.matrix[0].length);

/* How much of the planted AR(1) survives into the delivered file.
   The base loop lays phi = 0.55 residuals across all 65 rows and all 3 plates,
   then three planting stages overwrite cells: the Benford push rewrites cells in
   rows 1-24, the constant-offset block replaces Plate2 with Plate1 x 1.047 on
   rows 35-48, and the selective-noise stage replaces Plate3 with the Plate1/2
   mean on rows 50-64. Rows 25-34, 49 and 65 carry no overwrite at all. */
const UNTOUCHED = new Set([25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 49, 65]);
const SEGMENTS = [
  ['all 65 rows', () => true],
  ['rows 1-24 (Benford push)', r => r >= 1 && r <= 24],
  ['rows 25-34,49,65 (no overwrite)', r => UNTOUCHED.has(r)],
  ['rows 35-48 (offset block)', r => r >= 35 && r <= 48],
  ['rows 50-64 (selective noise)', r => r >= 50 && r <= 64],
];
for (const [label, fx] of [['DS08 fabricated', ds08], ['DS07 clean (control)', ds07]]) {
  console.log(`\n── lag-1 r of the log-difference series, by row segment — ${label} ──`);
  console.log(`  planted AR(1) phi = 0.55; the difference of two independent AR(1) series with the same phi is itself AR(1) at that phi, so 0.55 is the value to expect where the residuals survive.`);
  console.log(`  ${'segment'.padEnd(34)} ${'pair 1-2'.padStart(16)} ${'pair 1-3'.padStart(16)} ${'pair 2-3'.padStart(16)}`);
  for (const [seg, keep] of SEGMENTS) {
    const cells = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => {
      const { n, r1 } = lagOneOnSubset(fx.matrix, a, b, keep);
      return `${r1 == null ? 'n/a' : r1.toFixed(3)} (n=${n})`;
    });
    console.log(`  ${seg.padEnd(34)} ${cells.map(c => c.padStart(16)).join(' ')}`);
  }
}

/* The exact rows Windowed Autocorrelation names on DS08, measured directly.
   Its best unit is pair 1–2 rows 26–40; rows 25–34 are the only stretch the
   later planting stages leave untouched. */
const NAMED = [[26, 40], [25, 34], [26, 34], [35, 40]];
console.log(`\n── lag-1 r on the rows Windowed Autocorrelation names — DS08 pair 1–2 ──`);
for (const [a, b] of NAMED) {
  const { n, r1 } = lagOneOnSubset(ds08.matrix, 0, 1, r => r >= a && r <= b);
  console.log(`  rows ${String(a).padStart(2)}–${String(b).padStart(2)}  n=${String(n).padStart(2)}  r1 = ${r1 == null ? 'n/a (n<10)' : r1.toFixed(4)}`);
}

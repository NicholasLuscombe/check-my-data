// Autocorrelation calibration probe.
//
// Asks whether the pooled lag-1 autocorrelation test is calibrated: how often
// does it fire on data whose row order carries no information, where does the
// observed statistic sit among those runs, and does the shuffled distribution
// centre where the test's null assumes it does (exactly zero)?
//
// WHAT IS PERMUTED, AND WHERE
// ---------------------------
// One permutation of row order per iteration, applied identically to every
// column, so each row keeps its internal structure (its replicate values stay
// together) and only the sequence is destroyed. That is the shape a genuinely
// arbitrary row order has — a gene list or a long-format pivot delivers intact
// rows in a meaningless order.
//
// The permutation is applied to the matrix that the real dispatch feeds the
// test: `hasVST ? vstMatrix : matrix`, i.e. AFTER extractAnalysisInputs and
// AFTER any variance-stabilising transform. The transform is elementwise, so
// permuting the transformed matrix equals transforming the permuted one; the
// probe checks that detectVST's CHOICE is itself invariant under permutation
// and reports the result rather than assuming it.
//
// WHAT IS NOT REIMPLEMENTED
// -------------------------
// The statistic is the real `testAutocorrelation`, and the per-condition
// combination is the real `aggregatePerGroup`. Only the six-line dispatch
// wiring is reproduced here, matching engine.js's
//   tagVST(await runPairVST(testAutocorrelation))
// expression exactly: `runPairVST` is called with no parentCondCtx, so the
// third argument to aggregatePerGroup is null on both the VST and raw arms.
// `tagVST` only stamps a label and is omitted.
//
// Only the shuffle's random stream is the probe's own — a seeded Mulberry32
// driving Fisher-Yates, so runs reproduce exactly.
//
// Usage:
//   node test/probes/probe-autocorr-calibration.mjs [nPerm] [--synthetic]
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const B = new URL('../../', import.meta.url).pathname;
const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import(B + 'src/analysis/engine.js');
const { aggregatePerGroup } = await import(B + 'src/analysis/aggregation.js');
const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
const { detectVST } = await import(B + 'src/stats/vst.js');
const { inferRoles } = await import(B + 'src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(B + 'src/import/parser.js');

const N_PERM = Number(process.argv[2]) || 2000;
const WANT_SYNTH = process.argv.includes('--synthetic');
const FIX = join(B, 'test/fixtures');

// ── probe-owned random stream (shuffling only, never the statistic) ────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function permutation(n, rnd) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}
// Standard normal via Box-Muller, for the matched synthetic null.
function makeNormal(rnd) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0, v = 0, s = 0;
    do { u = rnd() * 2 - 1; v = rnd() * 2 - 1; s = u * u + v * v; } while (s === 0 || s >= 1);
    const f = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * f; return u * f;
  };
}

// ── the real dispatch, reproduced ─────────────────────────────────────────
async function dispatchAutocorr(effMatrix, ctx) {
  const useAggregate = ctx.type === 'column-grouped' && ctx.count >= 2;
  return useAggregate
    ? await aggregatePerGroup(testAutocorrelation, ctx.slices(), null)
    : testAutocorrelation(effMatrix, null);
}

function readFixture(file) {
  const raw = preprocessRaw(
    Papa.default.parse(readFileSync(join(FIX, file), 'utf-8'), { skipEmptyLines: true }).data
  ).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  return extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
}

function applyVST(matrix, type) {
  if (type === 'log') return matrix.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  if (type === 'anscombe') return matrix.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  return null;
}

const num = (x) => (x == null ? NaN : (typeof x === 'number' ? x : parseFloat(x)));
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const quant = (sorted, q) => {
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};
const pct = (n, d) => `${(100 * n / d).toFixed(2)}%`;

// ── run one fixture ───────────────────────────────────────────────────────
async function runFixture(file, assay, label, nPerm, synthetic = false) {
  const { matrix, condCtx } = readFixture(file);
  const vst = detectVST(matrix, assay);
  const vstType = vst?.transform || 'raw';
  const vstMatrix = applyVST(matrix, vstType);
  const effMatrix = vstMatrix || matrix;
  const useAggregate = condCtx.type === 'column-grouped' && condCtx.count >= 2;

  // Is detectVST's choice itself invariant under row permutation?
  const rndCheck = mulberry32(12345);
  const pchk = permutation(matrix.length, rndCheck);
  const vstShuf = detectVST(pchk.map(i => matrix[i]), assay)?.transform || 'raw';

  // On the aggregate branch the test reads the CONTEXT's slices, not effMatrix,
  // so the context must carry the transformed data exactly as vstCondCtx does
  // in engine.js. Getting this wrong silently runs the observed case on raw
  // values while the permutations run on transformed ones.
  const effCtx = vstMatrix ? condCtx.withMatrix(vstMatrix) : condCtx;
  const observed = await dispatchAutocorr(effMatrix, effCtx);
  const decidingKey = useAggregate ? 'fisherP' : 'pooledP';
  const obsDeciding = num(observed[decidingKey]);
  const obsR = num(observed.pooledMeanR1);

  console.log('='.repeat(78));
  console.log(`${label}  (${file})`);
  console.log(`  matrix ${matrix.length} rows x ${matrix[0].length} cols | assay=${assay} | VST=${vstType}` +
              ` (permuted-order detectVST => ${vstShuf}${vstShuf === vstType ? ', invariant' : ', DIFFERS'})`);
  console.log(`  route: ${useAggregate ? `column-grouped, ${condCtx.count} conditions -> aggregatePerGroup, flag decided by fisherP`
                                       : 'no condition groups -> single pooled t-test, flag decided by pooledP'}`);
  console.log(`  observed: flag=${observed.flag}  ${decidingKey}=${obsDeciding}  pooledMeanR1=${obsR}` +
              `  ${observed.nSignificant}/${observed.nPairs} pairs adj-sig`);

  // Faithfulness check: the reproduced dispatch must return exactly what the
  // real engine returns for this test. If it does not, every number below is
  // measuring the probe rather than the battery.
  if (!synthetic) {
    const { runFullAnalysis } = await import(B + 'src/analysis/engine.js');
    const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
    const { rawMatrix } = readFixture(file);
    const real = (await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, { isPivoted: false },
      ASSAY_DATATYPE_MAP[assay] || 'continuous', 'ordered')).find(r => r.name === 'Autocorrelation');
    const agree = real.flag === observed.flag && num(real[decidingKey]) === obsDeciding
      && num(real.pooledMeanR1) === obsR;
    console.log(`  engine cross-check: real dispatch gives flag=${real.flag} ${decidingKey}=${num(real[decidingKey])} ` +
                `pooledMeanR1=${num(real.pooledMeanR1)} -> ${agree ? 'MATCHES' : '*** MISMATCH — numbers below are untrustworthy ***'}`);
  }

  const rnd = mulberry32(0xC0FFEE);
  const normal = synthetic ? makeNormal(mulberry32(0xBEEF)) : null;
  const nR = effMatrix.length, nC = effMatrix[0].length;

  const decid = [], rs = [];
  let modOrHigher = 0, high = 0;
  const t0 = Date.now();
  for (let k = 0; k < nPerm; k++) {
    let m;
    if (synthetic) {
      m = Array.from({ length: nR }, () => Array.from({ length: nC }, () => normal()));
    } else {
      const p = permutation(nR, rnd);
      m = p.map(i => effMatrix[i]);
    }
    const ctx = condCtx.withMatrix(m);
    const r = await dispatchAutocorr(m, ctx);
    decid.push(num(r[decidingKey]));
    rs.push(num(r.pooledMeanR1));
    if (r.flag === 'MODERATE' || r.flag === 'HIGH') modOrHigher++;
    if (r.flag === 'HIGH') high++;
  }
  const secs = (Date.now() - t0) / 1000;

  const fp01 = decid.filter(p => p < 0.01).length;
  const fp001 = decid.filter(p => p < 0.001).length;
  const rsSorted = rs.slice().sort((a, b) => a - b);
  const below = rs.filter(r => r < obsR).length;
  const asExtreme = rs.filter(r => Math.abs(r) >= Math.abs(obsR)).length;
  const mR = mean(rs), sR = sd(rs);
  const seMean = sR / Math.sqrt(rs.length);
  const zCentre = mR / seMean;

  console.log(`  --- ${nPerm} ${synthetic ? 'synthetic draws' : 'row-order permutations'} in ${secs.toFixed(1)}s ` +
              `(${(1000 * secs / nPerm).toFixed(1)} ms each) ---`);
  console.log(`  false positives on ${decidingKey}:`);
  console.log(`     p < 0.01 : ${fp01}/${nPerm} = ${pct(fp01, nPerm)}   (nominal 1%)`);
  console.log(`     p < 0.001: ${fp001}/${nPerm} = ${pct(fp001, nPerm)}   (nominal 0.1%)`);
  console.log(`  real dispatch severity on ${synthetic ? 'synthetic' : 'shuffled'} data:`);
  console.log(`     MODERATE or higher: ${modOrHigher}/${nPerm} = ${pct(modOrHigher, nPerm)}   (HIGH: ${high})`);
  console.log(`  observed statistic vs the ${synthetic ? 'synthetic' : 'shuffled'} distribution:`);
  console.log(`     observed pooledMeanR1 = ${obsR}`);
  console.log(`     percentile among runs = ${pct(below, nPerm)}`);
  console.log(`     two-sided empirical p (|r| at least as large) = ${(asExtreme / nPerm).toFixed(4)}  (${asExtreme}/${nPerm})`);
  console.log(`  where the ${synthetic ? 'synthetic' : 'shuffled'} distribution centres:`);
  console.log(`     mean = ${mR.toFixed(5)}   sd = ${sR.toFixed(5)}   se(mean) = ${seMean.toFixed(5)}`);
  console.log(`     z of mean against the assumed null of exactly 0 = ${zCentre.toFixed(2)}`);
  console.log(`     -1/n for n=${nR} rows = ${(-1 / nR).toFixed(5)}  <- the known small-sample bias of the lag-1 estimator`);
  // The t-test's own SE against the true SE of the statistic. The one-sample t
  // treats the per-pair r values as independent draws, but pairs drawn from the
  // same columns are not. sR IS the true spread of the pooled mean under the
  // null; observed.pooledR1SE is what the test assumed it was.
  const assumedSE = num(observed.pooledR1SE);
  if (Number.isFinite(assumedSE) && assumedSE > 0) {
    console.log(`  independence assumption:`);
    console.log(`     SE the pooled t-test uses = ${assumedSE.toFixed(5)}   true SE (spread of the mean over runs) = ${sR.toFixed(5)}`);
    console.log(`     understated by a factor of ${(sR / assumedSE).toFixed(2)}  (variance inflation ${((sR / assumedSE) ** 2).toFixed(1)}x)`);
  }
  console.log(`     2.5th pct = ${quant(rsSorted, 0.025).toFixed(4)}   median = ${quant(rsSorted, 0.5).toFixed(4)}   97.5th pct = ${quant(rsSorted, 0.975).toFixed(4)}`);
  return { file, fp01: fp01 / nPerm, fp001: fp001 / nPerm, modRate: modOrHigher / nPerm, mR, sR, obsR };
}

// ── main ──────────────────────────────────────────────────────────────────
console.log(`Autocorrelation calibration probe — ${N_PERM} iterations per file\n`);

const TARGETS = [
  ['20-bimodal-fab.csv', 'general', 'DS20  pooled route'],
  ['02-densitometry-fabricated.csv', 'densitometry', 'DS02  Fisher route'],
];

const out = [];
for (const [f, a, l] of TARGETS) out.push(await runFixture(f, a, l, N_PERM));

if (WANT_SYNTH) {
  console.log('\n\n### Matched synthetic null — independent normal draws at the same shape\n');
  for (const [f, a, l] of TARGETS) await runFixture(f, a, l + ' [synthetic]', N_PERM, true);
}

// Once the false-positive rate clears 5% on either file the question has
// stopped being about two files, so the same instrument runs over everything.
if (process.argv.includes('--sweep')) {
  const SWEEP_N = Number(process.env.SWEEP_N) || 500;
  console.log(`\n\n### All-fixture sweep — ${SWEEP_N} row-order permutations each\n`);
  console.log('  fixture                             rows  cols  route    FP@0.01   FP@0.001   MOD+     shuffled mean r    -1/n');
  // Each fixture's declared assay, so detectVST picks the transform production
  // would pick. Using one assay for all of them would silently run several
  // fixtures on a transform they never see.
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const sweep = [];
  for (const f of readdirSync(FIX).filter(f => f.endsWith('.csv')).sort()) {
    let ex; try { ex = readFixture(f); } catch { continue; }
    const { matrix, condCtx } = ex;
    if (!matrix?.length || matrix[0].length < 2 || matrix.length < 10) continue;
    const vstType = detectVST(matrix, EXPECTED[f]?.assay || 'general')?.transform || 'raw';
    const eff = applyVST(matrix, vstType) || matrix;
    const useAgg = condCtx.type === 'column-grouped' && condCtx.count >= 2;
    const rnd = mulberry32(0x5EED);
    const decid = []; let mod = 0; const rr = [];
    for (let k = 0; k < SWEEP_N; k++) {
      const p = permutation(eff.length, rnd);
      const m = p.map(i => eff[i]);
      const r = await dispatchAutocorr(m, condCtx.withMatrix(m));
      if (r.flag === 'N/A') { decid.push(NaN); continue; }
      decid.push(num(r[useAgg ? 'fisherP' : 'pooledP']));
      rr.push(num(r.pooledMeanR1));
      if (r.flag === 'MODERATE' || r.flag === 'HIGH') mod++;
    }
    const ok = decid.filter(Number.isFinite);
    if (!ok.length) continue;
    const a = ok.filter(p => p < 0.01).length / ok.length;
    const b = ok.filter(p => p < 0.001).length / ok.length;
    sweep.push({ f, a });
    console.log(`  ${f.padEnd(35)} ${String(matrix.length).padStart(5)} ${String(matrix[0].length).padStart(5)}  ` +
      `${(useAgg ? 'fisher' : 'pooled').padEnd(7)} ${(100*a).toFixed(1).padStart(6)}%  ${(100*b).toFixed(2).padStart(7)}%  ` +
      `${(100*mod/ok.length).toFixed(1).padStart(5)}%  ${mean(rr).toFixed(5).padStart(15)}   ${(-1/eff.length).toFixed(5)}`);
  }
  const over = sweep.filter(s => s.a > 0.05).length;
  console.log(`\n  ${sweep.length} fixtures measured. Above the nominal 1%: ${sweep.filter(s=>s.a>0.01).length}. Above 5%: ${over}.`);
  console.log(`  median FP@0.01 across fixtures: ${(100*quant(sweep.map(s=>s.a).sort((x,y)=>x-y), 0.5)).toFixed(1)}%`);
}

// Row counts across the whole fixture set — does the N>=500 effect-size floor
// ever engage on anything we test against?
console.log('\n\n### Fixture row counts (does the N>=500 effect-size floor ever run?)\n');
const rows = [];
for (const f of readdirSync(FIX).filter(f => f.endsWith('.csv')).sort()) {
  try { const { matrix } = readFixture(f); rows.push([f, matrix.length]); } catch { /* not a battery fixture */ }
}
rows.sort((a, b) => b[1] - a[1]);
for (const [f, n] of rows.slice(0, 5)) console.log(`  ${String(n).padStart(5)}  ${f}`);
console.log(`  ... ${rows.length} fixtures total, largest ${rows[0][1]} rows`);
console.log(`  fixtures with >= 500 rows: ${rows.filter(r => r[1] >= 500).length}`);

console.log('\n### Summary\n');
for (const r of out) {
  console.log(`  ${r.file.padEnd(32)} FP@0.01=${(100*r.fp01).toFixed(2)}%  FP@0.001=${(100*r.fp001).toFixed(2)}%  MOD+=${(100*r.modRate).toFixed(2)}%  shuffled mean r=${r.mR.toFixed(5)}`);
}

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
// ── Route 3: empirical null on the pooled statistic (--route3) ─────────────
// Keeps the parametric pooled statistic and replaces its null with the row
// shuffle. Empirical p = (exceed + 1) / (P + 1), so the smallest reachable
// value is 1/(P+1): MODERATE (p < ALPHA.NOTE = 0.01) needs P >= 100, and HIGH
// (p < ALPHA.FLAG = 0.001) needs P >= 1000 — at exactly 1000 HIGH requires
// zero exceedances, so it carries no resolution below the boundary.
//
// Both dispatches are reproduced from engine.js and both are asserted against
// runFullAnalysis before any permutation runs. Autocorrelation goes through
// runPairVST with NO parent context, so aggregatePerGroup's third argument is
// null; Runs goes through it WITH condCtx as parent, so the third argument is
// the context, and the test also takes the engine's rng from createPRNG on the
// unpermuted matrix.
//
// Env: P=<count> ONLY=<comma-separated test names> FILES=<comma-separated>
if (process.argv.includes('--route3')) {
  const { testRuns } = await import(B + 'src/tests/runs.js');
  const { createPRNG } = await import(B + 'src/stats/prng.js');
  const { flagFromP } = await import(B + 'src/constants/thresholds.js');
  const { runFullAnalysis } = await import(B + 'src/analysis/engine.js');
  const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const P = Number(process.env.P) || 1000;
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const pick = process.env.FILES ? process.env.FILES.split(',') : null;
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f] && (!pick || pick.includes(f))).sort();

  console.log(`### Route 3 — empirical null on the pooled statistic, P = ${P}`);
  console.log(`    floor 1/(P+1) = ${(1/(P+1)).toExponential(2)} -> HIGH ${1/(P+1) < 0.001 ? 'reachable' : 'UNREACHABLE'} at this count\n`);
  console.log('  ' + 'fixture'.padEnd(36) + 'test'.padEnd(18) + 'R1'.padEnd(10) + 'pooled p'.padEnd(12) + 'emp p'.padEnd(10) + 'R3'.padEnd(10) + 'cost');
  console.log('  ' + '-'.repeat(112));

  for (const file of files) {
    const base = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
    const { matrix, rawMatrix, condCtx } = base;
    const vst = detectVST(matrix, assay);
    const vstMatrix = applyVST(matrix, vst?.transform || 'raw');
    const effMatrix = vstMatrix || matrix;
    const effCtx = vstMatrix ? condCtx.withMatrix(vstMatrix) : condCtx;
    const useAgg = condCtx.type === 'column-grouped' && condCtx.count >= 2;
    const rng = createPRNG(matrix);
    const real = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst,
      { isPivoted: false }, dataType, 'ordered');

    const DEFS = [
      { name: 'Autocorrelation',
        run: (m, ctx) => useAgg ? aggregatePerGroup(testAutocorrelation, ctx.slices(), null)
                                : testAutocorrelation(m, null) },
      { name: 'Runs Test',
        run: (m, ctx) => useAgg ? aggregatePerGroup((mm, cc) => testRuns(mm, cc, rng), ctx.slices(), ctx)
                                : testRuns(m, ctx, rng) },
    ];

    for (const d of DEFS) {
      if (only && !only.includes(d.name)) continue;
      const r1 = real.find(x => x.name === d.name);
      if (!r1 || r1.flag === 'N/A') { console.log('  ' + file.padEnd(36) + d.name.padEnd(18) + 'N/A'); continue; }
      const obs = await d.run(effMatrix, effCtx);
      const obsStat = num(obs.pooledP);
      if (obs.flag !== r1.flag || num(r1.pooledP) !== obsStat) {
        console.log('  ' + file.padEnd(36) + d.name.padEnd(18) +
          `*** dispatch MISMATCH: probe ${obs.flag}/${obsStat} vs engine ${r1.flag}/${num(r1.pooledP)} — skipped ***`);
        continue;
      }
      const rnd = mulberry32(0xC0FFEE);
      let exceed = 0; const t0 = Date.now();
      for (let k = 0; k < P; k++) {
        const perm = permutation(effMatrix.length, rnd);
        const m = perm.map(i => effMatrix[i]);
        const s = num((await d.run(m, condCtx.withMatrix(m))).pooledP);
        if (Number.isFinite(s) && s <= obsStat) exceed++;   // smaller pooled p = stronger
      }
      const secs = (Date.now() - t0) / 1000;
      const empP = (exceed + 1) / (P + 1);
      console.log('  ' + file.padEnd(36) + d.name.padEnd(18) + r1.flag.padEnd(10) +
        obsStat.toPrecision(3).padEnd(12) + empP.toFixed(4).padEnd(10) +
        flagFromP(empP).padEnd(10) + `${secs.toFixed(1)}s`);
    }
  }
  process.exit(0);
}

// ── Route 2 calibration (--cal2) ───────────────────────────────────────────
// Route 2's own false-positive rate under the row shuffle. Route 2 fires
// MODERATE-or-higher exactly when the minimum per-unit BH-adjusted p clears
// ALPHA.NOTE, which `nSignificant` reports on the complete per-unit set.
//
// Route 3 is not measured here. An exact permutation test is calibrated by
// construction against the null it permutes: if rows are exchangeable, the
// empirical p is uniform, so its false-positive rate is nominal by definition
// rather than by measurement. Measuring it would need a nested permutation at
// P-squared cost and would only reproduce that identity.
if (process.argv.includes('--cal2')) {
  const { testRuns } = await import(B + 'src/tests/runs.js');
  const { createPRNG } = await import(B + 'src/stats/prng.js');
  const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const P = Number(process.env.P) || 500;
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const files = (process.env.FILES || '02-densitometry-fabricated.csv,17-densitometry-carlisle-clean.csv,20-bimodal-fab.csv').split(',');
  console.log(`### Route 2 calibration — ${P} row-order permutations, MODERATE+ rate against nominal 1%\n`);
  console.log('  ' + 'fixture'.padEnd(36) + 'test'.padEnd(18) + 'R2 MOD+'.padEnd(10) + 'R1 MOD+'.padEnd(10) + 'cost');
  console.log('  ' + '-'.repeat(90));
  for (const file of files) {
    const { matrix, condCtx } = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const vst = detectVST(matrix, assay);
    const effMatrix = applyVST(matrix, vst?.transform || 'raw') || matrix;
    const useAgg = condCtx.type === 'column-grouped' && condCtx.count >= 2;
    const rng = createPRNG(matrix);
    const DEFS = [
      { name: 'Autocorrelation',
        run: (m, ctx) => useAgg ? aggregatePerGroup(testAutocorrelation, ctx.slices(), null)
                                : testAutocorrelation(m, null) },
      { name: 'Runs Test',
        run: (m, ctx) => useAgg ? aggregatePerGroup((mm, cc) => testRuns(mm, cc, rng), ctx.slices(), ctx)
                                : testRuns(m, ctx, rng) },
    ];
    for (const d of DEFS) {
      if (only && !only.includes(d.name)) continue;
      const rnd = mulberry32(0xC0FFEE);
      let r2 = 0, r1 = 0, ran = 0; const t0 = Date.now();
      for (let k = 0; k < P; k++) {
        const perm = permutation(effMatrix.length, rnd);
        const m = perm.map(i => effMatrix[i]);
        const res = await d.run(m, condCtx.withMatrix(m));
        if (res.flag === 'N/A') continue;
        ran++;
        // Route 2 fires when any per-unit BH-adjusted p clears ALPHA.NOTE.
        // On the aggregated path nSignificant is the worst group's count.
        if ((res.nSignificant || 0) > 0) r2++;
        if (res.flag === 'MODERATE' || res.flag === 'HIGH') r1++;
      }
      const secs = (Date.now() - t0) / 1000;
      console.log('  ' + file.padEnd(36) + d.name.padEnd(18) +
        `${(100*r2/ran).toFixed(1)}%`.padEnd(10) + `${(100*r1/ran).toFixed(1)}%`.padEnd(10) + `${secs.toFixed(0)}s`);
    }
  }
  process.exit(0);
}

// ── Per-pair calibration (--perpair) ───────────────────────────────────────
// Route 2 reads per-unit p, so if the per-PAIR test is itself off-nominal
// Route 2 inherits a floor on every file, not only narrow ones. Measures the
// per-pair two-sided p directly under the row shuffle.
//
// This calls testAutocorrelation on the whole matrix rather than through the
// per-condition dispatch, because the quantity under test is the pair statistic
// itself, not how pairs are grouped. Details are complete at 15 pairs or fewer;
// wider matrices are marked and their pairs are a truncated sample.
//
// A -1/n estimator bias predicts a rate barely above nominal: the pooled z
// carries a mean shift of -1/sqrt(n), giving about 1.0-1.1% at these row
// counts. The predicted column below is that arithmetic, printed alongside.
if (process.argv.includes('--perpair')) {
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const P = Number(process.env.P) || 500;
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f]).sort();
  // Standard normal CDF via erf approximation (Abramowitz & Stegun 7.1.26).
  const Phi = z => { const t = 1/(1+0.2316419*Math.abs(z));
    const d = 0.3989423*Math.exp(-z*z/2);
    const p = d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
    return z > 0 ? 1-p : p; };
  console.log(`### Per-pair two-sided p under the row shuffle, P = ${P}\n`);
  const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
  console.log('  ' + 'fixture'.padEnd(36) + 'dataType'.padEnd(12) + 'rows'.padEnd(7) + 'pairs'.padEnd(8) +
              'p<0.01'.padEnd(9) + 'predicted'.padEnd(11) + 'p<0.001'.padEnd(10) + 'complete?');
  console.log('  ' + '-'.repeat(100));
  const rows = [];
  for (const file of files) {
    const { matrix } = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const eff = applyVST(matrix, detectVST(matrix, assay)?.transform || 'raw') || matrix;
    const n = eff.length, nc = eff[0]?.length || 0;
    if (nc < 2 || n < 10) continue;
    const nPairs = nc*(nc-1)/2;
    const rnd = mulberry32(0xC0FFEE);
    let tot = 0, lt01 = 0, lt001 = 0;
    for (let k = 0; k < P; k++) {
      const perm = permutation(n, rnd);
      const r = testAutocorrelation(perm.map(i => eff[i]), null);
      for (const d of (r.details || [])) {
        const pv = Number(d.rawP);
        if (!Number.isFinite(pv)) continue;
        tot++; if (pv < 0.01) lt01++; if (pv < 0.001) lt001++;
      }
    }
    if (!tot) continue;
    const mu = 1/Math.sqrt(n);           // magnitude of the -1/n-induced z shift
    const pred = Phi(-2.5758 + mu) + (1 - Phi(2.5758 + mu));
    rows.push({ file, n, nPairs, r01: lt01/tot, r001: lt001/tot, pred });
    console.log('  ' + file.padEnd(36) + (ASSAY_DATATYPE_MAP[assay]||'continuous').padEnd(12) + String(n).padEnd(7) + String(nPairs).padEnd(8) +
      `${(100*lt01/tot).toFixed(2)}%`.padEnd(9) + `${(100*pred).toFixed(2)}%`.padEnd(11) +
      `${(100*lt001/tot).toFixed(3)}%`.padEnd(10) + (nPairs <= 15 ? 'yes' : `no (15 of ${nPairs})`));
  }
  const w = rows.reduce((s,r)=>s+r.r01,0)/rows.length;
  console.log(`\n  mean measured rate at p<0.01: ${(100*w).toFixed(2)}%  (nominal 1%)`);
  console.log(`  mean predicted from -1/n bias : ${(100*rows.reduce((s,r)=>s+r.pred,0)/rows.length).toFixed(2)}%`);
  const byN = rows.slice().sort((a,b)=>a.n-b.n);
  console.log(`  smallest n (${byN[0].n} rows): ${(100*byN[0].r01).toFixed(2)}%   largest n (${byN[byN.length-1].n} rows): ${(100*byN[byN.length-1].r01).toFixed(2)}%`);
  process.exit(0);
}

// ── Variance inflation across fixtures (--inflation) ───────────────────────
// Route 4 keeps the pooled statistic and corrects its standard error. If the
// inflation is predictable from column and pair count, Route 4 needs no
// permutations at all. This measures it directly: the true spread of the pooled
// mean over shuffles, against the SE the one-sample t assumes.
//
// A design effect for the mean of k units with average pairwise correlation
// rho-bar is 1 + (k-1)*rho-bar, so the implied rho-bar is printed alongside. If
// one rho-bar fits every fixture, a closed form exists.
if (process.argv.includes('--inflation')) {
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const P = Number(process.env.P) || 200;
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f]).sort();
  console.log(`### Variance inflation of the pooled lag-1 mean, P = ${P} shuffles\n`);
  console.log('  ' + 'fixture'.padEnd(36) + 'rows'.padEnd(7) + 'cols'.padEnd(6) + 'pairs k'.padEnd(9) +
              'assumed SE'.padEnd(12) + 'true SE'.padEnd(11) + 'var infl'.padEnd(10) + 'implied rho-bar');
  console.log('  ' + '-'.repeat(112));
  const out = [];
  for (const file of files) {
    const { matrix } = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const eff = applyVST(matrix, detectVST(matrix, assay)?.transform || 'raw') || matrix;
    const n = eff.length, nc = eff[0]?.length || 0;
    if (nc < 3 || n < 10) continue;             // need >=2 pairs for a pooled t
    const k = nc*(nc-1)/2;
    const rnd = mulberry32(0xC0FFEE);
    const means = [], ses = [];
    for (let i = 0; i < P; i++) {
      const perm = permutation(n, rnd);
      const r = testAutocorrelation(perm.map(j => eff[j]), null);
      const m = num(r.pooledMeanR1), se = num(r.pooledR1SE);
      if (Number.isFinite(m)) means.push(m);
      if (Number.isFinite(se) && se > 0) ses.push(se);
    }
    if (means.length < 10 || !ses.length) continue;
    const trueSE = sd(means), assumedSE = mean(ses);
    const infl = (trueSE/assumedSE)**2;
    const rho = k > 1 ? (infl - 1)/(k - 1) : NaN;
    out.push({ file, n, nc, k, infl, rho });
    console.log('  ' + file.padEnd(36) + String(n).padEnd(7) + String(nc).padEnd(6) + String(k).padEnd(9) +
      assumedSE.toFixed(5).padEnd(12) + trueSE.toFixed(5).padEnd(11) +
      `${infl.toFixed(2)}x`.padEnd(10) + (Number.isFinite(rho) ? rho.toFixed(4) : '-'));
  }
  const rhos = out.map(o => o.rho).filter(Number.isFinite);
  const lo = Math.min(...rhos), hi = Math.max(...rhos);
  console.log(`\n  implied rho-bar spans ${lo.toFixed(4)} to ${hi.toFixed(4)} (ratio ${(hi/lo).toFixed(1)}x)`);
  console.log(`  a single closed form in (cols, pairs) requires one rho-bar to fit all of them.`);
  // Does inflation track k alone?
  const byK = {};
  for (const o of out) (byK[o.k] ||= []).push(o.infl);
  console.log('\n  inflation grouped by pair count k:');
  for (const kk of Object.keys(byK).sort((a,b)=>a-b)) {
    const v = byK[kk];
    console.log(`    k=${String(kk).padStart(3)}: ${v.map(x=>x.toFixed(2)+'x').join(', ')}`);
  }
  process.exit(0);
}

// ── Route 4: pooled statistic, empirically corrected SE (--route4) ─────────
// Keeps the pooled statistic and rescales its standard error by an inflation
// factor estimated from the row shuffle, instead of replacing the null with a
// tail quantile. A scale needs ~100 shuffles where a p<0.001 quantile needs
// ~10,000, which is the whole affordability argument.
//
// The inflation is a property of the dataset under the null, and shuffling IS
// the null, so it is estimated once from the observed data and then applied.
// That is what an implementation would do; it avoids nesting shuffles.
//
// SE only. The pooled mean also carries the -1/n estimator bias, which this
// does NOT correct — measured separately by --perpair and left alone here.
if (process.argv.includes('--route4')) {
  const { flagFromP } = await import(B + 'src/constants/thresholds.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const PIN = Number(process.env.PIN) || 100;    // shuffles for the scale estimate
  const PCAL = Number(process.env.PCAL) || 1000; // shuffles for the fire rate
  const pick = process.env.FILES ? process.env.FILES.split(',') : null;
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f] && (!pick || pick.includes(f))).sort();
  // Same t-to-p convention oneSampleT uses: normal above df 30, Student-t at or
  // below it. Substituting a normal everywhere over-fires on narrow matrices,
  // where the pooled t has only k-1 = 2 degrees of freedom.
  const { pooledTtoP, zToP } = await import(B + 'src/stats/primitives.js');
  const twoSided = (t, df) => (df > 30 ? zToP(t) : pooledTtoP(t, df));

  console.log(`### Route 4 — pooled statistic, SE rescaled by an empirical inflation factor`);
  console.log(`    scale from ${PIN} shuffles; fire rate from ${PCAL} shuffles\n`);
  console.log('  ' + 'fixture'.padEnd(36) + 'GT'.padEnd(4) + 'R1'.padEnd(10) + 'infl'.padEnd(8) +
              'R4 p'.padEnd(11) + 'R4'.padEnd(10) + 'R4 fire'.padEnd(9) + 'R1 fire'.padEnd(9) + 'cost');
  console.log('  ' + '-'.repeat(112));
  for (const file of files) {
    const { matrix } = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const eff = applyVST(matrix, detectVST(matrix, assay)?.transform || 'raw') || matrix;
    const n = eff.length, nc = eff[0]?.length || 0;
    if (nc < 3 || n < 10) continue;
    const obs = testAutocorrelation(eff, null);
    if (obs.flag === 'N/A') continue;

    const t0 = Date.now();
    const rnd = mulberry32(0xC0FFEE);
    const means = [], ses = [];
    for (let i = 0; i < PIN; i++) {
      const perm = permutation(n, rnd);
      const r = testAutocorrelation(perm.map(j => eff[j]), null);
      const m = num(r.pooledMeanR1), se = num(r.pooledR1SE);
      if (Number.isFinite(m)) means.push(m);
      if (Number.isFinite(se) && se > 0) ses.push(se);
    }
    const scaleCost = (Date.now() - t0) / 1000;
    if (means.length < 10 || !ses.length) continue;
    const infl = sd(means) / mean(ses);          // SE multiplier, not variance
    const dfPooled = obs.nPairs - 1;
    const corrected = (m, se) => twoSided(m / (se * infl), dfPooled);

    const r4p = corrected(num(obs.pooledMeanR1), num(obs.pooledR1SE));
    // Fire rate: apply the same correction to fresh shuffles.
    const rnd2 = mulberry32(0xBEEF);
    let fire4 = 0, fire1 = 0, ran = 0;
    for (let i = 0; i < PCAL; i++) {
      const perm = permutation(n, rnd2);
      const r = testAutocorrelation(perm.map(j => eff[j]), null);
      if (r.flag === 'N/A') continue;
      ran++;
      const m = num(r.pooledMeanR1), se = num(r.pooledR1SE);
      if (Number.isFinite(m) && Number.isFinite(se) && corrected(m, se) < 0.01) fire4++;
      if (num(r.pooledP) < 0.01) fire1++;
    }
    console.log('  ' + file.padEnd(36) + String(EXPECTED[file]?.severity ?? '-').padEnd(4) +
      obs.flag.padEnd(10) + `${(infl*infl).toFixed(1)}x`.padEnd(8) +
      r4p.toPrecision(3).padEnd(11) + flagFromP(r4p).padEnd(10) +
      `${(100*fire4/ran).toFixed(1)}%`.padEnd(9) + `${(100*fire1/ran).toFixed(1)}%`.padEnd(9) +
      `${scaleCost.toFixed(2)}s`);
  }
  process.exit(0);
}

// ── DS11 under an exact per-pair null (--ds11) ─────────────────────────────
// The per-pair z-test assumes the lag-1 correlation of the replicate
// differences is normal. On count data with heavy tying that assumption fails,
// and DS11's per-pair test measured at 22x nominal at p<0.001. This replaces it
// with the exact alternative: permute the difference sequence, recompute lag-1
// r with the real acfAtLag, take the empirical p. Permuting the sequence
// preserves its marginal distribution exactly, ties included, so it assumes
// nothing about normality or discreteness.
//
// Also reports mean |r| against the effect-size floor, because a detection that
// clears 0.25 by a wide margin does not depend on the p-value at all.
if (process.argv.includes('--ds11')) {
  const { acfAtLag, bhFDR } = await import(B + 'src/stats/primitives.js');
  const { flagFromP, EFFECT_SIZE, ALPHA } = await import(B + 'src/constants/thresholds.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const file = process.env.FILE || '11-rnaseq-multicondition.csv';
  const P = Number(process.env.P) || 2000;
  const { matrix } = readFixture(file);
  const assay = EXPECTED[file]?.assay || 'general';
  const eff = applyVST(matrix, detectVST(matrix, assay)?.transform || 'raw') || matrix;
  const nC = eff[0].length;
  console.log(`### ${file} — per-pair lag-1 under an exact permutation null, P = ${P}`);
  console.log(`    ${eff.length} rows x ${nC} cols, assay ${assay}, effect-size floor ${EFFECT_SIZE.AUTOCORR_STRONG}\n`);
  console.log('  ' + 'pair'.padEnd(8) + 'n'.padEnd(7) + 'r1'.padEnd(11) + 'ties %'.padEnd(9) +
              'z-test p'.padEnd(12) + 'perm p'.padEnd(11) + 'BH adj (perm)');
  console.log('  ' + '-'.repeat(88));
  const rows = [];
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1+1; c2 < nC; c2++) {
    const diffs = [];
    for (let r = 0; r < eff.length; r++) {
      if (eff[r][c1] != null && eff[r][c2] != null) diffs.push(eff[r][c1] - eff[r][c2]);
    }
    if (diffs.length < 10) continue;
    const m = mean(diffs);
    const den = diffs.reduce((s,d)=>s+(d-m)**2, 0);
    const r1 = acfAtLag(diffs, m, den, 1);
    const se = 1/Math.sqrt(diffs.length);
    const zp = 2*(1 - 0.5*(1+erf(Math.abs(r1/se)/Math.SQRT2)));
    const ties = 100*(1 - new Set(diffs.map(d=>d.toPrecision(12))).size/diffs.length);
    const rnd = mulberry32(0xC0FFEE + c1*97 + c2);
    let exceed = 0;
    const buf = diffs.slice();
    for (let k = 0; k < P; k++) {
      for (let i = buf.length-1; i > 0; i--) { const j = Math.floor(rnd()*(i+1)); const t=buf[i]; buf[i]=buf[j]; buf[j]=t; }
      const mm = mean(buf);
      const dd = buf.reduce((s,d)=>s+(d-mm)**2, 0);
      if (Math.abs(acfAtLag(buf, mm, dd, 1)) >= Math.abs(r1)) exceed++;
    }
    const permP = (exceed+1)/(P+1);
    rows.push({ pair:`${c1+1}-${c2+1}`, n:diffs.length, r1, zp, permP, ties });
  }
  const adj = bhFDR(rows.map(r=>r.permP));
  rows.forEach((r,i)=>{ r.adj = adj[i]; });
  for (const r of rows) {
    console.log('  ' + r.pair.padEnd(8) + String(r.n).padEnd(7) + r.r1.toFixed(4).padEnd(11) +
      r.ties.toFixed(1).padEnd(9) + r.zp.toExponential(2).padEnd(12) +
      r.permP.toFixed(4).padEnd(11) + r.adj.toFixed(4));
  }
  const nSig = rows.filter(r=>r.adj < ALPHA.NOTE).length;
  const minAdj = Math.min(...rows.map(r=>r.adj));
  const meanAbsR = mean(rows.map(r=>Math.abs(r.r1)));
  const pooledMeanR = mean(rows.map(r=>r.r1));
  console.log(`\n  pairs significant at BH-adjusted p < ${ALPHA.NOTE}: ${nSig} of ${rows.length}`);
  console.log(`  Route 2 flag under the exact null: ${nSig ? flagFromP(minAdj) : 'LOW'}  (min adj p ${minAdj.toExponential(2)})`);
  console.log(`  mean |r1| = ${meanAbsR.toFixed(4)}   pooled mean r1 = ${pooledMeanR.toFixed(4)}`);
  console.log(`  effect-size floor = ${EFFECT_SIZE.AUTOCORR_STRONG}  ->  ${meanAbsR >= EFFECT_SIZE.AUTOCORR_STRONG ? 'CLEARS' : 'does NOT clear'}`);
  console.log(`  recorded generator value rho ~ 0.55  ->  measured mean |r1| is ${(meanAbsR/0.55).toFixed(3)}x that`);
  process.exit(0);
}
function erf(x){const s=x<0?-1:1;x=Math.abs(x);const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,pp=0.3275911;const t=1/(1+pp*x);const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);return s*y;}

// ── DS22: is the Runs signal inside the planted block (--ds22) ─────────────
// The planted mechanism is a covariance block at rows 80-109 within each
// condition, on Rep4-7. If the Runs flag is detecting that block, its signal
// should sit inside the window and not outside it.
//
// Calls the real testRuns on row subsets rather than recomputing runs, so the
// statistic is the engine's. The window is 30 rows, where the Wald-Wolfowitz
// normal approximation is marginal, so an exact permutation null on the same
// sign sequence is reported beside the analytic z.
if (process.argv.includes('--ds22')) {
  const { testRuns } = await import(B + 'src/tests/runs.js');
  const { createPRNG } = await import(B + 'src/stats/prng.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const file = '22-covariance-block.csv';
  const P = Number(process.env.P) || 5000;
  const LO = Number(process.env.LO) || 80, HI = Number(process.env.HI) || 110; // [LO, HI)
  const { matrix, condCtx } = readFixture(file);
  const rng = createPRNG(matrix);
  const groups = condCtx.rowGroups();
  console.log(`### ${file} — Runs signal inside vs outside the planted block`);
  console.log(`    window = rows [${LO}, ${HI}) within each condition; planted on Rep4-7\n`);

  const runsPerm = (signs) => {
    const nz = signs.filter(s => s !== 0);
    const count = a => { let r = a.length ? 1 : 0; for (let i=1;i<a.length;i++) if (a[i]!==a[i-1]) r++; return r; };
    const obs = count(nz);
    const buf = nz.slice(); const rnd = mulberry32(0xC0FFEE); let le = 0;
    for (let k=0;k<P;k++){ for(let i=buf.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=buf[i];buf[i]=buf[j];buf[j]=t;} if (count(buf) <= obs) le++; }
    return { obs, permP: (le+1)/(P+1), n: nz.length };
  };

  for (const g of groups) {
    const inRows = g.matrix.slice(LO, HI);
    const outRows = g.matrix.filter((_, i) => i < LO || i >= HI);
    console.log(`  ${g.name}: ${g.matrix.length} rows -> window ${inRows.length}, outside ${outRows.length}`);
    for (const [label, sub] of [['INSIDE ', inRows], ['OUTSIDE', outRows]]) {
      const r = await testRuns(sub, null, rng);
      if (r.flag === 'N/A') { console.log(`    ${label}: N/A`); continue; }
      console.log(`    ${label}  flag=${r.flag}  pooledZ=${r.pooledMeanZ}  pooledP=${r.pooledP}  ${r.nSignificant}/${r.nPairs} pairs adj-sig`);
      // details truncates at 15 pairs and the planted Rep4-7 pairs sit past it,
      // so each column block is run as its own submatrix instead.
      for (const [name, cols] of [['Rep4-7 (planted)', [3,4,5,6]], ['Rep1-3 (clean)', [0,1,2]]]) {
        const sm = sub.map(row => cols.map(c => row[c]));
        const rr = await testRuns(sm, null, rng);
        if (rr.flag === 'N/A') { console.log(`       ${name.padEnd(18)} N/A`); continue; }
        const dets = (rr.details || []).filter(d => d.source !== 'window' && d.signs);
        const perms = dets.map(d => runsPerm(d.signs).permP).sort((a,b)=>a-b);
        console.log(`       ${name.padEnd(18)} pooledZ=${rr.pooledMeanZ.padStart(7)} pooledP=${rr.pooledP}` +
          `  ${rr.nSignificant}/${rr.nPairs} adj-sig` +
          (perms.length ? `  exact perm p: min=${perms[0].toFixed(4)} median=${perms[Math.floor(perms.length/2)].toFixed(4)}` : ''));
      }
    }
  }
  // What the engine actually sees on the whole fixture.
  const whole = await testRuns(matrix, condCtx, createPRNG(matrix));
  console.log(`\n  engine view (whole fixture): flag=${whole.flag} pooledZ=${whole.pooledMeanZ} pooledP=${whole.pooledP} ${whole.nSignificant}/${whole.nPairs} pairs adj-sig`);
  process.exit(0);
}

// ── Selective Noise under a within-row null (--snoise) ─────────────────────
// Bartlett builds each column's sample as matrix[r][c] - rowMeans[r], so the k
// residuals in a row are constrained to sum to zero and cannot be the k
// independent samples Bartlett assumes. The row shuffle cannot test that: the
// statistic never reads row order. The right null permutes values WITHIN each
// row, which preserves the row mean and the row's multiset exactly and destroys
// only column identity — the thing the test claims to read.
//
// Validity needs columns exchangeable under the null. Checked, not assumed:
// every Bartlett call in this battery sees replicate columns of a single
// condition. Column-grouped fixtures dispatch through aggregatePerGroup, so
// values are permuted only within a group's own columns; row-grouped and
// ungrouped fixtures put all data columns in one call, and those are replicates.
// The one fixture whose columns are not replicates (the survey, heterogeneous
// items) is already N/A on data type.
if (process.argv.includes('--snoise')) {
  const { testSelectiveNoise } = await import(B + 'src/tests/selectiveNoise.js');
  const { runFullAnalysis } = await import(B + 'src/analysis/engine.js');
  const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const P = Number(process.env.P) || 1000;
  const pick = process.env.FILES ? process.env.FILES.split(',') : null;
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f] && (!pick || pick.includes(f))).sort();

  console.log(`### Selective Noise Partitioning under a within-row permutation null, P = ${P}\n`);
  console.log('  ' + 'fixture'.padEnd(36) + 'k'.padEnd(5) + 'R1'.padEnd(9) + 'chi obs'.padEnd(10) +
              'null mean chi'.padEnd(15) + 'df=k-1'.padEnd(8) + 'ratio'.padEnd(8) +
              'pred k/(k-1)'.padEnd(14) + 'R1 fire'.padEnd(9) + 'perm p'.padEnd(9) + 'cost');
  console.log('  ' + '-'.repeat(132));

  for (const file of files) {
    const base = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
    const { matrix, rawMatrix, condCtx } = base;
    const vst = detectVST(matrix, assay);
    const vstMatrix = applyVST(matrix, vst?.transform || 'raw');
    const eff = vstMatrix || matrix;
    const effCtx = vstMatrix ? condCtx.withMatrix(vstMatrix) : condCtx;
    const useAgg = condCtx.type === 'column-grouped' && condCtx.count >= 2;

    const real = (await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst,
      { isPivoted: false }, dataType, 'ordered')).find(r => r.name === 'Selective Noise Partitioning');
    if (!real || real.flag === 'N/A') { console.log('  ' + file.padEnd(36) + 'N/A'); continue; }

    const dispatch = (m, ctx) => useAgg
      ? aggregatePerGroup(testSelectiveNoise, ctx.slices(), ctx)
      : testSelectiveNoise(m, ctx);

    const obs = await dispatch(eff, effCtx);
    if (obs.flag !== real.flag) {
      console.log('  ' + file.padEnd(36) + `*** dispatch MISMATCH probe ${obs.flag} vs engine ${real.flag} — skipped ***`);
      continue;
    }
    // Column blocks to permute within. Column-grouped: each condition's own
    // columns. Otherwise: every data column, which are replicates.
    const blocks = useAgg ? condCtx.slices().map(s => s.colIndices)
                          : [Array.from({ length: eff[0].length }, (_, i) => i)];
    const k = blocks[0].length;
    const chiObs = num(obs.bartlettChi);

    const rnd = mulberry32(0xC0FFEE);
    const chis = []; let fire = 0, ran = 0, ge = 0;
    const t0 = Date.now();
    for (let it = 0; it < P; it++) {
      const m = eff.map(row => {
        const out = row.slice();
        for (const cols of blocks) {
          const vals = cols.map(c => row[c]);
          for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rnd()*(i+1)); const t=vals[i]; vals[i]=vals[j]; vals[j]=t; }
          cols.forEach((c, i) => { out[c] = vals[i]; });
        }
        return out;
      });
      const r = await dispatch(m, condCtx.withMatrix(m));
      if (r.flag === 'N/A') continue;
      ran++;
      if (r.flag === 'MODERATE' || r.flag === 'HIGH') fire++;
      const c = num(r.bartlettChi);
      if (Number.isFinite(c)) { chis.push(c); if (c >= chiObs) ge++; }
    }
    const secs = (Date.now() - t0)/1000;
    const nullMean = chis.length ? mean(chis) : NaN;
    const df = k - 1;
    const permP = (ge + 1)/(ran + 1);
    console.log('  ' + file.padEnd(36) + String(k).padEnd(5) + real.flag.padEnd(9) +
      (Number.isFinite(chiObs)?chiObs.toFixed(2):'-').padEnd(10) +
      nullMean.toFixed(3).padEnd(15) + String(df).padEnd(8) +
      (nullMean/df).toFixed(3).padEnd(8) + (k/(k-1)).toFixed(3).padEnd(14) +
      `${(100*fire/ran).toFixed(1)}%`.padEnd(9) + permP.toFixed(4).padEnd(9) + `${secs.toFixed(1)}s`);
  }
  process.exit(0);
}

// ══ Route 2 validation modes ═══════════════════════════════════════════════
// Shared helpers for the four synthetic validations below.
function _normal(rnd) {
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0, v = 0, sq = 0;
    do { u = rnd()*2-1; v = rnd()*2-1; sq = u*u+v*v; } while (sq === 0 || sq >= 1);
    const f = Math.sqrt(-2*Math.log(sq)/sq);
    spare = v*f; return u*f;
  };
}
// Stationary AR(1) column, unit marginal variance so `rho` is the only knob.
function _arCol(n, rho, nrm) {
  const out = new Array(n);
  const sd = Math.sqrt(1 - rho*rho);
  let x = nrm();
  for (let i = 0; i < n; i++) { x = rho*x + sd*nrm(); out[i] = x; }
  return out;
}
function _whiteCol(n, nrm) { const o = new Array(n); for (let i=0;i<n;i++) o[i]=nrm(); return o; }
function _colsToMatrix(cols) {
  const n = cols[0].length, C = cols.length, m = new Array(n);
  for (let r = 0; r < n; r++) { const row = new Array(C); for (let c=0;c<C;c++) row[c]=cols[c][r]; m[r]=row; }
  return m;
}
// Per-pair lag-1 family, built from the engine's own primitives: acfAtLag for
// the statistic, zToP for the p, bhFDR for the adjustment. Same three calls
// testAutocorrelation makes. Validated against it in --bh before use.
async function _perPair(matrix) {
  const { acfAtLag, zToP, bhFDR } = await import(B + 'src/stats/primitives.js');
  const nR = matrix.length, nC = matrix[0].length;
  const pairs = [];
  for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1+1; c2 < nC; c2++) {
    const d = [];
    for (let r = 0; r < nR; r++) if (matrix[r][c1]!=null && matrix[r][c2]!=null) d.push(matrix[r][c1]-matrix[r][c2]);
    if (d.length < 10) continue;
    const m = mean(d), den = d.reduce((s,x)=>s+(x-m)**2, 0);
    const r1 = acfAtLag(d, m, den, 1);
    pairs.push({ c1, c2, r1, rawP: zToP(r1/(1/Math.sqrt(d.length))) });
  }
  const adj = bhFDR(pairs.map(x=>x.rawP));
  pairs.forEach((x,i)=>{ x.adjP = adj[i]; });
  return pairs;
}

// ── Part 1: does BH hold under a partial null (--bh) ───────────────────────
// One column carries a lag-1 effect. Every pair containing it is contaminated;
// every pair that does not is null. BH bounds the FALSE DISCOVERY RATE, E[V/R]
// — not the fraction of true nulls rejected, which can climb well above q as
// real signal relaxes the threshold. Both are reported; they answer different
// questions and only the first is BH's guarantee.
if (process.argv.includes('--bh')) {
  const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
  const RUNS = Number(process.env.RUNS) || 2000;
  const N = Number(process.env.N) || 200;
  const Q = 0.01;

  // Faithfulness: the reconstruction must match the engine's own per-pair
  // numbers on a width where details is complete.
  {
    const nrm = _normal(mulberry32(7));
    const cols = [_arCol(N, 0.5, nrm), ...Array.from({length:5},()=>_whiteCol(N,nrm))];
    const m = _colsToMatrix(cols);
    const mine = await _perPair(m);
    const eng = testAutocorrelation(m, null);
    const ed = (eng.details||[]).filter(d=>Number.isFinite(Number(d.adjP)));
    // adjP is stored full-precision and must match exactly. lag1 is stored as
    // toFixed(4) for display, so it can only be checked to its own precision.
    let wAdj = 0, wR = 0;
    for (const d of ed) {
      const [a,b] = d.pair.split(/[–-]/).map(Number);
      const mm = mine.find(x=>x.c1===a-1 && x.c2===b-1);
      wAdj = Math.max(wAdj, Math.abs(mm.adjP - Number(d.adjP)));
      wR = Math.max(wR, Math.abs(mm.r1 - Number(d.lag1)));
    }
    const ok = wAdj < 1e-12 && wR < 1e-4;
    console.log(`### Part 1 — BH under a partial null. N=${N} rows, ${RUNS} runs per cell, q=${Q}`);
    console.log(`    reconstruction vs engine on ${ed.length} pairs: adjP delta ${wAdj.toExponential(1)}, ` +
                `r1 delta ${wR.toExponential(1)} (r1 stored at 4dp) ` +
                `-> ${ok ? 'MATCHES' : '*** MISMATCH — numbers below are untrustworthy ***'}\n`);
  }

  console.log('  ' + 'C'.padEnd(5) + 'rho'.padEnd(7) + 'null pairs'.padEnd(12) + 'mean|r| contam'.padEnd(16) +
              'mean|r| null'.padEnd(14) + 'FDR E[V/R]'.padEnd(12) + 'null-pair rej rate'.padEnd(20) + 'any-null-rejected');
  console.log('  ' + '-'.repeat(112));
  for (const C of [4, 6, 8, 12]) {
    for (const rho of [0, 0.1, 0.2, 0.3, 0.5, 0.7]) {
      const rnd = mulberry32(0xC0FFEE + C*1000 + Math.round(rho*100));
      const nrm = _normal(rnd);
      let fdrSum = 0, vTot = 0, m0Tot = 0, anyNull = 0, cSum = 0, cN = 0, nSum = 0, nN = 0;
      for (let run = 0; run < RUNS; run++) {
        const cols = [_arCol(N, rho, nrm), ...Array.from({length:C-1},()=>_whiteCol(N,nrm))];
        const pairs = await _perPair(_colsToMatrix(cols));
        let V = 0, R = 0, m0 = 0, anyV = false;
        for (const x of pairs) {
          const isNull = x.c1 !== 0 && x.c2 !== 0;
          if (isNull) { m0++; nSum += Math.abs(x.r1); nN++; } else { cSum += Math.abs(x.r1); cN++; }
          if (x.adjP < Q) { R++; if (isNull) { V++; anyV = true; } }
        }
        fdrSum += R > 0 ? V/R : 0;
        vTot += V; m0Tot += m0; if (anyV) anyNull++;
      }
      console.log('  ' + String(C).padEnd(5) + rho.toFixed(1).padEnd(7) + String((C-1)*(C-2)/2).padEnd(12) +
        (cSum/cN).toFixed(4).padEnd(16) + (nSum/nN).toFixed(4).padEnd(14) +
        (fdrSum/RUNS).toFixed(4).padEnd(12) + (vTot/m0Tot).toFixed(4).padEnd(20) +
        `${(100*anyNull/RUNS).toFixed(1)}%`);
    }
  }
  console.log('\n  FDR is what BH bounds at q=0.01. The null-pair rejection rate is not bounded by BH');
  console.log('  and is reported because it is what the evidence line shows a reader.');
  process.exit(0);
}

// ── Part 2: did dropping the pooled statistic cost power (--power) ─────────
// Every column gets its own independent AR(1), so every pair carries the same
// weak effect. The construction is verified before any detection rate is taken.
if (process.argv.includes('--power')) {
  const { flagFromP } = await import(B + 'src/constants/thresholds.js');
  const RUNS = Number(process.env.RUNS) || 1000;
  const N = Number(process.env.N) || 200;
  const C = Number(process.env.C) || 8;
  const NULLSIM = Number(process.env.NULLSIM) || 20000;

  const build = (rho, nrm) => _colsToMatrix(Array.from({length:C},()=>_arCol(N, rho, nrm)));

  // Verify the construction: what per-pair r1 does it actually produce?
  console.log(`### Part 2 — power. N=${N}, C=${C}, ${RUNS} runs per rho\n`);
  console.log('  construction check — intended per-pair effect vs measured:');
  for (const rho of [0.1, 0.2, 0.3]) {
    const nrm = _normal(mulberry32(11));
    let acc = 0, n = 0;
    for (let i = 0; i < 200; i++) { for (const x of await _perPair(build(rho, nrm))) { acc += x.r1; n++; } }
    console.log(`    rho=${rho.toFixed(1)}  mean per-pair r1 = ${(acc/n).toFixed(4)}  ` +
                `(full strength would be ${rho.toFixed(2)}, half would be ${(rho/2).toFixed(2)})`);
  }

  // Route 3's null: the pooled mean r1 distribution at rho=0, same N and C.
  // This is the permutation null's reference distribution — permuting rows of a
  // null matrix and generating a fresh null matrix give the same thing here,
  // because the rows are iid by construction.
  const nrm0 = _normal(mulberry32(23));
  const nullPooled = [];
  for (let i = 0; i < NULLSIM; i++) {
    const pp = await _perPair(build(0, nrm0));
    nullPooled.push(mean(pp.map(x=>x.r1)));
  }
  nullPooled.sort((a,b)=>a-b);
  const crit = Math.max(Math.abs(quant(nullPooled, 0.005)), Math.abs(quant(nullPooled, 0.995)));
  console.log(`\n  Route 3 critical value from ${NULLSIM} null draws: |pooled mean r1| > ${crit.toFixed(5)} at alpha=0.01\n`);

  console.log('  ' + 'rho'.padEnd(7) + 'mean per-pair r1'.padEnd(18) + 'Route 2 detect'.padEnd(16) +
              'Route 3 detect'.padEnd(16) + 'gap');
  console.log('  ' + '-'.repeat(72));
  for (const rho of [0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.14, 0.18, 0.25]) {
    const nrm = _normal(mulberry32(0xBEEF + Math.round(rho*1000)));
    let r2 = 0, r3 = 0, rAcc = 0, rN = 0;
    for (let run = 0; run < RUNS; run++) {
      const pp = await _perPair(build(rho, nrm));
      const minAdj = Math.min(...pp.map(x=>x.adjP));
      const pooled = mean(pp.map(x=>x.r1));
      for (const x of pp) { rAcc += x.r1; rN++; }
      if (flagFromP(minAdj) !== 'LOW') r2++;
      if (Math.abs(pooled) > crit) r3++;
    }
    const a = 100*r2/RUNS, b = 100*r3/RUNS;
    console.log('  ' + rho.toFixed(2).padEnd(7) + (rAcc/rN).toFixed(4).padEnd(18) +
      `${a.toFixed(1)}%`.padEnd(16) + `${b.toFixed(1)}%`.padEnd(16) +
      (b - a > 5 ? `Route 3 ahead by ${(b-a).toFixed(1)} pts` : ''));
  }
  process.exit(0);
}

// ── Part 3: does the effect-size gate suppress a concentrated finding (--esgate)
// The gate reads |mean r1| across ALL pairs. Concentrate a strong effect in a
// few pairs and the mean stays under 0.25 while one pair is highly significant.
if (process.argv.includes('--esgate')) {
  const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
  const { flagFromP, EFFECT_SIZE } = await import(B + 'src/constants/thresholds.js');
  const N = Number(process.env.N) || 600;
  console.log(`### Part 3 — effect-size gate on a concentrated effect. N=${N} rows (gate needs >=500)\n`);
  console.log('  ' + 'C'.padEnd(5) + 'rho'.padEnd(7) + 'pooled mean r1'.padEnd(16) + 'gate fires'.padEnd(12) +
              'minAdjP'.padEnd(12) + 'flag WITH gate'.padEnd(16) + 'flag from minAdjP alone'.padEnd(24) + 'driving |r|');
  console.log('  ' + '-'.repeat(96));
  for (const C of [8, 12]) {
    for (const rho of [0.3, 0.5, 0.7]) {
      const nrm = _normal(mulberry32(0xFEED + C*100 + Math.round(rho*100)));
      const m = _colsToMatrix([_arCol(N, rho, nrm), ...Array.from({length:C-1},()=>_whiteCol(N,nrm))]);
      const r = testAutocorrelation(m, null);
      const pooledAbs = Math.abs(Number(r.pooledMeanR1));
      const gate = N >= 500 && pooledAbs < EFFECT_SIZE.AUTOCORR_STRONG;
      console.log('  ' + String(C).padEnd(5) + rho.toFixed(1).padEnd(7) + Number(r.pooledMeanR1).toFixed(4).padEnd(16) +
        String(gate).padEnd(12) + Number(r.minAdjP).toExponential(2).padEnd(12) +
        r.flag.padEnd(16) + flagFromP(Number(r.minAdjP)).padEnd(24) +
        Math.abs(Number(r.minAdjPairR1)).toFixed(4));
    }
  }
  process.exit(0);
}

// ── Part 4: heavy tails in log space (--heavytail) ─────────────────────────
// One hypothesis, tested and then stopped. Rows are iid by construction, so the
// data is already null and no shuffle is needed.
if (process.argv.includes('--heavytail')) {
  const RUNS = Number(process.env.RUNS) || 400;
  const N = Number(process.env.N) || 1500;
  const C = 4;
  console.log(`### Part 4 — does heavy-tailed log-space data inflate the per-pair test? N=${N}, C=${C}, ${RUNS} runs`);
  console.log(`    nominal 1.00% at p<0.01 and 0.100% at p<0.001; DS11 measures 2.40% and 2.167%\n`);
  const tdist = (nrm, rnd, df) => () => {
    let ss = 0; for (let i=0;i<df;i++) { const z = nrm(); ss += z*z; }
    return nrm()/Math.sqrt(ss/df);
  };
  const cases = [
    ['normal (control)',      (nrm,rnd)=>nrm()],
    ['t, df=5',               (nrm,rnd)=>tdist(nrm,rnd,5)()],
    ['t, df=3 (inf 4th mom)', (nrm,rnd)=>tdist(nrm,rnd,3)()],
    ['t, df=2 (inf variance)',(nrm,rnd)=>tdist(nrm,rnd,2)()],
    ['log of NB-like counts', (nrm,rnd)=>{ const mu=Math.exp(nrm()*1.8+4); let k=0,L=Math.exp(-Math.min(mu,600)),p=1;
        do { p*=rnd(); k++; } while (p>L && k<4000); return Math.log(Math.max(k-1,0)+1); }],
  ];
  console.log('  ' + 'distribution'.padEnd(26) + 'excess kurt'.padEnd(14) + 'p<0.01'.padEnd(10) + 'p<0.001');
  console.log('  ' + '-'.repeat(64));
  for (const [label, draw] of cases) {
    const rnd = mulberry32(0xABCD); const nrm = _normal(rnd);
    let lt01 = 0, lt001 = 0, tot = 0, m1=0,m2=0,m4=0,mn=0;
    for (let run = 0; run < RUNS; run++) {
      const cols = Array.from({length:C}, () => Array.from({length:N}, () => draw(nrm, rnd)));
      for (const c of cols) for (const v of c) { m1+=v; mn++; }
      const mm = m1/mn;
      for (const c of cols) for (const v of c) { m2+=(v-mm)**2; m4+=(v-mm)**4; }
      for (const x of await _perPair(_colsToMatrix(cols))) {
        tot++; if (x.rawP < 0.01) lt01++; if (x.rawP < 0.001) lt001++;
      }
    }
    const varr = m2/mn, kurt = m4/mn/(varr*varr) - 3;
    console.log('  ' + label.padEnd(26) + kurt.toFixed(2).padEnd(14) +
      `${(100*lt01/tot).toFixed(2)}%`.padEnd(10) + `${(100*lt001/tot).toFixed(3)}%`);
  }
  process.exit(0);
}

// ── Effect-size floor: does a per-pair threshold separate (--floor) ────────
// The gate exists to stop a trivially small effect flagging merely because N is
// large. It currently reads the pooled mean across pairs, while the verdict
// reads one pair. This measures the driving pair's |r| on every fixture, and on
// synthetic large-N cases carrying a real but negligible per-pair effect — the
// kind the gate was written to stop. A threshold only exists if the two
// populations separate.
if (process.argv.includes('--floor')) {
  const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
  const { flagFromP, ALPHA } = await import(B + 'src/constants/thresholds.js');
  const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
  const { runFullAnalysis } = await import(B + 'src/analysis/engine.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');

  console.log('### Driving pair |r| on every fixture where Autocorrelation returns a flag\n');
  console.log('  ' + 'fixture'.padEnd(36) + 'rows'.padEnd(7) + 'flag'.padEnd(10) + 'driving |r|'.padEnd(13) +
              'minAdjP'.padEnd(12) + 'pooled mean r'.padEnd(15) + 'gate live? (N>=500)');
  console.log('  ' + '-'.repeat(104));
  const rows = [];
  for (const f of readdirSync(FIX).filter(x => x.endsWith('.csv') && EXPECTED[x]).sort()) {
    const base = readFixture(f);
    const assay = EXPECTED[f].assay;
    const dt = ASSAY_DATATYPE_MAP[assay] || 'continuous';
    const vst = detectVST(base.matrix, assay);
    const res = await runFullAnalysis(base.matrix, base.rawMatrix, base.condCtx, assay, null, vst,
      { isPivoted: false }, dt, 'ordered');
    const r = res.find(x => x.name === 'Autocorrelation');
    if (!r || r.flag === 'N/A') continue;
    const dr = Math.abs(num(r.minAdjPairR1));
    rows.push({ f, flag: r.flag, dr, sev: EXPECTED[f].severity });
    console.log('  ' + f.padEnd(36) + String(base.matrix.length).padEnd(7) + r.flag.padEnd(10) +
      dr.toFixed(4).padEnd(13) + num(r.minAdjP).toExponential(2).padEnd(12) +
      Math.abs(num(r.pooledMeanR1)).toFixed(4).padEnd(15) + (base.matrix.length >= 500 ? 'YES' : 'no'));
  }
  const flagged = rows.filter(x => x.flag !== 'LOW');
  const clean = rows.filter(x => x.sev === 0);
  console.log(`\n  flagged fixtures: driving |r| ${flagged.map(x=>x.dr.toFixed(3)).sort().join(', ')}`);
  console.log(`  clean fixtures:   driving |r| max ${Math.max(...clean.map(x=>x.dr)).toFixed(4)}`);

  // Synthetic large-N: a real but negligible per-pair effect. Independent
  // per-column AR(1) gives per-pair r ~= rho (verified by --power).
  console.log('\n\n### Synthetic large-N with a real but negligible per-pair effect, C=6\n');
  console.log('  ' + 'rows'.padEnd(8) + 'rho'.padEnd(7) + 'driving |r|'.padEnd(13) + 'minAdjP'.padEnd(12) +
              'flag WITHOUT any floor'.padEnd(24) + 'would a floor need to block it?');
  console.log('  ' + '-'.repeat(96));
  const trivial = [];
  for (const N of [1000, 2000, 5000, 20000]) {
    for (const rho of [0.02, 0.03, 0.05, 0.08, 0.12]) {
      const nrm = _normal(mulberry32(0x5A5A + N + Math.round(rho*1000)));
      const m = _colsToMatrix(Array.from({length:6}, () => _arCol(N, rho, nrm)));
      const r = testAutocorrelation(m, null);
      const dr = Math.abs(num(r.minAdjPairR1));
      const bare = flagFromP(num(r.minAdjP));
      const needsBlock = bare !== 'LOW';
      if (needsBlock) trivial.push({ N, rho, dr });
      console.log('  ' + String(N).padEnd(8) + rho.toFixed(2).padEnd(7) + dr.toFixed(4).padEnd(13) +
        num(r.minAdjP).toExponential(2).padEnd(12) + bare.padEnd(24) + (needsBlock ? 'YES' : 'no — p alone clears it'));
    }
  }
  console.log('\n### Separation\n');
  const keepMin = Math.min(...flagged.map(x=>x.dr));
  if (!trivial.length) {
    console.log('  No synthetic case reached a flag without a floor, so nothing needs blocking at these effect sizes.');
  } else {
    const blockMax = Math.max(...trivial.map(x=>x.dr));
    console.log(`  must KEEP  (real findings)      : driving |r| >= ${keepMin.toFixed(4)}`);
    console.log(`  must BLOCK (trivial at large N) : driving |r| <= ${blockMax.toFixed(4)}`);
    console.log(`  -> ${blockMax < keepMin ? `SEPARATES. Any threshold in (${blockMax.toFixed(4)}, ${keepMin.toFixed(4)}) works.`
                                           : 'OVERLAP — no single threshold separates them.'}`);
  }
  process.exit(0);
}

// ── Where the trivial band actually tops out (--floorband) ────────────────
// The driving |r| is a MAX over pairs, so sampling noise inflates it above the
// underlying process rho — most at the small end of "large N", which is exactly
// where the gate switches on. One draw per cell is not enough to site a
// threshold. This takes the distribution.
if (process.argv.includes('--floorband')) {
  const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
  const { flagFromP } = await import(B + 'src/constants/thresholds.js');
  const REPS = Number(process.env.REPS) || 400;
  const C = Number(process.env.C) || 6;
  console.log(`### Distribution of the driving |r| on trivial large-N cases, C=${C}, ${REPS} draws per cell\n`);
  console.log('  ' + 'rows'.padEnd(8) + 'rho'.padEnd(7) + 'mean |r|'.padEnd(11) + 'p95'.padEnd(9) +
              'p99'.padEnd(9) + 'max'.padEnd(9) + 'flags without a floor');
  console.log('  ' + '-'.repeat(74));
  let worst99 = 0, worstMax = 0;
  for (const N of [500, 600, 800, 1200, 3000]) {
    for (const rho of [0.05, 0.08, 0.12, 0.15]) {
      const nrm = _normal(mulberry32(0x9E3 + N + Math.round(rho*1000)));
      const drs = []; let fired = 0;
      for (let i = 0; i < REPS; i++) {
        const r = testAutocorrelation(_colsToMatrix(Array.from({length:C},()=>_arCol(N, rho, nrm))), null);
        drs.push(Math.abs(num(r.minAdjPairR1)));
        if (flagFromP(num(r.minAdjP)) !== 'LOW') fired++;
      }
      drs.sort((a,b)=>a-b);
      const p99 = quant(drs, 0.99), mx = drs[drs.length-1];
      if (rho <= 0.12) { worst99 = Math.max(worst99, p99); worstMax = Math.max(worstMax, mx); }
      console.log('  ' + String(N).padEnd(8) + rho.toFixed(2).padEnd(7) + mean(drs).toFixed(4).padEnd(11) +
        quant(drs,0.95).toFixed(4).padEnd(9) + p99.toFixed(4).padEnd(9) + mx.toFixed(4).padEnd(9) +
        `${(100*fired/REPS).toFixed(0)}%`);
    }
  }
  console.log(`\n  Treating rho <= 0.12 as the trivial band (the recorded rationale puts background at 0.03-0.15):`);
  console.log(`    99th percentile of driving |r| across those cells: ${worst99.toFixed(4)}`);
  console.log(`    maximum observed                                 : ${worstMax.toFixed(4)}`);
  console.log(`  Tightest real finding in the suite (DS21): 0.3066`);
  process.exit(0);
}

// ── Joint effect of a driving-|r| floor (--floorjoint) ────────────────────
// A case only flags if the adjusted p is significant AND the driving |r| clears
// the floor. Marginal distributions of |r| overlap; what decides whether a
// floor is usable is the joint rate. Also reports what the CURRENT pooled-mean
// gate does to the same cases, since the two quantities catch different shapes.
if (process.argv.includes('--floorjoint')) {
  const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
  const { flagFromP } = await import(B + 'src/constants/thresholds.js');
  const REPS = Number(process.env.REPS) || 400;
  const C = 6;
  const Ts = [0.15, 0.20, 0.25, 0.30];
  console.log(`### Flag rate on trivial large-N cases under a driving-|r| floor, C=${C}, ${REPS} draws\n`);
  console.log('  ' + 'rows'.padEnd(7) + 'rho'.padEnd(6) + 'no floor'.padEnd(10) +
              Ts.map(t=>`T=${t.toFixed(2)}`.padEnd(9)).join('') + 'current pooled-mean gate');
  console.log('  ' + '-'.repeat(84));
  for (const N of [500, 800, 3000]) {
    for (const rho of [0.05, 0.08, 0.12]) {
      const nrm = _normal(mulberry32(0x9E3 + N + Math.round(rho*1000)));
      let bare = 0; const byT = Ts.map(()=>0); let cur = 0;
      for (let i = 0; i < REPS; i++) {
        const r = testAutocorrelation(_colsToMatrix(Array.from({length:C},()=>_arCol(N, rho, nrm))), null);
        const sig = flagFromP(num(r.minAdjP)) !== 'LOW';
        const dr = Math.abs(num(r.minAdjPairR1));
        const pooledAbs = Math.abs(num(r.pooledMeanR1));
        if (sig) bare++;
        Ts.forEach((t,k)=>{ if (sig && dr >= t) byT[k]++; });
        if (sig && !(pooledAbs < 0.25)) cur++;   // current gate lets it through only if pooled mean >= 0.25
      }
      console.log('  ' + String(N).padEnd(7) + rho.toFixed(2).padEnd(6) + `${(100*bare/REPS).toFixed(0)}%`.padEnd(10) +
        byT.map(v=>`${(100*v/REPS).toFixed(1)}%`.padEnd(9)).join('') + `${(100*cur/REPS).toFixed(1)}%`);
    }
  }
  console.log('\n  Real findings must survive the same floor:');
  console.log('    DS11 driving |r| = 0.4402 (1500 rows, gate live)  -> passes every T listed');
  console.log('    DS21 driving |r| = 0.3066 (400 rows, gate NOT live at N<500)');
  process.exit(0);
}

// ══ Can family shape separate what magnitude cannot (--shape) ══════════════
// A floor on the driving pair's |r| is dead: the trivial pervasive case produces
// a LARGER driving |r| than the real concentrated one (0.1844 mean at 500 rows
// and rho 0.12 against 0.1482 for an injected 0.3), so it is an inversion rather
// than a gap to split. Removing the floor is dead too — pervasive rho 0.05 flags
// 94% of the time at 3000 rows with no floor at all.
//
// The information that magnitude throws away is the SHAPE of the per-pair
// family. Pervasive trivia lifts every pair together. A concentrated finding
// puts one or two pairs far above the rest. This measures whether a shape
// statistic separates the two where magnitude did not.
//
// WHY THE INVERSION HAPPENS, and it is checked here rather than assumed.
// Differencing an affected column against a clean one halves the effect: for
// X an AR(1) at rho and Y independent white noise, Var(X-Y) = 2 while the lag-1
// autocovariance is rho, so the pair's r is rho/2. When every column carries the
// effect both autocovariances survive, giving 2rho over a variance of 2, so r is
// rho at full strength. Taking a maximum over C(C-1)/2 pairs then lifts the
// pervasive case further. Section 1 measures both.
//
// GUARDING AGAINST FITTING TO TWO SHAPES. Any rule chosen from two synthetic
// extremes is fitted to them, and no fixture carries either. So three more
// shapes are measured alongside: two columns injected and half the columns
// injected, which sit between the extremes; a pervasive effect at forensic
// strength, which every rule must KEEP; and a concentrated effect at trivial
// strength, which every rule must BLOCK and which a breadth-only rule waves
// straight through. A candidate that separates the two anchors but fails an
// interpolation has been fitted, not found.
//
// WHAT IS MEASURABLE AT THE DECISION POINT. `nSignificant` is computed at
// autocorrelation.js line 58 over the complete per-pair set, the gate at line 88
// and the flag at line 107, so breadth is available where the flag is decided.
// `allR1` is in scope at line 88 too, so the contrast statistics are as well.
// Neither candidate needs a field the test does not already hold.
//
// ADMIT, NOT SUPPRESS. Every rule below returns admit or block, where admit
// means the flag becomes flagFromP(minAdjP). The current gate is the rule
// `|pooled mean r1| >= 0.25`, applied only at 500 rows or more.
if (process.argv.includes('--shape')) {
  const { flagFromP, ALPHA, EFFECT_SIZE } = await import(B + 'src/constants/thresholds.js');
  const { acfAtLag, zToP, bhFDR } = await import(B + 'src/stats/primitives.js');
  const REPS = Number(process.env.REPS) || 600;
  const T_POOLED = EFFECT_SIZE.AUTOCORR_STRONG;          // 0.25, the gate as it stands
  const T_HALF = T_POOLED / 2;                            // 0.125, the same standard after differencing

  // Complete per-pair family. `details` truncates at 15, so a C=12 matrix would
  // lose 51 of its 66 pairs — every statistic below needs the full set. Asserted
  // against testAutocorrelation's own complete-set fields before use.
  const family = (matrix) => {
    const nR = matrix.length, nC = matrix[0].length;
    const rs = [], ps = [], pc = [];
    for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
      const d = [];
      for (let r = 0; r < nR; r++) if (matrix[r][c1] != null && matrix[r][c2] != null) d.push(matrix[r][c1] - matrix[r][c2]);
      if (d.length < 10) continue;
      const m = mean(d), den = d.reduce((s, x) => s + (x - m) ** 2, 0);
      const r1 = acfAtLag(d, m, den, 1);
      rs.push(r1); ps.push(zToP(r1 * Math.sqrt(d.length))); pc.push([c1, c2]);
    }
    if (!rs.length) return null;
    const adj = bhFDR(ps);
    let mi = 0;
    for (let i = 1; i < adj.length; i++) if (adj[i] < adj[mi]) mi = i;
    const abs = rs.map(Math.abs).sort((a, b) => a - b);
    const driving = Math.abs(rs[mi]);
    const med = quant(abs, 0.5), mn = mean(abs);
    return {
      k: rs.length,
      nSig: adj.filter(p => p < ALPHA.NOTE).length,
      minAdj: adj[mi],
      driving,
      pooled: Math.abs(mean(rs)),
      breadth: adj.filter(p => p < ALPHA.NOTE).length / rs.length,
      gap: driving - med,
      ratio: mn > 0 ? driving / mn : Infinity,
      pairCols: pc, rs,
    };
  };

  // ── shapes ──────────────────────────────────────────────────────────────
  // Each returns the matrix plus which columns carry the injection, so the
  // halving check can split pairs by whether they touch one.
  const shapes = {
    // every column carries the effect — survives differencing at full strength
    triv: (N, C, rho, nrm) => ({ m: _colsToMatrix(Array.from({ length: C }, () => _arCol(N, rho, nrm))), inj: new Set(Array.from({ length: C }, (_, i) => i)) }),
    // one column carries it — halved by differencing against a clean column
    conc1: (N, C, rho, nrm) => ({ m: _colsToMatrix([_arCol(N, rho, nrm), ...Array.from({ length: C - 1 }, () => _whiteCol(N, nrm))]), inj: new Set([0]) }),
    conc2: (N, C, rho, nrm) => ({ m: _colsToMatrix([_arCol(N, rho, nrm), _arCol(N, rho, nrm), ...Array.from({ length: C - 2 }, () => _whiteCol(N, nrm))]), inj: new Set([0, 1]) }),
    half: (N, C, rho, nrm) => { const h = Math.ceil(C / 2);
      return { m: _colsToMatrix([...Array.from({ length: h }, () => _arCol(N, rho, nrm)), ...Array.from({ length: C - h }, () => _whiteCol(N, nrm))]), inj: new Set(Array.from({ length: h }, (_, i) => i)) }; },
  };

  // Faithfulness. Four of the five statistics come straight from fields the
  // engine computes over its own complete set, so they can be checked at any
  // width including the ones where `details` truncates.
  {
    let worst = 0; const acc = new Map();
    for (const C of [6, 8, 12]) {
      const nrm = _normal(mulberry32(97 + C));
      const { m } = shapes.conc1(600, C, 0.5, nrm);
      const f = family(m), e = testAutocorrelation(m, null);
      const d = [
        ['nPairs', f.k, e.nPairs, 0],
        ['nSignificant', f.nSig, e.nSignificant, 0],
        ['minAdjP', f.minAdj, Number(e.minAdjP), 1e-12],
        ['driving |r|', f.driving, Math.abs(Number(e.minAdjPairR1)), 5e-5],
        ['pooled |r|', f.pooled, Math.abs(Number(e.pooledMeanR1)), 5e-5],
      ];
      for (const [nm, a, b, tol] of d) {
        const dd = Math.abs(a - b);
        if (dd > tol) worst = 1;
        acc.set(nm, Math.max(acc.get(nm) ?? 0, dd));
      }
    }
    console.log(`### Reconstruction vs testAutocorrelation at C = 6, 8 and 12 (details truncates at 15 pairs)`);
    console.log(`    worst delta over the three widths: ${[...acc].map(([k, v]) => `${k} ${v.toExponential(1)}`).join(', ')}`);
    console.log(`    -> ${worst === 0 ? 'MATCHES' : '*** MISMATCH — numbers below are untrustworthy ***'}\n`);
  }

  // ── Section 1: is the halving what produces the deflated maximum ─────────
  console.log(`### Section 1 — does differencing halve a single-column injection?  ${REPS} draws per cell\n`);
  console.log('  Predicted: a pair touching one injected column reads rho/2, a pair touching two reads rho,');
  console.log('  a pair touching none reads 0. The driving |r| is a maximum over pairs, so it sits above');
  console.log('  whichever of those the shape allows.\n');
  console.log('  ' + 'shape'.padEnd(8) + 'C'.padEnd(4) + 'N'.padEnd(7) + 'rho'.padEnd(7) +
              'r, 1 injected'.padEnd(17) + 'r, 2 injected'.padEnd(17) + 'r, 0 injected'.padEnd(17) +
              'driving |r|'.padEnd(13) + 'pooled |r|');
  console.log('  ' + '-'.repeat(108));
  for (const [name, N, C, rho] of [
    ['conc1', 600, 8, 0.3], ['conc1', 600, 8, 0.5], ['conc1', 600, 8, 0.7],
    ['conc1', 600, 12, 0.3], ['conc1', 600, 12, 0.5], ['conc1', 600, 12, 0.7],
    ['conc2', 600, 8, 0.3], ['half', 600, 8, 0.3],
    ['triv', 500, 6, 0.12], ['triv', 600, 8, 0.3], ['triv', 3000, 6, 0.05],
  ]) {
    const nrm = _normal(mulberry32(0x513 + C * 131 + Math.round(rho * 1000) + N));
    let s1 = 0, n1 = 0, s2 = 0, n2 = 0, s0 = 0, n0 = 0, dr = 0, po = 0, nn = 0;
    for (let i = 0; i < REPS; i++) {
      const { m, inj } = shapes[name](N, C, rho, nrm);
      const f = family(m);
      if (!f) continue;
      nn++; dr += f.driving; po += f.pooled;
      f.pairCols.forEach(([a, b], j) => {
        const t = (inj.has(a) ? 1 : 0) + (inj.has(b) ? 1 : 0);
        if (t === 1) { s1 += f.rs[j]; n1++; } else if (t === 2) { s2 += f.rs[j]; n2++; } else { s0 += f.rs[j]; n0++; }
      });
    }
    const fmt = (s, n, ref) => n ? `${(s / n).toFixed(4)} (${((s / n) / ref).toFixed(2)}x)` : '-';
    console.log('  ' + name.padEnd(8) + String(C).padEnd(4) + String(N).padEnd(7) + rho.toFixed(2).padEnd(7) +
      fmt(s1, n1, rho).padEnd(17) + fmt(s2, n2, rho).padEnd(17) + fmt(s0, n0, rho).padEnd(17) +
      (dr / nn).toFixed(4).padEnd(13) + (po / nn).toFixed(4));
  }
  console.log(`\n  The bracketed multiple is the pair r divided by the injected rho, so 0.50 is the halving.`);

  // ── the cells every candidate is judged on ──────────────────────────────
  // KEEP cells: findings the gate currently demotes, plus a pervasive effect at
  // forensic strength that every rule must also keep.
  const KEEP = [];
  for (const C of [8, 12]) for (const rho of [0.3, 0.5, 0.7]) KEEP.push(['conc1', 600, C, rho, 'the six']);
  for (const C of [8, 12]) for (const rho of [0.3, 0.5]) KEEP.push(['conc2', 600, C, rho, 'two injected']);
  for (const C of [8, 12]) for (const rho of [0.3, 0.5]) KEEP.push(['half', 600, C, rho, 'half injected']);
  for (const C of [6, 8, 12]) for (const rho of [0.4, 0.6]) KEEP.push(['triv', 600, C, rho, 'pervasive strong']);
  // BLOCK cells: the trivial band, pervasive at the recorded 0.03-0.15
  // background, plus a concentrated effect at trivial strength — the leak class
  // a breadth-only rule cannot see.
  const BLOCK = [];
  for (const C of [6, 8, 12]) for (const N of [500, 1000, 3000]) for (const rho of [0.03, 0.05, 0.08, 0.12, 0.15]) BLOCK.push(['triv', N, C, rho, 'trivial band']);
  for (const C of [6, 8, 12]) for (const N of [500, 1000, 3000]) for (const rho of [0.06, 0.10, 0.15]) BLOCK.push(['conc1', N, C, rho, 'trivial concentrated']);

  // ── the candidates ──────────────────────────────────────────────────────
  // Each takes the family statistics and a threshold, and returns admit.
  const RULES = [
    { id: 'current', label: 'pooled |r| >= 0.25 (as it stands)', ts: [null],
      fn: (f) => f.pooled >= T_POOLED },
    { id: 'breadth', label: 'breadth <= T', ts: [0.20, 0.30, 0.40, 0.50, 0.60],
      fn: (f, t) => f.breadth <= t },
    { id: 'gap', label: 'driving |r| - median |r| >= T', ts: [0.05, 0.08, 0.10, 0.125, 0.15, 0.20],
      fn: (f, t) => f.gap >= t },
    { id: 'ratio', label: 'driving |r| / mean |r| >= T', ts: [1.5, 2.0, 2.5, 3.0, 4.0],
      fn: (f, t) => f.ratio >= t },
    { id: 'branch', label: 'breadth > T ? pooled >= 0.25 : driving >= 0.125', ts: [0.20, 0.30, 0.40, 0.50, 0.60],
      fn: (f, t) => (f.breadth > t ? f.pooled >= T_POOLED : f.driving >= T_HALF) },
    { id: 'union', label: 'pooled >= 0.25 OR gap >= T', ts: [0.05, 0.08, 0.10, 0.125, 0.15, 0.20],
      fn: (f, t) => f.pooled >= T_POOLED || f.gap >= t },
    { id: 'unionB', label: 'pooled >= 0.25 OR (breadth <= 0.5 AND driving >= 0.125)', ts: [null],
      fn: (f) => f.pooled >= T_POOLED || (f.breadth <= 0.5 && f.driving >= T_HALF) },
  ];

  // Draw every cell once, store the family statistics, then score every rule on
  // the same draws. One set of draws for all candidates, so the comparison
  // carries no sampling difference between them.
  const runCell = ([name, N, C, rho, band]) => {
    const nrm = _normal(mulberry32(0xA5E + C * 7919 + N * 31 + Math.round(rho * 1000)));
    const fs = [];
    for (let i = 0; i < REPS; i++) {
      const { m } = shapes[name](N, C, rho, nrm);
      const f = family(m);
      if (f) fs.push(f);
    }
    return { name, N, C, rho, band, fs, pFlag: fs.filter(f => flagFromP(f.minAdj) !== 'LOW').length };
  };
  const keepCells = KEEP.map(runCell);
  const blockCells = BLOCK.map(runCell);

  // ── Section 2: the statistics, by shape ─────────────────────────────────
  const statLine = (c) => {
    const g = (sel) => { const v = c.fs.map(sel).filter(Number.isFinite).sort((a, b) => a - b);
      return v.length ? `${mean(v).toFixed(3)}/${quant(v, 0.05).toFixed(3)}/${quant(v, 0.95).toFixed(3)}` : '-'; };
    return '  ' + c.name.padEnd(7) + String(c.C).padEnd(4) + String(c.N).padEnd(6) + c.rho.toFixed(2).padEnd(6) +
      `${(100 * c.pFlag / c.fs.length).toFixed(0)}%`.padEnd(9) +
      g(f => f.breadth).padEnd(21) + g(f => f.gap).padEnd(21) + g(f => f.ratio).padEnd(23) +
      g(f => f.pooled).padEnd(21) + g(f => f.driving);
  };
  const statHead = () => {
    console.log('  ' + 'shape'.padEnd(7) + 'C'.padEnd(4) + 'N'.padEnd(6) + 'rho'.padEnd(6) + 'p flags'.padEnd(9) +
      'breadth'.padEnd(21) + 'gap'.padEnd(21) + 'ratio'.padEnd(23) + 'pooled |r|'.padEnd(21) + 'driving |r|');
    console.log('  ' + '-'.repeat(140));
  };
  console.log(`\n\n### Section 2 — the shape statistics. Each cell is mean/5th/95th over ${REPS} draws.\n`);
  console.log('  "p flags" is how often the p-value alone reaches MODERATE, i.e. how often any gate is asked');
  console.log('  the question at all. Cells where it is 0% carry no information about any rule.\n');
  console.log('  MUST KEEP\n');
  statHead();
  for (const c of keepCells) console.log(statLine(c));
  console.log('\n  MUST BLOCK\n');
  statHead();
  for (const c of blockCells) console.log(statLine(c));

  // ── Section 3: the candidates scored ────────────────────────────────────
  console.log(`\n\n### Section 3 — every candidate at every threshold.\n`);
  console.log('  Each keep column counts how many cells in that band the rule admits on 95% or more of the');
  console.log('  draws where the p-value alone flags. "six" is the six concentrated cells the gate demotes');
  console.log('  today. "2col" and "half" are the interpolations, "pervS" a pervasive effect at forensic');
  console.log('  strength that every rule must keep. Leak is the flag rate under the rule, so it is directly');
  console.log('  comparable to the pooled-mean gate\'s 0%.\n');
  console.log('  ' + 'rule'.padEnd(9) + 'T'.padEnd(8) + 'six'.padEnd(7) + '2col'.padEnd(7) + 'half'.padEnd(7) +
              'pervS'.padEnd(8) + 'leak 500'.padEnd(11) + 'leak 1000'.padEnd(11) + 'leak 3000'.padEnd(11) + 'worst leaking cell');
  console.log('  ' + '-'.repeat(128));
  const BANDS = [['the six', 'six'], ['two injected', '2col'], ['half injected', 'half'], ['pervasive strong', 'pervS']];
  const results = [];
  for (const r of RULES) {
    for (const t of r.ts) {
      const admitRate = (c) => {
        const asked = c.fs.filter(f => flagFromP(f.minAdj) !== 'LOW');
        return asked.length ? asked.filter(f => r.fn(f, t)).length / asked.length : null;
      };
      const kept = {}, tot = {};
      for (const [band] of BANDS) { kept[band] = 0; tot[band] = 0; }
      for (const c of keepCells) {
        tot[c.band]++;
        const a = admitRate(c);
        if (a != null && a >= 0.95) kept[c.band]++;
      }
      const six = kept['the six'];
      const leakOf = (c) => c.fs.filter(f => flagFromP(f.minAdj) !== 'LOW' && r.fn(f, t)).length / c.fs.length;
      const byN = {};
      let worst = { v: -1, c: null };
      for (const c of blockCells) {
        const v = leakOf(c);
        byN[c.N] = Math.max(byN[c.N] ?? 0, v);
        if (v > worst.v) worst = { v, c };
      }
      results.push({ id: r.id, t, six, kept, tot, byN, worst });
      console.log('  ' + r.id.padEnd(9) + (t == null ? '-' : String(t)).padEnd(8) +
        BANDS.map(([band, lbl], i) => `${kept[band]}/${tot[band]}`.padEnd(i === 3 ? 8 : 7)).join('') +
        `${(100 * (byN[500] ?? 0)).toFixed(1)}%`.padEnd(11) +
        `${(100 * (byN[1000] ?? 0)).toFixed(1)}%`.padEnd(11) +
        `${(100 * (byN[3000] ?? 0)).toFixed(1)}%`.padEnd(11) +
        (worst.v > 0 ? `${(100 * worst.v).toFixed(1)}% at ${worst.c.name} C=${worst.c.C} N=${worst.c.N} rho=${worst.c.rho}` : 'nothing leaks'));
    }
  }
  console.log('\n  Rule definitions:');
  for (const r of RULES) console.log(`    ${r.id.padEnd(9)} ${r.label}`);

  // ── Section 5: if no rule separates, is the shape at least reportable ────
  // A gate has to answer two questions at once — which shape is this, and is the
  // effect large enough — and Section 3 says no single statistic answers both.
  // Describing the shape is a weaker demand: it only has to answer the first.
  // This measures whether it can, pooled over every draw where the p-value
  // flags, so the answer does not depend on picking a cell.
  //
  // The two classes are the two constructions: every column carrying the effect,
  // and one column carrying it. The interpolations are reported separately
  // because they have no correct label — they ARE the middle.
  console.log(`\n\n### Section 5 — is the shape reportable even though it cannot gate?\n`);
  const asked = (cs, nm) => cs.filter(c => c.name === nm)
    .flatMap(c => c.fs.filter(f => flagFromP(f.minAdj) !== 'LOW'));
  const all = [...keepCells, ...blockCells];
  const perv = asked(all, 'triv'), conc = asked(all, 'conc1');
  const mid = [...asked(all, 'conc2'), ...asked(all, 'half')];
  console.log(`  Draws where the p-value flags: ${perv.length} pervasive, ${conc.length} concentrated, ${mid.length} in between.\n`);
  for (const [nm, sel] of [['breadth', f => f.breadth], ['ratio', f => f.ratio], ['gap', f => f.gap]]) {
    const q = (arr) => { const v = arr.map(sel).filter(Number.isFinite).sort((a, b) => a - b);
      return `${quant(v, 0.05).toFixed(3)} / ${quant(v, 0.5).toFixed(3)} / ${quant(v, 0.95).toFixed(3)}`; };
    console.log(`  ${nm.padEnd(9)} pervasive ${q(perv).padEnd(26)} concentrated ${q(conc).padEnd(26)} between ${q(mid)}`);
  }
  console.log('\n  Best single split, scanned over the statistic, minimising the larger of the two error rates:');
  console.log('  ' + 'statistic'.padEnd(11) + 'split'.padEnd(9) + 'pervasive called concentrated'.padEnd(31) +
              'concentrated called pervasive'.padEnd(31) + 'worse of the two');
  console.log('  ' + '-'.repeat(96));
  for (const [nm, sel, lo, hi, step, dir] of [
    ['breadth', f => f.breadth, 0.05, 0.95, 0.01, 'concLow'],
    ['ratio', f => f.ratio, 1.0, 4.0, 0.02, 'concHigh'],
    ['gap', f => f.gap, 0.0, 0.30, 0.005, 'concHigh'],
  ]) {
    let best = null;
    for (let t = lo; t <= hi + 1e-9; t += step) {
      // concLow: a concentrated family sits BELOW the split. concHigh: above it.
      const isConc = (f) => dir === 'concLow' ? sel(f) <= t : sel(f) >= t;
      const e1 = perv.filter(isConc).length / perv.length;       // pervasive mislabelled
      const e2 = conc.filter(f => !isConc(f)).length / conc.length; // concentrated mislabelled
      const w = Math.max(e1, e2);
      if (!best || w < best.w) best = { t, e1, e2, w };
    }
    console.log('  ' + nm.padEnd(11) + best.t.toFixed(3).padEnd(9) +
      `${(100 * best.e1).toFixed(1)}%`.padEnd(31) + `${(100 * best.e2).toFixed(1)}%`.padEnd(31) +
      `${(100 * best.w).toFixed(1)}%`);
  }
  console.log('\n  This is a classification of shape only. It carries no information about whether the effect');
  console.log('  is large enough to matter, which is why Section 3 finds no rule that gates on it.');


  // ── Section 4: margins, for choosing on robustness ──────────────────────
  // A rule that separates at a knife edge on two synthetic shapes will not
  // survive a real file. For every candidate that reaches six of six with no
  // leak, report the distance between the closest keep and the closest block on
  // its own statistic — that distance is the margin, and it is the property to
  // choose on.
  console.log(`\n\n### Section 4 — margins for the candidates that pass.\n`);
  const STAT = { breadth: f => f.breadth, gap: f => f.gap, ratio: f => f.ratio,
                 branch: f => f.breadth, union: f => f.gap, unionB: f => f.breadth, current: f => f.pooled };
  const passing = results.filter(r => r.six === 6 && Math.max(...Object.values(r.byN)) === 0);
  if (!passing.length) {
    console.log('  No candidate reaches six of six with a zero leak. Section 3 holds the near misses.');
  } else {
    console.log('  ' + 'rule'.padEnd(9) + 'T'.padEnd(8) + 'tightest keep'.padEnd(30) + 'tightest block'.padEnd(30) + 'margin');
    console.log('  ' + '-'.repeat(104));
    for (const p of passing) {
      const sel = STAT[p.id];
      // Tightest keep: across all must-keep cells, the 5th percentile of the
      // statistic among draws the p-value flags — how close the hardest real
      // finding comes to the threshold. Tightest block: the 95th percentile on
      // the block side.
      let kTight = null, kCell = null, bTight = null, bCell = null;
      for (const c of keepCells) {
        const v = c.fs.filter(f => flagFromP(f.minAdj) !== 'LOW').map(sel).filter(Number.isFinite).sort((a, b) => a - b);
        if (!v.length) continue;
        const q = quant(v, 0.05);
        if (kTight == null || q < kTight) { kTight = q; kCell = c; }
      }
      for (const c of blockCells) {
        const v = c.fs.filter(f => flagFromP(f.minAdj) !== 'LOW').map(sel).filter(Number.isFinite).sort((a, b) => a - b);
        if (!v.length) continue;
        const q = quant(v, 0.95);
        if (bTight == null || q > bTight) { bTight = q; bCell = c; }
      }
      const desc = (v, c) => c ? `${v.toFixed(3)} (${c.name} C=${c.C} N=${c.N} rho=${c.rho})` : '-';
      console.log('  ' + p.id.padEnd(9) + (p.t == null ? '-' : String(p.t)).padEnd(8) +
        desc(kTight, kCell).padEnd(30) + desc(bTight, bCell).padEnd(30) +
        `${(kTight - bTight).toFixed(3)} absolute, ${(kTight / Math.max(bTight, 1e-9)).toFixed(2)}x`);
    }
    console.log('\n  Keep is the 5th percentile on the keep side, block the 95th on the block side, both taken');
    console.log('  only over draws where the p-value flags. A negative margin means the two overlap and the');
    console.log('  rule passes on the threshold sitting inside the overlap rather than outside it.');
  }
  process.exit(0);
}


// ══ Route 4, and whether combining it with Route 2 stays calibrated ════════
// Route 4 keeps the pooled lag-1 statistic and rescales its standard error by an
// inflation factor estimated from row shuffles of the dataset in hand, instead
// of replacing the null with a tail quantile. A scale needs about 100 shuffles
// where a p < 0.001 quantile needs 1000, which is the whole affordability
// argument. Route 4 had never been measured for power.
//
// PRECISION. `pooledMeanR1` is stored at 4dp and Runs' `pooledMeanZ` at 3dp,
// both for display. A scale estimated as the spread of a rounded quantity
// carries quantisation noise, so the pooled mean and its SE are recomputed here
// at full precision from the same per-pair values the engine pools. Both
// reconstructions are asserted against the engine's own fields, to the precision
// the engine stores them, before any number below is taken.
//
// WHAT ROUTE 4 CORRECTS. The standard error, and nothing else. The pooled mean
// also carries the -1/n lag-1 estimator bias, which Route 4 leaves in place.
//
// THE COMBINATION IS NOT A TEST. "Take the higher of the two flags" is a union
// of two rejection regions, not a statistic with a null, so it has no joint null
// to be calibrated against. Its size is whatever that union measures under H0
// and is knowable only by measurement — which is what the false-positive parts
// below do. Each route at half alpha is the Bonferroni bound on the union, so
// that variant cannot exceed nominal by construction; the open question for it
// is what it costs in power, not whether it is calibrated.

// Shared Route 4 machinery. Sync, so it can be handed to aggregatePerGroup as a
// testFn without changing that function's contract.
const _R4 = await (async () => {
  const { acfAtLag, zToP, bhFDR, pooledTtoP } = await import(B + 'src/stats/primitives.js');
  const { flagFromP, ALPHA, EFFECT_SIZE } = await import(B + 'src/constants/thresholds.js');
  // Same t-to-p convention oneSampleT uses: normal above df 30, Student-t at or
  // below. A normal everywhere over-fires on narrow matrices, where the pooled t
  // has only k-1 = 2 degrees of freedom.
  const twoSided = (t, df) => (df > 30 ? zToP(t) : pooledTtoP(t, df));

  // Full-precision pooled lag-1 family: per-pair r1 via acfAtLag, per-pair p via
  // zToP at SE = 1/sqrt(n), BH across pairs. The same three calls
  // testAutocorrelation makes, in the same order.
  const fam = (matrix) => {
    const nR = matrix.length, nC = matrix[0]?.length || 0;
    if (nC < 2) return null;
    const r1s = [], ps = [];
    for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
      const d = [];
      for (let r = 0; r < nR; r++) if (matrix[r][c1] != null && matrix[r][c2] != null) d.push(matrix[r][c1] - matrix[r][c2]);
      if (d.length < 10) continue;
      const m = mean(d), den = d.reduce((s, x) => s + (x - m) ** 2, 0);
      const r1 = acfAtLag(d, m, den, 1);
      r1s.push(r1); ps.push(zToP(r1 * Math.sqrt(d.length)));
    }
    if (r1s.length < 2) return null;
    const adj = bhFDR(ps);
    let minAdj = adj[0];
    for (let i = 1; i < adj.length; i++) if (adj[i] < minAdj) minAdj = adj[i];
    const m = mean(r1s), s = sd(r1s);
    return { m, se: s / Math.sqrt(r1s.length), k: r1s.length, minAdj };
  };

  // Pooled runs-z family, reconstructed from runs.js: sign method, ties stripped
  // Wald-Wolfowitz, zToP per pair, BH across pairs. Pooled only — the internal
  // window scan is not part of it.
  const runsFam = (matrix) => {
    const nR = matrix.length, nC = matrix[0]?.length || 0;
    if (nC < 2) return null;
    const zs = [], ps = [];
    for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
      const diffs = [];
      for (let r = 0; r < nR; r++) if (matrix[r][c1] != null && matrix[r][c2] != null) diffs.push(matrix[r][c1] - matrix[r][c2]);
      if (diffs.length < 10) continue;
      let nP = 0, nM = 0; const nz = [];
      for (const d of diffs) { if (d > 0) { nP++; nz.push(1); } else if (d < 0) { nM++; nz.push(-1); } }
      let runs = nz.length ? 1 : 0;
      for (let i = 1; i < nz.length; i++) if (nz[i] !== nz[i - 1]) runs++;
      const n = nP + nM; if (nP === 0 || nM === 0 || n < 10) continue;
      const er = (2 * nP * nM) / n + 1, vr = (2 * nP * nM * (2 * nP * nM - n)) / (n * n * (n - 1));
      if (vr <= 0) continue;
      const z = (runs - er) / Math.sqrt(vr);
      zs.push(z); ps.push(zToP(z));
    }
    if (zs.length < 2) return null;
    const adj = bhFDR(ps);
    let minAdj = adj[0];
    for (let i = 1; i < adj.length; i++) if (adj[i] < minAdj) minAdj = adj[i];
    const m = mean(zs), s = sd(zs);
    return { m, se: s / Math.sqrt(zs.length), k: zs.length, minAdj };
  };

  // The scale estimate. The row shuffle IS the null, so the spread of the pooled
  // mean over shuffles is its true SE and the mean of the test's own SE over the
  // same shuffles is what the t assumed. The ratio is the multiplier. The
  // shuffle-by-shuffle series is returned too, so a prefix gives the estimate at
  // a smaller shuffle count without re-running.
  const scale = (matrix, pin, rnd, famFn = fam) => {
    const ms = [], ses = [];
    for (let i = 0; i < pin; i++) {
      const p = permutation(matrix.length, rnd);
      const q = famFn(p.map(j => matrix[j]));
      if (q) { ms.push(q.m); ses.push(q.se); }
    }
    if (ms.length < 5) return null;
    return { infl: sd(ms) / mean(ses), ms, ses };
  };
  const inflFrom = (ms, ses, upto) => {
    if (upto < 5 || ms.length < upto) return null;
    return sd(ms.slice(0, upto)) / mean(ses.slice(0, upto));
  };

  return { fam, runsFam, scale, inflFrom, twoSided, flagFromP, ALPHA, EFFECT_SIZE };
})();

// ── Part 1 + 2a: Route 4's power, and the combination, on the Part 2 sweep ──
// Same construction as --power (one independent AR(1) per column, so every pair
// carries the same weak effect), same effect sizes, same Route 2 and Route 3
// definitions. Route 4, the union, and the union at half alpha are added.
// Column count is swept because the dependence Route 4 rescales grows with
// width, so the band's width need not be constant.
//
// PASS CONDITION, stated before the numbers. Route 4 closes the band if its
// detection rate is within 5 points of Route 3's at every effect size in
// 0.06-0.14 while its rho=0 rate stays at or under 2%. It partly closes it if it
// beats Route 2 by more than 5 points somewhere in that range on the same
// calibration terms. It fails if it is inside 5 points of Route 2 throughout, or
// if its rho=0 rate exceeds 2%.
if (process.argv.includes('--r4sweep')) {
  const { fam, scale, twoSided } = _R4;
  const RUNS = Number(process.env.RUNS) || 1000;
  const N = Number(process.env.N) || 200;
  const PIN = Number(process.env.PIN) || 100;
  const NULLSIM = Number(process.env.NULLSIM) || 20000;
  const CS = (process.env.CS || '4,8,12,18').split(',').map(Number);
  const RHOS = (process.env.RHOS || '0,0.02,0.04,0.06,0.08,0.10,0.14,0.18,0.25').split(',').map(Number);
  const A = 0.01, AH = 0.005;

  console.log(`### Part 1 — Route 4's power on the Part 2 sweep. N=${N} rows, ${RUNS} runs per cell,`);
  console.log(`    scale from ${PIN} shuffles per dataset, Route 3 critical value from ${NULLSIM} null draws.\n`);

  // Faithfulness: the full-precision reconstruction against the engine's own
  // fields, at the precision the engine stores them.
  {
    const nrm = _normal(mulberry32(31));
    const m = _colsToMatrix(Array.from({ length: 8 }, () => _arCol(N, 0.15, nrm)));
    const q = fam(m), eng = testAutocorrelation(m, null);
    const dM = Math.abs(q.m - Number(eng.pooledMeanR1));
    const dSE = Math.abs(q.se - Number(eng.pooledR1SE));
    const dP = Math.abs(q.minAdj - Number(eng.minAdjP));
    const ok = dM < 5e-5 && dSE < 1e-12 && dP < 1e-12 && q.k === eng.nPairs;
    console.log(`  reconstruction vs testAutocorrelation: pooled mean delta ${dM.toExponential(1)} (stored at 4dp),` +
                ` SE delta ${dSE.toExponential(1)}, minAdjP delta ${dP.toExponential(1)},` +
                ` pairs ${q.k}/${eng.nPairs} -> ${ok ? 'MATCHES' : '*** MISMATCH — numbers below are untrustworthy ***'}\n`);
  }

  for (const C of CS) {
    const build = (rho, nrm) => _colsToMatrix(Array.from({ length: C }, () => _arCol(N, rho, nrm)));
    // Route 3's reference distribution: the pooled mean at rho=0, same N and C.
    // Rows are iid by construction, so a fresh null matrix and a shuffle of one
    // give the same distribution. This is Route 3 at unlimited shuffle count —
    // its ceiling, not the P=1000 implementation, which cannot resolve below
    // p = 1/1001. The symmetric critical value is very slightly conservative
    // because the null centres near -1/n rather than 0.
    const nrm0 = _normal(mulberry32(23 + C));
    const nullPooled = [];
    for (let i = 0; i < NULLSIM; i++) { const q = fam(build(0, nrm0)); if (q) nullPooled.push(q.m); }
    nullPooled.sort((a, b) => a - b);
    const crit = Math.max(Math.abs(quant(nullPooled, 0.005)), Math.abs(quant(nullPooled, 0.995)));

    console.log(`  C = ${C} columns, ${C * (C - 1) / 2} pairs.  Route 3 critical |pooled mean r1| > ${crit.toFixed(5)} at alpha ${A}`);
    console.log('  ' + 'rho'.padEnd(7) + 'mean r1'.padEnd(10) + 'R2'.padEnd(9) + 'R3'.padEnd(9) + 'R4'.padEnd(9) +
                'R2 or R4'.padEnd(11) + 'both at a/2'.padEnd(13) + 'scale mean'.padEnd(12) + 'scale sd');
    console.log('  ' + '-'.repeat(96));
    for (const rho of RHOS) {
      const nrm = _normal(mulberry32(0xBEEF + C * 7919 + Math.round(rho * 1000)));
      const rnd = mulberry32(0xC0FFEE + C * 104729 + Math.round(rho * 1000));
      let r2 = 0, r3 = 0, r4 = 0, un = 0, unH = 0, ran = 0, rAcc = 0, rN = 0;
      const infls = [];
      for (let run = 0; run < RUNS; run++) {
        const m = build(rho, nrm);
        const q = fam(m);
        if (!q) continue;
        const sc = scale(m, PIN, rnd);
        if (!sc) continue;
        ran++;
        infls.push(sc.infl);
        rAcc += q.m * q.k; rN += q.k;
        const p4 = twoSided(q.m / (q.se * sc.infl), q.k - 1);
        const h2 = q.minAdj < A, h3 = Math.abs(q.m) > crit, h4 = p4 < A;
        if (h2) r2++;
        if (h3) r3++;
        if (h4) r4++;
        if (h2 || h4) un++;
        if (q.minAdj < AH || p4 < AH) unH++;
      }
      const p = (x) => `${(100 * x / ran).toFixed(1)}%`;
      console.log('  ' + rho.toFixed(2).padEnd(7) + (rAcc / rN).toFixed(4).padEnd(10) +
        p(r2).padEnd(9) + p(r3).padEnd(9) + p(r4).padEnd(9) + p(un).padEnd(11) + p(unH).padEnd(13) +
        mean(infls).toFixed(3).padEnd(12) + sd(infls).toFixed(3));
    }
    console.log('');
  }
  process.exit(0);
}

// ── Part 3b: how few shuffles the scale estimate tolerates (--r4pin) ───────
// A scale is a cheaper thing to estimate than a tail quantile. If 50 shuffles
// work as well as 100 the cost halves again. Shuffles are drawn once per dataset
// and the estimate is taken from nested prefixes, which is the same thing as
// independent draws per count and a quarter of the cost.
//
// PASS CONDITION. A shuffle count is adequate if its detection rate is within
// 2 points of the largest count's rate at every effect size measured AND its
// rho=0 rate stays at or under 2%.
if (process.argv.includes('--r4pin')) {
  const { fam, scale, inflFrom, twoSided } = _R4;
  const RUNS = Number(process.env.RUNS) || 400;
  const N = Number(process.env.N) || 200;
  const PINS = (process.env.PINS || '10,25,50,100,200,400').split(',').map(Number);
  const MAXPIN = Math.max(...PINS);
  const CS = (process.env.CS || '8,18').split(',').map(Number);
  const RHOS = (process.env.RHOS || '0,0.08,0.10,0.14').split(',').map(Number);
  const A = 0.01;
  console.log(`### Part 3b — scale-estimate stability. N=${N}, ${RUNS} runs per cell, prefixes of ${MAXPIN} shuffles.\n`);
  for (const C of CS) {
    const build = (rho, nrm) => _colsToMatrix(Array.from({ length: C }, () => _arCol(N, rho, nrm)));
    console.log(`  C = ${C} columns, ${C * (C - 1) / 2} pairs.   detection rate at each shuffle count | sd of the scale estimate`);
    console.log('  ' + 'rho'.padEnd(7) + PINS.map(p => `P=${p}`.padEnd(9)).join('') + '| ' + PINS.map(p => `P=${p}`.padEnd(9)).join(''));
    console.log('  ' + '-'.repeat(11 + 18 * PINS.length));
    for (const rho of RHOS) {
      const nrm = _normal(mulberry32(0x5A11 + C * 7919 + Math.round(rho * 1000)));
      const rnd = mulberry32(0x1234 + C * 104729 + Math.round(rho * 1000));
      const hit = PINS.map(() => 0);
      const inf = PINS.map(() => []);
      let ran = 0;
      for (let run = 0; run < RUNS; run++) {
        const m = build(rho, nrm);
        const q = fam(m);
        if (!q) continue;
        const sc = scale(m, MAXPIN, rnd);
        if (!sc) continue;
        ran++;
        PINS.forEach((pin, i) => {
          const infl = inflFrom(sc.ms, sc.ses, pin);
          if (infl == null) return;
          inf[i].push(infl);
          if (twoSided(q.m / (q.se * infl), q.k - 1) < A) hit[i]++;
        });
      }
      console.log('  ' + rho.toFixed(2).padEnd(7) +
        hit.map(h => `${(100 * h / ran).toFixed(1)}%`.padEnd(9)).join('') + '| ' +
        inf.map(v => sd(v).toFixed(3).padEnd(9)).join(''));
    }
    console.log('');
  }
  process.exit(0);
}

// ── Part 2b: the combination's false-positive rate on the anchors (--r4anchors)
// Row shuffle on DS17 clean, DS02 and DS20, so the number is comparable with
// every other calibration figure taken against these three files. Route 4's
// scale is re-estimated from scratch on every shuffled dataset, so the
// estimation noise in the scale sits inside the measured rate rather than being
// assumed away.
//
// Both routes go through the shipped dispatch shape: aggregatePerGroup on
// column-grouped fixtures with two or more conditions, a single pooled call
// otherwise. Route 4 substitutes the corrected p as each group's primaryP and
// lets the real Fisher combination do the rest.
//
// TWO FIRE CRITERIA, both reported. The flag criterion is the shipped one —
// the dispatch's own flag reaching MODERATE. On the aggregate path that flag is
// max(Fisher flag, worst group flag) and the worst group flag can be promoted by
// evidence no single p carries, so there is no one scalar behind it and half
// alpha is not defined on it. The p criterion reduces each route to one scalar —
// primaryP on the pooled path, min(fisherP, worst group primaryP) on the
// aggregate path — which half alpha does apply to. Both are shown at full alpha
// so the gap between the two criteria is visible, not hidden inside the
// half-alpha column.
//
// PASS CONDITION. The union is acceptable if its MODERATE-or-higher rate stays
// at or under 2% on all three files. Report the inflation over Route 2 alone
// either way.
if (process.argv.includes('--r4anchors')) {
  const { fam, scale, twoSided, flagFromP, EFFECT_SIZE } = _R4;
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const PCAL = Number(process.env.PCAL) || 1000;
  const PIN = Number(process.env.PIN) || 100;
  const FILES = (process.env.FILES || '17-densitometry-carlisle-clean.csv,02-densitometry-fabricated.csv,20-bimodal-fab.csv').split(',');
  const A = 0.01, AH = 0.005;
  const RANK = { 'N/A': 0, LOW: 1, MODERATE: 2, HIGH: 3 };

  console.log(`### Part 2b — false positives under the row shuffle. ${PCAL} shuffles, scale re-estimated from ${PIN} shuffles each.\n`);
  console.log('  ' + 'fixture'.padEnd(42) + 'route'.padEnd(8) +
              'R2 flag'.padEnd(9) + 'R4 flag'.padEnd(9) + 'union flag'.padEnd(12) +
              'R2 p<a'.padEnd(9) + 'R4 p<a'.padEnd(9) + 'union p<a'.padEnd(11) + 'union a/2'.padEnd(11) +
              'scale'.padEnd(8) + 'cost');
  console.log('  ' + '-'.repeat(128));

  for (const file of FILES) {
    const { matrix, condCtx } = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const vst = detectVST(matrix, assay);
    const eff = applyVST(matrix, vst?.transform || 'raw') || matrix;
    const useAgg = condCtx.type === 'column-grouped' && condCtx.count >= 2;
    const infls = [];
    let seed = 0x5EED;

    // Route 4 as a testFn: same result object, primaryP and flag replaced by the
    // SE-corrected pooled p. The shipped effect-size gate reads the pooled mean,
    // which IS Route 4's statistic, so it is carried across unchanged.
    const r4fn = (m, cc) => {
      const base = testAutocorrelation(m, cc);
      if (base.flag === 'N/A') return base;
      const q = fam(m);
      if (!q) return base;
      const sc = scale(m, PIN, mulberry32(seed++));
      if (!sc) return base;
      infls.push(sc.infl);
      const p4 = twoSided(q.m / (q.se * sc.infl), q.k - 1);
      const gate = m.length >= 500 && Math.abs(q.m) < EFFECT_SIZE.AUTOCORR_STRONG;
      const pf = gate ? 1 : p4;
      return { ...base, primaryP: pf, flag: flagFromP(pf) };
    };
    // One deciding scalar per route. fisherP is stored at 4dp and floors at
    // 0.0000, which the shipped flag path reads the same way.
    const decide = (res) => {
      if (!useAgg) return num(res.primaryP);
      const fp = num(res.fisherP), pp = num(res.primaryP);
      return Math.min(Number.isFinite(fp) ? fp : 1, Number.isFinite(pp) ? pp : 1);
    };

    const rnd = mulberry32(0xC0FFEE);
    let f2 = 0, f4 = 0, fu = 0, d2c = 0, d4c = 0, duc = 0, dhc = 0, ran = 0;
    const t0 = Date.now();
    for (let k = 0; k < PCAL; k++) {
      const perm = permutation(eff.length, rnd);
      const m = perm.map(i => eff[i]);
      const ctx = condCtx.withMatrix(m);
      const r2res = useAgg ? await aggregatePerGroup(testAutocorrelation, ctx.slices(), null)
                           : testAutocorrelation(m, null);
      if (r2res.flag === 'N/A') continue;
      const r4res = useAgg ? await aggregatePerGroup(r4fn, ctx.slices(), null) : r4fn(m, null);
      if (r4res.flag === 'N/A') continue;
      ran++;
      const hit2 = RANK[r2res.flag] >= 2, hit4 = RANK[r4res.flag] >= 2;
      if (hit2) f2++;
      if (hit4) f4++;
      if (hit2 || hit4) fu++;
      const d2 = decide(r2res), d4 = decide(r4res);
      if (d2 < A) d2c++;
      if (d4 < A) d4c++;
      if (d2 < A || d4 < A) duc++;
      if (d2 < AH || d4 < AH) dhc++;
    }
    const secs = (Date.now() - t0) / 1000;
    const p = (x) => `${(100 * x / ran).toFixed(1)}%`;
    console.log('  ' + file.padEnd(42) + (useAgg ? 'fisher' : 'pooled').padEnd(8) +
      p(f2).padEnd(9) + p(f4).padEnd(9) + p(fu).padEnd(12) +
      p(d2c).padEnd(9) + p(d4c).padEnd(9) + p(duc).padEnd(11) + p(dhc).padEnd(11) +
      mean(infls).toFixed(2).padEnd(8) + `${secs.toFixed(0)}s`);
  }
  process.exit(0);
}

// ── Where Route 4's excess false positives come from (--r4diag) ───────────
// --r4anchors measures Route 4 at 5.4% on DS17 clean against a nominal 1%. A
// rate that far off is not usable as a power figure until it is attributed, so
// this measures Route 4 at three scopes on the same shuffles and adds a
// bias-corrected variant at each.
//
// SCOPES. Whole matrix, one pooled test over every pair. Per group, one pooled
// test per condition slice with no Fisher layer, counted over (shuffle x group).
// Aggregate, the real per-condition dispatch with the real Fisher combination —
// the figure --r4anchors reports.
//
// THE BIAS VARIANT. Route 4 rescales the standard error and leaves the pooled
// mean alone, so the lag-1 estimator's -1/n shift stays in the numerator. The
// centred variant subtracts the shuffled null's own mean before dividing, which
// removes that shift using numbers the scale estimate has already paid for. If
// the centred rate lands at nominal, the excess is the bias; if it does not, the
// excess is the scale estimate or the Fisher layer.
if (process.argv.includes('--r4diag')) {
  const { fam, scale, twoSided, flagFromP, EFFECT_SIZE } = _R4;
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const { chiSquaredP } = await import(B + 'src/stats/primitives.js');
  const PCAL = Number(process.env.PCAL) || 500;
  const PIN = Number(process.env.PIN) || 100;
  const FILES = (process.env.FILES || '17-densitometry-carlisle-clean.csv,02-densitometry-fabricated.csv,20-bimodal-fab.csv').split(',');
  const A = 0.01;

  console.log(`### Route 4's false positives, attributed. ${PCAL} row shuffles, scale from ${PIN} shuffles each.\n`);
  console.log('  ' + 'fixture'.padEnd(38) + 'scope'.padEnd(14) + 'units'.padEnd(8) + 'rows'.padEnd(7) +
              'pairs'.padEnd(7) + 'as-is'.padEnd(9) + 'centred'.padEnd(9) + 'null mean'.padEnd(12) + '-1/n'.padEnd(10) + 'channel split');
  console.log('  ' + '-'.repeat(120));

  for (const file of FILES) {
    const { matrix, condCtx } = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const vst = detectVST(matrix, assay);
    const eff = applyVST(matrix, vst?.transform || 'raw') || matrix;
    const useAgg = condCtx.type === 'column-grouped' && condCtx.count >= 2;

    const one = (m, rnd) => {
      const q = fam(m);
      if (!q) return null;
      const sc = scale(m, PIN, rnd);
      if (!sc) return null;
      const nullMean = mean(sc.ms);
      return {
        p: twoSided(q.m / (q.se * sc.infl), q.k - 1),
        pc: twoSided((q.m - nullMean) / (q.se * sc.infl), q.k - 1),
        nullMean, k: q.k, rows: m.length,
      };
    };

    const rnd = mulberry32(0xC0FFEE);
    let seed = 0x5EED;
    let wA = 0, wAc = 0, wN = 0, wNull = 0, wRows = 0, wK = 0;
    let gA = 0, gAc = 0, gN = 0, gNull = 0, gRows = 0, gK = 0;
    let fA = 0, fAc = 0, fN = 0, fFish = 0, fWorst = 0;
    for (let it = 0; it < PCAL; it++) {
      const perm = permutation(eff.length, rnd);
      const m = perm.map(i => eff[i]);
      // whole matrix
      const w = one(m, mulberry32(seed++));
      if (w) { wN++; if (w.p < A) wA++; if (w.pc < A) wAc++; wNull += w.nullMean; wRows = w.rows; wK = w.k; }
      // per group, and Fisher over the same per-group values
      if (useAgg) {
        const slices = condCtx.withMatrix(m).slices();
        const ps = [], pcs = [];
        for (const g of slices) {
          const r = one(g.matrix, mulberry32(seed++));
          if (!r) continue;
          gN++; if (r.p < A) gA++; if (r.pc < A) gAc++; gNull += r.nullMean; gRows = r.rows; gK = r.k;
          ps.push(r.p); pcs.push(r.pc);
        }
        if (ps.length >= 2) {
          fN++;
          const fish = (arr) => chiSquaredP(-2 * arr.reduce((s, p) => s + Math.log(Math.max(p, 1e-300)), 0), 2 * arr.length);
          // The real aggregation's flag is max(Fisher flag, worst group flag). The
          // two channels are also counted separately, because a per-condition
          // dispatch gives every condition its own chance to fire whether or not
          // Fisher is in the picture — so "drop Fisher" is only a fix if the
          // worst-group channel alone lands at nominal.
          if (fish(ps) < A || Math.min(...ps) < A) fA++;
          if (fish(pcs) < A || Math.min(...pcs) < A) fAc++;
          if (fish(ps) < A) fFish++;
          if (Math.min(...ps) < A) fWorst++;
        }
      }
    }
    const p = (x, n) => `${(100 * x / n).toFixed(1)}%`;
    console.log('  ' + file.padEnd(38) + 'whole matrix'.padEnd(14) + String(wN).padEnd(8) + String(wRows).padEnd(7) +
      String(wK).padEnd(7) + p(wA, wN).padEnd(9) + p(wAc, wN).padEnd(9) +
      (wNull / wN).toFixed(5).padEnd(12) + (-1 / wRows).toFixed(5).padEnd(10) + '-');
    if (useAgg) {
      console.log('  ' + ''.padEnd(38) + 'per group'.padEnd(14) + String(gN).padEnd(8) + String(gRows).padEnd(7) +
        String(gK).padEnd(7) + p(gA, gN).padEnd(9) + p(gAc, gN).padEnd(9) +
        (gNull / gN).toFixed(5).padEnd(12) + (-1 / gRows).toFixed(5).padEnd(10) + '-');
      console.log('  ' + ''.padEnd(38) + 'aggregate'.padEnd(14) + String(fN).padEnd(8) + '-'.padEnd(7) +
        '-'.padEnd(7) + p(fA, fN).padEnd(9) + p(fAc, fN).padEnd(9) + '-'.padEnd(12) + '-'.padEnd(10) +
        `Fisher channel alone ${p(fFish, fN)}, worst-group channel alone ${p(fWorst, fN)}`);
    }
  }
  console.log(`\n  "units" is how many corrected p-values the rate is taken over: one per shuffle at whole-matrix`);
  console.log(`  and aggregate scope, one per shuffle per condition at group scope.`);
  console.log(`  The aggregate row reproduces the real rule, max(Fisher flag, worst group flag), on the same`);
  console.log(`  per-group p-values as the row above it. The channel split separates the two halves of that`);
  console.log(`  rule: a per-condition dispatch gives every condition its own chance to fire, so the`);
  console.log(`  worst-group channel alone already multiplies the per-group rate by roughly the condition`);
  console.log(`  count. Dropping Fisher is therefore only part of a fix, and the split says how much of one.`);
  process.exit(0);
}


// ── Part 3a: what the scale estimate costs (--r4cost) ─────────────────────
// The number that decides whether this ships: the per-dataset scale estimate
// against the full engine run on the same file. Measured on the widest fixtures,
// where the pair count is largest, and on the tallest.
//
// Runs Test is measured on the pooled-only family alone. Its Route 3 figure of
// 364 seconds timed the whole test including the internal window scan; the
// pooled-only figure was inferred, not measured. This measures it.
if (process.argv.includes('--r4cost')) {
  const { fam, runsFam, scale } = _R4;
  const { testRuns } = await import(B + 'src/tests/runs.js');
  const { createPRNG } = await import(B + 'src/stats/prng.js');
  const { runFullAnalysis } = await import(B + 'src/analysis/engine.js');
  const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const PIN = Number(process.env.PIN) || 100;
  const FILES = (process.env.FILES ||
    '16-densitometry-carlisle-overbalanced.csv,17-densitometry-carlisle-clean.csv,' +
    '01-densitometry-clean.csv,02-densitometry-fabricated.csv,20-bimodal-fab.csv,' +
    '21-localised-ar.csv,11-rnaseq-multicondition.csv').split(',');

  console.log(`### Part 3a — cost of the scale estimate, ${PIN} shuffles.\n`);
  // Faithfulness of the Runs pooled-only reconstruction, on a fixture.
  {
    const f = '20-bimodal-fab.csv';
    const { matrix } = readFixture(f);
    const eff = applyVST(matrix, detectVST(matrix, EXPECTED[f].assay)?.transform || 'raw') || matrix;
    const q = runsFam(eff), eng = testRuns(eff, null, createPRNG(matrix));
    const dM = Math.abs(q.m - Number(eng.pooledMeanZ));
    const dSE = Math.abs(q.se - Number(eng.pooledZSE));
    const dP = Math.abs(q.minAdj - Number(eng.minAdjP));
    const ok = dM < 5e-4 && dSE < 1e-12 && dP < 1e-12 && q.k === eng.nPairs;
    console.log(`  Runs pooled-only reconstruction vs testRuns on DS20: mean z delta ${dM.toExponential(1)} (stored at 3dp),` +
                ` SE delta ${dSE.toExponential(1)},`);
    console.log(`  minAdjP delta ${dP.toExponential(1)}, pairs ${q.k}/${eng.nPairs}` +
                ` -> ${ok ? 'MATCHES' : '*** MISMATCH — numbers below are untrustworthy ***'}\n`);
  }

  console.log('  ' + 'fixture'.padEnd(42) + 'rows'.padEnd(6) + 'cols'.padEnd(6) + 'pairs'.padEnd(7) +
              'scale autocorr'.padEnd(16) + 'scale runs'.padEnd(13) + 'full engine'.padEnd(14) + 'both scales as % of engine');
  console.log('  ' + '-'.repeat(122));
  for (const file of FILES) {
    const base = readFixture(file);
    const assay = EXPECTED[file]?.assay || 'general';
    const vst = detectVST(base.matrix, assay);
    const eff = applyVST(base.matrix, vst?.transform || 'raw') || base.matrix;
    const useAgg = base.condCtx.type === 'column-grouped' && base.condCtx.count >= 2;
    // Estimate on whatever matrices the shipped dispatch hands the test: the
    // per-condition slices where it aggregates, the whole matrix otherwise.
    const targets = useAgg ? base.condCtx.withMatrix(eff).slices().map(g => g.matrix) : [eff];

    const timeScale = (famFn) => {
      const t0 = Date.now();
      for (const m of targets) scale(m, PIN, mulberry32(0xC0FFEE), famFn);
      return (Date.now() - t0) / 1000;
    };
    const tA = timeScale(fam);
    const tR = timeScale(runsFam);

    const t0 = Date.now();
    await runFullAnalysis(base.matrix, base.rawMatrix, base.condCtx, assay, null, vst,
      { isPivoted: false }, ASSAY_DATATYPE_MAP[assay] || 'continuous', 'ordered');
    const tEng = (Date.now() - t0) / 1000;

    const nc = base.matrix[0].length;
    console.log('  ' + file.padEnd(42) + String(base.matrix.length).padEnd(6) + String(nc).padEnd(6) +
      String(nc * (nc - 1) / 2).padEnd(7) +
      `${tA.toFixed(3)}s`.padEnd(16) + `${tR.toFixed(3)}s`.padEnd(13) + `${tEng.toFixed(2)}s`.padEnd(14) +
      `${(100 * (tA + tR) / tEng).toFixed(2)}%`);
  }
  console.log(`\n  Autocorrelation's scale runs on its own dispatch shape (per condition where it aggregates);`);
  console.log(`  Runs' figure is the pooled-only family on the same matrices, its window scan excluded.`);
  process.exit(0);
}

// ── Part 4: Route 4 and the combination on all 27 fixtures (--r4fix) ──────
// What each returns, and whether any outcome tier moves. The tier is recomputed
// by substituting the Autocorrelation result's flag into the real
// computeSeverity, leaving every other result exactly as the engine produced it,
// so a moved tier is attributable to this one test.
//
// DS21 and DS22 are the ones to watch. Route 4 gave them LOW earlier, which is
// right because their Route 1 fires were artefacts of a broken null. If the
// combination resurrects either, the combination is not the corrected route it
// looks like.
if (process.argv.includes('--r4fix')) {
  const { fam, scale, twoSided, flagFromP, EFFECT_SIZE } = _R4;
  const { computeSeverity } = await import(B + 'src/analysis/severity.js');
  const { runFullAnalysis } = await import(B + 'src/analysis/engine.js');
  const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
  const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
  const PIN = Number(process.env.PIN) || 100;
  const RANK = { 'N/A': 0, LOW: 1, MODERATE: 2, HIGH: 3 };
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f]).sort();

  console.log(`### Part 4 — all fixtures. Scale from ${PIN} shuffles.\n`);
  console.log('  ' + 'fixture'.padEnd(42) + 'GT'.padEnd(4) + 'R2 shipped'.padEnd(12) + 'R2 p'.padEnd(11) +
              'R4 p'.padEnd(11) + 'R4'.padEnd(10) + 'union'.padEnd(10) + 'scale'.padEnd(8) +
              'tier R2'.padEnd(9) + 'tier union');
  console.log('  ' + '-'.repeat(126));
  const moved = [];
  for (const file of files) {
    const base = readFixture(file);
    const assay = EXPECTED[file].assay;
    const vst = detectVST(base.matrix, assay);
    const results = await runFullAnalysis(base.matrix, base.rawMatrix, base.condCtx, assay, null, vst,
      { isPivoted: false }, ASSAY_DATATYPE_MAP[assay] || 'continuous', 'ordered');
    const shipped = results.find(r => r.name === 'Autocorrelation');
    if (!shipped) continue;
    if (shipped.flag === 'N/A') {
      console.log('  ' + file.padEnd(42) + String(EXPECTED[file].severity).padEnd(4) + 'N/A');
      continue;
    }
    const eff = applyVST(base.matrix, vst?.transform || 'raw') || base.matrix;
    const useAgg = base.condCtx.type === 'column-grouped' && base.condCtx.count >= 2;
    let seed = 0xBEEF;
    const infls = [];
    const r4fn = (m, cc) => {
      const b = testAutocorrelation(m, cc);
      if (b.flag === 'N/A') return b;
      const q = fam(m);
      if (!q) return b;
      const sc = scale(m, PIN, mulberry32(seed++));
      if (!sc) return b;
      infls.push(sc.infl);
      const p4 = twoSided(q.m / (q.se * sc.infl), q.k - 1);
      const gate = m.length >= 500 && Math.abs(q.m) < EFFECT_SIZE.AUTOCORR_STRONG;
      const pf = gate ? 1 : p4;
      return { ...b, primaryP: pf, flag: flagFromP(pf) };
    };
    const r4res = useAgg
      ? await aggregatePerGroup(r4fn, base.condCtx.withMatrix(eff).slices(), null)
      : r4fn(eff, null);
    const combFlag = RANK[r4res.flag] > RANK[shipped.flag] ? r4res.flag : shipped.flag;

    const tierOf = (flag) => computeSeverity(results.map(r => r.name === 'Autocorrelation' ? { ...r, flag } : r)).severity;
    const tR2 = tierOf(shipped.flag), tC = tierOf(combFlag);
    if (tR2 !== tC) moved.push(`${file} ${tR2} -> ${tC}`);

    console.log('  ' + file.padEnd(42) + String(EXPECTED[file].severity).padEnd(4) +
      shipped.flag.padEnd(12) + num(shipped.primaryP).toPrecision(3).padEnd(11) +
      num(r4res.primaryP).toPrecision(3).padEnd(11) + r4res.flag.padEnd(10) +
      combFlag.padEnd(10) + (infls.length ? mean(infls).toFixed(2) : '-').padEnd(8) +
      String(tR2).padEnd(9) + String(tC));
  }
  console.log(`\n  Outcome tiers that move under the union: ${moved.length ? moved.join('; ') : 'none'}`);
  console.log(`  The tier R2 column is the engine's own severity with the shipped Autocorrelation flag, so it`);
  console.log(`  reproduces the batch's expected severity wherever Autocorrelation is not the sole driver.`);
  console.log(`  On the aggregate path the two p columns are the worst group's primaryP, while the flag beside`);
  console.log(`  them also carries the Fisher combination across conditions — read the flag, not the p, there.`);
  console.log(`  Route 4 needs at least two pairs, so it is undefined on the two-column vfs fixtures; those rows`);
  console.log(`  carry Route 2's own p unchanged and are not a Route 4 measurement.`);
  process.exit(0);
}

// ── Runs Test: the same sweep, if the scale estimate is affordable (--r4runs)
// Autocorrelation is the deliverable. Runs has the same blind spot in principle,
// so if its pooled-only scale estimate costs about what Autocorrelation's costs,
// the same power sweep runs. If it does not, --r4cost reports the number and
// this mode is not the answer — Runs then needs its own pass.
//
// Route 2 for Runs is the min per-pair BH-adjusted p, the same quantity its
// shipped verdict reads. The windowed permutation scan is excluded: it is a
// separate promotion channel with its own null, not part of the pooled-versus-
// per-pair question, and including it would confound the comparison.
//
// Route 3 here rejects outside the null's own 0.5th and 99.5th percentiles
// rather than on a symmetric critical value, because the Wald-Wolfowitz z has a
// small-sample negative bias and its null does not centre on zero.
if (process.argv.includes('--r4runs')) {
  const { runsFam, scale, twoSided } = _R4;
  const RUNS = Number(process.env.RUNS) || 600;
  const N = Number(process.env.N) || 200;
  const PIN = Number(process.env.PIN) || 100;
  const NULLSIM = Number(process.env.NULLSIM) || 10000;
  const CS = (process.env.CS || '8,18').split(',').map(Number);
  const RHOS = (process.env.RHOS || '0,0.06,0.08,0.10,0.14,0.18,0.25').split(',').map(Number);
  const A = 0.01, AH = 0.005;
  console.log(`### Runs Test — same construction, same effect sizes. N=${N}, ${RUNS} runs per cell,`);
  console.log(`    scale from ${PIN} shuffles, Route 3 percentiles from ${NULLSIM} null draws.\n`);
  for (const C of CS) {
    const build = (rho, nrm) => _colsToMatrix(Array.from({ length: C }, () => _arCol(N, rho, nrm)));
    const nrm0 = _normal(mulberry32(41 + C));
    const nullPooled = [];
    for (let i = 0; i < NULLSIM; i++) { const q = runsFam(build(0, nrm0)); if (q) nullPooled.push(q.m); }
    nullPooled.sort((a, b) => a - b);
    const lo = quant(nullPooled, 0.005), hi = quant(nullPooled, 0.995);
    console.log(`  C = ${C} columns, ${C * (C - 1) / 2} pairs.  Route 3 rejects pooled mean z outside ` +
                `[${lo.toFixed(4)}, ${hi.toFixed(4)}]  (null centres at ${mean(nullPooled).toFixed(4)}, not 0)`);
    console.log('  ' + 'rho'.padEnd(7) + 'mean z'.padEnd(11) + 'R2'.padEnd(9) + 'R3'.padEnd(9) + 'R4'.padEnd(9) +
                'R2 or R4'.padEnd(11) + 'both at a/2'.padEnd(13) + 'scale mean'.padEnd(12) + 'scale sd');
    console.log('  ' + '-'.repeat(96));
    for (const rho of RHOS) {
      const nrm = _normal(mulberry32(0xD00D + C * 7919 + Math.round(rho * 1000)));
      const rnd = mulberry32(0xFACE + C * 104729 + Math.round(rho * 1000));
      let r2 = 0, r3 = 0, r4 = 0, un = 0, unH = 0, ran = 0, zAcc = 0;
      const infls = [];
      for (let run = 0; run < RUNS; run++) {
        const m = build(rho, nrm);
        const q = runsFam(m);
        if (!q) continue;
        const sc = scale(m, PIN, rnd, runsFam);
        if (!sc) continue;
        ran++;
        infls.push(sc.infl);
        zAcc += q.m;
        const p4 = twoSided(q.m / (q.se * sc.infl), q.k - 1);
        const h2 = q.minAdj < A, h3 = q.m < lo || q.m > hi, h4 = p4 < A;
        if (h2) r2++;
        if (h3) r3++;
        if (h4) r4++;
        if (h2 || h4) un++;
        if (q.minAdj < AH || p4 < AH) unH++;
      }
      const p = (x) => `${(100 * x / ran).toFixed(1)}%`;
      console.log('  ' + rho.toFixed(2).padEnd(7) + (zAcc / ran).toFixed(4).padEnd(11) +
        p(r2).padEnd(9) + p(r3).padEnd(9) + p(r4).padEnd(9) + p(un).padEnd(11) + p(unH).padEnd(13) +
        mean(infls).toFixed(3).padEnd(12) + sd(infls).toFixed(3));
    }
    console.log('');
  }
  process.exit(0);
}


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

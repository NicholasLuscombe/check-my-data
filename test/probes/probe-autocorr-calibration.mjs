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
  console.log('  ' + 'fixture'.padEnd(36) + 'rows'.padEnd(7) + 'pairs'.padEnd(8) +
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
    console.log('  ' + file.padEnd(36) + String(n).padEnd(7) + String(nPairs).padEnd(8) +
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

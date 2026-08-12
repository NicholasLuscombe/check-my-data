/* S369 Dispatch B — per-arm capture for LOESS, per-lag capture for Autocorrelation.
   ------------------------------------------------------------------------
   Tests the predictions in docs/shared/S369-prereg-loess-per-arm.md, committed
   at b503c28 / e1c1d41 before any per-arm draw was read.

   SAME DRAWS AS THE SESSION'S MEDIAN AND MARGINAL FIGURES. Those came from
   `probe-s369-null-correlation.mjs --measure` at DRAWS=4000. Its per-fixture
   draw sequence is:
       const rnd = mulberry32(0x369B0 + fx.file.length);
       for (let d = 0; d < N; d++) { const perm = permutation(base.matrix.length, rnd); ... }
   `rnd` is consumed by `permutation` and by nothing else — the tests draw from
   their own per-test streams via `createPRNGFactory(matrix)`, keyed on the
   dispatch name and memoised per identifier (S340). So the permutation sequence
   depends only on the seed and the number of draws, NOT on which callers run,
   and running two of the four callers here reproduces the same matrices and the
   same LOESS stream. The reproduction is checked rather than asserted: `--report`
   prints the per-group marginals beside the values the 4,000-draw run recorded.

   WHAT IS CAPTURED, AND WHAT NEEDED A HOOK. LOESS already publishes `scanP`,
   `cusumP`, `nPerm`, `primaryP` (= `finalPrimaryP`) and the `pairResults` array.
   Only `pairBestAdjP` and `pairCount` are added, by the extended
   `s369-arm-flags-hook.mjs`. Autocorrelation needed nothing: `nPairs` is
   published and is the same number that gates every member of the lag family,
   so it determines computed-or-literal for all five without any capture.

   Usage:
     node --import ./test/probes/s369-arm-flags-hook.mjs \
          test/probes/probe-s369-per-arm.mjs --hookinert
     DRAWS=4000 node --import ./test/probes/s369-arm-flags-hook.mjs \
          test/probes/probe-s369-per-arm.mjs --capture
     node test/probes/probe-s369-per-arm.mjs --report
*/
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const B = new URL('../../', import.meta.url).pathname;

// Same scheduling stand-in as the rest of the S369 probes, and inert for the
// same reason: `tick()` in aggregation.js chains two setTimeout(0) calls per
// group and Node clamps each to 1 ms.
globalThis.requestAnimationFrame = (cb) => {
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (f) => { f(); return 0; };
  try { cb(); } finally { globalThis.setTimeout = realSetTimeout; }
  return 0;
};

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import(B + 'src/analysis/engine.js');
const { aggregatePerGroup } = await import(B + 'src/analysis/aggregation.js');
const { detectVST } = await import(B + 'src/stats/vst.js');
const { inferRoles } = await import(B + 'src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(B + 'src/import/parser.js');
const { createPRNGFactory } = await import(B + 'src/stats/prng.js');
const { ALPHA } = await import(B + 'src/constants/thresholds.js');
const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');
const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
const { testLoessResidual } = await import(B + 'src/tests/loessResidual.js');

const FIX = join(B, 'test/fixtures');
const OUT = join(B, 'test/probes/out-s369');
const LOESS_CSV = join(OUT, 'loess-per-arm.csv');
const ACF_CSV = join(OUT, 'autocorr-per-lag.csv');
const HOOKED = globalThis.__S369_PATCH?.loessApplied === 1;

function readCsv(text) {
  const raw = preprocessRaw(Papa.default.parse(text, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  return extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
}
const readFixture = (f) => readCsv(readFileSync(join(FIX, f), 'utf-8'));
const shortName = (f) => f.split('-')[0];

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
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}

// The two callers, assembled to mirror engine.js:626 and :662 — both runPairVST
// with no parent context, so the groups come from the VST context and the third
// argument to aggregatePerGroup is null.
function buildDispatch(base, assay, matrix, condCtx) {
  const vst = detectVST(base.matrix, assay);
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') vstMatrix = matrix.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = matrix.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vstMatrix !== null;
  const vstCondCtx = hasVST ? condCtx.withMatrix(vstMatrix) : null;
  const rngFor = createPRNGFactory(matrix);
  const groups = (hasVST ? vstCondCtx : condCtx).slices();

  async function run(name) {
    const inner = name === 'Autocorrelation'
      ? testAutocorrelation
      : (m) => testLoessResidual(m, rngFor('LOESS Residual Analysis'));
    const per = [];
    const wrapped = (m, ctx) => { const r = inner(m, ctx); per.push(r); return r; };
    const agg = await aggregatePerGroup(wrapped, groups, null);
    return { agg, per, groups };
  }
  return { run, groups };
}

const columnGrouped = () => Object.keys(EXPECTED).filter(f => f.endsWith('.csv')).sort()
  .map(f => ({ file: f, assay: EXPECTED[f].assay, base: readFixture(f) }))
  .filter(x => x.base.condCtx.type === 'column-grouped' && x.base.condCtx.count >= 2);

const arg = (f) => process.argv.includes(f);
const e17 = (v) => (v == null || !isFinite(v) ? '' : v.toExponential(17));

// ── --hookinert: the added properties move no shipped number ──────────────
if (arg('--hookinert')) {
  const out = [];
  for (const fx of columnGrouped()) {
    const d = buildDispatch(fx.base, fx.assay, fx.base.matrix, fx.base.condCtx);
    for (const name of ['Autocorrelation', 'LOESS Residual Analysis']) {
      const { agg, per } = await d.run(name);
      per.forEach((r, i) => out.push([fx.file, name, i, r.flag, e17(r.primaryP),
        e17(r.scanP), e17(r.cusumP), r.nPerm, r.nPairs, r.nValidRows,
        (r.lagTable || []).map(l => e17(l.rawP)).join('~'),
        (r.pairResults || []).map(p => e17(p.adjP)).join('~'),
        e17(agg.__s369?.fisherPExact)].join('|')));
    }
  }
  console.log(out.join('\n'));
  process.exit(0);
}

// ── --capture ─────────────────────────────────────────────────────────────
if (arg('--capture')) {
  if (!HOOKED) { console.log('Needs the hook: --import ./test/probes/s369-arm-flags-hook.mjs'); process.exit(1); }
  const N = Number(process.env.DRAWS) || 4000;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(LOESS_CSV, 'fixture,group,groupName,draw,nValidRows,nPerm,scanP,cusumP,pairBestAdjP,finalPrimaryP,pairResultsLength,pairCount,nCols,flag\n');
  writeFileSync(ACF_CSV, 'fixture,group,groupName,draw,nPairs,primaryP,lag1RawP,lag2RawP,lag3RawP,lag4RawP,lag5RawP,nComputed,flag\n');

  let p1Fail = 0; const p1Examples = [];
  const t0 = Date.now();

  for (const fx of columnGrouped()) {
    const rnd = mulberry32(0x369B0 + fx.file.length);   // same seed as --measure
    let lBuf = [], aBuf = [];
    for (let d = 0; d < N; d++) {
      const perm = permutation(fx.base.matrix.length, rnd);   // one draw per replicate
      const m = perm.map(i => fx.base.matrix[i]);
      const ctx = fx.base.condCtx.withMatrix(m);
      const disp = buildDispatch(fx.base, fx.assay, m, ctx);

      const L = await disp.run('LOESS Residual Analysis');
      L.per.forEach((r, gi) => {
        const h = r.__s369loess || {};
        const scanP = r.scanP, cusumP = r.cusumP, pb = h.pairBestAdjP, fp = r.primaryP;
        // STEP 2 — P1, on every group x fixture x draw.
        if ([scanP, cusumP, pb, fp].every(v => typeof v === 'number' && isFinite(v))) {
          const mn = Math.min(scanP, cusumP, pb);
          if (mn !== fp) {
            p1Fail++;
            if (p1Examples.length < 12) p1Examples.push({ fixture: fx.file, group: gi + 1, draw: d,
              scanP, cusumP, pairBestAdjP: pb, finalPrimaryP: fp, min: mn, delta: mn - fp });
          }
        } else { p1Fail++; if (p1Examples.length < 12) p1Examples.push({ fixture: fx.file, group: gi + 1, draw: d, nonFinite: { scanP, cusumP, pairBestAdjP: pb, finalPrimaryP: fp }, flag: r.flag }); }
        lBuf.push([shortName(fx.file), gi + 1, L.groups[gi].name, d, r.nValidRows, r.nPerm,
          e17(scanP), e17(cusumP), e17(pb), e17(fp), h.pairResultsLength ?? '', h.pairCount ?? '',
          L.groups[gi].matrix[0]?.length ?? '', r.flag].join(','));
      });

      const A = await disp.run('Autocorrelation');
      A.per.forEach((r, gi) => {
        const lt = r.lagTable || [];
        // nPairs gates every member of the lag family: allR1 (:51), each allRk[k]
        // (:52) and res (:53) are pushed once per surviving pair in one block, so
        // their lengths are equal. `:63` and `:137` both test that length >= 2.
        const nComputed = (r.nPairs ?? 0) >= 2 ? 5 : 0;
        aBuf.push([shortName(fx.file), gi + 1, A.groups[gi].name, d, r.nPairs ?? '', e17(r.primaryP),
          ...[0, 1, 2, 3, 4].map(i => e17(lt[i]?.rawP)), nComputed, r.flag].join(','));
      });

      if (lBuf.length >= 3000) { appendFileSync(LOESS_CSV, lBuf.join('\n') + '\n'); lBuf = []; }
      if (aBuf.length >= 3000) { appendFileSync(ACF_CSV, aBuf.join('\n') + '\n'); aBuf = []; }
    }
    if (lBuf.length) appendFileSync(LOESS_CSV, lBuf.join('\n') + '\n');
    if (aBuf.length) appendFileSync(ACF_CSV, aBuf.join('\n') + '\n');
    console.log(`  ${fx.file}: ${N} draws, ${((Date.now() - t0) / 1000).toFixed(0)}s cumulative`);
  }

  console.log(`\n### STEP 2 — P1: min(scanP, cusumP, pairBestAdjP) === finalPrimaryP`);
  if (p1Fail === 0) {
    console.log(`  HOLDS on every group x fixture x draw. 0 failures.`);
  } else {
    console.log(`  *** P1 FAILED on ${p1Fail} group-draws. First ${p1Examples.length}: ***`);
    for (const e of p1Examples) console.log('  ' + JSON.stringify(e));
    console.log(`  P2-P4 are void. Stopping.`);
  }
  console.log(`  wall clock ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  written ${LOESS_CSV}`);
  console.log(`  written ${ACF_CSV}`);
  process.exit(p1Fail ? 2 : 0);
}

// ── --report ──────────────────────────────────────────────────────────────
if (arg('--report')) {
  const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const rate = (a, t) => a.filter(v => v < t).length / a.length;
  const se = (r, n) => Math.sqrt(r * (1 - r) / n);
  // k_eff from the tail: a minimum of k independent uniforms has P(min < a) = 1-(1-a)^k.
  const kTail = (m, a) => (m <= 0 ? 0 : Math.log(1 - m) / Math.log(1 - a));
  // k_eff from the median: median of a minimum of k independent uniforms is 1 - 2^(-1/k).
  const kMed = (M) => (M <= 0 || M >= 1 ? null : Math.LN2 / -Math.log(1 - M));
  const fmtK = (k) => (k == null || !isFinite(k) ? '—' : k.toFixed(3));

  const rows = readFileSync(LOESS_CSV, 'utf-8').trim().split('\n');
  const head = rows[0].split(',');
  const L = rows.slice(1).map(r => { const c = r.split(','); const o = {}; head.forEach((h, i) => { o[h] = c[i]; }); return o; });
  const num = (o, k) => parseFloat(o[k]);

  const ARMS = [['scanP', 'scanP'], ['cusumP', 'cusumP'], ['pairBestAdjP', 'pairBestAdjP'], ['finalPrimaryP', 'joint minimum']];
  const fixtures = [...new Set(L.map(r => r.fixture))].sort();

  console.log(`### STEP 3 — LOESS per-arm readout. ${L.length} group-draws. ALPHA.NOTE = ${ALPHA.NOTE}.\n`);
  console.log(`  k_eff(tail)  = ln(1-marginal)/ln(1-ALPHA.NOTE)`);
  console.log(`  k_eff(median)= ln2 / -ln(1-median), inverting median = 1 - 2^(-1/k)\n`);

  for (const scope of ['PER FIXTURE', 'POOLED']) {
    console.log(`## ${scope}`);
    console.log('  ' + 'set'.padEnd(10) + 'arm'.padEnd(16) + 'n'.padEnd(9) +
      'marginal@NOTE'.padEnd(20) + 'k_eff(tail)'.padEnd(13) + 'median'.padEnd(12) + 'k_eff(median)');
    const sets = scope === 'POOLED' ? [['all', L]] : fixtures.map(f => [f, L.filter(r => r.fixture === f)]);
    for (const [label, set] of sets) {
      for (const [key, name] of ARMS) {
        const v = set.map(r => num(r, key)).filter(x => isFinite(x));
        const m = rate(v, ALPHA.NOTE), M = med(v);
        console.log('  ' + label.padEnd(10) + name.padEnd(16) + String(v.length).padEnd(9) +
          `${(100 * m).toFixed(3)}%(${(100 * se(m, v.length)).toFixed(3)})`.padEnd(20) +
          fmtK(kTail(m, ALPHA.NOTE)).padEnd(13) + (M == null ? '—' : M.toFixed(6)).padEnd(12) + fmtK(kMed(M)));
      }
      console.log('');
    }
  }

  console.log(`## pairResults.length — full distribution`);
  const dist = new Map();
  for (const r of L) { const k = r.pairResultsLength; dist.set(k, (dist.get(k) || 0) + 1); }
  const keys = [...dist.keys()].sort((a, b) => Number(a) - Number(b));
  console.log('  ' + 'value'.padEnd(9) + 'count'.padEnd(11) + 'share');
  for (const k of keys) console.log('  ' + String(k).padEnd(9) + String(dist.get(k)).padEnd(11) + `${(100 * dist.get(k) / L.length).toFixed(3)}%`);
  const modal = keys.reduce((a, b) => (dist.get(b) > dist.get(a) ? b : a));
  console.log(`  modal value: ${modal}`);
  console.log(`\n  per fixture:`);
  console.log('  ' + 'fixture'.padEnd(10) + 'nCols'.padEnd(8) + 'nValidRows'.padEnd(12) + 'nPerm'.padEnd(8) + 'pairCount set'.padEnd(16) + 'pairResultsLength set');
  for (const f of fixtures) {
    const s = L.filter(r => r.fixture === f);
    console.log('  ' + f.padEnd(10) + [...new Set(s.map(r => r.nCols))].join('/').padEnd(8) +
      [...new Set(s.map(r => r.nValidRows))].join('/').slice(0, 11).padEnd(12) +
      [...new Set(s.map(r => r.nPerm))].join('/').padEnd(8) +
      [...new Set(s.map(r => r.pairCount))].sort().join('/').padEnd(16) +
      [...new Set(s.map(r => r.pairResultsLength))].sort().join('/'));
  }

  console.log(`\n  per-group joint-minimum marginals, for comparison with the 4,000-draw --measure run:`);
  console.log('  ' + 'fixture'.padEnd(10) + 'group'.padEnd(8) + 'marginal@NOTE'.padEnd(16) + 'median');
  for (const f of fixtures) for (const g of ['1', '2', '3']) {
    const v = L.filter(r => r.fixture === f && r.group === g).map(r => num(r, 'finalPrimaryP')).filter(isFinite);
    if (!v.length) continue;
    console.log('  ' + f.padEnd(10) + g.padEnd(8) + `${(100 * rate(v, ALPHA.NOTE)).toFixed(3)}%`.padEnd(16) + med(v).toFixed(6));
  }

  // ── STEP 4 ──
  const arows = readFileSync(ACF_CSV, 'utf-8').trim().split('\n');
  const ahead = arows[0].split(',');
  const A = arows.slice(1).map(r => { const c = r.split(','); const o = {}; ahead.forEach((h, i) => { o[h] = c[i]; }); return o; });

  console.log(`\n\n### STEP 4 — Autocorrelation per-lag readout. ${A.length} group-draws.\n`);
  console.log(`  Family: lagPooledPs = [pooled.p, lag2, lag3, lag4, lag5], m fixed at 5 (autocorrelation.js:133-142).`);
  console.log(`  Member 0 is the literal 1 when allR1.length < 2 (:63); members 1-4 when vals.length < 2 (:137).`);
  console.log(`  All five lengths equal the published nPairs, so all five are computed or none is.\n`);

  console.log(`## computed-member counts per group-draw`);
  const cdist = new Map();
  for (const r of A) cdist.set(r.nComputed, (cdist.get(r.nComputed) || 0) + 1);
  console.log('  ' + 'computed members'.padEnd(20) + 'count'.padEnd(11) + 'share');
  for (const k of [...cdist.keys()].sort()) console.log('  ' + String(k).padEnd(20) + String(cdist.get(k)).padEnd(11) + `${(100 * cdist.get(k) / A.length).toFixed(3)}%`);
  console.log(`  nPairs distribution: ${[...new Set(A.map(r => r.nPairs))].sort((a, b) => a - b).join(', ')}`);

  for (const scope of ['PER FIXTURE', 'POOLED']) {
    console.log(`\n## ${scope} — per-lag marginal and median`);
    console.log('  ' + 'set'.padEnd(10) + 'member'.padEnd(14) + 'n'.padEnd(9) +
      'marginal@NOTE'.padEnd(20) + 'median'.padEnd(12) + 'literal-1 share');
    const asets = scope === 'POOLED' ? [['all', A]] : [...new Set(A.map(r => r.fixture))].sort().map(f => [f, A.filter(r => r.fixture === f)]);
    for (const [label, set] of asets) {
      for (const [i, name] of [[1, 'lag1 (pooled)'], [2, 'lag2'], [3, 'lag3'], [4, 'lag4'], [5, 'lag5']]) {
        const v = set.map(r => parseFloat(r[`lag${i}RawP`])).filter(x => isFinite(x));
        const ones = v.filter(x => x === 1).length;
        console.log('  ' + label.padEnd(10) + name.padEnd(14) + String(v.length).padEnd(9) +
          `${(100 * rate(v, ALPHA.NOTE)).toFixed(3)}%`.padEnd(20) + med(v).toFixed(6).padEnd(12) +
          `${(100 * ones / v.length).toFixed(3)}%`);
      }
      const pv = set.map(r => parseFloat(r.primaryP)).filter(isFinite);
      console.log('  ' + label.padEnd(10) + 'primaryP'.padEnd(14) + String(pv.length).padEnd(9) +
        `${(100 * rate(pv, ALPHA.NOTE)).toFixed(3)}%`.padEnd(20) + med(pv).toFixed(6).padEnd(12) + '—');
      console.log('');
    }
  }
  process.exit(0);
}

console.log('Pick a mode: --hookinert, --capture, --report');

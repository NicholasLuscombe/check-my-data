/* S369 Part 2 (P83) — what the shipped callers' group p-values actually do under
   a valid null, and what the aggregation layer does with them.
   ------------------------------------------------------------------------
   Part 1 measured the layer on p-values that were uniform by construction. That
   is a curve, not a rate. This measures the two things that turn it into a rate:
   how correlated the group p-values are on real fixtures, and how the marginals
   are calibrated before aggregation. The two are reported SEPARATELY and are
   never combined into one figure — Part 0 established that only one of the six
   Fisher-reaching callers publishes a continuous analytic p, so a single number
   mixing marginal calibration with dependence would not mean anything.

   NOTHING IS REIMPLEMENTED. The shipped `aggregatePerGroup` is called directly
   with each test's own function, assembled to mirror `engine.js` dispatch for
   dispatch. `--anchor` checks that replica against `runFullAnalysis` field by
   field before any measurement is trusted.

   HOW THE PER-GROUP p IS CAPTURED. The layer publishes the minimum group p and
   not the individual ones, so each test function is wrapped in a recorder that
   pushes `primaryP` on the way through and hands the SAME result object on. The
   layer still calls the test exactly once per group, so no extra draw is taken
   and no extra work is done. Re-calling the test to read its p would advance the
   memoised per-test PRNG stream and return a different number.

   THE NULL is the whole-matrix row permutation `probe-agg-layer.mjs` uses. On
   column-grouped data a group is a set of COLUMNS over all rows, so the
   permutation leaves group membership exactly intact and destroys row order.
   It is a valid null only for a test whose statistic moves under it, which is
   what `--inert` measures before anything is spent on the rest.

   Usage:
     node test/probes/probe-s369-null-correlation.mjs --fixtures
     node --import ./test/probes/s369-arm-flags-hook.mjs \
          test/probes/probe-s369-null-correlation.mjs --anchor
     node --import ./test/probes/s369-arm-flags-hook.mjs \
          test/probes/probe-s369-null-correlation.mjs --inert
     DRAWS=5000 node --import ./test/probes/s369-arm-flags-hook.mjs \
          test/probes/probe-s369-null-correlation.mjs --measure
*/
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const B = new URL('../../', import.meta.url).pathname;

// Same scheduling stand-in as Part 1, for the same reason: `tick()` in
// aggregation.js chains two setTimeout(0) calls per group and Node clamps each
// to 1 ms. S369_RAF=timer selects the conventional probe stand-in so `--anchor`
// can be run both ways and the shim's inertness measured on REAL test functions
// rather than inherited from Part 1's synthetic ones.
globalThis.requestAnimationFrame = process.env.S369_RAF === 'timer'
  ? (cb) => setTimeout(cb, 0)
  : (cb) => {
      const realSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (f) => { f(); return 0; };
      try { cb(); } finally { globalThis.setTimeout = realSetTimeout; }
      return 0;
    };

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import(B + 'src/analysis/engine.js');
const { aggregatePerGroup } = await import(B + 'src/analysis/aggregation.js');
const { detectVST } = await import(B + 'src/stats/vst.js');
const { inferRoles } = await import(B + 'src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(B + 'src/import/parser.js');
const { createPRNGFactory } = await import(B + 'src/stats/prng.js');
const { ALPHA, flagFromP, flagRankOf } = await import(B + 'src/constants/thresholds.js');
const { chiSquaredP } = await import(B + 'src/stats/primitives.js');
const { EXPECTED, ASSAY_DATATYPE_MAP } = await import(B + 'test/batch-fixtures.mjs');

const { testDuplicates } = await import(B + 'src/tests/duplicateDetection.js');
const { testAutocorrelation } = await import(B + 'src/tests/autocorrelation.js');
const { testRuns } = await import(B + 'src/tests/runs.js');
const { testLoessResidual } = await import(B + 'src/tests/loessResidual.js');
const { testSelectiveNoise } = await import(B + 'src/tests/selectiveNoise.js');
const { testRegionalNoise } = await import(B + 'src/tests/regionalNoise.js');

const FIX = join(B, 'test/fixtures');
const HOOKED = globalThis.__S369_PATCH?.applied === 1;
const num = (x) => (x == null ? NaN : (typeof x === 'number' ? x : parseFloat(x)));

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
const lineEnding = (f) => (readFileSync(join(FIX, f), 'utf-8').includes('\r\n') ? 'CRLF' : 'LF');

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

// ── the dispatch replica ──────────────────────────────────────────────────
// One entry per Fisher-reaching caller, assembled to mirror engine.js:
//   Exact Duplicate Detection  :442  runPair, full matrix as the raw argument
//   Autocorrelation            :626  runPairVST, no parent context
//   Runs Test                  :643  runPairVST, parent condCtx
//   LOESS Residual Analysis    :662  runPairVST, no parent context
//   Selective Noise            :678  runPairVST, parent condCtx
//   Regional Noise Homogeneity :685  runPairVST, no parent context
// runPairVST's own rule (engine.js:305-313): groups come from the VST context
// when a transform exists, and the parent passed through is `vstCondCtx` when
// the dispatch supplied one and null when it did not.
function buildDispatch(base, assay, matrix, condCtx) {
  const vst = detectVST(base.matrix, assay);
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') vstMatrix = matrix.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = matrix.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vstMatrix !== null;
  const vstCondCtx = hasVST ? condCtx.withMatrix(vstMatrix) : null;
  const rngFor = createPRNGFactory(matrix);

  const wrColGroup = new Int8Array(matrix[0]?.length || 0).fill(-1);
  condCtx.slices().forEach((s, gi) => {
    const ci = s.colIndices || s.matrixColIndices;
    if (ci) ci.forEach(c => { wrColGroup[c] = gi; });
  });

  const entries = [
    { name: 'Exact Duplicate Detection', vst: false, parent: false,
      make: () => (m) => testDuplicates(m, matrix, wrColGroup, assay) },
    { name: 'Autocorrelation', vst: true, parent: false,
      make: () => testAutocorrelation },
    { name: 'Runs Test', vst: true, parent: true,
      make: () => (m, childCtx) => testRuns(m, childCtx, rngFor('Runs Test')) },
    { name: 'LOESS Residual Analysis', vst: true, parent: false,
      make: () => (m) => testLoessResidual(m, rngFor('LOESS Residual Analysis')) },
    { name: 'Selective Noise Partitioning', vst: true, parent: true,
      make: () => (m, childCtx) => testSelectiveNoise(m, childCtx) },
    { name: 'Regional Noise Homogeneity', vst: true, parent: false,
      make: () => (m) => testRegionalNoise(m, rngFor('Regional Noise Homogeneity')) },
  ];

  // Run one caller through the shipped layer, capturing each group's own
  // primaryP on the way through.
  async function run(entry) {
    const useV = entry.vst && hasVST;
    const groups = (useV ? vstCondCtx : condCtx).slices();
    const parent = entry.parent ? (useV ? (vstCondCtx || condCtx) : condCtx) : null;
    const perGroup = [];
    const inner = entry.make();
    const wrapped = (m, ctx) => {
      const r = inner(m, ctx);
      // nPerm is published by the three callers that run a permutation loop and
      // is null on the analytic one, so the lattice read is measured per group
      // rather than derived from the source rule alone.
      perGroup.push({ p: r?.primaryP ?? null, flag: r?.flag ?? 'N/A', nPerm: r?.nPerm ?? null });
      return r;
    };
    const agg = await aggregatePerGroup(wrapped, groups, parent);
    return { agg, perGroup };
  }

  return { entries, run, vstType, hasVST,
           nGroups: condCtx.slices().length,
           nGroupsVST: hasVST ? vstCondCtx.slices().length : null };
}

const arg = (f) => process.argv.includes(f);

// Part A measured these two invariant under the whole-matrix row permutation:
// Exact Duplicate Detection at relative spread 0 on all twelve group cells, and
// Selective Noise Partitioning at 3.8e-14 to 9.2e-14, which is summation order.
// A null that cannot move a statistic cannot estimate anything about it, so they
// are excluded by default rather than reported as a rate of zero. SKIP= overrides.
const INVARIANT = ['Exact Duplicate Detection', 'Selective Noise Partitioning'];

// ── the probability-integral-transform arm ────────────────────────────────
// Fisher is a pure function of the group p-values, so the arm needs no stub
// result objects and no layer call. Each group's p is transformed through its
// OWN empirical null, built on one half of the draws and evaluated on the other
// so the transform is never fitted on the point it scores; both folds are used,
// so every draw gets a transformed value. The result is what the dependence
// alone does, with each caller's marginal calibration divided out.
//
// The transform is discrete by construction. With m training draws the value is
// k/(m+1), so the reachable rate at a threshold is floor(alpha*(m+1) - eps)/(m+1)
// rather than alpha exactly — the same lattice arithmetic P100 states for a
// permutation p. `pitNominal` returns it, and it is printed beside the rate.
function countLE(sortedA, x) {
  let lo = 0, hi = sortedA.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedA[mid] <= x) lo = mid + 1; else hi = mid; }
  return lo;
}
function pitNominal(alpha, m) {
  let k = Math.floor(alpha * (m + 1));
  if (k / (m + 1) >= alpha) k -= 1;          // strict `<`, so a coincident point is excluded
  return Math.max(0, k) / (m + 1);
}
function pitTransform(perGroupP) {
  const nG = perGroupP.length, N = perGroupP[0].length, half = Math.floor(N / 2);
  const out = perGroupP.map(() => new Array(N).fill(null));
  for (const [from, to] of [[[0, half], [half, N]], [[half, N], [0, half]]]) {
    for (let g = 0; g < nG; g++) {
      const train = perGroupP[g].slice(from[0], from[1]).filter(v => v != null && isFinite(v)).sort((a, b) => a - b);
      if (!train.length) continue;
      for (let d = to[0]; d < to[1]; d++) {
        const v = perGroupP[g][d];
        out[g][d] = (v == null || !isFinite(v)) ? null : (1 + countLE(train, v)) / (train.length + 1);
      }
    }
  }
  return { u: out, m: half };
}

function columnGroupedFixtures() {
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f]).sort();
  const out = [];
  for (const f of files) {
    const base = readFixture(f);
    const assay = EXPECTED[f].assay;
    const d = buildDispatch(base, assay, base.matrix, base.condCtx);
    // The group columns are reported only where a group is a COLUMN set, which
    // is the only shape `useAggregate` routes through the layer. `slices()`
    // answers for every context kind — row groups on a row-grouped file, one
    // "All data" slice on an ungrouped one — so printing it everywhere would
    // put three different quantities in one column.
    const isCol = base.condCtx.type === 'column-grouped';
    out.push({ file: f, assay, type: base.condCtx.type, count: base.condCtx.count,
      slices: isCol ? d.nGroups : null,
      slicesVST: isCol ? d.nGroupsVST : null, vst: d.vstType, ending: lineEnding(f),
      rows: base.matrix.length, cols: base.matrix[0]?.length ?? 0,
      useAggregate: base.condCtx.type === 'column-grouped' && base.condCtx.count >= 2 });
  }
  return out;
}

// ── --fixtures: re-measure the column-grouped set over all of them ────────
if (arg('--fixtures')) {
  const all = columnGroupedFixtures();
  console.log('### Every fixture with an EXPECTED entry, measured — not carried forward\n');
  console.log('  ' + 'fixture'.padEnd(44) + 'ending'.padEnd(8) + 'context'.padEnd(16) +
    'conds'.padEnd(7) + 'groups'.padEnd(8) + 'groups(VST)'.padEnd(13) + 'transform'.padEnd(11) + 'aggregates');
  console.log('  ' + '-'.repeat(120));
  for (const r of all) {
    console.log('  ' + r.file.padEnd(44) + r.ending.padEnd(8) + r.type.padEnd(16) +
      String(r.count).padEnd(7) + String(r.slices ?? '—').padEnd(8) +
      String(r.slicesVST ?? '—').padEnd(13) + r.vst.padEnd(11) + (r.useAggregate ? 'yes' : 'no'));
  }
  const cg = all.filter(r => r.useAggregate);
  console.log(`\n  ${cg.length} fixtures route the six Fisher-reaching callers through the layer:`);
  for (const r of cg) console.log(`    ${r.file}  ${r.slices} groups, ${r.rows} rows x ${r.cols} data columns, ${r.ending}`);
  process.exit(0);
}

// ── --anchor: is the dispatch replica faithful? ───────────────────────────
if (arg('--anchor')) {
  const cg = columnGroupedFixtures().filter(r => r.useAggregate);
  const FIELDS = ['flag', 'groupsAssessed', 'groupsFlagged', 'fisherChi', 'fisherDF', 'fisherP',
                  'worstGroupFlagRaw', 'groupMinP', 'groupMinPAdj', 'multiplicityCorrected'];
  console.log('### The dispatch replica against runFullAnalysis, field by field\n');
  console.log(`  Fields compared per cell: ${FIELDS.join(', ')}\n`);
  let ok = 0, bad = 0;
  for (const fx of cg) {
    const base = readFixture(fx.file);
    const vst = detectVST(base.matrix, fx.assay);
    const engine = await runFullAnalysis(base.matrix, base.rawMatrix, base.condCtx, fx.assay, null, vst,
      { isPivoted: false }, ASSAY_DATATYPE_MAP[fx.assay] || 'continuous', 'ordered');
    const d = buildDispatch(base, fx.assay, base.matrix, base.condCtx);
    for (const entry of d.entries) {
      const mine = (await d.run(entry)).agg;
      const theirs = engine.find(r => r.name === entry.name);
      const diffs = FIELDS.filter(k => String(theirs?.[k]) !== String(mine?.[k]));
      if (diffs.length) { bad++; console.log(`  MISMATCH ${fx.file} / ${entry.name}: ${diffs.map(k => `${k} ${theirs?.[k]} vs ${mine?.[k]}`).join('; ')}`); }
      else ok++;
    }
    console.log(`  ${fx.file.padEnd(44)} 6 callers checked`);
  }
  console.log(`\n  ${ok} cells identical, ${bad} mismatched.`);
  process.exit(bad ? 1 : 0);
}

// ── --inert: does each caller's p move under the null at all? ─────────────
if (arg('--inert')) {
  const N = Number(process.env.DRAWS) || 10;
  const cg = columnGroupedFixtures().filter(r => r.useAggregate);
  console.log(`### Does each caller's per-group p move under the whole-matrix row permutation?`);
  console.log(`    Original matrix plus ${N} permuted ones. "distinct" counts distinct per-group p across all ${N + 1} runs.\n`);
  const verdict = new Map();
  for (const fx of cg) {
    const base = readFixture(fx.file);
    const rnd = mulberry32(0x369A2 + fx.file.length);
    const series = [];   // series[draw][group] = p
    for (let d = 0; d <= N; d++) {
      const perm = d === 0 ? base.matrix.map((_, i) => i) : permutation(base.matrix.length, rnd);
      const m = perm.map(i => base.matrix[i]);
      const ctx = base.condCtx.withMatrix(m);
      const disp = buildDispatch(base, fx.assay, m, ctx);
      const row = {};
      for (const entry of disp.entries) row[entry.name] = (await disp.run(entry)).perGroup.map(g => g.p);
      series.push(row);
    }
    console.log(`## ${fx.file}  (${fx.slices} groups)`);
    console.log('  ' + 'caller'.padEnd(30) + 'group'.padEnd(7) + 'original'.padEnd(14) +
      'distinct'.padEnd(10) + 'min'.padEnd(14) + 'max'.padEnd(14) + 'rel spread'.padEnd(12) + 'moves');
    for (const entry of buildDispatch(base, fx.assay, base.matrix, base.condCtx).entries) {
      const nG = series[0][entry.name].length;
      let anyMove = false;
      for (let g = 0; g < nG; g++) {
        const vals = series.map(s => s[entry.name][g]);
        // Exact-value distinctness is too strict a test for movement. Summing a
        // column's residuals in a different row order moves the last few units
        // in the last place, so a statistic that is mathematically invariant
        // under the permutation still prints a fresh 17-digit string. The
        // decision therefore reads the RELATIVE spread; the distinct count is
        // printed beside it so the two are not confused.
        const distinct = new Set(vals.map(v => (v == null ? 'null' : v.toExponential(17)))).size;
        const fin = vals.filter(v => v != null && isFinite(v));
        const lo = fin.length ? Math.min(...fin) : NaN, hi = fin.length ? Math.max(...fin) : NaN;
        const rel = fin.length && hi > 0 ? (hi - lo) / hi : 0;
        const moves = rel > 1e-9;
        if (moves) anyMove = true;
        console.log('  ' + entry.name.padEnd(30) + `g${g + 1}`.padEnd(7) +
          (vals[0] == null ? 'null' : vals[0].toPrecision(6)).padEnd(14) +
          String(distinct).padEnd(10) +
          (fin.length ? lo.toPrecision(6) : '—').padEnd(14) +
          (fin.length ? hi.toPrecision(6) : '—').padEnd(14) +
          rel.toExponential(2).padEnd(12) +
          (moves ? 'yes' : 'NO'));
      }
      const k = entry.name;
      verdict.set(k, (verdict.get(k) ?? true) && anyMove);
    }
    console.log('');
  }
  console.log('### Verdict — a caller whose p never moves cannot be estimated under this null\n');
  for (const [k, moves] of verdict) console.log(`  ${k.padEnd(30)} ${moves ? 'moves — measurable' : 'INVARIANT — drop from the correlation and rate cells'}`);
  process.exit(0);
}

// ── --measure: the four readouts ──────────────────────────────────────────
if (arg('--measure')) {
  if (!HOOKED) { console.log('Needs the arm flags: --import ./test/probes/s369-arm-flags-hook.mjs'); process.exit(1); }
  const N = Number(process.env.DRAWS) || 5000;
  const SKIP = new Set(process.env.SKIP ? process.env.SKIP.split(',').filter(Boolean) : INVARIANT);
  console.log(`### ${N} draws per cell. Excluded as invariant under this null: ${[...SKIP].join(', ') || 'none'}\n`);
  const cg = columnGroupedFixtures().filter(r => r.useAggregate);
  const rows = [];
  const t0 = Date.now();

  for (const fx of cg) {
    const base = readFixture(fx.file);
    const rnd = mulberry32(0x369B0 + fx.file.length);
    const probe0 = buildDispatch(base, fx.assay, base.matrix, base.condCtx);
    const live = probe0.entries.filter(e => !SKIP.has(e.name));
    const acc = new Map(live.map(e => [e.name, {
      perGroupP: null, hitF: null, hitN: null,
      arm: { F: [0, 0], S: [0, 0], B: [0, 0], C: [0, 0] }, guard: 0, n: 0, mismatch: 0,
      nPerm: new Set(),
    }]));
    for (let d = 0; d < N; d++) {
      const perm = permutation(base.matrix.length, rnd);
      const m = perm.map(i => base.matrix[i]);
      const ctx = base.condCtx.withMatrix(m);
      const disp = buildDispatch(base, fx.assay, m, ctx);
      for (const entry of disp.entries) {
        if (SKIP.has(entry.name)) continue;
        const { agg, perGroup } = await disp.run(entry);
        const s = acc.get(entry.name);
        if (s.perGroupP === null) {
          s.perGroupP = perGroup.map(() => []);
          s.hitF = perGroup.map(() => 0); s.hitN = perGroup.map(() => 0);
        }
        perGroup.forEach((g, i) => {
          if (i >= s.perGroupP.length) return;
          s.perGroupP[i].push(g.p);
          if (g.p != null && g.p < ALPHA.FLAG) s.hitF[i]++;
          if (g.p != null && g.p < ALPHA.NOTE) s.hitN[i]++;
          s.nPerm.add(g.nPerm);
        });
        const fF = agg.__s369.fisherFlag, fS = agg.__s369.groupArmFlag;
        if (flagRankOf(agg.flag) !== Math.max(flagRankOf(fF), flagRankOf(fS))) s.mismatch++;
        if (agg.multiplicityCorrected) s.guard++;
        for (const [k, f] of [['F', fF], ['S', fS], ['B', agg.worstGroupFlagRaw], ['C', agg.flag]]) {
          if (f === 'HIGH') { s.arm[k][0]++; s.arm[k][1]++; } else if (f === 'MODERATE') s.arm[k][1]++;
        }
        s.n++;
      }
    }
    for (const [name, s] of acc) rows.push({ file: fx.file, caller: name, nGroups: fx.slices, ...s });
    console.log(`  ${fx.file}: ${N} draws in ${((Date.now() - t0) / 1000).toFixed(0)}s cumulative`);
  }

  // Spearman on ranks, pairwise across draws.
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
    const r = new Array(a.length);
    let i = 0;
    while (i < idx.length) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const spearman = (a, b) => {
    const ra = rank(a), rb = rank(b), n = a.length;
    const ma = (n + 1) / 2, mb = ma;
    let sab = 0, sa = 0, sb = 0;
    for (let i = 0; i < n; i++) { const da = ra[i] - ma, db = rb[i] - mb; sab += da * db; sa += da * da; sb += db * db; }
    return (sa && sb) ? sab / Math.sqrt(sa * sb) : 0;
  };

  const se = (r, n) => Math.sqrt(r * (1 - r) / n);
  const cell = (h, n) => `${(100 * h / n).toFixed(3)}%(${(100 * se(h / n, n)).toFixed(3)})`;

  console.log(`\n### Readout 1 — marginal calibration per group, BEFORE aggregation. ${N} draws.`);
  console.log(`    Nominal ${(100 * ALPHA.FLAG).toFixed(1)}% at ALPHA.FLAG, ${(100 * ALPHA.NOTE).toFixed(1)}% at ALPHA.NOTE.\n`);
  console.log('  ' + 'file'.padEnd(8) + 'caller'.padEnd(30) + 'group'.padEnd(7) +
    'p<FLAG'.padEnd(18) + 'p<NOTE'.padEnd(18) + 'median p');
  for (const r of rows) {
    if (!r.perGroupP) continue;
    r.perGroupP.forEach((ps, i) => {
      const fin = ps.filter(v => v != null && isFinite(v)).sort((a, b) => a - b);
      const med = fin.length ? (fin.length % 2 ? fin[(fin.length - 1) / 2] : (fin[fin.length / 2 - 1] + fin[fin.length / 2]) / 2) : null;
      console.log('  ' + shortName(r.file).padEnd(8) + r.caller.padEnd(30) + `g${i + 1}`.padEnd(7) +
        cell(r.hitF[i], r.n).padEnd(18) + cell(r.hitN[i], r.n).padEnd(18) + (med === null ? '—' : med.toPrecision(6)));
    });
  }

  console.log(`\n### Readout 2 — Spearman correlation between group p-values, across draws\n`);
  console.log('  ' + 'file'.padEnd(8) + 'caller'.padEnd(30) + 'pair'.padEnd(9) + 'rho_s');
  for (const r of rows) {
    if (!r.perGroupP) continue;
    for (let i = 0; i < r.perGroupP.length; i++) for (let j = i + 1; j < r.perGroupP.length; j++) {
      const a = [], b = [];
      for (let d = 0; d < r.perGroupP[i].length; d++) {
        const x = r.perGroupP[i][d], y = r.perGroupP[j][d];
        if (x != null && y != null && isFinite(x) && isFinite(y)) { a.push(x); b.push(y); }
      }
      console.log('  ' + shortName(r.file).padEnd(8) + r.caller.padEnd(30) +
        `g${i + 1}-g${j + 1}`.padEnd(9) + (a.length > 2 ? spearman(a, b).toFixed(4) : '—'));
    }
  }

  console.log(`\n### Readout 3 — the four arm quantities on real data\n`);
  for (const thr of [0, 1]) {
    console.log(`  at ALPHA.${thr ? 'NOTE' : 'FLAG'} = ${thr ? ALPHA.NOTE : ALPHA.FLAG}`);
    console.log('  ' + 'file'.padEnd(8) + 'caller'.padEnd(30) + 'guard'.padEnd(9) +
      'Fisher'.padEnd(18) + 'group arm'.padEnd(18) + 'bare max'.padEnd(18) + 'combined');
    for (const r of rows) {
      console.log('  ' + shortName(r.file).padEnd(8) + r.caller.padEnd(30) +
        `${(100 * r.guard / r.n).toFixed(1)}%`.padEnd(9) +
        cell(r.arm.F[thr], r.n).padEnd(18) + cell(r.arm.S[thr], r.n).padEnd(18) +
        cell(r.arm.B[thr], r.n).padEnd(18) + cell(r.arm.C[thr], r.n));
    }
    console.log('');
  }

  // ── the PIT arm, Fisher only ────────────────────────────────────────────
  console.log(`### Readout 3b — Fisher on raw p against Fisher on PIT-transformed p\n`);
  console.log(`  The PIT arm divides out each caller's own marginal calibration and leaves the`);
  console.log(`  dependence, so it is the arm comparable to Part 1's grid. The gap between the two`);
  console.log(`  columns is the marginal contribution. Both use the shipped chiSquaredP and flagFromP.\n`);
  for (const r of rows) {
    if (!r.perGroupP) continue;
    const { u, m } = pitTransform(r.perGroupP);
    let hitF = 0, hitN = 0, used = 0;
    for (let d = 0; d < r.n; d++) {
      const vals = u.map(g => g[d]).filter(v => v != null && v > 0 && isFinite(v));
      if (vals.length < 2) continue;
      const chi = -2 * vals.reduce((s, p) => s + Math.log(Math.max(p, 1e-300)), 0);
      const fp = chiSquaredP(chi, 2 * vals.length);
      const f = flagFromP(fp);
      if (f === 'HIGH') { hitF++; hitN++; } else if (f === 'MODERATE') hitN++;
      used++;
    }
    r.pit = { hitF, hitN, used, m, nomF: pitNominal(ALPHA.FLAG, m), nomN: pitNominal(ALPHA.NOTE, m) };
  }
  console.log('  ' + 'file'.padEnd(8) + 'caller'.padEnd(30) +
    'Fisher raw @FLAG'.padEnd(19) + 'Fisher PIT @FLAG'.padEnd(19) + 'PIT nominal'.padEnd(13) +
    'Fisher raw @NOTE'.padEnd(19) + 'Fisher PIT @NOTE'.padEnd(19) + 'PIT nominal');
  for (const r of rows) {
    if (!r.pit) continue;
    console.log('  ' + shortName(r.file).padEnd(8) + r.caller.padEnd(30) +
      cell(r.arm.F[0], r.n).padEnd(19) + cell(r.pit.hitF, r.pit.used).padEnd(19) +
      `${(100 * r.pit.nomF).toFixed(3)}%`.padEnd(13) +
      cell(r.arm.F[1], r.n).padEnd(19) + cell(r.pit.hitN, r.pit.used).padEnd(19) +
      `${(100 * r.pit.nomN).toFixed(3)}%`);
  }

  // ── the lattice, per caller ─────────────────────────────────────────────
  console.log(`\n### Readout 3c — the permutation lattice each caller's p can land on\n`);
  console.log(`  P100: a threshold is attainable exactly when alpha*(B+1) is an integer, and flagFromP`);
  console.log(`  compares strictly, so a coincident point is EXCLUDED and the reachable rate is lower`);
  console.log(`  than the nominal. Counts are read off each result's own published nPerm, not the rule.`);
  console.log(`  THE COLUMN DESCRIBES THE PERMUTATION ARM, NOT primaryP. Only Regional Noise publishes`);
  console.log(`  its scan p unchanged (regionalNoise.js:242). Runs takes min(BH minimum, scan p, window`);
  console.log(`  BH minimum) and LOESS takes min(min(scan, cusum), pair BH minimum), so on those two the`);
  console.log(`  lattice bounds one arm of a minimum and primaryP can land off it.\n`);
  console.log('  ' + 'file'.padEnd(8) + 'caller'.padEnd(30) + 'nPerm'.padEnd(12) + 'floor'.padEnd(12) +
    'FLAG on lattice'.padEnd(17) + 'NOTE on lattice'.padEnd(17) + 'reachable FLAG / NOTE');
  for (const r of rows) {
    const counts = [...r.nPerm].filter(v => v != null);
    if (!counts.length) {
      console.log('  ' + shortName(r.file).padEnd(8) + r.caller.padEnd(30) +
        'none'.padEnd(12) + '—'.padEnd(12) + 'n/a'.padEnd(17) + 'n/a'.padEnd(17) + 'analytic p, no lattice');
      continue;
    }
    const Bp = Math.max(...counts), G = Bp + 1;
    const onF = Number.isInteger(ALPHA.FLAG * G), onN = Number.isInteger(ALPHA.NOTE * G);
    const reachF = (Math.ceil(ALPHA.FLAG * G) - (onF ? 1 : 0)) / G;
    const reachN = (Math.ceil(ALPHA.NOTE * G) - (onN ? 1 : 0)) / G;
    console.log('  ' + shortName(r.file).padEnd(8) + r.caller.padEnd(30) +
      counts.join('/').padEnd(12) + (1 / G).toExponential(2).padEnd(12) +
      (onF ? 'YES' : 'no').padEnd(17) + (onN ? 'YES' : 'no').padEnd(17) +
      `${(100 * reachF).toFixed(3)}% / ${(100 * reachN).toFixed(3)}%`);
  }

  const bad = rows.reduce((s, r) => s + r.mismatch, 0);
  console.log(`\n### Integrity`);
  console.log(`  combined flag != max(Fisher, group arm)   ${bad}`);
  console.log(`  draws per cell                            ${N}`);
  console.log(`  wall clock                                ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  mkdirSync(B + 'test/probes/out-s369', { recursive: true });
  writeFileSync(B + 'test/probes/out-s369/null-correlation.json',
    JSON.stringify({ draws: N, alpha: ALPHA, rows: rows.map(r => ({ ...r, perGroupP: undefined })) }, null, 1));
  // Per-group p series kept separately; it is large and only the summaries are quoted.
  writeFileSync(B + 'test/probes/out-s369/null-correlation-series.json',
    JSON.stringify(rows.map(r => ({ file: r.file, caller: r.caller, perGroupP: r.perGroupP }))));
  console.log(`  written                                   test/probes/out-s369/null-correlation.json`);
  process.exit(0);
}

// ── --rungs: the same observable on Part 1's synthetic construction ───────
// Readout 2 reports a Spearman correlation between group p-values. To place a
// measured value on Part 1's grid without inverting anything, the SAME statistic
// is computed on the grid's own construction at each rho rung. Both p conventions
// are given because the mapping differs sharply between them: a one-sided p is a
// monotone function of z, so its Spearman tracks the normal's; a two-sided p is a
// function of |z|, which folds the sign away and correlates far less at the same
// rho. Nothing here touches the shipped layer — Spearman of p-values only.
if (arg('--rungs')) {
  const M = Number(process.env.DRAWS) || 200000;
  const RHOS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const pTwo = (z) => chiSquaredP(z * z, 1);
  const pOne = (z) => (z >= 0 ? 0.5 * chiSquaredP(z * z, 1) : 1 - 0.5 * chiSquaredP(z * z, 1));
  function makeNormal(rnd) {
    let spare = null;
    return function () {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let u, v, s2;
      do { u = 2 * rnd() - 1; v = 2 * rnd() - 1; s2 = u * u + v * v; } while (s2 >= 1 || s2 === 0);
      const f = Math.sqrt(-2 * Math.log(s2) / s2);
      spare = v * f; return u * f;
    };
  }
  const rank = (a) => {
    const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
    const r = new Array(a.length);
    let i = 0;
    while (i < idx.length) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const spearman = (a, b) => {
    const ra = rank(a), rb = rank(b), n = a.length, mu = (n + 1) / 2;
    let sab = 0, sa = 0, sb = 0;
    for (let i = 0; i < n; i++) { const da = ra[i] - mu, db = rb[i] - mu; sab += da * db; sa += da * da; sb += db * db; }
    return (sa && sb) ? sab / Math.sqrt(sa * sb) : 0;
  };
  console.log(`### Part 1's construction, read with Part 2's observable. ${M} draws per rung, 3 groups.\n`);
  console.log('  ' + 'rho'.padEnd(7) + 'Spearman, one-sided p'.padEnd(25) + 'Spearman, two-sided p');
  for (const rho of RHOS) {
    const rnd = mulberry32(0x5369C + Math.round(rho * 10));
    const randn = makeNormal(rnd);
    const a1 = [], b1 = [], a2 = [], b2 = [];
    const s = Math.sqrt(rho), t = Math.sqrt(1 - rho);
    for (let d = 0; d < M; d++) {
      const u = randn(), z1 = s * u + t * randn(), z2 = s * u + t * randn();
      a1.push(pOne(z1)); b1.push(pOne(z2));
      a2.push(pTwo(z1)); b2.push(pTwo(z2));
    }
    console.log('  ' + rho.toFixed(1).padEnd(7) + spearman(a1, b1).toFixed(4).padEnd(25) + spearman(a2, b2).toFixed(4));
  }
  process.exit(0);
}

console.log('Pick a mode: --fixtures, --anchor, --inert, --measure, --rungs');

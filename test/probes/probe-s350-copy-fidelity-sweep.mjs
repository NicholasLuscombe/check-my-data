// probe-s350-copy-fidelity-sweep.mjs — S350 Part 11.
//
// Runs Cross-Condition Consistency and Residual Spike Correlation along the
// copy-fidelity axis built by test/gen-copy-fidelity.mjs, in both layouts and
// under both nulls, and reports detection rate against false-positive rate at
// the same threshold.
//
// GRID  10 fidelity points x 20 seeds x 2 layouts x 2 nulls x 2 tests.
//   k        the copy noise as a multiple of the within-condition replicate
//            noise. k = 0 is a perfect copy; k = 1 is exact independence, and
//            that end of the axis is where the false-positive rate comes from.
//   seed     an INDEPENDENT DATASET, not a PRNG offset on one dataset. A
//            detection rate needs data replication; permutation-seed variation
//            would measure the null's own noise instead. This is a deliberate
//            departure from how "twenty seeds" was read in Parts 5 and 6, and
//            it is stated here rather than left to inference.
//   layout   column-grouped and row-grouped, because the two branches differ in
//            how pairing is reachable inside a test.
//   null     the shipped free permutation, and the within-subject relabel
//            installed by the two load hooks.
//
// PER-UNIT RECORD. Every unit of every point is written to a machine-readable
// CSV beside the summary, carrying its raw p, adjusted p, BH family and family
// size, resolved direction, and whether it contributed to the verdict as
// shipped. Two things then become arithmetic rather than a re-run: the
// detection rate with the direction filter lifted, and how many units change
// direction between the nulls at each k. The record is built in from the first
// run, so no number here was computed before it existed.
//
// DIRECTION FILTER, TWO ARMS.
//   shipped   primaryP = min over units that are forensic-direction AND
//             gate-passed. This is what the engine returns.
//   lifted    primaryP = min over units that are gate-passed, whichever tail
//             they landed in. The effect-size gate is left in place, because it
//             is a separate mechanism from the direction filter and S342
//             already separated them the other way.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY on src/. Both nulls are load-time source hooks.
//
// Usage:
//   node --import ./test/probes/s348-hash-hook.mjs \
//        --import ./test/probes/s350-paired-null-hook.mjs \
//        --import ./test/probes/s350-rsc-null-hook.mjs \
//        test/probes/probe-s350-copy-fidelity-sweep.mjs
//
// Env: SEEDS (default 20), UNITS_OUT (csv path), COST=1 (time one point, stop).

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { testCrossConditionConsistency } = await import('../../src/tests/crossConditionConsistency.js');
const { testResidualSpikeCorrelation } = await import('../../src/tests/residualSpikeCorrelation.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { ALPHA, flagFromP } = await import('../../src/constants/thresholds.js');
const { generate, KLADDER, DEFAULTS } = await import('../gen-copy-fidelity.mjs');

if (!globalThis.__S350_HOOK) throw new Error('sweep: CCC null hook missing — --import ./test/probes/s350-paired-null-hook.mjs');
if (!globalThis.__S350_RSC_HOOK) throw new Error('sweep: RSC null hook missing — --import ./test/probes/s350-rsc-null-hook.mjs');

const CCC = 'Cross-Condition Consistency';
const RSC = 'Residual Spike Correlation';
const ASSAY = 'general';
const SEEDS = Math.max(1, Number(process.env.SEEDS) || 20);
const COST = process.env.COST === '1';
const MODE = process.env.MODE === 'shared-subjects' ? 'shared-subjects' : 'full';
const UNITS_OUT = process.env.UNITS_OUT ||
  (MODE === 'shared-subjects' ? 'docs/shared/S350-COPY-FIDELITY-UNITS-SHARED.csv' : 'docs/shared/S350-COPY-FIDELITY-UNITS.csv');

function prepFromCsv(csv) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, ASSAY);
  return { matrix, condCtx, vst };
}

/** Mirrors engine.js:185-201 (validate, factory on the sanitised raw matrix)
 *  and :280-290 + :413-441 (VST matrix, context, opts). */
function enginePair(prep) {
  const validation = validateMatrix(prep.matrix);
  const m0 = validation.matrix;
  const rngFor = createPRNGFactory(m0);
  const t = prep.vst?.transform || 'raw';
  let vm = null;
  if (t === 'log') vm = m0.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (t === 'anscombe') vm = m0.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vm !== null;
  return { m0, rngFor, hasVST, m: hasVST ? vm : m0, ctx: hasVST ? prep.condCtx.withMatrix(vm) : prep.condCtx };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2])) : NaN; };
const quant = (a, q) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; const i = q * (s.length - 1); const lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
const rate = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : '—';
const sig = (x, d = 4) => (x == null || !isFinite(x)) ? '' : Number(x).toPrecision(d);

const unitRows = [];
const points = [];

console.log('S350 Part 11 — the copy-fidelity sweep');
console.log(`mode: ${MODE}${MODE === 'shared-subjects' ? '  — subject levels identical in both conditions; k = 1 is an HONEST PAIRED experiment' : '  — both levels degrade; k = 1 is two unrelated experiments'}`);
console.log(`grid: ${KLADDER.length} fidelity points x ${SEEDS} independent datasets x 2 layouts x 2 nulls x 2 tests`);
console.log(`generator defaults: ${DEFAULTS.nSubjects} subjects, ${DEFAULTS.nReps} reps, tau ${DEFAULTS.tau}, sigma ${DEFAULTS.sigma},` +
  ` effect ${DEFAULTS.effectFold}x on ${(DEFAULTS.effectFrac * 100).toFixed(0)}% of subjects`);
console.log(`ALPHA.NOTE = ${ALPHA.NOTE} (MODERATE), ALPHA.FLAG = ${ALPHA.FLAG} (HIGH). A "flag" is MODERATE or HIGH.\n`);

const t0 = Date.now();
for (const k of KLADDER) {
  for (const layout of ['column-grouped', 'row-grouped']) {
    for (const arm of ['free', 'paired']) {
      const cccShipped = [], cccLifted = [], rscP = [];
      const dirCount = {};
      for (let seed = 0; seed < SEEDS; seed++) {
        const d = generate({ k, seed, sharedSubjects: MODE === 'shared-subjects' });
        const prep = prepFromCsv(layout === 'column-grouped' ? d.columnGroupedCsv : d.rowGroupedCsv);
        const ep = enginePair(prep);

        // ── Cross-Condition Consistency ──
        globalThis.__S350_UNITS = null;
        globalThis.__S350_PAIRED = arm === 'paired';
        globalThis.__S350_PAIRED_APPLIED = false;
        const rc = testCrossConditionConsistency(ep.m, ep.ctx, ep.rngFor(CCC), { originalMatrix: ep.m0, hasVST: ep.hasVST });
        const applied = arm !== 'paired' || globalThis.__S350_PAIRED_APPLIED === true;
        globalThis.__S350_PAIRED = false;
        if (!applied) throw new Error(`sweep: CCC paired null did not apply at k=${k} ${layout} seed ${seed}`);
        const units = globalThis.__S350_UNITS || [];
        const famSize = { 1: rc.bhMStage1, 2: rc.bhMStage2, 3: rc.bhMStage3 };

        const shippedP = units.length ? Math.min(...units.map(u => (u.forensic && u.gatePassed) ? u.adjP : 1)) : 1;
        const liftedP = units.length ? Math.min(...units.map(u => u.gatePassed ? u.adjP : 1)) : 1;
        cccShipped.push(shippedP); cccLifted.push(liftedP);

        for (const u of units) {
          dirCount[`${u.id}|${u.pairName}`] = dirCount[`${u.id}|${u.pairName}`] || {};
          dirCount[`${u.id}|${u.pairName}`][u.direction] = (dirCount[`${u.id}|${u.pairName}`][u.direction] || 0) + 1;
          unitRows.push([
            k, layout, arm, seed, 'CCC', u.id, u.prop, u.pairName, u.stage,
            sig(u.p2, 6), sig(u.adjP, 6), `Stage${u.stage}`, famSize[u.stage] ?? '',
            u.direction, u.gatePassed ? 1 : 0, u.forensic ? 1 : 0,
            (u.forensic && u.gatePassed) ? 1 : 0,
            sig(u.dObs, 6), sig(u.permMedian, 6), rc.B,
          ]);
        }

        // ── Residual Spike Correlation ──
        globalThis.__S350_RSC_PAIRED = arm === 'paired';
        globalThis.__S350_RSC_PAIRED_APPLIED = false;
        const rr = testResidualSpikeCorrelation(ep.m, ep.ctx, ep.rngFor(RSC));
        const rApplied = arm !== 'paired' || globalThis.__S350_RSC_PAIRED_APPLIED === true;
        globalThis.__S350_RSC_PAIRED = false;
        if (!rApplied) throw new Error(`sweep: RSC paired null did not apply at k=${k} ${layout} seed ${seed}`);
        rscP.push(rr.primaryP);
        // RSC has one statistic, no BH family and no direction. Its record
        // carries the fields it has and leaves the rest empty rather than
        // inventing them.
        unitRows.push([
          k, layout, arm, seed, 'RSC', 'overlap', 'max pairwise top-K overlap', rr.bestPair, '',
          sig(rr.primaryP, 6), sig(rr.primaryP, 6), '', '',
          '', 1, 1, 1, rr.nOverlap, rr.expectedOverlap, rr.nPerm,
        ]);
      }
      const isFlag = (p) => p < ALPHA.NOTE;
      points.push({
        k, layout, arm,
        cccShippedRate: cccShipped.filter(isFlag).length, cccShippedP: cccShipped,
        cccLiftedRate: cccLifted.filter(isFlag).length, cccLiftedP: cccLifted,
        rscRate: rscP.filter(isFlag).length, rscP,
        dirCount,
      });
      if (COST) {
        console.log(`one point (${SEEDS} datasets, both tests): ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        console.log(`projected full grid: ${((Date.now() - t0) / 1000 * KLADDER.length * 4 / 60).toFixed(1)} min`);
        process.exit(0);
      }
    }
  }
  process.stderr.write(`[sweep] k=${k} done (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
}
console.log(`grid complete in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);

// ── the per-unit record ─────────────────────────────────────────────────
const HEAD = ['k', 'layout', 'arm', 'seed', 'test', 'unit', 'property', 'pair', 'stage',
  'rawP', 'adjP', 'bhFamily', 'bhM', 'direction', 'gatePassed', 'forensic', 'contributed',
  'stat', 'nullRef', 'B'];
mkdirSync(dirname(UNITS_OUT), { recursive: true });
writeFileSync(UNITS_OUT, [HEAD.join(','), ...unitRows.map(r => r.join(','))].join('\n') + '\n');
console.log(`per-unit record: ${unitRows.length} rows -> ${UNITS_OUT}\n`);

// ── tables ──────────────────────────────────────────────────────────────
function block(test, layout, arm) {
  const rows = points.filter(p => p.layout === layout && p.arm === arm);
  const fpr = rows.find(p => p.k === 1);
  console.log(`\n── ${test} · ${layout} · ${arm === 'free' ? 'free permutation (shipped)' : 'within-subject relabel'} ──`);
  if (test === 'CCC') {
    console.log('    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped');
    for (const p of rows) {
      console.log(`  ${String(p.k).padStart(4)}    ${rate(p.cccShippedRate, SEEDS).padStart(5)} (${p.cccShippedRate}/${SEEDS})` +
        `    ${rate(p.cccLiftedRate, SEEDS).padStart(5)} (${p.cccLiftedRate}/${SEEDS})` +
        `    ${sig(median(p.cccShippedP)).padStart(9)}         ${sig(median(p.cccLiftedP)).padStart(9)}` +
        `      [${sig(quant(p.cccShippedP, 0.1), 3)} .. ${sig(quant(p.cccShippedP, 0.9), 3)}]`);
    }
    console.log(`  false-positive rate at k = 1 (independent): shipped ${rate(fpr.cccShippedRate, SEEDS)}, ` +
      `filter lifted ${rate(fpr.cccLiftedRate, SEEDS)} — same threshold, ALPHA.NOTE`);
  } else {
    console.log('    k     detect           median p     p range (10th-90th)');
    for (const p of rows) {
      console.log(`  ${String(p.k).padStart(4)}    ${rate(p.rscRate, SEEDS).padStart(5)} (${p.rscRate}/${SEEDS})` +
        `    ${sig(median(p.rscP)).padStart(9)}    [${sig(quant(p.rscP, 0.1), 3)} .. ${sig(quant(p.rscP, 0.9), 3)}]`);
    }
    console.log(`  false-positive rate at k = 1 (independent): ${rate(fpr.rscRate, SEEDS)} — same threshold, ALPHA.NOTE`);
  }
}
for (const layout of ['column-grouped', 'row-grouped']) {
  for (const arm of ['free', 'paired']) block('CCC', layout, arm);
}
for (const layout of ['column-grouped', 'row-grouped']) {
  for (const arm of ['free', 'paired']) block('RSC', layout, arm);
}

// ── direction, per k, per layout: how the two nulls disagree ────────────
console.log('\n\n── resolved direction of the Stage-1 units, and how many flip between the nulls ──');
console.log('   Counted over unit x dataset. Three Stage-1 units x one pair x the datasets at each k.');
for (const layout of ['column-grouped', 'row-grouped']) {
  console.log(`\n   ${layout}`);
  console.log('    k     free: similar/different   paired: similar/different   units flipping (of 3 per dataset)');
  for (const k of KLADDER) {
    const at = (arm) => unitRows.filter(r => r[0] === k && r[1] === layout && r[2] === arm && r[4] === 'CCC' && r[8] === 1);
    const f = at('free'), p = at('paired');
    const cnt = (rows, dir) => rows.filter(r => r[13] === dir).length;
    let flips = 0;
    for (const fr of f) {
      const pr = p.find(x => x[3] === fr[3] && x[5] === fr[5] && x[7] === fr[7]);
      if (pr && pr[13] !== fr[13]) flips++;
    }
    console.log(`  ${String(k).padStart(4)}       ${String(cnt(f, 'similar')).padStart(4)}/${String(cnt(f, 'different')).padEnd(4)}` +
      `              ${String(cnt(p, 'similar')).padStart(4)}/${String(cnt(p, 'different')).padEnd(4)}` +
      `               ${flips} of ${f.length}`);
  }
}

// ── sanity: does anything react at all? ────────────────────────────────
const anyDetect = points.some(p => p.cccShippedRate > 0 || p.cccLiftedRate > 0 || p.rscRate > 0);
console.log(`\n\n── generator sanity ──`);
console.log(`   any detection anywhere on the grid: ${anyDetect ? 'yes' : 'NO'}`);
if (!anyDetect) {
  console.log('   No test reacts at any k in either layout under either null. Suspect the generator');
  console.log('   before the tests: check the diagnostics from gen-copy-fidelity.mjs (cell correlation');
  console.log('   should run from about 0.99 at k = 0 to about 0 at k = 1, and the two conditions');
  console.log('   should have equal spread at every k).');
}

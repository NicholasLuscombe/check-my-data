// probe-s350-heterogeneity-grid.mjs — S350 Part 13.
//
// The falsification test. Does Residual Spike Correlation's free-null power
// come from copying, or from persistent subject structure?
//
// Residual Spike Correlation row-centres before it computes anything, so
// subject LEVEL is invisible to it. What it can see is a subject whose
// replicates scatter more than its neighbours' — such a subject is extreme in
// every condition with no fabrication at all. The instrument as it shipped had
// no such structure: one global sigma for every subject. This adds the axis.
//
// GRID  fidelity k x heterogeneity s x 20 independent datasets.
//   k   copy noise as a multiple of the subject's own replicate noise. 0 is a
//       perfect copy, 1 is exact independence.
//   s   dispersion of the per-subject noise scale, on the log scale. 0 is
//       homoscedastic. The multiplier is centred so the pooled replicate noise
//       does not change with s — raising s redistributes noise between subjects
//       without changing how much there is.
//
// TWO QUANTITIES, REPORTED SEPARATELY. They can both be true and the point of
// the grid is that neither answer stands in for the other.
//   along k at fixed s   if detection still falls from full to zero as the copy
//                        degrades, at every s, the test responds to copying and
//                        not merely to subject structure.
//   along s at k = 1     honest data, no copy. This is the false-positive rate,
//                        and the prediction under test is that it rises with s.
//
// CUTS, and why. Residual Spike Correlation only: the question is about its
// curve. Free null only, with the corrected null as a control row at k = 1 for
// each s, because Part 11 measured the corrected null flat at zero across the
// whole fidelity axis. One layout: Part 11 measured every number identical
// column-grouped and row-grouped, since both tests consume the same slices.
//
// ANCHOR. The s axis is unreadable without knowing where real files sit, so the
// same estimator is run over the four clean paired fixtures. Those are our own
// generated fixtures, so the anchor says where OUR CORPUS sits, not where real
// deposits sit. That second question is P65's.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY on src/. The corrected null is a load-time source hook.
//
// Usage:
//   node --import ./test/probes/s348-hash-hook.mjs \
//        --import ./test/probes/s350-rsc-null-hook.mjs \
//        test/probes/probe-s350-heterogeneity-grid.mjs
//
// Env: SEEDS (default 20), UNITS_OUT (csv path), COST=1.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { testResidualSpikeCorrelation } = await import('../../src/tests/residualSpikeCorrelation.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');
const { generate, KLADDER, SLADDER, DEFAULTS, residualScaleDispersion } = await import('../gen-copy-fidelity.mjs');

if (!globalThis.__S348_HOOK) throw new Error('grid: seed hook missing — --import ./test/probes/s348-hash-hook.mjs');
if (!globalThis.__S350_RSC_HOOK) throw new Error('grid: RSC null hook missing — --import ./test/probes/s350-rsc-null-hook.mjs');

const RSC = 'Residual Spike Correlation';
const ASSAY = 'general';
const SEEDS = Math.max(1, Number(process.env.SEEDS) || 20);
const COST = process.env.COST === '1';
const UNITS_OUT = process.env.UNITS_OUT || 'docs/shared/S350-HETEROGENEITY-UNITS.csv';
const FIXTURES = 'test/fixtures';
const CLEAN_PAIRED = [
  '01-densitometry-clean.csv',
  '03-qpcr-clean.csv',
  '09-proteomics-clean.csv',
  '17-densitometry-carlisle-clean.csv',
];

function prepFromCsv(csv, assay) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { matrix, condCtx, vst: detectVST(matrix, assay) };
}
/** Mirrors engine.js:185-201 and :280-290 + :413-421. */
function enginePair(prep) {
  const m0 = validateMatrix(prep.matrix).matrix;
  const rngFor = createPRNGFactory(m0);
  const t = prep.vst?.transform || 'raw';
  let vm = null;
  if (t === 'log') vm = m0.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (t === 'anscombe') vm = m0.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vm !== null;
  return { rngFor, m: hasVST ? vm : m0, ctx: hasVST ? prep.condCtx.withMatrix(vm) : prep.condCtx, vstType: t };
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const x = [...a].sort((p, q) => p - q); const n = x.length; return n ? (n % 2 ? x[(n - 1) / 2] : 0.5 * (x[n / 2 - 1] + x[n / 2])) : NaN; };
const quant = (a, q) => { const x = [...a].sort((p, r) => p - r); if (!x.length) return NaN; const i = q * (x.length - 1); const lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? x[lo] : x[lo] + (x[hi] - x[lo]) * (i - lo); };
const pct = (n, d) => d ? (100 * n / d).toFixed(0) + '%' : '—';
const sig = (x, d = 4) => (x == null || !isFinite(x)) ? '' : Number(x).toPrecision(d);

/** Membership spread from a finished RSC result: how many subjects sit in the
 *  top-K of every condition. That is the mechanism the artefact claim rests on. */
function membership(r) {
  const K = r.topK;
  const profs = r.allProfiles.map(p => p.absResid);
  const nG = profs.length, nR = profs[0].length;
  const masks = profs.map(v => {
    const idx = Array.from({ length: nR }, (_, i) => i);
    idx.sort((a, b) => (v[b] ?? -Infinity) - (v[a] ?? -Infinity));
    const m = new Uint8Array(nR);
    for (let i = 0; i < K; i++) m[idx[i]] = 1;
    return m;
  });
  let all = 0, some = 0;
  for (let i = 0; i < nR; i++) {
    let c = 0; for (let g = 0; g < nG; g++) if (masks[g][i]) c++;
    if (c === nG) all++; else if (c > 0) some++;
  }
  return { all, some, K, nR };
}

const unitRows = [];
const cells = [];

console.log('S350 Part 13 — the falsification grid: copy fidelity k x noise-scale heterogeneity s\n');
console.log(`grid: ${KLADDER.length} k x ${SLADDER.length} s x ${SEEDS} independent datasets, free null`);
console.log(`       plus a corrected-null control at k = 1 for each s`);
console.log(`generator: ${DEFAULTS.nSubjects} subjects, ${DEFAULTS.nReps} reps, tau ${DEFAULTS.tau}, sigma ${DEFAULTS.sigma},` +
  ` effect ${DEFAULTS.effectFold}x on ${(DEFAULTS.effectFrac * 100).toFixed(0)}% of subjects`);
console.log(`a flag is MODERATE or HIGH, i.e. p < ALPHA.NOTE = ${ALPHA.NOTE}\n`);

const t0 = Date.now();
for (const s of SLADDER) {
  for (const k of KLADDER) {
    for (const arm of (k === 1 ? ['free', 'paired'] : ['free'])) {
      const ps = [], allM = [], someM = [], dispM = [];
      for (let seed = 0; seed < SEEDS; seed++) {
        const d = generate({ k, seed, sigmaS: s });
        const prep = prepFromCsv(d.columnGroupedCsv, ASSAY);
        const ep = enginePair(prep);
        globalThis.__S350_RSC_PAIRED = arm === 'paired';
        globalThis.__S350_RSC_PAIRED_APPLIED = false;
        const r = testResidualSpikeCorrelation(ep.m, ep.ctx, ep.rngFor(RSC));
        const ok = arm !== 'paired' || globalThis.__S350_RSC_PAIRED_APPLIED === true;
        globalThis.__S350_RSC_PAIRED = false;
        if (!ok) throw new Error(`grid: corrected null did not apply at k=${k} s=${s} seed ${seed}`);
        const mem = membership(r);
        ps.push(r.primaryP); allM.push(mem.all); someM.push(mem.some);
        dispM.push(d.diagnostics.noiseScaleDispersion);
        unitRows.push([
          k, s, arm, seed, 'RSC', 'overlap', 'max pairwise top-K overlap', r.bestPair, '',
          sig(r.primaryP, 6), sig(r.primaryP, 6), '', '', '', 1, 1, 1,
          r.nOverlap, r.expectedOverlap, r.nPerm,
          mem.all, mem.some, mem.K, sig(d.diagnostics.noiseScaleDispersion, 4),
          sig(d.diagnostics.cellCorr, 4),
        ]);
      }
      cells.push({ k, s, arm, ps, nFlag: ps.filter(p => p < ALPHA.NOTE).length,
        allMean: mean(allM), someMean: mean(someM), dispMean: mean(dispM) });
      if (COST) {
        console.log(`one cell (${SEEDS} datasets): ${((Date.now() - t0) / 1000).toFixed(2)}s`);
        console.log(`projected: ${((Date.now() - t0) / 1000 * (KLADDER.length + 1) * SLADDER.length / 60).toFixed(1)} min`);
        process.exit(0);
      }
    }
  }
  process.stderr.write(`[grid] s=${s} done (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
}
console.log(`grid complete in ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);

mkdirSync(dirname(UNITS_OUT), { recursive: true });
writeFileSync(UNITS_OUT, [
  ['k', 's', 'arm', 'seed', 'test', 'unit', 'property', 'pair', 'stage', 'rawP', 'adjP',
    'bhFamily', 'bhM', 'direction', 'gatePassed', 'forensic', 'contributed',
    'stat', 'nullRef', 'B', 'subjectsInAllConditions', 'subjectsInSome', 'K',
    'measuredNoiseScaleDispersion', 'cellCorr'].join(','),
  ...unitRows.map(r => r.join(',')),
].join('\n') + '\n');
console.log(`per-unit record: ${unitRows.length} rows -> ${UNITS_OUT}\n`);

// ── Q1: does detection still track k at every s? ───────────────────────
console.log('── Q1 — detection along k, at each heterogeneity level. Free null. ──');
console.log('   If detection still falls from full to zero as the copy degrades at every s,');
console.log('   the test responds to copying and not merely to subject structure.\n');
const hdr = '    s  |  ' + KLADDER.map(k => String(k).padStart(5)).join(' ');
console.log(hdr);
console.log('  ' + '-'.repeat(hdr.length - 2));
for (const s of SLADDER) {
  const row = KLADDER.map(k => {
    const c = cells.find(x => x.k === k && x.s === s && x.arm === 'free');
    return pct(c.nFlag, SEEDS).padStart(5);
  });
  console.log(`  ${String(s).padStart(4)} |  ${row.join(' ')}`);
}

console.log('\n   median p, same cells:');
console.log(hdr);
for (const s of SLADDER) {
  const row = KLADDER.map(k => {
    const c = cells.find(x => x.k === k && x.s === s && x.arm === 'free');
    return sig(median(c.ps), 3).padStart(5);
  });
  console.log(`  ${String(s).padStart(4)} |  ${row.join(' ')}`);
}

// ── Q2: the false-positive rate along s at k = 1 ───────────────────────
console.log('\n\n── Q2 — false-positive rate on honest data, k = 1, no copy at all ──');
console.log('   Threshold ALPHA.NOTE = 0.01 throughout, so these are directly comparable to Q1.\n');
const K0 = Math.max(5, Math.floor(DEFAULTS.nSubjects * 0.10));
const expectedOverlap = K0 * K0 / DEFAULTS.nSubjects;
console.log('     s    measured dispersion   free null FPR     median p     p range (10-90)    corrected null FPR');
for (const s of SLADDER) {
  const f = cells.find(x => x.k === 1 && x.s === s && x.arm === 'free');
  const p = cells.find(x => x.k === 1 && x.s === s && x.arm === 'paired');
  console.log(`  ${String(s).padStart(4)}         ${f.dispMean.toFixed(4)}          ` +
    `${pct(f.nFlag, SEEDS).padStart(4)} (${f.nFlag}/${SEEDS})    ${sig(median(f.ps), 4).padStart(8)}   ` +
    `[${sig(quant(f.ps, 0.1), 3)} .. ${sig(quant(f.ps, 0.9), 3)}]       ` +
    `${pct(p.nFlag, SEEDS).padStart(4)} (${p.nFlag}/${SEEDS})`);
}
console.log(`\n   The mechanism, made visible: mean subjects in the top-${K0} of BOTH conditions at k = 1,`);
console.log(`   where no copying has occurred. Under independence the expectation is ${expectedOverlap.toFixed(1)}.`);
for (const s of SLADDER) {
  const f = cells.find(x => x.k === 1 && x.s === s && x.arm === 'free');
  console.log(`     s = ${String(s).padStart(4)}: ${f.allMean.toFixed(2)} subjects`);
}

// ── the anchor ─────────────────────────────────────────────────────────
console.log('\n\n── ANCHOR — where the four clean paired fixtures sit on the s axis ──');
console.log('   These are OUR OWN GENERATED FIXTURES. The anchor says where our corpus sits.');
console.log('   It does not say where real deposits sit; that question belongs to P65.\n');
console.log('   fixture                              conditions  subjects  reps  df   raw disp  corrected disp');
for (const file of CLEAN_PAIRED) {
  const prep = prepFromCsv(readFileSync(join(FIXTURES, file), 'utf-8'), EXPECTED[file].assay);
  const ep = enginePair(prep);
  const slices = ep.ctx.slices();
  const n = Math.min(...slices.map(x => x.matrix.length));
  // The estimator wants raw values; the slices here are already transformed, so
  // exponentiate back. residualScaleDispersion logs internally.
  const conds = slices.map(x => x.matrix.slice(0, n).map(row => row.map(v => (v == null || !isFinite(v)) ? null : Math.exp(v))));
  const d = residualScaleDispersion(conds);
  console.log(`   ${file.replace('.csv', '').padEnd(36)} ${String(slices.length).padStart(5)}` +
    `      ${String(n).padStart(6)}  ${String(slices[0].matrix[0].length).padStart(4)}  ${d.df.toFixed(0).padStart(3)}` +
    `   ${d.raw.toFixed(4)}    ${d.corrected.toFixed(4)}`);
}
console.log('\n   For comparison, the same estimator on generated data at each s:');
for (const s of SLADDER) {
  const c = cells.find(x => x.k === 1 && x.s === s && x.arm === 'free');
  console.log(`     sigmaS = ${String(s).padStart(4)}  ->  measured ${c.dispMean.toFixed(4)}`);
}

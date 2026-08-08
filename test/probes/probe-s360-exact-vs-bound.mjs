// S360 Part 3 — the exact in-loop correction beside the Šidák bound.
//
// Part 1 found that four of the fourteen Class A tests draw their arms inside
// ONE permutation or simulation loop, so the joint null of the arms is already
// being paid for on every run and simply not retained. Three of those four
// carry a live cell: LOESS, Regional Noise, Cross-Condition Consistency.
// (Excess Kurtosis is the fourth and fires nowhere.)
//
// For those cells this probe computes both:
//
//   bound  1 - (1 - p_min)^k              Šidák, which assumes the arms are
//                                         independent — they are not
//   exact  the min-p statistic read against the joint null the loop already
//          draws: for each permutation, each arm's null p is read off that
//          arm's own pooled null, the smallest is taken, and the observed
//          smallest is ranked against that distribution
//
// Both estimate the same quantity — the probability that at least one arm
// reaches the observed level. The bound over-prices it by exactly as much as
// the arms are correlated, so the gap between the columns is the argument for
// restructuring rather than multiplying.
//
// The per-permutation statistics come from test/probes/s360-joint-null-hook.mjs,
// which retains values the loops already compute. Every recomputed observed
// arm p is checked against the shipped one before anything is reported; a
// mismatch is a failure, not a rounding note.
//
// Seed offset 0 — no seed hook is registered, so this is the shipped stream.
//
//   node --import ./test/probes/s360-joint-null-hook.mjs test/probes/probe-s360-exact-vs-bound.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');
const { flagFromP } = await import('../../src/constants/thresholds.js');
const { bhFDR } = await import('../../src/stats/primitives.js');

if (!globalThis.__S360) {
  console.error('This probe needs the capture hook:');
  console.error('  node --import ./test/probes/s360-joint-null-hook.mjs test/probes/probe-s360-exact-vs-bound.mjs');
  process.exit(1);
}

const FIXTURES = 'test/fixtures';
const SEED_OFFSET = 0;

// Cells from the S360 census that sit on a shared-loop test.
const CELLS = [
  ['08-elisa-fabricated.csv', 'LOESS Residual Analysis'],
  ['08-elisa-fabricated.csv', 'Regional Noise Homogeneity'],
  ['10-proteomics-fabricated.csv', 'LOESS Residual Analysis'],
  ['10-proteomics-fabricated.csv', 'Regional Noise Homogeneity'],
  ['12b-uniform-mixture-fabricated.csv', 'LOESS Residual Analysis'],
  ['12b-uniform-mixture-fabricated.csv', 'Regional Noise Homogeneity'],
  ['21-localised-ar.csv', 'Regional Noise Homogeneity'],
  ['15-missing-carlisle.csv', 'Cross-Condition Consistency'],
  ['19-inheritance-fabricated.csv', 'Cross-Condition Consistency'],
];

const sidak = (p, k) => 1 - Math.pow(1 - p, k);
const fmt = (v) => (v == null ? '    —     ' : v < 1e-4 ? v.toExponential(2).padStart(10) : v.toFixed(6).padStart(10));
const EPS = 1e-12;

// ── pooled-null survival ────────────────────────────────────────────
// The pooled set is the observed statistic together with the B permuted ones,
// which is the (k+1)/(B+1) convention the tests already use: reading the
// observed value out of this function reproduces the shipped p exactly.
function makeUpperTail(obs, perm) {
  const pooled = Float64Array.from([obs, ...perm]);
  pooled.sort();
  const N = pooled.length;
  // #{y >= x} = N - (index of first element >= x)
  return (x) => {
    let lo = 0, hi = N;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pooled[mid] < x) lo = mid + 1; else hi = mid; }
    return (N - lo) / N;
  };
}
function makeLowerTail(obs, perm) {
  const pooled = Float64Array.from([obs, ...perm]);
  pooled.sort();
  const N = pooled.length;
  // #{y <= x} = index of first element > x
  return (x) => {
    let lo = 0, hi = N;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pooled[mid] <= x) lo = mid + 1; else hi = mid; }
    return lo / N;
  };
}

// exact min-p: rank the observed smallest arm p against the per-permutation
// smallest arm p drawn from the same loop.
function exactMinP(armObsP, armNullP, B) {
  const pMinObs = Math.min(...armObsP);
  let ge = 0;
  for (let b = 0; b < B; b++) {
    let m = Infinity;
    for (const arr of armNullP) if (arr[b] < m) m = arr[b];
    if (m <= pMinObs + EPS) ge++;
  }
  return { pMinObs, exact: (1 + ge) / (B + 1) };
}

async function runFixture(file) {
  const expected = EXPECTED[file];
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  let raw = preprocessRaw(Papa.default.parse(csv, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix: m, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(m, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return runFullAnalysis(m, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
}

// ── per-test exact computation ──────────────────────────────────────

function loessExact(cap) {
  const B = cap.nPerm;
  const sScan = makeUpperTail(cap.obs.scan, cap.perm.scan);
  const sCus = makeUpperTail(cap.obs.cusum, cap.perm.cusum);
  const obsPs = [sScan(cap.obs.scan), sCus(cap.obs.cusum)];
  const check = [
    ['scanP', obsPs[0], cap.scanP],
    ['cusumP', obsPs[1], cap.cusumP],
  ];
  const nullPs = [new Float64Array(B), new Float64Array(B)];
  for (let b = 0; b < B; b++) {
    nullPs[0][b] = sScan(cap.perm.scan[b]);
    nullPs[1][b] = sCus(cap.perm.cusum[b]);
  }
  return { B, k: 2, armNames: ['scan', 'cusum'], obsPs, check, ...exactMinP(obsPs, nullPs, B) };
}

function regionalExact(cap, shipped) {
  const B = cap.nPerm, nC = cap.nC;
  const sScan = makeUpperTail(cap.obs.scan, cap.perm.scan);
  const colS = [];
  for (let c = 0; c < nC; c++) colS.push(makeUpperTail(cap.obs.cols[c], cap.perm.cols.map(r => r[c])));

  const obsColP = colS.map((f, c) => f(cap.obs.cols[c]));
  const obsColAdj = bhFDR(obsColP);
  const obsPs = [sScan(cap.obs.scan), Math.min(...obsColAdj)];

  const shippedColAdj = (shipped.colPromoters || []).map(p => p.adjP);
  const check = [['scanP', obsPs[0], cap.scanP]];
  for (let c = 0; c < Math.min(nC, shippedColAdj.length); c++) {
    check.push([`col${c + 1} adjP`, obsColAdj[c], shippedColAdj[c]]);
  }

  const nullPs = [new Float64Array(B), new Float64Array(B)];
  const buf = new Array(nC);
  for (let b = 0; b < B; b++) {
    nullPs[0][b] = sScan(cap.perm.scan[b]);
    for (let c = 0; c < nC; c++) buf[c] = colS[c](cap.perm.cols[b][c]);
    nullPs[1][b] = Math.min(...bhFDR(buf));
  }
  return { B, k: 2, armNames: ['scan', 'per-column BH'], obsPs, check, ...exactMinP(obsPs, nullPs, B) };
}

function cccExact(cap) {
  const B = cap.B;
  const units = cap.units.filter(u => u.__s360perm && u.__s360perm.length === B);
  const stages = [1, 2, 3].filter(s => units.some(u => u.stage === s));
  const perUnit = units.map(u => {
    const up = makeUpperTail(u.dObs, u.__s360perm);
    const lo = makeLowerTail(u.dObs, u.__s360perm);
    const p2 = (x) => Math.min(1, 2 * Math.min(up(x), lo(x)));
    return { u, p2 };
  });

  const check = perUnit.slice(0, 6).map(({ u, p2 }, i) => [`unit${i + 1} p2`, p2(u.dObs), u.p2]);

  // Observed: BH within each stage over every running unit, minimum taken over
  // the units the flag is allowed to read (forensic direction and gate-passed).
  const stageArm = (getP) => stages.map(s => {
    const su = perUnit.filter(x => x.u.stage === s);
    const adj = bhFDR(su.map(x => getP(x)));
    const elig = su.map((x, i) => (x.u.forensic && x.u.gatePassed ? adj[i] : 1));
    return elig.length ? Math.min(...elig) : 1;
  });

  const obsPs = stageArm(({ u, p2 }) => p2(u.dObs));
  for (let i = 0; i < stages.length; i++) {
    const su = perUnit.filter(x => x.u.stage === stages[i]);
    const shippedElig = su.filter(x => x.u.forensic && x.u.gatePassed).map(x => x.u.adjP);
    check.push([`stage${stages[i]} arm`, obsPs[i], shippedElig.length ? Math.min(...shippedElig) : 1]);
  }

  const nullPs = stages.map(() => new Float64Array(B));
  for (let b = 0; b < B; b++) {
    const arms = stageArm(({ u, p2 }) => p2(u.__s360perm[b]));
    for (let i = 0; i < stages.length; i++) nullPs[i][b] = arms[i];
  }
  return { B, k: stages.length, armNames: stages.map(s => `stage ${s}`), obsPs, check, ...exactMinP(obsPs, nullPs, B) };
}

// ── run ─────────────────────────────────────────────────────────────
const byFixture = new Map();
for (const [f, t] of CELLS) { if (!byFixture.has(f)) byFixture.set(f, []); byFixture.get(f).push(t); }

console.log('S360 Part 3 — exact in-loop correction beside the Šidák bound');
console.log(`seed offset ${SEED_OFFSET} (shipped stream)`);
console.log(`${CELLS.length} cells on the three shared-loop tests that carry one\n`);

let checksRun = 0, checksFailed = 0;
const rows = [];

for (const [file, tests] of byFixture) {
  globalThis.__S360.loess.length = 0;
  globalThis.__S360.regionalNoise.length = 0;
  globalThis.__S360.ccc.length = 0;
  const results = await runFixture(file);
  const byName = new Map(results.map(r => [r.name, r]));

  for (const test of tests) {
    const r = byName.get(test);
    let out = null;
    if (test === 'LOESS Residual Analysis') {
      const cap = globalThis.__S360.loess.find(c => c.scanP === r.scanP && c.cusumP === r.cusumP)
        || globalThis.__S360.loess[0];
      if (cap) out = loessExact(cap);
    } else if (test === 'Regional Noise Homogeneity') {
      const cap = globalThis.__S360.regionalNoise.find(c => c.scanP === r.scanP)
        || globalThis.__S360.regionalNoise[0];
      if (cap) out = regionalExact(cap, r);
    } else if (test === 'Cross-Condition Consistency') {
      const cap = globalThis.__S360.ccc.find(c => c.primaryP === r.primaryP) || globalThis.__S360.ccc[0];
      if (cap) out = cccExact(cap);
    }
    if (!out) { console.log(`${file} · ${test} — no capture\n`); continue; }

    const bound = sidak(out.pMinObs, out.k);
    const rec = {
      fixture: file, test, flagNow: r.flag, B: out.B, k: out.k,
      arms: out.armNames.map((n, i) => ({ name: n, p: out.obsPs[i] })),
      pMin: out.pMinObs, bound, boundTier: flagFromP(bound),
      exact: out.exact, exactTier: flagFromP(out.exact),
    };
    rows.push(rec);

    console.log(`${file}  ·  ${test}  ·  now ${r.flag}   (B=${out.B}, k=${out.k})`);
    out.check.forEach(([name, mine, ship]) => {
      checksRun++;
      const ok = ship == null || Math.abs(mine - ship) < 1e-12;
      if (!ok) checksFailed++;
      console.log(`    check ${ok ? 'ok ' : 'FAIL'}  ${name.padEnd(14)} recomputed ${fmt(mine)}  shipped ${fmt(ship)}`);
    });
    out.armNames.forEach((n, i) => console.log(`    arm         ${n.padEnd(14)} ${fmt(out.obsPs[i])}`));
    console.log(`    min arm p                  ${fmt(out.pMinObs)}`);
    console.log(`    bound  Šidák k=${out.k}            ${fmt(bound)}  → ${flagFromP(bound)}`);
    console.log(`    exact  joint null          ${fmt(out.exact)}  → ${flagFromP(out.exact)}`);
    const ratio = out.exact > 0 ? bound / out.exact : null;
    console.log(`    gap    bound / exact       ${ratio == null ? '—' : ratio.toFixed(3) + '×'}` +
      `${flagFromP(bound) !== flagFromP(out.exact) ? '   ** TIER DIFFERS **' : ''}\n`);
  }
}

const saved = rows.filter(r => r.boundTier !== r.exactTier);
console.log(`— self-checks: ${checksRun - checksFailed}/${checksRun} reproduce the shipped value —`);
console.log(`— ${saved.length} of ${rows.length} cells land on a different tier under the exact correction than under the bound —`);
if (saved.length) for (const s of saved) console.log(`    ${s.fixture} · ${s.test}: bound ${s.boundTier}, exact ${s.exactTier}`);

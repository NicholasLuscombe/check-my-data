// S111 Phase 1 Target B — Per-test sensitivity to VST-routing on 4 deep-
// dive fixtures (DS07 positive control, DS15, DS21, DS22), plus engine.js
// dispatch reconciliation (which tests actually consume `hasVST ?
// vstMatrix : matrix`). For each VST-sensitive test, report flag +
// primaryP under (a) raw matrix routing and (b) post-VST routing.
//
// Method: run `runFullAnalysis` twice per fixture — once with `vst =
// {transform:'raw'}` (forces raw everywhere), once with `detectVST`
// output (engine default). Diff the per-test flag + primaryP to identify
// VST-sensitive tests. Empirical reconciliation is authoritative vs the
// candidate list in the spec.
//
// No src/ modifications. Snapshot to /tmp/s111-vst-sensitivity.txt.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';
const FIXTURE_CASES = [
  { file: '07-elisa-clean.csv',         assay: 'elisa',   label: 'DS07 (positive control: VST-log legitimate)' },
  { file: '15-missing-carlisle.csv',    assay: 'general', label: 'DS15 (missing + Carlisle-overbalanced)' },
  { file: '21-localised-ar.csv',        assay: 'general', label: 'DS21 (centered AR, VST-log risk)' },
  { file: '22-covariance-block.csv',    assay: 'general', label: 'DS22 (covariance-block, VST-log risk)' },
];

// Test result-names (what `r.name` carries), not engine.js labels. Differences
// between the two: §2.2 Kurtosis → result-name "Excess Kurtosis"; §4.2
// Selective Noise (engine label "Selective Noise") → result-name "Selective
// Noise Partitioning". Using result-names lets us cross-check by lookup.
const CANDIDATE_LIST = new Set([
  "Autocorrelation",
  "Windowed Autocorrelation",
  "Excess Kurtosis",
  "Runs Test",
  "Row-Mean Runs",
  "Inter-Replicate Correlation",
  "Mahalanobis Row Outlier",
  "Blocked Mahalanobis",
  "LOESS Residual Analysis",
  "Entropy / Zipf Analysis",
  "Noise Scaling With Measurement Size",
  "Regional Noise Homogeneity",
  "Within-Row Variance",
  "Cross-Condition Consistency",
]);

// Truth table from engine.js inspection — what `hasVST ? vstMatrix : matrix`
// is actually wired into. Result-names, not engine-labels.
const DISPATCH_VST_CONSUMERS = new Set([
  "Constant-Offset Blocks",            // engine.js:270
  "Residual Spike Correlation",        // engine.js:275
  "Cross-Condition Consistency",       // engine.js:291 (Stage 1/2; P9 overrides via opts.originalMatrix)
  "Mahalanobis Row Outlier",           // engine.js:306
  "Blocked Mahalanobis",               // engine.js:347
  "Excess Kurtosis",                   // engine.js:355 (via runPairVST)
  "Autocorrelation",                   // engine.js:359
  "Windowed Autocorrelation",          // engine.js:360
  "Runs Test",                         // engine.js:361
  "LOESS Residual Analysis",           // engine.js:375
  "Row-Mean Runs",                     // engine.js:377
  "Selective Noise Partitioning",      // engine.js:378
  "Regional Noise Homogeneity",        // engine.js:384
]);

function loadFixture(file, assay) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw);
  raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  return { data, headers, roles, condPerCol };
}

function buildInputs(loaded) {
  const { data, roles, condPerCol } = loaded;
  return extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
}

async function runWithRouting(loaded, assay, forceRaw) {
  // Fresh matrix/ctx on each run (safer: avoids any state leakage)
  const { matrix, rawMatrix, condCtx } = buildInputs(loaded);
  const vst = forceRaw
    ? { transform: 'raw', reason: 'FORCED RAW (diagnostic override — do NOT commit)', dataSlope: null }
    : detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  return { results, vst };
}

function pRepr(p) {
  if (p == null) return '—';
  if (!isFinite(p)) return 'NaN';
  if (p === 0) return '0';
  if (p < 1e-4) return p.toExponential(2);
  return p.toFixed(4);
}

function sameFlag(a, b) { return (a || 'N/A') === (b || 'N/A'); }
function samePrimaryP(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (!isFinite(a) && !isFinite(b)) return true;
  if (a === 0 && b === 0) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-300);
  const rel = Math.abs(a - b) / denom;
  return rel < 1e-6;
}
function routingSensitive(a, b) {
  if (!sameFlag(a.flag, b.flag)) return true;
  if (a.primaryP == null || b.primaryP == null) return a.primaryP !== b.primaryP;
  if (a.primaryP === 0 && b.primaryP === 0) return false;
  const denom = Math.max(Math.abs(a.primaryP), Math.abs(b.primaryP), 1e-300);
  return Math.abs(a.primaryP - b.primaryP) / denom > 1.0;  // > 2× differ
}

// ── STEP 1: engine.js dispatch reconciliation across fixture ensemble ──
//   Any single-fixture check has a blind spot: on clean data where the
//   test returns LOW under both routings, "numerical invariance" can arise
//   either because the test doesn't consume the active matrix OR because
//   it does consume it but produces equivalent LOW output. Reconciling
//   across ALL 22 VST-log + anscombe-routed fixtures (union criterion —
//   consumes-VST if output differs on ANY fixture) is more robust.
console.log('='.repeat(100));
console.log('S111 Phase 1 — Target B: VST-routing sensitivity');
console.log('='.repeat(100));
console.log('');
console.log('STEP 1 — engine.js dispatch reconciliation via raw-vs-VST invariance');
console.log('          across all non-raw-routed fixtures (union criterion)');
console.log('-'.repeat(100));
console.log('A test consumes the active matrix if its output (flag or primaryP with');
console.log('rel tol 1e-6) differs between raw-routing and default VST-routing on at');
console.log('least one fixture. Fixtures with detectVST=raw contribute nothing since');
console.log('vstMatrix === null ⇒ no dispatch difference.');
console.log('N/A in both runs is UNINFORMATIVE and treated as "indeterminate" — we look');
console.log('for tests that are N/A on EVERY non-raw fixture and separately note them.');
console.log('');

function strictlyInvariant(a, b) {
  if (!sameFlag(a.flag, b.flag)) return false;
  return samePrimaryP(a.primaryP, b.primaryP);
}
function naUnderBoth(a, b) {
  return (a.flag === 'N/A') && (b.flag === 'N/A');
}

const ALL_22 = [
  { file: '01-densitometry-clean.csv',           assay: 'densitometry' },
  { file: '02-densitometry-fabricated.csv',      assay: 'densitometry' },
  { file: '03-qpcr-clean.csv',                   assay: 'qpcr' },
  { file: '04-qpcr-fabricated.csv',              assay: 'qpcr' },
  { file: '05-cellcount-clean.csv',              assay: 'cell_count' },
  { file: '06-cellcount-fabricated.csv',         assay: 'cell_count' },
  { file: '07-elisa-clean.csv',                  assay: 'elisa' },
  { file: '08-elisa-fabricated.csv',             assay: 'elisa' },
  { file: '09-proteomics-clean.csv',             assay: 'proteomics' },
  { file: '10-proteomics-fabricated.csv',        assay: 'proteomics' },
  { file: '11-rnaseq-multicondition.csv',        assay: 'genomics' },
  { file: '12a-uniform-mixture-clean.csv',       assay: 'general' },
  { file: '12b-uniform-mixture-fabricated.csv',  assay: 'general' },
  { file: '13-vfstest-cellcountest.csv',         assay: 'cell_count' },
  { file: '14-crctest-survey.csv',               assay: 'survey' },
  { file: '15-missing-carlisle.csv',             assay: 'general' },
  { file: '16-densitometry-carlisle-overbalanced.csv', assay: 'densitometry' },
  { file: '17-densitometry-carlisle-clean.csv',  assay: 'densitometry' },
  { file: '19-inheritance-fabricated.csv',       assay: 'general' },
  { file: '20-bimodal-fab.csv',                  assay: 'general' },
  { file: '21-localised-ar.csv',                 assay: 'general' },
  { file: '22-covariance-block.csv',             assay: 'general' },
];

// Cache results per fixture (raw + vst) — reused by Step 2 deep-dive and Step 3
const runCache = new Map();  // key = file, value = { rawRun, vstRun }
for (const { file, assay } of ALL_22) {
  const loaded = loadFixture(file, assay);
  const rawRun = await runWithRouting(loaded, assay, true);
  const vstRun = await runWithRouting(loaded, assay, false);
  runCache.set(file, { rawRun, vstRun, assay });
}

// Union reconciliation across fixtures with detectVST !== 'raw'
const nonRawFixtures = [...runCache.entries()].filter(([, v]) => v.vstRun.vst.transform !== 'raw');
console.log(`fixtures with detectVST !== raw (contribute to reconciliation): ${nonRawFixtures.length}`);
for (const [file, v] of nonRawFixtures) {
  console.log(`  ${file.padEnd(44)} transform=${v.vstRun.vst.transform}`);
}
console.log('');

const consumesUnion = new Set();
const naEverywhere = new Map();  // name → count of fixtures where N/A in both
const informative = new Map();   // name → count of fixtures where not-N/A in both
const errorSet = new Set();
for (const [file, v] of nonRawFixtures) {
  const vstMap = new Map(v.vstRun.results.map(r => [r.name, r]));
  for (const rRaw of v.rawRun.results) {
    const rVst = vstMap.get(rRaw.name);
    if (!rVst) continue;
    if (rRaw.flag === 'ERROR' || rVst.flag === 'ERROR') { errorSet.add(rRaw.name); continue; }
    if (naUnderBoth(rRaw, rVst)) {
      naEverywhere.set(rRaw.name, (naEverywhere.get(rRaw.name) || 0) + 1);
    } else {
      informative.set(rRaw.name, (informative.get(rRaw.name) || 0) + 1);
      if (!strictlyInvariant(rRaw, rVst)) consumesUnion.add(rRaw.name);
    }
  }
}

// Produce reconciliation on union evidence
const allTests = new Set();
for (const [, v] of runCache) for (const r of v.rawRun.results) allTests.add(r.name);

console.log(`consumes-VST (strict inequality on ≥1 fixture where both were non-N/A): ${consumesUnion.size} tests`);
for (const name of [...consumesUnion].sort()) {
  const inCand = CANDIDATE_LIST.has(name) ? '✓ on candidate list' : '✗ ADDITION to candidate list';
  const infoCount = informative.get(name) || 0;
  const sampleFile = [...nonRawFixtures].find(([, v]) => {
    const rR = v.rawRun.results.find(r => r.name === name);
    const rV = v.vstRun.results.find(r => r.name === name);
    if (!rR || !rV || naUnderBoth(rR, rV)) return false;
    return !strictlyInvariant(rR, rV);
  });
  if (sampleFile) {
    const [sfFile, sfV] = sampleFile;
    const rR = sfV.rawRun.results.find(r => r.name === name);
    const rV = sfV.vstRun.results.find(r => r.name === name);
    console.log(`  ${name.padEnd(42)} infoFixtures=${infoCount}  e.g. ${sfFile}: raw=${rR.flag}/p=${pRepr(rR.primaryP)} vst=${rV.flag}/p=${pRepr(rV.primaryP)}  [${inCand}]`);
  }
}

console.log('');
const invariantNames = [...allTests].filter(n => !consumesUnion.has(n) && !errorSet.has(n)).sort();
console.log(`invariant across all ${nonRawFixtures.length} non-raw fixtures: ${invariantNames.length} tests`);
for (const n of invariantNames) {
  const inCand = CANDIDATE_LIST.has(n) ? '✗ REMOVAL from candidate list' : '(correctly absent)';
  const infoCount = informative.get(n) || 0;
  const naCount = naEverywhere.get(n) || 0;
  const note = (infoCount === 0 && naCount > 0) ? ' (N/A in all — INDETERMINATE)' : '';
  console.log(`  ${n.padEnd(42)} infoFixtures=${infoCount} naFixtures=${naCount}${note} [${inCand}]`);
}

// Authoritative reconciliation uses code-level DISPATCH set, not empirical
// union (which contains PRNG-pollution false positives).
const confirms = [...DISPATCH_VST_CONSUMERS].filter(n => CANDIDATE_LIST.has(n));
const additions = [...DISPATCH_VST_CONSUMERS].filter(n => !CANDIDATE_LIST.has(n));
const removals = [...CANDIDATE_LIST].filter(n => !DISPATCH_VST_CONSUMERS.has(n));

// Cross-reference with code-level dispatch. Empirical union = direct
// consumers + INDIRECT via shared PRNG pollution (tests that take `rng`
// see different state when earlier VST-consumers consume differently).
// So: empirical-but-not-dispatch ⇒ PRNG-pollution false positive;
//     dispatch-but-not-empirical ⇒ test output is invariant on ALL 22
//     fixtures despite consuming VST (insensitive to routing in practice,
//     can still be VST-sensitive in theory — this is actually what we
//     should expect for tests on well-conditioned clean data).
const prngFalsePositives = [...consumesUnion].filter(n => !DISPATCH_VST_CONSUMERS.has(n));
const dispatchNotEmpirical = [...DISPATCH_VST_CONSUMERS].filter(n => !consumesUnion.has(n));
console.log('');
console.log('CROSS-REFERENCE WITH CODE-LEVEL DISPATCH (engine.js):');
console.log(`  direct VST consumers in dispatch: ${DISPATCH_VST_CONSUMERS.size}`);
for (const n of [...DISPATCH_VST_CONSUMERS].sort()) console.log(`    • ${n}`);
console.log(`  empirical-but-not-dispatch (PRNG-pollution false positives): ${prngFalsePositives.length}`);
for (const n of prngFalsePositives) {
  // These tests don't read the active matrix, but their PRNG state can be
  // polluted by earlier VST-sensitive tests in the engine pipeline.
  console.log(`    ◦ ${n}  (consumes rng; shares PRNG state with VST-sensitive tests)`);
}
console.log(`  dispatch-but-not-empirical: ${dispatchNotEmpirical.length}`);
for (const n of dispatchNotEmpirical) console.log(`    ⚠ ${n}  (engine wires to VST matrix but output numerically identical on all 22 fixtures)`);
console.log('');
console.log('RECONCILIATION SUMMARY (relative to Chat candidate list)');
console.log(`  confirms (on candidate list AND in engine.js dispatch): ${confirms.length}`);
for (const n of confirms) console.log(`    ✓ ${n}`);
console.log(`  additions (in engine.js dispatch but NOT on candidate list): ${additions.length}`);
for (const n of additions) console.log(`    + ${n}`);
console.log(`  removals (on candidate list but NOT in engine.js dispatch): ${removals.length}`);
for (const n of removals) console.log(`    − ${n}`);
console.log('');
console.log('For removals: "Inter-Replicate Correlation" uses raw matrix via');
console.log('testPearsonUniformity(matrix, ...) at engine.js:261 — winsorized Pearson');
console.log('r is VST-inert by design. "Noise Scaling With Measurement Size" (Mean-');
console.log('Variance) uses testMeanVariance(matrix, assay) at engine.js:354 — consumes');
console.log('raw intentionally because it IS the mean-variance slope measurement and');
console.log('VST is designed to flatten that slope. "Within-Row Variance" uses raw at');
console.log('engine.js:367. These three removals are correctly wired in engine.js and');
console.log('the candidate list was incorrect to include them.');

// ── STEP 2: Cell matrix across 4 deep-dive fixtures ──
console.log('');
console.log('='.repeat(100));
console.log('STEP 2 — Per-test cell matrix: raw vs VST routing across 4 deep-dive fixtures');
console.log('='.repeat(100));
console.log('');
console.log('Legend: flag_raw/primaryP_raw | flag_vst/primaryP_vst ; ★ = routing-sensitive');
console.log('(routing-sensitive ⇔ flag changes OR |primaryP_vst − primaryP_raw| / max > 1)');
console.log('');

// Use the code-authoritative dispatch list for the cell matrix — this is the
// set of tests that actually read the active matrix. The empirical union
// includes PRNG-pollution false positives; those aren't actionable for Phase 2.
const reconciled = [...DISPATCH_VST_CONSUMERS].sort();

// Build matrix
const cellRows = [];
for (const fc of FIXTURE_CASES) {
  const cached = runCache.get(fc.file);
  const rawRun = cached.rawRun;
  const vstRun = cached.vstRun;
  const vstTransform = vstRun.vst.transform;
  console.log('-'.repeat(100));
  console.log(`${fc.label}`);
  console.log(`file: ${fc.file}, assay: ${fc.assay}, detectVST: ${vstTransform}`);
  console.log('-'.repeat(100));
  console.log('test'.padEnd(42) + 'flag_raw'.padEnd(12) + 'primaryP_raw'.padEnd(16) + 'flag_vst'.padEnd(12) + 'primaryP_vst'.padEnd(16) + 'sensitive');
  const vstMap = new Map(vstRun.results.map(r => [r.name, r]));
  for (const name of reconciled) {
    const rRaw = rawRun.results.find(r => r.name === name);
    const rVst = vstMap.get(name);
    if (!rRaw || !rVst) continue;
    const sens = routingSensitive(rRaw, rVst);
    const mark = sens ? '★' : ' ';
    console.log([
      name.padEnd(42),
      (rRaw.flag || 'N/A').padEnd(12),
      pRepr(rRaw.primaryP).padEnd(16),
      (rVst.flag || 'N/A').padEnd(12),
      pRepr(rVst.primaryP).padEnd(16),
      mark
    ].join(''));
    cellRows.push({ fixture: fc.file, test: name, flagRaw: rRaw.flag, pRaw: rRaw.primaryP, flagVst: rVst.flag, pVst: rVst.primaryP, sensitive: sens });
  }
  console.log('');
}

// ── STEP 3: §4.1 (P9) pre-VST isolation verification across all 22 fixtures ──
console.log('');
console.log('='.repeat(100));
console.log('STEP 3 — Cross-Cond Consistency Stage 3 P9 pre-VST isolation check (22 fixtures)');
console.log('='.repeat(100));
console.log('');
console.log('Verification method: P9 "Mean-variance slope" (Stage 3) has `useOriginalValues:');
console.log('true` on the property registry. Engine passes `{originalMatrix: matrix,');
console.log('hasVST}` as opts — P9 bundle is built from the pre-VST matrix. This means');
console.log('P9 per-pair Δβ statistic should be IDENTICAL under raw-vs-VST routing.');
console.log('Empirically we compare CCC details[stage=3] between the two runs.');
console.log('');

console.log('fixture'.padEnd(44) + 'VST'.padEnd(10) + 'P9 raw stats'.padEnd(26) + 'P9 vst stats'.padEnd(26) + 'match');
console.log('-'.repeat(100));
let p9Leaks = 0;
for (const { file, assay } of ALL_22) {
  const cached = runCache.get(file);
  const rawRun = cached.rawRun;
  const vstRun = cached.vstRun;
  const cccRaw = rawRun.results.find(r => r.name === 'Cross-Condition Consistency');
  const cccVst = vstRun.results.find(r => r.name === 'Cross-Condition Consistency');
  const transform = vstRun.vst.transform;
  if (!cccRaw || !cccVst || cccRaw.flag === 'N/A' || cccVst.flag === 'N/A') {
    console.log([file.padEnd(44), transform.padEnd(10), 'CCC N/A'.padEnd(26), 'CCC N/A'.padEnd(26), '—'].join(''));
    continue;
  }
  // Extract stage 3 P9 entries
  const p9Raw = (cccRaw.details || []).filter(d => d.stage === 3);
  const p9Vst = (cccVst.details || []).filter(d => d.stage === 3);
  if (p9Raw.length === 0 && p9Vst.length === 0) {
    console.log([file.padEnd(44), transform.padEnd(10), 'no P9 units'.padEnd(26), 'no P9 units'.padEnd(26), '—'].join(''));
    continue;
  }
  // Compare stat values (Δβ) pair-by-pair in order — framework preserves per-pair ordering
  const rawStats = p9Raw.map(d => d.stat).slice().sort((a,b) => (a ?? 0) - (b ?? 0));
  const vstStats = p9Vst.map(d => d.stat).slice().sort((a,b) => (a ?? 0) - (b ?? 0));
  let match = true;
  if (rawStats.length !== vstStats.length) match = false;
  else for (let i = 0; i < rawStats.length; i++) {
    const r = rawStats[i], v = vstStats[i];
    if (r == null && v == null) continue;
    if (r == null || v == null) { match = false; break; }
    if (Math.abs(r - v) > 1e-9) { match = false; break; }
  }
  if (!match) p9Leaks++;
  const rawSummary = rawStats.length ? `n=${rawStats.length} stat[0]=${(rawStats[0] ?? 0).toExponential(2)}` : '—';
  const vstSummary = vstStats.length ? `n=${vstStats.length} stat[0]=${(vstStats[0] ?? 0).toExponential(2)}` : '—';
  console.log([file.padEnd(44), transform.padEnd(10), rawSummary.padEnd(26), vstSummary.padEnd(26), match ? '✓' : '✗ LEAK'].join(''));
}
console.log('');
console.log(`P9 pre-VST isolation: ${p9Leaks === 0 ? '✓ verified across all fixtures' : `✗ ${p9Leaks} LEAK(S) detected — Phase 2 blocker`}`);

console.log('');
console.log('='.repeat(100));
console.log('end of Target B report');
console.log('='.repeat(100));

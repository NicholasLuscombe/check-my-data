// probe-s342-clean-gates.mjs — P50, the clean-corpus gate test.
//
// Question: on the clean corpus, how often does a test compute a p-value that
// would flag under its own tier ladder, and get held down to LOW by an
// effect-size gate?
//
// If that happens often, the gates are load-bearing and the underlying tests
// are unfit for this domain without them. If it almost never happens, the
// gates are doing very little. The answer decides how V1X §5.4 is framed.
//
// READ-ONLY on src/. This probe imports the engine and reads what it returns.
// It changes nothing and it does not re-implement any test.
//
// Engine setup is copied from test/validate-batch.mjs (its per-fixture block)
// so the numbers here are the numbers a batch run sees. Default seed, one run:
// the tool is deterministic per file, so one run is what a user actually gets.
//
// Usage:
//   node test/probes/probe-s342-clean-gates.mjs
//   OUT=test/probes/out-s342 node test/probes/probe-s342-clean-gates.mjs
//
// Output dir defaults to test/probes/out-s342/, matched by the
// `test/probes/out-*/` line already in .gitignore — promote.sh runs
// `git add -A` and would otherwise ship the dump (P56).

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
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
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const OUT_DIR = process.env.OUT || 'test/probes/out-s342';

// The battery's shared tier ladder. Every test in the battery uses these two
// constants; they differ only in WHICH p they feed in and in what extra
// promotion or cap steps they apply afterwards. Read from source, not hardcoded.
const tierFromP = p =>
  !Number.isFinite(p) ? 'N/A' : p < ALPHA.FLAG ? 'HIGH' : p < ALPHA.NOTE ? 'MODERATE' : 'LOW';

// ── The counterfactual table ────────────────────────────────────────────
//
// One entry per test that carries an effect-size gate, keyed by the name the
// test puts in its result object (r.name), NOT the dispatch key — this table
// is applied to returned objects. Where the two differ the dispatch key is
// named in `dispatchKey` so the mapping is auditable.
//
//   gateFired(r)  → did the gate suppress? Read off returned fields only.
//   ungatedP(r)   → the p the tier would be taken from with the gate removed,
//                   or null when that p is not recoverable from the result.
//   note          → why ungatedP is null, or a caveat on the counterfactual.
//
// Every ungatedP below was derived by reading the module's flag-decision site
// and asking: with the gate expression deleted, what does `flag` become?
const GATED = {
  "Benford's Law (First Digit)": {
    dispatchKey: "Benford's Law",
    statistic: 'MAD', threshold: 0.015, site: 'benford.js:93',
    gateFired: r => num(r.MAD) < 0.015,
    ungatedP: r => num(r.primaryP),
  },
  "Benford's Law (Second Digit)": {
    dispatchKey: "Benford's Law (2nd Digit)",
    statistic: 'MAD', threshold: 0.008, site: 'benford2.js:127',
    gateFired: r => num(r.MAD) < 0.008,
    ungatedP: r => num(r.primaryP),
  },
  'Excess Kurtosis': {
    dispatchKey: 'Kurtosis',
    statistic: 'kurtDev vs adaptiveThreshold', threshold: 'max(0.20, 1.96·√(24/N))',
    site: 'kurtosis.js:380-383',
    // esGateMode is published verbatim by the test — no re-derivation needed.
    gateFired: r => typeof r.esGateMode === 'string' && !r.esGateMode.startsWith('active'),
    ungatedP: r => num(r.pooledP),
  },
  Autocorrelation: {
    statistic: '|pooledMeanR1|', threshold: 0.25, site: 'autocorrelation.js:88',
    gateFired: r => num(r.nRows) >= 500 && Math.abs(num(r.pooledMeanR1)) < 0.25,
    ungatedP: r => num(r.primaryP),
    note: 'gate is conditional on nR >= 500',
  },
  'Runs Test': {
    statistic: 'runsRatio', threshold: 0.70, site: 'runs.js:206',
    gateFired: r => num(r.nRows) >= 500 && num(r.runsRatio) > 0.70,
    ungatedP: r => num(r.minAdjP ?? r.primaryP),
    note: 'gate is conditional on nR >= 500',
  },
  'Constant-Offset Blocks': {
    statistic: 'blockRate', threshold: 0.01, site: 'constantOffset.js:102',
    gateFired: r => num(r.nRows) >= 500 && num(r.blockRate) < 0.01,
    ungatedP: r => num(r.primaryP),
    note: 'gate is conditional on nR >= 500',
  },
  'Regional Noise Homogeneity': {
    statistic: 'bestVarRatio', threshold: 2.0, site: 'regionalNoise.js:185',
    gateFired: r => num(r.nRows) >= 500 && ratio(r.bestVarRatio) < 2.0,
    ungatedP: r => num(r.primaryP),
    note: 'gate is conditional on nR >= 500',
  },
  'LOESS Residual Analysis': {
    statistic: 'bestVarRatio', threshold: 2.0, site: 'loessResidual.js:219',
    gateFired: r => num(r.nRows) >= 500 && ratio(r.bestVarRatio) < 2.0,
    // ungated flag is combinedFlag = tier(min(scanP, cusumP)) — both published.
    ungatedP: r => minDef(num(r.scanP), num(r.cusumP)),
    note: 'gate is conditional on nR >= 500; ungated tier is tier(min(scanP,cusumP))',
  },
  'Within-Row Variance': {
    statistic: 'nSmooth / smoothFrac', threshold: 'nSmooth<3 || smoothFrac<0.01',
    site: 'withinRowVariance.js:154-156',
    gateFired: r => num(r.nSmooth) < 3 || num(r.smoothFrac) < 0.01,
    ungatedP: r => num(r.primaryP),
    note: 'unconditional — no N precondition',
  },
  'Baseline Balance': {
    statistic: 'excessFrac', threshold: 0.50, site: 'carlisleBalance.js:151-153',
    gateFired: r => num(r.excessFrac) < 0.50,
    ungatedP: r => num(r.primaryP),
    note: 'unconditional — no N precondition',
  },
  'Entropy / Zipf Analysis': {
    statistic: 'per-column |ratio−1|', threshold: 0.15, site: 'entropyTest.js:134-138',
    // primaryP is the UNGATED min over all columns; flag uses the gated subset.
    gateFired: r => tierFromP(num(r.primaryP)) !== 'LOW' && r.flag === 'LOW',
    ungatedP: r => num(r.primaryP),
    note: 'primaryP is min over ALL columns, before the gate — fully recoverable',
  },
  'Column Goodness-of-Fit': {
    statistic: 'per-column ratio', threshold: 'ratio>=2.0 (high) / <=0.5 (low)',
    site: 'columnGof.js:229-231',
    gateFired: r => tierFromP(num(r.primaryP)) !== 'LOW' && r.flag === 'LOW',
    ungatedP: r => num(r.primaryP),
    note: 'primaryP is min over ALL columns, before the gate — fully recoverable',
  },
  'Modality Test': {
    statistic: 'per-column D_obs', threshold: 0.04, site: 'modality.js:247',
    gateFired: r => tierFromP(num(r.primaryP)) !== 'LOW' && r.flag === 'LOW',
    ungatedP: r => num(r.primaryP),
    note: 'primaryP is min over ALL columns, before the gate — fully recoverable',
  },
  'Inter-Replicate Correlation': {
    statistic: 'allHighSNR; per-pair excess', threshold: 'SNR gate; excess>0.01/0.05',
    site: 'interReplicateCorrelation.js:283, :156',
    gateFired: r => r.allHighSNR === true,
    ungatedP: r => num(r.primaryP),
    note: 'counterfactual approximate — removing the SNR gate re-routes through the suspicious-pair branch, which has its own excess gate',
  },
  'Mahalanobis Row Outlier': {
    statistic: 'nOutliers; exceedFrac', threshold: 'nOut===0; exceedFrac<2·ALPHA_BIN',
    site: 'mahalanobis.js:180-181',
    gateFired: r => num(r.nOutliers) === 0 || r.gated === true,
    ungatedP: r => num(r.primaryP),
  },
  // The three below were NOT RECOVERABLE at the first S342 pass. Each now
  // publishes `primaryPUngated` — the minimum the test would report with its
  // effect-size gate expression deleted and nothing else changed — plus
  // `nGateSuppressed`, the number of units the gate alone removed.
  'Selective Noise Partitioning': {
    statistic: 'per-block variance ratio', threshold: 3.0,
    site: 'selectiveNoise.js:174, :234',
    gateFired: r => num(r.nGateSuppressed) > 0,
    ungatedP: r => num(r.primaryPUngated),
    note: 'stratified path re-runs BH over the real p-values (same family size, no 1.0 placeholders); single-run path already published the raw p, so ungated === primaryP there',
  },
  'Cross-Condition Consistency': {
    statistic: 'per-unit effectSizeGate', threshold: 'per-property; only when nMin>=500',
    site: 'crossConditionConsistency.js:602, :618',
    gateFired: r => num(r.nGateSuppressed) > 0,
    ungatedP: r => num(r.primaryPUngated),
    note: 'effect-size gate dropped, forensic-direction filter kept; BH is upstream of both so no re-run is needed',
  },
  'Value-Frequency Spike': {
    statistic: 'per-spike ratio / near-dup', threshold: 'ratio>=2.0; near-dup keep-path',
    site: 'valueFrequencySpike.js:488, :496, :505',
    gateFired: r => num(r.nGateSuppressed) > 0,
    ungatedP: r => num(r.primaryPUngated),
    note: 'ratio/passesEffect dropped, isNearDup keep-path kept; BH is upstream of the filter so families keep their size and ranks',
  },
};

// Tests with no effect-size gate at all — listed so the report can state the
// complement explicitly rather than by omission.
const UNGATED_TESTS = [
  'Exact Duplicate Detection', 'Sequential Duplication', 'Residual Spike Correlation',
  'Terminal Digit Uniformity', 'Decimal Precision Consistency',
  'Noise Scaling With Measurement Size', 'Windowed Autocorrelation', 'Row-Mean Runs',
  'Blocked Mahalanobis', 'Missing Data Pattern', 'Cross-Condition Rank Correlation',
];

const num = v => {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : NaN;
};
// bestVarRatio is published as "9.80×" — strip the multiplication sign.
const ratio = v => num(String(v ?? '').replace(/[^\d.eE+-]/g, ''));
const minDef = (a, b) => {
  const xs = [a, b].filter(Number.isFinite);
  return xs.length ? Math.min(...xs) : NaN;
};

async function runFixture(file, expected) {
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
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );
  const { severity } = computeSeverity(results);
  return { results, severity, nRows: matrix.length, nCols: matrix[0]?.length ?? 0 };
}

// ── Run ─────────────────────────────────────────────────────────────────
const cleanFiles = Object.entries(EXPECTED).filter(([, e]) => e.severity === 0);
mkdirSync(OUT_DIR, { recursive: true });

const rows = [];          // one per (fixture, gated test) cell that ran
const notRecoverable = []; // cells whose pre-gate p cannot be read back
const dump = {};

console.log(`Clean fixtures declared in test/batch-fixtures.mjs: ${cleanFiles.length}\n`);

for (const [file, expected] of cleanFiles) {
  const { results, severity, nRows, nCols } = await runFixture(file, expected);
  dump[file] = { severity, nRows, nCols, results };
  if (severity !== 0) console.log(`!! ${file} ran at severity ${severity}, declared 0`);

  for (const r of results) {
    const spec = GATED[r.name];
    if (!spec) continue;
    if (r.flag === 'N/A') continue;   // did not run — no p, no gate decision

    const ungated = spec.ungatedP(r);
    if (ungated == null || !Number.isFinite(ungated)) {
      notRecoverable.push({ file, test: r.name, emitted: r.flag, why: spec.note });
      continue;
    }
    const fired = spec.gateFired(r);
    const pAloneTier = tierFromP(ungated);
    rows.push({
      file, test: r.name, p: ungated, pAloneTier, emitted: r.flag,
      gateFired: fired === true,
      saved: pAloneTier !== 'LOW' && r.flag === 'LOW',
      statistic: spec.statistic, threshold: spec.threshold, site: spec.site,
    });
  }
}

writeFileSync(join(OUT_DIR, 'clean-corpus-dump.json'), JSON.stringify(dump, null, 2));

// ── Report ──────────────────────────────────────────────────────────────
const saved = rows.filter(r => r.saved);

console.log('── Every gated test × clean fixture cell that ran ──');
console.log('fixture'.padEnd(38) + 'test'.padEnd(32) + 'p'.padEnd(12) + 'p-alone'.padEnd(10) + 'emitted'.padEnd(10) + 'saved');
for (const r of rows.sort((a, b) => a.p - b.p)) {
  console.log(
    r.file.padEnd(38) + r.test.padEnd(32) +
    fmtP(r.p).padEnd(12) + r.pAloneTier.padEnd(10) + r.emitted.padEnd(10) +
    (r.saved ? 'YES' : '')
  );
}

console.log('\n── Headline counts ──');
console.log(`cells:    ${saved.length}   (rule: one cell = one (clean fixture × gated test) pair where the test ran, its p is recoverable, tier(p) != LOW, and the emitted flag is LOW)`);
const savedFixtures = new Set(saved.map(r => r.file));
const savedTests = new Set(saved.map(r => r.test));
console.log(`fixtures: ${savedFixtures.size}   (rule: distinct clean fixtures carrying >=1 such cell) ${savedFixtures.size ? '— ' + [...savedFixtures].join(', ') : ''}`);
console.log(`tests:    ${savedTests.size}   (rule: distinct tests carrying >=1 such cell) ${savedTests.size ? '— ' + [...savedTests].join(', ') : ''}`);

console.log('\n── Proximity: gate-saved cells whose p is within a factor of two of the tier it would have crossed ──');
if (!saved.length) console.log('  (none — no gate-saved cells)');
for (const r of saved) {
  const crossed = r.pAloneTier === 'HIGH' ? ALPHA.FLAG : ALPHA.NOTE;
  const factor = crossed / r.p;
  console.log(`  ${r.file} / ${r.test}: p=${fmtP(r.p)} vs ${crossed} — factor ${factor.toFixed(2)}${factor < 2 ? '   WITHIN 2x' : ''}`);
}

console.log('\n── Not recoverable (blind spot) ──');
if (!notRecoverable.length) console.log('  (none)');
for (const r of notRecoverable) console.log(`  ${r.file} / ${r.test} — emitted ${r.emitted}\n      ${r.why}`);

console.log('\n── Coverage check: gated tests that never produced a readable cell on any clean fixture ──');
const seen = new Set(rows.map(r => r.test));
for (const t of Object.keys(GATED)) if (!seen.has(t)) console.log(`  ${t}`);

console.log(`\nDump written: ${join(OUT_DIR, 'clean-corpus-dump.json')}`);
console.log(`Gated tests in table: ${Object.keys(GATED).length}; ungated tests listed: ${UNGATED_TESTS.length}; total ${Object.keys(GATED).length + UNGATED_TESTS.length}`);

function fmtP(p) {
  if (!Number.isFinite(p)) return String(p);
  if (p === 0) return '0';
  return p < 1e-4 ? p.toExponential(2) : String(Number(p.toPrecision(4)));
}

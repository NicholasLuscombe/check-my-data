// S139b — DS01 applicability dimming verification.
// (1) Confirms METHOD_BATTERY covers all 28 canonical tests in TEST_MECHANISM.
// (2) Runs the engine on DS01, builds the applied/skipped partition off
//     r.flag === "N/A", cross-references against METHOD_BATTERY by name.
// (3) Reports per-category dim state (all members skipped → category dims).
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');
const { TEST_MECHANISM } = await import('../src/constants/mechanisms.js');

// Mirror METHOD_BATTERY from ReportView.jsx (module-top constant).
const METHOD_BATTERY = [
  { label: "Copy, paste, edit", tests: [
    ["Exact Duplicate Detection",          "Duplicate detection"],
    ["Constant-Offset Blocks",             "constant-offset blocks"],
    ["Residual Spike Correlation",         "residual spike correlation"],
  ]},
  { label: "Unusual digits", tests: [
    ["Terminal Digit Uniformity",          "Terminal digit preference"],
    ["Benford's Law (First Digit)",        "Benford 1st digit"],
    ["Benford's Law (Second Digit)",       "Benford 2nd digit"],
    ["Decimal Precision Consistency",      "decimal precision clustering"],
    ["Value-Frequency Spike",              "value-frequency spikes"],
  ]},
  { label: "Distribution shapes", tests: [
    ["Entropy / Zipf Analysis",            "Entropy / Zipf analysis"],
    ["Column Goodness-of-Fit",             "column goodness-of-fit"],
    ["Modality Test",                      "modality test"],
  ]},
  { label: "Cross-replicate comparisons", tests: [
    ["Inter-Replicate Correlation",        "Inter-replicate correlation"],
    ["Excess Kurtosis",                    "kurtosis + Anderson-Darling"],
    ["Autocorrelation",                    "autocorrelation"],
    ["Windowed Autocorrelation",           "windowed autocorrelation"],
    ["Runs Test",                          "runs test"],
    ["Noise Scaling With Measurement Size","noise scaling"],
    ["Within-Row Variance",                "within-row variance"],
    ["Selective Noise Partitioning",       "selective noise"],
    ["Regional Noise Homogeneity",         "regional noise"],
    ["LOESS Residual Analysis",            "LOESS + CUSUM noise changepoint"],
    ["Row-Mean Runs",                      "row-mean runs"],
    ["Mahalanobis Row Outlier",            "Mahalanobis unusual rows"],
    ["Blocked Mahalanobis",                "blocked Mahalanobis"],
    ["Missing Data Pattern",               "missing data patterns"],
  ]},
  { label: "Cross-group comparisons", tests: [
    ["Cross-Condition Rank Correlation",   "Cross-condition Spearman rank"],
    ["Baseline Balance",                   "Carlisle condition balance"],
    ["Cross-Condition Consistency",        "cross-condition consistency"],
  ]},
];

// ───────── (1) coverage check ─────────
const batteryNames = new Set(METHOD_BATTERY.flatMap(c => c.tests.map(([n]) => n)));
const canonicalNames = new Set(Object.keys(TEST_MECHANISM));
const missingFromBattery = [...canonicalNames].filter(n => !batteryNames.has(n));
const extraInBattery     = [...batteryNames].filter(n => !canonicalNames.has(n));

console.log(`METHOD_BATTERY size: ${batteryNames.size}`);
console.log(`TEST_MECHANISM size: ${canonicalNames.size}`);
console.log(`Missing from METHOD_BATTERY: ${missingFromBattery.length ? missingFromBattery.join(', ') : '(none)'}`);
console.log(`Extra in METHOD_BATTERY (not canonical): ${extraInBattery.length ? extraInBattery.join(', ') : '(none)'}`);
console.log('');

// ───────── (2) DS01 engine run ─────────
const file = '01-densitometry-clean.csv';
const assay = 'densitometry';
const csv = readFileSync(join('test/fixtures', file), 'utf-8');
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
let raw = parsed.data;
const pp = preprocessRaw(raw); raw = pp.rows;
const headerRows = detectHeaderRows(raw);
let condPerCol = null;
if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);
const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
const vst = detectVST(matrix, assay);
const dataType = assay === 'cell_count' ? 'count' : 'continuous';
const lfDet = detectLongFormat(headers, data);
const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
const rowSemantics = rsSuggestion.value || 'ordered';

const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);

// ───────── (3) partition + cross-ref ─────────
const flagByName = new Map();
for (const r of results) flagByName.set(r.name, r.flag);

const skippedNames = new Set(results.filter(r => r.flag === 'N/A').map(r => r.name));
const appliedNames = new Set(results.filter(r => r.flag !== 'N/A').map(r => r.name));

console.log(`DS01 totals: results.length=${results.length}, applied=${appliedNames.size}, skipped=${skippedNames.size}`);
console.log('');

// Per-category render simulation (Shape A): show dim state at category + per-test level.
let anyCategoryDimmed = false;
for (const cat of METHOD_BATTERY) {
  const flags = cat.tests.map(([n]) => flagByName.get(n));
  const allSkipped = cat.tests.every(([n]) => skippedNames.has(n));
  if (allSkipped) anyCategoryDimmed = true;
  const tag = allSkipped ? '[CATEGORY DIMMED]' : '';
  console.log(`${cat.label}: ${tag}`);
  cat.tests.forEach(([n, label], i) => {
    const flag = flagByName.get(n);
    const present = flagByName.has(n);
    const skipped = skippedNames.has(n);
    const marker = !present ? '✗ NOT IN RESULTS' : (skipped ? '· dimmed' : '  applied');
    console.log(`   ${marker}  ${label.padEnd(36)} (flag=${flag ?? 'absent'})  [${n}]`);
  });
  console.log('');
}

// ───────── (4) cross-check completeness ─────────
const resultsNames = new Set(results.map(r => r.name));
const inResultsButNotInBattery = [...resultsNames].filter(n => !batteryNames.has(n));
const inBatteryButNotInResults = [...batteryNames].filter(n => !resultsNames.has(n));
console.log(`Tests in results[] but not in METHOD_BATTERY: ${inResultsButNotInBattery.length ? inResultsButNotInBattery.join(', ') : '(none)'}`);
console.log(`Tests in METHOD_BATTERY but not in results[]: ${inBatteryButNotInResults.length ? inBatteryButNotInResults.join(', ') : '(none)'}`);
console.log('');
console.log(`Any DS01 category fully dimmed? ${anyCategoryDimmed ? 'YES' : 'no'}`);
console.log('');
console.log('Skipped names (DS01):');
for (const n of [...skippedNames].sort()) console.log(`   ${n}`);

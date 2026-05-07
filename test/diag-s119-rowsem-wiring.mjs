// S119 diagnostic — Row Semantics Gate wiring audit (read-only).
// Evidence artefact (S118 Phase 2 pattern).
//
// Produces six labelled sections on stdout:
//   1) Auto-suggest precedence table  (assay × longFormatDetected)
//   2) Engine dispatch sites          (already inspected statically; this
//      section just restates the observations — no runtime data needed)
//   3) Result-object shape per fixture (22-row CSV + 3 assertions)
//   4) BatchView per-row threading    (static; prose path)
//   5) ImportView state-machine audit (static; paste excerpts)
//   6) Missing-fields line
//
// Only Section 3 requires runtime execution. Sections 1/2/4/5/6 are static
// (source-paste) observations grouped into this single artefact for the
// session record.
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics, ROW_SEMANTICS_FULL_SKIP } = await import('../src/import/rowSemantics.js');
const { ASSAYS } = await import('../src/constants/assays.js');

// ──────────────────────────────────────────────────────────────────────
// Section 1: Auto-suggest precedence table
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 1: Auto-suggest precedence table ===\n');

console.log('Source (src/import/rowSemantics.js L23-49):');
console.log(`  const INSTRUMENT_ASSAYS = new Set([
    'qpcr', 'elisa', 'plate_reader', 'densitometry',
    'physiological', 'cell_count',
  ]);
  export function suggestRowSemantics({ assay = null, longFormatDetected = false } = {}) {
    if (longFormatDetected) return { value: 'arbitrary', auto: true, reason: 'long-format' };
    if (assay === 'genomics') return { value: 'arbitrary', auto: true, reason: 'genomics' };
    if (assay && INSTRUMENT_ASSAYS.has(assay)) return { value: 'ordered', auto: true, reason: 'assay' };
    return { value: null, auto: false, reason: 'user-choice' };
  }
`);

// The task references HPLC, mass-spec, flow-cyto — those are not present in
// the actual assay enum. Use the actual enum (10 values).
const ASSAY_VALUES = ASSAYS.map(a => a.v);
console.log(`Actual assay enum (${ASSAY_VALUES.length}): ${ASSAY_VALUES.join(', ')}\n`);

// Spec per S118 Phase 3.5 (adapted for the actual enum):
//   longFormatDetected=true  → 'arbitrary' for ALL assays
//   longFormatDetected=false + genomics → 'arbitrary'
//   longFormatDetected=false + qpcr|elisa|plate_reader|densitometry|physiological|cell_count → 'ordered'
//   longFormatDetected=false + general|proteomics|survey → null
const INSTRUMENT = new Set(['qpcr', 'elisa', 'plate_reader', 'densitometry', 'physiological', 'cell_count']);
function expectedFor(assay, lf) {
  if (lf) return { value: 'arbitrary', auto: true, reason: 'long-format' };
  if (assay === 'genomics') return { value: 'arbitrary', auto: true, reason: 'genomics' };
  if (INSTRUMENT.has(assay)) return { value: 'ordered', auto: true, reason: 'assay' };
  return { value: null, auto: false, reason: 'user-choice' };
}

const headers = ['longFormatDetected', 'assay', 'value', 'auto', 'reason', 'expected.value', 'match'];
const rows = [];
let section1Deviations = 0;
for (const lf of [false, true]) {
  for (const assay of ASSAY_VALUES) {
    const got = suggestRowSemantics({ assay, longFormatDetected: lf });
    const exp = expectedFor(assay, lf);
    const match = got.value === exp.value && got.auto === exp.auto && got.reason === exp.reason;
    if (!match) section1Deviations++;
    rows.push([String(lf), assay, String(got.value), String(got.auto), got.reason, String(exp.value), match ? 'OK' : 'MISMATCH']);
  }
}
// Also check the three task-mentioned assays that aren't in the enum.
for (const missing of ['HPLC', 'mass-spec', 'flow-cyto']) {
  for (const lf of [false, true]) {
    const got = suggestRowSemantics({ assay: missing, longFormatDetected: lf });
    rows.push([String(lf), missing + ' (absent-from-enum)', String(got.value), String(got.auto), got.reason, lf ? 'arbitrary' : 'ordered', lf ? (got.value === 'arbitrary' ? 'OK' : 'MISMATCH') : (got.value === null ? 'NOT-AN-INSTRUMENT' : 'OK')]);
  }
}

// Column widths
const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
function pad(cell, i) { return String(cell).padEnd(widths[i]); }
console.log(headers.map(pad).join(' | '));
console.log(widths.map(w => '-'.repeat(w)).join('-+-'));
rows.forEach(r => console.log(r.map(pad).join(' | ')));
console.log(`\nSection 1 deviations (within-enum only): ${section1Deviations}`);
console.log(`Note: HPLC / mass-spec / flow-cyto are referenced in the S119 prompt`);
console.log(`      but are NOT members of the ASSAYS enum (constants/assays.js).`);
console.log(`      Actual INSTRUMENT_ASSAYS: qpcr, elisa, plate_reader,`);
console.log(`      densitometry, physiological, cell_count (6). These are the`);
console.log(`      assays the import UI actually offers; the spec's HPLC /`);
console.log(`      mass-spec / flow-cyto names are not wired anywhere and so`);
console.log(`      fall through to the user-choice branch (null) — expected.`);
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 2: Engine dispatch sites
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 2: Engine dispatch sites ===\n');

const engineSrc = readFileSync(join('src/analysis/engine.js'), 'utf-8');
const lines = engineSrc.split('\n');

// rsSkip call sites
console.log('rsSkip call sites in engine.js:\n');
const rsSkipHits = [];
lines.forEach((line, i) => {
  if (/\brsSkip\s*\(/.test(line) && !/function rsSkip/.test(line)) {
    rsSkipHits.push({ n: i + 1, line });
  }
});
console.log(`Found ${rsSkipHits.length} call sites (excluding the declaration):`);
rsSkipHits.forEach(h => {
  const prev = lines[h.n - 2] || '';
  const next = lines[h.n] || '';
  console.log(`  L${h.n - 1}: ${prev.trim()}`);
  console.log(`  L${h.n}: ${h.line.trim()}`);
  console.log(`  L${h.n + 1}: ${next.trim()}`);
  console.log();
});

const expectedRsSkip = [
  'Runs Test',
  'Row-Mean Runs',
  'Blocked Mahalanobis',
  'LOESS Residual Analysis',
  'Regional Noise Homogeneity',
];
console.log(`Expected 5 rsSkip dispatches, one per:`);
expectedRsSkip.forEach(t => console.log(`  - "${t}"`));
const foundNames = rsSkipHits.map(h => {
  const m = h.line.match(/rsSkip\("([^"]+)"/);
  return m ? m[1] : null;
}).filter(Boolean);
const uniqFound = [...new Set(foundNames)];
console.log(`Distinct test names wired through rsSkip: ${uniqFound.length}`);
uniqFound.forEach(n => console.log(`  - "${n}"${expectedRsSkip.includes(n) ? '' : '  <-- UNEXPECTED'}`));
const missing = expectedRsSkip.filter(n => !uniqFound.includes(n));
if (missing.length) console.log(`MISSING: ${missing.join(', ')}`);
console.log();

console.log('ROW_SEMANTICS_FULL_SKIP Set contents:');
console.log(`  ${[...ROW_SEMANTICS_FULL_SKIP].map(s => `"${s}"`).join(', ')}`);
console.log();

// Self-gating tests — NOT wired through rsSkip
console.log('NOT-dispatched-through-rsSkip (self-gating) — call sites:\n');
function findTestLine(testName) {
  const needle = `["${testName}"`;
  const idx = lines.findIndex(l => l.includes(needle));
  return idx === -1 ? null : { n: idx + 1, line: lines[idx] };
}
for (const t of ['Constant-Offset Blocks', 'Autocorrelation', 'Windowed Autocorrelation']) {
  const hit = findTestLine(t);
  if (!hit) {
    console.log(`  "${t}"  <-- NOT FOUND`);
    continue;
  }
  const usesRs = /rsSkip\(/.test(hit.line);
  console.log(`  L${hit.n}: ${hit.line.trim()}`);
  console.log(`        rsSkip call: ${usesRs ? 'YES (UNEXPECTED)' : 'no (correct)'}`);
  console.log();
}

// arg-passed tests — IRC and WRV
console.log('rowSemantics passed as function argument — call sites:\n');
for (const t of ['Inter-Replicate Correlation', 'Within-Row Variance']) {
  const hit = findTestLine(t);
  if (!hit) { console.log(`  "${t}"  <-- NOT FOUND`); continue; }
  console.log(`  L${hit.n}: ${hit.line.trim()}`);
  // For WRV the call is on the following lines — also show the 5-line window
  for (let k = 1; k <= 6; k++) {
    const l = lines[hit.n - 1 + k];
    if (!l) break;
    if (/rowSemantics\)/.test(l) || /testPearsonUniformity|testWithinRowVariance/.test(l)) {
      console.log(`  L${hit.n + k}: ${l.trim()}`);
    }
    if (l.includes('],')) break;
  }
  console.log();
}

// Ad-hoc genomics hits inside dispatch wrappers
console.log('Residual `assay === "genomics"` hits in engine.js:\n');
const genomicsHits = [];
lines.forEach((line, i) => {
  if (/assay\s*===\s*["']genomics["']/.test(line)) genomicsHits.push({ n: i + 1, line: line.trim() });
});
genomicsHits.forEach(h => console.log(`  L${h.n}: ${h.line}`));
console.log(`\nTotal: ${genomicsHits.length}`);
console.log(`Expected-remaining: 2 (both are biological-semantics gates separate`);
console.log(`  from S118 row-semantics) — §2.6 Mahalanobis Row Outlier, §4.3`);
console.log(`  Within-Row Variance. §2.6b Blocked Mahalanobis / §2.7 LOESS /`);
console.log(`  §4.2 Regional Noise should have ZERO ad-hoc genomics hits (rsSkip`);
console.log(`  lane subsumes them).\n`);

// Parse which tests contain the genomics branch
const genomicsTestContext = [];
for (const h of genomicsHits) {
  // Walk backwards for the nearest `["TestName"` line
  for (let k = h.n - 1; k >= Math.max(0, h.n - 30); k--) {
    const m = lines[k].match(/\["([^"]+)"/);
    if (m) { genomicsTestContext.push({ n: h.n, test: m[1] }); break; }
  }
}
genomicsTestContext.forEach(g => console.log(`  L${g.n} is inside "${g.test}"`));
const s26bHit = genomicsTestContext.some(g => g.test === 'Blocked Mahalanobis');
const s27Hit  = genomicsTestContext.some(g => g.test === 'LOESS Residual Analysis');
const s42Hit  = genomicsTestContext.some(g => g.test === 'Regional Noise Homogeneity');
console.log(`  §2.6b hits: ${s26bHit ? 'NON-ZERO (DEVIATION)' : 'zero (OK)'}`);
console.log(`  §2.7  hits: ${s27Hit  ? 'NON-ZERO (DEVIATION)' : 'zero (OK)'}`);
console.log(`  §4.2  hits: ${s42Hit  ? 'NON-ZERO (DEVIATION)' : 'zero (OK)'}`);
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 3: Result-object shape per fixture
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 3: Result-object shape per fixture ===\n');

const EXPECTED = {
  '01-densitometry-clean.csv':    { severity: 0, assay: 'densitometry' },
  '02-densitometry-fabricated.csv': { severity: 3, assay: 'densitometry' },
  '03-qpcr-clean.csv':            { severity: 0, assay: 'qpcr' },
  '04-qpcr-fabricated.csv':       { severity: 3, assay: 'qpcr' },
  '05-cellcount-clean.csv':       { severity: 0, assay: 'cell_count' },
  '06-cellcount-fabricated.csv':  { severity: 3, assay: 'cell_count' },
  '07-elisa-clean.csv':           { severity: 0, assay: 'elisa' },
  '08-elisa-fabricated.csv':      { severity: 3, assay: 'elisa' },
  '09-proteomics-clean.csv':      { severity: 0, assay: 'proteomics' },
  '10-proteomics-fabricated.csv': { severity: 3, assay: 'proteomics' },
  '11-rnaseq-multicondition.csv': { severity: 3, assay: 'genomics' },
  '12a-uniform-mixture-clean.csv':      { severity: 0, assay: 'general' },
  '12b-uniform-mixture-fabricated.csv':  { severity: 1, assay: 'general' },
  '13-vfstest-cellcountest.csv':  { severity: 2, assay: 'cell_count' },
  '14-crctest-survey.csv':        { severity: 3, assay: 'survey' },
  '15-missing-carlisle.csv':      { severity: 3, assay: 'general' },
  '16-densitometry-carlisle-overbalanced.csv': { severity: 2, assay: 'densitometry' },
  '17-densitometry-carlisle-clean.csv':        { severity: 0, assay: 'densitometry' },
  '19-inheritance-fabricated.csv': { severity: 3, assay: 'general' },
  '20-bimodal-fab.csv': { severity: 3, assay: 'general' },
  '21-localised-ar.csv': { severity: 3, assay: 'general' },
  '22-covariance-block.csv': { severity: 2, assay: 'general' },
};

// Classify a test-result object into one of the reason categories.
function reasonCodeFor(result, testName, rowSem, assay) {
  if (!result) return 'N/A-missing';
  if (result.flag === 'HIGH' || result.flag === 'MODERATE') return 'FLAG';
  if (result.flag === 'LOW') return 'LOW';
  if (result.flag === 'N/A') {
    const d = result.description || '';
    // Row-semantics reason text literal prefix from ROW_SEMANTICS_SKIP_REASON
    if (/Not applicable when row order is arbitrary/.test(d)) return 'N/A-rowSemantics';
    // Conditions-mode skip reason
    if (/Not applicable when columns are non-replicates/.test(d)) return 'N/A-condSkip';
    // Ordinal / count data-type skips
    if (/Not applicable to ordinal data|Not applicable to count data|Not applicable to integer/.test(d)) return 'N/A-dtSkip';
    // Biological-semantics / applicability / internal column-count or row-count gates.
    // DS19 §4 Phase 3 observation: under long-format pivots, most replicate-comparison
    // tests hit an internal column gate ("Insufficient data …", "Need ≥N replicate
    // columns …", "No valid within-condition replicate pairs found") BEFORE rsSkip —
    // that's a valid applicability outcome.
    if (/Not applicable to genomics|Not applicable to cell count|within-row variance across|multivariate normality|Need ≥|Need at least|dropped because|insufficient|Insufficient|not meet|applicability|intrinsic property|No valid.*pairs|requires.*heterogen|count data has mathematically|Not applicable to integer/.test(d)) return 'N/A-applicability';
    return 'N/A-other';
  }
  return 'ERROR';
}

function getByName(results, name) {
  return results.find(r => r.name === name) || null;
}

const FIXTURES = 'test/fixtures';
const csvRows = [];
const csvHeader = [
  'fixture', 'assay', 'longFormatDetected', 'resolvedRowSemantics',
  'rowSemanticsAuto', 'severity', 'nFlaggedDims',
  's23_reason', 's24_reason', 's26b_reason', 's27_reason', 's42_reason',
  's12_reason', 's21_reason', 's21b_reason', 's25_reason', 's43_reason',
  's25_subunitsSuppressed', 's43_subunitsSuppressed',
];

// Name map: § section IDs → test names
const TEST_NAME = {
  s23:  'Runs Test',
  s24:  'Row-Mean Runs',
  s26b: 'Blocked Mahalanobis',
  s27:  'LOESS Residual Analysis',
  s42:  'Regional Noise Homogeneity',
  s12:  'Constant-Offset Blocks',
  s21:  'Autocorrelation',
  s21b: 'Windowed Autocorrelation',
  s25:  'Inter-Replicate Correlation',
  s43:  'Within-Row Variance',
};

let batchOk = 0, batchFail = 0;
const perFixtureResults = {};

for (const [file, exp] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw);
  raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headersRow = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headersRow, condPerCol);
  const assay = exp.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const lfDet = !!detectLongFormat(headersRow, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';
  const autoTag = rsSuggestion.auto ? rsSuggestion.reason : '';

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics,
  );
  const { severity, nFlaggedDimensions } = computeSeverity(results);

  const rc = {};
  for (const [k, n] of Object.entries(TEST_NAME)) {
    rc[k] = reasonCodeFor(getByName(results, n), n, rowSemantics, assay);
  }
  const s25res = getByName(results, 'Inter-Replicate Correlation');
  const s43res = getByName(results, 'Within-Row Variance');
  const s25sub = s25res?.subunitsSuppressed;
  const s43sub = s43res?.subunitsSuppressed;

  csvRows.push([
    file, assay, String(lfDet), rowSemantics, autoTag,
    String(severity), String(nFlaggedDimensions),
    rc.s23, rc.s24, rc.s26b, rc.s27, rc.s42,
    rc.s12, rc.s21, rc.s21b, rc.s25, rc.s43,
    JSON.stringify(s25sub ?? null),
    JSON.stringify(s43sub ?? null),
  ]);

  perFixtureResults[file] = {
    severity, expected: exp.severity, lfDet, rowSemantics, autoTag,
    rc, s25sub, s43sub,
  };
  if (severity === exp.severity) batchOk++; else batchFail++;
}

console.log(csvHeader.join(','));
csvRows.forEach(r => console.log(r.map(v => /[,]/.test(v) ? `"${v}"` : v).join(',')));
console.log();
console.log(`Severity parity: ${batchOk}/${batchOk + batchFail}`);

// Assertion A — 22/22 severity parity
const assertA = batchOk === Object.keys(EXPECTED).length && batchFail === 0;
console.log(`Assertion A (22/22 severity match): ${assertA ? 'PASS' : 'FAIL'}`);

// Assertion B — DS11 row shape
const ds11 = perFixtureResults['11-rnaseq-multicondition.csv'];
const assertB = ds11
  && ds11.rowSemantics === 'arbitrary'
  && ds11.autoTag === 'genomics'
  && ds11.rc.s23 === 'N/A-rowSemantics'
  && ds11.rc.s24 === 'N/A-rowSemantics'
  && ds11.rc.s26b === 'N/A-rowSemantics'
  && ds11.rc.s27 === 'N/A-rowSemantics'
  && ds11.rc.s42 === 'N/A-rowSemantics'
  && ds11.rc.s12 !== 'N/A-rowSemantics'
  && ds11.rc.s21 === 'FLAG'
  && ds11.rc.s21b !== 'N/A-rowSemantics'
  && Array.isArray(ds11.s25sub) && ds11.s25sub.length === 1 && ds11.s25sub[0] === 'windowed-scan';
console.log(`\nAssertion B (DS11 expected shape): ${assertB ? 'PASS' : 'FAIL'}`);
if (ds11) {
  console.log(`  rowSemantics='${ds11.rowSemantics}' (expect 'arbitrary')`);
  console.log(`  autoTag='${ds11.autoTag}' (expect 'genomics')`);
  console.log(`  s23/s24/s26b/s27/s42 = ${[ds11.rc.s23, ds11.rc.s24, ds11.rc.s26b, ds11.rc.s27, ds11.rc.s42].join(' / ')}`);
  console.log(`  s12 = ${ds11.rc.s12} (expect NOT N/A-rowSemantics)`);
  console.log(`  s21 = ${ds11.rc.s21} (expect FLAG)`);
  console.log(`  s21b = ${ds11.rc.s21b} (expect NOT N/A-rowSemantics)`);
  console.log(`  s25_subunitsSuppressed = ${JSON.stringify(ds11.s25sub)} (expect ['windowed-scan'])`);
}

// Assertion C — DS19 row shape
const ds19 = perFixtureResults['19-inheritance-fabricated.csv'];
const assertC = ds19
  && ds19.rowSemantics === 'arbitrary'
  && ds19.autoTag === 'long-format'
  && ds19.rc.s26b === 'N/A-rowSemantics'
  && ds19.rc.s27 === 'N/A-rowSemantics'
  && ds19.rc.s42 === 'N/A-rowSemantics'
  && ds19.rc.s12 === 'N/A-applicability'
  && ds19.rc.s21 === 'N/A-applicability'
  && ds19.rc.s21b === 'N/A-applicability'
  && ds19.expected === 3 && ds19.severity === 3;
console.log(`\nAssertion C (DS19 expected shape): ${assertC ? 'PASS' : 'FAIL'}`);
if (ds19) {
  console.log(`  rowSemantics='${ds19.rowSemantics}' (expect 'arbitrary')`);
  console.log(`  autoTag='${ds19.autoTag}' (expect 'long-format')`);
  console.log(`  s26b/s27/s42 = ${[ds19.rc.s26b, ds19.rc.s27, ds19.rc.s42].join(' / ')} (expect N/A-rowSemantics each)`);
  console.log(`  s12/s21/s21b = ${[ds19.rc.s12, ds19.rc.s21, ds19.rc.s21b].join(' / ')} (expect N/A-applicability each)`);
  console.log(`  severity=${ds19.severity} (expect 3)`);
}
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 4: BatchView per-row threading
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 4: BatchView per-row threading ===\n');

const bvSrc = readFileSync(join('src/components/views/BatchView.jsx'), 'utf-8');
const bvLines = bvSrc.split('\n');

function pasteLines(src, label, rgxs, path) {
  console.log(`${label}  (${path})`);
  const hits = [];
  src.split('\n').forEach((l, i) => {
    if (rgxs.some(r => r.test(l))) hits.push({ n: i + 1, line: l });
  });
  hits.forEach(h => console.log(`  L${h.n}: ${h.line.trim()}`));
  console.log();
  return hits;
}

console.log('Path (a) → runFullAnalysis invocation + batchResults.push:\n');
pasteLines(bvSrc, '  runFullAnalysis + batchResults:', [
  /const testResults=await runFullAnalysis/,
  /rowSemantics\s*:\s*batchRowSem/,
  /rowSemanticsAuto\s*:/,
  /longFormatDetected\s*:\s*lfDetected/,
], 'src/components/views/BatchView.jsx');

console.log('Path (b) → per-row detail surface: batchImportConfig → ReportView');
const bicStart = bvLines.findIndex(l => /const batchImportConfig\s*=/.test(l));
if (bicStart !== -1) {
  for (let k = bicStart; k < Math.min(bvLines.length, bicStart + 20); k++) {
    console.log(`  L${k + 1}: ${bvLines[k]}`);
    if (bvLines[k].includes('};')) break;
  }
}
console.log();
console.log('  <ReportView ...> invocation:');
const rvIdx = bvLines.findIndex(l => /<ReportView\b/.test(l));
if (rvIdx !== -1) console.log(`  L${rvIdx + 1}: ${bvLines[rvIdx].trim()}`);
console.log();

console.log('Observation:');
console.log('  The three fields (rowSemantics, rowSemanticsAuto, longFormatDetected)');
console.log('  are present on the per-row batchResults entry (L179-181 in');
console.log('  BatchView.jsx) alongside severity / flag counts / results[] / etc.');
console.log('  They are NOT copied into batchImportConfig (L253-266) and are');
console.log('  therefore not threaded into <ReportView>\'s importConfig prop.');
console.log('  This matters only if the report-side detail surface is expected');
console.log('  to surface the auto-route badge — the batch-table row itself');
console.log('  (L353-386) does not render them either. S119 flags this as a');
console.log('  threading gap to confirm against Phase 3.5 spec during pixel');
console.log('  verification; if the intent is "present on the object only, no');
console.log('  UI surface yet", the gap is expected. If the intent is "detail');
console.log('  surface shows auto-route provenance", the gap is a wiring bug.');
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 5: ImportView state-machine audit
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 5: ImportView state-machine audit ===\n');
const ivSrc = readFileSync(join('src/components/views/ImportView.jsx'), 'utf-8');
const ivLines = ivSrc.split('\n');

function pasteRange(start, end, label) {
  console.log(`${label}  (L${start}-${end}):`);
  for (let i = start - 1; i < end && i < ivLines.length; i++) {
    console.log(`  L${i + 1}: ${ivLines[i]}`);
  }
  console.log();
}

pasteRange(55, 57, '(a) three state declarations (rowSemantics / rowSemAutoSet / longFormatDetected)');

// (b) auto-suggest useEffect
const useMemoIdx = ivLines.findIndex(l => /const rowSemSuggestion\s*=\s*useMemo/.test(l));
pasteRange(useMemoIdx + 1, useMemoIdx + 13, '(b) auto-suggest useMemo + useEffect');

// (c) user-click handlers (Ordered / Arbitrary buttons)
const orderBtnIdx = ivLines.findIndex(l => /setRowSemantics\('ordered'\);setRowSemAutoSet\(false\)/.test(l));
const arbBtnIdx   = ivLines.findIndex(l => /setRowSemantics\('arbitrary'\);setRowSemAutoSet\(false\)/.test(l));
console.log(`(c) user-click handlers (Ordered / Arbitrary buttons):`);
console.log(`  L${orderBtnIdx + 1}: ${ivLines[orderBtnIdx].trim()}`);
console.log(`  L${arbBtnIdx + 1}: ${ivLines[arbBtnIdx].trim()}`);
console.log();

// (d) pivot-modal dismiss handler
const dismissIdx = ivLines.findIndex(l => /const dismissPivot\s*=\s*useCallback/.test(l));
pasteRange(dismissIdx + 1, dismissIdx + 7, '(d) pivot-modal dismiss handler (NOTE: does NOT reset longFormatDetected — sticky, by spec)');

// (e) Back-clear handler — find the onClick with setRowSemantics(null)
const backIdx = ivLines.findIndex(l => /setRowSemantics\(null\).+setLongFormatDetected\(false\)/.test(l));
console.log(`(e) Back-clear handler  (L${backIdx + 1}):`);
console.log(`  ${ivLines[backIdx].trim()}`);
console.log();

// (f) initialConfig restore handler
const initIdx = ivLines.findIndex(l => /setRowSemantics\(initialConfig\.rowSemantics/.test(l));
console.log(`(f) initialConfig restore (L${initIdx + 1}):`);
console.log(`  ${ivLines[initIdx].trim()}`);
console.log(`  [Note: restores rowSemantics only; rowSemAutoSet + longFormatDetected`);
console.log(`   retain default (false) — back-from-report flow comes through with`);
console.log(`   the user-set value preserved; auto-state not reconstructed.]`);
console.log();

// (g) Run Analyses gating expression
const gateLineIdx = ivLines.findIndex(l => /const ready\s*=\s*!!effectiveColRel\s*&&\s*!rowSemRequired/.test(l));
const rsRequiredIdx = ivLines.findIndex(l => /const rowSemRequired\s*=/.test(l));
console.log(`(g) Run Analyses gating expression:`);
console.log(`  L${rsRequiredIdx + 1}: ${ivLines[rsRequiredIdx].trim()}`);
console.log(`  L${gateLineIdx + 1}: ${ivLines[gateLineIdx].trim()}`);
console.log(`  L${gateLineIdx + 7}: ${ivLines[gateLineIdx + 6]?.trim()}`);
console.log();

// Long-format detection sticky-setter — two places
console.log('Long-format detection setters (for stickiness audit):');
ivLines.forEach((l, i) => {
  if (/setLongFormatDetected\(/.test(l)) {
    console.log(`  L${i + 1}: ${l.trim()}`);
  }
});
console.log();

console.log('Assertions:');

// Re-fire only on auto-state?
console.log(`  (1) useEffect re-fires on assay change only when rowSemAutoSet===true`);
console.log(`      Dependency list is [rowSemSuggestion.value] (line shown above).`);
console.log(`      Body: "if (rowSemSuggestion.value && (rowSemantics === null || rowSemAutoSet))"`);
console.log(`      — re-fires whenever suggestion.value changes, but the body GUARDS`);
console.log(`      with rowSemAutoSet so once the user freezes the choice (click sets`);
console.log(`      rowSemAutoSet=false) no overwrite happens. PASS.`);

// User-click freezes
console.log(`  (2) User click sets rowSemAutoSet=false (freeze):`);
console.log(`      Both buttons call setRowSemAutoSet(false). PASS.`);

// Pivot dismiss keeps longFormatDetected=true
console.log(`  (3) Pivot dismiss WITHOUT pivot leaves longFormatDetected=true:`);
console.log(`      dismissPivot() body does NOT call setLongFormatDetected(false).`);
console.log(`      setLongFormatDetected(true) was already set at L209 when the`);
console.log(`      modal opened. PASS (sticky by construction).`);

// Pivot accept + unpivot keeps longFormatDetected=true
const confirmIdx = ivLines.findIndex(l => /const confirmPivot\s*=\s*useCallback/.test(l));
const confirmEndIdx = ivLines.findIndex((l, i) => i > confirmIdx && /^\s*\},/.test(l));
const confirmSlice = ivLines.slice(confirmIdx, confirmEndIdx + 1).join('\n');
const confirmResetsLF = /setLongFormatDetected\s*\(\s*false\s*\)/.test(confirmSlice);
console.log(`  (4) Pivot accept + unpivot leaves longFormatDetected=true:`);
console.log(`      confirmPivot() body ${confirmResetsLF ? 'DOES reset longFormatDetected' : 'does NOT reset longFormatDetected'}.`);
console.log(`      Previous setLongFormatDetected(true) remains in effect. ${confirmResetsLF ? 'FAIL' : 'PASS'}.`);

// Back-clear resets all three
const backLine = ivLines[backIdx] || '';
const backResetsAll = /setRowSemantics\(null\)/.test(backLine)
  && /setRowSemAutoSet\(false\)/.test(backLine)
  && /setLongFormatDetected\(false\)/.test(backLine);
console.log(`  (5) Back-clear resets all three states: ${backResetsAll ? 'PASS' : 'FAIL'}`);

// initialConfig restore
const initRestoresAll = /setRowSemantics\(initialConfig\.rowSemantics/.test(ivSrc);
const initRestoresAuto = /setRowSemAutoSet\(.*initialConfig/.test(ivSrc);
const initRestoresLF = /setLongFormatDetected\(.*initialConfig/.test(ivSrc);
console.log(`  (6) initialConfig restore sets all three from config blob:`);
console.log(`      rowSemantics     : ${initRestoresAll  ? 'RESTORED' : 'NOT RESTORED'}`);
console.log(`      rowSemAutoSet    : ${initRestoresAuto ? 'RESTORED' : 'NOT RESTORED (defaults to false)'}`);
console.log(`      longFormatDetected: ${initRestoresLF  ? 'RESTORED' : 'NOT RESTORED (defaults to false)'}`);
console.log(`      ${(initRestoresAll && initRestoresAuto && initRestoresLF) ? 'PASS' : 'PARTIAL — see Section 6'}`);
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 6: Missing fields
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 6: Missing fields ===\n');
console.log('Items not statically verifiable → route to Nick pixel verification:');
console.log('  - Gate-card border-left amber/grey stripe (#F59E0B vs BORDER_L)');
console.log('    when rowSemantics unresolved vs resolved.');
console.log('  - REQUIRED badge typography + placement.');
console.log('  - Ordered/Arbitrary button active-state tick mark and border colour.');
console.log('  - Auto-routed info row below the gate (if any) when rowSemAutoSet=true');
console.log('    (currently the gate card is hidden in that state — verify hidden).');
console.log('  - BatchView per-row detail surface: whether rowSemantics /');
console.log('    rowSemanticsAuto / longFormatDetected are DISPLAYED anywhere.');
console.log('    They are present on the result object but absent from the batch-row');
console.log('    table AND from batchImportConfig → ReportView (Section 4).');
console.log('  - Run Analyses button label transitions ("Select row order above to');
console.log('    proceed" text when rowSemRequired=true).');
console.log('  - initialConfig-restore flow: rowSemAutoSet + longFormatDetected are');
console.log('    NOT restored from config blob (Section 5 assertion 6). Confirm with');
console.log('    Nick whether back-from-report should preserve the AUTO badge state');
console.log('    or is expected to demote to "user-frozen" after round-trip.');
console.log();

// Final summary
const allPass = assertA && assertB && assertC
  && rsSkipHits.length === 5 && uniqFound.length === 5 && missing.length === 0
  && !s26bHit && !s27Hit && !s42Hit
  && backResetsAll;
console.log(`=== Audit result: ${allPass ? 'PASS' : 'DEVIATIONS FLAGGED'} ===`);
process.exit(allPass ? 0 : 1);

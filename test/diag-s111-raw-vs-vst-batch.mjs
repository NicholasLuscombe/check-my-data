// S111 Phase 1 Target C — Full 22-fixture raw-routing vs current
// VST-routed batch comparison. Severity + per-test primaryP divergence
// table with X/Y classification (VST-corruption vs VST-legitimate) per
// routing-sensitive fixture.
//
// Method: run each fixture twice — once with `vst = {transform:'raw'}`
// (diagnostic override), once with `detectVST`. Compare severity,
// high/moderate flag sets, and per-test primaryP's.
//
// X/Y classification (per spec):
//   X — VST-corruption: post-VST row-survival < 50% of raw OR Σ_B cannot
//       be computed due to row loss; raw-vs-VST divergence is a BUG.
//   Y — VST-legitimate: near-100% row survival (≥ 95%); raw-vs-VST
//       divergence is variance stabilization working as intended.
// Drives Phase 2 fix-spec: Category X fixtures require a routing fix;
// Category Y fixtures must NOT be affected by any per-test override.
//
// No src/ modifications. Snapshot to /tmp/s111-raw-vs-vst-batch.txt.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';
const EXPECTED_SEV = {
  '01-densitometry-clean.csv': 0, '02-densitometry-fabricated.csv': 3,
  '03-qpcr-clean.csv': 0, '04-qpcr-fabricated.csv': 3,
  '05-cellcount-clean.csv': 0, '06-cellcount-fabricated.csv': 3,
  '07-elisa-clean.csv': 0, '08-elisa-fabricated.csv': 3,
  '09-proteomics-clean.csv': 0, '10-proteomics-fabricated.csv': 3,
  '11-rnaseq-multicondition.csv': 3,
  '12a-uniform-mixture-clean.csv': 0, '12b-uniform-mixture-fabricated.csv': 1,
  '13-vfstest-cellcountest.csv': 2, '14-crctest-survey.csv': 3,
  '15-missing-carlisle.csv': 3,
  '16-densitometry-carlisle-overbalanced.csv': 2, '17-densitometry-carlisle-clean.csv': 0,
  '19-inheritance-fabricated.csv': 3,
  '20-bimodal-fab.csv': 3, '21-localised-ar.csv': 2, '22-covariance-block.csv': 2,
};

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

// Tests that actually consume the active matrix per engine.js — same set
// as Target B's DISPATCH_VST_CONSUMERS. Only these tests' primaryP's are
// affected DIRECTLY by routing; other tests that share the PRNG pipeline
// can register incidental numerical shifts (PRNG-pollution false positive).
const DISPATCH_VST_CONSUMERS = new Set([
  "Constant-Offset Blocks",
  "Residual Spike Correlation",
  "Cross-Condition Consistency",
  "Mahalanobis Row Outlier",
  "Blocked Mahalanobis",
  "Excess Kurtosis",
  "Autocorrelation",
  "Windowed Autocorrelation",
  "Runs Test",
  "LOESS Residual Analysis",
  "Row-Mean Runs",
  "Selective Noise Partitioning",
  "Regional Noise Homogeneity",
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
  const { matrix, rawMatrix, condCtx } = buildInputs(loaded);
  const vst = forceRaw
    ? { transform: 'raw', reason: 'FORCED RAW (diagnostic override — do NOT commit)', dataSlope: null }
    : detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  const { severity } = computeSeverity(results);
  return { results, vst, severity, matrix };
}

// X/Y classification from Target A metrics. We re-compute row-survival
// inline rather than round-tripping through Target A's output file.
function classifyFixtureXY(matrix, vst) {
  if (vst.transform !== 'log' && vst.transform !== 'anscombe') {
    return { category: 'N/A (raw-routed)', rowSurvivalFrac: 1.0, reason: 'detectVST → raw; no VST applied' };
  }
  let vstMatrix;
  if (vst.transform === 'log') vstMatrix = matrix.map(row => row.map(v => (v != null && v > 0) ? Math.log(v) : null));
  else vstMatrix = matrix.map(row => row.map(v => (v != null && v >= 0) ? Math.sqrt(v + 0.375) : null));
  const nR = matrix.length;
  const nC = matrix[0].length;
  let fullyPreserved = 0, newNaNIntroduced = 0;
  for (let i = 0; i < nR; i++) {
    let preserved = true;
    for (let j = 0; j < nC; j++) {
      const rv = matrix[i][j], vv = vstMatrix[i][j];
      if (vv == null || !isFinite(vv)) {
        preserved = false;
        if (rv != null) newNaNIntroduced++;
      }
    }
    if (preserved) fullyPreserved++;
  }
  const rowSurvivalFrac = fullyPreserved / nR;
  if (rowSurvivalFrac < 0.5 || newNaNIntroduced > 0 && rowSurvivalFrac < 0.95) {
    return { category: 'X', rowSurvivalFrac, newNaNIntroduced, reason: `row-survival ${(rowSurvivalFrac * 100).toFixed(1)}%; ${newNaNIntroduced} cells NaN'd from non-null raw` };
  }
  return { category: 'Y', rowSurvivalFrac, newNaNIntroduced, reason: `row-survival ${(rowSurvivalFrac * 100).toFixed(1)}%; ${newNaNIntroduced} non-null cells NaN'd by VST` };
}

function pRepr(p) {
  if (p == null) return '—';
  if (!isFinite(p)) return 'NaN';
  if (p === 0) return '0';
  if (p < 1e-4) return p.toExponential(2);
  return p.toFixed(4);
}

function sameFlag(a, b) { return (a || 'N/A') === (b || 'N/A'); }
function primaryPDiverge(a, b) {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  if (a === 0 && b === 0) return false;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-300);
  return Math.abs(a - b) / denom > 1.0;  // > 2× differ
}

// ── Run all 22 under both routings ──
const rows = [];
for (const { file, assay } of ALL_22) {
  const loaded = loadFixture(file, assay);
  const rawRun = await runWithRouting(loaded, assay, true);
  const vstRun = await runWithRouting(loaded, assay, false);
  const xy = classifyFixtureXY(rawRun.matrix, vstRun.vst);
  rows.push({ file, assay, rawRun, vstRun, xy });
}

// ── Severity comparison table ──
console.log('='.repeat(110));
console.log('S111 Phase 1 — Target C: full 22-fixture raw-routing vs VST-routing batch');
console.log('='.repeat(110));
console.log('');
console.log('Severity comparison — current VST-routed batch is the committed EXPECTED baseline');
console.log('-'.repeat(110));
console.log([
  'fixture'.padEnd(44), 'VST'.padEnd(10), 'sev_raw'.padEnd(8),
  'sev_vst'.padEnd(8), 'sev_exp'.padEnd(8), 'Δsev'.padEnd(6), 'X/Y'.padEnd(5), 'rowSurv'.padEnd(9)
].join(' '));
console.log('-'.repeat(110));
const sevDiffers = [];
for (const row of rows) {
  const sevRaw = row.rawRun.severity;
  const sevVst = row.vstRun.severity;
  const sevExp = EXPECTED_SEV[row.file];
  const delta = sevRaw - sevVst;
  const tag = delta === 0 ? ' ' : (delta > 0 ? '+' : '-');
  if (sevRaw !== sevVst) sevDiffers.push(row);
  console.log([
    row.file.padEnd(44),
    row.vstRun.vst.transform.padEnd(10),
    String(sevRaw).padEnd(8),
    String(sevVst).padEnd(8),
    String(sevExp).padEnd(8),
    `${tag}${Math.abs(delta)}`.padEnd(6),
    (row.xy.category || '—').padEnd(5),
    `${(row.xy.rowSurvivalFrac * 100).toFixed(0)}%`.padEnd(9)
  ].join(' '));
}

console.log('');
console.log('-'.repeat(110));
console.log(`${sevDiffers.length} / 22 fixtures: severity differs between raw routing and VST routing`);
console.log('');
if (sevDiffers.length) {
  for (const row of sevDiffers) {
    const dir = row.rawRun.severity > row.vstRun.severity ? 'raw OVER-flags vs VST' : 'raw UNDER-flags vs VST';
    console.log(`  ${row.file}: raw=${row.rawRun.severity} vst=${row.vstRun.severity} exp=${EXPECTED_SEV[row.file]}; ${dir}; X/Y=${row.xy.category}`);
  }
}

// ── Per-test primaryP divergence on VST-consuming tests ──
console.log('');
console.log('='.repeat(110));
console.log('Per-test primaryP divergence on VST-consuming tests (engine.js dispatch list)');
console.log('='.repeat(110));
console.log('');
console.log('Legend: flag_raw→flag_vst shown when flags differ; primaryP ratio shown as rel-diff');
console.log('Sorted by X/Y then fixture; only routing-sensitive test rows shown.');
console.log('');

const testsByFixture = new Map();
for (const row of rows) {
  const raw = row.rawRun.results;
  const vst = row.vstRun.results;
  const vstMap = new Map(vst.map(r => [r.name, r]));
  const divergent = [];
  for (const rRaw of raw) {
    if (!DISPATCH_VST_CONSUMERS.has(rRaw.name)) continue;
    const rVst = vstMap.get(rRaw.name);
    if (!rVst) continue;
    const flagDiff = !sameFlag(rRaw.flag, rVst.flag);
    const pDiff = primaryPDiverge(rRaw.primaryP, rVst.primaryP);
    if (flagDiff || pDiff) {
      divergent.push({ name: rRaw.name, rRaw, rVst, flagDiff, pDiff });
    }
  }
  testsByFixture.set(row.file, divergent);
}

// Group by X/Y then list fixtures and tests
const byCategory = { X: [], Y: [], 'N/A (raw-routed)': [] };
for (const row of rows) byCategory[row.xy.category].push(row);

for (const cat of ['X', 'Y', 'N/A (raw-routed)']) {
  if (!byCategory[cat].length) continue;
  console.log(`${'='.repeat(6)} Category ${cat} — ${byCategory[cat].length} fixture${byCategory[cat].length === 1 ? '' : 's'}`);
  if (cat === 'X') console.log('       interpretation: VST routing CORRUPTS input; raw routing is ground truth');
  else if (cat === 'Y') console.log('       interpretation: VST is statistically legitimate; raw-vs-VST divergence reflects working-as-intended variance stabilization');
  else console.log('       interpretation: detectVST routes to raw; no routing switch possible');
  console.log('');
  for (const row of byCategory[cat]) {
    const div = testsByFixture.get(row.file);
    if (!div.length) {
      console.log(`  ${row.file}: 0 routing-sensitive tests (VST-consumers all invariant on this fixture)`);
      continue;
    }
    console.log(`  ${row.file}  [X/Y=${row.xy.category}, rowSurv=${(row.xy.rowSurvivalFrac*100).toFixed(0)}%]`);
    for (const d of div) {
      const flagStr = d.flagDiff ? `${d.rRaw.flag}→${d.rVst.flag}` : `${d.rRaw.flag}=`;
      const pRawStr = pRepr(d.rRaw.primaryP), pVstStr = pRepr(d.rVst.primaryP);
      console.log(`    ${d.name.padEnd(34)} ${flagStr.padEnd(22)} raw_p=${pRawStr.padEnd(10)} vst_p=${pVstStr.padEnd(10)}`);
    }
  }
  console.log('');
}

// ── Summary: what fraction of the VST-routed baseline is X-contingent? ──
console.log('='.repeat(110));
console.log('Phase 2 input — severity/flag dependency on VST routing, partitioned X vs Y');
console.log('='.repeat(110));
console.log('');
const xRows = byCategory['X'];
const yRows = byCategory['Y'];
const rawRoutedRows = byCategory['N/A (raw-routed)'];
console.log(`Category X (VST-corruption) fixtures: ${xRows.length}`);
for (const r of xRows) {
  const div = testsByFixture.get(r.file);
  const flagChanges = div.filter(d => d.flagDiff).length;
  console.log(`  ${r.file}: sev ${r.rawRun.severity} (raw) → ${r.vstRun.severity} (vst); ${flagChanges} flag changes among VST-consumers; rowSurv=${(r.xy.rowSurvivalFrac*100).toFixed(1)}%`);
  console.log(`    ${r.xy.reason}`);
}
console.log('');
console.log(`Category Y (VST-legitimate) fixtures: ${yRows.length}`);
const ySevDiffers = yRows.filter(r => r.rawRun.severity !== r.vstRun.severity);
console.log(`  of which severity differs: ${ySevDiffers.length}`);
for (const r of ySevDiffers) {
  console.log(`    ${r.file}: raw sev=${r.rawRun.severity}, vst sev=${r.vstRun.severity}, expected=${EXPECTED_SEV[r.file]}`);
}
console.log('  (these are VST-legitimate — Phase 2 must NOT force raw on these fixtures)');
console.log('');
console.log(`Category raw-routed: ${rawRoutedRows.length} fixtures (no routing switch; baseline invariant)`);
console.log('');
console.log('='.repeat(110));
console.log('end of Target C report');
console.log('='.repeat(110));

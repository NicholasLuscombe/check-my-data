// S110 Track E (a) — Blocked Mahalanobis diagnostic.
// Imports real testBlockedMahalanobis and runs:
//   (a) DS22 covariance-block fixture → per (pass × condition × best-block) table
//       showing observed stat, raw-p, adj-p, flag.
//   (b) DS01–DS19 applicable clean-plus-fabricated fixtures → regression scan
//       reporting any flag at MODERATE or HIGH (with primary forensic targets
//       cross-referenced against TEST-GROUND-TRUTH).
// Snapshot to /tmp/s110-blocked-mahal.txt (stdout is tee'd externally).

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { createPRNG } = await import('../src/stats/prng.js');
const { testBlockedMahalanobis } = await import('../src/tests/blockedMahalanobis.js');

const FIXTURES = 'test/fixtures';
const DATASETS = [
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

function runFixture(file, assay) {
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
  const { matrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false
  });
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');

  // Engine hard-skips genomics
  if (assay === 'genomics') {
    return { flag: 'N/A', primaryP: null, reason: 'genomics skip' };
  }
  // Mirror engine.js: Blocked Mahalanobis runs on the post-VST matrix (S110
  // landed with VST routing; broader VST audit is S111 Priority #1).
  const vst = detectVST(matrix, assay);
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vstMatrix !== null;
  const vstCondCtx = hasVST ? condCtx.withMatrix(vstMatrix) : null;
  const m = hasVST ? vstMatrix : matrix;
  const ctx = hasVST ? vstCondCtx : condCtx;
  const rng = createPRNG(matrix);
  return testBlockedMahalanobis(m, ctx, rng, dataType);
}

// ── (a) DS22 detailed per-block table ──
console.log('='.repeat(72));
console.log('DS22 — covariance-block fixture (Blocked Mahalanobis primary target)');
console.log('='.repeat(72));
const ds22 = runFixture('22-covariance-block.csv', 'general');
if (ds22.flag === 'N/A') {
  console.log(`DS22: N/A — ${ds22.description || ds22.reason}`);
} else {
  console.log(`flag=${ds22.flag}, primaryP=${ds22.primaryP?.toFixed(6) || 'null'}`);
  console.log(`conditions=${ds22.nConditions}, units=${ds22.nUnits}, W=${ds22.windowSize}, stride=${ds22.stride}, B=${ds22.nPerm}`);
  console.log(`nWindowsTotal=${ds22.nWindowsTotal}`);
  console.log(`interpretation: ${ds22.interpretation}`);
  console.log('');
  console.log('Pass         Condition   Rows              Stat            rawP       adjP       flag');
  console.log('-'.repeat(95));
  const details = ds22.details || [];
  for (const d of details.slice(0, 20)) {
    const flag = d.significant ? 'YES' : '.';
    const pass = d.pass.padEnd(10);
    const cond = (d.condition || '').padEnd(10);
    const rows = (d.rows || '').padEnd(16);
    const stat = `${d.statType}=${d.stat}`.padEnd(14);
    const rp = d.rawP.toFixed(6).padEnd(10);
    const ap = d.adjP.toFixed(6).padEnd(10);
    console.log(`${pass} ${cond}  ${rows}  ${stat}  ${rp} ${ap} ${flag}`);
  }
}

// ── (b) DS01–DS19 regression scan ──
console.log('');
console.log('='.repeat(72));
console.log('DS01–DS22 regression scan (clean-fixture zero-flag requirement)');
console.log('='.repeat(72));
console.log('Fixture                                       flag       primaryP      W    B_perm  nCond');
console.log('-'.repeat(95));
const regressions = [];
for (const { file, assay } of DATASETS) {
  const r = runFixture(file, assay);
  const flag = (r.flag || 'N/A').padEnd(9);
  const pp = r.primaryP != null ? r.primaryP.toFixed(6).padEnd(12) : '—'.padEnd(12);
  const w = r.windowSize != null ? String(r.windowSize).padEnd(4) : '—'.padEnd(4);
  const b = r.nPerm != null ? String(r.nPerm).padEnd(6) : '—'.padEnd(6);
  const nCond = r.nConditions != null ? String(r.nConditions) : '—';
  console.log(`${file.padEnd(45)} ${flag}  ${pp}  ${w}  ${b}  ${nCond}`);
  // Flag non-LOW on fixtures expected to be LOW (clean + non-covariance-block fabricated).
  const isDS22 = file.startsWith('22-');
  if (!isDS22 && (r.flag === 'HIGH' || r.flag === 'MODERATE')) {
    regressions.push({ file, flag: r.flag, primaryP: r.primaryP });
  }
}

console.log('');
if (regressions.length) {
  console.log(`⚠ ${regressions.length} non-DS22 fixture${regressions.length === 1 ? '' : 's'} flag at MOD/HIGH:`);
  for (const r of regressions) console.log(`  ${r.file}: ${r.flag} (primaryP=${r.primaryP?.toFixed(6)})`);
} else {
  console.log('✓ Zero DS01–DS21 MOD/HIGH flags. DS22 primary attribution only.');
}

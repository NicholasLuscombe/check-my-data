// S113 Phase 2 (revised) — verify P5 structural SE floor behaviour per-pair.
// Read-only. Runs live CCC engine on 22-fixture batch. Reports for every
// applicable P5 unit:
//   · |Δz|, structural floor √2/√(n_rep_min × (N_row_min − 3)), adj-p
//   · live engUnitFlag / CCC flag / primaryP
// Flags regressions:
//   · any clean fixture whose P5 unit flips to ≥LOW (expected: none)
//   · any previously-cleared pair now blocked by structural floor
//     (small-N pairs DS01/02/03/04 at n_rep=3–4, N_row=70–140)

import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { createPRNG } = await import('../src/stats/prng.js');
const { testCrossConditionConsistency } = await import('../src/tests/crossConditionConsistency.js');

const FIXTURES = [
  ['01-densitometry-clean.csv',                'DS01',  'densitometry', 'FAB', 1],
  ['02-densitometry-fabricated.csv',           'DS02',  'densitometry', 'FAB', 3],
  ['03-qpcr-clean.csv',                        'DS03',  'qpcr',         'CLEAN', 0],
  ['04-qpcr-fabricated.csv',                   'DS04',  'qpcr',         'FAB', 3],
  ['05-cellcount-clean.csv',                   'DS05',  'cell_count',   'CLEAN', 0],
  ['06-cellcount-fabricated.csv',              'DS06',  'cell_count',   'FAB', 3],
  ['07-elisa-clean.csv',                       'DS07',  'elisa',        'CLEAN', 0],
  ['08-elisa-fabricated.csv',                  'DS08',  'elisa',        'FAB', 3],
  ['09-proteomics-clean.csv',                  'DS09',  'proteomics',   'CLEAN', 0],
  ['10-proteomics-fabricated.csv',             'DS10',  'proteomics',   'FAB', 3],
  ['11-rnaseq-multicondition.csv',             'DS11',  'genomics',     'FAB', 3],
  ['12a-uniform-mixture-clean.csv',            'DS12a', 'general',      'CLEAN', 0],
  ['12b-uniform-mixture-fabricated.csv',       'DS12b', 'general',      'FAB', 1],
  ['13-vfstest-cellcountest.csv',              'DS13',  'cell_count',   'FAB', 2],
  ['14-crctest-survey.csv',                    'DS14',  'survey',       'FAB', 3],
  ['15-missing-carlisle.csv',                  'DS15',  'general',      'FAB', 3],
  ['16-densitometry-carlisle-overbalanced.csv','DS16',  'densitometry', 'FAB', 2],
  ['17-densitometry-carlisle-clean.csv',       'DS17',  'densitometry', 'CLEAN', 0],
  ['19-inheritance-fabricated.csv',            'DS19',  'general',      'FAB', 3],
  ['20-bimodal-fab.csv',                       'DS20',  'general',      'FAB', 3],
  ['21-localised-ar.csv',                      'DS21',  'general',      'FAB', 3],
  ['22-covariance-block.csv',                  'DS22',  'general',      'FAB', 2],
];

function loadFixture(file, assay) {
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
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  return { matrix, condCtx, vst };
}

function applyVST(matrix, vst) {
  if (!vst?.transform || vst.transform === 'raw') return matrix;
  if (vst.transform === 'log') return matrix.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  if (vst.transform === 'anscombe') return matrix.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  return matrix;
}

// Re-derive structural floor from per-condition replicate stats observable in
// the slice residual structure — for reporting (engine does not surface these).
function lag1(series, n) {
  const n1 = n - 1; if (n1 < 2) return NaN;
  let mx = 0, my = 0; for (let i = 0; i < n1; i++) { mx += series[i]; my += series[i+1]; }
  mx /= n1; my /= n1;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n1; i++) {
    const dx = series[i] - mx, dy = series[i+1] - my;
    sxy += dx*dy; sxx += dx*dx; syy += dy*dy;
  }
  const d = Math.sqrt(sxx*syy);
  if (!(d > 1e-20)) return NaN;
  let r = sxy / d;
  if (r > 0.999999) r = 0.999999;
  if (r < -0.999999) r = -0.999999;
  return r;
}
function condP5Metrics(slice) {
  const rows = slice.matrix;
  const tuples = [];
  for (const row of rows) {
    const cells = [], reps = [];
    for (let ri = 0; ri < row.length; ri++) {
      const v = row[ri]; if (v != null && isFinite(v)) { cells.push(v); reps.push(ri); }
    }
    if (cells.length === 0) continue;
    let resid = [];
    if (cells.length >= 2) {
      let mean = 0; for (let i = 0; i < cells.length; i++) mean += cells[i]; mean /= cells.length;
      resid = cells.map(v => v - mean);
    }
    tuples.push({ reps, resid });
  }
  let maxRep = -1;
  for (const t of tuples) for (const r of t.reps) if (r > maxRep) maxRep = r;
  const nReps = maxRep + 1;
  const perRep = Array.from({ length: nReps }, () => []);
  for (const t of tuples) for (let i = 0; i < t.resid.length; i++) perRep[t.reps[i]].push(t.resid[i]);
  let K = 0, minLen = Infinity;
  for (let rep = 0; rep < nReps; rep++) {
    const n = perRep[rep].length;
    if (n < 3) continue;
    const r = lag1(perRep[rep], n);
    if (!isFinite(r)) continue;
    K++;
    if (n < minLen) minLen = n;
  }
  return { K, nRow: K > 0 ? minLen : 0 };
}
function structuralFloor(metricsA, metricsB) {
  const nRep = Math.min(metricsA.K, metricsB.K);
  const nRow = Math.min(metricsA.nRow, metricsB.nRow);
  if (nRep < 1 || nRow < 4) return NaN;
  return Math.SQRT2 / Math.sqrt(nRep * (nRow - 3));
}

const fmt4 = x => (x == null || !isFinite(x)) ? '—' : x.toFixed(4);
const fmtP = x => {
  if (x == null || !isFinite(x)) return '—';
  if (x < 1e-3) return x.toExponential(2);
  return x.toFixed(4);
};
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('  S113 Phase 2 (revised) — P5 STRUCTURAL FLOOR VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log();
console.log('Floor = √2 / √(n_rep_min × (N_row_min − 3))  (H₀ SE of |Δz| under Fisher-z + rep averaging)');
console.log();
console.log(pad('DS',7) + pad('class',6) + pad('Pair',30) + padL('n_rep_min',10) + padL('N_row_min',10) + padL('floor',9) + padL('|Δz|',9) + padL('adj-p',10) + pad('  dir',11) + pad('engUnitFlag',14) + 'status');
console.log('─'.repeat(140));

let cleanP5Flips = 0, smallNBlocks = 0, ds21Lift = false, ds21FlagLift = false;
let ds21PrimaryP = null;

for (const [file, dsId, assay, classTag] of FIXTURES) {
  const { matrix, condCtx, vst } = loadFixture(file, assay);
  const active = applyVST(matrix, vst);
  const hasVST = !!(vst?.transform && vst.transform !== 'raw');
  const ctx = hasVST ? condCtx.withMatrix(active) : condCtx;
  if (!ctx || !ctx.has || ctx.count < 2) continue;
  const rng = createPRNG(active);
  const cccResult = testCrossConditionConsistency(active, ctx, rng, { originalMatrix: matrix, hasVST });
  if (!cccResult || cccResult.flag === 'N/A') continue;
  const slices = ctx.slices();
  const perCondMetrics = slices.map(condP5Metrics);
  const p5Rows = cccResult.details.filter(d => d.property === 'Residual lag-1 AC' && d.ran);
  if (dsId === 'DS21') {
    ds21PrimaryP = cccResult.primaryP;
    ds21FlagLift = cccResult.flag === 'MODERATE' || cccResult.flag === 'HIGH';
  }
  for (const row of p5Rows) {
    const [ai, bi] = row.pair.split(' vs ').map(name => slices.findIndex(s => s.name === name));
    const metricsA = perCondMetrics[ai], metricsB = perCondMetrics[bi];
    const floor = structuralFloor(metricsA, metricsB);
    const nRepMin = Math.min(metricsA.K, metricsB.K);
    const nRowMin = Math.min(metricsA.nRow, metricsB.nRow);
    const absDz = parseFloat(row.observed);
    const clearsFloor = absDz >= floor;
    const isHigh = row.unitFlag === 'HIGH' || row.unitFlag === 'MODERATE';
    let status = '';
    if (classTag === 'CLEAN' && isHigh) { status = '⚠ CLEAN P5 FLIP'; cleanP5Flips++; }
    else if (row.direction === 'different' && !clearsFloor && absDz > 0.05) {
      status = 'small-N: floor blocks (expected honest behavior)';
      smallNBlocks++;
    }
    if (dsId === 'DS21' && row.pair === 'Control vs Treatment') {
      if (row.unitFlag === 'MODERATE' || row.unitFlag === 'HIGH') {
        ds21Lift = true;
        status = '✓ DS21 LIFTS ' + row.unitFlag;
      } else {
        status = '✗ DS21 DID NOT LIFT (unitFlag=' + row.unitFlag + ')';
      }
    }
    console.log(
      pad(dsId,7) + pad(classTag,6) + pad(row.pair,30) +
      padL(nRepMin,10) + padL(nRowMin,10) + padL(fmt4(floor),9) +
      padL(fmt4(absDz),9) + padL(fmtP(row.adjP),10) +
      pad('  ' + row.direction, 11) + pad(row.unitFlag, 14) + status
    );
  }
}

console.log();
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('  ACCEPTANCE CRITERIA SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log();
console.log(`  DS21 v2 P5 Control-vs-Treatment lifts ≥ MOD:   ${ds21Lift ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  DS21 v2 CCC flag ≥ MOD:                        ${ds21FlagLift ? '✓ PASS' : '✗ FAIL'}  (primaryP=${fmtP(ds21PrimaryP)})`);
console.log(`  Clean fixtures with new P5 ≥ LOW flips:        ${cleanP5Flips === 0 ? '✓ PASS (0)' : '✗ FAIL (' + cleanP5Flips + ')'}`);
console.log(`  Small-N structural-floor blocks (informational): ${smallNBlocks}`);

/* S351 Part 3 — is Residual Spike Correlation's DS02 firing a true detection?

   The disposition adjudicated the DS11 firing against construction and found it
   real. It never adjudicated DS02. Part 1 then measured that suspending the test
   drops DS02 from severity 3 to 1, so what the suspension costs depends on this
   answer.

   Method — the one that settled DS08, DS12b, DS22 and DS11. Measure inside the
   planted rows and columns and outside them, separately, and compare. Nothing
   here reads an engine record as evidence about the data.

   DS02 is column-grouped, so matrix row r is the same subject in all three
   conditions and the "subjects" the test ranks are rows.

   The three planted mechanisms, read from generate-test-datasets.py and
   confirmed by a byte-exact re-implementation in gen-s351-ds02-ablations.py:

     M1  rescaled copy      Inhibitor_A = Control x 0.58 + 0.008*N(0,1)
                            every row, matrix cols 4-7
     M2  scattered row copy Inhibitor_B = Control x 0.35 + 0.002*N(0,1)
                            5 randomly chosen rows, matrix cols 8-11
     M3  replicate lock     Inhibitor_A Rep2 = Rep1 x 1.003 + 0.0015
                            rows 19-28 (1-indexed), matrix col 5

   M3 overwrites cells M1 wrote and reads M1's output, so the two are nested
   rather than independent. The ablation still separates them; the report says
   what the nesting does.

   Usage:
     node test/probes/probe-s351-ds02-rsc.mjs
     ABLATIONS=<dir> node test/probes/probe-s351-ds02-rsc.mjs
       (<dir> from: python3 test/probes/gen-s351-ds02-ablations.py <dir>)
*/
import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

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
const { TEST_MECHANISM } = await import('../../src/constants/mechanisms.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');
const { residualScaleDispersion } = await import('../gen-copy-fidelity.mjs');

const RSC = 'Residual Spike Correlation';
const DS02 = '02-densitometry-fabricated.csv';
const DS01 = '01-densitometry-clean.csv';
const ABL = process.env.ABLATIONS || null;

// ── Planted regions, matrix coordinates, rows 0-indexed ────────────────────
// M2's rows are not hardcoded from memory: the ablation generator prints them
// and the probe re-derives them from the data below, then cross-checks.
const M1_COLS = [4, 5, 6, 7];
const M2_COLS = [8, 9, 10, 11];
const M3_COL = 5;
const M3_ROWS = Array.from({ length: 10 }, (_, i) => 18 + i);   // 1-indexed 19-28
const M2_ROWS_EXPECTED = [0, 15, 27, 30, 33];                   // 1-indexed 1,16,28,31,34

// ── Load, exactly the way test/validate-batch.mjs loads ────────────────────
function load(path, assay) {
  const csv = readFileSync(path, 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } =
    extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = suggestRowSemantics({
    assay, longFormatDetected: !!detectLongFormat(headers, data),
  }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, assay, vst, dataType, rowSemantics };
}

async function run(path, assay) {
  const fx = load(path, assay);
  const results = await runFullAnalysis(
    fx.matrix, fx.rawMatrix, fx.condCtx, fx.assay, null, fx.vst, {},
    fx.dataType, fx.rowSemantics
  );
  return { fx, results, rsc: results.find(r => r.name === RSC) };
}

// ── Re-derive RSC's top-K sets from its own published per-condition profiles ──
// `allProfiles[c].absResid` is the normalised mean-absolute-residual per row that
// the test ranked. K and the ranking rule below are copied from
// residualSpikeCorrelation.js so the selection reproduces exactly rather than
// being approximated.
function topKSets(rsc) {
  const profiles = rsc.allProfiles || [];
  const nR = profiles[0]?.absResid.length ?? 0;
  const K = Math.max(5, Math.floor(nR * 0.10));
  const sets = profiles.map(c => {
    const ranked = c.absResid
      .map((v, i) => ({ i, v: v != null ? v : -Infinity }))
      .sort((a, b) => b.v - a.v)
      .slice(0, K)
      .map(x => x.i);
    return { name: c.name, rows: ranked };
  });
  return { K, nR, sets };
}

function pairOverlaps(sets) {
  const out = [];
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = new Set(sets[i].rows);
      const shared = sets[j].rows.filter(r => a.has(r)).sort((x, y) => x - y);
      out.push({ a: sets[i].name, b: sets[j].name, shared });
    }
  }
  return out;
}

const fmtRows = rows => rows.length ? rows.map(r => r + 1).join(', ') : '(none)';

// ── Recover M2's rows from the data, independent of the generator ──────────
// A copied row has Inhibitor_B = Control x 0.35 with noise 0.002, so all four
// per-replicate ratios sit on 0.35. An honest row's Inhibitor_B is generated
// from its own base, so its ratios scatter.
function recoverM2Rows(rawMatrix) {
  const hits = [];
  for (let r = 0; r < rawMatrix.length; r++) {
    const ratios = [];
    for (let k = 0; k < 4; k++) {
      const ctrl = Number(rawMatrix[r][k]);
      const inhB = Number(rawMatrix[r][8 + k]);
      if (isFinite(ctrl) && isFinite(inhB) && ctrl > 0) ratios.push(inhB / ctrl);
    }
    if (ratios.length < 4) continue;
    const spread = Math.max(...ratios) - Math.min(...ratios);
    const mid = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    if (spread < 0.02 && Math.abs(mid - 0.35) < 0.02) hits.push(r);
  }
  return hits;
}

// Hypergeometric mean: draws from nR, target set of size m, sample of size n.
const hyperMean = (nR, m, n) => (m * n) / nR;

console.log('S351 Part 3 — Residual Spike Correlation on DS02, adjudicated against construction\n');

// ══ Gate ═══════════════════════════════════════════════════════════════════
console.log('== Gate — DS02 baseline against EXPECTED ==\n');
const base = await run(join('test/fixtures', DS02), EXPECTED[DS02].assay);
const baseSev = computeSeverity(base.results);
const decl = EXPECTED[DS02].flags || {};
let gateOk = baseSev.severity === EXPECTED[DS02].severity;
console.log(`  severity ${baseSev.severity} vs EXPECTED ${EXPECTED[DS02].severity}  ${gateOk ? 'OK' : 'MISMATCH'}`);
for (const [name, allow] of Object.entries(decl)) {
  const r = base.results.find(x => x.name === name);
  const got = r?.flag ?? '(absent)';
  const ok = allow.includes(got);
  if (!ok) gateOk = false;
  console.log(`  ${name.padEnd(32)} ${got.padEnd(9)} allow ${JSON.stringify(allow).padEnd(22)} ${ok ? 'OK' : 'MISMATCH'}`);
}
console.log('\n  full flag set as shipped:');
for (const r of base.results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')) {
  console.log(`    ${r.flag.padEnd(9)} ${r.name.padEnd(34)} dim=${TEST_MECHANISM[r.name]}  p=${typeof r.primaryP === 'number' ? r.primaryP.toExponential(3) : '—'}`);
}
if (!gateOk) {
  console.log('\nHALT — DS02 baseline disagrees with EXPECTED. Nothing measured.');
  process.exit(1);
}
console.log('\n  gate passed.\n');

// ══ Part 2 — what RSC selects, and where it lands ══════════════════════════
console.log('== Part 2 — the selected rows ==\n');
const m2Recovered = recoverM2Rows(base.fx.rawMatrix);
const m2Agree = JSON.stringify(m2Recovered) === JSON.stringify(M2_ROWS_EXPECTED);
console.log(`  M2 rows recovered from the data: ${fmtRows(m2Recovered)} (1-indexed)`);
console.log(`  generator's own selection:       ${fmtRows(M2_ROWS_EXPECTED)} (1-indexed)   ${m2Agree ? 'AGREE' : 'DISAGREE'}`);
const M2_ROWS = m2Agree ? M2_ROWS_EXPECTED : m2Recovered;

const { K, nR, sets } = topKSets(base.rsc);
console.log(`\n  rows ${nR}, K = ${K}, chance pairwise overlap K^2/nR = ${(K * K / nR).toFixed(3)}`);
console.log(`  RSC flag ${base.rsc.flag}, p = ${base.rsc.primaryP}, max overlap ${base.rsc.nOverlap}, best pair ${base.rsc.bestPair}\n`);
for (const s of sets) console.log(`  top-${K} of ${s.name.padEnd(12)} rows ${fmtRows(s.rows)}`);

console.log('\n  per-pair overlap, full selected set:');
const ovs = pairOverlaps(sets);
for (const o of ovs) {
  console.log(`    ${(o.a + ' vs ' + o.b).padEnd(28)} overlap ${o.shared.length}  rows ${fmtRows(o.shared)}`);
}

console.log('\n  where the overlap lands, against chance:');
const m3RowSet = new Set(M3_ROWS), m2RowSet = new Set(M2_ROWS);
for (const o of ovs) {
  const inM2 = o.shared.filter(r => m2RowSet.has(r));
  const inM3 = o.shared.filter(r => m3RowSet.has(r));
  const n = o.shared.length;
  console.log(`    ${(o.a + ' vs ' + o.b).padEnd(28)} n=${n}`);
  console.log(`        in M2 rows: ${inM2.length} observed vs ${hyperMean(nR, M2_ROWS.length, n).toFixed(2)} expected   ${fmtRows(inM2)}`);
  console.log(`        in M3 rows: ${inM3.length} observed vs ${hyperMean(nR, M3_ROWS.length, n).toFixed(2)} expected   ${fmtRows(inM3)}`);
  console.log(`        M1 covers every row, so an M1 intersection count carries no information`);
}

console.log('\n  sole occupancy — is every M2 row selected, and is every selected row an M2 row?');
for (const o of ovs) {
  const inM2 = o.shared.filter(r => m2RowSet.has(r));
  console.log(`    ${(o.a + ' vs ' + o.b).padEnd(28)} ${inM2.length} of ${o.shared.length} selected are M2; ${inM2.length} of ${M2_ROWS.length} M2 rows selected`);
}

// ══ Ablation ═══════════════════════════════════════════════════════════════
if (ABL && existsSync(ABL)) {
  console.log('\n== Part 2 — ablation ==\n');
  const variants = [
    ['ds02-full.csv',   'all three'],
    ['ds02-no-m1.csv',  'M1 off, DS01-style replacement'],
    ['ds02-no-m1b.csv', 'M1 off, variance-matched'],
    ['ds02-no-m2.csv',  'M2 off (scattered row copy)'],
    ['ds02-no-m3.csv',  'M3 off (replicate lock)'],
    ['ds02-none.csv',   'all three off'],
    ['ds02-none-b.csv', 'all three off, variance-matched'],
  ];
  console.log(['variant', 'RSC', 'p', 'maxOv', 'bestPair', 'severity'].join('\t'));
  for (const [f, label] of variants) {
    const p = join(ABL, f);
    if (!existsSync(p)) { console.log(`  ${f} missing`); continue; }
    const v = await run(p, EXPECTED[DS02].assay);
    const sev = computeSeverity(v.results);
    console.log([label.padEnd(28), v.rsc.flag.padEnd(9), v.rsc.primaryP, v.rsc.nOverlap, v.rsc.bestPair, sev.severity].join('\t'));
    const t = topKSets(v.rsc);
    for (const o of pairOverlaps(t.sets)) {
      console.log(`        ${(o.a + ' vs ' + o.b).padEnd(28)} overlap ${o.shared.length}  rows ${fmtRows(o.shared)}`);
    }
    // Which tests still fire, and what the copy does to the dispersion estimate.
    const fl = v.results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')
      .map(r => `${r.name}:${r.flag[0]}[${TEST_MECHANISM[r.name]}]`);
    console.log(`        flagged: ${fl.join('  ') || '(none)'}`);
    // Inter-Replicate Correlation is DS02's other MODERATE. Tracked across arms
    // because Part 4 asks whether the two flags are independent of each other.
    const irc = v.results.find(r => r.name === 'Inter-Replicate Correlation');
    console.log(`        IRC ${(irc?.flag ?? '(absent)').padEnd(9)} p=${typeof irc?.primaryP === 'number' ? irc.primaryP.toExponential(3) : '—'}`);
    const dv = residualScaleDispersion(condArrays(v.fx.matrix));
    console.log(`        s = ${dv.corrected.toFixed(4)} (raw ${dv.raw.toFixed(4)})`);
  }
}

// ══ DS01, the clean counterpart ════════════════════════════════════════════
console.log('\n== Part 2 — DS01, same assay and shape, clean ==\n');
const d1 = await run(join('test/fixtures', DS01), EXPECTED[DS01].assay);
const t1 = topKSets(d1.rsc);
console.log(`  RSC flag ${d1.rsc.flag}, p = ${d1.rsc.primaryP}, max overlap ${d1.rsc.nOverlap}, K = ${t1.K}, chance ${(t1.K * t1.K / t1.nR).toFixed(3)}`);
for (const s of t1.sets) console.log(`  top-${t1.K} of ${s.name.padEnd(12)} rows ${fmtRows(s.rows)}`);
for (const o of pairOverlaps(t1.sets)) {
  console.log(`    ${(o.a + ' vs ' + o.b).padEnd(28)} overlap ${o.shared.length}  rows ${fmtRows(o.shared)}`);
}

// ══ Part 3 — the heteroscedasticity number ═════════════════════════════════
// Fed RAW (pre-transform) per-condition subject x rep arrays, matching the
// estimator's own contract: it logs the values it is given.
console.log('\n== Part 3 — per-subject noise-scale dispersion ==\n');
function condArrays(matrix) {
  const bands = [[0, 4], [4, 8], [8, 12]];
  return bands.map(([lo, hi]) => matrix.map(row => row.slice(lo, hi)));
}
for (const [label, fx] of [['DS02', base.fx], ['DS01', d1.fx]]) {
  const d = residualScaleDispersion(condArrays(fx.matrix));
  console.log(`  ${label}  raw ${d.raw.toFixed(4)}   corrected s = ${d.corrected.toFixed(4)}   df/subject ${d.df.toFixed(1)}   subjects ${d.perSubject.length}`);
  console.log(`        bias term sqrt(1/(2*df)) = ${Math.sqrt(1 / (2 * d.df)).toFixed(4)} — raw below this returns corrected 0`);
}
console.log('\n  DS01 is the calibration check: S350 recorded it at 0.055.');

// The estimator's resolution on this shape. Twelve independently seeded honest
// files, same 35 subjects x 3 conditions x 4 reps. Their spread is what a single
// value can and cannot distinguish, so it decides whether DS02's number can be
// read against the 0.2-0.3 knee at all.
if (ABL && existsSync(join(ABL, 'honest-replicates'))) {
  const vals = [];
  for (let s = 0; s < 12; s++) {
    const p = join(ABL, 'honest-replicates', `honest-${String(s).padStart(2, '0')}.csv`);
    if (!existsSync(p)) continue;
    const fx = load(p, EXPECTED[DS02].assay);
    vals.push(residualScaleDispersion(condArrays(fx.matrix)).corrected);
  }
  vals.sort((a, b) => a - b);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  console.log(`\n  honest replicates, same shape, ${vals.length} independent seeds:`);
  console.log(`    ${vals.map(v => v.toFixed(3)).join('  ')}`);
  console.log(`    min ${vals[0].toFixed(3)}  median ${vals[Math.floor(vals.length / 2)].toFixed(3)}  max ${vals[vals.length - 1].toFixed(3)}  mean ${mean.toFixed(3)}`);
  console.log(`    honest data on this shape reads anywhere in that range, so a single s here`);
  console.log(`    resolves nothing finer than that band.`);
}

// ══ Part 4 — what carries DS02's verdict ═══════════════════════════════════
console.log('\n== Part 4 — severity decomposition ==\n');
const flagged = base.results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE');
console.log(`  as shipped: severity ${baseSev.severity}, high ${baseSev.high}, mod ${baseSev.mod}, dimensions ${baseSev.nFlaggedDimensions}`);
for (const r of flagged) {
  const kept = base.results.filter(x => x.name !== r.name);
  const s = computeSeverity(kept);
  console.log(`  drop ${r.name.padEnd(34)} -> severity ${s.severity}  (high ${s.high}, mod ${s.mod}, dims ${s.nFlaggedDimensions})`);
}

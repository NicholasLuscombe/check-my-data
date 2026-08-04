/* S352 — can we bound `s` in the field?
 *
 * P86's suspension of Residual Spike Correlation rests on one sentence: we
 * cannot bound `s` in real data. That was written before 33 deposits were on
 * disk with a pairing verdict attached. This retests it.
 *
 * ── The directions are not symmetric, and that governs how to read this ────
 *
 *   A LOW reading rules the risk out. Contamination only ever inflates this
 *   estimator, so a low value cannot be concealing a high one.
 *
 *   A HIGH reading settles nothing. It cannot separate honest heteroscedasticity
 *   from copy fabrication within the sample, and this corpus exists because
 *   somebody doubted these papers.
 *
 * So the measurement can only argue AGAINST shipping the suspension. It is
 * reported as it comes; nothing here is tuned toward a value.
 *
 * ── Why the positive control comes first ───────────────────────────────────
 *
 * Prompt 1's probe passed `condPerCol: null` unconditionally, which made the
 * column-grouped branch unreachable and returned 2 paired where the answer was
 * 18. The low number looked like a clean result. Here a low number is the answer
 * we are predisposed to accept, so the control that would catch an artefact
 * producing one runs BEFORE any corpus sheet is read — and it runs through the
 * same code path, not through a direct call to the estimator.
 *
 * ── Corpus location ────────────────────────────────────────────────────────
 *
 * corpus-data/ is gitignored, so it lives in the main checkout and in no
 * worktree. Pass --corpus, set CORPUS_DIR, or let the resolver walk up. If it is
 * absent the probe says so and exits non-zero rather than printing an empty
 * sweep that reads like a result.
 *
 * Usage:
 *   node test/probes/probe-s352-field-dispersion.mjs
 *   CORPUS_DIR=/abs/path/corpus-data node test/probes/probe-s352-field-dispersion.mjs
 *   node test/probes/probe-s352-field-dispersion.mjs --corpus /abs/path/corpus-data
 */
import { existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { residualScaleDispersion } = await import('../s-dispersion.mjs');
const { generate } = await import('../gen-copy-fidelity.mjs');
const { extractAnalysisInputs, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { preprocessRaw, detectHeaderRows, forwardFill } = await import('../../src/import/parser.js');
const { testResidualSpikeCorrelation } = await import('../../src/tests/residualSpikeCorrelation.js');
const Papa = await import('papaparse');

// ── Corpus directory, or a clear failure ───────────────────────────────────
const argIdx = process.argv.indexOf('--corpus');
const CANDIDATES = [
  argIdx >= 0 ? process.argv[argIdx + 1] : null,
  process.env.CORPUS_DIR,
  'corpus-data',
  resolve(process.cwd(), '../../../corpus-data'),   // worktree -> main checkout
].filter(Boolean);
const CORPUS = CANDIDATES.find(d => d && existsSync(d)) || null;

console.log('S352 — per-subject noise-scale dispersion on the real-world corpus\n');

if (!CORPUS) {
  console.error('CORPUS NOT FOUND. corpus-data/ is gitignored, so it exists in the main');
  console.error('checkout and in no worktree. Pass --corpus <abs path> or set CORPUS_DIR.');
  console.error('Tried:');
  for (const c of CANDIDATES) console.error('  ' + resolve(c));
  console.error('\nExiting rather than printing an empty sweep, which would read as a result.');
  process.exit(2);
}
console.log(`corpus: ${resolve(CORPUS)}`);
console.log(`        ${readdirSync(CORPUS).filter(f => /\.(xlsx?|csv)$/i.test(f)).length} data files\n`);

// ── One shared load path ───────────────────────────────────────────────────
// Every reading below — control and corpus alike — goes through this. A control
// that took a different route would not test what the corpus rows take.
function prep(rows) {
  const pre = preprocessRaw(rows).rows;
  const headerRows = detectHeaderRows(pre);
  const headers = pre[headerRows - 1];
  if (!Array.isArray(headers)) return { unusable: 'no usable header row after preprocessing' };
  const data = pre.slice(headerRows);
  if (!data.length) return { unusable: 'no data rows after the header' };
  // Two-row headers make a sheet column-grouped, which is what the pairing rule
  // calls structurally paired. Prompt 1 lost 16 of 18 paired sheets by passing
  // null here.
  const condPerCol = headerRows >= 2 ? forwardFill(pre[0]) : null;
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx, filteredIndices } =
    extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { headers, roles, data, matrix, condCtx, filteredIndices, condPerCol };
}

/** Per-condition nSubjects x nReps arrays, in the estimator's contract. */
function conditionArrays(p) {
  const slices = p.condCtx.has ? p.condCtx.slices() : [];
  if (slices.length < 2) return null;
  // Column-grouped slices are column subsets of the same rows: subject r is row
  // r everywhere, which is the alignment the estimator needs. Row-grouped slices
  // are row subsets, aligned by position within each condition.
  const arrays = slices.map(s => s.matrix.map(r => r.filter(v => v != null && isFinite(v))));
  const S = Math.min(...arrays.map(a => a.length));
  if (S < 2) return null;
  return { arrays: arrays.map(a => a.slice(0, S)), nSubjects: S, slices };
}

/** Replicates per subject per condition — the df budget the estimator lives on. */
function replicateCount(ca) {
  const widths = ca.arrays.flatMap(a => a.map(r => r.length));
  return widths.length ? Math.min(...widths) : 0;
}

/** The shipped test's verdict on this sheet, via the engine's own dispatch shape. */
function rscVerdict(p) {
  try {
    const m0 = validateMatrix(p.matrix).matrix;
    const rngFor = createPRNGFactory(m0);
    const vst = detectVST(m0, 'general');
    const t = vst?.transform || 'raw';
    let vm = null;
    if (t === 'log') vm = m0.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
    else if (t === 'anscombe') vm = m0.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
    const hasVST = vm !== null;
    const r = testResidualSpikeCorrelation(
      hasVST ? vm : m0,
      hasVST ? p.condCtx.withMatrix(vm) : p.condCtx,
      rngFor('Residual Spike Correlation'),
    );
    return { flag: r.flag, p: r.primaryP ?? null };
  } catch (e) {
    return { flag: 'ERROR', p: null, err: e.message };
  }
}

const f3 = x => (x == null || !isFinite(x)) ? '  —  ' : x.toFixed(3);
// §3 of the disposition: the one-condition estimator needs about 12 replicates
// to resolve a 0.25 threshold, and reads up to 0.214 on zero-dispersion data at 6.
const ONE_COND_MIN_REPS = 12;

// ════════════════════════════════════════════════════════════════════════════
// PART 2 — the positive control, before any corpus number is read
// ════════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(96));
console.log('Positive control — known planted dispersion, through the SAME path the corpus takes');
console.log('═'.repeat(96) + '\n');
console.log('  If this path cannot return a high value on data planted high, a low corpus');
console.log('  reading means nothing and every corpus row below is uninterpretable.\n');

const controls = [];
for (const sigmaS of [0, 0.5]) {
  for (const seed of [1, 2, 3]) {
    const d = generate({ k: 1, seed, sigmaS });          // k=1: independent, no copy contamination
    const rows = Papa.default.parse(d.columnGroupedCsv, { skipEmptyLines: true }).data;
    const p = prep(rows);
    if (p.unusable) { controls.push({ sigmaS, seed, unusable: p.unusable }); continue; }
    const ca = conditionArrays(p);
    if (!ca) { controls.push({ sigmaS, seed, unusable: 'no condition arrays' }); continue; }
    controls.push({
      sigmaS, seed,
      type: p.condCtx.type, nCond: ca.arrays.length, nSubjects: ca.nSubjects, reps: replicateCount(ca),
      cross: residualScaleDispersion(ca.arrays).corrected,
      one: residualScaleDispersion([ca.arrays[0]]).corrected,
    });
  }
}
console.log(`  ${'planted s'.padEnd(11)} ${'seed'.padEnd(6)} ${'context'.padEnd(16)} ${'cond'.padEnd(6)} ${'subj'.padEnd(6)} ${'reps'.padEnd(6)} ${'cross-cond s'.padEnd(14)} one-cond s`);
for (const c of controls) {
  if (c.unusable) { console.log(`  ${String(c.sigmaS).padEnd(11)} ${String(c.seed).padEnd(6)} UNUSABLE — ${c.unusable}`); continue; }
  console.log(`  ${String(c.sigmaS).padEnd(11)} ${String(c.seed).padEnd(6)} ${c.type.padEnd(16)} ${String(c.nCond).padEnd(6)} ${String(c.nSubjects).padEnd(6)} ${String(c.reps).padEnd(6)} ${f3(c.cross).padEnd(14)} ${f3(c.one)}`);
}
const lo = controls.filter(c => c.sigmaS === 0 && !c.unusable).map(c => c.cross);
const hi = controls.filter(c => c.sigmaS === 0.5 && !c.unusable).map(c => c.cross);
const PATH_OK = hi.length && lo.length && Math.min(...hi) > Math.max(...lo) && Math.min(...hi) > 0.25;
console.log(`\n  planted 0    cross-condition s ranges [${f3(Math.min(...lo))} .. ${f3(Math.max(...lo))}]`);
console.log(`  planted 0.5  cross-condition s ranges [${f3(Math.min(...hi))} .. ${f3(Math.max(...hi))}]`);
console.log(`\n  PATH ${PATH_OK ? 'RETURNS A HIGH VALUE ON DATA PLANTED HIGH — corpus rows are interpretable'
                              : 'DOES NOT SEPARATE — every corpus row below is UNINTERPRETABLE'}\n`);

// ── Second control: the corpus's ACTUAL replicate count ────────────────────
// The control above runs at 6 replicates, which is the generator's default and
// what the fixtures carry. If the corpus sheets carry fewer, a control at 6 says
// nothing about them: it would certify a resolution the corpus never gets. So the
// same planted values are run again at 2 replicates, and the question is whether
// a reading of 0 at that width distinguishes s = 0 from s = 0.5.
console.log('  Second control — the same planted values at 2 replicates per subject,');
console.log('  because that is what the corpus sheets turn out to carry.\n');
console.log('  This one calls the estimator DIRECTLY, unlike the control above, and the reason');
console.log('  is a measured obstacle rather than a shortcut: at nReps = 2 the generator emits a');
console.log('  two-row header whose second row detectHeaderRows reads as the only header, so no');
console.log('  condition structure forms and the pipeline path yields nothing to measure. The');
console.log('  path was already validated at 6 replicates above; what is in question here is the');
console.log('  ESTIMATOR\'s resolution at the corpus\'s width, so the six-replicate arrays are');
console.log('  sliced to their first two columns, preserving each subject\'s planted scale.\n');
const c2 = [];
for (const sigmaS of [0, 0.5]) {
  for (const seed of [1, 2, 3]) {
    const d = generate({ k: 1, seed, sigmaS });
    const A = d.A.map(r => r.slice(0, 2));
    const B = d.B.map(r => r.slice(0, 2));
    c2.push({ sigmaS, seed, reps: 2, nSubjects: A.length,
      cross: residualScaleDispersion([A, B]).corrected,
      one: residualScaleDispersion([A]).corrected });
  }
}
console.log(`  ${'planted s'.padEnd(11)} ${'seed'.padEnd(6)} ${'subj'.padEnd(6)} ${'reps'.padEnd(6)} ${'cross-cond s'.padEnd(14)} one-cond s`);
for (const c of c2) {
  console.log(`  ${String(c.sigmaS).padEnd(11)} ${String(c.seed).padEnd(6)} ${String(c.nSubjects).padEnd(6)} ${String(c.reps).padEnd(6)} ${f3(c.cross).padEnd(14)} ${f3(c.one)}`);
}
const lo2 = c2.filter(c => c.sigmaS === 0).map(c => c.cross);
const hi2 = c2.filter(c => c.sigmaS === 0.5).map(c => c.cross);
const SEP2 = lo2.length && hi2.length && Math.min(...hi2) > Math.max(...lo2);
console.log(`\n  at 2 replicates: planted 0 reads [${f3(Math.min(...lo2))} .. ${f3(Math.max(...lo2))}], planted 0.5 reads [${f3(Math.min(...hi2))} .. ${f3(Math.max(...hi2))}]`);
console.log(`  ${SEP2 ? 'STILL SEPARATES at 2 replicates — a low corpus reading is informative'
                      : 'DOES NOT SEPARATE at 2 replicates — a low corpus reading at this width is NOT informative'}\n`);

// ════════════════════════════════════════════════════════════════════════════
// PART 3 — the paired sheets
// ════════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(96));
console.log('Paired corpus sheets — pairing verdict taken from the shipped rule, not recomputed');
console.log('═'.repeat(96) + '\n');

const files = readdirSync(CORPUS).filter(f => /\.(xlsx?)$/i.test(f)).sort();
const rows = [];
for (const f of files) {
  let wb;
  try { wb = XLSX.readFile(join(CORPUS, f), { cellDates: false }); }
  catch (e) { rows.push({ f, sn: '(workbook)', skip: `unreadable: ${e.message}` }); continue; }
  for (const sn of wb.SheetNames) {
    let raw;
    try { raw = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, blankrows: false, defval: null }); }
    catch (e) { rows.push({ f, sn, skip: `sheet unreadable: ${e.message}` }); continue; }
    if (!raw || raw.length < 4 || !raw[0] || raw[0].length < 2) continue;   // too small to analyse
    let p;
    try { p = prep(raw); } catch (e) { rows.push({ f, sn, skip: `prep failed: ${e.message}` }); continue; }
    if (p.unusable) continue;                                              // not paired-eligible
    // The pairing verdict is the one extractAnalysisInputs stamped. Not recomputed.
    const v = p.condCtx.subjectPairing;
    if (!v || !v.paired) continue;

    const ca = conditionArrays(p);
    if (!ca) { rows.push({ f, sn, basis: v.basis, nCond: v.nConditions, skip: 'conditions could not be aligned into subject x rep arrays' }); continue; }
    const reps = replicateCount(ca);
    if (reps < 2) { rows.push({ f, sn, basis: v.basis, nCond: v.nConditions, reps, skip: 'fewer than 2 replicates per subject — estimator needs 2' }); continue; }
    rows.push({
      f, sn, basis: v.basis, nCond: ca.arrays.length, nSubjects: ca.nSubjects, reps,
      cross: residualScaleDispersion(ca.arrays).corrected,
      one: residualScaleDispersion([ca.arrays[0]]).corrected,
      oneInformative: reps >= ONE_COND_MIN_REPS,
      rsc: rscVerdict(p),
    });
  }
}

function printGroup(title, subset) {
  console.log(`  ${title} — ${subset.length} sheet(s)\n`);
  console.log(`  ${'workbook / sheet'.padEnd(38)} ${'basis'.padEnd(11)} ${'cond'.padEnd(5)} ${'subj'.padEnd(6)} ${'reps'.padEnd(5)} ${'cross s'.padEnd(9)} ${'one-cond s'.padEnd(20)} RSC verdict today`);
  for (const r of subset) {
    const name = `${r.f} / ${r.sn}`.slice(0, 37);
    if (r.skip) { console.log(`  ${name.padEnd(38)} ${String(r.basis ?? '—').padEnd(11)} ${String(r.nCond ?? '—').padEnd(5)} ${'—'.padEnd(6)} ${String(r.reps ?? '—').padEnd(5)} ${'NOT RUN'.padEnd(9)} ${r.skip}`); continue; }
    const oneCell = r.oneInformative ? f3(r.one) : `${f3(r.one)} uninformative`;
    const rscCell = r.rsc.flag + (r.rsc.p != null ? ` (p=${Number(r.rsc.p).toPrecision(3)})` : '') + (r.rsc.err ? ` ${r.rsc.err.slice(0, 30)}` : '');
    console.log(`  ${name.padEnd(38)} ${r.basis.padEnd(11)} ${String(r.nCond).padEnd(5)} ${String(r.nSubjects).padEnd(6)} ${String(r.reps).padEnd(5)} ${f3(r.cross).padEnd(9)} ${oneCell.padEnd(20)} ${rscCell}`);
  }
  console.log('');
}

const structural = rows.filter(r => r.basis === 'structural');
const identifier = rows.filter(r => r.basis === 'identifier');
const unknown = rows.filter(r => !r.basis);
printGroup('STRUCTURAL pairing (column-grouped — no evidence consulted)', structural);
printGroup('IDENTIFIER pairing (row-grouped — an id column carried it)', identifier);
if (unknown.length) printGroup('Could not be classified', unknown);

// ── What the "replicates" actually are ─────────────────────────────────────
// The readings above only mean anything if the columns inside a condition are
// repeat measurements of one quantity. On a two-row-header sheet the pipeline
// takes any column block under a shared span as a condition's replicates, and
// nothing checks that they are replicates. This prints the header names so the
// question is answered from the sheet rather than assumed.
console.log('  What the columns inside each condition actually are, read from the sheet:\n');
for (const r of rows.filter(x => !x.skip).slice(0, 8)) {
  try {
    const wb = XLSX.readFile(join(CORPUS, r.f), { cellDates: false });
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[r.sn], { header: 1, blankrows: false, defval: null });
    const span = (raw[0] || []).map(v => v == null ? '' : String(v)).filter(Boolean).slice(0, 2);
    const names = (raw[1] || []).map(v => v == null ? '' : String(v)).filter(Boolean).slice(0, 4);
    console.log(`    ${(r.f + ' / ' + r.sn).slice(0, 36).padEnd(38)} condition span: ${JSON.stringify(span).slice(0, 46)}`);
    console.log(`    ${''.padEnd(38)} its columns:    ${JSON.stringify(names).slice(0, 70)}`);
  } catch { /* already reported above */ }
}
console.log('');

console.log('  The RSC column is the shipped test\'s CURRENT VERDICT on that sheet. It is NOT a');
console.log('  false-positive rate. These deposits were selected because someone doubted the');
console.log('  papers, so a flag here is not evidence of a false positive — and a flag on data');
console.log('  the rule calls paired is exactly what P86 proposes to withhold.\n');

// ── Summary ────────────────────────────────────────────────────────────────
const ran = rows.filter(r => !r.skip);
const med = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2])) : NaN; };
const crossVals = ran.map(r => r.cross);
const oneVals = ran.filter(r => r.oneInformative).map(r => r.one);
const flagged = ran.filter(r => r.rsc.flag === 'HIGH' || r.rsc.flag === 'MODERATE');

console.log('═'.repeat(96));
console.log('Summary');
console.log('═'.repeat(96) + '\n');
console.log(`  paired sheets found        ${rows.length}   (${structural.length} structural, ${identifier.length} identifier)`);
console.log(`  measured                   ${ran.length}`);
console.log(`  not run                    ${rows.length - ran.length}`);
if (crossVals.length) {
  console.log(`\n  cross-condition s   median ${f3(med(crossVals))}   min ${f3(Math.min(...crossVals))}   max ${f3(Math.max(...crossVals))}   (n=${crossVals.length})`);
  console.log(`                      at or above 0.25: ${crossVals.filter(v => v >= 0.25).length} of ${crossVals.length}`);
}
console.log(`\n  one-condition s     informative on ${oneVals.length} of ${ran.length} sheets (needs >= ${ONE_COND_MIN_REPS} replicates)`);
if (oneVals.length) {
  console.log(`                      median ${f3(med(oneVals))}   min ${f3(Math.min(...oneVals))}   max ${f3(Math.max(...oneVals))}`);
} else {
  console.log(`                      no sheet carries enough replicates — the copy-immune estimator`);
  console.log(`                      cannot be read anywhere on this corpus`);
}
console.log(`\n  replicates per sheet: min ${Math.min(...ran.map(r => r.reps))}, max ${Math.max(...ran.map(r => r.reps))}, median ${med(ran.map(r => r.reps))}`);
console.log(`\n  shipped test flags on ${flagged.length} of ${ran.length} paired sheets (MODERATE or HIGH):`);
for (const r of flagged) console.log(`    ${r.f} / ${r.sn} — ${r.rsc.flag} p=${Number(r.rsc.p).toPrecision(3)}`);
if (!flagged.length) console.log('    (none)');
console.log(`\n  Reading rule: a LOW median argues against the suspension, because contamination`);
console.log(`  only inflates this estimator. A HIGH median settles nothing on a corpus selected`);
console.log(`  for suspicion.`);

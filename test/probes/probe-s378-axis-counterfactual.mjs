/* S378 — P93 axis counterfactual.
 *
 * P93 sits on an untested argument: that axis columns reading as replicates
 * MANUFACTURE firings. The alternative is that they inflate nC, inflate the
 * correction families, and cost power instead. Nobody has measured which.
 *
 * This runs the battery on the fifteen column-grouped corpus sheets three
 * times and diffs verdicts, flags, naCauses and p-values.
 *
 * ── Why three arms and not two ─────────────────────────────────────────────
 *
 * The obvious probe is two arms: as deposited, then with the axes removed.
 * That probe would be wrong, and S378 part 1 measured why before building it.
 *
 * Eleven of C25's twelve column-grouped sheets run TWO columns per group, one
 * of them the axis. Hold the axis out and every group is one column wide.
 * `aggregation.js:24` closes buildGroups with
 *     .filter(g => g.matrix.length >= 4 && g.matrix[0].length >= 2)
 * so a one-column group is DROPPED, not kept. Every group goes, `groups` is
 * [], `conditionContext.js:52`'s `hasGroups = groups && groups.length >= 2`
 * goes false, and the file silently reclassifies to type 'none'.
 * `subjectPairing` then returns unpaired.
 *
 * So a two-arm diff on those eleven sheets does not measure "the axes were
 * removed". It measures "the condition structure was destroyed" — every
 * condition-aware test changing naCause, and the two paired-design skips
 * un-suspending. None of that is about axes.
 *
 * Arm C isolates it. Same columns as A, same absent structure as B:
 *
 *   A   as deposited
 *   B   axes held out, via an index-keyed `label` stamp after inference
 *   C   grouping suppressed, all columns kept, via condPerCol: null
 *
 *   A -> C   the cost of losing the grouping, axes retained
 *   C -> B   the axis effect at constant structure — THE P93 MEASUREMENT
 *   A -> B   the total, which is what a two-arm probe reports as if it were
 *            the P93 measurement
 *
 * `Fig. 3g` is the exception and it is reported alone. It carries FOUR columns
 * per group, two of them axes, so its arm B keeps five two-column groups and
 * stays paired. A -> B answers P93's question there with no confound. One
 * sheet, n = 1, and the report says n = 1 rather than let it hide inside a
 * fifteen-sheet total.
 *
 * ── The route ──────────────────────────────────────────────────────────────
 *
 * `prepStructure` is copied VERBATIM from probe-s375-p93-census.mjs:87, which
 * copied it from probe-s373-corpus-shape-census.mjs, which copied it from
 * scripts/corpus-run.mjs:146. The battery call mirrors corpus-run's runDataset.
 * Nothing here hand-builds a matrix, parses a sheet directly, or calls a test
 * function. An instrument that builds its own inputs measures itself and not
 * the path under test — which is exactly the defect S378 part 1 found in
 * probe-s352-field-dispersion.mjs, whose ten Residual Spike Correlation
 * firings were taken by calling the test directly, past the gate that withholds
 * it on every one of those sheets.
 *
 * ── Why the hold-out is keyed on INDEX and not on header text ──────────────
 *
 * The shipped precedent is corpus-run.mjs's `conditionsHint` role override:
 * a declarative map stamped over inferRoles' output after inference,
 * runner-only, engine untouched, with `identifier` mapping to the `label` role
 * that keeps a column out of `dataCols`. That is the right mechanism and it is
 * reused unchanged in spirit.
 *
 * Its map is keyed on header STRING, and `corpus-run.mjs:137` resolves it with
 * `hdrs.indexOf(header)` — first match only. On these sheets each axis header
 * repeats three to ten times: `Fig. 2b` carries four `Wavelength (nm)`,
 * `Fig. 3g` ten `Time (s)`. A string-keyed hint would demote one of them and
 * log nothing, because the header IS found. It would print a clean run and be
 * wrong on all twelve axis-bearing sheets.
 *
 * So the stamp below is keyed on column index. Same role vocabulary, same
 * position in the pipeline, same runner-only scope, no new vocabulary, and
 * nothing under src/ or scripts/ changes.
 *
 * ── Two things kept honest rather than convenient ──────────────────────────
 *
 * VST and zeroAsMissing are RE-DERIVED per arm, not held fixed across arms.
 * detectVST reads the matrix and the matrix differs between arms, so pinning
 * one arm's transform onto another would be a hand intervention that the
 * shipped path never performs. Both are recorded per arm; if either moves, the
 * report says so and the diff is read with that in hand.
 *
 * ── The confound's direction, stated before the run ────────────────────────
 *
 * Removing columns SHRINKS the correction families, and a BH family of one
 * returns the raw p. So surviving tests get MORE likely to flag in arm B, not
 * less. A flag that disappears disappeared against that pressure and can be
 * read as a real loss. A flag that appears is ambiguous until its family size
 * is read — which is why family size is an output column here and not a note.
 *
 * ── Corpus location ────────────────────────────────────────────────────────
 *
 * corpus-data/ is gitignored, so it lives in the main checkout and in no
 * worktree. CORPUS_DIR overrides; the resolver walks up. If it is absent the
 * probe says so and exits non-zero rather than printing an empty sweep that
 * reads like a result.
 *
 * Usage:
 *   node test/probes/probe-s378-axis-counterfactual.mjs --structure
 *   node test/probes/probe-s378-axis-counterfactual.mjs --cost
 *   node test/probes/probe-s378-axis-counterfactual.mjs            # everything
 *   CORPUS_DIR=/abs/path node test/probes/probe-s378-axis-counterfactual.mjs
 *
 * Env: JSON_OUT — also write the full per-sheet per-arm per-test record.
 *
 * The landed run, so the numbers can be re-read without re-running:
 *   test/probes/s378-axis-counterfactual.txt    the printed tables
 *   test/probes/s378-axis-counterfactual.json   every per-test cell and every diff
 * Regenerate both with:
 *   JSON_OUT=test/probes/s378-axis-counterfactual.json \
 *     node test/probes/probe-s378-axis-counterfactual.mjs \
 *     > test/probes/s378-axis-counterfactual.txt
 * NOT corpus-out/ — that path is gitignored (.gitignore:60), so an artefact left
 * there is invisible to `git status` and lands nowhere.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

// The engine yields the Blocked-Mahalanobis permutation loop through this;
// Node has no rAF, so polyfill it exactly as validate-batch.mjs does.
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferBaseRoles, detectGroupAttributes } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { summarize } = await import('../../src/import/summary.js');
const { parseExcel, getSheetNames } = await import('../../src/import/excel.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');

const ARGS = process.argv.slice(2);
const ONLY_STRUCTURE = ARGS.includes('--structure');
const ONLY_COST = ARGS.includes('--cost');
const FULL = !ONLY_STRUCTURE && !ONLY_COST;

// ── Corpus directory, or a clear failure ───────────────────────────────────
const CANDIDATES = [
  process.env.CORPUS_DIR,
  'corpus-data',
  resolve(process.cwd(), '../../../corpus-data'),   // worktree -> main checkout
].filter(Boolean);
const CORPUS = CANDIDATES.find(d => existsSync(d)) || null;

const SHEET_FILES = ['C25.xlsx', 'C15.xlsx'];

// ── The axis reference set ─────────────────────────────────────────────────
// Copied from probe-s375-p93-census.mjs:492 unchanged, including the contested
// member. It is AUTHORED, not measured — "which column is the axis" is the very
// thing no measurement in the battery answers, which is P93.
//
// This probe deliberately does NOT use the first-difference discriminator. That
// keeps it independent of every open item in P93-DISPOSITION.md §7 — the
// threshold, the plateau, and the unsettled pre-trim/post-trim matrix question.
// The census's known labels are the whole input.
const AXIS_HEADERS = new Set([
  'Wavelength (nm)', 'Time (s)', 'Decay time (s)', 'Temperature (K)', 'Magnetic field (mT)',
  '1/(KB*Tm) (eV-1)',
]);

// ── The two tests quarantined out of every diff total ──────────────────────
// Both are withheld in arm A on all fifteen sheets, because column-grouped data
// is structurally paired (subjectPairing.js:90) and engine.js:371 withholds them
// on that verdict. Both UN-SUSPEND in arms B and C on the eleven sheets that
// lose their grouping, because an unpaired file no longer triggers the skip.
// That transition is an artefact of the collapse. Counted into a diff total it
// would read as axes causing firings, which is the exact claim this probe
// exists to test. Reported in their own section instead.
const QUARANTINE = new Set(['Residual Spike Correlation', 'Cross-Condition Consistency']);

// ── Part 1's structural table, hardcoded as a prediction ───────────────────
// Taken from the S378 part 1 scratchpad projection, which stopped before
// runFullAnalysis. Re-derived here as a probe output so it lives in the repo.
// Per sheet: [arm B condition type, arm B group count, arm B paired].
const PART1_ARM_B = {
  'C25/Fig. 2b':   ['none', 0, false],
  'C25/Fig. 2d':   ['none', 0, false],
  'C25/Fig. 2e':   ['none', 0, false],
  'C25/Fig. 2f':   ['none', 0, false],
  'C25/Fig. 3b-c': ['none', 0, false],
  'C25/Fig. 3d':   ['none', 0, false],
  'C25/Fig. 3f':   ['none', 0, false],
  'C25/Fig. 3g':   ['column-grouped', 5, true],
  'C25/Fig. 4b':   ['none', 0, false],
  'C25/Fig. 4c':   ['none', 0, false],
  'C25/Fig. 4e':   ['none', 0, false],
  'C25/Fig. 4f':   ['none', 0, false],
  'C15/Fig. 2':    ['column-grouped', 3, true],
  'C15/Fig. 5':    ['column-grouped', 3, true],
  'C15/Fig. S1':   ['column-grouped', 3, true],
};

// ── prepStructure — copied VERBATIM from probe-s375-p93-census.mjs:87 ──────
function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('Empty after preprocessing.');

  const blocks = detectBlocks(preprocessed);
  let blockRows = blocks.length > 1 ? blocks[0] : preprocessed;
  const nBlocks = blocks.length;

  const maxC0 = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const minCells0 = Math.max(2, Math.ceil(maxC0 * 0.1));
  while (blockRows.length > 2) {
    const nb = blockRows[0].filter(v => v != null && String(v).trim() !== '').length;
    if (nb < minCells0) blockRows = blockRows.slice(1); else break;
  }

  const nH = detectHeaderRows(blockRows);
  const maxC = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = r => { const o = [...r]; while (o.length < maxC) o.push(null); return o; };

  let hdrs, data, condPerCol = null;
  if (nH === 0) {
    hdrs = Array.from({ length: maxC }, (_, i) => 'Col ' + (i + 1));
    data = blockRows.map(pad);
  } else if (nH === 1) {
    hdrs = pad(blockRows[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(1).map(pad);
  } else {
    const rawGR = pad(blockRows[0]), nameRow = pad(blockRows[1]);
    const groups = forwardFill(rawGR);
    condPerCol = new Array(maxC).fill(null);
    for (let i = 0; i < maxC; i++) {
      const g = groups[i] != null ? String(groups[i]).trim() : '';
      if (g) condPerCol[i] = g;
    }
    hdrs = nameRow.map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(2).map(pad);
  }

  const longFormatDetected = !!detectLongFormat(hdrs, data);
  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, longFormatDetected, nH, nBlocks, prep };
}

// ── The index-keyed role stamp — Route A' ─────────────────────────────────
// Stamps a declared role over inferRoles' output for the named column INDICES,
// at the same point in the pipeline corpus-run.mjs:193 stamps its header-keyed
// hint. Returns a NEW roles array; the caller's stays untouched, so the three
// arms cannot contaminate one another through a shared mutable array.
//
// `identifier` maps to the `label` role, exactly as HINT_ROLE_MAP does at
// corpus-run.mjs:66. A `label` column falls out of the matrix at the engine's
// single dataCols line (engine.js:113, `role === "data"`), which removes it from
// the whole battery at once.
//
// `label` and `attribute` were checked and are indistinguishable at every site
// this probe measures — dataCols, buildGroups, condition inference,
// computeTrigger, subjectPairing, the export role filter and summarize all
// treat them alike. The only divergence is the ImportView role chip
// (constants/roles.js:12), and this probe renders nothing. So `label` is used
// and no vocabulary is extended.
function stampRolesByIndex(roles, indices, role = 'label') {
  const out = [...roles];
  for (const i of indices) out[i] = role;
  return out;
}

/** Column indices that carry an axis header AND currently enter the matrix. */
function axisIndices(hdrs, roles) {
  const out = [];
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] !== 'data') continue;
    const h = hdrs[i] == null ? '' : String(hdrs[i]).trim();
    if (AXIS_HEADERS.has(h)) out.push(i);
  }
  return out;
}

// ── One arm ────────────────────────────────────────────────────────────────
// Mirrors scripts/corpus-run.mjs runDataset from summarize onward. Every
// derived input is RE-DERIVED from that arm's own roles and matrix, because
// that is what the shipped path does; carrying one arm's value into another
// would be an intervention no user performs.
function buildArm(p, arm, path) {
  const roles = arm === 'B' ? stampRolesByIndex(p.roles, axisIndices(p.hdrs, p.roles)) : p.roles;
  const condPerCol = arm === 'C' ? null : p.condPerCol;

  const auto = detectAssay(path.split('/').pop(), p.hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';

  const sum = summarize(p.data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;

  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: p.longFormatDetected });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data: p.data, roles, hdrs: p.hdrs, condPerCol, zeroAsMissing,
    assay, dataType, fileName: path, colRelationship: 'replicates', rowSemantics,
  });
  const vst = detectVST(matrix, assay);

  return { roles, condPerCol, assay, dataType, zeroAsMissing, rowSemantics, matrix, rawMatrix, condCtx, vst };
}

/** The structural readout for one arm. No test runs. */
function structureOf(a) {
  return {
    type: a.condCtx.type,
    nGroups: a.condCtx.has && a.condCtx.type === 'column-grouped' ? a.condCtx.count : 0,
    nCols: a.matrix[0]?.length ?? 0,
    nRows: a.matrix.length,
    paired: !!a.condCtx.subjectPairing?.paired,
    pairingBasis: a.condCtx.subjectPairing?.basis ?? null,
    groupWidths: a.condCtx.has && a.condCtx.type === 'column-grouped'
      ? a.condCtx.slices().map(s => s.matrix[0].length) : [],
    vst: a.vst?.transform || 'raw',
    zeroAsMissing: a.zeroAsMissing,
  };
}

// ── Family size and dispatch surface, harvested from the result ───────────
// `groupsAssessed` is set ONLY by aggregatePerGroup, so it is the dispatch-surface
// discriminator — the same one localization.js, convergence.js and ReportView use.
// Family-size fields are whatever the test chose to publish; absent is reported as
// absent rather than as zero, because a test that publishes no denominator and a
// test whose denominator is zero are different facts.
const FAMILY_FIELDS = ['nPairs', 'pairsTotal', 'nTested', 'nCols', 'nUnits'];

function testRow(r) {
  const row = {
    name: r.name,
    flag: r.flag,
    naCause: r.naCause ?? null,
    primaryP: typeof r.primaryP === 'number' ? r.primaryP : null,
    surface: r.groupsAssessed ? 'per-group' : 'whole-matrix',
    groupsAssessed: r.groupsAssessed ?? null,
  };
  const fam = {};
  for (const f of FAMILY_FIELDS) if (typeof r[f] === 'number') fam[f] = r[f];
  row.family = Object.keys(fam).length ? fam : null;
  return row;
}

async function runArm(a) {
  const results = await runFullAnalysis(
    a.matrix, a.rawMatrix, a.condCtx, a.assay, null, a.vst,
    { isPivoted: false }, a.dataType, a.rowSemantics
  );
  const sev = computeSeverity(results);
  return { severity: sev, tests: results.map(testRow) };
}

// ── Diffing ────────────────────────────────────────────────────────────────
const pStr = v => v == null ? '—' : Number(v).toPrecision(3);
const cell = t => `${t.flag}${t.naCause ? ':' + t.naCause : ''}`;

/** Per-test differences between two arms of one sheet, quarantine excluded. */
function diffArms(x, y) {
  const byName = new Map(y.tests.map(t => [t.name, t]));
  const moved = [];
  for (const tx of x.tests) {
    if (QUARANTINE.has(tx.name)) continue;
    const ty = byName.get(tx.name);
    if (!ty) continue;
    const flagMoved = tx.flag !== ty.flag || (tx.naCause ?? null) !== (ty.naCause ?? null);
    const pMoved = !samep(tx.primaryP, ty.primaryP);
    if (flagMoved || pMoved) moved.push({ name: tx.name, from: tx, to: ty, flagMoved, pMoved });
  }
  return moved;
}
function samep(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a === b;
}
/** Quarantined tests only — the un-suspension record. */
function diffQuarantine(x, y) {
  const byName = new Map(y.tests.map(t => [t.name, t]));
  const out = [];
  for (const tx of x.tests) {
    if (!QUARANTINE.has(tx.name)) continue;
    const ty = byName.get(tx.name);
    if (!ty) continue;
    if (tx.flag !== ty.flag || (tx.naCause ?? null) !== (ty.naCause ?? null) || !samep(tx.primaryP, ty.primaryP)) {
      out.push({ name: tx.name, from: tx, to: ty });
    }
  }
  return out;
}

const line = (n = 100) => '─'.repeat(n);
const rule = (n = 100) => '═'.repeat(n);

// ════════════════════════════════════════════════════════════════════════════
console.log('S378 — P93 axis counterfactual: three arms over the fifteen column-grouped sheets\n');

if (!CORPUS) {
  console.error('CORPUS NOT FOUND. corpus-data/ is gitignored, so it exists in the main');
  console.error('checkout and in no worktree. Set CORPUS_DIR or run from the main checkout.');
  console.error('Tried:');
  for (const c of CANDIDATES) console.error('  ' + resolve(c));
  console.error('\nExiting rather than printing an empty sweep, which would read as a result.');
  process.exit(2);
}
console.log(`corpus: ${resolve(CORPUS)}\n`);

// ── Collect the fifteen sheets and their three arms (structure only) ───────
const sheets = [];
for (const file of SHEET_FILES) {
  const path = join(CORPUS, file);
  if (!existsSync(path)) { console.error(`MISSING: ${path}`); process.exit(2); }
  const bytes = readFileSync(path);
  const names = await getSheetNames(new Blob([bytes]));
  for (const sheet of names) {
    let raw;
    try { ({ rows: raw } = await parseExcel(new Blob([bytes]), sheet)); }
    catch { continue; }
    let p;
    try { p = prepStructure(raw); } catch { continue; }

    let armA;
    try { armA = buildArm(p, 'A', path); } catch { continue; }
    if (armA.condCtx.type !== 'column-grouped') continue;   // not one of the fifteen

    const key = `${file.replace(/\.xlsx?$/i, '')}/${sheet}`;
    const arms = { A: armA };
    try { arms.B = buildArm(p, 'B', path); arms.C = buildArm(p, 'C', path); }
    catch (e) { console.error(`THROW building arms on ${key}: ${e.message}`); process.exit(3); }

    sheets.push({
      key, file, sheet, path, p,
      nAxis: axisIndices(p.hdrs, p.roles).length,
      arms,
      structure: { A: structureOf(arms.A), B: structureOf(arms.B), C: structureOf(arms.C) },
    });
  }
}

if (sheets.length !== 15) {
  console.error(`ENUMERATION GATE FAILED: ${sheets.length} column-grouped sheets, expected 15.`);
  process.exit(3);
}
const nAxisTotal = sheets.reduce((s, x) => s + x.nAxis, 0);
const nColTotal = sheets.reduce((s, x) => s + x.structure.A.nCols, 0);
console.log(`enumeration gate: 15 column-grouped sheets, ${nColTotal} columns, ${nAxisTotal} axes\n`);

// ════════════════════════════════════════════════════════════════════════════
// OUTPUT 1 — the structural table, re-derived
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('Output 1 — structural table, per sheet per arm (no test has run)');
console.log(rule() + '\n');
console.log('  A = as deposited.  B = axes held out.  C = grouping suppressed, all columns kept.\n');
console.log(`  ${'sheet'.padEnd(16)} ${'axes'.padEnd(5)} ${'arm'.padEnd(4)} ${'type'.padEnd(15)} ${'grp'.padEnd(4)} ${'cols'.padEnd(5)} ${'rows'.padEnd(6)} ${'paired'.padEnd(7)} ${'vst'.padEnd(5)} group widths`);
for (const s of sheets) {
  for (const arm of ['A', 'B', 'C']) {
    const st = s.structure[arm];
    console.log(`  ${(arm === 'A' ? s.key : '').padEnd(16)} ${(arm === 'A' ? String(s.nAxis) : '').padEnd(5)} ${arm.padEnd(4)} ${st.type.padEnd(15)} ${String(st.nGroups).padEnd(4)} ${String(st.nCols).padEnd(5)} ${String(st.nRows).padEnd(6)} ${String(st.paired).padEnd(7)} ${st.vst.padEnd(5)} ${st.groupWidths.join('/') || '—'}`);
  }
  console.log('');
}

// ── Agreement with part 1 ─────────────────────────────────────────────────
console.log('  Agreement with S378 part 1 (arm B type / group count / paired):\n');
let disagreements = 0;
for (const s of sheets) {
  const pred = PART1_ARM_B[s.key];
  const st = s.structure.B;
  if (!pred) { console.log(`    ${s.key.padEnd(16)} NO PREDICTION RECORDED`); disagreements++; continue; }
  const ok = pred[0] === st.type && pred[1] === st.nGroups && pred[2] === st.paired;
  if (!ok) {
    console.log(`    ${s.key.padEnd(16)} DISAGREES — part 1 said ${pred.join('/')}, measured ${st.type}/${st.nGroups}/${st.paired}`);
    disagreements++;
  }
}
console.log(disagreements === 0
  ? '    all fifteen agree with part 1.\n'
  : `\n    ${disagreements} DISAGREEMENT(S). The disagreement is the finding — stopping before the batteries.\n`);
if (disagreements > 0) process.exit(4);

// ── The collapse, counted ─────────────────────────────────────────────────
const collapsed = sheets.filter(s => s.structure.A.type === 'column-grouped' && s.structure.B.type === 'none');
const survived = sheets.filter(s => s.nAxis > 0 && s.structure.B.type === 'column-grouped');
const noAxis = sheets.filter(s => s.nAxis === 0);
console.log(`  collapse: ${collapsed.length} sheet(s) reclassify to type 'none' in arm B and lose pairing`);
console.log(`            ${survived.length} axis-bearing sheet(s) keep column grouping: ${survived.map(s => s.key).join(', ') || '—'}`);
console.log(`            ${noAxis.length} sheet(s) carry no axis (negative control): ${noAxis.map(s => s.key).join(', ')}\n`);

if (ONLY_STRUCTURE) process.exit(0);

// ════════════════════════════════════════════════════════════════════════════
// COST GATE
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('Cost gate — one battery run on the largest sheet before committing to 45');
console.log(rule() + '\n');

const biggest = sheets.find(s => s.key === 'C25/Fig. 2d') || sheets[0];
console.log(`  timing arm A on ${biggest.key} (${biggest.structure.A.nRows} x ${biggest.structure.A.nCols})...`);
const t0 = Date.now();
const costRun = await runArm(biggest.arms.A);
const oneRunMs = Date.now() - t0;
const projMs = oneRunMs * 45;
console.log(`  one run: ${(oneRunMs / 1000).toFixed(1)} s`);
console.log(`  projected 45 runs: ${(projMs / 60000).toFixed(1)} min (upper bound — this is the largest sheet)`);
const OVER = projMs > 20 * 60 * 1000;
console.log(`  ${OVER ? 'OVER the ~20 min budget — STOPPING, no full run' : 'within the ~20 min budget — proceeding'}\n`);
if (OVER) process.exit(5);
if (ONLY_COST) process.exit(0);

// ════════════════════════════════════════════════════════════════════════════
// THE FULL RUN
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('Full run — 15 sheets x 3 arms');
console.log(rule() + '\n');

const runs = {};
const wallStart = Date.now();
for (const s of sheets) {
  runs[s.key] = {};
  for (const arm of ['A', 'B', 'C']) {
    // Reuse the cost-gate run rather than repeat it; same arm, same inputs.
    if (s === biggest && arm === 'A') { runs[s.key].A = costRun; process.stdout.write('.'); continue; }
    try { runs[s.key][arm] = await runArm(s.arms[arm]); }
    catch (e) {
      console.error(`\n\nTHROW on ${s.key} arm ${arm}: ${e.message}`);
      console.error('Stopping the run and naming the sheet, per the stop condition.');
      process.exit(6);
    }
    process.stdout.write('.');
  }
}
console.log(`\n\n  ${sheets.length * 3} runs in ${((Date.now() - wallStart) / 60000).toFixed(1)} min\n`);

// ── CONTROL: C15's three sheets must show a zero diff ─────────────────────
console.log(rule());
console.log('Control — the three no-axis sheets must be identical in arms A and B');
console.log(rule() + '\n');
let controlFailed = false;
for (const s of noAxis) {
  const moved = diffArms(runs[s.key].A, runs[s.key].B);
  const q = diffQuarantine(runs[s.key].A, runs[s.key].B);
  const n = moved.length + q.length;
  console.log(`  ${s.key.padEnd(16)} ${n === 0 ? 'zero diff — held' : `${n} CELL(S) MOVED — CONTROL FAILED`}`);
  if (n > 0) {
    controlFailed = true;
    for (const m of [...moved, ...q]) console.log(`      ${m.name}: ${cell(m.from)} p=${pStr(m.from.primaryP)}  ->  ${cell(m.to)} p=${pStr(m.to.primaryP)}`);
  }
}
if (controlFailed) {
  console.error('\n  CONTROL FAILED. These sheets carry no axis, so arm B must equal arm A.');
  console.error('  The instrument is wrong and the C25 rows are unreadable. Stopping.\n');
  process.exit(7);
}
console.log('\n  All three hold. The C25 rows are readable.\n');

// ════════════════════════════════════════════════════════════════════════════
// OUTPUT 2 — the per-test table
// ════════════════════════════════════════════════════════════════════════════
console.log(rule(118));
console.log('Output 2 — per test, per arm. flag:naCause, primaryP, correction family, dispatch surface');
console.log(rule(118) + '\n');
console.log('  Quarantined tests are marked [Q] and excluded from every diff total below. Family is');
console.log('  whatever the test publishes; blank means it publishes none, which is not the same as zero.\n');

for (const s of sheets) {
  console.log(line(118));
  console.log(`  ${s.key}   ${s.nAxis} axis column(s) of ${s.structure.A.nCols}`);
  console.log(line(118));
  for (const arm of ['A', 'B', 'C']) {
    const st = s.structure[arm];
    const sev = runs[s.key][arm].severity;
    console.log(`  arm ${arm}: ${st.type}, ${st.nGroups} groups, ${st.nCols} cols, paired=${st.paired}, vst=${st.vst}  ->  severity ${sev.severity} (${sev.high} HIGH, ${sev.mod} MOD)`);
  }
  console.log('');
  console.log(`  ${'test'.padEnd(32)} ${'A'.padEnd(30)} ${'B'.padEnd(30)} ${'C'.padEnd(30)} surf`);
  const names = runs[s.key].A.tests.map(t => t.name);
  for (const name of names) {
    const cells = ['A', 'B', 'C'].map(arm => {
      const t = runs[s.key][arm].tests.find(x => x.name === name);
      if (!t) return '(absent)';
      const fam = t.family ? ' {' + Object.entries(t.family).map(([k, v]) => `${k}=${v}`).join(',') + '}' : '';
      return `${cell(t)} ${pStr(t.primaryP)}${fam}`;
    });
    const tA = runs[s.key].A.tests.find(x => x.name === name);
    const surf = ['A', 'B', 'C'].map(arm => {
      const t = runs[s.key][arm].tests.find(x => x.name === name);
      return t ? (t.surface === 'per-group' ? 'G' : 'M') : '?';
    }).join('');
    const mark = QUARANTINE.has(name) ? '[Q] ' : '';
    console.log(`  ${(mark + name).slice(0, 31).padEnd(32)} ${cells[0].slice(0, 29).padEnd(30)} ${cells[1].slice(0, 29).padEnd(30)} ${cells[2].slice(0, 29).padEnd(30)} ${surf}`);
  }
  console.log('');
}
console.log('  surf column: one letter per arm (A B C). M = whole-matrix dispatch, G = per-group.\n');

// ════════════════════════════════════════════════════════════════════════════
// OUTPUT 3 — the three legs
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('Output 3 — the three legs, reported separately');
console.log(rule() + '\n');

// ── The scope each leg is READABLE over, which is not always all fifteen ───
// C -> B is a constant-structure contrast ONLY where arms C and B share a
// structure. That is the eleven collapsed sheets, where both are type 'none'.
//
// On the three no-axis C15 sheets arm B still carries its grouping and arm C
// does not, so C -> B there is a pure structure contrast with no axis removed
// at all — it reads identically to their A -> C, and it does. On Fig. 3g arm B
// keeps its grouping too, so C -> B mixes the axis removal with a structure
// change in the opposite direction.
//
// A total taken over all fifteen would fold those four sheets into the P93
// figure, which is the same class of error arm C exists to prevent. Both scopes
// are printed and the readable one is named.
const COLLAPSED_KEYS = new Set(collapsed.map(s => s.key));

const LEGS = [
  ['A', 'C', 'A -> C   the cost of LOSING THE GROUPING, axes retained', null],
  ['C', 'B', 'C -> B   the AXIS EFFECT at constant structure — THE P93 MEASUREMENT', COLLAPSED_KEYS],
  ['A', 'B', 'A -> B   the CONFOUNDED TOTAL — what a two-arm probe would report', null],
];

const legTotals = {};
for (const [x, y, title, scope] of LEGS) {
  console.log(line());
  console.log(`  ${title}`);
  if (scope) console.log(`  readable scope: the ${scope.size} collapsed sheets, where arms C and B share a structure`);
  console.log(line() + '\n');
  let flagCells = 0, pCells = 0, sheetsMoved = 0;
  let scopedFlag = 0, scopedP = 0, scopedSheets = 0;
  const perTest = {};
  for (const s of sheets) {
    const moved = diffArms(runs[s.key][x], runs[s.key][y]);
    if (!moved.length) continue;
    const inScope = !scope || scope.has(s.key);
    sheetsMoved++;
    if (inScope) scopedSheets++;
    console.log(`  ${s.key}${scope && !inScope ? '   [OUT OF SCOPE — arms C and B differ structurally here]' : ''}`);
    for (const m of moved) {
      if (m.flagMoved) { flagCells++; if (inScope) scopedFlag++; }
      if (m.pMoved) { pCells++; if (inScope) scopedP++; }
      if (inScope) {
        (perTest[m.name] ||= { flag: 0, p: 0 });
        if (m.flagMoved) perTest[m.name].flag++;
        if (m.pMoved) perTest[m.name].p++;
      }
      const famX = m.from.family ? ' {' + Object.entries(m.from.family).map(([k, v]) => `${k}=${v}`).join(',') + '}' : '';
      const famY = m.to.family ? ' {' + Object.entries(m.to.family).map(([k, v]) => `${k}=${v}`).join(',') + '}' : '';
      console.log(`      ${m.name.padEnd(32)} ${(cell(m.from) + ' ' + pStr(m.from.primaryP) + famX).padEnd(42)} -> ${cell(m.to)} ${pStr(m.to.primaryP)}${famY}`);
    }
    console.log('');
  }
  if (!sheetsMoved) console.log('  no cell moved on any sheet.\n');
  if (scope) {
    console.log(`  IN SCOPE (${scope.size} collapsed sheets): ${scopedFlag} flag/naCause cells moved, ${scopedP} p-values moved, over ${scopedSheets} sheets`);
    console.log(`  all fifteen, NOT the P93 figure:          ${flagCells} flag/naCause cells moved, ${pCells} p-values moved, over ${sheetsMoved} sheets`);
  } else {
    console.log(`  TOTAL: ${flagCells} flag/naCause cells moved, ${pCells} p-values moved, over ${sheetsMoved} of ${sheets.length} sheets`);
  }
  console.log(`         (quarantine excluded)\n`);
  legTotals[`${x}->${y}`] = {
    flagCells, pCells, sheetsMoved,
    scope: scope ? [...scope] : null,
    scopedFlagCells: scope ? scopedFlag : flagCells,
    scopedPCells: scope ? scopedP : pCells,
    scopedSheets: scope ? scopedSheets : sheetsMoved,
    perTest,
  };
}

// ── Which tests carry the P93 leg ─────────────────────────────────────────
console.log(line());
console.log('  C -> B in scope, by test — where the axis effect actually lands');
console.log(line() + '\n');
const cbPerTest = Object.entries(legTotals['C->B'].perTest).sort((a, b) => (b[1].flag + b[1].p) - (a[1].flag + a[1].p));
console.log(`  ${'test'.padEnd(34)} ${'flag/naCause moves'.padEnd(20)} p moves   (of ${COLLAPSED_KEYS.size} sheets)`);
for (const [name, v] of cbPerTest) console.log(`  ${name.padEnd(34)} ${String(v.flag).padEnd(20)} ${v.p}`);
console.log('');

// ── The direction, which is the whole question ────────────────────────────
// P93 argues axes MANUFACTURE firings. If that is right, removing them should
// EXTINGUISH firings: cells that fire with the axis present and do not fire
// with it gone. The opposite direction — cells that fire only once the axis is
// removed — is the power reading, and it is what the shrinking correction
// families predict.
const fires = f => f === 'HIGH' || f === 'MODERATE';
let extinguished = 0, ignited = 0, tierUp = 0, tierDown = 0;
const extRows = [], ignRows = [];
for (const s of collapsed) {
  for (const m of diffArms(runs[s.key].C, runs[s.key].B)) {
    const wasFiring = fires(m.from.flag), nowFiring = fires(m.to.flag);
    if (wasFiring && !nowFiring) { extinguished++; extRows.push({ sheet: s.key, ...m }); }
    if (!wasFiring && nowFiring) { ignited++; ignRows.push({ sheet: s.key, ...m }); }
    if (m.from.flag === 'MODERATE' && m.to.flag === 'HIGH') tierUp++;
    if (m.from.flag === 'HIGH' && m.to.flag === 'MODERATE') tierDown++;
  }
}
console.log(line());
console.log('  Direction of the axis effect — C -> B, in scope, quarantine excluded');
console.log(line() + '\n');
console.log('  P93 predicts axes MANUFACTURE firings, so removing an axis should EXTINGUISH them.');
console.log('  The opposite direction is the power reading, and shrinking families predict it.\n');
console.log(`  firing with the axis, not firing without it (EXTINGUISHED):  ${extinguished}`);
console.log(`  not firing with the axis, firing without it (IGNITED):       ${ignited}`);
console.log(`  MODERATE -> HIGH: ${tierUp}    HIGH -> MODERATE: ${tierDown}\n`);
if (extRows.length) {
  console.log('  Extinguished — the cells P93 predicts:\n');
  for (const r of extRows) console.log(`      ${r.sheet.padEnd(16)} ${r.name.padEnd(32)} ${cell(r.from)} ${pStr(r.from.primaryP)} -> ${cell(r.to)} ${pStr(r.to.primaryP)}`);
  console.log('');
}
if (ignRows.length) {
  console.log('  Ignited — read each against its family size before calling it an axis effect:\n');
  for (const r of ignRows) {
    const famX = r.from.family ? ' {' + Object.entries(r.from.family).map(([k, v]) => `${k}=${v}`).join(',') + '}' : '';
    const famY = r.to.family ? ' {' + Object.entries(r.to.family).map(([k, v]) => `${k}=${v}`).join(',') + '}' : '';
    console.log(`      ${r.sheet.padEnd(16)} ${r.name.padEnd(32)} ${cell(r.from)} ${pStr(r.from.primaryP)}${famX} -> ${cell(r.to)} ${pStr(r.to.primaryP)}${famY}`);
  }
  console.log('');
}
const direction = { extinguished, ignited, tierUp, tierDown, extRows, ignRows };

// ── Severity movement per leg ─────────────────────────────────────────────
console.log(line());
console.log('  File severity per sheet per arm');
console.log(line() + '\n');
console.log(`  ${'sheet'.padEnd(16)} ${'A'.padEnd(18)} ${'B'.padEnd(18)} C`);
for (const s of sheets) {
  const f = arm => { const v = runs[s.key][arm].severity; return `sev ${v.severity} (${v.high}H ${v.mod}M)`; };
  console.log(`  ${s.key.padEnd(16)} ${f('A').padEnd(18)} ${f('B').padEnd(18)} ${f('C')}`);
}
console.log('');

// ════════════════════════════════════════════════════════════════════════════
// The quarantine, in its own section
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('Quarantine — the two paired-design skips, kept out of every total above');
console.log(rule() + '\n');
console.log('  Both are withheld in arm A on every sheet, because column-grouped data is');
console.log('  structurally paired (subjectPairing.js:90) and engine.js:371 withholds on that');
console.log('  verdict. Where the grouping collapses the file reads as unpaired, the skip stops');
console.log('  firing, and the test runs. That transition is the collapse, not the axes.\n');
const quarRows = [];
for (const s of sheets) {
  for (const [x, y] of [['A', 'B'], ['A', 'C']]) {
    for (const q of diffQuarantine(runs[s.key][x], runs[s.key][y])) {
      quarRows.push({ sheet: s.key, leg: `${x}->${y}`, ...q });
      console.log(`  ${s.key.padEnd(16)} ${(x + '->' + y).padEnd(7)} ${q.name.padEnd(32)} ${(cell(q.from) + ' ' + pStr(q.from.primaryP)).padEnd(38)} -> ${cell(q.to)} ${pStr(q.to.primaryP)}`);
    }
  }
}
if (!quarRows.length) console.log('  (no quarantined test moved on any sheet)');
const quarFired = quarRows.filter(r => r.to.flag === 'HIGH' || r.to.flag === 'MODERATE');
console.log(`\n  ${quarRows.length} transition(s); ${quarFired.length} land on a FIRING tier (HIGH or MODERATE).`);
console.log('  None of these is evidence that an axis caused a firing.\n');

// ════════════════════════════════════════════════════════════════════════════
// Fig. 3g alone
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('Fig. 3g alone — n = 1');
console.log(rule() + '\n');
const fig3g = sheets.find(s => s.key === 'C25/Fig. 3g');
if (!fig3g) {
  console.log('  Fig. 3g not found. That is itself a finding.\n');
} else {
  console.log('  The only sheet that keeps its column grouping through the hold-out: four columns');
  console.log('  per group, two of them axes, so arm B leaves five two-column groups and the file');
  console.log('  stays paired. A -> B answers P93\'s question here with no structural confound.');
  console.log('  ONE SHEET IN ONE WORKBOOK. n = 1. It does not sit inside a fifteen-sheet total.\n');
  const st = fig3g.structure;
  console.log(`  arm A: ${st.A.type}, ${st.A.nGroups} groups of ${st.A.groupWidths.join('/')}, ${st.A.nCols} cols, paired=${st.A.paired}`);
  console.log(`  arm B: ${st.B.type}, ${st.B.nGroups} groups of ${st.B.groupWidths.join('/')}, ${st.B.nCols} cols, paired=${st.B.paired}\n`);
  const moved = diffArms(runs[fig3g.key].A, runs[fig3g.key].B);
  if (!moved.length) console.log('  A -> B: no cell moved.\n');
  else {
    console.log(`  A -> B: ${moved.length} cell(s) moved.\n`);
    for (const m of moved) {
      const famX = m.from.family ? ' {' + Object.entries(m.from.family).map(([k, v]) => `${k}=${v}`).join(',') + '}' : '';
      const famY = m.to.family ? ' {' + Object.entries(m.to.family).map(([k, v]) => `${k}=${v}`).join(',') + '}' : '';
      console.log(`      ${m.name.padEnd(32)} ${(cell(m.from) + ' ' + pStr(m.from.primaryP) + famX).padEnd(44)} -> ${cell(m.to)} ${pStr(m.to.primaryP)}${famY}`);
    }
    console.log('');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Coverage limit
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('Coverage limit — what C -> B cannot reach');
console.log(rule() + '\n');
console.log('  C -> B isolates the axis effect for tests that read columns as replicates without');
console.log('  needing a group. For the PER-GROUP dispatch the leg is blind: arms C and B both lack');
console.log('  a column-grouped context on the collapsed sheets, so a per-group test is N/A in both');
console.log('  and its axis effect is unmeasurable there.\n');
const perGroupTests = new Set();
for (const s of sheets) for (const t of runs[s.key].A.tests) if (t.surface === 'per-group') perGroupTests.add(t.name);
console.log(`  Tests dispatched per-group in arm A on at least one sheet: ${perGroupTests.size}`);
for (const n of [...perGroupTests].sort()) console.log(`    ${n}`);
console.log('');
let blindCells = 0;
for (const s of collapsed) {
  for (const t of runs[s.key].A.tests) {
    if (QUARANTINE.has(t.name)) continue;
    const b = runs[s.key].B.tests.find(x => x.name === t.name);
    const c = runs[s.key].C.tests.find(x => x.name === t.name);
    if (t.surface === 'per-group' && b?.flag === 'N/A' && c?.flag === 'N/A') blindCells++;
  }
}
console.log(`  Cells where C -> B is blind (per-group in A, N/A in both C and B, on the ${collapsed.length} collapsed sheets): ${blindCells}\n`);

// ════════════════════════════════════════════════════════════════════════════
// The confound's direction
// ════════════════════════════════════════════════════════════════════════════
console.log(rule());
console.log('The confound runs one way');
console.log(rule() + '\n');
console.log('  Removing columns shrinks the correction families, and a BH family of one returns the');
console.log('  raw p. So a surviving test gets MORE likely to flag in arm B, not less.');
console.log('    - a flag that DISAPPEARS disappeared against that pressure, and is a real loss;');
console.log('    - a flag that APPEARS is ambiguous until its family size is read.\n');
let shrank = 0, grew = 0, famSame = 0;
const shrinkRows = [];
for (const s of sheets) {
  for (const t of runs[s.key].C.tests) {
    if (QUARANTINE.has(t.name) || !t.family) continue;
    const b = runs[s.key].B.tests.find(x => x.name === t.name);
    if (!b?.family) continue;
    for (const k of Object.keys(t.family)) {
      if (b.family[k] == null) continue;
      if (b.family[k] < t.family[k]) { shrank++; shrinkRows.push({ sheet: s.key, name: t.name, k, from: t.family[k], to: b.family[k] }); }
      else if (b.family[k] > t.family[k]) grew++;
      else famSame++;
    }
  }
}
console.log(`  Family sizes C -> B: ${shrank} shrank, ${grew} grew, ${famSame} unchanged.`);
for (const r of shrinkRows.slice(0, 40)) console.log(`      ${r.sheet.padEnd(16)} ${r.name.padEnd(32)} ${r.k}: ${r.from} -> ${r.to}`);
if (shrinkRows.length > 40) console.log(`      ... and ${shrinkRows.length - 40} more`);
console.log('');

// ════════════════════════════════════════════════════════════════════════════
if (process.env.JSON_OUT) {
  const out = {
    generatedBy: 'test/probes/probe-s378-axis-counterfactual.mjs',
    corpus: resolve(CORPUS),
    axisHeaders: [...AXIS_HEADERS],
    quarantine: [...QUARANTINE],
    costGate: { sheet: biggest.key, oneRunMs, projectedMs: projMs, budgetMs: 20 * 60 * 1000, over: OVER },
    sheets: sheets.map(s => ({
      key: s.key, file: s.file, sheet: s.sheet, nAxis: s.nAxis,
      structure: s.structure,
      part1Prediction: PART1_ARM_B[s.key] ?? null,
      arms: { A: runs[s.key].A, B: runs[s.key].B, C: runs[s.key].C },
      legs: {
        'A->C': diffArms(runs[s.key].A, runs[s.key].C),
        'C->B': diffArms(runs[s.key].C, runs[s.key].B),
        'A->B': diffArms(runs[s.key].A, runs[s.key].B),
      },
      quarantineTransitions: {
        'A->B': diffQuarantine(runs[s.key].A, runs[s.key].B),
        'A->C': diffQuarantine(runs[s.key].A, runs[s.key].C),
      },
    })),
    legTotals,
    collapsedSheets: [...COLLAPSED_KEYS],
    axisEffectDirection: direction,
    familyMovement: { shrank, grew, unchanged: famSame, rows: shrinkRows },
  };
  writeFileSync(process.env.JSON_OUT, JSON.stringify(out, null, 2));
  console.log(`JSON written: ${process.env.JSON_OUT}\n`);
}

console.log(rule());
console.log('Reading rules');
console.log(rule() + '\n');
console.log('  C -> B is the P93 measurement. A -> B is the confounded total and must be labelled');
console.log('  as one wherever it is quoted. The quarantine is not evidence about axes. Fig. 3g is');
console.log('  n = 1. Where C -> B is blind, it is blind, and the count is printed above.\n');

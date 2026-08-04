/* S351 — what a paired-data skip of Cross-Condition Consistency and Residual
   Spike Correlation would cost.

   Read-only against src/. Nothing here edits the engine or any fixture. The
   probe does three things:

     Part 3  Derives, per fixture, whether the data is PAIRED, from the data
             itself rather than from condCtx.paired (which has one reader in
             all of src/ and is false on the row-grouped branch).
     Gate    Reconciles each fixture's baseline severity against EXPECTED in
             test/batch-fixtures.mjs. A disagreement halts the run — a severity
             delta measured against a wrong baseline measures nothing.
     Part 4  For every paired fixture, measures severity four ways: as shipped,
             with CCC suppressed, with RSC suppressed, and with both.

   Method for Part 4. The engine runs ONCE, unchanged, and severity is then
   recomputed from the result list with the relevant entries removed, using the
   engine's own computeSeverity. Suppression is a filter over results, never an
   edit to a test or a dispatch. Every PRNG stream and every other test's p is
   therefore identical across the four columns — the only thing that moves is
   which results computeSeverity is allowed to see. This is sound because
   computeSeverity reads only r.flag and TEST_MECHANISM[r.name]: it takes no
   count of tests run and no count of tests attempted, so a removed entry
   removes exactly its own flag and, if it was the last of its mechanism family
   to flag, its contribution to the cross-dimension diversity term.

   Usage:
     node test/probe-s351-paired-skip.mjs            # shipped stream
     SEEDS=8 node test/probe-s351-paired-skip.mjs    # eight-offset sweep
     ONLY=DS19,DS15 node test/probe-s351-paired-skip.mjs

   SEEDS=N sweeps PRNG OFFSETS via test/seed-inject.mjs, and offset 0 is the
   shipped derived stream. So SEEDS=8 is one real draw plus seven
   counterfactuals, not eight independent draws.
*/
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const SEEDS = Math.max(1, Number(process.env.SEEDS) || 1);
const MULTI = SEEDS > 1;
let setSeed = () => {};
if (MULTI) {
  const seedInject = await import('../seed-inject.mjs');
  seedInject.registerSeedHook();
  setSeed = seedInject.setSeed;
}

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

const FIXTURE_DIR = 'test/fixtures';
const CCC = 'Cross-Condition Consistency';
const RSC = 'Residual Spike Correlation';

const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',').map(s => s.trim())) : null;

// ── Load one fixture exactly the way test/validate-batch.mjs loads it ───────
// Any divergence here would make every number below answer a different
// question from the one the batch gate answers.
function load(file) {
  const csv = readFileSync(join(FIXTURE_DIR, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  const raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = EXPECTED[file].assay;
  const { matrix, rawMatrix, filteredIndices, condCtx } =
    extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return { data, headers, roles, matrix, rawMatrix, filteredIndices, condCtx,
           assay, vst, dataType, rowSemantics };
}

// ── Part 3 — the pairing rule ──────────────────────────────────────────────
// Column-grouped: paired structurally. Each condition is a column subset of the
//   same rows, so row r is the same subject in every condition. No evidence
//   needed and none can contradict it.
// Row-grouped: paired only on evidence. Some identifier column must have every
//   subject appearing exactly once in every condition, with identical subject
//   sets across conditions. Absent that, unpaired.
// Otherwise unpaired.
//
// Evidence is read over the slices the TESTS consume — condCtx.slices(), which
// drops any row-condition group below 3 rows and any row whose condition label
// is null. `groupsDropped` reports when that filter removed something, so a
// pairing verdict is never quietly taken over a different row set than the one
// the tests see.
function pairingCensus(fx) {
  const { condCtx, data, headers, roles, filteredIndices } = fx;
  const slices = condCtx.has ? condCtx.slices() : [];

  if (condCtx.type === 'column-grouped') {
    return {
      branch: 'column-grouped', paired: true, idCol: '(row index)',
      basis: 'structural — conditions are column subsets of the same rows',
      nCond: slices.length,
      perCond: slices.map(s => s.matrix.length),
      candidates: [], groupsDropped: 0,
    };
  }

  if (condCtx.type !== 'row-grouped') {
    return { branch: condCtx.type, paired: false, idCol: null,
             basis: 'no condition structure', nCond: slices.length,
             perCond: [], candidates: [], groupsDropped: 0 };
  }

  // How many row-condition groups existed before slices() filtered them.
  const rawGroups = new Set((condCtx.rowConditions || []).filter(Boolean));
  const groupsDropped = rawGroups.size - slices.length;

  // Every column that is not a DATA column is an identifier candidate. A
  // condition column will fail the distinctness test on its own; testing it
  // costs nothing and keeps the candidate set from being narrowed by a guess
  // about which column "looks like" an id.
  const candCols = roles.map((r, i) => (r === 'data' ? -1 : i)).filter(i => i >= 0);
  const candidates = [];
  let chosen = null;

  for (const c of candCols) {
    // Per condition, the identifier values of the rows in that condition's slice.
    const perCond = slices.map(s =>
      (s.rowIndices || []).map(mi => {
        const v = data[filteredIndices[mi]]?.[c];
        return v == null ? '' : String(v).trim();
      })
    );
    const allNonEmpty = perCond.every(vals => vals.length > 0 && vals.every(v => v !== ''));
    const distinctPer = perCond.map(vals => new Set(vals).size);
    const onceEach = allNonEmpty && perCond.every((vals, k) => distinctPer[k] === vals.length);
    // Identical subject SETS across conditions.
    let sameSet = onceEach && perCond.length >= 2;
    if (sameSet) {
      const ref = new Set(perCond[0]);
      for (let k = 1; k < perCond.length; k++) {
        const s = new Set(perCond[k]);
        if (s.size !== ref.size) { sameSet = false; break; }
        for (const v of s) if (!ref.has(v)) { sameSet = false; break; }
        if (!sameSet) break;
      }
    }
    const rec = {
      col: c, header: headers?.[c] ?? `col${c}`, role: roles[c],
      counts: perCond.map(v => v.length), distinct: distinctPer,
      onceEach, sameSet,
    };
    candidates.push(rec);
    if (sameSet && !chosen) chosen = rec;
  }

  return {
    branch: 'row-grouped',
    paired: !!chosen,
    idCol: chosen ? chosen.header : null,
    basis: chosen
      ? `every subject appears exactly once in every condition on "${chosen.header}", identical sets`
      : 'no identifier column has one-of-each-subject-per-condition with identical sets',
    nCond: slices.length,
    perCond: slices.map(s => s.matrix.length),
    candidates, groupsDropped,
  };
}

// ── Part 4 — severity under suppression ────────────────────────────────────
// A "suppressed" test is one whose result entry is withheld from
// computeSeverity. Nothing is re-run.
function severityUnder(results, drop) {
  const kept = results.filter(r => !drop.has(r.name));
  const s = computeSeverity(kept);
  const carriers = kept
    .filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')
    .map(r => `${r.name}:${r.flag === 'HIGH' ? 'H' : 'M'}[${TEST_MECHANISM[r.name] || r.category || '?'}]`)
    .sort();
  return { ...s, carriers };
}

const NONE = new Set();
const DROP_CCC = new Set([CCC]);
const DROP_RSC = new Set([RSC]);
const DROP_BOTH = new Set([CCC, RSC]);

async function measure(file) {
  const fx = load(file);
  const results = await runFullAnalysis(
    fx.matrix, fx.rawMatrix, fx.condCtx, fx.assay, null, fx.vst, {},
    fx.dataType, fx.rowSemantics
  );
  const flagOf = n => results.find(r => r.name === n)?.flag ?? '(absent)';
  const pOf = n => {
    const r = results.find(x => x.name === n);
    return r && typeof r.primaryP === 'number' ? r.primaryP : null;
  };
  return {
    base: severityUnder(results, NONE),
    noCCC: severityUnder(results, DROP_CCC),
    noRSC: severityUnder(results, DROP_RSC),
    noBoth: severityUnder(results, DROP_BOTH),
    cccFlag: flagOf(CCC), rscFlag: flagOf(RSC),
    cccP: pOf(CCC), rscP: pOf(RSC),
  };
}

// ── Run ────────────────────────────────────────────────────────────────────
const files = Object.keys(EXPECTED);
const dsKey = {};
{
  const { FIXTURES } = await import('../batch-fixtures.mjs');
  for (const [f, ds] of FIXTURES) dsKey[f] = ds;
}
const keyOf = f => dsKey[f] || f.replace(/\.csv$/, '');

console.log(`S351 paired-skip measurement — ${files.length} fixtures, SEEDS=${SEEDS}`);
console.log(`(SEEDS sweeps PRNG offsets; offset 0 IS the shipped derived stream)\n`);

// Part 3 first, at the shipped stream — pairing is a property of the data and
// does not depend on the draw.
console.log('== Part 3 — pairing census, all fixtures ==\n');
console.log(['fixture', 'branch', 'paired', 'idCol', 'nCond', 'rowsPerCond'].join('\t'));
const census = {};
for (const file of files) {
  const fx = load(file);
  const c = pairingCensus(fx);
  census[file] = c;
  console.log([
    keyOf(file), c.branch, c.paired ? 'YES' : 'no', c.idCol ?? '—',
    c.nCond, c.perCond.join('/') || '—',
  ].join('\t'));
}

console.log('\n-- row-grouped detail: every identifier candidate examined --');
for (const file of files) {
  const c = census[file];
  if (c.branch !== 'row-grouped') continue;
  console.log(`\n  ${keyOf(file)}  (${c.nCond} conditions used${c.groupsDropped ? `, ${c.groupsDropped} group(s) dropped by slices()` : ''})`);
  if (!c.candidates.length) console.log('    (no non-data columns)');
  for (const cd of c.candidates) {
    console.log(`    col ${cd.col} "${cd.header}" role=${cd.role}  n=[${cd.counts}]  distinct=[${cd.distinct}]  onceEach=${cd.onceEach}  sameSet=${cd.sameSet}`);
  }
  console.log(`    -> ${c.basis}`);
}

const pairedFiles = files.filter(f => census[f].paired);
console.log(`\nPAIRED: ${pairedFiles.length} of ${files.length} — ${pairedFiles.map(keyOf).join(', ')}`);
const colG = pairedFiles.filter(f => census[f].branch === 'column-grouped');
const rowG = pairedFiles.filter(f => census[f].branch === 'row-grouped');
console.log(`  column-grouped: ${colG.length} (${colG.map(keyOf).join(', ') || '—'})`);
console.log(`  row-grouped:    ${rowG.length} (${rowG.map(keyOf).join(', ') || '—'})`);

// ── Part 4 ─────────────────────────────────────────────────────────────────
// Measured on the paired set, plus any fixture named on the command line and
// the two recorded seed-unstable ones, so the sweep can reach them even if the
// census returns them unpaired.
const NAMED = ['09-proteomics-clean.csv', '15-missing-carlisle.csv', '19-inheritance-fabricated.csv'];
let targets = [...new Set([...pairedFiles, ...NAMED.filter(f => files.includes(f))])];
if (ONLY) targets = targets.filter(f => ONLY.has(keyOf(f)));

console.log(`\n== Part 4 — severity under suppression, ${targets.length} fixtures ==\n`);

const halts = [];
for (const SEED of Array.from({ length: SEEDS }, (_, i) => i)) {
  if (MULTI) setSeed(SEED);
  console.log(`-- offset ${SEED}${SEED === 0 ? ' (shipped stream)' : ''} --`);
  console.log(['fixture', 'paired', 'EXPECTED', 'base', 'noCCC', 'noRSC', 'noBoth', 'CCC', 'RSC'].join('\t'));
  for (const file of targets) {
    const m = await measure(file);
    const exp = EXPECTED[file].severity;
    const mark = (SEED === 0 && m.base.severity !== exp) ? '  <<< BASELINE != EXPECTED' : '';
    if (SEED === 0 && m.base.severity !== exp) halts.push(`${keyOf(file)}: baseline ${m.base.severity} vs EXPECTED ${exp}`);
    console.log([
      keyOf(file), census[file]?.paired ? 'YES' : 'no', exp,
      m.base.severity, m.noCCC.severity, m.noRSC.severity, m.noBoth.severity,
      `${m.cccFlag}${m.cccP != null ? `(${m.cccP.toExponential(2)})` : ''}`,
      `${m.rscFlag}${m.rscP != null ? `(${m.rscP.toExponential(2)})` : ''}`,
    ].join('\t') + mark);
    if (SEED === 0) {
      const moved = m.noCCC.severity !== m.base.severity ||
                    m.noRSC.severity !== m.base.severity ||
                    m.noBoth.severity !== m.base.severity;
      if (moved) {
        console.log(`      before : sev ${m.base.severity}  high=${m.base.high} mod=${m.base.mod} dims=${m.base.nFlaggedDimensions}  ${m.base.carriers.join(' ') || '(none)'}`);
        console.log(`      noCCC  : sev ${m.noCCC.severity}  high=${m.noCCC.high} mod=${m.noCCC.mod} dims=${m.noCCC.nFlaggedDimensions}  ${m.noCCC.carriers.join(' ') || '(none)'}`);
        console.log(`      noRSC  : sev ${m.noRSC.severity}  high=${m.noRSC.high} mod=${m.noRSC.mod} dims=${m.noRSC.nFlaggedDimensions}  ${m.noRSC.carriers.join(' ') || '(none)'}`);
        console.log(`      noBoth : sev ${m.noBoth.severity}  high=${m.noBoth.high} mod=${m.noBoth.mod} dims=${m.noBoth.nFlaggedDimensions}  ${m.noBoth.carriers.join(' ') || '(none)'}`);
      }
    }
  }
  console.log('');
}

if (halts.length) {
  console.log('HALT — baseline severity disagrees with EXPECTED on:');
  for (const h of halts) console.log('  ' + h);
  process.exitCode = 1;
} else {
  console.log('Baseline gate: every measured fixture reconciles against EXPECTED.');
}

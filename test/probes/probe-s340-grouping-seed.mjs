/* S340 step 0 — is the grouping decision itself seed-sensitive?

   A seed that moves a p-value moves a number. A seed that moves a grouping
   moves the analysis structure, and every p downstream is then answering a
   different question. The eight-seed gate reported severity, flags and channel
   composition; it never reported the structure.

   This records, per fixture per seed, everything the analysis path decides
   about shape before and around the tests: roles, condition columns, matrix
   dimensions, the VST decision and its stated reason, data type, row semantics,
   the grouping-enforcement trigger, and the row-group partition itself. Then it
   runs the confirm path — runConfirmedGroupedTests, the second createPRNG call
   site — and records its four verdicts, since that surface exists precisely to
   decide tests on a grouping.

     node test/probes/probe-s340-grouping-seed.mjs [nSeeds]

   Reads src/, writes nothing there. */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Register the seed hook before anything pulls in prng.js.
const { registerSeedHook, setSeed } = await import('../seed-inject.mjs');
registerSeedHook();

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { runConfirmedGroupedTests } = await import('../../src/analysis/confirmGrouping.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const N_SEEDS = Number(process.argv[2] || 8);

/** Everything the analysis path decides about shape, as one comparable string. */
function structuralFingerprint(file, expected) {
  const raw = preprocessRaw(Papa.default.parse(readFileSync(join(FIXTURES, file), 'utf-8'), { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!detectLongFormat(headers, data) }).value || 'ordered';

  // extractAnalysisInputs already runs computeTrigger and stamps the result on
  // condCtx, so read the real value rather than recomputing it with a guessed
  // argument shape.
  const trigger = condCtx.groupingTrigger || { pending: false };

  const rg = condCtx.rowGroups?.();
  const rgStatus = condCtx.rowGroupsStatus?.();
  const slices = condCtx.slices?.();

  const fp = [
    `roles=${roles.join(',')}`,
    `condPerCol=${condPerCol ? condPerCol.join(',') : 'null'}`,
    `dims=${matrix.length}x${matrix[0]?.length ?? 0}`,
    `vst=${vst.transform}|${vst.reasonCode || ''}|${vst.reason || ''}`,
    `dataType=${dataType}`,
    `rowSemantics=${rowSemantics}`,
    `groupingPending=${!!trigger.pending}`,
    `rowGroups=${Array.isArray(rg) ? rg.map(g => `${g.name}:${g.rowIndices.length}`).join('|') : String(rg)}`,
    `rowGroupsStatus=${rgStatus ? `${rgStatus.attempted}/${rgStatus.usable}` : 'n/a'}`,
    `slices=${Array.isArray(slices) ? slices.map(s => s.name || '?').join('|') : String(slices)}`,
  ].join('  ');

  const condCols = roles.map((r, i) => r === 'condition' ? i : -1).filter(i => i >= 0);
  return { fp, data, roles, condCols, assay, dataType, vst };
}

const files = Object.keys(EXPECTED);
const seeds = Array.from({ length: N_SEEDS }, (_, i) => i);

console.log(`S340 step 0 — grouping and structure across ${N_SEEDS} seeds, ${files.length} fixtures`);
console.log('Structure recorded: roles, condition columns, matrix dimensions, VST decision and reason,');
console.log('data type, row semantics, grouping-enforcement trigger, row-group partition, condition slices.');
console.log('Confirm path: runConfirmedGroupedTests on the fixture\'s full condition-column set.\n');

const structMoved = [], confirmMoved = [];
let confirmRan = 0, confirmSkipped = 0;

for (const file of files) {
  const exp = EXPECTED[file];
  const fps = new Set();
  const confirmSigs = new Set();
  let condCols = [], firstConfirm = null;

  for (const seed of seeds) {
    setSeed(seed);
    const s = structuralFingerprint(file, exp);
    fps.add(s.fp);
    condCols = s.condCols;
    if (condCols.length) {
      const four = await runConfirmedGroupedTests({
        data: s.data, roles: s.roles, condColSet: condCols, zeroAsMissing: false,
        assay: s.assay, dataType: s.dataType, vst: s.vst,
      });
      const sig = four.map(r => `${r.name}:${r.flag}:${typeof r.primaryP === 'number' ? r.primaryP : '—'}`).join(' | ');
      confirmSigs.add(sig);
      if (firstConfirm === null) firstConfirm = sig;
    }
  }

  const sOK = fps.size === 1;
  const cOK = confirmSigs.size <= 1;
  if (!sOK) structMoved.push({ file, variants: [...fps] });
  if (!cOK) confirmMoved.push({ file, variants: [...confirmSigs] });
  if (condCols.length) confirmRan++; else confirmSkipped++;

  console.log(`${sOK ? ' ' : '✗'} ${file.padEnd(42)} structure ${sOK ? 'constant' : `MOVED (${fps.size} variants)`}` +
    `   confirm path ${condCols.length ? (cOK ? 'constant' : `MOVED (${confirmSigs.size} variants)`) : 'no condition column — not run'}`);
}

console.log(`\nconfirm path exercised on ${confirmRan} fixtures; ${confirmSkipped} have no condition column.`);
console.log(`\nStructural fingerprints that moved across seeds: ${structMoved.length}`);
for (const m of structMoved) { console.log(`  ${m.file}`); m.variants.forEach(v => console.log(`    ${v}`)); }
console.log(`Confirm-path verdicts that moved across seeds:  ${confirmMoved.length}`);
for (const m of confirmMoved) { console.log(`  ${m.file}`); m.variants.forEach(v => console.log(`    ${v}`)); }

// The gate is about STRUCTURE. The confirm path runs permutation and bootstrap
// tests, so its p-values are expected to move with the seed — that is the same
// phenomenon the eight-seed batch gate already reports, not a grouping change.
// What would matter there is a FLAG moving, so that is reported separately.
const confirmFlagsMoved = confirmMoved.filter(m => {
  const flagOnly = new Set(m.variants.map(v => v.split(' | ').map(s => s.split(':').slice(0, 2).join(':')).join(' | ')));
  return flagOnly.size > 1;
});
console.log(`  of which the FLAGS moved (not just the p-values): ${confirmFlagsMoved.length}`);
for (const m of confirmFlagsMoved) console.log(`    ${m.file}`);

console.log(`\n${structMoved.length === 0
  ? 'GATE PASSES — no grouping or structural decision moves with the seed.'
  : 'GATE FAILS — stop and report; the re-derivation plan changes.'}` +
  (confirmFlagsMoved.length ? `  (but ${confirmFlagsMoved.length} confirm-path verdict(s) change tier across seeds — report that too)` : ''));

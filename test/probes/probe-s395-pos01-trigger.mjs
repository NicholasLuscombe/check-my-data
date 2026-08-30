/* S395 read one — `computeTrigger`'s return for pos-01's selected sheet.
   READ-ONLY. No src/ file is modified and no test is run: this stops at
   `extractAnalysisInputs` and never calls `runFullAnalysis`.

   NAMING HAZARD. `s395-corpus-run-hook.mjs` and `probe-s395-role-inversion.mjs`
   are S394's despite the prefix. This file and `probe-s395-pos01-structure.mjs`
   are S395's. The hook is reused unchanged.

   Instrument. The hook replaces `scripts/corpus-run.mjs`'s CLI tail with an
   export list, so `prepStructure` and `buildAnalysisConfig` are the census
   path's own source text executed. `computeTrigger` and `extractAnalysisInputs`
   are imported from `src/` under the same specifiers the engine uses.

   The reported object is READ OFF `condCtx.groupingTrigger`, the field
   `extractAnalysisInputs` stamps at engine.js:174-178 — not recomputed. A
   second, direct `computeTrigger` call is made only to prove the two agree.

   Modes:
     --trigger  the stamped return, both arms, and the direct-call agreement
     --card     the source chain from `pending` to whether the card renders
     --arm1     is arm 1 reachable on the not-attempted branch? a search
     --rowsem   the row-semantics INPUTS off this same prep (read two, headless)

   Usage:
     node --import ./test/probes/s395-corpus-run-hook.mjs \
          test/probes/probe-s395-pos01-trigger.mjs --trigger --card --arm1 --rowsem
*/
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = new Set(process.argv.slice(2));
const has = f => args.has('--' + f);

// corpus-data/ is gitignored and lives only in the main checkout.
const MAIN = '/Users/hedgehog/Projects/check-my-data';
const DEPOSIT = resolve(MAIN, 'corpus-data/round2/pos-01/micro_data_compiled.xlsx');
const SHEET = '1300-3';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CR = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
if (typeof CR.prepStructure !== 'function') {
  console.error('The hook did not load. Run with:\n  node --import ./test/probes/s395-corpus-run-hook.mjs ' +
                'test/probes/probe-s395-pos01-trigger.mjs <mode>');
  process.exit(2);
}
const { extractAnalysisInputs } = await import(resolve(ROOT, 'src/analysis/engine.js'));
const { computeTrigger } = await import(resolve(ROOT, 'src/analysis/groupingTrigger.js'));
const { suggestRowSemantics } = await import(resolve(ROOT, 'src/import/rowSemantics.js'));
const { condStructureKind } = await import(resolve(ROOT, 'src/components/shared/coordinates.js'));

const entry = { path: DEPOSIT, sheet: SHEET };
const { raw, sheetUsed } = await CR.readRawMatrix(entry);
if (sheetUsed !== SHEET) { console.error(`got sheet "${sheetUsed}" not "${SHEET}" — STOP.`); process.exit(3); }
const s = CR.prepStructure(raw, undefined);
const cfg = CR.buildAnalysisConfig({ entry, hdrs: s.hdrs, data: s.data, condPerCol: s.condPerCol,
  roles: s.roles, longFormatDetected: s.longFormatDetected });

console.log(`deposit : ${DEPOSIT}`);
console.log(`sheet   : ${sheetUsed}   data ${s.data.length} rows x ${s.hdrs.length} cols`);
console.log(`answer  : colRelationship "${cfg.config.colRelationship}"  (corpus-run.mjs hardcodes it; §13.4)\n`);

// ── --trigger ────────────────────────────────────────────────────────
if (has('trigger')) {
  const { matrix, condCtx } = extractAnalysisInputs(cfg.config);
  const stamped = condCtx.groupingTrigger;

  console.log('READ ONE — computeTrigger, under the `replicates` answer');
  console.log(`  read from : condCtx.groupingTrigger, stamped at src/analysis/engine.js:174-178`);
  console.log(`  function  : src/analysis/groupingTrigger.js:54\n`);
  console.log('  the returned object, verbatim:');
  console.log('  ' + JSON.stringify(stamped));
  console.log('\n  field by field:');
  for (const k of ['attempted', 'nGroups', 'sizes', 'median', 'condCols', 'arm1', 'arm2', 'pending']) {
    console.log(`    ${k.padEnd(10)} ${JSON.stringify(stamped[k])}`);
  }

  // The two arms, separately and with the expression each evaluates.
  const condCols = cfg.config.roles.map((r, i) => r === 'condition' ? i : -1).filter(i => i >= 0);
  console.log('\n  the arms, separately:');
  console.log(`    arm 1  nCondCols >= 3   : ${stamped.condCols} >= 3  ->  ${stamped.arm1}   (groupingTrigger.js:107, and :86 on the early return)`);
  console.log(`    arm 2  !usable || median <= 4 : ${stamped.arm2}   (groupingTrigger.js:108)`);
  console.log(`    pending = arm1 || arm2  : ${stamped.pending}`);
  console.log(`    NOTE — this return came from the EARLY branch at :85-86, where`);
  console.log(`           \`pending\` is the LITERAL false, not \`arm1 || arm2\`.`);
  console.log(`           attempted === ${stamped.attempted}, so :109 never ran.`);

  console.log('\n  why attempted is false:');
  console.log(`    condCols (roles === "condition", engine.js:114) : [${condCols.join(', ')}]  (${condCols.length} columns)`);
  console.log(`    condCtx.type                                    : ${condCtx.type}`);
  console.log(`    condColSet passed (engine.js:176)               : ${condCtx.type === 'column-grouped' ? '[] (column-grouped)' : '[' + condCols.join(', ') + ']'}`);
  console.log(`    -> rc is all null -> rowConditions null (:66) -> attempted false (:83)`);

  // Direct call with the same four inputs. Proves the stamp is the helper's
  // output rather than something the engine built alongside it.
  const dataCols = cfg.config.roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const filteredIndices = [];
  cfg.config.data.forEach((row, i) => {
    const any = dataCols.some(ci => {
      const v = row[ci]; if (v == null || v === '') return false;
      const n = Number(v); return !isNaN(n);
    });
    if (any) filteredIndices.push(i);
  });
  const direct = computeTrigger({ data: cfg.config.data, roles: cfg.config.roles,
    condColSet: condCtx.type === 'column-grouped' ? [] : condCols, filteredIndices });
  const same = JSON.stringify(direct) === JSON.stringify(stamped);
  console.log(`\n  direct computeTrigger call with the same inputs : ${JSON.stringify(direct)}`);
  console.log(`  agrees with the stamped object                  : ${same ? 'YES, identical' : 'NO — STOP'}`);
  console.log(`  (filteredIndices rebuilt here: ${filteredIndices.length}, matrix rows ${matrix.length}${filteredIndices.length === matrix.length ? ' — agree' : ' — DIFFER, STOP'})\n`);
  if (!same) process.exit(4);
}

// ── --card ───────────────────────────────────────────────────────────
// Whether the confirm card renders. The last link is DRIVEN in
// probe-s395-pos01-gates.test.jsx; the two middle links are source reads,
// because driving them would mean running arm A.
if (has('card')) {
  const { condCtx } = extractAnalysisInputs(cfg.config);
  const pending = !!condCtx.groupingTrigger.pending;
  console.log('WOULD THE CARD RENDER — the chain, link by link');
  console.log(`  1. trigger.pending                                     : ${pending}          [driven above]`);
  console.log(`  2. engine.js:242  groupingPending = !!trigger.pending   : ${pending}          [source]`);
  console.log(`  3. engine.js:506/:597/:604/:617 — the four dispatch sites call`);
  console.log(`     pendingResult() only \`if (groupingPending)\`, and :254-259 is the`);
  console.log(`     ONLY producer of a result carrying \`groupingPending\`      [source]`);
  console.log(`  4. ReportView.jsx:188  groupingPendingBase = baseResults.some(r => r.groupingPending)`);
  console.log(`                                                          : ${pending}          [source]`);
  console.log(`  5. GroupingConfirmCard.jsx:72  \`if (!groupingPendingBase) return null\``);
  console.log(`                                                          [driven in the .test.jsx]`);
  console.log(`\n  VERDICT: the card would ${pending ? 'RENDER' : 'NOT render'} on this sheet.\n`);
}

// ── --arm1 ───────────────────────────────────────────────────────────
// The dispatch asks about the arm-1-only case. On the EARLY return at :85-86
// arm1 is written as `nCondCols >= 3`, so ask whether that can ever be true
// there. Searched, and the source reason stated beside the search.
if (has('arm1')) {
  console.log('ARM 1 ON THE NOT-ATTEMPTED BRANCH — can :86 ever report true?\n');
  console.log('  Source reason: !attempted means every column in condColSet is blank at every');
  console.log('  row (:60-66). Each per-column array at :74-78 is then all-null, `some` is');
  console.log('  false, the entry becomes null and .filter(Boolean) drops it — so');
  console.log('  rowConditionsCols is [] and nCondCols is 0 whenever attempted is false.\n');
  const B = null, V = 'x';
  const shapes = [];
  // condColSet sizes 1..5 crossed with blank/populated patterns, plus a few
  // ragged and blank-string cases. Every row is built over 6 columns.
  for (let k = 1; k <= 5; k++) {
    const cols = Array.from({ length: k }, (_, i) => i);
    shapes.push([`${k} cols, all blank (null)`, cols, [[B,B,B,B,B,B],[B,B,B,B,B,B],[B,B,B,B,B,B]]]);
    shapes.push([`${k} cols, all blank ("")`, cols, [['','','','','',''],['','','','','','']]]);
    shapes.push([`${k} cols, all whitespace`, cols, [['  ','  ','  ','  ','  ','  '],['  ','  ','  ','  ','  ','  ']]]);
    shapes.push([`${k} cols, one populated`, cols, [[V,B,B,B,B,B],[V,B,B,B,B,B],[B,B,B,B,B,B]]]);
    shapes.push([`${k} cols, all populated`, cols, [[V,V,V,V,V,V],[V,V,V,V,V,V],[V,V,V,V,V,V]]]);
  }
  let violations = 0, notAttempted = 0;
  console.log(`  ${'shape'.padEnd(28)}${'cols'.padEnd(6)}${'attempted'.padEnd(11)}${'nCondCols'.padEnd(11)}${'arm1'.padEnd(7)}pending`);
  for (const [label, cols, data] of shapes) {
    const fi = data.map((_, i) => i);
    const t = computeTrigger({ data, roles: [], condColSet: cols, filteredIndices: fi });
    if (!t.attempted) { notAttempted++; if (t.arm1) violations++; }
    console.log(`  ${label.padEnd(28)}${String(cols.length).padEnd(6)}${String(t.attempted).padEnd(11)}${String(t.condCols).padEnd(11)}${String(t.arm1).padEnd(7)}${t.pending}`);
  }
  console.log(`\n  shapes searched: ${shapes.length}   not-attempted among them: ${notAttempted}`);
  console.log(`  not-attempted returns reporting arm1 true: ${violations}`);
  console.log(`  READING: a search, not a proof. It agrees with the source reason above —`);
  console.log(`  :86's \`nCondCols >= 3\` is unreachable, so an arm-1-only instance can only`);
  console.log(`  arise on the :107 branch, where the file HAS row conditions.\n`);
}

// ── --rowsem ─────────────────────────────────────────────────────────
// Read two's inputs, off this same prep. What ImportView does with them is
// driven in probe-s395-pos01-gates.test.jsx.
if (has('rowsem')) {
  console.log('READ TWO (headless half) — the row-semantics suggestion inputs\n');
  console.log(`  assay                  : ${cfg.assay}   (${cfg.assaySource})`);
  console.log(`  longFormatDetected     : ${s.longFormatDetected}`);
  const sug = suggestRowSemantics({ assay: cfg.assay, longFormatDetected: s.longFormatDetected });
  console.log(`  suggestRowSemantics(...) -> ${JSON.stringify(sug)}   (src/import/rowSemantics.js:38)`);
  console.log(`    value  ${JSON.stringify(sug.value)}  ${sug.value === null ? '<- no value: the user must choose (rowSemantics.js:14, :48)' : ''}`);
  console.log(`    auto   ${sug.auto}`);
  console.log(`    reason ${JSON.stringify(sug.reason)}`);
  console.log(`\n  the column gate's auto-resolve input:`);
  const hcs = condStructureKind(s.condPerCol, s.roles);
  console.log(`    condPerCol             : ${s.condPerCol === null ? 'null' : JSON.stringify(s.condPerCol)}`);
  console.log(`    roles include a condition column : ${s.roles.some(r => r === 'condition')}`);
  console.log(`    condStructureKind(...)  -> ${JSON.stringify(hcs)}   (coordinates.js:100)`);
  console.log(`    -> ImportView.jsx:396 effectiveColRel = colRelationship || (false ? ... : null)`);
  const { detectVST } = await import(resolve(ROOT, 'src/stats/vst.js'));
  const { matrix } = extractAnalysisInputs(cfg.config);
  const vst = detectVST(matrix, cfg.assay, cfg.dataType);
  console.log(`\n  the third decision on the same screen (not a gate; recorded for the log row):`);
  console.log(`    detectVST(matrix, "${cfg.assay}", "${cfg.dataType}") -> transform ${JSON.stringify(vst.transform)}`);
  console.log(`    reason: ${JSON.stringify(vst.reason)}`);

  console.log(`\n  DIVERGENCE, reported not buried: corpus-run.mjs:246-247 takes`);
  console.log(`  \`rsSuggestion.value || 'ordered'\`, so the headless path silently resolves`);
  console.log(`  to "${cfg.rowSemantics}" exactly where ImportView requires a human answer.\n`);
}

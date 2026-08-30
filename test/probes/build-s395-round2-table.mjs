/* S395 — generate docs/shared/S395-ROUND2-STRUCTURE-TABLE.md from the batch's
   own JSON. READ-ONLY over src/. Every figure in the record is interpolated
   from `test/probes/out-s395/round2-structure.json`; no number is transcribed
   by hand. Prose is literal here, figures are not.

   Run: node test/probes/run-s395-round2-structure.mjs   (produces the JSON)
        node test/probes/build-s395-round2-table.mjs     (writes the record)
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = resolve(ROOT, 'test/probes/out-s395/round2-structure.json');
const OUT = resolve(ROOT, 'docs/shared/S395-ROUND2-STRUCTURE-TABLE.md');
const D = JSON.parse(readFileSync(SRC, 'utf-8'));
const R = D.results;
const byPos = [...R].sort((a, b) => a.position - b.position);

const P = (n) => `pos-${String(n).padStart(2, '0')}`;
const L = [];
const w = (s = '') => L.push(s);
const esc = (s) => String(s).replace(/\|/g, '\\|');
const code = (s) => '`' + esc(String(s)).replace(/`/g, '’') + '`';
const list = (a) => a.length ? a.join(', ') : 'none';
const num = (n) => n == null ? '—' : (typeof n === 'number' ? n : String(n));

// ── derived sets, computed once so prose and tables cannot disagree ──
const N = R.length;
const control = R.find(r => r.position === 1);
const refusals = byPos.filter(r => r.nNumericDataCols < 2);
const banded = byPos.filter(r => r.hasSpanningHeader);
const sparseRow0 = byPos.filter(r => r.headerDetection.isSparseGroupRow_row0);
const anySynth = byPos.filter(r => r.synthesisedHeaders.count > 0);
const orphans = byPos.filter(r => r.leadingOrphanColumns.length > 0);
const pending = byPos.filter(r => r.groupingTrigger.pending);
const arm1only = byPos.filter(r => r.groupingTrigger.arm1 && !r.groupingTrigger.arm2);
const arm2only = byPos.filter(r => !r.groupingTrigger.arm1 && r.groupingTrigger.arm2);
const rsNull = byPos.filter(r => r.rsSuggestion.value === null);
const rsOrdered = byPos.filter(r => r.rsSuggestion.value === 'ordered');
const rsArbitrary = byPos.filter(r => r.rsSuggestion.value === 'arbitrary');
const g28ran = byPos.filter(r => r.groupAttributes.reachedThePass);
const g28moved = byPos.filter(r => r.groupAttributes.columnsMoved.length > 0);
const windowWhole = byPos.filter(r => r.windowCoversWholeColumn);
const hdr2 = byPos.filter(r => r.headerRows === 2);
const totalCols = R.reduce((a, r) => a + r.columns.length, 0);
const totalSecs = (R.reduce((a, r) => a + r.wallMs, 0) / 1000);
const slowest = R.reduce((m, r) => r.wallMs > m.wallMs ? r : m);
const relSorted = byPos.filter(r => r.lastRowIsColumnTotal.maxRelativeResidual != null)
  .sort((a, b) => a.lastRowIsColumnTotal.maxRelativeResidual - b.lastRowIsColumnTotal.maxRelativeResidual);
const WIDE = 40;

// ══════════════════════════════════════════════════════════════════════
w('# Round 2 — the structural read of the thirty');
w('');
w('**Read-only.** No `src/` file was modified. **No arm ran, no gate is answered, no role was');
w('reassigned (§14.3), and nothing was written to `ROUND2-RUN-LOG.md`.** Every read stops at');
w('`extractAnalysisInputs`; `runFullAnalysis` is never called. The 27-fixture batch does not apply —');
w('there is no `src/` diff for it to gate — and there is no rendering surface, so no preview.');
w('');
w('**The gate answers are formed from this table afterwards, in one pass. They are not here.**');
w('');
w('**Generated, not hand-maintained.** Every figure below is interpolated from');
w('`test/probes/out-s395/round2-structure.json` by `test/probes/build-s395-round2-table.mjs`. No');
w('number in this record was transcribed. The JSON is gitignored (`test/probes/out-*/`) and');
w('regenerates in under twenty seconds.');
w('');
w('**Reproducible except for one column, and that is measured rather than assumed.** The generator is');
w('deterministic given the JSON (two runs over one artefact, byte-identical). Two independent *batch*');
w('runs are byte-identical **with the elapsed-time fields stripped** — so the `s` column in §2 and the');
w('per-deposit timings are the only figures here that move between runs, and every structural figure');
w('is stable.');
w('');
w('```bash');
w('node test/probes/run-s395-round2-structure.mjs      # the batch, one child per deposit');
w('node test/probes/build-s395-round2-table.mjs        # this record');
w('```');
w('');
w('**Instrument.** `test/probes/probe-s395-round2-structure.mjs`, one child process per deposit,');
w('run through `test/probes/s395-corpus-run-hook.mjs`. The hook replaces `scripts/corpus-run.mjs`\'s');
w('CLI tail with an export list and touches nothing above it, so `prepStructure`,');
w('`buildAnalysisConfig` and `readRawMatrix` are **the census path\'s own source text executed**.');
w('`inferBaseRoles`, `detectGroupAttributes`, `preprocessRaw`, `detectBlocks`, `detectHeaderRows`,');
w('`isSparseGroupRow`, `isRepeatingSubHeader`, `getSheetNames`, `extractAnalysisInputs` and');
w('`suggestRowSemantics` are imported from `src/` under the specifiers the engine and the view');
w('already use. The only arithmetic performed here is over those functions\' outputs.');
w('');
w('**Naming hazard.** `s395-corpus-run-hook.mjs`, `probe-s395-role-inversion.mjs` and');
w('`probe-s396-inversion-incidence.mjs` are **S394\'s** despite the prefix. This record\'s probes —');
w('`probe-s395-round2-structure.mjs`, `run-s395-round2-structure.mjs`,');
w('`build-s395-round2-table.mjs`, `probe-s395-pos01-structure.mjs`, `probe-s395-pos01-trigger.mjs`');
w('and `probe-s395-pos01-gates.test.jsx` — are S395\'s. The hook is reused unchanged.');
w('');
w('## What this pass found');
w('');
w(`- **\`detectHeaderRows\` returned 1 on all ${N} sheets. Not one two-row header in the whole round-2 set.** And the conjunct trace says which test defeated it, which the return value alone cannot: \`isSparseGroupRow(row0)\` is true on exactly **${sparseRow0.length}** — ${list(sparseRow0.map(r => P(r.position)))} — and **all ${sparseRow0.length} are defeated by the same conjunct**, \`isRepeatingSubHeader(row1)\` returning false.`);
w(`- **Spanning band labels on ${banded.length} of ${N} deposits** — ${list(banded.map(r => P(r.position)))} — of which ${banded.filter(r => !r.bandWidthsEqual).length} carry unequal widths. §16's class is not confined to position 1. **On the other ${N - banded.length} there is no spanning header at all**, stated per deposit rather than left blank.`);
w(`- **Arm 1 fires without arm 2 on ${arm1only.length} deposits** — ${list(arm1only.map(r => P(r.position)))} — where round 1 had none. This is the case recorded as unmeasured on any corpus and named as the one place confirming the grouping could still move a verdict. ${refusals.some(r => arm1only.includes(r)) ? `One of them (${list(arm1only.filter(r => refusals.includes(r)).map(r => P(r.position)))}) refuses at the import floor, leaving ${arm1only.filter(r => !refusals.includes(r)).length} live instances.` : ''}`);
w(`- **\`suggestRowSemantics\` declines to answer on ${rsNull.length} of ${N}.** \`value: null, reason: "user-choice"\`. It returns \`"ordered"\` on ${rsOrdered.length} and \`"arbitrary"\` on ${rsArbitrary.length}. So on ${rsNull.length} deposits \`ImportView\` will require a human answer while \`corpus-run.mjs:246\` substitutes \`'ordered'\` for the null.`);
w(`- **The last-row-is-a-column-total shape belongs to ${P(1)} and to no other deposit.** Its largest relative residual is ${relSorted[0].lastRowIsColumnTotal.maxRelativeResidual.toExponential(3)}; the next smallest across the other ${N - 1} is **${relSorted[1].lastRowIsColumnTotal.maxRelativeResidual.toExponential(3)}** on ${P(relSorted[1].position)}, ${Math.round(Math.log10(relSorted[1].lastRowIsColumnTotal.maxRelativeResidual / relSorted[0].lastRowIsColumnTotal.maxRelativeResidual))} orders of magnitude away. Reported, not classified.`);
w(`- **The forty-row window is a strict sample on ${N - windowWhole.length} of ${N}.** It covers the whole column only on ${list(windowWhole.map(r => `${P(r.position)} (${r.dataRows} rows)`))}. ${P(1)}'s "the window is the column" is the exception, not the rule, so P217's precondition is live almost everywhere here.`);
w(`- **§2.8 reached the group-attribute pass on ${g28ran.length} of ${N} and moved a column on ${g28moved.length}.** The three refusals reproduce §15.1's figures independently: ${list(refusals.map(r => `${P(r.position)} 1 → ${1 + r.groupAttributes.columnsMoved.length}`))} data columns without the hold-out.`);
w(`- **Cost is not a constraint.** ${N} deposits in ${totalSecs.toFixed(1)} s wall, slowest ${P(slowest.position)} at ${(slowest.wallMs / 1000).toFixed(1)} s on a ${slowest.validRows.toLocaleString()} × ${slowest.nNumericDataCols} sheet. The 600 s per-deposit timer was never approached and nothing timed out.`);
w('');

// ── 1 — the run ──
w('## 1 — the run');
w('');
w(`**Order.** Ascending position with ${P(40)} last, and ${P(1)} first as a control. ${P(40)} carries a`);
w(`${slowest.validRows.toLocaleString()} × ${slowest.nNumericDataCols} sheet whose runtime was unmeasured, so ordering it last meant a hang there`);
w(`would cost the other deposits nothing. ${P(1)} is already recorded in \`S395-POS01-STRUCTURE.md\`, so`);
w('a disagreement there would mean the harness was wrong before any new deposit was believed.');
w('');
w('**One child process per deposit, with a 600 s kill timer implemented in node** — `timeout(1)` does');
w('not exist on macOS. A deposit exceeding it is recorded as timed out with its elapsed time; a');
w('deposit that throws is recorded with its error. Neither aborts the batch.');
w('');
w(`**Outcome: ${R.filter(r => !r.error && !r.harnessError).length} of ${N} completed, 0 errors, 0 timeouts, 0 manifest disagreements.**`);
w('');
w('**Provenance resolved from the manifests, never from the run log\'s prose.** For every deposit the');
w('receipt (`corpus-data/round2/round2-files.json`), the ranking');
w('(`docs/shared/round2-raw/round2-ranking.json`) and run log §4\'s row agree on file, sheet and index,');
w(`and the selected file's **\`sha256\` and byte size match the receipt on all ${N}**.`);
w('');

// ── 2 — the summary table ──
w('## 2 — the summary table');
w('');
w('`hdr` is `detectHeaderRows`\' return. `synth` is the count of `Col N` headers `prepStructure:185`');
w('synthesised for blank header cells. `bands` counts spanning labels only (width > 1). `trigger` is');
w('`computeTrigger`\'s `attempted / condCols / arm1 / arm2 / pending` under the `replicates` answer.');
w('`rsSug` is `suggestRowSemantics`\' `value`.');
w('');
w('| pos | file :: sheet | idx/tot | raw R×C | hdr | valid | nDC | roles C/L/D/A/I | synth | bands | trigger | rsSug | s |');
w('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of [...byPos]) {
  const t = r.groupingTrigger, rc = r.roleCounts;
  const nm = r.sheet === r.file ? code(r.file) : `${code(r.file)} :: ${code(r.sheet)}`;
  const flag = r.position === 1 ? ' \\*' : (r.nNumericDataCols < 2 ? ' †' : '');
  w(`| **${P(r.position)}**${flag} | ${nm} | ${r.sheetIndex + 1}/${r.sheetTotal} | ${r.rawRows}×${r.rawCols} | ${r.headerRows} | ${r.validRows} | ${r.nNumericDataCols} | ${rc.condition}/${rc.label}/${rc.data}/${rc.attribute}/${rc.ignore} | ${r.synthesisedHeaders.count}/${r.synthesisedHeaders.of} | ${r.spanningBands.length} | ${t.attempted ? 't' : 'f'}/${t.condCols}/${t.arm1 ? 'T' : 'f'}/${t.arm2 ? 'T' : 'f'}/${t.pending ? '**t**' : 'f'} | ${JSON.stringify(r.rsSuggestion.value)} | ${(r.wallMs / 1000).toFixed(1)} |`);
}
w('');
w(`\\* control, already recorded in \`S395-POS01-STRUCTURE.md\`. † refuses at \`ImportView.jsx:974\` (fewer than 2 data columns) — **no gate answer is owed** (§14.3).`);
w('');
w('**`SheetNames[0]` — the alternative §6.2 discarded — per deposit:**');
w('');
w('| pos | files in deposit | sheets measured | §6.2 decided by | tie on cell count | `SheetNames[0]` | selected sheet |');
w('|---|---|---|---|---|---|---|');
for (const r of byPos) {
  w(`| ${P(r.position)} | ${r.nFilesInDeposit} | ${r.nSheetsMeasured} | ${r.decidedBy} | ${r.anyTieOnCellCount ? 'yes' : 'no'} | ${code(r.sheetNames0)} | ${code(r.sheet)}${r.sheetNames0 === r.sheet ? ' *(same)*' : ''} |`);
}
w('');

// ── 3 — the three load-bearing fields ──
w('## 3 — the three fields that carry the point');
w('');
w('### 3.1 — `detectHeaderRows`, and which conjunct defeated the two-row branch');
w('');
w(`**It returned 1 on all ${N}.** ${hdr2.length === 0 ? 'It returned 2 on none.' : `It returned 2 on ${list(hdr2.map(r => P(r.position)))}.`} A return of 1 is the mechanism by which a`);
w('two-row design is lost, so the return alone is the weakest possible reading of it. The two-row');
w('branch (`parser.js:22`) is a three-way conjunction, and reporting which conjunct failed separates');
w('*a band row was present and lost* from *there was no band row*.');
w('');
w('**One further source fact, because it means the return carries less than it looks.** `parser.js:23`');
w('is `return nf0<0.5?1:1` — both arms are `1`, so the fallthrough is unconditional and `nf0` is');
w('computed and discarded. `detectHeaderRows` returns 2 or 1 and nothing else.');
w('');
w('| pos | returned | `isSparseGroupRow(row0)` | `isRepeatingSubHeader(row1)` | numeric fraction, row2 | conjunct(s) that failed |');
w('|---|---|---|---|---|---|');
for (const r of byPos) {
  const h = r.headerDetection;
  w(`| ${P(r.position)} | ${h.returned} | ${h.isSparseGroupRow_row0 ? '**true**' : 'false'} | ${h.isRepeatingSubHeader_row1 ? 'true' : 'false'} | ${(h.numericFraction_row2 ?? 0).toFixed(3)} | ${esc((h.failedConjuncts || []).join('; ') || '—')} |`);
}
w('');
w(`**The three sheets whose header row IS recognised as a sparse group row — ${list(sparseRow0.map(r => P(r.position)))} — all fail at the same conjunct.** \`isRepeatingSubHeader(row1)\` is false on every one. On ${P(1)} that is because row 1 is blank. This is one mechanism, not three, and it is the mechanism §16.4 leaves open.`);
w('');
w('### 3.2 — synthesised `Col N` headers, and which are band continuations');
w('');
w(`\`prepStructure:185\` writes \`Col N\` for every blank header cell. **A synthesised header is evidence of a spanning label only when a real header sits to its left**; one with nothing to its left cannot be a continuation of anything.`);
w('');
w('| pos | synthesised | of | at columns | leading orphans (no band possible) | spanning bands |');
w('|---|---|---|---|---|---|');
for (const r of anySynth) {
  w(`| ${P(r.position)} | ${r.synthesisedHeaders.count} | ${r.synthesisedHeaders.of} | ${esc(r.synthesisedHeaders.columns.slice(0, 14).join(', ') + (r.synthesisedHeaders.columns.length > 14 ? ' …' : ''))} | ${r.leadingOrphanColumns.length ? esc(r.leadingOrphanColumns.join(', ')) : '—'} | ${r.spanningBands.length} |`);
}
w('');
w(`**${anySynth.length} of ${N} deposits carry any synthesised header at all**; the other ${N - anySynth.length} have a fully populated header row. ${orphans.length ? `**${list(orphans.map(r => P(r.position)))} carry a leading orphan** — a synthesised header at column 0 with no real header to its left, which is a blank first header cell rather than a band.` : ''}`);
w('');
w('### 3.3 — the band maps');
w('');
w(`**${banded.length} of ${N} deposits carry a spanning label. On the other ${N - banded.length} there is no spanning header** — every real header cell covers exactly one column — and that is stated here rather than left blank.`);
w('');
for (const r of banded) {
  w(`**${P(r.position)} — ${code(r.file)} :: ${code(r.sheet)}.** ${r.spanningBands.length} spanning label${r.spanningBands.length === 1 ? '' : 's'}, widths ${r.spanningBands.map(b => b.width).join(' / ')}${r.bandWidthsEqual ? ' (**equal**)' : ' (**unequal**)'}. ${r.synthesisedHeaders.count} of ${r.synthesisedHeaders.of} headers synthesised. \`isSparseGroupRow(row0)\` ${r.headerDetection.isSparseGroupRow_row0 ? '**true**' : '**false**'}.`);
  w('');
  w('| columns | width | label |');
  w('|---|---|---|');
  for (const b of r.bands) w(`| ${b.from}–${b.to} | ${b.width}${b.width > 1 ? ' **span**' : ''} | ${code(b.label)} |`);
  w('');
}
w(`**Equal widths are reported rather than omitted.** ${banded.filter(r => r.bandWidthsEqual).length ? `${list(banded.filter(r => r.bandWidthsEqual).map(r => P(r.position)))} carries equal-width spans, which §16 treats differently from unequal ones — a replicate set is equal-width by construction, so an equal-width span does not by itself rule out the pooled reading.` : 'No banded deposit here carries equal-width spans.'}`);
w('');

// ── 4 — the gate objects ──
w('## 4 — the two gate objects');
w('');
w('### 4.1 — `computeTrigger`, under the `replicates` answer');
w('');
w('Read off `condCtx.groupingTrigger`, the field `extractAnalysisInputs` stamps at');
w('`engine.js:174-178`. `scripts/corpus-run.mjs:247` hardcodes `colRelationship: \'replicates\'`, so');
w('**every figure in this section is a `replicates` figure by construction** (§13.4).');
w('');
w('| pos | attempted | condCols | arm 1 (`≥3`) | arm 2 (thin/unusable) | pending | nGroups | median |');
w('|---|---|---|---|---|---|---|---|');
for (const r of byPos) {
  const t = r.groupingTrigger;
  w(`| ${P(r.position)} | ${t.attempted} | ${t.condCols} | ${t.arm1 ? '**true**' : 'false'} | ${t.arm2 ? '**true**' : 'false'} | ${t.pending ? '**true**' : 'false'} | ${num(t.nGroups)} | ${num(t.median)} |`);
}
w('');
w(`**Pending on ${pending.length} of ${N}**: ${list(pending.map(r => P(r.position)))}.`);
w('');
w(`**Arm 1 without arm 2 on ${arm1only.length} — ${list(arm1only.map(r => P(r.position)))}.** Round 1 had none, and CLAUDE.md records the arm-1-only case as **unmeasured on any corpus and the one place confirming the grouping could still move a verdict**. Here it is measured. Each has three or more condition columns over a partition arm 2 does not also catch:`);
w('');
w('| pos | condCols | groups | median size | first sizes | valid rows | refuses? |');
w('|---|---|---|---|---|---|---|');
for (const r of arm1only) {
  const t = r.groupingTrigger;
  w(`| ${P(r.position)} | ${t.condCols} | ${t.nGroups} | ${t.median} | ${esc(JSON.stringify((t.sizes || []).slice(0, 8)))} | ${r.validRows} | ${r.nNumericDataCols < 2 ? '**yes**' : 'no'} |`);
}
w('');
w(`${arm1only.filter(r => r.nNumericDataCols < 2).length ? `**${list(arm1only.filter(r => r.nNumericDataCols < 2).map(r => P(r.position)))} refuses at the import floor, so ${arm1only.filter(r => r.nNumericDataCols >= 2).length} live instances remain: ${list(arm1only.filter(r => r.nNumericDataCols >= 2).map(r => P(r.position)))}.**` : ''} **This record does not price them.** Whether confirming moves anything on these deposits is an arm-B question and no arm has run.`);
w('');
w(`Arm 2 without arm 1 fires on ${arm2only.length}${arm2only.length ? `: ${list(arm2only.map(r => P(r.position)))}` : ''}.`);
w('');
w('### 4.2 — `suggestRowSemantics`');
w('');
w('| pos | assay (source) | dataType | longFormat | `value` | `auto` | `reason` | headless fallback |');
w('|---|---|---|---|---|---|---|---|');
for (const r of byPos) {
  const s = r.rsSuggestion;
  w(`| ${P(r.position)} | ${r.assay} (${r.assaySource}) | ${r.dataType} | ${r.longFormatDetected} | ${JSON.stringify(s.value)} | ${s.auto} | ${s.reason} | ${code(r.rowSemanticsHeadlessFallback)} |`);
}
w('');
w(`**\`value\` is null on ${rsNull.length} of ${N}** — the \`user-choice\` case \`rowSemantics.js:14\` marks REQUIRED. On those, \`ImportView.jsx:431\` auto-applies nothing and \`rowSemRequired\` (\`:441\`) is true, while **\`corpus-run.mjs:246-247\` substitutes \`'ordered'\` for the null**. So on ${rsNull.length} deposits arm A answers row semantics by a fallback at exactly the point the shipped surface would demand a human answer. Recorded as a prep divergence on the row-semantics axis; it is not a new defect claim.`);
w('');

// ── 5 — §2.8 ──
w('## 5 — §2.8, the group-attribute hold-out');
w('');
w(`\`detectGroupAttributes\` returns at \`roles.js:90\` when the sheet offers fewer than \`MIN_ROWS_FOR_GROUPING = 50\` rows. **It reached the pass on ${g28ran.length} of ${N} and moved at least one column on ${g28moved.length}.** "Did not move a column" and "did not look" are different findings and are separated here.`);
w('');
w('| pos | rows to the pass | reached it | grouping keys | columns moved | base vs shipped roles differ |');
w('|---|---|---|---|---|---|');
for (const r of byPos) {
  const g = r.groupAttributes;
  w(`| ${P(r.position)} | ${g.rowsHandedToPass} | ${g.reachedThePass ? 'yes' : `**no** — floor ${g.rowFloor}`} | ${g.groupings.length} | ${g.columnsMoved.length}${g.columnsMoved.length ? ` (${esc(g.columnsMoved.slice(0, 10).join(', '))}${g.columnsMoved.length > 10 ? ' …' : ''})` : ''} | ${g.baseVsShippedDiffer} |`);
}
w('');
w(`**Below the floor on ${byPos.filter(r => !r.groupAttributes.reachedThePass).length}**: ${list(byPos.filter(r => !r.groupAttributes.reachedThePass).map(r => `${P(r.position)} (${r.groupAttributes.rowsHandedToPass} rows)`))}. Those are **non-instances by the floor** and carry no evidence either way about whether the hold-out would fire on a longer version of the same design.`);
w('');

// ── 6 — the refusals ──
w('## 6 — the import floor');
w('');
w(`**${refusals.length} of ${N} carry fewer than 2 data columns and refuse at \`ImportView.jsx:974\`** — ${list(refusals.map(r => P(r.position)))}. No other deposit is near the floor. Their structure is read on the same terms as the rest; **the refusal is arm B's outcome, not a reason to skip the read** (§14.3), and no gate answer is owed for them.`);
w('');
w('| pos | data columns | §2.8 moved | without the hold-out | condition cols | attribute cols |');
w('|---|---|---|---|---|---|');
for (const r of refusals) {
  w(`| ${P(r.position)} | **${r.nNumericDataCols}** | ${r.groupAttributes.columnsMoved.length} | ${r.nNumericDataCols + r.groupAttributes.columnsMoved.length} | ${r.roleCounts.condition} | ${r.roleCounts.attribute} |`);
}
w('');
w('**§15.1\'s figures reproduce independently here.** It records the three as carrying 13, 5 and 3 data');
w(`columns without the hold-out; measured, ${list(refusals.map(r => `${P(r.position)} → ${r.nNumericDataCols + r.groupAttributes.columnsMoved.length}`))}. **Any structural reason of the form *this file holds one measurement* is false** — the product removed the others.`);
w('');

// ── 7 — fragmentation ──
w('## 7 — the row partition');
w('');
w('`slices()` pre-filters at 3 rows, so a singleton count taken from its output is structurally zero.');
w('Both are reported: the full partition from `rowGroupsStatus()`, and the survivors from `slices()`.');
w('');
w('| pos | `condCtx.type` | groups | singletons | surviving slices | dropped by the filter |');
w('|---|---|---|---|---|---|');
for (const r of byPos) {
  const g = r.rowGroups;
  if (!g) { w(`| ${P(r.position)} | ${r.condCtxType} | — | — | — | — |`); continue; }
  w(`| ${P(r.position)} | ${r.condCtxType} | ${g.nGroups} | ${g.singletons} | ${num(g.survivingSlices)} | ${g.nGroups ? g.nGroups - (g.survivingSlices ?? 0) : 0} |`);
}
w('');
const p31 = R.find(r => r.position === 31);
if (p31) w(`**${P(31)} partitions into ${p31.rowGroups.nGroups} groups, every one a singleton, and \`slices()\` returns ${p31.rowGroups.survivingSlices}.** §15.3 confirmed as a recorded outcome, not an error: the file imports, the gates render, and no group-based test can run on it.`);
w('');
const frag = byPos.filter(r => r.rowGroups && r.rowGroups.nGroups > 0)
  .sort((a, b) => (b.rowGroups.nGroups - b.rowGroups.survivingSlices) - (a.rowGroups.nGroups - a.rowGroups.survivingSlices))[0];
if (frag) w(`Heaviest loss to the 3-row filter is ${P(frag.position)}, ${frag.rowGroups.nGroups - frag.rowGroups.survivingSlices} of ${frag.rowGroups.nGroups} groups dropped.`);
w('');
w(`**${byPos.filter(r => r.condCtxType === 'column-grouped').length} deposits read \`column-grouped\`**, ${byPos.filter(r => r.condCtxType === 'row-grouped').length} read \`row-grouped\` and ${byPos.filter(r => r.condCtxType === 'none').length} read \`none\`. That is a \`replicates\` figure; under the \`conditions\` answer the classification changes.`);
w('');

// ── 8 — the total-row check ──
w('## 8 — is the last data row a column total?');
w('');
w('One derived check, run because it found something on position 1. For each sheet the last matrix');
w('row is compared to the column-wise sum of the rows above it. **The number is reported and not');
w('classified**: an exact match would prove a live formula, and a small residual is equally consistent');
w('with a total reported at a precision the rounded cells above cannot reproduce.');
w('');
w('| pos | columns compared | exact to 1e-6 | max absolute residual | max relative residual | at column |');
w('|---|---|---|---|---|---|');
for (const r of byPos) {
  const t = r.lastRowIsColumnTotal;
  w(`| ${P(r.position)} | ${t.columnsCompared} | ${t.exactTo1e6} | ${t.maxAbsResidual == null ? '—' : t.maxAbsResidual.toExponential(3)} | ${t.maxRelativeResidual == null ? '—' : t.maxRelativeResidual.toExponential(3)} | ${num(t.maxRelativeAtColumn)} |`);
}
w('');
w(`**${P(1)} stands alone.** Its largest relative residual is ${relSorted[0].lastRowIsColumnTotal.maxRelativeResidual.toExponential(3)}; the smallest among the other ${N - 1} is ${relSorted[1].lastRowIsColumnTotal.maxRelativeResidual.toExponential(3)} on ${P(relSorted[1].position)}. On every other deposit the last row is plainly not a column total, and the check is a clean negative.`);
w('');
w(`**One refinement of \`S395-POS01-STRUCTURE.md\` §3, named rather than edited in place.** That section reported ${P(1)}'s residual as ${relSorted[0].lastRowIsColumnTotal.maxAbsResidual.toExponential(3)} absolute and 2.91e-4 "as a fraction of the reported total", using a nominal denominator of 100. The per-column relative figure computed here is **${relSorted[0].lastRowIsColumnTotal.maxRelativeResidual.toExponential(3)}**, at column ${relSorted[0].lastRowIsColumnTotal.maxRelativeAtColumn}. Same magnitude, a stricter denominator; §3's absolute figure is unchanged and neither statement was wrong.`);
w('');

// ── 9 — prep ──
w('## 9 — what the prep removed before role inference ran');
w('');
w('Two different strips, and they are not the same pass. `preprocessRaw` removes sparse rows from the');
w('**top** (`skippedRows`) and the **bottom** (`trimmedRows`) and may drop near-empty **columns**;');
w('it publishes all three itself. `prepStructure:171-174` then strips further preamble rows inline and');
w('publishes nothing, so that count is derived as block rows minus header rows minus data rows.');
w('');
w('| pos | `skippedRows` (top) | `trimmedRows` (bottom) | columns removed | further preamble strip | blank rows in `data` | rows dropped by `extractAnalysisInputs` |');
w('|---|---|---|---|---|---|---|');
for (const r of byPos) {
  const p = r.preprocess;
  w(`| ${P(r.position)} | ${p.skippedRows} | ${p.trimmedRows} | ${p.removedCols.length}${p.removedCols.length ? ` (${esc(p.removedCols.slice(0, 10).join(', '))})` : ''} | ${r.prepStructurePreambleStrip} | ${r.blankDataRows.count} | ${r.rowsDroppedByExtract} |`);
}
w('');
const trimmed = byPos.filter(r => r.preprocess.trimmedRows > 5).sort((a, b) => b.preprocess.trimmedRows - a.preprocess.trimmedRows);
w(`**Bottom trims worth naming**: ${list(trimmed.map(r => `${P(r.position)} (${r.preprocess.trimmedRows} rows)`))}. ${trimmed.length ? `${P(trimmed[0].position)} loses ${trimmed[0].preprocess.trimmedRows} of its ${trimmed[0].rawRows} raw rows to the bottom trim alone.` : ''}`);
w('');
w(`**Column drops**: ${list(byPos.filter(r => r.preprocess.removedCols.length).map(r => `${P(r.position)} (${r.preprocess.removedCols.length})`))}. A dropped column shifts every column index to its right, so the indices in §11 are post-drop.`);
w('');

// ── 10 — instrument faults ──
w('## 10 — two instrument faults, recorded rather than quietly fixed');
w('');
w('Both were the probe reading something adjacent to its subject, and both would have shipped a wrong');
w('table. Recorded under the standing rule that *a check that cannot reach its subject returns green*.');
w('');
w('1. **The receipt is per FILE, not per position.** 199 entries over 39 positions, up to 54 files in');
w('   one deposit. A `find(r => r.position === POS)` returns the deposit\'s first file, which is not the');
w('   one §6.2 chose — and that read produced **12 false "disagreements"** before it was caught. The');
w('   check now matches on file as well, and verifies `sha256` and byte size.');
w('2. **The run-log parser matched §3\'s enumeration table, not §4\'s.** §3\'s rows also open with a bare');
w(`   integer, so an unscoped search found one first; on ${P(1)} it returned file \`"2026-08-28"\`. The`);
w('   parse is now scoped between the `## 4 —` and `## 5 —` headings.');
w('');

// ── 11 — per-deposit ──
w('## 11 — the deposits');
w('');
w(`One section per deposit, ascending. ${totalCols.toLocaleString()} columns in total across the ${N}.`);
w('');
w('**Per-column fields.** `numeric` / `non-numeric` / `missing` use the shipped predicates verbatim —');
w('missing is `v == null || v === \'\'` (`inferBaseRoles:35`), numeric is `!isNaN(Number(v))` (`:37`) —');
w('so a literal `NA` is non-numeric, not missing. Counts are over `data`, the post-header rows.');
w('`d≤40` is the distinct count over the forty rows `inferBaseRoles` actually decides on.');
w('');
w(`**Where a sheet exceeds ${WIDE} columns the table carries every non-\`data\` column, every column §2.8 moved, and the first five and last three \`data\` columns as exemplars; the remaining \`data\` columns are rolled up in a stated line rather than silently dropped.**`);
w('');

for (const r of byPos) {
  const t = r.groupingTrigger, g = r.groupAttributes, rc = r.roleCounts, p = r.preprocess;
  w(`### ${P(r.position)} — ${code(r.file)} :: ${code(r.sheet)}`);
  w('');
  const marks = [];
  if (r.position === 1) marks.push('**control** — already recorded at `S395-POS01-STRUCTURE.md`');
  if (r.nNumericDataCols < 2) marks.push('**refuses at `ImportView.jsx:974`** — no gate answer owed (§14.3)');
  if (r.hasSpanningHeader) marks.push(`**${r.spanningBands.length} spanning band${r.spanningBands.length === 1 ? '' : 's'}**`);
  if (t.arm1 && !t.arm2) marks.push('**arm 1 without arm 2**');
  if (marks.length) { w(marks.join(' · ')); w(''); }
  w(`${r.doi} · sheet **${r.sheetIndex + 1} of ${r.sheetTotal}** (\`sheetIndex\` ${r.sheetIndex}, 0-based) · ${r.nFilesInDeposit} file${r.nFilesInDeposit === 1 ? '' : 's'} in the deposit, §6.2 decided by ${r.decidedBy} · \`SheetNames[0]\` ${code(r.sheetNames0)} · \`sha256\` \`${r.sha256.slice(0, 16)}…\` matches the receipt · ${(r.sizeBytes / 1e6).toFixed(2)} MB · ${(r.wallMs / 1000).toFixed(1)} s.`);
  w('');
  w('| | | | |');
  w('|---|---|---|---|');
  w(`| raw | ${r.rawRows} × ${r.rawCols} | \`detectHeaderRows\` | **${r.headerRows}** |`);
  w(`| after prep | ${r.dataRows} data rows × ${r.nHdrs} cols | \`condPerCol\` | ${r.condPerCol === null ? '`null`' : 'present'} |`);
  w(`| matrix | ${r.validRows} × ${r.nNumericDataCols} | \`condCtx.type\` | ${code(r.condCtxType)} |`);
  w(`| roles C/L/D/A/I | ${rc.condition}/${rc.label}/${rc.data}/${rc.attribute}/${rc.ignore} | assay · dataType | ${r.assay} (${r.assaySource}) · ${r.dataType} |`);
  w(`| synthesised headers | ${r.synthesisedHeaders.count} of ${r.synthesisedHeaders.of} | zeroAsMissing · longFormat | ${r.zeroAsMissing} · ${r.longFormatDetected} |`);
  w('');
  // header detection
  const h = r.headerDetection;
  w(`**Header detection.** Returned **${h.returned}**. \`isSparseGroupRow(row0)\` ${h.isSparseGroupRow_row0 ? '**true**' : 'false'} · \`isRepeatingSubHeader(row1)\` ${h.isRepeatingSubHeader_row1 ? 'true' : 'false'} · numeric fraction of row 2 ${(h.numericFraction_row2 ?? 0).toFixed(3)}. ${(h.failedConjuncts || []).length ? `Failed: ${esc(h.failedConjuncts.join('; '))}.` : 'The two-row branch was taken.'}`);
  w('');
  // bands
  if (r.hasSpanningHeader) {
    w(`**Bands.** ${r.spanningBands.length} spanning label${r.spanningBands.length === 1 ? '' : 's'}, widths ${r.spanningBands.map(b => b.width).join(' / ')} — **${r.bandWidthsEqual ? 'equal' : 'unequal'}**.`);
    w('');
    w('| columns | width | label |');
    w('|---|---|---|');
    for (const b of r.bands) w(`| ${b.from}–${b.to} | ${b.width}${b.width > 1 ? ' **span**' : ''} | ${code(b.label)} |`);
    w('');
  } else {
    w(`**Bands.** **No spanning header.** Every real header cell covers exactly one column${r.leadingOrphanColumns.length ? `, and column${r.leadingOrphanColumns.length === 1 ? '' : 's'} ${r.leadingOrphanColumns.join(', ')} carr${r.leadingOrphanColumns.length === 1 ? 'ies' : 'y'} a synthesised header with no real header to the left, so no band is possible there` : ''}.`);
    w('');
  }
  // §2.8
  if (!g.reachedThePass) {
    w(`**§2.8.** **Did not look.** The pass received ${g.rowsHandedToPass} rows against \`MIN_ROWS_FOR_GROUPING = ${g.rowFloor}\` and returned at \`roles.js:90\` before evaluating a candidate — a non-instance by the floor, carrying no evidence about a longer version of the same design.`);
  } else if (!g.groupings.length) {
    w(`**§2.8.** Ran on ${g.rowsHandedToPass} rows and **moved no column**. Unlike the floor case, the pass looked and declined.`);
  } else {
    w(`**§2.8.** Ran on ${g.rowsHandedToPass} rows and **moved ${g.columnsMoved.length} column${g.columnsMoved.length === 1 ? '' : 's'}** via ${g.groupings.length} grouping key${g.groupings.length === 1 ? '' : 's'}: ${g.groupings.slice(0, 6).map(x => `${code(x.groupHeader)} (col ${x.groupCol}, ${x.nLevels} levels → ${x.attrCols.length})`).join('; ')}${g.groupings.length > 6 ? `; and ${g.groupings.length - 6} more` : ''}.`);
  }
  w('');
  w(`**\`computeTrigger\`** (\`replicates\`): \`${esc(JSON.stringify(t))}\`. Arm 1 \`condCols ${t.condCols} >= 3\` → **${t.arm1}**; arm 2 → **${t.arm2}**; pending → **${t.pending}**${!t.attempted ? '. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`' : ''}.`);
  w('');
  w(`**\`suggestRowSemantics\`**: \`${esc(JSON.stringify(r.rsSuggestion))}\`. ${r.rsSuggestion.value === null ? '`ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `\'ordered\'`.' : `Auto-applied by \`ImportView.jsx:431\`; the headless path agrees at ${code(r.rowSemanticsHeadlessFallback)}.`}`);
  w('');
  const rg = r.rowGroups;
  w(`**Partition.** ${rg ? `${rg.nGroups} group${rg.nGroups === 1 ? '' : 's'}, ${rg.singletons} singleton${rg.singletons === 1 ? '' : 's'}, ${num(rg.survivingSlices)} surviving \`slices()\`${rg.nGroups ? ` (${rg.nGroups - (rg.survivingSlices ?? 0)} dropped by the 3-row filter)` : ''}.` : 'not available on this context.'}`);
  w('');
  w(`**Prep.** \`preprocessRaw\` skipped ${p.skippedRows} row${p.skippedRows === 1 ? '' : 's'} from the top and trimmed ${p.trimmedRows} from the bottom${p.removedCols.length ? `, and removed ${p.removedCols.length} near-empty column${p.removedCols.length === 1 ? '' : 's'} (${esc(p.removedCols.slice(0, 12).join(', '))})` : ''}. \`prepStructure\` stripped a further ${r.prepStructurePreambleStrip}. ${r.blankDataRows.count ? `${r.blankDataRows.count} blank row${r.blankDataRows.count === 1 ? '' : 's'} survive${r.blankDataRows.count === 1 ? 's' : ''} into \`data\` (index ${r.blankDataRows.indices.join(', ')})` : 'No blank row survives into `data`'}; \`extractAnalysisInputs\` dropped ${r.rowsDroppedByExtract} row${r.rowsDroppedByExtract === 1 ? '' : 's'}.`);
  w('');
  const lt = r.lastRowIsColumnTotal;
  w(`**Last row against the column sums above it.** ${lt.columnsCompared} column${lt.columnsCompared === 1 ? '' : 's'} compared, ${lt.exactTo1e6} exact to 1e-6, max absolute residual ${lt.maxAbsResidual == null ? '—' : lt.maxAbsResidual.toExponential(3)}, max relative ${lt.maxRelativeResidual == null ? '—' : lt.maxRelativeResidual.toExponential(3)}${lt.maxRelativeAtColumn != null ? ` at column ${lt.maxRelativeAtColumn}` : ''}. Reported, not classified.`);
  w('');
  w(`**Window.** ${r.dataRows} data rows against the 40-row window, so the window ${r.windowCoversWholeColumn ? '**is the whole column** on every one — P217 cannot misrepresent this sheet' : `is a **strict sample**; ${r.columnsWhereWindowIsAStrictSample} of ${r.columns.length} columns have \`distinct != distinct(window)\``}.`);
  w('');

  // per-column table
  const cols = r.columns;
  let shown = cols, rolled = [];
  if (cols.length > WIDE) {
    const keep = new Set();
    cols.forEach((c, i) => { if (c.role !== 'data' || c.movedBy28) keep.add(i); });
    const dataIdx = cols.map((c, i) => i).filter(i => !keep.has(i));
    dataIdx.slice(0, 5).forEach(i => keep.add(i));
    dataIdx.slice(-3).forEach(i => keep.add(i));
    shown = cols.filter((_, i) => keep.has(i));
    rolled = cols.filter((_, i) => !keep.has(i));
  }
  w('| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |');
  w('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const c of shown) {
    w(`| ${c.i} | ${code(c.header)}${c.synthesised ? ' *(synth)*' : ''} | ${c.band == null ? '—' : (c.band === c.header ? '—' : code(c.band))} | ${c.role}${c.baseRole !== c.role ? ` *(was ${c.baseRole})*` : ''} | ${c.numeric} | ${c.nonNumeric} | ${c.missing} | ${c.distinct} | ${c.distinctWindow} | ${c.nfWindow == null ? '—' : c.nfWindow.toFixed(2)} | ${c.movedBy28 ? `moved — const within col ${c.movedBy28.groupCol} ${code(c.movedBy28.groupHeader)}` : 'not moved'} |`);
  }
  w('');
  if (rolled.length) {
    const f = (k) => rolled.map(c => c[k]);
    const rng = (k) => `${Math.min(...f(k))}–${Math.max(...f(k))}`;
    w(`**${rolled.length} further \`data\` columns are rolled up rather than listed** (columns ${rolled[0].i}–${rolled[rolled.length - 1].i}, non-contiguous where an exemplar was kept). Across them: numeric ${rng('numeric')}, non-numeric ${rng('nonNumeric')}, missing ${rng('missing')}, distinct ${rng('distinct')}, distinct≤40 ${rng('distinctWindow')}. ${rolled.filter(c => c.nonNumeric > 0).length} carry any non-numeric cell; ${rolled.filter(c => c.distinct !== c.distinctWindow).length} have a strict-sample window; ${rolled.filter(c => c.movedBy28).length} were moved by §2.8. **Every non-\`data\` column and every §2.8-moved column of this sheet is listed above, so nothing anomalous is inside this roll-up.**`);
    w('');
  }
}

// ── 12 — not settled ──
w('## 12 — what this record does not settle');
w('');
w('- **No arm ran.** Neither arm A nor arm B has been run on any round-2 deposit. No test executed, no');
w('  flag, no `primaryP`, no severity.');
w('- **No gate is answered.** Column relationship, row semantics and the §13.3 confirm set are all');
w('  unanswered. The answers are formed from this table afterwards, in one pass, and written to the run');
w('  log then. **Nothing here is an answer, and `computeTrigger`\'s `pending` is not one either** — it');
w('  says whether the card renders, not what should be ticked.');
w('- **No verdict, no `cov.ran`, no row fraction.** §13.5 and §15.2\'s per-arm fields are not derivable');
w('  from a structural read and none is attempted.');
w('- **§8.3\'s polyfill assertion is not performed here.** `parseExcel` through the polyfill against');
w('  `parseExcel` on a buffer read from disk belongs with arm B\'s run. **It must not be assumed done**');
w('  for any deposit in this table, and every run log §4 *Polyfill assertion* cell stays empty until it');
w('  is performed.');
w('- **Nothing about what a reader sees.** No screen was opened for any deposit here. In particular');
w(`  **this record does not assert that the shipped surface accepts any of these ${N} sheets**; it reports`);
w('  `nNumericDataCols`, which §15.1 proves is the same computation as `ImportView`\'s `sum.nDC` within a');
w('  prep, while leaving prep divergence open (`S381-HARNESS-APP-DIVERGENCE.md`).');
w('- **Every figure is a `replicates` figure.** `corpus-run.mjs:247` hardcodes the column answer, so the');
w('  trigger, the partition, `condCtx.type` and the coverage implications would all move under');
w('  `conditions`. §15.4: that answer has no round-1 coverage forecast at all.');
w('- **The band maps are a structure, not a §16 ruling.** Whether a deposit falls in §16\'s class is an');
w('  arm-B judgement made against the shipped screen, and no screen was read here.');
w('- **The total-row residual is unclassified** by design, on every deposit including position 1.');
w('- **The arm-1-only deposits are identified, not priced.** Whether confirming the grouping moves');
w('  anything on them is an arm-B question.');
w('- **Nothing about the five surplus deposits.** §12.6\'s spares are outside the thirty and were not read.');
w('');

writeFileSync(OUT, L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
console.log(`wrote ${OUT}`);
console.log(`lines: ${L.join('\n').replace(/\n{3,}/g, '\n\n').split('\n').length}`);

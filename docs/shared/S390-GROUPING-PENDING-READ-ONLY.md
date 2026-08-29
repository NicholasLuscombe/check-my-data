# S390 — what `BatchView` does when `groupingPending` is set

Read-only. Nothing in `src/` was edited, no probe was written, the app was not run, the batch was not
run. Every answer below is a citation to a line in the working tree at `386778c`, except the four
counts marked as read off `corpus-out/s379-honest-run.json`, which was opened read-only and is
identified at the end.

**Why this exists.** `docs/shared/S381-HARNESS-APP-DIVERGENCE.md` row 29 records the grouping-confirm
card as one of two pure harness artifacts: "both app surfaces reach the grouping-confirm card, and only
the harness stops at `groupingPending`" (`S381:357`). It fires on 9 of 41 sheets and holds four tests
at `N/A`. S381 records `BatchView`'s *site* for row 29. It does not record what the loop *does* when the
card renders. Round 2 defines arm A as each deposit through `BatchView`'s loop as it ships
(`ROUND2-SPECIFICITY-SCREEN.md:35`), so if that loop and the harness differ here, arm A is wrong on a
fifth of the corpus, and arm A minus arm B is the only quantity the screen produces.

---

## Part 1 — the `BatchView` runtime path

### 1. Does the loop suspend, or record and continue?

**It records and continues. No line decides it, because no line in `BatchView.jsx` reads
`groupingPending` at all.**

`grep groupingPending src/components/views/BatchView.jsx` returns nothing. The batch loop
([BatchView.jsx:75](src/components/views/BatchView.jsx:75)–[246](src/components/views/BatchView.jsx:246))
is a plain `for` over `files` with exactly two `await` points inside it:

- [BatchView.jsx:78](src/components/views/BatchView.jsx:78) — `await new Promise(r=>setTimeout(r,50))`, a
  yield for the progress label.
- [BatchView.jsx:200](src/components/views/BatchView.jsx:200) — `await runFullAnalysis(...)`, which
  resolves when the battery finishes.

Neither awaits a click, and there is no third. The nearest thing to a deciding line is the one that
*could* have been a gate and is not:
[BatchView.jsx:211](src/components/views/BatchView.jsx:211), the unconditional `batchResults.push({...})`
reached directly from `:200`, followed by
[BatchView.jsx:245](src/components/views/BatchView.jsx:245) (`setResults([...batchResults])`) and the
loop's own `}` at `:246`. The run then closes at
[:247–:248](src/components/views/BatchView.jsx:247) (`setRunning(false)`).

The confirm surface is unreachable while the loop runs. It is mounted only through the drill-in branch
at [BatchView.jsx:297](src/components/views/BatchView.jsx:297)
(`if(selectedIdx!==null&&results[selectedIdx])`), which returns `<ReportView>` at
[:335](src/components/views/BatchView.jsx:335). `selectedIdx` is set only by a row click
([:426](src/components/views/BatchView.jsx:426)), and rows exist only after `batchResults` has been
pushed. **The card is strictly downstream of the loop that would have to wait for it.**

### 2. What value does the analysis carry forward?

**The pending state itself — not a default, not `null`.**

The four results in `testResults` are the objects built by `pendingResult`
([engine.js:254–260](src/analysis/engine.js:254)):

```js
{ name, category, flag: "N/A",
  description: "grouping unconfirmed — pending user confirmation",
  groupingPending: { ...groupingTrigger } }
```

where `groupingTrigger` ([engine.js:243–253](src/analysis/engine.js:243)) carries
`{arm1, arm2, condCols, nGroups, medianSize, sizes}`, derived from `condCtx.groupingTrigger`
([:241–:242](src/analysis/engine.js:241)), which `computeTrigger`
([groupingTrigger.js:54](src/analysis/groupingTrigger.js:54)) stamped in `extractAnalysisInputs`.
No `naCause`, no `primaryP` — consistent with `S377-NA-CAUSE-HOLDOUT-FIT.md` §1.6, which already
places `groupingPending` outside the `NA_CAUSE` enum.

Two consumers inside the loop read those objects, and neither treats them as a default:

- [BatchView.jsx:203](src/components/views/BatchView.jsx:203) — `computeSeverity(testResults)` counts
  only `HIGH` and `MODERATE` ([severity.js:9–10](src/analysis/severity.js:9)). A pending test
  contributes nothing, so the batch rating is computed over 25 tests, not 29. **The rating on a pending
  sheet can only be lower than or equal to the rating the same file would get with the four run.**
- [BatchView.jsx:208–209](src/components/views/BatchView.jsx:208) — `applicable = cov.ran + cov.withheld`.
  `classifyCoverage` files a pending result as its own sixth state, `pending`
  ([coverage.js:77](src/analysis/coverage.js:77)), ahead of the `notApplicable` fallback, so pending is
  excluded from both terms. **The batch table's `Tests` column reads 4 lower on a pending sheet.**

### 3. What state does `GroupingConfirmCard` render in before any click? Is there a default if nobody clicks?

**It renders in the working (pending) state, all condition columns pre-ticked. There is no default that
applies if nobody clicks, and the card is the only way past.**

Before any click, in the drill-in:

- `groupingPendingBase` is `true` ([ReportView.jsx:188](src/components/views/ReportView.jsx:188)), so the
  visibility gate at [GroupingConfirmCard.jsx:72](src/components/forensics/GroupingConfirmCard.jsx:72)
  passes.
- `tickedCols` is initialised to **all** condition columns
  ([ForensicsBody.jsx:178–182](src/components/forensics/ForensicsBody.jsx:178)); the card's own fallback
  at [:55](src/components/forensics/GroupingConfirmCard.jsx:55) is the same set.
- `confirmedActive` is `false` (`!!confirmedResults`, and `confirmedResults` starts `null` —
  [ReportView.jsx:183](src/components/views/ReportView.jsx:183), [:1504](src/components/views/ReportView.jsx:1504)).
- `exitedUnassessed` is `false` ([:42](src/components/forensics/GroupingConfirmCard.jsx:42)).
- The live recompute at [:62–:67](src/components/forensics/GroupingConfirmCard.jsx:62) runs
  `computeTrigger` on the full ticked set — the same set and the same helper the engine used — so
  `live.pending` is `true` and the indicator renders the amber **"Needs confirmation"** branch
  ([:224–:231](src/components/forensics/GroupingConfirmCard.jsx:224)).
- Body copy: *"The grouped tests that compare groups are paused until you confirm how the rows are
  grouped."* ([:149](src/components/forensics/GroupingConfirmCard.jsx:149)).
- Two buttons: **Confirm this grouping and run the grouped tests**
  ([:274–:285](src/components/forensics/GroupingConfirmCard.jsx:274)) and **Leave these tests
  unassessed** ([:286–:297](src/components/forensics/GroupingConfirmCard.jsx:286)).

**The pre-ticked set is a display default, not a verdict default.** It decides which checkboxes are
drawn ticked; it does not decide anything about the four tests. The card mutates state only through
`onToggleCol` ([:165](src/components/forensics/GroupingConfirmCard.jsx:165)), `onConfirm`
([:85](src/components/forensics/GroupingConfirmCard.jsx:85)) and `onLeaveUnassessed`
([:109](src/components/forensics/GroupingConfirmCard.jsx:109)) — all `onClick`/`onChange` handlers.
There is no `useEffect`, no timer, no auto-confirm anywhere in the file. Absent a click,
`confirmedResults` stays `null` and `results` is `baseResults` unchanged
([ReportView.jsx:184–187](src/components/views/ReportView.jsx:184)): the four stay `N/A` pending, for
as long as the view is open.

**And the confirm never reaches the batch.** `confirmedResults` is `useState` local to `ReportView`
([:183](src/components/views/ReportView.jsx:183)), described in its own comment as *"Session-only state;
nothing persisted"* ([:180](src/components/views/ReportView.jsx:180)). `BatchView` passes `r.results` in
at [:335](src/components/views/BatchView.jsx:335) and has no setter coming back. So even a human who
drills in and confirms leaves the batch row's severity, `Flagged`, `Noted` and `Tests` columns
untouched, and `generateBatchSummary()`
([BatchView.jsx:252–288](src/components/views/BatchView.jsx:252)) — which reads `results`, the batch
state — still copies out the pre-confirm numbers.

### 4. Does anything downstream distinguish "confirmed by a human" from "never asked"?

**Three of the four states carry a flag. The fourth — confirmed and ran — carries none.**

| state | marker | where it is set | who reads it |
|---|---|---|---|
| never asked / never clicked | `groupingPending: {…}` | [engine.js:258](src/analysis/engine.js:258) | `classifyCoverage` → `"pending"` ([coverage.js:77](src/analysis/coverage.js:77)); `ForensicsBody.jsx:448`; `GroupingConfirmCard.jsx:72` |
| exited — "I can't say" | `groupingUnassessed: true` | [GroupingConfirmCard.jsx:116](src/components/forensics/GroupingConfirmCard.jsx:116) | `classifyCoverage` → `"unassessed"` ([coverage.js:78](src/analysis/coverage.js:78)); `ForensicsBody.jsx:453` |
| confirmed, and the grouping could not support the test | `confirmedGroups` + `confirmedLargestGroup` (numbers) | [confirmGrouping.js:139–140](src/analysis/confirmGrouping.js:139) | `isGroupingRefusal` ([handoffModel.js:396–399](src/analysis/handoffModel.js:396)) |
| **confirmed, and the test ran** | **none** | — | — |

A confirmed-and-ran result comes straight back from the shared test function through
`aggregatePerGroup` ([confirmGrouping.js:156](src/analysis/confirmGrouping.js:156), `:178`, `:195`,
`:213`) and is swapped in by name at
[ReportView.jsx:186](src/components/views/ReportView.jsx:186). It is shape-identical to a result the
engine produced with no trigger at all, and `classifyCoverage` files it as `"ran"` on its flag alone
([coverage.js:75](src/analysis/coverage.js:75)).

**Said plainly: there is no positive "a human confirmed this" flag on a result object.** The only record
that a confirm happened is `confirmedResults !== null` in `ReportView`'s session state, which is on no
result, is not persisted, and is not exported — `grep` for `groupingPending|groupingUnassessed|confirmed`
in [src/export/excelExport.js](src/export/excelExport.js) returns nothing. A `HIGH` produced after a
confirm and a `HIGH` produced unattended are indistinguishable downstream.

---

## Part 2 — the harness side, and how the four tests reach `N/A`

### 5. Where does `corpus-run.mjs` stop at `groupingPending`?

**It does not stop. Line 348 is a read, not a halt.**

[corpus-run.mjs:348](scripts/corpus-run.mjs:348):

```js
groupingPending: results.find(r => r.groupingPending)?.groupingPending || null,
```

It sits inside the `structure` block of `runDataset`'s `return` object
([:311–:359](scripts/corpus-run.mjs:311)) — *after* `runFullAnalysis` resolved at
[:278–:281](scripts/corpus-run.mjs:278), after `computeSeverity` at
[:283](scripts/corpus-run.mjs:283), after the per-test table was built at
[:287–:297](scripts/corpus-run.mjs:287). There is no `break`, no early `return`, no `continue`, no
`await` on anything interactive. The driving loop
([:386–:406](scripts/corpus-run.mjs:386)) proceeds to the next entry unconditionally.

**What it writes:** the trigger object from the *first* result that carries one —
`{arm1, arm2, condCols, nGroups, medianSize, sizes}` — once per sheet, or `null`. Note what it does
**not** write: the `tests[]` rows carry only `name`, `flag`, `primaryP`, optional `evidence` and, for
`N/A`, `note: r.description` ([:287–:296](scripts/corpus-run.mjs:287)). **The per-test `groupingPending`
marker is not in the artifact**, so any per-test pending census read off `s379-honest-run.json` keys on
the prose string at [engine.js:257](src/analysis/engine.js:257). That is how the counts in Q7 below were
taken, and it is a weaker key than the marker.

S381's "records `groupingPending` and stops" is an accurate description of the *outcome* — four tests
stay `N/A`, nothing re-runs them — and a misleading one about control flow. **Neither surface stops.
`BatchView`'s loop does exactly the same thing at exactly the same point.**

### 6. By what mechanism are the four held at `N/A`?

**An explicit read of `groupingPending`, in the shared engine — not a precondition failing for an
unrelated reason.** Four guards, one per test, each a literal `if (groupingPending) return
pendingResult(...)`:

| test | guard |
|---|---|
| Mahalanobis Row Outlier | [engine.js:506](src/analysis/engine.js:506) |
| Entropy / Zipf Analysis | [engine.js:597](src/analysis/engine.js:597) |
| Column Goodness-of-Fit | [engine.js:604](src/analysis/engine.js:604) |
| Modality Test | [engine.js:617](src/analysis/engine.js:617) |

These are the only four `pendingResult` call sites in `src/`. **The gate is not in the harness.**
`corpus-run.mjs` imports `runFullAnalysis` from the same module `BatchView` imports it from
([corpus-run.mjs:40](scripts/corpus-run.mjs:40) vs
[BatchView.jsx:11](src/components/views/BatchView.jsx:11)), so both surfaces receive the same four
`N/A`s from the same four lines. The divergence is entirely on the other side: only the app mounts
`GroupingConfirmCard`, and only the card calls `runConfirmedGroupedTests`
([GroupingConfirmCard.jsx:89](src/components/forensics/GroupingConfirmCard.jsx:89) →
[confirmGrouping.js:66](src/analysis/confirmGrouping.js:66)), whose whole purpose is to drop that one
guard ([confirmGrouping.js:20](src/analysis/confirmGrouping.js:20)).

**This matters for the fix.** A precondition failure would be fixed in the harness. An explicit shared
gate cannot be — the harness has nothing to change, and a change would have to land in `src/` and would
move the shipped product.

### 7. Are those four the complete set?

**Four is the complete set of tests the trigger can route. The set that actually reaches pending on a
given sheet is a subset, because every one of the four guards sits behind earlier guards.**

Read the dispatch bodies in order:

- **Mahalanobis Row Outlier** — `condSkip` ([:502](src/analysis/engine.js:502)), `dtSkip`
  ([:503](src/analysis/engine.js:503)), the genomics check
  ([:504–:505](src/analysis/engine.js:504)), *then* the pending guard at `:506`.
- **Entropy / Zipf**, **Column Goodness-of-Fit**, **Modality** — `dtSkip`
  ([:596](src/analysis/engine.js:596), [:603](src/analysis/engine.js:603),
  [:616](src/analysis/engine.js:616)) *then* the pending guard.

So the reachable pending count varies with `dataType` and mode. Reading `DATATYPE_SKIP`
([assays.js](src/constants/assays.js), consumed at [engine.js:330–337](src/analysis/engine.js:330)),
of the four:

- `dataType: 'ordinal'` skips **all four** → pending is unreachable; 0 of 4.
- `dataType: 'count'` skips **three** (Entropy, Column GoF, Modality); Mahalanobis is not in that map
  and is caught only when the *assay* is `genomics`, not `cell_count` → at most 1 of 4.
- `dataType: 'continuous'` skips none → 4 of 4, unless `isConditionsMode` claims Mahalanobis at `:502`
  (then 3 of 4).

**On the nine sheets it was 4 of 4 every time.** Read off `corpus-out/s379-honest-run.json` by matching
`tests[].note` against the string at [engine.js:257](src/analysis/engine.js:257):

| sheet | pending | arms | condCols | nGroups | median |
|---|---|---|---|---|---|
| C09 :: Sheet1 | 4 | 1+2 | 4 | 20 | 3 |
| C14 :: Data | 4 | 2 | 2 | 236 | 4 |
| C15 :: Data | 4 | 1+2 | 5 | 14 | 3.5 |
| C15 :: Fig. 6 | 4 | 2 | 1 | 1 | 4 |
| C20 :: Microcosm soil A | 4 | 2 | 2 | 37 | 3 |
| C20 :: Microcosm soil B | 4 | 2 | 2 | 37 | 3 |
| C22 :: Exp. OA | 4 | 2 | 2 | 28 | 3 |
| C22 :: Exp. WA | 4 | 1+2 | 4 | 44 | 4 |
| C22 :: Exp. ST | 4 | 1+2 | 4 | 24 | 4 |

All nine are `dataType: continuous`, which is why none was pre-empted. The corpus holds two `ordinal`
sheets (both C17) and no `count` sheet, so the subset case has **zero incidence on this corpus** and is
a structural fact about `src/`, not a measured one. **Round 2's corpus is new deposits, so it should
not be assumed to hold.**

---

## Part 3 — the sheet unit

### 8. What does `parseExcel(file)` return with no sheet argument, and how did the harness get 41 sheets?

**`parseExcel` with no sheet argument returns the FIRST sheet only.**
[excel.js:51](src/import/excel.js:51): `const target = sheetName || wb.SheetNames[0];`. It returns
`{rows, sheetName: target}` ([:93](src/import/excel.js:93)).

[BatchView.jsx:44](src/components/views/BatchView.jsx:44) calls it with one argument and destructures
`{rows}` only — **`sheetName` is discarded**. The rows are then re-serialised to CSV text at
[:45](src/components/views/BatchView.jsx:45) and stored as `{name: file.name, text: csvText}`
([:46](src/components/views/BatchView.jsx:46)), keyed by file name. So:

- `BatchView` analyses **exactly one sheet per workbook — `SheetNames[0]` — and never records which.**
- A multi-sheet workbook contributes one row to the batch table, labelled with the workbook's file name.
- There is no sheet selector on the batch path. `getSheetNames`
  ([excel.js:28](src/import/excel.js:28)) exists and `BatchView` does not import it.

**The harness gets 41 sheets a completely different way: by enumeration in the manifest.**
`test/probes/s379-corpus-manifest.json` declares **49 entries over 12 workbook paths, every one of them
carrying an explicit `sheet`** (key set `{path, sheet, label}`, confirmed at `S381:293`). Each entry is
one `runDataset` call ([corpus-run.mjs:386–406](scripts/corpus-run.mjs:386)) → `readRawMatrix`
([:114](scripts/corpus-run.mjs:114)) → `parseExcel(blob, entry.sheet)`
([:118](scripts/corpus-run.mjs:118)), which takes the *second* parameter `excel.js` has always had and
`BatchView` has never passed. **41 = 49 − 8 import failures**, listed at `S381:362–364` and confirmed
against the artifact.

**Consequence for arm A, stated plainly.** `BatchView`'s loop can reach only one sheet per workbook and
that sheet is fixed at index 0. The manifest positions of the nine pending sheets are: C09::Sheet1 (1st
listed for C09), C14::Data (1st), C20::Microcosm soil A (1st) — and C15::Data (3rd), C15::Fig. 6 (8th),
C20::Microcosm soil B (2nd), C22::Exp. OA / Exp. WA / Exp. ST (2nd / 3rd / 4th). **If manifest order is
workbook sheet order, six of the nine pending sheets are sheets `BatchView`'s loop can never reach.**
For C22 that reading is independently corroborated: `V1X-FUTURE-WORK.md:269` records *"C22 requires its
explicit sheet 'Exp. WA' — its default first sheet ('Info') is metadata"*, and `C22 :: Info` is one of
the eight import failures — so on C22 `BatchView`'s loop produces an **ERROR row**
([BatchView.jsx:237–244](src/components/views/BatchView.jsx:237)), not a pending row.

**This is the one thing here I could not settle by reading.** Manifest order equals workbook sheet order
for C22 and is unverified for the other eleven. What would settle it: `getSheetNames` on the twelve
workbooks, compared against the manifest's first entry per path. That is a probe, so it was not run.

### 9. Can the runner be held to a single named sheet without touching `src/`?

**Yes. Two routes already exist, and both are runner-side. No `src/` change is needed.**

1. **Manifest** — a per-entry `sheet` key, documented at
   [corpus-run.mjs:18](scripts/corpus-run.mjs:18) and read at
   [:118](scripts/corpus-run.mjs:118). This is how the S379 run already worked; all 49 entries use it.
2. **CLI** — `--sheet S` on the single-file form, parsed at
   [corpus-run.mjs:104](scripts/corpus-run.mjs:104) into the same `entry.sheet`.

The parameter it feeds is `parseExcel`'s existing optional second argument
([excel.js:46](src/import/excel.js:46), `:51`), which the runner uses and `BatchView` does not.
The sheet actually used is recorded per dataset as `structure`-adjacent `sheet: sheetUsed`
([:314](scripts/corpus-run.mjs:314), from `:118`), so the record is already auditable.

**One caveat for §6.2, and it is a definitional one, not a blocker.** §6.2 selects the sheet with the
largest cell count, tie-broken by data columns, valid rows, file name, then sheet index — **never
`SheetNames[0]`**. `BatchView`'s loop selects `SheetNames[0]` and nothing else. So on any multi-sheet
deposit where §6.2 does not happen to pick the first sheet, arm A is **`BatchView`'s loop body run on the
§6.2-selected sheet**, not `BatchView`'s loop run on the deposit. That is a coherent and probably correct
choice — §6.2 exists precisely to stop sheet selection being a free choice — but §2's arm-A wording
("each deposit through `BatchView`'s loop as it ships") does not currently say it, and the screen should.
Ten of twelve round-1 workbooks were multi-sheet (`S381` row 2), so this is not a corner case.

---

## Predictions, scored

**P1 (low confidence) — "BatchView continues rather than suspends." → HELD, and the basis was better
than stated.** It continues. But the prediction's framing, and the fork built on it, both assume the
continuation carries a *default*. It does not (Q2). See the fork below.

**P2 (moderate) — "The four reach `N/A` through a grouping precondition, not an explicit
`groupingPending` read." → MISSED, cleanly.** It is four explicit `if (groupingPending) return
pendingResult(...)` reads at `engine.js:506`, `:597`, `:604`, `:617`. The prediction inverts where the
gate lives. It also inverts the fix direction: a precondition would be harness-fixable, and a shared
explicit gate is not fixable anywhere but `src/`.

**P3 (moderate) — "Restricting the runner to one sheet is a runner-side filter and needs no `src/`
change." → HELD, and it is stronger than a filter.** It is not a filter added to the runner; it is the
runner's existing enumeration unit. The S379 run was already one-named-sheet-per-entry. The `src/`
support (`parseExcel`'s second parameter) has been there since the file was written.

---

## Which branch of the fork holds

**Neither, as written: `BatchView` neither suspends nor continues with a default — it records the
pending state itself and continues, which is bit-for-bit what `corpus-run.mjs` already does, so no third
literal is warranted beside `:252` and `:256`, nothing is `(assumed)`, and arm A on the nine sheets is
not understated but exact.**

Expanding, because the fork's two branches carry different consequences and neither consequence follows:

- **The "continues with a default" branch prescribed adding a third literal.** There is no default to
  copy. `BatchView` supplies literals for column relationship
  ([:161](src/components/views/BatchView.jsx:161)) and row semantics
  ([:166](src/components/views/BatchView.jsx:166)) — the two the harness mirrors at
  [corpus-run.mjs:256](scripts/corpus-run.mjs:256) and [:252](scripts/corpus-run.mjs:252) — and supplies
  **nothing at all** for grouping. The condition set comes from `inferRoles`
  ([BatchView.jsx:141](src/components/views/BatchView.jsx:141)) and the trigger is computed from it in
  `extractAnalysisInputs`. That is inference, not a default, and the harness performs the same inference
  from the same functions. Adding an `(assumed)` literal would invent a decision neither surface makes.
- **The "suspends" branch would have made arm A unproducible by any harness.** It does not suspend, so
  arm A on this class is an ordinary unattended batch result and needs no named subclass.

**The residual, which is real and is not what the fork asked about.** S381's *"every firing count on
those nine sheets is a lower bound"* remains true, but of a different quantity than arm A. It is a lower
bound on **the product's reach with a human at the drill-in** — which is arm-B territory. For arm A it is
exact: four tests at `N/A`, severity computed over 25 of 29, `nApplicable` 4 lower, and no click
available to change it. **The honest way to carry this into the screen is a per-sheet column recording
the pending count and the trigger arms, so a reader can see which arm-A verdicts were computed over a
short battery** — the artifact already records the trigger object at
[corpus-run.mjs:348](scripts/corpus-run.mjs:348), so this is a reporting decision, not a code one.

---

## One incidental finding, reported not fixed

**The batch drill-in's confirm runs on the wrong `dataType`.**
[BatchView.jsx:307](src/components/views/BatchView.jsx:307) builds `batchImportConfig.dataType` as
`r.dataType || 'continuous'` — but `batchResults.push`
([:211–:236](src/components/views/BatchView.jsx:211)) never sets `dataType` on `r`. It sets `assay`
([:218](src/components/views/BatchView.jsx:218)) and nothing else, while the engine ran with
`ASSAY_DATATYPE_MAP[assay]||'continuous'` ([:167](src/components/views/BatchView.jsx:167)). So `r.dataType`
is always `undefined` and the drill-in always says `'continuous'`.

Consequence: `runConfirmedGroupedTests` builds its own `dtSkip` from that value
([confirmGrouping.js:92–99](src/analysis/confirmGrouping.js:92)), so on a `cell_count` file the confirm
would run Entropy / Zipf, Column Goodness-of-Fit and Modality — all three of which the engine declined
by `dtSkip` — and `ReportView`'s swap-by-name
([ReportView.jsx:186](src/components/views/ReportView.jsx:186)) would replace those three declines with
real verdicts on count data. `ImportView` is unaffected; it passes the real `dataType`
([ImportView.jsx:589](src/components/views/ImportView.jsx:589)).

**Measured incidence on the S379 corpus: zero.** All nine pending sheets are `continuous`; the only two
non-`continuous` sheets are `ordinal`, and on `ordinal` all four are `dtSkip`ped before the pending guard
and can never pend. The path needs a `cell_count` assay *and* a firing trigger, which this corpus does
not produce. Reported here rather than fixed — this dispatch changes nothing in `src/`.

---

## Verification

- **Repo state.** Worktree `batchview-grouping-pending-6f3751`, branch
  `claude/batchview-grouping-pending-6f3751`, clean at `386778c` before this file was written. Read
  directly with `git`, not taken from the dispatch.
- **`src/` and `scripts/` read directly**, every line number checked against the file at `386778c`:
  `BatchView.jsx`, `ReportView.jsx`, `ImportView.jsx` (one grep), `ForensicsBody.jsx`,
  `GroupingConfirmCard.jsx`, `engine.js`, `groupingTrigger.js`, `confirmGrouping.js`, `coverage.js`,
  `severity.js`, `handoffModel.js`, `excel.js`, `excelExport.js` (one grep), `corpus-run.mjs`.
- **Exhaustiveness claims are greps, not recollection.** `groupingPending` across `src` + `scripts`
  (27 hits, zero in `BatchView.jsx`); `pendingResult` in `engine.js` (5 hits — one definition, four call
  sites); `confirmedGroups|confirmedLargestGroup|groupingUnassessed|confirmedResults|confirmedActive`
  across `src`.
- **Two module tables were imported and printed rather than read by eye**, because the per-test skip
  membership is the load-bearing part of Q7: `DATATYPE_SKIP` and `ASSAY_DATATYPE_MAP` from
  `src/constants/assays.js`. Nothing else in `src/` was executed — no `runFullAnalysis`, no
  `extractAnalysisInputs`, no component mounted, no test function called.
- **Artifact, opened read-only:** `corpus-out/s379-honest-run.json` in the **main checkout**
  (gitignored, absent from this worktree). 8,185,073 bytes, mtime unchanged. Never written, never
  regenerated. It supplied four things and no more: the 49/41/8 denominator split, the eight failure
  labels and reasons, the nine `structure.groupingPending` sheets with their arms, and the per-sheet
  pending-test count in Q7.
- **The Q7 per-test count keys on a prose string**, `tests[].note` matched against
  `engine.js:257`, because the artifact carries no per-test `groupingPending` marker
  (`corpus-run.mjs:287–297` writes only `name`/`flag`/`primaryP`/`evidence`/`note`). This is stated in
  Q5 and is the weakest key used anywhere in this document.
- **Manifest read as committed:** `test/probes/s379-corpus-manifest.json` — 49 entries, 12 distinct
  paths, 49 carrying `sheet`, zero carrying `conditionsHint`. Sheet ordering per workbook printed from
  the file.
- **One question is answered as unsettled**, Q8's last paragraph: whether manifest order equals workbook
  sheet order. Corroborated for C22 by `V1X-FUTURE-WORK.md:269` and by `C22 :: Info` appearing in the
  failure list; unverified for the other eleven. Settling it needs `getSheetNames` on twelve workbooks,
  which is a probe, and probes are out of scope for this dispatch.
- **Batch gate: N/A.** Nothing in `src/` changed, so there is no behaviour to hold constant and
  `node test/validate-batch.mjs` was not run. Recorded rather than skipped silently.
  `METHODOLOGY.md:505` separately notes the batch has no coverage of this path at all
  (`groupingPending` is zero across all 27 fixtures), so a run would not have exercised it either.
- **Preview: N/A.** No rendering surface; the app was not started.

---

## Register rows moved from STATUS, S392

STATUS is gitignored and has no git history, so a register row is the only copy of
whatever it holds. These bodies are moved here verbatim; the register row keeps its
claim and points at this section.

### P212 — **a grouping confirm at the batch drill-in never reaches the batch row or the export**

open, **allocated S390**. `confirmedResults` is `ReportView`-local session state at `ReportView.jsx:183` with no setter returning to `BatchView`, so after a human confirms at the drill-in (`BatchView.jsx:297`) the batch row and `generateBatchSummary()` keep the pre-confirm numbers. **One file, two surfaces, different answers, turning on a click.** The Tests column is separately 4 lower on that class: `nApplicable = ran + withheld` at `BatchView.jsx:208-209` excludes pending as its own coverage state (`coverage.js:77`), and `computeSeverity` rates over 25 of 29. **Condition-2 candidate, ruling owed and not made here.** The bar is that a surface contradicts the verdict, and whether confirming moves a verdict is unmeasured — the four grouping-guarded tests were `N/A` on all nine `groupingPending` sheets and nothing has run them. **The deciding measurement is one sheet confirmed at the drill-in with the severity read before and after.** No harness reaches it; the confirm is a click, which is why it survived. Found in the S390 read-only, `docs/shared/S390-GROUPING-PENDING-READ-ONLY.md`

# S393 — the grouping confirm's cost, read then measured

**Does confirming the grouping move the verdict, and by how much?** Arm B is pre-registered over two
gates (`ROUND2-SPECIFICITY-SCREEN.md` §8.2). On the `groupingPending` class a third decision exists,
`GroupingConfirmCard`, and the screen fixes nothing about it. `S390-GROUPING-PENDING-READ-ONLY.md`
established that the four grouping-guarded tests were `N/A` on all nine round-1 pending sheets and that
**nothing had ever run them**.

**Nothing here touches a round-2 deposit.** Every run is round-1 corpus data, which is why `ROUND2`
§6.4 does not gate it.

**`src/` untouched.** `git diff HEAD -- src scripts` is empty at every commit in this session. One file
changed: `test/probes/probe-s390-armb-spike.test.jsx`.

**Two scope lines, both from the dispatch, both held.** The measurement is at `ImportView`, not at the
batch drill-in — the drill-in carries P213 (`BatchView.jsx:307` reads a `dataType` that
`batchResults.push` never sets, so the confirm there always runs as `'continuous'`), while `ImportView`
passes the real one at `ImportView.jsx:589`. And **this does not settle P212**; see the closing section.

---

## Part 1 — four questions, answered from source

### Q1 — does `probe-s390-armb-spike.test.jsx` drive `GroupingConfirmCard` today?

**No. Before this session it never rendered the card, let alone clicked it.**

`runArm`'s signature as committed at `e663f6b`:

```js
async function runArm({ path, sheet, colRel, rowSem, log = () => {} })
```

It clicks four things: the shipped file input; the sheet-picker button; the two gate cards, located by
the product's description copy; and the run button. Then it reads the verdict and returns.

The card's three copy strings — *"Confirm this grouping and run the grouped tests"*
([GroupingConfirmCard.jsx:284](src/components/forensics/GroupingConfirmCard.jsx:284)), *"Leave these
tests unassessed"* ([:296](src/components/forensics/GroupingConfirmCard.jsx:296)) and *"The grouped
tests that compare groups are paused"* ([:149](src/components/forensics/GroupingConfirmCard.jsx:149)) —
occur in that one file and nowhere else in the tree. A `command grep` for them under `test/` returns
nothing. The weaker grep is weaker than expected: `groupingPending` does not appear in the probe file
at all, not even as rendered engine output, because the probe never reaches the DOM that carries it.

### Q2 — does the card render on the `ImportView` path?

**Yes, and `groupingPendingBase` is reachable that way. It takes one click the probe did not make.**

`ImportView.handleProceed` composes the config and hands it to `onProceed`
([ImportView.jsx:588-589](src/components/views/ImportView.jsx:588)); `App.handleProceed` runs the
analysis and sets `results` ([App.jsx:29-62](src/App.jsx:29)); `phase === "report"` renders `ReportView`
with it ([App.jsx:120-127](src/App.jsx:120)); and `groupingPendingBase` is
`baseResults.some(r => r.groupingPending)` ([ReportView.jsx:188](src/components/views/ReportView.jsx:188))
— computed from the `results` prop alone.

**`ReportView` cannot tell which surface mounted it.** Its whole prop list is
`{ results, importConfig, matrix, rowMap, onBack, onChangeFile, backLabel }`
([:174](src/components/views/ReportView.jsx:174)), and `backLabel` is read at exactly one site, the back
button's text ([:981](src/components/views/ReportView.jsx:981)). The drill-in and `ImportView` reach
`groupingPendingBase` identically.

**The click.** `GroupingConfirmCard` is mounted by `ForensicsBody`
([ForensicsBody.jsx:385-395](src/components/forensics/ForensicsBody.jsx:385)), and `ForensicsBody` is
mounted at exactly one site — [ReportView.jsx:1492](src/components/views/ReportView.jsx:1492), inside the
document branch, reached only after `mode === "qc"` ([:1295](src/components/views/ReportView.jsx:1295))
and `mode === "review"` ([:1361](src/components/views/ReportView.jsx:1361)) both fall through. **`mode`
initialises to `"qc"`** ([:222](src/components/views/ReportView.jsx:222)). So the card is on the
`ImportView` path but not in the state a bare run leaves the DOM in; reaching it needs a click on the
mode tab labelled **Forensics** ([:1005-1012](src/components/views/ReportView.jsx:1005), labels from
`MODES`, [guidance.js:6-10](src/constants/guidance.js:6)).

### Q3 — does the grouping trigger depend on `colRelationship`?

**Yes, and one-directionally.**

**The pending precondition, stated once: `!hasGroups && hasRowConds`.** With column groups present,
`condCtx.type` is `'column-grouped'` under either answer and `extractAnalysisInputs` passes an empty
candidate set; with no row conditions there is nothing to partition. Pending is reachable only in that
one state, and the two column answers then part company:

- **`replicates`** → `type = 'row-grouped'` → `condColSet = condCols` → the arms evaluate on the real
  condition set → **can pend**.
- **`conditions`**, at `matrix[0].length >= 2` → the second branch claims the file as `'column-grouped'`
  ([conditionContext.js:63-65](src/analysis/conditionContext.js:63)) → `condColSet = []`
  ([engine.js:176](src/analysis/engine.js:176)) → `computeTrigger` returns
  `attempted:false, arm1:false, arm2:false, pending:false`
  ([groupingTrigger.js:84-86](src/analysis/groupingTrigger.js:84)) → **cannot pend**.

`computeTrigger` itself takes no `colRelationship`
([groupingTrigger.js:54](src/analysis/groupingTrigger.js:54)); the dependence is entirely in what the
engine passes it. The reverse asymmetry does not exist: pending under `conditions` would need width < 2,
and at width < 2 both answers land on the same `row-grouped` branch with the same candidate set.

**The trigger is a disjunction, and this is the hinge of everything below.**

```js
const arm1 = nCondCols >= 3;
const arm2 = !usable || (Number.isFinite(median) && median <= THIN_MEDIAN);
const pending = arm1 || arm2;
```
— [groupingTrigger.js:107-109](src/analysis/groupingTrigger.js:107)

**Arm 1 tests one thing and one thing only: `nCondCols >= 3`** — three or more non-empty condition
columns merged into the grouping key, the combinatorial-merge case. It says nothing about group sizes.
**Arm 2 tests the partition**: `!usable` (fewer than 2 groups, or any group under `MIN_PER_GROUP = 3`
rows) *or* a median group size at or below `THIN_MEDIAN = 4`
([groupingTrigger.js:35-36](src/analysis/groupingTrigger.js:35),
[:97](src/analysis/groupingTrigger.js:97)). **Pending does NOT require arm 2.** A sheet with five
condition columns and forty rows per group pends on arm 1 alone.

### Q4 — the round-2 inventory's `groupingPending` field

**A boolean, one per sheet.** The emitting line is `groupingPending: !!trig.pending`
([corpus-run.mjs:456](scripts/corpus-run.mjs:456)), where `trig = condCtx.groupingTrigger`, available at
the inventory's stopping point because `extractAnalysisInputs` stamps it before any test runs.

It is **not** the trigger object. That is the *other* field of the same name, on the run path —
`groupingPending: results.find(r => r.groupingPending)?.groupingPending || null`
([corpus-run.mjs:382](scripts/corpus-run.mjs:382)) — which carries
`{arm1, arm2, condCols, nGroups, medianSize, sizes}`. **Two fields, one name, different types, different
modes.**

**Keyed per sheet.** `inventoryFile` pushes one `inventorySheet` record per workbook sheet into
`sheets[]` ([corpus-run.mjs:479-485](scripts/corpus-run.mjs:479)); a delimited file gets one
pseudo-sheet. **There is no deposit-level `groupingPending` field anywhere.** `round2-select.mjs` carries
the boolean through onto each ranked sheet ([:163](scripts/round2-select.mjs:163)) and prints it on every
ranked line ([:227](scripts/round2-select.mjs:227)).

A per-deposit count is therefore a choice the counter makes. The artifact supports **the §6.2-selected
sheet** (`rankDeposit`'s `ranked[0]`) and **any sheet in the deposit** (a `.some()` over `ranked[]`) —
and the console listing invites the second, since it prints the flag on every line. Nothing in the field
name says which a stated figure used. **No count is restated here.**

---

## Every `groupingPending` figure in the project is a `replicates` figure

Recorded as a finding, not a measurement. Nothing is recounted.

`scripts/corpus-run.mjs` hardcodes `colRelationship: 'replicates'` inside `buildAnalysisConfig`
([:246](scripts/corpus-run.mjs:246)), and the `--inventory` path calls that same builder
([:422-424](scripts/corpus-run.mjs:422)). Combined with Q3: **under the `conditions` answer the pending
set is empty at width >= 2.**

So round 1's nine, and the round-2 inventory's field, are statements about the `replicates`
configuration. They are not wrong; they are figures about one answer. For arm B the quantity is
unmeasured, and its lower bound is zero — on any deposit whose honest column answer is *"Columns measure
different things"*, the confirm decision does not exist.

---

## Part 2 — the measurement

### What was built

`runArm` gained two options, both defaulting to the old behaviour, so every existing call site is
unchanged and fires not one extra click:

```js
runArm({ path, sheet, colRel, rowSem, confirm, inspect })   // confirm: 'none' | 'confirm' | 'unassessed'
```

Both card buttons and both mode tabs are located by the product's own copy, asserting exactly one match
and throwing on 0 or 2 — the same helper discipline the gate controls already use. Severity is recovered
by inverting `VERDICT_TEXT` against the rendered `VerdictBanner`; there is no second derivation of
severity anywhere in the probe.

**The read path is the same on every run.** Severity is read off the **qc-mode** `VerdictBanner`, once
before any tab click and again after returning to qc. Runs (b) and (c) visit the Forensics tab to reach
the card and return to qc before the read; runs (a) and (d) never leave qc. `VerdictBanner` does render
in all three branches ([ReportView.jsx:1298](src/components/views/ReportView.jsx:1298),
[:1391](src/components/views/ReportView.jsx:1391),
[:1486](src/components/views/ReportView.jsx:1486)) and both things `readVerdict` matches are
mode-invariant — `v` swaps only `headline`, gated on `mode !== "full"`
([VerdictBanner.jsx:68-69](src/components/views/VerdictBanner.jsx:68)), and the count clause
([:185-196](src/components/views/VerdictBanner.jsx:185)) has no mode gate — so the read would survive
being taken in the document branch. **It is taken in qc anyway on every run: the table must not depend on
that argument holding.**

**The regression gate held.** Parts 1–4 pass unchanged, including the four-of-four validation against
S383's hand measurement on `C10 :: Exiguobacterium sp. Experiment1` (batch sev 3; replicates sev 3;
non-replicates sev 1 H=0 M=1; row semantics varied, same as the third).

### The gate answers, and what they are not

Runs (a), (b) and (c) hold both gates at `replicates` / `ordered` and vary only the confirm. **That is
arm A's configuration and it is NOT an arm-B answer set. It must not be recorded as one.** It is chosen
because it holds the gates fixed so the only moving part is the confirm — and, per Q3, because it is the
only column answer under which the measurement exists at all.

Run (d) is `conditions` / `ordered`, `confirm: 'none'` — Q3's derivation driven rather than asserted.

### The table

Seven of nine sheets drove. Severity · H/M · `cov.ran` (of 29).

| sheet | (a) none | (b) confirm | (c) unassessed | (d) conditions |
|---|---|---|---|---|
| C09 :: Sheet1 | 3 · 8/2 · 16 | **3 · 8/2 · 16** | 3 · 8/2 · 16 | 3 · 4/1 · 8 |
| C14 :: Data | 3 · 13/5 · 22 | **3 · 13/5 · 22** | 3 · 13/5 · 22 | 3 · 7/3 · 11 |
| C15 :: Data | 3 · 9/3 · 18 | **3 · 9/3 · 18** | 3 · 9/3 · 18 | 3 · 4/3 · 8 |
| C15 :: Fig. 6 | 0 · 0/0 · 4 | **0 · 0/0 · 4** | 0 · 0/0 · 4 | 0 · 0/0 · 2 |
| C20 :: Microcosm soil B | 3 · 10/3 · 18 | **3 · 10/3 · 18** | 3 · 10/3 · 18 | 3 · 7/1 · 8 |
| C22 :: Exp. OA | 3 · 8/2 · 16 | **3 · 8/2 · 16** | 3 · 8/2 · 16 | 3 · 6/0 · 8 |
| C22 :: Exp. WA | 3 · 11/3 · 16 | **3 · 11/3 · 16** | 3 · 11/3 · 16 | 3 · 7/1 · 9 |

**On all seven drivable sheets, confirming the grouping moved nothing.** Severity, HIGH count and
MODERATE count are identical across (a), (b) and (c) on every one. Declining moved nothing either.

### Seconds per run, measured

| sheet | (a) | (b) | (c) | (d) |
|---|---|---|---|---|
| C09 :: Sheet1 | 3.8 | 4.4 | 3.6 | 2.3 |
| C14 :: Data | 167.3 | 235.5 | 205.6 | 47.5 |
| C15 :: Data | 4.8 | 5.1 | 4.5 | 2.9 |
| C15 :: Fig. 6 | 1.7 | 1.5 | 1.5 | 1.5 |
| C20 :: Microcosm soil B | 240.8 | 242.0 | 240.8 | 238.1 |
| C22 :: Exp. OA | 1.8 | 2.8 | 1.6 | 1.9 |
| C22 :: Exp. WA | 2.3 | 3.8 | 2.1 | 2.4 |

### The four expectations, scored

Written before the run. A disagreeing number is a finding, not a failure to tune away.

1. **(a) and (c) identical on every sheet — HELD, 7 of 7.** Both leave the four at `N/A` and neither
   reaches `computeSeverity`'s HIGH/MODERATE counts.
2. **Severity under (b) >= severity under (a) on every sheet — UNREFUTED, 7 of 7, every one by
   equality.** No sheet where (b) is lower. **This is not a confirmation.** The prediction is about a
   ceiling that was never approached: no rise was available anywhere on this corpus, so the structural
   claim was never put in a position to fail. Recorded as unrefuted.
3. **The applicable-tests count rises by 4 from (a) to (b) — BROKE, 7 of 7. Delta 0 on every sheet.**
4. **How often (b) differs from (a) at all — 0 of 7.** No rate was predicted and none is claimed.

**Amendment 1's prediction — HELD, 7 of 7.** No test reports *"grouping unconfirmed — pending user
confirmation"* under the `conditions` answer, and the card never rendered at all (`cardSeen === false` on
every run d). Q3's derivation is driven, not merely read.

### Which field expectation 3 was scored against

**`cov.ran`**, read off §5's own sentence `{cov.ran} of {cov.total} tests completed`
([ReportView.jsx:1624](src/components/views/ReportView.jsx:1624)). That is **not** `BatchView`'s
`nApplicable = cov.ran + cov.withheld` ([BatchView.jsx:208-209](src/components/views/BatchView.jsx:208)),
and `pending` is a sixth coverage state counted in neither
([coverage.js:77](src/analysis/coverage.js:77)). The prediction was written against the `BatchView` form.

**Here the two correspond on the delta, which is what the prediction is about.** A confirm swaps only the
four grouping-held results, matched by name; §5 shows none of the four came back withheld (the withheld
cause is the P82 paired-design skip, [coverage.js:65](src/analysis/coverage.js:65)); so
`Δwithheld = 0` and `Δ(ran + withheld) = Δran = 0`. **The prediction fails against both fields
identically.** The levels differ between the two quantities; the delta does not.

### Why expectation 3 broke — the mechanism

Confirming does run the four. They then decline for a different reason, and §5 renders the same four
sentences on all seven sheets:

| test | §5's reason after the confirm |
|---|---|
| Unusual rows (Mahalanobis Row Outlier) | *No group had enough rows for this test.* |
| Distinct numbers (Entropy / Zipf) | *No group had enough observations for this test.* |
| Column Goodness-of-Fit | *Not applicable — no condition group has the 30 values this goodness-of-fit test needs to fit a distribution.* |
| Number of peaks (Modality Test) | *Not applicable — no condition group has the 50 values this modality test needs.* |

**Arm 2 is what makes the tests inapplicable once they run.** Arm 2 fires when the partition cannot
support a permutation — no usable partition, or a median group size at or below 4. That is the same
shortfall each of the four then hits on its own minimum. **The pending state and the post-confirm N/A
share a root cause**, which is why confirming buys nothing: the confirm removes the guard and the tests
walk straight into the condition the guard was announcing.

### The bound on that claim

**Confirming has no reachable consequence WHERE ARM 2 IS SET.** Per S390's table, all nine round-1
`groupingPending` sheets have arm 2 set — four of them (`C09 :: Sheet1`, `C15 :: Data`, `C22 :: Exp. WA`,
`C22 :: Exp. ST`) carry arm 1 as well, and **none carries arm 1 alone.**

Because `pending = arm1 || arm2`, **the arm-1-only case exists and is unmeasured.** A sheet with three or
more condition columns whose partition is genuinely usable — two or more groups, every group at least 3
rows, median above 4 — pends on arm 1 and would meet none of the four minimums above on confirm. On such
a sheet the four could return real verdicts and the severity could rise. **Round 1 contains no such
sheet, so this session says nothing about it.** Do not read the table above as "confirming never
matters"; read it as "confirming cannot matter on the arm-2 class, and the arm-2 class is all of round 1".

### Instrument integrity — both additions, every sheet

- **Pre-confirm severity read on (b) and (c) equals (a) on the same sheet: PASS, 14 of 14.** Had any
  failed, the confirm comparison would have been contaminated by something other than the confirm and
  the table would mean nothing.
- **The Forensics visit is inert on the non-confirm runs: PASS, 14 of 14.** Reading severity either side
  of the visit on runs (a) and (d) drives what `S390-GROUPING-PENDING-READ-ONLY.md` §3 established by
  reading — no `useEffect`, no timer, no auto-confirm, `confirmedResults` null absent a click. Driven on
  every run rather than once, since it costs nothing.

---

## Findings about the instrument `ROUND2` §8 pre-registers

These are properties of `probe-s390-armb-spike.test.jsx` as committed at `e663f6b` and named in §8 as how
arm B is executed. They were found by using it, and they are about the instrument, not about this
session's numbers.

### Finding 1 — it could not read a clean verdict, which is the outcome the screen is built to find

`readVerdict` recovers severity by matching `VERDICT_TEXT[k].sub` against the rendered banner. But
`VerdictBanner` gates the entire action one-liner on `severity > 0`
([VerdictBanner.jsx:180](src/components/views/VerdictBanner.jsx:180)), and the severity-0 branch puts its
own headline in that slot instead (composed [:86-93](src/components/views/VerdictBanner.jsx:86), rendered
[:137](src/components/views/VerdictBanner.jsx:137)). **`VERDICT_TEXT[0].sub`, "Proceed with dataset", is
never in the DOM at severity 0.** The loop falls through, `readVerdict` returns `null`, and the caller
waits until it times out.

**Round 2 is a specificity screen. Severity 0 is the outcome it exists to find.** §8's four-of-four
validation is on `C10 :: Exiguobacterium sp. Experiment1`, where every one of the four arms is severity 1
or 3 — **the validation did not cover the clean case, and could not have, on that sheet.** The first
clean round-2 deposit would have hung the probe, and the failure would have presented as "this deposit is
not drivable" rather than as "this deposit is clean".

It presented exactly that way here: `C15 :: Fig. 6` read as undrivable across four runs and is severity 0
on all four.

Fixed by matching the clean headline the product actually renders — *"No signals found"* (qc / full),
*"No unusual patterns found"* (review), *"No tests could run on this data. This report says nothing about
it."* (`cov.ran === 0`) — checked only after the sub loop, so a severity > 0 verdict always wins.

### Finding 2 — jsdom ships no `ResizeObserver`, and the Forensics tab needs one

`FindingDetailPanel` constructs a `ResizeObserver`
([FindingDetailPanel.jsx:346](src/components/forensics/FindingDetailPanel.jsx:346)). jsdom ships none, so
mounting the document branch throws straight into `AnalysisErrorBoundary` and the Forensics tab renders
nothing. S390 never met it because it never left qc mode.

This is a **second** piece of non-shipped environment plumbing beyond §8.3's `Blob.prototype.arrayBuffer`
polyfill, and is declared as such in the probe. What the stub suppresses, exactly: the observer drives one
`overflow` flag comparing scroll and client dimensions
([:334-349](src/components/forensics/FindingDetailPanel.jsx:334)) that paints a scroll affordance. The
effect calls `evalOverflow()` itself before constructing the observer, so the initial evaluation still
runs; and every layout metric in jsdom is 0, so the comparison yields false/false whether or not the
observer ever fires. Presentational either way, and §8.4 already scopes this probe out of anything about
what a reader sees.

### Finding 3 — the wait defaults, the process budget and §8's cost projection are all C10 figures

Three separate C10 assumptions, each of which read a slow sheet as a broken one:

- **`waitFor`'s 20 s default.** `C14 :: Data` and `C15 :: Data` reported "timed out waiting for the
  rendered verdict" under `replicates` and completed in seconds under `conditions`. The 20 s was reading
  "not finished" as "not drivable". Raised, and made env-overridable.
- **One process for many runs.** 36 runs in a single vitest process exhausted the V8 heap on
  `C14 :: Data` — `FATAL ERROR: Ineffective mark-compacts near heap limit`. The nine sheets were run as
  nine processes.
- **An analysis error looked like a timeout.** `App.jsx:64-66` catches an analysis throw, renders
  `Error: <message>` and falls back to import after 3 s. The probe now matches that and raises it by name.

**And §8's cost projection is a C10 figure.** §8 records *"30 deposits, arm B only: 2.9 min"*, projected
from a 5.7 s/run mean over three C10 sheets. Measured here: `C22 :: Exp. OA` at 1.6–2.8 s and
`C15 :: Fig. 6` at 1.5–1.7 s sit at or below that mean, while `C14 :: Data` needs 167–236 s and
`C20 :: Microcosm soil B` 238–242 s per run — **40 to 100 times the projection's basis** — and
a single run on `C20 :: Microcosm soil A` exceeds 41 minutes without completing. The projection is
built on a sheet from the cheap end of the corpus. **It is not a budget for round 2.**

### What was given up in the per-test read, recorded rather than implied

The first build of the per-test reader expanded every collapsed disclosure in the report to reach §3's
grouping-hold rows and the test cards' tier words. Measured cost: fine on `C09 :: Sheet1` (53 expansions,
3.7 s a run) and catastrophic on a large sheet — `C20 :: Microcosm soil A` ran 56 minutes at 80% CPU
without finishing a single run. **The reader was the cost, not the battery.** It was cut back to §5's
reason stanzas, which name every state this measurement distinguishes in the product's own words.

**The one thing lost is the per-test HIGH/MODERATE/LOW tier of a test that ran.** The banner's own H and M
counts carry that in aggregate, which is what expectations 1 and 2 are about. No per-test tier is claimed
anywhere above.

---

## Finding 4 — the shipped single-file path refuses a one-data-column sheet that `corpus-run.mjs` scores

**This is a property of `ImportView.jsx:974`, not of C22.**

`ImportView` renders the column-relationship gate card only at `sum.nDC >= 2`
([ImportView.jsx:974](src/components/views/ImportView.jsx:974)) and the entire run-button zone at the same
floor ([:1268-1269](src/components/views/ImportView.jsx:1268)). Below it the screen carries *"Assign at
least 2 data columns to proceed."* ([:936-938](src/components/views/ImportView.jsx:936)) and there is
nothing to click. **On a sheet the import view resolves to one data column, the shipped single-file path
offers no way to run an analysis at all.**

`scripts/corpus-run.mjs` does not go through `ImportView`. It builds its config directly and calls
`extractAnalysisInputs` / `runFullAnalysis`, so it analyses such a sheet and returns a verdict.

**Read off the screen, not inferred.** `C22 :: Exp. ST` is the round-1 instance: all four runs failed at
the gate cards, and the probe's failure path captured the screen text, which reads *"Assign at least 2
data columns to proceed."* — the product declining, not the probe. The sheet's headless structure in
`corpus-out/s379-honest-run.json` is `rows=93 cols=1 nCondCols=4`, consistent with what the screen showed.

**This is not extended to any round-2 position.** Whether any round-2 deposit's §6.2-selected sheet
resolves to one data column at `ImportView` is unmeasured here, and establishing it needs a screen read
per sheet, not an inventory field. That call is Nick's.

---

## What this does not settle

- **P212 is not settled.** P212 is that a grouping confirm at the batch drill-in never reaches the batch
  row or the export, because `confirmedResults` is `ReportView`-local session state
  ([ReportView.jsx:183](src/components/views/ReportView.jsx:183)) with no setter returning to
  `BatchView`. P212's own deciding measurement is at the drill-in; **this one is at `ImportView`, a
  different surface, and was not run at the drill-in at all.** What this does supply is the quantity
  P212 said was missing — whether confirming moves a verdict — on the arm-2 class, where it does not.
  Whether that answer transfers to the drill-in is not established: the drill-in carries P213, so a
  confirm there runs as `'continuous'` regardless of the sheet's real `dataType`.
- **The batch drill-in surface** was not measured, deliberately and per the dispatch.
- **Round 2.** No round-2 deposit was touched. The corpus is round-1 data throughout.
- **What a reader sees.** jsdom is not a browser. Verdicts do not depend on layout, which is why the
  probe can produce them, but nothing here says anything about display — §8.4 already scopes this out and
  Finding 2 adds a second reason to hold that line.
- **The arm-1-only case**, as set out under *The bound on that claim*.
- **Per-test verdict tiers** for tests that ran, as set out above.
- **`C20 :: Microcosm soil A`.** Not measured, on three attempts. The pre-S393 `runArm` path ran past
  14 minutes without completing a run; the nine-sheet pass reported run (a) timing out on the 600 s
  verdict wait; and a retry at a 2400 s wait produced no output in 41 minutes, **during which that
  wait never fired** — the poll's own 25 ms timer never ran, which is consistent with the battery
  holding the event loop rather than yielding, though that inference was not itself instrumented. Its
  structural twin `soil B` is identical in the artifact (204 x 17, 37 groups, same size vector) and
  completed at ~240 s a run, so the cost is data-dependent rather than shape-dependent. **Recorded as
  a bound, not a result: a single arm-B run under `replicates` exceeds 41 minutes.**
- **`C22 :: Exp. ST`.** No arm-B numbers exist for it, because the product will not run it — Finding 4.

---

## No §13 rule is written here

`ROUND2-SPECIFICITY-SCREEN.md` is Chat-owned and the confirm rule is a Chat decision this measurement
informs. **Recommendation only, and it turns on Q3 more than on the table:** on the `groupingPending`
class the confirm decision only exists under the `replicates` column answer, and where arm 2 is set it
has no reachable consequence. A rule that says "record the confirm answer and its provenance, and note
that where arm 2 fired the four tests decline on group size either way" would cost one sentence and be
true of all of round 1. A rule that treats the confirm as load-bearing needs the arm-1-only case measured
first, and round 1 cannot supply it.

---

## Verification

- **`src/` untouched, checked rather than claimed:** `git diff HEAD -- src scripts` empty. No test hook,
  nothing newly exported, no guard relaxed. The surface under measurement was not modified to be measured.
- **The no-port rule audited by grep, not by intention**, using S390's own identifier list. `setRoles`,
  `setColRelationship`, `setRowSemantics`, `setState`, `extractAnalysisInputs`, `runFullAnalysis`,
  `computeSeverity`, `inferRoles`, `detectVST`, `importConfig`, `.props`, `instance(` — plus this
  session's additions `runConfirmedGroupedTests`, `computeTrigger`, `confirmedResults`,
  `setConfirmedResults`. **Every hit is inside a comment** — the header naming them as forbidden, or a new
  comment citing a source line. **Zero in code.** Two imports from `src/`, both unchanged from S390:
  `App.jsx` and `VERDICT_TEXT`. All 16 interactions are `fireEvent.click` or `fireEvent.change`.
- **Regression gate:** parts 1–4 pass unchanged, including part 3's four-of-four against S383.
- **Not in a default lane, verified by running it:** `npx vitest run` with `ARMB` unset — 9 test files
  passed, 1 skipped, 99 tests passed, 5 skipped. The 5 skipped are this probe's, now including part 5.
- **Batch gate: N/A, recorded rather than skipped silently.** Nothing in `src/` changed, so there is no
  behaviour to hold constant. `METHODOLOGY.md:505` separately records `groupingPending` as zero across all
  27 fixtures, so a run would not exercise this path either.
- **Preview: N/A.** No rendering surface changed.
- **Corpus:** `corpus-data/` is gitignored and exists in the main checkout only; the probe resolves it
  through the git common dir. `corpus-out/s379-honest-run.json` was opened read-only and never written.

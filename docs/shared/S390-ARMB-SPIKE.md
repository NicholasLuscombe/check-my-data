# S390 — arm-B spike: can arm B be produced by mounting `ImportView`?

**Answer: arm B is a probe.** `test/probes/probe-s390-armb-spike.test.jsx`, four parts, all four
holding, and it reproduces S383's hand measurement on all four recorded arms.

Nothing in `src/` was modified. `git diff HEAD -- src scripts` is empty. The probe drives the
product's own controls and reads the product's own rendered verdict; it sets no component state, calls
no engine function, and rebuilds no config.

**ROUND2 §6.5 is the item this closes** — "how arm B is executed … still owed before the first
deposit."

**C10 is not adjudicated.** Every number below says what the tool returns under a given set of
answers. None of them says anything about whether the deposit is sound.

---

## Part 1 — mount and load

**Yes, and the whole product mounts, not just `ImportView`.**

`render(<CheckMyData />)` — the default export of [App.jsx](src/App.jsx) — brings up the import screen
with one `<input type="file">` ([ImportView.jsx:704](src/components/views/ImportView.jsx:704)). A real
`File` built from the bytes of `corpus-data/C10.xlsx` (1,799,591 bytes) goes in through
`fireEvent.change`, which is the same `onChange` a user's file dialog fires. The product then runs its
own `onFile` ([ImportView.jsx:291](src/components/views/ImportView.jsx:291)), takes the `.xlsx` branch
([:301–:316](src/components/views/ImportView.jsx:301)), dynamically imports SheetJS, calls
`getSheetNames`, finds nine sheets and renders **its own sheet picker**
([:739–:755](src/components/views/ImportView.jsx:739)) listing all nine by name. 163 ms.

### Why it mounts `App` and not `ImportView`

`ImportView` hands its config to an `onProceed` prop. The run itself lives in App.jsx's `handleProceed`
([App.jsx:29–67](src/App.jsx:29)) — the `dataColHeaders` derivation, the
`config.colRelationship||'replicates'` fallback, the `config.vstDecision !== undefined` branch, the
`runFullAnalysis` call and its nine arguments. Mounting `ImportView` alone and re-creating those eight
lines in the probe **would be a port of the run wiring**. Mounting `App` ports nothing: the product
imports the file, composes its own config at
[ImportView.jsx:588–655](src/components/views/ImportView.jsx:588), runs its own analysis, and renders
its own verdict. The probe only clicks and reads.

This is the one place the S388b precedent had to be improved on rather than copied. `s388b-harness.mjs`
hand-builds the `importConfig` — its own header comment says so — which is exactly what this dispatch
forbids.

### The one environment gap, and it is jsdom's

**`file.arrayBuffer` is not a function in jsdom 25.** `getSheetNames` calls it at
[excel.js:30](src/import/excel.js:30), so the first run failed — and it failed *through the product*,
which rendered its own error into the DOM:

```
Excel import error: file.arrayBuffer is not a function
```

That string is `ImportView`'s own ([:314](src/components/views/ImportView.jsx:314)), captured from the
rendered page rather than from a stack trace, so the diagnosis is the product's and not an inference.

**Fixed in the probe by restoring the browser behaviour jsdom omits**: `Blob.prototype.arrayBuffer`,
implemented over the `FileReader` jsdom *does* ship. This is environment plumbing — a standard browser
API that jsdom lacks — not a port: it re-implements nothing `ImportView` does, and it touches no
`src/` file. **It is declared rather than buried, because it is a real divergence between the probe's
environment and a browser**, and it is the only one the spike needed.

---

## Part 2 — drive the two controls

**Both, plus the sheet picker and the run button, by user-equivalent interaction only.** Every
interaction in the probe is a `fireEvent.click` on a product button or a `fireEvent.change` on a real
file input. Nothing else.

| what | control | what the probe does |
|---|---|---|
| sheet | picker button, labelled with the sheet name ([ImportView.jsx:747](src/components/views/ImportView.jsx:747)) | clicks the button whose text is the sheet name |
| column relationship | the **Replicates** / **Non-replicates** pair ([:984](src/components/views/ImportView.jsx:984), [:995](src/components/views/ImportView.jsx:995)) | clicks one |
| row semantics | the **Ordered** / **Arbitrary** pair ([:1043](src/components/views/ImportView.jsx:1043), [:1054](src/components/views/ImportView.jsx:1054)) | clicks one |
| start the run | the page-level button ([:1279](src/components/views/ImportView.jsx:1279)) | clicks it |

**Buttons are located by the product's own description copy, not by their titles.** "Replicates" is a
substring of "Non-replicates", so a title match would silently pick the wrong option. The description
lines are unique: *"Columns measure the same thing"* / *"Columns measure different things"* / *"Row
order carries forensic meaning"* / *"Row order is not meaningful"* ([:993](src/components/views/ImportView.jsx:993),
[:1004](src/components/views/ImportView.jsx:1004), [:1052](src/components/views/ImportView.jsx:1052),
[:1063](src/components/views/ImportView.jsx:1063)). The helper asserts exactly one match and throws on
0 or 2, so a copy change breaks the probe loudly instead of selecting the wrong arm quietly.

**Nothing needed anything other than a user-equivalent interaction.**

### The negative control, and it is the part that makes the rest mean anything

A probe that reached a verdict without the clicks mattering would be measuring a default and reporting
it as an answer. So the blocked state is asserted **before** any gate is clicked and the released state
after:

```
[p2] before any click — run button: "Select column relationship above to proceed" | disabled: true
[p2] after clicking Non-replicates — run button: "Run analyses" | disabled: false
```

Both are `expect`s, not log lines. **The click is load-bearing, demonstrated rather than assumed.**

Two further things fall out of that pair. The product **refused to run until the column question was
answered** — S381's row 20 reproduced live through the UI rather than computed from a predicate. And
answering the column question *alone* released the button, so `rowSemRequired` was already false: the
product had **auto-answered row order and blocked only on the column question** on this sheet.

### What is read back

§1's `VerdictBanner`. Its action one-liner is `VERDICT_TEXT[severity].sub`
([VerdictBanner.jsx:181](src/components/views/VerdictBanner.jsx:181)), which is mode-agnostic and 1:1
with severity, and its count clause prints *"N high-severity finding(s) and M moderate finding(s)"*
verbatim ([:185–:193](src/components/views/VerdictBanner.jsx:185)). Severity is recovered by matching
the rendered sub against [`VERDICT_TEXT`](src/analysis/narrative.js:8) — **a lookup in the same constant
the banner rendered from, not a second derivation of severity.** All three of its count branches are
read.

The batch arm is read from `BatchView`'s own results table
([BatchView.jsx:455–461](src/components/views/BatchView.jsx:455)), reached through the product's own
**Batch analysis** button and its own **Run All** button.

---

## Part 3 — validated against the hand measurement

`C10 :: Exiguobacterium sp. Experiment1`. **S383's recorded numbers beside the probe's, unadjusted.**

| arm | answers given | S383 / P186 recorded | probe produced | agree | s |
|---|---|---|---|---|---|
| 1 — batch default | none; `BatchView` asks nothing | severity 3 | **severity 3**, H=2 M=1 | ✓ | 10.6 |
| 2 — ImportView, replicates | replicates + ordered | severity 3 | **severity 3**, H=2 M=1 | ✓ | 10.7 |
| 3 — ImportView, non-replicates | non-replicates + ordered | severity 1, H=0, M=1 | **severity 1, H=0, M=1** | ✓ | 5.2 |
| 4 — arm 3, row semantics varied | non-replicates + arbitrary | same as arm 3 | **severity 1, H=0, M=1** | ✓ | 5.6 |

**Four of four. No disagreement, and nothing was adjusted to reach it** — the assertions were written
against S383's numbers before the first run of part 3, and part 3 passed on its first execution.

The probe carries two figures S383 did not record. Arms 1 and 2 are **H=2, M=1**, and arm 1's flagged
tests print, in `BatchView`'s own table cell, as *Noise Scaling With Measurement Size* (HIGH), *LOESS
Residual Analysis* (MODERATE), *Selective Noise* (HIGH). These are additions to the record, not
corrections to it.

**Arms 1 and 2 are comparable because they ran on the same sheet, and that is now measured rather than
assumed.** The picker renders `wb.SheetNames` in order
([ImportView.jsx:746](src/components/views/ImportView.jsx:746)), and it listed
`Exiguobacterium sp. Experiment1` **first of nine** — so `SheetNames[0]` is the sheet under test, which
is what `BatchView` takes ([excel.js:51](src/import/excel.js:51),
[BatchView.jsx:44](src/components/views/BatchView.jsx:44)). Part 4 then read index 2 for
`B. pumilus Experiment1` and index 7 for `B. cereus Experiment1`, matching their 3rd and 8th positions
in `test/probes/s379-corpus-manifest.json`. **For C10, manifest order is workbook sheet order** — which
closes, for this one workbook, the question `S390-GROUPING-PENDING-READ-ONLY.md` §8 left open. It says
nothing about the other eleven.

---

## Part 4 — cost, and thirty runs as a loop

**The sheet and both answers are already inputs.** `runArm({ path, sheet, colRel, rowSem })`. A
manifest drives a list of them; `ARMB_MANIFEST=<file.json>` replaces the built-in three-entry default,
so **thirty deposits are a longer list, not a longer probe.** Demonstrated on three C10 sheets, which
also shows the loop producing genuinely different answers per entry rather than repeating one:

```
[p4] deposit                                   answers              sheet   arm B                s
[p4] C10 :: Exiguobacterium sp. Experiment1    conditions/ordered   0/9     sev 1  H=0 M=1       5.5
[p4] C10 :: B. pumilus Experiment1             conditions/ordered   2/9     sev 3  H=1 M=1       5.9
[p4] C10 :: B. cereus Experiment1              replicates/ordered   7/9     sev 3  H=3 M=0       5.8
```

The `sheet` column is `index/total` in `SheetNames`, which is what **ROUND2 §7 asks to be recorded per
deposit**; the probe emits it for free because the picker already lists the workbook's sheets in order.

**Cost, measured across all seven arm-shaped runs in this spike:** 5.0 s to 10.9 s each; mean 5.7 s over
the three-sheet loop. Fixed overhead is ~1.2 s of transform and collect **once per vitest process**, not
per run. Arm A through `corpus-run.mjs` is a separate process and was not re-timed here; S379 recorded
~1 min for 49 sheets on this corpus.

**Projection: 30 deposits, arm B only, ≈ 3 min at the observed mean and ≈ 5.5 min at the observed
maximum.** With arm A alongside it, under ten minutes for the whole screen.

**Two things that projection does not cover, stated rather than smoothed:**

- **The answer changes the cost.** Non-replicates N/As the replicate-comparison tests through
  `condSkip`, so arm 3 ran in 5.2 s where arm 2 ran the fuller battery in 10.7 s **on the same sheet**.
  An arm-B answer set that leans toward `replicates` costs roughly double.
- **C10's sheets are small, and round 2's deposits are unknown.** Battery cost scales with rows —
  CLAUDE.md records 11.4 s for the 3,400-row clean fixture against 2.6 s for a 200-row one. So this is a
  floor. **The honest statement is minutes, not hours; it is not a precise number.**

---

## Predictions, scored

**P1 (moderate) — "`ImportView` mounts without any `src/` change." → HELD, and more than predicted.**
The whole of `App` mounts, which is what removes the last port. `git diff HEAD -- src scripts` is empty.

**P2 (lower) — "Both controls are drivable as a user drives them. The file input is the likeliest place
this fails." → HELD, and the prediction pointed at the right path for the wrong reason.** Both gate
controls, the sheet picker and the run button all drove first time. Something *did* fail on the file
path — but not the input, which accepted a real `File` through `fireEvent.change` immediately. It was
the workbook read one call later: jsdom's `File` has no `arrayBuffer()`. **The prediction located the
failure correctly and named the wrong mechanism.**

**P3 (moderate) — "If it runs at all it reproduces severity 1 at H = 0, M = 1 on the non-replicates
answer." → HELD, on the first execution, and on all four arms rather than only the named one.** The more
important branch of the prediction — that a disagreement would be the bigger result — did not fire.

---

## One sentence

**Arm B is a probe.**

---

## What this spike does not settle

- **jsdom is not a browser.** What is measured here is the verdict, which the engine computes and which
  does not depend on layout. Anything about what a reader *sees* — a plot, a sticky surface, a
  virtualised table — still needs the browser, and the screenshot-gate discipline is untouched.
- **`Blob.prototype.arrayBuffer` is polyfilled.** One browser API restored, declared above. Any future
  arm-B result rests on that being a faithful restoration.
- **One workbook.** Every number here is C10. The controls are the same on any file, but the shape
  filter, the sheet picker's presence, the long-format modal and the block picker are all paths this
  spike did not exercise. **A deposit that trips the long-format modal or the multi-block selector will
  need a control the probe does not yet drive** — reachable the same way, but not demonstrated.
- **C10 is not adjudicated**, and nothing above bears on whether it is sound.

---

## Verification

- **Worktree** `armb-spike`, branch `claude/armb-spike`, created from `f292b2a`. `git status --short`
  shows exactly one file, the probe.
- **`src/` untouched, checked rather than claimed:** `git diff --stat HEAD -- src scripts` is empty. No
  test hook was added, nothing private was exported, no guard was relaxed. **The surface under
  measurement was not modified to be measured.**
- **The no-port rule was audited by grep, not by intention.** `setRoles`, `setColRelationship`,
  `setRowSemantics`, `setState`, `extractAnalysisInputs`, `runFullAnalysis`, `computeSeverity`,
  `inferRoles`, `detectVST`, `importConfig`, `.props`, `instance(` — **zero hits in the probe outside
  the header comment that names them as forbidden.** Two imports from `src/`: `App.jsx` (the thing under
  measurement) and `VERDICT_TEXT` (the constant the banner rendered from, used to invert the render).
  Every interaction is a `fireEvent.click` on a product button or a `fireEvent.change` on a file input.
- **The click was proved load-bearing, not assumed** — part 2's negative control asserts the run button
  is disabled and reads "Select column relationship above to proceed" before the gate is answered, and
  enabled and reading "Run analyses" after.
- **Part 3's expectations were written against S383's recorded numbers before the first run**, and part
  3 passed on first execution. The `RECORDED` table is in the probe and any disagreement fails the test
  by name.
- **Not in a default lane, verified by running it.** The suite is `describe.skipIf(!process.env.ARMB)`.
  `npx vitest run` with `ARMB` unset: **exit 0, 9 test files passed, 1 skipped, 99 tests passed, 4
  skipped** — the 4 skipped are this probe's. It is not wired into `validate-batch.mjs` and imports
  nothing from it.
- **Real timers throughout.** The engine's Blocked-Mahalanobis loop yields on real `setTimeout`, so the
  probe polls the DOM rather than using fake timers.
- **`corpus-data/` is gitignored** (`.gitignore:61`) and exists in the main checkout only. The probe
  resolves it through `git rev-parse --path-format=absolute --git-common-dir`, which is why it runs from
  a worktree at all; `CORPUS_DIR` overrides.
- **Batch gate: N/A.** Nothing in `src/` changed, so there is no behaviour to hold constant and
  `node test/validate-batch.mjs` was not run. Recorded rather than skipped silently.
- **Preview: N/A.** No rendering surface changed.

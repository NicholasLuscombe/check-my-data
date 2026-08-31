# Round 2 — the specificity screen, pre-registered

**Fixed S387, before any deposit was acquired and before any result was seen.** The commit date on
this file is the evidence for that, which is the whole reason it exists. P193 records what happened
when condition 3 cited a pre-registration that had never been written.

**Nothing in this document moves after data arrives.** If a rule here turns out to be wrong it is
superseded in a new commit that says so, and the original stays in the record.

---

## 1 — What this instrument is for

The project has a sensitivity instrument and no specificity instrument.
`REALWORLD-CORPUS-SPEC.md` is a list of independently flagged deposits with third-party ground truth.
It is correctly built and **structurally incapable of producing a false-positive rate**. Round 2 is
not an extension of it. It is the second instrument.

**The question is not the tolerance.** `FALSE-POSITIVE-TOLERANCE.md` bounds the file verdict at under
1% for severity 2 or 3, and demonstrating that needs roughly 300 clean deposits. Thirty cannot do it,
no achievable corpus can, and **the bounds do not move.** Ship with the gap stated — decided S374 and
not reopened here.

**The question is gross malfunction.** Selective Noise fires on 25 of the 26 sheets it reaches, and
nothing in the project distinguishes that from a test that fires on everything. Thirty honestly
sampled deposits settle that either way, and either answer changes what ships.

## 2 — Two arms

P186 established at S383 that batch and ImportView return different verdicts on the same file — two
ladder steps on `C10 :: Exiguobacterium sp. Experiment1`, turning on one click, with the batch default
the accusatory one. **A single-arm screen cannot separate the tests over-firing from the default being
wrong.**

- **Arm A — the batch default.** Each deposit through `BatchView`'s loop as it ships:
  `colRelationship: 'replicates'`, `rowSemantics` from `rsSuggestion.value || 'ordered'`.
- **Arm B — answered honestly.** The same deposit with grouping and row semantics answered from the
  file's own structure, as a user at the ImportView screen would answer them.

**Arm B is the specificity measurement. Arm A minus arm B is the cost of the default.**

## 3 — Sampling rule

**Deposits are drawn without reference to any complaint — never from a flag list, a retraction notice
or a PubPeer thread.**

| | Decision | Basis |
|---|---|---|
| **Repository** | **Dryad.** | Round 1 is Dryad-sourced and all three CORPUS deposits are Dryad DOIs, so it is the one repository whose files are known to import. A repository whose deposits fail the shape filter measures the parser, not the battery. |
| **Draw** | **Enumerate by deposit date, most recent first. Take the first 30 that pass the shape filter.** | Reproducible by anyone, needs no seed, cannot be re-rolled. A random draw hides a second decision inside the seed. |
| **Window** | **Most recent as of the acquisition date. Record that date in the run log.** | Recency guarantees no overlap with round 1 and needs no exclusion list. |
| **n** | **30. Fixed.** | No deposit added after results are seen, none dropped. |
| **Arm coverage** | **All 30 get both arms.** | A subset confounds the arm comparison with which deposits received the second arm. At n = 30 the second pass is cheap. |

**Shape filter, applied before any analysis runs.** Eligibility is decided from file shape alone —
never from content, subject matter, author, journal, or anything attached to the deposit:

- imports without error (three columns minimum, per P157)
- carries a numeric matrix with replicate or condition structure

**Every rejection is recorded with its reason and its position in the enumeration.** Selection bias
enters at the rejection rule, not at the draw, and a screen whose rejections are invisible cannot be
audited.

**Per deposit, recorded before running:** DOI, deposit date, position in the enumeration, sheet used,
and the arm-B answers with the structural reason for each.

## 4 — Analysis rule

- **Primary reading — arm B file verdicts.** Report counts at each severity over 30. **No rate is
  derived from them.** Thirty deposits cannot carry a rate, and the interval's unit is the deposit,
  not the sheet.
- **Gross malfunction: more than 6 of 30 at severity 2 or 3 on arm B.** Six of thirty is twenty times
  the tolerance, and at n = 30 that many positives puts the lower confidence bound an order of
  magnitude above 1%. At or below six, the screen is consistent with S374's conclusion that this n
  cannot demonstrate the bound either way. Above six, the tool is in a different regime and something
  changes before v1.0.
- **Per-test malfunction: any single test firing on more than half the eligible deposits on arm B**,
  independent of the file verdicts. This is the Selective Noise question and it is why the screen
  exists. Report every test's firing count whether or not it crosses.
- **Default cost — arm A against arm B.** Report the count of deposits whose severity differs between
  arms and the direction of every difference. P185 predicts this is large: the replicate default is
  wrong on all 21 ungrouped real sheets measured so far.

**These deposits are unadjudicated, not honest.** Nothing here establishes that any of them is
genuine. A flag is a flag on a deposit with no known complaint, which is the quantity the screen
measures — and an honest error still counts against the tolerance.

## 5 — What this cannot settle

- **Neither tolerance bound.** Thirty deposits give a one-sided 95% upper limit near 10%.
- **The nine unavoidable rows.** Nine of P186's 25 divergences turn on a click no harness can make,
  so arm A measures the machine's defaults there by construction. Arm B is what reaches past them.
- **Whether any deposit is genuine.** The screen measures the tool, not the data.

## 6 — Rules added S390, before any deposit was acquired

**Nothing above this line changes.** §1–§5 stand as committed at `c125a97`. This section adds rules
that were missing, and it carries the same evidence the original does: the commit date, ahead of the
data. **The enumeration had not begun when this landed.**

Five things were unfixed. Four are fixed here. The fifth is named and left open, because it is about
machinery rather than about what gets analysed.

### 6.1 — What the enumeration is

**The enumeration is one recorded URL.** Build the search in the Dryad web interface, then record the
URL verbatim in the run log with the retrieval timestamp. Swapping `https://datadryad.org/` for
`https://datadryad.org/api/v2/` returns the same result set as JSON, so anyone can reproduce the list
without an account and without a seed.

**Order by the dataset's FIRST publication date, most recent first — not by the current version's
date.** Dryad keeps the DOI across revisions and dates each version separately, so a 2019 deposit
revised last week reads as recent under the version date. **Deposits get revised because somebody
complained.** Round 1 holds eight update pairs for exactly that reason. Sorting on the revision date
would pull a flag list in through the sort, which §3 forbids at the draw.

**Record the version count and every version date per deposit. No deposit is excluded for having more
than one version.** The record makes a later sensitivity read possible without a free choice being
made now.

### 6.2 — Which file, and which sheet

**One sheet per deposit enters the screen.**

- Consider every tabular file in the current version: `.xlsx`, `.xls`, `.csv`, `.tsv`. Nothing else is
  considered. A deposit carrying no file in that list is rejected and logged with that reason.
- Take every sheet in every considered file through the product's import and role inference, stopping
  at `extractAnalysisInputs`. **This is the S373 census path. No test runs and no verdict is computed
  while the sheet is being chosen.**
- **The sheet used is the one with the largest cell count — valid rows × data columns — among the
  sheets that pass the shape filter.**
- **Tie-break, in this order:** more data columns; then more valid rows; then file name ascending;
  then sheet index ascending. **C20 produced a tie in round 1 and the census called either choice
  defensible.** A defensible tie before the data is a free choice after it.
- If no sheet passes, the deposit is rejected and logged with its reason and its position.

**Stated in advance, because it has a direction:** a deposit whose largest sheet fails and whose
smaller sheet passes is eligible, and the smaller sheet is what runs. This admits deposits whose main
table is unusable. The alternative — eligibility decided on the largest sheet alone — rejects them,
and measures the parser rather than the battery.

### 6.3 — Depth

**If the first fifty positions yield fewer than ten eligible deposits, stop and report the depth
reached.** A shape filter that rejects four in five is a finding about the corpus, not a reason to
loosen the filter.

**This rule was carried in the S390 opener and was not in this document.** A stopping rule that lives
only in an opener is not pre-registered. It is now.

**There is no other stopping rule, and n = 30 does not move.**

### 6.4 — The order of the arms

**Arm-B answers are written down for a deposit before either arm runs on that deposit.** §3 says
*recorded before running* and does not say before which run. **Answering arm B after seeing arm A's
verdict makes arm B a reaction to it, and arm A minus arm B stops being the cost of the default.**

**The answers and their structural reasons are recorded when they are made and are not revised after
any run.** If an answer turns out to be wrong, log the correction with its reason; do not overwrite.

### 6.5 — Not fixed here

**How arm B is executed.** P186 was measured by hand at ImportView, four runs on one sheet. Nothing
here decides whether thirty arm-B passes are hand-run or driven by a toggle, and **S381's rule stands:
toggle, do not port — a probe adjudicating two implementations must not become a third.** This section
fixes what is analysed. It does not fix the machinery that runs it, and that decision is still owed
before the first deposit.

## 7 — Arm A's sheet, added S390, still before any deposit was acquired

**This amends §2. §6 stands as written, including its count of what it fixed** — this is a new section
rather than a sixth item inside it, so that count stays true.

**Measured at S390, `9fe30bd`.** `BatchView` as it ships calls `parseExcel(file)` with no sheet
argument, `excel.js:51` returns `SheetNames[0]`, and `BatchView.jsx:44` discards the sheet name. **The
shipped batch surface analyses the first sheet of a workbook and never records which one it took.**
§6.2 selects the largest sheet that passes the shape filter. **Those are different files.**

**Arm A is `BatchView`'s loop BODY, run on the §6.2-selected sheet. The file-open path is deliberately
not reproduced.**

Two reasons, and the first is the binding one.

- **Both arms must run on the same sheet or the comparison is confounded.** Arm A minus arm B would
  otherwise mix the cost of the default with the cost of sheet position, and the screen could not
  separate them.
- **The first sheet is not the data sheet.** Round 1's twelve workbooks carry sheets named `Metadata`,
  `Article information`, `Info` and `Column name`. Matching `BatchView`'s open path would let sheet
  order decide what the screen measures.

**What this gives up, stated rather than hidden: the screen does not measure `BatchView`'s sheet-open
behaviour at all.** If taking `SheetNames[0]` silently is itself a defect, it is a register item and
not a finding of this screen. **Do not read a clean arm A as evidence that the open path is sound.**

**Mechanism, confirmed at S390 and needing no `src/` change:** the manifest `sheet` key or `--sheet`,
both feeding `parseExcel`'s existing second parameter.

**Arm B runs on the same sheet.** At `ImportView` the sheet is a user choice, and the user answers with
the §6.2-selected sheet like every other arm-B answer.

**Record per deposit, in addition to §3's list: the selected sheet's name and its position in
`SheetNames`.** The position is what makes the discarded alternative auditable — a later reader can
ask whether first-sheet selection would have changed anything without re-running the screen.

**One instrument doubt is closed and the closure belongs here.** Arm A produced by
`scripts/corpus-run.mjs` reproduces `BatchView` on the `groupingPending` class exactly. Both surfaces
import the same four guards at `engine.js:506`, `:597`, `:604` and `:617`; `BatchView` neither
suspends on the grouping-confirm card nor supplies a default, and neither does the harness.
**S381's "every firing count on those nine is a lower bound" is a statement about the product's reach
with a human at the drill-in. It is not a statement about arm A, and it must not be read as one.**

## 8 — How arm B is executed, added S390, still before any deposit was acquired

**This closes the item §6.5 named and left open. §6 stands as written, including its count** — the
fifth thing was named there as unfixed, and it is fixed here rather than there.

**Arm B is produced by `test/probes/probe-s390-armb-spike.test.jsx`, committed at `e663f6b`.** It
mounts the product, loads the workbook through the shipped file input, picks the sheet from the
product's own picker, answers both gates by operating the product's own controls, and starts the run
the same way. It sets no state, exports nothing from `src/`, and required no `src/` change. If the
probe is later renamed or replaced, the successor is recorded here by commit.

**It is validated, not assumed.** Against S383's four hand runs on `C10 :: Exiguobacterium sp.
Experiment1`: batch default severity 3; replicates/ordered severity 3; non-replicates severity 1 at
H = 0, M = 1; row semantics varied, same as the third. **Four of four, on first execution, with the
expectations written before the run and nothing adjusted afterwards.** C10 is not adjudicated and
nothing here says it is.

**The negative control is part of the validation.** Before any click the run button reads *Select
column relationship above to proceed* and is disabled; after the column answer it reads *Run analyses*
and is enabled. The product refuses to run until answered, through the shipped UI.

### 8.1 — Deposits the probe cannot drive

**A deposit needing an interaction the probe does not perform — the long-format pivot, the block
picker, or any control not yet driven — has its arm B hand-run through the same shipped surface,
logged as hand-run with the control named. No deposit is dropped for it and n stays 30.**

**This rule is fixed now, before anyone knows which deposits trip it.** Dropping them would be a
rejection rule invented after seeing which deposits it catches, and §3's rejection log exists to stop
exactly that. Extending the probe to drive a new control is a fine optimisation and is not the rule,
because the next unfamiliar control raises the same question again.

Round 1 saw `detectBlocks(…).length > 1` on 2 of 41 sheets. **Expect this to fire. It is not a
surprise and it is not grounds to revisit anything here.**

### 8.2 — Provenance per gate

**Record, per deposit, for each of the two gates separately: `(user-set)` where the answer was given,
`(assumed)` where the product supplied it.**

On C10 the product auto-answered row order and blocked only on columns. **"Answered honestly" is
therefore not one act performed identically on every sheet**, and §3's per-deposit record — the arm-B
answers with the structural reason for each — extends by one word per gate. Without it, arm A minus
arm B cannot say which gate carried the difference.

### 8.3 — The one place arm B is not the shipped path

**jsdom's `File` has no `arrayBuffer`, so the probe restores it as a `Blob.prototype.arrayBuffer`
polyfill over jsdom's own `FileReader`. Every byte arm B analyses arrives through it.**

**Assert its inertness per deposit rather than assuming it:** `parseExcel` through the polyfill against
`parseExcel` on a buffer read directly from disk, same workbook, same sheet. **Identical, or the run
stops and the deposit is not scored.** The risk is low and low is not measured.

### 8.4 — What a clean arm B is not evidence about

**jsdom is not a browser.** Verdicts do not depend on layout, which is why the probe can produce them,
but nothing here says anything about what a reader sees. **Display defects remain outside this screen
entirely** and a clean arm B must not be cited about them.

### 8.5 — a probe's patience is not a resource limit, ruled S397 before any deposit was scored

**No wait inside the arm-B probe may expire before §17.2's 24-hour run budget does.** A probe that
gives up first manufactures a drivability finding out of a cost one.

**This is not the thing §17.2 forbids.** §17.2 forbids raising a limit so that a run succeeds where
the shipped surface would fail. A probe timeout has no counterpart on the shipped surface — a browser
has no clock that abandons an import — so aligning it restores fidelity rather than buying success.

**Why it is ruled now.** §8.1 routes *not drivable* to a hand-run. A wait expiring on a slow import
would push a cost outcome into that branch and lose it. No deposit has been scored, so the rule
cannot be fitted to which deposits it catches.

**Measured at S397, `9c1f583`.** Eleven `waitFor` sites; eight take the 20 s default and none of the
eight is overridable; three read `ARMB_TIMEOUT` at 600 s. The sheet-picker wait is one of ten, and it
is not the worst: `:511` is a *run* wait at 20 s covering four tests, and `:568` puts the entire
batch analysis under 20 s.

**One exception, named rather than left implicit.** `:557` is a view switch, not an import or a run,
and keeps a short explicit timeout. Left on the default it would hang for 24 hours on a broken button.

**The budget is printed, not merely set.** It may be overridden for development, and the probe emits
the value it is using in its run header, so no §7 figure can be taken from a run without its budget
recorded beside it.

#### 8.5.1 — the ceiling, and a timeout that lies

**Node's `setTimeout` ceiling is 2,147,483,647 ms, 24.855 days.** Above it, vitest 2.1.9 fails in
about 1 ms while reporting *Test timed out in 3110400000ms* — asserting a 36-day wait that never
happened, with the overflow warning on stderr where a log grep never sees it.

**That is a manufactured non-completion**, the exact outcome §17.3 records as real. Any block looping
over deposits refuses at the top when `arms × budget` exceeds the ceiling, rather than running.

#### 8.5.2 — one process per deposit

**Vitest isolates per file, not per test**, so splitting into one `it` per deposit satisfies the
ceiling and leaves the heap where S393 found it — 36 runs in a single process exhausted V8, and the
nine sheets were run as nine processes.

**Round 2's arm B is invoked once per deposit through `ARMB_MANIFEST`.** This satisfies the ceiling
and the heap, needs no change to the probe, and isolates a deposit that dies from the deposits that
follow it.

#### 8.5.3 — §8.5's wait tally is wrong, corrected S397 before any deposit was scored

**§8.5 reads eight sites at the 20 s default and three reading `ARMB_TIMEOUT`. That sums to eleven by
dropping a site.** At source, at `9c1f583`: **8** sites at the 20 s default, **1** hardcoded at 30 s
(`:465`), **2** reading `ARMB_TIMEOUT` across **3** invocations (`:495`, `:503`, `:526`).

**Neither the rule nor the count of eleven moves.** The error is in the split, and it under-reports
the unruled sites by one — the 30 s site was as unoverridable as the eight.

**How it was made.** The figure was taken from a prose summary rather than from the table above it,
where the 30 s site has its own row. **A count lifted from a compression and asserted as a census.**

**Nothing downstream depends on it.** `10fb958` retired all eleven: three explicit, seven by the
default, one named exception, zero hardcoded.

#### 8.5.4 — a determinate refusal is detected on sight, ruled S397 at `10fb958` before any deposit was scored

**§8.5 forbids a wait expiring before the budget. Waiting the budget out on a refusal the product has
already rendered is the same error inverted** — the screen has decided, and the probe sits in front
of the answer for 24 hours.

**The import floor's sentence is matched on sight at both import waits.** It bites the CSV path
hardest, which is where round 2 lives: on a workbook the picker resolves the first wait, but on a CSV
the first wait is the one that hangs, and **§15.1's three refusals — pos-02, pos-44, pos-47 — are all
CSVs.** Measured: four runs in 2.5 s, against roughly 30 s each by expiry and **four days** under the
budget without it.

**A refusal read on sight and a refusal read by expiry are the same outcome reached two ways, and only
one of them is affordable.** The general form: **where the product has rendered a determinate answer,
the probe reads it; the budget covers waiting, not deciding.**

#### 8.5.5 — the untick set is three deposits, and confirm cannot express it, ruled S397 at `a5a5bac`

**`runArm`'s `confirm` reaches two of the card's three buttons and none of its checkboxes**, so it can
only confirm the pre-ticked set. `GroupingConfirmCard.jsx:163-165` renders one checkbox per condition
column.

**Three deposits carry an untick, per the run log's §4: pos-08 (2 unticked), pos-31 (1), pos-40 (3).**
All three route to §8.1's hand-run. Ten of the thirteen rendering the gate are `confirmed as offered`
and drivable today.

**pos-40 is hand-run like the others.** It exhausts the heap on arm A, and a predicted failure is not
a recorded one.

**The field, if it is ever built, matches header names and not indices** — the card renders `col.name`
with a 1-based `Col N` fallback, names are what §4 records, and an index would drift silently if
`roles` moved. **Not built.**

## 9 — §6.1's ordering rule, corrected S390, still before any deposit was acquired

**This supersedes two things in §6.1: the ordering rule, and the reason given for it. §6.1's text
stays in the record, as this document's preamble requires.** Nothing has been acquired.

### 9.1 — What was measured

- The empty query returns the whole repository. **72,099** results in the interface and the same
  figure from `https://datadryad.org/api/v2/search`.
- **The listing is already ordered by date, descending, with no sort parameter.** First page runs
  2026-08-28 then 2026-08-27.
- **`publicationDate` equals `lastModificationDate` on every entry of the first page**, and
  `versionNumber` there runs 2 through 10, with `versionChanges` reading `files_changed` or
  `metadata_changed`. Only one entry in the top seventeen sits at version 1.
- **The dataset page for `doi:10.5061/dryad.d2547d8b7` — `versionNumber: 10` in the API — shows one
  published version, dated 28 August 2026.**

**So the API's `versionNumber` counts curation rounds, not published versions.** Checked on one
deposit. §6.1 instructs recording "the version count and every version date"; read against that field
it records the wrong quantity.

### 9.2 — The ordering rule, replaced

**Order by the search listing's `publicationDate`, most recent first, taking the list in the order the
recorded URL returns it.**

For a deposit with one published version that **is** its first publication date. For a deposit with
more than one, it is the most recent published version's date. **Those deposits are recorded, not
excluded** — an exclusion here would be a content-free rule with a content-shaped effect.

**Why this rather than first publication.** Ordering on first publication would need a per-dataset
versions call for every candidate, and the resulting list could not be reproduced from a URL at all.
**One recorded URL is §6.1's binding requirement**, and this rule keeps it.

### 9.3 — The reason given in §6.1 is withdrawn

§6.1 claimed deposits get revised because somebody complained, and used that to reject ordering on the
current version's date. **That claim was never checked against Dryad's versioning before it was
written.** Sixteen of the first seventeen entries sit above version 1, which is far too many for
complaint-driven revision to explain, and the one deposit opened resolves to a single published
version.

**Complaint-driven revision certainly happens. A high `versionNumber` is not evidence of it.** The
sampling rule in §3 still forbids drawing from a flag list, a retraction notice or a PubPeer thread,
and that is untouched.

### 9.4 — What to record, superseding §6.1's version instruction

**Per deposit: the number of published versions and their dates, read from the dataset page's version
history — not `versionNumber` from the API.**

## 10 — §6.2's census citation, withdrawn S391, before any deposit was analysed

**This withdraws a citation in §6.2. The rule it names is unchanged.** Same form as §9.3: the claim
stays in the record and is corrected here rather than quietly dropped.

§6.2 says the sheet is chosen by taking every sheet through import and role inference, stopping at
`extractAnalysisInputs`, and calls this **"the S373 census path."**

**There is no such path.** S373 was a display-label census — what heading, unit and frame each printed
quantity appears under, across eight rendering surfaces. It traced source fields by hand, enumerated
no sheet, called `extractAnalysisInputs` nowhere, and left no script behind.

**The stopping point stands exactly as §6.2 states it**: import and role inference, stopping at
`extractAnalysisInputs`, no test run and no verdict computed while the sheet is being chosen. That
description is self-contained and needs no citation. Only the name attached to it was wrong.

**Why this is recorded rather than edited away.** §6.2 was committed before any deposit was acquired
and its text does not move. A reader checking the pre-registration against S373 would find a mismatch
and have no way to tell whether the rule or the citation was the error.

**The machinery is new and is named here.** The per-sheet measurement §6.2 requires did not exist and
is being built as an `--inventory` mode on `corpus-run.mjs`, so that the selection path and arm A
share one implementation of the prep rather than becoming a second. S381's rule applies: toggle, do
not port. The inventory reports measurements only — **it does not implement §6.2's ranking or
tie-break**, which are applied downstream against the rule as written.

## 11 — §10 is withdrawn, S391, before any deposit was analysed

**§10 was wrong. §6.2's citation was correct as originally written and is restored.** §10's text stays
in the record, as this document's preamble requires. Nothing has been analysed.

### 11.1 — What §10 claimed, and what is true

§10 said of "the S373 census path": *there is no such path*; *S373 was a display-label census*; it
*enumerated no sheet, called `extractAnalysisInputs` nowhere, and left no script behind*; and *the
per-sheet measurement §6.2 requires did not exist*. **Every one of those is false.**

`test/probes/probe-s373-corpus-shape-census.mjs` is headed **"S373 Part A"** and states its own scope:
parse geometry and role inference for every sheet of every real-world deposit — rows and columns as
held and as parsed, which columns role inference tags, numeric data columns entering the matrix, the
grouping outcome, and the valid row count after completeness filtering. Its route is
`parseExcel → preprocessRaw → detectBlocks → detectHeaderRows → inferBaseRoles →
detectGroupAttributes → extractAnalysisInputs`, stopping before `runFullAnalysis`, with no verdict,
flag or severity computed.

**That is precisely what §6.2 describes.** The name was accurate. `scripts/round2-select.mjs` cites it
correctly at `:12` and `:30`.

`docs/shared/S373-DISPLAY-LABEL-CENSUS.md` is **S373 Part 3**, a different part of the same session,
covering headings, units and frames across eight rendering surfaces.

### 11.2 — How the error was made

Chat read the Part 3 document, saw *display-label census*, and wrote "S373 was a display-label
census" — a true statement about one part, widened into a statement about the session. The document's
own second line reads "S373 Part 3" and was not followed up.

Chat then asserted absence — *no such path*, *left no script behind*, *did not exist* — from a search
over markdown documents only. **`scripts/` and `test/probes/` were never searched.** Four other greps
were requested that day; this one was not.

Two known signatures at once: a true finding widened past its scope, and absence concluded from a
window that was never the whole search space.

**§10 was committed at `992b79f` and pushed.** `scripts/round2-select.mjs --measure` had landed at
`1ad8faa` and merged at `3dcd928`, two and a half hours earlier.

### 11.3 — What survives from §10

Two things, on corrected grounds.

- **The stopping point stands as §6.2 states it** — import and role inference, stopping at
  `extractAnalysisInputs`, no test run and no verdict computed while the sheet is being chosen. §10
  said this and it was never in doubt.
- **The inventory reports measurements and does not implement §6.2's ranking or tie-break.** This
  constraint stands. §10 called the downstream unnamed; it has a name — `rankDeposit`
  (`round2-select.mjs:486`), which implements the four-way tie-break plus `decidedBy` and tie
  detection.

### 11.4 — Disposition of `scripts/round2-select.mjs`

Its three stages get three answers. **One prep implementation remains in the round-2 path.**

- **`--fetch` is superseded by `scripts/round2-fetch.mjs`.** `--fetch` never ran: its tracked artifact
  `docs/shared/round2-raw/round2-selection.json` records the fetch aborting on HTTP 401 with no token,
  and `measure: []`, `ranking: []`. The two write different directory conventions — `R2-NN` against
  `pos-NN` — so `--measure`'s scan at `:453` cannot see the acquired corpus at all. **Two fetchers
  writing different layouts is how a corpus gets analysed twice from different bytes.**
- **`--measure` is superseded by `corpus-run.mjs --inventory`.** Its `prepStructure` is a byte-for-byte
  copy. The copy was correct under its own constraint — both files parse argv and run at load, so
  neither can be imported, and the header cites S381's 25 divergences as why copying beat
  re-deriving. **`--inventory` removes the constraint** by living inside the runner that owns the
  function. A selection measuring a different prep from the one arm A analyses is the confound §7
  exists to prevent.
- **`--rank` stays**, reading the inventory's output. It is arithmetic over the measurement and needs
  no prep. Rebuilding it would be a third implementation of the same rule.

The copied `prepStructure` is deleted with `--measure`.

### 11.5 — A duplicate Chat built

`round2-fetch.mjs` was written at S391 without checking whether a fetcher existed. It does, and had
since S390. The `R2-NN`/`pos-NN` split in 11.4 is the direct consequence.

**The duplicate is kept and the original superseded**, on the evidence: `round2-fetch.mjs` has 195
verified files behind it and `--fetch` has none. That is a disposition, not a defence — building blind
produced a divergence that had to be found by someone else reading the tree.

## 12 — The shape filter, measured S392, before any deposit was analysed

**No rule in this document changes. §3's shape filter is confirmed as written**, and this section
records what each of its clauses does against the acquired corpus. Nothing has been analysed: no test
ran, no verdict, flag or severity was computed.

**One claim held outside this document is corrected here**, in §11's form — STATUS's lead block, which
is gitignored and has no history, asserted that §3's *under three columns* corresponds to nothing the
product enforces. It does.

### 12.1 — What was measured, and over what

`corpus-out/round2-inventory.json`, produced by `corpus-run.mjs --inventory` over all 199 considered
files: **270 sheets across 39 standing deposits.** Queries over that artifact, plus one `head` on a
single CSV.
**No `src/` file was read in this pass**, so every statement below about parser behaviour is an
inference from the inventory's output or a citation of a prior measurement, not a fresh source read.

**The inventory records geometry on success only.** `rawCols` is present on 255 sheets and absent on
the 15 that failed import, all of which report the same string — `Empty after preprocessing.` — with
no shape. **A sheet that died for being narrow and a metadata sheet that died for being metadata are
indistinguishable in the artifact.** This is P157's complaint about the user-facing message,
reproduced in the instrument. It is stated, not fixed: changing the inventory now would be a selection
input altered after the corpus was in hand.

### 12.2 — "Under three columns" is enforced, and it fires once

§3's first bullet reads *imports without error (three columns minimum, per P157)*. The citation is
load-bearing and correct.

**pos-04's `band_wavelengths.csv` is two columns wide — `band,wavelength_nm`, an identifier and a
numeric measurement — and fails import.** It is that deposit's only file and only sheet. Every other
sheet in the corpus that fails to import belongs to a deposit holding a usable sheet elsewhere, so the
clause changes exactly one deposit's outcome.

**P157's scope widens on this evidence.** Its row records the floor as measured on workbook sheets
only, with *whether a two-column CSV takes the same path is unread and must not be assumed* as an
explicit limit. A two-column CSV takes the same path. `minCells = max(3, ceil(maxC × 0.1))` evaluates
to 3 on a two-column file, so every row reads sparse and the sheet returns empty. **The register row
and its open follow-on both move on this; the measurement lives here and the claim lives there.**

**Why the contrary claim was made.** The S391 read searched for column minimums in `src/` and found
them all per-test — `MAHAL_MIN_COLS`, LOESS's 30 rows, InterReplicate's 3, duplicate detection's 4 —
and concluded that nothing enforces a three-column floor. **That is true of data columns surviving
role inference and false of raw columns entering the parser.** The word carries two senses and §3
means the second, which is why it sits inside *imports without error* and cites an import-stage row.
A two-data-column matrix does run with the inapplicable tests returning `N/A`; a two-column file never
reaches them.

### 12.3 — The second bullet is a disjunction and one branch cannot fail

§3's second bullet reads *carries a numeric matrix with replicate or condition structure*. **Its two
branches are not symmetric, and this was not visible when it was written.**

- **Condition structure is measurable.** Role inference tags condition columns and the inventory
  records the count. **122 of 238 usable sheets carry at least one; 116 do not.**
- **Replicate structure is not measurable.** No column-relationship detector exists anywhere in `src/`
  or `test/`. `colRelationship` is hardcoded to `'replicates'` on every headless path, and the only
  origin of any other value is a user clicking. **The branch is satisfied by assumption on every
  sheet.**

**So the bullet's tail cannot reject a sheet that yields a numeric matrix — not because the incidence
is zero, but because one disjunct is true by construction.** The head of the bullet does the work: a
sheet either produces a numeric matrix or it does not.

**What this costs, stated rather than hidden.** Roughly half the corpus enters the screen on a
criterion nothing measures. A reader must not take §3's second bullet as evidence that replicate
structure was tested on any sheet. It was assumed, exactly as arm A assumes it, which is the thing arm
B exists to answer.

**A reading that rejects the 116 was considered and is not adopted.** Requiring a detectable condition
column drops six deposits — pos-01, pos-14, pos-45, pos-49, pos-52 and pos-56 — and yields 29
eligible. It is rejected because it deletes a disjunct §3 wrote in, and because it would reject
ordinary replicate designs, which are the screen's normal case and most of round 1. **The count it
produces is recorded so it is not re-proposed as a stricter reading; it is a misreading, not a
stricter one.**

### 12.4 — The 270 sheets, classified

| Class | Sheets | §3 clause |
|---|---|---|
| Measured, numeric matrix, at least one valid row | 238 | passes |
| Measured, imports cleanly, no numeric data column | 17 | second bullet, head |
| Failed import, geometry not recorded | 15 | first bullet, unnameable per sheet |

**All 17 in the middle class are three columns wide or more** — six at 3, and the rest spread to 13.
Their failure is shape, not width, and the column clause does not touch them.

**27 of the 32 non-usable sheets sit in deposits holding a usable sheet elsewhere** and have no
bearing on eligibility. Five do not, and those five are §3's rejection log.

### 12.5 — The four rejections

| Position | Sheets | Reason |
|---|---|---|
| pos-04 | 1 | under three columns |
| pos-09 | 1 | no numeric matrix |
| pos-19 | 2 | no numeric matrix |
| pos-29 | 1 | no numeric matrix |

**Each reason is read from the record rather than chosen.** The three *no numeric matrix* rejections
import cleanly at 9, 4, 3 and 13 columns and produce no numeric data column. pos-04's reason required
one read of the file itself, because the inventory does not record geometry on failure.

**These rows belong in `ROUND2-RUN-LOG.md` §3 with their positions**, and land there rather than here.

### 12.6 — The count

**35 deposits pass the shape filter. §3 takes the first 30 in enumeration order.**

The thirtieth is pos-51. **pos-52, pos-55, pos-56, pos-57 and pos-58 are eligible and outside n** —
surplus, not rejected, and named here so the cut is auditable rather than implicit. n = 30 does not
move and no deposit is substituted for another.

**The count was never the open question.** S391 carried three candidates — 29, 32 and 35 — with no
recorded derivation for any of them, and the third clearing the target was treated as a reason to
distrust it. The derivations resolve as: 29 is §12.3's rejected misreading; 35 is the filter as §3
writes it; 32 has no reconstruction and is recorded as unexplained. **No reading of either clause
moves a deposit across the boundary of the thirty.**

### 12.7 — What this section does not settle

- **Whether any rejection is correct as a matter of design.** pos-04 carries real data and is refused
  by an import-stage sparsity rule that was not written to be a column floor. The screen records it as
  a rejection because §3 says so; whether the product should behave that way is P157's question, not
  this document's.
- **Whether the 15 import failures include others that are narrow.** The artifact cannot say, and only
  pos-04's mattered for eligibility. **Do not read the single fire as an incidence measurement.**
- **Anything about replicate structure on any sheet.** See §12.3.
- **Runtime on the selected sheets.** pos-40 sits at position 21, inside the thirty, and carries sheets
  of 13–14 million cells. §6.2 ranks on cell count, so that is what it selects. The widest fixture the
  battery has run is 1,501 × 19, and nothing here measures the difference.

## 13 — the confirm gate, added S393, before any deposit was analysed

**No rule above this line changes.** This section adds a rule §8 did not fix and corrects two claims §8 makes. §8's text stays in the record, as this document's preamble requires. **Nothing has been analysed: no test has run on any round-2 deposit, no verdict, flag or severity has been computed.**

### 13.1 — what was not fixed

§8.2 records a provenance word for **each of the two gates**. On the `groupingPending` class the product asks a **third** question — `GroupingConfirmCard` — and this document says nothing about what arm B answers there. It is not covered by §8.1, which fixes machinery for deposits the probe cannot drive and does not fix what any answer should be.

The gate holds four tests at `N/A`, computes severity over 25 of 29, and reads four lower on the applicable count. **Arm A cannot answer it**: `BatchView`'s loop neither suspends nor supplies a value, and the confirm surface is strictly downstream of the loop that would have to wait for it (`S390-GROUPING-PENDING-READ-ONLY.md`). So on this class the arms differ in **which tests were assessed**, not only in what they flagged.

### 13.2 — what was measured, and how far it reaches

`docs/shared/S393-GROUPING-CONFIRM-COST.md`, at `1940a1f`. Seven drivable round-1 sheets, each run with the gates held at `replicates` / `ordered` and only the confirm varying.

**Confirming moved nothing on any of the seven.** Severity, H and M identical across confirm, decline and neither.

**The mechanism is a shared root.** The pending precondition is `!hasGroups && hasRowConds`. Arm 2 of the trigger is *the groups are too thin to support a permutation test*; confirm, and the four tests run and decline for that same thinness. The guard's cause is what makes the tests inapplicable once they run.

**The finding is bounded and the bound is not incidental.** `pending = arm1 || arm2` is a disjunction. Arm 1 is `nCondCols >= 3` — a structural condition, not a thinness one. All nine round-1 sheets carry arm 2 and **none carries arm 1 alone**, so the arm-1-only case is unmeasured. **On an arm-1-only sheet the groups are of ordinary size, the four tests would run for real, and confirming could move a verdict.** Three or more condition columns is an unremarkable design and round 2 may carry it.

**Do not read this section as "confirming never matters."** It matters nowhere in the arm-2 class and is untested elsewhere.

### 13.3 — the rule

**Arm B answers the confirm gate where it renders.**

- **Examine the ticked set before confirming.** The card pre-ticks every condition column (`ForensicsBody.jsx:178–182`). **That is a display default**, and confirming it unexamined is accepting a default at the third gate — the thing arm B exists to avoid at the first two. Untick any column that is not a condition column on the file's own structure, then confirm.
- **Record the ticked set as confirmed, with its structural reason**, in the same form §3 requires of the other two answers.
- **Record a third provenance word**, per §8.2's rule extended: `(user-set)` where the set was examined and answered, `(assumed)` where the pre-ticked set was accepted as offered.
- **Where the gate does not render, record that** rather than leaving the field blank. A blank cannot be told from an unanswered gate.

**Answers are not revised after any run**, per §6.4. A correction is logged with its reason.

### 13.4 — the gate has a precondition, and it is the first gate's answer

**The confirm gate exists only under the `replicates` answer.** At `conditions` with two or more data columns, `conditionContext.js:63–65` claims the sheet as column-grouped, `engine.js:176` passes an empty `condColSet`, and `computeTrigger` returns `pending: false` at `groupingTrigger.js:84–86`. Derived by source read and then driven: the card rendered on no run under the `conditions` answer.

**So the two gates §8.2 treats as parallel have a dependency running between them, and the order is fixed: the column answer first.** How many deposits reach the third gate is decided by the sitting, not by the corpus.

**Every `groupingPending` figure this project holds is a `replicates` figure by construction.** `corpus-run.mjs:246` hardcodes the answer on the headless path, and the inventory's field (`corpus-run.mjs:456`, a boolean, per sheet) inherits it. Round 1's nine and any round-2 count alike. **The arm-B count is not merely unmeasured — its lower bound is zero.** No figure taken from `corpus-out/` may be cited as the number of deposits reaching this gate.

### 13.5 — what to record per deposit, in addition to §3 and §7

- Whether the confirm gate rendered.
- If it did: the ticked set confirmed, its structural reason, and the provenance word.
- **`cov.ran` per arm.** On this class arm A and arm B can differ in coverage as well as in severity, and a severity difference cannot be separated from a coverage difference unless both are recorded. §4's *count of deposits whose severity differs between arms* is not sufficient on its own here.

### 13.6 — two corrections to §8

**§8's validation did not cover the outcome the screen exists to find.** Its four-of-four is true and was taken on a sheet where every arm is severity 1 or 3. The probe as validated **could not read a clean verdict at all**: `VerdictBanner` gates the action one-liner on `severity > 0`, so `VERDICT_TEXT[0].sub` is never in the DOM and `readVerdict` had nothing to match. Round 2 is a specificity screen and severity 0 is its expected outcome. **A clean deposit would have hung the probe while presenting as not drivable**, which §8.1 routes to a hand-run on a deposit with nothing wrong with it. Fixed at `2c53e84`.

**§8's cost projection is a C10 figure and is superseded.** *30 deposits, arm B only, ≈ 3 min* rests on a 5.7 s/run mean. Measured across the seven round-1 pending sheets: 1.5 s to over 2,460 s per run. **And cost is data-dependent, not shape-dependent** — `C20 :: Microcosm soil A` and `soil B` are the same 204 × 17 with the same group-size vector, and one completes at ~240 s while the other did not complete at 2,460 s. **The consequence reaches §12.7: timing pos-40 on a synthetic sheet of the same shape may measure nothing, and pos-40's runtime is unmeasured.**

**The probe as changed is `2c53e84`**, recorded here as §8 requires: `runArm` gained `confirm` and `inspect`, three instrument defects were fixed, and parts 1–4 including the four-of-four hold unchanged. `git diff HEAD -- src scripts` empty.

### 13.7 — what this section does not settle

- **P212**, which is about confirmed state failing to reach the batch row and the export. Untouched.
- **The arm-1-only case.** See §13.2.
- **Whether the QC branch tells a reader that four tests are paused.** The report opens in `qc` mode and the card sits behind the Forensics tab. Unread, and a register question rather than this document's.
- **Anything about round 2.** No round-2 deposit was opened, analysed or timed.

## 14 — the import floor, added S394, before any deposit was analysed

**No rule above this line changes.** This section adds a rule §8 and §13 both leave open. **Nothing has been analysed: no test has run on any round-2 deposit, no verdict, flag or severity has been computed.** And this section is written **before the screen read that would tell anyone whether the case it governs occurs** — pos-02, pos-44 and pos-47 have not been opened at the shipped surface, and the only screen read behind this rule is S393's, on a round-1 sheet.

That ordering is the point. A rule written after the read would be a rule written knowing the case exists on three named deposits, which is what §3 forbids at the rejection rule.

### 14.1 — what was not fixed

§8.1 fixes machinery for deposits **the probe cannot drive**. §13 fixes a gate the probe reaches and the document had not named. Neither fixes what arm B *is* when **the shipped surface refuses to analyse the selected sheet at all**.

§6.2 chooses the sheet on the headless census path, which stops at `extractAnalysisInputs` and consults none of the import screen's own floors. So a sheet can be selected by §6.2, scored by arm A, and refused by the surface arm B is defined as.

### 14.2 — the mechanism, and how far the reading reaches

**`ImportView.jsx:974` gates the column-relationship card, and the whole run-button zone, on `sum.nDC >= 2`.** The page reads *"Assign at least 2 data columns to proceed."* **Read off the screen at S393 on round-1 `C22 :: Exp. ST`**, not inferred from source. `corpus-run.mjs` analyses the same sheet headlessly and returns a verdict.

**Three round-2 deposits are candidates and none is established.** pos-02, pos-44 and pos-47 select a sheet ranking `n × 1` in the inventory. **That is a different quantity from the one the gate reads.** The inventory's `nNumericDataCols` and ImportView's `sum.nDC` are two computations, and the step between them is unread. **No deposit is recorded as refused on an inventory figure.** The divergence between the two surfaces is a register item and is allocated in STATUS, not here.

**`:974` is not asserted to be the only floor.** `ImportView.jsx:215` gates on the decoded `text.length` of the chosen sheet's CSV re-serialisation and can still fire on this corpus (run log §6). **The rule below governs any refusal by the shipped surface, whatever the gate**, because a rule naming one gate would need rewriting the first time a different one fired.

### 14.3 — the rule

- **A refusal is arm B's outcome, recorded as a refusal.** It is not a missing measurement and not a deposit to fix. Arm A scores the sheet, arm B has no run, and **the cost of the default on that deposit is the largest it can be.** That is a finding of the screen.
- **A refusal is established from the screen, not from the inventory.** Open the deposit's §6.2-selected sheet at the shipped surface and read what renders. One word carrying two senses is how P157 was misread; the same word carries two senses here.
- **n stays 30.** No substitution from §12.6's five surplus deposits, and none dropped.
- **No role reassignment.** Assigning an extra column to data to make the run button appear is a fourth answer the product never asks for, chosen after seeing which deposits need it. It is outside arm B by definition: arm B is the shipped surface answered honestly, and the surface is not asking this question.
- **Arm A still runs on that deposit and is recorded as normal.** The asymmetry is the measurement.
- **Where the surface refuses, the gates do not render. Record that**, per §13.3's fourth bullet extended to all three gates. A blank cannot be told from an unanswered gate.
- **A refusal is not §8.1.** §8.1 covers a probe that cannot perform an interaction the product offers. Here the product offers nothing to perform. Routing a refusal to a hand-run sends someone to reproduce by hand a screen that has already refused.

### 14.4 — how a refusal enters §4's readings

- **The denominator stays 30 and a refusal contributes nothing to any numerator.** Both of §4's malfunction readings — more than 6 of 30 at severity 2 or 3, and any test firing on more than half — are computed over 30.
- **Declared now, so it cannot be read later as tuning: this leans toward finding no malfunction.** A refused deposit cannot produce a positive.
- **Report the refusal count beside every arm-B figure.** Do not recompute any figure over "the deposits that ran". Choosing a denominator after seeing the results is the same free choice §3 exists to prevent; reporting the count lets a reader compute that reading without anyone having chosen it.
- **§4's default-cost reading gets a separate line.** *Deposits where arm A produced a verdict and arm B could not run* is counted and named on its own, and **never folded into the count of deposits whose severity differs between arms.** A difference in kind is not a difference in degree.
- **`cov.ran` per arm, per §13.5.** On a refusal arm B's entry is *no run*, which is not the same record as a run that assessed nothing.

### 14.5 — what to record per deposit, in addition to §3, §7, §13.5

- Whether the shipped surface accepted the §6.2-selected sheet.
- If it refused: the exact page text, the surface and the gate, the inventory's `nNumericDataCols` for that sheet, and any count the screen itself reports.
- **In run log §4's *Arm B run by* column: `refused (<gate>)`**, alongside the existing `probe` and `hand-run` values.
- Arm A's result, recorded as for any other deposit.

### 14.6 — the instrument must tell a refusal from a hang

**This is §13.6's shape and it is the second instance.** A probe that expects a run button and finds none does not throw. It waits, then reports the deposit as undrivable — the same presentation the clean-verdict gap produced at S393, and the same wrong route out of it.

**So on any deposit where a refusal is possible, the screen read comes first and by hand.** The probe runs that deposit only after the surface has been seen to accept it. Extending the probe to recognise the refusal text is a fine optimisation and is not the rule, for §8.1's reason.

### 14.7 — what this section does not settle

- **Whether the floor is correct as a matter of design.** Whether a one-data-column sheet should be analysable at all is P157's neighbourhood and a register question, not this document's.
- **Whether any deposit refuses.** Unread at the time of writing, on all thirty.
- **Incidence.** Three deposits are candidates on one inventory field. Nothing here says the count is three, or that it is not larger.
- **Whether the two surfaces should agree.** The screen records the divergence; it does not rule on it.
- **Anything about round 2.** No round-2 deposit has been opened, analysed or timed.

## 15 — what the screen must record about role inference, added S394, before any deposit was analysed

**No rule above this line changes.** §14's refusal rule stands exactly as written. **Nothing has been analysed: no test has run on any round-2 deposit, no verdict, flag or severity computed.** Every figure below comes from structural reads that stop before `runFullAnalysis`, or from round 1.

### 15.1 — §14.2's open step is closed, and the three candidates are established

**`nNumericDataCols` and `sum.nDC` are the same computation within a prep.** Proven at source at `engine.js:118-126` against `summary.js:4`. §14.2 calls the step between them unread; it is read. **What stays open is prep divergence**, and `S381-HARNESS-APP-DIVERGENCE.md` censuses 33 decision points of it, not the four §0.5 of the census record named.

**All three candidates refuse, established from the screen on 30 August.** pos-02, pos-44 and pos-47, each `Data cols 1` on the product's own summary panel, no column-relationship card, no run zone, page ending at section 4. Recorded as `refused (ImportView.jsx:974)` per §14.3.

**And the cause is not the deposit.** §2.8's group-attribute hold-out is the sole cause on all three: without it they carry 13, 5 and 3 data columns. **Any structural reason of the form \*this file has one measurement\* is false and must not be written.** The reason is that the product removed the others.

### 15.2 — rows reaching the tests, recorded per deposit

**`cov.ran` records how many tests ran. It does not record how much of the file they saw.** The `slices()` filter drops every group below three rows, and the cost is per-sheet and does not track the group count: `pos-44` loses 75.5% of its rows, `pos-47` 32.6%, and `pos-08` drops 103 of its 107 groups while losing almost none.

**So §13.5's record gains one field: the fraction of rows in surviving groups, per arm.** It is derivable from the partition and needs no extra run.

**A deposit reading clean on a quarter of its rows is not the same result as one reading clean on all of them, and without this field the two are indistinguishable in the record.**

### 15.3 — a sheet with no surviving group

**`pos-31 MC_Drosophila_hydei.xlsx [Males]` partitions into 486 groups, every one a singleton, and `slices()` returns none.** No group-based test can run on it.

**This is not §14's refusal.** The file imports, the gates render, the run button appears. The analysis runs and reports on whatever is not group-based.

**The rule, fixed before the sitting and before anyone sees what else it catches:**

- **The deposit runs and is recorded normally.** Zero surviving groups is an outcome, not an error.
- **`cov.ran` and the §15.2 row fraction carry it.** No separate verdict category is created.
- **It stays in the denominator of 30** and contributes to numerators only through whatever actually fired.
- **The structural reason names the partition**, so a later reader is not left to infer why coverage is low.

### 15.4 — the `conditions` answer has no coverage forecast

**Answering the column gate `conditions` claims the sheet column-grouped on 27 of the thirty and replaces row fragmentation with groups one column wide**, which is not a pair and starves every pair-based test instead.

**No round-1 sheet has a one-column group, so nothing calibrates that answer.** Where arm B's column answer comes out `conditions`, **the deposit's coverage is recorded as unforecast** rather than compared against a round-1 expectation.

**Neither answer to the column gate is the safe one**, and §8.2 treats it as a neutral two-way question. It is not.

### 15.5 — what this section does not settle

- **Whether either role mechanism should be fixed.** Both are open register items, P217 and P218, and §2.8's removal would create false positives of its own. **Not this document's question.**
- **What role inversion does to a clean deposit.** Round 1 is saturated at severity 3 and has zero fabricated-condition-only sheets. The measured direction is suppressing on every instance available, which is why the screen can run — but the clean-to-flagged transition is unmeasured on any corpus.
- **Anything about round 2.** No deposit has been analysed or timed.



## 16 — a structure neither gate expresses, added S395, before any deposit was answered and before either arm ran

**The case: a sheet whose columns carry a grouping the product does not read, so that neither answer to the column gate is true of it.** `replicates` pools the groups into one. `conditions` fabricates one level per column where the file has few.

**Found at position 1, which is where the sitting starts.** `micro_data_compiled.xlsx [1300-3]` carries three spanning band labels over fifteen data columns, in bands of five, six and four. `detectHeaderRows` returned 1, so the band row was taken as the header row, twelve of sixteen headers are `Col N` placeholders synthesised for the continuation cells, and the design survives in no role, no `condPerCol`, no `condCtx` and no inventory field. Recorded at `docs/shared/S395-POS01-STRUCTURE.md` §3 and §4.

**The band widths are unequal, and that is what rules out the pooled reading being merely imprecise.** A replicate set is equal-width by construction. Five, six and four is the file stating its own grouping in the one field that survives header collapse.

**This is neither P217 nor P218.** Neither mechanism moved a column here — the forty-row window is the whole column, and §2.8 returned at its fifty-row floor. **The structure is lost before role inference runs, at header detection.** Whether that is a defect is a register question and not this document's.

### 16.1 — the rule

**Where the file's structure carries a grouping the column gate cannot express, arm B answers `replicates`.**

Three reasons, and the first is the binding one.

- **Fabricating levels changes what the tool believes it is analysing. Pooling only costs power.** A screen that counts false positives can absorb lost power. It cannot absorb an answer that invents a factor, because every per-condition quantity downstream is then computed over groups that do not exist.
- **Fabricating levels is the failure this screen is measuring.** P217 inverts designs by building a condition level set from a misread column. Answering `conditions` here would reproduce by hand the defect the tool is being screened for.
- **`conditions` has no coverage forecast and starves pair-based tests.** §15.4: groups one column wide are not a pair, and no round-1 sheet calibrates that answer.

**The predicate is the file's structure, not the result.** The rule applies where the grouping is legible on the shipped screen and inexpressible in the gate. **Where the structure is expressible, §8.2 stands unchanged and this section does not apply.**

**No role reassignment, no header reinterpretation, no second import.** §14.3's reason holds unchanged: arm B is the shipped surface answered honestly, and the surface is not asking those questions.

### 16.2 — what to record

- **The true structure, in the structural reason** — how many groups, their widths, and the mechanism by which the product lost them.
- **That the answer is forced rather than matched.** §8.2's two provenance words do not change. The answer is `(user-set)` because a human gave it: **the provenance word records who answered, not whether a true answer was available.** Do not invent a third word for this.
- **In run log §7's Notes, the string `structure inexpressible`.** One form, greppable, so the class can be counted at the end of the sitting without anyone re-reading thirty structural reasons.

### 16.3 — a zero arm difference in this class is not evidence the default is right

**Arm A hardcodes `replicates` and this rule sends arm B to the same answer.** So on a deposit in this class the column gate contributes nothing to §4's default-cost reading, **and that is a forced agreement rather than a measured one.**

**Report the count of deposits in this class beside the default-cost figure.** §14.4's reason: a reader can then compute the reading without them, and no denominator has been chosen after seeing results.

**On pos-01 the difference survives at the other gate.** `suggestRowSemantics` returns `{value: null, reason: "user-choice"}` — the product declining to guess — and `corpus-run.mjs:246` substitutes `'ordered'` for the null. **Arm A answers where the shipped surface refuses to.**

### 16.4 — what this section does not settle

- **Whether `detectHeaderRows` should read a spanning band row.** A register question. No row is claimed here and no fix is proposed.
- **Whether this rule is right.** It is fixed before the deposit is answered so that it cannot be chosen to fit a result. That makes it auditable, not correct.
- **How common the class is.** One deposit. Nothing here forecasts the other twenty-nine, and the count is an output of the sitting rather than an input to it.
- **The `TOTAL` row**, a separate structural fact on the same sheet, recorded and unpriced.
- **Anything about a verdict.** No arm has run on any round-2 deposit.


### 16.5 — the predicate is the grouping, not the mechanism, measured S395 before any arm ran

**§16 above names spanning band labels as the case, and that is one mechanism rather than the class.** The predicate is *a grouping the column gate cannot express*. A merged header cell is one way a file writes one. **A naming scheme in the column headers is another, and over the thirty it is the more common of the two.**

**Measured, not proposed.** The structural read over all thirty is at `docs/shared/S395-ROUND2-STRUCTURE-TABLE.md`, `49351b2`. Nothing below is a verdict and no arm has run.

**The diagnostic, fixed here so the classification is a rule rather than thirty judgement calls: are the columns samples, or are they variables?**

- **Columns as samples.** Rows are features; each column is one specimen, replicate or channel; the design is written into the column names. **The grouping is in the header and the product reads none of it.**
- **Columns as variables.** Rows are observations; columns are distinct measured quantities; any grouping sits in a column the product already reads as a condition. **This is the ordinary case and §16 does not apply to it.**

**It is decidable from a header list without domain knowledge**, which is what §8.2 requires of a structural reason.

**Eight of the thirty are columns-as-samples**, by two mechanisms:

| Mechanism | Deposits |
|---|---|
| **Merged header cells** — a spanning label over blank continuation cells, lost when `detectHeaderRows` returns 1 | pos-01 (3 bands, 5/6/4) · pos-14 (four figure panels) · pos-35 (four instrument blocks) |
| **A naming scheme in the headers** — the grouping written into the column names themselves | pos-12 (`Y1B`/`Y1Q`/`Y3Q`, five each) · pos-40 (416 sample columns on a prefix scheme) · pos-45 (`200`…`700`, a wavelength sweep) · pos-08 (`Abundance:` ratio crossed with NR/R) · pos-38 (thirteen species crossed with `_c`/`_rate`) |

**There is no stem or suffix logic anywhere in `src/`** — ruled out at source at S394. So the second mechanism is not a detector failing; there is nothing to fail.

**pos-43 is not a member.** Two width-2 spans from two blank cells in an eighty-column header, with `isSparseGroupRow` false. That reads as sparse header cells rather than a design, and it is recorded as a weak case rather than counted.

**Two deposits are both at once and are recorded as mixed rather than forced into one side.** **pos-41** crosses six traits with abaxial / adaxial / mean and then carries climate variables beside them; **pos-46** crosses four compounds with two years and carries `treatment.y1`, `treatment.y2` and `group` as real condition columns. **Both also carry columns derived from their neighbours** — pos-41's `_mean`, pos-46's `d.*` — which is pos-01's `TOTAL` row spread sideways, and it is recorded and unpriced for the same reason.

### 16.6 — what 16.5 changes, and what it does not

- **No deposit's answer changes.** §16.1 rules `replicates` on the whole class and the reasons hold for both mechanisms without alteration.
- **§16.3's count covers eight, not three.** The count of deposits in this class is reported beside the default-cost figure, and the forced agreement it describes now applies to more than a quarter of the corpus.
- **§16's own text stands as written.** This is a correction logged beside it, per §6.4. Nothing above was edited.
- **Whether a naming scheme should be detected is a register question.** No row is claimed here and no fix is proposed.
- **Still nothing about a verdict.** No arm has run on any round-2 deposit.

### 16.7 — a third mixed deposit, and the header list §16.5 decided on, logged S396 before either arm ran

**pos-07 is mixed.** `data_complete.csv` is semicolon-delimited with 91 columns. Columns 0–16 are
study descriptors and climate variables. **Columns 17–86 are the years 1950 to 2019** — seventy
columns carrying one quantity across a year axis written into the header. That is pos-45's
wavelength sweep sitting beside pos-41's real variables, and it is recorded as mixed rather than
forced onto one side, for the reason §16.5 gives for the other two.

**§16.5 missed it because the header list it decided on did not contain the headers.**
`S395-ROUND2-STRUCTURE-TABLE.md` rolls up 66 of pos-07's 91 columns, listing
`Aridity_index_3_month` at 15 and `2015` at 82 with the run between them compressed to ranges. The
diagnostic is *decidable from a header list without domain knowledge*, and the list available was
25 of 91. **The classification was correct against what it read**, which is the point: a
compression is not a smaller version of the record, it is a different record.

**Five deposits carry such a roll-up** — pos-07 (66 hidden), pos-18 (139), pos-40 (408), pos-43
(62), pos-45 (94). Three are now settled:

- **pos-18 confirms as written.** All 204 headers read at source: `Cluster`, `Site`, `Type`,
  `Module`, then 200 alphabetical plant species. Columns are variables.
- **pos-43's verdict survives and its reason does not.** §16.5 rules it out on the merged-header
  mechanism — the two width-2 spans are the blank separator columns after `Side` and after `m4PW` —
  and is silent on the naming scheme, which the full list does carry: `P1L`/`P1W` upper dentition
  against `p1L`/`p1W` lower, in three anatomical blocks. On the samples-or-variables diagnostic it
  reads variables, because `P1L` and `M2W` are different quantities on one specimen rather than one
  quantity on different samples. **Not a member, for a reason §16.5 does not give.**
- **pos-40 and pos-45 are unread and are not exposed in the same direction.** Both are already
  classified as members on their naming schemes, so a hidden header can add detail and cannot
  remove them from the class.

**What this does not settle.** Whether pos-38's membership survives the same diagnostic —
thirteen species crossed with `_c`/`_rate` may be twenty-six distinct quantities rather than
thirteen samples measured twice. **Unverified**, and to be checked when pos-38 is answered.

#### 16.7.1 — what a mixed deposit records

**§16.2 requires the string `structure inexpressible` in run log §7's Notes so the class can be
counted; §16.6 says §16.3's count covers eight. Neither says what a mixed deposit does**, and
there are now three.

**Ruled: a mixed deposit carries the string and is reported as its own figure beside the eight.**
§16.3 exists to mark where the column gate's agreement is forced rather than measured, and on a
mixed deposit it is equally forced — §16.1 sends arm B to `replicates` and arm A hardcodes it.
Omitting them understates the forced-agreement count; folding them into the eight overstates a
class §16.5 deliberately kept apart. **Two figures, both reported: eight members, three mixed.**

**pos-41 and pos-46 have not been answered yet**, so nothing is being back-filled — the rule is
fixed before their rows are written, which is the only reason it can be audited.

### 16.8 — pos-38 leaves the class, and §16.3's count is ten, ruled S396 after the answers and before any arm ran

**§16.5 counts pos-38 a member on *thirteen species crossed with `_c`/`_rate`*. It is not one, and
the reason is §16.5's own definition.** The member side reads *rows are features; each column is one
specimen, replicate or channel*. **pos-38's rows are 311 capture nights** — observations — and its
columns are 26 distinct quantities recorded on each. `COTO_c` and `COTO_rate` are a count and a rate,
not one quantity on two samples.

**pos-18 is the same shape and §16.5 classifies it the other way**: 200 plant-species columns over
144 sampling events, called variables. Two sheets of one shape cannot sit on both sides of a
two-way diagnostic, and the diagnostic is the thing fixed in advance, so the classification moves
rather than the rule.

**Ruled: pos-38 is columns-as-variables. §16.5's eight members become seven.**

| | §16.5 as written | as ruled here |
|---|---|---|
| Merged header cells | pos-01, pos-14, pos-35 | unchanged |
| Naming scheme | pos-08, pos-12, pos-38, pos-40, pos-45 | **pos-38 removed** — four remain |
| Mixed | pos-41, pos-46 | **pos-07 added** at §16.7 — three |
| **Total carrying §16.2's string** | 10 | **10** |

**The total is unchanged and the composition is not**, which is why this is worth logging rather
than absorbing. Two corrections in opposite directions landed on the same number.

**No answer moves.** pos-38's column relationship is `replicates` under both readings — §16.1 rules
it for a member and the ordinary reason rules it for a variables sheet — and its run-log cell
already records the disagreement in its own text. **§16.6's *no deposit's answer changes* holds
across both this and §16.7.**

#### 16.8.1 — what §16.3 reports

**Ten deposits: pos-01, 07, 08, 12, 14, 35, 40, 41, 45, 46.** Seven members by mechanism and three
mixed. `command grep -c 'structure inexpressible'` over the run log counts occurrences rather than
deposits, because §4 and §7 both carry the string; **count distinct positions, not lines.**

**Ten of twenty-seven answered deposits, 37%, is the forced-agreement figure**, and §16.3's reason
stands: on these the column gate contributes nothing to §4's default-cost reading, because arm A
hardcodes `replicates` and §16.1 sends arm B to the same place.

#### 16.8.2 — the diagnostic covers one mechanism, not both

**§16.5's samples-or-variables question decides the naming-scheme mechanism and does not decide the
merged-header one.** pos-14's rows are nuclei and pos-35's are human subjects — observations, not
features — yet both are members, because a spanning band over blank continuation cells is a grouping
the product loses at header detection whatever the rows are. **Mechanism 1 stands on §16's original
predicate; the diagnostic added at §16.5 governs mechanism 2.** Stated because reading the
diagnostic as the whole class test would remove pos-14 and pos-35 wrongly.

#### 16.8.3 — the ordering §16.7.1 claimed did hold

**§16.7.1 fixed the mixed-deposit rule while pos-41 and pos-46 were unanswered, and both were
answered afterwards** — batches 4 and 5 of the same session, each carrying §16.2's string because
the rule already said to. That sentence now reads as history rather than as a present-tense claim,
and it is left standing because what it records is the sequence, which is the thing an auditor
checks.

#### 16.8.4 — what this section does not settle

- **Whether a naming scheme should be detected at all.** Still a register question. No row claimed.
- **Anything about a verdict.** No arm has run on any round-2 deposit.

## 17 — a deposit the machine cannot complete, added S396 after three timing runs and before any deposit was scored

**§14 makes a refusal arm B's recorded outcome. §15.3 makes an empty partition an outcome rather
than an error. Neither covers a deposit the machine cannot finish**, and the thirty contain at least
one. n is fixed at 30 by §3 and dropping a deposit for cost is not available — that would be a
selection rule changed after seeing which files are expensive.

### 17.1 — what was measured

**pos-40 does not run at all.** `13._b_Planctomycetota_asv.csv`, 33,678 × 416, 38.28 MB. Arm A at
the default Node heap: `FATAL ERROR: Reached heap limit`, 3,472 MB exhausted, process aborted at
17.6 s. **It died before the battery got going**, so this is not the same failure as a slow run.

**pos-41 is quadratic in rows.** `SNPeffect_BSLMM_allvar.csv`, 109,228 × 27. Timed on truncations
under arm A's defaults: 1,000 rows in 58.1 s and again in 63.3 s — **9% run-to-run variance, so no
single pair is worth three figures** — and 5,000 rows in 1,160 s. A five-fold increase in rows cost
19.8× the time, an exponent of **1.81 to 1.85**. Extrapolated, the full file is days rather than
hours. **A truncation is not the deposit and cost is data-dependent, so this measures the scaling
law rather than pos-41's runtime.** The law is the useful object because it generalises.

**One test carries it: §2.6b Blocked Mahalanobis, about 81%.** 63.3 s with it, and 8.8 s, 7.8 s or
12.1 s by three independent routes to N/A — `--dataType count`, `--assay genomics`, and both
overrides together leaving `dataType` continuous. **Every run without that test lands in an 8–12 s
band and the only run with it is 63 s.** The attribution is a measurement; the mechanism is not, and
`blockedMahalanobis` has not been read.

**pos-41 also errors one test rather than failing.** `Map maximum size exceeded` at
`duplicateDetection.js:759`, caught by the engine, logged, and the run continued — so that deposit
yields a verdict over 28 tests with Duplicate Detection in `classifyCoverage`'s `errored` state.
**A test that throws cannot fire, so this suppresses rather than inflates**, which is why the screen
can still read it.

**pos-32 is unmeasured.** 52,588 × 10, and it answers `ordered (assumed)` at the row gate, so it
gets no saving on either arm.

### 17.2 — the rule

- **n stays 30 and no deposit is dropped for cost.** Non-completion is an outcome, the third
  alongside §14's refusal and §15.3's empty partition.
- **No resource limit is raised, on either arm.** No `--max-old-space-size`, no engine change, no
  synthetic substitute for a real file. **A run that succeeds only because a flag was raised
  measures the flag**, and arm B is a jsdom probe standing in for a browser whose ceiling is lower
  than Node's, so a raised heap would put arm A above a limit the shipped surface cannot exceed.
- **The budget is 24 hours of wall clock per run, fixed here.** A run that exceeds it is killed and
  its elapsed time recorded. The figure is deliberately generous so that it catches genuine
  unreachability rather than mere slowness — the distinction the screen needs is *cannot* against
  *slow*, and a tight budget would blur it.
- **The budget is per run, not per deposit.** A deposit may complete on one arm and not the other,
  and that asymmetry is recorded rather than resolved.
- **Peak memory is recorded alongside elapsed time** — `/usr/bin/time -l` on macOS, whose maximum
  resident set size the shell's `time` keyword does not report. pos-40 failed on memory and pos-41
  on time; without both curves neither failure is predictable from the other.

### 17.3 — how it enters §4's reading

- **Sev reads `did not complete`** with the arm and the reason, `memory` or `budget`.
- **Counted and named on its own line, never folded in**, for §14.4's reason: a difference in kind
  is not a difference in degree.
- **No figure is recomputed over "the deposits that completed."** Choosing a denominator after
  seeing which files are expensive is the free choice §3 exists to prevent.
- **`cov.ran` reads `no run` where nothing ran**, and where a run completed with a test errored it
  reads the count that ran with the errored test named in Notes.

### 17.4 — the asymmetry is itself a reading of the default's cost

**Arm B answers `arbitrary` on pos-40 and pos-41. That routes Blocked Mahalanobis to N/A through the
shipped row-semantics gate, with no override**, and it is the test carrying 81% of the runtime.
**Arm A hardcodes `ordered` at `corpus-run.mjs:246` and pays for it.**

**So on these two deposits the cost of the default is not a verdict difference but a completion
difference** — arm A may exceed the budget where arm B does not. §4's default-cost reading has only
ever been posed as a severity comparison. **This is a second axis and it is recorded as one.**

**It does not generalise across the thirty.** pos-32 and pos-49 answer `ordered (assumed)`, so both
arms run the expensive test and neither gets the saving. The saving exists exactly where arm B
answers `arbitrary`, which is 18 of the 27 answered deposits.

### 17.5 — a declared exposure

**The timing runs printed flags for a modified pos-41 before any deposit was scored.** The 1,000-row
truncation under arm A's defaults reported severity 3, HIGH 6, MODERATE 8; the 5,000-row truncation
reported severity 3, HIGH 7, MODERATE 8; the override runs reported others. **That is information
about a truncation of pos-41, seen by the analyst.**

**It is declared here rather than left unmentioned**, because a screen whose integrity rests on
answers preceding results cannot have an unrecorded look at either.

Three things bound it. **pos-41's arm-B answers were made and committed before any timing run** —
batch 4, `16eb86a`, and the timing began afterwards. **None of these figures enters §7**, which
takes the deposit's own results and not a truncation's. **And a 1,000-row slice of a 109,228-row
file analysed under an assay override is not the deposit**, so no verdict is anticipated by it.

### 17.6 — what this section does not settle

- **The mechanism inside Blocked Mahalanobis.** Timing attributes cost; it does not explain it.
  Sliding (μ, Σ) windows with a covariance inversion at 27 columns is a plausible shape and it is a
  hypothesis. **The source is unread and no register row should state a cause from timing alone.**
- **pos-40's cause.** It died before the battery, and 416 columns give 86,320 column pairs against
  pos-41's 351. **Rows explain pos-41 and do not explain pos-40**, and the two failures should not
  be given one story.
- **pos-32's runtime**, unmeasured, and it takes the expensive test on both arms.
- **Whether the product should carry a row or width ceiling.** `ImportView.jsx:298` caps bytes at
  50 MiB, which **cannot fire anywhere on this corpus**, while the limit that actually binds is
  invisible to the user. A register question, and no row is claimed here.
- **Anything about a verdict.** No round-2 deposit has been scored on either arm.

### 17.7 — §17.1 joins two measurements that were never connected, logged S396 beside it

**§17.1 says pos-41 is quadratic in rows and that one test carries it. Both measurements stand. The
word joining them does not.**

**The exponent is a property of the whole battery**, measured at two row counts on one arm: 1,000
rows in 58.1 s and 63.3 s, 5,000 rows in 1,160 s, giving 1.81 to 1.85. **The 81% is a property of
one test at one row count** — Blocked Mahalanobis at 1,000 rows, by three independent routes to
N/A. **Blocked Mahalanobis's share at 5,000 rows was never measured**, so nothing establishes that
the test carrying the cost is the thing that scales.

**And the source reads linear.** `src/tests/blockedMahalanobis.js:476` computes
`nWin = Math.floor((N - W) / S_STRIDE) + 1` with `W = max(30, 3·nC)` and `stride = W/3`, **both
constant in N**. Line 510 sets `N_PERM = maxN <= 500 ? 4999 : 999`, and 1,000 and 5,000 rows both
sit above that threshold, so the permutation count does not change between the two timings. Windows
grow linearly, each does fixed work, and the permutation count is constant: **O(N), which predicts
5× where 19.8× was measured.**

**A third explanation is therefore likelier than either.** `EARLY_EXIT_BURN_IN = 20` with an exit
once the p-value floor is unreachable makes the permutations actually run **data-dependent**, so a
1,000-row slice may exit early where a 5,000-row slice does not. That would make the growth a
property of the data rather than of the algorithm — **which is what `C20 :: Microcosm soil A`
against `soil B` already established**, two sheets of identical shape an order of magnitude apart in
cost. Candidate, not finding: the permutation counts sit in the artifacts already written and have
not been read.

**Nothing in §17.2 depends on this.** n stays 30, no resource limit is raised, the budget is 24
hours per run, and non-completion is a recorded outcome — none of it turns on why a deposit is
expensive.

**What must not happen is a register row stating a cause.** The measurements are solid and the
mechanism is unknown; a row reading *Blocked Mahalanobis is quadratic in rows* would be false on the
source as written.

**How the error was made, because the shape recurs.** Two measurements of different quantities were
written into one sentence, and the pronoun did work the measurements did not support. That is
widening a true finding past its scope — the register's fourth signature — and it reached a
committed pre-registration section before the source was read. **The read that caught it was
prompted by the section itself**, which had recorded the mechanism as unread.

### 17.8 — the early-exit candidate is eliminated, and §17.7's own artifact claim was wrong, logged S397 before any deposit was scored

**§17.7 closes by saying the permutation counts sit in the artifacts already written. They do not.**
All four artifacts are the 1,000-row run — §17.1's gate variants at one row count. There is no
5,000-row artifact; that run was made without `--out`. The claim is corrected here rather than edited
away, and it was made from memory about what the artifacts contained.

**The counts are recoverable at 1,000 rows and they eliminate the candidate.** `N_PERM = 999` above
500 rows, so 999 is the ceiling at both 1,000 and 5,000. At 1,000 rows all 999 executed: the BH family
minimum reached exactly `ALPHA.NOTE` against a strict `>`, is monotone non-decreasing in the
permutation index, and never exceeds it over all 1,275 reachable prefixes. **`EARLY_EXIT_BURN_IN`
never fired.**

**§17.7's mechanism required more permutations at 5,000 rows than at 1,000. The 5,000-row run
executed 999 or fewer.** The candidate is eliminated in the direction it was posed.

**What this does not settle.** The growth remains unexplained; eliminating one candidate is not
evidence for another; and `C20 :: Microcosm soil A` against `soil B` is a separate case, untouched
here. **§17.7's prohibition stands: no register row states a cause.**

#### 17.8.1 — the lattice condition decides a cost path

The early exit did not fire because the statistic landed *exactly* on the threshold. P100 was stated
about verdicts; here the same exact landing decides whether a run pays for its permutations at all.
**One instance, one test, one row count, and it is not widened beyond that.**

#### 17.8.2 — §17.5's exposure extends by one line

The artifact read surfaced Blocked Mahalanobis's flag and p-value on the 1,000-row truncation, finer
than the severity and tier counts §17.5 already declared. **Same truncation, same non-deposit, and
declared rather than left in a checkpoint.**

### 17.9 — the arms may share a machine, ruled S397 before any deposit was scored

**The arms run concurrently by default. A deposit at or above 20,000 valid rows runs alone.**

The threshold is fixed here, on the S395 census's row counts, before any deposit has been scored. It
names five: pos-02, pos-32, pos-40, pos-41 and pos-44. **A threshold set after seeing which deposits
contend would be fitted to what it catches**, which is §3's hazard in a new place.

**Why the five are different in kind.** On them the elapsed time and the peak memory are the recorded
outcome (§17.2, §17.3). A figure taken while another arm held the CPU or the heap measures contention,
and a deposit killed at the budget because of a neighbour is a non-completion the machine
manufactured. On the other twenty-five, elapsed time is recorded in no §7 cell and nothing sits near a
limit.

**S397 measured the effect before ruling on it.** In a 16-arm single process a run took 246 s and in
another 396 s, both at about 5% CPU with identical output; isolated, the same runs read 3.3 s and
2.6 s. **Two orders of magnitude, entirely from sharing.**

**Where the arms did share a machine, Notes says so.** One line per deposit, so no later reader takes
a concurrent elapsed figure for a clean one.

**This changes no rule in §17.2.** n stays 30, no resource limit rises, the budget is 24 hours per run,
and non-completion stays a recorded outcome. It fixes only where a run may sit.

## 18 — §8.3's premise is false on 22 of the 30, and its assertion is scoped, ruled S397 before any deposit was scored

**§8.3 requires, per deposit, `parseExcel` through the polyfill against `parseExcel` on a buffer read
from disk — identical, or the run stops and the deposit is not scored.**

**Measured at `9c1f583`.** `ImportView.jsx:301-323` routes only `xlsx`/`xls` through `getSheetNames`,
the sole `arrayBuffer` consumer; everything else goes to `FileReader.readAsText`. **The thirty are 8
xlsx — pos-01, 08, 14, 18, 21, 27, 31, 39 — plus 21 csv and 1 tsv.**

**So §8.3's premise sentence, *every byte arm B analyses arrives through it*, is false for 22
deposits.** The polyfill is installed there and never invoked.

**Scoped.** The assertion runs on the eight and blocks scoring there. **On the other 22 it is recorded
inapplicable with its reason, not silently skipped** — a skipped check and an inapplicable one look
identical in a log.

**It does not exist yet**, neither when §8.3 was written nor at `10fb958`. It is built before any xlsx
deposit is scored. **A CSV deposit may be scored before it exists**, because on a CSV there is nothing
for it to assert.

### 18.1 — the assertion has no subject on a hand-run, ruled S398 before any deposit was scored

**§18 blocks scoring on the eight xlsx deposits until the assertion runs. Two of the eight are
hand-runs, and on those two there is nothing for it to assert.**

§20 routes pos-08, pos-31 and pos-40 to a hand-run through the shipped surface. **pos-08 and pos-31
are xlsx**; pos-40 is csv and §18 already places it among the 22.

**The polyfill is the probe's, not the product's.** §8.3 installs `Blob.prototype.arrayBuffer`
because jsdom's `File` lacks it. A hand-run is made in a browser, which supplies `File.arrayBuffer`
natively, so nothing is installed and nothing is substituted. **The assertion exists to show that the
probe's path and the shipped path agree, and a hand-run is the shipped path** — what the assertion
would establish holds by construction rather than by measurement. Recording `pass` there would record
a comparison nobody made.

**The rule.** On a hand-run the polyfill cell reads **`n/a — hand-run, no polyfill in path`**. This is
§18's own instruction applied to a second inapplicable class: recorded inapplicable with its reason,
never silently skipped and never blank. **Add the value to §4's legend**, alongside `pass` and §14.3's
`n/a — no run`.

**What this changes about the build.** §18 says the assertion is built before any xlsx deposit is
scored. **It is owed before the first probe-driven xlsx — pos-01, 14, 18, 21, 27 and 39, six
deposits.** It is not owed before pos-08 or pos-31, which §20 places first in the run order, **so the
sitting's opening moves are not held by a check that has not been written.**

**What this does not settle.** Nothing here reaches arm A, which reads from disk in Node and meets the
polyfill on no deposit. Nothing here says the assertion will pass when it is built on the six. **And
this is not a route around §18** — a probe-driven xlsx deposit is still not scored until the assertion
has run on it, and a deposit is not moved to a hand-run to avoid the check.

## 19 — pos-43 and pos-23 split into blocks, and the arms do not analyse the same rows, ruled S397 before either was scored

**Measured at `a5a5bac`.** `ImportView.jsx:758` renders the block picker on `blocks.length > 1` and
offers every block; `corpus-run.mjs:152-156` takes block 1 and offers nothing. **On pos-43 that is 452
of 892 data rows — arm A discards 440, or 49%, without a word.** Four blocks: 452, 310, 20, 110 rows,
all 80 columns. pos-23 is the only other splitter among the thirty.

**So on a splitting deposit the arms analyse different data, and arm A minus arm B is not the cost of
the two gate defaults.** It is that plus a row-set difference, and the two cannot be separated by the
subtraction §2 defines.

**Both are scored and both §7 rows stand.** Notes records the block counts and the discarded row
count, and **the §7 difference on a splitting deposit is not cited as the cost of the default** — the
quantity §2 names is not what that cell holds.

**Detected before either ran.** `detectBlocks` splits on fully blank rows; a header band spans columns
and raises nothing. **The two are unrelated and the band count predicts nothing** — pos-01, 14 and 35
carry 3, 4 and 4 bands and render no picker; pos-43 carries 2 and is the splitter.

**pos-23 is measured the same way before it is scored**, and if its arms differ in rows, this section
covers it as written.

### 19.1 — §19's pos-43 figures are the picker's display metric, corrected S397 at `d9a758e` before either deposit was scored

**§19 reads *452 of 892 data rows — arm A discards 440, or 49%* and *all 80 columns*. Both are wrong.**

**Three row counts are in play on one block of one file and they are not interchangeable.**
`blockSummary.dataRows` (`parser.js:80`) counts rows over 30% numeric — a display heuristic, and what
the picker prints. `sum.nR` is every row after the headers. `validRows` is what
`extractAnalysisInputs` returns, a row surviving if any data column is non-null. On pos-43 block 1
they read 452, 873 and 709.

**Corrected.** pos-43's four blocks are 873, 506, 32 and 182 rows at 70, 71, 71 and 69 data columns —
**not a common width**. Arm A takes block 1: **873 of 1593, discarding 720, or 45.2%**, and analyses
709 valid rows of it.

**pos-23 splits two ways at 730 rows and 4 data columns each, both opening on the same header** —
stacked tables of one schema. The three metrics coincide there because the file is dense. **Arm A
scores exactly 50.0%.**

**How the error was made.** The figures were taken from a prose summary rather than from the table
beside it, without asking which of the three metrics they were. **§19's substance is untouched:** arm
A scores block 1 and discards the rest without a word, on both deposits.

**§19's detection claim is strengthened, not weakened.** pos-23 carries **zero** bands and splits;
pos-01, 14 and 35 carry 3, 4 and 4 and do not. The band count predicts nothing in either direction.

## 20 — the three hand-runs, ruled S397 before any of them was run

**pos-08, pos-31 and pos-40 carry an untick — 2, 1 and 3 columns — and `runArm` reaches the confirm
card's buttons but none of its checkboxes.** §8.1 routes them to a hand-run through the shipped
surface, and this section fixes how.

**The operator has not seen that deposit's arm-A verdict when the hand-run is made.** §6.4 stops an
answer being a reaction to a verdict; a hand-run puts a human back in the loop and reopens the same
channel one step later. **So on these three, arm B runs first.**

**pos-40 is hand-run like the other two.** It exhausts the heap on arm A, and a predicted failure is
not a recorded one. If the browser also fails, that is the recorded outcome and it is a measurement of
the shipped surface rather than of Node.

**Recorded per deposit:** the control operated, the columns unticked by name, both gate answers as
given, the verdict, and that it was hand-run. **The untick set is read from §4 at the moment of the
run**, not from memory or from this section.

**This is a carve-out §8.1 already granted.** It is not a new exception, and it does not extend to any
deposit the probe can drive.

## 21 — arm B's information set, ruled S398 after one README was read and before any deposit was scored

**Arm B is *answered honestly*. This section fixes what an honest answer is allowed to draw on, which
§2 named and never bounded.**

Until now arm B was answered from the spreadsheet grid alone. That is not what the instrument's users
have. Of the three named audiences, the researcher owns the data and knows what every column means;
the integrity officer and the editor hold the deposit **and its documentation**. **Nobody in the target
audience infers structure from the numbers alone.** The probe does, arm A does, and arm B was built in
the same shape by omission rather than by decision.

### 21.1 — what was measured, on the deposit that raised it

**pos-08's README states the structure in the depositor's own words.** The workbooks were exported
directly from the mass spectrometry program with protein, peptide and PSM information **on multiple
levels**; converting to CSV would flatten a hierarchy the interpretation depends on; and **blank cells
do not indicate unavailable or inapplicable data**. The body lists two separate schemas for one sheet —
protein-level fields in blue cells, peptide-level fields in orange.

**The file agrees, measured.** `Protein-Peptide Info` holds 1,767 body rows: **102 protein rows, 102
identical literal sub-header rows, 1,563 peptide rows**, no blank rows, so `detectBlocks` sees one
block. Four columns are numeric in both populations and mean different quantities in each —
`Exp. q-value` over `# Proteins`, `# Unique Peptides` over `# PSMs`, and likewise `Sum PEP Score` and
`Coverage [%]`.

**§4's recorded reason for pos-08 is contradicted by the deposit's own documentation.** It reads *Rows
are proteins — `Accession`, `Description` with 1,016 distinct descriptions — the alphabetised-protein-
list case*. Column B carries **76 distinct protein descriptions on protein rows and 939 distinct
peptide sequences on peptide rows**. The 1,016 is a count taken across two populations and read as a
property of one.

**And the product's own summary reports a quantity the deposit says does not exist** — *Missing 20002*
on a file whose depositor states in writing that the blanks are structural. **On this sheet any test
keyed on missingness is measuring layout.**

### 21.2 — the rule

**Arm B's information set is the deposit as published: the data file, the deposit's README, and the
published metadata fields — abstract, methods, usage notes, keywords.**

**Arm B is still the shipped surface, answered.** The README changes what *honestly* may draw on. It
changes nothing about what the product does, which gates render, or what is analysed. **Arm A is
untouched and reads nothing** — it is the hardcoded default and that is the whole point of it.

**The arm A minus arm B difference is expected to widen, and that is the quantity being measured**, not
a distortion of it. A default's cost is measured against a user who knows what the product did not ask.

### 21.3 — all thirty, or none

**Twenty-seven answers were made without READMEs. Answering the remainder with them and counting the
two sets together is the error this screen exists to detect, committed one level up.**

So every answered deposit is re-answered with its README and metadata in view. **Every change is logged
as a §4.1 correction with its reason; nothing is overwritten** (§6.4). **Where the README contradicts a
recorded answer, the answer is corrected. Where it only adds detail, the answer stands and the reason
is enriched — and that is logged too**, because "the README changed nothing here" is a finding and a
silent row cannot express it.

**n stays 30. No deposit is dropped, re-selected or re-ranked**, and no deposit's sheet choice moves.
The re-answer pass is work, not a selection rule.

**The §3 hazard is live here and is met the same way it always is.** A reader with a document in hand
can pick the answer that produces a nicer result. **Nothing has been scored on either arm**, so no
answer can be a reaction to a verdict, and the correction log makes every change and its reason
readable afterwards.

### 21.4 — what this does not change

**The three refusals stand.** pos-02, pos-44 and pos-47 refuse at the import floor because §2.8 holds
their measurements out. **That is a product behaviour and is independent of what the user knows**, so no
README can move it. §14.3 applies unchanged, and their gate cells still read *gate did not render*.

**§16.2's `structure inexpressible` is not withdrawn.** A README that explains a structure does not give
the product a gate that can express it. On pos-08 both remain true: the structure is documented, and
neither gate answer is true of the file.

**No threshold moves.** The gross-malfunction rule is unchanged and remains arm B's alone (§17.9).

### 21.5 — the partition is in the file and the product reads none of it

**Measured on pos-08's column D: cell fill partitions the rows exactly.** 1 header, 102 protein rows at
`FFDDEBF7`, 102 sub-header rows at `FFF0CBA8`, 1,563 peptide rows at `FFFCE4D6`. **Zero disagreement
with the four classes derived from cell contents.** The file carries a complete, machine-readable
statement of its own row structure, and the import path reads no cell colour at all.

**This is a product finding and it does not move in this screen.** Changing which cells reach the
battery would change both arms and make the thirty non-comparable to the rules fixed at S387 through
S398. It is a register row and it queues.

**One file, one column.** That fill encodes level here is measured; that it does so anywhere else is
not.

### 21.6 — what this section does not settle

**Whether a README settles structure on any deposit other than pos-08.** One document was read. Thirty
exist, median 4,514 bytes, but **`methods` is non-empty on only 8 of 30**, which is a mild argument
against assuming the documentation is uniformly informative. The re-answer pass measures this rather
than assuming it.

**How many answers actually change.** Unknown, and deliberately not predicted here — a prediction made
by the person about to do the re-answering is not a measurement.

**Whether the corpus contains other master/detail exports.** pos-08 is one instance. A repeated literal
sub-header row is cheap to detect and the pass will surface others if they exist.

### 21.7 — a declared exposure on pos-01, logged S400 before any deposit was scored

**During the re-answer pass the operator ran a five-column subset of pos-01 and saw a verdict.**
`micro_data_compiled.xlsx` / `1300-3` was imported with columns A–F — the `Element` label column and
the five columns of the `Anhydrous MORB glass` band — and the battery was run. It returned Duplicated
Data HIGH at p < 0.0001 on sixteen repeated value-pairs within two rows, `Cr` and `Ni` reading zero
across the band but for one cell.

**It is neither arm, and its output is not a screen result.** Arm A is `BatchView`'s loop on all
fifteen data columns; arm B is the same sheet answered honestly. A five-column hold-out is a third
configuration. **The verdict is not recorded in §7 and may not be cited as a round-2 result.**

**What is not compromised, stated so the exposure can be priced rather than feared.**

- **No answer was made after seeing a verdict.** pos-01's answers were recorded at `75e5be6` and
  corrected at `d9c4f6e`, both before this run.
- **The re-answer reading also predates it.** Run log §4.1's C5 was reached from the deposit's README
  and the import screen, and its conclusion — that neither answer moves — was written before the
  verdict was seen.
- **Neither of pos-01's arms is hand-run.** It is one of §20's paired deposits, so both arms execute
  from the manifests. **The operator's information state cannot reach a machine-executed arm.** The
  only channel is the answers, and the answers are committed and unmoved.
- **§16.1 forecloses the one change that was in question, independently of this section.** Three bands
  of 5/6/4 are inexpressible in a gate offering replicates or conditions, so `replicates` is ruled
  whatever anyone comes to believe about the bands being experimental conditions.

**What is compromised.** §21.3's sentence — *nothing has been scored on either arm, so no answer can
be a reaction to a verdict* — is no longer true of pos-01 without this qualification. **It is true of
the other twenty-nine.**

**Ruled: pos-01's answers do not move.** If a later reading argues that they should, the change is
logged as a §4.1 correction carrying a reference to this section, so a reader can discount it.

**Scope, stated because an undeclared scope is worth nothing.** One deposit, one five-column subset,
one run. **Nothing has been run on any other deposit on either arm.**

**The observation is parked, not banked.** Duplicated Data firing on rows of structural zeros —
elements below the detection limit reported as `0` — is the kind of finding this screen exists to
produce. **It must come from an arm before it counts as one**, and the full sheet's zero count is not
this band's, so nothing here forecasts what either arm will return.

### 21.8 — a documentation sheet inside the data file is part of the information set, ruled S400 during the re-answer pass and before any deposit was scored

**Two deposits delegate their variable documentation into the workbook rather than carrying it in the
README.** pos-18's README says *the first sheet in the document, "Metadata," includes a list of the
subsequent sheets, their column names, and the information contained within.* pos-21's says *all the
units and information about the variables are included in the "Metadata" spreadsheet.* **On the README
alone both are no-change rows, and on both the documentation exists and says what the columns are.**

**Ruled: where the data file carries a documentation sheet, it is part of arm B's information set.**

Three reasons.

- **§21.2 already covers it.** The information set is *the deposit as published: the data file, the
  deposit's README, and the published metadata fields.* A sheet inside the data file is in the data
  file. Excluding it would need a rule §21.2 does not carry.
- **The shipped surface opens it.** §7 records that the product opens `SheetNames[0]` and discards the
  name. On pos-18 the Metadata sheet **is** sheet 1. **Arm B declining to read what the product puts on
  screen first is arm B pretending not to see.**
- **The audience holds it.** §21's binding argument is that the integrity officer and the editor hold
  the deposit and its documentation. A depositor who writes the variable list into sheet 1 has
  documented the deposit; where the text sits is a formatting choice.

#### 21.8.1 — what it does not license

**It does not move which sheet is analysed.** §6.2 fixed file and sheet on cell count before any
deposit was answered, and §21.3 and §22.2 both say the choice does not move. **The temptation arrives
with the documentation** — pos-18's Metadata sheet describes `Raw_Floral` at length and the analysed
`Floral_M` in one line — and it is refused for the reason it has always been refused: a sheet re-chosen
after reading is a selection rule applied having seen what it catches.

**It does not extend to a sheet's data.** The documentation sheet is read as documentation. Reading a
second sheet's *values* to infer the analysed sheet's structure is a different act and is not licensed
here.

**It does not reopen §13.3, which stays shape-only** (§4.1 C7). A documentation sheet can say what a
column means; the confirm-card rule still reads shape.

#### 21.8.2 — the cost, and it is paid rather than deferred

**Seven of the thirty are multi-sheet: pos-01, 08, 14, 18, 21, 31, 39.** pos-01's and pos-08's READMEs
document every sheet in the workbook themselves, so neither is likely to hold documentation the pass
has not seen. **pos-14 was re-answered before this rule and its workbook was not checked for a
documentation sheet**, so it carries an owed check, recorded in run log §4.1 rather than left implicit.
pos-31 and pos-39 are unread and the check is part of reading them.

**A deposit whose workbook has no documentation sheet records that it has none**, on §14.3's principle:
a blank cannot be told from a check nobody ran.

#### 21.8.3 — what this section does not settle

**Whether any deposit's documentation sheet contradicts a recorded answer.** Two have been read and
neither did. **The rule is fixed here so that it cannot be chosen to fit a result**, which makes it
auditable rather than correct.

**Whether the same applies to a documentation file that is neither the README nor the data file** — a
separate `variables.txt`, say. No deposit in the thirty has raised it and nothing is ruled about it.

### 21.9 — a documentation file that is not the data file, ruled S401 before any deposit was scored

**pos-41 raises what §21.8.3 recorded as unraised.** Its README's first entry is *Legend with the
complete list of trait and environmental variables with descriptions, symbols, and units
(legend.csv)*, and its entry for the analysed file is one line. The definitions exist, they are in the
deposit, and they are in neither the README, the published metadata fields, nor the analysed data
file. Run log §4.1 C26.

**§21.8.3's second paragraph is superseded rather than edited**, on the pattern §11 set for §10. It
says no deposit in the thirty has raised it. One has.

**Ruled: a file in the deposit whose content is documentation of the analysed file's variables is part
of arm B's information set.**

**Two of §21.8's three reasons do not carry, and the ruling is written as an extension rather than a
reading because of it.**

- **§21.2 does not already cover it.** §21.8's first reason was that a sheet inside the data file is
  in the data file. A sibling CSV is not the data file, not the README and not a published metadata
  field. **This widens §21.2's enumeration and says so.**
- **The shipped surface does not open it.** §21.8's second reason was that the product opens
  `SheetNames[0]` and puts the documentation on screen first, so arm B declining it would be arm B
  pretending not to see. The product never opens `legend.csv`. **Nothing was shown and nothing is
  being ignored.**
- **The audience holds it, and this reason carries alone.** §21's binding argument is that the
  integrity officer and the editor hold the deposit and its documentation. A depositor who writes the
  variable list into a sibling file has documented the deposit. §21.8 already ruled that where the
  text sits is a formatting choice; **a file boundary is that same choice one step out.**

**What decides it is the alternative.** Ruling it out makes the information set turn on whether the
depositor used a tab or a separate file. pos-18's legend is a tab and is in; pos-41's is a file and
would be out; both depositors documented their variables. **One surviving reason that goes to the
rule's purpose beats two that go to its mechanics**, and a rule that splits two equally documented
deposits on file format cannot be defended to a reader.

#### 21.9.1 — what it does not license

**It does not move which file or sheet is analysed.** §6.2 fixed file and sheet on cell count before
any deposit was answered. **The temptation is larger here than in §21.8.1**, because a sibling file
can itself be a data file — `legend.csv` is a table — and it is refused for the reason it has always
been refused: a file re-chosen after reading is a selection rule applied having seen what it catches.

**It does not extend to another file's values.** A documentation file is read as documentation.
Reading a sibling file's *data* to infer the analysed file's structure is a different act and is not
licensed here, exactly as §21.8.1 refuses it for a second sheet.

**It reaches only a file the README itself names.** The information set is the deposit as published,
and what a deposit publishes about itself includes its own file list. **Browsing the deposit for a
file the documentation does not mention is discretion exercised after seeing what is there**, which
is what §3 exists to refuse.

**It does not reopen §13.3, which stays shape-only.** A documentation file can say what a column
means; the confirm-card rule still reads shape.

#### 21.9.2 — the cost, and it is higher than §21.8's

**§21.8 could name its class from a column that already existed.** §7 records sheet position and sheet
count, so *seven of the thirty are multi-sheet* was a read of the record rather than new work.
**There is no equivalent column for sibling files.** §6.2 recorded the file selected, not the files
present. **So the class has to be built: a read of all thirty READMEs' own file lists, recording for
each whether a documentation file is named.**

**§21.3 binds and the census is all thirty or none.** A rule applied to the deposits somebody happened
to notice is the error this screen exists to detect, committed one level up.

**A deposit whose README names no documentation file records that it names none**, on §14.3's
principle: a blank cannot be told from a check nobody ran.

**The pass cannot be assumed to have done this already.** All thirty READMEs were read, but they were
read for structure. pos-41's legend was caught because it was the README's first entry, not because
anyone was reading file lists. **Nobody looked systematically, and a record produced by a different
question does not answer this one.**

**Two checks §21.8.2 left as a likelihood.** It disposes of pos-01 and pos-08 on the ground that their
READMEs document every sheet themselves, so neither is *likely* to hold documentation the pass has
not seen. **Its own next rule requires a deposit with no documentation sheet to record that it has
none.** A likelihood is not a recorded none, and pos-01 has six unexamined sheets behind one. Both
cells are owed and both reads combine with this section's census.

**pos-41's answers do not turn on this ruling.** C26 records the classification as confirmed by the
header text alone. **The cost is paid to make the rule uniform, not to move an answer**, and no answer
may move on a document read after this section was written without a §4.1 correction citing it.

#### 21.9.3 — what this section does not settle

**Whether any deposit's documentation file contradicts a recorded answer.** One has been raised and it
did not. **The rule is fixed before the census runs**, so it cannot be chosen to fit what the census
finds — auditable rather than correct, on §21.8.3's terms.

**What happens where a documentation file and a README disagree.** No instance exists and nothing is
ruled about it.

**Whether any other file in a deposit is in the information set** — a second data table, a script, a
figure. Nothing here reaches them and nothing is ruled about them.

#### 21.9.4 — the census, run S401, and one boundary it forced

**Run over the thirty READMEs, reading each deposit's own file list rather than its directory.
Two members.**

- **pos-41** — `legend.csv`, *Legend with the complete list of trait and environmental variables with
  descriptions, symbols, and units*. The deposit that raised the rule.
- **pos-47** — `seed-density-metadata.csv`, *Data dictionary describing every variable in
  `seed-density.csv`, including data type, units, allowable values, and variable definitions*, and
  `seed-density.csv` is the analysed file. **Found by the census and not by anything before it.**

**Twenty-eight name none, and that is recorded rather than left blank**, on §14.3's principle.

**Four were considered and rejected, each with its reason, because a rejection nobody can see is not
auditable.**

- **pos-43** — `OMG_sample_metadata_Isoodon__with_skin_priorities.csv` holds *the metadata for all
  molecular samples*, which is a table about specimens rather than a dictionary for the analysed
  file. **A file named `metadata` is not thereby documentation of the analysed file's variables.**
- **pos-28** and **pos-50** delegate to the manuscript and to a GitHub repository. Neither is a file
  in the deposit.
- **pos-43** also carries its abbreviations inside the README, which §21.2 already covers.

**The boundary the census forced: a documentation file outside the deposit is not in the information
set.** pos-02's README states that an external formation-level stratigraphic reference *is not
included in this deposit and must be obtained* elsewhere. **§21.2's information set is the deposit as
published**, so a file the reader would have to go and get is outside it, whoever names it. §21.9.3
listed a second data table, a script and a figure as unreached; **it did not name this case and now
does.**

**pos-47 is one of the three §2.8 refusals and its refusal is untouched** (§21.4). Whether its data
dictionary enriches the recorded reason is a run log question and is logged there if it does.

### 21.10 — a rule cited before it was committed, recorded S401 before any deposit was scored

**§21.8 was applied in the run log one commit before it existed in this document.** `df5356f` — run log
§4.1 C11–C15, batch 2 of the re-answer pass — added four lines citing §21.8 and §21.8.1: one in
pos-14's owed-check paragraph, two in pos-18's entry, one in pos-21's. **§21.8 is absent from this
document at that tree.** It landed at `c13e5d7`, the next commit but one.

**What is not compromised, stated so the exposure can be priced rather than feared.**

- **Nothing had been scored, so there was no result the rule could be chosen to fit.** §21.8.3's
  hazard is a rule shaped to a verdict. No verdict existed on any deposit on either arm, and none
  does now.
- **No answer moved.** All four lines record that the rule costs the deposit nothing or that a check
  is owed. §6.4 is not triggered and no §4.1 correction is due.
- **The reasoning order was right and only the writing order inverted.** pos-18 and pos-21 are the two
  deposits §21.8 was ruled *for*, named in its opening paragraph. The deposits raised the question and
  the rule answered it; the commits recorded the answer second.
- **Both the rule and its applications landed inside S400, before either arm ran on any deposit.**

**What is compromised.** §21.8.3 says the rule is fixed so that it cannot be chosen to fit a result,
**which makes it auditable rather than correct.** That is a claim about legibility to a reader who was
not present. **A reader reconstructing the order from the commit history sees the application and then
the rule**, and this section is what that reader needs in order to price it.

**Ruled: §21.8 stands, no deposit is re-answered, and the four citations are left as written.** The
exposure is recorded rather than repaired. **Editing the cells or moving the rule earlier would make
the record less legible, not more** — it would remove the only evidence that the order was ever in
question.

#### 21.10.1 — the class, measured on the two nearest neighbours

**Both are clean and neither is a member.**

- **§21.7**, ruled at `08bec3f`. The run log first cites it at `f569235`, the next commit. Rule, then
  application.
- **§22**, ruled at `b6ad491`. The run log carries no occurrence of `§22` in that tree at all, and
  first cites it at `bdd927a`, the next commit. Rule, then application.

**§21.8 is the only member of the three measured.** One instance rather than a pattern, which is why
the general rule below is written as a working discipline and not as a defect in this document.

**Scope, stated because an undeclared scope is worth nothing.** Three rules measured — §21.7, §21.8,
§22. **Every section from §6 to §20 is unmeasured**, and the same two reads answer it for each: does
the applying commit's tree contain the section, and which commit first cites it.

#### 21.10.2 — the general form

**A rule and its applications committed in the same session are not thereby committed in that order.**
Session ordering is not commit ordering, and the audit a reader can actually perform runs on commits.
**Commit the rule first.**

**A read that cannot return the failing answer is not a check.** `git show <commit> -- <path>` on a
commit that does not touch that path returns nothing and counts zero whatever the truth is. The read
that settled §21.7 was `git log -S`, and the read that settled §22 was `git show <commit>:<path>`,
which reads the file at that tree rather than the commit's diff.

## 22 — what the analysed matrix holds, recorded S399 before the re-answer pass and before any deposit was scored

**§3's shape filter asks whether a sheet has a numeric matrix. It does not ask whether the numbers are
comparable measurements.** Identifiers, genomic positions, coordinates, dates parsed as numbers and
row counts are all numeric and none is a quantity a fabrication battery has any business modelling.

**The filter is loose because the product is loose, and that is deliberate.** §3's filter approximates
the import floor. **A corpus tightened past the product would measure a tool nobody ships**, so the
filter is not changed here and no deposit is dropped, re-selected or re-ranked. **n stays 30.**

### 22.1 — the three fields

Recorded per deposit, before either arm runs on it, in §4 beside the answers.

- **`rows`** — are the analysed rows one population? `one population`, `mixed`, or `undetermined`.
  pos-08 is `mixed`: 102 protein records and 1,563 peptide records in one matrix (§21.1). pos-01's
  `TOTAL` row inside the analysed 16 × 15 is the same class at a smaller scale.
- **`columns`** — is each analysed column one variable? `one variable each`, `mixed`, or
  `undetermined`. pos-08 is `mixed`: four columns are numeric in both populations and mean different
  quantities in each.
- **`measurements`** — are the analysed columns quantities at all? `measurements`, `not measurements`,
  `mixed`, or `undetermined`.

**One spelling per value.** A field that gets counted must not hold variant spellings of one answer —
the rule §4's legend states and which §18.1's cell and this section both follow.

**`undetermined` is a value, never a blank**, on the same principle as §14.3's *gate did not render*. A
blank cannot be told from a field nobody filled.

**Each non-default value carries its structural reason**, in the same form §3 requires of the answers.

### 22.2 — the classification is recorded and acted on by nothing

**No deposit is excluded, no sheet is re-chosen, no answer turns on it, and neither arm changes.**
Narrowing to the files that look like clean data matrices, after seeing which ones do not, is a
rejection rule invented after seeing what it catches — **which is what §3's rejection log exists to
prevent**, and why §12's four rejections and five surplus deposits were left where they are.

**The refusal question belongs to the product, not to the corpus.** If the tool should decline a sheet
it cannot read as comparable measurements, that refusal is a **product behaviour**, and the screen
measures it the way it measures any other — the deposit goes through the gates, the product declines,
and the outcome is `refused` with its reason, exactly as pos-02, pos-44 and pos-47 already do at the
import floor. **A refusal is a recorded outcome, not an exclusion.** This section is the evidence base
such a rule would need. **It is not that rule.**

### 22.3 — why it is recorded: two kinds of false positive

**A flag on a table of identifiers and a flag on a real measurement matrix are different findings.**
The first says the product should not have analysed the file. The second says the statistics are
miscalibrated. **Only the second is what this screen is for.**

**If both land in one tally the headline number pools two populations** — which is the error the
product commits on pos-08 and which this instrument would then be committing one level above it.

**So §7's counts are reported with the classification beside them, never recomputed over a subset.**
Choosing a denominator after seeing results is the free choice §3 exists to prevent, and §14.4 already
refuses it for refusals. **The same refusal applies here.**

### 22.4 — what this section does not settle

**Whether any deposit but pos-08 is mixed on any field.** One deposit has been read. The pass measures
this rather than assuming it, and **a classification returning twenty-nine `one population` rows is a
real result.**

**What the product should do about it.** Refuse, warn, or analyse and caveat are three different
designs with costs on all sides, and **a refusal is also a way of missing fabrication** — pos-08 may
contain a fabricated protein table and declining to look is not a null act. That decision is v1.x and
must not be made in the middle of a screen.

**Whether the assay detector's seven wrong or silent readings bear on this.** They are a detector
finding, and reading a deposit's contents off its filename is not an adjudication.

## 23 — what a deposit declares about its own data, recorded S401 before any deposit was scored

**pos-44's README states twice that the deposited file is synthetic** — *a synthetic but structurally
representative subset*, and *the subset is synthetic and does not represent actual permit detections*
— with detection intensities *designed to satisfy all data sufficiency thresholds used in the
manuscript*. Run log §4.1 C28.

**First, the ground C28 states is wrong, and the correction matters more than the ruling.** C28 says
the re-answer pass contradicts an assumption the screen rests on: that §3 samples without reference to
any allegation *so that the screen measures how often the battery flags honest data*. **§4 says the
opposite in as many words** — *these deposits are unadjudicated, not honest*, nothing establishes that
any of them is genuine, and the measured quantity is a flag on a deposit with no known complaint.
**So pos-44 contradicts nothing the screen rests on.** Run log §4.1 C36 records the correction beside
C28 rather than over it.

**What survives is smaller and is still worth recording.** A flag on values built to clear stated
numeric thresholds is a statement about a generator, not about the battery's calibration on data
somebody collected. **That is §22.3's argument one step out from the matrix.** §22.3 keeps a flag on a
table of identifiers apart from a flag on a measurement matrix, because one tally would pool two
populations. **Declared-generated data is a third population and the same refusal applies.**

### 23.1 — the field

**Recorded: `provenance`, one value per deposit, in run log §4.2 beside §22's three fields.**

- **`declared generated`** — the deposit's own documentation states that the analysed values were
  produced rather than observed.
- **`not declared`** — it states nothing of the kind.
- **`undetermined`** — classified and not determinable.

**One spelling per value**, as §22.1 requires of any field that gets counted. **Each non-default value
carries its structural reason**, in the form §3 requires of the answers.

**The name is doing work.** A documentation read finds a deposit that says it generated its data. **It
cannot find one that generated its data and did not say so.** The field records a declaration, and its
name must not claim more than the read supports.

**The bound, added S401 after the pass raised pos-32.** **Produced means the values in the analysed
matrix were generated by a model or a generator rather than recorded by an instrument or an
observer.** Model output over real inputs is produced — pos-41's BSLMM effects, pos-23's modelled
water levels, pos-32's detected pods. **A real material measured by an instrument is not**, however
the material was made: pos-01's `synthetic MORB` is a lab-made basalt that was then analysed, and its
numbers are measurements. **The test is what produced the number, not what produced the thing the
number is about.**

### 23.2 — it is not a fourth §22 field

**§22's subject is what the analysed matrix holds.** Provenance is not held by the matrix. And *§22's
three fields* is a phrase now carried by §4.2's legend, by thirty run-log cells and by the pass's own
record. **A fourth field inside §22 would falsify it everywhere at once.** This is a separate record
kept in the same place.

### 23.3 — it is acted on by nothing, on §22.2's terms

**No deposit is excluded, no file or sheet is re-chosen, no answer turns on it, and neither arm
changes. n stays 30.** §22.2 forbids dropping pos-44, §21.3 forbids re-selecting, **and a deposit is
not excluded for what its documentation says.**

**pos-44 refuses at the import floor, so no verdict will be produced on either arm. That is fortune
rather than design**, and the rule is written for the deposit that declares generation and does not
refuse.

**§7's counts carry the classification beside them and are never recomputed over a subset**, on
§22.3's rule. Choosing a denominator after seeing results is the free choice §3 exists to prevent.

### 23.4 — the census, and the instrument first specified here was wrong

**§23.4 as written at S401 named a keyword screen over the thirty READMEs and abstracts. That
instrument is withdrawn**, on the pattern §11 set for §10, and it is withdrawn before any
`provenance` cell was filled. **It was run once and it failed in both directions.**

- **It misses the class it exists to catch.** pos-41's README describes its analysed file as *SNP
  effects on traits and environmental variables derived from Bayesian sparse linear mixed model
  (BSLMM) analysis performed in GEMMA*. Those values are produced rather than observed and §23.1's
  definition reaches them. **No provenance word appears**, because a depositor describing model
  output has no reason to use one.
- **It returns members it should not.** `synthetic` matches inside `photosynthetic`, which flagged
  pos-32 and pos-39 on a substring alone. Simulation words attach to methods, materials and analyses
  far more often than to deposited values: pos-02's null models, pos-22's Blomberg's K, pos-49's
  crown-growth model, pos-12's *in silico* PCR, pos-01's lab-made *synthetic MORB*, pos-31's
  artificially coloured flies, pos-41's *integrative and synthetic study*.

**A census whose instrument cannot find its own definition's members is not a census**, and a
`provenance` column filled from it would have looked complete.

#### 23.4.1 — the read

**For each deposit, the README's description of the analysed file, asking one question: does the
deposit describe those values as measured or as produced.** One paragraph per deposit, thirty times.
**§21.3 binds: all thirty or none.**

**§4.2's `measurements` reasons are read beside it**, because that field already made this read once
and reached pos-41 by it. **Where the two disagree the disagreement is recorded rather than
reconciled** — a field that catches what another field's stated instrument missed is worth knowing
about, and §22.4 does not claim `measurements` was asked this question.

**A keyword screen may be run as an aid and never as the census.** Its output is a list of paragraphs
to read, not a list of members.

#### 23.4.2 — three members are known before the pass runs

**Declared here so that the pass cannot find them again and call that a result.**

- **pos-44** — *a synthetic but structurally representative subset*, §4.1 C28.
- **pos-23** — *daily hydrodynamic-model outputs*, and *values are modeled daily water levels in
  meters*, read S401.
- **pos-41** — BSLMM model output, already recorded in §4.2's reason and not in any provenance field.

**The pass measures the other twenty-seven and confirms these three.** A pass that recovered three
known members and nothing else would be reporting its own inputs.

#### 23.4.3 — when the column lands

**In §4.2 after the pass, not before.** Writing it now would put three values beside twenty-seven
blanks, **which is the thing §22.1 forbids**: a blank cannot be told from a field nobody filled.

#### 23.4.4 — the pass, run S401. Four members

**Run over the thirty as §23.4.1 specifies — each README's description of its analysed file, read
beside §4.2's `measurements` reason.**

- **pos-44** — *a synthetic but structurally representative subset*, 8 simulated fish. Known.
- **pos-23** — *daily modeled water level, flow velocity, and discharge*. Known.
- **pos-41** — *SNP effects … derived from Bayesian sparse linear mixed model (BSLMM) analysis
  performed in GEMMA*. Known.
- **pos-32** — *a full list of the detected pods when run on all image slices*, object-detection
  inference over photographs with the model weights deposited alongside. **Found by the pass.** §4.2
  already recorded it as `not measurements`; **no provenance field held it and no keyword screen
  could have found it.**

**Twenty-six are `not declared`**, describing measurements made by an instrument or an observer —
audiometric thresholds, beetle density, sperm morphology, OTU read counts, capture rates, reflectance
spectra, phenotypes. **None is `undetermined`.**

**§4.2 and this field agree on the four and the reads are not independent**, since §23.4.1 requires
the `measurements` reason to be read beside the README. **That is a check on the pass, not
corroboration of the field**, and §23.4.1 says so.

**The keyword screen this section withdrew would have returned two of the four**, missing pos-41 and
pos-32, while returning pos-32 and pos-39 on `photosynthetic` and six more on method, material and
analysis words. **Recorded because it is the measurement behind the withdrawal.**

### 23.5 — what this section does not settle

**Whether the tool should behave differently on declared-generated data.** Refuse, warn, or analyse
and caveat, exactly as §22.4 leaves the parallel question. **That is v1.x and must not be decided in
the middle of a screen.**

**Whether any deposit in the thirty generated its data and did not say so.** This instrument cannot
see it. **Stated rather than left implied**, because a field named for a declaration will otherwise be
read as a field naming a fact.

**Whether the review paper should report a figure over the deposits that declare nothing.** §7's
counts are not recomputed over a subset and that does not move. Whether a second figure is worth
printing beside them is a writing decision and is not pre-registered here.

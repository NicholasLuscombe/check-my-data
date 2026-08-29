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

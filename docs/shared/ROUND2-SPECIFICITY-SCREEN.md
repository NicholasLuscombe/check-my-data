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


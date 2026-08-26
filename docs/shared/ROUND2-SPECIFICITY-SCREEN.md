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

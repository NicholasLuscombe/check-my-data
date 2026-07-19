# S325 — The ecology cluster census (code read, read-only)

> **Stale entry — C07.** This census measured C07 before the level-clause fix (`99f75de`,
> merged to main at S325 close). C07's matrix was missing about half its columns: role
> inference held out real measurements as attributes. On the corrected matrix C07 runs at
> 72 by 39 columns, not 72 by 21; its held-out count drops from twenty to two. The verdict
> tier stays High, but the per-test detail moved (10 HIGH before, 12 HIGH plus 4 MOD after),
> and its two errored tests were diagnosed against the 21-column shape — Mahalanobis now
> needs 117 rows where it needed 63. The C07 section below is kept as the historical reading;
> re-run the census (S326) before citing it. Every other file's entry stands.

Read-only. Nothing was changed. The seven files were run through the same pipeline the
UI and the batch runner use, in a throwaway probe that mirrors `corpus-run.mjs` and adds
the coverage classifier (`src/analysis/coverage.js`) and the grouping trigger
(`src/analysis/groupingTrigger.js`) so each test's coverage state and each file's trigger
arms are read directly rather than inferred. Errored causes are read at the test's own
guard, not from the aggregator's description string. Where a run and the corpus spec
disagree, both are reported and left unreconciled.

## Summary up front

- **Six of the seven files run. One does not import at all.** C15 fails at the
  preprocessing stage before any test sees it, because its data sheet declares a used
  range out to Excel's last column.
- **The grouping trigger fires on five of the six that run: C09, C14, C16, C20, C22.**
  On each, the same four tests — Mahalanobis Row Outlier, Entropy / Zipf Analysis, Column
  Goodness-of-Fit, Modality Test — are held pending. **C07 is the exception: its grouping
  is clean, the trigger stays silent, and it is the only file that shows an errored
  result.** C07 was held with the cluster, but its own grouping never trips either arm.
- **Every file that runs returns a High verdict (severity 3).** The verdict comes entirely
  from tests the trigger does not touch — digit tests, the two duplication detectors,
  autocorrelation and runs. The grouped tests contribute nothing to any verdict here; they
  are pending, errored, or not applicable on all seven.
- **The errored bucket is not gone — the trigger is hiding it.** On C07 (trigger silent)
  two tests error. On C09, C20 and C22 the same condition is present, but the trigger holds
  those tests pending before they can error. Push past the trigger by confirming the
  grouping and the bucket reappears, larger: **the confirm card errors all four grouped
  tests on C09, C20 and C22**, because the confirm path is missing the upfront
  applicability checks S324 added to the engine. On C14 and C16 the confirm card does
  something different again — it silently pools.

## Per file

### C07 — soil warming, microbial phosphorus

- **Shape.** 72 rows, 21 data columns. Row-grouped. Two condition columns, Warming and
  Season. Twenty attribute columns held out.
- **Trigger.** Does not fire. Arm 1 needs three condition columns; there are two. Arm 2
  needs a thin or unusable partition; the partition is six groups of twelve, median twelve.
  Both arms fail. This is the only file where the trigger is silent.
- **Groups.** Six, each twelve rows, median twelve.
- **Coverage.** Ran 22, not applicable 5, errored 2, pending 0. Severity 3 (High).
  Completed and flagged High: Benford first digit, Benford second digit, Terminal Digit
  Uniformity, Decimal Precision, Value-Frequency Spike, Inter-Replicate Correlation, Exact
  Duplicate Detection, Sequential Duplication, Excess Kurtosis, Selective Noise
  Partitioning. Moderate: Autocorrelation, Windowed Autocorrelation, Runs, Row-Mean Runs.
- **Errored results — cause read at source.** Two, and they are the census's only errored
  results.
  - **Mahalanobis Row Outlier.** The aggregator says "No group had sufficient data." The
    real cause is at `src/tests/mahalanobis.js:31`: `nR < 3 * nC`. Each group has twelve
    rows against twenty-one columns, and the covariance estimate needs at least sixty-three
    rows for that many columns. Every group fails on the ratio of rows to columns, not on a
    bare row count.
  - **Entropy / Zipf Analysis.** Same stock description. The real cause is at
    `src/tests/entropyTest.js:47`: a column needs at least twenty observations. Each group
    has twelve rows, so every column in every group skips, and the aggregate errors.
- **Anything that looks wrong.** Column Goodness-of-Fit and Modality — the two grouped
  tests that sit beside Mahalanobis and Entropy — do **not** error here. They return a
  clean not-applicable ("no condition group has the 30 values", "…the 50 values"). The
  difference is that S324 moved their size checks upfront, into the engine at
  `engine.js:540` and `engine.js:553`, so they answer before dispatching. Entropy has no
  such upfront check, and Mahalanobis's upfront check counts columns only, not the
  rows-against-columns ratio. So on a file with small groups, two of the four grouped tests
  answer cleanly and two land in the errored bucket, purely by which test got the upfront
  guard.

### C09 — warming, alpine root and leaf traits

- **Shape.** 60 rows, 16 data columns. Row-grouped. Four condition columns: Species, Genus,
  Family, Treatment.
- **Trigger.** Fires on both arms. Arm 1: four condition columns, at or above the
  three-column threshold. Arm 2: median group size three, at or below the thin threshold of
  four.
- **Groups.** Twenty, each three rows, median three.
- **Coverage.** Ran 16, not applicable 9, pending 4, errored 0. Severity 3 (High).
  Completed and flagged High: Benford first digit, Decimal Precision, Value-Frequency
  Spike, Exact Duplicate Detection, Autocorrelation, Runs, LOESS Residual, Regional Noise.
  Moderate: Constant-Offset Blocks, Windowed Autocorrelation.
- **Pending.** The four grouped tests, held by the trigger.
- **Anything that looks wrong.** Cross-Condition Consistency is not gated by the trigger
  (there is no pending guard on it in `engine.js`), so it ran across the twenty tiny groups
  and returned Low, `p = 0.035`. The four tests beside it were judged untrustworthy on the
  same twenty groups and suppressed; this one produced a verdict on them.

### C14 — allometric tree growth

- **Shape.** 9,398 rows, 14 data columns. Row-grouped. Two condition columns: Species and
  DamageSev. Seven attribute columns held out, several of them unit conversions of each
  other (diameter in centimetres and inches, basal area, height).
- **Trigger.** Fires on Arm 2 only. Arm 1 needs three condition columns; there are two. Arm
  2 fires because the partition is not usable — group sizes run from a single row to 1,671
  rows, so not every group clears the three-row floor — and the median is four.
- **Groups.** 236, median four, sizes from 1 to 1,671. The partition is wildly uneven; this
  is the categorical-code-stored-as-a-number shape the corpus already documents for this
  file.
- **Coverage.** Ran 23, not applicable 2, pending 4, errored 0. Severity 3 (High).
  Completed and flagged High: thirteen tests, including both duplication detectors, both
  Benford digits, Terminal Digit, Value-Frequency Spike, Inter-Replicate Correlation,
  Blocked Mahalanobis, Autocorrelation, Runs, Within-Row Variance, Selective Noise, Missing
  Data. Moderate: Constant-Offset Blocks, Cross-Condition Rank Correlation, LOESS, Regional
  Noise.
- **Pending.** The four grouped tests.
- **Anything that looks wrong.** The thirteen High flags are a large count, and the file is
  the corpus's known artifact case — repeated forestry records and joined attribute columns
  drive much of it. Cross-Condition Consistency again ran ungated, this time across all 236
  groups, and returned Low. That run is also the expensive one: the pairwise distance work
  over 236 groups dominated this file's run time.

### C15 — nitrogen-form acquisition and dominance

- **Shape.** Cannot be reported. The file does not import.
- **Trigger, groups, coverage.** None. No test runs.
- **The failure — cause read at source.** The probe and the batch runner both stop with
  "Empty after preprocessing." The real cause is in `src/import/parser.js`. The data sheet
  parses to sixty-one rows with honest headers (VT, plot_ID, Species, and so on) and about
  twenty-six real values per row, but the sheet's used range runs to column XFD, so every
  row arrives padded to 16,384 cells. `preprocessRaw` sets its "is this row real" bar as a
  fraction of the widest row (`parser.js:28`, `minCells = ceil(maxC * 0.1)`), which here is
  `ceil(16384 * 0.1) = 1639`. Every genuine row has twenty-six values, far below 1,639, so
  every row is judged sparse and stripped, and the function returns zero rows. A phantom
  column width defeats the import.
- **Disagreement with the corpus spec.** The row-grouping census in the spec (§0.3) lists
  C15 as "no condition columns — not row-grouped," which reads as a file that parsed to a
  valid but ungrouped table. This run says it does not parse at all. Both are recorded; they
  are not reconciled here.

### C16 — nitrogen and phosphorus enrichment, grassland

- **Shape.** 60 rows, 99 data columns. Row-grouped. Three condition columns: Treat, Block,
  ZLev1. Ten attribute columns held out.
- **Trigger.** Fires on both arms. Arm 1: three condition columns. Arm 2: the partition is
  not usable and the median group size is one.
- **Groups.** Sixty, every one a single row, median one. The three condition columns'
  combined value is unique on every row, so each row is its own group.
- **Coverage.** Ran 16, not applicable 9, pending 4, errored 0. Severity 3 (High).
  Completed and flagged High: Benford first digit, Benford second digit, Terminal Digit,
  Decimal Precision, Value-Frequency Spike, Inter-Replicate Correlation, Autocorrelation,
  Runs, Regional Noise. Moderate: Sequential Duplication, Windowed Autocorrelation.
- **Pending.** The four grouped tests.
- **Anything that looks wrong.** The corpus spec (§0.1) describes C16 as the case where an
  "announce-empty banner" fires because grouping produced sixty singletons and nothing said
  so. The engine comment at `engine.js:213` states the S320 trigger supersedes that banner.
  In this run the four grouped tests are pending under the trigger, not announced by a
  banner. The stale description and the current behaviour are both recorded.

### C20 — microbial richness, soil function

- **Shape.** 204 rows, 17 data columns. Row-grouped. Two condition columns: Soil_type and
  Taxa_combination. One attribute column held out. Sheet "Microcosm soil B", the larger of
  the two microcosm sheets.
- **Trigger.** Fires on Arm 2 only. Arm 1 needs three condition columns; there are two. Arm
  2 fires because the median group size is three, below the thin threshold of four. The
  partition itself is usable — every group has three or more rows.
- **Groups.** Thirty-seven, sizes three to nine, median three.
- **Coverage.** Ran 18, not applicable 7, pending 4, errored 0. Severity 3 (High).
  Completed and flagged High: Benford first digit, Benford second digit, Terminal Digit,
  Decimal Precision, Value-Frequency Spike, Inter-Replicate Correlation, Exact Duplicate
  Detection, Sequential Duplication, Autocorrelation, Runs. Moderate: Constant-Offset
  Blocks, Windowed Autocorrelation, LOESS.
- **Pending.** The four grouped tests.
- **Anything that looks wrong.** Cross-Condition Consistency ran ungated across the
  thirty-seven groups and returned Low, the same pattern as C09 and C14. The other sheet in
  this workbook, "Microcosm soil A", was not run; the census used the larger sheet the
  spec's grouping census measured, and the choice of microcosm sheet is worth naming
  because both carry the flagged respiration columns.

### C22 — saprotrophic fungi, soil amendments

- **Shape.** 176 rows, 5 data columns. Row-grouped. Four condition columns: Experiment,
  Material, N Fertilizer, Time. Sheet "Exp. WA" (the default "Info" sheet is metadata).
- **Trigger.** Fires on both arms. Arm 1: four condition columns. Arm 2: median group size
  four, at the thin threshold.
- **Groups.** Forty-four, every one four rows, median four.
- **Coverage.** Ran 16, not applicable 9, pending 4, errored 0. Severity 3 (High).
  Completed and flagged High: Benford first digit, Benford second digit, Decimal Precision,
  Value-Frequency Spike, Exact Duplicate Detection, Sequential Duplication, Excess
  Kurtosis, Autocorrelation, Within-Row Variance, Missing Data. Moderate: Constant-Offset
  Blocks, Windowed Autocorrelation, Runs, LOESS, Regional Noise.
- **Pending.** The four grouped tests.
- **Anything that looks wrong.** Cross-Condition Consistency returned not-applicable here
  ("no property and pair unit passed applicability gates") rather than running ungated, so
  the ungated-run pattern from C09, C14 and C20 does not hold on every file — the test's own
  internal minimum stopped it on the groups of four.

## Across all seven

**Which causes appear on more than one file.**

- **The grouping trigger fires on five of the six files that run — C09, C14, C16, C20,
  C22.** On each it holds the same four tests pending: Mahalanobis Row Outlier, Entropy /
  Zipf Analysis, Column Goodness-of-Fit, Modality Test. Two arms are in play. Arm 1, three
  or more condition columns, fires on C09, C16, C22. Arm 2, an unusable or thin partition,
  fires on C09, C14, C16, C20, C22 — every triggering file. The two files that fire Arm 2
  alone (C14, C20) have only two condition columns but small groups.
- **The same not-applicable causes recur.** Blocked Mahalanobis wants at least sixty
  complete rows per condition and returns not-applicable on C07, C09, C16, C20, C22. Noise
  Scaling wants a value range of at least one order of magnitude and returns not-applicable
  on C07, C09, C16, C22. Baseline Balance reports that every feature differs between
  conditions and steps aside on C09, C14, C20, C22. Selective Noise finds no condition with
  enough data on C09, C16, C20, C22. These are honest applicability answers, and they are
  the same answers file after file, because the files share a shape: many narrow conditions
  with few rows each.
- **The High verdict is driven by the same untriggered tests everywhere.** Benford (both
  digits), Decimal Precision, Value-Frequency Spike, the two duplication detectors,
  Autocorrelation and Runs carry the severity on every file that runs. The duplication
  detectors firing is the real defect the corpus documents for these files. The digit tests
  firing across pooled, heterogeneous columns is the applicability false-positive surface
  the spec predicted for exactly this cluster; this run reproduces it but does not
  re-adjudicate each flag against the source data.

**Whether any file behaves unlike the other six.**

Two do.

- **C07 is the only file whose grouping is clean.** Two condition columns, six even groups
  of twelve, both arms fail, trigger silent. It is therefore the only file where the four
  grouped tests actually dispatch, and the only file with an errored result. It was held
  with the cluster, but nothing about its own grouping needed holding.
- **C15 is the only file that does not run.** It fails at import, before any test, on a
  phantom sheet width. It never reaches the trigger, a verdict, or the coverage vocabulary.

**Whether any test errors on multiple files for one cause — the shape S324 found.**

In the plain run, no. Errored appears on one file only, C07, on two tests. On the other
files the trigger holds those tests pending before they can error, so the bucket looks
empty. But the condition that produced C07's errored bucket — groups too small for a grouped
test's own minimums — is present on C09, C16, C20 and C22 too. It is masked, not absent.

Confirming the grouping makes it visible, and this is the census's sharpest cross-file
finding:

- **The confirm card errors all four grouped tests on C09, C20 and C22** — verified by
  running `runConfirmedGroupedTests` on the full condition set. Where the engine path on
  C07 gives two errored and two clean not-applicable, the confirm path on the same C07
  grouping gives four errored. The reason is a drift: the confirm path
  (`src/analysis/confirmGrouping.js`) dispatches Column Goodness-of-Fit and Modality
  straight into the per-group aggregator with no upfront size check, while the engine path
  gained those checks in S324 (`engine.js:540`, `engine.js:553`). The confirm module's
  header claims it is byte-identical to the engine; for these two tests it is not.
- **On C14 and C16 the confirm card does not error — it pools.** Their partitions contain
  singletons, so `rowGroups()` returns null, and the four tests fall to their pooled path
  and run on the whole ungrouped matrix. On C14 three of the four return Moderate; on C16
  two return Moderate and one Low. Confirming the grouping on these two files produces a
  pooled verdict presented as a confirmed grouped one — the exact outcome the trigger was
  built to prevent.

So the one cause splits three ways across the cluster depending on group shape: small but
usable groups error under confirm (C07, C09, C20, C22); singleton-heavy groups pool under
confirm (C14, C16); and under the plain trigger all of them simply read pending.

## What did not fit

- **The confirm path has lost the S324 upfront checks.** This is the finding above stated as
  a standalone defect. `confirmGrouping.js` mirrors an older version of the engine's grouped
  dispatch. Column Goodness-of-Fit and Modality error on confirm where the engine would
  return a clean not-applicable, and the file offering the "grouping accepted" action gives
  a worse answer than the file that never offered it. Not fixed, per the read-only rule;
  flagged for whoever scopes the confirm card.
- **Cross-Condition Consistency is not gated by the trigger.** It ran across the exploded
  units on C09, C14 and C20 and returned a Low verdict on the same partitions the four
  gated tests were suppressed on. It returned not-applicable on C16 and C22 only because its
  own internal minimum stopped it. The corpus spec lists this test among those affected by
  grouping, but the enforcement gates four tests and this is not one of them.
- **The aggregator's description is wrong for most of the errored cases.** Every errored
  result carries "No group had sufficient data for this test." On C07 that phrase fits
  Entropy loosely and Mahalanobis poorly — Mahalanobis had enough rows for a bare count and
  failed on the ratio of rows to columns. Under confirm the same phrase covers Column
  Goodness-of-Fit and Modality, whose real answer is a specific size shortfall the engine
  path states plainly. The classifier reads a flag, not this string, so the bucket is
  counted correctly; the sentence a reader sees is not.
- **Two corpus-spec descriptions are stale against the run.** C15 is recorded as "not
  row-grouped" but does not import. C16 is recorded as firing an announce-empty banner, but
  the S320 trigger has superseded that banner and the file now reads as four pending tests.
  Both are left as recorded, not reconciled.
- **C07 did not need blocking.** It was held for three sessions with a cluster whose other
  members trip the trigger. Its own grouping does not. The cost of holding it was that its
  errored bucket — the clearest exhibit in this census of the upfront-check asymmetry — went
  unseen until now.

---

`./scripts/dev.sh cmd-s325-ecology`

# S326 — The ecology cluster census, re-run (code read, read-only)

Read-only. Nothing was changed. All seven files were re-run through the same pipeline the UI
and the batch runner use, in a throwaway probe that mirrors `corpus-run.mjs` and adds the
coverage classifier (`src/analysis/coverage.js`), the grouping trigger
(`src/analysis/groupingTrigger.js`) and the confirm path (`src/analysis/confirmGrouping.js`).
This is the same method the S325 census used.

One addition. Rather than diff against the S325 prose alone, the probe was also run against
the tree as it stood before the two S325 fixes landed (commit `37d2f45`, the parent of
`cc838a6` and `99f75de`). That before-run reproduces the S325 C07 entry field for field —
72 by 21, twenty columns held out, ran 22, not applicable 5, errored 2, ten High and four
Moderate, and a confirm path that errors all four grouped tests. So the probe is a faithful
mirror of the census method, and the before-and-after comparison below is measured, not
inferred from the report's wording.

## Summary up front

- **C07 moved, and by more than the stale-entry note predicted.** The matrix went from 72 by
  21 to 72 by 39. The verdict stays High. Four tests moved, not two: Decimal Precision fell
  from High to Moderate, Autocorrelation rose from Moderate to High, LOESS Residual rose from
  Low to High, and Missing Data Pattern went from not applicable to High. The note predicted
  the counts (twelve High, four Moderate) correctly but not the membership.
- **C07's two errored tests still error, and the diagnosis still holds.** Read at source:
  Mahalanobis now needs 117 rows against 39 columns and each group has twelve. Entropy needs
  twenty observations per column and each group has twelve. The Mahalanobis shortfall got
  worse with the wider matrix; the Entropy shortfall is unchanged, because it counts rows and
  the row count did not move.
- **C15 still fails at import, and the cause is the phantom used range, not role inference.**
  Confirmed both at source and by measurement. Role inference has in fact been fixed for this
  file — on the trimmed sheet it now yields eighteen data columns where it previously yielded
  zero — but the file never reaches role inference, because `preprocessRaw` strips every row
  first. Two independent defects, one fixed, one untouched.
- **The other five are unchanged on the engine path.** C09, C14, C16, C20 and C22 return
  byte-identical shape, trigger, groups, coverage, severity and per-test flags. C14 was
  additionally re-run on the before-tree and shows zero per-test differences between the two
  trees.
- **But the confirm path changed on every file that runs, and the census does not say so.**
  The S325 report's sharpest cross-file finding — that the confirm card errors all four
  grouped tests where the engine returns a clean not applicable — has been fixed by
  `cc838a6`. The census's stale-entry header flags C07 only. The confirm-path finding is a
  second staleness axis and it is not flagged.
- **One disagreement between the landed report and this run, on C14, left unreconciled.** The
  report names both duplication detectors among C14's thirteen High tests. Both runs give
  Sequential Duplication Low at p = 1, and Row-Mean Runs High, which the report does not name.
  The count of thirteen agrees; one member does not.

## Per file

### C07 — soil warming, microbial phosphorus

This is the file the re-run was called for, and it is reported in full.

- **Shape.** 72 rows, **39 data columns** (was 21). Row-grouped. Two condition columns,
  Warming and Season. **Two attribute columns held out** (was twenty): Start and Duration.
- **What came back.** Eighteen columns: Fe_oxalate, Mn_oxalate, Al_oxalate, Fe_dithionite,
  Mn_dithionite, Fe_crystalline, sand, silt, clay, eNa, eK, eCa, eMg, eMn, CEC, Kaolinite,
  Illite and Chlorite_mixed_layer. They are real measurements. Checked at source, none is
  constant within Block, so none was a legitimate group attribute. The restoration is correct
  in role terms.
- **Trigger.** Still silent, and for the same reasons. Arm 1 needs three condition columns and
  there are two. Arm 2 needs a thin or unusable partition and the partition is six groups of
  twelve, median twelve. Both arms fail. C07 remains the only file in the cluster whose
  grouping is clean.
- **Groups.** Six, each twelve rows, median twelve. Unchanged — the level-size clause changed
  which columns are data, not which rows are grouped.
- **Coverage.** Ran 23, not applicable 4, errored 2, pending 0, unassessed 0. Severity 3
  (High). Before: ran 22, not applicable 5, errored 2. The one test that moved out of the not
  applicable bucket is Missing Data Pattern.
- **Verdict.** High, unchanged. The tier did not move.

**How the per-test detail moved.** Four tests, measured against the before-tree:

| Test | Before (21 cols) | After (39 cols) |
|---|---|---|
| Decimal Precision Consistency | High, p = 3.9e-7 | **Moderate**, p = 0.0071 |
| Autocorrelation | Moderate | **High**, p = 0 |
| LOESS Residual Analysis | Low | **High**, p = 0.0002 |
| Missing Data Pattern | not applicable (0.0% missing) | **High**, p = 6.8e-148 |

Everything else on C07 is unchanged. High now reads: Benford first digit, Benford second
digit, Terminal Digit Uniformity, Value-Frequency Spike, Inter-Replicate Correlation, Exact
Duplicate Detection, Sequential Duplication, Excess Kurtosis, Autocorrelation, LOESS Residual,
Selective Noise Partitioning, Missing Data Pattern. Moderate reads: Decimal Precision,
Windowed Autocorrelation, Runs, Row-Mean Runs.

**The Missing Data flag is a direct consequence of the restoration, and it is worth naming.**
The eighteen restored columns are full in the spreadsheet sense — 72 of 72 cells carry a
value — but 48 of those 72 cells hold the literal string `n/a`. Read at source, the real
values sit only on the first 24 rows, which are the May rows; the August and October rows are
`n/a` throughout. These are soil properties measured once, in May, per plot. In the numeric
matrix those cells are null, so the matrix is 30.8 percent missing, concentrated in exactly
eighteen of thirty-nine columns in an identical 48-of-72 pattern. That is a strongly
structured absence and the test reports it at p = 6.8e-148. It is an honest description of the
file's shape. It is not evidence of fabrication, and this read does not adjudicate it as such.

**Errored results — cause read at source.** Still two, still the same two, and the census's
diagnosis survives the shape change.

- **Mahalanobis Row Outlier.** The aggregator still says "No group had sufficient data for
  this test." The real cause is at `src/tests/mahalanobis.js:31`: `nR < 3 * nC`. Each of the
  six groups has twelve rows against thirty-nine columns, so the covariance estimate needs
  117 rows. Every group returns "Insufficient rows (12) for 39 columns — need ≥117 for stable
  covariance estimate." The census predicted 63 becoming 117 and that is exactly what the
  guard now says. The test is further from passing than it was, not closer.
- **Entropy / Zipf Analysis.** Same stock description. The real cause is at
  `src/tests/entropyTest.js:47`: a column needs at least twenty observations. Measured per
  group, the best column has twelve. This cause did not change with the column count, because
  it counts rows.

**The confirm path on C07 now agrees with the engine.** Before, the engine gave two errored
and two clean not applicable while the confirm path gave four errored. Now both give the same
two errored and the same two clean not applicable, with the same messages. This is `cc838a6`
working as its commit message describes.

### C15 — nitrogen-form acquisition and dominance

- **Shape.** Cannot be reported. The file still does not import.
- **Trigger, groups, coverage.** None. No test runs.
- **Does it still fail at import?** Yes. The probe stops with "Empty after preprocessing" on
  the Data sheet, exactly as in S325.
- **Is the cause the phantom used range or role inference?** The phantom used range.
  Confirmed at source and by measurement. The Data sheet parses to 61 rows with honest headers
  (VT, plot_ID, Species, Family, Abbreviation, MT, SD, PFG, PLF, IV, DON, NH4 and so on), but
  the sheet's used range runs to column XFD, so every row arrives padded to 16,384 cells.
  `preprocessRaw` sets its "is this row real" bar as a fraction of the widest row
  (`src/import/parser.js:28`, `minCells = max(3, ceil(maxC * 0.1))`), which here is 1,639.
  Measured: every one of the 61 rows carries 25 or 26 filled cells, and **zero of 61 rows
  clear the bar**. Every row is judged sparse and stripped, and the function returns nothing.
- **Role inference has been fixed for this file, and it does not help.** This is the part
  worth stating plainly. Feeding the same sheet past the import bar by hand — trimming the
  phantom columns and then running `inferBaseRoles` and `detectGroupAttributes` — gives:
  before the level-size clause, 0 data columns and 18 columns held out as attributes; after
  it, **18 data columns and nothing held out**. So the S325 level-size census was right that
  role inference emptied this sheet, and `99f75de` fixed that. But the pipeline never gets
  there. C15's import failure is upstream of role inference and is untouched.
- **Disagreement with the corpus spec, carried forward.** The row-grouping census in the spec
  (§0.3) lists C15 as "no condition columns — not row-grouped," which reads as a file that
  parsed to a valid but ungrouped table. This run says it does not parse at all. Both are
  recorded; they are not reconciled here.

### C09 — warming, alpine root and leaf traits

**Identical to the S325 entry on the engine path.** Every field checked and matching.

- **Shape.** 60 rows, 16 data columns. Row-grouped. Four condition columns: Species, Genus,
  Family, Treatment. No columns held out.
- **Trigger.** Fires on both arms. Arm 1: four condition columns, at or above three. Arm 2:
  median group size three, at or below the thin threshold of four.
- **Groups.** Twenty, every one three rows, median three.
- **Coverage.** Ran 16, not applicable 9, pending 4, errored 0. Severity 3 (High).
  High: Benford first digit, Decimal Precision, Value-Frequency Spike, Exact Duplicate
  Detection, Autocorrelation, Runs, LOESS Residual, Regional Noise. Moderate: Constant-Offset
  Blocks, Windowed Autocorrelation.
- **Pending.** The four grouped tests, held by the trigger.
- **Cross-Condition Consistency** again ran ungated and returned Low at p = 0.0345, matching
  the census's 0.035.
- **What did change: the confirm path.** S325 recorded four errored. This run gives
  Mahalanobis errored, Entropy errored, Column Goodness-of-Fit a clean not applicable, and
  Modality a clean not applicable. See the cross-file section.

### C14 — allometric tree growth

**Unchanged between the two trees**, and re-run on both to be sure: zero per-test differences.

- **Shape.** 9,398 rows, 14 data columns. Row-grouped. Two condition columns: Species and
  DamageSev. Seven attribute columns held out — the level-size clause left this file alone,
  as its commit message said it would.
- **Trigger.** Fires on Arm 2 only. Arm 1 needs three condition columns and there are two.
  Arm 2 fires because the partition is not usable — sizes run from 1 to 1,671, so not every
  group clears the three-row floor — and the median is four.
- **Groups.** 236, median four, sizes 1 to 1,671.
- **Coverage.** Ran 23, not applicable 2, pending 4, errored 0. Severity 3 (High).
- **Pending.** The four grouped tests.
- **Cross-Condition Consistency** ran ungated across all 236 groups and returned Low at
  p = 0.0786. It remains the expensive one; this file dominates the run time.
- **The disagreement.** The S325 entry describes C14's thirteen High tests as "including both
  duplication detectors, both Benford digits, Terminal Digit, Value-Frequency Spike,
  Inter-Replicate Correlation, Blocked Mahalanobis, Autocorrelation, Runs, Within-Row
  Variance, Selective Noise, Missing Data" — thirteen names for a stated thirteen. This run
  gives thirteen High, but the membership differs by one: **Sequential Duplication is Low at
  p = 1**, and **Row-Mean Runs is High**, which the report does not name. Exact Duplicate
  Detection is High in both. The before-tree run gives the same thirteen as this run, so the
  file did not move between the trees. Both readings are recorded and not reconciled.

### C16 — nitrogen and phosphorus enrichment, grassland

**Identical to the S325 entry on the engine path.**

- **Shape.** 60 rows, 99 data columns. Row-grouped. Three condition columns: Treat, Block,
  ZLev1. Ten attribute columns held out — a legitimate holdout the level-size clause
  preserved.
- **Trigger.** Fires on both arms. Arm 1: three condition columns. Arm 2: the partition is not
  usable and the median group size is one.
- **Groups.** Sixty, every one a single row, median one.
- **Coverage.** Ran 16, not applicable 9, pending 4, errored 0. Severity 3 (High).
  High: Benford first digit, Benford second digit, Terminal Digit, Decimal Precision,
  Value-Frequency Spike, Inter-Replicate Correlation, Autocorrelation, Runs, Regional Noise.
  Moderate: Sequential Duplication, Windowed Autocorrelation.
- **Pending.** The four grouped tests.
- **Cross-Condition Consistency** returned not applicable, "Need ≥2 conditions with data" —
  its own internal minimum, as the census said.
- **Confirm path unchanged in kind.** It still pools rather than errors, because the partition
  is all singletons and `rowGroups()` returns null. Entropy Moderate, Column Goodness-of-Fit
  Moderate, Modality Low, Mahalanobis not applicable — the census's "two Moderate and one Low"
  exactly.

### C20 — microbial richness, soil function

**Identical to the S325 entry on the engine path.**

- **Shape.** 204 rows, 17 data columns. Row-grouped. Two condition columns: Soil_type and
  Taxa_combination. One attribute column held out. Sheet "Microcosm soil B", the larger of the
  two microcosm sheets.
- **Trigger.** Fires on Arm 2 only. Arm 1 needs three condition columns and there are two.
  Arm 2 fires on the median group size of three, below the thin threshold of four. The
  partition itself is usable — every group has three or more rows.
- **Groups.** Thirty-seven, sizes three to nine, median three.
- **Coverage.** Ran 18, not applicable 7, pending 4, errored 0. Severity 3 (High).
  High: Benford first digit, Benford second digit, Terminal Digit, Decimal Precision,
  Value-Frequency Spike, Inter-Replicate Correlation, Exact Duplicate Detection, Sequential
  Duplication, Autocorrelation, Runs. Moderate: Constant-Offset Blocks, Windowed
  Autocorrelation, LOESS Residual.
- **Pending.** The four grouped tests.
- **Cross-Condition Consistency** ran ungated and returned Low at p = 0.0647.
- **What did change: the confirm path**, as on C09. Two errored, two clean not applicable.
- The other sheet in this workbook, "Microcosm soil A", was again not run. The choice of
  microcosm sheet is worth naming because both carry the flagged respiration columns.

### C22 — saprotrophic fungi, soil amendments

**Identical to the S325 entry on the engine path.**

- **Shape.** 176 rows, 5 data columns. Row-grouped. Four condition columns: Experiment,
  Material, N Fertilizer, Time. No columns held out. Sheet "Exp. WA" — the default "Info"
  sheet is metadata and was not used.
- **Trigger.** Fires on both arms. Arm 1: four condition columns. Arm 2: median group size
  four, at the thin threshold.
- **Groups.** Forty-four, every one four rows, median four.
- **Coverage.** Ran 16, not applicable 9, pending 4, errored 0. Severity 3 (High).
  High: Benford first digit, Benford second digit, Decimal Precision, Value-Frequency Spike,
  Exact Duplicate Detection, Sequential Duplication, Excess Kurtosis, Autocorrelation,
  Within-Row Variance, Missing Data. Moderate: Constant-Offset Blocks, Windowed
  Autocorrelation, Runs, LOESS Residual, Regional Noise.
- **Pending.** The four grouped tests.
- **Cross-Condition Consistency** returned not applicable, "No (property × pair) unit passed
  applicability gates" — its own minimum stopped it on the groups of four, as the census said.
- **What did change: the confirm path**, as on C09 and C20. Two errored, two clean not
  applicable.

## Cross-file comparison against the S325 baseline

**Engine path, file by file.**

| File | Shape | Trigger | Groups | Coverage | Severity | Flags | Verdict |
|---|---|---|---|---|---|---|---|
| C07 | **moved** 21 → 39 cols | same | same | **moved** | same (3) | **moved**, 4 tests | High, unchanged |
| C09 | same | same | same | same | same (3) | same | identical |
| C14 | same | same | same | same | same (3) | see disagreement | unchanged between trees |
| C15 | n/a | n/a | n/a | n/a | n/a | n/a | still fails at import |
| C16 | same | same | same | same | same (3) | same | identical |
| C20 | same | same | same | same | same (3) | same | identical |
| C22 | same | same | same | same | same (3) | same | identical |

Every file that runs still returns a High verdict, and the verdict still comes entirely from
tests the trigger does not touch. C07's tier held across a near-doubling of its matrix.

**The confirm path changed on every file, and this is the finding the census's staleness note
misses.** `cc838a6` extracted the upfront applicability guards into
`src/analysis/applicability.js` and wired both dispatch sites to it. The module's own header
says so, and names the pre-S325 drift as exactly what put the confirm path's grouped tests
into the errored bucket. Measured:

| File | Confirm path, S325 | Confirm path, now |
|---|---|---|
| C07 | four errored | **2 errored, 2 not applicable** — now matches the engine |
| C09 | four errored | **2 errored, 2 not applicable** |
| C20 | four errored | **2 errored, 2 not applicable** |
| C22 | four errored | **2 errored, 2 not applicable** |
| C14 | pools; 3 Moderate | pools; 3 Moderate — unchanged |
| C16 | pools; 2 Moderate, 1 Low | pools; 2 Moderate, 1 Low — unchanged |

So the census's standalone defect — "the confirm path has lost the S324 upfront checks" — is
closed. Column Goodness-of-Fit and Modality now return the same clean not applicable on the
confirm path that the engine returns, with the same message. Mahalanobis and Entropy still
error on both paths, because neither has an upfront guard of the kind those two tests gained:
Mahalanobis's upfront check counts columns only and not the ratio of rows to columns, and
Entropy has no upfront check at all. That asymmetry, which the census identified on C07, is
unchanged.

**What the census got right, and what has gone stale.**

- Right and still right: the trigger fires on five of the six that run; the same four tests
  are held pending; C07 is the only clean grouping and the only errored bucket on the engine
  path; C15 is the only file that does not run; the recurring not-applicable causes; the High
  verdict driven by untriggered tests everywhere.
- Stale and flagged: C07's shape, coverage and per-test detail. The header note flags this and
  its predicted counts are right, though the membership moved in ways the note does not state.
- **Stale and not flagged: the whole confirm-path finding**, in the per-file entries for C09,
  C20 and C22, in the "Across all seven" section, and in the first bullet of "What did not
  fit." Anyone citing the census's confirm-path defect today would be citing a fixed bug.

## What did not fit

- **The Mahalanobis guard moved further out of reach on C07, not closer.** Restoring eighteen
  columns raised the row requirement from 63 to 117 against an unchanged twelve rows per
  group. Widening a matrix makes this test harder to satisfy, not easier. Worth holding in
  mind wherever the row-to-column ratio guard is next discussed — the fix that made C07's
  matrix honest also made one of its tests less reachable.
- **`n/a` as a string is invisible to the role layer and decisive at the matrix layer.** C07's
  eighteen restored columns are 100 percent populated by the spreadsheet's reckoning and 33
  percent populated by the matrix's. Nothing in the census vocabulary distinguishes the two.
  The consequence here was a Missing Data flag at p = 6.8e-148 appearing on a file the census
  recorded as 0.0 percent missing.
- **The level-size census and the ecology census measured different stages, and C15 is where
  that shows.** The level-size census ran a mirror of `detectGroupAttributes` directly on each
  sheet and recorded C15's Data sheet as reaching zero data columns. That is true of role
  inference in isolation, and `99f75de`'s commit message counts C15 among the nineteen sheets
  that "now analyse." But the real pipeline never reaches role inference on C15. A sheet
  measured at one stage can be reported as fixed while the pipeline still fails at an earlier
  one.
- **The C14 disagreement is not a tree difference.** It was checked on both trees and both
  give the same thirteen. Whatever the explanation, it is not that C14 moved. Recorded and
  left as is.
- **The battery denominator is 29.** Coverage totals 29 on every file that runs, matching the
  S325 arithmetic (22 + 5 + 2 on C07). CLAUDE.md's prose describes 27 tests. Not investigated
  here, and it changes none of the above.
- **Probe artifacts.** `probe-s326.mjs`, `probe-s326.log`, `probe-s326-out.json` and the
  before-tree copies `probe-before.log` and `probe-before-out.json` are left untracked in the
  worktree root as the evidence behind every number in this report. They are throwaways.

---

`./scripts/dev.sh cmd-s326-ecology-rerun`

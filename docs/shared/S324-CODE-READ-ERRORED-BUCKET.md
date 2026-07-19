# S324 — The errored bucket (code read, read-only)

Read-only investigation. Nothing was changed. The batch run in step 1 is a read,
not a gate.

## Summary up front

The prompt's framing does not survive the read. It says nine fixtures return
errored results across five tests, and that every case traces to one cause: after
splitting rows by condition, at least one group is too small. The real numbers are
different, and the single cause is really three causes.

- The bucket holds **twelve errored results, on ten fixtures, across four tests** —
  not nine across five.
- Only **one** of the three causes is a group being too small. The other two are a
  test run on the wrong data shape, and a distribution the fitted family cannot
  cover. Both of those hit groups of 200 to 600 rows. Size is not the problem there.
- The word "errored" here does not mean a thrown exception. Zero tests threw. The
  bucket is the coverage classifier's `errored` state, set by a flag the per-group
  aggregator writes when no group produced a verdict.

## How "errored" is defined

`src/analysis/coverage.js` sorts every test result into one of five coverage
states: ran, notApplicable, unassessed, errored, pending. A result lands in
`errored` from either of two stamps (coverage.js line 47):

- the engine's thrown-test path — `error: true` or `flag: "ERROR"`, written by the
  try/catch in `src/analysis/engine.js` line 596; or
- the per-group aggregator's `erroredCoverage: true` flag, written in
  `src/analysis/aggregation.js` line 81.

I ran the full batch through a throwaway probe that mirrors `validate-batch.mjs`'s
input pipeline exactly, then listed every result carrying either stamp. **No result
carried the thrown-error stamp.** All twelve carry `erroredCoverage`.

`erroredCoverage` is set in one place. `aggregatePerGroup` (aggregation.js line 40)
runs a test once per condition group, keeps the groups that returned a verdict
(`applicable = perGroup.filter(r => r.flag !== "N/A")`, line 69), and if that set is
empty writes:

```js
return { name: proto.name, category: proto.category, flag: "N/A",
  erroredCoverage: true,
  description: "No group had sufficient data for this test.",
  details: [{ note: reason }] };
```

Two things follow from this that matter for the whole report.

1. The flag is `"N/A"`, not `"ERROR"`. The errored bucket is a coverage label sitting
   on top of an N/A result, not a crash.
2. The trigger is **every** group returning N/A, not "at least one group too small".
   One surviving group would keep the result out of the bucket. So the prompt's "at
   least one" is the wrong quantifier — it takes all of them.

The stock description on every one of these results is the same string: "No group
had sufficient data for this test." That sentence is written once in the aggregator
and is the same regardless of why the groups actually failed. It is misleading in
most of these cases. The real per-group reasons are below and they are not all about
sufficiency of data.

## The enumerated bucket

Twelve errored results. Read from the runner output, not from memory.

| Fixture | Test | Cluster | Group shape at dispatch | Why every group returned N/A |
|---|---|---|---|---|
| 01-densitometry-clean | Row-Mean Runs | Cross-replicate comparisons | 3 column groups, 35 rows each | No row-level condition labels |
| 02-densitometry-fabricated | Row-Mean Runs | Cross-replicate comparisons | 3 column groups, 35 rows each | No row-level condition labels |
| 16-densitometry-carlisle-overbalanced | Row-Mean Runs | Cross-replicate comparisons | 3 column groups, 60 rows each | No row-level condition labels |
| 17-densitometry-carlisle-clean | Row-Mean Runs | Cross-replicate comparisons | 3 column groups, 60 rows each | No row-level condition labels |
| 03-qpcr-clean | Column Goodness-of-Fit | Distribution shapes | 2 row groups, 25 rows each | Each column has < 30 observations |
| 04-qpcr-fabricated | Column Goodness-of-Fit | Distribution shapes | 2 row groups, 25 rows each | Each column has < 30 observations |
| 03-qpcr-clean | Modality Test | Distribution shapes | 2 row groups, 25 rows each | Each column has < 50 observations |
| 04-qpcr-fabricated | Modality Test | Distribution shapes | 2 row groups, 25 rows each | Each column has < 50 observations |
| 09-proteomics-clean | Column Goodness-of-Fit | Distribution shapes | 2 row groups, 200 rows each | Every column pre-skipped on shape (skew/kurtosis) |
| 12a-uniform-mixture-clean | Column Goodness-of-Fit | Distribution shapes | 2 row groups, 200 rows each | Every column pre-skipped on shape (skew/kurtosis) |
| 12b-uniform-mixture-fabricated | Column Goodness-of-Fit | Distribution shapes | 2 row groups, 200 rows each | Every column pre-skipped on shape (skew/kurtosis) |
| 19-inheritance-fabricated | Mahalanobis Row Outlier | Cross-replicate comparisons | 2 row groups, 600 rows each | Only 1 column; needs ≥ 3 |

Counts: twelve results, ten distinct fixtures (03 and 04 each appear twice), four
distinct tests. Not nine and five. The gap from the prompt's estimate is what you
would expect from the batch having grown since the estimate was written — the doc
still says 22 fixtures, the runner now walks 28.

The DS03 remark in the prompt is correct in shape. DS03's Distribution shapes
cluster has three tests: Column Goodness-of-Fit, Modality Test, and Entropy / Zipf
Analysis. Two of the three error; Entropy survives, because its per-column minimum
is 20 observations and each group has 25. So DS03 loses two of three, exactly as
stated — but for a group-size reason that is specific to those two tests' higher
minimums, not a property of the cluster.

## Per-test sections

### Row-Mean Runs — cause is data shape, not group size

- **File and function:** `src/tests/rowMeanRuns.js`, `testRowMeanRuns`. Dispatched
  from `engine.js` line 574 through `runPairVST(..., condCtx)`. On column-grouped
  data with two or more groups, `runPairVST` falls into `runPair`, which sees
  `useAggregate === true` and calls `aggregatePerGroup(testFn, condCtx.slices(), ...)`
  (engine.js lines 237-240). The slices here are **column** subsets — one per
  condition, all rows.
- **What the maths needs:** row-level condition labels. The test computes a mean per
  row, detrends the sequence of row means, and runs a Wald-Wolfowitz runs test on the
  signs. That is only meaningful within a single condition, where between-condition
  biological signal is absent. The test says so itself and returns N/A when labels are
  missing (rowMeanRuns.js lines 29-31).
- **Why every group fails:** the four fixtures are densitometry, which is
  column-grouped — the conditions live across columns, so there are no row labels.
  When `aggregatePerGroup` hands each column slice to `forSubMatrix`
  (conditionContext.js line 211), a column slice has no row conditions to carry, so
  the child context comes back with `rowConditions = null`. Every slice then hits the
  N/A guard. All groups N/A, so `erroredCoverage` fires. The groups are 35 to 60 rows.
  Size is never tested.
- **Is a minimum stated?** There are two row-count minimums in the file — `nR < 10`
  (line 22) and per-condition `idxs.length < 10` (line 85) — both stated plainly. But
  neither is what fails here. The guard that fires is the row-labels guard, which is a
  shape condition, not a size condition.
- **Where the failure surfaces:** a guard that returns an N/A result per group, then
  `erroredCoverage` at the aggregate. No throw, no non-finite value.

The deeper oddity: a row-condition test is being fanned out over column slices at
all. Row-Mean Runs cannot run on column-grouped data by construction, yet the
dispatch sends it there group by group to discover that three times over.

### Column Goodness-of-Fit — two different causes on different fixtures

- **File and function:** `src/tests/columnGof.js`, `testColumnGof`. Dispatched from
  `engine.js` lines 517-522: when `condCtx.rowGroups()` returns groups, it runs
  `aggregatePerGroup` over **row** groups.
- **Cause A — genuine group size (DS03, DS04):** these are qPCR, row-grouped into two
  conditions of 25 rows. The test's per-column applicability minimum is 30
  observations (columnGof.js line 65: `if (vals.length < 30)` → skip that column).
  With 25 rows per group, every column in every group skips on the count. All columns
  skipped means the test returns N/A (line 233 region), and with both groups N/A the
  aggregate errors. This is the one place the prompt's premise holds. The needed
  minimum is 30 observations per column, and it is **stated** in the code as the
  literal `30`.
- **Cause B — distribution shape, not size (DS09, DS12a, DS12b):** these are
  proteomics and general assays, row-grouped into two conditions of **200 rows** each.
  Every column clears the 30-observation bar with room to spare. They fail a later,
  per-column pre-skip: the skew and kurtosis gate at columnGof.js lines 107-115. The
  fitted family set is {Normal, Poisson, NB}; a column whose sample skew `|γ₁| > 1.5`
  or whose excess kurtosis is very negative is routed to N/A because none of those
  families covers its shape. On these fixtures every column is heavy-skewed
  (γ₁ around 1.8 to 3.8), so every column pre-skips, both groups go N/A, and the
  aggregate errors. Group size is irrelevant — these are the largest groups in the
  bucket.
- **Is a minimum stated?** The size minimum (30) is stated. The shape gate is stated
  too (the `SKEW_GATE` and kurtosis constants, lines 40-42), but it is not a size and
  cannot be reduced to one.
- **Where the failure surfaces:** per-column skips accumulate; when none survives the
  test returns N/A; the aggregate stamps `erroredCoverage`. No throw.

### Modality Test — genuine group size

- **File and function:** `src/tests/modality.js`, `testModality`. Dispatched from
  `engine.js` lines 524-528 over row groups, same shape as Column Goodness-of-Fit.
- **What the maths needs:** the dip statistic against the tabulated Hartigan null
  needs enough observations per column to be meaningful. The stated per-column
  minimum is 50 observations (`MIN_N = 50`, modality.js line 62; enforced at line
  186, `if (vals.length < MIN_N)` → skip). There is also a distinct-value minimum of
  15.
- **Why every group fails:** it errors only on DS03 and DS04, the 25-row qPCR groups.
  25 is below 50, so every column skips on the count, both groups return N/A, and the
  aggregate errors.
- **Is a minimum stated?** Yes, `MIN_N = 50`, a named constant.
- **Where the failure surfaces:** per-column skip, then N/A, then `erroredCoverage`.
  No throw.

### Mahalanobis Row Outlier — cause is column count, not row-group size

- **File and function:** `src/tests/mahalanobis.js`, `testMahalanobisOutlier`.
  Dispatched from `engine.js` lines 454-456: when `mahalCtx.rowGroups()` returns
  groups it runs `aggregatePerGroup` over row groups.
- **What the maths needs:** an invertible covariance matrix across the replicate
  columns. That needs at least three columns, and for a stable estimate at least
  three times as many rows as columns. Both are stated at the top of the file:
  `if (nC < 3)` (line 24) and `if (nR < 3 * nC)` (line 26), with a matching check on
  valid rows at line 40.
- **Why every group fails:** DS19 has a **single** data column. Each row group is 600
  rows by 1 column. The `nC < 3` guard fires in every group, so both go N/A and the
  aggregate errors. The failure is a shortage of columns. The 600-row groups are far
  above any row minimum.
- **Is a minimum stated?** Yes, both the column minimum (3) and the row minimum
  (3 × nC) are explicit.
- **Where the failure surfaces:** the `nC < 3` guard returns N/A per group, then
  `erroredCoverage`. No throw.

## The design question

The prompt asks, per test, whether a group-size check could move upfront — before any
work is done — so the test returns not-applicable instead of erroring. The honest
answer needs two columns, because for most of these the check that belongs upfront is
not a group-size check at all, and one case cannot be moved upfront by any size check.

"Movable" below means: the condition is knowable before the per-group dispatch runs,
so the engine could return a clean not-applicable at the dispatch site instead of
fanning out, watching every group go N/A, and stamping errored.

| Test (fixtures) | Real cause | Upfront check that would fix it | Movable? |
|---|---|---|---|
| Row-Mean Runs (01, 02, 16, 17) | No row-condition labels — wrong data shape | "Is this column-grouped / are there no row conditions?" Return N/A, do not dispatch. | Yes — but the check is data shape, not size |
| Column Goodness-of-Fit (03, 04) | Each group < 30 rows | "Does any row group have ≥ 30 rows?" | Yes — size check, minimum 30 |
| Modality Test (03, 04) | Each group < 50 rows | "Does any row group have ≥ 50 rows?" | Yes — size check, minimum 50 |
| Column Goodness-of-Fit (09, 12a, 12b) | Family cannot cover the columns' shape | None. Groups are 200 rows. Only known after the per-column skew/kurtosis pre-skip runs. | No — not a size failure |
| Mahalanobis Row Outlier (19) | Only 1 column; needs ≥ 3 | "Does the dataset have ≥ 3 columns?" A whole-dataset fact. | Yes — column check, not row-group size |

So the tests do not share one minimum, and they do not even share one **kind** of
minimum. Reading the movable rows top to bottom, the distinct thresholds are:

- Row-Mean Runs: presence of row-level condition labels (a boolean, not a size).
- Column Goodness-of-Fit: 30 observations per column.
- Modality Test: 50 observations per column.
- Mahalanobis Row Outlier: 3 columns, and 3 × columns rows.

And one row — Column Goodness-of-Fit on the 200-row fixtures — has no size minimum
that would help. That case would still error under any upfront group-size gate,
because the groups are large and the columns are individually fine on count; the
distribution simply falls outside the fitted family set. Moving it out of the errored
bucket would take a different fix — either widen the family set, or treat "no column
matched an applicable family" as not-applicable rather than as a dispatch that
completed with nothing.

A cross-cutting note on the mechanism. The size checks these tests already carry are
**per column, inside the test**, while the group gate that lets a group through is
**per group row-count ≥ 3**, in `rowGroups()` (conditionContext.js line 144,
`minPerGroup = 3`). The three-row floor is far below what Column Goodness-of-Fit (30)
and Modality (50) actually need, so a group can pass the gate that admits it and then
fail every column inside. That mismatch is why the errored state exists for the
genuine-size cases: the dispatcher and the test disagree about what "enough" means,
and nobody reconciles the two before the work starts.

## What did not fit

The main finding is that the prompt's single cause is really three, and only one is
group size. Laid out plainly:

1. **A test on the wrong data shape (Row-Mean Runs, four fixtures).** This is a
   row-condition test being dispatched over column slices. It fails for lack of row
   labels, not lack of rows. It is also the one case where the dispatch itself looks
   wrong — the test cannot run on column-grouped data at all, yet it is sent there
   group by group. Worth a second look outside this read.

2. **A distribution the family set cannot cover (Column Goodness-of-Fit, DS09, DS12a,
   DS12b).** Groups of 200 rows, every column heavy-skewed past the pre-skip gate. No
   size minimum is in play. A group-size gate moved upfront would leave these three in
   the errored bucket untouched.

3. **A column shortage (Mahalanobis Row Outlier, DS19).** One column against a
   three-column minimum. The relevant fact is a whole-dataset property, known before
   any row splitting.

Only the qPCR pair (DS03, DS04, Column Goodness-of-Fit and Modality) matches the
prompt's description of a group too small after a row split.

Two smaller notes for the record:

- Nothing throws. The severity summary from `validate-batch.mjs` is unchanged and
  correct — these results are N/A, so they never move a severity. The errored state
  is visible only through the coverage classifier, not through severity or the batch
  gate. `validate-batch.mjs` reports 28/28 with this bucket present, because the
  bucket does not touch any severity.
- The shared description "No group had sufficient data for this test" is written once
  in the aggregator and reused for all twelve. For eight of the twelve — the
  Row-Mean Runs four, the Column Goodness-of-Fit shape three, and the Mahalanobis one
  — "sufficient data" is the wrong words. The data was sufficient; the shape, the
  labels, or the column count was wrong.

---

`./scripts/dev.sh cmd-s324-errored`

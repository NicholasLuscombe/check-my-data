# S349 Part 5 — null-specification census

Read-only. Nothing under `src/` was changed. No batch was run, because a census that
changes nothing cannot move it.

`git status --porcelain -- src/` at every checkpoint in this session: **0 lines**.

## What this is, and what it is not

Part 3 measured that Cross-Condition Consistency's Stage-1 null destroys a matched-pair
structure the data actually has. Part 4 found the same free shuffle on the column-grouped
branch, where pairing is universal rather than incidental.

The S348 seed sweep cannot find the general case. It detects tests whose verdict moves
between draws. A test with the same mis-specification but a stronger signal sits still
across every seed and reads as a stable result. The 480 clean runs bound how many tests
are *unstable*. They say nothing about how many share the *assumption*.

This census answers the second question by reading source. Nothing here is measured.
Every row states its basis, and no row is labelled measured.

---

# Part 5a — the membership set

## The membership rule

A dispatch entry is a **member** if, at its dispatch site, the test function is handed
condition-partitioned data or the partition itself. Four mechanically detectable routes;
any one is sufficient.

| | route | what it means |
|---|---|---|
| **M1a** | the entry calls `runPair(` or `runPairVST(` | when `useAggregate` is true these become `aggregatePerGroup(fn, condCtx.slices())`, so the test function receives one condition's sub-matrix per call — the **column-grouped** branch |
| **M1b** | the entry calls `aggregatePerGroup(` directly | the partition is `condCtx.rowGroups()` — the **row-grouped** branch |
| **M2** | a `ConditionContext` is passed as a call argument | `condCtx`, `vstCondCtx`, `mahalCtx`, or the `childCtx` an `aggregatePerGroup` stage hands its callback |
| **M3** | `condCtx.slices()` is passed as a call argument | the partition itself, without the context object |

The register is the dispatch layer, not a document. Two dispatch surfaces exist and both
were read: `src/analysis/engine.js` (the `tests` array) and `src/analysis/confirmGrouping.js`.
`grep` over `src/` confirms no test function is imported anywhere else — the only other
importers are two MiniCards pulling exported *constants* (`DIP_GATE`, `Z_THRESH`), not
test functions.

The rule was applied by a script that carves the `tests` array by its entry heads and
tests each entry body for the four markers. The names below are that script's output.
Every hit was then re-read at its line in `engine.js`, and every non-hit was re-read to
confirm the test receives only a matrix.

## The count, and what it counts

**20.** That is a count of **dispatch entries in `engine.js` whose test function receives
condition-partitioned data on at least one branch.** It is not a count of test modules,
not a count of fixtures, and not a count of tests that compare conditions.

Four numbers now circulate and they count different things:

| number | what it counts |
|---|---|
| 27 | CSV fixtures in `test/fixtures/` |
| 29 | entries in the `tests` array in `engine.js` — re-counted here from source; the "28 dispatch entries" figure in circulation is stale |
| 29 | test modules in `src/tests/` (30 files, one of which is the `crossConditionProperties.js` registry) |
| **20** | **members of this census** |

20 members + 9 exclusions = 29 dispatch entries. The arithmetic closes.

## The 20 members

Listed in dispatch order, with the marker that admitted each.

| # | dispatch key | admitted by | branch reached |
|---|---|---|---|
| 1 | Inter-Replicate Correlation | M3 `condCtx.slices()` | both |
| 2 | Duplicate Detection | M1a `runPair` | column-grouped (replicates only) |
| 3 | Residual Spike Correlation | M2 `ctx` | both |
| 4 | Baseline Balance | M2 `condCtx` | both |
| 5 | Cross-Condition Rank Corr. | M2 `condCtx` | both |
| 6 | Cross-Condition Consistency | M2 `ctx` | both |
| 7 | Mahalanobis Row Outlier | M1a + M1b | both |
| 8 | Blocked Mahalanobis | M2 `ctx` | both |
| 9 | Kurtosis | M1a + M2 `childCtx` | both |
| 10 | Entropy / Zipf Analysis | M1b | row-grouped only |
| 11 | Column Goodness-of-Fit | M1b | row-grouped only |
| 12 | Modality Test | M1b | row-grouped only |
| 13 | Autocorrelation | M1a | column-grouped only |
| 14 | Windowed Autocorrelation | M1a | column-grouped only |
| 15 | Runs Test | M1a + M2 `childCtx` | both |
| 16 | LOESS Residual Analysis | M1a | column-grouped only |
| 17 | Row-Mean Runs | M1a + M2 `childCtx` | both |
| 18 | Selective Noise | M1a + M2 `childCtx` | both |
| 19 | Regional Noise Homogeneity | M1a | column-grouped only |
| 20 | Missing Data Pattern | M2 `condCtx` | both |

Three cross-checks on this set:

- `CLAUDE.md` records "10 condition-aware tests". Exactly ten test modules name `condCtx`
  in their own source: Blocked Mahalanobis, Missing Data Pattern, Row-Mean Runs, Runs,
  Cross-Condition Consistency, Cross-Condition Rank Correlation, Residual Spike
  Correlation, Baseline Balance, Selective Noise, Kurtosis. All ten are members. The set
  is twice that size because ten more receive a condition *slice* without ever naming the
  context.
- Inter-Replicate Correlation is the case that shows why a name-based rule fails. It
  consumes the partition (`condCtx.slices()`) and never mentions `condCtx`. A rule keyed
  on the identifier would have missed it.
- `confirmGrouping.js` dispatches four tests — Mahalanobis Row Outlier, Entropy / Zipf,
  Column Goodness-of-Fit, Modality Test — all through `aggregatePerGroup` on
  `rowGroups()`. All four are already members via `engine.js`. That surface adds no new
  member.

## The 9 exclusions

Each was re-read at its dispatch line. Each receives the full matrix (or the full matrix
plus the raw-string matrix) and no condition object.

| dispatch key | why excluded — read at `engine.js` |
|---|---|
| Benford's Law | `testBenford(matrix, rng)` |
| Benford's Law (2nd Digit) | `testBenford2(matrix, rng)` |
| Terminal Digit Uniformity | `testTerminalDigits(matrix, assay)` |
| Decimal Precision | `testDecimalPrecision(matrix, rawMatrix, assay)` |
| Value-Frequency Spike | `testValueFrequencySpike(matrix, rawMatrix)` |
| Sequential Duplication | `testSequentialDuplication(matrix, assay)` |
| Constant-Offset Blocks | `testConstantOffset(hasVST ? vstMatrix : matrix, rng)` — **deliberately** bypasses `aggregatePerGroup` so it sees all column pairs including cross-condition ones (comment at `engine.js:400`). It is excluded because nothing partitions its input, not because it ignores conditions |
| Noise Scaling With Measurement Size | `testMeanVariance(matrix, assay)` |
| Within-Row Variance | `testWithinRowVariance(matrix, rng, rowSemantics)` |

Constant-Offset Blocks is the exclusion worth watching. It sees cross-condition column
pairs and its null is a row shuffle. It is out of this census only because the membership
rule is about *partitioned input*, and it takes none. A census drawn on "sees
cross-condition data" rather than "receives condition-partitioned data" would include it.
That difference is the clearest illustration of the floor stated at the end.

---

# Part 5b — what each null does

## How to read the classification

- **Class 1** — reassigns or pools units in a way that destroys subject correspondence
  across conditions. The CCC flaw.
- **Class 2** — no such reassignment, but an analytic null whose independence assumption
  paired data violates.
- **Class 3** — unaffected, with a stated reason.

**Basis** is one of *source read* (I read the arithmetic), *structure* (it follows from
the dispatch shape, not from the test's own body), or *judgement* (a reasoned inference I
did not and could not settle by reading alone). Nothing is labelled measured.

**Direction** matters because pairing inflates apparent similarity. A test that can only
flag on difference is not exposed the way a similarity-flagging test is. That filter is
what neutralised `01` and `17` in Part 4c.

## The `condCtx.paired` finding

The dispatch predicted a trap. Source refines it in three ways, and the refinements
matter.

1. **`paired` has exactly one reader in all of `src/`.** `engine.js:203`:
   `const isConditionsMode = condCtx.type === 'column-grouped' && !condCtx.paired;`
   It is read as a *"the columns are not replicates"* signal, to N/A the
   replicate-comparison tests. It is never read as a pairing signal. **No test module
   reads it.** `grep -rn "paired" src/tests/` returns one hit and it is a prose string in
   a not-applicable message.
2. **It is not simply true on column-grouped and false on row-grouped.** From
   `conditionContext.js:59–72`: `paired = true` only when real column groups exist;
   `false` for conditions-mode column-grouped (each data column its own condition),
   `false` for row-grouped, `false` for none. So the column-grouped branch carries both
   values depending on sub-branch.
3. **A child context is always unpaired.** `forSubMatrix` rebuilds the child with
   `groups: null` (`conditionContext.js:211–260`), so any `childCtx` has `paired === false`
   regardless of the parent. Kurtosis, Runs, Row-Mean Runs and Selective Noise receive a
   parent context with its real `paired` on the pooled path, and a forced-`false` child on
   the column-grouped aggregate path — the exact path where the parent is paired. A test
   that started reading `paired` today would read the wrong value on the branch where it
   matters most.

Reachability per member, therefore:

| reachability | members |
|---|---|
| **Real value reachable** (parent context passed) | Residual Spike Correlation, Baseline Balance, Cross-Condition Rank Corr., Cross-Condition Consistency, Blocked Mahalanobis, Missing Data Pattern |
| **Reachable but forced `false`** on the column-grouped aggregate path | Kurtosis, Runs Test, Row-Mean Runs, Selective Noise |
| **Not reachable** — only a matrix or a slice arrives; `CondSlice` carries no `paired` field | Inter-Replicate Correlation, Duplicate Detection, Mahalanobis Row Outlier, Entropy / Zipf, Column Goodness-of-Fit, Modality Test, Autocorrelation, Windowed Autocorrelation, LOESS, Regional Noise |

*Basis: source read.*

## The census table

| # | test | null type | unit reassigned / what is held fixed | pools across conditions? | direction | `paired` reachable | class | basis |
|---|---|---|---|---|---|---|---|---|
| 6 | **Cross-Condition Consistency** | permutation, B = 999/499/199 | whole row-tuples, Fisher-Yates over the **pooled** set of all conditions' rows; pseudo-condition sizes held fixed | **yes** — the pool is every condition's rows | both (per-property `forensicDirections`) | yes | **1** | source read |
| 3 | **Residual Spike Correlation** | permutation, N_PERM = 999 | each group's per-row residual vector shuffled **independently within the group**; group sizes and top-K size held fixed | **yes** — statistic is max pairwise top-K overlap across groups | similarity (excess overlap) | yes | **1** | source read |
| 2 | **Duplicate Detection** | analytic (five sub-tests, BH-FDR over 5) | none — no resampling anywhere | **yes** — the within-row sub-test runs on `fullMatrix`, all column pairs, including cross-condition | similarity (excess coincidence) | no | **2** | source read |
| 20 | **Missing Data Pattern** | analytic (Fisher exact 2×2 / χ² contingency, BH-FDR) | none | **yes** — pairwise sub-signal runs over all column pairs on the full matrix | difference (association present) | yes | **2** | source read |
| 5 | **Cross-Condition Rank Corr.** | analytic (Fisher-z vs leave-one-out mean, one-sided) | none | **yes** — ρ between condition profiles | similarity (`zStat > 0` only) | yes | **does not fit** | source read + judgement |
| 1 | Inter-Replicate Correlation | analytic (Fisher-z, BH-FDR) + within-pair permutation scan | scan shuffles row order within one replicate pair | no — pairs are built strictly inside one slice | similarity (`excess > minExcess`) | no | 3 | source read |
| 4 | Baseline Balance | analytic (one-way ANOVA per feature, then binomial + KS on the p-values) | none | conditions enter, but each ANOVA is confined to one feature | similarity (binomial arm on excess p > 0.95); both (KS arm) | yes | 3 | source read + judgement |
| 7 | Mahalanobis Row Outlier | analytic (χ²(p) per row, binomial on exceedance count) | none | no — per-condition (μ, Σ) by dispatch | difference (rows far from the rest) | no | 3 | source read |
| 8 | Blocked Mahalanobis | permutation, N_PERM = 4999/999 | rows shuffled **within one condition**; window schedule held fixed | no — statistic is per-slice; BH-FDR spans conditions | difference (block diverges from its own condition) | yes | 3 | source read |
| 9 | Kurtosis | simulation (parametric, N_SIM = 1999 Gaussian draws) | nothing observed is reassigned — replicates are simulated per row | no — statistic is within-row replicate differences | similarity (leptokurtic suppressed by the directional gate) | forced `false` | 3 | source read |
| 10 | Entropy / Zipf Analysis | parametric bootstrap, B = 999 | none — columns are simulated from a fitted model | no — per-column within one slice | both (two-sided, `min(pLow,pHigh)*2`) | no | 3 | source read |
| 11 | Column Goodness-of-Fit | parametric bootstrap with refit, B | none | no — per-column within one slice | both (two-sided) | no | 3 | source read |
| 12 | Modality Test | analytic (table-based dip; the pre-S159b bootstrap was retired) | none — consumes no PRNG | no — per-column within one slice | difference (multimodality) | no | 3 | source read |
| 13 | Autocorrelation | analytic (lag-1 ACF, SE = 1/√n, BH-FDR; verdict on `minAdjP`) | none | no — within-row differences, sequenced by row | both (two-sided; forensic target is positive r₁) | no | 3 | source read |
| 14 | Windowed Autocorrelation | permutation, N_PERM = 999/499/199 | difference sequence shuffled **within one replicate pair**; window schedule held fixed | no | both (`|r|`) | no | 3 | source read |
| 15 | Runs Test | analytic (Wald-Wolfowitz normal, BH-FDR; verdict on `minAdjP`) + within-pair permutation scan | scan shuffles the difference sequence within one pair | no — within-row differences; `rowConditions` only splits the scan | both (too few = clustering, too many = alternating) | forced `false` | 3 | source read |
| 16 | LOESS Residual Analysis | permutation, N_PERM = 4999/499 | row order shuffled across the slice; residuals and fitted values carried together | no | both (window variance above or below global) | no | 3 | source read |
| 17 | Row-Mean Runs | analytic (Wald-Wolfowitz on detrended row-mean residuals) | none | no — one sequence per condition, never compared to another | both (source comment: "both too few … and too many … are forensic signals") | forced `false` | 3 | source read |
| 18 | Selective Noise | analytic (Bartlett χ²(k−1) across columns; Levene per column for display) | none | no — Bartlett is across **columns** inside one slice | difference (variance heterogeneity) | forced `false` | 3 | source read |
| 19 | Regional Noise Homogeneity | permutation, N_PERM = 4999/499 | residual rows shuffled across the slice | no | difference (window/global variance ratio, either sign) | no | 3 | source read |

Counts: **Class 1 = 2. Class 2 = 2. Class 3 = 15. Does not fit = 1.** Total 20.

Null types across the 20: **7 permutation, 3 simulation or parametric bootstrap, 10
analytic.** Ten analytic members is why the census could not be an instrumented probe —
there is no shuffle to inspect on half the set.

## The classes do not carve the set cleanly

One test will not fit any of the three, and forcing it would hide the reason.

**Cross-Condition Rank Correlation.** Its defect is neither of the two the classes name.

It builds one profile per condition as the row-means of that condition's slice, then
drops nulls independently per condition (`.filter(v => v !== null)`), then compares two
profiles by `spearmanR(p1.slice(0, n), p2.slice(0, n))` with `n = min(len1, len2)`
(`rankCorrelation.js:20`, `:33–35`). The correspondence between the two profiles is
therefore **positional after independent filtering and truncation**, not a join on subject
identity.

- It is not Class 1. Nothing is resampled; there is no null that destroys a correspondence.
- It is not Class 2 in the sense the class defines. Its Fisher-z SE, `1/√(n−3)`, assumes
  *n independent subjects* — which paired data satisfies. The `√(k/(k−1))` inflation
  treats the k condition-pair z-values as independent, and they are not, because pairs
  drawn from c conditions share a condition. That is a real independence violation, but it
  comes from condition-pair overlap, not from subject pairing.
- It is not Class 3. Every Class 3 reason on offer fails. It *does* make a cross-condition
  comparison. Its null does not preserve pairing — it never establishes pairing. It is not
  a within-subject statistic. And its data is not structurally unpairable: on the
  column-grouped branch the conditions are the same rows, so a real correspondence exists
  and the test declines to use it.

The honest statement is that CCR **asserts** a correspondence rather than destroying one.
On column-grouped data it asserts one that exists but may be silently misaligned by
independent null-filtering. On row-grouped data the conditions are disjoint row sets, so
it asserts a correspondence between different subjects that does not exist at all — and
the code path is identical on both branches. That is a third failure mode and this
scheme has no name for it.

Per the dispatch, I am stopping at the classification rather than proposing one.

*Basis: source read for the mechanism; judgement for the conclusion that no class fits.*

## Notes on the Class 1 and Class 2 rows

**Cross-Condition Consistency (Class 1).** Verified at source in this session, not carried
from Part 3. `crossConditionConsistency.js:448–470`: a Fisher-Yates over `permRow` spanning
all `totalRows` tuples pooled across every condition, after which the tuples sitting in
`[rowStart[k], rowStart[k] + rowsPerCond[k])` become pseudo-condition k. On column-grouped
data a tuple is one subject's replicate vector under one condition, so a subject
contributes one tuple per condition and the shuffle can place both in the same
pseudo-condition or split them arbitrarily. Subject correspondence is destroyed.

**Residual Spike Correlation (Class 1).** The same mechanism, arrived at independently.
`residualSpikeCorrelation.js:135–160`: each group's residual buffer gets its own
Fisher-Yates, then the max pairwise top-K overlap is recomputed. The null is "row identity
carries no information about where the residual spikes are, in any condition." That is the
right null for the fabrication hypothesis and the wrong null for paired data — a subject
that is genuinely noisy (a poor sample, a plate-edge well) is noisy in *both* conditions
for reasons that have nothing to do with editing, and the independent shuffle attributes
all of that correspondence to the alternative. The test flags on similarity, which is the
exposed direction.

RSC also carries the CCR-shaped alignment problem on its row-grouped branch:
`const nFeatures = Math.min(...slices.map(s => s.matrix.length))` with the comment "for
row-grouped, truncate to the shortest condition (position-matched features)". Row *r* of
one condition and row *r* of another are different subjects there. Its Class 1 membership
is settled on the column-grouped branch, where the pairing is real.

**Duplicate Detection (Class 2).** Five sub-tests, not four — `rawPs = [collisionP,
rowDupPValueAdj, withinRowP, bestBlockP, partialRowP]`, BH-FDR over five
(`duplicateDetection.js:807–808`). `CLAUDE.md`'s "4-p BH-FDR" is stale.

Two of the five read the group's own sub-matrix; three read `wrMatrix`, which is the full
cross-condition matrix (`wrMatrix = fullMatrix || matrix`, `:21`). The one that matters
here is the within-row coincidence test. It counts exactly-equal cell pairs *inside a row*
across **all** column pairs, including pairs that straddle conditions, and tests the count
against `binomialSurvival(obs, nPairs, pHat)` where `pHat` comes from row-mean-binned
per-column marginal frequency overlap (`:311–322`, `:351–355`). The null is that two cells
in the same row are independent draws from their columns' bin-local marginals. On a paired
column-grouped design those two cells are repeated measures of the same subject, and
repeated measures coincide far more often than independent draws.

The source already knows the mechanism one layer in — `:273–275` says global frequency
overlap underestimates collision probability "because replicates within a row share the
same base value" — and mitigates it by binning rows at 30. Binning by row mean is a proxy
for subject identity, and it was reasoned about for replicates inside one condition, not
for column pairs that cross conditions.

A second observation, recorded but not classified: on the paired column-grouped branch
Duplicate Detection is dispatched per group, and the three `wrMatrix` sub-tests compute the
same value on every one of those G calls. Those G identical p-values then reach
`aggregatePerGroup`, which is not on the Fisher exemption list for this test. I read the
mechanism; I did not measure its effect on any fixture. *Basis: source read for the
duplication, judgement that it is worth recording.*

**Missing Data Pattern (Class 2).** Sub-signal (a) walks every column pair on the full
matrix and builds a 2×2 table of co-missingness across rows, tested by Fisher's exact
(`missingDataPattern.js:76–95`). Fisher's null is that missingness in column *i* is
independent of missingness in column *j*. On a paired design a subject missing under one
condition is very likely missing under the other — a failed sample, a dropout — so the
null is false for reasons that are not fabrication. The pairing is what makes it false.

Sub-signal (b) is different and is fine: it crosses condition against missingness using
`rowConditions`, which partitions **disjoint** row sets, so the observations are
independent subjects.

## Notes on the Class 3 reasons

Most Class 3 rows earn the verdict the same way: the statistic never crosses a condition
boundary. Under `aggregatePerGroup` the test function receives one condition's sub-matrix
and can only compute within it; the crossing happens later, in the aggregator.

The rows worth naming individually:

- **Kurtosis, Runs Test, Autocorrelation, Windowed Autocorrelation** all reduce a row to
  *within-row replicate differences* before doing anything else. That is a within-subject
  statistic. A subject effect is common to both replicates and cancels in the difference,
  so cross-condition pairing cannot inflate it.
- **Row-Mean Runs** builds one sequence per condition and never compares two sequences;
  the verdict is `min` over the per-condition p-values.
- **Selective Noise** runs Bartlett across **columns** within a slice. Its comparison axis
  is columns, not conditions.
- **Baseline Balance** is the row I am least certain about, and I have labelled it partly
  judgement. On the column-grouped branch each feature is a *row*, and the ANOVA compares
  condition column-groups **within that one row** — one subject per ANOVA, so the subject
  effect is a common additive constant that cancels in F. Two caveats I could not settle
  by reading: on the row-grouped branch the features are *columns*, and the second stage
  (binomial on excess p > 0.95, plus KS) treats the per-feature p-values as i.i.d.
  Uniform(0,1) when columns are replicates of one measurement and are strongly correlated.
  That is an independence violation, but it is cross-column, not cross-condition, so it
  does not move the row to Class 2. It is a real finding and it is not this census's
  question.
- **Blocked Mahalanobis** shuffles rows strictly within one condition and its statistic is
  "does this block diverge from *its own* condition's background". Difference-flagging,
  within-condition. Its BH-FDR family spans conditions — see below.

## One finding that is not a per-test row

The membership rule reaches `aggregatePerGroup`, and the aggregator has an independence
assumption of its own.

`aggregation.js:213–218` combines the per-group p-values by Fisher's method:
χ² = −2 Σ ln(p_i) on 2k degrees of freedom. `:147–157` corrects the worst-group arm by
Šidák, `1 − (1 − p)^G`. Both are exact **only if the per-group p-values are independent**.

On the **row-grouped** branch they are: the groups are disjoint row sets, so different
subjects, and the assumption holds.

On the **column-grouped** branch they are not. The groups are the same rows measured under
different conditions — that is what `paired = true` means — so every group's statistic is
computed on the same subjects. The per-group p-values are correlated by construction, and
Fisher can only promote (`:221–222`). Seven tests are exempted from Fisher for other
reasons; the rest of the column-grouped members reach it.

This is Class-2-shaped: an analytic combination whose independence assumption paired data
violates. I have kept it out of the per-test table because it is not any test's null — it
is one shared combiner sitting downstream of many of them. Whether it moves a verdict on
any fixture is a measurement and this census contains none.

*Basis: source read for the assumption and for which branch violates it; judgement for
the claim that it is worth a section of its own.*

---

# What this census cannot establish

**The Class 1 count is a floor.** Two is the number of members whose null I read and found
to destroy cross-condition subject correspondence. It is not the number of such nulls in
the codebase. Any null built somewhere the membership rule does not reach is invisible to
this census, in exactly the way Cross-Condition Consistency was invisible to the seed
sweep.

Concretely, the rule does not reach:

- **Tests that see cross-condition data without receiving a partition.** Constant-Offset
  Blocks is the live example. It deliberately bypasses `aggregatePerGroup` to reach
  cross-condition column pairs, and its null is a row shuffle. It is excluded because
  nothing partitions its input. It may or may not have the same flaw; this census does not
  say.
- **Nulls below the dispatch layer.** The rule keys on what a test function is *handed*.
  A test handed only a matrix can still rebuild a grouping internally from something else,
  and nothing in this rule would see it.
- **The aggregation layer**, which the rule reaches only incidentally. The Fisher and
  Šidák finding above came from following `aggregatePerGroup`, not from the rule itself.

**Nothing here is measured.** Every row is a read of source, an inference from dispatch
shape, or a judgement, and each row says which. A Class 1 row asserts that a null is
mis-specified for paired data. It does not assert that any fixture's verdict is wrong, or
that any verdict would move if the null were changed. Those are separate quantities and
this census measures neither.

**A count is not a verdict.** The classes did not carve the set cleanly — one test in
twenty fits none of the three, and the reason it does not fit is a failure mode the scheme
has no name for. A guard written on the number 2 would not have caught that.

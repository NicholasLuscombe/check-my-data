# Session 294 — Test-consistency source-derivation read (V1X §2.6)

**Read-only.** No `src/` file was edited. No batch was run. Nothing in the engine changed. This artifact is a source-grounded classification so a later session can scope fixes from a verified table rather than from the seed list in V1X §2.6.

It runs in two ordered phases. Phase 1 confirms the three demonstrated axes at source and prunes the seed list of candidate further axes down to the ones that are real. Phase 2 classifies the battery against only the axes Phase 1 confirmed. Phase 2 is partial by design (the entry calls it larger than a session); the coverage boundary is stated where it falls.

All line references are against the origin checkout as read this session.

---

## Phase 1a — the three demonstrated axes, verified at source

### Axis 1 — cross-column pooling manufactures a guard-passing property (Benford false positive). **Accurate.**

- Benford receives the **whole data matrix** and pools every column into one value list: `testBenford(matrix, rng)` at `engine.js:307`; inside, `const allVals = matrix.flat()...` at `benford.js:13`.
- The order-of-magnitude span guard is computed on that pooled list: `absVals = allVals.map(Math.abs)` at `benford.js:23`, then `actualSpan = robustLogSpan(absVals)` at `:24`, and `if (actualSpan < 1.5) return N/A` at `:25`. The guard sees the **pooled** span, not any single column's span.
- So on `[SL, Total.distance]`, the ≥1.5 precondition is met by `Total.distance` (span 1.69) while `SL` alone (span 0.095) would be N/A. Benford then scores leading digits over the pooled list and can flag. The §2.6 description is correct.

### Axis 2 — the collision null is the column's own value-frequency distribution. **Accurate.**

- Exact Duplicate Detection's first sub-test scores same-value collisions against `p1` (`collisionP = binomialSurvival(collisionObs, collisionNPairs, p1)` at `duplicateDetection.js:173`).
- For continuous data (`dp > 0`), `p1` is the empirical Herfindahl index of the column's own value frequencies: the `else` branch at `duplicateDetection.js:132–137` sets `p1 = hhi` with source `"empirical"`, where `hhi = Σ(freq/N)²`. A defect that repeats values inflates that index, so the expected collision count rises to meet the observed count and the p-value returns near 1.0. The §2.6 description is correct.

**Owed-correction wording captured verbatim.** The safe-claim comment is at `duplicateDetection.js:135` (the §2.6 entry cites `:134`, which is one line high — line 134 is the sentence before it). The three-line continuous-branch comment reads verbatim:

```
// Continuous (float) data: empirical HHI. Uniform-bins null assumes equal
// probability across the range, which is wrong for any realistic distribution.
// HHI circularity is not a concern for float data (high precision → many bins).
```

The load-bearing sentence to correct is line 135: `// HHI circularity is not a concern for float data (high precision → many bins).` CORPUS-03's `SL` (continuous, two decimals, structured four-times recurrence) is the counterexample to that sentence. The METHODOLOGY §1.1 half of this claim was already corrected in the previous session; this source comment is the remaining half.

### Axis 3 — display-only evidence paths and digit-shadow misattribution. **Accurate.**

- The same-column duplicate pairs are collected in `crossRowSameColLocs` at `duplicateDetection.js:603–612`, merged into `allLocs` at `:697`, and returned only as `details` at `:717`. They are **not** in `rawPs` (the four scored sub-tests) at `:692`. The pairs are listed as evidence and scored by nothing. Correct.
- Value-Frequency Spike's `pass:"digit"` operates on the **fractional-digit substring** of each cell (`1.234 → "234"`), documented at `valueFrequencySpike.js:11–13` and tagged at `:235`; its pass-1 also pools via `matrix.flat()` at `:117`. It is a frequency test on fractional substrings, so a set of distinct values each repeated a few times over-represents those substrings and the test fires on the recurrence's digit shadow rather than on independent signal. Correct.

**All three demonstrated axes are accurate as described, with the single line-number correction noted (`:134` → `:135`).**

---

## Phase 1b — seed list pruned

Each candidate-further-axis marked real / not-real / needs-fixture, with the source location where a correct statistic could still yield a wrong or non-comparable verdict.

| Seed axis | Verdict | Basis |
|---|---|---|
| **Correction-scope consistency** (does each test correct over the right family) | **Real — added to Phase 2** | Every test that runs its own Benjamini-Hochberg correction chooses its own family denominator (Duplicate Detection over four sub-tests at `:692–693`; the sub-unit escalation family; the three-stage cross-condition correction; the Mahalanobis stage-two correction). There is no suite-level family-wise correction across the ~28 tests. A per-test-correct correction can still over- or under-tier if the family is wrong. Pointable; specific mis-scoped instances are what a Phase 2 walk locates. |
| **Tier-mapping comparability across tests** | **Real, but already homed** | The same p-to-tier map is applied to tests whose p-values are not comparable at large N (a trivial effect gives p≈0). This is exactly the §5.4 large-N tier blocker the roadmap already carries. Confirmed, not re-audited here. |
| **Convergence laundering a mis-tiered flag into the verdict** | **Real, but is the downstream stage of axes 1 and 2, not a separate axis** | The severity and convergence layer takes each test's flag at face value (`severity.js:15–22`). Axis 1's Benford false positive and axis 2's suppressed duplication both propagate through this layer unchallenged. It is the propagation mechanism of the two demonstrated axes, so it is audited as their downstream stage rather than counted separately. |
| **Inter-test redundancy double-counting one signal** | **Real — added to Phase 2** | `severity.js:16` promotes to the top tier on `high >= 2`, and `:19` on two moderates across two dimensions. Two tests that fire on one underlying signal both feed the high count. The demonstrated case is the digit cluster firing on one duplication's digit shadow. Shares a root cause with axis 3 but the mechanism (feeding severity twice) is distinct from misattribution. |
| **Shared-helper divergence (variance/standard-deviation estimators)** | **Real, but already homed** | This is exactly §3's variance-estimator catalogue ("standard deviation" meaning different things across cards). Confirmed as homed there; not re-audited here. |
| **Determinism / order dependence** | **Not real for this audit** | Randomness is a seeded generator built from the matrix content (`createPRNG(matrix)`), so runs are reproducible by construction. Row-order assumptions are already handled by the Row Semantics Gate. No fresh unhandled instance surfaced. |
| **Boundary handling of missing / tie / zero / negative values** | **Needs fixture to decide** | Tests handle edges divergently (zero-as-missing for count assays; the signed-data transform gate on negative fraction; Benford dropping zeros and gating on positivity; the terminal-digit integer gate). The divergence is real and pointable, but whether any edge case flips a verdict needs a boundary fixture. Carried as a fixture-gated overlay, not a lead axis. |

**Confirmed axis set gating Phase 2:** the three demonstrated axes (1 cross-column pooling, 2 self-conditioned null, 3 display-only and misattribution) plus two seed axes that survived (correction-scope, redundancy double-counting). Boundary handling rides along as a fixture-gated overlay. Tier-mapping and shared-helper divergence are confirmed real but belong to §5.4 and §3 respectively; convergence-laundering folds into axes 1 and 2 as their propagation stage.

---

## Phase 2 — battery classification against the confirmed axes (partial)

For each confirmed axis and each test: **present / absent / fixture-gated**, and where present, **forced** (the test genuinely needs the choice for its target) or **artefact** (incidental, reconcilable). The false-positive class (wrongly implicating clean data — axis 1) is ranked ahead of the false-negative class (suppressed detection — axis 2), because wrongly implicating a clean dataset is the costlier error for a fabrication-detection tool.

**Coverage boundary:** axes 1, 2, and 3 (the CORPUS-03-demonstrated axes, the priority) are classified across the whole battery below. The two added seed axes (correction-scope, redundancy) are pinned to their source layer and classified at the structural level; the per-test forced-versus-artefact verdict for those two is the named follow-on, not completed here. This is the clean phase boundary the scope fence calls for.

### Axis 1 — cross-column pooling that manufactures a guard-passing property (false-positive class, ranked first)

Applies only to tests that flatten the whole matrix into one distribution and carry a data-property guard that pooling can satisfy. Every other test operates per column, per pair, or per condition slice, so axis 1 is **absent by construction** for them.

| Test | Axis 1 | Forced / artefact | Notes |
|---|---|---|---|
| Benford (first digit) | **Present** | Artefact | Demonstrated. Pooled span guard (`benford.js:24–25`) passes on a column that would be N/A alone. False-positive class. |
| Benford (second digit) | **Present** | Artefact | Same mechanism, span guard ≥1.0 (`benford2.js`). Pools via `matrix.flat()`. False-positive class. |
| Decimal Precision Consistency | **Present (new instance found this walk)** | Artefact | `matrix.flat()` at `decimalPrecision.js:28`; guard `<30 non-integer values → N/A` at `:32`; the statistic models a **single** fixed-precision instrument. Pooling columns from different-precision sources both clears the 30-value guard and manufactures a false precision-inconsistency signal. Not previously enumerated. False-positive class. |
| Value-Frequency Spike | **Fixture-gated** | Artefact-leaning | Pass 1 pools via `matrix.flat()` at `:117`; pass 2's applicability gate is fractional-content ≥ 0.5. Mixing an all-integer column with a decimal column can manufacture that precondition. Needs a mixed-precision fixture to demonstrate. |
| Terminal Digit Uniformity | **Absent (proper) / fixture-gated (generic)** | — | Pools via `matrix.flat()`, but its guard is an integer-fraction test, not a range or span test, so the specific span-borrowing mechanism does not apply. A generic concern (pooling columns of different terminal-digit behaviour) is fixture-gated. |
| Entropy / Zipf, Column Goodness-of-Fit, Modality | **Fixture-gated** | — | Now routed per condition, but each still pools columns within a slice and carries count and distinct-value floors that pooling could clear. No demonstrated instance; fixture-gated. |
| All replicate-comparison and group-comparison tests (Inter-Replicate Correlation, Kurtosis, Autocorrelation, Windowed Autocorrelation, Runs, Row-Mean Runs, Noise Scaling, Within-Row Variance, Selective Noise, Regional Noise, LOESS, Mahalanobis Row, Blocked Mahalanobis, Baseline Balance, Cross-Condition Rank Correlation, Cross-Condition Consistency, Constant-Offset Blocks, Residual Spike Correlation, Missing Data) | **Absent by construction** | — | These operate per column, per replicate pair, or per condition slice. They do not flatten the matrix into a single distribution behind a data-property guard, so pooling cannot manufacture a precondition for them. |

### Axis 2 — self-conditioned null (false-negative class)

Applies to tests whose null is estimated from the same data's own value-frequency distribution.

| Test | Axis 2 | Forced / artefact | Notes |
|---|---|---|---|
| Exact Duplicate Detection — collision sub-test | **Present** | Artefact for continuous data | Demonstrated. Empirical Herfindahl null at `duplicateDetection.js:132–137`; recurrence inflates its own baseline → near-1.0 p. False-negative class. The integer branch already has a parametric fix; the continuous branch does not. |
| Exact Duplicate Detection — row-duplicate and block-copy sub-tests | **Present / partially robust** | Mixed | Both use products of per-column Herfindahl indices as the match probability. The block-copy sub-test still rated CORPUS-03's `SL` alone as HIGH, so it is not fully neutralised; in the pooled two-column dispatch the co-present real column breaks it. Fixture-gated as to which regime dominates. |
| Windowed Autocorrelation, Blocked Mahalanobis, Cross-Condition Consistency | **Fixture-gated** | — | These use permutation or shuffle nulls drawn from the data. A shuffle preserves the value multiset, so a structured recurrence could survive into the null differently than under a theoretical null. A distinct mechanism from the empirical-index null; needs a fixture to decide. |
| Digit tests (Benford ×2, Terminal Digit) | **Absent** | — | Nulls are theoretical (the Benford logarithmic law; a uniform terminal-digit distribution), not estimated from the data's own frequencies. |
| Remaining replicate and group tests | **Absent (dominant)** | — | Use theoretical or residual-based nulls. Any residual case is fixture-gated but none is demonstrated. |

### Axis 3 — display-only scored paths and evidence/verdict misattribution

| Test | Axis 3 | Notes |
|---|---|---|
| Exact Duplicate Detection | **Present** | Demonstrated. `crossRowSameColLocs` and the over-represented list are display-only evidence, scored by nothing (`:603–612`, `:697`, `:717`). |
| Value-Frequency Spike, Terminal Digit, Benford | **Present-conditional (fixture-gated)** | When a duplication is present, these fire on its digit shadow, and the surfaced evidence ("digit" spikes, leading-digit deviation) reads as an independent signal rather than as a duplication footprint. Conditional on a duplication being present in the data. |
| All other tests | **Absent-likely (per-test check owed)** | For most tests the emitted details are the scored sub-units themselves (lag tables that drive promotion, windowed entries that feed the correction), so there is no purely-display scored path. A quick per-test confirmation is a small follow-on; no instance beyond Duplicate Detection surfaced in this pass. |

### Added seed axes — pinned to source, per-test verdict deferred

- **Correction-scope consistency.** Present as a mechanism across every test that runs its own Benjamini-Hochberg correction (Duplicate Detection four-way at `:692`; the sub-unit escalation family; the three-stage cross-condition correction; the Mahalanobis stage-two correction). Plus the suite-level absence of any cross-test family-wise correction, partially mitigated by the severity rule requiring two highs. Whether any single test corrects over the wrong family is the deferred per-test verdict.
- **Redundancy double-counting.** Pinned to `severity.js:16` (`high >= 2` → top tier) and `:19` (two moderates across two dimensions). The demonstrated instance is the digit cluster firing on one duplication's digit shadow; because those tests all sit in the digits dimension the double-count bites through the raw high count rather than the dimension-diversity count. Other likely overlaps (autocorrelation with windowed autocorrelation; inter-replicate correlation with residual spike correlation) are fixture-gated. Whether each overlap is forced (genuinely independent evidence) or artefact (one signal counted twice) is the deferred per-test verdict.

### Boundary-handling overlay (fixture-gated across the battery)

Divergent edge handling is real and pointable (zero-as-missing for count assays; the signed-data transform gate; Benford's zero-drop and positivity gate; the terminal-digit integer gate), but no case is demonstrated to flip a verdict without a boundary fixture. Carried as an overlay, not classified per test.

---

## What a fix-scoping session would need next

This table sets up a prioritisation decision, not a fix. The false-positive class leads: axis 1 has two firmly demonstrated instances (Benford first and second digit) and one newly found this pass (Decimal Precision), all pooling a heterogeneous multi-column matrix behind a single-column-property guard, and all invisible to the current fixtures by construction. A fix-scoping session would decide, in order: whether axis 1's fix is per-test (a per-column applicability check before pooling) or a shared input-assembly guard; whether axis 2's continuous-branch null gets the parametric treatment the integer branch already has, or whether the dispatch fix (scoring the named column alone) is the cheaper correct answer; and whether the two added seed axes (correction-scope, redundancy) warrant their own per-test walk before any fix or fold into the axis 1 and 2 work. The one thing the table shows is not optional: all of this is batch-invisible, so any fix needs a standing mixed-magnitude, mixed-precision, multi-column fixture built alongside it, or the next corpus run is the only place a regression would surface.

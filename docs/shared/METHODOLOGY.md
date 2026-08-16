# Methodology

This document maps each statistical test in Check My Data to its source methodology, describes the exact procedure implemented (v0.6), and documents known sources of false positives and minimum data requirements.

---

## General Approach

The tool implements a **convergent evidence** framework. No single test is definitive. Each test screens for a different class of anomaly. The investigator examines the pattern of results across all tests and applies contextual judgement. There is no composite score — see [Design Rationale](#design-rationale) below.

Tests are organised across five orthogonal fabrication dimensions — Value Repetition, Digit Representation, Replicate Agreement, Cross-Group Similarity, and Distributional Shape. Each dimension targets an independent axis along which fabricated data can differ from real data. See METHODOLOGY-MAP.md for the full dimension spec, per-test assignments, UI category mapping, and applicability by dataset archetype.

---

## Unified α Framework (v0.4)

All flagging thresholds derive from formal statistical tests with p-values. At small to moderate N, the test statistic and its null distribution determine significance entirely.

At large N (≥500 rows), p-values detect trivially small deviations from idealized nulls that are never exactly true in real data. Six tests apply additional **effect-size gates** — minimum forensic effect sizes calibrated against the validation suite — that suppress flags when the effect, though statistically significant, is too small to indicate fabrication. These gates are documented in Tier 2 of the Threshold Transparency section below and are analogous to the `lfcThreshold` parameter in DESeq2 (Love, Huber & Anders 2014).

| Flag | α | Interpretation |
|------|---|----------------|
| HIGH | p < 0.001 | Fewer than 1 in 1000 clean datasets would produce this result |
| MODERATE | p < 0.01 | Fewer than 1 in 100 clean datasets would produce this result |
| LOW | p ≥ 0.01 | Within normal sampling variation |

This consistency gives the convergence escalation rule a rigorous interpretation: if 2+ tests independently flag MODERATE, the joint probability under H₀ is ~1 in 10,000 (assuming independence), justifying escalation to HIGH.

**Confidence-interval level on plotted bands.** Where a card draws a confidence interval as the visual stand-in for its verdict — the bands on Autocorrelation, Runs, Mean-Variance, and the analytic/permutation-read bands added in the v1.0 CI programme — the band is drawn at the **99.9% level (z = 3.29), matching the HIGH gate (α = 0.001)**, not at 95%. The level is fixed to the gate by design: a band that excludes its null value reads as "this card flags HIGH," so the visual claim and the flag decision are the same test. A 95% band (z = 1.96) is *not* used, because it excludes the null at p < 0.05 — looser than even the MODERATE gate — and would let a marker read "significant" on a card that flags LOW. Bands are drawn only where the band's exceedance is the verdict's exceedance; where a test's gate is on a pooled or count statistic that no per-unit band corresponds to (Benford per-digit vs pooled MAD; Within-Row Variance per-row vs count-tail; any flag capped below the HIGH gate, e.g. CCR), no band is drawn and the p stays in the verdict. The band reflects the corrected (BH-adjusted) decision the verdict uses, never a raw per-unit statistic.

**Null model hierarchy.** Where possible, each test uses the most assumption-free null available:

| Null type | Used by | Advantage |
|-----------|---------|-----------|
| Permutation | Constant-Offset Blocks, Windowed ICC scan, Windowed Runs scan, Regional Noise scan, Residual Spike Correlation, LOESS Residual Analysis | No distributional assumptions; correct at any N; handles spatial autocorrelation |
| Simulation | Kurtosis + Anderson-Darling, Benford's Law (1st and 2nd digit) | Exact calibration for complex statistics where closed-form nulls are unavailable |
| Conditional / Binomial | Duplicate Detection, Value-Frequency Spike, Within-Row Variance, Decimal Precision | Exact or approximate test against data-derived null probabilities |
| Parametric bootstrap | Shannon Entropy Analysis | Generates reference distribution from fitted model; handles degenerate permutation case; approximate null on continuous data (Normal moment-match, effect-size-gated). Count → N/A (mixture marginal, no single-family null — see §3.6) |
| Parametric (z/t/χ²) | Selective Noise, Autocorrelation, Runs, Row-Mean Runs, Terminal Digit, IRC (winsorized Pearson + Fisher z), Mean-Variance, Cross-Condition Rank | Standard inference when parametric assumptions are met; well-understood operating characteristics |

When a parametric test is known to be overpowered at large N (i.e. it tests an approximation rather than an exact null), two complementary solutions are used: (1) a more appropriate null model where available (permutation, simulation, block-robust SE), and (2) calibrated effect-size gates where the null itself is an approximation that no real data satisfies exactly (see Tier 2 thresholds).

---

## Permutation-Test Arithmetic Constraints (rewritten S343)

A permutation or simulation p-value lives on a grid set by the resample count. It cannot resolve a threshold finer than its own step. That is arithmetic and no property of the data enters it.

**This section was wrong from v0.8 to S343 and every figure in it has been recomputed.** The previous version applied the BH multiplier at rank 1 and assumed a universal two-sided doubling. Both are wrong, and together they overstated every floor in the battery — by a factor of 2 on eleven of the fourteen resampling tests, and by a factor of `m` on all of them. Sources: `docs/shared/SESSION343-GATE-PROVENANCE-AUDIT.md` Part 2 for the constructions, read at source with `file:line`, reproduced by running the engine at two PRNG offsets and confirmed by a corpus-wide `bhFDR` harvest; `docs/shared/SESSION344-FLOOR-SITE-CENSUS.md` for the per-site inventory, which corrected four of S343's own figures.

### The raw floor depends on the construction

Two constructions are in use and they do not share a floor.

**One-sided.** `p = (k + 1) / (B + 1)` for an exceedance count `k ≥ 0`. Floor `1 / (B + 1)`. The `+1` on each side is the Phipson & Smyth (2010) continuity correction; without it a zero count emits `p = 0`, an assertion of impossibility on B draws.

**Two-sided, doubled.** `p = min(1, 2 × min(p_upper, p_lower))`, each tail of the form `(1 + k) / (B + 1)`. Floor `2 / (B + 1)`. The doubling is a calibration correction: under H₀ both tail probabilities are U(0,1) and their minimum is Beta(1,2), so doubling restores the nominal α.

**Three numbers circulate here and each counts something different.** S343's construction table has **13 rows**, and it collapses Benford first digit and Benford second digit into one row — so 13 is a count of table rows, not of anything in the code. **14** of the dispatch entries produce a p from a resample or simulation count: **11 one-sided, 3 doubled**. Those 14 tests hold **23** p-computation sites: **20 one-sided, 3 doubled**, because a test can carry a scan site and a per-unit site, and LOESS carries five. This line read "ten of the battery's thirteen" until S344, which was wrong on both numbers.

**A fourth number arrived at S349 and a fifth is now contested.** S349 Part 5a counted **20** dispatch entries whose test function receives condition-partitioned data on at least one branch — derived from the dispatch layer, not from any document's enumerated list, and twice the ten modules that name `condCtx` in their own source. It also measured **29 dispatch entries** in the carved `tests` array, against `METHODOLOGY-MAP:488`'s "28 dispatch entries covering 27 active test cards". Both figures need settling at source and neither should be cited until they are. (P79)

The three doubled sites are Cross-Condition Consistency, Entropy / Zipf Analysis and Column Goodness-of-Fit. A statistic being a distance does not make its p one-sided — Cross-Condition Consistency's Stage-1 KS unit counts both tails of D's permutation distribution and doubles the smaller. Read the construction; do not infer it from the statistic. The per-site inventory is `docs/shared/SESSION344-FLOOR-SITE-CENSUS.md`.

Write `c` for the numerator: `c = 1` one-sided, `c = 2` doubled. The raw floor is `c / (B + 1)`.

### BH-FDR does not add a floor

`bhFDR` (`src/stats/primitives.js`) is a Benjamini–Hochberg step-up with monotonicity enforcement. It walks the family from the largest rank downward, keeping a running minimum. The smallest adjusted p-value the family can report is therefore

    adj-p_min = min over j of ( p_(j) · m / j )

taken over the ranked raw p-values `p_(1) ≤ … ≤ p_(m)`, **not** `p_(1) · m`.

The consequence is the opposite of a floor that grows with `m`. When several units sit at the raw floor the rank-`j` term is smaller than the rank-1 term, and when the whole family sits there the `j = m` term returns the raw floor with no `m` factor left in it:

    reachable floor = c / (B + 1)

independent of `m`.

**A stronger forensic signal lowers the achievable adjusted p**, because it puts more units at the floor. The previous version of this section asserted the reverse — "no more significant adjusted p-value is achievable regardless of how strong the forensic signal is" — which is anti-monotone in the quantity it claims to bound.

Worked example, measured on `09-proteomics-clean`, Cross-Condition Consistency Stage 1, `B = 499`, `m = 3`, raw floor `2/500 = 0.004`:

| units at the floor | rank supplying the minimum | adjusted p | tier |
|---|---|---|---|
| 1 | j = 1 → 3 × 0.004 | 0.012 | LOW |
| 2 | j = 2 → 1.5 × 0.004 | 0.006 | MODERATE |
| 3 | j = 3 → 1 × 0.004 | 0.004 | MODERATE |

Both of the first two are observed in the shipped engine at different PRNG draws.

### Reachability

`flagFromP` compares against `ALPHA.FLAG = 0.001` and `ALPHA.NOTE = 0.01`, strictly less in each case. So HIGH needs `c / (B + 1) < 0.001`:

| construction | minimum B for HIGH | minimum B for MODERATE |
|---|---|---|
| one-sided (`c = 1`) | 1000 | 100 |
| doubled (`c = 2`) | 2000 | 200 |

**The row-count rule emits a `B` below both doubled minima.** Cross-Condition Consistency scales `B = 999 / 499 / 199` on `max(N_c) ≤ 1000 / ≤ 10000 / > 10000`, and it is the only doubled site on a row-count rule — the other two are fixed at 999 and 2000. At the third arm the floor equals the MODERATE threshold exactly, and `flagFromP` compares strictly:

| `B` | floor `2/(B+1)` | best reachable tier |
|---|---|---|
| 999 | 0.002 | MODERATE |
| 499 | 0.004 | MODERATE |
| **199** | **0.010** | **none — `0.010 < 0.01` is false** |

So on any dataset whose largest condition exceeds 10,000 rows, Cross-Condition Consistency is arithmetically locked to LOW at any effect size, with a perfect signal. The corpus tops out at 1,501 rows, so the batch cannot see it. Found at S344; not yet acted on.

Two tests in the battery already choose `B` this way and are the only two that do. Column Goodness-of-Fit sets `B = 2000` for `2/2001 = 0.00099950`. Excess Kurtosis sets `N_SIM = 1999` with a comment claiming a floor of `1/2000 = 0.0005` — **but `N_SIM` is not the denominator.** `kurtosis.js:347` divides by `simKurts.length + 1`, and a simulated batch is only pushed when it yields at least 20 usable differences, so the floor is `1/(simKurts.length + 1)` and equals `1/2000` only when all 1999 batches qualify. Short of that the floor is higher, never lower. The two agree on every path measured and nothing asserts that they do: the constant states a claim about `N_SIM` and the code states a claim about `simKurts.length`. Both tests clear `ALPHA.FLAG` by construction and both state their reasoning in a comment beside the value.

Every other resampling count in the battery is set from a row-count rule or is a bare constant, and none cites a threshold.

### What BH does cost: coarseness, not a floor

The floor is the best case. The cost of multiplicity shows up in the **step size** — how much the reportable adjusted p moves when a single exceedance count changes:

    step = ( m / j ) × c / ( B + 1 )

Best case `j = m` gives `c/(B+1)`; worst case `j = 1` gives `m · c/(B+1)`.

What matters for a verdict is that step relative to the threshold it must resolve. Below roughly 0.1 the discreteness is immaterial. At or above 1 the threshold sits in a gap the grid cannot represent, and the tier is decided by whether one resample out of `B` exceeds the observed statistic.

**Coarseness is a property of a run, not of a test.** `j` depends on how many units happen to sit at the floor, which is a property of the data. The same test at the same `B` can be fine on one file and a coin flip on another. Measured across the corpus, only Excess Kurtosis and the two Benford passes stay under 0.1 at `ALPHA.NOTE` in every case; every other resampling test reaches a regime on some fixture where one exceedance decides the tier.

The measured instance: Cross-Condition Consistency on `09-proteomics-clean` steps by 0.006 against a MODERATE threshold of 0.010 — ratio 0.6. About one in six PRNG draws, and about one in ten single-cell neighbours of that file, cross the boundary on nothing but the draw.

**Corrected at S349, and the correction inverts what this instance was taken to show.** The step and the ratio are right. The reading was not. At `B = 9999` the same file flags **20 of 20** at adjusted p 0.0036, so the coarse lattice was **concealing a certain result four runs in five**, not producing an uncertain one. Raising the count removes the concealment and leaves the flag.

**A coarse grid can hide a false positive as easily as it can manufacture an unstable verdict, and the two are indistinguishable from the p alone.** Before treating a statistic's run-to-run variance as the defect, measure where it converges. Full record: `docs/shared/S349-CCC-LIMIT-DATA.md`.

### Raising B

The v0.8 version rejected raising `B` on three grounds. **Two have lapsed. The third has not — it is out of scope, which is a different thing, and it returns whenever a single-channel HIGH is wanted:**

- **Parity.** "All battery permutation tests share `B = 999`" was already untrue when written — the data-dependent scaling rules emit 5000, 4999, 2000, 1999, 999, 499 and 199 across the battery. And until S340 the counts were genuinely coupled, because `createPRNG` was one stream consumed in dispatch order, so any raise displaced every test after it. Per-test streams landed at S340. **Counts are now independently adjustable, and changing one changes nothing else.**
- **Compute.** The `B > 50,000` figure came from the `m`-multiplied floor and does not survive its correction.
- **Necessity.** That argument is about reaching HIGH on a single channel. It says nothing about whether MODERATE is decided by a single resample, which is the live problem.

*Corrected at S356, two counts in the Parity bullet.* The list omitted 5000, which is what both Benford passes use — the same section gives their floor as `1/5001` a few paragraphs below, so the document contradicted itself. And "the row-count scaling rule" is one rule too few and the wrong noun. **Eight sites scale a count from the data.** Seven count rows — whole-matrix rows (`constantOffset:173`, `windowedAutocorrelation:87`), per-condition rows (`blockedMahalanobis:510`), rows with a complete replicate pair (`interReplicateCorrelation:245`, `runs:224`), usable rows (`loessResidual:179`, `regionalNoise:148`). **Cross-Condition Consistency counts finite cells**, not rows, and is alone in that. Seven further counts are fixed constants. Full census in `docs/shared/CCC-B-SCALING.md` §4.

*Corrected at S356, the Necessity bullet.* This bullet sat under a heading claiming all three grounds had lapsed. Necessity is unrefuted. It says nothing about the live problem, which is MODERATE decided by a single resample, but "silent on the current question" and "lapsed" are not the same state, and treating them as one would let a later reader discard an argument that still holds.

**But raising `B` is not a general fix, because coarseness is not a general property.** Resolving the worst case — `j = 1` — needs `m · c / (B+1)` well under α. The largest permutation family in the battery is Windowed Autocorrelation's per-pair window family at `m = 298` (`windowedAutocorrelation.js:189`, running over the permutation p at `:140`). It is one-sided, so getting the worst-case step under a tenth of `ALPHA.NOTE` needs `B + 1 > 298,000`. No reachable `B` helps there. Where `m` is large the multiplicity structure has to change instead: fewer units, or a combination rule that is not a rank-1-dominated minimum. That is a methodology question, open, and it belongs with the calibration programme rather than with a constant.

**Corrected at S356, and the correction is larger than the paragraph above.** Everything in this section bounds the **grid step**, `c/(B+1)` scaled by `m/j`. That is the resolution of the lattice the p can land on. It is not what makes a verdict move between runs. **A resampled p carries Monte-Carlo standard error of order `1/√B`, and that is the binding quantity.** At `p ≈ 0.01` and `B = 999` the standard error is roughly three times the grid step; at `B = 5999` it is nearly eight times. **The gap widens with `B`, so every argument in this section grows less relevant the more you spend.**

Measured at S356: `B = 5999` leaves the multi-seed flip rate exactly where `B = 999` had it, and stability needs about `B = 39999`. **Raising `B` is therefore not the route to verdict stability**, and this section should not be read as pricing that question. It prices reachability — which tiers a test can express — and that remains a real and separate constraint. Full record: `docs/shared/PERMUTATION-COUNT-FEASIBILITY.md`.

**A second reason, independent of the one above: some thresholds sit on the lattice itself.** A resampled p can only land on the points its count allows. For a one-sided p at `B` draws those points are `(k+1)/(B+1)`, halved again where the p is doubled. So a threshold α is *attainable exactly* whenever `α · (B+1) / c` is an integer, with `c = 1` one-sided and `c = 2` doubled. When that holds, some runs put the p precisely on the threshold, and the verdict is then decided by whether the comparison is written `<` or `<=`. That is a convention, not evidence.

**Every shipped count of the form `10k − 1` satisfies the condition.** 199, 499, 999, 1999 and 4999 all keep a one-sided point exactly on `ALPHA.NOTE`. Of the counts in the battery only `B = 2000` and `B = 5000` miss both thresholds under both constructions, and both were chosen for unrelated reasons. So the property is the rule here rather than the exception.

**Measured instance.** Regional Noise Homogeneity on `12b-uniform-mixture-fabricated` reads `flagFromP` on a raw one-sided p with no BH step in between, so its grid is `(k+1)/500`. Four exceedances out of 499 *is* `ALPHA.NOTE`, tested by identity on the double rather than by comparing rounded output, and the strict `<` at `thresholds.js:40` sends it to LOW. It lands there on three of eight seed offsets. **(S358) That flag is itself a false positive**, adjudicated from the fixture's construction — it localises to rows 51–65 in the file's honest half at every offset, and neither half of the file flags alone. The cell is therefore a clean measurement site for the lattice property and is not a detection. See §Pooled Dependence.

**What follows for raising `B`.** Moving to another count of the same family relocates this failure rather than removing it. That is a second and independent reason not to spend on `B`, and it does not rest on the Monte-Carlo argument above. *Corrected at S358.* This paragraph previously added that the same cell is "also a sampling straddle, a little over one standard deviation from its threshold." **The statistic does not move.** `bestVarRatio` reads 7.83× on all eight seed offsets — one distinct value against three distinct p-values — so the 1.05 standard deviations is the spread of eight *estimated* p-values, which is Monte-Carlo error of the estimate rather than a property of the data. Named correctly, the remedy inverts: more draws concentrate the estimate on a fixed tail probability sitting beside a threshold the lattice contains, while an off-lattice count or a non-strict comparison removes the case where a convention decides the verdict. **Moving off the lattice is worth doing, for the first reason. Raising `B` within the same family is worth doing for neither.**

Full record: `docs/shared/SEEDS8-STRADDLE.md`.

*Corrected at S344.* This paragraph previously cited a second and larger case, `m = 4208` for the Runs windowed scan. **That family is analytic, not permutation.** `runs.js:258` builds it from `zToP(w.rawZ)`, so it has no `B` and no grid, and the claim that no reachable `B` helps it was true of something that never had one. S343's own harvest recorded a smallest raw p of 0.0005 at that site, which is not on the permutation grid at any `N_PERM` the test uses — the measurement already contradicted the label. Runs has exactly one permutation site, `runs.js:247`, and it sits in no BH family at all. The conclusion above stands on Windowed Autocorrelation alone.

### Every resampling test has a counter

The v0.8 version claimed that simulation-based tests — Kurtosis, Benford — have "no permutation counter between the observation and the p" and so can drop arbitrarily close to zero. **That is false.** Both count exceedances against simulated draws and both sit on a grid. Their p-values reach HIGH because their counts are large enough, not because no counter exists. Both Benford passes floor at `1/5001`. Excess Kurtosis floors at `1/(simKurts.length + 1)` — `1/2000` when the full simulation runs, higher when it does not; see the note under Reachability above.

Genuinely off the grid are the analytic tests, whose p comes from a distribution function rather than a count. **There are fifteen of them, not eight.** The earlier list named the eight that a keyword search surfaces and treated that as a census: Terminal Digit, Decimal Precision, Mean-Variance slope, lag-1 Autocorrelation, Row-Mean Runs, Within-Row Variance, Selective Noise, and Inter-Replicate Correlation's per-pair Fisher-z arm — the last of which is an arm of a resampling test rather than a test of its own. The eight it missed are Value-Frequency Spike, Duplicate Detection, Sequential Duplication, Baseline Balance, Cross-Condition Rank Correlation, Mahalanobis Row Outlier, Modality and Missing Data Pattern. Fifteen analytic plus fourteen resampling is the battery of 29. Full table in `docs/shared/SESSION344-FLOOR-SITE-CENSUS.md` §4.

Two tests take a minimum over arms of which only one resamples — Inter-Replicate Correlation (`interReplicateCorrelation.js:331`) and Runs (`runs.js:276`). In both, the arms that can reach HIGH are the analytic ones, so a floor on the permutation arm does not bound the test. **Excess Kurtosis is not one of these**, despite carrying an analytic per-pair family: that family feeds display counts only, and both `primaryP` branches are simulation-based.

**S362 measured the Inter-Replicate Correlation half, and it holds with a condition attached.** Its
windowed arm floors at `1/(B+1)` — 0.001, 0.002 and 0.005 at `B` = 999, 499 and 199 — so HIGH is
unreachable on every branch. The `B = 999` case lands exactly on `ALPHA.FLAG` and the strict
comparison denies it, which is P100's integer-lattice condition rather than a separate fact. Every
HIGH observed does come from the analytic arm, as the paragraph above says it must.

**But an analytic arm bounds the test only while its own null is calibrated, and this one is not.**
The per-pair standard error `√(k/((k−1)(n−3)))` assumes a Fisher variance of `1/(n−3)`, independence
among the other pairs' correlations, and no covariance between a pair and its own leave-one-out
baseline. All three fail, and the net error changes sign with the data: measured `sd(z)` runs 0.730
with normal marginals at replicate correlation 0.93 and 1.564 with log-normal marginals. At 0.730 the
two-sided tails fall 7×, 24× and 153× short of nominal at 0.05, 0.01 and 0.001, and 200 synthetic
clean draws at that setting returned no flag at any tier. **So a floor on the permutation arm does not
bound this test, and a variance error on the analytic arm does.** Evidence: P114, and
`test/probes/probe-s362-irc-honest.mjs`.

**The Runs half of the sentence above is unsettled.** S362's arm-type recount classifies Runs as
closed-form on both sides, against this paragraph's reading of `runs.js:276`. Both cite source and
neither has been checked against the other. Do not rely on either until it is.

### Consequences for severity interpretation

- A resampling test that flags MODERATE where a stronger claim was expected may be reporting what its budget can resolve, or may be one resample from the other side of the boundary. **The two look identical on a card.** Distinguish them by the step size, not by the p.
- The reachable floor is deterministic given `B` and the construction. The step size is not — it needs `j`, which is per-run.
- Both are computable at run time from values the tests already hold. Nothing currently computes either, and **no test asserts its own floor** — which is how this section stayed wrong for the life of the project. **A stated derivation with no test behind it is unverified.** P67 is the fix: a per-module assertion tying each site's construction and `B` to its floor. The inventory it needs is `docs/shared/SESSION344-FLOOR-SITE-CENSUS.md`. The floor is assertable from `test/`; the coarseness ratio is not, because `bhFDR` computes the winning rank `j` and discards it (`primitives.js:246`).

### Verdict stability (P51, written S359)

**A resampled p that reaches the verdict through a multiplicity-adjusted minimum has no analytic standard error, and the tool must not print one.** The reported quantity is `min over j of (p_(j) · m/j)` — a minimum over a family of correlated order statistics, not a single resampled p. The binomial spread `√(p(1−p)/B)` describes one count against one null. It describes almost nothing about what moves this quantity between runs, because two things move it and the formula covers one: the counts move, and the rank term `m/j` moves when the number of units tied at the minimum changes. The second is not sampling error in any sense the formula reaches.

**DS15 shows both, and they are not the same effect.** Across eight seed offsets its Cross-Condition Consistency p takes three values while its lead unit never changes — Trimmed span leads on all eight and is never overtaken. What changes is how many units sit at the reported minimum: one on three offsets, two on the other five. That moves `m/j` between 3 and 1.5, and with it the lattice the value can land on — a one-unit offset is pinned to multiples of 0.006 and cannot express 0.009 at all. The single LOW offset is a separate matter: it sits at 0.012 with two units at the minimum, so it is a counting excursion on the finer lattice rather than a tie-count effect. Both mechanisms are live on one cell, and losing that flag costs the fixture a dimension in the severity formula's diversity term and takes it from 3 to 2.

**DS23 is the same class with no slack.** `m = 1`, so BH returns the raw value: HIGH is reachable only at the exact doubled floor `2/2001`, and one exceedance out of 2000 doubles the p and costs the tier. Zero exceedances against one is the entire verdict. `columnGof.js:234` and `:236`.

**Neither is bought off with a larger count.** Measured: `B = 5999` left DS15's flip rate exactly where `B = 999` had it, and reaching zero flips in eight took `B = 39999` — forty times the shipped count. DS23 sits closer to its threshold than DS15 does, at 0.54 estimated standard deviations against 0.95, so no plausible count settles it either. The binding quantity is Monte-Carlo error at `1/√B` rather than the grid step at `1/B`, and the gap widens as `B` grows.

**So instability ships as methodology and never as a per-file number.** No confidence interval on a verdict, no per-result statement of how likely a particular flag is to reproduce: the estimate that statement would need is the one that does not exist. **And the direction is fixed.** Every unstable cell measured sits on a fabricated fixture, and all eight severity-0 fixtures are constant across all eight offsets. The statement is therefore that *a flag sitting near a tier boundary may not reproduce on a second run*. It is never that a clean file may raise a false alarm on a second run — nothing measured supports that, and it would misdescribe the risk in the direction that matters.

**What the measurement does not support.** Eight offsets is one real draw and seven counterfactuals, over 27 fixtures we wrote. It gives the direction and the mechanism. It does not give a rate, and the standard deviations behind those distances are estimated from eight points, so their ordering is better supported than their values. Full record: `docs/shared/SEEDS8-STRADDLE.md`.

**Not yet stated on any user surface.** This section closes the methodology half of P51. Nothing in the tool's report or in `docs/shared/CARD-COPY.md` currently tells a user that a borderline flag may not reproduce, and METHODOLOGY is not a surface anyone reads before trusting a verdict. The remaining work is one sentence in the shipped copy, in the wording fixed above.

---

## Pooled Dependence (S339–S365)

**One design pattern, examined five times, and the count is open.** Dependent units are combined by a null that assumes they are independent. The failure has the same shape every time: the null is built for a family the data does not contain, so the p it returns is not the quantity the flag reads it as. **This is the review paper's finding.** It is a null-construction defect rather than an arithmetic one, and none of the five is fixed by raising a resample count.

**No single property separates them, and this section no longer claims one.** Each instance is named below by where the combination happens and which test consumes it. Three candidate individuators were tested at S365 and each returned a different count. Units alone collapse instances 4 and 5, which sit on one partition on DS12b. Units crossed with the consuming test return nine, because instance 1 spans two tests and instance 3 spans four. The pooling site returns six, because instance 1's per-pair pooling is two independent code sites — `autocorrelation.js:56` and `runs.js:75` — sharing only the `bhFDR` primitive. **None is asserted, because none survives.** The one candidate still unbroken is the remediation decision — what has to be decided once — and it is recorded as a candidate rather than adopted, because instance 2 already carries two arms with two fixes, one landed and one open.

**The count is open on a second axis, and it is the more serious one. Five is the number of occurrences this section has examined, not a closed count.** `METHODOLOGY-TESTS.md:549` documents a sixth occurrence of this exact pattern on this exact test — autocorrelation across pooled normalised differences, stated there in the pattern's own terms as a null-model mismatch — running opposite in direction to instance 4. It predates the pattern's naming at S339 by two hundred sessions, which is why it was written as a known limitation rather than as an instance, and it has never been assessed against the pattern. The three individuators split on it exactly as they split on instance 1. **Membership is open and so is the individuator. The five below are what has been examined, and the parenthetical above dates the work rather than the occurrences.** (P125)

The five instances examined, in the order they were found:

1. **Replicate pairs inside a test (S339).** Each column sits in `C − 1` of the `C(C−1)/2` pairs, so the pairs are not independent draws. Pooling them inflated variance by roughly 4× and halved the apparent standard error. Autocorrelation (§2.1) and the Runs Test (§2.3) now take severity from the minimum BH-adjusted per-pair p, and the clean-file false-positive rate under row shuffle fell from about 44.8% to under 2%. **The per-pair route turned out to be more sensitive than pooling for a concentrated effect, not less** — DS21's injection lives in 2 of 28 pairs, and pooling dilutes it.
2. **Condition groups inside the aggregation layer (S339).** The worst-group arm took an uncorrected maximum over groups, which matched `1 − (1 − p)^G` exactly at every group count. Because that law is exact, the Šidák correction replacing it is determined rather than chosen. **The other arm is still open.** `aggregatePerGroup` combines per-group p-values by Fisher and by Šidák, both exact only under independence, on a branch where the groups are the same subjects (P83). Under positive dependence the two are expected to fail in opposite directions — Šidák conservative, Fisher anti-conservative — but that is reasoning, and the sweep that would convert it into a measurement has not been run.
3. **The pooled dispatch route itself (S179 onward).** Fitting one model to a multi-condition mixture conflates a between-condition shift with the within-condition structure the test is looking for. Column Goodness-of-Fit, Modality, Entropy and the Value-Frequency Spike route per condition through `aggregatePerGroup` for exactly this reason; §3 records each case. DS19's retired Column GoF channel is the worked example — one distribution fitted to a Control+Treatment mixture spiked the ECDF on near-duplicates while each condition alone was clean.
4. **Excess Kurtosis, where pooling conditions of unequal residual scale adds kurtosis (S341, measured as a dose-response at S363).** **The arithmetic is the invariant and the sign of the finding is not.** Pooling two conditions whose residual scales stand in ratio `q` adds excess kurtosis of exactly `6(1+q⁴)/(1+q²)² − 3`, which returns 0 at `q = 1` and carries no fitted parameter; observed over predicted runs 0.940 to 1.128 across all eight measured cells, and median p falls from 0.47 to the `1/2000` floor across the ratio ladder in all four blocks, a fold change of 806 to 1050. The normaliser cannot absorb it, because `fitPredictedSigma` regresses log-variance on the row mean alone and is therefore condition-blind. **Which way the finding then points depends on where the constituents start.** On DS12b they are platykurtic at −0.709 and −0.648, the pooled figure is −0.567, and `kurtDeviation` emerges at **+0.0369** — positive — so directional suppression fires and the designed detector is silenced. On honest data with both constituents at zero the same arithmetic manufactures a positive deviation instead, and **that half is a suppressed false positive rather than a fired one**: the same directional comparison hides it, and the flag reaches a verdict in 1 of 28 cells. The dose-response was measured on a generator rather than inside a fixture; the instance was still discovered inside DS12b's construction. (P53, P119)
5. **Regional Noise on DS12b, where pooling manufactures a flag (S341, re-measured from the construction at S358).** Same file, same run. Rows 1–200 are honest log-normal noise at σ = 0.18; rows 201–400 are uniform at ±40% on the same base means — a variance change, which is what the test measures. Neither half flags alone: the Genuine half reads 4.89× at p = 0.092, the Fabricated half 2.64× at p = 0.778. **Pooled, one null across two noise regimes reads 7.83× at p = 0.010 and returns MODERATE.** The firing localises to rows 51–65 — the honest half — at every seed offset, with no overlap with the plant. It is a false positive.

**On DS12b, instances 4 and 5 sit on one fixture and one run, and there they run in opposite directions.** Pooling silences the test built to find the fabrication and manufactures a flag in a different test on the same data. That pair is the sharpest statement of the pattern the project has. **The qualifier is load-bearing:** instance 4 holds both directions in general, so the opposition is a property of that file rather than of the two instances.

**What follows.**

- **Adjudicate a firing inside the planted region before treating it as a detection, or its loss as a cost.** Run the test inside the planted rows and columns and outside them, separately, and compare. A test can carry a fixture's severity while firing nowhere near the mechanism the fixture was built to plant — DS22's retired Runs channel and DS12b's Regional Noise are both that shape. The method and its precedent (`batch-fixtures.mjs:88`) are recorded in `docs/shared/TEST-GROUND-TRUTH.md` §Conventions.
- **Resemblance between two tests is not a fix predicate.** Per-column gating cures Benford's pooling axis and does nothing for Decimal Precision's, because that artefact sits inside columns rather than between them. Each instance needs its own axis identified before a fix is scoped.
- **Three of the five were found only by measuring inside a fixture's construction.** Tool output cannot separate a detection from a pooling artefact, because both arrive as a p-value on a plausible test.
- **A section that states a pattern and a section that applies it are different lists.** §2.2 has held an occurrence of this pattern since S108 and neither section has ever pointed at the other. Before adding an instance, search the battery for the pattern's own words rather than for its name.

**Open on this pattern:** P83, the Fisher and Šidák arms. P125, whether §2.2's autocorrelation limitation is a sixth instance — it moves this count and `FALSE-POSITIVE-TOLERANCE.md` §6 if it resolves upward, and `METHODOLOGY-TESTS.md:161` and `:230` are unread candidates of the same shape. It moves no drafted paper text: `docs/paper/` holds one results section and it never names this pattern (checked S365). P53's remedy — its generality claim is discharged, because S363's parameter-free prediction is the measurement that "general and not specific to that fixture" was asserting, and what remains is a fix constrained by S364: the same directional rule exists twice, at `kurtosis.js:380` on the pooled statistic at full precision and at `:477` on the per-condition statistic off a four-decimal string, so neither copy moves alone. And the cross-regime pooling in Regional Noise itself, which is unfixed and is why DS12b still fails the batch's completeness gate at seed offset 0.

---

## Variance-Stabilizing Transform (VST) Preprocessing (v0.4)

**Motivation.** Different assay types produce noise with different mean-variance relationships. Tests operating on inter-replicate differences assume approximately homoscedastic (constant-variance) residuals. Without variance stabilization, high-mean rows dominate differences, inducing spurious autocorrelation, distorted kurtosis, and incorrect runs structure. Additionally, multiplicative fabrication patterns (e.g. Rep2 = Rep1 × 1.047) are invisible to additive difference tests.

**Decision logic.** The transform is determined once at import and applied uniformly to all affected tests. The decision uses a two-stage process:

1. **Data type check:** If >95% of values are integer, the data is count-type.
2. **Log-log slope CI test:** Regress log(row variance) on log(row mean) across all rows. Compute the 95% confidence interval for the slope. Test H₀: slope = 1 (Poisson reference):
   - CI entirely above 1 → proportional/overdispersed noise → **log transform**
   - CI contains 1 or is below 1 → inconclusive → **assay-type fallback**

   The CI test is asymmetric by design: it can confidently detect proportional noise (slope >> 1) because overdispersion is visible even when condition effects inflate total row variance. But it cannot reliably distinguish additive noise from narrow-range proportional noise — in multi-condition datasets, condition effects dominate total row variance, pushing the slope toward 0 regardless of the true within-replicate noise structure. Therefore the CI test only promotes to log; it never overrides the assay type to assert "raw."

3. **Assay-type fallback:** Used when the slope CI is inconclusive, below 1, or there is insufficient dynamic range for a reliable slope estimate (<10 rows with ≥3 valid positive values).

| Transform | Function | When applied | Reference |
|-----------|----------|--------------|-----------|
| Log | ln(x) for x > 0; null otherwise | Slope CI entirely above 1; or assay fallback for {elisa, densitometry, genomics, proteomics} | Box & Cox (1964); Love, Huber & Anders (2014) |
| Anscombe | √(x + 3/8) for x ≥ 0 | Integer data with slope CI not above 1 | Anscombe (1948) |
| Raw | No transform | Assay fallback for {qpcr, physiological, general}; or data type = ordinal (always raw) | — |

**Safety gate.** Log transform requires >50% of values to be strictly positive. Protects zero-heavy data from producing extreme values. This is a secondary check behind the signed-data gate (S111) below.

**Signed-data gate (S111).** Applied ahead of both log and anscombe selection. When the cell-level v < 0 fraction (`negFrac`) is ≥ 0.1, `detectVST` returns `raw` with reasonCode `signedData` regardless of slope, assay, or integer status. Blocks the failure mode where signed-centered data (posFrac ≈ 0.5) produces a slope CI above 1 from conditioning the mean-variance regression on mean > 0 rows only — the resulting log / anscombe routing NaNs v < 0 cells and drops 99%+ of rows downstream.

*Threshold derivation.* The slope regression conditions on mean > 0 rows. At negFrac < 0.1, the conditioning drops at most ~10% of rows — estimator bias is within tolerance. At negFrac ≥ 0.1, the conditioning becomes a selection bias on the positive half only, and the fitted slope is an upper-tail Jensen artefact rather than a true mean-variance relationship. The 0.1 gate ensures the slope regression is interpretable AND the downstream transform preserves row count.

*Wiring.* Predicate `requiresPositiveDomain(matrix)` in `src/stats/vst.js` is evaluated once at the top of `detectVST` and gates: (i) the integer-branch anscombe default, (ii) the continuous-general slope-driven log path, (iii) the assay-map log fallback (elisa / densitometry / genomics / proteomics). Pre-S111, the `posFrac > 0.5` secondary check would clear by the thinnest margin on exactly-centered integer and continuous data; the signed-data gate closes that path while preserving all legitimate log / anscombe routing (all fixtures at posFrac = 100% remain unaffected).

*Parked alternatives (v1.1+).* A symmetry-aware slope estimator (conditioned on |v| > threshold, or using Levene / Breusch-Pagan on rank-folded data) is the architecturally cleaner fix — the 0.1 gate is a correct patch, not the final answer. A signed-VST family (Yeo-Johnson, asinh, arcsinh) handles legitimately-heteroscedastic signed data that currently falls through to identity under the gate. Both parked for v1.1+.

**Tests receiving VST-transformed data (13 tests, reconciled S111):** Constant-Offset Blocks, Residual Spike Correlation, Cross-Condition Consistency (Stages 1/2; Stage 3 P9 uses pre-VST by registry flag), Mahalanobis Row Outlier, Blocked Mahalanobis, Excess Kurtosis, Autocorrelation, Windowed Autocorrelation, Runs Test, Row-Mean Runs, LOESS Residual Analysis, Selective Noise, Regional Noise Homogeneity.

**Tests NOT transformed (reconciled S111, with rationale):**

| Test | Reason |
|------|--------|
| Duplicate Detection | Tests exact value matches — must use original precision |
| Digit-level tests (Terminal, Benford 1st/2nd, Precision, Value-Frequency Spike) | Operate on the original numeric representation |
| Mean-Variance Noise Scaling (§4.1) | IS the VST-legitimacy detector — circular if fed VST'd input. Pre-VST isolation verified S111 Phase 1 across all 22 fixtures |
| Inter-Replicate Correlation (§2.5) | Winsorized Pearson r (fix 244) absorbs leverage outliers from scale differences internally; VST-induced scale compression would distort the 8–15-row windowed scan local r (uses raw Pearson deliberately because every point carries signal at short windows) |
| Shannon Entropy (§3.6) | Forensic target is raw-scale value-frequency concentration on modal-precision-discretised values; VST would alter the decimal-precision grid |
| Within-Row Variance (§4.3) | Internalises variance stabilisation via Step-2 binned mean-variance fit + local-MAD dispersion floor; external VST would redefine the forensic target (raw-scale uniformity signature of "typed a number, added small noise") |
| Column Goodness-of-Fit (§3.7), Modality Test (§3.8) | Distributional shape targets on the raw scale |
| Cross-Condition Rank Correlation, Baseline Balance | Rank-based (Spearman) or distance-based on originals |
| Missing Data Pattern | Structural; values not relevant |

**S362 — the Inter-Replicate Correlation row, measured.** The stated rationale is directionally right
and quantitatively short. Winsorization does absorb leverage, taking the estimator's error from 2.91×
to 1.68× — real work, and not enough of it. It is also aimed at a different concern from the one that
bites: scale differences between columns, rather than heavy marginals read at high replicate
correlation, which is the configuration that breaks the test's standard error.

**The exclusion is also protective, for a reason nobody chose.** Routing this test through the
transform would carry its standard error from 1.564 to 0.730 — not to 1.0, but past calibration and
into a conservative failure that returns nothing at any tier. **Read that as evidence that the obvious
remedy is wrong, not as an argument for the exclusion.** The exclusion stands on its stated grounds.

**An open question this table raises and does not answer.** Six of the tests excluded here read raw
values against normal-theory analytic nulls — Inter-Replicate Correlation, Mean-Variance Noise Scaling
(§4.1), Within-Row Variance (§4.3), Cross-Condition Rank Correlation, Value-Frequency Spike and
Baseline Balance. Raw marginals against a normal-theory null is the configuration that failed above.
Whether it fails for any of the other five is unmeasured, and it bears on §4.1's honest-data rate.
Classified at S362 from `engine.js:266-283`; tracked as P118. **This is a question, not a correction —
every exclusion in the table stands on its stated reason.**

**Data type routing (fix 157).** When data type is set to ordinal (Likert scales, ranked categories), VST is bypassed entirely — ordinal data is always analysed raw. No confirmation prompt is shown. See §Data Type × Assay Type below.

**Post-S111 unification (S132f).** UI default routing for general-assay continuous data follows detectVST output, matching batch-mode validate-batch.mjs and resolving the parked #41 severity-tier discrepancy on DS15. The S123 defensive raw-default retired because the S111 signed-data gate (negFrac ≥ 0.1 → raw with reasonCode 'signedData') now handles the row-dropping failure mode S123 was defending against. detectVST's slope CI test remains asymmetric (only ever promotes to log, never overrides to raw), preserving the conservative routing posture. Confirmation prompt on the Zone 3 import card continues to fire when a non-raw transform is proposed; the prompt's AUTO-selected button now reflects detectVST's recommendation rather than a hardcoded fallback.

**Display.** Tests run on transformed data display a badge (LOG or ANSC) on their test card. The report header shows the VST decision with reasoning. The copy summary includes the full VST reason string for audit.

---

## Data Type × Assay Type Two-Axis Input (v0.6)

**Source:** Design motivated by systematic false positives on survey/Likert data (Gino Study 4) and mixed-measurement-type datasets (Pruitt raw data).

The import pipeline presents two independent selectors: **data type** (governs which tests are valid) and **assay type** (governs instrument artifact notes and VST fallback). Assay selection auto-suggests a data type via a fixed mapping (survey → ordinal, cell_count → count, qPCR → continuous, etc.), but the user can override.

**Data types:**

| Data type | Test battery | VST |
|-----------|-------------|-----|
| Continuous | Full 26-test battery | Log-log CI; confirmation prompt if ambiguous + general assay |
| Count/Integer | Full battery; skips handled by assay-specific rules | Anscombe default; log if NB overdispersion |
| Ordinal/Rank | 9-test restricted battery | Always raw (no transform, no prompt) |

**Ordinal suppresses (14 tests):** Selective Noise, Autocorrelation, Kurtosis + A-D, Runs Test, Row-Mean Runs, Inter-Replicate Correlation, Regional Noise, Mean-Variance, LOESS, Within-Row Variance, Correlated Residuals, Duplicated and Offset, Column GoF, Modality. The inter-replicate tests operate on differences that assume adjacent values represent measurement noise around a true value — an assumption that does not hold for discrete ordinal scales. Column GoF and Modality suppress because ordinal item scales are not interchangeable; each Likert item has its own distribution shape by design.

**Ordinal preserves (8 tests):** Duplicated Data, Cross-Condition Rank Correlation, Mahalanobis, First-Digit Frequencies, Second-Digit Frequencies, Last-Digit Frequencies, Decimal Places, Repeated Digits. These tests operate on structural, distributional, or digit-level properties that remain meaningful for ordinal data.

**Assay types:** densitometry, ELISA, qPCR, cell count, plate reader, physiological, genomics, proteomics, survey/Likert, general. Proteomics auto-detection uses filename and header keyword matching (fix 160); survey auto-detection uses filename keywords (survey, questionnaire, likert, scale) and header keywords (item, q1, response).

**Rationale.** Running survey data through the full battery produces systematic false positives because scale items (e.g. 10 Likert items measuring extraversion) are not interchangeable replicates — they have legitimately different variances, autocorrelation structures, and distributions. The ordinal data type suppresses tests that assume replicate exchangeability while preserving tests that detect structural anomalies (duplicate patterns, concentration of flat responses, digit-level manipulation).

---

## Seeded Pseudorandom Number Generator (v0.6)

**Source:** Fix 155. Mulberry32 PRNG (Widynski, 2022, "Middle Square Weyl Sequence RNG" family).

**Problem.** Prior to v0.6, all permutation and simulation tests used `Math.random()`, producing different results on each run. For borderline datasets (DS01 clean), the overall severity rating oscillated between CLEAN, MINOR, and SERIOUS across runs — unacceptable for a forensic tool.

**Implementation:**
1. At the start of each analysis run, `seedRNG(matrix)` hashes the first ≤500 data values using FNV-1a on Float64 byte representation to produce a 32-bit seed.
2. The Mulberry32 PRNG (`sRand()`) replaces `Math.random()` in all analysis code — permutation shuffles, simulation draws, Box-Muller normal generation.
3. The Box-Muller spare state is reset at seed time to prevent cross-run contamination.
4. Demo/UI `Math.random()` calls (8 locations) are preserved — these do not affect analysis results.

**Result:** All analysis results are now fully deterministic for a given dataset. DS01 stochasticity eliminated (always MINOR).

---

## Column Relationship Gate (v0.6, S46)

**Motivation.** When DATA columns represent separate conditions (different instruments, treatments, time points) rather than replicates, the 12 replicate-comparison tests detect genuine between-condition differences and report them as anomalies. This produces false positives on clean data — validated on a 384-well eDNA qPCR dataset where 4 instrument runs (QS5 vs ViA) were pivoted to columns.

**Gate logic.** Before analysis, the tool requires the user to declare the column relationship:

| Situation | Resolution | Gate visible? |
|-----------|------------|---------------|
| Two-row header with ≥2 groups | Auto-resolved as replicates (columns within groups) | Shown (AUTO badge, pre-filled) |
| COND column assigned | Auto-resolved as replicates (conditions are rows, not columns) | Shown (AUTO badge, pre-filled) |
| Long-format pivot | Auto-set to non-replicates (columns came from condition values) | Shown (AUTO badge, pre-filled) |
| Flat DATA columns, no structure | User must choose: Replicates or Non-replicates | Shown (REQUIRED) |

In auto-resolved situations (S122) the card renders pre-filled with the auto choice selected and an AUTO badge on that button; the user can switch to the other option with a single click, which freezes the choice and removes the AUTO badge. Pre-S122 these cases were rendered as hidden cards, leaving the user unable to see or override what the tool decided on their behalf.

The Run Analysis button is gated — blocked until resolved.

**Effect on tests.** In non-replicates mode:

| Tests skipped (13) | Reason |
|---------------------|--------|
| Constant-Offset, Selective Noise, Autocorrelation, Kurtosis, Runs, Row-Mean Runs, IRC, Mean-Variance, Regional Noise, Mahalanobis, RSC, LOESS, Within-Row Variance | These compare replicate measurements of the same quantity. Columns representing different conditions are expected to differ. |

| Tests that run | Mode |
|----------------|------|
| DupDet, TDU, Benford 1st/2nd, Decimal Precision, VFS | Run on full matrix as usual |
| Cross-Condition Rank | Uses columns as conditions (each column = one condition group) |

The applicability summary updates reactively when the user changes their choice.

**Batch mode:** Defaults to replicates (conservative — cannot prompt user).

---

## Row Semantics Gate (v1.0, S118)

**Motivation.** Sequential and spatial tests assume the row index carries forensic meaning — plate position, instrument run sequence, dose gradient, time order. When row order is arbitrary (long-format pivots, gene lists, alphabetised protein IDs, subject ID), a sliding window or contiguous-block scan operates over a permutation of the underlying data and produces noise indistinguishable from real localised structure. Pre-S118 the engine carried ad-hoc `assay === 'genomics'` skips on §2.6b, §2.7, §4.2; the row-semantics gate generalises this into a single import-stage flag with uniform dispatch.

**Gate logic.** The user declares `rowSemantics ∈ {ordered, arbitrary}` at import. Auto-suggest precedence:

| Situation | Resolution | Gate visible? |
|-----------|------------|---------------|
| `detectLongFormat()` truthy | Auto-set to **arbitrary** (long-format) | Shown (AUTO badge, pre-filled) |
| `assay === 'genomics'` | Auto-set to **arbitrary** (genomics) | Shown (AUTO badge, pre-filled) |
| `assay ∈ {qpcr, elisa, plate_reader, densitometry, physiological, cell_count}` | Auto-set to **ordered** (instrument assay) | Shown (AUTO badge, pre-filled) |
| `assay ∈ {general, proteomics, survey}` on wide-format input | User must choose | Shown (REQUIRED) |

In auto-resolved situations (S122) the card renders pre-filled with the auto choice selected, an AUTO badge on that button, and a one-line sub-text identifying the auto-suggest reason ("Auto: long-format detected" / "Auto: genomics assay" / "Auto: instrument assay"); the user can switch to the other option with a single click, which freezes the choice and removes the AUTO badge and sub-text. Pre-S122 these cases were rendered as hidden cards, leaving the user unable to see or override what the tool decided on their behalf.

The Run Analysis button is gated — blocked until resolved. **Batch mode** defaults to `ordered`; `validate-batch.mjs` invokes `detectLongFormat()` per fixture and overrides to `arbitrary` when detection succeeds. `BatchView` auto-routes by the same policy (replacing the pre-S118 long-format SKIP behaviour).

**Effect on tests under `arbitrary` — full-test N/A (5 tests):**

| Test skipped | Reason for full-test skip |
|--------------|---------------------------|
| §2.3 Runs Test | Sign-run sequences over arbitrary row order have no forensic interpretation. |
| §2.4 Row-Mean Runs | Per-condition row-mean drift is undefined when row sequence is arbitrary. |
| §2.6b Blocked Mahalanobis | Sliding (μ, Σ) windows over arbitrary row order; row-shuffle null inside conditions does not recover the forensic question. |
| §2.7 LOESS Residual Analysis | LOESS-of-|diff|-vs-row-index is a sequential noise-character test — no structure to detect when the axis is arbitrary. |
| §4.2 Regional Noise Homogeneity | Sliding-window column variance against global is spatially-anchored — same defeat. |

**Effect on tests under `arbitrary` — sub-unit N/A (2 tests, global continues to run):**

| Test | Sub-unit suppressed | Sub-unit that continues to run |
|------|---------------------|-------------------------------|
| §2.5 IRC | Windowed permutation scan | LOO winsorized-Pearson pairwise test (full series) |
| §4.3 Within-Row Variance | Step 6 windowed scan | Step 5 global binomial on smooth-outlier count |

Suppressed sub-units are reported on the test result object as `subunitsSuppressed: ['windowed-scan']`. `primaryP` collapses to the surviving sub-unit in suppressed mode.

**Tests not gated (handle arbitrary-order data via their own nulls / gates):**

| Test | Why no row-semantics gate is needed |
|------|--------------------------------------|
| §1.1 DupDet (Test 4 block-copy scan) | Block-copy null is marginal-frequency-based (`p_block = Π(HHI_c)^h × n_opportunities`, Bonferroni over the spatial search volume). Block-copy fabrication on arbitrary-order data is still fabrication evidence at the calibrated p-value. |
| §1.2 Constant-Offset Blocks | Permutation null is row-shuffle by construction — genomic autocorrelation is present equally in shuffled orderings → high permP → LOW. Detects order-dependent blocks (copy-paste-shift) regardless of whether the row axis is semantically meaningful. |
| §1.9 CCC Stage 2 P5 (residual lag-1 AC) | Permutation null shuffles condition labels across rows preserving row tuples — calibration is invariant to row order within each condition. |
| §2.1 Autocorrelation | Tier 2 effect-size floor `|mean r| ≥ 0.25 at N ≥ 500` is calibrated against genomic co-regulation background (r ≈ 0.10–0.15); fabrication-grade autocorrelation (r ≈ 0.44–0.81) continues to flag on arbitrary-order data. DS11 generator-leakage (r ≈ 0.55) is the canonical positive case. |
| §2.1b Windowed Autocorrelation | Within-pair row-shuffle permutation null renders baseline arbitrary-order noise inert; real localised serial structure in the delivered order continues to flag. |
| Missing Data Pattern `_scanBlocks` | Concentration scan over consecutive missing rows uses a Bonferroni-corrected MCAR null over the spatial search volume — order-invariant in the same sense as DupDet block-copy. Cross-reference at v1.0 onwards. |

**Cross-reference.** See METHODOLOGY-MAP.md §"Archetype 4 — Long-format tables" for the dataset-archetype view, and the per-test sections (§1.1 row-semantics note, §1.2 self-gating paragraph, §2.1 self-gating paragraph, §2.1b self-gating paragraph, §2.3 / §2.4 / §2.6b / §2.7 / §4.2 row-semantics-skip statement, §2.5 / §4.3 sub-unit suppression notes, §1.9 row-semantics-invariant note).

---

## Condition Grouping Contract (v1.x, S318)

**This section defines what a condition is, for every test that groups rows by condition.** It sits upstream of the battery, in the same engine layer as the Row Semantics Gate. Every row-grouped test — §1.9 Cross-Condition Consistency, §2.4 Row-Mean Runs, §2.6 Mahalanobis Row Outlier, §3.6/§3.7/§3.8 the distribution-shape trio, and any test dispatched through `condCtx.rowGroups()` — inherits this contract. It states an assumption the tool cannot check from the data, and says what the tool must do when it cannot check it.

**Motivation.** The permutation nulls in the row-grouped tests all rest on one assumption: **conditions are exchangeable at the row level.** Rows within a condition are interchangeable draws from the same distribution, so shuffling condition labels across rows generates a valid null. This assumption is true when a condition is an experimental *arm* — a level of a variable the experiment manipulated or contrasted. It is false when the grouping variable is a *stratum* — a label recording where a row came from. The two are indistinguishable in a spreadsheet, and the tool cannot tell them apart. This section states that limit plainly.

**A second, independent failure: paired designs.** The rule above fails when the grouping variable is a stratum rather than a factor. It also fails when the grouping *is* a genuine factor and the same subjects appear in every condition. There the assumption breaking is not "which variable is the factor" but that row `r` in one condition and row `r` in another are the same unit, so a free shuffle across rows builds pseudo-conditions drawn from different subject sets, and where between-subject variation dominates the condition effect — the ordinary case in a matched design — an unremarkable observed distance reads as anomalously small. Unlike the factor/stratum boundary, this one **is** decidable from the data: column-grouped data is paired by construction, and row-grouped data is paired where an identifier column holds every subject exactly once in every condition with identical sets across them, defaulting to unpaired where that evidence is absent. Two tests are withheld on that verdict — Cross-Condition Consistency (P82, `ee2fe48`) and Residual Spike Correlation (P86, `f1938ee`), reaching 9 of 27 corpus fixtures. The governing rule is the **destroyed correspondence, not the direction of the shuffle**: a test is withheld where its null destroys the correspondence the design carries, whichever way its permutation runs. See `docs/shared/S350-PAIRED-DESIGN-DISPOSITION.md`.

The precise form of the error is a mismatch between the **observational unit** and the **experimental unit**. The observational unit is the row in the spreadsheet — a single plant, a single measurement. The experimental unit is the smallest unit to which a treatment was independently applied — the plot, the tank, the subject. A permutation null must shuffle experimental units, not observational units. When the tool groups by the product of several strata, it permutes observational units within an address, which is not a valid null for anything the study was designed to test. This is the standard design distinction (Montgomery, *Design and Analysis of Experiments*); the tool has no way to see the experimental unit in the data, because the data records only observational units.

**Factor versus stratum.**

- **A factor** is a variable the experiment manipulated or contrasted: Treatment, Genotype, Warming, Origin. Its levels are **arms**. Rows within an arm are exchangeable under the null. Grouping by a factor is what the permutation nulls are built for.

- **A stratum** is a label recording *where a row came from*: Plot, Pair, Site code, Species name, Block, Subject ID. Its levels are **addresses**, not arms. A stratum partitions the data, but its levels are not draws from a common distribution — they carry the very structure (spatial, taxonomic, individual) the forensic tests exist to distinguish from fabrication.

**The distinction is not in the file.** Whether a column is a factor or a stratum is a fact about the experimental design. It lives in the paper's methods section, not in the data. In a spreadsheet, both appear the same way: short repeated strings in a non-numeric column, or small-cardinality integer codes. **Role inference cannot recover the distinction, because the information is not present to recover.** Any rule the tool applies here — a cardinality threshold, a header-keyword list, a group-size floor — is a heuristic standing in for knowledge the tool does not have.

**Merging condition columns is not free.** The engine forms the grouping key as the joined concatenation of *every* column role inference tags `condition` — the Cartesian product of all of them. This is defensible only when the columns are genuinely crossed factors, each cell a real arm:

- `Treatment × Genotype` on a 2×2 factorial is a valid key. Each of the four cells is an experimental arm with replicate rows, and those rows are exchangeable under the null.
- `Species × Plot × Pair × Code × Origin` is **not a key at all**. It is a row address. The product of five metadata columns produces one tiny group per unique address — dozens or hundreds of groups of a few rows each, none of them an arm.

**The tool cannot verify that condition columns are crossed factors** any more than it can verify that a single column is a factor. Merging inherits the same limit as tagging, one level up.

**The contract.**

1. **A valid condition grouping requires exchangeable rows within each group.** The tests assume it; the assumption is real; the tool cannot confirm it from the data. Where it cannot be confirmed, the tool must not present a row-grouped verdict as if the assumption held.

2. **Grouping that produces no usable structure must say so.** When the grouping key is unique or near-unique per row — every group a singleton, or the group count approaching the row count — `rowGroups()` returns null and the row-grouped tests fall through to their ungrouped path or return N/A. **The output must announce that grouping produced nothing.** A silent fall-through renders as a clean verdict on a file the grouped tests never assessed. This is the same failure as a test that returns a null p-value without counting anything: a confident answer from an unexamined input. Announcing the empty grouping converts a silent false clear into an honest "not assessed." This holds unconditionally, independent of everything below.

3. **Where the grouping cannot be validated from the data, the tool asks rather than asserts.** The data can still do useful work first, on one purely mechanical ground: whether a grouping can support a permutation test at all. A candidate column or combination that produces singleton or near-singleton groups is degenerate — there is nothing to permute — regardless of whether it is a factor or a stratum. That is a property of group sizes, not of meaning, and it is safe to compute and prune automatically. **Everything that survives the count filter goes to the user.** The tool shows the columns inference has tagged as conditions, the resulting group count, and the group sizes, and lets the user confirm or correct before the row-grouped tests run — *"These seven columns produce 132 groups of about 18 rows each. Is that your experimental design?"* When the answer is no, as it usually is for merged strata, the user corrects it instantly from knowledge the file does not carry. **The survivors must not be ranked.** There is no "more factor-like" signal to sort them by — every candidate signal (cardinality, balance, crossing pattern, outcome-association) points the wrong way at least once, so a ranking is a guess dressed as a recommendation. Prune on group size; ask about the rest; rank nothing. Every alternative — a fixed cardinality rule, a group-count cap, an inferred factor set — is the tool asserting a fact about the experimental design that it cannot read. Asserting knowledge it does not have is precisely the failure this battery exists to catch in others.

**What the tool must not do.**

- **Do not cap the group count and proceed.** A cap makes an incoherent computation run fast. It does not make it coherent, and it hides the finding that the grouping was wrong.
- **Do not treat "the permuted null absorbs the structure at high group counts" as a defence.** Reassigning labels across many tiny strata may approximately preserve the marginal, which would neutralise the very structure the test exists to detect. This is plausible, untested, and circular-null-adjacent. It is not a licence to run the tests on merged strata.
- **Do not pick the grouping column by its association with the measurements.** The instinct is that a real factor should explain variance in the outcome, so the column most associated with the data must be the factor. This is wrong twice over. It is **circular**: the null already assumes exchangeability with respect to the outcome, so selecting the grouping variable by its outcome-association chooses the variable using the very quantity the null is about. And it is **empirically backwards**: a stratum is often chosen precisely because it explains large baseline variance — site explains more variance in soil chemistry than the treatment does — so the most-associated column is more often the stratum than the factor. Outcome-association points at the wrong column and disqualifies itself as a selector regardless.

**Enforcement — when the tool asks (S319).** Clause 3 states the principle: prune mechanically, ask about survivors, rank nothing. This is the operational trigger — *when* the confirm step fires, stated so it does not smuggle in an unexamined constant. The tool asks the user to confirm the grouping before the row-grouped tests run when **either** arm holds:

- **Arm 1 — combinatorial merge.** The grouping key is built from **three or more** columns tagged `condition`. One or two crossed factors is a defensible factorial; three or more concatenated columns is a row address, not a set of arms. The threshold is the factorial-versus-address boundary the contract already draws in prose, not a number fitted to group sizes — across the corpus every sound design groups on one or two condition columns and every merged-strata file on three to seven, with no file sitting near the line.

- **Arm 2 — the grouping cannot support a permutation test.** `rowGroups()` returns null (every group a singleton, or fewer than two groups), or the partition is thin — a large share of groups sit at or within one row of the three-row floor. This is the same degeneracy clause 2 already computes for the announce-empty banner, extended to the thin-but-non-null case; it is not a second independent constant. It catches the file that is not over-merged but still cannot be permuted (two condition columns, many groups of three).

**When neither arm holds** — one or two condition columns producing groups comfortably above the floor — the grouping runs as it does today, silently. A clean 2×2 factorial is never interrupted.

**When either arm holds**, the four row-grouped tests return **N/A pending confirmation** (not a verdict — the honest state is that the grouping is unconfirmed, and a provisional grouped verdict would be the exact silent false clear clause 2 forbids). The confirmation surface is **hybrid**: the import view shows a banner that grouping needs confirmation, and the results view carries a confirm card showing the condition columns inference chose, the resulting group count, and the group sizes, with a control to confirm or correct. No ranking of the columns — the user is shown the set and its consequence and decides.

**The confirm card (interaction, S320–S321, both parts built).** The results-view card lists the condition columns inference chose, each with a checkbox ticked by default, alongside the resulting group count and the group sizes. Correcting a wrong grouping is direct: the user unticks a column and the card recomputes the grouping live — new group count, new sizes — and with it the trigger state, showing whether the current set still trips either arm. The user is not editing blind; they see when they have reached a grouping the tool considers sound. Confirming runs the four tests grouped on the ticked set exactly as it stands — the live trigger indicator informs the choice, it does not gate it, because the user is the domain expert and may confirm a set the tool would flag if they know it is a real design. The columns are never ranked (the load-bearing claim below); the card shows the set and its consequence and nothing more. On the four test cards themselves the pending state carries its own copy — "N/A — grouping needs confirmation" — and it renders distinctly, as an amber pending row. **Corrected at S368:** the sibling string this was once contrasted against, a settled "N/A — not applicable," exists nowhere in `src/`. Settled declines moved to §5 at S333, so what a reader now tells apart is an on-card pending row and a §5 decline block, not two strings on the same card. **The path is also unexercised by the batch.** `groupingPending` is zero across all 27 fixtures, so no batch run has ever rendered the pending state, and the instrument that would check any fix to it has no coverage of it.

*Built across S320 (trigger) and S321 (confirm card, four live-render rounds). **Both parts are on main.** The six-commit stack promoted at S323 in merge `07887a5`; verified at S367 by `git merge-base --is-ancestor 005026e main`. The stance it was held for was cross-validated at S322. **Correction (S367):** this line read "sit in one unpromoted stack, held until the stance below is locked" for forty-four sessions after the promote, because the stack rode into main beneath a promote named for the coverage-vocabulary work and nothing recorded it. The confirm action is fast — the four grouped tests cost about 0.19 s on C09, not the minutes the stale "Blocked Mahalanobis takes minutes" framing implied; that permutation test is not one of the four and confirm never runs it.*

**The stance the card takes (S322, cross-validated).** The card hands a grouping judgment to users — journal editors, integrity officers, editorial-office staff, individual researchers — who may not share the tool's grouping model. How the card frames that judgment is a methodology decision, not UI polish, and it was settled against a measured firing rate and a second cross-model round. Three rules:

1. **Lead with a plain statement of what the tool did, not a claim about the study.** The card says *we grouped your data using these columns* — **not** *these columns were read as your experimental design.* The phrase "experimental design" borrows authority the inference has not earned: to a field ecologist, spatial labels (Site, Block, Plot) genuinely *are* their experimental design, so the phrase validates the exact over-merged grouping the card exists to question. State the mechanical act and leave the design claim to the user.

2. **Invite correction by unticking; propose nothing.** The card offers the set and its consequence and lets the user remove columns. It does **not** suggest which columns are the real factors, name a "primary treatment," or rank a shortlist — every such move reintroduces the factor-versus-stratum call the tool has proven it cannot make. Unticking, not ranking.

3. **A visible "leave these tests N/A" exit, as the safe path.** A user who cannot say what the design is — common among third-party screeners handed an unfamiliar file — must be able to land on an honest non-answer with one action, rather than being forced to guess a grouping just to clear the card. A confident verdict on a guessed grouping is worse than an honest "not assessed." This is the screening-not-adjudication principle applied to the card itself.

**Stated limitation — the checkbox expresses a flat product, not nesting.** Unticking columns can only produce a grouping of the form `A × B × C`. A genuinely nested design (Block within Site) cannot be reconstructed through it, and the interface should not imply otherwise. For such designs the honest path is rule 3's N/A exit. Solving nesting properly is out of scope for v1.0; recorded as a v1.x candidate in `V1X-FUTURE-WORK.md` §2.10.

**The firing rate (S322).** The card fires on 7 of 22 corpus deposits, but bimodally: about 47% of row-groupable ecology field tables and 0% of assay, instrument, or expression data. It is a niche-domain surface — routine within ecology, unseen outside it. The corpus is entirely PubPeer-flagged and ecology-skewed, so this is not a representative upload rate.

*Trigger validated (S319) against the twelve-file grouping census in `V1X-FUTURE-WORK.md` §2.10: the two arms separate every merged-strata file from every sound-factor file with no borderline case. The one two-column-but-thin file (C20) is caught by Arm 2, not Arm 1. The exact predicate for "thin" is pinned at build against that census. The trigger is a Chat-owned design decision; the confirm card is a new UI surface and is built with live-render iteration, not a one-shot dispatch.*

**Cross-validation and literature.** The load-bearing claim — that factor versus stratum is not decidable from the data alone — was checked against three independent models (Gemini, Grok, Sonnet). None could produce a data-computable signal that separates the two without a surviving counter-example; all three independently found that outcome-association points at the stratum, not the factor. The distinction is well-established under several names, and in every framing it is a design fact rather than a data fact: *treatment factor* versus *blocking factor* in design of experiments (Fisher; Montgomery); *fixed* versus *random effect* in mixed models, where the choice has no purely data-driven test (Searle, Casella & McCulloch, *Variance Components*); and exchangeability itself as an analyst's *judgment* about which units are interchangeable, not a property read off the data (de Finetti; Good, *Permutation, Parametric and Bootstrap Tests of Hypotheses*). The causal-inference parallel is loose but the same shape: which variable is the treatment versus a covariate is not recoverable from data without a design (Pearl). See `V1X-FUTURE-WORK.md` §2.10 for the full treatment.

*Second round (S322) — the card's stance.* The stance above was put to the same three models adversarially: given a surface that fires on roughly half of one domain's uploads and never outside it, does leading with a stated grouping plus invite-correction beat teach-first or accept-default? The stance survived — none replaced it with either alternative — but all three independently landed two amendments, now folded in. First, the word "design" misleads a non-expert by borrowing false authority (all three named the exact phrase), fixed by the mechanical wording in rule 1. Second, invite-correction assumes a competence the user often lacks, so the card needs a first-class N/A exit (rule 3). Two proposals were rejected as back-door ranking: a tool-suggested "primary treatment" and a "these are strata, not factors" hint both reintroduce the call the first round proved undecidable. The models also surfaced the flat-product limitation recorded above.

**Grouping-key eligibility: minimum level size (v1.x, S325).** A column is only a grouping key if its levels hold enough rows to test constancy against. A level holding a single row makes "constant within this level" vacuously true of every column, so any column admitted on that basis holds out every measurement in the file. **The rule: reject a candidate key whose median level size is below 2.**

*The threshold is pinned against the corpus, not chosen.* Every key producing a false holdout has a median level size of 1. Every legitimate holdout has a median of 3 or more — C12's `Site` at 54, its site attributes at 144, C20's `Taxa_combination` at 3. No key in the corpus sits at 2. A threshold of 3 would cost C20's `Richness_bacteria` holdout, which is a real property of a taxa combination. So 2 is the only value that rescues every failure and preserves every legitimate holdout.

*Median, not minimum or fraction.* Minimum level size does not separate — legitimate keys have minimum 1 as well (C11's `donor`, every C14 measurement key). Single-level fraction separates but with a looser boundary, 0.17 against 0.92. Median gives the cleanest cut and the most interpretable statement of the rule.

*Two triggers, one clause.* A sparse column whose null rows are skipped (C15's `VT` — three values over sixty rows, judged in its unfilled form) and a near-unique numeric column landing just under `MAX_LEVEL_FRACTION` (C10's density readings) look different — one leaves rows unassigned, the other does not — but both produce median level size 1. One clause covers both.

*Effect at S325:* nineteen corpus sheets rescued from a throw, four corrected from silent column loss (C07 Mastersheet 21→39 data columns, C18 chill coma 1→6), five legitimate holdouts unchanged. `MIN_LEVEL_SIZE = 2`, exported from `src/import/roles.js`. `MAX_LEVEL_FRACTION` is the upstream cause of the near-unique trigger and was deliberately not touched — the median clause covers both triggers and is the measured lever.

**Status.** The contract is stated and the enforcement is live **on the row-grouped path only** — see the scope note below. Point 2 (announce empty grouping) shipped first as the move-1 banner, and is now **superseded by Point 3** — move 2 owns the null-and-thin case, and the banner-on-null trigger was retired when the enforcement trigger landed (S320), since every file the banner fired on is caught by the trigger's Arm 2. Point 3 (confirm the grouping with the user) is the real resolution and is **built, both parts**: the trigger — Arm 1 (≥3 condition columns) and Arm 2 (`rowGroups()` null or median group size ≤4, the thin predicate pinned against the `V1X-FUTURE-WORK.md` §2.10 census) — validated 6-fire/6-clean (S320); and the confirm card across four live-render rounds (S321), mechanism-verified on C09. The stance the card takes is set and cross-validated (S322, above). Point 1 is the principle both serve. **The stack promoted (S323); the grouping-key eligibility clause above landed at S325.** Row-grouped verdicts on files whose condition columns are merged strata remain **not interpretable** until the user confirms the grouping — see the corpus census in `V1X-FUTURE-WORK.md` §2.10 for the affected files.

**Scope note (S377). Point 2 is unconditional and its only shipped enforcement is not.** Point 2 is stated for the row-grouped path, and the trigger that superseded it has two arms that are both row-grouped. **A column-grouped file whose group loses every column reaches Point 2's principle and no enforcement at all.** The route is a user hold-out under P93: `buildGroups` drops the emptied group before the layer that would return the N/A, so `aggregatePerGroup`'s `erroredCoverage` announcement cannot fire, and at fewer than two surviving groups `conditionContext.js` reclassifies the file away from column-grouped without saying so. Held out far enough, the file is reported as having no rows. **Point 2 governs this and nothing implements it.** Measured read-only at S377; see `docs/shared/P93-DISPOSITION.md` §5 and `docs/shared/S377-P93-IMPLEMENTATION-SURFACE.md`.

**Cross-reference.** `V1X-FUTURE-WORK.md` §2.10 (the corpus census, the mechanism at source, and the option analysis); §2.5 (the mirror defect — columns inference fails to recognise *as* conditions, the same factor/stratum boundary seen from the other side); §1.9 Known Limitations (the exchangeability statement this contract qualifies).

---

## Applicability and Coverage Reporting Contract (v1.x, S322 — cross-validated, revised)

**The principle.** A test that did not produce a verdict has not told the reader nothing. It has told them one of two different things, and the tool must not conflate them internally. But the tool must also not let that distinction shrink what it claims to have examined. This section states both halves, because the second was nearly lost to the first: an earlier draft of this contract used the distinction to narrow the coverage denominator, and cross-validation established that doing so would have made the tool look safest on exactly the files that most deserve scrutiny.

**The two senses.** Every N/A result belongs to exactly one:

- **Not applicable.** The test's preconditions are properties of the data, and this file does not have them. A replicate-difference test on a file with one replicate column; Benford's Law on data spanning half an order of magnitude; a cross-condition test on a single-condition file. The battery correctly declined to apply a tool to data it does not fit.
- **Not assessed.** The test's preconditions are met — it applies to this file — but it could not run or could not compute. The grouping is unconfirmed; the groups are too thin to permute; the covariance matrix is singular; every column failed a per-column gate. The pattern the test looks for may be present and unlooked-for.

**Fuzzy cases default to not assessed.** The boundary is not crisp everywhere, and pretending otherwise would give the classification a false precision. A singular covariance matrix may reflect genuine structural rank deficiency (not applicable) or an accident of missing or duplicated rows (not assessed); a group of three rows may be read as a property of the file or as a limit of the permutation arithmetic. Where source does not settle it, classify as **not assessed**. That costs some apparent coverage and never lets a real gap hide as a non-event. The direction of the default is the load-bearing part, not the classification of any individual case.

**The denominator is the full battery, always.** Coverage is reported against all 29 tests. The applicable count is reported alongside it as a second number, never as a replacement:

> *12 of 13 applicable tests ran (13 of 29 in the full battery).*

Two numbers, both visible, neither concealing the other. **Reporting coverage against applicable tests alone is forbidden**, because it lets the denominator move with the data. A file with one replicate column, one condition, and a narrow numeric range knocks out roughly sixteen tests on applicability grounds — including several of those best at catching fabrication — and would then report near-complete coverage of what remained. Every word of such a report would be true and it would be worthless. Worse, the incentive runs the wrong way: thin, structurally impoverished datasets are both the easiest to fabricate convincingly and the ones a moving denominator scores best. The tool is a generic screener with no knowledge of what a given experiment *should* contain, so it cannot know what the denominator ought to be, and must therefore not move it.

**A thin file is reported as thin, in words.** When the applicable count falls materially below what comparable files support, the report says so plainly rather than presenting a high proportion of a small number. The clean-data baseline is 15 to 26 applicable tests of 29. A file offering thirteen has not been thoroughly screened, and the honest sentence is that it lacks the structure to be — not that it passed what applied. This is a statement about the file's amenability to screening, not a finding about the data.

**No clean verdict may assert completeness it does not have.** A report with no findings states what it examined and stops. It does not tell the reader that no further investigation is needed — that is an adjudication, and this instrument screens. Where applicable tests went unassessed, a clean result says so on the same surface as the clean claim, not in a section below it.

**Structural absence may itself be a finding — recorded as open scope, not resolved here.** Cross-validation surfaced a case this contract does not cover. A file reporting only group means and standard deviations, with no raw replicates, will correctly return *not applicable* across every replicate test. But the missing raw data is itself the shape fabrication often takes, and labelling its absence "not applicable" risks neutralising a signal with clinical terminology: it tells a reader the tool looked and found the question inapposite, when the reader should be asking why the raw values are absent. Undifferentiated N/A at least prompts *why did this not run?*; a confident "not applicable" answers and closes that question. Detecting structural omission as a signal in its own right is a capability the tool does not have. It is recorded in `V1X-FUTURE-WORK.md` as a candidate detection surface, and until it exists, this contract's "not applicable" label must not be read as exculpatory.

**The engine carries the distinction. The display does not read it.** *This paragraph asserted the opposite for thirty-seven sessions and was corrected at S368 by measurement against source.* The S322 reading — an N/A result as `{name, category, flag: "N/A", primaryP: null, description}`, with no reason code, no applicability field and no enum, the sense living only in free-text `description` — was true when written and has been false since S331. `NA_CAUSE` shipped at `8253eb8` as a seventeen-code enum and is populated on **270 of 270** N/A results. `primaryP` is absent on 84% of them. Preconditions are still enforced by per-test early returns with no shared gate, and the three engine wrappers (`dtSkip`, `condSkip`, `pendingResult`) still short-circuit before dispatch. **`groupingPending` is a separate boolean, not an enum code, so it is the first structured marker rather than a member of this one.** **The engine also ships more states than this contract names:** `classifyCoverage` returns six, of which this contract describes two. `subjectsSharedAcrossConditions` (18 results) files as `withheld`, a state the contract predates entirely and nowhere accounts for.

**The enum's cut is not this contract's cut, and the two cross.** *Corrected at S368b; the first draft of this paragraph read the two partitions as the same one, which is why the number below moved.* `classifyCoverage` does not read `NA_CAUSE`, and **145 of 270** N/A results file as *not applicable* on causes the enum calls shortfalls. That is not 145 misfilings. **Three of the worked not-applicable examples above are enum shortfalls** — one replicate column, a single-condition file, a half-order-of-magnitude range — and they carry **96 of the 145**, every one filed correctly. `missingnessOutOfBand` adds **25** more on the same principle, though by reading rather than by worked example. **The residue is 24, spread across five codes, and every one is unsettled** under the fuzzy-case paragraph above. They become misfilings only when this contract applies its own not-assessed default to them, which it has not yet done. *(A sixth unsettled code carries three further results, but those file as `errored` and so cannot be misfiled as not applicable: 27 unsettled results, 24 of them on the not-applicable path.)* Measured across the 27 fixtures at seed offset 0; three of the seventeen codes go unreached on that corpus, so this is a statement about fourteen.

**One known message defect, now fixed — kept here because it was a reporting failure and not a bug in the mathematics.** When a per-group-dispatched test found no group applicable, `aggregatePerGroup` called the test with an empty matrix to recover a name-and-category prototype, then kept that call's self-description. The card consequently reported **"No DATA columns."** on files that had data columns and non-empty groups. The state was correct in every case — the tests genuinely could not run — and the accurate reason was already computed and stored one field away, in `details[0].note` ("No group had sufficient data for this test"). Only the displayed description was false, and the same string covered two structurally different upstream causes: healthy groups with every column pre-skipped, and groups too thin to test. **Resolved at `aggregation.js:98–106`; verified by source at S368, where the string returns no hits anywhere in `src/`. The session that fixed it is unrecorded.** **The footprint stated here was wrong in both directions.** It named Column Goodness-of-Fit, Modality and Entropy on five fixtures (DS03, DS04, DS09, DS12a, DS12b). Measured, it was **one test — Column Goodness-of-Fit — on three: DS09, DS12a and DS12b.** Modality and Entropy never carried it; DS03 and DS04 were never affected. These results were **not assessed**, not inapplicable.

**Cross-validation.** The contract was put to three independent models (Gemini, Grok, Sonnet) adversarially. The two-sense distinction survived — none argued the senses are equivalent. **The applicable-denominator rule did not**, and all three broke it at the same point, independently: a moving denominator lets a structurally impoverished file report near-total coverage, and rewards the data shapes easiest to fabricate. Gemini's framing is the one retained above — as a generic screener the tool cannot know what the denominator should be, so a dynamic denominator is unsafe. Two further findings are folded in: the boundary is fuzzy on rank-deficiency and small-group cases, resolved by the not-assessed default; and inapplicability can itself be the signal, recorded above as open scope. The revision is a direct consequence: the fixed denominator, the second reported number, the thin-file sentence, and the non-exculpatory reading of "not applicable" all exist because the first draft failed this round.

**Status — read at S368, and the premise this paragraph rested on was false.** It said the display vocabulary and the structured field both remained to be built. The field shipped at S331 (see above). What has never been built is the display's consumption of it, so **the reconciliation this contract has been waiting on is a wiring job, not a build.** Measured at S368 against shipped `src/`: (a) the two-number coverage line does **not** ship in this contract's form — eight ratio sites each render one number, and `BatchView.jsx:261` renders applicable-over-29 alone; (b) the fixed denominator holds on dataset surfaces and fails on category ones, because `coverage.js:135` and `:181` render `ran of couldRun` — the moving denominator this contract forbids — on **69 of 135** cluster instances, and `01-densitometry-clean` renders a green **"Clear · 2 of 2"** over a five-member cluster, which is precisely the failure cross-validation predicted: the tool looks safest on the file it examined least; (c) the thin-file sentence does not exist in `src/`; (d) the completeness disclaimer sits on the wrong surface — the §1 banner reports `ran of 29` and errored counts only, and the honest sentence sits in §4, below the clean claim rather than beside it. The §5 coverage line reconciles. **Category denominators do not reconcile at all.**

**The pending path is the exception, measured at S368b.** An earlier draft of this paragraph asked whether a `groupingPending` result files as *not applicable* or as *not assessed*, and warned that the first answer would let four tests leave the denominator on every file awaiting a confirm. **Neither answer is the one source gives, and the conditional does not fire.** `coverage.js:77` files a pending result as `pending` — an explicit branch naming the marker, placed ahead of the `notApplicable` fallback, which a pending result therefore cannot reach. Pending is excluded from the subtraction that builds `couldRun`, and a non-zero pending count suppresses the ratio and downgrades the copy to *"Clear so far"* before the green branch is reached. **The moving denominator is structurally unreachable on the pending path.** Three parallel classifiers cannot see the marker and all three still agree on direction. **One asymmetry is recorded here and not adjudicated:** the withheld branch carries a `ran > 0` guard that renders *"Not evaluated"*, and the pending branch carries no such guard, so a three-member cluster with all three members pending renders *"Clear so far"* over nothing run. Until the wiring lands, the category coverage denominators, the §5 coverage line and the clean-result copy remain provisional.

**Cross-reference.** Condition Grouping Contract (above — the same principle applied to one specific precondition, and the origin of the first structured marker); §Design Rationale / Fisher's-combination exemptions (the seven tests exempt from combination, several of which N/A on applicability grounds); `V1X-FUTURE-WORK.md` (structural-omission detection, recorded as open scope).

---

---

**This document was split at S362.** It carries the framework: the α model, permutation arithmetic,
pooled dependence, the transform, the input gates and contracts, the design rationale and the
references. **The 29 tests themselves live in `METHODOLOGY-TESTS.md`**, numbered §1 to §5 exactly as
before.

**Cross-reference convention.** A bare `§1` to `§5` reference, at any depth, means
`METHODOLOGY-TESTS.md`. Everything else named in prose — the α framework, the arithmetic constraints,
the row-semantics gate and so on — is in this file. Nothing was renumbered, so every reference that
worked before the split still resolves; only the file it resolves into changed. **A `§5.x` reference
is the exception and must always be qualified with a filename**, because `V1X-FUTURE-WORK.md` numbers
a different set of things at those coordinates.

---

## Design Rationale

The tool does not produce an overall "fabrication probability" or numeric score. Three reasons:

1. **Prosecutor's fallacy risk.** In adversarial investigation settings, a composite score would be treated as a probability of misconduct. This misuse is well-documented in forensic science (e.g., the Sally Clark case, the Lucia de Berk case).

2. **Non-independence.** Several tests examine overlapping properties of the same data (autocorrelation, kurtosis, and runs all analyse inter-replicate differences). Formal combination methods (Fisher's, Stouffer's Z) assume independence and would overstate significance.

3. **Context-dependent weighting.** The probative value of each test depends on the data type. A duplicate detection flag on continuous absorbance data is highly suspicious; the same flag on integer cell counts may be innocuous. Weighting requires contextual judgement that software cannot provide.

### Fisher's-combination exemptions

Fisher's χ² = −2Σ ln(p_i) assumes each input p_i ~ Uniform(0, 1) under H₀. This assumption fails for any test whose group-level `primaryP` has a non-uniform null distribution — specifically, tests whose primaryP is the minimum of a BH-FDR-adjusted family, an arithmetic floor truncation, or a shared-simulation-denominator statistic. Combining such floor-truncated primaryP's across groups inflates the χ² statistic relative to the independent-uniform null, promoting clean fixtures above the aggregated-flag thresholds.

**Current exempt list (`src/analysis/aggregation.js`):**

- **Excess Kurtosis (§2.2).** The pooled kurtosis simulation null is shared across groups within an analysis — the same simKurt denominator contributes to every group's p-value. Under H₀ the per-group primaryP is stochastically smaller than Uniform(0, 1).
- **Windowed Autocorrelation (§2.1b).** Per-pair BH-FDR with nWindows ≈ 18 and N_PERM = 999 floor-truncates per-pair min adj-p at the raw floor `1/(N_PERM+1) = 0.001`. Under H₀ group-level primaryP concentrates near 0.01–0.02 — not because that is the floor, but because a clean family rarely puts more than one window there, so the reported minimum lands near `m/(N_PERM+1) ≈ 0.018`. (This line read `≈ 1/(N_PERM+1) × nWindows ≈ 0.01` as the truncation point until S344; that is the rank-1 form. The observed concentration is right, the floor was not.) Either way the distribution is not uniform on [0, 1] and the exemption holds. Surfaced on DS16 (clean Carlisle-overbalanced, 3 groups) when per-pair BH landed in S109 Part 2 — three near-floor primaryP's Fisher-combined to HIGH before the exemption was added.
- **Blocked Mahalanobis (§2.6b).** BH-FDR across the (pass × condition) family with m = 2·nCond and B_perm ∈ {999, 4999} floor-truncates primaryP under H₀ — the reported minimum cannot fall below the raw floor `1/(B_perm+1)`, which is 0.001 at B_perm = 999 and 0.0002 at 4999. (This line read `≈ m/(B_perm+1) = 0.0008–0.0016` until S344; that is the rank-1 form and is not what `bhFDR` returns. The truncation is real and the exemption stands — only the value was wrong.) In row-grouped layouts where a single condition column spans multiple groups, the within-condition permutation pool is shared across groups, compounding the non-uniformity. Exempted at landing (S110) to pre-empt the failure mode surfaced on Windowed Autocorrelation in S109.
- **Mahalanobis Row Outlier (§2.6).** `primaryP = binomP` from the dataset-level binomial on rows exceeding χ²(p, 0.99). The χ² null assumes multivariate normality; under heavy-tailed raw data the exceedance count exceeds the binomial null even when zero rows survive Stage-2 BH-FDR at α = 0.001, so `binomP` is stochastically smaller than Uniform(0, 1) under H₀. On multi-condition row-grouped fixtures under VST=raw routing, per-group Fisher's combination of the small per-group binomP values promoted the aggregate flag LOW→HIGH while each per-group verdict correctly rested at LOW — a false positive bypassing the test's own per-row evidence requirement. Added S127c; the aggregator falls back to `worstGroupFlag` for §2.6.

**Forward-compatible rule.** Any new test with (a) internal BH-FDR over a multi-element family that feeds primaryP, (b) a shared simulation/bootstrap denominator across groups, or (c) an arithmetic floor on primaryP from finite permutation counts should be evaluated against this principle at landing time. The default is exemption; inclusion in Fisher aggregation requires an explicit argument that the test's primaryP is uniform under H₀.

The Fisher aggregation step remains in use for tests that do satisfy the uniform-null assumption (Constant-Offset, Regional Noise, Runs, etc.). The exempt list is a targeted correction, not a generalised abandonment of aggregation.

### Per-unit word: inferential vs descriptive surfaces (S220)

The display principle that a per-unit word follows the corrected (BH-adjusted) decision the verdict uses, never a raw statistic or magnitude band, assumes a corrected decision *exists at the per-unit grain*. Three cards whose per-unit table shows a finer unit than the grain at which correction runs were audited against it. The principle resolves three ways, not one.

**Excess Kurtosis — conforms.** A BH-FDR across conditions (`condAdjPs`) is already computed; the per-condition word was instead driven by the raw permutation-p flag plus the κ-deviation band. The corrected per-condition decision is brought forward to drive the word. Note the directional asymmetry already in the design (§2.2): only *platykurtic* ("too uniform") observations contribute to flagging — leptokurtic ("too peaked") observations are informational only at all N. So the corrected decision applies to the platykurtic word; the leptokurtic word remains descriptive by the existing directional-suppression rule, not as a new exception. The κ-deviation band is retained only as *direction* (uniform vs peaked), not as the significance gate.

**Within-Row Variance — descriptive, by design.** The per-row statistic `z = (row.sd − expectedSD) / scale` is a *robust screening flag*, not a calibrated test statistic. `expectedSD` and `scale` are the bin-median and bin-MAD of a binned mean-variance fit, regularised by a dispersion floor, and the per-row decision is a deliberately conservative fixed cut (`|z| > 4.0`), not a p-value. The row sits inside its own reference bin (in-sample), but the median/MAD estimators over a bin of ~10+ rows down-weight any single member, so the null is in-sample-but-robust rather than mean/SD-circular. The actual inference runs at the grains the verdict uses — the test-wide exceedance binomial (`globalP`) and the per-15-row-window BH-FDR (`windowScanP`). Converting the per-row z to an adjusted p would impose a Gaussian calibration the design intentionally withholds and assert a per-row significance claim the statistic cannot support. The per-row word ("too smooth" / "too noisy") is descriptive of the robust deviation; correction lives at the window and test-wide grains.

**LOESS Residual — descriptive, by selection.** The per-region word reads a magnitude ratio (`obsSD / expSD`: > 1.5 "Noisier", < 0.67 "Quieter"). Regions are CUSUM-changepoint splits — their boundaries are chosen from the same data, so a per-region p tested after the split would be selection-inflated, the circularity the leave-one-out designs elsewhere (e.g. IRC §1.5) exist to avoid. Correction lives at the test-wide scan-max and changepoint permutation grains (`scanP`, `cusumP`). The per-region word is descriptive; the inference is test-wide.

Both Within-Row Variance and LOESS retain the raw statistic (z, Ratio) as honest magnitude *context*. The descriptive per-unit surface is read as evidence-for-the-verdict, not a standalone per-unit significance claim; the labelling must not imply the latter. Whether a rendered surface actually implies per-unit significance is a visual-walk judgment, settled on the live UI rather than here.

### Threshold Transparency (v0.4)

Every threshold in the tool falls into one of three categories. This section documents which is which, so reviewers can assess the epistemological basis of each decision independently.

#### Tier 1 — Formal statistical tests

These thresholds are derived from a null hypothesis and a test statistic with a known or simulated distribution. The user can evaluate whether the null is appropriate for their data. No forensic judgment is required.

| Threshold | Mechanism | Reference |
|-----------|-----------|-----------|
| HIGH (p < 0.001) / MODERATE (p < 0.01) | Unified α framework across all 22 tests | Standard significance levels |
| Permutation p-values (Constant-Offset, Regional Noise, Residual Spike, LOESS scan, Windowed IRC, Windowed Runs) | Exact p from row-shuffle null | Fisher (1935); no distributional assumptions |
| Simulation p-values (Kurtosis + A-D, Benford 1st + 2nd digit) | Calibrated against simulated null at observed N; adaptive A-D/kurtosis selection by n_rep | Monte Carlo testing; Anderson & Darling (1952) |
| Value-Frequency Spike Poisson null | P(X ≥ obs \| λ = local smoothed expected); BH-FDR corrected | Poisson survival; Benjamini & Hochberg (1995) |
| CUSUM changepoint (LOESS test) | max \|CUSUM\| against row-shuffle null; Bonferroni with scan stat | Page (1954) |
| Fisher's aggregation (per-group) | χ² = −2 Σ ln(p_i), df=2k | Fisher (1932) |
| BH-FDR correction (IRC pairs, Runs windows/pairs, Row-Mean Runs windows, Kurtosis conditions, ConstOffset pairs, RegNoise columns, LOESS pairs, Mahalanobis rows, VFS, DupDet 4-p combine) | Benjamini-Hochberg at q=0.01 or q=0.001 | Benjamini & Hochberg (1995) |
| VST slope CI test (H₀: slope = 1) | 95% CI on log-log regression slope; CI above 1 → log; otherwise assay fallback | Standard regression inference |
| Mean-Variance z-test with Cochran's Q | z = (β̂ − β₀)/SE(β̂); block-robust SE when Q significant | Cochran (1954) |
| Benford's MAD ≥ 0.015 ("Nonconformity") | Published forensic threshold for first-digit analysis | Nigrini (2012) Table 7.1 p.160 |
| Benford 2nd digit MAD ≥ 0.008 | Published forensic threshold for second-digit analysis | Nigrini (2012) |
| Mahalanobis D² ~ χ²(p) | Individual row outliers at per-row BH-FDR threshold (α = 0.001); test-level binomial | Mahalanobis (1936); Penny (1996) |
| IRC excess ≥ 0.01 (small N), ≥ 0.05 (N ≥ 500) | Minimum forensically meaningful departure from LOO winsorized Pearson prediction | Fisher z scale; Wilcox (2012) |
| Within-Row Variance binomial test | One-tailed count of "too smooth" outliers (z < −4.0) vs P(z < −4.0) = 3.17×10⁻⁵ | Binomial test; N(0,1) tail probability |
| Entropy bootstrap null | B=999 synthetic columns from moment-matched parametric model (Normal/Poisson/NB); two-sided; BH-FDR across columns | Shannon (1948); Benjamini & Hochberg (1995) |
| Entropy bootstrap null | B=999 synthetic columns from moment-matched parametric model (Normal/Poisson/NB); two-sided; BH-FDR across columns | Shannon (1948); Benjamini & Hochberg (1995) |
| Column GoF refit bootstrap | B=999 synthetic columns from moment-matched parametric family; parameters refit on each bootstrap sample to recover correct null quantiles; classical AD² statistic; two-sided; BH-FDR across columns | Anderson & Darling (1952); Stephens (1974) |
| Hartigan dip test, uniform reference | B=999 synthetic columns from Uniform(min, max); dip statistic D_N; one-sided (upper); BH-FDR across columns | Hartigan & Hartigan (1985) |

#### Tier 2 — Calibrated forensic thresholds

These thresholds answer "is this effect large enough to indicate fabrication rather than biology?" There is no formal null hypothesis for this question — it is inherently a forensic judgment. The thresholds are calibrated against the validation suite (14 datasets: 6 clean, 5 fabricated, 2 known-fabricated real-world, 1 known-clean real-world) and documented with the observed range in clean vs fabricated data. They activate only at N ≥ 500, where p-values detect trivially small deviations from idealized nulls.

The same dual-gating principle (statistical significance AND minimum effect size) is standard practice in genomics — DESeq2's `lfcThreshold` parameter (Love, Huber & Anders 2014) and volcano plot filtering serve the same function.

| Threshold | Gate value | Clean range | Fabricated range | Rationale |
|-----------|-----------|-------------|-----------------|-----------|
| Selective Noise: variance ratio ≥ 3.0 | N ≥ 500 | 1.2–2.0 | 3.5–12.9 | Separates instrument variation from selective noise allocation |
| Autocorrelation: \|mean r₁\| ≥ 0.25 | N ≥ 500 | 0.01–0.15 | 0.44–0.81 | Separates genomic co-regulation from fabrication-induced serial dependence |
| Kurtosis: \|κDev\| ≥ 0.20 + leptokurtic suppression | N ≥ 500 | 0.01–0.09 | 0.38–0.39 | Small deviations suppressed; leptokurtic (κDev > 0) suppressed — biological count data is inherently heavy-tailed; only platykurtic ("too uniform") is a fabrication signal at scale |
| Runs Test: observed/expected ≤ 0.70 | N ≥ 500 | 0.83–1.00 | 0.21–0.86 | Separates mild biological ordering from fabrication-induced run deficit |
| Constant-Offset: block rate ≥ 1.0% | N ≥ 500 | 0.0–0.8% | 1.2–5.6% | Separates genomic co-regulation excess from fabrication blocks |
| IRC: excess r ≥ 0.05 (large N) | n ≥ 500/pair | 0.00–0.03 | 0.08–0.56 | Separates marginal LOO departures at scale from genuine column dependence. Uses winsorized Pearson r (5%) to prevent QC outlier leverage (fix 244) |
| Mahalanobis: exceedance fraction ≥ 2× expected | N ≥ 500 | 0.0–1.5% | 2.5–7.3% | Separates random outliers from systematic fabrication |
| LOESS: variance ratio ≥ 2.0 | N ≥ 500 | 1.1–1.5 | 6.3–68.8 | Separates mild noise variation from fabrication-induced smoothing |
| Regional Noise: variance ratio ≥ 2.0 | N ≥ 500 | 1.5–5.2 | 9.8–398.4 | Separates normal column variability from localised fabrication |
| Entropy: ratio deviation ≥ 15% from 1.0 | All N | 0.88–0.99 (DS07, DS12a, DS12b) | TBD | Marginal model mismatch: Normal approximation produces systematically different entropy on skewed/heavy-tailed continuous data. Gate calibrated on validation suite datasets where clean data produced ratios 0.88–0.99 with marginal p-values. |
| Column GoF: AD ratio ≥ 2.0 (shape mismatch) or ≤ 0.5 (too-tight fit) | N ≥ 30/col | 0.72–2.14 (admissible clean cols, S107) | 5.01 (DS19 col1, N=1200, pre-S179); ~55× (DS10 Vehicle cols 1–5, per-condition; pre-S179 pooled 105.6 on col5) | Two-sided gate: shape-mismatch direction catches hand-typed / truncated / copy-from-different-shape; too-tight direction catches RNG padding. AD is scale-normalised to the fitted family, so a 2× ratio is a substantive deviation. S107 calibration retained the 2.0 gate; no clean admissible column exceeded 2.27. |
| Modality: dip magnitude ≥ 0.04 | N ≥ 50/col | 0.0047–0.0447 (full batch, S107; max 0.0447 on DS17 at adj-p 1.00) | none (zero positive batch signal) | Threshold corresponds to a bimodal mixture with equal weights and ≈1 SD separation — the weakest pattern of forensic interest. Below 0.04 is within the range of mildly asymmetric unimodals per Hartigan (1985) empirical tables. S107 calibration: no clean fixture exceeded LOW at the retained 0.04 gate; uniform-reference null is conservative as spec predicted. |

**Limitation:** These gates were calibrated on a limited validation suite. Real-world datasets may have effect sizes in the gap between clean and fabricated ranges. The gates err on the side of suppressing flags (reducing false positives at the cost of reduced sensitivity at large N). Users analysing large datasets where a test shows LOW but the diagnostic values are near the gate boundary should inspect the per-group details.

#### Tier 3 — Pragmatic rules

These are operational decisions that enable the tool to function. They are not statistically derived and do not claim to be. They are documented so that users can override them with contextual judgment.

| Rule | Value | Rationale |
|------|-------|-----------|
| Overall severity: CRITICAL | ≥ 3 HIGHs | Convergence across many tests indicates systemic issues |
| Overall severity: SERIOUS | ≥ 2 HIGHs, or 1 HIGH + cross-dimension, or 2+ MODs cross-dimension | Cross-dimension convergence; joint probability argument |
| Overall severity: ELEVATED | 1 HIGH (single dimension) | Single strong signal, insufficient convergence |
| Integer detection | > 95% of values are integer | Threshold for count-data routing; could reasonably be 90% or 99% |
| Minimum data: most tests | ≥ 10 rows, ≥ 2 columns | Below this, test statistics are unreliable |
| Minimum data: Kurtosis | ≥ 20 rows | Kurtosis SE = √(24/n); at n=10, SE ≈ 1.55 — too large to detect κ < 1 |
| Minimum data: Benford's | ≥ 100 values, ≥ 1.5 orders of magnitude | Benford's Law requires multi-order data; small samples have high MAD variance |
| Minimum data: Kurtosis | ≥ 20 rows | Kurtosis SE = √(24/n); at n=10, SE ≈ 1.55 — too large to detect κ < 1 |
| Minimum data: Benford's | ≥ 100 values, ≥ 1.5 orders of magnitude | Benford's Law requires multi-order data; small samples have high MAD variance |
| Minimum data: Column GoF | ≥ 30 obs/col, ≥ 10 distinct values, \|γ₁\| ≤ 1.5, γ₂ ≥ −1.2 universal + γ₂ ≥ −0.8 at N ≥ 100 | AD power floor; cardinality floor for continuous AD validity; moment bounds restrict to v1.0 family set (Normal / Poisson / NB); N-adaptive γ₂ clause admits small-N near-uniform columns where sample kurtosis is noisy |
| Minimum data: Modality | ≥ 50 obs/col, ≥ 15 distinct values, γ₂ ≥ −1.2 universal + γ₂ ≥ −0.8 at N ≥ 100 | Hartigan dip is low-power below N ≈ 50; sparse discrete support makes dip ill-defined; N-adaptive γ₂ guard prevents meaningless adj-p on near-uniform columns (|γ₁| gate deliberately omitted — uniform-reference null is family-agnostic) |
| Minimum data: LOESS | ≥ 30 rows | Needs sufficient data for smoother + windowed scan |
| Minimum data: Within-Row Variance | ≥ 40 rows, ≥ 3 columns, continuous/count | Binned regression requires sufficient rows; MAD floor stability |
| Minimum data: Mahalanobis | ≥ 3 columns, ≥ 3×nC rows | Covariance matrix invertibility and estimate stability |
| Minimum data: Entropy | ≥ 20 obs per column, continuous or count | Bootstrap entropy variance too high at smaller N |
| Minimum data: VFS | >80% integer, ≥ 20 distinct values, ≥ 100 obs, span ≤ 10K | Local smoothing requires sufficient neighbourhood density |
| N ≥ 500 activation for effect-size gates | 500 | Approximate threshold where trivial effects reach significance; not formally derived |
| Convergence escalation: 2+ MOD cross-dimension → SERIOUS | 2 dimensions | Joint probability ≈ 1/10,000 under independence; independence is approximate |
| VST assay-type fallback | Per-assay mapping | Used only when slope CI is inconclusive; based on known noise characteristics per assay |
| Cross-Condition Rank: cap at MODERATE | — | High ρ can always reflect biology; corroborating evidence only |
| VFS: ratio ≥ 2.0 for spike identification | — | Minimum exceedance over local expectation to qualify as spike |
| VFS: single-spike MODERATE requires ratio ≥ 5.0 + p < 0.001 | — | Natural modes are broad; extreme point spikes are not natural processes |
| LOESS CUSUM secondary changepoint | Per-segment permutation p < 0.01 | Binary segmentation (v0.8); within-segment permutation null has known power limitation for heterogeneous segments (see §2.7) |

**Cross-dimension convergence.** "Cross-dimension" in the rules above refers to the five fabrication dimensions enumerated in METHODOLOGY-MAP.md (Value Repetition, Digit Representation, Replicate Agreement, Cross-Group Similarity, Distributional Shape). Two channels count as cross-dimension convergent if and only if they belong to different dimensions — no sub-group, scope, or primary/collateral distinction. The rule is a starting point for investigator triage, pointing to datasets where multiple independent fabrication mechanisms have fired; it is not a formal statistical aggregator (see the qualifier immediately below).

**The overall severity rating is a triage label, not a statistical conclusion.** Individual test p-values are principled (Tier 1). The mapping from flag counts to severity labels is a pragmatic screening heuristic designed to prioritise investigation effort. It is not a formal test and should not be cited as one.

Thresholds are documented explicitly (not hidden) so that investigators can apply their own judgement about borderline cases.

---

## References

- Al-Marzouki, S., Evans, S., Marshall, T. & Roberts, I. (2005). Are these data real? Statistical methods for the detection of data fabrication in clinical trials. *BMJ*, 331, 267–270.
- Anderson, T.W. & Darling, D.A. (1952). Asymptotic theory of certain "goodness of fit" criteria based on stochastic processes. *Annals of Mathematical Statistics*, 23(2), 193–212.
- Anscombe, F.J. (1948). The transformation of Poisson variables. *Biometrika*, 35(3/4), 246–254.
- Benjamini, Y. & Hochberg, Y. (1995). Controlling the false discovery rate: A practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B*, 57(1), 289–300.
- Bik, E.M., Casadevall, A. & Fang, F.C. (2016). The prevalence of inappropriate image duplication in biomedical research publications. *mBio*, 7(3), e00809-16.
- Box, G.E.P. & Cox, D.R. (1964). An analysis of transformations. *Journal of the Royal Statistical Society: Series B*, 26(2), 211–252.
- Brown, N.J.L. & Heathers, J.A.J. (2017). The GRIM test: A simple technique detects numerous anomalies in the reporting of results in psychology. *Social Psychological and Personality Science*, 8(4), 363–369.
- Carlisle, J.B. (2017). Data fabrication and other reasons for non-random sampling in 5087 randomised, controlled trials in anaesthetic and general medical journals. *Anaesthesia*, 72(8), 944–952.
- Cleveland, W.S. & Devlin, S.J. (1988). Locally weighted regression: An approach to regression analysis by local fitting. *Journal of the American Statistical Association*, 83(403), 596–610.
- Cochran, W.G. (1954). The combination of estimates from different experiments. *Biometrics*, 10(1), 101–129.
- DeCarlo, L.T. (1997). On the meaning and use of kurtosis. *Psychological Methods*, 2(3), 292–307.
- Diekmann, A. (2007). Not the first digit! Using Benford's Law to detect fraudulent scientific data. *Journal of Applied Statistics*, 34(3), 321–329.
- Druicǎ, E., Oancea, B. & Vâlsan, C. (2018). Benford's Law and the limits of digit analysis. *International Journal of Accounting Information Systems*, 31, 75–82.
- Efron, B. (2007). Size, power and false discovery rates. *Annals of Statistics*, 35(4), 1351–1377.
- Filzmoser, P., Garrett, R.G. & Reimann, C. (2005). Multivariate outlier detection in exploration geochemistry. *Computers & Geosciences*, 31(5), 579–587.
- Flajolet, P. & Sedgewick, R. (2009). *Analytic Combinatorics*. Cambridge University Press.
- Heathers, J.A.J. & Brown, N.J.L. (2019). SPRITE: A response to Lakens. https://osf.io/pwjdk/
- Hill, T.P. (1995). A statistical derivation of the significant-digit law. *Statistical Science*, 10(4), 354–363.
- Killick, R. & Eckley, I.A. (2014). changepoint: An R package for changepoint analysis. *Journal of Statistical Software*, 58(3), 1–19.
- Love, M.I., Huber, W. & Anders, S. (2014). Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. *Genome Biology*, 15, 550.
- Mahalanobis, P.C. (1936). On the generalised distance in statistics. *Proceedings of the National Institute of Sciences of India*, 2, 49–55.
- Mosimann, J.E., Wiseman, C.V. & Edelman, R.E. (2002). Data fabrication: Can people generate random digits? *Accountability in Research*, 9(1), 21–32.
- Nigrini, M.J. (2012). *Benford's Law: Applications for Forensic Accounting, Auditing, and Fraud Detection.* Wiley.
- Nuijten, M.B., Hartgerink, C.H.J., van Assen, M.A.L.M., Epskamp, S. & Wicherts, J.M. (2016). The prevalence of statistical reporting errors in psychology (1985–2013). *Behavior Research Methods*, 48(4), 1205–1226.
- Page, E.S. (1954). Continuous inspection schemes. *Biometrika*, 41(1/2), 100–115.
- Penny, K.I. (1996). Appropriate critical values when testing for a single multivariate outlier by using the Mahalanobis distance. *Journal of the Royal Statistical Society: Series C*, 45(1), 73–81.
- Shannon, C.E. (1948). A mathematical theory of communication. *The Bell System Technical Journal*, 27(3), 379–423.
- Simonsohn, U. (2013). Just post it: The lesson from two cases of fabricated data detected by statistics alone. *Psychological Science*, 24(10), 1875–1888.
- Smyth, G.K. (2004). Linear models and empirical Bayes methods for assessing differential expression in microarray experiments. *Statistical Applications in Genetics and Molecular Biology*, 3(1), Art. 3.
- Wald, A. & Wolfowitz, J. (1940). On a test whether two samples are from the same population. *Annals of Mathematical Statistics*, 11(2), 147–162.
- Wilcox, R.R. (2012). *Introduction to Robust Estimation and Hypothesis Testing*. 3rd ed. Academic Press.

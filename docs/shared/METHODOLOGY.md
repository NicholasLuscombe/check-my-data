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

## Permutation-Test Arithmetic Constraints (v0.8)

Permutation tests combined with BH-FDR correction have a hard floor on achievable adjusted p-values that depends on the number of permutations `B` and the BH denominator `m` (the number of units sharing a correction). This constraint is shared by every permutation test in the battery — Constant-Offset Blocks, Regional Noise, Windowed Autocorrelation, Windowed ICC, LOESS Residual Analysis, Residual Spike Correlation, and the Cross-Condition Consistency framework.

**Two-sided permutation p-value floor.** With `B` permutations and a two-sided p-value computed as `p = min(1, 2 × min(p_upper, p_lower))`, the smallest achievable raw p is

    p_min = 2 / (B + 1)

`p_upper` and `p_lower` each have the form `(1 + k) / (B + 1)` for a count k ≥ 0; the minimum tail count of zero gives `1 / (B + 1)`; the two-sided doubling gives `2 / (B + 1)`. The `×2` factor is a calibration correction that compensates for the Type I inflation of `min(p_upper, p_lower)`: under H₀ both tail probabilities are U(0,1) and their min is Beta(1,2), so doubling restores the nominal α.

**BH-FDR floor.** After BH-FDR correction at rank 1 across `m` units, the most significant unit's adjusted p is `p_min × m / 1`. Combined with the permutation floor,

    adj-p_min = 2m / (B + 1)

No more significant adjusted p-value is achievable regardless of how strong the forensic signal is.

**Consequence for α bands.** Under the unified flag bands (`HIGH < 0.001`, `MOD < 0.01`, `LOW` otherwise), the minimum `B` needed to reach HIGH is

    B_min_for_HIGH = 2000 · m − 1

| B | m | adj-p floor | Reachable bands |
|---|---|---|---|
| 999 | 1 | 0.002 | MOD (HIGH unreachable) |
| 999 | 3 | 0.006 | MOD (HIGH unreachable) |
| 999 | 9 | 0.018 | LOW only (MOD unreachable) |
| 999 | 27 | 0.054 | LOW only |
| 499 | 3 | 0.012 | LOW only (MOD unreachable) |
| 199 | 3 | 0.030 | LOW only |

The B-scaling rule (`B = 999 / 499 / 199` at `max(N_c) ≤ 1000 / 10000 / >10000`) trades permutation precision for compute cost on large datasets, which further compresses the reachable band space at high N.

**Per-stage BH in framework tests.** Framework tests that split units into per-stage BH families (Cross-Condition Consistency, §1.9) compute `adj-p_min` per stage, with `m_stage = n_pairs × n_properties_in_stage` per BH call. A 3-property stage at `B = 999` hits m = 3 (MOD reachable) on single-pair groups and m = 9 (LOW ceiling) on 3-pair groups — each stage behaves as though it were a single-stage test, and the ceiling is determined by whichever stage carries the primary flag. The per-stage split preserves this ceiling shape as properties accumulate across stages, rather than compressing the framework to LOW-only.

**Design posture.** The bands themselves remain the correct α thresholds — HIGH is still "1 in 1000 under H₀" in a calibrated-p sense. What the ceiling says is that **permutation + BH at finite B cannot resolve significance below a floor**. A permutation test whose ceiling is MOD is not broken; it simply detects at MOD strength per group at that `B`. Raising `B` to reach HIGH is rejected for three reasons: (a) parity — all battery permutation tests share `B = 999`, and diverging one test breaks interpretability; (b) compute — the ceiling gets worse with more properties or more pairs, so raising `B` enough to reach HIGH at Stages 2/3 of a framework test would require `B > 50,000`; (c) necessity — the tool's overall severity posture already requires convergence across tests for severity 3, so single-channel HIGH was never the target.

**Consequences for severity interpretation.**

- A permutation framework test that flags MOD on a fabricated dataset where only that channel fires is **working correctly**, not under-detecting. Severity 3 on such a dataset requires convergence with another forensic channel — a different dimension, or (in the framework-test case) residual-structure properties added in later stages exercising different fabrication signals.
- Users reading test results should not treat permutation-test MOD as "fails to prove HIGH." The test reports what the permutation budget can resolve; convergence and investigator judgement carry the interpretation beyond that.
- The `adj-p_min` floor is deterministic given `B` and the test's BH denominator. Recording it per test in the engineering documentation (CLAUDE.md) would make ceiling-awareness routine rather than session-specific discovery.

**Not affected by the ceiling.** Simulation-based tests (Kurtosis + Anderson-Darling, Benford's Law) and parametric tests (lag-1 Autocorrelation, Selective Noise, Mean-Variance slope, Terminal Digit, Decimal Precision, IRC Fisher-z) use null distributions whose p-values can drop arbitrarily close to zero — no permutation counter lives between the observation and the p. These tests can and do flag HIGH as single-channel evidence.

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

## 1. Structural Anomaly Detection

### 1.1 Exact Duplicate Detection

**Source:** ORI forensic statistics methodology (unpublished); birthday-problem collision framework; Simonsohn (2013) terminal digit analysis (conceptual).

**Procedure (v0.6, S34):**

Four principled statistical tests, combined via BH-FDR on 4 p-values:

**Test 1 — Value-level collision count (exact binomial):**
1. Compute the dominant decimal precision (dp) from observed value strings.
2. Per-value collision probability `p_match`:
   - Integer (dp=0), N ≤ 5000: parametric Poisson/NB model-predicted (break HHI circularity at moderate N).
   - Integer, N > 5000: empirical HHI.
   - Continuous (dp > 0): empirical HHI.
3. Observed = Σ_v C(freq(v), 2) over all distinct values with freq ≥ 2 (total same-value pair count).
4. Exact binomial survival: `p = P(X ≥ observed | Bin(n = C(N_cells, 2), p = p_match))`.

**Test 2 — Identical row vectors (exact binomial):**
1. Hash each row (values rounded to 4 dp, null encoded distinctly). Group by hash → row-duplicate groups.
2. Count excess duplicates: nRowDups = Σ(group_size − 1) across groups with ≥2 rows.
3. Compute p_matchRow = Π(HHI_c) across all columns, where HHI_c = Σ(freq_c(v)/N)² is the per-column Herfindahl index.
4. Binomial test: p = P(X ≥ nRowDups | n = C(nRows, 2), p = p_matchRow).

**Test 3 — Within-row column-pair coincidences (exact binomial):**
1. For each row, count pairs of columns with identical values. Track within-group vs cross-group split when condition groups exist.
2. Compute expected coincidences using **row-binned frequency overlap** (fix 245). Global frequency overlap underestimates collision probability because replicates within a row share the same base value — local collision rates are much higher than global marginals predict. The procedure:
   - Sort rows by row mean, partition into bins of 30.
   - Within each bin, compute per-column-pair frequency overlap: E(pair i,j in bin) = N_valid × Σ_v (freq_i(v)/N_i × freq_j(v)/N_j).
   - Sum bin-local expectations across all bins.
3. Total pair slots `n = Σ_rows C(n_valid_cols_in_row, 2)`; mean-matched single-p estimate `p̂ = withinRowExpected / n`.
4. Exact binomial survival: `p = P(X ≥ withinRowMatchTotal | Bin(n, p̂))`. Slightly over-dispersed vs. the true Poisson-binomial (per-pair p varies by bin) — conservative direction for a false-positive-averse tool.

**Test 4 — Block copy p-value:**

Two types of block match, each with its own null:

*Row-to-row blocks* (same data at different row positions):
- p_row = Π(HHI_c) over the block's matched columns = P(two random rows match at those columns)
- p_block = p_row^h = P(h consecutive row-pairs all match)
- n_opportunities = Σ_{d=1}^{maxOffset} max(0, nR − d − h + 1) = spatial search volume. Full-row blocks use maxOffset = nR − 1 (hash-based search is exhaustive); partial-column blocks use capped maxOffset.
- p_adj = min(1, p_block × n_opportunities) (Bonferroni)

*Column-to-column blocks* (same values in different columns at the same rows):
- p_cross = Σ_v freq_A(v)/N_A × freq_B(v)/N_B = P(col A value = col B value at a random row). This is cross-column frequency overlap, not within-column HHI.
- p_block = p_cross^h = P(h consecutive same-row matches)
- n_opportunities = C(nCols, 2) × (nRows − h + 1) = column pairs × starting positions
- p_adj = min(1, p_block × n_opportunities) (Bonferroni)

Best (minimum) p across all detected blocks enters BH-FDR with the other 3 tests.

**Combined flag:** BH-FDR on [collision p, row-dup p, within-row p, block p]. min(adjusted) < 0.001 → HIGH, < 0.01 → MODERATE.

**Detection passes (3):**

*Pass 1 — Full-row hash (S34):*
Hash each row via FNV-1a. For block heights h = maxH..2, build composite sequence key from h consecutive row hashes, group starting positions by key. Verify matches with cell-level equality (hash collision guard). Reports: identical row blocks at any offset, with `allPositions` listing every occurrence. Height=1 matches deferred to row-dup groups. O(nRows × maxH).

*Pass 2 — Partial-column offset scan (S32, retained):*
For each row offset d = 1..maxOffset, sweep rows computing which columns match between row[i] and row[i+d]. Group consecutive rows with the same matching column set into blocks. Only retains partial-width blocks (h ≥ 2, w ≥ 2, area ≥ 6, not full-row). Full-row blocks already found by hash method. O(maxOffset × nRows × nCols).

*Pass 3 — Column-segment hash (S34):*
For each starting row, incrementally hash each column's values downward row by row. At each height h ≥ 3, group columns by hash — columns with matching hashes have identical values over that row range. Verify with cell-level equality; reject null-null matches (null values hash with unique per-column+row strings). Record only maximal segments (skip if match extends to the row before startRow). O(nRows × maxH × nCols).

All three passes merge results into a unified block list, sorted by area (largest first). Subset blocks dominated by a larger block are removed. Column-pair matches found by the column-segment detector suppress redundant `colDupPairs` entries.

**Known false positives:**
- Integer or discretised data with heavy concentration at specific values (mitigated by HHI null)
- Correlated columns in multi-sample data (mitigated by z-direction gate on row-dup test)
- Values at detection limits
- Column matches within replicates of the same condition are less suspicious than cross-condition matches (not yet gated — contextual note planned)

**Known limitation:** For integer data, the empirical HHI is circular when fabrication inflates frequencies. Proper fix: parametric collision null (Poisson/NB fit — not yet implemented). Column matches within constant-value row-dup groups are redundant — suppression planned.

**Row-semantics note (v1.0, S118).** Test 2 row-hash is row-order invariant by construction. Test 4 block-copy is row-position aware (h consecutive rows hashed together) but its null is marginal-frequency-based — `p_block = Π(HHI_c)^h × n_opportunities`, Bonferroni over the spatial search volume. A contiguous block-copy on arbitrary-order data (long-format pivots, gene lists) is still fabrication evidence at the calibrated p-value. DupDet does NOT route through the Row Semantics Gate.

**Minimum data:** ≥2 columns, any number of rows.

---

### 1.2 Constant-Offset Blocks

**Source:** ORI forensic statistics methodology; permutation test framework.

**Procedure (v0.4, extended v0.8):**
1. For each replicate pair, compute the difference series d_i = x_{i,c1} − x_{i,c2}, rounded to 4 decimal places.
2. Count consecutive equal-difference pairs: positions where d[k] = d[k+1].
3. **Permutation null:** Shuffle the row ordering (Fisher-Yates), recount consecutive matches across all pairs, repeat N_PERM times. P-value = (exceedCount + 1) / (N_PERM + 1).
4. **Multiplicative pass (v0.8, Item 7a):** For each pair where both columns have all values > 0, compute d_log = log(col_j) − log(col_i) and run the identical block detection algorithm (`_runBlockDetection`) on d_log. This detects col_j = col_i × k because log(x×k) = log(x) + log(k) — multiplicative offsets become additive in log-space. The pass is independent of import-stage VST.
5. **Combined result:** Take the minimum p across additive and multiplicative passes. The result includes an `offsetType` field ('additive' or 'multiplicative') indicating which pass produced the best p-value. For multiplicative detections, the offset is reported as a ratio (e.g. ×1.003) rather than an additive difference.

**VST complementarity.** For assays where VST applies log-transform at import, the additive pass on log-space data already implicitly detects multiplicative offsets. The explicit multiplicative pass provides coverage for raw-space analysis (non-log assays, or when the user overrides VST). The two mechanisms are complementary, not redundant.

N_PERM scales with dataset size: 999 for N ≤ 1000, 499 for N ≤ 10,000, 199 for N > 10,000. Pair count capped at 30 for performance (deterministic subsample).

**Why permutation, not parametric.** The birthday-problem z-test (retained for diagnostic display) assumes row independence — consecutive differences are independent draws from the empirical difference distribution. This is false for data with natural ordering (genomic loci, time series, dose-response). Adjacent rows are correlated → excess consecutive matches from autocorrelation, not fabrication. At N=39K (RNA-seq), this produced z=42 from a forensically irrelevant 0.28 percentage-point excess.

The permutation null tests whether consecutive matching is **row-order-dependent**. Fabrication produces order-dependent blocks (copy-paste-shift affects specific contiguous rows). Genomic autocorrelation also produces excess matches, but these are equally present in shuffled orderings → high permP → LOW. At N ≥ 500, an additional block rate gate (≥ 1.0%) suppresses marginal significance from mild biological ordering (see Tier 2 thresholds).

**Flag:** permP < 0.001 → HIGH, permP < 0.01 → MODERATE.

**Known false positives:** Batch-processed data with systematic corrections; very small datasets (low power, but p-value remains valid).

**Row-semantics note (v1.0, S118).** Permutation null is row-shuffle by construction; arbitrary-order baseline noise (genomic autocorrelation present equally in shuffled orderings) produces high permP → LOW. The test detects order-dependent blocks (copy-paste-shift affects specific contiguous rows) regardless of whether the row axis is semantically meaningful. **Not** dispatched through the Row Semantics Gate.

**Minimum data:** ≥2 columns, ≥4 rows.

---

### 1.3 Selective Noise Partitioning

**Source:** Al-Marzouki, S., Evans, S., Marshall, T. & Roberts, I. (2005). Are these data real? Statistical methods for the detection of data fabrication in clinical trials. *BMJ*, 331, 267–270.

**Procedure (v0.4):**
1. Compute residuals from row means for each replicate column.
2. Compute residual variance per column (minimum 5 residuals per column).
3. Apply Bartlett's test for homogeneity of k variances: χ²_B = (df_total × ln(pooledVar) − Σ(df_i × ln(var_i))) / C, where C is the Bartlett correction factor. Distributed as χ²(k−1) under H₀.

**Flag:** Bartlett p < 0.001 → HIGH, p < 0.01 → MODERATE, with effect-size gate at N ≥ 500: variance ratio must also be ≥ 3.0 (see Tier 2 thresholds). The max/min variance ratio is reported for forensic context.

**History:** v0.3 used ratio > 5/3.5 gates set by hand. v0.4 initially removed them (Bartlett accounts for sample size). But at N > 500 (e.g. RNA-seq N=30K), Bartlett detects trivially small ratios (~2×) that are normal biological variation. The ratio ≥ 3.0 gate was restored as a calibrated forensic threshold — validation suite shows clean data at 1.2–2.0, fabricated data at 3.5–12.9.

**Known false positives:**
- Genuinely different measurement precision across instruments or operators
- Library size differences in ungrouped RNA-seq data (documented in column structure advisory)
- Bartlett's test is sensitive to non-normality of residuals; mitigated by log-transform for proportional-noise assays

**Minimum data:** ≥3 columns, ≥10 rows.

---

### ~~1.4 Cross-Condition Duplication~~ — REMOVED (v0.8, S93)

**Removed in S93.** Zero detections across all 18 validation datasets and 3 real-world case studies (Ariely, Gino, Pruitt). Redundant with Duplicate Detection (§1.1), whose row-vector matching is condition-blind and catches any identical rows regardless of which condition they belong to. Cross-condition duplicates are therefore already covered by the broader DupDet row-duplicate hash pass.

---

### 1.5 Cross-Condition Rank Correlation (Spearman ρ)

**Source:** General forensic practice; Spearman rank correlation.

**Procedure (v0.4):**
1. Compute per-condition mean profiles (row means within each condition's replicates).
2. For each pair of conditions, compute Spearman ρ between their profiles.
3. With <3 condition pairs: N/A (informational only — cannot distinguish fabrication from biology).
4. With ≥3 pairs: one-sample z-test of Fisher-transformed ρ values against a biological null ρ₀ = 0.85. H₀: mean(Fisher z(ρ)) ≤ Fisher z(0.85).

**Flag:** Capped at MODERATE (p < 0.001 required). High ρ can always reflect genuine biological similarity, so this test is corroborating evidence only, never standalone.

**Known limitation:** ρ₀ = 0.85 is a heuristic, not derived from a formal null. A principled alternative (leave-one-out outlier detection requiring ≥4 pairs) is specified as v0.4 Item 9 but not yet implemented.

**Minimum data:** ≥3 condition pairs (≥4 conditions with column-grouped data, or ≥3 COND labels).

---

### ~~1.6 Fold-Change Distribution Outlier~~ — REMOVED (v0.8)

**Removed in v0.8 (Session 7).** Rationale: for column-grouped data, redundant with Mahalanobis (§4.4) which already captures inflated contrasts as multivariate outliers. For row-grouped data, the only cross-condition magnitude test, but with a Tier 2 MAD-based null — the weakest methodology in the tool. Both datasets it flagged (DS10, DS11) remain CRITICAL from other tests without it. The complementary signal (too-similar groups) is better addressed by the planned Carlisle Balance test (ROADMAP Item 7d) with a more principled null.

---

### 1.7 Cross-group Residual Spike Correlation

**Source:** Novel extension to numeric data of Bik, E.M., Casadevall, A. & Fang, F.C. (2016) image duplication methodology.

**Procedure (v0.5):**
1. Require ≥2 groups with matched row structure (≥10 shared rows).
2. For each group, compute normalised mean absolute residual per row: |e_{i,c}| = |x_{i,c} − μ_i| / σ_c, where μ_i is the row mean across replicates and σ_c is the group's global residual SD.
3. For each pair of groups, identify top-K rows by |residual| magnitude (K = max(5, floor(N×0.1))).
4. Test statistic: maximum pairwise top-K overlap across all group pairs.
5. **Permutation null (999 perms):** Shuffle row order within each group independently. Under H₀, top-K sets are independent across groups, so overlap is expected to be small.

**Flag:** permP < 0.001 → HIGH, permP < 0.01 → MODERATE.

**VST-aware (fix 120):** Runs on log/Anscombe-transformed data. After variance stabilisation, residual magnitude is scale-independent — without VST, high-abundance features naturally have large |residuals| in all conditions, creating spurious correlation.

**Design evolution:** Four iterations: (v1) Pearson on raw |residuals| → FP on DS09; (v2) Spearman → still FP; (v3) CV-based residuals → lost power; (v4) |residuals| on VST data + max-pairwise overlap → correct on all datasets. The max-pairwise approach (vs all-groups intersection) scales correctly for any group count — with a high group count, requiring top-10% in ALL simultaneously, requiring top-10% in ALL simultaneously gives P(overlap) ≈ 0.1¹¹ ≈ 0, impossibly stringent.

**Forensic value:** Detects coordinated editing — when a fabricator edits specific rows across multiple groups/conditions, the residuals at those rows become correlated even if the edits differ in magnitude.

**Known false positives:** Biological covariates that produce coordinated extreme values (e.g. outlier samples affecting all conditions). Mitigated by VST and the permutation null.

**Minimum data:** ≥2 groups, ≥10 shared rows.

---

### 1.8 Constant-Response Concentration — removed (S95)

Removed from the test battery. Zero detections across 18 validation datasets and 4 real-world case studies; scale-group fragmentation on real survey data (Gino Study 4) prevented firing when it should have. See METHODOLOGY-MAP.md §Removed tests for full rationale. The forensic target (flat-row dominant-value concentration) may be reinstated with more robust scale-group merging.

---

### 1.9 Cross-Condition Consistency Framework

**Source:** Novel. Forensic posture inspired by Carlisle (2017) — "too balanced" as a forensic tail — generalised to a registered set of distribution properties compared pairwise across conditions.

**Scope.** A single framework test in Dim IV (Cross-Group Similarity) that compares condition pairs on a registry of properties. One test card, N properties, pairwise condition comparison, BH-FDR correction across all (property × pair) units within one test call. The registry is extensible — properties declare their own per-condition statistic, pairwise distance, applicability gate, degenerate handling, and forensic-direction semantics; the framework scaffolding handles everything else.

**Framework scaffolding.**

1. **Per-condition pooled values.** For each condition slice, flatten all non-null values across replicate columns into a one-dimensional array `X_c`. Pool-level properties operate directly on `X_c`; residual-structure properties operate on per-row replicate residuals computed before pooling.

2. **Permutation null.** Under H₀ conditions are exchangeable at the row level, with the permutation unit being the full row tuple: each row carries its replicate values as a unit, and condition labels are shuffled across rows preserving per-condition row counts. `B = 999 / 499 / 199` depending on `max(N_c) ≤ 1000 / 10000 / >10000` — matches the battery's other permutation tests. Row-based and pooled-cell permutation yield identical null distributions only when each row contributes a single cell; for multi-cell tuples (multi-replicate row-grouped datasets and column-grouped groups), row-based preserves intra-row correlation in the null while pooled-cell destroys it. Row-based produces the wider, honest null.

3. **Two-sided p-value per (property × pair).** Given observed distance `d_obs` and permutation distribution `{d_perm^(b)}`:

   ```
   p_upper = (1 + #{b : d_perm^(b) ≥ d_obs}) / (B + 1)
   p_lower = (1 + #{b : d_perm^(b) ≤ d_obs}) / (B + 1)
   p       = min(1, 2 × min(p_upper, p_lower))
   ```

   Standard two-sided permutation formulation. The `×2` compensates for the Type I inflation of `min(p_upper, p_lower)`: under H₀ both tail probabilities are U(0,1), their min is Beta(1,2), and doubling restores calibrated α. See §Permutation-Test Arithmetic Constraints for the resulting ceiling on achievable adj-p.

4. **Direction tag.** After p is computed, compare `d_obs` to `median(d_perm)`. `direction = "similar"` if `d_obs ≤ median`, else `direction = "different"`. The tag is descriptive and post-hoc: it does not affect the p-value or the BH adjustment. It exists so the flag rule and the user interface can distinguish "too close" from "too far" readings of the same two-sided test.

5. **BH–FDR per stage.** Within one test call, units are partitioned by stage (Stage 1 pool-level; Stage 2 residual-structure; Stage 3 structural-invariant) and BH-FDR runs independently within each stage family. `primaryP = min` across stages' effective adjusted p-values after forensic-direction and gate filters. BH's per-stage denominator varies across datasets (non-replicate archetypes run fewer Stage 1 properties; Stage 2 is N/A for row-groupings with n_rep = 1 per condition; Stage 3 P9 requires n_rep ≥ 3 and ≥ 20 qualifying rows; low-N datasets are N/A on minN-gated properties). The per-stage split is chosen over single-family BH to preserve single-pair MOD reachability — see **Stage 2 BH denominator** below.

6. **Degenerate cascade for log-ratio properties.** When a property reduces each condition to a non-negative scalar `s_c` and takes log-ratios, the distance is undefined at small `s_c`.

   - If `max(s_a, s_b) < ε`: both conditions near-constant. Mark **degenerate**; exclude from BH denominator; report reason.
   - Else if `min(s_a, s_b) < ε`: one condition near-constant. Fall back to absolute difference `d = |s_a − s_b|`; note fallback.
   - Else: `d = |log(s_a) − log(s_b)|` as specified.

   `ε = 1e-10` for continuous-scale statistics, `0` (exact) for discrete-scale. KS and other non-log distances are always well-defined for non-empty samples — no degenerate case.

7. **Forensic directions per property.** Each property in the registry declares `forensicDirections ⊆ {"similar", "different"}`. A unit contributes to the test's primary flag, headline, and amber highlight only when its observed direction is in the property's forensic-direction set. Units in a non-forensic direction remain visible in the evidence table as "informational" rows for transparency, but are not treated as fabrication evidence. The permutation test itself is two-sided regardless — the forensic-direction filter lives one layer above BH, at the flag gate.

   The design preserves calibrated Type I rates under the two-sided null while matching the tool's forensic posture property by property. For **location and scale** properties (span, MAD, CDF) on real experimental data, "conditions differ" is the expected fingerprint of a treatment effect, not fabrication evidence — the forensic signal lives exclusively in the "too similar" tail. For **residual-structure, digit, entropy, and mean-variance-slope** properties, both tails are forensically meaningful because those quantities are preserved across conditions regardless of treatment in honest data.

8. **Flag rule.** `primaryP = min adj-p` across units that are simultaneously forensic-direction, gate-passed, and non-degenerate. Gate-failed or non-forensic-direction units are neutralised to adj-p = 1 before the min. Standard α bands apply: `primaryP < 0.001` → HIGH, `< 0.01` → MODERATE, else LOW. No sub-unit promotion rule — BH across (property × pair) already handles multi-property correction. Per §Permutation-Test Arithmetic Constraints, HIGH is unreachable for this framework at B=999 when the BH denominator m ≥ 1; the effective ceiling is MOD per group.

9. **Effect-size gates (direction-aware).** Each property declares a direction-appropriate effect-size gate keyed by the direction tag. For the `"similar"` direction the gate uses the ratio form `d_obs / median(d_perm) ≤ T` — observed distance must be substantially below chance magnitude. A single global threshold shared across similar-gated properties (`T = 0.5` at current calibration) works because the null median sets the natural scale per unit, so one ratio threshold is property-independent. For the `"different"` direction the gate uses the absolute form `d_obs ≥ d_min` with per-property thresholds that match each property's scale. Gates engage at `min(N_a, N_b) ≥ 500` per condition; below that threshold BH correction alone is sufficient and the gate disengages. Gate-failed or non-forensic-direction units are neutralised to adj-p = 1 before the primaryP min. A defensive floor fails the ratio gate when `median(d_perm) < 1e-10`, guarding the pathological case where the degenerate cascade passed but the null collapsed anyway.

10. **Known limitations.**

    - **Paired / matched designs.** The permutation null assumes condition labels are exchangeable across rows. Paired or matched designs violate this; interpretation on such datasets is suspect.
    - **Legitimate condition differences on non-forensic directions.** A treatment that genuinely shifts location or scale will produce large inter-condition distances on location/scale properties in the "different" direction. Under the forensic-direction filter these render as informational rows, not flags — by design. Convergence with other Dim IV tests (Spearman CCR, Baseline Balance) is required for interpretation.
    - **Row-matched near-duplicates across conditions** are not detected at the framework level (separate planned test per METHODOLOGY-MAP §Gap audit).
    - **Single-channel severity ceiling.** Per §Permutation-Test Arithmetic Constraints, the test cannot flag HIGH on its own. Severity 3 on inheritance-style fabrications requires convergence with other Dim IV tests or cross-dimension convergence.
    - **Residual-structure properties on non-VST'd heteroscedastic data.** When the pipeline's VST is inactive and the underlying noise is mean-dependent, row-centered residuals inherit the heteroscedasticity. P4 (and any future mean-variance-slope property) can then flag legitimate mean-dependent scale variation as a cross-condition "different" signal. The residual computation is VST-aware by inheritance, so this is controlled whenever VST is active. Where VST is bypassed by design, Stage-2 different-direction flags on P4 should be interpreted with corroboration from Dim III noise-scaling tests before treating as fabrication evidence.
    - **Row-semantics invariance (v1.0, S118).** P5's residual lag-1 AC is computed at replicate positions and averaged via Fisher-z; the permutation null shuffles condition labels across rows preserving row tuples, so calibration is invariant to row order within each condition. P5 continues to run under `rowSemantics === 'arbitrary'` and is NOT dispatched through the Row Semantics Gate.

**Current properties.**

The registry is organised into staged rollouts. Stage 1 (P1–P3) covers pool-level properties and is live. Stage 2 (P4–P6) covers residual-structure properties and is the subject of this specification.

### Stage 1 — Pool-level properties

Three properties operating directly on per-condition pooled values `X_c` — location, scale, and CDF-shape statistics in aggregate form. All three share `forensicDirections = {"similar"}` and a similar-direction ratio-form gate at `T = 0.5`. Minimum N per condition: 30.

**P1 — Trimmed span (5–95%).** Per-condition statistic is the 5–95% interquantile range `Q_0.95(X_c) − Q_0.05(X_c)`, linearly interpolated between order statistics. Pairwise distance is log-ratio `|log(s_a) − log(s_b)|` under the degenerate cascade. Log-ratio is scale-invariant: two conditions with spans (100, 110) are forensically as similar as (10, 11), regardless of absolute magnitude. `forensicDirections = {"similar"}`. Similar-direction gate: ratio form at `T = 0.5`. Minimum N per condition: 30. VST-aware — when the pipeline's VST is active, spans are computed on transformed values.

**P2 — Dispersion (MAD).** Per-condition statistic is unscaled MAD: `median(|X_c − median(X_c)|)`. Pairwise distance is log-ratio with the same cascade as P1. MAD is preferred over SD for robustness: a single outlier can inflate SD dramatically, whereas MAD is stable against moderate tail contamination. `forensicDirections = {"similar"}`. Similar-direction gate: ratio form at `T = 0.5`. Minimum N per condition: 30. VST-aware.

**P3 — CDF shape (Kolmogorov–Smirnov).** Per-condition statistic is the empirical CDF (not reduced to a scalar). Pairwise distance is the standard two-sample KS statistic `D = sup_x |F_a(x) − F_b(x)|`, bounded in [0, 1] — no log-ratio transform. KS folds location, scale, and shape into a single supremum difference, making it sensitive to any distributional shift. `forensicDirections = {"similar"}`. Similar-direction gate: ratio form at `T = 0.5`. Minimum N per condition: 30. VST-aware. No degenerate case (KS is well-defined for any non-empty pair; `D = 0` is a valid observation of identical value sets, not degeneracy).

**Why pool-level properties are one-sided.** P1, P2, and P3 all fold location and scale into their per-condition statistic. On real experimental data, location and scale differ between conditions by construction — that is what a treatment does. Flagging large inter-condition distances on these properties would mark legitimate biology as forensic evidence. Calibration against a clean densitometry dataset concretely surfaced this: nine out of nine (property × pair) units landed in the "different" direction at adj-p ≈ 2.6e-3 on B=999 permutations, driven by genuine Control-vs-Inhibitor dispersion differences. Those rows are legitimate biology, not fabrication. The `forensicDirections = {"similar"}` filter routes them to the evidence table's informational section and keeps the flag at LOW.

### Stage 2 — Residual-structure properties

Three properties operating on row-centered replicate residuals — noise magnitude (P4), serial structure (P5), and distributional shape (P6). Where Stage 1 properties measure pooled values (which legitimately differ across conditions under treatment), Stage 2 properties measure the measurement pipeline's noise after biological mean is absorbed by row-centering. Replicate noise structure is an assay property, not a condition property — in honest data it is preserved across conditions regardless of treatment. `forensicDirections = {"similar", "different"}` on all three: "similar" catches copy-paste fabrication that propagates residual structure verbatim; "different" catches post-hoc re-noising or fabrication confined to a subset of conditions. Both tails carry forensic signal because neither reflects legitimate biology.

**Shared residual computation.** For each row `i` and each condition `c`, compute the row-centered residual at each replicate position `rep`:
r_{i,c,rep} = x_{i,c,rep} − mean_{rep'}( x_{i,c,rep'} )

where the mean is taken across the replicate positions belonging to condition `c` at row `i` (replicate columns in row-grouped datasets; condition-assigned columns in column-grouped datasets). Residuals are zero-mean per row per condition by construction, giving `(n_rep − 1)` effective degrees of freedom per row. Pool residuals across rows to produce the per-condition residual array `R_c`. VST applied before residualisation when active. Requires `n_rep ≥ 2` per condition; otherwise Stage 2 properties are N/A for that condition.

**Minimum N per condition — derivation principle.** P4 and P6 use fixed absolute different-direction gates (semantically anchored to biologically plausible post-VST noise variation for P4 and one distributional-family shape drift for P6; empirical validation outstanding, tracked separately). Their per-condition minimum N is set by the rule *per-condition SE of the property statistic ≤ ½ × fixed different-direction gate*, so at min-N the gate sits at ≈ 1.4 × combined cross-condition SE. P5 does not use a fixed absolute different-direction gate; it uses a per-pair structural SE floor derived from the statistic's own H₀ sampling distribution (see P5 paragraph). Its min-N=50 is retained as statistical convention for stable lag-1 r estimation, not as a binding of the SE rule against an absolute gate.

- **P4** inherits the pool-scale floor of N ≥ 30 from Stage 1. The SE rule is satisfied trivially at that N (`SE(log s) ≈ 0.09` at `n_rep = 3`; gate `0.5` is ≈ 3.8 × combined SE), so the binding floor is statistical convention for pooled-scale statistics, not the SE rule.
- **P5** at N ≥ 50, from `SE(z) = 1/√(n − 3) ≤ 0.15  ⟹  n ≥ 47`, rounded up. Statistical convention for lag-1 r estimation; does not bind an absolute gate since P5's different-direction gate is structural (per-pair SE).
- **P6** at N ≥ 100, from `SE(κ̂) = √(24/n) ≤ 0.5  ⟹  n ≥ 96`, rounded up.

If a P4 or P6 fixed different-direction gate is ever recalibrated, the corresponding min-N recalculates from the same rule rather than being independently retuned. Stage 1 properties are not subject to this rule — their similar-direction-only ratio-form gate is self-normalising against the per-unit null scale.

**P4 — Residual dispersion (SD, row-centered).** Per-condition statistic is the unbiased residual SD:
s_c = √( Σ r² / (N_row × (n_rep − 1)) )

summed over all row-centered residuals in condition `c`. Distance is log-ratio `|log(s_a) − log(s_b)|` under the shared degenerate cascade (§1.9 ¶6). Why separate from P2: P2's MAD measures pooled value dispersion, conflating biological spread and replicate noise; P4 measures replicate noise alone after biological mean is absorbed by row-centering. A treatment changing condition spread produces large P2 distance with "different" direction but leaves P4 untouched; a fabricator copy-pasting noise templates across conditions produces small P4 distance with strongly "similar" direction. Similar-direction gate: ratio form at `T = 0.5`. Different-direction gate: `|log(s_a) − log(s_b)| ≥ 0.5` (≈ 1.65× ratio; ≈ 3.8 × combined cross-condition SE at min-N, anchored against biologically plausible cross-condition noise variation which rarely exceeds ±20–30% post-VST). `forensicDirections = {"similar", "different"}`. Minimum N per condition: 30 (see derivation principle above). VST-aware.

**P5 — Residual lag-1 autocorrelation.** Per-condition statistic is the Fisher-z averaged lag-1 Pearson correlation across replicate positions:

r̄_c = tanh( (1/K_c) × Σ_rep atanh( r_lag1( R_c[:, rep] ) ) )

where `R_c[:, rep]` is the row-ordered sequence of centered residuals at replicate position `rep` and `K_c` is the count of non-degenerate replicates. Pairwise distance is the Fisher-z gap `|Δz| = |atanh(r̄_a) − atanh(r̄_b)|`. No log-ratio (correlation is bounded in [−1, 1] and can be negative or zero). Relation to §2.1: §2.1 tests whether pooled lag-1 differs from zero globally; P5 tests whether lag-1 structure is consistent across conditions. A fabricator introducing serial structure to one condition only is invisible to §2.1 pooled but surfaces under P5. Similar-direction gate: ratio form at `T = 0.5` (unchanged). Different-direction gate: `adj-p ≤ α_tier AND |Δz| ≥ √2 / √(n_rep_min × (N_row_min − 3))` where `n_rep_min = min(K_a, K_b)` is the count of non-degenerate contributing replicates and `N_row_min = min(N_row_a, N_row_b)` is the min per-replicate complete-row count. The floor is the H₀ SE of |Δz| itself under Fisher-z-with-replicate-averaging theory: `SE(z_rep) ≈ 1/√(N_row − 3)` (Fisher approx), `SE(z̄_c) ≈ 1/√(n_rep × (N_row − 3))` under replicate-averaging, and `SE(|Δz|) ≈ √2 / √(n_rep_min × (N_row_min − 3))` for the cross-condition gap under H₀ of equal AC structure. Interpretation: a different-direction claim is resolvable only when the observed gap exceeds one SE of itself under H₀ — the weakest meaningful claim that the effect is above estimator noise. Coefficient = 1, not calibrated; no fixture anchor; no empirical tuning. The floor scales correctly with N — large `N_row × n_rep` → small floor (trivial-effect protection at big datasets), small `N_row × n_rep` → larger floor (the statistic honestly cannot resolve small effects at low N). Worked values: at `(n_rep=3, N_row=50)` floor=0.119; `(n_rep=3, N_row=200)` floor=0.058; `(n_rep=7, N_row=200)` floor=0.038; `(n_rep=3, N_row=10000)` floor=0.008. Retired derivation note: the prior `|Δz| ≥ 0.3` fixed floor was 1.4× Gaussian combined-SE evaluated at worst-case min-N=50 — same conceptual family, but both over-anchored to worst-case N and over-stated the true null. Fisher-z compression plus residual-centering make the empirical null ~4× tighter than Gaussian predicts (S113 Phase 1 Target C, 22-fixture validation suite), so the 0.3 floor sat past the empirical 99.9th percentile and blocked P5's designed forensic target — DS21 v2 one-condition AR(1) ρ=0.92 injection, |Δz|=0.141, adj-p=0.012 — at the test's designed sensitivity range. Phase 2 iteration history: fixed empirical floors at 0.20 (2× 95th) and smaller candidates were considered but rejected — any fixed value within the window (clean_max, designed_target] bounded by Target C evidence is a judgment call, not a derivation; the structural SE floor derives uniquely from the statistic's sampling distribution. Forensic interpretation: at the structural floor, observed |Δz| equals its own H₀ sampling noise — the minimum claim that the statistic has resolved anything at all. Tiers above LOW (MOD/HIGH) come from adj-p under the standard permutation + BH-FDR tier ladder; at B=999 the arithmetic ceiling documented in §Permutation-Test Arithmetic Constraints applies to P5 as to other permutation-gated tests. Replicate-level degenerate when a replicate's residual column has zero variance; excluded from the Fisher-z average. Condition-level degenerate when all replicates degenerate. `forensicDirections = {"similar", "different"}`. Minimum N per condition: 50 (statistical convention for lag-1 r estimation; see derivation principle above). VST-aware.

**P6 — Residual excess kurtosis.** Per-condition statistic is excess kurtosis of the pooled row-centered residuals:
κ_c = (1/n) × Σ (r / σ_c)⁴ − 3,   σ_c = √(mean(r²)) over R_c

(residuals zero-mean by construction; no centring term). Distance is `|κ_a − κ_b|`. No log-ratio (excess kurtosis spans negative and positive values). Relation to §2.2 (Kurtosis + Anderson–Darling): §2.2 tests inter-replicate-difference shape against a theoretical null globally; P6 tests residual shape consistency across conditions. Complementary rather than redundant. Similar-direction gate: ratio form at `T = 0.5`. Different-direction gate: `|Δκ| ≥ 1.0` (≈ 1.4 × combined cross-condition SE at min-N; interpretable as roughly one "distributional family" of shape change — Gaussian-to-Laplace-region is about three units, so one unit is a substantial but not extreme shape drift). Degenerate when `σ_c < 1e-10`. `forensicDirections = {"similar", "different"}`. Minimum N per condition: 100 (see derivation principle above). VST-aware.

**Stage 2 BH denominator — per-stage families (S102).** Stage 2 adds three properties to the framework. Under single-family BH the group-level denominator `m` grows from ≤ 3 (Stage 1 only) to ≤ 6 (both stages), raising the adj-p floor at `B = 999` from 0.006 (MOD reachable) to 0.012 (LOW only) — see §Permutation-Test Arithmetic Constraints. Calibration against the 19-fixture batch tripped the DS15 MOD-preservation stop condition under single-family BH (DS15 Stage 1 signal diluted from adj-p 0.009 at m = 3 to 0.018 at m = 6). Raising `B` to 1999 was ruled out on arithmetic grounds: DS15's raw p ≈ 0.003 sits above the `B = 1999` permutation floor (0.001), so adj-p at m = 6 remains 0.018 regardless of `B`. Per-stage BH — separate BH-FDR calls for Stage 1 and Stage 2, `primaryP = min` across stages — preserves each stage at m ≤ 3 per pair, holds DS15 at MOD, and adds no clean-dataset false positives (lowest clean Stage 2 forensic adj-p = 0.036, DS01 P6). Semantic backing: Stage 1 is one-sided pool-level, Stage 2 is two-sided residual-structure on a different transform of the data, which is mild independence backing for separate families. Cost: loss of cross-stage multiplicity control, accepted. The spec's original sufficiency criterion for single-family BH — "most fixtures naturally sit at m ≤ 4" — did not hold empirically (10 of 13 applicable fixtures at m ≥ 5, 5 at m = 18). Stage 3 additions (P7/P8/P9 or subset) ship in their own third BH family by the same per-stage principle — at `B = 999`, folding Stage 3 into Stage 2 would push single-pair groups from MOD-reachable (m = 3, adj-p_min 0.006) to LOW-only (m = 6, adj-p_min 0.012), reprising the Option A failure mode; own-family preserves the ceiling and extends the architectural pattern. See SESSION102-SUMMARY §3 for the full A/B/C walkthrough and per-dataset evidence; SESSION103-SUMMARY §2.4 for the Stage 3 arithmetic.

### Stage 3 — Structural-invariant properties

Three properties operating on pool-level statistics that are preserved across conditions independent of the biological effect — mean-variance slope (P9), first-digit distribution (P7), and Shannon entropy (P8). Where Stage 1 properties measure location/scale/distribution-shape of pooled values (which legitimately differ across conditions under treatment), and Stage 2 properties measure replicate noise structure, Stage 3 properties measure structural invariants of the data-generating process: the mean-variance slope reflects the assay's noise model, the digit distribution is a signature of the measurement scale and units, and entropy reflects the precision and value-frequency structure of the instrument output. Within a dataset, all conditions share the assay and measurement pipeline, so these quantities should be preserved across conditions in honest data. Fabrication that synthesises one condition with a different noise model, precision grid, or digit preference shifts the relevant Stage 3 statistic. `forensicDirections = {"similar", "different"}` on all three: "similar" catches copy-paste fabrication that propagates structural invariants verbatim; "different" catches structural mismatch between conditions. Neither tail reflects legitimate biology.

**Scope at v1.0.** Stage 3 ships P9 for v1.0. P7 and P8 are specified here for completeness but deferred pending calibration — see **Deferred properties** below.

**Framework extension — per-property applicability.** Stage 3 introduces per-property applicability semantics: each property declares an `applicable(construct, condition) → bool` predicate that the framework driver evaluates before dispatching the per-condition statistic, rather than consuming a shared framework-level cell-count gate. P9 uses `N_rows(n_rep ≥ 3) ≥ 50 AND row-mean span ≥ 1 OOM`; the deferred P7 and P8 will use the digit-span and entropy-N floors documented below. Stages 1 and 2 continue to use the shared pooled-cell gate and do not require per-property callbacks.

**P9 — Mean-variance slope.** Per-condition statistic is the log-log OLS slope of row variance against row mean, computed over rows contributing non-degenerate within-condition mean/variance:

β_c = OLS_slope( { (log mean_i, log Var_i) : row i ∈ condition c, with n_rep(i, c) ≥ 3 valid cells } )

where row mean and variance are computed within-row across the replicate positions belonging to condition c. The `n_rep ≥ 3` floor per contributing row (versus Stage 2's `n_rep ≥ 2`) is required because P9 extracts per-row variance as a scalar for the OLS regression — 2 df per row is the minimum for a defensible per-row variance estimate, whereas Stage 2 pools residuals across rows and absorbs per-row noise in the pool. This is the per-condition analogue of the dataset-level Mean-Variance Relationship test (§4.1). In honest data, β is an assay property — qPCR ≈ 0 (additive), plate reader ≈ 1 (Poisson), densitometry ≈ 2 (proportional), RNA-seq ≈ 2 (NB) — and is preserved across conditions because all conditions share the assay. Fabrication that generates one condition from a mismatched noise model (e.g., Gaussian-padded additions in a Poisson-structured dataset) shifts that condition's β detectably, even when the dataset-level slope from §4.1 still matches expectation.

Pairwise distance: `|β_a − β_b|`. No log-ratio transform (slope can be negative or zero; additive-noise assays target β ≈ 0). No dependence on §4.1's block-robust SE, which is required only for single-dataset inference against a point expected slope; the permutation null supplies the reference distribution for cross-condition `|Δβ|` directly.

Relation to §4.1: §4.1 tests whether the global slope matches the expected assay value; P9 tests whether the slope is consistent across conditions regardless of the expected value. A fabricator who gets the global β right but synthesises one condition with a different noise structure evades §4.1 and surfaces under P9.

Similar-direction gate: ratio form at `T = 0.5`. Different-direction gate: `|Δβ| ≥ 0.5` (half an assay-type worth of slope difference — qPCR-to-plate-reader is 1.0 units, plate-reader-to-densitometry is 1.0 units, so 0.5 is a substantial but not extreme mismatch). `forensicDirections = {"similar", "different"}`.

Applicability: N/A when fewer than 50 rows per condition have `n_rep ≥ 3` valid cells, or when the row means within a condition span less than 1 order of magnitude (same dynamic-range floor as §4.1). Rows with `mean_i ≤ 0` or `Var_i ≤ 0` are excluded from the OLS fit at the row level (log undefined / non-positive); the applicability floor applies to the count of rows remaining after this exclusion. Degenerate when the within-condition OLS fit is singular (all contributing rows share the same mean) or when fewer than two distinct mean bins exist; excluded from BH.

**Not VST-aware — P9 operates on pre-VST values.** This is deliberate and property-specific: VST is designed to flatten the mean-variance slope, so running P9 post-VST would return β ≈ 0 for every condition by construction and obscure the forensic signal. The framework driver must route P9 the original (pre-VST) matrix regardless of VST state — a registry flag (`useOriginalValues: true` or equivalent) or property-level override at the driver's matrix dispatch. Analogous to digit-level tests per §Data Types routing.

**Minimum N per condition — derivation for P9.** P9's N unit is rows with multi-replicate data within the condition, not cells or residuals. Under OLS on log-log pairs with row means approximately uniform over the applicability floor's 1-OOM span, `SE(β̂) ≈ σ_residual × √(12 / N_rows)` (equivalently `σ_residual / (σ_logMean × √(N_rows − 2))` with `σ_logMean ≈ 0.29` for uniform 1-OOM spacing). For honest log-log linearity with typical residual scatter `σ_residual ≈ 0.5` (single-row log-variance deviation from the fit), `SE(β̂) ≤ 0.25` requires `N_rows ≥ 48`, rounded to 50. At this minimum, the different-direction gate at `|Δβ| ≥ 0.5` sits at ≈ 1.47 × combined cross-condition SE — matching Stage 2's calibration rule. Applicability is a property of the rows-with-multi-replicates count, not the pooled cell count — a group with 100 cells distributed across 10 rows fails P9 (N_rows = 10) even if it would pass Stage 1 (N_cells = 100).

Column-grouped layouts where each DATA column is its own condition (e.g., DS19 inheritance) have `n_rep = 1` per condition per row, so no within-condition variance can be computed. P9 is N/A on such groups — the same applicability failure as Stage 2, for the same reason.

**Empirical coverage on the 19-fixture validation batch (S104 calibration).** P9 is applicable on 6 of 13 groups with multi-replicate row structure. The two highest-value Stage 3 contributions — DS12b uniform-mixture fabrication (new forensic signal at adj-p 0.024) and DS15 missing-Carlisle fabrication (MOD corroboration at adj-p 0.034) — are both applicable. The 7 N/A groups split 4 × `N_rows < 50` (densitometry at N=47; DS01–04), 2 × `row-mean span < 1 OOM` (narrow-range densitometry; DS16/17), and 1 × `n_rep = 1 per condition per row` structural (DS19). Relaxation to `N_rows ≥ 20 + |Δβ| ≥ 0.75` was considered (Edit 6 candidate) but rejected at S105: (a) the relaxed gate sits at ≈ 1.37 × combined cross-condition SE, below the 1.47× calibration anchor used at N=50; (b) the four groups brought into applicability are redundant with existing severity channels (DS02/DS04 already at severity 3 via Dim I/II/III; DS01/DS03 at severity 0 with no expected Stage 3 forensic signal); and (c) the relaxation opens the clean-dataset applicable set at N ≥ 20 (DS01, DS03) and requires a full recalibration pass to re-verify stop conditions. Coverage accepted as-is for v1.0. A span-aware adaptive floor scaling `N_floor` inversely with observed `σ_logMean` is a candidate v1.1 revisit if new fixtures materially shift the picture.

**Deferred properties — P7 and P8.**

**P7 — First-digit distribution** (deferred to v1.1+). Per-condition statistic is the 9-bin first-digit empirical frequency vector `p_c[d] = #{ x ∈ X_c : leadingDigit(|x|) = d, x ≠ 0 } / |X_c \ {0}|` for `d ∈ {1, …, 9}`. Pairwise distance: chi-squared-style `D = Σ_d (count_a[d] − count_b[d])² / (count_a[d] + count_b[d] + 1)` with an additive smoothing constant guarding empty bins. Similar-direction gate: ratio form at `T = 0.5`. Different-direction gate: to be calibrated. Applicability N/A when either condition has fewer than 100 non-zero values or spans less than 1.5 orders of magnitude (floor inherited from §3.2). Not VST-aware.

*Deferral rationale.* Benford's Law requires multi-order data, which many batch fixtures fail globally — densitometry normalised values, qPCR Ct values, and bounded-range measurements don't clear the 1.5-order floor. Cross-condition applicability requires both conditions to pass individually, narrowing the reachable set further. Forensic value above §3.2: only when the dataset overall passes Benford but one condition's digit distribution diverges — a narrow edge case. The current 19-fixture batch contains no fixture designed to exercise this edge case, so empirical calibration is impossible. Revisit when a calibration fixture is purpose-built.

**P8 — Shannon entropy** (deferred to v1.1+). Per-condition statistic is the empirical Shannon entropy `H_c = −Σ_v p_c(v) log₂ p_c(v)` over distinct values in `X_c`. Pairwise distance: `|H_a − H_b|`. No parametric bootstrap required (unlike §3.6) — cross-condition comparison goes against the permutation null directly rather than against a theoretical distribution, so the Normal-model calibration issues documented at §3.6 do not apply. Similar-direction gate: ratio form at `T = 0.5`. Different-direction gate: to be calibrated, expected `|ΔH| ≥ 0.5` bits at min-N. Applicability N/A when either condition has fewer than 100 values (cross-condition entropy comparison needs more data than §3.6's within-column floor of 20 because we are differencing two noisy estimators). Not VST-aware — entropy depends on value discretisation, which VST alters.

*Deferral rationale.* Empirical Shannon entropy has estimator variance `Var(H) ≈ (K − 1) / (2N ln² 2)` for K distinct values at sample size N. At N < 200 and K on the order of 50–100 (typical continuous-measurement column), `SD(H)` is ≈ 0.3–0.5 bits — the same magnitude as the anticipated forensic signal. Expected applicability limited to fixtures with N ≥ 200 per condition, roughly 40% of current fabricated fixtures. The property may have value on large-N fixtures but requires calibration to set the different-direction gate against measured estimator variance, not prior expectation.

**Calibration protocol when P7/P8 are enabled.** Run the standard Stage-2-style calibration harness on the 19-fixture batch: check stop conditions (no clean MOD/HIGH, fabricated signals preserved), set the different-direction gate per the SE-derivation rule (`SE(statistic) ≤ ½ × gate`). If calibration surfaces excess clean-dataset flags at the minimum-N floor, raise the floor rather than loosening the gate — consistent with Stage 2's calibration posture. When P7/P8 enable, Stage 3's BH family at single-pair groups grows from m = 1 (P9 only) to m = 3 (full Stage 3), pushing `adj-p_min` from 0.002 to 0.006; still MOD-reachable. No architectural change needed.

**Stage 3 BH family (S103 decision).** Stage 3 ships in its own third BH family by the per-stage pattern established for Stage 1 and Stage 2 at S102. `primaryP = min(stage1_effAdjP, stage2_effAdjP, stage3_effAdjP)` across the three stages' effective adjusted p-values after forensic-direction and gate filters. At `B = 999`, each stage independently hits `m_stage = n_pairs × n_properties_in_stage`: at single-pair groups with P9 alone, Stage 3 has m = 1 (adj-p_min = 0.002, MOD reachable; HIGH unreachable at B=999 — see §Permutation-Test Arithmetic Constraints); when P7/P8 enable, Stage 3 reaches m = 3 (adj-p_min = 0.006, MOD reachable). Folding Stage 3 into Stage 2 would push single-pair Stage 2 from m = 3 to m = 6 (LOW only — the Option A failure mode rejected at S102), so own-family is strictly preferable on arithmetic. See SESSION103-SUMMARY §2.4 for full derivation.

**Minimum data.** K ≥ 2 conditions, at least one property × pair passing applicability gates.

---

### 1.10 Baseline Balance (Carlisle)

**Source:** Carlisle, J.B. (2017) — "too balanced" between-group baselines as a forensic tail. Realises the principled-null Carlisle test flagged as the successor to the removed Fold-Change Distribution Outlier (§1.6).

**Forensic target.** Honest random allocation produces between-condition differences that vary feature to feature; the per-feature significance test of those differences yields p-values that are uniform on (0, 1) under H₀. A fabricator who tunes groups to look matched compresses those differences, pushing the p-distribution toward 1.0 — the "too balanced" signature. The test looks for an excess of near-1 p-values, not for any single imbalanced feature.

**Procedure:**
1. Per feature, one-way ANOVA F across the condition groups → p-value via `regIncBeta`. Under honest allocation these feature p-values are U(0, 1).
2. **Routing branches on `condCtx.type`:**
   - **Row-grouped** → features are the **DATA columns**, conditions are the COND row groups. Gate: ≥5 columns.
   - **Column-grouped** → features are the **rows**, conditions are the COND column groups. Gate: ≥10 rows.
   - Otherwise N/A.
3. Two compound statistics on the feature p-distribution: **(a)** a binomial upper-tail test on `nExcess = #{p > 0.95}` against `expectedExcess = nFeatures × 0.05` (normal approximation, continuity-corrected); **(b)** a Kolmogorov–Smirnov D of the p-distribution against U(0, 1). `primaryP = min(binomP, ksP)`.
4. **Effect-size gate.** Demote to LOW unless `nExcess / nFeatures ≥ 0.50`. With few features, sampling variation alone produces one or two high p-values; genuine fabricated balance pushes *most* features near 1.0.
5. **Genuine-difference skip.** If more than half the features are significant (`nSig / nFeatures > 0.50` at p < 0.05) the conditions are genuinely different — return N/A, the balance test is not applicable.

**Flag:** from `primaryP` via the standard ladder (p < 0.001 → HIGH, p < 0.01 → MODERATE), subject to the effect-size gate.

**Input routing.** Runs on the **raw** matrix (not VST'd) — the test is on the distribution of allocation p-values, not on the value scale.

**Missing-value handling.** Pairwise per (condition × feature): each ANOVA group is `filter(v != null)` over its own cells. Partial-null rows are retained and contribute to whatever features they have values in; there is no listwise complete-case construction and no per-row exclusion. Asymmetric missing-rates between conditions are absorbed as unequal group `n_i` in the per-feature ANOVA.

**Known limitation — feature-count on row-grouped data (S182).** In the row-grouped branch the features are the DATA columns, so a fixture with few columns yields few feature p-values and the effect-size gate (`excessFrac ≥ 0.50`) requires a large fraction of those columns to be over-balanced before the test clears LOW. DS15 (`15-missing-carlisle.csv`, row-grouped, 6 DATA columns) is the canonical case: its ANOVA-filtered over-balancing does not present as a flat 6-column p-distribution, so Baseline Balance reads LOW correctly — the over-balance signal is a covariance / registered-property signature carried by Blocked Mahalanobis (§2.6b, Σ-pass Control rows 1–40) and the Cross-Condition Consistency framework (§1.9), not a mean-balance one. The column-grouped branch is unaffected and is the positive anchor: DS16 (`16-densitometry-carlisle-overbalanced.csv`, pure over-balancing, 60 row-features) fires HIGH with binomP = 0, KS-D = 0.75, 48 of 60 features over-balanced. No Baseline Balance cell is declared in the validation batch.

**Minimum data:** ≥2 conditions; row-grouped ≥5 DATA columns, column-grouped ≥10 rows; ≥5 testable features overall; per-feature ≥3 values per group (row-grouped) or ≥2 (column-grouped).

---

## 2. Distributional Tests on Inter-Replicate Differences

### 2.1 Autocorrelation of Differences (Lags 1–5)

**Source:** Simonsohn, U. (2013). Just post it: The lesson from two cases of fabricated data detected by statistics alone. *Psychological Science*, 24(10), 1875–1888.

**Procedure (v0.4, extended v0.8 S96 to lags 1–5):**
1. For each pair of replicate columns, compute the difference series d_i = x_{i,c1} − x_{i,c2}. (When log-transform is active: differences computed in log-space.)
2. For each lag k ∈ {1, 2, 3, 4, 5}, compute r_k = Σ(d_i − d̄)(d_{i−k} − d̄) / Σ(d_i − d̄)².
3. Pool r_k values across all pairs, per lag.
4. One-sample t-test per lag: H₀: mean(r_k) = 0. Gives pooled p_k for k = 1..5.
5. BH-FDR across the 5 pooled p-values → adj_k.

**Primary statistic (headline):** p_1. Lag-1 remains the primary flag driver — existing behaviour on clean datasets unchanged.

**Flag (lag-1 driven, unchanged):** Pooled t p_1 < 0.001 → HIGH, p_1 < 0.01 → MODERATE, with the effect-size gate below. Pair-level BH-FDR over lag-1 per-pair p-values can promote to MODERATE when any pair survives at ALPHA.FLAG.

**Sub-unit promotion (new, S96):** Per the S95 Track A unified sub-unit rule, promote the lag-1-driven flag from LOW to MODERATE on lag k ∈ {2..5} iff ALL THREE conditions hold for that lag:
  (i)   pooled adj_k < 0.001 (BH-FDR across the 5 pooled p-values);
  (ii)  effect-size gate: n < 500 OR |mean r_k| ≥ 0.25 — mirrors lag-1, prevents large-N genomic co-regulation (r_k ≈ 0.05–0.15 at multiple lags) from spuriously promoting when lag-1 itself was suppressed by the same gate;
  (iii) ≥ 2 pairs have per-pair adj-p < 0.05 at lag k, where per-pair adj-p is BH-FDR across all (pair × lag) units for k ∈ {2..5} within the group.

The rule is capped at MODERATE and never demotes.

Condition (iii) was added mid-S96 after a review surfaced a pair-lottery failure mode: the pooled one-sample t on lag-k values is seed-sensitive at moderate pair counts (n_pairs ≈ 15), so the mean of many weakly-correlated pair-level r_k's can drift far enough from zero to produce adj_k < 0.001 even when no individual pair has any serial structure. Condition (iii) prevents pair-lottery pooled-t artifacts by requiring that the pooled signal be corroborated by distributed per-pair evidence at the same lag.

**Rationale for extension.** Fabrication via row-by-row editing (e.g., value drifts following a hidden template) produces detectable serial structure beyond lag 1 — AR(2+) signatures, periodic patterns at lags 3–4, or a slowly-decaying autocorrelation function. Restricting the test to lag-1 misses these. Pooling per-lag across pairs with BH-FDR correction keeps the overall false-positive rate controlled, and the MODERATE cap (never HIGH via sub-unit alone) reflects that higher-lag signal on its own is a corroborating cue, not a smoking gun.

**v0.4 change (still active):** Removed the v0.3 effect-size floors (r₁ > 0.15/0.30) — with VST (log or Anscombe) now active for heteroscedastic assays, the root cause of Poisson-induced autocorrelation is addressed. At n ≥ 500, a calibrated gate (|mean r₁| ≥ 0.25) suppresses flags from genomic co-regulation background (r₁ ≈ 0.10–0.15) while preserving detection of fabrication (r₁ ≈ 0.44–0.81). See Tier 2 thresholds.

**Rationale (lag-1).** The pooled t-test tests whether mean(r₁) ≠ 0 across all replicate pairs. At small N, the t-distribution is wide → only large r₁ values are significant → conservative. At large N, even small r₁ values can be significant — but if the data genuinely has lag-1 autocorrelation (even mild), that IS forensically relevant. An arbitrary floor removes the test's ability to detect subtle fabrication in large datasets.

**Known false positives:** Time-dependent processes; autocorrelated biological processes; Poisson heteroscedasticity in cell-count data without log-transform (DS05 is the key validation case); genomic co-regulation at small |r| across multiple lags (suppressed by the n ≥ 500 effect-size gate on both lag-1 and the sub-unit lags).

**Row-semantics note (v1.0, S118).** Tier 2 effect-size floor `|mean r| ≥ 0.25 at N ≥ 500` is calibrated against genomic co-regulation background (r ≈ 0.10–0.15); fabrication-grade autocorrelation (r ≈ 0.44–0.81) continues to flag on arbitrary-order data. The forensic target is serial structure in the delivered row order, regardless of whether the axis is semantically meaningful — DS11 generator-leakage (r ≈ 0.55 on RNA-seq, `rowSemantics='arbitrary'` auto-routed) is the canonical positive case. **Not** dispatched through the Row Semantics Gate.

**Minimum data:** ≥2 columns, ≥10 rows.

---

### 2.1b Windowed Autocorrelation (S96)

**Source:** Extension of §2.1 motivated by the pair-lottery / localisation dichotomy surfaced earlier in S96: pooled autocorrelation across pairs can miss serial structure that is real but confined to a stretch of rows. Same forensic rationale (Simonsohn 2013) applied at window scope.

**Procedure:**
1. For each pair of replicate columns, compute the difference series d_i = x_{i,c1} − x_{i,c2}. VST transform applied the same as §2.1.
2. Slide a window of size W = 15 along each pair's d_i with stride S = 5. Discard trailing partial window.
3. Per window: compute lag-1 Pearson r on the 15 values.
4. **Within-pair permutation null (B = 999 at n ≤ 500, 499 at n ≤ 5000, 199 otherwise):** shuffle d_i within the pair (not within window), recompute the full windowed r vector. Accumulate per-window rank-count: `exceed_w = #{b : |r_w^perm(b)| ≥ |r_w^obs|}`. Per-window two-sided p_w = (exceed_w + 1) / (B + 1).
5. **BH-FDR per pair (S109 Part 2).** For each pair, run BH-FDR independently across that pair's window units, yielding `perPairAdjP`per window. The pair is the natural hypothesis family: each pair tests a distinct replicate-relationship claim ("are these two replicates serially-correlated in a confined row window?"). Grouping all pairs into one BH denominator (previous behaviour, pre-S109) over-conservatively dilutes a sparse-pair fabrication signal against the full pair grid. Per-pair BH aligns the correction scope with the hypothesis scope.

**Primary statistic (headline):** minimum per-pair adjusted p across all pairs (i.e. min over pairs of min over that pair's windows of `perPairAdjP`).

**Flag:** min adj-p < 0.001 → HIGH, < 0.01 → MODERATE, else LOW. Standard unified α.

**Why rank-accumulator counting rather than a stored null matrix.** At large n (genomics-scale), each pair has thousands of windows. Storing a `B × numWindows` null matrix per pair is O(pairs × windows × B) memory. Counting `exceed_w` in place is O(pairs × windows) — same forensic output at linear memory. Matches the precedent in Regional Noise Homogeneity (§4.2).

**Rationale for within-pair shuffle.** A within-pair shuffle destroys any serial structure in d_i while preserving the marginal distribution of the pair's differences. The observed window r is compared against window r's computed on de-serialised data. Shuffling within-window would be strictly too local (15 values carry almost no marginal-preservation information); shuffling across pairs would mix pair-specific noise levels and inflate the null. Within-pair is the right scope.

**Lottery-risk audit (S96).** Unlike the pooled-t null suppressed in the S96 higher-lag follow-up, the within-pair permutation null is not vulnerable to a mean-of-weak-noise artifact — it compares window-level statistics against window-level permuted statistics. The 18-dataset batch audit confirmed this: 0/18 datasets flag, 0/8 clean datasets flag, no suppression rule required. The permutation null is doing its job.

**Known limitations:**
- Within-window r estimation at n = 15 has large SE (~1/√15 ≈ 0.26), so ρ ≈ 0.2–0.3 is at the edge of per-window detectability. Combined with BH-FDR across many windows, the test is under-powered for mild global AR(1) ρ that §2.1 would catch pooled. That is by design — this test targets **localised** serial structure, not global.
- **Row-semantics note (v1.0, S118).** Within-pair row-shuffle permutation null renders baseline arbitrary-order noise inert by construction; real localised serial structure in the delivered order continues to flag at the calibrated p-value. Test is **not** dispatched through the Row Semantics Gate. Replaces the pre-S118 "engine does not hard-skip genomics" wording — the rationale is null-construction-aware, not assay-specific.
- **Per-pair BH arithmetic floor (S109 Part 2).** Per-pair BH at nWindows ≈ 18 and N_PERM = 999 gives a minimum reachable per-pair adj-p of approximately 1/(N_PERM+1) × nWindows ≈ 0.01 under H₀ — the MOD threshold. HIGH (primaryP < 0.001) on a localised fabrication requires either N_PERM ≥ 9999 or a wider window W that raises per-window signal-to-noise (raw-p floor effect).
DS21 v2 (ρ = 0.92, 80-row injection at N = 200 per condition, 5 fab reps on independent AR noise) produces fab-fab inside-injection per-window |r| in 0.52–0.58 (raw p 0.011–0.025) and min per-pair adj-p = 0.020 under current settings — above MOD, below HIGH. This is the expected behaviour at W = 15 / N_PERM = 999 and reflects WA v1.0's detection ceiling for localised fabrications at single-digit ρ² signal-per-window. A full N_PERM / W recalibration (raise N_PERM to 9999; evaluate W ∈ {20, 25} with stride/MIN_ROWS retuning and full DS01-19 regression) is parked as a standalone v1.1 calibration session. Under current settings, localised AR fabrications cap at MOD via WA; convergence with Cross-Cond Consistency Stage 2 P5 and Excess Kurtosis carries forensic attribution.
- **Fisher's-combination exemption (S109 Part 2).** Per-pair BH floor-truncates WA's group-level primaryP at ≈ 0.01 under H₀, violating Fisher's uniform-null assumption. WA is on the Fisher exempt list in `src/analysis/aggregation.js` alongside Excess Kurtosis (§2.2). See "Fisher's-combination exemption principle" in Design Rationale.

**Minimum data:** ≥2 columns, ≥30 rows (needed for ≥ 4 windows at size 15 / stride 5). Below 30 rows → N/A.

---

### 2.2 Excess Kurtosis + Anderson-Darling

**Source:** Simonsohn (2013), ibid. DeCarlo, L.T. (1997). On the meaning and use of kurtosis. *Psychological Methods*, 2(3), 292–307. Anderson, T.W. & Darling, D.A. (1952). Asymptotic theory of certain "goodness of fit" criteria based on stochastic processes. *Annals of Mathematical Statistics*, 23(2), 193–212.

**Count distribution-shape role.** On count data, where the marginal-shape trio (§3.6 / §3.7 / §3.8) is N/A because column marginals are mixtures of per-unit families, the predicted-σ normalisation here carries distribution-shape forensics — the per-gene mean cancels in the replicate difference, so the statistic is mixture-robust (S180).

**Procedure (v0.6, fixes 105, 140–141, 144–145, 156):**
1. For each replicate pair, compute the difference series.
2. **Predicted-σ normalisation (Item 3):** Fit log(variance) = β × log(mean) + α across all rows. Predict σ̂(μᵢ) = √exp(α + β × log(μᵢ)) per row. Normalise differences by σ̂ instead of per-row SD. This breaks the studentization dependency at small n_rep (n=3: per-row SD bounds d/σ near ±√2, making both observed and null equally platykurtic → test blind). Falls back to per-row SD when mean-variance fit is unavailable (<5 valid points or <50% row coverage).
3. **Kurtosis statistic:** Excess kurtosis κ = (1/n)Σz⁴ − 3 on the pooled normalised differences.
4. **Anderson-Darling statistic:** A² tests the full CDF of normalised differences against N(0, √2) — the theoretical distribution of d/σ̂ under H₀. More powerful than kurtosis for detecting uniform noise because it uses all CDF information, especially tail deficiency.
5. **Simulation null:** Run N_SIM independent batches (499 for small datasets, 99 for large). Each batch generates Gaussian noise with the same σ̂ structure, normalises identically, computes BOTH κ and A². The observed statistics are ranked against their respective null distributions. Performance scaling: datasets with >500 valid rows subsample to 500 rows per batch.
6. **Adaptive p-value selection (fix 156):** At n_rep ≤ 3, kurtosis is blind due to studentization bounds → A-D drives the flag (kurtP ignored). At n_rep ≥ 4, kurtosis has adequate resolution → kurtosis drives the flag (A-D reported as supplementary). This avoids the situation where kurtosis's insensitivity at n_rep=3 dilutes the combined p-value.
7. **Bonferroni combination:** When both statistics are informative (n_rep ≥ 4): pooledP = min(kurtP, adP) × 2. At n_rep ≤ 3: pooledP = adP (no correction needed for single test).
8. **Condition-stratified kurtosis (fixes 140–141, 144–145):** When condition labels are available, compute κDev per condition against the simulation null. If any condition shows platykurtic deviation at p < 0.01 with spread > 0.5, promote overall flag to MODERATE. Per-condition histograms displayed in test details. When multiple COND columns exist (fix 141), stratification runs independently per COND column.

**Flag:** Combined pooledP < 0.001 → HIGH (if platykurtic) or MODERATE; p < 0.01 → MODERATE.

**Directional + N-adaptive effect-size gate (S109 Part 2).** Two independent suppressions; either fires → flag is suppressed:

- **Directional suppression.** `κDev ≥ 0` (leptokurtic) is informational only: biological count data and heavy-tailed measurement noise both produce positive excess kurtosis, and fabrication at scale characteristically produces *platykurtic* signatures (smoothed variance, rounded digits, over-averaged replicates). Leptokurtic observations are reported in the evidence table but do not contribute to primaryP flagging. Universal at all N. Matches the tool-wide "too smooth flags, too noisy informational" principle (§Design Rationale).

- **N-adaptive effect-size floor.** Platykurtic observations (`κDev < 0`) are suppressed when `|κDev| < max(0.20, 1.96·√(24/pooledN))`. The asymptotic 95% null SE of sample kurtosis on iid Normal data is `√(24/N)`; the 1.96-factor threshold is the standard two-sided 95% margin. At small pooledN (≲ 600) the SE-derived floor dominates (e.g. pooledN = 300 → threshold ≈ 0.69); at large pooledN (> ~2300) the 0.20 substantive-effect floor dominates. The floor prevents small-N realisations where sample κDev noise happens to combine with A-D tail sensitivity to fire HIGH on truly-iid Normal input.

Evidence table reports the active threshold value and which gate is operative (`esGateMode ∈ {"directional (leptokurtic, informational)", "effect-size (|κDev| < X)", "active (flag from p-value)"}`). Condition-stratified promotion (Procedure step 8) mirrors the directional suppression — only platykurtic conditions are eligible for BH promotion.

**v0.4 Item 3 result:** DS04 (n_rep=3, uniform fabricated noise) now flags MODERATE via Anderson-Darling (adP=0.002) where kurtosis alone was blind (kurtP=0.57). DS08 (ELISA fabricated, AR(1) residuals) also gains a new MODERATE detection. Zero false positives on clean data.

**Known limitation:** Anderson-Darling tests against N(0, √2), which assumes the mean-variance fit is correct. When the fit is poor (e.g. fabricated data with wrong noise model), the A-D null is slightly miscalibrated — but the simulation null captures this by generating noise with the same (potentially wrong) σ̂ structure.

**Known limitation — autocorrelation-induced platykurtic detection.** The pooled kurtosis null assumes independence across normalised difference observations. When the underlying data carries structural autocorrelation (localised AR(p), covariance blocks, or any fabrication that induces inter-observation dependence), the pooled estimator reads platykurtic at a magnitude that reflects real structure but is technically a null-model mismatch: a block-bootstrap null respecting the dependence would widen the reference distribution and potentially include the observed κDev. Forensically the detection is informative — autocorrelation-induced platykurtosis is itself a fabrication signature — but the attribution is to "structural non-independence" rather than "variance artificially smoothed by over-averaging." Resolution path: either (i) accept as convergence-worthy collateral flag with cross-dim attribution (current behaviour, DS21/DS22 captured via Kurtosis + Stage 2 P5 + WA raw-p); (ii) add an autocorrelation pretest that routes AR-positive groups to a block-bootstrap null. Option (ii) parked as S110+ audit candidate; block-bootstrap sanity check on DS21/DS22 pre-gates the decision.

**S108/S109 small-sample calibration history.** S108 flagged Excess Kurtosis as co-firing with Benford First Digit on DS21/DS22 (centered N(0, 1) replicate-difference groups). The S109 Part 1 audit reframed this characterisation: simulation at DS21/DS22 fixture shape (N = 200 per condition × nRep = 7/8) on truly iid N(0, 1) fires LOW 50/50 — no Kurtosis FP at those pooledNs. The distinct true-FP zone is N_rows = 200 × nRep = 3 (pooledN ≈ 300) at 12/50 HIGH pre-fix, addressed by the S109 Part 2 N-adaptive floor (post-fix 0/50 HIGH). The DS21/DS22 κDev ≈ −0.24 signal at pooledN ≈ 2000+ is structurally driven by the AR-injection (DS21) and covariance-block (DS22) fabrication constructions: correlation across pooled observations compresses the independence-assuming pooled kurtosis estimator toward platykurtosis. The S109 Part 2 directional + N-adaptive gate correctly preserves these detections — the flag fires because the data is genuinely platykurtic at forensically meaningful magnitude. See Known Limitation: "Autocorrelation-induced platykurtic detection."

**Minimum data:** ≥2 columns, ≥20 rows.

---

### 2.3 Runs Test

**Source:** Wald, A. & Wolfowitz, J. (1940). On a test whether two samples are from the same population. *Annals of Mathematical Statistics*, 11(2), 147–162.

**Procedure (v0.4):**
1. For each replicate pair, compute the difference series. (When log-transform is active: differences in log-space.)
2. Classify each position as positive (d > 0) or negative (d < 0). Ties (d = 0) are ignored.
3. Count runs (contiguous sequences of the same sign). Compare to expected runs under randomness: E(R) = 2n₊n₋/n + 1, Var(R) = 2n₊n₋(2n₊n₋ − n) / (n²(n−1)).
4. Pool z-scores across all pairs. One-sample t-test: H₀: mean(z) = 0.
5. **Windowed scan:** Sliding windows of 15 rows (stride 5), run per pair per condition. BH-FDR correction across ALL individual windows. adjP < 0.001 → HIGH signal, adjP < 0.05 → MODERATE.

**Flag:** More severe of global and windowed. Global: pooled t p < 0.001 → HIGH, p < 0.01 → MODERATE.

**v0.4 change:** Removed the arbitrary |pooledMeanZ| > 1.96 floor from the global flag. The pooled t-test p-value alone determines significance.

**Known limitation:** BH-FDR on overlapping windows is conservative (overlapping windows have complex dependence). A proper scan statistic (v0.4 Item 5) would use a permutation-based null for the maximum windowed z.

**Row Semantics Gate (v1.0, S118).** → N/A when `rowSemantics === 'arbitrary'`. Sign-run sequences over arbitrary row order have no forensic interpretation. See §"Row Semantics Gate".

**Minimum data:** ≥2 columns, ≥10 rows.

---

### 2.4 Row-Mean Runs Test

**Source:** Wald & Wolfowitz (1940), ibid. Applied to row-mean residuals rather than inter-replicate differences.

**Procedure (v0.4, fix 104):**
1. Require row-level condition labels (COND column). Without per-condition grouping, row means carry biological variation that produces natural clustering indistinguishable from fabrication. Return N/A for column-grouped or no-condition datasets.
2. For each condition: extract row means for rows belonging to that condition.
3. Fit linear trend on row index (OLS). Compute residuals.
4. Apply Wald-Wolfowitz runs test to the sign sequence of residuals. Two-sided: both too few runs (block shifts) and too many runs (human over-alternation) are forensic signals.
5. **Windowed scan:** Sliding windows of 15 rows, BH-FDR correction across ALL windows across all conditions.
6. **Flag:** More severe of global (best per-condition p) and windowed.

**Design decisions:**
- **Per-condition only.** Between-condition mean differences create step functions that linear detrending cannot remove. Only within-condition sequences are tested. This was discovered during validation when DS03 (clean qPCR) false-positived at HIGH on the "All rows" analysis due to the WT/KO condition boundary.
- **Two-sided test.** Too few runs indicates block shifts (additive offset applied to a row block). Too many runs indicates human over-alternation (fabricator tries to make data look "random").

**Forensic value:** Detects uniform additive shifts applied to all replicates of a row block — a pattern completely invisible to the inter-replicate Runs Test (§2.3), where such shifts cancel in the difference series.

**Known limitation:** Narrow scope — requires row-level condition labels and targets uniform-direction block shifts. Not applicable to most experimental designs (column-grouped conditions, no conditions).

**Row Semantics Gate (v1.0, S118).** → N/A when `rowSemantics === 'arbitrary'`. Per-condition row-mean drift detection requires meaningful row sequence within each condition. See §"Row Semantics Gate".

**Minimum data:** ≥2 columns, ≥10 rows, row-level condition labels.

---

### 2.5 Inter-Replicate Correlation

**Source:** Leave-one-out ICC methodology; Fisher z-transform; Wilcox (2012) robust statistics.

**Procedure (v0.6, S44–S45):**

*Correlation computation:*
1. Within each condition group, compute **winsorized Pearson r** (5th/95th percentile caps) for all replicate pairs. Winsorization tolerates up to 5% contamination from QC outliers (typical proteomics QC rate: 1–3%) while preserving sensitivity to block-level patterns affecting >10% of rows (Wilcox 2012).
2. The windowed scan (see below) uses **raw Pearson r** — in 8–15 row windows, every data point carries signal, and winsorization would remove genuine forensic evidence.
3. ICC computation also uses winsorized columns (each column winsorized independently before computing between-row and within-row variance components).

*Leave-one-out test:*
1. For each pair, compute a leave-one-out null: the mean winsorized r of all OTHER pairs in the same condition.
2. Fisher z-transform both the observed r and the leave-one-out null.
3. Z-test: z = (z_obs − z_null) / SE, where SE combines pair sampling uncertainty (1/√(n−3)) and null estimation uncertainty (SE_pair / √(k−1)).
4. BH-FDR correction across all pairs.
5. A pair is "suspicious" if: BH-adjusted p < ALPHA.FLAG AND excess > minExcess AND not in a high-SNR regime (ICC > 0.99). The minimum excess is 0.01 at small N, raised to 0.05 at N ≥ 500 (trivial excess reaches significance at large N due to small Fisher z SE).

*Windowed permutation scan (localised detection):*
1. For each scannable pair (not high-SNR, ≥ enough rows for windows), slide a window of size 8–15 and compute raw Pearson r-excess over the leave-one-out baseline.
2. Scan statistic: max r-excess across all pairs × windows.
3. Permutation null: shuffle row order per pair (preserves within-row pairing, breaks spatial ordering), recompute scan statistic. Pre-allocated index arrays for performance (fix 250).
4. P-value from permutation rank.

*Flag:* `flagFromP(bestAdjP)` on the best BH-adjusted p among suspicious pairs (pairs passing both BH-FDR and effect-size gate). Combined: take more severe of global and windowed flags. High-SNR experiments (all conditions have ICC > 0.99) are automatically LOW.

*Sub-unit BH-FDR promotion (fix 239):* If any individual pair survives BH-FDR at ALPHA.FLAG, promote to at least MODERATE. Can only promote, never demote.

**Rationale for winsorized Pearson (fix 244):** Standard Pearson r is highly sensitive to leverage outliers. In proteomics (DS09), 3 QC outlier proteins (one replicate 3–5× off) inflated global r via leverage, producing Fisher z statistics extreme enough for a false positive at N=200. Spearman ρ was tested first but was too aggressive — rank-based ICC also predicts high ρ, shrinking excess below threshold and losing genuine detections (DS08: 14-row multiplicative offset). Winsorized Pearson is the principled middle ground: robust to a few extreme outliers while preserving the metric-space properties needed for the LOO comparison.

**Rationale for leave-one-out:** Estimating the expected r from the same data being tested is circular. Leave-one-out eliminates this — each pair's null is derived from the other pairs.

**Row Semantics Gate — sub-unit suppression (v1.0, S118).** Under `rowSemantics === 'arbitrary'` the **windowed permutation scan only** is suppressed; the global LOO winsorized-Pearson pairwise test continues to run. Sliding 8–15-row windows over arbitrary row order have no forensic interpretation, but full-series pairwise correlation is row-order invariant. Result object reports `subunitsSuppressed: ['windowed-scan']`; `primaryP` collapses to the global best in suppressed mode. See §"Row Semantics Gate".

**Minimum data:** ≥2 columns, ≥6 rows per condition.

---

### 2.6 Mahalanobis Row Outlier

**Source:** Mahalanobis, P.C. (1936). On the generalised distance in statistics. *Proceedings of the National Institute of Sciences of India*, 2, 49–55. Penny, K.I. (1996). Appropriate critical values when testing for a single multivariate outlier by using the Mahalanobis distance. *Journal of the Royal Statistical Society: Series C*, 45(1), 73–81. Filzmoser, P., Garrett, R.G. & Reimann, C. (2005). Multivariate outlier detection in exploration geochemistry. *Computers & Geosciences*, 31(5), 579–587.

**Procedure (v0.5; dispatch v1.0 per S127 Path 1):**
1. **Per-condition stratification (sole path on multi-condition row-grouped data).** When the condition context resolves ≥2 row-condition groups each with ≥3 rows (`condCtx.rowGroups()` non-null), compute (μ, Σ) per condition. The pooled (full-matrix joint (μ, Σ)) path is skipped on multi-condition row-grouped data: pooled would conflate treatment-effect rows with fabrication, inflating D² for legitimate biology and firing the verdict on real condition differences. Single-condition / no-row-condition / column-grouped fixtures use the full-matrix pooled path — pooled IS per-condition by construction when there's only one group.
2. For each row, compute the Mahalanobis distance: D²(x) = (x − μ)ᵀ Σ⁻¹ (x − μ) against its condition's (μ, Σ).
3. Under multivariate normality, D² ~ χ²(p) where p = number of replicates.
4. Flag individual rows whose Stage-2 BH-FDR-adjusted χ²-survival p falls below α = 0.001 (per-row identification).
5. **Test-level flag (verdict reads off the localised finding the test name promises, S126b add-5b):** if Stage-2 BH-FDR finds zero surviving rows, the test returns LOW regardless of dataset-level binomial p. Only when ≥1 row survives BH-FDR does the dataset-level binomial test on `nExceedP01` (rows exceeding raw χ²(p, 0.99)) decide HIGH/MOD via `binomP < ALPHA.FLAG`/`< ALPHA.NOTE`. This keeps the verdict honest about the test's promise to identify *which rows* are unusual; a flag with no per-row evidence would mis-direct readers to a localised finding that doesn't exist.

**Flag:** With ≥1 BH-FDR-surviving row: binomial p < 0.001 → HIGH, p < 0.01 → MODERATE. Zero surviving rows → LOW.

**Effect-size gate (N ≥ 500):** Require exceedance fraction ≥ 2× expected rate.

**VST-aware:** Runs on log/Anscombe-transformed data to stabilise variance. Compute on residuals after subtracting row means (centres the distribution). **Internal normality-correcting log (fix 143):** When all values are positive and skewness > 1.5, applies an additional internal log transformation to reduce departure from the multivariate normality assumption underlying the χ² null. This does not affect other tests.

**Genomics skip (fix 117):** Count data is inherently non-normal (zero-inflated, heavy-tailed). Even after log transform, the χ²(p) null for D² is severely violated — biological expression heterogeneity produces 10–15% "outlier" rows from normal variation.

**Forensic value:** Detects rows where individually plausible values are jointly improbable — a fabricator who generates plausible per-replicate values may still produce rows with wrong multivariate structure (e.g., copy-paste from a different sample produces a row where all replicates are internally consistent but the joint distribution is wrong).

**Known false positives:** Heavy-tailed data; small sample sizes (noisy Σ estimate). Mitigated by Bonferroni individual thresholds and binomial test-level gate.

**Fisher's-combination exemption (S127c):** §2.6 is exempt from the Fisher's-combination cross-group aggregation in `aggregation.js` (joining `aggregation.js` Fisher-exempt set's other three members at S127c — Excess Kurtosis, Windowed Autocorrelation, Blocked Mahalanobis). Rationale: `primaryP = binomP` from the dataset-level binomial on rows exceeding χ²(p, 0.99). The χ² null assumes multivariate normality; under heavy-tailed raw data the exceedance count exceeds the binomial null even when zero rows survive Stage-2 BH-FDR α=0.001 — `binomP` becomes stochastically smaller than Uniform(0,1) under H0, violating the uniform-null assumption Fisher's chi-squared combination depends on. Pre-S127c, on multi-condition row-grouped fixtures running with VST=raw routing, each per-group testFn correctly hit the S126b add-5b verdict gate (`nOut === 0 → LOW`) but the aggregator's Fisher's-combination on the small per-group binomP values inflated the combined χ² and promoted the aggregate flag from LOW to HIGH — a false-positive pathway that bypassed the test's own per-row evidence requirement. Post-S127c, the aggregator falls back to `worstGroupFlag` for §2.6 — when both per-group verdicts are LOW (no rows survive BH-FDR within either condition), the aggregate stays LOW. Under VST=log routing the gate is dormant in either branch (per-group binomP ≈ 0.5 post-VST); the fix matters specifically under raw routing where the test's null mis-calibration makes Fisher's promotion structurally unreliable.

**Minimum data:** ≥3 replicate columns, ≥3×nC rows.

---

### 2.6b Blocked Mahalanobis Covariance-Anomaly Detection

**Source:** Extension of §2.6 targeting block-localised covariance or mean structure rather than per-row joint implausibility. Ledoit, O. & Wolf, M. (2004). A well-conditioned estimator for large-dimensional covariance matrices. *Journal of Multivariate Analysis*, 88(2), 365–411. Hotelling, H. (1931). The generalization of Student's ratio. *Annals of Mathematical Statistics*, 2(3), 360–378. Anderson, T.W. (2003). *An Introduction to Multivariate Statistical Analysis* (3rd ed.), §§5.3, 10.8.

**Forensic target:** contiguous row blocks whose cross-replicate covariance Σ or block mean μ diverges from the rest of the condition — a signature of factor-model value injection, block copy-paste with noise perturbation, or unrecorded localised batch effects. Orthogonal to §2.6 row-level D² (which tests individual rows against a global (μ, Σ)): a factor-model fabrication confined to a row stretch can leave per-row D² within the χ²(p) tail while the within-block Σ diverges substantially from the condition background.

**Procedure (v1.0, S110):**

1. **Applicability gates (fail-fast, in order):**
   (a) `dataType === 'continuous'` (count and survey route to N/A upstream via DATATYPE_SKIP). **Row Semantics Gate (v1.0, S118):** N/A when `rowSemantics === 'arbitrary'` — sliding (μ, Σ) windows over arbitrary row order have no forensic interpretation, and the within-condition row-shuffle null does not recover the question. Replaces the pre-S118 ad-hoc `assay === 'genomics'` skip; genomics auto-routes to `arbitrary` at import.
   (b) `nC ≥ 3` replicate columns (below 3, covariance has one off-diagonal and the eigenvalue-ratio degenerates; matches §2.6).
   (c) Per-condition complete-row count `≥ 60` after null filtering (below 60, the scan has fewer than 4 windows at W=30 and the per-condition BH family collapses).
   (d) Per-condition routing: if condition labels exist, scan independently per condition. Unlabeled datasets run as a single condition over the full matrix.

2. **Window assignment.** Window size `W = max(30, 3·nC)`; stride `S = max(10, ⌊W/3⌋)`. Windows indexed `[i·S, i·S + W)` for `i = 0, 1, …, ⌊(N−W)/S⌋`. Trailing partial window discarded. At nC=7, N=200: W=30, S=10, nWindows=18.

3. **Per-window statistics, per condition.** For window block `B` and complement `\B`:

   **μ-pass** (block-vs-complement mean separation, two-sample Hotelling T²):
   - Block mean μ̂_B, complement mean μ̂_{\B}.
   - Ledoit-Wolf-shrunk sample covariances Σ̂_B, Σ̂_{\B} (see step 4).
   - Pooled within-group covariance Σ̂_pooled = [(|B|−1)·Σ̂_B + (|\B|−1)·Σ̂_{\B}] / (N−2).
   - T²_B = (μ̂_B − μ̂_{\B})ᵀ Σ̂_pooled⁻¹ (μ̂_B − μ̂_{\B}) × [|B|·|\B| / N].

   **Σ-pass** (block-vs-complement covariance inflation, generalised eigenvalue ratio):
   - Independently LW-shrunk Σ̂_B, Σ̂_{\B}.
   - R_B = λ_max(Σ̂_B · Σ̂_{\B}⁻¹) — largest generalised eigenvalue of the symmetric pencil Σ̂_B v = λ Σ̂_{\B} v. Computed via power iteration on Σ̂_B · Σ̂_{\B}⁻¹ (dominant eigenvalue is real positive because the pencil is PD–PD). One-sided (inflation only).

   **Per-condition scan statistics:** T²_max = max_B T²_B, R_max = max_B R_B.

4. **Ledoit-Wolf linear shrinkage (Ledoit & Wolf 2004 Theorem 1).** Target `T = (trace(S)/p)·I` (scaled identity). Closed-form intensity `α̂ = clip(β̂² / δ̂², 0, 1)` with `β̂² = (1/N²) Σ_i ‖x_i x_iᵀ − S‖²_F` (centered rows) and `δ̂² = ‖S − T‖²_F`. β̂² clipped at δ̂² so `α̂ ∈ [0, 1]`. Output `Σ̂ = (1 − α̂)·S + α̂·T` is PD by construction. Shrinkage stabilises the eigenvalue estimate at B/nC ≳ 3.

5. **Permutation null: within-condition row shuffle.** Per permutation per condition, shuffle the complete-row list, re-form windows at the same fixed boundaries, recompute T²_max and R_max on the shuffled data. Rank-accumulator counting (no stored null matrix). Adaptive B_perm: 4999 at N_group ≤ 500; 999 at N_group > 500 (matches LOESS §2.7 precedent on max-N).

6. **Raw per-pass per-condition p-values** with (k+1)/(B+1) smoothing:
   - p^μ_c = (1 + #{T²_max^perm ≥ T²_max^obs}) / (B_perm + 1)
   - p^Σ_c = (1 + #{R_max^perm ≥ R_max^obs}) / (B_perm + 1)

7. **BH-FDR across (pass × condition) family**, m = 2·nCond. `primaryP = min` across all m BH-adjusted p-values.

**Flag:** primaryP < 0.001 → HIGH; < 0.01 → MODERATE; else LOW. Standard unified α.

**Fisher's-combination exemption.** primaryP under H₀ is floor-truncated by the permutation count and the BH denominator (min reachable primaryP ≈ m/(B_perm+1)), and the per-condition permutation null is shared across groups within a row-grouped condition when multi-group aggregation applies. Both conditions violate Fisher's uniform-null assumption. Blocked Mahalanobis is on the Fisher exempt list in `src/analysis/aggregation.js` alongside §2.2 Excess Kurtosis and §2.1b Windowed Autocorrelation (see Design Rationale → Fisher's-combination exemptions).

**VST-aware:** Runs on post-VST data (same routing as §2.6 Mahalanobis Row Outlier). See Known Limitations for the signed-centered-data interaction surfaced during S110 landing.

**Block-specific μ centering for Σ estimation:** each block's sample covariance is computed about the block's own mean μ̂_B (not a global mean). This absorbs block mean shifts into the μ-pass where they belong and focuses the Σ-pass purely on covariance structure. Reference complement is similarly centered at μ̂_{\B}.

**Relationship to §2.6:**

| Test | Scope | Target | Null |
|---|---|---|---|
| §2.6 Mahalanobis Row Outlier | Per-row | Row-level joint implausibility given global (μ, Σ) | χ²(nC), binomial exceedance with BH-FDR per row |
| **§2.6b Blocked Mahalanobis** | Per-block (sliding window) | Block-level Σ or μ deviation from condition background | Within-condition row-shuffle permutation on scan-max |

§2.6 catches rows whose observed values are jointly improbable under a single condition-wide (μ, Σ). §2.6b catches blocks whose within-block Σ or μ diverges from the condition's non-block background. A factor-model injection at ρ = 0.5 across a 30-row stretch in an N = 200 condition passes §2.6 (per-row D² stays within χ²(p) tail) while §2.6b's Σ-pass localises the block via the elevated eigenvalue ratio.

**Forensic value:** Detects three fabrication signatures that §2.6 and other inter-replicate tests miss:
1. **Factor-model value injection** (X_j = √ρ·C + √(1−ρ)·Z_j applied to a row-stretch subset of replicates): produces elevated within-block off-diagonals without shifting row-level D².
2. **Block copy-paste with noise perturbation** (a block of rows copied and jittered): produces shifted block μ and often altered Σ; either pass may fire.
3. **Unrecorded localised batch effects**: produces block-level covariance or mean heterogeneity without individual-row anomalies.

**Known limitations:**

- **Scan-statistic sensitivity at planted-cluster fabrications depends on K/N per group.** At K/N ≥ 0.30 with ρ ≥ 0.5 rank-1 covariance injection, the injection-aligned window raw-p reaches the permutation floor 1/(B_perm+1), unlocking HIGH after BH-FDR across the (pass × condition) family at B_perm=4999. At K/N ≈ 0.15 (the DS22 design), row-permutation null has non-trivial upper-tail density from lucky-concentration shuffles where a randomly-permuted 30-row window happens to contain ~15 injection rows by chance, capping sensitivity at MODERATE. At K/N ≤ 0.05 signal is below scan-detectable. **Multi-scale rescue retired at S112 Phase 1.** Diagnostic on DS22 (K/N=0.15) across W ∈ {30, 50, 60, 80, 100, 150} showed larger W dilutes the block faster than it tightens the null: W=30→60 gives λ_obs −25% vs null-99.9th −21%, with power degrading monotonically. Optimal scale for DS22 is W=50 (raw-p 4×10⁻⁴, primaryP 0.0016) — the 5/3·K geometric sweet spot; no scale reaches HIGH at B_perm=4999. Under current single-scale architecture the K/N=0.15 MOD ceiling is permanent. Re-spec prerequisite: K-breadth validation fixtures at K/N=0.30 (DS22b) and K/N=0.075 (DS22c) to establish what multi-scale would actually buy.

- **Arithmetic-floor ceiling.** With m = 2·nCond units and B_perm = 4999, the minimum reachable BH-adjusted p is `m / (B_perm+1) = 0.0008` at nCond = 2 (HIGH just reachable at the floor), `0.0012` at nCond = 3 (HIGH unreachable, MOD reachable), `0.0016` at nCond = 4 (HIGH unreachable, MOD reachable). Raising B_perm to 9999 unlocks HIGH at nCond ≤ 4; deferred as v1.1 compute-budget calibration.

- **Single-scale block size.** v1.0 scans at W = max(30, 3·nC) only. Window-size geometry: optimal W ≈ 5/3·K where K is the injected-block length — the block fully inscribes the window, scan positions around the true block generate the narrowest null tail, and power peaks. Scan-based design makes K unknown at analysis time, so W is a compromise across the plausible K range. Fabrications with K substantially smaller than W or larger than ~3W are at the edge of detectability. Multi-scale block assignment considered and retired at S112 — see scan-statistic sensitivity note above.

- **VST-routing interaction on signed-centered data.** When VST-log is selected by `detectVST` on a signed-centered fixture (e.g. DS22 N(0,1) replicate-difference matrix), log(v) is undefined on v<0 and the VST'd matrix is null-contaminated; Blocked Mahalanobis then filters most rows out and routes to N/A. Observed during S110 landing on DS22 and DS21. The broader VST-routing question (should VST-log apply to signed or centered data at all?) is engine-wide and parked as S111 Priority #1. Blocked Mahalanobis v1.0 ships on the inherited §2.6 routing; finding is documented here rather than worked around mid-session.

- **Count skip.** Multivariate normality assumption fails on integer count data even after VST-log. `dataType === 'count'` routes to N/A via DATATYPE_SKIP. Genomics is handled by the Row Semantics Gate (auto-routes to `rowSemantics='arbitrary'` at import) — see gate (a) above; pre-S118 ad-hoc `assay === 'genomics'` skip retired in S118.

**Minimum data:** nC ≥ 3 replicate columns; ≥60 complete rows per condition (after null filtering); at least one full window at W = max(30, 3·nC). Below any of these → N/A with condition-specific reason in `description`.

**Landed batch behaviour (S110):**

| Fixture | nC | N/cond | Flag | primaryP | Argmax |
|---|---|---|---|---|---|
| DS22 (covariance block, K/N=0.15) | 7 | 200 | N/A under VST-log routing on N(0,1) data; MOD under raw-matrix routing (parked VST audit) | — | — |
| DS21 (localised AR ρ=0.92) | 8 | 200 | N/A under VST-log routing | — | — |
| DS15 (missing-carlisle) | 6 | 66 Control (52 Treatment below 60 floor) | MODERATE (primaryP=0.0040, Σ-pass Control rows 1–40) | 0.0040 | See TEST-GROUND-TRUTH DS15. S110 landing 0.0048; now 0.0040 (post-S111 permutation drift, severity unchanged) |
| DS07, DS08, DS09, DS10, DS12a, DS12b, DS16, DS17, DS20 | — | — | LOW | various | — |
| Count-data and low-N fixtures | — | — | N/A via gates | — | — |

---

### 2.7 LOESS Residual Analysis with CUSUM Changepoint

**Source:** Cleveland, W.S. & Devlin, S.J. (1988). Locally weighted regression: An approach to regression analysis by local fitting. *Journal of the American Statistical Association*, 83(403), 596–610. Page, E.S. (1954). Continuous inspection schemes. *Biometrika*, 41(1/2), 100–115. Killick, R. & Eckley, I.A. (2014). changepoint: An R package for changepoint analysis. *Journal of Statistical Software*, 58(3), 1–19.

**Dual-statistic test for partial fabrication.** When only part of a dataset is fabricated (e.g. rows 80–120 smoothed or extrapolated), the noise character changes at the boundary. Global tests (kurtosis, runs) are diluted by the clean majority. This test detects both the anomalous region and its boundary.

**Procedure (v0.5):**

*Statistic 1 — Windowed variance scan (region detection):*
1. For each replicate pair, compute mean absolute inter-replicate differences per row.
2. Fit a LOESS smoother (tricube kernel, locally weighted linear regression) to |differences| vs row index. Adaptive span: 0.3 of data, capped so neighbourhood ≤ 50 rows.
3. Compute LOESS residuals = observed − fitted.
4. Sliding-window variance of LOESS residuals. Under H₀ (uniform noise structure), window variance should be constant relative to global variance.
5. Scan statistic: max ratio of window variance to global variance (two-sided: both smoother and rougher windows flagged).

*Statistic 2 — CUSUM changepoint (boundary detection):*
1. Compute CUSUM (cumulative sum of deviations from global mean noise): S[i] = Σ_{j=1}^{i} (noise[j] − global_mean).
2. The point of max |S[i]| is the estimated changepoint — where the noise level has shifted most.
3. Direction: positive CUSUM peak → noise decreases at changepoint; negative → increases.
4. *Secondary changepoint — one-level binary segmentation (v0.8):*
   a. After finding the primary changepoint, split the data into two segments at that row.
   b. Run CUSUM independently on each segment: compute max |CUSUM| within each segment.
   c. Each segment gets its own permutation null: shuffle rows within that segment only, compute segment CUSUM statistic under each permutation. Same permutation count as the main test (4999 at N≤100, 499 at larger N, applied per-segment based on segment length).
   d. If either segment's CUSUM permutation p < 0.01, report its changepoint as the secondary (with p-value). If both segments are significant, report the more significant one.
   e. If neither is significant, no secondary changepoint is reported.
   This replaces the previous heuristic (>30% of primary CUSUM magnitude, margin-based exclusion), which had no significance test and frequently reported spurious secondary changepoints near the primary.

*Shared permutation null:*
Both statistics use a single row-shuffle permutation. Each permutation generates a shuffled scan statistic AND a shuffled CUSUM statistic simultaneously — no additional computational cost. P-values: scanP from scan stat rank, cusumP from CUSUM stat rank.

*Combined flag:* primaryP = min(scanP, cusumP) × 2 (Bonferroni for 2 statistics).

*Per-pair BH-FDR sub-unit promotion (fix 241):*
After pooled analysis, run independent LOESS + windowed scan + CUSUM for each replicate pair (capped at 30 pairs). Each pair gets its own permutation null (499 perms). Combined p per pair = min(scanP, cusumP). BH-FDR across per-pair combined p-values; promote to MODERATE if any survives ALPHA.FLAG. Can only promote, never demote. Consistent with Autocorr, Runs, Kurtosis, ConstOffset, RegNoise, IRC (all 9 Category A tests now have sub-unit BH-FDR).

**Flag:** Combined p < 0.001 → HIGH, p < 0.01 → MODERATE. Per-pair promotion can elevate LOW → MODERATE.

**Effect-size gate (N ≥ 500):** Require variance ratio ≥ 2.0.

**VST-aware:** Runs on transformed data (same routing as Kurtosis, Runs, etc.).

**Row Semantics Gate (v1.0, S118).** → N/A when `rowSemantics === 'arbitrary'`. Sequential noise-character analysis is undefined when row sequence is arbitrary. Replaces the pre-S118 ad-hoc `assay === 'genomics'` skip; genomics auto-routes to `arbitrary` at import. See §"Row Semantics Gate".

**Forensic value:** The windowed scan says "rows 160–240 have smoother noise" (the region). The CUSUM says "noise decreases sharply at row 161" (the boundary). Together they identify both the fabricated region and its entry point. In DS10 (planted flaw at proteins 80–120), the CUSUM placed the changepoint at row 159 — within 2 rows of the true boundary.

**Known limitations:**
- LOESS bandwidth parameter affects sensitivity — too narrow misses gradual transitions, too wide absorbs the signal. Adaptive span (0.3, capped at 50 rows) is a compromise.
- One level of binary segmentation (v0.8) provides a principled secondary changepoint with its own permutation p-value. Deeper recursion (multiple fabricated regions in a single dataset) is deferred to v1.0. The secondary changepoint has lower power than the primary — the shorter segment length reduces permutation resolution.
- Within-segment permutation null limitation: when the heterogeneous segment contains extreme values from both noise regimes (e.g. a quiet→noisy→quiet pattern where the primary CP captures the noisy→quiet boundary), shuffling within the segment redistributes extreme values uniformly across both sides of most permutations. The test asks whether the boundary is surprising given the values in the segment, but since the segment was selected because it contains the transition, extreme values dominate regardless of position. This can cause the secondary CP to fail the p < 0.01 threshold even when the boundary is visually obvious (observed in DS-UIflagged: left segment CP at row 41, CUSUM maxAbs=1466.5, but permutation p=0.48). Multi-changepoint methods (wild binary segmentation, PELT) would address this selection effect but are deferred to v1.0.
- Not applicable when row ordering is arbitrary (genomics, alphabetical protein lists). Dispatched via the Row Semantics Gate (v1.0, S118) — see entry above and §"Row Semantics Gate".

**Minimum data:** ≥2 columns, ≥30 rows.

---

## 3. Digit-Level Analysis

### 3.1 Terminal Digit Uniformity

**Source:** Simonsohn (2013), ibid. Also: Mosimann, J.E., Wiseman, C.V. & Edelman, R.E. (2002). Data fabrication: Can people generate random digits? *Accountability in Research*, 9(1), 21–32.

**Procedure (v0.4):**
1. Extract the last digit of each value. For data with >95% integer values, return N/A (units digit of counts has no reason to be uniform).
2. Detect trailing-zero suppression (digit 0 at <40% of expected frequency). If detected, use 9-digit test (digits 1–9, df=8). Otherwise, 10-digit test (digits 0–9, df=9).
3. Chi-squared goodness-of-fit test against uniform distribution.

**Flag:** χ² p < 0.001 → HIGH, p < 0.01 → MODERATE.

**v0.4 change:** Tightened from α = 0.01/0.05 to α = 0.001/0.01 for consistency with the unified framework.

**Known false positives:** Data with few decimal places; instrument truncation; data that has been rounded or recoded.

**Minimum data:** ≥50 total values with decimal components.

---

### 3.2 Benford's First Digit Test

**Source:** Nigrini, M.J. (2012). *Benford's Law: Applications for Forensic Accounting, Auditing, and Fraud Detection.* Wiley. Also: Diekmann, A. (2007). Not the first digit! Using Benford's Law to detect fraudulent scientific data. *Journal of Applied Statistics*, 34(3), 321–329.

**Procedure (v0.4):**
1. Extract leading significant digit (1–9) of each absolute non-zero value.
2. **Applicability gates (two preconditions).**
   - (a) Positivity fraction ≥ 80% of non-zero values are strictly positive. Benford's Law applies to scale-free positive quantities; centered-symmetric distributions (N(0, σ²), residual series, standardised scores) are inapplicable because `|values|` near zero produces a leading-digit distribution that deviates from Benford even under genuinely clean data. The 80% threshold admits positive-quantity data with occasional negative artefacts (outlier-subtraction residuals, sign-flipped controls) while rejecting fundamentally signed data. Return N/A with reason "not positive-scale data ({positivityFrac×100}% positive)" when the gate fails.
   - (b) Robust log span ≥ 1.5 orders of magnitude on `|values|`. Benford's Law requires multi-order data (Diekmann 2007). Return N/A with reason "OOM span {span} < 1.5" when below threshold. Order: N floor → positivity → OOM span → leading-digit count floor.
3. Compute MAD (Mean Absolute Deviation) from Benford's expected distribution.
4. **Simulation null at all N:** Draw 5000 samples of size min(N, 10000) from the exact Benford distribution (leading digit of 10^U, U ~ Uniform(0,1)). Compute MAD for each. P-value = fraction with MAD ≥ observed MAD.

**Flag:** Simulation pMAD < 0.001 → HIGH, pMAD < 0.01 → MODERATE.

**v0.4 change:** Replaced the hard-coded Nigrini MAD-to-p mapping at N > 10K (pMAD = 0.0001 if MAD > 0.015, etc.) with subsample simulation. Drawing from n=10,000 instead of the full N is conservative (simulated MAD has more variance → p-value biases upward → fewer false positives). Nigrini's MAD conformity labels are retained for reference but do not influence flagging.

**Known false positives:** Bounded-scale data; narrow-range data;
assigned numbers. **Resolved S109 Part 2:** centered-symmetric
distributions (N(0, 1), standardised scores, residual series) previously
passed the ≥1.5 OOM gate because `|values|` spans multiple orders of
magnitude but fired HIGH spuriously — the Part 1 audit observed 100%
HIGH rate on N(0, 1) at N ≥ 1000 across 50 realisations per cell
(DS21 v2 + DS22 reproduced the pattern on real fixtures). The S109
Part 2 positivity-fraction applicability gate (Procedure step 2a)
routes centered-symmetric data to N/A rather than flagging.
LogNormal(0, 1) at equivalent N continues to pass the gate and fires
0% HIGH under H0 across the same grid, confirming the fix is
targeted rather than blanket-suppressive.

**Minimum data:** ≥100 non-zero values spanning ≥1.5 orders of magnitude.

---

### 3.3 Decimal Precision Consistency

**Source:** Novel; inspired by ORI case study observations. Trailing-zero-stripping binomial model (v0.8).

**Procedure (v0.8):**
1. Count the number of decimal places for each non-integer value. If only one distinct precision level exists, return LOW (no stripping evidence — all values recorded at the same precision).
2. maxDP = maximum observed decimal places across all values.
3. **Trailing-zero-stripping null model.** If an instrument records at true precision K decimal places, trailing-zero stripping (as Excel and CSV exports perform) produces apparent precision j < K with probability: P(apparent = j) = (1/10)^(K−j) × (9/10). This assumes uniform distribution of the true last digit, which holds for measurement data recorded to fixed precision.
4. For each intermediate level j = 1 to maxDP − 1: compute the expected proportion under the trailing-zero model, then run a one-tailed binomial deficit test: P(X ≤ observed_count | n, expected_p). A deficit at an intermediate level means fewer values appear at that precision than trailing-zero stripping predicts — evidence of mixed-source or manually edited data.
5. BH-FDR correction across all tested intermediate levels.
6. primaryP = minimum BH-adjusted p across levels.

**Flag:** BH-adjusted p < 0.001 → HIGH, p < 0.01 → MODERATE. Standard `flagFromP`.

**Design evolution (v0.4 → v0.8):** The original v0.4 procedure counted "gaps" (intermediate dp levels completely absent between min and max observed dp) and used a qualitative threshold: gapCount ≥ 2 → HIGH, gapCount ≥ 1 → MODERATE. This was the only test in the tool without a formal null distribution. The v0.8 binomial model provides a proper Tier 1 p-value: for a dataset with 755 values at 3dp max and zero values at 2dp, the binomial test gives p ≈ 10⁻³¹. The model also detects *partial* deficits (some values at an intermediate level, but fewer than expected), which the gap-count heuristic missed entirely.

**Forensic value:** A dataset recorded by a single instrument at consistent settings shows one dominant precision level, with lower-precision values appearing at rates predicted by trailing-zero stripping. Deviation from this pattern — gaps, partial deficits, or bimodal precision distributions — indicates values from different sources, manual editing, or post-hoc rounding.

**Known false positives:** Data that has been intentionally rounded to different precision levels for different variables; data from instruments that change recording precision mid-run (e.g. auto-ranging).

**Minimum data:** ≥30 values with decimal components.

---

### 3.4 Benford's Second Digit

**Source:** Nigrini (2012), ibid. Hill, T.P. (1995). A statistical derivation of the significant-digit law. *Statistical Science*, 10(4), 354–363.

**Procedure (v0.5):**
1. Extract the second significant digit from each value (e.g. 3.47 → 4, 0.0256 → 5).
2. Expected distribution: P(d₂ = k) = Σ_{d₁=1}^{9} log₁₀(1 + 1/(10d₁ + k)) for k = 0, 1, ..., 9.
3. χ² goodness-of-fit test against the expected distribution.
4. Require values spanning ≥1.5 orders of magnitude (same as first-digit Benford).
5. Subsample simulation for MAD p-value (same approach as first-digit).

**Flag:** Simulation pMAD < 0.001 → HIGH, pMAD < 0.01 → MODERATE.

**Effect-size gate:** Nigrini MAD ≥ 0.008 (second-digit threshold, less strict than first-digit 0.015).

**Integer skip (fix 118):** Count values naturally concentrate second digits at 0 (e.g. 10, 20, 100, 200). This is an intrinsic property of integer distributions, not a fabrication signal.

**Forensic value:** Catches subtler digit manipulation than first-digit analysis. Fabricators who know about Benford's Law may correct first digits but neglect second digits. In DS10, the planted second-digit avoidance of 0 (8.3% observed vs 12.0% expected) is detected as HIGH.

**Known false positives:** Same as first-digit Benford (bounded-scale data, narrow-range data).

**Minimum data:** ≥100 non-zero values spanning ≥1.5 orders of magnitude; non-integer data.

---

### 3.5 Value-Frequency Spike Detection

**Source:** Novel. Designed to detect keyboard-entry fabrication patterns observed in Pruitt spider personality data, where specific integer values (particularly those corresponding to adjacent numpad keys) appear at frequencies far exceeding their local neighbourhood.

**Procedure (v0.6, fixes 162, 162b, 162c):**
1. **Applicability gate:** Require >80% integer values, ≥20 distinct values, ≥100 total observations, value span ≤10,000.
2. **Frequency histogram:** Count occurrences of each integer value in the dataset.
3. **Local smoothed expectation:** For each value v, compute the leave-one-out smoothed expected frequency from ±3 neighbours (±5 for value spans >200). The leave-one-out design prevents the spike itself from inflating its own expected frequency.
4. **Sparse-region filter (fix 162b):** Values with smoothed expectation <0.5 AND observed count <3 are skipped (insufficient local context). Values with observed count ≥3 are always tested regardless of background level — this preserves sensitivity to spikes against near-zero backgrounds.
5. **Poisson survival test:** P(X ≥ observed | λ = max(smoothed, 0.1)) for each value. Lambda floored at 0.1 for Poisson stability.
6. **BH-FDR correction** across all tested values.
7. **Spike identification:** A value is a spike if BH-adjusted p < 0.01 AND observed/expected ratio ≥ 2.0.
8. **Keyboard pattern detection:** Checks for adjacent numpad diagonal values (12, 23, 34, 45, 56, 67, 78, 89) among detected spikes.

**Flag rules:**
- ≥3 spikes with any at p < 0.001 → HIGH
- ≥3 spikes at p < 0.01 → MODERATE
- ≥2 spikes with p < 0.001 → MODERATE
- 1 spike at p < 0.001 AND ratio ≥ 5.0× → MODERATE (fix 162c: a sharp point spike at extreme ratio against zero neighbours is not a natural process — natural distribution modes are broad, with adjacent values also elevated)

**On Pruitt raw data:** Value 67 observed 8 times, smoothed expectation 0.8, ratio 10.0×, BH-adjusted P = 0.000136 → MODERATE. Both neighbours (66, 68) at zero — classic keyboard-entry spike pattern.

**Forensic value:** Human data entry produces characteristic value-frequency spikes that machine-generated or instrument-recorded data does not. When a fabricator types values manually, motor habits and cognitive biases produce non-smooth frequency distributions — specific "comfortable" values appear at rates far exceeding their local context. The leave-one-out smoothing and Poisson null provide a principled test of whether individual value frequencies are consistent with a smooth underlying distribution.

**Known limitation:** At small sample sizes, individual numpad diagonal values may not individually reach significance — the keyboard pattern detection requires multiple spikes to be detected. The test is most powerful on datasets with hundreds to thousands of integer observations.

**Minimum data:** >80% integer, ≥20 distinct values, ≥100 observations, span ≤10,000.

**Dual-pass extension (v0.7, S114):** Section 3.5 above describes pass 1
(integer whole-value spikes on the 80%-integer gate). Pass 2 extends
detection to **fractional-digit substrings** — catches fabrication
patterns that copy fractional templates while varying the integer
portion (e.g. `1.234` and `5.234` share substring `234`; `0.81` and
`3.81` share `.81`). Pass 1 misses this class because whole-value
histograms see distinct values.

**Procedure (pass 2):**
1. **Applicability gate:** Require ≥50% of non-null cells to carry a
   fractional part. Columns below threshold route to pass-2 N/A.
2. **Substring extraction:** For each non-null fractional cell, extract
   the fractional-digit substring (e.g. `1.234` → `234`; `5.07` → `07`).
   Leading zeros preserved via `rawMatrix` routing — same mechanism
   Decimal Precision uses.
3. **Per-length bucketing:** Group substrings by length. Each bucket
   tested independently against its own uniform-alphabet null. Keeps
   2-digit and 4-digit substrings from pooling into an ill-defined
   combined alphabet.
4. **Poisson survival + local smoothing:** Same as pass 1 — Poisson tail
   P(X ≥ observed | λ = smoothed local expectation) per substring.
5. **Union BH-FDR:** Pass-1 and pass-2 tested entries combined into a
   single BH-FDR correction, with pass tag preserved on each entry.
6. **Pass-2 multi-spike gate:** Among pass-2 entries clearing adj-p 
   0.01 and ratio ≥ 2.0, require **≥ 2** before admitting pass 2 to MOD
   or HIGH tier. Single-spike pass-2 results cap at LOW (informational).
   Rationale: the Track E (c) threat model is template copying that
   reuses fractional patterns across multiple varying integers, which
   by construction produces multiple co-occurring substring over-
   representations. Single-substring over-representation on honest data
   at large-N × small-alphabet regimes (e.g. 2-decimal data with
   100-key alphabet) is uniform-null upper-tail noise, not fabrication
   signature.
7. **Final tier:** `max(pass-1 tier, pass-2 capped tier)`. Passes
   contribute independently.

**Flag rules unchanged** for pass 1. Pass 2 flag rules mirror pass 1
(≥3 spikes with any at p < 0.001 → HIGH; ≥3 spikes at p < 0.01 → MOD;
≥2 spikes with p < 0.001 → MOD) subject to the ≥2-spike gate above.

**DS12a calibration precedent (S114 Phase 1):** Clean log-normal
mixture at 2-decimal precision (N=2400, 100-key length-2 alphabet).
Single pass-2 spike at `.81` (obs=36, smoothed exp=17.2, ratio 2.10×,
adj-p=0.0049) survives the ratio≥2 floor but is uniform-null tail noise
(observed 2.4σ above uniform-mean at λ=24). Without the multi-spike
gate, this scored MOD and lifted DS12a severity 0 → 1 (false positive).
With the gate, it caps at LOW (informational) and severity returns to
0. Rule chosen over tighter ratio gate / tighter α because it directly
matches the alternative hypothesis pass 2 is designed to detect
(multi-substring co-occurrence from template copying), and mirrors pass
1's existing ≥2-spike MOD rule.

**DS04 novel-detection precedent (S114 Phase 2):** qPCR fabrication,
all non-integer — pre-S114 VFS returned N/A (80% integer gate failed).
Pass 2 surfaces 3 fractional-substring spikes: `.96` ratio 8.0×
adj-p=0.001; `.91` ratio 7.0× adj-p=0.004; `.56` ratio 7.2× adj-p=0.007.
Multi-spike gate cleared at n=3; tier MOD. Demonstrates class of
continuous-assay fixtures (qpcr / densitometry / elisa / proteomics)
where pass 1 was structurally unavailable and pass 2 is now the
detection entry point. DS04 severity 3 was already carried by other
drivers — no severity delta — but VFS now convergently attributes a
digit-template signature to this fixture.

**Known limitation — pass-2 baseline model:** Pass-2 smoothed-neighbour
baseline is inherited from pass 1, where value-ordering carries
physical smoothness (adjacent integers share realistic rates). Pass 2
operates on digit-substring alphabet keys where alphabetic/numeric
adjacency has no physical meaning — `.81`'s rate has no reason to
resemble `.80`'s. The correct null is uniform over the alphabet (N/m).
The multi-spike gate neutralises the FP mode this creates at single-
spike uniform tails, but a future v1.1 re-spec would replace the
smoothed-neighbour baseline with uniform-alphabet baseline for pass 2
specifically. Parked — see STATUS parked #20.

---

### 3.6 Shannon Entropy Analysis

**Source:** Novel. Tests whether the number of distinct values in each column is consistent with the expected entropy of the column's generating distribution. Addresses the deferred v0.5 Zipf/value-frequency test, whose within-column permutation null was degenerate (shuffling within a column preserves identical value frequencies, producing zero variation in the test statistic).

**Procedure (v0.8, S10):**
1. **Applicability gate:** Skip ordinal data type entirely (→ N/A). Skip count data entirely (→ N/A). Require ≥20 observations per column.
     - **Why count is N/A.** A count column pools many per-row units — in genomics, thousands of genes, each ~Negative Binomial with means spanning orders of magnitude — so the column marginal is a *mixture* of NBs, not itself any single family. Marginal goodness-of-fit (and the value-frequency and modality variants) therefore test the wrong aggregation unit: there is no valid single-family null. The NB structure that *is* testable lives per gene and is interrogated via the mean-variance law (§4.1 Mean-Variance Relationship, expected slope β≈2 for genomics) and via the predicted-σ normalisation of replicate differences (§2.2 Excess Kurtosis, which cancels the per-gene mean and so is mixture-robust). Count distribution-shape forensics is carried by those channels; this trio is N/A on count for the same reason it is N/A on ordinal — the instrument does not apply to the data type. (S180 Finding 2; empirical basis: DS11 per-condition marginals fit no single NB — two conditions lighter, one ≈3× heavier than the MoM-NB kurtosis prediction.)
     - **Per-condition dispatch (S179):** on multi-condition row-grouped data (`condCtx.rowGroups()` non-null — ≥2 groups each ≥3 rows), the test is dispatched per condition via `aggregatePerGroup`, fitting the parametric model within each condition slice rather than on the pooled mixture; a pooled fit conflates between-condition mean shifts with the within-condition value-frequency concentration that is the forensic target. Single-condition / no-row-group / column-grouped data uses the pooled full-matrix path. The ≥20-obs floor applies per slice — slices below it return N/A (accepted coverage loss on small multi-condition fixtures, S127 reasoning).
2. **Shannon entropy:** For each DATA column, compute H = −Σ pᵥ log₂(pᵥ), where pᵥ = count(v) / N for each distinct value v.
3. **Modal precision detection:** Determine the modal decimal precision of the column using the existing `decimalPrecision.js` infrastructure.
4. **Parametric model fit:** Moment-match a generative model to the column:
   - Continuous data: Normal(μ̂, σ̂).
   - Count data with variance/mean ≤ 1.5: Poisson(λ̂ = mean).
   - Count data with variance/mean > 1.5: Negative Binomial, moment-matched (r̂ = μ̂² / (σ̂² − μ̂), p̂ = μ̂ / σ̂²).
   - The parametric model is fit on raw recorded values at the modal decimal precision. Entropy does not consume VST'd input (reconfirmed S111) — the forensic target (hand-typed fabrication reusing favourite values) is a raw-scale concentration anomaly that VST would obscure by altering the decimal-precision grid.
5. **Bootstrap null (B = 999):** For each iteration:
   a. Generate N values from the fitted model.
   b. Discretise to the modal precision: `round(x × 10ᵖ) / 10ᵖ`. For count models, round to integer and clamp ≥ 0.
   c. Compute Shannon entropy of the synthetic column.
6. **Two-sided p-values:**
   - p_low = (1 + #{H_null ≤ H_obs}) / (1 + B) — "too few distinct values" (hand-typed, copy-paste).
   - p_high = (1 + #{H_null ≥ H_obs}) / (1 + B) — "too uniform" (RNG padding).
   - Column p = min(p_low, p_high) × 2, capped at 1.0.
   - Direction recorded: 'low' if p_low < p_high, else 'high'.
7. **BH-FDR correction** across all DATA columns.
8. **Effect-size gate:** The entropy ratio (H_obs / median(H_null)) must deviate ≥15% from 1.0 (i.e., ratio ≤ 0.85 or ≥ 1.15) for a flag above LOW. See Tier 2 documentation below.
9. **Test-level result:** primaryP = minimum BH-adjusted p across columns. Flag determined by standard α thresholds (HIGH at p < 0.001, MODERATE at p < 0.01) subject to the effect-size gate.

**Why parametric bootstrap, not permutation:** The test asks "does this column have the expected number of distinct values given its distribution?" Permutation within a column preserves the exact value frequencies, making the null degenerate — every permutation yields identical entropy. The parametric bootstrap generates fresh samples from a fitted distribution, providing a proper reference distribution for entropy. On continuous data — the only data type this test now runs on (count → N/A at dispatch; see applicability gate) — the Normal model is a moment-matched approximation, not a physical model, and the effect-size gate (Tier 2) compensates for the resulting model misspecification.

**Known limitations:**
- The Normal model for continuous data is a moment-matched approximation. Skewed, heavy-tailed, or multimodal distributions produce systematically different entropy from Normal, causing marginal p-values even on clean data. The 15% ratio gate suppresses these false positives but reduces sensitivity to subtle fabrication (ratios between 0.85–1.15 are undetectable).
- Precision detection uses modal precision. Columns with mixed precision (e.g., some values at 1dp, others at 3dp) may produce bootstrap nulls with incorrect discretisation.
- At small N (20–50), the bootstrap distribution of entropy has high variance, reducing power.

**Forensic value:** Hand-typed fabricated data tends to reuse favourite values, producing fewer distinct values than expected (low entropy). Conversely, RNG-padded data with overly uniform spacing produces more distinct values than instrument-recorded data (high entropy). The test complements Value-Frequency Spike Detection (§3.5), which catches individual point spikes, by assessing the overall distributional shape of value frequencies.

**Minimum data:** ≥20 observations per column, continuous data type (count → N/A; see applicability gate).

### 3.7 Column Goodness-of-Fit (v1.0, S106 spec)

**Source:** Novel; complementary to §3.6 Shannon Entropy Analysis. Tests whether the CDF shape of each DATA column matches its fitted parametric family, where §3.6 tests whether the value-frequency concentration matches. These are independent targets — a column can have the correct number of distinct values but the wrong shape, or vice versa.

**Procedure (v1.0, S106):**

1. **Applicability gate:** Skip ordinal data type entirely (→ N/A). Skip count data entirely (→ N/A — see §3.6 applicability gate: count column marginals are mixtures of per-unit NBs, not any single family, so the single-family AD null is misspecified; per-gene NB structure is carried by §4.1 Mean-Variance and §2.2 Excess Kurtosis). Require ≥30 observations per column. Require ≥10 distinct values (AD is degenerate at low cardinality).
     - **Per-condition dispatch (S179):** on multi-condition row-grouped data (`condCtx.rowGroups()` non-null), the test routes per condition via `aggregatePerGroup`, so the family fit, γ-pre-skip, and AD² refit-bootstrap all operate within each condition slice. A pooled fit on a multi-condition mixture can sit above the γ₂ floor while being materially bowed/bimodal, calibrating AD² against the wrong family; per-condition routing fits the shape each condition actually has. Single-condition / no-row-group / column-grouped data uses the pooled full-matrix path. The ≥30-obs / ≥10-distinct floors apply per slice (accepted coverage loss on small fixtures, S127 reasoning).
2. **Column-level family routing** (inherited from §3.6 step 4, with one extension):
   - Count data (dp = 0, integer): Poisson if var/mean ≤ 1.5, Negative Binomial otherwise — moment-matched as in §3.6.
   - Continuous data: Normal(μ̂, σ̂) — moment-matched.
- **Non-supported-family pre-skip (N-adaptive γ₂ hybrid, S107 calibration).** Compute sample skewness γ₁ = m₃ / m₂^(3/2) and excess kurtosis γ₂ = m₄ / m₂² − 3 on continuous columns. Route the column to per-column N/A if any of: |γ₁| > 1.5 (log-normal-like; CV = 0.5 → γ₁ ≈ 1.75); γ₂ < −1.2 (uniform-flatter, anchored to the uniform distribution γ₂ = −1.2); or γ₂ < −0.8 AND N ≥ 100 (strict gate at precise-γ₂ regime — catches Beta(2,2) at γ₂ ≈ −0.86). The N-adaptive γ₂ clause admits small-N continuous columns near the uniform anchor (γ₂ ∈ [−1.2, −0.8]) because sample kurtosis SE ≈ √(24/N) ≈ 0.69 at N = 50 makes the tight gate unreliable; S107 calibration confirmed all such admitted clean columns produce subcritical AD ratios. v1.1 planned extension to {LogNormal, Uniform, Gamma}.
3. **Anderson–Darling statistic:** For each applicable column, compute the classical AD² statistic against the fitted CDF F̂:
   `A² = −N − (1/N) · Σᵢ (2i − 1) · [ln F̂(x₍ᵢ₎) + ln(1 − F̂(x₍ₙ₊₁₋ᵢ₎))]`
   where x₍ᵢ₎ are sorted column values. Clip F̂ to [10⁻⁶, 1 − 10⁻⁶] to guard against log-of-zero on extreme-tail points.
4. **Parametric bootstrap null with refit (B = 999).** For each iteration:
   a. Generate N values from the fitted family at the empirical parameters.
   b. Discretise to the column's modal decimal precision (reusing `decimalPrecision.js` per §3.6 step 3).
   c. **Refit family parameters on the bootstrap sample** and compute A² against the refit CDF. Refit is essential — bootstrapping under fixed parameters ignores the estimation uncertainty that inflates AD's null quantiles.
5. **Two-sided p-values:**
   - p_high = (1 + #{A²_null ≥ A²_obs}) / (1 + B) — "shape mismatch" (hand-typed values, truncated or clipped distribution, copy-paste from a different-shape source).
   - p_low = (1 + #{A²_null ≤ A²_obs}) / (1 + B) — "too-tight fit" (RNG padding from the exact fitted family).
   - Column p = min(p_low, p_high) × 2, capped at 1.0.
   - Direction recorded: `'high'` if p_high ≤ p_low, else `'low'`.
6. **BH-FDR correction** across DATA columns that ran (N/A columns excluded from the denominator).
7. **Effect-size gate (Tier 2):** ratio = A²_obs / median(A²_null). For flag above LOW, ratio ≥ 2.0 (shape mismatch direction) or ratio ≤ 0.5 (too-tight fit direction). Parallels §3.6 Shannon's ratio-gate convention adapted to AD's positive-only support.
8. **Test-level result:** primaryP = minimum BH-adjusted p across applicable columns. Flag determined by standard α thresholds (HIGH at p < 0.001, MODERATE at p < 0.01) subject to the effect-size gate. Category mapping: `shapes`.

**Why parametric bootstrap with refit.** AD's classical critical values assume family parameters are known. When parameters are empirically estimated from the same data being tested, AD's null distribution is systematically compressed — quantiles shrink because the fit is trained to minimise discrepancy. Ignoring this produces anti-conservative p-values. Refit bootstrap (estimate-from-each-sample) recovers the correct null quantiles for the moment-matched estimator actually used, and is more robust than analytical correction tables, which exist only for specific family–estimator pairs.

**Known limitations:**
- v1.0 covers {Normal, Poisson, NB} only. Columns with |γ₁| > 1.5 or γ₂ < −0.8 route to per-column N/A rather than false-flagging against a misspecified family. LogNormal (common in biology), Uniform, and Gamma are planned for v1.1; until then, coverage on biological replicate columns is partial.
- The γ₁/γ₂ pre-skip uses sample moments, which are themselves noisy at small N. The 30-observation floor is tight for this pre-check — columns with true |γ₁| near 1.5 may route inconsistently across different realisations of the same generating process. S107 DS10 col5 surfaced this empirically: γ₁ = 1.497 narrowly admitted a fabricated log-normal-like column which then flagged at AD ratio 105×. Correct detection outcome; the cross-realisation stability is the warning.
- Heavy-tailed Normal-family columns (γ₂ > 3, e.g. t-distributed measurement noise) will generate marginal raw p under a Normal fit. The effect-size gate (Tier 2) is load-bearing here. v1.1 may add a t-family option.
- Refit bootstrap adds a factor-B moment-matching cost per column. At B = 999 with two-moment estimators this is cheap; it is the dominant per-test cost on wide datasets (>50 DATA columns) but remains acceptable at current batch sizes.
- **S108 positive-exercise evidence (batch, complementary to §3.8 gate-hole).** DS20 v2 exercises §3.7 positively on 70/30 asymmetric Gaussian mixtures at between-component separations 2.5–4.5 SD (N = 300 per column). At landing, cols 4–7 (seps 2.5–4.0) flag MODERATE at AD ratios 5.3–23.5× against moment-matched Normal fit; col 8 (sep = 4.5) is correctly γ₂-skipped at γ₂ = −0.84. Primary p 0.0047 on the group. DS20 v2 is the first purpose-built positive calibration gradient for §3.7 and confirms the v1.0 N = 300 gate is well-positioned for the 2.5–4.0 SD asymmetric-bimodal regime. Combined with DS19 (inheritance at N = 1200, ratio 5.01) and DS10 col5 (proteomics block-copy, ratio 105×), §3.7 now has positive-forensic evidence across three distinct fabrication mechanisms.

**Forensic value:** Hand-typed fabricated data preserves rough mean and variance but typically misses the tail shape of the claimed family — either too short (no extreme values) or too long (anchoring on memorable values). Copy-paste from a different-shape source produces systematic CDF deviations that §3.6 misses when distinct-value counts happen to align. RNG padding produces AD near the bootstrap median — "too-good" fits are as forensic as poor fits, and the two-sided gate captures both.

**Minimum data:** ≥30 observations per column, continuous data type (count → N/A; see applicability gate), ≥10 distinct values, |γ₁| ≤ 1.5, γ₂ ≥ −1.2 universal; γ₂ ≥ −0.8 additionally required at N ≥ 100.

---

### 3.8 Modality Test (v1.0, S106 spec)

**Source:** Hartigan & Hartigan (1985), *The Dip Test of Unimodality*, Annals of Statistics 13(1). Tests whether each DATA column's empirical distribution is unimodal against a multimodal alternative. Distinct forensic target from §3.6 and §3.7: a column may pass §3.6 (correct distinct-value count) and §3.7 (correct CDF shape-class) and still be bimodal — e.g. a condition fabricated as a mixture of two sources with different central tendencies.

**Procedure (v1.0, S106):**

1. **Applicability gate:** Skip ordinal data type (→ N/A). Skip count data (→ N/A — see §3.6 applicability gate: count marginals are mixtures with no single-family null; discrete count support is also incompatible with the dip-statistic's unimodal-continuous null). Require ≥50 observations per column (Hartigan dip is low-power below this floor). Require ≥15 distinct values (dip is not meaningful on sparse discrete support). Apply the γ₂ hybrid pre-skip from §3.7 step 2 (γ₂ < −1.2 universal; γ₂ < −0.8 at N ≥ 100) — near-uniform columns produce meaningless adj-p ≈ 1 against a uniform-reference null. **Do not apply §3.7's |γ₁| > 1.5 pre-skip:** the uniform-reference null is family-agnostic by design, so log-normal-like columns are legitimate Modality inputs (a log-normal with a secondary mode remains a valid forensic target).
     - **Per-condition dispatch (S179):** on multi-condition row-grouped data (`condCtx.rowGroups()` non-null), the dip is computed per condition via `aggregatePerGroup` — the strongest case of the three for stratification. A pooled column mixing two within-condition unimodal distributions with distinct means produces a bimodal ECDF, so the pooled dip fires on the between-condition mean difference rather than within-condition bimodality (the actual forensic target — mixture-of-sources fabrication inside one declared condition). The contamination is at the statistic level, not the null calibration. Single-condition / no-row-group / column-grouped data uses the pooled full-matrix path. The ≥50-obs / ≥15-distinct floors apply per slice (highest of the three; small multi-condition fixtures will frequently N/A every slice — accepted, S127 reasoning).
2. **Dip statistic:** For each applicable column, compute Hartigan's dip statistic D_N — the supremum distance between the empirical CDF and the closest unimodal CDF, via the greatest-convex-minorant / least-concave-majorant construction. Use the O(N log N) implementation (Hartigan 1985 dip algorithm; standard implementations available in R `diptest` and Python `diptest`).
3. **Uniform-reference bootstrap null (B = 999).** For each iteration, draw N i.i.d. Uniform(min(x), max(x)) samples and compute D_N on the synthetic sample. The uniform distribution is the unimodal ceiling — its dip is the supremum over all unimodal distributions with the same sample size — so p against uniform rules out all unimodal alternatives.
4. **One-sided p-value:**
   - p = (1 + #{D_null ≥ D_obs}) / (1 + B). Only the upper tail is forensic — multimodality is the target; unimodality is the null.
5. **BH-FDR correction** across DATA columns that ran.
6. **Effect-size gate (Tier 2):** raw dip magnitude ≥ 0.04 for any flag above LOW. Dips below 0.04 are within the range produced by mildly asymmetric unimodal distributions (Hartigan 1985 empirical tables). A dip of 0.04 corresponds roughly to a bimodal mixture with equal weights and ≈1 SD separation — the weakest pattern with forensic value.
7. **Test-level result:** primaryP = minimum BH-adjusted p across applicable columns. Flag determined by standard α thresholds subject to the effect-size gate. Category mapping: `shapes`.

**Why uniform-reference, not best-unimodal-fit.** Two alternative nulls exist:
- *Uniform reference (adopted):* bootstrap dips from Uniform(min, max). Maximally conservative — uniform attains the largest dip among unimodals — so observed-exceeds-uniform-dip rules out any unimodal.
- *Best-fit-unimodal:* fit Normal (or the §3.7 family) and bootstrap from that. Higher power on Gaussian-like generating processes but sensitive to fit quality, which reintroduces §3.7's model-misspecification problem.

Forensics prefers the conservative choice. Real biological columns are rarely uniform, so clean data's observed dip sits well below the uniform bootstrap null (low false-positive rate). Fabricated mixtures with forensically meaningful separation produce dips that exceed even the uniform ceiling.

**Known limitations:**
- Power is low below N ≈ 100 even above the 50-observation floor. Batch fixtures at N = 80 per condition (e.g. DS15) exercise the test at the edge of its power envelope; expect low-flag-rate on genuinely-bimodal fabrications at that N.
- Dip is insensitive to balanced higher-multimodal patterns — dip magnitude peaks at bimodal and declines as mass subdivides across additional well-separated modes. v1.0 accepts this; v1.1 may add Silverman's critical-bandwidth test for higher-modality detection.
- Plate / batch effects in real biology can produce apparent bimodality (two plates with different calibration offsets). v1.0 does not distinguish these from fabrication. The Column Relationship Gate narrows to legitimate replicate columns upstream, which partially mitigates.
- Uniform-reference null is maximally conservative by design. Weak bimodal fabrications below ≈1 SD separation are systematically missed, and "shared-bases" fabrications (values repeated across modes rather than clustered within modes — e.g. DS12b's uniform-mixture fabrication where a small base set is sampled with replacement across both conditions) do not produce within-column multimodality and are not the forensic target of this test. The forensic value of the test is exclusive — patterns that specifically flag Modality and nowhere else are a strong mixture-fabrication fingerprint — at the cost of coverage breadth.
- S107 batch calibration: zero positive signal across the 19-fixture validation suite. The test is forward-looking — it catches real-world block-copy patterns where two distinct source distributions fuse into one declared condition (Pruitt-style patterns; some Gino block-copy patterns). The analytic surface is retained for case-study analysis. A v1.1 purpose-built bimodal-fab fixture (two components separated by ≥1 SD at N ≥ 100) is planned to exercise Modality positively.
- **S108 gate-hole finding (structural).** The γ₂ hybrid pre-skip and DIP_GATE = 0.04 are in mutual exclusion at N = 300 on Gaussian mixtures. S108 Phase 1 diagnostic tabled the gate boundaries for 50/50 symmetric N(±sep/2, 1) mixtures: mean dip clears 0.04 only at sep ≥ 4.0, but γ₂ drops below −0.8 at sep ≥ 3.0. No separation at N = 300 clears both gates simultaneously for symmetric mixtures. DS20 v2 attempted 70/30 asymmetric to break the γ₂ lock-out (γ₂ range for cols 4–7 at seps 2.5–4.0 was −0.40 to −0.79, all applicable) — asymmetric mixtures have shallower dips than 50/50 at matched separation, so the dip gate remains unreached (max dip 0.0207 at sep = 4.0 asymmetric). The practical Modality gate at N = 300 is structurally unreachable on Gaussian-family fabrications; exercising the test positively at v1.0 requires either (a) N ≥ ≈1500 per column to shift the dip distribution upward, (b) Student-t or skewed-component mixtures to raise γ₂, or (c) gate recalibration. The calibration table and diagnostic are preserved in the S108 session summary for the v1.1 methodology audit.

**Forensic value:** Bimodality is a strong fingerprint of mixture fabrication — a fabricator combining two sources (two actual experiments, two synthesis runs, two copy-paste origins) into one declared condition. Where §3.6 and §3.7 probe how a single-distribution claim matches the data, §3.8 probes whether the single-distribution claim itself is valid. Patterns that specifically flag here and nowhere else: copy-paste from two sources within one condition; shift-and-merge of a legitimate condition with a biased subset; blocks of near-constant values interleaved with real data.

**Minimum data:** ≥50 observations per column, ≥15 distinct values, continuous data type (count → N/A; see applicability gate).

---

## 4. Instrument-Aware Noise Modelling

### 4.1 Mean-Variance Relationship

**Source:** General assay validation methodology; Carlisle (2017) discusses expected variance properties.

**Count distribution-shape role.** This is the channel that carries distribution-shape forensics on count data: the marginal-shape trio (§3.6 / §3.7 / §3.8) is N/A on count (mixture marginals), so the per-gene mean-variance law (expected β≈2 for genomics) is the count distribution-shape instrument (S180).

**Procedure (v0.4):**
1. Compute mean and variance of replicates within each row.
2. Require ≥5 rows with ≥3 valid replicates. Require ≥1.0 orders of magnitude span in row means (except when expected slope = 0, where range is irrelevant).
3. Fit log-log regression: log(variance) = β × log(mean) + α. Compute regression SE for β̂.
4. **Block-robust SE (fix 95):** Split rows into up to 10 non-overlapping blocks sorted by mean. Fit slope in each block. Compute blockSE = SD(block slopes) / √(nBlocks). Use SE = max(regressionSE, blockSE).
5. For named assays: z = (β̂ − β₀) / SE, two-sided p-value. For general assay: test whether slope falls significantly outside [0, 2].

**Expected slopes by assay:**

| Assay | Expected β | Noise model |
|-------|-----------|-------------|
| qPCR | 0 | Additive (Ct scale) |
| Physiological | 0 | Additive |
| Cell count | 1 | Poisson |
| Plate reader | 1 | Poisson at low, proportional at high |
| Densitometry | 2 | Proportional (CV constant) |
| ELISA | 2 | Log-normal |
| Genomics | 2 | Negative binomial (overdispersed Poisson) |

**Flag:** p < 0.001 → HIGH, p < 0.01 → MODERATE.

**Why block-robust SE.** The regression SE assumes the log-log model is perfectly linear. Real data is non-linear — RNA-seq has Poisson scaling (slope ≈ 1) at low expression and NB scaling (slope ≈ 2) at high expression. At large N, regression SE shrinks to ~0.005, making any deviation from the point expected slope astronomically significant, even when the observed slope (e.g. 1.72) is well within biological variation. The block-SE captures model non-linearity — if slopes genuinely vary across expression ranges, blockSE >> regressionSE, preventing overpowering. If the model is truly linear (fabricated data with uniformly wrong noise model), block slopes agree and blockSE ≈ regressionSE, preserving sensitivity.

**Known false positives:** Ungrouped multi-sample data where columns are not true replicates (addressed by column structure advisory).

**Minimum data:** ≥3 replicate columns, ≥5 rows, ≥1.0 orders of magnitude span (unless expected slope = 0).

---

### 4.2 Regional Noise Homogeneity

**Source:** Novel; extends the global Selective Noise test (§1.3) to localised detection.

**Procedure (v0.5):**
1. Fit log-log mean-variance relationship to get predicted σ per row. Fallback to per-row SD when fit unavailable.
2. Compute standardised residuals per cell: e_{i,c} = (x_{i,c} − μ_i) / σ̂(μ_i).
3. Compute global variance per column across all valid rows.
4. Sliding-window scan: for each (window × column), compute ratio of window variance to that column's global variance. Scan statistic = max ratio (two-sided) across all windows × columns.
5. **Permutation null (row-shuffle):** Preserves each column's global variance but redistributes which rows fall into each window. 4999 perms at N≤100, 499 at larger N.

**Flag:** permP < 0.001 → HIGH, permP < 0.01 → MODERATE.

**Effect-size gate (N ≥ 500):** Require variance ratio ≥ 2.0.

**Row Semantics Gate (v1.0, S118).** → N/A when `rowSemantics === 'arbitrary'`. Sliding-window column variance against global is spatially anchored — gene row ordering / long-format pivots have no spatial axis to scan. Replaces the pre-S118 ad-hoc `assay === 'genomics'` skip; genomics auto-routes to `arbitrary` at import. See §"Row Semantics Gate".

**Forensic value:** Detects column-specific localised fabrication (e.g. one replicate artificially smoothed for a stretch of rows). More powerful than global Selective Noise (§1.3) when fabrication affects a small fraction of rows, because it directly tests "is this column unusually quiet/noisy HERE vs ITSELF overall?" rather than comparing all columns globally.

**Minimum data:** ≥3 replicate columns, ≥20 rows.

---

### 4.3 Within-Row Variance Scan

**Source:** Novel. Detects rows where within-row spread across replicates is anomalous relative to the mean-variance relationship. Targets the "typed a number then added small noise to each replicate" fabrication pattern, where a fabricator generates artificially uniform replicates.

**Procedure (v0.8, Item 7b):**
1. For each row, compute within-row SD across all DATA columns.
2. Fit the mean-variance relationship using binned regression: bin rows by mean, compute median SD per bin. Interpolate to get expected SD for each row's mean.
3. Compute local dispersion per bin using MAD. Apply a floor: `Math.max(localMAD, globalMAD × 0.20)`, where globalMAD is the MAD of all row SDs. This prevents near-zero denominators from inflating z-scores in locally homogeneous bins.
4. Compute standardised residual per row: z_i = (SD_i − expected_SD(μ_i)) / dispersion_local.
5. **Directional flagging.** Only "too smooth" outliers (z < −4.0) are forensically relevant — these indicate fabricated uniformity. "Too noisy" outliers (z > +4.0) reflect natural biological heterogeneity (e.g. proteins with enormous variance in proteomics data) and are recorded for informational display but do not contribute to the flag.
6. **Count gate:** Require ≥3 "too smooth" outliers AND smooth outlier fraction > 1% of total rows. If either condition fails, return PASS.
7. **Test-level statistic:** Binomial test on the count of "too smooth" outliers against the one-tailed theoretical rate P(z < −4.0) = 3.17 × 10⁻⁵ under N(0,1).
8. **Windowed scan:** Sliding window of 15 rows (stride 5), count smooth variance outliers per window. BH-FDR across all windows. This detects regional concentration of anomalous rows.
9. **Overall flag:** More severe of global binomial and windowed scan.

**Return object:** `primaryP`, `flag`, `flaggedRows` (array of {row, z, direction} for both smooth and noisy outliers), `nSmoothOutliers` (drives flag), `nNoisyOutliers` (informational), `expectedOutliers`.

**Flag:** p < 0.001 → HIGH, p < 0.01 → MODERATE.

**Applicability gates:**
- Replicates mode only (≥3 DATA columns needed for meaningful within-row SD)
- Skip if genomics assay type (within-row = technical replicates of same gene, different semantics — biological-semantics gate, retained alongside the S118 sub-unit suppression below)
- Skip if ordinal data type (SD on ordinal scale not meaningful)
- Minimum 40 rows

**Row Semantics Gate — sub-unit suppression (v1.0, S118).** Under `rowSemantics === 'arbitrary'`, **only Step 8 (windowed scan)** is suppressed; Step 7 (global binomial on the dataset-wide smooth-outlier count) continues to run. Sliding 15-row windows over arbitrary row order have no forensic interpretation, but the dataset-wide outlier count is row-order invariant. Result object reports `subunitsSuppressed: ['windowed-scan']`. See §"Row Semantics Gate".

**Category:** Too Smooth (mechanism: fabricated).

**Forensic value:** Detects a fabrication pattern that other tests miss — when a fabricator starts from a target value and adds small noise to generate "replicates," the within-row SD is artificially low relative to what the mean-variance relationship predicts. The directional design (smooth-only) eliminates false positives from biological heterogeneity, which produces the opposite signal (too noisy).

**Known limitations:**
- The binned mean-variance regression assumes a single generating process. Heteroskedastic data with mixture distributions (multiple protein families, mixed cell types) can produce noisy fits. The MAD floor mitigates z-score inflation but does not fully resolve the fitting issue.
- **Future upgrade path (Option B):** Replace binned regression with LOESS on log-mean vs log-SD for better heteroskedasticity handling. Infrastructure exists in `loessResidual.js`. This naturally adapts to non-linear mean-variance relationships.
- Detection power is low when only a handful of rows are fabricated (the count gate requires ≥3 smooth outliers).

**Minimum data:** ≥3 replicate columns, ≥40 rows, continuous or count data type.

---

## 5. Planned Tests and Implementation Notes

### 5.1 Value-Frequency Analysis (Partial Value Reuse)

**Status:** Largely addressed. Value-Frequency Spike Detection (§3.5, fix 162) detects point spikes in integer value frequency distributions. Shannon Entropy Analysis (§3.6, S10) detects anomalous overall value-frequency concentration using a parametric bootstrap null, resolving the degenerate within-column permutation null from v0.5. The remaining gap is **scattered single-cell value reuse** in continuous data — individual decimal values (e.g. `28.44`) appearing more often than the birthday-problem bound predicts across the whole matrix, without forming row-level or column-level patterns that DupDet catches. This is a narrow gap; a fourth DupDet detection pass (global value frequency vs birthday-problem expected frequency) could address it but is low priority.

**Motivation:** The cross-row duplicate detection test (§1.1) catches cases where entire rows are repeated. A subtler fabrication pattern is **partial value reuse** — a fabricator reuses specific individual values (e.g. `28.44`) across different rows and replicates, without copying entire rows. The VFS test catches the integer case (keyboard entry); the continuous case remains unaddressed.

**⚠️ Literature note:** The birthday-problem probability calculation is standard (see e.g. Flajolet & Sedgewick, *Analytic Combinatorics*, 2009, Ch. III). However, its specific application to forensic detection of over-represented individual values in experimental data **requires proper literature references before this test is published or cited**.

---

### 5.2 Kurtosis with Predicted-σ Normalisation

**Status:** Implemented (v0.4 fix 105). See §2.2 for full procedure.

---

### 5.3 Localised Inter-Replicate Correlation

**Status:** Implemented (v0.4 fix 106; updated S45–S46). See §2.5 for windowed permutation scan.

**Summary:** Windowed scan added to the existing IRC test — compute r-excess in sliding windows per replicate pair, compare max window r-excess against row-shuffle null. Uses raw Pearson r (not winsorized) for windows — short windows need every data point. Index-based Pearson computation (fix 250) eliminates array allocations in the permutation hot path. Non-overlapping stride at N>1000 for performance.

---

### 5.4 Multiplicative Offset Detection

**Status:** Implemented (v0.8, Item 7a). See §1.2 for full procedure.

**Summary:** The Constant-Offset Blocks test now runs a dual-pass: additive (original) and multiplicative (log-space). For assays where VST applies log-transform at import, the additive pass on log-space data already implicitly detects multiplicative offsets. The explicit multiplicative pass provides coverage for raw-space analysis. The two mechanisms are complementary, not redundant.

---

### 5.5 Row-Mean Runs Test (Mean-Level Shift Detection)

**Status:** Implemented (v0.4 fix 104). See §2.4 for full procedure.

---

### 5.6 CUSUM Binary Segmentation for Dual-Boundary Detection

**Status:** One-level binary segmentation implemented (v0.8). Each segment gets its own permutation null, replacing the heuristic >30% magnitude threshold. Full recursive binary segmentation (multiple changepoints) deferred to v1.0.

**Problem:** The single-pass CUSUM in §2.7 reliably finds the primary changepoint (entry boundary) but the heuristic secondary changepoint (>30% of primary magnitude, margin-based exclusion) frequently identified a local CUSUM maximum near the primary rather than the true exit boundary.

**Implemented fix (v0.8):** After finding the primary changepoint, split the data into two segments. Run CUSUM independently on each segment with its own permutation null. Report the secondary only if its permutation p < 0.01. See §2.7 for full procedure.

**Remaining (v1.0):** Full recursive binary segmentation — after finding primary and secondary, recurse into each resulting segment to detect additional changepoints. This handles datasets with multiple fabricated regions.

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
- **Windowed Autocorrelation (§2.1b).** Per-pair BH-FDR with nWindows ≈ 18 and N_PERM = 999 floor-truncates per-pair min adj-p at ≈ 1/(N_PERM+1) × nWindows ≈ 0.01. Under H₀ group-level primaryP concentrates near 0.01–0.02 rather than uniformly on [0, 1]. Surfaced on DS16 (clean Carlisle-overbalanced, 3 groups) when per-pair BH landed in S109 Part 2 — three near-floor primaryP's Fisher-combined to HIGH before the exemption was added.
- **Blocked Mahalanobis (§2.6b).** BH-FDR across the (pass × condition) family with m = 2·nCond and B_perm ∈ {999, 4999} floor-truncates primaryP at ≈ m/(B_perm+1) = 0.0008–0.0016 under H₀. In row-grouped layouts where a single condition column spans multiple groups, the within-condition permutation pool is shared across groups, compounding the non-uniformity. Exempted at landing (S110) to pre-empt the failure mode surfaced on Windowed Autocorrelation in S109.
- **Mahalanobis Row Outlier (§2.6).** `primaryP = binomP` from the dataset-level binomial on rows exceeding χ²(p, 0.99). The χ² null assumes multivariate normality; under heavy-tailed raw data the exceedance count exceeds the binomial null even when zero rows survive Stage-2 BH-FDR at α = 0.001, so `binomP` is stochastically smaller than Uniform(0, 1) under H₀. On multi-condition row-grouped fixtures under VST=raw routing, per-group Fisher's combination of the small per-group binomP values promoted the aggregate flag LOW→HIGH while each per-group verdict correctly rested at LOW — a false positive bypassing the test's own per-row evidence requirement. Added S127c; the aggregator falls back to `worstGroupFlag` for §2.6.

**Forward-compatible rule.** Any new test with (a) internal BH-FDR over a multi-element family that feeds primaryP, (b) a shared simulation/bootstrap denominator across groups, or (c) an arithmetic floor on primaryP from finite permutation counts should be evaluated against this principle at landing time. The default is exemption; inclusion in Fisher aggregation requires an explicit argument that the test's primaryP is uniform under H₀.

The Fisher aggregation step remains in use for tests that do satisfy the uniform-null assumption (Constant-Offset, Regional Noise, Runs, etc.). The exempt list is a targeted correction, not a generalised abandonment of aggregation.

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
| Mahalanobis D² ~ χ²(p) | Individual row outliers at Bonferroni threshold; test-level binomial | Mahalanobis (1936); Penny (1996) |
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
| Column GoF: AD ratio ≥ 2.0 (shape mismatch) or ≤ 0.5 (too-tight fit) | N ≥ 30/col | 0.72–2.14 (admissible clean cols, S107) | 5.01 (DS19 col1, N=1200); 105.6 (DS10 col5) | Two-sided gate: shape-mismatch direction catches hand-typed / truncated / copy-from-different-shape; too-tight direction catches RNG padding. AD is scale-normalised to the fitted family, so a 2× ratio is a substantive deviation. S107 calibration retained the 2.0 gate; no clean admissible column exceeded 2.27. |
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
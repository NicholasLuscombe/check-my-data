# Methodology Map

**Status:** v4.8 (S180)
**Owner:** Chat
**Companion to:** `METHODOLOGY.md`

2026-05-26 (S179–S180 — Distribution-shape trio (Shannon Entropy §3.6, Column GoF §3.7, Modality §3.8) routing corrections. **A1 (S179):** trio routes per-condition via `aggregatePerGroup(condCtx.rowGroups())` with pooled fallback on multi-condition row-grouped data; DS19 trio-flag count corrected 3→1. **Finding 1 (S180, `d79cacc`):** trio added to `FISHER_EXEMPT` (exempt set 4→7) — per-group `primaryP` is floor-truncated by the B=999 bootstrap, non-uniform under H₀, so cross-group Fisher's was promoting floor-clamped MODERATE slices to spurious HIGH (DS11 χ²≈37.3; DS20 χ²=19.85); aggregator now falls back to worstGroup. **Finding 2 (S180, `16ace4e`):** trio routes to N/A on count data via `dtSkip` (`DATATYPE_SKIP.count`, joining ordinal) — a count column marginal is a mixture of per-unit NBs (RNA-seq = pooled per-gene NBs), not any single family, so the single-family-fit null is misspecified; count distribution-shape forensics is carried instead by §4.1 Mean-Variance (β≈2 genomics) and §2.2 Excess Kurtosis (replicate-difference shape, mixture-robust). DS20 GoF honest tier corrected HIGH→MODERATE per-condition (the post-A1 HIGH was the Finding-1 Fisher artifact, not un-masking). Batch 22/22, severity byte-identical throughout. See METHODOLOGY.md §3.6/§3.7/§3.8, STATUS.md, SESSION179/180-SUMMARY.)

2026-04-23 (S118 — Track H Row Semantics Gate landed. Import-stage flag `rowSemantics ∈ {ordered, arbitrary}` declares whether row index carries forensic meaning; auto-suggest at import (long-format detected → arbitrary; genomics → arbitrary; instrument assays → ordered; general/proteomics/survey → user-required). Five sequential tests N/A under `arbitrary` via the engine's `rsSkip` dispatch lane (sibling to `condSkip` and `dtSkip`): §2.3 Runs, §2.4 Row-Mean Runs, §2.6b Blocked Mahalanobis, §2.7 LOESS, §4.2 Regional Noise. Two sub-unit suppressions inside the test functions: §2.5 IRC windowed permutation scan, §4.3 Within-Row Variance windowed scan; global statistics in both tests continue to run. Three sequential tests intentionally NOT gated: §1.2 Constant-Offset (row-shuffle perm null self-handles), §2.1 Autocorrelation (Tier 2 effect-size floor `|mean r| ≥ 0.25` at N≥500 self-handles), §2.1b Windowed Autocorrelation (within-pair row-shuffle perm null self-handles) — null-construction-aware policy. DS11 (RNA-seq + AR(1) generator leakage) Autocorrelation HIGH preserved; severity 3 unchanged. Pre-S118 ad-hoc `assay === 'genomics'` skips on §2.6b/§2.7/§4.2 retired (subsumed by gate). BatchView pre-S118 SKIP-on-long-format replaced by auto-route to `arbitrary`. Module count 172 → 173 (`src/import/rowSemantics.js`). Batch 22/22. See METHODOLOGY.md §"Row Semantics Gate" + per-test row-semantics notes, STATUS.md §S118, SESSION118-SUMMARY.md.)

2026-04-22 (S114 — Track E (c) VFS digit-substring extension landed as
dual-pass architecture under the existing Repeated Digits (VFS) test
card. Pass 1 (integer whole-value spikes) unchanged; pass 2
(fractional-digit substrings, per-length bucketing, ≥50% fractional
applicability gate) adds union BH-FDR and a ≥2-spike gate admitting
pass 2 to MOD/HIGH tier only on multi-substring convergence. DS12a FP
calibration (2-decimal clean log-normal mixture, single-spike `.81` at
ratio 2.10× on uniform-null-tail noise) drove the multi-spike gate;
DS04 novel detection (qpcr fabrication, 3 pass-2 spikes at ratios
7.0–8.0× on `.96/.91/.56`) demonstrates the continuous-assay class —
pre-S114 VFS was N/A on this fixture via the 80% integer gate. Test
count unchanged at 27 (pass-2 rides the existing card). Batch 22/22.
See METHODOLOGY.md §3.5 dual-pass extension, STATUS.md §S114,
SESSION114-SUMMARY.md.)

2026-04-22 (S113 — Cross-Cond Consistency Stage 2 P5 different-direction gate migrated from fixed absolute floor (0.3) to per-pair structural SE floor `√2/√(n_rep_min × (N_row_min − 3))`, derived from the H₀ sampling distribution of |Δz| under Fisher-z with replicate-averaging (coefficient = 1, no calibration, no fixture anchor). Gate mechanism change only: P4 and P6 fixed-absolute gates unchanged. Driver (`crossConditionConsistency.js`) threads observed residual bundles to residual-kind gates and honours new `gateAlwaysEvaluates: true` property flag that bypasses the Stage 1 nMin<500 auto-pass (structural floor auto-adjusts with N, no bypass needed). DS21 v2 Control-vs-Treatment (n_rep=8, N_row=200, floor=0.036) gate-passes at |Δz|=0.141, adds convergent LOW channel at adj-p=0.012 (B=999 arithmetic-ceiling-bound); DS21 severity 3 unchanged. Derivation-principle paragraph scope narrowed to P4/P6 (see METHODOLOGY §1.9 "Minimum N per condition — derivation principle"). See STATUS.md §S113, METHODOLOGY.md §1.9 P5, SESSION113-SUMMARY.md.)

2026-04-22 (S111 — VST signed-data gate landed at `detectVST` ahead of both log and anscombe branches; `requiresPositiveDomain` predicate refuses positive-domain transforms when `negFrac ≥ 0.1` (raw with reasonCode `signedData`). Reconciled 13-TRANSFORMED / 14-RAW / 1-STRUCTURAL test-input routing table added per Phase 1 Target B against engine.js dispatch — three additions to TRANSFORMED (Constant-Offset, Residual Spike Correlation, Selective Noise; previously absent from the Chat-owned inventory) and four one-line rationales on the RAW column (IRC, Shannon Entropy, Mean-Variance P9, Within-Row Variance). See STATUS.md §S111, METHODOLOGY.md §"Signed-data gate", SESSION111-SUMMARY.md.)

2026-04-21 (S110 — Track E (a) Blocked Mahalanobis landed per METHODOLOGY §2.6b. Dim III sub-group C gains one active test. Test count 26 → 27. Fisher exempt list extended to 3 entries (Excess Kurtosis, Windowed Autocorrelation, Blocked Mahalanobis). See STATUS.md §S110 + METHODOLOGY.md §2.6b.)

---

## Purpose

This document maps Check My Data's test battery to the orthogonal fabrication dimensions each test covers. It is the reference for:

- The review paper methods section.
- UI category restructure decisions.
- Coverage and overlap audits when new tests are proposed.
- Test applicability across dataset archetypes.

It does not duplicate test procedures — see `METHODOLOGY.md` for full statistical specifications.

---

## Scope boundary

The test battery targets **fabrication signatures in raw data** — patterns left when someone copies, generates, edits, or otherwise manufactures data values rather than recording real measurements.

Detection of questionable analysis practices (p-hacking, selective reporting, HARKing) operates on reported statistics (p-values, means, effect sizes) and is explicitly out of scope. Tools like statcheck, p-curve, GRIM/SPRITE address that domain. Pure p-hacking leaves raw data untouched — the fraud is in analysis choices, not data values.

The boundary is clean: if the manipulation changes values in the dataset, our tool can potentially detect it. If the manipulation only changes which values are reported or how they are analysed, it cannot.

Out-of-scope items acknowledged (not gaps):

- **Domain impossibilities** (negative counts, impossible ranges) — domain-specific sanity checks, not statistical forensics.
- **Selective deletion** — no direct test for missing rows. Indirect coverage via distribution shifts (III, V). Hard to test without knowing what should be there.
- **Within-data temporal consistency** — timestamps within the data as a column. Dim VI covers file-level timestamps only.

---

## Framing

A **fabrication dimension** is an independent axis along which fabricated data can differ from real data, defined by the **fabrication mechanism** it detects. Two tests are on the same dimension if they detect the same kind of manipulation through different computational approaches. Two tests are on different dimensions if a fabricator could produce data that evades one but not the other.

**Scope** (global, inter-replicate, cross-condition) is an orthogonal property — it describes the comparison level, not the mechanism. The same statistic can run at different scopes, producing results in different dimensions. Scope does not override dimension assignment. Scope is determined by **what is being compared**, not what is computed along the way — a test that computes residuals from replicates but compares them across conditions is cross-condition scope, not inter-replicate.

| Scope | What's compared | Requires |
|---|---|---|
| Global | All values in the matrix, no grouping | Any matrix |
| Inter-replicate | Replicate columns within the same condition | ≥2 replicates |
| Cross-condition | Condition A vs Condition B | ≥2 conditions |

When the same statistic runs at multiple scopes, it produces **separate test cards** with separate findings. No card answers two scope questions simultaneously.

---

## The five dimensions

| # | Dimension | What fabrication mechanism does it detect? | Current tests |
|---|---|---|---|
| I | Value Repetition | Copying, pasting, or editing values — identical matches, offset copies, coordinated edits | 3 |
| II | Digit Representation | Typing or generating values that produce wrong digit-position frequencies or precision patterns | 5 |
| III | Replicate Agreement | Generating replicate noise with wrong properties — wrong shape, wrong serial structure, wrong magnitude, wrong scaling | 13 |
| IV | Cross-Group Similarity | Fabricating conditions that are too similar to (or too different from) each other | 3 |
| V | Distributional Shape | Producing column value distributions with wrong entropy, wrong fit, or wrong modality | 3 |
| *(VI)* | *File Integrity (future)* | *File metadata inconsistencies — fonts, timestamps, formulas, provenance* | *0 (7 planned)* |

**Current total: 27 tests** (S96 added Windowed Autocorrelation; S97 added Cross-Condition Consistency framework as Stage 1; S102 added Stage 2 properties; S104 added Stage 3 P9; S107 added Column GoF and Modality; S110 added Blocked Mahalanobis. Stages within the Cross-Condition Consistency framework share one test card — test count unchanged as stages land.)

---

## UI categories

Dimensions map 1:1 to UI categories. Dimension names are internal structural labels. UI category names are investigator-facing. Ordered by concreteness — most tangible evidence first, most abstract last.

| Order | UI category | Description | Dim |
|---|---|---|---|
| 1 | **Copy, Paste, Edit** | Numbers repeat where they shouldn't | I |
| 2 | **Unusual Digits** | Digit patterns don't match usual experimental measurements | II |
| 3 | **Distribution Shapes** | Data within columns don't follow expected distributions | V |
| 4 | **Cross-Replicate Comparisons** | Replicate values don't vary like usual experiments | III |
| 5 | **Cross-Group Comparisons** | Distinct experimental groups are more similar or different than usual | IV |
| — | *File Integrity (future)* | *The file itself tells a different story than the data* | *VI* |

Note: dimension order (I–V) and UI display order differ. UI order follows investigator workflow — lead with concrete evidence (copies, digits), then distributions, then statistical comparisons requiring experimental structure.

---

## Sub-mechanisms and coverage per dimension

Coverage is assessed by **sub-mechanism** — the specific forensic signature the test targets — not by test count. Uneven test counts across dimensions reflect uneven sub-mechanism diversity.

### Dim I — Value Repetition

| Sub-mechanism | Test | Scope |
|---|---|---|
| Cell-level collision | Duplicated Data — Test 1 (HHI binomial) | Global |
| Identical rows | Duplicated Data — Test 2 (row-hash) | Global |
| Within-row column pairs | Duplicated Data — Test 3 (row-binned frequency overlap) | Global |
| Block copy (row-to-row, column-segment) | Duplicated Data — Test 4 (3 detection passes) | Global |
| Additive offset copies | Duplicated and Offset — additive pass | All pairs (inter-replicate + cross-condition) |
| Multiplicative offset copies | Duplicated and Offset — multiplicative pass | All pairs |
| Coordinated editing across groups | Correlated Residuals (RSC) | Cross-condition |

RSC detects "same rows edited across multiple groups." The fabrication mechanism is editing — the cross-condition scope doesn't make it a Dim IV test. It requires replicate data internally to compute residuals, but the forensic finding is about cross-condition coordination.

DupDet's 4 sub-tests cover 4 distinct geometric patterns (scattered cells, full rows, column-pair rates, contiguous blocks) with matched nulls. Block copy does not subsume the others — each has a different shape and a different null. Test 2's gate on Test 1 is architecturally justified (row identity is a direct consequence of cell concentration). Tests 3 and 4 do not need equivalent gates — their nulls already account for concentration.

Status: **complete.**

### Dim II — Digit Representation

| Sub-mechanism | Test | Scope |
|---|---|---|
| Leading digit distribution | First-Digit Frequencies | Global |
| Second digit distribution | Second-Digit Frequencies | Global |
| Terminal digit distribution | Last-Digit Frequencies | Global |
| Decimal precision pattern | Decimal Places | Global |
| Integer value-frequency spikes | Repeated Digits (VFS) | Global |
| Overrepresented consecutive digit substrings | Repeated Digits (VFS) — pass 2 (dual-pass) | Global |

All Dim II tests are global — digit manipulation is typically applied to the whole dataset, not one condition. Per-condition digit comparison feeds into the Dim IV cross-condition consistency framework rather than living in Dim II.

The Repeated Digits test runs as dual-pass: pass 1 on integer whole values (v0.6 procedure), pass 2 on fractional-digit substrings (v0.7, S114). Passes contribute independently to the final tier via union BH-FDR plus a pass-2 ≥2-spike multi-convergence gate.

Status: **complete.**

### Dim III — Replicate Agreement

Formed by merging the original "Replicate Residual Structure" and "Variance Structure" dimensions. Both test properties of inter-replicate noise — the first tests pattern (shape, order, dependence), the second tests magnitude (amount, uniformity, scaling). The distinction is real but not orthogonal enough for separate dimensions — a fabricator producing wrong noise produces both wrong pattern and wrong magnitude.

Three sub-groups, named for investigator clarity:

#### Sub-group A — How replicates differ

*Properties of the d_i series: shape, serial order, cross-column dependence.*

| Sub-mechanism | Test | Scope |
|---|---|---|
| Distribution shape (tail weight) | Kurtosis + Anderson-Darling | Inter-replicate |
| Lag-1 serial magnitude | Autocorrelation | Inter-replicate |
| Higher-lag serial structure (AR(2+)) | Autocorrelation (lags 2–5 extension, S96) | Inter-replicate |
| Lag-1 serial sign | Runs | Inter-replicate |
| Cross-replicate linear dependence | Inter-Replicate Correlation | Inter-replicate |
| Localised lag-1 serial structure | Windowed Autocorrelation (S96) | Inter-replicate |

Autocorrelation and Runs are not redundant: Autocorr is magnitude-sensitive/sign-blind, Runs is sign-sensitive/magnitude-blind. A fabricator can fail one while passing the other.

Higher-lag Autocorrelation extends the existing Autocorrelation card (S96) rather than being a separate test. Windowed Autocorrelation is a separate test card because it operates on a fundamentally different scope (localised windows vs global pooling).

#### Sub-group B — How much they differ

*Magnitude, uniformity, and scaling of replicate noise.*

| Sub-mechanism | Test | Scope |
|---|---|---|
| Mean-variance slope | Mean-Variance | Inter-replicate |
| Column-level variance homogeneity | Selective Noise (Bartlett) | Inter-replicate |
| Window × column variance | Regional Noise | Inter-replicate |
| Windowed residual variance + changepoint | LOESS Residual | Inter-replicate |
| Row-level SD outliers | Within-Row Variance | Inter-replicate |
| 2D spatial (plate) variance | *Parked v1.0 (Moran's I)* | Inter-replicate |

Selective Noise, Regional Noise, and LOESS test variance uniformity at different granularities — slated for merge into unified SD scan (STATUS 12). Post-merge: 3 tests in sub-group (MeanVar, Unified SD Scan, WRV).

#### Sub-group C — Do individual rows look right

*Row-level plausibility: sequential structure of means, multivariate outliers.*

| Sub-mechanism | Test | Scope |
|---|---|---|
| Row-mean sequential structure | Row-Mean Runs | Inter-replicate (per-condition) |
| Multivariate row outliers (per-condition) | Mahalanobis (stratified) | Inter-replicate |
| Multivariate row outliers (pooled) | Mahalanobis (pooled) | Inter-replicate |
| Localised multivariate structure (block Σ / μ) | Blocked Mahalanobis (S110) | Inter-replicate |

Row-Mean Runs operates on condition-level means rather than inter-replicate differences, but requires replicate data to compute means. It stays in Dim III.

Mahalanobis per-condition and pooled produce separate test cards — different forensic questions, same statistic at different scope within inter-replicate.

Status: **broad coverage, planned extensions for localised detection.** Sub-mechanisms documented as future work only: non-linear cross-replicate dependence (low forensic justification), distribution skewness beyond kurtosis (AD already captures via full CDF).

### Dim IV — Cross-Group Similarity

| Sub-mechanism | Test | Scope |
|---|---|---|
| Cross-condition rank agreement | Cross-Condition Rank | Cross-condition |
| Effect-size uniformity | Carlisle Balance | Cross-condition |
| Cross-condition property consistency (pool-level: span, MAD, CDF) | Cross-Condition Consistency (Stage 1, S97) | Cross-condition |
| Cross-condition property consistency (residual-level: variance, AC, kurtosis) | Cross-Condition Consistency (Stage 2, S102) | Cross-condition |
| Cross-condition property consistency (structural-invariant: mean-var slope; digit / entropy deferred) | Cross-Condition Consistency (Stage 3 P9, S104; P7/P8 deferred to v1.1+) | Cross-condition |
| Row-matched near-duplicates | *Planned (separate from consistency framework)* | Cross-condition |

**Cross-condition consistency framework.** One test card, staged across three property groups. Row-based permutation null on condition labels (row-tuple shuffle, S98A). Per-stage BH-FDR families: Stage 1, Stage 2, and Stage 3 run independent BH calls across (property × condition pair) within stage; `primaryP = min` across stages' effective adjusted p-values (S102 decision for Stage 2, extended S104 for Stage 3 P9). See METHODOLOGY.md §1.9 for full framework spec.

Per-property `forensicDirections` declaration (S97 revision) filters flag contribution: Stage 1 properties declare `["similar"]` only — location and scale differences between treatment conditions are expected in real experiments and carry no forensic weight at pool level. Stages 2 and 3 properties declare `["similar", "different"]` — residual structure and structural invariants of the data-generating process are preserved across conditions in real data, so both directions carry signal.

Properties by stage:

| Stage | Property | Source | Forensic directions | Landed |
|---|---|---|---|---|
| 1 | Trimmed span (5–95%) | New | similar | S97 |
| 1 | Dispersion (MAD) | New | similar | S97 |
| 1 | CDF/KS shape | New | similar | S97 |
| 2 | Residual variance | From Selective Noise | similar, different | S102 |
| 2 | Residual autocorrelation | From Autocorrelation | similar, different | S102 (S113: structural-SE gate) |
| 2 | Residual kurtosis | From Kurtosis | similar, different | S102 |
| 3 | Mean-variance slope (P9) | From MeanVar (§4.1); pre-VST | similar, different | S104 |
| 3 | First-digit distribution (P7) | From Benford (§3.2) | similar, different | deferred v1.1+ |
| 3 | Shannon entropy (P8) | From Shannon (§3.6) | similar, different | deferred v1.1+ |

This framework reapplies existing statistics at cross-condition scope. Computation is inter-replicate (per-condition properties from replicate data), comparison is cross-condition, results live in Dim IV.

Landing history: Stage 1 landed S97; post-S98A row-based permutation migration widened the null and surfaced DS15 missing-carlisle at MOD (batch 16/18 → 17/18). S98B added DS19 inheritance fixture (B = A + 0.02×MAD jitter, no shift) as the Stage-1 similarity-gate calibration target; S99 landed the similarity-aware effect-size gate unblocking Stage 2. S102 landed Stage 2 residual-structure properties (P4/P5/P6) and decided per-stage BH (Option B) after single-family BH tripped the DS15 MOD-preservation stop condition. S104 landed Stage 3 P9 (mean-variance slope, pre-VST by registry flag, per-property applicability callback, own third BH family); P7 and P8 deferred to v1.1+ pending purpose-built calibration fixtures. S113 migrated P5's different-direction gate from fixed absolute floor (0.3) to per-pair structural SE floor `√2/√(n_rep_min × (N_row_min − 3))` — coefficient = 1, derived uniquely from the statistic's H₀ sampling distribution under Fisher-z with replicate-averaging; scales correctly with N and resolves DS21 v2 gate-blocking (parked #16) without introducing calibration-basis tuning. See SESSION102-SUMMARY §3, SESSION103-SUMMARY §2, SESSION104-SUMMARY §3, and SESSION113-SUMMARY §3 for the decision records.

Status: **Dim IV coverage complete for v1.0 on replicate-bearing archetypes.** Cross-Condition Rank + Carlisle Balance + Cross-Condition Consistency framework (Stages 1/2/3 P9 live, sharing one test card) gives 3 active tests on the dimension. Intrinsic limitation: cross-condition tests face harder null-model problems — conditions are supposed to differ (unlike replicates which are supposed to agree), so "too similar" and "too different" both need nulls for how much they should differ.

### Dim V — Distributional Shape

| Sub-mechanism | Test | Scope |
|---|---|---|
| Column entropy (distinct-value count; too-few / too-many) | Shannon Entropy (two-sided) | Per-column (global) |
| Column distributional goodness-of-fit | Column GoF | Per-column (global) |
| Bimodality / multimodality | Modality Test | Per-column (global) |

All three tests are per-column. Per-condition pooled variants (pool replicate values within a condition) are a possible extension but per-condition sample sizes may be too small for bootstrap nulls.

All three are N/A on the ordinal and count data types (engine `dtSkip`): ordinal item scales are not interchangeable, and count column marginals are mixtures of per-unit families with no single-family null (S180 Finding 2). Count distribution-shape forensics is carried instead by §4.1 Mean-Variance Relationship and §2.2 Excess Kurtosis.

Cross-condition comparison of these properties (does condition A's entropy differ from condition B's?) lives in Dim IV (consistency framework), not Dim V.

The three sub-mechanisms are orthogonal: a column can have correct entropy but wrong shape (GoF catches), or correct shape but two peaks (Modality catches).

Status: **complete at 3 active tests on Dim V (S107 landing); Column GoF now batch-validated on three distinct positive forensics (S108).** Three genuinely orthogonal sub-mechanisms: value-frequency concentration (Shannon), CDF shape against fitted family (Column GoF), and within-column multimodality (Modality). Column GoF contributes new forensic signal on DS19 (inheritance, ratio 5.01), DS10 col5 (proteomics block-copy, ratio 105×), and DS20 v2 cols 4–7 (70/30 asymmetric Gaussian mixtures at seps 2.5–4.0 SD, ratios 5.3–23.5× at primaryP 0.0047) — the first purpose-built positive calibration gradient for the test. Modality remains forensically forward-looking: S108 Phase 1 diagnostic confirms a structural gate-hole at N = 300 on Gaussian-family mixtures (γ₂ pre-skip and DIP_GATE = 0.04 in mutual exclusion at symmetric 50/50; asymmetric 70/30 produces shallower dips below gate). Positive batch exercise deferred to v1.1 audit — either N ≥ ≈1500 lift, Student-t / skewed-component mixtures, or DIP_GATE recalibration. Retained for real-world case-study analysis where mixture fabrications are expected.

### Dim VI *(future)* — File Integrity

Excel-only, Tier 2 flagging (no p-values):

| Scope | Planned tests |
|---|---|
| Localising — feed convergence grid | Font anomalies, number format inconsistencies, formula patterns |
| Global — file-level findings | Provenance (creator/modifier), temporal inconsistencies, hidden sheets, external links |

Full spec deferred — see STATUS parked item "Excel forensics → File Structure category."

---

## Removed tests

- **Cross-Condition Duplication** (was §1.4, removed S93). Zero detections across 18 validation datasets and 4 real-world cases. Redundant with DupDet's condition-blind row-hash.
- **Fold-Change Distribution Outlier** (was §1.6, removed v0.8). MAD-based null was the weakest in the tool; redundant with Mahalanobis for column-grouped data. Carlisle Balance replaces the forensic target.
- **Constant-Response Concentration** (CRC, removed S94). Zero detections across 18 validation datasets. Scale-group fragmentation on real survey data (Gino Study 4) prevented firing when it should. Forensic target (flat-row dominant-value concentration) may be re-implemented with more robust scale-group merging at a later date.

---

## Overlap audit

### Within-dimension overlap

**Dim III sub-group B: Selective Noise + Regional Noise + LOESS.** All test variance uniformity at different granularities.

| Test | Granularity | Null |
|---|---|---|
| Selective Noise | Per-column | Bartlett χ² parametric |
| Regional Noise | Window × column | Permutation (row-shuffle) |
| LOESS Residual | Window of |d_i| + changepoint | Permutation + CUSUM |

Planned merge into unified SD scan (STATUS 12). Preserves all granularities under one framework with coherent nulls. MeanVar and WRV stay separate — different sub-mechanisms.

**Dim III sub-group A: Autocorrelation + Runs.** Both operate on d_i. Not redundant — Autocorr is magnitude-sensitive/sign-blind, Runs is sign-sensitive/magnitude-blind. Worth sharing infrastructure; not merging statistics.

### Cross-dimension overlap

- **IRC (III) vs DupDet column-segment (I).** Different scales of identity — scaled+noised copies vs exact segment matches. Keep separate.
- **RSC (I) vs DupDet block-copy (I).** Same dimension, different sub-mechanisms — coordinated residual extremes vs exact block matches. Both earn their place.
- **Shannon Entropy low-direction (V) vs DupDet value-collision (I).** Related but different — column-level distinct-value count vs specific-value excess frequency. Keep separate.

No merges recommended.

---

## Gap audit

### Gaps addressed by planned tests

| Gap | Dim | Planned test |
|---|---|---|
| Overrepresented digit substrings | II | VFS digit-substring extension |
| Cross-condition property comparison (residual-level, distributional) | IV | Consistency framework Stages 2–3 |

### Remaining gaps (future work)

| Gap | Dim | Notes |
|---|---|---|
| 2D spatial plate variance (Moran's I) | III | Parked v1.0 |
| Non-linear cross-replicate dependence | III | IRC is winsorized Pearson only. Low forensic justification. |
| Distribution skewness | III | AD already captures via full CDF. Low priority. |
| Row-matched near-duplicates across conditions | IV | Near-matches with small perturbations. Needs own null. |
| Cross-condition missing data pattern | IV | Deletion in one condition only. Hard without ground truth. |
| Per-condition pooled entropy/GoF/modality | V | Extension for datasets with replicates. Small per-condition sample concern. |

---

## Dataset archetypes and test applicability

### Archetype 1 — Replicate-only (no conditions)

Example: 4 replicate columns, 50 rows, no grouping.

| Dim | Coverage |
|---|---|
| I | Full (DupDet, ConstOffset) |
| II | Full (all 5 tests) |
| III | Full except Row-Mean Runs (needs conditions) |
| IV | **Dark** — no conditions to compare |
| V | Full (per-column) |

### Archetype 2 — Conditions with plenty of replicates

Example: 3 conditions × 4 replicates, 35 rows.

| Dim | Coverage |
|---|---|
| I | Full (DupDet, ConstOffset all pairs, RSC) |
| II | Full |
| III | Full (all 12 tests) |
| IV | Full (CCR if ≥3 condition pairs, consistency framework, Carlisle Balance) |
| V | Full |

**Ideal dataset shape. Maximum convergence power.**

### Archetype 3a — Conditions with 1 replicate each

Example: 6 conditions × 1 column each.

| Dim | Coverage |
|---|---|
| I | DupDet, ConstOffset (cross-condition pairs only) |
| II | Full |
| III | **Almost entirely dark** — no replicate pairs for d_i, no within-condition noise |
| IV | CCR (if ≥3 pairs). Consistency framework Stage 1 active (pool-level properties); Stages 2 and 3 N/A by applicability — no within-condition residuals to compute (Stage 2) and no per-row variance (Stage 3 P9). |
| V | Full (per-column) |

**Worst case. Tool should warn user clearly.**

### Archetype 3b — Conditions with 2 replicates each

Example: 4 conditions × 2 replicates.

| Dim | Coverage |
|---|---|
| I | Full |
| II | Full |
| III | Kurtosis (AD-driven, weak), Autocorr, Runs, IRC, Row-Mean Runs, LOESS, RegNoise, Windowed Autocorr. **Dark:** Mahalanobis (needs ≥3 cols), MeanVar (needs ≥3 cols), WRV (needs ≥3 cols), SelNoise (needs ≥3 cols). |
| IV | Full |
| V | Full |

### Archetype 4 — Long-format tables (pivoted at import) and arbitrary-order data

Examples: 200 proteins × 2 conditions stacked as 400 rows, pivoted to wide matrix; RNA-seq with rows as gene IDs; alphabetised protein lists; subject-ID-indexed survey data.

Row order is arbitrary. Spatial scans over arbitrary axes have no forensic interpretation. Gated via the **Row Semantics Gate** (S118; METHODOLOGY.md §"Row Semantics Gate"): import-stage flag `rowSemantics ∈ {ordered, arbitrary}` with auto-suggest from `detectLongFormat()` and assay (long-format → arbitrary; genomics → arbitrary; instrument assays → ordered; ambiguous assays → user-required).

| Suppression scope | Tests | Mechanism |
|---|---|---|
| Full-test N/A (5 tests) | §2.3 Runs, §2.4 Row-Mean Runs, §2.6b Blocked Mahalanobis, §2.7 LOESS, §4.2 Regional Noise | Engine `rsSkip` dispatch lane (sibling to `condSkip` / `dtSkip`); registered in `ROW_SEMANTICS_FULL_SKIP` Set |
| Sub-unit N/A (2 tests, global continues to run) | §2.5 IRC (windowed permutation scan), §4.3 Within-Row Variance (windowed scan) | Inside the test function, gated on `rowSemantics` parameter; result object reports `subunitsSuppressed: ['windowed-scan']` |
| Self-gating (3 sequential tests; not dispatched) | §1.2 Constant-Offset (row-shuffle perm null), §2.1 Autocorrelation (Tier 2 effect-size floor at N≥500), §2.1b Windowed Autocorrelation (within-pair row-shuffle perm null) | Test's own null / gate handles arbitrary-order baseline; real fabrication signal in delivered order continues to flag (DS11 generator leakage is the canonical case) |

Additional issue: multi-measure long-format (ID + COND + multiple replicate columns) not detected by `detectLongFormat()`. Parked v1.0.

### Archetype 5 — Unrelated conditions (non-replicates mode)

Example: 4 different proteins measured by same ELISA, each with 3 reps but columns represent different quantities. User declares non-replicates.

| Dim | Coverage |
|---|---|
| I | DupDet, ConstOffset (cross-column) |
| II | Full |
| III | **Entirely dark** — all 12 tests assume column exchangeability |
| IV | CCR (columns as conditions). Consistency framework limited. |
| V | Full |

### Archetype 6 — Time series / dose-response

Row order is meaningful AND rows are not independent. Sequential tests (Autocorr, Runs, Windowed Autocorr) will find genuine serial structure from the biology. Currently no way to declare ordered rows and adjust nulls. **Potential false positive source — not currently handled.**

### Archetype 7 — Paired/matched design

Each row is a subject, conditions are paired (before/after). Pairing structure means between-condition differences should be analysed per-row. **Not currently handled.**

### Coverage summary

| Archetype | Dims active | Key gap |
|---|---|---|
| 1 — Replicate-only | I, II, III, V | Dim IV dark (no conditions) |
| 2 — Conditions + replicates | All | None — ideal |
| 3a — 1 rep per condition | I, II, IV (Stage 1), V | Dim III almost entirely dark; Dim IV Stages 2 and 3 N/A (no within-condition residuals; no per-row variance for P9) |
| 3b — 2 reps per condition | I, II, III (partial), IV, V | 4 tests in III need ≥3 cols |
| 4 — Long-format pivoted | Varies | Sequential tests must be suppressed |
| 5 — Non-replicates | I, II, V | Dim III entirely dark |
| 6 — Time series | All active, but FPs | Sequential tests produce false positives |
| 7 — Paired | Not handled | Needs design work |

---

## Statistical framework coherence

### What's coherent

- **Unified α** (p < 0.001 → HIGH, p < 0.01 → MODERATE) applied across all tests.
- **Null hierarchy** (permutation > simulation > conditional > parametric > bootstrap) — each test picks the most assumption-free null available.
- **BH-FDR within tests** used consistently for multi-unit tests.
- **Tier 1 / 2 / 3 threshold labelling** — every threshold has an explicit tier and rationale.
- **VST routing** — principled tests-in/tests-out split. See §Test-input routing below for the reconciled 13-in / 14-out table.
- **Cross-validation against scipy** (S87): 974 comparisons, all pass, max |Δp| = 1.02 × 10⁻⁴.

### Test-input routing (reconciled S111)

Reconciled against `engine.js` dispatch as the source of truth. Every active test lands in one column — no silent routing. `TRANSFORMED` tests consume `hasVST ? vstMatrix : matrix` (or equivalent via `runPairVST` / aggregator); `RAW` tests consume `matrix` unconditionally. `STRUCTURAL` tests do not consume numeric values.

**Tests consuming VST-transformed matrix (13):**

| Test | Dim | Dispatch site |
|------|-----|---------------|
| Constant-Offset Blocks | I | engine.js:270 |
| Residual Spike Correlation | I | engine.js:275 |
| Cross-Condition Consistency (Stages 1/2) | IV | engine.js:291 (Stage 3 P9 overrides via `opts.originalMatrix`) |
| Mahalanobis Row Outlier | III-C | engine.js:342 (S127 Path 1: stratified-only on multi-condition row-grouped via `aggregatePerGroup(testFn, mahalGroups)`; pooled `runPairVST` is the fallback for single-condition / no-row-condition / column-grouped data only) |
| Blocked Mahalanobis | III-C | engine.js:347 |
| Excess Kurtosis | III-A | engine.js:355 (`runPairVST`) |
| Autocorrelation (lags 1–5) | III-A | engine.js:359 (`runPairVST`) |
| Windowed Autocorrelation | III-A | engine.js:360 (`runPairVST`) |
| Runs Test | III-A | engine.js:361 (`runPairVST`) |
| LOESS Residual Analysis | III-B | engine.js:375 (`runPairVST`) |
| Row-Mean Runs | III-C | engine.js:377 (`runPairVST`) |
| Selective Noise Partitioning | III-B | engine.js:378 (`runPairVST`) |
| Regional Noise Homogeneity | III-B | engine.js:384 (`runPairVST`) |

**Tests consuming raw matrix (14, with one-line rationales):**

| Test | Dim | Rationale |
|------|-----|-----------|
| Duplicate Detection | I | Exact-value matches require original precision |
| First-Digit Frequencies (Benford) | II | Operates on original numeric representation |
| Second-Digit Frequencies | II | Operates on original numeric representation |
| Last-Digit Frequencies (Terminal) | II | Operates on original numeric representation |
| Decimal Places | II | Operates on raw string precision via `rawMatrix` |
| Repeated Digits (VFS) | II | Operates on original numeric representation |
| Inter-Replicate Correlation (§2.5) | III-A | Winsorized Pearson r (fix 244) absorbs leverage outliers from scale differences internally; VST-induced scale compression would distort the 8-15-row windowed-scan local r — which uses raw Pearson deliberately because every point carries signal at short windows |
| Mean-Variance Noise Scaling (§4.1) | III-B | IS the VST-legitimacy detector; running on VST'd output is circular. Pre-VST isolation verified S111 Phase 1 across all 22 fixtures |
| Within-Row Variance (§4.3) | III-B | Internalises variance stabilisation via Step-2 binned mean-variance fit + local-MAD dispersion floor; the forensic target ("typed a number, added small noise to generate replicates") is a raw-scale uniformity signature VST would redefine away |
| Shannon Entropy (§3.6) | V | Shannon entropy is measured on modal-precision-discretised raw values; the forensic target (hand-typed fabrication reusing favourite values) is a raw-scale concentration anomaly. VST would alter the decimal-precision grid and distort the value-frequency histogram |
| Column Goodness-of-Fit (§3.7) | V | Distributional shape on the raw scale |
| Modality Test (§3.8) | V | Distributional shape on the raw scale |
| Cross-Condition Rank Correlation | IV | Rank-based (Spearman) — VST-invariant by construction; raw avoids a redundant transform step |
| Baseline Balance (Carlisle) | IV | F-statistic distribution depends on raw-scale group structure; VST would alter the forensic target |

**Structural (1):**

| Test | Dim | Rationale |
|------|-----|-----------|
| Missing Data Pattern | (interim III) | Operates on null-mask, not values |

Count: 13 TRANSFORMED + 14 RAW + 1 STRUCTURAL = 28 dispatch entries covering 27 active test cards (Cross-Condition Consistency spans Stages 1/2 TRANSFORMED + Stage 3 P9 overrides, counted once in the TRANSFORMED column).

**Signed-data gate (S111).** `detectVST` refuses both log and anscombe when `negFrac ≥ 0.1`, returning `raw` with `reasonCode: 'signedData'`. See METHODOLOGY.md §"Signed-data gate" for threshold derivation.

### Inconsistencies to fix

Ordered by effort, smallest first:

**1. DupDet internal cleanup.**

(a) Tests 1 and 3 use z-approximation (normal to binomial/Poisson); Test 2 uses exact binomial. Unify on exact binomial for all three.

(b) Test 2 has a cross-test gate (suppresses row-dup p when Test 1 z < −3 for integer data). Empirically test removal on DS05/DS06/DS07 to check whether HHI null already handles it. Remove if redundant.

(c) METHODOLOGY.md §1.1 uses "FLAGGED/NOTED" terminology. Align to HIGH/MODERATE per unified α. Documentation fix only.

**2. Mahalanobis uses Bonferroni across rows; everything else uses BH-FDR.** Already planned — STATUS priority 7.

**3. Cross-Condition Rank uses ρ₀ = 0.85 heuristic (Tier 2); everything else is Tier 1.** LOO alternative specified in METHODOLOGY.md §1.5. Already planned — STATUS priority 12.

**4. Escalation rule asymmetry.**

- "More severe of global and windowed" — Runs, Row-Mean Runs
- "Sub-unit BH-FDR promotion (cap MODERATE)" — Autocorr, Kurtosis+AD, ConstOffset, IRC, LOESS, RegNoise, SelNoise

**Decision: unify on sub-unit BH-FDR promotion.** A 15-row localised signal should contribute to severity via convergence across tests, not drive dataset-wide HIGH alone. Apply to Runs and Row-Mean Runs.

**5. ConstOffset scope.** Currently runs on replicate pairs only. **Expand to all column pairs** — cross-condition offset copies are a real fabrication pattern with no current coverage. The permutation null (row-shuffle, consecutive equal-difference count) is valid for any column pair.

**6. Cross-family convergence rule uses wrong grouping.** The Tier 3 rule "2+ MODs cross-family → SERIOUS" assumes inter-family independence. Currently "family" = four methodology families. **Change to cross-dimension** once this map is adopted.

**7. Large-N gate audit.** Tests with Tier 2 effect-size gates for N ≥ 500: Autocorrelation, Kurtosis+AD, Selective Noise, IRC, Mahalanobis, LOESS, Regional Noise, Shannon Entropy, Duplicated and Offset, Second-Digit Frequencies. Tests without gates that may need them: **First-Digit Frequencies, Last-Digit Frequencies, Runs, Row-Mean Runs, Decimal Places, Mean-Variance**. Calibrate against validation suite.

### Tolerable inconsistencies (no change needed)

- Mix of null types within Dim III — each picks the best available null for its statistic.
- Different minimum-N thresholds per test — each justified by the statistic's power characteristics.
- Some tests have BH-FDR, others don't — correction is only appropriate where multiple units are tested.

---

## Planned tests

### Blocked Mahalanobis (Dim III, sub-group C) — LANDED S110

Sliding windows of size W = max(30, 3·nC) at stride W/3 over row-ordered groups (continuous, non-genomics, N ≥ 60). Two-sample Hotelling T² (μ-pass) + eigenvalue-ratio λ_max(Σ̂_B Σ̂_{\B}⁻¹) with Ledoit-Wolf shrinkage (Σ-pass). Row-permutation null on scan-max statistic. BH-FDR across (pass × condition). Fisher-combination exempt. See METHODOLOGY.md §2.6b.

### VFS Digit-Substring Extension (Dim II)

Already on roadmap (STATUS priority 13). Adds second detection pass for overrepresented consecutive digit substrings. Dual-pass architecture (whole-value spike + digit-substring) under one test card.

---

## Implementation sequencing

Independent tracks, none blocking the others:

**Track A — Coherence cleanup** (Code, small).

1. DupDet: Tests 1+3 to exact binomial; empirically test Test 2 gate removal; FLAGGED/NOTED terminology fix.
2. Mahalanobis Bonferroni → BH-FDR.
3. CCR ρ₀ → LOO.
4. Escalation rule: Runs + Row-Mean Runs → sub-unit BH-FDR.
5. ConstOffset: expand to all column pairs.

**Track B — Review paper** (Chat). Methods section drafted around 5-dimension structure.

**Track C — UI restructure** (Code, medium). Category rename and reorganisation. CRC removal. Update INVESTIGATION-DISPLAY-SPEC.md.

**Track D — Cross-condition consistency framework** (Chat spec → Code). Stage 1 landed S97; Stage 2 landed S102; Stage 3 P9 landed S104. P7 (first-digit) and P8 (entropy) deferred to v1.1+ pending purpose-built calibration fixtures.

**Track E — New tests** (later, individual). VFS digit-substring. (Landings: S96 Higher-lag + Windowed Autocorrelation; S107 Column GoF + Modality; S110 Blocked Mahalanobis; S114 VFS digit-substring (c).)

**Track F — Unified SD scan** (Code, large, deferred). Three-way Dim III sub-group B merge.

**Track G — Large-N gate audit** (Chat analysis → Code calibration). Six tests.

**Track H — Long-format fix** (Code, v1.0). Row-order-arbitrary flag. Multi-measure detection.

---

## Open questions for future review

1. Per-condition pooled Dim V variants — sample size concerns at small per-condition N.
2. Time-series / dose-response archetype — how to adjust sequential test nulls.
3. Paired/matched design handling.
4. Per-condition digit tests — useful extension or too small N?
5. Row-matched near-duplicate test (Dim IV) — null model design.
6. Cross-condition missing data pattern — feasibility.
7. Plate analysis architecture (Dim III 2D, Moran's I) — timing within v1.0.

---

## Revision history

- v1.0 (S94) — initial draft. Six dimensions, test mapping, overlap/gap/coherence audits.
- v2.0 (S94) — major revision. Merged old Dims III+IV into Replicate Agreement with 3 sub-groups. Renumbered to 5 dimensions. RSC confirmed in Dim I. Full Dim IV sub-mechanism audit. Scope as orthogonal property. Dataset archetypes. CRC removal. ConstOffset expansion. Escalation rule unification. DupDet cleanup.
- v3.0 (S94) — final. UI category names, descriptions, and display order locked. Dimension order (I–V) and UI display order documented as separate concerns.
- v3.1 (S95) — Track A (statistical coherence cleanup) landed. Engine state reconciled against map: DupDet 4-way BH-FDR implemented (previously `min(blockP, rowDupP)` + 2-way BH-FDR — invalid shortcut); Mahalanobis per-row flagging moved to BH-FDR at α=0.001 (previously flat α=0.01); Runs + Row-Mean Runs unified on sub-unit BH-FDR escalation (capped MODERATE); ConstOffset expanded to all column pairs including cross-condition (bypasses `aggregatePerGroup`); CCR minimum pairs 3→4. Three surprises vs spec: (1) 4-p DupDet BH-FDR was aspirational in METHODOLOGY.md, not actual; (2) Test 2 "z<−3 integer gate" existed only in doc, never in code; (3) CCR already used LOO + Fisher-z + BH-FDR + MODERATE cap per the v3 spec, only minimum-pair threshold needed adjustment. Movement on batch: DS05 severity 1→0 (false positive removed — ground truth unchanged, tool now matches); all 11 fabricated datasets hold severity ≥ ground truth. Tracks remaining in priority: B (paper methods), C (UI restructure), D (cross-condition consistency framework), E (new tests), F (unified SD scan), G (large-N gate audit), H (long-format fix).
- v3.2 (S95) — Track C (UI restructure) landed. Five new UI categories live per v3 lock: Copy-Paste-Edit, Unusual Digits, Distribution Shapes, Cross-Replicate Comparisons, Cross-Group Comparisons. CRC removed from engine, UI, and exports. Test moves: IRC (Copy-Paste-Edit → Cross-Replicate), Mahalanobis (Too Perfect → Cross-Replicate), Shannon Entropy (Unnatural Noise → Distribution Shapes), CCR + Carlisle (Too Perfect → Cross-Group). Missing Data Pattern placed in Cross-Replicate as interim — forensic mechanism (structural missingness) doesn't cleanly fit any locked category; re-home to File Integrity (Dim VI) when that category lands, or scope-restrict for Dim IV home. Acceptance criterion (identical severity scores to end-of-Track-A) held 17/18. Single delta: DS15 severity 3→2. Accepted as correction: DS15's three flagged tests (Missing Data HIGH, Mahalanobis MOD, Kurtosis MOD) all trace to one mechanism (structural missingness) — Mahalanobis and Kurtosis fire as listwise-deletion artifacts, noted explicitly in ground truth. Old family-count system gave these artifactual spillovers artificial diversity into `perfect` and `noise` families; new dimension-based taxonomy correctly reports one-mechanism strong signal as severity 2 (ELEVATED). Same pattern as Track A DS05 1→0: tool catching up to principled methodology. heatmapColors.js "CRC" shorthand renamed to "CCR" to avoid namespace collision with retired Constant-Response Concentration. Latent finding parked: severity formula's category-count-as-diversity-proxy question — under new 1:1 category↔dimension mapping, single-dimension fabrications cap at severity 2 absent HIGH+cross-dim MODs. DS15 is the only current case; no formula change in Track C. Documentation ownership reclassified: INVESTIGATION-DISPLAY-SPEC.md moves to Code-owned (code-adjacent interface contract); METHODOLOGY.md and TEST-GROUND-TRUTH.md stay Chat-owned.
- v3.3 (S96) — Track E Tier 1 landed. Higher-lag Autocorrelation (lags 2–5 added to existing Autocorrelation card with sub-unit promotion rule (iii) requiring ≥ 2 per-pair BH-FDR survivors to prevent pair-lottery false HIGH on DS16). Windowed Autocorrelation (new card, within-pair row-shuffle permutation, lags localised to 15-row windows stride 5, lottery audit clean across 18 datasets). Dim III sub-group A expanded: 4 → 6 sub-mechanisms covered. Test count 22 → 23. Batch 16/18 vs legacy ground truth (pre-existing S95 deltas DS05 and DS15 unchanged). S95 follow-ups cleared: Mahalanobis row-label band-aid removed after invariant audit, DS15 Missing Data Patterns block-count dedupe landed, S87 validation-export scaffolding removed. Parked items extended: session-numbering convention (Chat count authoritative), localised-fabrication fixture gap for Windowed Autocorrelation and future Blocked Mahalanobis.
- v3.4 (S97) — Track D Stage 1 landed. Cross-Condition Consistency framework (1 test, 3 properties: trimmed span, MAD, KS) in Dim IV, bringing Dim IV to 3 tests and test total to 24. Framework-level revision: `forensicDirections` per-property field added after Round 1 calibration surfaced DS01 clean at MODERATE — location/scale properties legitimately differ across treatment conditions, so `"different"` direction carries no forensic signal at pool level. Stage 1 declares `["similar"]` only. BH-FDR denominator unchanged (runs over all computed units); forensic-direction filter lives at flag gate. Stages 2 and 3 will declare `["similar", "different"]` on residual and distributional properties (preserved across treatment in real data). Stage 1 post-revision calibration: 8/8 clean LOW, 16/18 batch (S96 baseline held), zero positive fabricated flags on current suite — expected given fixture-suite gap (no inheritance-style fabrication fixture exists). Validation structural rather than positive-flag based, documented in TRACK-D-SPEC.md Draft 3. Three Stage-2 prerequisites parked (STATUS.md items 14–16): direction-blind effect-size gate fix (gate assumes `d_obs ≥ threshold` — inverted for similar-direction signal; fix requires inheritance fixture + similarity-gate calibration), cell-based → row-based permutation migration (S96 spec D6 pending implementation; currently equivalent for pool-level statistics but required before Stage 2 residual properties), fixture suite extension with inheritance fabrication dataset. METHODOLOGY.md §1.9 Cross-Condition Consistency Framework written by Code at end of Stage 1 per S97 Part B verification follow-up.
- v3.5 (S98 Parts A + B) — Track D Stage 2 prerequisites mostly cleared. **Part A:** Cross-Condition Consistency permutation migration landed per S96 D6 (cell-based → row-based). Pre-S98 spec claim "row-based and cell-based are equivalent at pool level" corrected: equivalence holds only for single-cell rows; multi-cell tuples produce a wider, correlation-preserving null under row-based that cell-based destroys. Cell-based had been quietly under-conservative. Under corrected null, DS15 missing-carlisle flipped LOW → MODERATE (two properties similar-direction at adj-p 9.0e-3, catching inheritance-by-Carlisle-constraint similarity). DS15 overall severity 2→3 matches ground truth; batch 16/18 → 17/18. Sole positive Stage 1 forensic flag on the suite; S97's "validated structurally, zero positive flags" framing superseded by both-channels validation. **Part B + B.2:** DS19 inheritance-fabrication fixture added (B = A + 0.02×MAD Gaussian jitter, no location shift, seed 20260420, 3-col CSV per preprocessRaw sparse-row requirement). First iteration included a 0.5 location shift which caused P3 KS to flip "different" — Chat respec dropped shift to zero. Post-respec baseline: all three Stage 1 units direction="similar"; P3 KS significant at adj-p 6e-3 but gate-demoted (d_obs 0.008 < 0.1 threshold); P1 and P2 marginally similar without crossing ALPHA.FLAG. DS19 severity 0 under current code. Single-unit (P3 KS) calibration target for S99 similarity-gate implementation. Under similarity-aware gate retaining the P3 KS unit: primaryP 6e-3 → flag HIGH → DS19 severity 0→3. **Stage 2 now blocked on item 1 (direction-blind gate) only — S99 target.** STATUS items 15 and 16 (post-renumbering) removed across Parts A and B; only item 14 (formerly) now numbered 14 remains.
- v3.6 (S104) — Track D Stages 2 and 3 P9 landed; Stage 3 P7 and P8 deferred to v1.1+. **S99** landed the direction-aware similarity effect-size gate (`SIMILAR_RATIO_T = 0.5` on `d_obs / median(d_perm)`), unblocking Stage 2; DS19 severity flipped 0 → 3, batch 17/18 → 18/19 vs legacy GT (DS05 remains pre-S95 accepted delta). **S102** landed Stage 2 residual-structure properties (P4 residual variance, P5 residual AC, P6 residual kurtosis; `forensicDirections = ["similar", "different"]`) with per-stage BH decision (Option B) after single-family BH at m = 6 tripped the DS15 MOD-preservation stop condition — DS15 primaryP diluted from 0.009 to 0.018 under single-family, whereas per-stage preserves each stage at m ≤ 3 per pair; `primaryP = min(stage1_effAdjP, stage2_effAdjP)`. Option C (B = 1999) ruled out arithmetically — DS15 raw p ≈ 0.003 sits above the B=1999 permutation floor, so adj-p at m = 6 remains 0.018 regardless of B. **S103** (pure-Chat) drafted Stage 3 spec: P9 (mean-variance slope) ship-ready with forensicDirections two-sided, pre-VST override flag, per-property applicability callback; P7 (first-digit) and P8 (entropy) documented to calibration-ready level but deferred pending purpose-built calibration fixtures. Stage 3 carves its own third BH family per the per-stage pattern — folding into Stage 2 would push single-pair groups from MOD-reachable (m = 3, adj-p_min 0.006) to LOW-only (m = 6, adj-p_min 0.012), reprising the Option A failure mode. **S104 Chat** applied METHODOLOGY §1.9 Stage 3 edits; spec-tightening pass corrected an SE-derivation arithmetic error (draft claimed SE ≤ 0.25 at N_rows ≥ 20; actual was ≈ 0.39, raising the floor to N_rows ≥ 50 to match the Stage 2 calibration rule SE ≤ ½ × gate at gate 0.5) and made per-property applicability an explicit framework registry capability rather than a P9-local branch. **S104 Code** implemented P9 with `kind: "mvslope"` as the third registry branch, `useOriginalValues: true` pre-VST routing, per-condition (logMean, logVar) tuples computed once per permutation from originalMatrix, and three-family BH with `primaryP = min` across stages. All S103 stop conditions pass: DS15 MOD preserved at 0.009; DS19 MOD preserved at 0.006 (P9 N/A structurally); no clean MOD/HIGH at P9; non-Stage-3 channels unchanged from S102 baseline. New forensic signals: DS12b uniform-mixture-fab gains a similar-direction P9 flag at ratio 0.019 / adj-p 0.024 (previously Stage-1/2-silent); DS10 primaryP tightens from 0.258 → 0.160 via a new P9 similar contribution. Spec watchpoint: N_rows ≥ 50 floor makes P9 N/A on 4 of 13 applicable groups (DS01/02/03/04 at N_rows = 47) — inside the SE derivation's rounding uncertainty; alternative `N_rows ≥ 20 + |Δβ| ≥ 0.75` remains on the table as an Edit 6 to METHODOLOGY.md §1.9 pending Chat coverage-review decision. `TRACK-D-SPEC.md` deleted S100 — redundant once spec and decisions live in METHODOLOGY.md + session summaries. Test count unchanged at 24 (staged properties share one test card).
- v3.6 (S106) — Carlisle Balance landed-status corrected at §185 and §213 (S105 Dim IV walkthrough finding; test has been live in TEST_MECHANISM's `"group"` mechanism throughout, sub-mechanism table and Dim IV status line carried stale `(planned)` markers from pre-landing drafts). Full-doc grep during the pass surfaced three further Carlisle-planned references — the "Gaps addressed by planned tests" table row (§286), the "Planned tests" subsection (§461–463), and the Track E sequencing list (§497) — all cleaned up in the same edit. Dim IV active-test count recomputed as 3 (Rank + Carlisle + Consistency framework sharing one card), resolving a latent counting inconsistency against §65's stage-sharing accounting. S105 was otherwise pure-Chat: METHODOLOGY.md §1.9 Stage 3 empirical-coverage paragraph added (accepts 6-of-13 P9 applicability on 19-fixture batch as v1.0 coverage; rejects `N_rows ≥ 20 + |Δβ| ≥ 0.75` relaxation on calibration / redundancy / clean-FP grounds); `shapes` category narrative prose landed in narrative.js and layerZeroSummary.js to close the post-rename MECHANISM_FINDINGS / CATEGORY_PHRASES gap. S106 additionally closed parked #14 Carlisle applicability audit (predicate is principled on both dimensionality and adaptive gates; S105 data-type-routing hypothesis was incorrect) and landed METHODOLOGY.md §3.7 Column GoF + §3.8 Modality spec (implementation deferred to S107+; test count here unchanged until Code lands the two tests). No test-logic, framework, or registry changes; batch held 18/19.
- v3.7 (S107) — Track E (b) Column GoF + Modality landed. Dim V moves from 1 active test to 3; `Current total: 24` → `26`. §3.7 Column GoF uses N-adaptive γ₂ hybrid gate (|γ₁| > 1.5 skip universal; γ₂ < −1.2 skip universal; γ₂ < −0.8 skip at N ≥ 100) — S107 calibration showed flat γ₂ < −0.8 gate at N < 100 was over-tight, incorrectly skipping DS03 qpcr-clean small-N continuous columns where sample kurtosis SE ≈ 0.69 dominates; hybrid admits marginal-γ₂ clean columns (all subcritical AD ratio, confirmed by diagnostic probe) while retaining universal uniform-anchor exclusion. §3.8 Modality inherits γ₂ hybrid but drops §3.7's |γ₁| > 1.5 pre-skip — Modality's uniform-reference null is family-agnostic by design, so log-normal-like columns are legitimate inputs. New forensic signals: DS19 col1 Column GoF MODERATE (AD ratio 5.01 on N = 1200 inheritance fabrication despite moment-match at γ₁ = 0.155, γ₂ = 0.078; GT updated 1 → 3); DS10 col5 Column GoF MODERATE (AD ratio 105.6 on proteomics-fab narrow-shape column that sneaks γ₁ = 1.497 past the pre-skip). Modality produced zero positive batch signal — accepted as forward-looking v1.0 with a v1.1 purpose-built bimodal-fab fixture parked for positive exercise. METHODOLOGY.md §3.7 (step 2 hybrid, Known Limitations update, Minimum data clause, Tier 2 + Tier 3 tables) and §3.8 (step 1 inheritance rule, Known Limitations shared-bases + zero-signal notes, Tier 2 + Tier 3 tables) updated in parallel. Procedural lesson from S106 OLD/NEW duplicate-row bug applied: Tier 2 additions presented as isolated NEW rows with explicit "insert after" anchors rather than anchor-plus-append blocks.
- v3.8 (S108) — Track E fixture-gen workstream landed. Three new fixtures DS20/21/22 at `test/fixtures/` with `validate-batch.mjs` pending-lane for tests not yet implemented. Batch 20/21 passed + 1 pending + 1 pre-existing DS05 delta; zero DS01-19 regressions. Active test count unchanged at 26. **DS20 v2** (70/30 asymmetric Gaussian mixture gradient at between-component seps 2.5–4.5 SD, N = 300 per col): Column GoF delivers the intended Dim V forensic channel at primaryP 0.0047 with 4 flagged cols (AD ratios 5.3–23.5×) — first purpose-built positive calibration gradient for §3.7. Modality remains zero-positive-signal; S108 Phase 1 diagnostic tabled the γ₂-pre-skip × DIP_GATE=0.04 mutual-exclusion gate-hole at N = 300 on Gaussian-family mixtures (symmetric 50/50 clears dip only at sep ≥ 4.0 but γ₂ crosses −0.8 at sep ≥ 3.0 — no sep clears both; asymmetric 70/30 escapes the γ₂ lock-out but produces shallower dips that stay below DIP_GATE). **DS21 v2** (Control-only AR(1) ρ = 0.92, 80-row window, 5 fab reps with independent AR noise, N = 200/cond): Windowed Autocorrelation misses despite fab-fab inside-injection per-window |r| in 0.52–0.58 matching analytical prediction r(d) ≈ ρ — BH-FDR across 507 (pair × window) units (28 pairs × ~18 windows, only C(5,2) = 10 fab-fab) pushes adj-p to 0.629 (full-pair-grid BH structural limit). Cross-Cond Consistency Stage 2 P5 Residual lag-1 AC closest-yet at adj-p 0.150 direction=different but below the 0.3 absolute floor. **DS22** is the Blocked Mahalanobis S109 landing target with GT severity 2 and pending-lane handling. Three v1.1 methodology audit items lifted to Next Priorities: (a) Benford First Digit + Excess Kurtosis false-positive pair on centered-symmetric continuous data — both fire HIGH on pure N(0,1) DS21/DS22 replicate differences, blocking DS21 v2 primary-channel attribution AND DS22 clean-baseline validation for S109; (b) Windowed Autocorrelation per-pair BH family scope — cleanest architectural fix identified; (c) Modality gate recalibration or alternative-family mixture fixture. METHODOLOGY.md Known Limitations additions at §2.1b (WA BH-structural), §2.2 (Kurtosis small-sample FP), §3.2 (Benford centered-symmetric FP), §3.7 (Column GoF DS20 v2 positive evidence), §3.8 (Modality gate-hole structural). Dim V status upgraded to "Column GoF now batch-validated on three distinct positive forensics." No test-logic changes; test count held at 26.
- v3.9 (S109) — Three methodology gate fixes landed per S108 audit bundle. **Benford First Digit** (§3.2): positivity-fraction pretest (≥80% positive) added; OOM span gate tightened 1.0 → 1.5. **Excess Kurtosis** (§2.2): directional suppression `κDev ≥ 0 → informational` + N-adaptive effect-size floor `max(0.20, 1.96·√(24/pooledN))` replacing the fixed |κDev| < 0.20 gate. **Windowed Autocorrelation** (§2.1b): BH-FDR scope restricted to per-pair (each pair a distinct hypothesis family); `primaryP = min per-pair adj-p`. Follow-on: Windowed Autocorrelation added to Fisher's-combination exempt list in `src/analysis/aggregation.js` alongside Excess Kurtosis — per-pair min adj-p is floor-truncated at ≈1/(N_PERM+1) × nWindows ≈ 0.01, violating Fisher's uniform-null assumption (surfaced on DS16 at first post-fix batch, three floored primaryP's Fisher-combined to HIGH). Design Rationale "Fisher's-combination exemptions" subsection generalised to cover both tests via the forward-compatible rule. Batch 18/21 + 1 pending; DS01 EXPECTED 1 → 0 (S82 Kurtosis borderline flip reverted) and DS21 EXPECTED 3 → 2 (Benford channel removed via positivity gate) finalised at close-out. Parked items #15 (WA BH scope) and #18/#19 (Benford/Kurtosis DS21/DS22 FP) resolved or narrowed. Test count held at 26.
- v4.0 (S110) — Track E (a) **Blocked Mahalanobis** landed. Sibling of §2.6 Mahalanobis Row Outlier at Dim III sub-group C: sliding windows of size W = max(30, 3·nC) at stride W/3 over continuous-data row-ordered groups (N ≥ 60 per condition, non-genomics). Two passes — μ-pass (two-sample Hotelling T² on block-vs-complement means with Ledoit-Wolf-shrunk pooled covariance) and Σ-pass (λ_max(Σ̂_B · Σ̂_{\B}^{-1}) with independently LW-shrunk covariances). Within-condition row-shuffle permutation null on scan-max statistic; adaptive B_perm (4999 at N ≤ 500; 999 at N > 500). BH-FDR across (pass × condition) family (m = 2·nCond); `primaryP = min` adj-p. Fisher's-combination exempt — primaryP floor-truncated at m/(B_perm+1) under H₀; Design Rationale exempt list extended from 2 to 3 entries (Excess Kurtosis, Windowed Autocorrelation, Blocked Mahalanobis). Implementation in `src/tests/blockedMahalanobis.js` with self-contained Ledoit-Wolf shrinkage + `invertMatrix`-driven power iteration for dominant generalised eigenvalue; VST routing inherited from §2.6 (engine wires to post-VST matrix). Batch 22/22 passed post-S110 (DS22 pending lane retired; EXPECTED held at 2 per §Accepted deltas). Two findings surfaced at landing: (a) **K/N=0.15 detection ceiling** — DS22's planted covariance-block fabrication at ρ=0.5 across 30/200 rows hits MOD not HIGH under scan-max permutation null, because lucky-concentration shuffles from a 15%-fabricated sample produce non-trivial upper-tail density; documented in METHODOLOGY §2.6b Known Limitations. (b) **VST-routing interaction on signed-centered data** — DS22's N(0,1) matrix is VST-log-routed by `detectVST` (slope CI above 1 from conditioning the mean-variance regression on mean>0 rows), producing null-contaminated rows that drive Blocked Mahalanobis to N/A; engine not re-wired mid-session (broader audit is S111 Priority #1). New STATUS.md Next Priority items added: S111 VST-routing audit (Priority #1), Blocked Mahalanobis multi-scale block schedule v1.1 (Priority #2, rescues K/N ∈ [0.05, 0.30] fabrications at larger W). TEST-GROUND-TRUTH DS22 entry updated with post-S110 attribution; DS15 gains a Blocked Mahalanobis under-investigation note (Σ-pass MOD at Control rows 1–40; no severity regression since DS15 already severity 3 from other drivers).
- v4.2 (S113) — Cross-Cond Consistency **Stage 2 P5 different-direction gate** migrated from fixed absolute floor (`|Δz| ≥ 0.3`) to per-pair structural SE floor `|Δz| ≥ √2/√(n_rep_min × (N_row_min − 3))` derived from the H₀ sampling distribution of |Δz| under Fisher-z with replicate-averaging. Coefficient = 1 (no calibration, no fixture anchor); floor is the H₀ SE of the statistic itself, representing the weakest meaningful claim that observed gap exceeds its own sampling noise. Phase 1 Target C diagnostic (read-only, `test/diag-s113-p5-calibration.mjs`) pooled clean-fixture per-pair |Δz| across the 22-fixture batch (N_pairs=6; 95th=0.102; max=0.108; DS17 dominant contributor) and surfaced that the empirical null is ~4× tighter than Gaussian SE predicts at min-N=50 — the retired 0.3 floor was 1.4× Gaussian combined-SE evaluated at worst-case-N, both over-anchored to worst-case and over-stated the true null, blocking P5's designed forensic target (DS21 v2 AR(1) one-condition injection, |Δz|=0.141). Phase 2 initial attempts at fixed empirical floors (0.20 = 2× 95th, revisions to 0.13, 0.125) abandoned — no principle uniquely determines a point in the window (clean_max=0.108, designed_target=0.141], selection was judgment not derivation. First-principles re-derivation: permutation + BH-FDR fully controls FP; residual job of absolute floor is preventing trivial-effect detection at large N, a property of the statistic's sampling distribution not of clean-fixture tails. Structural floor scales correctly with N — at (n_rep=3, N_row=50) floor=0.119; at (n_rep=7, N_row=200) floor=0.038; at (n_rep=3, N_row=10000) floor=0.008. Implementation: `p5ResolvabilityFloor(bundleA, bundleB)` helper + `gateAlwaysEvaluates: true` property-registry flag in `src/tests/crossConditionProperties.js`; driver in `src/tests/crossConditionConsistency.js` threads observed residual bundles to residual-kind gates and honours the flag to bypass the Stage 1 nMin<500 auto-pass (structural floor auto-adjusts with N so no bypass is needed). P4 and P6 fixed-absolute gates unchanged (0.5 log-ratio, 1.0 kurtosis delta); may admit similar structural-SE derivation after Target-C-style empirical validation — parked S114+. METHODOLOGY.md §1.9 P5 paragraph + derivation-principle paragraph rewritten; derivation-principle scope narrowed to P4/P6 only. Batch 22/22 severities PASS; zero clean-fixture P5 flips; one informational small-N gate-block case (DS17 Control vs Treatment_B at floor=0.077 vs |Δz|=0.069, unit was LOW via adj-p anyway). DS21 v2 Control-vs-Treatment (n_rep=8, N_row=200, floor=0.036) gate-passes at |Δz|=0.141 (4× clearance); P5 becomes the leading contributor to DS21 CCC primaryP at 0.012 (was 0.096 from a non-P5 unit pre-Phase-2). CCC tier lands at LOW — DS21 rawP=0.004 at B=999 produces BH-adj 0.012 at m=3, one permutation tick above MOD-reachable (3/1000 = 0.003 at rank 1); P5 thus added to DS21 convergent-channel enumeration as LOW, subject to the B=999 permutation-arithmetic ceiling per accepted limitations (prior Phase 1 + Phase 2 briefs asserting LOW → MOD was Chat error, not cross-checked against `ALPHA.NOTE=0.01`; corrected at close-out). DS21 severity 3 unchanged (carried by 4× HIGH + Regional Noise MOD from S111). Pre-S111 STATUS parked #16 reference "DS21 v2 closest-yet at 0.122" corrected to 0.141 (post-S111 identity-routing artefact). Parked #16 resolved on gate-mechanism grounds; MOD-lift ambition co-parked with WAC N_PERM rescue (parked #15) as a future B-boost calibration session (both B=999 arithmetic-ceiling constraints on otherwise-resolved detections). Test count held at 27. Two diagnostic scripts at `test/diag-s113-p5-calibration.mjs` (Phase 1) and `test/diag-s113-p5-structural.mjs` (Phase 2 verification).
- v4.1 (S111) — S111 Priority #1 **VST signed-data gate** landed. Phase 1 diagnostic (read-only, three reproducible scripts at `test/diag-s111-*.mjs`) characterised the corruption scope: only DS21 + DS22 exhibit row-dropping corruption under VST-log (99%+ row loss, 100% of introduced NaNs from `v<0`); all other VST-log / anscombe fixtures show 100% row survival and legitimate log-Jacobian compression. Phase 1 Addendum Q1 synthetic probe confirmed the anscombe branch is exposed to the same mechanism (symmetric N(0,10) integers → 1.5% row survival; Likert-like integers in [−3,+3] → 5.3% row survival). Phase 2 landed a single shared predicate `requiresPositiveDomain(matrix)` in `src/stats/vst.js` ahead of both log (vst.js:87 continuous-general slope + assay-map fallback) and anscombe (vst.js:71-80 integer-branch default) selection points; refuses positive-domain transforms when `negFrac ≥ 0.1`, returning `raw` with `reasonCode: 'signedData'`. Threshold derivation in METHODOLOGY.md §"Signed-data gate": slope regression conditions on `mean > 0` rows, so `negFrac < 0.1` keeps estimator bias ≤ ~10% while `negFrac ≥ 0.1` turns the fit into an upper-tail Jensen artefact. Phase 1 Addendum Q2 closed the removed-test rationale audit: **(confirms)** 10 VST-consumers on Chat's candidate list cross-reference to `engine.js` dispatch; **(additions)** 3 were absent from the candidate list — Constant-Offset Blocks, Residual Spike Correlation, Selective Noise Partitioning; **(removals)** 4 were on the candidate list but intentionally routed to raw with documented rationale — IRC (winsorized Pearson absorbs scale leverage), Shannon Entropy (raw-scale value-frequency target), §4.1 Mean-Variance (IS the VST-legitimacy detector), §4.3 Within-Row Variance (internalises variance stabilisation via Step-2 binned MV fit). METHODOLOGY.md §"Tests NOT transformed" table and engine.js VST docstring reconciled with per-test rationales; §3.6 Shannon Entropy documentation drift on "If VST has been applied, the parametric model is fit to the transformed values" removed (implementation has always fit on raw; docstring was stale). New MAP §"Test-input routing" table enumerates all 27 active tests + Missing Data Pattern into 13 TRANSFORMED / 14 RAW / 1 STRUCTURAL columns with engine.js:LINE references. Phase 2 batch outcome: 20/22 bit-identical; **DS21 severity 2 → 3** (previous 2 was a VST-induced Kurtosis HIGH single channel on ~50% positive-half log-transformed cells; under raw routing 4× HIGH + 1× MOD converge from real drivers — Autocorrelation, Runs, Row-Mean Runs, Blocked Mahalanobis HIGH + Regional Noise MOD); **DS22 severity held at 2** with attribution restructured — previous sole Kurtosis HIGH retires; new drivers are Runs HIGH + Blocked Mahalanobis MOD + Autocorrelation MOD, resolving the S110 Blocked-Mahalanobis-N/A-on-DS22 attribution gap documented at parked #18 top-level. Parked #18 DS15 Blocked Mahalanobis argmax under-investigation RETIRED: Phase 1 Target A λ_max-drift analysis confirmed DS15 post-VST matrix has 74% row survival with **zero** v<0-induced NaNs (42 partial-null rows were pre-existing in raw); the −99.98% λ_max drift is legitimate log-Jacobian compression, not row-dropping corruption. DS15 Blocked Mahalanobis MOD is therefore a real Carlisle-overbalancing covariance signature, not a VST artefact (METHODOLOGY §2.6b). STATUS.md known bug #2 retired; S111 Priority #1 cleared; Blocked Mahalanobis multi-scale v1.1 promoted to S112 #1. Parked alternatives: symmetry-aware slope estimator (Levene / Breusch-Pagan on rank-folded data) and signed-VST family (Yeo-Johnson / asinh) deferred to v1.1+ transform architecture. Test count held at 27.
- v4.6 (S127c) — **Mahalanobis Row Outlier Fisher's-combination exemption.** S127c-AUDIT (separately scoped from S127 Path 1) traced a residual false-FLAG pathway on multi-condition row-grouped fixtures running with VST=raw routing: each per-group `testMahalanobisOutlier` correctly fired the S126b add-5b verdict gate (`nOut === 0 → LOW`) on DS15, returning per-group `flag: "LOW"` with `primaryP = binomP` (Control 0.0019, Treatment 0.000001 on raw heavy-tailed data). The `aggregatePerGroup` Fisher's-combination then promoted the aggregate from LOW → HIGH (`fisherChi=41.13, fisherP≈0`) by combining the small per-group binomP values, with `primaryP` spread from the worst group (Control's 0.0019). The S126b add-8 chip-emission fallback fired downstream, surfacing a "Unusual Rows" chip on the §2 lane despite zero rows surviving Stage-2 BH-FDR α=0.001. Audit named the cause: **`primaryP = binomP` is non-uniform under H0 when the input is heavy-tailed in raw form** — the χ²(p, 0.99) cutoff inside `testMahalanobisOutlier` is calibrated against multivariate-normal nulls; raw heavy-tailed data produces excess upper-tail counts even with no genuine outliers, driving binomP stochastically smaller than Uniform(0,1). This violates Fisher's chi-squared combination's uniform-null assumption — the same forward-compatible rule that exempted Excess Kurtosis / Windowed Autocorrelation / Blocked Mahalanobis. **Fix: add `"Mahalanobis Row Outlier"` to the `FISHER_EXEMPT` Set in `aggregation.js`.** Single-line edit (one line in the Set, plus expanded inline rationale comment + new exemption-rule clause `(d) the survival p of a model-fit binomial whose null distribution is mis-calibrated under non-conforming inputs`). FISHER_EXEMPT extends from 3 → 4 entries. Aggregator falls back to `worstGroupFlag` for §2.6 — when both per-group verdicts are LOW (no rows survive BH-FDR within either condition), aggregate stays LOW; chip suppressed via the `findings.js` line 161 `isFlaggedFlag` filter. Batch 22/22 unchanged (DS15 severity 3 carried by Missing Data + Carlisle + others independently of Mahalanobis collateral). DS15 deep-diag post-fix confirms aggregator `flag=LOW fisherChi=0.00 fisherP=1.0000` (Fisher's correctly skipped); runFullAnalysis under VST=log unchanged (`flag=LOW primaryP=0.337` — the gate is dormant under VST=log because per-group binomP becomes uninformative ≈0.5 by construction post-VST). METHODOLOGY.md §2.6 gains a "Fisher's-combination exemption (S127c)" paragraph mirroring §2.6b's existing exemption note. CLAUDE.md banks the broader principle: **Fisher's-combination exemption check is part of the test-onboarding checklist** — when adding a new test, evaluate whether its primaryP under H0 is uniform; if not (BH-FDR family minimum, finite-permutation arithmetic floor, shared simulation/bootstrap denominator across groups, or model-fit binomial with mis-calibrated null), add to FISHER_EXEMPT. STATUS.md parked #37 fully retired (S127 dispatch leg + S127c Fisher's-promotion leg both closed). Phase 5 case-study impact: Code-side prediction is zero Mahalanobis attribution shift on Ariely / Gino / Pruitt — the fix only affects fixtures where Fisher's was promoting per-group LOW results past the verdict gate, which requires both raw-routed heavy-tailed multi-group data AND the verdict gate firing per-group AND per-group binomP being individually small. Each case study's primary signal is in non-Mahalanobis dimensions; runtime audit Chat-side. SESSION127c-FIX-SUMMARY.md carries the full landing. METHODOLOGY-MAP v4.5 → v4.6.
- v4.5 (S127) — **Mahalanobis Row Outlier dispatch repair (Path 1).** Pre-S127 `engine.js` Mahalanobis dispatch ran both pooled (full-matrix joint (μ, Σ) via `runPairVST`) and stratified (per-condition via `aggregatePerGroup(testFn, mahalGroups)`) on every multi-condition row-grouped fixture, then arbitrated by more-severe (stratified winning ties). METHODOLOGY.md §2.6 step 1 specifies per-condition (μ, Σ); pooled-on-multi-condition computes (μ, Σ) over the joint distribution and inflates D² for treatment-effect rows, conflating real biology with fabrication. S126b add-5b audit surfaced the dispatch-level bug; Path 1 fix (smallest blast radius, smallest behavioural delta): when `condCtx.rowGroups()` returns ≥2 groups each ≥3 rows (`mahalGroups` non-null), skip pooled entirely — stratified is the sole source. Single-condition / no-row-condition / column-grouped fixtures continue to use the pooled path unchanged (pooled IS per-condition by construction when there's only one group; column-grouped data is per-group via `runPairVST`'s internal `useAggregate=true` path). Per-fixture compare diag (`test/diag-s127-pooled-vs-strat.mjs`): on every multi-condition row-grouped fixture in the 22-batch (DS03/04/09/10/12a/12b/15/16/20/21/22), pooled and stratified Mahalanobis Row Outlier both already returned LOW post-S126b add-5b — the `nOut === 0 → LOW` verdict gate inside `testMahalanobisOutlier` had already neutralised pooled false-FLAG at the per-group testFn level. Path 1 produces zero EXPECTED-severity changes, zero per-test flag changes, zero non-Mahalanobis collateral; the visible behaviour was already correct via add-5b, Path 1 makes the dispatch architecturally consistent with METHODOLOGY §2.6 going forward (pre-add-5b would have resolved DS15 from FLAGGED p≈0.0019 to LOW; that resolution is preserved post-S127 with stratified-only as the route). METHODOLOGY.md §2.6 procedure step 1 rewritten to make the dispatch contract explicit; step 5 verdict-reads-off-localised-finding rule (S126b add-5b) folded in. METHODOLOGY-MAP.md §"Test-input routing" Mahalanobis Row Outlier line updated with the new dispatch-site reference. Phase 4 audit (audit-only, no fixes): row-grouped Mahalanobis dispatch is the SOLE pooled+stratified+arbitrate pattern in `engine.js`; `runPairVST` does not take a `rowGroups`-equivalent argument anywhere else, and every other consumer of row-condition semantics (Carlisle, Cross-Cond Rank Corr., Cross-Cond Consistency) is per-condition by construction with no pooled-fallback to deconflate. Phase 5 audit (audit-only, real-world case studies): three review-paper case studies (Ariely, Gino, Pruitt) — Mahalanobis Row Outlier severity attribution shift expected to be zero on each (each fabrication signature drives severity through other tests; Mahalanobis is at most a collateral channel and on each study the pre-S127 vs post-S127 behaviour is byte-identical post-add-5b under both branches). Code-side cannot run case-study fixtures (live data not in repo); attribution audit deferred to Chat with the Phase 5 nil-shift expectation banked as a default. STATUS.md S127 retired, parked #37 retired; no new parked items surface. SESSION127-SUMMARY.md carries Phases 1-5 detail.
- v4.4 (S116) — Severity rule nomenclature reconciled. METHODOLOGY.md "cross-family" updated to "cross-dimension" throughout: §General Approach four-family organisation paragraph retired in favour of a cross-reference to this map; §Permutation-Test Arithmetic Constraints line-85 hedge "test family, a different dimension" → "a different dimension"; §Tier 3 pragmatic rules SERIOUS / ELEVATED / Convergence escalation rows updated; new §Tier 3 subsection paragraph states that cross-dimension is the diversity axis and frames the rule explicitly as investigator-triage. Implementation-doc drift closure, not a rule change — engine severity aggregator has used dimension-count (via UI-category-count since S95 v3.2) throughout; documentation-side language lagged. No engine behaviour change expected; batch 22/22 preserved. SESSION116-SUMMARY.md carries the Phase 1 diagnostic (22-fixture walk, candidate comparison, pick rationale).
- v4.7 (S129) — **Consumer-coverage fixes (parked #38 + #39 + #40 closure).** Six surface/rendering fixes scoped from the S128 27-test consumer-coverage audit (`docs/AUDIT-S128-CONSUMER-COVERAGE.md`) ranked-fix list; all engine logic / methodology untouched. (1) **B1-Runs** — `src/tests/runs.js` result object emits `nRows: matrix.length`. (2) **B1-RowMeanRuns** — `src/tests/rowMeanRuns.js` result object emits `nRows: matrix.length`. Together (1)+(2) trigger the S126b add-8 chip-emission fallback in `findings.js` (which gates on `r.nRows > 0`), restoring §2 Localised Patterns lane chips on DS02 (Runs MOD), DS21 (Runs HIGH + Row-Mean Runs HIGH), DS22 (Runs HIGH) — pre-S129 these tests fired flagged at the pooled/aggregated level but produced empty `details[].source==='window'` per-window evidence and no chip surfaced. The deeper fix shape (b) — emit per-window evidence so chip carries the actual AR-window region — banks as new parked #42 for v1.x co-session with parked #15 (WAC N_PERM rescue) + #18 (CCC B-boost). (3) **A4-keyFinding-ColGoF** — `TEMPLATE_MAP` in `src/constants/keyFindingTemplates.js` gains `"Column Goodness-of-Fit": columnGof`. `columnGof(r)` consumes `r.nFlagged / r.nHigh / r.nLow / r.colRatios / r.primaryP`; closes 3× `console.warn("[KeyFindings] No template for test: Column Goodness-of-Fit")` during batch analysis on DS10 / DS19 / DS20. (4) **A4-keyFinding-Modality** — `"Modality Test": modality` consumes `r.nFlagged / r.colDips / r.primaryP`; latent until Modality fires above LOW (parked #14 v1.2 fixture). (5) **A4-keyFinding-WAC** — `"Windowed Autocorrelation": windowedAutocorrelation` consumes `r.nSig05 / r.nSig01 / r.details[0].pair / r.details[0].startRow / r.details[0].endRow / r.primaryP`; latent until WAC promotes via parked #15 N_PERM rescue. (6) **C2-Modality MiniCard + MINIPLOT_REGISTRY entry** — `src/components/cards/MiniCard_Modality.jsx` created mirroring MiniCard_ColumnGoF.jsx structure (headline + desc + footer + lookFor + implications + flagged-columns DataTable with `{Col, Dip, adj.p}` columns), registered in `MINIPLOT_REGISTRY` (`src/components/cards/MiniPlot.jsx`) under key `"Modality Test"`. Sibling-test pattern (Entropy ↔ Column GoF ↔ Modality, all Distribution Shapes / per-column emit shape) is the template for parallel test families. CLAUDE.md banks the **7-item test-onboarding dispatch-map checklist** alongside the existing FISHER_EXEMPT onboarding rule: when adding a new test to `engine.js`, ship entries in (a) `MINIPLOT_REGISTRY` (`src/components/cards/MiniPlot.jsx`); (b) `TEMPLATE_MAP` (`src/constants/keyFindingTemplates.js`); (c) `TEST_MECHANISM` (`src/constants/mechanisms.js`); (d) `DISPLAY_NAMES` (`src/constants/mechanisms.js`); (e) `TEST_DESCRIPTIONS` (`src/constants/mechanisms.js`); (f) `TEST_METHODS` (`src/constants/mechanisms.js`); (g) `GLOBAL_TESTS` (`src/constants/mechanisms.js`) if global. Drift between (a)/(b) and (c)–(g) over time was the root of every gap surfaced by the S128 audit. **C5-SelNoise** col-only no-§2-chip on DS20 HIGH deferred to parked #6 display restructuring design pass per Chat decision (out of S129 scope; design call between (a) col-only chip variant flipping `findings.js` intent vs (b) §2 column-axis indicator preserving intent). `npm run build` clean, 182 → 183 modules with new MiniCard. Batch 22/22 unchanged — engine flags identical pre/post S129; fixes are surface/rendering only. Re-run `node test/diag-s128-consumer-coverage.mjs` reports 0 gaps detected (was 7 pre-S129); 28/28 tests pass audit cleanly. STATUS parked #38, #39, #40 retired; new parked #42 lands as fix-shape-(b) co-session candidate. No methodology change (METHODOLOGY.md untouched). Test count held at 27 active (28 with Modality). SESSION129-SUMMARY.md carries the per-edit landing detail.

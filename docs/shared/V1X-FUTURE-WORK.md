# Check My Data — v1.x Future Work

**Owner:** Chat-side design artefact. Sibling to METHODOLOGY.md, TYPOGRAPHY-SYSTEM.md in the `docs/shared/` layout.
**Purpose:** Single source of truth for what's planned post-v1.0. Consolidates content currently scattered across METHODOLOGY-MAP's gap audit, ROADMAP Item 8, STATUS.md parked items, and chat-history-only specs.
**Out of scope:** v1.0 work in progress (lives in STATUS.md), implementation-landed tests (live in METHODOLOGY.md), v1.0 UI polish (lives in STATUS.md parked items).

This doc owns the v1.x view. The v1.0 surfaces stay authoritative for their domains; cross-references at the foot point to source-of-truth for each topic.

---

## At a glance

| Surface | Scope | Status |
|---|---|---|
| Methodology gaps (forensics framework) | 6 dimension-attributed coverage gaps | Mirrored from METHODOLOGY-MAP §Gap audit |
| Test additions (post-v1.0 forensics) | Rectangular Blocked Mahalanobis; coherence-cleanup residue | New scope, this doc |
| Variance-estimator unification | Catalogue + scoped sub-refactors | Extends ROADMAP Track F |
| AI Screening mode | Five new tests + mode toggle + reweighting | Restored from S125 chat history |
| Calibration audits banked | Permutation B=9999; severity-formula diversity metric; Modality plot upgrade | Mirrored from STATUS parked items |

---

## 1. Methodology gaps (forensics framework)

Mirror of METHODOLOGY-MAP §"Gap audit > Remaining gaps (future work)". These are dimension-attributed coverage holes in the existing forensics framework — gaps that the 27-test battery doesn't currently address.

| Gap | Dimension | Notes |
|---|---|---|
| 2D spatial plate variance (Moran's I) | III | Parked v1.0. Detects spatial autocorrelation in plate-layout data — well-position effects, edge effects, batch-position artefacts that the row-ordered tests don't see. |
| Non-linear cross-replicate dependence | III | IRC is winsorised Pearson only. Low forensic justification — most fabrication signal is linear or rank-detectable. |
| Distribution skewness | III | Anderson-Darling already captures via full CDF comparison. Low priority. |
| Row-matched near-duplicates across conditions | IV | Near-matches with small perturbations (e.g. fabricator copies Control rows + adds tiny noise to make Treatment rows). Needs its own null. |
| Cross-condition missing data pattern | IV | Deletion in one condition only. Hard without ground truth on missingness mechanism. |
| Per-condition pooled entropy / GoF / modality | V | Extension for datasets with replicates — pool replicate values within a condition, run Dim V tests on the pooled per-condition distribution. Small per-condition sample concern. |

**Source-of-truth:** METHODOLOGY-MAP.md §Gap audit. If a gap is closed or re-prioritised, edit there first; mirror here.

---

## 2. Test additions (post-v1.0 forensics)

New tests not in the methodology-framework gap list above. Surface as the battery's coverage is exercised against new fixtures or beta data.

### 2.1 Rectangular Blocked Mahalanobis

**What:** Generalise the existing Blocked Mahalanobis (row-blocks, all-column) to **row × column rectangular blocks**. Scan rectangular subregions; per block, test whether the joint distribution across the block's columns differs from the surrounding data.

**Why:** Current Blocked Mahalanobis catches row-block fabrication when the signal pools across all columns. A fabricated insert spanning only a subset of columns (e.g. 3 of 8 columns × 20 rows) would not surface above the column-pooled noise. DupDet block-copies catches rectangular blocks but on exact-identity signal only — won't see a rectangular block with anomalous *joint* distribution where individual values don't duplicate anything else.

**Forensic targets:**
- AI-generated rectangular inserts (synthetic block pasted into otherwise-real data)
- Quilted fabrication (dataset assembled from blocks of multiple sources)
- Plate-region fabrication where a contiguous row × column corner is generated under different parameters

**Statistic sketch:** Per candidate rectangular block: within-block-vs-outside-block statistic on (a) covariance structure via eigenvalue ratio λ_max(Σ̂_B Σ̂_{rest}⁻¹) with Ledoit-Wolf shrinkage, (b) marginal distribution shape via per-column KS or AD, (c) joint distribution shape via energy distance or kernel two-sample. Permutation null shuffles rows and columns independently to preserve marginals while breaking joint structure. BH-FDR across the candidate block set.

**Challenges:**
- **Search space** O(R²·C²) raw → needs integral-image cumulative Σ tricks or fixed-aspect-ratio scanning at multiple scales.
- **Multiple testing** — effective number of tests scales with R·C; floor on adjusted p-values may force a Tier 2 effect-size gate at moderate-N.
- **Null model** — row-shuffle + column-shuffle preserves marginals but breaks within-block joint structure. Needs verification this null isn't too easy to beat on real heterogeneous data (e.g. genomics where columns naturally cluster).
- **Relationship to Blocked Mahalanobis** — could be a generalisation (Blocked Mahalanobis = special case of column-set = all columns) or a separate test with its own card. Decision before implementation: sharing a test card saves UI clutter; underlying mechanism is meaningfully different.

**Effort:** ~200–300 lines + integral-image scaffolding + decision on aspect-ratio scan policy. Larger than most Item 8 / Track E additions.

**Priority:** Adjacent to AI Screening mode value — catches AI block-insert patterns that the current battery misses. Bank for v1.x.

### 2.2 Coherence-cleanup residue from Track A

Track A (METHODOLOGY-MAP §Inconsistencies to fix) listed coherence cleanups, some of which may not have landed in the v1.0 push. To audit against current source before v1.x scope:
- Mahalanobis Bonferroni → BH-FDR (per-row p-value correction)
- CCR ρ₀ heuristic → LOO alternative (per METHODOLOGY.md §1.5)
- ConstOffset expansion to all column pairs (not just replicate pairs)
- Runs + Row-Mean Runs escalation rule → unify on sub-unit BH-FDR promotion

**Source-of-truth:** METHODOLOGY-MAP.md §Inconsistencies to fix + ROADMAP.md Track A. Verify-at-source before banking for v1.x.

---

## 3. Variance-estimator unification

The battery has roughly twelve tests that each compute their own residual-or-variance estimate. Each picks the residual operator, centring scheme, VST routing, outlier-resistance, and minimum-N gate that fit its forensic target. The cost: "SD" means different things across test cards, cross-test convergence operates on standardised p-values rather than effect sizes, and beta users can't easily reason about why one variance-touching test fires and another doesn't.

ROADMAP Track F originally scoped this as "unified SD scan, larger Code refactor, deferred." Re-scoped here as a broader methodology surface.

### 3.1 Catalogue

A `docs/shared/VARIANCE-ESTIMATORS.md` audit document, one row per variance-touching test. Columns: residual operator (between-replicate `d_i` vs within-row vs LOESS-detrended vs condition-centred vs raw); centring (row-mean / condition-mean / global-mean / LOESS-trended); VST routing (TRANSFORMED 13-test set vs RAW 14-test set per METHODOLOGY-MAP); outlier-resistance (plain SD / MAD-floor / winsorised / Ledoit-Wolf / binned mean-variance-fit); minimum-N gate.

Twelve tests in scope: Within-Row Variance, Regional Noise, Selective Noise, LOESS Residual, Mean-Variance Noise Scaling, Mahalanobis Row Outlier, Blocked Mahalanobis, Cross-Cond Consistency P5 + P6, Autocorrelation, Kurtosis + AD, IRC.

**Deliverable:** the audit table. Useful for the review paper's methods section regardless of whether a refactor follows. Chat-side authoring; no engine changes.

### 3.2 Scoped sub-refactors

From the catalogue, identify which combinations are **forensically forced** (different residual / centring / VST is needed for the test's target signal) vs which are **calibration artefacts** that could converge to a shared helper. The likely structure of the refactor:

- One shared helper per **residual-operator family** (between-replicate `d_i`, within-row, condition-centred, LOESS-detrended).
- Tests within the same family share centring, VST, and resistance scheme; tests across families don't.
- Result: 4–5 helpers replacing ~12 inline computations, without forcing tests to lose their forensic-specific characteristics.

**Effort:** Audit catalogue (one Chat session, ~30 min). Refactor scope dependent on what the catalogue reveals — probably 2–3 scoped sub-sessions for the calibration-artefact cases, not one mega-refactor.

**Priority:** Catalogue first because it's the cheap, high-information artefact, useful for the review paper. Refactor scope decision after.

### 3.3 Original Track F scope — Unified SD Scan

Lifted from ROADMAP Track F (archived). The original Track F was a specific worked example of a §3.2 sub-refactor: merge Selective Noise + Regional Noise + LOESS into a single three-way Dim III sub-group B scan. Preserves all granularities under one framework with coherent nulls. MeanVar and WRV stay separate. Post-merge target: 3 tests in Dim III sub-group B (MeanVar, Unified SD Scan, WRV).

Whether the original Track F is still the right merge depends on the §3.1 catalogue findings. The three tests share a residual-operator family (between-replicate `d_i`) and are obvious merge candidates on residual definition, but they differ on scanning structure (column-wise pooled vs window-scanned vs LOESS-detrended-window) and on null model (Bartlett analytic vs permutation row-shuffle vs permutation within-segment). The catalogue exercise tests whether the differences are forensically forced or calibration artefacts.

---

## 4. AI Screening mode

Mode toggle alongside QC / Peer Review / Forensics. Reframes the tool from "fabrication detection" to "AI-generated content detection" with reweighting + a handful of new tests. The existing battery is already substantially sensitive to AI data; the new mode adds AI-specific tests and reweights existing ones for the new forensic target.

Source: S125 chat (~late March 2026). Spec transcribed faithfully below.

### 4.1 Existing-test AI-detection efficacy ranking

The 27-test battery against three AI-generation regimes (LLM-prompted, distribution-sampled, GAN/TVAE):

**Tier 1 — strong AI detection without modification:**

| Test | LLM | Sampled | GAN | Note |
|---|---|---|---|---|
| Benford 1st | ★★★ | ★ | ★ | LLMs distort hard; sampling preserves if real data was Benford |
| Benford 2nd | ★★★ | – | ★ | LLM-specific; sampling and GAN preserve |
| Terminal Digit | ★★★ | – | ★★ | LLMs over-emit 0 and 5 catastrophically |
| Decimal Precision | ★★★ | ★★ | ★★ | LLMs flip precision arbitrarily; samplers default to float64 ugliness |
| VFS | ★★★ | – | ★★ | LLMs emit "anchor values" disproportionately |
| Duplicate Detection | ★★ | – | – | LLMs occasionally repeat |
| Mahalanobis | ★ | ★★★ | ★★ | Sampling-from-marginals destroys joint structure |
| Cross-Cond Rank | ★ | ★★★ | ★★ | Same — joint failure |
| Mean–Variance | ★ | ★★★ | ★★ | Sampled-Normal lacks the scaling real count data has |
| Autocorrelation | – | ★★★ | ★★ | i.i.d. sampling kills autocorrelation real time-series has |
| Kurtosis | ★★ | ★★ | ★★ | Distribution shape mismatches ubiquitous in AI data |

**Tier 2 — fire on AI data for non-AI-specific reasons (already work for fabrication; they happen to work for AI too):**

| Test | Note |
|---|---|
| IRC, Replicate Noise Shape | AI-generated replicates often look "too clean" (HIGH) or "wrong-shape clean" |
| Selective Noise, Regional Noise, LOESS | LLMs producing replicates row-by-row create regional discontinuities |
| Runs, Row-Mean Runs | LLMs generating "in batches" leave block signatures |
| Constant Offset | LLMs sometimes fall into multiplicative scaling between conditions |

**Tier 3 — don't really help for AI detection (stay in battery for fabrication mode, deprioritised in AI mode):**

- **Carlisle Balance** — works for randomisation testing but doesn't distinguish AI from real (AI mimics randomisation reasonably).
- **Modality** — too conservative on small N to surface AI mode collapse.
- **Cross-Cond Consistency** — designed for fabrication detection across conditions; AI rarely produces that pattern.

**Implication:** the existing battery is genuinely sensitive to AI data. Severity 2–3 on synthetic data is essentially guaranteed unless the generator is unusually careful. The new tests below sharpen rather than enable AI detection.

### 4.2 New tests for AI detection

Five proposed additions, ordered by ROI.

#### 4.2.1 Round-number frequency (Tier 1 confidence, easy implementation)

- **What:** Count values ending in `.00`, `.50`, `.25`, `.75`, `.10`, etc. Compare to expected frequency under the column's distribution.
- **Why:** LLMs over-emit "round" numbers because their training corpus is full of them. Real continuous measurements don't cluster on these.
- **Statistic:** χ² test of observed vs expected round-number rate. Calibrate "expected" via Monte Carlo from the column's empirical distribution.
- **Catches:** LLM-generated almost universally; GAN/TVAE rarely; sampled-Normal never.
- **Effort:** ~30 lines. Plugs into Dimension II (Unusual Digits) or new Dimension VI (AI Patterns).

#### 4.2.2 Anchor-value detection (Tier 1, medium implementation)

- **What:** Find values that appear with frequency far exceeding expectation under any plausible parametric fit. Distinct from VFS — VFS catches spike repetition; this catches single-value over-emission.
- **Why:** LLMs latch onto "anchor values" — `100`, `0.05`, `1.0`, common references in their training. Real data may have natural anchors (e.g. assay-detection thresholds) but their density distribution differs from LLM anchors.
- **Statistic:** Likelihood ratio comparing the empirical frequency of each value to its expected frequency under a smoothed kernel density estimate of the column.
- **Catches:** LLM-generated; not sampled or GAN.
- **Effort:** ~60 lines + KDE. Plugs into Dimension II.

#### 4.2.3 Conditional-independence test (Tier 1 for sampled, harder)

- **What:** Given expected pairwise dependencies (provided by user or inferred from a reference dataset), test whether observed dependencies match. For 3-way conditional independence, partial-correlation tests.
- **Why:** Sampling-from-marginals catastrophically fails this. GAN/TVAE partially fails. Real data rarely fails by accident.
- **Statistic:** Partial correlation tests with BH-FDR across all pairs/triples. Or: train a small predictive model (linear regression) on a known-real reference and compare residual distributions.
- **Catches:** Sampled-from-marginals; GAN/TVAE somewhat; LLM somewhat.
- **Effort:** ~150 lines + decisions on what counts as "expected dependencies". Needs UI for user to mark expected correlations or upload a reference dataset. Significant scope.
- **Risk:** Without ground-truth dependencies, the test is hard to calibrate. May produce confused results on novel datasets.

#### 4.2.4 Compressibility / Kolmogorov-complexity proxy (Tier 2, easy)

- **What:** Compress the dataset. Compare compressed-size ratio against a reference distribution.
- **Why:** AI-generated data is more compressible than real data — generators have lower-entropy output than physical measurement processes.
- **Statistic:** gzip-ratio of value sequence vs gzip-ratio of equivalent-distribution scrambled control.
- **Catches:** All AI regimes weakly. Not diagnostic alone but adds signal.
- **Effort:** ~20 lines. Plugs into Dimension VI as a "global AI signature" test.
- **Caveat:** noisy. Many real datasets are also compressible (low-entropy phenomena). Treat as low-weight.

#### 4.2.5 Membership-inference test (v1.x stretch, complex)

- **What:** Given access to a possible training corpus (real reference data), test whether candidate rows leak training-set membership.
- **Why:** GANs and especially overtrained models leak. Membership inference tests detect this.
- **Statistic:** Density-based: candidate rows that lie suspiciously close to reference rows in feature space.
- **Catches:** GAN/TVAE generated from a known training set.
- **Effort:** ~300 lines. Needs reference-dataset upload UI. Probably v1.2+.

### 4.3 Mode surfacing

**Mode toggle in UI:** alongside QC / Peer Review / Forensics, add `AI Screening`. Mode reweights existing tests + enables the new tests.

**Reweighting layer:**
- Tier 1 AI tests: severity-2 weight (each contributes more to verdict).
- Tier 2 AI tests: standard weight.
- Tier 3 AI tests: deweighted to 0.5×.
- New tests: tier-1 weight.

**Verdict copy:**
- Forensics mode: "Several unusual patterns detected — High."
- AI Screening mode: "Strong signatures of AI-generated content" / "Patterns consistent with synthetic data" / etc.

**Test-card relabelling:** under AI Screening mode, test cards prefix with the relevant AI signature. "Benford 1st digit — LLM digit-bias signature" rather than "Benford 1st digit — fabrication digit-bias signature".

**Documentation:** AI-detection report-mode produces a different prose summary tying findings to known AI fingerprints.

### 4.4 Implementation phases

Three phases, each shippable independently.

**Phase 1 (v1.1 candidate, single session): Reweighting + mode toggle.** Add `AI Screening` mode to mode selector. Reweighting layer applied to existing tests. Verdict + card copy reflavoured for AI mode. No new tests yet. Marketing reframe alone is significant — any researcher worried about ChatGPT-fabricated peer review supplements becomes a user. Effort: ~1 week.

**Phase 2 (v1.2): New tests 4.2.1, 4.2.2, 4.2.4.** Round-number frequency, anchor-value detection, compressibility. All lightweight additions to Dimensions II / new Dimension VI. Catches the 5–10% of LLM-generated cases that slip past the original battery. Effort: ~2 weeks.

**Phase 3 (v1.3+): Conditional-independence (4.2.3), membership inference (4.2.5).** Heavy additions; scope significantly larger. Requires UI for reference datasets / expected dependencies. Distinguishes between AI regimes — upgrades the tool from "AI suspicion" to "AI generator class identification". Effort: ~4–6 weeks.

### 4.5 Validation requirement

Before shipping any AI mode, build a test suite with known AI-generated fixtures:
- **DS-AI-LLM** — ChatGPT-generated experimental dataset matching DS01's structure.
- **DS-AI-SAMPLED** — fitted-Normal sampling from DS01's marginals.
- **DS-AI-GAN** — TVAE/CTGAN-generated using DS01 as training data.
- **DS-AI-DIFFUSION** — diffusion-tabular variant if practical.

Validate that each fixture trips the AI mode at severity 2–3 while real DS01 stays at severity 0. Ground truth for AI tests parallel to TEST-GROUND-TRUTH.md for fabrication tests.

**Critical:** the AI fixtures need to match the structural complexity of real fixtures. A trivially-bad LLM dump isn't representative. Use careful prompting + iteration to produce LLM data that looks plausible at glance.

### 4.6 Risks

- **Distribution-shift fragility.** AI generators evolve. GPT-4's signature differs from GPT-5's. Tests calibrated against today's models may miss tomorrow's. Mitigation: explicit version annotations; retest annually.
- **False positives on real data with AI-similar properties.** Some legitimate datasets are i.i.d., over-rounded, or low-entropy. Could create false alarms. Mitigation: AI mode is screening, not verdict; recommends investigation, not flagging.
- **Adversarial cat-and-mouse.** Once AI Screening is public, fabricators with AI tools optimise around the tests. Mitigation: keep some tests behind the scenes, rotate weights, treat as moving target.
- **Audience confusion with fabrication mode.** Both modes flag suspicious data; users may not understand the distinction. Mitigation: explicit mode-selection prompt at upload — "Are you screening for fabrication, or AI-generated content?"

---

## 5. Calibration / methodology audits banked

Discrete audit items, lower-effort than the test additions above. Each has a clear scope and a clear "done" state.

### 5.1 Permutation calibration B = 999 → 9999

STATUS parked #8. Permutation tests across the battery use B = 999 because BH-FDR adjusted-p floor scales as 2m/(B+1). Increasing to B = 9999 lowers the achievable adjusted-p floor by 10× — relevant for tests where the current floor sits just above the α = 0.001 HIGH threshold. Co-session work: identify which tests genuinely benefit (Constant-Offset Blocks, Regional Noise, Windowed Autocorrelation, Windowed ICC, LOESS Residual Analysis, Residual Spike Correlation, Cross-Condition Consistency framework). Effort: per-test calibration + batch re-verification.

### 5.2 Severity-formula diversity metric reconsideration

Track C's dimension-based severity formula caps one-dimension fabrications at severity 2 absent HIGH + cross-dim MODs. DS15 is the only current fixture instance. Question: is the diversity-metric framing the right way to model multi-dimension convergence, or does it under-call genuine single-dimension fabrication signals? Pair with §5.5 (assay-aware severity weighting) when revisited.

### 5.3 Modality test plot upgrade

STATUS parked #7. Current Modality plot is the Hartigan dip number; replacement is a per-column histogram with peaks marked. UI refinement, not methodology change. Lands in any Modality-card-touching session.

### 5.4 Large-N effect-size gate audit

Lifted from ROADMAP Track G (archived). Six tests currently lack calibrated effect-size gates at N ≥ 500: First-Digit Frequencies, Last-Digit Frequencies, Runs, Row-Mean Runs, Decimal Places, Mean-Variance. At large N, the p-value floor crashes toward zero on minor structural deviations that aren't forensically meaningful, producing low-severity flag noise on otherwise-clean fixtures. The fix is a per-test effect-size threshold below which the p-value alone does not promote severity — same shape as the existing Tier 2 gates on Bartlett (variance ratio), Mahalanobis (distance), and Carlisle (KS distance).

**Approach:** Chat analysis to identify the right effect-size metric per test (e.g. for First-Digit Frequencies, MAD vs χ²-statistic-normalised-by-N; for Runs, observed-vs-expected runs ratio in absolute units). Calibrate the threshold against the 22-fixture batch (clean fixtures should not flag; fabricated fixtures should). Code calibration after spec lands.

**Effort:** Chat analysis ~1 session per test, calibration ~1 session for all six in a batch pass.

### 5.5 Assay-aware severity weighting

Lifted from ROADMAP Item 5 (archived). eDNA PCR clean fixtures rate SERIOUS because instrument artifacts (Terminal Digit quantisation from PCR cycle-threshold integer rounding, Decimal Precision float32/64 concatenation patterns, Mahalanobis well-failure outliers) promote severity equally with genuine fabrication signals. The current battery doesn't distinguish artifact-driven flags from fabrication-driven flags within the severity formula.

**Design:** `artifactType` flag on test results — `"instrument"` / `"fabrication"` / `"ambiguous"`. Instrument-flagged results contribute to severity at reduced weight (e.g. don't count toward cross-dimension promotion). Depends on Data Type × Assay Type two-axis input (already complete) to determine which tests are instrument-sensitive on which assay types.

**Acceptance criteria (from original ROADMAP Item 5):**
- eDNA PCR clean fixture: drops from SERIOUS to MINOR or CLEAN.
- DS08 ELISA fabricated: no change (genuine signals not demoted).
- Pruitt Activity: no change (genuine signals).

Pair with §5.2 (severity-formula diversity metric) when revisited — both touch the severity formula and benefit from a single design pass.

### 5.6 LOESS Residual full-recursive binary segmentation

Lifted from ROADMAP Item 6c (archived); referenced in STATUS as an accepted limitation. Current LOESS Residual changepoint detection uses a single-pass CUSUM with secondary changepoint detection that's unreliable in dual-boundary cases (partial fabrication bounded on both sides — fabricator inserts a smooth region in the middle of otherwise-noisy data). The forensic target is the dual-boundary case: detect both the entry and exit of a fabricated region.

**Design:** Replace single-pass CUSUM secondary-boundary heuristic with full recursive binary segmentation (WBS — wild binary segmentation, or PELT — pruned exact linear time). WBS is the lighter implementation; PELT is more rigorous on changepoint cost calibration. Either replaces the unreliable secondary changepoint with principled multi-boundary detection. Within-segment permutation null becomes per-segment rather than global.

**Effort:** ~150–200 lines + permutation-null adaptation for per-segment scope. Validation against DS08 (single changepoint, current pass works) + a synthetic dual-boundary fixture (would need authoring).

**Priority:** Open since the original v0.7 → v1.0 plan. Accepted limitation in current battery; not blocking v1.0. v1.x candidate when LOESS-card-touching work lines up.

### 5.7 Terminal Digit directional statistic

Lifted from ROADMAP Item 6a (archived). Terminal Digit currently fires an omnibus χ² that conflates two distinct mechanisms: **digit excess** (instrument quantisation — ELISA float→int rounding over-emits 0/5, PCR Ct integer-cycle rounding, plate-reader gain steps) and **digit avoidance** (human fabrication — the Mosteller-Wallace signature where fabricators under-emit digits they associate with "obvious patterns"). The two have opposite forensic interpretations but produce the same omnibus test verdict.

**Design:** Replace the omnibus χ² with a directional statistic — two one-sided sub-tests on the same per-digit frequency vector, evaluated against the uniform-digit null. Verdict text and severity attribution become "excess" vs "avoidance" rather than a single "digit-frequency anomaly" verdict.

**Priority:** Open, low priority. Methodology refinement, not a coverage gap. Lands when a Terminal-Digit-card-touching session lines up.

### 5.8 Genomics raw-count normalization advisory

Lifted from ROADMAP Item 6e (archived). Genomics-typed datasets often arrive as raw unnormalised counts (large dynamic range, integer, library-size-dependent). The current battery runs the genomics test set on those raw counts directly, even though the data really wants normalisation (DESeq2's size-factor model, edgeR's TMM, or similar) before downstream distributional tests fire meaningfully.

**Design:** Import-time advisory triggered when the assay type is genomics AND the data shape looks like raw counts (integer, several-OOM dynamic range, no obvious prior normalisation). Surface a one-line warning in the import flow ("This looks like raw RNA-seq counts. Consider normalising with DESeq2 / edgeR before analysis."); user confirms or overrides. Not a hard block — the tests still run, the warning just frames interpretation.

**Priority:** Open, low priority. Import UX advisory. Distinct from §5.5 (assay-aware severity weighting) — that's a severity-formula change; this is a pre-flight user-confirmation prompt.

---

## 6. Cross-references — source-of-truth for each topic

When updating these surfaces, edit the source-of-truth first and mirror here.

| Topic | Source-of-truth | This doc's role |
|---|---|---|
| Methodology framework gap audit (§1) | METHODOLOGY-MAP.md §"Gap audit" | Mirror only |
| Track A coherence cleanup (§2.2) | METHODOLOGY-MAP.md §"Inconsistencies to fix" | Mirror + audit-current-state-before-banking. Most of Track A landed S95; verify residue at source. |
| Variance-estimator unification (§3) | This doc | Primary scope; absorbs original ROADMAP Track F narrow scope (§3.3) plus broader audit framing (§3.1, §3.2). |
| Rectangular Blocked Mahalanobis (§2.1) | This doc | Single source |
| AI Screening mode (§4) | This doc | Single source. Original S125 chat history preserved as reference but no longer load-bearing. |
| Permutation B = 9999 (§5.1) | STATUS parked #8 | Mirror |
| Severity-formula diversity metric (§5.2) | This doc | Primary scope; pairs with §5.5 |
| Modality plot upgrade (§5.3) | STATUS parked #7 | Mirror |
| Large-N effect-size gate audit (§5.4) | This doc | Primary scope; absorbed from ROADMAP Track G |
| Assay-aware severity weighting (§5.5) | This doc | Primary scope; absorbed from ROADMAP Item 5 |
| LOESS recursive binary segmentation (§5.6) | This doc | Primary scope; absorbed from ROADMAP Item 6c |
| Terminal Digit directional statistic (§5.7) | This doc | Primary scope; absorbed from ROADMAP Item 6a |
| Genomics raw-count normalization advisory (§5.8) | This doc | Primary scope; absorbed from ROADMAP Item 6e |
| Long-format detection (Archetype 4) | STATUS parked #12 | Source-of-truth at STATUS; ROADMAP Track H (archived) carried fuller detail — Nick's call whether to expand STATUS #12 |

**ROADMAP.md status:** retired. Was archived as historical record of the v0.7 → v1.0 feature plan (S20–S96 era); all open items extracted into this doc and STATUS by retirement. Recoverable from git history (last live at `e3c33ea:docs/shared/ROADMAP.md`).

---

## 7. What's deliberately NOT in this doc

- **v1.0 work in progress.** A1.D3, Phase A2.5 Bik violations, etc. → STATUS.md.
- **v1.0 UI polish backlog.** Per-arc session follow-ons, parked items in the v1.0 punchlist → STATUS.md.
- **Implementation details for tests that have landed.** → METHODOLOGY.md per-test sections.
- **Real-data benchmark + lab beta tracks.** → STATUS.md parked #5, #6.
- **Onboarding / Phase C-lite.** → STATUS.md parked #2 (blocker).
- **Review-mode redesign (Phase B).** → STATUS.md parked #3.
- **AI consultation prompt for v1.0 (§4 prompt body).** Different surface — that's the existing Forensics-mode AI handoff, not AI Screening mode. Landed via A1.D2 / S161 / S162a / S162b / S162b-fix.

If a v1.x topic surfaces that doesn't fit any section above, add a new section here rather than splitting across surfaces.

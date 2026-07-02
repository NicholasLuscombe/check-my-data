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
| Test additions (post-v1.0 forensics) | Rectangular Blocked Mahalanobis; genuine-block detection; coherence-cleanup residue; column-localised sequential duplication detector; role/condition inference for real-world column shapes; **test-consistency audit beyond the closed item-28 audit (§2.6)** | New scope, this doc |
| Variance-estimator unification | Catalogue + scoped sub-refactors | Extends ROADMAP Track F; related to §2.6 (same forced-vs-artefact discipline) |
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

### 2.2 Blocked Mahalanobis genuine-block detection

**What:** Replace the fixed-window sliding scan (W = 30, stride = 10) with changepoint / variable-extent block detection, so the flagged block reflects the *true* boundaries of the anomalous (μ, Σ) region rather than whichever fixed 30-row window caught the most signal.

**Why:** The current scan reports *where* an anomaly sits but not its real *extent* — the flagged window is a fixed-width artefact of the stride, not the boundaries of the fabricated block. Surfaced S187 (DS21 Blocked Mahalanobis): the card reports a 30-row window because that's the scan resolution, not because the block is 30 rows.

**Statistic sketch:** changepoint detection on the windowed (μ, Σ) scan statistic (WBS or PELT, as in §5.6's LOESS treatment) to locate the entry/exit of the anomalous regime; report the detected block boundaries with the joint-distribution statistic over the detected extent.

**Relationship:** sits with §2.1 (rectangular Blocked Mahalanobis) — §2.1 generalises the *column* axis (subset of columns), this generalises the *row* axis (true extent vs fixed window). Both are Blocked-Mahalanobis extensions; decide at implementation whether they share a card.

**Priority:** Bank for v1.x. (STATUS parked #50.)

### 2.3 Coherence-cleanup residue from Track A

Track A (METHODOLOGY-MAP §Inconsistencies to fix) listed coherence cleanups, some of which may not have landed in the v1.0 push. To audit against current source before v1.x scope:
- Mahalanobis Bonferroni → BH-FDR (per-row p-value correction)
- CCR ρ₀ heuristic → LOO alternative (per METHODOLOGY.md §1.5)
- ConstOffset expansion to all column pairs (not just replicate pairs)
- Runs + Row-Mean Runs escalation rule → unify on sub-unit BH-FDR promotion

**Source-of-truth:** METHODOLOGY-MAP.md §Inconsistencies to fix + ROADMAP.md Track A. Verify-at-source before banking for v1.x.

### 2.4 Column-localised sequential duplication detector

**What:** A test targeting a sequential run of N identical (or matching) values within a single column, regardless of what the row's other columns contain — distinct from whole-row or whole-block duplicate detection.

**Why:** Confirmed gap via the S292 real-world corpus run (CORPUS-01, Sampson et al. *Cell* 2016 — Dryad `dryad.4mp6h`). The documented defect (two 5-value sequential runs in the adhesive-removal column, shared between SPF and ExGF mice, plus a 3-value run in germ-free wild-type pole-descent data) is hand-verified present in the raw data (and independently documented in the paper's PubPeer thread, comment #15), but none of Exact Duplicate Detection's four sub-tests are built to catch it:
- Test 1 (value-level collision) rewards raw frequency, not order or position — a 5-in-a-row match scores the same as five unrelated chance collisions.
- Test 2 (identical row vectors) requires the *entire* row to match; here only one of four columns matches between occurrences.
- Test 3 (within-row column-pair coincidences) is the wrong axis — compares columns within a row, not values across rows.
- Test 4 (block-copy) extends Test 2's whole-row matching over a window of h consecutive rows; still requires whole-row identity per row in the block.

This is a designed gap, not a calibration miss — by the methodology as specified, no existing sub-test targets "a contiguous same-column run, independent of other columns." Markus Englund's `copy-paste-detective` (the source of this corpus's third-party ground truth) treats this as its own pluggable strategy (`repeatedColumnSequences`), separate from his `duplicateRows` strategy — external validation that this is a genuinely distinct detection target, not something foldable into existing sub-tests.

**Forensic targets:**
- Sequential block duplication across row-groups that should be independent (the CORPUS-01 pattern — copy-paste within one column, possibly to pad or substitute missing measurements)
- Single-column copy-paste that wouldn't trip row-level or block-level detectors because surrounding columns are independently real

**Statistic sketch:** Not yet designed. Candidate starting point: scan each column for runs of length ≥3 with the same value (or sequence of values) recurring elsewhere in the column, order-preserved; null model needs to handle both row-order-arbitrary and row-order-meaningful cases (cf. Test 4's Bonferroni-over-search-volume approach as a starting template, adapted to single-column scope). Needs its own design pass — do not assume Test 4's null transfers directly, since the search volume and matching unit differ.

**Relationship to existing tests:** Sits in Copy-Paste-Edit / Structural Anomaly Detection alongside Exact Duplicate Detection — likely a sibling test/card rather than a fifth sub-test bundled into Exact Duplicate Detection's existing BH-FDR combination, since it has a genuinely different null and search space. Decide at implementation.

**Source:** `SESSION292-CHAT-SUMMARY.md` (corpus run finding), `REALWORLD-CORPUS-SPEC.md` CORPUS-01 entry, `METHODOLOGY.md` §1.1 (confirms all four existing sub-tests' actual mechanisms).

**Priority:** Real-world-validated gap, not speculative — found via external data, not constructed fixtures. Bank for v1.x; candidate for elevation if the review paper's real-world section needs to name a known-and-disclosed coverage gap rather than present sensitivity as unqualified.

### 2.5 Role and condition inference for real-world column shapes

**What:** Make `inferRoles` (and the condition-context build it feeds) robust to column shapes that real external data carries but the fixture suite never exercises — numeric identifier columns, cycling index columns, and high-cardinality label columns that define many comparison groups. Not a single test; a fix to the structure-inference layer every test depends on.

**Why:** Two of three S292 Tier-1 corpus runs were corrupted by the same inference gap, seen from opposite sides (Code read-only `S292-ROLE-INFERENCE-SCOPE`, source-cited):

- **CORPUS-03 (clonal fish):** `inferRoles` classified `Fish.ID` (block-repeated integer group IDs: `5,5,5,5,6,6,6,6,…`) as a *data* column and dropped `Obs` (the cycling 1–4 index). Result: nearly every cross-replicate test ran on a meaningless ID column compared against real measurements, producing a severity-3 verdict with broad collateral flags. The documented SL-duplication defect could not be cleanly adjudicated because Exact Duplicate Detection's HIGH conflated Fish.ID's innocent 4×-repetition with the real defect.
- **CORPUS-02 (ostrich/snake):** A `Recombinant Protein` column with ~90 distinct species/genotype labels (2–3 replicates each) resolved to `conditionType: none`, so Mahalanobis Row Outlier and Blocked Mahalanobis pooled one (μ,Σ) across all ~90 groups — making ordinary between-species biological variation read as multivariate outliers.

**Root cause (source-confirmed).** `inferRoles` (`src/import/roles.js`) recognises a numeric column as non-data only two ways: a fixed header-keyword prefix list (`id`, `obs`, …) and a strictly-incrementing +1 run. Block-repeated group IDs (one increment per group) and cycling indices both score far below the +1-run gate and match no keyword unless the header happens to be listed — so they fall through to `"data"`. For text columns the condition test is `uniq.size <= 20 && uniq.size/sample.length < 0.3`; a ~90-group design fails both gates (distinct count over the ceiling, ratio over the cap at 2–3 reps), so the grouping column reads as a `"label"` identifier — the assumption is inverted (many distinct values treated as the signature of an identifier, exactly wrong for a many-group design). When `conditionType: none`, Mahalanobis pools across all rows (`engine.js` dispatch + `mahalanobis.js:68`). No fixture exercises either shape — all 23 fixture headers checked.

**Shape of the work (scoped S293 — the spine cost is now on record).** The S293 design read (Code read-only, source-cited) retired the original "narrow heuristic vs broader pass" framing as a false binary. The finding:

- **The two shapes are one defect.** Both CORPUS-03 and CORPUS-02 reduce to the same root: a grouping column the engine fails to recognise as `condition`, so Mahalanobis pools one (μ,Σ) across groups that differ (`mahalanobis.js:68`, reached at `engine.js:405` whenever `rowGroups()` returns null). CORPUS-03's `Fish.ID`-as-`data` is a *second, additive* corruption on top — it also pollutes the data matrix — not a separate problem.
- **Only the cosmetic half is localised.** Routing block-repeated integers and cyclic indices out of `data` into `label` is a clean, fixture-inert addition (sibling to the existing consecutive-run test at `roles.js:17`). But it demotes the column to `label`, **not** `condition` — it stops `Fish.ID` polluting the matrix while leaving `rowGroups()` null and the pooled fallback still firing across fish. The motivating symptom (pooled Mahalanobis across groups) is untouched.
- **The real fix is a discriminator-spine change.** The `condition`/`label` boundary (`roles.js:8`) is defined *solely* by low cardinality (`uniq.size <= 20`). Both corpus shapes sit on the wrong side of that cap by construction (CORPUS-02: ~90 groups; CORPUS-03 block IDs: one distinct value per fish). Making either resolve to `condition` requires introducing a **replicates-per-distinct-value** signal — letting high cardinality at a small fixed replicate count read as grouping rather than identifier. That redefines the exact discriminator separating `condition` from `label`: it is the identifier/grouping distinction itself, structurally entangled, a spine change to the role taxonomy. A build small enough to ship in one session (the integer→`label` relabel alone) closes the cosmetic misclassification while leaving the pooling contamination intact — "fixed without being fixed."
- **The interim escape hatch is `conditionsHint`** (parked, accepted-but-not-wired): a corpus file declaring its structure bypasses inference entirely for declared columns. This is the near-term CORPUS-03 unblock; the spine fix is the durable repair. A CORPUS-03 row produced via the override must be disclosed in the paper as declared-structure, not unaided inference. CORPUS-02's pooling, by contrast, has no interim override in this session's scope and stands as a disclosed coverage gap (the engine pools across many groups when no low-cardinality condition column is present).

**Regression tripwire for any eventual build:** the Shape-A integer detector must key on *contiguous monotonic blocks* (runs of equal values, one level-change per group boundary, `distinct ≈ run-count`), NOT on repetition or low cardinality — `14-crctest-survey.csv`'s Likert Q-columns (integers 1–5, non-contiguous) are legitimate `data`, and a naive low-cardinality key would wrongly capture them. The full role-assignment decision structure and the role→conditionType→pooling chain are mapped in the S293 design read (banked in the session summary) — that map is the classification a spine pass would build on, so the broad work, when it happens, starts from a source-grounded taxonomy rather than re-deriving it.

**Relationship to §2.6 (consistency audit).** This entry's pooled-Mahalanobis half — the engine pooling one (μ,Σ) across unrecognised groups — is a cross-condition-pooling instance, the same failure family the *closed* item-28 integrity audit was built around; the role-inference half is upstream of it (garbage-in from column misclassification). §2.6 is the v1.x home for the consistency failure modes that audit did *not* cover (cross-column pooling, null construction, evidence/display). §2.5 stays the single source for the role-inference fix specifically.

**Priority:** Real-world-validated, blocks adjudication of at least one corpus dataset (CORPUS-03 cannot enter the paper's results table until resolved). CORPUS-03's Fish.ID-as-data is the more urgent half — it silently changes which columns the whole battery runs on, with no visible tell, whereas CORPUS-02's `conditionType: none` at least surfaces in the structure metadata. **Status (S293):** scope decision made — the spine fix is re-scoped to a dedicated v1.x arc and was NOT built this session, because the S293 design read established that any build small enough to ship this session closes the cosmetic misclassification while leaving the pooling contamination intact ("fixed without being fixed", in Code's words). CORPUS-03's near-term unblock routes through `conditionsHint` instead (wired S293, batch-proven inert); the durable fix is the discriminator-spine change described under "Shape of the work" above.

**Source:** `S292-ROLE-INFERENCE-SCOPE` (Code read-only diagnostic), `SESSION292-CHAT-SUMMARY.md`, `REALWORLD-CORPUS-SPEC.md` CORPUS-02 / CORPUS-03 entries.

### 2.6 Suite-wide test-consistency audit — extension beyond the closed condition-pooling audit

**What:** A v1.x audit pass covering test-consistency failure modes that the suite's *closed* test-integrity audit (item 28, S176–S183) did not examine — surfaced by the S293 CORPUS-03 re-run. Three demonstrated axes, all real-world-validated on one dataset, plus a short seed list of candidate further axes. Produces a classification artifact before any fix, in the same catalogue-first shape the closed audit and §3 both used.

**Relationship to the closed integrity audit (item 28) — this is NOT a resumption.** The S176–S183 test-integrity audit ran all four phases (Phase 0 gate-hardening S177; Phase 1 contamination sweep S178; A1 distribution-shape routing fix S179; Phase 2 per-cluster correctness S183) and **closed** — `TEST-INTEGRITY-AUDIT.md` is archived and untracked at `docs/shared/archive/`, closing line "STATUS item 28 closed." Its predicate was explicitly **cross-condition pooling only** (the S127 shape: moments/distributions/covariance/scale on raw values pooled across conditions without removing condition structure, or row-order assumptions). The CORPUS-03 axes below sit **outside** that predicate — they are cross-*column* and null/dispatch/display failure modes the condition-pooling sweep was never scoped to catch. So §2.6 is **new scope adjacent to a closed audit**, not a reopening of it. The audit's one live carry (item 32: Noise Scaling's column-grouped-multi-condition axis and Within-Row Variance, both fixture-gated, neither a CORPUS-03 axis) is noted here only so it isn't orphaned — it belongs to the same consistency neighbourhood but is a separate, pre-existing thread.

**The three demonstrated axes (CORPUS-03, S293, source-traced).**

1. **Cross-column pooling that manufactures a guard-passing property — Benford false positive.** Benford fired HIGH on the pooled two-column matrix `[SL, Total.distance]` (`matrix.flat()`), where the ≥1.5-OOM span that *lets Benford run at all* was supplied entirely by `Total.distance` (OOM 1.69); SL alone (OOM 0.095) is N/A by Benford's own span guard. A per-column digit test run on a cross-column pool, where the pool lends one column the precondition it individually fails → a false positive, propagated into the dataset verdict via convergence (one of the four HIGHs driving severity-3). The closed audit cleared Benford on the *condition* axis ("scale-invariant to condition shifts") and Phase 0's pooled-column pass only checked for contamination FPs on *clean* fixtures — the span-borrowing mechanism across columns was never enumerated. **New.**

2. **Continuous-branch HHI null — a counterexample to a recorded "safe" claim.** Exact Duplicate Detection rated CORPUS-03's structured exact 4×-recurrence on SL as LOW (p=1.0): Test 1's collision null is the empirical HHI of the column's *own* value-frequency distribution, so a defect that inflates value frequencies inflates its own null baseline (expected collisions ≥ observed → p=1.0). Tests 2/3/4 are separately neutralised by the co-present, independently-real `Total.distance` column breaking the whole-row/whole-block identity they require. Scoped to SL alone, the engine's *own* block-copy sub-test rates the identical data HIGH (p≈3.6e-14) — the detection capability exists; the null and the multi-column dispatch suppress it. **The pointed part:** METHODOLOGY §1.1 already records the HHI circularity — *but for **integer** data only* — with the parametric collision-null fix wired for integer/N≤5000, and **continuous (dp>0) data documented as safe** (source comment `duplicateDetection.js:135`: "HHI circularity is not a concern for float data"). CORPUS-03's SL is continuous 2-decimal with structured recurrence — it sits squarely in the branch the existing caveat declares safe. So this is not a fresh speculative axis: it is a **real-world counterexample falsifying a safe-claim asserted in both METHODOLOGY §1.1 and source.** (Recorded as a BANKED correction in its own right.)

3. **Display-only scored paths and evidence/verdict misattribution.** Exact Duplicate Detection emits the SL duplicate pairs as evidence via a display-only path (`crossRowSameColLocs`) that feeds no statistic — it *lists* the smoking gun and scores it through nothing. Separately, Terminal Digit and VFS fired HIGH on the recurrence's *digit shadow* (VFS's `pass:"digit"` is a frequency test on fractional substrings; 84 distinct 2-decimal values each stamped ~4× over-represents those substrings), not on independent fabrication signal — so the surfaced evidence ("digit" spikes) misattributes *why* the test fired relative to how a reader interprets it as duplication. The closed audit's premise was the inverse (undeclared *right-reason* channels); neither display-only scoring nor evidence/verdict misattribution was in its method. **New.**

**Candidate further axes (SEED ONLY — unverified, not demonstrated, do not treat as a taxonomy).** Beyond the three demonstrated axes, a structure-first pass over the per-test pipeline (input → unit → guard → null → statistic → correction → tier → convergence → evidence) and the inter-test properties suggests further places a correct statistic could still yield a wrong or non-comparable verdict: multiple-comparison correction-scope consistency (does each test correct over the right family); tier-mapping comparability across tests (the §5.4 large-N blocker is this axis); convergence laundering a mis-tiered flag into the dataset verdict (CORPUS-03's Benford FP is a live instance); inter-test redundancy double-counting one signal as two flags (Terminal Digit + VFS on the same recurrence shadow); shared-helper divergence (the §3 variance/SD-estimator catalogue is exactly this — "SD" meaning different things across cards); determinism/order dependence; boundary handling of missing/tie/zero/negative values. These are hypotheses to *check at source*, not findings — the demonstrated three lead; this list grew on every pass that produced it, which is the standing reason to treat it as a seed for a source-derivation read, not a settled list.

**The adjudication discipline (the project's own, not new).** For each axis the per-test verdict is **forensically-forced vs calibration-artefact** — does the test genuinely need its divergent choice for its target, or is it incidental and reconcilable? This is the closed integrity audit's "S123 Edit D" rule (no fix without a demonstrated artifact: a fixture/shape that false-positives on clean or false-negatives on fabricated), and §3's forced-vs-artefact catalogue is the same discipline applied to the variance axis. The continuous-HHI finding (axis 2) is itself the demonstrated artifact that lifts that null from "recorded safe" to "needs adjudication," exactly as the discipline requires.

**Operating model.** Catalogue-first, structure-first: a source-derivation read of the engine's per-test contracts confirms which axes are real before any classification table; the table precedes any fix; fixes prioritise the false-positive class (axis 1, pooling) ahead of the false-negative class (axis 2, suppressed duplication), since a fabrication-detection tool's costlier error is wrongly implicating a clean dataset. Read-heavy, larger than a session.

**Batch-blindness and fixture follow-on.** All three axes are invisible to the 23-fixture batch by construction (clean, single-magnitude, single-shape fixtures). A follow-on worth naming, not scoped here: a standing **mixed-magnitude / multi-column-shape fixture** so the cross-column-pooling and dispatch-shape classes become catchable in regression rather than only at the next corpus run.

**S295–S296 progress — source-derivation read done, fix-scoping advanced, fixture arc in flight.** The structure-first read the Operating model calls for ran across S295–S296. What it settled, and where the S296 fixture build revised it:

- **Axis 1 (cross-column pooling) — fix shape decided: per-test applicability checks, NOT a shared input-assembly guard.** The three axis-1 tests do not share a poolability predicate. Benford needs generative scale-regime homogeneity (each column a positive-scale multiplicative process with intra-process span ≥1.5 OOM); empirical-HHI needs a non-circularity condition that is not a cross-column property at all (violated by a single column — CORPUS-03's SL alone — with no pooling); Decimal Precision needs one true recording precision across the flattened columns. A column set can satisfy one and violate another, so a shared guard would force a false unification. The read also found a **second axis-1 instance — Decimal Precision Consistency** (`decimalPrecision.js` flattens the matrix under a single-instrument-precision model), which gives CORPUS-02's Decimal-Precision false positive a mechanism. Fix is three separate per-test guards; each guard's rejection predicate and threshold is an open Chat design pass (the axis-1 design pass, not yet done). **S296 correction:** the Decimal-Precision test is a one-tailed **deficit** test — it flags *under-representation* of a precision level versus a trailing-zero-stripping model, not precision *heterogeneity*. So the axis-1 Decimal-Precision mechanism trips on a precision **cliff**, not on mixed precision across a pool; the exact trip threshold is a source question carried into the S297 second read.

- **Axis 2 (continuous-branch null) — NOT a mirror of the integer null; model class decided.** The S295 build attempt confirmed at source that the integer-branch parametric null (`duplicateDetection.js:58-126`) is a **discrete count model** — Poisson/NB PMFs defined only on integers, values rounded via `Math.round` before the fit, collision probability summed over integer support at unit step — and does NOT extend to continuous 2-decimal data (applied bare it overestimates the collision rate ~100× and re-collapses p toward 1 by a different mechanism). So the continuous null is a **new model, not a branch-condition change.** The null-constraints read bounded the choice: downstream tolerates a granular simulated fraction (no closed-form requirement), the integer ceiling is accuracy-bound not compute-bound, and — decisively — the baseline must NOT be estimated from the observed value-repetition frequencies (that coupling is the circularity, in both the malicious and the benign-quantisation direction). That rules out the empirical HHI and rules out a bootstrap over the observed multiset. **Model-class decision: density-integration at recording precision** — collision probability as the integral of the squared value-density over the recording grid (`step = 10^-dominantDp`, already computed at `duplicateDetection.js:39`). A rescaled-discrete family was rejected (a tight rescaled continuous distribution is under-dispersed for Poisson/NB, needing a new discrete family with no offsetting benefit); a from-fitted-model simulation collapses into this same model by another route.

- **The density estimator — UNLOCKED, not decided (S296 overturned the S295 framing).** S295 framed this as one sub-choice (parametric fit vs recurrence-robust kernel) gated on a small estimator-behaviour read. That read, and then the fixture pre-build read, dissolved the choice rather than settling it. The estimator-behaviour read leaned recurrence-robust KDE on a measured-vs-unbounded asymmetry (the KDE's recurrence-inflation risk measured small and bounded, the parametric misspecification risk qualitative and open-ended). The fixture pre-build read then found that asymmetry does not hold at a usable configuration: **the naive-vs-flattened KDE separation is bandwidth-gated, not shape-gated.** It stays 1.00–1.02 across mild/moderate/severe recurrence concentration and only appears (up to 1.58×) at a near-step bandwidth no sound implementation would use; at Silverman's bandwidth all three models — naive KDE, flattened KDE, parametric — converge to the same collision baseline (~1.6e-3). So the recurrence-robustness that justified the KDE lean is not exercised at a sensible bandwidth, which removes the KDE justification **without making parametric right**. Consequence: **the estimator is not fixture-discriminable at all** — no column shape separates the models. Its discriminator, if one exists, lives in bandwidth behaviour and in a benign-quantised column that current data does not contain. Parametric is back in play on cost grounds. This is its own later pass, decided on grounds other than this data or against a provisional null — not a blocker for the fix-verification fixture, which is estimator-independent.

- **Axis-2 dispatch (the `Total.distance` neutralisation of Tests 2/3/4) is an independent path** from the null (confirmed: null lives at `duplicateDetection.js:136`/`:173`, dispatch at `engine.js:323` `runPair`) — a separately-tracked item, not folded into the null fix.

- **Fixture — split into two halves; the estimator-independent half is built and in flight.** S295 specified one four-column fixture (`recur`/`wide`/`precA`/`precB`, ≥100 rows, plus a `recur`-alone control). S296 split it: the **fix-verification half** (the LOW→HIGH flip plus the axis-1 guards) is estimator-independent and buildable now; the **benign-quantised guard column** ("must stay LOW under the fixed null") depends on the chosen estimator and is deferred to the estimator pass. The pre-build read selected **Shape B** for the axis-2 `recur` carrier — five distinct continuous 2-decimal values each repeated ten times against a distinct background — because it flips decisively (LOW p=1.0 under the current HHI null → HIGH under the correct null) and reads as a plausible block-copy defect. Shape A (ten values ×5) can't serve — it stays sub-MODERATE even under the correct null. Shape C (three values ×20) flips but is a less subtle defect. Collateral-firing policy locked **surgical**: the fixture asserts only its carrier verdicts, not the broad Dimension III collateral set the draft mixed file fired.

- **S296 build stopped and reported — two carriers reproduce, two structural blockers.** The build (worktree `s296-fixture`, commit `e1b09bd`, not promoted) reproduced two of three carriers: `recur` → Duplicate Detection LOW (the empirical HHI multiplies into all four DupDet sub-channels — `duplicateDetection.js:633,673` — so the recurrence inflates every channel's null, not just the collision channel), and `recur`+`wide` → Benford span-borrowing HIGH. Two blockers stopped the build (no engine touched, no fixture tuned, batch held 23/23): (1) the **Decimal-Precision carrier does not reproduce** — the deficit-test correction above means mixed precision produces a surplus the test ignores, so the carrier needs a precision cliff; (2) the **single-column control is impossible** — `preprocessRaw` sets `minCells = max(3, …)` (`parser.js:28`), collapsing a one-column CSV to zero rows, so the control needs a three-column construction with two fillers that leave the DupDet channels intact.

- **Harness held-fixture mechanism (S296 pre-build read).** The fix-verification fixture asserts a verdict the *current* engine gets wrong (recurrence LOW where correct is HIGH), so it can't enter the 23/23 pass-gate until the fix lands. The batch runner has a dormant `pending: true` lane at `validate-batch.mjs:151-155` that reports a fixture's severity but routes it to a counter, never pass/fail — the held-fixture mechanism, unused today. The fixture lands held via this lane; the flip path once the fix lands is a single-site edit to the fixture's `EXPECTED` entry in `batch-fixtures.mjs` (drop `pending`, set `severity`, populate the `flags` allow-set). The lane's documented intent ("no applicable test yet") is a near-but-inexact fit — the §2.6 case is "test runs, wrong verdict by design" — so the `pendingNote` carries the distinction; a dedicated `held` flag was considered and deferred as an unnecessary runner edit.

**Remaining §2.6 gates:**
- **The fixture rebuild** — gated on the S297 second read-only pass (`S297-CODE-PROMPT-FIXTURE-READ2.md`, emitted): the Decimal-Precision deficit-test trip threshold (what a precision cliff must look like), a three-column control with DupDet-inert fillers, and surgical-collateral feasibility (whether the Dimension III collateral can be suppressed by construction or is intrinsic to the recurrence and must be declared). On return the rebuild is specifiable — reuse the two working carriers, add a precision-cliff carrier and a three-column control, land held, ground truth at the corrected tiers.
- **Axis-1 rejection predicates** — the per-test guard thresholds for Benford / empirical-HHI / Decimal-Precision; a Chat design pass with no read pending, bankable anytime.
- **The axis-2 estimator** — its own later pass (see the estimator bullet), gated on the benign-quantised column current data lacks.
- **The owed source-comment correction** (`duplicateDetection.js:135`) is independent of all of this and rides the next Code dispatch.

**Ground-truth note (corrected S296).** CORPUS-03's actual tiers are Benford First **HIGH**, Benford Second **HIGH**, Decimal-Precision **MODERATE** — not HIGH as the estimator read's paraphrase and the two S296 fixture prompts stated. The wrong tier propagated from a prior read's paraphrase into two prompts without a source check against the engine's CORPUS-03 output; the corrected tiers carry into the fixture rebuild's ground truth.

**Priority:** Real-world-validated and credibility-bearing for the review paper's methods section (an honest disclosed-limitations pass strengthens the validity claim). The continuous-HHI counterexample (axis 2) is the most defensible single item — a documented safe-claim falsified by external data. Its null-model class is decided; the fix-verification fixture's estimator-independent half is built and in flight (two carriers working, two blocked on the S297 read); the estimator lock and the benign guard column are a separate, later pass. Bank for v1.x. Candidate to compete with the review-paper track at scope time — and the paper's §5 disclosed-limitations subsection now discloses axis 2 as design-blocked, an honest limitation that strengthens the validity claim rather than weakening it.

**Source:** S293 conversation (CORPUS-03 adjudication) + the S293 Code read of the closed item-28 audit (`docs/shared/archive/TEST-INTEGRITY-AUDIT.md`, METHODOLOGY §1.1, `duplicateDetection.js:135`); the S295 reads (`SESSION295-AUDIT-SUMMARY.md`, `SESSION295-IMPL-SUMMARY.md`, `SESSION295-AXIS2-NULL-CONSTRAINTS.md`); the S296 reads (`SESSION296-AXIS2-ESTIMATOR-READ.md`, `SESSION296-FIXTURE-PREBUILD-READ.md`, and the worktree's `SESSION296-FIXTURE-BUILD-FINDINGS.md`). The candidate-further-axes list is a seed pending its own source-derivation read, not a settled taxonomy.

---

## 3. Variance-estimator unification

*Related to §2.6 (the v1.x consistency audit): this variance/SD-estimator divergence — "SD" meaning different things across cards — is a shared-helper consistency question of the same family, and §3's forced-vs-artefact catalogue discriminator is the rule §2.6 reuses. §3 stays the single source for the variance-estimator work specifically; it is a self-contained item, not subordinate to §2.6.*

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

### 5.4 Large-N effect-size gate audit — PROMOTED to v1.0 blocker (S187)

**Status: v1.0 blocker, tracked in STATUS.md §v1.0 blockers.** Retained here for the methodology detail; STATUS holds the current-state line. Promoted S187 on the trust argument — the tier vocabulary ("High") is a cross-test evidence-strength claim, and if it doesn't trigger at matched reliability across tests, the abstraction misleads exactly where reviewers rely on it.

**Framing.** The tiers are already *defined* as false-positive rates (HIGH p < 0.001 = <1/1000 clean datasets; MODERATE p < 0.01 = <1/100), unified across the battery by design. FISHER_EXEMPT membership and the Tier-2 effect-size gates are the machinery that *enforces* that definition where a raw p-value would be non-uniform under H₀ — not evidence of miscalibration. The convergence-escalation rule (2× MODERATE → HIGH) already depends on tiers being FP rates, so FP-equivalence is foundational, not optional. Two gaps stand between "defined-as" and "demonstrated-as":

1. **Six tests lack calibrated effect-size gates at N ≥ 500** — First-Digit Frequencies, Last-Digit Frequencies, Runs, Row-Mean Runs, Decimal Places, Mean-Variance. At large N the p-value floor crashes toward zero on forensically-trivial deviations, so these over-trigger on clean data — a real FP-equivalence violation localised to these tests and the large-N regime. Fix: a per-test effect-size threshold below which p alone does not promote severity — same shape as the existing Tier-2 gates on Bartlett (variance ratio), Mahalanobis (distance), Carlisle (KS distance). Note (S240): for **Runs** the gate is necessary but not sufficient — see the i.i.d.-pairs sub-note below; Runs additionally needs a dependence-aware null, not only a large-N gate.
2. **The tiers have never been empirically measured against a null set.** The design defines them as FP rates and the enforcement machinery exists, but no null-simulation has confirmed each test's HIGH/MODERATE actually fires at ≤0.1% / ≤1% under H₀.

**Scope (both halves required for the blocker to close):**
- Close the six gates (per-test effect-size metric + calibration against the batch — see Approach below).
- Build a **null-set FP-verification harness**: run each test against many clean/null datasets, measure HIGH and MODERATE trigger rates, confirm they hit the stated FP targets, fix any test that misses. This is new infrastructure, but it's the evidence base the review paper needs regardless of the gate work, so it's not gold-plating.

**First step (read-only, sizes the job before any fix):** enumerate, per test, the exact tier-promotion rule and whether it has an effect-size gate / is FISHER_EXEMPT / neither. That inventory shows how many tests sit in the "naked p-value at large N" bucket vs already-gated. Open hypothesis the harness tests first: the uniform-null + standard-adj-p tests may already be roughly FP-matched, with only the FISHER_EXEMPT set diverging — in which case the job narrows to bringing the exempt set onto the same FP footing.

**Cross-ref:** verdict-legibility synthesis thread (TESTCARD-FINDINGS) — the same read-only inventory feeds the per-card "expose the promotion basis" display work; interim display wording must NOT assert cross-test FP-equivalence until this blocker closes.

**Approach:** Chat analysis to identify the right effect-size metric per test (e.g. for First-Digit Frequencies, MAD vs χ²-statistic-normalised-by-N; for Runs, observed-vs-expected runs ratio in absolute units). Calibrate the threshold against the batch (clean fixtures should not flag; fabricated fixtures should). Code calibration after spec lands.

**Effort:** the six gates ~ as before (Chat analysis ~1 session per test, calibration ~1 session in a batch pass); the null-set harness is additional new infrastructure (harness build + per-test FP measurement + any re-tuning).

**Confirmed instance — Runs i.i.d.-pairs null (S240).** The Runs single-matrix verdict is a concrete, source-located case of gap #2 ("tiers never measured against a null"). The flag on the single-matrix path is `flagFromP(pooled.p)`, where `pooled = oneSampleT(allZ)` and `allZ` is the array of per-pair runs-z's over **all unordered column pairs** (`runs.js:24,48,76`). Those pairs **share columns** — with nC columns each column appears in nC−1 pairs — so the pair-z's are not independent, yet the t-test treats them as an i.i.d. sample at df = nPairs−1. The permutation machinery does **not** protect this: `scanP` tests a different (windowed-min) statistic, permutes each pair independently so it doesn't model the column-sharing dependence, and never gates the flag; the only place the analytic and permutation p's meet is a display-only `min` (`runs.js:251`, comment "for display only"), which takes the *more liberal* p. There is no permutation null for the pooled mean-z anywhere in `runs.js`. Net: the Runs flag relies on an over-liberal analytic null whose nominal df overstates the effective df, and the inflation grows with replicate-column count. Live on DS21 (df=27) and DS22 (df=20) — their flags are precisely the analytic t (sub-units cleared). Latent on the current battery (no gross false positive on clean fixtures at present replicate counts), but the exposure scales: a ≥9-replicate single-matrix fixture also hits the df>30 normal branch, compounding an already-overstated df with a narrower-than-nominal-t tail.

**Two consequences for the §5.4 scope:**
1. *The effect-size gate for Runs is necessary but not sufficient.* The gate (gap #1) caps the naked-p-floor at large N; it does not fix the dependence-induced miscalibration of the p itself. Runs needs a dependence-aware null, not only a gate.
2. *Design constraint on the FP-verification harness.* The harness must drive each test with a null that preserves the real dependence structure — for Runs, a **joint matrix-level permutation that recomputes the pooled mean-z** (shuffle within columns at the matrix level, recompute all pair-z's, re-pool), NOT an independent within-pair shuffle. A harness that permutes pairs independently would reproduce the i.i.d. assumption and fail to surface the inflation it exists to measure. Candidate corrections for the verdict itself: the same joint matrix-level permutation null for `pooled.p`, or an effective-df / pair-covariance adjustment to the analytic t. Neither exists today; building the joint permutation null is the prerequisite for *measuring* the inflation, so it is the first step whether the fix is permutation-based or analytic.

**Scope-first gate before designing the Runs fix:** the overlapping-pairs-treated-as-i.i.d. pattern is not obviously Runs-only — any test pooling overlapping pairwise statistics under a parametric null has the same structure (Windowed Autocorrelation is the first sibling to check, also pairwise). Survey the pairwise tests for the pattern before scoping the correction, so the dependence-aware null is designed for its real consumer set rather than Runs-shaped (same lesson as the S240 inverse-t: one consumer or many, established before building). (S240 read-only; source-cited.)

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
| Variance-estimator unification (§3) | This doc | Primary scope; absorbs original ROADMAP Track F narrow scope (§3.3) plus broader audit framing (§3.1, §3.2). Self-contained; related to §2.6 by shared forced-vs-artefact discipline, not subordinate to it. |
| Rectangular Blocked Mahalanobis (§2.1) | This doc | Single source |
| Column-localised sequential duplication detector (§2.4) | This doc | Single source; finding sourced from S292 real-world corpus run (SESSION292-CHAT-SUMMARY.md, REALWORLD-CORPUS-SPEC.md CORPUS-01) |
| Role / condition inference for real-world column shapes (§2.5) | This doc | Single source; finding sourced from S292 corpus run + S292-ROLE-INFERENCE-SCOPE (Code read-only) |
| Test-consistency audit beyond item 28 (§2.6) | This doc | New scope adjacent to the *closed* condition-pooling integrity audit (item 28, archived `docs/shared/archive/TEST-INTEGRITY-AUDIT.md`); covers three CORPUS-03-demonstrated axes that audit's predicate didn't reach. Sourced from S293 CORPUS-03 adjudication + the S293 Code read of the closed audit. |
| AI Screening mode (§4) | This doc | Single source. Original S125 chat history preserved as reference but no longer load-bearing. |
| Permutation B = 9999 (§5.1) | STATUS parked #8 | Mirror |
| Severity-formula diversity metric (§5.2) | This doc | Primary scope; pairs with §5.5 |
| Modality plot upgrade (§5.3) | STATUS parked #7 | Mirror |
| Large-N effect-size gate audit / tier FP-equivalence (§5.4) | STATUS.md §v1.0 blockers | Mirror + methodology detail. Promoted v1.0 blocker S187 (ROADMAP Track G origin). |
| Assay-aware severity weighting (§5.5) | This doc | Primary scope; absorbed from ROADMAP Item 5 |
| LOESS recursive binary segmentation (§5.6) | This doc | Primary scope; absorbed from ROADMAP Item 6c |
| Terminal Digit directional statistic (§5.7) | This doc | Primary scope; absorbed from ROADMAP Item 6a |
| Genomics raw-count normalization advisory (§5.8) | This doc | Primary scope; absorbed from ROADMAP Item 6e |
| Long-format detection (Archetype 4) | STATUS parked #12 | Source-of-truth at STATUS; ROADMAP Track H (archived) carried fuller detail — Nick's call whether to expand STATUS #12 |

**ROADMAP.md status:** retired. Was archived as historical record of the v0.7 → v1.0 feature plan (S20–S96 era); all open items extracted into this doc and STATUS by retirement. Recoverable from git history (last live at `ad270a8:docs/shared/ROADMAP.md`).

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

---

## 8. Staged artifacts for undecided arcs

Inputs that were built but whose owning arc is not yet decided. Recorded here so the artifact isn't silently lost; listing one does NOT commit to running the arc.

- **`docs/shared/CLEARED-BODY-AUDIT.md`** — runtime inventory of all 28 test cards' cleared-state field population + current cleared-card render (source-read at `file:line`), with a per-card design-verdict column left empty for Chat. Built to feed a possible **cleared-card body design pass**: deciding what each card presents on a CLEARED/LOW result (the mechanical gating already auto-withholds Implications + What-to-look-for on LOW — the open question is the positive design call, what cleared cards show instead of nothing). **Whether that pass happens is undecided** — it withholds nothing functional, so it reads as v1.x polish, not a blocker. Audited against S196 code state; re-confirm cleared-render behaviour at source before any design work (substantial drift since). Pulled from project knowledge to save session-start context; **repull it there when/if the arc goes active.**

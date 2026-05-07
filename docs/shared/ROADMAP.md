# Check My Data — Feature Roadmap (v0.7 → v1.0)

**Goal:** Transform v0.7 (modularised, validated, documented) into v1.0 (reliable tool for research integrity officers and journal editors). Focus: eliminate systematic FP classes, add tests for fabrication mechanisms currently missed, improve investigative output.

> This file was originally V06-PLAN.md. The v0.6 → v0.7 professionalisation (monolith decomposition, error handling, JSDoc, architecture docs) is now complete — see `.claude/plan.md` for that work. The items below are the remaining **feature work** for v1.0.
>
> Post-S95 note (S96 audit): Items 1–7 below are the original v0.7 → v1.0 feature items. Since S94, active implementation work is organised around **Tracks A–H** in `METHODOLOGY-MAP.md`. Items and Tracks are two views of the same programme — Items are user-facing features; Tracks are the internal implementation structure. See "Implementation Order" at the end of this file for current priority.

---

## Item 1: Data Type × Assay Type Two-Axis Input Design

**Priority:** CRITICAL — foundational. Items 2, 3, 5, 6 depend on this.  
**Status:** ✅ COMPLETE (S25 core + S62 UI redesign)

**Problem:** Tool assumes all DATA columns are independent replicate measurements. This produces systematic FPs on:
- Survey/Likert data (Gino S23): SelNoise, IRC, Runs all fire because scale items aren't replicates
- Mixed measurement types (Pruitt raw S24): Autocorr, Runs, SelNoise fire because different variables pooled
- Ordinal data: distributional noise tests meaningless on 1–7 scales

**Design (from S23):**

Two dropdowns at import:

**Data type** (governs valid test set + VST routing):
- **Continuous** → full battery, all distributional tests, log-log CI for VST
- **Count/integer** → skip Benford, Terminal Digit; kurtosis/runs still valid; Anscombe/log VST
- **Ordinal/rank** → skip ALL distributional noise tests (kurtosis, autocorrelation, runs, IRC, selective noise); keep structural (DupDet, ConstOffset, RSC, Mahalanobis, LOESS) + applicable digit-level tests (VFS on integer scales); always raw (no transform)
- **Binary** → very restricted test set (TBD)

**Assay type** (governs instrument artifact notes + domain VST fallback):
- Existing 8 types + general + new: survey/likert
- qPCR → Ct quantisation note, well failure note
- Genomics → library size warnings, Benford skip
- Survey → response-style notes, no instrument artifacts

**VST becomes deterministic:**
- Ordinal → always raw
- Count → Anscombe default, log if NB overdispersion
- Continuous → log-log CI; confirmation prompt only if ambiguous + general assay

**Assay auto-suggests data type:** survey → ordinal, qPCR → continuous, cell_count → count. User can override. Data Type dropdown greyed out when assay overrides, with "Set by assay type" hint.

**Import page layout (S62 redesign):**

The original "gated checklist" concept evolved into a 4-zone layout with numbered section headers:

1. **Describe your data** — Header rows, assay type, data type on one row. Controls that affect parsing.
2. **Review columns** — Column roles (DATA/LABEL/COND/SKIP) + Auto/All Data/All Off + data table. User inspects their data.
3. **Configure analysis** — Treat 0 as missing (OPTIONAL badge), Column Relationship gate (REQUIRED → ✓ SET badge after selection), VST confirmation. Decisions that benefit from having seen the data.
4. **Summary** — Stats grid, conditions, test applicability (collapsed, grouped by mechanism category), Run Analysis button.

Gray panels on zones 1/3/4, table on white. 3-tier font system (14/13/11px). Compact file bar after load: ← Back | filename 📌✕ | Change file | Batch Analysis.

**Acceptance criteria:**
- [x] Gino Study 4 with ordinal data type: SelNoise, IRC, Runs suppressed → rating drops from CRITICAL to ELEVATED or lower — **SERIOUS post-S25** ✅ S25
- [ ] Pruitt raw data with continuous + proper column separation: no pooling FPs — **still FPs when mixed measurement types pooled; needs column role improvements (v1.0)**
- [x] All 18 validation datasets: no regressions (continuous + appropriate assay) — **18/18 passing against updated ground truth** ✅ S26+S62, re-verified S95
- [x] Survey/likert assay type available — **added with filename/header auto-detection** ✅ S25
- [x] VST prompt eliminated for ordinal and count (deterministic) — **ordinal → raw, count → Anscombe/log by assay** ✅ S25
- [x] 4-zone import layout with numbered headers — ✅ S62 (Code S15)
- [x] Data Type greyed out when assay overrides — ✅ S62 (Code S15)
- [x] Test applicability grouped by mechanism categories — ✅ S62 (Code S15), category names updated S95 Track C

---

## Item 2: Constant-Response Concentration Test — REMOVED (S94)

**Status:** ❌ REMOVED S94. Test retired entirely.

**Rationale:** Zero detections across 18 validation datasets. Scale-group fragmentation on real survey data (Gino Study 4) prevented firing when it should have. Forensic target (flat-row dominant-value concentration) may be re-implemented later with more robust scale-group merging.

**Coverage after removal:** The forensic signature this test targeted on survey data is now caught by DupDet Test 1 (value-level collision, NB/HHI binomial null) after Track A's 4-p BH-FDR rework (S95). Validated on DS14 crctest-survey: all four DupDet sub-tests fire HIGH, severity 3 held.

See `METHODOLOGY-MAP.md §Removed tests` for the full audit and `SESSION95-SUMMARY.md` for the Track A cleanup that absorbed this test's target.

---

## Item 3: Value-Frequency Spike Detection

**Priority:** HIGH — new test, catches Pruitt keyboard-entry fabrication.  
**Status:** ✅ COMPLETE (S26)

**Spec (from S24):**

**Family:** Digit-level (Dim II — Digit Representation)  
**Applicability:** Integer data, sufficient range (≥20 distinct values), ≥100 observations.

**Procedure:**
1. Build frequency histogram of all integer values in dataset.
2. For each integer value, compute locally-smoothed expected frequency (kernel smooth or moving average of ±2–3 neighbours).
3. Test each value's observed count against local expectation. χ² or binomial on per-value exceedance.
4. BH-FDR correction across all tested values.
5. Report spiked values with observed/expected ratio and neighbours.

**On Pruitt:** Values 34, 45, 56, 67, 78, 89 (adjacent keyboard keys) would show 3×+ exceedance over neighbours. Terminal digits 4 and 8 excess is a secondary signal.

**Design consideration:** Need to handle edge effects (values near min/max of range) and zero-inflation (value 0 often legitimately over-represented in count data).

**Acceptance criteria:**
- [x] Pruitt Activity/Boldness: flags consecutive-key integers as spikes — **val=67 at 10×, MODERATE P=0.000136** ✅ S26
- [x] DS06 cell count fabricated: no false positives (integer but no keyboard pattern) — **LOW (val=590 adjP=0.0095, below 0.001 gate)** ✅ S26
- [x] Clean datasets: no false positives — **N/A on continuous, no FPs on integer** ✅ S26
- [x] BH-FDR correction applied — **bhFDR() applied** ✅ S26

**Planned extension:** VFS digit-substring pass — see Item 8 and `METHODOLOGY-MAP.md §Planned tests`. Adds a second detection pass for overrepresented consecutive digit substrings under the same test card.

---

## Item 4: Actionable Investigation Guidance

**Priority:** MEDIUM — improves usability for non-specialist users.  
**Status:** ✅ MOSTLY COMPLETE (Phases A–E done, Code S11–S15)

**Components:**
1. **Per-test templates:** ✅ `CATEGORY_GUIDANCE` in `guidance.js` with QC + Review templates per category
2. **Cross-test decision tree:** ✅ Convergence layer identifies co-flag patterns → hotspot cards/tables with per-hotspot guidance
3. **Overall prioritised checklist:** ✅ Hotspot ranking by depth × diversity, "Start investigation here" / "Secondary region" labels
4. **Heatmap overlay:** ✅ Per-cell convergence grid overlaid on original data with hotspot outlines, density strip, click-to-scroll

**Remaining:**
- Review vs Full mode differentiation needs stronger visual distinction (P2, design discussion)
- QC hotspot cards repeat identical text when multiple hotspots share a category
- Density strip lacks legend

**Acceptance criteria:**
- [x] Per-test templates for all active tests — **CATEGORY_GUIDANCE covers all 5 categories with QC + Review modes; 22 tests mapped** ✅ S12 (category names updated S95 Track C)
- [x] Heatmap renders on DS06, DS10 with visible hot regions — **convergence grid with hotspot outlines** ✅ S11
- [x] Cross-test co-flag narrative generates for convergent cases — **hotspot cards (QC) and hotspot table (Review) with per-hotspot guidance** ✅ S12

---

## Item 5: Assay-Aware Severity Weighting

**Priority:** MEDIUM — reduces FP severity on instrument-artifact datasets.

**Problem:** eDNA PCR clean data rates SERIOUS because instrument artifacts (Terminal Digit quantisation, Decimal Precision float32/64 concat, Mahalanobis well failures) all promote severity equally with genuine fabrication signals.

**Design:**
- `artifactType` flag on test results: "instrument" vs "fabrication" vs "ambiguous"
- Instrument-flagged results contribute to severity at reduced weight (e.g., don't count toward cross-dimension promotion)
- Requires Item 1 (data type × assay type) to determine which tests are instrument-sensitive

**Acceptance criteria:**
- [ ] eDNA PCR clean: drops from SERIOUS to MINOR or CLEAN
- [ ] DS08 ELISA fabricated: no change (genuine signals not demoted)
- [ ] Pruitt Activity: no change (genuine signals)

**Post-Track-C note (S95):** Track C's dimension-based severity formula exposed a related issue — one-dimension fabrications cap at severity 2 absent HIGH+cross-dim MODs (DS15 is the only current instance). That severity-formula diversity-metric question is parked per STATUS #11. Item 5 remains the intended vehicle for instrument-artifact weighting once diversity metric is re-examined.

---

## Item 6: Additional Small-Scale Improvements

Non-test refinements and parked improvements. New full tests have moved to Item 8.

**6a. Terminal Digit Directional Test (S21)**
- Distinguish digit excess (instrument quantisation) from digit avoidance (human fabrication)
- Replace omnibus χ² with directional statistic
- Status: open, low priority

**6b. Seed Kurtosis Simulation RNG** ✅ Done (fix 155, S25)
- Eliminates DS01 stochasticity (CLEAN↔SERIOUS oscillation)
- Mulberry32 seeded PRNG from data hash, all analysis code deterministic

**6c. CUSUM (or WBS/PELT) Binary Segmentation**
- Reliable dual-boundary detection for partial fabrication in LOESS Residual
- Replaces unreliable single-pass secondary changepoint
- Status: deferred to v1.0 per STATUS accepted limitations ("LOESS binary segmentation — within-segment permutation null too permissive. WBS/PELT deferred to v1.0.")

**6d. Manual Long-Format Override (S22)**
- "This is long-format data →" link in column role panel
- For cases where auto-detection doesn't trigger
- Status: folded into Track H (long-format fix, v1.0)

**6e. Normalization Confirmation for Genomics (S21)**
- Warn when raw unnormalized counts detected
- Suggest DESeq2/edgeR normalization before analysis
- Status: open

---

## Item 7: Visual Polish & UX (S62)

**Priority:** HIGH — professional appearance for target audience.  
**Status:** Landing page + import page ✅ COMPLETE. Report views partially done. Category restructure ✅ COMPLETE (Track C, S95).

**7a. Landing page** ✅ S62
- Drop zone centred on viewport, "Upload a dataset to begin analysis" inside drop zone
- Demo buttons removed, Batch Analysis restyled

**7b. Import page 4-zone redesign** ✅ S62 (Code S15)
- See Item 1 for full description

**7c. Report view P1 fixes** ✅ Code S14
- Benford chart legend colour mismatch fixed
- Duplicate "What to look for" in Full mode removed
- QC clean: 3 cards collapsed to 1 confirmation line
- Category dots use category colours (not gray) when clean
- Heatmap hotspot outlines no longer clip cell values (outline instead of border)
- Mini card titles → sans-serif; clean cards show green checkmark
- Action bar restructured into 3 logical rows
- Hotspot location text in proportional font; pills have tooltip

**7d. Report view P2 items** — open
- Convergence language too technical for QC mode
- QC hotspot cards repeat identical guidance for same-category hotspots
- Density strip has no legend
- Single-cell hotspots noisy in hotspot list
- Review category summary flag dots unexplained
- "Where flags are concentrated" chart has no legend
- Review vs Full mode differentiation (design discussion needed)

**7e. Category restructure (Track C, S95)** ✅ COMPLETE
- Five new UI categories live: Copy-Paste-Edit, Unusual Digits, Distribution Shapes, Cross-Replicate Comparisons, Cross-Group Comparisons
- CRC removed from engine, UI, and exports
- Test moves per METHODOLOGY-MAP v3: IRC (→ Cross-Replicate), Mahalanobis (→ Cross-Replicate), Shannon Entropy (→ Distribution Shapes), CCR + Carlisle (→ Cross-Group)
- Missing Data Pattern interim-placed in Cross-Replicate (parked #9 for re-home to File Integrity when Dim VI lands)
- See `INVESTIGATION-DISPLAY-SPEC.md` §Category System v4.0 (Code-owned post-S95)

**7f. Batch view** — not yet reviewed/screenshotted

**7g. Peer Review mode redesign** — parked (STATUS #6). Needs own design pass.

---

## Item 8: Planned Tests (v1.0 — from METHODOLOGY-MAP v3.2)

New tests scoped in the methodology map that are not yet implemented. Grouped by dimension and by the METHODOLOGY-MAP Track in which they land.

### Track D — Cross-condition consistency framework (Dim IV)

**Cross-Condition Consistency Framework.** One test, 9 properties compared across conditions via permutation null (condition label shuffle), BH-FDR across properties. Two-sided. Properties: range, dispersion, CDF shape, residual variance, residual autocorrelation, residual kurtosis, digit distribution, entropy, mean-variance slope. Most properties reuse existing per-condition computations. Biggest new test in the v1.0 programme — next priority for Chat spec → Code work.

### Track E — Individual new tests

**Windowed Autocorrelation (Dim III-A).** Sliding window (15 rows, stride 5) of lag-1 r on d_i per replicate pair. Permutation null (row-shuffle within pair). BH-FDR across (pair × window). Sub-unit BH-FDR promotion. Mirrors existing infrastructure. Small Code task.

**Higher-lag Autocorrelation (Dim III-A).** Extend current Autocorrelation to compute lags 1–5. Same pooled t-test framework. Catches AR(2+) and periodic structure that lag-1 misses. Low effort, real coverage gain.

**Blocked Mahalanobis (Dim III-C).** Partition rows into non-overlapping blocks of size ≥ max(30, 3 × nC). Per block: compute D² under block-specific Σ (Σ-pass, catches variance/covariance shifts) and block-specific μ (μ-pass, catches mean shifts). Outlier fraction per block vs global expected rate via binomial. BH-FDR across blocks.

**Column Distributional GoF (Dim V).** Per DATA column: fit parametric model (Normal / Poisson / NB, reusing Shannon Entropy's logic), compute Anderson-Darling statistic vs fitted CDF. Parametric bootstrap null (B = 999). BH-FDR across columns.

**Modality Test (Dim V).** Hartigan's dip test per column. Parametric bootstrap under fitted unimodal model. BH-FDR across columns.

**Carlisle Balance (Dim IV).** Between-condition effect-size uniformity. Principled distributional null. (Already implemented for DS16/DS17 validation; spec in METHODOLOGY.md.) Formally part of Track E for any refinement work.

**VFS Digit-Substring Extension (Dim II).** Adds a second detection pass to the existing Repeated Digits (VFS) test for overrepresented consecutive digit substrings. Dual-pass architecture (whole-value spike + digit-substring) under one test card — not a replacement.

### Track F — Unified SD scan (deferred)

Merge Selective Noise + Regional Noise + LOESS into a single three-way Dim III sub-group B scan. Preserves all granularities under one framework with coherent nulls. MeanVar and WRV stay separate. Post-merge target: 3 tests in Dim III sub-group B (MeanVar, Unified SD Scan, WRV).

### Track G — Large-N gate audit

Calibrate effect-size gates for 6 tests currently without them: First-Digit Frequencies, Last-Digit Frequencies, Runs, Row-Mean Runs, Decimal Places, Mean-Variance. Chat analysis → Code calibration.

### Track H — Long-format fix (v1.0)

Multi-measure long-format detection + "row order is arbitrary" flag to gate sequential tests automatically. Covers Archetype 4 coverage gap (see METHODOLOGY-MAP §Dataset archetypes).

### Dim VI — File Integrity (parked, STATUS #7)

Excel-only category, Tier 2 flagging (no p-values). 7 tests total:
- Localising (feed convergence grid): font anomalies, number-format inconsistencies, formula patterns
- Global: provenance (creator/modifier), temporal inconsistencies, hidden sheets, external links

---

## Implementation Order

**Completed (historical):**

1. ✅ **Item 1** (data type × assay type) — S25 (fix 157) + S62 UI redesign
2. ✅ **Item 6b** (seed kurtosis RNG) — S25 (fix 155)
3. ❌ **Item 2** (Constant-Response Concentration) — implemented S26 (fix 161), **removed S94** (zero detections, forensic target absorbed by DupDet T1)
4. ✅ **Item 3** (Value-Frequency Spike Detection) — S26 (fix 162)
5. ✅ **Item 4** (investigation guidance) — mostly done, Phases A–E, Code S11–S15
6. ✅ **Item 7a–c** (landing, import 4-zone, report P1 fixes) — S62 + Code S14
7. ✅ **Item 7e / Track C** (5-category restructure + CRC removal) — S95
8. ✅ **Track A** (statistical coherence cleanup) — S95. DupDet 4-p BH-FDR, Mahalanobis BH-FDR α=0.001, Runs+RMR sub-unit escalation, ConstOffset all pairs, CCR min-pairs 3→4.

**Active and next — coverage-first sequencing (S96 decision):**

Rationale: UI polish on an incomplete detector is premature, and real-world cases on a coverage-thin tool re-confirm known gaps rather than stressing new ones. Coverage expansion comes first.

1. **Track E Tier 1 — Higher-lag Autocorrelation** (Code, small). Extend existing Autocorrelation to lags 1–5, BH-FDR across lags, sub-unit promotion capped at MODERATE.
2. **Track E Tier 1 — Windowed Autocorrelation** (Code, small). New test, mirrors Regional Noise's permutation infrastructure.
3. **Track D — Cross-Condition Consistency Framework** (Chat spec → Code). Biggest single coverage gain — Dim IV goes from 2 to 3 tests (one framework handling 9 properties). Most properties reuse existing per-condition computations.
4. **Track E Tier 3 — Blocked Mahalanobis** (Code, medium). Covers localised multivariate structure.
5. **Track E Tier 3 — Column GoF + Modality** (Code, medium). Dim V expands 1 test → 3 (three orthogonal sub-mechanisms).
6. **Track E Tier 4 — VFS digit-substring extension** (Code, small). Dual-pass under existing VFS card.
7. **Item 7d** — Report view P2 fixes. After coverage lands — UI now polishes a complete detector rather than an evolving one.
8. **Real-world case study expansion.** New datasets exercise the expanded battery and reveal which UI gaps matter.
9. **Track B** — Review paper methods section. **Deferred** until forensics UI stable and additional real-world case validation in hand. The methods section can only cite what the tool actually does, and S95-style mid-flight movement makes premature drafts stale.
10. **Item 5** (assay-aware severity weighting) — pair with severity-formula diversity-metric reconsideration (STATUS #11).
11. **Track G** (large-N gate audit) — Chat analysis for six tests, then Code calibration.
12. **Track F** (unified SD scan) — larger Code refactor, deferred.
13. **Track H** (long-format fix) — v1.0 milestone work.
14. **Items 6a, 6c, 6e** — lower priority improvements.
15. **Dim VI File Integrity** — Excel-only category, v1.0 or later.

---

## Notes

- All new tests must follow existing patterns: permutation/simulation/binomial null, BH-FDR correction, effect-size gates at N≥500, primaryP standardised, copy summary line
- 22 tests currently active (post-CRC and CrossCondDup removal); 8 planned per Item 8 bring total to 30 by v1.0
- Regression suite (18 datasets) must pass after each item against current `TEST-GROUND-TRUTH.md` (last updated S95 Track A)
- Real-world case studies (Ariely, Gino, Pruitt) should be re-run after each significant Track landing to verify FP reduction and coverage gain

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
| Test additions (post-v1.0 forensics) | Rectangular Blocked Mahalanobis; genuine-block detection; coherence-cleanup residue; column-localised sequential duplication detector; role/condition inference for real-world column shapes; **test-consistency audit beyond the closed item-28 audit (§2.6) — four demonstrated axes, axis 4 (input representation defeats Decimal Precision) added S330**; arbitrary-offset block duplication detector (§2.7); **group-attribute column recognition — the largest demonstrated false-positive surface in the corpus (§2.8, BUILT S315)**; **scattered partial-row duplication — the coverage failure mode, exposed by §2.8's outcome (§2.9, BUILT S316)**; **row-grouping produces units the tests were not designed for — the tool's own applicability failure, half the row-grouping corpus (§2.10, trigger + confirm card BUILT S320–S321, stance cross-validated S322, twelve fixes unpromoted)**; **structural omission as a signal — the absence "not applicable" would neutralise (§2.12, open scope)**; **cost ceilings measure the wrong variable — row count does not predict scan cost, factor of 124 at identical shape (§2.13, S327)**; **the sequence-duplication null already prices categorical columns correctly — but those columns carry evidence, and the cardinality guard is KILLED (§2.14, S327, amended S328)**; **one question, two owners — applicability is decided twice and the answers diverge (§2.15, S332)** | New scope, this doc |
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

**What:** A test targeting a repeated *sequence of values* within a single column — a contiguous run of N≥3 cells whose value sequence recurs elsewhere in the same column at an offset — regardless of what the row's other columns contain, distinct from whole-row or whole-block duplicate detection. **Shape corrected S302 (source-verified):** the CORPUS-01 defect is a repeated sequence of **distinct** values (Englund's `repeatedColumnSequences`), NOT a run of one identical value. Earlier drafts of this entry, and the S302 classification-read and measurement prompts, all carried "run of identical values"; a Code read of the real file (`corpus-data/CORPUS-01.xlsx`) corrected it. The distinction is load-bearing for the null (see Statistic sketch).

**Why:** Confirmed gap via the S292 real-world corpus run (CORPUS-01, Sampson et al. *Cell* 2016 — Dryad `dryad.4mp6h`). The documented defect, source-verified at S302 in the file the engine ingests (single sheet, 105×4 matrix, row-grouped), is two repeated distinct-value sequences:
- **Adhesive-removal column** — two 5-value sequences, each appearing once in an SPF group and again in the matching ExGF group: `[1.31, 1.56, 3.42, 2.53, 2.44]` (SPF/WT rows 5–9, ExGF/WT rows 73–77) and `[7.36, 2.19, 11.00, 22.28, 16.78]` (SPF/ASO rows 15–19, ExGF/ASO rows 87–91).
- **Pole-descent column** — `[2.18, 4.29, 3.01]` at rows 22–24 and 28–30, both germ-free wild-type; at those rows the adhesive column differs, so only the pole column matches across the two occurrences — the single-column-match target exactly.

No value's raw multiplicity exceeds 3 in either column; the signal is arrangement (a recurring sequence), not a spike in any one value's frequency. Independently documented in the paper's PubPeer thread (comment #15). None of Exact Duplicate Detection's four sub-tests catch it (mechanisms confirmed at source, S302 classification read):
- Test 1 (value-level collision) reads frequency/multiplicity only, blind to order and position, and pools every column into one frequency table — so it cannot localise to a column even if the frequency signal survived its (self-nulling) HHI baseline.
- Test 2 (identical row vectors) keys on the whole-row vector (`join("|")` over all columns); the two occurrences produce different full-row keys because the other columns differ, so the single matching column is invisible.
- Test 3 (within-row column-pair coincidences) is the wrong axis — same-row cross-column ties, not values across rows. (It does compute a display-only within-column same-value count, `withinColObs`, but that never enters the p-vector and reads frequency not sequence.)
- Test 4 (block-copy) is three passes: Pass A (full-row FNV-1a hash) breaks on the differing side-columns; Pass C (transposed column-segment) is the wrong geometry; **Pass B (partial-column offset scan) structurally would catch it** — it already aligns a single column across an offset — but gates out single-column matches (`matchCols.length >= 2`, `w >= 2`, `MIN_BLOCK_CELLS = 6`).

This is a designed gap, not a calibration miss — by the methodology as specified, no existing sub-test targets "a contiguous same-column run, independent of other columns." Markus Englund's `copy-paste-detective` (the source of this corpus's third-party ground truth) treats this as its own pluggable strategy (`repeatedColumnSequences`), separate from his `duplicateRows` strategy — external validation that this is a genuinely distinct detection target, not something foldable into existing sub-tests.

**Forensic targets (two regimes — one verified, one banked):**
- **Distinct-value sequence (VERIFIED, the CORPUS-01 shape).** A sequence of distinct values copied within one column across row-groups that should be independent (padding or substituting missing measurements). This is the regime S302 measured and greenlit — the surrounding columns are independently real, so it trips no row-level or block-level detector.
- **Constant-value run (BANKED sub-item, no corpus instance yet).** A single value repeated N times in a column — a real fabrication mode (padding with one value) but not present in CORPUS-01. **It needs a different null:** for a constant run the per-position match probability is that value's own `freq/N`, larger than the column HHI, so the transferred `HHI^h` term would understate it and under-fire. Do not fold this into the sequence-regime build; scope it separately when a real constant-run case appears or a build is wanted deliberately.

**Statistic — a per-column sibling scan, NOT a re-scope of Pass B (corrected S303 source read).** Earlier drafts recorded this as settled to widening Pass B's width gate. A read-only scope read of `duplicateDetection.js` at S303 falsified that at source. Pass B's enumeration keys on the *entire set* of columns matching at a given offset per row (`matchKey = matchCols.join(",")`, `:474`) and extends a run only while that whole set stays identical row over row. A genuine single-column run in column `c*` is therefore severed the instant any second column coincidentally also matches at the same offset — the key flips from `"c*"` to `"c*,cj"` — even though `c*` kept matching. So widening the gate (`matchCols.length >= 2 → >= 1`, `w >= 2 → >= 1`, plus a width-1 height floor) leaves the ≥2-column block boundaries intact but does NOT faithfully detect width-1 runs: the enumeration tracks maximal same-column-set runs, not per-column runs. The sound shape is a separate per-column offset scan keying on the single column `c*`, which both detects width-1 faithfully and leaves the existing ≥2 semantics — including the load-bearing `MIN_BLOCK_CELLS = 6` floor (`:364/:457`), which cannot be relaxed in place without moving existing verdicts — completely untouched.

**The block-copy p-value still transfers cleanly** — that part of the earlier record survives. For a single-column block, `pRow = Π(HHI_c)` collapses to one factor `wrColHHI[c*]`, `pBlock = wrColHHI[c*]^h`, `nOpp = Σ_d max(0, wrR − d − h + 1)` has no column-count dependency, `pAdj = min(1, pBlock × nOpp)`. The S303 read confirmed the pricing arithmetic (`duplicateDetection.js:688–696`) is reachable and correct for a one-element `blk.cols` with no math change, provided the block record carries `isColumnMatch` falsy and `isFullRow` false — which the Pass B partial shape already sets. So the sibling scan reuses the *pricing*, not the *enumeration*.

*Null-power measured on the real column (S302), transfer confirmed sound.* The transferred null term `wrColHHI[c*]` is the per-column empirical HHI — the surface that carries the §2.6 circularity — so it was measured before scoping any build. On CORPUS-01's actual sequences the self-nulling does **not** bite: the pole 3-sequence lands at `pAdj ≈ 6.9e-3` (**MODERATE**) and the adhesive 5-sequence at `pAdj ≈ 1.8e-6` (**HIGH**), using the real self-inflated HHI (~0.011–0.013). Real versus copy-removed HHI differ by only 2–4%, neither crossing a tier boundary. The reason self-inflation is negligible here — and why §2.4 is separable where §2.6 was not — is the distinct-value shape: the duplication bumps h distinct values by one count each in a column of ~90 near-unique values, barely moving the HHI, unlike §2.6's every-value-recurs case that directly inflated its own frequency.

**Distinct-value guard is mandatory (S303 read).** Pass B's match test is per-cell equality (`:470`), which does not distinguish a repeated distinct-value *sequence* (the CORPUS-01 target) from a *constant-value run* — equal-to-a-constant is still equal, so a shared path fires on both. Today only the HHI floor incidentally suppresses a fully-constant run (HHI ≈ 1 → `pBlock` ≈ 1), and that suppression is NOT guaranteed for a near-constant column whose HHI is high but under 1, where `HHI^h` could misprice. So the sibling scan must carry an explicit guard — require the run to contain at least two distinct values, and route constant / near-constant runs to the separately-banked `freq/N` regime — rather than relying on the equality test or the HHI floor to keep constant runs out. **Calibration scope note:** `wrColHHI[c*]` is the correctly-matched per-position null probability *for a distinct-value sequence*; it is NOT calibrated for a constant-value run (see Forensic targets — that regime is banked separately).

**Relationship to existing tests — sibling test/card, decided S303 (was "decide at implementation").** A separate test with its own flag and card, NOT a fifth entry in Exact Duplicate Detection's `rawPs` BH-FDR combine (`:710`, `rawPs = [collisionP, rowDupPValueAdj, withinRowP, bestBlockP]`). The S303 scope read set out both routes. The fifth-entry route is the smaller diff (one array slot plus a p and a result field) but the larger blast radius: BH-FDR scales each raw p by (n/rank), so moving the denominator 4 → 5 nudges every existing sub-test's adjusted value and `combinedP = min(adjusted)` can move on any fixture — the whole shipped DupDet verdict surface is in scope, and it folds a genuinely different null into a combine whose four members share the copy-paste family. The batch would flag the movement but cannot adjudicate whether it is legitimate (green batch ≠ sound family membership). The sibling route is the larger diff (full test onboarding — see the build prompt) but zero blast radius on existing verdicts and a clean independent null. Decision: sibling, on null-independence and blast-radius grounds — the costlier error for a fabrication tool is disturbing a verdict that was already right. The display card (`MiniCard_DuplicateDetection.jsx`) hardcodes no sub-test count; the "four" lives in module internals (`_rawPs` `:729`, the description string `:718`) and `test/dupdet-movement-audit.mjs:70` (positional four-way destructure) — all Code-owned, all additively handled by the sibling route.

**§2-convergence wiring is a deferred follow-up (S303), not part of the build.** The sibling detector ships card-only in the first build: its own flag and card, no wiring into §2 cross-test convergence. Whether a §2.4 HIGH should participate in convergence escalation (2× MODERATE → HIGH, and the dataset-verdict roll-up) is a separate decision with its own blast radius — convergence membership changes which flag combinations drive severity, so it is scoped and dispatched on its own, after the card-only detector is promoted and its verdicts observed on the real corpus. Recorded here so it isn't orphaned; do not fold it into the onboarding build.

**Relationship to §2.6 (S299 proposed this as the fix path; S300 falsified that — this entry is NOT the §2.6 fix).** S299 closed the single-column collision *count*-null route (the marginal is under-determined; see §2.6's S299 entry) and redirected the §2.6 continuous-recurrence fix here, reasoning that the signal is arrangement, not count. S300 tested that redirect at source and it does not hold. Two measurements decided it. (a) The engine's block-copy Pass 1 (full-row hash) does not read single-column *runs* — it reads *recurring row-sequences*, so it fires identically on a contiguous block and on a periodic arrangement (S300 measured both at block p 6.25e-4 on identical marginals) and stays silent only on aperiodic scatter. A periodic arrangement is legitimate structure (fixed-order repeated measures, plate layouts), so Pass 1's null is a false-positive generator for the copy-paste mode, not a re-scopable basis. (b) Decisively, CORPUS-03's actual SL defect is **scattered, not contiguous** — every unique value recurs exactly four times, scrambled across the four observation rows per fish by an ID-misalignment join error (`REALWORLD-CORPUS-SPEC.md` CORPUS-03 documented-defect line). A longest-contiguous-run statistic scores that LOW (S300 probe: aperiodic scatter of the same multiset prices at block p 1.0). So no arrangement/run test on this entry's axis detects CORPUS-03. **This entry remains valid for its own CORPUS-01 target** — the adhesive-removal sequential runs, which are genuinely contiguous — but it is not the §2.6 continuous-recurrence fix. The §2.6 redirect moves on (to a multiplicity-distribution statistic; see §2.6's S300 entry). Tracked S300 measurement: `archive/SESSION300-BLOCKCOPY-MEASURE.md`, fixtures `test/fixtures/fix-A-contiguous-run.csv` (contiguous) and `fix-B-scattered-recurrence.csv` (periodic false-positive case), committed to worktree `intelligent-elion-986667` (`8fe10a5`), unpromoted at S300 close.

**Source:** `SESSION292-CHAT-SUMMARY.md` (corpus run finding), `REALWORLD-CORPUS-SPEC.md` CORPUS-01 entry, `METHODOLOGY.md` §1.1 (confirms all four existing sub-tests' actual mechanisms).

**Priority:** Real-world-validated gap, not speculative — found via external data, not constructed fixtures. **S302 greenlit the sequence-regime build:** structure classified at source, transferred null measured to hold at MODERATE/HIGH on the real column, design settled to a width-1 re-scope of Pass B. This is the one corpus track that converts a genuine miss into a catch (a real positive for the paper's detection story). The S303 scope read is done: the enumeration question is settled (per-column sibling scan, not a widened Pass B gate — Pass B keys on the full column-set per row, so a widened gate would miss the target) and the sibling-vs-fifth decision is made (sibling test, own flag and card). **The sibling-onboarding build has since landed** — Sequential Duplication is a dispatched member of the 29-test battery and is deposit-verified firing on two corpus files (see the S329 paragraph below). The onboarding covered `engine.js` dispatch, the dispatch-map entries, `FISHER_EXEMPT`, MiniCard, `FINDING_COMPOSERS` and `keyFindingTemplates`, the per-column offset scan reusing the collapsed HHI^h pricing, and the distinct-value guard. What remains open in this entry is the grouped-order row-semantics gap below, not the detector. The constant-run regime stays banked (different null). Elevate if the paper's real-world section wants the CORPUS-01 miss converted rather than disclosed.

**S329 — the conversion is now deposit-verified on two files, not one.** The detector was measured firing on CORPUS-01 (HIGH 1.845e-6) and CORPUS-03 (HIGH 1.47e-35) in the round-1 sweep; S329 opened both deposits and confirmed the fires land on the documented rows. CORPUS-01: the two adhesive runs of 5 (SPF↔ExGF, both genotypes) and the GF/WT pole-descent triple, all three at their documented sheet positions, with 17 zero-weight `Hindlimb score` sequences correctly priced to pAdj = 1. CORPUS-03: all 39 sequences in `SL`, driven by a height-21 offset-8 run that is the ID-join scramble made visible — and here §2.4 supplies the correct severity that Exact Duplicate's HHI null loses (the §2.6 axis-2 under-call). So this entry converts **two** corpus misses/under-calls into catches, deposit-verified. See `REALWORLD-CORPUS-SPEC.md` CORPUS-01 and CORPUS-03 §2 entries. One legibility carry: the returned `col` is a matrix index needing the `dataCols` map (offset when condition columns are held out), and Sequential Duplication / Exact Duplicate use divergent row-index conventions in the same run — parked as an evidence-object contract item in the corpus spec's Open items.

**Long-format pivot misdetection — resolved S304 (was a pivot-dismiss caveat).** Briefly this catch was reachable only on the pivot-dismiss path: on live load the long-format detector (`detectLongFormat`, `longFormat.js`) false-fired on CORPUS-01's genuinely-wide 105×6 grid and suggested a pivot that, if accepted, reshaped it to a Beam-only 26×5 grid, discarding the Pole and Adhesive columns before any test ran. The S304 fix closed that at source. The detector now counts genuine numeric measurement columns (mostly-numeric, excluding integer-metadata, without the low-cardinality floor that had wrongly dropped CORPUS-01's fourth measure) and, when two or more are present, treats the table as already wide and suggests no pivot. On CORPUS-01 the pivot no longer appears: the full 105×6 wide data ingests on the default load path and §2.4 fires (adhesive HIGH, pole MODERATE) with no dismiss step (live-verified S304). So the real-world catch is now unconditional for the §2.4 duplicate finding — the paper's real-world section presents CORPUS-01 as a clean default-path catch, not a dismiss-conditional one, and the pivot caveat is retired. The fix has zero batch blast radius: only DS19 (genuine long-format, one measure) trips the detector across the fixture set, and the two-or-more-measures gate leaves it untouched (batch 25/25, no verdict moved). Distinct from §2.5's `inferRoles` — different module, confirmed at source.

**Row-semantics model is binary where CORPUS-01 is grouped-ordered — separate open item (S304, methodology not source-trace).** Suppressing the pivot did NOT settle the row-semantics half, and the reframe below corrects the first read of it. On live load CORPUS-01 auto-suggests `rowSemantics = arbitrary`, so the five sequential tests (Runs, Row-Mean Runs, Blocked Mahalanobis, LOESS, Regional Noise) are N/A'd unless the user selects `ordered` by hand (confirmed at the S304 live check). §2.4 fires regardless because it is row-semantics-invariant, which is why the pivot fix alone landed the duplicate catch. The first framing recorded this as a suggestion misfire to be traced. That is not quite right. CORPUS-01's rows are neither a meaningful whole-axis sequence (a spectroscopy trace) nor an arbitrary list (subjects in save order) — they are **grouped-ordered**: blocked by condition (Treatment × Genotype), with order carried *within* each block (the same block structure §2.4 keys on — SPF/WT rows 5–9, ExGF/WT rows 73–77). A whole-column scan across all 105 rows reads across block boundaries and mixes conditions, so `arbitrary` is defensible as a coarse call — it suppresses whole-axis scans that would misfire on a blocked layout — but it suppresses them for the wrong reason (not "no order" but "order is within-block, and a naive whole-axis scan cannot use it"). So the real gap is that the row-semantics model is **binary** (`ordered` / `arbitrary`) where CORPUS-01 needs a **grouped-order** concept: order meaningful within condition blocks, not across them. This is a methodology question, not a suggestion-logic bug — the binary flag cannot represent what CORPUS-01 is, so no setting of it is fully correct. It is adjacent to the S300 grouped-axis reasoning in §2.6 (invariance conditioned on a grouping column) — the same grouped-axis idea from a different entry. Banked S304, not yet scoped; needs a methodology pass on whether the row-semantics gate should carry a grouped-order state and what the five sequential tests do under it (per-block scans rather than whole-axis, or continued suppression with a clearer reason). It does not block the §2.4 or long-format-pivot promotes — both are real and verified; this is the remaining, harder piece of the same real-world import-correctness thread, and it is a model-expressiveness question, not a fix to existing logic.


**Value-Frequency-Spike near-dup keep-gate — BUILT S308, PROMOTED S309 (`e71f0d2`; road-test C23/C21/C20 + fixtures DS04/DS23/DS24).** A distinct test (Value Frequency Spike) and a distinct fix from the sequential-duplication detector above. Read-first, benign/signal characterisation, and design all done S307; built S308 after two source reads pinned the gate form and a ground-truth move; screenshot gate passed and promoted S309. Batch 28/28 (24 numbered severity + 3 new `vfs-*` fixtures + 1 long-form cross-shape sub-check).

*(Null model, gate, span-skip, and per-tail full-value decomposition all line-cited/measured through the real batch pipeline — Code reads.)*

- **What VFS is (keep it).** Pass 2 (`buildDigitSubstringPass`) keys on the fractional-digit substring, matching a shared decimal tail across differing integer parts — the near-dup catch the exact-duplicate family structurally cannot make.
- **The two defects fixed.** (1) The null (`poissonNeighbourScan`) had no signal-vs-noise term and was doubly permissive (the LOO neighbour mean under-estimates even the uniform baseline in crowded regions, so it over-fires on pigeonhole). (2) The `pass2MultiSpikeCleared` gate (≥2 spikes → escalate) inverted at low precision — pigeonhole makes many simultaneous benign spikes the norm — while only accidentally rescuing a single-tail heap.
- **DISCARDED design — occupancy / decimal-depth gate (falsified at source, S307).** Decimal depth only *correlated* with the split for the C21(2dp)/C23(6dp) anchor pair; it confounds precision with concentration. The Code build-stop decomposition falsified it: DS24 (2dp, sparsity 0.28 ≈ C21's 0.26) is a genuine `23.51`×10 near-dup occupancy would suppress, and it broke the batch on DS04. Same one-instrument error that retired the CI bands.
- **The discriminator — within-tail full-value concentration (decomposed across every VFS-firing case).** A genuine near-dup is one full value carrying the tail's count; a benign collision is many distinct full values sharing a tail. Measured: C21 `.54` 19/18-distinct/max-2 (pigeonhole, suppress); C20 `.00` 905/15-distinct (round heap, suppress); DS04 `.96` 8/7-distinct/max-2 (pigeonhole, suppress); DS24 `.51` 12/3-distinct/max-10 (`23.51`×10, keep); DS23 `.09` 10/1-distinct/max-10 (keep); C23 `.385732` 4 distinct whole parts sharing one 6-digit template (keep via depth, see below).
- **Gate AS BUILT — CONCENTRATION or DEPTH.**
  - **Concentration (precision-independent):** keep a pass-2 tail when `domFrac ≥ 0.5` **AND** `nDistinctValues ≤ 5`. Both clauses required, not the OR first specified — C20's `0.00`×871 heap passes dominance (0.96) alone but spreads over 15 distinct round values, so the few-distinct clause is what keeps it LOW for the right reason (a copy has one dominant value AND few distinct; a heap has one dominant value but many distinct).
  - **Depth (for near-dups across distinct integers):** keep when `10^L · P(Poisson(nCells/10^L) ≥ 3) < α` (α = `ALPHA.NOTE` 0.01), i.e. the shared tail is improbable even across distinct integers. Equivalent sparsity boundary τ ≈ 50–220; 2dp keyspaces never clear, C23's 6dp keyspace clears comfortably. This second keep-path is why READ A mattered — concentration alone would have destroyed C23 (4 distinct integers, no single dominant value).
  - **Effect-size (pass 2 only):** `ratio ≥ 2 OR smoothed === 0`. An isolated deep tail has an empty neighbourhood, so `poissonNeighbourScan` codes its ratio as 0 (`obs/0` guard) — the maximal near-dup effect, mis-dropped by the strict `ratio ≥ 2` gate. Pass-1 selection keeps the strict gate. Null-applicability, not a statistic change.
  - `pass2MultiSpikeCleared` **removed** (with dead `pass2TierRaw`, `bestSpikeP`); the per-tail keep-gate subsumes it.
- **The digit-preference boundary — why DS04 is a suppress, not a loss.** "Many distinct values sharing a tail" is benign pigeonhole (C21) but also the shape of malicious digit-preference fabrication — and the concentration gate cannot separate them, nor should it: **digit-preference is Terminal Digit Uniformity's domain.** READ B confirmed DS04's fabrication is carried by Terminal Digit (HIGH, p≈4.5e-7) and Exact Duplicate (HIGH, p≈1.7e-6); forcing VFS→LOW leaves DS04 at severity 3. So DS04's VFS entry was an incidental pigeonhole shadow, re-baselined to LOW in `batch-fixtures.mjs` with a note. DS23/DS24 promoted from ACKNOWLEDGED to declared near-dup detections.
- **C23's real near-dup — a Class-C false negative, now a guard-ordering problem (updated S309).** READ A found the true structure (`2.385732`×3, `6.385732`×2, `15.385732`×2, `1.385732`) only by reading raw values. Two upstream gates sit between that structure and a flag: (1) import rounding — **SUPERSEDED S309**, the numeric-raw import fix now carries the deep tail through (see Import precision, below); (2) the span-skip, which drops the deep bucket before the depth path runs (see VFS span-skip, below) and is now the sole remaining blocker. So real-file C23 is a **false negative** whose cause is now a single guard-ordering contradiction, not import loss.
- **Import precision loss — DONE S309 (`0190ed6`).** Excel numeric-raw import shipped (Option A, `excel.js`-scoped: two `sheet_to_json` passes, take raw per cell only when `typeof === "number"` — dates/strings keep the formatted path; `rawNumbers:true` was a no-op in xlsx 0.18.5, ruled out; a blanket `raw:true` breaks dates, confirmed). Deep tails now survive import (`2.385732` not `2.386`), verified live + by `test/excel-precision.mjs` (8/8, with a pre-fix discriminator). **Does NOT surface C23 on its own** — the span-skip drops the deep bucket upstream of the depth path (below). C23 remains a false negative until the span-skip build.
- **VFS span-skip runs upstream of the depth path — the mechanism of C23's false negative (S309 read, `SESSION311-SPAN-SKIP-READ.md`).** The `span > 10000` pass-2 skip is at **`valueFrequencySpike.js:300`** (pass 1 at `:212`) — **NOT `:226`; S308 shifted it.** `span = vMax - vMin` of the occupied fractional-tail keys — the numeric range, not the keyspace or distinct count. The skip and the S308 keep-gate are **complementary, not redundant**: the skip guards high-precision wide-scale (an O(span) loop in `poissonNeighbourScan` over every integer `vMin..vMax`, ~10^6 at 6dp, plus the empty-neighbourhood model breakdown); the keep-gate guards low-precision pigeonhole. S308 built the depth path *for* deep buckets, but the pre-existing span-skip drops those buckets *before* depth runs — so on realistic C23-shaped input (6dp tails scattered full-range, span >> 10000) the bucket is N/A'd and the depth metric (which would clear at 1.3e-6 < 0.01) never executes. Confirmed empirically. The pass-2 threshold is mis-inherited from pass-1's integer case — on a fractional keyspace, wide span is the normal state of any 5-6dp bucket, so the guard is nearly always-on for L >= 5. Unblocking is not a one-line lift: the O(span) scan is a real perf guard, and the obvious fix (iterate distinct keys) moves the shared BH denominator = a recalibration. **Gated on a §3.5 methodology decision** (is a deep tail shared across distinct integers a defensible fabrication signal, given quantized instruments / derived columns produce it benignly?) before any build.
- **Calibration set (as built, verified).** Keep: DS24, DS23 (concentration), C23-on-literal-precision (depth). Suppress: C21, C20, DS04 (many distinct, shallow tail). Batch 28/28, only VFS moved and only where intended (DS04 down; DS23/DS24 declared; three new fixtures). **Depth-proof asterisk (S309):** `vfs-c`'s tails are banded (`38xxxx`, span 9884 < 10000), so it **sidesteps the span-skip by construction** — the depth path is capability-proven only on narrow-span deep buckets; on wide-span deep buckets (C23's real shape, span >> 10000) it is unreachable until the span-skip build lands. Not an S308 flaw — the fixture did its job — but "depth path proven" carries this scope limit.
- **Other residuals (noted, not built):** the card-copy relabel (frequency-spike → near-dup, confirmed live on DS24 S309); the high-precision round-tail carve-out; the mid-precision τ anchor gap.
- **Status:** BUILT S308 (`d22df9f`), **PROMOTED S309** (`e71f0d2`, screenshot gate passed). Import-precision fix promoted S309 (`0190ed6`). Span-skip build outstanding, gated on the §3.5 decision.

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

**Continuous column tagged as a condition candidate — the third shape (S318, from the grouping cross-validation).** A distinct inference error from the two above, surfaced by Sonnet while cross-validating the §2.10 grouping contract. On C12, `Latitude` was among the columns tagged `condition`. It is not a factor-or-stratum ambiguity — it is a **continuous physical measurement misread as a categorical code.** Rounded coordinates and shared sites make a latitude column carry enough repeated values to fall under the low-cardinality condition gate, so it is treated as a grouping variable rather than a measurement. **Fix direction:** a continuous-value guard on condition candidacy — a column whose values look continuous (many decimal places, roughly uniform spread, high distinct-count among the non-repeated values) should be excluded from condition candidacy regardless of how many exact repeats it happens to carry. This is separate from the measurement-type/transform misclassification noted below (C12's lat/long driving a densitometry transform); that one is about which *transform* fires, this one is about whether the column is a *grouping candidate* at all. Both point at the same root — no confidence gate on a structural assignment — but they fire at different stages. Homed here with the role-inference fixes; small and self-contained enough to ship on its own.

**Relationship to §2.6 (consistency audit).** This entry's pooled-Mahalanobis half — the engine pooling one (μ,Σ) across unrecognised groups — is a cross-condition-pooling instance, the same failure family the *closed* item-28 integrity audit was built around; the role-inference half is upstream of it (garbage-in from column misclassification). §2.6 is the v1.x home for the consistency failure modes that audit did *not* cover (cross-column pooling, null construction, evidence/display). §2.5 stays the single source for the role-inference fix specifically.

**Priority:** Real-world-validated, blocks adjudication of at least one corpus dataset (CORPUS-03 cannot enter the paper's results table until resolved). CORPUS-03's Fish.ID-as-data is the more urgent half — it silently changes which columns the whole battery runs on, with no visible tell, whereas CORPUS-02's `conditionType: none` at least surfaces in the structure metadata. **Status (S293):** scope decision made — the spine fix is re-scoped to a dedicated v1.x arc and was NOT built this session, because the S293 design read established that any build small enough to ship this session closes the cosmetic misclassification while leaving the pooling contamination intact ("fixed without being fixed", in Code's words). CORPUS-03's near-term unblock routes through `conditionsHint` instead (wired S293, batch-proven inert); the durable fix is the discriminator-spine change described under "Shape of the work" above.

**Source:** `S292-ROLE-INFERENCE-SCOPE` (Code read-only diagnostic), `SESSION292-CHAT-SUMMARY.md`, `REALWORLD-CORPUS-SPEC.md` CORPUS-02 / CORPUS-03 entries.


**Measurement-type misclassification with no confidence gate — three road-test instances (C25, C21, C12; S305–S314).** Adjacent to the role/condition-inference work above (same structure-inference layer) but a distinct item: the engine assigns a *measurement type* and lets it force a variance-stabilising transform, with no confidence gate on the assignment.

- **C25 — "proteomics" measurement-type on non-assay data.** Forced a VST. **[OWED — full C25 adjudication is in the S305 source, not this surface; fill before placing.]**
- **C21 — "Western Blot Densitometry" classified on grassland ANPP.** Forced a log VST on ordinary ecological biomass measurements (Inner Mongolia grassland, *Sci Adv* 2022).
- **C12 — "Western Blot Densitometry" classified on plant root morphology (S314).** Root lengths, soil pH and 19 WorldClim bioclimatic variables, read as protein gels (*J Ecology* 2025). The engine offered a log transform on a sheet whose first two numeric columns are **latitude and longitude**. Transform declined at run; the offer itself is the tell.

All three are the same failure: a measurement-type label applied with false confidence to data outside its domain, driving a transform the data did not warrant. **Fix direction:** a confidence gate on the measurement-type assignment — below threshold, decline to classify and fall back to the untyped path rather than forcing a domain-specific transform. **Complementary to the §2.6 per-test applicability guards, and does not subsume them** — the §2.6 guards catch a mis-applied *test*; this catches a mis-applied *transform* upstream. Scope as its own confidence-gate item, homed here with the role/condition-inference fix. Firms to **three** instances (C25, C21, C12) — and two of the three are densitometry-on-ecology, so the misclassification is not random: the classifier has a densitometry attractor that ecological measurement data falls into. Watch the remaining ecology cluster for further recurrences under the skip rule.

### 2.6 Suite-wide test-consistency audit — extension beyond the closed condition-pooling audit

**What:** A v1.x audit pass covering test-consistency failure modes that the suite's *closed* test-integrity audit (item 28, S176–S183) did not examine — surfaced by the S293 CORPUS-03 re-run. Three demonstrated axes, all real-world-validated on one dataset, plus a short seed list of candidate further axes. Produces a classification artifact before any fix, in the same catalogue-first shape the closed audit and §3 both used.

**Relationship to the closed integrity audit (item 28) — this is NOT a resumption.** The S176–S183 test-integrity audit ran all four phases (Phase 0 gate-hardening S177; Phase 1 contamination sweep S178; A1 distribution-shape routing fix S179; Phase 2 per-cluster correctness S183) and **closed** — `TEST-INTEGRITY-AUDIT.md` is archived and untracked at `docs/shared/archive/`, closing line "STATUS item 28 closed." Its predicate was explicitly **cross-condition pooling only** (the S127 shape: moments/distributions/covariance/scale on raw values pooled across conditions without removing condition structure, or row-order assumptions). The CORPUS-03 axes below sit **outside** that predicate — they are cross-*column* and null/dispatch/display failure modes the condition-pooling sweep was never scoped to catch. So §2.6 is **new scope adjacent to a closed audit**, not a reopening of it. The audit's one live carry (item 32: Noise Scaling's column-grouped-multi-condition axis and Within-Row Variance, both fixture-gated, neither a CORPUS-03 axis) is noted here only so it isn't orphaned — it belongs to the same consistency neighbourhood but is a separate, pre-existing thread.

**The demonstrated axes — three from CORPUS-03 (S293, source-traced), plus a fourth added S330.** Axes 1–3 below are the founding CORPUS-03 set. **Axis 4 (S330) is new and is not a variant of axis 1**: it is an *input-representation* failure that defeats a test's predicate before pooling is ever reached. Both axes land on the same test — Decimal Precision Consistency — by different routes, which is the reason to keep them separately named.

1. **Cross-column pooling that manufactures a guard-passing property — Benford false positive.** Benford fired HIGH on the pooled two-column matrix `[SL, Total.distance]` (`matrix.flat()`), where the ≥1.5-OOM span that *lets Benford run at all* was supplied entirely by `Total.distance` (OOM 1.69); SL alone (OOM 0.095) is N/A by Benford's own span guard. A per-column digit test run on a cross-column pool, where the pool lends one column the precondition it individually fails → a false positive, propagated into the dataset verdict via convergence (one of the four HIGHs driving severity-3). The closed audit cleared Benford on the *condition* axis ("scale-invariant to condition shifts") and Phase 0's pooled-column pass only checked for contamination FPs on *clean* fixtures — the span-borrowing mechanism across columns was never enumerated. **New.**

   **S329 confirmation — re-measured at source during the CORPUS-03 round-1 adjudication, and it holds exactly.** Per-column `robustLogSpan`: `SL` 0.0946 (fails the ≥1.5 gate — refused, N/A alone), `Total.distance` 1.6949 (passes), pooled 1.5722 (passes). Invoking the real test functions on single-column matrices confirms it: `SL` alone returns N/A on both Benford channels; `Total.distance` alone returns First Digit HIGH but Second Digit **LOW**. Pooled, both channels go HIGH — first-digit χ² 855.6 (SL alone 1745.2, all 373 values digit-2; `Total.distance` alone 30.5), second-digit driven by SL's non-conformity (χ² 241.6) against a conforming `Total.distance`. **The pooling is intrinsic to the test, not a runner artefact** — `benford.js:13` and `benford2.js:16` both open with `matrix.flat()`, so the UI path pools identically; the returned object carries no per-column decomposition (`nValues = 746` = 373 × 2). So axis-1 is realised twice now (CORPUS-02 decimal-precision, CORPUS-03 Benford) and the fix predicate is confirmed per-test, not shared: **gate per column, pool only gate-passing columns** — a broad-span column must not carry a narrow-span column past a gate it individually fails. This is the specific fix shape for the Benford limb of the axis-1 design pass.

2. **Continuous-branch HHI null — a counterexample to a recorded "safe" claim.** Exact Duplicate Detection rated CORPUS-03's structured exact 4×-recurrence on SL as LOW (p=1.0): Test 1's collision null is the empirical HHI of the column's *own* value-frequency distribution, so a defect that inflates value frequencies inflates its own null baseline (expected collisions ≥ observed → p=1.0). Tests 2/3/4 are separately neutralised by the co-present, independently-real `Total.distance` column breaking the whole-row/whole-block identity they require. Scoped to SL alone, the engine's *own* block-copy sub-test rates the identical data HIGH (p≈3.6e-14) — the detection capability exists; the null and the multi-column dispatch suppress it. **The pointed part:** METHODOLOGY §1.1 already records the HHI circularity — *but for **integer** data only* — with the parametric collision-null fix wired for integer/N≤5000, and **continuous (dp>0) data documented as safe** (source comment `duplicateDetection.js:135`: "HHI circularity is not a concern for float data"). CORPUS-03's SL is continuous 2-decimal with structured recurrence — it sits squarely in the branch the existing caveat declares safe. So this is not a fresh speculative axis: it is a **real-world counterexample falsifying a safe-claim asserted in both METHODOLOGY §1.1 and source.** (Recorded as a BANKED correction in its own right.)

3. **Display-only scored paths and evidence/verdict misattribution.** Exact Duplicate Detection emits the SL duplicate pairs as evidence via a display-only path (`crossRowSameColLocs`) that feeds no statistic — it *lists* the smoking gun and scores it through nothing. Separately, Terminal Digit and VFS fired HIGH on the recurrence's *digit shadow* (VFS's `pass:"digit"` is a frequency test on fractional substrings; 84 distinct 2-decimal values each stamped ~4× over-represents those substrings), not on independent fabrication signal — so the surfaced evidence ("digit" spikes) misattributes *why* the test fired relative to how a reader interprets it as duplication. The closed audit's premise was the inverse (undeclared *right-reason* channels); neither display-only scoring nor evidence/verdict misattribution was in its method. **New.**

4. **Input representation defeats a test's own predicate before any pooling — Decimal Precision false positive on CORPUS-01 (NEW, S330).** Decimal Precision Consistency fired **HIGH (primaryP 1.586e-6)** on CORPUS-01, a clean-on-this-axis file, because the decimal-place counter reads IEEE float noise as real recorded precision.

   **The chain, source-traced.** `parseExcel` (`excel.js:82-88`) takes the `raw:true` underlying numeric primitive and stores `String(rawV)` — a deliberate S309 choice, and the right one: it stops a display format like `0.000` rounding real precision away before the engine sees it. `extractAnalysisInputs` (`engine.js:127-135`) threads those strings into `rawMatrix`. `decimalPrecision.js:37-38` then counts `String(v).split(".")[1].length`. **There is no tolerance step anywhere in that chain.** A stored computed average whose nearest double needs 16–17 significant digits — `3.5100000000000002`, which a human reads as `3.51` — is counted as **16 decimal places**.

   **How that produces a HIGH.** Over CORPUS-01's 301 decimal cells the counted histogram is 1dp: 14, 2dp: 272, 3dp: 4, **15dp: 5, 16dp: 6**. Six artefact cells set `maxDecimalPlaces = 16`. The test's one-tailed binomial trailing-zero model takes 16 as the true instrument precision, expects ~27 values at 15dp, observes 5, and reads the deficit as precision inconsistent with any single fixed-precision source. Eleven cells out of 301 — 3.7% — carry the entire flag. Running the **real** `testDecimalPrecision` on a 6dp-rounded copy returns **LOW, p = 1.0, maxDp = 3**: *"consistent with 3dp instrument output with trailing zeros stripped."*

   **Why this is not axis 1.** Axis 1 is cross-column pooling: a per-column test run on a pool, where the pool lends one column a precondition it individually fails. The S297 read established that Decimal Precision's axis-1 trip is exactly that — a high-precision column pooled with a large low-precision block inflating the shared total until the top level reads as a deficit. **Axis 4 needs no second column.** The predicate is already broken at a single cell, by how the value reached the counter. Pooling then propagates a corruption that was present before it. **Consequence: fixing the axis-1 pooling guard on Decimal Precision would not have caught CORPUS-01.** Two routes into one test; two guards needed.

   **Scope — general, not a CORPUS-01 quirk.** Any xlsx column of computed values stored at full double precision exhibits this, which is most spreadsheets containing an average. **Every Decimal Precision result in the corpus and the road-test sweep is suspect until a tolerance step lands**, and any prior adjudication resting on a Decimal Precision tier should be re-read against this.

   **Fix predicate — stated, deliberately not scoped.** Round to a tolerance before counting decimal places. The threshold is the whole design question and it cuts both ways: too coarse and it masks the genuine precision heterogeneity the test exists to find, which is precisely what the S309 import choice was protecting. Whatever lands must preserve S309's guarantee. A candidate shape is to round at the smallest number of decimal places that reproduces the value within a float-epsilon-scaled tolerance, so representation noise collapses while a genuine 3dp value stays 3dp — but that is a lean, not a decision. **Own session, with a fixture that carries both a genuine precision cliff and a float-artefact column so the guard is proved not to eat the signal.**

   **Batch-blindness.** No fixture carries float representation artefacts — fixture values are authored, not computed and stored by a spreadsheet. The batch cannot see this axis at all. A fixture built from a real xlsx round-trip is the only thing that would catch a regression.

**Candidate further axes (SEED ONLY — unverified, not demonstrated, do not treat as a taxonomy).** Beyond the three demonstrated axes, a structure-first pass over the per-test pipeline (input → unit → guard → null → statistic → correction → tier → convergence → evidence) and the inter-test properties suggests further places a correct statistic could still yield a wrong or non-comparable verdict: multiple-comparison correction-scope consistency (does each test correct over the right family); tier-mapping comparability across tests (the §5.4 large-N blocker is this axis); convergence laundering a mis-tiered flag into the dataset verdict (CORPUS-03's Benford FP is a live instance); inter-test redundancy double-counting one signal as two flags (Terminal Digit + VFS on the same recurrence shadow); shared-helper divergence (the §3 variance/SD-estimator catalogue is exactly this — "SD" meaning different things across cards); determinism/order dependence; boundary handling of missing/tie/zero/negative values. These are hypotheses to *check at source*, not findings — the demonstrated three lead; this list grew on every pass that produced it, which is the standing reason to treat it as a seed for a source-derivation read, not a settled list.

**The adjudication discipline (the project's own, not new).** For each axis the per-test verdict is **forensically-forced vs calibration-artefact** — does the test genuinely need its divergent choice for its target, or is it incidental and reconcilable? This is the closed integrity audit's "S123 Edit D" rule (no fix without a demonstrated artifact: a fixture/shape that false-positives on clean or false-negatives on fabricated), and §3's forced-vs-artefact catalogue is the same discipline applied to the variance axis. The continuous-HHI finding (axis 2) is itself the demonstrated artifact that lifts that null from "recorded safe" to "needs adjudication," exactly as the discipline requires.

**Operating model.** Catalogue-first, structure-first: a source-derivation read of the engine's per-test contracts confirms which axes are real before any classification table; the table precedes any fix; fixes prioritise the false-positive class (axis 1, pooling) ahead of the false-negative class (axis 2, suppressed duplication), since a fabrication-detection tool's costlier error is wrongly implicating a clean dataset. Read-heavy, larger than a session.

**Batch-blindness and fixture follow-on.** All four axes are invisible to the batch by construction (clean, single-magnitude, single-shape fixtures, with authored rather than spreadsheet-computed values). Two follow-ons worth naming, neither scoped here: a standing **mixed-magnitude / multi-column-shape fixture** so the cross-column-pooling and dispatch-shape classes become catchable in regression rather than only at the next corpus run; and, for axis 4, a fixture built from a **real xlsx round-trip** so float representation artefacts are present at all — no authored fixture can carry them.

**S295–S296 progress — source-derivation read done, fix-scoping advanced, fixture arc in flight.** The structure-first read the Operating model calls for ran across S295–S296. What it settled, and where the S296 fixture build revised it:

- **Axis 1 (cross-column pooling) — fix shape decided: per-test applicability checks, NOT a shared input-assembly guard.** The three axis-1 tests do not share a poolability predicate. Benford needs generative scale-regime homogeneity (each column a positive-scale multiplicative process with intra-process span ≥1.5 OOM); empirical-HHI needs a non-circularity condition that is not a cross-column property at all (violated by a single column — CORPUS-03's SL alone — with no pooling); Decimal Precision needs one true recording precision across the flattened columns. A column set can satisfy one and violate another, so a shared guard would force a false unification. The read also found a **second axis-1 instance — Decimal Precision Consistency** (`decimalPrecision.js` flattens the matrix under a single-instrument-precision model), which gives CORPUS-02's Decimal-Precision false positive a mechanism. Fix is three separate per-test guards; each guard's rejection predicate and threshold is an open Chat design pass (the axis-1 design pass, not yet done). **S296 correction:** the Decimal-Precision test is a one-tailed **deficit** test — it flags *under-representation* of a precision level versus a trailing-zero-stripping model, not precision *heterogeneity*. So the axis-1 Decimal-Precision mechanism trips on a precision **cliff**, not on mixed precision across a pool; the exact trip threshold is a source question carried into the S297 second read. **(S297 superseded: the trip is a two-column pooling artifact, not a single-column cliff — a high-precision column pooled with a large low-precision block inflates the shared total until the top level reads as a deficit. See the S297 entry below.)**

- **Axis 2 (continuous-branch null) — NOT a mirror of the integer null; model class decided.** The S295 build attempt confirmed at source that the integer-branch parametric null (`duplicateDetection.js:58-126`) is a **discrete count model** — Poisson/NB PMFs defined only on integers, values rounded via `Math.round` before the fit, collision probability summed over integer support at unit step — and does NOT extend to continuous 2-decimal data (applied bare it overestimates the collision rate ~100× and re-collapses p toward 1 by a different mechanism). So the continuous null is a **new model, not a branch-condition change.** The null-constraints read bounded the choice: downstream tolerates a granular simulated fraction (no closed-form requirement), the integer ceiling is accuracy-bound not compute-bound, and — decisively — the baseline must NOT be estimated from the observed value-repetition frequencies (that coupling is the circularity, in both the malicious and the benign-quantisation direction). That rules out the empirical HHI and rules out a bootstrap over the observed multiset. **Model-class decision: density-integration at recording precision** — collision probability as the integral of the squared value-density over the recording grid (`step = 10^-dominantDp`, already computed at `duplicateDetection.js:39`). A rescaled-discrete family was rejected (a tight rescaled continuous distribution is under-dispersed for Poisson/NB, needing a new discrete family with no offsetting benefit); a from-fitted-model simulation collapses into this same model by another route. **(S298 REOPENED — this model-class decision is no longer safe. Two builds against it failed the same way: the smooth-density object it rests on is blind to the coincidental exact-repeat rate that legitimate high-precision continuous data carries, so it over-fires on clean data. See the S298 entry below. The decided item is now the constraint the two failures pin, not this model class. S299 then tested one candidate satisfying that constraint (uniform birthday-collision over the recording grid) and retired it too — the whole single-column count-null route is now closed; the fix redirects to arrangement (§2.4). See the S299 entry.)**

- **The density estimator — the framing that it is "not fixture-discriminable and deferrable" is FALSE (S298 overturned it at source).** S296 concluded the estimator was not fixture-discriminable — no column shape separates the candidate models on the *defect* direction — and inferred from that it could be deferred behind a provisional Silverman kernel while the fix shipped. S298 disproved the inference. The candidates are indistinguishable on the defect direction only; they separate sharply on the *benign* direction, and the current batch exercises the benign direction after all. Measured (S298 build stop): a Silverman-bandwidth kernel null moves **eight** fixtures to HIGH, including **09-proteomics-clean** — a clean fixture false positive — plus five fabricated fixtures where Duplicate Detection is not the intended carrier. The defect fixture (23) does flip correctly, but the estimator cannot be deferred: the batch discriminates candidates, so the estimator is on the fix's critical path, not a later pass. The S296 assumption that "current data can't exercise the benign direction" was wrong at source — 09-proteomics-clean exercises it. **Consequence: the estimator choice is the fix. It is not deferrable, not fixture-independent, and not a separate later pass.**

- **Axis-2 dispatch (the `Total.distance` neutralisation of Tests 2/3/4) is an independent path** from the null (confirmed: null lives at `duplicateDetection.js:136`/`:173`, dispatch at `engine.js:323` `runPair`) — a separately-tracked item, not folded into the null fix.

- **Fixture — split into two halves; the estimator-independent half is built and in flight.** S295 specified one four-column fixture (`recur`/`wide`/`precA`/`precB`, ≥100 rows, plus a `recur`-alone control). S296 split it: the **fix-verification half** (the LOW→HIGH flip plus the axis-1 guards) is estimator-independent and buildable now; the **benign-quantised guard column** ("must stay LOW under the fixed null") depends on the chosen estimator and is deferred to the estimator pass. The pre-build read selected **Shape B** for the axis-2 `recur` carrier — five distinct continuous 2-decimal values each repeated ten times against a distinct background — because it flips decisively (LOW p=1.0 under the current HHI null → HIGH under the correct null) and reads as a plausible block-copy defect. Shape A (ten values ×5) can't serve — it stays sub-MODERATE even under the correct null. Shape C (three values ×20) flips but is a less subtle defect. Collateral-firing policy locked **surgical**: the fixture asserts only its carrier verdicts, not the broad Dimension III collateral set the draft mixed file fired. **(S297 superseded: a zero-collateral fixture is impossible — see the S297 entry below. The correct policy is "surgical = asserted carrier verdicts + a named, reasoned `ACKNOWLEDGED` allow-set," not zero collateral.)**

- **S296 build stopped and reported — two carriers reproduce, two structural blockers.** The build (worktree `s296-fixture`, commit `e1b09bd`, not promoted) reproduced two of three carriers: `recur` → Duplicate Detection LOW (the empirical HHI multiplies into all four DupDet sub-channels — `duplicateDetection.js:633,673` — so the recurrence inflates every channel's null, not just the collision channel), and `recur`+`wide` → Benford span-borrowing HIGH. Two blockers stopped the build (no engine touched, no fixture tuned, batch held 23/23): (1) the **Decimal-Precision carrier does not reproduce** — the deficit-test correction above means mixed precision produces a surplus the test ignores, so the carrier needs a precision cliff; (2) the **single-column control is impossible** — `preprocessRaw` sets `minCells = max(3, …)` (`parser.js:28`), collapsing a one-column CSV to zero rows, so the control needs a three-column construction with two fillers that leave the DupDet channels intact.

- **Harness held-fixture mechanism (S296 pre-build read).** The fix-verification fixture asserts a verdict the *current* engine gets wrong (recurrence LOW where correct is HIGH), so it can't enter the 23/23 pass-gate until the fix lands. The batch runner has a dormant `pending: true` lane at `validate-batch.mjs:151-155` that reports a fixture's severity but routes it to a counter, never pass/fail — the held-fixture mechanism, unused today. The fixture lands held via this lane; the flip path once the fix lands is a single-site edit to the fixture's `EXPECTED` entry in `batch-fixtures.mjs` (drop `pending`, set `severity`, populate the `flags` allow-set). The lane's documented intent ("no applicable test yet") is a near-but-inexact fit — the §2.6 case is "test runs, wrong verdict by design" — so the `pendingNote` carries the distinction; a dedicated `held` flag was considered and deferred as an unnecessary runner edit.

- **S297 — second read done, fixture built and landed (batch 25/25).** The second read-only pass settled both S296 blockers at source and returned one policy finding.
    - **Decimal-Precision carrier is a two-column pooling artifact, not a single-column cliff.** Measured on CORPUS-03 directly: `SL` alone LOW, `Total.distance` alone LOW, pooled MODERATE (p ≈ 0.0017, the deficit landing at the maxDp−1 level). The firing exists only because `testDecimalPrecision` flattens the columns into one histogram and the low-precision column inflates the shared total, turning a high-level surplus into a deficit. This confirms CORPUS-03's Decimal-Precision MODERATE **is** the false unification the axis-1 guard targets — the carrier tests the right thing. Built as a separate high-precision `hiprec` column pooling against `recur`'s 2-decimal block: `hiprec` reads LOW alone (its top-level count is a surplus against its own N), MODERATE only when pooled, p = 0.0030 (mid-band, clear of both boundaries). The "precision cliff" framing the S296 correction introduced is superseded — the faithful reproduction is two-column pooling.
    - **Control is `recur` plus two distinct-value, same-band fillers.** A filler leaves all four Duplicate Detection channels inert if its values are distinct within-column and sit in a band disjoint from the carrier; the fillers must be distribution-matched and shuffled (a raw uniform draw raised a stray Runs/Kurtosis firing that a matched filler quiets). Built; DupDet LOW, no filler-induced strays.
    - **Collateral is declared, not suppressed — this supersedes the S296 "surgical" lock.** A zero-collateral fixture is impossible while the carriers are present. VFS HIGH, Entropy MODERATE, and Column-Goodness-of-Fit MODERATE are `recur`'s intrinsic digit-and-distribution shadow — they appear in every configuration containing `recur` and vanish only when the defect is deleted. Selective Noise HIGH is welded to the Benford span column: the ≥1.5-order span that fires Benford is the same variance outlier that trips Selective Noise's Bartlett. Decision (locked): **accept declared collateral via the `ACKNOWLEDGED` allow-set.** The collateral is the engine correctly seeing the defect's shadow, not noise; suppressing it would deform the defect; and the intrinsic set is close to what CORPUS-03 itself fires, so a fixture firing less would be the less faithful one. Splitting carriers across fixtures was rejected — it cannot make any `recur`-containing fixture collateral-free. **The correct definition of "surgical" is: asserted carrier verdicts plus a named, reasoned collateral allow-set — not zero collateral.**
    - **Landed.** Two fixtures (`23-recurrence-null-mixed`, `24-recurrence-null-control`) merged to main at `8cebafe` via the held `pending` lane (confirmed 23/23 + 2 pending against live output), then flipped to gate (25/25). No engine logic changed. Ground truth: Benford First HIGH, Benford Second HIGH, Decimal-Precision MODERATE, DupDet **LOW** (the pre-fix verdict — fixture `23` pins the bug so the eventual continuous-null fix flips it LOW→HIGH visibly). `ACKNOWLEDGED` set on the mixed file: VFS HIGH, Entropy MODERATE, ColGoF MODERATE, Selective Noise HIGH; on the control: VFS HIGH, Entropy MODERATE, ColGoF MODERATE. Noise Scaling stayed quiet (mixed file held to two scale tiers) and needs no declaration.
    - **Promote note.** `promote.sh` fataled twice on mechanical snags neither the fixture's fault — the script assumes branch `claude/<worktree>` but Code names branches `worktree-<worktree>`, and an untracked read2 copy in main's working tree blocked the merge. Completed by manual `--no-ff` merge. The branch-name mismatch is a Code-owned carry.

- **S298 — the fix track opened, two builds, two clean failures at the gate; the null-model class is reopened.** The session read the null path, scoped the fix, attempted it twice, and stopped both times at a source-confirmation gate before any source edit. No source, fixtures, or batch changed all session. Two reads landed (`SESSION298-NULL-PATH-READ.md`, `SESSION298-ESTIMATOR-READ.md`). What it established:
    - **The null path is small and code-isolated.** The continuous collision null is the empirical Herfindahl index at `duplicateDetection.js:55`, assigned to `p1` at `:147`, tested against the observed same-value-pair count at `:179-184`; consumed nowhere else. The integer/continuous branch splits on `isInteger = dominantDp===0` (`:54`); the integer moderate-N parametric arm is `:58-126`. One call site (`engine.js:323`). The recording grid (`step`, `:39`, from `dominantDp`, `:38`) is already local where the null is built. **Correction to the S296/S297 record:** the empirical index does NOT multiply into all four DupDet sub-channels — the `:55` global index feeds only Test 1 (collision); Tests 2/4 recompute their own *per-column* indices (`:642`, `:219`), and the comment at `:140-146` overstates the coupling. The prior "multiplies into all four channels" claim was true of the method, not the variable.
    - **The per-column stratified combine is clean and survives — reusable.** Splitting the collision test per column (within-column observed pairs against each column's own null, aggregated as a single stratified binomial) reproduces the current verdict on **all 25 fixtures** when the baseline is the per-column empirical index. So the combine rule is sound; only the baseline is in question. Per-column dp is derivable at the build point (`String(v)` precision per column, `:37`) with no threading — the pooled `step`/`dp` at `:38-39` become per-column locals.
    - **Per-column vs pooled grid step was decided per-column** (Chat lock): the pooled step borrows one column's recording precision for another, reintroducing the cross-column false-unification family this fix exists to remove. Each column integrates at its own step. This decision stands regardless of the estimator outcome.
    - **The estimator is the blocker, and it retired a whole family of candidates.** Build 1 (Silverman smooth-integral): eight fixtures move to HIGH including clean 09-proteomics — a smooth density sends the exact-collision probability toward zero as precision rises, so legitimate coincidental exact repeats over-fire. Build 2 (cell-discretized density — a Herfindahl over recording cells, meant to assign coincidental same-cell matches realistic mass): **numerically identical to the smooth integral** (0.03% apart on fixture 23's recurrence column), because summing squared cell masses is a Riemann sum that converges to `step × ∫f²` whenever cells are narrow relative to the kernel bandwidth — and every continuous column in the batch sits deep in that regime (2–6dp precision against bandwidths ≥0.6). Same seven benign movers, same p-values. **The structural finding that retires the family:** comparing exact-repeat counts against *any* smooth-density collision rate cannot separate genuine recurrence from the coincidental exact repeats legitimate high-precision data carries — integral or cell-sum alike. The next baseline's expected-collision rate must be neither the observed repeats (circular — the original bug) nor a smooth continuous density (quantization-blind — both S298 failures).
    - **The constraint now pinned (this is the decided item, replacing the reopened model class).** The collision null's expected-collision rate must model the coincidental exact-repeat rate of quantized-but-continuous data *directly* — derived from the recording precision and the value spread (e.g. a birthday-collision rate over occupied grid cells given the column's effective support, or a discrete model whose cell-occupancy expectation is derived rather than kernel-smoothed), without fitting the observed repeats and without assuming a smooth continuum. Naming a candidate that satisfies this is a Chat statistical-design pass, then a read to test it against all 25 — the S299 lead.
- **S299 — the first constrained candidate tested and retired; the marginal-null route is now doubly discredited, and the fix redirects to arrangement (§2.4), not a better count-null.** The S299 lead was the collision-null expected-rate design pass. Chat named one candidate satisfying the pinned constraint — a **birthday-collision expectation over the recording grid**, `E[pairs] = C(n,2)/K` per column, `K = trimmed_range/10^-dp + 1`, cell probabilities **uniform over support** (max-entropy: derived from precision and spread only, never from observed repeats). A read (`SESSION299-COLLISION-NULL-READ.md`, committed to main docs-only at S299 close) tested it against all 25 fixtures through the locked per-column stratified combine. Source isolation re-confirmed exactly, harness self-validated (empirical index reproduces the live flag on all fixtures, so every movement is the baseline swap alone). Result:
    - **Target flips, benign direction fails.** Fixture 23 flips LOW→HIGH decisively (collision p≈1.7e-201; recur column 225 exact pairs vs 11.3 expected). But three benign fixtures fire to HIGH — **09-proteomics-clean, 11-rnaseq-multicondition, 24-recurrence-null-control** — plus two more move (12a clean, 12b). Uniform cell probability under-predicts the coincidental exact-repeat rate of any *clustered* distribution recorded at one or two decimals over a bounded range, so ordinary clean repeats read as impossible and over-fire. This is the same structural failure as the S298 smooth-density family, one precision-regime over: S298 over-fired on high-precision clean data (smooth density, floor→0); S299 over-fires on coarse-precision clustered clean data (uniform, floor too low). Both are the marginal being unable to separate clustered-clean from copied.
    - **K_eff does not rescue.** The banked S299 fallback (participation-ratio effective support, plain 1/Σq² and diagonal-excluded leave-one-out) was tested for the failed movers: both forms hold them LOW but by collapsing back to the empirical null (plain form restores the current baseline; leave-one-out sets expectation = observation) — both circular, and both un-flip the target. K_eff is the empirical bug under a different name.
    - **Trim is not load-bearing** — no verdict flips between trimmed (P99−P1) and untrimmed (min−max) K on any fixture.
    - **Fixture 24 is mis-designed (Chat item, not a baseline flaw).** 24's recurrence column is byte-identical to 23's (same 120 values, 75 distinct, 225 pairs). A control byte-identical to the defect fixture cannot stay LOW under any baseline that flips 23 — it is a duplicate, not a control. The valid benign-mover roster is therefore 09, 11, 12a, 12b (plus 19–22, which this candidate actually *repaired* from the S298 smooth-density breakage). See the §Carry-in fixture-integrity item.
    - **The structural conclusion (the S299 finding that redirects the fix).** The single-column exact-collision null is **under-determined**: a single value's marginal carries no joint support, so its coincidental exact-repeat floor is substantial and shape-dependent, and no precision-and-spread-derived rate can separate genuine recurrence from the coincidental repeats a clustered clean column carries — uniform, smooth, or otherwise. This is confirmed from two independent directions: (a) the engine's *own* block-copy sub-test already rates SL-alone HIGH (p≈3.6e-14) by reading *arrangement* where the collision null reads the *marginal*; (b) the most comparable external tool (Englund's `copy-paste-detective`) detects duplication on **sequences and rows** (`repeatedColumnSequences`, `duplicateRows`) and never poses the single-column-marginal collision question. Both say the same thing: **structured recurrence is an arrangement signal (order/position), and recovering it from a value-frequency marginal is the wrong instrument.** The §2.6 fix therefore redirects — **it is not "find a better continuous collision null." It is "route structured continuous recurrence to the arrangement test, which already exists as the §2.4 entry (column-localised sequential duplication detector), and keep the exact-collision null integer-only."** The S298→S299 arc's value was proving the count-null route closed from both regimes so the redirect is defensible, not premature. **(S300 falsified this redirect — the arrangement route does not detect CORPUS-03 either. See the S300 entry below. The two independent directions cited above were both misread: (a) the "SL-alone HIGH by reading arrangement" figure came from the block-copy hash reading *recurring row-sequences*, not single-column runs, and it fires on periodic-clean data too — a false positive, not a detection; (b) Englund's sequence/row strategies target *contiguous* runs, but CORPUS-03's defect is scattered, so they would miss it as well. The count-null route stays closed; the arrangement route is now closed alongside it.)**

- **S300 — the arrangement redirect (route to §2.4) is falsified; the fix redirects again, to a multiplicity-distribution statistic (a lead, not yet a locked design).** S299 sent the fix to §2.4 (arrangement detection). S300 tested that at source and closed it. A read established the engine's block-copy Pass 1 reads recurring *row-sequences*, not single-column *runs*; a tracked measurement (`archive/SESSION300-BLOCKCOPY-MEASURE.md`) then showed Pass 1 fires identically on contiguous and periodic arrangements at identical marginals (block p 6.25e-4 both, height h=10), silent only on aperiodic scatter — so its null cannot separate a copy-paste from legitimate periodic structure, and is not re-scopable for §2.4. Decisively, CORPUS-03's real SL defect is **scattered, not contiguous** (`REALWORLD-CORPUS-SPEC.md` CORPUS-03 documented-defect line — each value recurs four times, scrambled across a fish's four rows by an ID-misalignment join, not laid down in a block), which no run/arrangement statistic detects. So the arrangement axis fails CORPUS-03 exactly as the count-null did, for the mirror reason: the count-null read the marginal (no positional signal); the run test reads position (but the defect has none).
    - **The through-line across all three closed routes.** CORPUS-03's defect is structured value recurrence with *no positional signature and no marginal excess separable from clustering* — the one thing distinguishing it from clustered-clean data is that every distinct value recurs the **same** number of times (exactly 4). The signal is the **degeneracy of the per-value multiplicity distribution**, not arrangement and not collision magnitude. Count-null (Test 1 HHI) reads the value marginal → can't see it (closed S299). Block-copy Pass 1 reads row-sequence recurrence → fires on periodic-clean, false positive (closed S300). Longest-run reads contiguity → the defect isn't contiguous, scores LOW (closed S300).
    - **New lead (S300) — multiplicity-distribution statistic.** A statistic on the distribution of per-value repeat counts: a defect that replicates each value k times spikes the multiplicity histogram at k, enormously improbable under the dispersed multiplicity distribution of coincidental repeats at the column's precision and spread. It is position-blind (correct for a scattered join-error) and shape-based not magnitude-based (dodges the marginal under-determination that closed the count-null). Candidate statistic: the fraction of distinct values sharing the modal multiplicity, or a chi-square of the observed multiplicity histogram against the coincidental-repeat expectation.
    - **This lead was measured (S300) and does not cleanly survive — the route is closed, making four.** The measurement (`archive/SESSION300-MULTIPLICITY-MEASURE.md`) computed the per-value multiplicity distribution across four arms: pure defect (`fix-A`, five values ×24), realistic in-tree defect (fixture 23's `recur`, five values ×10 in a singleton background), dispersed clean (09-proteomics), and clustered clean (11-rnaseq, 12a — the count-null breakers). Two named quantities were tested and both fail. `concentrationAboveOne` (fraction of distinct values with multiplicity ≥2) **anti-separates**: the realistic defect sits at 0.067, *below* clustered-clean 11-rnaseq at 0.154 — diluted to realistic proportions the defect injects *less* repeat-mass than a genuinely clustered clean column carries by chance. `modalFrac≥2` (tightness of the ≥2 concentration) separates the defect from 11-rnaseq (1.0 vs 0.60) but **ties** clean 12a (both 1.0, because 12a's coincidental repeats are all pairs at multiplicity 2). The only real separator is the multiplicity *value* where the mass concentrates (defect 10/24, clean 2) — which neither named quantity encodes — and even that overlaps in the hard case: 11-rnaseq carries a coincidental clean repeat at multiplicity 10, exactly the in-tree defect's k. A viable statistic would need three conditions at once (tight concentration, at a high multiplicity above the coincidental floor, shared by several values) and even then clears clustered-clean only when k is large; `fix-A` at k=24 separates from everything, the realistic k=10 defect does not.
    - **The root cause, and why all four routes close together.** These are not four independent dead ends — they are one fact seen four ways. **At realistic dilution the single-column defect is marginally quieter than clustered clean on every axis.** Count, arrangement, run-length, multiplicity are all functions of one column's value-multiset-and-order, and fixture 23's defect has a *weaker* signal on each than a clustered clean RNA-seq column. No single-column statistic can rank the defect above the clean column when the defect's marginal signal is strictly smaller. (Note: the S299/S300 intermediate claim that "uniformity of the repeat count across distinct values" is the defect signature is **retired by this measurement** — clean 12a reaches `modalFrac≥2`=1.0 too, so multiplicity-uniformity is not defect-specific.)
    - **The reframe (S300 — the new open question, NOT closed, NOT yet designed).** All four closed routes read the **SL column alone**. CORPUS-03's defect is a *join error* — `Fish.ID` misaligned, scattering a per-fish measurement across that fish's four observation rows. The missing signal is not in SL's marginal; it is in the **relationship between SL and Fish.ID**: the defect makes SL show the wrong within-group invariance structure (constant where it should vary across a fish's observations, or vice versa). That is a **grouped cross-column conditional-duplication** signature, invisible to any single-column statistic *by construction* — which is exactly why all four failed. This reframes §2.6: the single-column framing is proven closed (four ways); the defect is only detectable as invariance conditioned on the identifier column. CORPUS-03's provenance names the mechanism — `Fish.ID` is its single load-bearing declared role, and the defect is *defined* by its relation to that column. This is a distinct test and likely a distinct V1X entry (adjacent to §2.7's cross-column territory but keyed on a grouping column, not an offset), and it **might** be tractable where the single-column version is proven not to be. It is a lead only — untested. The unverified question before any design: does SL actually go invariant-within-`Fish.ID` in the raw data, or does the join scatter it in a way that *also* washes out at group level? CORPUS-03 is gitignored; this needs a structure-first measurement on the real column or a tracked grouped fixture built to the join-error shape, per S237 — no design until it is looked at. **(S301 supersedes: the structure-first read ran and the reframe failed the gate — within-fish invariance is a minority feature, the recurrence washes out at group level, §2.6 is fully closed. See the two S301 entries directly below.)**
    - **The reframe FAILED the structure-first gate (S301 — grouped cross-column is closed too, making the closure complete).** S300 left the grouped reframe as an untested lead, gated on one structural question: does SL go invariant-within-`Fish.ID` in the raw data, or does the join scatter it so it also washes out at group level? S301 answered it at source — a read-only pass over the real CORPUS-03 column (`corpus-data/CORPUS-03.csv`, gitignored; 373 rows, 94 fish, Obs 1–4). The answer is the washing-out branch. The within-fish invariance the reframe needed is a **minority feature**: 78 of 94 fish show *positive* within-fish SL variance, only 16 are constant. Of the 72 SL values recurring exactly 4×, only 15 (≈21%) are pure within-fish (span one `Fish.ID`); 34 (≈47%) are fully scattered across four *different* fish; 23 span two or three. It is a scatter-dominated continuum, not the clean span-1/span-4 stamp the join-error gloss implied — so a grouped-variance statistic keyed on `Fish.ID` keys on the minority signal, and the recurrence washes out at group level exactly as the killing branch predicted. Two further facts from the same read seal it: there are **zero singletons** (all 84 distinct SL values recur), and SL is stored to two decimals over a ≈15–25 range, so a share of the recurrence — the low-span collisions especially — is plausibly *coincidental quantization collision* rather than the join error, and the two are inseparable from the column values alone. That is the same under-determination that closed the count-null (S299), now visible in the raw structure. **The group-level signature of the defect dilutes below the coincidental-collision floor of the column's own precision.** So the grouped route closes for the same root reason as the other three, not a new one — the defect's separating signal is quieter than the column's own coincidental floor, on the marginal, on arrangement, and now on group-conditioned invariance.
    - **Resolution for §2.6 (fully closed, S301).** The continuous-recurrence defect is **not separable from the column — not marginally, not by arrangement, and not by group-invariance conditioned on the identifier.** Five statistics across S299–S301 (count-null from two precision regimes, block-copy arrangement, longest-contiguous-run, multiplicity-distribution, grouped within-`Fish.ID` variance) all fail for one root reason: at realistic recording precision the defect's separating signal is quieter than the coincidental-repeat floor the column itself carries. This is the disclosed limitation for the paper's §5 — a stronger result than a fragile fix: the tool detects the pattern (Exact Duplicate Detection lists the recurring rows as evidence) and correctly declines to over-grade it. There is no open successor question and no next single-column-or-grouped move; §2.6's design programme is complete. What remains under §2.6 is documentation and the axis-1 guard work, not a detector for this defect. The corpus's genuinely resolvable rows are handled elsewhere: CORPUS-01's contiguous single-column runs by §2.4 (a real, buildable detector for a *different* defect shape), and CORPUS-02/CORPUS-03's role-inference pooling artefacts by §2.5.

**Remaining §2.6 gates:**
- **The continuous-recurrence fix — CLOSED, no move remaining (S301).** There is no detector for this defect and no next design pass to unblock. The count-null route closed from both precision regimes (S298 high-precision over-fire, S299 coarse-precision over-fire — the marginal is under-determined); the arrangement/run route closed (S300 — the defect is scattered, not contiguous, so the block-copy null reads recurring row-sequences and fires on periodic-clean data, and no run statistic reaches a scattered defect); the multiplicity route closed (S300 — anti-separates, the realistic-dilution defect injects less repeat-mass than a clustered clean column); and the grouped within-`Fish.ID` route closed (S301 structure-first read — the within-fish invariance is a minority feature, the recurrence washes out at group level, and a share is coincidental quantization collision inseparable from the column). One root reason across all five: at realistic recording precision the defect's separating signal is below the column's own coincidental-repeat floor. Fixture `23`'s DupDet verdict stays LOW, correctly — the defect is not single-column-or-grouped-separable, so no fix flips it, and the earlier "LOW→HIGH when the fix lands" expectation is retired. The historical count-null path detail (S298: `duplicateDetection.js:55/:147/:179-184`, one call site; the clean per-column stratified combine; per-column grid step) is retained only as the record of what was ruled out — it is not a live fix site. **This closure is the paper's §5 disclosed limitation; METHODOLOGY §1.1 was corrected to match (S301, main `0d01e41`).**
- **Axis-1 rejection predicates** — the per-test guard thresholds for Benford / empirical-HHI / Decimal-Precision; a Chat design pass with no read pending, bankable anytime. Independent of the axis-2 estimator work.
- **Axis-4 tolerance predicate (NEW, S330)** — the rounding tolerance applied before Decimal Precision counts decimal places. **Distinct from the axis-1 Decimal-Precision guard and needed in addition to it**, since the two failures reach the same test by different routes. Source read is done (`S330-CODE-READ-CORPUS01-CHANNELS.md`); what is open is the threshold design and a fixture that proves the guard does not mask genuine precision. Own session. **Until it lands, treat every Decimal Precision tier in the corpus and road-test record as unverified.**
- **The source-comment correction** (`duplicateDetection.js:135`) — **LANDED S301 (`a0e54f7`), verified at source S302.** The comment now carries the full "closed, not pending — proven not separable" framing (not separable across marginal, arrangement, multiplicity, and grouped within-identifier invariance; do not port the integer parametric null across; cross-refs to METHODOLOGY §1.1 and this entry), matching the correction METHODOLOGY §1.1 received the same session (`0d01e41`). The `:140-146` coupling overstatement was fixed in the same commit — the note at `:150-153` now states the `:55` empirical index feeds only Test 1; Tests 2/4 recompute their own per-column indices. Source, methodology, and paper agree. No engine logic changed — comment-only. (The S302 opener and an earlier draft of this line both carried "STILL OWED"; that was record drift — the S301 close-out captured the `0d01e41` methodology commit but not the `a0e54f7` comment landing that followed it. Reconciled at source S302: `git merge-base --is-ancestor b53bc07 origin/main` = ON-MAIN, and `a0e54f7` is present in `git log origin/main -- src/tests/duplicateDetection.js`.)

**Ground-truth note (corrected S296, confirmed S297).** CORPUS-03's actual tiers are Benford First **HIGH**, Benford Second **HIGH**, Decimal-Precision **MODERATE** — not HIGH as the estimator read's paraphrase and the two S296 fixture prompts stated. The wrong tier propagated from a prior read's paraphrase into two prompts without a source check against the engine's CORPUS-03 output. The S297 read confirmed the Decimal-Precision MODERATE is a pooling artifact (neither column fires alone). Fixture `23` (landed S297) inherits these tiers.

**Priority:** Real-world-validated and credibility-bearing for the review paper's methods section (an honest disclosed-limitations pass strengthens the validity claim). **Axis 4 (S330) is the most actionable single item** — a nameable, reproducible artefact with a demonstrated counterfactual, affecting every Decimal Precision result until fixed. The continuous-HHI counterexample (axis 2) is the most defensible single item — a documented safe-claim falsified by external data. The fix-verification fixture is built and landed (S297, batch 25/25 — all three carriers reproduce, collateral declared via `ACKNOWLEDGED`). **There is no remaining null-path fix — the continuous-recurrence defect is proven not separable from the column across all five routes (S298–S301; see the "continuous-recurrence fix — CLOSED" gate above), so §2.6's design programme is complete.** This is now the paper's §5 disclosed limitation, not open work: the tool detects the pattern and correctly declines to over-grade it, a stronger result than a fragile fix. What remains under §2.6 is documentation and the axis-1 guard predicates, not a detector for this defect. The corpus's genuinely resolvable rows route elsewhere: CORPUS-01's contiguous single-column runs to §2.4 (a real, buildable detector for a different defect shape), CORPUS-02/CORPUS-03's role-inference pooling artefacts to §2.5.

**Source:** S293 conversation (CORPUS-03 adjudication) + the S293 Code read of the closed item-28 audit (`docs/shared/archive/TEST-INTEGRITY-AUDIT.md`, METHODOLOGY §1.1, `duplicateDetection.js:135`); the S295 reads (`SESSION295-AUDIT-SUMMARY.md`, `SESSION295-IMPL-SUMMARY.md`, `SESSION295-AXIS2-NULL-CONSTRAINTS.md`); the S296 reads (`SESSION296-AXIS2-ESTIMATOR-READ.md`, `SESSION296-FIXTURE-PREBUILD-READ.md`, and the worktree's `SESSION296-FIXTURE-BUILD-FINDINGS.md`); the S297 second read (`SESSION297-FIXTURE-READ2.md`); the S298 reads (`SESSION298-NULL-PATH-READ.md`, `SESSION298-ESTIMATOR-READ.md`). The candidate-further-axes list is a seed pending its own source-derivation read, not a settled taxonomy.


**Axis-1 (cross-column pooling) — three real-world span-borrowing instances beyond CORPUS-03 (road-test C25, C11, C21, S305–S306).** Beyond the founding CORPUS-03 case, the road-test sweep has produced three further axis-1 Benford false positives, all the same shape: a per-column digit test run on a cross-column pool where the pool lends one column the ≥1.5-OOM span it individually fails.

- **C11 — the clean proof.** The instance where the span-borrowing mechanism is isolated most cleanly; the reference case for the per-column-validity predicate. **[OWED — full C11 adjudication is in the S305 source, not this surface; fill before placing.]**
- **C25 — proteomics context.** **[OWED — full C25 adjudication is in the S305 source; fill before placing.]**
- **C21 (Inner Mongolia grassland, *Sci Adv* 2022).** ANPP (OOM 0.75) and perennials (OOM 0.67) individually below the 1.5 gate; annuals (OOM 4.05) lends the pool its span. **Bounded ecological measurement is the driver** — this predicts recurrence across the whole ecology cluster (C07, C09, C15, C16, C20, C22): bounded ANPP/biomass columns plus one wide sub-measure is the recurring shape.

The methodology case is now overwhelming: **3 confirmed real-world instances + ~6 predicted** across the ecology cluster. The fix predicate is unchanged from the CORPUS-03 finding — **per-column applicability guards, NOT a raised OOM threshold.** Raising the threshold would suppress the annuals column's genuine span; the defect is that a per-column test ran on a pool, and the guard belongs at input-applicability, per-test (see the axis-1 fix-shape decision above: three separate per-test guards, no shared poolability predicate). The ecology cluster is the scale test of the guard.

**Known-defect skip rule (adopted S307).** The ecology cluster will re-demonstrate this axis-1 Benford family case after case. Under the skip rule, each cluster recurrence is confirmed at source (its digit panel read and matched to this family) and recorded in a one-line note rather than re-adjudicated in full; full write-up is reserved for a new Class A, a new B1, or an unbanked class. The mechanism confirmation per case is retained — only the write-up collapses — so the S237 "prediction is not a licence to skip the read" discipline holds.

### 2.7 Arbitrary-offset block duplication detector

**What:** A test that finds a contiguous block of cells (a run of rows across one or more columns) that reappears elsewhere in the table at *any* offset — different row range, different column position — not only the aligned whole-row or fixed-window shapes the current battery checks. The pasted block need not be row-aligned or column-aligned with its source.

**Why this is a distinct target (and distinct from §2.4).** §2.4 is the *one-column* axis — a contiguous run recurring within a single column, corpus-validated from CORPUS-01. §2.1/§2.2 generalise Blocked Mahalanobis along the column-subset and row-extent axes but detect an anomalous *(μ,Σ) regime*, not *identical repeated values*. This entry is the *position* axis for exact-value block duplication: someone copies an r×c patch of cells and pastes it at another location. Englund's `copy-paste-detective` treats whole-block/row duplication (`duplicateRows`) as its own strategy separate from `repeatedColumnSequences` (the §2.4 analogue) — external precedent that arbitrary-block duplication is a genuinely separate detection target, not foldable into the one-column run test or the existing whole-row/fixed-window sub-tests.

**Why it is detectable (the property that makes the null tractable).** An r×c block of continuous values lives in the product of r·c per-cell supports. The coincidental-match floor for a genuine (non-copied) block of that shape is near-zero *regardless of where in the table you search for it* — the same vast-joint-support property that makes whole-row duplication detectable with a loose null. This is the key contrast with the §2.6 single-column collision null, which is stuck precisely because a single value's marginal carries no such joint support (the coincidental exact-repeat floor of one clustered column is substantial and shape-dependent, so the marginal cannot separate clustered-clean from copied). Widening the *search* over offsets does not re-import that under-determination: each candidate block match remains a near-zero-floor joint event. What widening the search *does* cost is multiple-comparison correction — see the design constraint below.

**Design constraint (this is the spec, not a caveat).** The two costs — compute and null-multiplicity — are the same knob: the size of the search space. Both are bounded by the same discipline, *fix the fabrication shape family explicitly rather than searching shape-agnostically*:
- **Shape-specified, not shape-agnostic.** A real copy-paste is one of a few structured shapes: contiguous row-blocks across a fixed column set (the `duplicateRows` case), contiguous single-column runs (§2.4's case), or a contiguous rectangular patch. Enumerate the shape family you are modelling; do not enumerate all 2^C column subsets × all row ranges. Shape-agnostic search is both expensive *and* underpowered (the multiplicity correction eats the power).
- **Fingerprint/hash search, not pairwise scan.** Canonicalise each candidate block (round to recording precision, serialise), hash it; hash collisions are candidate duplicates. Rolling/Rabin-Karp hashing makes "same block at any offset" a near-linear sliding-window scan, incremental in the offset — the standard near-duplicate-detection approach, tractable client-side for browser-scale tables (thousands of rows × tens of columns). Englund's `repeatedColumnSequences` almost certainly does a version of this.
- **Multiplicity correction scoped to the shape count.** The number of shapes × offsets searched sets the correction family. Search narrowly → each match is easily significant under light correction. Search broadly → the correction rises. Let the enumerated shape family set the multiplicity, and correct over exactly that family (cf. Test 4's Bonferroni-over-search-volume as a starting template, adapted to the block search volume).

**Statistic sketch:** Not yet designed. Candidate starting point: for each shape in the modelled family, slide a rolling hash over all valid origins, group by hash, and for each collision group compute the probability of a coincidental exact block match under the per-cell recording-precision null (product of per-cell coincidental-match rates over the r·c cells, a genuine near-zero-floor joint event), Bonferroni/BH-corrected over the enumerated search volume for that shape. Needs its own design pass — the search-volume accounting is the load-bearing part, not the per-match statistic.

**Relationship to existing tests and entries.** Sits in Copy-Paste-Edit / Structural Anomaly Detection alongside Exact Duplicate Detection and §2.4. §2.4 is its degenerate one-column, one-position-axis case; this is the position-general sibling. It is NOT the §2.6 fix and must not be welded onto it — §2.6 is a targeted continuous-recurrence null repair for a defect known to be within-column and axis-aligned (CORPUS-03's SL), and loading the general arbitrary-block null onto it would make a targeted fix carry a much harder, general multiplicity correction than CORPUS-03 requires. Keep §2.7 a separate scoped item with its own null calibration.

**Source:** S299 design discussion (Chat) — arose while reasoning about why the §2.6 single-column collision null is under-determined where whole-row/block duplication is not; Englund's `copy-paste-detective` (`duplicateRows` strategy) as external precedent. Reasoning banked in `SESSION299-CHAT-SUMMARY.md`.

**Priority:** A genuine fabrication mode (copy a patch, paste at an offset) the current battery cannot see, with external-tool precedent. Bank for v1.x; a dedicated design pass owns the null-multiplicity accounting. Candidate for the review paper's disclosed-coverage-gaps set alongside §2.4.

---

### 2.8 Group-attribute column recognition — BUILT S315 (`531e180`)

**What:** Teach the engine that some numeric columns are attributes of a *grouping key*, not measurements of the *row*. A site's latitude, a subject's age, a batch's date: these repeat across every row of that group **by construction**, and every test that treats repetition as signal will fire on them.

Not a new test. A per-column applicability predicate, upstream of the battery, in the same layer as §2.5's role inference.

**Why — C12, and it is not close (S314).**

C12 (*J Ecology* 2025, plant invasions) is a long-format field survey: 2,412 plant records, ~50 sites. Onto each record the authors merged the site's **latitude, longitude, and the 19 WorldClim bioclimatic variables** — annual mean temperature, precipitation seasonality, and so on. That is standard practice and entirely honest.

The tool analysed 36 numeric columns. **Twenty-one of them are those site attributes.** Each value repeats about fifty times because the table is long.

*(Counts corrected at S315 against the file. Earlier drafts said 24 columns and 22 WorldClim variables; both came from a session summary rather than the sheet. WorldClim defines 19 bioclimatic variables, and C12 carries exactly those plus latitude and longitude.)*

The engine has no notion of this, and reads the join as duplication. What fired:

| Test | Verdict | What it actually found |
|---|---|---|
| **Duplicated Data** | High, p < 0.0001, 20 blocks | Blocks whose columns are `[0, 1, 17, 18, …]` — column 0 is Latitude, column 1 is Longitude. `dupRows = 0`: not one full row is duplicated. |
| **Constant-Offset Blocks** | 56,978 blocks, z = 5,886 | Offsets of `-91.93`, `-89.09`, `-88.79` — these are **longitude differences between Chinese cities**. |
| **Over-used numbers** | High, 217 spikes | `.054` observed 167×, `.1675` observed 163× — climate-column fractional tails, one occurrence per row per site. |
| **Inter-Replicate Correlation** | High, 10,078 suspicious | Correlating temperature against precipitation against latitude. |
| **Column-to-column noise** | High, ratio 215.7 | Variance compared across centimetres, millimetres, °C and millimetres of rain. |
| **Second-digit / last-digit / decimal precision** | High | Digit pools ~60% composed of repeated climate constants. |

**Seven HIGH flags, seven MODERATE. One cause.** (Verified at S315 on the §2.8-off arm.)

**And the cost is not only false positives. The genuine defect was missed.** C12 contains real copied data — whole root-measurement vectors transplanted across plant species, exact to the last bit of the double (rows 5↔848, 722↔1182, and ~30 more). Duplicated Data fired High and showed the *climate join* as its evidence. Sequential Duplication cleared. A reader following the card lands on a merged temperature table and never sees the copied roots.

**The paper was retracted over those roots.** *J Ecology* withdrew it in May 2026. The authors admitted an assembly error merging per-plant WinRHIZO scanner outputs into the consolidated sheet; the original outputs were lost to a hard-drive failure, so the data could not be corrected, and the journal retracted. **Had Check My Data been run on this deposit, it would have raised a High and pointed the reader at honest climate data.** The retraction-grade defect would have gone unexamined.

> **A verdict that is right by accident is not a detection.** That is the strongest argument in this document for building §2.8 — stronger than the six false positives above it, because it shows the same defect *suppressing* signal, not only manufacturing it.

> **The false positive displaced the true positive.** That is the sharpest form this failure takes, and C12 is the exhibit.

**Root cause.** Every test in the battery assumes a numeric column is a measurement made on that row. The engine's role inference (§2.5, `src/import/roles.js`) sorts columns into `ignore` / `condition` / `label` / `data` on cardinality and header keywords. A climate column is high-cardinality across the dataset (~50 distinct values), numeric, and header-keyword-free — so it resolves to `data`, and enters the matrix as though someone measured the annual mean temperature of each individual plant.

---

#### The discriminator

**A group attribute is constant within every level of some grouping column.**

Latitude is constant within Site. Root length is not. This is a structural fact about the table, not a threshold, and it does not depend on how often a value repeats.

**It is not** low cardinality, and it is not high repetition rate. Both are the shortcut, and both break the Likert counterexample below.

---

#### The missing primitive — group-key inference

**This is the build. The exclusion is the easy half.** The S315 source read established that **no per-row group identity exists anywhere in the pipeline today**. In C12 nothing is tagged `condition`: site, latitude and root length are all `data`. So the grouping column must be *inferred* before constancy can be tested against it.

**Infer structurally, not semantically.** Do not keyword-match on `site` / `plot` / `subject` / `batch` headers. That is the shortcut that produced §2.5's misclassifications, and it fails on any dataset not written in English or not using the expected noun.

**The structural rule.** A column is a **candidate grouping column** when:

- it partitions the rows into levels, each holding two or more rows; **and**
- the number of levels is materially smaller than the row count; **and**
- at least one other numeric column is constant within every one of its levels.

The third clause is load-bearing. It is self-validating: a grouping column is only a grouping column *if something is constant within it*. A column that partitions nothing, or that partitions rows but has nothing constant inside its levels, is not a grouping column and produces no exclusions.

**Why this is safe by construction.** If no column satisfies the rule, no exclusion happens and the tool behaves exactly as it does today. The failure mode is falling back to current behaviour, not silently dropping a real measurement. That property is what makes the rule fit to run in batch, where there is no human in the loop.

**Regression tripwire, tested against the rule.** `14-crctest-survey.csv`'s Likert columns repeat heavily and have low cardinality. But no *other* numeric column is constant within their levels — a respondent's answer to question 3 does not hold still inside the levels of question 7. Clause three fails, no grouping column is found, nothing is excluded. **The tripwire is honoured by the rule's structure, not by a special case.**

---

#### Shape of the work

1. **Detect.** Find candidate grouping columns by the structural rule above. For each, collect the numeric columns constant within all of its levels. Those are the group attributes.
2. **Route.** Give them a new role — `attribute` — joining `ignore` / `condition` / `label` / `data` in the `roles.js` vocabulary. An attribute is not an identifier (it carries real information) and it is not a measurement of the row.
3. **Exclude — at one line.** `attribute` columns do not enter the analysis matrix. The S315 read found the choke point: `engine.js:109` builds `dataCols` from `role === "data"`, and **that single line is the sole entry to the entire battery.** No test screens columns afterwards; no per-test patching is needed. Duplicated Data, Constant-Offset Blocks, Value-Frequency Spike, Inter-Replicate Correlation, Selective Noise Partitioning and the digit tests are all excluded at once.
4. **Surface, don't hide.** Report what was excluded and why. "21 of 36 columns are attributes of Site and were excluded" is *itself a useful finding* about the data's shape — and it is the honest disclosure that the analysed matrix is not the deposited one. `dataColHeaders` (`App.jsx:36–38`) already assembles the names of the columns that entered the matrix; that is the handle. `ImportView` needs an `attribute` slot in its per-column role vocabulary with manual override, on the same path the other four roles already have.

**State plainly that the exclusion is blunt.** Because `dataCols` is a one-way gate, excluding a column removes it from *every* test, not only the ones it was corrupting. That is what we want — a site attribute is not a measurement of the plant under any test — but it must be said, because **a wrong exclusion is a false negative across the whole battery.** That is the same defect this section exists to fix, pointed the other way.

**Batch has no human in the loop.** `BatchView` takes `inferRoles` output verbatim, with no override. Any §2.8 rule is therefore fully automatic there, which is the second reason the discriminator must be structural and self-validating rather than a keyword heuristic.

---

#### What this cannot lean on

**`detectLongFormat` does not fire on C12.** Its already-wide gate (`longFormat.js`, ~line 53) returns `null` when two or more genuine numeric measure columns exist, and C12 has two dozen. No pivot is offered and no long-format routing runs; the table is analysed as-is. **§2.8 stands alone.** Any build assuming the long-format guard will catch these files first is wrong.

---

---

#### Outcome — built and run against C12 (S315)

Shipped at `531e180`. The rule works, and it did **not** do what this section predicted.

**It fires correctly.** On C12 it holds out exactly 21 columns — latitude, longitude and the 19 WorldClim variables — each constant within every level of **Region** (17 levels) and **Site** (51 levels). The 15 columns left in the matrix are all genuine per-plant measurements: soil pH, root length, biomass, AMF colonisation. **No measurement was wrongly excluded, and no climate column was left in.** The matrix goes 36 → 15.

**It removes the false positive.** With §2.8 off, Exact Duplicate Detection fires HIGH on the climate join. With it on, HIGH → **LOW, p = 1**. Constant-Offset Blocks collapses from 56,978 blocks to LOW. Sequential Duplication clears.

**It does not recover the true positive.** Both duplication tests read **p = 1** on the 15 real measurement columns. The copied root vectors — ~30 exact byte-identical row pairs — remain invisible.

> **The displacement hypothesis is dead.** This section argued that the false positive *displaced* the true positive, and that removing the join would let the copies surface. It does not. **The false positive and the false negative are independent failures that happened to co-occur.**

That is the sharper claim, not the weaker one. Fixing the applicability defect does not fix the detection gap; they are two problems and the corpus now shows both, separately, on the same file. The block detector returning p = 1 on a 2,412-row table containing ~30 exact duplicate row-pairs is **its own defect** — and §2.8 is what exposed it. **It was closed at S316 (`e751523`); see §2.9.**

**Verified across the transform.** Run four ways (§2.8 on/off × vst raw/log), the duplication verdict is driven entirely by §2.8 and not by the variance-stabilising transform. Severity is 3 in all four arms.

**Left unadjudicated.** Eight HIGH flags survive on the 15 real measurement columns — Benford (first digit), Value-Frequency Spike, Inter-Replicate Correlation. Benford *flips* from second-digit to first-digit when the climate constants leave the pool, which is a live diagnostic and not yet understood. Whether these are further applicability artefacts or genuine signal is the next investigation. **(Duplicated Data is no longer among them: §2.9 landed at S316 and it now fires on the copied roots, correctly.)**

---

**Relationship to §2.5, §2.6 and §2.10.** §2.5 fixes columns misclassified into the wrong *role*. §2.6 fixes tests applied on the wrong *pool*. **§2.10 fixes tests applied to the wrong *unit* — and it is the same family again, one level up: the grouper merges every condition-role column combinatorially, so the exchangeability assumption the permutation null rests on is false about the groups it produces.** §2.8 is a member of the same family and shares its one-line diagnosis:

> **The statistic is right. The baseline assumes something about the column that is false.**

Benford's order-of-magnitude gate, VFS's precision-blind expected count, within-row trivial-pair counting, and now the whole battery's row-measurement assumption. Four named causes, one frame. **This is the applicability family, and §2.8 is its largest instance.**

**The frame is not the whole of the §5 disclosure — that was corrected at S316.** §2.8's own outcome disproved it. Removing the false positive did not recover the true positive, so the applicability family cannot be the sole account of the tool's failures. **There are three failure modes, not one**, and they are separable because C12 and C08 demonstrate them independently:

| Mode | The statistic | The failure | Exhibit |
|---|---|---|---|
| **Applicability** | Right, on the wrong column | The baseline assumes something false about the column | C12's climate join (§2.8); Benford's OOM gate; VFS's precision-blind baseline |
| **Coverage** | Never runs on the finding | The duplicate's *shape* is not enumerated by any sub-test | C12's copied roots (§2.9) |
| **Circular null** | Runs, counts correctly, and is absorbed | The expected value is estimated from the contaminated data | C08's Exact Duplicate (25.5% duplicates, p = 1) |

The three are not degrees of one problem. **Applicability produces a verdict on the wrong data. Coverage produces no verdict at all. A circular null produces the wrong verdict on the right data.** They need different fixes, and two of them are now demonstrated on the same file — which is what makes the separation credible rather than asserted. **This — not the four-cause frame alone — is the §5 disclosure.**

**Priority — DONE (S315).** The argument that follows is preserved as the rationale.

**Why it was high:** Long-format tables with joined site, subject or batch attributes are the standard shape of ecological, epidemiological and repeated-measures data. This is not an edge case; it is a *class* of dataset, and the tool currently mis-analyses all of it. The remaining ecology cluster (C07, C09, C15, C16, C20, C22) is held behind this fix and is expected to reproduce the artefact.

**Source:** `REALWORLD-CORPUS-SPEC.md` §0.4 C12 entry (S314), adjudicated at source against `C12.xlsx` sheet `Field survey-data`. Pipeline facts (`engine.js:109` choke point, absent group key, `detectLongFormat` non-firing, batch override absence) from the S315 Code read-only.

---

### 2.9b C16 — the applicability-saturation exhibit (S318; quantified from direct file read S319)

C16 (N+P grassland, *J Ecology* 2025) is the corpus's clearest single case of the applicability family saturating a whole file. Read at S318 (roles: Treat=condition, rest attribute/data, non-replicates). The result splits cleanly: **every flag that fired is an applicability false positive on transformed/count ecological data, and the one real defect goes uncaught.**

**The real defect is not caught.** The paper's known issue is a PCoA column misalignment — during a merge, the PCoA columns were pasted out of order against the SampleIDs, so real PCoA values sit on the wrong samples (author-corrected March 2026; paper *not* retracted, conclusions held via the Z-columns). A human caught it through an impossibility: identical PCoA values on rows with *different* richness. Quantified at source (S319, direct read of `C16.xlsx`): the corrupted columns are the plant sub-group ordinations — `AB`, `PB`, `PF`, `PR` PCoA. Each carries an identical `(PCo1, PCo2)` point repeated across many rows (up to 15 of 60 on one AB point), and across those repeats the richness differs. Counting points that sit on two-or-more distinct richness values — a logical impossibility, since a PCoA coordinate is a deterministic function of composition — the original has **17 such impossible points** across the four groups; one `PF` point sits on **five** different richness values. The whole-plant ordination (`Plant_PCoA`) and the microbial ordinations (`HF`, `OC`) are clean, so the corruption is a **contiguous block of sub-group PCoA columns**, consistent with a merge/paste that hit a column range. The file's column structure makes this legible: C16 is **17 measurement-group families** — `Plant`, then four plant sub-groups (`AB` annuals-biennials, `PB` perennials-biennials, `PF` perennial-forbs, `PR` perennial-grasses), then twelve microbial/faunal groups (`Ba`, `BC`, `BN`, `Fu`, `ECM`, `Path`, `Sap`, `Nema`, `BF`, `FF`, `HF`, `OC`) — each a block of `{_Rich, _PCo1, _PCo2, Z_Rich, Z_PCoA1}`, plus an environmental/function block (`AFun/BFun/SFun/Litter/...`). The 17 families are the natural unit here, and the corruption is confined to the **four plant sub-group families** (`AB/PB/PF/PR`) — the whole-plant and every microbial family are clean. A paste that landed on four adjacent column-blocks, not a scatter. The tool does not catch it, and cannot as built — a misalignment leaves **no duplicate** (at source it is not a clean permutation — an identical `(PCo1, PCo2)` point is *repeated* onto up to 15 rows while other values are lost, so the column's value-multiset is not preserved) and **no single-column anomaly**; it is visible only as a *cross-column impossibility* (identical PCoA + different richness) that no test checks. Verified at source: **zero full-row duplicates in either file**; the rows sharing a repeated PCoA point agree on that point and disagree on every other column (different PH, SM, `Plant_PCo1`, richness). Every duplicate detector needs multi-column agreement to fire, so none does — that, not a preserved multiset, is why the copy is invisible to duplicate detection. This is distinct from C12, which is a *copy* (→ duplicate, caught by §2.9). C12 and C16 are the same defect family — merge/paste misalignment, fingerprint in the derived/adjacent column — but C12's fingerprint is a duplicate and C16's is a cross-column contradiction. **Detection fork — leaned S319, on evidence from both files.** Two candidate fingerprints were measured, not assumed:

- **Within-column repeated-value** (flag a putatively-continuous column carrying an implausibly repeated exact value) — **rejected.** It fires on the *corrected* file too (`AB_PCoA1`'s top value still sits on 17 rows after the fix), so it cannot separate corruption from legitimate shared structure. A leaky signal with an innocent generating process.
- **Cross-column consistency** (an identical derived-ordination point must imply the identical composition that produced it; identical point + different richness is a contradiction) — **this is the fingerprint.** 17 violations in the original, **1 residual** in the corrected file, **0** in honest columns like `Plant_PCoA`. Clean separation, no false-positive mode — it is a logical contradiction, not an improbability.

**Lean: build the cross-column derived-consistency check, sequenced behind grouping enforcement — not next.** It generalises past C16: C12 and C16 are the same defect family (merge/paste, fingerprint in a derived column), and the corpus table carries `derived-col gap` on four rows (C07, C09, C16, C21). It also fills a hole the three-failure-mode frame does not name — a derived value contradicting its inputs is something the battery structurally cannot see. Caveat holding the lean short of "build now": a general check needs a per-file declaration of which columns are derived from which (the tool cannot infer it), so the shippable version is narrow — a designated derived column cross-checked against a key column — and it queues behind enforcement, which already blocks the whole ecology cluster.

**Every flag that did fire is an applicability false positive.** The severity was driven entirely by tests applying continuous/homogeneous/high-cardinality assumptions to transformed count data. Three specific modes, each a *characterised failure to disclose*, not a fix:

- **Entropy on count columns.** Species-richness columns (integer counts, log-transformed) flag low-entropy against the continuous baseline (expected H ≈ 4.907). Not fabrication signal — a count variable has few distinct values by construction (6 or 7 species, not 6.38), so its entropy is legitimately low relative to a continuous column. The test applies a continuous-data expected-H to a discrete column and flags it for being discrete. On C16, 32 of 107 columns flagged, all `_Rich`, all "low entropy." **Fix direction:** a discrete/count-column guard, or a shape-aware baseline that sets expected H from the column's own cardinality rather than a continuous default.

- **`nBins` heterogeneous-column pooling.** Exact Duplicate Detection pools all data columns into one value domain for its collision baseline, producing an absurd `nBins` (a 16-digit value on C16's 107 heterogeneous columns). Real arithmetic, not overflow — the consequence of treating columns of wildly different scales as one pooled domain. Did not move C16's verdict, but the pooled baseline is meaningless when the columns are heterogeneous. **Fix direction:** a per-column-domain approach, or a guard that declines to pool across columns spanning many orders of magnitude or different types. Same family — a statistic assuming homogeneity applied to heterogeneous columns.

- **Block/duplicate detection on low-cardinality transformed columns tests for the inevitable.** On log-of-small-counts columns (few distinct values — `ln(6)`, `ln(7)`, modal `0`), identical blocks across rows are cheap and occur by construction: many samples share a species count, so their transformed values coincide. The permutation null *correctly* clears these (confirmed at S318: a sound low-cardinality permutation null, `MAX_PERM_PAIRS=30`, **not** the data-estimated circular kind — raw values are small-integer counts, blocks span only transformed-count columns, no continuous PCoA column is dragged in). So the verdict is right — but the detector spends effort testing for a coincidence that is inevitable on this data, and (before the S318 display fix) surfaced it prominently. **Fix direction:** a low-cardinality guard — recognise when a column's distinct-value count is low enough that block coincidence carries no information, and de-weight or skip rather than test-and-clear. Not a verdict problem (the null handles it); an efficiency-and-surfacing one. Refined at source (S319): the problem is **not** "it is a `_Rich` column" — it is cardinality itself. The plant-richness columns are severely low-cardinality (`PR_Rich` 3 distinct values in 60 rows, modal value on 34; `AB_Rich`/`PB_Rich` 4 distinct, 43% modal — two random rows agree 34–48% of the time), while the microbial-richness columns are effectively continuous (`Ba_Rich` 60 distinct in 60 rows, `BC_Rich` 59, `BN_Rich` 58) despite being the same log-transformed-count type. So the guard keys on **modal-value share / distinct-count**, the variable §2.9's cardinality guard already uses — not on column naming.

**The through-line.** All three are one failure: a statistic calibrated for continuous, homogeneous, high-cardinality measurement data, applied to transformed count data, which violates the calibration. C16 exhibits this across the battery at once — **the loud flags are all applicability false positives, and the real defect is silent because it leaves no fingerprint any test checks.** For the §5 disclosure, C16 is the saturation case: it shows the applicability family not as one mis-applied test but as a whole battery's assumption failing simultaneously on a legitimate data type, while the genuine defect passes clean. Ground truth (both file versions + author response) banked in `C16-GROUNDTRUTH-BANK.md`. **Spec caveat:** 906 Z-PCoA cells changed between the two C16 files (S319 source count at 1e-9 tolerance; the S318 bank recorded 910 — same substance, minor tolerance/counting difference), so the author's "Z-columns unchanged" claim is *not* what the files show — record what the files show, not the letter. At source the change is confined to the raw PCoA columns (all 34 changed, 1,870 cells; renamed `_PCo*`→`_PCoA*`, cosmetic) and the Z-PCoA columns (17 columns, 906 cells; `ZAB_PCoA1` changed on all 60 rows, most others on 55–56 of 60). The `_Rich` and `Z_Rich` columns are untouched. So the corrected file's Z-PCoA values are **not** the original's. The author fix drops the impossibility from 17 points to **1 residual** (one `AB` point still on two richness values) — an honest-correction signature, a manual re-paste that got almost everything.

**Status:** C16 is read-characterised only. It cannot be run/adjudicated until grouping enforcement lands (it is in the blocked ecology cluster). The grouping count is settled at source (S319, confirmed two ways — Chat file read + Code pipeline probe): the file is **60 data rows**, and default role inference tags all three of `Treat`, `Block`, `ZLev1` as condition, whose Cartesian product is **unique per row → 60 singletons → `rowGroups()` null → the collapse banner fires under default roles.** Narrowing below default is the only way to a usable grouping: `Treat` alone → 2 groups, `Treat`+`Block` → 10. **The long-carried "~18 conditions" figure is a phantom — it reproduces under no role set (a 1–3 column scan finds nothing in the 15–21 range) and should be struck wherever it appears, not reconciled.** Its likely origin, worth recording so it is not re-imported: **C12** row-groups into 132 groups of *about 18 rows each* (§2.10 census) — the digits are C12's rows-per-group, mis-attached to C16 as a group-*count* when the S318 summary was written. Right number, wrong file, wrong axis. (Note also a *third* real 18 that is not this one: C16 has 17–18 measurement-group column-families — see the quantify block above. That is a column-structure count, not a row-grouping count; the phantom is specifically the false claim that C16 partitions into ~18 row-groups.) The master-table Detail cell for C16 says "60 SINGLETONS, silently not assessed" — the count is right (60 singletons under default roles); "silently not assessed" is now **fixed by move 1** (the announce-empty banner fires on exactly this case). Update the cell to reflect that the silence is resolved (see REALWORLD-CORPUS-SPEC edit). The three applicability lines above are open items; the misalignment-detection question is open. Nothing here is a landed fix.

---

### 2.9 Scattered partial-row duplication — BUILT S316 (`e751523`)

**What:** A fifth sub-test inside Exact Duplicate Detection. It finds a **set of columns copied from one row onto another row somewhere else in the file** — however far apart the rows sit, and whatever columns were copied.

**Why — and this entry exists because §2.8 disproved its own thesis.**

§2.8 argued that C12's false positive *displaced* its true positive: strip the climate join, and the copied roots would surface. It shipped, it stripped the join correctly, and **the copies stayed invisible.** Both duplication tests read p = 1 on the fifteen genuine measurement columns, with the right data, no transform in the way, and nothing left to displace.

> **That is not an applicability failure.** The statistic is applied correctly to the right columns and returns the wrong answer. The four-cause frame does not reach it.

**The read (S316, `src/tests/duplicates.js`, read-only).** The copies are never *found*. Not found-and-dismissed — the count is **zero at every sub-test**, so every p-value is 1 by construction and no null is ever exercised. `nRowDups === 0 ? 1 : rowDupPValue` short-circuits before the row-vector null is reached.

**Why zero.** The copy has three properties, and each rules out a different detector:

| Property of C12's copy | Rules out |
|---|---|
| **Scattered** (426, 460, 843 rows apart) | Block paths — the offset cap is 200 on files over 500 rows |
| **Single row** | Block paths again — the height floor requires ≥2 consecutive rows |
| **Partial width** (root-scan columns only) | Row-key and hash paths — both require full-row identity |

Test 2 catches scattered **full-width** single rows. Test 4 catches contiguous **partial-width** blocks. **A scattered, single, partial-width row copy sits in the one cell neither covers.**

**And that is precisely the shape an honest merge error makes.** A WinRHIZO root-scan block dropped onto the wrong plant carries the scanned columns and leaves the plant's own biomass behind — so the derived tissue density (mass ÷ root volume) differs, and the row is no longer identical across all fifteen columns. **The detector was blind because the defect was real.** A fabricator copying a whole row would have been caught.

---

#### The algorithm

For a pair of rows, find the set of columns on which they agree exactly. Score a match when that set is large enough. Three deliberate properties, each the inverse of a rule the existing detectors get wrong: **no offset cap, no block-height floor, no assumption about which columns travel together.**

Naive all-pairs is quadratic. A **prefilter** groups rows by exact value per column; a pair sharing a value earns one agreement; only pairs reaching k agreements go to the exact sub-vector comparison.

**The cardinality guard is load-bearing, and the measurement is why.** A column with five distinct values across nine thousand rows says nothing when two rows match — one row in five agrees by construction. On C14 (9,398 × 14), `CROWNCLASS` (five distinct values, largest group 4,804 rows) generates **16.9 million agreement pairs by itself**; total accumulation reaches 36 million, 0.82× the naive all-pairs count, and overflows the map. It does not build.

So a column enters the prefilter **only** if its largest value-group covers less than a threshold fraction of the rows. Excluded columns still count in the agreeing set and the null — they simply generate no candidates.

Chat's prior was that unrelated rows rarely agree on four continuous measurements by chance. **True, and irrelevant** — C14's blowup is a *categorical code stored as a number*, not a continuous measurement. The prefilter was specified against the wrong mental model of the data, and only the measurement caught it.

#### Constants, chosen on the sweep

- **Cardinality threshold = 2% of rows.** C14 builds in ~20 ms at 2%; 254 ms at 5%; 955 ms at 10%, with no benefit. Every C12 copy survives at every threshold — the copied root columns are high-cardinality and never held out. This is a **performance-chosen constant** and should be recorded as one: no statistical argument selects 2% over 3%.
- **k = 4 agreeing columns.** C12 yields 34 survivors against ~30 real copies (k=3 admits coincidental agreements; k=6 undercounts). **k does not change the verdict** — the flag is driven by the single strongest pair — so it controls evidence-list length and prefilter cost, not severity.

#### The null

For a pair agreeing on set S, `pMatch = Π wrColHHI[c]` over S, Bonferroni-corrected by the all-pairs search volume. Consistent with the row-vector null already in the file.

**It is estimated from the data, and therefore carries the same circularity as the other four.** That is the third failure mode (see §2.8's table) and it is *not* fixed here. It did not bite on C12 — the raw p is 1.03e-22, nowhere near absorption — but the exposure is real and C08 is where it does bite. Do not read C12's success as evidence the null is sound.

---

#### Outcome — C12 (S316)

**Exact Duplicate: CLEAR → FLAGGED.** 34 copied pairs, sub-test raw p = 1.03e-22, `combinedP` = 5.14e-22 after BH-FDR. The other four sub-tests read ~1: **the new detector drives the verdict alone.**

**All four documented copies recovered, by row distance:** rows 5↔848 (843 apart), 65↔491 (426), 173↔220 (47), 722↔1182 (460) — plus a nine-column pair at 90↔1010.

**The copied column set is the same eight in every pair: T, U, V, W, Y, Z, AA, AB** — root length, surface area, average diameter, volume, fine and coarse root length, fine and coarse surface area. **X is conspicuously absent from the middle of the run.** X is *Root tissue density*, the derived quotient. It did not come across because it is computed from a biomass that stayed behind. **The evidence names the mechanism.**

**Hand-verified against the spreadsheet.** Row 5 and Row 848 of `C12.xlsx` sheet `Field survey-data` are byte-identical on T (997.3962999999999), U (170.5759), V (0.53325), W (2.455), Y (922.6777999999999), Z (74.3288), AA (134.3313), AB (35.416399999999996), and differ on X (0.291… vs 0.358…). The card's coordinates land on the right cells.

**Quiet where it should be.** C08: zero survivors, no false positive (its duplicates run *down columns*; no partial-row copy exists to find). C11 (16,657 rows, the largest file): zero survivors, 114 ms.

**C14 fires — and it is a true positive Chat did not anticipate.** The pair is at **sheet rows 262↔263** (earlier text said 260↔261; those were matrix rows labelled as sheet rows). They are byte-identical across all fourteen matrix columns and carry **different `STAND_ID`s**. **Adjudication closed S328 — defect**, settled by reading the deposit: the file holds 253 duplicate measurement blocks, 190 of them spanning different `STAND_ID`s, and only 8 adjacent. Duplicate Detection flags this pair; Sequential Duplication cannot see it at all, since two rows is a run of one against a height floor of three. The detector's behaviour is correct either way — the rows *are* identical.

---

#### What it produces for the reader

The evidence surface renders the pair stacked: Row 5 above Row 848, the eight agreeing columns highlighted, the column that differs left plain. **A reader who knows nothing about Herfindahl nulls can look at it and see what happened** — someone pasted a root scan onto the wrong plant, and the one number that was *computed* rather than *copied* gave it away.

That is the thing statcheck and GRIM structurally cannot do. They operate on summary statistics; there is nothing to point at. **This points at cells** — two rows, eight columns, at coordinates the reader can verify by hand in their own spreadsheet, as we did. It belongs in the paper's argument for raw-data forensics, not only in its results.

---

#### Carried, not fixed

- **The §4 handoff composer still says "4 sub-tests."** `findingComposers.js` is a DS14-locked zero-diff anchor and Code correctly refused to break the lock to satisfy the dispatch. The count is now wrong. Needs its own dispatch with the lock **re-baselined deliberately**, not broken.
- **The circular null.** Untouched here, and it is C08's defect. See §2.8's three-mode table and the C08 entry in `REALWORLD-CORPUS-SPEC.md` §0.4.

**Source:** S316 — read-only on `src/tests/duplicates.js` and the C08 shape read; build, surfacing, coordinate fix and count fix promoted at `e751523` (three commits: `ae06ba8`, `0dd4df7`, `bb76b6b`). Hand cross-check against `C12.xlsx` recorded above.

---

### 2.10 Row-grouping produces units the tests were not designed for — TRIGGER + CONFIRM CARD BUILT S320–S321, stance cross-validated S322, twelve fixes unpromoted

**This is the tool's own applicability failure. It is the third failure mode's strongest exhibit, and it is ours.**

**Status (S321): both parts are built and mechanism-verified; nothing is promoted.** Enforcement is Part 1 (trigger) + Part 2 (confirm card). Both now live in worktree `beautiful-kalam-efad9d` as a **six-commit stack, tip `005026e`, unpromoted**. The stack does NOT promote until the card's UI settles and its stance is decided (the S322 lead — see below). Commit chain:

- `a9d3c61` — Part 1, the trigger.
- `6685f10` — Part 1.5, the trigger extracted into a single-source helper `computeTrigger` (`src/analysis/groupingTrigger.js`). Engine and card call one implementation of the arm logic. Landed as its own batch-gated dispatch, separate from the card build, because the extract has a hard correctness gate (census parity) an eyeball-verified UI loop does not — mixing the two is the S237 pattern.
- `d4e6dd3`, `15f7488`, `6d95c77`, `005026e` — Part 2, the confirm card across four rounds (static display → size strip → live untick + fire/clear → confirm action).

**Part 1 — the trigger** (`a9d3c61`). At the `engine.js` `runFullAnalysis` hook, **Arm 1** (grouping key from ≥3 condition columns) OR **Arm 2** (`rowGroups()` null, or median group size ≤4) routes the four row-grouped tests — Mahalanobis Row Outlier, Entropy/Zipf, Column Goodness-of-Fit, Modality — to N/A pending confirmation, carrying `groupingPending={arm1,arm2,condCols,nGroups,medianSize,sizes}` for the card to read. The thin predicate (median ≤4) was pinned against the census table below and validated **6-fire / 6-clean**: FIRE C12, C16, C22, C08, C09, C20 (C20 on Arm 2 alone — 2 columns, median 3; C08 on Arm 1 alone — 3 columns, median 10); CLEAN C21, C07, C13, C17, CORPUS-01, CORPUS-03 (medians ≥10 where applicable). Code's independent probe reproduced the census group counts (C16=60, C22=44, C20=37, C08=35, C09=20), confirming the trigger reads the real partition. C22 requires its explicit sheet "Exp. WA" — its default first sheet ("Info") is metadata.

**Part 2 — the confirm card** (four rounds). Mounts above §2 in `ForensicsBody`. Shows the inferred condition columns as checkboxes (no ranking), the group count, a size strip, and the median. Untick a column → live `computeTrigger` recompute of the grouping and the fire/clear indicator — **trigger arithmetic only, no battery run**. Confirm → runs the four paused tests on the ticked column set via `src/analysis/confirmGrouping.js`, swapping their verdicts into an `effectiveResults` shadow at ReportView; the four cards go pending→verdict in place while the 25 dataset-wide results stay byte-identical. Mechanism-verified live on C09 across all three interactive rounds.

**Two facts the build settled, both against earlier assumptions:**

- **The confirm action is instant, not slow.** The four grouped tests cost ~0.19 s total on C09 (~47 ms each). The carried "takes minutes" fear was a **misattribution** — "minutes" belongs to Blocked Mahalanobis (`engine.js:471`), a permutation test that is NOT one of the four and is never run by confirm. The measurement removed a running-state / spinner design fork the stale framing had produced.
- **Confirming C09's inferred grouping yields four N/A** — 20 groups of 3 rows are too thin for the tests to compute, which is exactly why Arm 2 fired. This is correct screening behaviour (the tool won't fabricate a verdict on a too-thin grouping) and a clean paper illustration of screening-not-adjudication — but it weakens the "safe default of accepting the inferred grouping," because on C09 that default returns no usable answer.

**Move 1 was superseded, not extended.** The earlier announce-empty banner (move 1) turned out to be surfacing-only — it attached a `groupingCollapsed` metadata tag and the four tests kept their pooled verdict; it never routed anything to N/A. So move 2 had to *create* the N/A-suppression path. Move 2 owns the null-and-thin case and the move-1 banner-on-null trigger was retired (the CardLayout banner and the TestCardLayout amber "grouping N/A" tag removed; the shared `CardBanner` component, used by five other cards, kept; move-1's S318 evidence-table display fixes kept). No coverage lost — every file the banner fired on is caught by Arm 2.

**The stance is set and cross-validated (S322).** S321 closed on a comprehension finding: the card hands a grouping judgment to users (journal editors, integrity officers, editorial-office staff) who may not share the tool's grouping model. That was settled against a measured firing rate and a second adversarial round with Gemini, Grok, and Sonnet.

**The firing rate.** A read-only sweep ran `computeTrigger` across all 22 corpus deposits through the real import and role-inference pipeline. **7 fire (32%), but bimodally:** of the 15 row-groupable files, 7 fire (**47%**); of the 8 with no condition columns (assay, instrument, expression, genomics), **0 fire**. Every firing file is a multi-factor ecology or field-experiment table — not consistently the nested Species/Genus/Family shape (only C09 is a clean nest) but the broader multi-factor pattern. **A niche-domain surface, routine within ecology and unseen outside it.** The corpus is entirely PubPeer-flagged and ecology-skewed and no clean non-flagged real dataset exists in the repo, so 32% is not a representative upload rate. The sweep reproduced the S320 census bit-identically on the 12 overlapping files and corrected it on one: **C14 is a genuine 7th fire the census missed** (its `Data` sheet tags `Species` + `DamageSev` → 236 groups, min 1 → Arm 2); C24 is clean. See the corrected census note below.

**The stance — three rules, now in METHODOLOGY §Condition Grouping Contract.** Lead with a plain statement of what the tool did, not a claim about the study (*we grouped your data using these columns*, never *read as your experimental design* — to a field ecologist, spatial labels genuinely *are* their design, so the phrase validates the over-merged grouping the card exists to question). Invite correction by unticking and propose nothing — no suggested primary treatment, no strata hint, since every such move reintroduces the factor-versus-stratum call proven undecidable. And offer a **first-class "leave these tests unassessed" exit as the safe path**, because a third-party screener often cannot adjudicate the grouping, and a confident verdict on a guessed grouping is worse than an honest non-answer. The validation round rejected two back-door ranking proposals and surfaced a stated limitation: **the checkbox expresses a flat product, not nesting** — a split-plot design (Block within Site) cannot be reconstructed by unticking, so for it the honest path is the N/A exit. Solving nesting is a v1.x candidate, not v1.0.

**What was built at S322 — twelve fixes, all uncommitted, all verified on screen.** The edge-polish round (reworded lead; `attempted`-aware three-state indicator; arm-aware "groups too small to test"; size strip only when sizes vary; then the "all groups N rows" neutering and the zero-column block hidden), the amber-panel clear after confirm, and the N/A exit across two rounds (the affordance, then rendering the four settled tests so they do not vanish from §3). Two findings came out of that round and are recorded in METHODOLOGY, not here: a category with every member N/A rendered green **"Clear"** on four of five categories across shipping fixtures including fabricated ones, now **"Not assessed"**; and the coverage denominator (`X of Y ran`) which the applicability contract has since made provisional.

**One correction to carry.** The "No DATA columns" note in the edge-polish list below was wrong at source. The four pending cards never showed it — the pending path returns before any aggregator placeholder can fire, so the real before-string was "N/A — grouping needs confirmation." The genuine "No DATA columns" defect is a different thing entirely, on five batch fixtures, traced and recorded in METHODOLOGY §Applicability.

The interaction design is recorded in METHODOLOGY §Condition Grouping Contract (checkbox with live trigger-only recompute; confirm runs the ticked set as-is; informs, does not gate; distinct pending-vs-inapplicable N/A copy; no ranking; the N/A exit). The stack unblocks the ecology cluster (C07, C09, C15, C16, C20, C22) on promote.

**What:** The engine groups rows by the Cartesian product of *every* column role inference tags `condition`. On real long-format data that produces dozens or hundreds of tiny groups, and the permutation null's exchangeability assumption is false about them. Half the row-grouping corpus is affected.

Not a new test. A contract question about what a condition *is*, upstream of the battery, in the same layer as §2.5 and §2.8.

---

#### The mechanism

`condCols` is every column role inference tags `condition` (`engine.js:110`):

```js
roles.map((r, i) => r === "condition" ? i : -1)
```

The group key is the `" | "`-joined concatenation of **all** of them (`engine.js:138-143`). That is the **Cartesian product**, not a grouping factor. `conditionContext.rowGroups()` (`conditionContext.js:144-160`) then partitions rows on that merged label.

**On C12 it merged seven columns:**

| Column | Distinct values |
|---|--:|
| Latitudes | 3 |
| Combine | 3 |
| Plot | 3 |
| Pair | 5 |
| Code | 10 |
| Name | 10 |
| Origin | 2 |

`Code` and `Name` are species and site **identifiers**. `Plot` and `Pair` are nested survey positions. **`Origin` (Invasive/Native) is the only column resembling an experimental arm.** Only 132 of the combinatorial cells occur in the data — so **132 groups**, about 18 rows each, from a 2,412-row file.

---

#### The corpus census — it is not one file

Largest data sheet per file; role inference as in the real pipeline.

| File | Sheet | Rows | Groups | Median/grp | Min/grp | Condition columns |
|---|---|--:|--:|--:|--:|---|
| **C12** | Field survey-data | 2412 | **132** | 16.5 | **3** | Latitudes, Combine, Plot, Pair, Code, Name, Origin |
| **C16** | Sheet1 | 60 | **60** | — | — | Treat, Block, ZLev1 — **every row its own group; all singletons dropped** |
| **C22** | Exp. WA | 176 | **44** | 4 | **4** | Experiment, Material, N Fertilizer, Time |
| **C20** | Microcosm soil B | 204 | **37** | 3 | **3** | Soil_type, Taxa_combination |
| **C08** | DATA | 350 | **35** | 10 | 10 | Duration, Setup, Stage |
| **C09** | Sheet1 | 60 | **20** | 3 | **3** | Species, Genus, Family, Treatment |
| C21 | precipitation exp | 162 | 9 | 18 | 18 | treatment |
| C07 | Mastersheet | 72 | 6 | 12 | 12 | Warming, Season |
| C13 | Soil CO2 | 178 | 2 | 89 | 85 | Ramet, Treatments |
| C17 | Neural | 41 | 2 | 20.5 | 19 | Group |
| CORPUS-01 | Sheet1 | 105 | 10 | 10.5 | 10 | Treatment, Genotype |
| CORPUS-03 | Clonal molly | 373 | 3 | 124 | 121 | Trt |
| C10, C15, C18, C19, C23, C25, CORPUS-02 | — | 0–3600 | 0 | — | — | no condition columns — not row-grouped |

*Census correction (S322 sweep).* This S320 table used "largest data sheet per file." The S322 firing-rate sweep, running the same `computeTrigger` through the real inference pipeline, reproduced every measured row bit-identically but corrected the catch-all: **C14 does fire** — on its `Data` sheet (9,426 rows) inference tags `Species` + `DamageSev` → 236 groups, min size 1 → Arm 2. C14 is the 7th fire and was wrongly bucketed here as "no condition columns." **C24** (not in the twelve above) is row-grouped but clean (tags `Month` → 4 healthy groups). Mirrored to `REALWORLD-CORPUS-SPEC.md` §0.3.

**Seven of twenty-two fire, six of the original twelve.** The split tracks how many columns inference tagged `condition` and their cardinality: one or two genuine factors behave; three to seven metadata columns produce a row address with a few duplicates.

**Four of the six are the ecology cluster** (C07, C09, C15, C16, C20, C22) — released and held for three sessions to be run once §2.8 and §2.9 landed. **Running them now would produce row-grouped verdicts computed on units nobody designed for.**

---

#### The distinction role inference cannot make

**A factor** is a variable the experiment manipulated or contrasted. Treatment. Genotype. Warming. Origin. Its levels are **arms**, and rows within an arm are exchangeable under the null. **That is the basis of the permutation.**

**A stratum** is a label recording *where a row came from*. Plot. Pair. Site code. Species name. Block. It partitions the data, but its levels are **addresses**, not arms.

**In a spreadsheet they are identical:** short repeated strings in a non-numeric column. Role inference cannot tell them apart, so it tags them all `condition`, and the grouper merges them.

**Merging is where it becomes incoherent.** `Treatment × Genotype` is a defensible key — a 2×2 factorial, each cell a real arm. `Species × Plot × Pair × Code × Origin` is **not a key at all**. It is a row address with a few duplicates. **C16 proves it: the key was unique per row.**

---

#### What the methodology says a condition is

`METHODOLOGY.md:484` — *"Under H₀ conditions are exchangeable at the row level … condition labels are shuffled across rows preserving per-condition row counts."*

`conditionContext.js:30` — *"genuine experimental conditions."*

Every worked example in the doc is Treatment, Genotype, Group, arm.

> **The statistic is correct. The exchangeability assumption is stated. It is false about the unit being fed to it.**

---

#### Guards

- **Minimum rows per group: yes.** `slices()` drops groups under 3 rows (`conditionContext.js:133`); `rowGroups(minPerGroup = 3)` returns **null** unless there are ≥2 groups and *every* group has ≥3 rows (`:154`).
- **Maximum group count: none.** Nothing anywhere caps it. There is a stated per-group *size* assumption in METHODOLOGY (≥3 rows, ≥2 groups) and **no stated assumption about group count, because nobody imagined 132.**
- **Per-test guards exist but fire late.** Entropy skips a column under 20 observations (`entropyTest.js:47`); Column GoF and Modality carry their own `MIN_N`; Cross-Condition Consistency gates pool properties at minN=30. So the tests do not blindly trust the grouper — but those gates return N/A **per group, after the work is set up**, not before.

---

#### C16 fails silently — a coverage failure riding on the applicability one

Sixty rows. Three condition columns whose Cartesian product is **unique per row**. Sixty singleton groups, all dropped by the min-3 guard, `rowGroups()` returns null, the row-grouped tests take the ungrouped path or return N/A.

**Nothing in the output announces that the grouping produced nothing.** A reader sees a file that looks assessed.

> **Same shape as C12's copied roots — a p of 1 returned without ever counting anything.** Grouping that produces nothing must say so.

---

#### The lever is not a group-count cap

**Capping the count makes a meaningless computation fast and hides the finding.** The lever is *which columns become condition-role*, and *whether condition columns should be merged combinatorially at all.*

**And role inference cannot decide this from the data.** Whether a column is a factor or a stratum is a fact about the *experimental design*, which lives in the paper, not the spreadsheet. Any rule written here is a heuristic dressed as a fact.

**Three moves, and the first is unconditional:**

1. **Grouping must announce when it fails.** If every group is a singleton, or the group count approaches the row count, return an explicit N/A with a stated reason, surfaced to the reader. **Take this regardless of everything else.** It converts a silent false clear into an honest "not assessed."
2. **A stated contract** — a condition column is one whose cardinality is low relative to row count and whose levels partition the data into groups large enough to permute. *Reservation: a cardinality threshold is exactly the kind of arbitrary constant that becomes load-bearing and unexamined. That is what this whole arc has been about.*
3. **Ask the user.** Show the columns inference thinks are conditions, show the resulting group count and sizes, and let them confirm or correct before the row-grouped tests run. *"These seven columns produce 132 groups of 18 rows. Is that your experimental design?"* The answer is almost always no, and the user knows it instantly.

**Chat's lean: (1) unconditionally, (3) as the real answer, (2) as the default the user is shown and can override.**

> **Every alternative is the tool asserting knowledge it does not have — precisely the failure the paper is about.**

---

#### Cross-Condition Consistency is the symptom, not the disease

**43.5 seconds of C12's 59.4-second run — 73%.** Blocked Mahalanobis, the fixture-batch champion at 38%, is **4 milliseconds** on C12.

The cost is `ksDistance` (70%, `crossConditionProperties.js:157`) plus pair iteration (20%, `crossConditionConsistency.js:106`) — **the statistic, not the shuffle.** The driver computes `prop.distance(stats[u.a], stats[u.b])` for every running unit, and **units are condition pairs**: `C(132, 2) ≈ 8,646` versus 1–3 pairs on a normal fixture. Across the 28 fixtures the test averages 57ms, max 312ms. On C12 it is 763× its fixture mean.

**Yielding would turn 43 frozen seconds into 43 responsive ones and save nothing.**

> **A performance complaint is a legitimate route to a correctness finding.** The 43 seconds was a symptom. Capping the group count would have made a meaningless computation fast and hidden an applicability failure across half the corpus.

---

#### Unclaimed and untested

With 132 tiny strata carrying real spatial and species structure, the permuted null **may be absorbing the structure it exists to detect** — reassigning labels across many small groups approximately preserves the marginal. **Circular-null-adjacent. Plausible. Not tested. Do not claim it.**

---

#### Cross-validation outcome (S318) — the claim holds three ways

The contract was authored into `METHODOLOGY.md` (§Condition Grouping Contract) and the load-bearing claim cross-validated before any code moved: **factor versus stratum is not decidable from the data alone.** Three independent models (Gemini, Grok, Sonnet) were each asked adversarially to break it — to name a data-computable signal that separates a factor from a stratum with no surviving counter-example. None could.

**Every candidate signal broke, in both directions:**

- **Cardinality** — a stratum can be low-cardinality (a 4-block design looks like a 4-arm treatment); a factor can be high-cardinality (a 200-genotype panel looks like a species-ID column). Tells you group size, not role.
- **Balance** — cuts the wrong way. Strata are often balanced *by design* (a randomized complete block design has exactly one of each treatment per block); real factors are routinely unbalanced (dropout, observational arms). Near-perfect balance is a mild signal *for* stratum, not factor.
- **Crossed versus nested** — the closest to a real structural signal, and it still breaks. A genuine factor can be nested (multi-site trials don't run every treatment at every site); two genuine strata can be fully crossed (Plot × Year — cross-classified random effects, every plot measured every year, a Cartesian product from two sampled strata). The crossing pattern reflects the design, which is the thing not in the data.
- **Outcome-association** — the signal everyone reaches for, and it is **actively misleading**, confirmed independently by all three. It is circular (the null already assumes exchangeability with respect to the outcome, so selecting on outcome-association chooses the grouping using the quantity the null is about) and empirically backwards (a stratum is chosen *because* it explains baseline variance — site explains more variance in soil chemistry than the treatment does). Picking the most-associated column selects the stratum. This is now an explicit "do not" in the contract.

**"Undecidable" is the right strength, but the data can still narrow.** All three converged on the same two-tier design: a **mechanical, count-based filter** that prunes candidate columns and combinations producing singleton or near-singleton groups — this is a property of group sizes, not of meaning, and is safe to automate — followed by **asking the user about everything that survives, with no ranking of the survivors.** There is no "more factor-like" ordering to offer, because every ranking signal points the wrong way at least once. Prune on size; ask about the rest; rank nothing. This supersedes option 2 above: the "stated cardinality contract" is retired as a *selector*, because cardinality does not carry role. Cardinality survives only in its count-filter use (can this grouping support a permutation test at all), never as a factor/stratum decision.

**The literature frame — a design fact under several names.** The distinction is well-established, and in every framing the consensus is the same: it is not recoverable from data without the design.

- **Design of experiments:** *treatment factor* versus *blocking / nuisance factor* — the classic split from Fisher; Montgomery, *Design and Analysis of Experiments*, treats block identity as something the experimenter declares, not something inferred from the response. The underlying error is the **observational unit versus experimental unit** distinction: a permutation null must shuffle experimental units (the plot, to which treatment was applied), and the tool is shuffling observational units (the row, a single plant within a plot). The data records only observational units, so the experimental unit is not visible in it.
- **Mixed models:** *fixed* versus *random effect*. Whether a variable is modeled as fixed or random is a known modeling choice with no purely data-driven test to settle it (Searle, Casella & McCulloch, *Variance Components*). This is a *name* for the distinction, not a decision procedure — "fit a random effect" does not recover which columns are factors; it presupposes the answer.
- **Exchangeability itself:** de Finetti's exchangeability is a *judgment* the analyst makes about which units are interchangeable, not a property read off a spreadsheet (Good, *Permutation, Parametric and Bootstrap Tests of Hypotheses*, states the assumption as something brought to the data). This is the deepest form of the claim: exchangeability was never a data property, so its undecidability from data is not a limitation of this tool but a feature of the concept.
- **Causal inference (loose parallel):** which variable is the treatment versus a covariate is not recoverable from observational data without a design/graph built from domain knowledge (Pearl). Same shape — the data is consistent with more than one design, and only outside knowledge picks one.

**Grok's design steer, worth carrying.** Lean the tool's forensic weight toward within-group anomalies that do not depend on the grouping null — digit preferences, unexpected smoothness, the ungrouped battery — and gate the grouped tests behind confirmation. The ungrouped tests are the trustworthy core; the grouped tests are the part that needs the ask.

---

**Priority — OPEN, contract authored and cross-validated (S318); enforcement not yet built.** The first move is done: the contract is in `METHODOLOGY.md` (§Condition Grouping Contract) and the undecidability claim survived three adversarial model checks. What remains is enforcement, staged — announce empty grouping first (option 1, unconditional), then the confirm-with-user flow (option 3, the real resolution). **The ecology cluster stays blocked** until enforcement lands: row-grouped verdicts on merged-strata files are not interpretable.

**Source:** S317 — the read-only grouping census (Code, source-cited: `engine.js:110`, `:135-143`; `conditionContext.js:30`, `:133`, `:144-160`; `METHODOLOGY.md:484`, `:648`), run across the corpus with role inference as in the real pipeline. Opened by the Cross-Condition Consistency performance measurement, not by a methodology review.

**For the paper:** this is the **third failure mode's demonstration, and it is the strongest of the three, because the tool failed on itself.** We built a forensic instrument, pointed it at real ecological data, and it applied a permutation null to units whose exchangeability assumption it violates — the exact error it exists to catch in others. Half the row-grouping corpus, not one file. **Invisible until a performance complaint made someone look.** That is not a caveat to bury in §5; it is the argument for why raw-data forensics needs a disclosure section at all, and the reason to trust the findings we do ship.

---

### 2.11 Engine correctness — shared choke points and the null-loop cost model (S317) — MIXED: two fixes landed S317, shared yield helper deferred, `N_PERM` and `entropy:142` open

Not test additions. Engine-layer defects and design questions surfaced while investigating §2.10. Homed here so they are not orphaned.

#### Shared choke points guard better than call sites — LANDED S317

Two defects of the same shape, both fixed at the function rather than at the call sites, both byte-identical on the 28-fixture batch.

**`flagFromP` was one unguarded function under 22 call sites** (`src/constants/thresholds.js`). Fed a non-numeric p it returned a confident verdict **in both directions**:

| Input | Returned (before) | Returns (after) |
|---|---|---|
| `undefined` | `LOW` — a silent clear | `"N/A"` |
| `NaN` | `LOW` | `"N/A"` |
| `Infinity` | `LOW` | `"N/A"` |
| `null` | **`HIGH`** — a spurious flag | `"N/A"` |
| `-Infinity` | **`HIGH`** | `"N/A"` |

No test module guarded its own p-value. The exposure was **latent** — no test actually emitted a non-finite p, and the batch stayed byte-identical — but the guard belongs at the function. `"N/A"` was already a first-class flag value: `FLAG_STYLES`, `PLOT_FC`, `FLAG_RANK["N/A"] = 0`, and **29 test modules already emit it**.

**`evidenceOf` was one reader under 14 tests** (`scripts/corpus-run.mjs`). It read `r.details` and never `subDetails`. On any grouped file `aggregatePerGroup` rebuilds top-level `details` as the **per-group summary** (`{group, rows, nRowsTested, flag}`, `aggregation.js:152-161`) and moves the per-unit records to `subDetails` (`:166-167`). So the corpus diagnostic showed C12's Entropy as **132 rows of `{group, rows, flag}` with no entropy value anywhere** — the real per-column records were there the whole time.

Exposed tests: row-grouped dispatch (Entropy, Column GoF, Modality, Mahalanobis Row Outlier) and column-grouped dispatch (Kurtosis, Autocorrelation, Windowed Autocorrelation, Runs, LOESS Residual, Row-Mean Runs, Selective Noise, Regional Noise, Mahalanobis Row Outlier, Duplicate Detection). **Grouping-conditional — which is why the flat batch fixtures never caught it.** This is the S184 rule (bind to `subDetails`, not `details`) unlearned in a second place.

**Still open — `entropy:142`.** `filter(c => c.flag !== "LOW")` would count an `"N/A"` column as flagged. Gated behind `nFlagged > 0` and unreachable on current fixtures. **Same shape: a call site assuming a closed value set.**

> **Fix the choke point, not the instances.**

#### Windowed Autocorrelation — stack overflow and yield, LANDED S317

**Line 158 spread the whole unit array into `Math.min(...)`.** On the 15-column arm that is ~50,400 arguments and returns. On the **36-column arm it is ~302,400**, exceeds V8's spread limit, throws `RangeError: Maximum call stack size exceeded`, and the engine catches it to `{flag: "ERROR", primaryP: null}`. **The test did not run at all on wide files.**

Fixed with the existing shared `arrayMin` helper (`primitives.js:43`), whose doc comment reads *"Stack-safe minimum for large arrays (avoids `Math.min(...arr)` RangeError)."* **Someone hit this before, wrote the fix, and Windowed never picked it up.**

**C12's 36-column arm now completes for the first time:** `LOW`, `primaryP = 0.068`, **270,453 window units across 630 pairs, 0 significant.** The most extreme windows show local `r ≈ ±0.73` but do not survive per-pair BH-FDR.

> **Provisional.** The probe ran on raw values; the engine feeds VST-log-transformed input, which could shift the p-value. Completion, unit count and runtime are robust. **Do not quote 0.068 in the paper** until it has run through the real pipeline.

**And it was synchronous — 7.4 frozen seconds.** Now `async`, yielding at the **pair** boundary every `PERM_CHUNK = 2000` permutations; `aggregatePerGroup` awaits `testFn` (required — Windowed dispatches through `runPairVST`, which Blocked Mahalanobis never does).

> **Copy the pattern, measure the placement.** The dispatch said "copy Blocked Mahalanobis verbatim." A literal copy put the `await` inside the hot `for b` loop and cost **60%** — an `await` in an inner loop deopts V8's optimisation of the whole thing, taxing **every** file, not just wide ones. Moving the yield outward keeps the inner loops synchronous: overhead drops to about **7% in a browser**, 126 yields on the 36-column arm. **The precedent's structure is portable; its placement is specific to the loop shape.** (Blocked Mahalanobis is flat; Windowed is nested.) `PERM_CHUNK = 2000`, not Blocked Mahalanobis's 50, because Windowed's counter is global across pairs.

#### Sharing a permutation draw across tests — CLOSED, NO

Windowed Autocorrelation and the Runs Test **do** shuffle the same object (the within-pair difference series), differing only in the per-window statistic. Sharing the draw is nonetheless not available.

**The suite runs off one shared PRNG whose draw order is load-bearing for bit-exact batch parity** — the very property that governed the yield fix. Folding two tests into one shuffle pass changes the draw sequence for everything downstream. Small saving, blast radius of the whole batch.

> **Same-object does not mean same-null.**

#### Shared yield helper — SCOPED, NOT BUILT, DEFERRED

Only Blocked Mahalanobis and Windowed Autocorrelation yield during their null loops. **Seven synchronous null loops remain:** Constant-Offset Blocks (**bounded** — caps the permutation at `MAX_PERM_PAIRS = 30`, so its cost does not scale with column count), LOESS Residual, Regional Noise, Residual Spike Correlation, Cross-Condition Consistency, Column Goodness-of-Fit, Entropy.

*(Two carried claims were wrong and are corrected here, both asserted from summaries and neither checked at source: **Constant-Offset is not unthrottled**, and **Modality has no null loop at all** — it computes an analytical dip p-value; the bootstrap was retired. Nine candidates, not ten; seven remaining, not eight.)*

**Worth building for the plumbing, not the null.** A helper owning the async loop, chunk size, yield and progress fraction — each test passing its own shuffle-and-score closure — is worth it: **that boilerplate has been hand-rolled twice and the copy was wrong the second time.** A driver owning the *shuffle, statistic and FDR tail* would be nine special cases in one function; the permuted object, the statistic and the loop nesting genuinely differ.

**The helper must expose the yield placement, not hard-code it.**

**Convert Runs Test and Inter-Replicate Correlation first** — the two remaining quadratic-in-columns synchronous loops, Windowed's exact shape.

**Deferred: nobody has hit this freeze.** Both scale on `C(replicates, 2)`, and real files carry three to six replicates. Windowed blew up because it pairs **columns**, and C12 had 36.

#### N_PERM has no column dimension

Every permutation test scales its permutation count by **rows** and nothing else. Cost is quadratic in columns for the pair-based tests and **no policy anywhere throttles that dimension.** Windowed at 2,412 rows fixes `N_PERM = 499` whether there are 3 columns or 36.

**This is a statistical decision, not a performance one.** Fewer permutations coarsens the null and raises the floor on the smallest achievable p — at `N_PERM = 199` the finest raw p is 1/200, and across 630 pairs under BH-FDR that floor may matter.

**Measure before deciding:** does C12's 36-column verdict change between `N_PERM` 499 and 199? It reads `LOW, primaryP = 0.068` with zero significant windows at 499. If a coarser null does not move it, the throttle is cheap. **If it does, we have learned something about the null and should not have guessed.**

#### The performance baseline is accurate and predicts nothing about the corpus

On the 28 fixtures, **Blocked Mahalanobis (40.5%) and Kurtosis (21.4%) are still the top two**, matching `docs/PERF-BASELINE.md`'s 38% / 21%. The baseline is **not stale**.

**But on C12 the ranking inverts completely.** Cross-Condition Consistency — 8th on the batch at 3.4% — is **73%**. Blocked Mahalanobis — 1st on the batch — is **4ms**. No fixture has more than a handful of conditions, so no fixture ever enters the O(nCond²) regime. **The baseline measures the wrong workload for this file, not the wrong numbers.**

**Source:** S317 — four read-onlys and four promoted fixes (`4dd88c4`). All source-cited; the two corrected claims above are the record of what was asserted from memory and falsified at source.

---

### 2.12 Structural omission as a signal — the absence "not applicable" would neutralise (S322)

**Cross-model validation surfaced this and the tool has no capability for it.** Recorded here because METHODOLOGY §Applicability and Coverage Reporting Contract cross-references it as open scope.

**The case.** A file reports only group means and standard deviations, with no raw replicates — tumour volumes per group rather than per animal, or condition means with error bars and nothing underneath. Every replicate-comparison test correctly returns **not applicable**: there are no replicate columns to compare, and the battery is right to decline.

**But the omission is itself the shape fabrication often takes.** Summary-only data is precisely what survives when someone wants to hide within-group noise that real measurements would carry. Two of the three validation models built this case independently. The reader who should be asking *why are the raw values absent?* is instead told the tool looked and found the question inapposite. Gemini's framing: the label neutralises a red flag with clinical terminology. An undifferentiated N/A at least prompts the question; a confident "not applicable" answers and closes it.

**Why this is not solved by the applicability contract.** That contract fixes the *denominator* problem — it forbids shrinking coverage figures to the applicable subset, and requires a thin file to be reported as thin. That prevents a structurally impoverished file from presenting as thoroughly screened. It does **not** make the omission a finding. A file can be honestly reported as thin and still pass without anyone asking why it is thin.

**What a detection surface would need.** Not a test in the battery — a property of the upload. Something that recognises when an entire class of tests is inapplicable *because the file omits data a comparable file would carry*, and says so as a signal rather than as a coverage note. The hard part is the comparison class: the tool is a generic screener with no knowledge of what a given experiment should contain, which is the same limitation that forbids a moving denominator. A single-condition file with no replicates may be a legitimate design or a stripped one, and nothing in the data separates them — the same shape as the factor-versus-stratum problem in §2.10, and likely subject to the same resolution: ask the user rather than assert.

**Interim position, in force now.** METHODOLOGY states that "not applicable" must not be read as exculpatory. That is a wording constraint, not a detection capability, and it is all the tool has until this is built.

**Sequencing.** Behind the applicability contract's display reconciliation, and behind promote. Not v1.0 — the review paper can state it as a known limitation with the validation reasoning attached, which is a stronger position than an untested implementation.

---

### 2.13 Cost ceilings measure the wrong variable (S327)

`BLOCK_SCAN_LIMIT = 5000` guards the sequential-duplication scan and, separately, Duplicate Detection's block-copy sub-test. Both are row-count ceilings. **Row count does not predict cost.**

**The measurement.** Apple M3, Node v25.8.1, one warm-up then adaptive timed runs, median with spread. At 5,000 rows × 14 columns the sequence scan costs **61 ms on random data and 7,560 ms on C14** — a factor of 124 at identical size and shape. The variable that predicts cost is cardinality: a categorical code stored as a number generates enormous numbers of candidate sequences. A row-count guard is therefore simultaneously far too strict for well-behaved data and, on C14, too generous — it already admits a scan taking 7.5 s at the ceiling and 8.4 s at the file's full 9,398 rows, on a blocking main thread.

**The quadratic is not where the comment says.** `maxOffset` caps at 200 above 500 rows, so the scan walk is linear. The quadratic is the dominance dedup at `sequentialDuplication.js:115–121`, which scans the whole `kept` array per sequence. Measured: `kept` grows 10.1× across the range while time grows 112×; 10.1² = 102. Two source comments are wrong about their own cost — `duplicateDetection.js:367` claims O(n² × cols) and measures near-linear, and `sequentialDuplication.js:33` describes only the cheap half.

**The two constants guard different curves.** Sequential Duplication is quadratic (empirical exponent 2.36, reduced to 2.23 by the S327 optimisations); Duplicate Detection's block scan is near-linear. They cross over between 2,500 and 5,000 rows — below it the block scan is dearer, above it the sequence scan runs away. One constant serving both is wrong on its own terms.

**What landed at S327.** Bucketing the dedup by column and memoising `nOppForHeight`. Verdict byte-identical at all five measured sizes; C14 15.2 s → 8.4 s. The speed-up was **2.09×, not the 14× predicted** — the prediction assumed sequences spread evenly across fourteen columns, and two columns hold 95% of them. Bucketing cannot split one column's work. **Optimisations divide the constant; they do not change the order.**

**What the fix is not: a different number.** Two candidates are real, and both are decisions rather than engineering:
- ~~**A cardinality guard on the column loop.**~~ **KILLED S328 on measurement — see the amendment at the end of §2.14.** Excluding `Tree ID` and `CROWNCLASS` from the sequence scan drops 40 duplicate blocks, 32 of them found by nothing else in the battery. The precedent instrument is worse than nothing here: `PARTIAL_ROW_CARD_FRAC = 0.02` at `duplicateDetection.js:731` keys on largest single-value share, and on this file it would hold out seven of fourteen columns including `ACTIVITY_ID`, the driver of the HIGH. Do not rescope; the cost has to be bought elsewhere.
- **Async yielding.** Blocked Mahalanobis already does this, yielding every 50 permutations (S169). It does not reduce the work; it stops the remainder reading as a hang.

**Corpus impact is one file.** Through the real pipeline only four sheets exceed 5,000 analysis rows: C14 `Data` (9,398 × 14) and three C11 sheets at 2 and 5 columns. **C14 is the only one both over the ceiling and wide enough to be expensive.** Raw sheet extent misleads badly here — C25's 43,202-row workbook analyses as 3,600 and C10's 16,522 as 400.

---

### 2.14 The sequence-duplication null already prices categorical columns (S327)

A recurring run of values in a five-value column looks like duplication and is not. The natural response is a cardinality guard on correctness grounds. **Measured on C14, that framing is wrong: the null already handles it, and the guard would be a performance fix only.**

**Why it decomposes.** `primaryP = min(pAdj)` over kept sequences, where

```
pAdj = min(1, colHHI[c]^h × nOppForHeight(h))
```

`colHHI` depends only on its own column and `nOppForHeight` only on row count and the offset cap, so the arithmetic decomposes per column exactly. Every counterfactual below is computed from one run rather than re-estimated.

**Why it works.** A column that repeats constantly gets a high HHI — 0.385 for C14's `CROWNCLASS` — so `HHI^h` decays slowly and long runs are priced as unremarkable. A near-unique column gets a tiny HHI — 0.0001 for `Biomass (kg)` — so a run of 18 is astronomically improbable. The pricing is correct. It simply pays the cost before applying it, which is exactly why this is a work problem and not a verdict problem.

**The measurement.** C14's two categorical columns (`Tree ID`, 16 distinct; `CROWNCLASS`, 5) carry 95% of kept sequences and the **two weakest** p-values in the file — 2.11e-4 and 5.47e-4, sixty-five orders of magnitude below the driver. Excluding both leaves `primaryP` **identical to the last digit**: 7.917e-69, driver unchanged (`ACTIVITY_ID`). Removing 79,349 of 83,502 sequences moves the verdict not at all. The HIGH survives dropping eight of fourteen columns.

**Two qualifications, both load-bearing.**

*They are not innocent, merely not the driver.* Both categorical columns clear `ALPHA.FLAG` on their own. On a file where they were the only columns they would produce a HIGH by themselves.

*This is one file.* That these columns contribute nothing **here** does not establish that they never would. On a file where a categorical column carried the only anomaly, excluding it would lose the finding — and the corpus already contains that case in miniature. C14's rows 260↔261 (corpus spec, C14 known-gaps entry) are covered **only** by the two categorical columns and are lost entirely if they are excluded. That adjudication is open — defect, or legitimate repeated-measures convention? — so what is at stake is a finding nobody has yet decided is a finding. **It gates the guard.**

> **The paragraph immediately above was falsified at S328.** Kept verbatim because how it was wrong is the useful part. It reasoned about a pair nobody had measured, got the row numbers wrong, and made a coverage claim that inverted under measurement. The argument it was reaching for turned out to be much stronger than the one it made. See the amendment below.

**Sequencing.** ~~Behind the rows 260↔261 adjudication~~ — that adjudication closed at S328 (defect) and the guard it gated is killed; see the amendment below. What remains true: this section is written as measured-on-C14 rather than as a general property, and only the round 2 corpus sweep would widen it. Keep it that way until round 2 either widens it or does not.

#### Amendment (S328) — the guard is dead, and the section's core finding survives

Everything above about the HHI null stands. `pAdj` decomposes per column exactly, high-HHI columns are priced as unremarkable, and excluding both categorical columns leaves `primaryP` identical to the last digit at 7.917e-69. **That was never the question the guard turned on.**

The question was whether the two columns carry evidence. Measured through the real pipeline at S328, they do:

- Excluding `Tree ID` and `CROWNCLASS` from the sequence scan drops **40 duplicate blocks** out of what Sequential Duplication can point at.
- **32 of the 40 are found by nothing else in the battery** — not by Duplicate Detection, not by anything.
- **36 of the 40 span different `STAND_ID`s**, the population the C14 adjudication turned on.

A p-value that does not move and evidence that disappears are different things. The section above measured the first and inferred the second. **The guard would delete 32 pieces of unique evidence to buy a speed-up.** It is killed, not deferred.

**A measurement discipline point, because it nearly went the other way.** The first pass counted a block as covered if any sequence *overlapped* it. With 83,502 sequences spanning up to 46 rows, overlap is near-certain by chance: it reported 253 of 253 covered and a loss of 13. Requiring the sequence to actually **explain** the block — offset equals the member gap, one member in source and the other in destination — gave 196 explained and a loss of 40. The loose predicate flattered coverage and would have kept the guard alive. A second check on Duplicate Detection's evidence caps (20 groups, 20 partial-row locations) moved the stranded count 34 → 32, confirming the caps were not the story.

**Two structural findings this opened, both larger than the guard:**

- **The scan's height floor.** A run of two is a run of one against a floor of three, so Sequential Duplication cannot see two-row duplicates at all. **57 of 253 blocks are unmapped for this reason.** A coverage boundary, not a bug — but it should be stated as a limit rather than discovered again.
- **The group-attribute pass discards more than labels.** Ten of twenty-four sheet columns never reach the matrix on C14. `STAND_ID` is a label and `Species`/`DamageSev` are conditions, but **seven measurement columns are held out as attributes** — ring count, DBH, tree basal area among them. That is data the tests are not seeing, and it is what blinds the tool to the defect's own signature: rows 262↔263 differ only in `STAND_ID`, so the tool can say the rows are identical but not that they are supposedly different stands.

**What follows for cost.** Those two columns still carry 95% of kept sequences and C14 still takes 8.4 s post-dedup on a blocking main thread. The cost is real and unaddressed. It has to be bought somewhere that is not the evidence — async yielding (Blocked Mahalanobis already does it, S169) is the standing candidate.

---

### 2.15 One question, two owners — applicability is decided twice and the answers diverge (S332)

Whether a test applies to a dataset is answered in two places by two separate implementations. The import screen predicts it. The engine decides it. They drift, and the drift is visible to the reader as two screens contradicting each other about the same run.

**The measurement.** On `14-crctest-survey.csv` — six columns of Likert ratings, eighty rows, no conditions — the import screen said **20 of 28 tests applicable** and the report said **3 of 29 completed, 26 not run**. Neither number was the battery size. The engine dispatches 29; the prediction counted from a hand-written list of 28 that omitted Sequential Duplication entirely, and that omitted test was one of the three that ran.

**Why the prediction missed.** `getApplicabilityTests` re-encoded the engine's column and row minimums as 28 boolean expressions. It consulted seven summary fields and the column relationship. It did not consult `dataType`. Sixteen tests declined on that axis alone — correctly, and on a documented premise: forcing the replicate battery onto Likert items produces roughly 7% false positives on honest controls (ground truth, DS14).

The import screen had already resolved the data as ordinal. The value was displayed on that same screen, locked, in a control the reader could see. The predictor did not read it. **This was never an ordering problem — the information was in hand and unused.**

**The tier structure, established by classification over all 29 tests.**

| Tier | Count | What the decline needs |
|---|---|---|
| Summary | 8 | Row counts, column counts, integer fraction — already held |
| Matrix | 13 | A linear scan of the loaded matrix: distinct counts, valid-row counts, trimmed spans |
| Run-only | 8 | Singular covariance; shape outside the fitted families; every feature differing between conditions |

The run-only eight are an irreducible margin. No input predicts them.

Separately, the three dispatch helpers — `dtSkip`, `condSkip`, `rsSkip` — read a test name plus three state values and never touch the matrix. All three values exist on the import screen before Run. That is the sixteen-test gap, available for the price of passing two arguments.

**What landed at S332.** The prediction now derives from the same exported tables the helpers read (`DATATYPE_SKIP`, `ROW_SEMANTICS_FULL_SKIP`) and consults two summary axes it already held but ignored (`intF` for Terminal Digit, Benford second digit and Value-Frequency Spike; `miss` for Missing Data Pattern). `BATTERY_SIZE` in `mechanisms.js` is the single source for the total, replacing three hand-written values across six sites. File 14's overshoot went from 17 to 1; no fixture overshoots by more than 2.

**What did not land, and why.**

*The matrix tier, by judgment not cost.* The thirteen scans are cheap and would not slow the screen. They were left out because thirteen more predicates is thirteen more chances to be wrong on a surface the batch cannot see, against a residual of at most two tests per fixture. A deliberate stop, not an omission.

*`condSkip`'s per-test membership.* Not exported, so it remains transcribed in the summary predicates. **One of the three axes is still a copy.** The drift risk is reduced, not eliminated.

*Two name spaces.* `DATATYPE_SKIP` and `ROW_SEMANTICS_FULL_SKIP` key on dispatch label; `TEST_MECHANISM` keys on result name. `Excess Kurtosis`/`Kurtosis` and `Selective Noise Partitioning`/`Selective Noise` differ. Bridged by a two-entry alias in the predictor and eliminated in §5 by inverting its strike predicate. It will surface again on the next test added.

**The design question this settled, against Chat's position.** Chat proposed the import screen lead with prose describing the data kind and which parts of the battery fit it, keeping the count secondary. Four external models were asked to attack it; three answered and all three rejected it.

The decisive argument: **the run-only eight argue against prose, not for it.** A number reads as incomplete and invites "of what?" Prose reads as finished and discourages the question. Chat had the reasoning inverted. Two further points landed — a wrong count is one visible line that disagrees with the report, while wrong prose built on a bad auto-detect is globally wrong and reads as authoritative; and the position rested on a single vivid file. The count stays primary, derives from the engine, and names the run-only margin in the line rather than absorbing it.

**What remains open.** The display half closed across S333 and S334. Section 5's strike list is gone; reasons live in one place, grouped by cause, in the display vocabulary; section 3's header no longer carries a coverage clause; and `resolveDisplayName` in `mechanisms.js` gives the no-verdict surfaces a single name for each test. Two of the three complaints in the original version of this paragraph did not survive contact with the source: cluster labels strike only when every member test is struck, which is defensible, and the two-screen naming problem had already been fixed at `5ca9452`. The naming problem is not finished, though — the copyable prompt in section 4 and the export table at `ReportView.jsx:789` still use internal names, and the prompt names the clusters on a different basis again.

**None of that touches the cause.** The dispatch helpers should answer the question once and both surfaces should ask them. That requires exporting or lifting `dtSkip`, `condSkip` and `rsSkip` out of `runFullAnalysis` — an engine refactor, out of scope at S332 and again at S334. The redesign removed the symptom and left the defect, which is the worse of the two states to be in: the divergence no longer shows up as arithmetic a reader could catch.

### Evidence — three files, S334

The section 5 redesign put the import screen's prediction and the engine's actual result side by side for the first time, on the same battery, in the same vocabulary. They disagree on every file checked.

**A clean three-condition file (35 rows × 12 columns, 4dp).** Second-Digit Frequencies and Noise Scaling were both predicted applicable and declined on the run. Unusual Rows was predicted **not** applicable and ran. The cluster count hid two of these: the import screen said 9 of 14 for cross-replicate and the engine said 9 of 14, but membership differed, because Noise Scaling and Unusual Rows swapped and the errors cancelled. Only a line-by-line read catches it.

**DS09 (Vehicle/Treatment, 2dp).** Over-used Numbers was predicted not applicable and ran. The import screen showed Unusual digits at 4 of 5 with that test crossed; section 5 showed 5 of 5 with it in the ran list.

**The survey file (DS14, 80 rows × 6 columns, Likert).** The import screen predicted four tests would apply. Over-used Numbers was among them and declined on the run.

**Why two of these are worse than the rest.** The import screen carries its own disclosure — a "depend on the data (known only after running)" list naming tests whose applicability cannot be settled before the run. Disagreements inside that list are honest, and the cross-condition tests on both clean files sit there. Unusual Rows on the three-condition file and Over-used Numbers on DS09 do **not**. In both cases the tool stated a test would not apply, and it ran.

That is the direction that costs the reader something. A test predicted applicable that then declines leaves a gap the coverage section explains. A test predicted inapplicable that runs means the import screen told the reader the tool would not look at something it then looked at — and had it flagged, the reader would have been told twice, inconsistently, about the same test.

**What this adds to the case.** At S332 the evidence was one file and one number, which reads as a calibration miss. It is now three files, in both directions, on tests the tool does not flag as uncertain. The run-only margin does not account for it: these are not tests whose applicability depends on what the run finds, and the import screen does not claim they are. Two implementations answer the same question and give different answers, and the only reason it stopped being visible is that the display got better at hiding it.

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
| Arbitrary-offset block duplication detector (§2.7) | This doc | Single source; opened S299 from the §2.6 under-determination finding. Distinct from §2.4 (one-column axis) and §2.1/§2.2 (block-Mahalanobis regime, not identical values). Must not be welded onto §2.6. |
| Group-attribute column recognition (§2.8) | This doc | Single source; BUILT S315 (`531e180`). Its outcome disproved its own displacement thesis and opened §2.9. |
| Scattered partial-row duplication (§2.9) | This doc | Single source; BUILT S316 (`e751523`). The coverage failure mode. Opened by §2.8's outcome, not predicted by it. |
| Row-grouping units (§2.10) | This doc | Single source; **trigger + confirm card BUILT S320–S321, stance cross-validated S322, twelve fixes unpromoted; one display reconciliation outstanding.** The applicability failure, in the tool's own grouper. Opened by a performance measurement, not a methodology review. Group census mirrored to `REALWORLD-CORPUS-SPEC.md` §0.3 (note the S322 C14 correction). Contract and stance authored in METHODOLOGY §Condition Grouping Contract, cross-validated twice (S318 factor-vs-stratum, S322 stance). |
| Structural omission (§2.12) | This doc | Single source; **open scope, no capability.** Surfaced by S322 cross-validation of the applicability contract. METHODOLOGY §Applicability cross-references it; the interim position there ("not applicable" is not exculpatory) is a wording constraint, not detection. Not v1.0 — stated as a known limitation in the paper. |
| Engine correctness — choke points, null-loop cost (§2.11) | This doc | Single source; S317. Four fixes landed (`4dd88c4`); the yield helper, the N_PERM column dimension and `entropy:142` remain open. |
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

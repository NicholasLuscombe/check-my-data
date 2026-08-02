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
| Test additions (post-v1.0 forensics) | Rectangular Blocked Mahalanobis; genuine-block detection; coherence-cleanup residue; column-localised sequential duplication detector; role/condition inference for real-world column shapes; **test-consistency audit beyond the closed item-28 audit (§2.6) — four demonstrated axes, axis 4 (input representation defeats Decimal Precision) added S330, FIXED S336**; arbitrary-offset block duplication detector (§2.7); **group-attribute column recognition — the largest demonstrated false-positive surface in the corpus (§2.8, BUILT S315)**; **scattered partial-row duplication — the coverage failure mode, exposed by §2.8's outcome (§2.9, BUILT S316)**; **row-grouping produces units the tests were not designed for — the tool's own applicability failure, half the row-grouping corpus (§2.10, trigger + confirm card BUILT S320–S321, stance cross-validated S322, twelve fixes unpromoted)**; **structural omission as a signal — the absence "not applicable" would neutralise (§2.12, open scope)**; **cost ceilings measure the wrong variable — row count does not predict scan cost, factor of 124 at identical shape (§2.13, S327)**; **the sequence-duplication null already prices categorical columns correctly — but those columns carry evidence, and the cardinality guard is KILLED (§2.14, S327, amended S328)**; **one question, two owners — applicability is decided twice and the answers diverge (§2.15, S332)** | New scope, this doc |
| Variance-estimator unification | Catalogue + scoped sub-refactors | Extends ROADMAP Track F; related to §2.6 (same forced-vs-artefact discipline) |
| AI Screening mode | Five new tests + mode toggle + reweighting | Restored from S125 chat history |
| Calibration audits banked | **Permutation grid resolution — seven tests cannot reach HIGH, and raising counts is the wrong fix (§5.9, S340)**; severity-formula diversity metric; Modality plot upgrade | §5.9 is primary scope; the rest mirrored from STATUS parked items |

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

### 2.6 Suite-wide test-consistency audit — DESIGN PROGRAMME COMPLETE — moved to `V1X-DECIDED.md`

Four demonstrated axes of test-consistency failure. Axis 4 closed S336 (`4a7cda2`); the
continuous-recurrence defect was proven not separable from its column across all five routes
(S298–S301) and is now the paper's §5 disclosed limitation. Full entry and rationale in
`V1X-DECIDED.md`.

**One live residue stays here:** the axis-1 per-test Decimal-Precision pooling guard. Per-column
gating does not cure it — on CORPUS-01 the artefacts sat inside columns that were otherwise 2dp, so
each affected column carried its own outlier. Three routes reach this one test; do not let a fix on
one inherit the others by resemblance.

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

### 2.8 Group-attribute column recognition — BUILT S315 (`531e180`) — moved to `V1X-DECIDED.md`

The per-column applicability predicate for numeric columns that are attributes of a grouping key
rather than measurements of the row. Built and promoted at `531e180`. Full entry and rationale in
`V1X-DECIDED.md` — including the outcome that disproved its own displacement thesis and opened §2.9.

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

### 2.9 Scattered partial-row duplication — BUILT S316 (`e751523`) — moved to `V1X-DECIDED.md`

The fifth sub-test inside Exact Duplicate Detection. Built and promoted at `e751523`. Full entry and
rationale in `V1X-DECIDED.md`, including why §2.8's outcome opened this one.

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

#### Landed and closed items — moved S343

Three subsections moved to `V1X-DECIDED.md` §From §2.11: the shared-choke-point guards (`flagFromP`
and its sibling, LANDED S317), the Windowed Autocorrelation stack-overflow and yield fix (LANDED
S317), and the sharing-a-permutation-draw question (CLOSED, NO). The open items below are unchanged.

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

### 5.1 Permutation calibration B = 999 → 9999 — SUPERSEDED by §5.9 (S340)

Original scope, retained for the record: raise B to 9999 across the battery so the adjusted-p floor drops
by 10×, and identify which tests benefit.

**The premise was right and the remedy was wrong.** S340 measured the whole battery against its own
thresholds. Raising counts to the level the arithmetic demands costs ×4.9 on the fixture batch and does not
reach HIGH for two tests at any affordable count, because their floors come from a doubling construction
rather than from B. The question is no longer "which tests benefit from more draws" but "which severity
tiers the permutation tests can support at all". See §5.9.

One thing this item had right that survived: the tests it named as sitting just above the HIGH threshold
are, with one exception, the same tests §5.9 finds cannot reach it.

### 5.2 Severity-formula diversity metric reconsideration

Track C's dimension-based severity formula caps one-dimension fabrications at severity 2 absent HIGH + cross-dim MODs. DS15 is the only current fixture instance. Question: is the diversity-metric framing the right way to model multi-dimension convergence, or does it under-call genuine single-dimension fabrication signals? Pair with §5.5 (assay-aware severity weighting) when revisited.

### 5.3 Modality test plot upgrade

STATUS parked #7. Current Modality plot is the Hartigan dip number; replacement is a per-column histogram with peaks marked. UI refinement, not methodology change. Lands in any Modality-card-touching session.

### 5.4 Large-N effect-size gate audit — PROMOTED to v1.0 blocker (S187)

**Status: v1.0 blocker, tracked in STATUS.md §v1.0 blockers.** Retained here for the methodology detail; STATUS holds the current-state line. Promoted S187 on the trust argument — the tier vocabulary ("High") is a cross-test evidence-strength claim, and if it doesn't trigger at matched reliability across tests, the abstraction misleads exactly where reviewers rely on it.

**Framing.** The tiers are already *defined* as false-positive rates (HIGH p < 0.001 = <1/1000 clean datasets; MODERATE p < 0.01 = <1/100), unified across the battery by design. FISHER_EXEMPT membership and the Tier-2 effect-size gates are the machinery that *enforces* that definition where a raw p-value would be non-uniform under H₀ — not evidence of miscalibration. **S341 — this reading is contested and the honest position is neither.** A gate does not make the p uniform under H₀; it censors results, which under a true null is pure conservatism and pushes the realised rate *below* nominal by an unmeasured, per-test amount. So the gated tests do not report a 0.001 false-positive rate; they report "extreme *and* materially large", which is a different claim. Against that, and **measured at S342**: with every effect-size gate removed, **five of eight clean fixtures return a non-clean verdict** and three reach severity 2. At the default seed no clean fixture emits a single MODERATE or HIGH today. So the gates are not protecting card expressiveness — they are protecting **verdicts**, and the underlying tests are not fit for this domain without them. The honest statement of what the tool does: the p correctly answers "does this differ from an idealised null"; real clean measurement data *does* differ; and the gate answers the question the tool actually asks — is the deviation large enough to be a fabrication signal. **The gates carry the entire specificity burden.** See `docs/shared/SESSION342-CLEAN-CORPUS-GATE-CLASSIFICATION.md` and `SESSION342-BAND-COUNTERFACTUAL.md`. Both are true. The gates trade an anti-conservative model-misspecification error for an unmeasured conservative censoring, and **neither side has been measured** — which is gap 2 below, and why gap 2 is the load-bearing half of this blocker rather than gap 1. The convergence-escalation rule (2× MODERATE → HIGH) already depends on tiers being FP rates, so FP-equivalence is foundational, not optional. **S342 scope qualification, and it is load-bearing:** that measurement covers only the regime the clean corpus reaches. No clean fixture exceeds 400 rows, and every save came from a gate with **no N precondition**. So the result establishes that the gates are load-bearing in general, and says nothing about the large-N gap this section exists to close. Two gaps stand between "defined-as" and "demonstrated-as":

1. **The gate census is wrong in both directions, and was re-derived at source at S342.** The battery has **18 tests carrying an effect-size gate and 11 carrying none**, plus exactly **one unconditional tier cap** (`rankCorrelation.js:102-103`, confirmed by a grep across all 30 files in `src/tests/`). This item's original list of six ungated tests — First-Digit Frequencies, Last-Digit Frequencies, Runs, Row-Mean Runs, Decimal Places, Mean-Variance — is **wrong on exactly two**: First-Digit gates at `mad < 0.015` (`benford.js:93`, Nigrini nonconformity, ahead of the p) and Runs gates at `nR >= 500 && runsRatio > 0.70` (`runs.js:206`). The other four are correct. **The larger error is omission.** Seven ungated tests are missing entirely — Exact Duplicate Detection, Sequential Duplication, Residual Spike Correlation, Windowed Autocorrelation, Blocked Mahalanobis, Missing Data Pattern, Cross-Condition Rank Correlation. Two postdate this section's authorship and Rank Correlation is arguably out of scope because its cap already prevents HIGH, but the census is **two-thirds omission by count**, not a third wrong, and must be re-derived rather than trusted.

   **The N ≥ 500 grouping is also wrong, and it matters more.** Seven tests carry a gate conditioned on N ≥ 500, but **only five are row-gated.** Selective Noise counts Bartlett observations (`selectiveNoise.js:183`) and Cross-Condition Consistency counts **pooled cells** (`crossConditionConsistency.js:602`, `nMin` at `:377`) — CCC's gate has fired on every clean fixture it ran on, including one at **35 rows**. Of the five genuinely row-gated, two were observed live and declined to fire, and **three — Runs, LOESS, Regional Noise — have never been observed firing on any fixture at any size.** That is the entire empirical basis under this gap, and it is empty. **A large clean fixture is therefore a prerequisite for measuring gap 1, not a consequence of measuring it** — the clean corpus tops out at 400 rows and no fabricated fixture exercises these three above 500 either.

   The original substance stands where it is untouched: at large N the p-value floor crashes toward zero on forensically-trivial deviations, so an ungated test over-triggers on clean data — a real FP-equivalence violation localised to the large-N regime. Fix shape: a per-test effect-size threshold below which p alone does not promote severity, matching the existing gates on Bartlett (variance ratio), Mahalanobis (distance), Carlisle (KS distance). Note (S240): for **Runs** the gate is necessary but not sufficient — see the i.i.d.-pairs sub-note below; Runs additionally needs a dependence-aware null, not only a large-N gate.
2. **The tiers have never been empirically measured against a null set.** The design defines them as FP rates and the enforcement machinery exists, but no null-simulation has confirmed each test's HIGH/MODERATE actually fires at ≤0.1% / ≤1% under H₀.

**Scope (both halves required for the blocker to close):**
- Close the six gates (per-test effect-size metric + calibration against the batch — see Approach below).
- Build a **null-set FP-verification harness**: run each test against many clean/null datasets, measure HIGH and MODERATE trigger rates, confirm they hit the stated FP targets, fix any test that misses. This is new infrastructure, but it's the evidence base the review paper needs regardless of the gate work, so it's not gold-plating.

**First step (read-only, sizes the job before any fix) — DONE at S341, see `docs/shared/SESSION341-HIGH-REACHABILITY-CLASSIFICATION.md`:** enumerate, per test, the exact tier-promotion rule and whether it has an effect-size gate / is FISHER_EXEMPT / neither. That inventory shows how many tests sit in the "naked p-value at large N" bucket vs already-gated. Open hypothesis the harness tests first: the uniform-null + standard-adj-p tests may already be roughly FP-matched, with only the FISHER_EXEMPT set diverging — in which case the job narrows to bringing the exempt set onto the same FP footing.

**S342 extends this, and inverts its open hypothesis.** The inventory is now built from source at
`docs/shared/SESSION342-CLEAN-CORPUS-GATE-CLASSIFICATION.md`, which carries the 18/11 gated split, the gate
statistic and threshold per test with `file:line`, where each gate sits relative to the p, and whether the
pre-gate p is recoverable. The hypothesis named above — that the ungated tests may already be roughly
FP-matched, leaving the job to the exempt set — is **not** what the measurement found. The false positives
came from **gated** tests, and the gate is what stopped them.

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

### 5.9 Tier reachability — five mechanisms, not one (S340, substantially corrected S341)

**Status: this section was wrong in five places and is rewritten. The grid arithmetic below is sound; the
census built on it was not.** The S340 version enumerated tests whose *permutation grid* cannot represent a
value below the HIGH threshold and reported "seven of 29" as the shape of the problem. There are at least
five independent mechanisms deciding reachability, this section covered one and a half, and the errors ran
in both directions — one test was wrongly listed as unreachable and one unreachable test was missing
entirely. Treat any count here as provisional against
`docs/shared/SESSION341-HIGH-REACHABILITY-CLASSIFICATION.md`, which is the measured classification.

**The arithmetic that holds.** A permutation p cannot resolve a threshold finer than its own grid step. The
requirement is arithmetic and no property of the data enters it. Counts in this battery were never chosen
against the thresholds they are judged by — they were chosen to bound wallclock while `createPRNG` was one
stream in dispatch order, so any raise displaced every test after it. That constraint was removed at S340
when per-test streams landed, which is what made the question askable.

**The ladder is two thresholds, not three.** `flagFromP` (`src/constants/thresholds.js`) compares against
`ALPHA.FLAG = 0.001` and `ALPHA.NOTE = 0.01`. **But it is not the only thing that sets a tier** — at least
five tests hand-roll the ladder with an effect-size pre-gate ahead of the p, and one carries an
unconditional cap. 0.05 appears in several tests as a sub-unit marker and in display prose, but never in a
flag assignment.

**What the ladder actually gates, corrected at S342.** Nothing guards the exit from severity 0.
`severity.js:20` returns 2 from a single HIGH and `:23` returns 1 from a single MODERATE, neither carrying a
dimension requirement. Two flags across dimensions is the route to severity **3** — branch 5 — not to a
non-clean verdict. This changes how the reachability finding should be read: see "Why this matters less than
it looked" below, which is now scoped rather than general.

**On per-condition routing the flag is not decided on the reported p.** `src/analysis/aggregation.js`
corrects the worst-group arm with Šidák — `flagFromP(sidakAdjust(groupMinP, G))` — while `primaryP` stays
uncorrected. So the raw grid must resolve a *tighter* threshold than the one written down. At G = 3 it must
reach 0.003345 for MODERATE and 0.000333 for HIGH; at G = 2, 0.005013 and 0.000500. Six tests take this
path on the current batch.

**The reported p on that arm is also biased low, and Šidák does not correct it.** The worst-group p is a
minimum over noisy per-group estimates. The minimum of estimates is below the minimum of true values in
expectation, by Jensen. Šidák corrects selection over G nulls; it does not correct selection over G noise
draws. So the false-HIGH rate on those six tests sits *above* nominal, and raising B would lower the HIGH
rate systematically rather than sharpening it symmetrically. Unmeasured.

#### The five mechanisms

1. **Grid floor.** The construction cannot emit a value below the threshold at the count it runs.
2. **Effect-size pre-gate.** A condition forces LOW before the p is consulted. `benford.js:93` gates at
   MAD < 0.015; `benford2.js:125` at 0.008; Runs at `nR >= 500 && runsRatio > 0.70`. **METHODOLOGY.md
   documents effect-size gates at nine separate sites** (lines 634, 758, 983, 1124, 1177, 1235, 1376, 1415,
   1446, 1519), so this is a substantial fraction of the battery, not a handful of exceptions.
3. **Unconditional cap.** Cross-Condition Rank Correlation carries `flagRankCap = {"HIGH":"MODERATE", …}`
   at `rankCorrelation.js:101-103`. It can never emit HIGH at any p, any effect size, any B, and it does not
   resample. Deliberate and documented — genuine biological similarity also produces high correlation. **No
   audit of estimators could have found this**, which is why the S340 census missed it.
   **Confirmed at S342:** a grep for cap-shaped constructs across all 30 files in `src/tests/` returns this
   site and nothing else — the other hits are array-size caps in `kurtosis.js` and `duplicateDetection.js`.
   It is the only unconditional tier cap in the battery. Current line reference is
   `rankCorrelation.js:102-103`.
4. **Post-hoc multiplicity — but only on a non-flat family.** A BH adjustment tightens the raw value
   required *when the family is uneven*. `bhFDR` is a step-up: the family minimum is
   `min over j of (p_(j) · m/j)`, so when every unit sits at the raw floor the `j = m` term returns
   that floor with no `m` factor. The earlier statement of this mechanism used the rank-1 value
   `p_(1) · m`, which is the worst case rather than the bound. **Corrected S343** — see
   `docs/shared/SESSION343-GATE-PROVENANCE-AUDIT.md` Part 2 and the rewritten METHODOLOGY
   §Permutation-Test Arithmetic Constraints. What multiplicity actually costs is step size,
   `(m/j) × c/(B+1)`, which is a property of a run rather than of a test.
5. **Invalid estimator.** `k/B` with no continuity correction, which emits `p = 0`. Fixed at S341 — see
   below.

#### The corrected census

| test | mechanism | fixable by raising the count? |
|---|---|---|
| Cross-Condition Rank Correlation | unconditional `HIGH → MODERATE` cap | no — it is a product decision, not an estimator limit |
| Modality | hardcoded `P_FLOOR = 0.001` **and** a `DIP_GATE = 0.04` effect-size gate, on a test whose bootstrap was retired at S159b | no — the clamp preserves the calibration of a resampling step that no longer exists |
| Entropy / Zipf | doubled floor `2/(1+B)`; at `B = 999` that is 0.002, above `ALPHA.FLAG` | yes — **B ≥ 2000**, not 19999. The earlier figure multiplied the floor by `m`; under the step-up the flat-family minimum carries no `m`. This is exactly the count Column Goodness-of-Fit already uses for the same reason. Corrected S343. |
| Residual Spike Correlation | floor `1/(B+1)` = 0.001 at fixed B = 999, and `flagFromP` needs strictly less | yes, any raise |
| Constant-Offset Blocks | **observed** minimum p of exactly 1.000e-3 at its highest declared count — measured under forced-high, not derived | no at any count it can take |
| Windowed Autocorrelation | raw floor clears; BH over the window family blocks it **only when the family is uneven** — a flat family at the floor reaches HIGH, same shape as Column GoF below. `m` reaches 298 on the corpus, so the worst case is severe. Corrected S343. | partially |
| Cross-Condition Consistency | doubled floor, distinct from Constant-Offset's bare floor | partially |

**Column Goodness-of-Fit is reachable and the S340 entry was wrong.** `bhFDR` is a step-up with monotonicity
enforcement, so when the whole tested column family sits flat at the `2/2001` floor the `j = m` term returns
the raw floor and HIGH survives. Narrower than "one grid position" — it needs a flat family, not one column
landing there — but not "cannot".

**The three tests the S340 table described with one phrase share no mechanism.** "Grid too coarse at every
count it takes" covered Constant-Offset, Windowed Autocorrelation and Cross-Condition Consistency; they are
a bare floor landing exactly on `ALPHA.FLAG`, a BH multiplier over windows, and a doubled floor
respectively. Uniform phrasing across three rows was where the audit flattened three mechanisms into one.

**Only one test is blocked by both a floor and a gate: Modality.** So "which tests would gain nothing from
any count change" is a one-test question, and the argument that raising counts is inert does not hold.

#### The census is size-dependent, and the fixtures are the friendly end

**Eight tests take a smaller resample count on larger inputs.** Regional Noise and LOESS take 4999 at ≤ 100
rows and 499 above; Constant-Offset and Windowed Autocorrelation trip above 1000 and 500 rows. Every branch
cites wallclock; none cites a threshold; **nobody measured what the change did to results until S341.**

Measured then: forcing all eight to their highest declared count costs **+8% on the battery** — not the
×4.9 this section previously priced for a different change — and moves three tiers upward at 8/8 seeds, one
of which moves a declared band. The saving the branch defends is **3.4 seconds**. Blocked Mahalanobis is 68%
of the scoped runtime and its branch contributes 67 ms; it has never run its coarse branch on any fixture in
the suite.

**The count rises from seven to ten if every fixture sat on the coarse side, and is ten at the 199 tier**,
which no fixture has ever run. Real deposited files are larger than the fixtures, and larger means coarser,
so every reachability number here is an upper bound on what real files get.

#### The invalid estimator, fixed at S341

Both Benford tests computed `k / N_SIM` at `N_SIM = 5000` with no continuity correction, so zero exceedances
emitted exactly `p = 0` — an assertion of impossibility on 5000 draws. **The S340 version of this section
listed that as two tests "already clearing the requirement".** It is the opposite: `(k+1)/(B+1)` exists to
prevent it (Phipson & Smyth 2010).

Corrected at S341 to `(k+1)/(N_SIM+1)`. Measured consequences, all counter to prediction:

- **The HIGH boundary does not move.** `(4+1)/5001 = 9.998e-4` is still under `ALPHA.FLAG`, so `k ≤ 4`
  stands. No decision boundary moves, which is why no tier moved anywhere in the battery. Arithmetic, not
  luck. (Chat predicted a move to `k ≤ 3` and the arithmetic was wrong.)
- **No Fisher input set changes**, because no Benford cell is aggregate-routed. Both tests dispatch on the
  whole matrix (`engine.js:371`, `:380`), sit in `GLOBAL_TESTS`, and never enter `aggregatePerGroup`. The
  earlier claim that the zero flowed through the Šidák arm, the worst-group maximum and the Fisher filter
  was reasoned from `FISHER_EXEMPT` non-membership without checking dispatch. None of those paths is ever
  exercised by Benford.
- **A clean fixture was emitting `p = 0`.** `09-proteomics-clean` reached maximal confidence and was stopped
  only by the `mad < 0.015` effect-size gate firing ahead of the p. **That is the strongest available
  argument that the gates do real protective work**, and it should be weighed against reading them as an
  unprincipled second definition.
- **Six cells were emitting `p = 0`, and four of them at every seed.** DS08 first digit, DS09 first
  digit, DS11 second digit and DS23 first digit always; DS10 second digit at 5 of 8 seeds and DS23
  second digit at 7 of 8. Seventeen Benford cells run at all across the corpus, so **over a third were
  emitting an invalid p**, and one of the four persistent cells is a clean fixture. The figure was
  reported inconsistently at first because no statement of it carried a counting rule — there is no
  correct bare number, only a number plus a rule.

#### Two tests reach HIGH off the grid entirely

Inter-Replicate Correlation and Runs Test take a minimum over arms of which only one resamples.
Inter-Replicate Correlation reaches HIGH on DS08 at p = 0.00062984, a value no permutation grid in the
battery contains — and S341 confirmed it is bit-identical at 4999, 999 and 199. For those two, "HIGH
unreachable" is true of the permutation arm and false of the test.

#### Why this matters less than it looked — and where it does not

**S342 correction. Read this section's scope before its conclusion.** The claim below is true of branch 5
and was widened, in conversation, into a claim about the whole ladder. It is not one. **Nothing guards the
exit from severity 0:** `severity.js:20` returns 2 from a *single* HIGH and `:23` returns 1 from a *single*
MODERATE, neither carrying a dimension requirement. Two flags across dimensions is the route to severity
**3**, not the route out of clean.

**Where the conclusion holds.** `severity.js:19-26` branch 5 — `(mod>=2 && nFlaggedDimensions>=2)` — returns
the same top band as `high>=2`. Dimensions are the five `TEST_MECHANISM` keys, and the blocked set spans
four of them. On a file carrying several signals, every test that cannot produce HIGH still reaches the top
band through the MODERATE path.

Under 29 independent tests at nominal rates, roughly 0.04% of clean files show two HIGHs and roughly 3.4%
show two MODERATEs. Most top-band verdicts on clean files arrive through MODERATE, and **MODERATE is
comfortably resolvable at current counts** — ten grid positions of headroom at B = 999.

**Where it does not hold.** For a narrowly-planted fabrication that only one test can see, a blocked HIGH
costs a band outright: one HIGH would give severity 2 and the MODERATE it is capped to gives 1. There is no
second flag to promote through. So the ceiling costs card expressiveness on multi-signal files **and
detection reach on single-signal ones** — and a narrowly-planted fabrication is precisely the case a
forensic tool exists to catch.

**That is still a better reason to reject option 1 than the cost argument this section used to carry, but it
is a narrower one than S341 recorded.**

#### The derived rule, and why it is necessary but not sufficient

A threshold decided by one or two grid positions is a resolution defect. Requiring several positions below
the threshold gives `step < T/5`, so at T = 0.001 the `(k+1)/(B+1)` family needs B ≥ 4999 and the
`2(k+1)/(B+1)` family needs B ≥ 9999. The floor is derived; the constant 5 is a judgement.

But the grid rule asks whether the estimator can *represent* a value below the threshold, not whether the
estimate reliably lands on the right side of it. A permutation p is a binomial proportion; an estimate whose
expected count is k has a spread of about √k grid positions. At B = 4999 and true p = 0.001 the Monte Carlo
SE is 0.00045, 45% of the threshold. Getting the noise to a fifth of the threshold needs B ≈ 25,000, and
under Šidák at G = 3, B ≈ 75,000.

**The qualification cuts the other way and matters.** A cell whose true p sits far below the threshold
produces zero exceedances at almost any B and lands below it reliably once the floor clears. The noise
problem is confined to cells near the threshold. **Nothing fixes those**, because a p sitting *on* a
threshold flips with the draw at any resolution — measured directly on DS12b's Regional Noise, where the
true p sits on `ALPHA.NOTE` and a 10× count increase left the tier split.

The "quarter of all resampling cells sit within two standard errors of a threshold" figure from S340 is
weaker than it reads: at B = 999 the bands cover roughly everything that is not LOW, and the corpus is
19/27 fabricated by design. It needs recomputing over clean fixtures, per threshold.

#### Options

**Option 3 is dead.** Declaring HIGH analytic-only awards the top tier to the estimators whose far-tail
calibration is least defensible. Selective Noise fails at 56% on DS06 and 79.9% on DS11 because Bartlett's
normality assumption breaks on count and heavy-tailed data; Mahalanobis Row Outlier's χ² null is documented
as miscalibrated under heavy tails with a DS15 reproduction. Those are the tests option 3 would promote.

1. **Raise counts.** Mispriced here as ×4.9 for a fixed-B raise. Sequential Monte Carlo (Besag & Clifford
   1991; Gandy 2009, "uniformly bounded resampling risk") stops early on unremarkable cells and bounds the
   probability that the Monte Carlo decision differs from the exact-p decision, with a published validity
   proof — which is the correctness argument S340 said adaptive B lacked. The saving is smaller than the
   literature implies here, because this battery's reported p's are minima over sub-units and cluster small.
   **Do not roll a bespoke two-stage refinement; refining only cells that look extreme breaks p-value
   validity.** Still low priority, for the MODERATE-drives-the-verdict reason above.
2. **Replace the doubling construction.** `min(1, 2(k+1)/(B+1))` applies a two-sided correction to a
   one-sided permutation p. The fix is not to remove the doubling but to take a **one-sided p on a two-sided
   statistic** — a min-tail-probability or centred-deviation statistic against the null already in hand.
   That halves the floor, preserves two-sidedness, and dominates both alternatives. For asymmetric nulls use
   the equal-tailed or min-tail convention, not `|T − mean|`. Cheap, correct, independent of everything else.
3. ~~Declare HIGH analytic-only.~~ Rejected, above.
4. **Report resolvability alongside the tier.** A cell within k standard errors of a threshold is reported
   as sitting on the boundary rather than pinned to whichever side one draw put it. This is the only option
   that addresses the near-threshold population rather than the census. Same move as P45 — report the shape,
   do not suppress on it.
5. **Change what a tier means.** The tool already runs two definitions — pure-p on most tests, "extreme
   *and* materially large" on the gated ones — and neither is written down as *the* definition. The choice
   is to pick one and make the others conform. Weighed against: §5.4 states that the convergence-escalation
   rule depends on tiers being false-positive rates, so dropping that definition removes the stated
   justification for the rule that carries most of the verdict. Both cannot stand.

**Lean: 2 first, 4 in whatever is chosen, 5 as the real question, 1 last, 3 never.**

**Relationship to §5.4.** §5.4 asks whether the tiers fire at matched false-positive rates across tests;
this asks whether a tier is reachable at all. They are the same abstraction from two sides, and S341
collapsed them further: §5.4's stated first step — enumerate per test the exact promotion rule and whether
it has an effect-size gate — is now largely
`docs/shared/SESSION341-HIGH-REACHABILITY-CLASSIFICATION.md`. Neither item closes without the other.

**What is measured and what is not.** The S340 numbers were Code's measurements at one seed, on a corpus
that has been tuned against since roughly S10. What has never been measured is what any of this costs in
detections (STATUS P43), or what the actual false-positive rate of any tier is under a null set (§5.4 gap 2).
The tier arithmetic says HIGH is often unreachable; it does not say how often a genuine fabrication would
have earned one. Both halves need instruments the project does not yet have — a null harness that generates
fresh clean data at run time, and a held-out dose-response corpus for the false-negative side.

---

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
| Permutation B = 9999 (§5.1) | This doc | **Superseded by §5.9 (S340).** Retained for the record; STATUS parked #8 retires with it. |
| Permutation grid resolution (§5.9) | This doc | Single source; S340. The measurement is Code's resolution audit; the three options are unchosen and need the four-model arc. Read with §5.4 — same abstraction, two sides. |
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

- **`docs/shared/archive/CLEARED-BODY-AUDIT.md`** — runtime inventory of all 28 test cards' cleared-state field population + current cleared-card render (source-read at `file:line`), with a per-card design-verdict column left empty for Chat. Built to feed a possible **cleared-card body design pass**: deciding what each card presents on a CLEARED/LOW result (the mechanical gating already auto-withholds Implications + What-to-look-for on LOW — the open question is the positive design call, what cleared cards show instead of nothing). **Whether that pass happens is undecided** — it withholds nothing functional, so it reads as v1.x polish, not a blocker. Audited against S196 code state; re-confirm cleared-render behaviour at source before any design work (substantial drift since). Pulled from project knowledge to save session-start context; **repull it there when/if the arc goes active.**

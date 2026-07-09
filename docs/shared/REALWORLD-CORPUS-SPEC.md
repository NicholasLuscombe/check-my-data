# Real-World Corpus — Run Spec + Tier-1 Results

**Status:** Tier-1 run and adjudicated (S292–S294). Tier-2 gated on data access (not run).
**Owner:** Chat
**Purpose:** Define the real-world run for Check My Data — labelled external datasets with third-party ground truth, an adjudication protocol that distinguishes true detection from false positive without overclaiming intent, and the adjudicated Tier-1 results that become the paper's real-world section.

**Reading note (S294):** §2's Tier-1 entries now carry the *adjudicated results*, not the pre-run expectations they were first written with. Three of three datasets moved past their original predictions — the most important correction being CORPUS-01, which the tool MISSED (a by-design gap), not caught. Where an earlier draft of this spec predicted a channel or severity, the adjudicated result at source (BANKED S292 corpus section; `PAPER-REALWORLD-RESULTS-DRAFT.md`) governs. The §1 framing, the §4 protocol, and the §5 output structure are unchanged — they are what was applied.

---

## 0. Road-test corpus — 22 PubPeer papers (S304+, the extended real-world run)

**Reconstruction note (S307).** The completed §0 block drafted in S305 was never placed onto main and its only copy was ephemeral — it is lost. §0.1 below is rebuilt faithfully from the BANKED "Ground-truthed road-test corpus" entry (S304). §0.2 (the per-case triage table) and the C25 / C11 / C23 entries in §0.3 need the S304 corpus list (Nick's S304 message / science-detective.org) and the S305 adjudications to be refilled — they are marked **[OWED]**, not reconstructed from memory. Only the C21 entry is fully documented (S306 summary) and is written in full below.

### 0.1 What this corpus is

Nick provided 22 PubPeer-flagged papers from science-detective.org as an extended road-test corpus. The review paper waits behind this (Nick's call — more real datasets before writing). CORPUS-01 (Sampson et al., *Cell* 2016, the §2.4 driver) and CORPUS-03 (Bierbach et al., *Nat Comms* 2017, the §2.6/§2.5 driver) are already two of the 22 with tool behaviour characterised — they anchor calibration.

**Framing (load-bearing for the paper).** Most of the 22 are not deliberate tampering, and some may not turn out to be genuine errors. The "may not be genuine" cases are the false-positive test: a forensics tool that fires on everything is useless, so those cases measure whether the tool correctly *declines*. Same intent boundary as §1 — the tool flags patterns inconsistent with honest data generation, not intent.

**Structure-first triage (S237), NOT a scattershot of runs.** Tabulate the 22 papers by three axes before running any:
1. **Data availability** — deposited (Dryad/Zenodo/supp) vs paper-only. First filter: paper-only can't be road-tested, only read. PubPeer threads often flag figure/table issues where raw data was never released.
2. **Documented defect** from the thread (duplication, digit anomaly, variance impossibility, stats-don't-reconstruct, figure reuse) — the ground-truth label; predicts which of the 28 tests should fire.
3. **Data shape** (long-format, wide, ID-indexed, factorial, genomics, time series) — predicts import-layer behaviour, which mangles certain shapes before detection.

There is a strong ecology / soil-microbiome / plant-trait cluster (~12+ of the 22, likely shared shapes — so one import issue probably generalises across the cluster, but the corpus is less shape-diverse than 22 sounds). The non-ecology outliers (Nature Photonics luminescence, JMIR mindfulness pilot, Drosophila coloration) carry the shape diversity — prioritise them alongside the cluster so shapes are spanned early.

**Division of labour.** Chat drafts the triage-table scaffold and pre-fills what's inferable from titles/journals (domain cluster, likely shape, CORPUS-01/03 known rows); Nick fills availability + defect-type per case (Chat can't reach threads/datasets). Runnable cases load in shape-coverage order, each checked against its documented defect. Findings feed back: a miss is a V1X candidate (like CORPUS-01 → §2.4), a false positive is a calibration item, an import mangle is a §2.5 / long-format item.

**Known-defect skip rule (adopted S307).** A case that re-demonstrates an already-banked family (axis-1 Benford span-borrowing; VFS precision-collision; ordered-row-semantics B2; measurement-type misclassification) gets a one-line note, its mechanism confirmed at source per case; full adjudication is reserved for a new Class A, a new B1, or an unbanked class. This keeps the ecology cluster from re-deriving axis-1 Benford a dozen times while preserving the per-case read.

### 0.2 Triage table (scaffold — **[OWED: fill from the S304 corpus list]**)

| Case | Paper (journal, year) | Domain cluster | Data availability | Documented defect | Likely data shape | Status |
|---|---|---|---|---|---|---|
| C07 | [OWED] | ecology (predicted) | [OWED] | [OWED] | [OWED] | not run |
| C08 | [OWED] | [OWED] | [OWED] | near-duplicate (per S306) | [OWED] | not run |
| C09 | [OWED] | ecology (predicted) | [OWED] | [OWED] | [OWED] | not run |
| C11 | [OWED] | [OWED] | deposited | axis-1 Benford (clean proof); near-dup tails Fig3h | [OWED] | adjudicated S305 |
| C12 | [OWED] | [OWED] | [OWED] | near-duplicate (per S306) | [OWED] | not run |
| C15, C16, C20, C22 | [OWED] | ecology cluster | [OWED] | axis-1 Benford (predicted) | bounded ANPP/biomass + wide sub-measure | not run |
| C21 | Inner Mongolia grassland (*Sci Adv* 2022) | ecology | deposited (Dryad, before/after pair) | ANPP block copied P200→P275 | wide, grouped-ordered | adjudicated S306 (§0.3) |
| C23 | [OWED] | [OWED] | deposited (Dryad, uncorrected) | near-duplicate `.385732` shared tail | [OWED] | adjudicated S305 |
| C24 | [OWED] | [OWED] | deposited (2nd `.xls`) | affine-transform (predicted) | [OWED] | not run |
| C25 | [OWED] | proteomics context | [OWED] | axis-1 Benford; measurement-type misclass | spanning headers | adjudicated S305 |
| C10, C13, C14, C17, C18, C19 | [OWED] | [OWED] | [OWED] | [OWED] | [OWED] | not run |

*Non-ecology shape-diversity outliers to prioritise (identities [OWED] from S304 list): Nature Photonics luminescence; JMIR mindfulness pilot; Drosophila coloration.*

### 0.3 Adjudicated cases

**[OWED] — C25, C11, C23** adjudications (S305) are not on this surface; refill from the S305 source, then place above C21 in whatever order the paper wants. What the S306 summary records of them: C25 = axis-1 Benford span-borrowing + a proteomics measurement-type misclassification; C11 = the clean axis-1 Benford proof + Fig2f Area recurrence (B1-candidate, ImageJ-quantisation read owed) + Fig3h near-dup tails (B-investigate); C23 = the uncorrected-deposit near-duplicate (`.385732`, 6dp shared tail), the preserve-side calibration anchor and the second B-boundary anchor's uncorrected partner.

#### C21 — Inner Mongolia grassland / *Sci Adv* 2022 (before/after author-correction pair — second B-boundary anchor)

- **Source:** Dryad deposit, before/after author-correction pair (deposit file + corrected file). **Provenance is by content-diff, NOT filename — the file labels were REVERSED (S306).** Adjudicate by diffing content against the documented defect, never by the `-update` label.
- **Documented defect (Class A):** P275-2017 ANPP copied from P200-2017 — `190.98, 169.32, 158.38, 254.7` identical across treatments, source-confirmed. Present on the deposit file; the corrected file carries a distinct P275.
- **Adjudicated result — Class A documented catch + first clean before/after specificity demonstration.** Duplicate detection flags HIGH on the file that contains the copied block, and the duplication *drops* on the corrected file (distinct P275). The flag tracks the actual data state — the specificity half of the road-test the update-files were collected for, delivered cleanly for the first time. The update-file pair working as designed.
- **Second B-boundary anchor, complements C23.** C21 = deposit error, **corrected**, tool confirms the fix worked (flag drops). C23 = deposit error, **uncorrected**, flag stays live. Together they span the corrected/uncorrected range — the false-positive/impact spectrum the paper's real-world section needs.
- **Digit-panel flags — applicability false positives, not computational errors (the coherent §2.6/§2.4 class):**
  - **Benford (axis-1 span-borrowing, third real-world instance after C25 and C11).** χ² correct; ANPP (OOM 0.75) and perennials (OOM 0.67) each individually below the 1.5-OOM span gate; annuals (OOM 4.05) lends the pool its span. Bounded ecological measurement is the driver — predicts recurrence across the ecology cluster (C07, C09, C15, C16, C20, C22). Fix predicate unchanged: per-column applicability (V1X §2.6), NOT a raised OOM threshold.
  - **VFS `.54` — adjudicated S307: tail-collision FALSE POSITIVE, not a B1.** A Code read of `C21.xlsx` (flagged file confirmed by the P275≡P200 diff; `-update` labels reversed as warned) found the 19 `.54`-tail cells are 18 distinct whole values (143.54, 131.54, 26.54, …; only `0.54` repeats, twice, plausibly genuine), scattered across 3 columns / 3 years / many treatments — no value duplication, and NOT co-located with the real P275≡P200 ANPP copy (none of the copied 190.98 / 169.32 / 158.38 / 254.7 ends in `.54`). So the VFS `.54` flag has no forensic content. It IS a valid VFS suppress anchor — but a demanding one: at obs≈19 it sits above uniform 2dp saturation (E[max]≈7.6), so the benign 2dp tail distribution is more concentrated than uniform and a uniform space-size null would not clear it. **Contrast C23's `.385732`** (6dp, obs=8 over 10⁶, P≈0, a shared deep tail across distinct integers = real near-dup). **Decimal depth is the discriminator** (original framing, confirmed): a shared 2-digit tail among distinct values is expected; a shared 6-digit tail is not. The low-precision near-dup signal, if any, must come from whole-value comparison, not tail frequency.
  - **Terminal Digit panel** — provisionally 2dp structure + duplication double-count; not separately adjudicated.
- **Second measurement-type misclassification (V1X §2.5).** "Western Blot Densitometry" classified on grassland ANPP (after C25's proteomics). Forced a log VST. Firms the §2.5 confidence-gate sub-item to two instances.
- **Open sub-threads (banked, not chased):**
  - 5 cross-year (2017↔2018) ANPP pairs in the corrected file — full-row-copy check pending. Annuals + perennials + density also match → real second defect; ANPP-total-only → coincidence. One source-read settles it.
  - Terminal Digit 2dp-structure vs duplication double-count — not separately adjudicated.

---

## 1. What this run is, and is not

This is the first time the tool is pointed at datasets nobody built to exercise a specific arm. The fixture suite (23) tests engine output against constructed ground truth; it is blind to behaviour on real legitimate structure (block designs, instrument quantisation, rounding conventions, genuine duplicates). The two questions this run answers:

1. **Sensitivity** — does the tool catch the documented defect in each labelled-positive dataset?
2. **False-positive surface** — what *else* does it flag on real data, and is each such flag a defensible detection or a calibration miss?

The second question is the one the fixtures cannot answer and the one reviewers will attack first. A tool that flags everything is useless; the real-world test is mostly *does it stay disciplined on the parts of real data that are honest-but-structured*.

**Intent boundary (load-bearing for the paper).** The tool detects *patterns inconsistent with honest data generation*, not *intent*. Several corpus positives have innocent or contested causes. The verdict copy must describe the anomaly and its statistical implausibility — it must not assert fraud. This run is also a test of verdict restraint, not only detection.

---

## 2. Tier 1 — Englund / Science Detective (Dryad, downloadable, adjudicated)

Three datasets from Markus Englund's copy-paste detector sweep, each with raw data public on Dryad and a localised, third-party-adjudicated defect. Adjudicated S292–S294. Each entry below carries the **documented defect** (the ground-truth label) and the **adjudicated result** (what the tool actually did, verified at source).

### CORPUS-01 — Parkinson's / Cell 2016 (documented defect MISSED — by-design coverage gap)
- **Source:** `MouseTreatmentMotorFunction.xlsx`, Dryad `doi:10.5061/dryad.4mp6h`
- **Paper:** Sampson et al., *Cell* (2016), gut-microbiota / Parkinson's model
- **Documented defect:** two sets of 5 identical sequential values in the adhesive-removal column, shared between SPF and ExGF mice; plus a pair of 3-identical-number sequences in the germ-free wild-type pole-descent data.
- **Defect family:** sequential block duplication across groups that should be independent.
- **Adjudicated result — Class C (false negative, by-design).** The tool **missed** the documented defect: Exact Duplicate Detection and Constant-Offset Blocks both returned LOW (p=1). The engine has no column-localised sequential-duplication detector — the duplication is a run of values *within* a column across group boundaries, not full-row or block-level copying. This is a disclosed coverage gap (v1.x candidate, V1X §2.4), independently confirmed present via PubPeer. NOT a calibration failure.
- **False-positive note:** the one HIGH flag on this dataset is Missing Data Pattern, adjudicated **B2** — it localises to a tight contiguous block of one column in one group, which is honest group-specific attrition, not a diffuse anomaly.
- **Prior expectation (superseded):** an earlier draft predicted Exact Duplicate Detection HIGH, severity ≥2. Both wrong — the defect family is outside the engine's detectors.

### CORPUS-02 — Ostrich/snake / PLOS Genetics 2022 (RETRACTED — exact copy caught, variance manipulation independently caught)
- **Source:** `NKA_Enzyme_Assays_Raw_Data.xlsx`, sheet "IC50", Dryad `doi:10.5061/dryad.sqv9s4n68`
- **Paper:** Mohammadi et al., *PLOS Genetics* (2022), CTS toxin-resistance. **Retracted June 2026.**
- **Documented defect:** exact duplicates between Ostrich/Sandgrouse and Xenodon (snake) rows; plus near-duplicates differing by one or two digits but always ending on the same terminal digit — six such pairs out of eight non-duplicate pairs. The retraction adds an author admission that absorbance values were **manually altered to reduce apparent replicate variance**.
- **Defect family:** exact duplication + partial/near-duplicate with a terminal-digit signature + admitted variance manipulation.
- **Adjudicated result — Class A + B1 + C.**
  - **A (exact copy caught):** Exact Duplicate Detection flagged HIGH, rows matched one-to-one to the retraction's named block.
  - **B1 (independent catch):** Regional Noise Homogeneity flagged MODERATE, localised to the source block, detecting *reduced* within-region spread — the fingerprint of the admitted "readings manually altered to reduce apparent variance." This is a genuine independent detection the copy-paste-focused writeup did not target, on a now-retracted paper. The corpus's strongest single row.
  - **C (near-dupe gap):** the near-duplicate pairs sharing a terminal digit were **not** caught. Terminal Digit Uniformity operates on the whole-column digit distribution, not pairwise near-matches, so six pairs in a small table do not move it. Disclosed coverage boundary, as the run anticipated it might be.
- **Cell-count note (resolved to "report both", S294):** our per-table comparison of the retraction's named block finds 8 differing cells; the notice states 12. File verified byte-identical to a fresh Dryad download. The paper reports both, with a stated hypothesis that the notice's count spans the separate ATPase-Activity sheet our per-table run did not load — a disclosed per-table-scope boundary, not a reconciliation.
- **Prior framing (superseded):** an earlier draft described this as CONTESTED (a live plate-reader dispute). The retraction and author admission moved it past "contested" to a confirmed manipulation with an admitted mechanism.

### CORPUS-03 — Clonal fish / Nat Comms 2017 (detected but under-called — innocent cause, verdict-restraint anchor + disclosed limitation)
- **Source:** `Bierbach et al clonal molly behav development_data for deposit.xlsx`, Dryad `doi:10.5061/dryad.td3sj`
- **Paper:** Bierbach et al., *Nature Communications* (2017), clonal fish behavioural individuality
- **Documented defect:** every unique SL (fish-length) value recurs exactly four times — a single per-fish measurement scrambled across the four observation rows per fish via an ID-misalignment join error.
- **Defect family:** structured value duplication (every value × exactly N, where N = observations per unit).
- **Adjudicated result — Class A (detection) / limitation (severity).** The pattern was **detected** — Exact Duplicate Detection listed the exact recurring rows as evidence — but severity was **under-called to LOW (p=1.0)**. Cause: the collision null is the empirical Herfindahl index of the column's own value frequencies, so a defect that repeats every value four times inflates its own baseline and the p-value collapses. Detection is real; the severity number is not a clean positive. Reported detection-and-severity separately.
- **Declared-structure footnote:** the engine's unaided role inference misclassified the `Fish.ID` column as data; the roles were declared explicitly (`Fish.ID: identifier`) via the corpus runner's `conditionsHint`, not unaided-inferred. Recorded in `CORPUS-PROVENANCE.md`. The row demonstrates detection and verdict-restraint, NOT unaided role inference (which failed here — v1.x work, V1X §2.5).
- **Disclosed limitation:** the under-call falsified a recorded safe-claim (that continuous data is exempt from the null circularity). Corrected in METHODOLOGY §1.1 (S294); source comment `duplicateDetection.js:135` correction owed; the null fix is V1X §2.6.
- **Adjudication note:** INNOCENT CAUSE, author-conceded join error. The corrected analysis found body size has a small real effect; conclusions held. The verdict-restraint anchor: the tool flags *the pattern* and leaves *cause* to investigation.

---

## 3. Tier 2 — Student Geng / Nature portfolio (cases under investigation, data access TBD — NOT RUN)

Two cases with described methods, both digit-pattern positives. Different in kind from Tier 1: these are *under active institutional investigation* (several authors already disciplined), so they enter as **cited corroboration**, not anonymous corpus rows — "the tool independently flags the terminal-digit anomaly in a case now under investigation" is a stronger and safer framing than treating them as blind test inputs. **Gate: confirm source data is downloadable before committing either to the run.** Neither has been run.

### CORPUS-04 — Nature 2024 DNA-damage paper (terminal-digit uniformity positive)
- **Paper:** Jin et al., *Nature* 637, 215–223 (2025) [source-data spreadsheet, Nov 2024]
- **Documented defect:** of 280 data points, 76% end in the digit 5; the next-most-common terminal digit (6) appears in only 6%.
- **Defect family:** terminal-digit non-uniformity — squarely the Terminal Digit Uniformity test's target.
- **Expected primary channel:** Terminal Digit Uniformity (HIGH). Close to a textbook positive for that test; a strong confirmation case if the data loads.
- **Status:** editor's note posted; institutional investigation found academic misconduct in ten of fourteen tables (first author dismissed). Strong external corroboration if the tool fires.
- **Access gate:** Nature source data — likely downloadable. Confirm before scoping.

### CORPUS-05 — Nature Cancer 2024 paper (cross-sheet positional duplication)
- **Paper:** Zheng et al., *Nature Cancer* 5, 572–589 (2024)
- **Documented defect:** the two post-decimal digits of all 64 figures on one sheet are identical to the figures in the same cell position on the next sheet.
- **Defect family:** cross-sheet positional duplication. This is a *cross-sheet* relationship; the tool operates per-table, so detection depends on whether the two sheets are loaded and compared, or whether the within-sheet residue is itself anomalous. **Capability probe** — may not be in scope for a per-table tool without a cross-sheet mode.
- **Status:** under investigation; corresponding author disciplined.
- **Access gate:** confirm source data availability and whether both sheets are obtainable.

---

## 4. Adjudication protocol

Run each dataset through the full battery, then for every flag the tool raises, classify against ground truth:

**A. Documented true positive** — flag corresponds to the third-party-adjudicated defect. Record: test name, severity, primaryP, and whether the localised evidence (chip/window/region) points at the documented rows/columns. The evidence must point at the right place, not just fire at the dataset level.

**B. Undocumented flag — investigate at source.** The tool flags a column/region Englund or Geng did not discuss. **Do not auto-classify as false positive.** Read the data at the flagged location. Three outcomes:
   - **B1 — additional real finding:** a genuine anomaly the third party didn't surface. This is a *win for the tool*, recorded as an independent detection. (CORPUS-02's Regional Noise catch is the realised B1.)
   - **B2 — legitimate structure:** the flag fires on honest-but-structured data (block design, quantisation, rounding, genuine biological duplication). This is a **false positive** and the most important row in the table — it characterises the real-world FP surface. (CORPUS-01 Missing Data; CORPUS-02 dose-adjacency, decimal precision, condition-pooling are the realised B2 set.)
   - **B3 — ambiguous:** can't adjudicate from the data alone. Record as ambiguous, don't force a verdict.

**C. Documented defect the tool missed.** A defect in the ground truth the tool did not flag. This is a **false negative** and a coverage finding. (Realised twice: CORPUS-01 sequential duplication; CORPUS-02 near-dupe-with-digit-signature.)

**Ground-truth discipline:** treat Englund's / Geng's writeup as *the label*, but adjudicate the tool's output against the **data**, not the prose. A flag on a column the writeup didn't mention is a B-case to investigate at source, never an automatic miss.

---

## 5. Output: the results table

The run produces one table that *is* the paper's real-world results section (drafted: `PAPER-REALWORLD-RESULTS-DRAFT.md`, S294, argument-ordered CORPUS-02 → 01 → 03).

| Dataset | Documented defect | Tool verdict (severity) | Driving tests (tier, primaryP) | Evidence localised correctly? | Class A/B/C | Notes |
|---|---|---|---|---|---|---|

Plus two summary statistics across the corpus:
- **Sensitivity:** reported as detection-and-severity, NOT a single caught/missed fraction — because detection and severity diverged on CORPUS-03 and the CORPUS-01 miss is a by-design coverage boundary. Adjudicated: one clean catch (CORPUS-02 exact copy), one independent catch (CORPUS-02 variance), one detected-but-under-called (CORPUS-03), two disclosed by-design misses (CORPUS-01 sequential, CORPUS-02 near-dupe).
- **False-positive surface:** the B2 flags per dataset — the headline real-world-discipline number. Realised: four B2 (CORPUS-01 Missing Data; CORPUS-02 dose-adjacency, decimal precision, condition-pooling), one unresolved (CORPUS-02 Selective Noise, no evidence emitted — not counted as FP), one B1 win. Every resolved B2 traces to a nameable legitimate structure; two (dose-ordering, condition-pooling) are structural v1.x limitations. The CORPUS-02 decimal-precision B2 has a mechanism as of the S294 §2.6 read: the cross-column-pooling axis (axis 1).

The paper claim this supports is the existing one, verbatim: **"every expert-flagged item the engine was built to catch, it caught"** (bounded sensitivity), *plus* a characterised and disclosed false-positive surface (discipline), *plus* disclosed coverage gaps. **Not "provably defect-free," and not a clean sensitivity number.**

---

## 6. Run sequencing (Tier-1 complete; Tier-2 lean retained)

1. **Tier 1 — DONE (S292–S294).** Three Dryad files downloaded, full battery run, adjudicated. Results in §2 above and `PAPER-REALWORLD-RESULTS-DRAFT.md`.
2. **Tier 2 — gated on data access.** Confirm Nature source-data downloadability for CORPUS-04 (the strong terminal-digit positive) before scoping; CORPUS-05 only if a cross-sheet comparison is in scope or the within-sheet residue is independently anomalous.
3. **Paper row order (locked S294):** argument-ordered — CORPUS-02 (strongest: exact-copy catch + independent variance catch on a retracted paper), then CORPUS-01 (disclosed by-design miss), then CORPUS-03 (verdict-restraint / under-call). Opens on strength so the disclosed gaps read as candour. (This supersedes the earlier CORPUS-01-first "front-load a confirmation" order, which assumed CORPUS-01 was a clean catch — it was a miss.)

---

## Open items
- **CORPUS-02 near-duplicate-with-terminal-digit-signature:** confirmed Class C coverage gap — no current test catches pairwise near-matches (only whole-column digit distributions and exact dupes). v1.x coverage candidate, as anticipated.
- **CORPUS-01 sequential-duplication:** confirmed Class C — no column-localised sequential-duplication detector. v1.x candidate (V1X §2.4).
- **CORPUS-05 cross-sheet detection:** out of scope for a per-table tool unless a cross-sheet mode exists. Scope decision before including.
- **Data-access confirmation** for both Tier-2 cases before they enter the run.
- **Two out-of-run documented defects** noted during Tier-1 (CORPUS-01 SynucleinandInflammation.xlsx; CORPUS-02 ATPase-Activity sheet) — possible corpus extensions.
- **Machine-manifest tracking** (`corpus-data/corpus-manifest.json`) — a Code-side reproducibility decision, carried. `CORPUS-PROVENANCE.md` carries the human-readable declaration + DOIs.

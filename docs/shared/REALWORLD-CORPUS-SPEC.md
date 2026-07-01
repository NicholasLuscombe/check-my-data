# Real-World Corpus — Run Spec + Tier-1 Results

**Status:** Tier-1 run and adjudicated (S292–S294). Tier-2 gated on data access (not run).
**Owner:** Chat
**Purpose:** Define the real-world run for Check My Data — labelled external datasets with third-party ground truth, an adjudication protocol that distinguishes true detection from false positive without overclaiming intent, and the adjudicated Tier-1 results that become the paper's real-world section.

**Reading note (S294):** §2's Tier-1 entries now carry the *adjudicated results*, not the pre-run expectations they were first written with. Three of three datasets moved past their original predictions — the most important correction being CORPUS-01, which the tool MISSED (a by-design gap), not caught. Where an earlier draft of this spec predicted a channel or severity, the adjudicated result at source (BANKED S292 corpus section; `PAPER-REALWORLD-RESULTS-DRAFT.md`) governs. The §1 framing, the §4 protocol, and the §5 output structure are unchanged — they are what was applied.

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

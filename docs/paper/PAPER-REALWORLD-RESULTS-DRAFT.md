# Real-world validation — results section (draft v2)

**Status:** draft (S294), Chat-authored. Rebuilt against the S292 BANKED adjudications at source after v1 transcribed spec *expectations* instead of adjudicated *results* — v1's sensitivity claim was false at the root (it read CORPUS-01 as a caught positive; the engine missed it by design). This version reports the three adjudicated rows as adjudicated. Covers the Tier-1 Englund/Dryad corpus. Tier-2 (Geng) enters as cited corroboration in a later pass, gated on data access.

**Row order:** argument-ordered (locked S294 decision b) — leads on the strongest real-world detection (CORPUS-02, a retracted paper with an admitted manipulation the tool independently caught), then the disclosed by-design coverage gap (CORPUS-01), then the verdict-restraint / under-call case (CORPUS-03). Not the spec's calibration order; opening on strength earns the credibility that makes the disclosed gaps read as candour.

*Drafting notes are italic square-bracketed asides, not paper text.*

---

## Results

We ran the full detection battery against three published datasets, each carrying a localised defect independently identified and adjudicated by a third party (Markus Englund's copy-paste detector sweep; raw data public on Dryad; two of the three since corroborated by a retraction notice or PubPeer thread). None was constructed to exercise any part of the tool. They test what a constructed fixture suite cannot: whether the tool catches a real documented defect, and — the question reviewers press first — what *else* it flags on real, honest-but-structured data.

The honest one-line summary is that the tool caught what it was built to catch, missed one defect family by a known design limitation it discloses, under-called one for a nameable null-construction reason, and produced a characterised, mostly-benign false-positive surface on real biological structure. No row is a clean "flags nothing but the defect" result, and the section does not claim one.

*[Table: spec §5 schema, extended. "Detected / severity" separated where they diverge (CORPUS-03). Class column uses the spec's A/B/C protocol.]*

| Dataset | Documented defect | Tool's response | Class | Note |
|---|---|---|---|---|
| **CORPUS-02** — Mohammadi et al., *PLOS Genetics* 2022 (CTS resistance) — **RETRACTED June 2026** | Cross-species exact copy (bird↔snake rows) plus near-duplicate pairs sharing a terminal digit; retraction confirms an author admission that absorbance values were manually altered to reduce apparent replicate variance | **Exact copy caught (HIGH)** — rows matched one-to-one to the retraction's named block. **Variance manipulation independently caught** — Regional Noise Homogeneity MODERATE, localised to the source block, flagging anomalously *reduced* within-region spread. Near-duplicate pairs **missed** | **A** (exact copy) + **B1** (independent variance catch) + **C** (near-dupe gap) | The strongest real-world row: an independent catch of an *admitted* manipulation on a retracted paper, plus the disclosed near-dupe coverage gap |
| **CORPUS-01** — Sampson et al., *Cell* 2016 (Parkinson's model) | Two sequential 5-value blocks duplicated across groups that should be independent, plus a 3-value run in a third group | **Missed (LOW, p=1).** Exact Duplicate Detection and Constant-Offset Blocks both returned clear | **C** (false negative, by-design) | A disclosed coverage gap, not a calibration miss: the tool has no column-localised sequential-duplication detector (v1.x candidate). Independently confirmed present via PubPeer. The one HIGH on this dataset (Missing Data Pattern) is a benign false positive — see FP surface |
| **CORPUS-03** — Bierbach et al., *Nat Comms* 2017 (clonal fish) | Every unique fish-length (SL) value recurs exactly four times — a per-fish measurement scrambled across four observation rows by an ID-misalignment join error | **Detected but under-called to LOW (p=1.0).** Exact Duplicate Detection listed the exact recurring rows as evidence; a null-construction limitation suppressed the severity | **A** (detection) / limitation (severity) | Innocent cause (author-conceded join error) — the verdict-restraint anchor. Severity muted by a disclosed null limitation (below). Column roles declared, not unaided-inferred — see Methods |

### Summary statistics

**Sensitivity (detection).** Of the three documented defects, one was caught at flagging severity (CORPUS-02 exact copy), one was detected but under-called (CORPUS-03), and one was missed by a disclosed design gap (CORPUS-01 sequential duplication). We do not report a single caught/missed fraction, because detection and severity diverged on CORPUS-03 and because the CORPUS-01 miss is a known coverage boundary rather than a calibration failure. The defensible claim is the one the paper already commits to: *every expert-flagged item the engine was built to catch, it caught* — with the sequential-duplication family named as a disclosed gap the engine was not built to catch, and now a v1.x candidate.

**Independent detection (the strongest evidence).** On CORPUS-02, beyond confirming the documented copy, the tool independently flagged the admitted variance manipulation — Regional Noise Homogeneity localised to the manipulated block with a *reduced-spread* direction, the fingerprint of the admission ("readings manually altered to reduce apparent variance"). This is a genuine detection the third-party writeup's copy-paste focus did not target, on a paper now retracted. It is the corpus's clearest demonstration that the tool finds fabrication signal beyond the family it was pointed at.

**False-positive surface (the headline discipline number).** Across the two datasets that produced HIGH flags beyond the documented defect, every such flag was adjudicated at source against the data. All resolved to legitimate real-world structure (Class B2), none to a calibration error the tool should have avoided:

- *CORPUS-02, dose-response column-adjacency* (IRC / Autocorrelation / Windowed Autocorrelation): the eight columns are an ordered ouabain dose series, not independent replicates; adjacent dose steps on a smooth inhibition curve track each other legitimately. The engine has no ordered-dose assay shape and reads the columns as replicate wells.
- *CORPUS-02, decimal precision* (Decimal Precision Consistency): Excel trailing-zero truncation, uniform across all groups — an ordinary spreadsheet artifact, not concentrated in the duplicated rows.
- *CORPUS-02, multivariate outliers* (Mahalanobis Row + Blocked Mahalanobis): a condition-pooling artifact — the run resolved no condition column across ~90 species/genotype groups, so ordinary between-species variation reads as multivariate outliers. A structural limitation, cross-referenced to the role-inference gap.
- *CORPUS-01, missing-data pattern* (Missing Data Pattern HIGH): localises to a tight contiguous block of one column within one group — honest group-specific attrition, not a diffuse anomaly.

One CORPUS-02 flag (Selective Noise Partitioning HIGH) emitted no evidence in the output and cannot be adjudicated from the run alone; it is reported as **unresolved**, not counted as a false positive. The headline: the tool's real-world false-positive surface is small, every resolved instance traces to a nameable legitimate structure (dose-ordering, spreadsheet rounding, unmodelled grouping, honest attrition), and two of those (dose-ordering, unmodelled grouping) are structural limitations already on the v1.x roster.

**Coverage gaps (false negatives).** Two documented defect families were not caught, both disclosed as by-design boundaries, not calibration failures: CORPUS-01's column-localised sequential duplication (no such detector exists) and CORPUS-02's near-duplicate pairs sharing a terminal digit (the terminal-digit test operates on a whole-column distribution, not pairwise near-matches). Both are v1.x capability candidates.

### On CORPUS-02's cell-count discrepancy

Our per-table comparison of the retraction's named block identifies eight differing cells; the notice reports twelve. The loaded table was verified byte-identical to a fresh Dryad download, so the difference is not a data-version artifact. The most plausible account is that the notice's count spans a second sheet (an ATPase-activity comparison) our per-table run did not load. We report both figures and this boundary rather than reconcile them — the tool operates per table, and the discrepancy marks the edge of that scope, not a disagreement about the loaded data.

### On CORPUS-03's under-called severity (disclosed limitation)

CORPUS-03 is the clearest demonstration of the tool's verdict restraint and, simultaneously, its most instructive limitation. The engine detected the duplication — Exact Duplicate Detection listed the exact recurring rows as evidence — but rated it at the lowest severity (p=1.0). The cause is specific and known. That test's value-collision null is built from the empirical frequency distribution of the column's own values; a defect that makes every value recur exactly four times inflates that distribution, so the expected collision count rises to meet the observed count and the p-value collapses to 1.0. The defect is absorbed into its own baseline.

This exposes a false statement in our own method documentation. The value-collision null uses a parametric model for low-N integer data specifically to break this circularity, but routes continuous data to the empirical frequency null on the stated assumption that continuous data is not exposed to it. CORPUS-03's fish-length column — continuous, two-decimal, with structured four-fold recurrence — is a direct counterexample: a continuous column where the defect inflates its own null and suppresses the verdict. The documentation's scoping of this limitation to integer data is therefore incorrect, and the source comment asserting the continuous branch is safe is falsified. We disclose this rather than suppress it: the tool found the pattern; a calibration limitation, not a detection failure, muted the severity. The correction to the continuous-branch collision null is scheduled v1.x work.

*[Internal cross-references, not prose: METHODOLOGY §1.1 lines 283–285 (branch routing: "Continuous (dp>0): empirical HHI") and line 343 (the "Known limitation" scoped to integer data only, omitting the continuous branch — the falsified claim); V1X §2.6 (the consistency audit homing the fix). The owed source correction — duplicateDetection.js:134 comment (Code) + METHODOLOGY §1.1 (Chat) — must land so the paper's assertion agrees with source.]*

---

## Methods — declared column structure for CORPUS-03

The tool infers each column's role (identifier, condition, or data) from its shape. On CORPUS-03 this inference misclassified the fish-identifier column as a data column, because the identifier's values do not match the tool's expected identifier shape (a simple sequential run). Running the battery on the misclassified table produced flags that were collateral from comparing an identifier against unrelated measurements, obscuring the documented defect.

For this dataset we therefore declared the column roles explicitly rather than relying on unaided inference: the corpus run accepts a manifest in which a dataset names its columns' roles in the author's own vocabulary, and those declarations are stamped over the inferred roles for the named dataset only. CORPUS-03's manifest carries a single load-bearing declaration — that the fish-identifier column is an identifier, not data. The remaining columns infer correctly and were not declared.

We disclose this because it bears on how CORPUS-03's row should be read. The row demonstrates the tool's *detection and verdict-restraint* behaviour on a structured-duplication defect with an innocent cause; it does not demonstrate the tool's *unaided role inference*, which failed on this identifier shape and is the subject of scheduled v1.x work. The declaration is a disclosed intervention, recorded in the corpus provenance, not a silent correction. Its effect is confined to the one dataset: applied across the constructed fixture suite, the mechanism changes no output — no fixture carries a declaration, and the battery's results are byte-identical with the mechanism present.

*[The provenance record is the tracked CORPUS-03 hint declaration per locked Decision 2 — the declaration and the Dryad DOI, not the raw data. Path/ownership settled at commit: likely docs/shared/CORPUS-PROVENANCE.md (Chat-owned), not a corpus-data/ file (Code territory + gitignored for the raw data).]*

---

## Open items feeding this section (not paper text)

1. **CORPUS-01 row verification — DONE this pass.** Read at source (S292 BANKED): the documented defect was MISSED (Class C, by-design), not caught. v1's "caught positive" framing was corrected. The lone HIGH (Missing Data Pattern) is B2 benign attrition.
2. **FP-surface count — filled from source this pass.** Four B2 flags (three CORPUS-02, one CORPUS-01), one unresolved (Selective Noise), one B1 independent catch (Regional Noise). No number left as placeholder.
3. **Owed source correction** — continuous-branch HHI float-safe claim (duplicateDetection.js:134 comment, Code; METHODOLOGY §1.1 scope line, Chat). Must land so the paper's limitation assertion agrees with source. Recorded-claim correction only; null fix is V1X §2.6.
4. **Provenance commit** — track the CORPUS-03 declaration + Dryad DOIs (Decision 2); commit the currently-untracked REALWORLD-CORPUS-SPEC.md. Settle path/ownership before dispatch.
5. **CORPUS-02 8-vs-12** — reported both, second-sheet hypothesis stated as hypothesis (Decision 1). No reconciliation asserted.

# Real-World Corpus — Provenance Record

**Status:** S294. Owner: Chat. Tracked (docs/shared).
**Purpose:** The reproducibility record for the Tier-1 corpus run — data sources (public DOIs) and any declared column structure applied during the run. This is the reviewer-facing "declared how" answer for the paper's real-world results section; it records the *method* provenance, not the raw data (which is public at the DOIs below and is not redistributed in this repo).

Scope note: this is the human-readable provenance record. The runner-consumed manifest (`corpus-data/corpus-manifest.json`) is main-checkout workspace data, currently untracked; whether that machine manifest becomes tracked for byte-level reproducibility is a separate Code-side decision (carried, not settled here). Raw datasets are gitignored and obtained from the DOIs below.

---

## Tier-1 datasets (Englund / Dryad)

| ID | Paper | File | Dryad DOI |
|---|---|---|---|
| CORPUS-01 | Sampson et al., *Cell* (2016), Parkinson's model | `MouseTreatmentMotorFunction.xlsx` | `doi:10.5061/dryad.4mp6h` |
| CORPUS-02 | Mohammadi et al., *PLOS Genetics* (2022), CTS resistance — **retracted June 2026** | `NKA_Enzyme_Assays_Raw_Data.xlsx`, sheet "IC50" | `doi:10.5061/dryad.sqv9s4n68` |
| CORPUS-03 | Bierbach et al., *Nature Communications* (2017), clonal fish | `Bierbach et al clonal molly behav development_data for deposit.xlsx` | `doi:10.5061/dryad.td3sj` |

Each dataset was run through the full detection battery and adjudicated per the Class A/B/C protocol in `REALWORLD-CORPUS-SPEC.md`. Adjudicated results are in the paper's real-world results section; the run-level adjudication detail is in BANKED (S292 corpus section) and `SESSION292-CHAT-SUMMARY.md`.

---

## Declared column structure

The corpus runner accepts a per-file `conditionsHint` declaring column roles in the author's own vocabulary, stamped over the engine's inferred roles for declared columns of the named file only, after inference (wired S293, runner-only, engine untouched). The vocabulary maps to the engine's internal roles as: `identifier`/`index` → `label`; `condition` → `condition`; `data` → `data`. Legacy freeform-string hints are a no-op.

Only one dataset in this corpus carries a declaration:

**CORPUS-03 — one declaration:** `Fish.ID: identifier`.

This is the single load-bearing role declaration for the run. On CORPUS-03 the engine's unaided inference misclassified the `Fish.ID` column (a numeric identifier) as a data column, running the battery on the identifier alongside the real measurements and obscuring the documented defect. Declaring `Fish.ID` as an identifier removes it from the data set. The remaining columns infer correctly without declaration and were not declared (`Trt` infers as a condition, `Obs` as a label — verified at source; redundant declarations deliberately omitted).

**Disclosure consequence for the paper.** CORPUS-03's results row is produced with *declared*, not unaided-inferred, column roles. The paper's CORPUS-03 row carries a declared-structure footnote pointing here. The row demonstrates the tool's detection and verdict-restraint behaviour on a structured-duplication defect; it does not demonstrate unaided role inference, which failed on this dataset's identifier shape and is scheduled v1.x work (V1X §2.5, role/condition-inference discriminator-spine change).

**Batch inertness.** The declaration mechanism changes no fixture output: no fixture in the 23-set carries a declaration, so the override never fires and the full batch is byte-identical with the mechanism present. The declaration's effect is confined to the one corpus dataset that carries it.

---

## Not tracked here (and why)

- **Raw datasets** — public at the Dryad DOIs above; obtained from there, gitignored locally (`corpus-data/`), not redistributed in this repo. The DOI is the data-reproducibility path.
- **Machine manifest** (`corpus-data/corpus-manifest.json`) — main-checkout workspace data, untracked. Whether it becomes tracked for byte-level runner reproducibility is a Code-side decision (it lives in the runner's data path, not the docs/shared set). Carried, not settled in this record.

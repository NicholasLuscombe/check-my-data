# Role inference — does it invert a design, and how often

**Read-only.** No `src/` file was modified. The 27-fixture batch was not run and is not a gate here:
this is the structure-first classification pass, the direction of any fix is unknown until incidence
is measured, and a fix chosen from three opened files would be a fix chosen from three files.

**Instrument.** `test/probes/probe-s395-role-inversion.mjs`, run through
`test/probes/s395-corpus-run-hook.mjs`. The hook replaces `scripts/corpus-run.mjs`'s CLI tail — from
the `── Main ──` banner to EOF — with an export list, and touches nothing above it. So
`prepStructure` and `buildAnalysisConfig` in this record are **the census path's own source text
executed**, not a reconstruction. The hook throws if the anchor moves or is not unique, so a silent
no-op run is impossible.

```bash
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s395-role-inversion.mjs \
     --anchor --verify --part0 --part0x --part1 --part1x
```

## What this pass found

- **Part 0 — the census path reproduces the screen exactly, per column, on all three deposits.** 0
  header diffs, 0 role diffs. The instrument is proven against the recorded inventory on 199 files,
  270 sheets, 5,670 field cells, 0 mismatches.
- **Part 1 — every fixture with a documented design reproduces it, and not one column moved on any of
  the 27.** 15 of 15 fixtures whose design is stated in numbers reproduce it exactly; 2 derived and 7
  qualitative are consistent; 3 have no ground-truth row and none can be written. Zero columns held
  out as `attribute`, zero measurement columns scored `condition`, on any fixture. **This fires the
  dispatch's halt condition, so Part 2 did not run** and the incidence over the thirty is not
  measured. It is not known to be zero.
- **The inversion is two mechanisms in two passes**, and on pos-47 both fire. The five replicate
  columns become `condition` in the base pass because their 40-row sample is entirely the literal
  string `NA`; the two experimental factors become `attribute` in the §2.8 group pass because they
  are constant within `plot_id`. The numeric suffix and the shared header stem do no work — that
  logic does not exist in the source.
- **§1.3 measures why the fixture set cannot exercise the failure** rather than asserting it: §2.8
  runs on 25 of 27 fixtures and excludes nothing, and 0 of the 12 condition-role columns in the whole
  suite are numeric.

---

## Part 0 — does the instrument read the same surface the screens showed

### 0.1 — what role information survives the census path

`corpus-run.mjs --inventory` walks `parseExcel` → `prepStructure` → `buildAnalysisConfig` →
`extractAnalysisInputs`. Read at source:

- **`prepStructure` returns per-column roles.** `corpus-run.mjs:204-207` calls `inferBaseRoles`, then
  `detectGroupAttributes`, and returns the `roles` array — one entry per column — alongside the
  grouping provenance. The split is deliberate (`:201-203`) so provenance survives into the artefact.
- **The inventory artefact publishes counts only.** `inventorySheet` reduces that array to
  `roleCounts = { condition, label, data, attribute, ignore }` (`corpus-run.mjs:435-436`). Nothing
  per-column reaches `corpus-out/round2-inventory.json`.
- So the answer is **both**: per-column roles exist on the path and are discarded at the artefact
  boundary. A census needs to read them where they are computed, which is what the hook does. No
  instrument change was needed and none was made.
- **`dataColHeaders` is inert here, verified rather than assumed.** The identifier does not occur
  anywhere in `scripts/corpus-run.mjs`; `buildAnalysisConfig` (`:244-247`) does not set it, so
  `extractAnalysisInputs` receives `undefined` and `conditionContext.js:84`/`:115` fall back to
  `Condition N`. It carries no role information on any headless path.

### 0.2 — the instrument proved against the artefact

`--verify` recomputes the recorded round-2 inventory from the same 199 manifest entries and diffs
**every field of every sheet**, not a summary:

| quantity | value |
|---|---|
| files walked | 199 / 199 |
| sheets compared | 270 (the recorded artefact holds 270) |
| fields compared per sheet | 21 |
| field cells compared | 5,670 |
| mismatches | **0** |

Fields compared: `sheet`, `sheetIndex`, `sheetTotal`, `passed`, `error`, `rawRows`, `rawCols`,
`headerRows`, `nBlocks`, `detectBlocksSplit`, `validRows`, `nNumericDataCols`, `cellCount`,
`missingFraction`, `grouping`, `groupingPending`, `assay`, `dataType`, `zeroAsMissing`,
`longFormatDetected`, `roleCounts`.

### 0.3 — the three deposits, per column

Expected values were transcribed from the screen read into the probe **before it ran**
(`probe-s395-role-inversion.mjs`, the `SCREEN` block). `base` is `inferBaseRoles`' output before the
§2.8 group-attribute pass; `census` is the role the path finally assigns.

**pos-02 · `os_cells_new.csv` · 21 columns · 26,532 rows**

| # | header | base | census | screen |
|---|---|---|---|---|
| 1 | `collection_no` | Data | Data | Data |
| 2 | `genus2` | Label | Label | Label |
| 3 | `geoplate_rev_com` | Cond | Cond | Cond |
| 4 | `paleolatOld` | Data | **Attr** | Attr |
| 5 | `paleolngOld` | Data | **Attr** | Attr |
| 6 | `lat` | Data | **Attr** | Attr |
| 7 | `lng` | Data | **Attr** | Attr |
| 8 | `paleolng` | Data | **Attr** | Attr |
| 9 | `paleolat` | Data | **Attr** | Attr |
| 10 | `series` | Cond | Cond | Cond |
| 11 | `short` | Cond | Cond | Cond |
| 12 | `bottom` | Data | **Attr** | Attr |
| 13 | `mid` | Data | **Attr** | Attr |
| 14 | `top` | Data | **Attr** | Attr |
| 15 | `dur` | Data | **Attr** | Attr |
| 16 | `stg` | Data | **Attr** | Attr |
| 17 | `cell5` | Cond | Cond | Cond |
| 18 | `cell9` | Cond | Cond | Cond |
| 19 | `early_com_stage` | Cond | Cond | Cond |
| 20 | `bin` | Data | **Attr** | Attr |
| 21 | `formation` | Cond | Cond | Cond |

Counts Data 1 / Label 1 / Cond 7 / Attr 12. Rows 26,532 both surfaces. Assay `general`. **0 header
diffs, 0 role diffs.**

**pos-44 · `subset_dets.csv` · 12 columns · 52,948 rows**

| # | header | base | census | screen |
|---|---|---|---|---|
| 1 | `datetime` | Label | Label | Label |
| 2 | `Date` | Cond | Cond | Cond |
| 3 | `monthB` | Cond | Cond | Cond |
| 4 | `month` | Data | **Attr** | Attr |
| 5 | `year` | Data | **Attr** | Attr |
| 6 | `lon` | Data | **Attr** | Attr |
| 7 | `lat` | Data | **Attr** | Attr |
| 8 | `node` | Cond | Cond | Cond |
| 9 | `SFC` | Cond | Cond | Cond |
| 10 | `FishID` | Cond | Cond | Cond |
| 11 | `station` | Cond | Cond | Cond |
| 12 | `timediff` | Data | Data | Data |

Counts Data 1 / Label 1 / Cond 6 / Attr 4. Rows 52,948 both surfaces. Assay `general`. **0 header
diffs, 0 role diffs.**

**pos-47 · `seed-density.csv` · 11 columns · 760 rows**

| # | header | base | census | screen |
|---|---|---|---|---|
| 1 | `date` | Cond | Cond | Cond |
| 2 | `plot_id` | Label | Label | Label |
| 3 | `seed_density` | Data | **Attr** | Attr |
| 4 | `burial_treatment` | Data | **Attr** | Attr |
| 5 | `clam_code` | Cond | Cond | Cond |
| 6 | `shoot_count` | Data | Data | Data |
| 7 | `length_cm_1` | **Cond** | Cond | Cond |
| 8 | `length_cm_2` | **Cond** | Cond | Cond |
| 9 | `length_cm_3` | **Cond** | Cond | Cond |
| 10 | `length_cm_4` | **Cond** | Cond | Cond |
| 11 | `length_cm_5` | **Cond** | Cond | Cond |

Counts Data 1 / Label 1 / Cond 7 / Attr 2. Rows 760 both surfaces. Assay `densitometry` — the
auto-detection recorded on the screen reproduces headlessly. **0 header diffs, 0 role diffs.**

### 0.4 — verdict

**Exact on all three, per column.** Prediction 1 holds. Part 1 proceeds.

### 0.5 — two things the agreement already shows, and one it does not

- **The pos-47 inversion is two mechanisms, not one.** The five `length_cm_*` columns are already
  `Cond` at the **base** pass — `inferBaseRoles`, before §2.8 runs. `seed_density` and
  `burial_treatment` are `Data` at the base pass and are re-roled `Attr` by the **group-attribute**
  pass. The five replicates being scored `Cond` and the two factors being held out are separate
  events in separate passes of the same function. Attribution of the base-pass event is Part 1's
  work, not read off here.
- **`nNumericDataCols` and `sum.nDC` are the same number whenever the matrix is non-empty.**
  `extractAnalysisInputs` builds each matrix row as `dataCols.map(...)` (`engine.js:118-126`), so
  `matrix[0].length === dataCols.length === ` the count of `role === "data"`, which is exactly
  `summarize`'s `nDC` (`summary.js:4`). They can differ only when every row is filtered out and
  `matrix[0]?.length || 0` reads 0. **Within one prep** the two therefore agree on any sheet with a
  valid row. That is narrower than ROUND2-SPECIFICITY-SCREEN §14.2's open question, which is about
  two SURFACES: `sum.nDC` is computed on ImportView's own `data` and `roles`, so the preps have to
  agree before the counts do — and the next bullet is what that costs. §14.2's rule is unaffected
  either way: a refusal is established from the screen, never from an inventory figure.
- **What this does not establish: that the census path and ImportView are the same prep in general.**
  They are separate code and diverge in at least four places, read at source and none of which bit on
  these three files: ImportView drops all-blank data rows (`ImportView.jsx:188`) and `prepStructure`
  does not; ImportView's preamble strip and second empty-column drop run only on the multi-block path
  (`:201-210`, `loadBlock`) while `prepStructure` always runs them (`corpus-run.mjs:168-174`);
  ImportView's two-row-header branch uses a repeated-sub-header group walk and prefixes headers
  `group · name` (`:163-183`) where `prepStructure` forward-fills and does not (`corpus-run.mjs:188-196`), which
  changes the header text the keyword regex in `inferBaseRoles` sees; and a long-format detection on
  the UI opens the pivot modal and returns before roles are inferred at all (`:253-262`). All three
  deposits are single-block, single-header-row CSVs with `longFormatDetected: false`, so none of the
  four is reachable on them. **Parts 1 and 2 are measured on the census path.** Where a sheet is
  two-row-header, multi-block, or long-format, the screen may not read what this record reports, and
  that is stated per sheet in Part 2 rather than assumed away.

### 0.6 — attribution on the three, and prediction 3

`--part0x` prints the **inputs** each role decision reads — the 40-row sample's size and numeric
fraction, its distinct count, the full column's numeric fraction, and whether either header regex
matches — rather than restating the decision. One observed instance per file; nothing is derived from
it (see the halt in Part 1).

**pos-47, the base pass.** The five `length_cm_*` columns are `Cond` before §2.8 runs, and the reason
is measured:

| column | sample n | sample nf | sample distinct | full-column numeric | populated |
|---|---|---|---|---|---|
| `length_cm_1` | 40 | 0.00 | 1 | 0.32 | 1.00 |
| `length_cm_2` | 40 | 0.00 | 1 | 0.24 | 1.00 |
| `length_cm_3` | 40 | 0.00 | 1 | 0.18 | 1.00 |
| `length_cm_4` | 40 | 0.00 | 1 | 0.14 | 1.00 |
| `length_cm_5` | 40 | 0.00 | 1 | 0.10 | 1.00 |

Every cell in the first 40 rows of all five columns is the **literal string `NA`** — the sample's one
distinct value, counted 200 times across the five columns. So `inferBaseRoles` takes its `nf < 0.5`
branch, finds `uniq = 1 ≤ 20` and `uniq/n = 0.03 < 0.3`, and returns `condition`. The columns are
fully populated (`popFrac` 1.00); 10–32% of each column's values are real centimetre measurements
further down the file, which is where the summary panel's condition chips (`2.3 1.9 2.8 …`) come
from — `summarize` collects condition levels over every row, not the sample.

**Prediction 3 holds, and sharpens.** The mechanism is NA-dominance, and the two alternatives are
ruled out at source rather than by elimination: `inferBaseRoles` contains **no stem-matching and no
numeric-suffix logic of any kind**, and neither of its two header regexes matches `length_cm_N`. The
suffix and the shared stem are doing no work. What is doing the work is a 40-row sample that happens
to be entirely one non-numeric token.

**pos-47, the group pass.** One grouping: `plot_id` (80 levels over 760 rows) holds `seed_density`
and `burial_treatment` constant. Both are re-roled `attribute`. §2.8 is behaving exactly as specified
— a plot's seed density and burial treatment *are* constant within the plot — and the two columns it
holds out are the experiment's two factors.

**pos-02 inverts completely, and the shape is worth naming.** Twelve groupings fire; the first is
`collection_no` (1,149 levels over 26,532 rows) holding all twelve of `paleolatOld`, `paleolngOld`,
`lat`, `lng`, `paleolng`, `paleolat`, `bottom`, `mid`, `top`, `dur`, `stg`, `bin` constant. A column
is never its own attribute (`roles.js`, `consistent = attrCand.map(c => c !== g)`), so
`collection_no` survives as the sole `data` column — **the one surviving measurement column is the
grouping key that held the other twelve out.** It is a museum collection identifier.

**pos-44.** Five groupings; `Date` (2,191 levels) holds `month` and `year`, `monthB` (12 levels) holds
`month`, `station` (10 levels) holds `lon` and `lat`, and `lon`/`lat` hold each other. The surviving `data` column is `timediff`.
`FishID`, `station`, `node` and `SFC` are `Cond` by the `nf < 0.5` branch on text values
(`"FISH-01"`, `"Western Dry Rocks"`, `"pre-SFC"`), each with one distinct value in the first 40 rows.

---

## Part 1 — calibration against known designs

`node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s395-role-inversion.mjs --part1 --part1x`

### 1.1 — batch-prep parity, measured first

Part 2 would read the census path, but the fixtures are analysed by `validate-batch.mjs`, whose prep
is different code — `skipEmptyLines: true`, no `detectBlocks`, no preamble strip, no column padding,
headers taken as `raw[headerRows - 1]` with no `Col N` fallback. Both preps were run on all 27
fixtures and compared on headers and on every per-column role: **identical on all 27.** A Part 1
result that held on only one prep would not describe what the batch sees; this one describes both.

### 1.2 — the table

`census` is the assignment `prepStructure` produces. `GT class` records where the documented design
comes from: **stated** — the fixture's own `TEST-GROUND-TRUTH.md` row gives it in numbers;
**derived** — a sibling's row gives it and names this fixture as identical; **qualitative** — the row
describes the fabrication but names no counts; **no row** — no ground-truth row exists.

| ID | fixture | GT class | documented design | census assignment | reproduced |
|---|---|---|---|---|---|
| DS01 | `01-densitometry-clean.csv` | qualitative | densitometry, conditions Control / Inhibitor_A / Inhibitor_B, replicates Rep1–Rep4 | 12 Data (3 column-groups × Rep1–4), 1 Label `Residue`, 0 Cond, 0 Attr | yes |
| DS02 | `02-densitometry-fabricated.csv` | stated | "matrix columns 4–7" = Inhibitor_A's four replicates inside the matrix | 12 Data, 1 Label, 0 Attr | yes |
| DS03 | `03-qpcr-clean.csv` | qualitative | clean qPCR, Ct replicates | 3 Data `Ct_1–3`, 1 Cond `Group`, 2 Label `ID`/`Target` | yes |
| DS04 | `04-qpcr-fabricated.csv` | qualitative | same shape, fabricated | identical to DS03 | yes |
| DS05 | `05-cellcount-clean.csv` | qualitative | clean Poisson counts | 4 Data `Rep_A–D`, 1 Label `Position` | yes |
| DS06 | `06-cellcount-fabricated.csv` | qualitative | same shape, fabricated | identical to DS05 | yes |
| DS07 | `07-elisa-clean.csv` | qualitative | clean ELISA | 3 Data `Plate1–3`, 1 Label `Analyte` | yes |
| DS08 | `08-elisa-fabricated.csv` | stated | "all 65 rows and all three plates" | 3 Data, 1 Label, 65 rows | yes |
| DS09 | `09-proteomics-clean.csv` | derived | DS10's row: "Clean counterpart DS09 silent at identical geometry" | 6 Data `Rep1–6`, 1 Cond, 1 Label, 400 rows | yes |
| DS10 | `10-proteomics-fabricated.csv` | stated | "Rep1–5 flag … Rep6 γ-skipped"; Vehicle / Treatment; "a 200-row slice" | 6 Data, 1 Cond, 1 Label, 400 rows | yes |
| DS11 | `11-rnaseq-multicondition.csv` | stated | "500 genes × 3 conditions … = 1500 gene-condition rows paired by GeneID, 4 replicate columns" | 4 Data, 1 Cond `Condition`, 1 Label `GeneID`, 1500 rows | yes |
| DS12a | `12a-uniform-mixture-clean.csv` | stated | "same 400 rows × 6 replicate columns, same 200 rows per condition" | 6 Data, 1 Cond, 1 Label, 400 rows | yes |
| DS12b | `12b-uniform-mixture-fabricated.csv` | stated | "400 rows × 6 replicate columns" | 6 Data, 1 Cond, 1 Label, 400 rows | yes |
| DS13 | `13-vfstest-cellcountest.csv` | stated | "Single-condition cell counts" | 4 Data `Rep1–4`, **0 Cond**, 0 Label | yes |
| DS14 | `14-crctest-survey.csv` | stated | "Q1–Q6 are heterogeneous items, not replicates" | 6 Data `Q1–Q6`, 0 Cond, 0 Label | yes |
| DS15 | `15-missing-carlisle.csv` | stated | "6 DATA columns" (the row itself); no identifier column at all (CLAUDE.md, S351) | 6 Data `Rep1–6`, 1 Cond `COND`, **0 Label** | yes |
| DS16 | `16-densitometry-carlisle-overbalanced.csv` | qualitative | Carlisle over-balancing, groups × replicates | 18 Data (3 × Rep1–6), 1 Label `Feature` | yes |
| DS17 | `17-densitometry-carlisle-clean.csv` | derived | "same generator with Carlisle filter disabled" | identical to DS16 | yes |
| DS19 | `19-inheritance-fabricated.csv` | stated | "the pooled `value` column"; "each 600-row slice" | **1 Data** `value`, 1 Cond `COND`, 1 Label `ID`, 1200 rows | yes |
| DS20 | `20-bimodal-fab.csv` | stated | "2 cond × 150 rows × 8 Rep cols" | 8 Data, 1 Cond, 1 Label, 300 rows | yes |
| DS21 | `21-localised-ar.csv` | stated | "2 cond × 200 rows × 8 Rep cols" | 8 Data, 1 Cond, 1 Label, 400 rows | yes |
| DS22 | `22-covariance-block.csv` | stated | "2 cond × 200 rows × 7 Rep cols" | 7 Data, 1 Cond, 1 Label, 400 rows | yes |
| DS23 | `23-recurrence-null-mixed.csv` | stated | "Three columns, 120 rows, no condition column" | 3 Data, 0 Cond, 0 Label, 120 rows | yes |
| DS24 | `24-recurrence-null-control.csv` | stated | "Three columns, 120 rows, no condition column" | 3 Data, 0 Cond, 0 Label, 120 rows | yes |
| — | `vfs-a-pigeonhole-clear.csv` | no row | none, and none can be written (GT §Validation suite, S366) | 2 Data `m1`/`m2`, 1 Label `id` | unscoreable |
| — | `vfs-b-recurrence-high.csv` | no row | as above | 2 Data, 1 Label | unscoreable |
| — | `vfs-c-deeptail-high.csv` | no row | as above | 2 Data, 1 Label | unscoreable |

**Count. 15 of 15 fixtures whose design is stated in numbers reproduce it exactly** — every data
column count, every condition count, every row count. **2 of 2 derived reproduce.** **7 qualitative
are consistent** with their row and with the self-describing header. **3 are unscoreable** and always
will be, which is the ground-truth document's own permanent finding, not a gap in this pass.

**No column moved in any direction on any fixture. Not one.** Zero columns held out as `attribute`
across all 27; zero measurement columns scored `condition`; zero condition columns scored `data`.

### 1.3 — why the fixture set cannot exercise the failure, measured

The clean result above is not the same claim as "the inference is sound", and `--part1x` separates
them by reporting what each decision reads:

| quantity | value |
|---|---|
| fixtures reaching §2.8's row floor (`MIN_ROWS_FOR_GROUPING = 50`) | 25 / 27 |
| fixtures where §2.8 held **any** column out | **0 / 27** |
| condition-role columns across all 27 fixtures | 12 |
| … majority-numeric over the full column | **0** |
| … under half their rows populated | **0** |

All twelve condition columns are `Group`, `Condition`, `condition` or `COND`, are 0% numeric over the
whole column, and are fully populated. §2.8 runs on 25 of the 27 and excludes nothing, because no
fixture carries a numeric column that is constant within another column's levels. **Neither of the
two mechanisms observed in Part 0 has anything to bite on anywhere in the fixture set.**

### 1.4 — halt

**The 27 fixtures reproduce their documented designs exactly, so this pass stops here.** Part 2 does
not run. Prediction 2 holds, including its own reading of itself: this is a weak result, not a
reassuring one — §1.3 measures the fixture set's inability to exercise the failure rather than
asserting it, and that is P141's shape again.

The evidence for the inversion is therefore **one real file**, pos-47, plus two more that invert on
the group pass alone. Whether Part 2 should be a thirty-sheet census or a targeted read of those
three is a scoping decision, and it is not this pass's to make.

### 1.5 — what Part 2 would have answered and does not

Unanswered, and named so nobody reads silence as a zero:

- How many of the thirty carry any signature. **Not measured.**
- How many of those would still carry it on a sheet passing the import floor — the count that prices
  the risk. **Not measured. It is not known to be zero.**
- Whether extending to all 238 usable sheets is cheap. Not reported, because the question belongs to
  a census that did not run. (The one adjacent figure that *is* measured: `--verify` walked all 199
  acquired round-2 files and 270 sheets in **35 seconds**.)

---

## Two things that look obviously fixable, reported and not fixed

Per the dispatch: a fix chosen now would be chosen from the three files that happen to have been
opened, and incidence is unmeasured. Neither of these was acted on and no `src/` file was touched.

1. **`inferRoles`' `nf < 0.5` branch has no guard on what the populated values are.** A column whose
   40-row sample is entirely one non-numeric token is scored `condition` when it has ≤ 20 distinct
   values, regardless of what the rest of the column holds. On pos-47 that turns five replicate
   measurement columns into condition levels. The sample is 40 rows of a 760-row file.
2. **§2.8 holds out a column that is constant within a grouping key, and an experimental factor
   assigned at the level of that key is constant within it by construction.** On pos-47 `plot_id`
   holds `seed_density` and `burial_treatment`; on pos-02 the collection identifier holds every
   geographic and stratigraphic attribute, and survives as the only `data` column because a column is
   never its own attribute.

A third observation, adjacent and not acted on: **`19-inheritance-fabricated.csv` has one data column
by design** ("the pooled `value` column"), so the shipped import floor at `ImportView.jsx:974` would
refuse a batch fixture. That is ROUND2-SPECIFICITY-SCREEN §14.7's "whether the floor is correct as a
matter of design" question, with a fixture attached.

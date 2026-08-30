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

**Continued at S396 — Parts 2 and 3 are below and the halt is discharged.** Everything above is the
S395 record and stands as written, including §1.4's halt and §1.5's list of unanswered questions;
those questions are answered in Part 3 rather than by editing §1.5. Headline of the continuation:
**13 of the thirty's 27 floor-passing sheets are inverted, 53 of 221 on the usable set, and the three
deposits that refuse at the import floor refuse because of §2.8 rather than because they hold one
measurement.** The M1 predicate as §0.5 framed it needed correcting before it fired at all.

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

---

# S396 — Parts 2 and 3

**Read-only, as before.** No `src/` file was modified. The 27-fixture batch was not run and is not a
gate: nothing upstream of `runFullAnalysis` is exercised on any path here, and the batch asserts
severities and flags on 27 fixtures whose role assignment this pass measures directly instead.

**Instrument.** `test/probes/probe-s396-inversion-incidence.mjs`, run through the same
`test/probes/s395-corpus-run-hook.mjs`. Neither predicate is reimplemented: `inferBaseRoles` and
`detectGroupAttributes` are called and their inputs and outputs are read.

```bash
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s396-inversion-incidence.mjs \
     --pop thirty   --detail --m1cols --m2detail --refusal
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s396-inversion-incidence.mjs \
     --pop usable   --m1cols --refusal
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s396-inversion-incidence.mjs \
     --pop fixtures --detail
```

**§1.4's halt is discharged and §1.5's three questions are answered.** Those two sections are left
exactly as written — they are a true record of what S395 did and why it stopped.

## The M1 predicate, stated before it was applied — and corrected before it was believed

The base-pass branch is `nf < 0.5`, then `uniq <= 20 && uniq/n < 0.3 ? condition : label`.

> **A column carries mechanism 1 when its shipped base role is `condition`, the 40-row sample it was
> decided on has numeric fraction below 0.5, and the branch's own two tests evaluated on the FULL
> column do not return `condition`.**

**The first draft of this probe carried only the first of the two tests to the full column — `full nf
>= 0.5` — and read 0 on pos-47, the file the mechanism was named from.** pos-47's `length_cm_*`
columns are 68–90% the literal string `NA`, so even the whole column has `nf < 0.5`. **What the
40-row window misrepresents there is the DISTINCT COUNT, not the numeric fraction**: 1 distinct value
in the sample against 59–106 in the column. Correcting the predicate to carry both tests is what made
it fire.

That correction changes the census doc's own §0.5 framing. The dispatch called mechanism 1 "a
sampling error: the predicate is right about the window and the window is not the column". On pos-47
the window is *representative* of the numeric fraction and misrepresents only the distinct count —
and a fuller window returns `label`, not `data`. **Two sub-cases, and they cost different things:**

| | condition | what a full-column read would give | what it costs |
|---|---|---|---|
| **m1A** | full `nf >= 0.5` | the branch does not fire; the column is very likely `data` | a lost measurement column |
| **m1B** | full `nf < 0.5`, distinct test fails | `label` | nothing in the matrix — a **fabricated condition level**, and no more |

`inferBaseRoles` cannot be pointed at a full column: it slices to 40 rows. So those two tests are
restated in the probe. The **shipped-function corroboration** is a second call to `inferBaseRoles` on
a stride-sampled copy of the same rows — a different 40-row window, same code — reported separately
and never merged into the predicate.

The M2 predicate needs no restatement: `detectGroupAttributes` returns its own `groupings`
provenance, and the without-hold-out data-column count is obtained by reverting `attribute` to `data`
on the shipped roles. That revert equals the base-pass data count on **every sheet of all three
populations**, which is the check that it is a revert and not a re-derivation.

---

## Part 2 — reachability: does the census path speak for the screen

### 2.1 — the class list is S381's, not a private one

§0.5 named four divergences. **`docs/shared/S381-HARNESS-APP-DIVERGENCE.md` already censuses
thirty-three, of which twenty-five diverge**, and §0.5's four are a subset of them. This pass
classifies against S381's rows and adds nothing of its own:

| class | S381 row | what differs |
|---|---|---|
| `a_blankRowDrop` | 12 | ImportView drops rows with no filled cell before roles see them; `prepStructure` keeps them |
| `b1_preambleStripSingleBlock` | 7 | the `minCells0` leading-row loop runs on every file in the harness, only on the multi-block branch in the app |
| `b2_blankColDropMultiBlock` | 8 | the app drops all-empty columns inside `loadBlock`; the harness has no such step |
| `c_twoRowHeader` | 10, 11 | different `condPerCol` construction, and `"<group> · <name>"` header strings |
| `d_longFormat` | 13, 14 | the app returns to a pivot modal before inferring roles at all |
| `e_excelCsvRoundTrip` | 3 (then 4) | the app re-serialises `parseExcel`'s rows to CSV and re-parses them |
| `f_csvTrim` | 4 | the app parses `text.trim()`, the harness parses `text` |

**Two of these were not on §0.5's list of four** — rows 3 and 4 — and row 4 reaches **every CSV**, so
§0.5's "none of the four is reachable on them" understated the exposure on the three deposits it was
written about. Row 9 (header detection on the stripped versus un-stripped block) can only bite where
the preamble strip acts, and `b1` is 0 on every population, so it is covered rather than omitted.

### 2.2 — classified, and where possible measured

Classes `a`, `e` and `f` are **measured, not classified**: the divergence happens before the shared
prep, so ImportView's own raw matrix can be built and the shipped `prepStructure` run on it, then
`hdrs`, `roles`, `nH` and row count compared. Classes `b1`, `b2`, `c` and `d` happen *inside* the
prep and are classified only.

| class | thirty | usable (238) | fixtures (27) |
|---|---|---|---|
| `a_blankRowDrop` | 1 — **all inert** | 4 — **all inert** | 0 |
| `b1_preambleStripSingleBlock` | 0 | 0 | 0 |
| `b2_blankColDropMultiBlock` | 0 | 1 | 0 |
| `c_twoRowHeader` | 0 | 0 | 4 |
| `d_longFormat` | 0 | 7 | 1 |
| `e_excelCsvRoundTrip` | 8 — **all inert** | 80 — **all inert** | 0 |
| `f_csvTrim` | 22 — **all inert** | 158 — **all inert** | 27 — all inert |
| **on a divergent path** | **30 / 30** | **238 / 238** | **27 / 27** |
| **measured inert** | 30 | 230 | 22 |
| **DIVERGENT** | **0 / 30 (0.0%)** | **8 / 238 (3.4%)** | **5 / 27 (18.5%)** |

**Every sheet in every population is on a path the app does not take.** On the thirty, all thirty
differences are measured to change nothing about the roles. That is a stronger statement than "four
classes were unreachable", and it is the statement §0.5 could not make.

The eight divergent usable sheets are one `b2` (`pos-14 Rawdata_Figures_Tables_TSA.xlsx [Figure 1]`)
and seven `d_longFormat` — five sheets of `pos-18`'s two workbooks, `pos-32
cowpea_all_CCI_values.csv` and `pos-55 Sl_Year_Field_…_n6.csv`. **None is a selected sheet**, so no
member of the thirty is affected. On a long-format sheet the app does not infer roles at all; it
raises the pivot modal. There is no role assignment for the census to agree or disagree with, which
is why the class is unmeasurable rather than merely unmeasured.

**The fixtures are the divergent population, at 18.5%** — four two-row-header densitometry fixtures
and DS19, which `detectLongFormat` fires on. A batch fixture is not a screen read, so this costs
nothing today; it is recorded because §1.2's fixture table is a census-path reading and on five of
the 27 the screen would take a different route to it.

**Halt condition: not triggered.** 0.0% on the thirty, against the quarter that would have stopped
the pass.

---

## Part 3 — incidence

**Two populations, reported separately and never pooled.** Primary: the thirty selected sheets of
`ROUND2-RUN-LOG.md` §4, parsed from the table rather than transcribed. Secondary: the 238 usable
sheets of ROUND2-SPECIFICITY-SCREEN §12.4, re-derived from the inventory by its own predicate
(`passed && validRows > 0 && nNumericDataCols > 0`) and asserted to equal 238 before the walk runs.
The 27 batch fixtures are carried as a third column — a cross-check of S395 Part 1 under the
corrected predicates, not a population.

### 3.1 — the counts

| | thirty | usable (238) | fixtures (27) |
|---|---|---|---|
| carry mechanism 1 | **13** | **42** | 0 |
| … sub-case m1A (a lost measurement column) | 0 sheets, 0 cols | 2 sheets, **3 cols** | 0 |
| … sub-case m1B (a fabricated condition level) | 13 sheets, 22 cols | 42 sheets, 87 cols | 0 |
| carry mechanism 2 | **11** | **46** | 0 |
| carry both | 8 | 26 | 0 |
| carry neither | 14 | 176 | 27 |
| columns carrying M1 | 22 | 90 | 0 |
| columns held out by §2.8 | **87** | **291** | 0 |
| shipped 2nd window turns a `condition` into `data` | 0 sheets, 0 cols | 1 sheet, 2 cols | 0 |
| shipped 2nd window moves a `condition` at all | 12 sheets, 24 cols | 46 sheets, 93 cols | 0 |

### 3.2 — the number that prices arm B

| | thirty | usable (238) | fixtures (27) |
|---|---|---|---|
| pass the floor (`nDC >= 2` as shipped) | 27 / 30 | 221 / 238 | 26 / 27 |
| **… of those, inverted by either mechanism** | **13** | **53** | **0** |
| … M1 only / M2 only / both | 5 / 3 / 5 | 14 / 18 / 21 | 0 / 0 / 0 |
| … losing at least one DATA column | 8 | 39 | 0 |
| … gaining a fabricated condition level only | 5 | 14 | 0 |
| **inverted INTO refusal** (`>= 2` without, `< 2` with) | **3** | **7** | 0 |
| … of which §2.8 alone is the cause | **3 of 3** | **7 of 7** | — |

**The floor-passing inverted count is not zero on either population. It is 13 of 27 on the thirty and
53 of 221 usable.** Roughly half the thirty's floor-passing sheets, and roughly a quarter of the
usable ones.

**Read the decomposition before the headline.** Of the thirty's 13, only 8 lose a data column; the
other 5 gain a fabricated condition level and keep every measurement. The 8 are all M2 — **on the
thirty, mechanism 1 costs zero data columns**, because all 22 of its columns are m1B and the shipped
second window turns none of them into `data`.

### 3.3 — inverted into refusal

**On the thirty the three sheets pushed below the import floor are exactly pos-02, pos-44 and pos-47
— the three opened at the shipped surface — and §2.8 is the cause of all three.** They do not refuse
because the deposit holds one measurement. They refuse because the group-attribute pass held the
measurements out.

| sheet | data cols shipped | without §2.8 | the grouping key |
|---|---|---|---|
| pos-02 `os_cells_new.csv` | 1 | 13 | `collection_no` (1,149 levels) holds twelve; eleven further keys fire |
| pos-44 `subset_dets.csv` | 1 | 5 | `Date` (2,191 levels) holds `month`/`year`; `station` holds `lon`/`lat` |
| pos-47 `seed-density.csv` | 1 | 3 | `plot_id` (80 levels) holds `seed_density`, `burial_treatment` |

Four more appear in the usable population and none is a selected sheet: `pos-18 Data_2021.xlsx
[Plant_Traits]` (`Native` holds `Origin`), `pos-30 parasitism_…csv` (`billet_ID`, 46 levels, holds
four billet measurements), `pos-43 OMG_sample_metadata_…csv` (`Col 1`, 5 levels, holds
`DNA_conc_ng_ul`) and `pos-55 FarmFieldYear…_1fs.csv` (eight weather keys each holding `Year`).

**ROUND2-SPECIFICITY-SCREEN §14.2's three candidates are confirmed as three on the thirty, and the
mechanism is named.** §14's rule is untouched: a refusal is still established from the screen, and
this is a measurement of why the screen refuses, not a substitute for reading it.

### 3.4 — what mechanism 1 actually costs

| M1 columns | thirty | usable |
|---|---|---|
| total | 22 | 90 |
| zero numeric content (`fullNf` = 0) | 14 | 64 |
| any numeric content (`fullNf` > 0) | 8 | 26 |
| majority-numeric (`fullNf >= 0.5`) | **0** | **3** |
| dominant non-numeric token is a missing marker | **5** | **16** |
| condition columns as shipped, for scale | 94 | 567 |

Most M1 columns are ordinary text categoricals — `Country`, `Species`, `Bat family`,
`CollectionDate`, `TimeDemo`, `formation` — where `condition` against `label` is a labelling
judgement and no measurement is lost either way. **The columns that matter are the ones whose
dominant non-numeric token is a missing marker**, counted against a stated list (`NA`, `na`, `N/A`,
`#N/A`, `NaN`, `NULL`, `None`, `.`, `-`, `--`, `missing`, `?`, `ND`, `n.d.`, `Inf`, `-Inf`). Five on
the thirty — all five are pos-47's `length_cm_*`. Sixteen across the usable population.

**The sharpest instance in the whole corpus is not on a selected sheet.** `pos-38
Clean_Capture_Effort_2017-2024.csv` scores `Hours` and `Minutes` as `condition` while both columns
are **78% numeric** with `NA` at 22%; the shipped second window returns `data` for both. Those are
the only two columns anywhere in 238 sheets that a different 40-row window recovers as measurements.
The third m1A column, `pos-55 FarmFieldYear…_1fs.csv`'s `SQR_mean` at `fullNf` 0.52, reads `label` on
the second window and is not recovered.

### 3.5 — predictions, scored

**1. "Mechanism 2 is the more common of the two." Split, and the unit decides it.** By **columns** M2
leads on both populations and by a wide margin — 87 against 22 on the thirty, 291 against 90 on the
usable set, roughly 4× and 3×. By **sheets** it is close and it inverts: M1 leads on the thirty (13
against 11) and M2 leads on the usable set (46 against 42), both by two to four sheets. The tidier
story is right about magnitude and wrong about frequency on the primary population. Stating which
unit is meant is not optional here.

**2. "The divergent class is not empty." Holds on two populations of three, and the primary one is
the exception.** 8 of 238 usable and 5 of 27 fixtures; **0 of 30 on the thirty.** The prediction's
reasoning — seven multi-sheet workbooks and 199 real files — was right about the corpus and did not
reach the selected sheets, because §6.2 selects the largest sheet and long-format sheets are not it.
Structurally the class is never empty: **every sheet of every population is on a divergent path**;
what varies is whether the difference could be measured and was inert.

**3. No prediction on the floor-passing inverted count.** Measured: 13 of 27 on the thirty, 53 of 221
usable. Not zero on either.

### 3.6 — what this does not settle

- **Whether either mechanism is wrong as a matter of design.** §2.8 is doing what its specification
  says on all 291 columns; that a plot-level treatment is constant within the plot is the
  specification, not a bug in it. Both candidate fixes remain reported and unmade.
- **What a corrected role assignment would do to any verdict.** Nothing here runs a test. The
  floor-passing inverted count says the battery would run on a different matrix, not what it would
  find.
- **The seven long-format usable sheets.** The app raises a pivot modal and infers no roles, so those
  sheets have no screen-side assignment to compare against, on any instrument.
- **Whether the `b2` sheet's roles move.** One sheet, `pos-14 [Figure 1]`, classified and not
  measured — the divergence is inside the prep.
- **`fullUniq` above 5,000** is reported capped; no M1 column in either population came near it.

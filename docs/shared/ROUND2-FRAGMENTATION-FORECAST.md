# Will the round-2 sitting measure a starved battery? A fragmentation forecast

**No round-2 verdict was computed.** No `runFullAnalysis`, no flag, no severity, no `computeSeverity`
on any round-2 deposit. This stops where §6.2's own selection path stops — at
`extractAnalysisInputs` — and every number below is structural.

**No round-1 or round-2 deposit is characterised as fabricated or honest.** Round 1 appears only as a
corpus with both structure and measured coverage available.

**Read-only on `src/`.** Nothing was modified. The one thing this probe supplies that
`corpus-run.mjs` does not is the `colRelationship` value — a shipped parameter of
`extractAnalysisInputs` and the first gate the sitting asks. The batch is not a gate: no `src/`
change, nothing rendered, no preview.

**Instrument.** `test/probes/probe-s394-fragmentation.mjs`, through the same load-time hook
`test/probes/s395-corpus-run-hook.mjs`. The condition structure is read off the **shipped** `condCtx`
— `slices()`, `rowGroupsStatus()`, and the `groupingTrigger` that `extractAnalysisInputs` stamps on —
never re-derived.

```bash
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s394-fragmentation.mjs --source
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s394-fragmentation.mjs \
     --pop thirty --structure --roles corpus-out/s394-thirty-roles.json
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s394-fragmentation.mjs \
     --pop round1 --calibrate --stage1 <sensitivity artifact>
node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s394-fragmentation.mjs --forecast
```

## The answer, in short

**The thirty are far more fragmented than round 1 at the partition level** — 87.6% of their groups are
discarded before any test sees them, against 37.8% in round 1 — **but the groups that survive are not
uniformly thin**, because the discard is exactly what removes the fragments. Only 3 of 30 land in the
thin band.

**So the forecast does not say the sitting would measure a starved battery under arm A's defaults.**
Forecast coverage under `replicates` is median **21** of 29 tests across the thirty, against round 1's
measured median of **20** on the comparable subset. The distributions overlap almost entirely.

**Five of the thirty cannot be forecast at all** and two of those are the interesting ones:
`pos-31 MC_Drosophila_hydei.xlsx` partitions into 486 groups of which **every single one is a
singleton**, leaving `slices()` with **zero groups** — a state round 1 has five instances of and for
which no calibration band exists. Four more land in a band round 1's controlled subset never
populates.

**The `conditions` answer removes the row fragmentation on 27 of 30 and replaces it with something
the calibration cannot speak to at all:** every group becomes one column wide, and no round-1 sheet
has a one-column group. That forecast is reported and should not be used.

**No pass/fail threshold is declared here.** Both distributions are reported and the pass stops.

---

## Part 1 — fragmentation of the thirty, from structure alone

### 1.1 — how a condition is actually formed, read at source

`extractAnalysisInputs` builds the row-condition label as

```js
const parts=condCols.map(ci=>row[ci]!=null&&String(row[ci]).trim()?String(row[ci]).trim():null).filter(Boolean);
return parts.join(" | ")||null;
```

**All condition columns merge into one label per row.** The levels are therefore the **distinct
observed combinations** — a cross-product restricted to what actually occurs, neither a single factor
nor the product of the cardinalities. `.filter(Boolean)` drops a blank part, so **two rows differing
only in which condition column is blank land in different groups.** Getting this wrong would make
every number below meaningless, which is why it is read first.

`conditionContext.js` then chooses the type:

```js
if (hasGroups)                                        { type = 'column-grouped'; paired = true;  }
else if (isConditionsMode && matrix[0]?.length >= 2)   { type = 'column-grouped'; paired = false; }
else if (hasRowConds)                                  { type = 'row-grouped';    paired = false; }
else                                                   { type = 'none';           paired = false; }
```

Under `conditions` with two or more data columns the sheet is claimed column-grouped and **each data
column becomes its own condition**; `slices()` returns one single-column sub-matrix per data column
with at least three non-null rows. `engine.js` passes an **empty** `condColSet` on the column-grouped
branch, so the grouping trigger reads `attempted:false` — but `rowGroups()` and `rowGroupsStatus()`
still partition by row condition, because their guard is `hasGroups || !hasRowConds`. **One context,
two different partitions.**

### 1.2 — the thresholds the code itself uses

Read from source with anchors that throw if they move; `MIN_PER_GROUP` and `THIN_MEDIAN` are
module-private and cannot be imported.

| constant | value | file | what it gates |
|---|---|---|---|
| `MIN_PER_GROUP` | **3** | `groupingTrigger.js` | a group is "usable" at ≥ this many rows |
| `THIN_MEDIAN` | **4** | `groupingTrigger.js` | arm 2 fires when the median group size is ≤ this |
| `slices()` row filter | **3** | `conditionContext.js` | a row-grouped slice needs ≥ 3 rows to exist at all |
| `MIN_GROUP_ROWS` | 4 | `aggregation.js` | column-group drop rule |
| `MIN_GROUP_COLUMNS` | 2 | `aggregation.js` | column-group drop rule |
| `MIN_ROWS_FOR_GROUPING` | 50 | `roles.js` | **§2.8's group-attribute pass. A different pass, a different question. It does not carry over and is not used below.** |

**The `slices()` filter is why two partitions have to be reported and not one.** It discards every
group under three rows before a test sees anything, so a singleton count taken from the survivors is
structurally zero. The first run of this probe made exactly that error and reported `n=1: 0` on every
sheet. The tables below give the **full partition** (from `rowGroupsStatus`, singletons included) and
the **surviving slices** side by side.

### 1.3 — the thirty under `replicates` (arm A's hardcoded defaults, row semantics `ordered`)

| sheet | full partition: groups / min / median / n=1 / <3 | surviving: groups / dropped / median / width | thin |
|---|---|---|---|
| `pos-01 micro_data_compiled.xlsx` | no condition column | 1 / — / 16 / 15 | |
| `pos-02 os_cells_new.csv` | 383 / 11 / 33 / 0 / 0 | 383 / 0 / 33 / 1 | |
| `pos-03 OpilionesChemicalCues_v2` | 100 / 1 / 1 / 59 / 93 | 7 / **93** / 3 / 2 | **THIN** |
| `pos-07 data_complete.csv` | 122 / 1 / 1 / 83 / 100 | 22 / **100** / 3 / 74 | **THIN** |
| `pos-08 ECS-SA_(Affinity).xlsx` | 107 / 1 / 1 / 103 / 103 | 4 / **103** / 110.5 / 15 | |
| `pos-12 Non-target_OUTs.csv` | no condition column | 1 / — / 3420 / 15 | |
| `pos-14 Rawdata_Figures_Tables_TSA` | no condition column | 1 / — / 417 / 16 | |
| `pos-18 Data_2022.xlsx` | 24 / 6 / 6 / 0 / 0 | 24 / 0 / 6 / 147 | |
| `pos-21 FEMS_dryad_v2_published.xlsx` | 3 / 4 / 10 / 0 / 0 | 3 / 0 / 10 / 23 | |
| `pos-22 pgls_all_genera.csv` | 4 / 4 / 7.5 / 0 / 0 | 4 / 0 / 7.5 / 2 | |
| `pos-23 05_hydrodynamic_daily_outputs` | no condition column | 1 / — / 730 / 4 | |
| `pos-27 radMS_table_1.xlsx` | 9 / 2 / 7 / 0 / 2 | 7 / 2 / 9 / 3 | |
| `pos-28 dominance_data.csv` | 108 / 1 / 5 / 7 / 21 | 87 / 21 / 5 / 4 | |
| `pos-30 ips_density_Goundar_et_al` | 8 / 4 / 6 / 0 / 0 | 8 / 0 / 6 / 6 | |
| **`pos-31 MC_Drosophila_hydei.xlsx`** | **486 / 1 / 1 / 486 / 486** | **0 / 486 / — / —** | |
| `pos-32 XLarge_All_Pod_Inference_data` | 31 / 6 / 1227 / 0 / 0 | 31 / 0 / 1227 / 10 | |
| `pos-34 Sperm_morphological_data.csv` | 74 / 10 / 15 / 0 / 0 | 74 / 0 / 15 / 7 | |
| `pos-35 AgeRelatedChangesInAcousticCues` | 2 / 34 / 42 / 0 / 0 | 2 / 0 / 42 / 27 | |
| `pos-38 Nightly_Capture_Rates_Spp` | 4 / 18 / 83.5 / 0 / 0 | 4 / 0 / 83.5 / 28 | |
| `pos-39 FIG3.xlsx` | 4 / 33 / 36.5 / 0 / 0 | 4 / 0 / 36.5 / 14 | |
| `pos-40 13._b_Planctomycetota_asv.csv` | 34 / 1 / 154.5 / 1 / 1 | 33 / 1 / 155 / 416 | |
| `pos-41 SNPeffect_BSLMM_allvar.csv` | no condition column | 1 / — / 109228 / 27 | |
| `pos-43 Isoodon_data_raw_only.csv` | 167 / 1 / 1 / 93 / 123 | 44 / **123** / 5.5 / 70 | |
| **`pos-44 subset_dets.csv`** | **35618 / 1 / 1 / 23675 / 31815** | 3803 / **31815** / 3 / 1 | **THIN** |
| `pos-45 FF_blank.csv` | no condition column | 1 / — / 101 / 102 | |
| `pos-46 full_chemistry_wMeta.csv` | 20 / 5 / 12.5 / 0 / 0 | 20 / 0 / 12.5 / 15 | |
| `pos-47 seed-density.csv` | 261 / 1 / 1 / 238 / 243 | 18 / **243** / 30.5 / 1 | |
| `pos-49 data_R.csv` | no condition column | 1 / — / 1857 / 5 | |
| `pos-50 Assemblies_and_species.tsv` | 21 / 1 / 2 / 8 / 13 | 8 / 13 / 9.5 / 3 | |
| `pos-51 Pieris_phenotype.csv` | 114 / 1 / 3 / 20 / 40 | 74 / 40 / 5 / 9 | |

| | the thirty | round 1 (122 importing) |
|---|---|---|
| no condition column (`type: none`) | 7 (23%) | 56 (46%) |
| with a row partition | 23 | 51 |
| … any singleton group | **11 of 23 (48%)** | 11 of 51 (22%) |
| … any group below `MIN_PER_GROUP` | **12 of 23 (52%)** | 13 of 51 (25%) |
| … **groups dropped by the ≥ 3 filter** | **33,040 of 37,704 (87.6%)** | 627 of 1,660 (37.8%) |
| … sheets left with **zero** groups | 1 | 5 |
| grouping trigger already pending | **16 of 30 (53%)** | 27 of 122 (22%) |
| median surviving group size ≤ 4 (thin) | 3 of 30 | — |

**Prediction 1 holds at the partition and fails at the survivors.** The thirty discard 87.6% of their
groups against round 1's 37.8%, and twice the share of sheets carry singletons — that is the wide
margin the prediction expected. But the ≥ 3 filter removes precisely the fragments, so what reaches a
test is often not thin at all: only three of thirty have a thin surviving median, and the surviving
medians run smoothly from 3 to 109,228.

### 1.4 — the thirty under `conditions`

| | |
|---|---|
| `condCtx.type = column-grouped` | **27 of 30** |
| still row-grouped | **3** — `pos-02`, `pos-44`, `pos-47` |
| group **width**, median across sheets | **1** |
| median surviving group size ≤ 4 | 1 (`pos-44`) |
| grouping trigger pending | 3 (down from 16) |
| groups, median across sheets | 15 (up from 7) |

**Prediction 3 is half right, and the other half is the finding.** The `conditions` answer does
empty `condColSet` and does remove the row fragmentation — on 27 of 30. But it replaces it with
column fragmentation: **every group is one column wide**, which is not a pair, and the pair-based
tests are most of the battery.

**The three sheets that stay row-grouped are exactly `pos-02`, `pos-44` and `pos-47`** — the
one-data-column sheets from the census's refusal list. `isConditionsMode && matrix[0]?.length >= 2`
fails at one data column, so they fall through to the row-grouped branch and **the gate answer
changes nothing for them.**

### 1.5 — sheets whose condition structure owes something to an inverted column

Marks are taken from the census's own m1B list (`corpus-out/s394-thirty-roles.json`, produced by
`probe-s396-inversion-incidence.mjs --pop thirty --out`), not re-derived here. **13 of 30.**

| sheet | surviving groups | inverted condition columns (levels) | inverted share of all condition levels |
|---|---|---|---|
| `pos-02 os_cells_new.csv` | 383 | `geoplate_rev_com`(21), `cell5`(45), `cell9`(72), `formation`(312) | **450 of 466** |
| `pos-07 data_complete.csv` | 22 | `Country`(25), `Species`(54) | 79 of 108 |
| `pos-08 ECS-SA_(Affinity).xlsx` | 4 | `Score Sequest HT`(104), `Abundance: 20:1 NR`(101) | 205 of 229 |
| `pos-28 dominance_data.csv` | 87 | `ID`(54) | 54 of 60 |
| **`pos-31 MC_Drosophila_hydei.xlsx`** | **0** | `TimeDemo`(52) | 52 of 93 |
| `pos-32 XLarge_All_Pod_Inference_data` | 31 | `Date`(31) | **31 of 31** |
| `pos-34 Sperm_morphological_data.csv` | 74 | `IndID`(74) | 74 of 93 |
| `pos-40 13._b_Planctomycetota_asv.csv` | 33 | `Family`(28) | 28 of 60 |
| `pos-43 Isoodon_data_raw_only.csv` | 44 | `skin`(69) | 69 of 95 |
| **`pos-44 subset_dets.csv`** | 3803 | `Date`(2191) | **2191 of 2224** |
| `pos-47 seed-density.csv` | 18 | `length_cm_1..5`(106, 101, 85, 68, 59) | 419 of 434 |
| `pos-50 Assemblies_and_species.tsv` | 8 | `Bat family`(21) | **21 of 21** |
| `pos-51 Pieris_phenotype.csv` | 74 | `CollectionDate`(44) | 44 of 65 |

On three of the thirteen the inverted column supplies the **entire** condition structure.

### 1.6 — prediction 2, checked before believing it

**Refuted. The middle is populated.** Across all 94 condition columns of the thirty:

| levels | 1 | 2 | 3–4 | 5–9 | 10–19 | 20–49 | 50–99 | 100–299 | 300–999 | 1000+ |
|---|---|---|---|---|---|---|---|---|---|---|
| columns | 5 | 20 | 27 | **10** | **7** | **10** | **9** | 4 | 1 | 1 |

A continuous right-skewed distribution with no gap, not two modes. Thirty-six columns sit between 5
and 99 levels. The surviving median group size is likewise a smooth ladder — 3, 3, 3, 5, 5, 5.5, 6,
6, 7.5, 9, 9.5, 10, 12.5, 15, 16, 30.5, 33, 36.5, 42, 83.5, 101, 110.5, 155, 417, 730, 1227, 1857,
3420, 109228. There is a **third** mode the prediction did not name: seven sheets have no condition
column at all.

---

## Part 2 — calibrate coverage against fragmentation, where running is allowed

### 2.1 — the base, and how `cov.ran` is obtained without a re-run

`classifyCoverage` returns `"ran"` iff the flag is HIGH, MODERATE or LOW (`coverage.js`,
`VERDICT_FLAGS`), and nothing else in that function can reclassify a verdict flag. So `cov.ran` is
derivable exactly from a recorded run's per-test flag array, and `corpus-out/s379-honest-run.json` —
41 round-1 sheets with a recorded run — is enough. **Cross-checked against this session's directly
measured `summarizeCoverage` on the three overlapping sheets: 3 of 3 agree** (`C07 :: Mastersheet`
23, `C14 :: Data` 22, `C20 :: Microcosm soil B` 18).

### 2.2 — the uncontrolled table is confounded, and the confounders dominate

| band | sheets | cov.ran min | median | max |
|---|---|---|---|---|
| median ≤ 4 (thin) | 8 | 4 | 16 | 18 |
| median 5–9 | 6 | 6 | 7.5 | 22 |
| median 10–19 | 2 | 23 | 23 | 23 |
| median 20–49 | 2 | 21 | 21.5 | 22 |
| median ≥ 50 | 2 | 24 | 24 | 24 |
| no conditions | 21 | **2** | 19 | **22** |

**Not monotone, and the reason is visible in the `no conditions` row**: those sheets have no
fragmentation at all and span cov.ran 2 to 22. Sheet size and data-column count cap coverage on their
own — `C15 :: Fig. 4` is three rows, `C22 :: Exp. ST` has one data column. **Fragmentation is not the
dominant driver of `cov.ran` in round 1**, and a fitted line here would have said otherwise.

### 2.3 — controlled, the relationship is monotone

Restricted to sheets where neither confounder can bind: ≥ 50 valid rows and ≥ 3 data columns.

| band | sheets | cov.ran min | median | max |
|---|---|---|---|---|
| **median ≤ 4 (thin)** | 6 | 16 | **17** | 18 |
| median 5–9 | 2 | 20 | **21** | 22 |
| median 10–19 | 2 | 23 | **23** | 23 |
| median ≥ 50 | 2 | 24 | **24** | 24 |
| no conditions | 12 | 18 | **20** | 22 |

**Thin groups cost about three tests against an ungrouped sheet (17 against 20) and about seven
against a well-grouped one (17 against 24).** The bands hold 2 to 12 sheets; two of them hold two.
That is what 41 sheets support and no more. **No round-1 sheet in the controlled set falls in the
20–49 band** — a gap that matters in Part 3.

### 2.4 — the mechanism, which is what actually transfers

Splitting on the two band columns separates two different things. A test starved by **fragmentation**
runs on an ungrouped sheet and stops when groups thin; a test that **needs conditions at all** is
not-applicable on both.

**Starved by fragmentation** — not-applicable on ≥ 80% of thin sheets but ≤ 50% of ungrouped ones:

| test | thin | ungrouped |
|---|---|---|
| Entropy / Zipf Analysis | 100% | 24% |
| Modality Test | 100% | 43% |
| **Selective Noise Partitioning** | **100%** | **5%** |

**Needs conditions at all** — not-applicable on ≥ 80% of both, so not a fragmentation effect:
Baseline Balance (100 / 100), Residual Spike Correlation (100 / 100), Row-Mean Runs (100 / 100),
Blocked Mahalanobis (100 / 81).

Two more sit between the cuts and belong to neither class cleanly: Column Goodness-of-Fit (100% thin,
62% ungrouped) and Mahalanobis Row Outlier (100% thin, 62% ungrouped).

**Selective Noise Partitioning is the cleanest case and it is the same test §2.8 caught.** There,
collapsing `C20 [soil B]`'s 37 condition levels to one turned it from `N/A:emptyInput` into HIGH.
Here it is not-applicable on 100% of thin sheets and on 5% of ungrouped ones. The mechanism named
from one sheet in the sensitivity record reproduces across round 1.

### 2.5 — the transfer problem, stated rather than solved

**Anything carried from round 1 to round 2 is an argument, not a rate.**

- The inversion rate runs **8.6% (round 1) → 24.0% (round 2 usable) → 48.1% (the thirty)**, a
  gradient tracking how each population was selected, not a property of deposited data.
- **Round 1 has zero fabricated-condition-only sheets** (`ROLE-INFERENCE-INVERSION-CENSUS.md` §3.2:
  every round-1 inversion loses a data column; none gains a condition level alone). **The very class
  driving this forecast is absent from the corpus calibrating it.**
- The controlled bands hold 2 to 12 sheets. A band of two cannot carry a point estimate.
- Round 1's calibration tops out at **140 surviving groups** and contains **no sheet with one-column
  groups at all**.

---

## Part 3 — the forecast

Each of the thirty is assigned a band from its own structure and mapped to round 1's controlled band
median, with the band's observed range beside it. `EXTRAP` marks a sheet with more surviving groups
than any calibration sheet; `NO CALIBRATION BAND` marks one whose band round 1's controlled subset
never populates.

### 3.1 — under `replicates`

**25 of 30 forecastable: min 17, median 21, max 24.** Histogram — 17: 3 · 20: 7 · 21: 8 · 23: 3 · 24: 4.

**Five cannot be forecast**, and they are named rather than dropped:

| sheet | why |
|---|---|
| **`pos-31 MC_Drosophila_hydei.xlsx`** | **zero surviving groups** — 486 partition groups, every one a singleton. No band exists. Round 1 has five sheets in this state and none is in the controlled subset. |
| `pos-02 os_cells_new.csv` | band 20–49, uncalibrated; also EXTRAP at 383 groups; one data column |
| `pos-35 AgeRelatedChangesInAcousticCues` | band 20–49, uncalibrated |
| `pos-39 FIG3.xlsx` | band 20–49, uncalibrated |
| `pos-47 seed-density.csv` | band 20–49, uncalibrated; one data column |

`pos-44 subset_dets.csv` forecasts at 17 and is marked EXTRAP — 3,803 surviving groups against a
calibration ceiling of 140.

### 3.2 — under `conditions`

**25 of 30 forecastable: min 17, median 24, max 24** — 23 of the 25 at 24.

**This forecast should not be used.** Every group under `conditions` is one column wide, and **no
round-1 sheet has a one-column group**, so the calibration has nothing to say about the configuration
it is being applied to. The bands are being read off group *height* while the thing that changed is
group *width*. It is reported because the dispatch asked for both configurations and because the
contrast is the point: **the column gate does not merely change the amount of fragmentation, it
changes what kind of object the battery is handed**, and this pass cannot forecast the second kind.

### 3.3 — the comparison, which is the output

| | min | median | max |
|---|---|---|---|
| **round 1, measured, all 41 recorded sheets** | 2 | 18 | 24 |
| **round 1, measured, controlled subset (24)** | 16 | **20** | 24 |
| **the thirty, forecast under `replicates` (25)** | 17 | **21** | 24 |
| the thirty, forecast under `conditions` (25) | 17 | 24 | 24 |

Round 1's controlled distribution: 16: 3 · 18: 4 · 19: 4 · 20: 3 · 21: 3 · 22: 3 · 23: 2 · 24: 2.

**Under arm A's defaults the forecast distribution sits on top of round 1's measured one, one test
higher at the median.** On this evidence the sitting would not be measuring a battery more starved
than the one round 1 already ran.

**No pass/fail threshold is declared.** Both distributions are above; the decision is not this pass's.

---

## What this does not settle

- **Whether the forecast transfers.** §2.5 is the limit and it is not solvable from round 1: the
  fabricated-condition-only class is absent from the calibrating corpus, and the inversion rate
  differs five-fold between the populations.
- **The five unforecastable deposits**, one of which (`pos-31`) is the starved case the whole question
  is about. Four sit in a band round 1's controlled subset never populates.
- **The `conditions` configuration**, which is uncalibrated in the dimension that changed.
- **Arm B's gate answers.** They do not exist yet. Both configurations are reported precisely because
  picking one would be inventing the answer to the sitting's first question.
- **What coverage costs in verdict terms.** `cov.ran` is not severity. The sensitivity record already
  found evidence moving without verdicts moving on round 1, and nothing here runs a test.
- **Whether `pos-31`'s zero-group state is reached at the shipped screen.** It is a structural read on
  the census path; ROUND2-SPECIFICITY-SCREEN §14.3 requires a refusal to be established from the
  screen, and no screen was opened here.

## Verification

- **No `src/` file was modified**; `git status` shows only the new document and the new probe.
- **No round-2 verdict was computed.** `runFullAnalysis`, `computeSeverity` and `detectVST` are not
  imported by this probe. The only engine entry point used is `extractAnalysisInputs`.
- **The thresholds are read from source with anchors that throw if they move**, not transcribed, and
  `MIN_ROWS_FOR_GROUPING = 50` is read specifically to record that it does *not* apply here.
- **The m1B marks come from the census's own artifact**, generated by `probe-s396-inversion-incidence.mjs`,
  not re-derived: 30 records, 13 sheets with M1, 22 columns, all m1B — matching §3.2 exactly.
- **`cov.ran` derivation cross-checked** against this session's measured `summarizeCoverage`: 3 of 3.
- **Two errors were caught and corrected in the open.** The first run reported `n=1: 0` on every sheet
  because `slices()` pre-filters at ≥ 3 rows and I was measuring survivors, not the partition; both
  are now reported. The `cov.ran` cross-check first found **0 of 0** overlaps because the two probes
  label sheets differently (`file.xlsx [Sheet]` against `file :: Sheet`) — the join now keys on
  `(path, sheet)`, which both carry.
- **The batch was not run and is not a gate**: no `src/` change, and nothing here reaches the engine's
  test dispatch. No rendering surface changed, so no preview. No dev server was running at session
  start and none was started.

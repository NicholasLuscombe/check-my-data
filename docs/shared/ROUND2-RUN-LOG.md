# Round 2 — run log

**Status:** opened S390. Owner: Chat. Tracked (`docs/shared`).
**Purpose:** the record the pre-registration requires — `ROUND2-SPECIFICITY-SCREEN.md` §3 (rejections
with reason and position), §6.1 (the enumeration source), §6.2 (the sheet), §7 (sheet position) and
§8.2 (provenance per gate).

**Write this as the enumeration walks, not afterwards.** A log filled in from memory at the end is not
the record §3 asks for.

---

## 1 — The enumeration source

Fill this in before walking position 1.

| | |
|---|---|
| **Search URL, verbatim** | `https://datadryad.org/api/v2/search`, then `?page=2` and `?page=3` |
| **Retrieval timestamp** | 2026-08-29, 15:36:00 JST |
| **Sort control label, as the interface names it** | none applied; the listing returns date-descending by default |
| **Date field it sorts on** | `publicationDate` — the most recent published version's date, per §9.2 |
| **Total results reported** | 72,099 (same figure from the web interface at `https://datadryad.org/search?q=`) |

**The URL is the enumeration.** Anyone reproducing this screen starts here, so it is copied from the
address bar rather than described. Swapping `https://datadryad.org/` for
`https://datadryad.org/api/v2/` returns the same set as JSON.

**The tracked copy is the only copy.** The fetch also wrote per-position `files-NN.json` and
`versions-NN.json` for all 60 into an untracked `round2-raw/` in the checkout root. Verified S390
before deletion: the five aggregate files are sha-256 identical between the two copies, and the tracked
manifest reproduces all 60 file records and all 60 version records with the version records embedded.
**The untracked directory was deleted.** What it held beyond the manifest was pagination envelopes,
which say nothing about any deposit — and a scratch copy that duplicates committed content but cannot
be re-derived identically is later mistaken for a source.

**If the interface cannot sort on first publication date**, stop and record what it does offer here.
That is a finding about §6.1, not something to work around.

**Version counts are API-sourced, and calibrated.** The `Versions` column below is
`/api/v2/datasets/<doi>/versions`, not `versionNumber` from the search listing. §9.4 names the dataset
page's version history as the source; this endpoint was validated against it on
`doi:10.5061/dryad.d2547d8b7`, whose page shows **one** published version while the listing reads
`versionNumber: 10` — the endpoint returned **1**. Across all 60 it returns 1 or 2 while `versionNumber`
reaches 13, so it is counting published versions rather than curation rounds. **Calibrated on one
deposit against the page; the other 59 are consistent with it and are not independent confirmation.**

---

## 2 — Tripwires

- **n = 30, fixed.** No deposit added after results are seen, none dropped.
- **Depth:** fewer than 10 eligible in the first 50 positions → stop and report the depth reached.
- **Nothing in the pre-registration moves.** A rule that turns out wrong is superseded in a new commit
  that says so.

---

## 3 — Enumeration log

Every position walked, accepted or rejected, in order.

| Position | DOI | First published | Versions | Outcome | Reason |
|---|---|---|---|---|---|
| 1 | doi:10.5061/dryad.fttdz0980 | 2026-08-28 | 2 | | |
| 2 | doi:10.5061/dryad.rv15dv4q9 | 2026-08-28 | 1 | | |
| 3 | doi:10.5061/dryad.4mw6m90r1 | 2026-08-28 | 2 | | |
| 4 | doi:10.5061/dryad.vdncjszbg | 2026-08-28 | 1 | rejected | under three columns |
| 5 | doi:10.5061/dryad.p5hqbzkz7 | 2026-08-28 | 1 | rejected | no tabular file in a considered format |
| 6 | doi:10.5061/dryad.wwpzgmt01 | 2026-08-28 | 1 | rejected | no tabular file in a considered format |
| 7 | doi:10.5061/dryad.hqbzkh1vv | 2026-08-28 | 1 | | |
| 8 | doi:10.5061/dryad.djh9w0wf0 | 2026-08-28 | 1 | | |
| 9 | doi:10.5061/dryad.s7h44j1pg | 2026-08-28 | 1 | rejected | no numeric matrix with replicate or condition structure |
| 10 | doi:10.5061/dryad.d2547d8b7 | 2026-08-28 | 1 | rejected | only considered file exceeds the 50 MiB import cap |
| 11 | doi:10.5061/dryad.2ngf1vj4r | 2026-08-28 | 1 | rejected | no tabular file in a considered format |
| 12 | doi:10.5061/dryad.d7wm37qh7 | 2026-08-27 | 1 | | |
| 13 | doi:10.5061/dryad.nk98sf85b | 2026-08-27 | 1 | rejected | only considered file exceeds the 50 MiB import cap |
| 14 | doi:10.5061/dryad.bvq83bkr6 | 2026-08-27 | 1 | | |
| 15 | doi:10.5061/dryad.80gb5mm5q | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 16 | doi:10.5061/dryad.fxpnvx18x | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 17 | doi:10.5061/dryad.6djh9w1hn | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 18 | doi:10.5061/dryad.g79cnp5vs | 2026-08-27 | 1 | | |
| 19 | doi:10.5061/dryad.w3r22817z | 2026-08-27 | 1 | rejected | no numeric matrix with replicate or condition structure |
| 20 | doi:10.5061/dryad.c59zw3rq0 | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 21 | doi:10.5061/dryad.m827p | 2026-08-27 | 2 | | |
| 22 | doi:10.5061/dryad.xsj3tx9vw | 2026-08-27 | 1 | | |
| 23 | doi:10.5061/dryad.6q573n6ff | 2026-08-27 | 1 | | |
| 24 | doi:10.5061/dryad.sn02v6xfg | 2026-08-27 | 1 | rejected | only considered file exceeds the 50 MiB import cap |
| 25 | doi:10.5061/dryad.wm37pvn3k | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 26 | doi:10.5061/dryad.z34tmpgws | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 27 | doi:10.5061/dryad.83bk3jb37 | 2026-08-27 | 2 | | |
| 28 | doi:10.5061/dryad.gtht76j3x | 2026-08-27 | 1 | | |
| 29 | doi:10.5061/dryad.3j9kd521j | 2026-08-27 | 1 | rejected | no numeric matrix with replicate or condition structure |
| 30 | doi:10.5061/dryad.qv9s4mwwc | 2026-08-27 | 1 | | |
| 31 | doi:10.5061/dryad.1vhhmgr9v | 2026-08-27 | 1 | | |
| 32 | doi:10.5061/dryad.9ghx3fg0p | 2026-08-27 | 1 | | |
| 33 | doi:10.5061/dryad.4mw6m90r5 | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 34 | doi:10.5061/dryad.m0cfxppgt | 2026-08-26 | 2 | | |
| 35 | doi:10.5061/dryad.4xgxd25s6 | 2026-08-26 | 1 | | |
| 36 | doi:10.5061/dryad.bvq83bkqp | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 37 | doi:10.5061/dryad.bk3j9kdr1 | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 38 | doi:10.5061/dryad.3tx95x6t7 | 2026-08-26 | 2 | | |
| 39 | doi:10.5061/dryad.280gb5n5c | 2026-08-26 | 1 | | |
| 40 | doi:10.5061/dryad.2280gb64c | 2026-08-26 | 1 | | |
| 41 | doi:10.5061/dryad.kprr4xhfb | 2026-08-26 | 1 | | |
| 42 | doi:10.5061/dryad.tx95x6bdd | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 43 | doi:10.5061/dryad.8gtht772x | 2026-08-26 | 1 | | |
| 44 | doi:10.5061/dryad.g4f4qrg50 | 2026-08-26 | 1 | | |
| 45 | doi:10.5061/dryad.hqbzkh1zw | 2026-08-26 | 2 | | |
| 46 | doi:10.5061/dryad.bzkh189qb | 2026-08-26 | 1 | | |
| 47 | doi:10.5061/dryad.cnp5hqcmx | 2026-08-26 | 1 | | |
| 48 | doi:10.5061/dryad.vt4b8gv7r | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 49 | doi:10.5061/dryad.3r2280gzk | 2026-08-26 | 1 | | |
| 50 | doi:10.5061/dryad.1rn8pk187 | 2026-08-26 | 1 | | |
| 51 | doi:10.5061/dryad.v15dv42cj | 2026-08-26 | 1 | | |
| 52 | doi:10.5061/dryad.h44j0zq2v | 2026-08-26 | 1 | | |
| 53 | doi:10.5061/dryad.zgmsbccv4 | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 54 | doi:10.5061/dryad.8gtht774v | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 55 | doi:10.5061/dryad.jm63xsjrt | 2026-08-26 | 1 | | |
| 56 | doi:10.5061/dryad.0k6djhbh0 | 2026-08-26 | 1 | | |
| 57 | doi:10.5061/dryad.280gb5n39 | 2026-08-25 | 2 | | |
| 58 | doi:10.5061/dryad.5dv41nsmd | 2026-08-25 | 1 | | |
| 59 | doi:10.5061/dryad.dbrv15fht | 2026-08-25 | 1 | rejected | no tabular file in a considered format |
| 60 | doi:10.5061/dryad.s1rn8pkq5 | 2026-08-25 | 1 | rejected | no tabular file in a considered format |

**Outcome** is `accepted` or `rejected`. **Reason** is required on every rejection and names the shape
test that failed — no tabular file in a considered format; imports with error; under three columns; no
numeric matrix with replicate or condition structure. **Never a reason drawn from content, subject,
author or journal.**

**The cap is two gates, and three is a lower bound.** Verified S390 at `1ad8faa`: 50 MiB, written as a
literal at `ImportView.jsx:298` on `file.size` and at `:215` on the decoded `text.length`. It sits
before the xlsx branch, so it covers csv, tsv and Excel alike, and it is a hard refusal with no
override. **Because `:215` measures the CSV re-serialisation of the chosen sheet, a workbook under
50 MiB on disk can still be refused** — xlsx is compressed and its serialised form is not.

**So the three cap rejections above were found from file size and are a floor, not a count.** Any
further one can only surface at import, and is recorded then.

**Why a cap rejection is a rejection rather than a single-armed run.** `BatchView` does not enforce the
cap (S381 row 1, confirmed S390), so an over-cap deposit would run on arm A and be refused on arm B.
§3 requires both arms on all 30, and a deposit that can carry only one cannot be scored.

---

## 4 — The thirty

One row per accepted deposit. Filled before either arm runs on it.

| # | DOI | File | Sheet | Sheet index / total | Column relationship | Row semantics | Confirm gate | Structural reason | Arm B run by | Polyfill assertion |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | doi:10.5061/dryad.fttdz0980 | micro_data_compiled.xlsx | 1300-3 | 7 / 7 | replicates (user-set) | arbitrary (user-set) — corrected from `unordered`; this file, §4.1 | gate did not render | Three spanning band labels over the 15 data columns, in bands of 5, 6 and 4 — `Anhydrous MORB glass`, `silicate part of the melt`, `Metals`. `detectHeaderRows` returned 1, so the band row was read as the header row and 12 of 16 headers are synthesised `Col N` placeholders; the grouping survives in no role, no `condPerCol` and no `condCtx`. **Neither gate answer is true of the file and §16 rules `replicates`** — the bands are unequal, so this is not one replicate set, and `conditions` would fabricate 15 levels where the file has 3. **Row order carries no meaning:** column 0 is a label column of element symbols and `TOTAL` is the last row, so the rows are a set being summed rather than a sequence — `arbitrary` (written `unordered` when the answer was made; this file, §4.1). **Confirm gate:** `computeTrigger` returns `pending: false`, both arms false, 0 condition columns (`S395-POS01-STRUCTURE.md` §9.1). Structure at §3–§4 of the same record. |  |  |
| 2 | doi:10.5061/dryad.rv15dv4q9 | os_cells_new.csv | os_cells_new.csv | 1 / 1 | gate did not render | gate did not render | gate did not render | 21 columns infer to 1 Data / 1 Label / 7 Cond / 12 Attr. **§2.8 is the sole cause**: without the group-attribute hold-out the sheet carries 13 data columns. `collection_no`, a museum collection identifier, survives as the only data column and is the grouping key holding twelve of the others out. Screen read 30 Aug: `Data cols 1`, no column-relationship card, no run zone, *"Assign at least 2 data columns to proceed."* An Anscombe transform was pre-selected `Auto` on the identifier. | **refused (`ImportView.jsx:974`)** | n/a — no run |
| 3 | doi:10.5061/dryad.4mw6m90r1 | OpilionesChemicalCues_v2(data).csv | OpilionesChemicalCues_v2(data).csv | 1 / 1 |  |  |  |  |  |  |
| 7 | doi:10.5061/dryad.hqbzkh1vv | data_complete.csv | data_complete.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 8 (user-set) | **Columns are variables** (§16.5): `REF` labels a published study and the 74 data columns are distinct quantities per study — `MAT`, `MAPv`, `MAP`, `Aridity_index_3_month`, and per-year columns `2015`–`2019`. §16 does not apply and the ordinary reason holds: the grouping sits in the eight condition columns the product already reads. **Row order is a compilation order** — `REF` is 210 distinct values over 210 rows and no column carries a date, run index or sequence, so the row axis has no forensic meaning. **Confirm gate:** pending on both arms, 10 condition columns pre-ticked... corrected: 8 — `Unit`, `Detrend_method`, `Country`, `Koppen-Geiger`, `Species`, `G_A`, `our_class_drought_resistance`, `niche_global`, every one a categorical descriptor of the study; ticked set examined and confirmed unchanged. **Open, and it does not move the answer:** columns 16–81 are rolled up in the S395 record, so whether the per-year naming scheme continues across those 66 headers is unread. §16.3's class count may need pos-07; `replicates` follows on either reading. |  |  |
| 8 | doi:10.5061/dryad.djh9w0wf0 | ECS-SA_(Affinity).xlsx | Protein-Peptide Info | 1 / 3 | replicates (user-set) | arbitrary (user-set) | confirmed with 2 unticked — 8 of 10 (user-set) | **`structure inexpressible`** — §16.5 member, naming scheme. Nine `Abundance: <ratio> <NR/R>: Sample` columns cross a loading ratio (20:1 … 120:1) with NR/R, and twelve `Found in Sample Group: [Sn] Fn: Sample` columns name the sample slots. **The grouping is in the header and the product reads none of it**, so §16.1 rules `replicates`; `conditions` would fabricate one level per column. **Rows are proteins** — `Accession`, `Description` with 1,016 distinct descriptions — the alphabetised-protein-list case METHODOLOGY names, so `arbitrary`. **Confirm gate:** pending on both arms, 10 condition columns pre-ticked, and two are not condition columns on the file's own structure — `Score Sequest HT: Sequest HT` is a score and `Abundance: 20:1 NR : Sample` is one of the nine abundance measurements read as a condition (P217). Both unticked; the remaining eight confirmed. `extractAnalysisInputs` drops 102 of 1,767 rows. |  |  |
| 12 | doi:10.5061/dryad.d7wm37qh7 | Non-target_OUTs.csv | Non-target_OUTs.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | gate did not render | **`structure inexpressible`** — §16.5 member, naming scheme. `OTUs` labels the row and the 15 data columns are `Y1B_01`–`_05`, `Y1Q_01`–`_05`, `Y3Q_01`–`_05`: **three groups of five written into the column names**, which the product reads as fifteen unrelated columns. §16.1 rules `replicates`; `conditions` would fabricate 15 levels where the file has 3. **Rows are OTUs**, 3,420 distinct over 3,420 rows — a taxon list with no sequence, so `arbitrary`. **Confirm gate:** `attempted` false, 0 condition columns, `computeTrigger` returns `pending: false` at the `groupingTrigger.js:85-86` early return. **Recorded, not acted on:** the assay detector returns `survey` and `dataType` `ordinal` on OTU counts. §16.1's no-reassignment rule covers the roles, and arm B does not answer the assay control. |  |  |
| 14 | doi:10.5061/dryad.bvq83bkr6 | Rawdata_Figures_Tables_TSA.xlsx | Figure 2 | 2 / 8 | replicates (user-set) | arbitrary (user-set) | gate did not render | **`structure inexpressible`** — §16.5 member, merged header cells. Four spanning labels over widths 4 / 3 / 3 / 3 — **unequal, so not one replicate set** — with `A)` `B)` `C)` `D)` marking the figure panels and two measurements repeated across them, `gammaH2Ax Mean Gray Value` and `Thresholded Mean Gray Value / Nucleus Area`. **`isSparseGroupRow(row0)` is true here and `detectHeaderRows` still returned 1**, failing at `isRepeatingSubHeader` (P222); 9 of 17 headers are synthesised `Col N` continuations. §16.1 rules `replicates`. **Rows are individual nuclei** from image analysis, missingness up to 325 of 419 within a panel, and no column carries a sequence — `arbitrary`. **Confirm gate:** `attempted` false, 0 condition columns, same early return. |  |  |
| 18 | doi:10.5061/dryad.g79cnp5vs | Data_2022.xlsx | Floral_M | 4 / 15 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 3 (user-set) | **Columns are variables** (§16.5): 147 data columns each name one plant species, alphabetical `Achillea_mellifolium` to `Zizia_aurea`, plus `Module`. §16 does not apply; the grouping sits in three condition columns the product reads. **Rows are 144 samples in a fully crossed design** — `Cluster` 4 × `Site` 3 × `Type` 2 = 24 groups of exactly 6, no singletons, nothing dropped by the 3-row filter. No column names a date, visit or run index, so the row axis is a listing — `arbitrary`. **Confirm gate: pending on arm 1 alone**, `condCols 3 >= 3` with arm 2 false. This is the case STATUS records as unmeasured on any corpus and as the one place confirming could still move a verdict. All three ticked columns are the design's own factors and the reproduced 4 × 3 × 2 partition says so; examined and confirmed unchanged. §2.8 moved 54 species columns to attribute. |  |  |
| 21 | doi:10.5061/dryad.m827p | FEMS_dryad_v2_published.xlsx | Data | 1 / 3 |  |  |  |  |  |  |
| 22 | doi:10.5061/dryad.xsj3tx9vw | pgls_all_genera.csv | pgls_all_genera.csv | 1 / 1 |  |  |  |  |  |  |
| 23 | doi:10.5061/dryad.6q573n6ff | 05_hydrodynamic_daily_outputs.csv | 05_hydrodynamic_daily_outputs.csv | 1 / 1 |  |  |  |  |  |  |
| 27 | doi:10.5061/dryad.83bk3jb37 | radMS_table_1.xlsx | Sheet1 | 1 / 1 |  |  |  |  |  |  |
| 28 | doi:10.5061/dryad.gtht76j3x | dominance_data.csv | dominance_data.csv | 1 / 1 |  |  |  |  |  |  |
| 30 | doi:10.5061/dryad.qv9s4mwwc | ips_density_Goundar_et_al_2026_Where_are_they_now.csv | ips_density_Goundar_et_al_2026_Where_are_they_now.csv | 1 / 1 |  |  |  |  |  |  |
| 31 | doi:10.5061/dryad.1vhhmgr9v | MC_Drosophila_hydei.xlsx | Males | 2 / 3 |  |  |  |  |  |  |
| 32 | doi:10.5061/dryad.9ghx3fg0p | XLarge_All_Pod_Inference_data.csv | XLarge_All_Pod_Inference_data.csv | 1 / 1 |  |  |  |  |  |  |
| 34 | doi:10.5061/dryad.m0cfxppgt | Sperm_morphological_data.csv | Sperm_morphological_data.csv | 1 / 1 |  |  |  |  |  |  |
| 35 | doi:10.5061/dryad.4xgxd25s6 | AgeRelatedChangesInAcousticCues_data.csv | AgeRelatedChangesInAcousticCues_data.csv | 1 / 1 |  |  |  |  |  |  |
| 38 | doi:10.5061/dryad.3tx95x6t7 | Nightly_Capture_Rates_Spp_Updated.csv | Nightly_Capture_Rates_Spp_Updated.csv | 1 / 1 |  |  |  |  |  |  |
| 39 | doi:10.5061/dryad.280gb5n5c | FIG3.xlsx | FIG3A | 2 / 5 |  |  |  |  |  |  |
| 40 | doi:10.5061/dryad.2280gb64c | 13._b_Planctomycetota_asv.csv | 13._b_Planctomycetota_asv.csv | 1 / 1 |  |  |  |  |  |  |
| 41 | doi:10.5061/dryad.kprr4xhfb | SNPeffect_BSLMM_allvar.csv | SNPeffect_BSLMM_allvar.csv | 1 / 1 |  |  |  |  |  |  |
| 43 | doi:10.5061/dryad.8gtht772x | Isoodon_data_raw_only.csv | Isoodon_data_raw_only.csv | 1 / 1 |  |  |  |  |  |  |
| 44 | doi:10.5061/dryad.g4f4qrg50 | subset_dets.csv | subset_dets.csv | 1 / 1 | gate did not render | gate did not render | gate did not render | 12 columns infer to 1 Data / 1 Label / 6 Cond / 4 Attr. **§2.8 is the sole cause**: without the hold-out the sheet carries 5 data columns — `Date` holds `month` and `year`, `station` holds `lon` and `lat`. `timediff` survives. `Non-numeric 8` against `Missing 0`: eight `NA` cells counted as non-numeric rather than missing, unresolved. Screen read 30 Aug, same page text. | **refused (`ImportView.jsx:974`)** | n/a — no run |
| 45 | doi:10.5061/dryad.hqbzkh1zw | FF_blank.csv | FF_blank.csv | 1 / 1 |  |  |  |  |  |  |
| 46 | doi:10.5061/dryad.bzkh189qb | full_chemistry_wMeta.csv | full_chemistry_wMeta.csv | 1 / 1 |  |  |  |  |  |  |
| 47 | doi:10.5061/dryad.cnp5hqcmx | seed-density.csv | seed-density.csv | 1 / 1 | gate did not render | gate did not render | gate did not render | 11 columns infer to 1 Data / 1 Label / 5 Cond / 2 Attr. **§2.8 is the sole cause**: without the hold-out the sheet carries 3 data columns — `plot_id` holds `seed_density` and `burial_treatment`, the two experimental factors. **Role inference is also contradicted by the file's own structure**: `length_cm_1`–`_5` are five replicate measurements scored `condition` (P217), their 40-row window being 200 cells of the literal `NA`. Measurement type auto-detected *Western Blot Densitometry* on a seagrass field experiment, which locked the data type, pre-selected Anscombe and auto-answered the row-semantics gate. Screen read 30 Aug, same page text. | **refused (`ImportView.jsx:974`)** | n/a — no run |
| 49 | doi:10.5061/dryad.3r2280gzk | data_R.csv | data_R.csv | 1 / 1 |  |  |  |  |  |  |
| 50 | doi:10.5061/dryad.1rn8pk187 | Assemblies_and_species.tsv | Assemblies_and_species.tsv | 1 / 1 |  |  |  |  |  |  |
| 51 | doi:10.5061/dryad.v15dv42cj | Pieris_phenotype.csv | Pieris_phenotype.csv | 1 / 1 |  |  |  |  |  |  |

- **Sheet** is chosen by §6.2 — largest cell count among sheets that pass, tie-broken on data columns,
  then rows, then file name, then sheet index.
- **Sheet index / total** is §7's requirement, and it is what makes the discarded alternative
  auditable. **The index is 1-based**, so the first sheet in a workbook reads 1.
  `round2-ranking.json` stores `sheetIndex` 0-based and this column adds one.
- **Column relationship** and **Row semantics** each carry the answer and its provenance word:
  `(user-set)` where you answered, `(assumed)` where the product supplied it. §8.2 — these are two
  separate gates and on C10 the product answered one of them by itself.
- **Structural reason** is why that answer follows from the file's own structure.
- **Confirm gate** is §13.3 — the ticked set confirmed with its provenance word, or `gate did not
  render`. The card pre-ticks every condition column, so accepting it unexamined is `(assumed)` and
  is a default taken at the third gate. **Where the surface refuses, all three gate cells read
  *gate did not render*** (§14.3), never blank.
- **Arm B run by** is `probe`, `hand-run` or `refused (<gate>)`. A hand-run names the control the
  probe could not drive, §8.1, and no deposit is dropped for needing one. **A refusal is §14.3 and is
  not a hand-run** — the product offers nothing to perform, so the gate cells read *gate did not
  render* rather than blank.
- **Polyfill assertion** is §8.3: `parseExcel` through the polyfill against `parseExcel` on a buffer
  read from disk. `pass`, or the deposit is not scored.

### 4.1 — Corrections

**Per §6.4 an answer is never overwritten. A correction is logged with its reason**, newest last,
one entry per correction. The original wording stays where it was written.

**A bare §-reference in this file points at `ROUND2-SPECIFICITY-SCREEN.md`, so this one is qualified
wherever it is cited.** §4.1 is this file's own section and the only one that needs saying.

**C1 — pos-01, row semantics. The word, not the answer. Logged S396.**

`unordered (user-set)` was written at `75e5be6`. **`unordered` is not a value this gate carries.**
`rowSemantics` is `ordered` or `arbitrary` — METHODOLOGY.md §Row Semantics Gate,
`src/import/rowSemantics.js`. The word came from nowhere in the product.

**The answer does not move.** The reason recorded at the time — column 0 is a label column of
element symbols, `TOTAL` is the last row, so the rows are a set being summed rather than a sequence
— is a reason for `arbitrary` and for no other value. What was wrong was the word standing in for
it.

**No arm had run on pos-01 when the answer was made and none has run since**, so §6.4's ordering
holds: this is not an answer revised against a result.

**`75e5be6`'s commit subject carries `unordered` permanently** and cannot be corrected. Anyone
reading `git log` will find it there, and STATUS's generated commit list copies it. That is history,
not a live record.

---

## 5 — Counts

**Do not keep a running total in prose here.** Counts are computed from the tables, because a written
count goes stale silently and the tables cannot.

```bash
command grep -cE '^\| [0-9]+ \| doi:.*\| rejected \|' docs/shared/ROUND2-RUN-LOG.md
command grep -cE '^\| [0-9]+ \| doi:.*\| accepted \|' docs/shared/ROUND2-RUN-LOG.md
command grep -cE '^\| [0-9]+ \| doi:.*\| \| \|$' docs/shared/ROUND2-RUN-LOG.md
```

The third command counts rows still undecided — outcome and reason both blank.

**The original commands searched the whole file and were wrong.** Measured S391: `-cE "rejected"`
returned **24** against 21 real rejections, matching three prose lines including the command quoting
itself; `-cE "accepted"` returned **4** when no deposit had been accepted. Both figures are plausible
on sight, which is why the error survived. **Match the table row, not the word.**

**Corrected again S392.** The tightened `| rejected |` still matched line 174 — the command quoting
itself — and returned **26** against 25 real rejections. The S391 fix moved the rule and left the
command one prose line short of it. **Anchoring to the DOI row is what cannot self-match**, which is
why all three commands above now carry `^| N | doi:`.

Positions walked is the highest number in §3's first column.

---

## 6 — Acquisition

**Route.** Dryad's per-file endpoint at `/api/v2/files/<id>/download` requires an OAuth2 bearer token
and answers 401 without one. An API account is self-serve: ORCID login, then the interface on the
*My account* page. Tokens last 10 hours. The whole-deposit bundle needs no token but moves 1,425 GiB
to obtain 247 MiB, and **"largest file per deposit" was rejected as a substitute** — §6.2 ranks on
valid rows × data columns and a 40 KB CSV can outrank a 4 MB one.

**Rate limit, measured S391.** 100 requests per hour per API account, resetting on the hour UTC.
Reported on every response as `ratelimit-limit`, `ratelimit-remaining` and `ratelimit-reset`, the last
a Unix timestamp. **No `Retry-After` header is sent**, so a client backing off blindly will keep
missing the window. Acquiring 199 files took three windows.

**What was fetched.** 199 considered files across the 39 standing deposits, 247.3 MiB, into
`corpus-data/round2/pos-NN/`. Each verified on size and then sha-256 against the manifest before being
written; nothing failing either check was kept. The receipt is `corpus-data/round2/round2-files.json`.
`corpus-data/` is gitignored — the manifest digests and the receipt make the set reproducible, so the
bytes are not tracked.

**Zero considered files exceed the 50 MiB cap.** The `ImportView.jsx:298` gate on `file.size` cannot
fire on this corpus. **The `:215` gate on decoded `text.length` still can**, because it measures the
CSV re-serialisation of the chosen sheet; §3's floor stands.

### 6.1 — Three facts about the manifest, verified S391

- **The 21 rejections recompute exactly.** From the tracked manifest, all 60 rows matching §3, under
  both readings of §6.2's format list — extension on `path`, and extension or tabular `mimeType`.
  §6.2 names formats without saying which field decides, and **that ambiguity has zero incidence**:
  both readings give the same 21 rejections and the same 39 standing. Recorded as measured, not
  resolved by choosing after the fact.
- **`storageSize` equals the sum of `files[].size` on 60 of 60.** Bundle cost and tabular payload are
  both derivable from the manifest without downloading anything.
- **No file carries `deleted` status.** 351 `copied`, 60 `created`, 411 total. Nothing was excluded on
  status grounds and no carried-forward deletion is in play.

### 6.2 — What §6.2's cell count is measured on

**`prepStructure` takes the first block when a sheet holds several** — `corpus-run.mjs:152–153`,
`detectBlocks(preprocessed)` then `blocks[0]`. So valid rows × data columns is the **first block's**,
not the sheet's, on any multi-block sheet. Round 1 saw `detectBlocks(…).length > 1` on 2 of 41 sheets.

**Stated, not fixed.** Changing it now would be a selection rule altered after the corpus was in hand.
The sheet inventory records blocks detected per sheet so the incidence is measurable.

**Measured S391, once the inventory existed.** Across **251 measured round-2 sheets, 5 take block 1 of
several** — and one of those discards **148 of 149 blocks**. On `C11.xls` (round 1, 34 sheets, run as
the shakedown), **13 of 31 measured sheets** took block 1 of several, the widest discarding 13 of 14.
**Low incidence, near-total loss per instance; either figure quoted alone misleads.**
`detectBlocksSplit` carries it per sheet, so a deposit whose selected sheet ranked on a fragment is
identifiable rather than assumed.


---

## 7 — Results

**One row per deposit. The measured cells are filled after both arms have run on it; the Notes cell may be filled earlier with structural facts known before the run.** §4 is the pre-run record by its own instruction and this is the post-run record. Keeping them apart is what stops a later reader asking whether an answer was written after a verdict was seen. **A structural fact written down before the run cannot be offered as an explanation after something fires**, which is why Notes is exempt and the severity, coverage and row-fraction cells are not. **§6.4 holds across both:** an answer is
instruction and this is the post-run record. Keeping them apart is what stops a later reader asking
whether an answer was written after a verdict was seen. **§6.4 holds across both:** an answer is
never revised after a run, and a correction is logged with its reason rather than overwritten.

**Rows are keyed on position and carry no DOI, deliberately.** §5's counting commands anchor on
`^| N | doi:` and have already been corrected twice for matching text they were never meant to
reach. A second DOI-led table in this file would break them a third time. **Do not add a DOI column
here** — §4 maps position to DOI and the position is the key throughout.

| # | Sev A | Sev B | Differs | cov.ran A | cov.ran B | Row frac A | Row frac B | Notes |
|---|---|---|---|---|---|---|---|---|

| 1 |  |  |  |  |  |  |  | **`structure inexpressible`** — 3 bands (5/6/4) lost at `detectHeaderRows`. **`TOTAL` row sits inside the analysed 16 × 15 matrix**, largest residual 2.91e-4 against the sum of the 15 rows above it; derived-or-reported undecided, unpriced. One blank raw row survives into `data` as index 0 and is dropped by `extractAnalysisInputs`. A methods caption in `A1` was stripped with the 3-row preamble. All recorded before either arm ran. |
| 2 |  | refused | arm B refused |  | no run |  | no run |  |
| 3 |  |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  | **`structure inexpressible`** — naming scheme, nine `Abundance:` sample columns. Recorded before either arm ran. |
| 12 |  |  |  |  |  |  |  | **`structure inexpressible`** — naming scheme, `Y1B`/`Y1Q`/`Y3Q`, five columns each. Recorded before either arm ran. |
| 14 |  |  |  |  |  |  |  | **`structure inexpressible`** — merged header cells, four panels of widths 4/3/3/3. Recorded before either arm ran. |
| 18 |  |  |  |  |  |  |  |  |
| 21 |  |  |  |  |  |  |  |  |
| 22 |  |  |  |  |  |  |  |  |
| 23 |  |  |  |  |  |  |  |  |
| 27 |  |  |  |  |  |  |  |  |
| 28 |  |  |  |  |  |  |  |  |
| 30 |  |  |  |  |  |  |  |  |
| 31 |  |  |  |  |  |  |  |  |
| 32 |  |  |  |  |  |  |  |  |
| 34 |  |  |  |  |  |  |  |  |
| 35 |  |  |  |  |  |  |  |  |
| 38 |  |  |  |  |  |  |  |  |
| 39 |  |  |  |  |  |  |  |  |
| 40 |  |  |  |  |  |  |  |  |
| 41 |  |  |  |  |  |  |  |  |
| 43 |  |  |  |  |  |  |  |  |
| 44 |  | refused | arm B refused |  | no run |  | no run |  |
| 45 |  |  |  |  |  |  |  |  |
| 46 |  |  |  |  |  |  |  |  |
| 47 |  | refused | arm B refused |  | no run |  | no run |  |
| 49 |  |  |  |  |  |  |  |  |
| 50 |  |  |  |  |  |  |  |  |
| 51 |  |  |  |  |  |  |  |  |

- **Sev A** and **Sev B** are the file verdict severities, 0 to 3. **On a refusal Sev B reads
  `refused`** (§14.3): arm A scores the sheet, arm B has no run, and the cost of the default on that
  deposit is the largest it can be.
- **Differs** answers §4's default-cost reading. `yes` or `no` on the severity comparison, and
  **`arm B refused` where there is no arm B to compare** — §14.4 requires that counted and named on
  its own line, never folded in, because a difference in kind is not a difference in degree.
- **cov.ran A / B** is §13.5, the count of tests that ran, per arm. On this class the arms can
  differ in coverage as well as in severity, and a severity difference cannot be separated from a
  coverage difference unless both are recorded. **On a refusal arm B reads `no run`**, which §14.4
  distinguishes from a run that assessed nothing.
- **Row frac A / B** is §15.2, the fraction of rows sitting in groups that survived `slices()`'s
  three-row filter. **`cov.ran` records how many tests ran, not how much of the file they saw.** A
  deposit reading clean on a quarter of its rows is not the same result as one reading clean on all
  of them, and without this field the two are indistinguishable here.
- **Notes** carries the structural reason for anything unusual — zero surviving groups (§15.3), a
  hand-run with its named control (§8.1), a sheet that ranked on one block of several.

**Per-test firing counts are not transcribed into this file.** §4's per-test malfunction reading
needs every test's flag on every deposit, which lives in the run artifacts. Record the artifact path
per arm and compute the tally from it at the end of the sitting. **A count typed twice is a count
that will disagree with itself**, which is what §5 says about rejections and the reason it keeps no
running total in prose.

**The refusal count is reported beside every arm-B figure** (§14.4). No figure is recomputed over
"the deposits that ran" — choosing a denominator after seeing results is the free choice §3 exists
to prevent.

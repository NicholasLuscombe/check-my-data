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
| 3 | doi:10.5061/dryad.4mw6m90r1 | OpilionesChemicalCues_v2(data).csv | OpilionesChemicalCues_v2(data).csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 4 (user-set) | **Columns are variables** (§16.5): seven columns naming distinct quantities about one harvestman — `Species`, `Leg_condition`, `Number_of_legs`, `Choice`. §16 does not apply and the grouping sits in condition columns the product reads. **Rows are individuals** — `Individual_ID` is 150 distinct over 150 rows — so the row axis is a listing and `arbitrary`. **Confirm gate:** pending on both arms, 4 condition columns — `Group` (31 levels), `Species`, `Leg_condition`, `Choice` — all low-cardinality categoricals, none a score, free identifier or measurement, so all four stand under §13.3 read shape-only. **Recorded because it is the case that rule decides:** `Choice` is plausibly the response of a choice assay rather than a factor, and settling that needs the paper, which §8.2's *decidable from a header list* standard excludes. **Also recorded:** `Individual_ID` is scored `data` at 150 distinct over 150 rows — a free identifier read as a measurement, and one of only two data columns. |  |  |
| 7 | doi:10.5061/dryad.hqbzkh1vv | data_complete.csv | data_complete.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 8 (user-set) | **`structure inexpressible`** — §16.7, **mixed**. The file is semicolon-delimited, 91 columns. Columns 0–16 are genuine variables: `REF` labels a published study, then `Unit`, `Detrend_method`, `Country`, `Koppen-Geiger`, `Species`, `MAT`, `MAPv`, `MAP` and two aridity indices. **Columns 17–86 are the years 1950 to 2019** — seventy columns carrying one quantity across a year axis written into the header, which the product reads as seventy unrelated data columns. That is pos-45's sweep beside pos-41's real variables, so §16.1 rules `replicates` and `conditions` would fabricate seventy levels. **Row order is a compilation order** — `REF` is 210 distinct values over 210 rows and no column carries a date, run index or sequence, so the row axis has no forensic meaning; the year axis runs sideways, not down. **Confirm gate:** pending on both arms, 8 condition columns pre-ticked — `Unit`, `Detrend_method`, `Country`, `Koppen-Geiger`, `Species`, `G_A`, `our_class_drought_resistance`, `niche_global`, every one a categorical descriptor of the study; ticked set examined and confirmed unchanged. **First recorded as columns-as-variables; corrected at §4.1 C2.** |  |  |
| 8 | doi:10.5061/dryad.djh9w0wf0 | ECS-SA_(Affinity).xlsx | Protein-Peptide Info | 1 / 3 | replicates (user-set) | arbitrary (user-set) | confirmed with 2 unticked — 8 of 10 (user-set) | **`structure inexpressible`** — §16.5 member, naming scheme. Nine `Abundance: <ratio> <NR/R>: Sample` columns cross a loading ratio (20:1 … 120:1) with NR/R, and twelve `Found in Sample Group: [Sn] Fn: Sample` columns name the sample slots. **The grouping is in the header and the product reads none of it**, so §16.1 rules `replicates`; `conditions` would fabricate one level per column. **Rows are proteins** — `Accession`, `Description` with 1,016 distinct descriptions — the alphabetised-protein-list case METHODOLOGY names, so `arbitrary`. **Confirm gate:** pending on both arms, 10 condition columns pre-ticked, and two are not condition columns on the file's own structure — `Score Sequest HT: Sequest HT` is a score and `Abundance: 20:1 NR : Sample` is one of the nine abundance measurements read as a condition (P217). Both unticked; the remaining eight confirmed. `extractAnalysisInputs` drops 102 of 1,767 rows. |  |  |
| 12 | doi:10.5061/dryad.d7wm37qh7 | Non-target_OUTs.csv | Non-target_OUTs.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | gate did not render | **`structure inexpressible`** — §16.5 member, naming scheme. `OTUs` labels the row and the 15 data columns are `Y1B_01`–`_05`, `Y1Q_01`–`_05`, `Y3Q_01`–`_05`: **three groups of five written into the column names**, which the product reads as fifteen unrelated columns. §16.1 rules `replicates`; `conditions` would fabricate 15 levels where the file has 3. **Rows are OTUs**, 3,420 distinct over 3,420 rows — a taxon list with no sequence, so `arbitrary`. **Confirm gate:** `attempted` false, 0 condition columns, `computeTrigger` returns `pending: false` at the `groupingTrigger.js:85-86` early return. **Recorded, not acted on:** the assay detector returns `survey` and `dataType` `ordinal` on OTU counts. §16.1's no-reassignment rule covers the roles, and arm B does not answer the assay control. |  |  |
| 14 | doi:10.5061/dryad.bvq83bkr6 | Rawdata_Figures_Tables_TSA.xlsx | Figure 2 | 2 / 8 | replicates (user-set) | arbitrary (user-set) | gate did not render | **`structure inexpressible`** — §16.5 member, merged header cells. Four spanning labels over widths 4 / 3 / 3 / 3 — **unequal, so not one replicate set** — with `A)` `B)` `C)` `D)` marking the figure panels and two measurements repeated across them, `gammaH2Ax Mean Gray Value` and `Thresholded Mean Gray Value / Nucleus Area`. **`isSparseGroupRow(row0)` is true here and `detectHeaderRows` still returned 1**, failing at `isRepeatingSubHeader` (P222); 9 of 17 headers are synthesised `Col N` continuations. §16.1 rules `replicates`. **Rows are individual nuclei** from image analysis, missingness up to 325 of 419 within a panel, and no column carries a sequence — `arbitrary`. **Confirm gate:** `attempted` false, 0 condition columns, same early return. |  |  |
| 18 | doi:10.5061/dryad.g79cnp5vs | Data_2022.xlsx | Floral_M | 4 / 15 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 3 (user-set) | **Columns are variables** (§16.5): 147 data columns each name one plant species, alphabetical `Achillea_mellifolium` to `Zizia_aurea`, plus `Module`. §16 does not apply; the grouping sits in three condition columns the product reads. **Rows are 144 samples in a fully crossed design** — `Cluster` 4 × `Site` 3 × `Type` 2 = 24 groups of exactly 6, no singletons, nothing dropped by the 3-row filter. No column names a date, visit or run index, so the row axis is a listing — `arbitrary`. **Confirm gate: pending on arm 1 alone**, `condCols 3 >= 3` with arm 2 false. This is the case STATUS records as unmeasured on any corpus and as the one place confirming could still move a verdict. All three ticked columns are the design's own factors and the reproduced 4 × 3 × 2 partition says so; examined and confirmed unchanged. §2.8 moved 54 species columns to attribute. |  |  |
| 21 | doi:10.5061/dryad.m827p | FEMS_dryad_v2_published.xlsx | Data | 1 / 3 | replicates (user-set) | arbitrary (user-set) | gate did not render | **Columns are variables** (§16.5): 23 soil and enzyme quantities per site — `PH`, `CON`, `ORC`, `HEX`, `BGL`, `AN`, `AMO`, `NIT`, `DON`, `FOS`, `AVP` — beside `Elevation`, `Latitude`, `Longitude` and `Aridity`. §16 does not apply. **Rows are 32 site-microsite records**, `Site` 16 distinct crossed with `Microsite` at 2 levels; no column carries a date or run index, so `arbitrary`. **Confirm gate:** `condCols 1`, both arms false, `pending: false` — the card does not render. **Neither inversion mechanism can operate here:** §2.8 did not look, returning at `roles.js:90` on 32 rows against `MIN_ROWS_FOR_GROUPING = 50`, and the 40-row window is the whole column on every one, so P217 cannot misrepresent this sheet. A non-instance by the floor, carrying no evidence about a longer version of the same design. |  |  |
| 22 | doi:10.5061/dryad.xsj3tx9vw | pgls_all_genera.csv | pgls_all_genera.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | gate did not render | **Columns are variables** (§16.5): `%occur` and `CBA` are two distinct quantities per genus, with `Type`, `Family` and `Genus` naming the row. §16 does not apply. **Rows are genera**, `Genus` 31 distinct over 31 rows, so the row axis is a listing — `arbitrary`. **Confirm gate:** `condCols 1`, both arms false, `pending: false`. **Smallest sheet of the thirty at 31 × 2**, and like pos-21 it is a non-instance for both inversion mechanisms: §2.8 did not look at 31 rows against the 50-row floor, and the window is the whole column. |  |  |
| 23 | doi:10.5061/dryad.6q573n6ff | 05_hydrodynamic_daily_outputs.csv | 05_hydrodynamic_daily_outputs.csv | 1 / 1 | replicates (user-set) | ordered (user-set) | gate did not render | **Columns are variables** (§16.5): `L1`, `H1`, `R1`, `R2` are four hydrodynamic quantities on a shared axis, with `date` labelling the row. §16 does not apply. **Row semantics is `ordered`, and this is the first of the thirty that is** — `date` holds 730 distinct values over 730 rows in a file named *daily outputs*, so the row index is a calendar sequence and carries exactly the forensic meaning the gate asks about. Arm A's hardcoded `ordered` agrees here by accident rather than by measurement. **Confirm gate:** `attempted` false, 0 condition columns, early return at `groupingTrigger.js:85-86`. **Open, recorded before any arm ran:** the prep arithmetic does not close — 2,199 raw rows less 1 skipped, 1 header and 734 trimmed leaves 1,463, against 730 surviving. The residue is close to a second block of the same height, which would put §6.2's cell count on a fragment; `detectBlocksSplit` settles it and has not been read. |  |  |
| 27 | doi:10.5061/dryad.83bk3jb37 | radMS_table_1.xlsx | Sheet1 | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 4 (user-set) | **Columns are variables** (§16.5): nine columns describing one specimen. §16 does not apply. **Rows are individual specimens** — `IndID` and `Museum_ID/USGS_ID` are each 127 distinct over 127 rows — so the row axis is a listing and `arbitrary`. **Confirm gate:** pending on both arms, 4 condition columns — `Pop`, `Transect or Museum`, `Museum_Name`, `MtDNA Type`, at 3, 3, 4 and 3 levels — all low-cardinality categoricals, so all four stand under §13.3 read shape-only. **`MtDNA Type` is plausibly an observed outcome rather than a factor**, recorded on the same footing as pos-03's `Choice`. **The analysed matrix is 127 × 3 and all three columns are geographic**: `Elevation`, `Latitude`, `Longitude`. 9 of 18 raw columns were removed as near-empty. |  |  |
| 28 | doi:10.5061/dryad.gtht76j3x | dominance_data.csv | dominance_data.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 4 (user-set) | **Columns are variables** (§16.5): `elo`, `years_to_death`, `BT_scores` and `BT_se` are distinct quantities per individual-season record. §16 does not apply. **Rows are 435 repeated-measures records over 54 individuals**, 108 groups with a median of 5. `year` and `season` exist but §2.8 holds `year` out as constant within `year_st`, so no column the product reads carries a sequence and a whole-column scan would cross individuals — `arbitrary`, with the grouped-order caveat: the binary cannot express *order within block*, which is the CORPUS-01 case, and `arbitrary` is the defensible side of it rather than a precise one. **Confirm gate:** pending on both arms, 4 condition columns — `ID` (54 levels over 435 rows, a repeated-subject key rather than a free identifier), `season`, `sex`, `status` — all four stand under §13.3 read shape-only. **§2.8 moved 4 columns via 3 keys**, and `year` and `year_st` are each held out as constant within the other. |  |  |
| 30 | doi:10.5061/dryad.qv9s4mwwc | ips_density_Goundar_et_al_2026_Where_are_they_now.csv | ips_density_Goundar_et_al_2026_Where_are_they_now.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | gate did not render | **Columns are variables** (§16.5): six quantities per billet — three dimensions and three counts. §16 does not apply and the grouping sits in `site` and `tree_ID`, which the product reads. **Rows are billets**, `billet_ID` 46 distinct over 46 rows, and no column carries a date, run number or index, so the row axis is a listing — `arbitrary`. **Confirm gate:** `condCols 2`, both arms false, `pending: false`. **§2.8 did not look** — 46 rows against `MIN_ROWS_FOR_GROUPING = 50`, returning at `roles.js:90`, so this is a non-instance by the floor and carries no evidence about a longer version of the same design. **Recorded before either arm ran:** `billet_circumference_cm` and `billet_diameter_cm` are geometrically related, one being π times the other, and both sit in the 46 × 6 analysed matrix. |  |  |
| 31 | doi:10.5061/dryad.1vhhmgr9v | MC_Drosophila_hydei.xlsx | Males | 2 / 3 | replicates (user-set) | ordered (user-set) | confirmed with 1 unticked — 8 of 9 (user-set) | **Columns are variables** (§16.5): a courtship-trial log — `Treatment`, `Chamber`, three colour columns, with `Device`, `Temp`, `Humidity`, `CS1`, `MCS`, `DC` measured. §16 does not apply. **Row semantics is `ordered`, read from the file rather than assumed:** `Date` ascends 6/16/25 to 8/8/25 across 20 dates with one descent, which is `7/9` sorting after `7/10` as text, and `TimeDemo` shows 19 descents over 20 dates — time ascending within each day and resetting at each day boundary. That is a chronologically delivered trial log, and the row index is instrument run sequence. **Confirm gate:** pending on both arms, 9 condition columns pre-ticked; `Experimentor` holds **one distinct value** and partitions nothing, so it comes off under §13.3 read shape-only. The remaining eight are confirmed and **the partition does not move**: 486 groups, every one a singleton, `slices()` returns none. §15.3 applies. **Confirming cannot rescue this deposit**, because the columns that fragment it — `TimeDemo` at 52 levels, `Date` at 20 — are genuine categoricals that shape-only keeps. |  |  |
| 32 | doi:10.5061/dryad.9ghx3fg0p | XLarge_All_Pod_Inference_data.csv | XLarge_All_Pod_Inference_data.csv | 1 / 1 | replicates (user-set) | ordered (assumed) | gate did not render | **Columns are variables** (§16.5): per-detection image-inference outputs — `X`, `Y`, `Width`, `Height`, `Confidence`, `Slice_X`, `Slice_Y`, `Pod_Class`, `Plot`. §16 does not apply. **Row semantics is the product's own answer, not a human's** — `suggestRowSemantics` returns `{value: "ordered", auto: true, reason: "assay"}` off the `physiological` detection and `ImportView.jsx:431` auto-applies it, so the shipped surface never asks and arm B records `(assumed)` per §8.2. **The assumed answer is plausibly right** — the 31 `Date` groups rise in size almost monotonically, 21 to 4,240, which is what a file accumulated in date order looks like — but the provenance word records who answered, not whether the answer was good, and arm B did not choose it. **Confirm gate:** `condCols 1`, both arms false, `pending: false`. **Largest sheet answered so far, 52,588 × 10, runtime unmeasured.** `Year` holds one distinct value and sits in the analysed matrix as a zero-variance column. |  |  |
| 34 | doi:10.5061/dryad.m0cfxppgt | Sperm_morphological_data.csv | Sperm_morphological_data.csv | 1 / 1 | replicates (user-set) | ordered (user-set) | confirmed as offered — all 5 (user-set) | **Columns are variables** (§16.5): six sperm morphometrics per cell. §16 does not apply. **Row semantics is `ordered`:** `No` runs 1 to 1,429 over 1,232 delivered rows with 6 descents of 1,231, so the delivered order is the measurement order with six local exceptions and gaps where cells were dropped. That is measurement sequence, which the gate counts. **Recorded because it cuts the other way:** the rows are also blocked by individual — `IndID` 74 levels, 9 descents — so a whole-axis scan crosses individuals and may misfire, which is the CORPUS-01 grouped-order case. **That is a reason the answer may produce a false positive, not a reason to change the answer**, and choosing `arbitrary` to avoid it would be selecting an answer to lower the score. **Confirm gate: pending on arm 1 alone**, `condCols 5 >= 3` with arm 2 false — the second of three live instances of the case STATUS records as unmeasured on any corpus. All five ticked columns are categoricals and `IndID` at 74 levels over 1,232 rows is a repeated-subject key rather than a free identifier, so all five stand. |  |  |
| 35 | doi:10.5061/dryad.4xgxd25s6 | AgeRelatedChangesInAcousticCues_data.csv | AgeRelatedChangesInAcousticCues_data.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | gate did not render | **`structure inexpressible`** — §16.5 member, merged header cells. Four spanning labels over widths 6 / 14 / 3 / 3 — **unequal, so not one replicate set** — naming four test batteries: `Hearing Thresholds`, `ABR Metrics`, `Digit Span`, `Speech-in-Speech Recognition`. **`isSparseGroupRow(row0)` is true and `detectHeaderRows` still returned 1**, failing at `isRepeatingSubHeader` — P222, the same conjunct as pos-01 and pos-14 — and 22 of 29 headers are synthesised `Col N` continuations. §16.1 rules `replicates`; `conditions` would fabricate 27 levels where the file has 4. **Rows are 84 human subjects**, `Subject ID` 84 distinct, no run number or date, so `arbitrary`. **Confirm gate:** `condCols 1`, both arms false, `pending: false`. `Age` is a data column and `AgeGroup`, the sole condition, is derived from it. |  |  |
| 38 | doi:10.5061/dryad.3tx95x6t7 | Nightly_Capture_Rates_Spp_Updated.csv | Nightly_Capture_Rates_Spp_Updated.csv | 1 / 1 | replicates (user-set) | ordered (user-set) | gate did not render | **Columns are variables, and this contradicts §16.5** — see the note in §7. Thirteen bat species each carry `_c` and `_rate`, but the rows are 311 capture nights, so these are 26 distinct quantities per observation rather than samples. §16.5's own wording for the member side is *rows are features*, which does not hold here. **The answer is `replicates` on either reading** and only §16.3's count is at stake. **Row semantics is `ordered`:** `Bat.Night` runs 1 to 311 strictly non-decreasing, one per row, and `Date` ascends 6/17/17 to 9/22/24 across eight seasons — its 24 reported descents are M/D/YY text sorting, not real. **Confirm gate:** `condCols 2`, both arms false, `pending: false`. |  |  |
| 39 | doi:10.5061/dryad.280gb5n5c | FIG3.xlsx | FIG3A | 2 / 5 | replicates (user-set) | ordered (assumed) | gate did not render | **Columns are variables** (§16.5): 14 soil and vegetation quantities per sampling point — `Green_Biomass`, `pH`, `OM`, `Clays`, `C:N`, and cadmium and zinc in available and total forms. §16 does not apply. **Row semantics is the product's answer, and it looks wrong:** `suggestRowSemantics` returns `{value: "ordered", auto: true, reason: "assay"}` off the `physiological` detection on a soil-chemistry sheet, and `ImportView.jsx:431` applies it without asking. **Rows are 146 sampling points** — `Point ID` 146 distinct, `SITE` at 4 levels, no date, run number or transect index — so nothing here makes the row axis a sequence. This is the mirror of pos-32, where the same auto-answer is plausibly right: the provenance word is `(assumed)` in both cases because it records who answered. **Confirm gate:** `condCols 1`, both arms false, `pending: false`. |  |  |
| 40 | doi:10.5061/dryad.2280gb64c | 13._b_Planctomycetota_asv.csv | 13._b_Planctomycetota_asv.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed with 3 unticked — 3 of 6 (user-set) | **`structure inexpressible`** — §16.5 member, naming scheme, and the cleanest instance in the corpus. **Rows are features and columns are samples**, which is §16.5's definition read straight off: `ASV_ID` labels 33,678 amplicon variants and columns 1–416 are sample codes on a three-letter site prefix with a two-digit replicate, `BAD_01` through `ZZD_29`. §16.1 rules `replicates`; `conditions` would fabricate 416 levels. **Rows are a taxon list** — `arbitrary`, and METHODOLOGY's genomics auto-route to that value **did not fire, because the assay detector returned `general` on an ASV table**. Arm A therefore substitutes `ordered` here. **Confirm gate:** pending on both arms, 6 condition columns pre-ticked; `Domain`, `Kingdom` and `Phylum` each hold **one distinct value** and partition nothing, so three come off under shape-only and `Class`, `Order`, `Family` are confirmed. The partition is unchanged at 34 groups. **Largest sheet of the thirty at 33,678 × 416; battery runtime unmeasured.** |  |  |
| 41 | doi:10.5061/dryad.kprr4xhfb | SNPeffect_BSLMM_allvar.csv | SNPeffect_BSLMM_allvar.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | gate did not render | **`structure inexpressible`** — §16.5 mixed, carrying the string under §16.7.1. Six trait families each crossed with abaxial / adaxial / mean — `e_`, `i_`, `s_`, `d_`, `f_`, `gmax_` — and seven climate variables beside them, `AI_unitless` through `LengthofGS_months`. §16.1 rules `replicates`. **Rows are 109,228 SNPs** keyed on `rs`, with `chr` and `ps` giving genomic coordinates. **Row semantics is `arbitrary`, and the reason is not that the rows have no order** — they are in coordinate order — but that a genomic coordinate axis is METHODOLOGY's own canonical arbitrary case: adjacent SNPs are in linkage disequilibrium, so serial structure along it is biological rather than forensic. **The genomics auto-route again did not fire**, the detector returning `general`, so arm A substitutes `ordered` on a second large genomic file. **Confirm gate:** `attempted` false, 0 condition columns, `condCtx.type` is `none`. |  |  |
| 43 | doi:10.5061/dryad.8gtht772x | Isoodon_data_raw_only.csv | Isoodon_data_raw_only.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — all 4 (user-set) | **Columns are variables**, and §16.5 reaches that verdict by a reason it does not give — see §16.7. The header carries a naming scheme, `P1L`/`P1W` upper dentition against `p1L`/`p1W` lower in three anatomical blocks split by two blank columns, but `P1L` and `M2W` are different quantities on one specimen rather than one quantity on different samples, so §16 does not apply. **Row semantics is `arbitrary` despite a monotone index.** `Count` ascends to 800 and would ordinarily make the row axis a sequence, but it is **blank on 436 of 873 rows** and is a bare specimen counter over a museum catalogue — monotone and meaningless, the pos-32 `Col 1` case. `Species name` shows 797 descents, so the rows are grouped by taxon: a listing. **Confirm gate:** pending on both arms, 4 condition columns — `Species name`, `skin`, `Side`, `saggital crest` — all categoricals, so all four stand under shape-only, though `Species name` is missing on 436 rows and `Side` on 525, so the partition is built on columns that are blank about half the time. |  |  |
| 44 | doi:10.5061/dryad.g4f4qrg50 | subset_dets.csv | subset_dets.csv | 1 / 1 | gate did not render | gate did not render | gate did not render | 12 columns infer to 1 Data / 1 Label / 6 Cond / 4 Attr. **§2.8 is the sole cause**: without the hold-out the sheet carries 5 data columns — `Date` holds `month` and `year`, `station` holds `lon` and `lat`. `timediff` survives. `Non-numeric 8` against `Missing 0`: eight `NA` cells counted as non-numeric rather than missing, unresolved. Screen read 30 Aug, same page text. | **refused (`ImportView.jsx:974`)** | n/a — no run |
| 45 | doi:10.5061/dryad.hqbzkh1zw | FF_blank.csv | FF_blank.csv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | gate did not render | **`structure inexpressible`** — §16.5 member, naming scheme: the headers are a wavelength sweep, `200` through `700`, so 102 columns carry one quantity across an ordered axis written into the header. §16.1 rules `replicates`; `conditions` would fabricate 102 levels from a spectrum. **The only sheet of the thirty with no label and no condition column** — roles read 0 / 0 / 102 / 0 / 0 and the analysed matrix is the whole file at 101 × 102. **Rows are 101 spectra** with nothing naming or ordering them, so `arbitrary`. **Confirm gate:** `attempted` false, 0 condition columns. Selected by a six-way tie-break that landed on `FF_blank.csv`, the control rather than a sample. |  |  |
| 46 | doi:10.5061/dryad.bzkh189qb | full_chemistry_wMeta.csv | full_chemistry_wMeta.csv | 1 / 1 | replicates (user-set) | ordered (assumed) | confirmed as offered — all 4 (user-set) | **`structure inexpressible`** — §16.5 mixed, carrying the string under §16.7.1. Five phenolic compounds crossed with two years — `pdw.{cts,salicin,salicortin,tremulacin,total}.{22,23}` — sit beside `population`, `treatment.y1`, `treatment.y2` and `group` as real condition columns, so the header carries a grouping the gate cannot express while genuine factors sit next to it. §16.1 rules `replicates`. **Row semantics is the product's answer and it looks wrong:** `qpcr` was auto-detected on a plant-chemistry sheet and carried `ordered` to the row gate without asking. Rows are 264 plant samples keyed on `sample.id` with no date, run number or index, so nothing makes the row axis a sequence — the pos-39 case again. **Confirm gate: pending on arm 1 alone**, `condCols 4 >= 3` with arm 2 false — the third and last live instance of that class. All four ticked columns are genuine categoricals at 5, 2, 2 and 4 levels; confirmed unchanged after examination. **`sample.id` holds 259 distinct values over 264 rows**, so five identifiers repeat. |  |  |
| 47 | doi:10.5061/dryad.cnp5hqcmx | seed-density.csv | seed-density.csv | 1 / 1 | gate did not render | gate did not render | gate did not render | 11 columns infer to 1 Data / 1 Label / 5 Cond / 2 Attr. **§2.8 is the sole cause**: without the hold-out the sheet carries 3 data columns — `plot_id` holds `seed_density` and `burial_treatment`, the two experimental factors. **Role inference is also contradicted by the file's own structure**: `length_cm_1`–`_5` are five replicate measurements scored `condition` (P217), their 40-row window being 200 cells of the literal `NA`. Measurement type auto-detected *Western Blot Densitometry* on a seagrass field experiment, which locked the data type, pre-selected Anscombe and auto-answered the row-semantics gate. Screen read 30 Aug, same page text. | **refused (`ImportView.jsx:974`)** | n/a — no run |
| 49 | doi:10.5061/dryad.3r2280gzk | data_R.csv | data_R.csv | 1 / 1 | replicates (user-set) | ordered (assumed) | gate did not render | **Columns are variables** (§16.5): `Whorl`, `Length`, `WetWeight`, `dry_wetratio` and `DryWeight` are five quantities per shoot. §16 does not apply. **Row semantics is the product's answer** — `physiological` auto-detected, `ImportView.jsx:431` applies `ordered` without asking — and here it is plausibly right, since `ID` runs 1,857 distinct numeric values over 1,857 rows and reads as a sequential index. **`(assumed)` records that arm B did not choose it**, as on pos-32. **Confirm gate:** `attempted` false, 0 condition columns, `condCtx.type` is `none`. **§2.8 moved three columns**, and `Treenr` and `Height` are each held out as constant within the other — the mutually-constant pair seen on pos-28's `year` and `year_st`. |  |  |
| 50 | doi:10.5061/dryad.1rn8pk187 | Assemblies_and_species.tsv | Assemblies_and_species.tsv | 1 / 1 | replicates (user-set) | arbitrary (user-set) | confirmed as offered — 1 of 1 (user-set) | **Columns are variables** (§16.5): three TOGA gene counts per genome assembly, with `Species`, two assembly names and `Contig N50 (L50)` naming the row. §16 does not apply. **Rows are 147 genome assemblies**, `Species` 103 distinct, no date or run index, so the row axis is a listing — `arbitrary`. **Confirm gate: pending on arm 2 alone**, `condCols 1` so arm 1 is false — **the only deposit of the thirty in that class**, and the mirror of pos-18, pos-34 and pos-46. The single ticked column `Bat family` holds 21 levels and is a genuine categorical, so it stands; the partition is 21 groups with 8 singletons and 8 surviving `slices()`. **The three data columns are components of one total** — intact genes, genes with inactivating mutations, genes with missing sequences — so they may be compositional; not verified. |  |  |
| 51 | doi:10.5061/dryad.v15dv42cj | Pieris_phenotype.csv | Pieris_phenotype.csv | 1 / 1 | replicates (user-set) | ordered (user-set) | confirmed as offered — all 3 (user-set) | **Columns are variables** (§16.5): nine butterfly morphometrics per specimen — `total_mass`, `thorax_mass`, `fw_length`, `fw_area`, `wing_loading`, `aspect_ratio` and three wing-area measures. §16 does not apply. **Row semantics is `ordered`, read from the file:** `SampleID` runs 4 to 637 strictly non-decreasing, one per row over 571 rows, and `CollectionDate` ascends 6/16/22 to 8/18/22 with two descents that are M/D/YY text sorting rather than real. Unlike pos-43's `Count`, this index is filled on every row and tracks a collection sequence. **Confirm gate:** pending on both arms, 3 condition columns — `CollectionDate` at 44 levels, `SiteID` at 19, `Sex` at 2 — all genuine categoricals, confirmed unchanged after examination. **Six `*_nir` columns are scored `label` rather than `data`** on a numeric fraction near 0.47, so six spectral measurements sit outside the analysed matrix. |  |  |

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
- **Polyfill assertion** is §8.3 as scoped by §18: `parseExcel` through the polyfill against
  `parseExcel` on a buffer read from disk. **On a probe-driven xlsx deposit, `pass`, or the deposit
  is not scored.** Everywhere else the cell records why the check does not apply, never blank, in one
  of three fixed spellings. **`n/a — hand-run, no polyfill in path`** wherever the deposit was
  hand-run, whatever its file type — the browser supplies `File.arrayBuffer` natively and nothing is
  substituted (§18.1). **`n/a — text path, polyfill never invoked`** on a probe-driven csv or tsv,
  where `ImportView.jsx:301-323` routes the file to `readAsText` so the polyfill is installed and
  never reached (§18). **`n/a — no run`** on a refusal (§14.3). **A skipped check and an inapplicable
  one look identical in a log**, and a field that gets counted must not hold variant spellings of one
  answer.

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

**C2 — pos-07, the structural reason. The classification, not the answer. Logged S396.**

Written **columns are variables** when the deposit was answered, on the strength of the S395
structure table's header list. **That list holds 25 of pos-07's 91 headers**; the other 66 are
compressed into a roll-up paragraph. Read at source, columns 17–86 are the years 1950 to 2019 — a
seventy-column axis written into the header — so **pos-07 is mixed**, the third such deposit after
pos-41 and pos-46. Recorded at §16.7 of the pre-registration.

**The answer does not move and has not been touched.** `replicates` and `arbitrary` are right on
either classification: §16.1 rules `replicates` for the mixed reading and the ordinary reason gave
the same answer for the other. What moves is §16.3's class count, which is reported beside the
default-cost figure, and the reason recorded in §4.

**No arm has run on pos-07**, so §6.4's ordering holds. The cell as first written carried the gap
as an open item in its own text — *whether the per-year naming scheme continues across those 66
headers is unread* — and this entry closes it rather than discovering it.

**`d9c4f6e`'s committed row carries the first wording permanently.** That is history, not a live
record.

**C3 — pos-23, row semantics. Markup, not the answer. Logged S396.**

Written `**ordered** (user-set)` and normalised to `ordered (user-set)`. **The answer is
unchanged**; the bold made the column tally as two values where there is one, and that column's
counts are reported. Found by running `sort | uniq -c` over the column rather than by reading it.

This is the `unordered` failure in its harmless form — a field that gets counted holding a variant
spelling of one answer. Logged rather than silently tidied, because *every change to an answered
cell is logged* is a cleaner rule than deciding case by case which changes are substantive.

### 4.2 — What the analysed matrix holds

**§22's three fields, one row per deposit, filled before either arm runs on it.** Kept apart from §4's
table for the reason §7 gives: **rows are keyed on position and carry no DOI, deliberately**, because
§5's counting commands anchor on `^| N | doi:` and a second DOI-led table would break them a third
time.

**A blank cell means not yet classified. `undetermined` means classified and not determinable.** The
two are different states and §22.1's rule — never a blank — governs a cell once it has been filled,
not a table still being filled.

| # | rows | columns | measurements | reason |
|---|---|---|---|---|
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 7 |  |  |  |  |
| 8 | mixed | mixed | mixed | **§21.1, measured before either arm ran.** 102 protein rows, 102 identical literal sub-header rows and 1,563 peptide rows in one block; `extractAnalysisInputs` drops the 102 sub-headers, leaving 102 protein records stacked on 1,563 peptide records. Four columns are numeric in both populations and name different quantities in each — `Exp. q-value` over `# Proteins`, `# Unique Peptides` over `# PSMs`, and likewise `Sum PEP Score` and `Coverage [%]`. **The exact analysed set is not pinned:** 1,767 × 15 = 26,505 = 6,197 + 20,002 + 306 admits four column sets, **but all four contain `Exp. q-value` and `# Unique Peptides`**, so the `columns` answer holds on every one. `measurements` is `mixed` on the same footing — every candidate set mixes precursor abundances and modification counts with a q-value and a peptide count. The deposit's README states the hierarchy and that **the blanks are structural, not missing data.** |
| 12 |  |  |  |  |
| 14 |  |  |  |  |
| 18 |  |  |  |  |
| 21 |  |  |  |  |
| 22 |  |  |  |  |
| 23 |  |  |  |  |
| 27 |  |  |  |  |
| 28 |  |  |  |  |
| 30 |  |  |  |  |
| 31 |  |  |  |  |
| 32 |  |  |  |  |
| 34 |  |  |  |  |
| 35 |  |  |  |  |
| 38 |  |  |  |  |
| 39 |  |  |  |  |
| 40 |  |  |  |  |
| 41 |  |  |  |  |
| 43 |  |  |  |  |
| 44 |  |  |  |  |
| 45 |  |  |  |  |
| 46 |  |  |  |  |
| 47 |  |  |  |  |
| 49 |  |  |  |  |
| 50 |  |  |  |  |
| 51 |  |  |  |  |

- **`rows`** — `one population`, `mixed`, `undetermined`.
- **`columns`** — `one variable each`, `mixed`, `undetermined`.
- **`measurements`** — `measurements`, `not measurements`, `mixed`, `undetermined`.
- **`reason`** carries the structural evidence for any non-default value, in the form §3 requires of
  the answers. **One spelling per value** — a field that gets counted must not hold a variant spelling
  of one answer.
- **Nothing here excludes a deposit, moves a sheet or changes an answer** (§22.2). It is recorded and
  acted on by nothing.

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

### 6.3 — §6's rate-limit sentence is false on three endpoints, corrected S398 before any deposit was scored

**§6 says the limit is reported on every response as `ratelimit-limit`, `ratelimit-remaining` and
`ratelimit-reset`. Measured S398: three endpoints report none of the three.**

| endpoint | auth sent | status | `ratelimit-*` headers |
|---|---|---|---|
| `/api/v2/test` | bearer | 200 | none |
| `/api/v2/datasets/<doi>` | bearer | 200 | none, on a full header dump |
| `_links["stash:download"].href` — pos-21's `README.md` | bearer | 200, 773 of 773 bytes | none |

**The first two prove nothing about the token.** Dryad's dataset metadata is public and both answer
without a bearer, so neither request exercised authentication. **The third does** — it is the endpoint
the fetcher calls, it carried the bearer, and it returned the file whole.

**What is corrected and what is not.** The field names and the reset semantics in §6 were measured at
S391 and are not withdrawn; something reported them then. What is withdrawn is *reported on every
response*. **Whether the API changed or the S391 reading came from a response no longer in the path is
not settled here**, and no claim is made about it. What is established is that the header cannot be
relied on at the point of use.

**The consequence, which is a defect and not a tuning question.**
`scripts/fetch-round2-readmes.mjs` gated its first request on a remaining count, read the absent header
as a budget of zero, formatted the absent reset as `new Date(0)`, and printed *window reopens at
1970-01-01T00:00:00.000Z* on a two-second loop. **It issued no request at all in that state.** A wait
computed from an absent value is not a backoff, and **absence of a header is not a measurement of a
limit** — the same shape as P231, where a timeout above Node's ceiling reported a wait that never
happened.

**The rule.** A client counts its own requests against 100 per UTC hour and treats the headers as
corroboration where they appear. **Where a budget figure is unavailable it halts and says so; it never
derives a wait from a value it has not checked for existence.** On this job the counter cannot bind —
thirty requests against a hundred — and it exists for the case where it does.

**This changes no rule in §17.2.** No resource limit rises, n stays 30, and a non-completion stays a
recorded outcome.

#### 6.3.1 — §6.3's account of the loop is wrong in one sentence, corrected S398 beside it

**§6.3 says *It issued no request at all in that state.* That is false.**

Read at source rather than inferred: **the throttle sits after a successful download, not before the
first request.** **Seven READMEs landed** — pos-01, 02, 03, 07, 08, 12, 14 — and all seven verify today
on size and sha-256 against the manifest. What the script did between downloads was sleep two seconds
and print 1970. **So 23 remain to fetch, not 30.**

**The mechanism, exact.** `Number(res.headers.get('ratelimit-remaining'))`. `Headers.get` returns
`null` for an absent header, **`Number(null)` is `0`**, and `Number.isFinite(0)` is `true`. So a header
Dryad does not send passed a validity test and read as a budget of zero. The absent reset became
`new Date(0)`, which is the 1970 in the output.

**How the error was made.** The claim was inferred from where the loop appeared in the run output
rather than read from the code. A script that spins on its first request is a tidier story than one
that downloads seven files and then spins, and the tidier story was written down without opening the
source. **The correction came from Code reading `fetch-round2-readmes.mjs`.**

**What survives from §6.3, unchanged.** The three endpoint measurements and their statuses. The
withdrawal of *reported on every response*. That the first two endpoints prove nothing about the token
and the third does. That the field names and reset semantics measured at S391 are not withdrawn, and
that whether the API changed is not settled. And the rule: **count requests locally, treat headers as
corroboration, halt rather than derive a wait from a value never checked for existence.**

**A second fault of the same shape, found in the fix and recorded here.** The on-disk verification sat
inside the token branch — a check gated on a condition it does not need, since verifying a file
already present costs no network. It now runs unconditionally, so the manifest reports the disk whether
or not a fetch can run.


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
| 7 |  |  |  |  |  |  |  | **`structure inexpressible`** — mixed: sixteen real variables beside a seventy-column year axis, 1950–2019. §16.7. Recorded before either arm ran. |
| 8 |  |  |  |  |  |  |  | **`structure inexpressible`** — naming scheme, nine `Abundance:` sample columns. Recorded before either arm ran. |
| 12 |  |  |  |  |  |  |  | **`structure inexpressible`** — naming scheme, `Y1B`/`Y1Q`/`Y3Q`, five columns each. Recorded before either arm ran. |
| 14 |  |  |  |  |  |  |  | **`structure inexpressible`** — merged header cells, four panels of widths 4/3/3/3. Recorded before either arm ran. |
| 18 |  |  |  |  |  |  |  |  |
| 21 |  |  |  |  |  |  |  | **Derived column pair, recorded before either arm ran.** `Log_AOB_paper` and `Log_AOA_paper` are log transforms of `AOB_raw` and `AOA_raw`, both in the analysed matrix — a deterministic relation between column pairs, which is what Constant-Offset Blocks scans for. |
| 22 |  |  |  |  |  |  |  |  |
| 23 |  |  |  |  |  |  |  | **Row-count gap, recorded before either arm ran.** 2,199 raw rows less 1 skipped, 1 header and 734 trimmed leaves 1,463 against 730 surviving; the residue is close to a second block of the same height. `detectBlocksSplit` settles whether §6.2 ranked this sheet on one block of several. Unread. |
| 27 |  |  |  |  |  |  |  | **The analysed matrix is three geographic coordinates** — `Elevation`, `Latitude`, `Longitude`, 127 × 3. Spatial coordinates carry intrinsic between-column structure. Recorded before either arm ran. |
| 28 |  |  |  |  |  |  |  | **Two derived relations, recorded before either arm ran.** `BT_se` is the standard error of `BT_scores`, and `years_to_death` follows from `death_year` and `year`. `BT_scores` and `BT_se` are both in the analysed matrix. |
| 30 |  |  |  |  |  |  |  | **Geometric relation, recorded before either arm ran.** `billet_circumference_cm` is π times `billet_diameter_cm`; both are in the analysed matrix, and a deterministic linear relation between two columns is what Constant-Offset Blocks scans for. |
| 31 |  |  |  |  |  |  |  | **§15.3 — zero surviving groups.** 486 rows partition into 486 singletons and `slices()` returns none, so no group-based test can run. The deposit runs and is recorded normally; `cov.ran` and the row fraction carry it. Confirming the gate does not move the partition. Recorded before either arm ran. |
| 32 |  |  |  |  |  |  |  | **Largest sheet of the thirty answered so far** — 52,588 × 10, runtime unmeasured, and cost is data-dependent rather than shape-dependent. **`Year` holds one distinct value** and enters the matrix as a zero-variance column. Recorded before either arm ran. |
| 34 |  |  |  |  |  |  |  | **Grouped order, recorded before either arm ran.** Rows are ordered by measurement number `No` and also blocked by `IndID` into 74 individuals, so a whole-axis scan crosses individuals — the CORPUS-01 case, where the binary gate cannot express *order within block*. **Candidate derived relation:** `SpermLength` may be the sum of `HeadLength`, `MPLength` and `FlagellaLength`; not verified. |
| 35 |  |  |  |  |  |  |  | **`structure inexpressible`** — merged header cells, four test batteries of widths 6/14/3/3. `AgeGroup` is derived from `Age` and both are read. Recorded before either arm ran. |
| 38 |  |  |  |  |  |  |  | **§16.5 disagreement, recorded before either arm ran.** This sheet and pos-18 have the same shape — per-species measurements over sampling events — and §16.5 classifies pos-38 as columns-as-samples and pos-18 as variables. The answer is `replicates` either way; §16.3's count of eight is what turns on it. **Candidate derived relation:** thirteen `_rate` columns may be their `_c` counterparts over `Total.Capture.Effort`, but every `_rate` has FEWER distinct values than its count, which the simple per-row ratio does not predict. Unresolved. |
| 39 |  |  |  |  |  |  |  | **The auto-answered row semantics looks wrong.** `physiological` was detected on a soil-chemistry sheet and carried `ordered` to the row gate without asking. Rows are 146 sampling points with no sequence column. Mirror of pos-32, where the same default is plausibly right. Recorded before either arm ran. |
| 40 |  |  |  |  |  |  |  | **`structure inexpressible`** — naming scheme, 416 sample columns on a site-plus-replicate code. **Largest sheet of the thirty, 33,678 × 416, battery runtime unmeasured** and cost is data-dependent rather than shape-dependent. **The assay detector returned `general` on an ASV table**, so METHODOLOGY's genomics auto-route to `arbitrary` did not fire. Recorded before either arm ran. |
| 41 |  |  |  |  |  |  |  | **`structure inexpressible`** — mixed, six trait families crossed with abaxial/adaxial/mean beside seven climate variables. **Six columns are derived from their neighbours** — `e_mean_um2`, `i_mean_unitless`, `s_mean_um2`, `d_total_sto.mm.2`, `f_mean`, `gmax_total` — and all sit in the analysed matrix. **The assay detector returned `general` on a SNP table**, second missed genomics file. 109,228 rows. Recorded before either arm ran. |
| 43 |  |  |  |  |  |  |  | **Alternating blank rows, recorded before either arm ran.** The identifier columns are filled on every other row — `Count`, `Species name` and `Specimen #` each hold 437 values against 436 missing of 873 — so half the analysed rows carry no specimen identity and the condition partition is built on a column blank half the time. **The row count does not close either:** 1,650 raw less 1 header and 50 trimmed leaves 1,599 against 873 surviving. Same shape as pos-23's gap; `detectBlocksSplit` unread on both. |
| 44 |  | refused | arm B refused |  | no run |  | no run |  |
| 45 |  |  |  |  |  |  |  | **`structure inexpressible`** — wavelength sweep, `200`–`700`. The only sheet of the thirty with no label and no condition column; the analysed matrix is the entire file at 101 × 102. Recorded before either arm ran. |
| 46 |  |  |  |  |  |  |  | **`structure inexpressible`** — mixed: five compounds crossed with two years beside four real condition columns. **`d.cts` and `d.pgs` are derived from their neighbours**, and `pdw.total.22` and `pdw.total.23` are plausibly the sums of the compounds beside them; all are in the analysed matrix. **The auto-answered row semantics looks wrong** — `qpcr` detected on plant chemistry. Recorded before either arm ran. |
| 47 |  | refused | arm B refused |  | no run |  | no run |  |
| 49 |  |  |  |  |  |  |  | **Derived relation, recorded before either arm ran.** `dry_wetratio` is `DryWeight` over `WetWeight` and all three are in the analysed matrix — a deterministic relation among three of the five data columns. The auto-answered `ordered` is plausibly right here, unlike pos-39 and pos-46. |
| 50 |  |  |  |  |  |  |  | **Only arm-2-without-arm-1 confirm gate of the thirty.** **Candidate compositional relation:** the three TOGA counts — intact, inactivating, missing — may sum to a fixed gene total per assembly, which would make one column a function of the other two. Not verified. Recorded before either arm ran. |
| 51 |  |  |  |  |  |  |  | **Derived relations, recorded before either arm ran.** `wing_loading` follows from mass over wing area and `aspect_ratio` from wing length and area, so two of the nine data columns are functions of three others in the same matrix. **Six `*_nir` columns are scored `label`** at a numeric fraction near 0.47 and therefore never reach the battery. |

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

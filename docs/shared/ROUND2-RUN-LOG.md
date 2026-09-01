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

**C4 — pos-08, the structural reason. The row population, not the answer. Logged S400.**

Written **Rows are proteins** — `Accession`, `Description` with 1,016 distinct descriptions — the
alphabetised-protein-list case METHODOLOGY names, so `arbitrary`. **The rows are not one population,
and the deposit's own documentation says so.**

`Protein-Peptide Info` holds 1,767 body rows with no blank rows, so `detectBlocks` sees one block:
**102 protein rows, 102 identical literal sub-header rows and 1,563 peptide rows** (§21.1).
`extractAnalysisInputs` drops the 102 sub-headers, so the analysed matrix is **102 protein records
stacked on 1,563 peptide records**. The README states the hierarchy in the depositor's own words — the
workbooks were exported from the mass spectrometry program with protein, peptide and PSM information
on multiple levels, and the body lists two schemas for this one sheet, protein-level fields in blue
cells and peptide-level fields in orange. Cell fill on column D partitions the same four classes with
zero disagreement against the classes derived from cell contents (§21.5).

**The 1,016 is a count taken across two populations and read as a property of one.** Column B carries
**76 distinct protein descriptions on protein rows and 939 distinct peptide sequences on peptide
rows** (§21.1). *Arithmetic, offered and not measured:* 76 + 939 = 1,015, and the 102 sub-header rows
carry one identical literal, which would be the 1,016th distinct value. If that holds the recorded
figure is fully accounted for; one distinct-count over column B settles it, and nothing in this entry
rests on it.

**The cell already held the evidence against its own reason.** Its closing sentence records
`extractAnalysisInputs` dropping 102 of 1,767 rows — the sub-header count exactly — written beside a
reason asserting a single population of proteins. **A measurement can sit in the same cell as the
claim it refutes and neither reads as odd**, because the two were written for different purposes.

**What this entry corrects, and what it leaves open.** The row clause is corrected. **The column
clause stands**: nine `Abundance: <ratio> <NR/R>: Sample` columns crossing a loading ratio with NR/R
is a header naming scheme, which the README does not contradict, and §16.5 membership and
`structure inexpressible` are not withdrawn (§21.4). **The untick set does not move here** — nothing
in the documentation bears on which columns the confirm gate pre-ticks, so the two named in §4 stand
unless the pass rules otherwise, and any change to them is its own entry.

**The answers are not settled by this entry.** Whether `replicates` and `arbitrary` still hold with
the hierarchy in view is a judgement for the re-answer pass. **If either moves, that is a separate
correction with its own reason**, newest last; nothing here overwrites an answer. **This is the first
entry in this section that does not settle the answer it bears on**, and it is written that way
deliberately: the correction records what was false when it was written, and the pass records what
replaces it.

**No arm has run on pos-08 and nothing has been scored on either arm**, so §6.4's ordering holds:
this is not an answer revised against a result.

**`d9c4f6e` carries the first wording permanently.** That is history, not a live record.

**C5 — pos-01, the structural reason. The evidence, not the answer. Logged S400.**

**The re-answer pass under §21 returns *adds detail* on the column side and *says nothing* on the row
side. Neither answer moves.** The reason as written is not false; it is thinner than the deposit's own
documentation, and one part of its argument was weaker than it needed to be.

**The three bands are the depositor's own variables, named.** The README carries a section headed
*Variables for sheets 1200-1, 1200-3, 1300-1, 1300-3* listing exactly `Anhydrous MORB glass`,
`silicate part of the melt` and `metals`, defined as the initial melt, the silicate run product and
the metals produced in the run product's interior. **The band structure the reason inferred from a
spanning header row is the design, stated by the depositor.**

**Within a band the columns are replicates, and the README says so:** *Data points shown for a given
melt are individual measurements from separate locations within the melt.* The recorded reason argues
`replicates` as the least-wrong of two gate answers — *neither gate answer is true of the file*, which
remains true of the fifteen columns taken as one set. **What the documentation adds is that
`replicates` is exactly right within each band and wrong only in pooling three bands**, which is a
stronger footing than the one recorded.

**The bands are not on one compositional basis, and the reason does not say so.** The README states
that initial, starting and silicate reaction products are assumed to have all cations as oxides, while
for metals all elements are considered elemental without any O. **Eleven columns are oxide-basis and
four are elemental**, so the product pools two bases as replicates of one measurand — the shape
recorded of DS23 and DS24 in the fixture corpus, here on a real deposit.

**Band widths confirmed at source: 5/6/4.** `Anhydrous MORB glass` spans B:F, `silicate part of the
melt` G:L and `Metals` M:P, with `Element` in A — so A:P is sixteen columns of which fifteen are data,
matching `Data cols 15` and `Values 240` on the import screen and the twelve synthesised `Col N`
headers the reason already records. **A count of 6/6/4 counts the label column into the first band.**

**The header cannot be recovered from the shipped surface, which the reason does not record.** The
band labels are merged *horizontally* across B:F, G:L and M:P over a header block merged *vertically*
across the two physical rows, so the second row is empty. **Setting header rows to 2 consumes a blank
row and recovers nothing** — the information lost is the horizontal span. Read off the screen at
S400. This strengthens §16.1's premise rather than qualifying it: the grouping is inexpressible in the
gate *and* unrecoverable by the one control that looks like it should reach it. P222 records the
detection half.

**The row-semantics answer is untouched.** The README describes composition, not order, and says
nothing bearing on the row axis. `arbitrary` stands on the ground recorded at C1 — an element label
column with `TOTAL` last. The README does add that low totals are expected and explained by unmeasured
volatile species, so the `TOTAL` row is informative rather than a checksum.

**Ordering.** Neither arm has run on pos-01. This entry was reached from the README and the import
screen and its conclusion was written before the verdict described at §21.7 of the pre-registration
was seen. **See §21.7: a five-column subset of this deposit was run during the pass, and this entry
does not rest on it.**

**`75e5be6`'s committed row carries the original reason permanently.** That is history, not a live
record.

**C6 — pos-02, the structural reason. The identifier and what the columns are. Logged S400.**

**The re-answer pass under §21 returns *adds detail*. The refusal and both gate cells are unaffected**
(§21.4), and no answer moves.

**`collection_no` is a database identifier, not a museum one.** The recorded reason reads *a museum
collection identifier*; the README defines it as *unique PBDB identifier for the fossil collection
containing the occurrence*. Paleobiology Database, not a museum register.

**The column count is confirmed from the depositor's own list.** The README names all twenty-one
variables of `os_cells_new.csv`, matching the recorded *21 columns infer to 1 Data / 1 Label / 7 Cond /
12 Attr*. Rows are confirmed too: **26,532 fossil occurrences from 1,149 collections and 2,474 genera**,
against the screen's `Rows 26532`, so nothing was lost at import.

**Not one of the twenty-one columns is a measurement, and that is what §22 records.** Reading the
depositor's list: an accession number; a genus name; a plate assignment; six coordinates, two of them
model reconstructions; four stratigraphic labels; four interval boundary ages and a duration, all
properties of the *bin* rather than of the occurrence; two spatial-grid identifiers; a 1-to-7 interval
index; and a formation name. **Nothing is measured on the specimen.** That is §22's own list of numerics
that are not comparable measurements, and this file holds nothing else.

**This is §22.3's worked case and it is worth stating where it can be found later.** The applicability
line reads *Unusual digits 2/5* — the Benford family considered applicable to a database accession
number. Had §2.8 not held twelve columns out, the battery would have run over identifiers, coordinates
and bin boundary ages, and any flag it raised would have said the product should not have analysed the
file rather than that the statistics are miscalibrated. **The product does refuse it, for the
arithmetic reason that one data column survived, not because anything recognised what the column is.**

**No arm has run on pos-02.** §6.4's ordering holds.

**C7 — pos-03, the structural reason. An open question closed, and the answer unchanged. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and it discharges the question the cell was
written to hold open.** No answer moves and the ticked set does not move.

**`Choice` is the experiment's response variable, stated by the depositor.** The recorded cell reads
*`Choice` is plausibly the response of a choice assay rather than a factor, and settling that needs the
paper, which §8.2's decidable-from-a-header-list standard excludes.* The README settles it without the
paper: *the substrate in which the individual chose to roost after 5 minutes of being placed in the
experimental arena.* **It is the thing the study measures, and it sits on the confirm card as a factor.**

**It stays ticked, because §13.3 is shape-only.** The rule removes a score, a free identifier or a
measurement; `Choice` is a genuine two-level categorical and by shape it stands. **Whether §13.3 should
move now that arm B reads documentation is a rule question and is not decided here** — moving it would
alter ticked sets on deposits already answered, on the strength of documents read after the answers
were made. §21.4 does not list §13.3 among the things §21 changes.

**Both data columns are confirmed.** `Individual_ID` is *the unique identifier ID for each individual*;
`Number_of_legs` is *the exact number of legs that each animal had when found*, values 4 to 8. The
screen reads `Data cols 2`, `Values 300` over 150 rows. **Columns-as-variables stands and §16 does not
apply.**

**Recorded and drawn on for nothing.** The README states of `Number_of_individuals` that *for this data
analysis, the value is always 5*; the screen shows a 4 on group 8. The methods describe 31 trials of
five against 150 rows. **§21 says this pass is not an audit of whether a deposit's data matches its
documentation**, so this is logged and nothing is inferred from it. The group count was not measured
here, so the arithmetic is offered rather than checked, and it does not touch the row answer: every row
is still one individual.

**No arm has run on pos-03.** §6.4's ordering holds.

**C8 — pos-07, the structural reason. The year axis is wrong by four columns. Logged S400.**

**The re-answer pass under §21 returns *contradicts*.** The recorded reason states *columns 17–86 are
the years 1950 to 2019 — seventy columns carrying one quantity across a year axis written into the
header.* **The depositor's variable list runs the year columns 1950 to 2023, which is seventy-four.**

**The arithmetic that should have caught it was never run.** Seventeen non-year variables plus seventy
years is 87 against a recorded total of 91, leaving four columns unaccounted for. On the README's
reading 17 + 74 = 91 exactly. **The screen corroborates independently at `Data cols 74`.**

**The roles close on the same reading.** The README names seventeen non-year variables. Eight are the
pre-ticked conditions — `Unit`, `Detrend_method`, `Country`, `Koppen-Geiger`, `Species`, `G_A`,
`our_class_drought_resistance`, `niche_global`; one is the `REF` label; the remaining eight —
`T_article`, `Prep_article`, `Climat_given_article`, `MAT`, `MAPv`, `MAP` and the two aridity indices —
are the eight §2.8 holds out. **1 + 8 + 8 + 74 = 91.** The closure is multiply determined and is
recorded as a reconciliation rather than a direct read of the role strip.

**This is C2's shape repeating on the same deposit.** C2 corrected pos-07 because the S395 structure
table held 25 of its 91 headers and the other 66 were a roll-up; the correction then asserted a range
and a count over that same compressed region. **A correction made from a compression, made from a
compression** — four years wrong, and not detectable without the depositor's list.

**No answer moves.** §16.1 still rules `replicates`: the axis is longer, not different in kind, and
`conditions` would fabricate seventy-four levels rather than seventy. §16.7's mixed classification
stands. Row semantics is untouched — `REF` reads alphabetically by first author on screen, which is
compilation order.

**Two facts the recorded reason does not carry.** Every year column reads *value of growth in YYYY
extracted from the growth series with webplotdigitizer*: **these are readings taken off other people's
published figures, not measurements of trees**, so any digit-level test is measuring the digitiser, and
`Precision mixed (0–9dp)` with 3% integers is what that looks like. And **`Unit` is either basal area
increment or ring width, per row**, so a single year column holds two different physical quantities on
different rows, further detrended by six different methods.

**Recorded and acted on by nothing.** `Missing 3706` reconciles exactly — 210 × 74 = 15,540, less 3,706
missing and 14 non-numeric gives the screen's 11,820 values. The README states the blanks mean *no
values could be extracted for this specific year*, so **the missingness is the extent of each growth
series rather than missing data**, the shape P233 records on pos-08. The 14 non-numeric cells are
unexplained and unread.

**No arm has run on pos-07.** §6.4's ordering holds.

**C9 — pos-08, the structural reason. The documentation read at source. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and this is the one deposit whose README had
already been read** — at S398, producing §21.1, §21.5, §4.1's C4 and §4.2's row. **This entry exists
because §21.3 requires all thirty, and because a compression already load-bearing is worth checking
against its source.** No answer moves and §4.2 is unchanged.

**The two-schema claim is confirmed and is stronger at source than §21.1 reports.** The README itemises
**twenty blue protein-level fields and thirteen orange peptide-level fields** by name. §21.1's summary
is accurate and understates its own evidence.

**Both unticked columns are confirmed in the depositor's own words**, which matters because §20 has
them unticked by name at the moment of the hand-run. `Score: Sequest HT PSM match score generated by
the search algorithm` — a score. `Abundance Precursor: abundance detected in the specified sample
(retained or non-retained fractions at each antivenom-to-venom ratio)` — a measurement read as a
condition. **The screen corroborates the second independently:** eleven of the twenty condition levels
rendered are numbers, from 22.29 up to 29272734897.0234, which are precursor abundances sitting on the
confirm card as levels of a factor.

**A scope note on §21.1, not a correction.** The README carries two file groups — files 1–3 the
`(Affinity)` workbooks, files 4–6 the `(Whole_Venom_proteome)` ones — and **the hierarchy NOTE is the
closing paragraph of the second group.** pos-08's file is `ECS-SA_(Affinity).xlsx`, file 3, in the
first. The substance holds: the NOTE says *the Excel workbooks* generically and both groups carry an
identically structured Sheet 1 with the same blue and orange schemas, so C4's and §21.5's use of it is
sound. **§21.1 quoted it as pos-08's own documentation and it sits one file group away.** Recorded so a
later reader does not find it and conclude nobody looked.

**Not attempted: reconstructing the column mapping from the two lists.** §21.1's four shared columns
were measured from the file at S398. The README's twenty and thirteen are consistent with column reuse
and **do not by themselves say which field shares which column**; list order does not align them.
Deriving the pairs from the lists would be the compression error on a deposit that has already produced
one.

**pos-08 is one of the eight deposits with a non-empty `methods` field, and it bears on nothing
structural** — venom collection, HPLC gradients, trypsin digestion, Proteome Discoverer parameters.
Worth recording as such: the field being non-empty does not make it informative about the matrix.

**No arm has run on pos-08.** §6.4's ordering holds. The exposure at §21.7 is pos-01's and does not
touch this deposit.

**C10 — pos-12, the structural reason. The naming scheme, documented column by column. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and this is the strongest documentary
confirmation of §16 in the pass.** No answer moves.

**The three stems are three leaf-processing treatments and the README names all fifteen columns.**
`Y1B_01`–`Y1B_05` are **leaf-retained**, `Y1Q_01`–`Y1Q_05` **leaf-removed**, `Y3Q_01`–`Y3Q_05`
**leaf-accumulated**; stem carries the treatment, suffix carries the replicate 01–05. **§16.5's *design
written into the column names* is not an inference on this deposit — it is the depositor's own scheme,
spelled out.**

**`OUTs` is a transposition of OTUs and the depositor's own text corrects the filename.** The
description reads *Non-target OTU read counts under three leaf-processing treatments* and the first
variable is *OTUs: operational taxonomic units.*

**Rows are features and columns are samples**, which is §16.5's member definition read straight off and
the same shape as pos-40's ASV table. 3,420 OTUs by fifteen samples is 51,300, matching the screen's
`Values 51300` with `Missing 0`.

**§16.1's ruling is documented here rather than derived, and this is the case where `conditions` is
nearest to right.** The three treatments are genuine experimental conditions. **The gate still cannot
express three groups of five**, so `conditions` would fabricate fifteen levels where the file has
three, and `replicates` stands: pooling three treatments costs power, fabricating fifteen levels
changes what the tool believes it is analysing. **Within a stem the five columns are replicates in the
strict sense** — same treatment, five samples — which is pos-01's finding on a second deposit.

**Row semantics is untouched.** An OTU list carries no order the depositor assigns and the README gives
none.

**Recorded and acted on by nothing.** 43,293 of 51,300 values are zero, 84.4%, which is ordinary for an
OTU table. **Nothing about either arm's outcome is forecast from it.**

**No arm has run on pos-12.** §6.4's ordering holds.

**C11 — pos-14, the structural reason. Units added, structure not documented. Logged S400.**

**The re-answer pass under §21 returns *adds detail* on the unit and *says nothing* on the structure.**
No answer moves.

**The README does not describe the analysed sheet.** It carries thirty-one file entries, almost all
`.lif` microscopy files, and `Rawdata_Figures_Tables_TSA.xlsx` gets one paragraph plus one variable
line. The paragraph says the workbook holds the raw measurements underlying all figures, *organized
into tabs by figures*, which confirms the sheet naming and says nothing about what is inside
`Figure 2`. **No panel is named, no column is named, no row is defined.** A reader with this
documentation in hand knows no more about the structure than one without it.

**What it does add is the unit.** *Imaging data quantification are presented as mean gray value* — the
only variable statement in the file, and it confirms the two measurements the recorded reason already
names.

**The Code/software section carries the detail the Variables block does not.** Z-stacks summed in
ImageJ, nuclei bounded by DAPI thresholding, merged nuclei split by watershed, **nuclei under 50 µm²
excluded**, mean grey value recorded per bounded nucleus, and **nuclei excluded where the γH2AX signal
was widespread rather than in foci**. So the rows are a filtered population and the excluded nuclei are
gone before the file exists. **Two quantification pipelines are documented, not one:** MCF-7 and
MCF-10A by mean grey value, **A375 and BJ5-ta thresholded first** against a threshold chosen on
non-irradiated cells, with foci counting performed separately on the 1 Gy conditions.

**On the class question, this deposit gives a negative and it is worth recording as one.** pos-01's
three spanning labels are the sheet's own variables and its README names them. **pos-14's four are
`A)` `B)` `C)` `D)`, a figure layout, documented nowhere.** So §16.5's merged-header-cells members
share a symptom on this evidence and a mechanism is not established. P222's claim that all three fail
at the same conjunct is about detection, which is a different question from what the lost label meant.
**Whether pos-14's header is merged horizontally over a vertically merged block the way pos-01's is
remains unread**, and nothing here infers it from the width pattern.

**One check owed, recorded rather than left implicit.** §21.8 rules an in-workbook documentation sheet
part of arm B's information set. **That rule was made after pos-14 was re-answered and its workbook was
not checked for one.** Eight sheets; if `Rawdata_Figures_Tables_TSA.xlsx` carries a documentation tab,
this entry is superseded by a later one rather than edited.

**No arm has run on pos-14.** §6.4's ordering holds.

**C12 — pos-18, the structural reason. The documentation is in the workbook. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and the detail is not in the README.** It is
eight lines and delegates: *the first sheet in the document, "Metadata," includes a list of the
subsequent sheets, their column names, and the information contained within.* **Read under §21.8, that
sheet is part of the information set and it settles three things.** No answer moves.

**§16.8's classification is corroborated by the depositor.** The Metadata sheet gives `Raw_Floral`'s
columns as `Cluster`, `Site`, `Type`, `Module`, `Date`, then *additional columns are for each plant
species (in alphabetical order); values in the cells are counts of flowers/flowerheads/inflorescences.*
**Rows are sampling events and columns are per-species counts** — §16.5's columns-as-variables read
straight off. **§16.8 reached that from a header list and moved pos-38 to match it; the classification
it was anchored on now has documentation behind it.**

**The three confirmed conditions reconcile exactly.** `Cluster` is CL, GH, MG, WR; `Site` is P, M, O;
`Type` is C, R — nine level values, and the screen shows exactly those nine. `confirmed as offered —
all 3` stands and all three are genuine categoricals under §13.3.

**`Floral_M` is `Raw_Floral` aggregated**, in the Metadata sheet's own words: *floral resource survey
data totaled for each module.* **A raw sheet sits beside the analysed one in the same workbook and the
sheet choice does not move** (§6.2, §21.3, §21.8.1). Why `Floral_M` outranked `Raw_Floral` on cell
count is not reasoned about here; `round2-ranking.json` carries `decidedBy`.

**A discrepancy recorded and not chased.** §16.8 records pos-18 as *200 plant-species columns over 144
sampling events*. The screen agrees on 144 and reads **`Data cols 147`**, not 200. The Metadata sheet
gives no species count — it says *additional columns are for each plant species* and stops. **A
candidate explanation is arithmetic rather than a measurement:** `Allium_cepa` is scored `Attr` and
every visible value in it is zero, so §2.8 removes all-zero species columns, and 20,079 of 21,168
values in this matrix are zero. **That would put the gap at roughly fifty removed species plus
`Module`, and it is offered, not measured.** §16.8's 200 feeds §16.3's class figure, which is reported
beside the default-cost reading at the sitting, **so this is a check owed before §7's counts are
written and not a reason to stop the pass.**

**No arm has run on pos-18.** §6.4's ordering holds.

**C13 — pos-21, the structural reason. A factor inside the analysed matrix. Logged S400.**

**The re-answer pass under §21 returns *adds detail*.** No answer moves. The README delegates as
pos-18's does — *all the units and information about the variables are included in the "Metadata"
spreadsheet* — and §21.8 puts that sheet in the information set. **Unlike pos-18, `Metadata` is not
sheet 1 here: the analysed `Data` is 1 of 3**, so the product does not put the documentation on screen
first.

**The deposit's own abstract names a factor that sits in the analysed matrix as a measurement.** It
describes *bare and vegetated microsites*, and `Microsite` is scored `Data` on screen, coded at two
levels. **The recorded reason already contains the fact and does not draw the consequence** — it names
`Site` 16 distinct crossed with `Microsite` at 2 levels to justify `arbitrary`, then classifies the
columns as *23 soil and enzyme quantities per site* without noticing that one of the 23 is the design's
second factor. Only `Country` reached the condition role.

**This is not P217 or P218.** The recorded reason's non-instance note holds unchanged: §2.8 returned at
the 50-row floor on 32 rows, and the 40-row window is the whole column. **`Microsite` reaching `Data`
is plain role inference on a two-level numeric code**, which is why it belongs in §4.2 rather than in
either census.

**Recorded and acted on by nothing.** `Aridity` reads `0.6890000000000001` beside `0.649`, `0.621` and
`0.645` in neighbouring rows — a float-representation artefact, a value needing more than fifteen
significant figures to round-trip, on a matrix whose other columns are 3dp. `Precision mixed (0–17dp)`.
**Decimal Precision and Terminal Digit read that, and it is a property of how the file was written.**

**No arm has run on pos-21.** §6.4's ordering holds.

**C14 — pos-22, the structural reason. Two columns, two provenances. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and the addition is provenance.** No answer
moves. Columns-as-variables stands, §16 does not apply, `arbitrary` stands, and the recorded
non-instance note on both inversion mechanisms is untouched.

**The two analysed columns did not come from the same study.** `%occur` is derived here — *calculated
from raw data as: observed occurrence/total surveyed*, over 114 human and 1,468 non-human primate
crania. **`CBA` was not measured in this study at all:** the methods state that *average CBA for all 31
genera were gathered from the literature (Ross and Ravosa, 1993; Strait, 1999)*, a per-genus average
lifted from two earlier papers.

**So the product reads a proportion computed by these authors and an angle taken from someone else's
publications as replicates of one measurand.** That is the shape recorded of DS23 and DS24 in the
fixture corpus, and it is the third instance in this pass after pos-01's two compositional bases and
pos-07's basal-area-increment against ring width. The scales say it too: `%occur` runs 0 to 0.39 at
4dp, `CBA` runs 161 to 187 at 0–1dp, **on a two-column matrix with `Range 0.000 – 187.0`.**

**Recorded and not acted on.** The README says `CBA` values are *whole numbers*; the screen shows 161.5
and 172.5. **§21 is explicit that this pass is not an audit of whether a deposit's data matches its
documentation**, so nothing follows from it here.

**pos-22 is the file P141 said round 2 would need.** Two data columns give one pair, so `nPairs < 2` is
reachable — the shape P138's phantom-member path requires and no fixture in the corpus carries.
**Recorded as a property of the deposit; whether the path fires is for the arms to say.**

**No arm has run on pos-22.** §6.4's ordering holds.

**C15 — pos-23, the structural reason. The depositor documents three blocks and §19 records two. Logged S400.**

**The re-answer pass under §21 returns *contradicts*, and what it contradicts is a pre-registration
section rather than a §4 cell.** No answer moves.

**The README is unambiguous.** *It contains three vertically stacked data blocks* — Water level, Flow
velocity, Discharge — *each block contains 730 daily observations*, with *blank separator rows used
between the three data blocks*. **The third has a different shape**: `Date` and `Q`, two columns rather
than five, because *discharge is represented by one common daily time series rather than separate
site-specific columns*.

**§19 and §4 both record two blocks, with arm A taking exactly 50.0%.** Those cannot both be true of a
three-block file: block 1 of three equal blocks is a third, not a half. **One candidate reading, offered
and not measured:** `detectBlocks` splits on blank rows, blocks 1 and 2 share a five-column header and
block 3 has two, so a third block dropped or merged rather than offered would leave a picker showing two
and a block 1 that is half of what remains. **The mechanism is not asserted and the screen read is not
legible enough to settle it.**

**§19's ruling survives either way.** The arms analyse different rows on this deposit and their §7
difference may not be cited as the cost of the default; three blocks makes that stronger rather than
weaker. **What is owed is the block count itself, before scoring** — it sits in a committed
pre-registration section, and unlike pos-18's 200 it is settled by one look at the picker on the
analysed file rather than by opening a neighbouring record.

**It also bears on §4.2.** `rows` is recorded `one population` **on the analysed block**. If the
discharge block reaches the matrix it becomes `mixed`, since discharge is a different quantity on a
different column set. **A second reason the count is owed before the run.**

**The transform gate returns a slope of 18.37 and the product pre-selects the log transform.**
`Proportional noise detected (slope = 18.37, 95% CI [18.00, 18.73])` against an expected band of
`[0, 2]`. The reason is on the same screen: values run 263.8 to 279.4 and `Mag. span` reads **0.0
orders**. Regressing log dispersion on log mean where the mean barely varies amplifies the slope without
bound, and **the interval is tight because the fit is precise rather than because the slope is
meaningful.** This is P184's finding on a real deposit — the correct exponent is a property of the
dataset's dynamic range and not of the assay label. **Second auto-transform observation in the pass
after pos-01's, and the sharper of the two.**

**`ordered` is confirmed by the depositor** — daily outputs spanning 1 January 2022 through 31 December
2023, 730 days, with `date` running from 2022/1/1 on screen.

**And the values are modelled rather than observed.** The deposit keeps observed water levels in a
separate file, `07_hydrodynamic_calibration_data.csv`, used for model evaluation. Modelled values are
still quantities; the provenance is recorded because a battery reading them cannot tell.

**No arm has run on pos-23.** §6.4's ordering holds.

**C16 — pos-27, the structural reason. The analysed file is the deposit's metadata table. Logged S400.**

**The re-answer pass under §21 returns *adds detail*.** No answer moves.

**The depositor calls the analysed file a metadata file.** *This is a metadata file containing the 128
individual* T. aedon *included in the manuscript.* The deposit's data is
`howr_ddrad_raw_variants.vcf.gz`, 128 ddRAD sequences; **§6.2 selected the specimen table because a VCF
is not a tabular file the shape filter considers**, and §21.3 holds the sheet choice.

**So the recorded reason's closing sentence is confirmed by the depositor's own framing** — the
analysed matrix is 127 × 3 and all three columns are geographic. The README pins the unit too:
*elevation is presented in Feet above sea level.* **`Range -121.6 – 9894` is a longitude in degrees
west pooled with an altitude in feet.**

**`MtDNA Type` is settled and does not move, on the same footing as pos-03's `Choice`.** The cell flags
it as *plausibly an observed outcome rather than a factor*; the README says *mitochondrial type follows
the patterns found in Klicka et al. 2023*, a lineage assignment taken from a prior publication and one
of the two things the study is about. **It stays ticked because §13.3 is shape-only** (§4.1 C7) and it
is a three-level categorical. **These are the two columns §13.3 was recorded as the rule deciding, and
both now have documentation behind them and neither moves.**

**Recorded and acted on by nothing.** The deposit's own two documents disagree on n: the README says
128 twice, the abstract says *sequenced 127 northern house wrens, including 109 individuals from across
Colorado and Wyoming, as well as 9 individuals each from eastern and western allopatric regions* —
which sums to 127 — and the file carries 127 rows. **§21 is explicit that this pass is not an audit of
whether a deposit's data matches its documentation.** Separately, the confirm card carries `-` and
`Not.Typed` as condition levels; both are low-cardinality and stand under shape-only.

**No arm has run on pos-27.** §6.4's ordering holds.

**C17 — pos-28, the structural reason. Four derived columns, and one is another column's standard error. Logged S400.**

**The re-answer pass under §21 returns *adds detail*.** No answer moves.

**The README defines all four analysed columns and none is measured on a bird.** `elo` is *the
randomized Elo-Rating, representing dominance rank*, computed from aggressive-displacement sequences
via Beltrão et al. 2021. `BT_scores` is *Bradley-Terry dominance scores*, a model fit to the same
displacements. `BT_se` is *Bradley-Terry dominance scores standard error*. `years_to_death` is *number
of years from observation to death year*, arithmetic on two dates. **All four are computed from an RFID
displacement record that is not in the deposit.**

**Two consequences the recorded reason does not carry.** `elo` and `BT_scores` are two estimators of
one quantity and **the depositor knows they are correlated** — the script index lists *Spearman
correlations between Randomised Elo-ratings and Bradly-Terry scores* as a supplementary analysis. So
the product reads as replicates of one measurand two things that are, on the depositor's own account,
nearly that. **This is the first deposit in the pass where `replicates` is arguably too weak rather
than too strong.** And **`BT_se` is the standard error of `BT_scores`, in the same matrix** — a
quantity about the precision of a neighbouring column rather than about any bird, which is what puts
`measurements` at `mixed`.

**The recorded `year`/`year_st` note is confirmed as the depositor's own construction.** *`year_st`:
the standardized year, ranging from 1 to 5, used for analysis* — a deterministic recoding of `year`,
which is why §2.8 holds each out as constant within the other. Both sit outside the analysed matrix, so
it does not reach §4.2.

**Recorded and acted on by nothing.** `Missing 0` beside 160 non-numeric: the 160 are `years_to_death`
reading `NA` for birds still alive, the README's *(if applicable)* on `death_year` saying so. `NA`
counted as non-numeric rather than missing is pos-44's shape.

**No arm has run on pos-28.** §6.4's ordering holds.

**C18 — pos-30, the structural reason. The recorded deterministic relation is the wrong one. Logged S400.**

**The re-answer pass under §21 returns *contradicts*, and what it contradicts is a fact this cell
records as established before any arm ran.** No answer moves.

**The cell states that `billet_circumference_cm` and `billet_diameter_cm` are geometrically related,
*one being π times the other*. They are not.** Checked against the ten rows visible on the import
screen: 45.36 against 14.21 where circumference ÷ π is 14.44; 44.14 against 13.63 where it is 14.05;
52.71 against 16.88 where it is 16.78; 60.72 against 18.59 where it is 19.33. **Off by 0.6% to 3.8%,
and in both directions** — two separate measurements of an irregular billet rather than one computed
from the other. **The README supports that reading:** *bark surface area was calculated from billet
length and circumference measurements*, so circumference is what the derivation uses and diameter is
measured beside it.

**And a relation that does hold was missed.** `brood_total` equals
`total_ips_count_per_billet` + `total_parasitoids_per_billet` on all ten visible rows — 190 + 0 = 190,
13 + 3 = 16, 33 + 6 = 39, 105 + 0 = 105. **A column that is the sum of two others, in the same
six-column analysed matrix, read as a replicate of both.**

**Scope, stated because the evidence is a sample.** The sum is measured on **ten of forty-six rows**,
which establishes the relation on those rows and not on the file. **The circumference-to-diameter claim
is refuted on those same ten**, and refuting a claimed identity needs one counterexample where there
are four.

**Why this matters beyond one cell.** Nine deposits are recorded as carrying a deterministic relation
between columns inside the analysed matrix, in §7's Notes and before any run, on the principle that a
structural fact recorded afterwards is an excuse. **pos-30 is in that class for the wrong reason.** The
membership stands and the relation named does not.

**Two things the README adds.** The design is nested and the product reads both levels — *pine billets
were obtained from two trees at each of four study sites*, so `tree_ID` determines `site` and the twelve
condition levels on screen are four sites plus eight trees. And the sibling file is the same
observations restructured: *the density and parasitism datasets contain largely the same underlying
observations; however, the parasitism dataset was structured to account for the two parasitoid
species.* §6.2 selected the density file and that does not move.

**No arm has run on pos-30.** §6.4's ordering holds.

**C19 — pos-31, the structural reason. The documentation sheet, the untick, and what fragments the partition. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and this is the first deposit to resolve §21.8's
check.** No answer moves.

**The documentation sheet exists and the README duplicates it.** *There are three worksheets. One for
the experiments with females, one for the males, and one with the explanation of the variables.* The
third sheet is the documentation sheet §21.8 rules part of arm B's information set — **and its content
is reproduced in the README's own fifteen-row variable table with levels.** So the check resolves and
costs nothing here: the information set gains no content the README did not already carry. **Recorded
under §21.8.2's rule that a deposit records what its workbook holds rather than leaving it implicit.**

**The untick is confirmed and refined.** `Experimentor` is a genuine two-level factor in the design —
*SN (Sabine Nöbel) / TEK (Tim Erik Kaufmann)* — and the recorded reason removes it because it holds one
distinct value on the `Males` sheet, which the screen confirms. **Both are true: two levels across the
workbook, one on the analysed sheet.** §13.3 reads shape and a column that partitions nothing comes
off, so **the untick stands and §20's hand-run removes a real factor that happens to be constant
here.** `CS1` is confirmed sheet-specific — *first-courtship score (only shown in experiments with
males)*.

**§15.3's fragmentation has a documented cause.** The recorded reason says confirming cannot rescue
this deposit because `TimeDemo` at 52 levels and `Date` at 20 are genuine categoricals that shape-only
keeps; the README confirms them as *date of the experiment* and *beginning of the experiment*. **So the
486 singleton groups are produced by keeping two coordinate columns as conditions, which shape-only
mandates.** That is the third §13.3 tension after pos-03's `Choice` and pos-27's `MtDNA Type` and the
sharpest of them — the first two are outcomes, this is a clock time, and it is what fragments the
partition. **§13.3 stays shape-only (§4.1 C7) and the answer does not move**; §15.3 already records
pos-31's disposition as owed before the sitting.

**The six analysed columns are not one kind of thing**, and the README names each: `Device` is *number
of the set-up*, an apparatus identifier scored `Data`; `Temp` and `Humidity` are room temperature in °C
and humidity in %; `MCS`, `CS1` and `DC` are coded behavioural outcomes at 0/1 and 0/1/2. **`Range
0.000 – 69.00` pools a binary score with a humidity percentage.**

**`ordered` is corroborated by the depositor** — a dated, timed trial log — the second after pos-23.
`Missing 0` beside 371 non-numeric is `NA` counted as non-numeric, the third instance after pos-28 and
pos-44.

**No arm has run on pos-31.** §6.4's ordering holds.

**C20 — pos-32, the structural reason. The analysed matrix is a detection log in image space. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and it confirms the one `(assumed)` answer in
the batch without moving it.** No answer moves.

**`Col 1` is confirmed in the depositor's own words: `[No label]: Row Index`.** The recorded reason
inferred an R rownames export from 52,588 distinct values and the inference was right.

**The answer stays `ordered (assumed)` and the provenance word does not change.** The reasoning is
unchanged — row semantics turns on whether the delivered order is a candidate column's order, and a
row index is the delivery order by construction rather than a measured sequence. **§16.2's rule
governs the word: the provenance records who answered, not whether the answer was good.** The README
does not make arm B the answerer, so `(assumed)` stands.

**Every one of the ten analysed columns is model output, and the README names them.**
*A full list of the detected pods when run on all image slices.* `Year` a calendar year; `Plot` a plot
identifier; `Slice_X` and `Slice_Y` *horizontal and vertical slice index of image with respect to full
plot image*; `X` and `Y` *horizontal and vertical pixel position of detection within the slice*;
`Width` and `Height` *pixel width and height of pod*; `Confidence` *detection confidence*; and
`Pod_Class`. **Not one is a measurement of a plant** — four image coordinates, two indices, a year, a
plot ID, two bounding-box dimensions and a neural network's confidence score. **`Range 0.000 – 2024` is
a pixel coordinate pooled with a calendar year.**

**The deposit's real measurements are in files the shape filter did not select** —
`cowpea_biomass.csv`, `cowpea_leaf_nitrogen_vs_CCI.csv` and `cowpea_architecture.csv` carry dry masses,
leaf areas and branch counts. §6.2 selected this file on cell count and §21.3 holds it.

**Recorded and acted on by nothing.** `Pod_Class` is in the file and not in the README's variable list:
thirteen variables are documented and the screen shows a fourteenth column scored `Data`, holding 0 and
1. **The documentation is incomplete for the analysed sheet.**

**No arm has run on pos-32.** §6.4's ordering holds. Its runtime is unmeasured and it is one of the
five deposits §17.9 runs alone.

**C21 — pos-34, the structural reason. `No` is confirmed and `SpermNo` is not accounted for. Logged S400.**

**The re-answer pass under §21 returns *adds detail*.** No answer moves.

**`ordered` is corroborated by the depositor.** The recorded reason derived measurement sequence from
the column's own behaviour — `No` running 1 to 1,429 over 1,232 rows with six local descents and gaps
where cells were dropped. The README defines `No` as *measurement number assigned to each sperm cell*,
which is that. **Third `ordered` deposit confirmed after pos-23 and pos-31.** The gaps are explained
too: `Missing data: NA` closes the file's variable list, and the screen reads `Missing 0` beside 850
non-numeric, so the `NA`s are counted as non-numeric — the fourth instance of that shape after pos-28,
pos-31 and pos-44.

**`IndID` is confirmed as a repeated-subject key rather than a free identifier** — *individual ID from
which the sperm was sampled*, 74 levels over 1,232 rows, rendered on the confirm card as
`Chromis_notata1` through `9` and `Amphiprion_clarkii1` through `5`. The recorded reason's distinction
holds in the depositor's own words.

**The recorded reason accounts for six of the seven analysed columns.** It reads *six sperm
morphometrics per cell*, which is right about the six. **The seventh is `SpermNo`, *identifier for each
sperm within a given image***, reading 1, 1, 1, 1, 1, 1, 2, 1, 2, 1 down the visible rows and scored
`Data`. That is what puts §4.2's `measurements` at `mixed`.

**An unchecked candidate, recorded with its check named and resting on nothing.** `SpermLength` is
*total length of the sperm cell* and `HeadLength`, `MPLength` and `FlagellaLength` are three named
regions of it, which is the shape of a total-equals-its-parts relation and would make pos-34 a
candidate for the deterministic-relation class. **None of those four columns is visible on either
import screen and the relation is not asserted here.** Four values from one row settle it. **This is
recorded as a candidate precisely because pos-30's cell recorded a relation that ought to have held and
did not** (§4.1 C18).

**No arm has run on pos-34.** §6.4's ordering holds.

**C22 — pos-35, the structural reason. The merged-header mechanism generalises, by a second route. Logged S400.**

**The re-answer pass under §21 returns *adds detail*.** No answer moves.

**The README's variable list is structured as the spreadsheet's spanning header.** Four blocks —
*Hearing Thresholds*, *ABR Metrics*, *Digit Span*, *Speech-in-Speech Recognition* — each with its
sub-items indented beneath, matching the four spanning labels the recorded reason names at widths
6 / 14 / 3 / 3. **The depositor's document carries the structure the product reads none of.**

**And the import screen shows how the header is lost, which extends pos-01 rather than repeating it.**
The sub-header names sit in the data: row 3 carries `R_StandardThreshold`, `R_10and12kThreshold` and
`L_StandardThreshold` in italic, with row 2 entirely empty. **So the header block is three physical
lines — block labels, a blank line, then the sub-headers — and the header-rows control offers 0, 1 and
2.** Setting it to 2 consumes the blank line and still misses the names.

**Both merged-header members are unrecoverable from the shipped surface by different routes.** pos-01's
band labels are merged horizontally over a vertically merged block, so the lost information is the span
and no header-row setting reaches it (§4.1 C5). **pos-35's lost information is a third header line the
control cannot reach.** P222's shared conjunct is confirmed across all three members by the recorded
reason; **the mechanism is now established on two of the three, with pos-14's `A)`–`D)` figure panels
standing as the negative** (§4.1 C11).

**A correction to a claim made during this pass and not in any document.** pos-35 being a single CSV was
offered as a reason its blocks could not be spanning cells. **That is wrong: a CSV carries a spanning
label as a value in the first cell of the block with the continuation cells empty**, which is what the
screen shows and what produces 22 synthesised `Col N` headers of 29. **The file format was never the
predicate; §16.5's predicate is the grouping.**

**No arm has run on pos-35.** §6.4's ordering holds.

**C23 — pos-38, the structural reason. §16.8's ruling corroborated, and twelve deterministic relations. Logged S400.**

**The re-answer pass under §21 returns *adds detail*.** No answer moves.

**§16.8 moved this deposit out of §16.5's naming-scheme class on the reading that `COTO_c` and
`COTO_rate` are a count and a rate rather than one quantity on two samples. The README states exactly
that:** *`XXXX_c` = Count of individuals captured*; *`XXXX_rate` = Nightly capture rate, calculated as
`XXXX_c / Total.Capture.Effort` (individuals per m²h)*. **§16.5's member side requires each column to be
one specimen, replicate or channel; here the suffix names a unit.** A ruling reached from a header list
is confirmed by the depositor, the second such corroboration in the pass after pos-18's.

**Twelve deterministic relations sit inside the analysed matrix, sharing one divisor.** Every
`XXXX_rate` is `XXXX_c` divided by `Total.Capture.Effort`, and **all three quantities are analysed
columns**: twelve counts, twelve rates and the effort, all scored `Data` across 28 columns. The screen
carries an instance — `Total.Capture.Effort` 78.00, `COTO_c` 1.00, `COTO_rate` 0.01, and 1 ÷ 78 rounds
to 0.01. **The deterministic-relation class records one relation per deposit; this deposit carries
twelve of them.** Whether pos-38 is currently in that class is not checked here — the roster lives in
§7's Notes, which no deposit has reached — and this is recorded for whoever writes them.

**`Year` is a data column**, so `Range 0.000 – 2024` pools a calendar year with capture rates running
in thousandths. Second deposit after pos-32 where a year sits among the measurements.

**Both conditions are confirmed by the README** — `Stage` at *Invasion (2017-2019)* and *Establishment
(2022-2024)*, `park_unit` at JECA, MORU and WICA — which are exactly the five levels on the confirm
card. **`Bat.Night` is *sequential survey night number to differentiate surveys that occurred on the
same night at different sites***, and it is a `Label`, so it does not make the row axis a sequence.

**No arm has run on pos-38.** §6.4's ordering holds.

**C24 — pos-39, the structural reason. §21.8 pays out, and one field is left open. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and this is the deposit §21.8 was ruled for.** No
answer moves, and **§4.2's `measurements` is left blank rather than filled** — a blank recording *not
yet classified*, which is the honest state.

**The documentation is a sheet the README points at and does not duplicate.** *In each FIGX.xlsx file,
the data are provided in the second sheet, which has the same name as the corresponding figure. The
first sheet, entitled "FIGX_metadata", provides information about the data, including a description of
the variables, their units, and any transformations applied (e.g., log transformation) prior to
analysis.* **The README carries no variable list at all.** So on the README alone pos-39 is a no-change
row and the definitions sit one sheet away — **unlike pos-31, where the README duplicated the
documentation sheet and §21.8 cost nothing** (§4.1 C19).

**`FIG3_metadata` has not been read, and one clause in that sentence is why the field stays open:**
*any transformations applied (e.g., log transformation) prior to analysis.* **If any of the fourteen
analysed columns is already transformed, that is a fact about the analysed matrix and nothing else in
the deposit states it.** The columns span biomass, cover proportions, vegetation height, sand texture,
`pH` and metal concentrations to 8.7 × 10⁴, all of which are quantities — so the field would read
`measurements` on the headers alone, **and filling it from the headers is what the open sheet forbids.**

**The recorded row reading is corroborated.** `Point ID` runs `CB126`, `CB128`, `CB129` — 146
non-contiguous sampling points with `SITE` at four levels, and no date, run number or transect index
anywhere on the sheet. **So *rows are 146 sampling points* stands and the auto-answer looks wrong for
the reason recorded.**

**`ordered (assumed)` does not move, and the pair it belongs to is now complete.** The product supplied
it from `suggestRowSemantics` returning `{value: "ordered", auto: true, reason: "assay"}` off a
`physiological` detection on a soil-chemistry sheet. **§16.2 governs the word: the provenance records
who answered, not whether the answer was good**, and arm B did not answer here any more than on
pos-32. **Both `(assumed)` deposits are now read — pos-32's auto-answer is plausibly right and this
one looks wrong — which makes that contrast a reading of two records rather than an impression.**

**Recorded and acted on by nothing.** The confirm card's four levels are `3-SubAlp`, `4-SubAlp`,
`5-SubAlp` and **`Between 3-4-SubAlp`** — a boundary between two others standing as a level of its own.
§13.3 reads shape and all four are low-cardinality, so nothing moves.

**No arm has run on pos-39.** §6.4's ordering holds.

**C25 — pos-40, the structural reason. The cleanest naming scheme in the corpus is documented nowhere. Logged S400.**

**The re-answer pass under §21 returns *says nothing about the analysed file*, and on this deposit that
is the result.** No answer moves.

**Ten files share half a line.** The README lists `env.csv`, a diversity table and two dissimilarity
matrices with column-by-column variable definitions, then: *5-14): ASVs abundance tables for fungal (f)
and bacterial (b) groups.* **No sample-code scheme, no explanation of `BAD_01`, no statement of what the
values are.** §16.5 records pos-40 as its cleanest naming-scheme instance — 416 sample columns on a
three-letter prefix with a two-digit suffix — and **the deposit whose columns most obviously carry a
design is the one that documents them least.** §16.1's ruling stands on the file's structure alone, as
it did before this pass.

**The sampling text explains the prefix by inference rather than by statement.** *At each site, five
soil cores were homogenized from a 1×1 m plot… plots adjacent to 1, 10, 50, 100, 200 and 400 m in each
cardinal direction from a central plot… total soil samples per island range from 13 on smaller islands
(e.g., GZD, WZD, and XGD) to 41 on larger islands (e.g., DZD).* **The three-letter form is an island
code and the README's own examples are in it.** One refinement to the recorded reason follows: **the
two-digit suffix is a plot, not a replicate** — plots at different distances from the island centre are
the study's spatial gradient rather than repeats of each other. **Island names are withheld** *due to
national security regulations*, so the codes are all there is.

**Recorded and drawn on for nothing.** `env.csv` and the alpha-diversity table are documented as
carrying log₁₀-transformed and normalized columns. **Those are other files**; it says the depositor
transforms before depositing and says nothing about this matrix.

**Nothing changes what the assay detector saw.** METHODOLOGY's genomics auto-route to `arbitrary` did
not fire because the detector returned `general` on an ASV table, so arm A substitutes `ordered` here.
**A README cannot reach a detector.**

**No arm has run on pos-40, and none will complete on arm A** — the heap exhausts at 3,472 MB and
aborts at 17.6 s before the battery, which §17 records as an outcome rather than a failure. Its 98.87%
zero fraction is the reason.

**No arm has run on pos-40.** §6.4's ordering holds.

**C26 — pos-41, the structural reason. The definitions are in a file the shape filter did not select. Logged S400.**

**The re-answer pass under §21 returns *adds detail* on what the file is and *says nothing* about the
columns.** No answer moves.

**The variable definitions exist and are delegated a third way.** The README's first entry is *Legend
with the complete list of trait and environmental variables with descriptions, symbols, and units
(legend.csv)*, and its entry for the analysed file is one line — *SNP effects on traits and
environmental variables derived from Bayesian sparse linear mixed model (BSLMM) analysis performed in
GEMMA*. **No trait prefix is explained and no `ABA`/`ADA`/`mean` triple is defined.**

**§21.8 does not cover this and named it in advance.** pos-18 and pos-21 delegate into a sheet of the
analysed workbook and pos-39 into sheet 1 of the same workbook; **§21.8 rules all three in scope.
pos-41 delegates into a separate CSV in the same deposit** — neither the README, nor the published
metadata fields, nor the analysed data file. **§21.8.3 records this as unsettled and states that no
deposit had raised it; one has now, and it is the last unread naming-scheme member.** A ruling is owed
and the answers do not turn on it.

**The recorded classification holds on the header text alone.** `e_ABA_um2`, `e_ADA_um2` and
`e_mean_um2` are visible on the import screen — abaxial, adaxial and mean, in µm² — matching the
recorded six trait families crossed with three surfaces, and `i_ABA_unitless` carries its unit in the
name. **Confirmed by the headers rather than by documentation.**

**The file is model output, stated.** SNP effects from a Bayesian sparse linear mixed model in GEMMA,
which the screen shows as effect sizes around ±0.01 with the `i_` family at 10⁻⁷, `Precision mixed
(0–9dp)`, `Integer values 7%`.

**`arbitrary` is untouched.** The README says nothing about ordering, so the recorded reason stands as
written: the rows are in coordinate order, and adjacent SNPs are in linkage disequilibrium, so serial
structure along that axis is biological rather than forensic — METHODOLOGY's own canonical case.
`Missing 0` beside 31,164 non-numeric is the README's *missing values were coded as NAs*, the fifth
instance of that shape after pos-28, pos-31, pos-34 and pos-44.

**No arm has run on pos-41.** §6.4's ordering holds.

**C27 — pos-43, the structural reason. §19.1's block figures do not match the picker. Logged S400.**

**The re-answer pass under §21 returns *adds detail* on the columns, and the block picker on the import
screen does not agree with §19.1.** No answer moves.

**The measurement scheme is documented in full.** The README defines every abbreviation in mm — `aIL`,
`apl`, `bcl`, `ctl`, `jl`, `onl`, `zw` and the whole cranial and dental series. **Columns-as-variables
is confirmed by the depositor**, and the recorded reading of `P1L` and `M2W` as different quantities on
one specimen rather than one quantity on different samples is that scheme read straight off.

**The blanks are explained and `arbitrary` is untouched.** *Any NAs and empty cells represent missing
data.* So `Count` is blank on 436 of 873 rows because those specimens have no count, not because of any
structure, and the recorded contradiction between an ascending `Count` and a taxon-grouped listing
stands. `Missing 37,486` is real missingness, unlike pos-08's structural blanks.

**The picker reads figures §19.1 does not carry.** §19.1 records four blocks at **873, 506, 32 and 182
rows and 70, 71, 71, 69 data columns**, with arm A scoring 873 of 1,593. **The screen shows Block 1 at
452 data rows, Block 2 at 310, Block 3 at 20 and Block 4 at 110, all at 80 cols** — and the summary for
the selected Block 1 reads **`Rows 873`, `Data cols 70`**, with a banner recording *trimmed 49 trailing
rows*.

**Two row counts for one block appear on one screen, which is the family §19.1 was written to
correct** — *the picker's display heuristic read as the analysed count, where three different row
counts were in play on one block of one file.* **Nothing is adjudicated here.** Which of 873 and 452 is
the analysed count, and whether 1,593 is the right denominator when the four picker figures sum to 892
before the 49 trimmed rows, are questions for a read of the picker rather than for this entry. **This
is a check owed before scoring, alongside pos-23's block count (§4.1 C15), and the two are the same
shape.** 80 cols against 70 data columns is the ordinary post-inference difference and is not in
question.

**Recorded and acted on by nothing.** The confirm card carries both `Skull only` and `skull only`, and
both `Skin present` and `skin only` — variant spellings of one answer standing as separate levels, in
the deposit rather than in this record.

**No arm has run on pos-43.** §6.4's ordering holds.

**C28 — pos-44, the deposited file is synthetic and the depositor says so twice. Logged S400.**

**The re-answer pass under §21 returns *contradicts*, and what it contradicts is not a cell but an
assumption the screen rests on.** No answer moves and the refusal is untouched.

**The README states it in two places.** *A synthetic but structurally representative subset of the
cleaned acoustic telemetry detection data.* And: *the subset is synthetic and does not represent actual
permit detections. Coordinates are constrained to the real WDR receiver array footprint… and detection
intensities are designed to satisfy all data sufficiency thresholds used in the manuscript (≥ 50 total
detections per fish; ≥ 24 hourly COAs per fish-month; ≥ 3 unique days per fish-month).* **The real data
is withheld** — *due to the sensitive nature of the original data and ongoing conservation efforts, the
full dataset is not publicly archived.*

**Why this reaches the screen rather than only this deposit.** §3 samples deposits without reference to
any allegation so that the screen measures how often the battery flags honest data. **pos-44 is
generated data built to clear stated numeric thresholds** — eight simulated fish, all twelve calendar
months, detection intensities designed to satisfy three inequalities. A battery run on such a file
returns a statement about a generator.

**Nothing is compromised today.** pos-44 is one of the three §2.8 refusals — twelve columns to one data
column, `timediff` surviving — so **no verdict will be produced on either arm.** That is fortune rather
than design. **n stays 30 regardless:** §22.2 forbids dropping it and §21.3 forbids re-selecting, and a
deposit is not excluded for what its documentation says. **What is owed is a ruling on whether
*deposited data is synthetic* should be recorded as a property, and whether any other deposit in the
thirty carries it.** Neither is decided here.

**Two confirmations.** `timediff` is *minutes elapsed since the previous detection for the same fish
(NA for first detection)*, and the eight non-numeric cells are exactly the eight simulated fish's first
detections. And **§2.8's cause is confirmed in the depositor's own words** — `Date` holds `month` and
`year`; `station` is a *unique receiver station identifier*, so `lon` and `lat` are constant within it
by construction. The hold-out is correct against its specification, as P218 records.

**No arm has run on pos-44.** §6.4's ordering holds.

**C29 — pos-45, the structural reason. Both axes are wrong and the answer stands anyway. Logged S400.**

**The re-answer pass under §21 returns *contradicts*, and this is the first entry where a documented
fact bears on an answer rather than only on its reason.** The answer does not move.

**The depositor states the file's geometry.** *The first row contains the excitation wavelength [nm].
The first column contains the emission wavelength [nm]. The second to last rows and columns contain the
fluorescence intensity (arbitrary units) for each combination of excitation and emission wavelength.*
The instrument parameters give the ranges: **excitation 200 to 500 nm and emission 200 to 700 nm, both
at 5 nm intervals.**

**The recorded reason has both axes wrong.** It reads *the headers are a wavelength sweep, `200`
through `700`* — the column headers are excitation, which stops at 500 — and *rows are 101 spectra with
nothing naming or ordering them*. **The rows are emission wavelengths and column A is the emission
axis**, ascending 200, 205, 210, 215 on screen, scored `Data` and named `Col 1`. So **the analysed 102
columns are the emission coordinate plus 101 excitation channels**, and the file is one two-dimensional
grid rather than 101 spectra.

**`arbitrary` does not move, and its ground is restated rather than repaired.** The recorded ground —
*nothing names or orders the rows* — is false. **Three things hold the answer in place.** §16.2 records
an answer when it is made and corrects it with its reason rather than revising it; **§6.4 constrains
exactly this, an answer changed on documentation read after the fact**; and an emission-wavelength axis
is an ordered physical scale rather than a sequence anything was measured along in time, which is
METHODOLOGY's canonical arbitrary case beside gene lists and genomic coordinates. **So the answer is
plausibly right for a better reason than the one recorded, and this entry states the better reason
without claiming the old one.**

**A saturation sentinel occupies a diagonal band of the matrix.** The screen shows `9999.9` wherever
emission approaches excitation — where scattered excitation light swamps the detector — against `Range
2.959 – 1.000e+4` and `Integer values 13%`. **It is an out-of-range code rather than a measurement and
the README does not document it as one.** Recorded, not predicted: what a duplicate or terminal-digit
test makes of thousands of identical `9999.9` values is for the arms to say.

**The file is the experiment's control, documented.** *FF of barium sulfate powder*, against five
eggshell files described as *FF of eggshell embedded in barium sulfate powder*. §6.2's six-way
tie-break landed on it and §21.3 holds the choice; **what changes is that the tie-break's outcome is
now documented rather than inferred from the filename.**

**No arm has run on pos-45.** §6.4's ordering holds.

**C30 — pos-46, the structural reason. Three documented derivation chains inside the matrix. Logged S400.**

**The re-answer pass under §21 returns *adds detail*.** No answer moves.

**The depositor states two derivation rules that reach the analysed columns.** `pdw.total.22` is
*percent dry weight total SPGs from 2022* and salicin, salicortin and tremulacin are its named
constituents — **all five are `Data`.** The visible rows agree to the rounding: 1.011 + 6.043 + 5.449 =
12.504 against a recorded 12.505, and 0.963 + 6.624 + 6.784 = 14.371 against 14.372. **Checked on two
rows of 264 and recorded as that.** The same structure repeats for 2023. **And the five `d.` columns
are stated differences** — *change in percent dry weight* of CTs, total SPGs, salicortin, salicin and
tremulacin from 2022 to 2023, each one column minus its partner, **with all of them in the matrix
together.**

**So the fifteen analysed columns are ten measurements, two totals derived from six of them, and five
differences derived from pairs of them**, and the product reads all fifteen as replicates of one
measurand. `Range -35.81 – 44.34`, the negatives being the differences. **Third relation-carrying
deposit found in this pass after pos-30 and pos-38, and the only one where the depositor states the
rule** (§4.1 C18, C23).

**§16.5's mixed classification is confirmed.** Five phenolic compounds crossed with two years —
`pdw.{cts,salicin,salicortin,tremulacin,total}.{22,23}` — sitting beside `population`,
`treatment.y1`, `treatment.y2` and `group` as genuine condition columns, which is the recorded reason's
*the header carries a grouping the gate cannot express while genuine factors sit next to it*.
**`group` is itself derived:** *three year treatment pattern (CCC, CDD, DCD, DDD)*, a deterministic
function of the yearly treatment columns. §13.3 reads shape and all four stand.

**The row reading is corroborated and the auto-answer is untouched.** `sample.id` is *individual tree
identifier*, 259 distinct over 264 rows, with no date, run number or index. **The `qpcr` detection on a
plant-chemistry sheet remains wrong and `ordered (assumed)` remains the product's answer rather than
arm B's**, on §16.2's rule, as on pos-32 and pos-39.

**No arm has run on pos-46.** §6.4's ordering holds.

**C31 — pos-47, the structural reason. P217 confirmed, and the refusal has two causes not one. Logged S400.**

**The re-answer pass under §21 returns *contradicts*, on the count in the recorded reason.** No answer
moves and the refusal is untouched.

**P217 is confirmed in the depositor's own words.** `length_cm_1`–`length_cm_5` are *heights (cm) of up
to five randomly selected shoots*, and **the screen shows all five scored `Cond` with `2.3`, `1.9`,
`2.8`, `4.7` and `3.7` standing as condition levels** — shoot heights in centimetres read as levels of
a factor. **And the README explains why the 40-row window is 200 cells of `NA`:** *for the shoot height
variables, `NA` indicates that fewer than five shoots were present in the plot during that sampling
event.* The first four surveys have `shoot_count` 0, so **the early rows are structurally `NA` and the
window lands entirely inside them.** P217's misreading is produced here by the study's own timeline.

**The recorded count of surviving data columns is wrong.** The cell reads *§2.8 is the sole cause:
without the hold-out the sheet carries 3 data columns*. **§2.8's half is confirmed** — `seed_density`
and `burial_treatment` are `Attr`, held out as constant within `plot_id`, and the README's *fully
factorial design… each treatment combination replicated four times, resulting in 80 experimental plots*
monitored fortnightly is why a plot's treatment is fixed. **But the five `length_cm` columns are absent
from that count and they are the deposit's actual measurements.** With P217 corrected as well the sheet
carries eight. **The refusal has two independent causes and the cell names one as sole.**

**The row reading is confirmed.** *Each row represents one plot surveyed on one sampling date* — 80
plots across fortnightly surveys from November 2025 to April 2026, giving the screen's 760 rows.

**No arm has run on pos-47.** §6.4's ordering holds.

**C32 — pos-49, the structural reason. A stated ratio in the matrix, and a sequential index that is not sequential. Logged S400.**

**The re-answer pass under §21 returns *contradicts*, on the ground the row-semantics answer was let
stand.** No answer moves.

**A deterministic relation the cell does not carry.** `dry_wetratio` is *dry weight / wet weight* in the
depositor's own words, and `WetWeight` and `DryWeight` are both analysed columns. Checked on the three
visible rows: 32.68 ÷ 70.6 = 0.463, 15.941 ÷ 31.3 = 0.509, 16.214 ÷ 32.4 = 0.500, against recorded
values of 0.463, 0.509 and 0.500. **Three rows of 1,857, recorded as that.** The cell records §2.8
moving three columns and names `Treenr` and `Height` as the mutually-constant pair; **it does not
mention that three of the five surviving analysed columns stand in an exact ratio.** Fourth
relation-carrying deposit in this pass after pos-30, pos-38 and pos-46 (§4.1 C18, C23, C30).

**The row-semantics ground is false.** The cell lets `ordered (assumed)` stand because *`ID` runs 1,857
distinct numeric values over 1,857 rows and reads as a sequential index*. **The import screen shows `ID`
reading 915, 916, 917, 918, 927, 919, 939, 920, 215, 608 down the first ten rows** — not sequential and
not in delivered order. **The delivery order is by tree:** `Treenr` holds 6 for eight consecutive rows,
then 3, then 5. A shoot ID is a specimen label and the file is sorted by tree, which the README
confirms — *shoots were sorted by tree and branch whorl and placed in separate bags*.

**`ordered (assumed)` does not move.** §16.2 governs the word: the provenance records that the product
answered, not that the answer was good, and arm B did not choose it. **What changes is that the third
`(assumed)` deposit now reads differently from how it was recorded** — pos-32's `Col 1` is a genuine
row index, pos-39's auto-answer looks wrong, and **pos-49 was recorded as plausibly right on a ground
the screen does not support.** The screen also shows the auto-answer's own reason, *Auto: instrument
assay*, from a `physiological` detection on a shoot-allometry table — the seventh detector case.

**The row count is confirmed exactly.** *In total 1857 shoots were recorded from the nine sampled
trees*, against `Rows 1857`.

**No arm has run on pos-49.** §6.4's ordering holds.

**C33 — pos-50, the structural reason. The deposit calls the analysed file a name key. Logged S400.**

**The re-answer pass under §21 returns *says nothing about the analysed columns*.** No answer moves.

**The depositor's whole description of the file is a lookup table.** *In some analyses, particularly
section 8, alternative naming systems were used, ToLIDs (e.g. mAntPal2.1.pri) vs. Senckenberg IDs (e.g.
HLantPal2). Replacing those names in the very, very large whole genome alignment files is prohibitively
time consuming, thus we are providing this file as a key for interconversion.* **Two sentences, in a
README of 1,145 lines that documents the deposit's other files in detail.** No variable list, no
mention of the three gene counts, no mention of `Contig N50 (L50)`. The import screen matches: `Species`,
`Bat family`, `Assembly name (Senckenberg)` and `Assembly name (ToLID)` are four columns of names.

**So the recorded compositional question stays open, and now with a reason.** The cell records the three
TOGA gene counts — intact, inactivating-mutation and missing-sequence — as *possibly compositional; not
verified*. **The README never names them, so it cannot settle it**, and the three columns are not
visible on either screen. **A sum to a constant is plausible against the deposit's own GENCODE v38
figures of 39,664 transcripts from 19,456 protein-coding genes, and that is arithmetic about a
reference annotation rather than a measurement of this file.** Three values from one row settle it;
**recorded as owed rather than asserted, on pos-30's precedent** (§4.1 C18).

**Row structure confirmed from the screen.** 147 assemblies over 103 species, so assemblies repeat per
species — `Artibeus lituratus` at `HLartLit1A` and `HLartLit1B`, `Brachyphylla cavernarum` likewise.
The single ticked column `Bat family` holds 21 levels, all rendered, and is a genuine categorical, so
§13.3 leaves it. `arbitrary` stands: no date, run number or index anywhere.

**No arm has run on pos-50.** §6.4's ordering holds.

**C34 — pos-51, the structural reason. Two derivations stated and checked exactly, and the `*_nir` cause is missingness. Logged S400.**

**The re-answer pass under §21 returns *adds detail*, and this is the last deposit of the thirty.** No
answer moves.

**Both derived columns are defined by the depositor and both check on screen.** `aspect_ratio` is *4 ×
(forewing length)² / forewing area*: 4 × 22.722² ÷ 218.405 = 9.4556 against a recorded 9.4556, **exact
to the last printed digit**. `wing_loading` is *dry body mass divided by total forewing area*: 16.6 ÷
218.405 = 0.07601 against a recorded 0.038002793, and 14.7 ÷ 192.763 = 0.07626 against 0.038129724 —
**each recorded value is exactly half the quotient**, which is *total* forewing area being both wings
where `fw_area` is one. **So the relation holds as `total_mass ÷ (2 × fw_area)` and the depositor's word
*total* is what carries it.**

**Five of the nine analysed columns are involved and two are computed from the other three.** Fifth
relation-carrying deposit in the pass, **and the only one where both derivations could be checked to
the last digit rather than to the rounding** (§4.1 C18, C23, C30, C32).

**The `*_nir` cause is missingness, not an abstract fraction.** The cell records six `*_nir` columns
scored `label` *on a numeric fraction near 0.47*. The README defines all six as *near-infrared
reflectance (%)* of named wing regions — **six genuine measurements outside the analysed matrix** — and
the screen gives the mechanism: **650 non-numeric cells against `Missing 0`**, with *missing values are
coded as NA in all data files* and row 3 showing a specimen `NA` across every measurement. **The
fraction is produced by the missing-data code.** Six real measurements are excluded from the analysed
matrix by a string.

**`ordered` holds and the contrast the cell draws with pos-43 survives.** `SampleID` reads 4, 5, 6, 7,
8, 9, 10, 11 down the visible rows, filled on every row and one per specimen, with `CollectionDate`
moving 6/16/22 to 6/17/22 in step; the README confirms *unique identifier for each butterfly* and
collection *during the summer of 2022*. **pos-43's `Count` is blank on 436 of 873 rows and pos-49's `ID`
is not in delivered order; this one is what the recorded reason says it is.** The row count is
confirmed exactly at 571.

**No arm has run on pos-51.** §6.4's ordering holds.

**The re-answer pass is read on all thirty deposits** — §21.3's *all thirty or none* is satisfied, with
pos-39's §4.2 `columns` and `measurements` held open pending `FIG3_metadata` (§4.1 C24) and no arm run
on any deposit.

**C35 — pos-39, §4.2's open fields, closed on the workbook's documentation sheet. Logged S400.**

**This supersedes C24's open cell.** §4.2's `columns` and `measurements` were left blank there pending
`FIG3_metadata`, sheet 1 of `FIG3.xlsx`, which §21.8 puts in arm B's information set. The sheet has now
been read. **No answer moves and the two fields are filled.**

**The transformations belong to the authors' analysis and not to the deposited values.** Every
transformation note on the sheet has the same form — *before performing the PCA, values were cube root
transformed*, *arcsin transformed*, *square root transformed*, *log transformed*, in each case *to
better fit a normal distribution and avoid strong influence of extreme values*. **The deposited columns
are untransformed and the data shows it:** `Green_Biomass` reads 14.22, 9.17 and 0.49 on `FIG3A`, which
a cube-rooted dry mass would not, and `Cd_AA` runs 1.51 to 19.26 with `Zn_TOT` reaching 50,210 — raw
concentrations rather than logs.

**That is the clause the cell was held open for**, and the answer is the one the column headers already
suggested. **Filling the field from the headers would have produced the same value by a process the
open sheet forbade**, which is why the blank was carried rather than guessed.

**All fourteen analysed columns are measured quantities in stated units.** Dry mass in g harvested on
1/16 of a square metre for the two biomass columns; proportions on [0,1] for rock and bare-soil cover;
mean vegetation height in cm; `Sand_texture` and `Clays` as weights in g kg⁻¹ after sieving at 2 mm;
`pH` measured in water; `Cd_AA`, `Zn_AA`, `Cd_TOT` and `Zn_TOT` as concentrations in mg kg⁻¹; `OM` as
total organic matter in g kg⁻¹.

**`C:N` is a derived ratio and it carries no in-matrix relation.** The sheet gives it as *the ratio of
total carbon: total nitrogen*, and **neither constituent is a column of this sheet.** Recorded because
the pattern went the other way five times in this pass — pos-30, pos-38, pos-46, pos-49 and pos-51 each
carry a derived column beside the columns it is derived from (§4.1 C18, C23, C30, C32, C34) — **and
pos-39 is the case where a derived column's inputs are absent.**

**Two confirmations.** The sheet documents four data sheets in one — `FIG3A` through `FIG3D`, each with
its own column list — which is why §6.2's *2 of 5* leaves four data sheets beside the analysed one. And
**`Between 3-4 SubAlp` is a real sampling site named by the depositor**: *one site is located between
site 3-SubAlp and 4-SubAlp, and is named "Between 3-4 SubAlp" here.* C24 recorded that fourth condition
level as a boundary standing as a level of its own; **§13.3 kept it on shape and the documentation
confirms it is a site.**

**§21.8 pays out here in the way it did not on pos-31.** On pos-31 the README duplicated the
documentation sheet, so the rule cost nothing and changed nothing. **On pos-39 the sheet carried
something no other document in the deposit did**, and it is the one cell in §4.2 that was blank because
of it.

**No arm has run on pos-39.** §6.4's ordering holds.

**C36 — pos-44, the ground C28 states is wrong, and the property becomes a recorded field. Logged S401.**

**No answer moves and the refusal is untouched.** This corrects a reason inside an earlier correction
and lands beside it, on §6.4.

**C28's stated ground does not hold.** It says the pass contradicts an assumption the screen rests on
— that §3 samples without reference to any allegation *so that the screen measures how often the
battery flags honest data*. **Screen §4 says the opposite in as many words:** *these deposits are
unadjudicated, not honest*, nothing here establishes that any of them is genuine, and the quantity
measured is a flag on a deposit with no known complaint. **pos-44 contradicts nothing the screen rests
on**, and C28's sentence *what it contradicts is not a cell but an assumption the screen rests on* is
superseded by this entry.

**What C28 recorded correctly stands.** The two README statements, the three data-sufficiency
thresholds, the withheld real data, the eight simulated fish, and the reading that a battery run on
such a file returns a statement about a generator. **The observation was right and the reason given
for why it reaches the screen was not.**

**Screen §23 is the ruling C28 said was owed.** A `provenance` field of `declared generated`,
`not declared` or `undetermined`, recorded in §4.2 beside §22's three fields, acted on by nothing.
**pos-44 is `declared generated`.**

**The column is not written yet and that is deliberate.** §23.4 requires the census before the column
lands, because one value beside twenty-nine blanks is what §22.1 forbids. **The census is a keyword
read of all thirty READMEs and abstracts, not a `grep` over this document** — this document was
written to record structure and a count taken from it would be a count of what somebody happened to
write down.

**No arm has run on pos-44.** §6.4's ordering holds.

**C37 — pos-41, the delegation is ruled in scope and no answer moves. Logged S401.**

**Screen §21.9 rules that a file in the deposit whose content documents the analysed file's variables
is part of arm B's information set**, which is the ruling C26 recorded as owed. **`legend.csv` is in
scope.**

**pos-41's answers do not move and none of its recorded reasons changes.** C26 records the
classification as confirmed by the header text alone — `e_ABA_um2`, `e_ADA_um2`, `e_mean_um2` and
`i_ABA_unitless` read off the import screen — so the ruling costs this deposit nothing. **`replicates`
and `arbitrary` both stand, and `structure inexpressible` is unaffected.**

**What the ruling does cost is a census, recorded here so it is not left implicit.** §21.9.2 requires a
read of all thirty READMEs' own file lists for a named documentation file, with a recorded *names
none* where there is none. **§6.2 recorded the file selected and not the files present, so no column
in this document answers it.** The pass read every README for structure, not for file lists, and
pos-41's legend was caught only because it was the first entry.

**Two cells §21.8.2 left as a likelihood are owed with it.** pos-01 and pos-08 are disposed of there on
the ground that their READMEs document every sheet, so neither is *likely* to hold documentation the
pass has not seen. **§21.8.2's own next rule requires a recorded none**, and pos-01 has six unexamined
sheets behind that likelihood. Both reads combine with §21.9.2's census.

**If a documentation file moves an answer on any deposit, the change is logged as a §4.1 correction
citing §21.9**, so a reader can see that the answer moved on a document read after the rule was
written.

**No arm has run on pos-41.** §6.4's ordering holds.

**C38 — pos-23, the block check answered. The file has three blocks and the product reaches two. Logged S401.**

**No answer moves. Both recorded figures are corrected and one is a product defect rather than a
record error.**

**The owed check expected a stale block count.** What it found is that §19's *two blocks* correctly
described the product and the depositor's *three vertically stacked data blocks* correctly described
the file. **Screen §19.2 carries the mechanism**; this entry carries what it costs the deposit.

**Measured on the file.** 2,198 lines, blank rows at 733 and 1466 only, three segments of 732 lines
each carrying a label, a header and **730 data rows**. **2,190 data rows in the deposit.**

**Measured in the product.** *Stripped 1 preamble row · trimmed 733 trailing rows*, then two blocks of
730 × 5 offered. **733 is the separator plus the whole of block 3**, removed by `preprocessRaw`
because block 3 is `Date, Q` padded to five commas and carries two filled cells against a `minCells`
of 3.

**§4.1 corrects two figures.** **Arm A scores 730 of 2,190 rows, a third — not the *exactly 50%*
recorded**, which described the trimmed matrix. And **§19's two-block count is the product's, not the
file's**.

**Discharge is absent from both arms.** Blocks 1 and 2 are water level and flow velocity under
identical headers; the third measured quantity is unreachable. **`preprocessRaw` runs before both arms
identically, so the arm difference is unaffected and this does not stop scoring** — but §7's count for
pos-23 records that its analysed matrix is one block of three.

**pos-23 is also a §23 `declared generated` member** (§4.3), so its analysed matrix is a third of a
deposit whose values are modelled. Both facts are recorded and neither is acted on.

**No arm has run on pos-23.** §6.4's ordering holds.

**C39 — pos-43, the block check answered. Two quantities were read as two counts. Logged S401.**

**No answer moves and pos-43 carries no defect.** The check is answered as an error in our record.

**`blockSummary` returns `rows: block.length` and `dataRows` separately** (`parser.js:81`), where
`dataRows` counts rows with more than 30% numeric cells, **and the picker renders `dataRows`.**

**So §19.1's 873 / 506 / 32 / 182 are line counts and the picker's 452 / 310 / 20 / 110 are data-row
counts. Both are correct.** Measured: block 1 spans 874 lines and holds **452 rows above the product's
own 30%-numeric rule**, matching the picker exactly.

**The file's structure is confirmed independently.** Blank rows at 875, 1383, 1417 and then 48
contiguous at the end; four segments of 874 / 507 / 33 / 184 lines. **The four blocks reach the picker
and the 48 trailing blanks are what the trim exists for.**

**One figure is not settled.** A naive comma split reports 80 to 83 fields per line against §19.1's
70 / 71 / 71 / 69 data columns. **`awk -F,` inflates on quoted commas, so 80 is a ceiling for the
naive split and not a measurement of the file.** Recorded as open rather than reconciled.

**Screen §19.2.4 supersedes §19.1's labels rather than editing them.** §19.1 was written to correct a
display metric read as an analysed count and then made a neighbouring version of the same error.

**No arm has run on pos-43.** §6.4's ordering holds.

**C40 — pos-08, the confirm card renders eleven condition columns and §4 records ten. Logged S402.**

§4's cell reads `confirmed with 2 unticked — 8 of 10 (user-set)`. **The card as rendered lists eleven:**
`Description`, `Score Sequest HT: Sequest HT`, `Marked as`, `Abundance: 20:1 NR : Sample`, and seven
`Found in Sample Group` columns — S1, S2, S4, S6, S8, S10, S12. **The cell becomes
`confirmed with 2 unticked — 9 of 11 (user-set)`.**

**No answer moves.** The two unticked columns are unchanged and named exactly as §4 names them; this is
a denominator correction, logged rather than overwritten per §6.4.

**The ten came from arm A, not from the product.** `corpus-out/round2-arma-pos-08.json` reports
`nCondCols: 10` and assigns `Description` the role `label`. §4's cell was recording the headless path's
count. **The divergence is not cosmetic:** `Description` is free text with many distinct values, so
including it shatters the partition — **arm A 107 groups, largest 1,338 rows; arm B 1,151 as offered
and 1,116 after the untick.** **This is why pos-08's §7 arm difference may not be cited as the cost of
the default** — §2's subtraction carries a role divergence as well as the gate answers. Recorded as a
register item; the source read on why the two paths infer differently is owed and is not a run.

**C41 — pos-18, the analysed matrix is 147 columns, closing a §4.1 check. Logged S402.**

The README describes **200 species columns**; §7's counts recorded **147**. The arm-A artifact
`corpus-out/round2-arma-pos-18.json` reports `nRows: 144, nCols: 147`. **The README's 200 do not all
reach the analysed matrix and §7's count stands.**

**Read off the artifact rather than the workbook, and after the run rather than before it.** Permissible
because it corrects a count and moves no answer; §6.4 governs answers, and the check was owed as a
reconciliation rather than as an input to one.

**A cost fact belongs beside it.** The run took **2,244 s** against 105 s for the other eighteen
deposits in the same loop combined, and `Inter-Replicate Correlation` threw inside it, so severity 3 was
computed over 28 tests. §7 carries both.

**C42 — pos-40, the confirm-gate answer was never exercised on arm B. Logged S402.**

§4's cell reads `confirmed with 3 unticked — 3 of 6 (user-set)`. **The browser run crashed inside the
battery, upstream of the card, so the gate never rendered and the three unticks were never applied.**

**§4's cell stands as the pre-run answer, unrevised.** §13.3 requires a non-rendering gate recorded
rather than left blank; it is recorded in §7's Notes with the failure that caused it.

**A note on the run order.** §20 fixed pos-08, pos-31 and pos-40 as hand-runs with arm B first, and all
three were taken in that order before any arm-A verdict on them was seen. pos-40 is the one where arm B
produced no verdict to compare.

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
| 1 | mixed | mixed | measurements | **§22.1's own example, measured before either arm ran.** The analysed matrix is 16 × 15 = 240 values: fifteen element rows and a `TOTAL` row, last, which is their sum. **`rows` is `mixed`** because a derived total sits in the same matrix as the measurements it aggregates — the case §22.1 names. **`columns` is `mixed` on that same fact read down the column:** every column holds fifteen element wt% values and their own sum, so its last cell is a different quantity from the fifteen above it. **The three bands do not bear on `columns`** — 5 `Anhydrous MORB glass` at B:F, 6 `silicate part of the melt` at G:L and 4 `Metals` at M:P, confirmed at source — because that is a difference across columns and §22.1's test is per-column. **`measurements` is `measurements`:** electron microprobe wt% compositions are quantities. **Two caveats recorded and acted on by nothing:** the depositor states that initial, starting and silicate products have all cations as oxides while metals are elemental without any O, so the analysed set pools **eleven oxide-basis columns with four elemental** ones; and low totals are stated to reflect unmeasured volatile species, so `TOTAL` is informative rather than a checksum. §4.1 C5. |
| 2 | one population | one variable each | not measurements | **The first `not measurements` in the corpus, and §22.3's worked case.** Every row is one marine invertebrate fossil occurrence — the README states 26,532 occurrences from 1,149 collections and 2,474 genera, matching `Rows 26532` on screen. The single analysed column is `collection_no` throughout, a PBDB accession number at 307–219,900, integer, 0dp. **Not one of the twenty-one columns is a quantity measured on the specimen:** an accession number, a genus name, a plate assignment, six coordinates of which two are model reconstructions, four stratigraphic labels, four interval boundary ages and a duration that are properties of the bin rather than the occurrence, two spatial-grid identifiers, a 1-to-7 interval index and a formation name. **A flag here would say the product should not have analysed the file, not that the statistics are miscalibrated** — the applicability line reads *Unusual digits 2/5*, the Benford family considered applicable to a database accession number. §4.1 C6. |
| 3 | one population | one variable each | mixed | **One of the two analysed columns is a free identifier.** Every row is one harvestman in a choice trial; `Individual_ID` is *the unique identifier ID for each individual* in the depositor's words, running to 160 over 150 rows. `Number_of_legs` is *the exact number of legs that each animal had when found*, values 4 to 8 — a genuine count measured on the individual. Neither column changes meaning down the rows, so `columns` is `one variable each`; **`measurements` is `mixed` because one of the two is an identifier and the other is a count**, and a flag driven by `Individual_ID` would be §22.3's first kind. `Data cols 2`, `Values 300` over 150 rows. §4.1 C7. |
| 7 | one population | mixed | measurements | **`Unit` is either basal area increment or ring width, per row, so one year column holds two different physical quantities.** Every row is one growth series from one population; 210 populations from 62 studies, `Rows 210`. The analysed 74 columns are the years **1950 to 2023** — corrected from the recorded 1950–2019 at §4.1 C8 — each *value of growth in YYYY extracted from the growth series with webplotdigitizer*. **`columns` is `mixed` on the depositor's own statement about `Unit`**, and the values are further detrended by six different methods across rows. **`measurements` is `measurements`** — growth values are quantities — **with the provenance recorded: these are readings taken off other people's published figures rather than measurements of trees**, so any digit-level test measures the digitiser, and `Precision mixed (0–9dp)` with 3% integers is consistent with that. `Missing 3706` is the extent of each series, not missing data: 210 × 74 = 15,540 less 3,706 missing and 14 non-numeric gives the screen's 11,820. §4.1 C8. |
| 8 | mixed | mixed | mixed | **§21.1, measured before either arm ran.** 102 protein rows, 102 identical literal sub-header rows and 1,563 peptide rows in one block; `extractAnalysisInputs` drops the 102 sub-headers, leaving 102 protein records stacked on 1,563 peptide records. Four columns are numeric in both populations and name different quantities in each — `Exp. q-value` over `# Proteins`, `# Unique Peptides` over `# PSMs`, and likewise `Sum PEP Score` and `Coverage [%]`. **The exact analysed set is not pinned:** 1,767 × 15 = 26,505 = 6,197 + 20,002 + 306 admits four column sets, **but all four contain `Exp. q-value` and `# Unique Peptides`**, so the `columns` answer holds on every one. `measurements` is `mixed` on the same footing — every candidate set mixes precursor abundances and modification counts with a q-value and a peptide count. The deposit's README states the hierarchy and that **the blanks are structural, not missing data.** |
| 12 | one population | one variable each | measurements | **Rows are features and columns are samples — §16.5's member definition read straight off, and documented.** Every row is one non-target OTU; the README's first variable is *OTUs: operational taxonomic units*, and the filename's `OUTs` is a transposition its own text corrects. The fifteen analysed columns are three leaf-processing treatments at five replicates each — `Y1B` leaf-retained, `Y1Q` leaf-removed, `Y3Q` leaf-accumulated — every one a read count for one sample, so no column changes meaning down the rows. **`measurements` is `measurements`:** sequencing read counts are quantities, integer 100% at 0dp. 3,420 × 15 = 51,300 matches `Values 51300` with `Missing 0`. **Recorded and acted on by nothing: 43,293 of 51,300 values are zero, 84.4%**, ordinary for an OTU table and forecasting nothing about either arm. §4.1 C10. |
| 14 | one population | mixed | measurements | **Two measurements repeated across four panels that are not comparable.** Every row is one bounded nucleus from image analysis, filtered before the file existed — nuclei under 50 µm² excluded, and nuclei excluded where the γH2AX signal was widespread rather than in foci. **`columns` is `mixed` because the four spanning panels `A)`–`D)` are different cell lines at different radiation doses quantified by two different pipelines:** MCF-7 and MCF-10A by mean grey value, A375 and BJ5-ta thresholded first against a threshold chosen on non-irradiated cells. So `gammaH2Ax Mean Gray Value` under panel A and the same-named column under panel C are not the same quantity. **`measurements` is `measurements`** — the README's one variable line reads *imaging data quantification are presented as mean gray value*, and an image intensity per nucleus is a quantity. 419 × 16 = 6,704 less 2,652 missing and 20 non-numeric gives the screen's 4,032. §4.1 C11. |
| 18 | one population | one variable each | mixed | **`Module` is the grouping key of the aggregation, pooled into the matrix as a measurement.** Every row is one module-level survey total — the workbook's Metadata sheet describes `Floral_M` as *floral resource survey data totaled for each module*. Each species column is the count of one named plant species, *counts of flowers/flowerheads/inflorescences*, so no column changes meaning down the rows. **`measurements` is `mixed`: 146 species counts and one sampling-module code**, `Module` being *the number code for the sampling module (1-7)* in the depositor's words and scored `Data` on screen — the level the sheet is totalled at, read as a quantity. **Recorded and acted on by nothing:** `Allium_cepa` is scored `Attr` with every visible value zero, and 20,079 of 21,168 values are zero, 94.9%; §4.1 C12 carries the open discrepancy between §16.8's 200 species columns and the screen's 147. 144 × 147 = 21,168 with `Missing 0`. §4.1 C12. |
| 21 | one population | one variable each | mixed | **The design's second factor sits in the analysed matrix as a measurement.** Every row is one site-microsite record, 16 sites crossed with 2 microsites giving the screen's 32 rows. No column changes meaning down the rows. **`measurements` is `mixed`, and the 23 analysed columns hold at least four kinds:** `Microsite`, a two-level code for the bare and vegetated microsites the deposit's own abstract names, scored `Data`; `Latitude` and `Longitude`, coordinates; `Aridity` and `Abiotic_ax1`, derived indices, the second a named axis score; and genuine soil, enzyme and amoA/amoB gene-abundance measurements. **`Mag. span 8.1 orders` across the matrix is what pooling a latitude with a gene copy number looks like.** Not an inversion instance — §2.8 returned at the 50-row floor and the window is the whole column, so this is plain role inference on a two-level numeric code. 32 × 23 = 736 with `Missing 0`. §4.1 C13. |
| 22 | one population | one variable each | measurements | **Two quantities from two studies, read as replicates of one measurand.** Every row is one taxon; `Genus` 31 distinct over 31 rows. Neither column changes meaning down the rows. **`measurements` is `measurements` — a percentage occurrence and a cranial angle are both quantities — and the provenance is the finding rather than the field:** `%occur` is derived here, *observed occurrence/total surveyed* over 114 human and 1,468 non-human primate crania, while **`CBA` was not measured in this study at all**, being a per-genus average *gathered from the literature (Ross and Ravosa, 1993; Strait, 1999)*. `%occur` runs 0 to 0.39 at 4dp against `CBA` at 161 to 187 and 0–1dp, on a two-column matrix reading `Range 0.000 – 187.0`. **Smallest sheet of the thirty, and the only one where `nPairs < 2` is reachable** (P141, P138). 31 × 2 = 62 with `Missing 0`. §4.1 C14. |
| 23 | one population | one variable each | measurements | **Recorded on the analysed block, and the block count is owed** (§4.1 C15). The README documents three vertically stacked blocks — water level, flow velocity, discharge, 730 daily observations each, separated by blank rows — against §19's recorded two. On the analysed block every row is one day's modelled water level, `date` running 2022/1/1 through 2023/12/31, and `L1`, `H1`, `R1`, `R2` are four sites carrying one water level each, so no column changes meaning down the rows. **If the discharge block reaches the matrix `rows` becomes `mixed`**, discharge being a different quantity on a two-column header rather than five. **`measurements` is `measurements`, with the provenance recorded: these are modelled outputs, not observations** — the deposit keeps observed water levels in `07_hydrodynamic_calibration_data.csv` for model evaluation. 730 × 4 = 2,920 with `Missing 0`; `Mag. span 0.0 orders`. §4.1 C15. |
| 27 | one population | one variable each | not measurements | **Second `not measurements` in the corpus, and the same shape as pos-02.** Every row is one specimen; `IndID` and `Museum_ID/USGS_ID` are each 127 distinct over 127 rows. The three analysed columns are `Elevation`, `Latitude` and `Longitude` — an altitude and two coordinates, all properties of where a bird was caught rather than of the bird. **The depositor calls the analysed file a metadata file** — *this is a metadata file containing the 128 individual* T. aedon *included in the manuscript* — and pins the unit, *elevation is presented in Feet above sea level*. **The deposit's data is `howr_ddrad_raw_variants.vcf.gz`, which the shape filter does not consider**, so the measurements live in a file §6.2 could not select. `Range -121.6 – 9894` is a longitude in degrees west pooled with an altitude in feet. 127 × 3 = 381 less one non-numeric gives the screen's 380. §4.1 C16. |
| 28 | one population | one variable each | mixed | **One analysed column is the standard error of another.** Every row is one individual-season record, 435 over 54 individuals. No column changes meaning down the rows. **All four analysed columns are derived and the README says from what:** `elo` is *the randomized Elo-Rating, representing dominance rank*; `BT_scores` is *Bradley-Terry dominance scores*, a model fit to the same aggressive-displacement record; `years_to_death` is arithmetic on two dates; and **`BT_se` is *Bradley-Terry dominance scores standard error*, a quantity about the precision of a neighbouring column rather than about any bird** — which is what makes `measurements` `mixed` rather than clean. The displacement record the first three are computed from is not in the deposit. **`elo` and `BT_scores` are two estimators of one quantity and the depositor correlates them** in the supplementary analyses. `Missing 0` beside 160 non-numeric: `years_to_death` reads `NA` for birds still alive. 435 × 4 = 1,740 less 160 gives the screen's 1,580. §4.1 C17. |
| 30 | one population | one variable each | measurements | **A column that is the sum of two others sits in the analysed matrix.** Every row is one billet; `billet_ID` 46 distinct over 46 rows. No column changes meaning down the rows. The six analysed columns are three billet dimensions in cm and three insect counts, all quantities about the billet. **`brood_total` = `total_ips_count_per_billet` + `total_parasitoids_per_billet` on all ten rows visible at import** — 190 + 0 = 190, 13 + 3 = 16, 33 + 6 = 39 — **measured on ten of forty-six and not on the file.** **This replaces the circumference-to-diameter relation the §4 cell recorded, which is refuted on those same ten rows** (§4.1 C18): circumference ÷ π gives 14.44, 14.05, 16.78 and 19.33 against recorded diameters of 14.21, 13.63, 16.88 and 18.59. The grouping sits in `site` and `tree_ID`, which the product reads, and the README confirms the nesting — *pine billets were obtained from two trees at each of four study sites*. 46 × 6 = 276 with `Missing 0`. §4.1 C18. |
| 31 | one population | one variable each | mixed | **An apparatus identifier, two room readings and three coded outcomes in one matrix.** Every row is one courtship trial, 486 of them. No column changes meaning down the rows. **The README names all six analysed columns:** `Device` is *number of the set-up*, an apparatus identifier scored `Data`; `Temp` and `Humidity` are room temperature in °C and humidity in %, measured on the room rather than the flies; `MCS`, `CS1` and `DC` are coded behavioural outcomes at 0/1 and 0/1/2. **`Range 0.000 – 69.00` pools a binary score with a humidity percentage.** `Missing 0` beside 371 non-numeric is `NA` counted as non-numeric, the third instance after pos-28 and pos-44. The workbook's third sheet is a documentation sheet under §21.8 and its content is duplicated in the README, so the information set gains nothing new here. 486 × 6 = 2,916 less 371 gives the screen's 2,545. §4.1 C19. |
| 32 | one population | one variable each | not measurements | **Third `not measurements`, and the clearest: a detection log in image space.** Every row is one pod detected by a YOLOv11 model — *a full list of the detected pods when run on all image slices*. No column changes meaning down the rows. **Not one of the ten analysed columns is a measurement of a plant:** `Slice_X` and `Slice_Y` are *slice index of image with respect to full plot image*; `X` and `Y` are *pixel position of detection within the slice*; `Width` and `Height` are *pixel width and height of pod*; `Confidence` is *detection confidence*; `Year` is a calendar year; `Plot` is a plot identifier; and `Pod_Class` is undocumented in the README's variable list. **`Range 0.000 – 2024` is a pixel coordinate pooled with a calendar year.** **The deposit's real measurements are in files the shape filter did not select** — `cowpea_biomass.csv`, `cowpea_leaf_nitrogen_vs_CCI.csv` and `cowpea_architecture.csv` carry dry masses, leaf areas and branch counts. Largest analysed matrix of the thirty: 52,588 × 10 = 525,880 with `Missing 0`. §4.1 C20. |
| 34 | one population | one variable each | mixed | **Six µm morphometrics and a within-image identifier.** Every row is one sperm cell measured from one image; `No` is *measurement number assigned to each sperm cell* and `IndID` is *individual ID from which the sperm was sampled*, 74 levels over 1,232 rows. No column changes meaning down the rows. **`measurements` is `mixed`:** `SpermLength`, `HeadLength`, `HeadWidth`, `MPLength`, `MPWidth` and `FlagellaLength` are quantities in µm, while **`SpermNo` is *identifier for each sperm within a given image*** — reading 1, 1, 1, 1, 1, 1, 2, 1, 2, 1 down the visible rows — and it is scored `Data`. **An unchecked candidate, resting on nothing:** `SpermLength` is *total length of the sperm cell* and three of the others are its named regions, which would be a total-equals-its-parts relation; none of those columns is visible on the import screens and §4.1 C21 records the check owed. `Missing 0` beside 850 non-numeric is the file's own `NA`. 1,232 × 7 = 8,624 less 850 gives the screen's 7,774. §4.1 C21. |
| 35 | mixed | one variable each | mixed | **The sub-header line is inside the analysed matrix.** The header block is three physical lines — four spanning block labels, a blank line, then the sub-header names — and `detectHeaderRows` returned 1, so **86 delivered rows cover 84 human subjects plus an empty line and a line carrying `R_StandardThreshold`, `R_10and12kThreshold` and `L_StandardThreshold`**, which is pos-08's two-populations shape at a smaller scale. Each analysed column is one measurement of one subject. **`measurements` is `mixed`: four incommensurable batteries plus a demographic** — hearing thresholds in dB HL, ABR latencies in ms and amplitudes in µV, digit-span and speech-recognition scores in percent correct, and `Age` in years as a data column with `AgeGroup` derived from it. `Range -15.00 – 100.0`. 86 × 27 = 2,322 less 26 missing and 44 non-numeric gives the screen's 2,252. §4.1 C22. |
| 38 | one population | one variable each | mixed | **Twelve deterministic relations sharing one divisor, all inside the analysed matrix.** Every row is one site-night survey. No column changes meaning down the rows. **The depositor states the relation:** *`XXXX_rate` = Nightly capture rate, calculated as `XXXX_c / Total.Capture.Effort`* — and twelve counts, twelve rates and the effort divisor are all scored `Data` across 28 columns. Instance on screen: effort 78.00, `COTO_c` 1.00, `COTO_rate` 0.01. **`measurements` is `mixed`:** twelve counts, twelve rates in individuals per m²h, an effort in m²h, and **`Year`, a calendar year**, giving `Range 0.000 – 2024`. §16.8's ruling that `_c` and `_rate` are a count and a rate rather than one quantity on two samples is corroborated by the README. 311 × 28 = 8,708 with `Missing 0`; 7,095 zeros, 81.5%, twelve species mostly absent on any given night. §4.1 C23. |
| 39 | one population | one variable each | measurements | **Fourteen measured quantities in stated units, confirmed against the workbook's documentation sheet** (§4.1 C35, superseding C24's open fields). Every row is one sampling point — `Point ID` is *one unique identifier for each square meter and soil sample analyzed*, 146 non-contiguous points with `SITE` at four levels, one of which the depositor names as a real site *located between site 3-SubAlp and 4-SubAlp*. No column changes meaning down the rows. **`measurements` is `measurements`:** dry mass in g on 1/16 m², proportions on [0,1], vegetation height in cm, sieved weights in g kg⁻¹, `pH` in water, metal concentrations in mg kg⁻¹, organic matter in g kg⁻¹, and `C:N` as *the ratio of total carbon: total nitrogen*. **The transformations the sheet describes — cube root, arcsin, square root, log — were applied before the authors' PCA and not to the deposited values**, which the data confirms: `Green_Biomass` reads 14.22 and `Zn_TOT` reaches 50,210. **`C:N` is derived and neither constituent is in the matrix**, the one deposit of the five carrying a derived column whose inputs are absent. 146 × 14 = 2,044 with `Missing 0`. §4.1 C35. |
| 40 | one population | one variable each | measurements | **The corpus's sparsest matrix, and its column scheme is documented nowhere.** Every row is one amplicon sequence variant; `ASV_ID` labels 33,678 of them. Every column is a read count for one soil sample, so no column changes meaning down the rows. **`measurements` is `measurements`:** sequencing counts, integer 100% at 0dp, `Range 0.000 – 1442`. **The 416 column headers are a three-letter island code with a two-digit plot number — `BAD_01` onward — and the README gives the ten ASV tables half a line between them** (§4.1 C25), so §16.1's ruling rests on the file's structure alone. The sampling text implies the scheme without stating it: samples per island run 13 to 41 and island names are withheld under national security regulations. 33,678 × 416 = 14,010,048 with `Missing 0`; **13,852,754 zeros, 98.87%**, and the heap exhausts before the battery. §4.1 C25. |
| 41 | one population | mixed | mixed | **Genomic coordinates sit among model-derived effect sizes.** Every row is one SNP; `rs` labels 109,228 of them with `chr` at 1 and `ps` ascending. **`columns` is `mixed` and `measurements` is `mixed` for the same two columns:** `chr` is a chromosome number and `ps` a base-pair position — coordinates, not effects — inside the same 27-column matrix as twenty-five BSLMM effect sizes, giving `Range -54.95 – 3.041e+7`. The README states the file is *SNP effects on traits and environmental variables derived from Bayesian sparse linear mixed model (BSLMM) analysis performed in GEMMA*, so **the twenty-five are model output rather than measurement**, visible on screen at ±0.01 with the `i_` family at 10⁻⁷. **The column definitions are in `legend.csv`, a separate file the shape filter did not select** — a third delegation pattern §21.8 does not cover, recorded at §4.1 C26. `Missing 0` beside 31,164 non-numeric is the README's *missing values were coded as NAs*. 109,228 × 27 = 2,949,156 less 31,164 gives the screen's 2,917,992. §4.1 C26. |
| 43 | one population | one variable each | measurements | **Seventy cranial and dental measurements, every abbreviation defined in mm.** Every row is one bandicoot specimen. No column changes meaning down the rows: the README defines `aIL`, `apl`, `bcl`, `ctl`, `jl`, `onl`, `zw` and the rest as distinct quantities on one skull, which is the recorded reading of `P1L` and `M2W` as different quantities rather than one quantity on different samples. **`measurements` is `measurements`:** all in mm, `Range 0.000 – 186.0`, `Precision mixed (0–2dp)`. **`Missing 37,486` is real missingness, not structure** — *any NAs and empty cells represent missing data* — which is why `Count` is blank on 436 of 873 rows and `arbitrary` stands. **The block figures are contested and the count is owed before scoring** (§4.1 C27): §19.1 records four blocks at 873 / 506 / 32 / 182 rows while the picker shows 452 / 310 / 20 / 110 at 80 cols, with the selected block summarised as 873 rows and 49 trailing rows trimmed. 873 × 70 = 61,110; the screen reads `Values 23308` against `Missing 37486` and 316 non-numeric. §4.1 C27. |
| 44 | one population | one variable each | measurements | **The deposited file is synthetic and the depositor states it twice** (§4.1 C28) — *a synthetic but structurally representative subset*, and *the subset is synthetic and does not represent actual permit detections*, with detection intensities *designed to satisfy all data sufficiency thresholds used in the manuscript*. Every row is one acoustic detection of one of eight simulated fish. The single analysed column is `timediff` throughout — *minutes elapsed since the previous detection for the same fish (NA for first detection)* — so `columns` is `one variable each` and **`measurements` is `measurements`, minutes elapsed being a quantity, with the reason recording that the values are generated rather than observed.** The eight non-numeric cells are the eight fish's first detections. **§2.8's cause is confirmed in the depositor's words:** `Date` holds `month` and `year`, and `station` is a *unique receiver station identifier* so `lon` and `lat` are constant within it. 52,948 rows, `Values 52940`, `Missing 0`. §4.1 C28. |
| 45 | one population | mixed | mixed | **The file is a two-dimensional grid and `Col 1` is one of its axes.** The depositor states the geometry: *the first row contains the excitation wavelength [nm]. The first column contains the emission wavelength [nm]. The second to last rows and columns contain the fluorescence intensity (arbitrary units).* So every row is one emission wavelength, 200 to 700 nm at 5 nm steps, and **`Col 1` — scored `Data` and ascending 200, 205, 210, 215 on screen — is the emission axis**, while the other 101 analysed columns are excitation channels from 200 to 500 nm. **`columns` and `measurements` are both `mixed`: one ordered wavelength coordinate beside 101 columns of fluorescence intensity in arbitrary units.** **A saturation sentinel occupies a diagonal band** — `9999.9` wherever emission approaches excitation and scattered light swamps the detector, against `Range 2.959 – 1.000e+4` and `Integer values 13%` — undocumented as a code and not a measurement. The file is the experiment's control, *FF of barium sulfate powder*. **The recorded reason has both axes wrong and §4.1 C29 restates the ground without moving the answer.** 101 × 102 = 10,302 with `Missing 0`. §4.1 C29. |
| 46 | one population | one variable each | measurements | **Three documented derivation chains, all inside the analysed matrix.** Every row is one aspen tree; `sample.id` is *individual tree identifier*, 259 distinct over 264 rows. No column changes meaning down the rows, and **`measurements` is `measurements`** — all fifteen are percent dry weight or a change in it. **The derivations are the depositor's own:** `pdw.total.22` is *total SPGs* over salicin, salicortin and tremulacin, checked on two visible rows to the rounding — 1.011 + 6.043 + 5.449 = 12.504 against 12.505 — with the same structure for 2023; and the five `d.` columns are *change in percent dry weight* from 2022 to 2023, each one column minus its partner. **So ten measurements, two derived totals and five derived differences are read as replicates of one measurand**, giving `Range -35.81 – 44.34`. `group` is also derived — *three year treatment pattern (CCC, CDD, DCD, DDD)* — but is a condition column, not analysed. 264 × 15 = 3,960 with `Missing 0`. §4.1 C30. |
| 47 | one population | one variable each | measurements | **The deposit's five measurement columns are scored as conditions and the analysed matrix is what is left.** *Each row represents one plot surveyed on one sampling date* — 80 plots monitored fortnightly from November 2025 to April 2026, giving 760 rows. The single analysed column is `shoot_count`, *number of live eelgrass shoots observed within the plot*, so `columns` is `one variable each` and **`measurements` is `measurements`:** a count, integer 100% at 0dp, `Range 0.000 – 27.00`, with **484 of 760 values zero** across the early surveys before germination. **P217 is confirmed by the depositor:** `length_cm_1`–`_5` are *heights (cm) of up to five randomly selected shoots* and all five are scored `Cond`, with 2.3, 1.9, 2.8, 4.7 and 3.7 standing as condition levels; *`NA` indicates that fewer than five shoots were present*, which is why the 40-row window is all `NA`. **§4.1 C31 records that the refusal has two causes and the §4 cell names one as sole.** 760 × 1 = 760 with `Missing 0`. §4.1 C31. |
| 49 | one population | one variable each | mixed | **A stated ratio and a positional index among the measurements.** Every row is one current-year shoot — the README's *in total 1857 shoots were recorded from the nine sampled trees* matches `Rows 1857` exactly. No column changes meaning down the rows. **`measurements` is `mixed`:** `Length` in cm, `WetWeight` and `DryWeight` in grams, **`dry_wetratio` a derived quantity — *dry weight / wet weight*, checked on three visible rows at 0.463, 0.509 and 0.500 — and `Whorl`, *beginning from top shoot = 0*, a positional index rather than a measured quantity.** So three of the five analysed columns stand in an exact ratio, recorded at §4.1 C32 with the check taken on three rows of 1,857. `Range 0.000 – 70.60`, `Missing 0`. 1,857 × 5 = 9,285. §4.1 C32. |
| 50 | one population | one variable each | mixed | **The deposit describes the analysed file as a name key and never names its numeric columns.** Every row is one genome assembly — 147 over 103 species, so assemblies repeat per species, `Artibeus lituratus` appearing at `HLartLit1A` and `HLartLit1B`. No column changes meaning down the rows. **`measurements` is `mixed`:** the three TOGA gene counts are quantities, integer 100% at 0dp with `Range 86.00 – 1.754e+4`, while `Contig N50 (L50)` is an assembly-quality statistic rather than a measurement of the organism. **Whether the three counts are compositional stays open** — the README's entry for this file is two sentences describing it as *a key for interconversion* between ToLIDs and Senckenberg IDs, and it never names them; the columns are not visible on the import screen. **Three values from one row settle it, recorded as owed at §4.1 C33 rather than asserted.** 147 × 3 = 441 with `Missing 0`. §4.1 C33. |
| 51 | one population | one variable each | measurements | **Two derivations stated by the depositor and both checked exactly.** Every row is one butterfly; 571, matching the README. No column changes meaning down the rows. **`measurements` is `measurements`:** masses in mg, lengths in mm, areas in mm², and two derived ratios. **`aspect_ratio` is *4 × (forewing length)² / forewing area* — 4 × 22.722² ÷ 218.405 = 9.4556 against a recorded 9.4556, exact to the last printed digit — and `wing_loading` is *dry body mass divided by total forewing area*, each recorded value being exactly half the quotient of `total_mass` and `fw_area`, so the relation holds as `total_mass ÷ (2 × fw_area)`.** Five of nine analysed columns are involved and two are computed from the other three. **Recorded and acted on by nothing: six `*_nir` columns are genuine near-infrared reflectance measurements scored `label`**, and the cause is the missing-data code — 650 non-numeric cells against `Missing 0`, with *missing values are coded as NA in all data files* (§4.1 C34). 571 × 9 = 5,139 less 650 gives the screen's 4,489. §4.1 C34. |

- **`rows`** — `one population`, `mixed`, `undetermined`.
- **`columns`** — `one variable each`, `mixed`, `undetermined`.
- **`measurements`** — `measurements`, `not measurements`, `mixed`, `undetermined`.
- **`reason`** carries the structural evidence for any non-default value, in the form §3 requires of
  the answers. **One spelling per value** — a field that gets counted must not hold a variant spelling
  of one answer.
- **Nothing here excludes a deposit, moves a sheet or changes an answer** (§22.2). It is recorded and
  acted on by nothing.

### 4.3 — Documentation files named, and declared provenance

**Two fields, one row per deposit, recorded S401 after the census and the pass and before either arm
runs.** The left field answers §21.9.2, the right §23.4.3. **Both were read from the deposit's own
README, never from its directory** (§21.9.1).

**Legend.** `documentation file` is the file the README names as documenting the analysed file's
variables, or `names none` with its reason where something was considered and rejected. `provenance`
is `declared generated`, `not declared` or `undetermined` (§23.1), bounded by whether the number was
produced by a model or a generator rather than recorded by an instrument or an observer.

**Two members on the left — pos-41 and pos-47. Four on the right — pos-23, pos-32, pos-41 and
pos-44.** No cell is blank and none is `undetermined`.

| pos | documentation file (§21.9) | provenance (§23) | reason |
|---|---|---|---|
| 01 | names none | not declared |  |
| 02 | names none — delegates to an external stratigraphic reference *not included in this deposit*, outside §21.2's information set (§21.9.4) | not declared |  |
| 03 | names none | not declared |  |
| 07 | names none | not declared |  |
| 08 | names none | not declared |  |
| 12 | names none | not declared |  |
| 14 | names none | not declared |  |
| 18 | names none | not declared |  |
| 21 | names none | not declared |  |
| 22 | names none | not declared |  |
| 23 | names none | declared generated | *daily modeled water level, flow velocity, and discharge*; *values are modeled daily water levels in meters* |
| 27 | names none | not declared |  |
| 28 | names none — delegates to the Main Text and Supplementary Materials | not declared |  |
| 30 | names none | not declared |  |
| 31 | names none | not declared |  |
| 32 | names none | declared generated | *a full list of the detected pods when run on all image slices*, object-detection inference over photographs; §4.2 records `not measurements` |
| 34 | names none | not declared |  |
| 35 | names none | not declared |  |
| 38 | names none | not declared |  |
| 39 | names none | not declared |  |
| 40 | names none | not declared |  |
| 41 | `legend.csv` — *Legend with the complete list of trait and environmental variables with descriptions, symbols, and units* | declared generated | *SNP effects … derived from Bayesian sparse linear mixed model (BSLMM) analysis performed in GEMMA* |
| 43 | names none — `OMG_sample_metadata_…csv` holds *the metadata for all molecular samples*, a table about specimens rather than a dictionary for the analysed file; the README carries its own abbreviations | not declared |  |
| 44 | names none | declared generated | *a synthetic but structurally representative subset*, 8 simulated fish (§4.1 C28) |
| 45 | names none | not declared |  |
| 46 | names none | not declared |  |
| 47 | `seed-density-metadata.csv` — *Data dictionary describing every variable in `seed-density.csv`* | not declared |  |
| 49 | names none | not declared |  |
| 50 | names none — delegates to a GitHub repository | not declared |  |
| 51 | names none | not declared |  |

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
never revised after a run, and a correction is logged with its reason rather than overwritten.

**Rows are keyed on position and carry no DOI, deliberately.** §5's counting commands anchor on
`^| N | doi:` and have already been corrected twice for matching text they were never meant to
reach. A second DOI-led table in this file would break them a third time. **Do not add a DOI column
here** — §4 maps position to DOI and the position is the key throughout.

| # | Sev A | Sev B | Differs | cov.ran A | cov.ran B | Row frac A | Row frac B | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 3 | 3 | no | 12 |  |  |  | **`structure inexpressible`** — 3 bands (5/6/4) lost at `detectHeaderRows`. **`TOTAL` row sits inside the analysed 16 × 15 matrix**, largest residual 2.91e-4 against the sum of the 15 rows above it; derived-or-reported undecided, unpriced. One blank raw row survives into `data` as index 0 and is dropped by `extractAnalysisInputs`. A methods caption in `A1` was stripped with the 3-row preamble. All recorded before either arm ran. **S402 — both arms, zero difference on every field, despite differing at the row gate:** arm A `ordered`, arm B `arbitrary`. Arm B via probe, 1.3 s. |
| 2 | 3 | refused | arm B refused | 5 | no run |  | no run | **S402 — arm A scored `26,532 × 1`.** §2.8 held out twelve columns, all geographic or stratigraphic and all constant within `collection_no`, leaving that museum collection identifier as the sole surviving data column. **Arm A returned severity 3 on an accession number**; arm B refuses at `ImportView.jsx:974`. 57 s isolated. |
| 3 | 3 |  |  | 9 |  |  |  |  |
| 7 | 3 |  |  | 19 |  |  |  | **`structure inexpressible`** — mixed: sixteen real variables beside a seventy-column year axis, 1950–2019. §16.7. Recorded before either arm ran. |
| 8 | 3 | 3 | **yes, not in severity** | 18 | 16 |  |  | **`structure inexpressible`** — naming scheme, nine `Abundance:` sample columns. Recorded before either arm ran. **S402 — same severity, same ten HIGH results, disjoint moderate sets.** Arm A: Runs Test MODERATE, Cross-Condition Consistency MODERATE, Cross-Condition Rank Correlation N/A. Arm B: Runs Test N/A under `arbitrary`, Cross-Condition Consistency CLEAR, Cross-Condition Rank Correlation NOTED. Two mechanisms, separable — Runs Test is the row gate; the cross-condition pair is the partition, arm A's 107 groups against arm B's 1,116. **This difference may not be cited as the cost of the default**: `Description` infers as `label` on arm A and `condition` in the browser (§4.1 C40), so a role divergence is mixed in. Arm B hand-run; artifact `corpus-out/round2-armb-pos-08.txt`. |
| 12 | 3 |  |  | 4 |  |  |  | **`structure inexpressible`** — naming scheme, `Y1B`/`Y1Q`/`Y3Q`, five columns each. Recorded before either arm ran. |
| 14 | 3 |  |  | 23 |  |  |  | **`structure inexpressible`** — merged header cells, four panels of widths 4/3/3/3. Recorded before either arm ran. |
| 18 | 3 |  |  | 16 of 28 |  |  |  | **S402 — a test crashed and the run continued.** `Inter-Replicate Correlation` threw `RangeError: Maximum call stack size exceeded` at `interReplicateCorrelation.js:331`, in `testPearsonUniformity`. **Severity 3 computed over 28 tests, not 29**, and nothing on the shipped surface says so. §2.8 held out **54 columns**. **2,244 s at 144 × 147**, against 105 s for the other eighteen deposits in the same loop combined. **The cause is unmeasured and is not width** — pos-45 at 101 × 102 took 24 s. §17.9's threshold is on rows and does not see this deposit. Closes §4.1's 200-versus-147 check at 147 (C41). |
| 21 | 3 |  |  | 18 |  |  |  | **Derived column pair, recorded before either arm ran.** `Log_AOB_paper` and `Log_AOA_paper` are log transforms of `AOB_raw` and `AOA_raw`, both in the analysed matrix — a deterministic relation between column pairs, which is what Constant-Offset Blocks scans for. |
| 22 | **1** |  |  | 12 |  |  |  | **S402 — the only deposit below severity 3 on arm A.** Severity 1, no HIGH, one MODERATE, 12 of 29 tests run, 1 s. |
| 23 | 3 |  |  | 20 |  |  |  | **Row-count gap, recorded before either arm ran.** 2,199 raw rows less 1 skipped, 1 header and 734 trimmed leaves 1,463 against 730 surviving; the residue is close to a second block of the same height. `detectBlocksSplit` settles whether §6.2 ranked this sheet on one block of several. Unread. |
| 27 | 3 |  |  | 20 |  |  |  | **The analysed matrix is three geographic coordinates** — `Elevation`, `Latitude`, `Longitude`, 127 × 3. Spatial coordinates carry intrinsic between-column structure. Recorded before either arm ran. |
| 28 | 3 |  |  | 16 |  |  |  | **Two derived relations, recorded before either arm ran.** `BT_se` is the standard error of `BT_scores`, and `years_to_death` follows from `death_year` and `year`. `BT_scores` and `BT_se` are both in the analysed matrix. |
| 30 | 3 |  |  | 17 |  |  |  | **Geometric relation, recorded before either arm ran.** `billet_circumference_cm` is π times `billet_diameter_cm`; both are in the analysed matrix, and a deterministic linear relation between two columns is what Constant-Offset Blocks scans for. |
| 31 | 3 | 3 | no | 17 | 17 |  |  | **§15.3 — zero surviving groups.** 486 rows partition into 486 singletons and `slices()` returns none, so no group-based test can run. The deposit runs and is recorded normally; `cov.ran` and the row fraction carry it. Confirming the gate does not move the partition. Recorded before either arm ran. **S402 — zero arm difference on every field.** Both arms `ordered`, both 17 of 29, both 9 high and 4 moderate. The untick removed `Experimentor`, which holds one distinct value; the partition stayed at 486 singletons and confirming moved neither the banner nor a chip. §13.2's shared-root finding on a second round-2 deposit, again with both trigger arms present. Arm B hand-run; artifact `corpus-out/round2-armb-pos-31.txt`. |
| 32 | 3 |  |  | 23 of 28 |  |  |  | **Largest sheet of the thirty answered so far** — 52,588 × 10, runtime unmeasured, and cost is data-dependent rather than shape-dependent. **`Year` holds one distinct value** and enters the matrix as a zero-variance column. Recorded before either arm ran. **S402 — a test crashed and the run continued.** `Duplicate Detection` threw `RangeError: Map maximum size exceeded` at `duplicateDetection.js:759` — **the same line §4 predicts for pos-41, now fired at 52,588 rows.** **Severity 3 computed over 28 tests, not 29.** **4,485 s isolated**, the first cost figure this deposit has had; §4 recorded it unmeasured. |
| 34 | 3 |  |  | 23 |  |  |  | **Grouped order, recorded before either arm ran.** Rows are ordered by measurement number `No` and also blocked by `IndID` into 74 individuals, so a whole-axis scan crosses individuals — the CORPUS-01 case, where the binary gate cannot express *order within block*. **Candidate derived relation:** `SpermLength` may be the sum of `HeadLength`, `MPLength` and `FlagellaLength`; not verified. |
| 35 | 3 |  |  | 23 |  |  |  | **`structure inexpressible`** — merged header cells, four test batteries of widths 6/14/3/3. `AgeGroup` is derived from `Age` and both are read. Recorded before either arm ran. |
| 38 | 3 |  |  | 24 |  |  |  | **§16.5 disagreement, recorded before either arm ran.** This sheet and pos-18 have the same shape — per-species measurements over sampling events — and §16.5 classifies pos-38 as columns-as-samples and pos-18 as variables. The answer is `replicates` either way; §16.3's count of eight is what turns on it. **Candidate derived relation:** thirteen `_rate` columns may be their `_c` counterparts over `Total.Capture.Effort`, but every `_rate` has FEWER distinct values than its count, which the simple per-row ratio does not predict. Unresolved. |
| 39 | 3 |  |  | 24 |  |  |  | **The auto-answered row semantics looks wrong.** `physiological` was detected on a soil-chemistry sheet and carried `ordered` to the row gate without asking. Rows are 146 sampling points with no sequence column. Mirror of pos-32, where the same default is plausibly right. Recorded before either arm ran. |
| 40 | **did not complete** | **did not complete** | both arms fail | no run | no run |  |  | **`structure inexpressible`** — naming scheme, 416 sample columns on a site-plus-replicate code. **Largest sheet of the thirty, 33,678 × 416, battery runtime unmeasured** and cost is data-dependent rather than shape-dependent. **The assay detector returned `general` on an ASV table**, so METHODOLOGY's genomics auto-route to `arbitrary` did not fire. Recorded before either arm ran. **S402 — neither arm completes, and they fail at different points.** Arm A: heap exhausted, **3,479 MB, aborted at 21.8 s, before the battery** — reproducing §4's 3,472 MB at 17.6 s from an independent run. Arm B in the browser: parsed the file, cleared both gates, entered the battery and crashed the tab at ~40 s, **twice — test 5 of 29 on the first run and test 6 of 29 on the second**. Chrome "Aw, Snap!", error code 5. **The position varies, so the wall is time and memory rather than a named test**; neither Value-Frequency Spike nor Inter-Replicate Correlation may be cited as a cause. **The confirm gate never rendered** (§4.1 C42). No resource limit was raised on either arm. |
| 41 | **not attempted** |  |  | no run |  |  |  | **`structure inexpressible`** — mixed, six trait families crossed with abaxial/adaxial/mean beside seven climate variables. **Six columns are derived from their neighbours** — `e_mean_um2`, `i_mean_unitless`, `s_mean_um2`, `d_total_sto.mm.2`, `f_mean`, `gmax_total` — and all sit in the analysed matrix. **The assay detector returned `general` on a SNP table**, second missed genomics file. 109,228 rows. Recorded before either arm ran. **S402 — not attempted on arm A.** A run of the projected length was not available on the operator's machine on battery power — an operator resource fact, not a property of the tool. **The 83-to-100-hour figure is a projection and not a measurement**; it was fitted to row count, and pos-18 shows that fit does not generalise. Recoverable in one command. |
| 43 | 3 |  |  | 19 |  |  |  | **Alternating blank rows, recorded before either arm ran.** The identifier columns are filled on every other row — `Count`, `Species name` and `Specimen #` each hold 437 values against 436 missing of 873 — so half the analysed rows carry no specimen identity and the condition partition is built on a column blank half the time. **The row count does not close either:** 1,650 raw less 1 header and 50 trimmed leaves 1,599 against 873 surviving. Same shape as pos-23's gap; `detectBlocksSplit` unread on both. **S402 — arm A scored `709 × 70` in 23 s**, §2.8 holding out `Head-body`. §19 and §19.1 stand: this deposit's §7 difference may not be cited as the cost of the default. |
| 44 | **did not complete** |  |  | no run |  |  | no run | **S402 — arm A does not complete and this was not predicted.** Heap exhausted, **4,034 MB, aborted at 33.8 s, before the battery**. §4 and §17 name pos-40 as the deposit that dies; pos-44 was expected to be expensive. `--max-old-space-size` was not used, per §17.2. |
| 45 | 3 |  |  | 20 |  |  |  | **`structure inexpressible`** — wavelength sweep, `200`–`700`. The only sheet of the thirty with no label and no condition column; the analysed matrix is the entire file at 101 × 102. Recorded before either arm ran. |
| 46 | 3 |  |  | 20 |  |  |  | **`structure inexpressible`** — mixed: five compounds crossed with two years beside four real condition columns. **`d.cts` and `d.pgs` are derived from their neighbours**, and `pdw.total.22` and `pdw.total.23` are plausibly the sums of the compounds beside them; all are in the analysed matrix. **The auto-answered row semantics looks wrong** — `qpcr` detected on plant chemistry. Recorded before either arm ran. |
| 47 | 3 |  |  | 5 |  |  | no run | **S402 — arm A scored `760 × 1`**, a single data column, on a file the shipped surface refuses. §2.8 held out `seed_density` and `burial_treatment`, both constant within `plot_id`. |
| 49 | 3 |  |  | 23 |  |  |  | **Derived relation, recorded before either arm ran.** `dry_wetratio` is `DryWeight` over `WetWeight` and all three are in the analysed matrix — a deterministic relation among three of the five data columns. The auto-answered `ordered` is plausibly right here, unlike pos-39 and pos-46. |
| 50 | 3 |  |  | 16 |  |  |  | **Only arm-2-without-arm-1 confirm gate of the thirty.** **Candidate compositional relation:** the three TOGA counts — intact, inactivating, missing — may sum to a fixed gene total per assembly, which would make one column a function of the other two. Not verified. Recorded before either arm ran. |
| 51 | 3 |  |  | 22 |  |  |  | **Derived relations, recorded before either arm ran.** `wing_loading` follows from mass over wing area and `aspect_ratio` from wing length and area, so two of the nine data columns are functions of three others in the same matrix. **Six `*_nir` columns are scored `label`** at a numeric fraction near 0.47 and therefore never reach the battery. |

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

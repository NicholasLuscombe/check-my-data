# Real-World Corpus — Run Spec + Tier-1 Results

**Status:** Tier-1 run and adjudicated (S292–S294). Tier-2 gated on data access (not run). S305: 19 science-detective road-test candidates added to the master status table (§0), triage-stage — the standalone triage scaffold is folded in here and retired. Road-test sweep S305–S314: **six cases adjudicated** (C25, C11, C23, C21, C08, C12). **C12 was retracted by *J Ecology* in May 2026, after our run.** It was the corpus's clearest exhibit of a High verdict returned for the wrong reason — **and at S316 it became the corpus's clearest exhibit of a defect converted from a miss into a catch.** The copied roots now fire, by design, with the copied columns named. See the C12 §0.4 entry and V1X §2.9.

> **S317 — READ §0.3 BEFORE RUNNING ANY FILE.** Seven of the row-grouping corpus files (six in the S317 census + C14, corrected S322) partition into units the row-grouped tests were not designed for. Four are the ecology cluster. **The grouping contract is settled, cross-validated, and enforced** — the trigger routes these to N/A pending confirmation and the confirm card is built (S320–S322, twelve fixes unpromoted); **the cluster stays blocked until that stack promotes.** See §0.3 and V1X §2.10.

**Owner:** Chat. **This doc is TRACKED** — it lives in `docs/shared/` with history to S307, and rides git. The root path is a symlink into `docs/shared/`, gitignored. A Chat edit lands as a commit: co-landing with `src/` → edit the worktree copy so `promote.sh` commits it; docs-only → a direct docs-only commit to main. *(Corrected S315. The long-carried "root working doc, not git-tracked — edit main copy directly" line was false and was repeated for an entire arc. Verify a doc's tracking status at source — `git log -- <path>` — before asserting it from memory.)*
**Purpose:** Define the real-world run for Check My Data — labelled external datasets with third-party ground truth, an adjudication protocol that distinguishes true detection from false positive without overclaiming intent, and the adjudicated Tier-1 results that become the paper's real-world section.

**Reading note (S294):** §2's Tier-1 entries now carry the *adjudicated results*, not the pre-run expectations they were first written with. Three of three datasets moved past their original predictions — the most important correction being CORPUS-01, which the tool MISSED (a by-design gap), not caught. Where an earlier draft of this spec predicted a channel or severity, the adjudicated result at source (BANKED S292 corpus section; `PAPER-REALWORLD-RESULTS-DRAFT.md`) governs. The §1 framing, the §4 protocol, and the §5 output structure are unchanged — they are what was applied.

**Reading note (S330) — CORPUS-01's two open channels closed.** Round 1 left CORPUS-01 half-adjudicated: the Sequential Duplication catch was settled at S329, but the file's **Decimal Precision HIGH** and its **two errored tests** were named in no state. Both are now adjudicated against the deposit and the engine, at S330. The Decimal Precision HIGH is a **B2 false positive with a new mechanism** — IEEE float representation in the stored values, not cross-column pooling — which makes it a *second* axis-1-adjacent failure mode distinct from the one V1X §2.6 already names (see the CORPUS-01 §2 entry and V1X §2.6 axis-4). **Fixed at S336 (`4a7cda2`); the channel now returns LOW and the adjudication is closed rather than open.** The two errored tests are **Entropy ("Distinct numbers")** and **Mahalanobis Row Outlier ("Unusual rows")**, both starved by per-group minima this file cannot reach. Method as at S329: the deposit was read at source and characterised independently before the engine's evidence was opened. **One correction to record about the method itself** — Chat's independent read correctly identified a genuine 3dp signature in the file and provisionally attributed the HIGH to it; the flag fires on something else entirely. That is the second consecutive session in which a provisional Chat attribution aimed at the wrong channel and was caught only by holding for Code's channel-identity dump.

**Reading note (S329) — round-1 adjudication closed, two entries moved again.** The §2.4 Sequential Duplication detector (built S304, live) was measured firing on CORPUS-01 and CORPUS-03 during the round-1 sweep, but "fires" is not "catches" — the fire has to land on the documented rows. Both deposits were opened and read at S329, and both fires land right: **CORPUS-01's Tier-1 miss is now a Class A catch**, and **CORPUS-03 gains a correct-severity second channel** on top of Exact Duplicate's standing under-call. One Benford HIGH on CORPUS-03 was adjudicated a B2 pooling false positive (V1X §2.6 axis-1). Where the S294 note above records CORPUS-01 as MISSED, that was true at Tier-1 and is now superseded — the CORPUS-01 §2 entry and the §5 sensitivity summary carry the current adjudication. Method note for anyone re-running: adjudicate against the **deposit**, not the run console — the fires were classified only after the fired sequences were mapped onto the data by hand.

---

## 0. Master status table — every corpus candidate, one row (S305)

Single source of truth for corpus membership and lifecycle. Keyed by DOI. Replaces the separate S305 triage scaffold (now folded in here). Detailed adjudication for run cases lives in §2; parked Tier-2 detail in §3; the triage protocol in §4.

**Lifecycle states:** `run` (battery run + adjudicated, §2) · `parked` (identified, data-access gated, §3) · `triage` (candidate, per-case fill outstanding) · `runnable` (availability + shape confirmed, not yet run) · `paper-only` (no deposited data — read-only, can't road-test) · `dropped` (duplicate/out-of-scope, reason recorded).

**Provenance rule:** every row that reaches `runnable`+ needs DOI + deposit location + filename/sheet + declared roles + PubPeer thread URL, per `CORPUS-PROVENANCE.md`. Adjudicate tool output against the **data**, not thread prose (§4 A/B/C).

| ID | Paper (first author / journal / year) | DOI | Provenance batch | Lifecycle | update? | Shape | Documented defect / class | Detail |
|---|---|---|---|---|---|---|---|---|
| CORPUS-01 | Sampson, *Cell* 2016 | 10.1016/j.cell.2016.11.018 | science-detective | **run** | — | wide, group-indexed | sequential block duplication across groups → Class C at Tier-1, **converted to a Class A catch S329** — §2.4 Sequential Duplication HIGH (1.845e-6) on the two adhesive runs + pole pair, deposit-verified | §2 |
| CORPUS-02 | Mohammadi, *PLOS Genetics* 2022 | 10.1371/journal.pgen.1010323 | science-detective | **run** | — | small wide (assay) | exact dup + near-dup terminal-digit + admitted variance manip → Class A+B1+C. **Retracted.** | §2 |
| CORPUS-03 | Bierbach, *Nat Comms* 2017 | 10.1038/ncomms15361 | science-detective | **run** | — | ID-indexed, 4 obs/fish | every SL value ×4 (join scramble) → Class A. Exact Duplicate under-calls (p=1), but **Sequential Duplication catches it HIGH (1.47e-35) on SL S329**; Benford HIGH is a B2 pooling FP | §2 |
| CORPUS-04 | Jin, *Nature* 2025 | (Nature source-data, Nov 2024) | Geng/Nature | **parked** | — | table, 280 pts | terminal-digit: 76% end in 5 | §3 |
| CORPUS-05 | Zheng, *Nature Cancer* 2024 | (source-data, 2 sheets) | Geng/Nature | **parked** | — | 2-sheet, 64 figs | cross-sheet positional dup (capability probe) | §3 |
| C06 | Mohammadi, *PLOS Genetics* 2022 | 10.1371/journal.pgen.1010323 | science-detective | **dropped** | — | — | duplicate of CORPUS-02 (DOI-confirmed) | — |
| C07 | soil warming / microbial P, *Nat Comms* 2023 | 10.1038/s41467-023-36527-8 | science-detective | runnable | **yes** | wide, treat×rep *(inf.)* | https://pubpeer.com/publications/A4EA392A36C5B717722B04A91E2773?ref=sciencedetective.org This paper uses data from an experiment in which buried cables warmed mountain soil by 4 degrees over up to 14 years. The authors test the impact of this warming on soil phosphorous. There are several concerning observations in the data, which the authors made available on [Dryad](https://doi.org/10.5061/dryad.9p8cz8wk8). First, multiple rows show identical readings for total and organic phosphorous. These are identical up to 15 decimal places. In these plus one additional row, total phosphorous is not equal to the sum of organic and inorganic phosphorous, as would be expected. Errors are more pronounced in the warmed versus control soils. Because the paper’s hypothesis depends on differences in warmed and control soil, these seem like highly impactful errors. | §2.4 + derived-col gap |
| C08 | thermal stress / Parthenium beetle enzymes, *Physiol Entomol* 2024 | 10.1111/phen.12475 | science-detective | run | no | wide, factorial *(inf.)* | https://pubpeer.com/publications/FF61AC6C0D8B0DA3452B6FAEF244B5?ref=sciencedetective.org The raw data for the three primary dependent variables measured in the study - Superoxide dismutase activity (SOD), Catalase activity (CAT) and Lipid peroxidation levels (LPO) - contain biologically impossible duplications. Each row is supposed to contain data for a different individual larva. The paper states that “*The activities of SOD, CAT and LPO were individually measured in each larva, with each experiment replicated 10 times for each temperature.*”. In the above screenshot we’re looking at the 10 rows of data for the second instar larvae, exposed to cold temperature for three hours. Notice that each of the three data columns has duplicated values, but the duplicates are not matched within the same row. For example, row 61 has the same SOD value as row 55, the same CAT value as rows 52, 54, 56, 57 & 59 (but with one digit changed!) and the same LPO value as row 56. A similar pattern holds for other groups of larvae in the same spreadsheet. In total around 1/7th of the values are non-unique. | near-dup gap · **S317: row-groups into 35 — see §0.3** |
| C09 | warming / alpine root-leaf traits, *Ecosyst Health Sust* 2025 | 10.34133/ehs.0350 | science-detective | runnable | **yes** | wide, trait×treat *(inf.)* | https://pubpeer.com/publications/103D04A8BB1CC08C6F1364C92CE85E?ref=sciencedetective.org Duplicate values shared between separate replicates of the same species. These values are supposed to have been collected from different individuals in separate pots according to the paper. This number of identical values with so many shared significant digits could never occur in a biological sample. To illustrate I've added two columns:"SLA (calculated)" - which re-calculates SLA using the LA (Leaf area) and LM (Leaf mass) values in the spreadsheet. "SLA diff calc vs actual" which shows the absolute difference between my the original SLA column and the recalculated one. | §2.4 + derived-col gap · **S317: row-groups into 20 — BLOCKED, see §0.3** |
| C10 | bacterial bioconvection segregation, *Nat Comms* 2025 | 10.1038/s41467-025-56244-8 | science-detective | runnable | no | time-series/spatial *(inf.)* | https://pubpeer.com/publications/2C63CCB86D82CD42D39737240A5025?ref=sciencedetective.org I've been having a look at the supplemental material providing the data for figure 5b, which is available at https://datadryad.org/downloads/file_stream/3516691. In the tab for P. megatetrium Experiment 1, the data for OD 1.0_4 and OD 1.0_5 are mostly made up of the same exact values, but re-ordered so they are in different frames. As these are meant to be two separate videos, this seems almost impossible. Furthermore, if you consult the graph I've attached, you can see that the frame-shifting is very far from random, but largely composed of chunks being shifted around by a few positions (with the exception of early in the sequence, where the shuffling is more comprehensive). The non-duplicate values mostly occur at the beginning or end of these big frame shifts, or again in the early section which is more mixed-up anyway.I am concerned that one of these columns has been created by a manual drag-drop edit of the other, in Excel or in TrackMate software. I don't know enough about TrackMate to know exactly how this has occurred, but it could perhaps be the result of someone doing some manual correction on a run, but then accidentally saving the corrected run over a different run, rather than over the original, leaving an original and shuffled version of the same run? | §2.4 (order-sensitive) |
| C11 | cystic fibrosis / olfactory expression, *Sci Adv* 2025 | 10.1126/sciadv.ads1568 | science-detective | runnable | no | expression, ID×gene *(inf.)* | https://pubpeer.com/publications/249E1A02E45E405A4861430C12BB0D?ref=sciencedetective.org Looking through the data uploaded on Dryad (https://datadryad.org/dataset/doi:10.5061/dryad.w9ghx3g0p) for cell cycle scores, it appears that there is exact partial duplication of 33 rows of data in the control group. Sequencing sample IDs D571_572_573 and D574_575_576_577 have the exact same values for nCount_RNA, Barcode, barcode_seurat, percent_mito, integrated_snn_res.0.5, seurat_clusters, integrated_snn_res* (4 cols), S.Score, G2M.Score, and Phase (as well as some other columns where single values are common across the dataset). This pattern strongly suggests cells from one sequencing batch (D571, D572, and D573, which appear to be from D571_572_573 based on orig.ident) were copied to another batch (D574, D575, and D577, from D574_575_576_577) with altered metadata. Specifically, D577 is a duplicate of D571, D574 of D572, and D575 of D573. The fact that the cell barcodes are identical between different samples is particularly important - barcodes are meant to be unique identifiers within a sequencing run, and having the same barcode with identical biological measurements across supposedly independent samples is essentially impossible by chance. This duplication calls the comparisons made in the paper between CF and control groups into question. In particular, the duplicated part of the control group has particularly low G2M scores (-0.166, compared with an average of -0.0345 for the G1 sample, which is not duplicated), so their artificial over-representation inflates the effect size and dramatically increases the degree of confidence (p-value reduced by approximately 136x) in the claim that G2M scores are higher in CF than control samples. Furthermore, the very presence of duplicated values violates the independence assumption of the Mann-Whitney test employed. This is just comparing between a control group with and without this duplication: If instead the duplicated data has replaced other data, it is impossible to say how significant the effects on the eventual analysis could have been, and the effect may not exist at all. I note that orig.ident suggests, through use of the "D574_575_576_577" string, that there is a D576 sample. This isn't present at all; this suggests that there was a correct D574_575_576_577 set of samples which has been replaced with a copy of the D571_572_573. Are you able to check how this occurred, remove the duplicated parts of the control group, replace them with the true data if applicable, and perform your analysis again? | §2.4 HIGH |
| C12 | plant invasions / enemy release, *J Ecology* 2025 — **RETRACTED May 2026** | 10.1111/1365-2745.70059 | science-detective | run | no | wide, factorial *(inf.)* | *(https://pubpeer.com/publications/1FF86EEED4054ECA9E7625F67F79FB?ref=sciencedetective.org* The source data files contain multiple rows where root measurement values seem to have been copy-pasted from other rows, sometimes for observations intended to be from entirely different plant species. There are also many examples where root measurement values are almost identical with only one or two digits changed in some cells, while other values within the same rows remain exact duplicates. Below I’ve compiled 69 such rows from the field survey data available on [Datadryad](https://datadryad.org/dataset/doi:10.5061/dryad.stqjq2cdp) ([2025-3-24-Field_survey.xlsx](https://datadryad.org/downloads/file_stream/4027377), 2nd sheet - ‘Field survey-data’). | §2.4 + near-dup (split) → **outcome S314: no tweaks (WinRHIZO merge error, author-admitted); join-artefact FP surface; real defect MISSED.** **S315: §2.8 removes the FP, does not recover the defect. S316: §2.9 CATCHES IT — 34 copied pairs, all four documented copies, p = 1.03e-22. Class C → Class A.** · **S317: row-groups into 132 — BLOCKED, see §0.3** |
| C13 | drought / bamboo carbon flux, *J Ecology* 2025 | 10.1111/1365-2745.70060 | science-detective | runnable | **yes** | time-series *(inf.)* | *https://pubpeer.com/publications/84805DBB9C70E24E7E6C4A80F60A43?ref=sciencedetective.org For both the drought treatment and the control group, the three values for 'Leave 13C atom' and 'Branches 13C atom' reported for Day 90 and Day 360 are identical to those from Day 30 (with one exception in cell I126). Similarly, the values for Day 180 are identical to those from Day 15.The R0 values for the '0-15 Soil 13C‰' at 'sample time(d) 1' (-26.813, -27.312, -27.425) are identical to the values reported for the '15-30 Soil 13C‰' at 'sample time(d) 0'. | §2.4 HIGH |
| C14 | allometric tree growth NE N.Am., *Forest Ecosyst* 2025 | 10.1016/j.fecs.2025.100347 | science-detective | runnable | no | regression/allometry *(inf.)* | https://pubpeer.com/publications/CF1E616990CEA8E228B0FD318D7021?ref=sciencedetective.org *In the dataset accompanying this paper ([Tree-DBH-BA_and_BM_Growth-Data-BySps.xlsx](https://datadryad.org/dataset/doi:10.5061/dryad.t4b8gtjbm) available on Dryad) there are several sequences of trees with duplicated data.*In the above example there are two sequences of 11 rows with identical growth rate, diameter, height and all other numerical data. These rows must be duplicates of the same trees but they are shown as having different stand IDs, activity IDs and plot IDs. There are several other sequence pairs like this, for example rows 696-706&707-718 and rows 4921-4930&4974-4983. | §2.4 HIGH · **S322: row-groups into 236 (Species+DamageSev, min 1) — FIRES on Arm 2, blocked with the cluster; the S317 census missed it, see §0.3** |
| C15 | N-form acquisition / dominance, *Ecology* 2025 | 10.1002/ecy.70137 | science-detective | runnable | no | wide, species×treat *(inf.)* | https://pubpeer.com/publications/A8F99C33B614E8B23C87A2DC3C3773?ref=sciencedetective.org In the publicly available data for this paper on [Dryad](https://datadryad.org/dataset/doi:10.5061/dryad.bk3j9kdhw), there appear to be several cases in which data is duplicated across entries. Soil concentration of nitrogen forms is identical for plots 4 and 7 and plots 5 and 8 for the species Rhododendron aureum. Leaf concentration values are also the same for several pairs of observations. Notably, the soil concentration values mentioned above and the leaf concentration values for plots 1 and 2 of Pinus_koraiensis, plot 6 of Rhododendron aureum, and plot 4 of Alnus mandshurica appear in the same order, suggesting the possibility of copy-paste errors.Some of these values appear to be outliers within their species. This raises the possibility that the potential errors may have influenced the conclusions reached in the paper. | §2.4 HIGH |
| C16 | N+P enrichment / grassland, *J Ecology* 2025 | 10.1111/1365-2745.70105 | science-detective | runnable | **yes** | wide, factorial N×P *(inf.)* | https://pubpeer.com/publications/3DDD944835455D7BB78834B4B3A7C4?ref=sciencedetective.org In the paper’s accompanying dataset (['NP_Data.xlsx', available on Dryad](https://datadryad.org/dataset/doi:10.5061/dryad.n8pk0p37d)), there are rows for which the principle coordinates analysis values for some groups of plants (such as 'annuals and biennials') are the exact same even though they contain different numbers of species. In the above example, the AB_Rich values are natural logarithms of the number of species. 1.609... is ln(5), 1.791... is ln(6) etc. So the sample in row 2 contains 5 species while row 7 contains 6 species, but both rows have the same AB_PCo1 and AB_PCo2 values. This seems like a statistical impossibility. How can two samples have the same species composition but different numbers of species? | derived-col gap · **applicability-saturation exhibit** (V1X §2.9b). S319 read both files at source: real defect = plant sub-group PCoA repeated-point misalignment (17 cross-richness-impossible points in the original → 1 residual in the author update; 0 full-row duplicates either file). Every fired flag an applicability FP; DupDet correctly LOW. Grouping: 60 data rows → 60 singletons under default roles (Treat+Block+ZLev1 all condition). **The silent-not-assessed problem is closed.** The S320 grouping trigger fires on this case on both arms and the four row-grouped tests return N/A pending confirmation. The move-1 announce-empty banner named in the S319 reading was **retired at S320, superseded by the trigger** — see §0.3, where the body already records this. Corrected S340: this table row was the last surface still describing the banner as live. Detection fork leaned: build cross-column derived-consistency check, behind move-2 enforcement. Read + characterisation DONE; adjudicated run still blocked on enforcement. |
| C17 | breath mindfulness dyads, *JMIR Form Res* 2025 | 10.2196/69607 | science-detective | runnable | **yes** | small-N clinical dyad *(inf.)* | https://pubpeer.com/publications/A3A0B6DC3D0240024423B217F3171E?ref=sciencedetective.org The authors report pre- and post-intervention EEG signal differences for the fronto-parietal network (FPN), cingulo-opercular network (CON), and default mode network (DMN) for a sample of parents and children. In the provided data, obtained via [datadryad.org](https://datadryad.org/dataset/doi:10.5061/dryad.9ghx3ffss), there are several values that appear twice, when this would not be expected to occur with EEG signal recordings. Furthermore, these values seem to be duplicated for the FPN, CON and DMN conditions together, within the pre- or post-intervention columns. The attached screenshot shows the Neural data sheet with the duplicate values highlighted; no other modifications were made to the file after downloading. | §2.4 MODERATE |
| C18 | *Drosophila suzukii* coloration, *Biol J Linn Soc* 2025 | 10.1093/biolinnean/blaf057 | science-detective | runnable | **yes** | phenotype×group *(inf.)* | https://pubpeer.com/publications/E0C3ACCE04DFB62D5FEF4EFE7DEB8B?ref=sciencedetective.org *In the published data on [Dryad](https://datadryad.org/dataset/doi:10.5061/dryad.c866t1ghd) (data.xlsx file, Sheet 2: 'chill coma recovery duration(s)), the counts of D. suzukii adults in each chill coma recovery group don't appear to match what are reported in the paper. In the paper's methods section, it says that one hundred male and one hundred female D. suzukii from each of the three temperature subsets were selected for chill coma recovery. However the reported data shows varying counts for each group, ranging from only 14 for 20-degree males to 223 cases for 15-degree females. *I was hoping the authors could clarify how many D. suzukii were selected in each group for the chill coma recovery. Additionally, with only 14 20-degree males, there wouldn't have been the 30 D. suzukii required for the mate choice experiment to have occurred as reported in the methods section. Could the authors please additionally clarify how many 20-degree males were used for the mate choice experiment? | count-mismatch (not dup) |
| C19 | leaf-litter community dynamics, *Mol Ecology* 2016 | 10.1111/mec.13739 | science-detective | runnable | no | taxon×time matrix *(inf.)* | https://pubpeer.com/publications/6F0C9DFC35C6A20C82C94A38A43E40?ref=sciencedetective.org *Looking at the supplementary data on Dryad, I notice what seems to be a copy-paste error where the values for total carbon and total nitrogen (and therefore the resulting C/N ratio) have been copied between timepoints 3 (day 284) and 4 (day 362). It seems unlikely that these duplicates would happen naturally by chance. Could the authors confirm whether these are genuine values or an error?*The conclusion that "After 473 days, almost 40% of the total leaf litter mass had been lost; by day 284, the C:N and lignin:N ratios had also levelled off" as well as other conclusions related to correlations with C:N ratio mentioned in the paper might be affected. | §2.4 MODERATE |
| C20 | microbial richness / soil function, *Funct Ecology* 2017 | 10.1111/1365-2435.12924 | science-detective | runnable | no | wide, treat×function *(inf.)* | https://pubpeer.com/publications/DB62C3E915DD2B653672246AA7A3C9?ref=sciencedetective.org *The microcosm soil data for this paper has many instances where replicates of the same taxa combination have perfectly identical values for some columns but not others. *In the above screenshot the respiration (Glucose_IR, Lignin_IR, Basal_respiration) values seem to have been duplicated, while the rest of the values in the same rows have not. If these are not actual independent measurements, that’s problematic for any statistical test as not all data in a row is linked to the same replicate. It could also artificially reduce variance and inflate the degrees of freedom. On row 52, glucose and lignin are the exact same, while a basal_respiration is not. I don’t think this is mathematically possible in true independent measurements, since the glucose and lignin values are the result of a formula that subtracts the basal_respiration.In this screenshot, the bacterial composition columns as well as enzyme activity columns are duplicated, but the respiration columns are not. In the above screenshot, the Total_bacteria also seems to have been duplicated across different taxa_combinations, not just within the same taxa like in other examples. | §2.4 (partial-row) · **S317: row-groups into 37 — BLOCKED, see §0.3** |
| C21 | drought legacies, Inner Mongolia, *Sci Adv* 2022 | 10.1126/sciadv.add6249 | science-detective | runnable | **yes** | multi-year time-series *(inf.)* | *https://pubpeer.com/publications/0D363D8CE207A7CF2B38547CEFF7EA?ref=sciencedetective.org *The raw data belonging to this paper contains a sequence of 4 ANPP (*Aboveground Net Primary Productivity*) values that seems to have been duplicated. The first four values of the treatment group that received 200mm precipitation are the same as the first four values of the 275mm treatment group.What makes it strange is that the seemingly duplicated total ANPP is calculated by adding together the ANPP of annuals and perennials (D and E columns). In both blocks the annual + perennial values sum up to the total, even though the annual and perennial values are not duplicates. Thank you for your comment. After re-examining our raw data, we identified a copy-paste error in the ANPP data for the 275 mm precipitation treatment in 2017 within the dataset uploaded to Dryad. Specifically, the values of total ANPP for this treatment were inadvertently duplicated from the 200 mm precipitation treatment for the same year. During preparation of the dataset for upload to Dryad, the values in the first column (total ANPP) and the second column (ANPP of annuals) were manually pasted, whereas the values in the third column (ANPP of perennials) were automatically calculated as the difference between the first and the second columns for each row, as total ANPP within a plot equals the sum of the ANPPs of annuals and perennials. Consequently, the incorrect total ANPP values for the 275mm precipitation treatment in 2017 also resulted in erroneous corresponding values for the ANPP of perennials. We have verified that the data used in the associated analyses and figures (Figs. 2 and 3). We confirm that the data used in our analyses and figures correspond to the correct ANPP values of the 275 mm precipitation treatment. Specifically, in Fig. 2, the mean total ANPP for the 275 mm precipitation treatment is 188.3 g m⁻², rather than 183.0 g m⁻² (which would be obtained from the incorrectly pasted data). Likewise, the corresponding mean ANPP values of annuals and perennials used in Fig. 3 are correct. Therefore, the copy-paste error occurred only in the uploaded dataset and does not affect the results and conclusions of our manuscript. We apologize for this error in dataset preparation and for any confusion it may have caused. We have been in contact with the editorial office and will update the Dryad dataset with a corrected version as soon as possible, including a note in the README file to clarify this issue. | §2.4 HIGH · B-anchor |
| C22 | saprotrophic fungi / amendments, *Appl Soil Ecol* 2019 | 10.1016/j.apsoil.2019.103434 | science-detective | runnable | **yes** | wide, treat×rep *(inf.)* | *https://pubpeer.com/publications/5A27869922EED32EB0DF04015BD1BB?ref=sciencedetective.org *The raw data of the "WA experiment", contains pH measurements that seem to have been duplicated between different treatment groups. The pH values for observations at week 8 are the exact same for the four pots treated with sawdust from beech, hazel, willow and poplar as well as paper pulp. That seems unlikely to happen by chance. Could the author check if this is an error? | §2.4 (cross-group) · **S317: row-groups into 44 — BLOCKED, see §0.3** |
| C23 | FoxO-Usp / ecdysone body size, *eLife* 2014 | 10.7554/elife.03091 | science-detective | runnable | no | genotype×measure *(inf.)* | https://pubpeer.com/publications/7C6772F4FA25F4210982DF04E1A29F?ref=sciencedetective.org The qPCR data for this paper contains data that must have been copy-and-pasted between the "ND>FoxO WT" and "ND>FoxOi V86, UspiT" genotype groups.The raw gene expression data for the three target genes Phm, Dib and E74B are for the most part perfectly identical (marked in yellow) between the two groups, except a few values that have the exact same decimal portions with the integer part tweaked (marked in orange).The first three values of the "ND>FoxOi V86, UspiT" genotype are also duplicated at the start on rows 119-124. | near-dup gap |
| C24 | insect+bird declines Denmark 22yr, *Ecol Evol* 2019 | 10.1002/ece3.5236 | science-detective | runnable | no | long time-series *(inf.)* | https://pubpeer.com/publications/CA4799C341B36247373A41910DC5E0?ref=sciencedetective.org#3 The data contains more serious issues than previously noted in other comments. The windscreen insect splatter data include big chunks of data that seemingly have been copy-and-pasted between different years. This includes the raw counts of killed insects which is used for the paper’s primary claim that “insects killed on the windscreen decreased by 80%”.   All datapoints inside the red rectangle are perfectly duplicated, including the count of total insects, the date and time of the observations as well as weather data. But the temperature data (marked in purple) is a curious exception, where the values for 2005 are perfect mathematical transformations of the 2001 data | §2.4 HIGH + affine gap |
| C25 | persistent luminescence, *Nature Photonics* 2024 | 10.1038/s41566-024-01396-0 | science-detective | runnable | no | instrument spectra *(inf.)* | The phosphorescense data for Figure 2b has a big block of duplicated intensity values. Below I've put rows 20-74 next to rows 75-129 to show that they have the exact same values. https://pubpeer.com/publications/57EFF3B48FF332A7731D85C3ABC27D?ref=sciencedetective.org | §2.4 HIGH |

*(inf.)* = Chat inference from title/journal — a prediction to test against, not ground truth. Overwrite on data pull.

**Counts:** 3 run · 2 parked · 1 dropped · 19 runnable = 25 rows / 24 distinct papers (C06 = CORPUS-02). **Availability sweep (S305): 19/19 downloaded — zero paper-only, all runnable.** 8 update pairs on disk (C07, C09, C13, C16, C17, C18, C21, C22 — C22 found on disk, no thread marker).

**Sweep findings (S305 — disk is authority):** files in `corpus-data/`, named `C[nn].xlsx` + `C[nn]-update.xlsx` for update pairs.
- **8 update pairs**, not 7: disk carries **C22-update.xlsx** with no PubPeer marker in the thread cell — capture the C22 author response, or note the update as deposit-only. C23 has no update (consistent).
- **Naming inconsistency:** C13's update is `C13-updated.xlsx` (past tense) vs `-update.xlsx` everywhere else. A `*-update.xlsx` glob will silently skip the C13 pair. **Normalise before any batch loop**, or C13 runs original-only.
- **Two legacy `.xls`:** C11 (`C11.xls`) and C24 (`C24.xls`) are old binary format; the rest `.xlsx`. Import-layer behaviour on `.xls` untested — run these early as the shape/format-diversity probe.
- Per-file sheet + declared roles still to capture at first load (provenance rule); `corpus-run.mjs` takes a positional path so filename variance doesn't block a single run, only batch globs.

### Fill order (shape-diversity seeding — S237 triage-before-runs)

Fill **availability first across all 19** (the hard filter — paper-only can't be road-tested). Then defect + confirmed shape on the 5 shape-diverse outliers before the ecology cluster, so an import bug surfaces before the ~11-paper shared-shape cluster is worked:

1. **C25** Nature Photonics — physical-science spectra (most alien shape)
2. **C17** JMIR mindfulness — small-N clinical dyad
3. **C18** *Drosophila* coloration — phenotype measurement
4. **C24** Denmark 22yr — long time-series
5. **C10** bioconvection — spatial/time-series microbial
6. then C11 (expression), C19 (community matrix), then the ecology cluster (C07, C09, C12, C13, C14, C15, C16, C20, C21, C22, C23 — likely one shared shape; one import result generalises).

Predicted channels stay blank until the defect column is filled per case.

---

## 0.1 Author-updated deposits (`Cxx-update` tracking)

Some flagged cases have a **second, author-corrected file** posted after the PubPeer flag. This is a versioned re-deposit, not a new case — it belongs to the same Cxx row. An update is valuable *and* a potential trap, so each is tracked with four fields before it enters a run.

**Why it matters:** a paired original+update is a rare specificity test — the tool should fire §2.4 on the original and **fall silent on the update** if the duplication was genuinely fixed. But a silent tool on the update only proves the authors pasted correctly the second time; it says nothing about whether the *paper's conclusions* were affected. The adjudication stays on the original unless the update is the road-test target by explicit decision.

**Fields per updated case:**
- **update?** — yes / no / unknown *(Nick fill, per thread + Dryad version history)*
- **update version DOI** — the distinct versioned Dryad identifier (provenance rule needs the exact version, not just the dataset DOI)
- **update scope** — did it fix *the flagged cells*, or correct something adjacent? Do not assume the update addresses the PubPeer defect.
- **adjudication target** — `original` (update = context) / `update` / `both-as-pair` (detection on original + specificity on update)

**Structure-first note (S237):** this is a per-row provenance property. Fill `update?` across all 19 as one classification pass — don't discover updates case-by-case at run time. `unknown` is a valid interim value; `no` must be a checked negative, not an unfilled blank.

### Per-case update blocks

Eight rows carry an author update (C07, C09, C13, C16, C17, C18, C21, C22). Blocks below — version DOI, scope, and adjudication target are Nick-fill from the thread and Dryad version history. Chat pre-filled the flagged defect each update must address, and flagged two shape-cautions (C16 derived-column, C18 count-not-duplication). **C22 was found on disk without a thread marker — capture its author response, or confirm the update is deposit-only.**

**C07 — soil warming / microbial P (*Nat Comms* 2023)**
- **update?** yes
- **update version DOI:** *(fill — versioned Dryad `dryad.9p8cz8wk8`)*
- **update scope:** *(fill — does it fix the identical total/organic P rows AND the total ≠ organic+inorganic break, or only one?)*
- **adjudication target:** *(fill — original / update / both-as-pair)*

**C09 — warming / alpine root-leaf traits (*Ecosyst Health Sust* 2025)**
- **update?** yes
- **update version DOI:** *(fill)*
- **update scope:** *(fill — does it fix the cross-replicate duplicate values, and does recomputed-SLA still diverge in the update?)*
- **adjudication target:** *(fill)*

**C13 — drought / bamboo carbon flux (*J Ecology* 2025)**
- **update?** yes
- **update version DOI:** *(fill)*
- **update scope:** *(fill — Day 90/360=Day 30 and Day 180=Day 15 block duplication; fixed?)*
- **adjudication target:** *(fill)*

**C16 — N+P enrichment / grassland (*J Ecology* 2025)**
- **update?** yes
- **update version DOI:** *(fill — Dryad `dryad.n8pk0p37d`)*
- **update scope:** PCoA column misalignment — during a merge the PCoA columns (`Plant_PCo1`…`OC_PCo2`) were pasted out of order against the SampleIDs, so real PCoA values sit on the wrong samples. This is a derived/adjacent-column contradiction (identical PCoA on rows of differing richness), **not** a whole-row dup. Author-corrected March 2026 (`NP_Data_New.xlsx`); paper *not* retracted — the correction claims all published results used the Z-transformed columns, which were correctly aligned. **Source-verified caveat (S318):** 910 Z-values changed between the two deposited files, so the author's "Z-columns unchanged" claim is not what the files show; record the files, not the letter.
- **adjudication target:** **original** (the misaligned deposit). But note this is a *detection-gap* case, not a detection case: the tool does **not** catch the misalignment (see below), so C16's value is as a disclosed miss, not a catch.
- **S318 read outcome (roles: Treat=cond, rest attr/data, non-replicates):** C16 is the **applicability-saturation exhibit**. The real defect is uncaught — misalignment leaves no duplicate and no single-column anomaly, only a cross-column impossibility (identical PCoA + different richness) no test checks; distinct from C12's copy-→-duplicate fingerprint. Every flag that fired is an applicability false positive on transformed/count data (entropy low-H on richness counts vs a continuous baseline; `nBins` pooling across 107 heterogeneous columns; block-collision on log-of-small-counts). Full treatment in `V1X-FUTURE-WORK.md` §2.9b; ground truth (both files + author response) in `C16-GROUNDTRUTH-BANK.md`. **C16 is read-characterised only — blocked in the ecology cluster until grouping enforcement lands.** Grouping settled at source (S319, two ways — Chat file read + Code pipeline probe): the file is **60 data rows**, and default role inference tags Treat+Block+ZLev1 all condition → their product is unique per row → **60 singletons → `rowGroups()` null → move-1's announce-empty banner fires under default roles.** The long-carried **"~18 conditions" figure is a PHANTOM** — it reproduces under no role set (Treat alone → 2 groups, Treat+Block → 10, all three → 60; a 1–3 column scan finds nothing in the 15–21 range). Its digits came from C12's real "132 groups of ~18 rows each," mis-attached as a group-count; strike on sight, do not reconcile. (Not to be confused with a *third* real 18: C16 has 17–18 measurement-group column-families — a column-structure count, not a row-grouping count.) The misalignment-detection question is now leaned, not open: build a cross-column derived-consistency check (17/1/0 separation, no false-positive mode), sequenced behind move-2 enforcement; within-column repeated-value was rejected (fires on the corrected file too).

**C17 — breath mindfulness dyads (*JMIR Form Res* 2025)**
- **update?** yes
- **update version DOI:** *(fill — Dryad `dryad.9ghx3ffss`)*
- **update scope:** *(fill — EEG values duplicated across FPN/CON/DMN within pre/post, all in child data; fixed?)*
- **adjudication target:** *(fill — note the thread ties the duplication to the paper's primary DMN result, so an original-vs-update pair here directly tests whether the headline effect survives)*

**C18 — *Drosophila suzukii* coloration (*Biol J Linn Soc* 2025)**
- **update?** yes
- **update version DOI:** *(fill — Dryad `dryad.c866t1ghd`)*
- **update scope:** *(fill — NOTE: C18's flagged defect is a count mismatch (group Ns don't match methods), NOT a duplication. An update here may be a clarification/recount, not a data-cell fix — check what the author actually changed)*
- **adjudication target:** *(fill)*

**C21 — Inner Mongolia grassland *(pre-noted from thread — Chat)***
- **update?** yes (authors stated in the PubPeer thread they will re-upload a corrected Dryad file with a README note).
- **update version DOI:** *(pending — capture the versioned DOI when the corrected file is posted)*
- **update scope:** fixes the flagged cells — the 275mm-2017 total-ANPP copy-paste from the 200mm treatment, plus the derived perennial values.
- **adjudication target:** **original.** The authors assert the *analysis and figures* used correct values (Fig 2 mean 188.3 not 183.0) and only the deposited file was wrong. So the tool firing §2.4 on the original is a correct detection of a real deposit defect; a silent tool on the update proves only that the re-paste was clean — **not** that any paper conclusion was affected. This is the corpus's sharpest Class B boundary: real duplication in the artifact ≠ fabricated result. Keep the label on the original; the update is context.

**C22 — saprotrophic fungi / organic amendments (*Appl Soil Ecol* 2019)**
- **update?** yes — **found on disk (`C22-update.xlsx`), no PubPeer marker in the thread cell.** Confirm whether an author response exists or the update is a deposit-only revision.
- **update version DOI:** *(fill)*
- **update scope:** *(fill — WA-experiment pH identical across the 5 sawdust/pulp treatment pots at week 8; does the update alter those cells?)*
- **adjudication target:** *(fill)*

---

## 0.2 Predicted detection channels (Chat, pre-run — a prediction to test, not a result)

All 19 triage cases are duplication defects. That is the corpus's dominant fact: it is a duplication-detection stress test, not a broad-spectrum one. The value is in *where within duplication* each falls, because the split maps onto known coverage.

**Structure-first classification (S237 — one pass over all 19):**

**Group 1 — exact / block duplication → §2.4 Sequential Duplication fires (the S304 detector).** ~11 cases. Aligned blocks or cross-group copies where whole rows or column-runs recur byte-identical:
- **C11** cystic fibrosis — 33 rows exact partial dup across sequencing samples, identical barcodes → HIGH.
- **C13** bamboo — Day 90/360 ≡ Day 30, Day 180 ≡ Day 15 → HIGH.
- **C14** allometry — two 11-row sequences identical across all numeric columns, different IDs → HIGH, cleanest cross-group block. **Partial result S316 (not a full run — C14 was loaded as a stress case for §2.9's prefilter).** It fires, and Duplicate Detection already flags a two-row exact group. **ADJUDICATION CLOSED S328 — DEFECT.** The pair is at **sheet rows 262↔263, not 260↔261** (the old numbers were matrix rows labelled as sheet rows). The two rows carry **different `STAND_ID`s** — 438100933-03 and 438101621-05 — with identical plot number, tree number, ring count, DBH and all twelve growth values to fifteen decimal places. Two different stands cannot produce that, which is the same signature the PubPeer entry describes for the 11-row blocks. And it is not isolated: ignoring the four ID columns, C14 `Data` holds **253 duplicate measurement blocks covering 516 rows** through the real pipeline — 230-odd pairs, 8 triples, 1 quadruple, of which **190 span different `STAND_ID`s** and only **8 are adjacent**, with gaps running to 1,783 rows. Adjacency was the load-bearing plank of the convention reading and it describes 3% of the pattern. Read at source from the deposit at S328; the tool is right to say the rows are identical. **Also the file that broke the prefilter:** `CROWNCLASS` (5 distinct values over 9,398 rows) generates 16.9 million agreement pairs alone; a categorical code stored as a number. That measurement forced §2.9's cardinality guard. **C14 has not had a proper adjudication run.** Priority — it is now two things at once. **S322: make that three. C14 also row-groups — its `Data` sheet tags `Species`+`DamageSev` → 236 groups, min size 1 → fires on Arm 2. The S317 §0.3 census bucketed it as "no condition columns"; corrected. So C14's eventual run is gated by grouping enforcement like the rest of the cluster, and its row-grouped verdicts are not interpretable until that promotes.**
- **C15** N-form — plot pairs identical across species, same order → HIGH.
- **C25** Nature Photonics — rows 20–74 ≡ 75–129 → HIGH, textbook block.
- **C19** leaf-litter — C/N copied between timepoints 3 and 4 → MODERATE.
- **C17** JMIR — EEG values recur across FPN/CON/DMN within pre/post, partial-row → MODERATE.
- **C20** soil multifunctionality — respiration columns dup within taxa, partial-row (some columns dup, others not) → partial-row regime.
- **C22** saprotrophic fungi — pH identical across 5 treatment pots → cross-group.
- **C10** bioconvection — values recur but **reordered across frames**, positions don't align → tests §2.4's order-sensitivity; likely under-calls (echoes CORPUS-03's scramble).
- **C21** Inner Mongolia — 4 ANPP values dup across treatments → HIGH. **Also the sharpest Class B anchor** (§0.1: real deposit dup, authors assert analysis unaffected).

**Group 2 — near-duplicate (digits tweaked) → Class C gap at prediction time; channel BUILT S312, PARTLY VALIDATED S313.** 3 cases. Most of a row copied, a few digits altered — the exact pattern CORPUS-02 exposed and only whole-column digit tests / exact-dup tests were built for. **Predicted as uncovered, and correct when written.** C23 then ran (S305), was missed by Exact Duplicate exactly as predicted, but was caught *accidentally* by Value-Frequency Spike via its shared 6-decimal tail `.385732`. That accident named the channel; the **S312 distinct-key deep-tail scan** built it deliberately. A fractional tail shared across distinct integer parts now reaches the scorer at any span:
- **C08** Parthenium — same value as another row "with one digit changed". **MISSED (S313).** The digit changed in the *integer* part (140 → 130) — exactly the shape the channel wants — but the value was retyped and the float tail was rebuilt (`...5763` against the source's `...576285`), so the key does not match. Caught instead by **Sequential Duplication**, on its LPO limb.
- **C12** invasions — predicted split detection (exact columns fire §2.4, tweaked columns don't). **PREDICTION VOID (S314).** Read at source: the root measurements were **not tweaked at all**. Every copied root block is exact to the last bit of the double. What PubPeer read as "one or two digits changed" is column X, *Root tissue density*, which is **derived**: X = S/W (belowground mass ÷ root volume), exact in all 2,412 rows. X moves because S moves. There is no near-duplicate here to detect.
- **C23** eLife qPCR — same decimal portions, integer part tweaked. **NOW CAUGHT** (S312 deep-tail scan — the case that drove the build).

These three are the near-duplicate detector's ground truth — real data, documented, three independent journals. **The detector exists (S312). C23 is its confirmed catch. C08 is its confirmed miss (S313), and the miss names the limitation:**

> **The deep-tail channel requires the fractional tail to survive byte-identically.** Any operation that rebuilds the number — retyping, rounding, a text-field round trip, a different float path — changes the tail, and the key no longer matches. C23 survived only because its copies preserved full precision.

**The failure mode is not tweak *location*, as S313 predicted going in, but whether the number was reconstructed.** C08's tweak fell in the integer part — precisely where the channel wants it — and the channel still missed, because `130.492634615763` and `140.49263461576285` share eleven digits but not a tail key.

**C12 was to be the channel's last independent validation. It is not a validation case at all (S314).** The question put to it — *were the tweaked cells edited in place, or retyped?* — has no answer, because there were no tweaked cells. The apparent tweaks are a derived column tracking its numerator.

> **The deep-tail channel has no independent validation in this corpus.** C23 is its only catch and that catch was accidental. C08 is its only genuine test and it missed. C12 does not test it. The channel ships on one lucky exhibit — that is the honest statement, and it belongs in §5.

**Complement banked (S313).** *Shared-digit-run detection* — ≥10 matching digits between two unequal values, at any position in the number. Catches copy-with-tweak where the tail was rebuilt. The null is trivially safe at that depth: expected count across 61,000 pairs is ~2×10⁻⁶, so a single long run is decisive without correction. **Neither channel subsumes the other.** The deep-tail scan catches *short* runs that are structurally anchored (C23's six digits — but the whole tail, across distinct integers). The run scan catches *long* runs that are unanchored (C08's twelve, mid-number). Both are needed.

**Group 3 — derived-column contradiction → separate uncovered gap.** 3 cases. A duplicated (or impossible) value contradicted by a companion column that should determine it — no test checks cross-column derivation integrity:
- **C07** soil warming — total ≠ organic + inorganic P (should sum) → §2.4 fires on the identical rows, but the sum-break is uncaught.
- **C09** alpine traits — reported SLA ≠ recomputed LA/LM → §2.4 fires on duplicates, SLA-derivation break uncaught.
- **C16** N+P grassland — identical PCo1/PCo2 for rows of *different* richness (richness column proves rows aren't identical samples) → the contradiction, not a whole-row dup, is the signal; §2.4 may not fire at all.

**Group 4 — not a duplication defect.** 1 case.
- **C18** *Drosophila* coloration — group Ns don't match the methods (count mismatch). Won't route to §2.4; no current test targets reported-vs-actual count reconciliation. The lone non-duplication case in the corpus.

**Adjacent uncaught pattern (noted, not a group):**
- **C24** Denmark — Group 1 block dup on the insect counts (§2.4 HIGH), **but** the temperature column is an *affine transform* of another year's block ("2005 = mathematical transformation of 2001") — no test catches a transformed-block copy. A second Class C flavour beyond near-dup.

**What this predicts for the run:**
- **§2.4 carries the corpus** — ~11 clean fires, the detector's first real-world exercise at scale.
- **Three coverage gaps got real-data instances; one is partly addressed.** Near-dup (C08/C12/C23) — **the S312 deep-tail scan ships and catches C23, but missed C08 (S313)**. The gap is narrowed, not closed. Still open: derived-column (C07/C09/C16) and affine-block (C24). The near-dup arc remains the corpus's fullest story — a documented defect the tool missed, which drove a detector that catches it, which the next case then defeated in a way that named its reach.
- **False-positive test lands on C21 and C10** — real duplication where intent/impact is contested (C21 author-confirmed-but-benign, C10 innocent-mechanism hypothesis). These are where over-calling would show.
- **C18 is the odd one** — may not fire anything; a coverage boundary, not a miss to fix.

Predictions are pre-run. Adjudicate tool output against the data per §4 A/B/C; where a prediction and the run diverge, the run governs and this section gets corrected (same discipline as §2's reading note).

**Reconciliation (S313, after 5 of 19 runs).** The structure-first classification has held up. §2.4 fired as predicted on the Group 1 block dups it has met (C25, C11, C21). The Benford axis-1 prediction was made *after* C25 and has since recurred on C11, C21 and C08 — **four confirmed** — and it correctly did **not** fire on C23, so it is not firing indiscriminately. The ecology-cluster prediction (C07, C09, C15, C16, C20, C22) is untested and is the sharpest standing bet in this section.

> **THE ECOLOGY CLUSTER IS BLOCKED (S317).** Four of its six files — C09, C16, C20, C22 — row-group into 20, 60, 37 and 44 units respectively, and **C16's sixty groups are all singletons, silently dropped, with nothing announcing that grouping produced nothing** (§0.3). Their row-grouped verdicts would be computed on units the tests were not designed for, and read as findings. **Do not run the cluster until the grouping contract is settled.** The standing bet above remains live — the Benford axis-1 prediction concerns cross-column pooling, which is unaffected — but the cluster's *row-grouped* results are not interpretable, and the two cannot be read from the same run. The cluster has waited three sessions; it can wait one more. **(S322 update: the contract is settled and cross-validated, and both enforcement parts are built — trigger + confirm card, twelve fixes unpromoted. The cluster is now gated on that stack promoting, not on the contract. C14 joins the blocked set — S322 census correction, §0.3.)**

**Two predictions have now fallen, and the second is the more interesting.**

1. Group 2's "NO current test fires" — true when written, **addressed by the S312 build**.
2. **S313's own prediction that the deep-tail channel's limit would be tweak *location*.** Going in, the stated risk was: *if the changed digit falls in the tail, the channel cannot reach it by construction.* C08's digit changed in the **integer** part — the favourable case — **and the channel still missed**, because the number had been retyped and the tail rebuilt. The real limit is *tail fragility*, not tweak position. A prediction that fails for a reason nobody anticipated is worth more than one that holds.

**Two predictions remain squarely at risk:** C10 (reordered-across-frames — predicted to under-call, testing §2.4's order-sensitivity) and C18 (predicted to fire nothing at all — a coverage boundary, not a miss).

**The false-positive surface is now demonstrated — and it is not the one that was predicted (S314).**

The prediction was a benign *quantized instrument* column flagging on the deep-tail scan. C08 was expected to supply it and did not (all three columns full-float, 14–17 dp). C12 supplies it instead, at scale, from a cause nobody had named:

> **Site-attribute columns joined onto a long-format table.** C12 carries latitude, longitude and the 19 WorldClim bioclimatic variables — 21 columns that describe the *site*, not the plant. There are ~50 sites and 2,412 rows, so each of those 21 values repeats ~50 times **by construction**. The engine has no notion of a column that is an attribute of a grouping key rather than a measurement of the row, so it reads the join as duplication.

Seven HIGH flags and seven MODERATE fire on C12, and essentially all of them trace to this (verified S315 on the §2.8-off arm). It is a bigger, more general false-positive surface than a quantized assay would have been, because long-format tables with joined site or subject attributes are ubiquitous — in ecology, in epidemiology, in any repeated-measures design. **This is the §5 disclosure case.**

---

## 0.3 Row-grouping census — READ BEFORE ANY RUN (S317)

**Six of twelve row-grouping files partition into units the row-grouped tests were not designed for.** This is not a per-file quirk. It is the engine's grouper, and it is the tool's own applicability failure. Full analysis in V1X §2.10.

**The mechanism.** The group key is the `" | "`-joined concatenation of **every** column role inference tags `condition` (`engine.js:110`, `:138-143`) — the **Cartesian product**, not a grouping factor. Files with one or two genuine factor columns behave. Files where inference tagged three to seven metadata columns explode.

Largest data sheet per file; role inference as in the real pipeline.

| File | Sheet | Rows | Groups | Median/grp | Min/grp | Condition columns |
|---|---|--:|--:|--:|--:|---|
| **C12** | Field survey-data | 2412 | **132** | 16.5 | **3** | Latitudes, Combine, Plot, Pair, Code, Name, Origin |
| **C16** | Sheet1 | 60 | **60** | — | — | Treat, Block, ZLev1 — every row its own group; 60 singletons. **Fires the move-2 grouping trigger on both arms** (≥3 condition columns; `rowGroups()` null). The move-1 banner it previously recorded was retired at S320. |
| **C22** | Exp. WA | 176 | **44** | 4 | **4** | Experiment, Material, N Fertilizer, Time |
| **C20** | Microcosm soil B | 204 | **37** | 3 | **3** | Soil_type, Taxa_combination |
| **C08** | DATA | 350 | **35** | 10 | 10 | Duration, Setup, Stage |
| **C09** | Sheet1 | 60 | **20** | 3 | **3** | Species, Genus, Family, Treatment |
| C21 | precipitation exp | 162 | 9 | 18 | 18 | treatment |
| C07 | Mastersheet | 72 | 6 | 12 | 12 | Warming, Season. **39 data columns** — before `99f75de` role inference held out twenty and the file analysed on 21; the S325 ecology census entry was measured in that state and is stale. Verdict tier held at High across the correction; per-test detail moved 10 HIGH → 12 HIGH + 4 MOD. |
| C13 | Soil CO2 | 178 | 2 | 89 | 85 | Ramet, Treatments |
| C17 | Neural | 41 | 2 | 20.5 | 19 | Group |
| CORPUS-01 | Sheet1 | 105 | 10 | 10.5 | **6** | Treatment, Genotype. **S327: min group size is 6, max 15 — the earlier 10 is corrected.** Rows, group count and median all reproduce exactly. |
| CORPUS-03 | Clonal molly | 373 | 3 | 124 | 121 | Trt |
| C10, C18, C19, C23, C25, CORPUS-02 | — | 0–3600 | 0 | — | — | no condition columns — not row-grouped. **S327 sheet corrections:** C10's flagged tab is `P. megatetrium Experiment1` — 848 raw rows, 633 × 28 through the pipeline. C25's flagged sheet is `Fig. 2b` at 401 × 12, resolving to 400 analysis rows. Neither crosses the 5,000-row sequence-scan guard. |
| **C15** | Data | 60 | 5 | — | — | **Imports as of `d3f50e9`** (S326 import-width trim). Resolves to 60 × 18 with five condition columns. The earlier reading — "does not import; `preprocessRaw` computes the sparse-row threshold from the used range, which runs to column XFD → threshold 1639 against ~26 real values per row; row-grouping unknown and untestable" — described the pre-trim engine and is retired. Import confirmed independently S327. Group count and median not yet measured. |

*S322 correction.* This is the S317 census, "largest data sheet per file." The S322 firing-rate sweep re-ran the same `computeTrigger` through the real inference pipeline across all 22 deposits, reproduced every measured row here bit-identically, and corrected the catch-all on one file: **C14 fires** — its `Data` sheet (9,426 rows) tags `Species` + `DamageSev` → 236 groups, min size 1 → Arm 2. C14 is the 7th fire, wrongly bucketed above as "no condition columns"; treat it as blocked with the six. **C24** is row-grouped but clean (tags `Month` → 4 healthy groups). Full 7-of-22 result and the bimodal domain split (47% of row-groupable ecology files, 0% of assay/instrument/expression) in V1X §2.10.

**The six in bold are blocked. Do not read their row-grouped results as findings.** (Seven, with the S322 C14 correction above.)

**Affected tests.** Row-grouped dispatch: Entropy, Column Goodness-of-Fit, Modality, Mahalanobis Row Outlier (stratified), Cross-Condition Consistency. On these files every one of them runs on the exploded units.

**C16 is the worst case and it fails silently.** Sixty rows; three condition columns whose Cartesian product is unique per row. Sixty singleton groups, all dropped by the min-3 guard, `rowGroups()` returns null, the tests take the ungrouped path or return N/A. **Nothing announces that the grouping produced nothing.** A reader sees a file that looks assessed. Same shape as C12's copied roots — a p of 1 that never counted anything. **Resolved:** the move-2 grouping trigger fires on exactly this case on both arms, and the four row-grouped tests return N/A pending confirmation. The move-1 announce-empty banner that first covered it was retired at S320, superseded by the trigger. This paragraph is the diagnosis that motivated the fix, kept for the record.

**Four of the six are the ecology cluster** (C07, C09, C15, C16, C20, C22), held for three sessions to be run once §2.8 and §2.9 landed. **Had the cluster been run before this census, four of six would have produced row-grouped verdicts computed on units nobody designed for — and been read as findings.**

**Guards.** Minimum rows per group: yes (≥3, and `rowGroups()` returns null unless every group clears it). **Maximum group count: none.** METHODOLOGY states a per-group *size* assumption (`:648`) and says nothing about group count, because nobody imagined 132.

**Source:** S317 read-only census (Code), run with role inference as in the real pipeline. Opened by a Cross-Condition Consistency performance measurement (43.5s of C12's 59.4s run — the `ksDistance` cost is `C(132,2) ≈ 8,646` condition pairs), not by a methodology review. **A performance complaint is a legitimate route to a correctness finding.**

---

## 0.4 Eyeball-findings log (per-case, adjudicated against source — S305)

Each case gets an entry as it is run and adjudicated in the live UI. Adjudication is against the **data file at source** (read the .xlsx), not the console dump — the console's derived metrics can manufacture false signals and bury real ones (see C25 method note). Class A/B/C per §4.

**Standing exclusion.** No OIST-affiliated papers enter the corpus, whatever their PubPeer status. This is a conflict-of-interest rule about the screener, not a judgement about any deposit.

**Run protocol (settled at C25, reinforced S327):** deposits are often multi-sheet workbooks — identify the PubPeer-flagged sheet/columns first, run that sheet as deposited (honest false-positive surface), and isolate to analysis-relevant columns only to adjudicate a confound. The raw-vs-isolated delta is itself a result (a B2 with a named mechanism). Read the source file to settle ambiguous flags; do not adjudicate from the console alone.

> **Workbook extent is not analysis row count.** Every row, column and group figure in this document is a property of a named sheet. A figure read off a workbook and applied to a sheet-level adjudication will be wrong, and it will look plausible. This happened four times in S327 alone: C25 cited at 43,202 rows (the workbook; the sheet is 401), C10 at 16,522 (a different, unflagged sheet; the flagged tab is 848), and twice more downstream. Through the real pipeline only four corpus sheets exceed 5,000 analysis rows — C14 `Data` and three C11 sheets. **Carry the sheet name beside every figure you quote.**

---

### C25 — persistent luminescence (*Nature Photonics* 2024) — ADJUDICATED

**File:** `C25.xlsx`, 14 sheets (one per figure). Flagged sheet: **Fig. 2b** (401×12 as-deposited: 4 conditions × Wavelength+Intensity). Other 13 sheets un-run.

> **The 43,202-row figure sometimes cited for C25 is the whole fourteen-sheet workbook, not this sheet.** The analysed sheet is 401 rows and resolves to 400 analysis rows through the pipeline; the workbook as a whole resolves to 3,600. C25 does **not** cross the 5,000-row sequence-scan guard. Recorded S327 after the figure was carried into three dispatches as though it were the analysed row count.

**Ground truth (author-admitted, PubPeer):** the phosphorescence spectrum in Fig. 2b genuinely started at 414.2 nm, not 400.0 like the other three. On figure assembly the phosphorescence data were pasted into wrong wavelength positions then moved, leaving duplicate intensity values in the 400–414.2 nm range. Authors confirm the mistake, assert all remaining data accurate. **Strongest ground-truth class in the corpus — an author admission, not just a commenter's inference.**

**Class A — CAUGHT.** §2.4 "Recurring value sequences" localised the Phosphorescence intensity block (rows ~20↔75, offset naming per card 4–17→74–87), confirmed at source: intensity 1.135/1.195/1.198/1.226 recurs, wavelength column authentic ascending. This is the admitted defect, caught and correctly localised. The value-pair channel (Exact Duplicate) also counted it but headlined it "within a row" — see Code defect below.

**B2 surface (every flag has a named mechanism):**
- **Benford 1st/2nd digit** — FLAGGED. **Correction (Code read, source-measured):** the earlier "single-magnitude, no OOM gate" reading was wrong. An OOM applicability gate exists (`robustLogSpan < 1.5` → N/A; METHODOLOGY §3.2, CLAUDE.md:58), is correctly thresholded, and C25 **passes it legitimately** — pooled span = 5.82 OOM (PL column reaches 2.3M; only phosphorescence is ~1–4). The false positive is real but the cause is **heterogeneous pooling**: the four conditions are physically incomparable scales (PL ~10⁵, phosphorescence ~10⁰, TIP ~10⁰–10²); flattening them manufactures a wide span from a mixture of narrow processes, and Benford requires a single homogeneous multiplicative process. Span is necessary-not-sufficient; a spectral curve nonconforms by shape even per-column. **Raising the OOM threshold would be the wrong fix** (5.82 ≫ any threshold; would silence legitimate wide-span single-process data). Real gap = process-homogeneity / applicability, not span. → METHODOLOGY §3.2 design question (Chat), then Code. Corpus-wide risk: **any heterogeneous-column pool triggers this** — predicts the same B2 on the multi-variable ecology sheets (C07, C09, C16, C20).
- **Terminal Digit even-odd** — stark even-digit spike on the full deposit; **gone** on intensity-only isolation. Cause: the wavelength axis (400.0, 400.2, 400.4…) ends in even tenths by construction. Axis artifact, B2.
- **Spectral-shape cluster** — Autocorrelation (meanR1≈0.99), Within-Row-Variance "too smooth", Missing-Data block (rows 202+ cols 3–4 = conditions with shorter ranges), Excess Kurtosis. All from smooth spectra + no ordered-row-semantics mode. B2.
- **Value-Frequency Spike (.25/.125/.375…)** — appeared on intensity-only isolation; **not** a binary-fraction/ADC signature (source read: TIP values like 1.0044, 3.50094 are not power-of-two quantised). Artifact of pooling four differently-scaled intensity columns. B2. *(Chat initially misread this as a real quantisation signal; source read dissolved it.)*

**Held, not claimed — TIP intensity ratios.** Cols 9/12 (TIP-1h / TIP-9h intensity) show exact small ratios (L/I = −1.0 ×20 rows, −2.0 ×14, −0.5 ×10, +2.0 ×9, 0.0 ×23). Real numerical oddity, but the data is near-baseline noise (many exact zeros, sub-2 magnitudes) where simple ratios arise coincidentally, and authors assert this data accurate. **Not adjudicated as a B1 find** — would need a physicist read that the ratios are non-physical. Recorded as open, not banked as a road-test win. *(Chat's second over-read this case; held per state-claim discipline.)*

**Code defect — "within a row" mislabel.** Exact Duplicate card headlines the block "Duplicate values within a row — 212 repeated value-pairs within 200 rows" while the console shows `within=0, cross=212`. Manifests only on the wide multi-condition layout (intensity-only run: Exact Duplicate CLEAR, wrTotal=6). Copy/template defect, wide-format-entangled. → Code (banked, lower priority than Benford gating).

**Verdict:** one author-confirmed catch (§2.4), a fully-characterised B2 surface with every mechanism named, one Benford false-positive traced to heterogeneous-column pooling (a METHODOLOGY applicability question, not a gating defect — Code confirmed the gate is present and correct), one banked Code copy defect (within-a-row label). A textbook §5 instance: expert-flagged item caught, false-positive surface disclosed with causes.

**Method note (S237, lived):** three Chat pattern-claims this case (binary-fraction quantisation; TIP-column mirror; Benford single-magnitude/no-gate) were each dissolved or corrected by reading the data at source — the first two by Chat's own later source reads, the third by Code loading the file and computing the span (5.82 OOM, gate present and correct). Console-derived metrics and console-slice reads are not ground truth for numeric claims; compute against the file before asserting. The honest result is stronger for *not* claiming the TIP columns and for correctly locating the Benford cause (heterogeneous pooling, not a gating defect).

---

### C11 — cystic fibrosis / olfactory epithelium (*Sci Adv* 2025) — ADJUDICATED

**File:** `C11.xls` — **legacy binary `.xls`, the sweep's first.** 34 sheets (one
per figure); **three run, 31 un-run.**

| Sheet | Source dims | What was run |
|---|---|---|
| Cell cycle scores_Fig 2b | 316 × 35 | Two runs. First 315 × 6 (user-selected numeric); second rerun **with Barcode included**. |
| CFTRinh172 effect_Fig 2f | 5848 × 8 | Two runs. First a 190-row subset; second the full sheet, 5847 × 5. |
| Time courses_Fig 3h | 537 × 119 | 37 × 25 — **Block 1 only** of a multi-block wide sheet. |

**`.xls` import: PASSED.** The legacy binary loaded; string columns preserved and
testable when selected. *(Provenance caution, established at source: column
selection was the **user's manual selection**, not an import drop. Chat's initial
claim that the import "silently dropped 29 columns" was wrong and was retracted —
see the method note.)*

**Ground truth (Fig 2b):** **PubPeer commenter inference, not an author
admission** — no author reply seen. The claim: 33 rows of exact partial
duplication in the control group. Sequencing samples D571_572_573 and
D574_575_576_577 share identical `nCount_RNA`, `Barcode`, `barcode_seurat`,
cell-cycle scores and `Phase` — read as one batch copied onto another with
altered metadata (D577≡D571, D574≡D572, D575≡D573, D576 absent), implying a real
D574–577 set was overwritten by a copy of D571–573. **The commenter's strongest
point: identical barcodes across supposedly independent samples is essentially
impossible by chance** — barcodes are unique within a run.

**Source-confirmed by us in the UI:** Duplicated Data showed row 252
(D571_572_573) and row 285 (D574_575_576_577) with identical `nCount_RNA` = 7220,
`nFeature_RNA` = 3871, and identical `Barcode` = `AGGGCTCTCCGTGTGG-1`.

**Class A — CAUGHT, complete, across both channels.**

- **Numeric channel** (first run, no Barcode). Exact Duplicate Detection flagged:
  `blocks=1 largest=33×5`, block **33×5, rows 250–282 ↔ 283–315**, `cols=[0,1,3,4,5]`,
  `blockP < 0.0001`. The full 33-row block, correctly localised to the exact row
  ranges.
- **Corroborating channel.** Residual Spike Correlation ("Shared noisy rows") —
  `bestPair = D571_572_573 vs D574_575_576_577`, **ρ = 1.0000, n = 33,
  permP = 0.0010.** A perfect correlation across 33 rows between exactly the two
  named samples.
- **String channel** (rerun with Barcode). Duplicated Data reported **20 groups of
  duplicate rows**, with the `Barcode` column — real string values — flagged as
  part of the duplicate blocks. **String/identifier duplication is detected.**

This is the corpus's most complete catch: the documented defect found
independently by three tests, on two data types, localised to the row.

**B2 surface — Benford is the corpus's CLEAN axis-1 proof.**

Source-computed OOM spans (measured against the `.xls` with `xlrd`, 5th–95th
percentile of log₁₀|v|), all six pooled columns:

| Column | n | negatives | OOM span |
|---|---|---|---|
| nCount_RNA | 315 | 0 | **0.757** |
| nFeature_RNA | 315 | 0 | **0.468** |
| scds_score | 315 | 0 | **1.221** |
| percent_mito | 315 | 0 | **1.194** |
| S.Score | 315 | **137** | **1.332** |
| G2M.Score | 315 | **195** | **1.025** |

**Every column is individually below the 1.5 OOM gate.** Two are substantially
negative (137/315 and 195/315) — and Benford requires positive data.

Console, pooled: **Benford First Digit FLAGGED**, χ² = 117.190, MAD = 0.0230
(Nonconforming, Nigrini band), pMAD = 0.0000, n = 1890. Second Digit CLEAR.

**This is a cleaner §2.6 axis-1 instance than C25.** C25 had one genuinely wide
column (PL, 2.3M), so its flag carried real-signal ambiguity. **C11 has nothing
individually valid** — the ≥1.5 pooled span came *entirely* from pooling
different-scale columns. The flag is 100% pooling artifact, with no confound.
Second of three axis-1 instances (C25, C11, C21); confirms the methodology claim
that Benford should not run when columns measure different things.

**B2 — Fig 3h spectral/temporal cluster.** Exact Duplicate and Sequential
Duplication both CLEAR. **Benford correctly N/A** (OOM span 1.0 < 1.5 — the gate
working as designed on narrow data). Flagged: Autocorrelation (meanR1 = 0.8383,
298/300 sig), LOESS Residual (changepoint row 16), Regional Noise Homogeneity
(rows 1–15, ratio 183.64×), Runs Test, Selective Noise Partitioning
(ratio 586.963), Excess Kurtosis (κ = 7.992). **Mechanism: this is time-course
data.** High autocorrelation is what a smooth temporal signal *is*; the row-16
changepoint is plausibly stimulus onset; baseline-then-spike gives high kurtosis
by construction. All trace to **no ordered-time-series row-semantics mode** —
the third driver of that gap (with C25 spectral, CORPUS-01 grouped-order).

---

**HELD, NOT CLAIMED — two B1-candidates, neither adjudicated.**

**Fig 2f — Area recurrence.** Source-computed Area frequencies: **3.228 ×47,
3.551 ×32, 3.874 ×31, 4.197 ×30, 4.52 ×29** — a descending ladder of
high-frequency values. Console (full sheet, 5847 × 5): Exact Duplicate FLAGGED
(`dupRows=4653`), with `dupGroup` matching that ladder exactly; Value-Frequency
Spike FLAGGED (167 spikes: `.228` obs 70 vs exp 15.3, 4.58×) — **VFS is seeing
the fractional parts of the same recurring Area values. Two channels, one
signal.** *Undocumented — the commenter discussed only Fig 2b.* **NOT adjudicated
as a B1 find:** the open question is whether **ImageJ pixel-area output
legitimately quantises Area**, which would make this a measurement-pipeline
artifact rather than a defect. **That check was never done.** One methods read
settles it. Recorded as open, not banked.

**Fig 3h — near-duplicate decimal tails.** In the Block-1 corner: 925 numeric
values, **810 distinct** — almost nothing repeats as a full value (the most common
appears 3×). But exact 3-decimal tails recur across *different integer parts*:

- **`.263` ×6** — 3.263, 4.263, 10.263, 5.263, 11.263, 11.263
- **`.897` ×8** — 2.897, 4.897 ×3, 7.897, 18.897, 1.897, 5.897
- **`.885` ×6**, **`.192` ×7**, **`.788` ×5** — same pattern

Console VFS: 44 spikes, e.g. `.263` obs 6 vs exp 0.1, **ratio 60.00×**,
adjP = 2.84e-7.

**This is the same shape as C23's documented defect** — an identical exact tail
across different integer parts, the copy-paste-edit-the-leading-digit signature.
**B-investigate, NOT confirmed:** a methods check on whether time-course traces
could legitimately share 3-decimal tails was never done.

**Fig 3h — mixed precision.** Decimal-place distribution, full sheet:
`{1: 705, 2: 1664, 3: 18680, 4: 185, 5: 1204}` — **1204 five-decimal values among
18680 three-decimal.** Consistent with combined-source or computed-vs-recorded
data. Console corroborates: Decimal Precision Consistency FLAGGED (dom = 3dp,
81.8%). B-investigate.

---

**Code defects surfaced (4 + 1 attribution).**

1. **Within-row value-pair test counts trivial pairs** (Fig 2f). "1105 repeated
   value-pairs within 190 rows", driven substantially by the **42%-zero Median
   column** producing 0 == 0 pairs. Root: no zero / dominant-constant exclusion
   before pair counting. Shares a path with C25's "within a row" mislabel.
2. **Terminal Digit / Benford-2nd contaminated by zero-heavy columns** (Fig 2f).
   Terminal Digit FLAGGED with a zero spike (0: 3846 vs ~2700–3050 elsewhere);
   Benford Second Digit FLAGGED (0: 16.6%). Same root — zeros have no meaningful
   terminal digit and pollute the pooled distribution. *(Mechanism attributed from
   console + source zero-fractions; NOT isolated by a zeros-excluded rerun.)*
3. **Entropy card emits `col undefined` on `.xls`** — seen on all three sheets.
   Likely `.xls` column-name extraction.
4. **§2.4 chip shows "Flagged, location unclear"** for Recurring value sequences,
   which always has a span. Needs a spec decision before a Code fix.
5. **Chip-click does not scroll to the test card.**

---

**Verdict:** the corpus's most complete catch — a commenter-inferred defect found
by three independent tests across numeric *and* string channels, localised to the
row. The corpus's cleanest §2.6 axis-1 proof (no column individually valid; the
flag is pure pooling artifact). Two undocumented B1-candidates held pending one
methods read each. First legacy `.xls` — import passed.

---

**Method note (S237) — five source-read reversals, and one near-miss that matters
more than the case.**

Five Chat claims dissolved by reading the file:

1. *"The import silently drops 29 of 35 columns, including Barcode."* — Wrong. The
   6-column shape was the user's manual selection. Retracted.
2. *"The tool is blind to string-identifier duplication."* — Wrong. The
   Barcode rerun caught it (20 duplicate-row groups, barcodes flagged).
   **Retracted before it was banked as a V1X coverage gap** — it would have
   scoped work on a gap that does not exist.
3. *"Benford runs validly here — expression data is genuinely multi-magnitude."* —
   **The opposite of the truth.** Inferred from the domain without computing
   spans; every column is sub-1.5 OOM. This claim **would have removed C11 from
   the axis-1 evidence set** — deleting the corpus's cleanest proof.
4. *"The VFS fractional-part spikes on Fig 3h are pigeonhole artifact — suppress
   them."* — **Wrong, and the most consequential error in the corpus to date.**
   The `.263`/`.897`/`.885` tails are exact shared tails across different
   integers — real signal. **This was heading toward a Code fix that would have
   suppressed the only test that later caught C23's documented defect** — the same
   test the S312 deep-tail scan was built on. It was caught **only because the
   user pushed back ("are you sure?").**
5. *"`.51368` repeats multiple times."* — Wrong. Zero values with ≥4 decimals
   repeat ≥3×; `2.51368` appears twice — one value twice, not a suffix-copy
   pattern. Retracted. The real signal there is the mixed-precision distribution.

**The fourth is the road test's own justification.** The corpus did not just find
defects in papers — **it caught an error in the tool's development, one case
before it would have destroyed a detector we have since shipped.** Chat's
narrative was wrong; the data was right; a human question ("are you sure?") was
the gate. Read the file, then claim.

---

### C23 — FoxO-Usp / ecdysone body size (*eLife* 2014) — ADJUDICATED

**The corpus's most consequential case.** It is the only case that changed the
tool: it confirmed a coverage gap, was caught by accident, and that accident
became a shipped detector (S312). It must be read in three states — see the
build note at the end.

**File:** `C23.xlsx`, **single sheet**, 274 × 15 at source. Nothing left un-run
at the workbook level. Console ran 273 × 13, "Columns: Non-replicates".

**Structure (read at source *before* the run — this was load-bearing).**
Long-format, genotype-blocked, wide-per-gene. Three gene panels of five columns
each: **Phm** (cols 4–7), **Dib** (8–11), **E74B** (12–15).
**Genotype is forward-filled / sparse** — present only on the first row of each
block, `None` thereafter. **Eleven genotype blocks:**

| Genotype | Rows |
|---|---|
| Phm>+ | 2–22 |
| ND>FoxO WT | 23–43 |
| Phm>FoxO WT | 44–67 |
| Phm>FoxO NK | 68–88 |
| Phm>FoxO WT, Usp | 89–118 |
| ND>FoxOi V86, UspiT | 119–142 |
| Phm>FoxOi V86, UspiT | 143–166 |
| P0206>+ | 167–187 |
| **ND>FoxO WT (second occurrence)** | 188–208 |
| P0206>FoxO WT | 209–241 |
| P0206>FoxO NK | 242–274 |

*(The sparse forward-filled genotype key is the §2.5 driver from this case.)*

**Ground truth: PubPeer commenter, then an author reply.**

Commenter's claim: qPCR data copy-pasted between **ND>FoxO WT** and **ND>FoxOi
V86, UspiT** for three genes (Phm, Dib, E74B) — mostly perfectly identical
between the two groups, **except a few values that share the exact same decimal
portions with the integer part tweaked.** Plus a self-duplication at rows 119–124.

**Source-confirmed by us** — searched the sheet for fractional parts ≈ `.386` and
matched to genotype blocks:

- **r23 E74B = 2.385732** [ND>FoxO WT] **≡ r119 E74B = 2.385732** [ND>FoxOi V86, UspiT]
- **r32 E74B = 6.385732** [ND>FoxO WT] **≡ r131 E74B = 6.385732** [ND>FoxOi V86, UspiT]
- **r33 Phm = 13.386172** [ND>FoxO WT] **≡ r132 Phm = 13.386172** [ND>FoxOi V86, UspiT]

Identical values, in the named genes, across exactly the two named blocks. **The
commenter's claim is confirmed at source.**

**Author reply (PubPeer):** they suspect they **uploaded the wrong datafile to
Dryad**; it does not match the file the analysis was run from; the published
figure shows Phm/Dib/E74B profiles that are *not* the same across the two
genotypes. They apologise for the oversight.

**Two caveats that must survive into any use of this case:**
- The author reply admits a **deposit error**, not an effect on the analysis.
- Our figure check (published Figure 4: the grey ND> curves in A–C are visibly
  different in shape, peak timing and x-range from D–F) **corroborates the
  wrong-file explanation — but it is a chat-side read of a plotted image at
  screenshot resolution, not a numeric verification.** The qualitative call (the
  curves are plainly different) is safe; a value-by-value confirmation was never
  done.

**Deposit status: STILL UNCORRECTED.** The tool ran the Dryad file as it stands
and the duplication is present in it. No corrected file exists. *(Re-check if
updated.)*

---

**Detection — the Class C gap, confirmed on a documented case.**

- **Exact Duplicate Detection — MISSED IT.** Console: `dupRows=1`, and the only
  duplicate group reported was `2× rows=[167, 180] vals=17.42` — **in the P0206>+
  region, not the two documented blocks.** The documented between-genotype copy
  did not surface as an exact-duplicate block at all.
  **Mechanism (reasoned in session, partly inferential):** the copy is a *near*
  duplicate — same decimals, integer tweaked — and the normalised columns
  (`Phm/RpL3*x`, `Ave`, `SE`) **differ between blocks because normalisation
  divides by each block's own RpL3.** So the rows are not byte-identical even
  where the underlying values were copied. Exact-match detection cannot reach
  this class **by construction.**

- **Value-Frequency Spike — CAUGHT IT.** Console: `nSpikes=1`,
  `val=.386 obs=19 exp=3.1 ratio=6.13× adjP=9.48e-7`. Source-matching those 19
  values to rows and genotypes produced the identities listed above.
  **VFS is the test that surfaced the documented defect, via the shared 6-decimal
  tail.** *(Precision: the tail is `.385732` for the two E74B values and
  `.386172` for the Phm value; VFS reports the spike at the 3-decimal rounding
  `.386`, which covers both.)*

- **Sequential Duplication — FLAGGED, but WHAT it flagged was never established.**
  Its card was not opened and its output was never matched to the documented rows.
  **Do not attribute the catch to it.** *(Open thread — see below.)*

**Class B.** Real duplication in the deposited artifact (source-confirmed);
authors claim wrong-file upload; the figure corroborates; **the deposit remains
uncorrected.** So: **benign for the paper's conclusions** (if the authors and the
figure are right), **not benign for the public record** — anyone downloading the
Dryad file today gets the duplicated data. **The tool's flag is live-valid on the
deposit as it stands.**

---

**B2 surface — flagged, and NOT systematically adjudicated.**

This is an honest gap. Unlike C25 and C11, C23's false-positive surface was never
worked through; the session's attention went to the detection finding and the
Class B call. Recorded as flagged-and-unexplained, not as characterised:

- **Benford First and Second Digit: CLEAR.** χ² = 34.980, MAD = 0.0117
  (Acceptable) and χ² = 24.502, MAD = 0.0075 (Marginal), n = 2457.
  **C23 is NOT an axis-1 instance — the pattern did not fire here.** Worth
  recording: it shows the axis-1 flag is not firing indiscriminately across the
  corpus.
- **Terminal Digit Uniformity: FLAGGED.** χ² = 27.919, df 8, p = 0.0005, n = 2457,
  `trailingZeroSuppression=true`; digits 0:0 1:263 2:238 3:311 4:309 5:249 6:281
  7:263 8:309 9:234. **Mechanism NOT established. Not adjudicated.**
- **Decimal Precision Consistency: FLAGGED.** dom = 3dp, 96.3%, gaps = 4.
  **Mechanism not established** beyond noting it is the mixed-precision signal
  seen elsewhere.
- **Missing Data Pattern: FLAGGED.** missing = 1092 (30.8%). **Probable-structural,
  NOT established** — the `Ave`/`SE` columns are populated only on the first row
  of each time group (visible in the source rows read). Not confirmed by
  isolation.
- **12 cross-replicate tests: N/A** — "not applicable when columns are
  non-replicates." **Correct behaviour**: Phm/Dib/E74B are different quantities,
  not replicates.

**Held, not claimed — three open threads:**
- **The second ND>FoxO WT block** (rows 188–208). Noted, never investigated.
  Legitimate re-measurement, or part of the duplication story? Not established.
- **The rows 119–124 self-duplication** the commenter cites. Predicted that §2.4
  Sequential Duplication should catch it; **never checked whether it did.**
  Sequential Duplication *is* flagged — its contents were never read. **One card
  read settles this.**
- **The other ~16 values in the `.386` spike.** Three pairs were genotype-matched;
  **the remaining sixteen occurrences were not.** Whether they are also part of the
  copy is not established.

**Code defects surfaced: NONE.** C23 is the case that **validated** VFS's
shared-tail behaviour rather than exposing a defect in it. *(The VFS
expected-baseline defect was established later, on C21, with C23 as the
counter-case any fix must preserve.)*

---

**Method note — the reversal that this case resolved.**

Chat had been treating VFS's shared-fractional-part flags as a false-positive
artifact — on C11-Fig3h — and was **on the verge of banking a Code prompt to
suppress them.** C23 proved the opposite: **the shared 6-decimal tail is the only
signal that caught a documented near-duplicate.** Had the suppression shipped, the
fix would have removed the only test that catches this class of defect.

The generalisation the two cases produced together (with C21 later supplying the
counter-case): **decimal depth is the discriminator.** A shared tail at the data's
*dominant* precision (C21's 2dp `.54` across 20 distinct integers) is expected
pigeonhole collision. A shared tail at *high* precision (C23's 6dp `.385732`)
cannot be coincidence and is a copy fingerprint.

---

**BUILD NOTE — read this case in three states (S312).**

C23 is the only corpus case that changed the tool. Its status is different
depending on when you read it:

1. **At prediction (§0.2, pre-run).** Group 2 near-duplicate — *"Class C coverage
   gap, NO current test fires."* **Correct when written.**
2. **At adjudication (S305).** The gap **confirmed on a documented case**: Exact
   Duplicate missed it exactly as predicted. It was caught **by accident** — VFS's
   shared-tail spike was never designed as a near-duplicate channel; it surfaced
   one. **The accident named the channel.**
3. **After S312.** The **distinct-key deep-tail scan** was built deliberately on
   what the accident revealed. A fractional tail shared across distinct integer
   parts now reaches the scorer at any span. **C23 flags by design. The Class C
   near-duplicate gap is narrowed.**

**This is the corpus's first end-to-end result, and the strongest argument for the
road test's existence:** a documented defect the tool missed → caught by accident
→ the accident understood → a detector built → the defect now caught by design.

**Updated S313 — the arc has a fifth act.** C08 ran, and the detector **missed it.**
C08's near-duplicate has its digit changed in the *integer* part, exactly the shape
this channel was built for — but the value had been retyped, so the float tail was
rebuilt and the key no longer matched. **The channel requires the tail to survive
byte-identically; C23 satisfied that only by luck of how its copies were made.** See
§0.2 Group 2 and the C08 entry. The arc now reads: missed → caught by accident →
detector built → caught by design → **defeated by the next case, in a way that named
its reach.** That is a better result than a clean second catch, and a better §5.

**C12 is the detector's only remaining independent validation.**

---

### C21 — Inner Mongolia grassland (*Sci Adv* 2022) — ADJUDICATED

**File:** `C21.xlsx`, before/after author-correction pair (deposit + corrected
update). The corpus's **first clean before/after specificity demonstration** —
the reason the update files were collected (§0.1).

**Ground truth (documented, source-confirmed):** P275-2017 ANPP was copied from
P200-2017. Four values — 190.98, 169.32, 158.38, 254.7 — identical across
treatments that should differ. Authors corrected the deposit; they assert the
analysis is unaffected.

**Class A — CAUGHT, and the correction is confirmed.** The tool flags the
duplication HIGH on the deposit that contains it, and shows it **reduced** on the
corrected file (P275 now distinct). The flag tracks the actual data state in both
directions. This is the specificity half of the road test: not just "does it fire
on bad data" but "does it stop firing when the data is fixed." Delivered cleanly
for the first time here.

**Provenance note — the filenames were reversed.** The files as first labelled
told the story backwards, and Chat built a "worse after fixing" narrative on
filename-trust. Source-diff (which file has P275 ≡ P200) plus a user file-check
settled it. **In a before/after corpus, provenance rests on content, not
filenames** — diff against the documented defect. Same shape as C25's method note:
an unverified assumption, dissolved by reading the thing itself. The tool was
right throughout; the narrative about which file was which was the error.

**B2 surface (every flag has a named mechanism — all three are applicability
false positives, not computational errors):**

- **Benford 1st/2nd digit** — FLAGGED. The χ² is correct; the *pool* is wrong.
  ANPP (OOM 0.75) and perennials (OOM 0.67) each sit **below** the 1.5 OOM
  applicability gate; annuals (OOM 4.05) lends the pooled column its span. This is
  the **third §2.6 axis-1 span-borrowing instance** (after C25's heterogeneous
  pooling and C11's clean proof). The driver here is *bounded ecological
  measurement* — narrow-range biomass columns pooled with one wide one. **Predicts
  recurrence across the entire ecology cluster** (C07, C09, C15, C16, C20, C22).
  Fix is a per-column applicability predicate, NOT a raised OOM threshold.
- **Value-Frequency Spike** — FLAGGED on `.54 ×20`, called a 6.7× spike. The count
  is right; **the expected-frequency baseline is wrong** — it ignores the data's
  decimal precision. Two-decimal data has only 100 fractional slots, so ~4.8
  occurrences are expected, not 2.8. A precision-collision false positive.
  **This is the contrast case to C23's `.385732`**, and together they are the
  calibration pair: shared tail at the data's *dominant* precision = expected
  collision, suppress; shared tail at *full* precision across distinct integers =
  real near-duplicate, keep. **Decimal depth is the discriminator.** (Both halves
  now ship — the S312 deep-tail scan keeps the C23 shape; the C21 shape is
  suppressed by the S308 keep-gate.)
- **Measurement-type misclassification** — "Western Blot Densitometry" inferred on
  grassland ANPP, which forced a log VST. **Second instance** (after C25's
  proteomics). Firms the §2.5 confidence-gate sub-item to two real cases.

**Held, not claimed — five cross-year ANPP pairs.** The *corrected* file shows five
2017↔2018 ANPP pairs matching across years. Either a second, undocumented
full-row copy, or coincidence on the ANPP total alone. **One source read settles
it:** if annuals + perennials + density all match, it is a real copy; if only the
ANPP total matches, it is coincidence. Not adjudicated. Recorded as open, not
banked as a find.

**Also open — Terminal Digit panel.** Provisionally two-decimal structure plus a
duplication double-count. Not separately adjudicated.

**Verdict:** a documented catch (§2.4), the corpus's first clean before/after
specificity demonstration, and a fully-named B2 surface — three applicability
false positives, each with the same shape: *the arithmetic is right, the
null/gate/expectation is mis-specified.* Together with C25 and C11 this is the
evidential core of the §5 claim: **the false-positive surface is applicability,
not computation. "The expected, the gate, or the baseline is wrong — not the
stat."**

**Second B-boundary anchor.** C21 is a deposit error that **was corrected**, and
the tool confirms the fix worked. C23 is a deposit error that **remains
uncorrected**, and the tool's flag stays live. Together they span the
corrected/uncorrected spectrum — the impact range the paper's real-world section
needs.

---

### C08 — Parthenium beetle enzymes (*Physiol Entomol* 2024) — ADJUDICATED

**DOI:** 10.1111/phen.12475 · science-detective · Run S313 **File:** `C08.xlsx`, sheet `DATA` (350 rows × Duration / Setup / Stage / SOD / CAT / LPO). A second sheet, `Analysis data`, is the same rows without `Duration`. Run the `DATA` sheet — `Analysis data` loses the duration factor and changes the grouping.

**Ground truth (PubPeer, commenter inference — no author admission).** The three dependent variables SOD, CAT and LPO contain duplications that are impossible if, as the paper states, each row is a separate individual larva. The named case: in the ten rows for second-instar larvae cold-exposed three hours (spreadsheet rows 52–61), row 61 shares its SOD value with row 55, its CAT value with rows 52, 54, 56, 57 and 59 *but with one digit changed*, and its LPO value with row 56. The commenter put the non-unique fraction at about one in seven.

**The real rate is higher.** Read at source: 268 of the 1,050 values — **25.5%** — are exact duplicates of another value in their own column (SOD 21.7%, CAT 24.9%, LPO 30.0%). The commenter's estimate understates it.

------

#### Class A — caught, by Sequential Duplication

**Sequential Duplication ("Recurring value sequences") flags High, p < 0.0001, eight recurring runs.** Each is a run of values in one column reappearing further down the same column at a small offset.

| Column  | Original rows | Copy rows | Offset | Length |
| ------- | ------------- | --------- | ------ | ------ |
| SOD     | 22–26         | 27–31     | 5      | 5      |
| SOD     | 46–48         | 49–51     | 3      | 3      |
| LPO     | 5–7           | 9–11      | 4      | 3      |
| **LPO** | **53–56**     | **58–61** | **5**  | **4**  |
| LPO     | 62–64         | 68–70     | 6      | 3      |
| LPO     | 102–108       | 105–111   | 3      | 7      |
| LPO     | 155–157       | 159–161   | 4      | 3      |
| LPO     | 203–206       | 208–211   | 5      | 4      |

The fourth run is the documented block. All four values verified identical at source. Offsets are short (3–6), always downward, always inside one treatment group — the fingerprint of a drag-fill or short copy-paste within a block, repeated across the sheet. Six runs in LPO, two in SOD, **none in CAT**.

**The tool found more than the commenter did.** PubPeer describes one cell (row 61's LPO matching row 56). The tool describes the copy operation that produced it: a four-value run copied from rows 53–56 to rows 58–61.

------

#### Class C — the CAT near-duplicate was missed. Tail fragility.

This is the case the session was built to test, and the answer is a miss with a named cause.

Row 61's CAT is **`130.492634615763`**. Rows 52/54/56/57/59 all hold **`140.49263461576285`**. The changed digit is in the **integer part** (140 → 130) — precisely the shape S312's deep-tail channel was built for, where the integer moves and the fractional tail survives.

**It still missed, because the tail did not survive byte-identically.** The tweaked value was retyped and lost float precision at the end: `...5763` where the source has `...576285`. The two share an eleven-digit run (`.492634615762`) but their exact tail strings differ, and the deep-tail scan keys on exact substring identity. Row 61 is not in the group.

Value-Frequency Spike does flag `.49263461576285` at rows 52, 54, 56, 57, 59 — observed 5, adj. p < 0.0001. **That is five exact duplicates of each other, surfacing in a near-duplicate channel. It is not the near-duplicate catch it appears to be.** Read at source before claiming; the console reading was the opposite of the truth.

**Named limitation, for §5: the deep-tail channel requires the fractional tail to survive byte-identically. Any operation that reconstructs the number — retyping, rounding, a text-field round trip, a different float path — changes the tail and the key no longer matches.** C23 survived only because its copies preserved full precision. The failure mode is not *where* the digit was changed, as predicted, but *whether the number was rebuilt*.

------

#### Class C — Exact Duplicate false negative. Circular null.

Exact Duplicate reports `dupRows=0`, CLEAR, on a file with 25.5% within-column exact duplicates.

Code confirmed at source: **the observed count is correct.** `collisionObs = 268` — it matches the ground truth exactly. The test sees every duplicate. But the null is `p1 = empirical HHI`, estimated from the same contaminated distribution, giving an expected count near 793. Observed 268 sits *below* its own inflated expectation, so `p = 1.0`.

**The statistic is right; the expected baseline absorbs the signal.** This is the disclosed empirical-HHI limitation firing as documented — but C08 is the first corpus case where it produces a **false negative on a Class A file**. That is a sharper exhibit than the disclosure paragraph, and it belongs in §5: the applicability problem produces false *negatives*, not only false positives.

The other three sub-tests miss by construction, not by baseline error: row-dup needs whole identical rows (the copies are scattered down columns), within-row needs a value repeated across columns in one row (wrong axis), block-copy needs contiguous rectangles (the duplication is a scatter).

**C08's shape, read at source (S316) — and it is NOT C12's.** The two files were assumed to share one defect. They do not, and one read settled it. C08 loads as **350 rows × 3 data columns** (SOD, CAT, LPO). Of its 60,904 row pairs, **not one** is identical across all three columns; only ten agree on even two of three, and those are coincidental. **The copy operation is a value dragged down a single column within a treatment block** — the columns move independently, which is exactly why no two rows line up.

**So C08 and C12 are two different failure modes, and neither fix covers the other:**

| | C08 | C12 |
|---|---|---|
| **Are the duplicates found?** | **Yes** — `collisionObs = 268`, exactly right | **No** — count is zero at every sub-test |
| **What fails** | The null. Empirical HHI from the contaminated column inflates the expectation to ~793, so 268 sits *below* its own baseline | The search. The copy's shape (scattered, single-row, partial-width) is enumerated by no sub-test |
| **Failure mode** | **Circular null** | **Coverage** |
| **The fix** | A non-circular collision null | §2.9 scattered partial-row detector (built S316) |

**§2.9 correctly returns zero on C08** — it has no partial-row copies to find. And a fixed collision null would not have helped C12, whose counts are genuinely zero. **Chat's assumption that these were one defect was unsupported and wrong.** The C08 null fix remains open and is its own session — it touches Test 1's collision null, which every file passes through.

`nBins = 1.73×10¹⁹` in the console line is a legacy display field. It feeds no p-value. It invites misreading and should be dropped from the line.

------

#### Engine defect found and fixed this session

**S312 shipped an infinite loop.** `distinctKeyNearDupScan` in `src/tests/valueFrequencySpike.js` walked the neighbourhood by value: `for (let nb = v - halfW; nb <= v + halfW; nb++)`. Fractional-tail keys come from `parseInt` on a 16–17 digit substring, landing at or above 2⁵³, where doubles are spaced two or more apart and `nb++` does not advance. The loop never terminates. It threw `RangeError: Invalid array length` on C08; where the array grows more slowly it hangs the tab instead.

Live on main since S312 (`1c38b99`). Reaches any full-precision float column with tails that long — most deposited data. **Found by the corpus, one case after the build.** Fixed at `56118ca` by iterating the neighbourhood by offset rather than by value, keeping every key in scope.

This is the second time the corpus has caught an error in the tool's own development (the first being C23, which proved the VFS flags Chat was about to suppress were the only signal catching a documented near-duplicate).

------

#### Banked, one line each (known-defect-skip rule)

- **Benford axis-1, fourth instance.** First digit 63.5% ones, χ²=762, MAD=0.0906. CAT spans 81–173 — a single order of magnitude. Heterogeneous column pooling. Predicted, confirmed, no eyeball.
- **Row-semantics B2 family.** Autocorrelation, Runs, LOESS, Regional Noise Homogeneity, Row-Mean Runs all NOTED on grouped-order rows. Banked family.
- **Display defect.** Nine of eleven Value-Frequency Spike rows show `expected 0.0` and `ratio 0.00×` — a division by zero that reads as *below* expectation when it means *far above*. Same family as the `0.0×` deep-spike item already on the roster.

#### Held, not claimed

- Whether the eight Sequential Duplication runs are the complete set or a threshold-limited subset. Not established.
- Whether a quantized-instrument false-positive source exists here. All three columns are full-float (median 14–17 decimal places), so the predicted benign deep column does not appear — but its absence was observed, not tested for. The S312 false-positive surface remains **predicted, not demonstrated**.

#### Source-read reversals this case

Three, all caught by reading the file:

1. Chat read `nBins = 1.7×10¹⁹` from the console and inferred the Exact Duplicate expectation was built from it. It is not. `nBins` feeds nothing.
2. Chat read the Value-Frequency Spike ERROR line and treated the miss as unknowable. It was a crash, not a reach failure — and after the fix, still a miss, for a different reason than predicted.
3. **Chat was one screenshot away from writing up the five-row `.49263461576285` group as the detector's independent validation.** It is five exact duplicates, and row 61 is not among them. The source read reversed the session's headline claim.

#### S317 — C08 also row-groups into 35 conditions

Duration, Setup, Stage; 350 rows into **35 groups of 10**. It sits in the exploding set (§0.3), though less severely than C12 or C16 — three condition columns, all plausibly genuine factors, and the groups are a workable size.

**Check whether this interacts with the circular collision null before scoping that session.** The two defects are independent as far as anyone has established, but **nobody has looked, and "independent" is an assumption, not a finding** — that assumption was made once before about C08 and C12, and it was wrong.

### C12 — plant invasions / enemy release (*J Ecology* 2025) — ADJUDICATED · **RETRACTED**

**DOI:** 10.1111/1365-2745.70059 · science-detective · Run S314
**File:** `C12.xlsx`, **2nd sheet `Field survey-data`** (2,412 rows × 47 columns). Sheet 1 (`Field survey-Herbiory`, 805 rows) is a different table — not the flagged one.

**Status: retracted by *J Ecology* / British Ecological Society, May 2026**, by agreement with the authors, on the root morphology data. Published online 29 April 2025; retracted thirteen months later. **This is the corpus's second retraction** (with CORPUS-02) and its **third author acknowledgement** (with C21 and C25).

---

#### Ground truth — and it strengthened while the case was open

**PubPeer (initial).** Root measurement values copy-pasted from other rows, sometimes across different plant species. Many rows where root values are "almost identical with only one or two digits changed in some cells, while other values within the same rows remain exact duplicates." The commenter compiled 69 such rows.

**Authors (August 2025).** Errors confirmed. Attributed to "the data assembly process." Dataset reanalysed with duplicates excluded; conclusions stated unchanged; corrigendum sought.

**The commenter's follow-up is the move that ended it.** *"Could you please share the original text files exported by WinRHIZO?"* — a request for the artefact **upstream of the assembly**. That is the right question to ask of a suspected merge error, and the answer is what killed the paper.

**Retraction notice (May 2026), the load-bearing sentences.** The authors acknowledged "that unintentional errors must have occurred during the assembly of individual WinRHIZO outputs into the consolidated dataset." They stated the original WinRHIZO output "is no longer available due to hard drive failure and that, as a result, they are unable to retrospectively assign the correct values to individual plants." The journal retracted because "the absence of the original data prevents correction of the errors" and the necessary corrections were "too extensive." The authors agreed, while maintaining the issues are unlikely to have affected the conclusions.

> **The paper was not retracted because the errors were large. It was retracted because the ground truth was gone and the data could not be verified.**

---

#### The retraction confirms the source read

WinRHIZO is root-scanning software. It emits **one text file per plant**. Someone merged those files into the consolidated sheet, and the merge went wrong.

That is exactly the shape found at source, before the notice was read: **whole root vectors, byte-identical in the stored double, transplanted across plant species.** Not typed. Not tweaked. Copied wholesale, at full float precision, because a file-assembly step put the wrong plant's numbers on the wrong row.

**The retraction notice says nothing about altered digits — because there were none.** The PubPeer commenter's "one or two digits changed" is column X, *Root tissue density*, a derived quotient tracking its numerator (see below). The source read reached that conclusion independently; the retraction notice corroborates it.

This case was run to answer one question, carried from C08: **were the tweaked cells edited in place, or retyped?** The answer is neither. **They were never tweaked.** The premise was false, and both the tool and the ground truth had to be read against the file to see it.

---

#### The premise was wrong. There are no tweaks.

Read at source, from the raw stored doubles in the sheet XML — not the rendered values.

**The copies are exact, at full float precision.** Rows 5 and 848 share root length `997.39629999999988`, surface area `170.57589999999999`, average diameter `0.53325`, volume `2.4550000000000001`, fine root length, coarse root length, and both surface-area splits — **eight of nine root columns, byte-identical in the double**. The same holds for rows 722↔1182 (`1459.1311999999998`), 173↔220, 65↔491, and 30 further pairs. Different species, different sites, identical roots.

**The ninth column is not a tweak. It is arithmetic.** Column X, *Root tissue density*, is **derived**: X = S / W (belowground mass ÷ root volume). Verified at source: **exact in all 2,412 rows, zero mismatches.** When a row is copied and the biomass column S differs, X differs — because it is a quotient of S. Column V (*Root average diameter*) behaves the same way in the seven-of-nine pairs.

> **What the commenter saw as "one or two digits changed" is a derived column tracking its numerator.** The measurements were not edited. The copy is clean.

The defect is real and it is worse than described — whole root vectors, transplanted across species, at full precision. But it is a **§2.4 exact-duplication** defect, not a near-duplication one. **C12 is not a deep-tail validation case, and the corpus now has none.**

---

#### Class C at S314 → Class A at S316. The full arc, in order.

This section records a reclassification, and the order matters — each step was a real result, and two of them overturned the step before.

**S314 — Class C. Duplicated Data flags High (p < 0.0001) on the wrong thing.**

The tool ran on **36 numeric columns**. Eleven of the 47 are text and were dropped, leaving latitude, longitude, soil pH, the root measurements, and **the 19 WorldClim bioclimatic variables**.

The blocks it reported were those. `Rows 1422–1427 = Rows 1475–1480`, columns `[0, 1, 17, 18, 19, …]` — column 0 is **Latitude**, column 1 is **Longitude**. The card's evidence table showed Latitude, Longitude, Annual Mean Temperature.

**`dupRows = 0`.** Not one full row duplicated. The real copies — rows 5↔848, 722↔1182 and the rest — appeared nowhere. **Sequential Duplication: CLEAR.**

> **A verdict that is right by accident is not a detection.** The severity was correct. The evidence was not. A tool that gets the answer right while pointing at the wrong data has not helped anyone.

**And the defect it missed was retraction-grade.** *J Ecology* withdrew the paper over these root measurements. Run in April 2025, Check My Data would have raised a High and directed the reader to a merged temperature table.

---

**S315 — §2.8 removes the false positive, and the copies stay invisible.**

The group-attribute exclusion (`531e180`) holds out the 21 site-attribute columns cleanly. Exact Duplicate drops HIGH → **LOW, p = 1**. Constant-Offset Blocks collapses from 56,978 blocks to LOW.

**And both duplication tests read p = 1 on the fifteen genuine measurement columns.**

> **The displacement hypothesis is dead.** This entry, and V1X §2.8, argued that the false positive *displaced* the true positive. It did not. **They are independent failures that happened to co-occur.** Fixing applicability does not fix detection.

That was the sharper claim, and it opened the real question: **why does a duplication detector return p = 1 on thirty exact byte-identical row-pairs, with the right columns and nothing in the way?**

---

**S316 — the answer, and the catch. Class A.**

**The copies were never *found*.** The count is zero at every sub-test, so every p-value is 1 by construction and no null is ever reached. The copy's shape is not enumerated:

| Property of the copy | Rules out |
|---|---|
| Scattered (426, 460, 843 rows apart) | Block paths — offset cap is 200 |
| Single row | Block paths — height floor is ≥2 consecutive rows |
| Partial width (root columns only) | Row-key and hash paths — both need full-row identity |

Test 2 catches scattered **full-width** single rows. Test 4 catches contiguous **partial-width** blocks. **A scattered, single, partial-width copy sits in the one cell neither covers — and that is exactly the shape the WinRHIZO merge error made.** The scan block came across; the plant's own biomass stayed behind; the derived tissue density therefore differs, so the row is not identical across all fifteen columns. **The detector was blind because the defect was real.** A fabricator copying a whole row would have been caught.

**§2.9 (V1X), promoted at `e751523`, catches it.**

- **Exact Duplicate: CLEAR → FLAGGED.** 34 copied pairs; sub-test raw p = **1.03e-22**; combined p = 5.14e-22. The other four sub-tests read ~1 — **the new detector drives the verdict alone.**
- **All four documented copies recovered by row distance:** 5↔848 (843), 65↔491 (426), 173↔220 (47), 722↔1182 (460). Plus a nine-column pair at 90↔1010.
- **The copied column set is the same eight every time: T, U, V, W, Y, Z, AA, AB.** **X is missing from the middle of the run** — X is *Root tissue density*, the derived quotient, which did not come across because its numerator stayed behind. **The evidence names the mechanism.**
- **Hand-verified at source.** Rows 5 and 848 of `Field survey-data` are byte-identical on T (997.3962999999999), U (170.5759), V (0.53325), W (2.455), Y (922.6777999999999), Z (74.3288), AA (134.3313), AB (35.416399999999996), and differ on X. The card's coordinates land on the right cells.

**The arc, stated once:** *documented defect missed → the false positive named → the false positive removed → the true positive still invisible → the displacement thesis retired → the coverage hole found → the copies caught, by design, with the mechanism visible in the evidence.*

**Class A.** The documented defect is now caught, and the evidence points at it.

---

#### The intent boundary, with a real exhibit

§1 states that the tool detects *patterns inconsistent with honest data generation*, not *intent*. C12 is the case that makes that distinction concrete, and it cuts in an unexpected direction.

**Every documented fabrication in this corpus is a copy** (S313's line, still true at six cases). C12 sharpens it: **not every copy is fabrication.** This one is a merge error — unintentional, admitted, non-malicious, and it destroyed a paper anyway.

The mechanism the tool detects is *identical* whether a fabricator pasted a block to invent data or a researcher's assembly script put the wrong plant's scan on the wrong row. The statistical signature is the same. The consequence is the same too: **data that cannot be verified is unusable, whatever produced it.** The authors still believe their conclusions hold. The journal retracted regardless, because with the WinRHIZO originals gone, nobody can check.

That is the honest scope of the tool, and C12 states it better than the §1 paragraph does: it flags data that cannot be trusted, and it makes no claim about why.

---

#### The false-positive surface, demonstrated — join artefacts on a long-format table

This is the finding, and it is the one the arc has been waiting for.

**Twenty-one of the 36 analysed columns are site attributes, not measurements.** Latitude, longitude, and the 19 bioclimatic variables describe the *site*. Every row from the same site carries the same numbers. With ~50 sites and 2,412 rows, each of those 21 values repeats about fifty times **because the table is long and the climate data were merged onto it**.

*(Counts corrected at S315 against the sheet. Earlier drafts said 24 columns and 22 WorldClim variables; both came from a session summary rather than the file. WorldClim defines 19 bioclimatic variables. §2.8, built at S315 (`531e180`), holds out exactly these 21 — each constant within every level of Region (17 levels) and Site (51 levels) — leaving 15 genuine per-plant measurements. No measurement was wrongly excluded and no climate column was left in.)*

**§2.8 removed the false positive and did not recover the true positive (S315).** With §2.8 on, Exact Duplicate Detection dropped from HIGH to **LOW, p = 1**, and Constant-Offset Blocks collapsed from 56,978 blocks to LOW. But both duplication tests then read **p = 1 on the 15 real measurement columns** — the copied root row-pairs stayed invisible. **The false positive did not displace the true positive.** They are independent failures that happened to co-occur. Fixing applicability does not fix detection. **That opened the coverage question, and §2.9 closed it at S316 — the copies now fire, 34 pairs, p = 1.03e-22. See the Class A section above.** The two remain separate defects, and that separation is the §5 claim.

The engine has no concept of a column that is an attribute of a grouping key rather than a measurement of the row. It reads the join as duplication. What follows:

| Test | Fired | Cause |
|---|---|---|
| Duplicated Data | High, 20 blocks | Site attributes repeating across rows of the same site |
| Constant-Offset Blocks | 56,978 blocks, z = 5,886 | The `-91.93`, `-89.09`, `-88.79` offsets are **longitude differences between Chinese cities** |
| Over-used numbers (VFS) | 217 spikes | Climate fractional tails: `.054` ×167, `.1675` ×163 — one per row per site |
| Inter-Replicate Correlation | 10,078 suspicious | Correlating temperature against precipitation against latitude |
| Column-to-column noise | ratio 215.7 | Variance compared across cm, mm, °C and mm-of-rain |
| Second-digit, last-digit, decimal precision | High | Digit pools ~60% composed of repeated climate constants |

**Every one of these is the same defect, seen six ways.** Not six calibration problems — one, with a name:

> **The engine treats every numeric column as a measurement of its row. A column that is an attribute of a grouping key — site climate, subject demographics, batch metadata — repeats by design, and the whole battery reads that repetition as signal.**

This is the same family as the Benford order-of-magnitude gate and the VFS precision-blind baseline: **the statistic is correct; the baseline assumes something about the column that is false.** It is an *applicability* false positive, and it is the largest one the corpus has produced.

It is also the most general. Long-format tables with joined site, subject, or batch attributes are the standard shape of ecological, epidemiological and repeated-measures data. **Any dataset of that shape will light up the same way.** → V1X §2.8 (built S315).

**But this is only one of three failure modes, and C12 demonstrates two of them.** The applicability artefact above is the first. The second is **coverage** — the copied roots, which no sub-test could see (§0.3 Class A section, V1X §2.9). They are independent: fixing the first did not fix the second. The third, **the circular null**, is C08's (below). Three modes, three exhibits, two of them on this file. → V1X §2.8 three-mode table.

---

#### Third measurement-type misclassification

The engine classified this file as **Western Blot Densitometry** — plant root morphology, soil chemistry and climate, read as protein gels. It offered a log transform on a sheet whose first columns are latitude and longitude.

Third instance (C25 proteomics on photonics; C21 densitometry on grassland ANPP; C12 densitometry on plant roots). The confidence gate in V1X §2.5 now has three exhibits, and two of the three are densitometry-on-ecology. Log transform declined at run.

---

#### Banked, one line each (known-defect-skip rule)

- **Benford axis-1, fifth instance.** First digit CLEAR at MAD 0.0123 but flagged Marginal; second digit Nonconforming. Computed across a pool that is majority repeated climate constants — the pooling problem, not a digit problem.
- **`Windowed Autocorrelation` returns a verdict from an undefined computation (S316, sharpened).** On the 15-column arm it does not crash — it reports **CLEAR** with `meanR1=undefined pooledT=undefined pooledP=undefined`, `0/105 sig`, and six evidence rows of `r1=undefined`. Earlier read as a crash (S314) and as a stack overflow on the 36-column arm (S315). Both were true of *different arms*. **The 15-column behaviour is worse than either: a clean verdict with no computation behind it.**
- **`Entropy / Zipf` returns a verdict from an undefined computation (S316, sharpened).** Reports `tested=15 flagged=2 (2 low, 0 high)` — and then five evidence rows of `col undefined: undefined H=undefined exp=undefined ratio=undefined`. **It flagged two columns it cannot name, with no entropy value.** Distinct from the low-priority Entropy label-specificity item already in BANKED (`flaggedCols` field access): that is a *label* not resolving. This is the *statistic* not existing.

> **These two are a defect class the corpus has not named before: a test that returns a verdict without a value.** Not applicability (nothing is misapplied), not coverage (nothing is missed), not a circular null (no null runs). The computation produces `undefined`, and the verdict machinery renders it as a confident CLEAR or a flag count. **A test that cannot compute must say so — N/A or ERROR — never CLEAR.** Reproduced on `.xlsx` (C12) and `.xls` (C11), so not a format bug. → next Windowed-Autocorrelation / Entropy dispatch, read-only first.
- **Cross-Condition Consistency is slow enough to read as a hang.** ~90 seconds stalled at 13/29 on 2,412 rows with no progress movement. Not a defect; a usability failure. A user will close the tab. Worth a `PERF=1` read.
- **The battery reports 29 tests; the batch gate is 28 fixtures.** Two different counts, both live. Reconcile at source — the "25" carried until S313 was stale for an arc, and this is the same shape of error waiting to happen.
- **Methodological move worth stealing (from the PubPeer thread, not the tool).** The commenter's second question — *"Could you please share the original text files exported by WinRHIZO?"* — asked for the artefact **upstream of the assembly**. On a suspected merge error, that request is more decisive than any statistic: it either produces the ground truth or establishes that the ground truth is gone. Here it did the latter, and the paper was retracted. Worth a line in the paper's discussion: forensic statistics identifies *where* to ask; the strongest follow-up is often to ask for the pre-consolidation data.

#### Held, not claimed

- ~~Whether the ~34 exact root-block pairs found at source are the complete set.~~ **RESOLVED S316.** The §2.9 detector finds **34 pairs** at k = 4 — the same number the source scan reached independently. Not a proof of completeness (both could share a blind spot), but two methods agreeing on 34 is the strongest evidence available short of an exhaustive census.
- **Sequential Duplication's CLEAR is structural, and now confirmed (S316).** The copies are scattered, not sequential; Sequential Duplication requires a run of three or more consecutive same-column values recurring at a fixed offset, with the same 200-row cap. **It cannot see this shape and never could.** The honest answer, as suspected.
- Whether column V (*Root average diameter*) is derived like X. **Sharpened, not resolved:** V is *in* the copied set (T, U, V, W, Y, Z, AA, AB) in every eight-column pair, so it travels *with* the root block rather than tracking biomass the way X does. That is evidence it is a scanned output, not a derived one — but the formula was still not confirmed at source.
- **NEW — the nine-column pair at rows 90↔1010.** Agrees on nine columns including L and M, which the eight-column pairs do not share. A different copy event, or a coincidence on top of one. Not adjudicated. One source-read.

#### Source-read reversals this case

**One, and it voided the session's premise.** Chat went in to answer C08's question — edited in place, or retyped? — and would have read the run's Duplicated Data flag as the split-detection result it was primed to expect. The source read established (a) the copies are exact, so there is nothing for the deep-tail channel to reach, and (b) the flag the tool raised is on the joined climate table, not the roots.

**Both the expected catch and the expected miss were wrong, in the same direction: the file is not what the ground truth said it was.** The PubPeer commenter's "digits changed" is a derived column. Read the file, then claim — including reading the file the *ground truth* describes, not just the file the tool reports on.

**The retraction notice, read afterwards, corroborated the source read on every point.** WinRHIZO merge error; whole outputs mis-assigned; no digit editing. The source read reached that from the raw doubles alone, before the notice was available. **That is the S237 discipline paying out, rather than catching a mistake.** It is worth recording the direction: the read was not merely defensive this time — it independently reconstructed the mechanism the authors later admitted.

---

#### S317 — grouping, and a third thing C12 exposed

**C12 row-groups into 132 conditions of about 18 rows, and every row-grouped verdict from this file is computed on those units.**

Role inference tagged **seven** columns `condition`: Latitudes (3 values), Combine (3), Plot (3), Pair (5), Code (10), Name (10), Origin (2). `Code` and `Name` are species and site **identifiers**; `Plot` and `Pair` are nested survey positions. **`Origin` (Invasive/Native) is the only column resembling an experimental arm.** The grouper merged all seven into a Cartesian product.

> **The permutation null's exchangeability assumption — *conditions are exchangeable at the row level* (METHODOLOGY:484) — is false about these units.** Rows within *Sonchus oleraceus, plot B_middle, pair 2, invasive* are not an arm. They are an address.

**This is C12's third distinct failure, and the three are now separable on one file:**

| Mode | On C12 |
|---|---|
| **Applicability** | The climate join (§2.8) — and now the grouping (§2.10), which is the same failure one level up: the wrong *unit* rather than the wrong *column*. |
| **Coverage** | The copied roots (§2.9) — never counted, so p = 1 by construction. |
| **Circular null** | Not demonstrated here. C08 carries it. |

**Cross-Condition Consistency is 43.5 seconds of a 59.4-second run — 73%.** The cost is `ksDistance` across all `C(132, 2) ≈ 8,646` condition pairs, not the shuffle. Blocked Mahalanobis, the fixture-batch champion, is **4ms** on this file. **The performance number is a symptom of the grouping, not a bug to patch.** Capping the group count would have made a meaningless computation fast and hidden the finding.

**Windowed Autocorrelation's 36-column arm completed for the first time (S317).** It had been crashing on a stack overflow. It reads `LOW`, `primaryP = 0.068`, **270,453 window units across 630 pairs, 0 significant.** The most extreme windows show local `r ≈ ±0.73` but do not survive per-pair BH-FDR.

> **Provisional.** The probe ran on raw values; the engine feeds VST-log-transformed input, which could shift the p-value. **Do not quote 0.068 in the paper** until it has run through the real pipeline.

**The 15-column arm is unchanged:** `LOW, primaryP = 0.24`.

**And the corpus diagnostic was showing nothing (S317).** `evidenceOf` read `details`, which on a grouped file holds per-group summaries — so C12's Entropy displayed **132 rows of `{group, rows, flag}` and no entropy value anywhere.** The per-column records were in `subDetails` the whole time. Fixed. The Entropy finding it was hiding:

```
group: B_middle | Pair2 | … | Sonchus oleraceus | Invasive
  Col 1  Low entropy  H_obs=3.807  H_expected=5.202  ratio=0.732  adjP=0.0075
  Col 2  Low entropy  H_obs=3.664  H_expected=5.297  ratio=0.692  adjP=0.0075
```

**Two columns, one group, both real.** Whether it survives the grouping fix is an open question — it was computed on one of the 132 units.

---

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

### CORPUS-01 — Parkinson's / Cell 2016 (documented defect CAUGHT — the miss converted, S329; two open channels closed S330; Decimal Precision false positive FIXED S336) — FULLY ADJUDICATED
- **Source:** `MouseTreatmentMotorFunction.xlsx`, Dryad `doi:10.5061/dryad.4mp6h`
- **Paper:** Sampson et al., *Cell* (2016), gut-microbiota / Parkinson's model
- **Documented defect:** two sets of 5 identical sequential values in the adhesive-removal column, shared between SPF and ExGF mice; plus a pair of 3-identical-number sequences in the germ-free wild-type pole-descent data.
- **Defect family:** sequential block duplication across groups that should be independent.
- **Adjudicated result — Class A (detection). Was Class C at Tier-1; the §2.4 Sequential Duplication detector converts it to a catch, verified against the deposit at S329.** Sequential Duplication fires **HIGH, primaryP = 1.845e-6**, and the evidence lands on exactly the documented rows. Two sequences tie at the minimum, both in `Avg Adhesive removal time (sec)`: `[1.31, 1.56, 3.42, 2.53, 2.44]` at sheet rows 10–14 (SPF/WT) recurring at 78–82 (ExGF/WT), and `[7.36, 2.19, 11, 22.28, 16.78]` at sheet rows 20–24 (SPF/ASO) recurring at 92–96 (ExGF/ASO). A third sequence contributes at pAdj 6.9e-3 — `[2.18, 4.29, 3.01]` within GF/WT at sheet rows 27–29 and 33–35, the documented pole-descent pair. Chat read the deposit independently (all three locations confirmed in the data) and mapped Code's `result.sequences` dump onto them: right column, right values, right direction. **The catch is real and on the right rows.**
- **The old miss (superseded).** Tier-1 recorded Class C: "the engine has no column-localised sequential-duplication detector; Exact Duplicate Detection and Constant-Offset Blocks both returned LOW (p=1)." The §2.4 detector (built S304, live) closes that gap. The disclosed coverage boundary this entry once carried is now a disclosed **conversion** — a documented miss the v1.x work turned into a catch.
- **False-positive note:** Missing Data Pattern is adjudicated **B2** — it localises to a tight contiguous block of one column in one group, which is honest group-specific attrition, not a diffuse anomaly. The 17 zero-weight Sequential Duplication sequences all sit in `Hindlimb score`, an integer 0/1 ordinal where short runs recur by construction; the null prices them at pAdj = 1 and they contribute nothing to the verdict — the pricing correctly keeps innocent runs out of the evidence. **A second B2 was adjudicated at S330 — Decimal Precision, see below; it was fixed at S336 and the channel now returns LOW.**
- **Decimal Precision HIGH — adjudicated B2 false positive, caused by IEEE float representation (S330); FIXED S336, now LOW.** Decimal Precision Consistency fired **HIGH, primaryP = 1.586e-6**, and the cause was entirely an artefact of how the values are stored and read. The adjudication below stands as written; the resolution is recorded at the end of the block.

  **The mechanism.** The test counts decimal places as `String(v).split(".")[1].length` (`decimalPrecision.js:37-38`), where `v` comes from `parseExcel`'s deliberate S309 choice to read the underlying numeric primitive at full precision (`excel.js:82-88`) rather than the display-formatted string. That choice is right — it stops a display format like `0.000` masking real precision before the engine sees it. But it means a stored computed average whose nearest double needs 16–17 significant digits round-trips into `rawMatrix` as, for example, `3.5100000000000002`. **A human reading the sheet sees 2dp; the counter records 16.** There is no tolerance step between the two.

  **The arithmetic.** Over the 301 decimal-valued cells the computed histogram is 1dp: 14, 2dp: 272, 3dp: 4, **15dp: 5, 16dp: 6**. The six 16dp cells set `maxDecimalPlaces = 16`. The test's binomial trailing-zero model then takes 16 as the instrument's true precision and expects about 27 values at 15dp; it observes 5. That one-tailed deficit gives p = 1.06e-7, adjusted to 1.586e-6, and the HIGH. Level 15 is the only level with adjP < 0.01 — every other level sits at 1.

  **Eleven cells carry the entire flag.** Of the 15 cells above 2dp, **11 are float artefacts** (5 read as 15dp, 6 as 16dp), 8 in `Avg Beam cross time (sec)` and 3 in `Avg Pole descent time (sec)`. Running the real `testDecimalPrecision` on a copy rounded to 6dp — which kills the IEEE noise and preserves everything genuine — returns **LOW, p = 1.0, maxDp = 3**, describing the file as consistent with 3dp instrument output. The flag does not survive the artefact's removal.

  **What is genuinely there, and did not fire.** Four cells are truly 3dp: `6.676`, `6.125`, `4.895` — contiguous at the **top of the GF/WT group**, sheet rows 25–27 — and `3.635` in SCFA/WT. Three higher-precision values arriving together at a group boundary in an otherwise 2dp column is a real structural observation, plausibly a different export or paste route for that group's first rows. **It is worth recording and it is not what the test flagged.** Terminal-digit uniformity is clean on all three timing columns (p = 0.22, 0.57, 0.21). Chat provisionally attributed the HIGH to these 3dp values before the engine evidence was opened; that attribution was wrong, and the correction is the S330 method note in the reading notes above. **Verified at source, S336.** The GF/WT block runs sheet rows 25–35, and the three 3dp values sit at rows 25, 26 and 27 — the first three rows of the block, exactly as recorded. The observation survives the fix: the values are genuine, they are still counted as 3dp after normalisation, and they remain unflagged.

  **Scope — this was never a CORPUS-01 quirk.** Any column of computed values stored at full double precision exhibits it, which is most spreadsheets containing an average. Nor is it Excel-specific: a CSV carrying full-precision computed values as text reproduces it exactly, so the fix went in the test rather than the importer.

  **Two refinements from reading the deposit at S336.** All eleven artefact cells carry `General` number format and none is a formula. So no display format is masking anything and `parseExcel` was passing the workbook's value faithfully — the **S309 import choice is not implicated**, and the earlier framing that traced the defect to it is too strong. The workbook stores an off-grid double: the nearest double to 3.51 stringifies as `3.51`, so `3.5100000000000002` is a genuinely different value that arrived by arithmetic upstream.

  **Resolution — S336, main `4a7cda2`.** `decimalPrecision.js` now rounds each value to fifteen significant digits before counting, and uses the rounded form only where rounding actually moved it. That guard preserves trailing zeros on the CSV path, where the string is the file's own text and trailing zeros are the test's subject. The threshold is a property of IEEE 754 rather than a tuned tolerance — a double carries at most fifteen decimal significant digits of guaranteed precision, and on this file the eleven artefacts need 16 to 17 while all 354 genuine decimal values need 1 to 4.

  **The channel now reads:** LOW, p = 1, `maxDecimalPlaces` 3, `gapsDetected` 0, `nDecimalValues` unchanged at 301 — nothing dropped, only recounted. **The file's verdict is unchanged at severity 3.** Sequential Duplication (1.845e-6) and Missing Data Pattern (4.32e-7) both still fire HIGH and carry the same two dimensions. Removing a false channel cost no detection.

  **Open gap.** No fixture carries a float-representation artefact, because no authored fixture can — the artefact only arises from a real spreadsheet round-trip. The guard was proved on this file and by a byte-identical description dump across the batch, not by a gate. V1X §2.6's batch-blindness follow-on now covers a shipped guard.
- **The two errored tests — Entropy and Mahalanobis Row Outlier, both starved by per-group minima (S330).** Both reach `errored` by the same route: dispatched per row-group, every one of the 10 groups returns N/A, and `aggregatePerGroup` (`aggregation.js:66-84`) collapses them to `flag:"N/A"` with `erroredCoverage: true` and the description **"No group had sufficient data for this test."**
  - **Entropy / Zipf Analysis — display name "Distinct numbers."** Needs 20 values per column within a group (a bare literal at `entropyTest.js:47`). The largest group is 15 rows. The closest any column came is `Avg Beam cross time (sec)` in Abx/WT at 15, five short. **Unreachable by construction** on a 105-row file split into ten groups — no column in any group can satisfy it. Note that the description carried is the aggregator's string, not entropy's own "All columns had insufficient observations (< 20)…", which is never produced under per-group dispatch.
  - **Mahalanobis Row Outlier — display name "Unusual rows."** Needs complete-case rows at 3 × column count = 12, per group (`mahalanobis.js:31` on raw rows, `:45` after dropping any row with a null). Eight groups fail on raw rows outright. The two that clear it — Abx/WT at 15 and ExGF/ASO at 14 — then fail the complete-case gate at 7 and 5. **The complete-case counts equal the `Hindlimb score` non-null counts exactly** (6,5,6,6,7,4,4,5,6,7), so a single column that is `nd` on 49 of 105 rows caps complete rows below the gate in every group, including both large enough to qualify. A listwise-deletion cascade from one sparse column.
  - **Why these two and not the other per-group tests.** Column GoF and Modality dispatch per group as well, but carry `noGroupMeetsMin` pre-check guards (`engine.js:531-533`, `544-546`) that return a plain N/A and land in `notApplicable`. **Entropy and Mahalanobis are the only two per-group tests without such a guard**, which is exactly why they are the two that error.
  - **Reader consequence — this is P32's producer half with a real file behind it.** The message names no minimum, no column, and no distance from the gate. A reader cannot tell that entropy missed by five, that Mahalanobis was capped by one sparse column, or that no amount of additional data in the other three columns would change either outcome. P32's producer half became P39 and shipped as `naCause` at S331–S333, so this is no longer work to scope — the file stays the worked example of the reader consequence. (S355)
- **Grouping-trigger status — clean on both arms, confirmed at source (S330).** Two condition columns (`Treatment`, `Genotype`), so Arm 1 (≥3) does not fire; ten groups sized 6–15 with median 10.5, so Arm 2 (median ≤4) does not fire. Independently reproduced from the deposit and by the engine. The §0.3 census entry is correct.
- **Evidence-legibility note (S329, parked).** In the returned object `col` is a matrix column index, not a name, and identity is recoverable only with the external `dataCols` map — which is offset because the two condition columns (Treatment, Genotype) are held out of the analysis matrix (4 data columns, not 6). A reader cannot name the fired column from the object alone. Legibility gap, not a detection gap; homed with the same-family finding on the two duplicate tests' divergent conventions (see Open items).
- **Prior expectation (superseded twice):** an earlier draft predicted Exact Duplicate Detection HIGH; Tier-1 corrected that to a miss; S329 corrects the miss to a §2.4 catch.

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
- **Adjudicated result — Class A (detection), now caught at correct severity by a second channel (S329).** Two channels touch the defect:
  - **Exact Duplicate Detection — detects, under-calls (unchanged).** It listed the exact recurring SL rows as evidence but rated severity **LOW (p=1.0)**. Cause: the collision null is the empirical Herfindahl index of the column's own value frequencies, so a defect that repeats every value four times inflates its own baseline and the p-value collapses. Confirmed still LOW at S329 — all five sub-test p-values at 1.0, `overRepresentedValues: 83`, `collisionObs: 716` against expected 543, and the recurring SL pairs still listed. Detection present, severity collapsed. The null fix is still owed (V1X §2.6).
  - **Sequential Duplication — HIGH, primaryP = 1.4707e-35, on the right column (S329).** The channel the Tier-1 adjudication never credited fires HIGH and lands entirely on SL — all 39 returned sequences in SL, zero in `Total.distance`, which differs at every row across the repeat. The driver is a height-21 run repeating at offset 8 (sheet rows 97–117 → 105–125): an 8-row cycle (two fish × four observations) copied down the column, which is the ID-join scramble made visible. Chat verified the SL structure in the deposit independently — of 84 distinct SL values, 72 appear exactly 4× and 10 appear 8× — and confirmed the run byte-identical across source and destination. **The severity Exact Duplicate loses, Sequential Duplication supplies, on the documented rows.**
- **Benford first + second digit — HIGH at the p=0 simulation floor, adjudicated B2 false positive (S329).** Both Benford channels fire, but on innocent structure, and neither sees the join scramble (Benford reads leading digits; 4× recurrence does not change them). The mechanism is cross-column pooling that defeats a per-column gate: `benford.js` and `benford2.js` open with `matrix.flat()`, so the two data columns are pooled before the `robustLogSpan` ≥1.5 gate. `SL` alone has span 0.0946 and is **refused** by that gate (all 373 values lead with digit 2 because the fish are all 20–29 mm — an honest narrow-range measurement). `Total.distance` alone has span 1.6949 and passes. Pooled span is 1.5722, so the set passes, and SL's 373 identical digit-2 values then dominate the χ² (pooled first-digit χ² 855.6; SL alone 1745, `Total.distance` alone 30.5). The pooling is intrinsic to the test, not a runner artefact — the UI path pools identically. This is the heterogeneous-pooling false positive V1X §2.6 axis-1 already predicts (Benford span-borrowing), now confirmed and localised at source. **Recorded as B2, not a catch; V1X §2.6 axis-1 updated S329.**
- **Declared-structure footnote:** the engine's unaided role inference misclassified the `Fish.ID` column as data; the roles were declared explicitly (`Fish.ID: identifier`) via the corpus runner's `conditionsHint`, not unaided-inferred. Recorded in `CORPUS-PROVENANCE.md`. The row demonstrates detection and verdict-restraint, NOT unaided role inference (which failed here — v1.x work, V1X §2.5).
- **Disclosed limitation:** the Exact Duplicate under-call falsified a recorded safe-claim (that continuous data is exempt from the null circularity). Corrected in METHODOLOGY §1.1 (S294); source comment `duplicateDetection.js:135` correction owed; the null fix is V1X §2.6. The under-call stands — the S329 Sequential Duplication catch supplies correct severity by a second route but does not repair Exact Duplicate itself.
- **Evidence-legibility note (S329, parked).** The two duplicate tests use different conventions in the same run: Sequential Duplication carries 0-indexed matrix rows with `col` a matrix index; Exact Duplicate uses 1-indexed rows in an `"a & b"` string and an `overRepresented` array of `{value, count}` with no column and no positions. A consumer reading both objects must not share a converter. Same family as the CORPUS-01 `col`-is-a-matrix-index note.
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
   - **B2 — legitimate structure:** the flag fires on honest-but-structured data (block design, quantisation, rounding, genuine biological duplication). This is a **false positive** and the most important row in the table — it characterises the real-world FP surface. (CORPUS-01 Missing Data and CORPUS-01 Decimal Precision; CORPUS-02 dose-adjacency, decimal precision, condition-pooling; CORPUS-03 Benford are the realised B2 set.)
   - **B3 — ambiguous:** can't adjudicate from the data alone. Record as ambiguous, don't force a verdict.

**C. Documented defect the tool missed.** A defect in the ground truth the tool did not flag. This is a **false negative** and a coverage finding. (Realised: CORPUS-01 sequential duplication; CORPUS-02 near-dupe-with-digit-signature; C23 near-dup missed by Exact Duplicate; C08 CAT near-dup and Exact Duplicate false negative.)

   - **C-wrong-reason (new sub-case, S314).** The tool returns a *correct verdict* on a *defective file*, but the evidence it surfaces points at legitimate structure rather than at the documented defect. **This is a miss, not a catch**, and it must be recorded as one — the severity being right does not make the detection right. A reader following the evidence lands on honest data and never sees the defect. **Realised once: C12**, where Duplicated Data flagged High on a joined climate table while the retraction-grade copied root vectors went unreported. This sub-case is invisible to any accounting that scores on verdict alone, which is precisely why it needs naming.

**Ground-truth discipline:** treat Englund's / Geng's writeup as *the label*, but adjudicate the tool's output against the **data**, not the prose. A flag on a column the writeup didn't mention is a B-case to investigate at source, never an automatic miss.

---

## 5. Output: the results table

The run produces one table that *is* the paper's real-world results section (drafted: `PAPER-REALWORLD-RESULTS-DRAFT.md`, S294, argument-ordered CORPUS-02 → 01 → 03).

| Dataset | Documented defect | Tool verdict (severity) | Driving tests (tier, primaryP) | Evidence localised correctly? | Class A/B/C | Notes |
|---|---|---|---|---|---|---|

Plus two summary statistics across the corpus:
- **Sensitivity:** reported as detection-and-severity, NOT a single caught/missed fraction — because detection and severity diverged on CORPUS-03. Adjudicated (updated S329): one clean catch (CORPUS-02 exact copy), one independent catch (CORPUS-02 variance), **the CORPUS-01 sequential-duplication defect now caught by §2.4 Sequential Duplication (was a by-design miss at Tier-1, converted S329)**, CORPUS-03 detected by two channels — Exact Duplicate under-calls but Sequential Duplication catches it at correct severity — and one disclosed by-design miss remaining (CORPUS-02 near-dupe with terminal-digit signature). The one CORPUS-01 Tier-1 miss that anchored the "disclosed coverage boundary" framing is now a **disclosed conversion**: a documented miss the v1.x §2.4 work turned into a catch, deposit-verified. **S330 adds no detection either way** — CORPUS-01's two remaining open channels resolved to one B2 false positive (Decimal Precision) and two coverage-starved errored tests, neither of which touches the documented defect. The sensitivity figure is unchanged; the false-positive surface grew by one.
- **The wrong-reason High (C12) is counted as a miss, not a catch.** See §4 C-wrong-reason. Any sensitivity figure that scores C12 as a detection because the severity was High is measuring the wrong thing. **The tool's evidence, not its verdict, is what a user acts on.**
- **False-positive surface:** the B2 flags per dataset — the headline real-world-discipline number. Realised (updated S330): **six B2** — CORPUS-01 Missing Data, **CORPUS-01 Decimal Precision (S330)**, CORPUS-02 dose-adjacency, CORPUS-02 decimal precision, CORPUS-02 condition-pooling, and **CORPUS-03 Benford (S329)** — plus one unresolved (CORPUS-02 Selective Noise, no evidence emitted — not counted as FP) and one B1 win. Every resolved B2 traces to a nameable legitimate structure or a nameable artefact; two (dose-ordering, condition-pooling) are structural v1.x limitations. **Two now have distinct mechanisms, and they are not the same mechanism.** The CORPUS-02 decimal-precision B2 and the CORPUS-03 Benford B2 are **cross-column pooling** (V1X §2.6 axis-1): a per-column test run on a pool, where the pool lends one column a precondition it individually fails. The CORPUS-01 decimal-precision B2 is **input representation** (V1X §2.6 axis-4): the test's own predicate is defeated before pooling is reached, by IEEE float noise entering the decimal-place counter with no tolerance step. **Same test, two different failure routes** — an important distinction for the paper, because it means fixing the pooling guard would not have caught CORPUS-01.

The paper claim this supports is the existing one, verbatim: **"every expert-flagged item the engine was built to catch, it caught"** (bounded sensitivity), *plus* a characterised and disclosed false-positive surface (discipline), *plus* disclosed coverage gaps. **Not "provably defect-free," and not a clean sensitivity number.**

**Three claims the road test now supports that the Tier-1 run did not (S305–S314):**

1. **The false-positive surface has named causes, and they are one family.** Four: Benford's order-of-magnitude gate; Value-Frequency Spike's precision-blind expected count; within-row trivial-pair counting; and — the largest — **the whole battery's assumption that every numeric column is a measurement of its row** (C12's joined site attributes; V1X §2.8). In each case *the statistic is correct and the baseline is wrong about the column.* An applicability failure, not a computational one. That is disclosable. "We flag some honest data" is not; "we flag honest data in these four nameable circumstances, and here is the fix for each" is.

2. **There is a second, independent failure: the duplication detector misses exact copies.** C08's Exact Duplicate cleared a file with 25.5% within-column duplicates. C12's returned High while pointing at the wrong columns — and when §2.8 removed the wrong columns (S315, `531e180`), it returned **p = 1** on the 15 genuine measurement columns, with ~30 exact byte-identical copied row-pairs sitting in them.

   **This is not the applicability failure wearing a different hat.** An earlier draft argued the false positive *displaced* the true positive, and that fixing applicability would let the copies surface. **It does not.** The two are independent failures that happened to co-occur on the same file, and fixing one leaves the other untouched. The statistic is applied correctly, to the right columns, with nothing in the way — and it returns the wrong answer. **That is the sharper half of the disclosure, it is a different problem from (1), and it is not in the literature.**

3. **Every documented fabrication in this corpus is a copy — and not every copy is fabrication.** Six Class A files, six copy operations, zero invented-from-nothing numbers. The classical digit tests (Benford, terminal digits, digit preference) target *invention*; this corpus contains no instance of it, and those tests contributed no catches and five axis-1 false positives. Meanwhile C12's copy was an **admitted, unintentional merge error** that retracted a paper. The tool detects patterns inconsistent with honest data generation; it makes no claim about intent, and C12 shows why that boundary is the right one — the signature, and the consequence, are the same either way.

---

## 6. Run sequencing (Tier-1 complete; Tier-2 lean retained)

1. **Tier 1 — DONE (S292–S294).** Three Dryad files downloaded, full battery run, adjudicated. Results in §2 above and `PAPER-REALWORLD-RESULTS-DRAFT.md`.
2. **Tier 2 — gated on data access.** Confirm Nature source-data downloadability for CORPUS-04 (the strong terminal-digit positive) before scoping; CORPUS-05 only if a cross-sheet comparison is in scope or the within-sheet residue is independently anomalous.
3. **Paper row order (locked S294; the CORPUS-01 rationale changed S329, order under review).** As locked: argument-ordered — CORPUS-02 (strongest: exact-copy catch + independent variance catch on a retracted paper), then CORPUS-01, then CORPUS-03. The S294 lock placed CORPUS-01 second as a "disclosed by-design miss." **S329 removes that rationale — CORPUS-01 is now a §2.4 catch, and CORPUS-03 is caught at correct severity by a second channel.** The order is not re-locked here: the argument the ordering serves has shifted from "open on strength so the disclosed gaps read as candour" toward "the v1.x work converts two of the three files' hardest cases," which is a paper-narrative decision for its own pass. Flagged, not resolved. (The earlier CORPUS-01-first "front-load a confirmation" order — retired at S294 because CORPUS-01 was then a miss — is worth revisiting now that CORPUS-01 catches.)

---

## Open items
- **ROW-GROUPING — BLOCKS SIX FILES AND THE WHOLE ECOLOGY CLUSTER (S317).** The engine groups rows by the Cartesian product of every column role inference tags `condition`. C12 → 132 groups; C16 → 60 singletons, silently dropped and not assessed; C22 → 44; C20 → 37; C08 → 35; C09 → 20. **The permutation null's exchangeability assumption is false about these units.** See §0.3 and V1X §2.10. **The S318 lead, and the first move is Chat authoring the contract in METHODOLOGY, not a dispatch.** Nothing row-grouped from those six files is interpretable until it is settled. **(S322 update: contract settled and cross-validated twice; both parts built — trigger + confirm card, stance validated, twelve fixes unpromoted. C14 is a 7th blocked file, S322 census correction. Now gated on promote, with one display reconciliation outstanding against METHODOLOGY §Applicability. See §0.3 and V1X §2.10.)**
- **C14 — two things at once, never properly run.** A **closed** adjudication (sheet rows 262↔263 byte-identical across all fourteen matrix columns but carrying different `STAND_ID`s — **defect**, settled S328 against the standing lean; see the §2.4 entry for the 253-block census that settled it) *and* the file that broke §2.9's prefilter (`CROWNCLASS`: five distinct values over 9,398 rows → 16.9 million agreement pairs). **C14 row-groups** — `Species` + `DamageSev` → 236 groups, median size 4, min 1, max 1671, firing on Arm 2 only. Measured S327 through the real inference pipeline; §0.3's S322 figures are correct in every particular. This line previously read "C14 does not row-group — no condition columns — so it is not blocked by the item above". That was wrong, and it survived the S322 correction because that correction updated §0.3 and §0.4 and never touched this entry. **C14 is blocked with the cluster.**

  **S327 additions.** Three things now known that were not:
  - **The HIGH is robust.** Sequential Duplication returns HIGH at `primaryP` 7.917e-69, driver `ACTIVITY_ID`. It survives dropping eight of fourteen columns.
  - **Both PubPeer runs are independently caught in `Biomass (kg)`** at pAdj 1.37e-36 and 9.27e-33, entirely outside the categorical columns. The geometry matches the entry — run A is h=11 at d=11, an eleven-row block recurring eleven rows later.
  - **The cardinality guard is dead, killed on evidence S328 (was STATUS P26).** The line here previously read "rows 260↔261 are covered only by `Tree ID` and `CROWNCLASS`; excluding those two columns loses that pair and nothing else in the file." **Every clause of that was wrong.** Measured through the real pipeline: excluding both columns from the sequence scan drops **40 duplicate blocks** out of what Sequential Duplication can point at, **32 of them found by nothing else in the battery**, and **36 of the 40 span different `STAND_ID`s** — precisely the population the adjudication turned on. The guard would delete evidence to buy speed.
  - **The adjudicated pair is invisible to Sequential Duplication.** Two rows is a run of one against a height floor of three, so no sequence explains it with every column in play. **57 of the 253 blocks are unmapped for the same reason.** Duplicate Detection catches the pair instead, as an exact two-row group. The pair therefore never gated the guard at all.
  - **The tool cannot see what makes the pair a defect.** Rows 262↔263 are identical across all fourteen matrix columns; the single differing column in the sheet is `STAND_ID`, which the pipeline drops as a label. The tool can say the rows are identical. It cannot say they are supposedly different stands — and that is the sentence that turns a duplicate into a finding.
  - **The precedent predicate is worse than nothing here.** `PARTIAL_ROW_CARD_FRAC = 0.02` on largest-value share would hold out **seven of fourteen** columns on this file, including `ACTIVITY_ID` — the current driver of the HIGH at pAdj 7.92e-69.
  - **The cost finding still stands.** Those two columns carry 95% of kept sequences. That was never in doubt; what changed is that they are not idle. The cost has to be bought somewhere that is not the evidence — async yielding is the standing candidate.
  - **`CROWNCLASS` is not just a prefilter problem.** It defeats the sequential-duplication scan by the same mechanism. C14 `Data` is the only corpus sheet where low cardinality and large row count combine.
- **C08 circular null — own session.** `collisionObs = 268` is exactly right; the empirical-HHI expectation inflates to ~793 and absorbs the signal. It touches Test 1's collision null, **which every file passes through.** C08 also row-groups into 35 — check whether these interact before scoping. *(The last time two C08/C12 defects were assumed independent, that assumption was wrong.)*
- **CORPUS-02 near-duplicate-with-terminal-digit-signature:** confirmed Class C coverage gap — no current test catches pairwise near-matches (only whole-column digit distributions and exact dupes). v1.x coverage candidate, as anticipated.
- **CORPUS-01 sequential-duplication — CLOSED S329.** Was confirmed Class C (no column-localised detector). The §2.4 Sequential Duplication detector (built S304, live) catches it: HIGH 1.845e-6, evidence on the two adhesive runs and the pole pair, deposit-verified. No longer an open coverage gap. See the CORPUS-01 §2 entry.
- **Evidence-object legibility (S329, new parked item).** Two findings, one family: (a) Sequential Duplication's `col` is a matrix column index with no name, resolvable only via the external `dataCols` map, which is offset when condition columns are held out (both CORPUS-01 and CORPUS-03); (b) Sequential Duplication and Exact Duplicate use different row/column conventions in the same run (0-indexed matrix vs 1-indexed `"a & b"` string; `col` present vs absent), so a consumer must not share a converter. A reader cannot always name the fired column or row from the object alone. Legibility, not detection — but it blocks clean evidence display for the paper. Scope a per-test evidence-object contract.
- **CORPUS-03 Benford pooling FP (S329) → V1X §2.6 axis-1.** The Benford HIGH on CORPUS-03 is a B2 false positive: `matrix.flat()` pools both columns before the `robustLogSpan` gate, so `Total.distance` (span 1.69) carries `SL` (span 0.09, individually refused) past the gate, and SL's all-digit-2 values then dominate. Confirmed intrinsic to the test, not a runner artefact. This realises and localises the span-borrowing axis V1X §2.6 axis-1 already names. Fix direction: gate per column, pool only gate-passing columns — its own scoping.
- **CORPUS-01 Decimal Precision FP (S330) → V1X §2.6 axis-4 (new axis).** The Decimal Precision HIGH on CORPUS-01 is a B2 false positive caused by IEEE float representation, not pooling. `parseExcel` stores the raw numeric primitive at full precision (`excel.js:82-88`, the deliberate S309 choice) and `decimalPrecision.js:37-38` counts decimal places off that string with no tolerance step, so `3.5100000000000002` counts as 16dp. Eleven such cells inflate `maxDp` to 16, the binomial model expects a densely-populated 15dp level, and its emptiness reads as fabrication-grade inconsistency. Rounding to 6dp and re-running the real test returns LOW, p = 1.0. **This is a different axis from the pooling one and needs its own guard.** Fix direction: a tolerance-rounding step before the decimal-place count, with the threshold chosen so it cannot mask genuine precision — the S309 import choice must survive it. Its own scoping; deliberately not scoped at S330. **Corpus-wide consequence: every Decimal Precision result in the corpus is suspect until this lands.**
- **CORPUS-01's two errored tests (S330) — closed as adjudicated, open as a display item.** Entropy ("Distinct numbers") and Mahalanobis Row Outlier ("Unusual rows") both error via the per-group `erroredCoverage` path, starved by minima this file cannot reach (entropy 20 per column per group against a largest group of 15; Mahalanobis 12 complete-case rows per group, capped at 7 by `Hindlimb score`'s 49 missing values). The adjudication is settled. What stays open is that the errored message names no minimum, no column and no distance from the gate — **STATUS P32's producer half, and this file is the concrete citation for it.** (S355: that half shipped as P39 at S331–S333; P32 sits below the current register floor and no longer resolves.)
- **CORPUS-05 cross-sheet detection:** out of scope for a per-table tool unless a cross-sheet mode exists. Scope decision before including.
- **Data-access confirmation** for both Tier-2 cases before they enter the run.
- **Two out-of-run documented defects** noted during Tier-1 (CORPUS-01 SynucleinandInflammation.xlsx; CORPUS-02 ATPase-Activity sheet) — possible corpus extensions.
- **Machine-manifest tracking** (`corpus-data/corpus-manifest.json`) — a Code-side reproducibility decision, carried. `CORPUS-PROVENANCE.md` carries the human-readable declaration + DOIs.

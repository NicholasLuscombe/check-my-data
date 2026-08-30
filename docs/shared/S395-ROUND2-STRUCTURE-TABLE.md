# Round 2 — the structural read of the thirty

**Read-only.** No `src/` file was modified. **No arm ran, no gate is answered, no role was
reassigned (§14.3), and nothing was written to `ROUND2-RUN-LOG.md`.** Every read stops at
`extractAnalysisInputs`; `runFullAnalysis` is never called. The 27-fixture batch does not apply —
there is no `src/` diff for it to gate — and there is no rendering surface, so no preview.

**The gate answers are formed from this table afterwards, in one pass. They are not here.**

**Generated, not hand-maintained.** Every figure below is interpolated from
`test/probes/out-s395/round2-structure.json` by `test/probes/build-s395-round2-table.mjs`. No
number in this record was transcribed. The JSON is gitignored (`test/probes/out-*/`) and
regenerates in under twenty seconds.

**Reproducible except for one column, and that is measured rather than assumed.** The generator is
deterministic given the JSON (two runs over one artefact, byte-identical). Two independent *batch*
runs are byte-identical **with the elapsed-time fields stripped** — so the `s` column in §2 and the
per-deposit timings are the only figures here that move between runs, and every structural figure
is stable.

```bash
node test/probes/run-s395-round2-structure.mjs      # the batch, one child per deposit
node test/probes/build-s395-round2-table.mjs        # this record
```

**Instrument.** `test/probes/probe-s395-round2-structure.mjs`, one child process per deposit,
run through `test/probes/s395-corpus-run-hook.mjs`. The hook replaces `scripts/corpus-run.mjs`'s
CLI tail with an export list and touches nothing above it, so `prepStructure`,
`buildAnalysisConfig` and `readRawMatrix` are **the census path's own source text executed**.
`inferBaseRoles`, `detectGroupAttributes`, `preprocessRaw`, `detectBlocks`, `detectHeaderRows`,
`isSparseGroupRow`, `isRepeatingSubHeader`, `getSheetNames`, `extractAnalysisInputs` and
`suggestRowSemantics` are imported from `src/` under the specifiers the engine and the view
already use. The only arithmetic performed here is over those functions' outputs.

**Naming hazard.** `s395-corpus-run-hook.mjs`, `probe-s395-role-inversion.mjs` and
`probe-s396-inversion-incidence.mjs` are **S394's** despite the prefix. This record's probes —
`probe-s395-round2-structure.mjs`, `run-s395-round2-structure.mjs`,
`build-s395-round2-table.mjs`, `probe-s395-pos01-structure.mjs`, `probe-s395-pos01-trigger.mjs`
and `probe-s395-pos01-gates.test.jsx` — are S395's. The hook is reused unchanged.

## What this pass found

- **`detectHeaderRows` returned 1 on all 30 sheets. Not one two-row header in the whole round-2 set.** And the conjunct trace says which test defeated it, which the return value alone cannot: `isSparseGroupRow(row0)` is true on exactly **3** — pos-01, pos-14, pos-35 — and **all 3 are defeated by the same conjunct**, `isRepeatingSubHeader(row1)` returning false.
- **Spanning band labels on 4 of 30 deposits** — pos-01, pos-14, pos-35, pos-43 — of which 3 carry unequal widths. §16's class is not confined to position 1. **On the other 26 there is no spanning header at all**, stated per deposit rather than left blank.
- **Arm 1 fires without arm 2 on 4 deposits** — pos-02, pos-18, pos-34, pos-46 — where round 1 had none. This is the case recorded as unmeasured on any corpus and named as the one place confirming the grouping could still move a verdict. One of them (pos-02) refuses at the import floor, leaving 3 live instances.
- **`suggestRowSemantics` declines to answer on 25 of 30.** `value: null, reason: "user-choice"`. It returns `"ordered"` on 5 and `"arbitrary"` on 0. So on 25 deposits `ImportView` will require a human answer while `corpus-run.mjs:246` substitutes `'ordered'` for the null.
- **The last-row-is-a-column-total shape belongs to pos-01 and to no other deposit.** Its largest relative residual is 3.008e-4; the next smallest across the other 29 is **3.316e+1** on pos-22, 5 orders of magnitude away. Reported, not classified.
- **The forty-row window is a strict sample on 27 of 30.** It covers the whole column only on pos-01 (17 rows), pos-21 (32 rows), pos-22 (31 rows). pos-01's "the window is the column" is the exception, not the rule, so P217's precondition is live almost everywhere here.
- **§2.8 reached the group-attribute pass on 26 of 30 and moved a column on 11.** The three refusals reproduce §15.1's figures independently: pos-02 1 → 13, pos-44 1 → 5, pos-47 1 → 3 data columns without the hold-out.
- **Cost is not a constraint.** 30 deposits in 18.7 s wall, slowest pos-40 at 7.9 s on a 33,678 × 416 sheet. The 600 s per-deposit timer was never approached and nothing timed out.

## 1 — the run

**Order.** Ascending position with pos-40 last, and pos-01 first as a control. pos-40 carries a
33,678 × 416 sheet whose runtime was unmeasured, so ordering it last meant a hang there
would cost the other deposits nothing. pos-01 is already recorded in `S395-POS01-STRUCTURE.md`, so
a disagreement there would mean the harness was wrong before any new deposit was believed.

**One child process per deposit, with a 600 s kill timer implemented in node** — `timeout(1)` does
not exist on macOS. A deposit exceeding it is recorded as timed out with its elapsed time; a
deposit that throws is recorded with its error. Neither aborts the batch.

**Outcome: 30 of 30 completed, 0 errors, 0 timeouts, 0 manifest disagreements.**

**Provenance resolved from the manifests, never from the run log's prose.** For every deposit the
receipt (`corpus-data/round2/round2-files.json`), the ranking
(`docs/shared/round2-raw/round2-ranking.json`) and run log §4's row agree on file, sheet and index,
and the selected file's **`sha256` and byte size match the receipt on all 30**.

## 2 — the summary table

`hdr` is `detectHeaderRows`' return. `synth` is the count of `Col N` headers `prepStructure:185`
synthesised for blank header cells. `bands` counts spanning labels only (width > 1). `trigger` is
`computeTrigger`'s `attempted / condCols / arm1 / arm2 / pending` under the `replicates` answer.
`rsSug` is `suggestRowSemantics`' `value`.

| pos | file :: sheet | idx/tot | raw R×C | hdr | valid | nDC | roles C/L/D/A/I | synth | bands | trigger | rsSug | s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **pos-01** \* | `micro_data_compiled.xlsx` :: `1300-3` | 7/7 | 21×16 | 1 | 16 | 15 | 0/1/15/0/0 | 12/16 | 3 | f/0/f/f/f | null | 0.2 |
| **pos-02** † | `os_cells_new.csv` | 1/1 | 26533×21 | 1 | 26532 | 1 | 7/1/1/12/0 | 0/21 | 0 | t/7/T/f/**t** | null | 0.5 |
| **pos-03** | `OpilionesChemicalCues_v2(data).csv` | 1/1 | 152×7 | 1 | 150 | 2 | 4/0/2/1/0 | 0/7 | 0 | t/4/T/T/**t** | null | 0.1 |
| **pos-07** | `data_complete.csv` | 1/1 | 212×91 | 1 | 210 | 74 | 8/2/74/2/1 | 0/87 | 0 | t/8/T/T/**t** | null | 0.1 |
| **pos-08** | `ECS-SA_(Affinity).xlsx` :: `Protein-Peptide Info` | 1/3 | 1768×46 | 1 | 1665 | 15 | 10/12/15/1/0 | 0/38 | 0 | t/10/T/T/**t** | null | 0.3 |
| **pos-12** | `Non-target_OUTs.csv` | 1/1 | 3422×16 | 1 | 3420 | 15 | 0/1/15/0/0 | 0/16 | 0 | f/0/f/f/f | null | 0.1 |
| **pos-14** | `Rawdata_Figures_Tables_TSA.xlsx` :: `Figure 2` | 2/8 | 440×20 | 1 | 417 | 16 | 0/1/16/0/0 | 9/17 | 4 | f/0/f/f/f | null | 0.2 |
| **pos-18** | `Data_2022.xlsx` :: `Floral_M` | 4/15 | 145×204 | 1 | 144 | 147 | 3/0/147/54/0 | 0/204 | 0 | t/3/T/f/**t** | null | 0.5 |
| **pos-21** | `FEMS_dryad_v2_published.xlsx` :: `Data` | 1/3 | 35×25 | 1 | 32 | 23 | 1/1/23/0/0 | 0/25 | 0 | t/1/f/f/f | null | 0.2 |
| **pos-22** | `pgls_all_genera.csv` | 1/1 | 32×5 | 1 | 31 | 2 | 1/2/2/0/0 | 0/5 | 0 | t/1/f/f/f | null | 0.1 |
| **pos-23** | `05_hydrodynamic_daily_outputs.csv` | 1/1 | 2199×5 | 1 | 730 | 4 | 0/1/4/0/0 | 0/5 | 0 | f/0/f/f/f | null | 0.1 |
| **pos-27** | `radMS_table_1.xlsx` :: `Sheet1` | 1/1 | 176×18 | 1 | 127 | 3 | 4/2/3/0/0 | 0/9 | 0 | t/4/T/T/**t** | null | 0.2 |
| **pos-28** | `dominance_data.csv` | 1/1 | 437×12 | 1 | 435 | 4 | 4/0/4/4/0 | 0/12 | 0 | t/4/T/T/**t** | null | 0.1 |
| **pos-30** | `ips_density_Goundar_et_al_2026_Where_are_they_now.csv` | 1/1 | 48×9 | 1 | 46 | 6 | 2/1/6/0/0 | 0/9 | 0 | t/2/f/f/f | null | 0.1 |
| **pos-31** | `MC_Drosophila_hydei.xlsx` :: `Males` | 2/3 | 487×15 | 1 | 486 | 6 | 9/0/6/0/0 | 0/15 | 0 | t/9/T/T/**t** | null | 0.2 |
| **pos-32** | `XLarge_All_Pod_Inference_data.csv` | 1/1 | 52590×15 | 1 | 52588 | 10 | 1/1/10/3/0 | 1/15 | 0 | t/1/f/f/f | "ordered" | 0.6 |
| **pos-34** | `Sperm_morphological_data.csv` | 1/1 | 1234×14 | 1 | 1232 | 7 | 5/2/7/0/0 | 0/14 | 0 | t/5/T/f/**t** | null | 0.1 |
| **pos-35** | `AgeRelatedChangesInAcousticCues_data.csv` | 1/1 | 88×29 | 1 | 84 | 27 | 1/1/27/0/0 | 22/29 | 4 | t/1/f/f/f | null | 0.1 |
| **pos-38** | `Nightly_Capture_Rates_Spp_Updated.csv` | 1/1 | 313×33 | 1 | 311 | 28 | 2/3/28/0/0 | 0/33 | 0 | t/2/f/f/f | null | 0.1 |
| **pos-39** | `FIG3.xlsx` :: `FIG3A` | 2/5 | 147×16 | 1 | 146 | 14 | 1/1/14/0/0 | 0/16 | 0 | t/1/f/f/f | "ordered" | 0.2 |
| **pos-40** | `13._b_Planctomycetota_asv.csv` | 1/1 | 33680×426 | 1 | 33678 | 416 | 6/4/416/0/0 | 0/426 | 0 | t/6/T/T/**t** | null | 7.9 |
| **pos-41** | `SNPeffect_BSLMM_allvar.csv` | 1/1 | 109229×28 | 1 | 109228 | 27 | 0/1/27/0/0 | 0/28 | 0 | f/0/f/f/f | null | 5.3 |
| **pos-43** | `Isoodon_data_raw_only.csv` | 1/1 | 1650×80 | 1 | 709 | 70 | 4/5/70/1/0 | 2/80 | 2 | t/4/T/T/**t** | null | 0.2 |
| **pos-44** † | `subset_dets.csv` | 1/1 | 52950×12 | 1 | 52940 | 1 | 6/1/1/4/0 | 0/12 | 0 | t/6/T/T/**t** | null | 0.7 |
| **pos-45** | `FF_blank.csv` | 1/1 | 102×102 | 1 | 101 | 102 | 0/0/102/0/0 | 1/102 | 0 | f/0/f/f/f | null | 0.1 |
| **pos-46** | `full_chemistry_wMeta.csv` | 1/1 | 265×21 | 1 | 264 | 15 | 4/2/15/0/0 | 0/21 | 0 | t/4/T/f/**t** | "ordered" | 0.1 |
| **pos-47** † | `seed-density.csv` | 1/1 | 761×11 | 1 | 760 | 1 | 7/1/1/2/0 | 0/11 | 0 | t/7/T/T/**t** | "ordered" | 0.1 |
| **pos-49** | `data_R.csv` | 1/1 | 1859×9 | 1 | 1857 | 5 | 0/1/5/3/0 | 0/9 | 0 | f/0/f/f/f | "ordered" | 0.1 |
| **pos-50** | `Assemblies_and_species.tsv` | 1/1 | 149×9 | 1 | 147 | 3 | 1/5/3/0/0 | 0/9 | 0 | t/1/f/T/**t** | null | 0.1 |
| **pos-51** | `Pieris_phenotype.csv` | 1/1 | 572×19 | 1 | 570 | 9 | 3/7/9/0/0 | 0/19 | 0 | t/3/T/T/**t** | null | 0.1 |

\* control, already recorded in `S395-POS01-STRUCTURE.md`. † refuses at `ImportView.jsx:974` (fewer than 2 data columns) — **no gate answer is owed** (§14.3).

**`SheetNames[0]` — the alternative §6.2 discarded — per deposit:**

| pos | files in deposit | sheets measured | §6.2 decided by | tie on cell count | `SheetNames[0]` | selected sheet |
|---|---|---|---|---|---|---|
| pos-01 | 1 | 7 | cell count | yes | `Initial MORB` | `1300-3` |
| pos-02 | 1 | 1 | single candidate | no | `os_cells_new.csv` | `os_cells_new.csv` *(same)* |
| pos-03 | 1 | 1 | single candidate | no | `OpilionesChemicalCues_v2(data).csv` | `OpilionesChemicalCues_v2(data).csv` *(same)* |
| pos-07 | 19 | 19 | tie-break 3: file name ascending | yes | `data_complete.csv` | `data_complete.csv` *(same)* |
| pos-08 | 6 | 18 | cell count | no | `Protein-Peptide Info` | `Protein-Peptide Info` *(same)* |
| pos-12 | 7 | 7 | cell count | yes | `Non-target_OUTs.csv` | `Non-target_OUTs.csv` *(same)* |
| pos-14 | 1 | 8 | cell count | no | `Figure 1` | `Figure 2` |
| pos-18 | 2 | 35 | cell count | yes | `Metadata` | `Floral_M` |
| pos-21 | 1 | 2 | cell count | no | `Data` | `Data` *(same)* |
| pos-22 | 3 | 3 | cell count | no | `pgls_all_genera.csv` | `pgls_all_genera.csv` *(same)* |
| pos-23 | 14 | 14 | cell count | no | `05_hydrodynamic_daily_outputs.csv` | `05_hydrodynamic_daily_outputs.csv` *(same)* |
| pos-27 | 1 | 1 | single candidate | no | `Sheet1` | `Sheet1` *(same)* |
| pos-28 | 1 | 1 | single candidate | no | `dominance_data.csv` | `dominance_data.csv` *(same)* |
| pos-30 | 2 | 2 | cell count | no | `ips_density_Goundar_et_al_2026_Where_are_they_now.csv` | `ips_density_Goundar_et_al_2026_Where_are_they_now.csv` *(same)* |
| pos-31 | 1 | 3 | cell count | no | `Females` | `Males` |
| pos-32 | 8 | 8 | cell count | no | `XLarge_All_Pod_Inference_data.csv` | `XLarge_All_Pod_Inference_data.csv` *(same)* |
| pos-34 | 3 | 3 | cell count | no | `Sperm_morphological_data.csv` | `Sperm_morphological_data.csv` *(same)* |
| pos-35 | 1 | 1 | single candidate | no | `AgeRelatedChangesInAcousticCues_data.csv` | `AgeRelatedChangesInAcousticCues_data.csv` *(same)* |
| pos-38 | 9 | 10 | cell count | yes | `Nightly_Capture_Rates_Spp_Updated.csv` | `Nightly_Capture_Rates_Spp_Updated.csv` *(same)* |
| pos-39 | 5 | 8 | cell count | no | `FIG3_metadata` | `FIG3A` |
| pos-40 | 14 | 14 | cell count | yes | `13._b_Planctomycetota_asv.csv` | `13._b_Planctomycetota_asv.csv` *(same)* |
| pos-41 | 10 | 9 | cell count | yes | `SNPeffect_BSLMM_allvar.csv` | `SNPeffect_BSLMM_allvar.csv` *(same)* |
| pos-43 | 2 | 2 | cell count | no | `Isoodon_data_raw_only.csv` | `Isoodon_data_raw_only.csv` *(same)* |
| pos-44 | 1 | 1 | single candidate | no | `subset_dets.csv` | `subset_dets.csv` *(same)* |
| pos-45 | 6 | 6 | tie-break 3: file name ascending | yes | `FF_blank.csv` | `FF_blank.csv` *(same)* |
| pos-46 | 1 | 1 | single candidate | no | `full_chemistry_wMeta.csv` | `full_chemistry_wMeta.csv` *(same)* |
| pos-47 | 2 | 1 | single candidate | no | `seed-density.csv` | `seed-density.csv` *(same)* |
| pos-49 | 1 | 1 | single candidate | no | `data_R.csv` | `data_R.csv` *(same)* |
| pos-50 | 1 | 1 | single candidate | no | `Assemblies_and_species.tsv` | `Assemblies_and_species.tsv` *(same)* |
| pos-51 | 2 | 2 | cell count | no | `Pieris_phenotype.csv` | `Pieris_phenotype.csv` *(same)* |

## 3 — the three fields that carry the point

### 3.1 — `detectHeaderRows`, and which conjunct defeated the two-row branch

**It returned 1 on all 30.** It returned 2 on none. A return of 1 is the mechanism by which a
two-row design is lost, so the return alone is the weakest possible reading of it. The two-row
branch (`parser.js:22`) is a three-way conjunction, and reporting which conjunct failed separates
*a band row was present and lost* from *there was no band row*.

**One further source fact, because it means the return carries less than it looks.** `parser.js:23`
is `return nf0<0.5?1:1` — both arms are `1`, so the fallthrough is unconditional and `nf0` is
computed and discarded. `detectHeaderRows` returns 2 or 1 and nothing else.

| pos | returned | `isSparseGroupRow(row0)` | `isRepeatingSubHeader(row1)` | numeric fraction, row2 | conjunct(s) that failed |
|---|---|---|---|---|---|
| pos-01 | 1 | **true** | false | 0.938 | row1 is not a repeating sub-header |
| pos-02 | 1 | false | false | 0.619 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-03 | 1 | false | false | 0.571 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-07 | 1 | false | false | 0.598 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-08 | 1 | false | false | 0.000 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.000 <= 0.5 |
| pos-12 | 1 | false | true | 0.938 | row0 is not a sparse group row |
| pos-14 | 1 | **true** | false | 0.000 | row1 is not a repeating sub-header; row2 numeric fraction 0.000 <= 0.5 |
| pos-18 | 1 | false | true | 0.985 | row0 is not a sparse group row |
| pos-21 | 1 | false | false | 0.920 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-22 | 1 | false | false | 0.400 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.400 <= 0.5 |
| pos-23 | 1 | false | false | 0.800 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-27 | 1 | false | false | 0.444 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.444 <= 0.5 |
| pos-28 | 1 | false | false | 0.500 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.500 <= 0.5 |
| pos-30 | 1 | false | false | 0.667 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-31 | 1 | false | false | 0.400 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.400 <= 0.5 |
| pos-32 | 1 | false | false | 0.933 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-34 | 1 | false | false | 0.571 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-35 | 1 | **true** | false | 0.000 | row1 is not a repeating sub-header; row2 numeric fraction 0.000 <= 0.5 |
| pos-38 | 1 | false | true | 0.879 | row0 is not a sparse group row |
| pos-39 | 1 | false | false | 0.875 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-40 | 1 | false | true | 0.977 | row0 is not a sparse group row |
| pos-41 | 1 | false | false | 0.964 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-43 | 1 | false | false | 0.550 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-44 | 1 | false | false | 0.417 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.417 <= 0.5 |
| pos-45 | 1 | false | false | 1.000 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-46 | 1 | false | false | 0.714 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-47 | 1 | false | true | 0.364 | row0 is not a sparse group row; row2 numeric fraction 0.364 <= 0.5 |
| pos-49 | 1 | false | false | 1.000 | row0 is not a sparse group row; row1 is not a repeating sub-header |
| pos-50 | 1 | false | false | 0.333 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.333 <= 0.5 |
| pos-51 | 1 | false | false | 0.053 | row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.053 <= 0.5 |

**The three sheets whose header row IS recognised as a sparse group row — pos-01, pos-14, pos-35 — all fail at the same conjunct.** `isRepeatingSubHeader(row1)` is false on every one. On pos-01 that is because row 1 is blank. This is one mechanism, not three, and it is the mechanism §16.4 leaves open.

### 3.2 — synthesised `Col N` headers, and which are band continuations

`prepStructure:185` writes `Col N` for every blank header cell. **A synthesised header is evidence of a spanning label only when a real header sits to its left**; one with nothing to its left cannot be a continuation of anything.

| pos | synthesised | of | at columns | leading orphans (no band possible) | spanning bands |
|---|---|---|---|---|---|
| pos-01 | 12 | 16 | 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15 | — | 3 |
| pos-14 | 9 | 17 | 2, 3, 4, 7, 8, 11, 12, 15, 16 | — | 4 |
| pos-32 | 1 | 15 | 0 | 0 | 0 |
| pos-35 | 22 | 29 | 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18 … | — | 4 |
| pos-43 | 2 | 80 | 10, 43 | — | 2 |
| pos-45 | 1 | 102 | 0 | 0 | 0 |

**6 of 30 deposits carry any synthesised header at all**; the other 24 have a fully populated header row. **pos-32, pos-45 carry a leading orphan** — a synthesised header at column 0 with no real header to its left, which is a blank first header cell rather than a band.

### 3.3 — the band maps

**4 of 30 deposits carry a spanning label. On the other 26 there is no spanning header** — every real header cell covers exactly one column — and that is stated here rather than left blank.

**pos-01 — `micro_data_compiled.xlsx` :: `1300-3`.** 3 spanning labels, widths 5 / 6 / 4 (**unequal**). 12 of 16 headers synthesised. `isSparseGroupRow(row0)` **true**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `Element` |
| 1–5 | 5 **span** | `Anhydrous MORB glass` |
| 6–11 | 6 **span** | `silicate part of the melt` |
| 12–15 | 4 **span** | `Metals` |

**pos-14 — `Rawdata_Figures_Tables_TSA.xlsx` :: `Figure 2`.** 4 spanning labels, widths 4 / 3 / 3 / 3 (**unequal**). 9 of 17 headers synthesised. `isSparseGroupRow(row0)` **true**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `A)` |
| 1–4 | 4 **span** | `gammaH2Ax Mean Gray Value` |
| 5–5 | 1 | `B)` |
| 6–8 | 3 **span** | `gammaH2Ax Mean Gray Value` |
| 9–9 | 1 | `C)` |
| 10–12 | 3 **span** | `Thresholded Mean Gray Value / Nucleus Area` |
| 13–13 | 1 | `D)` |
| 14–16 | 3 **span** | `Thresholded Mean Gray Value / Nucleus Area` |

**pos-35 — `AgeRelatedChangesInAcousticCues_data.csv` :: `AgeRelatedChangesInAcousticCues_data.csv`.** 4 spanning labels, widths 6 / 14 / 3 / 3 (**unequal**). 22 of 29 headers synthesised. `isSparseGroupRow(row0)` **true**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `Subject ID` |
| 1–1 | 1 | `Age` |
| 2–2 | 1 | `AgeGroup` |
| 3–8 | 6 **span** | `Hearing Thresholds` |
| 9–22 | 14 **span** | `ABR Metrics` |
| 23–25 | 3 **span** | `Digit Span` |
| 26–28 | 3 **span** | `Speech-in-Speech Recognition` |

**pos-43 — `Isoodon_data_raw_only.csv` :: `Isoodon_data_raw_only.csv`.** 2 spanning labels, widths 2 / 2 (**equal**). 2 of 80 headers synthesised. `isSparseGroupRow(row0)` **false**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `Count` |
| 1–1 | 1 | `Species name` |
| 2–2 | 1 | `Specimen #` |
| 3–3 | 1 | `notes` |
| 4–4 | 1 | `skin` |
| 5–5 | 1 | `Ear` |
| 6–6 | 1 | `Hind foot` |
| 7–7 | 1 | `Tail` |
| 8–8 | 1 | `Head-body` |
| 9–10 | 2 **span** | `Side` |
| 11–11 | 1 | `P1L` |
| 12–12 | 1 | `P1W` |
| 13–13 | 1 | `P2L` |
| 14–14 | 1 | `P2W` |
| 15–15 | 1 | `P3L` |
| 16–16 | 1 | `P3W` |
| 17–17 | 1 | `M1L` |
| 18–18 | 1 | `M1W` |
| 19–19 | 1 | `M2L` |
| 20–20 | 1 | `M2W` |
| 21–21 | 1 | `M3L` |
| 22–22 | 1 | `M3W` |
| 23–23 | 1 | `M4L` |
| 24–24 | 1 | `M4W` |
| 25–25 | 1 | `p1L` |
| 26–26 | 1 | `p1W` |
| 27–27 | 1 | `p2L` |
| 28–28 | 1 | `p2W` |
| 29–29 | 1 | `p3L` |
| 30–30 | 1 | `p3W` |
| 31–31 | 1 | `m1L` |
| 32–32 | 1 | `m1AW` |
| 33–33 | 1 | `m1PW` |
| 34–34 | 1 | `m2L` |
| 35–35 | 1 | `m2AW` |
| 36–36 | 1 | `m2PW` |
| 37–37 | 1 | `m3L` |
| 38–38 | 1 | `m3AW` |
| 39–39 | 1 | `m3PW` |
| 40–40 | 1 | `m4L` |
| 41–41 | 1 | `m4AW` |
| 42–43 | 2 **span** | `m4PW` |
| 44–44 | 1 | `onl` |
| 45–45 | 1 | `nl` |
| 46–46 | 1 | `anw` |
| 47–47 | 1 | `nps` |
| 48–48 | 1 | `pnw` |
| 49–49 | 1 | `rwi` |
| 50–50 | 1 | `ppw` |
| 51–51 | 1 | `iow` |
| 52–52 | 1 | `fs` |
| 53–53 | 1 | `zw` |
| 54–54 | 1 | `IL` |
| 55–55 | 1 | `aIL` |
| 56–56 | 1 | `apl` |
| 57–57 | 1 | `apw` |
| 58–58 | 1 | `Ipl` |
| 59–59 | 1 | `ppl` |
| 60–60 | 1 | `rwc` |
| 61–61 | 1 | `ctl` |
| 62–62 | 1 | `uPR` |
| 63–63 | 1 | `uMR` |
| 64–64 | 1 | `uML` |
| 65–65 | 1 | `oP3` |
| 66–66 | 1 | `bsl` |
| 67–67 | 1 | `bcl` |
| 68–68 | 1 | `bol` |
| 69–69 | 1 | `cw` |
| 70–70 | 1 | `pow` |
| 71–71 | 1 | `mw` |
| 72–72 | 1 | `Ipr` |
| 73–73 | 1 | `lmr` |
| 74–74 | 1 | `JL` |
| 75–75 | 1 | `JH` |
| 76–76 | 1 | `BH` |
| 77–77 | 1 | `BL` |
| 78–78 | 1 | `BW` |
| 79–79 | 1 | `saggital crest` |

**Equal widths are reported rather than omitted.** pos-43 carries equal-width spans, which §16 treats differently from unequal ones — a replicate set is equal-width by construction, so an equal-width span does not by itself rule out the pooled reading.

## 4 — the two gate objects

### 4.1 — `computeTrigger`, under the `replicates` answer

Read off `condCtx.groupingTrigger`, the field `extractAnalysisInputs` stamps at
`engine.js:174-178`. `scripts/corpus-run.mjs:247` hardcodes `colRelationship: 'replicates'`, so
**every figure in this section is a `replicates` figure by construction** (§13.4).

| pos | attempted | condCols | arm 1 (`≥3`) | arm 2 (thin/unusable) | pending | nGroups | median |
|---|---|---|---|---|---|---|---|
| pos-01 | false | 0 | false | false | false | — | — |
| pos-02 | true | 7 | **true** | false | **true** | 383 | 33 |
| pos-03 | true | 4 | **true** | **true** | **true** | 100 | 1 |
| pos-07 | true | 8 | **true** | **true** | **true** | 122 | 1 |
| pos-08 | true | 10 | **true** | **true** | **true** | 107 | 1 |
| pos-12 | false | 0 | false | false | false | — | — |
| pos-14 | false | 0 | false | false | false | — | — |
| pos-18 | true | 3 | **true** | false | **true** | 24 | 6 |
| pos-21 | true | 1 | false | false | false | 3 | 10 |
| pos-22 | true | 1 | false | false | false | 4 | 7.5 |
| pos-23 | false | 0 | false | false | false | — | — |
| pos-27 | true | 4 | **true** | **true** | **true** | 9 | 7 |
| pos-28 | true | 4 | **true** | **true** | **true** | 108 | 5 |
| pos-30 | true | 2 | false | false | false | 8 | 6 |
| pos-31 | true | 9 | **true** | **true** | **true** | 486 | 1 |
| pos-32 | true | 1 | false | false | false | 31 | 1227 |
| pos-34 | true | 5 | **true** | false | **true** | 74 | 15 |
| pos-35 | true | 1 | false | false | false | 2 | 42 |
| pos-38 | true | 2 | false | false | false | 4 | 83.5 |
| pos-39 | true | 1 | false | false | false | 4 | 36.5 |
| pos-40 | true | 6 | **true** | **true** | **true** | 34 | 154.5 |
| pos-41 | false | 0 | false | false | false | — | — |
| pos-43 | true | 4 | **true** | **true** | **true** | 167 | 1 |
| pos-44 | true | 6 | **true** | **true** | **true** | 35618 | 1 |
| pos-45 | false | 0 | false | false | false | — | — |
| pos-46 | true | 4 | **true** | false | **true** | 20 | 12.5 |
| pos-47 | true | 7 | **true** | **true** | **true** | 261 | 1 |
| pos-49 | false | 0 | false | false | false | — | — |
| pos-50 | true | 1 | false | **true** | **true** | 21 | 2 |
| pos-51 | true | 3 | **true** | **true** | **true** | 114 | 3 |

**Pending on 16 of 30**: pos-02, pos-03, pos-07, pos-08, pos-18, pos-27, pos-28, pos-31, pos-34, pos-40, pos-43, pos-44, pos-46, pos-47, pos-50, pos-51.

**Arm 1 without arm 2 on 4 — pos-02, pos-18, pos-34, pos-46.** Round 1 had none, and CLAUDE.md records the arm-1-only case as **unmeasured on any corpus and the one place confirming the grouping could still move a verdict**. Here it is measured. Each has three or more condition columns over a partition arm 2 does not also catch:

| pos | condCols | groups | median size | first sizes | valid rows | refuses? |
|---|---|---|---|---|---|---|
| pos-02 | 7 | 383 | 33 | [29,62,91,22,43,25,169,47] | 26532 | **yes** |
| pos-18 | 3 | 24 | 6 | [6,6,6,6,6,6,6,6] | 144 | no |
| pos-34 | 5 | 74 | 15 | [20,26,13,29,24,15,16,10] | 1232 | no |
| pos-46 | 4 | 20 | 12.5 | [8,17,11,23,23,9,5,15] | 264 | no |

**pos-02 refuses at the import floor, so 3 live instances remain: pos-18, pos-34, pos-46.** **This record does not price them.** Whether confirming moves anything on these deposits is an arm-B question and no arm has run.

Arm 2 without arm 1 fires on 1: pos-50.

### 4.2 — `suggestRowSemantics`

| pos | assay (source) | dataType | longFormat | `value` | `auto` | `reason` | headless fallback |
|---|---|---|---|---|---|---|---|
| pos-01 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-02 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-03 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-07 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-08 | proteomics (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-12 | survey (auto-detected) | ordinal | false | null | false | user-choice | `ordered` |
| pos-14 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-18 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-21 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-22 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-23 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-27 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-28 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-30 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-31 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-32 | physiological (auto-detected) | continuous | false | "ordered" | true | assay | `ordered` |
| pos-34 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-35 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-38 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-39 | physiological (auto-detected) | continuous | false | "ordered" | true | assay | `ordered` |
| pos-40 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-41 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-43 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-44 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-45 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-46 | qpcr (auto-detected) | continuous | false | "ordered" | true | assay | `ordered` |
| pos-47 | densitometry (auto-detected) | continuous | false | "ordered" | true | assay | `ordered` |
| pos-49 | physiological (auto-detected) | continuous | false | "ordered" | true | assay | `ordered` |
| pos-50 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |
| pos-51 | general (auto-detected) | continuous | false | null | false | user-choice | `ordered` |

**`value` is null on 25 of 30** — the `user-choice` case `rowSemantics.js:14` marks REQUIRED. On those, `ImportView.jsx:431` auto-applies nothing and `rowSemRequired` (`:441`) is true, while **`corpus-run.mjs:246-247` substitutes `'ordered'` for the null**. So on 25 deposits arm A answers row semantics by a fallback at exactly the point the shipped surface would demand a human answer. Recorded as a prep divergence on the row-semantics axis; it is not a new defect claim.

## 5 — §2.8, the group-attribute hold-out

`detectGroupAttributes` returns at `roles.js:90` when the sheet offers fewer than `MIN_ROWS_FOR_GROUPING = 50` rows. **It reached the pass on 26 of 30 and moved at least one column on 11.** "Did not move a column" and "did not look" are different findings and are separated here.

| pos | rows to the pass | reached it | grouping keys | columns moved | base vs shipped roles differ |
|---|---|---|---|---|---|
| pos-01 | 17 | **no** — floor 50 | 0 | 0 | 0 |
| pos-02 | 26532 | yes | 12 | 12 (3, 4, 5, 6, 7, 8, 11, 12, 13, 14 …) | 12 |
| pos-03 | 150 | yes | 1 | 1 (1) | 1 |
| pos-07 | 210 | yes | 2 | 2 (4, 86) | 2 |
| pos-08 | 1767 | yes | 12 | 1 (4) | 1 |
| pos-12 | 3420 | yes | 0 | 0 | 0 |
| pos-14 | 419 | yes | 0 | 0 | 0 |
| pos-18 | 144 | yes | 56 | 54 (9, 17, 19, 20, 27, 31, 32, 33, 34, 35 …) | 54 |
| pos-21 | 32 | **no** — floor 50 | 0 | 0 | 0 |
| pos-22 | 31 | **no** — floor 50 | 0 | 0 | 0 |
| pos-23 | 730 | yes | 0 | 0 | 0 |
| pos-27 | 127 | yes | 0 | 0 | 0 |
| pos-28 | 435 | yes | 3 | 4 (1, 3, 6, 9) | 4 |
| pos-30 | 46 | **no** — floor 50 | 0 | 0 | 0 |
| pos-31 | 486 | yes | 0 | 0 | 0 |
| pos-32 | 52588 | yes | 2 | 3 (1, 2, 14) | 3 |
| pos-34 | 1232 | yes | 0 | 0 | 0 |
| pos-35 | 86 | yes | 0 | 0 | 0 |
| pos-38 | 311 | yes | 0 | 0 | 0 |
| pos-39 | 146 | yes | 0 | 0 | 0 |
| pos-40 | 33678 | yes | 0 | 0 | 0 |
| pos-41 | 109228 | yes | 0 | 0 | 0 |
| pos-43 | 873 | yes | 2 | 1 (8) | 1 |
| pos-44 | 52948 | yes | 5 | 4 (3, 4, 5, 6) | 4 |
| pos-45 | 101 | yes | 0 | 0 | 0 |
| pos-46 | 264 | yes | 0 | 0 | 0 |
| pos-47 | 760 | yes | 1 | 2 (2, 3) | 2 |
| pos-49 | 1857 | yes | 4 | 3 (1, 2, 3) | 3 |
| pos-50 | 147 | yes | 0 | 0 | 0 |
| pos-51 | 571 | yes | 0 | 0 | 0 |

**Below the floor on 4**: pos-01 (17 rows), pos-21 (32 rows), pos-22 (31 rows), pos-30 (46 rows). Those are **non-instances by the floor** and carry no evidence either way about whether the hold-out would fire on a longer version of the same design.

## 6 — the import floor

**3 of 30 carry fewer than 2 data columns and refuse at `ImportView.jsx:974`** — pos-02, pos-44, pos-47. No other deposit is near the floor. Their structure is read on the same terms as the rest; **the refusal is arm B's outcome, not a reason to skip the read** (§14.3), and no gate answer is owed for them.

| pos | data columns | §2.8 moved | without the hold-out | condition cols | attribute cols |
|---|---|---|---|---|---|
| pos-02 | **1** | 12 | 13 | 7 | 12 |
| pos-44 | **1** | 4 | 5 | 6 | 4 |
| pos-47 | **1** | 2 | 3 | 7 | 2 |

**§15.1's figures reproduce independently here.** It records the three as carrying 13, 5 and 3 data
columns without the hold-out; measured, pos-02 → 13, pos-44 → 5, pos-47 → 3. **Any structural reason of the form *this file holds one measurement* is false** — the product removed the others.

## 7 — the row partition

`slices()` pre-filters at 3 rows, so a singleton count taken from its output is structurally zero.
Both are reported: the full partition from `rowGroupsStatus()`, and the survivors from `slices()`.

| pos | `condCtx.type` | groups | singletons | surviving slices | dropped by the filter |
|---|---|---|---|---|---|
| pos-01 | none | 0 | 0 | 1 | 0 |
| pos-02 | row-grouped | 383 | 0 | 383 | 0 |
| pos-03 | row-grouped | 100 | 59 | 7 | 93 |
| pos-07 | row-grouped | 122 | 83 | 22 | 100 |
| pos-08 | row-grouped | 107 | 103 | 4 | 103 |
| pos-12 | none | 0 | 0 | 1 | 0 |
| pos-14 | none | 0 | 0 | 1 | 0 |
| pos-18 | row-grouped | 24 | 0 | 24 | 0 |
| pos-21 | row-grouped | 3 | 0 | 3 | 0 |
| pos-22 | row-grouped | 4 | 0 | 4 | 0 |
| pos-23 | none | 0 | 0 | 1 | 0 |
| pos-27 | row-grouped | 9 | 0 | 7 | 2 |
| pos-28 | row-grouped | 108 | 7 | 87 | 21 |
| pos-30 | row-grouped | 8 | 0 | 8 | 0 |
| pos-31 | row-grouped | 486 | 486 | 0 | 486 |
| pos-32 | row-grouped | 31 | 0 | 31 | 0 |
| pos-34 | row-grouped | 74 | 0 | 74 | 0 |
| pos-35 | row-grouped | 2 | 0 | 2 | 0 |
| pos-38 | row-grouped | 4 | 0 | 4 | 0 |
| pos-39 | row-grouped | 4 | 0 | 4 | 0 |
| pos-40 | row-grouped | 34 | 1 | 33 | 1 |
| pos-41 | none | 0 | 0 | 1 | 0 |
| pos-43 | row-grouped | 167 | 93 | 44 | 123 |
| pos-44 | row-grouped | 35618 | 23675 | 3803 | 31815 |
| pos-45 | none | 0 | 0 | 1 | 0 |
| pos-46 | row-grouped | 20 | 0 | 20 | 0 |
| pos-47 | row-grouped | 261 | 238 | 18 | 243 |
| pos-49 | none | 0 | 0 | 1 | 0 |
| pos-50 | row-grouped | 21 | 8 | 8 | 13 |
| pos-51 | row-grouped | 114 | 20 | 74 | 40 |

**pos-31 partitions into 486 groups, every one a singleton, and `slices()` returns 0.** §15.3 confirmed as a recorded outcome, not an error: the file imports, the gates render, and no group-based test can run on it.

Heaviest loss to the 3-row filter is pos-44, 31815 of 35618 groups dropped.

**0 deposits read `column-grouped`**, 23 read `row-grouped` and 7 read `none`. That is a `replicates` figure; under the `conditions` answer the classification changes.

## 8 — is the last data row a column total?

One derived check, run because it found something on position 1. For each sheet the last matrix
row is compared to the column-wise sum of the rows above it. **The number is reported and not
classified**: an exact match would prove a live formula, and a small residual is equally consistent
with a total reported at a precision the rounded cells above cannot reproduce.

| pos | columns compared | exact to 1e-6 | max absolute residual | max relative residual | at column |
|---|---|---|---|---|---|
| pos-01 | 15 | 0 | 2.913e-2 | 3.008e-4 | 13 |
| pos-02 | 1 | 0 | 1.666e+9 | 7.577e+3 | 0 |
| pos-03 | 2 | 0 | 1.193e+4 | 1.226e+2 | 1 |
| pos-07 | 68 | 0 | 2.042e+5 | 8.669e+4 | 50 |
| pos-08 | 3 | 0 | 2.111e+4 | 2.111e+4 | 0 |
| pos-12 | 15 | 0 | 7.263e+4 | 6.202e+4 | 14 |
| pos-14 | 2 | 0 | 1.348e+5 | 9.521e+2 | 6 |
| pos-18 | 147 | 0 | 1.926e+4 | 1.660e+2 | 88 |
| pos-21 | 23 | 0 | 2.856e+9 | 4.064e+2 | 17 |
| pos-22 | 2 | 0 | 4.745e+3 | 3.316e+1 | 0 |
| pos-23 | 4 | 0 | 1.961e+5 | 7.367e+2 | 1 |
| pos-27 | 3 | 0 | 7.432e+5 | 1.348e+2 | 0 |
| pos-28 | 4 | 0 | 2.895e+3 | 7.170e+2 | 1 |
| pos-30 | 6 | 0 | 8.239e+3 | 4.364e+1 | 0 |
| pos-31 | 6 | 0 | 2.958e+4 | 4.814e+2 | 1 |
| pos-32 | 10 | 0 | 1.064e+8 | 1.054e+5 | 7 |
| pos-34 | 7 | 0 | 4.110e+4 | 2.563e+3 | 4 |
| pos-35 | 27 | 0 | 6.338e+3 | 1.553e+2 | 14 |
| pos-38 | 28 | 2 | 6.245e+5 | 3.085e+2 | 0 |
| pos-39 | 14 | 0 | 2.829e+6 | 9.144e+2 | 2 |
| pos-40 | 416 | 0 | 1.228e+4 | 6.128e+2 | 122 |
| pos-41 | 3 | 0 | 1.366e+12 | 1.486e+5 | 1 |
| pos-43 | 3 | 0 | 2.069e+4 | 2.378e+2 | 2 |
| pos-44 | 1 | 0 | 1.261e+7 | 1.111e+4 | 0 |
| pos-45 | 102 | 0 | 8.718e+5 | 1.320e+3 | 70 |
| pos-46 | 15 | 0 | 4.230e+3 | 6.098e+2 | 3 |
| pos-47 | 1 | 0 | 1.171e+3 | 1.952e+2 | 0 |
| pos-49 | 5 | 0 | 1.407e+4 | 1.192e+5 | 2 |
| pos-50 | 3 | 0 | 2.465e+6 | 1.823e+2 | 2 |
| pos-51 | 4 | 0 | 1.000e+4 | 5.496e+2 | 0 |

**pos-01 stands alone.** Its largest relative residual is 3.008e-4; the smallest among the other 29 is 3.316e+1 on pos-22. On every other deposit the last row is plainly not a column total, and the check is a clean negative.

**One refinement of `S395-POS01-STRUCTURE.md` §3, named rather than edited in place.** That section reported pos-01's residual as 2.913e-2 absolute and 2.91e-4 "as a fraction of the reported total", using a nominal denominator of 100. The per-column relative figure computed here is **3.008e-4**, at column 13. Same magnitude, a stricter denominator; §3's absolute figure is unchanged and neither statement was wrong.

## 9 — what the prep removed before role inference ran

Two different strips, and they are not the same pass. `preprocessRaw` removes sparse rows from the
**top** (`skippedRows`) and the **bottom** (`trimmedRows`) and may drop near-empty **columns**;
it publishes all three itself. `prepStructure:171-174` then strips further preamble rows inline and
publishes nothing, so that count is derived as block rows minus header rows minus data rows.

| pos | `skippedRows` (top) | `trimmedRows` (bottom) | columns removed | further preamble strip | blank rows in `data` | rows dropped by `extractAnalysisInputs` |
|---|---|---|---|---|---|---|
| pos-01 | 3 | 0 | 0 | 0 | 1 | 1 |
| pos-02 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-03 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-07 | 0 | 1 | 4 (87, 88, 89, 90) | 0 | 0 | 0 |
| pos-08 | 0 | 0 | 8 (17, 21, 23, 37, 39, 41, 43, 45) | 0 | 0 | 102 |
| pos-12 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-14 | 0 | 20 | 3 (5, 10, 15) | 0 | 0 | 2 |
| pos-18 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-21 | 0 | 2 | 0 | 0 | 0 | 0 |
| pos-22 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-23 | 1 | 734 | 0 | 0 | 0 | 0 |
| pos-27 | 0 | 48 | 9 (9, 10, 11, 12, 13, 14, 15, 16, 17) | 0 | 0 | 0 |
| pos-28 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-30 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-31 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-32 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-34 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-35 | 0 | 1 | 0 | 0 | 0 | 2 |
| pos-38 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-39 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-40 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-41 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-43 | 0 | 50 | 0 | 0 | 0 | 164 |
| pos-44 | 0 | 1 | 0 | 0 | 0 | 8 |
| pos-45 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-46 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-47 | 0 | 0 | 0 | 0 | 0 | 0 |
| pos-49 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-50 | 0 | 1 | 0 | 0 | 0 | 0 |
| pos-51 | 0 | 0 | 0 | 0 | 0 | 1 |

**Bottom trims worth naming**: pos-23 (734 rows), pos-43 (50 rows), pos-27 (48 rows), pos-14 (20 rows). pos-23 loses 734 of its 2199 raw rows to the bottom trim alone.

**Column drops**: pos-07 (4), pos-08 (8), pos-14 (3), pos-27 (9). A dropped column shifts every column index to its right, so the indices in §11 are post-drop.

## 10 — two instrument faults, recorded rather than quietly fixed

Both were the probe reading something adjacent to its subject, and both would have shipped a wrong
table. Recorded under the standing rule that *a check that cannot reach its subject returns green*.

1. **The receipt is per FILE, not per position.** 199 entries over 39 positions, up to 54 files in
   one deposit. A `find(r => r.position === POS)` returns the deposit's first file, which is not the
   one §6.2 chose — and that read produced **12 false "disagreements"** before it was caught. The
   check now matches on file as well, and verifies `sha256` and byte size.
2. **The run-log parser matched §3's enumeration table, not §4's.** §3's rows also open with a bare
   integer, so an unscoped search found one first; on pos-01 it returned file `"2026-08-28"`. The
   parse is now scoped between the `## 4 —` and `## 5 —` headings.

## 11 — the deposits

One section per deposit, ascending. 1,310 columns in total across the 30.

**Per-column fields.** `numeric` / `non-numeric` / `missing` use the shipped predicates verbatim —
missing is `v == null || v === ''` (`inferBaseRoles:35`), numeric is `!isNaN(Number(v))` (`:37`) —
so a literal `NA` is non-numeric, not missing. Counts are over `data`, the post-header rows.
`d≤40` is the distinct count over the forty rows `inferBaseRoles` actually decides on.

**Where a sheet exceeds 40 columns the table carries every non-`data` column, every column §2.8 moved, and the first five and last three `data` columns as exemplars; the remaining `data` columns are rolled up in a stated line rather than silently dropped.**

### pos-01 — `micro_data_compiled.xlsx` :: `1300-3`

**control** — already recorded at `S395-POS01-STRUCTURE.md` · **3 spanning bands**

doi:10.5061/dryad.fttdz0980 · sheet **7 of 7** (`sheetIndex` 6, 0-based) · 1 file in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Initial MORB` · `sha256` `a79bb8cbdd1b601c…` matches the receipt · 0.03 MB · 0.2 s.

| | | | |
|---|---|---|---|
| raw | 21 × 16 | `detectHeaderRows` | **1** |
| after prep | 17 data rows × 16 cols | `condPerCol` | `null` |
| matrix | 16 × 15 | `condCtx.type` | `none` |
| roles C/L/D/A/I | 0/1/15/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 12 of 16 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` **true** · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.938. Failed: row1 is not a repeating sub-header.

**Bands.** 3 spanning labels, widths 5 / 6 / 4 — **unequal**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `Element` |
| 1–5 | 5 **span** | `Anhydrous MORB glass` |
| 6–11 | 6 **span** | `silicate part of the melt` |
| 12–15 | 4 **span** | `Metals` |

**§2.8.** **Did not look.** The pass received 17 rows against `MIN_ROWS_FOR_GROUPING = 50` and returned at `roles.js:90` before evaluating a candidate — a non-instance by the floor, carrying no evidence about a longer version of the same design.

**`computeTrigger`** (`replicates`): `{"attempted":false,"nGroups":null,"sizes":[],"median":null,"condCols":0,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 0 >= 3` → **false**; arm 2 → **false**; pending → **false**. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 0 groups, 0 singletons, 1 surviving `slices()`.

**Prep.** `preprocessRaw` skipped 3 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. 1 blank row survives into `data` (index 0); `extractAnalysisInputs` dropped 1 row.

**Last row against the column sums above it.** 15 columns compared, 0 exact to 1e-6, max absolute residual 2.913e-2, max relative 3.008e-4 at column 13. Reported, not classified.

**Window.** 17 data rows against the 40-row window, so the window **is the whole column** on every one — P217 cannot misrepresent this sheet.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Element` | — | label | 0 | 16 | 1 | 16 | 16 | 0.00 | not moved |
| 1 | `Anhydrous MORB glass` | — | data | 16 | 0 | 1 | 15 | 15 | 1.00 | not moved |
| 2 | `Col 3` *(synth)* | `Anhydrous MORB glass` | data | 16 | 0 | 1 | 16 | 16 | 1.00 | not moved |
| 3 | `Col 4` *(synth)* | `Anhydrous MORB glass` | data | 16 | 0 | 1 | 15 | 15 | 1.00 | not moved |
| 4 | `Col 5` *(synth)* | `Anhydrous MORB glass` | data | 16 | 0 | 1 | 15 | 15 | 1.00 | not moved |
| 5 | `Col 6` *(synth)* | `Anhydrous MORB glass` | data | 16 | 0 | 1 | 15 | 15 | 1.00 | not moved |
| 6 | `silicate part of the melt` | — | data | 16 | 0 | 1 | 16 | 16 | 1.00 | not moved |
| 7 | `Col 8` *(synth)* | `silicate part of the melt` | data | 16 | 0 | 1 | 16 | 16 | 1.00 | not moved |
| 8 | `Col 9` *(synth)* | `silicate part of the melt` | data | 16 | 0 | 1 | 16 | 16 | 1.00 | not moved |
| 9 | `Col 10` *(synth)* | `silicate part of the melt` | data | 16 | 0 | 1 | 16 | 16 | 1.00 | not moved |
| 10 | `Col 11` *(synth)* | `silicate part of the melt` | data | 16 | 0 | 1 | 15 | 15 | 1.00 | not moved |
| 11 | `Col 12` *(synth)* | `silicate part of the melt` | data | 16 | 0 | 1 | 16 | 16 | 1.00 | not moved |
| 12 | `Metals` | — | data | 16 | 0 | 1 | 14 | 14 | 1.00 | not moved |
| 13 | `Col 14` *(synth)* | `Metals` | data | 16 | 0 | 1 | 15 | 15 | 1.00 | not moved |
| 14 | `Col 15` *(synth)* | `Metals` | data | 16 | 0 | 1 | 15 | 15 | 1.00 | not moved |
| 15 | `Col 16` *(synth)* | `Metals` | data | 16 | 0 | 1 | 14 | 14 | 1.00 | not moved |

### pos-02 — `os_cells_new.csv` :: `os_cells_new.csv`

**refuses at `ImportView.jsx:974`** — no gate answer owed (§14.3) · **arm 1 without arm 2**

doi:10.5061/dryad.rv15dv4q9 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `os_cells_new.csv` · `sha256` `90cc58be8c36ed05…` matches the receipt · 4.27 MB · 0.5 s.

| | | | |
|---|---|---|---|
| raw | 26533 × 21 | `detectHeaderRows` | **1** |
| after prep | 26532 data rows × 21 cols | `condPerCol` | `null` |
| matrix | 26532 × 1 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 7/1/1/12/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 21 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.619. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 26532 rows and **moved 12 columns** via 12 grouping keys: `collection_no` (col 0, 1149 levels → 12); `paleolng` (col 7, 655 levels → 3); `paleolat` (col 8, 655 levels → 3); `short` (col 10, 6 levels → 5); `bottom` (col 11, 6 levels → 4); `mid` (col 12, 6 levels → 4); and 6 more.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":383,"sizes":[29,62,91,22,43,25,169,47,686,422,24,84,29,30,56,183,123,49,67,116,23,417,356,40,14,114,100,205,83,93,54,57,31,55,11,68,11,59,11,101,220,144,123,24,60,76,65,39,28,19,50,32,47,227,33,94,36,133,26,45,19,13,65,26,30,16,31,26,53,91,122,108,195,91,12,156,12,37,126,43,62,191,122,113,86,33,31,22,168,323,24,64,64,19,11,19,146,18,13,110,20,12,11,16,44,13,12,20,16,173,47,11,48,94,102,34,115,272,16,80,27,27,224,18,18,26,17,59,146,91,209,14,30,31,42,14,12,37,27,15,108,32,153,14,329,74,80,78,160,172,222,113,36,20,86,222,23,60,17,86,183,13,13,132,1143,19,13,22,27,110,145,58,479,36,253,90,56,283,44,54,35,41,158,308,36,21,11,16,19,24,28,32,41,136,89,15,45,22,161,17,11,11,18,14,12,14,15,167,13,15,14,33,11,42,15,43,13,14,29,16,16,15,525,61,207,199,367,54,195,110,11,47,44,20,15,440,19,38,33,26,16,12,48,17,14,53,11,12,14,14,94,47,176,219,12,11,11,39,14,11,12,22,26,35,33,404,21,11,11,15,55,11,127,128,60,110,23,47,12,45,46,46,44,16,112,17,33,25,114,30,279,11,101,13,24,12,102,30,86,77,61,67,13,16,28,119,15,84,56,11,17,99,48,70,79,12,36,14,11,29,29,11,11,16,35,11,31,37,49,34,15,44,12,42,204,21,36,25,28,23,29,22,49,22,11,22,18,72,122,24,11,11,13,28,26,11,11,27,15,29,12,28,18,110,21,36,29,21,47,133,43,11,12,20,22,13,21,21,18,12,11,11,12],"median":33,"condCols":7,"arm1":true,"arm2":false,"pending":true}`. Arm 1 `condCols 7 >= 3` → **true**; arm 2 → **false**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 383 groups, 0 singletons, 383 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 1 column compared, 0 exact to 1e-6, max absolute residual 1.666e+9, max relative 7.577e+3 at column 0. Reported, not classified.

**Window.** 26532 data rows against the 40-row window, so the window is a **strict sample**; 21 of 21 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `collection_no` | — | data | 26532 | 0 | 0 | 1149 | 2 | 1.00 | not moved |
| 1 | `genus2` | — | label | 0 | 26532 | 0 | 2474 | 35 | 0.00 | not moved |
| 2 | `geoplate_rev_com` | — | condition | 0 | 26532 | 0 | 21 | 1 | 0.00 | not moved |
| 3 | `paleolatOld` | — | attribute *(was data)* | 26424 | 108 | 0 | 622 | 2 | 1.00 | moved — const within col 0 `collection_no` |
| 4 | `paleolngOld` | — | attribute *(was data)* | 26424 | 108 | 0 | 670 | 2 | 1.00 | moved — const within col 0 `collection_no` |
| 5 | `lat` | — | attribute *(was data)* | 26532 | 0 | 0 | 563 | 2 | 1.00 | moved — const within col 8 `paleolat` |
| 6 | `lng` | — | attribute *(was data)* | 26532 | 0 | 0 | 604 | 2 | 1.00 | moved — const within col 8 `paleolat` |
| 7 | `paleolng` | — | attribute *(was data)* | 26532 | 0 | 0 | 655 | 2 | 1.00 | moved — const within col 8 `paleolat` |
| 8 | `paleolat` | — | attribute *(was data)* | 26532 | 0 | 0 | 655 | 2 | 1.00 | moved — const within col 7 `paleolng` |
| 9 | `series` | — | condition | 0 | 26532 | 0 | 2 | 1 | 0.00 | not moved |
| 10 | `short` | — | condition | 0 | 26532 | 0 | 6 | 1 | 0.00 | not moved |
| 11 | `bottom` | — | attribute *(was data)* | 26532 | 0 | 0 | 6 | 1 | 1.00 | moved — const within col 20 `formation` |
| 12 | `mid` | — | attribute *(was data)* | 26532 | 0 | 0 | 6 | 1 | 1.00 | moved — const within col 20 `formation` |
| 13 | `top` | — | attribute *(was data)* | 26532 | 0 | 0 | 6 | 1 | 1.00 | moved — const within col 20 `formation` |
| 14 | `dur` | — | attribute *(was data)* | 26532 | 0 | 0 | 6 | 1 | 1.00 | moved — const within col 20 `formation` |
| 15 | `stg` | — | attribute *(was data)* | 26532 | 0 | 0 | 6 | 1 | 1.00 | moved — const within col 20 `formation` |
| 16 | `cell5` | — | condition | 0 | 26532 | 0 | 45 | 2 | 0.00 | not moved |
| 17 | `cell9` | — | condition | 0 | 26532 | 0 | 72 | 2 | 0.00 | not moved |
| 18 | `early_com_stage` | — | condition | 0 | 26532 | 0 | 8 | 1 | 0.00 | not moved |
| 19 | `bin` | — | attribute *(was data)* | 25352 | 1180 | 0 | 8 | 1 | 1.00 | moved — const within col 20 `formation` |
| 20 | `formation` | — | condition | 0 | 26532 | 0 | 312 | 2 | 0.00 | not moved |

### pos-03 — `OpilionesChemicalCues_v2(data).csv` :: `OpilionesChemicalCues_v2(data).csv`

doi:10.5061/dryad.4mw6m90r1 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `OpilionesChemicalCues_v2(data).csv` · `sha256` `348622a4d04eb32a…` matches the receipt · 0.01 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 152 × 7 | `detectHeaderRows` | **1** |
| after prep | 150 data rows × 7 cols | `condPerCol` | `null` |
| matrix | 150 × 2 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 4/0/2/1/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 7 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.571. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 150 rows and **moved 1 column** via 1 grouping key: `Group` (col 0, 31 levels → 1).

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":100,"sizes":[3,1,1,1,2,1,1,1,2,1,1,1,2,1,2,1,1,2,1,2,1,2,1,1,2,1,2,2,2,1,3,1,2,2,1,2,1,1,1,1,1,1,1,2,2,1,2,1,2,2,1,1,2,2,2,1,2,1,1,1,1,4,1,2,2,1,4,1,2,3,1,1,1,1,3,2,1,1,2,2,3,1,1,1,2,2,2,1,1,2,1,2,1,1,1,1,1,1,1,1],"median":1,"condCols":4,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 4 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 100 groups, 59 singletons, 7 surviving `slices()` (93 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 2 columns compared, 0 exact to 1e-6, max absolute residual 1.193e+4, max relative 1.226e+2 at column 1. Reported, not classified.

**Window.** 150 data rows against the 40-row window, so the window is a **strict sample**; 5 of 7 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Group` | — | condition | 150 | 0 | 0 | 31 | 20 | 1.00 | not moved |
| 1 | `Number_of_individuals` | — | attribute *(was data)* | 150 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 0 `Group` |
| 2 | `Individual_ID` | — | data | 150 | 0 | 0 | 150 | 40 | 1.00 | not moved |
| 3 | `Species` | — | condition | 0 | 150 | 0 | 2 | 2 | 0.00 | not moved |
| 4 | `Leg_condition` | — | condition | 0 | 150 | 0 | 2 | 1 | 0.00 | not moved |
| 5 | `Number_of_legs` | — | data | 150 | 0 | 0 | 5 | 3 | 1.00 | not moved |
| 6 | `Choice` | — | condition | 0 | 150 | 0 | 2 | 1 | 0.00 | not moved |

### pos-07 — `data_complete.csv` :: `data_complete.csv`

doi:10.5061/dryad.hqbzkh1vv · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 19 files in the deposit, §6.2 decided by tie-break 3: file name ascending · `SheetNames[0]` `data_complete.csv` · `sha256` `ff3e4990ac378c49…` matches the receipt · 0.17 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 212 × 91 | `detectHeaderRows` | **1** |
| after prep | 210 data rows × 87 cols | `condPerCol` | `null` |
| matrix | 210 × 74 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 8/2/74/2/1 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 87 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.598. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 210 rows and **moved 2 columns** via 2 grouping keys: `Prep_article` (col 5, 40 levels → 1); `Climat_given_article` (col 6, 32 levels → 1).

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":122,"sizes":[2,3,2,7,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,1,1,3,7,1,1,1,1,3,3,3,6,1,1,3,1,2,1,1,1,1,2,2,2,2,2,1,9,8,1,1,5,1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,3,1,1,1,1,1,1,3,3,1,1,2,1,1,1,1,1,1,1,3,2,1,1,1,1,2,1,2,1,1,6,1,1,3,1,3,1,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,1],"median":1,"condCols":8,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 8 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 122 groups, 83 singletons, 22 surviving `slices()` (100 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom, and removed 4 near-empty columns (87, 88, 89, 90). `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 68 columns compared, 0 exact to 1e-6, max absolute residual 2.042e+5, max relative 8.669e+4 at column 50. Reported, not classified.

**Window.** 210 data rows against the 40-row window, so the window is a **strict sample**; 83 of 87 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `REF` | — | label | 0 | 210 | 0 | 210 | 40 | 0.00 | not moved |
| 1 | `Unit` | — | condition | 0 | 210 | 0 | 2 | 2 | 0.00 | not moved |
| 2 | `Detrend_method` | — | condition | 0 | 210 | 0 | 7 | 2 | 0.00 | not moved |
| 3 | `Country` | — | condition | 0 | 210 | 0 | 25 | 9 | 0.00 | not moved |
| 4 | `T_article` | — | attribute *(was data)* | 33 | 76 | 101 | 40 | 9 | 0.62 | moved — const within col 6 `Climat_given_article` |
| 5 | `Prep_article` | — | data | 74 | 14 | 122 | 40 | 11 | 0.81 | not moved |
| 6 | `Climat_given_article` | — | label | 0 | 102 | 108 | 32 | 3 | 0.00 | not moved |
| 7 | `Koppen-Geiger` | — | condition | 0 | 210 | 0 | 12 | 4 | 0.00 | not moved |
| 8 | `Species` | — | condition | 0 | 210 | 0 | 54 | 9 | 0.00 | not moved |
| 9 | `G_A` | — | condition | 0 | 210 | 0 | 2 | 2 | 0.00 | not moved |
| 10 | `our_class_drought_resistance` | — | condition | 0 | 209 | 1 | 3 | 3 | 0.00 | not moved |
| 11 | `niche_global` | — | condition | 0 | 196 | 14 | 3 | 3 | 0.00 | not moved |
| 12 | `MAT` | — | data | 208 | 0 | 2 | 98 | 18 | 1.00 | not moved |
| 13 | `MAPv` | — | data | 208 | 0 | 2 | 97 | 16 | 1.00 | not moved |
| 14 | `MAP` | — | data | 208 | 0 | 2 | 96 | 16 | 1.00 | not moved |
| 15 | `Aridity_index_3_month` | — | data | 190 | 0 | 20 | 92 | 16 | 1.00 | not moved |
| 82 | `2015` | — | data | 60 | 0 | 150 | 60 | 3 | 1.00 | not moved |
| 83 | `2016` | — | data | 42 | 0 | 168 | 42 | 2 | 1.00 | not moved |
| 84 | `2017` | — | data | 30 | 0 | 180 | 30 | 3 | 1.00 | not moved |
| 85 | `2018` | — | ignore | 21 | 0 | 189 | 21 | 0 | — | not moved |
| 86 | `2019` | — | attribute *(was data)* | 11 | 0 | 199 | 11 | 1 | 1.00 | moved — const within col 5 `Prep_article` |

**66 further `data` columns are rolled up rather than listed** (columns 16–81, non-contiguous where an exemplar was kept). Across them: numeric 89–194, non-numeric 0–0, missing 16–121, distinct 89–182, distinct≤40 7–25. 0 carry any non-numeric cell; 66 have a strict-sample window; 0 were moved by §2.8. **Every non-`data` column and every §2.8-moved column of this sheet is listed above, so nothing anomalous is inside this roll-up.**

### pos-08 — `ECS-SA_(Affinity).xlsx` :: `Protein-Peptide Info`

doi:10.5061/dryad.djh9w0wf0 · sheet **1 of 3** (`sheetIndex` 0, 0-based) · 6 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Protein-Peptide Info` · `sha256` `d0a6708e4486e634…` matches the receipt · 0.23 MB · 0.3 s.

| | | | |
|---|---|---|---|
| raw | 1768 × 46 | `detectHeaderRows` | **1** |
| after prep | 1767 data rows × 38 cols | `condPerCol` | `null` |
| matrix | 1665 × 15 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 10/12/15/1/0 | assay · dataType | proteomics (auto-detected) · continuous |
| synthesised headers | 0 of 38 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.000. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.000 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 1767 rows and **moved 1 column** via 12 grouping keys: `Found in Sample Group: [S1] F1: Sample` (col 22, 3 levels → 1); `Found in Sample Group: [S2] F2: Sample` (col 23, 3 levels → 1); `Found in Sample Group: [S3] F3: Sample` (col 24, 3 levels → 1); `Found in Sample Group: [S5] F5: Sample` (col 26, 3 levels → 1); `Found in Sample Group: [S6] F6: Sample` (col 27, 3 levels → 1); `Found in Sample Group: [S7] F7: Sample` (col 28, 3 levels → 1); and 6 more.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":107,"sizes":[1,1338,1,1,199,1,22,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"median":1,"condCols":10,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 10 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 107 groups, 103 singletons, 4 surviving `slices()` (103 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom, and removed 8 near-empty columns (17, 21, 23, 37, 39, 41, 43, 45). `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 102 rows.

**Last row against the column sums above it.** 3 columns compared, 0 exact to 1e-6, max absolute residual 2.111e+4, max relative 2.111e+4 at column 0. Reported, not classified.

**Window.** 1767 data rows against the 40-row window, so the window is a **strict sample**; 35 of 38 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Accession` | — | label | 0 | 102 | 1665 | 102 | 4 | 0.00 | not moved |
| 1 | `Description` | — | label | 0 | 1767 | 0 | 1016 | 30 | 0.00 | not moved |
| 2 | `# PSMs` | — | label | 102 | 1228 | 437 | 449 | 24 | 0.13 | not moved |
| 3 | `Score Sequest HT: Sequest HT` | — | condition | 102 | 1665 | 0 | 104 | 6 | 0.10 | not moved |
| 4 | `Exp. q-value: Combined` | — | attribute *(was data)* | 1665 | 102 | 0 | 55 | 14 | 0.93 | moved — const within col 35 `Gln->pyro-Glu (Q) Count` |
| 5 | `# Unique Peptides` | — | data | 1665 | 102 | 0 | 80 | 21 | 0.93 | not moved |
| 6 | `# Peptides` | — | label | 102 | 1665 | 0 | 959 | 28 | 0.10 | not moved |
| 7 | `Protein FDR Confidence: Combined` | — | label | 1563 | 204 | 0 | 1097 | 35 | 0.82 | not moved |
| 8 | `Sum PEP Score` | — | data | 1665 | 102 | 0 | 106 | 8 | 0.93 | not moved |
| 9 | `Coverage [%]` | — | data | 1665 | 102 | 0 | 441 | 37 | 0.93 | not moved |
| 10 | `MW [kDa]` | — | label | 102 | 1665 | 0 | 1071 | 28 | 0.10 | not moved |
| 11 | `# Protein Groups` | — | label | 102 | 1665 | 0 | 1033 | 25 | 0.10 | not moved |
| 12 | `Marked as` | — | condition | 0 | 407 | 1360 | 4 | 3 | 0.00 | not moved |
| 13 | `Abundance: 20:1 NR : Sample` | — | condition | 98 | 1665 | 4 | 101 | 6 | 0.10 | not moved |
| 14 | `Abundance: 20:1 R: Sample` | — | data | 100 | 0 | 1667 | 100 | 4 | 1.00 | not moved |
| 15 | `Abundance: 40:1 NR: Sample` | — | data | 91 | 0 | 1676 | 91 | 4 | 1.00 | not moved |
| 16 | `Abundance: 40:1 R: Sample` | — | data | 101 | 0 | 1666 | 101 | 4 | 1.00 | not moved |
| 17 | `Abundance: 60:1 R: Sample` | — | data | 101 | 0 | 1666 | 101 | 4 | 1.00 | not moved |
| 18 | `Abundance: 80:1 NR: Sample` | — | data | 99 | 0 | 1668 | 98 | 4 | 1.00 | not moved |
| 19 | `Abundance: 80:1 R: Sample` | — | data | 102 | 0 | 1665 | 102 | 4 | 1.00 | not moved |
| 20 | `Abundance: 100:1 R: Sample` | — | data | 99 | 0 | 1668 | 99 | 4 | 1.00 | not moved |
| 21 | `Abundance: 120:1 R: Sample` | — | data | 101 | 0 | 1666 | 101 | 4 | 1.00 | not moved |
| 22 | `Found in Sample Group: [S1] F1: Sample` | — | condition | 0 | 102 | 1665 | 3 | 1 | 0.00 | not moved |
| 23 | `Found in Sample Group: [S2] F2: Sample` | — | condition | 0 | 102 | 1665 | 3 | 1 | 0.00 | not moved |
| 24 | `Found in Sample Group: [S3] F3: Sample` | — | label | 0 | 102 | 1665 | 3 | 2 | 0.00 | not moved |
| 25 | `Found in Sample Group: [S4] F4: Sample` | — | condition | 0 | 102 | 1665 | 3 | 1 | 0.00 | not moved |
| 26 | `Found in Sample Group: [S5] F5: Sample` | — | label | 0 | 102 | 1665 | 3 | 2 | 0.00 | not moved |
| 27 | `Found in Sample Group: [S6] F6: Sample` | — | condition | 0 | 102 | 1665 | 3 | 1 | 0.00 | not moved |
| 28 | `Found in Sample Group: [S7] F7: Sample` | — | label | 0 | 102 | 1665 | 3 | 2 | 0.00 | not moved |
| 29 | `Found in Sample Group: [S8] F8: Sample` | — | condition | 0 | 102 | 1665 | 2 | 1 | 0.00 | not moved |
| 30 | `Found in Sample Group: [S9] F9: Sample` | — | label | 0 | 102 | 1665 | 3 | 2 | 0.00 | not moved |
| 31 | `Found in Sample Group: [S10] F10: Sample` | — | condition | 0 | 102 | 1665 | 3 | 1 | 0.00 | not moved |
| 32 | `Found in Sample Group: [S11] F11: Sample` | — | label | 0 | 102 | 1665 | 3 | 2 | 0.00 | not moved |
| 33 | `Found in Sample Group: [S12] F12: Sample` | — | condition | 0 | 102 | 1665 | 3 | 1 | 0.00 | not moved |
| 34 | `Oxidation (G) Count` | — | data | 102 | 0 | 1665 | 1 | 1 | 1.00 | not moved |
| 35 | `Gln->pyro-Glu (Q) Count` | — | data | 102 | 0 | 1665 | 3 | 2 | 1.00 | not moved |
| 36 | `Carbamyl (C; K; M; R; S; T; Y) Count` | — | data | 102 | 0 | 1665 | 1 | 1 | 1.00 | not moved |
| 37 | `Acetyl (C; H; K; S; T; Y) Count` | — | data | 102 | 0 | 1665 | 1 | 1 | 1.00 | not moved |

### pos-12 — `Non-target_OUTs.csv` :: `Non-target_OUTs.csv`

doi:10.5061/dryad.d7wm37qh7 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 7 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Non-target_OUTs.csv` · `sha256` `a3abf851fd7d2a30…` matches the receipt · 0.14 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 3422 × 16 | `detectHeaderRows` | **1** |
| after prep | 3420 data rows × 16 cols | `condPerCol` | `null` |
| matrix | 3420 × 15 | `condCtx.type` | `none` |
| roles C/L/D/A/I | 0/1/15/0/0 | assay · dataType | survey (auto-detected) · ordinal |
| synthesised headers | 0 of 16 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` true · numeric fraction of row 2 0.938. Failed: row0 is not a sparse group row.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 3420 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":false,"nGroups":null,"sizes":[],"median":null,"condCols":0,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 0 >= 3` → **false**; arm 2 → **false**; pending → **false**. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 0 groups, 0 singletons, 1 surviving `slices()`.

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 15 columns compared, 0 exact to 1e-6, max absolute residual 7.263e+4, max relative 6.202e+4 at column 14. Reported, not classified.

**Window.** 3420 data rows against the 40-row window, so the window is a **strict sample**; 16 of 16 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `OTUs` | — | label | 0 | 3420 | 0 | 3420 | 40 | 0.00 | not moved |
| 1 | `Y1B_01` | — | data | 3420 | 0 | 0 | 74 | 12 | 1.00 | not moved |
| 2 | `Y1B_02` | — | data | 3420 | 0 | 0 | 127 | 12 | 1.00 | not moved |
| 3 | `Y1B_03` | — | data | 3420 | 0 | 0 | 70 | 12 | 1.00 | not moved |
| 4 | `Y1B_04` | — | data | 3420 | 0 | 0 | 115 | 9 | 1.00 | not moved |
| 5 | `Y1B_05` | — | data | 3420 | 0 | 0 | 124 | 10 | 1.00 | not moved |
| 6 | `Y1Q_01` | — | data | 3420 | 0 | 0 | 44 | 8 | 1.00 | not moved |
| 7 | `Y1Q_02` | — | data | 3420 | 0 | 0 | 123 | 11 | 1.00 | not moved |
| 8 | `Y1Q_03` | — | data | 3420 | 0 | 0 | 77 | 9 | 1.00 | not moved |
| 9 | `Y1Q_04` | — | data | 3420 | 0 | 0 | 130 | 15 | 1.00 | not moved |
| 10 | `Y1Q_05` | — | data | 3420 | 0 | 0 | 116 | 8 | 1.00 | not moved |
| 11 | `Y3Q_01` | — | data | 3420 | 0 | 0 | 74 | 8 | 1.00 | not moved |
| 12 | `Y3Q_02` | — | data | 3420 | 0 | 0 | 70 | 6 | 1.00 | not moved |
| 13 | `Y3Q_03` | — | data | 3420 | 0 | 0 | 45 | 7 | 1.00 | not moved |
| 14 | `Y3Q_04` | — | data | 3420 | 0 | 0 | 78 | 8 | 1.00 | not moved |
| 15 | `Y3Q_05` | — | data | 3420 | 0 | 0 | 80 | 8 | 1.00 | not moved |

### pos-14 — `Rawdata_Figures_Tables_TSA.xlsx` :: `Figure 2`

**4 spanning bands**

doi:10.5061/dryad.bvq83bkr6 · sheet **2 of 8** (`sheetIndex` 1, 0-based) · 1 file in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Figure 1` · `sha256` `e27df7191f48aa15…` matches the receipt · 0.22 MB · 0.2 s.

| | | | |
|---|---|---|---|
| raw | 440 × 20 | `detectHeaderRows` | **1** |
| after prep | 419 data rows × 17 cols | `condPerCol` | `null` |
| matrix | 417 × 16 | `condCtx.type` | `none` |
| roles C/L/D/A/I | 0/1/16/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 9 of 17 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` **true** · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.000. Failed: row1 is not a repeating sub-header; row2 numeric fraction 0.000 <= 0.5.

**Bands.** 4 spanning labels, widths 4 / 3 / 3 / 3 — **unequal**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `A)` |
| 1–4 | 4 **span** | `gammaH2Ax Mean Gray Value` |
| 5–5 | 1 | `B)` |
| 6–8 | 3 **span** | `gammaH2Ax Mean Gray Value` |
| 9–9 | 1 | `C)` |
| 10–12 | 3 **span** | `Thresholded Mean Gray Value / Nucleus Area` |
| 13–13 | 1 | `D)` |
| 14–16 | 3 **span** | `Thresholded Mean Gray Value / Nucleus Area` |

**§2.8.** Ran on 419 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":false,"nGroups":null,"sizes":[],"median":null,"condCols":0,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 0 >= 3` → **false**; arm 2 → **false**; pending → **false**. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 0 groups, 0 singletons, 1 surviving `slices()`.

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 20 from the bottom, and removed 3 near-empty columns (5, 10, 15). `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 2 rows.

**Last row against the column sums above it.** 2 columns compared, 0 exact to 1e-6, max absolute residual 1.348e+5, max relative 9.521e+2 at column 6. Reported, not classified.

**Window.** 419 data rows against the 40-row window, so the window is a **strict sample**; 17 of 17 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `A)` | — | label | 417 | 0 | 2 | 417 | 38 | 1.00 | not moved |
| 1 | `gammaH2Ax Mean Gray Value` | — | data | 280 | 2 | 137 | 282 | 40 | 0.95 | not moved |
| 2 | `Col 3` *(synth)* | `gammaH2Ax Mean Gray Value` | data | 371 | 1 | 47 | 371 | 39 | 0.97 | not moved |
| 3 | `Col 4` *(synth)* | `gammaH2Ax Mean Gray Value` | data | 341 | 1 | 77 | 341 | 39 | 0.97 | not moved |
| 4 | `Col 5` *(synth)* | `gammaH2Ax Mean Gray Value` | data | 376 | 1 | 42 | 377 | 39 | 0.97 | not moved |
| 5 | `B)` | — | data | 371 | 2 | 46 | 372 | 40 | 0.95 | not moved |
| 6 | `gammaH2Ax Mean Gray Value` | — | data | 282 | 1 | 136 | 283 | 39 | 0.97 | not moved |
| 7 | `Col 8` *(synth)* | `gammaH2Ax Mean Gray Value` | data | 417 | 1 | 1 | 418 | 39 | 0.97 | not moved |
| 8 | `Col 9` *(synth)* | `gammaH2Ax Mean Gray Value` | data | 417 | 1 | 1 | 418 | 39 | 0.97 | not moved |
| 9 | `C)` | — | data | 120 | 2 | 297 | 78 | 28 | 0.95 | not moved |
| 10 | `Thresholded Mean Gray Value / Nucleus Area` | — | data | 93 | 1 | 325 | 67 | 32 | 0.97 | not moved |
| 11 | `Col 12` *(synth)* | `Thresholded Mean Gray Value / Nucleus Area` | data | 107 | 1 | 311 | 108 | 39 | 0.97 | not moved |
| 12 | `Col 13` *(synth)* | `Thresholded Mean Gray Value / Nucleus Area` | data | 115 | 1 | 303 | 116 | 39 | 0.97 | not moved |
| 13 | `D)` | — | data | 156 | 2 | 261 | 133 | 30 | 0.95 | not moved |
| 14 | `Thresholded Mean Gray Value / Nucleus Area` | — | data | 204 | 1 | 214 | 203 | 39 | 0.97 | not moved |
| 15 | `Col 16` *(synth)* | `Thresholded Mean Gray Value / Nucleus Area` | data | 195 | 1 | 223 | 196 | 39 | 0.97 | not moved |
| 16 | `Col 17` *(synth)* | `Thresholded Mean Gray Value / Nucleus Area` | data | 187 | 1 | 231 | 188 | 39 | 0.97 | not moved |

### pos-18 — `Data_2022.xlsx` :: `Floral_M`

**arm 1 without arm 2**

doi:10.5061/dryad.g79cnp5vs · sheet **4 of 15** (`sheetIndex` 3, 0-based) · 2 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Metadata` · `sha256` `3c7206880096e7c8…` matches the receipt · 0.69 MB · 0.5 s.

| | | | |
|---|---|---|---|
| raw | 145 × 204 | `detectHeaderRows` | **1** |
| after prep | 144 data rows × 204 cols | `condPerCol` | `null` |
| matrix | 144 × 147 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 3/0/147/54/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 204 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` true · numeric fraction of row 2 0.985. Failed: row0 is not a sparse group row.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 144 rows and **moved 54 columns** via 56 grouping keys: `Allium_cepa` (col 9, 2 levels → 1); `Antirrhinum_sp` (col 17, 2 levels → 4); `Arabis_hirsuta` (col 19, 2 levels → 5); `Arum_sp` (col 20, 2 levels → 5); `Borago_officinalis` (col 27, 2 levels → 5); `Campanula_punctata` (col 31, 2 levels → 1); and 50 more.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":24,"sizes":[6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],"median":6,"condCols":3,"arm1":true,"arm2":false,"pending":true}`. Arm 1 `condCols 3 >= 3` → **true**; arm 2 → **false**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 24 groups, 0 singletons, 24 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 147 columns compared, 0 exact to 1e-6, max absolute residual 1.926e+4, max relative 1.660e+2 at column 88. Reported, not classified.

**Window.** 144 data rows against the 40-row window, so the window is a **strict sample**; 179 of 204 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Cluster` | — | condition | 0 | 144 | 0 | 4 | 2 | 0.00 | not moved |
| 1 | `Site` | — | condition | 0 | 144 | 0 | 3 | 3 | 0.00 | not moved |
| 2 | `Type` | — | condition | 0 | 144 | 0 | 2 | 2 | 0.00 | not moved |
| 3 | `Module` | — | data | 144 | 0 | 0 | 10 | 9 | 1.00 | not moved |
| 4 | `Achillea_mellifolium` | — | data | 144 | 0 | 0 | 7 | 6 | 1.00 | not moved |
| 5 | `Achillea_sp` | — | data | 144 | 0 | 0 | 3 | 2 | 1.00 | not moved |
| 6 | `Aegopodium_podagraria` | — | data | 144 | 0 | 0 | 2 | 2 | 1.00 | not moved |
| 7 | `Ageratina_altissima` | — | data | 144 | 0 | 0 | 5 | 4 | 1.00 | not moved |
| 9 | `Allium_cepa` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 138 `Physalis_heterophylla` |
| 17 | `Antirrhinum_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 139 `Physostegia_virginiana` |
| 19 | `Arabis_hirsuta` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 78 `Gypsophila_elegans` |
| 20 | `Arum_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 78 `Gypsophila_elegans` |
| 27 | `Borago_officinalis` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 78 `Gypsophila_elegans` |
| 31 | `Campanula_punctata` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 87 `Hosta_sieboldii` |
| 32 | `Canna_indica` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 42 `Commelina_communis` |
| 33 | `Capsicum_annuum` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 193 `Verbena_simplex` |
| 34 | `Chamaemelum_nobile` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 168 `Solanum_melongena` |
| 35 | `Chenopodium_album` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 125 `Oxalis_stricta` |
| 36 | `Chrysanthemum_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 86 `Hibiscus_trionum` |
| 41 | `Cleome_houtteana` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 86 `Hibiscus_trionum` |
| 42 | `Commelina_communis` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 32 `Canna_indica` |
| 48 | `Cosmos_bipinnatus` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 78 `Gypsophila_elegans` |
| 49 | `Cosmos_sulphureus` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 78 `Gypsophila_elegans` |
| 51 | `Cucurbita_pepo` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 121 `Ocimum_basilicum` |
| 56 | `Dianthus_barbatus` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 193 `Verbena_simplex` |
| 58 | `Digitalis_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 168 `Solanum_melongena` |
| 64 | `Eruca_vesicaria` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 195 `Veronica_persica` |
| 65 | `Eupatorium_altissimum` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 194 `Verbesina_alternifolia` |
| 67 | `Euphorbia_corollata` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 162 `Sedum_sp` |
| 78 | `Gypsophila_elegans` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 49 `Cosmos_sulphureus` |
| 86 | `Hibiscus_trionum` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 41 `Cleome_houtteana` |
| 87 | `Hosta_sieboldii` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 31 `Campanula_punctata` |
| 91 | `Hylotelephium_telephium` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 193 `Verbena_simplex` |
| 94 | `Ipomoea_hederacea` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 121 `Ocimum_basilicum` |
| 96 | `Iris_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 139 `Physostegia_virginiana` |
| 104 | `Liatris_aspera` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 139 `Physostegia_virginiana` |
| 106 | `Lobularia_maritima` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 197 `Vinca_major` |
| 107 | `Lysimachia_ciliata` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 125 `Oxalis_stricta` |
| 108 | `Lysimachia_punctata` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 152 `Rosa_multiflora` |
| 109 | `Lythrum_salicaria` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 139 `Physostegia_virginiana` |
| 114 | `Mentha_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 125 `Oxalis_stricta` |
| 121 | `Ocimum_basilicum` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 94 `Ipomoea_hederacea` |
| 127 | `Papaver_rhoeas` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 197 `Vinca_major` |
| 130 | `Penstemon_digitalis` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 189 `Trillium_recurvatum` |
| 131 | `Penstemon_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 197 `Vinca_major` |
| 135 | `Phaseolus_vulgaris` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 168 `Solanum_melongena` |
| 138 | `Physalis_heterophylla` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 9 `Allium_cepa` |
| 139 | `Physostegia_virginiana` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 109 `Lythrum_salicaria` |
| 142 | `Pisum_sativum` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 166 `Solanum_dulcamara` |
| 148 | `Prunus_virginiana` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 197 `Vinca_major` |
| 152 | `Rosa_multiflora` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 108 `Lysimachia_punctata` |
| 162 | `Sedum_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 67 `Euphorbia_corollata` |
| 168 | `Solanum_melongena` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 135 `Phaseolus_vulgaris` |
| 169 | `Solanum_tuberosum` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 195 `Veronica_persica` |
| 171 | `Solidago_flexicaulis` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 190 `Tulipa_sp` |
| 185 | `Thlaspi_arvense` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 184 `Taraxacum_officinale` |
| 189 | `Trillium_recurvatum` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 130 `Penstemon_digitalis` |
| 190 | `Tulipa_sp` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 171 `Solidago_flexicaulis` |
| 193 | `Verbena_simplex` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 91 `Hylotelephium_telephium` |
| 194 | `Verbesina_alternifolia` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 65 `Eupatorium_altissimum` |
| 195 | `Veronica_persica` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 169 `Solanum_tuberosum` |
| 197 | `Vinca_major` | — | attribute *(was data)* | 144 | 0 | 0 | 2 | 1 | 1.00 | moved — const within col 148 `Prunus_virginiana` |
| 201 | `Weigela_sp` | — | data | 144 | 0 | 0 | 4 | 2 | 1.00 | not moved |
| 202 | `Zinnia_sp` | — | data | 144 | 0 | 0 | 4 | 1 | 1.00 | not moved |
| 203 | `Zizia_aurea` | — | data | 144 | 0 | 0 | 7 | 1 | 1.00 | not moved |

**139 further `data` columns are rolled up rather than listed** (columns 8–200, non-contiguous where an exemplar was kept). Across them: numeric 144–144, non-numeric 0–0, missing 0–0, distinct 2–43, distinct≤40 1–24. 0 carry any non-numeric cell; 129 have a strict-sample window; 0 were moved by §2.8. **Every non-`data` column and every §2.8-moved column of this sheet is listed above, so nothing anomalous is inside this roll-up.**

### pos-21 — `FEMS_dryad_v2_published.xlsx` :: `Data`

doi:10.5061/dryad.m827p · sheet **1 of 3** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Data` · `sha256` `135da99542d33be8…` matches the receipt · 0.02 MB · 0.2 s.

| | | | |
|---|---|---|---|
| raw | 35 × 25 | `detectHeaderRows` | **1** |
| after prep | 32 data rows × 25 cols | `condPerCol` | `null` |
| matrix | 32 × 23 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 1/1/23/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 25 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.920. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** **Did not look.** The pass received 32 rows against `MIN_ROWS_FOR_GROUPING = 50` and returned at `roles.js:90` before evaluating a candidate — a non-instance by the floor, carrying no evidence about a longer version of the same design.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":3,"sizes":[18,10,4],"median":10,"condCols":1,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 1 >= 3` → **false**; arm 2 → **false**; pending → **false**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 3 groups, 0 singletons, 3 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 2 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 23 columns compared, 0 exact to 1e-6, max absolute residual 2.856e+9, max relative 4.064e+2 at column 17. Reported, not classified.

**Window.** 32 data rows against the 40-row window, so the window **is the whole column** on every one — P217 cannot misrepresent this sheet.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Site` | — | label | 0 | 32 | 0 | 16 | 16 | 0.00 | not moved |
| 1 | `Country` | — | condition | 0 | 32 | 0 | 3 | 3 | 0.00 | not moved |
| 2 | `Microsite` | — | data | 32 | 0 | 0 | 2 | 2 | 1.00 | not moved |
| 3 | `Elevation` | — | data | 32 | 0 | 0 | 15 | 15 | 1.00 | not moved |
| 4 | `Latitude` | — | data | 32 | 0 | 0 | 16 | 16 | 1.00 | not moved |
| 5 | `Longitude` | — | data | 32 | 0 | 0 | 16 | 16 | 1.00 | not moved |
| 6 | `Aridity` | — | data | 32 | 0 | 0 | 16 | 16 | 1.00 | not moved |
| 7 | `Abiotic_ax1` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 8 | `SAC` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 9 | `PH` | — | data | 32 | 0 | 0 | 27 | 27 | 1.00 | not moved |
| 10 | `CON` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 11 | `Nutrient_ax1` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 12 | `ORC` | — | data | 32 | 0 | 0 | 30 | 30 | 1.00 | not moved |
| 13 | `HEX` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 14 | `BGL` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 15 | `AN` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 16 | `AMO` | — | data | 32 | 0 | 0 | 30 | 30 | 1.00 | not moved |
| 17 | `NIT` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 18 | `DON` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 19 | `FOS` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 20 | `AVP` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 21 | `AOB_raw` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 22 | `AOA_raw` | — | data | 32 | 0 | 0 | 32 | 32 | 1.00 | not moved |
| 23 | `Log_AOB_paper` | — | data | 32 | 0 | 0 | 27 | 27 | 1.00 | not moved |
| 24 | `Log_AOA_paper` | — | data | 32 | 0 | 0 | 30 | 30 | 1.00 | not moved |

### pos-22 — `pgls_all_genera.csv` :: `pgls_all_genera.csv`

doi:10.5061/dryad.xsj3tx9vw · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 3 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `pgls_all_genera.csv` · `sha256` `db7daae2a4a7cb9e…` matches the receipt · 0.00 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 32 × 5 | `detectHeaderRows` | **1** |
| after prep | 31 data rows × 5 cols | `condPerCol` | `null` |
| matrix | 31 × 2 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 1/2/2/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 5 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.400. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.400 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** **Did not look.** The pass received 31 rows against `MIN_ROWS_FOR_GROUPING = 50` and returned at `roles.js:90` before evaluating a candidate — a non-instance by the floor, carrying no evidence about a longer version of the same design.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":4,"sizes":[12,9,6,4],"median":7.5,"condCols":1,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 1 >= 3` → **false**; arm 2 → **false**; pending → **false**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 4 groups, 0 singletons, 4 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 2 columns compared, 0 exact to 1e-6, max absolute residual 4.745e+3, max relative 3.316e+1 at column 0. Reported, not classified.

**Window.** 31 data rows against the 40-row window, so the window **is the whole column** on every one — P217 cannot misrepresent this sheet.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Type` | — | condition | 0 | 31 | 0 | 4 | 4 | 0.00 | not moved |
| 1 | `Family` | — | label | 0 | 31 | 0 | 10 | 10 | 0.00 | not moved |
| 2 | `Genus` | — | label | 0 | 31 | 0 | 31 | 31 | 0.00 | not moved |
| 3 | `%occur` | — | data | 31 | 0 | 0 | 28 | 28 | 1.00 | not moved |
| 4 | `CBA` | — | data | 31 | 0 | 0 | 28 | 28 | 1.00 | not moved |

### pos-23 — `05_hydrodynamic_daily_outputs.csv` :: `05_hydrodynamic_daily_outputs.csv`

doi:10.5061/dryad.6q573n6ff · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 14 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `05_hydrodynamic_daily_outputs.csv` · `sha256` `3d3e300be4d4238f…` matches the receipt · 0.06 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 2199 × 5 | `detectHeaderRows` | **1** |
| after prep | 730 data rows × 5 cols | `condPerCol` | `null` |
| matrix | 730 × 4 | `condCtx.type` | `none` |
| roles C/L/D/A/I | 0/1/4/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 5 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.800. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 730 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":false,"nGroups":null,"sizes":[],"median":null,"condCols":0,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 0 >= 3` → **false**; arm 2 → **false**; pending → **false**. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 0 groups, 0 singletons, 1 surviving `slices()`.

**Prep.** `preprocessRaw` skipped 1 row from the top and trimmed 734 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 4 columns compared, 0 exact to 1e-6, max absolute residual 1.961e+5, max relative 7.367e+2 at column 1. Reported, not classified.

**Window.** 730 data rows against the 40-row window, so the window is a **strict sample**; 5 of 5 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `date` | — | label | 0 | 730 | 0 | 730 | 40 | 0.00 | not moved |
| 1 | `L1` | — | data | 730 | 0 | 0 | 451 | 37 | 1.00 | not moved |
| 2 | `H1` | — | data | 730 | 0 | 0 | 456 | 36 | 1.00 | not moved |
| 3 | `R1` | — | data | 730 | 0 | 0 | 448 | 35 | 1.00 | not moved |
| 4 | `R2` | — | data | 730 | 0 | 0 | 445 | 36 | 1.00 | not moved |

### pos-27 — `radMS_table_1.xlsx` :: `Sheet1`

doi:10.5061/dryad.83bk3jb37 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `Sheet1` · `sha256` `2048cd974fc3d73a…` matches the receipt · 0.02 MB · 0.2 s.

| | | | |
|---|---|---|---|
| raw | 176 × 18 | `detectHeaderRows` | **1** |
| after prep | 127 data rows × 9 cols | `condPerCol` | `null` |
| matrix | 127 × 3 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 4/2/3/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 9 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.444. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.444 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 127 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":9,"sizes":[4,11,56,9,2,2,30,6,7],"median":7,"condCols":4,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 4 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 9 groups, 0 singletons, 7 surviving `slices()` (2 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 48 from the bottom, and removed 9 near-empty columns (9, 10, 11, 12, 13, 14, 15, 16, 17). `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 3 columns compared, 0 exact to 1e-6, max absolute residual 7.432e+5, max relative 1.348e+2 at column 0. Reported, not classified.

**Window.** 127 data rows against the 40-row window, so the window is a **strict sample**; 8 of 9 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `IndID` | — | label | 127 | 0 | 0 | 127 | 40 | 1.00 | not moved |
| 1 | `Museum_ID/USGS_ID` | — | label | 0 | 127 | 0 | 127 | 40 | 0.00 | not moved |
| 2 | `Pop` | — | condition | 0 | 127 | 0 | 3 | 1 | 0.00 | not moved |
| 3 | `Elevation` | — | data | 126 | 1 | 0 | 78 | 36 | 1.00 | not moved |
| 4 | `Latitude` | — | data | 127 | 0 | 0 | 80 | 35 | 1.00 | not moved |
| 5 | `Longitude` | — | data | 127 | 0 | 0 | 80 | 35 | 1.00 | not moved |
| 6 | `Transect or Museum` | — | condition | 0 | 127 | 0 | 3 | 1 | 0.00 | not moved |
| 7 | `Museum_Name` | — | condition | 0 | 127 | 0 | 4 | 1 | 0.00 | not moved |
| 8 | `MtDNA Type` | — | condition | 0 | 127 | 0 | 3 | 3 | 0.00 | not moved |

### pos-28 — `dominance_data.csv` :: `dominance_data.csv`

doi:10.5061/dryad.gtht76j3x · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `dominance_data.csv` · `sha256` `85432f2e601d1ac2…` matches the receipt · 0.03 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 437 × 12 | `detectHeaderRows` | **1** |
| after prep | 435 data rows × 12 cols | `condPerCol` | `null` |
| matrix | 435 × 4 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 4/0/4/4/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 12 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.500. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.500 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 435 rows and **moved 4 columns** via 3 grouping keys: `ID` (col 0, 54 levels → 2); `year` (col 1, 5 levels → 1); `year_st` (col 3, 5 levels → 1).

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":108,"sizes":[5,5,1,1,2,2,2,2,4,5,5,4,5,4,4,3,5,4,4,3,2,3,5,4,5,5,5,5,5,4,5,5,5,5,5,5,3,4,5,5,1,1,5,5,4,5,4,4,5,5,5,5,5,5,1,2,5,5,4,4,1,1,5,5,5,4,5,5,5,5,5,5,3,2,5,4,5,4,4,4,5,5,4,4,5,4,2,2,5,4,5,5,5,5,5,5,5,5,2,2,2,2,5,5,5,5,3,2],"median":5,"condCols":4,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 4 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 108 groups, 7 singletons, 87 surviving `slices()` (21 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 4 columns compared, 0 exact to 1e-6, max absolute residual 2.895e+3, max relative 7.170e+2 at column 1. Reported, not classified.

**Window.** 435 data rows against the 40-row window, so the window is a **strict sample**; 6 of 12 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `ID` | — | condition | 168 | 267 | 0 | 54 | 7 | 0.00 | not moved |
| 1 | `year` | — | attribute *(was data)* | 435 | 0 | 0 | 5 | 5 | 1.00 | moved — const within col 3 `year_st` |
| 2 | `season` | — | condition | 0 | 435 | 0 | 2 | 2 | 0.00 | not moved |
| 3 | `year_st` | — | attribute *(was data)* | 435 | 0 | 0 | 5 | 5 | 1.00 | moved — const within col 1 `year` |
| 4 | `sex` | — | condition | 0 | 435 | 0 | 2 | 2 | 0.00 | not moved |
| 5 | `elo` | — | data | 435 | 0 | 0 | 435 | 40 | 1.00 | not moved |
| 6 | `death_year` | — | attribute *(was data)* | 299 | 136 | 0 | 8 | 4 | 0.70 | moved — const within col 0 `ID` |
| 7 | `status` | — | condition | 0 | 435 | 0 | 2 | 2 | 0.00 | not moved |
| 8 | `years_to_death` | — | data | 299 | 136 | 0 | 8 | 6 | 0.70 | not moved |
| 9 | `cohort` | — | attribute *(was data)* | 435 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 0 `ID` |
| 10 | `BT_scores` | — | data | 423 | 12 | 0 | 419 | 35 | 1.00 | not moved |
| 11 | `BT_se` | — | data | 423 | 12 | 0 | 419 | 35 | 1.00 | not moved |

### pos-30 — `ips_density_Goundar_et_al_2026_Where_are_they_now.csv` :: `ips_density_Goundar_et_al_2026_Where_are_they_now.csv`

doi:10.5061/dryad.qv9s4mwwc · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 2 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `ips_density_Goundar_et_al_2026_Where_are_they_now.csv` · `sha256` `927d2f527cf6ecfa…` matches the receipt · 0.00 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 48 × 9 | `detectHeaderRows` | **1** |
| after prep | 46 data rows × 9 cols | `condPerCol` | `null` |
| matrix | 46 × 6 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 2/1/6/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 9 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.667. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** **Did not look.** The pass received 46 rows against `MIN_ROWS_FOR_GROUPING = 50` and returned at `roles.js:90` before evaluating a candidate — a non-instance by the floor, carrying no evidence about a longer version of the same design.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":8,"sizes":[6,6,6,6,6,6,6,4],"median":6,"condCols":2,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 2 >= 3` → **false**; arm 2 → **false**; pending → **false**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 8 groups, 0 singletons, 8 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 6 columns compared, 0 exact to 1e-6, max absolute residual 8.239e+3, max relative 4.364e+1 at column 0. Reported, not classified.

**Window.** 46 data rows against the 40-row window, so the window is a **strict sample**; 7 of 9 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `site` | — | condition | 0 | 46 | 0 | 4 | 4 | 0.00 | not moved |
| 1 | `billet_ID` | — | label | 0 | 46 | 0 | 46 | 40 | 0.00 | not moved |
| 2 | `tree_ID` | — | condition | 0 | 46 | 0 | 8 | 7 | 0.00 | not moved |
| 3 | `billet_length_cm` | — | data | 46 | 0 | 0 | 44 | 38 | 1.00 | not moved |
| 4 | `billet_circumference_cm` | — | data | 46 | 0 | 0 | 45 | 39 | 1.00 | not moved |
| 5 | `billet_diameter_cm` | — | data | 46 | 0 | 0 | 45 | 39 | 1.00 | not moved |
| 6 | `total_ips_count_per_billet` | — | data | 46 | 0 | 0 | 40 | 34 | 1.00 | not moved |
| 7 | `total_parasitoids_per_billet` | — | data | 46 | 0 | 0 | 5 | 5 | 1.00 | not moved |
| 8 | `brood_total` | — | data | 46 | 0 | 0 | 42 | 36 | 1.00 | not moved |

### pos-31 — `MC_Drosophila_hydei.xlsx` :: `Males`

doi:10.5061/dryad.1vhhmgr9v · sheet **2 of 3** (`sheetIndex` 1, 0-based) · 1 file in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Females` · `sha256` `47ebaf33d748b6cf…` matches the receipt · 0.07 MB · 0.2 s.

| | | | |
|---|---|---|---|
| raw | 487 × 15 | `detectHeaderRows` | **1** |
| after prep | 486 data rows × 15 cols | `condPerCol` | `null` |
| matrix | 486 × 6 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 9/0/6/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 15 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.400. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.400 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 486 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":486,"sizes":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"median":1,"condCols":9,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 9 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 486 groups, 486 singletons, 0 surviving `slices()` (486 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 6 columns compared, 0 exact to 1e-6, max absolute residual 2.958e+4, max relative 4.814e+2 at column 1. Reported, not classified.

**Window.** 486 data rows against the 40-row window, so the window is a **strict sample**; 4 of 15 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Experimentor` | — | condition | 0 | 486 | 0 | 1 | 1 | 0.00 | not moved |
| 1 | `Date` | — | condition | 0 | 486 | 0 | 20 | 3 | 0.00 | not moved |
| 2 | `TimeDemo` | — | condition | 0 | 486 | 0 | 52 | 7 | 0.00 | not moved |
| 3 | `Chamber` | — | condition | 0 | 486 | 0 | 6 | 6 | 0.00 | not moved |
| 4 | `Device` | — | data | 486 | 0 | 0 | 12 | 12 | 1.00 | not moved |
| 5 | `Treatment` | — | condition | 0 | 486 | 0 | 2 | 2 | 0.00 | not moved |
| 6 | `Temp` | — | data | 486 | 0 | 0 | 15 | 4 | 1.00 | not moved |
| 7 | `Humidity` | — | data | 486 | 0 | 0 | 17 | 3 | 1.00 | not moved |
| 8 | `ColourDemo` | — | condition | 0 | 486 | 0 | 3 | 3 | 0.00 | not moved |
| 9 | `Colour1Court` | — | condition | 0 | 486 | 0 | 3 | 3 | 0.00 | not moved |
| 10 | `Colour2Court` | — | condition | 0 | 486 | 0 | 3 | 3 | 0.00 | not moved |
| 11 | `ColourTest` | — | condition | 0 | 486 | 0 | 3 | 3 | 0.00 | not moved |
| 12 | `CS1` | — | data | 340 | 146 | 0 | 3 | 3 | 0.70 | not moved |
| 13 | `MCS` | — | data | 261 | 225 | 0 | 3 | 3 | 0.60 | not moved |
| 14 | `DC` | — | data | 486 | 0 | 0 | 3 | 3 | 1.00 | not moved |

### pos-32 — `XLarge_All_Pod_Inference_data.csv` :: `XLarge_All_Pod_Inference_data.csv`

doi:10.5061/dryad.9ghx3fg0p · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 8 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `XLarge_All_Pod_Inference_data.csv` · `sha256` `22a46d78d2e4ec02…` matches the receipt · 4.23 MB · 0.6 s.

| | | | |
|---|---|---|---|
| raw | 52590 × 15 | `detectHeaderRows` | **1** |
| after prep | 52588 data rows × 15 cols | `condPerCol` | `null` |
| matrix | 52588 × 10 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 1/1/10/3/0 | assay · dataType | physiological (auto-detected) · continuous |
| synthesised headers | 1 of 15 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.933. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column, and column 0 carries a synthesised header with no real header to the left, so no band is possible there.

**§2.8.** Ran on 52588 rows and **moved 3 columns** via 2 grouping keys: `Date` (col 13, 31 levels → 3); `DAP` (col 14, 31 levels → 2).

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":31,"sizes":[21,58,6,6,18,15,191,223,190,345,529,595,975,1127,1106,1227,1446,1845,1752,2040,2246,3937,3310,3768,3195,3820,3654,3767,3255,4240,3681],"median":1227,"condCols":1,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 1 >= 3` → **false**; arm 2 → **false**; pending → **false**.

**`suggestRowSemantics`**: `{"value":"ordered","auto":true,"reason":"assay"}`. Auto-applied by `ImportView.jsx:431`; the headless path agrees at `ordered`.

**Partition.** 31 groups, 0 singletons, 31 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 10 columns compared, 0 exact to 1e-6, max absolute residual 1.064e+8, max relative 1.054e+5 at column 7. Reported, not classified.

**Window.** 52588 data rows against the 40-row window, so the window is a **strict sample**; 12 of 15 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Col 1` *(synth)* | — | label | 52588 | 0 | 0 | 52588 | 40 | 1.00 | not moved |
| 1 | `Month` | — | attribute *(was data)* | 52588 | 0 | 0 | 3 | 1 | 1.00 | moved — const within col 14 `DAP` |
| 2 | `Day` | — | attribute *(was data)* | 52588 | 0 | 0 | 23 | 2 | 1.00 | moved — const within col 14 `DAP` |
| 3 | `Year` | — | data | 52588 | 0 | 0 | 1 | 1 | 1.00 | not moved |
| 4 | `Plot` | — | data | 52588 | 0 | 0 | 20 | 13 | 1.00 | not moved |
| 5 | `Slice_X` | — | data | 52588 | 0 | 0 | 11 | 6 | 1.00 | not moved |
| 6 | `Slice_Y` | — | data | 52588 | 0 | 0 | 3 | 3 | 1.00 | not moved |
| 7 | `Pod_Class` | — | data | 52588 | 0 | 0 | 2 | 2 | 1.00 | not moved |
| 8 | `X` | — | data | 52588 | 0 | 0 | 1263 | 40 | 1.00 | not moved |
| 9 | `Y` | — | data | 52588 | 0 | 0 | 1262 | 40 | 1.00 | not moved |
| 10 | `Confidence` | — | data | 52588 | 0 | 0 | 52187 | 40 | 1.00 | not moved |
| 11 | `Width` | — | data | 52588 | 0 | 0 | 202 | 27 | 1.00 | not moved |
| 12 | `Height` | — | data | 52588 | 0 | 0 | 211 | 36 | 1.00 | not moved |
| 13 | `Date` | — | condition | 0 | 52588 | 0 | 31 | 2 | 0.00 | not moved |
| 14 | `DAP` | — | attribute *(was data)* | 52588 | 0 | 0 | 31 | 2 | 1.00 | moved — const within col 13 `Date` |

### pos-34 — `Sperm_morphological_data.csv` :: `Sperm_morphological_data.csv`

**arm 1 without arm 2**

doi:10.5061/dryad.m0cfxppgt · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 3 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Sperm_morphological_data.csv` · `sha256` `550c1a11b40596ec…` matches the receipt · 0.15 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 1234 × 14 | `detectHeaderRows` | **1** |
| after prep | 1232 data rows × 14 cols | `condPerCol` | `null` |
| matrix | 1232 × 7 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 5/2/7/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 14 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.571. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 1232 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":74,"sizes":[20,26,13,29,24,15,16,10,26,18,14,15,15,12,15,13,13,12,22,12,11,12,12,17,21,18,12,12,15,10,12,13,13,15,16,17,12,18,11,15,13,14,16,28,12,17,15,18,21,14,11,13,14,17,11,13,10,13,16,15,48,31,34,23,27,17,18,14,16,14,14,23,16,14],"median":15,"condCols":5,"arm1":true,"arm2":false,"pending":true}`. Arm 1 `condCols 5 >= 3` → **true**; arm 2 → **false**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 74 groups, 0 singletons, 74 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 7 columns compared, 0 exact to 1e-6, max absolute residual 4.110e+4, max relative 2.563e+3 at column 4. Reported, not classified.

**Window.** 1232 data rows against the 40-row window, so the window is a **strict sample**; 14 of 14 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `No` | — | label | 1232 | 0 | 0 | 1232 | 40 | 1.00 | not moved |
| 1 | `PictureNo` | — | label | 0 | 1232 | 0 | 827 | 24 | 0.00 | not moved |
| 2 | `SpermNo` | — | data | 1232 | 0 | 0 | 7 | 3 | 1.00 | not moved |
| 3 | `Scientific_name` | — | condition | 0 | 1232 | 0 | 11 | 1 | 0.00 | not moved |
| 4 | `RepSystem` | — | condition | 0 | 1232 | 0 | 2 | 1 | 0.00 | not moved |
| 5 | `S.C.level` | — | condition | 0 | 1232 | 0 | 3 | 1 | 0.00 | not moved |
| 6 | `Group` | — | condition | 0 | 1232 | 0 | 3 | 1 | 0.00 | not moved |
| 7 | `IndID` | — | condition | 0 | 1232 | 0 | 74 | 2 | 0.00 | not moved |
| 8 | `SpermLength` | — | data | 1182 | 50 | 0 | 1163 | 40 | 1.00 | not moved |
| 9 | `HeadLength` | — | data | 1107 | 125 | 0 | 730 | 26 | 0.65 | not moved |
| 10 | `HeadWidth` | — | data | 1111 | 121 | 0 | 660 | 23 | 0.65 | not moved |
| 11 | `MPLength` | — | data | 1037 | 195 | 0 | 637 | 27 | 0.68 | not moved |
| 12 | `MPWidth` | — | data | 1041 | 191 | 0 | 540 | 23 | 0.63 | not moved |
| 13 | `FlagellaLength` | — | data | 1064 | 168 | 0 | 1047 | 26 | 0.65 | not moved |

### pos-35 — `AgeRelatedChangesInAcousticCues_data.csv` :: `AgeRelatedChangesInAcousticCues_data.csv`

**4 spanning bands**

doi:10.5061/dryad.4xgxd25s6 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `AgeRelatedChangesInAcousticCues_data.csv` · `sha256` `535371cd966f43d1…` matches the receipt · 0.02 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 88 × 29 | `detectHeaderRows` | **1** |
| after prep | 86 data rows × 29 cols | `condPerCol` | `null` |
| matrix | 84 × 27 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 1/1/27/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 22 of 29 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` **true** · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.000. Failed: row1 is not a repeating sub-header; row2 numeric fraction 0.000 <= 0.5.

**Bands.** 4 spanning labels, widths 6 / 14 / 3 / 3 — **unequal**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `Subject ID` |
| 1–1 | 1 | `Age` |
| 2–2 | 1 | `AgeGroup` |
| 3–8 | 6 **span** | `Hearing Thresholds` |
| 9–22 | 14 **span** | `ABR Metrics` |
| 23–25 | 3 **span** | `Digit Span` |
| 26–28 | 3 **span** | `Speech-in-Speech Recognition` |

**§2.8.** Ran on 86 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":2,"sizes":[50,34],"median":42,"condCols":1,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 1 >= 3` → **false**; arm 2 → **false**; pending → **false**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 2 groups, 0 singletons, 2 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 2 rows.

**Last row against the column sums above it.** 27 columns compared, 0 exact to 1e-6, max absolute residual 6.338e+3, max relative 1.553e+2 at column 14. Reported, not classified.

**Window.** 86 data rows against the 40-row window, so the window is a **strict sample**; 29 of 29 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Subject ID` | — | label | 0 | 84 | 2 | 84 | 38 | 0.00 | not moved |
| 1 | `Age` | — | data | 84 | 0 | 2 | 83 | 38 | 1.00 | not moved |
| 2 | `AgeGroup` | — | condition | 0 | 84 | 2 | 2 | 1 | 0.00 | not moved |
| 3 | `Hearing Thresholds` | — | data | 84 | 1 | 1 | 39 | 20 | 0.97 | not moved |
| 4 | `Col 5` *(synth)* | `Hearing Thresholds` | data | 84 | 1 | 1 | 32 | 16 | 0.97 | not moved |
| 5 | `Col 6` *(synth)* | `Hearing Thresholds` | data | 84 | 1 | 1 | 36 | 20 | 0.97 | not moved |
| 6 | `Col 7` *(synth)* | `Hearing Thresholds` | data | 83 | 2 | 1 | 34 | 13 | 0.97 | not moved |
| 7 | `Col 8` *(synth)* | `Hearing Thresholds` | data | 84 | 1 | 1 | 52 | 25 | 0.97 | not moved |
| 8 | `Col 9` *(synth)* | `Hearing Thresholds` | data | 83 | 2 | 1 | 45 | 18 | 0.97 | not moved |
| 9 | `ABR Metrics` | — | data | 83 | 3 | 0 | 53 | 32 | 0.93 | not moved |
| 10 | `Col 11` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 61 | 33 | 0.95 | not moved |
| 11 | `Col 12` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 49 | 31 | 0.95 | not moved |
| 12 | `Col 13` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 62 | 35 | 0.95 | not moved |
| 13 | `Col 14` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 63 | 35 | 0.95 | not moved |
| 14 | `Col 15` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 76 | 37 | 0.95 | not moved |
| 15 | `Col 16` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 73 | 36 | 0.95 | not moved |
| 16 | `Col 17` *(synth)* | `ABR Metrics` | data | 83 | 3 | 0 | 58 | 33 | 0.93 | not moved |
| 17 | `Col 18` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 60 | 31 | 0.95 | not moved |
| 18 | `Col 19` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 50 | 29 | 0.95 | not moved |
| 19 | `Col 20` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 53 | 32 | 0.95 | not moved |
| 20 | `Col 21` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 62 | 36 | 0.95 | not moved |
| 21 | `Col 22` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 66 | 35 | 0.95 | not moved |
| 22 | `Col 23` *(synth)* | `ABR Metrics` | data | 83 | 2 | 1 | 80 | 39 | 0.95 | not moved |
| 23 | `Digit Span` | — | data | 84 | 1 | 1 | 17 | 11 | 0.97 | not moved |
| 24 | `Col 25` *(synth)* | `Digit Span` | data | 84 | 1 | 1 | 20 | 16 | 0.97 | not moved |
| 25 | `Col 26` *(synth)* | `Digit Span` | data | 84 | 1 | 1 | 37 | 23 | 0.97 | not moved |
| 26 | `Speech-in-Speech Recognition` | — | data | 84 | 1 | 1 | 53 | 32 | 0.97 | not moved |
| 27 | `Col 28` *(synth)* | `Speech-in-Speech Recognition` | data | 84 | 1 | 1 | 50 | 28 | 0.97 | not moved |
| 28 | `Col 29` *(synth)* | `Speech-in-Speech Recognition` | data | 84 | 1 | 1 | 50 | 25 | 0.97 | not moved |

### pos-38 — `Nightly_Capture_Rates_Spp_Updated.csv` :: `Nightly_Capture_Rates_Spp_Updated.csv`

doi:10.5061/dryad.3tx95x6t7 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 9 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Nightly_Capture_Rates_Spp_Updated.csv` · `sha256` `a107ea3f48e5019f…` matches the receipt · 0.06 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 313 × 33 | `detectHeaderRows` | **1** |
| after prep | 311 data rows × 33 cols | `condPerCol` | `null` |
| matrix | 311 × 28 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 2/3/28/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 33 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` true · numeric fraction of row 2 0.879. Failed: row0 is not a sparse group row.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 311 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":4,"sizes":[126,47,120,18],"median":83.5,"condCols":2,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 2 >= 3` → **false**; arm 2 → **false**; pending → **false**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 4 groups, 0 singletons, 4 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 28 columns compared, 2 exact to 1e-6, max absolute residual 6.245e+5, max relative 3.085e+2 at column 0. Reported, not classified.

**Window.** 311 data rows against the 40-row window, so the window is a **strict sample**; 27 of 33 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Date` | — | label | 0 | 311 | 0 | 293 | 40 | 0.00 | not moved |
| 1 | `Bat.Night` | — | label | 311 | 0 | 0 | 311 | 40 | 1.00 | not moved |
| 2 | `Site.Name` | — | label | 0 | 311 | 0 | 33 | 13 | 0.00 | not moved |
| 3 | `Year` | — | data | 311 | 0 | 0 | 6 | 2 | 1.00 | not moved |
| 4 | `Stage` | — | condition | 0 | 311 | 0 | 2 | 1 | 0.00 | not moved |
| 5 | `park_unit` | — | condition | 0 | 311 | 0 | 3 | 1 | 0.00 | not moved |
| 6 | `Total.Capture.Effort` | — | data | 311 | 0 | 0 | 182 | 26 | 1.00 | not moved |
| 7 | `COTO_c` | — | data | 311 | 0 | 0 | 5 | 2 | 1.00 | not moved |
| 8 | `COTO_rate` | — | data | 311 | 0 | 0 | 3 | 2 | 1.00 | not moved |
| 9 | `EPFU_c` | — | data | 311 | 0 | 0 | 21 | 11 | 1.00 | not moved |
| 10 | `EPFU_rate` | — | data | 311 | 0 | 0 | 15 | 8 | 1.00 | not moved |
| 11 | `LABO_c` | — | data | 311 | 0 | 0 | 4 | 1 | 1.00 | not moved |
| 12 | `LABO_rate` | — | data | 311 | 0 | 0 | 2 | 1 | 1.00 | not moved |
| 13 | `LACI_c` | — | data | 311 | 0 | 0 | 14 | 6 | 1.00 | not moved |
| 14 | `LACI_rate` | — | data | 311 | 0 | 0 | 11 | 5 | 1.00 | not moved |
| 15 | `LANO_c` | — | data | 311 | 0 | 0 | 16 | 3 | 1.00 | not moved |
| 16 | `LANO_rate` | — | data | 311 | 0 | 0 | 11 | 3 | 1.00 | not moved |
| 17 | `MYCI_c` | — | data | 311 | 0 | 0 | 7 | 3 | 1.00 | not moved |
| 18 | `MYCI_rate` | — | data | 311 | 0 | 0 | 5 | 3 | 1.00 | not moved |
| 19 | `MYEV_c` | — | data | 311 | 0 | 0 | 3 | 1 | 1.00 | not moved |
| 20 | `MYEV_rate` | — | data | 311 | 0 | 0 | 2 | 1 | 1.00 | not moved |
| 21 | `MYLU_c` | — | data | 311 | 0 | 0 | 7 | 5 | 1.00 | not moved |
| 22 | `MYLU_rate` | — | data | 311 | 0 | 0 | 4 | 4 | 1.00 | not moved |
| 23 | `MYSE_c` | — | data | 311 | 0 | 0 | 7 | 6 | 1.00 | not moved |
| 24 | `MYSE_rate` | — | data | 311 | 0 | 0 | 3 | 3 | 1.00 | not moved |
| 25 | `MYSP_c` | — | data | 311 | 0 | 0 | 2 | 2 | 1.00 | not moved |
| 26 | `MYSP_rate` | — | data | 311 | 0 | 0 | 2 | 1 | 1.00 | not moved |
| 27 | `MYTH_c` | — | data | 311 | 0 | 0 | 8 | 7 | 1.00 | not moved |
| 28 | `MYTH_rate` | — | data | 311 | 0 | 0 | 5 | 5 | 1.00 | not moved |
| 29 | `MYVO_c` | — | data | 311 | 0 | 0 | 8 | 5 | 1.00 | not moved |
| 30 | `MYVO_rate` | — | data | 311 | 0 | 0 | 6 | 5 | 1.00 | not moved |
| 31 | `PESU_c` | — | data | 311 | 0 | 0 | 1 | 1 | 1.00 | not moved |
| 32 | `PESU_rate` | — | data | 311 | 0 | 0 | 1 | 1 | 1.00 | not moved |

### pos-39 — `FIG3.xlsx` :: `FIG3A`

doi:10.5061/dryad.280gb5n5c · sheet **2 of 5** (`sheetIndex` 1, 0-based) · 5 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `FIG3_metadata` · `sha256` `d587d773100951a1…` matches the receipt · 0.05 MB · 0.2 s.

| | | | |
|---|---|---|---|
| raw | 147 × 16 | `detectHeaderRows` | **1** |
| after prep | 146 data rows × 16 cols | `condPerCol` | `null` |
| matrix | 146 × 14 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 1/1/14/0/0 | assay · dataType | physiological (auto-detected) · continuous |
| synthesised headers | 0 of 16 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.875. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 146 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":4,"sizes":[35,38,40,33],"median":36.5,"condCols":1,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 1 >= 3` → **false**; arm 2 → **false**; pending → **false**.

**`suggestRowSemantics`**: `{"value":"ordered","auto":true,"reason":"assay"}`. Auto-applied by `ImportView.jsx:431`; the headless path agrees at `ordered`.

**Partition.** 4 groups, 0 singletons, 4 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 14 columns compared, 0 exact to 1e-6, max absolute residual 2.829e+6, max relative 9.144e+2 at column 2. Reported, not classified.

**Window.** 146 data rows against the 40-row window, so the window is a **strict sample**; 16 of 16 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Point ID` | — | label | 0 | 146 | 0 | 146 | 40 | 0.00 | not moved |
| 1 | `SITE` | — | condition | 0 | 146 | 0 | 4 | 2 | 0.00 | not moved |
| 2 | `Green_Biomass` | — | data | 146 | 0 | 0 | 142 | 40 | 1.00 | not moved |
| 3 | `Litter_Biomass` | — | data | 146 | 0 | 0 | 123 | 40 | 1.00 | not moved |
| 4 | `Rock_Cover` | — | data | 146 | 0 | 0 | 20 | 12 | 1.00 | not moved |
| 5 | `Mean_Veg_Height` | — | data | 146 | 0 | 0 | 29 | 19 | 1.00 | not moved |
| 6 | `Bare_Soil_Cover` | — | data | 146 | 0 | 0 | 15 | 10 | 1.00 | not moved |
| 7 | `Sand_texture` | — | data | 146 | 0 | 0 | 145 | 40 | 1.00 | not moved |
| 8 | `pH` | — | data | 146 | 0 | 0 | 113 | 38 | 1.00 | not moved |
| 9 | `Cd_AA` | — | data | 146 | 0 | 0 | 145 | 40 | 1.00 | not moved |
| 10 | `Zn_AA` | — | data | 146 | 0 | 0 | 146 | 40 | 1.00 | not moved |
| 11 | `OM` | — | data | 146 | 0 | 0 | 135 | 40 | 1.00 | not moved |
| 12 | `Zn_TOT` | — | data | 146 | 0 | 0 | 146 | 40 | 1.00 | not moved |
| 13 | `Cd_TOT` | — | data | 146 | 0 | 0 | 144 | 40 | 1.00 | not moved |
| 14 | `Clays` | — | data | 146 | 0 | 0 | 146 | 40 | 1.00 | not moved |
| 15 | `C:N` | — | data | 146 | 0 | 0 | 66 | 32 | 1.00 | not moved |

### pos-40 — `13._b_Planctomycetota_asv.csv` :: `13._b_Planctomycetota_asv.csv`

doi:10.5061/dryad.2280gb64c · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 14 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `13._b_Planctomycetota_asv.csv` · `sha256` `adab624923dc751a…` matches the receipt · 38.28 MB · 7.9 s.

| | | | |
|---|---|---|---|
| raw | 33680 × 426 | `detectHeaderRows` | **1** |
| after prep | 33678 data rows × 426 cols | `condPerCol` | `null` |
| matrix | 33678 × 416 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 6/4/416/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 426 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` true · numeric fraction of row 2 0.977. Failed: row0 is not a sparse group row.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 33678 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":34,"sizes":[5268,16049,2876,181,394,490,954,1872,1549,138,155,1252,157,538,135,154,105,360,82,166,20,72,23,63,244,13,25,271,34,19,9,6,3,1],"median":154.5,"condCols":6,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 6 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 34 groups, 1 singleton, 33 surviving `slices()` (1 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 416 columns compared, 0 exact to 1e-6, max absolute residual 1.228e+4, max relative 6.128e+2 at column 122. Reported, not classified.

**Window.** 33678 data rows against the 40-row window, so the window is a **strict sample**; 423 of 426 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `ASV_ID` | — | label | 0 | 33678 | 0 | 33678 | 40 | 0.00 | not moved |
| 1 | `BAD_01` | — | data | 33678 | 0 | 0 | 56 | 1 | 1.00 | not moved |
| 2 | `BAD_02` | — | data | 33678 | 0 | 0 | 40 | 2 | 1.00 | not moved |
| 3 | `BAD_03` | — | data | 33678 | 0 | 0 | 41 | 1 | 1.00 | not moved |
| 4 | `BAD_04` | — | data | 33678 | 0 | 0 | 47 | 1 | 1.00 | not moved |
| 5 | `BAD_05` | — | data | 33678 | 0 | 0 | 34 | 1 | 1.00 | not moved |
| 414 | `ZZD_27` | — | data | 33678 | 0 | 0 | 50 | 1 | 1.00 | not moved |
| 415 | `ZZD_28` | — | data | 33678 | 0 | 0 | 45 | 1 | 1.00 | not moved |
| 416 | `ZZD_29` | — | data | 33678 | 0 | 0 | 44 | 2 | 1.00 | not moved |
| 417 | `Taxnomy` | — | label | 0 | 33678 | 0 | 358 | 19 | 0.00 | not moved |
| 418 | `Domain` | — | condition | 0 | 33678 | 0 | 1 | 1 | 0.00 | not moved |
| 419 | `Kingdom` | — | condition | 0 | 33678 | 0 | 1 | 1 | 0.00 | not moved |
| 420 | `Phylum` | — | condition | 0 | 33678 | 0 | 1 | 1 | 0.00 | not moved |
| 421 | `Class` | — | condition | 0 | 33188 | 490 | 9 | 3 | 0.00 | not moved |
| 422 | `Order` | — | condition | 0 | 33049 | 629 | 20 | 8 | 0.00 | not moved |
| 423 | `Family` | — | condition | 0 | 32866 | 812 | 28 | 9 | 0.00 | not moved |
| 424 | `Gunes` | — | label | 0 | 30777 | 2901 | 63 | 12 | 0.00 | not moved |
| 425 | `Species` | — | label | 0 | 9385 | 24293 | 289 | 8 | 0.00 | not moved |

**408 further `data` columns are rolled up rather than listed** (columns 6–413, non-contiguous where an exemplar was kept). Across them: numeric 33678–33678, non-numeric 0–0, missing 0–0, distinct 20–84, distinct≤40 1–5. 0 carry any non-numeric cell; 408 have a strict-sample window; 0 were moved by §2.8. **Every non-`data` column and every §2.8-moved column of this sheet is listed above, so nothing anomalous is inside this roll-up.**

### pos-41 — `SNPeffect_BSLMM_allvar.csv` :: `SNPeffect_BSLMM_allvar.csv`

doi:10.5061/dryad.kprr4xhfb · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 10 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `SNPeffect_BSLMM_allvar.csv` · `sha256` `08df220e23c4cacb…` matches the receipt · 32.67 MB · 5.3 s.

| | | | |
|---|---|---|---|
| raw | 109229 × 28 | `detectHeaderRows` | **1** |
| after prep | 109228 data rows × 28 cols | `condPerCol` | `null` |
| matrix | 109228 × 27 | `condCtx.type` | `none` |
| roles C/L/D/A/I | 0/1/27/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 28 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.964. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 109228 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":false,"nGroups":null,"sizes":[],"median":null,"condCols":0,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 0 >= 3` → **false**; arm 2 → **false**; pending → **false**. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 0 groups, 0 singletons, 1 surviving `slices()`.

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 3 columns compared, 0 exact to 1e-6, max absolute residual 1.366e+12, max relative 1.486e+5 at column 1. Reported, not classified.

**Window.** 109228 data rows against the 40-row window, so the window is a **strict sample**; 28 of 28 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `rs` | — | label | 0 | 109228 | 0 | 109228 | 40 | 0.00 | not moved |
| 1 | `chr` | — | data | 109228 | 0 | 0 | 5 | 1 | 1.00 | not moved |
| 2 | `ps` | — | data | 109228 | 0 | 0 | 109056 | 40 | 1.00 | not moved |
| 3 | `e_ABA_um2` | — | data | 108652 | 576 | 0 | 108286 | 40 | 0.97 | not moved |
| 4 | `e_ADA_um2` | — | data | 108053 | 1175 | 0 | 107631 | 40 | 0.97 | not moved |
| 5 | `e_mean_um2` | — | data | 108796 | 432 | 0 | 108333 | 40 | 0.97 | not moved |
| 6 | `i_ABA_unitless` | — | data | 108652 | 576 | 0 | 5949 | 40 | 0.97 | not moved |
| 7 | `i_ADA_unitless` | — | data | 108053 | 1175 | 0 | 6065 | 40 | 0.97 | not moved |
| 8 | `i_mean_unitless` | — | data | 108796 | 432 | 0 | 6095 | 39 | 0.97 | not moved |
| 9 | `s_ABA_um2` | — | data | 108053 | 1175 | 0 | 95443 | 39 | 0.97 | not moved |
| 10 | `s_ADA_um2` | — | data | 108053 | 1175 | 0 | 98826 | 40 | 0.97 | not moved |
| 11 | `s_mean_um2` | — | data | 108053 | 1175 | 0 | 99958 | 40 | 0.97 | not moved |
| 12 | `d_ABA_sto.mm.2` | — | data | 108053 | 1175 | 0 | 106535 | 40 | 0.97 | not moved |
| 13 | `d_ADA_sto.mm.2` | — | data | 108053 | 1175 | 0 | 107146 | 40 | 0.97 | not moved |
| 14 | `d_total_sto.mm.2` | — | data | 108053 | 1175 | 0 | 107452 | 40 | 0.97 | not moved |
| 15 | `f_ABA` | — | data | 108053 | 1175 | 0 | 21633 | 40 | 0.97 | not moved |
| 16 | `f_ADA` | — | data | 108053 | 1175 | 0 | 29897 | 40 | 0.97 | not moved |
| 17 | `f_mean` | — | data | 108053 | 1175 | 0 | 23273 | 40 | 0.97 | not moved |
| 18 | `gmax_aba` | — | data | 108053 | 1175 | 0 | 7364 | 39 | 0.97 | not moved |
| 19 | `gmax_ada` | — | data | 108053 | 1175 | 0 | 9626 | 40 | 0.97 | not moved |
| 20 | `gmax_total` | — | data | 108053 | 1175 | 0 | 13176 | 40 | 0.97 | not moved |
| 21 | `FT16_days` | — | data | 101240 | 7988 | 0 | 95454 | 36 | 0.88 | not moved |
| 22 | `AI_unitless` | — | data | 108443 | 785 | 0 | 107915 | 40 | 1.00 | not moved |
| 23 | `MAT_C` | — | data | 108443 | 785 | 0 | 57908 | 40 | 1.00 | not moved |
| 24 | `MAP_mm` | — | data | 108443 | 785 | 0 | 107444 | 40 | 1.00 | not moved |
| 25 | `PGS_mm` | — | data | 108443 | 785 | 0 | 107603 | 40 | 1.00 | not moved |
| 26 | `MTGS_C` | — | data | 108443 | 785 | 0 | 13674 | 40 | 1.00 | not moved |
| 27 | `LengthofGS_months` | — | data | 108443 | 785 | 0 | 43636 | 40 | 1.00 | not moved |

### pos-43 — `Isoodon_data_raw_only.csv` :: `Isoodon_data_raw_only.csv`

**2 spanning bands**

doi:10.5061/dryad.8gtht772x · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 2 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Isoodon_data_raw_only.csv` · `sha256` `076d98dc7a90caf1…` matches the receipt · 0.39 MB · 0.2 s.

| | | | |
|---|---|---|---|
| raw | 1650 × 80 | `detectHeaderRows` | **1** |
| after prep | 873 data rows × 80 cols | `condPerCol` | `null` |
| matrix | 709 × 70 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 4/5/70/1/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 2 of 80 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.550. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** 2 spanning labels, widths 2 / 2 — **equal**.

| columns | width | label |
|---|---|---|
| 0–0 | 1 | `Count` |
| 1–1 | 1 | `Species name` |
| 2–2 | 1 | `Specimen #` |
| 3–3 | 1 | `notes` |
| 4–4 | 1 | `skin` |
| 5–5 | 1 | `Ear` |
| 6–6 | 1 | `Hind foot` |
| 7–7 | 1 | `Tail` |
| 8–8 | 1 | `Head-body` |
| 9–10 | 2 **span** | `Side` |
| 11–11 | 1 | `P1L` |
| 12–12 | 1 | `P1W` |
| 13–13 | 1 | `P2L` |
| 14–14 | 1 | `P2W` |
| 15–15 | 1 | `P3L` |
| 16–16 | 1 | `P3W` |
| 17–17 | 1 | `M1L` |
| 18–18 | 1 | `M1W` |
| 19–19 | 1 | `M2L` |
| 20–20 | 1 | `M2W` |
| 21–21 | 1 | `M3L` |
| 22–22 | 1 | `M3W` |
| 23–23 | 1 | `M4L` |
| 24–24 | 1 | `M4W` |
| 25–25 | 1 | `p1L` |
| 26–26 | 1 | `p1W` |
| 27–27 | 1 | `p2L` |
| 28–28 | 1 | `p2W` |
| 29–29 | 1 | `p3L` |
| 30–30 | 1 | `p3W` |
| 31–31 | 1 | `m1L` |
| 32–32 | 1 | `m1AW` |
| 33–33 | 1 | `m1PW` |
| 34–34 | 1 | `m2L` |
| 35–35 | 1 | `m2AW` |
| 36–36 | 1 | `m2PW` |
| 37–37 | 1 | `m3L` |
| 38–38 | 1 | `m3AW` |
| 39–39 | 1 | `m3PW` |
| 40–40 | 1 | `m4L` |
| 41–41 | 1 | `m4AW` |
| 42–43 | 2 **span** | `m4PW` |
| 44–44 | 1 | `onl` |
| 45–45 | 1 | `nl` |
| 46–46 | 1 | `anw` |
| 47–47 | 1 | `nps` |
| 48–48 | 1 | `pnw` |
| 49–49 | 1 | `rwi` |
| 50–50 | 1 | `ppw` |
| 51–51 | 1 | `iow` |
| 52–52 | 1 | `fs` |
| 53–53 | 1 | `zw` |
| 54–54 | 1 | `IL` |
| 55–55 | 1 | `aIL` |
| 56–56 | 1 | `apl` |
| 57–57 | 1 | `apw` |
| 58–58 | 1 | `Ipl` |
| 59–59 | 1 | `ppl` |
| 60–60 | 1 | `rwc` |
| 61–61 | 1 | `ctl` |
| 62–62 | 1 | `uPR` |
| 63–63 | 1 | `uMR` |
| 64–64 | 1 | `uML` |
| 65–65 | 1 | `oP3` |
| 66–66 | 1 | `bsl` |
| 67–67 | 1 | `bcl` |
| 68–68 | 1 | `bol` |
| 69–69 | 1 | `cw` |
| 70–70 | 1 | `pow` |
| 71–71 | 1 | `mw` |
| 72–72 | 1 | `Ipr` |
| 73–73 | 1 | `lmr` |
| 74–74 | 1 | `JL` |
| 75–75 | 1 | `JH` |
| 76–76 | 1 | `BH` |
| 77–77 | 1 | `BL` |
| 78–78 | 1 | `BW` |
| 79–79 | 1 | `saggital crest` |

**§2.8.** Ran on 873 rows and **moved 1 column** via 2 grouping keys: `M3L` (col 21, 126 levels → 1); `p3L` (col 29, 133 levels → 1).

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":167,"sizes":[1,111,2,2,20,2,1,2,2,5,1,1,1,9,7,6,2,2,3,2,1,5,1,11,1,1,2,3,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,2,5,1,1,1,1,1,2,2,6,2,9,1,1,1,1,1,1,7,4,5,2,5,2,1,24,1,1,1,1,1,1,2,1,1,1,1,4,2,1,2,3,1,1,4,3,3,1,2,1,1,1,1,5,6,18,7,7,11,11,8,5,1,1,1,8,1,5,4,4,1,1,1,8,1,1,1,1,1,1,2,1,7,1,1,1,2,1,1,1,1,1,1,4,3,4,1,1,1,1,2,1,1,1,1,3,1,2,1,2,1,1,1,1,1,1,1,2,2,8,2,6,2,1],"median":1,"condCols":4,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 4 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 167 groups, 93 singletons, 44 surviving `slices()` (123 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 50 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 164 rows.

**Last row against the column sums above it.** 3 columns compared, 0 exact to 1e-6, max absolute residual 2.069e+4, max relative 2.378e+2 at column 2. Reported, not classified.

**Window.** 873 data rows against the 40-row window, so the window is a **strict sample**; 79 of 80 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Count` | — | label | 437 | 0 | 436 | 437 | 20 | 1.00 | not moved |
| 1 | `Species name` | — | condition | 0 | 437 | 436 | 17 | 4 | 0.00 | not moved |
| 2 | `Specimen #` | — | label | 0 | 437 | 436 | 436 | 20 | 0.00 | not moved |
| 3 | `notes` | — | label | 0 | 872 | 1 | 342 | 27 | 0.00 | not moved |
| 4 | `skin` | — | condition | 0 | 418 | 455 | 69 | 3 | 0.00 | not moved |
| 5 | `Ear` | — | data | 246 | 6 | 621 | 59 | 17 | 0.94 | not moved |
| 6 | `Hind foot` | — | data | 250 | 2 | 621 | 78 | 17 | 1.00 | not moved |
| 7 | `Tail` | — | data | 214 | 36 | 623 | 120 | 16 | 0.94 | not moved |
| 8 | `Head-body` | — | attribute *(was data)* | 73 | 0 | 800 | 44 | 2 | 1.00 | moved — const within col 29 `p3L` |
| 9 | `Side` | — | condition | 0 | 348 | 525 | 2 | 2 | 0.00 | not moved |
| 10 | `Col 11` *(synth)* | `Side` | label | 0 | 30 | 843 | 29 | 2 | 0.00 | not moved |
| 11 | `P1L` | — | data | 524 | 2 | 347 | 104 | 25 | 1.00 | not moved |
| 12 | `P1W` | — | data | 524 | 2 | 347 | 66 | 22 | 1.00 | not moved |
| 43 | `Col 44` *(synth)* | `m4PW` | label | 0 | 30 | 843 | 29 | 2 | 0.00 | not moved |
| 76 | `BH` | — | data | 197 | 1 | 675 | 158 | 18 | 1.00 | not moved |
| 77 | `BL` | — | data | 201 | 1 | 671 | 162 | 18 | 1.00 | not moved |
| 78 | `BW` | — | data | 201 | 1 | 671 | 159 | 18 | 1.00 | not moved |
| 79 | `saggital crest` | — | condition | 0 | 187 | 686 | 7 | 4 | 0.00 | not moved |

**62 further `data` columns are rolled up rather than listed** (columns 13–75, non-contiguous where an exemplar was kept). Across them: numeric 168–549, non-numeric 0–16, missing 323–692, distinct 58–198, distinct≤40 11–27. 59 carry any non-numeric cell; 62 have a strict-sample window; 0 were moved by §2.8. **Every non-`data` column and every §2.8-moved column of this sheet is listed above, so nothing anomalous is inside this roll-up.**

### pos-44 — `subset_dets.csv` :: `subset_dets.csv`

**refuses at `ImportView.jsx:974`** — no gate answer owed (§14.3)

doi:10.5061/dryad.g4f4qrg50 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `subset_dets.csv` · `sha256` `baa13e8f87be9886…` matches the receipt · 7.15 MB · 0.7 s.

| | | | |
|---|---|---|---|
| raw | 52950 × 12 | `detectHeaderRows` | **1** |
| after prep | 52948 data rows × 12 cols | `condPerCol` | `null` |
| matrix | 52940 × 1 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 6/1/1/4/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 12 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.417. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.417 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 52948 rows and **moved 4 columns** via 5 grouping keys: `Date` (col 1, 2191 levels → 2); `monthB` (col 2, 12 levels → 1); `lon` (col 5, 10 levels → 1); `lat` (col 6, 10 levels → 1); `station` (col 10, 10 levels → 2).

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":35618,"sizes":[2,1,1,1,1,1,1,1,4,1,1,1,1,3,1,3,1,1,2,1,1,1,2,1,1,2,1,2,1,2,1,1,2,1,1,1,3,1,2,2,1,1,2,1,2,2,1,2,2,2,5,1,2,1,4,5,2,1,1,1,1,1,1,2,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,2,1,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,2,1,3,1,1,2,1,1,4,1,1,1,1,1,1,1,1,2,1,2,4,1,1,1,1,2,1,3,1,2,2,1,1,1,2,1,2,4,1,2,4,2,1,5,2,1,2,2,1,1,1,1,2,2,3,1,1,1,2,3,1,3,1,2,1,2,2,1,2,1,5,1,2,1,2,1,1,1,4,1,1,1,2,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,3,3,2,1,1,2,2,2,1,5,1,1,2,1,1,1,1,2,1,1,2,1,2,1,1,3,1,1,2,2,3,1,1,5,1,4,1,1,2,3,2,3,2,2,3,2,1,2,4,1,1,1,1,4,1,2,1,1,2,1,1,1,1,1,1,1,1,4,2,1,1,1,4,2,1,1,1,4,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,3,1,1,4,1,1,1,2,2,2,1,1,1,3,1,1,2,1,3,2,5,1,1,1,2,2,3,1,6,3,1,2,1,2,2,1,1,3,3,1,1,1,1,1,1,5,1,3,2,1,1,1,2,2,2,1,3,1,2,1,3,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,3,1,2,1,1,1,1,2,1,3,1,1,2,1,2,1,1,2,2,1,2,1,1,3,2,1,1,2,3,2,1,2,1,1,1,1,4,1,1,2,6,2,1,2,2,1,2,1,1,2,1,2,2,1,1,1,1,2,1,1,1,2,2,2,1,2,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,4,1,1,2,1,2,2,1,1,1,1,1,3,2,1,2,2,2,2,1,1,1,2,1,1,2,4,1,1,1,1,1,1,2,3,2,1,2,3,1,2,2,1,1,2,1,2,1,1,1,2,2,1,4,1,1,1,1,3,1,1,1,3,1,2,2,1,1,5,1,1,1,2,1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,3,1,1,2,1,1,1,1,1,1,1,2,2,1,2,1,1,1,1,2,1,1,1,1,3,1,2,3,4,1,3,1,1,1,1,1,1,2,1,1,1,1,1,3,1,1,2,1,2,1,1,1,1,2,3,1,1,1,2,1,3,2,1,1,1,1,1,1,2,1,3,2,1,1,1,1,1,2,1,1,2,2,2,1,1,1,2,1,1,1,1,2,4,2,1,2,1,1,2,1,1,1,2,2,2,1,1,1,1,1,1,2,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,2,2,4,2,1,1,2,2,2,1,2,1,2,1,3,2,3,4,2,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,3,1,1,2,2,1,4,1,2,1,3,1,3,1,1,3,2,2,4,2,1,1,2,2,1,1,1,1,1,2,1,1,2,2,1,1,1,3,3,3,1,1,1,3,2,1,2,2,1,1,2,1,4,1,1,1,1,2,2,2,2,1,2,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,3,1,1,1,1,2,2,2,1,2,1,2,2,1,1,2,2,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,5,2,1,1,1,1,3,1,1,1,3,6,1,1,1,3,1,1,1,1,1,2,2,4,3,3,1,2,1,1,3,3,2,2,1,2,1,1,3,1,1,1,1,1,1,1,2,2,1,1,1,1,4,3,1,2,1,1,1,1,2,1,3,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,2,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,1,5,3,2,1,2,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,2,1,1,1,1,2,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,3,1,1,1,1,2,1,1,2,2,3,1,1,5,1,3,1,1,1,4,1,2,3,1,1,1,1,3,1,3,2,1,3,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,3,1,1,2,3,3,1,2,1,1,1,2,2,1,1,3,1,1,2,1,2,3,3,3,1,3,1,1,3,1,2,2,2,1,1,1,1,2,1,1,1,2,1,1,2,2,3,1,1,2,1,4,5,2,1,1,4,1,1,1,2,3,3,1,1,1,1,1,2,1,1,1,2,1,2,1,2,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,3,3,1,2,2,1,1,1,1,1,1,1,2,1,2,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,2,4,1,2,2,1,1,1,1,1,2,3,1,1,2,3,5,3,1,2,1,1,2,3,1,3,2,4,1,2,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,2,2,1,3,1,2,1,1,1,1,1,5,2,2,1,1,1,2,1,1,1,2,2,1,3,1,3,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,2,2,1,2,1,1,1,2,2,1,1,1,1,1,1,1,3,1,3,1,3,1,1,1,1,2,2,1,2,3,2,1,1,1,1,3,2,2,1,1,2,2,2,3,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,2,1,2,1,2,1,1,1,1,1,2,2,1,2,1,1,3,1,1,1,2,1,2,2,1,1,1,3,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,2,2,1,3,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,4,1,1,2,1,2,4,3,1,1,1,3,2,1,1,1,1,3,2,2,1,1,1,2,1,2,1,1,3,2,2,1,1,1,1,1,1,2,1,3,1,2,2,1,1,1,1,2,1,1,4,1,1,1,1,5,1,1,1,1,1,2,2,1,1,3,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,2,1,2,1,1,1,1,1,1,1,3,2,1,1,3,1,2,2,1,1,1,2,1,1,1,1,1,6,3,1,1,1,1,1,3,4,1,3,1,4,2,3,2,2,1,1,2,3,3,2,1,1,1,5,2,4,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,2,2,1,1,1,1,3,3,1,1,2,3,2,2,1,2,3,2,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2,2,1,1,1,1,2,2,1,1,1,2,1,1,1,1,2,1,2,2,2,1,1,1,1,1,1,3,1,1,2,1,3,1,2,1,1,1,1,2,1,1,1,2,1,1,1,4,1,2,1,1,1,1,2,1,2,1,2,2,2,3,1,1,1,2,3,1,1,1,1,2,2,3,1,1,1,2,1,1,3,1,1,3,1,2,1,1,3,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,3,2,2,1,1,2,1,1,1,4,1,1,2,2,3,1,1,2,1,1,1,3,2,1,2,3,1,2,1,1,3,1,1,2,3,2,2,1,1,1,2,1,4,1,1,3,3,4,1,2,2,3,1,1,4,3,3,1,1,1,1,3,1,3,1,3,1,1,2,1,1,2,3,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,2,3,1,1,4,2,1,1,1,2,1,1,1,2,1,1,1,1,1,6,3,2,1,1,1,1,2,2,2,2,3,6,1,2,2,1,2,2,2,1,2,4,1,1,3,1,1,1,2,2,1,2,2,2,3,3,1,1,2,2,1,1,1,1,2,2,3,4,2,4,5,2,2,1,2,2,2,2,4,1,1,2,3,1,1,1,5,3,2,1,1,1,1,1,3,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,2,1,2,1,2,2,1,1,1,1,1,1,3,3,2,1,2,1,2,1,3,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1,1,1,2,1,1,1,1,3,3,1,2,1,1,1,1,1,2,1,2,1,1,2,3,1,1,2,2,1,2,1,1,1,2,2,1,3,1,1,2,2,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,3,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,2,1,1,2,1,2,1,1,1,1,2,1,1,1,3,1,3,2,1,3,1,3,3,5,1,1,1,3,2,1,3,1,1,1,2,1,3,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,2,4,2,2,3,1,1,1,2,3,4,4,1,1,3,5,2,1,1,1,1,1,3,3,1,2,1,4,1,2,1,1,1,2,2,1,1,2,1,2,3,2,1,1,2,1,2,3,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,2,2,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,5,1,1,1,1,1,2,1,2,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,2,2,1,1,1,1,1,2,1,1,1,1,2,3,1,3,3,2,2,2,1,1,1,1,2,3,2,3,2,1,1,1,3,1,1,1,1,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,2,1,2,1,2,1,3,1,3,1,1,1,1,2,1,1,2,1,1,2,2,1,1,2,2,1,2,1,2,1,1,4,3,3,2,2,4,2,3,3,2,2,1,2,1,1,1,1,4,4,1,4,1,1,2,1,1,1,1,1,1,1,2,3,1,1,2,1,1,2,1,1,3,3,1,1,1,1,2,1,2,3,1,1,2,1,2,1,1,1,3,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,2,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,3,1,1,1,1,1,1,1,3,2,3,1,1,1,2,1,3,1,2,2,2,5,4,2,1,1,3,2,1,2,1,1,1,3,1,3,1,1,1,2,3,2,1,3,1,2,1,2,2,4,1,2,1,4,6,1,1,1,2,1,1,1,4,1,1,1,3,1,3,1,1,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,3,1,2,1,1,1,3,2,1,1,2,1,2,2,1,2,3,3,3,2,2,1,1,1,1,2,1,2,1,1,1,3,2,2,2,1,1,2,1,5,3,3,3,2,2,1,2,4,1,1,1,1,2,1,1,2,1,1,2,2,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,2,1,1,1,1,3,1,2,2,1,2,2,1,1,2,1,1,3,1,1,2,1,1,1,1,1,1,3,2,2,1,1,2,1,1,4,3,3,1,1,1,1,1,1,3,1,1,3,1,1,3,1,2,1,3,3,1,3,1,1,1,3,1,1,1,3,1,1,1,3,1,2,1,1,3,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,6,1,1,1,1,1,1,2,2,1,1,1,1,1,2,1,3,1,2,1,3,2,1,2,2,3,2,3,1,2,1,1,2,1,1,3,1,1,1,2,1,2,1,1,2,1,2,1,1,1,1,1,4,2,1,1,2,1,1,3,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,2,2,1,1,1,1,2,1,1,3,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,3,2,1,2,2,1,1,1,2,1,2,1,1,4,1,2,1,1,1,2,1,3,1,3,2,1,2,1,1,1,2,2,1,4,3,1,1,2,1,1,1,1,1,1,3,1,2,2,4,3,3,1,2,2,2,1,2,2,2,2,1,1,1,1,1,1,1,3,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,3,1,2,1,1,1,3,1,1,1,3,1,1,1,1,1,2,2,1,1,1,1,1,1,3,2,1,1,1,2,1,3,1,1,2,1,1,1,1,3,2,1,1,1,3,2,2,1,3,1,1,1,2,1,1,1,1,2,1,1,1,3,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,3,2,2,1,1,1,2,2,2,1,1,1,3,1,1,3,1,3,1,2,1,1,1,2,2,3,3,1,1,1,1,2,1,1,4,1,2,1,1,3,1,2,1,1,1,2,1,1,1,1,4,1,2,1,1,1,2,1,1,2,1,2,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2,2,1,2,1,1,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,1,4,3,3,3,1,1,2,2,1,1,1,2,1,1,1,1,2,3,1,1,2,1,1,1,1,3,1,1,1,1,1,3,3,2,1,1,1,1,1,1,3,1,1,2,2,1,1,4,2,1,1,1,1,2,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,3,1,1,1,1,1,1,1,2,1,2,1,1,1,3,1,2,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,2,1,1,2,1,1,2,1,1,1,2,3,2,1,2,2,1,1,4,2,3,1,1,3,2,3,2,1,3,2,1,1,1,1,4,1,1,1,3,1,2,3,2,1,1,2,2,2,2,1,1,4,1,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,2,1,1,1,1,3,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1,1,3,1,2,1,1,3,4,2,2,1,3,1,1,1,1,1,1,1,1,3,2,1,1,1,4,2,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,3,1,2,3,1,2,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,3,1,2,2,1,2,2,2,1,1,2,1,1,1,1,2,2,1,1,1,2,2,1,3,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,2,1,2,1,1,2,3,5,1,2,2,1,1,2,4,2,1,1,2,1,1,1,1,1,1,1,1,2,2,1,1,2,2,2,2,1,2,2,1,1,1,2,2,4,1,1,1,3,2,2,1,1,3,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,2,2,1,2,2,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,2,1,1,1,3,3,1,1,1,1,1,1,1,1,1,3,1,2,1,1,1,3,2,2,2,1,1,1,1,1,2,1,4,3,1,1,2,2,1,1,1,1,1,1,1,2,1,2,3,2,1,1,1,2,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,4,1,2,1,4,2,1,1,1,3,1,3,1,1,1,2,1,1,1,1,2,2,1,3,1,1,2,1,1,1,2,2,2,1,1,1,1,3,1,1,2,2,2,1,1,2,1,4,1,2,2,2,1,4,4,1,1,1,1,2,2,1,2,1,1,1,2,2,1,1,1,1,2,3,3,1,3,2,1,2,1,1,1,2,3,1,1,1,1,3,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1,2,1,1,1,1,1,2,1,2,1,1,1,2,1,2,1,1,1,1,1,1,2,1,2,2,3,2,1,2,2,2,1,2,1,3,2,4,2,1,1,2,3,3,3,1,1,1,1,1,1,2,1,3,2,1,2,1,3,3,2,3,1,1,1,2,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,4,2,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,2,1,1,1,2,1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,2,1,2,2,1,1,1,1,2,1,1,2,1,1,2,1,1,1,3,1,1,2,1,2,1,3,1,1,1,5,2,1,1,1,1,3,2,1,2,1,2,1,2,3,2,1,1,4,3,1,2,4,2,1,1,2,3,1,3,1,2,1,2,2,2,1,1,1,2,1,3,1,2,3,1,1,3,1,1,2,3,2,1,1,1,2,1,1,1,2,1,1,1,2,1,3,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,3,1,1,1,1,1,1,1,1,2,1,1,5,1,2,1,2,3,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,4,2,1,1,4,1,1,1,1,1,1,1,1,1,2,1,1,3,1,4,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,3,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,2,1,2,1,3,3,1,4,1,1,1,2,2,1,5,1,1,1,2,2,1,1,1,1,4,1,1,2,2,1,2,1,2,1,1,1,1,1,2,1,1,1,1,4,2,4,1,1,3,1,1,1,2,3,1,1,1,1,1,1,2,2,1,1,1,2,1,1,1,1,4,2,1,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,2,1,3,1,1,1,1,1,1,2,3,1,2,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,2,1,1,2,1,2,4,4,1,2,3,1,1,1,2,1,2,2,2,2,3,1,2,1,1,1,1,2,1,1,2,1,3,1,1,1,2,1,1,1,2,1,1,1,3,3,3,1,2,1,1,1,2,1,1,2,2,3,1,1,2,3,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,2,2,1,3,1,1,1,4,2,3,1,1,1,1,1,3,2,2,1,1,1,2,3,1,2,1,1,1,1,5,1,1,5,3,3,1,2,1,1,1,1,2,1,1,5,2,1,2,1,1,1,1,1,1,1,2,2,1,3,3,3,1,1,1,4,5,4,1,1,1,1,3,1,1,1,4,3,1,1,3,2,1,2,1,1,2,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,1,1,1,1,2,1,1,3,1,1,1,1,1,1,1,1,3,2,1,2,4,2,1,1,1,2,1,1,2,3,2,2,1,2,1,2,1,1,4,1,1,3,1,2,3,1,1,1,3,2,1,1,1,1,1,1,2,1,1,3,2,1,1,2,1,1,1,2,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,2,1,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1,1,2,1,1,1,3,1,2,1,1,3,1,1,2,1,2,3,1,1,2,2,2,2,1,1,1,1,3,1,2,1,3,1,1,2,1,2,2,2,1,1,1,1,1,3,2,3,2,2,1,1,2,1,1,4,1,1,1,1,1,3,2,1,1,1,1,1,2,2,1,3,2,1,2,1,1,3,1,1,2,1,1,2,1,2,1,1,1,1,1,3,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,2,1,3,1,1,1,1,2,2,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,3,1,2,1,1,4,1,1,1,1,2,2,1,1,1,3,2,2,3,2,2,1,2,1,2,2,1,1,1,1,1,1,1,2,1,3,1,4,2,1,2,1,1,1,1,1,3,1,2,2,1,1,1,1,2,1,1,2,1,1,3,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,2,1,1,1,3,1,1,1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1,1,4,2,1,1,3,2,3,1,1,1,1,1,1,1,2,2,1,1,5,2,3,1,1,2,1,1,4,3,1,2,1,2,2,1,2,3,3,1,1,1,2,3,2,1,1,2,1,1,1,5,1,1,3,2,2,3,4,2,1,1,1,1,3,1,1,2,1,1,1,1,3,3,3,1,1,1,1,1,1,1,2,2,1,1,1,1,1,2,1,1,2,1,2,2,1,1,1,3,2,1,2,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,4,1,2,1,1,2,1,2,1,1,2,1,1,1,1,2,1,1,1,1,1,1,4,1,1,2,1,2,3,1,2,1,1,1,1,1,1,1,1,1,3,2,2,1,1,1,1,1,5,2,1,1,1,2,2,4,4,3,2,1,1,1,1,2,1,1,2,2,1,1,2,2,1,1,1,2,4,1,2,2,3,1,1,1,1,1,1,1,1,1,4,2,1,1,2,1,2,3,2,1,3,1,1,1,1,1,1,1,1,2,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,3,1,1,1,1,2,1,2,1,2,3,1,2,1,1,2,2,1,1,2,1,2,1,1,1,1,4,1,1,2,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,1,2,2,2,1,1,2,1,1,5,1,1,1,2,2,1,2,1,1,1,1,1,1,3,3,2,1,1,1,2,1,2,2,1,1,1,2,1,3,1,1,1,1,2,3,1,1,1,1,3,1,1,1,1,1,2,1,1,1,1,1,2,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,5,3,2,1,3,1,2,1,1,1,2,4,1,1,1,1,1,1,1,2,1,1,1,1,3,1,1,1,2,1,2,2,1,2,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,3,1,3,1,2,3,1,1,1,1,1,1,1,1,1,1,1,4,2,2,1,1,1,1,3,1,2,2,1,1,1,1,1,1,1,1,2,1,1,3,1,1,1,1,1,2,1,1,1,1,1,2,1,2,1,1,1,1,3,1,3,1,1,1,1,2,1,2,2,1,1,1,1,2,1,1,2,2,1,1,1,2,1,1,3,1,1,2,2,1,1,2,2,1,2,1,2,1,2,1,2,1,1,5,1,3,2,1,1,5,4,2,1,1,2,1,1,1,2,2,1,1,2,2,2,2,3,1,1,1,2,4,1,3,1,1,1,1,2,2,1,1,3,1,1,1,1,2,1,3,1,1,2,4,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,4,1,1,3,1,1,1,1,1,1,1,1,3,1,1,1,1,3,1,2,3,1,1,1,1,1,2,1,1,4,2,6,2,1,1,1,2,3,2,2,1,2,1,2,3,2,1,1,1,2,1,1,1,2,1,2,1,1,2,2,1,2,2,2,1,1,3,1,1,1,4,1,5,1,1,1,3,1,1,1,1,1,2,2,1,1,1,2,2,1,1,1,1,1,2,1,2,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,3,1,2,2,2,1,1,1,1,1,2,1,3,1,1,1,2,2,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,2,2,1,1,4,1,1,1,1,1,2,2,2,1,1,1,2,1,1,1,1,5,1,1,1,1,1,2,2,2,2,2,1,1,1,1,1,5,4,1,1,3,2,1,1,1,3,1,1,3,1,1,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,2,2,2,1,1,1,3,1,2,1,1,2,1,1,2,1,2,2,1,1,4,2,1,1,2,2,1,1,2,1,1,1,1,4,1,2,2,1,1,1,3,1,1,2,1,2,2,1,1,1,1,1,3,3,1,2,1,1,1,1,1,1,3,2,2,1,1,1,1,1,2,1,2,1,3,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,1,2,1,2,1,1,1,1,1,3,2,2,1,2,1,1,1,1,1,1,1,1,3,4,2,1,1,1,2,5,3,2,2,1,1,2,3,2,1,1,2,2,3,2,1,1,1,1,2,1,2,1,1,4,2,1,1,1,4,1,1,2,3,1,2,1,1,1,1,1,6,1,1,1,1,1,1,1,4,2,1,1,2,2,3,2,2,2,1,1,1,1,2,1,1,1,4,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,2,2,3,1,1,1,2,1,1,1,1,1,1,4,2,2,1,1,1,1,1,2,1,4,1,1,1,2,2,1,3,2,1,1,1,3,1,1,1,1,3,1,1,2,1,2,2,3,1,1,1,1,1,2,1,2,1,1,1,1,2,1,2,1,2,2,1,1,1,1,1,1,1,4,1,1,1,1,3,3,1,1,1,3,2,2,1,1,2,3,1,1,1,1,1,3,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,3,2,1,1,1,1,2,3,2,2,1,1,2,1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,2,1,2,1,1,1,1,2,1,3,1,2,1,1,2,3,1,1,1,2,2,1,1,1,2,2,1,2,2,1,1,1,2,1,2,2,3,1,4,1,1,4,2,3,1,1,1,1,2,2,2,2,2,2,2,1,3,2,1,1,2,2,1,4,1,1,1,2,2,2,3,1,1,1,2,1,1,1,2,1,1,2,1,3,1,2,1,1,1,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,3,1,1,1,1,1,1,3,1,1,1,2,2,1,1,3,2,1,1,1,2,3,3,1,1,1,2,1,1,1,1,2,3,1,1,2,3,1,1,1,1,2,2,2,1,3,2,2,2,2,2,1,1,1,1,2,1,2,1,2,1,2,4,4,1,3,1,1,1,1,1,1,2,1,4,3,2,1,1,4,1,1,1,4,2,2,3,1,1,3,1,5,4,1,2,2,1,1,1,1,2,1,1,1,2,1,2,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,2,1,2,1,1,2,2,1,1,1,1,4,1,3,3,3,1,2,3,2,2,1,1,1,1,1,2,3,4,1,1,2,3,1,2,1,2,1,2,1,1,2,3,2,3,2,3,1,1,2,2,1,2,1,2,2,1,1,1,1,1,2,1,2,1,2,2,1,1,3,1,1,1,1,1,1,1,2,1,2,1,2,1,2,2,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,2,1,1,1,1,2,1,2,4,2,1,2,2,1,1,5,2,1,1,1,2,1,5,5,1,2,1,1,1,2,3,1,2,1,4,2,5,2,2,2,1,1,2,4,1,3,2,1,1,2,2,5,3,3,1,1,4,3,1,2,1,2,2,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1,1,1,2,1,1,2,1,2,1,1,2,1,3,3,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,3,2,1,1,1,1,4,1,1,3,1,5,2,1,1,1,1,1,2,3,2,3,1,1,1,1,1,2,2,1,1,2,6,1,1,1,1,2,3,4,1,1,2,1,2,2,1,2,3,1,1,1,1,1,1,5,1,1,2,1,1,2,1,1,2,2,1,1,1,2,2,1,1,1,1,2,3,3,2,2,2,2,1,2,2,1,2,2,1,1,2,1,3,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,2,1,2,1,1,1,2,3,1,1,1,1,1,1,1,2,1,2,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,3,1,1,2,3,1,1,2,2,1,2,1,1,1,2,2,1,2,1,2,1,1,2,1,2,1,2,1,2,2,2,2,1,5,2,1,2,2,4,1,2,3,1,1,1,3,2,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,2,3,2,1,1,3,1,1,2,1,1,1,1,1,2,1,1,2,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,3,1,1,1,1,1,3,1,1,3,1,1,1,3,1,1,1,2,2,1,1,1,3,1,1,1,1,1,1,1,1,1,1,3,2,2,2,1,3,1,1,2,1,1,1,1,1,2,1,2,3,1,1,1,1,3,1,1,1,1,2,1,1,2,2,1,2,3,3,2,1,1,3,1,1,2,1,3,1,1,1,1,2,1,2,2,2,1,1,2,3,1,1,2,2,3,1,2,1,2,2,1,1,1,4,1,3,3,1,2,1,2,2,1,1,2,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,3,1,1,1,2,1,2,2,1,1,1,1,1,2,1,1,2,1,2,3,1,1,2,4,1,1,1,2,3,1,3,1,2,1,1,2,3,2,1,2,1,2,2,6,2,1,2,2,2,1,1,1,2,1,2,1,1,3,1,2,2,1,1,1,1,1,1,2,1,1,1,1,1,3,3,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,2,1,2,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,1,1,2,3,1,1,2,1,2,1,1,1,1,3,1,1,1,1,1,1,1,2,2,1,1,1,2,3,2,1,3,1,2,1,1,2,2,1,2,1,1,3,1,5,2,1,1,1,3,2,1,1,2,1,1,1,2,2,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,3,2,1,1,1,1,1,2,1,1,1,3,2,1,1,1,2,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,3,3,1,1,1,1,1,3,1,2,2,1,1,2,2,2,2,1,1,3,3,2,1,1,1,2,2,3,1,4,1,1,1,2,1,1,1,1,1,1,1,1,3,2,1,1,1,1,2,1,1,1,1,3,1,2,1,1,2,2,1,1,2,2,1,3,1,4,1,1,1,1,2,2,1,1,1,2,1,1,2,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,2,1,1,1,2,2,1,1,1,3,1,1,1,1,1,1,1,2,1,1,1,1,3,2,1,1,2,1,1,2,4,2,3,1,1,1,1,2,2,2,3,1,1,2,1,3,1,3,2,2,3,2,2,2,1,1,2,1,1,1,1,2,1,1,2,1,3,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2,2,2,1,1,2,2,1,2,1,2,1,2,1,1,1,2,2,2,1,1,2,1,1,1,2,1,1,3,1,1,2,1,1,2,1,1,2,3,1,1,1,2,4,1,2,1,3,2,1,2,1,2,2,1,3,1,1,2,1,2,4,2,2,1,1,1,3,3,3,1,1,3,2,1,1,2,2,1,1,1,1,1,2,2,1,1,1,2,4,3,1,1,1,1,1,1,1,1,2,2,1,2,2,1,1,1,2,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,2,1,1,2,1,1,1,1,1,3,1,1,2,1,1,1,1,3,1,2,1,4,1,1,1,1,1,1,1,1,2,2,1,2,3,2,2,1,3,1,1,2,2,1,2,2,1,2,1,3,1,4,2,1,1,2,3,1,1,1,2,1,2,1,1,1,1,7,2,2,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,1,1,3,3,1,3,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,3,2,1,1,1,1,2,2,2,1,1,4,1,1,1,1,1,3,1,2,2,2,2,1,2,2,3,1,2,2,4,2,1,5,3,1,2,2,1,1,1,4,1,5,2,1,1,3,3,1,1,1,2,1,1,1,3,2,2,2,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,3,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1,2,2,1,2,1,1,1,2,1,1,2,1,2,2,1,2,3,1,1,2,3,1,1,1,1,1,2,3,2,4,1,1,3,2,2,4,2,2,1,1,1,1,2,2,1,2,2,2,1,1,5,2,1,1,1,1,4,1,2,1,2,1,1,2,2,2,6,1,1,1,1,1,1,1,2,4,1,1,2,1,2,1,1,1,1,1,1,1,2,1,1,3,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,4,1,2,2,1,1,1,3,2,2,1,3,1,1,1,1,2,2,2,1,1,1,1,4,3,1,1,1,1,2,3,1,3,1,1,2,1,1,1,2,2,1,1,2,2,3,4,1,2,2,1,1,3,1,4,1,2,3,1,3,1,1,1,5,2,1,1,1,1,2,5,1,3,1,1,2,1,1,1,1,2,1,3,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,2,2,2,1,2,1,1,1,2,2,2,2,2,2,1,1,1,1,2,4,1,2,1,1,1,4,2,1,1,3,2,1,1,1,1,2,2,1,3,2,1,2,1,2,1,1,2,2,1,1,2,6,1,1,1,1,1,3,1,4,4,1,2,1,1,2,2,1,1,1,1,1,1,3,4,3,3,2,1,2,3,2,1,3,1,3,1,1,1,1,1,1,2,3,1,2,1,1,3,1,1,1,2,1,1,1,1,1,1,2,1,1,4,1,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,4,2,1,1,1,1,2,2,1,1,2,1,3,3,2,3,1,2,3,1,1,1,1,1,1,2,1,1,2,1,1,1,3,1,2,3,2,1,1,1,2,1,1,2,1,4,1,1,1,2,3,3,2,1,1,2,1,2,1,1,2,1,1,2,3,1,1,1,1,1,1,3,3,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,2,1,4,1,1,3,1,2,1,1,2,1,2,1,1,2,3,1,1,1,1,1,1,4,1,1,1,2,1,1,1,1,2,1,2,1,2,1,3,1,1,3,2,2,1,2,2,1,2,2,2,1,1,1,1,2,1,5,1,2,1,2,3,1,1,4,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,2,1,1,1,3,1,4,1,2,1,2,1,1,1,1,1,1,4,1,2,1,5,3,2,1,1,2,1,2,1,2,3,1,1,1,3,2,1,2,3,4,2,1,2,1,1,3,1,5,1,1,1,5,1,1,1,2,2,3,1,1,4,3,2,3,2,1,1,2,3,2,1,1,2,1,2,2,2,1,1,3,2,2,1,2,1,1,1,1,1,1,1,1,2,2,1,1,2,1,1,1,3,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,3,1,2,1,1,1,2,1,2,2,2,1,2,1,1,2,1,2,3,1,4,3,1,1,1,5,2,1,1,2,1,2,2,2,1,1,2,2,1,1,1,1,1,2,1,1,2,3,1,2,3,1,3,1,1,1,1,1,2,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,2,1,1,1,1,1,2,2,1,5,1,2,3,1,2,1,2,1,1,2,2,2,2,2,5,1,1,1,2,3,1,1,1,1,3,1,3,1,1,1,1,2,1,1,1,2,2,1,1,1,1,2,4,1,1,2,2,1,2,3,2,2,1,2,3,1,2,2,1,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,2,1,2,2,1,1,1,3,1,1,2,5,2,2,1,1,2,1,2,2,1,1,3,2,3,1,1,1,2,2,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2,1,2,2,1,1,1,1,2,1,1,1,1,1,2,1,1,3,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,2,1,2,1,2,1,1,1,1,1,2,3,1,2,1,2,1,2,1,1,1,4,3,2,2,1,1,1,1,1,1,1,1,1,1,3,4,1,3,1,1,1,2,1,1,1,1,1,3,3,1,3,1,1,1,3,3,3,1,1,2,3,4,2,1,2,4,1,3,3,5,1,1,3,2,2,2,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,3,1,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,4,1,1,1,4,1,1,1,1,1,1,1,2,1,1,1,2,2,2,2,2,2,1,1,2,2,1,1,1,2,2,2,1,1,1,1,5,2,2,1,1,2,1,2,3,4,3,1,1,2,2,2,2,1,2,1,2,2,1,1,1,2,4,2,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,4,2,1,1,1,1,1,1,1,1,1,3,2,1,1,2,1,1,3,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,3,2,1,1,1,1,1,2,2,1,2,1,1,1,1,1,1,1,1,1,3,1,1,2,3,1,2,2,1,1,4,1,3,2,1,1,1,1,1,2,1,5,1,3,1,4,4,1,1,1,2,1,2,5,3,2,1,2,1,1,2,2,3,1,6,1,3,1,1,1,2,3,1,4,1,1,3,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,3,1,1,1,1,2,1,2,2,2,1,2,2,1,1,3,4,1,2,1,1,2,3,1,1,1,4,2,5,3,1,3,2,1,1,1,1,2,1,3,1,1,1,1,2,2,2,1,1,2,3,1,1,3,1,1,2,2,3,1,1,1,1,2,1,1,1,3,1,1,1,1,1,3,1,1,2,1,1,1,4,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,1,2,1,1,2,1,3,2,1,3,1,2,1,3,1,1,2,1,2,1,1,3,1,2,2,1,2,2,1,1,2,1,3,1,3,2,1,2,1,1,2,3,1,1,3,1,1,3,1,1,1,1,1,1,1,1,2,1,1,1,3,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,3,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,2,1,1,2,1,1,2,2,1,2,1,1,1,1,3,3,2,1,3,1,2,1,1,2,1,1,2,1,3,1,2,1,1,1,1,1,2,2,3,2,1,1,2,1,2,1,2,1,2,1,4,1,3,1,1,2,3,1,1,1,2,1,2,4,4,4,1,2,2,1,1,1,1,2,2,1,2,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,2,2,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,2,2,2,2,1,2,1,2,1,1,1,2,3,2,1,2,1,1,1,3,2,1,1,2,1,4,1,1,1,1,1,3,1,1,1,2,2,1,1,1,1,2,1,1,3,1,2,2,3,1,2,1,1,1,3,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,3,2,1,1,1,3,1,1,1,1,1,1,2,1,1,2,1,1,2,2,1,5,1,1,1,3,2,1,2,1,3,2,1,1,3,2,1,2,2,2,1,1,1,1,2,2,1,2,1,2,2,2,1,5,4,1,1,1,1,1,1,3,2,2,1,1,2,1,1,1,3,1,2,1,1,2,1,2,1,1,2,1,1,3,1,1,2,1,2,5,1,1,1,1,3,1,1,3,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,4,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,2,1,1,1,1,2,1,1,2,2,2,2,2,1,1,1,2,4,1,1,1,1,1,2,1,1,1,1,1,3,2,1,1,4,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,2,2,1,4,1,1,1,1,1,2,2,1,1,1,2,1,1,2,3,2,1,1,2,2,2,1,2,2,2,3,2,1,2,2,1,1,1,1,1,1,3,3,1,1,1,1,1,3,2,1,1,1,1,1,2,2,1,1,1,2,1,1,1,2,2,2,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,3,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,2,2,1,2,1,1,1,1,1,1,2,1,1,2,2,2,2,1,1,1,1,1,2,1,1,1,4,2,1,4,2,1,1,4,3,1,1,1,1,2,2,2,2,1,1,1,4,2,2,1,3,1,1,2,1,1,1,1,2,2,1,1,3,1,3,1,2,1,1,1,1,3,2,1,1,2,2,1,1,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,3,1,4,1,2,1,1,1,2,1,2,1,1,1,2,2,1,1,1,3,2,1,2,3,1,1,1,1,2,1,2,2,1,2,2,2,1,3,1,4,3,3,2,1,1,2,2,3,2,1,1,2,2,1,2,1,1,2,1,1,3,1,2,1,2,1,2,3,2,1,1,1,1,1,2,1,1,2,2,1,3,1,1,4,2,2,1,2,2,2,1,3,2,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,2,1,3,2,2,1,2,1,1,1,2,1,1,3,2,2,2,1,1,1,2,1,2,3,1,3,1,1,2,1,2,4,1,1,2,2,1,1,1,1,2,1,3,2,3,2,1,1,3,4,1,3,1,2,5,3,1,1,2,1,2,4,1,1,1,1,2,1,2,1,1,2,3,1,3,4,1,1,1,1,2,1,1,2,1,2,2,2,1,2,3,2,1,1,3,1,3,1,1,1,2,1,2,1,1,3,1,1,1,1,2,1,1,1,1,1,1,3,1,1,2,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,2,2,2,3,1,3,1,1,3,1,5,1,1,2,1,2,1,2,1,1,1,1,1,1,1,1,2,4,2,1,2,2,2,3,3,2,2,1,1,1,2,1,1,1,1,2,1,2,2,1,1,1,2,4,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,2,1,1,1,1,1,3,1,3,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,2,2,1,1,1,1,4,1,1,2,2,1,2,3,2,1,1,1,1,3,1,1,1,1,1,2,1,1,3,4,1,2,1,1,2,4,1,2,2,1,3,1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,3,1,1,1,2,4,1,2,3,1,1,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,2,2,1,1,2,1,1,1,1,4,2,1,2,1,2,1,4,3,2,2,1,3,1,2,1,2,1,2,1,1,1,5,1,2,1,1,1,2,2,2,1,1,1,2,3,1,4,5,2,3,1,1,1,1,1,2,1,1,2,1,1,1,1,4,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,3,1,2,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,2,1,1,1,2,3,1,1,2,2,2,1,2,1,1,1,1,1,1,2,3,2,1,1,1,1,1,2,7,1,5,1,1,1,1,1,3,1,2,3,1,1,1,2,1,1,1,2,3,1,2,1,3,4,4,2,4,2,2,2,1,1,3,1,1,3,1,3,1,2,1,1,1,1,5,1,1,1,1,2,1,1,4,1,2,2,3,2,1,2,2,2,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,2,1,2,1,1,2,1,1,1,3,1,1,1,1,1,2,1,1,2,2,1,1,3,4,2,1,1,1,1,4,3,2,1,1,4,1,1,1,1,1,2,2,1,3,1,3,2,1,1,4,3,1,2,2,2,1,2,1,2,2,1,3,3,1,1,1,3,1,1,1,1,2,2,2,2,2,2,1,1,2,2,2,2,2,1,1,1,1,5,2,1,3,1,2,2,1,1,3,1,2,1,2,1,4,1,1,1,2,2,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,3,1,3,2,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,3,2,3,1,1,2,2,2,1,2,1,1,1,1,1,1,3,2,1,1,1,3,2,1,1,2,2,4,3,1,1,1,1,4,2,1,2,2,3,4,1,1,1,2,2,1,1,2,1,1,1,2,1,1,1,1,1,1,3,2,4,2,2,1,1,1,3,2,1,1,3,1,1,1,1,1,1,1,1,1,1,3,1,3,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,3,1,1,1,1,2,3,2,2,1,1,2,1,1,1,1,1,2,1,2,1,1,1,2,2,1,3,1,2,2,1,1,1,1,2,1,1,2,5,1,1,1,1,2,1,3,1,1,1,1,1,2,1,1,1,1,3,1,2,1,1,1,1,1,1,1,2,1,1,1,3,1,1,1,1,2,2,2,1,2,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,3,1,1,1,2,1,1,2,2,1,1,1,2,1,1,1,3,2,2,1,1,2,1,1,1,1,4,1,1,1,2,4,2,6,1,1,1,1,1,1,3,1,1,2,1,1,2,1,2,1,1,1,1,1,2,4,2,3,1,3,4,1,1,1,3,2,1,1,1,2,3,1,2,1,1,2,2,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,4,2,1,2,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,3,3,1,1,2,1,3,1,2,1,1,1,1,1,1,2,1,1,2,1,6,1,2,3,3,1,2,1,2,1,6,1,4,3,1,2,2,2,1,2,3,2,2,1,2,1,2,1,5,1,1,1,1,1,2,2,1,2,1,3,2,1,3,3,1,1,1,2,2,2,1,2,2,4,2,1,1,1,1,2,1,3,1,1,1,2,1,2,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,3,1,3,1,2,2,1,1,1,1,1,1,1,2,3,1,2,2,1,5,2,3,1,1,1,1,1,1,2,4,3,3,1,1,2,3,2,1,2,3,1,1,1,1,1,2,4,3,2,2,1,1,3,3,2,3,1,1,2,1,4,5,1,2,1,2,1,1,1,2,5,1,1,2,1,4,1,1,2,1,3,4,1,2,1,1,2,1,2,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,3,1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,2,1,1,2,1,1,1,2,1,1,1,2,2,1,1,1,1,1,2,3,1,1,4,1,1,1,1,2,1,1,1,5,2,2,1,2,2,1,1,1,1,1,1,1,1,1,3,1,2,1,1,1,1,2,3,1,2,2,2,1,1,1,1,2,2,1,1,2,1,1,1,1,2,1,2,2,2,1,2,1,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,1,1,1,2,1,1,3,1,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,2,4,1,1,1,2,3,4,1,1,1,1,1,1,1,3,2,2,1,2,2,3,2,1,1,1,4,1,1,1,1,1,2,1,2,1,1,1,1,2,2,1,2,2,1,1,1,1,1,2,1,2,1,1,1,1,1,2,3,1,4,2,2,2,1,1,1,1,1,1,2,1,1,1,1,2,1,4,1,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,1,2,1,2,1,2,4,3,1,1,1,1,1,1,3,2,1,2,1,1,3,2,1,1,1,1,1,1,1,2,1,1,2,1,2,2,1,1,6,1,1,1,2,1,1,3,2,2,1,1,3,2,1,4,2,2,2,1,1,1,2,3,2,2,1,2,1,3,2,1,2,2,2,4,1,5,1,1,1,2,1,1,2,1,4,1,3,2,2,1,1,1,1,1,1,1,2,2,2,1,4,1,1,1,1,1,2,1,2,2,1,1,1,1,2,2,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,2,2,1,1,2,1,1,1,3,2,1,1,3,2,1,1,3,3,1,1,1,1,3,1,2,1,1,1,1,1,1,3,1,3,3,1,1,2,1,1,1,1,1,2,2,3,3,1,2,2,1,1,1,1,5,2,1,1,2,3,1,1,3,2,1,3,2,1,3,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,2,1,2,1,2,1,1,1,2,1,1,2,1,1,2,2,1,2,3,1,2,2,2,1,4,1,1,1,1,1,3,1,1,1,2,1,3,1,1,1,1,2,1,1,1,1,2,1,1,3,1,2,1,2,2,1,1,1,1,2,3,1,1,1,2,1,3,1,1,1,2,1,1,2,1,1,1,1,3,1,1,1,1,3,3,2,1,2,1,3,1,4,1,1,1,4,1,2,1,1,2,1,1,1,1,1,3,2,1,3,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,2,3,2,1,1,3,2,1,5,1,2,2,1,2,1,1,1,1,2,2,2,2,2,1,1,1,3,3,3,1,1,5,2,1,2,2,4,1,1,1,1,1,1,2,3,1,1,2,5,1,2,2,1,1,1,1,2,2,2,1,1,1,2,2,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,2,1,1,1,2,1,1,1,1,2,2,2,2,2,1,3,1,1,1,2,1,1,2,1,1,1,3,3,1,1,1,1,1,1,1,1,3,2,1,3,3,3,1,4,2,4,2,1,1,1,3,1,1,2,2,1,1,1,2,1,2,1,2,3,2,1,2,1,4,3,2,1,1,1,4,3,1,1,1,2,2,2,1,1,1,1,3,4,1,1,1,1,2,4,1,1,1,1,1,1,2,1,1,1,1,3,4,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,3,6,1,2,1,3,2,1,1,1,1,2,1,3,2,2,1,2,2,2,1,1,1,2,2,2,1,1,1,2,2,2,4,2,3,1,2,1,1,2,2,1,2,1,1,1,1,1,1,1,1,2,3,2,1,2,1,1,1,1,1,1,1,3,1,1,1,2,1,2,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,2,1,1,1,1,2,3,1,1,3,1,3,1,1,2,2,2,1,1,1,4,1,1,1,3,2,2,5,2,1,2,2,2,6,3,1,2,1,3,2,1,2,1,3,1,4,1,1,3,1,1,1,1,1,1,2,1,1,2,1,1,3,1,1,1,1,1,1,2,1,1,1,1,2,1,1,2,2,1,1,1,2,1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,2,2,3,1,1,1,1,6,1,1,1,1,1,3,1,1,2,1,2,1,1,2,1,1,1,1,1,1,1,1,2,2,1,2,2,1,1,2,3,1,2,1,1,1,1,2,2,3,1,1,2,1,1,2,3,1,2,3,1,1,1,1,1,3,2,1,4,2,1,1,1,1,1,2,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,2,2,2,3,1,1,2,1,1,1,3,3,2,1,1,1,2,1,2,2,1,1,3,1,2,1,1,2,1,1,2,1,1,3,1,1,1,1,2,2,1,1,1,1,2,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2,1,1,1,2,1,1,1,2,1,5,1,1,1,2,1,1,1,1,1,2,2,1,1,1,1,1,1,5,1,1,1,1,1,2,1,1,1,4,1,2,1,1,1,2,2,3,1,3,1,2,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,3,2,2,2,2,1,1,2,1,1,1,3,2,1,3,1,1,3,2,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,4,1,2,2,1,3,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1,1,1,3,2,2,1,1,1,2,2,1,1,1,1,1,2,1,2,2,2,1,1,1,1,2,1,3,1,1,1,2,1,1,1,1,2,1,1,3,2,1,2,1,1,2,2,1,1,2,1,2,3,1,1,1,3,2,1,1,2,1,1,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1,3,1,1,4,1,1,3,2,1,1,3,1,1,1,1,2,1,1,1,2,1,1,1,2,3,1,1,1,2,2,1,1,1,1,1,1,1,3,3,1,1,1,3,1,2,1,1,1,1,1,1,1,2,1,1,3,1,1,2,1,1,3,1,2,1,3,1,2,1,1,2,3,1,1,1,1,1,1,1,3,2,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,3,2,1,1,2,1,1,1,1,3,4,1,5,2,1,1,3,1,2,1,1,3,1,1,1,3,3,1,1,1,1,1,1,2,1,2,1,2,1,4,1,2,2,1,1,1,3,1,1,1,2,1,1,2,2,1,1,1,2,1,1,1,1,4,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,2,1,1,1,1,2,2,1,2,2,1,1,1,1,1,1,1,3,1,3,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,1,2,1,2,3,4,4,1,1,1,2,1,3,2,2,1,1,1,1,2,2,1,2,1,1,2,1,1,1,1,1,2,4,2,2,2,2,3,1,2,2,1,1,1,1,2,1,3,1,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,3,4,3,2,1,1,1,3,1,1,2,4,4,1,1,1,5,2,2,2,1,1,1,1,5,1,1,1,2,2,1,1,1,1,1,2,2,1,2,1,2,2,3,1,2,2,3,2,1,2,1,1,2,1,2,3,1,2,3,2,2,1,4,1,1,1,3,1,1,1,2,1,1,2,2,1,1,1,1,1,3,1,2,2,3,2,1,2,1,1,1,1,1,1,3,1,1,1,4,1,1,1,1,1,1,1,1,1,2,2,1,2,1,1,1,3,2,2,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,1,1,2,2,1,1,1,3,1,2,1,1,2,2,1,4,1,1,2,3,1,2,4,3,2,1,2,3,2,2,1,2,1,1,2,1,2,1,2,2,2,2,1,1,3,2,2,1,1,2,1,1,1,1,1,1,2,1,3,2,1,1,1,1,2,1,1,1,2,1,2,1,1,1,4,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,3,1,1,3,1,1,2,1,1,2,1,1,2,1,1,1,1,2,3,1,1,1,1,1,3,1,1,3,2,2,1,1,2,5,2,4,1,1,2,3,3,2,2,1,1,2,1,1,1,1,2,1,3,1,1,1,2,1,1,4,4,2,1,2,3,1,1,4,2,3,1,1,1,1,1,1,1,1,4,2,1,2,2,1,1,1,1,4,1,2,1,1,1,1,2,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,2,1,1,1,3,1,1,1,1,1,1,2,2,1,1,1,3,2,1,1,2,1,1,2,3,1,2,1,1,3,4,2,1,1,2,3,1,1,2,2,1,1,1,2,2,4,3,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,2,1,1,1,1,3,1,1,2,1,1,2,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,2,1,1,2,1,1,1,2,2,2,2,1,4,3,1,2,1,2,1,1,1,1,1,1,1,3,1,3,2,1,1,2,4,1,1,1,2,4,1,2,1,1,2,3,1,3,1,1,1,2,3,1,1,2,2,1,1,2,1,2,1,1,1,1,3,2,2,1,1,2,1,1,1,1,1,1,1,2,1,2,2,1,2,1,1,1,1,1,1,3,1,1,2,1,1,2,1,1,1,1,2,1,1,2,1,1,1,3,4,2,1,1,2,1,1,1,2,3,3,2,1,1,1,6,2,2,1,1,1,2,1,1,1,1,3,2,1,2,1,1,2,2,1,3,1,2,2,2,1,2,1,1,1,1,1,2,1,1,3,1,5,5,4,1,1,1,1,1,1,2,2,2,2,1,1,1,5,2,1,1,1,3,1,2,1,7,1,1,1,1,3,1,1,2,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,3,1,1,1,1,1,1,2,1,1,2,1,1,2,2,2,1,1,1,2,1,1,1,1,1,2,3,1,1,2,1,1,1,2,1,1,5,1,3,3,1,1,1,1,1,2,1,1,2,1,1,1,1,1,4,1,1,1,1,2,2,1,1,2,1,3,1,3,2,2,2,1,1,1,1,1,1,3,1,1,1,2,3,2,1,1,1,1,1,1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,3,1,1,2,1,1,1,1,3,1,1,1,3,1,1,4,2,1,2,1,3,1,1,1,2,3,1,1,1,3,2,3,2,2,1,1,1,1,1,1,1,3,3,1,2,1,1,1,2,1,2,1,1,1,1,3,2,2,3,1,2,2,1,2,1,3,1,1,1,1,1,2,5,1,1,1,1,1,2,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,2,2,2,1,1,1,2,2,3,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,3,1,1,2,2,1,1,1,3,1,1,1,3,1,1,2,2,2,1,1,2,4,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2,1,2,3,1,1,1,2,1,2,2,1,2,1,2,2,1,3,4,3,3,1,2,2,2,1,1,2,1,3,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,3,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,2,2,1,1,1,1,1,1,1,3,1,1,1,2,1,1,1,1,1,2,2,1,4,1,2,1,1,1,1,4,1,1,3,2,1,2,1,1,1,2,1,1,1,1,2,1,3,4,1,3,1,1,1,1,2,2,1,2,1,1,1,1,4,2,1,1,1,1,2,2,4,1,1,1,2,1,2,3,2,1,1,2,3,2,2,2,1,2,1,2,2,2,1,1,1,3,1,1,1,1,1,1,2,2,1,1,1,1,2,1,1,2,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,3,1,2,1,2,1,1,1,1,3,2,1,1,1,2,1,3,1,2,2,1,1,2,2,3,2,1,1,1,1,1,1,2,2,3,1,1,2,3,2,2,1,3,3,3,3,3,3,1,1,1,1,1,1,1,2,3,2,1,1,1,2,2,1,4,2,2,1,1,3,2,1,2,1,1,2,2,3,1,2,3,2,4,1,3,1,1,2,1,3,2,1,1,2,1,1,1,1,1,1,1,3,1,1,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,2,1,3,1,3,1,1,1,1,1,1,1,2,1,2,1,3,1,3,1,1,1,2,1,3,2,1,2,1,1,1,2,1,3,1,1,1,1,1,1,1,4,3,1,3,1,1,6,2,1,1,2,2,1,3,3,1,1,2,4,2,1,2,1,2,3,1,1,2,3,2,2,5,2,5,1,3,1,1,1,1,3,1,1,2,1,1,1,3,1,1,1,2,2,1,1,4,2,2,1,1,1,1,2,1,1,3,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,2,1,1,2,1,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,2,2,1,1,1,1,2,1,2,2,1,2,3,2,1,2,1,4,3,1,1,1,4,1,4,1,1,1,2,2,1,1,2,1,3,1,1,2,2,2,2,1,2,2,1,2,4,2,2,1,1,1,1,1,1,2,3,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,3,1,1,1,2,2,1,1,1,1,2,2,1,4,3,1,1,3,1,1,3,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,2,1,1,1,1,1,1,2,4,3,2,1,2,1,1,3,2,1,1,1,1,1,2,1,2,2,1,1,1,1,2,1,2,1,1,1,1,2,1,4,1,1,1,1,1,2,3,1,1,3,2,1,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,3,1,1,3,1,1,1,2,2,1,1,3,1,1,2,1,1,2,3,1,1,1,2,1,4,1,3,2,2,2,1,4,2,3,5,3,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,2,4,1,1,3,1,1,1,1,3,1,1,2,1,2,1,2,2,1,1,3,2,3,2,1,2,1,3,2,1,2,3,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,3,1,1,1,1,1,2,1,1,1,3,1,2,2,1,2,1,1,2,1,1,3,2,3,1,2,4,1,1,1,3,2,1,2,1,1,1,1,2,1,2,1,1,3,2,4,1,1,1,1,4,2,1,1,2,2,1,5,1,1,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,4,2,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,2,3,1,1,1,3,1,4,1,1,2,1,3,1,1,1,1,2,2,1,1,1,2,1,2,2,2,1,2,1,1,1,1,1,1,1,2,1,2,4,1,1,1,3,2,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,2,3,1,1,1,1,2,1,1,1,1,3,2,2,5,2,2,1,1,1,1,1,1,1,1,1,2,1,1,3,1,1,1,1,1,1,2,3,4,1,1,2,2,1,1,3,1,1,3,1,3,3,3,2,2,1,1,1,1,2,2,1,2,2,1,1,1,4,1,2,1,1,1,2,1,1,1,1,1,1,1,1,2,3,1,1,1,1,2,1,2,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,5,1,1,1,1,3,1,3,1,1,2,1,1,1,1,1,1,2,1,2,2,1,1,1,1,1,1,1,1,1,4,1,2,2,1,2,1,1,2,1,1,2,3,1,1,1,1,1,2,1,1,2,1,3,2,4,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,3,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,2,2,1,2,1,1,2,1,1,1,1,1,3,2,1,1,2,1,1,1,2,2,1,1,1,1,1,2,1,1,3,3,1,1,2,1,3,2,1,2,2,5,2,1,2,1,1,3,1,1,1,2,2,1,1,2,1,1,2,1,2,1,1,2,2,2,1,1,3,2,1,2,1,1,2,2,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,2,1,1,2,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,2,2,4,1,1,2,1,1,2,2,2,1,2,1,2,1,2,2,1,3,2,1,1,2,2,1,1,1,1,2,1,2,3,2,3,1,1,1,1,1,1,2,1,1,1,1,2,1,3,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,1,2,1,1,1,1,3,1,1,1,3,1,2,1,1,1,1,2,2,1,4,4,2,1,1,1,2,1,1,4,2,1,1,1,1,1,1,1,1,2,1,1,1,1,3,1,1,1,1,2,2,1,1,1,1,1,1,2,1,2,2,2,2,3,1,1,1,1,3,2,2,1,1,2,1,1,2,1,1,1,1,2,3,1,1,2,1,2,1,1,1,1,2,1,1,1,1,2,1,2,1,1,1,4,1,1,1,2,1,1,1,1,2,1,2,1,1,1,1,2,1,2,2,1,3,1,1,1,1,1,1,3,2,2,1,2,3,4,2,1,1,1,2,1,1,1,2,1,1,1,3,2,2,1,1,2,1,1,1,1,1,1,1,1,2,1,3,1,1,2,1,1,1,1,1,1,1,2,1,4,1,1,2,1,1,1,2,1,1,1,2,3,1,4,2,2,1,1,1,2,1,1,1,1,1,1,1,2,1,2,2,1,1,4,1,1,1,1,1,1,2,1,1,2,2,1,2,1,2,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,6,2,2,2,1,2,3,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,3,1,3,1,2,1,2,1,1,1,1,1,2,1,4,1,1,1,1,2,1,2,1,1,2,3,1,1,3,2,2,2,1,1,1,1,1,1,2,3,1,2,2,2,2,3,1,1,1,1,1,2,1,2,1,1,1,3,1,1,2,1,3,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,2,1,1,2,1,1,3,1,1,2,1,1,1,2,2,2,1,2,1,1,3,1,2,1,1,1,1,1,2,2,1,1,2,2,1,1,1,3,1,1,2,1,1,1,1,1,1,2,1,1,1,4,1,1,3,1,5,2,1,1,1,2,2,1,2,1,2,1,2,1,3,4,1,1,2,1,2,1,2,1,2,1,2,2,2,1,2,1,1,3,1,1,1,1,1,5,1,1,1,1,1,1,3,2,1,1,1,1,1,1,1,3,1,1,1,1,3,1,1,2,1,1,1,1,1,1,2,1,1,1,3,3,1,1,2,1,2,2,2,1,2,1,1,1,1,1,1,1,3,2,1,2,1,1,2,2,2,2,1,1,4,4,2,4,2,2,4,2,2,1,4,3,1,1,1,1,2,2,1,2,1,1,3,2,1,1,1,1,1,4,4,1,1,1,1,2,1,2,2,1,1,1,1,3,5,2,1,1,1,1,2,3,1,1,1,2,4,1,1,3,1,1,2,1,1,1,2,1,1,1,1,1,2,1,1,2,2,2,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,2,1,2,2,1,1,2,1,2,2,2,1,1,1,3,1,2,3,1,2,2,1,1,3,2,1,1,2,1,3,1,1,1,1,1,2,1,1,1,1,2,2,1,2,1,1,1,1,4,1,1,2,2,1,1,2,1,1,2,1,1,1,1,1,1,2,2,1,1,1,1,3,2,2,2,1,1,2,4,1,1,2,1,1,1,1,1,1,2,1,2,3,1,3,1,2,1,1,1,1,1,2,1,4,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,2,1,1,1,1,1,1,2,2,1,1,2,3,2,1,1,1,2,1,3,3,1,3,2,2,4,1,3,2,2,1,3,1,1,2,2,2,2,1,2,4,1,1,2,1,1,3,3,2,1,1,4,1,1,1,2,1,1,2,2,1,1,1,1,1,1,5,1,3,1,1,3,1,1,2,1,1,1,1,4,1,1,1,1,1,1,4,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,2,1,1,1,2,1,1,2,1,2,1,2,1,1,1,3,2,1,1,1,2,3,1,3,1,1,1,4,1,2,2,2,1,2,1,2,3,2,2,1,2,3,4,2,2,1,1,2,1,1,5,2,1,1,1,1,1,2,1,2,2,1,1,1,1,2,1,2,1,1,2,1,1,3,2,1,1,3,1,1,1,2,3,1,1,1,4,1,2,2,5,1,3,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,2,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,5,3,1,1,5,1,1,2,2,1,1,1,1,3,1,4,1,1,1,3,1,2,2,2,1,2,2,1,2,1,1,2,7,1,1,4,1,1,2,2,1,5,2,3,2,1,4,1,2,2,1,1,1,1,1,1,3,1,1,1,2,1,1,1,3,2,1,2,1,1,2,3,2,2,1,4,1,4,1,1,2,2,2,3,2,1,1,2,2,2,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,2,1,1,1,1,1,1,2,1,2,2,1,1,3,2,1,1,1,2,2,1,1,1,2,1,1,1,2,1,1,1,2,2,1,1,1,1,1,3,2,1,2,1,6,1,1,2,1,1,1,4,3,1,1,1,1,3,1,1,1,3,1,2,1,3,1,1,1,2,1,2,1,1,1,2,1,3,1,1,1,2,4,2,1,1,1,1,4,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,3,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,1,2,1,2,1,2,2,2,2,1,1,3,2,2,1,1,3,1,1,1,1,5,2,1,2,1,1,1,4,1,1,1,2,1,1,1,1,1,3,1,1,1,3,1,1,1,1,3,2,1,1,3,1,1,2,4,2,1,2,1,1,1,1,2,1,1,1,2,1,2,1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,3,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,3,1,2,1,1,2,2,2,2,2,1,3,3,3,1,1,1,1,4,2,2,3,1,2,1,6,2,1,1,1,1,3,3,1,2,3,5,1,2,1,2,4,1,3,3,1,1,1,1,1,2,1,1,4,1,1,1,1,3,1,4,4,1,3,1,1,1,1,1,1,1,2,4,1,1,1,4,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,2,2,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,4,3,1,1,1,2,2,1,1,1,2,1,1,1,1,5,1,3,4,1,1,1,1,1,2,1,1,1,1,2,1,2,2,1,1,2,2,1,3,1,1,1,2,3,1,1,1,1,2,2,1,1,1,1,3,1,1,1,1,4,1,2,1,1,2,1,1,3,1,3,1,1,1,1,1,1,2,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,3,1,1,1,1,1,1,1,1,1,3,1,2,2,3,3,2,1,1,1,1,2,1,1,2,3,3,1,4,1,1,3,2,1,2,2,1,1,2,1,1,3,1,1,4,2,1,1,2,1,1,1,1,1,1,3,2,1,1,1,1,1,1,1,1,3,1,1,1,1,3,1,1,1,2,1,1,2,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,2,2,1,2,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,2,1,1,1,1,3,2,2,1,2,1,2,1,1,1,3,1,1,1,1,1,1,1,3,4,2,1,1,2,1,1,1,5,1,1,6,3,1,3,3,2,2,1,1,1,2,3,1,1,2,2,1,1,1,1,1,1,1,1,1,1,2,5,1,1,2,1,2,2,1,2,2,2,2,1,1,2,2,1,1,2,1,1,2,1,1,1,1,2,2,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,3,1,1,4,1,1,1,1,1,1,1,1,1,3,1,1,2,1,3,2,1,1,1,1,1,1,2,1,1,4,2,1,2,2,2,2,2,2,3,1,1,1,2,2,1,1,1,4,2,1,1,2,2,1,1,1,4,5,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,3,1,3,3,1,1,2,2,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,3,1,1,2,1,1,1,1,1,2,1,2,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,5,3,1,1,1,2,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,4,1,2,2,2,1,1,1,4,1,1,4,1,3,2,3,3,3,2,4,1,1,1,1,2,2,1,2,2,2,2,1,1,1,6,3,4,2,1,1,1,2,3,3,5,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,3,1,5,1,1,1,2,1,2,1,1,1,3,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,2,2,3,1,1,1,1,1,1,1,2,2,1,2,2,3,3,1,1,3,2,1,1,2,1,3,1,2,2,3,2,4,3,1,1,1,1,1,1,1,3,1,1,1,1,2,4,3,3,1,1,1,1,2,1,5,2,1,1,6,4,2,1,1,2,2,1,2,1,2,1,1,1,1,2,1,2,1,5,2,2,1,1,1,3,1,2,2,1,1,1,1,2,1,2,2,1,1,1,2,1,1,1,1,1,2,3,3,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,3,1,1,2,1,1,1,3,2,1,1,1,1,3,1,2,5,2,1,3,3,1,2,2,1,2,1,4,1,1,2,1,1,2,1,3,2,2,1,1,1,1,2,2,1,2,1,3,3,1,3,1,1,3,1,2,1,2,1,1,1,2,2,1,1,1,1,1,3,1,2,1,5,2,2,1,1,1,1,2,2,1,2,2,3,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,1,1,1,1,3,2,3,3,1,1,2,1,2,1,1,2,2,3,1,1,3,1,2,1,1,1,1,2,2,1,1,1,1,2,3,2,5,2,1,2,2,1,1,2,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,4,2,2,1,1,1,3,1,1,1,1,2,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,4,3,1,3,1,1,2,1,5,2,4,1,2,2,1,2,1,1,1,4,1,2,1,1,1,3,4,2,2,1,1,4,1,2,1,2,2,1,2,1,1,1,1,1,1,3,1,1,2,1,2,2,1,1,1,3,1,2,1,1,3,3,2,4,1,2,2,1,1,1,1,3,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,3,1,2,2,1,1,1,1,3,2,1,1,1,2,2,1,2,1,1,2,1,1,5,1,1,1,1,1,3,2,2,1,1,2,1,2,1,4,4,2,3,1,1,2,3,1,2,1,2,1,1,4,1,2,1,1,1,2,1,3,2,1,2,1,4,3,4,1,1,1,5,2,4,2,2,1,1,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,2,1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,2,1,2,1,1,3,1,1,1,1,1,1,1,3,1,3,3,1,2,3,1,1,1,1,1,1,2,2,3,1,2,2,3,1,2,1,1,2,2,1,1,3,2,1,1,3,4,1,1,1,1,1,2,2,2,2,2,1,2,1,3,1,1,2,1,1,1,1,2,2,1,1,1,3,2,2,2,1,4,1,2,1,1,1,2,1,1,1,1,2,1,1,2,1,1,2,1,2,1,1,3,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,3,2,1,1,3,2,1,1,1,1,4,1,3,1,2,2,1,1,4,3,2,1,1,2,1,2,1,1,1,1,2,1,1,2,2,1,2,2,3,1,4,1,2,3,2,2,1,1,2,2,3,1,1,1,1,3,1,1,1,1,2,3,2,1,1,1,2,3,1,1,1,1,4,1,1,1,5,1,2,1,2,3,1,2,2,2,1,1,1,2,2,1,1,1,1,2,3,3,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,2,3,1,4,1,1,2,3,3,1,2,1,1,2,1,1,2,1,3,2,1,1,2,1,1,1,1,1,1,1,1,2,1,3,1,1,2,1,1,2,1,2,1,1,1,2,4,1,1,1,6,2,3,1,1,3,5,5,1,1,1,1,1,2,1,2,2,1,2,2,2,1,1,1,2,1,2,1,2,2,1,4,2,1,2,1,1,2,2,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,2,1,1,3,2,1,1,1,1,1,4,1,1,1,1,1,1,2,1,4,3,1,1,2,1,3,3,1,2,1,1,2,2,2,1,1,2,1,6,1,4,2,1,1,1,2,1,3,2,1,1,1,6,1,3,2,2,1,4,1,1,1,1,3,3,1,1,1,1,4,2,1,3,1,1,2,1,1,1,2,1,1,1,1,1,2,2,4,2,1,1,1,2,1,1,2,2,1,1,2,1,1,1,2,1,2,3,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,2,2,2,2,1,1,1,1,1,2,3,1,2,1,2,2,1,1,1,1,1,1,2,1,1,1,1,1,3,1,1,1,2,2,1,1,2,1,2,1,7,1,1,2,1,3,3,3,3,1,3,1,1,1,1,5,1,2,1,3,1,1,1,3,2,1,1,1,3,1,1,2,1,1,1,4,2,2,1,3,2,1,2,1,3,2,2,2,1,1,1,1,3,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,2,1,1,4,1,1,3,3,1,3,2,1,1,1,1,5,2,2,2,1,1,4,3,1,1,1,1,2,2,3,1,1,1,1,1,3,1,2,1,1,1,1,1,2,2,2,1,1,3,3,1,1,1,1,3,3,1,2,4,1,1,1,1,3,1,1,3,2,2,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,3,3,1,1,1,1,2,2,1,1,3,1,1,1,1,1,1,1,1,1,1,2,1,2,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,3,3,1,1,1,1,1,3,3,4,1,3,1,2,1,2,1,3,1,3,4,1,1,1,3,2,2,1,1,2,1,2,1,2,1,1,2,2,1,1,1,1,1,1,3,2,2,1,1,2,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,2,1,2,1,2,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,2,1,1,1,1,2,1,1,2,1,2,3,4,1,1,2,1,2,1,2,1,1,1,2,2,1,1,1,1,3,1,1,3,1,2,1,1,6,1,1,1,2,2,4,2,1,1,4,3,1,2,1,2,2,3,1,1,4,2,1,2,1,2,1,1,1,3,2,2,1,1,1,2,1,1,3,1,1,1,1,1,2,1,2,1,1,1,1,3,1,1,2,2,3,1,1,1,1,2,1,1,1,3,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,1,3,3,2,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,2,1,2,2,2,3,1,1,1,1,2,3,1,2,1,1,1,1,2,4,2,1,1,1,1,2,1,1,2,2,3,4,2,1,3,2,1,1,2,1,1,1,1,1,2,2,1,1,1,2,4,1,1,1,2,1,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,2,1,1,3,1,1,3,3,1,1,2,1,1,3,3,1,1,1,2,2,1,1,1,5,2,2,1,2,3,3,4,1,2,1,1,3,1,6,1,2,1,1,3,1,1,3,1,1,1,4,1,1,5,1,4,2,3,1,1,1,1,3,1,2,1,1,3,3,1,2,1,4,2,2,1,2,1,1,1,1,5,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,2,1,2,1,2,1,1,1,2,3,1,1,1,1,2,2,2,1,1,1,1,1,2,1,2,2,2,1,1,1,2,3,2,1,1,3,1,6,3,2,1,2,1,1,1,2,1,3,2,1,1,2,2,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1,1,3,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,3,1,1,1,1,1,1,1,1,2,3,3,2,1,2,1,1,2,1,1,1,1,1,1,2,2,3,2,2,1,1,1,2,1,6,3,1,2,1,2,2,1,1,1,3,2,3,2,1,1,6,3,3,1,5,1,2,2,2,3,3,1,1,3,2,4,1,1,1,1,3,1,1,3,3,4,2,1,2,2,1,1,1,1,1,1,1,1,2,2,3,1,3,2,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,1,3,3,1,1,1,1,2,1,2,1,1,1,4,1,2,1,2,1,2,2,3,1,1,1,2,1,2,2,3,1,1,1,1,3,2,3,2,3,1,1,2,2,1,2,1,1,1,3,1,1,1,2,1,1,3,1,2,1,1,2,1,2,1,2,3,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,2,1,2,1,3,1,2,1,1,1,4,1,2,2,1,1,1,1,1,1,1,2,1,1,2,1,1,2,4,1,1,1,2,1,1,1,4,3,2,2,1,2,3,1,1,1,1,1,1,1,1,4,1,1,3,1,3,1,1,1,1,1,2,2,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,2,2,1,1,1,3,1,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,4,2,3,3,1,1,1,1,2,2,1,1,1,1,3,5,1,1,1,2,2,3,2,1,1,2,2,2,1,1,2,1,2,1,1,1,1,1,1,2,1,1,1,4,3,1,2,2,2,2,3,1,1,2,1,1,1,1,3,3,1,2,2,3,1,1,1,3,1,2,1,2,1,2,1,1,1,2,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,2,1,2,2,1,1,3,1,1,1,3,1,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,2,2,1,5,1,1,1,1,1,1,3,1,1,3,1,4,1,1,2,2,1,3,1,2,2,1,1,1,1,5,4,2,2,4,2,6,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,2,1,2,3,1,4,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,2,1,1,1,1,1,3,1,1,1,1,1,2,1,1,2,1,1,2,2,1,2,1,1,1,2,1,4,2,1,1,3,1,2,1,3,1,1,1,1,1,1,1,2,3,1,2,1,1,2,3,2,1,1,1,1,3,1,1,3,1,1,1,2,2,1,5,2,2,1,1,3,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,4,4,1,2,4,1,2,1,1,1,1,2,2,1,1,1,3,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,1,2,1,2,1,1,1,1,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,2,2,1,2,2,1,1,2,1,1,1,2,1,1,1,2,3,3,4,2,1,1,3,2,2,1,1,1,3,2,2,1,1,1,2,4,1,1,2,1,1,1,1,1,3,1,1,3,2,2,1,2,2,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,2,2,2,3,1,1,2,2,1,1,1,2,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1,1,2,3,2,1,2,1,1,2,2,2,1,1,4,2,1,1,1,1,1,1,1,1,1,1,1,1,4,1,4,1,2,2,2,1,1,2,1,2,1,2,1,2,2,2,3,1,4,1,3,2,1,2,3,2,1,1,1,2,2,1,1,2,4,1,1,1,1,2,2,1,1,1,3,1,1,1,3,1,3,1,1,1,2,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,3,1,1,1,1,1,1,3,1,3,1,1,1,1,1,1,2,3,2,1,1,5,1,3,2,2,1,3,1,1,1,1,1,2,1,3,2,1,3,1,1,1,1,2,4,2,1,1,2,1,1,1,2,1,3,1,1,1,1,3,1,2,2,1,1,1,1,3,4,3,1,1,1,1,1,2,3,1,1,3,4,1,1,1,1,3,2,2,1,1,2,2,3,1,1,1,2,1,1,3,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,2,1,1,3,1,2,1,2,1,1,1,2,2,3,1,1,1,1,3,1,1,1,2,3,1,1,1,3,5,1,1,3,2,3,1,1,1,1,1,1,1,1,1,1,3,2,1,2,1,4,4,1,3,2,1,3,2,1,1,2,1,1,3,2,4,2,3,1,2,2,1,1,2,1,1,3,1,1,1,1,1,3,3,2,2,3,2,1,1,1,2,3,2,3,1,1,3,1,1,3,3,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,3,1,3,1,3,1,1,2,2,3,1,1,1,1,1,2,1,1,1,2,1,2,1,1,4,1,1,1,1,1,2,1,4,1,4,1,2,1,1,1,5,1,3,1,1,1,1,2,2,1,1,1,1,1,2,1,2,1,8,1,1,2,2,1,1,2,1,2,1,1,1,2,2,1,2,1,1,2,2,1,1,2,1,2,2,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,3,1,2,2,1,1,2,1,1,1,1,2,1,1,1,2,2,1,2,1,2,1,1,2,2,1,2,1,1,2,2,2,1,1,2,1,1,1,1,2,1,1,1,1,2,1,4,3,2,1,3,1,1,1,2,2,3,2,1,1,3,1,1,1,2,5,1,1,2,2,1,1,1,2,1,1,2,1,1,1,2,1,2,3,2,1,1,1,1,3,2,1,1,2,1,1,2,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,3,1,2,1,1,1,1,1,2,3,1,1,1,4,2,1,1,2,1,2,2,3,1,1,3,3,4,1,1,1,1,3,2,1,1,1,2,1,2,1,2,3,1,1,2,3,2,1,2,3,1,1,3,2,1,1,2,2,1,1,1,1,1,1,3,4,2,1,1,2,1,1,1,3,2,1,1,3,1,1,1,1,1,1,3,1,2,1,1,1,2,1,1,1,1,1,1,2,2,1,1,1,2,2,2,1,1,1,1,1,1,1,2,1,1,2,1,2,1,1,1,1,1,1,3,1,1,1,1,1,2,6,2,1,1,1,1,5,4,2,1,1,2,6,1,1,1,1,1,1,2,2,1,2,1,2,3,2,1,1,5,1,1,1,2,3,1,4,2,1,1,1,1,3,2,2,1,2,1,1,2,2,4,1,1,3,2,1,1,1,1,1,2,1,1,1,2,1,3,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,3,2,1,1,2,2,2,1,2,1,1,1,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,2,1,2,3,5,2,1,2,1,3,2,2,2,1,3,1,1,2,1,3,2,3,1,1,1,1,1,1,1,1,1,1,2,1,2,2,1,1,1,1,2,2,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,2,2,1,5,2,2,1,1,1,1,2,1,1,1,3,1,1,2,1,1,1,1,1,1,1,3,1,2,1,1,1,2,2,1,1,1,2,2,3,3,2,4,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,3,2,2,1,1,1,3,3,1,1,1,2,1,2,1,3,1,2,2,2,1,2,1,3,3,1,2,1,1,2,1,1,1,1,1,3,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,3,1,1,2,1,1,1,1,1,1,2,2,1,3,1,1,2,6,1,1,2,1,2,1,1,2,2,1,2,1,1,2,1,1,2,3,1,3,2,1,2,2,4,2,2,1,1,1,2,4,3,4,2,2,2,1,1,2,3,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,4,2,1,1,1,2,2,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,2,2,1,1,2,1,1,1,6,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,5,1,1,1,1,1,3,1,2,1,1,2,3,2,1,1,1,1,1,3,1,3,3,2,3,2,1,1,3,1,3,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1,4,3,1,1,2,2,1,3,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,2,1,1,1,2,1,2,2,2,2,1,1,2,2,1,1,1,1,3,2,1,3,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,4,2,3,1,1,2,1,2,1,1,1,3,1,2,1,1,4,1,1,2,1,1,1,1,3,1,1,3,4,3,1,1,2,1,2,2,1,2,2,1,2,2,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,3,1,1,1,2,2,1,2,1,1,2,1,1,1,1,1,2,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,2,3,2,3,2,4,1,3,1,1,1,1,1,1,4,3,1,2,1,2,2,3,1,1,1,2,2,2,1,1,1,1,1,1,2,1,2,2,1,1,1,2,1,5,1,4,1,2,1,3,1,1,1,1,1,1,1,2,2,2,2,1,1,3,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,2,1,1,1,2,1,1,1,1,1,2,2,1,1,1,1,3,1,4,2,1,1,3,2,1,1,2,2,2,1,2,3,4,1,2,1,4,4,1,2,1,1,1,1,2,2,1,1,1,1,4,2,2,1,1,1,1,2,4,2,2,1,5,1,1,3,1,1,2,3,2,2,1,1,1,2,4,2,1,1,1,2,3,2,1,1,1,1,1,2,3,2,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,2,2,1,2,2,1,1,1,1,2,1,1,2,1,1,1,1,2,2,1,2,1,1,1,1,1,2,2,1,1,1,2,2,2,2,1,1,1,3,2,5,1,2,3,2,1,1,1,2,2,1,2,1,1,1,1,1,1,3,4,1,1,1,2,3,1,4,1,1,1,2,1,1,3,2,2,2,2,2,2,1,2,2,2,1,1,2,1,1,3,1,5,1,1,1,1,3,2,2,2,2,1,1,4,3,1,2,1,1,2,1,1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,2,2,2,1,1,2,2,2,3,1,1,2,1,3,2,2,2,1,3,1,1,1,3,1,2,2,1,1,2,1,1,1,1,1,2,1,1,5,2,2,2,1,2,6,1,2,2,2,2,2,2,1,3,1,1,1,2,4,1,3,1,1,1,1,1,1,3,1,3,1,1,3,3,1,3,1,3,5,1,2,2,1,1,1,2,2,2,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,4,2,1,1,1,1,1,5,2,1,1,3,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,4,1,3,4,2,1,1,3,1,2,3,1,2,2,2,2,1,1,2,1,1,1,2,2,2,1,2,3,2,1,1,2,2,1,1,1,1,1,3,4,3,1,2,2,3,1,2,1,1,3,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,3,2,1,1,1,1,1,1,1,1,1,1,1,3,2,1,1,2,1,2,1,1,2,2,1,2,2,1,1,2,1,1,6,2,1,1,1,1,1,1,3,2,1,1,2,2,1,4,2,2,2,1,1,3,1,2,1,1,2,3,2,2,1,2,2,3,1,1,2,1,1,1,4,2,1,2,3,1,1,2,2,2,4,1,2,1,2,2,2,1,2,2,1,1,1,1,1,1,3,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,4,1,1,2,2,2,1,1,2,1,1,1,1,2,1,5,1,1,1,4,2,1,1,1,1,4,1,1,2,1,1,1,1,1,2,1,1,1,1,1,3,1,2,1,2,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,2,1,1,2,1,4,5,1,2,1,1,1,1,1,3,2,2,1,1,1,1,1,3,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,2,3,1,1,1,2,1,1,2,1,1,1,2,1,1,1,4,1,3,1,4,2,2,1,2,1,1,1,1,1,1,3,3,1,1,3,4,1,1,1,2,1,4,2,2,1,1,1,2,2,2,3,2,3,2,1,1,1,3,2,2,5,1,3,1,2,1,1,4,2,2,1,1,3,1,1,1,1,2,1,2,1,3,1,3,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,4,1,2,1,2,1,1,3,1,3,1,1,2,1,1,1,2,2,1,1,1,2,3,1,1,1,1,1,1,1,1,2,1,2,3,2,2,1,2,3,3,1,1,1,2,2,1,1,2,2,1,1,2,2,2,2,1,1,1,2,3,4,1,2,1,1,1,2,1,2,2,1,1,1,1,1,1,3,2,1,2,1,2,1,2,1,2,1,2,1,1,4,1,2,1,2,2,1,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,1,2,3,2,1,1,2,2,2,2,1,1,4,3,2,2,1,1,1,1,3,3,1,2,1,2,1,1,3,2,1,1,1,2,2,1,1,1,2,1,1,2,1,3,1,2,2,1,2,1,1,1,1,2,1,1,1,3,4,2,2,2,2,2,1,1,3,1,3,1,1,1,3,1,1,1,1,1,2,1,1,2,1,1,1,1,1,3,1,1,1,1,1,3,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,2,2,1,1,1,1,1,1,2,1,1,2,2,2,1,1,1,1,1,2,2,1,1,2,1,3,3,1,1,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,6,3,1,1,5,2,1,2,1,1,1,1,2,2,2,1,3,1,1,2,1,1,1,1,1,2,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,2,1,1,2,2,2,1,1,4,1,1,3,2,1,2,1,1,2,3,1,3,1,1,1,1,1,1,2,1,1,3,1,3,1,1,1,5,1,2,1,2,4,2,1,1,1,3,2,2,4,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,3,2,1,1,2,1,1,1,1,2,2,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,3,2,2,3,2,2,1,1,1,3,2,3,2,1,4,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,3,1,1,1,3,1,2,1,1,2,2,1,1,2,2,1,1,2,1,1,1,5,2,1,3,2,2,1,1,2,1,2,1,1,1,1,1,1,3,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,2,2,2,1,1,1,2,2,1,2,2,1,2,2,1,1,2,2,2,2,1,2,1,2,2,1,2,1,2,3,1,2,1,2,1,1,2,4,3,1,1,1,1,3,2,2,2,2,1,1,1,3,1,3,1,3,2,1,2,1,1,1,1,1,2,3,4,2,1,1,1,2,4,2,1,2,1,1,2,1,1,1,4,1,2,1,1,1,1,1,1,1,2,1,1,2,2,1,1,1,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,2,1,1,1,1,1,4,1,1,1,1,1,1,1,1,2,5,1,2,2,1,1,3,1,2,2,1,1,3,2,3,3,2,3,1,2,1,2,3,1,2,2,1,1,2,1,1,3,2,2,3,1,1,3,1,1,1,1,1,4,3,1,1,1,1,2,2,1,2,1,1,1,1,3,2,1,1,1,2,1,3,3,1,6,2,3,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,2,1,1,2,3,1,1,3,1,1,1,1,1,2,1,1,1,1,1,2,2,1,2,1,1,1,1,1,1,2,2,1,1,1,2,1,2,2,2,1,1,2,2,1,2,1,1,3,3,1,2,1,1,1,1,4,1,2,1,1,1,1,2,1,2,3,1,2,2,1,2,1,1,1,3,1,2,1,2,1,1,1,1,2,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,1,2,2,1,2,1,1,1,1,2,1,1,1,3,2,1,5,2,2,2,1,3,2,2,1,2,1,2,5,2,2,1,1,1,2,1,1,3,1,1,3,1,1,1,1,1,2,1,2,2,1,1,1,1,3,1,1,1,4,1,4,2,1,2,1,3,1,3,2,1,3,1,1,2,1,2,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,3,1,1,1,1,1,2,2,1,1,1,2,1,1,2,1,1,2,2,3,1,2,2,2,1,2,3,2,3,2,1,1,2,1,1,2,1,1,1,2,4,3,2,2,4,1,1,2,2,1,1,1,1,5,2,1,1,2,2,2,2,3,2,3,2,2,1,1,3,1,2,3,1,5,1,1,3,1,2,2,2,1,1,1,3,2,3,1,2,2,1,3,1,3,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,2,1,2,2,4,1,1,1,1,2,2,1,1,2,1,1,1,1,1,1,1,2,1,2,2,1,2,1,3,2,2,2,1,1,1,1,2,2,1,4,1,1,1,2,4,1,1,1,1,1,3,1,2,1,4,1,1,1,1,2,3,2,1,1,1,2,1,2,3,1,1,4,1,3,2,1,3,1,1,1,4,1,2,1,1,1,2,2,1,2,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,2,1,2,1,1,1,1,1,1,1,1,1,2,4,5,3,1,1,3,2,1,1,1,1,1,2,1,3,2,2,1,1,1,3,2,1,1,1,2,2,3,2,1,1,2,3,1,1,1,2,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,6,1,3,2,1,1,1,1,1,2,2,1,1,2,1,1,2,1,1,2,2,1,3,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,2,3,1,1,2,1,1,3,3,1,1,1,2,1,2,3,3,4,3,3,2,3,1,1,4,2,1,4,1,2,1,1,4,1,1,2,1,1,1,5,1,1,1,2,3,2,1,2,3,1,1,2,1,2,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,3,1,1,1,1,1,3,3,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,4,1,3,2,2,1,2,1,1,3,1,2,2,3,1,3,1,3,1,1,1,2,1,1,1,1,1,1,1,1,1,3,4,2,1,3,1,1,1,3,3,2,1,1,1,2,2,2,1,1,1,3,1,1,3,1,2,1,3,3,1,2,2,2,1,1,1,1,2,2,1,1,3,3,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,4,1,2,1,1,1,1,1,1,1,2,1,1,2,1,2,1,3,1,1,1,1,2,1,1,1,2,1,1,1,2,2,1,1,2,2,2,2,2,1,1,2,4,5,2,1,1,1,3,1,2,1,1,2,2,1,1,1,1,1,1,3,3,2,1,1,2,2,2,2,1,1,2,1,2,4,1,1,1,2,1,3,1,3,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,3,2,1,2,1,2,1,1,2,1,2,1,1,6,1,4,1,3,2,1,1,1,5,1,1,2,4,3,1,5,1,3,3,2,1,2,2,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,3,1,2,1,3,1,1,4,1,2,1,1,1,4,3,1,1,1,1,1,3,1,4,1,2,1,2,1,1,1,1,2,1,2,2,1,1,1,1,1,1,1,1,1,4,1,3,1,1,1,1,1,3,2,2,1,3,1,2,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,3,1,1,5,2,2,1,1,1,2,2,1,1,2,1,1,2,3,2,2,2,1,1,1,2,3,2,1,1,5,2,1,1,2,1,1,2,2,1,3,1,1,4,1,2,1,1,1,1,1,6,3,1,2,1,1,2,1,1,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,3,3,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,1,1,2,2,1,1,2,3,1,1,1,1,1,1,1,1,1,2,1,1,1,3,4,1,1,2,1,1,1,2,3,2,3,1,2,1,2,1,1,1,1,5,1,1,1,2,2,1,1,1,1,1,1,1,2,1,1,2,2,1,1,3,3,1,1,2,1,1,1,3,2,1,1,4,3,3,2,3,1,1,2,1,1,3,2,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,2,2,2,1,1,1,1,1,1,3,1,1,1,1,1,1,2,5,2,2,1,2,2,1,2,1,5,1,2,2,2,2,2,1,1,2,1,2,1,1,1,3,4,1,1,1,1,1,1,1,1,3,1,2,1,2,2,1,3,1,1,2,2,1,1,1,1,1,1,1,1,3,1,3,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,3,2,1,1,2,1,1,1,1,1,5,1,4,1,2,1,1,1,2,3,1,2,2,1,2,1,1,1,3,3,1,1,1,1,2,1,2,1,1,3,5,3,3,1,2,3,3,3,1,1,3,2,1,2,2,2,1,1,1,2,2,3,1,2,1,2,2,1,1,2,1,1,1,1,2,1,1,2,1,3,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,2,1,2,3,1,2,1,1,1,1,1,1,1,2,2,1,1,3,2,1,2,2,1,2,1,1,2,3,1,1,2,4,2,1,2,2,1,2,1,3,1,4,1,1,2,1,2,2,2,3,1,2,1,1,1,1,5,2,2,1,1,2,2,2,2,2,1,2,1,1,1,1,1,1,2,1,2,1,1,2,2,1,2,1,1,1,3,1,1,1,1,1,1,2,1,2,2,2,2,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,1,3,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,2,2,1,3,1,1,1,3,3,1,1,1,3,2,2,1,1,4,1,3,2,1,3,1,2,1,1,1,1,3,3,2,2,1,1,1,1,3,2,1,1,2,1,3,1,1,1,1,1,2,2,1,1,2,1,1,5,2,3,1,1,2,1,1,1,1,3,1,1,2,2,1,2,1,3,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,2,1,1,1,1,1,1,2,3,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,2,1,3,2,1,1,1,1,2,2,1,3,1,4,1,1,2,2,4,1,2,2,1,2,2,2,1,2,1,1,1,1,3,2,1,2,1,1,2,1,2,1,1,1,2,1,1,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,3,1,2,1,1,1,2,4,4,1,1,1,2,1,2,2,1,1,1,1,2,1,1,2,1,1,1,2,2,1,2,1,1,2,1,1,3,1,1,2,1,1,2,2,1,1,2,2,4,1,1,1,2,1,4,2,1,1,1,1,1,2,2,1,1,2,2,1,1,5,1,1,1,1,1,1,1,2,1,1,3,1,1,2,3,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,3,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,2,2,1,1,1,1,1,1,2,2,2,2,1,1,5,1,1,1,1,1,2,1,1,3,1,1,2,2,3,2,2,3,3,1,2,1,1,2,2,1,2,2,2,1,1,1,1,2,1,1,3,2,2,1,1,2,1,3,3,1,1,1,1,3,1,2,1,1,2,1,2,3,2,3,1,2,2,1,1,1,2,3,1,3,1,4,1,3,2,1,1,2,1,1,2,1,1,5,4,5,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,1,1,2,3,1,1,1,2,1,1,1,1,1,1,2,2,2,1,2,3,1,2,3,2,2,3,1,2,2,1,1,1,2,1,3,1,1,1,1,3,1,1,1,1,2,1,3,1,2,6,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,3,1,1,1,1,1,2,1,2,1,1,1,2,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,5,1,1,1,1,1,1,3,1,2,1,1,1,1,1,3,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,4,3,1,1,1,1,1,1,1,2,3,1,1,1,2,1,1,2,1,1,1,2,1,2,1,3,1,1,2,2,3,3,1,2,2,1,1,1,2,1,1,1,2,3,1,1,1,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,1,1,1,2,3,1,1,3,1,1,2,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,2,1,3,1,2,2,3,2,2,1,1,1,1,1,1,3,1,1,2,1,1,3,1,2,2,2,2,2,1,1,1,1,3,2,3,1,3,1,1,1,1,1,1,1,1,2,1,2,1,2,2,4,1,1,1,2,1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,3,1,1,1,2,1,1,1,1,1,2,1,3,1,1,1,1,2,2,3,2,2,2,1,1,1,1,2,1,2,2,1,1,5,1,2,1,1,2,1,1,1,3,1,1,1,2,3,2,2,1,3,2,2,4,1,1,1,3,1,3,1,1,1,1,3,1,3,2,2,2,1,1,1,1,5,1,2,1,1,1,2,3,1,1,1,1,2,2,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,3,1,1,2,1,2,1,2,2,1,1,1,1,1,1,3,1,1,2,1,1,2,1,1,1,1,3,4,2,2,1,1,1,1,4,3,2,2,1,2,5,3,4,1,2,1,1,1,2,2,1,1,2,1,1,2,1,2,1,2,5,1,1,1,2,3,1,3,2,2,3,2,2,1,1,2,2,1,1,1,1,2,2,2,3,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2,2,1,3,2,1,1,2,2,1,1,1,1,1,1,1,1,2,1,2,3,5,1,1,1,1,1,3,1,3,2,1,1,1,1,1,2,1,1,4,3,2,2,1,2,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,2,2,1,1,1,1,2,2,1,1,1,1,2,1,7,1,2,1,1,1,3,3,2,1,2,4,1,2,1,1,2,1,2,2,2,1,2,1,4,1,1,2,2,2,1,1,1,1,2,1,1,1,2,1,1,1,1,1,2,4,2,1,2,1,3,2,3,2,1,2,3,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,3,1,1,1,2,1,1,2,1,1,1,1,2,1,1,3,1,2,2,1,2,1,3,1,2,2,1,1,2,4,1,1,1,2,2,2,1,2,2,3,2,1,1,3,5,2,1,1,1,1,2,2,2,1,2,3,1,2,1,2,2,3,1,1,1,1,3,1,3,1,2,2,1,2,2,3,1,2,1,1,3,1,2,1,1,1,2,1,2,1,1,1,4,1,2,1,1,1,1,2,2,1,3,2,2,1,1,1,2,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,2,2,1,1,1,3,2,2,1,1,1,1,1,1,2,1,1,2,4,2,1,2,1,2,1,1,1,2,2,1,1,2,4,1,1,1,3,4,3,2,1,2,1,1,1,1,2,3,1,3,1,2,1,2,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,2,1,1,2,1,2,1,1,1,1,1,2,2,1,5,2,1,2,3,1,5,2,1,1,1,1,3,1,2,1,1,1,1,2,1,2,1,1,1,4,3,1,3,2,3,1,3,1,2,1,2,1,5,1,1,1,1,1,1,1,1,2,1,1,2,2,1,2,1,1,1,1,1,3,2,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,3,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,2,1,2,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,2,1,1,2,1,2,1,2,2,1,1,1,1,1,1,2,1,1,1,1,1,3,2,1,2,2,2,1,1,1,2,2,1,2,3,1,2,1,2,1,1,1,1,1,3,1,3,2,1,3,2,1,1,3,1,1,1,1,1,2,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,2,2,2,1,1,3,2,4,2,1,1,1,1,2,1,1,2,1,2,1,1,2,2,1,2,2,1,2,2,2,1,3,1,1,1,1,1,5,2,1,1,2,2,1,3,1,1,1,2,1,1,1,2,2,4,3,1,1,2,3,2,1,4,2,1,1,2,1,4,1,3,1,1,1,1,3,2,1,1,1,2,1,3,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,2,1,2,1,3,4,2,1,1,1,2,1,3,2,4,2,2,2,2,1,1,1,5,2,1,4,1,1,1,1,2,1,1,1,1,2,1,4,1,1,2,3,4,1,1,1,1,3,2,1,3,1,3,1,1,1,1,2,1,1,2,1,2,1,1,1,1,2,1,1,1,1,1,3,1,1,2,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,2,2,1,1,2,2,2,2,1,1,1,1,4,1,4,3,1,1,3,1,1,3,1,2,2,2,5,1,1,1,1,2,1,1,2,2,2,2,2,1,2,1,2,4,1,2,1,1,1,2,2,2,2,1,2,1,1,1,5,2,1,1,1,3,4,3,1,1,1,3,3,5,2,1,2,1,2,2,4,3,2,1,3,1,1,2,1,2,1,1,1,1,2,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,2,1,1,2,1,1,2,2,2,1,2,1,2,2,2,2,2,1,1,3,2,1,1,1,3,1,1,1,1,3,2,1,1,1,2,2,2,2,1,1,1,2,2,1,2,1,2,2,1,1,1,2,1,1,1,1,1,3,1,1,1,1,3,1,1,2,1,1,1,1,3,1,1,1,2,2,1,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,1,1,2,4,2,2,1,1,1,1,1,1,1,2,2,2,1,1,6,1,2,3,2,1,1,1,1,2,2,1,1,1,1,1,3,1,1,1,1,2,4,3,1,2,1,1,3,1,1,2,2,2,1,3,2,1,4,3,2,1,6,3,3,1,2,1,3,1,2,1,1,1,1,3,2,2,3,1,2,1,2,1,1,4,2,1,1,2,2,2,1,3,1,2,1,1,1,2,2,1,1,2,2,1,2,1,2,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,2,1,1,2,2,2,1,1,1,3,2,2,1,1,1,2,1,2,1,4,2,2,1,2,2,1,1,1,1,1,3,2,1,1,1,1,1,2,1,1,1,2,1,1,2,1,2,1,3,1,1,2,2,1,2,4,2,2,2,2,2,2,2,3,3,1,1,2,2,1,1,1,3,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,2,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,3,1,1,2,1,1,1,1,1,1,3,1,1,1,2,1,1,1,1,1,2,1,1,1,1,4,3,1,1,1,1,3,2,1,1,1,1,1,1,2,2,1,1,3,1,2,1,1,4,1,2,1,6,1,1,3,1,1,1,1,1,1,2,2,1,2,1,1,1,2,1,3,1,2,1,1,2,1,2,1,1,1,1,1,1,1,3,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,2,2,1,1,3,1,1,2,4,1,2,1,2,1,1,2,1,2,2,2,1,2,2,2,1,3,1,3,3,1,2,2,2,3,3,1,1,1,2,1,2,2,1,2,1,1,2,1,1,2,2,1,1,1,1,1,1,3,1,1,1,3,3,1,1,2,1,1,1,3,4,1,1,1,1,2,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,3,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,2,1,1,1,2,1,1,1,2,1,1,1,1,3,1,1,1,1,2,1,5,1,1,1,1,6,4,1,1,3,1,1,1,1,3,1,1,2,3,1,1,3,1,1,3,1,2,1,1,1,1,1,1,1,4,3,2,1,2,3,3,2,1,1,2,2,1,1,1,1,1,1,2,1,1,1,3,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,2,2,1,1,1,1,1,2,1,1,1,2,1,3,1,1,1,1,2,1,1,2,1,2,1,1,3,1,2,1,1,1,1,2,1,1,1,1,3,2,1,1,2,2,2,2,2,3,1,1,2,2,4,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,2,1,2,2,1,1,1,2,1,1,1,1,2,2,2,1,1,1,1,2,1,1,5,1,2,2,1,1,1,1,1,2,1,1,1,1,1,4,2,2,1,1,2,1,1,2,2,1,2,1,1,1,1,2,3,3,3,1,2,1,1,4,2,1,1,1,1,3,3,1,2,2,4,1,3,1,1,2,1,2,3,2,2,1,1,1,2,2,1,1,1,1,1,3,3,1,4,2,1,1,1,2,2,2,1,1,1,3,1,3,1,1,2,3,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1,3,2,1,1,1,1,1,3,1,2,1,1,1,1,1,1,1,1,1,3,1,2,4,1,1,1,1,1,1,2,2,1,1,1,1,1,1,2,1,1,3,2,2,1,1,2,1,2,1,1,2,1,2,2,2,1,2,4,1,3,1,5,1,1,1,2,1,2,3,1,1,1,2,1,2,1,2,1,1,3,2,1,1,1,1,1,2,2,1,1,2,1,1,2,2,1,1,2,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,1,2,1,1,1,1,1,2,2,2,1,3,2,1,1,1,2,6,3,1,1,1,3,2,1,3,1,1,1,1,2,1,1,1,1,3,2,2,4,1,1,2,1,3,1,3,1,1,1,3,2,1,2,1,1,2,2,1,2,1,2,1,1,2,1,1,1,2,3,2,2,2,4,1,2,1,1,1,2,3,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,2,2,1,2,1,2,1,1,1,1,1,3,1,1,1,1,3,1,1,2,1,1,1,2,1,1,2,3,2,3,1,1,1,3,2,1,6,1,1,2,1,1,1,2,1,1,1,1,1,4,1,1,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,2,2,1,2,1,1,4,5,1,1,2,1,1,2,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,4,1,2,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,3,1,1,1,1,1,1,2,2,1,1,1,2,2,2,1,1,1,3,1,1,1,1,1,1,1,1,1,2,1,4,1,1,1,2,2,1,1,1,2,3,3,4,2,2,2,3,2,2,2,1,1,2,1,4,4,1,2,1,1,2,1,1,1,3,1,1,2,2,3,2,2,2,1,3,2,3,2,1,1,1,1,2,1,1,1,1,2,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,3,1,2,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,2,2,4,5,2,1,1,1,4,1,1,1,2,2,2,1,1,1,1,1,3,1,1,2,1,1,2,2,1,1,3,1,3,1,1,1,2,2,1,1,1,2,2,1,1,2,1,1,1,1,2,2,1,3,1,1,2,1,2,1,2,1,1,1,1,2,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,1,2,2,2,2,1,3,1,1,1,2,5,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,2,1,1,1,4,3,1,2,1,1,1,2,3,2,2,1,2,2,2,1,1,1,1,1,3,2,1,2,1,3,2,2,1,1,1,2,2,1,1,1,2,3,2,1,2,2,2,2,2,1,2,3,1,1,1,1,1,3,1,2,2,1,1,1,1,1,1,1,1,1,1,1,3,2,1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,3,2,1,1,2,1,1,1,1,2,1,1,3,2,1,1,1,1,3,1,2,1,1,1,3,2,2,1,1,2,3,1,1,1,2,1,1,2,2,2,1,2,2,3,1,2,1,1,1,1,5,1,1,2,2,1,1,2,2,1,1,3,1,4,5,1,1,1,1,1,1,2,1,2,2,1,1,1,1,4,3,1,2,2,1,1,2,2,1,1,2,1,1,1,2,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,3,2,1,1,1,1,2,1,1,1,1,1,2,3,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,3,2,1,1,1,1,3,1,2,1,1,1,1,1,1,3,3,2,1,1,2,2,2,2,1,1,1,2,2,5,2,1,2,1,1,2,1,1,1,1,2,1,1,1,2,2,2,2,1,2,2,1,1,1,1,2,2,2,2,1,3,1,3,4,2,1,1,1,2,1,1,2,1,1,1,1,1,3,1,1,1,4,1,3,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,2,4,1,1,2,1,2,1,1,1,1,1,2,2,2,1,3,3,2,1,1,1,4,1,4,3,2,2,1,2,1,1,1,1,3,2,1,2,1,3,2,1,2,1,1,1,3,1,1,1,1,2,3,1,1,2,1,1,2,2,1,2,3,1,1,2,4,3,2,2,2,1,1,1,1,2,2,1,2,1,1,2,2,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,2,1,1,2,1,3,1,1,1,3,2,2,2,2,1,1,1,1,1,2,1,3,1,1,5,2,1,5,2,4,2,1,4,1,4,1,1,1,1,1,1,2,4,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,2,1,2,1,1,7,1,1,3,1,1,2,4,1,1,4,2,1,1,1,1,1,1,4,1,1,1,1,2,1,4,1,1,2,1,1,4,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,3,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,3,1,1,1,1,1,3,2,2,2,3,2,1,2,2,2,2,3,1,2,1,3,2,1,1,1,5,1,1,3,1,3,1,1,1,1,5,1,3,1,1,2,5,3,1,2,2,2,3,3,2,1,1,1,1,1,3,2,2,2,1,2,1,2,1,1,1,1,1,1,1,1,1,1,2,3,1,2,1,1,1,1,1,3,1,1,1,2,1,1,1,1,1,1,1,1,2,2,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,2,1,2,2,1,2,1,2,3,2,1,1,2,2,3,1,2,1,1,2,2,1,1,1,1,2,2,4,1,2,2,3,1,1,1,1,4,1,1,6,2,1,1,1,2,1,1,2,4,2,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,2,3,2,1,1,1,1,3,2,1,4,1,2,1,1,1,4,1,1,1,1,1,3,1,1,1,1,1,3,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,4,2,1,1,2,1,1,2,1,1,2,1,3,1,1,3,1,3,2,1,1,2,1,1,1,1,2,1,2,2,2,1,1,1,1,2,3,7,1,1,1,2,3,7,1,1,3,1,1,3,1,1,1,3,3,1,1,4,1,1,5,2,4,2,1,1,1,3,2,1,2,1,1,1,1,2,2,3,2,2,1,1,1,4,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,3,2,2,1,3,1,1,2,1,2,1,2,1,1,2,2,3,1,1,1,1,1,1,2,2,2,1,2,1,1,4,3,1,1,1,2,3,1,1,2,2,4,3,1,2,1,2,5,1,2,1,1,3,2,3,2,1,1,1,1,1,4,2,3,1,1,1,1,1,2,4,2,1,1,1,1,2,1,1,3,1,2,1,1,1,1,2,1,1,4,2,1,3,2,1,1,2,4,1,1,1,1,1,4,2,1,1,1,1,1,1,1,1,1,1,3,1,2,1,1,1,2,1,2,2,2,2,1,1,1,2,2,1,1,1,1,2,1,2,1,1,2,2,1,2,2,1,1,3,2,2,2,1,3,3,2,2,1,1,1,1,1,2,1,1,1,3,1,1,1,1,4,2,1,1,2,4,1,1,1,2,2,3,4,1,2,3,1,1,1,1,1,2,1,1,4,1,2,4,2,2,1,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,3,2,2,1,2,2,2,1,2,1,1,1,1,1,1,1,2,1,1,1,1,2,2,3,4,1,1,2,1,4,1,2,1,1,1,1,2,2,1,3,1,1,1,1,1,1,4,4,1,1,6,2,1,1,1,2,2,2,1,2,2,1,1,1,3,1,1,1,1,2,1,1,1,1,3,1,1,1,1,1,1,1,1,2,2,1,3,2,1,2,1,2,3,2,1,1,1,1,1,1,1,3,1,1,1,2,1,1,1,1,1,1,1,1,3,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,2,1,2,1,1,1,1,7,3,2,3,1,1,1,1,2,2,2,1,2,1,1,1,2,2,3,1,1,2,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,3,2,2,2,1,2,2,1,1,1,2,4,2,1,2,1,2,2,2,1,1,2,1,2,1,3,3,5,1,1,1,1,1,2,1,1,3,1,1,2,1,1,2,1,2,2,4,3,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1,1,2,1,5,2,1,1,1,1,1,4,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,2,1,3,1,1,1,1,4,1,2,2,1,1,1,1,3,2,1,1,1,1,2,2,3,2,1,1,1,2,3,1,1,1,1,2,1,6,2,1,2,1,2,2,1,1,1,1,1,1,1,1,1,3,1,1,2,2,1,1,1,2,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,2,2,3,1,1,1,3,1,2,1,1,1,1,2,2,1,3,3,3,1,3,1,2,1,2,1,2,1,2,1,1,2,1,1,2,1,1,2,1,3,2,3,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,2,1,2,2,1,2,1,1,2,2,1,1,1,1,2,1,1,1,1,2,1,1,1,1,1,2,2,1,2,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,3,2,1,2,1,5,2,1,1,2,3,1,2,1,1,1,2,3,1,1,2,1,2,1,1,1,2,1,1,2,1,1,1,2,2,1,1,1,2,3,1,1,2,2,2,1,1,6,2,2,1,1,1,4,2,2,2,1,1,2,2,2,1,1,1,2,2,1,1,2,1,1,1,2,2,2,1,1,1,1,2,1,1,2,1,2,1,1,2,1,1,1,3,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,2,1,2,1,3,1,1,1,1,3,1,2,3,2,1,1,2,1,1,1,2,1,3,2,1,1,2,2,3,1,2,1,3,2,1,1,1,1,1,3,1,1,2,2,1,2,1,1,1,2,1,4,1,1,2,2,2,3,1,1,1,1,2,1,2,1,1,2,2,2,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,4,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,3,1,1,1,1,2,1,5,2,3,1,1,3,1,1,3,2,1,1,1,1,1,4,2,1,1,1,1,1,2,2,1,1,1,1,2,1,2,1,2,1,1,1,1,2,1,4,5,1,1,3,1,1,1,4,1,1,1,3,1,1,2,3,1,1,1,2,1,1,2,2,1,1,1,2,1,1,1,2,2,3,3,3,1,1,1,1,2,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,3,1,2,1,1,2,2,2,2,2,1,1,1,3,1,1,3,1,1,1,1,1,1,1,1,3,1,1,1,1,1,2,1,2,1,3,1,1,2,2,2,2,1,1,7,2,1,1,1,1,3,1,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,2,1,1,2,1,2,1,1,1,1,1,3,1,3,1,1,1,2,1,1,1,2,1,1,3,2,1,1,5,1,1,1,2,1,2,2,2,1,1,2,3,1,2,1,1,1,1,1,4,1,2,3,1,1,1,1,2,3,1,1,1,1,1,4,2,1,1,1,1,3,3,2,1,1,5,3,1,2,1,1,3,1,1,1,1,1,1,1,3,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,3,1,1,1,1,1,1,1,1,1,2,1,1,1,3,2,2,2,2,2,2,1,1,2,1,3,1,5,5,2,3,1,2,2,1,4,3,1,3,1,1,1,4,1,2,1,3,5,2,1,2,4,2,1,2,1,3,1,1,1,2,1,2,2,1,2,4,2,3,2,1,4,1,1,1,1,2,1,1,1,3,1,2,1,1,1,1,1,1,1,2,1,1,3,1,2,1,1,2,3,1,2,1,1,3,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,4,1,1,1,1,1,3,1,1,1,1,3,3,1,1,3,1,2,1,1,1,1,3,1,3,1,3,1,1,2,1,1,2,3,1,2,1,2,1,2,2,2,1,1,3,2,1,1,2,1,1,1,3,2,1,1,3,6,2,1,1,2,1,1,3,2,2,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,4,1,2,1,3,3,1,1,1,1,2,2,2,3,2,1,4,1,2,1,1,1,1,2,1,1,2,2,2,1,1,2,1,1,3,2,3,2,1,1,1,3,1,2,2,2,2,3,7,2,2,2,2,1,1,1,1,1,5,2,2,1,4,3,1,1,1,1,2,1,2,1,1,1,1,1,3,3,1,1,2,1,1,1,2,1,2,1,1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,3,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,2,2,1,2,3,1,1,1,2,2,1,2,1,1,3,2,1,1,3,3,1,1,1,1,2,4,1,5,1,2,1,2,1,2,1,1,1,2,1,2,1,1,2,2,1,1,2,1,1,2,2,6,1,2,5,2,1,1,1,1,2,1,1,6,1,1,3,1,1,1,2,2,1,3,1,1,2,2,1,1,1,2,1,3,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,2,1,2,1,2,2,1,3,2,2,1,2,2,1,1,2,1,6,3,2,1,2,1,1,2,1,2,2,3,3,1,4,2,1,2,2,4,2,1,2,2,1,1,1,2,1,1,1,1,1,2,1,1,2,1,3,1,2,2,1,1,1,2,1,4,1,1,3,1,2,1,4,4,1,1,3,2,2,2,3,2,1,1,3,3,1,1,1,1,3,1,1,2,3,3,1,1,3,1,2,2,2,1,2,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,2,2,2,1,1,1,2,1,1,1,3,1,1,3,3,3,1,1,2,1,1,1,3,1,1,4,1,1,3,3,1,2,1,3,2,1,2,1,1,1,1,2,1,3,2,1,1,1,1,1,5,1,1,1,1,1,1,3,2,1,1,3,1,2,1,1,1,2,1,1,3,1,2,1,1,1,3,3,1,2,3,1,3,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,2,1,1,1,4,1,1,1,1,2,1,1,1,1,2,1,3,1,2,1,1,1,1,1,2,1,2,3,1,1,3,1,1,2,1,1,2,1,1,1,1,1,1,2,1,1,3,2,1,1,1,1,1,1,3,1,1,2,2,1,1,1,1,1,2,2,1,2,1,1,1,1,2,1,4,2,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,3,1,1,3,1,1,1,2,1,1,1,2,1,2,1,1,1,1,1,2,2,1,1,2,1,1,2,1,1,1,1,3,1,2,1,1,2,2,1,2,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,3,1,1,1,1,2,2,2,1,3,1,1,1,1,1,1,1,1,1,2,4,2,1,1,2,2,2,1,3,3,3,2,2,2,4,1,1,4,3,1,1,2,1,2,2,2,1,1,1,4,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,2,1,1,2,2,2,1,1,1,2,1,2,1,1,1,1,2,3,1,1,1,1,1,2,1,1,2,1,1,1,3,1,2,1,2,1,1,1,2,1,3,2,2,2,1,1,1,2,2,1,3,1,2,3,1,1,1,2,1,2,1,2,1,1,1,1,1,2,2,1,2,1,2,1,1,1,1,3,1,1,1,3,1,1,2,1,1,1,1,1,3,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,1,2,3,1,1,1,1,1,2,1,1,2,5,1,1,1,1,2,2,1,1,1,1,3,1,1,1,1,3,2,2,1,1,3,1,1,1,1,1,1,1,1,2,3,1,1,1,2,1,1,1,1,2,3,1,2,3,1,1,1,2,2,1,4,1,2,1,1,1,2,1,1,2,2,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,1,1,2,1,3,2,1,1,1,1,2,1,1,2,1,1,1,5,1,4,1,1,2,2,1,3,1,1,1,3,1,2,1,2,3,2,1,1,1,1,1,1,1,1,2,1,2,1,1,4,1,2,1,1,2,2,1,1,1,3,1,3,1,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,2,1,1,1,1,1,2,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,3,1,1,1,2,3,2,1,1,1,1,3,1,2,2,1,6,6,1,2,3,1,1,2,1,2,2,2,1,1,1,2,2,2,1,1,2,3,1,2,1,2,2,1,2,2,5,1,1,1,1,1,3,2,1,1,2,1,1,1,1,1,1,1,1,2,1,2,1,3,1,2,4,2,4,1,1,1,1,2,1,3,3,1,1,1,1,2,1,3,1,1,1,2,1,1,4,1,1,2,1,1,2,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,2,2,2,3,2,1,3,1,1,1,1,2,1,1,2,1,1,2,1,2,1,1,3,1,4,1,1,4,1,1,2,4,2,2,1,1,1,2,1,2,1,1,4,3,1,1,2,1,1,1,1,1,1,1,2,2,2,1,1,5,1,3,4,1,1,1,1,1,2,1,1,1,1,2,5,3,1,1,1,1,1,1,1,1,2,1,2,1,1,1,2,1,2,3,1,1,1,2,1,2,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,3,1,1,1,2,1,2,2,1,1,2,2,2,1,1,1,1,1,2,2,2,1,5,2,2,1,1,3,1,1,1,3,1,2,1,3,1,1,1,2,1,2,2,1,1,1,1,3,3,2,1,1,1,1,1,3,2,2,2,1,1,2,3,2,4,1,1,1,2,2,2,2,1,1,1,1,1,1,6,2,1,1,1,1,2,2,1,1,2,1,1,1,1,2,1,2,1,2,1,1,2,3,1,2,2,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,2,5,1,1,2,1,2,1,1,2,2,3,1,1,3,1,1,2,2,1,3,1,2,1,2,1,1,2,1,2,3,2,1,1,1,1,1,1,1,1,3,1,3,2,4,1,2,2,1,1,1,1,1,2,2,1,1,2,2,1,6,2,1,2,1,2,1,1,3,1,3,1,1,1,1,2,2,1,2,1,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,4,2,2,1,1,1,2,1,1,1,2,2,4,1,1,2,2,1,2,2,5,2,1,3,1,1,3,1,1,1,1,1,3,1,2,2,1,1,5,1,1,2,3,1,1,2,1,1,3,1,1,1,1,4,5,1,1,2,3,1,2,2,2,1,1,2,1,2,2,2,1,4,1,1,2,1,3,1,3,1,1,3,1,1,1,1,2,2,2,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,3,2,2,1,1,2,1,1,1,1,2,2,1,1,2,1,1,2,1,1,1,1,3,5,1,1,2,1,1,1,3,1,6,3,1,2,1,1,2,3,1,2,1,1,2,4,2,4,1,1,3,3,3,1,1,1,1,1,1,2,2,1,1,1,3,3,3,1,1,7,3,1,3,2,1,1,2,2,1,2,2,2,1,1,1,2,2,4,1,4,1,1,3,1,1,3,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,2,1,1,3,4,2,2,1,2,1,1,1,1,1,2,2,3,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,1,4,3,1,4,2,1,1,1,2,1,1,1,1,1,1,1,2,1,2,3,1,3,1,1,1,1,1,1,2,1,1,1,1,2,2,1,1,2,1,1,1,2,2,2,2,2,1,1,2,1,3,3,2,1,1,1,2,2,1,1,2,1,1,1,3,2,1,1,1,1,1,2,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,1,1,2,1,1,1,1,3,1,1,1,1,1,1,2,2,2,1,2,3,1,4,2,1,1,2,2,1,3,3,3,2,2,2,1,3,1,3,2,1,1,1,1,2,2,1,2,1,1,1,2,1,1,2,1,1,4,1,2,2,1,1,1,2,1,1,1,1,1,1,2,2,1,1,3,1,4,1,1,3,2,1,1,1,2,2,1,1,1,5,3,5,1,1,2,2,4,2,1,1,2,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1,2,2,2,1,1,1,5,2,1,2,1,1,1,1,1,1,2,1,4,1,1,3,2,1,1,2,3,4,2,1,1,2,2,4,4,3,2,2,1,1,1,4,3,2,1,2,1,1,1,2,1,2,1,2,1,2,1,3,4,1,2,1,1,1,1,1,1,1,2,1,1,1,3,1,3,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"median":1,"condCols":6,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 6 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 35618 groups, 23675 singletons, 3803 surviving `slices()` (31815 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 8 rows.

**Last row against the column sums above it.** 1 column compared, 0 exact to 1e-6, max absolute residual 1.261e+7, max relative 1.111e+4 at column 0. Reported, not classified.

**Window.** 52948 data rows against the 40-row window, so the window is a **strict sample**; 8 of 12 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `datetime` | — | label | 0 | 52948 | 0 | 52942 | 40 | 0.00 | not moved |
| 1 | `Date` | — | condition | 0 | 52948 | 0 | 2191 | 9 | 0.00 | not moved |
| 2 | `monthB` | — | condition | 0 | 52948 | 0 | 12 | 1 | 0.00 | not moved |
| 3 | `month` | — | attribute *(was data)* | 52948 | 0 | 0 | 12 | 1 | 1.00 | moved — const within col 2 `monthB` |
| 4 | `year` | — | attribute *(was data)* | 52948 | 0 | 0 | 6 | 1 | 1.00 | moved — const within col 1 `Date` |
| 5 | `lon` | — | attribute *(was data)* | 52948 | 0 | 0 | 10 | 10 | 1.00 | moved — const within col 10 `station` |
| 6 | `lat` | — | attribute *(was data)* | 52948 | 0 | 0 | 10 | 10 | 1.00 | moved — const within col 10 `station` |
| 7 | `node` | — | condition | 0 | 52948 | 0 | 1 | 1 | 0.00 | not moved |
| 8 | `SFC` | — | condition | 0 | 52948 | 0 | 2 | 1 | 0.00 | not moved |
| 9 | `FishID` | — | condition | 0 | 52948 | 0 | 8 | 1 | 0.00 | not moved |
| 10 | `station` | — | condition | 0 | 52948 | 0 | 10 | 10 | 0.00 | not moved |
| 11 | `timediff` | — | data | 52940 | 8 | 0 | 24990 | 40 | 0.97 | not moved |

### pos-45 — `FF_blank.csv` :: `FF_blank.csv`

doi:10.5061/dryad.hqbzkh1zw · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 6 files in the deposit, §6.2 decided by tie-break 3: file name ascending · `SheetNames[0]` `FF_blank.csv` · `sha256` `b327aed4f6a3afd1…` matches the receipt · 0.06 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 102 × 102 | `detectHeaderRows` | **1** |
| after prep | 101 data rows × 102 cols | `condPerCol` | `null` |
| matrix | 101 × 102 | `condCtx.type` | `none` |
| roles C/L/D/A/I | 0/0/102/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 1 of 102 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 1.000. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column, and column 0 carries a synthesised header with no real header to the left, so no band is possible there.

**§2.8.** Ran on 101 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":false,"nGroups":null,"sizes":[],"median":null,"condCols":0,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 0 >= 3` → **false**; arm 2 → **false**; pending → **false**. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 0 groups, 0 singletons, 1 surviving `slices()`.

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 102 columns compared, 0 exact to 1e-6, max absolute residual 8.718e+5, max relative 1.320e+3 at column 70. Reported, not classified.

**Window.** 101 data rows against the 40-row window, so the window is a **strict sample**; 102 of 102 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Col 1` *(synth)* | — | data | 101 | 0 | 0 | 101 | 40 | 1.00 | not moved |
| 1 | `200` | — | data | 101 | 0 | 0 | 33 | 16 | 1.00 | not moved |
| 2 | `205` | — | data | 101 | 0 | 0 | 58 | 17 | 1.00 | not moved |
| 3 | `210` | — | data | 101 | 0 | 0 | 63 | 18 | 1.00 | not moved |
| 4 | `215` | — | data | 101 | 0 | 0 | 75 | 28 | 1.00 | not moved |
| 99 | `690` | — | data | 101 | 0 | 0 | 96 | 39 | 1.00 | not moved |
| 100 | `695` | — | data | 101 | 0 | 0 | 96 | 39 | 1.00 | not moved |
| 101 | `700` | — | data | 101 | 0 | 0 | 96 | 39 | 1.00 | not moved |

**94 further `data` columns are rolled up rather than listed** (columns 5–98, non-contiguous where an exemplar was kept). Across them: numeric 101–101, non-numeric 0–0, missing 0–0, distinct 83–99, distinct≤40 35–40. 0 carry any non-numeric cell; 94 have a strict-sample window; 0 were moved by §2.8. **Every non-`data` column and every §2.8-moved column of this sheet is listed above, so nothing anomalous is inside this roll-up.**

### pos-46 — `full_chemistry_wMeta.csv` :: `full_chemistry_wMeta.csv`

**arm 1 without arm 2**

doi:10.5061/dryad.bzkh189qb · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `full_chemistry_wMeta.csv` · `sha256` `a819ac9e0c03464a…` matches the receipt · 0.06 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 265 × 21 | `detectHeaderRows` | **1** |
| after prep | 264 data rows × 21 cols | `condPerCol` | `null` |
| matrix | 264 × 15 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 4/2/15/0/0 | assay · dataType | qpcr (auto-detected) · continuous |
| synthesised headers | 0 of 21 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.714. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 264 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":20,"sizes":[8,17,11,23,23,9,5,15,9,11,11,16,18,19,8,15,16,6,10,14],"median":12.5,"condCols":4,"arm1":true,"arm2":false,"pending":true}`. Arm 1 `condCols 4 >= 3` → **true**; arm 2 → **false**; pending → **true**.

**`suggestRowSemantics`**: `{"value":"ordered","auto":true,"reason":"assay"}`. Auto-applied by `ImportView.jsx:431`; the headless path agrees at `ordered`.

**Partition.** 20 groups, 0 singletons, 20 surviving `slices()` (0 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 15 columns compared, 0 exact to 1e-6, max absolute residual 4.230e+3, max relative 6.098e+2 at column 3. Reported, not classified.

**Window.** 264 data rows against the 40-row window, so the window is a **strict sample**; 19 of 21 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `sample.id` | — | label | 0 | 264 | 0 | 259 | 39 | 0.00 | not moved |
| 1 | `pdw.cts.22` | — | data | 264 | 0 | 0 | 257 | 39 | 1.00 | not moved |
| 2 | `pdw.salicin.22` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |
| 3 | `pdw.salicortin.22` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |
| 4 | `pdw.tremulacin.22` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |
| 5 | `pdw.total.22` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |
| 6 | `genotype` | — | label | 0 | 264 | 0 | 29 | 22 | 0.00 | not moved |
| 7 | `population` | — | condition | 0 | 264 | 0 | 5 | 5 | 0.00 | not moved |
| 8 | `pdw.cts.23` | — | data | 264 | 0 | 0 | 257 | 39 | 1.00 | not moved |
| 9 | `treatment.y1` | — | condition | 0 | 264 | 0 | 2 | 1 | 0.00 | not moved |
| 10 | `treatment.y2` | — | condition | 0 | 264 | 0 | 2 | 2 | 0.00 | not moved |
| 11 | `group` | — | condition | 0 | 264 | 0 | 4 | 2 | 0.00 | not moved |
| 12 | `pdw.salicin.23` | — | data | 264 | 0 | 0 | 259 | 39 | 1.00 | not moved |
| 13 | `pdw.salicortin.23` | — | data | 264 | 0 | 0 | 259 | 39 | 1.00 | not moved |
| 14 | `pdw.tremulacin.23` | — | data | 264 | 0 | 0 | 259 | 39 | 1.00 | not moved |
| 15 | `pdw.total.23` | — | data | 264 | 0 | 0 | 259 | 39 | 1.00 | not moved |
| 16 | `d.cts` | — | data | 264 | 0 | 0 | 259 | 39 | 1.00 | not moved |
| 17 | `d.pgs` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |
| 18 | `d.scort` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |
| 19 | `d.scin` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |
| 20 | `d.tcin` | — | data | 264 | 0 | 0 | 264 | 40 | 1.00 | not moved |

### pos-47 — `seed-density.csv` :: `seed-density.csv`

**refuses at `ImportView.jsx:974`** — no gate answer owed (§14.3)

doi:10.5061/dryad.cnp5hqcmx · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 2 files in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `seed-density.csv` · `sha256` `2b27bdb912e1066e…` matches the receipt · 0.03 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 761 × 11 | `detectHeaderRows` | **1** |
| after prep | 760 data rows × 11 cols | `condPerCol` | `null` |
| matrix | 760 × 1 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 7/1/1/2/0 | assay · dataType | densitometry (auto-detected) · continuous |
| synthesised headers | 0 of 11 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` true · numeric fraction of row 2 0.364. Failed: row0 is not a sparse group row; row2 numeric fraction 0.364 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 760 rows and **moved 2 columns** via 1 grouping key: `plot_id` (col 1, 80 levels → 2).

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":261,"sizes":[28,32,1,19,27,40,11,2,55,21,1,3,33,1,8,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,29,1,1,1,1,1,1,1,1,1,1,1,39,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,40,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,46,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,38,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,40,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"median":1,"condCols":7,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 7 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":"ordered","auto":true,"reason":"assay"}`. Auto-applied by `ImportView.jsx:431`; the headless path agrees at `ordered`.

**Partition.** 261 groups, 238 singletons, 18 surviving `slices()` (243 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 1 column compared, 0 exact to 1e-6, max absolute residual 1.171e+3, max relative 1.952e+2 at column 0. Reported, not classified.

**Window.** 760 data rows against the 40-row window, so the window is a **strict sample**; 10 of 11 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `date` | — | condition | 0 | 760 | 0 | 10 | 1 | 0.00 | not moved |
| 1 | `plot_id` | — | label | 760 | 0 | 0 | 80 | 40 | 1.00 | not moved |
| 2 | `seed_density` | — | attribute *(was data)* | 760 | 0 | 0 | 10 | 5 | 1.00 | moved — const within col 1 `plot_id` |
| 3 | `burial_treatment` | — | attribute *(was data)* | 760 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 1 `plot_id` |
| 4 | `clam_code` | — | condition | 0 | 760 | 0 | 5 | 4 | 0.00 | not moved |
| 5 | `shoot_count` | — | data | 760 | 0 | 0 | 24 | 1 | 1.00 | not moved |
| 6 | `length_cm_1` | — | condition | 243 | 516 | 1 | 106 | 1 | 0.00 | not moved |
| 7 | `length_cm_2` | — | condition | 186 | 574 | 0 | 101 | 1 | 0.00 | not moved |
| 8 | `length_cm_3` | — | condition | 140 | 620 | 0 | 85 | 1 | 0.00 | not moved |
| 9 | `length_cm_4` | — | condition | 103 | 657 | 0 | 68 | 1 | 0.00 | not moved |
| 10 | `length_cm_5` | — | condition | 75 | 685 | 0 | 59 | 1 | 0.00 | not moved |

### pos-49 — `data_R.csv` :: `data_R.csv`

doi:10.5061/dryad.3r2280gzk · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `data_R.csv` · `sha256` `61f21b24f2468c1f…` matches the receipt · 0.07 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 1859 × 9 | `detectHeaderRows` | **1** |
| after prep | 1857 data rows × 9 cols | `condPerCol` | `null` |
| matrix | 1857 × 5 | `condCtx.type` | `none` |
| roles C/L/D/A/I | 0/1/5/3/0 | assay · dataType | physiological (auto-detected) · continuous |
| synthesised headers | 0 of 9 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 1.000. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 1857 rows and **moved 3 columns** via 4 grouping keys: `Treenr` (col 1, 9 levels → 1); `Height` (col 2, 9 levels → 1); `Whorl` (col 4, 9 levels → 1); `dry_wetratio` (col 7, 52 levels → 1).

**`computeTrigger`** (`replicates`): `{"attempted":false,"nGroups":null,"sizes":[],"median":null,"condCols":0,"arm1":false,"arm2":false,"pending":false}`. Arm 1 `condCols 0 >= 3` → **false**; arm 2 → **false**; pending → **false**. `attempted` is false, so this is the early return at `groupingTrigger.js:85-86` where `pending` is a literal rather than `arm1 || arm2`.

**`suggestRowSemantics`**: `{"value":"ordered","auto":true,"reason":"assay"}`. Auto-applied by `ImportView.jsx:431`; the headless path agrees at `ordered`.

**Partition.** 0 groups, 0 singletons, 1 surviving `slices()`.

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 5 columns compared, 0 exact to 1e-6, max absolute residual 1.407e+4, max relative 1.192e+5 at column 2. Reported, not classified.

**Window.** 1857 data rows against the 40-row window, so the window is a **strict sample**; 8 of 9 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `ID` | — | label | 1857 | 0 | 0 | 1857 | 40 | 1.00 | not moved |
| 1 | `Treenr` | — | attribute *(was data)* | 1857 | 0 | 0 | 9 | 6 | 1.00 | moved — const within col 2 `Height` |
| 2 | `Height` | — | attribute *(was data)* | 1857 | 0 | 0 | 9 | 6 | 1.00 | moved — const within col 1 `Treenr` |
| 3 | `Toppshoot` | — | attribute *(was data)* | 1857 | 0 | 0 | 2 | 2 | 1.00 | moved — const within col 7 `dry_wetratio` |
| 4 | `Whorl` | — | data | 1857 | 0 | 0 | 9 | 5 | 1.00 | not moved |
| 5 | `Length` | — | data | 1857 | 0 | 0 | 184 | 29 | 1.00 | not moved |
| 6 | `WetWeight` | — | data | 1857 | 0 | 0 | 330 | 40 | 1.00 | not moved |
| 7 | `dry_wetratio` | — | data | 1857 | 0 | 0 | 52 | 13 | 1.00 | not moved |
| 8 | `DryWeight` | — | data | 1857 | 0 | 0 | 573 | 39 | 1.00 | not moved |

### pos-50 — `Assemblies_and_species.tsv` :: `Assemblies_and_species.tsv`

doi:10.5061/dryad.1rn8pk187 · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 1 file in the deposit, §6.2 decided by single candidate · `SheetNames[0]` `Assemblies_and_species.tsv` · `sha256` `2cf22e945ff29ad2…` matches the receipt · 0.01 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 149 × 9 | `detectHeaderRows` | **1** |
| after prep | 147 data rows × 9 cols | `condPerCol` | `null` |
| matrix | 147 × 3 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 1/5/3/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 9 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.333. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.333 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 147 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":21,"sizes":[32,50,13,2,2,5,9,1,1,5,1,1,1,1,1,2,10,2,5,1,2],"median":2,"condCols":1,"arm1":false,"arm2":true,"pending":true}`. Arm 1 `condCols 1 >= 3` → **false**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 21 groups, 8 singletons, 8 surviving `slices()` (13 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 1 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 0 rows.

**Last row against the column sums above it.** 3 columns compared, 0 exact to 1e-6, max absolute residual 2.465e+6, max relative 1.823e+2 at column 2. Reported, not classified.

**Window.** 147 data rows against the 40-row window, so the window is a **strict sample**; 9 of 9 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `Species` | — | label | 0 | 147 | 0 | 103 | 24 | 0.00 | not moved |
| 1 | `Bat family` | — | condition | 0 | 147 | 0 | 21 | 7 | 0.00 | not moved |
| 2 | `Assembly name (Senckenberg)` | — | label | 0 | 147 | 0 | 146 | 39 | 0.00 | not moved |
| 3 | `Assembly name (ToLID)` | — | label | 0 | 147 | 0 | 146 | 39 | 0.00 | not moved |
| 4 | `Contig N50 (L50)` | — | label | 0 | 147 | 0 | 146 | 39 | 0.00 | not moved |
| 5 | `TOGA no. Intact Genes` | — | data | 147 | 0 | 0 | 137 | 39 | 1.00 | not moved |
| 6 | `TOGA no. genes with inactivating mutations` | — | data | 147 | 0 | 0 | 129 | 36 | 1.00 | not moved |
| 7 | `TOGA no. genes with missing sequences` | — | data | 147 | 0 | 0 | 116 | 37 | 1.00 | not moved |
| 8 | `compleasm percent complete` | — | label | 0 | 147 | 0 | 85 | 33 | 0.00 | not moved |

### pos-51 — `Pieris_phenotype.csv` :: `Pieris_phenotype.csv`

doi:10.5061/dryad.v15dv42cj · sheet **1 of 1** (`sheetIndex` 0, 0-based) · 2 files in the deposit, §6.2 decided by cell count · `SheetNames[0]` `Pieris_phenotype.csv` · `sha256` `0745f1260c7680e3…` matches the receipt · 0.07 MB · 0.1 s.

| | | | |
|---|---|---|---|
| raw | 572 × 19 | `detectHeaderRows` | **1** |
| after prep | 571 data rows × 19 cols | `condPerCol` | `null` |
| matrix | 570 × 9 | `condCtx.type` | `row-grouped` |
| roles C/L/D/A/I | 3/7/9/0/0 | assay · dataType | general (auto-detected) · continuous |
| synthesised headers | 0 of 19 | zeroAsMissing · longFormat | false · false |

**Header detection.** Returned **1**. `isSparseGroupRow(row0)` false · `isRepeatingSubHeader(row1)` false · numeric fraction of row 2 0.053. Failed: row0 is not a sparse group row; row1 is not a repeating sub-header; row2 numeric fraction 0.053 <= 0.5.

**Bands.** **No spanning header.** Every real header cell covers exactly one column.

**§2.8.** Ran on 571 rows and **moved no column**. Unlike the floor case, the pass looked and declined.

**`computeTrigger`** (`replicates`): `{"attempted":true,"nGroups":114,"sizes":[2,4,4,1,5,1,4,3,12,4,17,3,3,1,3,1,16,4,1,1,2,2,2,8,10,5,3,7,2,7,28,12,1,11,3,9,2,1,2,2,4,1,2,3,3,6,8,2,2,2,6,5,4,3,6,1,15,14,1,3,3,7,10,7,2,14,5,6,3,4,4,16,26,6,1,2,1,1,4,1,2,3,13,5,1,5,3,5,4,22,2,3,2,1,3,5,1,7,3,3,1,4,2,5,2,10,5,5,4,4,1,6,3,2],"median":3,"condCols":3,"arm1":true,"arm2":true,"pending":true}`. Arm 1 `condCols 3 >= 3` → **true**; arm 2 → **true**; pending → **true**.

**`suggestRowSemantics`**: `{"value":null,"auto":false,"reason":"user-choice"}`. `ImportView` auto-applies nothing and the gate is REQUIRED; `corpus-run.mjs:246` substitutes `'ordered'`.

**Partition.** 114 groups, 20 singletons, 74 surviving `slices()` (40 dropped by the 3-row filter).

**Prep.** `preprocessRaw` skipped 0 rows from the top and trimmed 0 from the bottom. `prepStructure` stripped a further 0. No blank row survives into `data`; `extractAnalysisInputs` dropped 1 row.

**Last row against the column sums above it.** 4 columns compared, 0 exact to 1e-6, max absolute residual 1.000e+4, max relative 5.496e+2 at column 0. Reported, not classified.

**Window.** 571 data rows against the 40-row window, so the window is a **strict sample**; 18 of 19 columns have `distinct != distinct(window)`.

| # | header | band | role | numeric | non-num | missing | distinct | d≤40 | nf≤40 | §2.8 |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | `SampleID` | — | label | 571 | 0 | 0 | 571 | 40 | 1.00 | not moved |
| 1 | `CollectionDate` | — | condition | 0 | 571 | 0 | 44 | 6 | 0.00 | not moved |
| 2 | `SiteID` | — | condition | 0 | 571 | 0 | 19 | 3 | 0.00 | not moved |
| 3 | `Sex` | — | condition | 0 | 571 | 0 | 2 | 2 | 0.00 | not moved |
| 4 | `total_mass` | — | data | 559 | 12 | 0 | 168 | 32 | 0.95 | not moved |
| 5 | `thorax_mass` | — | data | 568 | 3 | 0 | 70 | 27 | 0.97 | not moved |
| 6 | `fw_length` | — | data | 537 | 34 | 0 | 514 | 40 | 0.97 | not moved |
| 7 | `fw_area` | — | data | 493 | 78 | 0 | 493 | 36 | 0.88 | not moved |
| 8 | `wing_loading` | — | data | 486 | 85 | 0 | 487 | 36 | 0.88 | not moved |
| 9 | `aspect_ratio` | — | data | 493 | 78 | 0 | 494 | 36 | 0.88 | not moved |
| 10 | `wingtip_area` | — | data | 426 | 145 | 0 | 421 | 26 | 0.63 | not moved |
| 11 | `wingspot_anterior_area` | — | data | 466 | 105 | 0 | 437 | 27 | 0.65 | not moved |
| 12 | `wingspot_posterior_area` | — | data | 461 | 110 | 0 | 148 | 9 | 0.65 | not moved |
| 13 | `basalfw_nir` | — | label | 306 | 265 | 0 | 307 | 20 | 0.47 | not moved |
| 14 | `wingtip_nir` | — | label | 304 | 267 | 0 | 305 | 20 | 0.47 | not moved |
| 15 | `postdiscal_nir` | — | label | 305 | 266 | 0 | 306 | 20 | 0.47 | not moved |
| 16 | `basalhw_dorsal_nir` | — | label | 305 | 266 | 0 | 306 | 20 | 0.47 | not moved |
| 17 | `basalhw_ventral_nir` | — | label | 306 | 265 | 0 | 307 | 20 | 0.47 | not moved |
| 18 | `marginalhw_nir` | — | label | 301 | 270 | 0 | 302 | 19 | 0.45 | not moved |

## 12 — what this record does not settle

- **No arm ran.** Neither arm A nor arm B has been run on any round-2 deposit. No test executed, no
  flag, no `primaryP`, no severity.
- **No gate is answered.** Column relationship, row semantics and the §13.3 confirm set are all
  unanswered. The answers are formed from this table afterwards, in one pass, and written to the run
  log then. **Nothing here is an answer, and `computeTrigger`'s `pending` is not one either** — it
  says whether the card renders, not what should be ticked.
- **No verdict, no `cov.ran`, no row fraction.** §13.5 and §15.2's per-arm fields are not derivable
  from a structural read and none is attempted.
- **§8.3's polyfill assertion is not performed here.** `parseExcel` through the polyfill against
  `parseExcel` on a buffer read from disk belongs with arm B's run. **It must not be assumed done**
  for any deposit in this table, and every run log §4 *Polyfill assertion* cell stays empty until it
  is performed.
- **Nothing about what a reader sees.** No screen was opened for any deposit here. In particular
  **this record does not assert that the shipped surface accepts any of these 30 sheets**; it reports
  `nNumericDataCols`, which §15.1 proves is the same computation as `ImportView`'s `sum.nDC` within a
  prep, while leaving prep divergence open (`S381-HARNESS-APP-DIVERGENCE.md`).
- **Every figure is a `replicates` figure.** `corpus-run.mjs:247` hardcodes the column answer, so the
  trigger, the partition, `condCtx.type` and the coverage implications would all move under
  `conditions`. §15.4: that answer has no round-1 coverage forecast at all.
- **The band maps are a structure, not a §16 ruling.** Whether a deposit falls in §16's class is an
  arm-B judgement made against the shipped screen, and no screen was read here.
- **The total-row residual is unclassified** by design, on every deposit including position 1.
- **The arm-1-only deposits are identified, not priced.** Whether confirming the grouping moves
  anything on them is an arm-B question.
- **Nothing about the five surplus deposits.** §12.6's spares are outside the thirty and were not read.


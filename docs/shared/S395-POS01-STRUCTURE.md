# pos-01 — the structural read of `micro_data_compiled.xlsx [1300-3]`

**Read-only.** No `src/` file was modified, and none needed to be. The 27-fixture batch was not run
and is not a gate here: there is no `src/` diff for it to gate. There is no rendering surface, so
there is no preview step.

**This read does not answer either arm-B gate and does not run either arm.** It produces the
structural facts the answers must follow from, per §6.4 — *arm-B answers are written down for a
deposit before either arm runs on that deposit*. No role was reassigned; §14.3 rules role
reassignment outside arm B by definition.

**Instrument.** `test/probes/probe-s395-pos01-structure.mjs`, run through
`test/probes/s395-corpus-run-hook.mjs`. The hook replaces `scripts/corpus-run.mjs`'s CLI tail — from
the `── Main ──` banner to EOF — with an export list and touches nothing above it, so `prepStructure`
and `buildAnalysisConfig` here are **the census path's own source text executed**. `inferBaseRoles`
and `detectGroupAttributes` are imported from `src/import/roles.js` under the same specifier
`corpus-run.mjs:53` uses, so they are the same module instance and not a copy. The hook throws if the
anchor moves or is not unique.

**Naming hazard.** The hook and `probe-s395-role-inversion.mjs` carry an `s395` prefix and are **both
S394's**, along with `probe-s396-inversion-incidence.mjs`. `probe-s395-pos01-structure.mjs` is the
only S395 file among them. The hook is reused unchanged.

```bash
node --import ./test/probes/s395-corpus-run-hook.mjs \
     test/probes/probe-s395-pos01-structure.mjs --verify --layout --cols --m1 --g28 --rows --md
```

`corpus-data/` and `corpus-out/` are gitignored and exist only in the main checkout, so the probe
resolves both against `/Users/hedgehog/Projects/check-my-data` rather than against its own worktree.

## What this read found

- **The instrument is exact against the recorded artefact.** All 21 fields of this sheet's
  `corpus-out/round2-inventory.json` record recomputed, 0 differing. Every per-column figure below is
  taken off the prep that reproduced it.
- **The header row is a band row, not a per-column name row.** Four real header cells over sixteen
  columns; **twelve of the sixteen headers are `Col N` placeholders `prepStructure:185` synthesised
  for blank cells.** The three real band labels span 5, 6 and 4 columns. `detectHeaderRows` returned
  **1**, so `condPerCol` is `null` and the bands are carried into nothing.
- **The 15 data columns are three groups of replicates, not fifteen of anything.** Columns 1–5 are
  `Anhydrous MORB glass`, 6–11 `silicate part of the melt`, 12–15 `Metals`. That grouping exists only
  in the header row's blank cells and is invisible to the roles, to `condCtx` (`type: none`) and to
  the inventory.
- **The rows are 15 chemical elements plus a `TOTAL` row**, and the `TOTAL` row is inside the
  analysed matrix.
- **P217 (M1) cannot misrepresent this sheet, and that is measured rather than assumed.** The sheet
  has 17 data rows against a 40-row window, so **the window is the whole column on all sixteen** —
  `distinct == distinct(window)` on 16 of 16. Fifteen columns leave `inferBaseRoles` at the `:48`
  fallthrough and one at `:38`. No header matches either keyword list; the `:47` integer-run trap
  fires on nothing.
- **P218 (§2.8) moved no column, and the reason is the row floor, not the mechanism declining.** The
  pass received 17 rows against `MIN_ROWS_FOR_GROUPING = 50` and returned at `roles.js:90` before
  evaluating any candidate. This sheet is a P218 non-instance by the floor.
- **The non-numeric-against-missing split is unambiguous here.** All 16 non-numeric cells are the
  element symbols in column 0; all 16 missing cells are the single blank row. **No `NA`-style token
  appears anywhere on the sheet**, so the ambiguity the `pos-44` row records as unresolved does not
  arise on this one.

## 1 — provenance, and the two manifests agreeing

Resolved from the manifests, not from the dispatch text.

| | Position | DOI | File | Sheet | `sheetIndex` |
|---|---|---|---|---|---|
| `corpus-data/round2/round2-files.json` | 1 | `doi:10.5061/dryad.fttdz0980` | `micro_data_compiled.xlsx` | — (receipt carries no sheet) | — |
| `docs/shared/round2-raw/round2-ranking.json` | 1 | `doi:10.5061/dryad.fttdz0980` | `micro_data_compiled.xlsx` | `1300-3` | `6`, of `sheetTotal` 7 |

The receipt's `sha256` `a79bb8cbdd1b601cc2878d20f9497bb537ee40b268b066b46ed9966e4d6a7818` matches the
file on disk. **No disagreement between the two, or with run log §4.**

**The index agrees across the three surfaces once the base is stated.** `sheetIndex` is 0-based in
both the inventory and the ranking file and reads **6**; run log §4's column is 1-based and reads
**7 / 7**. 6 + 1 = 7 = `sheetTotal`. This is the last of seven.

**`SheetNames`, in workbook order**, so §7's discarded alternative stays auditable:

```
0  Initial MORB               ← SheetNames[0], what BatchView as it ships would open
1  Anhydrous picrobasalt
2  Synthetic MORB
3  1200-1
4  1200-3
5  1300-1
6  1300-3                     ← §6.2-selected
```

`SheetNames[0]` is **`Initial MORB`**: 14 valid rows × 5 data columns, `cellCount` 70, against the
selected sheet's 240. §6.2 decided on cell count (`decidedBy: "cell count"`). The ranking records
`anyTieOnCellCount: true`, but the tied members sit at 176 and 70 — **the tie did not decide this
sheet** and the tie-break was not reached at the top.

## 2 — the instrument proved against the artefact

`corpus-out/round2-inventory.json` was produced by `scripts/corpus-run.mjs --inventory` over 199
files and 270 sheets. Nothing was regenerated for this read. The probe recomputed this sheet's record
through `CR.inventorySheet` and compared field by field:

```
VERIFY — recomputed against corpus-out/round2-inventory.json
  fields compared: 21   differing: 0
  VERDICT: EXACT on every field
```

The recorded record, in full:

| field | value | | field | value |
|---|---|---|---|---|
| `sheet` | `1300-3` | | `nNumericDataCols` | **15** |
| `sheetIndex` / `sheetTotal` | 6 / 7 | | `cellCount` | 240 |
| `passed` / `error` | `true` / `null` | | `missingFraction` | 0 |
| `rawRows` / `rawCols` | 21 / 16 | | `roleCounts` | `{condition:0, label:1, data:15, attribute:0, ignore:0}` |
| `headerRows` | 1 | | `grouping` | `{kind: "none"}` |
| `nBlocks` | 1 | | `groupingPending` | **`false`** |
| `detectBlocksSplit` | `false` | | `assay` / `dataType` | `general` / `continuous` |
| `validRows` | **16** | | `zeroAsMissing` / `longFormatDetected` | `false` / `false` |

`validRows` is `matrix.length` (`corpus-run.mjs:427`) and `nNumericDataCols` is `matrix[0]?.length`
(`:428`).

**The inventory carries counts only.** `roleCounts` is a five-way tally built at `:435-436` from a
`roles` array that is in scope and never written out; no header text is emitted at any point. So
Part 2 was the full measurement rather than a formatting job, and every per-column figure below is
new.

**`nNumericDataCols` reads 15, so §14.6's refusal-first route does not apply.** §15.1 closed
§14.2's open step at source — `nNumericDataCols` and `ImportView`'s `sum.nDC` are the same
computation within a prep (`engine.js:118-126` against `summary.js:4`) — so this is a proven
equality and not merely a wide margin against the floor of 2. **What §15.1 leaves open is prep
divergence**, censused separately in `S381-HARNESS-APP-DIVERGENCE.md`; nothing here closes that, and
this record does not assert what the shipped surface will render.

## 3 — the sheet's geometry, measured

Raw non-empty cell counts per row, all 21 rows:

```
[1, 0, 0, 4, 0, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16]
```

- **Raw row 0 holds one cell**: the whole methods caption in `A1`, ending *"The samples were heated
  at 1300 °C for 3 hours in every phase."* — which is where the sheet name `1300-3` comes from.
- **Raw rows 1, 2 are blank.** The preamble strip at `prepStructure:171-174` removes rows 0–2:
  `minCells0 = max(2, ceil(16 × 0.1)) = 2`, and each of the three falls short.
- **Raw row 3 is the header**, 4 non-empty cells of 16.
- **Raw row 4 is blank** and survives into `data` as data-row index 0.
- **Raw rows 5–20 are the 16 data rows.**

`detectHeaderRows` returned **1**, so `hdrs` is raw row 3 and `data` is raw rows 4–20 — **17 rows**.
`extractAnalysisInputs` drops the one all-blank row, giving the **16 × 15** matrix the inventory
records. `condCtx.type` is `none`.

**The bands.** A real header cell owns every synthesised column to its right:

| Columns | Width | Header cell |
|---|---|---|
| 0 | 1 | `Element` |
| 1–5 | 5 | `Anhydrous MORB glass` |
| 6–11 | 6 | `silicate part of the melt` |
| 12–15 | 4 | `Metals` |

**Twelve of sixteen headers are synthesised.** `prepStructure:185` writes `Col N` wherever the header
cell is blank, and the blanks here are the continuation cells of three spanning labels. **The bands
are the file's own experimental structure and nothing carries them forward:** `detectHeaderRows`
returned 1, so `condPerCol` is `null`, the two-row-header branch at `:187-198` was not taken, and no
role, no `condCtx` and no inventory field records that columns 1–5 measure one material and 12–15
another.

**Header keywords fire on nothing.** All 16 headers were tested against both lists at `roles.js:43`
and `:44`: **no match on any**. This is a near miss worth recording — a band label landing on one of
those stems would have re-roled a measurement column, and `Metals` sits one word away from the
`condition` list.

**The rows are elements, plus a total.** Column 0 reads, in order:

```
Si, Mg, Ca, Al, Ti, Cr, Na, K, Mn, Fe, Ni, P, S, O, W, TOTAL
```

**`TOTAL` is the last row of the analysed matrix** — a derived row inside the 16 rows every test will
see. Against the sum of the 15 rows above it, per column:

- exact to 1e-6 on **0 of 15** columns
- residual max **2.913e-2**, mean **8.661e-3**, in wt% against column sums near 100
- largest residual as a fraction of the reported total: **2.91e-4**

**Both readings stay open.** An exact match would have proven the row is a live formula over the
rows above; a residual of this size is equally consistent with a total reported at a precision the
rounded cells above cannot reproduce. This read does not distinguish them, and nothing here depends
on which it is.

## 4 — the per-column read

One row per raw column as the parser sees it. **Band** is additive to the fields the dispatch names:
it is the one per-column fact the two gates turn on and it is invisible in the role column. `nf ≤40`
is the numeric fraction over `inferBaseRoles`'s window; **on this sheet that window is the whole
column** (§5).

| # | Header (verbatim) | Band | Role | Numeric | Non-num | Missing | Distinct | Distinct ≤40 | nf ≤40 | §2.8 |
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

Role counts: **Data 15 / Label 1 / Cond 0 / Attr 0 / ignore 0** — identical to the inventory's
`roleCounts`, which is the second place the reconstruction agrees with the artefact.

**Counts are over `data`, the 17 post-header rows** — the column as the parser hands it to role
inference, which is what the dispatch asks for.

## 5 — P217 (M1): the window is not a sample here

`inferBaseRoles` decides on `data.slice(0, 40)`. **This sheet has 17 data rows, so the window is the
entire column on every one of the sixteen.** Measured, not inferred: `distinct == distinct(window)`
on **16 of 16**.

**M1's failure mode requires the window to misrepresent the column, and there is no unseen remainder
to misrepresent it with.** Whatever else is true of these roles, none of them can be an M1
inversion.

The branch each column left by:

| # | Header | nf | uniq | u/n | `:47` integer run | Branch → role |
|---|---|---|---|---|---|---|
| 0 | `Element` | 0.00 | 16 | 1.00 | n/a | `:38` `nf < 0.5`, `u/n ≥ 0.3` → **label** |
| 1–15 | the fifteen data columns | 1.00 | 14–16 | 0.88–1.00 | not all integer | `:48` fallthrough → **data** |

- **Column 0 took M1's own branch and came out `label`, not `condition`.** The second test at `:38`
  is `uniq <= 20 && uniq/n < 0.3`. It holds 16 distinct values over 16 non-missing cells, `u/n =
  1.00`. To have been scored `condition` it would need at most 4 distinct values over those 16. It is
  not near the boundary.
- **No data column tripped `:47`.** The integer-run trap needs `nums.every(Number.isInteger)`; every
  data column carries non-integer wt% values, so the test short-circuits on all fifteen. **0 columns
  tripped it.**
- **`:41` was not reachable** — `condPerCol` is `null`, per §3.

## 6 — P218 (§2.8): no column moved, and the floor is why

`detectGroupAttributes` was run on this sheet's own `data` and `baseRoles`:

```
rows handed to the pass      : 17
columns handed to the pass   : 16
row floor (roles.js:8)       : 50   NOT MET — the pass returns at roles.js:90
column floor (roles.js:90)   : 2    met
groupings returned           : 0
columns re-roled 'attribute' : 0
base vs shipped roles differ : 0 of 16 columns
identity vs baseRoles        : same array object — nothing re-roled
```

**No column is moved and no column is constant within a grouping key, because no candidate was ever
evaluated.** `MIN_ROWS_FOR_GROUPING` is 50 and the sheet offers 17, so `roles.js:90` returns before
the parse loop. `MIN_ROWS_FOR_GROUPING` is §2.8's **row floor** and is a different pass from group
formation, whose thresholds are `MIN_PER_GROUP = 3` and `THIN_MEDIAN = 4`.

**This distinction is the whole content of the §2.8 column above.** "Not moved" here does not mean
the mechanism looked and declined; it means the mechanism did not look. A later reader comparing
this deposit against `pos-02`, `pos-44` or `pos-47` — where §2.8 is the sole cause of all three
refusals — should read this sheet as a **non-instance by the floor**, carrying no evidence either
way about whether the hold-out would have fired on a longer version of the same design.

Identity is reported against the array handed in rather than against `prepStructure`'s own result:
all three of `:90`, `:125` and `:186` return `roles` unchanged, so identity alone proves nothing was
re-roled but does not isolate which return fired. **The row count against the floor is what isolates
`:90`.**

## 7 — the non-numeric / missing split

The predicates, taken verbatim from the shipped source rather than restated:

- **missing** — `v == null || v === ''` (`inferBaseRoles:35`, `detectGroupAttributes:102`)
- **numeric** — `!isNaN(Number(v))` (`inferBaseRoles:37`)
- **non-numeric** — present, and not numeric

So a literal `NA` is **non-numeric, not missing**. That is the asymmetry the `pos-44` row records as
unresolved: eight `NA` cells counted as non-numeric, and what the header means depends on which they
are.

**On this sheet the split is unambiguous and the open item does not arise:**

- **16 non-numeric cells, all in column 0**, and all of them element symbols or `TOTAL` — every one a
  genuine text label, none a missing-value sentinel. The complete token set is `Si, Mg, Ca, Al, Ti,
  Cr, Na, K, Mn, Fe, Ni, P, S, O, W, TOTAL`.
- **16 missing cells, exactly one per column**, all sixteen from the single blank row at data-row
  index 0.
- **No `NA`, `ND`, `-`, `n/a` or similar token appears anywhere on the sheet.**

**One reconciliation, so two figures are not read as contradicting.** The inventory records
`missingFraction: 0` while this section counts 16 missing cells. They are different denominators, not
different answers: `inventorySheet` computes nulls over the **returned matrix** (16 × 15), from which
the blank row has already been dropped, while the counts above are over **`data`** (17 × 16), which
still contains it. Both are correct on their own object.

## 8 — what this read does not settle

- **Nothing about either arm's verdict.** No test ran, no flag, severity or `cov.ran` was computed,
  and neither arm was run. The record stops before `runFullAnalysis`.
- **Nothing about cost or runtime.** No arm was timed and no figure here prices anything.
- **Nothing about what a reader sees.** There is no screen read in this record. Every figure comes
  from the headless census path, and §15.1's open item — prep divergence between that path and the
  shipped surface — is untouched. **In particular, this record does not assert that the shipped
  surface accepts this sheet**; it asserts only that the floor `nNumericDataCols` feeds reads 15.
- **Neither arm-B gate is answered here**, and neither is the confirm gate. Column relationship, row
  semantics and the §13.3 confirm set are §6.4's to fill in before either arm runs, and run log §4's
  cells for pos-01 stay empty until they are. **The bands in §3 are a structural fact, not an answer
  to the column gate** — and per §15.4 neither answer to that gate is the safe one, with the
  `conditions` answer carrying no round-1 coverage forecast at all.
- **No role was reassigned and none is proposed.** §14.3.
- **Whether the `TOTAL` row should reach the tests.** It is recorded as present in the matrix; what
  that costs is not measured and no rule here removes it.
- **Whether the three bands should have been detected.** `detectHeaderRows` returning 1 on a spanning
  band row is recorded as the mechanism by which they are lost. Whether that is a defect is not this
  document's question and no register row is claimed for it.
- **Anything about the other 29 deposits.** One deposit, one sheet. The §2.8 floor result in
  particular is a property of this sheet's 17 rows and generalises to nothing.

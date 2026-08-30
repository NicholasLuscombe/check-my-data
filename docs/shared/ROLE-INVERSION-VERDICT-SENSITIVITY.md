# Does the role inversion move a verdict? Round 1, where the battery can run

**No round-1 deposit is characterised as fabricated or honest anywhere in this document.** This
measures the difference between two role assignments on the same file. It makes no claim about the
data, about any deposit, or about any author.

**This dispatch does not touch round 2.** No round-2 deposit is opened, analysed or timed here. The
round-2 population appears only where a rate measured there is quoted for comparison, from the
already-committed `ROLE-INFERENCE-INVERSION-CENSUS.md`.

**Read-only on `src/`.** No `src/` file was modified. The §2.8 counterfactual is the shipped role
array with `attribute` reverted to `data`, handed to the shipped `buildAnalysisConfig` →
`extractAnalysisInputs` → `runFullAnalysis`. Shipped code, a different input — not a patched rule.
The 27-fixture batch is not a gate: nothing under `src/` changed, and the fixture set carries zero
inversions (`ROLE-INFERENCE-INVERSION-CENSUS.md` §1.3), so it cannot exercise this.

**Session numbering.** This is S394's third pass. The two committed probes carry `s395` and `s396` in
their filenames; there are no sessions 395 or 396 and those names are not renamed here, because the
census document and two commit messages already cite them.

**Instrument.** `test/probes/probe-s394-verdict-sensitivity.mjs`, run through the same load-time hook
`test/probes/s395-corpus-run-hook.mjs`. Neither role predicate is reimplemented: `inferBaseRoles` and
`detectGroupAttributes` are called and their inputs and outputs are read.

```bash
node --import ./test/probes/s395-corpus-run-hook.mjs \
     test/probes/probe-s394-verdict-sensitivity.mjs --pop round1 --incidence --sensitivity
node --import ./test/probes/s395-corpus-run-hook.mjs \
     test/probes/probe-s394-verdict-sensitivity.mjs --pop round1 --run --cap 600 --offsets 1
```

## The answer, in short

**Round 1 carries the inversion on 10 of 116 floor-passing sheets (8.6%)** — under a third of round
2's usable rate, and the shape differs: every round-1 inversion costs measurement columns, none
gains a fabricated condition level alone, and none is inverted into refusal.

**Reverting §2.8 changes the evidence on 7 of 9 measured sheets and the verdict on none.** Zero
severity moves, zero clean/flagged crossings, at every one of eight seed offsets on the six sheets
swept. MODERATE rises on six sheets and falls on none; the `copied` family moves ten times and every
one is an increase.

**But round 1 cannot answer the severity question, and that is the finding that governs the
decision.** Every sheet in the population reads severity 3 with H between 3 and 13, so
`computeSeverity`'s `high >= 2` arm binds and nothing later is consulted. The median distance to
dropping below severity 3 is **ten flagged cells**; the largest role-driven move measured is eleven,
and it moves that sheet *away* from the boundary. **"No severity moved" here means "no severity could
plausibly have moved on this corpus."**

**Direction, for the decision that is waiting.** Where the inversion moves anything, it mostly
*suppresses* — the shipped roles flag less than the reverted ones — so it reads as a false-negative
mechanism, with real exceptions on two sheets. It is not holding any verdict up.

---

## Part 1 — does round 1 carry the inversion, and where

### 1.1 — the population, counted rather than remembered

Every sheet of every data file directly under `corpus-data/`. `corpus-data/round2/` is a subdirectory
and is skipped by construction. `corpus-data/corpus-manifest.json` names three of those files
(`CORPUS-01`, `CORPUS-02`, `CORPUS-03`) and every one is already in the directory walk, so the union
is the walk.

| | count |
|---|---|
| data files walked | **33** |
| sheets enumerated | **137** |
| … import (a numeric matrix with at least one valid row) | **122** |
| … do not import | **15** |

The import predicate is round 2's own, verbatim — `validRows > 0 && nNumericDataCols > 0` — so the
two populations are counted the same way.

**Composition, stated because it bears on every rate below.** Eight of the 33 files are `-update` or
`-updated` revisions sitting beside their base file, and three are CSV/XLSX pairs of the same
`CORPUS-0N` data. **The eight revision pairs are not byte-identical** — all eight `md5` pairs differ,
checked directly — so they are re-enumerated rather than deduplicated, and where a revision pair both
lands in the sensitivity population the record says so and reports the two separately.

*A correction made in the open:* the first check of those pairs used a `for … in "A B"` loop with
`set -- $p`, and **zsh does not word-split an unquoted variable**, so every pair compared two empty
`md5` strings and every pair read `IDENTICAL`. That reading is withdrawn; the figure above is from a
single `md5 -q` over all sixteen files.

**The 15 sheets that do not import**, named so the gap is a list rather than a number: `C07.xlsx` and
`C07-update.xlsx` `[Fig2_PCA_group]`, `C09.xlsx` and `C09-update.xlsx` `[Sheet2]`, `C11.xls`
`[Latency to suckle_Fig 3d]`, `[DRvsUR_Fig 4c]`, `[Process_Fig 4e]` and `[Neuroepithelium_Fig 5b]`,
`C14.xlsx` `[Metadata]`, `C15.xlsx` `[Article information]` and `[Column name]`, `C20.xlsx`
`[Microcosm metadata]` and `[Env. gradient metadata]`, `C22.xlsx` and `C22-update.xlsx` `[Info]`.
Eleven throw `Empty after preprocessing.` and four return an empty matrix — the two outcomes
ROUND2-SPECIFICITY-SCREEN §12.1 records as indistinguishable in the inventory artefact.

### 1.2 — incidence, the §3.2 shape

Round 2's two columns are quoted from `ROLE-INFERENCE-INVERSION-CENSUS.md` §3.2 for comparison and
were not re-measured here.

| | **round 1 (122)** | round 2 usable (238) | round 2 thirty (30) |
|---|---|---|---|
| carry mechanism 1 | **3** | 42 | 13 |
| … m1A (full column majority-numeric) | 0 sheets, 0 cols | 2 sheets, 3 cols | 0 |
| … m1B (reads `label` on the full column) | 3 sheets, 3 cols | 42 sheets, 87 cols | 13 sheets, 22 cols |
| … missing-marker columns | 1 sheet, 1 col | 16 cols | 5 cols |
| carry mechanism 2 (§2.8 hold-out) | **10** | 46 | 11 |
| carry both | 3 | 26 | 8 |
| carry neither | **112** | 176 | 14 |
| columns carrying M1 | 3 | 90 | 22 |
| columns held out by §2.8 | **59** | 291 | 87 |
| condition columns as shipped | 132 | 567 | 94 |
| shipped 2nd window turns a `condition` into `data` | **0** | 1 sheet, 2 cols | 0 |
| | | | |
| pass the floor (`nDC >= 2` as shipped) | **116 / 122** | 221 / 238 | 27 / 30 |
| **… of those, inverted by either mechanism** | **10 (8.6%)** | **53 (24.0%)** | **13 (48.1%)** |
| … M1 only / M2 only / both | 0 / 7 / 3 | 14 / 18 / 21 | 5 / 3 / 5 |
| … losing at least one DATA column | **10** | 39 | 8 |
| … gaining a fabricated condition level only | **0** | 14 | 5 |
| **inverted INTO refusal** | **0** | 7 | 3 |

`revert == base data count` holds on every one of the 122 sheets, which is the check that the
counterfactual is a revert and not a re-derivation.

### 1.3 — the two corpora differ, and the gate is measured rather than guessed

**8.6% against 24.0% is not "broadly similar".** Round 1's floor-passing inversion rate is about a
third of round 2's usable rate, and the shape differs too: round 1 has **no M1-only sheet and no
sheet gaining a fabricated condition level without also losing a data column**, where round 2 has
fourteen of each. Every round-1 inversion loses a measurement column.

**Part of the gap is §2.8's own row floor, and that part is measured.** `MIN_ROWS_FOR_GROUPING = 50`
means the group-attribute pass cannot run at all below fifty rows. Round 1 is full of small
figure-sized sheets — `C15 [Fig. 2]` is six rows.

| | round 1 (122) |
|---|---|
| sheets reaching §2.8's row floor (`rows >= 50`) | **75 (61.5%)** |
| … of those, §2.8 held something out | **10 (13.3%)** |

**So the row floor withholds §2.8 from nearly two sheets in five, and it is not the whole gap.** Even
among the 75 sheets the pass can reach, it fires on 13.3%.

**The round-2 comparator for that row-floor split was deliberately not measured.** Producing it would
mean re-reading the round-2 files, and this dispatch does not touch that population. The round-2
columns quoted above come from the committed census and nothing here re-derives them.

**What is not measured here: why the corpora differ beyond the row floor.** Round 2 is a Dryad draw
of deposited ecological and field data, where a site or plot key with numeric attributes attached is
an ordinary shape; round 1 is a mixed set including plate-reader and wide-format replicate sheets. That
is a plausible reading and it is **not** a measurement, and it is not offered as one.

### 1.4 — the sensitivity population

**Ten floor-passing inverted sheets, above the three the halt condition required.** Listed
individually with their grouping keys and moved columns. `C07`/`C07-update` and `C16`/`C16-update`
are separate revision files whose bytes differ; both are carried and reported separately.

| sheet | rows × cols | data cols shipped / without §2.8 | mechanism | what moves |
|---|---|---|---|---|
| `C07-update.xlsx [Mastersheet]` | 72 × 44 | 39 / 41 | M2 | `Start`, `Duration` — keys `Start`(2), `Duration`(2), `Block`(6) |
| `C07.xlsx [Mastersheet]` | 72 × 44 | 39 / 41 | M2 | as above |
| `C11.xls [Cell cycle scores_Fig 2b]` | 315 × 35 | 12 / 15 | M2 | `Souporcell_Cluster`, `seurat_clusters`, `integrated_snn_res.0.1` — keys `donor`(14), `sample`(14), `sample_order`(14), and the two cluster columns holding each other |
| `C12.xlsx [Field survey-Herbiory]` | 804 × 22 | 10 / 12 | M2 | `Latitude`, `Longitude` — keys `Region`(17), `Site`(51), and each holding the other |
| `C12.xlsx [Field survey-data]` | 2412 × 45 | 15 / 36 | M2 | **21 columns** — `Latitude`, `Longitude` and nineteen WorldClim temperature and precipitation variables, all constant within `Region`(17) and `Site`(51) |
| `C14.xlsx [Data]` | 9426 × 24 | 14 / 21 | M2 + M1 | M2 holds `RINGS / in`, `AveGrowth (cm/ yr)`, `DBH (cm)`, `DBH (in)`, `Adj DBH slope`, `Tree BA (cm2)`, `Height (m)`; M1 is `DamageSev` (full-column numeric 0.20, dominant token `"."`) |
| `C16-update.xlsx [Sheet1]` | 60 × 113 | 99 / 109 | M2 | `Lev`, `ZLev`, and four richness columns with their four Z-scored partners, each pair holding the other |
| `C16.xlsx [Sheet1]` | 60 × 113 | 99 / 109 | M2 | as above |
| `C20.xlsx [Microcosm soil A]` | 204 × 21 | 17 / 18 | M2 + M1 | M2 holds `Richness_bacteria` (keys `Taxa_combination`(37), `TAXA`(68)); M1 is `Taxa_combination` itself, second window `label` |
| `C20.xlsx [Microcosm soil B]` | 204 × 21 | 17 / 18 | M2 + M1 | as above |

**`C12 [Field survey-data]` is the largest single hold-out in either corpus by proportion**: 21 of 36
data columns removed, the matrix cut from 36 columns to 15. Every held-out column is a site-level
climate variable, which is constant within `Region` and within `Site` by construction — §2.8 behaving
exactly as specified.

### 1.5 — the arms Part 2 runs, and one of them is degenerate

| arm | roles |
|---|---|
| **A** | as shipped |
| **B** | §2.8's hold-out undone — every `attribute` reverted to `data` |
| **C** | B, plus M1's **missing-marker** columns moved to the role the second window returns |
| **D** | B, plus **every** M1 column moved to its second-window role — an addition beyond the dispatch |

**Arm C is degenerate on all ten sheets and therefore never runs.** Round 1 has exactly one M1
missing-marker column, `C14 [Data]`'s `DamageSev`, and a second 40-row window returns `condition` for
it — the same role it already has. There is nothing to move. So the dispatch's M1 arm has no
counterfactual to express on this corpus.

**Arm D exists because of that**, and it differs from C on two sheets only — `C20 [Microcosm soil A]`
and `[soil B]`, where `Taxa_combination` reads `condition` on the shipped window and `label` on a
second one. It is reported apart from B and C and never merged into either.

**So Part 2 measures §2.8 on ten sheets and mechanism 1 on two.** That is a property of round 1's
composition, not a choice: `shipped 2nd window turns a condition into data` is **0 sheets, 0 columns**
across all 122.

---

## Part 2 — the battery, both ways

### 2.1 — method, and the one confound it cannot remove

Each arm runs the whole shipped chain on the same sheet, with **only the role array differing**:

```
readRawMatrix -> prepStructure -> buildAnalysisConfig(roles = the arm's array)
              -> extractAnalysisInputs -> detectVST -> runFullAnalysis
```

`colRelationship`, `rowSemantics`, `assay`, `dataType` and `zeroAsMissing` are all produced by the
shipped `buildAnalysisConfig` from the same inputs. **`assay` and `rowSemantics` do not read roles**,
so they are identical across arms by construction; `zeroAsMissing` reads `summarize(data, roles, …)`
and so can in principle move, and it is recorded per run. Nothing is patched and nothing is passed
that `corpus-run.mjs`'s own `runDataset` does not pass.

**The confound: the two arms cannot share a PRNG stream, and this is structural.** `createPRNGFactory`
seeds from an FNV-1a hash of the matrix (`prng.js`), so a different column set is necessarily a
different stream for every test. "Same seed" across arms means the same **offset** applied by
`test/seed-inject.mjs`, not the same draw. Every permutation and simulation p therefore differs
between arms even for a test that sees identical columns. **That is why a single-offset move is a
candidate and not a finding**, and it is the whole reason for the seed sweep in §2.4.

**The child-process design, and why.** Each `(sheet, arm, offset)` runs in its own `node` process with
a wall-clock cap, because most of the battery is synchronous and cannot be interrupted in-process. A
run that hits the cap is reported as **unmeasured**, by name. Round 1's runtime is data-dependent, not
shape-dependent, so the cap is a real requirement rather than a precaution.

### 2.2 — the anchor that proves the runner is the shipped path

Four of the ten sheets appear in `corpus-out/s379-honest-run.json`, the committed artefact of the
round-1 honest run, produced by `corpus-run.mjs`'s own `runDataset` at seed offset 0. **Arm A must
reproduce it exactly**, and the two comparable rows do:

| sheet | S379 record | arm A here |
|---|---|---|
| `C07.xlsx [Mastersheet]` | sev 3, H 13, M 2, D 3, 72 × 39 | sev 3, H 13, M 2, D 3, 72 × 39 |
| `C14.xlsx [Data]` | sev 3, H 13, M 5, D 4, 9398 × 14 | sev 3, H 13, M 5, D 4, 9398 × 14 |
| `C20.xlsx [Microcosm soil A]` | sev 3, H 9, M 3, D 3, 204 × 17 | *(reported in §2.3)* |
| `C20.xlsx [Microcosm soil B]` | sev 3, H 10, M 3, D 3, 204 × 17 | *(reported in §2.3)* |

`C11`, `C12` and `C16` are not in the S379 manifest — that run covered twelve deposits — so no anchor
exists for them and none is claimed. **`C07-update.xlsx [Mastersheet]` is a different file from
`C07.xlsx [Mastersheet]`** (the bytes differ) and reads `ran 22` against `C07`'s `ran 23` under arm A,
so it is not anchored by C07's row and is not treated as a duplicate of it.

### 2.3 — reading a no-severity-move result: round 1 is saturated at the ceiling

Severity 3 is the top of the ladder, and `STATUS`/S379 already measured that **the battery returns
severity 3 on every honest real round-1 deposit it can import**. So on this population a severity move
can only go *down*, and `computeSeverity`'s first arm — `high >= 2` — binds long before any of the
later terms are consulted.

That makes "no sheet changed severity" uninformative on its own, and it is why this pass measures the
**distance to a tier boundary**: the minimum number of flagged cells that would have to stop firing
for severity to drop below 3. It is derived in closed form from `computeSeverity`'s own arms rather
than brute-forced. `severity < 3` requires the surviving flags to occupy **at most one dimension** —
two surviving dimensions means at least two surviving flags, and `D >= 2` is severity 3 with any HIGH
and with two or more MODERATE — and within that one dimension at most one HIGH. So

```
dist(<3)  =  min over dimensions d of [ flags outside d  +  max(0, high_d - 1) ]
dist(=0)  =  every flagged cell
```

**The decision-relevant question on a saturated corpus is therefore not "did the tier move" but "did
the distance move".** Both are reported.

### 2.4 — the seed sweep, and what it can and cannot cover

The two arms cannot share a PRNG stream (§2.1), so a single-offset flag move is a candidate rather
than a finding. The sweep runs offsets 0–7 on arms A and B and reports two quantities per sheet:

- **A→B move count across offsets** — the range, so a move that appears at one offset and not another
  is visible as a range rather than averaged away.
- **seed churn within each arm** — how far arm A's own flag vector moves across offsets with the roles
  held fixed. That is the null the A→B count has to be read against: a corpus where three cells of 783
  are already seed-unstable can manufacture flag moves without any role change.

**Coverage is partial and the uncovered sheets are named rather than dropped.** The sweep runs on the
six sheets whose per-run cost allows eight offsets on two arms; the expensive sheets are measured at
offset 0 only. Round-1 runtime is data-dependent, not shape-dependent — the two `C20` sheets are the
same 204 × 21 shape and one of them does not finish.

### 2.5 — results at offset 0

Ten sheets, twenty-two runs, **three capped and unmeasured — all three arms of
`C20.xlsx [Microcosm soil A]`**, which is the sheet the cost warning named: it is the same 204 × 21
shape as `[soil B]`, and `[soil B]` completes each arm in 239 s while `[soil A]` does not finish in
600 s on any arm. It is a named gap, not a zero, and it takes the only other arm-D sheet with it.

| sheet | sev A→B | H | M | D | `cov.ran` | n/a | tests moved |
|---|---|---|---|---|---|---|---|
| `C07-update.xlsx [Mastersheet]` | 3→3 | 13→12 | 2→4 | 3→3 | 22→22 | 5→5 | 2 |
| `C07.xlsx [Mastersheet]` | 3→3 | 13→13 | 2→3 | 3→3 | 23→23 | 4→4 | 1 |
| `C11.xls [Cell cycle scores_Fig 2b]` | 3→3 | 10→10 | 1→4 | 4→4 | 20→20 | 5→5 | 3 |
| `C12.xlsx [Field survey-Herbiory]` | 3→3 | 3→5 | 1→5 | 2→3 | **13→16** | 12→9 | **11** |
| `C12.xlsx [Field survey-data]` | 3→3 | 9→7 | 6→8 | 4→4 | **21→20** | 4→5 | 7 |
| `C14.xlsx [Data]` | 3→3 | 13→13 | 5→5 | 4→4 | 22→22 | 3→3 | **0** |
| `C16-update.xlsx [Sheet1]` | 3→3 | 9→10 | 2→3 | 3→3 | 16→16 | 9→9 | 3 |
| `C16.xlsx [Sheet1]` | 3→3 | 9→10 | 2→2 | 3→3 | 16→16 | 9→9 | 2 |
| `C20.xlsx [Microcosm soil A]` | — | — | — | — | — | — | **unmeasured (capped)** |
| `C20.xlsx [Microcosm soil B]` | 3→3 | 10→10 | 3→3 | 3→3 | 18→18 | 7→7 | **0** |

**The counts that decide the question, arm B, nine sheets measured:**

| | |
|---|---|
| change severity at all | **0** |
| … up / down | 0 / 0 |
| **cross the clean/flagged boundary** | **0** |
| change at least one test flag | **7** |
| **change nothing — severity and every flag** | **2** |
| H rises / falls / holds | 3 / 2 / 4 |
| M rises / falls / holds | **6 / 0 / 3** |
| `cov.ran` rises / falls / holds | 1 / 1 / 7 |

**No verdict moves. Seven of nine evidence vectors do.** And the direction is not symmetric:
**MODERATE rises on six sheets and falls on none.** HIGH is mixed — up on three, down on two.

**`cov.ran` moves in both directions, which is the S393 point restated.** `C12 [Field
survey-Herbiory]` gains three applicable tests under revert (13 → 16); `C12 [Field survey-data]`
*loses* one (21 → 20). More data columns is not monotonically more coverage — restoring twenty-one
columns to `[Field survey-data]` pushed one test out of applicability.

### 2.6 — distance to the boundary

| sheet | sev | dist(<3) A | dist(=0) A | dist(<3) B | dist(=0) B | Δ dist(<3) |
|---|---|---|---|---|---|---|
| `C07-update.xlsx [Mastersheet]` | 3 | 12 | 15 | 12 | 16 | +0 |
| `C07.xlsx [Mastersheet]` | 3 | 12 | 15 | 13 | 16 | +1 |
| `C11.xls [Cell cycle scores_Fig 2b]` | 3 | 10 | 11 | 11 | 14 | +1 |
| `C12.xlsx [Field survey-Herbiory]` | 3 | **2** | 4 | 6 | 10 | **+4** |
| `C12.xlsx [Field survey-data]` | 3 | 10 | 15 | 9 | 15 | **−1** |
| `C14.xlsx [Data]` | 3 | 14 | 18 | 14 | 18 | +0 |
| `C16-update.xlsx [Sheet1]` | 3 | 9 | 11 | 10 | 13 | +1 |
| `C16.xlsx [Sheet1]` | 3 | 9 | 11 | 10 | 12 | +1 |
| `C20.xlsx [Microcosm soil B]` | 3 | 10 | 13 | 10 | 13 | +0 |

**Exactly one of nine sheets is within two removals of dropping below severity 3**, and under revert
it moves to six — *further* from the boundary, not closer. Five sheets move away from the boundary,
one moves toward it by one, three do not move. **So on this population the inversion is not holding a
verdict at 3 that would otherwise fall; if anything it is holding it slightly lower than the reverted
roles would.**

### 2.7 — which tests account for the moves

| test | family | n | up | down | → N/A | N/A → |
|---|---|---|---|---|---|---|
| Constant-Offset Blocks | copied | **7** | 7 | 0 | 0 | 0 |
| LOESS Residual Analysis | replicate | 3 | 2 | 1 | 0 | 0 |
| Windowed Autocorrelation | replicate | 2 | 2 | 0 | 0 | 0 |
| Benford's Law (Second Digit) | digits | 2 | 1 | 0 | 0 | 1 |
| Noise Scaling With Measurement Size | replicate | 2 | 0 | 0 | **2** | 0 |
| Excess Kurtosis | replicate | 2 | 0 | 2 | 0 | 0 |
| Regional Noise Homogeneity | replicate | 2 | 2 | 0 | 0 | 0 |
| Sequential Duplication | copied | 2 | 2 | 0 | 0 | 0 |
| Runs Test | replicate | 1 | 1 | 0 | 0 | 0 |
| Terminal Digit Uniformity | digits | 1 | 0 | 0 | 0 | 1 |
| Decimal Precision Consistency | digits | 1 | 0 | 0 | 0 | 1 |
| Exact Duplicate Detection | copied | 1 | 1 | 0 | 0 | 0 |
| Cross-Condition Consistency | group | 1 | 0 | 0 | 0 | 1 |
| Benford's Law (First Digit) | digits | 1 | 0 | 1 | 0 | 0 |
| Row-Mean Runs | replicate | 1 | 0 | 1 | 0 | 0 |

| family | | n | up | down | → N/A | N/A → |
|---|---|---|---|---|---|---|
| `replicate` | Cross-replicate comparisons | **13** | 7 | 4 | 2 | 0 |
| `copied` | Copy, paste, edit | **10** | **10** | **0** | 0 | 0 |
| `digits` | Unusual digits | 5 | 1 | 1 | 0 | 3 |
| `group` | Cross-condition comparisons | **1** | 0 | 0 | 0 | 1 |

**`copied` moves ten times and every one is an increase**, seven of them Constant-Offset Blocks —
which runs over all column pairs, so restoring columns adds pairs and adds opportunities to fire.
That is exactly the "more columns, more comparisons" mechanism, landing in a family the prediction did
not name.

**Cross-condition moves once.** §2.8 holds out *numeric measurement* columns, not condition columns,
so the condition structure is almost untouched by arm B — which is why the `group` family barely
moves. That distinction only becomes visible when M1 is the arm, and M1 is where it does move: see
§2.8.

### 2.8 — the one place mechanism 1 is measurable, and what it shows

Arm D ran on `C20.xlsx [Microcosm soil B]` alone — `[soil A]` capped. Moving `Taxa_combination` from
`condition` to the `label` its second window returns:

| | arm A | arm D |
|---|---|---|
| severity | 3 | 3 |
| H / M | 10 / 3 | **12** / 3 |
| `cov.ran` | 18 | 18 |
| **conditions** | **37** | **1** |
| tests moved | — | **6** |

`Residual Spike Correlation` N/A:tooFewRows → N/A:premiseVoid · `Baseline Balance` N/A:premiseVoid →
N/A:tooFewConditions · `Cross-Condition Rank Correlation` LOW → N/A:tooFewConditions ·
`Cross-Condition Consistency` LOW → N/A:tooFewConditions · **`Row-Mean Runs` N/A:tooFewRows → HIGH** ·
**`Selective Noise Partitioning` N/A:emptyInput → HIGH**

**This is the fabricated-condition harm shown directly.** `Taxa_combination` was carrying the sheet's
entire condition structure — thirty-seven levels — and removing it collapses the file to a single
condition. Two cross-condition tests stop being applicable and two other tests become applicable and
immediately fire HIGH. **Six of 29 tests change state and the severity still does not move**, because
`high >= 2` was already binding at 10.

**A caveat that must travel with this row: arm D is "what a different 40-row window returns", not
"what is correct".** A thirty-seven-level taxa-combination column is arguably a legitimate grouping
key, and the second window calls it `label`. This measures the sensitivity of the analysis to the
window, not the correctness of either answer.

### 2.9 — the seed sweep

Eight offsets × arms A and B on the six sheets whose cost allows it — **96 runs, none capped, none
failed.** The four sheets not swept are `C12 [Field survey-data]`, `C14 [Data]` and the two `C20`
sheets; they are measured at offset 0 only and that is a named gap.

**Stage 2 re-ran offset 0 in a fresh process and reproduced stage 1 line for line** — same severity,
H, M, D, `cov.ran`, `n/a` and matrix shape on every sheet. The child-process design contributes no
variation of its own.

| sheet | severity, arm A | severity, arm B | A→B moves across 8 offsets | seed churn within A | within B |
|---|---|---|---|---|---|
| `C07-update.xlsx [Mastersheet]` | {3} | {3} | 1–3 | 2 | 1 |
| `C07.xlsx [Mastersheet]` | {3} | {3} | 1–2 | 1 | 0 |
| `C11.xls [Cell cycle scores_Fig 2b]` | {3} | {3} | **3–3** | **0** | **0** |
| `C12.xlsx [Field survey-Herbiory]` | {3} | {3} | **11–11** | **0** | **0** |
| `C16-update.xlsx [Sheet1]` | {3} | {3} | 2–3 | 1 | 1 |
| `C16.xlsx [Sheet1]` | {3} | {3} | **2–2** | **0** | **0** |

**Severity is a single value, 3, on both arms at every one of the eight offsets, on all six sheets.**
No severity instability at all on this subset — so the "no verdict moves" result is not a
single-offset accident.

**Three of six moves are exactly invariant with zero seed churn** — `C11` at 3, `C12
[Field survey-Herbiory]` at 11, `C16` at 2. Those are role-driven and nothing else. **On the other
three the move size wobbles by one or two cells against a seed churn of 1–2 in the arm itself**, so
the exact count on `C07`, `C07-update` and `C16-update` is not seed-stable and should not be quoted to
the cell.

**What is stable everywhere: the move never disappears.** The minimum A→B move count is ≥ 1 on every
sheet at every offset. Reverting §2.8 always changes something; only how much is sometimes within the
noise.

---

## Predictions, scored

**1. "Round 1 carries the inversion at a broadly similar rate to round 2's usable population."
Refuted, and the prediction named the right consequence.** 8.6% of floor-passing sheets against
24.0% — under a third. The prediction said a rate far below a quarter "would say the two corpora
differ in some way nobody has characterised, which is itself worth knowing", and that is where this
lands. Part of the gap is measured (§2.8's row floor withholds the pass from 47 of 122 sheets, and it
fires on only 13.3% of the 75 it reaches); the rest is not characterised here. The *shape* differs
too: round 1 has no M1-only sheet, no fabricated-condition-only sheet, and no sheet inverted into
refusal.

**2. "Moves concentrate in the cross-condition and cross-replicate families." Half right, and the
half that fails is the more interesting one.** `replicate` is the largest family at 13 moves — that
part holds. **`group` — cross-condition — is the *smallest* at one move.** The reason is structural
and was not anticipated: §2.8 holds out numeric *measurement* columns, so arm B barely disturbs the
condition structure. Cross-condition tests move only when a *condition* column moves, which is
mechanism 1's territory, and on the one sheet where arm D could run they moved immediately — two
cross-condition tests went to `N/A:tooFewConditions` at once.

**The prediction also missed a family entirely.** `copied` moves ten times and **every one is an
increase**, seven of them Constant-Offset Blocks, which compares all column pairs. The
distribution-shape and digit clause holds: `shapes` moves **zero** times, and four of the five
`digits` moves are `N/A` → a tier, i.e. an applicability gate met by the wider column set rather than
a grouping change.

**3. "Reverting §2.8 should flag more, making the inversion a false-negative mechanism." Holds in
aggregate, and the opposite direction is real on specific sheets.** MODERATE rises on six sheets and
falls on **none**; the `copied` family is 10 up and 0 down. Against that: HIGH *falls* on two sheets,
`C12 [Field survey-data]` going 9 → 7, and five individual moves are downgrades — Excess Kurtosis
twice, and LOESS, Benford 1st and Row-Mean Runs once each. **Both directions occur, on different
sheets, exactly as the prediction asked to be checked.**

The boundary-distance table says the same thing more precisely: five sheets move *further* from
dropping below severity 3 under revert, one moves closer by one, three do not move. **The shipped
roles are not propping a verdict up.**

**4. No prediction was made on how many sheets change nothing. Measured: 2 of 9** — `C14 [Data]` and
`C20 [Microcosm soil B]`. `C14` is the striking one: seven columns restored, the matrix from 14 to 21,
and not one of 29 flags moves.

---

## What this settles, and what it does not

**Settled on round 1.** Reverting §2.8 changes the evidence on 7 of 9 measured sheets and the verdict
on **none**. No sheet crosses the clean/flagged boundary. The largest evidence moves are seed-stable
and role-driven.

**Not settled, and the first one is the load-bearing limit.**

- **Round 1 cannot answer the severity question, and that is a property of the corpus.** Every sheet
  in the sensitivity population reads severity 3 with H between 3 and 13, so `computeSeverity`'s first
  arm — `high >= 2` — binds and the later terms are never consulted. The median distance to dropping
  below 3 is ten flagged cells; the largest observed A→B move is eleven, and it moves the sheet
  *away* from the boundary. **"No severity moved" therefore means "no severity could plausibly have
  moved on this corpus", not "roles do not affect verdicts."** A population with sheets near a tier
  boundary would answer the question this one cannot, and round 1 has one such sheet.
- **Mechanism 1 is measured on one sheet.** Arm C is degenerate on all ten; arm D exists on two and
  one of those capped. The single measurement — six tests moving, the condition count collapsing 37 →
  1 — is one observation, and it shows sensitivity to the 40-row window rather than the correctness of
  either answer.
- **Four sheets are unswept and three runs are unmeasured.** `C12 [Field survey-data]`, `C14 [Data]`
  and both `C20` sheets have no seed sweep; all three arms of `C20 [Microcosm soil A]` capped at 600 s
  and that sheet contributes nothing.
- **The two arms cannot share a PRNG stream** (§2.1). The sweep bounds the resulting noise at 0–2
  cells per sheet; it does not remove it.
- **Nothing here says whether either mechanism is wrong as a matter of design.** §2.8 held out 59
  columns across round 1 and behaved exactly as specified on every one. Both candidate fixes remain
  reported and unmade.
- **Nothing here characterises any round-1 deposit.** Every figure is a difference between two role
  assignments on one file.

## Verification

- **No `src/` file was modified.** The counterfactual is the shipped role array with `attribute`
  reverted to `data`, passed to the shipped `buildAnalysisConfig` → `extractAnalysisInputs` →
  `runFullAnalysis`.
- **The instrument agrees with the one that produced the census.** Run on round 2's thirty, this probe
  reproduces `probe-s396-inversion-incidence.mjs` exactly — 13/11/8/14 sheets, 27 floor-passing, 13
  inverted, 5/3/5 split, 22 and 87 columns, 94 condition columns, 3 inverted into refusal.
- **The child runner is anchored to the committed honest run.** `corpus-out/s379-honest-run.json`
  holds `C07.xlsx [Mastersheet]` at severity 3, H 13, M 2, D 3, 72 × 39 and `C14.xlsx [Data]` at
  severity 3, H 13, M 5, D 4, 9398 × 14. Arm A reproduces both exactly.
- **Determinism across processes**: stage 2's offset-0 runs reproduce stage 1's line for line.
- **`revert == base data count`** holds on all 122 sheets — the check that the counterfactual is a
  revert rather than a re-derivation.
- **Runs**: 22 at offset 0 (3 capped), 96 across eight offsets (0 capped, 0 failed).
- **The 27-fixture batch was not run and is not a gate.** No `src/` change, and the fixture set
  carries zero inversions, so it cannot exercise this. No rendering surface changed, so no preview. No
  dev server was running; one was found listening on 5173 at session start and stopped before any
  measurement.
- **A correction made in the open**: the first `md5` comparison of the eight `-update` pairs was
  vacuous — zsh does not word-split an unquoted variable, so every pair compared two empty strings and
  read `IDENTICAL`. Redone; all eight differ.

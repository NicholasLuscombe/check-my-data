# Display-label census — what heading, unit and frame is each printed quantity shown under

**S373 Part 3. Read-only.** Source read from the working tree at `b672d4a`; no line numbers are
carried, because they go stale — every citation is a file plus a function or a named block.

S372 Part 2 answered the tier question: `CategoryRow`, `TestCardLayout` and `excelExport` import no
`ALPHA` and re-derive nothing, so every surface renders `result.flag` and mode never decides a tier.
This part asks the different question with the same shape — **what heading, unit and frame is a
quantity printed under, and can the label be wrong while the flag is right.**

**No flag is wrong.** Every defect below is a heading, a unit, a frame or a word. Expectation 5 held.

---

## 1. The unit of the census

The printed quantity, not the test and not the surface. A test that prints six quantities gets six
rows; a quantity rendered on four surfaces stays one row with four surfaces named.

**The battery is 29 tests.** Card headings were extracted mechanically from all 28 card components
(`MiniCard_Benford` serves both Benfords), so heading coverage is complete. Source fields were traced
by hand for every quantity named in sections 4 to 7; quantities not named there were seen in the
heading sweep but their producer was not opened, and nothing is asserted about them.

### Surfaces — the roster is eight, not seven

The seven named in the dispatch, plus one the S372 roster missed:

| # | Surface | Built by | Tier vocabulary |
|---|---|---|---|
| 1 | Test card | `MiniCard_*` via `TestCardLayout` | mode-dependent |
| 2 | In-app `ReportView` | `ReportView` | mode-dependent |
| 3 | Standalone HTML report | `handleExportExcel` (ends in `window.open`) | `FLAG_STYLES.label` |
| 4 | `.xlsx` export | `handleExcelDownload` → `excelExport.js` | `FLAG_STYLES.label` |
| 5 | Printed DOM | `window.print()` | inherits the app |
| 6 | §4 AI hand-off prompt | `handoffModel.js` → `promptBodyRenderer.js` | outcome ladder |
| 7 | `BatchView` | `BatchView.jsx` | severity only |
| **8** | **Clipboard text summary** | **`generateTextSummary`, behind "Copy summary"** | **hardcoded QC caps** |

Surface 8 is a real product surface — an actions-menu item writing to the clipboard — and it is not a
view of any of the other seven. It is treated as a surface throughout below.

---

## 2. The classification key

| Class | Meaning |
|---|---|
| **L1** | Heading not true of the quantity beneath it |
| **L2** | Unit unstated, or more than one unit under one heading |
| **L3** | Data index printed under a frame the surface does not declare |
| **L4** | Companion measure able to contradict the flag beside it |
| **L5** | Tier word differs between surfaces for the same result |
| **OK** | Measured and honest — recorded so it is not re-opened |

---

## 3. Answers in one line each

1. **Headings true of their quantity?** Mostly yes. Every `Adj. p` heading is honest. Two defects
   elsewhere: the HTML report's `Key metric` column, and the tier vocabulary split.
2. **Units stated, one per quantity?** **No.** The bare word `Ratio` carries **five different units**
   across six cards. P151 is one of five.
3. **Frames declared?** The §4 prompt is the only **live** divergence, as predicted — but a second,
   **latent** path exists in `findings.js`, hidden by an identity fallback.
4. **Companion able to contradict the flag?** Yes, and **the three known instances do not share a
   mechanism.** One is already remedied, one is fixed, one is live, and a fourth is found.

---

## 4. Question 1 — is every quantity printed under a heading true of it?

### Every `Adj. p` heading is honest

Thirteen cards head a column `Adj. p` or `adj. p`. Each was traced to its producer; every one reads a
field assigned from a `bhFDR(...)` call:

| Card | Field | Producer |
|---|---|---|
| Blocked Mahalanobis, Modality, Column GoF, Entropy, Selective Noise, Value-Frequency, Windowed Autocorrelation, Cross-Condition Consistency | `d.adjP` | `bhFDR` in each test module |
| Autocorrelation | `r.rawAdjP` | `lagAdjPs`, BH-adjusted — `raw` names the unformatted number, not an uncorrected one |
| Runs | `p.adjP` | `runsAdjPs` |
| Row-Mean Runs | `w.adjP` | `windowAllAdjPs` |
| Excess Kurtosis | `c.p` ← `pAdjFull` | BH across conditions |
| Regional Noise (condition table) | `c.rawP`, headed **`p`** | raw, and the heading says `p` — honest |

**One quantity sits under `Adj. p` without being a BH output, and the surface says so.**
Inter-Replicate Correlation's `Highly correlated row windows` table renders `w.scanP` under `Adj. p`,
and its own `footerText` reads *"Adjusted p is the scan-statistic permutation p shared across the
flagged window family."* A scan-statistic permutation p is family-wise corrected by construction, so
the heading is defensible and the surface defends it. **This is the pattern the rest should follow**
— it is the only place in the battery where a non-obvious label carries its own explanation.

### Class B's thirteen do not violate this question

Class B — S360's fourteen unpriced two-arm extremes minus LOESS, corrected at S370 — reaches display
only through `primaryP`. `primaryP` is printed under:

- the card badge, via `fmtPBadge` → `p = 0.0234`, with **no heading at all**;
- the `.xlsx` Sheet 3 `Test Details` column headed **`p-value`**;
- the HTML report column headed `Key metric`, as `p=…`;
- the §4 prompt, under per-arm labels built by `formatPClause` (`CUSUM p`, `scan p`, …).

**None of these claims a correction.** So the stated failure mode — an uncorrected two-arm maximum
under a heading reading adjusted — **does not occur.** Class B is missing arithmetic, exactly as
S372 filed it, and it is not a display-contract question. **Zero of thirteen.**

### L1 — the HTML report's `Key metric` column

`handleExportExcel` builds its test-summary table with the header row
`Category | Test | Result | Key metric`, and the cell is filled by a single statement: if
`r.primaryP` is non-null, `metric = "p=" + fmtP(r.primaryP)`, otherwise the cell is empty.

**No effect size is ever emitted.** The column heading promises a metric and delivers a p-value for
all 29 tests, and for a test with no `primaryP` it delivers a blank cell under a heading implying one
exists. The honest headings are already in use one surface over — the `.xlsx` calls the same quantity
`p-value`.

### L5 — three tier vocabularies for one result

| Surface | Source | HIGH / MODERATE / LOW render as |
|---|---|---|
| Test card, QC mode | `TestCardLayout`, `flLabel` | `FLAGGED` / `NOTED` / `CLEAR` |
| Test card, Review and Forensics | `TestCardLayout`, `flLabel` | `High` / `Moderate` / `Clear` |
| HTML report, `.xlsx` | `FLAG_STYLES[f].label` | `High` / `Moderate` / `Clear` |
| **Clipboard text summary** | **`generateTextSummary`, local `flagLabel`** | **`FLAGGED` / `NOTED` / `CLEAR`, hardcoded** |

`ReportView` defines **two different functions both named `flagLabel`** — one inside
`generateTextSummary` mapping to QC capitals, one inside `handleExportExcel` reading
`FLAG_STYLES.label`. The clipboard function takes no `mode` and cannot, so **a Forensics-mode user who
copies the summary gets QC vocabulary**, while the same session's HTML report says `High`. The card's
own QC branch already carries a comment marking it stale against the S156 sentence-case canon; the
clipboard summary carries no such marker and was not in the S156 sweep.

### The gate class — a small live p beside LOW

**Confirmed at eight, with a correction to how they are found.** Where an effect-size gate fires, the
tier is LOW regardless of the p, and the reported p is live, displayed and ignored, so a reader sees
a small p beside `Clear` and reads a near-miss that never happened.

Autocorrelation · Constant-Offset Blocks · Excess Kurtosis · LOESS Residual Analysis · Regional Noise
Homogeneity · Runs Test · Selective Noise Partitioning · **Within-Row Variance**

**`grep esGate src/tests/` returns seven files, not eight.** Within-Row Variance implements the same
gate inline in its flag block — `if (flag !== "LOW" && (nSmooth < 3 || smoothFrac < 0.01)) flag = "LOW"`
— under its own `Effect-size gate` comment and with no variable of that name. **A census keyed on the
identifier drops it.** Three further tests (Baseline Balance, Decimal Precision, Mahalanobis Row
Outlier) force LOW through their own conditions, so the count is eight under "an effect-size gate" and
eleven under "a tier no p decided". S372 drew that line; this part confirms it and names the trap.

---

## 5. Question 2 — is every unit stated, and one unit per quantity?

**Expectation 1 held, and understates it.** Six cards, five units.

### `Ratio` carries five different units

| Card | Table | Quantity rendered | Unit | Unit stated? |
|---|---|---|---|---|
| LOESS Residual Analysis | region table | `obsSD / expSD` | **SD ratio** | no |
| Regional Noise | `Anomalous windows` | `d.sdRatio` | **SD ratio** | no |
| Selective Noise | per-column table | `d.residualStd / medianSD` | **SD ratio** | no |
| **Regional Noise** | **`Regional noise by condition`** | **`c.bestRatio`** | **variance ratio** | **no** |
| Column Goodness-of-Fit | per-column table | `A2_obs / A2_null_median` | **A² ratio** | no in table, yes on plot axis (`A² ratio`) |
| Entropy / Zipf | aggregated table | `H_obs / H_expected` | **entropy ratio** | no |
| Value-Frequency Spike | spike table | `obs / smoothed` | **count ratio** | no |

**None of the seven table headings states its unit.** Two cards carry two units at once:

- **Regional Noise — P151, confirmed at source.** `Anomalous windows` prints an SD ratio and
  `Regional noise by condition` prints a variance ratio, both headed `Ratio`, on one card. The
  producer publishes both adjacently (`bestVarRatio` beside `bestSDRatio`; `details[].ratio` beside
  `details[].sdRatio`) and each consumer picked one. `2.80² = 7.84` is the whole of the discrepancy.
- **Selective Noise.** The per-column table prints an SD ratio headed `Ratio`; the `HBarPlot` on the
  same card reads `d.varRatio`, a variance ratio. **The plot states its unit** in the axis label
  (`Max/min residual variance ratio across replicates`), so this is the milder form — one surface
  names the unit and the other does not.

The cross-card case is sharper than either. **LOESS, Regional Noise and Selective Noise print the
identical column triple `Observed SD | Expected SD | Ratio`.** On all three the ratio is an SD ratio,
so they agree — but nothing on any of the three says so, and the same word two tables away on the
same Regional Noise card means something else.

### Other bare headings

- **Blocked Mahalanobis — `Statistic`.** One column carries the μ-pass and Σ-pass scan statistics,
  which are different quantities, distinguished only by the neighbouring `Pass` column. No unit.
- **Modality — `Dip`.** Hartigan's dip statistic, dimensionless, no unit stated. Mild.
- **Residual Spike Correlation — `Shared spike strength`.** `d.coordScore`, a named composite with no
  unit and no scale.
- **Entropy — `Excess`.** Derived as `(Ratio − 1) × 100` and rendered with a `%` sign and an explicit
  `+`. **The unit is in the value.** Recorded as OK — this is the cheapest correct pattern in the
  battery.

### Overloaded headings across cards

- **`Rows`** is a row RANGE on Blocked Mahalanobis, Constant-Offset, IRC, LOESS, Regional Noise,
  Row-Mean Runs, Value-Frequency and Windowed Autocorrelation — and a row COUNT on **Excess
  Kurtosis**, which renders `c.n`. Same word, two kinds of thing, no unit on either.
- **`Expected`** is an expected run count on Runs and Row-Mean Runs, an expected frequency on
  Value-Frequency, and an expected outlier count on Within-Row Variance.
- **`Observed`** appears on Excess Kurtosis, Cross-Condition Consistency and Value-Frequency for three
  different quantities.

**The canonical ratio unit is a Chat decision and is not taken here.**

---

## 6. Question 3 — does any quantity index into the data under an undeclared frame?

Three conventions are live across the codebase: 0-indexed matrix rows inside producers, 1-indexed
matrix rows in producer output, and file rows on display. The report states that row numbers display
as in the uploaded file.

### Measured, per surface

| Surface | Frame | Evidence |
|---|---|---|
| Test card | **file rows** | 16 of 28 cards call `toFileRow` / `fileRow`; the other 12 print no row index at all — checked individually |
| `.xlsx` export | **file rows** | `excelExport.js` builds `fileRowFn` from `originalFileRow` and routes both `testLocalisation` and the hotspot location string through it |
| Clipboard text summary | **file rows** | `generateTextSummary` builds `_srcRow` from `originalFileRow` |
| Printed DOM | **file rows** | prints the app DOM, which is surface 1 |
| **§4 AI prompt** | **1-indexed matrix rows** | **`findingComposers.js` contains zero occurrences of `toFileRow` or `fileRow`; `handoffModel.js` builds `const ctx = { dataset }` and passes no mapper** |

**Expectation 2 held on the live surfaces.** The §4 prompt is the only surface that diverges, and
every row range in it is short by exactly the header-and-skipped-row offset. P155 confirmed.

### The name collision that hides it

**There are two different functions called `buildFindings`.** One is the canonical aggregator in
`src/analysis/findings.js`, which accepts `opts.toFileRow` and passes it to `keyFinding`. The other is
a module-local function of the same name in `handoffModel.js`, taking `(results, dataset)`, which
never had a mapper parameter to pass. The §4 path calls the second. Reading either file alone, the
prompt looks as though it shares the aggregator's coordinate handling. It does not.

### L3, latent — the identity fallback in `findings.js`

`ReportView` calls the canonical `buildFindings(results, nRows, nCols, { colHeaders: importConfig?.hdrs })`
— **`colHeaders` only, no `toFileRow`.** So inside `findings.js` the destructured `toFileRow` is
`undefined`, and `keyFinding(r, undefined)` reaches five templates that each open with
`const f = toFileRow || (x => x)`. Those five — Inter-Replicate Correlation, Blocked Mahalanobis,
LOESS, Regional Noise, Windowed Autocorrelation — then emit **matrix rows**.

**This is latent, not live.** An exhaustive search for a consumer of `finding.summary` across `src/`
returns nothing: the string is built on every flagged finding and rendered by no component. So the
defect costs nothing today and becomes live the moment any surface binds `summary`.

**The identity fallback is what makes it invisible.** A missing mapper produces plausible small
integers rather than an error, so the wrong frame reads as a right one. Note also that CLAUDE.md
records *"three templates do take `toFileRow`"* — **the count is five.**

---

## 7. Question 4 — can a companion measure contradict the flag beside it?

S244's rule: a companion descriptive measure is honest beside a verdict only if it cannot contradict
the flag.

### The three known instances do not share a mechanism

Read before widening, and the reading refuses the widening:

| Instance | Mechanism | State |
|---|---|---|
| Regional Noise headline direction | **Read a field that could not express the distinction.** `maxRatio` is `Math.max(a/b, b/a)`, so `bestVarRatio ≥ 1` by construction and the `> 1 ? "noisier" : "quieter"` test could never reach "quieter". | **Fixed at `67c4403`** |
| Inter-Replicate Correlation, `0 of 18 flagged` beside MODERATE (P89) | **A sub-unit count shown beside a verdict decided at a different level** — the windowed arm drove it, the pair arm did not. | **No longer present** |
| LOESS region table, both regions `As expected` beside Moderate (P156) | **A companion computed by a rule independent of the verdict.** `finding` is a hardcoded `ratio > 1.5 ? "Noisier" : ratio < 0.67 ? "Quieter" : "As expected"` while the flag comes from `flagFromP` on a Šidák-corrected `combinedP`. | **Live** |

Three instances, three mechanisms: a wrong field, a level mismatch, an independent rule. **They do not
share a cause and a single fix will not reach them.**

**P89 is no longer in the source.** The IRC card carries a connector rendered exactly when the card
flagged, no pair is a promotion trigger, and windows exist: *"No single replicate pair is anomalous
overall — the verdict is driven by the localised row windows shown below."* The heatmap legend's
outlier entry is gated on `nSusp > 0`, so no zero count is printed. Remedied, and the register row
should be closed rather than carried.

### L4, new — Excess Kurtosis

**Expectation 3 held.** The per-condition table's `Finding` column computes `shapeLabel` from the
κ-deviation band: `cIsPlat ? … : cIsLepto ? … : "Normal"`. When the pooled arm flags and no single
condition's κ leaves the normal band, **every row of the table reads `Normal` beside a `High`
verdict.** Same shape as LOESS — a companion word computed by a rule independent of the verdict — and
the card carries no bridge line and no caption.

**Reachability is measured, not hypothetical.** S363 recorded precisely this configuration: across the
condition-noise ladder both conditions span 0.004–0.049 in `kurtDeviation` while the pooled figure
spans 0.774–0.833, because `fitPredictedSigma` is condition-blind and the pooled difference set
becomes a scale mixture. Neither condition moves; only the pooling does. That is exactly a flagging
pooled arm over conditions that each read normal.

### The remedy already ships four times

Nothing here needs inventing — the battery contains its own fix, in four forms:

1. **Selective Noise** renders an em-dash in its `Finding` column, so it asserts no per-column verdict
   where none exists (S285).
2. **Inter-Replicate Correlation** renders the connector line above.
3. **Row-Mean Runs** renders a bridge line gated on `isFlagged && condsClean`, with a comment saying
   it fires only when the per-condition arm is clean so it never falsely claims the conditions cleared.
4. **Autocorrelation** carries a standing caption: *"an individual pair can read 'as expected' while
   the pooled pattern is flagged."*

LOESS and Excess Kurtosis have none of the four.

---

## 8. Expectations, as stated before the run

| # | Expectation | Outcome |
|---|---|---|
| 1 | Question 2 returns more than five tests | **Held.** Six cards carry a bare `Ratio`, across five distinct units |
| 2 | Question 3 returns the §4 prompt alone | **Held on the live surfaces**, with a latent second path in `findings.js` behind an identity fallback |
| 3 | Question 4 returns at least one instance beyond the three known | **Held.** Excess Kurtosis. And one of the three known is already remedied |
| 4 | The eight `esGate` tests confirm at eight | **Held in substance, inverted on identification** — `grep esGate` returns **seven** files; Within-Row Variance gates inline without the name |
| 5 | No flag is wrong | **Held.** Every defect is a heading, a unit, a frame or a word |

---

## 9. What is not a defect — recorded so it is not re-opened

- **`Adj. p` on the IRC windows table.** A scan-statistic permutation p is family-wise corrected, and
  the card's `footerText` states it.
- **Regional Noise's condition table heading `p` over `c.rawP`.** Raw, and says `p`.
- **`primaryP` under `p-value` / `p` / no heading.** Neutral and true, including for Class B's
  thirteen.
- **Entropy's `Excess`.** Unit is carried in the value.
- **Selective Noise's em-dash `Finding` column.** Deliberate, S285.
- **Excess Kurtosis's `adj. p` over `pAdjFull`.** The heading is true of the number. That the tier
  beside it was decided on `rawP` is P122, a tier question, already filed by S372 Part 2.

---

## 10. Open items

Nothing here is fixed, and two need a Chat decision before anything can be.

| Item | Class | Needs |
|---|---|---|
| The canonical ratio unit, and whether headings state it | L2 | **Chat decision** — six cards, five units |
| P147 relabel wording | L1 | **Chat decision** |
| §4 prompt emits matrix rows (P155) | L3 | Thread a mapper into `handoffModel`'s local `buildFindings` |
| `ReportView` passes no `toFileRow` to `findings.js` | L3, latent | One argument; or drop the identity fallback so it fails loudly |
| HTML report `Key metric` column | L1 | Rename to `p-value`, matching the `.xlsx` |
| Clipboard summary hardcodes QC vocabulary | L5 | Read `FLAG_STYLES.label`, or take `mode` |
| LOESS `Finding` column (P156) | L4 | One of the four shipped remedies |
| Excess Kurtosis `Finding` column | L4, new | Same |
| `Rows` as range and as count | L2 | Rename Kurtosis's to `n` |
| CLAUDE.md says three templates take `toFileRow` | — | It is five |

---

## 11. Verification

Read-only. **Nothing in `src/` changed, so a batch run would prove only that nothing changed** — it
was not run, deliberately. This part renders nothing, so there is no preview and no screenshot; Nick
handles visual verification.

Card headings were extracted mechanically from all 28 card components, so heading coverage is
complete rather than sampled. Every source field named in sections 4 to 7 was traced by hand to its
producer. Two claims were checked against the possibility of over-reporting and both survived: the
`finding.summary` consumer search was run across all of `src/` before calling the `findings.js` path
latent rather than live, and the P89 remedy was confirmed by reading the IRC card's connector and its
legend gate rather than inferred from the absence of a string.

---

## Register rows moved from STATUS, S392

STATUS is gitignored and has no git history, so a register row is the only copy of
whatever it holds. These bodies are moved here verbatim; the register row keeps its
claim and points at this section.

### P148 — **the display contract is battery-wide and nothing enforces it**

open, **and both its sides are now bounded.** **Tier side, S372:** Class A — a corrected value exists and the tier ignores it — has two members, P122 live and P153 latent. Class B — no corrected value exists anywhere — has thirteen. **Label side, S373: Class B is not a display question at all.** Its unpriced extreme reaches display only through `primaryP`, printed under a badge with no heading, an `.xlsx` column reading `p-value`, a `Key metric` column and the prompt's per-arm labels. **Nothing claims a correction, so nothing is mislabelled** — Class B is missing arithmetic and routes to P140 alone. **P148 stops carrying it.** All thirteen `Adj. p` headings trace to a `bhFDR` output; the one exception, IRC's windowed `scanP`, carries its own footer explanation. **A wiring error and missing arithmetic look identical in a census and must not share a list** — keeping them apart has now paid twice. `docs/shared/S373-DISPLAY-LABEL-CENSUS.md`

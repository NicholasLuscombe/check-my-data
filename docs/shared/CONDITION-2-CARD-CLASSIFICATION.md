# Condition 2 — structural classification over all 28 cards

**S387, read-only.** No `src/` file and no test was changed. No batch was run — there is nothing for
`validate-batch.mjs` to assert. This document is the measurement condition 2's remainder is to be
priced from; `docs/shared/` is Chat-owned and Chat owns edits to this file after this session.

S386 found one object eight times by walking into it, and seven of the twelve register rows it
allocated are the same defect seen on different cards. The structure-first gate says the first
dispatch over a programme spanning many cards is the classification. This is that classification.

---

## Part 0 — the card roster

**The roster is enumerable from a single registry source, so halt condition 1 does not fire.**

`src/components/cards/MiniPlot.jsx:37-67` holds `MINIPLOT_REGISTRY`, keyed on the exact `result.name`
each test returns. Parsed from source: **29 keys → 28 distinct components**, and the file's own
28 `import` statements match the 28 `MiniCard_*.jsx` files on disk exactly.

**The answer to the 29-into-28 question: no test renders no card. Two tests share one.**
`"Benford's Law (First Digit)"` and `"Benford's Law (Second Digit)"` both map to `MiniCard_Benford`
(`:50-51`), which branches internally on `name.includes("Second")`. The registry comments say so at
`:35`. Nothing else in the map is many-to-one.

A caution the roster inherits: the registry keys on `result.name`, while `engine.js`'s `tests` array
(`:417`) dispatches under **different** strings — `"Kurtosis"` dispatches, `"Excess Kurtosis"`
renders; `"Benford's Law"` dispatches, `"Benford's Law (First Digit)"` renders. A roster built by
matching the dispatch names would not resolve, which is the hole halt condition 1 guards.

### The 28 cards

| # | Component | Test name(s) it serves |
|---|---|---|
| 1 | `MiniCard_Autocorrelation` | Autocorrelation |
| 2 | `MiniCard_Benford` | Benford's Law (First Digit) · Benford's Law (Second Digit) |
| 3 | `MiniCard_BlockedMahalanobis` | Blocked Mahalanobis |
| 4 | `MiniCard_CarlisleBalance` | Baseline Balance |
| 5 | `MiniCard_ColumnGoF` | Column Goodness-of-Fit |
| 6 | `MiniCard_ConstantOffset` | Constant-Offset Blocks |
| 7 | `MiniCard_CrossCondConsistency` | Cross-Condition Consistency |
| 8 | `MiniCard_DecimalPrecision` | Decimal Precision Consistency |
| 9 | `MiniCard_DuplicateDetection` | Exact Duplicate Detection |
| 10 | `MiniCard_Entropy` | Entropy / Zipf Analysis |
| 11 | `MiniCard_InterReplicateCorrelation` | Inter-Replicate Correlation |
| 12 | `MiniCard_Kurtosis` | Excess Kurtosis |
| 13 | `MiniCard_LOESS` | LOESS Residual Analysis |
| 14 | `MiniCard_Mahalanobis` | Mahalanobis Row Outlier |
| 15 | `MiniCard_MissingDataPattern` | Missing Data Pattern |
| 16 | `MiniCard_Modality` | Modality Test |
| 17 | `MiniCard_NoiseScaling` | Noise Scaling With Measurement Size |
| 18 | `MiniCard_RankCorrelation` | Cross-Condition Rank Correlation |
| 19 | `MiniCard_RegionalNoise` | Regional Noise Homogeneity |
| 20 | `MiniCard_ResidualSpike` | Residual Spike Correlation |
| 21 | `MiniCard_RowMean` | Row-Mean Runs |
| 22 | `MiniCard_Runs` | Runs Test |
| 23 | `MiniCard_SelectiveNoise` | Selective Noise Partitioning |
| 24 | `MiniCard_SequentialDuplication` | Sequential Duplication |
| 25 | `MiniCard_TerminalDigit` | Terminal Digit Uniformity |
| 26 | `MiniCard_ValueFrequency` | Value-Frequency Spike |
| 27 | `MiniCard_WindowedAutocorr` | Windowed Autocorrelation |
| 28 | `MiniCard_WithinRowVariance` | Within-Row Variance |

`MiniPlot`, `TestCard` and `ExcelMetaCard` sit in the same directory and are not MiniCards; the
registry does not name them.

---

## The criterion, and where it comes from

The dispatch's four verdicts turn on one question, and that question is already written down in this
repo. `docs/shared/PLOT-COLOUR-SEMANTICS.md`, in the ForestPlot legend canon:

> A legend word naming a quantity is honest only where the split tests that quantity.

So the test applied to every row below is a **type match between the label and the predicate**, not a
judgement about whether the wording is strong:

- `names-predicate` — the label's quantity is the quantity the split tests.
- `overstates` — the label asserts a quantity or a set the predicate does not support. P195 is the
  type specimen: *Within expected range*, a magnitude claim, over `droveVerdict`, a routing field.
- `understates` — the predicate supports a stronger claim than the label or the mark makes.
- `wrong-vocabulary` — the label names a different quantity from the one the predicate measures. P206
  is the type specimen, per the dispatch: *Above trend* / *Below trend* naming a direction where the
  flag reads run length.

Two scoping decisions, stated so the counts can be checked:

1. **Footers are included only where they make a per-unit or per-group claim** — *All columns fit
   their expected shape*, *All windows are consistent with…* — and excluded where they state the
   card's own verdict (*Noise correlates from one row to the next*). The verdict is not a flag
   surface over units; it is the card's one output.
2. **Colour that encodes identity is excluded** — condition hues, the six-slot duplicate-group
   rotation, per-series line colours. These assert membership, not flag state. Rows marked `—` in the
   Verdict column are recorded for completeness and are not counted in the tallies.

**A non-obvious consequence, and it is the most useful thing in this document.** Three of the open
register rows are **not** condition-2 defects under this criterion, because their labels name their
predicates exactly:

- **P208** (one flat blue for every cleared cell across a 0.50–0.94 range) — *Pair not flagged* is
  true. The complaint is that a correlation heatmap's **form** promises intensity-encodes-value.
  Whichever condition owns plot form should price it, not this one. The identical construction is
  also live on Cross-Condition Rank Correlation, which P208 does not currently name.
- **P196** (the cleared background selected by adj-p) — Value-Frequency Spike's caption states the
  selection rule verbatim. The objection is to the **rule**, which is a selection question.
- **P190** (fourteen cards switch layout on `groupsAssessed !== undefined`) — a routing question.

Condition 2 should not be scoped to carry them.

---
### Part 1 — Autocorrelation … Entropy (cards 1–10)

| Card | Surface | Predicate | Label | Verdict | Note |
|---|---|---|---|---|---|
| Autocorrelation · `MiniCard_Autocorrelation.jsx` | Forest dot, flagged | `d.adjP < ALPHA.FLAG` (`:59`) / `r.isPromotionTrigger === true` (`:69`) | red dot + legend key *Flagged* | `names-predicate` | Both unit classes carry a true per-unit decision field. |
| Autocorrelation | Forest dot, cleared | complement of `:59` / `:69` | blue dot + *Not flagged* | `names-predicate` | |
| Autocorrelation | Forest reference key | `reference: 0, referenceMode: "zero"` (`:56-57`, `:66-67`) | dashed teal + *Expected (r = 0, independent)* | `names-predicate` | Glyph follows mode after P199/S386. |
| Autocorrelation | Forest row labels mixing two unit classes | `forestUnits = [...perPairUnits, ...higherLagUnits]` (`:71`) | `R1–R2` rows then `Lag 2`…`Lag 5` rows, one axis | `names-predicate` | Each key is true of its own row. The defect is the stacking, already open as **P205** — a unit-class conflation, not a labelling error. |
| Autocorrelation | Effect-size caption under the forest | `gatePassed = !(nR >= 500 && \|mean r_k\| < AUTOCORR_STRONG)` (`autocorrelation.js:167`) | *Lags promote only when the correlation also clears the effect-size floor (r ≥ X on samples of 500 rows or more)* | `names-predicate` | Verified against source: the 500-row scope in the parenthetical is exactly the engine's gate. |
| Autocorrelation | Lag-table Semibold + 2px verdict-tier left edge | `r.isPromotionTrigger === true` (`:195`) | bold row, tier colour | `names-predicate` | |
| Autocorrelation | Pooled-table caption | static string (`:220`) | *an individual pair can read 'as expected' while the pooled pattern is flagged* | `wrong-vocabulary` | **P207.** No surface on this card renders *as expected*; its pair marks read *Not flagged*. The quoted word is Row-Mean Runs' Finding vocabulary. |
| Autocorrelation | DotStrip fallback mark colour | `d.significant` at adj-p < 0.01 (`DotStrip.jsx:36-37`), card verdict promotes at 0.001 | red / blue dot, **no legend** | `overstates` | Unreachable in practice: `decayCurve` is null only when `lagN === 0` (`autocorrelation.js:59`), which also empties `details`. Dead branch, recorded not fixed. |
| Benford (First + Second) · `MiniCard_Benford.jsx` | Observed bar + swatch colour | `flag === "HIGH" \|\| flag === "MODERATE"` (`tokens.js:228-229`; `VBarPlot.jsx:58`) | red vs blue, key *Observed %* | `names-predicate` | Global digit statistic, no per-bar attribution; swatch and mark resolve the identical token. |
| Benford (First + Second) | Reference key | `expKey="expNum"` (`:35`) | dashed teal + *Expected (Benford)* | `names-predicate` | |
| Blocked Mahalanobis · `MiniCard_BlockedMahalanobis.jsx` | Strip legend | strip built from `details.filter(d => d.significant)` (`:29`) | `CC.THRESH` swatch + *Row range of flagged block (darker = larger scan statistic)* | `names-predicate` | Opacity is normalised within the flagged list (`:40-43`), so "darker" is a within-plot ordering, which is what the caption claims. |
| Blocked Mahalanobis | Table Semibold + tier left edge | `d.significant` (`:67`, `:74`) | bold row, tier colour | `names-predicate` | |
| Blocked Mahalanobis | Cleared-table footer | `result.flag === "LOW"` (`:81`) | *All windows are consistent with a single condition-wide covariance / mean structure.* | `names-predicate` | "Consistent with" is the non-rejection, stated as a non-rejection. Contrast the P195 shape, which converts one into a magnitude claim. |
| Baseline Balance · `MiniCard_CarlisleBalance.jsx` | Red histogram bin + its legend key | `i === 9 && isFlagged` (`:97`, `:139`) — bin 9 is p ∈ [0.90, 1.00); the verdict counts `p > 0.95` (`carlisleBalance.js:127-128`) | red bar + *Excess balanced features* | `overstates` | The keyed bin is a **superset** of the counted set: features at p ∈ [0.90, 0.95] render as "excess" and are not counted. `primaryP = min(binomP, ksP)` (`:144`) can also be driven by the KS arm while the red bin attributes the verdict to the excess arm. The card's own caption (`:144`) admits the mismatch in prose — the banked prose-covering-for-a-plot signature. |
| Baseline Balance | Observed-bar key | all non-driving bins (`:97` else-branch) | blue + *Features per p-value bin* | `names-predicate` | |
| Baseline Balance | Reference key | `expectedPerBin = nFeatures / 10` (`:56`) | dashed teal + *Expected (uniform)* | `names-predicate` | |
| Baseline Balance | Per-feature table | none — no per-row flag mark exists | *Top N of T by balance* (`:158`) | `names-predicate` | An ordering claim, not a flag claim. Recorded as a per-unit flag surface that is **absent**. |
| Column Goodness-of-Fit · `MiniCard_ColumnGoF.jsx` | `Finding` word | `d.Direction` from the producer (`:30-39`, `:163`) | *Doesn't fit {Family}* / *Fits {Family} too tightly* | `names-predicate` | |
| Column Goodness-of-Fit | Per-column bar colour | `!!c.flagged` (`:109`), coloured `SEV_VERDICT[FLAG_RANK[cardFlag]]` (`ColumnStatBar.jsx:63`) | card-tier fill vs `OBS.areaFill.fill`, **no legend key** | `names-predicate` | The bar carries no per-column tier, so the card tier is a rendering choice rather than a per-column claim. The flag surface is unlabelled — nothing keys the two fills. |
| Column Goodness-of-Fit | Skipped-column caption | `result.skippedColumns` (`:111`) | *…skipped — near-uniform shape — too flat to fit a distribution* | `names-predicate` | |
| Column Goodness-of-Fit | Cleared footer | `nFlagged > 0` false (`:117-121`) | *All columns fit their expected shape* | `names-predicate` | Non-rejection of a fit test rendered as a fit claim, and the A² ratio bar renders the magnitude beside it. Type matches; not the P195 shape. |
| Constant-Offset Blocks · `MiniCard_ConstantOffset.jsx` | Footer count | `blockEntries.length` (`:26`, `:39`), fed by `details`, which the producer caps at 20 (`constantOffset.js:157` `found.length < 20`) | *N offset copies — block reappears shifted by a constant* | `understates` | The true count is `consecutiveEqualDiffs` (`:113`) **on the single-condition path only** — on the aggregated path `aggregation.js` spreads the WORST GROUP's keys, so that field holds one group's count while the card reads a UNION across every applicable group (measured S388). **The existing `!isAgg` gate is load-bearing, not an oversight**, and Constant-Offset returns an aggregated result on 0 of 27 fixtures, so no fix on that path is verifiable against this corpus. The table footer discloses *Showing N of M* (`:53`) — but only on the single-condition path, and the headline count never does. Above 20 blocks the card names a number smaller than the one it holds. |
| Constant-Offset Blocks | Condition-name cell colour | `condColorMap[name].text` (`:13`) | condition hue | — | Group **identity**, not flag state. Excluded by the criterion. |
| Cross-Condition Consistency · `MiniCard_CrossCondConsistency.jsx` | `Finding` word on ran-but-unflagged rows | `!isAmberRow(d)` where amber = `ran ∧ forensic ∧ gatePassed ∧ ¬degenerate ∧ unitFlag ∈ {HIGH, MODERATE}` (`:60-62`, `:147-148`) | *As expected* | `overstates` | A pair with a strong signal in a **non-forensic direction** reads *As expected*. The label is an agreement claim; the predicate is a direction-gated decision — the same type mismatch as P195. The card discloses it in prose at `:194`, which is the defect signature rather than a defence. |
| Cross-Condition Consistency | `Finding` word on amber rows | `d.direction` (`:150`) | *Too similar* / *Too different* (+ *(fallback)*) | `names-predicate` | |
| Cross-Condition Consistency | Amber tint + Semibold + tier left edge | `isAmberRow(d)` (`:114`, `:122`, `:162`), colour from `result.flag` not `d.unitFlag` (`:112`) | amber row | `names-predicate` | The card-tier / unit-tier divergence is unreachable on this branch: BH-FDR at B = 999 cannot reach `ALPHA.FLAG` (header `:16-19`), so neither tier can be HIGH. |
| Cross-Condition Consistency | Muted text on informational rows | `d.ran && !d.forensic` (`:123`) | `C.TEXT_3` | `names-predicate` | |
| Cross-Condition Consistency | Highlight caption | `amber.length > 0` (`:178`) — direction not consulted | *Highlighted rows are the condition pairs flagged as too alike* | `wrong-vocabulary` | Four registered properties carry `forensicDirections: ["similar", "different"]` (`crossConditionProperties.js:345, 371, 427, 466`), and the card's own footer branches on `topDir === "different"` (`:83`). A *Too different* row is therefore highlightable under a caption that calls it *too alike*. |
| Cross-Condition Consistency | Skip caption | `!d.ran` (`:179`) | *…could not be tested — too few replicates or too little spread to assess* | `wrong-vocabulary` | Names two causes. The `mvslope` applicability path emits a third class of reason entirely (`crossConditionConsistency.js:405-417`), which is neither a replicate count nor a spread. |
| Cross-Condition Consistency | Disclosure caption | matches `:147-148` | *A pair can read 'as expected' beside a low p — only differences in a forensically meaningful direction count as a finding.* | `names-predicate` | Quotes a word its own card renders, correctly — the counter-example to P207. |
| Decimal Precision · `MiniCard_DecimalPrecision.jsx` | Observed bars | `barColorKey="barColor"` (`:36`) resolves **before** the flag branch (`VBarPlot.jsx:57-58`), and `barColor` is hardcoded `CC.OBS` (`:16`) | blue bars at every verdict | `understates` | `flag={result.flag}` is passed at `:38` and is **inert**. The plot renders byte-identically on a HIGH card and a LOW one — the observed series never flips red the way Benford's does through the same component. No legend on this card either, so nothing else carries the state. |
| Decimal Precision | Gap bars | `isGap` — no detail at that decimal place (`:17`) | `CHART.GAP` fill | `names-predicate` | Unlabelled: the card renders no `ChartLegend`, so the gap colour is never keyed. |
| Duplicate Detection · `MiniCard_DuplicateDetection.jsx` | Matched-cell tint, edge, and header highlight on **every** evidence surface | `isFlaggedVerdict = result.flag !== "LOW" && !== "N/A"` (`:27-30`, `:147-151`, `:163`) — the card flag is `min(bhFDR([collisionP, rowDupPValueAdj, withinRowP, bestBlockP, partialRowP]))` (`duplicateDetection.js:807-809`) | red cells + red header letters | `overstates` | The card carries **no per-sub-test verdict** (its own comment, `:25-26`). One sub-test flagging paints all three surfaces red, so a cleared block surface reads flagged because the within-row sub-test fired. The `SIG_NOTE` disclaimer is simultaneously withdrawn from those cleared surfaces (`:194`, `:323`, `:377` all gate on `!isFlaggedVerdict`). |
| Duplicate Detection | Per-surface significance note | `!isFlaggedVerdict` (`:194`, `:323`, `:377`) | *not statistically significant* | `names-predicate` | True as stated on a wholly cleared card; the defect is its withdrawal above, not its wording. |
| Duplicate Detection | Blocks heading count | `structuralBlocks.length` from `blockCopies:sparseFilteredBlocks.slice(0,20)` (`duplicateDetection.js:834`) | *N repeated blocks* | `understates` | Silently capped at 20. The panel cap of 5 **is** disclosed (`:277`); the producer cap of 20 is not. |
| Duplicate Detection | Row-group heading count | `rowGroups.length` from `rowDupGroupList.slice(0,20)` (`:836`) | *N groups of duplicate rows* | `understates` | Same cap, same silence. |
| Duplicate Detection | Within-row heading count | `wrTotal = withinRowMatches` (true total) but `allDupRows.length` from `withinRowLocs.slice(0,200)` (`:836`) | *N repeated value-pairs within M rows* | `understates` | One clause of the pair is the true total and the other is capped — the two halves of one sentence are different quantities. |
| Duplicate Detection | Partial-row heading count | `result.partialRowPairs ?? partialPairs.length` (`:316`) | *N copied pairs* | `names-predicate` | **The positive control for the three rows above.** This surface deliberately reads the engine total rather than the capped array, and says so at `:312-316`. |
| Duplicate Detection | Within-row group palette | `DUP_GROUP_PALETTE[gi % 6]` (`:365`, `:386`) | six rotating hues | — | Slot **identity**, carrying no decodable meaning (`tokens.js:244-248`). Excluded by the criterion. |
| Duplicate Detection | Cleared footer | all four evidence arrays empty (`:175`) | *No duplicates found* | `names-predicate` | Keyed on the evidence, not on the flag. |
| Entropy / Zipf · `MiniCard_Entropy.jsx` | `Finding` word | `d.Direction` (`:113`) | *Too few distinct values* / *Too many distinct values* | `names-predicate` | |
| Entropy / Zipf | Per-column bar colour | `!!c.flagged` (`:67`), card-tier fill (`ColumnStatBar.jsx:63`) | tier fill vs observed fill, **no legend key** | `names-predicate` | Same unlabelled-fill structure as Column Goodness-of-Fit. |
| Entropy / Zipf | Cleared footer | `nFlagged > 0` false (`:72-76`) | *Value variety normal across columns* | `names-predicate` | The entropy-ratio bar renders the magnitude beside the claim. |
### Part 2 — Inter-Replicate Correlation … Regional Noise (cards 11–19)

| Card | Surface | Predicate | Label | Verdict | Note |
|---|---|---|---|---|---|
| Inter-Replicate Correlation · `MiniCard_InterReplicateCorrelation.jsx` | Matrix cell colour | `p.isPromotionTrigger` (`:90`), set at `interReplicateCorrelation.js:322-327` to *this pair drove the verdict* | red tile vs blue tile | `names-predicate` | The field is the verdict's own per-pair driver mark. |
| Inter-Replicate Correlation | *Pair not flagged* key | complement of `:90` | blue swatch | `names-predicate` | Scoped to its unit class at S386 (P199). |
| Inter-Replicate Correlation | *Pair flagged* key | `nSusp = result.nSuspicious > 0` (`:103`) — a **different field** from the cells at `:90` | red swatch, conditionally pushed | `understates` | **P202, narrowed.** The key-with-no-red-cell half is unreachable (`suspicious` requires `!highSNR`, so `allHighSNR` zeroes both). The live half is the fallback arm: with `nSuspicious === 0`, `isPromotionTrigger` still fires on `p.adjP < ALPHA.FLAG` (`:323-325`) — red cells render **with no key at all**. |
| Inter-Replicate Correlation | All cleared cells one flat blue across the ρ range | `cellOp` returns `OBS.solid.fillOpacity` for every non-trigger tile (`:96`) | uniform blue | `names-predicate` | **P208 is not a labelling defect.** *Pair not flagged* is exactly true of the predicate; the defect is that a correlation heatmap's form promises intensity-encodes-value and this one encodes a binary. Condition 2 does not price it — it belongs to whichever condition owns plot form. |
| Inter-Replicate Correlation | Windows-table `Flag` column | `w.significant === true` — but **every** listed window is `significant = true` by construction: `winIrcSig = allWinResults.slice(0,20)` then `forEach(w => w.significant = true)` off **one shared `scanP`** (`interReplicateCorrelation.js:269-270`) | *Window flagged* per row | `overstates` | Twenty rows each carry a per-window flag word backed by a single family-level scan p. The card's own footer says so — *Adjusted p is the scan-statistic permutation p shared across the flagged window family* (`:182`) — which is prose covering for the column beside it. The `"—"` fallback at `:170` is unreachable. |
| Inter-Replicate Correlation | Windows-table heading | same set as above | *Highly correlated row windows* | `names-predicate` | Every listed window is above the scan threshold, so the heading's set claim holds — it is the per-row *word* that oversteps, not the heading. |
| Inter-Replicate Correlation | Connector caption | `!pairDetails.some(d => d.isPromotionTrigger === true) && wins.length > 0` and card flagged (`:219-221`) | *No single replicate pair is anomalous overall — the verdict is driven by the localised row windows shown below.* | `names-predicate` | Reads the same driver field the cells colour on. |
| Inter-Replicate Correlation | No-windows message | `topWins.length === 0 && result.flag !== "LOW"` (`:188`) | *No localised row ranges detected — elevated correlation is uniform across all rows.* | `names-predicate` | The scan is a max-window magnitude test, so a uniformity claim is the right *type*; the phrasing is stronger than the scan's resolution but not a category error. |
| Excess Kurtosis · `MiniCard_Kurtosis.jsx` | *Observed* legend swatch + distribution fill | `observedSwatchColor(result.flag)` (`:30`) | red on flag, blue otherwise | `names-predicate` | Channel-4 flat-red flip, correctly applied. |
| Excess Kurtosis | Per-condition `Finding` word, platykurtic branch | `c.platykurtic` = `condKDev < -EFFECT_SIZE.KURTOSIS_DEV` (`kurtosis.js:433`), sub-split on `c.condPromoted` (`:482`) | *Too uniform* / *Possibly uniform* | `names-predicate` | An effect-size band word on an effect-size band. The caption at `:72` scopes the column as effect size and warns that a small p can sit beside *Normal* — honest, and the canon's rule is satisfied because the split tests the quantity the word names. |
| Excess Kurtosis | Per-condition `Finding` word, normal branch | neither band (`:88` else) | *Normal* | `names-predicate` | Same reasoning. |
| Excess Kurtosis | Per-condition `Finding` **colour** | `flagColor = cIsPlat ? (platPromoted ? THRESH : AMBER) : cIsLepto ? (isFlagged ? THRESH : AMBER) : OBS` (`:87`) — `cIsPlat` and `cIsLepto` are both **ungated by the verdict** | amber on a condition whose `verdict === "clear"` | `overstates` | Amber is a MODERATE flag colour. A condition the engine cleared renders in a flag colour because its κ-deviation fell in a direction band. The word hedges (*Possibly*); the colour does not. |
| Excess Kurtosis | Sparkline label + colour, platykurtic branch | `c.platykurtic && (verdict === "noted" \|\| "flagged")` (`:144`) | *(flatter)* | `names-predicate` | Verdict-gated — correct. **But it disagrees with the table above it**: on a cleared platykurtic condition the table reads *Possibly uniform* in amber and the sparkline reads *(typical)* in blue. Two surfaces of one card, one condition, opposite states. |
| Excess Kurtosis | Sparkline label + colour, leptokurtic branch | `c.isLeptokurtic` alone (`:145`), ungated | *(more peaked)* in amber at `verdict === "clear"` | `overstates` | The asymmetry with the plat branch one line above is the whole defect: one was gated at S221, the other was not. |
| Excess Kurtosis | Promotion badge | `condKurtosis.promoted`, set when the **platykurtic family's** BH promotes one or more conditions (`kurtosis.js:485`) | *differs between conditions — promoted* | `wrong-vocabulary` | The predicate is a per-condition departure from the simulated null, not a between-condition contrast. No two-condition comparison is computed anywhere on this path — S363 measured both conditions sitting within ±0.03 of each other while the pooled figure moved. |
| LOESS Residual · `MiniCard_LOESS.jsx` | *Changepoint* key + red marker | `hasCP && result.flag !== "LOW" && !== "N/A"` (`:21`) | red line + *Changepoint* | `names-predicate` | S243 gated the marker on the verdict rather than on the argmax row's existence — the legend never keys an undrawn mark. |
| LOESS Residual | *Row noise* / *LOESS trend* keys | series identity (`:43-44`) | blue line swatches | — | Mark identity, not flag state. Excluded by the criterion. |
| LOESS Residual | Region-table `Finding` word | `ratio > 1.5 ? "Noisier" : ratio < 0.67 ? "Quieter" : "As expected"` (`loessResidual.js:346-347`) | *Noisier* / *Quieter* / *As expected* | `names-predicate` | **A second positive control.** *As expected* here is honest: the split is an SD-ratio band, an actual magnitude, so the word names the quantity the split tests. Contrast Cross-Condition Consistency's *As expected*, gated on direction. |
| Mahalanobis Row Outlier · `MiniCard_Mahalanobis.jsx` | *Outlier* + *Significance threshold* keys | `totalOutliers > 0` (`:57`) | red dot + dashed red line | `names-predicate` | S267 bound the keys to the drawn marks explicitly. |
| Mahalanobis Row Outlier | *Normal* key (single-plot path only) | not in `pooledOutlierRows` (`:34-35`, `:52`) | blue dot | `names-predicate` | Note the per-path divergence: on the per-condition path the same blue dots are keyed by **condition name** (`:47-50`) and no cleared-state key exists at all. One card, two vocabularies for one mark, chosen by layout. |
| Missing Data Pattern · `MiniCard_MissingDataPattern.jsx` | Missing-cell fill | cell is `null \| undefined \| ""` (`:91`) — no test, no flag | `withAlpha(SIGNAL.RED.dot, 0.45)` keyed *Missing cell* | `overstates` | The word names the predicate exactly; the **colour** does not. Red is the signal family (`PLOT-COLOUR-SEMANTICS` channel 4: an observed mark that flags reads red). Every missing cell in a wholly cleared file renders in the flag hue, so the heatmap reads accusatory before any test has run. |
| Missing Data Pattern | *Significant block* key + red outline | `b.adjP < ALPHA.NOTE` (`:88`) | red stroke, conditionally pushed | `names-predicate` | Gated on the drawn set. |
| Missing Data Pattern | Cleared footer | card flag (`:112`) | *Missing values scattered across the data* | `names-predicate` | A pattern claim from a pattern test's non-rejection — type matches. |
| Missing Data Pattern | Per-column missing-rate bars | none — every bar `OBS.areaFill.fill` (`:70`) | no legend, no flag state | — | A per-column flag surface that is **absent**: the card computes no per-column decision and claims none. |
| Modality Test · `MiniCard_Modality.jsx` | Reference line | `refValue={DIP_GATE}`, `refColor={CC.THRESH}` (`:70`), where `DIP_GATE` is only the effect-size half of `c.flag = c.D_obs >= DIP_GATE ? flagFromP(c.adjP) : "LOW"` (`modality.js:247`) | red line labelled *Multimodality threshold* | `overstates` | The line names a threshold for multimodality; crossing it is necessary and **not sufficient**. A column can sit well above the red line in the unflagged fill, and the label offers the reader no way to know why. Drawing it in the flag token compounds the claim — every other card's reference line is teal `CC.EXP`. |
| Modality Test | Per-column bar colour | `!!c.flagged` = `c.flag ∈ {HIGH, MODERATE}` (`modality.js:266`) | card-tier fill vs observed fill, **no legend key** | `names-predicate` | Unlabelled, as on Column Goodness-of-Fit and Entropy. |
| Modality Test | Skipped-column caption | `result.skippedColumns` (`:53`) | *…skipped — near-uniform shape — too flat to test for peaks* | `names-predicate` | |
| Modality Test | Cleared footer | `nFlagged > 0` false (`:59-63`) | *All columns single-peaked* | `names-predicate` | Accepts the dip test's null, which is unimodality; the dip magnitude is rendered beside it. The weakest instance of the pattern in the battery — a dip test has little power — but the type matches. |
| Modality Test | Flagged-column names in the implications text | `Col ${d.Col}` raw 1-based data index (`:28`) | *Col 3* | — | Not a flag surface. Recorded because it is the **only** column-labelled card that skips the two-stage `dataColMap → origColMap → letter` resolver its three siblings all run; the number points at no file column. Coordinate defect, separate condition. |
| Noise Scaling · `MiniCard_NoiseScaling.jsx` | Scatter dots and observed fit line | none — `fill={OBS.dot.fill}` and `obsCol = CC.OBS` unconditionally (`MeanVarianceScatter.jsx:39, 103`) | blue at every verdict | `understates` | Same shape as Decimal Precision: a global-statistic card whose observed series never takes the channel-4 flat-red flip that Benford, Excess Kurtosis and Baseline Balance all take through the same convention. The card renders identically at HIGH and at LOW. |
| Noise Scaling | Mark-description caption | mark identity (`:29`) | *Each dot = one row … Solid line = observed fit … Dashed = expected for {assay}* | `names-predicate` | Names the marks; asserts no flag state. |
| Cross-Condition Rank Correlation · `MiniCard_RankCorrelation.jsx` | Cell colour | `val.suspicious` (`:39`, from `d.suspicious`) | amber tile vs blue tile | `names-predicate` | |
| Cross-Condition Rank Correlation | *Suspicious* key | **unconditional** (`:50-53`) — not gated on any cell being suspicious | amber swatch, always rendered | `overstates` | The legend keys a state the matrix may not contain. Both siblings gate the equivalent key — Inter-Replicate Correlation on `nSusp > 0` (`:103`), Mahalanobis on `totalOutliers > 0` with the rule written out at `:54-56` (*the legend never lists an undrawn mark*). This card is the one that does not. |
| Cross-Condition Rank Correlation | All cleared cells one flat blue across the ρ range | `cellOp` (`:45`) | uniform blue | `names-predicate` | **P208's form defect, on a second card.** P208 is currently scoped to Inter-Replicate Correlation alone; the identical construction is here. Labelling is sound on both. |
| Regional Noise · `MiniCard_RegionalNoise.jsx` | Strip gradient key | `opacityForRatio(ratioNum)`, ramping 1× → 0.15 up to `maxRatio` → 0.7 (`RegionalNoiseStrip.jsx:45-46`) | *Low divergence* → *High divergence* | `names-predicate` | The ramp is the variance ratio and the key names divergence; the labels are relative, which is what a within-plot normalisation supports. |
| Regional Noise | *Anomalous windows* heading | `windowData` = `sortedWindows.filter(w => w.maxRatio >= obsScanStat * 0.5).slice(0,10)` (`regionalNoise.js:206`) | *Anomalous windows* | `overstates` | The listed set reaches down to **half** the observed scan statistic. Windows that did not drive anything are headed as anomalous and drawn in `CC.THRESH` on the strip above. |
| Regional Noise | Table `Finding` word | `d.direction` (`:107`) | *Quieter* / *Noisier* / *Anomalous* | `names-predicate` | A direction word on a direction field — fixed at S372 after the magnitude-derived version could not reach *quieter*. |
| Regional Noise | Per-condition table | `result.condRegionalNoise`, rendered unconditionally (`:132`) | *Regional noise by condition*, raw `p` column | `names-predicate` | No flag word or colour; the p is raw and the header says only *p*. |
### Part 3 — Residual Spike … Within-Row Variance (cards 20–28)

| Card | Surface | Predicate | Label | Verdict | Note |
|---|---|---|---|---|---|
| Residual Spike Correlation · `MiniCard_ResidualSpike.jsx` | ρ-matrix legend, flagged path | `rhoLegendItems` over ρ bands 0.6 / 0.3 (`heatmapColors.js:69-83`) | *Weak / Moderate / Strong correlation* | `names-predicate` | S278 reworded these into a descriptive register precisely so the tier words would not read as a second verdict. The split is ρ magnitude and the words name ρ magnitude. |
| Residual Spike Correlation | ρ-matrix cell **colour**, flagged path | `rhoColor(v)` → `TIER_COLOR.MID` / `HIGH` (`CoordResidualProfile.jsx:143`) | amber / red tiles | `overstates` | The card has **no per-pair decision at all** — its own comment says so (`:136-137`: *RSC has no per-pair `suspicious` — its verdict is the single card-level flag*). S278 fixed the words and left the palette: a ρ of 0.62 between two conditions renders in the same red the battery reserves for a flagged unit. |
| Residual Spike Correlation | ρ-matrix, cleared path | `cleared = !isFlagged` (`:143-151`) | uniform blue + *Observed correlation* | `names-predicate` | The cleared carve-out is the correct half of the same S278 pass. |
| Residual Spike Correlation | Strip gradient key | residual magnitude, gamma ramp (`:293-299`) | *Low* → *High* | `names-predicate` | |
| Residual Spike Correlation | Overlap-rows table | `result.details`, gated on `isFlagged` (`:52`) | *Shared spike strength* = `d.coordScore` | `names-predicate` | Names the statistic; asserts no per-row decision. |
| Row-Mean Runs · `MiniCard_RowMean.jsx` | Forest dot + keys | `flagged: c.p < ALPHA.NOTE` (`:87`) — the same expression the table's `Finding` uses | *Flagged* / *Not flagged* | `names-predicate` | |
| Row-Mean Runs | Forest reference key | `referenceMode: "stored"`, `reference: c.expected` (`:84-85`) | solid tick + *Expected (chance)* | `names-predicate` | Tick glyph, per the P197/P199 fix — a per-unit reference keyed by a per-unit mark. |
| Row-Mean Runs | Sign-strip legend | `SignStripPlot` colours each block by the sign of the detrended row mean; the **flag** reads run length (`:13-17`, `:132-135`) | *Above trend* / *Below trend* | `wrong-vocabulary` | **P206, the dispatch's type specimen.** The keys are true of what the colour encodes, which is why it survived — but the card's verdict reads how long each colour holds, and nothing on the strip keys that. On DS21 the two conditions carry near-equal dark and light and differ only in block length. |
| Row-Mean Runs | Table `Finding` word | `c.p < ALPHA.NOTE`, the per-condition raw runs-test p (`:43-46`) | *As expected* / *Fewer than expected* / *More than expected* | `names-predicate` | **A positive control.** *As expected* is honest here: the split is a runs test on the quantity the phrase describes. This is also the column P207's caption borrows from. |
| Row-Mean Runs | Framing line above the strips | asserts the flag rule (`:115-116`) | *…the card flags if any one condition clumps* | `wrong-vocabulary` | The card also flags on the **windowed-promotion arm** — a window below `ALPHA.FLAG` promotes to MODERATE on its own, and the card's own comment says so (`:57-61`). Its bridge line at `:161` exists for exactly that case, so two surfaces on this card state incompatible flag rules. |
| Row-Mean Runs | Windows-table `Flag` column | `w.adjP < ALPHA.FLAG` (`:172`) | *Flagged* / *—* | `names-predicate` | Both branches reachable — windows between `ALPHA.FLAG` and `ALPHA.NOTE` are listed and read *—*. The contrast with Inter-Replicate Correlation's windows table, whose `"—"` branch is unreachable, is the whole difference between the two constructions. |
| Row-Mean Runs | Bridge line | `isFlagged && condsClean` (`:159`) | *No whole-condition run pattern is anomalous — the verdict is driven by the localised row windows shown below.* | `names-predicate` | Gated so it cannot claim the conditions cleared when one flagged. |
| Runs Test · `MiniCard_Runs.jsx` | Sign-strip legend | as Row-Mean Runs, and the labels are **constants** (`:126-127`) rendered once above N strips, one per replicate **pair** (`:117-118`) | *First column higher* / *Second column higher* | `wrong-vocabulary` | **P206's second, unallocated site — and worse here.** Beyond naming direction where the flag reads run length, "first column" refers to a *different* column on every strip row. `c1`/`c2` are computed at `:125` and reach only the single-pair fallback's row label. |
| Runs Test | Pooled-z marker legend | `pooledMeanZ`, `pooledZCI_flag` (`:189`) | *Pooled mean-z ± verdict-edge CI* / *Expected z = 0 (no run bias)* | `names-predicate` | The marker dot is neutral `C.TEXT` at every verdict — the interval's relation to zero is the claim, and no flag colour is asserted. |
| Runs Test | Table `Finding` word | `parseFloat(p.adjP) < ALPHA.NOTE` (`:152`) | *As expected* / *Fewer than expected* / *More than expected* | `names-predicate` | A per-pair BH-adjusted runs p. Marks at 0.01 while the verdict promotes at 0.001 (S230) — deliberate, and the caption below states the split. |
| Runs Test | Pooled-vs-pair caption | matches `:152-155` | *…a pair can read 'as expected' while the pooled pattern is flagged.* | `names-predicate` | **This is where P207 came from.** `MiniCard_Autocorrelation.jsx:220` is the same sentence with two nouns swapped, moved onto a card that renders *Not flagged* instead. The original is correct; the copy is not. |
| Runs Test | *Significant pairs* heading | `result.pairSignSeqs`, admitted at `ALPHA.NOTE` (S230, `:144-150`) | *Significant pairs* | `names-predicate` | Admission and word agree; note the admission band is looser than the verdict's promotion band, which the table caption discloses and the strip heading does not. |
| Runs Test | Per-condition table | `result.condRuns`, raw `p` (`:244-249`) | *Runs test by condition* | `names-predicate` | |
| Selective Noise · `MiniCard_SelectiveNoise.jsx` | Per-column `Finding` column | **none** — the per-column Levene is display-only and the verdict is a pooled Bartlett with no per-column decision (`:28-31`, `:85-90`) | em-dash *—* | `names-predicate` | **The model resolution for this whole class.** S285 retired the per-column word rather than rewording it, kept the column for layout, and put the magnitude in the *Observed SD* / *Ratio* columns. The caption at `:75` states it plainly: *no single column is flagged on its own*. Where no per-unit decision exists, the honest label is no label. |
| Selective Noise | *Expected spread* band key | `result.flag !== "LOW"` (`:68`), matching the plot's own `flag && flag !== "LOW"` band gate (`NoiseSpreadPlot.jsx:35`) | teal band swatch | `names-predicate` | Key and mark gate on one expression — the legend never lists an undrawn band. |
| Selective Noise | Pivot banner | `result.pivotNote` (`:17`) | *Pivot mode … Flag suppressed.* | `names-predicate` | |
| Sequential Duplication · `MiniCard_SequentialDuplication.jsx` | Duplicated-value cells | **ungated** — `SIGNAL.RED.text` on `SIGNAL.RED.bg`, bold, for every sequence value (`:80`) | red-on-red bold values | `overstates` | No flag gate anywhere on this card body. A LOW verdict with sequences present still paints every value in flagged-evidence styling. This is precisely the defect S318 fixed on Duplicate Detection — that card's `isFlaggedVerdict` / neutral-`HL` treatment was never carried across to its sibling in the same mechanism category. |
| Sequential Duplication | Heading count | `sequences.length` from `sequences: kept.slice(0, 50)` (`sequentialDuplication.js:186`) | *Recurring value sequences — N found* | `understates` | Capped at 50 by the producer while `nSequences: kept.length` carries the true total one line above it. The card's 8-panel display cap **is** disclosed (`:93-96`); the 50 is not. |
| Sequential Duplication | Headline footer | `footer={hasSeq ? undefined : footer}` (`:37`) | the composed *Column X · N recurring sequences · run of H recurs at offset O* string, **discarded** | — | Dead branch: the string built at `:26-33` renders only in the no-sequences case, where it reads *No recurring value sequences found*. The informative form is computed and never shown. Not a mislabelling — a missing surface. |
| Terminal Digit Uniformity · `MiniCard_TerminalDigit.jsx` | Observed bars + swatch | `observedSwatchColor(result.flag)` (`:51`); `VBarPlot.jsx:58` takes the same branch because no `barColorKey` is passed | red on flag, blue otherwise | `names-predicate` | The channel-4 flip works here. Contrast Decimal Precision, which passes `barColorKey` and silently defeats it. |
| Terminal Digit Uniformity | Reference key | `expKey="expected"` (`:44`) | dashed teal + *Expected (uniform)* | `names-predicate` | |
| Terminal Digit Uniformity | Footer scope suffix | `result.trailingZeroWarning` (`:34`) | *· 9-digit test (digit 0 excluded)* | `names-predicate` | Discloses that the plot dropped digit 0 and re-centred on `exp9` (`:19-23`). |
| Value-Frequency Spike · `MiniCard_ValueFrequency.jsx` | Forest dot + keys | `flagged: t.droveVerdict === true` (`:148`) | *Flagged* / *Not flagged* | `names-predicate` | **P195's site, resolved.** The key now names a decision, and the caption at `:210-212` states the gap outright: *one that clears the significance cut but not the effect-size or near-duplicate gate reads as not flagged, however far it sits from its expected count*. |
| Value-Frequency Spike | Forest reference key | `referenceMode: "stored"`, `reference: t.smoothed` (`:145-146`) | solid tick + *Expected (neighbouring values)* | `names-predicate` | |
| Value-Frequency Spike | Subset caption | `forestCleared` sorted by `adjP` asc then sliced to 20 (`:135-137`, `:207-209`) | *Showing the N values closest to significance, of M tested.* | `names-predicate` | **P196 is not a labelling defect either.** The caption names the selection rule exactly; the objection is to the rule (a cleared card shows its most extreme twenty and nothing typical), which is a selection question, not a label-versus-predicate one. |
| Value-Frequency Spike | Spike table | `result.details`, every row a spike | no `Finding` column, no flag mark | `names-predicate` | |
| Value-Frequency Spike | Adjacent-key banner | `result.keyboardPattern` (`:179`) | *Adjacent-key pattern detected* | `names-predicate` | |
| Windowed Autocorrelation · `MiniCard_WindowedAutocorr.jsx` | Strip legend **swatch colour** | strip marks are drawn `fill={CC.THRESH}` (`RegionalNoiseStrip.jsx:75`); the key's swatch is `C.TEXT_3` grey (`:119`) | grey swatch labelled *Row range of flagged window (darker = larger \|r\|)* | `wrong-vocabulary` | The swatch keys a colour the plot does not draw. Blocked Mahalanobis mounts the **same primitive** and keys it `CC.THRESH` (`MiniCard_BlockedMahalanobis.jsx:109`) — one plot, two consumers, one of them wrong. |
| Windowed Autocorrelation | Strip mark inclusion | `d.adjP < ALPHA.NOTE` (`:37`) | *flagged window*, opacity from `1 + \|r\|·10` (`:48`) | `names-predicate` | `ALPHA.NOTE` is the right band: this test cannot reach HIGH on any branch. |
| Windowed Autocorrelation | Table Semibold + tier left edge | `d.adjP < ALPHA.NOTE` (`:71`) | bold row, tier colour | `names-predicate` | |
| Windowed Autocorrelation | Cleared-table footer | `result.flag === "LOW"` (`:86`) | *All windows are consistent with independent noise in each pair.* | `names-predicate` | Non-rejection stated as a non-rejection, as on Blocked Mahalanobis. |
| **Within-Row Variance** · `MiniCard_WithinRowVariance.jsx` | **Histogram bin colour + both legend keys** | **`isOutlier = Math.abs(zMid) > Z_THRESH` (`:44`) — an actual magnitude test on the bin's z** | *Outside ±{Z_THRESH}σ threshold* / **_Within expected range_** | **`names-predicate`** | **HALT CONDITION 2 — the positive control. It does not fire.** The label is a magnitude claim and the split tests that magnitude, so the criterion returns `names-predicate`, which is the required answer. The threshold lines at ±`Z_THRESH` are drawn on the same plot (`:50-56`), so the reader can see the split the words name. |
| Within-Row Variance | Table `Finding` word | `d.Direction` from `r.direction` (`withinRowVariance.js:189`) | *Too smooth* / *Too noisy* | `names-predicate` | |
| Within-Row Variance | Footer | `result.nOutliers` (`:75-79`) | *N rows have unusual spread across their replicates* | `names-predicate` | |

---

## Part 4 — the Excess Kurtosis in-card gate, read at source

The gate at `src/components/cards/MiniCard_Kurtosis.jsx:65`:

```js
condK?.length >= 2 && (flag === "HIGH" || condK.some(c => c.verdict !== "clear"))
```

Two arms were already decided: DS12b carries two conditions, so `condK?.length >= 2` holds by
construction; Excess Kurtosis is LOW on DS12b, so `flag === "HIGH"` is false. The whole gate rests on
`condK.some(c => c.verdict !== "clear")`.

**Read from the field, not from the record.** `TEST-GROUND-TRUTH.md`'s per-condition entry is S341,
and P122 closed at S374 (`e7fec0d`, merging `9ee6053`), which moved `condKurtosis[].flag`, `.verdict`
and `.isLeptokurtic` onto the across-condition BH-adjusted p at `kurtosis.js:517-519`. The two
values below were read by running the shipped engine on `test/fixtures/12b-uniform-mixture-fabricated.csv`
through the same load path `validate-batch.mjs` uses, at the default stream, and printing
`result.condKurtosis`.

### The two values

| Condition | n | κ | κ deviation | rawP | **BH-adjusted p (printed)** | flag | **verdict** |
|---|---|---|---|---|---|---|---|
| Fabricated | 200 | −0.7090 | −0.1047 | 0.0020 | **0.0040** | MODERATE | **`"noted"`** |
| Genuine | 200 | −0.6479 | −0.0436 | 0.1965 | 0.1965 | LOW | `"clear"` |

1. **The live `verdict` on DS12b's Fabricated condition is `"noted"`.** It is not `"clear"`, so the
   deciding arm is **true**.
2. **The threshold: `ALPHA.NOTE` is 0.01 (`thresholds.js:24`), and 0.0040 sits below it.**
   `flagFromP` compares strictly (`:38-41`), so `flagFromP(0.0040)` returns `"MODERATE"` and
   `c.verdict` is set to `"noted"` at `kurtosis.js:519`. Post-`e7fec0d` the tier reads the adjusted p,
   which is what makes this the number that decides the gate.

**One correction to the dispatch's premise.** The dispatch states DS12b's Fabricated condition carries
a BH-adjusted p of 0.0080. The live field is **0.0040**, with a raw permutation p of 0.0020 — the
BH pass at m = 2 doubles the rank-1 value. The conclusion is unchanged, since both sit below 0.01,
but the number should be corrected wherever it is carried.

### What the conjunction returns

```
condK?.length >= 2                      →  true   (2 conditions)
flag === "HIGH"                         →  false  (card flag is LOW)
condK.some(c => c.verdict !== "clear")  →  true   (Fabricated is "noted")
                                  GATE  →  TRUE
```

**The gate is open. Excess Kurtosis's condition-stratified section renders on DS12b, so it does not
ship render-unexercised.** Nothing was tuned toward this answer; the probe reads published fields and
evaluates the card's own expression.

### Three things the read turned up that the gate question did not ask

- **The section renders with no marked row.** The gate opens on `verdict`, which is now a p-derived
  field. The `Finding` word inside the section reads the **effect-size bands** instead —
  `c.platykurtic` is `condKDev < −0.20` (`kurtosis.js:433`), and DS12b's deviations are −0.1047 and
  −0.0436. Both conditions therefore read *Normal* in `CC.OBS`. The card opens a section on one
  quantity and fills it from another, and DS12b is the case where they disagree.
- **`condKurtosis.promoted` is `undefined` on DS12b**, so the *differs between conditions — promoted*
  badge does not render there. That badge is classified `wrong-vocabulary` in Part 2 on separate
  grounds.
- **The two per-condition κ values match the S341 record** (−0.709 / −0.648). It is only the p that
  moved, which is exactly what `e7fec0d` was for.

---

## Result — the class, priced

**Every count in this section was parsed out of the table above by column position, never read off
the page.** The instrument, run against this file:

```bash
sed 's/\\|/@PIPE@/g' docs/shared/CONDITION-2-CARD-CLASSIFICATION.md \
  | awk -F'|' 'NF==8 && $2 !~ /^ *(Card|---)/ && $1=="" {print $6}' \
  | sed 's/[*` ]//g' | tr '\n' ' ' | command grep -io '\<overstates\>' | command grep -c .
```

`command grep` throughout — the shell wrapper carries `--ignore-files` and skips gitignored paths.

| Verdict | Count |
|---|---|
| `names-predicate` | **85** |
| `overstates` | **13** |
| `understates` | **8** |
| `wrong-vocabulary` | **8** |
| excluded (identity colour, or a flag surface that is absent) | 6 |
| **total surface rows** | **120** |

**THE 120 IS A FLOOR, NOT A PRICE FOR CONDITION 2 (P211, S388).** This classification enumerated flag
surfaces on **cards**. Condition 2's bar is *no surface contradicts its verdict*, which is not scoped
to cards. **S388 measured a live contradiction on a surface this table never covered:** on
`14-crctest-survey.csv` the Duplicate Detection card read *42 repeated blocks* while the Copy Summary
read `blocks=20` — same file, same run, same statistic. Fixed at `47de33b`. **The export surfaces —
`ReportView.jsx`, `excelExport.js`, `findingComposers.js`, `handoffModel.js` — have never been
enumerated the way the 28 cards were.** **A `.length` grep finds four of five capped quantities and
misses the fifth:** `handleExportExcel`'s `getPrimaryFinding` is a third copy of the sentence inside
`ReportView.jsx` itself, and its `nDR` is a `reduce`. Same shape as P161; P162, P89 and P155 are the
same finding elsewhere. **A count over one surface family is not a count over the condition.**

All 28 cards carry at least one row. **18 of the 28 carry at least one non-`names-predicate`
verdict; 10 are clean.**

### Three findings that matter more than the totals

**1. `names-predicate` is the large majority, and that is the finding.** Halt condition 2 exists
because the S386 sweep nearly replaced a correct label with a wrong one. At 85 of 114 classified
labels, the battery's vocabulary is mostly right, and several surfaces are right **because someone
already fixed them the correct way**. The positive controls, all confirmed at source here:

- **Within-Row Variance** — *Within expected range* over `Math.abs(zMid) > Z_THRESH`. The magnitude
  claim sits on a magnitude test. **Halt condition 2 did not fire.**
- **Selective Noise** — S285 retired the per-column `Finding` word to an em-dash rather than
  rewording it, because the pooled Bartlett makes no per-column decision. *Where no per-unit decision
  exists, the honest label is no label.* This is the pattern the remainder should copy.
- **Value-Frequency Spike** — P195's own site, resolved: the key names a decision and the caption
  states the gap outright.
- **Row-Mean Runs' and Runs' `Finding` columns** — *As expected* over a real runs test on the
  quantity the phrase describes.
- **LOESS's region table** — *As expected* over an SD-ratio band.
- **Mahalanobis** (S267) and **LOESS** (S243) — the legend never keys an undrawn mark.
- **Duplicate Detection's partial-row heading** — reads the engine total, not the capped array, and
  says so at the site.

**2. The `understates` column is one mechanism, found eight times.** Seven of the eight are a
**silently capped count or a defeated flag flip**, and the fix in each case is already implemented
somewhere else in the same file or the same component:

| Site | What is silent |
|---|---|
| Duplicate Detection — blocks heading | producer cap of 20 (`:834`) |
| Duplicate Detection — row-group heading | producer cap of 20 (`:836`) |
| Duplicate Detection — within-row heading | one clause true-total, the other capped at 200 |
| Constant-Offset Blocks — footer count | producer cap of 20; the true total is on the result |
| Sequential Duplication — heading count | producer cap of 50; `nSequences` carries the total |
| Decimal Precision — observed bars | `barColorKey` defeats the channel-4 flip; `flag` is inert |
| Noise Scaling — scatter and fit | no flip at all on a global-statistic card |
| Inter-Replicate Correlation — *Pair flagged* key | red cells render with no key on the fallback arm |

**3. The `overstates` and `wrong-vocabulary` columns are where condition 2's real work is**, and they
cluster on a small number of shapes:

- **A per-unit word on a family-level decision.** Inter-Replicate Correlation's windows table gives
  twenty rows *Window flagged* off one shared scan p, with the disclaimer in the footer.
- **A colour ungated where the word is gated.** Excess Kurtosis's per-condition `Finding` colour goes
  amber on a cleared condition, and its own sparkline one surface below gates the plat branch and not
  the lepto branch — so the two surfaces contradict each other on the same condition.
- **A signal-reserved colour on a non-signal predicate.** Missing Data Pattern paints every missing
  cell red before any test runs; Residual Spike Correlation paints ρ bands in the tier palette on a
  card with no per-pair decision; Sequential Duplication paints every duplicated value red at LOW.
- **A heading whose set is wider than its word.** Regional Noise's *Anomalous windows* reaches down
  to half the scan statistic; Baseline Balance's *Excess balanced features* keys a decile wider than
  the counted set.
- **A caption asserting a flag rule the card does not use.** Row-Mean Runs' framing line names the
  condition arm as the flag rule and omits the window arm its own bridge line exists for.
- **Prose covering for a plot.** Baseline Balance `:144`, Inter-Replicate Correlation `:182`,
  Cross-Condition Consistency `:194`, Excess Kurtosis `:72`. S386 banked this as a defect signature;
  it is the single most reliable locator in this table.

### Sites S386's register does not yet name

Each is a fresh instance of an already-allocated object, so they are cheap to fold in rather than
allocate anew:

- **P206 has a second site.** `MiniCard_Runs.jsx:126-127` legends its sign strips by direction on the
  same run-length test — and its labels are constants above N strips of different replicate pairs, so
  "first column" has no fixed referent.
- **P208 has a second site.** Cross-Condition Rank Correlation renders the identical flat-blue
  cleared cell across its ρ range.
- **P207 has an origin.** `MiniCard_Runs.jsx:234` is the correct original of the sentence
  `MiniCard_Autocorrelation.jsx:220` carries; the copy moved onto a card with a different vocabulary.
- **P202 narrows.** Only one of its two directions is reachable: red cells with no key, via the
  fallback arm. The key-with-no-red-cell half cannot occur, because `suspicious` requires `!highSNR`.
- **One primitive, two consumers, one wrong.** Windowed Autocorrelation keys `RegionalNoiseStrip`'s
  red marks with a grey `C.TEXT_3` swatch; Blocked Mahalanobis keys the same primitive `CC.THRESH`.
- **One legend rule, one holdout.** Cross-Condition Rank Correlation pushes its *Suspicious* key
  unconditionally, where Inter-Replicate Correlation and Mahalanobis both gate theirs on the drawn
  set — and Mahalanobis writes the rule out in a comment.
- **One coordinate resolver, one holdout.** Modality names flagged columns `Col ${d.Col}` where
  Column Goodness-of-Fit, Entropy and Baseline Balance all run the two-stage
  `dataColMap → origColMap → letter` resolve. Not a condition-2 defect; recorded so it is not lost.

---

## Register rows moved from STATUS, S392

STATUS is gitignored and has no git history, so a register row is the only copy of
whatever it holds. These bodies are moved here verbatim; the register row keeps its
claim and points at this section.

### P211 — the condition-2 classification prices the cards, and condition 2's bar is not scoped to cards

open, allocated S388. `docs/shared/CONDITION-2-CARD-CLASSIFICATION.md` enumerated 120 flag surfaces over 28 cards. The bar is *no surface contradicts its verdict*, and S388 measured a live contradiction on a surface that is neither a card nor a view: on `14-crctest-survey.csv` the Copy Summary read `blocks=20` where the card read 42. **The 120 is a FLOOR.** Fixed at `47de33b`, but the enumeration has never been run over `ReportView.jsx`, `excelExport.js`, `findingComposers.js` or `handoffModel.js`. **A `.length` grep finds four of five capped quantities and misses the fifth** — `handleExportExcel`'s `getPrimaryFinding` is a third copy of the sentence inside `ReportView.jsx` itself and its `nDR` is a `reduce`. Same shape as P161; P162, P89 and P155 are the same finding elsewhere.

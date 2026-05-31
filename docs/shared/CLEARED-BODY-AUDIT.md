# Cleared-Body Audit — 28-card runtime inventory

**Purpose.** Inventory what every test *retains* on a CLEARED/LOW result, at runtime, to feed
the clean-evidence-body design pass (the §3 cleared-card mount landed S196). For each test:
**(a)** the full runtime field inventory on a cleared pass, **(b)** what the test actually
computes (so we can see whether the headline number is the real signal or one projection of
it), and **(c)** what the card renders today on a cleared pass. The **design-verdict column is
left empty — that is Chat's to fill.**

**Method.** Each test was *run* to a cleared/LOW verdict on a real fixture (the simplest/
smallest clearing fixture), and the actual result object was dumped — field population is
recorded from runtime, not inferred from the return statement. Column (b)/(c) claims are
source-reads with `file:line`. Two tests never clear to LOW anywhere in the 22-fixture set
(Cross-Condition Rank Correlation, Missing Data Pattern) — their (a)/(c) are source-reads,
explicitly flagged.

**Provenance.**
- Code state audited: worktree `1f0a2ba` (S196 cleared-card mount present). *Note: at audit
  time `main` was still `9a9a7e7` — S196 was committed to the worktree branch but not yet
  promoted, contrary to the task's "main is the S196 promote" assumption. The code behaviour
  audited is identical either way.*
- Runtime harness: `validate-batch.mjs` setup replicated (PapaParse → `preprocessRaw` →
  `detectHeaderRows` → `inferRoles` → `extractAnalysisInputs` → `detectVST` →
  `runFullAnalysis`), dumping every result object's field shapes per (fixture, test).
- A pre-existing scaffold for this file was **not found** in the repo; the structure below
  follows the three recorded columns + summary table the task specified.
- Audit date: 2026-05-31.

**Shared render frame (applies to every block's column c).** `MiniCardLayout`
(`src/components/shared/CardLayout.jsx:56-111`) renders, top-to-bottom: `footer` (the one-line
result, `:64-68`) → `children` (evidence body) → "How this test works" gated **only** on
`TEST_METHODS[result.name]` existing (`:70-82`) → **Implications** + **What to look for**, both
gated on `isFlagged = result.flag !== "LOW" && result.flag !== "N/A"` (`:60`, `:83`, `:96`). On
a LOW result `isFlagged` is false, so **Implications and What-to-look-for are withheld
automatically** — the inner gating the design pass relies on already holds. Every one of the
28 test names has a `TEST_METHODS` entry, so **"How this test works" renders on every cleared
card.** The verdict pill weight/glyph geometry is out of scope (S196 audit findings, banked).

---

## Summary — test → clearing fixture → tier

Fixtures preferred smallest-clean-first. "tier" is the test's `r.flag` on that fixture.

| # | Test (`r.name`) | Clearing fixture | Rows | Tier |
|---|---|---|---|---|
| 1 | Exact Duplicate Detection | 01-densitometry-clean | 35 | LOW |
| 2 | Constant-Offset Blocks | 01-densitometry-clean | 35 | LOW |
| 3 | Residual Spike Correlation | 01-densitometry-clean | 35 | LOW |
| 4 | Benford's Law (First Digit) | 07-elisa-clean | 65 | LOW |
| 5 | Benford's Law (Second Digit) | 07-elisa-clean | 65 | LOW |
| 6 | Terminal Digit Uniformity | 01-densitometry-clean | 35 | LOW |
| 7 | Decimal Precision Consistency | 01-densitometry-clean | 35 | LOW |
| 8 | Value-Frequency Spike | 03-qpcr-clean | 50 | LOW |
| 9 | Entropy / Zipf Analysis | 01-densitometry-clean | 35 | LOW |
| 10 | Column Goodness-of-Fit | 01-densitometry-clean | 35 | LOW |
| 11 | Modality Test | 17-densitometry-carlisle-clean | 61 | LOW |
| 12 | Inter-Replicate Correlation | 01-densitometry-clean | 35 | LOW |
| 13 | Excess Kurtosis | 01-densitometry-clean | 35 | LOW |
| 14 | Autocorrelation | 01-densitometry-clean | 35 | LOW |
| 15 | Windowed Autocorrelation | 01-densitometry-clean | 35 | LOW |
| 16 | Runs Test | 01-densitometry-clean | 35 | LOW |
| 17 | Noise Scaling With Measurement Size | 03-qpcr-clean | 50 | LOW |
| 18 | Within-Row Variance | 03-qpcr-clean | 50 | LOW |
| 19 | Selective Noise Partitioning | 01-densitometry-clean | 35 | LOW |
| 20 | Regional Noise Homogeneity | 01-densitometry-clean | 35 | LOW |
| 21 | LOESS Residual Analysis | 01-densitometry-clean | 35 | LOW |
| 22 | Row-Mean Runs | 03-qpcr-clean | 50 | LOW |
| 23 | Mahalanobis Row Outlier | 01-densitometry-clean | 35 | LOW |
| 24 | Blocked Mahalanobis | 17-densitometry-carlisle-clean | 61 | LOW |
| 25 | Baseline Balance | 17-densitometry-carlisle-clean | 61 | LOW |
| 26 | Cross-Condition Consistency | 01-densitometry-clean | 35 | LOW |
| 27 | Cross-Condition Rank Correlation | **none** | — | **N/A on 22/22** |
| 28 | Missing Data Pattern | **none** | — | **N/A or HIGH only** |

**Fixture-gap findings (cleared-body path unreachable on current fixtures):**
- **Cross-Condition Rank Correlation** — N/A on all 22 fixtures (needs ≥4 paired condition
  profiles; the gate at `rankCorrelation.js:24-26`/`:46-54` returns N/A first). Never produces
  a LOW card; (a)/(c) below are **source-reads**.
- **Missing Data Pattern** — N/A on 21 fixtures, HIGH on DS15; never LOW. The cleared-body path
  is structurally unreachable on the current suite; (a)/(c) below are **source-reads** assuming
  `flag === "LOW"`.

**Two runtime aliases (not separate tests).** On DS14 (survey/ordinal) the ordinal early-return
path emits two short-named N/A stubs — `"Kurtosis"` (alias of Excess Kurtosis) and
`"Selective Noise"` (alias of Selective Noise Partitioning) — carrying only `{category,
description}`. They are DS14-only N/A artifacts, not members of the 28, and are excluded here.

**Cleared-card render patterns observed (cross-cutting, detail per block):**
- *Evidence body always renders on LOW (data-gated, no flag gate):* Benford ×2, Terminal Digit,
  Decimal Precision, Residual Spike, Column GoF (stat bar), Entropy (stat bar), Modality (stat
  bar), IRC (heatmap), Autocorrelation, Excess Kurtosis (global plot), Runs, Noise Scaling,
  Within-Row Variance (histogram), Row-Mean Runs, LOESS (noise plot), Mahalanobis (D² plot),
  Baseline Balance (histogram + KS caption), Cross-Condition Consistency (full grid table).
- *Primary evidence body flag-gated → withheld on LOW:* Constant-Offset Blocks (bar + table),
  Regional Noise Homogeneity (entire scan strip + table), Selective Noise (per-column table),
  LOESS (region-comparison table), Excess Kurtosis (condition-stratified section), Blocked
  Mahalanobis (position strip), Value-Frequency Spike (table empty on clean LOW).
- *Headline primaryP can be small yet verdict LOW via an effect-size / direction gate* — most
  starkly **Baseline Balance** (DS17 `primaryP=0.000141` but LOW, excess-fraction gate) and
  **Cross-Condition Consistency** (DS01 `primaryP=0.036` but LOW, forensic-direction gate).
  The footer p-badge prints the small p regardless.

---

## 1. Exact Duplicate Detection — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=copied` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="0.00"` · `fisherDF=6` ·
`fisherP="1.0000"` · `worstGroup="Control"` · `nBins=10299` · `nDistinct=140` · `isInteger=false`
· `p1="7.14e-3"` · `p1Source="empirical"` · `expectedPerValue="1.00"` · `primaryP=1` ·
`overRepresentedValues=0` · `collisionObs=0` · `collisionNPairs=9730` · `collisionP="1.0000"` ·
`duplicateRows=0` · `rowDupPValue="1.0000"` · `withinRowMatches=0` · `withinRowExpected="0.1"` ·
`withinRowPairTotal=2310` · `withinRowZ="-0.63"` · `withinRowP="1.0000"` · `bestBlockP="1.0000"`
· `_rawPs=[1,1,1,1]` · `_wrZ=-0.633` · `wrWithinObs=0` · `wrWithinExp="0.1"` · `wrWithinRatio="0.0"`
· `wrCrossObs=0` · `wrCrossExp="0.0"` · `wrCrossRatio="0.0"` · `withinColObs=1` ·
`withinColExp="17.4"` · `withinColRatio="0.1"` · `blockCopies=[] empty` · `overRepresented=[] empty`
· `rowDupGroupList=[] empty` · `withinRowLocs=[] empty` · `groups=[] empty` ·
`details=array[3] of {group,rows,nRowsTested,flag}` (per-group summary) ·
`subDetails=array[1] of {group,type,rows,col,value}`.

**(b) What the test computes.** Headline `primaryP=combinedP=min(bhFDR([collisionP,
rowDupPValueAdj, withinRowP, bestBlockP]))` (`duplicateDetection.js:692-694`, set `:702`). FOUR
distinct sub-signals, each its own p: (1) **value-collision** exact binomial,
`collisionP=binomialSurvival(collisionObs, collisionNPairs, p1)` (`:173`) where `p1` is a
Poisson/NB/HHI collision probability (`:125`/`:130`/`:136`); (2) **identical-row** binomial,
`rowDupPValue=binomialP(max(nRowDups,1), nRowPairs, Π HHI_c)` (`:637`); (3) **within-row
column-pair** coincidences binomial vs a row-binned-frequency null,
`withinRowP=binomialSurvival(withinRowMatchTotal, withinRowPairTotal, pHat)` (`:336`, skipped
for genomics); (4) **block-copies** Π(HHI)^h × Bonferroni, `bestBlockP=min` over blocks
(`:649-682`). Display-only extras: within/cross-group split, within-column control, Z-score
`wrZ`, over-represented values. *(Header comment `:4` "2 signals" is stale — code BH-FDRs four.)*

**(c) Current clean-body render.** Footer built `MiniCard_DuplicateDetection.jsx:55-59`:
`footerParts=[\`${nDataRows} rows · ${nColPairs} column pairs\`]` + conditional block/within-row
parts + `fmtPBadge(primaryP)`. On LOW (no blocks, no within-row) → `"35 rows · N column pairs ·
p=1.0"`. Evidence body = two `EvidenceBlock` sections, both **data-gated not flag-gated**:
"Duplicated blocks of data" `{(structuralBlocks.length>0 || hasRowDups) && …}` (`:149`),
"Duplicate values within a row" `{withinDups.length>0 && …}` (`:266`) — both empty on this LOW,
so **body collapses to footer-only**. No early-return (`:141` always returns `MiniCardLayout`).
How-this-works: **shown** (`TEST_METHODS` `mechanisms.js:171`).

**Design verdict:** _(Chat)_

---

## 2. Constant-Offset Blocks — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=copied` · `offsetType="additive"` · `severityClass="low"` · `consecutiveEqualDiffs=1` ·
`totalConsecutivePairs=2244` · `nRows=35` · `blockRate="0.04%"` · `expectedByChance="1.1"` ·
`expectedRate="0.05%"` · `excessZ="-0.59"` · `permP="1.0000"` · `nPerm=999` · `primaryP=1` ·
`details=array[1] of {pair,positions,diff}` · `addP=1` · `mulP=null` ·
`groups=array[1] of {id,rows,type,testKey,offset,pair}` · `vstTransform="log"`.

**(b) What the test computes.** Headline `primaryP=best.permP`, a **permutation p on the count of
consecutive equal-difference blocks**, `permP=(permExceed+1)/(N_PERM+1)` (`constantOffset.js:231`,
set `:107`); `best` = lower-permP of two passes. **Two passes**: additive (`d=col_i−col_j`, `:33`)
and multiplicative (`d_log=log col_i−log col_j`, `:57`), both surfaced as `addP`/`mulP` (`:110`).
Internal: birthday-problem `pMatch=Σ(freq(d)/n)²` (`:158`), `expectedCount`/`sigma`/diagnostic
`zExcess` (`:159-161`), per-pair BH-FDR `anyPairSig` that can promote LOW→MODERATE (`:234-236`,
`:95`), `severityClass` from block count (`:97-98`).

**(c) Current clean-body render.** Footer `MiniCard_ConstantOffset.jsx:56`:
`\`${mult prefix}${blockEntries.length} block(s) detected · ${expBlocks} expected by chance ·
permutation p = ${fmtP(primaryP)}${nPerm note}\`` → on LOW `"0 blocks detected · 1.1 expected by
chance · permutation p = 1.0000 (999 perms)"`. Evidence body **flag-gated, withheld on LOW**: bar
chart `if (result.flag !== "LOW" && … && isAgg)` (`:30`); block table `hasBlocks = blockEntries.
length>0 && result.flag !== "LOW" && …` (`:44`, rendered `:66`). Body collapses to footer-only on
LOW. No early-return. How-this-works: **shown** (`mechanisms.js:173`).

**Design verdict:** _(Chat)_

---

## 3. Residual Spike Correlation — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=copied` · `nGroups=3` · `nPairs=3` · `nRows=35` · `topK=5` · `nOverlap=0` ·
`bestPair="Control vs Inhibitor_A"` · `expectedOverlap="0.7"` · `permP="1.0000"` · `nPerm=999` ·
`primaryP=1` · `pairDetails=array[3] of {pair,r,rho,n,highCorrelation}` ·
`allProfiles=array[3] of {name,absResid}` · `bestPairIdx=[0,1]` ·
`_groupCols=array[3] of array` · `details=array[0] empty` · `vstTransform="log"`.

**(b) What the test computes.** Headline `primaryP=permP`, a **permutation p on the max pairwise
top-K residual-row overlap** (`residualSpikeCorrelation.js:170`, set `:232`). Pipeline: per-row
normalised mean-abs-residual (`:55`,`:62`) → top-K rows/group (`:83-90`) → pairwise overlap
(`:96-104`) → statistic `maxPairOverlap=max(pairOverlaps)` (`:107`) vs `expected=K²/nR` (`:109`),
row-shuffle null (`:133-168`). **This is the prompt's correlated-residuals case: the headline
"coordinated-noise row count" is one cut.** The test ALSO computes (informational, NOT in
primaryP) per-pair **Spearman ρ** `pairCorrs` via `spearmanPaired`, each tagged
`highCorrelation:|r|>EFFECT_SIZE.RSC_HIGH_RHO` (`:197-203`, surfaced as `pairDetails`), and
per-row coordination scores `overlapRows` (`:174-186`). Runtime cleared `pairDetails` carries
`{r, rho, highCorrelation}` per pair.

**(c) Current clean-body render.** Footer `MiniCard_ResidualSpike.jsx:27`: `\`${nGroups}
conditions · ${overlapN} rows with coordinated noise (${expN} expected) · permutation p =
${fmtP(permPNum)}\`` → on LOW `"3 conditions · 0 rows with coordinated noise (0.7 expected) ·
permutation p = 1.0"`. Evidence body **no gate** — `CoordResidualProfile` plot always renders
(`:31-39`); `isGlobalMode` (`:19`) only toggles the in-plot ρ-matrix, not the plot. Renders on
LOW. No early-return. How-this-works: **shown** (`mechanisms.js:177`).

**Design verdict:** _(Chat)_

---

## 4. Benford's Law (First Digit) — `07-elisa-clean` · LOW

**(a) Retained fields (runtime).**
`category=digits` · `chiSquared="19.409"` · `df=8` · `pChi="0.0128"` · `MAD="0.0251"` ·
`MADConformity="Nonconforming"` · `pMAD="0.0450"` · `primaryP=0.045` · `nSimulations=5000` ·
`simN=195` · `nValues=195` · `details=array[9] of {digit,observed,expected,benfordPct,observedPct}`.
*(Note: cleared but `primaryP=0.045` and `MADConformity="Nonconforming"` — borderline LOW held by
the `mad ≥ 0.015` flag gate not tripping a higher tier.)*

**(b) What the test computes.** Headline `primaryP=pMAD`, a **simulation MAD p-value** (5000 draws
from exact Benford at `simN`, `benford.js:58-69`, set `:90`); flag also requires `mad≥0.015`
(`:83-86`). Distinct co-computed signals: **chi-square** (df=8) accumulated `:31`, `pChi` `:34`;
**MAD** (mean abs deviation from Benford proportions) `:33`; **Nigrini conformity label** `:37-40`;
per-digit observed/expected `details` `:31-32`.

**(c) Current clean-body render.** Footer `MiniCard_Benford.jsx:21-25`: `{nValues} values tested ·
χ²={chiSquared} · df={df}` + flag-gated `" · leading digits off Benford"` + `fmtPBadge(primaryP)`.
The mid clause is suppressed on LOW → `"195 values tested · χ²=19.409 · df=8 · p=0.045"`. Evidence
body **data-gated only** (`if(!details.length) return null;` `:13`) — the digit-frequency
`VBarPlot` **always renders on LOW** (`:31-45`). How-this-works: **shown** (`mechanisms.js:182`).

**Design verdict:** _(Chat)_

---

## 5. Benford's Law (Second Digit) — `07-elisa-clean` · LOW

**(a) Retained fields (runtime).**
`category=digits` · `chiSquared="5.077"` · `df=9` · `pChi="0.8275"` · `MAD="0.0138"` ·
`MADConformity="Nonconforming"` · `pMAD="0.7822"` · `primaryP=0.7822` · `nSimulations=5000` ·
`simN=195` · `nValues=195` · `details=array[10] of {digit,observed,expected,benfordPct,observedPct}`.

**(b) What the test computes.** Same structure as First-Digit on the second significant digit
(10 categories, df=9). Headline `primaryP=pMAD` simulation MAD p (`benford2.js:97-110`, set `:130`);
flag requires `mad≥0.008` (`:120-123`). Co-computed: chi-square `:65`/`pChi` `:78`, MAD `:74-76`,
conformity label `:113-116`, per-digit `details` `:63-71`.

**(c) Current clean-body render.** Shares `MiniCard_Benford.jsx` (`isSecond=name.includes("Second")`
`:14`); branch only changes labels (footer clause `" · second digits off Benford"` `:23`, sub-head
`:31`, axis `:39`). Footer on LOW → `"195 values tested · χ²=5.077 · df=9 · p=0.7822"`. Evidence
body: `VBarPlot` **always renders on LOW** (same `!details.length` gate). How-this-works: **shown**
(`mechanisms.js:184`).

**Design verdict:** _(Chat)_

---

## 6. Terminal Digit Uniformity — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=digits` · `chiSquared="5.571"` · `rawChiSq=5.5714` · `df=8` · `p="0.6951"` ·
`rawPReported=0.6951` · `primaryP=0.6951` · `nValues=420` · `trailingZeroWarning=true` ·
`chi10="52.857"` · `rawChi10=52.857` · `p10="0.0000"` · `rawP10=3.11e-8` ·
`details=array[10] of {digit,observed,expected,pct,isAvoided}`.
*(Note the dual statistic: the reported test is the **9-digit** one — `df=8`, `p=0.6951` — because
`trailingZeroWarning` switched away from the 10-digit `chi10=52.857`, `rawP10=3.11e-8`. The card
clears on the 9-digit p while a large 10-digit chi-square is also retained.)*

**(b) What the test computes.** Per-digit count table `details` (`terminalDigits.js:35`); **10-digit
chi-square** `chi10` (df=9) `:35`, `p10` `:36`; **trailing-zero-suppression detector**
`trailingZeroWarning = counts[0] < zeroExpected*0.40` (`:43`); when set, a **secondary 9-digit
chi-square** (df=8, digit 0 excluded) `:48-51`. Reported statistic switches to the 9-digit when the
warning fires (`reportedP=p9` else `p10`, `:46-59`). Headline `primaryP=rawReportedP` (post-switch)
`:64`; `rawP10` always also returned `:66`.

**(c) Current clean-body render.** Footer `MiniCard_TerminalDigit.jsx:22-27`: `{nVals} values tested
· χ²={chi} · df={df}` + flag-gated `" · last digits not uniform"` + `fmtPBadge(primaryP)` + a
**non-flag-gated** `trailingZeroWarning` span `" · 9-digit test (digit 0 excluded)"`. On LOW →
`"420 values tested · χ²=5.571 · df=8 · p=0.6951 · 9-digit test (digit 0 excluded)"`. Evidence body
**data-gated only** (`if(!details.length) return null;` `:12`) — digit `VBarPlot` **always renders on
LOW** (`:30-44`). How-this-works: **shown** (`mechanisms.js:180`).

**Design verdict:** _(Chat)_

---

## 7. Decimal Precision Consistency — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=digits` · `nDecimalValues=420` · `dominantDecimalPlaces=4` · `dominantFraction="100.0%"`
· `distinctPrecisionLevels=1` · `maxDecimalPlaces=4` · `gapsDetected=0` · `gapAtDp="none"` ·
`primaryP=1` · `interpretation="All values at 4dp — consistent with single fixed-precision…"` ·
`details=array[1] of {decimalPlaces,count,fraction}` · `perLevel=array[0] empty`.

**(b) What the test computes.** Per-precision-level count table `details` (`decimalPrecision.js:47`);
dominant level/fraction/distinct-count `:43-46`; **per-intermediate-level trailing-zero binomial
deficit** test `p=regIncBeta(...)` (`:67`, collected as `perLevel`) → **BH-FDR across levels**
`:77-79`. Headline `primaryP=min(adjPs)` (`:80`); default when no levels tested (this fixture, single
precision) → `primaryP=1.0`, `flag=LOW` (`:72-73`). Gap detection `gapDps`/`gapCount` `:85-89`.

**(c) Current clean-body render.** Footer `MiniCard_DecimalPrecision.jsx:29-33`: `{nDecimalValues}
values · {details.length} precision levels · max {maxDp} dp` + **`hasGap`-gated (not flag-gated)**
`" · precision gaps (mixed-source)"` + `fmtPBadge(primaryP)` (non-null → badge, not the "structural
test" fallback). On LOW → `"420 values · 1 precision levels · max 4 dp · p=1.0"`. Evidence body
**data-gated only** (`if (!details.length) return null;` `:13`) — precision `VBarPlot` **always
renders on LOW** (`:36-43`). How-this-works: **shown** (`mechanisms.js:186`).

**Design verdict:** _(Chat)_

---

## 8. Value-Frequency Spike — `03-qpcr-clean` · LOW

**(a) Retained fields (runtime).**
`category=digit` · `description="Pass 1 (full-value): not applicable…"` · `interpretation="No
anomalous value-frequency spikes detected. 98 entries tested…"` · `nValues=150` · `nDistinct=0` ·
`nTested=98` · `nTestedPass1=0` · `nTestedPass2=98` · `nSpikes=0` · `nSpikesPass1=0` ·
`nSpikesPass2=0` · `pass2SpikeCount=0` · `pass2MultiSpikeCleared=false` · `pass2TierRaw="LOW"` ·
`drivingPass=null` · `keyboardPattern=false` · `smoothingWindow=null` · `bestAdjP="1.000000"` ·
`primaryP=1` · `pass1Status="Not applicable — data is primarily non-integer…"` · `pass2Status=null`
· `pass2Diag={nFrac:150, fracFrac:"100.0%", buckets:array[2] of {length,nCells,nDistinct,halfW,span,
nTested}}` · `_spikeValues=[] empty` · `_spikeCells=[] empty` · `details=array[0] empty`.

**(b) What the test computes.** Two passes, each a **Poisson leave-one-out neighbour scan** over a
value histogram: **Pass 1** full-value (`poissonNeighbourScan`, `valueFrequencySpike.js:63-111`,
invoked `:153`); **Pass 2** fractional-digit substrings bucketed by length (`:162-253`). **Union
BH-FDR** across both passes' tested entries `:288-291`. Per-pass spike sets (`adjP<ALPHA.NOTE &&
ratio≥2`) `:294-296`; pass-2 multi-spike gate `pass2MultiSpikeCleared=pass2SpikeCount>=2` `:311-316`;
final `flag`=max-rank of pass tiers. Headline `primaryP=min(pass1BestP, pass2MultiSpikeCleared ?
pass2BestP : 1)` (`:443`). Also: keyboard/numpad-diagonal detector `keyboardPattern` `:320-326`;
`bestSpikeP` un-gated min-adjP `:300`. *(On qpcr the data is non-integer → Pass 1 N/A; Pass 2 runs
on 98 fractional substrings, no spikes.)*

**(c) Current clean-body render.** Footer `footerText` `MiniCard_ValueFrequency.jsx:58-60` branches on
`nSpikes===0` (not flag): `<>{nValues} values screened · no values over-represented · {fmtPBadge
(primaryP)}</>` → `"150 values screened · no values over-represented · p=1.0"`. Evidence body:
over-represented-values `EvidenceTable` gated `{details.length>0 && …}` (`:77`) — **empty on clean
LOW → not rendered**; keyboard `CardBanner` gated on `keyboardPattern` (`:78`, false). **Body
collapses to footer-only.** No early-return (renders `MiniCardLayout` unconditionally). How-this-works:
**shown** (`mechanisms.js:188`).

**Design verdict:** _(Chat)_

---

## 9. Entropy / Zipf Analysis — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=shapes` · `primaryP=1` · `nTested=12` · `nFlagged=0` · `nLow=0` · `nHigh=0` ·
`fewColumnsNote=null` · `colRatios=array[12] of {col,ratio,direction,flagged}` ·
`details=array[0] empty`.

**(b) What the test computes.** Per-column **Shannon entropy H** of the value-frequency distribution
(`entropyTest.js:56`, helper `:188-202`), vs a **parametric bootstrap null** (B=999, fits
Normal/Poisson/NB, `:64-91`); two-sided `rawP=min(1, min(pLow,pHigh)*2)` `:102`; `direction` low/high
`:101`; effect-size `ratio=hObs/hMedian` `:107`. **BH-FDR across columns** → headline
`primaryP=min(adjPs)` `:137`. Per-column ratio table `colRatios`/`details` `:109-167`; effect-size gate
`RATIO_GATE=0.15` `:130-135`. `details` carries only flagged columns (`flag!=="LOW"` filter `:149`) →
empty on LOW.

**(c) Current clean-body render.** Footer `MiniCard_Entropy.jsx:44-49`: `{nTested} columns tested · 0
flagged (0 low, 0 high) · {fmtPBadge(primaryP)}` → `"12 columns tested · 0 flagged (0 low, 0 high) ·
p=1.0"`. Evidence body: `ColumnStatBar` **data-gated not flag-gated** `{barItems.length>0 && …}` (`:53`,
`barItems`=all tested columns) → **the entropy-ratio bar renders on LOW**; flagged-columns table gated
on `details.length` (`:60`/`:77`) → empty on LOW → not rendered. No early-return. How-this-works:
**shown** (`mechanisms.js:215`).

**Design verdict:** _(Chat)_

---

## 10. Column Goodness-of-Fit — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=shapes` · `primaryP=0.648` · `nTested=12` · `nSkipped=0` · `nFlagged=0` · `nHigh=0` ·
`nLow=0` · `fewColumnsNote=null` · `colRatios=array[12] of {col,ratio,direction,flagged}` ·
`details=array[0] empty` · `skippedColumns=array[0] empty`.

**(b) What the test computes.** Per-column **Anderson–Darling A²** against a moment-matched fitted
family (Normal/Poisson/NB) (`columnGof.js:125`), vs a **parametric bootstrap-with-refit null** (B=999,
`:136-164`); two-sided `rawP=min(1, min(pLow,pHigh)*2)` `:176`; `direction` high/low `:175`; effect
ratio `A2_obs/A2_median` `:181`. **BH-FDR across columns** → headline `primaryP=min(adjPs)` `:212`.
Per-column table `details`/`colRatios` `:183-236`; effect-size gate `:206-210`; skipped columns
(γ pre-skip / <30 obs / <10 distinct) `skippedColumns` `:252`. `details` filtered to `flag!=="LOW"`
(`:220`) → empty on LOW.

**(c) Current clean-body render.** Footer `MiniCard_ColumnGoF.jsx:80-85`: `{nTested} columns tested · 0
flagged (0 mismatch, 0 too-tight) · {fmtPBadge(primaryP)}` → `"12 columns tested · 0 flagged (0
mismatch, 0 too-tight) · p=0.648"`. Evidence body: `ColumnStatBar` **data-gated not flag-gated**
`{(barItems.length>0 || skippedItems.length>0) && …}` (`:89`, receives `cardFlag` but gate is data) →
**A²-ratio bar renders on LOW**; flagged-columns table gated on `details`/`sub` length (`:97`/`:118`) →
empty on LOW. No early-return. How-this-works: **shown** (`mechanisms.js:217`).

**Design verdict:** _(Chat)_

---

## 11. Modality Test — `17-densitometry-carlisle-clean` · LOW

**(a) Retained fields (runtime).**
`category=shapes` · `primaryP=1` · `nTested=18` · `nSkipped=0` · `nFlagged=0` · `fewColumnsNote=null`
· `colDips=array[18] of {col,dip,flagged}` · `details=array[0] empty` · `skippedColumns=array[0] empty`.

**(b) What the test computes.** Per-column **Hartigan's dip statistic D** (GCM/LCM hull,
`modality.js:304-329`), analytical p from the tabulated Hartigan uniform-reference null
(`dipPValue`, `:105-164`, floored at `P_FLOOR=0.001`); per column `D_obs`/`rawP` `:216-220`.
**BH-FDR across columns** → headline `primaryP=min(adjPs)` `:246`. Per-column dip table
`colDips`/`details` `:222-263`; effect-size gate `DIP_GATE=0.04` `:242-243`; γ₂ pre-skip / <50 obs /
<15 distinct → `skippedColumns` `:278`. `details` filtered to flagged (`:251`) → empty on LOW.

**(c) Current clean-body render.** Footer `MiniCard_Modality.jsx:57-63`: `{nTested} columns tested · 0
flagged` + `nFlagged>0`-gated "multi-modal" clause (withheld) + `{fmtPBadge(primaryP)}` → `"18 columns
tested · 0 flagged · p=1.0"`. Evidence body: `ColumnStatBar` **data-gated not flag-gated**
`{(barItems.length>0 || skippedItems.length>0) && …}` (`:67`, `barItems=colDips`, `refValue=DIP_GATE`)
→ **dip-statistic bar renders on LOW**; flagged-columns table gated on length (`:75`/`:92`) → empty on
LOW. No early-return. How-this-works: **shown** (`mechanisms.js:219`).

**Design verdict:** _(Chat)_

---

## 12. Inter-Replicate Correlation — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `nPairs=18` · `nConditions=3` · `meanR="0.7100"` · `nRows=35` ·
`iccPredicted="0.7087"` · `highSNRWarning=false` · `nSuspicious=0` · `windowScanP=0.948` ·
`windowSigCount=0` · `nWindowsTested=70` · `subunitsSuppressed=array[0] empty` ·
`primaryP=0.4207` · `interpretation="Within-condition inter-replicate correlations (mean r=0.710)…"`
· `details=array[18] of {condition,pair,matCol1,matCol2,r,rawR,iccExpected,excess,rawExcess,p,rawP,n,
highSNR,rawLooICC,zObs,zNull,se,zStat,adjP,suspicious}`.

**(b) What the test computes.** Per-pair **winsorized Pearson r** (`interReplicateCorrelation.js:92`)
vs an **ICC-predicted r** per condition (`iccFromMatrix`, `:65`/`:79`); **leave-one-out ICC null**
per pair (`:104`), **excess** r−LOO-ICC `:106`, per-pair **Fisher-z stat/p** `:115-116`, **BH-FDR
across pairs** `:142`. Plus a **windowed-ICC permutation scan** (max windowed r-excess vs row-shuffle
null, `scanP` `:258`; suppressed under arbitrary row-semantics `:172`). Headline
`primaryP=min(globalBestP, scanP)` (`:310-311`, set `:321`). Pooled `meanR` `:269`, `meanICC` `:275`,
`nSuspicious` `:270`.

**(c) Current clean-body render.** Footer `MiniCard_InterReplicateCorrelation.jsx:139-146`: `{n} column
pairs tested · mean r = {meanR}` + `icc!=null` ICC clause + `nSusp>0` (withheld) + `findingClause`
(empty) + scan/plain `fmtPBadge(primaryP)` → `"18 column pairs tested · mean r = 0.7100 · ICC-predicted
0.71 · p=0.42"`. Evidence body **no flag gate** — pairwise Pearson-r **heatmap + legend always render**
(`:156-179`); windowed-rows table data-gated `{topWins.length>0}` (`:180`, empty on LOW); a "No localised
row ranges" line is gated `{topWins.length===0 && result.flag!=="LOW"}` (`:193`) → **withheld on LOW**.
Early-return `if(!rVals.length) return null;` (`:27`, not hit on LOW). How-this-works: **shown**
(`mechanisms.js:175`).

**Design verdict:** _(Chat)_

---

## 13. Excess Kurtosis — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="0.00"` · `fisherDF=6` ·
`fisherP="1.0000"` · `worstGroup="Control"` · `adNote=null` · `nSignificant=0` · `nPlatykurtic=0` ·
`nPairs=6` · `pooledKurtosis=0.6230` · `simKurtosis=-0.9615` · `kurtDeviation="0.7549"` ·
`nSimulations=1999` · `kurtosisP="0.0620"` · `_kurtosisP="0.0620"` · `_andersonDarlingP="0.1365"` ·
`pooledN=132` · `pooledP="0.0620"` · `primaryP=0.062` · `adaptiveThreshold="0.8357"` ·
`esGateMode="directional (leptokurtic, informational)"` · `normDiffs=array[552] scalar` ·
`simDiffs=array[552] scalar` · `condKurtosis=array[3] of {condition,n,nDiffs,kurtosis,kurtDeviation,p,
rawP,platykurtic,normDiffs}` · `isPromoted=false` · `details=array[3] of {group,rows,nRowsTested,flag,
sigPairs,ofPairs,platykurtic}` · `subDetails=array[18] of {group,pair,kurtosis,z,p,interpretation,rawP,
pAdj,significant}` · `vstTransform="log"`.

**(b) What the test computes.** Per-pair excess kurtosis on z-normalised diffs (`kurtosis.js:117`,
BH-FDR `:123`); **pooled kurtosis** (trimmed if nR≥200) `:131`; **observed Anderson–Darling A²** vs
N(0,√2) `:151`; **simulation null** (N_SIM=1999) producing both pooled κ and A² with pilot early-skip
`:294-316`; **kurtosis sim p** `:338` and **AD sim p** `:350`; **adaptive selection** `pooledP = nC≤3 ?
adP : kurtP` `:358`; **adaptive directional gate** (`adaptiveThreshold`, `directionalSuppress`,
`effectSizeSuppress` → `esGate`) `:370-374` (sets LOW when gated); **condition-stratified kurtosis**
`condKurtosis` `:392-465`; `kurtDeviation=pooled−sim` `:321`. Headline `primaryP=pooledP` (min'd with a
promoting condition p if MODERATE) `:484-486`. *(Here `esGateMode="directional…informational"` → flag
LOW even though `pooledP=0.062`.)*

**(c) Current clean-body render.** Footer `MiniCard_Kurtosis.jsx:39-45`: `{nPairs} replicate pairs
tested` + platy/lepto label (driven by `kDev` sign, not flag) + `κDev` + p + `adNote`. **Note**
`pooledP` is returned as a **string** (`:484`), so the `typeof==='number'` branch is false → footer
prints literal `p = {pooledP}`. On LOW → `"6 replicate pairs tested · too peaked (leptokurtic) · κDev =
0.75 · p = 0.0620"`. Evidence body **no flag gate** — global noise-shape `KurtosisDistPlot` always
renders when `normDiffs` present (`:52`); the **condition-stratified section IS flag-gated**
`{condK?.length>=2 && (isAgg || flag==="HIGH" || condK.some(verdict!=="clear")) && …}` (`:73`) →
withheld on LOW. No early-return. How-this-works: **shown** (`mechanisms.js:206`).

**Design verdict:** _(Chat)_

---

## 14. Autocorrelation — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="3.85"` · `fisherDF=6` ·
`fisherP="0.6968"` · `worstGroup="Control"` · `nSignificant=0` · `nPairs=6` · `pooledMeanR1="0.0332"` ·
`pooledT="0.622"` · `pooledP="0.5615"` · `primaryP=0.5615` · `effectSizeClass="weak"` ·
`pooledR1SD=0.1309` · `pooledR1SE=0.0534` · `pooledR1CI95=[-0.0715, 0.1380]` ·
`lagTable=array[5] of {lag,pooledR,p,adjP,rawP,rawAdjP,pairsSig,pairsTotal,isPromotionTrigger}` ·
`higherLagPromoted=false` · `higherLagWasDecisive=false` · `decayCurve=array[10] scalar` ·
`details=array[3] of {group,rows,nRowsTested,flag,sigPairs,ofPairs,platykurtic}` ·
`subDetails=array[18] of {group,pair,lag1,z,p,rawP,significant}` ·
`perGroupDecay=array[3] of {group,curve}` ·
`condAutocorr=array[3] of {condition,meanR1,pooledT,p,rawP,nPairs,flag}` · `vstTransform="log"`.

**(b) What the test computes.** Per-pair lag-1 r + full ACF to MAX_LAG=10 (`autocorrelation.js:37`,
per-pair z/p `:40`); **pooled lag-1 mean + one-sample t** (H0 mean r1=0) `:54-55`, 95% CI `:62-64`;
**BH-FDR across pairs** `:47`; effect-size class + large-N gate `:72-74`; **decay curve** (mean ACF per
lag) `:50`; **higher-lag (2–5) sub-unit evidence** — pooled t per lag `:101-109`, BH-FDR across 5 pooled
p `:110`, per-pair-per-lag corroboration BH-FDR `:125`, 5-row `lagTable` `:148-158`. Headline
`primaryP=min(pooled.p, any pair-adjP<ALPHA.FLAG)` `:165`. Also per-condition `condAutocorr`.

**(c) Current clean-body render.** Footer `MiniCard_Autocorrelation.jsx:69-72`: `{nPairs} pairs tested`
+ direction (from `meanR1` sign, not flag) + `mean |r|` + p → `"6 pairs tested · positive
autocorrelation · mean |r| = 0.033 · p = 0.56"`. Evidence body **no flag gate** — decay/dot chart
renders whenever `mainChart` truthy (`:80`, built from `decayCurve`/`perGroupDecay`); 5-lag pooled table
data-gated `{result.lagTable?.length>0}` (`:106`), its LOW `footerText` = "Lag 1 is the primary
statistic; lags 2–5 are sub-unit evidence…" (`:127`). No early-return. How-this-works: **shown**
(`mechanisms.js:202`).

**Design verdict:** _(Chat)_

---

## 15. Windowed Autocorrelation — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="0.00"` · `fisherDF=6` ·
`fisherP="1.0000"` · `worstGroup="Control"` · `primaryP=0.125` · `nWindowsTotal=30` · `nPairs=6` ·
`nSig05=0` · `nSig01=0` · `nPerm=999` · `windowSize=15` · `stride=5` ·
`details=array[3] of {group,rows,nRowsTested,flag}` ·
`subDetails=array[90] of {group,source,pair,startRow,endRow,rows,r,rawP,adjP,significant}` ·
`vstTransform="log"`.

**(b) What the test computes.** Per-window lag-1 r (WIN=15, STRIDE=5) on each replicate-pair difference
series (`windowedAutocorrelation.js:94-96`, via `lagOneR` `:29-34`); **within-pair row-shuffle
permutation null** with rank-accumulator `:112`; per-window two-sided smoothed `rawP=(exceed+1)/(N_PERM+1)`
`:118`; **per-pair-scoped BH-FDR** (not full grid) `:152-155`; significant-unit counts `nSig05`/`nSig01`
`:163-164`. Headline `primaryP=min(per-pair adjP across windows)` `:158-159`. *(90 window sub-units
retained even when none significant.)*

**(c) Current clean-body render.** Footer `MiniCard_WindowedAutocorr.jsx:86-87`: `{nPairs} pairs · {N}
windows (size 15, stride 5) · B={nPerm}` + flag-gated `" · localised serial structure"` (withheld) +
`{fmtPBadge(primaryP)}` → `"6 pairs · 30 windows (size 15, stride 5) · B=999 · p=0.125"`. Evidence body
**data-gated**: strip gated on `sig=details.filter(significant)` (`:36-37`) → empty on LOW → not
rendered; table gated on `tableSource.length` (`:64`) → **renders on LOW** with `footerText="All windows
are consistent with independent noise in each pair (BH-FDR at α = 0.05)."` (`:79-80`). No early-return.
How-this-works: **shown** (`mechanisms.js:204`).

**Design verdict:** _(Chat)_

---

## 16. Runs Test — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="9.77"` · `fisherDF=6` ·
`fisherP="0.1348"` · `worstGroup="Control"` · `nRows=35` · `nSignificant=0` · `nPairs=6` ·
`pooledMeanZ="-0.445"` · `pooledT="-1.005"` · `pooledP="0.3609"` · `primaryP=0.248` ·
`pooledZSD=1.0848` · `pooledZSE=0.4429` · `pooledZCI95=[-1.3133, 0.4228]` · `obsOverExp=0.9311` ·
`windowScanP=0.248` · `windowSigCount=0` · `nWindowsTested=30` · `firstPairSigns=array[35] scalar` ·
`firstPairPos=array[35] scalar` · `firstPairRuns=13` · `firstPairExp=18` · `firstPairCol1=1` ·
`firstPairCol2=3` · `worstPairLabel="R2−R4"` · `mostExtremePair="R2−R4: 13 runs (exp: 18, z=-1.9)"` ·
`matchedSimSigns=array[35] scalar` · `matchedSimRuns=18` · `pairSignSeqs=array[0] empty` ·
`allPairStats=array[6] of {pair,col1,col2,runs,expected,z,p,significant}` ·
`details=array[3] of {group,rows,nRowsTested,flag,sigPairs,ofPairs,platykurtic}` ·
`subDetails=array[18] of {group,pair,col1,col2,signs,pos,runs,expected,z,p,interpretation,rawP,significant}`
· `condRuns=array[3] of {condition,meanZ,nPairs,rawP,flag,mostExtreme}` ·
`groupSignSeqs=array[3] of {group,signs,runs,expected,label}` · `vstTransform="log"`.

**(b) What the test computes.** Per-pair **Wald–Wolfowitz runs z** on diff signs (`runs.js:42-48`);
**BH-FDR across pairs** `:69`; **pooled one-sample t on per-pair z** (H0 mean-z=0) `:72-73`, 95% CI
`:80-82`; **windowed permutation scan** (WIN=15, full matrix + per-condition) `scanP` `:219`;
effect-size gate (runsRatio>0.70) `:189-191`; sub-unit BH-FDR promotion (windows+pairs, MOD-capped)
`:231-237`; matched simulated permutation for strips `:249-274`. Headline `primaryP=min(pooled.p, scanP,
bestPairP, bestWindowP)` `:247`. Also per-condition `condRuns`, per-pair sign sequences.

**(c) Current clean-body render.** Footer `MiniCard_Runs.jsx:159-169` (single-matrix branch): `{nPairs}
pairs · too few/too many runs` (from `pooledMeanZ` sign) `· mean z = {z} · best {fmtPBadge(primaryP)}`
→ `"6 pairs · too few runs · mean z = -0.45 · best p=0.248"`. Evidence body **no flag gate (data-gated)**:
pooled mean-z verdict marker `{Number.isFinite(pooledMeanZ) && Array.isArray(pooledZCI95)}` (`:183`,
renders); sign strips — `pairSignSeqs` empty on LOW so fallback single-pair strip `firstPairSigns`
renders (`:191`/`:205`); evidence table `{etRows.length>0}` (`:222`, `allPairStats`=all 6 pairs) →
**full table renders on LOW**. No early-return. How-this-works: **shown** (`mechanisms.js:208`;
Runs is `POOLED_BY_DESIGN` `:303-305`).

**Design verdict:** _(Chat)_

---

## 17. Noise Scaling With Measurement Size — `03-qpcr-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `observedSlope="-0.040"` · `slopeSE="0.6530"` · `regressionSE="0.6530"` ·
`blockRobust=false` · `expectedSlope="0"` · `assay="qpcr"` · `nPoints=50` · `logCentroid=[1.3731,
-1.0464]` · `logPoints=array[50] of {lm,lv}` · `primaryP=0.9513` · `interpretation="Expected log-log
slope ≈ 0 for qpcr…"`.

**(b) What the test computes.** Headline = **log-log OLS slope of variance vs mean** vs an
assay-expected slope (z-test). Slope `meanVariance.js:38-40`; **regression SE** `:42-47`;
**block-robust SE via Cochran's Q heterogeneity test** (per-block slopes, weighted mean, Q, χ² p)
`:90-101`, `slopeSE=blockRobust?blockSE:regressionSE` `:104`. Two flag paths: with expected slope
`primaryP=pSlope=zToP((slope−expSlope)/slopeSE)` `:107-111`; general/no-expected
`primaryP=pNearest` (distance to nearest of {0,2}) `:114-118`.

**(c) Current clean-body render.** Footer `MiniCard_NoiseScaling.jsx:22`: `{nPoints} column pairs · slope
{obs} (expected {expectedSlope})` + `slopeClause` (`:14-18`: "noise grows with signal" / "noise flatter
than expected" / "") + `fmtPBadge(primaryP)` → `"50 column pairs · slope -0.04 (expected 0) · noise
flatter than expected · p=0.95"`. Evidence body **no gate** — `PlotLayout` mean/variance scatter +
caption **always render** (`:26-36`). Early-return only on missing data `if(!logPoints.length) return
null;` (`:9`, not hit on LOW). How-this-works: **shown** (`mechanisms.js:210`).

**Design verdict:** _(Chat)_

---

## 18. Within-Row Variance — `03-qpcr-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `primaryP=1` · `nOutliers=0` · `nValid=50` · `outlierFrac="0.00%"` ·
`expectedOutliers="0.0"` · `globalP="1.000000"` · `windowScanP="1.000000"` · `windowSigCount=0` ·
`nWindowsTested=8` · `subunitsSuppressed=array[0] empty` · `flaggedRows=array[0] empty` ·
`flaggedRowIndices=array[0] empty` · `zScores=array[50] scalar` · `details=array[0] empty`.

**(b) What the test computes.** Per-row z = `(row.sd − expectedSD)/scale` vs a binned-local
mean-variance fit (`withinRowVariance.js:85-87`, `Z_THRESH=4.0` `:73`). **Global binomial** on smooth
outliers `globalP=_binomialUpperTail(nSmooth, nValid, SMOOTH_RATE≈3.17e-5)` `:113-114`; **windowed scan**
(WIN=15, STRIDE=5) BH-FDR `windowScanP` `:122-134` (suppressed under arbitrary row-semantics `:121`).
Flag = more-severe of the two `:138-141`; effect-size gate demotes to LOW if `nSmooth<3 || smoothFrac<
0.01` `:146-148`. Headline `primaryP=min(globalP, windowScanP)` `:142`.

**(c) Current clean-body render.** Footer `MiniCard_WithinRowVariance.jsx:77-81`: `{nValid} rows tested ·
{nOut} outliers ({nSmooth} smooth, {nNoisy} noisy) · expected {expectedOutliers} · global p {fmtPOp
(globalP)}` + `windowSigCount>0` clause (withheld) → `"50 rows tested · 0 outliers (0 smooth, 0 noisy) ·
expected 0.0 · global p 1.0"`. Evidence body: z-score histogram **data-gated not flag-gated**
`if (zScores.length>10)` (`:25`, renders `:85`) → **renders on LOW**; outlier table `{rows.length>0}`
(`:95`, empty on LOW). No early-return. How-this-works: **shown** (`mechanisms.js:213`).

**Design verdict:** _(Chat)_

---

## 19. Selective Noise Partitioning — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="8.80"` · `fisherDF=6` ·
`fisherP="0.1851"` · `worstGroup="Control"` · `primaryP=0.02733` · `nRows=35` ·
`maxMinVarianceRatio="2.736"` · `bartlettChi="9.153"` · `df=3` · `pBartlett="0.0273"` ·
`colDetails=array[4] of {col,residualStd,n}` ·
`perColumnResults=array[4] of {col,residualStd,varRatio,direction,rawP,adjP,flagged}` ·
`details=array[3] of {group,rows,nRowsTested,flag,varRatio}` · `subDetails=array[0] empty` ·
`vstTransform="log"`.
*(Note: `primaryP=0.02733` < 0.05 yet flag LOW — the per-condition stratified BH-FDR / effect-size gating
holds it at LOW despite the sub-0.05 pooled Bartlett p.)*

**(b) What the test computes.** Headline = **Bartlett χ² p for homogeneity of column residual
variances** `pBartlett` (`selectiveNoise.js:63-90`) + max/min variance `ratio` `:75`. Also: **per-column
one-vs-rest Levene F-tests with BH-FDR** (`:96-141`, per-col `varRatio`/`direction`/`adjP`/`flagged`,
display-only "does not affect flag" `:196`/`:231`); **per-condition stratification** (row-grouped) runs
Bartlett per slice, BH-FDR across conditions `minAdjP` `:189-191`; effect-size gate `N≥500 && ratio<3.0`
`:228`. Headline `primaryP=b.pBartlett` (single-run `:235`) or `minAdjP` (stratified `:200`).

**(c) Current clean-body render.** Footer `MiniCard_SelectiveNoise.jsx:66`: `{cds.length} columns ·
variance ratio {ratio}×{outlierClause} · Bartlett χ²={bartlettChi} · df={df} · {fmtPBadge(primaryP)}`.
On LOW `flaggedNames` empty → `outlierClause` falls to the **legacy heuristic** (`:44-58`) which still
names a noisier/quieter column when `cds.length>=2` → `"4 columns · variance ratio 2.7× (… ) · Bartlett
χ²=9.153 · df=3 · p=0.027"`. Evidence body: `NoiseSpreadPlot` **no flag gate** `{result.colDetails?.length}`
(`:86`) → renders on LOW; per-column variance-test table **flag-gated** `{perCol.length>0 && result.flag
!=="LOW" && …}` (`:103`) → **withheld on LOW**. Early-return `return pivotBanner` only when neither agg
nor `colDetails` (`:132`, not hit). How-this-works: **shown** (`mechanisms.js:191`).

**Design verdict:** _(Chat)_

---

## 20. Regional Noise Homogeneity — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="2.44"` · `fisherDF=6` ·
`fisherP="0.8751"` · `worstGroup="Control"` · `nWindows=5` · `scanStat="2.18"` · `scanP=0.378` ·
`nPerm=4999` · `nRows=35` · `bestWindowRows="16–30"` · `bestVarRatio="2.18×"` · `bestSDRatio=1.4768` ·
`bestAnomCol=3` · `usedPredictedSigma=true` · `primaryP=0.378` ·
`details=array[3] of {group,rows,nRowsTested,flag}` ·
`subDetails=array[15] of {group,rows,ratio,anomCol,direction,windowSD,globalSD,sdRatio}` ·
`condRegionalNoise=array[3] of {condition,bestRows,bestRatio,bestCol,rawP,flag}` · `vstTransform="log"`.

**(b) What the test computes.** Headline = **permutation p of a windowed column-vs-global variance-ratio
scan-max** (`regionalNoise.js:113-131`, `scanP=(exceed+1)/(N_PERM+1)` `:165`, `N_PERM=4999` for ≤100
rows `:140`); set `primaryP=scanP` `:223`. Also: **per-column permutation p + BH-FDR promotion**
LOW→MODERATE `:167-180`; effect-size gate `nR≥500 && bestRatio<2.0` `:177`; standardised residuals via
`fitPredictedSigma` `:33`. Per-condition results consumed by the card as `condRegionalNoise`.

**(c) Current clean-body render.** Footer `MiniCard_RegionalNoise.jsx:61`: `{nWindows} windows scanned ·
worst: {bestColName} rows {bestRows} ({direction}, SD ratio {bestSDRatio}) · scan {fmtPBadge(primaryP)}`
→ on LOW still names the worst window: `"5 windows scanned · worst: <col> rows 16–30 (anomalous, SD ratio
1.48×) · scan p=0.378"`. Evidence body: **entire scan strip + "Anomalous windows" table flag-gated**
`{result.flag !== "LOW" && result.flag !== "N/A" && (…)}` (`:65`) → **withheld on LOW**; `ConditionTable`
(`:115`) is outside the gate (renders if `condRegionalNoise` present). No early-return. How-this-works:
**shown** (`mechanisms.js:197`).

**Design verdict:** _(Chat)_

---

## 21. LOESS Residual Analysis — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="5.66"` · `fisherDF=6` ·
`fisherP="0.4619"` · `worstGroup="Control"` · `nWindows=9` · `scanStat="2.40"` · `scanP=0.6802` ·
`cusumP=0.519` · `changepointRow=18` · `changepointDirection="decreases"` · `nPerm=4999` ·
`bestWindowRows="16–26"` · `bestVarRatio="2.40×"` · `bestDirection="smoother"` · `loessSpan="0.300"` ·
`globalResidVar="0.003156"` · `nValidRows=35` · `noiseProfile=array[35] of {row,noise,fit}` ·
`primaryP=0.519` · `pairResults=array[6] of {pair,scanP,cusumP,combinedP,nRows,adjP}` ·
`pairPromoted=false` · `details=array[3] of {group,rows,nRowsTested,flag}` ·
`subDetails=array[9] of {group,type,rows,ratio,direction,winVar}` ·
`condRegionalNoise=array[3] of {condition,bestRows,bestRatio,bestCol,rawP,flag}` · `vstTransform="log"`.

**(b) What the test computes.** On per-row mean-abs inter-replicate difference, LOESS-smoothed
(`loessResidual.js:59`), residuals `:62`: **windowed residual-variance scan** `scanP` `:202`; **CUSUM
changepoint** on raw noise `cusumP` `:203`, changepoint row/direction `:114-115`; **binary-segmentation
secondary changepoint** with per-segment null `:117-164`; **combined** `combinedP=min(scanP,cusumP)`
`:213`; effect-size gate `nR≥500 && bestRatio<2.0` `:208`; **per-pair LOESS decomposition + BH-FDR
promotion** `pairResults` `:344-431`, `pairBestAdjP=min` `:439`; region comparison vs predicted sigma
`:281-338`. Headline `primaryP=min(combinedP, pairBestAdjP)` `:440` (set `:458`).

**(c) Current clean-body render.** Footer `MiniCard_LOESS.jsx:30-38`: `{nValidRows} rows · {nWindows}
windows scanned` + `bestDirection` clause + `hasCP` changepoint clause + direction-after + secondary
changepoint clauses + `" · scan " + fmtPBadge(primaryP)`. `hasCP` (`:17`) typically true on LOW (engine
still emits `changepointRow`/`cusumP`) → footer shows the changepoint even on LOW: `"35 rows · 9 windows
scanned · best window: smoother · changepoint between rows 17 and 18 · decreases after · scan p=0.519"`.
Evidence body: `NoiseProfilePlot` **no flag gate** `{result.noiseProfile?.length>0}` (`:42`) → renders on
LOW (draws CP marker); region-comparison table **flag-gated** `{regions.length>0 && result.flag!=="LOW"
&& …}` (`:56`) → **withheld on LOW**. No early-return. How-this-works: **shown** (`mechanisms.js:193`).

**Design verdict:** _(Chat)_

---

## 22. Row-Mean Runs — `03-qpcr-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `nRows=50` · `primaryP=0.5447` · `globalP="0.5447"` · `bestSequence="Cond: KO"` ·
`bestRuns=12` · `bestExpected=13` · `bestZ="-0.606"` · `nSequences=2` · `windowSigCount=0` ·
`nWindowsTested=6` · `windowBestP="0.4297"` · `bestRowMeans=array[25] scalar` ·
`bestRowIdxs=array[25] scalar` · `bestGrandMean=24.8857` · `bestSimMeans=array[25] scalar` ·
`firstPairSigns=array[25] scalar` · `firstPairRuns=12` · `firstPairExp=13` ·
`worstPairLabel="Cond: KO (12 runs, exp: 13)"` · `details=array[2] of {sequence,runs,expected,z,p,n,rowIdxs}`.

**(b) What the test computes.** Headline = **best (min) two-sided Wald–Wolfowitz runs p across
per-condition detrended row-mean sequences**. Per condition: row means → `linearDetrend` OLS residuals
(`rowMeanRuns.js:41-55`) → `wwRuns` z/p `:57-74`; N/A without row-level condition labels `:29-31`.
**Global best-p** across conditions `globalBestP=min(seq.p)` `:97-98`; **windowed runs scan** (WIN=15)
with BH-FDR, MOD-capped promotion `:100-147`; matched simulated permutation for the strip `:155-181`.
Headline `primaryP=globalBestP` `:188` — *note primaryP is the global p only; the windowed scan affects
`flag` but not `primaryP`.*

**(c) Current clean-body render.** Footer `MiniCard_RowMean.jsx:60-64`: `{firstPairSigns.length} rows ·
{firstPairRuns-1} crossings (expected {firstPairExp-1})` + `bestWindowRows` clause + `fmtPBadge(primaryP)`.
The engine does **not** emit `bestWindowRows` (dead path, noted `:28-29`) so that clause is suppressed →
`"25 rows · 11 crossings (expected 12) · p=0.5447"`. Evidence body **no flag gate** — trend plot renders
when `mainPlot` non-null (`{mainPlot && <PlotLayout>…}` `:69-70`, requires `bestRowMeans.length>0 &&
bestGrandMean!=null`) → renders on LOW; condition sub-heading gated `{bestLabel && isAgg}` (not flag). No
early-return. How-this-works: **shown** (`mechanisms.js:195`).

**Design verdict:** _(Chat)_

---

## 23. Mahalanobis Row Outlier — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `groupsAssessed=3` · `groupsFlagged=0` · `fisherChi="0.00"` · `fisherDF=6` ·
`fisherP="1.0000"` · `worstGroup="Control"` · `plateNote=null` · `logNote=null` · `nRows=35` ·
`nCols=4` · `nOutliers=0` · `nExceedP01=1` · `expectedExceedP01="0.4"` · `exceedFrac="2.9%"` ·
`outlierFraction="0.00%"` · `plotD2=array[35] scalar` · `plotD2Rows=array[35] scalar` ·
`plotThreshold=13.3057` · `outlierThreshold=null` · `binomZ="1.10"` · `binomP="0.134746"` ·
`primaryP=0.1347` · `internalLogApplied=false` · `flaggedRowIndices=array[0] empty` ·
`details=array[3] of {group,rows,nRowsTested,flag}` · `subDetails=array[0] empty` · `vstTransform="log"`.

**(b) What the test computes.** Per-row **Mahalanobis D²** vs centroid (`mahalanobis.js:94-104`),
per-row p from **χ²(nC)** `:108-111`. **Stage 1 — dataset-level binomial** on raw-p<0.01 exceedance count
`nExceed`/`binomP` `:138-145`. **Stage 2 — per-row BH-FDR at α=0.001** identifying surviving outlier rows,
survivor count `nOut` `:151-163`. Headline `primaryP=binomP` (the **dataset-level binomial**, NOT the
per-row survivor count) `:219`. Flag gate combines both cuts: `if (nOut===0) flag="LOW"` else exceedFrac
gate then binomP tiers `:168-174`. *(Here the test-name promises per-row outliers but `nOut=0` → LOW;
`nExceedP01=1` raw exceedance retained but doesn't survive BH-FDR.)*

**(c) Current clean-body render.** Footer `MiniCard_Mahalanobis.jsx:50`: `{totalRows} rows tested ·
{totalOutliers} outlier(s) ({pctStr}) · {fmtPBadge(primaryP)}` → on LOW `nOutliers=0` →
`"35 rows tested · 0 outliers (0.0%) · p=0.13"` (the binomP badge). Evidence body: D² **chart data-gated
not flag-gated** `{(hasAllCond || hasSinglePlot) && …}` (`:55`, `hasSinglePlot=plotD2?.length>0`) → **D²
plot renders on LOW** (`outlierThreshold=null` → no threshold line / no red dots); outlier table gated on
list length `if (!outlierList.length) return null;` (`:70-72`, empty on LOW → not rendered). No card-level
early-return. How-this-works: **shown** (`mechanisms.js:223`).

**Design verdict:** _(Chat)_

---

## 24. Blocked Mahalanobis — `17-densitometry-carlisle-clean` · LOW

**(a) Retained fields (runtime).**
`category=replicate` · `primaryP=0.0104` · `nConditions=3` · `nUnits=6` · `windowSize=30` · `stride=10` ·
`nPerm=4999` · `nWindowsTotal=12` · `interpretation="No block-localised covariance or mean anomaly
detected…"` · `details=array[7] of {source,pass,passKey,condition,startRow,endRow,rows,statType,stat,
rawP,adjP,significant,isBest}` · `conditionNames=["Control","Treatment_A","Treatment_B"]` ·
`_perfExceedances=array[6] of {pass,condition,exceed,rawP,adjP}` · `vstTransform="log"`.
*(Note `primaryP=0.0104` — close to but above ALPHA — flag LOW; FISHER_EXEMPT member.)*

**(b) What the test computes.** Per (pass × condition) unit, two passes per sliding window: **μ-pass
Hotelling T²** on block-vs-complement mean separation (Ledoit-Wolf-shrunk pooled covariance,
`blockedMahalanobis.js:319-330`); **Σ-pass eigenvalue ratio R=λ_max(Σ̂_B·Σ̂_{\B}⁻¹)** via power iteration
`:333-346`. Per-condition scan statistic = **max across windows** `:348-349`; **within-condition
row-shuffle permutation null** rank-accumulator `:536-537`; **BH-FDR across (pass×condition) units**
(m=2·nCond) `:567-573`. Headline `primaryP=min(adjP)` across units `:575`.

**(c) Current clean-body render.** Footer `MiniCard_BlockedMahalanobis.jsx:91` (passed `:95`): `{nConditions}
conditions · {nWindowsTotal} windows ({passLabel}){driverClause} · B={nPerm} · {fmtPBadge(primaryP)}`.
`driverClause` empty on LOW (`:85` gated `flag!=="LOW"`) → `"3 conditions · 12 windows (W=30, stride=10) ·
B=4999 · p=0.01"`. Evidence body: position strip gated on `details.filter(significant)` (`:24-25`,
`significant`=`adjP<0.01`) → empty on LOW → not rendered; table gated on `details.length` (`:60`) →
**renders on LOW** (engine builds `details` from windows within 5% of per-unit argmax regardless of flag)
with `footerText="All windows are consistent with a single condition-wide covariance / mean structure."`
(`:74-76`), no amber rows. No early-return. How-this-works: **shown** (`mechanisms.js:225`).

**Design verdict:** _(Chat)_

---

## 25. Baseline Balance — `17-densitometry-carlisle-clean` · LOW

**(a) Retained fields (runtime).**
`category=group` · `primaryP=0.00014087` · `nFeatures=60` · `nExcess=3` · `expectedExcess=3` ·
`binomP=0.6165` · `ksD=0.2823` · `ksP=0.00014087` · `direction="imbalanced"` · `nSignificant=14` ·
`histBins=[22,6,2,6,6,…]` (10) · `featurePValues=array[60] scalar` ·
`details=array[30] of {Feature, "ANOVA p", Means}`.
*(**Key cleared-card artifact:** `primaryP=0.000141` (=`ksP`) is tiny, yet flag LOW — held by the
effect-size gate `excessFrac<0.50` (here `nExcess/nFeatures=3/60`). The footer p-badge still prints the
tiny p. This is the clearest "headline number ≠ verdict" case in the battery.)*

**(b) What the test computes.** Per-feature **one-way ANOVA F → p** (`carlisleBalance.js:67`/`:93`, helper
`:189-224`). **Test (a) binomial** on excess of p>0.95 ("too-balanced"): `nExcess`, `expectedExcess`,
`binomP=_binomialUpperTail(nExcess, nFeatures, 0.05)` `:115-118`. **Test (b) KS** of the feature-p
distribution vs U(0,1): `ksD`/`ksP` `:121-129`. Headline `primaryP=min(binomP, ksP)` `:132`; then
effect-size gate `excessFrac<0.50 → LOW` `:139-141`. *(So both cuts are retained: binomP=0.62 benign,
ksP=0.00014 extreme — the test takes the min but the gate overrides to LOW.)*

**(c) Current clean-body render.** Footer `MiniCard_CarlisleBalance.jsx:56-60`: `{nFeatures} features tested
· {nExcess}/{nFeatures} with p>0.95 (expected {expected}) · {fmtPBadge(primaryP)}` → `"60 features tested ·
3/60 with p>0.95 (expected 3) · p=0.0001"`. Evidence body: histogram **data-gated not flag-gated**
`if (histBins.length===10 && nFeatures>0)` (`:21`, renders `:64`) → **renders on LOW**, with caption
surfacing the KS cut even on LOW `" Distributional-shape statistic for this plot: KS D = {ksD},
{fmtPBadge(ksP)}."` (`:71`); per-feature table `{details.length>0}` (`:75`, always built) → **renders on
LOW**. No early-return. How-this-works: **shown** (`mechanisms.js:227`).

**Design verdict:** _(Chat)_

---

## 26. Cross-Condition Consistency — `01-densitometry-clean` · LOW

**(a) Retained fields (runtime).**
`category=group` · `primaryP=0.036` · `bhM=18` · `bhMStage1=9` · `bhMStage2=9` · `bhMStage3=0` · `B=999` ·
`nConditions=3` · `nPairs=3` · `nProperties=7` · `nUnitsRan=18` · `nUnitsTotal=21` · `nFlagged=0` ·
`nFlaggedPairs=0` · `top={property:"Residual kurtosis", pair:"Control vs Inhibitor_A", direction:"different",
adjP:0.036, gatePassed:true}` · `conditionNames=["Control","Inhibitor_A","Inhibitor_B"]` ·
`conditionN=[140,140,140]` · `details=array[21] of {property,pair,observed,nullMedian,direction,adjP,
unitFlag,forensic,gatePassed,fallback,nMin,ran,stage}` · `vstTransform="log"`.
*(Note: `primaryP=0.036` < 0.05 yet flag LOW — the forensic-direction filter neutralises the non-forensic
"different"-direction unit, keeping `nFlagged=0`. Headline p small, verdict LOW.)*

**(b) What the test computes.** **3-stage BH-FDR across a property × pair grid.** Per (property×pair) unit:
two-sided permutation p `u.p2=min(1, 2·min(pUpper,pLower))` (`crossConditionConsistency.js:526`). Properties
span 3 stages (Stage 1 pool: trimmed span / MAD / CDF-KS; Stage 2 residual: residual SD / lag-1 AC /
kurtosis; Stage 3 mvslope: mean-variance slope, pre-VST). **Separate BH-FDR per stage** `:564-575`.
Effect-size gate + forensic-direction filter per unit `:600-608`. Headline `primaryP=min(effAdjPs)` where
non-forensic / non-gate-passed units are neutralised to 1.0 `:616-617`.

**(c) Current clean-body render.** Footer `MiniCard_CrossCondConsistency.jsx:101-108` (passed `:161`):
pieces joined by `" · "`; `driverClause` omitted on LOW (`:96` gated `flag!=="LOW"`), `nAmber=0` →
`"3 conditions · 3 pairs · 7 properties · 18 units ran · 0 flagged · B=999 · p=0.036"`. Evidence body:
property×pair table gated `{result.flag!=="N/A" && rows.length>0}` (`:165`, **not** flagged-gated) → **full
grid table renders on LOW** (all units, no amber tint; legend `:174-187`). No early-return. How-this-works:
**shown** (`mechanisms.js:229`).

**Design verdict:** _(Chat)_

---

## 27. Cross-Condition Rank Correlation — **no clearing fixture (N/A on 22/22)**

**⚠ No clearing fixture — inventory is source-read, not runtime.** CCR is N/A on every fixture (needs ≥4
paired condition profiles; `rankCorrelation.js:24-26`/`:46-54` return N/A first). The cleared-body path is
unreachable on the current suite; (a)/(c) below are source-reads assuming `flag==="LOW"`.

**(a) Retained fields (source-read of the non-N/A return at `rankCorrelation.js:103-108`).** On a non-N/A
run the result would carry: `category` · `nPairs` · `meanRho` (`Math.tanh(meanZ)` `:71`) · `nSuspicious`
(`:93`) · `flag` · `primaryP` · `details` (= `looResults`, per-pair `{rho, z, looMean, looSE, zStat, rawP,
adjP, suspicious}`) · `condNames`. On LOW: `nSuspicious=0`, all `suspicious=false`. *(No runtime dump
available — fields not observed at runtime.)*

**(b) What the test computes.** Per condition-pair **Spearman ρ** between mean-profiles (`:35`); **Fisher-z
transform** `:63-66`; **leave-one-out outlier z-test** per pair vs the mean of all other pairs' z `:74-87`;
**BH-FDR across pair-level LOO tests** `:91-92`. Also `meanRho` `:71`, `nSuspicious` `:93`. Headline
`primaryP=min(adjP across pairs)` `:106`; **flag capped at MODERATE** `:99-101`.

**(c) Current clean-body render (source-read, `flag==="LOW"`).** Early-return `if (!details.length) return
null;` (`MiniCard_RankCorrelation.jsx:15`) — on a LOW result `details` is populated so the guard passes.
Footer `:56` (passed `:61`): `{nPairs} condition pairs · mean ρ = {meanRho} · {nSusp} suspicious · p = {p}`
→ on LOW `"M condition pairs · mean ρ = … · 0 suspicious · p = …"`. Evidence body: correlation matrix gated
on `hasMatrix=condNames.length>=2` (`:72`, **not** flag) → would render on LOW (cells via `cellBg` `:40-43`,
all expected/non-suspicious tone). `insufficientPairs` banner (`:65-70`) is tied to the N/A <4-pairs branch,
not LOW. How-this-works: **shown** (`mechanisms.js:221`).

**Design verdict:** _(Chat)_

---

## 28. Missing Data Pattern — **no clearing fixture (N/A on 21, HIGH on DS15)**

**⚠ No clearing fixture — inventory is source-read, not runtime.** Missing Data Pattern is N/A on 21
fixtures and HIGH on DS15; it never produces a LOW result on the current suite. (a)/(c) below are
source-reads assuming `flag==="LOW"`.

**(a) Retained fields (source-read of the return at `missingDataPattern.js:175`).** On a non-N/A run the
result carries: `flag` · `primaryP` (= combined-BH `minAdjP`) · `nMissing` · `missRate` · per-column
`colMissRates` · pairwise/condition/block hit lists. On a hypothetical LOW: hit-counts `nPairwise`/`nCond`/
`nBlock` would be 0 (no sub-signal crosses adj-p<0.05). *(No runtime dump available — fields not observed
at runtime.)*

**(b) What the test computes.** Three sub-signals pooled into one BH-FDR: **(a) pairwise column
missingness** Fisher's exact 2×2 per column pair (`:73`, own BH-FDR `:79`); **(b) condition × missingness**
Fisher's exact (2 conds) or chi-squared contingency (≥3) `:114-120`; **(c) block missingness scan**
(rectangular all-missing regions, MCAR-independence p with Bonferroni) `:255-324`, `bonP` `:289`. All raw
p's into `allPs` `:84`/`:131`/`:145`. Headline = **min of one combined BH-FDR over allPs**:
`primaryP=minAdjP` `:151-153` (set `:175`).

**(c) Current clean-body render (source-read, `flag==="LOW"`).** Footer `MiniCard_MissingDataPattern.jsx:109-115`:
`{nMissing} missing cells ({missRate})` + `nPairwise>0` / `nCond>0` / `nBlock>0` clauses (all suppressed on
LOW) + `{fmtPBadge(primaryP)}` → `"X missing cells (Y%) · p=…"`. Evidence body: per-column bar chart gated
on `colRates.length` (`:33`, **not** flag) → would render on LOW; spatial heatmap gated `{rawData.length>0
&& dataColMap.length>0 && result.nMissing>0}` (`:92`, not flag) → would render on LOW (block-outline legend
item suppressed when no block hits `:129`). No early-return. How-this-works: **shown** (`mechanisms.js:199`).

**Design verdict:** _(Chat)_

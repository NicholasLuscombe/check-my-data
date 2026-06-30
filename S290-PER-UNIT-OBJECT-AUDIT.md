# S290 — Per-Unit Object Audit

Read-only. No source changed. No batch. One catalogue, classifying every PER-UNIT-OR test by the
shape of its per-unit evidence, read from source (the engine's returned object and the `MiniCard_*`
component), with a proposed primitive and a disposition for Chat to confirm.

Scope: the 18 PER-UNIT-OR tests per `docs/shared/TIER-A-CI-DRAW-SPEC.md` §3 (build order) and
`docs/shared/S237-FLAG-ASSEMBLY-CLASSIFICATION-v2.md`. Runs Test is excluded (reclassified
POOLED-SINGLE at S239); it is not in the 18.

The four shapes:
- **Pairwise** — the unit is a pair on two indexing axes. Wants a triangular heatmap.
- **Sequence-against-reference** — the unit is one item in a flat sequence; the verdict is its
  distance from a reference. Wants a forest/dotplot.
- **Spatial / windowed** — the unit is a row-window or a smoothed region along the data. Wants a strip.
- **Distributional** — the unit is a per-group distribution shape. Wants a histogram.

---

## Summary table

| Test | Unit (verdict-carrying) | Shape | Renders today | Proposed primitive | Disposition |
|---|---|---|---|---|---|
| Autocorrelation | per-pair lag-1 r + lags 2–5, vs r = 0 | Sequence-against-reference | `ForestPlot` (zero ref) | forest | **KEEP** |
| Windowed Autocorrelation | (pair × window) row-span vs shuffle null | Spatial / windowed | `RegionalNoiseStrip` + table | strip | **KEEP** (latent on flag) |
| Row-Mean Runs — per-condition | condition runs vs expected runs | Sequence-against-reference (stored ref) | `ForestPlot` (stored ref) | forest | **KEEP** |
| Row-Mean Runs — windowed arm | row-window vs runs null | Spatial / windowed | none (no driver surface) | strip / connector-over-table | **REBUILD** |
| Excess Kurtosis | per-condition κ̂ vs sim null | Sequence-against-reference (+ distributional evidence) | `KurtosisDistPlot` histogram + table; no forest | forest (per-condition, stored sim-null ref) | **DEFER** (latent; fields retained S288) |
| Column Goodness-of-Fit | per-column A² ratio vs null median | Sequence-against-reference | `ColumnStatBar` (ref = 1) | forest / bar-vs-reference | **KEEP** |
| Entropy / Zipf | per-column H ratio vs null median | Sequence-against-reference | `ColumnStatBar` (ref = 1) | forest / bar-vs-reference | **KEEP** (latent) |
| Modality Test | per-column distribution modality (dip D) | **Distributional** | `ColumnStatBar` (dip vs threshold) | histogram | **DEFER** (latent; primitive mismatch) |
| Decimal Precision | per decimal-level count vs binomial model | Sequence-against-reference | `VBarPlot` (count per level) | bar-vs-level (+ expected overlay) | **KEEP** (latent) |
| Value-Frequency Spike | per value (int / fractional) vs Poisson λ | Sequence-against-reference | `EvidenceTable` only | forest / dotplot on value axis | **REBUILD** |
| Inter-Replicate Correlation — pair | replicate × replicate r vs LOO ICC | **Pairwise** | `ForestPlot` lead; `CorrMatrixSVG` demoted | triangular heatmap | **RESTORE-PRIOR** |
| Inter-Replicate Correlation — window | row-window vs pair baseline | Spatial / windowed | `EvidenceTable` (windows) | strip | **KEEP** (strip optional) |
| Cross-Condition Consistency | (property × condition-pair) vs perm null | Sequence-against-reference (2° pairwise axis) | `EvidenceTable` only | forest (declined S287) | **KEEP** (forest declined-prior) |
| Cross-Condition Rank Correlation | condition × condition ρ | **Pairwise** | `CorrMatrixSVG` | triangular heatmap | **KEEP** |
| Regional Noise — window | window × col SD ratio | Spatial / windowed | `RegionalNoiseStrip` + table | strip | **KEEP** |
| Regional Noise — per-column promoter | per-column SD ratio vs global | Sequence-against-reference | none (`colPromoters` unread) | forest | **DEFER** (retention-gated, latent) |
| Selective Noise Partitioning | per-condition Bartlett (verdict); per-column spread (display) | **Distributional** | `NoiseSpreadPlot` + de-marked table | histogram / spread plot | **KEEP** |
| LOESS Residual Analysis | row-window + changepoint + per-row noise | Spatial / windowed | `NoiseProfilePlot` + region table | strip / profile line | **KEEP** |
| Mahalanobis Row Outlier | per-row D² vs BH survivor threshold | Spatial / row-strip (Family B) | `MahalanobisDistPlot` (dotplot + threshold) | row-strip / dotplot-with-threshold | **KEEP** |
| Blocked Mahalanobis | (pass × condition) row-block, stat = T²/λ | Spatial / windowed | `RegionalNoiseStrip` + table | strip (or forest-with-derived-ref — §2.5 open) | **KEEP** (§2.5 open) |
| Within-Row Variance | per-row z vs ±4σ threshold (Family B) | Spatial / row-strip | z-score **histogram** + table | row-strip-with-threshold | **DEFER** (latent; primitive mismatch) |

Count: 18 tests. Two carry two distinct unit classes broken out as separate rows (Row-Mean Runs,
IRC, Regional Noise) — the test count is still 18; the extra rows are the second unit class.

Dispositions at a glance: **KEEP 12** (incl. the secondary IRC-window and CCC table) · **REBUILD 2**
(Row-Mean Runs windowed arm, VFS) · **RESTORE-PRIOR 1** (IRC pairwise heatmap) · **DEFER 4** (Kurtosis,
Modality, Regional Noise per-column promoter, Within-Row Variance).

---

## Three findings that contradict the carried-forward record

These came out of reading source rather than the spec notes, and Chat should settle them before any
build is scoped.

1. **The IRC forest is NOT retired.** `docs/shared/TIER-A-CI-DRAW-SPEC.md` §2.2 records "IRC is
   pairwise → heatmap (forest retired S290)", and the S290 prompt repeats the premise. Source
   disagrees: `MiniCard_InterReplicateCorrelation.jsx` imports `ForestPlot` (line 9) and renders it
   as the **lead** per-pair surface (line 232), with the `CorrMatrixSVG` triangular heatmap present
   but demoted (line 134). The forest is still live. The retire is not done — it is the
   RESTORE-PRIOR work this audit recommends, not a completed state.

2. **VFS is sequence-against-reference, not windowed.** §2.2/§2.6 of the spec (S289 reframe) calls
   VFS "windowed → strip". The unit read from source is a single value (an integer, or a parsed
   fractional substring) tested against a local Poisson-smoothed λ — `tested.push({ value, obs,
   smoothed, ratio, rawP })` (`valueFrequencySpike.js:107`). The ±halfW neighbourhood is the
   smoothing window that computes each value's reference λ; it is not the unit, and the data axis is
   the value axis, not a row/position axis. The honest primitive is a forest/dotplot on the value
   axis (obs vs λ), **not** a spatial strip.

3. **Cross-Condition Consistency's forest was already tried and declined.** The shape read
   (property × condition-pair distance vs a permutation-null median) points at a forest, but
   `docs/shared/TIER-A-CI-DRAW-SPEC.md` §2.2 records the forest "declined S287 (direction-collapse,
   table-satisfied)" — a distance/ratio axis folds the two forensic directions (similar / different)
   onto one side of the reference, the failure noted in memory `reference_forestplot_reference_mode.md`.
   So the disposition is KEEP the table, with the shape-implied forest recorded as declined-prior,
   not REBUILD.

---

## Per-test catalogue

Each entry reports the five fields: (1) the unit and the field/array carrying it, (2) the shape with
its justification, (3) what the card renders today, (4) the proposed primitive and any mismatch,
(5) the disposition.

### 1. Autocorrelation
`src/tests/autocorrelation.js` + `MiniCard_Autocorrelation.jsx`

1. **Unit — two classes, both against r = 0.** Per-pair lag-1: `res.push({ pair:`${c1+1}–${c2+1}`,
   lag1, z, p, rawP })` returned as `details` (`autocorrelation.js:44, :174`). Higher lags 2–5:
   `lagTable` rows `{ lag, pooledR, …, pairsSig, pairsTotal, isPromotionTrigger }`
   (`autocorrelation.js:153-163`).
2. **Shape — Sequence-against-reference.** Each per-pair lag-1 and each higher lag is one item in a
   flat sequence, tested for its distance from r = 0 (`zToP(z)`, `z = r1/se`). The pooled-pair
   structure is dropped; the verdict reads distance from zero.
3. **Renders today — `ForestPlot` (zero reference).** `MiniCard_Autocorrelation.jsx:139-143`,
   `units = [...perPairUnits, ...higherLagUnits]` each `referenceMode:"zero", reference:0`. Secondary
   `AutocorrDecayPlot` + pooled-lag `EvidenceTable`. Forest suppressed on the column-grouped path
   (`!isAgg`, line 136), where the verdict is Fisher-combined and no per-unit clears.
4. **Proposed — forest. Match.** Built S283 to replace the old pooled lag-1 CI band.
5. **Disposition — KEEP.** One noted (non-shape) caveat carried in the source comment: the per-pair
   forest mark gates on the 0.01 `significant` boolean while the verdict's per-pair promotion is at
   adj-p < 0.001 (the adjusted per-pair p is dropped — a retention reconciliation beside Kurtosis and
   Regional Noise, not a wrong primitive).

### 2. Windowed Autocorrelation
`src/tests/windowedAutocorrelation.js` + `MiniCard_WindowedAutocorr.jsx`

1. **Unit — (pair × window) row-window.** A 15-row sliding window (stride 5) along each pair's
   difference series: `windowUnits.push({ pair, pairIdx, startRow, endRow, winIdx, r, absR, rawP })`
   (`windowedAutocorrelation.js:120-129`), surfaced in `details` with `{ source:"window", pair,
   startRow, endRow, rows, r, adjP, significant }` (`:169-179`).
2. **Shape — Spatial / windowed.** The locating evidence is the row range (`startRow–endRow`) per
   pair, against a within-pair row-shuffle null. Wants a strip.
3. **Renders today — `RegionalNoiseStrip`** (one row per pair, |r| mapped to a synthetic `ratio` for
   opacity; built from significant windows only, `:37, :50-53`) + `EvidenceTable` (Pair / Rows / r /
   Adj. p).
4. **Proposed — strip. Match.** The reuse via a synthetic `ratio` is a slight opacity-proxy hack but
   is an honest row-position strip.
5. **Disposition — KEEP.** Latent against a flagged anchor (no flagged fixture in the 22-set, per
   S237); the per-condition arm is defensive only. Flag as render-unexercised at close.

### 3. Row-Mean Runs
`src/tests/rowMeanRuns.js` + `MiniCard_RowMean.jsx`

1. **Unit — two classes.** Per-condition sequence: `condSignSeqs: sequences.map(s => ({ label,
   signs, pos, runs, expected, z, p }))` (`rowMeanRuns.js:214-225`) — observed runs vs expected runs
   per condition. Windowed-promotion arm: 15-row windows along each condition's residual sequence,
   `allWindowResults.push({ sequence, startRow, endRow, runs, expected, z, p, rawP })` (`:125-130`),
   BH-FDR'd, significant windows entering `details` as `source:"window"` (`:227`).
2. **Shape.** Per-condition → **Sequence-against-reference** (stored per-unit reference = expected
   runs). Windowed arm → **Spatial / windowed**.
3. **Renders today.** Per-condition: `ForestPlot` (`:98`, `referenceMode:"stored"`, estimate = runs,
   reference = expected, axis "Runs observed") + `SignStripPlot` + `EvidenceTable`. All three surfaces
   are fed from `condSignSeqs`/`condSeqs`; **none reads the `source==="window"` details.**
4. **Proposed.** Per-condition: forest, **match**. Windowed arm: strip or connector-over-table — and
   there is **no in-card surface for it**.
5. **Disposition.** Per-condition: KEEP. Windowed arm: **REBUILD** — confirmed no-visible-driver gap.
   The windowed arm can promote the card to MODERATE with every condition dot reading clear:
   `anyWindowFlagged = windowAllAdjPs.some(p => p < ALPHA.FLAG)` → `promotedFlag = "MODERATE"`,
   `flag = max(promotedFlag, globalFlag)` (`:145-147`), while `globalBestP` is the min over per-
   condition `s.p` (`:97`). The card comment at `:64-69` states the windowed arm "stays on the
   existing surfaces" — but those surfaces do not render it. Candidate treatment: overlay the flagged
   window row-span on the existing `SignStripPlot` (which already has a `fileRow` axis), or a
   connector-line-over-table — the same shape as the IRC window-table connector.

### 4. Excess Kurtosis
`src/tests/kurtosis.js` + `MiniCard_Kurtosis.jsx`

1. **Unit — two classes.** Per-pair kurtosis κ of normalized diffs: `res.push({ pair, kurtosis, z,
   p, interpretation, rawP })` → `details` (`kurtosis.js:119-121, :541`). Per-condition κ̂ vs the
   simulated null: `condKurtosis` rows `{ condition, n, nDiffs, kurtosis, kurtDeviation, p, …,
   normDiffs }` (`:419-427`), the per-condition p from ranking observed κ against `simKurts`
   (`condP = (nExceed+1)/(simKurts.length+1)`, `:413-416`).
2. **Shape.** The verdict-carrying per-condition class is **Sequence-against-reference** (each
   condition's κ̂ vs the sim-null reference). The underlying per-pair/per-condition evidence is
   genuinely **distributional** (the d/σ histogram shape).
3. **Renders today — histogram, no forest.** Primary `KurtosisDistPlot` (observed vs simulated-null
   density, `:47-48`); per-condition `EvidenceTable` "Noise shape by condition" + per-condition
   `PlotSVG` sparkline histograms (`:99, :154-178`); `DotStrip`/`HBarPlot` fallbacks only when
   `normDiffs` is empty.
4. **Proposed — forest (per-condition, stored sim-null reference).** The S288 fields
   `simKurtMedian`/`simKurtSD`/`simKurtQuantiles` were retained (`:509-516`) precisely so a later
   per-condition forest can show each condition's κ̂ against the same null. Today there is no forest
   — mismatch between verdict geometry and display.
5. **Disposition — DEFER.** Latent: gated in-card on `condK?.length >= 2 && (flag === "HIGH" ||
   condK.some(c => c.verdict !== "clear"))` (`:65`); no positive condition-stratified fixture. Becomes
   a forest REBUILD if a fixture appears (#49). The pooled distributional `KurtosisDistPlot` is correct
   and KEEP for the distributional class.

### 5. Column Goodness-of-Fit
`src/tests/columnGof.js` + `MiniCard_ColumnGoF.jsx`

1. **Unit — per data column.** `{ col, …, A2_obs, A2_median, ratio, rawP, direction }`
   (`columnGof.js:183-188`); `colRatios` per column (`:233-236`). Observed A² vs the per-column
   bootstrap-null median, as `ratio` against 1.
2. **Shape — Sequence-against-reference.** One column per flat-sequence slot; verdict is the ratio's
   distance from the null reference. Scalar-vs-reference, not a distribution-shape verdict.
3. **Renders today — `ColumnStatBar`** (`:126`, `refValue=1`, `refLabel="Expected (ratio = 1)"`,
   axis "A² ratio") + `DataTable` (`:161`).
4. **Proposed — forest / bar-vs-reference.** `ColumnStatBar` is the per-column ref-line bar — the
   near-equivalent of a forest for this shape. Conceptually aligned; minor primitive-name difference.
5. **Disposition — KEEP.** Has flagged fixtures (DS10/20).

### 6. Entropy / Zipf Analysis
`src/tests/entropyTest.js` + `MiniCard_Entropy.jsx`

1. **Unit — per data column.** `{ col, …, hObs, hExpected, ratio, rawP, direction, precision }`
   (`entropyTest.js:109-112`); `colRatios` (`:162-167`). Observed Shannon H vs per-column bootstrap-
   null median, as `ratio`.
2. **Shape — Sequence-against-reference.** Same as Column GoF — scalar H vs per-column reference.
3. **Renders today — `ColumnStatBar`** (`:81`, `refValue=1`, axis "Entropy ratio") + `DataTable`
   (`:111`). Same primitive as Column GoF (no `skipped` surface — emits no `skippedColumns`).
4. **Proposed — forest / bar-vs-reference. Match** (minor name difference, as Column GoF).
5. **Disposition — KEEP** (display matches shape). Latent — no flagged fixture; flag as render-
   unexercised.

### 7. Modality Test
`src/tests/modality.js` + `MiniCard_Modality.jsx`

1. **Unit — per data column distribution.** `{ col, n, distinct, g1, g2, D_obs, rawP }`
   (`modality.js:222-226`); `colDips` (`:260-263`); `details: [{ Col, Dip, adjP }]` (`:254-258`).
   The flag fires on the Hartigan dip `D_obs` against the `DIP_GATE = 0.04` effect gate (`:53, :243`)
   and the tabulated uniform-reference null.
2. **Shape — Distributional.** The verdict is explicitly "is this column's distribution uni- vs
   multi-modal" (`hartiganDip`, uniform = unimodal ceiling, `:5-6, :269-271`) — the unit IS the
   distribution shape, not a scalar-vs-reference distance. This is the canonical histogram case
   (already pulled from the forest programme).
3. **Renders today — `ColumnStatBar`** (`:68`, `refValue=DIP_GATE`, `refLabel="Multimodality
   threshold"`, `refColor=CC.THRESH`, axis "Dip statistic") + `DataTable`. A scalar dip-vs-threshold
   bar — **not** a histogram.
4. **Proposed — histogram. MISMATCH.** The card shows the dip magnitude but never shows the modality
   (the peaks) it claims; `ColumnStatBar` is the sequence-against-reference primitive applied to a
   distributional unit.
5. **Disposition — DEFER.** Latent — no flagged fixture; with no positive anchor, defer the rebuild.
   If a fixture appears: REBUILD to a per-column histogram.

### 8. Decimal Precision Consistency
`src/tests/decimalPrecision.js` + `MiniCard_DecimalPrecision.jsx`

1. **Unit — per decimal-place level.** `perLevel.push({ dp: j, observed, expected, expectedP, p })`
   (`decimalPrecision.js:68`) over levels j = 1 .. maxDp-1; the per-level deficit vs a binomial
   trailing-zero model.
2. **Shape — Sequence-against-reference.** Each level is one slot in a flat sequence (decimal places),
   verdict = observed count's distance from a per-level model reference. Not distribution-shape.
3. **Renders today — `VBarPlot`** (`:34-38`, count per decimal-place level, gap levels colored
   `CHART.GAP`). Not a `ColumnStatBar`.
4. **Proposed — bar-vs-level with an expected overlay.** The bar-over-level axis is appropriate; the
   binomial `expected`/`p` per level (`perLevel`) is computed but not drawn — the reference that
   drives the verdict is implied by gap-coloring, not plotted.
5. **Disposition — KEEP** (with note). Latent — no flagged fixture; the only enhancement (an
   observed-vs-expected overlay) is not worth a rebuild absent a positive fixture.

### 9. Value-Frequency Spike
`src/tests/valueFrequencySpike.js` + `MiniCard_ValueFrequency.jsx`

1. **Unit — per located value.** `tested.push({ value, obs, smoothed, ratio, rawP })`
   (`valueFrequencySpike.js:107`) — the unit is a single value v (integer, pass 1; or fractional-digit
   substring, pass 2); `smoothed` is the leave-one-out ±halfW neighbour mean = Poisson λ reference.
   `_spikeValues` (`:441-446`); full BH family retained as `allTested` (`:478-485`, S288).
2. **Shape — Sequence-against-reference.** A located scalar (obs count) vs a per-value reference (λ),
   on the value axis. The ±halfW neighbourhood is the smoothing window that computes λ, **not** the
   unit; there is no row/position axis. (Contradicts the S289 "windowed → strip" framing — see
   findings, above.)
3. **Renders today — `EvidenceTable` only** (`:97-120`, Value / Rows / Observed / Expected / Ratio /
   Adj. p) + an optional keyboard-pattern `CardBanner`. No graphical primitive.
4. **Proposed — forest / dotplot on the value axis** (obs vs λ; cleared background from `allTested`,
   spikes marked). **MISMATCH** — the obs/expected/ratio columns are forest coordinates rendered as
   text; the retained `allTested` family (S288, "so a later per-unit strip has its cleared background")
   signals a planned per-unit visual not yet built.
5. **Disposition — REBUILD.** Has flagged fixtures (DS04/06/13). Build a forest/dotplot on the value
   axis — **not** a spatial strip.

### 10. Inter-Replicate Correlation
`src/tests/interReplicateCorrelation.js` + `MiniCard_InterReplicateCorrelation.jsx`

1. **Unit — two classes.** Whole-pair: `allPairs` rows `{ pair:`${c1+1}–${c2+1}`, matCol1, matCol2,
   r, iccExpected, excess, …, rawLooICC }` (`:117-132`); flag carrier `p.suspicious = !p.highSNR &&
   iccAdjPs[i] < ALPHA.FLAG && excess > minExcess` (`:156`). Row-window: `allWinResults`/`winIrcSig`
   merged into `details` with `source:"window"` `{ startRow, endRow, rWin, baseline, excess }`
   (`:222-229, :264-266`).
2. **Shape.** Whole-pair → **Pairwise** (replicate × replicate within condition, `matCol1`/`matCol2`).
   Window → **Spatial / windowed** (row range).
3. **Renders today — three surfaces, forest leading.** `ForestPlot` per-pair (lead, S284, imported
   line 9, rendered line 232, `estimate=rawR` vs `reference=rawLooICC, referenceMode:"stored"`);
   `CorrMatrixSVG` triangular heatmap per condition (line 134, demoted — shown when `nSusp > 0` or as
   lead when no windowed signal); `EvidenceTable` "Highly correlated row windows" (line 154).
4. **Proposed.** Pairwise → triangular heatmap; the card LEADS with the forest and demotes the
   heatmap — **mismatch on the lead surface**. Window → strip; renders a table (a reasonable surrogate).
5. **Disposition.** Pairwise: **RESTORE-PRIOR** — promote the existing `CorrMatrixSVG` to lead, demote/
   drop the per-pair forest. The matrix is already built, reads the same `isPromotionTrigger` field,
   and is fed from `pairDetails`; this is a re-ordering, not a rebuild. (Note: the spec/prompt record
   this as already done at S290; it is not — see findings.) Window: KEEP the windows table; REBUILD to
   a strip only if strip parity is wanted (latent, not a correctness gap).

### 11. Cross-Condition Consistency
`src/tests/crossConditionConsistency.js` (+ `crossConditionProperties.js`) + `MiniCard_CrossCondConsistency.jsx`

1. **Unit — (property × condition-pair).** One registered property (span, MAD, KS, residual SD,
   lag-1 AC, kurtosis, mv-slope) compared between one ordered condition pair. Enumerated at
   `:370-436`; surfaced in `details` `{ property, pair:`${condA} vs ${condB}`, observed, nullMedian,
   direction:"similar"|"different", adjP, unitFlag, forensic, gatePassed }` (`:651-702`). Per-unit
   verdict = distance `dObs` from a permutation-null median, two-sided, BH per stage.
2. **Shape — Sequence-against-reference** (with a secondary pairwise grouping axis). Each unit is one
   property's distance from its own permutation-null reference. The property dimension breaks pure
   pairwise symmetry — a cell is one of N properties, so a triangular heatmap cannot hold it without
   per-property faceting.
3. **Renders today — `EvidenceTable` only** (`:195-201`, Property / Pair / Observed / Null median /
   Adj. p / Finding; amber forensic rows sorted to top, tier-coloured left edge). No SVG primitive.
4. **Proposed — forest (declined).** The shape implies a forest (dot at `dObs` vs `permMedian`), and
   the Observed/Null-median columns are forest coordinates as text — but a distance/ratio forest folds
   the two forensic directions (similar / different) onto one side of the reference.
5. **Disposition — KEEP** (table); the shape-implied forest is recorded **declined-prior (S287,
   direction-collapse, table-satisfied)**. Not a REBUILD. See findings.

### 12. Cross-Condition Rank Correlation
`src/tests/rankCorrelation.js` + `MiniCard_RankCorrelation.jsx`

1. **Unit — condition pair.** `looResults` → `details` rows `{ pair:`${name_i} vs ${name_j}`,
   spearmanR, n, fisherZ, looMean, zStat, rawP, adjP, suspicious }` (`:74-88, :103-107`); flag carrier
   `r.suspicious = xcrAdjPs[i] < ALPHA.FLAG` (`:92`).
2. **Shape — Pairwise.** Indexed on two condition axes; the cell value is a single scalar ρ. Not a
   flat list — the indexing is genuinely 2-D and the cell is a scalar, so a matrix is the right object.
3. **Renders today — `CorrMatrixSVG`** triangular heatmap (`:81-90`, labels = condition names,
   `getValue` from the ρ lookup, cells red `TIER_COLOR.MID` when `suspicious`) + `ChartLegend`.
4. **Proposed — triangular heatmap. Match.**
5. **Disposition — KEEP.** Latent (no flagged fixture), but the primitive is already correct. (Spec
   flagged this for the S290 check; confirmed pairwise → heatmap, already shipped.)

### 13. Regional Noise Homogeneity
`src/tests/regionalNoise.js` + `MiniCard_RegionalNoise.jsx`

1. **Unit — two classes.** Window × col scan-max (verdict-driving): `allWindows.push({ startRow,
   endRow, maxRatio, anomCol, direction, winVar, globVar })` (`:126-129`) → `details` `{ rows, ratio,
   anomCol, direction, windowSD, globalSD, sdRatio }` (`:200-211`). Per-column BH promoter (report-
   only): `colPromoters` rows `{ col, sdRatio, adjP, promoted }` (`:227-232`) — "report-only … the
   flag was already decided above from anyColSig" (`:222-226`).
2. **Shape.** Window class → **Spatial / windowed** (row-window on a column → strip). Promoter class →
   **Sequence-against-reference** (per-column SD ratio vs the column's global variance → forest).
3. **Renders today.** `RegionalNoiseStrip` (line 62) + divergence `ChartLegend` + "Anomalous windows"
   `EvidenceTable` (lines 72-103) + per-condition `ConditionTable`. **`result.colPromoters` is never
   read in the card** (confirmed).
4. **Proposed.** Window: strip, **match**. Per-column promoter: a per-column forest — no in-card
   surface; the data is computed and stored but unrendered.
5. **Disposition.** Window class: KEEP. Per-column promoter: **DEFER** — retention-gated (`colPromoters`
   retained S288, the §5 retention case), latent in-card; a per-column forest REBUILD if surfaced.

### 14. Selective Noise Partitioning
`src/tests/selectiveNoise.js` + `MiniCard_SelectiveNoise.jsx`

1. **Unit.** Verdict is per-condition Bartlett (stratified) or pooled Bartlett (single-run) — a
   per-group variance-homogeneity statistic, not per-pair/per-window. Display rows are per-column:
   `perColumnResults` `{ col, residualStd, varRatio, direction, rawP }` (`:132`) + `.adjP`/`.flagged`
   (`:137-138`), marked "display-only, does not affect flag" (`:196, :231`).
2. **Shape — Distributional.** The unit is a per-group (per-column) spread / distribution shape; wants
   a histogram or per-column spread plot.
3. **Renders today — `NoiseSpreadPlot`** (line 64, single-run path) + `ChartLegend` "Expected spread"
   band + `EvidenceTable` "Spread compared to expected, per column"; aggregated path `HBarPlot` of
   max/min variance ratio (lines 48-50).
4. **Gating answer.** The per-column marks gate on **neither** test as a verdict: the Finding column
   renders a hardcoded em-dash `{ value: "—" }` (line 97) and the caption states "The verdict is
   pooled across all columns — no single column is flagged on its own" (line 75). The Adj. p shown is
   the display-only Levene `d.adjP`, as magnitude context only. This is the S285 neutral retirement —
   the card does not gate per-column marks on the display-only Levene (which would be wrong) nor on the
   pooled Bartlett verdict (which makes no per-column decision).
5. **Disposition — KEEP.** `NoiseSpreadPlot` is an appropriate distributional/spread primitive; the
   per-column table is correctly de-marked. No per-column verdict to restore.

### 15. LOESS Residual Analysis
`src/tests/loessResidual.js` + `MiniCard_LOESS.jsx`

1. **Unit — multiple, primary spatial.** Sliding-window variance scan `allWindows.push({ startRow,
   endRow, winVar, ratio, direction })` (`:85-89`); CUSUM changepoint `cpRow` (`:115`); per-row noise
   `noiseProfile.push({ row, noise, fit })` (`:276`); per-region `regionComparison` (`:329-336`); per-
   pair promoter `pairResults.push({ pair, scanP, cusumP, combinedP, nRows })` (`:413-418`, report-only).
2. **Shape — Spatial / windowed.** The primary unit (window + changepoint + per-row noise sequence)
   is located along the row sequence with a changepoint boundary → strip / profile line.
3. **Renders today — `NoiseProfilePlot`** (lines 37-40, per-row noise line + LOESS trend + changepoint
   marker) + `ChartLegend` + "Region comparison" `EvidenceTable` (lines 52-70).
4. **Proposed — strip / profile line. Match.** `result.pairResults` has no in-card surface (a
   promotion driver only).
5. **Disposition — KEEP.** Per-pair promoter: DEFER (latent driver, no card surface needed).

### 16. Mahalanobis Row Outlier
`src/tests/mahalanobis.js` + `MiniCard_Mahalanobis.jsx`

1. **Unit — per row (Family B).** `outlierRows.push({ Row, Distance, "p-value" })` gated on
   `adjRowPvals[i] < ROW_ALPHA` (`:154-162`); plot arrays `plotD2`/`plotD2Rows` (`:217`),
   `outlierThreshold` = smallest D² among Stage-2 survivors (`:195-197`). A per-row D² with a BH-FDR
   survivor threshold.
2. **Shape — Spatial / row-strip (Family B).** Per spec §8: a per-row located D² item with a survivor
   threshold. (The plot is sorted by D² ascending, `:201`, so the rendered x-axis is rank-by-distance
   — a dotplot-vs-threshold rather than a strict row-position strip.)
3. **Renders today — `MahalanobisDistPlot`** (lines 75-85, distance dotplot with a dashed
   significance-threshold line, dots colored from the BH-FDR survivor set) + "Outlier rows"
   `EvidenceTable`.
4. **Proposed — dotplot-with-threshold. Match** (spec §8). The dashed `outlierThreshold` line is
   present; no mismatch.
5. **Disposition — KEEP.**

### 17. Blocked Mahalanobis
`src/tests/blockedMahalanobis.js` + `MiniCard_BlockedMahalanobis.jsx`

1. **Unit — (pass × condition) row-block.** BH-FDR across (pass × condition) units
   (`units.push({ pass:'mu'|'sigma', condition, rawP })`, `:569-570`); detail rows per window
   `detailRows.push({ source:'block', pass, passKey, condition, startRow, endRow, statType:'T²'|'λ',
   stat, rawP, adjP, significant, isBest })` (`:603-617`). `stat` is a magnitude (T²/λ_max).
2. **Shape — Spatial / windowed.** The unit is a row-block (`startRow–endRow`) per (pass × condition)
   → strip. It returns a `stat` magnitude but keeps **no per-element reference** to plot against, so it
   is not naturally a forest. Spec §2.5 open question (strip vs forest-with-derived-reference).
3. **Renders today — `RegionalNoiseStrip`** (lines 52-55, one "row" per pass·condition, opacity scaled
   by normalized `stat`, significant blocks only) + `EvidenceTable` "Blocks by adj-p" (Pass / Condition
   / Rows / Statistic / Adj. p, significant rows marked by a left edge).
4. **Proposed — strip (current) matches the spatial unit.** `stat` is shown only in the table, not as
   a forest axis. The §2.5 open question is answered in favour of strip in the current card.
5. **Disposition — KEEP** (strip), with spec §2.5 flagged as still open — a forest-with-derived-
   reference (T²/λ vs a derived null) remains a possible REBUILD if a magnitude axis is wanted. Has
   fixtures (DS15/21/22).

### 18. Within-Row Variance
`src/tests/withinRowVariance.js` + `MiniCard_WithinRowVariance.jsx`

1. **Unit — per row (Family B).** `flaggedRows.push({ row, z, direction:"too smooth"|"too noisy",
   rowMean, rowSD, expectedSD })` gated on `Math.abs(z) > Z_THRESH` (`:92-101`); plot array `zScores`
   (`:179-181`); `Z_THRESH = 4.0` exported (`:6`). A per-row within-row-SD z with a fixed |z|>4
   threshold. (A windowed-scan p sub-unit exists at Step 6 but is a promotion driver, not a display.)
2. **Shape — Spatial / row-strip (Family B).** Per spec §8: per-row located z with a fixed threshold.
3. **Renders today — z-score HISTOGRAM** (NOT a row-strip): inline `PlotSVG`, 40 bins over `zScores`,
   bars colored `CC.THRESH` when `|zMid| > Z_THRESH`, two dashed vertical lines at ±`Z_THRESH` (lines
   38-59) + legend + "Outlier rows" `EvidenceTable`.
4. **Proposed — row-strip-with-threshold (spec §8). MISMATCH.** The card renders a distributional
   histogram of z-scores with ±threshold lines — it shows the z-distribution shape, not the row
   positions. The per-row located information survives only in the evidence table; its sibling
   Mahalanobis Row implements the §8 dotplot-with-threshold correctly.
5. **Disposition — DEFER.** Latent — flag requires ≥3 smooth outliers AND >1% smooth fraction
   (`:149-151`), no flagged fixture. REBUILD candidate per §8 (row-strip of per-row z vs ±`Z_THRESH`,
   matching Mahalanobis Row), deferred absent a positive fixture.

---

## Specific source checks (folded in)

**IRC — `CorrMatrix` heatmap.** `src/components/plots/CorrMatrixSVG.jsx` exists and renders a
lower-triangle correlation matrix (header line 2: "SVG lower-triangle correlation matrix, responsive";
draws `labels.slice(0, ri+1)` per row, `nCols = nRows = n-1`, `:48-49, :104`). Generic and callback-
driven (`getValue`, `formatCell`, `cellBg`, `cellText`, `cellBold`, `cellOpacity`). Current call sites:
(1) `MiniCard_RankCorrelation.jsx:7, :81` (condition × condition ρ); (2)
`MiniCard_InterReplicateCorrelation.jsx:8, :134` (per-condition replicate × replicate r, currently
demoted below the forest); (3) `CoordResidualProfile.jsx:11, :315` (Section B "ρ correlation matrix").
**Reusable for an IRC restore — yes, already wired.** IRC builds per-condition matrices from
`pairDetails` (`:65-84`) and calls `CorrMatrixSVG` with cells reading the same `isPromotionTrigger`
field as the forest (`:89-93, :121-150`). The "restore" is promoting this existing surface ahead of
the forest — no new component work.

**Cross-Condition Duplication.** No test file by that name in `src/tests/`. It is a **removed test**
(`docs/shared/METHODOLOGY.md:402-404`: "~~1.4 Cross-Condition Duplication~~ — REMOVED (v0.8, S93) …
Zero detections across all 18 validation datasets … Redundant with Duplicate Detection (§1.1)";
agreed in `METHODOLOGY-MAP.md:273`). Its removed implementation compared **condition × condition** for
copied row-values — a pairwise unit — but its coverage was absorbed into `src/tests/duplicateDetection.js`
("Exact Duplicate Detection"), which is a **DETECTION-class** test (condition-blind row-hash), not one
of the 18 PER-UNIT-OR battery. Disposition: out of scope for the four-shape per-unit catalogue
(retired S93, no live per-unit surface).

**Kurtosis.** Confirmed the verdict-carrying unit is per-condition κ̂ vs the simulated null
(sequence-against-reference, `kurtosis.js:413-416`); latent (gated on a non-clear condition fixture);
the stored sim-null reference fields are retained (S288) for the pending forest. Entry 4 above.

**Row-Mean Runs.** Confirmed the windowed-promotion arm can promote to MODERATE with no condition dot
flagged (`:145-147`) and has **no in-card surface** — the same no-visible-driver gap IRC had before its
window-table connector. It may want the IRC connector-line-over-table treatment, or an overlay on the
existing `SignStripPlot`. Entry 3 above (REBUILD).

---

## Read-only confirmation

No source changed. No batch (nothing changed). This catalogue is the only output; delete it from the
worktree root before any future promote (the promote.sh untracked-content bug). Chat triages the
dispositions and locks them before any build is scoped.

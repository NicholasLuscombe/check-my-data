# Caption-surface audit (living reference)

State-only enumeration of every plot caption, secondary `EvidenceTable.footerText` caption,
and table/matrix heading across the card battery. No fixes, no recommendations. Strings quoted
verbatim from source at the listed line. Primary card footers (the `footer=` prop on
`MiniCardLayout` / `CardLayout`) are **out of scope** and not catalogued (that surface is done).

*Refreshed S212 (plot-standardisation arc): four entries had drifted against source after the
post-S199/S210 plain-English caption rewrites — the Autocorrelation footerText and three Carlisle
strings (plot caption tail, in-plot axis caption, table heading). Strings + line numbers updated
from source; two Carlisle surfaces reclassified MIXED → READS-TABLE (see summary count). One
re-quote is still pending (Autocorrelation footerText branches (b)/(c) — only (a) was in the S212
audit source read; flagged inline). One walk watch-item logged at the foot of the MIXED section
(Kurtosis axis-label verdict words).*

## Summary count

Counting distinct caption/heading **surfaces** (a multi-branch caption counts once; the branch
strings are all quoted in its row).

| Classification | Count |
|---|---|
| `READS-TABLE` | 29 |
| `EXPLAINS-METHOD` | 8 |
| `MIXED` | 7 |
| `FACTUAL-ERROR` | 0 |
| **Total surfaces** | **44** |

*(Counts updated S212 caption refresh: two Carlisle surfaces — the in-plot axis caption and the table heading — shifted MIXED → READS-TABLE after the post-S199/S210 plain-English rewrite dropped the "ANOVA" test-naming. MIXED 9→7, READS-TABLE 27→29; EXPLAINS-METHOD and total unchanged. The Carlisle plot caption was held in MIXED but its EXPLAINS half is now thin — see its row.)*

Breakdown by surface type: plot captions 6 · reference-line / axis labels (`refLabel`/`xlabel`) 8 ·
skipped-column captions 2 · secondary `footerText` 4 · table/matrix headings 24.

### Named-suspect dispositions (verify-don't-assume results)

- **Noise Scaling caption** — **NO factual error in current source.** Caption reads
  `Each dot = one row ({nPoints} rows).` — already says "one row" / "rows". `nPoints` binds to
  `points.length`, and `points` is built one entry per matrix **row**
  ([meanVariance.js:15–22](src/tests/meanVariance.js:15)), so the count is rows. The
  STATUS-listed "column-pairs vs rows" `FACTUAL-ERROR` is **not present** at the live emit site —
  appears already resolved. Classified `READS-TABLE`.
- **RSC ρ-matrix heading** — confirmed. String `Pairwise residual correlation (Spearman ρ)` at
  [CoordResidualProfile.jsx:245](src/components/plots/CoordResidualProfile.jsx:245). `EXPLAINS-METHOD`.
- **Blocked Mahalanobis / Windowed Autocorrelation / Autocorrelation** `footerText` — all three
  confirmed as carriers. The flagged-branch strings of the first two ("Rows with adj-p < … are
  highlighted. Sorted by adj-p ascending…") and all three Autocorrelation branches are
  `EXPLAINS-METHOD`; the LOW branches are `READS-TABLE` / `MIXED` (detailed below).

---

## EXPLAINS-METHOD (the offender class)

| Card | Surface | Component + location | Current string (verbatim) | Note |
|---|---|---|---|---|
| Noise correlation (Autocorrelation) | secondary `footerText` | [MiniCard_Autocorrelation.jsx:124](src/components/cards/MiniCard_Autocorrelation.jsx:124), `EvidenceTable footerText` | 3 branches (REWRITTEN to plain English post-S199/S210) — (a) `The pattern repeats at longer gaps (every 2–5 rows), not just between adjacent rows — that wider structure raised this to Moderate.` (b) the corroboration branch; (c) the primary-statistic branch. Dynamic; branches on `result.higherLagWasDecisive` / `result.higherLagPromoted`. Still describes the promotion rule / what the result means, not what the table shows — remains EXPLAINS-METHOD despite the plainer wording. Inline strings. *(Branches (b)/(c) verbatim re-quote pending — refreshed (a) from S212 plot-audit source read; re-quote (b)/(c) when next at the file.)* |
| Local noise correlation (Windowed Autocorr) | secondary `footerText` (flagged branch) | [MiniCard_WindowedAutocorr.jsx:79](src/components/cards/MiniCard_WindowedAutocorr.jsx:79) | `Rows with adj-p < 0.05 are highlighted. Sorted by adj-p ascending (most localised first).` | Flagged branch only (the `else` of `result.flag === "LOW"`). Explains highlight + sort convention + α. Inline. |
| Blocked Mahalanobis | secondary `footerText` (flagged branch) | [MiniCard_BlockedMahalanobis.jsx:74](src/components/cards/MiniCard_BlockedMahalanobis.jsx:74) | `Rows with adj-p < 0.01 are highlighted. Sorted by adj-p ascending (most localised first).` | Flagged branch only. Same shape as Windowed; note α differs (0.01 vs 0.05). Inline. |
| Cross-Condition Consistency | plot/table legend caption | [MiniCard_CrossCondConsistency.jsx:158](src/components/cards/MiniCard_CrossCondConsistency.jsx:158), `legendStyle` div under EvidenceTable | `Amber-tinted rows meet the forensic criterion: adj-p < {ALPHA.NOTE} AND the effect-size gate passes AND the direction is forensically actionable for that property (for Stage 1 properties, only "too similar" is actionable — honest conditions legitimately differ on span / MAD / CDF). Rows in muted text mark "informational" pairs: non-forensic-direction (typically "too different"), shown for transparency but not contributing to the flag. "Null median" is the median of the permutation distribution; "Direction" indicates which tail the observed distance sits in (similar = below median, different = above). HIGH (adj-p < {ALPHA.FLAG}) is unreachable for this framework at B={result.B} permutations — see METHODOLOGY §1.9 ¶8 (permutation-arithmetic limitation), so MODERATE is the strongest tier this test can report.` | Longest caption on the surface. Predominantly methodology (forensic criterion, permutation distribution, framework tier limitation). Does double as a column-glossary (defines "Null median" / "Direction"). Dynamic (`ALPHA.NOTE`, `ALPHA.FLAG`, `result.B`). Inline. |
| Column goodness-of-fit | skipped-column caption | [MiniCard_ColumnGoF.jsx:93](src/components/cards/MiniCard_ColumnGoF.jsx:93), `ColumnStatBar skippedClause` | `near-uniform shape outside the {Normal, Poisson, NB} family (v1.1: LogNormal, Gamma)` | Suffix to the auto-built "Cols … skipped" prefix (composed in [ColumnStatBar.jsx:209](src/components/plots/ColumnStatBar.jsx:209)). Explains the fitting-family methodology. Card-supplied inline string. |
| Modality | skipped-column caption | [MiniCard_Modality.jsx:70](src/components/cards/MiniCard_Modality.jsx:70), `ColumnStatBar skippedClause` | `near-uniform shape would dominate the uniform-reference null` | Same surface as ColumnGoF; explains why columns are excluded (null-reference methodology). Inline. |
| Residual Spike Correlation (RSC) | ρ-matrix heading | [CoordResidualProfile.jsx:245](src/components/plots/CoordResidualProfile.jsx:245), `SUB_HEAD` div above CorrMatrixSVG (Section B) | `Pairwise residual correlation (Spearman ρ)` | Named suspect — confirmed. Names the statistic; heading rendered only when `showRhoMatrix` (global mode). Inline. |
| Inter-Replicate Correlation (IRC) | matrix heading | [MiniCard_InterReplicateCorrelation.jsx:128](src/components/cards/MiniCard_InterReplicateCorrelation.jsx:128), `SUB_HEAD` above CorrMatrixSVG | `Pairwise Pearson r (all rows)` | Names the statistic (Pearson r). Per-condition CorrMatrixSVG `title` is the condition name, not methodology. Inline. |

---

## MIXED (reads + explains)

*S212 note: two rows below — Carlisle in-plot axis caption (`:44`) and Carlisle table heading
(`:74`) — are now classified READS-TABLE after the ANOVA-name drop; they remain physically in
this table to avoid reshuffling rows, tagged in their Note column. The Carlisle plot caption
(`:64`) is held here but its EXPLAINS half is thin post-rewrite.*

*Walk watch-item (S212, not a caption-table entry): `MiniCard_Kurtosis.jsx:57` carries
`xlabel="Noise shape index (negative = too uniform, positive = too peaked)"` — the axis label
still uses the "too uniform/too peaked" verdict words that S212 stripped from the per-chart
heading (Fix 3, now "flatter/more peaked/typical"). Open question for the visual walk: does an
axis-pole label count as orientation (legitimately naming what the poles mean) or as a verdict
re-entering through the axis? Eyes on the rendered plot, not a chat-side call.*

| Card | Surface | Component + location | Current string (verbatim) | Note |
|---|---|---|---|---|
| Noise correlation (Autocorrelation) | plot caption | [MiniCard_Autocorrelation.jsx:96](src/components/cards/MiniCard_Autocorrelation.jsx:96), `SUB_HEAD`-derived div under PlotLayout | 2 lead-in branches + shared tail: (a) `Lines are per-condition lag-k means` OR (b) `The line shows lag-k means across pairs` then `; dots are per-lag values. The mean ± 95% CI marker at lag 1 carries the verdict — average serial correlation across pairs is reliably above zero when the interval excludes the dashed reference.` | Lead-in reads the plot (what lines/dots are); tail explains the verdict-decision rule. Rendered only when `hasDecay`. Branches on `result.perGroupDecay?.length > 1`. Inline. |
| Blocked Mahalanobis | secondary `footerText` (LOW branch) | [MiniCard_BlockedMahalanobis.jsx:74](src/components/cards/MiniCard_BlockedMahalanobis.jsx:74) | `All windows are consistent with a single condition-wide covariance / mean structure.` | States the finding (no localised shift) but in method vocabulary ("covariance / mean structure"). LOW branch. Inline. |
| Local noise correlation (Windowed Autocorr) | secondary `footerText` (LOW branch) | [MiniCard_WindowedAutocorr.jsx:79](src/components/cards/MiniCard_WindowedAutocorr.jsx:79) | `All windows are consistent with independent noise in each pair (BH-FDR at α = 0.05).` | States the finding (independent noise) then appends the method/α parenthetical. LOW branch. Inline. |
| Carlisle Balance | plot caption | [MiniCard_CarlisleBalance.jsx:64](src/components/cards/MiniCard_CarlisleBalance.jsx:64), div under PlotLayout | `Bar height = count of features per p-value bin. Dashed line = expected under uniform.` + optional ` Highlighted bar = excess p-values near 1.0 (too balanced).` + tail (REWRITTEN post-S199/S210, KS-D clause replaced) ` How far the bars sit from the dashed expected line: {fmtPBadge(result.ksP)}.` | First two sentences read the plot. The tail no longer names KS-D — it now reads the plot ("how far the bars sit from the line"), so this surface has shifted toward READS-TABLE (the explicit method-statistic naming is gone; only the p-badge remains). Kept under MIXED pending the visual-walk read, but the EXPLAINS half is now thin. Dynamic; `direction === "too balanced"` gates the middle clause. Inline. |
| Carlisle Balance | in-plot axis caption | [MiniCard_CarlisleBalance.jsx:44](src/components/cards/MiniCard_CarlisleBalance.jsx:44), `<text>` in PlotSVG | `Per-feature p-value distribution (10 bins)` (REWRITTEN post-S199/S210 — "ANOVA" dropped, line shifted :43→:44) | No longer names the test; reads as a description of what the axis shows + binning. Shifted MIXED → READS-TABLE (the method-naming that put it in MIXED is gone). Static SVG caption. |
| Carlisle Balance | table heading | [MiniCard_CarlisleBalance.jsx:74](src/components/cards/MiniCard_CarlisleBalance.jsx:74), `SUB_HEAD` | `Balance across conditions, per feature` (REWRITTEN post-S199/S210 — "ANOVA" dropped, line shifted :73→:74) | No longer names the test; describes what the table shows. Shifted MIXED → READS-TABLE. Inline. |
| Selective Noise | table heading | [MiniCard_SelectiveNoise.jsx:114](src/components/cards/MiniCard_SelectiveNoise.jsx:114), `SUB_HEAD` | `Per-column variance test` | Names the statistic ("variance test"). Inline. |
| Noise correlation (Autocorrelation) | plot/table headings | [MiniCard_Autocorrelation.jsx:82](src/components/cards/MiniCard_Autocorrelation.jsx:82) & [:130](src/components/cards/MiniCard_Autocorrelation.jsx:130), `SUB_HEAD` | `Autocorrelation by lag` and `Pooled autocorrelation by lag` | Name the statistic but frame what is plotted/tabulated. Inline. |
| Column goodness-of-fit | reference-line caption | [MiniCard_ColumnGoF.jsx:91](src/components/cards/MiniCard_ColumnGoF.jsx:91), `ColumnStatBar refLabel` | `Expected (ratio = 1)` | "Expected" is the canonical null-role lead (S277 legend-vocab); "(ratio = 1)" reads the axis. Inline. (Was "Null median (ratio = 1)" pre-S277; converged to the Expected-leading frame.) |

---

## READS-TABLE (already states what the evidence shows — leave alone)

### Plot captions

| Card | Component + location | Current string (verbatim) | Note |
|---|---|---|---|
| Noise Scaling | [MiniCard_NoiseScaling.jsx:29](src/components/cards/MiniCard_NoiseScaling.jsx:29), div under PlotLayout | `Each dot = one row ({result.nPoints} rows). Solid line = observed fit{ with 95% CI band}. Dashed = expected for {assayLabel}.` | Named suspect — no factual error (see summary). `nPoints` = row count; CI clause gated on `se>0&&se<2`; `assayLabel` dynamic from `ASSAYS`. Inline. |
| Duplicate Detection | [MiniCard_DuplicateDetection.jsx:297](src/components/cards/MiniCard_DuplicateDetection.jsx:297), div in `detail` slot | `Colours mark separate groups of within-row duplicates.` | Reads the colour encoding. Static. |

### Reference-line / axis labels (`refLabel` / `xlabel` passed to plots)

| Card | Component + location | Current string (verbatim) | Note |
|---|---|---|---|
| Noise correlation (Autocorrelation) | [MiniCard_Autocorrelation.jsx:49](src/components/cards/MiniCard_Autocorrelation.jsx:49) | `refLabel="0 (independent)"` · `xlabel="Lag-1 autocorrelation of inter-replicate differences"` | Axis + reference-line label. Inline. |
| Kurtosis | [MiniCard_Kurtosis.jsx:57](src/components/cards/MiniCard_Kurtosis.jsx:57) & [:63](src/components/cards/MiniCard_Kurtosis.jsx:63) | `refLabel="≈ 0 (bell-shaped)"` · `xlabel="Noise shape index (negative = too uniform, positive = too peaked)"` · `refLabel="0 expected"` | Axis + reference-line labels. Inline. |
| Modality | [MiniCard_Modality.jsx:68](src/components/cards/MiniCard_Modality.jsx:68) | `refLabel="Multimodality threshold"` | Reference-line label. Inline. |
| Entropy | [MiniCard_Entropy.jsx:55](src/components/cards/MiniCard_Entropy.jsx:55) | `refLabel="Expected (ratio = 1)"` | Reference-line label. Inline. |
| Constant Offset | [MiniCard_ConstantOffset.jsx:35](src/components/cards/MiniCard_ConstantOffset.jsx:35) | `refLabel={`Expected (${expBlocks.toFixed(1)})`}` | Dynamic reference-line label. Inline. |
| Within-Row Variance | [MiniCard_WithinRowVariance.jsx:58](src/components/cards/MiniCard_WithinRowVariance.jsx:58), `<text>` | `z-score (SD vs expected)` | In-plot axis label. Static. |
| Missing Data Pattern | [MiniCard_MissingDataPattern.jsx:57](src/components/cards/MiniCard_MissingDataPattern.jsx:57)/[:61](src/components/cards/MiniCard_MissingDataPattern.jsx:61), `<text>` | (numeric tick labels + rotated axis label) | In-plot axis labels; no methodology prose. |

### Secondary `footerText` captions

| Card | Component + location | Current string (verbatim) | Note |
|---|---|---|---|
| Within-Row Variance | [MiniCard_WithinRowVariance.jsx:112](src/components/cards/MiniCard_WithinRowVariance.jsx:112) | `Showing 20 of {nOut}.` | Pure truncation note; `undefined` when `nOut ≤ 20`. Dynamic. |

### Table / matrix headings (`SUB_HEAD` section labels — descriptive, name what the table/plot shows)

| Card | Location | Current string (verbatim) |
|---|---|---|
| Blocked Mahalanobis | [:96](src/components/cards/MiniCard_BlockedMahalanobis.jsx:96) | `Flagged blocks by pass and condition` |
| Blocked Mahalanobis | [:106](src/components/cards/MiniCard_BlockedMahalanobis.jsx:106) | `Blocks by adj-p` |
| Benford | [:28](src/components/cards/MiniCard_Benford.jsx:28) | `Second digit frequencies` / `Leading digit frequencies` (branches on `isSecond`) |
| Column goodness-of-fit | [:110](src/components/cards/MiniCard_ColumnGoF.jsx:110)/[:119](src/components/cards/MiniCard_ColumnGoF.jsx:119) | `Flagged columns` |
| Constant Offset | [:62](src/components/cards/MiniCard_ConstantOffset.jsx:62) | `Constant-offset blocks per condition` |
| Constant Offset | [:69](src/components/cards/MiniCard_ConstantOffset.jsx:69) | `Detected constant-offset blocks` |
| Cross-Condition Consistency | [:151](src/components/cards/MiniCard_CrossCondConsistency.jsx:151) | `All property × pair comparisons` |
| Entropy | [:69](src/components/cards/MiniCard_Entropy.jsx:69)/[:78](src/components/cards/MiniCard_Entropy.jsx:78) | `Flagged columns` |
| Decimal Precision | [:33](src/components/cards/MiniCard_DecimalPrecision.jsx:33) | `Precision distribution` |
| Inter-Replicate Correlation | [:154](src/components/cards/MiniCard_InterReplicateCorrelation.jsx:154) | `Highly correlated row windows` |
| Mahalanobis | [:52](src/components/cards/MiniCard_Mahalanobis.jsx:52) | `Distance by row` |
| Mahalanobis | [:79](src/components/cards/MiniCard_Mahalanobis.jsx:79) | `Outlier rows` |
| Kurtosis | [:47](src/components/cards/MiniCard_Kurtosis.jsx:47) | `Distribution shape` |
| Kurtosis | [:69](src/components/cards/MiniCard_Kurtosis.jsx:69) | `Noise shape by condition` (+ inline `differs between conditions — promoted` badge when `condK.promoted`) |
| Kurtosis | [:131](src/components/cards/MiniCard_Kurtosis.jsx:131) | `Per-condition noise shape` |
| Missing Data Pattern | [:117](src/components/cards/MiniCard_MissingDataPattern.jsx:117) | `Per-column missing rate` |
| Missing Data Pattern | [:122](src/components/cards/MiniCard_MissingDataPattern.jsx:122) | `Spatial distribution` |
| LOESS | [:36](src/components/cards/MiniCard_LOESS.jsx:36) | `Row-by-row noise level` |
| LOESS | [:51](src/components/cards/MiniCard_LOESS.jsx:51) | `Region comparison` |
| Regional Noise | [:61](src/components/cards/MiniCard_RegionalNoise.jsx:61) | `Noise by region` |
| Regional Noise | [:71](src/components/cards/MiniCard_RegionalNoise.jsx:71) | `Anomalous windows` |
| Rank Correlation | [:70](src/components/cards/MiniCard_RankCorrelation.jsx:70) | `ρ by condition pair` |
| Modality | [:83](src/components/cards/MiniCard_Modality.jsx:83)/[:92](src/components/cards/MiniCard_Modality.jsx:92) | `Flagged columns` |
| Residual Spike Correlation | [:30](src/components/cards/MiniCard_ResidualSpike.jsx:30) | `Residual noise by condition` |
| Selective Noise | [:101](src/components/cards/MiniCard_SelectiveNoise.jsx:101) | `Spread by column` |
| Runs | [:173](src/components/cards/MiniCard_Runs.jsx:173) | `Pooled mean-z across pairs` |
| Runs | [:181](src/components/cards/MiniCard_Runs.jsx:181) | `Significant pairs` |
| Runs | [:213](src/components/cards/MiniCard_Runs.jsx:213) | `All replicate pairs` |
| Terminal Digit | [:25](src/components/cards/MiniCard_TerminalDigit.jsx:25) | `Terminal digit frequencies` |
| Value Frequency | [:83](src/components/cards/MiniCard_ValueFrequency.jsx:83) | `Over-represented values` |
| Within-Row Variance | [:95](src/components/cards/MiniCard_WithinRowVariance.jsx:95) | `Outlier rows` |
| Windowed Autocorr | [:106](src/components/cards/MiniCard_WindowedAutocorr.jsx:106) | `Flagged windows by pair` |
| Windowed Autocorr | [:116](src/components/cards/MiniCard_WindowedAutocorr.jsx:116) | `Windows by adj-p` |

> Note: `Runs:173` `Pooled mean-z across pairs`, `RankCorrelation:70` `ρ by condition pair`, and the
> two Autocorrelation lag headings name a statistic but predominantly describe what the
> plot/table shows; the borderline-method ones are listed under MIXED above. The headings in this
> READS-TABLE block name the contents/finding, not the test mechanics.

---

## Notes for the authoring arc

- **Two distinct caption shapes carry the EXPLAINS-METHOD load:** (1) the flagged-branch
  `footerText` on the three localised tests (Blocked Mahalanobis / Windowed Autocorr / Autocorr)
  all explain highlight + sort convention + α threshold; near-identical wording, candidate for a
  shared constant. (2) Statistic-naming headings (RSC `Spearman ρ`, IRC `Pearson r`, Selective
  Noise `variance test`). *(Carlisle's ANOVA-named heading + axis caption were here pre-S212; the
  plain-English rewrite dropped the test name, so Carlisle no longer belongs in this group — see
  the S212 reclassification note.)*
- **`ColumnStatBar` is shared** across ColumnGoF / ValueFrequency / Modality / Entropy; the
  `refLabel` / `skippedClause` strings are card-supplied (inline per-card), composed by
  `composeSkippedLine` ([ColumnStatBar.jsx:209](src/components/plots/ColumnStatBar.jsx:209)).
- **No `FACTUAL-ERROR` found.** The Noise Scaling rows-vs-column-pairs concern from STATUS is not
  present at the live emit site — the caption already reads "one row" / "rows" and `nPoints`
  binds to the row count.
- All caption/heading strings are **inline per-card** except the `composeSkippedLine` prefix and
  the `EvidenceTable` truncation footer mechanic; none are sourced from a shared copy constant.

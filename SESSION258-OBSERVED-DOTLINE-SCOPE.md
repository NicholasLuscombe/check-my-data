# S258 — Observed dot/line surface classification (read-only)

Arc 2 of the fill-treatment programme covers observed marks drawn as **dots** and
**lines** — the marks Arc 1 (S255) skipped because they need per-surface,
render-gated treatment rather than one blanket opacity. This is the structure-first
classification pass. No source was changed; nothing was built. Treatments are the
next dispatch.

Token reference (`src/constants/tokens.js`):
`CC.OBS` = `ACCENT.BLUE.color` = `#3B82F6` (observed blue) · `CC.EXP` = `CHART.EXP`
= `#0D9488` (expected / null teal) · `CC.THRESH` = `SIGNAL.RED.dot` (flag red) ·
`C.TEXT` (neutral dark) · `OBS.areaFill` = `{fill: CC.OBS, fillOpacity: 0.35, stroke: CC.OBS, strokeOpacity: 1}`.
Legend swatches render through `ChartLegend.jsx`, which paints `item.color` at
`item.opacity ?? 1` — so a swatch with no `opacity` field renders at full opacity
regardless of what the mark uses.

## Scope decisions

- **Bars, tiles, strips, heatmaps are Arc 1** and excluded here even when they draw
  inline: `VBarPlot`/`HBarPlot`/`KurtosisDistPlot`/`ColumnStatBar` bars,
  `CorrMatrixSVG`/`MissingDataHeatmap`/`CoordResidualProfile` tiles,
  `SignStripPlot`/`RegionalNoiseStrip` strips.
- **Expected/null curves are not observed marks** and are excluded: `VBarPlot`'s
  expected polyline (`VBarPlot.jsx:45`, `CC.EXP`), `KurtosisDistPlot`'s simulated
  normal curve (`KurtosisDistPlot.jsx:77`, `CC.EXP`), `MiniCard_Kurtosis`'s
  `miniSimPath` (`:170`, `CC.EXP`). The **one** observed-*derived* line that wears
  a null colour — the LOESS fit — is in scope and called out below (S2).
- All reference lines, axes, gridlines, CI whiskers, error-bar caps, and threshold
  dashes are chrome, not observed data marks, and are excluded.

## Surface table

| # | Component · draw line(s) | Mark colour token/literal (verbatim) | Mark opacity (verbatim) | Shared plot or inline | Flag/verdict plumbed to mark? | Legend swatch (token · opacity · type) |
|---|---|---|---|---|---|---|
| 1 | `NoiseProfilePlot.jsx:53` (line), `:55` (dots) — observed noise series | `stroke={CC.OBS}` / `fill={CC.OBS}` | line `opacity="0.4"`; dots `opacity="0.5"` | shared → `MiniCard_LOESS` | **No** — drawn unconditionally, no flag reaches the marks | `MiniCard_LOESS.jsx:50` `{CC.OBS, "Row noise", opacity 0.5, line}` (swatch 0.5 matches dots, not the 0.4 line) |
| 2 | `NoiseProfilePlot.jsx:58` — **LOESS fit line** | `stroke={CC.EXP}` | `opacity="0.85"` | shared → `MiniCard_LOESS` | **No** — always teal, drawn unconditionally | `MiniCard_LOESS.jsx:51` `{CC.EXP, "LOESS trend", line}` — no opacity field → swatch renders at 1.0 (mark 0.85) |
| 3 | `MeanVarianceScatter.jsx:103` — scatter dots (one per row) | `fill={CC.OBS}` `stroke="none"` | `opacity="0.35"` | shared → `MiniCard_NoiseScaling` | **No** — always `CC.OBS` | None. No `ChartLegend`; only the in-SVG slope legend (S4) + caption "Each dot = one row" |
| 4 | `MeanVarianceScatter.jsx:111-112` — observed slope line (`obsCol = CC.OBS`, `:39`) | `stroke={obsCol}` (`CC.OBS`) | `opacity="0.95"` | shared → `MiniCard_NoiseScaling` | **No** — `obsCol` is unconditionally `CC.OBS` | In-SVG legend line `MeanVarianceScatter.jsx:116` `stroke={obsCol}` (`CC.OBS`), no opacity (mark 0.95) |
| 5 | `MahalanobisDistPlot.jsx:200-201` (outlier), `:203-204` (normal) — distance dots | outlier `fill={CC.THRESH}`; normal `fill={s.color}` (condition `.text`, or `CC.OBS` for the pooled "All data" branch, `:36`) | outlier `opacity={0.85}` (white 1.5 stroke); normal `opacity={0.5}` | shared → `MiniCard_Mahalanobis` | **Yes** — per-row outlier membership (`isOutlierAt` ← `outlierRowsByCond`/`pooledOutlierRows`) selects red vs blue | `MiniCard_Mahalanobis.jsx:49` per-condition dot (cond `.text`); `:52` `{CC.OBS, "Normal", dot, opacity 0.55}` (pooled branch; mark 0.5); `:54` `{CC.THRESH, "Outlier", dot}` no opacity (mark 0.85) |
| 6 | `NoiseSpreadPlot.jsx:68-69` (whisker), `:71-75` (caps), `:77-78` (centre dot); `color` at `:63` | `stroke={color}`/`fill={color}`, `color = isOutlier ? CC.THRESH : CC.OBS` | whisker/caps `opacity={isOutlier ? 1 : 0.8}`; centre dot **no opacity attr** (=1), `stroke={C.WHITE}` | shared → `MiniCard_SelectiveNoise` | **Yes** — `isFlagged(d)` via `flaggedCols` Set / `outlierCol`; `flag` prop gates the median band | `MiniCard_SelectiveNoise.jsx:106` `{CC.OBS, "Consistent with rest", line}` no opacity; `:107` `{CC.THRESH, "Differs from rest", line}` |
| 7 | `DotStrip.jsx:38-39` — per-pair dots; `col` at `:37` | `fill={col}`, `col = sig===true?CC.THRESH : sig===false?CC.OBS : PLOT_FC[d.flag]||CC.OBS` | `opacity="0.7"` (white 0.8 stroke) | shared → `MiniCard_Autocorrelation` (lag-1 fallback, `colorKey="significant"`) **and** `MiniCard_Kurtosis` (`:56-58`, `colorKey="significant"`) | **Yes** — per-dot `d.significant` / `d[colorKey]` / `PLOT_FC[d.flag]` | None in either host: Autocorrelation's `legendItems` is `null` on the DotStrip fallback; Kurtosis's DotStrip branch renders no `ChartLegend` |
| 8 | `AutocorrDecayPlot.jsx:86` (polyline), `:88` (dots); `col` at `:82` | `stroke={col}`/`fill={col}`, `col = c.group==="All data" ? CC.OBS : (condColorMap?.[c.group]?.text || GROUP_COLORS[ci%…])` | line `opacity="0.7"`; dots `opacity="0.8"` | shared → `MiniCard_Autocorrelation` | **No** — per-lag decay carries no flag; the verdict lives on the separate PooledR1Marker (S9) | `MiniCard_Autocorrelation.jsx:120-125` per-condition `{cond.text, label, opacity 0.7, line}` (matches line 0.7; dots 0.8) + r=0 `CC.EXP` line |
| 9 | `MiniCard_Autocorrelation.jsx:66-67` — **PooledR1Marker** verdict dot | `fill={C.TEXT}` `stroke={C.WHITE}` 1.5 | none (=1) | **inline** (`PooledR1Marker` defined inside the card, `:25-81`) | **No** colour plumbing — always `C.TEXT`; the verdict is read from the CI whisker's position vs `r = 0`, not from the mark | `MiniCard_Autocorrelation.jsx:152` `{C.TEXT, "Pooled lag-1 mean ± verdict-edge CI", dot}` no opacity |
| 10 | `MiniCard_Runs.jsx:60-61` — **PooledZMarker** verdict dot | `fill={C.TEXT}` `stroke={C.WHITE}` 1.5 | none (=1) | **inline** (`PooledZMarker` defined inside the card, `:26-81`) | **No** colour plumbing — always `C.TEXT`; verdict read from CI vs `z = 0` | `MiniCard_Runs.jsx:192` `{C.TEXT, "Pooled mean-z ± verdict-edge CI", dot}` no opacity |

## Two named surfaces — resolved at source

### Noise-level-trend LOESS (Surface 2)

Confirmed. The LOESS fit is `NoiseProfilePlot.jsx:58`,
`<path d={fitPath} fill="none" stroke={CC.EXP} strokeWidth={CS.FIT.w} opacity="0.85"/>`.
Its legend swatch is `MiniCard_LOESS.jsx:51`,
`{ color: CC.EXP, label: "LOESS trend", swatchType: "line" }`.

**Both the plot mark and the swatch read `CC.EXP` — the null-reference teal
(`#0D9488`).** This is an observed-*derived* line (a smooth of the observed noise
series, S1) currently wearing the expected/null colour. State reported only; no
reclassification proposed — that is the next dispatch's call. The swatch carries no
`opacity` field, so it renders at 1.0 against the mark's 0.85.

### Carlisle Baseline Balance + Within-Row Variance — inline draws

Both draw their observed marks **inline** (not via a shared plot), and the premise
that they bypass the shared plot layer is confirmed. But the marks are **histogram
bars (`<rect>`), not dots or lines** — they belong to Arc 1's area-fill mark class,
not Arc 2's dot/line scope.

- **Carlisle** — `MiniCard_CarlisleBalance.jsx:85-86`:
  `<rect … fill={fill} fillOpacity="0.35" stroke={fill} strokeWidth="1" />`, where
  `fill = (i === 9 && isFlagged) ? SIGNAL.RED.dot : CC.OBS` (`:84`). Flag-plumbed
  (the 0.90–1.0 driving decile turns red when the verdict fires). Swatch
  `:125` `{ CC.OBS, "Features per p-value bin", opacity 0.35 }`.
- **Within-Row Variance** — `MiniCard_WithinRowVariance.jsx:47-48`:
  `<rect … fill={fill} fillOpacity="0.35" stroke={fill} strokeWidth="1" />`, where
  `fill = isOutlier ? SIGNAL.RED.dot : CC.OBS` (`:46`, `isOutlier` keyed on the
  ±`Z_THRESH` z-band). Flag-plumbed. Swatch `:89-90` `{ CC.OBS, "Within expected
  range", opacity 0.35 }`.

**Hardcoded token + opacity:** both use bare literals `fillOpacity="0.35"` +
same-token `stroke` + `strokeWidth="1"`. **This matches `OBS.areaFill` exactly** —
same value (0.35), same crisp full-opacity same-token 1px stroke. No drift in the
*value*; the drift is only that they are bare literals rather than the
`OBS.areaFill` token. So they are inline Arc 1 area-fill surfaces that were never
routed through the S255 token, not dot/line surfaces.

## Split

**(a) By mark type**

- **Dots:** S1 (also a line), S3, S5, S6 (also a line), S7, S8 (also a line), S9, S10.
- **Lines/curves:** S1 (obs series line), S2 (LOESS fit), S4 (observed slope),
  S6 (error-bar whisker), S8 (decay polyline).
- Surfaces drawing **both** a line and dots for the same series: S1
  (NoiseProfile observed), S6 (NoiseSpread whisker + centre dot), S8 (AutocorrDecay
  curve + per-lag dots).

**(b) Shared plot vs inline**

- **Shared plot:** S1, S2, S3, S4, S5, S6, S7, S8 (eight surfaces across six plot
  components: NoiseProfilePlot, MeanVarianceScatter, MahalanobisDistPlot,
  NoiseSpreadPlot, DotStrip, AutocorrDecayPlot).
- **Inline (drawn in the card):** S9 (PooledR1Marker, in MiniCard_Autocorrelation),
  S10 (PooledZMarker, in MiniCard_Runs). Plus the two **bar** surfaces (Carlisle,
  Within-Row Variance) that are inline but out of dot/line scope.

**(c) Flag/verdict plumbed vs flag-agnostic**

- **Flag-plumbed (a flag/membership decision reaches the mark colour):** S5
  (per-row outlier membership), S6 (per-column flagged set), S7 (per-dot
  `significant`/`flag`).
- **Flag-agnostic (mark colour fixed regardless of verdict):** S1, S2, S3, S4, S8,
  S9, S10. Of these, S9 and S10 still *carry* the verdict — but through the CI
  whisker's geometry against the zero reference, never through the dot's colour
  (always `C.TEXT`).

## Counts

- **Distinct observed dot/line surfaces: 10** (8 shared-plot + 2 inline). The two
  inline bar surfaces (Carlisle, Within-Row Variance) are reported but excluded from
  this count — they are area-fill bars, not dots/lines.
- **Distinct opacity values on observed dot/line marks: 8** — `0.35`, `0.4`, `0.5`,
  `0.7`, `0.8`, `0.85`, `0.95`, and `1.0` (the implicit value where no `opacity`
  attribute is set: NoiseSpread centre dot, both verdict markers).

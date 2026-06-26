# S269 — Held-decision re-establishment audit (parked #15, the S260 five-item bucket)

READ-ONLY. No edits, no batch, no decisions. Source read against the worktree at
HEAD (`b7000ad`) on 2026-06-27; token equivalences grounded in `src/constants/tokens.js`
and rulings in `docs/shared/PLOT-COLOUR-SEMANTICS.md`.

## What changed since the S260 census
The mechanical tier shipped at `4e430c9` (observed-mark `0.35` → `OBS.areaFill.fillOpacity`,
table tints → `withAlpha`, exact `#FFFFFF` → `C.WHITE`). All five held items were left
untouched by instruction. Sessions S261–S268 touched several of the host files (Carlisle,
Within-Row Variance, Kurtosis, IRC, RankCorr, ColumnStatBar, NoiseSpread, MissingData) but
**not** the held literals — every one named below is still live, at the line cited. Line
numbers have drifted a little from the census; the citations here are re-verified at HEAD.

Anchor equivalences (tokens.js): `CC.THRESH === SIGNAL.RED.dot === #EF4444` (tokens.js:164/50);
`CC.WARN === SIGNAL.AMBER.dot === #F97316` (164/51); `ACCENT.GOLD.color === #D97706` (61);
`CC.OBS === ACCENT.BLUE.color === #3B82F6` (164/58); `OBS.areaFill.fillOpacity === 0.35`,
`OBS.dot.fillOpacity === 0.7` (182/192); `SIGNAL.RED.border === #FECACA` (50).

---

## (a) The #17 flag-red alias — STILL-OPEN (mixed sub-dispositions)

**Located literals (flag marks drawn via `SIGNAL.RED.dot`, the byte-identical alias of `CC.THRESH`):**

| Site | Literal | Draws | Class |
|---|---|---|---|
| [MiniCard_CarlisleBalance.jsx:84](src/components/cards/MiniCard_CarlisleBalance.jsx:84) | `SIGNAL.RED.dot` | flagged balance bar fill | STILL-OPEN |
| [MiniCard_CarlisleBalance.jsx:126](src/components/cards/MiniCard_CarlisleBalance.jsx:126) | `SIGNAL.RED.dot` (opacity already `OBS.areaFill.fillOpacity`) | flagged companion swatch | RULED-NOT-YET-APPLIED |
| [MiniCard_WithinRowVariance.jsx:45](src/components/cards/MiniCard_WithinRowVariance.jsx:45) | `SIGNAL.RED.dot` | outlier histogram bar fill | STILL-OPEN |
| [MiniCard_WithinRowVariance.jsx:54](src/components/cards/MiniCard_WithinRowVariance.jsx:54) | `stroke={SIGNAL.RED.dot}` | ±Z flag-boundary line colour | STILL-OPEN (colour only; width/dash are the separate #19d geometry parked item) |
| [MiniCard_WithinRowVariance.jsx:88](src/components/cards/MiniCard_WithinRowVariance.jsx:88) | `SIGNAL.RED.dot` (opacity already `OBS.areaFill.fillOpacity`) | "Outside ±Zσ" swatch | RULED-NOT-YET-APPLIED |
| [MiniCard_MissingDataPattern.jsx:130](src/components/cards/MiniCard_MissingDataPattern.jsx:130) | `stroke: SIGNAL.RED.dot` | "Significant block" swatch | STILL-OPEN |
| [MissingDataHeatmap.jsx:7](src/components/plots/MissingDataHeatmap.jsx:7) | `BLOCK_STROKE = SIGNAL.RED.dot` | significant-block outline (plot twin of :130) | STILL-OPEN |
| [MiniCard_MissingDataPattern.jsx:13](src/components/cards/MiniCard_MissingDataPattern.jsx:13) | `withAlpha(SIGNAL.RED.dot, 0.45)` | missing-cell fill | already token-sourced (alias context only) |
| [MiniCard_InterReplicateCorrelation.jsx:89](src/components/cards/MiniCard_InterReplicateCorrelation.jsx:89),[:102](src/components/cards/MiniCard_InterReplicateCorrelation.jsx:102) | `TIER_COLOR.HIGH` | suspicious correlation cell + swatch | RESOLVED-IN-SOURCE |
| [MiniCard_RankCorrelation.jsx:39](src/components/cards/MiniCard_RankCorrelation.jsx:39),[:52](src/components/cards/MiniCard_RankCorrelation.jsx:52) | `TIER_COLOR.MID` | suspicious rank cell + swatch | RESOLVED-IN-SOURCE |

**RULED-NOT-YET-APPLIED (the two companion swatches).** The `observedSwatchColor` resolver
exists ([tokens.js:228](src/constants/tokens.js:228)): `flag => (HIGH||MODERATE) ? CC.THRESH : CC.OBS`,
and its definition comment states verbatim *"The next step routes the companion-swatch cards
through the same resolver, retiring their second swatch."* Both swatches render only in the
flagged branch, so the resolver returns `CC.THRESH` for them — a known mechanical edit dictated
by a token-def comment, not a decision. Their opacity half was already routed in S260.

**RESOLVED-IN-SOURCE (the two heatmap-tier cards).** Both are token-sourced through
`TIER_COLOR.HIGH/MID` (`heatmapColors.js` re-export of `HEATMAP_TIER`), and the per-cell heatmap
channel is *ruled a deliberately separate channel* — PLOT-COLOUR-SEMANTICS "Matrix carve-out
(ruled S254)" + the census' own "do not silently collapse." Decision made: keep distinct.

**STILL-OPEN — what is unresolved.** Which of the three byte-identical red token paths
(`CC.THRESH` === `SIGNAL.RED.dot` === `#EF4444`) is *canonical for a chart flag mark*. A
battery sweep shows the overwhelming convention is `CC.THRESH` (HBar, VBar, Kurtosis, Mahalanobis,
DotStrip, RegionalNoise, NoiseProfile, NoiseSpread bar, LOESS, SelectiveNoise, BlockedMahal,
Modality, DupDet all use it); the Carlisle / Within-Row Variance / Missing-Data bar+line+stroke
sites are the holdouts on `SIGNAL.RED.dot`. No intervening ruling names a canonical token, so the
collapse call (almost certainly *adopt `CC.THRESH`*, but unmade) stays open. **Do not decide here.**

## (b) The two emphasis opacities — STILL-OPEN

| Site | Literal | Draws |
|---|---|---|
| [ColumnStatBar.jsx:161](src/components/plots/ColumnStatBar.jsx:161) | `isFlagged ? 0.55 : OBS.areaFill.fillOpacity` | flagged column-stat bar emphasis |
| [NoiseSpreadPlot.jsx:78](src/components/plots/NoiseSpreadPlot.jsx:78) | `fillOpacity={isOutlier ? 1 : OBS.dot.fillOpacity}` | outlier spread dot at full opacity |

**STILL-OPEN — what is unresolved.** No treatment token carries a *flagged/outlier-emphasis*
opacity. `OBS.*` ([tokens.js:181-193](src/constants/tokens.js:181)) defines only clear-state
opacities (areaFill/solid/strip 0.35, dot 0.7, line 0.85). Channel 4 rules the flag *hue* (red)
but is silent on flag-mark *opacity*. The decision: invent a flagged-emphasis treatment (a token
for the 0.55 bar emphasis and the 1.0 outlier-dot emphasis) **or** rule that flagged marks render
at full saturation and these become derived. Both `0.55` and `1` are bare per-plot emphases with
no token and no governing ruling.

## (c) The amber-500 / slate-floor literals — SPLIT (amber-500 STILL-OPEN; slate floor RESOLVED)

**amber-500 `#F59E0B` (= `rgba(245,158,11,…)`) — STILL-OPEN:**

| Site | Literal | Draws |
|---|---|---|
| [ImportView.jsx:709](src/components/views/ImportView.jsx:709),[:794](src/components/views/ImportView.jsx:794),[:852](src/components/views/ImportView.jsx:852) | `3px solid #F59E0B` | REQUIRED / precondition left-stripe (×3) |
| [ExcerptTable.jsx:450](src/components/forensics/ExcerptTable.jsx:450) | `fill={hit ? "#F59E0B" …}` | minimap hit marker |
| [buildHighlightSpec.js:28](src/analysis/buildHighlightSpec.js:28) | `LOESS_ANOMALOUS_TINT = "rgba(245,158,11,0.15)"` | LOESS warm changepoint tint |
| [buildHighlightSpec.js:50](src/analysis/buildHighlightSpec.js:50) | `"rgba(245,158,11,0.25)"` | within-row pair amber tint |

Decision: mint an amber-500 token, or collapse the near-match to an existing amber —
`SIGNAL.AMBER.dot #F97316` ([tokens.js:51](src/constants/tokens.js:51)) or
`ACCENT.GOLD.color #D97706` ([tokens.js:61](src/constants/tokens.js:61)). `#F59E0B` sits between
them, neither exact. These are chrome + table surfaces, outside PLOT-COLOUR-SEMANTICS' plot-interior
scope (governed by INVESTIGATION-DISPLAY-SPEC), so no plot ruling settles it — genuinely open.

**slate floor `#DAE1EA` — RESOLVED-IN-SOURCE (by ruling):**

| Site | Literal | Draws |
|---|---|---|
| [CoordResidualProfile.jsx:33](src/components/plots/CoordResidualProfile.jsx:33) | `STRIP_GRAD_FROM = "#DAE1EA"` | residual-strip low-end slate floor |
| [CoordResidualProfile.jsx:44](src/components/plots/CoordResidualProfile.jsx:44) | `rgb()` lerp args `(218,225,234)` | the same endpoint as decimal RGB |

PLOT-COLOUR-SEMANTICS "Dense magnitude surfaces → Floor and nulls" names `#DAE1EA` **verbatim**
as the ruled floor (*"floor `#DAE1EA` on background `#F8FAFC`"*), and the "Maintenance note — two
slate→amber→red definitions, kept apart on purpose" rules the residual gradient a **deliberately
separate definition** with an explicit *"do NOT 'unify' them"* and an in-source comment to that
effect. The colour decision is made: this is a deliberate local floor value, not a held
token-routing decision. It was carried into the held bucket in error — the dense-magnitude ruling
already closed it. (Tokenizing it under a *name* is a hygiene nicety, but the routing/collapse
*decision* the held bucket is about does not apply: the ruling says keep it local.)

## (d) The near-neutral colour literals — STILL-OPEN

| Site | Literal | Draws | Nearest token |
|---|---|---|---|
| [TestCardLayout.jsx:66](src/components/shared/TestCardLayout.jsx:66) | `1px solid #E5E7EB` | test-card border (gray-200) | `C.BORDER_L #E2E8F0` (not exact) |
| [ReportView.jsx:1102](src/components/views/ReportView.jsx:1102),[:1206](src/components/views/ReportView.jsx:1206) | `borderTop: 1px solid #E0E0E0` | finding-list dividers | `C.BORDER_L #E2E8F0` (not exact) |

**STILL-OPEN — what is unresolved.** Both sit a half-step off `C.BORDER_L`. The decision: collapse
the near-match to `C.BORDER_L` (a sub-perceptual but **non-byte-identical** shift — which is why
S260's mechanical tier explicitly left `#E5E7EB`, "non-exact … left") **or** mint exact tokens.
Chrome borders, outside the plot-interior scope; no ruling settles the collapse-vs-mint call.

## (e) The ERROR colour literal(s) — STILL-OPEN

| Site | Literal | Draws | Candidate |
|---|---|---|---|
| [thresholds.js:16](src/constants/thresholds.js:16) | `border:"#fca5a5"` (red-300) | ERROR badge border | `SIGNAL.RED.border #FECACA` |
| [thresholds.js:16](src/constants/thresholds.js:16) | `dot:"#dc2626"` (red-600) | ERROR badge dot | `SIGNAL.RED.dot #EF4444` |

**STILL-OPEN — what is unresolved.** Whether the lighter border (`#fca5a5`) and darker dot
(`#dc2626`) are *deliberate alarm-distinct shades* (an alarm state intentionally redder/lighter than
the severity reds) or should collapse to the `SIGNAL.RED` tokens. The thresholds.js:5–6 comment
exempts ERROR's **label form** from the tier-word casing canon ("ERROR is an alarm-state lexeme")
but says nothing about its **colour** — so no token-def comment or PLOT-COLOUR ruling settles the
shade choice. (ERROR is an error-path state; [ExcelMetaCard.jsx:75](src/components/cards/ExcelMetaCard.jsx:75)
is its one renderer — live, not absent.)

---

## (4) Same-class literals the S260 five-item enumeration did NOT name

1. **NoiseSpreadPlot outlier labels — STILL-OPEN (same as (a)).**
   [NoiseSpreadPlot.jsx:81](src/components/plots/NoiseSpreadPlot.jsx:81),
   [:89](src/components/plots/NoiseSpreadPlot.jsx:89) draw `fill={isOutlier ? SIGNAL.RED.dot : …}`.
   The *same plot's* error bar uses `CC.THRESH` ([:63](src/components/plots/NoiseSpreadPlot.jsx:63)) —
   an internal split (bar = `CC.THRESH`, labels = `SIGNAL.RED.dot`) that demonstrates the alias is
   live and unresolved. Same canonical-red-token decision as (a); not in census #17.

2. **Residual-heatmap canonical severity hexes — RESOLVED (by ruling).**
   [CoordResidualProfile.jsx:36](src/components/plots/CoordResidualProfile.jsx:36)
   `STRIP_GRAD_MID = "#F97316"` and [:37](src/components/plots/CoordResidualProfile.jsx:37)
   `STRIP_GRAD_TO = "#EF4444"` (+ rgb decimal duplicates at :44/:47) are bare-hex copies of the
   canonical severity amber/red on a colour surface, not named in the five items. Same class of
   "bare severity colour literal," but the "two definitions kept apart on purpose — do NOT unify"
   maintenance note governs them (their inline comments already label them "canonical"). Flagged for
   completeness; not a held decision.

3. **Mahalanobis outlier-dot opacity — STILL-OPEN-adjacent (same class as (b)).**
   [MahalanobisDistPlot.jsx:201](src/components/plots/MahalanobisDistPlot.jsx:201) `opacity={0.85}`
   and its swatch mirror [MiniCard_Mahalanobis.jsx:58](src/components/cards/MiniCard_Mahalanobis.jsx:58)
   `opacity: 0.85` are bare flag-mark emphasis opacities with no token — the same untokenized
   emphasis-opacity class as (b)'s 0.55 / 1.0, not named among "the two." (Overlaps the separately
   parked #19d line-geometry inventory, which is why the census filed it there rather than in class 1.)

---

## Tally

Counting the five lettered items by primary disposition, treating (c) as the split it is, plus the
three new finds:

- **STILL-OPEN — 4½ items + 2 finds:** (a) [canonical red-token choice for chart flag marks],
  (b) [flagged/outlier-emphasis opacity treatment], (d) [near-neutral border collapse-vs-mint],
  (e) [ERROR alarm-shade deliberate-vs-collapse], and the **amber-500 half of (c)** [mint-vs-collapse];
  new finds: NoiseSpread outlier labels (→ a), Mahalanobis 0.85 outlier-dot opacity (→ b).
- **RESOLVED-IN-SOURCE — ½ item + 1 find:** the **slate-floor half of (c)** (`#DAE1EA`, ruled the
  deliberate dense-magnitude floor, do-not-unify); new find: residual canonical `#F97316`/`#EF4444`
  hexes (same do-not-unify ruling). Also, *within (a)*: the two `TIER_COLOR` heatmap-tier cards
  (ruled a deliberately distinct per-cell channel).
- **RULED-NOT-YET-APPLIED — 0 whole items; 2 sub-sites inside (a):** the Carlisle:126 and
  Within-Row-Variance:88 companion swatches, which the `observedSwatchColor` resolver + its token-def
  comment already dictate routing (→ `CC.THRESH`); a known mechanical edit, not a decision.
- **ABSENT — 0:** every literal named in the S260 enumeration is still live in source.

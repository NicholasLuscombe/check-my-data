# Plot colour semantics

The colour system for plot interiors. Its job: every plot, read as a standalone
figure, encodes the same meaning with the same colour — so a reader who learns
"red = anomalous" on one card is not misled on the next. This is the Bik-standard
applied at the encoding level: the visual must carry a *reliable* argument.

Scope is the **plot interior** — the marks that carry data (lines, dots, bars,
cells, reference lines). Card chrome (cluster stripe, MechIcon, breadcrumb, verdict
badge) is governed separately by INVESTIGATION-DISPLAY-SPEC and is not touched here.

Derived from the S213 read-only plot colour audit (15 live plot components,
source-verified). The audit catalogued the current state; this doc defines the
target; the per-plot conformance table at the end maps one to the other.

## The five channels

Colour on a plot does one of five jobs. Each job owns its hue family; no job may
borrow another's.

**1 — Anomaly / severity. Red family, reserved absolutely.**
Red means "anomalous", in three forms of expression:
- Solid red — a categorical flag mark (outlier dot, flagged cell, flagged bar).
- Faded / dashed red — a flag-*boundary* reference line (e.g. a significance
  threshold). Subordinate to the marks it bounds: dashed and reduced-opacity so it
  reads as reference, not as the flagged thing itself.
- Two-regime magnitude ramp — a neutral resting floor below the flag threshold,
  handing off to amber→red above it. The floor is a single cool-neutral (slate)
  carrying "below threshold, not flagged"; amber→red carries magnitude in the flagged
  range (more red = more anomalous). The handoff sits at the flag threshold, so the
  colour break itself reads as the categorical "this crossed the line". The floor is a
  flat resting colour, not the low pole of a ramp — it must not read as a low-anomaly
  *signal*, only as "off". Slate, not blue: blue is spent on observed (channel 4),
  condition-1, and the neutral sign two-tone, so a blue floor would be a fourth
  competing blue on a dense card.
Amber belongs to the anomaly/severity channel only — the Moderate tier and the upper
reach of the magnitude ramp. **No other channel may use red or amber.** This is
the one wall that cannot leak: a condition, an observed series, or an expected line
must never render red or amber.

**2 — Condition identity. Eight non-severity hues, end-to-end from import.**
Which condition a mark belongs to. Drawn from `COND_COLORS` (see palette below),
the same map the import-view condition chips use — so "Treatment = magenta" on the
import chip is the same magenta on every plot line for that condition. One shade
(`.text`) and one fallback everywhere.

**3 — Data role. Teal for expected/null; grey for neutral reference.**
- Expected / null-model prediction — the curve or line showing what clean data
  would look like (LOESS fit, Poisson slope, simulated null, expected digit
  frequency). Teal (`CC.EXP`), standardised. Simulated and analytic nulls share the
  teal — a reader does not benefit from distinguishing them.
- Neutral reference — a baseline that carries no verdict (zero line, grand-mean
  line, expected-value line). Grey, dashed. Distinct from the flag-boundary red
  reference of channel 1: a grey dashed line is "here is the baseline", a faded-red
  dashed line is "here is the cutoff past which marks are flagged".

**4 — Observed data. Blue.**
The measured data itself — observed bars, scatter points, observed lines. Blue
(`CC.OBS`). The one collision risk is a low-tier blue inside an intensity ramp
(see `TIER_COLOR`, below); that is retired by channel 1's single-hue red ramp.

**5 — Mechanism / cluster. Frame accent only.**
Cluster identity (`MECH_COLOR`) stays card chrome — stripe, icon, breadcrumb — and
never enters the plot interior. A reader does not need the plot's data marks to
re-state which cluster the card belongs to; the frame already carries it. (A
cluster-coloured accent on the plot *container* is permissible as it echoes the
card frame; the interior marks are governed by channels 1–4.)

## The condition palette

`COND_COLORS`, eight entries, `.text` shade, none in the severity red/amber family.
The original palette held red (entry 2), amber (entry 4), and rose (entry 7), which
collided with severity; those three are replaced.

| # | Hue | `.text` hex | Status |
|---|---|---|---|
| 1 | blue | `#1E40AF` | kept |
| 2 | green | `#065F46` | kept |
| 3 | purple | `#5B21B6` | kept |
| 4 | cyan | `#155E75` | kept |
| 5 | lime | `#3F6212` | kept |
| 6 | magenta | `#9D174D` | replaces old red — clears severity red at plot scale |
| 7 | ochre | `#854D0E` | replaces old amber — clears severity amber at plot scale |
| 8 | slate | `#334155` | replaces old rose — neutral, collides with nothing |

The `.bg` and `.border` shades of each entry are regenerated to match the new
`.text` hue (kept entries unchanged). Condition marks read the `.text` shade
uniformly — the audit found `.border` used in one plot and `.text` in another;
`.text` wins everywhere.

**Overflow past 8 conditions.** Hue carries conditions 1–8. The realistic ceiling
of distinguishable non-severity hues on a white ground is about this many; adding
more hurts separation rather than helping. Past 8, recycle the palette with a
second channel: condition N+8 takes hue-N plus a line-dash or marker-shape
modifier. No current fixture exceeds three conditions, so this is specified now and
built when a dataset needs it — building it untested against no positive anchor
would be premature.

## Reference lines — two kinds

The audit found reference lines mixing two roles under one treatment. They split:

| Kind | Role | Colour | Dash |
|---|---|---|---|
| Neutral baseline | zero, grand-mean, expected-value | grey (`C.TEXT_3`) | `CS.REF` (`4,3`) |
| Expected / null curve | LOESS fit, Poisson slope, sim null | teal (`CC.EXP`) | solid or `CS.REF` |
| Flag boundary | significance threshold, cutoff | faded/dashed red | `CS.REF`, reduced opacity |

A flag-boundary line keeps red (it is about the same anomaly as the marks it
bounds) but is dashed and faded so it reads as subordinate reference, not as a
flagged mark. A neutral baseline never uses red.

## One severity scale (ruled)

The audit surfaced that severity had two colour sets in use at once — visible on a
single card, where the four-dot tier indicator used one set and the verdict words
used another:
- **Chrome words** (the pre-ruling `SEV_VERDICT`): red `#c0392b` / orange `#D97706`
  / green `#16a34a`.
- **Dots + plots** (`PLOT_FC` / `CC.THRESH`): red `#EF4444` / amber `#F97316` /
  green `#22C55E`.

So the same card showed two greens and two ambers that did not match. **Ruled: one
severity scale, the brighter triple** — red `#EF4444`, amber `#F97316`, green
`#22C55E`. The dot-ramp already used it; the verdict words and plot marks align to
it. Rationale: the dots are the card's most prominent severity signal and already
carried the bright set, the bright set is legible as small verdict text (confirmed
on a live card), and aligning words up to dots is a smaller perceptual change than
dimming dots down to words.

`SEV_VERDICT`'s three hex values are edited to the bright triple. Because every
severity surface reads from that one constant, the edit unifies chrome words, the
four-dot tier ramp, and (via the plot retoken below) plot marks in one move — there
is no longer a chrome-vs-plot severity distinction, only severity.

Blast radius: the `SEV_VERDICT` edit repaints every verdict word, badge, tint, and
the tier ramp across all chrome surfaces. Output is byte-identical (presentation
only), so the batch does not gate it; the check is a chrome visual sweep, which
folds into the full-battery visual walk already on the programme. The four-dot tier
ramp is a `SEV_VERDICT` consumer and updates with it — no separate edit.

## TIER_COLOR ramp (ruled — S214, corrected within session)

The S214 colour fix first retoked `TIER_COLOR` to a single-hue red intensity ramp, to
kill the blue-low / observed-blue collision in the old blue→amber→red ramp. Live
review the same session found single-hue red compressed not-significant / elevated /
high into indistinguishable pinks — the collision was gone but the low range was no
longer legible.

Ruled: `TIER_COLOR` is a two-regime ramp — a slate-neutral resting floor below the
flag threshold, handing off to amber→red above it. The break sits at the flag
threshold, so the colour change reads as the categorical "this crossed the line";
amber→red carries magnitude in the flagged range. Slate floor, not blue: blue is
already spent on observed (channel 4), condition-1, and the neutral sign two-tone, so
a blue floor would be a fourth competing blue on a dense card. Amber-mid was never the
problem — blue-low was — so this keeps the amber→red the old ramp had and replaces
only the blue floor.

The floor is a flat resting colour, not the low pole of a ramp: it signals "off / not
flagged", not "low anomaly". Per-consumer caveat: any `TIER_COLOR` surface that
overlays observed marks (`CC.OBS` blue) on the ramped cells must confirm the slate
floor reads distinct from `CC.OBS` on that surface.

## Per-plot conformance

What each of the 15 live plots changes. "OK" = already conforms. Dead components
(ConstOffsetStrip, IRCSegmentStrip, ObsVsExpPlot) are excluded — not mounted.

| Plot | Current | Change |
|---|---|---|
| AutocorrDecayPlot | condition line reads `.border`; fallback `CHART.SERIES` | read `.text`; fallback to new `COND_COLORS` ordering |
| ColumnStatBar | flagged bar = `SEV_VERDICT` tier ramp; neutral grey | OK — tier ramp confirmed; picks up unified `SEV_VERDICT` triple automatically |
| DotStrip | outlier dot red `CC.THRESH`; expected band teal | OK — flag red now the unified `SEV_VERDICT` red |
| HBarPlot | bars fixed blue `CC.OBS`; ref line teal | OK |
| VBarPlot | expected line defaults to blue `CC.OBS` | expected line → teal `CC.EXP` (currently miscoloured as observed) |
| KurtosisDistPlot | observed blue; sim-null teal solid | OK |
| MahalanobisDistPlot | dots `.text`; outlier solid red; threshold line solid red | threshold line → faded/dashed red (channel 1 flag-boundary); dots/outlier OK |
| MeanVarianceScatter | observed blue; expected slope teal | OK |
| MissingDataHeatmap | missing cells + block outline red | OK (red = anomalous, intensity/flag) |
| NoiseProfilePlot | observed blue; LOESS teal; changepoints red | OK (changepoint = detected anomaly) |
| NoiseSpreadPlot | flagged error bar = amber `CC.WARN` | "outlier" → align to red (currently amber, the two-colour-outlier split) |
| RegionalNoiseStrip | window fill red, opacity-ramped | OK (red intensity ramp) |
| RowMeanTrendPlot | sim line mint `CC.EXP_SOFT`; crossing/run two-tone neutral | mint → teal `CC.EXP` (fold simulated into expected); two-tone OK |
| SignStripPlot | sign two-tone (Oxford/Cambridge blue), neutral | OK (neutral categorical, not flag) |
| CorrMatrixSVG / consumers | cells via `TIER_COLOR` | `TIER_COLOR` is the two-regime slate→amber→red ramp (S214, corrected within session from the first single-hue red retoken) |
| CoordResidualProfile | residual ramp; matrix via `rhoColor` | follows the `TIER_COLOR` two-regime ramp; per-consumer observed-blue overlap check applies |

**Shared-lever changes** (one retoken, battery-wide):
- `TIER_COLOR` → two-regime ramp: slate-neutral floor (below threshold) → amber → red
  (magnitude above threshold), break at the flag threshold. Corrected within S214 from
  the first single-hue red retoken (see ruling note below). Applies identically to every
  consumer (CorrMatrixSVG, CoordResidualProfile matrix, IRC matrix). Per-consumer
  caveat: any surface that overlays observed-blue (`CC.OBS`) marks on the ramped cells
  needs the floor confirmed distinct from `CC.OBS`.
- `COND_COLORS` → the eight-hue palette above (fixes every condition consumer).
- Condition shade → `.text` everywhere (fixes the `.border`/`.text` split).

**Per-plot tail** (individual edits):
- VBarPlot expected line → teal.
- MahalanobisDistPlot threshold line → faded/dashed red.
- NoiseSpreadPlot outlier → red (resolve the amber/red outlier split).
- RowMeanTrendPlot mint → teal.

**Severity scale (ruled — see above):** edit `SEV_VERDICT` to the bright triple
(`#EF4444` / `#F97316` / `#22C55E`); retoken `PLOT_FC` / `CC.THRESH` to read from
`SEV_VERDICT` (or those same values) so plot flag marks, chrome words, and the
four-dot tier ramp are one scale. No flag-hue rows remain blocked.

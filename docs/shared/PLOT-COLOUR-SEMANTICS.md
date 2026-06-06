# Plot colour semantics

The colour system for plot interiors. Its job: every plot, read as a standalone
figure, encodes the same meaning with the same colour — so a reader who learns
"red = anomalous" on one card is not misled on the next. This is the Bik-standard
applied at the encoding level: the visual must carry a *reliable* argument.

Scope is the **plot interior** — the marks that carry data (lines, dots, bars,
cells, reference lines) — and the **plot axis furniture** (ticks, tick labels, axis
lines, axis titles, axis reference labels). Axis furniture is a third category,
neither data marks nor card chrome: it is the navigational frame a reader needs to
decode the marks, and it must be legible on the plot panel without competing with
the data. Card chrome (cluster stripe, MechIcon, breadcrumb, verdict badge) is
governed separately by INVESTIGATION-DISPLAY-SPEC and is not touched here.

Derived from the S213 read-only plot colour audit (15 live plot components,
source-verified), extended by the S216 axis-chrome read-only (the two rendering
paths and the C.TEXT_3 wash on sparse plots). The audit catalogued the current state;
this doc defines the target; the per-plot conformance table at the end maps one to the
other.

## The five channels

Colour on a plot does one of five jobs. Each job owns its hue family; no job may
borrow another's.

**1 — Anomaly / severity. Red family, reserved by role.**
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
  *signal*, only as "off". Slate, not blue: a blue floor would set up a blue→red
  anomaly axis (blue = low anomaly, red = high), making blue a *signal* in the ramp;
  slate stays neutral and reads as "off / not flagged" rather than as the cool end of a
  scale.
Amber belongs to the anomaly/severity channel — the Moderate tier and the upper
reach of the magnitude ramp. **The wall is about role, not hue.** A severity colour
(red, amber, the cleared green) is reserved where severity is *read* — the verdict
word, the dot ramp, the flag marks, the magnitude ramp. It is not reserved across the
whole hue. A condition line, an observed series, or an expected curve may sit in the
red / amber / green family, because a reader resolves a mark's meaning from what it is
and where it sits (a line on a per-condition plot, a flag dot on the verdict ramp),
not from hue alone. The only live constraint is local: a condition mark should be
clear of a severity colour *when it would sit directly alongside a flag mark of that
colour on the same plot* — an adjacency check, not a global exclusion. (This corrects
the earlier "no condition in the severity family" framing, which was too broad: it
banned green from conditions though a condition line never reads as "cleared", and the
avoidance manufactured near-collisions worse than the natural hue.)

**2 — Condition identity. A wheel of distinct hues, end-to-end from import.**
Which condition a mark belongs to. Drawn from `COND_COLORS` (see palette below),
the same map the import-view condition chips use — so "Treatment = lime" on the
import chip is the same lime on every plot line for that condition. The line reads the
`.text` shade; the import chip reads `.bg` (pale fill) plus `.text` (label), so each
entry's `.bg` / `.border` are tints/shades of the same hue — one hue per condition
across both surfaces. Hues are chosen for mutual separation as lines; a severity hue
is allowed unless it would sit directly beside a flag mark of that colour (channel 1's
role-not-hue rule). Past the palette depth, recycle hue with a line-style modifier.

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
(`CC.OBS`). Note observed-blue is not reserved *against* conditions: on a per-condition
plot the line is observed data for that condition, so condition-blue and observed-blue
are the same mark, not a collision. The only real constraint is the `TIER_COLOR` ramp
floor (channel 1): a surface that overlays observed-blue marks on ramped cells needs
its floor confirmed distinct from `CC.OBS` — but the audit found no `TIER_COLOR`
surface does this, so it does not bite today.

**5 — Mechanism / cluster. Frame accent only.**
Cluster identity (`MECH_COLOR`) stays card chrome — stripe, icon, breadcrumb — and
never enters the plot interior. A reader does not need the plot's data marks to
re-state which cluster the card belongs to; the frame already carries it. (A
cluster-coloured accent on the plot *container* is permissible as it echoes the
card frame; the interior marks are governed by channels 1–4.)

## Axis furniture — legible navigation, one darkness (ruled — S216)

Axis furniture is the navigational frame, not a data channel: it carries no verdict,
no condition, no magnitude. Its only job is to be readable enough to decode the marks,
without competing with them. The S216 axis-chrome read-only found this was failing on
the sparse plots, and found why.

**The two rendering paths.** Plots split into two paths, and the split *is* the
contrast story:
- **Path A — inline-text plots** (~17 XY/strip plots, every sparse lead case): each
  plot hand-writes its own `<text>` / `<line>` elements. Tick labels and axis titles
  at `C.TEXT_3`; axis lines at `C.BORDER`. These do not route through the shared
  helper.
- **Path B — `SvgAxis` / `SvgLabel` helper** (only 2 consumers: `CorrMatrixSVG`,
  `CoordResidualProfile` — the dense matrices/heatmaps): the `tick` and `axis` roles
  resolve to `C.TEXT_2` (darker).

So the sparse plots that wash out are Path A (`C.TEXT_3` on the slate-100 panel); the
dense matrices that read fine are Path B (`C.TEXT_2`). The gap is not random — it is
exactly the path split. The dense plots also carry contrast via their own data marks;
the sparse plots have little ink, so faint furniture has nothing to hide behind.

**Ruled — one darkness for all axis text.** Tick labels, axis titles, and axis
reference labels (the `z = 0` / `r = 0` annotations) all read `C.TEXT_2`. This is the
darkness Path B already uses; the fix brings Path A up to it. Reference-line labels
darken *with* ticks and titles rather than staying recessive — subordination of a
reference line is carried by its **dash** (`CS.REF`), not by faint text. (This amends
the channel-3 / reference-line ruling, which previously assigned the neutral baseline
label `C.TEXT_3`; see the reference-line section. The channel-3 "neutral recedes"
logic was about not using *red* on a baseline — don't imply a flag — not a brightness
argument, so darkening the grey does not violate it.)

**Ruled — a dedicated axis-line token, `C.AXIS`.** Axis lines and tick marks move off
`C.BORDER` (slate-300, marginal against the slate-100 panel) onto a new dedicated
token `C.AXIS`, set one step darker than `C.BORDER` but lighter than the `C.TEXT_2`
axis text. Axis lines conventionally sit *between* panel and text: darker than the
panel border so they read as structure, lighter than the tick numbers so the line does
not compete with the labels it carries. No existing token sits at that mid-point, which
is why the role gets its own token rather than reusing `C.TEXT_2` (too heavy — line
competes with text) or `C.BORDER` (too light — the wash being fixed). Exact `C.AXIS`
hex is set from swatches and **confirmed on the live render at implementation** — a
chat-side pixel read of a mid-grey stroke on a tinted panel at screenshot resolution is
unreliable.

**Structural target, not 17 spot-edits.** The contrast gap exists because Path A is
off the shared rail — the same shape as the S215 type-scale divergence (literals off
the `CF` rail). The fix routes Path A's axis *text* through the `SvgLabel` `tick` /
`axis` / reference roles so it inherits `C.TEXT_2` by construction and future plots are
correct by default; it does not paper 17 inline literals. The helper renders labels
only — it draws no axis line — so the line / tick-mark strokes stay inline but adopt
`C.AXIS`. (The line geometry is per-plot and bespoke; only its stroke token is shared.)

## The condition palette

`COND_COLORS`, eight entries, lighter register, ordered so the common first-three case
spreads across the wheel. Hues are chosen for mutual separation as thin lines, not for
avoiding the severity family (channel 1's role-not-hue rule). The line reads `.text`;
the import chip reads `.bg` (pale fill) + `.text` (label), so each entry's `.bg` /
`.border` are tints/shades of its `.text` hue — one hue per condition across import and
plot.

| # | Hue | `.text` hex |
|---|---|---|
| 1 | blue | `#3B82F6` |
| 2 | lime | `#84CC16` |
| 3 | purple | `#A855F7` |
| 4 | cyan | `#06B6D4` |
| 5 | pink | `#EC4899` |
| 6 | green | `#10B981` |
| 7 | amber | `#D97706` |
| 8 | slate | `#64748B` |

The `.bg` (pale fill) and `.border` (mid shade) of each entry are regenerated to match
its `.text` hue. Condition marks read the `.text` shade uniformly — the audit found
`.border` used in one plot and `.text` in another; `.text` wins everywhere.

Watch-pairs, both benign in the 22-set: lime (2) and green (6) only co-occur at 6+
conditions; amber (7) is clear of severity amber unless a condition line sits directly
beside an amber flag mark — neither bites at current fixture depth. The earlier dark
palette swapped blue/green order to fix a blue↔dark-green line collapse; the lighter
register and lime-in-slot-2 resolve that. Exact lighter hexes were set from swatches
and confirmed on the live render at implementation.

**Overflow past 8 conditions.** Hue carries conditions 1–8. The realistic ceiling
of mutually distinguishable hues on a white ground is about this many; adding
more hurts separation rather than helping. Past 8, recycle the palette with a
second channel: condition N+8 takes hue-N plus a line-dash or marker-shape
modifier. No current fixture exceeds three conditions, so this is specified now and
built when a dataset needs it — building it untested against no positive anchor
would be premature.

## Reference lines — two kinds

The audit found reference lines mixing two roles under one treatment. They split:

| Kind | Role | Colour | Dash |
|---|---|---|---|
| Neutral baseline | zero, grand-mean, expected-value | grey (`C.TEXT_2`) | `CS.REF` (`4,3`) |
| Expected / null curve | LOESS fit, Poisson slope, sim null | teal (`CC.EXP`) | solid or `CS.REF` |
| Flag boundary | significance threshold, cutoff | faded/dashed red | `CS.REF`, reduced opacity |

A flag-boundary line keeps red (it is about the same anomaly as the marks it
bounds) but is dashed and faded so it reads as subordinate reference, not as a
flagged mark. A neutral baseline never uses red. The neutral-baseline *label* reads
`C.TEXT_2` (amended S216 from `C.TEXT_3`): it is axis furniture and shares the one
axis-text darkness; the line's subordination is carried by its dash, not by faint
text (see "Axis furniture").

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

## Dense magnitude surfaces — reserve by curve, not by tier (ruled — S214)

`TIER_COLOR`'s two-regime ramp suits a *sparse categorical* surface: a handful of
cells, each a discrete verdict, read individually (the IRC and correlation matrices).
A *dense continuous-magnitude* surface — every cell carries a continuous value, the
whole field read at once — needs different handling. The residual heatmap in
CoordResidualProfile is the case that established this.

A dense magnitude heatmap uses the **same canonical flag colours** as everything else
— slate floor → amber `#F97316` → red `#EF4444`, the unified severity reds and ambers
— but reserves the warm end by a **gamma curve** on the normalised intensity before
colour selection, rather than by a threshold break. CoordResidualProfile uses
`RESID_GAMMA = 1.5`: most cells stay cool, amber appears for the upper-mid, full
canonical red is reached only by genuinely high cells. The curve *compresses* the
low-mid toward the floor but does not *flatten* it (strictly monotonic on [0,1], no two
intensities collapse to one colour), so the mid-range variation that carries the
surface's argument survives. This matters because the residual heatmap's argument is
that the whole residual *pattern* correlates across conditions, not just that a few
rows spike — a threshold break or raised floor would crush the correlation-bearing mid.

Why curve, not threshold: a continuous surface has no categorical "crossed the line"
to encode — the residual-spike test computes no per-row significance threshold (only a
relative top-decile rank, with the verdict from a dataset-level permutation p). There
is no cutoff to break the ramp at, so the warm end is reserved by curve instead.

**Floor and nulls (dense magnitude heatmaps).** The floor sits *just above* the strip
background (CoordResidualProfile: floor `#DAE1EA` on background `#F8FAFC`) so the lowest
values read as a gentle rise from the canvas, not a darker shelf — and every cell is
painted (no sub-threshold skip), so there are no undrawn near-white holes inside the
field. A genuine null (a row with no usable value in a condition) maps to the floor,
the same as the lowest value: on a magnitude surface, absent correctly reads as
"lowest / not a spike here", so no separate no-data treatment is used.

**Maintenance note — two slate→amber→red definitions, kept apart on purpose.** The
matrices (`TIER_COLOR`, two-regime linear) and the dense residual heatmap (canonical
colours, gamma-reserved) therefore hold two definitions of the same colour family at
different effective treatments. This is intentional, not drift — do NOT "unify" them.
If the canonical flag reds/ambers ever change, both must move together.
CoordResidualProfile carries an inline comment to this effect.

**Severity-red token names.** The unified severity red (`#EF4444`) is referenced under
four token names across the codebase (S214 audit, grep-confirmed at commit time):
`SEV_VERDICT` (rank-3 `.color`), `PLOT_FC` (`HIGH`), and `CC.THRESH` — all three reading
the canonical primitive `SIGNAL.RED.dot` — plus `TIER_COLOR` (`HIGH`, re-exported from
`HEATMAP_TIER.HIGH.color`), which carries the `#EF4444` literal directly. If the
canonical red ever changes, `SIGNAL.RED.dot` and `HEATMAP_TIER.HIGH.color` are the two
source-of-truth edits the four names resolve through.

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
| CoordResidualProfile | residual ramp; matrix via `rhoColor` | residual heatmap = canonical colours + gamma reserve (`RESID_GAMMA = 1.5`, floor `#DAE1EA`, nulls-to-floor; see "Dense magnitude surfaces"), NOT the `TIER_COLOR` two-regime ramp; matrix unchanged (`rhoColor`) |

**Axis-furniture changes (S216 — apply across Path A inline plots):**
- Axis *text* (ticks, axis titles, reference labels) → route through the `SvgLabel`
  `tick` / `axis` / reference roles so it inherits `C.TEXT_2`; no inline `fill={C.TEXT_3}`
  literals remain on axis text. Path B (CorrMatrixSVG, CoordResidualProfile) already at
  `C.TEXT_2` — no change.
- Axis lines + tick marks → `C.AXIS` (new token; replaces inline `stroke={C.BORDER}` on
  axis furniture). Line geometry stays per-plot; only the stroke token is shared.
- The facet of *which* plots carry axis titles and how caption zones are placed is a
  separate read-only (title/caption presence inventory) — not settled here; this section
  rules colour/stroke only.

**Shared-lever changes** (one retoken, battery-wide):
- `TIER_COLOR` → two-regime ramp: slate-neutral floor (below threshold) → amber → red
  (magnitude above threshold), break at the flag threshold. Corrected within S214 from
  the first single-hue red retoken (see ruling note above). Applies to the sparse
  categorical matrix consumers (CorrMatrixSVG, IRC matrix). **The CoordResidualProfile
  residual heatmap does NOT use `TIER_COLOR`** — it uses the canonical-colours + gamma
  treatment for dense magnitude surfaces (see that section); only its `rhoColor` matrix
  is a separate concern. Per-consumer caveat: any `TIER_COLOR` surface that overlays
  observed-blue (`CC.OBS`) marks on the ramped cells needs the floor confirmed distinct
  from `CC.OBS`.
- `COND_COLORS` → the reordered, relightened palette above, with `.bg` / `.border`
  regenerated per entry to match each new `.text` (fixes every condition consumer and
  keeps the import chip matching the plot line).
- Condition shade → `.text` everywhere (fixes the `.border`/`.text` split).
- `C.AXIS` → new dedicated axis-line/tick-mark stroke token (S216); axis text → `C.TEXT_2`
  via the helper rail (S216).

**Per-plot tail** (individual edits):
- VBarPlot expected line → teal.
- MahalanobisDistPlot threshold line → faded/dashed red.
- NoiseSpreadPlot outlier → red (resolve the amber/red outlier split).
- RowMeanTrendPlot mint → teal.

**Severity scale (ruled — see above):** edit `SEV_VERDICT` to the bright triple
(`#EF4444` / `#F97316` / `#22C55E`); retoken `PLOT_FC` / `CC.THRESH` to read from
`SEV_VERDICT` (or those same values) so plot flag marks, chrome words, and the
four-dot tier ramp are one scale. No flag-hue rows remain blocked.

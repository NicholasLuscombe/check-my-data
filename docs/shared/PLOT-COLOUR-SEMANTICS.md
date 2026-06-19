<!-- ⚠ VERIFY BEFORE REPLACING. This full file = the live tracked PLOT-COLOUR-SEMANTICS.md as of
     S250 close, with the S250 condition-colour edits merged in. Changes this pass (S250): channel 2
     amended with the signal-sensitivity surface split + the tint-not-text rule for the import
     span-header + condition identity declared a sanctioned non-signal channel; the `COND_COLORS`
     palette table reordered (blue moved slot 0→5) with rationale updated; the AutocorrDecayPlot
     conformance row and the row-13 provenance one-liner updated to reflect the fallback now reading
     `CC.OBS` (S250). Prior pass (S247): grand-mean → fitted-trend reconciliation for row-mean-runs,
     RowMeanTrendPlot RETIRED. Before overwriting the tracked copy, confirm it has not drifted since:
     `git log -1 -- docs/shared/PLOT-COLOUR-SEMANTICS.md` and diff. If anything landed after this read,
     merge rather than overwrite. "Committed" ≠ "content-current."
     Two placeholders are DELIBERATELY left blank (fill from a source grep at COMMIT time, not memory):
     the four severity-red token names (§"Dense magnitude surfaces" → "Severity-red token names") and
     the `FF.MONO` tick-rail precondition. Do not fill them from this file. -->

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
  *Note (data-model amendment, see channel 4): "the cleared green" is read on chrome —
  verdict words, badges, the dot ramp — NOT on observed plot marks. On an observed mark
  clear is blue, not green; green-clear is retired on marks. The list above keeps green
  as a chrome severity colour; it is not a licence for green-clear on a plot mark.*

**2 — Condition identity. A wheel of distinct hues, end-to-end from import.**
Which condition a mark belongs to. Drawn from `COND_COLORS` (see palette below),
the same map the import-view condition chips use — so "Treatment = lime" on the
import chip is the same lime on every plot line for that condition. The line reads the
`.text` shade; the import chip reads `.bg` (pale fill) plus `.text` (label), so each
entry's `.bg` / `.border` are tints/shades of the same hue — one hue per condition
across both surfaces. Hues are chosen for mutual separation as lines; a severity hue
is allowed unless it would sit directly beside a flag mark of that colour (channel 1's
role-not-hue rule). Past the palette depth, recycle hue with a line-style modifier.

*Keying (S250). Condition colour is keyed for both file structures from one display-layer
source. Column-grouped data (two-row header) populates `condPerCol`; row-grouped data
(condition-in-a-column — DS21 `Condition`, DS03 `Group`) has no `condPerCol`, so a sibling
derivation (`rowConditionLabels`) reconstructs the same per-row condition-label strings the
engine derives (mirrors `engine.js:135-142` — same `" | "` join, `.trim()`, null-filter), and
`buildCondColorMap(importConfig)` resolves either path to one map. Colour reads the grouping;
it never writes it — condition colour is display-only, zero verdict-path contact. The derivation
is mirrored, not threaded out of `condCtx.names`, because import-side surfaces build the map
pre-analysis when no `condCtx` exists; the duplicated join logic is pinned with a comment naming
its engine twin.*

**Surface split: plot lines vs chrome cells (S250).** Condition identity occupies two kinds of
surface, and the collision constraint differs between them. On a **plot line / mark** (a
per-condition autocorrelation line, a D² series, a kurtosis sparkline) the hue reads
unambiguously as series identity — there is no signal-coloured mark on the same plot to confuse
it with, so a condition hue byte-equal to a signal hue (condition-blue == observed-blue
`#3B82F6`) is benign. This is **signal-benign**. On a **chip, table cell, or coloured label**
(import condition chip, a per-condition table's condition-name cell, the import span-header band)
the same hue is decoded against the role/signal palette that shares the surface — there, blue is
read as the data-role / observed hue, not as condition identity. A condition hue equal to a signal
hue is a **collision**. This is **signal-sensitive**.

Two rules follow:

1. **Palette order keeps signal hues out of the common case.** `COND_COLORS` is ordered so the
   hue byte-identical to a signal colour does not land on the first conditions. Blue (`.text`
   `#3B82F6`, == `CC.OBS`) is at slot 5, not slot 0 — so the realistic 1–3-condition case
   (lime/purple/cyan) carries no signal hue on any signal-sensitive surface. (S250 reorder; the
   prior order had blue at slot 0, which lit the first condition on the data-role/observed channel
   wherever it appeared on a chrome surface.)

2. **On the most sensitive chrome surface, identity moves to the fill (tint-not-text).** The
   import condition span-header band (`ColumnHeaders`) carries identity on `.bg` (the pale fill)
   and renders its label in neutral `C.TEXT`, **not** the condition `.text` hue — because the band
   sits one row directly above the data-role-blue chips, where a `#3B82F6` *label* is a second blue
   identity claim competing with the role chip. Tint-not-text separates the channels (identity =
   fill, role = chip) permanently, at any condition depth — it removes the channel conflict that a
   reorder alone only relocates to a deeper index. The Zone-1 / Zone-4 summary chips still read
   `.text`: they are not adjacent to a data-role-blue element, so the collision does not arise there
   (S250: the collision is span-header-only; the chip tint was deliberately not applied — don't
   apply the fix where there's nothing to fix).

**Condition identity is a sanctioned non-signal channel on signal-sensitive surfaces.** A condition
hue may equal a signal hue on a plot line (benign), but on a chip/cell/label it must stay clear of
the signal hues — achieved by palette order (signal hues demoted past the common case) and, on the
span-header, by tint-not-text. This is the channel-1 "role not hue" rule read from the condition
side: the same hue is a collision or not depending on the surface's other marks, not on the hue
alone.

**3 — Data role. Teal for the null; observed marks take channel 4.**
A reference line on a plot is exactly one of two things, told apart by *function* —
what the verdict is read against — not by geometry (a flat line vs a traced curve is
not a meaningful distinction; a flat null is as much a prediction as a curved one).

- **Null — what clean / fabrication-free data sits at, the value the verdict is read
  as departure from.** Teal (`CC.EXP`), dashed, standardised. This is one role
  regardless of shape: a simulated-null density, a LOESS fit, an analytic slope, a
  flat κ≈0 / r=0 / ratio=1 line, the expected-uniform histogram line — all teal. "Null"
  includes three readings, all the same colour: a *distance*-null (the verdict is the
  observed mark's distance from it), a *crossing*-null (the verdict counts crossings of
  it — for row-mean-runs this is the fitted OLS trend line, not the grand mean; the row
  averages are signed above/below that fitted trend), and the one *empirical central reference*
  (the median-of-observed-SDs band the outlier whisker is judged against — derived from
  observed data rather than a theoretical model, but it carries the verdict relationship,
  so it is a null for colour purposes). Simulated and analytic nulls share the teal — a
  reader does not benefit from distinguishing them.

- **Flag boundary — the cutoff past which marks are flagged.** Faded / dashed red,
  governed by channel 1, not here. A dip-gate ceiling, a significance threshold: the
  data sits *below* it when clean and flags by *exceeding* it. This is not a null (the
  data does not sit *at* it) — do not paint it teal.

The grey neutral-reference sub-role is **retired.** It previously held "a baseline that
carries no verdict (zero line, fitted-trend / expected-value line) — grey dashed." That
category was geometry masquerading as meaning: every line it named is in fact a null
(the verdict *is* read against the fitted trend, the zero line, the expected value), so
they belong in the teal null role. The one apparent survivor — a flat line that carried
no verdict relationship — turned out to be a y-axis origin on a signed (±SD) scale, i.e.
**axis furniture**, not a data-role reference at all; it routes to `C.AXIS` under the
axis-furniture rules, not to a neutral channel-3 grey. With both gone, channel 3 has no
grey sub-role. Recorded so it is not "restored" later as drift: there is no
verdict-bearing reference line that should be grey — grey on a reference line was always
either a mislabelled null (→ teal) or axis furniture (→ `C.AXIS`).

**Style.** Observed data is solid (channel 4, blue); a null is dashed — the dash carries
"this is the reference, not the measurement." Solid-vs-dashed encodes data-vs-reference,
the one distinction a reader needs; it does not encode curve-vs-flat (which carries no
meaning). One dash/width/opacity for all null lines, set at retoken and confirmed on the
live render. A dashed *traced curve* (the sim-null density) may read busier than a dashed
flat line; if it does on the live render, solid is permitted for that curve **as a
meaning-free rendering concession, noted as such** — it is not a re-introduction of a
solid-vs-dashed semantic. Decided at retoken on the screenshot, not asserted here.

**Confidence intervals — a CI takes the colour of the mark it is the uncertainty of.**
A CI is not its own channel; it is an error band on an existing mark and inherits that
mark's role.

- A CI around the **null** (the expected value's sampling tolerance — "clean data would
  sit in this range") is part of the null surface: teal, lighter fill. Flagging is the
  observed mark falling outside it. (The kurtosis expected band already renders this way.)
- A CI around an **observed** statistic (the measurement's uncertainty) takes the observed
  colour (blue `CC.OBS`, or the near-black verdict-mark treatment) — **not** teal.

These must be different colours, and that is deliberate: on an observed-CI surface the
verdict is read as *overlap* — does the observed CI clear / exclude the null line. The
overlap reading is only legible if the interval and the line it is judged against are
visually distinct. Painting the observed CI teal because it is *evaluated against* the
teal null would collapse the two halves of the comparison into one hue and make the
verdict unreadable. The observed CI does **not** change colour when it clears the null
(no flag-red state): the flag is carried by the verdict word and the severity ramp, and
clearance is already legible from the contrast. Fixed observed colour, both states.

Because the verdict on these surfaces *is* the CI-vs-null overlap, the null line is
**mandatory and at full null treatment** (teal, dashed, legible, legend-keyed) on any
surface where the verdict is read as a CI clearing or excluding a reference. A null line
drawn faint, thin, or unkeyed on such a surface hides half the verdict. CI sub-inventory
done (S245): the only two under-drawn CI-overlap nulls were the autocorrelation pooled-r1
surface (r=0) and the Runs pooled-z surface (z=0) — both the thinnest/faintest references
in the battery, unkeyed, with the CI's exclusion of them carrying the verdict. Both brought
to full null treatment + a 2-item legend key (CI marker + the null line). Every other
observed-CI either clears a properly-drawn null (MeanVariance, keyed teal) or is a flag
threshold, not a CI.

**4 — Observed data. Blue when clear, red when flagged (the data model).**
The measured data itself — observed bars, scatter points, observed lines, the marks a
histogram is built from. An observed mark carries the verdict in its own colour: **blue
(`CC.OBS`) when the mark/card is clear, red when flagged.** There is no cleared-green and
no neutral-grey resting state on an observed mark — a clean result is just the data sitting
where data normally sits, drawn blue and unremarkable; the *only* colour that draws the eye
is red, and it earns that salience by being the one non-blue thing on the plot ("nothing to
see here" reads as quiet blue; "look here" reads as red). This is the **data model**: the
colour tracks what the mark is and whether it is anomalous, blue→red.

Flagged treatment splits by attribution: where the engine knows *which* marks drive the
flag (per-bin, per-mark), the flag is a **red region** (the driving marks red, the rest
blue); where the verdict is a single global statistic with no per-mark attribution, the
flag is **flat-red** (every observed mark on the surface goes red, because the *surface*
flagged and no sub-part is "the anomaly"). Per-mark surfaces that already flag individual
marks (outlier dots, threshold-crossing bars) are this rule already.

Observed-blue is not reserved *against* conditions: on a per-condition plot the line is
observed data for that condition, so condition-blue and observed-blue are the same mark,
not a collision. The only other constraint is the `TIER_COLOR` ramp floor (channel 1): a
surface that overlays observed-blue marks on ramped cells needs its floor confirmed distinct
from `CC.OBS` — the audit found no `TIER_COLOR` surface does this, so it does not bite today.

**Marks vs chrome — the reconciliation (why marks have no green).** Cleared-green survives
in *chrome* (verdict words, badges, the `SEV_VERDICT` triple) and is retired only on *plot
marks*. These are different surfaces answering different questions: a verdict **badge**
answers "what is the verdict?" and a green/amber/red traffic light is the right encoding for
a status word; a plot **mark** answers "what does the data look like?" and the data model
(blue normal / red anomaly) is right for it. So green stays in chrome, goes from marks —
this is not a contradiction, it is two surfaces with two jobs. The earlier framing that
listed "the cleared green" among severity colours reserved on plot marks (channel 1) is
superseded by this: on marks there is no cleared green; clear is blue.

**Supersession recorded (do not restore).** This overturns the S243/S244 ruling that a
p-value-bin histogram is grey-because-not-observed-data (Test25b NOT-A-DEFECT). Under the
data model a p-value histogram's bars *are* observed marks (they are what the card shows)
and carry the verdict colour: blue when clear, red (region) when flagged. The grey-clear and
green-clear resting states found across the battery (ColumnStatBar cleared bars, WithinRowVariance
within-threshold bars, DotStrip cleared dots) are mislabelled — they go blue. A future reader
tempted to restore grey/green clear should re-read this: clear is blue on an observed mark.

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

**Axis text — conformed by inline literal; rail-routing blocked on a font role.**
The contrast gap that the S216 read-only found was a colour gap: Path A axis text sat
at `C.TEXT_3` and washed out on the sparse panels. That colour gap is closed — every
Path A plot now reads `C.TEXT_2` axis text, uniform across the battery. It was closed by
inline `fill={C.TEXT_2}` literal in each of the thirteen Path A plots, **not** by routing
them onto the shared `SvgLabel` rail.

The structural ideal is the rail — route Path A's axis text through the `SvgLabel`
`tick` / `axis` roles so `C.TEXT_2` is inherited by construction and future plots are
correct by default, the same shape as the S215 type-scale convergence onto the `CF`
rail. That routing was not built, and the reason is a real precondition, not an
oversight: the rail's `tick` / `axis` roles render `FF.UI` sans at `FW.SEMI`, while
Path A tick numerals are `FF.MONO` and axis titles are normal-weight. Routing as-is
would switch every tick numeral mono→sans and every title to semibold — a visible
regression. The rail can carry Path A only once it gains an `FF.MONO` tick role at
`C.TEXT_2`. Until that role exists the inline literals are the correct state: right in
colour, off the rail by necessity. The full-battery rail migration (add the `FF.MONO`
role, then route all thirteen) is banked as an eligible arc — see BANKED
§ "`SvgLabel` mono-tick rail precondition".

The **stroke** half of the S216 plan was built as the doc describes: the helper renders
labels only and draws no axis line, so line and tick-mark strokes stay inline and adopt
`C.AXIS` (line geometry is per-plot and bespoke; only the stroke token is shared). One
straggler remains — CoordResidualProfile's left axis line still strokes `C.BORDER`, the
lone axis-furniture instance not yet on `C.AXIS` (it is Path B, outside the S216
"across Path A" scope); it is pending a stroke-uniformity repair.

## The condition palette

`COND_COLORS`, eight entries, lighter register. Ordered (S250) so the hue byte-identical to a
signal colour (blue `.text` `#3B82F6` == `CC.OBS`) is demoted out of the common first-three case —
see channel 2's signal-sensitivity rule. Hues are chosen for mutual separation as thin lines, not
for avoiding the severity family (channel 1's role-not-hue rule). The line reads `.text`;
the import chip reads `.bg` (pale fill) + `.text` (label), so each entry's `.bg` /
`.border` are tints/shades of its `.text` hue — one hue per condition across import and
plot. (Exception: the import span-header *band* renders its label neutral `C.TEXT`, identity on
`.bg` only — the tint-not-text rule, channel 2.)

| # | Hue | `.text` hex |
|---|---|---|
| 1 | lime | `#4D7C0F` |
| 2 | purple | `#A855F7` |
| 3 | cyan | `#06B6D4` |
| 4 | pink | `#EC4899` |
| 5 | green | `#10B981` |
| 6 | blue | `#3B82F6` |
| 7 | amber | `#B45309` |
| 8 | slate | `#64748B` |

(Slot order is 0-indexed in source: lime is `COND_COLORS[0]`, blue `COND_COLORS[5]`. The table
numbers 1–8 for readability. `.text` hexes are the source-true values — lime and amber carry the
darkened lime-700 / amber-700 `.text` for small-text contrast on white, per `roles.js`; earlier
spec revisions listed the un-darkened `#84CC16` / `#D97706`, corrected here to match source.)

The `.bg` (pale fill) and `.border` (mid shade) of each entry are regenerated to match
its `.text` hue. Condition marks read the `.text` shade uniformly — the audit found
`.border` used in one plot and `.text` in another; `.text` wins everywhere.

Watch-pairs under the S250 order. The cool family — blue (6), cyan (3), slate (8) — is kept
mutually non-adjacent so two cool hues never sit on consecutive conditions; cyan (3) and green (5)
are held apart by pink (4) so the two blue-greens don't muddy as adjacent lines. The one remaining
adjacency is green (5) / blue (6): light emerald `#10B981` against blue, both out of the common
1–3 case (only co-render at 5+ conditions, which no current fixture hits), confirmed distinct on
the live Autocorr render. lime (1) and green (5) only co-occur at 5+ conditions; amber (7) is clear
of severity amber unless a condition line sits directly beside an amber flag mark — neither bites
at current fixture depth. The earlier dark palette swapped blue/green order to fix a
blue↔dark-green line collapse; the lighter register resolved that, and the S250 reorder (blue→slot 5,
0-indexed) keeps green and blue apart in the common case besides demoting the signal-hue collision. Exact hexes
were set from swatches and confirmed on the live render at implementation — a chat-side swatch read
does not settle thin-line separation; the live Autocorr/Mahalanobis render is the gate.

**Overflow past 8 conditions.** Hue carries conditions 1–8. The realistic ceiling
of mutually distinguishable hues on a white ground is about this many; adding
more hurts separation rather than helping. Past 8, recycle the palette with a
second channel: condition N+8 takes hue-N plus a line-dash or marker-shape
modifier. No current fixture exceeds three conditions, so this is specified now and
built when a dataset needs it — building it untested against no positive anchor
would be premature.

## Reference lines — two kinds

This restates the channel-3 ruling in table form; channel 3 is canonical, this is the
quick reference. Reference lines split by **function** (what the verdict is read against),
not geometry. There are two kinds — plus axis furniture, which is not a reference line.

| Kind | Role | Colour | Dash |
|---|---|---|---|
| **Null** (verdict measured against it) | LOESS fit, sim/analytic null, expected slope, flat κ≈0 / r=0 / ratio=1, expected-uniform, grand-mean (crossing-null), median-of-observed-SDs band (empirical central reference) | teal (`CC.EXP`) | dashed, one standardised treatment |
| **Flag boundary** (cutoff marks flag past) | significance threshold, dip-gate ceiling | faded/dashed red | `CS.REF`, reduced opacity |
| *(not a reference line)* axis furniture | y-origin on a signed scale (e.g. ±SD zero line) | `C.AXIS` | per axis-furniture rules |

A flag-boundary line keeps red (it is about the same anomaly as the marks it bounds) but
is dashed and faded so it reads as subordinate reference, not as a flagged mark. A null
line is teal — there is no grey null/baseline kind: the old "neutral baseline → grey"
category was geometry masquerading as meaning (every line it named is in fact a null), and
the one apparent survivor was an axis origin, i.e. axis furniture, not a reference line.
See channel 3 for the full reasoning and the supersession note.

The subordination of any dashed reference line is carried by its **dash**, not by faint
text: a reference-line *label* reads `C.TEXT_2`, the one axis-text darkness (amended S216
from `C.TEXT_3`), the same as ticks and titles. Where a line *is* axis furniture (the
signed-scale origin), the line stroke reads `C.AXIS` (one step lighter than the text it
carries) per "Axis furniture"; a teal null line reads `CC.EXP` and is not axis furniture.

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

Matrix carve-out (ruled S254): the discrete-verdict correlation matrices (Rank
Correlation, IRC) do NOT take the slate floor — their cleared cells are `CC.OBS` blue,
flagged cells keep the amber→red flagged tier. The S214 "no fourth competing blue"
rationale was about a dense card carrying observed-blue marks alongside the ramp; a
correlation cell is a standalone verdict tile with no observed-blue overlaid, so
"cleared is blue" (the suite-wide observed-mark rule, channel 4) applies here with no
collision. The slate floor remains the rule for dense `TIER_COLOR` surfaces that DO
overlay observed marks.

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

**Severity-red token names.** The unified severity reds are referenced under several
token names across the codebase (the S214 audit counted four). These are to be filled
here from a source grep **at commit time, not from memory** — the Code prompt that
commits this doc must grep the source and list the exact token names in this paragraph
before committing. (Placeholder until then; a blank cannot be wrong, a recalled token
name can.)

## Per-plot conformance

What each live plot changes. "OK" = already conforms.

| Plot | Current | Change |
|---|---|---|
| AutocorrDecayPlot | condition line reads `.border`; fallback `CHART.SERIES`; r=0 line grey `C.AXIS` | condition line → read `.text`; per-condition lines follow the S250 `COND_COLORS` order; **no-condition "All data" fallback → `CC.OBS`** (landed S246, row-13 drift guard — stays blue under the S250 reorder where `COND_COLORS[0]` is now lime). **r=0 line → teal `CC.EXP` dashed** (independence null, not a neutral baseline); legend swatch (`C.BORDER`) → match line |
| ColumnStatBar | flagged bar = `SEV_VERDICT` tier ramp; cleared bar `NEUTRAL`=`C.TEXT_3` grey; ref line `C.TEXT_3` grey (Entropy "Expected (ratio = 1)", GoF "Null median (ratio = 1)", Modality "Multimodality threshold") | flagged bar ramp OK. **Cleared bar grey → blue `CC.OBS`** (data-model arc; receives `cardFlag` already). **Entropy + GoF ref lines → teal `CC.EXP` dashed** (nulls). **Modality "Multimodality threshold" → faded/dashed red** (channel-1 flag boundary; was miscast grey). Line colour now role-dependent, not one shared grey |
| DotStrip | outlier dot red `CC.THRESH`; cleared dot `SIGNAL.GREEN.dot` green; expected band + centre line teal | flag red OK (unified `SEV_VERDICT`). Expected band/centre line OK as teal (null). **Cleared dot green → blue `CC.OBS`** (data-model arc — retires green-clear; see channel 4) |
| HBarPlot | bars fixed blue `CC.OBS` (no `flag` prop); "0 expected" ref line teal | ref line OK (null, teal). **Data-model arc:** thread `result.flag` into HBarPlot + flat-red branch (Kurtosis %-platykurtic — global verdict, no per-bar attribution → flat-red when flagged) |
| VBarPlot | bars blue `CC.OBS` (no card-`flag` prop); expected line teal | expected line OK (null, teal). **Data-model arc:** thread `result.flag` + flat-red branch (Benford/TerminalDigit — global χ²/MAD, no per-digit attribution → flat-red when flagged; DecPrec already reds gap bins via `CHART.GAP`) |
| KurtosisDistPlot | observed blue; sim-null teal | sim-null curve → teal **solid** (concession TAKEN, confirmed on render S245: dashed read bitty — a stepped density fragments into disconnected dashes and competes with the histogram, worst on the sparklines; solid is the meaning-free rendering concession, colour still carries the null role). Observed histogram bars carry the data model (blue clear / flat-red flagged — no per-bin attribution) per channel 4 |
| PooledR1Marker (Autocorr CI surface) | r=0 line `C.AXIS`, width 0.8, opacity 1.0, **no legend key**; CI whisker/dot near-black observed | **r=0 → teal `CC.EXP` dashed at full null treatment + add legend key** (verdict-bearing null: the CI's exclusion of it *is* the verdict; currently the thinnest/faintest reference in the battery). CI whisker/dot stay observed/near-black (correct) |
| CarlisleBalance | expected-uniform line teal; p-value histogram bars: driving bin red `SIGNAL.RED.dot`, others `C.TEXT_3` grey | expected line OK teal (null). **Data-model arc:** non-driving bins grey → blue `CC.OBS`; 0.90–1.0 driving tail red **region** (engine emits per-bin `histBins`). Overturns Test25b NOT-A-DEFECT |
| WithinRowVariance | z-histogram: outlier bins red `SIGNAL.RED.dot`, within-threshold `C.TEXT_3` grey; ±3.5σ line red dashed | ±3.5σ line OK (flag boundary, red). **Data-model arc:** within-threshold bins grey → blue `CC.OBS` (has `isOutlier` per bin — colour swap) |
| MahalanobisDistPlot | dots `.text`; outlier solid red; threshold line **faded/dashed red** (`CS.REF.dash`/`CS.REF.opacity`) | **DONE** — line already faded/dashed at source (the "solid" current-state flag was stale; confirmed S233); dots/outlier OK |
| MeanVarianceScatter | observed blue; expected slope teal dashed | OK — expected slope is a sloped null (single consumer, MiniCard_NoiseScaling); teal dashed, confirm dash/width on standardised null treatment |
| MissingDataHeatmap | missing cells + block outline red | OK (red = anomalous, intensity/flag) |
| NoiseProfilePlot | observed blue; LOESS teal; changepoints red | OK (changepoint = detected anomaly) |
| NoiseSpreadPlot | flagged error bar amber `CC.WARN`; median band `C.BORDER` neutral; zero line `C.AXIS` | "outlier" → red (resolve amber/red split). **Median band → teal `CC.EXP`** (empirical central reference = null for colour; legend "Expected" stays). **Zero line → axis furniture `C.AXIS`** (confirmed S245: it is `py(0)=midY`, the y-origin of the signed ±SD scale, not a coincidental reference). Error bars carry the data model (blue clear / red flagged) per channel 4 |
| RegionalNoiseStrip | window fill red, opacity-ramped | OK (red intensity ramp) |
| RowMeanTrendPlot | sim line teal `CC.EXP`; grand-mean line teal `CC.EXP` dashed, swatch matches line; crossing/run two-tone `SIGN.POS` navy (crossing) / `CC.OBS` blue (run) | **RETIRED S247 `f6c9614`** — component deleted. RowMean redesigned to a per-condition `SignStripPlot` block-width render (one rect per run, width ∝ run length) + run-length evidence table; no sim line, no grand-mean line. The S246 conformance state is kept here for history only: it was colour-correct but illegible on the dense line, which is why the redesign superseded it (WALK Test22a/22b, both DONE S247). For the live render see the `SignStripPlot` row. |
| SignStripPlot | sign two-tone `SIGN.POS` navy `#002147` (+1) / `CC.OBS` blue `#3B82F6` (−1), neutral | **Landed (two-tone arc, S246 `c4a3e7a`).** Unified onto `CC.OBS` `#3B82F6` + Oxford navy `#002147` `SIGN.POS` (dark = +1 by convention); retired Cambridge pale-blue `#A3C1DA` (the 16b "blue isn't standard" culprit). Categorical encoding, legend stays sign-specific. Screenshot-verified navy/blue distinct |
| CorrMatrixSVG / consumers | cells via `TIER_COLOR`; cleared cell `CC.OBS` blue (S254) | Flagged tiers via `TIER_COLOR` amber→red. **Cleared cell → `CC.OBS` blue (S254 matrix carve-out)** — discrete-verdict tiles, no observed-blue overlay, so the channel-4 "cleared is blue" rule applies; the S214 slate floor is retained only for dense overlay surfaces. Rank Correlation / IRC cleared branch + legend swatch both `CC.OBS` |
| CoordResidualProfile | residual ramp; matrix via `rhoColor` | residual heatmap = canonical colours + gamma reserve (`RESID_GAMMA = 1.5`, floor `#DAE1EA`, nulls-to-floor; see "Dense magnitude surfaces"), NOT the `TIER_COLOR` two-regime ramp; matrix unchanged (`rhoColor`) |

**Axis-furniture state (S216 — across Path A inline plots):**
- Axis *text* (ticks, axis titles, reference labels): reads `C.TEXT_2`, reached by
  inline `fill={C.TEXT_2}` literal in the thirteen Path A plots. No `fill={C.TEXT_3}`
  literal remains on axis text. The rail-routing ideal (route through the `SvgLabel`
  `tick` / `axis` roles) was not built — it is blocked on adding an `FF.MONO` tick role
  at `C.TEXT_2`, see "Axis text — conformed by inline literal" above and BANKED
  § "`SvgLabel` mono-tick rail precondition". Path B (CorrMatrixSVG, CoordResidualProfile)
  already reaches `C.TEXT_2` natively through the rail.
- Axis lines + tick marks → `C.AXIS` (dedicated token; replaced inline
  `stroke={C.BORDER}` on axis furniture). Built across Path A; line geometry stays
  per-plot, only the stroke token is shared. One straggler: CoordResidualProfile's left
  axis line (Path B, outside the S216 "across Path A" scope) still strokes `C.BORDER` —
  the lone axis-furniture instance not yet on `C.AXIS`, pending a stroke-uniformity repair
  (BANKED § CoordResidualProfile inline `C.BORDER` axis line).
- The facet of *which* plots carry axis titles and how caption zones are placed is a
  separate inventory (title/caption presence) — this section rules colour/stroke only.
  **Title-presence inventory done (S233): `SESSION233-AXIS-LABEL-AUDIT.md` catalogues all
  22 surfaces (16 `plots/` components + 6 inline `<PlotSVG>` card surfaces) for x/y-title
  presence, with verbatim text and per-absence reasoning. Findings routed: (1)
  RegionalNoiseStrip `yAxisTitle` wired but never passed → candidate gap, eyes-on next
  (BANKED); (2) Carlisle/WithinRowVariance untitled count axis → likely-fix, low priority
  (BANKED); (3) inline surfaces render axis titles at `CF.SMALL` vs `plots/` at `CF.AXIS` →
  reconcile in the cross-card legend/typography pass (BANKED). Caption-zone placement
  remains unruled.**

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
- NoiseSpreadPlot outlier → red (resolve the amber/red outlier split). *(Still live — colour arc.)*
- VBarPlot expected → teal, RowMeanTrend mint → teal, MahalanobisDistPlot threshold → faded/dashed red: **all landed** (table rows reflect current state).

**Reference-line retoken (this arc — channel-3 amendment, S245).** Every null line → teal `CC.EXP`,
dashed, one standardised dash/width/opacity. Reclassifications: AutocorrDecayPlot r=0, PooledR1Marker
r=0 (+ full treatment + legend key), PooledZMarker z=0 in Runs (twin of PooledR1Marker, folded in
same session under the CI-overlap rule), ColumnStatBar Entropy/GoF ref lines, RowMeanTrend grand-mean,
NoiseSpread median band → **teal** (all nulls); ColumnStatBar Modality threshold → **faded/dashed red**
(flag boundary); NoiseSpread zero line → **`C.AXIS` axis furniture** (confirmed: `py(0)` origin). Every
legend swatch reads its line's colour. Kurtosis sim-null curve → **solid** (concession taken on render,
see table). Both source confirms passed (NoiseSpread y=0 is the axis origin; CI sub-inventory clean —
the only under-drawn CI-overlap nulls were PooledR1Marker r=0 and PooledZMarker z=0, both now at full
treatment). Landed in worktree, batch 23/23, build clean; **pending promote after two-state screenshot
approval** (flagged + cleared) — the batch is blind to presentational correctness.

**Legend vocabulary (null role) — converge.** The null role currently carries ~18 distinct legend
phrasings across cards, with bare "Expected" spanning four different colours. This is a cross-card
legend-consistency defect, not a colour defect; the canonical short label set is authored Chat-side
and wired in the same retoken. Until then, no card's null label is "correct" — they are inconsistent
by construction.

## Queued colour arcs (scoped S245, behind the reference-line promote)

**Data-model arc (observed marks — blue clear / red flagged).** Channel 4's data model applied across
the battery. Source inventory (S245 read-only) found 8 observed-bar/histogram surfaces and that the
cleared state is currently grey or green, NOT blue, almost everywhere — so this is a real restyle, not
a confirm. Surfaces:
- *Colour-swap, state already available:* Carlisle p-value histogram (non-driving bins grey → blue,
  0.90–1.0 driving tail stays/expands red — engine has per-bin `histBins`, so red-**region**);
  WithinRowVariance z-histogram (within-threshold grey → blue, outlier bins red); ColumnStatBar
  Entropy/GoF/Modality (cleared bars grey `C.TEXT_3` → blue, flagged red/amber); KurtosisDistPlot
  (passes `flag` but ignores it — consume it, bars blue↔flat-red, no per-bin signal); Kurtosis
  per-condition sparklines (already blue-clear/red-flagged — no change).
- *Needs verdict-state plumbed (shared flag-agnostic components):* VBarPlot (Benford/TerminalDigit/
  DecPrec — no card-`flag` prop; thread `result.flag`, flat-red branch); HBarPlot (Kurtosis %-platykurtic
  — no `flag` prop; same).
- *Flag treatment by attribution:* Carlisle → red region (per-bin signal exists); KurtosisDist / HBar /
  VBar(Benford,TermDigit) → flat-red (global statistic, no per-mark attribution).
- *DotStrip cleared dots → blue* (currently `SIGNAL.GREEN.dot` cleared-green — retires the green-clear
  signal, the deliberate-signal case, see channel 4 supersession note).
This overturns Test25b NOT-A-DEFECT (grey-because-not-observed); retag at the walk. Spec amendment
(channel 4) is landed; the retoken is the next dispatch — spec-first, then build, two-state screenshot gate.

**Two-tone observed encodings → `CC.OBS` + Oxford navy.** SignStripPlot (sign +1/−1, currently Oxford
`#002147` / Cambridge `#A3C1DA`) and RowMeanTrendPlot (crossing/run, currently `SIGN.CROSSING` `#4A3D8F` /
`SIGN.RUN` `#A0A0CC`) both move to one pairing: `CC.OBS` `#3B82F6` + Oxford navy `#002147`, dark = the
salient state (crossing on RowMean; +1 on SignStrip by convention). Retires Cambridge pale-blue (the 16b
"blue isn't standard" culprit — it sat close to `CC.OBS` and read as a wrong observed-blue) and the
indigo/lavender. Colours unify; legends stay role-specific (sign vs crossing). The +1/−1 and crossing/run
distinctions survive on the navy-vs-blue lightness gap; confirm contrast on render (same-hue light/dark —
fallback only if a sign pair reads ambiguously). Separate from the data-model arc — these are categorical
encodings, not clear/flag observed magnitude.

**Row-13 provenance one-liner — LANDED.** AutocorrDecayPlot's no-condition "All data" fallback
line and Mahalanobis's pooled "All data" series both draw `CC.OBS` (the fallback was retargeted
off `COND_COLORS[0].text` onto `CC.OBS` in S246, the drift guard). This matters more after S250:
`COND_COLORS[0]` is now lime `#4D7C0F`, not blue — so a fallback still reading `COND_COLORS[0].text`
would have silently turned the "All data" line lime. It reads `CC.OBS` and stays blue, correctly.
The two literals (`CC.OBS` and `COND_COLORS[5].text`, both `#3B82F6`) remain independently defined;
the AutocorrDecay:79 comment noting this was corrected in S250 (it had referenced slot 0).

**Severity scale (ruled — see above):** edit `SEV_VERDICT` to the bright triple
(`#EF4444` / `#F97316` / `#22C55E`); retoken `PLOT_FC` / `CC.THRESH` to read from
`SEV_VERDICT` (or those same values) so plot flag marks, chrome words, and the
four-dot tier ramp are one scale. No flag-hue rows remain blocked.

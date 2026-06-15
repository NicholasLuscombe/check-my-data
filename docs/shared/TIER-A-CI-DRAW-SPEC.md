# PER-UNIT DISPLAY PROGRAMME SPEC — v2.0

**Status:** Chat-authored, Chat-owned (`docs/shared`). The canonical spec every per-unit
display implementation prompt cites. Supersedes the v1.0 confidence-interval programme,
which this document retires.

**What changed (S237→S238).** The CI-band programme rested on an untested structural
assumption — that a single confidence band is the natural read of each test. A full-suite
flag-assembly classification (all 28 active tests, read at source, S237;
`SESSION237-FLAG-ASSEMBLY-CLASSIFICATION.md`) found that assumption false for two-thirds of
the suite: **19 tests are PER-UNIT-OR, 6 POOLED-SINGLE, 3 DETECTION.** A PER-UNIT-OR test's
flag fires from per-unit evidence — a pair, lag, window, condition, column, block, or stage —
via promotion, BH-FDR over sub-units, worst-group selection, or an OR across units. A single
band on a *pooled* quantity cannot picture an OR across units; it can sit clean while the
verdict reads MODERATE. That is not a level bug — it is the band picturing a different
quantity than the one the verdict tests. Two shipped bands carry exactly this defect
(Autocorrelation, Runs).

The honest object for a PER-UNIT-OR test is a **per-unit display**: each unit's evidence
shown against its own reference, flagged units marked, the multiplicity correction visible,
so the geometry carries the same claim the verdict rests on. This spec governs that
programme. A single CI band survives only for the one POOLED-SINGLE test that ever drew one
(Noise Scaling), and is specified here as a bounded exception, not the programme's subject.

**Evidence base.** `SESSION237-FLAG-ASSEMBLY-CLASSIFICATION.md` (the 28-test classification,
the source of the per-unit/pooled/detection split and the per-unit return-shape column); the
S238 return-shape confirmation read-only (the field-level grounding for the primitive
contract and the two render modes); METHODOLOGY Unified α Framework (flag boundaries, the
worst-group constraint).

---

## 1. The governing rule (carried forward from v1.0, unchanged)

**A display's geometry must picture the same quantity the verdict tests.** This is the rule
the CI programme articulated and then violated; it is the rule the per-unit programme is
built to satisfy.

For a pooled single-statistic test, that meant a band whose exceedance equals the verdict's
exceedance. For a PER-UNIT-OR test, it means a display that shows the per-unit evidence the
flag actually fires on — not a pooled summary that can disagree with the flag. The
consequence:

- The display reflects the **BH-adjusted** per-unit decision the verdict uses, never the raw
  per-unit statistic, and never a pooled draw where the verdict routes per-unit.
- Where a test routes **per-condition** (Fisher-exempt worst-group; §4), the display reflects
  the worst-group decision, on the worst group's null — not a pooled-across-conditions
  statistic, which would be contaminated by treatment effects across conditions.
- The flag boundary shown on the display is the boundary the verdict uses (the flag-promotion
  threshold), not the HIGH gate. The CI programme drew every band at 99.9% (the HIGH gate)
  while flags fire at MODERATE (p < 0.01); a MODERATE verdict then fell inside the band. The
  per-unit display marks units at the boundary that actually flags them.

---

## 2. The per-unit display primitive

### 2.1 One contract, two render modes

All per-unit displays consume one data tuple. A `referenceMode` field on the data selects the
render mode. **The mode is a function of the data, never a per-card choice** — this is what
keeps the programme out of the card-by-card drift that made the CI programme expensive.

**The unit tuple.** Each display receives an array of units; each unit carries:

| field | meaning | required |
|---|---|---|
| `unitLabel` | display label (column index, condition pair, `startRow–endRow`, value key) | yes |
| `estimate` | the per-unit magnitude (correlation, ratio, distance, z) | forest mode |
| `reference` | the value to plot the estimate against | when `referenceMode = stored` |
| `referenceMode` | `stored` \| `zero` \| `none` — drives the render mode | yes |
| `adjP` | BH-adjusted per-unit p-value | yes |
| `flagged` | did this unit clear the flag boundary | yes |
| `direction` | signed/labelled direction, when the test is two-sided | optional |
| `span` | `{startRow, endRow}` for located-window units | optional |

Display-level context, set once per card (not per unit): `flagBoundary` (the p threshold for
the threshold line and the strip ranking), `multiplicityNote` (the correction applied — the
BH-FDR family size — shown so the reader sees the units were corrected), `effectAxisLabel`
(forest mode only).

### 2.2 Render mode A — forest (`referenceMode = stored` or `zero`)

Horizontal effect axis. Each unit is a point at its `estimate`, positioned by magnitude,
against a reference tick: at `reference` (stored mode) or at zero (zero mode — every tick at
x = 0). An interval is drawn if the unit carries one. Flagged units are marked distinctly from
cleared units. **The reader reads distance from the reference as the evidence.**

Covers the eleven tests with a showable magnitude-vs-reference (build-ready set):
Autocorrelation (zero), Runs (stored), IRC (stored), Windowed Autocorrelation (zero),
Row-Mean Runs (stored), Column GoF (stored), Entropy/Zipf (stored), Value-Frequency Spike
(stored), Decimal Precision (stored), Cross-Condition Consistency (stored), Cross-Condition
Rank Correlation (stored).

### 2.3 Render mode B — strip (`referenceMode = none`)

No effect axis. Units are ranked vertically by `adjP`, with a threshold line at `flagBoundary`;
position encodes **significance, not magnitude**. The absence of the effect axis is deliberate
and load-bearing: it tells the reader the units were located by their p-value and that no
effect size is being asserted.

Covers the tests with no per-unit reference to plot against: LOESS `pairResults`, and Blocked
Mahalanobis (provisional — see §2.5 open item).

### 2.4 Why two registers, not one

A zero-reference forest and a p-ranked strip can look near-identical, but they make different
claims. The forest asserts an effect size and its distance from no-effect; a point near the
line is weak even if flagged. The strip asserts only significance; a unit can be wildly
significant with an effect size the strip never shows. Rendering them the same lets a reader
infer an effect-size reading the strip data doesn't support — the same
geometry-mispictures-the-verdict failure that retired the bands, one layer up. On a forensic
surface feeding misconduct findings, that miscalibration is the expensive error; a second
visual register is the cheap one. Per the Bik standard, a per-unit display must read as a
standalone screenshot, and *what kind of evidence this is* (effect size vs significance) must
be legible from the geometry alone.

### 2.5 Open item — Blocked Mahalanobis render mode (confirm at build)

Provisionally strip-mode: no stored per-element reference (the permutation null is not kept on
each element, only `rawP`/`adjP`). But the element returns `stat` (T² or λ), a real magnitude,
so it may belong in forest-mode with a derived reference rather than the strip. Resolve when
Blocked Mahalanobis is built. The two-mode structure holds either way — this only moves one
test between modes.

### 2.6 Wiring notes from the S238 return-shape read-only (build-time, not contract)

These are confirmed against source; none requires an engine edit.

- **Reference modes are mixed across forest tests**, as the field pass found: stored expected
  (Runs, IRC, Row-Mean Runs, Column GoF, Entropy, VFS, Decimal Precision, Cross-Condition
  Consistency, Rank Correlation), implicit zero (both autocorrelations — reference is 0,
  significance rides on `adjP`). The `referenceMode` field captures this; do not assume a
  single reference axis.
- **Runs `direction`** is read from `details[]` (the `interpretation` field — "Too few
  (clustered)" / "Too many (alternating)"), not `allPairStats[]`, which drops it. The value is
  on the result object; the primitive reads the right array. No engine edit.
- **Blocked Mahalanobis `direction`** is recoverable per element from `passKey`/`pass` (μ-pass
  = mean shift, Σ-pass = covariance inflation); the readable phrase is headline-scoped and
  derivable at display time. No engine edit.
- **Two retention cases remain**, not build-ready, needing engine output before they can use
  the primitive: **Kurtosis** (per-condition simulated null computed and dropped) and
  **Regional Noise** (per-column promoter stats computed and dropped). These are gated like
  WS-3 was — a separate engine dispatch (§5).

### 2.7 Out of scope for this spec (deliberately)

Two things are left to their proper homes rather than fixed here:

- **Component count** (one component with a mode switch vs two components sharing scaffolding)
  is an implementation shape for Code to propose in its build plan. Pinning it here reaches
  into `src/`.
- **Visual particulars** (marker shapes, colours, interval style, the forest/strip register
  distinction in concrete terms) route through `INVESTIGATION-DISPLAY-SPEC` and
  `PLOT-COLOUR-SEMANTICS`, set once against the existing plot vocabulary, not invented here.

---

## 3. Build order

Keyed to verifiability, then to defect-replacement priority. Of the 19 PER-UNIT-OR tests, 12
have a flagged fixture in the 22-set and 7 are latent (clean-state-only on the batch — a
display renders only its clean state until a flagged anchor exists). Verifiable-first, because
a display you can see on a flagged fixture is a display you can confirm; a latent one is
built-and-trusted until #49.

**Stage 1 — defect replacement (verifiable, leads the programme).** Autocorrelation and Runs
each ship a defective CI band today (§6); both are verifiable and both are forest-mode. Built
first, they replace a known-defective band with a real per-unit display *and* exercise both
forest reference modes (zero for Autocorrelation, stored for Runs) plus the recoverable-direction
wiring for Runs. This is the proof-of-concept: the two cards we must fix anyway also stress the
two parts of the contract most likely to be wrong.

**Stage 2 — remaining verifiable (build-ready, flagged fixture exists).** Column GoF
(DS10/20), VFS (DS04/06/13), Mahalanobis Row [Family B, §7], Blocked Mahalanobis (DS15/21/22),
IRC (DS02/08), Regional Noise (DS10/21 — *retention-gated*), Selective Noise (DS08/20), LOESS
(DS08/10/12b), Row-Mean Runs (DS21), Cross-Condition Consistency (DS15/19).

**Stage 3 — latent (build-ready by shape, no flagged fixture; renders clean-state only).**
Entropy, Decimal Precision, Windowed Autocorrelation, Modality, Cross-Condition Rank
Correlation, Within-Row Variance [Family B], Kurtosis (*retention-gated*). These build against
the existing return shape but can be visually verified only when a fabricated flagged fixture
exists (#49). Flag each as render-unexercised at close; do not block the build, but do not
claim visual verification.

---

## 4. The Fisher-exempt worst-group constraint

Several PER-UNIT-OR tests route **per-condition** when ≥2 row groups exist
(`aggregatePerGroup`) and are **Fisher-exempt** — the aggregate flag is the **worst-group**
flag, never a Fisher promotion (`aggregation.js:127-135`). The card displays the worst-group
slice.

**Constraint on the display:** the per-unit display must reflect the **worst-group** decision
the verdict uses. The units shown, and the reference each is plotted against, are the worst
group's, on the worst group's null — not a pooled-across-conditions statistic, which would be
the wrong (treatment-contaminated) quantity. This is the same per-unit principle the programme
rests on, applied at the condition layer: a pooled-condition forest would re-import the exact
defect the programme removes.

This is also why the retention cases (Kurtosis, Regional Noise) cannot be pure presentational
work: the engine must retain the **per-group / per-column** stats so the worst-group display is
available. Retaining only a pooled quantity would not satisfy the constraint.

---

## 5. Engine prerequisite for the retention cases (separate Code dispatch)

Two tests compute the per-unit evidence the display needs and then discard it:

- **Kurtosis** — the per-condition simulated null (N_SIM nulls) is computed and collapsed; the
  per-condition `kurtosis`/`kurtDeviation`/`p` survive but the null the forest would plot
  against is dropped. A per-condition forest needs the retained per-condition reference.
- **Regional Noise** — the per-column promoter stats (the per-column BH path that can promote
  the flag) are computed and dropped; the window `details` survive but the per-column units the
  display would show do not.

These ride a **separate, gated engine dispatch**, as WS-3 did in v1.0. Read-only-first: confirm
at source exactly which values are dropped and where, before scoping the retention edit. The
display build for these two waits on the retention edit landing.

---

## 6. The two live band defects (replace, do not merely remove)

Both ship today; both must be replaced by a per-unit display, not just deleted, because the
card still needs to show the per-unit evidence the flag fires on.

**Autocorrelation** — ships a pooled lag-1 mean ± CI band. The flag also promotes on higher
lags (2–5) and a single pair's lag-1 BH-adjusted p (`autocorrelation.js:139-140`) — quantities
the band doesn't show, so a clean lag-1 band can accompany a MODERATE verdict. Replace with a
forest-mode display (zero reference): per-pair lag-1 and the higher-lag promoters, each against
r = 0, flagged units marked, BH family visible. Verifiable (DS02/11/20/21/22).

**Runs** — ships a pooled mean-z ± CI band. The flag promotes on a single pair's BH-adjusted p
or a localised row-window (`runs.js:236-238`). Replace with a forest-mode display (stored
reference): per-pair z against `expected`, plus the per-window scan units, flagged marked,
direction read from `details[]`, BH family visible. Verifiable (DS02/21/22).

Until replaced, both ship as known-defect.

**Independent latent fix — Row-Mean Runs `primaryP`.** `primaryP = globalBestP` does not track
the windowed promotion that can raise the flag (`rowMeanRuns.js:98,145-147`) — a `primaryP`-vs-
`flag` mismatch. Fix is independent of the display work; note it so it isn't lost.

---

## 7. The one surviving single band — Noise Scaling (POOLED-SINGLE)

Noise Scaling is the single POOLED-SINGLE test that ever drew a CI band, and it is **clean**:
its band quantity equals its verdict quantity (a single slope vs the expected slope, on the
slope SE; no per-unit promotion path). It is exclude-null by construction — the verdict tests
the observed slope against the expected on the slope SE, so the band uses that same spread —
and it stays a band, not a per-unit display, because the test genuinely is a single decision.

**The one fix it needs: re-level to the flag boundary.** The band is drawn at 99.9% (z = 3.29,
the HIGH gate) while the flag fires at the MODERATE boundary (p < 0.01, z ≈ 2.576) — so a
MODERATE verdict falls inside the band. The CI programme's level lock set the edge to the HIGH
boundary across the board; that was the programme-wide level error. Re-level Noise Scaling's
band to the flag boundary so the band's edge is the verdict's edge. (The geometry is otherwise
correct: a centroid-pinned bow-tie band on the slope, the expected-slope line also
centroid-pinned — confirmed at source S232; keep the centroid pinning, do not "fix" the
expected line to an independent intercept.)

The `pooledZCI95` field name is stale (it holds a 3.29 interval, not a 95% one) — cosmetic
rename, parked, not load-bearing.

---

## 8. Family B — magnitude-vs-threshold (separate pass)

Two PER-UNIT-OR tests don't fit the §2 estimate-vs-reference contract: their per-unit value is
already a distance from a null, with a threshold rather than a reference value to plot against.

- **Mahalanobis Row Outlier** — per-row D² with a BH-FDR survivor threshold; `flaggedRowIndices`.
- **Within-Row Variance** — per-row z (too-smooth) with `flaggedRowIndices`; per-window p dropped.

The natural display is a row-strip with a threshold line, not a forest of estimate-vs-reference
intervals — close to render mode B but with a magnitude axis (the distance) rather than a p-rank
axis. **Family B is scoped in its own pass**, after Family A's contract is confirmed on the
Autocorrelation/Runs build, so two contracts aren't blurred into one. Held here as a named open,
not resolved.

---

## Locked / open summary

**Locked:** the governing rule (display geometry pictures the verdict quantity, §1); the
per-unit primitive contract and the two data-driven render modes (§2); the build order
(verifiable-first, defects leading, §3); the worst-group constraint for per-condition routing
(§4); Noise Scaling as the one surviving single band, re-leveled to the flag boundary (§7); the
two defect bands replaced rather than removed (§6).

**Open (named, scoped, not blocking):**
- Blocked Mahalanobis render mode — strip vs forest-with-derived-reference; confirm at its build
  (§2.5).
- The retention engine edit for Kurtosis and Regional Noise — read-only-first, separate dispatch
  (§5).
- Family B contract — Mahalanobis Row and Within-Row Variance; own pass after Family A is
  confirmed (§8).
- Component count and visual particulars — Code's build plan and the display/colour specs
  respectively, not this spec (§2.7).

**Retired:** the v1.0 CI-band programme in full — the natural-fit DRAW classification, the
99.9% uniform level lock, the WS-1/WS-2/WS-3 workstream structure, and the Appendix B/C no-band
and decorative-distinguish sets. The disposition of every former band candidate is subsumed by
the §2 classification: the cards that left the draw set were leaving it because they are
PER-UNIT-OR (the honest object is a per-unit display, not a band) or because no plot could host
a pooled band — both of which this programme answers directly. The one decorative-distinguish
item that remains live independent of the band question (Within-Row Variance's display cuts not
matching the engine `Z_THRESH`) carries into the Family B pass.

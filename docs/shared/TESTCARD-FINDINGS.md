# Test card findings — item-46 full-battery sweep queue

Living document. Reset at **S186** for the item-46 full-battery visual sweep
(the Phase A close gate). Findings surfaced during the sweep land here, routed
either to a fabrication-category section (per-card findings) or to one of the
five battery-wide axis sections (cross-cutting findings).

**Predecessor content cleared.** The S133g walkthrough findings (DS01/02/04/21)
that previously filled this doc fed the A2.x per-cluster design passes, which
**closed at S185** (all seven cluster passes complete). Those findings are
archived in the A2 session summaries; they are not carried into the item-46
queue. The taxonomy here is rebuilt against the current display system.

Roster + coverage matrix **source-confirmed S186** against
`src/constants/mechanisms.js` (`TEST_MECHANISM` + `DISPLAY_NAMES`) and
`test/validate-batch.mjs` EXPECTED (the declared per-test flag allow-set).

---

## Taxonomy

**Five fabrication categories** (authoritative — INVESTIGATION-DISPLAY-SPEC
§Category System), fixed display order:

`copied → digits → shapes → replicate → group`

| Order | Category (display) | Internal key | Dim |
|---|---|---|---|
| 1 | Copy, Paste, Edit | `copied` | I |
| 2 | Unusual Digits | `digits` | II |
| 3 | Distribution Shapes | `shapes` | V |
| 4 | Cross-Replicate Comparisons | `replicate` | III |
| 5 | Cross-Condition Comparisons | `group` | IV |

**28 active cards** distributed 3 / 5 / 3 / 14 / 3 across the five categories.

**Cell-level is a localisation scope, not a sixth category.** The convergence
localisation contract assigns each localising test one scope: cell / row / block
/ window / column / global. **Value-Frequency Spike is the only test emitting a
per-cell `(row,col)` scatter** (S185, by walking `extractCellFlags` in
`convergence.js`); every other localiser is row / block / window / column /
global. So the "cell-level cluster" = VFS alone — an annotation on VFS (Unusual
Digits category), not a top-level section.

> **Two name strings per card.** The **canonical test name** is the
> `TEST_MECHANISM` key (engine identity, S132g convention — load-bearing, used
> in the EXPECTED allow-set). The **display name** is the `DISPLAY_NAMES` value
> — *what renders on the card and what the sweep matches on screen*. Several
> display names differ sharply from the canonical name (e.g. Mahalanobis Row
> Outlier → "Unusual rows"; Autocorrelation → "Noise predictability"). The sweep
> running order keys on the **display name**.

---

## Card roster (28) by category

Canonical test name · **display name (on-screen)** · localises · scope.
Scope / localises-flag from INVESTIGATION-DISPLAY-SPEC, reconciled with the
documented splits.

### 1. Copy, Paste, Edit — `copied` (3)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Exact Duplicate Detection | **Duplicated data** | ✅ | Row / block / column-segment |
| Constant-Offset Blocks | **Duplicated and offset** | ✅ | Row-pair × column |
| Residual Spike Correlation | **Correlated residuals** | ✅ | Top-K row |

### 2. Unusual Digits — `digits` (5)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Benford's Law (First Digit) | **First-digit frequencies** | ❌ | Global |
| Benford's Law (Second Digit) | **Second-digit frequencies** | ❌ | Global |
| Terminal Digit Uniformity | **Last-digit frequencies** | ❌ | Global |
| Decimal Precision Consistency | **Decimal places** | ❌ | Global |
| Value-Frequency Spike | **Repeated digits** | ✅ | **Cell** (sole cell-level test) |

### 3. Distribution Shapes — `shapes` (3) — *the trio*

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Entropy / Zipf Analysis | **Value entropy** | ❌ | Global (column-level detail) |
| Column Goodness-of-Fit | **Column shape fit** | ❌ | Global (column-level detail) |
| Modality Test | **Column modality** | ❌ | Global (column-level detail) |

### 4. Cross-Replicate Comparisons — `replicate` (14)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Inter-Replicate Correlation | **Inter-replicate correlation** | ✅ | Window |
| Excess Kurtosis | **Replicate noise shape** | ❌ | Global / condition |
| Autocorrelation | **Noise predictability** | ❌ | Global |
| Windowed Autocorrelation | **Windowed autocorrelation** | ✅ | Window |
| Runs Test | **Row-order randomness** | ✅ | Window |
| Row-Mean Runs | **Row-mean patterns** | ✅ | Window |
| Noise Scaling With Measurement Size | **Noise scaling** | ❌ | Global |
| Within-Row Variance | **Row variance scan** | ✅ | Row |
| Selective Noise Partitioning | **Distribution of noise across columns** | ✅ | Column |
| Regional Noise Homogeneity | **Regional noise** | ✅ | Window × column block |
| LOESS Residual Analysis | **Noise consistency** | ✅ | Changepoint + window |
| Mahalanobis Row Outlier | **Unusual rows** | ✅ | Outlier row |
| Blocked Mahalanobis | **Block covariance anomaly** | ✅ | Block (window × Σ) |
| Missing Data Pattern † | **Missing data patterns** | ✅ | Block |

† Interim placement (category description doesn't strictly apply — re-home when
File Integrity / Dim VI lands, or scope-restrict to cross-condition missingness).

### 5. Cross-Condition Comparisons — `group` (3)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Cross-Condition Rank Correlation | **Cross-condition similarity** | ❌ | Global |
| Baseline Balance | **Condition balance** | ❌ | Global |
| Cross-Condition Consistency | **Cross-condition consistency** | ❌ | Global |

**Roster count:** 3 + 5 + 3 + 14 + 3 = **28** ✓ (source-confirmed S186).

> Source housekeeping note (Code-owned, non-blocking): the inline comment at
> `mechanisms.js:36` reads "Cross-Replicate Comparisons (11)" but the block holds
> 14. Stale comment, not load-bearing — flag for the next `mechanisms.js` touch.

---

## Coverage matrix — card × reachable state (item-46 prep task 2)

For each card: the **anchor fixture** that surfaces it in its flagged state (the
sweep's load-bearing inspection target), plus the clean counterpart where one
exists. Anchors and tiers are the declared `EXPECTED.flags` allow-set, verbatim
from `validate-batch.mjs` (S186 confirm). Clean fixtures
(DS01/03/05/07/09/12a/17) declare no flags. "M/H" = `[MODERATE, HIGH]` declared.

Cards with **no fixture exercising their flagged state** inspect at LOW / N-A
only — flagged-state chrome never visually verified, marked **pending-fixture**.

| Canonical test | Display (on-screen) | Anchor fixture (declared tier) | Clean | Notes |
|---|---|---|---|---|
| **Copy, Paste, Edit** | | | | |
| Exact Duplicate Detection | Duplicated data | DS04 (HIGH), DS14 (HIGH) | DS03 | Also DS06/DS10 HIGH |
| Constant-Offset Blocks | Duplicated and offset | DS08 (M/H) | DS07 | |
| Residual Spike Correlation | Correlated residuals | DS02 (M/H), DS11 (M/H) | DS09 | |
| **Unusual Digits** | | | | |
| Benford's Law (First Digit) | First-digit frequencies | DS08 (HIGH) | DS07 | True detection (S182) |
| Benford's Law (Second Digit) | Second-digit frequencies | DS10 (HIGH), DS11 (HIGH) | DS09 | |
| Terminal Digit Uniformity | Last-digit frequencies | DS04 (HIGH) | DS03 | Named target |
| Decimal Precision Consistency | Decimal places | **pending-fixture** | — | No declared anchor (S186 confirm) |
| Value-Frequency Spike | Repeated digits | DS13 (HIGH), DS04 (M/H), DS06 (M/H) | DS03/05 | Sole cell-level card |
| **Distribution Shapes** | | | | |
| Entropy / Zipf Analysis | Value entropy | **pending-fixture** | — | N/A on count; no continuous anchor |
| Column Goodness-of-Fit | Column shape fit | DS20 (M/H), DS10 (M/H) | DS17/19 | Per-condition routed (S179) |
| Modality Test | Column modality | **pending-fixture** | — | Un-exerciseable at current separations (S184) |
| **Cross-Replicate** | | | | |
| Inter-Replicate Correlation | Inter-replicate correlation | DS02 (M/H), DS08 (M/H) | DS09 | |
| Excess Kurtosis | Replicate noise shape | **pending-fixture** | — | No declared/acknowledged M/H anywhere (S186; corrects prior DS04/DS08 anchor) |
| Autocorrelation | Noise predictability | DS21 (HIGH), DS11 (HIGH) | DS03 | Also DS20/DS22 M/H |
| Windowed Autocorrelation | Windowed autocorrelation | **pending-fixture** | — | Below MOD floor (parked #15); `startRow`/`endRow` row-remap caveat |
| Runs Test | Row-order randomness | DS21 (M/H), DS22 (M/H), DS02 (M/H) | DS03 | §2 chip via S129 add-8 |
| Row-Mean Runs | Row-mean patterns | DS21 (M/H) | DS03 | §2 chip via S129 add-8 |
| Noise Scaling With Measurement Size | Noise scaling | DS06 (HIGH) | DS05 | log-log slope reader |
| Within-Row Variance | Row variance scan | **pending-fixture** | — | No flagged firing; N/A on ordinal (DS14); parked #32 |
| Selective Noise Partitioning | Distribution of noise across columns | DS08 (M/H), DS20 (HIGH) | DS07 | col-only no-§2-chip on DS20 (parked #6) |
| Regional Noise Homogeneity | Regional noise | DS10 (M/H), DS21 (M/H) | DS09 | |
| LOESS Residual Analysis | Noise consistency | DS08 (M/H), DS10 (M/H), DS12b (M/H) | DS09 | DS12b is the sev-1 anchor |
| Mahalanobis Row Outlier | Unusual rows | **DS06 (HIGH), DS08 (HIGH) — incidental** | — | ACKNOWLEDGED, not declared (S186); flagged chrome inspectable but undeclared |
| Blocked Mahalanobis | Block covariance anomaly | DS21 (M/H), DS22 (M/H), DS15 (M/H) | — | K/N detection ceiling at HIGH (METH §2.6b) |
| Missing Data Pattern | Missing data patterns | DS15 (HIGH) | — | |
| **Cross-Condition** | | | | |
| Cross-Condition Rank Correlation | Cross-condition similarity | **pending-fixture** (item 24) | — | No ≥4-condition fixture |
| Baseline Balance | Condition balance | DS16 (M/H) | DS17 | DS15 LOW (feature-count-limited, S182) |
| Cross-Condition Consistency | Cross-condition consistency | DS15 (M/H), DS19 (M/H) | DS17 | DS21 Stage-2 P5 LOW |

### Pending-fixture cards — 7 (inspect at LOW / N-A only)

No fixture exercises their flagged state; flagged-state chrome never visually
verified. The sweep inspects them at LOW/N-A and marks flagged display as
design-against-expected:

1. **Decimal Precision Consistency** ("Decimal places") — no declared anchor (S186 confirm).
2. **Excess Kurtosis** ("Replicate noise shape") — no declared/acknowledged M/H anywhere; LOW across the suite by completeness-gate logic (S186 confirm; corrects the S109-prose "platykurtic detections" read that had implied a DS04/DS08 anchor).
3. **Entropy / Zipf Analysis** ("Value entropy") — N/A on count; no continuous positive anchor.
4. **Modality Test** ("Column modality") — un-exerciseable at current mixture separations (S184); sibling to CCR.
5. **Windowed Autocorrelation** ("Windowed autocorrelation") — below MOD floor (parked #15); carries the `startRow`/`endRow` row-remap caveat.
6. **Within-Row Variance** ("Row variance scan") — no flagged firing; N/A on ordinal (DS14); parked #32 axes un-probed.
7. **Cross-Condition Rank Correlation** ("Cross-condition similarity") — N/A everywhere; needs a ≥4-condition fixture (item 24).

### Incidental-only anchor — 1

**Mahalanobis Row Outlier** ("Unusual rows") fires HIGH on DS06 and DS08 but is
in the `ACKNOWLEDGED` block, not declared — the firings are real-but-incidental
one-row outliers downstream of other manipulations (S182/S183). Its flagged
chrome *is* inspectable on DS06/DS08, but as an undeclared firing. Distinct from
the 7 pending-fixture cards (their flagged chrome isn't reachable at all).

**Coverage honesty:** 8 of 28 cards (7 pending + 1 incidental-only) have flagged
chrome that is either unreachable or only incidentally reachable. The sweep notes
these as design-against-expected / incidental rather than verified detections.

---

## Cross-cutting findings — the five item-46 axes

Battery-wide findings land here, not in per-card sections. Axes per STATUS
item 46. Empty until the sweep populates them.

### Axis 1 — Plot consistency (battery-wide, decided in one pass)

Shared visual language across all plots: colour / data-ink (tokens not hex,
signal only for flags), axis treatment, reference-line style + label placement,
flagged-vs-cleared rendering, sizing, caption format. The S184 trio bar is the
clean reference instance.

- **Shared spatial-chrome decision (deferred from S185):** one spatial-minimap
  language across the spatial-scatter tests — **VFS ("Repeated digits") /
  Mahalanobis Row Outlier ("Unusual rows") / Regional Noise ("Regional noise") /
  LOESS ("Noise consistency")** — decided once here, not a VFS-only mint.

**S187 (DS21):**
- **Null-band reframe** (lead candidate) — plots calibrate the CI/marker against the observed statistic, producing a battery-wide CI-vs-p coherence mismatch (a 95% CI excluding zero can't prove p < 0.0001). Reframe: draw the H₀ null band, show the observed marker's distance from it, report p as a number. Confirmed on Noise predictability and Row-order randomness (z-marker). Live descendant of the S133f "plot calibrated to the wrong thing" beta-blocker. Decided once here.
- **Strip idiom for runs-family verdicts** — Runs run-strip makes "too few runs" legible; Autocorrelation + Row-Mean Runs overlaid-line/marker plots don't show the signal. Three cards back this. Candidate: runs-family verdicts adopt the strip, not the overlaid line.
- **Plot data-ink weight** — fonts/lines/colours too thin/pale to read as a standalone report figure (fails the Bik standard). Battery-wide.
- **Axis-label overlap (bug)** — y-axis label collides with tick numbers / lane label (Autocorrelation y-axis; Blocked Mahalanobis garbled "Colmr" over "pass·Control"). Shared PlotLayout issue.
- **Reference-line weight** — r=0 dashed line too thin.
- **Legend fidelity** — Mean±95%CI swatch is a bare dot; needs whiskers to match the on-plot marker.
- **Positive plot anchors:** Runs run-strip, Blocked Mahalanobis strip, Regional noise §2 modal.

**Spatial-minimap sub-decision — scope extension (S187):** the shared language must reconcile three highlight granularities on one `MinimapStrip` component, not just the four named tests' idiom — **cell-local** (Regional noise, Rep6 rows), **whole-row** (Blocked Mahalanobis, joint multivariate), **whole-condition** (Row-Mean Runs). Blocked Mahalanobis and Row-Mean Runs aren't in the four named spatial tests but use the same component. Regional noise §2 modal = positive anchor; Row-Mean Runs whole-condition highlight reading as a localised block = the failure case. Deciding on the four named cards alone would have missed the whole-condition case.

### Axis 2 — Per-condition presentation consistency (battery-wide)

- Two-tier table gap: bespoke `condX` tables vs the generic `subDetails` flatten
  (the S184 5-card fix parked them in the generic tier as interim).
- WAC's length-based `isAgg` outlier vs the explicit `groupsAssessed !== undefined`
  flag the other six per-condition cards use.
- Condition-aware bar display — the S184 worst-slice-vs-all-slice scope split
  (accepted limitation: bar shows one condition, table shows all; DS20 GoF Col 8).
- WAC `startRow`/`endRow` row-remap caveat (per-condition table shows array-index
  rows until addressed).

**S187 (DS21):**
- **Per-condition split is invisible — Blocked Mahalanobis.** The test runs separately within each condition (correct; a window straddling the Control/Treatment boundary would flag the treatment effect itself), but the display never communicates it: only the Control lane shows (clean Treatment not shown as tested-and-clear — completeness-gate-proves-absence violated in the plot), "36 windows" is a pooled count hiding the per-condition structure, and the Condition column presents as incidental despite being the per-condition key. First per-condition-*observable* surface the sweep reaches (DS20 Column GoF, S189, is the second). Does NOT close the four S184 isAgg/subDetails fixes — those await a flagged per-condition firing (Pending verification). Carry both surfaces into the S189 DS20 look so the per-condition display convention is decided with both in view.

### Axis 3 — Body-level standalone-crop chrome (battery-wide)

Whether the test name + tier word should render redundantly in the card body so
a cropped screenshot carries the verdict (currently only in TestCardLayout
chrome). Surfaced by the S185 VFS pass. Bik standard: every plot / chip /
minimap / excerpt table reads as a standalone screenshot.

**S187 (DS21):** the strongest evidence visuals already read as standalone crops without the TestCardLayout chrome — Runs run-strip, Blocked Mahalanobis strip, Regional noise §2 modal. The weak ones (Noise predictability pale CI marker, Row-Mean Runs noisy overlay) don't, but that's a plot-quality issue (Axis 1), not a standalone-crop-chrome issue. So far DS21 doesn't force the "render test name + tier word redundantly in the body" decision — the verdict badge sits in chrome and the strips carry the argument. Hold the Axis-3 decision; revisit when a card's evidence visual is strong but the verdict only lives in chrome.

### Axis 4 — TESTCARD-FINDINGS reset

This document. **Done at S186** (reset + source-confirmed roster/matrix);
per-card and cross-cutting sections populate as the sweep runs.

### Axis 5 — Coverage matrix

The card × reachable-state matrix above. **Done at S186**, source-confirmed.

---

## Cross-cutting findings pending an axis home (S187)

The sweep surfaced battery-wide themes that item-46's five axes don't cover. Item-46 axes are defined by STATUS, so these aren't unilaterally added as axes — flagged here for the S190 synthesis to place (new axis / fold into an existing one / route to STATUS).

- **Table row-inclusion convention.** Each evidence table should justify itself against its plot — show flagged rows + whatever the plot can't convey, drop ranking-tail padding. Positive anchor: Regional noise (2 flagged windows, no padding). Wrong direction: Blocked Mahalanobis (top-6-of-36, 4 non-significant), Runs (all 28 pairs). Not Axis 1 (tables aren't plots), not Axis 2 (not per-condition-specific).
- **Verdict legibility (display half).** Expose each card's tier-promotion basis (the disclosure names the gate for *this* test) + a one-time tier explainer — worded as evidence strength, NOT asserting cross-test FP-equivalence until the v1.0 tier-calibration blocker lands (STATUS §v1.0 blockers; V1X §5.4). Shares its first read-only source-read with that blocker.
- **Affordance discoverability (candidate v1.0 usability, STATUS).** Every expandable/collapsible control must signal expandability with one consistent grammar; cleared/LOW states are the worst offenders (subsumes the LOW-fold-expansion finding). If reviewers can't discover expansion, they never reach the evidence layer — the product. Inventory pending (`S187-READONLY-expansion-affordance-audit.md` Part 2). This is a whole interaction-design theme the five axes never anticipated — strongest candidate for a new axis. The cleared-strip-specific instance is already in BANKED (Hover/alignment carries: "CLEAR-strip expandability") — this finding widens it from the CLEAR strip to all expandable controls; consolidate at synthesis.
- **Footer conventions.** "No engine internals in footers" (W=30 / B=4999 / 78 windows leak across three cards); footer-referent ("of what") convention; Obs/Exp-inline footer as the good shape (Row-Mean Runs anchor). Possibly folds into Axis 1's "caption format" clause — synthesis decides.
- **p-formatting.** Keep real p-values (not a uniform "< 0.0001" bucket); standardise format — "< 0.0001" only below floor, exact value above. Possibly Axis 1 caption/format.
- **§2 chip-surface items** — not axis candidates; routed out. The two behavioural bugs (deselect flashes colour; deselect-then-reselect doesn't reapply table-wide colouring) → STATUS Known bugs. The "applies across the whole dataset" callout-too-large-when-compressed → BANKED Chip/card chrome (responsive polish). Sibling to the existing BANKED deselected-chip resting-state item.

## Open source questions (S187 — for the next read-only Code trip)

- Runs Test: is the per-pair `p` column raw or BH-adjusted, and is pooled p Stouffer or Fisher? (Two p-regimes on the card; copy fix depends on the answer.)
- Row-Mean Runs: what is the faint blue/lavender plotted element absent from the legend?
- (Fold into `S187-READONLY-expansion-affordance-audit.md`'s next run, or a fresh read-only at S188.)

## Per-card sweep findings

Empty until the sweep runs. Append per-card findings under the owning category.

### Copy, Paste, Edit
*(none yet)*

### Unusual Digits
*(none yet — VFS cell-level card landed S185; sweep re-inspects)*

### Distribution Shapes
*(none yet)*

### Cross-Replicate Comparisons
**DS21 pass (S187).** Five flagged cards + two LOW folds. Cross-cutting items lifted to the axes are noted inline and not repeated here.

#### Noise predictability (Autocorrelation) · DS21 HIGH
- Subhead "Values follow on too predictably from the one before" — still doesn't convey *serial correlation in the replicate-difference series*. (design/copy)
- Footer referent gap — "positive autocorrelation [of what] · 28 pairs [of what]". Suggested: "28 replicate pairs · positive serial correlation in replicate differences · mean |r| = 0.063 · p < 0.0001". (design/copy) → footer-referent theme (homeless, see §Pending an axis home).
- Legend "All data" → "Mean r across all replicate pairs". (design/copy)
- Pooled table hard to relate to the plot; "pairs sig" (3/28) opaque; no shared anchor between CI marker and table. (design/content)
- "Higher-lag (2–5)… survives pooled BH-FDR…" footnote cryptic. (design/copy)
- Family label "Cross-replicate comparisons" ✓. "High p < 0.0001" badge ✓.
- **Coherence bug:** the 95% CI marker can't be the visual proof of p < 0.0001 — a CI excluding zero shows p < 0.05. Marker and badge are on different scales. (bug) → Axis 1 (tied to the null-band reframe).
- **Lag 2–5 display (design decision, S187):** the test already uses lags 2–5 as a corroboration gate (the cryptic footnote). Display it, don't re-engineer — per-lag null band (low lags poke above, high lags inside) + three-tier emphasis (verdict lag dominant w/ whiskers, corroborating lags mid-weight, context lags de-emphasised) + a plain sentence stated as state ("lags 2–5 show the same positive structure and survive correction… not a single-lag artefact"). Do NOT frame as decay — the diluted windowed signal (0.063…0.030) is too shallow. Band → Axis 1; emphasis + sentence → per-card.

#### Row-order randomness (Runs Test) · DS21 M/H
- Subhead "The order of values isn't random" — misses the diff (sign sequence of the *replicate-difference* series). (design/copy)
- Footer "of what" gap — "28 replicate pairs · too few sign-runs in the replicate-difference series". (design/copy)
- "All replicate pairs" weak table title. (design/copy)
- **Run-strip = positive exemplar** — best evidence visual in the load; reads as a standalone crop. → Axis 1 (plot positive anchor) + Axis 3 (standalone-crop anchor).
- Plot 1 z-marker: same CI-vs-p mismatch as Noise predictability (confirms battery-wide). → Axis 1.
- Plot 2 run-strip: no expected band needed (qualitative pattern view) — don't force symmetry between the two plots. (design decision)
- "Verdict: pooled mean-z across pairs" — strange as a title; should be a caption. (design/copy)
- `z`: keep but demote — bridge to p, but the Finding column is what a non-statistician reads. (design decision)
- **Open source question:** is the per-pair `p` column raw or BH-adjusted, and is pooled p Stouffer or Fisher? Two p-regimes on one card. → §Open source questions.
- Table all-pairs (28, padded) → table-row-inclusion theme (homeless).

#### Row-mean patterns (Row-Mean Runs) · DS21 M/H
- **Self-correction (S187):** this is NOT a diff test — it averages each row across replicates and counts crossings of the condition mean. "Row averages" in the subhead is *correct*; "trend unexpectedly" is the vague part. Do NOT write a blanket "subhead should say replicate-difference" rule — wrong for this card.
- Footer "200 rows · 76 crossings (expected 100) · p" — **best footer of the three**, carries Obs-vs-Exp inline → footer-convention positive anchor (homeless theme).
- "How this test works" description strong; do NOT merge into the footer (footer = result, description = method). (design decision)
- Plot: 76 vs 100 crossings — density difference invisible in a noisy 200-point overlay; wrong idiom for a runs-family verdict; wants the strip treatment. → Axis 1.
- **Legend gap (bug):** faint blue/lavender plotted element not in the legend. Label or remove. → §Open source questions (what is it?).
- **§2 locality-tier contradiction:** callout says "the whole condition is implicated" (whole-condition tier) but the surface renders per-row highlight that reads as a localised tail block (viewport at the Control/Treatment boundary). Whole-condition findings shouldn't use the localised-block highlight idiom. (bug/design) → Axis 1 (spatial-minimap sub-decision).
- §2 uses the shared `MinimapStripVertical` though Row-Mean Runs isn't one of the four named spatial-minimap tests → the spatial-minimap decision must cover the whole-condition case. → Axis 1 (scope extension).

#### Block covariance anomaly (Blocked Mahalanobis) · DS21 M/H
- Subhead "shifted covariance or mean" — fuzziness is *truthful* (two passes: μ-pass T² = mean shift, Σ-pass λ = covariance shift; on DS21 the μ-pass fires). Keep the subhead general; the finding-clause names the pass that fired. (design/content)
- Footer leaks engine internals (W=30, stride=10, B=4999) → demote to disclosure. → footer-convention theme (homeless).
- "Flagged blocks by pass and condition" — bad plot title. (design/copy)
- **Bug:** plot y-axis label collides with the lane label, rendering garbled "Colmr" over "pass · Control". Same class as the Autocorrelation y-axis collision. → Axis 1 (battery-wide axis-label overlap).
- Strip plot good, standalone crop → Axis 1 + Axis 3 anchor.
- "Should block be row?" — test is inherently multivariate (joint (μ,Σ) over all replicate columns); block is correctly a row-range, not column-decomposable. Card should *say* it's a joint multivariate shift not attributable to specific columns. (design/content)
- §2 modal per-row highlight here *matches* the claim ✓ (contrast Row-Mean Runs).
- Table: "Pass" + mixed-statistic column (T² vs λ, distinguished only by symbol) hard to parse → reframe "Mean shift (T²)" / "Covariance shift (λ)". Keep the Condition column (join key to the strip). Top-6-of-36 with non-significant padding → table-row-inclusion theme (homeless). Modal match-up across plot/table/modal ✓ → coherence anchor.
- **Per-condition split invisible (S187):** the test runs separately within each condition (correct — prevents treatment-effect contamination), but the display never says so: (a) only the Control lane shows — clean Treatment isn't shown as tested-and-clear (completeness-gate-proves-absence violated in the plot); (b) "36 windows" is a pooled count hiding per-condition structure; (c) the Condition column does heavy lifting but presents as incidental. → **Axis 2** (per-condition presentation). Per-condition-*observable* here but does NOT close the four S184 isAgg/subDetails fixes (no flagged per-condition firing — Pending verification stands).
- **Parked #50:** genuine-block detection — the flagged window is a fixed-W=30 scan artefact, not the block's true extent (changepoint/variable-extent extension; V1X §2.2).

#### Regional noise (Regional Noise Homogeneity) · DS21 M/H
- Subhead "Variability changes in patches" — "patches" vague → "noise variability differs in some row regions from the rest of the column". (design/copy)
- Footer "78 windows scanned" — engine internal → footer-convention theme (homeless). Keep "worst: Rep6 rows 82–96, SD ratio 4.37× (quieter than expected)".
- **Obs SD / Exp SD / SD ratio / Finding table = positive anchor** for the Obs/Exp convention (SD ratios not variance ratios, plain "Quieter") ✓.
- **§2 modal coordination = best in the load** (Rep6 column highlighted, row window scrolled in, minimap band) → Axis 1 spatial-minimap positive anchor + Axis 3 standalone-crop anchor.
- **Bug (confirmed by S187 read-only trace):** §2 highlight drops the second flagged window (Rep6 102–116). `convergence.js` Regional-Noise `extractCellFlags` branch reads only scalar `bestWindowRows`/`bestAnomCol`, never loops `result.details[]`. Single-site (8/9 windowed tests loop; downstream compose/aggregator handle N regions). Fix prompt: `S188-REGIONALNOISE-MULTIWINDOW-FIX.md`. (bug, fix known)
- Table shows only the 2 flagged windows (no padding) = the *right* behaviour → table-row-inclusion positive anchor (Blocked Mahalanobis should match THIS).
- **Secondary bug:** footer 4.37× vs table 4.38× = double-rounding on the same SD-ratio value across two render paths (`MiniCard_RegionalNoise.jsx`). Fix = single-source the SD ratio. (bug)
- Cleared-tests strip renders cleanly, truncates, expandable ✓ (preview of the S189 cleared-state pass).

#### LOW folds (S187) — Windowed autocorrelation, Cross-condition consistency P5
- **LOW/cleared cards don't expand.** Product decision (S187): they SHOULD expand to method + evidence (How-this-works + the plot/table showing *why* it's clear), withholding finding-specific blocks (Implications / What-to-look-for). Source-check pending (`S187-READONLY-expansion-affordance-audit.md` Part 1). → carry to S189 cleared-state pass + affordance theme (homeless).
- WAC `startRow`/`endRow` row-remap caveat (Axis 2 pre-existing item) — not advanced; the fold couldn't be opened to inspect.

### Cross-Condition Comparisons
*(none yet)*

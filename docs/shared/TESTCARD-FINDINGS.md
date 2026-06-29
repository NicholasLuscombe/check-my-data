# Test card findings — item-46 full-battery sweep queue

Living document. Reset at **S186** for the item-46 full-battery visual sweep
(the Phase A close gate). Findings surfaced during the sweep land here, routed
either to a fabrication-category section (per-card findings) or to one of the
five battery-wide axis sections (cross-cutting findings). **S191 synthesis closed
item-46:** five-axis design calls + §2-emission cluster resolved (no shared root
cause). See SESSION191B-CHAT-SUMMARY §1 for full rationale.

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
> Outlier → "Unusual rows"; Autocorrelation → "Noise correlation"). The sweep
> running order keys on the **display name**.
>
> **Display names refreshed to the S200 stage-1 set (`bd536a4`)** in the roster
> table below. The sweep-findings prose and coverage matrix further down still
> use the **pre-S200 display names** that were on screen when each finding was
> logged (e.g. "Noise predictability", "Repeated digits", "Correlated residuals")
> — that is deliberate: the findings are a historical record keyed to what the
> card said at sweep time. Use the canonical-name column to bridge old prose to
> new titles. A future sweep re-keys to current names.

---

## Card roster (28) by category

Canonical test name · **display name (on-screen)** · localises · scope.
Scope / localises-flag from INVESTIGATION-DISPLAY-SPEC, reconciled with the
documented splits.

### 1. Copy, Paste, Edit — `copied` (3)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Exact Duplicate Detection | **Duplicated Data** | ✅ | Row / block / column-segment |
| Constant-Offset Blocks | **Offset copies** | ✅ | Row-pair × column |
| Residual Spike Correlation | **Shared noisy rows** | ✅ | Top-K row |

### 2. Unusual Digits — `digits` (5)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Benford's Law (First Digit) | **First-Digit Frequencies** | ❌ | Global |
| Benford's Law (Second Digit) | **Second-Digit Frequencies** | ❌ | Global |
| Terminal Digit Uniformity | **Last-Digit Frequencies** | ❌ | Global |
| Decimal Precision Consistency | **Decimal precision** | ❌ | Global |
| Value-Frequency Spike | **Over-used numbers** | ✅ | **Cell** (sole cell-level test) |

### 3. Distribution Shapes — `shapes` (3) — *the trio*

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Entropy / Zipf Analysis | **Distinct numbers** | ❌ | Global (column-level detail) |
| Column Goodness-of-Fit | **Column Goodness-of-Fit** | ❌ | Global (column-level detail) |
| Modality Test | **Number of peaks** | ❌ | Global (column-level detail) |

### 4. Cross-Replicate Comparisons — `replicate` (14)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Inter-Replicate Correlation | **Inter-Replicate Correlation** | ✅ | Window |
| Excess Kurtosis | **Noise distribution** | ❌ | Global / condition |
| Autocorrelation | **Noise correlation** | ❌ | Global |
| Windowed Autocorrelation | **Local noise correlation** | ✅ | Window |
| Runs Test | **Noise sign-pattern** | ✅ | Window |
| Row-Mean Runs | **Row-mean patterns** | ✅ | Window |
| Noise Scaling With Measurement Size | **Noise scaling** | ❌ | Global |
| Within-Row Variance | **Within-row noise** | ✅ | Row |
| Selective Noise Partitioning | **Column-to-column noise** | ✅ | Column |
| Regional Noise Homogeneity | **Region-to-region noise** | ✅ | Window × column block |
| LOESS Residual Analysis | **Noise level trend** | ✅ | Changepoint + window |
| Mahalanobis Row Outlier | **Unusual rows** | ✅ | Outlier row |
| Blocked Mahalanobis | **Shifted blocks** | ✅ | Block (window × Σ) |
| Missing Data Pattern † | **Missing-data pattern** | ✅ | Block |

† Interim placement (category description doesn't strictly apply — re-home when
File Integrity / Dim VI lands, or scope-restrict to cross-condition missingness).

### 5. Cross-Condition Comparisons — `group` (3)

| Canonical test name | Display (on-screen) | Localises | Scope |
|---|---|---|---|
| Cross-Condition Rank Correlation | **Cross-Condition Rank Correlation** | ❌ | Global |
| Baseline Balance | **Baseline Balance** | ❌ | Global |
| Cross-Condition Consistency | **Overall condition similarity** | ❌ | Global |

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
item 46.

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

**S188 (DS08):**
- **Plot wrapper width / hugging plot** — three-card confirmation across DS08
  (Selective Noise, Benford 1st, IRC modal matrix all sit in full-browser-width
  wrappers with plot interior ~30-40%). DS02 IRC was first confirmation; promote
  from candidate to confirmed Axis 1 finding.
- **Conditional legend rendering — no dead swatches.** When a legend category
  doesn't paint on the plot, the swatch should not render. DS08 confirms on
  Selective Noise ("Flagged column" never renders — joint Bartlett fires but no
  per-column adj.p clears α; locked S162b "fires globally but no column
  individually flags" anchor) and IRC ("Elevated replicates" never renders on
  the DS08 matrix — only "Expected" and "Highly correlated outlier pair" paint).
- **Figure presence on flagged cards.** Every flagged card should carry a
  figure that makes the forensic argument standalone-readable (Bik standard).
  Constant-Offset Blocks is the one DS08 card that doesn't. METHODOLOGY-MAP
  S162b already predicts LOESS-shape ("Block-anchored ('Rows A-B'); per-block
  detail array") — the table is there, the plot is missing. Recommendation:
  per-row log-difference plot for the flagged pair, block rows highlighted,
  LOESS-idiom parallel.
- **Reference-line vocabulary register — "Threshold" vs "Expected".** Real
  semantic distinction the chrome doesn't anchor: "Expected" = null-model
  predicted value (Benford curve, LOESS trend, predicted σ); "Threshold" =
  flag cutoff (chi-square critical value, Mahalanobis distance cutoff). Both
  render as reference lines on plots but mean different things.
- **§2 highlight emphasis by forensic role.** Refines the spatial-minimap
  sub-decision with a second orthogonal dimension: values-as-evidence (DupDet,
  VFS, Constant-Offset — numbers carry the argument; bold emphasis on values
  is right) vs position-as-evidence (Mahalanobis Row Outlier, Within-Row
  Variance, Regional Noise — position carries the argument; value emphasis
  misleads). Possible idioms: dim digits in position-as-evidence cases,
  border-only vs fill, different fill colour. Same visual idiom currently
  serves both forensic roles.
- **§2 highlight idiom-per-scope catalogue.** DS08 catalogues seven distinct
  scope idioms: no-highlight (Benford), column-level (Selective Noise),
  pair-level dataset-wide (IRC global), pair-level row-region (IRC windowed,
  Constant-Offset Blocks), row-region × all-data-cols (LOESS, Regional Noise,
  Row-Mean Runs, Blocked Mahalanobis, Windowed Autocorr), row-level all-cols
  (Mahalanobis Row Outlier, Within-Row Variance), cell-level (VFS, DupDet).
  Synthesis input for the §2-highlight-idiom-per-scope decision.
- **Vocabulary consistency in Dim III-B.** Selective Noise alone uses
  "variable" (subhead) + "spread" (plot title) + "variance" (table title +
  footer) + "residual" (y-axis label) for the same quantity on one card.
  Spans the planned Dim III-B merge — METHODOLOGY-MAP STATUS 12 marks
  Selective Noise + Regional Noise + LOESS for merge into unified SD scan,
  providing an architectural deadline for the vocabulary pass.

**Axis 1 — design calls made (S191 synthesis):**
- **Null-band reframe = the family pattern.** Confirmed Noise predictability + Row-order randomness + DS11. Every "is this within expected" plot leads with the band, observed series on top. DS06 Noise scaling is the positive pole, generalised.
- **Strip idiom for runs-family verdicts.** Run-strip-inside-band is the standalone-readable form for runs/autocorrelation.
- **One spatial-minimap vocabulary across the three highlight granularities** (cell / row-window / column-local). The Part-4 triage confirms the granularities are real and distinct (IRC proves the two-arm scope is correct), so the minimap must express all three, not collapse them. The §2-highlight-idiom-per-scope homeless theme resolves into this call.
- **Width + axis-label fixes → Tier-3 chrome queue:** plot-wrapper-width (4+ fixtures), axis-label overlap + "Colmr" garble (battery-wide, cross-fixture DS15).

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

**S188 (DS08):** Per-element evidence in card body / modal — two-card
confirmation that flagged cards lack the row-level evidence behind the
aggregate. IRC modal carries the pair-level matrix (r=0.99) but no scatter
for the flagged pair — reader can't see which row-pairs drive the
correlation or whether a single row is the outlier. Constant-Offset Blocks
card body lists block ranges + offset but doesn't surface the row-pair
values that ARE shifted; reader has to mentally reconstruct from the §2
modal. Bik-standard implication: card body should carry the per-element
evidence that makes the aggregate inspectable, not just the aggregate
itself. Folds into the Axis-3 decision but extends the question — not
"render verdict word in body" but "render per-element evidence in body".
Synthesis decides whether to fold here or split off.

### Axis 4 — TESTCARD-FINDINGS reset

This document. **Done at S186** (reset + source-confirmed roster/matrix);
per-card and cross-cutting sections populate as the sweep runs.

### Axis 5 — Coverage matrix

The card × reachable-state matrix above. **Done at S186**, source-confirmed.

---

## Cross-cutting findings pending an axis home (S187)

The sweep surfaced battery-wide themes that item-46's five axes don't cover. Item-46 axes are defined by STATUS, so these aren't unilaterally added as axes — flagged here for the S191 synthesis to place (new axis / fold into an existing one / route to STATUS). **The synthesis placements are recorded at the end of this section (S191B); the open framings below stand as the evidence trail that led to them.**

**§2-emission cluster — RESOLVED at S191 synthesis (no shared root cause).** Reading all four Part-4 branches together, the cluster is not one bug — it splits four ways:
- **Selective Noise = wrong-field bug.** `extractCellFlags` reads `colDetails[].residualStd` (descriptive max/min-SD pair), not the inference `perColumnResults[].flagged`. Queued Tier-1 #1 (landed S192 Fix 1 — see the Selective Noise per-card block). Methodology locked: the §2 highlight layer asserts *localisation* — no-localisation → no-highlight (battery-wide invariant).
- **Constant-Offset = misattributed.** The over-paint is `finalizeConvergence` ignoring `g.pair`, not `extractCellFlags` (which scopes correctly). Queued Tier-1 #2 (landed S192c — the operative cause was actually a `parsePairCols` regex miss on the R-prefixed label; see the Constant-Offset per-card block).
- **IRC = not a bug.** Two-arm `d.source` gate correctly distinguishes windowed-pair from global-pair scope. The reference implementation.
- **Mahalanobis = not a field bug.** Plot y and table Distance both bind `dSquared`; the apparent mismatch is threshold-vs-dots + strict `v > thresh`. Possible display clarification post-v1.0.

The S127c pattern at battery scale: each "diagnostic disagrees with screenshot" was a routing/field question resolved by source, not a verdict question.

- **Table row-inclusion / content-adaptiveness convention.** Each evidence table should justify itself against its plot — show flagged rows + whatever the plot can't convey, drop ranking-tail padding. Positive anchor: Regional noise (2 flagged windows, no padding). Wrong direction: Blocked Mahalanobis (top-6-of-36, 4 non-significant), Runs (all 28 pairs). Not Axis 1 (tables aren't plots), not Axis 2 (not per-condition-specific). **S190 promotes this to a firm cross-cutting theme — four-fixture confirmation of the broader principle that table column/row sets should be *content-adaptive* (adapt to what varies on the fixture):** DS04/DS13 Repeated-digits Pass column (load-bearing but constant-per-fixture → drop when invariant); IRC windows table (under-reports — omits per-window adj-p it's entitled to + no truncation disclosure); DS20 Column GoF table (over-reports — three constant columns Family/Direction/adj-p + redundant A²/null-median); DS19 CCC table (em-dash padding rows for properties that didn't run); DS11 Noise predictability pooled-table null-row padding (5th). Two failure modes: *omits* what should show (IRC), *includes* what shouldn't (GoF, CCC). Positive anchors for the sub-conventions: truncation disclosure works on the digit tables ("+16 more") and Condition balance ("Showing 20 of 60") — IRC is the one that omits it.
- **Verdict legibility (display half).** Expose each card's tier-promotion basis (the disclosure names the gate for *this* test) + a one-time tier explainer — worded as evidence strength, NOT asserting cross-test FP-equivalence until the v1.0 tier-calibration blocker lands (STATUS §v1.0 blockers; V1X §5.4). Shares its first read-only source-read with that blocker.
- **Affordance discoverability (candidate v1.0 usability, STATUS).** Every expandable/collapsible control must signal expandability with one consistent grammar; cleared/LOW states are the worst offenders (subsumes the LOW-fold-expansion finding). If reviewers can't discover expansion, they never reach the evidence layer — the product. Inventory pending (`S187-READONLY-expansion-affordance-audit.md` Part 2). This is a whole interaction-design theme the five axes never anticipated — strongest candidate for a new axis. The cleared-strip-specific instance is already in BANKED (Hover/alignment carries: "CLEAR-strip expandability") — this finding widens it from the CLEAR strip to all expandable controls; consolidate at synthesis.

- **Footer conventions.** "No engine internals in footers" (W=30 / B=4999 / 78
  windows leak across three cards); footer-referent ("of what") convention;
  Obs/Exp-inline footer as the good shape (Row-Mean Runs anchor S187; LOESS
  footer S188 "scope · structural · finding · p" reads near-canonical). DS08
  adds five further confirmations: Selective Noise / Benford / IRC / Constant-
  Offset / Mahalanobis Row Outlier all carry stats-before-finding or scope-
  word-missing footers. Convention candidate: scope · structural · finding · p.
  Possibly folds into Axis 1's "caption format" clause — synthesis decides.

- **p-formatting.** Keep real p-values (not a uniform "< 0.0001" bucket); standardise format — "< 0.0001" only below floor, exact value above. Possibly Axis 1 caption/format.
- **§2 chip-surface items** — not axis candidates; routed out. The two behavioural bugs (deselect flashes colour; deselect-then-reselect doesn't reapply table-wide colouring) → STATUS Known bugs. The "applies across the whole dataset" callout-too-large-when-compressed → BANKED Chip/card chrome (responsive polish). Sibling to the existing BANKED deselected-chip resting-state item.

- **Table-title conventions.** Cross-card inconsistency: "Per-column variance
  test" (Selective Noise) / "Region comparison" (LOESS) / "Pairwise Pearson r
  (all rows)" (IRC) / "Detected constant-offset blocks" / "Outlier rows"
  (Mahalanobis) / "Leading digit frequencies" (Benford plot title) — no two
  follow the same convention. Lean for single-table cards: drop the title;
  column headers carry the semantics. For multi-element cards: use the title
  for the methodology anchor (e.g. "Noise before vs after changepoint" not
  "Region comparison"). S188 surfaced.
- **Replicate-naming register.** R1-R2 (Constant-Offset Blocks) vs Plate1-Plate2
  (IRC matrix) on the same fixture. Lean: column-header names everywhere — the
  generic R1/R2 form is friction. S188 surfaced.
- **VST transparency on per-element displays.** When a test runs on
  transformed values, the per-element chrome should anchor the transformation
  in the reader's view — not bury it in §1 import settings. Constant-Offset
  Blocks is the acute anchor: DS08 auto-VST'd to log, displayed
  "Offset = -0.0459" is in log space (= constant ratio 0.955 on the raw values
  the §2 modal shows), and the chrome never names the transformation. Likely
  only acute case in the battery (other tests run on scale-invariant
  quantities — SD ratios, Pearson r, hashed values); synthesis confirms.
- **Register-clarity thread (joint-fire vs per-element).** When a test's
  firing gate is a joint statistic but its per-element attribution layer is a
  different statistic, the chrome should not conflate them. Two DS08 cards
  surface variants: Selective Noise (joint Bartlett vs per-column adj.p — DS08
  is the locked S162b "fires globally but no column individually flags"
  anchor); Mahalanobis Row Outlier (global outlier-count p = 0.0017 vs per-row
  position p = 1.66e-6 — different scales of test, chrome shows both as "p ="
  without anchoring). S188 surfaced.
- **§2 highlight emphasis by forensic role.** Listed at Axis 1 above (S188);
  cross-listed here as a candidate axis home — synthesis decides whether it
  lives at Axis 1, becomes its own axis, or stays here pending more cases.

- **(S190) §2-line three-idiom routing — POSITIVE, leave alone.** Validated
  across ~9 cards: cell-level tests say "the flagged cells show the pattern
  directly" (Duplicated data, Repeated digits, Missing data — all genuinely
  cell-level); statistical tests say "this pattern is statistical, see the test
  card" (RSC, IRC, Selective Noise — all genuinely not-per-cell); dataset-wide
  scans say "applies across the whole dataset" (TDU, Noise scaling, Column shape
  fit). Three idioms, each correctly assigned by test type. One of the things the
  tool gets right — bank as a positive, don't touch in the redesign.

- **(S190) Subhead describes general capability, not the specific case that
  fired (candidate).** Two-card pattern: DS13 Repeated-digits subhead tuned to
  pass-2 ("digit sequences") mis-describes pass-1 firing (whole-value reuse);
  DS20 Column-GoF subhead advertises both two-sided directions when only mismatch
  fired. Predictor (from DS15/DS06 positives): subheads succeed when the test does
  one plain thing (Missing data "cluster spatially", Noise scaling "spread doesn't
  scale"), fail when two-sided or multi-mechanism. Candidate: subheads should
  reflect the mechanism that actually fired. Possibly folds into a vocab axis.

- **(S190) Engine-internal language on the reader surface (candidate-major).**
  Always-visible captions/summaries leak engine/methodology internals to a
  non-statistician audience. Extreme case: DS19 CCC caption cites "see METHODOLOGY
  §1.9 ¶8" to the end user. Others: Blocked Mahalanobis footer (W=30, stride=10,
  B=4999); Column GoF caption ({Normal, Poisson, NB}, v1.1 roadmap); Repeated-
  digits v1.1 roadmap. The fix shape is consistent — move mechanics to "How this
  test works"; keep only load-bearing honest disclosures in the caption, in plain
  language (e.g. CCC's tier-ceiling sentence stays, its §1.9 ¶8 mechanics go).
  Likely folds into the footer-convention / caption-format axis.

- **(S191) §2 expand affordance on non-localising (global) tests — NEW candidate.**
  Global / no-localisation tests correctly route the §2 line to the dataset-wide idiom
  ("applies across the whole dataset — see the test card"), but the "Data table"
  expand still renders a raw unhighlighted data grid with no forensic content — a
  global test has nothing to localise. The §2 line and the expand contradict each
  other. Confirmed across two global tests in one session (Second-digit frequencies,
  Noise predictability, DS11). This is the **inverse** of the §2-emission bug cluster
  (RSC under-emits, TDU stale markers, Selective Noise plot-vs-table — localising
  tests *mis*-emitting) — keep it distinct so it isn't folded into "emission bug" at
  synthesis. Lean: global/no-localisation tests get the §2 line but suppress the
  expand affordance (nothing to localise → no table). Rides with the §2-emission
  scope decision at S191, flagged as the inverse case. Source question for Code:
  is the expand suppressible per-scope? (DS11)

- **(S190) Two exemplar poles for the synthesis.** **Positive pole — DS06 Noise
  scaling:** plot leads, verdict self-evident, in-plot self-labelling legend,
  named-referent caption. **Anti-exemplar pole — DS19 Cross-condition
  consistency:** verdict buried under a wall of framework meta-explanation,
  §1.9 ¶8 citation, em-dash-padded table. Plus the second positive **DS15
  Missing data patterns** (localised-finding-in-place with p at the locus). The
  synthesis target: move every card toward the DS06 pole; the dominant mechanism
  is getting engine-internal language out of the always-visible caption.

**Homeless themes — placed at S191 synthesis:**
- **Table content-adaptiveness (5-fixture) → PROMOTED to a new axis.** Strongest-supported theme; a design dimension, not a fix. (Cleanest evidence: the Noise-predictability Pooled-by-lag table padding to null rows on DS11.)
- **Engine-internal-language → PROMOTED to a new axis.** Systematic pass needed. DS19 CCC (framework internals dumped on the reader) is the anti-pole; the Second-digit χ²/df demotion is one instance.
- **Affordance discoverability → PROMOTED to a new axis AND the v1.0 usability blocker.** Drives the Tier-2 fix arc. Substrate = the Part-2 affordance inventory (in SESSION191B-CHAT-SUMMARY). Mechanism confirmed: wholesale chrome suppression of LOW/cleared expansion.
- **§2-expand-on-global-tests → folds into the affordance axis, kept distinct** as a sub-theme (reachability when nothing is painted; the inverse of the emission question).
- **Footer conventions, subhead-describes-general → STATUS polish items** (Tier-4 copy), not axes.

## Open source questions (S187 — for the next read-only Code trip)

- Runs Test: is the per-pair `p` column raw or BH-adjusted, and is pooled p Stouffer or Fisher? (Two p-regimes on the card; copy fix depends on the answer.) **Partly resolved S192d:** the HIGH verdict is `flagFromP(pooled.p)` and `primaryP = min(pooled.p, scanP, bestPairP, bestWindowP)`; the footer badge was relabelled "pooled" → "best p" to match (S192 Fix 3). The raw-vs-BH question on the per-pair column proper is still open for the copy pass.
- Row-Mean Runs: what is the faint blue/lavender plotted element absent from the legend?
- (Fold into `S187-READONLY-expansion-affordance-audit.md`'s next run, or a fresh read-only at S188.)

- **(S188 add)** Four further §2-cell-highlight emission questions on
  Selective Noise / Constant-Offset / IRC / Mahalanobis Row Outlier folded
  into the same read-only as Part 4. **Resolved at S191 synthesis** — see the §2-emission cluster resolution block at the head of the homeless-themes section (four-way split, no shared root cause).
- **(S190 add — resolved S191)** Selective Noise plot-vs-table flagged-set:
  which `result.*` field drives the plot's orange/blue colour vs the table's
  Finding column? Resolved as the wrong-field bug (Tier-1 #1, landed S192 Fix 1).
- **(S190 add — rides with the next read-only)** Duplicated data which-pass-drives-HIGH:
  on DS14 (ordinal) is the HIGH driven by block-copy (Q1=Q3 rows 38–50) or the
  near-expected within-row count (611 vs 500, 1.2×)? Transparency/attribution.

---
## Per-card sweep findings

Per-card findings live under the owning category section below; pass-level framing in `### Sweep passes`. Cross-cutting items are lifted to Axis 1 / Axis 2 / Axis 3 / Pending-axis-home rather than repeated here.

### Sweep passes

**DS21 pass (S187).** Five flagged cards + two LOW folds. Cross-cutting items lifted to the axes are noted inline and not repeated here.

**DS08 pass (S188 Part B).** Six flagged cards (incl. one incidental — Mahalanobis Row Outlier). Cross-cutting items lifted to Axis 1 / Axis 3 / Pending-axis-home are noted inline and not repeated here.

**S190 passes (DS04, DS02, DS06, DS20, DS13, DS15, DS16, DS19, DS14).** Eight fixtures. Many cards corroborate the DS21/DS08 records rather than generating new findings — new findings concentrate on cards not previously seen and on cross-fixture confirmations. Cross-cutting items lifted to the axes / pending-axis-home are noted inline. **Two exemplar poles named** (see homeless-themes section): DS06 Noise scaling = positive pole; DS19 Cross-condition consistency = anti-exemplar pole. The dominant new cross-cutting theme is the **evidence-table content-adaptiveness** finding (four fixtures) — folded into the existing Table row-inclusion convention (pending-axis-home).

**Resolved (S190 pass):**
- **Pending-verification — IRC §2 modal-highlight (DS02):** RESOLVED positive. IRC's §2 path iterates over all flagged windows (the windows table carries every per-pair window). Separate code path from Regional Noise; A2-fixed; no under-emission. Contrasts with RSC (below), which under-emits — IRC is the reference implementation for the RSC fix.
- **Part 1 (read-only audit) — LOW/cleared expansion, empirical half (DS01):** confirmed firsthand — cleared cards do not expand past the verdict line (family → "N tests cleared" strip → individual cleared cards showing only micro-label + name + one-liner + Clear verdict; no method/evidence reachable). Q3 (why) answered S191: wholesale chrome suppression — two stacked gates (`ForensicsCategoryBlock` mounts the cleared/LOW stub `expanded={false} onToggle={undefined}`; `TestCardLayout` sets `expandable = hasEvidence && mode !== "qc"` with `hasEvidence = isFl || isNt`). The `MiniCardLayout` inner gating the spec describes is accurate but unreachable. Fix = enable expansion (the outer mount), not surface an existing path.
- **Part 2 (read-only audit) — affordance behaviour, empirical half (DS02):** confirmed firsthand. §2 Data table = triangle toggle. §3 family header = whole-row click + far-right chevron, expands downward, flagged children auto-expand / cleared children stay folded. §3 test card = name+header click, p-pill flashes flag-boundary orange on toggle + far-right chevron. §3 disclosure blocks = triangle toggles. §5 Test battery details = triangle. §4 no expandable controls. **Inconsistency confirmed:** triangle (§2/§3-disclosure/§5) vs chevron+pill-flash (§3 family/card) — same job, different signal, varying click target. Component/file mapping is Code's half.
- **Tier-contrast legibility (Noise predictability + Row-order randomness, DS02 Mod vs DS21 High/MH):** checked informally, no legibility problem — cards read consistently across severities; differ by verdict badge. Retires the "should we do a manual tier-contrast" synthesis sub-question.

**Not inspected (S190 pass — stay on roster):**
- DS06 count-trio N/A dim-check (Value entropy / Column modality / Column shape fit) — Pending-verification, not opened.
- Modals not opened on several cards (DS04 TDU, DS13, DS14) — card-body only.

**S191 pass (DS11 + cleared-state DS17/DS03/07/09).** DS11 cross-fixture confirmations + Second-digit (new card) + the DS11 RSC §2 routing data point; cleared-state pass across the clean half. Cross-cutting items lifted inline.

### Copy, Paste, Edit
#### Duplicated data (Exact Duplicate Detection, DS04 + DS14)
- **Idiom-not-migrated (structural, lead Axis-3 candidate).** First card built;
  never migrated into the post-S126 surface grammar. Has the disclosure trio at
  the bottom (partly migrated) but everything above — two embedded evidence
  tables with own headers, red-bold cell treatment, prose summary line, in-card
  terminology — is an older idiom. Reads visibly different from sibling cards
  (RSC, etc.). The worked example for the idiom-per-scope synthesis call. (DS04)
- **Engine correct.** DS04: 3 row-duplicate groups + 2 within-row pairs (matches
  §1.1 Test 2 / Test 3). DS14 (ordinal, 27 constant rows): block-copy Q1=Q3 rows
  38–50 + within-row pairs, HIGH (matches §1.1). (DS04, DS14)
- **"copied" asserts mechanism (copy candidate).** Subhead "Rows, blocks, or
  column segments copied" — the test establishes *identical*, not *copied*;
  "copied" asserts a mechanism/intent the test can't. Lean: "identical". (DS04)
- **Heading names mechanism not finding.** "Duplicated blocks of data" when the
  DS04 finding is duplicate *rows* (Test 2 fired, not block-copy). Technically-
  accurate-but-misleading per fixture. DS14's "Q1 = Q3 for rows 38–50" heading
  is the *good* form — names the concrete block. Lean: name what fired. (DS04, DS14)
- **Summary line conflates scope + finding.** "50 rows · 3 column pairs · 2
  within-row (0 expected) · p<0.0001" — "50 rows" is dataset size, not a finding.
  Over-description pattern (confirmed cross-card). (DS04)
- **"always pairs?" answered.** Test 3 counts within-row column *coincidences*
  (can be 3+ columns); "pairs" is fixture-specific. DS14 ordinal shows the FP
  edge: 611 within-row pairs vs 500 expected (only 1.2×) on a 5-value Likert
  alphabet — §1.1 known-FP territory. Which-pass-drives-the-HIGH (block-copy vs
  near-expected within-row count) is a transparency question → rides with the next read-only. (DS04, DS14)
- **Within-row colour-grouping works in card body; modal doesn't carry it.** DS04
  + DS14 card bodies colour-separate within-row duplicate groups (red vs amber on
  DS14 rows 3–4 Q3/Q4). The §2 modal renders uniform purple — loses the group
  distinction. Confirms the card-has-it / modal-lacks-it split. (DS04, DS14)
- **Modal ⓐ/ⓑ marker column + card→modal navigation = one problem.** The faint
  glyph column before A marks duplicate-group membership (the card↔modal bridge),
  but reads as "not useful" — the correspondence mechanism exists but doesn't
  signal. Same finding as "hard to navigate card row 4 → modal row 4." Axis 1
  (card↔modal correspondence). (DS04)
- **Dead Pass-column nuance (cross-listed, sharpened by DS13).** N/A here; see
  Repeated digits. The Pass column is load-bearing-but-constant-per-fixture
  (DS04="digit substring", DS13="full value") — supports content-adaptive tables.

#### Duplicated and offset (Constant-Offset Blocks, DS08)
- Subhead "Values shifted by a fixed amount" misses the "between replicate
  pairs / copy-paste" framing. Lean: "Copy-paste between replicate pairs,
  with constant offset" (or "ratio" when offsetType=multiplicative). (DS08)
- Footer "5 blocks detected · 1.4 expected by chance · ..." breaks the
  leading-scope-word convention four other DS08 footers use. Lean:
  "R1-R2 pair scanned · 5 blocks detected · 1.4 expected by chance · ..."
  (DS08; 5th footer-ordering confirmation)
- Table title "Detected constant-offset blocks" + replicate-pair register
  "R1-R2" vs IRC's "Plate1-Plate2" on the same fixture. New cross-cutting:
  replicate-naming register (lean: column-header names). (DS08)
- Per-block table lacks Ratio column on log-VST'd data — displayed offset
  -0.0459 is log-space; raw multiplicative ratio 0.955 is what's visible
  in §2 modal but never named on the card. New cross-cutting: VST
  transparency on per-element displays (Constant-Offset acute anchor). (DS08)
- §2 row-region highlight crosses all three plates when the flagged block
  is R1-R2 pair-scoped. Bug-shaped — routed to read-only audit Part 4. (DS08)
- C1/C2 markers in row-label gutter (block-cluster identifiers) are tiny
  and easily missed — affordance-discoverability sub-finding. (DS08)
- Plate3 column wider than Plate1/Plate2 in §2 modal — auto-sizing bug,
  no content basis. (DS08, cosmetic)
- Card has no figure. METHODOLOGY-MAP S162b predicts LOESS-shape ("block-
  anchored + per-block detail"); table is there, plot is missing half.
  Lean: per-row log-difference plot for flagged pair, block rows highlighted,
  LOESS-idiom parallel. (DS08)
- **§2 over-paint fixed at the parser, not the group path (S192 Fix 2 → S192c).** The all-columns highlight was a pre-existing `parsePairCols` format miss: the parser matched only bare digits and returned `[]` on the producer's R-prefixed `"R1–R2"` label, so every consumer defaulted to all-columns. Widened the regex (`convergence.js:25`) to accept the R prefix; the producer's display label is unchanged. Verified DS08: highlight scopes to the offset pair's two columns, minimap + top strip populate. The `finalizeConvergence` `g.pair` honouring (original Fix 2) is also in place but was not the operative cause. (Resolves the §2-emission "Constant-Offset = misattributed" branch — see the cluster resolution at the head of the homeless-themes section: the queued Tier-1 #2 was `g.pair`, the operative cause was the parser.)

#### Correlated residuals (Residual Spike Correlation, DS02 + DS11)
- **Engine correct.** §1.7 top-K residual-overlap; ρ matrix Control↔Inhibitor_A
  = 0.94 (coordinated-editing signature) vs 0.16/0.21 for biologically-independent
  pairs. K = max(5, floor(35×0.1)) = 5; "5 rows with coordinated noise (0.7
  expected)". (DS02)
- **§2 under-emission (BUG).** Modal highlights 1 row across all replicate
  columns, but the test found K=5 coordinated rows — surfaces 1 of 5. The §2
  highlight should carry all K coordinated rows (those *are* the localised
  finding). IRC's §2 path (which iterates all windows) is the reference
  implementation for the fix. Same §2-emission-scope theme as Regional Noise
  (S188), the Part-4 branches, and Selective Noise plot-vs-table (DS20). (DS02)
- **Evidence ordering (Axis-3 candidate).** Card leads with the "Residual noise
  by condition" heatmap (texture); the ρ matrix (the verdict — 0.94 is the
  clincher) is buried below. Bik standard wants the strongest standalone-readable
  evidence to lead. (DS02)
- **Top-K rows not named (candidate-major).** "5 rows with coordinated noise"
  but the card never says *which 5* — withholds the row identities that are the
  test's actual output. (DS02)
- **Cryptic summary.** "(0.7 expected)" = permutation-null baseline, unglossed;
  "Residual noise by condition" heading cryptic for the audience. (DS02)
- **Copy-vs-plot colour mismatch.** "What to look for" says "Blue shading shows
  where each condition has high residual noise" but the heatmap is rendered red
  ("Low → High residual" red ramp). Body text references blue; plot is red. Axis 1
  vocab/colour. (DS02)
- **DS11 §2 routing — data point for the Part-4 return, NOT a confirmation of the
  under-emission bug (S191).** On DS11 (MODERATE, p = 0.0020, 13 coordinated rows vs
  5.0 expected) the §2 line routes to the **statistical idiom** ("this pattern is
  statistical — it won't be visible in the individual values. See the test card") —
  i.e. RSC emits no per-row §2 highlight here, in contrast to DS02 where it emitted
  1-of-K rows. Two readings, both possible: (i) correct suppression — the cross-
  condition heat-strip plot IS the evidence and individual cells genuinely don't show
  it, so the statistical idiom is right; or (ii) the DS02 under-emission and this
  no-emission are two faces of one emission inconsistency. This is a **routing
  question, not a verdict question** (S127c pattern) — resolved by Code's Part-4
  source trace, not by screenshot. Do NOT mark the under-emission bug confirmed from
  DS11. (DS11)
- **Footer is a positive (DS11).** "3 conditions · 13 rows with coordinated noise
  (5.0 expected) · permutation p = 0.0020" carries Obs-vs-Exp inline in plain
  language with no engine leak — closer to the Row-Mean Runs best-footer anchor than
  to the jargon footers. Note as a footer-convention positive. (DS11)
- **Heat-strip plot = candidate standalone-crop positive (DS11).** The CondA/B/C ×
  row residual heat-strip shows the coordinated bands at matching row positions across
  all three conditions — "same rows noisy in every condition" reads self-evidently.
  Candidate Axis-3 / Axis-1 positive anchor. Same plot-wrapper-width finding applies
  (strip interior narrow in a wide wrapper) → Axis 1 confirm. (DS11)

### Unusual Digits
#### First-digit frequencies (DS08, true detection)

- Footer "195 values tested · χ²=30.830 · df=8 · leading digits off Benford · p < 0.0001"
  reads cryptic; finding-word ("leading digits off Benford") wedged between
  stat fragments. Convention candidate: scope · structural · finding · p. (DS08)
- Plot title "Leading digit frequencies" duplicates card title "First-digit
  frequencies" without adding info. Lean: drop plot title — y-axis label +
  legend swatches carry semantics. (DS08)
- ✓ Title/subhead "First-digit frequencies · Unexpected leading digit pattern"
  — readable. (DS08)
- Plot proportions flat-and-wide; chart occupies ~30-40% of full-browser wrapper
  width with horizontal whitespace. Same root as Selective Noise wrapper finding.
  (DS08; 3rd confirmation of wrapper-width axis)

#### Second-digit frequencies (Benford 2nd Digit, DS11 HIGH)
- **Engine correct.** χ²=57.701, df=9, 6000 values, second digits off Benford,
  p < 0.0001, HIGH. Plot (observed bars vs Benford-expected dashed curve) reads
  self-evidently — the digit-0/2 over-representation and the flat tail show the
  departure without words. (DS11)
- **Footer leaks engine internals (copy).** "6000 values tested · χ²=57.701 · df=9 ·
  second digits off Benford · p < 0.0001" — χ²/df are unactionable for a non-
  statistician; the plain half ("second digits off Benford · p < 0.0001") + the
  plot already carry it. → engine-internal-language theme (candidate-major); demote
  χ²/df to "How this test works". (DS11)
- **§2 expand affordance on a non-localising (global) test (NEW cross-cutting
  candidate — see homeless themes).** The §2 line correctly routes to the dataset-
  wide idiom ("applies across the whole dataset — see the test card"), but expanding
  "Data table" still renders the raw GeneID/Condition/Rep grid with no highlighting
  and no relevance to the finding — a global test has nothing to localise, so the
  table has no forensic content. The §2 line and the expand contradict each other.
  This is the **inverse** of the §2-emission bug cluster (those are localising tests
  *mis*-emitting; this is a non-localising test offering an expand it shouldn't).
  Surfacing instance for the new candidate theme. (DS11)

#### Repeated digits (Value-Frequency Spike, DS04 + DS13)
- **Engine correct; riskiest render path holds.** DS04 = the canonical S114
  Phase 2 worked example — pass-2 fractional-substring spikes .96 (8.0×), .91
  (7.0×), .56 (7.2×) at the documented adj-p. Pass-2 digit-substring join renders
  correctly (the S185 riskiest path). DS13 = clean pass-1 (whole-value spikes 45
  at 3.85×, 34 at 2.07×). (DS04, DS13)
- **Subhead tuned to pass-2 mis-describes pass-1 (copy finding; two-card pattern
  with DS20).** "Some digit sequences appear too often" describes substrings, but
  DS13 fires pass-1 (whole values 45/34 repeated, Pass column = "full value") —
  "the value 45 appears 25 times" is not a "digit sequence." Subhead written for
  the general case mis-describes the specific case that fired. Pairs with DS20
  Column GoF (subhead advertises both two-sided directions when only one fired)
  → candidate axis observation: subheads should reflect the mechanism that
  actually fired, not the test's full capability. Lean: "Some values or digit
  patterns repeat more than expected." (DS13)
- **Missing noun.** "3 over-represented across 21 cells" → "3 over-represented
  [values/substrings]". Confirmed cross-fixture (DS04 + DS13). (DS04, DS13)
- **Pass column load-bearing-but-constant-per-fixture.** DS04 all "digit
  substring", DS13 all "full value" — the column distinguishes pass-1/pass-2
  (real information) but is constant on any single fixture. Sharpens DS04's
  dead-column read: not useless, but content-adaptive tables should drop it when
  it doesn't vary on the fixture. (DS04, DS13)
- **Truncation disclosure works (positive anchor).** "Rows: 4, 14–16, 23, +2
  more" / DS13 "+16 more" discloses what's hidden inline — the *good* example
  against IRC's missing disclosure. (DS04, DS13)
- **Table-vs-cells tension.** Value-centric table (one row per substring) but the
  evidence lives in cells; "Rows" column is a cramped textual pointer into the
  modal. Same card↔modal correspondence gap. Axis 1. (DS04)
- **Two v1.1 future items pinned here** (not blocking): pass-2 baseline re-spec
  (smoothed-neighbour → uniform-alphabet, METHODOLOGY §3.5 known limitation); and
  the §5.1 scattered-single-cell-value-reuse gap (low-priority 4th DupDet pass).
  Neither is the "non-positional sequence search" — that recall maps to these. (DS04)

#### Last-digit frequencies (Terminal Digit Uniformity, DS04)
- **Engine correct; canonical digit-0-excluded case.** χ²=44.52, df=8, 9-digit
  test with digit 0 excluded — the §3.1 step-2 trailing-zero-suppression branch
  (digit 0 <40% expected → drop to digits 1–9). Plot shows the empty digit-0 bar.
  Reads well — the caveat is visible alongside the evidence (Bik standard). (DS04)
- **Least-bad over-description (synthesis input).** Summary line carries χ² and
  df, genuinely not shown elsewhere — strengthens "keep the non-redundant stat,
  drop the restatement" over "delete the line." (DS04)
- **Modal stale-annotation (Axis 1).** On a dataset-wide scan there's nothing to
  coordinate per-cell; the §2 line correctly says so ("applies across the whole
  dataset"). But the modal still renders the ⓐ/ⓑ group markers carried over from
  a prior cell-level selection — the modal annotation layer doesn't reset for
  dataset-wide pills. Distinct from RSC under-emission (a localised test that
  *should* emit but under-emits). (DS04)

### Distribution Shapes
#### Column shape fit (Column GoF, DS20)
- **Engine correct.** The S108 DS20 v2 positive-exercise fixture — cols flag at
  AD ratios 5–18× against Normal, col 8 γ₂-skipped at γ₂≈−0.84, per §3.7 line
  1289. (DS20)
- **Subhead jargon (copy; two-card pattern with DS13).** "Column shape wrong or
  too-tight fit" — the test is genuinely two-sided (p_high shape-mismatch vs
  p_low too-tight RNG-perfect fit), and "too-tight fit" is meaningless to a
  non-statistician without the insight that an RNG-perfect fit is itself
  suspicious. On DS20 only mismatch fired ("2 mismatch, 0 too-tight") yet the
  subhead advertises both. Lean: name only the fired direction; two-sided framing
  → "How this test works." (DS20)
- **Caption too wordy; carries two correct carve-outs in engine-language.** (a)
  γ₂-skip disclosure "Col 8 skipped — near-uniform shape outside the {Normal,
  Poisson, NB} family (v1.1: LogNormal, Gamma)" — the *content* is a positive
  (honest disclosure of why a column wasn't tested; right forensic posture), only
  the *wording* (family-set, roadmap) is the problem. (b) bar-scope split "Bar
  shows a single condition; full per-condition detail in the table below" — the
  S184 accepted limitation, reads as an apology. Lean: keep both disclosures,
  simplify language. (DS20)
- **Table over-reports invariants (sharpest finding; evidence-table theme).**
  Eight columns; three are constant on this fixture (Family all Normal, Direction
  all Shape mismatch, adj.p all ≈0.007) and A²/A²-null-median are redundant with
  A² ratio (ratio = A²/median). The signal a reviewer wants — which columns in
  which conditions are how badly wrong — is the A² ratio, diluted. Different
  failure mode from IRC (which *omits* a column it should have); here the table
  *includes* columns it shouldn't. → Table content-adaptiveness (pending-axis-home). (DS20)

#### Noise scaling (Mean-Variance Relationship, DS06) — **POSITIVE EXEMPLAR**
- **The reference card.** Slope 0.12 (95% CI −0.28–0.52) vs expected slope 1
  (Poisson/count), CI excludes 1, p<0.0001, HIGH. Engine correct (§4.1 / P9). (DS06)
- **Exemplar for three open themes at once:** (1) **plot leads, verdict
  self-evident** — two lines, dots scatter around the flat observed not the
  diagonal expected → "noise is flat when it should rise" reads without words
  (Axis-3 positive pole, inverts RSC's buried-verdict). (2) **in-plot
  self-labelling legend** — "Observed slope 0.12 (95% CI…)" / "Expected slope 1
  (Poisson)" sit *on the lines*; no cryptic separate legend (Axis 1 positive,
  inverts IRC "All data"). (3) **named-referent caption** — "Each dot = one row
  (55 rows). Solid line = observed fit with 95% CI band. Dashed = expected for
  cell counting / viability." Every element named (footer-convention positive
  pole, the "of what" gap closed). (DS06)
- **Null-band-reframe refinement (Axis 1).** The CI−0.28–0.52 vs p<0.0001
  coherence tension *applies in principle but this card largely escapes it*:
  H₀ (slope=1) is an explicit plotted reference line, and its distance from the
  observed band is the visual proof, not "CI excludes zero." Refines the
  reframe: it matters most where H₀ is an implicit marker-against-zero (z-marker
  cards); cards with an explicit plotted reference line at the hypothesised value
  are largely self-solving. (DS06)
- **Least-bad over-description.** Summary line carries slope + expected values
  (non-redundant) — like TDU, strengthens "keep the non-redundant stat." (DS06)

> The DS19 Cross-condition consistency anti-exemplar (the far pole from Noise
> scaling) lives under **Cross-Condition Comparisons** below, with its category.

### Cross-Replicate Comparisons

#### Inter-replicate correlation (DS08 + DS02, cross-fixture confirmation)
- ✓ Title/subhead "Replicates track too closely" readable. Cross-fixture
  confirmation of DS02 readable mark; closes that line. (DS08)
- Footer mixes Pearson r (mean r = 0.9771) and ICC-predicted (0.97) registers
  without anchoring what either contributes. Reader sees two near-identical
  numbers, no anchor. (DS08)
- "Pairwise Pearson r (all rows)" — "all rows" is disambiguating global Pearson
  from windowed sub-unit, but windowed variant isn't visible on this fixture.
  Lean: drop parenthetical; windowed labels itself when it fires ("rows 16-26").
  (DS08)
- "Elevated replicates" legend swatch never renders on the matrix — dead
  chrome on this fixture. (DS08; 2nd confirmation of conditional-legend axis)
- "No localised row ranges detected — elevated correlation is uniform across
  all rows." Two language bugs: correlations are between columns / over rows
  ("across the row range" honest); "elevated" collides with the legend label
  directly above. Lean: "Signal is global — no row sub-window concentrates
  the elevated correlation." (DS08)
- Modal expansion missing per-element evidence: card body shows pair-level
  (r=0.99 + matrix); modal should add a scatter for the flagged pair so
  row-pairing semantics are visible and outlier rows pop. (DS08)
- **§2 path RESOLVED positive (DS02).** Pending-verification item closed: IRC's
  §2 surface iterates over all flagged windows (windows table carries every
  per-pair window, multiple per condition). Separate code path, A2-fixed, no
  under-emission. Reference implementation for the RSC §2 fix. (DS02)
- **Evidence table omits per-window adj-p it's entitled to (firm finding, DS02).**
  IRC windows are independent per-window statistics (per-pair BH-FDR per window,
  §2.5 / METHODOLOGY line 688), so by the evidence-table convention the windows
  table should carry a per-window adj-p column — it doesn't. Also omits truncation
  disclosure (clips mid-row with no "+k more", unlike the digit tables). Different
  failure mode from DS20 (over-reports invariants); here under-reports. → Table
  content-adaptiveness (pending-axis-home). (DS02)
- ✓ Plots strong (DS02): per-condition Pearson matrix + Expected/Elevated colour
  legend read well — Inhibitor_B block all elevated at a glance. (DS02)

#### Distribution of noise across columns (Selective Noise, DS08 + DS20)
- Subhead "Some columns more variable than others" readable; vocabulary
  thread: "variable" (subhead) / "spread" (plot title) / "variance" (table
  title + footer) / "residual" (y-axis) — four words for one quantity on
  ONE card. Most acute single-card instance of the Dim III-B vocabulary
  thread. (DS08)
- Footer "(Plate3 quieter)" reads as "quieter than what?" — answer is
  pooled / median across columns. Chrome doesn't surface the "internal
  joint disagreement" register: test fires because columns disagree among
  themselves, not because columns exceed external baseline. (DS08)
- Plot wrapper full-browser-width; legend outside wrapper. (DS08; 2nd
  confirmation of wrapper-width axis)
- "Flagged column" legend swatch never renders on the DS08 plot — joint
  Bartlett fires (p=0.0006) but no per-column adj.p clears α (closest
  Plate3 at 0.0513). Dead chrome on this fixture. (DS08)
- §2 modal highlights Plate1 + Plate3, de-emphasises Plate2 — disagrees
  with the per-column adj.p register on the card body (Plate1 reads "As
  expected" at adj.p=0.4679). Bug-shaped — routed to read-only audit
  Part 4. (DS08) **Resolved S191 synthesis as the wrong-field bug** — see
  the §2-emission cluster resolution at the head of the homeless-themes
  section, and the S192 Fix 1 note below.
- "Per-column variance test" table title inconsistent with "Residual spread
  by column" plot title. (DS08)
- Long-format multi-condition: test runs per-condition (METHODOLOGY); chrome
  question for synthesis — N per-condition tables or stacked view? (DS08)
- **Plot/summary vs table flagged-set contradiction (BUG, DS20).** Plot colours
  Rep1–4, Rep7, Rep8 orange ("Flagged"); summary agrees ("Rep1…Rep4, Rep7, Rep8
  anomalous"). But the table's Finding column says Rep4 = "As expected" (ratio
  0.83×), Rep5/Rep6 = "As expected". So Rep4 is orange-flagged in plot+summary
  but "As expected" in the table — direct internal contradiction. The table's
  Finding honours the effect-size ratio gate (§1.3, ≥3.0 at N≥500; N=300×8 so
  live); the plot's orange/blue split doesn't. By the methodology the table is
  right and the plot over-flags. This is the concrete instance of parked #6.
  Source question (which `result.*` field drives plot colour vs Finding) rides
  with Part 4. (DS20)
- **Three unreconciled verdict signals (DS20).** Plot colour / Finding label /
  adj-p disagree per column (Rep4: orange / "As expected" / p=0.0004). Significance
  (adj-p) and effect-size (ratio→Finding) and colour are three axes shown without
  reconciliation — reviewer can't tell what "flagged" means. (DS20)
- **No-§2-chip behaviour CORRECT; reframes parked #6 (DS20).** §2 line "this
  pattern is statistical — won't be visible in individual values. See the test
  card." Right call for a per-column variance verdict (no single cell is "wrong").
  This is the col-only no-chip case parked #6 predicted — and it suggests the
  no-chip + statistical-disclosure is the *correct* idiom; DS08's chip-present
  case may be the anomaly to explain, not DS20's absence. Useful inversion for
  whoever closes #6. (DS20)
- ✓ **Plot idiom strong (DS20):** ±1 SD error bars per column with median-spread
  band shaded behind; anomalous bars poke outside (Rep7/Rep8 stretch past, Rep1–3
  too tight inside). n=300 shown. The *idiom* is right; the *colour-assignment
  logic* is the bug. (DS20)
- **§2 field-swap landed and verified (S192 Fix 1).** `extractCellFlags` now reads `perColumnResults[].flagged`, not `colDetails[].residualStd`. No-localisation → no column highlight; the descriptive max/min-SD spread stays in the card body. Verified DS08: lands in "Flagged, location unclear," no column paint. The locked localisation invariant (highlight = localisation claim) now holds for this card. (This is the queued Tier-1 #1 from the §2-emission cluster resolution.)
- **Open — descriptive header vs table (sweep finding, minor).** The card header reads "variance ratio 2.5× (Plate3 quieter)" but the per-column table's worst column is Plate3 at 0.65× (≈1.54× inverted). Header descriptive figure disagrees with the table. Not a highlight bug. Resolve in the per-card content pass (the "content / no redundancy" checklist axis). Also in STATUS Known bugs.
  - **S202 update (stage-2b footer rewrite, `4957428`).** The footer no longer carries the "(Plate3 quieter)" descriptive parenthetical — the budget footer dropped it, and the new single-column footer is direction-aware ("one column quieter than the rest", wired to `outlierDir`), so the footer surface is now correct on DS08. What remains open is **table-side only**: the descriptive field vs the per-column table's worst-column ratio. Axis-1 / content-adaptiveness, not the footer arc.
  - **S209 update (footer-register sweep + Axis-1, `bd68509`/`45910f3`).** The direction-aware "one column quieter than the rest" footer was a truth-of-claim fault: it named a column via a max/min heuristic even on a global-only Bartlett firing where zero columns survive the per-column Levene (the engine localised nothing). Footer collapsed to the global fragment "noise levels differ across columns more than expected" (true across the whole output range, names no column); lookFor guarded to name a column only with a real survivor (`flaggedCols.size > 0`). The table-side descriptive-field mismatch noted above is **still open** — the footer is now claim-true, the table descriptive field is the residual Axis-1 item. Render-verification pending the S210 walk.
- **Two distinct table surfaces, not a redundant heading (S204).** Selective Noise carries two SUB_HEAD surfaces: `:101 "Spread by column"` heads the NoiseSpreadPlot (plot + legend), and `:114` heads a separate EvidenceTable (Column / Observed SD / Expected SD / Ratio / Finding / Adj. p). They are distinct sections, not two headings over one table. The `:114` heading was method-named ("Per-column variance test") and renamed this arc to "Spread compared to expected, per column" (reads the table; distinguishes the expectation-comparison table from the plot). No deletion — the original caption-arc instruction proposed deletion on the assumption of redundancy; pass-1 source verification found the second table and converted it to a rename.
- **Not the unscoped wash tension (de-merged S193).** S192e bundled the col-only-no-chip question (#6) into the add-8 unscoped wash tension. That was a mis-merge: on DS08 Selective Noise is **column-local**, not unscoped, so the wash never applied to it. #6 is a distinct question — whether a column-level test that fires but emits no §2 chip is behaving correctly (the locked localisation invariant says yes: no-localisation → no-chip). It shares the "no localisation → no highlight" principle with the S193 unscoped split but sits at a different tier (column-local vs unscoped). #6 stays parked on its own terms; it is not closed by the S193 fix.

#### Noise consistency (LOESS, DS08)
- Subhead "Noise character changes partway" readable on this card; vocabulary
  thread cross-card (this card consistent internally; problem is across
  Dim III-B cards). (DS08)
- Footer "65 rows · 8 windows scanned · best window: smoother · changepoint
  between rows 32 and 33 · decreases after · scan p = 0.0002" — finding
  word ("decreases after") before p, closest-to-good footer in the sweep.
  Positive anchor for footer-ordering axis. (DS08)
- "Region comparison" table title uninformative — "region" appears nowhere
  else on the card, comparison axis not anchored. Lean: "Noise before vs
  after changepoint". (DS08)
- "Expected noise" column lacks methodology anchor — value is mean-variance
  regression predicted σ. Lean: sub-caption "Region noise vs mean-variance
  predicted σ" (closes table-title item too); column header stays "Expected"
  per Obs/Exp convention. (DS08)

#### Unusual rows (Mahalanobis Row Outlier, DS08, incidental)

- ✓ Cleanest test card across the sweep — synthesis benchmark for "card
  looks resolved" state. Chrome model: top-to-bottom stack without surface
  tension, plot has clear axes/threshold/legend matching visual, table
  minimal. (DS08)
- Subhead "Rows with unusual combinations of values" static across fixtures;
  candidate rewrites: "Rows that don't fit the joint pattern of the data"
  (anchors multivariate concept without "Mahalanobis"). (DS08)
- ✓ Plot title "Mahalanobis distance by row" — works because it names a
  specific quantity the card title can't replace, and "by row" anchors the
  x-axis register. Rule emerging: plot titles work when they name something
  the card title doesn't; redundant when they restate it. (DS08)
- "All data" orphan label above the dots duplicates the legend below. Dead
  chrome. Lean: drop. (DS08)
- Plot y-axis tops out near ~15 but outlier-table reports row 18 at
  Distance=29.62 — point appears missing from plot OR plot/table reading
  different fields. Suspected bug; routed to read-only audit Part 4
  (chat-side pixel-read calibration caveat). (DS08) **Resolved S191 synthesis
  as not-a-field-bug** — plot y and table Distance both bind `dSquared`; the
  apparent mismatch is threshold-vs-dots + strict `v > thresh`. Possible
  display clarification post-v1.0 (see the §2-emission cluster resolution).
- Threshold (dashed line, flag cutoff) vs Expected (used by other cards
  for null-model predicted) — reference-line vocabulary register, new
  cross-cutting candidate. (DS08)
- Table p (1.66e-6, per-row) ≠ headline p (0.0017, global outlier-count):
  different scales of test, chrome conflates as "p =". Register-clarity
  thread — 2nd confirmation (Selective Noise joint-vs-per-column was 1st). (DS08)
- §2 row-18 highlight reads "look at these numbers" but Mahalanobis evidence
  is position-not-value. Refines §2-highlight-idiom axis with second
  orthogonal dimension: emphasis by forensic role (values-as-evidence vs
  position-as-evidence). Possible idioms: dim digits in position cases,
  different fill colour, border-only vs fill. (DS08)

#### Noise predictability (Autocorrelation) · DS21 HIGH
- Subhead "Values follow on too predictably from the one before" — still doesn't convey *serial correlation in the replicate-difference series*. (design/copy)
- Footer referent gap — "positive autocorrelation [of what] · 28 pairs [of what]". Suggested: "28 replicate pairs · positive serial correlation in replicate differences · mean |r| = 0.063 · p < 0.0001". (design/copy) → footer-referent theme (homeless, see §Pending an axis home).
- Legend "All data" → "Mean r across all replicate pairs". (design/copy)
- Pooled table hard to relate to the plot; "pairs sig" (3/28) opaque; no shared anchor between CI marker and table. (design/content)
- "Higher-lag (2–5)… survives pooled BH-FDR…" footnote cryptic. (design/copy)
- Family label "Cross-replicate comparisons" ✓. "High p < 0.0001" badge ✓.
- **Coherence bug:** the 95% CI marker can't be the visual proof of p < 0.0001 — a CI excluding zero shows p < 0.05. Marker and badge are on different scales. (bug) → Axis 1 (tied to the null-band reframe).
- **Lag 2–5 display (design decision, S187):** the test already uses lags 2–5 as a corroboration gate (the cryptic footnote). Display it, don't re-engineer — per-lag null band (low lags poke above, high lags inside) + three-tier emphasis (verdict lag dominant w/ whiskers, corroborating lags mid-weight, context lags de-emphasised) + a plain sentence stated as state ("lags 2–5 show the same positive structure and survive correction… not a single-lag artefact"). Do NOT frame as decay — the diluted windowed signal (0.063…0.030) is too shallow. Band → Axis 1; emphasis + sentence → per-card.
- **DS11 cross-fixture confirmations (S191).** All DS21 findings reproduce at a 2nd
  HIGH fixture. (a) Plot wrapper width / crammed interior — confirms Axis 1 (3rd+
  fixture). (b) CI-vs-p marker mismatch — the "Mean ± 95% CI at lag 1 (verdict)"
  marker + the descriptive sentence ("reliably above zero when the interval excludes
  the dashed reference") reinforce a CI reading, but the badge is p < 0.0001 →
  confirms the null-band reframe (Axis 1). (c) §2 empty data table — same global-test
  expand contradiction as Second-digit frequencies; 2nd confirmation in one session
  → promotes the new §2-expand-on-global-tests candidate.
- **Pooled-table content hollow (DS11 sharpens DS21).** The Pooled autocorrelation
  by lag table pads to a fixed lag-1-to-5 set: lags 3/4/5 show pooled r ≈ 0
  (−0.0002, −0.0092, 0.0021), p > 0.3, 0/6 pairs sig — three of five rows are null
  rows carrying no evidence. Cleanest evidence yet for the table-row-inclusion /
  content-adaptiveness theme (the visible null rows make the padding undeniable).
  "pairs sig" idiom opaque (dash at lag 1, 6/6 at lag 2, 0/6 below — dash-vs-fraction
  switch unexplained). Promotion-gate footnote ("Lag 1 is the primary statistic;
  lags 2–5 are sub-unit evidence (promotion requires pooled adj p < 0.001 plus ≥ 2
  pairs at per-pair adj p < 0.05)") states the corroboration gate in raw threshold
  terms → engine-internal-language theme. (DS11)

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
- **Footer relabel landed (S192 Fix 3).** Badge "pooled" → "best p" (and "within-condition pooled p" → "within-condition best p"), matching that the value is `primaryP = min(pooled.p, scanP, bestPairP, bestWindowP)`. `pooledP` is not exposed on the result, so relabel (not rebind) was the available fix. Verified DS21.
- **Body subhead "Verdict: pooled mean-z across pairs" confirmed honest (S192d).** The HIGH call is driven by `flagFromP(pooled.p)`; the mean-z plot is the effect-size face of that same one-sample-t. Latent edge banked: if a window/pair sub-unit ever drove `primaryP` below `pooled.p`, footer ("best p") and subhead ("pooled mean-z") could describe different values — not triggered by any current fixture.
- **Unscoped §2 render fixed (S193) — the one card witnessed in the unscoped tier.** Runs is the only add-8 card that demonstrably reaches `unscoped` in the 22-set (DS21 HIGH, DS02 MOD). Post-split, selecting the Runs chip leaves the data table at rest (no wash, no dim) with the caption "flagged a pattern distributed across the replicate pairs — no single pair drives it. See the test card." Verified live on DS21. The lane label "Flagged, location unclear" and the caption read coherently together. See the resolved cross-card block in §Pending an axis home.

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
- **DS15 cross-fixture confirmation (S190).** All DS21 findings reproduce.
  Two adds: (a) **"Colmr" axis-label collision reproduces** at a 2nd fixture →
  hardens to reproduces-across-fixtures (still Axis 1). (b) **μ/Σ-pass
  general-subhead decision vindicated:** DS21 fired μ-pass (T²), DS15 fires Σ-pass
  (λ=4.727 adj-p=0.0040; μ-pass clears at T²=4.190 adj-p=0.6372) — same general
  subhead covers both, finding-clause names the pass. Engine correct per §2.6b
  line 633 (Σ-pass Control rows 2–41). Mixed-statistic-column finding strengthened
  — λ and T² both visible simultaneously in adjacent table rows, clearest case
  for the "Mean shift (T²)/Covariance shift (λ)" reframe. (DS15)

#### Regional noise (Regional Noise Homogeneity) · DS21 M/H
- Subhead "Variability changes in patches" — "patches" vague → "noise variability differs in some row regions from the rest of the column". (design/copy)
- Footer "78 windows scanned" — engine internal → footer-convention theme (homeless). Keep "worst: Rep6 rows 82–96, SD ratio 4.37× (quieter than expected)".
- **Obs SD / Exp SD / SD ratio / Finding table = positive anchor** for the Obs/Exp convention (SD ratios not variance ratios, plain "Quieter") ✓.
- **§2 modal coordination = best in the load** (Rep6 column highlighted, row window scrolled in, minimap band) → Axis 1 spatial-minimap positive anchor + Axis 3 standalone-crop anchor.
- **Bug (confirmed by S187 read-only trace):** §2 highlight drops the second flagged window (Rep6 102–116). `convergence.js` Regional-Noise `extractCellFlags` branch reads only scalar `bestWindowRows`/`bestAnomCol`, never loops `result.details[]`. Single-site (8/9 windowed tests loop; downstream compose/aggregator handle N regions). Fix prompt: `S188-REGIONALNOISE-MULTIWINDOW-FIX.md`. (bug, fix known)
- Table shows only the 2 flagged windows (no padding) = the *right* behaviour → table-row-inclusion positive anchor (Blocked Mahalanobis should match THIS).
- **Secondary bug:** footer 4.37× vs table 4.38× = double-rounding on the same SD-ratio value across two render paths (`MiniCard_RegionalNoise.jsx`). Fix = single-source the SD ratio. (bug)
  - **FIXED (S192 Fix 4).** Footer and table now read one raw producer value (`bestSDRatio`/`sdRatio = sqrt(...)`), formatted identically. Verified DS21: both read 4.37×. Note banked: `keyFindingTemplates.js:396` (Review-mode finding string) surfaces `sdRatio` from a separate variable — third surface, same double-rounding class, out of S192 scope.
- **§2 multi-window highlight drop FIXED (S188 `8dd2105`).** The earlier bug — §2 dropped the second flagged window (Rep6 102–116) because the Regional-Noise `extractCellFlags` branch read only scalar `bestWindowRows`/`bestAnomCol` — is resolved; the branch now loops `result.details[]` like the other 8/9 windowed tests.
- Cleared-tests strip renders cleanly, truncates, expandable ✓ (preview of the S189 cleared-state pass).

#### Missing data patterns (Missing Data Pattern, DS15) — **POSITIVE EXEMPLAR**
- **Second positive exemplar (after Noise scaling).** Engine correct (§2.6b
  cross-ref / _scanBlocks Bonferroni-MCAR; the canonical row-grouped missing-
  Carlisle fixture). 74 missing cells (7.7%), 1 significant block, p<0.0001, HIGH. (DS15)
- ✓ **Spatial-finding-called-out-in-place (spatial-minimap positive anchor,
  Axis 1).** The Spatial distribution plot marks every missing cell by row×rep;
  the one red-outlined "Significant block" (rows ~118–128, Rep3) is the finding,
  **labelled with p<0.0001 right at the locus.** Reviewer sees scattered-benign
  vs one-dense-block-flagged without reading a word. This is the *good* version
  of exactly what RSC under-emits and Row-Mean Runs does badly. Different
  positive from Noise scaling: that = plot-leads + in-plot-legend + named-caption;
  this = localised-finding-in-place-with-p-at-locus. (DS15)
- ✓ Per-column missing-rate bar clean (Rep3 spikes to 10%, supports the block). (DS15)
- ✓ Good subhead "Missing values cluster spatially" — plain, accurate, describes
  what fired (the subhead-good-when-test-does-one-plain-thing case). (DS15)
- ✓ §2 line correct — cell-level idiom right here (missing cells are real
  locations). (DS15)
- Summary "74 missing cells (7.7%) · 4 pairwise · 6 condition-dependent · 1 block"
  — "4 pairwise"/"6 condition-dependent" are unglossed missingness-mechanism
  sub-counts. Cryptic-dense variant of over-description. (DS15)

#### LOW folds (S187) — Windowed autocorrelation, Cross-condition consistency P5
- **LOW/cleared cards don't expand.** Product decision (S187): they SHOULD expand to method + evidence (How-this-works + the plot/table showing *why* it's clear), withholding finding-specific blocks (Implications / What-to-look-for). Source-check pending (`S187-READONLY-expansion-affordance-audit.md` Part 1). → carry to S189 cleared-state pass + affordance theme (homeless).
- **Cleared-state pass (S191, DS17 + DS03/07/09 confirm).** Re-confirms the Part-1
  empirical half cross-fixture (DS01 + DS17, expansion behaviour identical on
  DS03/07/09 per Nick's pass). (a) **Cleared rendering correct** — green "All checks
  passed" summary, neutral severity dots, §2 "no patterns to flag", §4 "no further
  investigation", no false signal. Positive. (b) **CLEAR-strip cards ARE reachable** —
  expanding the "N tests cleared" family strip opens the individual cleared cards
  beneath (dimmed family label / bold name / plain subhead / Clear verdict). This
  **does not reproduce the BANKED Hover/alignment "CLEAR-strip expandability"
  worry** → that BANKED entry should be retired or fixture-qualified. (c) **Cleared
  cards expand to the verdict line only** — no "How this test works", no plot, no
  why-it's-clear evidence; the reviewer must trust the green tick. Confirms the
  S187 product decision is unmet across the clean half of the battery, and feeds the
  affordance-discoverability v1.0 blocker (the evidence layer is unreachable exactly
  where a reviewer most needs to verify cleanliness rather than trust it). Source
  half answered S191: wholesale chrome suppression (the two stacked gates above), not empty-content. The fix is the outer mount.
  The compact cleared-card layout itself reads cleanly — the defect is purely that
  expansion stops at the verdict. (DS17, DS03/07/09)
- WAC `startRow`/`endRow` row-remap caveat (Axis 2 pre-existing item) — not advanced; the fold couldn't be opened to inspect.

### Cross-Condition Comparisons
#### Cross-condition consistency (CCC framework, DS19) — **ANTI-EXEMPLAR**
- **The anti-exemplar pole** (far pole from DS06 Noise scaling). Engine correct
  (CDF-shape KS too-similar fires, §1.9, MODERATE). But the always-visible caption
  is a ~120-word, 6-line paragraph dumping framework internals on the reader:
  amber-criterion logic, Stage-1-only-"too-similar" actionability,
  informational/muted rows, "Null median" definition, direction semantics, AND a
  literal methodology citation **"see METHODOLOGY §1.9 ¶8"** — citing the
  methodology document's paragraph number to an end user. Clearest single instance
  of engine-internal language on the reader surface (theme: Blocked Mahalanobis
  W=30/B=4999, Column GoF family-set, Repeated-digits v1.1 roadmap). Candidate-major. (DS19)
- **Tier-ceiling sentence is load-bearing — surface it, bury the mechanics.**
  "HIGH is unreachable at B=999 — MODERATE is the strongest tier this test can
  report" is *important honest information* (without it MODERATE misreads as "not
  that bad"). Fix isn't "delete the caption" — it's "surface the tier-ceiling
  sentence plainly, move §1.9 ¶8 mechanics to How-this-test-works." (DS19)
- **Em-dash padding rows (table content-adaptiveness).** 4 of 7 properties show
  "— / —" (Residual SD, lag-1 AC, kurtosis, mean-variance slope didn't run on
  this fixture). Same content-adaptive-table finding as DS20/IRC — drop rows that
  didn't run, or footnote them. → Table content-adaptiveness (pending-axis-home). (DS19)

#### Condition balance (Baseline Balance, DS16)
- **Engine correct.** The column-grouped Carlisle positive anchor (§2.6b line
  633): 48/60 features with p>0.95 (expected 3), KS D=0.7512, p<0.0001, HIGH. (DS16)
- ✓ **Plot good.** p-value histogram with spike at p≈1.0 against the dashed
  uniform-expected line — "groups match too precisely" (Carlisle too-good signature)
  reads self-evidently. Per-feature table shows the three condition means side by
  side (Row 1: 181.6/205.5/183.4) so over-closeness is visible. (DS16)
- **Caption earned-but-long (copy candidate — tighten not cut).** Four sentences,
  but most is *legitimately* explanatory — the p-value-histogram idiom genuinely
  needs the gloss (not intuitive that "p piled near 1.0 = suspicious"). Different
  fix from the redundant over-description: tighten, don't remove. (DS16)
- ✓ **Truncation disclosed** ("Showing 20 of 60") — disclosure-works positive
  anchor (with the digit tables; against IRC's missing disclosure). (DS16)

---

## S206 visual-pass findings (DS08 + DS06, live `813bc65`)

First live eyeball of the promoted copy arcs (caption arc + card-text arc). Five
findings; none touch the S204 two-table rename (that **verified clean** — `:101
"Spread by column"` heads the plot, `:114 "Spread compared to expected, per
column"` heads the EvidenceTable, two distinct sections, footer direction-aware).
Two are per-card display issues; three are cross-card consistency drift the copy
arcs never reconciled as a set.

**Scope note (the real gap this pass exposed).** The S199 information-budget
sweep locked the three-axis framework across **titles / sub-headers /
How-this-works**. It did **not** run a cross-card discipline pass on **footers and
legends** — those were authored per-card during S200–S205, each correct in
isolation, never reconciled against each other. Findings #3–#5 below are that
unreconciled drift. **The footer-register + legend-vocabulary + label-casing
cross-card consistency arc is NOT STARTED** (Chat-owned copy arc; lock the rule,
sweep all cards). Banked as the named next copy arc. A full 56-card verification
walk should wait until this arc lands — walking now verifies a surface with one
whole consistency dimension still unedited. (Coverage caveat: this pass only saw
the cross-replicate + cross-condition clusters; distribution-shape and
unusual-digit footers/legends are unexamined and may add drift — lock the rules
against more than this sample.)

### #1 — Outlier row mis-coloured Normal (Unusual rows / Mahalanobis Row Outlier, DS08) — RESOLVED S207 (promoted `87c8a75`)

**Original finding (S206):** the footer read "1 row has an unusual combination of
values" and the Outlier-rows table named Row 18, Distance 29.62, p=1.66e-6, but the
flagged point rendered **blue (Normal)** on the Distance-by-row plot — the flagged
outlier mis-coloured as Normal, the red Outlier legend state never painting.

**Root cause (confirmed at source, S207-RO-MAHALANOBIS Question A):** dot colour and
table selection re-derived from a strict `v > thresh` re-test. The dashed line is
drawn at `outlierThreshold = min flagged distance` (`mahalanobis.js:195`) — which on
a single-outlier fixture **is the flagged row's own distance**, so that row can
never satisfy strict `v > thresh` (the boundary row can't exceed its own value),
compounded by full-precision `v` vs `toFixed(2)` threshold. The fix binds colour +
selection to outlier-set membership (`isOutlierAt(i)` over `s.outlierRows`).

**Fix shipped S207 (`87c8a75`):** colour-from-membership (`7a64768`) + the render fix
that resolved the axis-break regression it introduced (see #8) + the threshold-line
relabel. Verified live on DS06 (R12, HIGH) and DS08 (R18, MODERATE) — flagged outlier
paints red, red legend appears, axis continuous. Off the roster.

### #7 — Headline p vs table per-row p read as contradictory (Unusual rows / Mahalanobis) — RESOLVED S207 (two statistics by construction)

On the Mahalanobis Row Outlier card the badge p and the Outlier-rows table per-row p
look like the same quantity reported twice with conflicting values (DS06: badge
**High p = 0.0004**, table Row 12 **9.11e-7**; DS08: badge **Moderate p = 0.0017**,
table Row 18 **1.66e-6**).

**Confirmed at source (S207-RO-MAHALANOBIS Question B): two different statistics by
construction.** The headline is `primaryP = binomP` — a dataset-level binomial
(normal-approx) on the count of rows exceeding raw per-row p < 0.01. The card is
FISHER_EXEMPT (`aggregation.js:131`), so the headline is that primaryP itself, **not**
a Fisher-combination of per-row ps. The table per-row P-value is the **raw** per-row
χ²(nC) tail p for that row (`rowPvals[i]`). Not contradictory: a whole-dataset rate
test vs one row's individual distance probability.

**Latent side-finding (open, → consistency arc):** the table *displays* the raw
per-row p but *selects* rows into the table on `adjRowPvals` (BH-FDR adjusted, α=0.001)
— a third quantity shown nowhere. So a reader sees a raw p that is not the gate that
decided membership. Same global-verdict-vs-per-row-statistic legibility family as #2;
feeds the cross-card legibility display rule, not a one-card patch.

### #8 — Mahalanobis plot x-axis break regression — RESOLVED S207 (promoted `87c8a75`)

The S206/S207 colour fix (membership rebind) introduced an x-axis **break**: the
membership predicate also drove `splitIdx` → `hasOutliers`, which triggered an
axis-break glyph flinging the lone outlier past the break even though it sat only
~2× the next point — manufacturing separation the data did not have.

**Confirmed at source (S207-RO-MAHALANOBIS Question A): introduced, not relocated.**
Pre-edit, strict `v > thresh` returned `-1` on single-outlier fixtures (outlier on
the threshold) → `hasOutliers` false → no break. Membership caught the row →
`hasOutliers` true → break appeared. Colour, split, and row labels were all coupled
to the one `isOutlierAt` predicate — none separable at the predicate level.

**Fix shipped S207 (`87c8a75`):** the break-rendering path was removed unconditionally
(`splitIdx`/`hasOutliers` segmentation, break glyph, dual-segment gridlines/baseline/
threshold all gone); `xscale` is now continuous (sorted-rank) for all indices
regardless of outlier count, so the flagged outlier renders inline. Colour + selection
remain bound to membership. Verified live on DS06 + DS08 (continuous axis, outlier
inline on the line). Off the roster.

### #9 — Mahalanobis threshold line is a data-dependent BH-FDR cutoff, not a fixed critical value — RESOLVED S207 (relabel) + RATIONALE FOR THE SPEC

**Surfaced from the #1/#8 investigation.** The dashed line is drawn at the minimum
flagged distance (`outlierThreshold`, `mahalanobis.js:195`) — i.e. the lowest distance
that survived BH-FDR (α=0.001) correction **for that dataset**. It is NOT a χ² critical
value and there is no fixed χ² distance that reproduces the BH decision (BH
significance is rank-dependent across the tested rows, so the effective per-row cutoff
slides with rank — α/N for the most extreme row, 2α/N for the next, etc.). The
min-flagged distance is the *empirical realisation* of that sliding cutoff. It is a
**faithful separator** — adj-p is monotone in D², so no unflagged row can sit above it.

Two consequences that were misreading as bugs but are correct:
- On a single-outlier fixture the line lands exactly ON the flagged dot, because that
  lone survivor's distance *is* the line. "Kissing the line" is correct, not marginal.
- Rows that are raw-p < 0.01 but fail the 0.001 adjusted gate (DS08 R2 @ 14.65, R21 @
  12.18 — "0.01-positive, 0.001-negative") sit visibly separated below the line. They
  look like outliers to the eye but are correctly unflagged after multiple-comparison
  correction.

**Fix shipped S207 (`87c8a75`):** legend token relabelled "Threshold" →
**"Significance threshold"** (`MiniCard_Mahalanobis.jsx:55`; no separate line label
exists — the legend token is the sole label). Resolves the S188 finding-#6 vocabulary
problem (a line named "Threshold" implying a fixed critical value when it is a corrected
cutoff). **The line value is correct and unchanged** — only the label and the (#8) break
changed. This rationale belongs in INVESTIGATION-DISPLAY-SPEC so a future reader doesn't
reopen "why is the line the min-flagged distance" — it is the corrected cutoff made
concrete.

### #10 — Multi-flagged Mahalanobis continuous-axis state — VERIFIED BY CONSTRUCTION ONLY (→ #49 positive anchors)

No fixture in the 22-set flags Mahalanobis Row Outlier with 2+ outlier rows on one
chart. Only DS06 (HIGH, 1 row) and DS08 (MODERATE, 1 row) flag — both single-outlier,
pooled. DS09 carries 2 sub-outlier rows but at LOW verdict (not flagged) and split
one-per-condition (Vehicle R31, Treatment R302), so even its per-condition charts draw
one dot each. The S207 break-suppression removed the break path unconditionally and
`xscale` is continuous for all indices, so a 2+-outlier chart would render inline by the
same path DS06/DS08 now exercise — but the multi-dot continuous-axis state **cannot be
eyeballed in the 22-set**. Verify against #49 positive anchors when they land.

### #11 — "All data" orphan label still present on the Mahalanobis plot (S188 finding #4, still open) — DEAD CHROME

The Distance-by-row plot carries an "All data" series label as a chart annotation
above the dots, duplicating the legend below (Normal · Outlier · Significance
threshold). Identified S188 as dead/duplicate chrome (likely a plot-library series-name
default or a leftover from a per-condition variant); lean to drop it. Still present on
the live render after the S207 fixes (visible top-left of the plot interior on DS06 +
DS08). Not touched by the S207 render fix (out of scope — that was colour/break/label).
Per-card cleanup; carry forward.

### #2 — HIGH verdict with no significant per-column row (Column-to-column noise / Selective Noise, DS08) — LEGIBILITY

Card fires **High p=0.0006**, but the per-column table shows no individually
significant column: Plate3 Adj. p = **0.0513** ("Quieter", just over 0.05),
Plate1/Plate2 "As expected" (0.47 / 0.32). A reader sees HIGH up top and three
non-significant rows below and reasonably asks "high based on what?" Mechanically
**correct** — this is a global/scan test, the High p is the dataset-level
across-column SD-spread statistic, per-column ps are descriptive context per the
documented evidence-display rule (global tests → p in badge only). The footer
"one column quieter than the rest" is *accurate*. But the **surface doesn't make
the global-vs-per-column relationship legible** — the verdict and the context
rows read as contradicting each other. Display/legibility finding, **not** an
engine change. My lean: the rule is right; the card should telegraph that the
verdict is global and the rows are context.

> **#3 / #4 / #5 — RESOLVED by the S209 footer-register arc.** The footer-register
> rule (#3), the "Median spread"→"Expected" legend vocabulary (#4), and the
> adjusted-p casing (#5) were locked S208 and swept S209. Moved to "Resolved
> cross-card blocks" below. (#2 and #6 remain open — neither is copy-register.)

### #6 — VFS EvidenceTable "Adj P" column truncated (Over-used numbers, DS04) — LAYOUT

On Over-used numbers the per-value Over-represented-values table overflows its
width — the rightmost **Adj P** column values are clipped ("0.001…", "0.004…",
"0.007…" all cut at the right edge). Layout finding (table-width / PlotLayout
bounds), **not** copy. Separate fix from the #5 casing sweep. The header casing
("Adj P") folds into #5; the truncation is its own layout issue.

---

## Resolved cross-card blocks

### Footer-register + legend/casing consistency — #3/#4/#5 + two truth-of-claim faults (RESOLVED S208–S209)

**Originally posed (S206):** footers mixed registers across cards (#3 — terse
lowercase fragments vs count-led near-sentences); the Column-to-column noise legend
labelled its baseline "Median spread" where IRC used "Expected" (#4); the adjusted-p
column header appeared in three casings — "Adj. p" / "adj-p" / "Adj P" (#5).

**Rule locked (S208).** Footer-register split rule re-derived via six-model cross-lock:
the discriminator is the finding's *cognitive object* — subset-of-units-to-inspect
(count-led) vs property/pattern (property-fragment), with a deletion test and an
affordance-decides rule for the ambiguity class. Plus rule 8 — register must hold
across the test's whole output range; count-led requires the count be *always
available*. Full rule in `docs/shared/FOOTER-REGISTER-SPEC.md` (committed `4018c33`,
amended `710a4a3`).

**Swept + applied (S209), promoted `bd68509` → merge `42fe3ff`.** All 28 footer-
composition sites enumerated at runtime source (not authored copy), classified, and
13 corrections applied: #22 Column-to-column noise footer collapsed to one global
fragment ("noise levels differ across columns more than expected"); #23 Region-noise
and #28 Overall condition similarity direction-derived from existing fields; #25
Within-row noise direction-neutral; #18 LOESS no-changepoint branch; #4 "Median
spread"→"Expected" legend; #5 two "Adj. p" casing fixes. Gated outcomes settled at
source: #27 Carlisle single-direction (no change); #26 RankCorrelation cleared branch
added.

**Two truth-of-claim faults the sweep surfaced — RESOLVED S209, promoted `45910f3` →
merge `9ebea42`.** (1) Column-to-column noise footer/lookFor named a column via a
max/min heuristic on a global-only Bartlett firing the engine never localised — footer
collapsed to the global fragment, lookFor guarded to `flaggedCols.size > 0`. (2)
Missing-data footer keyed on `blockHits` not flag tier, so a non-block flagged firing
read the cleared "scattered across the data" string — now flag-keyed, a non-block
flagged firing reads "missing values follow a non-random pattern" (deliberately general:
the flag is a combined BH over three sub-signals while the hit arrays use separate
per-signal BH, so no column/condition locus is always backable in that state).

**Render-verification PENDING.** All fixes are code-promoted and batch-verified (23/23
byte-identical, no severity moved) but NOT yet eyeballed on live UI — that is the S210
56-card visual walk (caption/footer pass). If the walk finds a surface still wrong,
re-open here. The classification rationale lives in `FOOTER-REGISTER-SPEC.md`; the
caption-surface catalogue is `docs/shared/CAPTION-SURFACE-AUDIT.md`.

**Still open (NOT resolved by this arc):** #2 (global-verdict-vs-per-column legibility
on Column-to-column noise — a display finding, not copy) and #6 (VFS Adj-P column
truncation — layout). Both remain in the open numbered findings above.

### add-8 unscoped findings — modal-table wash (RESOLVED S193)

**Originally posed (S192e):** add-8 "unscoped-but-numbered" findings (flag-less chip, `region.cells: []`, full `rows`, `locality "unscoped"`, built by the fallback site `findings.js:298`) produced contradictory §2 signals — the modal data table washed every cell (keyed on `compose.hasWholeTable`, set for `locality === "unscoped"|"dataset-wide"`) while the minimap rendered empty (gates on `region.cells.length`). The wash was specified for *genuinely dataset-wide* findings; the add-8 work populated the same tier with a second, semantically opposite population (unscoped because no cell localisation, not because the whole dataset is implicated). For that population the whole-table wash read as over-highlighting against an empty minimap.

**Decision (S193): split the tier.** `dataset-wide` and `unscoped` are distinct. `dataset-wide` washes (a true "applies everywhere" claim, sets `hasWholeTable`). `unscoped` produces **no table treatment** — no wash, no dim — and sets a separate `hasUnscoped` flag; the caption carries the message ("flagged the data but couldn't isolate specific rows — see the test card"). The invariant decides it: highlight = localisation claim, and an unscoped finding makes no localisation claim. The minimap was already correct (empty); the fix made the table agree with it.

**Fix landed (S193), two sites + doc:**
- `buildHighlightSpec.js:192` — split `case "unscoped"` off the `case "dataset-wide"` wash fall-through into the new `hasUnscoped` flag (added to `EMPTY_COMPOSE`, the local, and the return).
- `ExcerptTable.jsx` `composeDim` (:1454) + `isDimmedFinal` mirror (:1471) — added `&& !compose?.hasUnscoped` so an unscoped-active selection renders neither wash nor dim (without this, dropping the wash would have flipped `composeDim` true and greyed the table — a different false claim).

Verified live on DS21 (Runs chip → table at rest, no wash, no dim, caption fires). Batch 23/23, no EXPECTED change. Regression guard: `test/diag-s193-add8-locality.mjs`. Promoted S194 (merge `886e354`).

**Premise correction.** S192e said this affected all four add-8 cards equally (Selective Noise, IRC, Mahalanobis Row Outlier, Runs). It does not: only **Runs** classifies `unscoped` on its fixtures (DS21 HIGH, DS02 MOD — the `POOLED_BY_DESIGN` case). The other three localise on their cited fixtures — Selective Noise column-local (DS08), IRC column-local (DS08), Mahalanobis row-local (DS08) — so the wash never applied to them. The fix is **tier-wide** (keys on `locality === "unscoped"`, card-agnostic), so they are *covered* if a future fixture puts them in the unscoped tier, but only Runs was *witnessed* in the changed state.

**Residual:** #42 (the original S129 per-window evidence emission — emit the actual flagged region instead of the synthetic full-dataset rowRange) is the un-resolved part, narrowed; the modal/minimap wash facet is closed. #6 (Selective Noise column-local-no-chip) was de-merged from this tension — see its per-card note above. The **selected-unscoped chip legibility** question (does a silent table on a selected chip read as intended?) was decided S193 not to special-case — folded into the Tier-2 reachability selected-state affordance pass (STATUS v1.0 blockers; BANKED chip/chrome).

---

## Trivial cleanups (non-blocking)

**CCC card header-comment `ALPHA` reference (S204).** `MiniCard_CrossCondConsistency.jsx` header comments (lines 11/16/17/84) describe the amber-at-Moderate / can't-reach-High semantics and name `ALPHA`. The `ALPHA` import was removed S204 pass 3 (the CCC legend was its only code use; the tier-ceiling content moved to How-this-works). The comments remain factually accurate and are non-code, so they were left in place — but a comment naming an import that no longer exists is a future-reader trap. Rename/strip when the card is next touched. Not worth a dedicated edit. **(S209 note: the card WAS touched this session — footer direction branch + "Adj. p" casing — but the comment was out of scope of the string-only sweep, so "strip when next touched" did NOT fire. Still pending; the next CCC-touching edit that isn't string-locked should clear it.)**

---

## Forest per-unit programme — banked follow-ups (S284–S285)

Two findings banked during the A1 per-unit display programme (the shared `ForestPlot` primitive,
Stage 2). Neither is a build blocker; both are recorded here so they are not lost.

**Decay-chart "Lag (rows apart)" x-title bottom-clip (S284, verify-and-close).** The
Autocorrelation decay chart's x-axis title appeared clipped at the bottom during the S284
ForestPlot hardening arc. It looked resolved in the DS11 close screenshot (the title rendered
fully visible), but that may have been the crop rather than a fix. This is a verify-and-close,
not a build: confirm on main that the x-title is fully visible rather than just off-screen at
that crop. If clipped, it is a small PlotLayout bottom-margin fix; if clear, close the item.

**#40 — Autocorrelation forest y-axis heterogeneity (S284, design, v1.x).** The Autocorrelation
forest stacks two unit kinds on one y-axis: lag-1 per-pair rows (labelled "1–2 … 3–4") and
pooled per-lag rows (labelled "Lag 2 … Lag 5"). No single y-axis label is true for both, so the
forest has none — and a reader cannot tell what "1–2" versus "Lag 2" mean without external
context. The fix is a group-header convention within the forest (e.g. "Lag-1, per replicate
pair" / "Lags 2–5, pooled"), a new `ForestPlot` capability IRC does not need (its rows are
homogeneous). This is a design pass, not a label add. Cross-reference the S187 three-tier
emphasis note at TESTCARD-FINDINGS:894 (verdict-lag dominant / corroborating-lags mid-weight /
context-lags de-emphasised) — the group-header convention and the emphasis tiers are the same
surface's two open design questions. v1.x; banked.

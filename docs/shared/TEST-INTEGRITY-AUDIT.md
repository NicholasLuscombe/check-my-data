# Test-Integrity Audit — Check My Data

Pre-launch v1.0 gate. Lead launch blocker, ahead of the Phase A display remainder.

## Premise

Batch parity historically asserted **total severity only**. A test could therefore
flag for the wrong reason, or false-positive on a reachable input shape, while the
gate stayed green — the contaminated channel hidden inside a correct total, or the
false positive on a shape the harness never ran. This audit hardens the instrument
first, then audits through it. Three phases.

---

## Phase 0 — harden the gate (instrument-first). DONE (S177).

Per-test flag assertions (allow-set primitive, positives-only) plus a cross-shape
pooled-column pass landed in `test/validate-batch.mjs`. The instrument now catches a
contaminated channel inside a correct total, and a false positive on the pooled
shape. It caught and retracted one over-claimed cell (DS15 Baseline Balance) on its
first run.

**Phase 0 landed (S177) — implementation carve-outs from the spec lock.**
(1) Per-test assertion is **positives-only**: clean data is already covered by total
severity (severity is computed from flags), so per-test cells exist only on
fabricated fixtures' documented positive channels.
(2) Assertion primitive is an **allow-set** (`expected.flags[r.name].includes(r.flag)`),
not strict equality — positives default `["MODERATE","HIGH"]`, strict `["HIGH"]` only
for p≈0 channels, FISHER_EXEMPT members always widened. Values are
ground-truth-derived (no snapshot).
(3) The cross-shape pass is the **pooled-column** construction (all DATA values → one
column), not pivot round-trip — pivot tests the transform, pooling tests the
contamination. Rides the `expected.pending` lane.
**Adjudication discipline:** only GT-*tiered* positives get declared. Prose-inferred
cells are out — the DS15 Baseline Balance cell (declared from "DS15 is a Carlisle
fixture") was retracted when the harness caught it firing LOW; GT line 29 credits
Missing Data + Mahalanobis + Kurtosis, not Carlisle. Live cells are in
`test/validate-batch.mjs` `expected.flags` (Code-owned source of truth — this doc
records rationale, not the cell table, to avoid drift).

---

## Phase 1 — contamination-class sweep. DONE (S178).

**The predicate.** A test is at-risk if it computes moments / distributions /
covariance / scale on raw values pooled across conditions without first removing
condition structure, or assumes row-order on row-grouped data. Canonical witness: the
dispatch ignores `condCtx` / `condCtx.rowGroups()` and computes its statistic on the
full matrix. The S127 Mahalanobis repair (`aggregatePerGroup` per-condition routing)
is the precedent fix shape.

**Method.** Read-only classification of all 28 active tests in `runFullAnalysis`'s
`tests` array against the predicate, at source on `c4d11af`. Each test classified
condition-aware / safe-by-construction / at-risk by dispatch shape. Full
classification table in the S178 session record; conclusion below.

**Result — the at-risk set splits into two distinct axes, plus an ambiguous pair.**

- **Row-grouped pooled-column axis → A1 (item 29).** Column Goodness-of-Fit
  (`engine.js:424`), Entropy / Zipf Analysis (`engine.js:423`), Modality Test
  (`engine.js:425`) — three bare full-matrix calls in one call-site cluster, no
  `condCtx`. Each fits one distribution/moment to a condition mixture when a column
  pools conditions. **GoF demonstrated** (DS01 pooled → MODERATE, S177); Entropy and
  Modality **latent** (dispatch-identical, stayed clean on the S177 DS01 construction).
  All three in A1's per-condition-routing scope on dispatch-correctness grounds. The
  wired DS01 `pending` assertion is A1's acceptance test.

- **Column-grouped per-row axis → probe-gated.** Noise Scaling With Measurement Size
  (`engine.js:421`), Within-Row Variance (`engine.js:447`) — per-row mean/SD pools
  condition replicates across columns on column-grouped multi-condition data. A
  *different* contamination shape from the pooled-column axis. **Latent only, no
  demonstrated artifact:** both run on every column-grouped multi-condition fixture in
  the batch today (e.g. DS01 is reps × conditions) and those are severity-0 green.
  Noise Scaling also carries the VST-detection circularity, so it would not be cleanly
  S127-shaped.

- **Ambiguous → probe-gated.** LOESS Residual Analysis (`engine.js:456`), Regional
  Noise Homogeneity (`engine.js:466`) — row-grouped + ordered + multi-condition is a
  real input shape (DS15-shape) where a condition-mean shift between row blocks could
  read as a noise-level changepoint / regional heterogeneity. `rsSkip`-gated only
  under `rowSemantics='arbitrary'`; not in the S118 self-gated (row-shuffle
  permutation null) set. Latent, no demonstrated artifact.

**Decision.** **A1 = the trio only.** The column-grouped pair and the ambiguous pair
hold behind a demonstration probe — no fix without a concrete fixture showing the
artifact (false positive on clean, or false negative masking on fabricated). This is
the S123 Edit D discipline: a latent dispatch concern with no demonstrated failure is
exactly how the last unwound regression got in. The four held tests are a parked item,
gated on the probe.

**The 21 predicate-clean by construction.** Digit- and value-frequency-channel tests
are scale-invariant to condition shifts; the condition-aware tests thread `condCtx`
(per-slice statistics or post-residualisation) or `childCtx` through
`runPairVST(..., condCtx)`; the S118 self-gated tests absorb arbitrary-order pooling
via row-shuffle permutation nulls; Exact Duplicate Detection operates on cell
equality, where pooling cannot fabricate identity.

---

## A1 — distribution-shape trio per-condition routing. DONE (S179).

Phase 1 scoped A1 to the trio only (Column Goodness-of-Fit, Entropy / Zipf, Modality).
S179 landed the per-condition routing: each dispatches via
`aggregatePerGroup(condCtx.rowGroups())` with a pooled fallback when no condition layer
is present. DS19's trio-flag count corrected 3 → 1 — the pre-A1 pooled flagging was
reading mixture structure across conditions, not within-condition fabrication.

Two coverage facts surfaced and are accepted, not regressions:

- **Per-condition coverage loss (S179).** On continuous multi-condition fixtures a
  per-slice routes to N/A when the slice falls below the test's applicability floor or
  hits the §3.7 `|γ₁| > 1.5` family pre-skip. On small fixtures (DS04: GoF + Modality
  LOW → N/A) this drops pooled flags that read mixture structure rather than
  within-condition fabrication — accepted per the S127 reasoning. The S177 per-test
  gate forces adjudication of any drop on a *declared* positive.
- **Trio N/A on count (S180, Finding 2).** GoF / Entropy / Modality route to N/A on
  count via `DATATYPE_SKIP`: a count column pools per-row units (per-gene NB means
  spanning orders of magnitude) into a mixture marginal, so marginal goodness-of-fit
  tests the wrong aggregation unit. Count distribution-shape forensics is carried by
  the per-gene mean-variance law (§4.1) and predicted-σ kurtosis (§2.2), not the trio.

---

## Phase 2 — per-cluster correctness pass. DONE (S183).

Cluster by cluster (A2 rhythm, on correctness): each test flags for the right reason
on positives, stays clean across shapes. Adjudicates the deferred per-test cells —
DS02, DS04, DS06, DS08, DS12b, DS13, DS14 — whose GT prose was not crisp enough for
snapshot-free declaration in Phase 0. Mechanical once Phase 0's machinery is in place.

Also carries the DS15 Baseline Balance / missingness methodology question (STATUS item
31): is the Carlisle test under-calling when balance is degraded by missingness, or is
ANOVA-filtered balancing a Mahalanobis/Missing-Data signature rather than a
mean-balance one? No DS15 Baseline Balance cell is declared in the batch; this is a
methodology lead, not a regression.

**Progress (S180–S182).**

- **DS11 promotion DONE (S180).** Finding 1: the trio is FISHER_EXEMPT — per-condition
  routing yields non-uniform per-slice `primaryP` under H₀, so Fisher's combination
  over-promotes; the trio joined the exempt set (`d79cacc`). Finding 2: trio N/A on
  count (`16ace4e`, the A1 coverage fact above). DS20 GoF corrected HIGH → MODERATE
  under Finding 1 — the Fisher-combination HIGH was a combination artefact, not a tier.
- **DS01 cross-shape DONE (S181, item 34 closed).** The wired `pending` assertion
  asserted a property A1 cannot structurally deliver: a pooled column with no condition
  layer → `rowGroups()` null → the per-condition path is unreachable, so the assertion
  could never flip to pass. Reconstructed as an active shape-invariance assertion — the
  same pool *with* a condition column clears the trio per-condition. Batch dropped its
  only pending → 23/23.
- **DS11 attribution corrected in GT (S181).** Engine output is 2 HIGH (Benford Second
  Digit + Autocorrelation) across 3 dimensions; the prior S118 note undercounted (1
  HIGH / 2 dims). Residual Spike Correlation MODERATE is corroborating breadth, not
  severity-load-bearing (severity holds at 3 via `high ≥ 2`).
- **DS15 Baseline Balance adjudicated (S182, item 31 closed).** The Phase 2 methodology
  question above resolves to hypothesis 2: Baseline Balance is correctly LOW on DS15,
  not under-calling. A read-only confirmed the instrument works — DS16 (pure
  over-balancing, no missingness) fires the same test HIGH (binomP = 0, KS-D = 0.75, 48
  of 60 features over-balanced). DS15 is row-grouped with only 6 DATA-column features
  and an `excessFrac ≥ 0.50` effect-size gate, so its over-balance signal sits
  structurally below the test's reach. The signal is carried instead by Blocked
  Mahalanobis MODERATE (the Σ-pass Control-rows-1–40 covariance signature) and
  Cross-Condition Consistency MODERATE. Missing-value handling is pairwise per
  (condition × column) with no listwise drop, so missingness is not masking. No engine
  change.
- **Deferred-cell sweep DONE (S182).** The four live deferred cells declared in
  `expected.flags`, GT-derived from a read-only and batch-green on first run (no
  force-greening): DS02 — Inter-Replicate Correlation + Residual Spike Correlation +
  Autocorrelation + Runs Test (the rescaled-copy + near-linear replicate-dependence
  mechanisms); DS08 — Selective Noise Partitioning + LOESS + Inter-Replicate
  Correlation + Constant-Offset Blocks + Benford 1st (noise reduction + multiplicative
  offset); DS12b — LOESS (the severity-1 within-column shift, sole MOD channel); DS14 —
  Exact Duplicate Detection (the copy-paste constant rows, strict HIGH). Allow-sets
  widened `['MODERATE','HIGH']` except the two p≈0 channels (DS08 Benford, DS14 DupDet)
  at strict `['HIGH']`. Mahalanobis Row Outlier on DS08 left undeclared — incidental
  single-row, not a GT-credited mechanism.
- **DS08 Benford 1st — new true detection surfaced (S182).** The sweep flagged Benford
  1st HIGH (primaryP ≈ 0) on DS08, which the stated GT mechanism did not predict. A
  follow-up read-only adjudicated it against the clean ELISA counterpart DS07 (same
  assay/shape/range, both clearing the span ≥ 1.5 Benford gate): DS07 stays LOW
  (MAD 0.025, leading-1 near-Benford), DS08 goes HIGH (MAD 0.041, leading-1 19% vs 30%
  + digit-4 surplus). Fabrication-linked, not a range/applicability artefact — credited
  in GT (S182) and declared as a cell. This is the audit working as intended: a genuine
  detection the severity-only gate would never have isolated.

**Remaining deferred cells.** None outstanding. The original seven reconcile fully:
DS02 / DS08 / DS12b / DS14 declared (S182, above); DS04 GoF/Modality definitively N/A
per the A1 coverage loss; DS06 / DS13 trio N/A per Finding 2 (as are DS05 / DS11). The
per-test gate now asserts every documented positive channel across the fabricated
batch.

**S183 — firing-inventory close.** A read-only sweep enumerated every MOD/HIGH
firing across all positive fixtures against the declared cells: **17 undeclared
firings** surfaced. All 17 adjudicated as **true detections** — GT-credited channels
sitting unasserted, or DS08-Benford-pattern confirmations with the matched clean
counterpart silent. The four on probe-gated item-32 tests cleared on mechanism
evidence: DS06 Noise Scaling right-reason on single-condition count (the VST-circularity
concern is structurally inapplicable — the test reads raw input by design); DS06
Mahalanobis a real one-row outlier, not the S127c heavy-tailed-null signature
(nOut = 1, a row survives BH-FDR α=0.001; clean DS05 has zero); DS10 LOESS + Regional
Noise condition-internal by a three-way slice probe (both localise onto the
ProteinID 80–120 fab range within each per-condition slice, not the row-200 condition
boundary), not pooled-boundary artefacts. **Zero contamination, zero clean-side false
positives** — the seven clean fixtures fired nothing.

The finding was the *inverse* of the premise: not wrong-reason flags hiding in a
correct total, but GT-credited right-reason channels sitting **undeclared** —
including two severity-load-bearing HIGH flags (DS11 Benford Second Digit, DS20
Selective Noise Partitioning) and the named primary targets of DS04 (Terminal Digit
Uniformity) and DS13 (Value-Frequency Spike). This is lookup drift behind a
fast-moving engine: per-test cells only existed from Phase 0 (S177), while verdicts
held throughout, so prose-documented channels accreted without matching assertions.

Closed three ways: (1) declared the true detections (DS04 ×3, DS06 ×3, DS10 ×4,
DS11 ×1, DS13 ×1, DS15 ×1, DS20 ×2); (2) acknowledged the two incidental one-row
Mahalanobis firings (DS06, DS08) in a new `expected.acknowledged` map — real, but
downstream consequences, not GT-credited primary channels; (3) added the
**completeness gate** — every MOD/HIGH firing on a positive must now be either
declared in `expected.flags` or listed in `expected.acknowledged`, and every clean
fixture must fire nothing, else the batch fails. The lookup is now a closed contract:
the engine can no longer move a channel without the gate noticing. The CLAUDE.md
convention adds the forward rule — a tiered channel named in GT prose must carry a
cell, and a new detector that fires on any positive lands a cell or an acknowledged
entry in the same change.

**Item 32 (probe-gated four) refined, not retired.** S183 upgraded the evidentiary
basis from latent-untested to demonstrated-true-positive-no-artifact for three of the
four (Noise Scaling on single-condition count; LOESS + Regional Noise on row-grouped
multi-condition). The probe-gate discipline held — there was no artefact to fix. Still
un-probed: Noise Scaling's own column-grouped multi-condition contamination axis
(DS06 was single-condition), and Within-Row Variance (no firing, fully latent). Both
remain fixture-gated.

Audit complete; STATUS item 28 closed.

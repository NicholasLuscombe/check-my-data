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

## Phase 2 — per-cluster correctness pass. PENDING.

Cluster by cluster (A2 rhythm, on correctness): each test flags for the right reason
on positives, stays clean across shapes. Adjudicates the deferred per-test cells —
DS02, DS04, DS06, DS08, DS12b, DS13, DS14 — whose GT prose was not crisp enough for
snapshot-free declaration in Phase 0. Mechanical once Phase 0's machinery is in place.

Also carries the DS15 Baseline Balance / missingness methodology question (STATUS item
31): is the Carlisle test under-calling when balance is degraded by missingness, or is
ANOVA-filtered balancing a Mahalanobis/Missing-Data signature rather than a
mean-balance one? No DS15 Baseline Balance cell is declared in the batch; this is a
methodology lead, not a regression.

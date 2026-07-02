# Session 296 — §2.6 fixture pre-build audit (READ-ONLY)

**Read-only.** No `src/` file was edited, no fixture CSV was written, no batch was run. A throwaway measurement script (in the checkout root, not committed to `src/`) built synthetic columns and computed collision baselines. This settles the two questions the §2.6 fixture build needs answered first: whether the batch harness can hold a fixture that fails the current engine on purpose, and what recurrence shape actually discriminates the estimator choice. It does not build the fixture, design its columns, or pick the estimator.

The §2.6 fixture is unusual: for its recurrence columns it asserts a verdict the current engine gets wrong. The correct collision null rates structured value recurrence HIGH, but the current empirical-Herfindahl null rates it LOW at p = 1.0 (the circularity the axis-2 fix removes). So the fixture is correct against its target and failing against today's engine, and it cannot enter the live pass gate until the fix lands.

---

## Question 1 — does the harness support a held / expected-to-fail fixture?

**How pass/fail is decided.** The runner loops over `EXPECTED` (imported from `test/batch-fixtures.mjs`) and for each fixture computes three checks against declared expectations, combined at `test/validate-batch.mjs:149`:

```
const ok = severity === expected.severity && cellsOk && completenessOk;
```

- `severity === expected.severity` compares the computed severity against the fixture's declared `expected.severity`.
- `cellsOk` (built at `:107-119`) checks each declared `expected.flags[testName]` allow-set — the test's `r.flag` must land in the declared tier set, else a per-cell miss.
- `completenessOk` (built at `:128-147`) checks the other direction — every MODERATE/HIGH firing on a positive fixture must be declared in `expected.flags` or listed in `ACKNOWLEDGED[file]`, and a clean fixture (severity 0) must fire nothing.

So the gate is a genuine expected-output assertion driven by the manifest in `batch-fixtures.mjs`, not merely "engine ran without throwing." There is no separate golden-output file; the runner imports only `EXPECTED` and `ACKNOWLEDGED` and asserts against those.

**Whether a fixture can be held out.** Yes — a held lane already exists in the runner, though it is currently dormant. At `test/validate-batch.mjs:151-155`:

```
if (expected.pending) {
  console.log(`◦ ${file}: severity=${severity} (pending — ${expected.pendingNote})${flags ? ' [' + flags + ']' : ''}`);
  pending++;
} else {
  // …normal pass/fail counting…
}
```

When a fixture's `EXPECTED` entry carries `pending: true`, the runner still computes and reports its severity but routes it to a `pending++` counter instead of pass/fail, so it cannot break the headline count — the summary reads `${passed}/${passed + failed} passed (+ ${pending} pending)`. The `ok` / cell-miss / completeness values are still computed at `:107-149` but are simply not acted on in the pending branch. No fixture in `batch-fixtures.mjs` sets `pending` today (the flag is defined only in the runner, unused in the manifest), so the lane is present but idle.

One caveat to record for the build prompt: the lane's documented intent (`:152`, "fabricated fixture with no applicable active test yet") is a near, not exact, fit for the §2.6 case. The §2.6 held fixture is different — its target test (Exact Duplicate Detection's collision channel) *does* run, it just returns the wrong verdict by design until the null is fixed. The `pending` flag would carry it correctly on the mechanics (report, don't gate), but its `pendingNote` string is where the "held because the current null is known-wrong, not because the test is inapplicable" distinction has to be spelled out, or the semantics read as mislabeled. If Chat wants a distinct concept rather than an overloaded `pending`, the smallest runner change is a sibling flag checked in the same position — for example `if (expected.held) { report + heldCount++ }` branching identically to the pending arm — but that is a runner edit and out of scope for this read; the existing `pending` lane needs no code change to be used.

**The flip path.** Once the axis-2 fix lands and the recurrence columns correctly rate HIGH, promotion is a single-site edit to the fixture's one entry in `EXPECTED` (`test/batch-fixtures.mjs`): remove `pending`/`pendingNote`, set `severity` to the correct positive value, and populate `flags` with the recurrence columns' allow-sets (for the collision channel, `'Exact Duplicate Detection': ['HIGH']`). The fixture CSV itself does not move — all fixtures live in `test/fixtures/` and are enumerated by `EXPECTED`, so there is no directory or skip-list to change. The fixture should also be added to the ordered `FIXTURES` array in the same file if it is to appear in the generated test-display map. Net: the fixture lands now with `pending: true` and one held column, and promotes later by editing that single entry — the interim home and the promotion step are both in `batch-fixtures.mjs`.

---

## Question 2 — naive-versus-flattened KDE separation across recurrence shapes

Three synthetic continuous two-decimal columns were built, each N = 373 over the CORPUS-03 SL range `[20.22, 28.96]` (matching its moments for a fair comparison), varying the concentration of the recurrence against a mostly-distinct background. Bandwidth is Silverman's rule on each sample (naive KDE on the full multiset, flattened KDE on the distinct values); the collision baseline is `p1 = Σ_grid (f·step)²` at `step = 0.01`, the quantity that replaces the empirical HHI and feeds the binomial collision test. Verdicts use the engine's own `regIncBeta` binomial survival and `flagFromP` (HIGH below 0.001, MODERATE below 0.01).

| Shape | concentration | nDistinct | collObs | HHI (current) | p1 naive KDE | p1 flat KDE | separation naive/flat |
|-------|--------------|-----------|---------|---------------|--------------|-------------|-----------------------|
| A (mild) | 10 values ×5 | 326 | 135 | 4.62e-3 | 1.71e-3 | 1.67e-3 | **1.02** |
| B (moderate) | 5 values ×10 | 324 | 265 | 6.49e-3 | 1.60e-3 | 1.58e-3 | **1.01** |
| C (severe) | 3 values ×20 | 314 | 610 | 1.14e-2 | 1.62e-3 | 1.63e-3 | **1.00** |

Verdict on the collision channel under each null:

| Shape | flag @ HHI (current engine) | flag @ naive KDE | flag @ flattened KDE (correct) |
|-------|-----------------------------|------------------|--------------------------------|
| A | LOW (p = 1.0) | LOW (p = 0.076) | LOW (p = 0.045) |
| B | LOW (p = 1.0) | HIGH (p ≈ 1e-35) | HIGH (p ≈ 2e-36) |
| C | LOW (p = 1.0) | HIGH (p ≈ 6e-235) | HIGH (p ≈ 2e-234) |

**The central finding, and it is not the one the question anticipated.** The naive-versus-flattened separation does *not* grow with concentration. It stays at 1.00 to 1.02 across all three shapes, including the severe 3×20 case. The 1.08× that obs 4 of the estimator read measured on CORPUS-03 was not an artifact of that column's near-uniform recurrence — it is roughly the ceiling for this separation at any sensible bandwidth. Concentrating the recurrence onto fewer values does not separate the two kernel estimators.

The reason is bandwidth. A supplementary sweep on the severe shape shows the separation is entirely bandwidth-gated:

| bandwidth | p1 naive | p1 flat | separation |
|-----------|----------|---------|------------|
| 0.02 | 3.02e-3 | 1.91e-3 | 1.58 |
| 0.05 | 2.20e-3 | 1.79e-3 | 1.23 |
| 0.10 | 1.90e-3 | 1.74e-3 | 1.10 |
| 0.20 | 1.76e-3 | 1.70e-3 | 1.03 |
| 0.449 (Silverman) | 1.62e-3 | 1.63e-3 | 1.00 |

The separation only appears when the bandwidth is pushed down toward the recording step of 0.01. At Silverman's bandwidth (~0.45, about 45× the step) the kernel smooths the recurrence spikes away regardless of how concentrated they are, so the naive and flattened estimates integrate to the same baseline. Even locally, at the three ×20 values in the severe shape, the naive-over-flattened density inflation is only 1.06 to 1.23 — and that local bump does not survive into the integrated baseline. The recurrence-flattening correction is therefore not exercised by a concentrated fixture at a reasonable bandwidth; it would only matter if the kernel null were implemented with a near-step bandwidth, which would be a poor implementation choice on its own terms.

**Does the correct null still rate the recurrence HIGH (no over-correction)?** For the moderate and severe shapes, yes and decisively — the flattened (correct) null rates both HIGH at astronomically small p, while the current HHI null rates all three LOW at p = 1.0. The mild shape is the informative boundary: 10 values each repeated 5 times produce only 135 collisions, barely above the ~116 that the correct null already expects from ordinary density overlap at 0.01 resolution, so it does not even reach MODERATE (p = 0.045). Mild concentration is below the detection floor of the correct null, not just the broken one.

**Which shape gives the cleanest discrimination, stated as evidence, not a recommendation.** Two different discriminations are in play, and the shape choice depends on which the fixture is meant to serve.

- If the fixture's job is to verify the fix — that the correct null flips the verdict from LOW to HIGH where the current engine fails — then Shape B (5 values ×10) is the cleanest evidence. It flips decisively (LOW at p = 1.0 under the current null, HIGH under the correct one), its collision count sits well clear of the null expectation rather than at a margin, and five values each appearing ten times among ~370 rows reads as a plausible block-copy defect. Shape C (3 values ×20) flips just as decisively but twenty identical two-decimal readings is a more conspicuous, less subtle defect. Shape A (10 values ×5) cannot serve — it stays sub-MODERATE even under the correct null, so it would not flip.
- If the fixture's job were instead to discriminate the estimator *choice* — naive kernel versus recurrence-flattened kernel — then no shape in this range does it. The separation is ~1.00 at Silverman bandwidth for all three, so a concentrated-recurrence fixture cannot distinguish the two kernel variants, and by extension cannot distinguish a well-configured kernel null from the parametric one either (all three model-based baselines land near 1.6e-3). That discrimination is not available through a fixture at a sensible bandwidth; it lives in the bandwidth choice, not the column shape.

So the pre-build evidence points at Shape B as the recurrence column for a fix-verification fixture, and it retires the premise that a concentrated shape is needed to separate the estimators — at a reasonable bandwidth the estimators do not separate, and the fixture's real value is verifying the LOW-to-HIGH flip, which the moderate shape delivers cleanly. Chat picks the final concentration and column count.

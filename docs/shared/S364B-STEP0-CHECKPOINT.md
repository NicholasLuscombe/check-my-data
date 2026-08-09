# S364 part B, Step 0 — can the n-mismatch be the main term?

Read-only. Nothing in `src/` changed, no batch gate, no engine run beyond regenerating part A's
census. Checkpoint document: Steps 1, 2 and 3 were **not** run.

Instrument: `test/probes/probe-s364b-mis-centred.mjs --step0`, reading
`test/probes/out-s364/units.json` from `probe-s364-promotion-gap.mjs --census`. That JSON is
gitignored and did not survive part A's worktree teardown, so it was regenerated first; it reproduces
part A cell for cell (478 units, 30 floored, 45 MODERATE, one promotion, one dropped table).

---

## The answer in three lines

1. **0.1 holds exactly as predicted** — 2.50% floored at four replicates against 10.08% at six.
2. **But that cannot be the n-mismatch**, because the mismatch ratio is **exactly 2.000000 in both
   cells** and so predicts the *same* inflation in each. Something else varies with replicate count.
3. **And the n-mismatch is nevertheless the right size — on the transformed block only.** Fitted
   inflation is 1.48 and 1.32 on `general` against a √2 = 1.414 prediction, and 1.96 and 2.43 on
   `plate_reader`. **Step 2 is predicted to repair `general` outright and leave `plate_reader` tens of
   times above nominal.**

---

## 0.1 — the discriminator

| reps | cols | pairs/row | rows/condition | n_obs | n_null | ratio | units | floored | rate |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 4 | 4 | 6 | 120 | 720 | 1440 | 2.000000 | 240 | 6 | **2.50%** |
| 6 | 6 | 15 | 120 | 1800 | 3600 | 2.000000 | 238 | 24 | **10.08%** |

**Your hand count was right** — 6 and 24, 2.50% against 10.08%, a four-fold difference.

**The confound is real and it is worse than "effective sample size does not scale".** Rows per
condition is **120 in both cells**. Only the pair count moves, 6 → 15. So the nominal `n` doubles
while the number of genuinely independent units — subjects — does not change at all. Nothing in this
comparison can distinguish "a bias divided by a shrinking sd" from "the inflation factor itself
depends on replicate count", because the quantity that would have to shrink may not be shrinking.

**What the comparison does settle, independently of that.** Within a cell the null and the observed
carry an identical pair structure and differ only in row count, 240 against 120. The correlation
between pairs of the same row therefore cancels between the two sides, and the mismatch ratio is
**exactly 2 in both cells** — verified on all 478 units, no exceptions, with neither the
`MAX_SIM_ROWS = 500` row cap nor the `MAX_SIM_PAIRS = 30` pair cap firing. **A quantity that is
identical in both cells cannot produce a four-fold difference between them.** Whatever drives the
replicate-count dependence, it is not the n-mismatch.

The ratio rungs are flat, as they should be — 5.63% / 6.88% / 6.33% at r = 1 / 1.5 / 2.5, medians
0.2745 / 0.2462 / 0.2450. The floored units are not tracking `condNoiseRatio`, which is consistent
with S363's "neither condition moves" and confirms this is a calibration fault rather than the S361
axis leaking into the per-condition arm.

---

## 0.2 — does one inflation factor describe the distribution?

Model: null κ ~ N(0, σ), observed κ ~ N(0, `s`σ), continuous tail `q(z) = 2(1 − Φ(s|z|))`, reported p
`(1 + K)/(B + 1)` with `K ~ Binomial(B, q)` so the floor is `K = 0` exactly rather than read off `q`.
`s` is fitted from the median of `rawP` and from nothing else.

**Machinery control: at `s = 1` the model returns 0.050% floored, 0.900% MODERATE and 50.00% below
0.5 — the three nominals exactly.**

### Your `s ≈ 1.87` is not the median fit, and this matters

The median-only fit on all 478 units is **`s` = 1.6805**. An `s` of 1.87 implies a median `rawP` of
**0.2072**, not the observed 0.2570. What 1.87 *does* reproduce is the floor rate (it predicts 5.6%
against an observed 6.28%) — so it behaves like a value fitted on the floor, and then "predicting"
the floor from it is circular. The honest median-only fit predicts **3.41%** against the observed
6.28%, an underprediction of **1.84×**.

| quantity | observed | predicted from the median-fitted `s` alone | obs/pred |
|---|---:|---:|---:|
| floored rate | 6.28% | 3.41% | **1.84×** |
| MODERATE band | 9.41% | 8.79% | 1.07× |
| mass below 0.5 | 67.78% | 68.81% | 0.99× |

So on the pooled block: **one parameter reproduces the body and the MODERATE band and underpredicts
the far tail.**

### But most of that underprediction is a mixture artefact

0.1 and 0.3 both show the rate moving, so the pooled block is not homogeneous, and **a mixture of two
scaled Gaussians has heavier tails than either component.** A pooled fit therefore manufactures
exactly the tail excess this step is meant to detect. The four assay × replicate cells are the
smallest homogeneous unit available:

| assay | transform | reps | units | median | fitted `s` | obs floor | pred floor | obs/pred | binomial tail | `s`/√2 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| general | `log` | 4 | 120 | 0.3167 | **1.4843** | 1.67% (2) | 1.69% (2.0) | 0.99× | 0.670 | **1.050** |
| general | `log` | 6 | 118 | 0.3725 | **1.3222** | 4.24% (5) | 0.76% (0.9) | 5.59× | **0.002** | **0.935** |
| plate_reader | `raw` | 4 | 120 | 0.1872 | **1.9552** | 3.33% (4) | 6.75% (8.1) | 0.49× | 0.086 | 1.383 |
| plate_reader | `raw` | 6 | 120 | 0.1015 | **2.4279** | 15.83% (19) | 13.93% (16.7) | 1.14× | 0.310 | 1.717 |

Floored counts per cell run 2 to 19, so each carries an exact binomial tail at the cell's own `n` and
predicted rate. **The single-parameter model is rejected in one cell of four** — `general` at six
replicates, 5 observed against 0.9 predicted, p = 0.002. The `plate_reader` 4-replicate cell reads
0.49× but at p = 0.086 that is not distinguishable from sampling.

**So the distribution is mostly scaled, not shifted or skewed.** Three of four cells are consistent
with a pure variance inflation; one is not, and it is not the cell anyone would have guessed.

---

## 0.3 — per assay, and the split that reorganises the problem

Fitted separately, `general` (transform `log`) reads `s` = 1.386 and `plate_reader` (transform `raw`)
reads `s` = 2.208. Two things follow.

**The replicate-count dependence lives almost entirely in the untransformed block.** Across four to
six replicates `s` moves 1.96 → 2.43 on `plate_reader` and 1.48 → **1.32** on `general` — the wrong
way. The 0.1 signal, the thing that looks like a bias term, is a `plate_reader` phenomenon. It is
P118's shape and belongs in P118's row, not in a general statement about the per-condition arm.

**On the transformed block the n-mismatch is the whole of the measured inflation.** √2 = 1.4142 is
what the mismatch predicts on its own. `general` reads `s`/√2 = **1.050** at four replicates and
**0.935** at six — within 7% of the prediction, from both sides. Nothing is left over to explain.

**On the untransformed block a large residual survives.** `s`/√2 = 1.383 and 1.717. Removing the
mismatch entirely still leaves an inflation of 1.4 to 1.7 that the absent transform has to account
for.

---

## What this does to Step 2

**Run it, and hold it to the per-cell numbers rather than the pooled ones.** The design is sound; the
prediction changes, and it becomes sharper rather than weaker. Matching `n` is predicted to **repair
the transformed block outright and barely dent the untransformed one** — not to improve both by a
common factor.

Predictions on record, mine beside yours. Mine differ because `s` is fitted per block from each
block's own median rather than taken as a single 1.87:

| block | floored now | your prediction | this model |
|---|---:|---:|---:|
| all units | 6.28% | ~1% | **0.31%** |
| `general` (log) | 2.94% | ~0.2% | **0.04%** |
| `plate_reader` (raw) | 9.58% | ~1.9% | **2.28%** |
| median `rawP`, all units | 0.257 | ~0.37 | **0.423** |

Per homogeneous cell, which is the version to hold the measurement to:

| assay | reps | `s` now | `s`/√2 | floor now | floor after matched n | median `rawP` after |
|---|---:|---:|---:|---:|---:|---:|
| general | 4 | 1.4843 | 1.0496 | 1.67% | **0.09%** | 0.479 |
| general | 6 | 1.3222 | 0.9349 | 4.24% | **0.02%** | 0.528 |
| plate_reader | 4 | 1.9552 | 1.3825 | 3.33% | **1.05%** | 0.351 |
| plate_reader | 6 | 2.4279 | 1.7168 | 15.83% | **3.80%** | 0.247 |

Nominal is 0.05%. Two of these are falsifiable in a way that matters: `general` at six replicates has
`s`/√2 below 1, so matched-n should come out **conservative** there, and that is a real outcome
rather than a rounding of "calibrated". And that same cell is the one where the scale model is
rejected — its five floored units may not all disappear when the body is corrected. **It is the cell
to watch.**

Two standing caveats. `s` is fitted under a Gaussian model of a kurtosis statistic computed on
correlated differences, which is neither Gaussian nor independent, so `s` ≈ √2 on `general` is
suggestive rather than proof — the matched-n null is what settles it. And Step 1 was not run: the
ratio of 2 is established here from the row and pair counts in the census plus the source structure,
not from a per-cell instrumented census, though it is confirmed on every one of the 478 units with
neither cap firing.

---

## Bearing on the register

- **P120's cause is now two causes with a clean split by assay label.** On transformed data the
  n-mismatch accounts for all of the measured inflation; on untransformed data roughly half of it in
  log terms, with the remainder sitting where P118 already predicts.
- **P118 gains a quantity.** The residual after removing the mismatch is 1.38× to 1.72×, and it grows
  with replicate count. That is the first number attached to P118's shape on this generator.
- **Nothing here licenses a fix.** The n-mismatch is a diagnostic finding about a null's construction;
  whether it should be repaired, and how, is untouched by this step.

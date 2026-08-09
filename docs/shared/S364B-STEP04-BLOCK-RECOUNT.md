# S364 part B, Step 0.4 — the block recount

Read-only. Nothing in `src/` changed, no batch gate, no engine run beyond regenerating part A's
census. Checkpoint document: **Steps 1, 2 and 3 were not run.**

Instrument: `test/probes/probe-s364b-block-recount.mjs --step04`, reading
`test/probes/out-s364/units.json` from `probe-s364-promotion-gap.mjs --census`. That JSON is
gitignored and did not survive part B Step 0's worktree teardown either, so it was regenerated first
(~4 min); it reproduces part A cell for cell again — 478 units, 30 floored, 45 MODERATE, one
promotion, one dropped table, 6.28%, 67.8% below 0.5. Step 0's fits were re-run on it and reproduce
to four decimals (`s` = 1.4843 / 1.3222 / 1.9552 / 2.4279).

---

## The answer in four lines

1. **Every one of Chat's hand-derived block figures holds except one label.** 30 units, 15 blocks,
   6 all-three blocks, the six named correctly, 1 / 3 / 2 / 9 per cell, 40 blocks per cell. The
   exception: **18 is the count of units in the all-three blocks, not "units inside repeat blocks",
   which is 24.**
2. **The dependence is far stronger than the checkpoint assumed.** Measured within-block correlation
   is **ρ̂ = 0.92 to 0.99** — the three rungs are very nearly the same measurement.
3. **So the rejection does not die — the independence conversion was the only thing killing it.** At
   ρ = 0 it reads p = 0.059, which is the ~0.06 the dispatch predicted. At the measured ρ̂ it reads
   **p = 0.013**, and at ρ = 1, **p = 0.011**. Independence is the *weakest* reading, and it is
   refuted by measurement.
4. **But it is a straddle, not a finding.** Four cells were tested; ×4 the smallest tail is
   **0.0507 at ρ̂ and 0.0444 at ρ = 1** — the corrected result crosses 0.05 depending on which
   dependence assumption is used. Nothing here settles it in either direction.

---

## 0.4.1 The hand count, verified against the census

| claim (Chat, hand-derived from part A's table) | claimed | measured | verdict |
|---|---:|---:|:--|
| floored condition-units | 30 | 30 | holds |
| distinct floored blocks | 15 | 15 | holds |
| blocks flooring at all three rungs | 6 | 6 | holds |
| floored units carried by those all-three blocks | 18 | 18 | holds |
| floored units inside REPEAT blocks (≥2 floored rungs) | 18 | **24** | **wrong label** |
| blocks per cell | 40 | 40 | holds |
| floored blocks — general 4rep | 1 | 1 | holds |
| floored blocks — general 6rep | 3 | 3 | holds |
| floored blocks — plate_reader 4rep | 2 | 2 | holds |
| floored blocks — plate_reader 6rep | 9 | 9 | holds |

All six named all-three blocks are correct and the measured set contains no others:
`general|6|6106|CondB`, `plate_reader|4|6111|CondA`, `plate_reader|6|6100|CondB`,
`plate_reader|6|6106|CondB`, `plate_reader|6|6117|CondA`, `plate_reader|6|6118|CondB`.

**The one correction is a description, not an arithmetic slip.** 18 units sit in the six blocks that
floor at every rung; 24 sit in the nine blocks that floor at more than one. The distribution is
6 blocks × 1 rung, 3 blocks × 2 rungs, 6 blocks × 3 rungs = 6 + 6 + 18 = 30.

A block is one **(assay, replicates, seed, condition)** combination. There are 160 of them, 40 per
cell (20 seeds × 2 conditions). Two blocks carry 2 rungs rather than 3 — `general` 6rep seed 6105,
both conditions, the four-decimal tie part A reproduced — which is the 478-against-480 gap, and the
expected-count arithmetic below uses each block's own rung count rather than assuming 3.

---

## 0.4.2 The clumping is real

Reference: hold each cell's floored-unit **count** fixed and re-assign which of that cell's
unit-slots are floored, uniformly at random. It asks what the block count would be if flooring were
a property of the (draw × rung) slot rather than of the underlying draw. 20,000 permutations,
deterministic xorshift.

| | value |
|---|---:|
| observed distinct blocks | **15** |
| slot-uniform mean | 26.98 |
| slot-uniform range | 21–30 |
| P(distinct ≤ 15) | **0 of 20,000, so < 5.0e-5** |

Flooring is substantially a property of the generated draw. Step 0's per-unit binomial tails
over-count, and the size of the over-count is now measured rather than asserted.

---

## 0.4.3 The re-test, and the conversion it turns on

### The null block rate and how it was got from the per-unit model

Step 0 fits one inflation `s` per cell from the median `rawP` and predicts a per-unit floor
probability `p₁`. **The model says nothing about how a block's rungs relate to each other**, so `p₁`
cannot be converted to a block rate without one more input — and that input decides the answer, so
it was measured rather than assumed.

Write a unit's standardised statistic as `z ~ N(0, s)` in units of the null's sd. Its continuous
tail probability is `q = 2(1 − Φ(|z|))`; the reported p is `(1 + K)/(B + 1)` with
`K ~ Binomial(B, q)`, so the floor event is `K = 0`. Within a block the R rungs share one generated
draw, so their `z`s are correlated; conditional on the `z`s the binomial layers are independent:

```
P(block floors) = 1 − E_g[ ( E_e[ 1 − (1 − q(z))^B ] )^R ],   z = s(√ρ·g + √(1−ρ)·e)
```

Evaluated by **nested deterministic quadrature** (step 0.008 over ±8.5), not Monte Carlo — the
multiplicity-corrected tail lands within a few thousandths of 0.05 and cannot be decided off a
simulation estimate.

**ρ̂ is estimated from the whole unit population, not from the floored tail**, so it is not fitted on
the quantity under test. Each unit's signed statistic is reconstructed as
`ẑ = sign(κDev)·Φ⁻¹(1 − rawP/2)` — `rawP` is two-sided about the null median
(`kurtosis.js:423-425`) and `kurtDeviation` carries the side. Spearman's ρ_s over all within-block
rung pairs, converted by `ρ = 2·sin(π·ρ_s/6)`. Rank correlation because floored units are censored
onto one value of `rawP`.

Two approximations on the record: `κDev` is measured against the null **mean** while `rawP` is
measured against the null **median**, so a unit very near the centre can take the wrong sign; and
the reconstruction inverts a discretised `k/2000` p.

### Measured dependence

| assay | reps | blocks | floored blocks | block rate | Spearman ρ_s | **ρ̂** | ρ̂ excl. floored pairs |
|---|---:|---:|---:|---:|---:|---:|---:|
| general | 4 | 40 | 1 | 2.50% | 0.984 | **0.985** | 0.984 (117 pairs) |
| general | 6 | 40 | 3 | 7.50% | 0.987 | **0.988** | 0.986 (109 pairs) |
| plate_reader | 4 | 40 | 2 | 5.00% | 0.975 | **0.977** | 0.974 (115 pairs) |
| plate_reader | 6 | 40 | 9 | 22.50% | 0.912 | **0.920** | 0.874 (96 pairs) |

Dropping every pair that touches a floored unit barely moves it, so the dependence is a property of
the whole distribution and not of the censored tail. **This is S363's "neither condition moves" seen
from the other side**: the per-condition κ is close to invariant to `condNoiseRatio`, so reading one
draw at three rungs is close to reading it three times.

`ρ = 1` is not the same as `p₁`, and the reason matters: even when the three rungs share one `z`,
each rung is a separate engine run on rescaled data, draws its own simulation null, and gets its own
independent binomial layer. A block at `ρ = 1` therefore has three independent chances at `K = 0`,
and its rate is `E[1 − (1 − P₀(z))³]`, strictly above `E[P₀(z)]`.

### The re-test

| assay | reps | obs blocks | ρ = 0: exp (tail) | **ρ = ρ̂: exp (tail)** | ρ = 1: exp (tail) | unit level (Step 0.3b) |
|---|---:|---:|---|---|---|---|
| general | 4 | 1 | 1.99 (0.401) | **1.04 (0.721)** | 0.97 (0.627) | 2 / 2.03 (0.670) |
| general | 6 | **3** | 0.89 (0.059) | **0.49 (0.013)** | 0.46 (0.011) | 5 / 0.89 (0.002) |
| plate_reader | 4 | 2 | 7.56 (0.012) | **3.82 (0.251)** | 3.46 (0.317) | 4 / 8.10 (0.086) |
| plate_reader | 6 | 9 | 14.49 (0.047) | **8.53 (0.490)** | 6.67 (0.213) | 19 / 16.71 (0.310) |

**Read the direction of every tail before reading its size.** A tail below 0.05 with the observation
*above* expectation is evidence against the single-scale model. A tail below 0.05 with the
observation *below* expectation is evidence against the ρ used to get the expectation. The two
`plate_reader` "rejections" in the ρ = 0 column are the second kind — independence over-states how
many distinct blocks a fixed number of floored units can occupy, which 0.4.2 measured directly. They
are not evidence about the scale model and must not be quoted as such.

| assay | reps | ρ = 0 | ρ = ρ̂ | ρ = 1 |
|---|---:|:--|:--|:--|
| general | 4 | below | below | above |
| general | 6 | **above** | **above** | **above** |
| plate_reader | 4 | below | below | below |
| plate_reader | 6 | below | above | above |

### Multiplicity

Four cells were tested, so a single 0.013 is not a 0.013. Only high-side tails are eligible — a cell
below expectation is not evidence against the model, and including it would be counting the wrong
events. Rank-1 BH and Bonferroni coincide at `m = 4`:

| ρ | smallest high-side tail | cell | × 4 | rejects at 0.05 |
|---|---:|---|---:|:--|
| 0 (independence) | 0.05876 | general 6rep | 0.2350 | no |
| **ρ̂ (measured)** | **0.01268** | general 6rep | **0.05071** | **no — by 7 parts in ten thousand** |
| 1 (perfect) | 0.01109 | general 6rep | 0.04435 | yes |

---

## 0.4.4 How often a block that floors once floors at every rung

Of the 15 blocks that floor at least once, **6 floor at every rung they have (40%)**, 3 floor at
exactly two, 6 at exactly one.

| assay | reps | floored blocks | all rungs | exactly 2 | exactly 1 |
|---|---:|---:|---:|---:|---:|
| general | 4 | 1 | 0 | 1 | 0 |
| general | 6 | 3 | 1 | 0 | 2 |
| plate_reader | 4 | 2 | 1 | 0 | 1 |
| plate_reader | 6 | 9 | 4 | 2 | 3 |

And how far from the floor the *other* rungs of a floored block sit — the median `rawP` over the
rungs a floored block did not floor at, against the cell's median over all units:

| assay | reps | non-floored rungs of floored blocks | all units |
|---|---:|---:|---:|
| general | 4 | 0.0010 (n = 1) | 0.3167 |
| general | 6 | 0.0015 (n = 4) | 0.3725 |
| plate_reader | 4 | 0.0013 (n = 2) | 0.1872 |
| plate_reader | 6 | 0.0052 (n = 8) | 0.1015 |

A floored block's non-floored rungs are still two to three orders of magnitude below their cell's
median. Reported, not interpreted.

---

## What this changes for Step 2

Stated as a change of framing, not as a Step 2 result — Step 2 has not run.

- **The dispatch's "if the rejection does not survive, nothing rejects the single-scale model
  anywhere" branch is not the branch we are on.** The rejection survives at the measured dependence
  and fails multiplicity by 0.0007. The clean "pure scale everywhere" reading is available only if
  the independence conversion is preferred, and independence is refuted at P < 5e-5.
- **The honest statement is a straddle**, in the S357 sense: the answer is decided by a modelling
  choice rather than by the data. It should be reported as such and not resolved by picking the
  convenient side.
- **`general` 6rep is still the cell to watch, and now for two reasons.** It carries the only
  high-side excess, and Step 0 predicts its matched-n arm at `s`/√2 = 0.935 — *conservative*. If
  Step 2's matched-n null both removes the excess and comes out conservative there, the two facts
  fit one cause. If the excess survives matched n, it does not.
- **Nothing here touches `plate_reader`.** Both its cells are consistent with their own fitted `s`
  at the measured dependence (p = 0.251, 0.490), which is what Step 0 already found at unit level.
  The residual Step 3 would explain is the *size* of `s` on the untransformed block (1.96 and 2.43
  against √2), not a departure from the scale model.

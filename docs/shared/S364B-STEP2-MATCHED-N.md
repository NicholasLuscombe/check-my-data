# S364 part B, Step 2 — the matched-n measurement, read at block level

Read-only over `src/`. The matched-n null is a diagnostic re-implementation inside the probe; nothing
in `src/` moved and no batch gate ran.

Instrument: `test/probes/probe-s364b-matched-n.mjs`, three modes.

```bash
node test/probes/probe-s364-promotion-gap.mjs --census      # ~4 min, regenerates out-s364/units.json
node test/probes/probe-s364b-matched-n.mjs --step2a
node test/probes/probe-s364b-matched-n.mjs --predict        # writes predictions BEFORE the measurement
node test/probes/probe-s364b-matched-n.mjs --step2b         # ~1 min
```

Full output at `test/probes/out-s364b/{step2a,step2-predictions,step2b}.md` and
`matched-units.json` (gitignored — regenerate rather than look for it).

The regenerated census reproduces Step 0.4 exactly: 478 condition-units, 30 floored, 15 floored
blocks, 6 all-three blocks, the same six named blocks, 1 / 3 / 2 / 9 per cell, and the same
`P(distinct ≤ 15) < 5e-5`.

---

## The headline

**The n-mismatch was the whole of P120 on the transformed block and most of it on the untransformed
one.** Rebuilding the per-condition null at the observed n takes the floored count from 30 units in
15 blocks to **7 units in 3 blocks**, and every surviving one sits in a single cell — `plate_reader`
6rep. Three of the four cells go to exactly zero.

| cell | floored blocks now | matched | floored units now | matched |
|---|---:|---:|---:|---:|
| general 4rep | 1 | **0** | 2 | **0** |
| general 6rep | **3** | **0** | 5 | **0** |
| plate_reader 4rep | 2 | **0** | 4 | **0** |
| plate_reader 6rep | 9 | **3** | 19 | **7** |

**No cell rejects the scale model after the pre-registered ×4 correction** — the smallest corrected
tail is 1.000. Step 0.3b's one rejection and Step 0.4's straddle are both resolved, in the direction
the scale model predicted.

---

## Step 2a — the read before the measurement

### 2a.1 The per-condition κ IS standardised, and by a pooled-fit sigma

The dispatch's second branch is the live one.

| site | what it does |
|---|---|
| `kurtosis.js:99` | `fitPredictedSigma(matrix)` — one fit over the WHOLE matrix |
| `kurtosis.js:102` | `sigma = usePredicted ? predictedSigma : localSigma` |
| `kurtosis.js:413-414` | `condDiffs.push((matrix[r][c1] − matrix[r][c2]) / sigma[r])` |
| `primitives.js:71-96` | regresses `log(variance)` on `log(row mean)`; returns `σ̂_r = exp((intercept + slope·log m_r)/2)` |

So invariance is **not** exact by construction: the fit is pooled, and changing `condNoiseRatio`
changes the fit. But the fit is condition-**blind** — `primitives.js:73` builds `rowMeans` from the
row alone and nothing in the function sees a condition label — while the ratio multiplies each
condition's replicate noise by a constant. So the expected residue is small, and it is measurable
rather than arguable.

### 2a.1b Measured: near-invariance, not exact invariance

One seed, 6 replicates, both assay labels, at the ladder's two ends.

| assay | transform | cond | σ̂ ratio CV | (d/σ̂) ratio CV | κ at r=1 | κ at r=2.5 | Δκ |
|---|---|---|---:|---:|---:|---:|---:|
| general | `log` | CondA | 2.46e-2 | 2.87e-2 | −0.551126 | −0.555666 | −4.54e-3 |
| general | `log` | CondB | 2.71e-2 | 2.80e-2 | −0.484608 | −0.481789 | +2.82e-3 |
| plate_reader | `raw` | CondA | 6.68e-2 | 7.89e-2 | −0.476130 | −0.537866 | −6.17e-2 |
| plate_reader | `raw` | CondB | 5.49e-2 | 6.09e-2 | −0.417968 | −0.370362 | +4.76e-2 |

**The prediction of an exact rescale is NOT met and should not be quoted as met.** The per-row σ̂
ratio has a CV of 2.5% on the log arm and 5–7% on the raw one, so the move is not a pure constant.
What is met is the consequence: κ shifts by 4.5e-3 (log) and 6e-2 (raw) on a statistic of magnitude
≈ 0.5 — about 1% and 12% respectively. The CV ordering (log < raw) matches the ρ̂ ordering
(general > plate_reader) below, which is an internal corroboration rather than a coincidence.

### 2a.2 The falsifier did not fire

| cell | per-condition ρ̂ (ẑ form) | (observed κ) | pooled ρ̂ (ẑ form) | (observed κ) |
|---|---:|---:|---:|---:|
| general 4rep | 0.985 | 0.992 | 0.395 | **0.421** |
| general 6rep | 0.988 | 0.992 | 0.491 | **0.489** |
| plate_reader 4rep | 0.977 | 0.978 | 0.416 | **0.408** |
| plate_reader 6rep | 0.920 | 0.923 | 0.473 | **0.484** |

The dispatch's falsifier was: if the pooled arm also reads ~0.95, scale invariance is not the
mechanism and the seed is simply dominating everything. **The pooled arm reads 0.41–0.49 against
0.92–0.99 per-condition, on both estimators.** The two arms separate cleanly, so the per-condition
arm's near-unit ρ̂ is the near-invariance 2a.1b measured, not seed dominance. Read from the other
side this is S363's dose-response — the pooled median p falling three orders of magnitude across the
ladder — expressed as a correlation.

Two estimators are reported per arm because they fail differently: the ẑ form is Step 0.4's and is
censored wherever p sits at the floor; the observed-κ form is uncensored and carries no null-side
noise. They agree to within 0.03 everywhere.

### 2a.3 What it costs the programme — reported, not scoped

The per-condition arm is near-invariant to the knob the ladder turns, so **the condition-noise ladder
cannot exercise that arm.** The effective sample behind every per-condition rate in this programme is
**160 blocks**, not 478 units. That bears on P106's disposition and on how a false-positive run would
have to be designed. Neither is scoped here.

---

## Step 2b — the matched-n measurement

### What changed, and what did not

The shipped null batch walks ALL valid rows (`kurtosis.js:176-179`, consumed at `:265`) — 240 — while
the observed per-condition κ walks ONE condition's rows (`:411-418`) — 120. The matched arm passes
the condition's own row set to the same loop. `B = 1999`, the pair set, the 2% trim, the sort, and
the two-sided count about the null median (`:422-425`) are untouched. **One matched null per record,
shared by both of its conditions**, because that is how `simKurts` is shared in the shipped code —
changing the sharing as well as the n would confound the two.

**The pilot gate is not applied on the matched arm, and that is a choice with a stated cost.**
`kurtosis.js:314-325` truncates the null to 50 batches when the pooled observed κ sits inside the
pilot body; a wider matched null makes that gate fire more, which would suppress floored units
mechanically, confounding "matched n calibrates the arm" with "matched n trips a compute
optimisation". On the shipped side it fired on **17 of 240 draws**, carrying 34 condition-units, and
**0 of those units floored** — a truncated null has floor `1/51 = 0.0196` and cannot reach
`ALPHA.FLAG` at all. So the floored-count comparison is unaffected by the choice. The median and
band comparisons are reported over the full set and over the untruncated subset alike; the largest
disagreement between them is 0.018 in the median (`plate_reader` 4rep, 0.3448 against 0.3270) and
1.3 points in the mass below 0.5.

### 2b.0 The anchor

The same loop pointed at the SHIPPED row set, driven by the SHIPPED stream
(`createPRNGFactory(matrix)('Kurtosis')` — the dispatch key at `engine.js:581`, not the result name).
**16 of 16 anchor units reproduce the census byte for byte**, on both assay labels and both replicate
counts, in κ to 4 dp and in `rawP` exactly. A re-implementation that cannot reproduce the thing it
modifies is not measuring the modification; this one can.

Condition-units whose own row count differs from the shared matched null's: **0 of 480**.

### 2b.1 / 2b.2 The test, at ρ̂ re-estimated on the matched output

| cell | matched median rawP | matched `s` | predicted `s`/√2 | ρ̂ matched | obs blocks | exp blocks | dir | tail | ×4 |
|---|---:|---:|---:|---:|---:|---:|:--|---:|---:|
| general 4rep | 0.4860 | **1.0329** | 1.0496 | 0.991 | **0** | 0.05 | below | 0.947 | 1.000 |
| general 6rep | 0.5170 | **0.9607** | 0.9349 | 0.991 | **0** | 0.02 | below | 0.977 | 1.000 |
| plate_reader 4rep | 0.3448 | **1.4008** | 1.3825 | 0.974 | **0** | 0.76 | below | 0.465 | 1.000 |
| plate_reader 6rep | 0.2355 | **1.7588** | 1.7168 | 0.921 | **3** | 2.90 | above | 0.563 | 1.000 |

**The re-fitted `s` lands within 2% of the predicted `s`/√2 in every cell.** That is a second,
independent confirmation of the √2: it is read off the new median rather than off the floor counts,
so it does not depend on the tail at all.

Multiplicity was fixed before the numbers arrived and was not revisited — four cells, Bonferroni ×4,
the same correction Step 0.4 used. Only high-side tails are eligible. **Cells rejecting: none.**

### 2b.3 Every prediction held

Predictions were written to `out-s364b/predictions.json` before `--step2b` would run; `--step2b`
exits 2 without that file, so the ordering is enforced rather than asserted.

| cell | predicted unit rate | measured | predicted blocks of 40 | **measured** | held? |
|---|---:|---:|---:|---:|:--|
| general 4rep | 0.09% | 0.00% | 0.07 | **0** | yes (0.936) |
| general 6rep | 0.02% | 0.00% | 0.02 | **0** | yes (0.984) |
| plate_reader 4rep | 1.05% | 0.00% | 0.69 | **0** | yes (0.499) |
| plate_reader 6rep | 3.80% | 5.83% | 2.62 | **3** | yes (0.491) |

The predicted unit rates reproduce the dispatch's own table (0.09 / 0.02 / 1.05 / 3.80%) to the
quoted precision, which confirms that column was the `s`/√2 residual model and not something else.

**The decisive comparison, answered.** `general` 6rep was predicted at 0.02 blocks — essentially no
floored units at all — while currently holding 3 blocks and rejecting the scale model at ρ̂ and at
ρ = 1. **It goes to 0.** The scale model is not comprehensively wrong for that cell; it is right, and
the Step 0.3b rejection was the n-mismatch.

### 2b.4 The body, not just the spike

| cell | median now | **median matched** | mass < 0.5 now | **matched** |
|---|---:|---:|---:|---:|
| general 4rep | 0.3167 | **0.4860** | 63.33% | **50.83%** |
| general 6rep | 0.3725 | **0.5170** | 59.32% | **47.50%** |
| plate_reader 4rep | 0.1872 | **0.3448** | 67.50% | **60.00%** |
| plate_reader 6rep | 0.1015 | **0.2355** | 80.83% | **71.67%** |

**`general` is calibrated — median 0.486 and 0.517 against a nominal 0.5, mass below 0.5 at 50.8% and
47.5% against 50%.** `plate_reader` is not: its median is still 0.34 and 0.24 and 60–72% of its mass
sits below 0.5. The floor spike is gone from both, but only one of the two bodies came with it.

### 2b.4b The same question without the median fit

Each unit's observed κ standardised against the median and sd of the very null it was ranked
against. Under a correct null this is mean 0, sd 1. A mean away from zero is a mis-**centred**
statistic; an sd above 1 is a null that is too **narrow** — different faults, and `s` cannot separate
them.

| cell | mean z (0 expected) | sd z (1 expected) | matched `s` |
|---|---:|---:|---:|
| general 4rep | −0.109 | **0.935** | 1.033 |
| general 6rep | −0.070 | **1.139** | 0.961 |
| plate_reader 4rep | +0.272 | **1.246** | 1.401 |
| plate_reader 6rep | **+0.970** | **1.607** | 1.759 |

`plate_reader`'s residual is **both** a positive shift and an inflated spread, and both grow with
replicate count. `general`'s centre is right; `general` 6rep's spread is mildly wide (1.14) and it
carries an uncorrected excess in the 0.01–0.05 band (16 units against 5.0 expected under its own
fitted `s`, tail 3.8e-5) — real, but ten times smaller than `plate_reader`'s and nowhere near the
floor. `general` 4rep shows nothing (3 against 6.9). **These band tails are descriptive and
uncorrected; the pre-registered test is the block-level floor test in 2b.2.**

### 2b.5 Sign of the survivors

All **7** surviving floored units carry **κDev ≥ 0** — strictly positive, +0.21 to +0.30. They are
`plate_reader` 6rep CondB on three seeds (6100, 6106, 6118). Part A measured 28 of 30 floored units
stopping at `kurtosis.js:476-477`'s platykurtic filter for exactly this reason; **matching n removes
the units but does not change the direction, so P120's site-A gap is untouched by this step.**

### 2b.6 Where the residual sits

| cell | rung | σ CondA | σ CondB | mean z CondA | mean z CondB | split (B − A) |
|---|---:|---:|---:|---:|---:|---:|
| general 4rep | 1 | 0.250 | 0.250 | −0.095 | −0.115 | −0.020 |
| general 4rep | 1.5 | 0.196 | 0.294 | −0.123 | −0.123 | 0.000 |
| general 4rep | 2.5 | 0.131 | 0.328 | −0.114 | −0.083 | 0.032 |
| general 6rep | 1 | 0.250 | 0.250 | −0.257 | 0.074 | 0.331 |
| general 6rep | 1.5 | 0.196 | 0.294 | −0.271 | 0.113 | 0.384 |
| general 6rep | 2.5 | 0.131 | 0.328 | −0.253 | 0.173 | 0.426 |
| plate_reader 4rep | 1 | 0.250 | 0.250 | 0.303 | 0.239 | −0.064 |
| plate_reader 4rep | 1.5 | 0.196 | 0.294 | 0.137 | 0.376 | 0.240 |
| plate_reader 4rep | 2.5 | 0.131 | 0.328 | 0.031 | 0.544 | 0.513 |
| plate_reader 6rep | 1 | 0.250 | 0.250 | 0.893 | 1.033 | 0.141 |
| plate_reader 6rep | 1.5 | 0.196 | 0.294 | 0.447 | 1.448 | 1.000 |
| plate_reader 6rep | 2.5 | 0.131 | 0.328 | 0.118 | **1.882** | 1.764 |

On `plate_reader` the residual is **monotone in each condition's own noise scale, in both directions
at once**, and CondA at the quietest rung (σ = 0.131) reads 0.118 — essentially calibrated. On
`general` 4rep it is flat across a 2.5-fold σ range. That is a dose-response on σ, and it is the
Step 3 discriminator.

---

## Step 3 — the residual on the untransformed block

**Candidate 2 is consistent with the residual; candidate 1 is not consistent with its absence from
the transformed block, though a small separate footprint that looks like candidate 1 is visible
there.** The simulated null draws Gaussians (`kurtosis.js:269`, `:280`: `simRowBuf[c] = sigR·randn()`),
so a simulated normalised difference is exactly `randn − randn`. On the log arm the *observed*
difference is `σ_cond(z_i − z_j)/σ̂` — Gaussian by construction, matching the null — while on
`plate_reader` no transform runs and the observed difference is a difference of two log-normals at
`sigma = 0.25`, which is heavier-tailed. That predicts a positive bias in the observed κ, present
only on the raw block, **scaling with the condition's own σ and vanishing as σ → 0** — which is
exactly the shape of 2b.6, monotone in both directions with CondA falling to 0.118 at σ = 0.131. It
also predicts growth with replicate count, since the null's sd shrinks as n_obs goes 720 → 1800 while
the systematic excess does not; measured growth (0.27 → 0.97) exceeds the pure √n factor of 1.58, and
the remainder is unmeasured. Candidate 1 — `fitPredictedSigma` fitted on pooled rows and regressing
on the row mean alone — runs identically on both blocks and so cannot by itself produce a residual on
one and none on the other. It does, however, have a plausible small footprint on the log arm: at
rung 1 the two conditions have *identical* σ by construction, yet `general` 6rep still splits by
0.331, and the only structural asymmetry between the conditions there is the planted level shift in
CondB (`effectFrac` 0.20 at `effectFold` 1.5), which can reach the per-condition κ only through the
row-mean regression. **That reading is consistent with, not demonstrated by, the data**, and the
split's absence at 4 replicates is unexplained. No fix is scoped. The measurement that would settle
candidate 2 is to redraw the same matched-n null from the observed replicate residuals instead of
from Gaussians: if `plate_reader`'s residual goes and `general` is unchanged, it is confirmed.

---

## Carried forward

- **P120 on the transformed block is closed by the n-mismatch.** `general` floors zero units at
  matched n, its median is 0.5 and its `s` is 1.0. Nothing is left over there.
- **A residual survives on the untransformed block only** — `plate_reader` 6rep, 7 units in 3 blocks
  (5.83% against a 0.05% nominal), consistent with its own fitted `s` (tail 0.563) and therefore a
  calibration question rather than a model rejection.
- **The ladder cannot exercise the per-condition arm** (2a.2/2a.3): 160 blocks, not 478 units.
- **The four-decimal tie (P107) is unaffected** — the two units it deletes read rawP ≈ 0.49 and would
  not have floored.

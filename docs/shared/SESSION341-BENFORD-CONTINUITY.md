# S341 — DS12b kurtosis re-derivation (Phase A) and the Benford continuity correction (Phase B)

Two independent phases. Phase A landed no source change. Phase B changed two lines.

---

# Phase A — DS12b κDev re-derived in residual space

**READ-ONLY. Nothing fixed.** This is step 1 of the three-step resolution recorded at
`SESSION341-DS08-DS12B-ADJUDICATION.md:261-272`.

## What "residual space" is here

`kurtosis.js` builds, for each row `r` and each replicate pair `(c1, c2)`:

```
residual = (matrix[r][c1] − matrix[r][c2]) / sigma[r]
```

with `sigma` from `fitPredictedSigma(matrix)` when the mean-variance fit is usable
(`kurtosis.js:99-102`), and `trimmedKurtosis` (2% per tail) in place of plain kurtosis whenever
`nR ≥ 200` (`useRobust`, `kurtosis.js:139`). Both slices here are exactly n = 200, so the trim
is active on every measurement below.

**DS12b routes through a log VST** — `detectVST` returns `transform: "log"`, `slope = 2.0025`,
95% CI [1.919, 2.086], "proportional noise → log". So engine-side numbers are log-space; the
independent re-derivation below is raw-space. That accounts for the small offset between them
and for nothing else.

## Measurement — independent re-derivation

Two sigma regimes, because that was the hypothesis under test: **(a) POOLED**, σ fitted on the
whole 400-row matrix as dispatched; **(b) ISOLATED**, σ fitted on the slice alone, which is what
"the Fabricated slice alone" means. Null is a Gaussian residual set at matched σ, matched pair
structure, matched trim, 500 draws.

| slice | σ regime | pooled residual κ | matched Gaussian null | **κDev** |
|---|---|---|---|---|
| Genuine (rows 1–200) | (a) pooled | −0.6390 | −0.6081 | **−0.0309** |
| Genuine (rows 1–200) | (b) isolated | −0.6391 | −0.6081 | **−0.0309** |
| **Fabricated (rows 201–400)** | (a) pooled | −0.7489 | −0.6074 | **−0.1416** |
| **Fabricated (rows 201–400)** | (b) isolated | −0.7491 | −0.6074 | **−0.1417** |

Per-pair κ, all 15 replicate pairs:

- **Fabricated:** −0.793, −0.762, −0.788, −0.720, −0.879, −0.908, −0.643, −0.676, −0.861,
  −0.920, −0.682, −0.756, −0.610, −0.678, −0.737
- **Genuine:** −0.507, −0.620, −0.592, −0.887, −0.612, −0.376, −0.805, −0.666, −0.624,
  −0.766, −0.603, −0.685, −0.648, −0.471, −0.580

Every Fabricated pair is platykurtic and the slice is consistently below Genuine, but the
separation is ≈ 0.11, not ≈ 0.5.

**Pooled σ and isolated σ agree to four decimal places.** The sigma fit is not where the signal
goes. That hypothesis is dead.

## Measurement — the engine's own condition-stratified arm

`stratifyKurtosis` (`kurtosis.js:405-437`) already computes this, and it is on the result object:

| condition | n | κ | κDev | p | flag | `platykurtic` |
|---|---|---|---|---|---|---|
| **Fabricated** | 200 | −0.7090 | **−0.1047** | **0.0040** | **MODERATE** | false |
| Genuine | 200 | −0.6479 | −0.0436 | 0.1965 | LOW | false |

`platykurtic` is false on both because the flag is `condKDev < −EFFECT_SIZE.KURTOSIS_DEV`
(−0.20) and −0.105 does not clear it.

## What the generator predicts

`generate-test-datasets.py:544-567`:

> - Genuine: log-normal multiplicative noise (CV ~18%), κDev ≈ 0 in residual space
> - Fabricated: uniform noise ±40% around the same base, **κDev ≈ -1.2 in residual space**
> …
> - Kurtosis (condition-stratified): **Fabricated κDev << -0.5** [PLAT], Genuine ≈ 0 → MODERATE

Predicted ≈ −1.2, gate-relevant claim ≪ −0.5. Measured −0.105 (engine, log space) to −0.142
(independent, raw space). Genuine's ≈ 0 prediction holds (−0.031 to −0.044).

## Verdict: both, and they are separable

**(1) The design premise failed — a fixture problem.** Two compounding reasons, neither of which
any amount of dispatch repair would fix:

- **The statistic is a difference of two replicates, not one replicate.** A uniform has excess
  kurtosis −1.2; the difference of two i.i.d. uniforms is *triangular*, excess kurtosis −0.6.
  The docstring applies the single-draw value to a pairwise-difference statistic, so the
  prediction is off by a factor of two before anything else happens.
- **The 2% trim removes exactly the mass that carries platykurtosis.** `useRobust` fires at
  n ≥ 200, which both slices are. Trimming pulls the Gaussian null to ≈ −0.607 and the observed
  triangular to ≈ −0.749, collapsing a theoretical ~0.6 gap to a measured ~0.14.

At −0.105 to −0.142 the effect is below `EFFECT_SIZE.KURTOSIS_DEV = 0.20`, so even a perfectly
routed condition-stratified read is gated out. **The fixture cannot produce the detection it was
built to produce, by construction.**

**(2) The dispatched path also loses what little remains — not a fixture problem.** Two distinct
losses, both reproducible:

- **Pooling inverts the sign.** Pooled κ = −0.5674 is *less* platykurtic than either condition
  alone (−0.7090 and −0.6479). Mixing two conditions whose residuals have different scales adds
  kurtosis, so the pooled statistic sits above both components. `kurtDeviation` comes out
  **+0.0369**, `directionalSuppress` (`kurtosis.js:380`) fires on `kurtDeviation >= 0`,
  `esGateMode` reads `"directional (leptokurtic, informational)"`, and the flag is LOW.
  **A pooled verdict can report leptokurtic while every constituent condition is platykurtic.**
  That is general, not DS12b-specific, and it is the finding here worth carrying forward.
- **The condition arm's MODERATE never reaches the verdict.** `condKurtosis[Fabricated].flag`
  is `MODERATE` at p = 0.0040. The test reports LOW. The information is on the result object and
  the tier does not read it.

Consequence split, since the brief asked for it: **(1) is a fixture problem and (2) is not.**
Item (2) would still be true on a fixture whose planted signal was strong enough to matter.

**Nothing fixed. No source change in Phase A.**

---

# Phase B — Benford continuity correction

## The change

Two lines, nothing else. No threshold, count or gate touched.

```js
// src/tests/benford.js:75
- pMAD = madExceedCount / N_SIM_BENFORD;
+ pMAD = (madExceedCount + 1) / (N_SIM_BENFORD + 1);

// src/tests/benford2.js:115
- const pMAD = madExceedCount / N_SIM;
+ const pMAD = (madExceedCount + 1) / (N_SIM + 1);
```

Both `N_SIM = 5000`, so the floor moves from exactly `0` to `1/5001 = 1.9996e-4`.
Phipson & Smyth (2010), cited in the added comments.

## Before → after, every Benford cell in the battery

8 seeds, `s341-seed-hook.mjs`. Ranges shown where seeds differ. Fixtures where both tests are
N/A are omitted.

| fixture | digit | before | after | flag |
|---|---|---|---|---|
| 07-elisa-clean | 1st | 4.340e-2 – 5.120e-2 | 4.359e-2 – 5.139e-2 | LOW → LOW |
| 07-elisa-clean | 2nd | 7.684e-1 – 7.880e-1 | 7.684e-1 – 7.880e-1 | LOW → LOW |
| **08-elisa-fabricated** | **1st** | **0.000e+0** | **2.000e-4** | **HIGH → HIGH** |
| 08-elisa-fabricated | 2nd | 6.892e-1 – 6.976e-1 | 6.893e-1 – 6.977e-1 | LOW → LOW |
| **09-proteomics-clean** | **1st** | **0.000e+0** | **2.000e-4** | LOW → LOW |
| 09-proteomics-clean | 2nd | 3.802e-1 – 3.956e-1 | 3.803e-1 – 3.957e-1 | LOW → LOW |
| 10-proteomics-fabricated | 1st | 4.000e-4 – 1.600e-3 | 5.999e-4 – 1.800e-3 | LOW → LOW |
| **10-proteomics-fabricated** | **2nd** | **0.000e+0 – 2.000e-4** | **2.000e-4 – 3.999e-4** | HIGH → HIGH |
| 11-rnaseq-multicondition | 1st | 1.600e-3 – 3.000e-3 | 1.800e-3 – 3.199e-3 | LOW → LOW |
| **11-rnaseq-multicondition** | **2nd** | **0.000e+0** | **2.000e-4** | HIGH → HIGH |
| 12a-uniform-mixture-clean | 2nd | 6.906e-1 – 7.102e-1 | 6.907e-1 – 7.103e-1 | LOW → LOW |
| 12b-uniform-mixture-fabricated | 2nd | 1.996e-1 – 2.200e-1 | 1.998e-1 – 2.202e-1 | LOW → LOW |
| 20-bimodal-fab | 2nd | 7.120e-2 – 8.260e-2 | 7.139e-2 – 8.278e-2 | LOW → LOW |
| 21-localised-ar | 2nd | 1.326e-1 – 1.456e-1 | 1.328e-1 – 1.458e-1 | LOW → LOW |
| 22-covariance-block | 2nd | 1.042e-1 – 1.166e-1 | 1.044e-1 – 1.168e-1 | LOW → LOW |
| **23-recurrence-null-mixed** | **1st** | **0.000e+0** | **2.000e-4** | HIGH → HIGH |
| **23-recurrence-null-mixed** | **2nd** | **0.000e+0 – 2.000e-4** | **2.000e-4 – 3.999e-4** | HIGH → HIGH |

Every p moved, as expected. **Six Benford cells were emitting exactly `p = 0`** at one or more
seeds, out of 17 that run at all. Re-measured at source after the fix (any cell now sitting exactly
at the `1/5001` floor had k = 0), disambiguated by seed because a bare count is ambiguous and three
different figures were in circulation:

| k = 0 at | cells | which |
|---|---|---|
| **all 8 seeds** | **4** | DS08 1st, DS09 1st, DS11 2nd, DS23 1st |
| **some seeds** | **2** | DS10 2nd (5/8), DS23 2nd (7/8) |
| union (≥1 seed) | **6** | — |

**DS09 is the sharpest illustration and it is a *clean* fixture.** `09-proteomics-clean` was
emitting `p = 0` on first-digit Benford — an assertion of impossibility on a fixture whose
expected severity is 0. It reports LOW only because the `mad < 0.015` Nigrini gate
(`benford.js:89`) fires ahead of the p. The effect-size gate was the only thing standing between
a clean fixture and a maximal-confidence claim.

## Results

**No tier moved. No severity band moved. No non-Benford flag changed at any seed.**

Batch: **26/28**, the same two failures as before the change — `08-elisa-fabricated` and
`12b-uniform-mixture-fabricated`, both undeclared-Regional-Noise entries.

**This tree does not carry the DS08 ground-truth revision.** `test/batch-fixtures.mjs:74-80`
still lists five channels for DS08 with no Regional Noise entry; the newest commits touching
`batch-fixtures.mjs` / `TEST-GROUND-TRUTH.md` are S339-era (`f3f9ffc`, `46af807`). Both batch
failures are therefore pre-existing and neither is a Phase B regression.

**DS08's Benford channel survives — confirmed.** 0 → 2.000e-4, still below `ALPHA.FLAG`, HIGH at
8/8 seeds. `TEST-GROUND-TRUTH.md:28` records *"pMAD≈0 at 0/5000 sims"*; the correct figure is
now **1/5001 ≈ 2.0e-4 at 0/5000 exceedances**. Reported, not edited — Chat's file.

## Two expectations inverted

**1. The HIGH boundary does not move to k ≤ 3. It stays at k ≤ 4.**

| k | before `k/5000` | after `(k+1)/5001` |
|---|---|---|
| 3 | 6.00000e-4 HIGH | 7.99840e-4 HIGH |
| 4 | 8.00000e-4 HIGH | **9.99800e-4 HIGH** |
| 5 | 1.00000e-3 not | 1.19976e-3 not |

`(4+1)/5001 = 9.998e-4`, still under `ALPHA.FLAG`. The MODERATE boundary is likewise unchanged
at k ≤ 49. **No decision boundary moves at all** — which is *why* no tier moved. That outcome is
arithmetic, not luck, and it would have held on any corpus.

**2. No Fisher input set changes, because no Benford cell is aggregate-routed.**

The brief anticipated that groups previously dropped by `aggregation.js:207` (`filter(p > 0)`)
would start being included. **That cannot happen: Benford never reaches the aggregation layer.**
Both tests dispatch directly on the whole matrix — `engine.js:371` `return testBenford(matrix,
rngFor("Benford's Law"))` and `engine.js:380` `return testBenford2(matrix, rngFor("Benford's Law
(2nd Digit)"))` — never wrapped in `aggregatePerGroup`, and both are members of `GLOBAL_TESTS`
(`mechanisms.js`). Measured across all 27 fixtures: **zero Benford results carry
`groupsAssessed`**, so no `fisherDF`, no worst-group arm, no Šidák.

**This corrects my own earlier report.** `SESSION341-HIGH-REACHABILITY-CLASSIFICATION.md` §3.5
lists the aggregation worst-group arm, min-over-sub-units + Šidák, and the Fisher filter as
consumers where a Benford zero would pass through or be dropped. Those rows were reasoned from
`FISHER_EXEMPT` non-membership without checking dispatch. None of the three is ever exercised by
Benford. The zero's only real consumers were the local ladder at `benford.js:90` /
`benford2.js:126` and the returned `pMAD` / `primaryP` fields.

## Gate

| check | result |
|---|---|
| full batch, 27 fixtures | 26/28 — unchanged, both failures pre-existing |
| SEEDS=8 via `s341-seed-hook.mjs` | no tier move, no band move, at any seed |
| non-Benford flags | unchanged at every fixture × seed |
| DS08 Benford HIGH | held, 8/8 |

## Artefacts

| file | note |
|---|---|
| `test/probes/probe-s341-ds12b-kurtosis.mjs` | Phase A. Re-derives residual-space κ per slice under both σ regimes with a matched Gaussian null. |
| `test/probes/probe-s341-benford.mjs` | Phase B before/after. Captures both digits' p, flag and the aggregate fields; `fisherDF` vs `2 × groupsAssessed` is the dropped-group tell. |

Raw dumps under `test/probes/out-s341-benford/` and `out-s341-adjudicate/` are not committed, per
the convention that no probe output directory is tracked.

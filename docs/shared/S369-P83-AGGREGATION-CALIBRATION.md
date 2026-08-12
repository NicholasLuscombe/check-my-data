# `aggregatePerGroup` under correlated groups — measurement record

**S369 · P83 · nothing in `src/` changed.** Every number here comes out of the shipped
`aggregatePerGroup` in `src/analysis/aggregation.js`, driven with synthetic per-group results.
Fisher's combination, the Šidák adjustment, the guard at `:152` and the two-arm maximum at `:221-222`
all run as shipped. The thresholds are imported from `src/constants/thresholds.js` and never retyped:
`ALPHA.FLAG = 0.001`, `ALPHA.NOTE = 0.01`, and `flagFromP` compares strictly.

This record states what the numbers are. What they mean for the register is Chat's to write.

Instrument: `test/probes/probe-s369-aggregate-per-group.mjs`, with `test/probes/s369-arm-flags-hook.mjs`.

---

## 1. What was measured, and why it is four things rather than two

The layer combines its two arms by **maximum** (`aggregation.js:221-222`), so a conservative arm
cannot offset an anti-conservative one. And the Šidák correction is **conditional** on the guard at
`:152`: it engages only when the maximum of the group flags agrees with the maximum of
`flagFromP(group primaryP)`. When the guard fails the arm reverts to a bare uncorrected maximum. Two
different arms wear one name, so four quantities are reported per cell and never merged:

| # | quantity | where it is read |
|---|---|---|
| 1 | Fisher arm's flag | `__s369.fisherFlag` (hook) |
| 2 | group arm's flag, as live | `__s369.groupArmFlag` (hook) |
| 3 | bare maximum | `worstGroupFlagRaw` (shipped, `:384`) |
| 4 | combined, as shipped | `flag` (shipped, `:377`) |

plus the fraction of draws on which the guard held, `multiplicityCorrected` (shipped, `:384`).

Quantity 2 is the corrected arm when the guard held and the bare maximum when it did not — it is
whichever arm the maximum at `:221-222` actually saw. Reading 2 beside 3 is what makes the guard's
effect visible.

The shipped combination was re-checked on every draw: `flag === max(fisherFlag, groupArmFlag)` failed
**0 times in 16,000,000 draws**, and the group arm disagreed with its own guard 0 times.

## 2. The hook, and why one was needed

Three of the four quantities are already published at full precision. The Fisher arm's flag is not,
and it cannot be recovered from what is: `fisherP` ships as `.toFixed(4)` (`:380`) and `fisherChi` as
`.toFixed(2)`, so a decision re-thresholded from either against `ALPHA.FLAG = 0.001` would be taken
off a rounded string.

The whole patch is one added line, applied in memory at load:

```
+ 400:     __s369: { fisherFlag, fisherPExact: fisherP, groupArmFlag },
```

1 line added, 0 removed, 0 modified; 428 lines to 429. Every identifier on it is a local already
computed above it — `fisherFlag` declared `:159` and assigned `:217`, `fisherP` declared `:160` and
assigned `:216`, `groupArmFlag` declared `:150` and assigned `:155`. The insertion sits after the
worst-group spread at `:392-399`, so no group result can clobber it.

**Inertness is measured, not argued.** `--digest` dumps only fields the shipped module already
returns, over 6,000 draws spanning all four group counts, three correlations and both guard branches.
Run with the hook and run without it, the output is byte-identical (md5 `9893b3ed…` both ways).

The same `--digest` proves the scheduling shim inert. `tick()` in `aggregation.js` yields between
groups through `requestAnimationFrame` plus `setTimeout(0)`, and Node clamps `setTimeout(0)` to 1 ms,
which would have put the grid out of reach. The probe's `requestAnimationFrame` calls its callback
immediately with `setTimeout` swapped for a synchronous stand-in for the duration of that callback
only. Against the conventional probe stand-in (`cb => setTimeout(cb, 0)`, which every other probe in
`test/probes/` uses) the digest is byte-identical, and the run takes 75 s instead of 2 s.

## 3. The construction

One-factor equicorrelated standard normals, `z_i = √ρ·u + √(1−ρ)·e_i`, with `u` and every `e_i`
independent standard normal. Exact for ρ ≥ 0.

Converted to p by the two conventions Part 0 found on the real inputs:

- **two-sided**, `p = 2(1 − Φ(|z|))` — Autocorrelation and Runs Test at the per-pair level
- **one-sided**, `p = 1 − Φ(z)` — Regional Noise's and LOESS's permutation scans

Both are exactly Uniform(0,1) marginally, so the two runs differ only in the dependence structure the
correlation induces. Φ is evaluated through the shipped `chiSquaredP` at one degree of freedom,
because `2(1 − Φ(|z|))` is `P(χ²₁ > z²)` identically and that route keeps full relative precision in
the tail where the Abramowitz and Stegun `normalCDF` (absolute error 7.5e-8) does not. Checked
against the shipped `zToP` at nine values of z: worst absolute disagreement 1.4e-7, which is the
approximation's own doubled bound.

The construction's own calibration was measured separately, with the layer taken out: over 2,000,000
draws, `P(p < ALPHA.FLAG)` reads 0.0992% two-sided and 0.1009% one-sided, and
`sidakAdjust(min of m independent p, m) < ALPHA.FLAG` reads within 1.2 standard errors of nominal at
every m.

**Grid.** ρ ∈ {0, 0.1, …, 0.9}. `m` ∈ {2, 3} — the **shipped** range, because Part 0 measured that
every column-grouped fixture carries three groups and every aggregating row-grouped fixture carries
two, and the corpus uses nothing else. `m` ∈ {6, 10} — **counterfactual**, so the shipped range can
be read as a bound rather than as a coincidence. Both p conventions. Both guard branches.

**Depth.** 160 cells at 100,000 draws is 53 seconds, so the ten-minute ceiling never bound. The grid
was run four times at independent seed bases and the cells pooled, giving **400,000 draws per cell**
and 64,000,000 draws in total. Every rate below carries its Monte-Carlo standard error
`√(r(1−r)/N)` in brackets, in the same units.

## 4. Negative control at ρ = 0

Fisher and the Šidák-corrected arm should both sit at nominal, and the bare maximum should not.

Over the 16 control cells (4 group counts × 2 p conventions) at 400,000 draws each, both arms read
nominal at both thresholds, with one exception: the two-sided `m` = 10 group arm read 0.1150% against
0.1000%, z = +3.00. It did not regress across the four seed bases, so it was settled by depth rather
than by repetition. **On its own stream, that exact cell reads 0.1300% at 100,000 draws (z = +3.00)
and 0.1010% at 4,000,000 draws (z = +0.63).** A separate 4,000,000-draw run at a fresh seed reads
0.0997% (z = −0.17). The excursion was sampling in the first 100,000 draws. The control passes.

The bare maximum at ρ = 0, two-sided, against a 0.1% nominal:

| m | 2 | 3 | 6 | 10 |
|---|---|---|---|---|
| bare maximum | 0.198% | 0.306% | 0.604% | 1.002% |

which is `1 − (1 − 0.001)^m` at every group count.

## 5. The guard-held branch — rates at `ALPHA.FLAG` = 0.001, nominal 0.1%

Flags derived from their own p-values, so the guard at `:152` held on 100.0% of draws in every cell.

### two-sided

| m | ρ | Fisher | group arm | bare max | combined |
|---|---|---|---|---|---|
| 2 | 0.0 | 0.095% (0.005) | 0.101% (0.005) | 0.198% (0.007) | 0.148% (0.006) |
| 2 | 0.3 | 0.185% (0.007) | 0.098% (0.005) | 0.198% (0.007) | 0.216% (0.007) |
| 2 | 0.6 | 0.418% (0.010) | 0.086% (0.005) | 0.182% (0.007) | 0.423% (0.010) |
| 2 | 0.9 | 0.838% (0.014) | 0.085% (0.005) | 0.164% (0.006) | 0.838% (0.014) |
| 3 | 0.0 | 0.104% (0.005) | 0.101% (0.005) | 0.306% (0.009) | 0.166% (0.006) |
| 3 | 0.3 | 0.316% (0.009) | 0.103% (0.005) | 0.301% (0.009) | 0.351% (0.009) |
| 3 | 0.6 | 0.979% (0.016) | 0.092% (0.005) | 0.285% (0.008) | 0.981% (0.016) |
| 3 | 0.9 | 1.992% (0.022) | 0.083% (0.005) | 0.218% (0.007) | 1.992% (0.022) |
| 6 | 0.0 | 0.096% (0.005) | 0.097% (0.005) | 0.604% (0.012) | 0.173% (0.007) |
| 6 | 0.9 | 5.542% (0.036) | 0.046% (0.003) | 0.279% (0.008) | 5.542% (0.036) |
| 10 | 0.0 | 0.106% (0.005) | 0.115% (0.005) | 1.002% (0.016) | 0.204% (0.007) |
| 10 | 0.9 | 9.272% (0.046) | 0.043% (0.003) | 0.358% (0.009) | 9.272% (0.046) |

### one-sided

| m | ρ | Fisher | group arm | bare max | combined |
|---|---|---|---|---|---|
| 2 | 0.0 | 0.101% (0.005) | 0.107% (0.005) | 0.206% (0.007) | 0.154% (0.006) |
| 2 | 0.9 | 0.865% (0.015) | 0.082% (0.005) | 0.167% (0.006) | 0.865% (0.015) |
| 3 | 0.0 | 0.097% (0.005) | 0.096% (0.005) | 0.296% (0.009) | 0.156% (0.006) |
| 3 | 0.1 | 0.194% (0.007) | 0.099% (0.005) | 0.299% (0.009) | 0.241% (0.008) |
| 3 | 0.3 | 0.515% (0.011) | 0.100% (0.005) | 0.289% (0.008) | 0.534% (0.012) |
| 3 | 0.6 | 1.242% (0.018) | 0.097% (0.005) | 0.291% (0.009) | 1.244% (0.018) |
| 3 | 0.9 | 2.079% (0.023) | 0.069% (0.004) | 0.201% (0.007) | 2.079% (0.023) |
| 6 | 0.9 | 5.833% (0.037) | 0.054% (0.004) | 0.283% (0.008) | 5.833% (0.037) |
| 10 | 0.1 | 0.872% (0.015) | 0.102% (0.005) | 1.021% (0.016) | 0.923% (0.015) |
| 10 | 0.9 | 9.671% (0.047) | 0.042% (0.003) | 0.346% (0.009) | 9.671% (0.047) |

Full ρ ladders for all four group counts are in `test/probes/out-s369/pooled.json`.

### the same thing at `ALPHA.NOTE` = 0.01, nominal 1.0%, two-sided

| m | ρ | Fisher | group arm | bare max | combined |
|---|---|---|---|---|---|
| 2 | 0.0 | 0.990% (0.016) | 1.006% (0.016) | 1.993% (0.022) | 1.380% (0.018) |
| 2 | 0.9 | 3.263% (0.028) | 0.760% (0.014) | 1.495% (0.019) | 3.263% (0.028) |
| 3 | 0.0 | 1.007% (0.016) | 0.996% (0.016) | 2.950% (0.027) | 1.506% (0.019) |
| 3 | 0.9 | 5.433% (0.036) | 0.657% (0.013) | 1.858% (0.021) | 5.433% (0.036) |

## 6. The guard-failed branch

Group 1 carries a flag one tier above `flagFromP(its own p)`, capped at HIGH — the pair-promotion and
effect-size-gate case the comment at `aggregation.js:133-143` describes.

**Fraction of draws on which the guard held**, two-sided:

| m | ρ = 0.0 | ρ = 0.5 | ρ = 0.9 |
|---|---|---|---|
| 2 | 1.1% | 1.0% | 0.6% |
| 3 | 2.1% | 1.8% | 1.0% |
| 6 | 4.9% | 4.0% | 1.8% |
| 10 | 8.7% | 6.5% | ~3% |

At ρ = 0 that tracks `(m − 1)·ALPHA.NOTE` — the guard holds only when some other group's own p-derived
flag already reaches the promoted tier. It falls as ρ rises, because correlated groups move together.

Rates at `ALPHA.FLAG` = 0.001, two-sided:

| m | ρ | Fisher | group arm | bare max | combined |
|---|---|---|---|---|---|
| 2 | 0.0 | 0.108% (0.005) | 1.016% (0.016) | 1.119% (0.017) | 1.045% (0.016) |
| 2 | 0.9 | 0.839% (0.014) | 0.934% (0.015) | 1.017% (0.016) | 1.165% (0.017) |
| 3 | 0.0 | 0.090% (0.005) | 1.022% (0.016) | 1.225% (0.017) | 1.060% (0.016) |
| 3 | 0.9 | 1.983% (0.022) | 0.883% (0.015) | 1.014% (0.016) | 2.065% (0.022) |
| 10 | 0.0 | 0.101% (0.005) | 1.000% (0.016) | 1.885% (0.022) | 1.079% (0.016) |

At `ALPHA.NOTE` this branch is degenerate by construction: promoting a typically-LOW group one tier
makes it MODERATE, so the bare maximum reads 100.000% in every cell. That is a property of the
construction and carries nothing about ρ. The `ALPHA.FLAG` column above stays informative and is flat
in ρ.

## 7. Medians

Two-sided, guard-held, at 100,000 draws:

| m | ρ | median Fisher p | median Šidák-adjusted p | median smallest group p |
|---|---|---|---|---|
| 2 | 0.0 | 0.498963 | 0.498767 | 0.292022 |
| 2 | 0.9 | 0.593608 | 0.639274 | 0.399396 |
| 3 | 0.0 | 0.498717 | 0.497769 | 0.205121 |

Both medians rise with ρ while the Fisher tail gets heavier. The bare maximum is a maximum over
flags and has no p of its own; the median of the uncorrected smallest group p is given in its place.
The combined flag is a maximum over two flags and has no p at all.

## 8. Pre-registered expectations against outcomes

| prediction | outcome |
|---|---|
| At ρ = 0, Fisher at nominal | Held. 16 control cells, all within 1.6 standard errors after the one outlier was settled by depth. |
| At ρ = 0, Šidák-corrected arm at nominal | Held, same evidence. |
| At ρ = 0, bare maximum near `k` times nominal | Held exactly: 0.198%, 0.306%, 0.604%, 1.002% at m = 2, 3, 6, 10. |
| Fisher rises above nominal as ρ rises | Held, steeply. At the shipped m = 3 it goes 0.104% to 1.992%, twenty times nominal by ρ = 0.9. |
| Šidák-corrected arm falls below nominal as ρ rises | Held, modestly at the shipped counts and more deeply at large ones: m = 3 goes 0.101% to 0.083%; m = 10 goes 0.115% to 0.043%. |
| Bare maximum falls toward nominal as ρ rises | Held in direction, not arrived by ρ = 0.9: m = 10 goes 1.002% to 0.358%, still 3.6 times nominal. |
| Combined above nominal at ρ = 0, between 1× and 2× and much nearer 1× | **Partly disagrees.** Above nominal, yes: 1.48×, 1.66×, 1.73×, 2.04× at m = 2, 3, 6, 10. But it is not near 1×, it climbs with the group count, and at m = 10 it reaches the top of the stated band. The combined rate sits close to the **sum** of the two arm rates, so the two arms rarely fire on the same draw: at m = 3, ρ = 0 the overlap is 0.039% against arm rates of 0.104% and 0.101%, well above what independence would give and well short of the strong dependence the prediction assumed. |

Both directional predictions that P83 turns on held, so the framing does not need rewriting.

Two further readings the grid gives without being asked for them. **Fisher's inflation grows with the
group count**, which is what the counterfactual rungs were there to establish: at ρ = 0.9 the rate is
8.4× nominal at m = 2, 19.9× at m = 3, 55× at m = 6 and 93× at m = 10. And **the p convention
matters at low correlation and not at high**: at m = 10, ρ = 0.1 the one-sided Fisher rate is 0.872%
against the two-sided 0.227%, while at ρ = 0.9 the two read 9.671% and 9.272%.

At ρ ≥ 0.5 the combined column equals the Fisher column to three decimal places at every group count.

## 9. Two source facts, read rather than assumed

**`sidakAdjust` assumes independence across groups.** `primitives.js:262-267` returns
`-Math.expm1(k * Math.log1p(-p))`, which is `1 − (1−p)^k` written to keep relative precision at small
p; the docstring names `k` "number of independent tests the maximum was taken over". Checked against
the literal form at four points — they agree wherever the literal is trustworthy, and the literal
loses all significance at p = 1e-12 where `sidakAdjust` returns 3.000e-12.

**No display component renders `fisherP`.** A `command grep` for `fisherP`, `fisherChi`, `fisherDF`,
`groupMinPAdj`, `multiplicityCorrected` and `worstGroupFlagRaw` across all of `src/` returns hits in
`src/analysis/aggregation.js` only. The four-decimal string is never shown beside a flag computed at
full precision, so P122's shape does not arise here.

## 10. The two-arm maximum is not in P104's census

`aggregation.js:221-222` takes an uncorrected maximum over two arms computed from the same group
p-values, which is the census's own Class A1 definition. The census at `d3d1ee5`
(`docs/shared/S360-EXTREME-STATISTIC-CENSUS.md`, 338 lines) contains **no occurrence of
"aggregation", "Fisher", "worst-group" or "layer"**. Its stated unit is the test — "Every
classification below was read at the test's own source" — and it walks the 29 tests in the battery.
So the answer is **no**, and P104's fourteen is a floor for a site that sits above twelve of those
tests rather than inside any one of them. Recorded, not acted on.

## 11. What this settles and what it does not

It settles whether each arm, and their maximum, is calibrated under a stated equicorrelated
dependence model, and in which direction each one fails.

It does not say what ρ real deposits carry, and it does not say what the fix should be.

It is also not a statement about any caller's shipped false-positive rate. Six tests feed the Fisher
arm, and Part 0 read what each of them publishes as `primaryP`:

| test | `primaryP` | site |
|---|---|---|
| Selective Noise Partitioning | raw Bartlett χ² p, analytic, upper tail | `selectiveNoise.js:263` |
| Regional Noise Homogeneity | one-sided permutation scan p, `(exceed+1)/(B+1)` | `regionalNoise.js:242`, `:173` |
| Autocorrelation | minimum of a BH-FDR-adjusted per-pair family, per-pair p two-sided | `autocorrelation.js:200`, `:98`, `:49` |
| Runs Test | minimum of a BH family minimum, a permutation scan p and a windowed BH minimum | `runs.js:277` |
| LOESS Residual Analysis | minimum over two permutation arms and a pair-promotion arm | `loessResidual.js:451`, `:213-214` |
| Exact Duplicate Detection | minimum of a four-member BH family over exact count nulls | `duplicateDetection.js:809` |

Only one of the six is a continuous analytic p read against its own null. The rest are minima over
families or permutation p-values on a `k/(B+1)` lattice, and what each of those distributions does
under its own null was not measured here. So these numbers describe **the layer**, measured on inputs
that are uniform by construction, and a caller's own rate would additionally carry whatever its
`primaryP` brings with it before correlation is considered.

## 12. Reproducing

```bash
node test/probes/probe-s369-aggregate-per-group.mjs --controls
node test/probes/probe-s369-aggregate-per-group.mjs --uniformity
node --import ./test/probes/s369-arm-flags-hook.mjs test/probes/probe-s369-aggregate-per-group.mjs --hookdiff
DRAWS=100000 node --import ./test/probes/s369-arm-flags-hook.mjs test/probes/probe-s369-aggregate-per-group.mjs --grid
```

The hook's inertness check is `--digest` run twice, once with `--import` and once without, and
`cmp`-ed. `SEEDBASE=<n>` gives an independent replicate of the whole grid; the four bases pooled here
were `0x5336900`, `0xf1b31`, `0x134fd91` and `0x1cd9411`. `CELL="m,rho,side,branch" DRAWS=<n> --cell`
runs one cell to arbitrary depth, which is how the control's outlier was settled.

Output lands in `test/probes/out-s369/`, which is gitignored and does not survive a worktree teardown.
The grid is deterministic given its seed base, so regenerating is safe; it costs 53 seconds per
replicate.

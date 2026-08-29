# S364 part C — P118's residual, closed form

Read-only over `src/`. No batch gate. Nothing in `src/` moved.

Instrument: `test/probes/probe-s364c-closed-form.mjs`.

```bash
node test/probes/probe-s364-promotion-gap.mjs --census            # ~4 min
node test/probes/probe-s364b-matched-n.mjs --predict --step2b     # ~1 min
node test/probes/probe-s364c-closed-form.mjs --verify --stepA --stepB --stepC --stepD
```

`probe-s364b-matched-n.mjs` was extended additively to record the UNTRIMMED null alongside the
trimmed one. Its Step 2 numbers are unchanged — 0 / 0 / 0 / 3 floored blocks, same as recorded.
Output at `test/probes/out-s364c/` (gitignored). The regenerated census reproduces Step 0.4 exactly.

---

## The headline

**The mechanism is closed form and confirmed; the magnitude is not, and the gap has a named cause.**

The log-normal marginal's `γ`, the half-identity, and the scale-mixture factor are all exact and all
verified against simulation. On the **log block the prediction holds** — predicted z 0.03 to 0.17,
measured −0.22 to 0.06, both within a quarter of one null sd of zero. On the **raw block the
prediction fails by over-predicting, badly**: observed/predicted runs 0.03 to 0.33 at 6 replicates
and is indistinguishable from zero at 4, against a stated expectation of "at or just above 1".

The cause is a premise the derivation does not state. `fitPredictedSigma` evaluates the global
mean-variance fit at **the row's own sample mean**, and the fitted slope on a raw block is **2.007**,
so `σ̂_r ∝ m̂_r` — the denominator is built from the very draws in the numerator. Re-standardising
each difference on a denominator that cannot contain it **recovers `γ/2`** (ratio 1.01–1.26 at 6
replicates, against 0.27 for the shipped standardisation).

So P118 is closed-form in mechanism and carries one measured, underived attenuation factor.

---

## Step A — what the ladder actually does

### A1. The generator splits a fixed total; it does not scale one condition

`test/gen-copy-fidelity.mjs:307-308`:

```js
const sigmaA = p.sigma * Math.sqrt(2 / (1 + p.condNoiseRatio * p.condNoiseRatio));
const sigmaB = p.condNoiseRatio * sigmaA;
```

`sigmaA² + sigmaB² = 2σ²` at every ratio (`:211-215` states the intent; `:216-219` records that
`σ/√r`, `σ·√r` was rejected because it lets pooled noise grow with the ratio). These are **log-scale**
sds — `:368-372` builds `e = sigA * zA` and pushes `L + e`; `:377` exponentiates. **So both conditions
move, in opposite directions**: CondA gets quieter, CondB noisier.

**The remaining half of the puzzle — "kurtosis is scale-invariant, so CondA's κ should not move" — is
answered by asking what `condNoiseRatio` is a scale change *of*.** Kurtosis is invariant to rescaling
the values a test analyses. On the **log** block the analysed value is `L + s·z`, so changing `s`
rescales the differences by exactly `s` and κ genuinely cannot move. On the **raw** block the
analysed value is `exp(L + s·z)`, and changing `s` is *not* a rescale — it changes the SHAPE of the
marginal, because a log-normal's excess kurtosis is a function of `s` alone. Both facts were correct;
the missing step was that the axis is a scale change on the log scale and therefore a shape change on
the raw one.

### A2. The realised `s`, measured from the data

Recovers the nominal to within 1.4% at every cell. **The realised/nominal ratio is identical across
the three rungs within a (replicates, condition) cell** — 0.9866 at 4rep CondA at every rung, 0.9995
at 4rep CondB at every rung. That constancy is itself confirmation of the rescale structure: the
generator re-scales one draw set rather than re-drawing (`:351-352`), so the shortfall is that seed
set's own sampling realisation carried through unchanged. At 4 replicates the estimate has 360 df per
draw, so its se over 20 seeds is ~0.8% and a 1.3% shortfall is unremarkable.

### A3. Those figures were z-scores

**The 0.893 → 0.118 and 1.033 → 1.882 numbers are z-scores**, from part B Step 2b.6's
`zVsNull = (κ_obs − median(simKurts)) / sd(simKurts)`. Everything in Step B is in κ, untrimmed; the
conversion happens once, in Step C.

Two offsets have to be carried before any conversion means anything, and both are measured here:

- **The trim.** The shipped statistic is `trimmedKurtosis` at 2% per tail whenever `nR ≥ 200`
  (`kurtosis.js:139`, `:419`). Trimming a Gaussian is strongly platykurtic — the trimmed null median
  is **−0.60**, which is why shipped per-condition κ values sit near −0.5 rather than near 0.
- **The estimator's own bias.** The untrimmed null median is **−0.045 at 4 replicates and −0.025 at
  6**, not 0. The null is Gaussian, so its population excess kurtosis is exactly 0 and all of that is
  finite-sample bias — with an effective sample size set by the number of independent ROWS, not the
  number of values, because the differences within a row share `nC` draws.

---

## Step B — the two checks

### B1. The half-identity

**The dispatch's stated target of 0.5 is not right for the measurable ratio, and the gap is exact
arithmetic rather than a failed identity.** A row's true residuals are not observable — only
`x − rowMean` is. For `e₁..e_n` iid at mean zero with excess kurtosis `γ`, writing
`r_i = a·e_i + b·Σ_{j≠i} e_j` with `a = (n−1)/n`, `b = −1/n` and expanding the fourth moment gives,
exactly,

```
excess kurtosis of the row-centred residual  =  γ · c_n ,
    c_n = ((n−1)³ + 1) / ((n−1)·n²)     c_4 = 0.583333,  c_6 = 0.700000,  c_n → 1
```

The pairwise **difference** is untouched, because the row mean cancels in `x_i − x_j`. So the naive
ratio is predicted `1/(2c_n)` — **0.857 at 4 replicates and 0.714 at 6** — and 0.5 is recovered only
after dividing the residual side by `c_n`. (The same `c_n` also governs a leave-one-out residual;
the two constructions coincide.)

A ratio of two near-zero quantities is not a test, so only the rows with a genuinely leptokurtic
marginal can carry it — the log block has `γ = 0` by construction and the raw 4-replicate rows have
all |κ| under 0.14. On the **5 rows where the test is defined the ratio runs 0.640 to 0.752** —
tight, consistent, and materially below 1.

**The premise that fails is not the one that was named.** "Replicates independent given the row" is
true by construction (`gen-copy-fidelity.mjs:366-372` draws each replicate from its own `randn()`).
What fails is unstated: that the standardisation is independent of the values being standardised.
Measured fitted mean-variance slope, recomputed exactly as `primitives.js:75-86` fits it:
**`log` block 0.039, `raw` block 2.007.** At slope 2, `σ̂_r ∝ m̂_r`, so a row containing a large value
gets a larger denominator, which damps exactly the tail the kurtosis is measuring. At slope 0, `σ̂` is
near-constant and the coupling does not arise — which is why the log block is untouched.

### B2. The log-normal prediction

`γ = e^{4s²} + 2e^{3s²} + 3e^{2s²} − 6` from the realised `s`; `R` from the σ̂ distribution;
`κ_pred = R(γ/2 + 3) − 3`. No fitted parameter. Observed κ is the mean over 20 seeds with its own
standard error, so "does it match" is settled by arithmetic.

**Log block — HOLDS.** `κ_pred = 3(R − 1)` runs 0.004 to 0.033; observed −0.068 to −0.017; largest
|z| against the prediction 2.9, and once the estimator bias is handled in Step C both sides sit within
0.3 of each other. A log transform of log-normal data gives normal marginals and the closed form says
κ should be zero to the extent the standardisation is perfect. It is. This was the sharper half and
the mechanism survives it.

**Raw block — FAILS, by over-predicting.** Observed/predicted runs −0.20 to 0.33, mean 0.117; largest
|z| **16.3**. `κ_pred` rises from 0.16 to 1.08 across the ladder, tracking each condition's own `s`
exactly as the mechanism says — but the observed κ rises far less. **`R` is 1.00–1.02 everywhere and
carries nothing.** The stated expectation was observed/predicted at or just above 1 with `R` carrying
the excess; the miss is in the opposite direction and is not a magnitude that can be absorbed.

### B2b. The same differences, on a denominator that cannot contain them

Each difference divided by the mean of the row's OTHER columns — independent of both values in the
numerator, everything else unchanged.

| block | replicates | shipped κ / (γ/2) | **leave-two-out κ / (γ/2)** |
|---|---:|---:|---:|
| raw | 4 | −0.042 | 1.392 |
| raw | 6 | **0.273** | **1.200** |

**Removing the coupling recovers `γ/2`.** The closed form is right about the marginal; the shipped
statistic does not measure that marginal. The leave-two-out estimate sits slightly above 1 and more so
at 4 replicates (1.39) than at 6 (1.20), which is the predicted direction — the leave-two-out
denominator is itself noisy (2 values at 4 replicates, 4 at 6) and that noise adds scale-mixture
variance. So the residual overshoot is the diagnostic's own cost, not an unexplained term.

---

## Step C — reconciliation

Converted with the null's **empirical** median and sd from `simKurts`, not `√(24/n)`.

**One correction to the conversion, and it is not cosmetic.** `κ_pred` is a population quantity and
carries no estimator bias; the observed κ and the null both do, and it cancels in `z_obs`. So the
matching predicted z is `κ_pred / sd`, not `(κ_pred − median)/sd` — the naive form double-counts the
bias. Both are reported.

- **Log block:** predicted z 0.031 to 0.166, measured −0.218 to 0.059; largest gap 0.30. Consistent,
  and both within a quarter of one null sd of zero.
- **Raw block:** predicted z 0.89 to 7.56, measured 0.05 to 2.68; largest gap 4.99. **The
  disagreement is not in the null's spread** — the sd is measured, and the trimmed column reproduces
  part B Step 2b.6 exactly. It is B2's gap carried through unchanged, which is what a consistency
  check should do.

The trimmed null sits at −0.60 against the untrimmed −0.03, so **the trim is the larger of the two
offsets by more than an order of magnitude.**

---

## Step D — what is left

P118's residual on the untransformed block is the log-normal marginal's excess kurtosis meeting a
Gaussian null, arriving heavily damped by a factor this work measures but does not derive. The
mechanism is closed form and confirmed: `γ` is exact, the half-identity is exact, and removing the
coupling recovers `γ/2` to within 20% at 6 replicates. What is not closed form is the damping — the
shipped statistic retains **0.273 of `γ/2` at 6 replicates and nothing measurable at 4** (−0.042).
That replicate dependence is the right sign and shape for the coupling, since each value carries
weight `1/nC` in the mean it is divided by. It also accounts for part B's otherwise unexplained
observation that the `plate_reader` residual **grew** with replicate count (mean z 0.27 at 4, 0.97 at
6): that growth is the coupling weakening as `nC` rises, not the null's sd shrinking. The unexplained
term is one attenuation factor, measured at 0.27 at 6 replicates and 0 at 4. No fix is scoped and no
threshold is proposed.

---

## The closed forms, checked against simulation

Run before any of them touched the data (`--verify`).

| form | setting | closed form | simulation |
|---|---|---:|---:|
| log-normal γ | s = 0.25 | 1.09593 | 1.11202 |
| log-normal γ | s = 0.5 | 5.89845 | 5.76104 |
| half-identity γ/2 | s = 0.25 | 0.54797 | 0.53858 |
| half-identity γ/2 | s = 0.5 | 2.94922 | 2.98109 |
| row-centring γ·c_n | n = 4, s = 0.5 | 3.44076 | 3.46430 |
| row-centring γ·c_n | n = 6, s = 0.5 | 4.12891 | 4.15795 |
| scale mixture R(γ/2+3)−3 | sd(log τ) = 0.4, R = 1.960 | 3.95283 | 3.95649 |

**The scale-mixture form needs a MEAN-ZERO component and fails silently without one.** A first draft
of the check used `τ·exp(sz)`, whose mean is `e^{s²/2}`, and read 5.96 against a predicted 4.99 — the
form was right and the check was wrong. The shipped statistic pools pairwise differences and
row-centred residuals, both exactly mean zero, so the application is sound; the trap is only in
checking it.

---

## Register rows moved from STATUS, S392

STATUS is gitignored and has no git history, so a register row is the only copy of
whatever it holds. These bodies are moved here verbatim; the register row keeps its
claim and points at this section.

### P124 — **the normaliser is computed from the values it normalises**

open. `fitPredictedSigma` recovers a mean-variance slope of **2.007 on raw and 0.039 on log** — constant-CV, correctly fitted — which makes `σ̂_r ∝ m̂_r`, and the row mean is built from the same replicates being differenced. **Dividing a difference by a denominator containing its own terms compresses the tails.** Cleaning the denominator recovers γ/2 at 1.20 and 1.39 against 0.27 and −0.04 shipped. **Same defect as the dead *s*-gate: an estimator contaminated by the thing it measures.** Scope unknown — needs a census of every `fitPredictedSigma` caller, because nothing establishes this is confined to one test. `docs/shared/S364C-CLOSED-FORM.md`, `9429c55` **Callers measured at S364 close: three — Kurtosis (`kurtosis.js:99`), LOESS (`loessResidual.js:294`) and Regional Noise (`regionalNoise.js:41`).** `primitives.js:65`'s docstring says "Kurtosis, Regional Noise, RSC" and is **wrong in both directions** — RSC does not call it and LOESS is missing, so a census started from the docstring would chase a non-caller and miss a caller. ~~**Stale comment is a `src/` edit and Code owns it; it is owed and needs a dispatch.**~~ **Discharged — superseded by this row's own tail (S367):** at `9c4f563` the docstring reads "Kurtosis, LOESS Residual, Regional Noise" and a caller grep returns exactly those three. Verified at source. **Two of the three carry existing adjudications on DS12b** — LOESS as the positive control, Regional Noise as the measured false positive. **Exposure measured at S365 and the three callers split three ways.** Kurtosis is exposed and verdict-bearing: its statistic is self-normalised and its fit-branch null is not, because `:269` draws `sigR·randn()` and `:272` divides by the same `sigR`, cancelling to `z₁ − z₂`. **LOESS is not exposed at all** — `predSigma` feeds only the `expectedNoise` and `ratio` display columns, no statistic and no p, so the positive-control question dissolves rather than resolving. **Regional Noise is exposed but null-matched**, since its permutation shuffles whole rows and carries the standardisation error into the null, so the cost is power and not calibration — and **P124 therefore does not explain its DS12b false positive**, because a compression cannot manufacture a positive. **22 of 25 fixtures sit on the unmatched branch.** The docstring is corrected at `9c4f563`

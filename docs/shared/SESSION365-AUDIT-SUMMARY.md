# Session 365 — audit summary

Dispatch 1: P124 exposure census for `fitPredictedSigma`, folded with the `primitives.js`
docstring correction.

- Worktree `s365-p124-census`, branch `claude/s365-p124-census`, based on `9429c55`.
- Parts A and B are a source read. Part C is the only edit: one comment line in
  `src/stats/primitives.js`.

---

## Part A — the caller census, re-derived from source

Taken from `command grep -rn 'fitPredictedSigma'` across the whole worktree, not from
`STATUS.md` and not from the docstring.

### Definition site

`src/stats/primitives.js:71`. The docstring occupies lines 64–70, quoted verbatim as it
stood before Part C:

```
/** Predicted σ from log-log mean-variance fit.
 *  Shared by Kurtosis, Regional Noise, RSC. Fits log(variance) ~ slope × log(mean)
 *  across rows, returns per-row predicted σ.
 *  @param {Array<Array<?number>>} matrix - Numeric matrix (null = missing)
 *  @returns {{sigma: Array<?number>, used: boolean, rowMeans: Array<?number>}}
 *    sigma[r] = predicted σ for row r (null if unavailable). used = true if fit covers ≥50% rows.
 *  @see METHODOLOGY.md §"Mean-Variance Relationship" */
```

The definition is at line **71**, not 65. Line 65 is the caller-list line itself, which is
what the dispatch's "docstring near `primitives.js:65`" was pointing at — that number is
right for the thing being corrected.

### Imports — three, all in `src/tests/`

| file | line |
|---|---|
| `src/tests/kurtosis.js` | `:1` |
| `src/tests/loessResidual.js` | `:1` |
| `src/tests/regionalNoise.js` | `:1` |

### Call sites — three in `src/`

| file | line | call |
|---|---|---|
| `src/tests/kurtosis.js` | `:99` | `fitPredictedSigma(matrix)` — destructures `sigma`, `used` |
| `src/tests/loessResidual.js` | `:294` | `fitPredictedSigma(matrix)` — destructures `sigma` only |
| `src/tests/regionalNoise.js` | `:41` | `fitPredictedSigma(matrix)` — destructures `sigma`, `used`, `rowMeans` |

### Test-only consumers — four probes, no shipped path

`test/probes/probe-s341-ds12b-kurtosis.mjs`, `probe-s363-kurtosis-dose.mjs`,
`probe-s364-promotion-gap.mjs`, `probe-s364b-matched-n.mjs` and
`probe-s364c-closed-form.mjs` import it directly to re-derive the shipped arithmetic.
They are diagnostic re-implementations, not callers of the engine path, and are excluded
from the census count.

### Verdict against Chat's claim

**Confirmed in every particular.** Three callers, and all three line numbers match exactly:
`kurtosis.js:99`, `loessResidual.js:294`, `regionalNoise.js:41`. The docstring at
`primitives.js:65` named `Kurtosis, Regional Noise, RSC` — so it named a non-caller
(Residual Spike Correlation, which imports nothing from this helper) and omitted a caller
(LOESS). Wrong in both directions, as predicted.

Checkpoint 1 therefore clears and Part C is licensed.

---

## Part B — the exposure read

### The shared mechanism, stated once

`primitives.js:73` builds each row's mean from **every** non-null value in that row:

```js
const rowMeans = matrix.map(row => { const v = row.filter(x => x != null); return v.length >= 2 ? mean(v) : null; });
```

`primitives.js:91` then evaluates the global fit at that row's own mean:

```js
const pv = Math.exp(intercept + slope * Math.log(rowMeans[r]));
```

So `σ̂_r` is a function of row *r*'s own values. Any numerator built from those same values
is divided by a denominator that moved with it. On a fit with slope *b*, `σ̂_r ∝ m̂_r^{b/2}`,
so the coupling scales with `|b|` and with `1/nC` — each value carries weight `1/nC` in the
mean it is divided by.

**But sharing the helper is not carrying the defect.** What decides exposure is whether the
test's *null* reproduces the coupling. All three callers are answered below on that axis.

---

### Caller 1 — Excess Kurtosis (`kurtosis.js:99`) — **EXPOSED, verdict-bearing**

**1. Numerator.** `kurtosis.js:113` — `d = matrix[r][c1] − matrix[r][c2]`, the raw difference
between two replicate columns of row *r*. Normalised at `:116` as `nd = d / sigma[r]` and
accumulated into `histDiffs`, whose (trimmed) kurtosis at `:140` is the pooled statistic.
The per-condition arm at `:413-414` differences the same values through the same `sigma[r]`.

**2. Denominator.** One fit over the whole matrix the test was handed (`:99`). Every row with
`m > 0` and `v > 0` enters the regression (`primitives.js:79`); the predictor for row *i*'s
numerator is row *i*'s own mean. The fit is condition-blind — it regresses on the row mean
only, with no condition term.

**3. Same values?** **Yes.** `primitives.js:73` is the deciding line: the mean is taken over
`row.filter(x => x != null)`, which includes columns `c1` and `c2` — the two values being
differenced. There is no leave-out.

**4. Path taken.** Fit path on 22 of the 25 fixtures where the test runs; per-row-SD fallback
on 1; a per-group split on 2. Table below.

**5. Direction — compresses, and the null does not follow it.** This is the finding of the
part. Kurtosis's null has two branches and they behave oppositely:

- **Predicted-σ branch (`:264-274`).** Simulates `simRowBuf[c] = sigR * randn()` at `:269`,
  then divides by **`sigR` again** at `:272`. The same constant cancels exactly, so a
  simulated normalised difference is precisely `randn − randn` — carrying **zero** coupling
  between numerator and denominator. The observed statistic is self-normalised; the null is
  not. The comparison is unmatched, and the direction is compression: a row that happens to
  produce a large `d` also pulls `m̂_r` up, which pulls `σ̂_r` up, which shrinks `d/σ̂_r`.
- **Per-row-SD branch (`:275-292`).** Simulates the row, then recomputes `simSD` from **that
  simulated row's own `nC` draws** (`:281-286`) and divides by it at `:290`. The null
  reproduces the self-normalisation exactly, so the contamination largely cancels in the
  *p*-value.

**This inverts the dispatch's stated framing.** Per-row SD is indeed the tighter coupling as
a *statistic* — a shorter radius, exactly as the dispatch says. But it is the branch whose
null follows it there. The fit path is the one where the null stays clean while the statistic
does not, so it is the fit path that carries the defect. A fallback is not an escape from the
coupling; on this test it is an escape from the *mismatch*, which is what the *p*-value reads.

Magnitude is already measured, on the S364 generator rather than the corpus: re-standardising
each difference on the mean of the row's **other** columns recovers `γ/2` at 1.20 (6 rep) and
1.39 (4 rep), against 0.27 and −0.04 for the shipped standardisation
(`docs/shared/S364C-CLOSED-FORM.md`). Compression, and severe.

**Against Chat's prediction: holds.** The exposed statistic reads conservative.

---

### Caller 2 — LOESS Residual Analysis (`loessResidual.js:294`) — **NOT EXPOSED at the verdict**

**1. Numerator.** None that reaches a verdict. The call sits at `:294`, inside a block gated
on `(cusumP < 0.05 || flag === "HIGH" || flag === "MODERATE") && cpIdx >= 0`. Every quantity
in that condition is already final: `scanP` and `cusumP` are computed at `:213-214`,
`combinedP` at `:225`, and `flag` at `:227`. **The test's entire verdict is settled 67 lines
before the helper is called.**

**2. Denominator.** `predSigma` is consumed at exactly one place — `:329-335` — where it
becomes the `expectedNoise` and `ratio` columns of the `regionComparison` evidence table
(`:344-345`). It feeds no statistic, no permutation loop, no *p*-value and no flag.

**3. Same values?** At the display level, yes — `:328` pushes `ys[ii]` (row *r*'s mean
absolute inter-replicate difference) and `:329-330` pushes `predSigma[validRows[ii]]` for the
same row. But the ratio is formed on **region means** of both (`:332-334`), aggregating over
a hundred-plus rows, so the per-row coupling is averaged down rather than accumulated. It is
a second-order effect on a column that carries no decision.

**4. Path taken.** The gate opens on only **4 of 27 fixtures** — DS08, DS10, DS12b and DS17 —
and takes the fit path on all four. On the other 23 the helper is never called at all.

**5. Direction.** Not applicable to any verdict. **"This caller is not exposed" is the whole
answer**, and the dispatch's follow-on question dissolves rather than resolving: DS12b's LOESS
detection did not happen "despite" the defect, because the defect is not on the path that
produced it. The detection is untouched by P124 in either direction, so it neither
strengthens nor weakens as a positive control on this axis.

Two source notes recorded, not fixed. LOESS is the one caller that **ignores `used`** — it
destructures `sigma` alone at `:294`. When the fit declines, `sigma` is all-null,
`regionExpected` stays empty, and `:333-334` falls through to `globalMeanNoise`. That is a
third fallback path, distinct from the per-row-SD one the dispatch describes, and it makes
`ratio` a self-comparison (region mean noise over global mean noise) rather than an
observed-against-predicted one — while the column is still labelled `expectedNoise`.

---

### Caller 3 — Regional Noise Homogeneity (`regionalNoise.js:41`) — **exposed input, null-matched, conservative**

**1. Numerator.** `regionalNoise.js:67` — `(v − mu)` for every cell of the row, where
`mu = rowMeansArr[r]`. Not a difference of two replicates but a row-centred residual, and
`mu` is the same row mean the denominator is built from. This caller is coupled on **both**
terms.

**2. Denominator.** `rowSigma[r]`, assembled at `:42-49` from the same single whole-matrix fit.
Unlike Kurtosis, the choice is **per row, not per matrix**: `:44` takes the predicted σ only
`if (usePredicted && predictedSigma[r])`, and any row failing that takes its own SD at `:47`.
So one run can mix both denominators across rows. Kurtosis's `:102` is all-or-nothing.

**3. Same values?** **Yes, twice over.** The deciding line is `regionalNoise.js:67`:

```js
return matrix[r].map(v => v != null ? (v - mu) / sig : 0);
```

`v` is inside `mu`, and `mu` determines `sig`.

**4. Path taken.** Fit path on 18 of the 21 fixtures where the test runs; per-row-SD fallback
on 1; per-group split on 2.

**5. Direction — compresses, but the null carries the same contamination, so it costs power
rather than calibration.** The permutation null at `:155-157` shuffles **whole rows** of the
residual matrix:

```js
for (let i = 0; i < idx.length; i++) shuffled[i] = residuals[idx[i]];
```

Each row travels into the null with its own standardisation error intact, and the scan
statistic is a window-versus-global variance ratio *within a column* (`:125`, `:163`) with
`globalColVars` held fixed across observed and permuted passes — correct, since a row shuffle
cannot change a column's global variance. Under row exchangeability the null therefore
reproduces whatever row-to-row scale heterogeneity the standardisation introduced. The
*p*-value is calibrated against the contamination rather than biased by it.

What the contamination does cost is **power**: mis-estimated `σ̂_r` inflates the row-to-row
spread that goes into `globalColVars`, so a genuine local anomaly is a smaller ratio.
Conservative, in agreement with Chat's prediction.

**Consequence for the DS12b reading, stated plainly: this axis does not explain Regional
Noise's adjudicated false positive on DS12b.** A compression cannot manufacture a positive.
Whatever produced that firing, P124 is not it — and CLAUDE.md already carries a separate,
measured mechanism for Regional Noise as Pooled Dependence instance 5, where pooling
manufactures signal rather than suppressing it. The dispatch's "the same reading applies"
does not carry across.

---

### Question 4 in full — measured, all 27 fixtures

Instrument: a load-time source hook on `src/stats/primitives.js` that wraps
`fitPredictedSigma` with a recorder and leaves the arithmetic untouched, driven by a probe
mirroring `validate-batch.mjs`'s fixture-loading block exactly. Both files were written to
the session scratchpad, not to `test/probes/`, so the worktree stays clean for Part C's
one-file pass condition. The hook throws if the definition anchor has moved.

**Cross-check, not assumption:** Regional Noise publishes `usedPredictedSigma` at
`regionalNoise.js:241`. The hook's record agrees with that published field on **21 of 21**
fixtures where the test runs, 0 mismatches. The attribution is evidenced, not inferred.

`fit` = predicted σ used; `fallback` = `used === false`, caller drops to per-row SD;
`split n/m` = column-grouped fixture where `aggregatePerGroup` makes one call per group and
only *n* of *m* groups got a usable fit.

| fixture | VST | condCtx | Kurtosis | LOESS | Regional Noise |
|---|---|---|---|---|---|
| 01-densitometry-clean | log | column-grouped/3 | split 1/3 | — | split 1/3 |
| 02-densitometry-fabricated | log | column-grouped/3 | split 1/3 | — | split 1/3 |
| 03-qpcr-clean | raw | row-grouped/2 | fit | — | fit |
| 04-qpcr-fabricated | raw | row-grouped/2 | fit | — | fit |
| 05-cellcount-clean | anscombe | none | fit | — | fit |
| 06-cellcount-fabricated | anscombe | none | fit | — | fit |
| 07-elisa-clean | log | none | fit | — | fit |
| 08-elisa-fabricated | log | none | fit | **fit** | fit |
| 09-proteomics-clean | log | row-grouped/2 | fit | — | fit |
| 10-proteomics-fabricated | log | row-grouped/2 | fit | **fit** | fit |
| 11-rnaseq-multicondition | log | row-grouped/3 | fit | — | (N/A) |
| 12a-uniform-mixture-clean | log | row-grouped/2 | fit | — | fit |
| 12b-uniform-mixture-fabricated | log | row-grouped/2 | fit | **fit** | fit |
| 13-vfstest-cellcountest | anscombe | none | fit | — | fit |
| 14-crctest-survey | anscombe | none | (N/A) | (N/A) | (N/A) |
| 15-missing-carlisle | log | row-grouped/2 | fit | — | fit |
| 16-densitometry-carlisle-overbalanced | log | column-grouped/3 | fit ×3 | — | fit ×3 |
| 17-densitometry-carlisle-clean | log | column-grouped/3 | fit ×3 | **fit ×1** | fit ×3 |
| 19-inheritance-fabricated | raw | row-grouped/2 | (N/A) | (N/A) | (N/A) |
| 20-bimodal-fab | raw | row-grouped/2 | **fallback** | — | **fallback** |
| 21-localised-ar | raw | row-grouped/2 | fit | — | fit |
| 22-covariance-block | raw | row-grouped/2 | fit | — | fit |
| 23-recurrence-null-mixed | log | none | fit | — | fit |
| 24-recurrence-null-control | raw | none | fit | — | fit |
| vfs-a-pigeonhole-clear | raw | none | fit | — | (N/A) |
| vfs-b-recurrence-high | raw | none | fit | — | (N/A) |
| vfs-c-deeptail-high | raw | none | fit | — | (N/A) |

Totals: **Kurtosis** calls it on 25 fixtures — fit 22, fallback 1, split 2. **LOESS** on 4,
all fit. **Regional Noise** on 21 — fit 18, fallback 1, split 2.

Three readings worth carrying:

- **The corpus is overwhelmingly on the exposed path.** For Kurtosis, the branch whose null
  does not match the statistic is taken on 22 of 25 fixtures. The matched branch is reached
  on one.
- **The two `used === false` causes are different and the table conflates them.** DS20's fit
  was computed (slope −0.069 recovers cleanly) and simply failed the ≥50% row-coverage rule
  at `primitives.js:95`. DS01 and DS02's two failing column groups returned at
  `primitives.js:82` with fewer than 5 usable points and an all-null `sigma` — no fit
  existed at all. Both surface as the same boolean.
- **Kurtosis and Regional Noise see byte-identical inputs wherever both run** — same shapes,
  same recovered slopes, same `used` — because both dispatch through `runPairVST` and share
  `useAggregate`. LOESS diverges only because its call is gated behind a verdict.

---

## Part C — the docstring correction

One line, `src/stats/primitives.js:65`:

```diff
- *  Shared by Kurtosis, Regional Noise, RSC. Fits log(variance) ~ slope × log(mean)
+ *  Shared by Kurtosis, LOESS Residual, Regional Noise. Fits log(variance) ~ slope × log(mean)
```

Pass condition met and checked on the `src/` diff in isolation before this summary was
written: one file changed, one comment line, zero logic lines.

**The fork was taken as the dispatch leaned — no P124 reference in the comment.** The reason
is the one the dispatch gives and it holds on inspection: P124 lives only in `STATUS.md`,
which is gitignored and carries no history, so a `src/` comment citing it points at something
no reader of the repository can resolve. That is the P79/P80 shape — a dangling arrow planted
fresh in tracked source. The docstring now names what a reader can verify with one grep, and
stops.

---

## Observations recorded, not acted on

Ownership of all three is Chat's; none was edited.

1. **The docstring's `used` clause is still incomplete.** `used = true if fit covers ≥50% rows`
   describes `primitives.js:95` but not the earlier return at `:82`, where fewer than 5 usable
   points returns `used: false` with an all-null `sigma`. Both DS01 and DS02 hit the second
   path, not the first. Left alone as outside the requested change.
2. **`fitPredictedSigma` runs on already-log-transformed matrices, and its positivity guards
   then bite.** `primitives.js:79` requires `m > 0` and `:90` requires `rowMeans[r] > 0`. On a
   log-VST matrix those are tests on log-scale means, so rows whose values are mostly below 1
   are silently excluded from a `log(variance) ~ log(mean)` regression. This is the mechanism
   behind DS01 and DS02's two empty column groups. Whether regressing log-variance on
   log-of-a-log-mean is intended is a methodology question, not a defect I can settle here.
3. **`loessResidual.js:344` labels a self-comparison `expectedNoise`** when the fit is
   unavailable, per the `:333-334` fall-through described above.

---

## Verification

- Base `9429c55`; worktree `s365-p124-census` on `claude/s365-p124-census`.
- Part C diff verified in isolation before the summary was added: 1 file, 1 comment line,
  0 logic lines.
- Full batch, `node test/validate-batch.mjs`, **seed offset 0** — see the session state block
  for the recorded result.
- No preview step. A docstring has no rendering surface, so `dev.sh` would verify nothing.
- `promote.sh` not run; the worktree lock belongs to this session.

---

# Dispatch 2 — the P118 / P124 structural falsifier (Part A)

Base for this part: branch `claude/s365-p124-census` at `9c4f563`, cut from `9429c55`; main had
moved to `e8553b5` with three Chat-owned docs, disjoint from anything here.

**Line numbers re-located by symbol before use, all still where Dispatch 1 reported them:**
`fitPredictedSigma` at `primitives.js:71` (docstring `:64-70`, `:65` carrying Dispatch 1's edit),
`kurtosis.js:99` the call, `:102` the branch select. Nothing moved.

## The design, and one confound added to it

Five arms, all at seed offset 0, each a full engine run over all 27 fixtures, σ̂ perturbed by a
load-time source hook on `primitives.js` with zero `src/` diff:

| arm | σ̂ factor | uniform? | power of two? |
|---|---|---|---|
| `none` | 1 | — | — |
| `global2` | × 2 | yes | **yes** |
| `global4` | × 4 | yes | **yes** |
| `global3` | × 3 | yes | **no** |
| `slope05` | × m_r^0.25 | **no** | no |

`global3` and `global4` are mine, not the dispatch's. The dispatch's two arms confound two
properties: `global2` is uniform **and** a power of two, `slope05` is row-differential **and** not a
power of two. Without an arm that is uniform-but-not-a-power-of-two, a divergence under `slope05`
cannot be attributed to row-differentiality. That turned out to decide the result.

`slope05` is exact rather than approximate: σ̂_r = exp((a + b·log m_r)/2), so b → b + 0.5 multiplies
σ̂_r by m_r^0.25. No refit. Applied only where `sigma[r]` is non-null, which by `primitives.js:90` is
exactly where `rowMeans[r] > 0`, and the hook throws if any perturbed value leaves the
positive-finite domain. It never did.

## Shape controls — the comparison is like for like

Measured on all 33 Kurtosis calls (28 fit-branch, 5 per-row-SD), across all five arms:

- **retained-row count differs on 0 units.** Invariant by construction — `kurtosis.js:178` filters on
  `sigma[r] && sigma[r] > 0`, which no positive rescale can change — and confirmed rather than assumed.
- **simulation count differs on 0 units.** Values seen: 1999, and 50 on the one unit where the
  `:314` pilot gate fires (`16-densitometry-carlisle-overbalanced#3`). The gate fired identically in
  every arm.

This control was load-bearing: the pilot gate reads `pooledKurtosis`, so a moving observed statistic
could have truncated one arm's null and not another's. It didn't.

## Result — the falsifier fired, and then a control arm changed what it means

Against the dispatch's stated predictions:

| | predicted `simKurts` | measured | predicted observed κ | measured |
|---|---|---|---|---|
| `global2` | byte-identical | **byte-identical, 28/28** ✓ | unchanged | **unchanged, 28/28** ✓ |
| `slope05` | byte-identical | **DIFFERS, 28/28** ✗ | moves | **moves, 28/28** ✓ |

The control arms locate the failure:

| arm | `simKurts` identical | observed κ unchanged | max abs Δ in `simKurts` |
|---|---|---|---|
| `global2` (×2) | **28/28** | 28/28 | 0 |
| `global4` (×4) | **28/28** | 28/28 | 0 |
| `global3` (×3) | **0/28** | 1/28 | 7.105e-15 |
| `slope05` | **0/28** | 0/28 | 7.105e-15 |

**A uniform ×3 breaks byte-identity exactly as thoroughly as the row-differential arm, and by the
same absolute magnitude.** So the discriminator is not uniformity — it is whether the scale factor is
representable as a power of two.

**Reading.** The algebraic cancellation at `kurtosis.js:269 → :272` is exact:
`(σ·z₁ − σ·z₂)/σ = z₁ − z₂` in real arithmetic. In IEEE-754 it is exact **only when σ is a power of
two**, because then the multiply and the divide shift the exponent and leave the mantissa alone. For
any other factor each operation rounds, and the residue is a handful of ulps — max |Δ| 7.105e-15 on
values of order 0.5 to 5, across every differing arm and unit. The largest *relative* figures
(3.3e-10) sit on units whose `simKurts` are near zero, where a fixed absolute residue divides small.

**So σ̂ does not leak into the null in any statistically meaningful sense, and the strict prediction
of byte-identity is still false.** Byte-identity is a property of the scale factor's binary
representation, not of the estimator. Part B's framing survives on substance; the sentence "`simKurts`
is invariant to any positive rescaling of σ̂" needs "up to floating-point rounding" and cannot be
demonstrated by a ×2 arm alone, because ×2 is the one case where the rounding vanishes.

One curiosity, not a finding: `11-rnaseq-multicondition` is the single fit unit whose observed κ came
out bit-for-bit unchanged under `global3` — 1500 rows × 4 columns, and the trimmed kurtosis happened
to land on the same double.

## The larger result — the Anderson–Darling arm has the same mismatch, and it is not scale-invariant

Chasing an anomaly in the control: **`primaryP` moved on 9 of the 25 fixtures where Kurtosis runs
under `global2` and `global4`** — arms where both `simKurts` and observed κ are byte-identical. That
cannot come from the kurtosis arm.

It is the A-D arm. `kurtosis.js:367` reads `pooledP = nC <= 3 ? adP : kurtP`, and:

- the observed A² at `:160` tests `histDiffs` against a **fixed** N(0, √2) (`:63`, `:151`,
  `Math.SQRT2`), so it is **not scale-invariant** — rescaling every normalised difference by a
  constant moves it;
- the null `simADs` at `:306` is computed from `batchBuf`, which on the fit branch is the
  σ̂-invariant `z₁ − z₂`.

So the A-D arm carries a **stronger** form of the P124 mismatch than the kurtosis arm: the null cannot
see σ̂ at all, while the observed statistic is calibrated against an absolute scale that σ̂ sets.

Prediction stated and tested: *a uniform rescale moves `primaryP` iff `nC ≤ 3`*. **9 of 9 `nC ≤ 3`
fixtures moved; 0 of 16 `nC > 3` fixtures moved.** The movements are not marginal:

| fixture | nC | p unperturbed | p at σ̂ × 2 | p at σ̂ × 4 |
|---|---|---|---|---|
| 04-qpcr-fabricated | 3 | 0.0005 | 0.859 | 0.9955 |
| 08-elisa-fabricated | 3 | 0.0005 | 0.7525 | 0.999 |
| 23-recurrence-null-mixed | 3 | 0.0005 | 0.4635 | 0.999 |
| 24-recurrence-null-control | 3 | 0.004 | 0.9995 | 1 |
| vfs-a-pigeonhole-clear | 2 | 0.0005 | 0.485 | 0.999 |
| vfs-b-recurrence-high | 2 | 0.0005 | 0.4595 | 0.9935 |
| vfs-c-deeptail-high | 2 | 0.0005 | 0.0015 | 0.99 |
| 03-qpcr-clean | 3 | 0.21 | 0.998 | 1 |
| 07-elisa-clean | 3 | 0.023 | 0.9635 | 1 |

**No flag moved under any arm — 0 of 27, on all five.** This is a p-level effect on this corpus, not a
verdict-level one, and the reason is the directional and effect-size suppression downstream. That
bounds the consequence; it does not soften the mismatch.

## Falsifier verdict

The dispatch asked: if `simKurts` moves, find the line. It moves, and the line is
**`kurtosis.js:272`** — but what it demonstrates is a floating-point rounding residue of ~1 ulp, not a
path by which σ̂ carries information into the null. Read strictly the prediction is falsified; read as
a claim about the null's information content it is confirmed, with the power-of-two caveat now
measured rather than assumed. **The genuinely new result is the A-D arm at `:367` / `:160`, where a
uniform rescale of σ̂ takes a p from 0.0005 to 0.9955 on a fixture the battery is supposed to catch.**

## Appendix

### 1. `docs/paper/` — the STATUS pending item is REAL, not phantom

**The file exists.** `docs/paper/PAPER-REALWORLD-RESULTS-DRAFT.md`, 84 lines, 16,992 bytes, tracked,
clean against the index in the main checkout and present in both worktrees.

- Added at **`682512c`** ("docs: S294 corpus results, provenance, paper outline + results draft;
  METHODOLOGY §1.1 correction"), modified at **`39ff312`**.
- `git log --all --diff-filter=A -- 'docs/paper/*'` returns that one commit; no other path ever
  carried it.
- `docs/paper/` also holds `PAPER-STRUCTURE-OUTLINE.md`.

The "path reports as empty" observation does not reproduce — I hit the same wrong answer once by
truncating `ls -la` with `head -3`, which shows only `.` and `..`, and the `total 64` line is the tell
that files follow.

The item's content checks out too. The draft carries the citations at its own line 62 —
`METHODOLOGY §1.1 lines 283–285` and `line 343` — and STATUS's diagnosis is accurate: §1.1 is now
`METHODOLOGY-TESTS.md:60`, and `:283-285` there is a permutation p-value formula, not branch routing.
The three-citation pending item stands as written.

### 2. `CLAUDE.md:92` reworded

Direction point kept — same arithmetic, opposite consequence, and the standing instruction to say
which way it ran. Instance numbers dropped. The line now points at `METHODOLOGY.md` §Pooled Dependence
as the authority for numbering and records that an earlier version of the note assigned one and was
wrong. Gitignored, main-resident, not committed.

### 3. `code-version-check-98b673` — contains nothing

Read before any disposition, per the rule against inferring "scratch" from a filename.

- Branch `claude/code-version-check-98b673` at `9429c55`, an ancestor of main.
- `git log main..HEAD` is **empty** — zero commits of its own.
- `git status --short` is **empty** — no modifications, no untracked files.
- `git status --ignored` lists six entries: `CLAUDE.md`, `STATUS.md`, `BANKED.md`,
  `project-instructions.md`, `docs/sessions` — **all five are symlinks into the main checkout**, created
  by the SessionStart hook — plus `.claude/settings.local.json`, which is byte-identical to main's.

It is a bare checkout with nothing unique in it. **Not removed**, per the dispatch.

## Verification (Dispatch 2)

- **`git diff --stat -- src/` returns empty.** Nothing entered `src/` in this part; the perturbations
  are a load-time source hook in the session scratchpad.
- **Batch: N/A**, correctly — no `src/` change to regress.
- Probe, hook and comparison scripts live in the session scratchpad, not `test/probes/`.
- No preview step — no rendering surface.
- `promote.sh` not run, nothing pushed.

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

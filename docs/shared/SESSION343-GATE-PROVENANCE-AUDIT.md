# S343 Part B — Gate constants and permutation arithmetic

Read-only audit. Nothing under `src/` changed.

Two parts. **Part 2** below settles the permutation arithmetic — a documented floor that a measurement
contradicted. **Part 1**, the gate-constant provenance census, follows in its own section.

---

## 0. State read

Run from the main checkout at session open:

```
$ git log -1 --oneline
95a2808 Merge claude/proteomics-seed-derivation-32ee6c: S343: which seed 09-proteomics-clean derives, and what it does there

$ git worktree list
/Users/hedgehog/Projects/check-my-data  95a2808 [main]

$ git status --short
 M docs/shared/V1X-FUTURE-WORK.md
```

S343 promoted at `95a2808`, confirmed by reading rather than by trusting the dispatch. The pending
Chat edit to `docs/shared/V1X-FUTURE-WORK.md` is present and was not touched. No worktree existed at
open; this session created `claude/gate-provenance-s343b` before its first write, guarded on `pwd` and
`git branch --show-current`, and both files below were staged by name.

The whole audit ran on reads plus `node` invocations that create nothing. The one probe needed — a
load-time hook that records `bhFDR` call shapes — lives in the session scratchpad, outside the
repository.

---

# Part 2 — Permutation arithmetic

## The inversion, first

**Chat's expectation 5 is wrong.** Cross-Condition Consistency's Stage-1 p is **two-sided, with the
doubling** — `src/tests/crossConditionConsistency.js:526-528`:

```js
const pUpper = (1 + nUpper) / (B + 1);
const pLower = (1 + nLower) / (B + 1);
u.p2 = Math.min(1, 2 * Math.min(pUpper, pLower));
```

Stage 1 runs BH-FDR over exactly this value (`:567`). The KS-is-a-distance reasoning does not apply,
because the code never counts a single tail on D. It counts both tails of D's permutation distribution
and doubles the smaller. METHODOLOGY's `2m/(B+1)` formula therefore uses the right construction for
this test.

**And the documented row is still wrong.** The error sits one line further on, and it is more general
than one-sidedness would have been.

---

## 2.1 What is actually wrong with the floor

`METHODOLOGY.md` §"Permutation-Test Arithmetic Constraints" says:

> After BH-FDR correction at rank 1 across `m` units, the most significant unit's adjusted p is
> `p_min × m / 1`. … No more significant adjusted p-value is achievable regardless of how strong the
> forensic signal is.

`bhFDR` (`src/stats/primitives.js:235-247`) is a **step-up that takes a running minimum from the
largest rank downward**:

```js
for (let r = n - 1; r >= 0; r--) {
  const raw = indexed[r].p * n / (r + 1);
  minAdj = Math.min(minAdj, raw);
  adj[indexed[r].i] = Math.min(minAdj, 1);
}
```

So a family's smallest adjusted p is `min over r of (p_(r) · m / r)`, not `p_(1) · m`. When several
units sit at the raw floor, the rank-r term is smaller than the rank-1 term. With all `m` units at the
floor the minimum is exactly `p_min`, with no `m` factor left in it.

**The true floor on a family's minimum adjusted p is `c / (B + 1)`, and it does not depend on `m` at
all** — where `c = 2` for a doubled two-sided p and `c = 1` otherwise.

The doc's claim is not merely loose. It is anti-monotone in the thing it claims to bound: a stronger
forensic signal puts *more* units at the floor, which *lowers* the achievable adjusted p. The sentence
"regardless of how strong the forensic signal is" states the opposite of the behaviour.

### Measured, not inferred

`09-proteomics-clean`, Cross-Condition Consistency, B = 499, m = 3 — at the derived PRNG offset and at
a flagging one:

```
offset 0   primaryP 0.012  LOW
   stage 1  Trimmed span (5–95%)   adjP 0.024
   stage 1  Dispersion (MAD)       adjP 0.204
   stage 1  CDF shape (KS)         adjP 0.012

offset 3   primaryP 0.006  MODERATE
   stage 1  Trimmed span (5–95%)   adjP 0.006
   stage 1  Dispersion (MAD)       adjP 0.132
   stage 1  CDF shape (KS)         adjP 0.006
```

The raw two-sided floor is `2/500 = 0.004`. At offset 0 one unit reaches it, so rank 1 gives
`3 × 0.004 = 0.012`. At offset 3 **two** units reach it, so rank 2 gives `(3/2) × 0.004 = 0.006`, and
the step-up carries that value down to rank 1. Both reported numbers are exactly the step-up
arithmetic.

**The measurement is right and the doc is wrong.** MODERATE is reachable at B = 499, m = 3. It needs
two units at the floor rather than one.

### A correction to the S343 report

`docs/shared/SESSION343-AUDIT-SUMMARY.md` §3.1 stated the mechanism as "adjusted p = 3 × (k+1)/500, so
the grid is {0.006, 0.012}". The two observed values are right and every measured number in that
report stands, but the derivation was wrong: it assumed a one-sided raw p and a fixed rank-1
multiplier. The real grid is `(m/j) × 2(1+k)/(B+1)`. That section has been corrected in place.

---

## 2.2 The two arithmetic comments — both hold, and one is bigger than it looks

**`src/tests/kurtosis.js:167`** — `const N_SIM = 1999; // p-value floor = 1/2000 = 0.0005 — allows
FLAGGED (p < 0.001)`.

The code matches. `kurtP` (`:347`) and `adP` (`:359`) are both `(nExceed + 1) / (length + 1)` with no
doubling, and the corpus harvest below observed a raw p of exactly `0.0005`. The early-exit path sets
`kurtP = 1.0` explicitly (`:342`) rather than dividing by a short denominator, so the stated floor
holds on every live path. `git blame`: `9fc631d`, 2026-05-07, **"Initial commit"** — this reasoning
shipped with the first version of the repository.

**`src/tests/columnGof.js:36-48`** — B raised from 999 to 2000 so the floor `2/2001 = 0.00099950`
clears the 0.001 HIGH threshold. The code matches: `:195` is `Math.min(1, Math.min(pLow, pHigh) * 2)`,
and the harvest observed a raw p of exactly `0.0009995002498750624`. `git blame`: `cc20392d`,
2026-07-30 — **this is S339, as Chat guessed.** From its commit message:

> "…two counters that start at 1 and a two-sided doubling put its smallest raw p at 2/(1+B) = 0.002 at
> B = 999… On DS20 the driving column sits at **BH rank 2 of 7, giving 0.007**…"

**S339 computed the rank-2 step-up explicitly.** `0.002 × 7/2 = 0.007` is precisely the arithmetic
METHODOLOGY's `p_min × m / 1` omits. This is not an oversight nobody could have caught. The codebase
already knew, in a commit message, the fact the doc still gets wrong.

**Stated as a rule, or as a one-off?** A one-off, both times. Neither comment generalises, neither
points at the other, and neither points at METHODOLOGY. Chat's reading is right: the reasoning has
been applied twice, case by case, and never written down as a rule.

---

## 2.3 Census of permutation tests, built from source

METHODOLOGY names seven tests as sharing the constraint. The battery has thirteen p-constructions on a
resampling null. Six of the seven it names are one-sided. Two tests that genuinely are two-sided are
not in its list at all.

| test | construction | `file:line` | sided |
|---|---|---|---|
| Constant-Offset Blocks | `(k+1)/(B+1)` | `constantOffset.js:240, 243` | one |
| Regional Noise Homogeneity | `(k+1)/(B+1)` | `regionalNoise.js:173, 176` | one |
| Windowed Autocorrelation | `(k+1)/(B+1)` on `abs(r) ≥ abs(r_obs)` | `windowedAutocorrelation.js:140` | one tail, folded statistic |
| Windowed ICC (IRC scan) | `(k+1)/(B+1)` | `interReplicateCorrelation.js:263` | one |
| LOESS Residual Analysis | `(k+1)/(B+1)`, three families | `loessResidual.js:161, 213, 214` | one |
| Residual Spike Correlation | `(k+1)/(B+1)` | `residualSpikeCorrelation.js:171` | one |
| Runs Test (windowed scan) | `(k+1)/(B+1)` | `runs.js:247` | one |
| Blocked Mahalanobis | `(k+1)/(B+1)`, two passes | `blockedMahalanobis.js:588, 589` | one |
| Excess Kurtosis (simulation) | `(k+1)/(B+1)` on `abs(dev) ≥ abs(dev_obs)` | `kurtosis.js:347, 359` | one tail, folded statistic |
| Benford first / second digit | `(k+1)/(B+1)` on MAD | `benford.js:79`, `benford2.js:117` | one |
| **Cross-Condition Consistency** | `min(1, 2·min(p_up, p_low))` | `crossConditionConsistency.js:528` | **two, doubled** |
| **Entropy / Zipf Analysis** | `min(1, min(pLow, pHigh)·2)` | `entropyTest.js:103` | **two, doubled** |
| **Column Goodness-of-Fit** | `min(1, min(pLow, pHigh)·2)` | `columnGof.js:195` | **two, doubled** |

A folded statistic is two-sided in intent and correctly implemented as a single tail on the folded
value. No doubling applies to it, and adding one would be wrong.

Four things match a shuffle grep but are not permutation tests — their p is analytic: Autocorrelation
(`zToP`, `autocorrelation.js:49`), Row-Mean Runs (`zToP`, `rowMeanRuns.js:80`), Within-Row Variance
(`normalCDF`, `withinRowVariance.js:236`), and Inter-Replicate Correlation's *per-pair* p (`zToP`,
`interReplicateCorrelation.js:117`). Only IRC's windowed scan is permutation-based.

### Where `B` comes from

| test | `B` | source | `file:line` |
|---|---|---|---|
| Constant-Offset Blocks | 999 / 499 / 199 at `nR` ≤ 1000 / ≤ 10000 / more | row count | `constantOffset.js:173` |
| Regional Noise | 4999 / 499 at valid rows ≤ 100 | row count | `regionalNoise.js:148` |
| LOESS (scan, segment) | 4999 / 499 at rows ≤ 100 | row count | `loessResidual.js:179, 146` |
| LOESS (per-pair) | 499 | fixed, no stated basis | `loessResidual.js:357` |
| Windowed Autocorrelation | 999 / 499 / 199 at `nR` ≤ 500 / ≤ 5000 / more | row count | `windowedAutocorrelation.js:87` |
| Windowed ICC (IRC scan) | 999 / 499 / 199 at `maxN` ≤ 100 / ≤ 1000 / more | row count | `interReplicateCorrelation.js:244` |
| Runs (windowed scan) | 999 / 499 / 199 at `maxN` ≤ 100 / ≤ 1000 / more | row count | `runs.js:224` |
| Blocked Mahalanobis | 4999 / 999 at `maxN` ≤ 500 | row count | `blockedMahalanobis.js:510` |
| Cross-Condition Consistency | 999 / 499 / 199 at `maxN` ≤ 1000 / ≤ 10000 / more | row count | `crossConditionConsistency.js:167` |
| **Excess Kurtosis** | **1999** | **the threshold — floor 1/2000 clears 0.001** | `kurtosis.js:167` |
| **Column Goodness-of-Fit** | **2000** | **the threshold — floor 2/2001 clears 0.001** | `columnGof.js:48` |
| Entropy / Zipf | 999 | fixed, no stated basis | `entropyTest.js:37` |
| Residual Spike Correlation | 999 | fixed, no stated basis | `residualSpikeCorrelation.js:113` |
| Benford first / second | 5000 | fixed, no stated basis | `benford.js:56`, `benford2.js:88` |

Eight take a row-count rule. Two are derived from the threshold they have to resolve. Four are bare
constants with no stated basis for the value.

### `m`, harvested from the corpus

`bhFDR` was instrumented at load time to record every call's family size and raw-p floor, attributed
by stack frame, then all 27 CSV fixtures were run. `m` reaches far beyond anything METHODOLOGY's table
contemplates:

| BH call site | what `m` counts | `m` seen across the corpus | smallest raw p seen |
|---|---|---|---|
| `constantOffset.js:244` | column pairs | 1, 3, 6, 15, 21, 22, 26, 28 | 0.001 = 1/1000 |
| `regionalNoise.js:177` | columns | 3, 4, 6, 7, 8 | 0.0018 |
| `windowedAutocorrelation.js:189` | pair × window units | 5 … **298** (15 distinct) | 0.001 = 1/1000 |
| `interReplicateCorrelation.js:143` | replicate pairs | 1 … 56 | 5.7e-5 (analytic branch) |
| `loessResidual.js:436` | column pairs | 1, 3, 6, 15, 21, 28 | 0.002 |
| `blockedMahalanobis.js:593` | pass × condition | 2, 4, 6 | 0.0002 = 1/5000 |
| `runs.js:259` | windows | 22 … **4208** (20 distinct) | 0.0005 |
| `kurtosis.js:498` | conditions | 2, 3 | 0.0005 = 1/2000 |
| `crossConditionConsistency.js:567` (stage 1) | pair × pool property | 3, 9 | 0.002 = 2/1000 |
| `crossConditionConsistency.js:571` (stage 2) | pair × residual property | 2, 3, 9 | 0.004 |
| `crossConditionConsistency.js:575` (stage 3) | pair × mvslope property | 1, 3 | 0.018 |
| `entropyTest.js:128` | columns | 1 … 18 | 0.002 = 2/1000 |
| `columnGof.js:224` | columns | 1 … 18 | 0.00099950 = 2/2001 |

Every observed floor matches its own construction: one-sided sites bottom out at `1/(B+1)`, doubled
sites at `2/(B+1)`. That is independent confirmation of the sided column in the table above — measured
rather than read.

### METHODOLOGY's table, row by row

No row holds as written. The doc's number is the rank-1 value; the reachable family minimum has no `m`
in it.

| B | m | doc floor | true family-min, two-sided | true family-min, one-sided | holds? |
|---|---|---|---|---|---|
| 999 | 1 | 0.002 | 0.002 | 0.001 | only for a doubled test at m = 1 |
| 999 | 3 | 0.006 | 0.002 | 0.001 | **no** |
| 999 | 9 | 0.018 | 0.002 | 0.001 | **no** — doc says MOD unreachable; HIGH is nearly reachable |
| 999 | 27 | 0.054 | 0.002 | 0.001 | **no** |
| 499 | 3 | 0.012 | 0.004 | 0.002 | **no** — this is the measured cell |
| 199 | 3 | 0.030 | 0.010 | 0.005 | **no** |

The framing sentence is wrong twice over. "This constraint is shared by every permutation test in the
battery", over a list of seven: six of those seven are one-sided, so their floor is half what the doc
states, and two genuinely doubled tests are missing from the list.

**Chat's expectation 6 holds, and understates it.** The doc understates reachability across the board
— by a factor of 2 on the one-sided tests, and by a factor of `m` on every test with more than one
unit in a family.

---

## 2.4 Coarseness

A discrete null puts p-values on a grid. The reportable adjusted p moves by `(m / j) × c / (B + 1)`
when one exceedance count changes, where `j` is the rank the family minimum comes from. Best case
`j = m` gives `c/(B+1)`; worst case `j = 1` gives `c·m/(B+1)`. The CCC figure on `09-proteomics-clean`
is the `j = 2` case: `(3/2) × 2/500 = 0.006`, a ratio of 0.6 against `ALPHA.NOTE`.

Below roughly 0.1 the discreteness is immaterial. At or above 1 a single exceedance count decides the
verdict.

| test | step ÷ `ALPHA.NOTE` (0.01) | step ÷ `ALPHA.FLAG` (0.001) |
|---|---|---|
| Benford first / second digit | 0.02 | 0.2 |
| Excess Kurtosis | 0.05 – 0.1 | 0.5 – 2 |
| Residual Spike Correlation | 0.10 | 1.0 |
| Windowed ICC (IRC scan) | 0.10 – 0.5 | 1.0 – 5 |
| Blocked Mahalanobis | 0.02 – 0.6 | 0.2 – 6 |
| Regional Noise | 0.02 – 1.6 | 0.2 – 16 |
| Column Goodness-of-Fit | 0.10 – 1.8 | 1.0 – 18 |
| Entropy / Zipf | 0.20 – 3.6 | 2.0 – 36 |
| LOESS Residual Analysis | 0.02 – 5.6 | 0.2 – 56 |
| **Cross-Condition Consistency** | **0.20 – 9.0** | 2.0 – 90 |
| Constant-Offset Blocks | 0.10 – 14.0 | 1.0 – 140 |
| **Windowed Autocorrelation** | **0.10 – 149** | 1.0 – 1490 |
| **Runs Test (windowed scan)** | **0.10 – 2104** | 1.0 – 21040 |

Read the low end of each range as the best case and the high end as the worst. Only Benford and Excess
Kurtosis stay under 0.1 at `ALPHA.NOTE` in every case. Every other test can, on some corpus fixture,
land where one exceedance count decides the tier. Runs and Windowed Autocorrelation get there by
carrying very large families — which is also why the doc's `m`-multiplied floor, had anyone applied
it, would have declared both permanently LOW.

**Reported, not acted on.** No value is proposed here and none should move on the strength of this
table.

---

## 2.5 `B_min_for_HIGH`

`B_min_for_HIGH = 2000·m − 1` appears **only in `METHODOLOGY.md`**. It is not implemented anywhere
under `src/` — the two `2000` matches there are row labels in `modality.js`'s diptest table.

Its principle — choose `B` from the threshold it must resolve — is implemented twice, at
`kurtosis.js:167` and `columnGof.js:48`. Column GoF's carries the doubling correctly (`2/2001`).
Kurtosis's correctly omits it (`1/2000`), because that test is one-sided. Neither uses the `m` factor,
and on the step-up finding above, neither should have.

**Chat's expectation 7 inverts at those two sites.** `B` is not set from row count everywhere: eight
tests take a row-count rule, four take a bare constant with no stated basis, and two take it from the
threshold.

---

## A limitation that bounds Part 1

`git blame` on `kurtosis.js:167` returns `9fc631d`, 2026-05-07, **"Initial commit"** — the repository
root, with 813 commits after it. All 26 lines of METHODOLOGY's permutation-arithmetic section blame
there too, which is why a section labelled v0.8 has no revision history behind it. The repository was
initialised with both already in place.

**Any constant untouched since the root commit has no recoverable provenance from git.** For those,
Part 1's class assignment rests on the comment and the value alone, and where neither settles it the
honest answer is *unknown*. Part 1 reports the count of root-commit constants as a census statistic
rather than guessing behind it.

---

## Part 2 summary against Chat's expectations

| # | expectation | verdict |
|---|---|---|
| 5 | CCC's Stage-1 p is one-sided, so METHODOLOGY's floor row is wrong and MODERATE is reachable | **Half wrong, and the wrong half is the mechanism.** The p is two-sided with the doubling (`crossConditionConsistency.js:526-528`). The conclusion is right — the row is wrong and MODERATE is reachable — but because BH's step-up removes the `m` factor, not because of one-sidedness. |
| 6 | most permutation tests are one-sided too, so the doc understates reachability across the board | **Correct, and it understates the size.** Ten of thirteen are one-sided. The doc is out by a factor of 2 on those and by a factor of `m` on every multi-unit family. |
| 7 | `B` is set from row count everywhere, never from the thresholds it must resolve | **Inverts at two sites.** `kurtosis.js:167` and `columnGof.js:48` both derive `B` from the 0.001 threshold, and both write the derivation down. |

---

# Part 1 — Gate-constant provenance census

*To follow in this session.*

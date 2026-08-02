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

S342 measured that removing every effect-size gate sends five of eight clean fixtures to a non-clean
verdict. The gates carry the tool's specificity, so every gate constant is load-bearing — and nobody
can currently say where one came from. A threshold cited to a source is defensible in a paper; one
picked while watching the 27 fixtures it is then evaluated on is fitting, and the paper cannot claim
otherwise. This census asks, per constant, which it is.

## The finding that governs the rest: git cannot answer the question

**53 of the 73 named numeric constants under `src/tests/` were last set by `9fc631d`, "Initial
commit", 2026-05-07** — the repository root, with 813 commits after it. So were **all seven** entries
of `ALPHA` and `EFFECT_SIZE` in `src/constants/thresholds.js`, and **every one** of the `N >= 500`
sites.

The tool's entire shared threshold layer and its whole sample-size-minimum family predate the recorded
history. There is no commit to read, no session to attribute, no message stating a basis.

**And 53 is a lower bound, not a count.** `git blame` reports the last line-touch, not the last value
change, so any refactor that moves a constant resets its provenance. `withinRowVariance.js:11`
(`Z_THRESH = 4.0`) blames to `b9bcd73`, "Display fixes: within-row variance threshold from constant…"
— but that commit's diff is `-  const Z_THRESH = 4.0;` / `+export const Z_THRESH = 4.0;`. The line
moved; the value did not. Its real origin is the root commit. Every hoisted constant hides the same
way, and nothing separates them without reading each diff.

**This is why most constants land in class D — not as a judgement about them, but because the evidence
that would place them elsewhere does not exist.** Chat's expectation 1 is correct, and the reason is
measurable rather than asserted.

---

## Scope and the count

**70 in-scope constants**, where in-scope means changing the value could change whether a flag fires
or what tier it takes. The dispatch's rule fires at 50: what follows is a complete inventory, a
classification of the part that is established, and an explicit statement of where it stops.

| source | count |
|---|---|
| named constants in `src/tests/` | 44 |
| `ALPHA` (2) + `EFFECT_SIZE` (5) in `thresholds.js` | 7 |
| inline `N >= 500` sites | 10 |
| inline effect-size partners to those gates | 5 |
| Benford applicability + conformity literals | 3 |
| kurtosis adaptive-threshold terms (`1.96`, `24`) | 2 |
| **total** | **~70** |

**Out of scope — 29 named constants.** Caps, tolerances and window geometry, where changing the value
alters cost or presentation rather than a verdict: `WIN` (×5), `PERM_CHUNK` (×2), `DETAILS_CAP` (×2),
`BLOCK_SCAN_LIMIT` (×2), `STRIDE`, `MIN_SEG`, `TOL`, `CV_EPS`, `CLIP_LO`, `CLIP_HI`, `HIST_CAP`,
`BIN_SIZE`, `N_PILOT`, `EARLY_EXIT_BURN_IN`, `MAX_IT`, `PARTIAL_ROW_MAX_OPS`, and the six
`MAX_*_PAIRS` / `MAX_SIM_ROWS` subsample caps.

**Residual list, unclassified.** The six subsample caps are the honest borderline —
`MAX_SIM_PAIRS = 30` and its siblings thin the null, so they can move a p. They are excluded here as
iteration caps and flagged rather than classified.

**Where this stops.** Classified in full: Table 2 (all 6), the `N >= 500` family (all 10 sites), the
kurtosis threshold (all 3 terms), every constant carrying a stated basis (7), and the 14 resampling
counts already done in Part 2. That is **40 of 70**. The remaining 30 are inventoried below with file
and line but not individually classified. On the root-commit evidence above the great majority are D
by default, and saying so thirty times would restate one finding rather than add thirty.

---

## Table 2 — alpha and tier boundaries (complete)

| constant | value | `file:line` | feeds | class |
|---|---|---|---|---|
| `ALPHA.FLAG` | 0.001 | `thresholds.js:23` | every test, via `flagFromP` | **C** — conventional, no basis specific to this application |
| `ALPHA.NOTE` | 0.01 | `thresholds.js:24` | every test, via `flagFromP` | **C** |
| `ALPHA_BIN` | 0.01 | `mahalanobis.js:148` | Mahalanobis dataset-level binomial | **C** |
| `ROW_ALPHA` | 0.001 | `mahalanobis.js:161` | Mahalanobis Stage-2 per-row BH | **C** |
| `PAIR_CORROB_ALPHA` | 0.05 | `autocorrelation.js:14` | lag-2–5 promotion corroboration | **C** |
| `P_FLOOR` | 0.001 | `modality.js:68` | modality p floor | **B** — comment derives it as the pre-S159b bootstrap floor, `1/(999+1)`; the arithmetic holds |

All six are fixed; none is adaptive. `ALPHA.FLAG` and `ALPHA.NOTE` are genuinely shared — every test
routes through `flagFromP` (`thresholds.js:38-41`). The other four are per-test literals that
duplicate the same two values without referencing them.

`P_FLOOR` earns a note. Its stated basis is real and checks out, but it preserves a *superseded
implementation's* arithmetic floor rather than deriving from any property of the data. Derived from
legacy, not from theory.

---

## Question 1: the `N >= 500` family

**Not one shared constant. Ten inline literals across eight test modules, with no named constant
anywhere.** Nothing imports anything; every site writes `500` out.

| `file:line` | expression | what it counts |
|---|---|---|
| `autocorrelation.js:88` | `nR>=500 && absR1<AUTOCORR_STRONG` | matrix rows |
| `autocorrelation.js:167` | `nR >= 500 && abs(lagPooledMeans[idx]) < AUTOCORR_STRONG` | matrix rows |
| `constantOffset.js:102` | `nR >= 500 && blockRate < 0.01` | matrix rows |
| `loessResidual.js:219` | `nR >= 500 && bestRatio < 2.0` | matrix rows |
| `regionalNoise.js:185` | `nR >= 500 && bestRatio < 2.0` | matrix rows |
| `runs.js:206` | `nR>=500 && runsRatio>0.70` | matrix rows |
| `selectiveNoise.js:183` | `b.N >= 500 && b.ratio < 3.0` | **Bartlett observations** |
| `selectiveNoise.js:251` | `b.N >= 500 && b.ratio < 3.0` | **Bartlett observations** |
| `crossConditionConsistency.js:602` | `u.nMin >= 500` | **pooled cells in the smaller condition** |
| `interReplicateCorrelation.js:156` | `p.n>=500 ? 0.05 : 0.01` | **pair observations** |

**Chat's expectation 4 inverts on structure and holds on value.** These are seven separate gate
definitions plus one threshold selector, not one shared constant — the shape the expectation ruled
out. But all ten read `500`, so the "differing values" branch that would have been the larger finding
does not hold.

Two of the seven gates count something other than matrix rows, confirming S342 at source: Selective
Noise counts Bartlett observations and Cross-Condition Consistency counts pooled cells. A third
non-row `500` sits at Inter-Replicate Correlation, and it is not a gate at all — it selects between
two excess thresholds, 0.05 above and 0.01 below, a different job under the same number.

Every one of the ten blames to the root commit. There is no recorded reason for 500 anywhere in the
repository.

---

## Question 2: the kurtosis threshold

`kurtosis.js:379` — `const adaptiveThreshold = Math.max(0.20, 1.96 * Math.sqrt(24 / Math.max(pooledN, 1)));`

Three numbers doing three different jobs:

| term | class | why |
|---|---|---|
| `sqrt(24 / N)` | **B — derived** | the asymptotic standard deviation of sample excess kurtosis under normality. Holds. |
| `1.96` | **C — conventional** | the two-sided normal 95% quantile. Standard practice, nothing specific to this application. |
| `0.20` | **D — chosen** | no comment, no citation, no derivation anywhere in the file or in METHODOLOGY. |

**Chat's expectation 3 holds on both halves.** The floor governs wherever `1.96·sqrt(24/N) < 0.20`,
that is above `N = 24·(1.96/0.20)² = 2305`, matching the dispatch's figure.

One thing the source shows that the dispatch did not ask for: **the same `0.20` also does a
non-adaptive job.** `EFFECT_SIZE.KURTOSIS_DEV` is read bare at `kurtosis.js:427` and `:433` to
classify a condition leptokurtic or platykurtic, with no sampling-error term at all. One D-class
number is shared between an adaptive floor and a fixed classifier, and moving it would move both.

---

## Stated bases — which hold and which do not

Seven constants carry a claim about their basis. Five hold, one holds but is weaker than it reads, one
does not resolve.

**Hold:**

- `benford.js:44-46, 93` — MAD bands 0.006 / 0.012 / 0.015, cited in the code at `:88` to *Nigrini
  (2012), Benford's Law: Applications for Forensic Accounting*, Table 7.1. The published bands are
  close conformity below 0.006, acceptable to 0.012, marginal to 0.015, nonconformity above. The code
  matches exactly, and `:93` gates the flag on `mad < 0.015` — the Nonconformity boundary. **Class A,
  and the clearest cited constant in the battery. Chat's expectation 2 confirmed.**
- `columnGof.js:54` and `modality.js:60` — `EXKURT_FLOOR = -1.2`, comment "uniform γ₂ = −1.2 is the
  reference". A uniform distribution's excess kurtosis is exactly −6/5. **Class B**, holds.
- `kurtosis.js:167` — the 1/2000 floor. Verified in Part 2 and confirmed by measurement.
- `columnGof.js:36-48` — the 2/2001 floor. Verified in Part 2 and confirmed by measurement.
- `withinRowVariance.js:84, 122` — `EXPECTED_RATE = 2·(1−Φ(4.0)) ≈ 0.0000633` and
  `SMOOTH_RATE = 1−Φ(4.0)`. The arithmetic holds. The `Z_THRESH = 4.0` beneath them carries no basis
  and is **D**, so these are B conditional on a D input.

**Holds, but weaker than it reads:**

- `modality.js:66-68` — `P_FLOOR` preserves "the pre-S159b bootstrap calibration (B=999 → p ≥ 0.001)".
  True, and `1/(999+1) = 0.001`. But it derives from an implementation that no longer exists rather
  than from anything about the data.

**Does not resolve:**

- `benford.js:22` — "(ii) OOM span tightened 1.0 → 1.5 to match spec." No spec is named, METHODOLOGY's
  Benford section carries the number without a derivation, and 1.5 is not otherwise recoverable. The
  gate at `:27` is load-bearing — it returns N/A. **Unknown.** What would settle it: the spec document
  the comment refers to, if one exists.
- METHODOLOGY's permutation floor — the Part 2 finding, named here because it is the same class of
  defect and the largest instance of it in the project.

---

## Table 1 — the inventory

**Classified in Part 2** (14) — every `B` / `N_PERM` / `N_SIM`: `constantOffset.js:173`,
`regionalNoise.js:148`, `loessResidual.js:179, 146, 357`, `windowedAutocorrelation.js:87`,
`interReplicateCorrelation.js:244`, `runs.js:224`, `blockedMahalanobis.js:510`,
`crossConditionConsistency.js:167`, `kurtosis.js:167`, `columnGof.js:48`, `entropyTest.js:37`,
`residualSpikeCorrelation.js:113`, `benford.js:56`, `benford2.js:88`.

**Effect-size partners to the `N >= 500` gates** (5, all inline, all root commit, all **D**):
`bestRatio < 2.0` (`loessResidual.js:219`, `regionalNoise.js:185`), `blockRate < 0.01`
(`constantOffset.js:102`), `runsRatio > 0.70` (`runs.js:206`), `b.ratio < 3.0`
(`selectiveNoise.js:183, 251`).

**`EFFECT_SIZE`** (5, `thresholds.js:29-33`, all root commit): `AUTOCORR_STRONG` 0.25,
`AUTOCORR_MODERATE` 0.15, `KURTOSIS_DEV` 0.20 (**D**, above), `RSC_HIGH_RHO` 0.5,
`CONST_OFFSET_HIGH_BLOCKS` 5.

**Inventoried, not classified — 30 named constants:**

| test | constants |
|---|---|
| Column Goodness-of-Fit | `RATIO_HIGH` 2.0, `RATIO_LOW` 0.5, `SKEW_GATE` 1.5, `EXKURT_GATE_HIGHN` −0.8, `GAMMA_N_ADAPTIVE_THRESHOLD` 100, `MIN_OBS` 30 (`columnGof.js:51-56, 62`) |
| Modality | `EXKURT_GATE_HIGHN` −0.8, `GAMMA_N_ADAPTIVE_THRESHOLD` 100, `MIN_N` 50, `MIN_DISTINCT` 15, `DIP_GATE` (`modality.js:54, 61-64`) |
| Value-Frequency Spike | `DIGIT_PASS_APPLICABILITY_FRAC` 0.5, `NEAR_DUP_DOMINANCE` 0.5, `NEAR_DUP_MAX_DISTINCT` 5, `NEAR_DUP_MIN_COUNT` 3 (`valueFrequencySpike.js:25, 59, 67, 77`) |
| Duplicate Detection | `MIN_BLOCK_CELLS` 6, `PARTIAL_ROW_MIN_COLS` 4, `PARTIAL_ROW_CARD_FRAC` 0.02 (`duplicateDetection.js:365, 731, 732`) |
| Blocked Mahalanobis | `MIN_N_CONSTRUCT` 60, `MIN_NC` 3 (`blockedMahalanobis.js:42, 43`) |
| Autocorrelation | `MAX_LAG` 10, `PAIR_CORROB_MIN` 2 (`autocorrelation.js:12, 15`) |
| Entropy / Zipf | `RATIO_GATE` 0.15 (`entropyTest.js:134`) — the comment states the behaviour, never a basis for 0.15 |
| Kurtosis | `PILOT_GATE_FACTOR` 0.5 (`kurtosis.js:235`) |
| Windowed Autocorrelation | `MIN_ROWS` 30 (`windowedAutocorrelation.js:27`) |
| Mahalanobis | `MIN_COLS` 3 (`mahalanobis.js:12`) |
| Within-Row Variance | `Z_THRESH` 4.0 (`withinRowVariance.js:11`) — **D**, see above |
| Residual Spike Correlation | `K_FRAC` 0.10 (`residualSpikeCorrelation.js:80`) |
| Inter-Replicate Correlation | `WINSOR_P` 0.05 (`interReplicateCorrelation.js:33`) |
| Carlisle Balance | `TAIL` 0.95 (`carlisleBalance.js:127`) |
| Sequential Duplication | `MIN_H` 3 (`sequentialDuplication.js:42`) |
| Benford | positivity `0.80`, OOM span `1.5` (`benford.js:23, 27`) |

The ones in that table with recoverable provenance are few and all recent. Three applicability
minimums were set by `3b5fa7f` (S324, upfront applicability checks): `columnGof.js:62`,
`mahalanobis.js:12`, `modality.js:63`. `DIP_GATE` was set by `e16e8eb` (S184). The Value-Frequency
Spike near-duplicate trio was set by `d22df9f` (S308) and the Duplicate Detection partial-row trio by
`ae06ba8` (S316). Everything else in the table is root-commit.

---

## Part 1 summary against Chat's expectations

| # | expectation | verdict |
|---|---|---|
| 1 | most constants land in class D, chosen with no recorded basis | **Correct, and the reason is measurable.** 53 of 73 named constants, all seven of `ALPHA` and `EFFECT_SIZE`, and all ten `N >= 500` sites were last set by the root commit — and that 53 is a lower bound, because a hoist refactor resets blame. D is the absence of evidence, not a judgement. |
| 2 | the Benford MAD bands are the clearest class A, citing Nigrini | **Correct.** `benford.js:88` names Nigrini (2012) Table 7.1 and the three bands match the published boundaries exactly. The only unambiguous A in the census. |
| 3 | the kurtosis standard-error term is B; the `0.20` floor beneath it is D | **Correct on both.** And the same `0.20` additionally drives a non-adaptive per-condition classifier at `kurtosis.js:427, 433`. |
| 4 | the `N >= 500` family is one shared constant | **Inverted on structure, held on value.** Ten inline literals across eight modules with no shared constant — but all ten read 500, so the "differing values" larger finding does not hold. Three count something other than rows. |

---

## What Part B leaves open — for Chat

Read-only session, so these are handed over rather than acted on.

1. **METHODOLOGY's permutation floor is wrong in a way that matters.** Its formula models BH at rank 1
   only. The reachable floor has no `m` in it. Six of the seven tests it names are one-sided, and two
   genuinely two-sided tests are missing from its list. Section 2 above has the corrected arithmetic;
   correcting the doc is Chat's.
2. **The reasoning behind that arithmetic exists in the codebase but not as a rule.** `kurtosis.js:167`
   and `columnGof.js:48` both derive `B` from the threshold it must resolve, and S339's commit message
   already computes the rank-2 step-up. Two instances, no shared statement.
3. **Provenance is not recoverable for the load-bearing layer, and no future session can recover it.**
   `ALPHA`, `EFFECT_SIZE` and every `N >= 500` predate the repository. Whatever the held-out corpus
   programme concludes, it cannot cite a history that is not there — the honest paper claim is that
   these were set before the recorded history and validated after, not that they were derived.
4. **`500` is written out ten times.** Not a defect on its own, but it means any future decision about
   the sample-size minimum is ten edits in eight files, three of which are counting something other
   than rows. Worth knowing before that decision, not during it.

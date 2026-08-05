# The large clean fixture

One generated file big enough to reach three code paths the 27-fixture corpus has never touched. Built,
run through the full battery, and reported here.

**Baseline:** branched from `06b1aed`. Node v25.8.1, darwin arm64. Nothing under `src/` changed —
`git diff --stat -- src/` is empty — so no verdict can have moved and no batch was run.

## What this file is not

**It is not a false-positive anchor and must not be promoted into one.** We generate it, so its
cleanliness is a property of the model in `test/gen-large-clean.mjs` rather than a fact about real
data. Any severity it returns is a finding about a code path, not a rate. A rate needs deposits we did
not write and many of them.

It is deliberately **not** in `test/batch-fixtures.mjs`. It stays out until we know what it does.

---

## Summary — the seven expectations

| # | Expectation | Outcome |
|---|---|---|
| 1 | The file reads unpaired and CCC runs | **Held.** `paired: false, basis: 'none'`; CCC ran and returned a verdict |
| 2 | CCC lands on the `B = 199` branch | **Held.** `conditionN [10200, 10200]`, `B 199` |
| 3 | On that branch CCC cannot flag at any effect size | **Held as arithmetic.** Floor `2/200 = 0.010` against a strict `< 0.01`. The file does not demonstrate the block — its p is 0.99, nowhere near the floor |
| 4 | All three `N ≥ 500` gates engage, for the first time anywhere | **Inverted.** Only Runs engaged. LOESS and Regional Noise failed the effect-size half of their gate, and a size sweep shows why |
| 5 | The file returns severity 0 | **Held** for the committed fixture. A throwaway sweep file at 1,400 rows returned severity 1 — recorded below, not tuned away |
| 6 | Runtime scales roughly with size | **Held.** 11.4 s against 2.6 s for a 400-row corpus fixture: 8.5× the cells, 4.3× the time |
| 7 | Kurtosis reports `nSimulations` at full count, not the early-exit 51 | **Held.** 1999 |

**The useful result is expectation 4.** The gate is a conjunction of a size condition and a
small-effect condition, and on two of the three tests those two halves move in **opposite** directions
as the file grows. A bigger clean file makes the LOESS and Regional Noise gates *less* likely to
engage, not more. So the empty evidence base behind §5.4's first gap is not simply a matter of corpus
size.

---

## Construction

**Generator:** `test/gen-large-clean.mjs`. **Fixture:** `test/fixtures/large-clean-2cond.csv`.
**Seed:** `20260806`, Mulberry32, recorded in the generator as an exported constant.

| property | value |
|---|---|
| rows | 3,400 data rows — 1,700 per condition |
| columns | `SampleID`, `Condition`, `Rep1`–`Rep6` |
| conditions | `Control`, `Treatment`, row-grouped |
| finite cells per condition | 10,200 |
| value range | 23.81 to 14,579.14 |
| missing cells | none |
| line endings | LF |
| assay used to run it | `general` → `continuous` |

The model, on the log scale and exponentiated:

    row level        L_r  ~ Normal(log 500, 0.80²)     one per row
    replicate noise  e_ri ~ Normal(0, 0.25²)           one per cell
    value            x_ri = round(exp(L_r + e_ri), 2)

### The distributional choices, and why each

**Log-normal, built on the log scale.** It is how the corpus generators model assay data and what the
pipeline's own VST expects. `detectVST` read the file and proposed `log` with `slope = 2.01, 95% CI
[1.98, 2.04]` — the generator's proportional-noise design showing up in the transform decision, which
is the correct behaviour.

**A shared row level, giving the six replicate columns their correlation.** Six independent Gaussian
columns would make every replicate test return "nothing here" for an uninteresting reason. The row
level is what makes Inter-Replicate Correlation, Mahalanobis, Within-Row Variance and Blocked
Mahalanobis see structure rather than noise.

**Constant sigma on the log scale** is proportional error on the raw scale. That is the realistic
noise model for intensity data and the one the variance-stabilising transform exists to flatten.

**Rows in draw order, levels drawn independently.** Any serial structure would be a planted mechanism,
and the sequential tests are supposed to find nothing in a clean file. Sorting the rows would have made
Autocorrelation and LOESS fire hard, for a reason I put there.

**Both conditions from the identical law. No condition effect.** A planted effect is a planted
mechanism. Note which way this cuts: identical laws put the two conditions in the "anomalously
similar" tail, which is the direction Cross-Condition Consistency's forensic filter passes. The choice
makes a CCC flag **more** likely, not less, so it does not flatter expectation 3.

**Two decimal places.** Real instrument output has finite precision. Emitting full doubles would give
Decimal Precision Consistency and Terminal Digit Uniformity fifteen digits to read, which is not a
plausible file.

**No missing cells.** The margin over the 10,000-cell threshold is only 200 cells, and every missing
cell subtracts one.

### Pairing, checked rather than assumed

`subjectPairing.js` calls a row-grouped file paired only when some non-data column is distinct within
every condition **and** carries identical sets across conditions. `SampleID` runs `C000001`–`C001700`
for Control and `T000001`–`T001700` for Treatment — distinct within, disjoint across — so the second
test fails. `Condition` fails the first test, because 1,700 identical values are not distinct. The loop
ends with no candidate.

Measured: `{"paired":false,"basis":"none","idColumn":null,"idColIndex":null,"nConditions":2}`.

This is the DS19 shape, which S351 recorded as paired in fact and unpaired under any rule that reads
the file. Here the file genuinely is unpaired — the two conditions share no subject — so the rule and
the fact agree.

### The branch arithmetic, verified at source

`crossConditionConsistency.js:166-167`:

```js
  const maxN = Math.max(...conditionN);
  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;
```

`conditionN` at `:142` counts finite **cells** in each condition's sub-matrix, not rows. On a
row-grouped file the sub-matrix is rows-in-condition by all data columns, so 1,700 × 6 = 10,200, which
clears 10,000 and selects 199. Measured `conditionN [10200, 10200]`, reported `B 199`. The corpus tops
out at 2,000 cells, on `11-rnaseq-multicondition`.

The p is doubled at `:526-528`, so the raw floor is `2/(B+1)` = `2/200` = **0.010**. `flagFromP`
(`thresholds.js:38-41`) needs `p < ALPHA.NOTE` with `ALPHA.NOTE = 0.01`, strictly. 0.010 is not less
than 0.01, so no arrangement of exceedance counts on this branch can produce a flag.

---

## What the battery did

Full run through `test/probes/probe-large-clean-fixture.mjs`.

**Severity 0.** 29 results: 25 LOW, 4 N/A, nothing at MODERATE or above.

The four declines are all ordinary applicability, and all four are what a clean synthetic file of this
shape should produce:

| test | cause |
|---|---|
| Benford's Law (First Digit) | `rangeOutOfBand` |
| Cross-Condition Rank Correlation | `premiseVoid` |
| Column Goodness-of-Fit | `shapeNotCovered` |
| Missing Data Pattern | `missingnessOutOfBand` |

### Cross-Condition Consistency

Ran, was not withheld, took `B = 199`, and returned `primaryP 0.99` at LOW. Stage-1 units all at
adjusted p 0.900, Stage-2 at 0.990, Stage-3 mean-variance slope at 0.020.

Expectation 3 holds as arithmetic, and it is worth being exact about what this file does and does not
show. It confirms the branch is reachable and that the floor sits at 0.010. It does **not** demonstrate
a signal being blocked, because its own p is 0.99 — nothing here was trying to flag. Demonstrating the
block needs a file on the 199 branch with a real cross-condition signal, which is a different fixture.

### The three `N ≥ 500` gates

First, a correction to the framing. The gate is `nR >= 500` where `nR = matrix.length`, in all three
tests — not `min(N_a, N_b)` per condition. And `useAggregate` at `engine.js:217` requires
`condCtx.type === 'column-grouped'`, so on this row-grouped file all three run **pooled** on the full
3,400-row matrix. Both readings clear 500 here, so the conclusion is unaffected, but the quantity is
not what it was described as.

| test | gate | measured | engaged? |
|---|---|---|---|
| Runs Test | `nR>=500 && runsRatio>0.70` (`runs.js:206`) | `obsOverExp 1.0104`, `nPerm null` | **yes** |
| LOESS Residual | `nR>=500 && bestRatio<2.0` (`loessResidual.js:219`) | `bestVarRatio 2.80×` | no |
| Regional Noise | `nR>=500 && bestRatio<2.0` (`regionalNoise.js:185`) | `bestVarRatio 5.39×` | no |

Runs' engagement is read off `nPerm: null`. The permutation scan runs only inside
`if(!esGate && …)` at `runs.js:222`, so a null count means the gate suppressed it. That is the first
time any `N ≥ 500` effect-size gate has been observed engaging anywhere.

LOESS and Regional Noise did not engage because the effect-size half of the conjunction failed. Their
quantity is a **maximum over windows** of a variance ratio, and the threshold is `< 2.0`.

### Why the other two did not engage — a size sweep

Three throwaway files from the same generator and seed, at three sizes. Not committed.

| rows per condition | total rows | cells per condition | `B` | Runs gate | LOESS `bestVarRatio` | Regional Noise `bestVarRatio` |
|---:|---:|---:|---:|---|---:|---:|
| 300 | 600 | 1,800 | 499 | engaged | **1.94×** — under 2.0, would engage | 4.64× |
| 700 | 1,400 | 4,200 | 499 | engaged | 2.71× | 4.58× |
| 1,700 | 3,400 | 10,200 | **199** | engaged | 2.80× | 5.39× |

**LOESS's ratio rises with the row count, and crosses its own gate between 600 and 1,400 rows.** More
rows means more windows, and the maximum over more windows is larger even when nothing is wrong. So
the size condition and the effect-size condition move in opposite directions: growing the file
satisfies `nR >= 500` and simultaneously breaks `bestRatio < 2.0`.

Regional Noise sits at 4.6–5.4× throughout, well clear of 2.0 at every size. Its gate did not fail
marginally; on this generator's data it is not close.

**What that means for §5.4's first gap.** The evidence base is empty, and the reason is not only that
no fixture was big enough. For LOESS there is a window between 500 rows and roughly 1,000 where both
halves can hold, and it is narrow. For Regional Noise this generator never gets near it. A larger
clean file is not sufficient to exercise these two gates, and may be counterproductive. One generator
and one seed, so this is a mechanism with three points on it, not a curve.

### Excess Kurtosis

`nSimulations 1999` — the full `N_SIM`, not the early-exit 51. Expectation 7 holds.

### Runtime

| file | shape | wall clock | severity |
|---|---|---:|---:|
| `11-rnaseq-multicondition.csv` | 1,500 × 4 | 1,839 ms | 3 |
| `09-proteomics-clean.csv` | 400 × 6 | 2,641 ms | 0 |
| `large-clean-2cond.csv` | **3,400 × 6** | **11,416 ms** | 0 |

Against `09-proteomics-clean`, the fairer comparison of the two: 8.5× the cells for 4.3× the time.
Sub-linear, and not pathological. `11-rnaseq-multicondition` is faster despite being larger because it
is a genomics assay, which routes `rowSemantics` to `arbitrary` and skips five tests — not a
like-for-like reading.

---

## The one thing that returned a flag

The 1,400-row sweep file — **not** the committed fixture — returned **severity 1**, on
**Noise Scaling With Measurement Size** at p = 0.0086, just inside `ALPHA.NOTE = 0.01`. The 600-row and
3,400-row files both returned severity 0.

Recorded, not tuned. Three points, one seed each, from a generator we wrote: this is an observation
about a code path and is emphatically not a rate. Two things make it worth a line for whoever picks up
§5.4:

- The generator gives every row the same coefficient of variation on the log scale, which is exactly a
  raw-scale mean-variance slope of 2. `detectVST` measured 2.01 with a 95% CI of [1.98, 2.04]. So the
  file has a very precisely determined slope and the test is reading a real property of it.
- `meanVariance.js:57-60` already carries a comment naming this exact failure mode — *"At large N,
  regression SE becomes tiny, making even biologically normal slope deviations significant"* — and
  ships a Cochran's Q specification test to choose between the regression SE and a block-robust SE.
  Whatever happened at 1,400 rows happened with that guard in place.

Nothing was adjusted in response to this. It is one file at one size and it did not recur.

---

## Reproduction

```sh
node test/gen-large-clean.mjs
node test/probes/probe-large-clean-fixture.mjs

# the size sweep (throwaway files, not committed)
for R in 300 700 1700; do
  OUT=/tmp/r$R.csv ROWS=$R node test/gen-large-clean.mjs
  COMPARE= FILE=/tmp/r$R.csv node test/probes/probe-large-clean-fixture.mjs
done
```

`ROWS` exists for the sweep only. The default reproduces the committed fixture byte for byte — checked
by md5 before and after the parameter was added.

## Gate

- **No batch.** `git diff --stat -- src/` is empty, so nothing the batch scores can have moved.
- No preview and no screenshots — there is no rendering surface here.
- The fixture is not in `test/batch-fixtures.mjs` and should stay out until the open questions above
  are settled.

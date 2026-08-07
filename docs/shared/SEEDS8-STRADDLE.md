# The `SEEDS=8` unstable cells, classified

`SEEDS=8` fails on main. Three test × fixture cells change flag across seeds and one fixture changes
severity. This read classifies each, because the three classes need different answers and one of them
cannot be bought with precision at any price.

**Amended at S358, and two of the corrections change what this document concludes.** First, **DS12b's
observed statistic does not move.** `bestVarRatio` reads 7.83× on all eight offsets — one value — so
the 1.05 standard deviations reported below is the spread of eight *estimated p-values*. That is
Monte-Carlo error of the estimate, not a spread of the statistic, and the two readings support
opposite fixes. Second, **DS12b's Regional Noise MODERATE is a false positive**, adjudicated at S358
from the fixture's construction: the firing localises to rows 51–65, wholly inside the file's honest
half, at every offset. That cell has left the verdict-stability question (P69) for the false-positive
question. Every measurement in Parts 1 and 2 stands unchanged. Part 3 and the closing sections are
corrected in place, and the corrections are marked *(S358)*.

**Baseline:** `780e9da`, Node v25.8.1, darwin arm64. Nothing under `src/` changed —
`git diff --stat -- src/` is empty against both the working tree and the merge base — so no batch was
run. The probe reads fixtures through the standard import pipeline and never writes to them, so the
CRLF hazard in the neighbour probe does not apply.

**Instrument:** `test/probes/probe-seeds8-straddle.mjs`. Seed offsets come from `test/seed-inject.mjs`,
a load-time source hook. Offset 0 is the shipped stream, so this is one real draw and seven
counterfactuals.

---

## Summary — the six expectations

| # | Expectation | Outcome |
|---|---|---|
| 1 | The unstable cells are few, and confined to the three tests already named | **Held.** 3 of 783 cells, on exactly those three tests |
| 2 | At least one cell is lattice-exact | **Held.** Regional Noise on DS12b returns `p` exactly equal to `ALPHA.NOTE` on 3 of 8 seeds |
| 3 | DS15's 3 → 2 traces to one flag dropping a tier, not two moving together | **Held.** Only CCC moves on seed 2; the other two channels are constant |
| 4 | Most cells are sampling straddles, well inside one standard deviation of their threshold | **Split.** Two of three are sampling straddles, so "most" holds. "Well inside" does not: the distances are 0.54, 0.95 and 1.05 standard deviations |
| 5 | At least one cell is rank churn, and it would have been misread as a straddle from the p alone | **Inverted.** No cell changes its driving unit's identity. DS15 changes the *number* of units tied at the minimum, which is a different mechanism |
| 6 | DS15 is the only instability running toward a false negative | **Inverted.** All three run that way. All three sit on fabricated fixtures; none sits on a clean one |

---

## Part 1 — the cells, and how the eight seeds split

Three of 783 test × fixture cells are not flag-constant. One fixture's severity moves.

| fixture | kind | test | flags, seeds 0–7 | split |
|---|---|---|---|---|
| `12b-uniform-mixture-fabricated` | fabricated | Regional Noise Homogeneity | MOD MOD MOD **LOW** MOD **LOW** MOD **LOW** | **5 MODERATE / 3 LOW** |
| `15-missing-carlisle` | fabricated | Cross-Condition Consistency *(declared channel)* | MOD MOD **LOW** MOD MOD MOD MOD MOD | **7 MODERATE / 1 LOW** |
| `23-recurrence-null-mixed` | fabricated | Column Goodness-of-Fit | HIGH HIGH **MOD** HIGH HIGH HIGH HIGH **MOD** | **6 HIGH / 2 MODERATE** |

Severity: `15-missing-carlisle` reads `3 3 2 3 3 3 3 3` — declared 3. Every other fixture is constant,
including DS12b (constant at 1) and DS23 (constant at 3).

**No clean fixture carries an unstable cell.** All eight severity-0 fixtures are constant on all eight
seeds, and all three unstable cells sit on fabricated files. Every instability the project has recorded
before this ran toward false positives. All three of these run the other way — a fabricated file
losing a flag, a tier, or a severity.

**The batch's own pass count moves with the seed**, which is worth recording separately because the
shipped state is quoted as a fixed number:

| seed | batch |
|---|---|
| 0, 1, 4, 6 | 26/27 — DS12b fails the completeness gate |
| **3, 5, 7** | **27/27 — fully green** |
| 2 | 25/27 — DS12b and DS15 |

"27/28 with DS12b the sole failure" is the seed-0 reading. On three of eight seeds DS12b's Regional
Noise goes LOW, the undeclared MODERATE disappears, and the completeness gate has nothing to report.

*(S358.)* The denominator in the table above is fixtures. The runner's own denominator is **28** — the
27 fixtures plus the DS01 cross-shape invariance check appended after the loop — and that check passes
on every offset, so the two readings reconcile exactly: 26/27 is 27/28, 27/27 is 28/28, and 25/27 is
26/28. STATUS quotes the runner's figure. Both describe the same run, and neither is a rate.

---

## Part 2 — per-cell instrumentation

Thresholds read at source. `src/constants/thresholds.js:22-25`:

```js
export const ALPHA = {
  FLAG: 0.001,   // p < this → HIGH (displayed as "FLAGGED")
  NOTE: 0.01,    // p < this → MODERATE (displayed as "NOTED")
};
```

and `:38-41`:

```js
export function flagFromP(p) {
  if (!Number.isFinite(p)) return "N/A";
  return p < ALPHA.FLAG ? "HIGH" : p < ALPHA.NOTE ? "MODERATE" : "LOW";
}
```

**Both comparisons are strict `<`.** A p exactly equal to a threshold falls to the lower tier. The
three flag sites all route through this function: `crossConditionConsistency.js:620`,
`regionalNoise.js:186`, `columnGof.js:236`.

### `12b-uniform-mixture-fabricated` / Regional Noise Homogeneity

`B = 499` from `regionalNoise.js:148` (`validRows.length <= 100 ? 4999 : 499`; this file has 400 rows).
One-sided, `c = 1`, `scanP = (exceedCount + 1)/(N_PERM + 1)` at `:173`. Raw floor `1/500 = 0.002`.
No BH stands between the scan p and the flag — `flagFromP(scanP)` reads the raw value.

| seed | flag | adjusted p, full precision | exceedances | p / floor | driver |
|---|---|---|---:|---:|---|
| 0 | MODERATE | 0.0080000000000000002 | 3 | 4 | scan p |
| 1 | MODERATE | 0.0060000000000000001 | 2 | 3 | scan p |
| 2 | MODERATE | 0.0060000000000000001 | 2 | 3 | scan p |
| 3 | **LOW** | **0.010000000000000000** | 4 | 5 | scan p |
| 4 | MODERATE | 0.0080000000000000002 | 3 | 4 | scan p |
| 5 | **LOW** | **0.010000000000000000** | 4 | 5 | scan p |
| 6 | MODERATE | 0.0080000000000000002 | 3 | 4 | scan p |
| 7 | **LOW** | **0.010000000000000000** | 4 | 5 | scan p |

mean 0.008250, sd 0.001669, three distinct values. `|mean − ALPHA.NOTE| / sd = 1.049`.

**(S358) Name what that standard deviation is of.** It is the spread of eight *estimated* p-values,
not of the statistic. The statistic is stationary: `bestVarRatio` reads 7.83× on all eight offsets —
one distinct value, against three distinct exceedance counts and three distinct p-values. The data
gives one answer here and the null is what moves under it. So "1.05 standard deviations from the
threshold" describes how precisely 499 permutations estimate a tail probability that happens to sit
next to 0.01. It does not describe a statistic sitting next to a boundary. More draws shrink the
estimation error; they cannot move a value off a lattice point the threshold occupies.

**`p === ALPHA.NOTE` is true on three of eight seeds**, tested by identity rather than by rounding.
`5/500` and the literal `0.01` are the same double.

The second flag driver never engages. `regionalNoise.js:188` promotes LOW → MODERATE when some column's
BH-adjusted p clears `ALPHA.FLAG`; the smallest column p across all eight seeds is 0.012, so the
promotion arm is never reached. The effect-size gate never engages either — `bestVarRatio` is 7.83×
on every seed against a `< 2.0` threshold. One driver, constant.

### `15-missing-carlisle` / Cross-Condition Consistency

`B = 999` from `crossConditionConsistency.js:167`, selected by `maxN = 458` finite cells in the largest
condition. Doubled, `c = 2`, at `:526-528`. Raw floor `2/1000 = 0.002`. Stage-1 family `m = 3`.

| seed | flag | adjusted p, full precision | p / floor | units at the minimum |
|---|---|---|---:|---|
| 0 | MODERATE | 0.0090000000000000011 | 4.5 | Trimmed span + CDF shape |
| 1 | MODERATE | 0.0060000000000000001 | 3.0 | Trimmed span |
| 2 | **LOW** | **0.012000000000000000** | 6.0 | Trimmed span + CDF shape |
| 3 | MODERATE | 0.0060000000000000001 | 3.0 | Trimmed span |
| 4 | MODERATE | 0.0090000000000000011 | 4.5 | Trimmed span + CDF shape |
| 5 | MODERATE | 0.0060000000000000001 | 3.0 | Trimmed span |
| 6 | MODERATE | 0.0090000000000000011 | 4.5 | Trimmed span + CDF shape |
| 7 | MODERATE | 0.0060000000000000001 | 3.0 | Trimmed span + CDF shape |

mean 0.007875, sd 0.002232, three distinct values. `|mean − ALPHA.NOTE| / sd = 0.952`.
**No seed puts the p on `ALPHA.NOTE`.**

The lead unit is **Trimmed span (5–95%) on all eight seeds**. It is never overtaken; CDF shape either
ties with it or trails. What changes is how many units sit at the reported minimum — one on seeds 1, 3
and 5, two on the other five — which changes the step-up's rank term `m/j` between 3 and 1.5 and moves
the reported value between two lattice families.

### `23-recurrence-null-mixed` / Column Goodness-of-Fit

`B = 2000`, a fixed constant at `columnGof.js:48`. Doubled, `c = 2`, at `:195`. Raw floor
`2/2001 = 0.00099950024987506244`. **The BH family holds one member** — `nTested = 1` — so the adjusted
p equals the raw p.

| seed | flag | adjusted p, full precision | exceedances | p / floor | driver |
|---|---|---|---:|---:|---|
| 0 | HIGH | 0.00099950024987506244 | 0 | 1 | col 1, normal, shape mismatch |
| 1 | HIGH | 0.00099950024987506244 | 0 | 1 | col 1, normal, shape mismatch |
| 2 | **MODERATE** | 0.0019990004997501249 | 1 | 2 | col 1, normal, shape mismatch |
| 3 | HIGH | 0.00099950024987506244 | 0 | 1 | col 1, normal, shape mismatch |
| 4 | HIGH | 0.00099950024987506244 | 0 | 1 | col 1, normal, shape mismatch |
| 5 | HIGH | 0.00099950024987506244 | 0 | 1 | col 1, normal, shape mismatch |
| 6 | HIGH | 0.00099950024987506244 | 0 | 1 | col 1, normal, shape mismatch |
| 7 | **MODERATE** | 0.0019990004997501249 | 1 | 2 | col 1, normal, shape mismatch |

mean 0.0012494, sd 0.00046268, two distinct values. `|mean − ALPHA.FLAG| / sd = 0.539`.
No seed puts the p on `ALPHA.FLAG`, and no lattice point can: `2(k+1)/2001 = 0.001` needs
`k + 1 = 1.0005`.

One driver on every seed: column 1, Normal family, shape-mismatch direction. The verdict turns on
**zero exceedances against one, out of 2000 bootstrap draws.**

---

## Part 3 — the classification

| cell | lattice-exact | sampling straddle | rank churn |
|---|---|---|---|
| DS12b / Regional Noise | **yes** — `p === ALPHA.NOTE` on 3 of 8 seeds | **of the estimate only (S358)** — the statistic is one value, 7.83×, on every seed | no |
| DS15 / Cross-Condition Consistency | no | **yes** — threshold at 0.95 sd | no, but see below |
| DS23 / Column Goodness-of-Fit | no | **yes** — threshold at 0.54 sd | no |

**DS12b is lattice-exact, and that is the load-bearing finding.** The scan p lives on `(k+1)/500`, the
threshold is `0.01`, and `0.01 × 500 = 5` is an integer — so the lattice contains the threshold point
exactly, and the strict `<` sends it to LOW. Four exceedances out of 499 is not a near miss; it is the
threshold.

**(S358) The second label needed qualifying, and this document gave it without one.** The cell was
also called a sampling straddle, on the ground that the p moves across three lattice points and the
threshold is one of them. That is true of the *estimate* and false of the statistic: `bestVarRatio` is
7.83× on all eight offsets. Nothing in the data straddles anything. What straddles is a Monte-Carlo
estimate of a fixed tail probability that sits beside a threshold the lattice contains. **The
distinction decides the remedy.** A sampling straddle argues for more draws. This argues for an
off-lattice count or a non-strict comparison, because more draws concentrate the estimate on a value
the lattice was built to include.

**DS15 is a sampling straddle and nothing else.** Its lattice can reach 0.010 — at `m = 3`, three units
tied at the floor gives `1 × 0.002 × 5 = 0.010` — but that configuration never occurred; the observed
tie counts are one and two, whose lattices are multiples of 0.006 and 0.003 and skip 0.010 entirely.

**DS15 is not rank churn, and the distinction matters.** The dispatch defines rank churn as the driving
unit's *identity* changing. Trimmed span leads on all eight seeds. What changes is the tie count at the
minimum, which changes the BH rank term and moves the p between lattice families. Calling that rank
churn would blur two mechanisms that need different treatment: a different unit winning is a statement
about which property carries the signal, while a tie appearing or disappearing is a statement about the
step-up's arithmetic on near-equal raw values. **Expectation 5 is inverted** — no cell in this corpus
changes its driver's identity, and the one cell that looked like a candidate is doing something else.

**DS23 is the tightest straddle and it is structural.** `B = 2000` was chosen so the doubled floor
`2/2001` clears `ALPHA.FLAG` — by five parts in ten thousand. With one column in the family there is no
BH slack, so HIGH is reachable **only** at the exact floor, and a single exceedance out of 2000 doubles
the p and costs the tier. The gate is cleared by the smallest margin the arithmetic permits.

**DS15's severity move is one flag, not two.** On seed 2 the channel composition is Blocked Mahalanobis
plus Missing Data Pattern; on the other seven it is those two plus Cross-Condition Consistency. Both
survivors are constant. The severity falls 3 → 2 because CCC is DS15's only `group`-mechanism flag, so
losing it costs a dimension in the diversity term — the mechanism S351 recorded. **Expectation 3
holds.**

### The lattice is a property of the count, not of the test

Whether a threshold sits on the lattice is decided by whether `threshold × (B+1) / c` is an integer.
For every resample count the battery ships:

| `B` | denominator | one-sided `c=1` · `ALPHA.NOTE` | `c=1` · `ALPHA.FLAG` | doubled `c=2` · `ALPHA.NOTE` | `c=2` · `ALPHA.FLAG` |
|---:|---:|---|---|---|---|
| 199 | 200 | **on lattice** | — | **on lattice** | — |
| 499 | 500 | **on lattice** | — | — | — |
| 999 | 1000 | **on lattice** | **on lattice** | **on lattice** | — |
| 1999 | 2000 | **on lattice** | **on lattice** | **on lattice** | **on lattice** |
| 2000 | 2001 | — | — | — | — |
| 4999 | 5000 | **on lattice** | **on lattice** | **on lattice** | — |
| 5000 | 5001 | — | — | — | — |

Every count of the form `10k − 1` puts a one-sided lattice point exactly on `ALPHA.NOTE`. The only two
shipped counts that miss both thresholds under both constructions are **2000 and 5000** — Column
Goodness-of-Fit's and Benford's, the two that were chosen deliberately rather than taken from a
row-count rule, and both chosen for a different stated reason.

---

## What the classification rules out

**Raising `B` is dead for DS12b, and not because of Monte-Carlo error.** The permutation-count read
already killed route 1 on the grounds that the binding quantity is sampling error at `1/√B` rather
than the grid step at `1/B`. DS12b fails for a second, independent reason: its lattice *contains* the
threshold. Moving from `B = 499` to 999, 1999 or 4999 keeps a lattice point exactly on `ALPHA.NOTE`,
so the same coin flip reappears at a finer spacing. Precision cannot remove a point the lattice is
built to include.

**Two cheap escapes exist for that one cell, and neither is a calibration change.** Making the
comparison non-strict at the threshold, or choosing a count whose denominator is co-prime with the
threshold's reciprocal — which is what `B = 2000` and `B = 5000` already do. Both are one-line changes
to shipped behaviour and neither is in scope here. Recorded, not proposed.

**Raising `B` survives as a partial answer for DS15 and DS23, at a price already measured.** Both are
sampling straddles, and sampling error falls as `1/√B`. DS23 sits at 0.54 standard deviations from its
threshold, so no plausible count settles it. DS15 sits at 0.95, and the permutation-count read measured
what that costs directly: `B = 5999` left DS15's flip rate exactly where `B = 999` had it, and it took
`B = 39999` to reach 0 of 8 — forty times the shipped count, more than doubling the batch.

**The multiplicity structure is not the culprit here.** No cell changes its driving unit. The one
rank-related effect is DS15's tie count moving between one and two, which is a consequence of two raw
values landing close together, not of the family being wrongly composed.

**What this measurement cannot settle.** Eight offsets is one real draw and seven counterfactuals, on
one fixture each. It gives the split and the spread; it does not give a rate, and the standard
deviations above are estimated from eight points, so the 0.54 / 0.95 / 1.05 distances carry wide
uncertainty and their *ordering* is better supported than their values. It also says nothing about
whether the underlying verdicts are correct — DS12b's Regional Noise firing is undeclared and the
completeness gate has been failing on it since before this read, so "MODERATE on five seeds" is not
evidence that MODERATE is the right answer. And nothing here measures how often a real deposit lands in
one of these bands; the corpus is 27 files we wrote.

**(S358) One of those questions has since been answered.** DS12b's Regional Noise firing was
adjudicated from the fixture's construction rather than from tool output. The file is 200 honest rows
of log-normal noise at σ = 0.18, then 200 fabricated rows of uniform ±40% noise on the same base means
— a variance change, which is what the test measures. Neither half flags alone: Genuine alone 4.89× at
p = 0.092, Fabricated alone 2.64× at p = 0.778, **pooled 7.83× at p = 0.010**. The firing localises to
rows 51–65, inside the honest half, at every offset, with no overlap with the plant. It is a false
positive produced by pooling one permutation null across two noise regimes. **MODERATE was not the
right answer on any seed**, and the cell belongs to the false-positive question rather than the
stability one.

**On P51.** The dispatch asked that it not be the opening frame, and it is not. P51 concerns the
analytic standard error of a multiplicity-adjusted minimum. Two of the three cells are multiplicity-
adjusted minima whose instability is sampling error — DS15 at `m = 3`, DS23 at `m = 1` — so the
classification is consistent with P51 being their home. DS12b is not: its flag reads a raw scan p with
no BH between the statistic and the threshold, and its failure is lattice geometry rather than standard
error. **P51 as written cannot cover all three.**

**(S358) That objection has lapsed, because the set changed rather than P51.** DS12b has left the
stability question altogether — its cell is a false positive, not an unstable verdict — so what P51
has to house is DS15 and DS23. Both are multiplicity-adjusted minima and both are sampling straddles,
which is exactly P51's subject. The paragraph above stands as a description of DS12b and no longer
stands as an objection to P51.

---

## Reproduction

```sh
SEEDS=8 SEEDS_JSON=/tmp/seeds8.json node test/validate-batch.mjs
node test/probes/probe-seeds8-straddle.mjs
```

The probe defaults to the three cells above and takes `CELLS='file.csv|Test Name;…'` to point it
elsewhere. `SEEDS` overrides the offset count.

## Gate

- **No batch.** `git diff --stat -- src/` is empty against both the working tree and the merge base
  `780e9da`, so nothing the batch scores can have moved.
- No preview and no screenshots — no rendering surface.
- `SEEDS=8` still fails on main, unchanged by this read. That is the subject, not a regression.

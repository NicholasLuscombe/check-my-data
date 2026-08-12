# The shipped callers' group p-values under a valid null — measurement record

**S369 Part 2 · P83 · nothing in `src/` changed.** Part 1 measured the aggregation layer on p-values
that were uniform by construction, which gives a curve rather than a rate. This measures the two
things that turn it into a rate on real data: how correlated the group p-values actually are on the
shipped callers, and how their marginals are calibrated before aggregation. **The two are reported
separately and are never combined into a single figure.**

Every number comes out of the shipped `aggregatePerGroup`, called directly with each test's own
function. `ALPHA.FLAG = 0.001` and `ALPHA.NOTE = 0.01` are imported from
`src/constants/thresholds.js` and never retyped. Instrument:
`test/probes/probe-s369-null-correlation.mjs`, with Part 1's `test/probes/s369-arm-flags-hook.mjs`
reused unchanged.

This record states what the numbers are. What they mean for the register is Chat's to write.

---

## 1. The null, and what it can and cannot move

The null is the whole-matrix row permutation. On column-grouped data a group is a set of **columns**
over all the rows, so the permutation leaves group membership exactly intact and destroys row order.
It is a valid null only for a caller whose statistic moves under it.

**The fixture set, re-measured over all 27 rather than carried forward.** Exactly four fixtures route
the Fisher-reaching callers through the layer, all at three groups, and the count is unchanged by the
log transform:

| fixture | line endings | groups | rows × data columns |
|---|---|---|---|
| `01-densitometry-clean.csv` | CRLF | 3 | 35 × 12 |
| `02-densitometry-fabricated.csv` | CRLF | 3 | 35 × 12 |
| `16-densitometry-carlisle-overbalanced.csv` | LF | 3 | 60 × 18 |
| `17-densitometry-carlisle-clean.csv` | LF | 3 | 60 × 18 |

Of the other 23, twelve are row-grouped and eleven carry no condition structure.

**Line endings are stated because a known corruption mode keys on them.** DS01 and DS02 are CRLF. That
mode bites when a probe rewrites a CSV as text and drops the carriage return from the final field;
this instrument never writes a CSV. Each fixture is parsed once through the real import pipeline and
the resulting numeric matrix is permuted in memory, so no record can merge with the next one.

**Two of the six callers are invariant and are dropped.** Original matrix plus ten permuted ones, per
group, per caller. The criterion is the relative spread `(max − min) / max`, not exact-value
distinctness — summing a column's residuals in a different row order moves the last few units in the
last place, so a mathematically invariant statistic still prints a fresh 17-digit string. An
exact-value test called Selective Noise "moving" on ten of twelve group cells for that reason alone.

| caller | relative spread over the four fixtures | verdict |
|---|---|---|
| Exact Duplicate Detection | 0 on all 12 group cells | invariant |
| Selective Noise Partitioning | 3.8e-14 to 9.2e-14 | invariant |
| Autocorrelation | 0.66 to 0.96 | moves |
| Runs Test | 0.94 to 1.00 | moves |
| LOESS Residual Analysis | 0.85 to 0.99 | moves |
| Regional Noise Homogeneity | 0.67 to 0.99 | moves |

Selective Noise's invariance was confirmed outside the probe at seventeen digits: group 2 of DS01
reads `6.87267318328020904e-1` on the original and `6.87267318327994925e-1` on two of the
permutations, and nothing else changes across eleven draws. The mechanism is that a whole-matrix row
permutation moves entire rows, so every column keeps its multiset of values and Bartlett's statistic
is unchanged.

**The two invariant callers are reported as unmeasurable under this null, not as a rate of zero.**
Sixteen cells survive: four callers over four fixtures.

## 2. Exact Duplicate Detection's 1.000 is computed, and the reason is worth a row

`primaryP` is exactly 1.000 on every one of the twelve column groups. Read at source
(`duplicateDetection.js:807-809`) and then measured, the value is **not a placeholder**: `rawPs` is a
real five-member family and `combinedP = Math.min(...bhFDR(rawPs))`.

The five sub-test p-values, measured per group:

| fixture | `collisionP` | `rowDupP` | `withinRowP` | `bestBlockP` | within-row matches / pairs |
|---|---|---|---|---|---|
| DS01, all three groups | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 / 2,310 |
| DS02, all three groups | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 / 2,310 |
| DS16, all three groups | 1.0000 | 1.0000 | **0.3297** | 1.0000 | 1 / 9,180 |
| DS17, all three groups | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 / 9,180 |

**On DS16 a sub-test returns a real 0.3297 and `primaryP` is still exactly 1.** `bhFDR` caps each
adjusted value at 1 (`primitives.js:244`) and rank 1 multiplies by `m = 5`, so with the other four
members at 1 the reported p is exactly `min(5·p, 1)` — **any single sub-test result at or above 0.2 is
reported as exactly 1.000.**

**All five members can reach 1 without their own computation producing it, by three different
syntaxes.** This corrects the figure of two first recorded here; the source of truth is the `rawPs`
family at `:807-809` and the five member definitions it draws on.

| member | line | route |
|---|---|---|
| `withinRowP` | `:243` | surviving initialiser — every assignment sits inside `if (!isGenomics)`, closed at `:359` |
| `partialRowP` | `:734` | surviving initialiser — only written at `:785`, behind `wrR >= 2 && wrC >= PARTIAL_ROW_MIN_COLS`, then `cand.length`, plus a `partialRowSkipped` bail |
| `bestBlockP` | `:668` | loop that never writes — only written at `:700` inside `for (const blk of sparseFilteredBlocks)`, so an empty set leaves the literal |
| `collisionP` | `:192` | conditional expression — `collisionNPairs > 0 ? binomialSurvival(…) : 1` |
| `rowDupPValueAdj` | `:657` | conditional expression — `nRowDups === 0 ? 1 : rowDupPValue`, discarding the p computed at `:656` |

**Grepping for one idiom returns the old answer**: `let … = 1` alone finds three of the five, and the
two conditional expressions are invisible to it. So a member that never ran is indistinguishable from
one that ran and found nothing, on every member of the family. That is a literal inside the family
rather than at the reported p. Recorded, not acted on.

A related correction: the family is **five** p-values, not the four `CLAUDE.md` recorded. The fifth is
scattered partial-row duplication, listed as Test 5 at `:804`.

## 3. Ground truth for the four fixtures

Read from `docs/shared/TEST-GROUND-TRUTH.md` (rows at lines 40, 41, 56, 57) and from `EXPECTED` in
`test/batch-fixtures.mjs`, then checked against this session's batch run.

| fixture | GT doc | `EXPECTED` | measured | what the row says it is |
|---|---|---|---|---|
| DS01 | 0 | 0 | 0 | Clean densitometry, with a within-row column swap at rows 8–14 that should not read as fabrication |
| DS02 | 1 | 1 | 1 | Rescaled-copy fabrication, three mechanisms; 3 → 1 at S352 when Residual Spike Correlation was withheld on paired data |
| DS16 | 2 | 2 | 2 | Pure Carlisle over-balancing; every replicate value a genuine draw, group means too balanced |
| DS17 | 0 | 0 | 0 | Clean counterpart to DS16, same generator with the Carlisle filter off |

No disagreement on any of the four.

One staleness observation, reported rather than acted on — Chat owns the file.
`TEST-GROUND-TRUTH.md:65` still opens "**Batch status (post-S129):** 22/22 passed vs current GT" and
repeats "all 22 fixtures" through the paragraph. The suite is 27 fixtures and 28 checks, and the
current reading is 27/28 at seed offset 0.

The header's fixture arithmetic is **not** stale. It carries 24 rows, names the three `vfs-*` files as
the absent ones and states 24 + 3 = 27, which is correct. `CLAUDE.md`'s S366 note that the header
"undercounts its own gap at three; it is five" was true when written — at `b98d1a9^` the table had 22
rows and named three absent fixtures behind the word "include" — and was discharged by `b98d1a9`,
which added the DS23 and DS24 rows. **The row gap is now three; the construction gap is a different
quantity and is still five**, because the `vfs-*` trio plus DS23 and DS24 have no builder in the
repository. Both sentences are true about different things, and `CLAUDE.md` now says so.

## 4. The lattice each caller's permutation p can land on

Counts read off each result's own published `nPerm`, not off the source rule. A threshold is
attainable exactly when `α·(B+1)` is an integer, and `flagFromP` compares strictly, so a coincident
point is **excluded** and the reachable rate is below the nominal.

| caller | `nPerm` | floor | `ALPHA.FLAG` on the lattice | `ALPHA.NOTE` on the lattice | reachable at FLAG / NOTE |
|---|---|---|---|---|---|
| Autocorrelation | none | — | n/a | n/a | analytic p, no lattice |
| Runs Test | 999 | 1.0e-3 | **yes** | **yes** | **0.000%** / 0.900% |
| LOESS Residual Analysis | 4999 | 2.0e-4 | **yes** | **yes** | 0.080% / 0.980% |
| Regional Noise Homogeneity | 4999 | 2.0e-4 | **yes** | **yes** | 0.080% / 0.980% |

Same counts on all four fixtures: `loessResidual.js:179` and `regionalNoise.js:148` both read
`validRows.length <= 100 ? 4999 : 499`, and every group here has 35 or 60 rows; `runs.js:224` reads
`maxN <= 100 ? 999 : …` on the difference-sequence length.

**Every reachable figure in that table is below its nominal, and one is zero.** The Runs scan's floor
is `1/1000 = 0.001`, which is `ALPHA.FLAG` exactly, and the strict comparison excludes it — so **that
arm cannot return HIGH at all**. At `B = 4999` the reachable rate at `ALPHA.FLAG` is `4/5000 = 0.080%`
against a 0.100% nominal, and at `ALPHA.NOTE` it is `49/5000 = 0.980%` against 1.000%.

**The column describes the permutation arm, not `primaryP`.** Only Regional Noise publishes its scan p
unchanged (`regionalNoise.js:242`). Runs takes `min(BH minimum, scan p, window BH minimum)`
(`runs.js:277`) and LOESS takes `min(min(scan, cusum), pair BH minimum)` (`loessResidual.js:451`), so
on those two the lattice bounds one arm of a minimum and `primaryP` can land off it. Autocorrelation
has no permutation arm at all — its `primaryP` is a BH minimum over analytic two-sided per-pair
p-values.

## 5. Placing a measured dependence on Part 1's grid

Readout 2 reports a Spearman correlation between group p-values. To place it without inverting
anything, the same statistic is computed on Part 1's own construction at each ρ rung. Both p
conventions are given, because the mapping differs sharply: a one-sided p is a monotone function of z
and its Spearman tracks the normal's, while a two-sided p is a function of |z|, which folds the sign
away and correlates far less at the same ρ. 200,000 draws per rung, three groups.

| ρ | Spearman, one-sided p | Spearman, two-sided p |
|---|---|---|
| 0.0 | 0.0027 | −0.0013 |
| 0.1 | 0.0963 | 0.0073 |
| 0.2 | 0.1906 | 0.0176 |
| 0.3 | 0.2863 | 0.0590 |
| 0.4 | 0.3851 | 0.1018 |
| 0.5 | 0.4830 | 0.1639 |
| 0.6 | 0.5836 | 0.2536 |
| 0.7 | 0.6816 | 0.3564 |
| 0.8 | 0.7853 | 0.5033 |
| 0.9 | 0.8911 | 0.7007 |

**The rung a measured value sits on therefore depends on which convention its caller resembles**, and
the four survivors are not uniform in that respect: LOESS and Regional Noise carry one-sided
permutation scan p-values, Autocorrelation carries a BH minimum over two-sided per-pair p-values, and
Runs carries a minimum over both kinds. This is why the reported quantity is the observable and the
rung it sits on, and not a "measured ρ".

---

## 6. Readout 1 — marginal calibration per group, before aggregation

**4,000 draws per cell.** The target was 5,000; the full grid at 5,000 would have run about 33 minutes
against a 30-minute budget, so the count was reduced. The reduction costs 12% on every standard error
and buys back one incidental benefit noted in section 9. Standard errors are in brackets throughout,
in the same units as the rate beside them; at 4,000 draws the standard error is 0.050 percentage
points at a 0.1% rate and 0.157 at a 1% rate.

This is the empirical answer to the question Part 0 could only answer by reading. Nominal is 0.1% at
`ALPHA.FLAG` and 1.0% at `ALPHA.NOTE`, and where a permutation lattice applies the *reachable* nominal
is lower — 0.080% and 0.980% at `B = 4999`, and 0.000% and 0.900% for the Runs scan arm at `B = 999`
(section 4).

Across the twelve group cells per caller:

| caller | p < FLAG, mean (range) | p < NOTE, mean (range) | median p (range) |
|---|---|---|---|
| Autocorrelation | 0.027% (0.000–0.100) | 0.383% (0.200–0.500) | 0.535–0.591 |
| Runs Test | 0.054% (0.000–0.150) | 1.165% (0.700–1.625) | 0.314–0.363 |
| LOESS Residual Analysis | 0.194% (0.050–0.400) | 2.277% (1.675–4.325) | 0.164–0.192 |
| Regional Noise Homogeneity | 0.069% (0.000–0.175) | 0.992% (0.775–1.275) | 0.484–0.512 |

**The four callers do three different things, and no single direction describes them.**

- **Regional Noise Homogeneity is calibrated.** Median p 0.484–0.512 against 0.5, 0.992% at
  `ALPHA.NOTE` against a reachable 0.980%, 0.069% at `ALPHA.FLAG` against a reachable 0.080%.
- **Autocorrelation is conservative.** 0.383% at `ALPHA.NOTE` is 0.38 times nominal, and its median p
  sits at 0.535–0.591 rather than 0.5. Its `primaryP` is a BH minimum over analytic two-sided per-pair
  p-values, and it has no permutation arm, so no lattice explains it.
- **LOESS Residual Analysis is anti-conservative by about a factor of two, and it is the largest
  single effect in this part.** 2.277% at `ALPHA.NOTE` against a reachable 0.980% is 2.3 times; 0.194%
  at `ALPHA.FLAG` against a reachable 0.080% is 2.4 times. Its median p is 0.164–0.192 against 0.5, so
  the whole distribution is shifted, not just the tail. **This is a per-group rate on honest permuted
  data, before the layer sees it.**
- **Runs Test is mildly anti-conservative at `ALPHA.NOTE` and suppressed at `ALPHA.FLAG`.** 1.165%
  against 0.900% reachable is 1.3 times; 0.054% at `ALPHA.FLAG` against a reachable 0.000% for the
  scan arm is carried entirely by its other two arms. Median p 0.314–0.363, so the body is
  left-shifted like LOESS's, less far.

## 7. Readout 2 — pairwise dependence between group p-values

Spearman correlation of group *i*'s p against group *j*'s p across draws. Forty-eight figures, three
pairs per cell. Per-cell mean and range:

| file | caller | mean | min | max |
|---|---|---|---|---|
| DS01 | Autocorrelation | 0.0011 | −0.0087 | 0.0083 |
| DS01 | Runs Test | 0.0120 | 0.0054 | 0.0168 |
| DS01 | LOESS Residual Analysis | 0.0066 | −0.0047 | 0.0144 |
| DS01 | Regional Noise Homogeneity | 0.0010 | −0.0123 | 0.0223 |
| **DS02** | **Autocorrelation** | **0.2423** | 0.0218 | **0.6792** |
| **DS02** | **Runs Test** | **0.1633** | 0.0094 | **0.4457** |
| **DS02** | **LOESS Residual Analysis** | **0.2411** | −0.0209 | **0.7613** |
| **DS02** | **Regional Noise Homogeneity** | **0.0990** | −0.0267 | **0.3198** |
| DS16 | Autocorrelation | 0.0107 | 0.0041 | 0.0211 |
| DS16 | Runs Test | 0.0080 | −0.0142 | 0.0195 |
| DS16 | LOESS Residual Analysis | 0.0167 | 0.0023 | 0.0316 |
| DS16 | Regional Noise Homogeneity | −0.0014 | −0.0101 | 0.0112 |
| DS17 | Autocorrelation | 0.0077 | −0.0100 | 0.0246 |
| DS17 | Runs Test | 0.0122 | 0.0004 | 0.0278 |
| DS17 | LOESS Residual Analysis | −0.0179 | −0.0553 | 0.0155 |
| DS17 | Regional Noise Homogeneity | −0.0061 | −0.0267 | 0.0114 |

**On three of the four fixtures the dependence is indistinguishable from zero.** Every pair on DS01,
DS16 and DS17 lies between −0.055 and +0.032, on 4,000 draws.

**On DS02 the dependence is real, and it is confined to one pair of the three.** The full 48-figure
table shows `g1-g2` carrying all of it — LOESS 0.7613, Autocorrelation 0.6792, Runs 0.4457, Regional
Noise 0.3198 — while `g1-g3` and `g2-g3` sit between −0.027 and +0.035 on every caller.

The groups are `Control`, `Inhibitor_A`, `Inhibitor_B` in that order, so `g1-g2` is Control against
Inhibitor_A, and DS02's ground-truth row states its first mechanism as
`Inhibitor_A = Control × 0.58 + 0.008·N(0,1)` over all 35 rows. **The correlated pair is the rescaled
copy.** The second mechanism copies Control into Inhibitor_B on five scattered rows, and `g1-g3` shows
nothing.

So the mechanism proposed for the prediction — one row order applied to the whole matrix, so all three
groups compute on the same shuffle — **does not by itself induce dependence.** A shared shuffle
correlates two groups' order-dependent statistics only when the two groups' values are themselves
related. On honest data the column groups are independent and the p-values come out independent.

## 8. Readout 3 — the four arm quantities on real data

**The Šidák guard held on 98.2% to 100.0% of draws**, and on twelve of the sixteen cells it held on
every draw. The lowest readings are Runs Test on DS01 at 98.2% and on DS02 at 98.5%, which is the
predicted mechanism — Runs carries a sub-unit promotion arm that can lift its flag above what its own
p implies. So the corrected arm, not the bare maximum, is the one live on real data essentially
always. That is the opposite of Part 1's synthetic guard-failed branch, where a promotion on every
draw switched the correction off on 91–99% of them.

At `ALPHA.NOTE` = 0.01, nominal 1.0%:

| file | caller | guard | Fisher | group arm | bare max | combined |
|---|---|---|---|---|---|---|
| DS01 | Autocorrelation | 100.0% | 0.250% (0.079) | 0.200% (0.071) | 1.100% (0.165) | 0.425% (0.103) |
| DS01 | Runs Test | 98.2% | 2.300% (0.237) | 0.825% (0.143) | 2.275% (0.236) | 2.575% (0.250) |
| DS01 | LOESS | 99.8% | 10.600% (0.487) | 2.275% (0.236) | 6.225% (0.382) | 10.850% (0.492) |
| DS01 | Regional Noise | 100.0% | 0.875% (0.147) | 1.025% (0.159) | 2.875% (0.264) | 1.575% (0.197) |
| DS02 | Autocorrelation | 100.0% | 0.750% (0.136) | 0.150% (0.061) | 0.750% (0.136) | 0.850% (0.145) |
| DS02 | Runs Test | 98.5% | 4.100% (0.314) | 0.750% (0.136) | 2.575% (0.250) | 4.275% (0.320) |
| **DS02** | **LOESS** | 99.9% | **17.625% (0.602)** | 2.775% (0.260) | 6.800% (0.398) | **17.725% (0.604)** |
| DS02 | Regional Noise | 100.0% | 1.425% (0.187) | 0.675% (0.129) | 2.525% (0.248) | 1.625% (0.200) |
| DS16 | Autocorrelation | 99.9% | 0.350% (0.093) | 0.475% (0.109) | 1.450% (0.189) | 0.650% (0.127) |
| DS16 | Runs Test | 100.0% | 2.225% (0.233) | 0.925% (0.151) | 2.375% (0.241) | 2.400% (0.242) |
| DS16 | LOESS | 100.0% | 9.200% (0.457) | 2.000% (0.221) | 5.575% (0.363) | 9.375% (0.461) |
| DS16 | Regional Noise | 100.0% | 0.775% (0.139) | 0.800% (0.141) | 3.050% (0.272) | 1.250% (0.176) |
| DS17 | Autocorrelation | 100.0% | 0.325% (0.090) | 0.400% (0.100) | 1.250% (0.176) | 0.575% (0.120) |
| DS17 | Runs Test | 100.0% | 2.375% (0.241) | 0.850% (0.145) | 2.725% (0.257) | 2.675% (0.255) |
| DS17 | LOESS | 100.0% | 8.575% (0.443) | 1.875% (0.214) | 5.650% (0.365) | 8.825% (0.449) |
| DS17 | Regional Noise | 100.0% | 1.150% (0.169) | 0.900% (0.149) | 3.200% (0.278) | 1.500% (0.192) |

At `ALPHA.FLAG` = 0.001, nominal 0.1%, the same shape: LOESS's Fisher arm reads 0.700% to 4.550%,
Runs 0.100% to 0.825%, Regional Noise 0.075% to 0.275%, Autocorrelation 0.000% to 0.200%.

Two structural readings hold on every cell. **The combined flag equals the Fisher flag or sits barely
above it** wherever Fisher is the larger arm, which is all sixteen cells for LOESS and Runs. And **the
bare maximum runs two to three times the corrected arm** — 1.100% against 0.200% for Autocorrelation
on DS01, 2.875% against 1.025% for Regional Noise — which is the multiplicity the Šidák correction is
there to remove, visible as the gap between two published columns.

The layer's own consistency was re-checked on every draw: the combined flag differed from
`max(Fisher, group arm)` **0 times in 64,000 aggregate calls**.

## 9. Readout 3b — Fisher on raw p against Fisher on PIT-transformed p

Each group's p is transformed through its own empirical null, built on one half of the draws and
evaluated on the other so the transform is never fitted on the point it scores; both folds are used.
Fisher is then recomputed with the shipped `chiSquaredP` and `flagFromP`. The raw column measures what
the tool does; the PIT column measures what the dependence alone does, and is the arm comparable to
Part 1's grid.

**The transform is discrete and its own nominal is stated beside the rate.** With `m = 2,000` training
draws the transformed value is `k/2001`, so the reachable rate is `2/2001 = 0.0999%` at `ALPHA.FLAG`
and `20/2001 = 0.9995%` at `ALPHA.NOTE` — both within a part in a thousand of the nominal. This is the
incidental benefit of the reduction to 4,000 draws: at 5,000 the split gives `m = 2,500` and
`2/2501 = 0.0800%`, a 20% distortion at `ALPHA.FLAG`. The finer arithmetic came free with the smaller
count.

| file | caller | Fisher raw @NOTE | Fisher PIT @NOTE | Fisher raw @FLAG | Fisher PIT @FLAG |
|---|---|---|---|---|---|
| DS01 | Autocorrelation | 0.250% (0.079) | 1.075% (0.163) | 0.000% | 0.125% (0.056) |
| DS01 | Runs Test | 2.300% (0.237) | 0.825% (0.143) | 0.175% (0.066) | 0.075% (0.043) |
| DS01 | LOESS | 10.600% (0.487) | **0.875% (0.147)** | 1.425% (0.187) | 0.050% (0.035) |
| DS01 | Regional Noise | 0.875% (0.147) | 0.875% (0.147) | 0.075% (0.043) | 0.075% (0.043) |
| DS02 | Autocorrelation | 0.750% (0.136) | **2.425% (0.243)** | 0.200% (0.071) | 0.525% (0.114) |
| DS02 | Runs Test | 4.100% (0.314) | **2.000% (0.221)** | 0.825% (0.143) | 0.325% (0.090) |
| DS02 | LOESS | 17.625% (0.602) | **2.150% (0.229)** | 4.550% (0.330) | 0.500% (0.112) |
| DS02 | Regional Noise | 1.425% (0.187) | **1.500% (0.192)** | 0.275% (0.083) | 0.300% (0.086) |
| DS16 | Autocorrelation | 0.350% (0.093) | 1.100% (0.165) | 0.025% (0.025) | 0.075% (0.043) |
| DS16 | Runs Test | 2.225% (0.233) | 1.050% (0.161) | 0.100% (0.050) | 0.100% (0.050) |
| DS16 | LOESS | 9.200% (0.457) | **0.925% (0.151)** | 0.950% (0.153) | 0.075% (0.043) |
| DS16 | Regional Noise | 0.775% (0.139) | 0.750% (0.136) | 0.075% (0.043) | 0.025% (0.025) |
| DS17 | Autocorrelation | 0.325% (0.090) | 0.775% (0.139) | 0.025% (0.025) | 0.025% (0.025) |
| DS17 | Runs Test | 2.375% (0.241) | 1.125% (0.167) | 0.275% (0.083) | 0.050% (0.035) |
| DS17 | LOESS | 8.575% (0.443) | **0.675% (0.129)** | 0.700% (0.132) | 0.100% (0.050) |
| DS17 | Regional Noise | 1.150% (0.169) | 0.725% (0.134) | 0.100% (0.050) | 0.050% (0.035) |

**On the three fixtures with no dependence, the PIT arm collapses to nominal on every caller.** LOESS
goes from 8.575–10.600% to 0.675–0.925% against a 0.9995% reachable nominal. Runs goes from
2.225–2.375% to 0.825–1.125%. Autocorrelation goes the other way, from 0.250–0.350% up to
0.775–1.100%, because its marginal is conservative and the transform removes that too. Regional Noise
barely moves, because its marginal was already calibrated.

**On DS02 the PIT arm stays above nominal on all four callers** — 1.500% to 2.425%, so 1.5 to 2.4
times. That residue is the dependence, and DS02 is the only fixture that has any.

**The gap between the two columns is the marginal contribution, and on honest data it is the whole
of the inflation.** LOESS on DS01: 10.600% raw, 0.875% after the transform. Nothing is left for
dependence to explain, and readout 2 independently found none.

**The limit, per caller rather than as a blanket caveat.** The transform cannot remove an atom sitting
on a threshold. Regional Noise's `primaryP` is a permutation p on the lattice `k/5000` and nothing
else, so its transformed value inherits ties and the PIT arm is approximate there; the same holds for
the permutation component of Runs and of LOESS. Autocorrelation's `primaryP` is a BH minimum over
continuous analytic p-values with no atoms, so its PIT arm is exact. In practice the tie mass is small
— the lattice has 5,000 points and 4,000 draws spread across it — but the approximation is real and it
is not the same for all four.

## 10. Readout 4 — the P41 replication

`SESSION339-SUMMARY.md:83` reports **19.20%** for DS02, LOESS Residual Analysis, Fisher arm alone, and
that is a rate at `ALPHA.NOTE`, measured over 500 draws of the same whole-matrix row permutation.

**This instrument reads 17.625% (standard error 0.602) on that exact cell.** The difference is 1.575
percentage points. At 500 draws the earlier figure carries a standard error near 1.76 points, so the
two differ by about 0.85 combined standard errors. **The replication holds.**

## 11. The reconciliation, and its stated limit

For each cell, the Part 1 grid is read at the matching dependence rung and at three groups, which is
the group count every one of these fixtures carries.

**DS01, DS16 and DS17** sit at the ρ = 0 rung on the section 5 table, on either p convention. The grid
at three groups predicts a Fisher rate of **0.993%** (one-sided) or **1.007%** (two-sided) at
`ALPHA.NOTE`. The measured PIT Fisher rates are **0.675% to 1.125%** across all twelve cells. **The
reconciliation is clean and it can be quoted**, because the transform has made the marginals uniform
and readout 2 puts the dependence at zero. The raw rates on the same cells run from 0.250% to 10.600%,
and every part of that spread is marginal calibration.

**DS02 is not on the grid at all, and the record should not pretend otherwise.** Its structure is one
correlated pair out of three, where the grid's construction is exchangeable — all three pairs at the
same value. Read naively, LOESS's 0.7613 on the correlated pair sits between the one-sided rungs 0.7
(0.6816) and 0.8 (0.7853), at about ρ = 0.78, where the grid predicts roughly 5.0% at `ALPHA.NOTE`.
The measured PIT rate is 2.150%. **The naive reading over-predicts by about 2.3 times, in the
direction the structure predicts**, because two of the three pairs carry no dependence at all and the
exchangeable rung assumes all three do.

**And the grid cannot reach P41's number by dependence alone.** At three groups the grid's Fisher rate
at `ALPHA.NOTE` tops out at **5.592%** at ρ = 0.9, one-sided. The measured raw rate on that cell is
17.625%. The PIT arm attributes 2.150% of it to dependence. **So P41's inflation is mostly LOESS's own
marginal calibration and not the layer's treatment of correlated groups** — which is the opposite of
what the tidy reading would have concluded.

**The limit, stated as required.** The grid's prediction assumes uniform marginals, and readout 1
measures whether that holds. It does not hold for three of the four callers: LOESS runs 2.3 times
nominal per group, Runs 1.3 times, Autocorrelation 0.38 times. Where it does not hold, the gap between
predicted and measured is expected and is **not** evidence about the layer. **The two must not be
combined into a single shipped false-positive rate.** Regional Noise is the one caller whose marginal
came back calibrated, so it is the one whose reconciliation is clean without the transform.

## 12. Pre-registered expectations against outcomes

| prediction | outcome |
|---|---|
| Dependence comes back high, Spearman above 0.7 on most pairs, from the shared shuffle | **Disagrees.** 36 of 48 pairs lie between −0.055 and +0.032. High values appear on exactly 4 pairs, all on DS02, all the same pair, and they trace to the planted rescaled copy rather than to the shuffle. A shared row order does not correlate two groups whose values are unrelated. |
| Raw Fisher above PIT Fisher on at least some callers | **Holds, on 13 of 16 cells**, and the exceptions are informative: Autocorrelation's raw sits *below* its PIT rate on DS01, DS16 and DS17 because its marginal is conservative. Direction was not predicted per caller and it does differ per caller. |
| The Šidák guard holds on close to all draws | **Holds.** 98.2% to 100.0%, and 100.0% on twelve of sixteen cells. The two lowest are Runs Test, which carries a promotion arm. |

The first prediction's own stated risk was that it was tidy and landed where it was wanted, near the
ρ = 0.9 rung, which would have reconciled P41. It did not land there, and P41 reconciles by a
different route.

## 13. What this settles and what it does not

It settles how four shipped callers' group p-values behave under one valid null on four fixtures, and
it separates the marginal contribution from the dependence contribution on the Fisher arm.

It does not settle what real deposits do. It does not settle what the fix is. And it says nothing
about Exact Duplicate Detection or Selective Noise Partitioning, whose statistics this null cannot
move.

## 14. Reproducing

```bash
node test/probes/probe-s369-null-correlation.mjs --fixtures
node test/probes/probe-s369-null-correlation.mjs --rungs
node --import ./test/probes/s369-arm-flags-hook.mjs test/probes/probe-s369-null-correlation.mjs --anchor
DRAWS=10 node --import ./test/probes/s369-arm-flags-hook.mjs test/probes/probe-s369-null-correlation.mjs --inert
DRAWS=4000 node --import ./test/probes/s369-arm-flags-hook.mjs test/probes/probe-s369-null-correlation.mjs --measure
```

`--measure` is 1,605 seconds at 4,000 draws. `SKIP=` overrides the default exclusion of the two
invariant callers. Output lands in `test/probes/out-s369/`, which is gitignored and does not survive a
worktree teardown; the run is deterministic given its seeds, so regenerating is safe.

**The dispatch replica is checked before anything is trusted.** `--anchor` compares the direct
`aggregatePerGroup` calls against `runFullAnalysis` on `flag`, `groupsAssessed`, `groupsFlagged`,
`fisherChi`, `fisherDF`, `fisherP`, `worstGroupFlagRaw`, `groupMinP`, `groupMinPAdj` and
`multiplicityCorrected`: **24 of 24 cells identical, 0 mismatched.** The scheduling shim is
byte-identical against the conventional stand-in on real test functions.

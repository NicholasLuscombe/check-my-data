# S342 — Clean-Corpus Gate Classification (P50)

**Status:** measurement. The probe (`test/probes/probe-s342-clean-gates.mjs`) imports the engine and
reads what it returns; it re-implements no test. Default seed, one run — the tool is deterministic
per file, so one run is what a user actually sees.

> **Updated — the blind spot is closed. §3 is rewritten; §1, §2, §4 and §5 stand unchanged.**
>
> The first pass of this report was read-only and left 19 clean-corpus cells unmeasurable, because
> three tests destroyed the pre-gate p before it reached the returned object. Those three now publish
> `primaryPUngated` and `nGateSuppressed` — an additive change at three sites in `src/tests/`, with
> no tier logic touched and no existing published value moved. The readable set went from 91 cells to
> **110 of a possible 144**, and nothing is unreadable any more.
>
> **The headline did not move: still 5 cells, 5 fixtures, 4 tests.** None of the 19 turned out to be
> a gate-saved cell. That inverts the expectation the instrumentation was built on, and §3 now says
> why it is the more interesting answer.

> **Followed by `SESSION342-BAND-COUNTERFACTUAL.md`**, which takes the five gate-saved cells below
> through the shipped `computeSeverity()` and finds that **all five move their fixture's band** — the
> gates are protecting file verdicts, not only cards. It also sizes the 34 non-running cells, runs the
> same gates against the fabricated corpus (two suppressed detections, one inside a planted
> mechanism), and corrects §4d here: two of the seven gates listed as requiring N ≥ 500 count cells
> rather than rows and have been firing on clean fixtures all along, one of them at 35 rows.

**Why this pass exists.** At S341, `09-proteomics-clean` reached the Benford p floor and was stopped
only by the `mad < 0.015` gate firing ahead of the p. One fixture doing that is an anecdote. If
several clean fixtures carry the same shape, the gates are holding the tool together and the
underlying tests are unfit for this domain without them. If almost none do, the gates are doing very
little. V1X §5.4's framing turns on which it is.

**Why this pass exists.** At S341, `09-proteomics-clean` reached the Benford p floor and was stopped
only by the `mad < 0.015` gate firing ahead of the p. One fixture doing that is an anecdote. If
several clean fixtures carry the same shape, the gates are holding the tool together and the
underlying tests are unfit for this domain without them. If almost none do, the gates are doing very
little. V1X §5.4's framing turns on which it is.

---

## Headline

**Chat's expectation is confirmed, and it is not close.** Five clean fixtures out of eight carry a
cell where the test computed a p that flags under its own ladder and emitted LOW because a gate
suppressed it. Four distinct tests do this. The Benford case is a specimen of a pattern, not a
one-off.

Three findings sit alongside that and change how it should be read.

**1. Every save came from a gate with no N precondition.** No clean fixture reaches 500 rows — the
largest is 400. Seven of the eighteen gated tests carry a gate that cannot fire below `nR >= 500`,
so across the entire clean corpus those seven gates are structurally inert. All five saves come from
the eleven unconditional gates. **§5.4 is scoped to the N ≥ 500 regime, and the clean corpus supplies
no evidence about that regime in either direction.** The measurement answers the question §5.4 asks
about gates in general; it cannot answer the question §5.4 asks about large N, because the corpus
has no large clean fixture.

**2. Three of the five saved p-values sit at their test's representable floor.** Benford at 1/5001,
Excess Kurtosis at 1/2000, Entropy at 2/1000. These are not p-values that happen to be small; they
are the smallest number the construction can emit. The true p is somewhere at or below them and the
grid cannot say where.

**3. Nineteen cells are unmeasurable.** Three gated tests destroy the pre-gate p before it reaches
the returned object. On the clean corpus that blind spot is nineteen cells — roughly four times the
size of the confirmed finding. The headline count is a floor, not a total.

---

## 1. The three headline counts, each with its rule

| count | value | rule |
|---|---|---|
| **cells** | **5** | one cell = one (clean fixture × gated test) pair where the test ran (flag ≠ N/A), its pre-gate p is recoverable from the returned object, `tier(p) ≠ LOW` under that test's own ladder, and the emitted flag is LOW |
| **fixtures** | **5** | distinct clean fixtures carrying ≥ 1 such cell |
| **tests** | **4** | distinct tests carrying ≥ 1 such cell |

Denominators, so the rates are readable: **8** clean fixtures, **18** gated tests, **91** readable
cells (a gated test ran, did not return N/A, and its pre-gate p could be read back). Five of 91
readable cells were saved; five of eight fixtures carry one; four of the 18 gated tests produced one.

Fixtures: `07-elisa-clean`, `09-proteomics-clean`, `12a-uniform-mixture-clean`,
`17-densitometry-carlisle-clean`, `vfs-a-pigeonhole-clear`.
Tests: Baseline Balance (×2), Benford's Law (First Digit), Excess Kurtosis, Entropy / Zipf Analysis.

The three fixtures with no saved cell are `01-densitometry-clean`, `03-qpcr-clean`,
`05-cellcount-clean` — the three smallest, at 35, 50 and 55 rows.

---

## 2. The five gate-saved cells

| fixture | rows | test | pre-gate p | tier(p) | emitted | gate that fired | gate statistic |
|---|---|---|---|---|---|---|---|
| `17-densitometry-carlisle-clean` | 60 | Baseline Balance | 1.409e-4 | **HIGH** | LOW | `excessFrac < 0.50` `carlisleBalance.js:151-153` | 3 of 60 features excess → 0.05 |
| `09-proteomics-clean` | 400 | Benford's Law (First Digit) | 1.9996e-4 | **HIGH** | LOW | `mad < 0.015` `benford.js:93` | MAD 0.0132, Nigrini "Marginal" |
| `vfs-a-pigeonhole-clear` | 180 | Excess Kurtosis | 5.0e-4 | **HIGH** | LOW | `kurtosis.js:380-383` | κDev 0.4185 vs threshold 0.7157 |
| `07-elisa-clean` | 65 | Entropy / Zipf Analysis | 2.0e-3 | MODERATE | LOW | per-column `\|ratio−1\| ≥ 0.15` `entropyTest.js:134,137` | 3 cols at 0.096 / 0.112 / 0.093 |
| `12a-uniform-mixture-clean` | 400 | Baseline Balance | 2.898e-3 | MODERATE | LOW | `excessFrac < 0.50` `carlisleBalance.js:151-153` | 0 of 6 features excess → 0.00 |

Three would have been HIGH. Two would have been MODERATE. All five emitted LOW.

**On the two Baseline Balance cells — the p and the gate statistic come from different evidence.**
`primaryP = Math.min(binomP, ksP)` (`carlisleBalance.js:144`) with no multiplicity correction of any
kind, and both arms are computed from the same `featurePValues` array. The gate statistic
`excessFrac = nExcess / nFeatures` (`:150`) counts only the binomial arm's evidence — features with
`p > 0.95`. On both saved cells the flagging p came **entirely from the KS arm**: `12a` had
`binomP = 1, ksP = 2.898e-3` with 0 of 6 features excess, and `17-densitometry` had
`binomP = 0.616, ksP = 1.409e-4` with 3 of 60. So in both cases a KS finding — non-uniformity
anywhere in the ECDF — was suppressed by a statistic that only measures the upper tail. The gate is a
valid effect-size measure for the binomial arm and is not one for the KS arm. Full read at §6.

**On the Excess Kurtosis cell.** The result publishes `esGateMode: "directional (leptokurtic,
informational)"`, which reads as though only the direction arm held it down. It did not. The two arms
are ORed at `kurtosis.js:382` and `esGateMode` reports whichever it checks first. The magnitude arm
fires here independently: `|κDev| = 0.4185 < adaptiveThreshold = 0.7157`. So this is a genuine
magnitude-gate save and it counts under the strictest reading of "effect-size gate". A reader taking
`esGateMode` at face value would wrongly exclude it. **This is a real reporting defect in a published
field — named, not fixed.**

### Proximity to the threshold, and what a different draw could do

The dispatch asks for gate-saved cells whose p sits within a factor of two of the tier it would have
crossed. Strictly, **none are** — the closest is exactly at a factor of two.

| cell | p | threshold it would have crossed | factor |
|---|---|---|---|
| `vfs-a` / Excess Kurtosis | 5.0e-4 | 1e-3 | **2.00** |
| `12a` / Baseline Balance | 2.898e-3 | 1e-2 | 3.45 |
| `07-elisa` / Entropy | 2.0e-3 | 1e-2 | 5.00 |
| `09-proteomics` / Benford 1st | 1.9996e-4 | 1e-3 | 5.00 |
| `17-densitometry` / Baseline Balance | 1.409e-4 | 1e-3 | 7.10 |

The factor is the wrong instrument here, because three of these p-values are pinned at their test's
floor and cannot move down at all. Reading each on its own terms:

- **Both Baseline Balance cells are analytic** — `min(binomP, ksP)`, no resampling. Fully
  deterministic, no seed dependence whatsoever.
- **Benford 1st** sits at `(0+1)/5001`. One more exceedance takes it to 2/5001 = 4.0e-4, still HIGH.
  The p-alone tier is seed-robust.
- **Entropy** sits at its floor of 2/1000. One more exceedance gives 4.0e-3, still MODERATE. Robust.
- **Excess Kurtosis** sits at `(0+1)/2000`. One more exceedance gives exactly 1e-3, which is **not**
  `< ALPHA.FLAG` — so this cell's p-alone tier can move HIGH → MODERATE on a different draw. It
  cannot reach LOW.

**No gate-saved cell can be dissolved by a different draw.** All five remain non-LOW-on-the-p at any
seed; one changes which non-LOW tier it would have been. This was measured at the default seed only,
as instructed — the statements above are read off each test's p construction, not from a seed sweep.

---

## 3. The blind spot, opened and closed — 19 cells, none of them a save

Three gated tests destroyed the pre-gate p before it reached the returned object, so for 19
clean-corpus cells the question "would it have flagged on the p alone?" could not be answered from
outside `src/`. All three now publish the counterfactual.

### 3a. The instrumentation

Each of the three publishes two new fields, unconditionally, on every result:

- **`primaryPUngated`** — what `primaryP` would be with the effect-size gate expression deleted and
  nothing else changed. Equal to `primaryP` when nothing was gated.
- **`nGateSuppressed`** — how many units the effect-size gate alone removed, so the field above is
  interpretable. No site published such a count before; each needed a new one.

Nothing reads either field. No tier logic changed, no threshold or resample count moved, no dispatch
key was renamed.

**The BH difficulty turned out to exist at one site of the three, not all three.** The concern was
that `primaryP` is a BH-adjusted minimum, so substituting a real p for a `1.0` placeholder reorders
the ranks and the counterfactual cannot be patched in after the fact. That is true only where the
gate acts *upstream* of the correction:

| test | site | where the gate sits relative to BH | what the counterfactual required |
|---|---|---|---|
| Selective Noise Partitioning (stratified path) | `selectiveNoise.js:176` | **upstream** — placeholders enter the family | a **second BH pass** over the real p-values: same family size, same order, no placeholders, no exclusions |
| Selective Noise Partitioning (single-run path) | `selectiveNoise.js:241` | no family at all | nothing — `primaryP` is already the raw Bartlett p, so ungated equals it |
| Cross-Condition Consistency | `crossConditionConsistency.js:618` | **downstream** — the three per-stage `bhFDR` calls run over every unit before either mechanism is consulted | re-selection only, no recomputation |
| Value-Frequency Spike | `valueFrequencySpike.js:488, :505` | **downstream** — the union `bhFDR` and the deep-tail `bhFDR` both run over every tested entry before the filter | re-selection only, no recomputation |

**No family size changed at any site.** For Value-Frequency Spike in particular — the case flagged in
advance as the likely one — the gate filters *already-adjusted* values, so the BH family
(`allTested`, plus the separate deep-tail family) keeps its exact size and ranks. What the gate
changes is which adjusted values are eligible to be the minimum, not the values themselves. The
family size used is therefore the shipped one, unmodified.

**Two sites tangle two mechanisms, and both separate cleanly.** Cross-Condition Consistency
neutralises a unit for gate failure (`gatePassed`, a magnitude filter) and for wrong direction
(`forensic`, a one-sided test); Value-Frequency Spike has the ratio gate (`passesEffect`, magnitude)
and the near-dup keep-path (`isNearDup`, a discriminator on the kind of spike). At both sites the two
are separate predicates joined by `&&`, so `primaryPUngated` drops only the magnitude filter and
leaves the other in place. Nothing had to be guessed and nothing is entangled.

### 3b. The result — the headline does not move

| | before | after |
|---|---|---|
| readable cells | 91 | **110** (of a possible 144) |
| unreadable cells | 19 | **0** |
| gate-saved cells | 5 | **5** |
| fixtures | 5 | **5** |
| tests | 4 | **4** |

**None of the 19 newly readable cells is a gate-saved cell.** Every one has `tier(p) = LOW` on the
ungated p. The counting rules are unchanged from §1.

This inverts the expectation the instrumentation was built on, and the reason is not that the gates
sat idle. They fired on 8 of the 19 cells, and on 3 they moved the reported p by a wide margin:

| fixture | test | shipped `primaryP` | `primaryPUngated` | units gated |
|---|---|---|---|---|
| `09-proteomics-clean` | Selective Noise Partitioning | 1 | 0.2558 | 2 (all conditions) |
| `12a-uniform-mixture-clean` | Selective Noise Partitioning | 1 | 0.2941 | 2 (all conditions) |
| `12a-uniform-mixture-clean` | Cross-Condition Consistency | 0.5160 | 0.3240 | 5 |

On the other five gated cells the suppressed units were not the minimum, so the published p was
already the ungated one. The gates are doing real work at these three sites — they are simply doing
it a long way from any flagging threshold. Nothing here comes within an order of magnitude of
`ALPHA.NOTE = 0.01`.

The nearest miss among all 19 is Cross-Condition Consistency on `09-proteomics-clean` at
**p = 0.012**, which is 1.2× above the MODERATE threshold and was *not* gate-suppressed at the
minimum — it is simply not significant.

**Value-Frequency Spike's gate never fired at all.** `nGateSuppressed = 0` on all seven clean
fixtures, and `primaryPUngated = 1` on all seven: with the ratio gate removed, no tested entry on any
clean fixture clears the `adjP < ALPHA.NOTE` significance cut in the first place. On this corpus the
significance cut alone excludes everything and the effect-size gate is entirely inert. That is a
stronger statement than "the gate fired but the p was LOW anyway", and it applies to the whole clean
corpus.

### 3c. What this means for the shape of the finding

The eleven test-level gates produced all five saves. The three unit-level gates produced none. So the
split named in the first pass of this report — that unit-level gating is what makes a gate invisible
to measurement — turns out to track a real behavioural difference and not only a reporting one:

- **A test-level gate** sits between a single computed p and the tier. When it fires, it is by
  construction suppressing a p that was extreme enough to be worth suppressing.
- **A unit-level gate** removes members from a family before or after correction. Its effect on the
  test-level minimum is indirect, and on this corpus it lands on units that were nowhere near
  significant.

That is a claim about the clean corpus at its current sizes, not a general one. It is worth holding
lightly for the same reason §1 gives: no clean fixture reaches 500 rows, and three of these unit
gates are among the seven that require `nR >= 500` (or `b.N >= 500`, or `nMin >= 500`) before they
can fire at all.

### 3d. A correction to the first pass of this report

The first pass classified Selective Noise Partitioning as unrecoverable on all seven fixtures. That
was too broad. Selective Noise has two paths and only the stratified one destroys the p — the
single-run path publishes `primaryP: b.pBartlett`, the raw Bartlett p, gate or no gate. **Four of the
seven cells took the single-run path and were readable all along:** `01-densitometry`, `05-cellcount`,
`07-elisa`, `17-densitometry`. Only three (`03-qpcr`, `09-proteomics`, `12a`) took the stratified
path, and only two of those had anything gated.

So the blind spot was 19 cells as *the probe measured it* and 15 as the code actually stood. The
probe's `ungatedP: () => null` was applied per test where the code branches per path, and a per-test
classification cannot see a two-path test. Corrected in the probe.

The general lesson is worth keeping: a recoverability audit has to be run against the *return sites*,
not the test. A test with two return paths can be recoverable on one and not the other, and reading
only the gate expression will not show that.

---

## 4. Classification — all 29 tests

Built fresh from the modules. Dispatch key is the string in the `tests` array in `engine.js`; result
name is what the test puts in `r.name`. Where they differ, both are given — the difference is
load-bearing (`CLAUDE.md`, PERF-instrument note).

"Where" is one of: **ladder** (the gate is a branch inside the tier ladder), **pre-tier** (p computed,
gate consulted before the tier is assigned), **post-tier** (tier assigned, then demoted), **unit**
(the gate acts on sub-units before they are aggregated into the test-level p).

Every ladder in the battery uses the same two constants — `ALPHA.FLAG = 0.001`, `ALPHA.NOTE = 0.01`
(`thresholds.js:22-25`). They differ in which p they consume and in what promotion or cap steps
follow. `FFP` = `flagFromP` (`thresholds.js:38`); "hand" = a locally written ladder over the same two
constants.

### 4a. The 18 tests with an effect-size gate

| dispatch key | result name | gate statistic | threshold | file:line | where | p recoverable? | ladder / p consumed |
|---|---|---|---|---|---|---|---|
| `Benford's Law` | Benford's Law (First Digit) | MAD | `0.015` inline literal, fixed | `benford.js:93` | ladder | **yes** — `primaryP` | hand `:93-96`, raw pMAD |
| `Benford's Law (2nd Digit)` | Benford's Law (Second Digit) | MAD | `0.008` inline literal, fixed | `benford2.js:127` | ladder | **yes** — `primaryP` | hand `:127-130`, raw pMAD |
| `Value-Frequency Spike` | Value-Frequency Spike | per-spike `ratio`; near-dup keep-path | `ratio >= 2.0`; `NEAR_DUP_*` | `:488, :496, :505` | unit | **no** | FFP `:529-530`, BH-adj; max of two pass tiers |
| `Inter-Replicate Correlation` | Inter-Replicate Correlation | `allHighSNR`; per-pair `excess` | SNR; `0.05` at n≥500 else `0.01` | `:283`; `:156` | ladder | **partly** — `primaryP` present, counterfactual approximate | hand `:282-307`, BH-adj + window max |
| `Constant-Offset Blocks` | Constant-Offset Blocks | `blockRate` | `< 0.01`, **only when nR ≥ 500** | `constantOffset.js:102` | pre-tier | **yes** — `primaryP` | FFP `:103`, permP + MOD promotion |
| `Baseline Balance` | Baseline Balance | `excessFrac` | `< 0.50`, no N precondition | `carlisleBalance.js:151-153` | **post-tier** | **yes** — `primaryP` | FFP `:145`, `min(binomP, ksP)` |
| `Cross-Condition Consistency` | Cross-Condition Consistency | per-property `effectSizeGate` | per-property; **only when nMin ≥ 500** unless `gateAlwaysEvaluates` | `:602`, `:618` | unit | **no** | FFP `:620`, BH-adj per stage |
| `Mahalanobis Row Outlier` | Mahalanobis Row Outlier | `nOutliers`; `exceedFrac` | `nOut === 0`; `< 2·ALPHA_BIN` | `mahalanobis.js:180-181` | ladder | **yes** — `primaryP` | hand `:180-185`, binomP |
| `Kurtosis` | Excess Kurtosis | `kurtDeviation` (direction **or** magnitude) | `>= 0`, **or** `\|κDev\| < max(0.20, 1.96·√(24/N))` | `kurtosis.js:380-383` | pre-tier | **yes** — `pooledP` | FFP `:383`, pooledP + cond promotion |
| `Entropy / Zipf Analysis` | Entropy / Zipf Analysis | per-column `\|ratio − 1\|` | `RATIO_GATE = 0.15` `:134` | `:137` | unit | **yes** — `primaryP` is the **ungated** min `:141` | FFP `:146`, BH-adj over gated subset |
| `Column Goodness-of-Fit` | Column Goodness-of-Fit | per-column `ratio` | `RATIO_HIGH`/`RATIO_LOW` | `columnGof.js:229-231` | unit | **yes** — `primaryP` ungated `:234` | FFP `:236`, BH-adj over gated subset |
| `Modality Test` | Modality Test | per-column `D_obs` | `DIP_GATE = 0.04` `:54` | `modality.js:247` | unit | **yes** — `primaryP` ungated `:250` | FFP `:252`, BH-adj over gated subset |
| `Autocorrelation` | Autocorrelation | `\|pooledMeanR1\|` | `< AUTOCORR_STRONG = 0.25`, **only when nR ≥ 500** | `autocorrelation.js:88` | pre-tier | **yes** — `primaryP` | FFP `:107`, BH-adj minAdjP + 2 promotions |
| `Runs Test` | Runs Test | `runsRatio` | `> 0.70`, **only when nR ≥ 500** | `runs.js:206` | pre-tier | **yes** — `minAdjP` | FFP `:215`, BH-adj minAdjP + window promotion |
| `Within-Row Variance` | Within-Row Variance | `nSmooth`, `smoothFrac` | `nSmooth < 3 \|\| smoothFrac < 0.01`, no N precondition | `withinRowVariance.js:154-156` | **post-tier** | **yes** — `primaryP` | FFP `:147-150`, `min(globalP, windowScanP)` |
| `LOESS Residual Analysis` | LOESS Residual Analysis | `bestVarRatio` | `< 2.0`, **only when nR ≥ 500** | `loessResidual.js:219` | pre-tier | **yes** — `scanP`, `cusumP` both published | FFP `:223-227`, `max` of the two tiers |
| `Selective Noise` | Selective Noise Partitioning | per-block variance `ratio` | `< 3.0`, **only when block N ≥ 500** | `selectiveNoise.js:174, :234` | unit | **no** | FFP `:196`, BH-adj minAdjP |
| `Regional Noise Homogeneity` | Regional Noise Homogeneity | `bestVarRatio` | `< 2.0`, **only when nR ≥ 500** | `regionalNoise.js:185` | pre-tier | **yes** — `primaryP = scanP` | FFP `:186`, scanP + col promotion |

**Adaptivity.** One threshold in the battery is adaptive: Excess Kurtosis's
`max(0.20, 1.96·√(24/pooledN))` (`kurtosis.js:379`). It **stops being adaptive above pooledN ≈ 2305**,
where `1.96·√(24/N)` falls under the `0.20` floor and the floor takes over. Below that the threshold
rises as N falls — at pooledN = 180 (`vfs-a`) it is 0.7157, more than three times the floor. Every
other gate threshold in the battery is a fixed constant.

### 4b. The 11 tests with no effect-size gate

| dispatch key | result name | file:line | ladder / p consumed |
|---|---|---|---|
| `Duplicate Detection` | Exact Duplicate Detection | `duplicateDetection.js:810` | FFP, BH-adj min over 5 sub-tests |
| `Sequential Duplication` | Sequential Duplication | `sequentialDuplication.js:171` | FFP, min `pAdj` over kept sequences |
| `Residual Spike Correlation` | Residual Spike Correlation | `residualSpikeCorrelation.js:207` | FFP, raw permP |
| `Terminal Digit Uniformity` | Terminal Digit Uniformity | `terminalDigits.js:55, :59` | FFP, raw χ² p (9- or 10-digit branch) |
| `Decimal Precision` | Decimal Precision Consistency | `decimalPrecision.js:104` | FFP, BH-adj min over dp levels |
| `Noise Scaling With Measurement Size` | Noise Scaling With Measurement Size | `meanVariance.js:118`; hand `:125-127` | two branches, same two constants |
| `Windowed Autocorrelation` | Windowed Autocorrelation | `windowedAutocorrelation.js:200` | FFP, BH-adj minAdjP |
| `Row-Mean Runs` | Row-Mean Runs | `rowMeanRuns.js:106` | FFP, `globalBestP` + window promotion |
| `Blocked Mahalanobis` | Blocked Mahalanobis | `blockedMahalanobis.js:597` | FFP, BH-adj min over units |
| `Missing Data Pattern` | Missing Data Pattern | `missingDataPattern.js:172` | FFP, BH-adj minAdjP |
| `Cross-Condition Rank Corr.` | Cross-Condition Rank Correlation | `rankCorrelation.js:101` | FFP, BH-adj min — **then capped, see below** |

`Residual Spike Correlation` imports `EFFECT_SIZE` but uses it only for the display field
`highCorrelation` at `:202`. It is not a gate.

`Missing Data Pattern` and `Column Goodness-of-Fit` / `Modality Test` carry **applicability**
pre-skips (missing-rate bounds; `SKEW_GATE`, `EXKURT_GATE_HIGHN`). Those return N/A rather than
demoting a tier, so they are not effect-size gates in the sense this pass classifies. Recorded so the
distinction is on the record.

### 4c. Unconditional tier caps — exactly one

`Cross-Condition Rank Correlation` caps HIGH → MODERATE unconditionally at
`rankCorrelation.js:102-103` (`flagRankCap`). It is not a gate: it does not consult any magnitude
statistic and it fires on every run. It is the only such cap in the battery — a grep for cap-shaped
constructs across all 30 files in `src/tests/` returns this site and nothing else (the other hits are
array-size caps in `kurtosis.js` and `duplicateDetection.js`).

### 4d. The split that matters for §5.4

| | count | tests |
|---|---|---|
| gate fires at any N | **11** | Benford 1st, Benford 2nd, VFS, IRC, Baseline Balance, Mahalanobis Row Outlier, Excess Kurtosis, Entropy, Column GoF, Modality, Within-Row Variance |
| gate requires N ≥ 500 | **7** | Constant-Offset, Cross-Condition Consistency, Autocorrelation, Runs, LOESS, Selective Noise, Regional Noise |
| no gate | **11** | see 4b |

**All five saves came from the first row.** The middle row — seven tests — did nothing on the clean
corpus, and could not have, because the corpus tops out at 400 rows.

---

## 5. What contradicts the prompt, and what contradicts V1X §5.4

### The prompt's expectation held

The dispatch asked for a plain statement if the count came back at zero or one. It did not. Five
cells across five fixtures and four tests is a pattern, and the prompt's stated expectation —
"several clean fixtures, more than one test" — is confirmed on both clauses.

### V1X §5.4's census is wrong in both directions, and by more than S341 recorded

§5.4 gap 1 names six tests as lacking calibrated effect-size gates at N ≥ 500: First-Digit
Frequencies, Last-Digit Frequencies, Runs, Row-Mean Runs, Decimal Places, Mean-Variance. Checked
against source:

| §5.4 name | this pass | verdict |
|---|---|---|
| First-Digit Frequencies | gates at `mad < 0.015` `benford.js:93` | **wrong** |
| Runs | gates at `nR >= 500 && runsRatio > 0.70` `runs.js:206` | **wrong** |
| Last-Digit Frequencies (Terminal Digit Uniformity) | no gate | correct |
| Row-Mean Runs | no gate | correct |
| Decimal Places (Decimal Precision Consistency) | no gate | correct |
| Mean-Variance (Noise Scaling) | no gate | correct |

S341 said the list is "wrong on at least two of six". This pass closes that to **exactly two of six**
— the other four are right.

**The larger problem is the omissions.** Eleven tests have no effect-size gate; §5.4 names four of
them. The seven it omits are Exact Duplicate Detection, Sequential Duplication, Residual Spike
Correlation, Windowed Autocorrelation, Blocked Mahalanobis, Missing Data Pattern, and Cross-Condition
Rank Correlation. So the census is two-thirds omission by count, not a third wrong. In fairness,
several omissions (Sequential Duplication, Blocked Mahalanobis) postdate the census's authorship, and
Cross-Condition Rank Correlation is arguably out of scope because its cap already prevents HIGH — but
that is a reason to re-derive the list, not to trust it.

**A citation drift, minor but worth fixing while the section is open.** Both §5.4 and the S341
classification table cite the Benford gate at `benford.js:89`. At the current tip the gate expression
is at **`:93`**; line 89 is inside the Nigrini reference comment.

### The framing consequence §5.4 should absorb

§5.4's own text already states the honest position — a gate does not make the p uniform under H₀, it
censors, and the realised false-positive rate falls below nominal by an unmeasured per-test amount.
This pass measures that amount on the clean corpus for the recoverable subset, and it is not small:
**five of 91 readable cells, about 5.5%, and five of eight fixtures.** Three of those five would have
been HIGH.

Two things follow that §5.4 does not currently say.

**The gates are load-bearing, but not the ones §5.4 is about.** The saves come entirely from
unconditional gates. §5.4 scopes its gap to N ≥ 500, and no clean fixture reaches it. So this
measurement supports "the gates hold the tool together" while saying nothing about the large-N regime
§5.4 wants to close. Those are different claims and the section currently runs them together. **A
clean fixture at N ≥ 500 does not exist in the corpus, and until one does, gap 1 cannot be measured
at all** — only reasoned about. That is a corpus gap, and it is arguably a prerequisite for the
null-set harness in gap 2 rather than a consequence of it.

**Three tests cannot be audited at all without a source change.** Selective Noise Partitioning,
Cross-Condition Consistency and Value-Frequency Spike destroy the pre-gate p at the aggregation site.
Nineteen clean-corpus cells sit in that blind spot — nearly four times the confirmed finding. Any
honest statement of the gates' protective work has to carry that qualification, and the
`primaryPUngated` instrumentation described in §3 is the cheapest way to remove it.

---

## 6. Baseline Balance multiplicity — independent read (read-only)

Baseline Balance produced two of the five confirmed saves, so how its p is built matters. Read at
source, nothing changed.

**1. No multiplicity correction, of any kind.** `const primaryP = Math.min(binomP, ksP);`
(`carlisleBalance.js:144`) feeds straight into `let flag = flagFromP(primaryP);` (`:145`). There is no
Šidák step, no Bonferroni, no doubling, and no other adjustment anywhere between the two statistics
and the tier. The minimum of two p-values is treated as though it were a single p.

Under a true null with two independent tests, `P(min < α) = 1 − (1−α)² ≈ 2α`, so the realised
false-positive rate would be about double nominal — a HIGH tier that claims 0.001 firing at nearer
0.002.

**2. But the two tests are not independent — they read the same evidence.** Both are computed from
the same array, `featurePValues`. The binomial takes `nExcess = featurePValues.filter(p => p > 0.95)`
(`:128`) into `_binomialUpperTail` (`:130`). The KS takes a sorted copy of the *same* array (`:133`)
into a maximum ECDF deviation (`:139`) and then `_ksSurvival` (`:141`). Same features, same data, two
summaries of one sample — and the KS statistic's range includes the upper tail the binomial reads. So
the two are positively correlated, which means the 2α figure above is an upper bound on the inflation
rather than an estimate of it. The true inflation is somewhere between 1× and 2× and has not been
measured. The direction is anti-conservative either way.

**3. `excessFrac` counts the binomial arm's evidence only, over all testable features.**
`excessFrac = nExcess / nFeatures` (`:150`), where `nExcess` is the count of features with `p > 0.95`
(`:128`) and `nFeatures = featurePValues.length` (`:111`).

So the gate statistic and the p **can be computed from different evidence, and on both saved cells
they were.** `12a-uniform-mixture-clean`: `binomP = 1` (0 of 6 features excess — the binomial arm
contributed nothing at all), `ksP = 2.898e-3`, and the whole flagging p was the KS statistic.
`17-densitometry-carlisle-clean`: `binomP = 0.616`, `ksP = 1.409e-4`, 3 of 60 excess — again entirely
KS.

The gate's own comment (`:147-149`) explains it as guarding against "1-2 high p-values by chance",
which is a coherent rationale for the binomial arm. It is not a rationale for the KS arm, and the
code applies it to both because it sits after the `min`. A dataset whose p-distribution is non-uniform
somewhere other than the top 5% will be suppressed by a statistic that cannot see the deviation that
flagged it. Both Baseline Balance saves on the clean corpus have exactly that shape.

This is reported, not fixed. It is one finding with two independently actionable halves — the missing
correction on the `min`, and the arm-mismatched gate — and either could be addressed without the
other.

---

## 7. Reproducing this

```bash
node test/probes/probe-s342-clean-gates.mjs
```

Prints the full per-cell table, the three headline counts with their rules, the proximity table and
the not-recoverable list. Writes the complete returned object for every test on every clean fixture
to `test/probes/out-s342/clean-corpus-dump.json`, matched by the `test/probes/out-*/` line already in
`.gitignore` (added S341 for exactly this reason — `promote.sh:47` runs `git add -A` and would
otherwise ship the dump, P56).

The engine setup in the probe is copied from the per-fixture block of `test/validate-batch.mjs`, so
the numbers here are the numbers a batch run sees. The counterfactual for each gated test — "what
tier would this emit with the gate expression deleted" — is encoded in the probe's `GATED` table with
the source site it was derived from, so the reasoning is auditable rather than asserted.

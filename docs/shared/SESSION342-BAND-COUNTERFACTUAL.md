# S342 — Band Counterfactual, the Non-Running Cells, and the Split Test

**Status:** measurement, read-only on `src/`. Nothing under `src/` was modified, no threshold was
tuned, no batch was run as reassurance. The probe
(`test/probes/probe-s342-clean-gates.mjs`) imports the engine and reads what it returns. Default seed,
one run. Companion to `SESSION342-CLEAN-CORPUS-GATE-CLASSIFICATION.md`, which holds the 29-test gate
census and the five gate-saved cells this report reasons about.

---

## Headline

**The gates are protecting file verdicts, not just cards. All five gate-saved cells move their
fixture's band.** Three take a clean fixture from 0 to 2, two from 0 to 1.

The reasoning that predicted otherwise — that a band needs two flags across dimensions or two HIGHs,
so one flag per fixture cannot move anything — reads the wrong branches of the ladder. Two flags
across dimensions is what reaches severity **3**. Leaving severity **0** takes one flag of any tier.
`severity.js:20` gives 2 from a single HIGH with no dimension requirement, and `:23` gives 1 from a
single MODERATE.

Three further results:

- **All 34 non-running cells are declared applicability declines.** None is a silent non-dispatch and
  none is a scan that failed to engage. Every one carries an `naCause` and most carry the constant
  they missed.
- **On fabricated data the same gates suppress two real detections**, and one of them sits inside the
  planted mechanism. On `DS12b` the suppressed channel is the only one that localises the planted
  Genuine-versus-Fabricated shift, and un-suppressing it moves that fixture's band from its declared
  1 to 3.
- **Two of the "seven N ≥ 500 gates" are not row-gated at all** and have been firing on clean
  fixtures all along — one of them at 35 rows. Only five are genuinely unexercised by the clean
  corpus.

---

## 1. The band counterfactual

### 1a. What the clean corpus emits today

**No clean fixture emits a single MODERATE or HIGH at the default seed.** All eight are silent: every
test on every clean fixture returns LOW or N/A. Actual band is 0 on all eight, with
`high = 0, mod = 0, dims = 0`.

### 1b. The counterfactual

Each fixture's real result array was taken, only the gate-saved cells were raised to the tier their p
alone gives, and the array was fed through the shipped `computeSeverity()` (`severity.js:8`). The
ladder is not reimplemented anywhere — the same function decides both bands.

| fixture | actual band | counterfactual band | cf high/mod/dims | counterfactual flag set | moved |
|---|---|---|---|---|---|
| `01-densitometry-clean` | 0 | 0 | 0/0/0 | — | no |
| `03-qpcr-clean` | 0 | 0 | 0/0/0 | — | no |
| `05-cellcount-clean` | 0 | 0 | 0/0/0 | — | no |
| `07-elisa-clean` | 0 | **1** | 0/1/1 | Entropy / Zipf Analysis: MODERATE **[shapes]** | **YES** |
| `09-proteomics-clean` | 0 | **2** | 1/0/1 | Benford's Law (First Digit): HIGH **[digits]** | **YES** |
| `12a-uniform-mixture-clean` | 0 | **1** | 0/1/1 | Baseline Balance: MODERATE **[group]** | **YES** |
| `17-densitometry-carlisle-clean` | 0 | **2** | 1/0/1 | Baseline Balance: HIGH **[group]** | **YES** |
| `vfs-a-pigeonhole-clear` | 0 | **2** | 1/0/1 | Excess Kurtosis: HIGH **[replicate]** | **YES** |

**Five of eight clean fixtures move band.** Dimensions are in brackets, from `TEST_MECHANISM` — the
same lookup `computeSeverity` uses at `severity.js:14`.

### 1c. Which branch fires, and why the premise failed

| fixture | branch |
|---|---|
| `09-proteomics-clean` | `severity.js:20` — `high>=1 -> 2` |
| `17-densitometry-carlisle-clean` | `severity.js:20` — `high>=1 -> 2` |
| `vfs-a-pigeonhole-clear` | `severity.js:20` — `high>=1 -> 2` |
| `07-elisa-clean` | `severity.js:23` — `mod>=1 -> 1` |
| `12a-uniform-mixture-clean` | `severity.js:23` — `mod>=1 -> 1` |

The ladder in full (`severity.js:17-23`), in evaluation order:

```
high>=3                     -> 3
high>=2                     -> 3
high>=1 && dims>=2          -> 3
high>=1                     -> 2     <-- one HIGH, no dimension requirement
mod>=2 && dims>=2           -> 3
mod>=3                      -> 1
mod>=1                      -> 1     <-- one MODERATE
else                        -> 0
```

The two-flag, two-dimension branches (`:19`, `:21`) are the route to severity **3**. Nothing guards
the exit from severity 0. A single flag of any tier lands a clean file in a non-clean band, and the
dimension count only decides how far it goes.

Each counterfactual lands in a different dimension — shapes, digits, group, group, replicate — so
none of the five is one flag short of a cross-dimension escalation on its own. Two of them are both
Baseline Balance in `group`, but on different fixtures, so they never combine.

### 1d. Seed note — and a correction

The dispatch records "two clean fixtures" changing file-level band by seed on Cross-Condition
Consistency. **Only one of the two is clean.** From the eight-seed record at
`docs/shared/s340-eight-seed.txt:88` and `:156`:

- **`09-proteomics-clean`** — declared severity 0, observed `0 0 0 1 0 0 1 1` across eight seeds.
  Cross-Condition Consistency flags `l l l M l l M M`, p alternating `0.012` / `0.006`. Clean.
- **`15-missing-carlisle`** — declared severity **3**, observed `3 3 2 3 3 3 3 3`. Cross-Condition
  Consistency flags `M M l M M M M M`. This fixture is **fabricated**, not clean, and its instability
  is a declared channel dropping out rather than a false positive appearing.

**The instability does touch this counterfactual, on the one clean fixture.** At three of eight seeds
`09-proteomics-clean` already emits a MODERATE and already reaches severity 1 **at the shipped tier,
with no counterfactual at all** — a false-positive file band on a clean fixture, today. The §1a
statement that no clean fixture emits MODERATE or HIGH is true of the default seed, which is what the
batch and the user see, and false of three seeds in eight.

Stacked with the counterfactual it compounds: `09-proteomics-clean`'s saved cell is Benford
first-digit in `digits`, and the seed-unstable CCC is in `group`. On a seed where both are non-LOW the
counterfactual reads `high=1, dims=2`, which is branch `:19` — **severity 3**, the top band, on a
clean fixture. At the default seed it is 2.

Read off the existing eight-seed record, not from a new sweep. No seed sweep was run.

---

## 2. The 34 cells that never ran

8 clean fixtures × 18 gated tests = 144 possible cells. 110 readable, **34 not**. The sum is exact.

**Every one of the 34 is a declared applicability decline carrying an `naCause`.** None is a test that
failed to dispatch, and none is a scan or arm that quietly did not engage. The probe checks for
absence from the results array explicitly and found zero. The standing "scan not run is common"
worry does not show up here as silence — it shows up as declared N/A.

### By reason

| reason | cells | raise site | detail |
|---|---|---|---|
| `rangeOutOfBand` | **9** | `benford.js:29`, `benford2.js:29` | order-of-magnitude span gate; both Benfords on 6 and 5 fixtures |
| `tooFewConditions` | **6** | `engine.js:436` (CCC), `carlisleBalance.js` via `_na` | observed 0 conditions vs minimum 2, on the three fixtures with no condition structure |
| `tooFewColumns` | **5** | `carlisleBalance.js:54` (3 vs 5 features); `engine.js:458` (Mahalanobis, 2 vs 3); `withinRowVariance.js:38` (2 vs 3); `selectiveNoise.js:240` (2 vs 3); `regionalNoise.js:36` (2 vs 3) | four of the five are `vfs-a`, a 2-column fixture |
| `dataTypeMismatch` | **4** | `engine.js:315` (`dtSkip`, count data — Entropy, Column GoF, Modality on `05-cellcount`); `valueFrequencySpike.js:258` (non-integer values) | |
| `tooFewObservations` | **3** | `engine.js:549` (Column GoF, 25 vs `GOF_MIN_OBS` 30); `engine.js:562` (Modality, 25 and 35 vs `MODALITY_MIN_N` 50) | |
| `shapeNotCovered` | **3** | `columnGof.js:130` | per-column pre-skip rolled up; `07-elisa` reports γ₁ = 2.59, γ₂ = 7.04 against family set {Normal, Poisson, NB} |
| `assayNotApplicable` | **2** | `engine.js:370`, `engine.js:375` | both Benfords on cell-count data |
| `premiseVoid` | **1** | `carlisleBalance.js:123` | `01-densitometry`: 35 of 35 measures differ significantly, so there is no balance to check |
| `tooFewRows` | **1** | `withinRowVariance.js:40` | `01-densitometry`: 35 rows vs minimum 40 |

### By test

| cells | test | fixtures |
|---|---|---|
| 6 | Benford's Law (First Digit) | 01-densitometry, 03-qpcr, 05-cellcount, 12a, 17-densitometry, vfs-a |
| 5 | Benford's Law (Second Digit) | 01-densitometry, 03-qpcr, 05-cellcount, 17-densitometry, vfs-a |
| 5 | Baseline Balance | 01-densitometry, 03-qpcr, 05-cellcount, 07-elisa, vfs-a |
| 5 | Column Goodness-of-Fit | 03-qpcr, 05-cellcount, 07-elisa, 09-proteomics, 12a |
| 3 | Modality Test | 01-densitometry, 03-qpcr, 05-cellcount |
| 3 | Cross-Condition Consistency | 05-cellcount, 07-elisa, vfs-a |
| 2 | Within-Row Variance | 01-densitometry, vfs-a |
| 1 each | Value-Frequency Spike, Entropy / Zipf Analysis, Mahalanobis Row Outlier, Selective Noise Partitioning, Regional Noise Homogeneity | |

### What this bounds

**A test that never runs on clean data carries no false-positive evidence at all.** Both Benfords
decline on 6 and 5 of the 8 clean fixtures, and Baseline Balance and Column Goodness-of-Fit on 5 each.
Those four tests are between 62% and 63% silent across the clean corpus. Benford first-digit and
Baseline Balance are also two of the four tests that produced gate-saved cells — so each is carrying
its entire clean-corpus false-positive record on two or three fixtures.

`vfs-a-pigeonhole-clear` is the extreme case: 6 of its 18 gated cells decline, four of them because it
has 2 data columns and four replicate-based tests need 3. It is a constructed regression fixture for
one test, not a general clean fixture, and it should not be weighted equally with the others in any
false-positive rate taken over this corpus.

---

## 3. The split test — clean corpus, or unit gating?

On the clean corpus the three unit-level gating tests produced no saves. The question is whether that
is a property of unit gating or of the corpus. Run against the **19 fabricated fixtures** declared in
`test/batch-fixtures.mjs`, the answer is unambiguous.

**The vocabulary changes here.** On clean data a gate firing over an extreme p is protective — a save.
On a fabricated fixture the identical event is a **suppressed detection**. Nothing below is called a
save.

### 3a. The three unit-level gates do produce extreme p-values on fabricated data

38 unit-gated cells ran across the fabricated corpus. **13 carry a non-LOW ungated p** — the tests
demonstrably produce extreme values when there is something to find. The gate fired somewhere on 13 of
the 38.

So the clean-corpus result is a property of the **corpus**, not of unit gating. Value-Frequency Spike
in particular returned `primaryPUngated = 1` on all seven clean fixtures and returns `2.00e-10` on
`vfs-c-deeptail-high`, `2.55e-8` on `DS23`, `1.57e-6` on `DS13`. Nothing was suppressed on clean data
because nothing was there.

### 3b. Two suppressed detections

| fixture | rows | test | shipped `primaryP` | ungated | ungated tier | emitted | units gated |
|---|---|---|---|---|---|---|---|
| `11-rnaseq-multicondition` | 1500 | Selective Noise Partitioning | 1 | **0** | **HIGH** | LOW | 3 |
| `12b-uniform-mixture-fabricated` | 400 | Cross-Condition Consistency | 0.024 | **0.006** | **MODERATE** | LOW | 4 |

These are not equivalent, and the difference is the whole point.

**`DS11` — the gate behaving as designed, outside the planted mechanism.** All three conditions
report `pBartlett = 0.0000` at variance ratios of 2.285, 2.257 and 2.264. The ratios are nearly
identical across conditions, which reads as a structural property of the generator rather than
anything planted. `DS11` plants correlated residual spikes on 20 genes, inflated fold-changes on 30
genes in CondB, and AR(1) leakage (`TEST-GROUND-TRUTH.md:36`); Selective Noise is not among its
declared channels. A 2.27× variance ratio at N = 2000 producing p = 0 is precisely the case
`selectiveNoise.js:246-250` describes — Bartlett detecting a forensically trivial ratio because N is
large. The fixture holds severity 3 either way, through two declared HIGHs. **Un-suppressing it costs
nothing and gains nothing.**

**`DS12b` — a suppressed detection inside the planted mechanism, and it is load-bearing.** The
suppressed units are **Residual SD** (P4, `crossConditionProperties.js:341`) and **Residual kurtosis**
(P6, `:424`), both on the `Genuine vs Fabricated` pair at `adjP = 0.006`, direction `different`. Both
are Stage-2 residual properties, which declare both directions forensic, so these are
forensic-direction units that the effect-size gate alone removed. `DS12b` plants a narrow-fab
within-column distributional shift between exactly those two conditions
(`generate-test-datasets.py:542-597`). **The suppressed channel is measuring the planted mechanism,
on the planted pair, in the planted direction.**

That matters more than usual because `TEST-GROUND-TRUTH.md:38` records the S341 finding that
`DS12b`'s declared primary channel — Excess Kurtosis — is **absent**: the design premise failed, the
statistic came out at the wrong sign, and the fixture's declared band was never derived from its
construction. Cross-Condition Consistency may be the only channel in the battery that correctly
identifies what `DS12b` actually plants, and the gate silences it.

**And un-suppressing it breaks the batch.** Feeding the un-suppressed result through
`computeSeverity()`: `DS12b` currently reports severity 1 (`mod=2, dims=1` — LOESS and Regional Noise,
both `replicate`). Restoring CCC as a MODERATE in `group` gives `mod=3, dims=2`, which is branch
`severity.js:21` — **severity 3**, against a declared 1.

So on this fixture the gate is simultaneously suppressing a correct detection of the planted
mechanism and holding the declared band. Both are true. Which one is the error depends on whether
`DS12b`'s declared severity 1 is right, and S341 has already put that in question. **This report does
not adjudicate it.** It is the sharpest open question the S342 arc produced and it belongs to Chat.

### 3c. The seven N ≥ 500 gates — two of them are not row-gated

The premise that these seven "have never been exercised against any clean fixture and cannot be, since
the clean corpus tops out at 400 rows" **is wrong for two of the seven**, because two do not count
rows.

| test | gate expression | unit | fired on clean fixtures |
|---|---|---|---|
| Constant-Offset Blocks | `nR >= 500` `constantOffset.js:102` | rows | 0 of 8 |
| Autocorrelation | `nR >= 500` `autocorrelation.js:88` | rows | 0 of 8 |
| Runs Test | `nR >= 500` `runs.js:206` | rows | 0 of 8 |
| LOESS Residual Analysis | `nR >= 500` `loessResidual.js:219` | rows | 0 of 8 |
| Regional Noise Homogeneity | `nR >= 500` `regionalNoise.js:185` | rows | 0 of 7 |
| **Selective Noise Partitioning** | `b.N >= 500` `selectiveNoise.js:183, :251` | **Bartlett observations (cells)** | **2 of 7** — `09-proteomics` (400 rows), `12a` (400 rows) |
| **Cross-Condition Consistency** | `u.nMin >= 500` `crossConditionConsistency.js:602`, `nMin = min(Na, Nb)` at `:377` | **pooled cell count per condition** | **5 of 5** — including `01-densitometry` at **35 rows** |

Cross-Condition Consistency's gate has fired on **every clean fixture it ran on**, at row counts from
35 upward, because `nMin` counts cells rather than rows. Calling it an "N ≥ 500 gate" and grouping it
with the row-gated five conceals that completely. This also corrects §4d of the companion report,
which put all seven in one bucket.

**Only five gates are genuinely unexercised by the clean corpus**, and for those the fabricated
corpus is the only available evidence.

### 3d. The five row-gated gates on large fabricated fixtures

Only two fabricated fixtures reach 500 rows: `11-rnaseq-multicondition` (1500) and
`19-inheritance-fabricated` (1200).

| fixture | test | `primaryP` | ungated | ungated tier | emitted | gate |
|---|---|---|---|---|---|---|
| `11-rnaseq` | Autocorrelation | 0 | 0 | HIGH | HIGH | live, did not fire |
| `11-rnaseq` | Constant-Offset Blocks | 0.224 | 0.224 | LOW | LOW | live, did not fire |
| `11-rnaseq` | Cross-Condition Consistency | 0.072 | 0.072 | LOW | LOW | fired (5 units), no effect on the minimum |
| `11-rnaseq` | Selective Noise Partitioning | 1 | 0 | HIGH | LOW | **fired — suppressed detection** |
| `19-inheritance` | Cross-Condition Consistency | 0.006 | 0.006 | MODERATE | MODERATE | live, did not fire |

**Runs, LOESS and Regional Noise never appear** — they did not produce a readable cell on either large
fabricated fixture. So of the five genuinely row-gated gates, **three have no evidence at all**, on
clean or fabricated data, at any size. Constant-Offset and Autocorrelation are live on `11-rnaseq` and
neither fires.

The entire empirical record for the row-gated N ≥ 500 regime is therefore: two gates observed live and
declining to fire, three never observed. That is the evidence base under V1X §5.4 gap 1, and it is
close to empty.

---

## 4. What this changes

**The gates protect verdicts, not cards.** That is the inversion, and it is the load-bearing result
for §5.4's framing. Every one of the five clean-corpus saves is the difference between a clean file
reading clean and a clean file reading "minor flags" or "single anomaly". Without the gates the tool
would return a non-clean verdict on five of its eight clean fixtures.

**The same machinery costs a detection on fabricated data, and once inside the planted mechanism.**
The `DS12b` case cannot be dismissed as collateral: the suppressed channel is measuring the planted
shift on the planted pair, and it is arguably the fixture's only honest detection given that its
declared primary channel is absent.

**The large-N regime §5.4 is scoped to remains almost entirely unmeasured.** Two of the seven gates
attributed to that regime are not row-gated and have been firing all along at any size; of the five
that are, three have never been observed firing on any fixture. A clean fixture at N ≥ 500 still does
not exist, and now neither does a fabricated one that exercises Runs, LOESS or Regional Noise at that
size.

**Two corrections to earlier S342 work**, both from this pass: the seven-gate grouping in the
companion report's §4d conflates row counts with cell counts, and the claim that no clean fixture
emits a flag is true only of the default seed.

---

## 5. Reproducing this

```bash
node test/probes/probe-s342-clean-gates.mjs
```

Sections A–D print in order: the clean-corpus gate table, the band counterfactual through the shipped
`computeSeverity()`, the non-running-cell census, and the fabricated-fixture split test. Two dumps are
written to `test/probes/out-s342/` (`clean-corpus-dump.json`, `fabricated-dump.json`), matched by the
`test/probes/out-*/` line in `.gitignore`.

The band counterfactual calls the real `computeSeverity` on a modified result array. No ladder is
reimplemented and no result is hand-scored.

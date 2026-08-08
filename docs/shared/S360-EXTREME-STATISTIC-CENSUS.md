# Extreme-statistic census — which tests take an uncorrected extreme over correlated arms

**S360 · P104 · read-only over `src/`, nothing changed.** Every classification below was read at the
test's own source and is cited by file and line. Nothing here was taken from METHODOLOGY, from
`CLAUDE.md`, or from the framing of the dispatch that asked for it.

The question came from two tests. LOESS reports the higher-ranked of two flags derived from `scanP`
and `cusumP`, two statistics computed on the same rows inside the same permutation loop, with nothing
paid for taking the better of two. Baseline Balance does the same in a different shape,
`min(binomP, ksP)`. The answer is that **fourteen of the twenty-nine tests do it**, not two. One of
them already carries a source comment accepting the cost in as many words.

---

## 1. The classification key

Taking an extreme is not itself a defect. The question is whether the null the p-value is read
against is the null of the extreme.

- **Class A — uncorrected extreme.** The verdict depends on the best of two or more separately
  calibrated statistics, with nothing paid for the choice. The arms are computed on the same data, so
  they are correlated, and the correction owed is Šidák rather than Bonferroni.
- **Class B — extreme with a matching null.** A maximum is taken over windows, regions, pairs or
  lags, and the permutation loop recomputes that same maximum under the null. The p-value is already
  calibrated for the search. Nothing is owed.
- **Class C — extreme with a correction applied.** The extreme is taken over one family, and the
  correction spans that family.
- **Class D — no extreme.** One statistic, one p-value.
- **Class E — selection over families with no null.** A family is chosen by a data-derived criterion
  that is not itself a p-value and is never calibrated against anything; the reported p is then
  computed inside the winner. Neither A nor B describes this, and a multiplicity correction does not
  address it — what it needs is a null for the selector. One test does this.

Class A splits into two shapes that need different remedies:

- **A1 — co-equal arms.** The flag is `flagFromP` of the best of N arms, at the full tier range.
- **A2 — promotion arm.** A global arm plus a sub-unit arm that can only lift the flag to MODERATE
  and can never lower it. Correcting this raises the promotion bar; it does not move a tier boundary.

Several tests carry both.

---

## 2. The census

Twenty-nine tests, in dispatch order as they appear in the `tests` array in `src/analysis/engine.js`.
Line references are into `src/tests/`.

| # | Test | Class | Arms | Where the flag is decided |
|---|------|-------|------|---------------------------|
| 1 | Benford's Law (First Digit) | D | 1 | `benford.js:93-96` — tier from `pMAD` alone; `pChi` is computed, reported, never read |
| 2 | Benford's Law (Second Digit) | D | 1 | `benford2.js:127-130` — same shape |
| 3 | Terminal Digit Uniformity | D | 1 | `terminalDigits.js:47-60` — two chi-squared tests exist, one is reported; note 1 |
| 4 | Decimal Precision | C | — | `decimalPrecision.js:101-104` — BH across precision levels, minimum adjusted |
| 5 | Value-Frequency Spike | C **/ A1** | 1 **/ 2** | `valueFrequencySpike.js:561` — per branch; note 2 |
| 6 | Inter-Replicate Correlation | **A1** | **2** | `interReplicateCorrelation.js:306` — pair family against windowed scan |
| 7 | Exact Duplicate Detection | C | — | `duplicateDetection.js:808-810` — BH across all five sub-tests |
| 8 | Sequential Duplication | **A1** | **columns × heights** | `sequentialDuplication.js:169-171`; note 3 |
| 9 | Constant-Offset Blocks | **A1 + A2** | **2 + 1** | `constantOffset.js:78-84` (passes), `:104` (pairs) |
| 10 | Residual Spike Correlation | **B** | — | `residualSpikeCorrelation.js:108` observed, `:155-168` null — max over pairs both sides |
| 11 | Baseline Balance | **A1** | **2** | `carlisleBalance.js:144-145` — `min(binomP, ksP)`; note 10 |
| 12 | Cross-Condition Rank Correlation | C | — | `rankCorrelation.js:91-103` — BH across pairs, tier capped at MODERATE |
| 13 | Cross-Condition Consistency | **A1** | **3** | `crossConditionConsistency.js:565-575` families, `:619-620` minimum; note 4 |
| 14 | Mahalanobis Row Outlier | D | 1 | `mahalanobis.js:178-185` — one binomial; survivor count and rate only demote |
| 15 | Blocked Mahalanobis | C | — | `blockedMahalanobis.js:585-597` — both passes in one BH family |
| 16 | Noise Scaling With Measurement Size | D | 1 | `meanVariance.js:112-127`; note 5 |
| 17 | Excess Kurtosis | **A2** *(+ E)* | **2** | `kurtosis.js:508` — pooled arm, per-condition promotion arm; Class E at `:441-457`, §5 |
| 18 | Entropy / Zipf Analysis | C | — | `entropyTest.js:141-146` — BH across columns |
| 19 | Column Goodness-of-Fit | C | — | `columnGof.js:234-236` — BH across columns |
| 20 | Modality Test | C | — | `modality.js:250-252` — BH across columns |
| 21 | Autocorrelation | **A1 + A2** | **2** | `autocorrelation.js:113` (lag-1 pair family), `:172` (lags 2–5 pooled family) |
| 22 | Windowed Autocorrelation | **A1** | **one per pair** | `windowedAutocorrelation.js:192-194` families, `:202-204` minimum; note 6 |
| 23 | Runs Test | **A2** | **2** | `runs.js:265` — pair family, window family |
| 24 | Within-Row Variance | **A1** | **2** | `withinRowVariance.js:147-150` — global binomial against window family, both reach HIGH |
| 25 | LOESS Residual Analysis | **A1 + A2** | **2 + 1** | `loessResidual.js:226` (scan / cusum), `:442` (pairs); note 7 |
| 26 | Row-Mean Runs | **A1 + A2** | **conditions + 1** | `rowMeanRuns.js:105-107` (sequences), `:155` (windows) |
| 27 | Selective Noise Partitioning | C **/ D** | — | `selectiveNoise.js:206-207` stratified, `:252` single-run; note 8 |
| 28 | Regional Noise Homogeneity | **A2** | **2** | `regionalNoise.js:186-188` — scan against per-column family |
| 29 | Missing Data Pattern | C | — | `missingDataPattern.js:169-172`; note 9 |

**Fourteen tests carry a Class A branch**: rows 6, 8, 9, 11, 13, 17, 21, 22, 23, 24, 25, 26, 28, and
row 5 on its deep-tail branch. Nine are Class C, four Class D, one Class B, one split between C and D
by branch. One test additionally carries a Class E shape.

---

## 3. Notes on the classifications

**1 — Terminal Digit Uniformity is not Class A, and the reason is directional.** Both a ten-digit and
a nine-digit chi-squared exist, and the branch between them is data-dependent: `trailingZeroWarning`
fires when digit 0 falls below 40% of its expected count. But the deficit that triggers the branch is
the same deficit that inflates the ten-digit statistic, so the branch always selects the *less*
significant test. The selection runs toward the null, not away from it. One p is reported, and it is
never the better of two.

**2 — Value-Frequency Spike corrects across its two passes and then leaves a third family
uncorrected.** The union BH call at `:474` spans pass 1 and pass 2 together, so the max-of-tiers at
`:561` is exactly `flagFromP` of the corrected minimum over that union — Class C, correctly. The
deep-tail buckets get their own separate BH family at `:483-485`, deliberately kept out of the union
so the shared denominator does not move, and that family's minimum is then combined with the union's
by the same uncorrected max-of-tiers. That branch is Class A with two arms. It is live only when the
deep family is non-empty; `vfs-c-deeptail-high.csv` is the fixture named for that path.

**3 — Sequential Duplication's correction is present but does not span the family the minimum runs
over.** `nOppForHeight(h)` multiplies the block probability by offsets × start positions. The minimum
at `:169-171` then ranges over every column and every run height. The missing factor is columns ×
heights, and the source says so at `:167-168`: "Column-count multiplicity is not separately
corrected." The remedy here is a wider denominator, not a correction bolted on top of the existing
one.

**4 — Cross-Condition Consistency is a documented Class A.** The three stages each run their own BH
call (`:565-575`) and `primaryP` is the minimum across all three (`:619`). The comment at `:557-560`
states the cost outright: *"Cost: loss of cross-stage multiplicity control (three independent
families). Accepted."* This is the only place in the battery where the defect is named in the code
that commits it.

**5 — Noise Scaling tests a composite null, which is a different thing.** On the branch where no
assay expectation is available, it compares the observed slope to whichever of 0 or 2 is nearer
(`:122-124`). That is the least-favourable point of the interval null [0, 2] — the correct
construction for a composite hypothesis — not a choice between two computed p-values.

**6 — Windowed Autocorrelation runs BH separately inside each pair and then takes the minimum across
pairs.** `:192-194` builds one BH family per replicate pair; `:202-204` takes the global minimum over
every unit and reads it straight against the thresholds. FDR is controlled within a pair and nothing
is controlled across pairs. The arm count is the pair count, the largest in the battery. The scope
choice is deliberate and recorded at `:174-178`: the full pair × window grid was judged
over-conservative when fabrication is sparse across pairs.

**7 — LOESS's two pooled arms are each individually well calibrated; the defect is only in the
combination.** `obsScanStat` is the maximum window variance ratio and the permutation loop recomputes
`permScanMax` the same way (`:184-196`). `obsCusumStat` is the maximum absolute CUSUM and the loop
recomputes `permCusumMax` the same way (`:198-206`). Read on their own, both are Class B — this
settles the question the dispatch left open, and it settles it the way the dispatch suspected. What
is unpaid is `:226`, the higher-ranked of the two flags they produce. Separately, each per-pair unit
feeding the promotion arm is itself `min(ppSP, ppCP)` at `:427` before BH runs across the pairs — so
every value entering that BH family is already the better of two, and BH is calibrated for values
that are not.

**8 — Selective Noise has no promotion arm, contrary to the standing roster.** `CLAUDE.md`'s
sub-unit-escalation list still names it, but the per-column Levene is display-only at both return
sites and the source says so at `:216` and `:255`. The stratified branch is Class C (BH across
conditions, minimum adjusted); the single-run branch is Class D (one Bartlett p). Recorded, not
fixed — the roster entry is stale, not the code.

**9 — Missing Data Pattern is the shape the others should have.** Three sub-signals — pairwise,
per-condition, block — each with their own display-level BH pass, and then one pooled BH family
across every raw p from all three (`:169`), with the minimum of that taken as the verdict. Duplicate
Detection is the second example, and its comment at `:806` records that the previous
`min(block, row-dup)` regime *"was not a valid correction."* The same defect has already been found
and fixed once inside this battery.

**10 — Baseline Balance's effect-size gate silently ties its two arms together.** A flag above LOW
requires at least half the features to sit above p = 0.95 (`:150-153`), which is the binomial arm's
own condition. So the KS arm cannot raise a flag on a departure from uniformity that the binomial arm
does not already see. The arm is nominally free and effectively constrained — which reduces the
practical arm count without changing the class.

### Two defects found in passing, recorded and left alone

- **Runs and Autocorrelation let the promotion arm walk past the effect-size gate.** In both, the
  gate sets the global arm to LOW (`runs.js:215`, `autocorrelation.js:107`), but the pair-promotion
  predicate is evaluated ungated (`runs.js:261`, `autocorrelation.js:111`), so a test the gate meant
  to silence can still report MODERATE. Constant-Offset and Regional Noise guard both arms with an
  explicit `!esGate &&` (`constantOffset.js:104`, `regionalNoise.js:188`); these two do not.
- **Kurtosis's condition-axis selection has no null.** Recorded in full as Class E in §5.

---

## 4. Part 2 — what a Šidák correction would do

Šidák over k arms sets the corrected threshold at `1 − (1−α)^(1/k)`, equivalently comparing
`1 − (1−p)^k` against the original α. Both thresholds are strict: `ALPHA.FLAG = 0.001`,
`ALPHA.NOTE = 0.01` (`src/constants/thresholds.js:22-24`, `flagFromP` at `:38-41`).

| k | Šidák FLAG | Šidák NOTE | Bonferroni FLAG | Bonferroni NOTE |
|---|---|---|---|---|
| 2 | 0.000500125 | 0.00501256 | 0.000500000 | 0.00500000 |
| 3 | 0.000333445 | 0.00334451 | 0.000333333 | 0.00333333 |
| 4 | 0.000250094 | 0.00250943 | 0.000250000 | 0.00250000 |
| 10 | 0.000100045 | 0.00100453 | 0.000100000 | 0.00100000 |
| 11 | 0.0000909504 | 0.000913250 | 0.0000909091 | 0.000909091 |
| 15 | 0.0000666978 | 0.000669798 | 0.0000666667 | 0.000666667 |
| 24 | 0.0000416866 | 0.000418676 | 0.0000416667 | 0.000416667 |

### The direction, stated first

`1 − (1−p)^k ≥ p` for every k ≥ 1, so this correction **can only demote**. No verdict moves up and no
finding changes sign. A finding can get larger — more cells fall — but nothing reverses.

### Šidák against Bonferroni decides exactly two live lattice points

The two differ by roughly 2.5 parts in ten thousand of the threshold, which is invisible everywhere
except where a reachable lattice point sits exactly on α/k. Two places in the battery do:

- **Excess Kurtosis** runs 1999 simulations (`kurtosis.js:167`), so its p-value floor is 1/2000 =
  0.0005 and that is the only reachable HIGH point. Corrected at k = 2 it is **0.00099975**, under
  0.001 — **HIGH survives**, by 2.5 × 10⁻⁷. Bonferroni at 0.0005 would delete it, since the
  comparison is strict.
- **Constant-Offset** at 199 permutations has one reachable MODERATE point, 1/200 = 0.005. Corrected
  it is **0.009975**, under 0.01 — **MODERATE survives**, by 2.5 × 10⁻⁵. Bonferroni at 0.005 would
  delete it.

Everywhere else the two agree on outcome. The choice of Šidák is load-bearing at these two points and
nowhere else.

### Per test

**LOESS Residual Analysis** — k = 2 on the pooled pair. `B = 4999` at 100 or fewer valid rows,
`B = 499` above (`loessResidual.js:179`).

- Coarse branch, grid j/500. HIGH was already unreachable: the floor 0.002 is above 0.001, so
  ALPHA.FLAG does not move. The MODERATE band goes from {0.002, 0.004, 0.006, 0.008} to
  {0.002, 0.004} — corrected, 0.006 → 0.011964 and 0.008 → 0.015936, both LOW. **Two of four
  reachable MODERATE points cross.**
- Fine branch, grid j/5000. The HIGH band goes from {0.0002, 0.0004, 0.0006, 0.0008} to
  {0.0002, 0.0004} — corrected, 0.0006 → 0.0011996 and 0.0008 → 0.0015994, both MODERATE. **Two of
  four reachable HIGH points cross.** The MODERATE band goes from j ∈ {5…49} to j ∈ {5…25}; **24 of
  45 points cross to LOW.**

**Regional Noise Homogeneity** — k = 2. Same permutation ladder (`regionalNoise.js:148`), same raw p
read into `flagFromP`, so the lattice arithmetic is identical to LOESS's. Worth noting that the two
arms here are nested — the global scan maximum *is* the maximum over the per-column maxima — so these
are about as correlated as two arms can be, and Šidák is close to its worst case in the conservative
direction.

**Constant-Offset Blocks** — k = 2 across the additive and multiplicative passes. `B` is 999 / 499 /
199 by row count (`constantOffset.js:173`).

- `B = 999`, grid j/1000. HIGH is already unreachable at the 0.001 floor under a strict comparison.
  MODERATE band {0.001…0.009} → {0.001…0.005}: **four of nine points cross.**
- `B = 499`: as LOESS coarse. **Two of four cross.**
- `B = 199`: the single reachable MODERATE point, 0.005, survives at 0.009975. **Nothing crosses.**

**Excess Kurtosis** — k = 2, 1999 simulations, floor 0.0005.

- HIGH: one reachable point, which survives. **Nothing crosses.**
- MODERATE: band j/2000 for j ∈ {2…19} narrows to j ∈ {2…10}. **Nine of eighteen points cross.**

**Cross-Condition Consistency** — k = 3 across stages. The per-unit p is doubled two-sided
(`:528`), so the floor is 2/(B+1); BH at rank j in a family of size m reports (m/j) × floor.

- `B = 999` branch, floor 0.002. At the smallest family, m = 3: rank 1 gives 0.006 → corrected
  0.017892, **crosses to LOW**; rank 2 gives 0.003 → 0.008973, survives; rank 3 gives 0.002 →
  0.005988, survives. **The bar rises from one unit at the floor to two.**
- `B = 499` branch, floor 0.004. The smallest value any family of any size can produce is the floor
  itself, and 0.004 → corrected 0.011952, above 0.01. **The whole branch goes silent, at every family
  size.** This is determinate arithmetic, not a near miss.
- HIGH is unreachable on both branches before and after. Branch occupancy on the corpus is eight
  fixtures on each.

**Windowed Autocorrelation** — k = the pair count. 999 permutations, BH per pair, floor 0.001. HIGH is
already unreachable and stays so.

- The corrected NOTE threshold falls below the 0.001 floor at **k ≥ 11**: 0.0010045 at k = 10,
  0.00091325 at k = 11. Pair count is C(nC, 2), so five replicate columns give ten pairs and six give
  fifteen.
- **At six or more replicate columns the test cannot return anything but LOW.** At four columns
  (six pairs) the MODERATE band narrows from [0.001, 0.01) to [0.001, 0.001674) — a factor of about
  thirteen. This is the largest single consequence in Part 2. It says the per-pair BH scope is
  load-bearing: a Šidák over pairs is the wrong instrument here, and the alternative — widening the
  BH family to pair × window — is the one the source already considered and rejected as
  over-conservative.

**Row-Mean Runs** — k = conditions + 1. Two conditions gives k = 3 and thresholds 0.000333445 /
0.00334451; three gives k = 4 and 0.000250094 / 0.00250943. The per-sequence p is a
normal-approximation two-sided value and the window arm is a BH image of the same, so both are
effectively continuous: every point in [α_k, α) is reachable on both boundaries.

**Baseline Balance** (k = 2), **Inter-Replicate Correlation** (k = 2, first arm continuous), **Runs
Test** (k = 2), **Autocorrelation** (k = 2), **Within-Row Variance** (k = 2), and **Value-Frequency
Spike** on its deep branch (k = 2) are all analytic p-values or BH images of analytic p-values, so
both bands are reachable throughout. HIGH is lost anywhere in [0.000500125, 0.001) and MODERATE
anywhere in [0.00501256, 0.01) — the MODERATE band loses just under half its width, the HIGH band
almost exactly half.

**Sequential Duplication** — k = columns × heights, and therefore data-dependent. The p is
continuous, so both bands are reachable at any k. At six columns and four run heights, k = 24 gives
0.0000416866 and 0.000418676, roughly a twenty-four-fold tightening. That the arm count is not a
fixed property of the test is the reason this one wants a wider Bonferroni denominator over the
search volume rather than a Šidák over arms.

### What the arithmetic alone cannot settle

Twenty-two cells across fifteen fixtures currently sit at MODERATE or HIGH on a Class A test. The
list below is read from the tracked `test/flag-matrix.json` at seed offset 0 — not from a run. That
file records flags and not-applicable causes, not p-values, so for most of these cells which side of
the corrected threshold they land on cannot be decided without measuring. They are named as unsettled
rather than guessed:

| Fixture | Cell | What decides it |
|---|---|---|
| `08-elisa-fabricated` | LOESS HIGH | fine lattice — survives at 0.0002 or 0.0004, falls to MODERATE at 0.0006 or 0.0008 |
| `10-proteomics-fabricated` | LOESS MODERATE | coarse lattice, unmeasured |
| `12b-uniform-mixture-fabricated` | LOESS MODERATE | coarse lattice — `cusumP` is on record at 0.002, corrected 0.003996, so **this one survives** |
| `08`, `10`, `12b`, `21-localised-ar` | Regional Noise MODERATE | coarse or fine lattice, unmeasured |
| `15-missing-carlisle`, `19-inheritance-fabricated` | Cross-Condition Consistency MODERATE | which `B` branch and which BH rank; on the `B = 499` branch both are lost outright |
| `16-densitometry-carlisle-overbalanced` | Baseline Balance HIGH | continuous, unmeasured |
| `11-rnaseq-multicondition`, `21` | Autocorrelation HIGH | continuous, unmeasured |
| `08` | Inter-Replicate Correlation HIGH | continuous, unmeasured |
| `02-densitometry-fabricated` | Inter-Replicate Correlation MODERATE | continuous, unmeasured |
| `08` | Constant-Offset MODERATE | which `B` branch |
| `23-recurrence-null-mixed` | Runs MODERATE | continuous, unmeasured |
| `21` | Row-Mean Runs HIGH | continuous, unmeasured |
| `06`, `13`, `23`, `24`, `vfs-b`, `vfs-c` | Value-Frequency Spike | only cells whose driver sits in the deep family are affected at all |

Four Class A tests carry **no** MODERATE or HIGH cell anywhere in the corpus and so have no shipped
verdict to lose: Windowed Autocorrelation, Within-Row Variance, Sequential Duplication and Excess
Kurtosis. Windowed Autocorrelation is the one where that matters — the arithmetic silences it
entirely at six replicate columns, and because it fires nowhere today, the batch would not notice.

---

## 5. The one shape the key does not describe

**Excess Kurtosis chooses which family to test by a criterion that is not a p-value and has no null.**

At `kurtosis.js:441-449` the per-condition stratification runs once per condition column. For each,
the spread of κ-deviation across that column's conditions is computed, and the family with the
**largest spread** is kept. At `:450-456` a merged-labels stratification runs as well and replaces
the winner if its spread is larger still. BH-FDR then runs inside the winning family only
(`:466-476`), and that family's result is what can promote the flag to MODERATE.

That is an extreme taken over *families*, selected by a statistic that is never calibrated against
anything. It is not "the best of several separately calibrated p-values" and it is not "a maximum
with a matching null", so neither Class A nor Class B covers it. Filing it under Class A would
misstate the remedy: a Šidák over arms does not address a selection made on a quantity that has no
null of its own. Kurtosis's Class A promotion arm (pooled against per-condition, row 17 above) is a
separate and genuine finding and stands on its own.

**Bound on it.** `condArraysToTest` holds more than one entry only when `rowConditionsCols` has two
or more members — that is, when a file carries two or more condition columns. Read from the fixture
headers, **no fixture in the corpus does**: every row-grouped fixture carries exactly one, named
`Group`, `Condition`, `COND` or `condition`. So the shape is in shipped code and unreachable on the
corpus as it stands today. Any future fixture with a second condition column reaches it.

Nothing else in the battery failed the key. The remaining twenty-eight tests each fall cleanly into
one of A, B, C or D, per branch where the branches differ, and every one of them was settled at
source.

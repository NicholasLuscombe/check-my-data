# S372 — P148 Part 2: the tier drivers

Read-only over `src/`. Main at `eec3472`. Nothing in `src/` was edited.

The tier side only. No display classification — that is Part 3.

Counts used here: **27 fixtures**, **28 runner** (the 27 plus the DS01 cross-shape check),
**29 tests**, **28 card components**. Where 28 appears below it says which.

---

## 2a — the decision-site shapes

### The stop condition did not fire

`flagFromP` is shared by 26 of the 29 test modules and is the obvious candidate for a false stop.
It is not a composer. It is a two-line comparator:

```
if (!Number.isFinite(p)) return "N/A";
return p < ALPHA.FLAG ? "HIGH" : p < ALPHA.NOTE ? "MODERATE" : "LOW";
```

`ALPHA.FLAG = 0.001`, `ALPHA.NOTE = 0.01`, both compared **strictly**. Every caller chooses which
quantity to hand it, and every test writes its own `flag` field. **The census unit is the test.**

One genuine shared decision does exist — `aggregatePerGroup` in `analysis/aggregation.js` — but it
sits *above* the test, composes flags the tests computed themselves, and only runs on the
column-grouped branch. It changes the level count, not the unit. See below.

### Five shapes, not four

| # | Shape | Where |
|---|---|---|
| 1 | p against a threshold | `flagFromP`, 34 call sites in 26 modules |
| 2 | effect-size gate holding the flag down | 8 tests, `esGate ? "LOW" : …` |
| 3 | promotion arm lifting a flag something else set | 9 tests, capped at MODERATE |
| 4 | a cap preventing a tier being reached | 1 test in `src/`, plus 17 reachability declarations in `test/floors/` |
| 5 | **a maximum over two arms** | 6 tests, plus the aggregation layer |

Shape 5 is the one the dispatch's list does not name, and it is common. It appears as
`flagRankOf(a) > flagRankOf(b) ? a : b` — so a search for `Math.max` finds none of it.

### Three tests inline the ladder instead of calling the comparator

`benford.js`, `benford2.js` and `mahalanobis.js` reproduce `flagFromP`'s arithmetic by hand —
same constants, same strict comparisons, same order. The values agree today. **A change to
`ALPHA` or to the comparison operator would not reach these three**, and nothing would report it.
Recorded as an obvious fix and left, per the read-only rule.

### The level count is four, not three

The dispatch names file verdict, test card, condition card. Between the test and the card sits a
fourth:

**`aggregatePerGroup`** decides `result.flag` for the twelve tests dispatched through
`runPair` / `runPairVST` on column-grouped data. Its decision is

```
const flag = flagRankOf(fisherFlag) >= flagRankOf(groupArmFlag) ? fisherFlag : groupArmFlag;
```

— shape 5 again, over two arms that S369 measured failing in **opposite directions**. On those
twelve tests, the tier the card renders was not written by the test module.

### The file verdict reads no quantity at all

`computeSeverity` in `analysis/severity.js` takes `results` and reads exactly two things:
`r.flag`, and `TEST_MECHANISM[r.name]` for the dimension-diversity count. It counts HIGH and
MODERATE and applies a ladder. **There is no p and no effect size at this level.** Asking "which
quantity decides the file verdict" has the answer: every test's tier word, transitively, and
nothing else.

That makes level 1 categorically unlike levels 2 and 3, and the per-test table below therefore
has no level-1 column — the answer would be identical on all 29 rows.

---

## 2b — the per-test table

`p` = a p-value against the threshold. `gate` = an effect-size gate that can hold the flag at LOW.
`promo` = a promotion arm, MODERATE-capped. `max` = a maximum over two arms. `cap` = a tier the
branch cannot reach.

| Test | Module / function | Tier-driving variable | Shapes | Level 3 |
|---|---|---|---|---|
| Autocorrelation | `autocorrelation.js` `testAutocorrelation` | `flag` ← max(`pairPromotedFlag`, `pooledFlag`); `pooledFlag` ← `esGate ? "LOW" : flagFromP(minAdjP)` | p, gate, promo, max | — |
| Benford (First Digit) | `benford.js` `testBenford` | `flag` ← inline ladder on `pMAD`, gated `mad < 0.015` | p (inlined), gate | — |
| Benford (Second Digit) | `benford2.js` `testBenford` | `flag` ← inline ladder on `pMAD`, gated `mad < 0.008` | p (inlined), gate | — |
| Blocked Mahalanobis | `blockedMahalanobis.js` `testBlockedMahalanobis` | `flag` ← `flagFromP(primaryP)` | p | — |
| Baseline Balance | `carlisleBalance.js` `testCarlisleBalance` | `flag` ← `flagFromP(primaryP)`, then forced LOW when >50% of features differ | p, gate | — |
| Column Goodness-of-Fit | `columnGof.js` `testColumnGof` | test: `flagFromP(min adjP over flagged cols)`; column: `flagFromP(c.adjP)` behind a fit gate | p, gate | per column, **adjusted** |
| Constant-Offset Blocks | `constantOffset.js` `testConstantOffset` | `flag` ← `esGate ? "LOW" : flagFromP(best.permP)`, then `anyPairSig → MODERATE` | p, gate, promo | — |
| Cross-Condition Consistency | `crossConditionConsistency.js` `testCrossConditionConsistency` | `flag` ← `flagFromP(primaryP)`; per-property effect-size gates upstream | p, gate | per unit, no tier |
| Decimal Precision | `decimalPrecision.js` `testDecimalPrecision` | `flag` defaults LOW, becomes `flagFromP(primaryP)` only inside a condition | p, gate | — |
| Exact Duplicate Detection | `duplicateDetection.js` `testDuplicates` | `flag` ← `flagFromP(combinedP)` (BH over 5 sub-tests) | p | — |
| Entropy / Zipf | `entropyTest.js` `testEntropy` | test: `flagFromP(min adjP over non-LOW)`; column: `flagFromP(adjPs[i])` behind `deviant` | p, gate | per column, **adjusted** |
| Inter-Replicate Correlation | `interReplicateCorrelation.js` `testPearsonUniformity` | `flagFromP(bestSuspP)`, then `→ MODERATE` promotion, then max against `windowIrcFlag` | p, promo, max | per pair, no tier |
| **Excess Kurtosis** | `kurtosis.js` `testKurtosis` | test: `esGate ? "LOW" : flagFromP(pooledP)`; **condition: `flagFromP(condP)` on the RAW p** | p, gate, promo | **per condition, RAW — P122** |
| LOESS Residual | `loessResidual.js` `testLoessResidual` | `combinedFlag` ← `flagFromP(combinedP)` (Šidák k=2), gated, then pair promotion | p, gate, promo | — |
| Mahalanobis Row Outlier | `mahalanobis.js` `testMahalanobisOutlier` | inline ladder on `binomP`; forced LOW when `nOut === 0` or `gated`; N/A when non-finite | p (inlined), gate | — |
| Noise Scaling | `meanVariance.js` `testMeanVariance` | branch A `flagFromP(pSlope)`; branch B inline ladder on `pNearest` | p, p (inlined) | — |
| Missing Data Pattern | `missingDataPattern.js` `testMissingDataPattern` | `flag` ← `flagFromP(minAdjP)` | p | — |
| Modality | `modality.js` `testModality` | test: `flagFromP(min adjP over flagged)`; column: `flagFromP(c.adjP)` behind `DIP_GATE` | p, gate | per column, **adjusted** |
| Cross-Condition Rank Corr. | `rankCorrelation.js` `testSpearmanCrossCondition` | `flagFromP(bestXcrP)` then `flagRankCap` maps HIGH → MODERATE | p, **cap** | — |
| Regional Noise | `regionalNoise.js` `testRegionalNoise` | `esGate ? "LOW" : flagFromP(scanP)`, then `anyColSig → MODERATE` | p, gate, promo | via aggregator |
| Residual Spike Correlation | `residualSpikeCorrelation.js` `testResidualSpikeCorrelation` | `flag` ← `flagFromP(permP)` | p | — |
| Row-Mean Runs | `rowMeanRuns.js` `testRowMeanRuns` | max(`promotedFlag`, `globalFlag`); `globalFlag` ← `flagFromP(globalBestP)` | p, promo, max | per condition, card-derived |
| Runs Test | `runs.js` `testRuns` | max(`promotedFlag`, `globalFlag`); `globalFlag` ← `esGate ? "LOW" : flagFromP(minAdjP)` | p, gate, promo, max | per pair, card-derived |
| **Selective Noise** | `selectiveNoise.js` `testSelectiveNoise` | test: `flagFromP(minAdjP)` (BH across conditions); **condition: `flagFromP(b.pBartlett)` on the RAW p** | p, gate | **per condition, RAW — latent** |
| Sequential Duplication | `sequentialDuplication.js` `testSequentialDuplication` | `flag` ← `flagFromP(primaryP)` | p | — |
| Terminal Digit Uniformity | `terminalDigits.js` `testTerminalDigits` | `reportedFlag` ← `flagFromP(p9)` or `flagFromP(p10)` by branch | p | — |
| Value-Frequency Spike | `valueFrequencySpike.js` `testValueFrequencySpike` | max(`pass1Tier`, `pass2Tier`), each `flagFromP` of its pass's best p | p, gate, max | — |
| Windowed Autocorrelation | `windowedAutocorrelation.js` `testWindowedAutocorrelation` | `flag` ← `flagFromP(primaryP)` | p, cap¹ | — |
| Within-Row Variance | `withinRowVariance.js` `testWithinRowVariance` | max(`windowFlag`, `globalFlag`), then forced LOW under 3 smooth rows or 1% | p, gate, max | — |

¹ Declared in `test/floors/declarations.js`, not enforced in `src/` — see the caps section.

**Expectation 2 holds and understates it.** Only 11 of 29 have a single driver. Fourteen have two
or more shapes, and four have four.

### Gate-driven rows — a flag resting on no p

Eight tests can produce a tier that no p decided. `esGate` forces LOW regardless of how small the
p is: Autocorrelation, Constant-Offset, Excess Kurtosis, LOESS, Regional Noise, Runs, Selective
Noise, Within-Row Variance. Baseline Balance, Decimal Precision and Mahalanobis do the same thing
through their own conditions rather than a variable named `esGate`.

**Where the gate fires, the reported p is live and the tier ignores it.** That is not a display
defect — the tier is correct and the p is correct; they are answering different questions. Part 3
needs a class for it.

### Caps

- **In `src/`, one**: Cross-Condition Rank Correlation maps HIGH → MODERATE through `flagRankCap`,
  deliberately, because high inter-condition rank agreement can be genuine biology.
- **Every promotion arm is a cap in the other direction** — nine tests promote to at most MODERATE
  and never demote.
- **17 further reachability caps are declared in `test/floors/declarations.js` and enforced
  nowhere in `src/`.** Fifteen cannot reach HIGH, two are locked to LOW. They are arithmetic
  consequences of permutation counts and thresholds, not code. A census reading `src/` alone
  would report a full ladder for eleven tests that cannot deliver one.

### Tiers set twice

Six tests decide a tier and then decide it again: Autocorrelation, IRC, Row-Mean Runs, Runs,
Value-Frequency Spike, Within-Row Variance — plus LOESS, Constant-Offset and Regional Noise
through their promotion arms, and every aggregated test through `aggregatePerGroup`. In each,
**both decisions are tier drivers** and naming only the first misses the one that wins.

IRC decides three times: `flagFromP(bestSuspP)`, then a pair promotion to MODERATE, then a maximum
against the windowed arm.

---

## 2c — the divergences

**Expectation 1 inverts. P122 is not alone.** But the instances split into two classes that
should not be reported as one.

### Class A — the corrected value exists, is computed, and the tier ignores it

**Two members.**

**1. Excess Kurtosis, per-condition tier — P122, live.**
`kurtosis.js` sets `condFlag = flagFromP(condP)` where `condP` is the raw permutation p
`(nExceed + 1) / (simKurts.length + 1)`. Later in the same function the whole family is BH-adjusted
and the *displayed* value is overwritten — `c.pAdjFull = fullSetAdjPs[i]; c.p = fullSetAdjPs[i].toFixed(4)`
— while `flag: condFlag`, set from the raw p, is left alone.

The comment at that block states the author's intent plainly: it "leaves … `finalFlag` /
`primaryP` untouched, so the verdict cannot move." **The verdict was guarded and the per-condition
tier was not.** The tier renders through `ConditionTable`, which styles on `row.flag === "HIGH"`
and `=== "MODERATE"`, so the mismatch is visible.

**2. Selective Noise, per-condition tier — latent.**
`selectiveNoise.js` sets each condition's `flag` from `flagFromP(b.pBartlett)` — the raw Bartlett
p — and pushes that same p into `pValues`. Three lines later `bhFDR(pValues)` produces the adjusted
family and the test-level flag reads `flagFromP(minAdjP)`. So the corrected value for each
condition exists, is derived from the very array the raw flags came from, and the per-condition
tier does not use it.

**It is latent, not live.** `MiniCard_SelectiveNoise` never reads `condResults` — it renders
`result.flag` and the per-column Levene table. So nothing displays this tier today. It is a trap
for the next card that binds `condResults` to a `ConditionTable`, which would make it P122 with no
code change at all.

**One difference worth keeping.** P122's row shows an *adjusted* p beside a *raw*-driven tier, so
the row contradicts itself. Selective Noise's would show a raw p beside a raw tier — self-consistent
and merely uncorrected. Both are Class A; only one is also a display defect.

### Class B — no corrected value exists anywhere

**Thirteen members, and this is the larger finding.**

S360 established that fourteen tests take the better of two arms without pricing the selection.
S370 corrected exactly one — LOESS, now `sidakAdjust(Math.min(scanP, cusumP), 2)`. **The other
thirteen still read an unpriced extreme.**

Within-Row Variance is the clearest, because it is pre-S370 LOESS almost line for line:
`primaryP = Math.min(globalP, windowScanP)` with the flag taken as the maximum of the two arms'
flags. No correction is computed, so there is nothing for the tier to ignore.

This is a different fault from Class A and needs a different remedy. Class A is a wiring error —
the right number is in scope and unused. Class B is missing arithmetic.

### What is not a divergence, and why

**Per-group tiers in the aggregation summary table.** `aggregatePerGroup` builds
`details[].flag = r.result.flag` — each group's own uncorrected tier — while the aggregate applies
Šidák across the group family. That reads like Class A and is not: a group's own tier is a claim
about that group alone, and the multiplicity correction is a property of the family, not of any
member. Recorded so it is not re-found and mis-filed.

**Column GoF, Entropy / Zipf and Modality all get this right.** Each sets its per-column tier from
`c.adjP`, the BH-adjusted value, not from the raw. Three tests with the same shape as Kurtosis and
Selective Noise, all correctly wired. **The fix for Class A has a working precedent in the same
battery, twice over.**

---

## 2d — mode does not change any tier

**Expectation 4 holds, with one qualification.**

- `CategoryRow.jsx`, `TestCardLayout.jsx` and `excelExport.js` import no `ALPHA` and reference no
  threshold. There is no mode-conditional threshold anywhere.
- Every surface renders `result.flag`. No surface re-derives a tier from a p.
- `excelExport.js`'s `modeKey = mode === "full" ? "review" : mode` selects **guidance copy**
  (`SEVERITY_TEXT`, `CATEGORY_GUIDANCE`), not a threshold.

**The qualification, carried from Part 1**: the tier *word* differs by mode even though the tier
does not. `TestCardLayout`'s `flLabel` maps the same `result.flag` to `FLAGGED` / `NOTED` / `CLEAR`
in `qc` and to `High` / `Moderate` / `Clear` in `review` and `full`. Same tier, two vocabularies,
and `qc` is the default.

`review` was read for this question and carries no threshold of its own. It remains unexercised in
every other respect.

---

## 3. What this read could not settle

1. **Whether Class B's twelve unpriced arms move any shipped tier.** S360 measured six cells
   moving under a Šidák bound at seed offset 0, and the exact in-loop null disagreed with the bound
   on two of them. Pricing the remaining thirteen is a measurement, not a read, and it is outside a
   read-only pass.
2. **Whether any surface renders `condResults`.** Established for the Selective Noise card, which
   does not. Not checked for the Excel export or the HTML report, both of which walk results
   generically.
3. **Level 3 for the four aggregated condition tables** — Regional Noise's `condRegionalNoise`
   carries `flag: r.result.flag` from the per-group run. Whether the per-group run's own gates fire
   differently from the pooled run is unread.
4. **The `testBenford` name collision.** `benford.js` and `benford2.js` both export a function
   called `testBenford`. The engine must alias one. Harmless today; noted because a census keyed on
   exported function names would merge two tests into one row.

---

## 4. What this changes for Part 3

- **Part 3's grid needs a level the dispatch did not name.** `aggregatePerGroup` decides the tier
  for twelve tests on the column-grouped branch, so "which quantity drives the tier" has a
  different answer there than in the test module.
- **A gate-driven row is not a blank row.** Eight tests can flag with no p involved. Part 3's
  Class 5 ("no p exists") is larger than P145's single recorded instance and needs the gate as its
  definition, not the effect-size arm alone.
- **Class A has two members and one is latent.** The v1.0 blocker question is whether a latent
  divergence counts. It cannot mislead a user today and it will the moment a card binds the field.
- **Class B is thirteen tests and is not a display-contract question at all.** It belongs to the
  S360 line of work, not to P148. Reporting the two together would put twelve tests on a display
  blocker list that no display change can fix.

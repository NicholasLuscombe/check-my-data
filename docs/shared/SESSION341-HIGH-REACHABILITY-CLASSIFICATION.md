# S341 — HIGH-Reachability Classification (read-only)

**Status:** read-only structural classification. No source, fixture, count or constant was
modified; no batch was run. Supersedes `S341-CITATION-VERIFY-PROMPT.md` (never ran — no
output existed in `docs/shared/` or `docs/sessions/` at the time of this pass, so nothing
was carried forward).

**Why this pass exists.** S340 enumerated tests whose permutation grid cannot represent a
value below `ALPHA.FLAG`, and reported "seven of 29" as the shape of the problem. This pass
classifies all 29 tests on every axis that decides HIGH-reachability, per the structure-first
gate (`CLAUDE.md:108`).

**Headline.** There are **five** mechanisms, not four. The fifth — an unconditional tier cap —
was not in the S340 model or in the brief this pass was given, and it removes one further test
from HIGH permanently. Separately, two tests have the *opposite* defect from the one S340
audited: no floor at all, able to emit `p = 0`.

---

## 0. The five mechanisms

| # | mechanism | audited by S340? | tests affected |
|---|---|---|---|
| a | representable floor at or above `ALPHA.FLAG` | yes | 6 |
| b | effect-size pre-gate forcing LOW regardless of p | no | 17 |
| c | uncorrected `k/B` — **no floor**, `p = 0` emittable | named, mis-scoped as granularity | 2 |
| d | post-hoc adjustment (BH / Šidák) inflating the raw p the grid must clear | partially | 17 |
| e | **unconditional tier cap** — HIGH never emitted, by design | **no** | 1 |

Mechanism (e) is `Cross-Condition Rank Correlation`. See §3.8.

---

## 1. Classification table

`FFP` = `flagFromP` (`src/constants/thresholds.js:36`). "hand" = local ladder.
Floor is the smallest p the construction can emit **before** post-hoc adjustment.

| test | tier path | effect-size pre-gate | p construction | B | floor | post-hoc | reach HIGH? |
|---|---|---|---|---|---|---|---|
| Exact Duplicate Detection | FFP `duplicateDetection.js:811` | none | 5 analytic binomials | — | 0 | BH over 5, min adjP | **yes** |
| Sequential Duplication | FFP `sequentialDuplication.js:171` | none | analytic block binomial × opportunity count `:113` | — | 0 | Bonferroni-by-opportunity; min over sequences | **yes** |
| Constant-Offset Blocks | FFP `constantOffset.js:103` | `nR>=500 && blockRate<0.01` `:102` | `(permExceed+1)/(N_PERM+1)` `:240` | `nR>10000?199:nR>1000?499:999` `:173` | 0.005 / 0.002 / **0.001** | pair BH (MOD promotion only `:104`) | **no-by-floor** |
| Residual Spike Correlation | FFP `residualSpikeCorrelation.js:207` | none | `(permExceed+1)/(N_PERM+1)` `:171` | `999` fixed `:113` | **0.001** | none | **no-by-floor** |
| Benford's Law (First Digit) | hand `benford.js:89-92` | `mad<0.015` → LOW `:89` (Nigrini 2012 T7.1 p.160) | **`madExceedCount/N_SIM_BENFORD`** `:75` | `5000` `:56` | **0** | none | **yes** |
| Benford's Law (Second Digit) | hand `benford2.js:125-128` | `mad<0.008` → LOW `:125` (Nigrini 2012) | **`madExceedCount/N_SIM`** `:115` | `5000` `:88` | **0** | none | **yes** |
| Terminal Digit Uniformity | FFP `terminalDigits.js:55,59` | none | analytic χ² tail `:37,:52` | — | 0 | none | **yes** |
| Decimal Precision Consistency | FFP `decimalPrecision.js:104` | none | regularised incomplete beta `:90` | — | 0 | BH over dp levels `:101` | **yes** |
| Value-Frequency Spike | FFP `valueFrequencySpike.js:529-530` | presence only (`spikes.length>0`) | `1−normalCDF(z)` `:160,:222` | — | 0 | union BH both passes `:474` | **yes** |
| Entropy / Zipf Analysis | FFP `entropyTest.js:138,146` | `\|ratio−1\|>=0.15` `:134,137` | **`min(1, min(pLow,pHigh)*2)`**, counters init 1 `:95,103` | `999` `:37` | **0.002** | BH over cols `:128` | **no-by-floor** |
| Column Goodness-of-Fit | FFP `columnGof.js:231,236` | `ratio>=2.0` (high) / `<=0.5` (low) `:229-230` | **`min(1, min(pLow,pHigh)*2)`** `:195` | `2000` `:46` | **0.00099950** | BH over cols | **yes — one grid position, see §3.9** |
| Modality Test | FFP `modality.js:247,252` | `D_obs>=DIP_GATE(0.04)` `:54,247` | analytic diptest table lookup, **clamped `max(0.001, …)`** `:68` | **no resample** | **0.001** | BH over cols `:243` | **no-by-both** |
| Inter-Replicate Correlation | hand `interReplicateCorrelation.js:282-301` | `allHighSNR`→LOW `:283`; `excess>minExcess` (0.05/0.01) `:156` | analytic ICC z; window arm `(exceed+1)/(N_PERM+1)` `:263` | `maxN<=100?999:<=1000?499:199` `:244` | 0 (analytic) / 0.005 (window) | BH over pairs `:143` | **yes** (analytic arm) |
| Excess Kurtosis | FFP `kurtosis.js:383` | `kurtDev>=0` **or** `\|kurtDev\|<max(0.20, 1.96√(24/N))` `:380-382` | `(nExceed+1)/(simKurts.length+1)` `:347` | `1999` `:167` | 0.0005 | FISHER_EXEMPT | **yes** |
| Autocorrelation | FFP `autocorrelation.js:107` | `nR>=500 && \|r1\|<0.25` `:88` | analytic `zToP(z)`, `se=1/√n` `:49` | — | 0 | BH over pairs `:56` | **yes** |
| Windowed Autocorrelation | FFP `windowedAutocorrelation.js:200` | none | `(exceed[w]+1)/(N_PERM+1)` `:140` | `nR<=500?999:<=5000?499:199` `:87` | 0.001 / 0.002 / 0.005 | **BH per pair over ~18 windows** `:190-193` → ≈0.018 | **no-by-floor** |
| Runs Test | FFP `runs.js:215` | `nR>=500 && runsRatio>0.70` `:206` | analytic per-pair z, BH; perm arm display-only | `maxN<=100?999:<=1000?499:199` `:224` | 0 (analytic) | BH over pairs | **yes** |
| Noise Scaling With Measurement Size | FFP `meanVariance.js:118`; hand `:125-126` | none | `zToP(zSlope)` `:116` / `pNearest` `:124` | — | 0 | none | **yes** |
| Within-Row Variance | FFP `withinRowVariance.js:147-148` | post-gate `nSmooth<3 \|\| smoothFrac<0.01` → LOW `:154-156` | analytic exceedance binomial | — | 0 | BH over windows `:141` | **yes** |
| Selective Noise Partitioning | FFP `selectiveNoise.js:175,196,235` | `b.N>=500 && b.ratio<3.0` `:174,234` | Bartlett χ² `:92` | — | 0 | BH across conditions `:140,194` | **yes** |
| Regional Noise Homogeneity | FFP `regionalNoise.js:186` | `nR>=500 && bestRatio<2.0` `:185` | `(exceedCount+1)/(N_PERM+1)` `:173` | `validRows<=100?4999:499` `:148` | 0.0002 / **0.002** | col BH (MOD promotion `:188`) | **branch-dependent** |
| LOESS Residual Analysis | FFP `loessResidual.js:223-224` | `nR>=500 && bestRatio<2.0` `:219` | `(exceed+1)/(N_PERM+1)` `:213-214` | `validRows<=100?4999:499` `:179` | 0.0002 / **0.002** | max of scan/CUSUM `:226` | **branch-dependent** |
| Row-Mean Runs | FFP `rowMeanRuns.js:106` | none | `zToP(z)` `:80,:132` | — | 0 | BH over windows `:144` | **yes** |
| Mahalanobis Row Outlier | hand `mahalanobis.js:180-185` | `nOut===0`→LOW `:180`; `exceedFrac<2·ALPHA_BIN`→LOW `:179,181` | `1−normalCDF(binZ)` `:154` | — | 0 | per-row BH α=0.001 `:161`; FISHER_EXEMPT | **yes** |
| Blocked Mahalanobis | FFP `blockedMahalanobis.js:597` | none | `(exceedTsq+1)/(N_PERM+1)` `:588-589` | `maxN<=500?4999:999` `:510` | 0.0002 / **0.001** | BH over 2×nCond×windows `:592`; FISHER_EXEMPT | **branch-dependent** |
| Missing Data Pattern | FFP `missingDataPattern.js:172` | none | Fisher exact 2×2 `:92` | — | 0 | BH `:170` | **yes** |
| Cross-Condition Rank Correlation | FFP + **cap** `rankCorrelation.js:101-103` | none | `1−normalCDF(zStat)` `:81` | — | 0 | BH `:93` | **no-by-cap** |
| Baseline Balance | FFP `carlisleBalance.js:145` | post-gate `excessFrac<0.50` → LOW `:151-153` | `min(binomP, ksP)` `:144` | — | 0 | none | **yes** |
| Cross-Condition Consistency | FFP `crossConditionConsistency.js:620` | `gatePassed` (`nMin>=500`) `:602` **and** `forensic` direction `:610`; failures neutralised to p=1 `:618` | **`min(1, 2·min(pUpper,pLower))`** `:528` | `maxN<=1000?999:<=10000?499:199` `:167` | **0.002 / 0.004 / 0.01** | BH per stage (3 families) | **no-by-floor** |

---

## 2. Counts

**Can reach HIGH — 19.** Exact Duplicate Detection, Sequential Duplication, both Benfords,
Terminal Digit Uniformity, Decimal Precision Consistency, Value-Frequency Spike, Column
Goodness-of-Fit (conditionally — §3.9), Inter-Replicate Correlation, Excess Kurtosis,
Autocorrelation, Runs Test, Noise Scaling, Within-Row Variance, Selective Noise Partitioning,
Row-Mean Runs, Mahalanobis Row Outlier, Missing Data Pattern, Baseline Balance.

**no-by-floor — 5 unconditional.** Constant-Offset Blocks, Residual Spike Correlation,
Entropy / Zipf Analysis, Cross-Condition Consistency, Windowed Autocorrelation. The first four
are blocked by the raw floor; Windowed Autocorrelation's raw floor clears at its most generous
branch and is blocked by the BH multiplier instead (§3.7).

**Branch-dependent (floor clears on the small-n branch, not the large-n branch) — 3.**
Regional Noise Homogeneity, LOESS Residual Analysis, Blocked Mahalanobis. All three take
`4999` at ≤100 valid rows (or ≤500 max-n) and `499`/`999` above it. **The larger dataset gets
the coarser grid.** This inversion is not noted anywhere in source.

**no-by-both — 1. `Modality Test`.** It is the only test where both a floor and a gate block
HIGH and *no resample count can help*, because it no longer resamples: the floor is a
hardcoded clamp (`P_FLOOR = 0.001`, `modality.js:68`) and the gate is `DIP_GATE = 0.04`
(`:54`). This is the set the S340 audit could not see, and it has one member.

**no-by-cap — 1. `Cross-Condition Rank Correlation`.** New category. §3.8.

**Tests with an effect-size pre-gate — 17.** Constant-Offset Blocks, Benford ×2, Entropy/Zipf,
Column GoF, Modality, Inter-Replicate Correlation, Excess Kurtosis, Autocorrelation, Runs,
Regional Noise, LOESS Residual, Selective Noise, Within-Row Variance, Mahalanobis Row Outlier,
Baseline Balance, Cross-Condition Consistency.

**Tests bypassing `flagFromP` with a local ladder — 4.** `benford.js:89-92`,
`benford2.js:125-128`, `mahalanobis.js:180-185`, `meanVariance.js:125-126`. A fifth,
`interReplicateCorrelation.js:282-301`, branches around `flagFromP` without re-deriving the
ladder. The claimed "26 files import `flagFromP`, 39 `ALPHA.FLAG` references" is confirmed:
26 and 39 exactly.

---

## 3. The seven claims

### 3.1 The severity ladder — **CONFIRMED, and the answer is yes**

Real location `src/analysis/severity.js:19-26` (the claimed line range is correct):

```js
const severity=high>=3?3:
  high>=2?3:
  (high>=1&&nFlaggedDimensions>=2)?3:
  high>=1?2:
  (mod>=2&&nFlaggedDimensions>=2)?3:  // 2+ MODs cross-dimension
  mod>=3?1:
  mod>=1?1:0;
```

**Can two MODERATEs with no HIGH anywhere reach the top band? Yes** — branch 5,
`(mod>=2&&nFlaggedDimensions>=2)?3`. It returns 3, identical to `high>=2`.

A "dimension" is a mechanism-category key from `TEST_MECHANISM`
(`src/constants/mechanisms.js`), counted at `severity.js:16` as
`new Set(results.filter(HIGH||MODERATE).map(r => TEST_MECHANISM[r.name] || r.category))`.
There are **five**: `copied`, `digits`, `shapes`, `replicate`, `group`
(`mechanisms.js:21-25`). Note `severity.js:14` states test-emitted `r.category` is stale and
the `TEST_MECHANISM` mapping is authoritative — the `|| r.category` fallback is dead for all
29 named tests.

**Can the tests that cannot produce HIGH still reach the top band? Yes, all of them.** None of
the no-by-floor / no-by-cap / no-by-both tests is excluded from branch 5. Modality (`shapes`),
Cross-Condition Rank Correlation (`group`), Cross-Condition Consistency (`group`),
Constant-Offset Blocks (`copied`), Residual Spike Correlation (`copied`), Entropy/Zipf
(`shapes`), Windowed Autocorrelation (`replicate`) span four of the five dimensions. Any two
of them in different dimensions, both at MODERATE, produce severity 3.

**Consequence for pricing.** The HIGH ceiling is a card-vocabulary defect, not a verdict-reach
defect. Under an independent-null model at nominal rates over 29 tests: P(≥2 HIGH) ≈ 0.04%,
P(≥1 HIGH + second dimension flagged) ≈ 0.7%, P(≥2 MODERATE) ≈ 3.4%. The MODERATE path
dominates severity-3 by roughly four to one. Any compute spent raising `B` to reach `p<0.001`
buys card expressiveness, not detection reach.

### 3.2 Effect-size pre-gates — **CONFIRMED, all five sites, with one correction**

- `benford.js:89` — `if(mad<0.015) flag="LOW";` — **confirmed**, cited to Nigrini (2012)
  Table 7.1 p.160 at `:83-84`. Fires before `pMAD` is consulted.
- `benford2.js:125` — `if (mad < 0.008) flag = "LOW";` — **confirmed**, cited "Nigrini's
  second-digit nonconformity threshold" at `:124`.
- `mahalanobis.js:180-185` — **confirmed**, but it is *two* gates, not one:
  `nOut === 0 → LOW` (S126b add-5b) and `gated = exceedFrac < 2*ALPHA_BIN → LOW` (`:179`).
- `meanVariance.js:125` — **confirmed as a hand-rolled ladder**, but the claim implies a gate
  and **there is none**. `:125-126` is `if(pNearest < ALPHA.FLAG) flag = "HIGH"; else if(...)
  flag = "MODERATE";` with no effect-size condition; `flag` was initialised `"LOW"` at `:112`.
  This is a naked p-value ladder.
- `interReplicateCorrelation.js:268` — the cited line is
  `const windowIrcFlag=scanP<ALPHA.FLAG?"HIGH":scanP<ALPHA.NOTE?"MODERATE":null;` — a
  **sub-unit** ladder for the window arm, not the test's verdict. The verdict gate is at
  `:283-284` (`allHighSNR → LOW`) and `:156` (`minExcess` = 0.05 at n≥500, else 0.01).
  Right file, right kind of finding, wrong line.

**Counts confirmed exactly:** 26 files import `flagFromP`; 39 direct `ALPHA.FLAG` references.

**The discriminator — second-digit Benford threshold.** The value is **`0.008`**, at
`src/tests/benford2.js:125`. First-digit is **`0.015`**, at `src/tests/benford.js:89`.
`docs/shared/METHODOLOGY.md:1675-1676` records both in the cited-constants table
("Benford's MAD ≥ 0.015 (Nonconformity)" / "Benford 2nd digit MAD ≥ 0.008"), and
`METHODOLOGY.md:1233` repeats "Nigrini MAD ≥ 0.008 (second-digit threshold, less strict than
first-digit 0.015)".

**Chat's record of "1.5 and 1.0" is wrong on both values and does not correspond to any
scaling of the real constants** — 0.015 and 0.008 scale by ×100 to 1.5 and **0.8**, not 1.0.
No display-side ×100 exists: `MiniCard_Benford.jsx` contains no MAD threshold constants.
On this discriminator the cross-validation model is right and the Chat record is wrong.

### 3.3 V1X §5.4 — **STALE on two of six. Reported, not resolved.**

`docs/shared/V1X-FUTURE-WORK.md:1202` §5.4 "Large-N effect-size gate audit — PROMOTED to v1.0
blocker (S187)" lists six tests as lacking calibrated effect-size gates at N ≥ 500:
First-Digit Frequencies, Last-Digit Frequencies, Runs, Row-Mean Runs, Decimal Places,
Mean-Variance.

| §5.4 name | canonical test | gate today? | §5.4 status |
|---|---|---|---|
| First-Digit Frequencies | Benford's Law (First Digit) | **YES** — `mad<0.015`, `benford.js:89`, Nigrini-cited | **STALE** |
| Last-Digit Frequencies | Terminal Digit Uniformity | no — `flagFromP(p9\|p10)` `terminalDigits.js:55,59` | correct |
| Runs | Runs Test | **YES** — `nR>=500 && runsRatio>0.70`, `runs.js:206` | **STALE** |
| Row-Mean Runs | Row-Mean Runs | no — `flagFromP(globalBestP)` `rowMeanRuns.js:106` | correct |
| Decimal Places | Decimal Precision Consistency | no — `flagFromP(primaryP)` `decimalPrecision.js:104` | correct |
| Mean-Variance | Noise Scaling With Measurement Size | no — `meanVariance.js:118,125-126` | correct |

Two of six are stale. **Runs is the sharper contradiction**: §5.4 asks for "a per-test
effect-size threshold below which p alone does not promote severity," and `runs.js:206` is
exactly that shape, applied at exactly the N ≥ 500 regime §5.4 scopes. §5.4's own sub-note
("for Runs the gate is necessary but not sufficient") acknowledges a gate exists while gap #1
still counts Runs as lacking one.

This is a **v1.0 blocker resting on a list that is one-third wrong**. Not resolved here —
Chat authors the correction.

**Second §5.4 finding.** Its stated first step is: *"enumerate, per test, the exact
tier-promotion rule and whether it has an effect-size gate / is FISHER_EXEMPT / neither."*
That is this document. §5.4's read-only prerequisite is discharged by §1 above.

**Third §5.4 finding — a framing contradiction, not a staleness one.** §5.4 asserts
"FISHER_EXEMPT membership and the Tier-2 effect-size gates are the machinery that *enforces*
[the FP-rate] definition … not evidence of miscalibration." But a gate that forces LOW at
`p < 0.001` makes the realised FP rate of HIGH *lower* than nominal by an unmeasured amount
that depends on the joint distribution of p and effect size. §5.4's own gap #2 ("the tiers
have never been empirically measured against a null set") concedes that amount is unknown.
Enforcement and miscalibration are the same act measured from two ends; §5.4 claims the first
while its gap #2 admits it cannot rule out the second.

### 3.4 METHODOLOGY.md contradicts itself on Benford flagging — **new, not in the brief**

`METHODOLOGY.md:1175`: **"Flag:** Simulation pMAD < 0.001 → HIGH, pMAD < 0.01 → MODERATE."
No gate mentioned.

`METHODOLOGY.md:1177`: "Nigrini's MAD conformity labels are retained for reference but **do
not influence flagging**."

`benford.js:89`: `if(mad<0.015) flag="LOW";` — the label threshold *is* the first branch of
the flag.

`METHODOLOGY.md:1675`: lists "Benford's MAD ≥ 0.015 (Nonconformity)" in the cited-constants
table as a live constant.

§3.4-of-METHODOLOGY's prose (`:1175-1177`) is stale against both the code and METHODOLOGY's own
constants table 500 lines later. Recorded, not fixed.

### 3.5 Benford's uncorrected estimator — **CONFIRMED. `p = 0` is emittable.**

```js
// src/tests/benford.js:75
pMAD = madExceedCount / N_SIM_BENFORD;     // N_SIM_BENFORD = 5000  (:56)
// src/tests/benford2.js:115
const pMAD = madExceedCount / N_SIM;       // N_SIM = 5000          (:88)
```

Zero exceedances yields exactly `0`. No `(k+1)` numerator, no clamp. Confirmed at both sites.

**Consumers of that p, and whether a zero passes through unchanged:**

| consumer | site | zero passes? |
|---|---|---|
| local ladder | `benford.js:90`, `benford2.js:126` | **yes** — `0 < ALPHA.FLAG` → HIGH (subject to the MAD gate) |
| `flagFromP` | not called by either test | n/a |
| result field `pMAD` | returned on the result object | yes |
| aggregation worst-group arm | `aggregation.js:117-124` | **yes** — `worstGroupFlag` is a max over group flags |
| min-over-sub-units + Šidák | `aggregation.js:153-154` | **yes**, and `sidakAdjust` has an explicit `if (p <= 0) return 0;` short-circuit (`primitives.js:265`) — a zero survives multiplicity correction intact |
| Fisher combination | `aggregation.js:207` | **no** — `validPs = groupPs.filter(p => p !== null && p > 0 && isFinite(p))` filters zeros out. Neither Benford is in `FISHER_EXEMPT`, so a zero-p group is silently dropped from the χ² rather than dominating it. |

The Fisher filter at `:207` is the only place a zero is caught, and it catches it by *dropping
the group*, not by correcting the estimator. A dataset whose strongest Benford evidence sits in
one condition contributes nothing to the Fisher arm from that condition.

**Asymmetry worth stating plainly.** Column Goodness-of-Fit reaches HIGH only at
`2/2001 = 0.00099950` and only under the condition in §3.9. Benford reaches HIGH at
`k ≤ 4` of 5000 and reports `p = 0` at `k = 0`. Same tier word on both cards.

**Cross-reference:** the known Benford false positives (heterogeneous pooling; predicted on
C07/C09/C16/C20) are reported through this estimator, i.e. at or near `p = 0`. The estimator
does not cause those FPs, but it is why they render at maximum expressible confidence.

### 3.6 Modality's clamp — **CONFIRMED, and it is a decision, not a p**

`src/tests/modality.js:68`: `const P_FLOOR = 0.001;`
Applied per `:32-34`: `Clamp: p = max(0.001, min(1.0, raw_p))`. The docblock states the intent
verbatim: *"The 0.001 floor preserves the pre-S159b bootstrap-floor calibration: B=999 gave
p ≥ 1/1000, which lands at exactly ALPHA.FLAG = 0.001 → Modality caps at MODERATE never HIGH
on single-column evidence."* The bootstrap was retired at S159b (`:30`, and `rng` is
documented as "retained for signature compatibility; unused"). **The clamp preserves the
calibration of a resampling step that no longer exists.**

**Destinations of the clamped value:**

| destination | site | treated as a p with a null behind it? |
|---|---|---|
| BH-FDR across columns | `modality.js:243` | **yes** — `bhFDR` assumes valid p-values; a clamped floor is not one |
| per-column flag | `:247` — `c.D_obs >= DIP_GATE ? flagFromP(c.adjP) : "LOW"` | yes |
| test verdict | `:252` — `flagFromP(min adjP over flagged cols)` | yes |
| min-over-sub-units | `:251` `primaryP = Math.min(...adjPs)` | yes |
| aggregation worst-group / Šidák | `aggregation.js:117,153` | yes |
| Fisher combination | `aggregation.js:196-204` | **no** — `"Modality Test"` is in `FISHER_EXEMPT` |

Five of six consumers treat a clamped constant as an estimated tail probability. Only Fisher
excludes it, and the exemption comment does not give the clamp as the reason.

### 3.7 The three "grid too coarse" tests — **they do not share one mechanism**

| | Constant-Offset Blocks | Windowed Autocorrelation | Cross-Condition Consistency |
|---|---|---|---|
| B | `nR>10000?199:nR>1000?499:999` `:173` | `nR<=500?999:<=5000?499:199` `:87` | `maxN<=1000?999:<=10000?499:199` `:167` |
| construction | `(k+1)/(B+1)` `:240` | `(k+1)/(B+1)` `:140` | **`min(1, 2·min(pUpper,pLower))`** `:528` |
| raw floor | 0.005 / 0.002 / 0.001 | 0.001 / 0.002 / 0.005 | **0.002 / 0.004 / 0.01** |
| post-hoc on the verdict path | none (pair BH drives MOD promotion only, `:104`) | **BH per pair over ~18 windows** `:190-193` | BH per stage, three families |
| effective floor | = raw floor | **≈ 0.018** | ≥ raw floor |
| pre-gate | `blockRate<0.01` at nR≥500 | **none** | `gatePassed` + `forensic` direction |

**Three different mechanisms.** Constant-Offset is a bare `(k+1)/(B+1)` floor that happens to
land exactly on `ALPHA.FLAG` at its most generous branch (0.001, failing a strict `<`).
Cross-Condition Consistency is a **doubled** floor — the same construction as Entropy/Zipf and
Column GoF, which the S340 table lists separately as a structural cause. Windowed
Autocorrelation's raw floor *clears* nothing on its own; the blocker is the BH multiplier.

**The model's claim that Windowed Autocorrelation multiplies its floor through a BH adjustment
over windows is CONFIRMED**, and source-stated at `windowedAutocorrelation.js:179-182`:
*"Arithmetic floor: with N_PERM=999 and nWindows≈18/pair, min reachable per-pair adj-p
≈ 1/1000 × nWindows ≈ 0.018 (MOD floor at ALPHA.NOTE=0.01). HIGH at <0.001 is unreachable
without N_PERM ≥ 9999."*

Collapsing these three under one phrase hides that only one of the three is fixed by raising
`B` alone; Cross-Condition Consistency also needs the doubling addressed, and Windowed
Autocorrelation needs `B ≥ 9999` specifically because of the BH multiplier, not the grid.

**Also surfaced: the branch inversion.** Constant-Offset, Windowed Autocorrelation,
Cross-Condition Consistency, Regional Noise, LOESS Residual, Blocked Mahalanobis, Runs and
Inter-Replicate Correlation all select **smaller `B` for larger datasets**. The coarsest grid
is applied to the files with the most data. Every branch is a wallclock branch; none cites the
threshold.

### 3.8 The fifth mechanism — an unconditional tier cap (NOT in the brief)

`src/tests/rankCorrelation.js:101-103`:

```js
const rawFlag = flagFromP(bestXcrP);
const flagRankCap = {"HIGH":"MODERATE","MODERATE":"MODERATE","LOW":"LOW","N/A":"N/A"};
const flag = flagRankCap[rawFlag] || rawFlag;
```

**Cross-Condition Rank Correlation can never emit HIGH**, at any p, any effect size, any B —
it does not resample at all. The reason is documented at `:98-100` and repeated in the card
description: *"High ρ between conditions can always reflect genuine biological similarity.
This test is corroborating evidence only — cap prevents standalone escalation."*

This is the cleanest instance in the battery of a tier that is a **forensic-materiality
judgement rather than a false-positive rate**, and it is deliberate, documented, and
defensible. It is also invisible to a grid audit, which is why S340 did not count it.

**The count stays at seven; the membership is wrong.** S340's seven are Entropy/Zipf, Column
GoF, Residual Spike Correlation, Modality, Constant-Offset Blocks, Windowed Autocorrelation,
Cross-Condition Consistency. The correct seven **drop Column Goodness-of-Fit** (reachable, see
§3.9) and **add Cross-Condition Rank Correlation**. A grid audit found the right number by
finding one false member and missing one real one. Both errors are the same error: reachability
was read off the estimator, and one test's ceiling is a product decision that never touches an
estimator.

### 3.9 Column Goodness-of-Fit's HIGH is narrower than "one grid position"

`bhFDR` (`primitives.js`) is the standard step-up with monotonicity enforcement:
`adj[rank i] = min over j ≥ i of min(1, (m/j)·p(j))`.

With raw floor `f = 2/2001 = 0.00099950` and `m` tested columns, the minimum adj-p is
`min_j (m/j)·p(j)`. For that to stay below `0.001`, the family must be flat at the floor —
if all `m` columns sit at `f`, the `j = m` term gives exactly `f` and HIGH survives. If even
one column is materially above the floor while the driver is at it, the `j = 1` term is
`m·f ≥ 2f`, and HIGH is lost.

So Column GoF's HIGH requires **essentially the whole tested column family at the floor
simultaneously**, not merely one column landing there. "Both HIGHs sit on one grid position"
understates it: they sit on one grid position *and* on a flat-family condition. Whether the two
observed HIGHs are stable under reseeding is not answerable from the grid — it depends on where
the true p sits, which this pass cannot determine without a run (out of scope; recorded).

### 3.10 The Fisher exemption clause — **CONFIRMED, and the list is longer than claimed**

`src/analysis/aggregation.js:196-204`:

```js
const FISHER_EXEMPT = new Set([
  "Excess Kurtosis",
  "Windowed Autocorrelation",
  "Blocked Mahalanobis",
  "Mahalanobis Row Outlier",
  "Column Goodness-of-Fit",
  "Entropy / Zipf Analysis",
  "Modality Test",
]);
```

**Seven members, not two.** The claim named Windowed Autocorrelation and Blocked Mahalanobis;
the list also contains the three tests S340 identified as floor-blocked by the doubling and the
clamp — Column GoF, Entropy/Zipf, Modality.

The forward-compatible rule at `:180-195` gives four clauses, each with its reason:

- **(a)** primaryP is the minimum of an internal BH-FDR-adjusted family;
- **(b)** *"arithmetic-floor-truncated by a finite permutation count"*;
- **(c)** derived from a shared simulation/bootstrap denominator across groups;
- **(d)** the survival p of a model-fit binomial whose null is mis-calibrated under
  non-conforming inputs (χ² null assuming multivariate normality against heavy-tailed data).

Per-member reasons are given at `:176-195`: Excess Kurtosis (c, shared `simKurt` denominator);
Windowed Autocorrelation (b, *"min per-pair BH adj-p is floor-truncated at ~1/(N_PERM+1) ×
nWindows ≈ 0.01 under H0"*); Blocked Mahalanobis (b, *"floor-truncated at ≈ m/(N_PERM+1)"*);
Mahalanobis Row Outlier (d, with a DS15 reproduction — per-group Control binomP 0.0019,
Treatment 0.000001 → Fisher χ² 41.13 → aggregate HIGH despite both per-group LOW).

**Is any per-test resolution floor declared anywhere as data? No.** There is no floor registry.
`grep -rn "FLOOR\|floor" src/constants/*.js` returns only typography and colour-ramp uses.
Every floor is re-derived in a prose comment at its own site: `columnGof.js:36-44`,
`windowedAutocorrelation.js:179-182`, `modality.js:32-34` and `:66-68`,
`crossConditionConsistency.js:551`, `kurtosis.js:167`, `aggregation.js:181-186`,
`blockedMahalanobis.js:528`. Clause (b) is the only place the concept is *named* as a rule,
and it is consumed by exactly one decision (Fisher eligibility). `flagFromP` has no access to
it; neither does any card.

**This is the natural home for a fix that is not in scope here:** clause (b) already
enumerates what a declared per-test floor would hold.

### 3.11 The worst-group arm's calibration comment — **CONFIRMED, and it speaks to the wrong region**

`src/analysis/aggregation.js:124-131`, verbatim:

> `worstGroupFlag` is a maximum over G group verdicts, so under the null its size is
> 1 − (1 − p)^G rather than p. Measured on the row shuffle, the arm tracks that expression to
> within sampling noise at every group count from two to six and for every test that reaches
> this layer — for example at six groups Autocorrelation's arm reads 2.33% against 2.31%
> predicted, and Windowed Autocorrelation's 8.33% against 8.67%.

**Which p-region do those figures describe?** Inverting `1 − (1 − p)^6`: 2.31% implies
p ≈ 0.0039; 8.67% implies p ≈ 0.015. Both are **at or above the MODERATE threshold**. They are
measurements of the α ≈ 0.01 region.

**Is there any calibration evidence in that file speaking to behaviour near p = 0.001? No.**
The only other quantitative calibration references in `aggregation.js` are the DS15 Fisher
reproduction at `:194-196` (per-group binomP 0.0019 and 0.000001 — a single anecdote, not a
rate) and the Windowed Autocorrelation floor note at `:181-183`, which is an arithmetic
derivation rather than a measurement. Nothing in the file measures a realised rate at the HIGH
threshold.

The arm's Šidák correction is applied to `groupMinP` — a minimum over G group p-values
(`:153-154`) — and is gated on `pDerivedFlag === worstGroupFlag` (`:152`), so it applies only
on a subset of runs. The correction is exact for the multiplicity of the *test*; it does not
address the downward bias a minimum over G *noisy estimates* carries relative to the minimum
over G true values. That bias vanishes as B grows and is not measured anywhere. Recorded, not
resolved.

---

## 4. Live defects recorded, not fixed

1. **`p = 0` emittable** — `benford.js:75`, `benford2.js:115`. Invalid p-value; survives
   `sidakAdjust` (`primitives.js:265`) and the worst-group max; silently drops the group from
   Fisher (`aggregation.js:207`).
2. **Modality's clamp is a constant consumed as a p** by BH-FDR, min-selection, the tier
   function and the Šidák arm — `modality.js:68`, consumers at `:243,:247,:251,:252`,
   `aggregation.js:117,153`.
3. **Resample-count branch inversion** — eight tests take a smaller `B` on larger inputs. No
   branch cites the threshold; all cite wallclock.
4. **V1X §5.4's six-test list is stale on two entries** (First-Digit Frequencies, Runs) and is
   a v1.0 blocker.
5. **METHODOLOGY.md:1175-1177 contradicts `benford.js:89` and METHODOLOGY.md:1675** on whether
   the MAD threshold influences flagging.
6. **No per-test resolution floor is declared as data.** Eight sites re-derive it in prose;
   only `FISHER_EXEMPT` clause (b) consumes the concept.

## 5. What S340 could not see

S340 applied one mechanism (representable grid floor) across 29 tests. This pass finds:

- a **fifth** mechanism — the unconditional cap at `rankCorrelation.js:101-103` — raising the
  count of tests that cannot produce HIGH from seven to **eight**;
- that the **no-by-both** set has exactly **one** member (`Modality Test`), so "which tests
  gain nothing from any resample count" is a much smaller question than the seven-test framing
  implies;
- that three tests are **branch-dependent**, reachable on small inputs and not on large ones —
  a category S340's single-floor-per-test table has no column for;
- that the tier ceiling **does not gate the file-level verdict** (§3.1), so the whole question
  is priced against card expressiveness, not detection reach;
- that two tests have the **opposite** defect and can claim certainty.

Nothing in this document was fixed, tuned or run.

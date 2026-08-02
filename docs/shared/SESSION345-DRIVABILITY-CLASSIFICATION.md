# S345 — drivability classification, all 23 p-computation sites

**Code-owned.** Same class as `SESSION344-FLOOR-SITE-CENSUS.md`. Read-only: no `src/` change was
made and none is proposed here.

Scope: for each of the 23 sites the S344 census inventoried, the property that census did not
classify — **can the site be driven from a test, and does its p line always run?** This is what
P67's per-site floor assertions need, and it is what decides whether the sixteen shuffle-null sites
are cheap or expensive.

Inventory: `SESSION344-FLOOR-SITE-CENSUS.md` Table 1. Module, `file:line`, construction, `c` and
`B` are carried from it and re-verified at source; **no line drift was found**. The guard class,
the zero-exceedance sketch and the verdict column are new.

**Headline — a gate can suppress the p before it is computed, at four of the 23 sites.** The
assumption going in was that it could not. Two of the four report a hardcoded `1` where a computed
p would go, and one of those guards is an effect-size gate. Detail in §2.

**Headline — Excess Kurtosis's denominator can diverge from the `N_SIM` its comment claims, and
S18 is where the divergence would show.** On the S159d early-exit path `simKurts` stops
accumulating at 50 while `N_SIM` stays 1999. S16 and S17 mask it behind a `1.0` override; S18 has
no override and would silently floor at `1/51` instead of `1/2000`. Detail in §3.

---

## 0. What this counts

Every number this document uses, and what it counts. The project already carries circulating
triples, and §0 exists so none of these travels without its referent.

| number | counts |
|---|---|
| **23** | reporting p-computation sites — the census's unit, one expression producing a p from a resample or simulation count. Unchanged from S344. |
| **22 + 1** | verdict-bearing sites + non-verdict sites. Sums to 23. The single non-verdict site is S7. |
| **7 + 16** | parametric-simulation nulls + shuffle/permutation nulls. Sums to 23. The 7 are P67 part three's build set. |
| **4** | sites whose p line can be skipped with a constant reported in its place — guard class C below. |
| **14** | modules holding the 23 sites. All export their entry point. |
| **2** | non-reporting expressions **outside** the 23 — `blockedMahalanobis.js:565` and `:566`. The census's §0 calls this **1**; see §4. |

**Guard classes.** A yes/no "is the p reached unconditionally" column loses the distinction that
matters, so the classification is three-way:

- **A — unconditional.** Past the module's applicability minimums, the p line always runs.
- **B — applicability early-return.** A guard returns `flag: "N/A"` *before* the p. No p is produced
  at all. A synthetic input meeting the stated minimums walks past it. Harmless for driving.
- **C — p suppressed to a constant.** The guard skips the p line and a hardcoded value is reported
  in its place. **The site emits a p that never came from a count.**

---

## 1. The classification

| # | module · entry point | `file:line` | null | `c` | `B` — and where it comes from | guard class | input shape forcing zero exceedances | verdict-bearing |
|---|---|---|---|---|---|---|---|---|
| S1 | ConstOffset · `testConstantOffset` → `_runBlockDetection` | `constantOffset.js:240` | shuffle | 1 | 999 / 499 / 199 — row-count rule, `:173` | A | a perfectly constant-offset column pair | yes — is `primaryP` |
| S2 | ConstOffset · per-pair family | `constantOffset.js:243` | shuffle | 1 | same as S1 | A | same as S1 | yes — `anyPairSig` promotes LOW→MOD at `:104` |
| S3 | RegionalNoise · `testRegionalNoise` scan | `regionalNoise.js:173` | shuffle | 1 | 4999 / 499 — row-count rule, `:148` | B — `:141` returns N/A on no windows | one high-variance block in an otherwise constant column | yes — is `primaryP` |
| S4 | RegionalNoise · per-column family | `regionalNoise.js:176` | shuffle | 1 | same as S3 | B — same | same as S3 | yes — `anyColSig` promotes LOW→MOD at `:188` |
| S5 | WindowedAutocorr · `testWindowedAutocorrelation` | `windowedAutocorrelation.js:140` | shuffle | 1 | 999 / 499 / 199 — row-count rule, `:87` | A | a perfectly serially-correlated window. `nR ≥ 30`; entry point is **async** | yes — `primaryP` = min per-pair adj-p |
| S6 | IRC · `testPearsonUniformity` windowed ICC scan | `interReplicateCorrelation.js:263` | shuffle | 1 | 999 / 499 / 199 — row-count rule, `:244` | **C** — `:242`; default set at `:241` | a monotone difference sequence. Needs `rowSemantics === 'ordered'` | yes — enters `Math.min(globalBestP, scanP)` at `:331` |
| S7 | LOESS · per-segment CUSUM | `loessResidual.js:161` | shuffle | 1 | 4999 / 499 — segment-length rule, `:146` | A | ≥ 2 segments of ≥ `MIN_SEG = 15` rows either side of the primary changepoint | **no** — feeds `secondaryP` (`:172`), a display field |
| S8 | LOESS · pooled variance scan | `loessResidual.js:213` | shuffle | 1 | 4999 / 499 — row-count rule, `:179` | A | a single high-variance block in otherwise flat noise | yes — `combinedP = min(scanP, cusumP)` |
| S9 | LOESS · pooled CUSUM | `loessResidual.js:214` | shuffle | 1 | same as S8 | A | same as S8 | yes — same min |
| S10 | LOESS · per-pair scan | `loessResidual.js:422` | shuffle | 1 | 499 fixed, `:357` | A | same as S8, per replicate pair | yes — `pairBestAdjP` at `:450` |
| S11 | LOESS · per-pair CUSUM | `loessResidual.js:423` | shuffle | 1 | same as S10 | A | same as S10 | yes — same family |
| S12 | RSC · `testResidualSpikeCorrelation` | `residualSpikeCorrelation.js:171` | shuffle | 1 | 999 fixed, `:113` | A | identical top-K residual rows across every group | yes — is `primaryP` |
| S13 | Runs · `testRuns` windowed min-z scan | `runs.js:247` | shuffle | 1 | 999 / 499 / 199 — row-count rule, `:224` | **C** — `:222`; default set at `:221` | a monotone difference sequence. **`esGate` must be off** — needs `nR ≥ 500` and a runs ratio > 0.70 | yes — enters `Math.min(minAdjP, scanP, bestWindowP)` at `:276` |
| S14 | BlockedMahal · `testBlockedMahalanobis` μ pass | `blockedMahalanobis.js:588` | shuffle | 1 | 4999 / 999 — row-count rule, `:510` | A | a displaced-mean window in one condition. `nC ≥ 3`, `N ≥ 60`; entry point is **async** | yes — `bhFDR` at `:593` |
| S15 | BlockedMahal · Σ pass | `blockedMahalanobis.js:589` | shuffle | 1 | same as S14 | A | an inflated-covariance window in one condition | yes — same family |
| S16 | Kurtosis · `testKurtosis` pooled κ | `kurtosis.js:347` | **parametric** | 1 | **`simKurts.length`** ∈ [20, 1999] — *not* `N_SIM`; see §3 | **C** — `:341` | a difference distribution far from Gaussian. `nC ≥ 2`, `nR ≥ 20` | yes — `primaryP` branch at `:540-542` |
| S17 | Kurtosis · pooled A-D | `kurtosis.js:359` | **parametric** | 1 | **`simADs.length`** ∈ [20, 1999] | **C** — `:352` | same as S16 | yes — same branch |
| S18 | Kurtosis · `stratifyKurtosis` per-condition κ | `kurtosis.js:425` | **parametric** | 1 | **`simKurts.length`**, the *shared pooled* null | A — no override; see §3 | a `condCtx` with ≥ 2 row conditions, each ≥ 20 rows and ≥ 20 usable diffs | yes — `condKurtosis.promoted` reaches `finalFlag` at `:508` |
| S19 | Benford 1st · `testBenford` MAD sim | `benford.js:79` | **parametric** | 1 | 5000 fixed, `:56` | B — `:16`, `:24`, `:29`, `:35` | every value with leading digit 1. ≥ 100 non-zero values | yes — is `primaryP` |
| S20 | Benford 2nd · `testBenford2` MAD sim | `benford2.js:117` | **parametric** | 1 | 5000 fixed, `:88` | B — `:22`, `:29`, `:63` | one fixed second digit throughout | yes — is `primaryP` |
| S21 | CCC · `testCrossConditionConsistency` per-unit | `crossConditionConsistency.js:528` | shuffle | **2** | 999 / 499 / 199 on `max(N_c)`, `:167` | A | two conditions with identical sorted marginals. `condCtx` with ≥ 2 conditions of ≥ 2 values | yes — `primaryP` = min over three BH families |
| S22 | Entropy · `testEntropy` per-column bootstrap | `entropyTest.js:103` | **parametric** | **2** | 999 fixed, `:37` | B — `:29`, `:35` | a perfectly degenerate or perfectly uniform column | yes — BH family → `primaryP` |
| S23 | ColumnGoF · `testColumnGof` per-column bootstrap | `columnGof.js:195` | **parametric** | **2** | 2000 fixed, `:48` | B — `:66`, `:72`, `:84` | observed A² above every bootstrap draw. ≥ `MIN_OBS = 30` per column | yes — BH family → `primaryP` |

**Totals.** Parametric 7 (S16–S20, S22, S23) + shuffle 16 = 23. Verdict-bearing 22 + non-verdict 1
(S7) = 23. Guard class A 17, B 6 (S3, S4, S19, S20, S22, S23), C 4 (S6, S13, S16, S17) — but note
S3/S4 and S19/S20/S22/S23 are class B at the module entry and class A at the p line itself; the
class recorded is the strongest guard on the path.

---

## 2. Class C — the four sites that report a p they did not compute

| site | guard | reported instead |
|---|---|---|
| S6 IRC scan | `if (obsScanStat > 0 && scanPairs.length > 0)` — `interReplicateCorrelation.js:242` | `scanP = 1`, set at `:241` |
| S13 Runs scan | `if (!esGate && obsScanStat < Infinity && scanSeqs.length > 0)` — `runs.js:222` | `scanP = 1`, set at `:221` |
| S16 Kurtosis κ | `if (earlyExit) kurtP = 1.0;` — `kurtosis.js:341` | `1.0` |
| S17 Kurtosis A-D | `if (earlyExit) adP = 1.0;` — `kurtosis.js:352` | `1.0` |

S13's guard is an **effect-size gate**. The assumption this classification set out to test was that
an effect-size gate could not reach a p line; at S13 it does, and the site then reports a `1` that
came from a gate rather than from 999 permutations. S6 and S13 both carry a comment at `:238-240` /
`:218-220` noting that `nPerm` is published as `null` when the scan does not run — so the *count* is
honestly withheld on that path, while the *p* is not.

**Neither class-C guard blocks a floor assertion, and the reasons differ.** Kurtosis's `earlyExit`
fires only when the observed statistic is **close** to the null body — `obsDev < pilotSimMAD *
PILOT_GATE_FACTOR` at `:322`, with `N_PILOT = 50` and `PILOT_GATE_FACTOR = 0.5` at `:234-235`. An
input engineered for zero exceedances puts the observed statistic maximally **far** from the null,
so the gate cannot fire on it. That is avoidance by construction, not by luck, and it is worth
stating because the opposite reading — "the gate might fire, so the site is not drivable" — would
have removed two of the seven from scope. S6 and S13 are shuffle sites and are outside the seven
regardless.

---

## 3. Excess Kurtosis — `simKurts.length` is the denominator, and it can diverge from `N_SIM`

The comment at `kurtosis.js:167` reads `const N_SIM = 1999; // p-value floor = 1/2000 = 0.0005`.
The expression at `:347` divides by `simKurts.length + 1`. On every path the corpus exercises these
agree, and nothing asserts that they do.

**They diverge on the S159d early-exit path.** The mechanism is at `:240-246`: when `earlyExit` is
set, the simulation loop **`continue`s** rather than breaking — it burns the iteration's PRNG quota
so downstream tests stay reproducible — and stops pushing to `simKurts`. The array therefore freezes
at `N_PILOT = 50` while `N_SIM` remains 1999. The denominator is 51, not 2000.

S16 and S17 mask this: both are overridden to `1.0` on the same path (`:341`, `:352`), so the
divergent denominator never reaches their output.

**S18 does not.** `kurtosis.js:425` computes `(nExceed + 1) / (simKurts.length + 1)` from that same
shared, possibly-truncated null, and it carries **no `earlyExit` override**. On the early-exit path
S18's floor is `1/51 ≈ 0.0196` rather than `1/2000 = 0.0005` — a factor of 39, crossing every flag
tier.

This is a **latent divergence, not a live defect**: the early-exit gate cannot fire on an input
engineered for zero exceedances, so no floor assertion will observe it. It is recorded because it is
the concrete argument for declaring all three Kurtosis sites' `B` as `simKurts.length` /
`simADs.length` rather than as `N_SIM` — a declaration written from the comment would be wrong on a
path the code can actually take.

**Blocked Mahalanobis is the contrast case.** Its early exit (`:571`) freezes the exceedance
counters the same way, but S14/S15 divide by the fixed `N_PERM + 1` (`:588-589`), so the floor
cannot move. Same optimisation, different exposure — the difference is whether the denominator is a
constant or an accumulating length.

---

## 4. The non-verdict count, settled

The count has circulated as four while three items were listed. Applying the census's own unit rule
— *one expression that produces a p-value from a resample or simulation count* — to each:

| cited | what it is | inside the 23? |
|---|---|---|
| S7 — LOESS per-segment CUSUM, `loessResidual.js:161` | a genuine p-site. Feeds `secondaryP` at `:172`, read only for display at `:239`, `:269`, `:459` | **yes** — and the only non-verdict site among the 23 |
| `blockedMahalanobis.js:565` and `:566` | the S159d early-exit floor probe. **Two expressions, therefore two sites** by the census's rule — one per pass. Both non-reporting: they feed `bhFDR` at `:568` and are discarded | **no** — outside the 23 |
| `kurtosis.js:498` | `bhFDR(fullRawPs)` — a display-only BH re-adjustment over the full condition set. **Not a p-computation site at all**: it re-adjusts p's already computed elsewhere. The comment at `:494-495` states it "leaves … primaryP untouched, so the verdict cannot move" | **no** — and it does not belong in a list of p-sites |

**Verdict-bearing 22 + non-verdict 1 = 23.** The "four" appears to have come from counting the
Mahalanobis probe as two and including `kurtosis.js:498`, which is neither a p-site nor inside the
23.

**One contradiction with the census, reported not amended** (the census is read here as the
inventory; amendments are not in this dispatch's scope). Its §0 table reads "23 p-computation
sites, plus **1** non-reporting site (BM's early-exit floor probe)". By its own one-expression rule
that is **2** — `:565` and `:566` are separate expressions, exactly as `:588` and `:589` are counted
separately as S14 and S15. The 23 is unaffected.

Two further clarifications against census Table 2, which are refinements rather than contradictions.
S2 is described as feeding `anyPairSig` "only" and S4 as feeding `anyColSig` "only"; both of those
booleans **promote LOW → MODERATE** (`constantOffset.js:104`, `regionalNoise.js:188`), so both sites
are verdict-bearing. "Only" describes the narrowness of the channel, not an absence of verdict
reach.

---

## 5. What this confirms from S344

- **All 23 sites are drivable without touching `src/`.** All 14 modules export their entry point.
  Confirmed; no new export is needed for any site.
- **The parametric nulls do not depend on the input.** All seven draw independently of the observed
  data, so forcing zero exceedances needs only an observed statistic outside the simulated support —
  no structured synthetic input, unlike the sixteen shuffle sites. These are the cheap ones.

## 6. One stale comment, flagged not fixed

`columnGof.js:146` describes "the B=999 bootstrap" where the constant at `:48` is `const B = 2000`.
The stale figure is in a performance note and nothing computes from it, so no p is wrong — but it is
precisely the drift class a generated floor manifest exists to catch: a comment stating a count that
the code no longer uses. Recorded here as the worked example.

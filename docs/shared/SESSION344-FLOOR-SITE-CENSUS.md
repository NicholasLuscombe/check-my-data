# S344 — P67 floor-site census

**Code-owned.** Same class as `SESSION343-GATE-PROVENANCE-AUDIT.md`. Read-only census: no `src/`
change was made and none is proposed here.

Scope: every place in the battery where a p-value is produced from a resample or simulation count,
classified so P67 (a per-module floor assertion) can be scoped. Builds the inventory; does not
build the fix.

**Headline — P67 is small.** No shared p helper, no runner to build, every module exported, `B` in
scope at every site, and `m` in the same scope as the p at 10 of the 11 BH-fed sites. The three-part
shape the dispatch describes is reachable as written, with one carve-out named in §3 Q4.

**Headline — the census contradicts METHODOLOGY and S343 in four places**, all with `file:line` in
§1. The largest is that the Runs windowed BH family — the `m = 4208` METHODOLOGY cites as a reason
no reachable `B` helps — is not a permutation family at all.

Reads: `CLAUDE.md`; `docs/shared/SESSION343-GATE-PROVENANCE-AUDIT.md` Part 2;
`docs/shared/METHODOLOGY.md` §"Permutation-Test Arithmetic Constraints" (lines 45–137).
METHODOLOGY is Chat-owned and was not edited — contradictions are reported, not fixed.

---

## 0. What this counts

A **p-computation site** is one expression that produces a p-value from a resample or simulation
count. The unit is the site, not the test.

Three numbers, each counting something different. Naming them explicitly because the project
already carries two circulating triples:

| number | counts |
|---|---|
| **13** | rows in `SESSION343-GATE-PROVENANCE-AUDIT.md` §2.3's construction table — the number METHODOLOGY carries. It collapses Benford first and second digit into one row. |
| **14** | entries in `engine.js`'s `tests` array (of 29) whose result carries a p produced from a resample or simulation count. **11 one-sided + 3 doubled.** |
| **23** | p-computation sites, plus 1 non-reporting site (BM's early-exit floor probe). |

**13 is not a count of tests.** Benford first digit and Benford second digit are two separate
dispatch entries, two separate modules, two separate MiniCards and two of the 29. METHODOLOGY's
"ten of the battery's thirteen resampling tests are one-sided" should read **eleven of fourteen**.
Over sites the split is **20 one-sided / 3 doubled**.

The 15 remaining tests produce no p from a resample count (§4). 14 + 15 = 29. ✓

## 1. What S343 Part 2 already answers, and what it does not

S343 §2.3 already establishes, at source and with `file:line`, the **construction** (one-sided /
doubled / folded) and the **`B` provenance** for 13 rows. **That work is not re-derived here.** Its
sided column was independently confirmed by its own corpus harvest, and every construction it names
matched a fresh read at the same line.

Columns this census needs that S343 does not cover:

- **site granularity** — S343 is per test. Its LOESS row cites three lines as one entry; there are
  five LOESS sites at four different `B` values. Its Kurtosis row cites two; there are three.
- **`B` in scope at the p site** — not asked.
- **clamps** — not asked.
- **which BH call each site feeds, and where `m` is computed** — S343 harvests `m` by stack frame
  but does not connect a p site to its family.
- **drivability** — not asked.

### Four places a fresh read disagrees with S343 §2.3 / METHODOLOGY

**(a) The Runs `m = 4208` family is analytic, not permutation.** Both docs treat
`runs.js:259` as a permutation BH family and use its `m` as evidence that no reachable `B` helps.

`runs.js:258` — `const windowRawPs = esGate ? [] : allWindowResults.map(w => zToP(w.rawZ));`
`runs.js:259` — `const windowAdjPs = windowRawPs.length ? bhFDR(windowRawPs) : [];`

`zToP` is `2·(1−Φ(|z|))` (`primitives.js:132`). These raw p's come from a distribution function.
S343's own harvest records the smallest raw p at that site as `0.0005`, which is **not on the
permutation grid** at any `N_PERM` the test uses (999 → 0.001, 499 → 0.002, 199 → 0.005) —
the measurement was already inconsistent with the label.

Runs has exactly **one** permutation site, `runs.js:247`, and its p is **not in any BH family**.
So METHODOLOGY's "`m` … reaches 4208 for the Runs windowed scan. For those, no reachable `B`
helps" is true of a family that has no `B`. `test/probes/probe-resample-census.mjs:57` already
carried the correct note — "window scan only; minAdjP is analytical" — so this is a regression
against a fact the repo held.

Windowed Autocorrelation's `m = 298` **does** hold: `windowedAutocorrelation.js:189` runs over
`u.rawP` from `:140`, which is the permutation p.

**(b) Kurtosis's denominator is not `N_SIM`.** S343 and the comment at `kurtosis.js:167`
(`N_SIM = 1999; // p-value floor = 1/2000 = 0.0005`) both read as though 1999 is the denominator.
It is not:

`kurtosis.js:347` — `kurtP = (nExceed + 1) / (simKurts.length + 1);`

`simKurts.push(...)` is guarded on `batchLen >= 20` (`:294`), so `simKurts.length ≤ N_SIM`. The
stated floor `1/2000` is exact only when every one of the 1999 batches produced ≥ 20 diffs; short
of that the floor is *higher*, never lower. On the pilot-gate early-exit path the length is ~50 and
`kurtP` is overridden to `1.0` (`:342`), so the short-denominator case never reports a
short-denominator p. **The comment is a claim about `N_SIM`; the code's floor is a claim about
`simKurts.length`.** They agree on every live path measured, but nothing asserts that they do —
which is exactly the P67 failure mode.

**(c) S343 §2.3 lists one Kurtosis BH site; there are three.** `kurtosis.js:132` (per-pair,
analytic `zToP`), `:479` (per-condition platykurtic family, **promotion-bearing**), `:498`
(per-condition full set, **display-only**). S343's harvest names only `:498` — the one that cannot
move a verdict.

**(d) `test/probes/probe-resample-census.mjs` has drifted** and its own anchors are stale. It is
the nearest prior art to P67 and worth naming so nobody builds on it:

| row | says | source now says |
|---|---|---|
| Benford 1st / 2nd | `floor: n => 1/n`, "exceed / N, no +1" | `benford.js:79` / `benford2.js:117` are `(k+1)/(B+1)`; floor `1/5001` |
| Column GoF | `counts: [999]`, `at: columnGof.js:36` | `columnGof.js:48` — `B = 2000` |
| CCC | `floor: n => 1/(1+n)` | doubled; floor `2/(B+1)` |
| IRC | `at: interReplicateCorrelation.js:241` | `:244` |
| LOESS | one entry, `:179` | three `B` values across five sites |

A hand-maintained census file that nothing checks is the same class of artefact as the
METHODOLOGY section. Noted, not fixed.

---

## 2. Part 1 — the site census

23 reporting sites. Two tables, **the same 23 rows in the same order** — one row per site, split
because ten columns of quoted expressions is unreadable in one grid.

### Table 1 — construction and arithmetic

`c` is the numerator: 1 one-sided, 2 doubled. Floor is `c/(B+1)` at every `B` the site can take.
Tier is `flagFromP` at the floor, strict `<` in both comparisons (`thresholds.js:39`).

| # | site | `file:line` | construction (verbatim) | `c` | `B` at this site | floor(s) | best tier |
|---|---|---|---|---|---|---|---|
| S1 | ConstOffset / `_runBlockDetection` / pooled block scan | `constantOffset.js:240` | `const permP = (permExceed + 1) / (N_PERM + 1);` | 1 | 999 / 499 / 199 | 0.001 / 0.002 / 0.005 | MOD |
| S2 | ConstOffset / `_runBlockDetection` / per-pair family | `constantOffset.js:243` | `const pairPermPs = pairExceed.map(e => (e + 1) / (N_PERM + 1));` | 1 | 999 / 499 / 199 | 0.001 / 0.002 / 0.005 | MOD |
| S3 | RegionalNoise / `testRegionalNoise` / windowed scan | `regionalNoise.js:173` | `const scanP = (exceedCount + 1) / (N_PERM + 1);` | 1 | 4999 / 499 | 0.0002 / 0.002 | **HIGH** |
| S4 | RegionalNoise / `testRegionalNoise` / per-column family | `regionalNoise.js:176` | `const colPermPs = colExceed.map(e => (e + 1) / (N_PERM + 1));` | 1 | 4999 / 499 | 0.0002 / 0.002 | **HIGH** |
| S5 | WindowedAutocorr / `testWindowedAutocorrelation` / per-window | `windowedAutocorrelation.js:140` | `const rawP = (exceed[w] + 1) / (N_PERM + 1);` | 1 (folded `\|r\|`) | 999 / 499 / 199 | 0.001 / 0.002 / 0.005 | MOD |
| S6 | IRC / `testPearsonUniformity` / windowed ICC scan | `interReplicateCorrelation.js:263` | `scanP=(exceedCount+1)/(N_PERM+1);` | 1 | 999 / 499 / 199 | 0.001 / 0.002 / 0.005 | MOD |
| S7 | LOESS / `testLoessResidual` / per-segment CUSUM | `loessResidual.js:161` | `const segP = (segExceed + 1) / (segNPerm + 1);` | 1 | 4999 / 499 | 0.0002 / 0.002 | **HIGH**† |
| S8 | LOESS / `testLoessResidual` / pooled variance scan | `loessResidual.js:213` | `const scanP = (exceedScan + 1) / (N_PERM + 1);` | 1 | 4999 / 499 | 0.0002 / 0.002 | **HIGH** |
| S9 | LOESS / `testLoessResidual` / pooled CUSUM | `loessResidual.js:214` | `const cusumP = (exceedCusum + 1) / (N_PERM + 1);` | 1 | 4999 / 499 | 0.0002 / 0.002 | **HIGH** |
| S10 | LOESS / `testLoessResidual` / per-pair scan | `loessResidual.js:422` | `const ppSP = (ppExS + 1) / (PP_PERM + 1);` | 1 | 499 (fixed) | 0.002 | MOD |
| S11 | LOESS / `testLoessResidual` / per-pair CUSUM | `loessResidual.js:423` | `const ppCP = (ppExC + 1) / (PP_PERM + 1);` | 1 | 499 (fixed) | 0.002 | MOD |
| S12 | RSC / `testResidualSpikeCorrelation` / max-overlap perm | `residualSpikeCorrelation.js:171` | `const permP = (permExceed + 1) / (N_PERM + 1);` | 1 | 999 (fixed) | 0.001 | MOD |
| S13 | Runs / `testRuns` / windowed min-z scan | `runs.js:247` | `scanP=(exceedCount+1)/(N_PERM+1);` | 1 | 999 / 499 / 199 | 0.001 / 0.002 / 0.005 | MOD |
| S14 | BlockedMahal / `testBlockedMahalanobis` / μ pass | `blockedMahalanobis.js:588` | `const rawMu = (ws.exceedTsq + 1) / (N_PERM + 1);` | 1 | 4999 / 999 | 0.0002 / 0.001 | **HIGH** |
| S15 | BlockedMahal / `testBlockedMahalanobis` / Σ pass | `blockedMahalanobis.js:589` | `const rawSig = (ws.exceedR + 1) / (N_PERM + 1);` | 1 | 4999 / 999 | 0.0002 / 0.001 | **HIGH** |
| S16 | Kurtosis / `testKurtosis` / pooled κ simulation | `kurtosis.js:347` | `kurtP = (nExceed + 1) / (simKurts.length + 1);` | 1 (folded dev) | `simKurts.length` ∈ [20, 1999] | 1/(len+1); 0.0005 at full sim | **HIGH** |
| S17 | Kurtosis / `testKurtosis` / pooled A-D simulation | `kurtosis.js:359` | `adP = (nExceed + 1) / (simADs.length + 1);` | 1 | `simADs.length` ∈ [20, 1999] | 1/(len+1); 0.0005 at full sim | **HIGH** |
| S18 | Kurtosis / `stratifyKurtosis` / per-condition κ | `kurtosis.js:425` | `const condP = (nExceed + 1) / (simKurts.length + 1);` | 1 (folded dev) | `simKurts.length` (shared null) | 1/(len+1); 0.0005 at full sim | **HIGH** |
| S19 | Benford 1st / `testBenford` / MAD simulation | `benford.js:79` | `pMAD = (madExceedCount + 1) / (N_SIM_BENFORD + 1);` | 1 | 5000 (fixed) | 0.00019996 | **HIGH** |
| S20 | Benford 2nd / `testBenford2` / MAD simulation | `benford2.js:117` | `const pMAD = (madExceedCount + 1) / (N_SIM + 1);` | 1 | 5000 (fixed) | 0.00019996 | **HIGH** |
| S21 | CCC / `testCrossConditionConsistency` / per-unit two-sided | `crossConditionConsistency.js:528` | `u.p2 = Math.min(1, 2 * Math.min(pUpper, pLower));` | **2** | 999 / 499 / 199 | 0.002 / 0.004 / **0.010** | MOD / MOD / **none** |
| S22 | Entropy / `testEntropy` / per-column bootstrap | `entropyTest.js:103` | `const rawP = Math.min(1.0, Math.min(pLow, pHigh) * 2);` | **2** | 999 (fixed) | 0.002 | MOD |
| S23 | ColumnGoF / `testColumnGof` / per-column bootstrap | `columnGof.js:195` | `const rawP = Math.min(1, Math.min(pLow, pHigh) * 2);` | **2** | 2000 (fixed) | 0.00099950 | **HIGH** |

† S7's p never reaches a verdict — it feeds `secondaryP` (`loessResidual.js:172`), a display field.
Its tier column is arithmetic only.

**Non-reporting site.** `blockedMahalanobis.js:565-566` computes
`(ws.exceedTsq + 1) / (N_PERM + 1)` and `(ws.exceedR + 1) / (N_PERM + 1)` mid-loop as a
floor-rawP probe for the S159d LOW-path early exit, feeds them to `bhFDR` at `:568`, and discards
them. Same construction, same `B`, never reported. It is a fourth consumer of the floor arithmetic
and would break silently if the construction at `:588-589` ever changed without it — a candidate
for the assertion set, listed separately because it emits no p.

### Two inversions in Table 1

**S21 at `B = 199`: Cross-Condition Consistency cannot flag at all.** `B = maxN <= 1000 ? 999 :
maxN <= 10000 ? 499 : 199` (`crossConditionConsistency.js:167`). At the third arm the floor is
`2/200 = 0.010`, and `flagFromP` is strict: `0.010 < ALPHA.NOTE (0.01)` is false. **On any dataset
whose largest condition exceeds 10,000 rows, CCC is arithmetically incapable of returning anything
but LOW**, at any effect size, with a perfect signal. Not reachable on the 27-fixture corpus
(largest is 1500 rows), so the batch cannot see it. Reported, not acted on.

**S12, S22: two fixed counts sit exactly one step from a tier.** RSC at `B = 999` floors at
`0.001`, which is not `< 0.001` — one more draw (`B = 1000`) would make HIGH reachable. Entropy at
`B = 999` doubled floors at `0.002`; HIGH needs `B ≥ 2000`. Neither count cites a threshold
(S343: "bare constants with no stated basis").

### Table 2 — plumbing

Same 23 rows, same order.

| # | site | `B` in scope? | `B` published on result | clamp / override | BH family (`m` at `file:line`) | drivable |
|---|---|---|---|---|---|---|
| S1 | ConstOffset pooled | yes — `:173` | `nPerm` (`:116`, `:247`) | none | **none** — is `primaryP` (`:116`) | yes |
| S2 | ConstOffset per-pair | yes — `:173` | `nPerm` | none | `bhFDR` `:244`; `m = permVecs.length`, capped 30 (`MAX_PERM_PAIRS`, `:174`). Feeds `anyPairSig` only | yes |
| S3 | RegionalNoise scan | yes — `:148` | `nPerm` (`:225`) | none | **none** — is `primaryP` (`:242`) | yes |
| S4 | RegionalNoise per-col | yes — `:148` | `nPerm` | none | `bhFDR` `:177`; `m = nC`. Feeds `anyColSig` only | yes |
| S5 | WAC per-window | yes — `:87` | `nPerm` (`:234`) | none | `bhFDR` `:189`, **one call per pair**; `m` = windows in that pair. `primaryP` = min adj-p across all pairs (`:198`) | yes |
| S6 | IRC scan | yes — `:244` | `nPerm` (`:340`), `null` when scan skipped | **`scanP = 1` default** `:241` | **none** — enters `Math.min(globalBestP, scanP)` `:331` | yes |
| S7 | LOESS segment | yes — `:146` | **no** | none | **none** — display only | yes |
| S8 | LOESS scan | yes — `:179` | `nPerm` (`:460`) | none | **none** — `combinedP = min(scanP, cusumP)` `:225` | yes |
| S9 | LOESS CUSUM | yes — `:179` | `nPerm` | none | **none** — same min | yes |
| S10 | LOESS per-pair scan | yes — `:357` | **no** | none | `bhFDR` `:436`; `m = pairResults.length`, capped 30 (`:356`) | yes |
| S11 | LOESS per-pair CUSUM | yes — `:357` | **no** | none | same call, same family (via `combinedP`) | yes |
| S12 | RSC perm | yes — `:113` | `nPerm` (`:234`) | none | **none** — is `primaryP` (`:235`) | yes |
| S13 | Runs scan | yes — `:224` | `nPerm` (`:310`), `null` when skipped | **`scanP = 1` default** `:221` | **none** — enters `Math.min(minAdjP, scanP, bestWindowP)` `:276` | yes |
| S14 | BM μ | yes — `:510` | `nPerm` (`:677`) | none | `bhFDR` `:593`; `m = units.length = 2 × nApplicableConditions` | yes (async) |
| S15 | BM Σ | yes — `:510` | `nPerm` | none | same call, same family | yes (async) |
| S16 | Kurtosis pooled κ | literal `:167`, **but not the denominator** | `nSimulations: simKurts.length` (`:535`) | **`kurtP = 1.0`** on pilot early-exit `:342` | **none** — `pooledP` `:369` | yes |
| S17 | Kurtosis pooled A-D | as above | `nSimulations` | **`adP = 1.0`** `:356` | **none** — `pooledP` at `nC ≤ 3` | yes |
| S18 | Kurtosis per-cond | as above | `nSimulations` | none | `bhFDR` `:479` (`m` = platykurtic conds, **promotion-bearing**) and `:498` (`m` = all conds, **display-only**) | yes (needs `condCtx`) |
| S19 | Benford 1st | yes — `:56` | `nSimulations` (`:100`) | none | **none** — is `primaryP` | yes |
| S20 | Benford 2nd | yes — `:88` | `nSimulations` (`:138`) | none | **none** — is `primaryP` | yes |
| S21 | CCC per-unit | yes — `:167` | `B` (`:741`) | `Math.min(1, …)` ceiling, part of the doubling | **three** — `bhFDR` `:567` (stage 1, `m` = pair × pool props), `:571` (stage 2, residual), `:575` (stage 3, mvslope) | yes (needs `condCtx`) |
| S22 | Entropy per-col | yes — `:37` | `nPerm: B` (`:177`) | `Math.min(1.0, …)` ceiling | `bhFDR` `:128`; `m = tested.length` (columns ≥ 20 obs) | yes |
| S23 | ColumnGoF per-col | yes — `:48` (module const) | `nPerm: B` (`:264`) | `Math.min(1, …)` ceiling | `bhFDR` `:224`; `m = tested.length` (columns ≥ `MIN_OBS = 30`) | yes |

**`B` is in scope at 23 of 23 sites.** Expectation 2 holds outright. The only subtlety is S16–S18,
where the in-scope literal (`N_SIM = 1999`) is *not* the denominator — an assertion that reads
`N_SIM` there would be asserting the comment, not the code.

**`B` is published on the result at 20 of 23 sites.** The three that are not are LOESS's per-pair
pair (`PP_PERM = 499`) and per-segment (`segNPerm`) sites; `loessResidual.js:460` publishes only
the scan's `N_PERM`. A manifest built from result objects alone would be blind to those three.

**11 of 23 sites feed a `bhFDR` call; 12 do not.** Of the 37 `bhFDR` call sites in `src/`, 13
consume a resampled p, and of those two are not verdict-bearing (`blockedMahalanobis.js:568`
early-exit control flow; `kurtosis.js:498` display-only).

### Clamps

**Modality's `P_FLOOR` is the only hardcoded p-floor constant in the battery**, and it is not on a
resampling site.

`modality.js:68` — `const P_FLOOR = 0.001;`
`modality.js:162` — `if (p < P_FLOOR) return P_FLOOR;`

Modality's p is analytic — a Hartigan dip statistic against the tabulated `qDiptab` quantiles
(`:107-165`), no simulation, no `rng` draw. The clamp is a vestige preserving the calibration of a
bootstrap that was retired at S159b. There is no count to raise and no floor arithmetic to assert;
it is a constant with a stated reason and no live derivation behind it.

A search for `Math.max` / epsilon / floor patterns across `src/tests/`, `src/analysis/` and
`src/stats/` found **no second p-floor**. It found three other classes, none of which is a floor:

1. **Hardcoded `p = 1` overrides** — `kurtosis.js:342` and `:356` (pilot early-exit), plus
   `let scanP=1` defaults at `interReplicateCorrelation.js:241` and `runs.js:221`, and
   `primaryP: 1` on LOESS's zero-window early return (`:84`). These are ceilings, deliberate, and
   documented at each site. They matter to an assertion only as paths where the floor arithmetic
   does not run.
2. **Doubling ceilings** — `Math.min(1, …)` at S21/S22/S23. Part of the construction, not a clamp.
3. **Numeric guards on statistics, not p's** — `mahalanobis.js:113` (`Math.max(0, d2)`),
   `duplicateDetection.js:123` (`pMatch = Math.max(pMatch, 1/(rangeMax+1))`, a null-model
   parameter), `aggregation.js:209` (`Math.max(p, 1e-300)` inside Fisher's χ²).

**One aggregation-layer transform does move the reported floor, and it is not a clamp.**
`aggregation.js:154` — `groupMinPAdj = sidakAdjust(groupMinP, applicable.length)`. On the
per-condition dispatch path the reported p is `1 − (1 − p)^G`, so the *aggregate's* floor is
`1 − (1 − c/(B+1))^G`, not `c/(B+1)`. Šidák only inflates, so it can only lose a tier. Seven tests
are on `FISHER_EXEMPT` (`aggregation.js:196-204`) partly for this reason. **A floor assertion
written against the module's return value is not an assertion about what the engine reports for a
condition-grouped file** — worth deciding explicitly at build time which of the two P67 asserts.

Two name collisions that a naive `const B` grep hits and that are not resample counts:
`selectiveNoise.js:89` (Bartlett's statistic) and `blockedMahalanobis.js:289` (a window length).

### Drivability

**Every one of the 23 sites is drivable without touching `src/`.** All 14 modules export their
entry point; `createPRNG(matrix)` (`prng.js:82`) and `createConditionContext` (`conditionContext.js:44`)
are both exported, so a direct call is
`testX(matrix, [condCtx], createPRNG(matrix), …)`. ConstOffset's sites sit in a module-private
helper (`_runBlockDetection`, `constantOffset.js:133`) but `testConstantOffset` reaches them.

**An rng stub is the wrong tool for a shuffle null, and it fails in the safe direction.** An
identity-shuffle stub makes every permuted statistic equal the observed one, giving
`exceed = B` and `p = 1` — the opposite of the floor. Forcing zero exceedances needs a **synthetic
input whose structure any shuffle destroys**. That splits the sites two ways:

- **Shuffle nulls (S1–S15, S21)** — the null is a permutation of the observed data, so the input
  must be maximally structured: a perfectly constant-offset column pair (S1/S2), a monotone or
  perfectly serially-correlated difference sequence (S5, S6, S13), a single high-variance block in
  an otherwise constant column (S3/S4, S8–S11), identical top-K residual rows across every group
  (S12), one condition with a displaced mean and inflated covariance in one window (S14/S15), two
  conditions with identical sorted marginals (S21).
- **Parametric-simulation nulls (S16–S20, S22, S23)** — the null draws do not depend on the input
  at all, so zero exceedances needs only an observed statistic outside the simulated support:
  every value with leading digit 1 (S19), a fixed second digit (S20), a perfectly uniform or
  perfectly degenerate column (S22, S23), a difference distribution far from Gaussian (S16–S18).
  These are the cheap ones.

Extra construction cost, by site:

| site | additional requirement to reach the p line |
|---|---|
| S7 | ≥ 2 segments of ≥ `MIN_SEG = 15` rows either side of the primary changepoint (`loessResidual.js:131-135`) |
| S13 | `!esGate && obsScanStat < Infinity && scanSeqs.length > 0` (`runs.js:222`); `esGate` needs `nR < 500` or a runs ratio ≤ 0.70 |
| S6 | `obsScanStat > 0 && scanPairs.length > 0` (`interReplicateCorrelation.js:242`), and `rowSemantics === 'ordered'` |
| S18 | a `condCtx` with ≥ 2 row conditions, each ≥ 20 rows and ≥ 20 usable diffs (`kurtosis.js:409, 418`) |
| S21 | a `condCtx` with ≥ 2 conditions of ≥ 2 values (`crossConditionConsistency.js:161`) |
| S14/S15 | `nC ≥ 3` (`MIN_NC`), `N ≥ 60` (`MIN_N_CONSTRUCT`); entry point is `async` — `await` it |
| S5 | `nR ≥ 30` (`MIN_ROWS`); entry point is `async` |
| S16–S18 | `nC ≥ 2`, `nR ≥ 20`; the 1999-iteration loop runs, so these are the slow ones (~0.7 s each) |
| S19/S20 | ≥ 100 non-zero values; 5000 × min(N, 10000) draws |
| S23 | ≥ `MIN_OBS = 30` per column, and a fit family the pre-skip gates admit |

None of the applicability gates blocks a synthetic input — they are all row/column-count minimums a
generated fixture satisfies trivially.

---

## 3. Part 2 — the infrastructure questions

### Q1 — Is there a shared p-computation helper?

**No. There is none, and all 23 sites compute inline.**

`src/stats/primitives.js` exports 28 functions (`:9`–`:479`). None takes an exceedance count and a
`B`. The p-adjacent ones are `zToP` (`:132`), `chiSquaredP` (`:143`), `normalCDF` (`:122`),
`regIncBeta` (`:225`), `bhFDR` (`:235`), `sidakAdjust` (`:262`), `pooledTtoP` (`:447`) — all
analytic or post-hoc. No function anywhere in `src/` wraps `(k + 1) / (B + 1)`.

**Sites using a helper: 0. Sites computing inline: 23.** Expectation 3 holds.

The two doubled-construction sites S22 and S23 are near-duplicates of each other
(`entropyTest.js:100-103` vs `columnGof.js:191-195` — same shape, same counter-starts-at-1
convention, different variable names), and S21 is the same construction written a third way. That
is the only near-repetition in the set; the other 20 sites are genuine one-liners.

### Q2 — What test infrastructure exists?

**Vitest is configured and running. A new per-module test file needs no setup.**

- `vitest ^2.1.8` is a devDependency (`package.json`).
- Config lives in `vite.config.js`'s `test:` block: `environment: 'jsdom'`, `globals: true`,
  `setupFiles: ['./test/setup.js']`. **No `include` override**, so vitest's default
  `**/*.{test,spec}.?(c|m)[jt]s?(x)` applies.
- Two files match today: `test/smoke.test.jsx` and `test/probes/probe-s327-skip-detail.test.jsx`.

Verified by running it:

```
Test Files  2 passed (2)
     Tests  4 passed (4)
  Duration  1.22s
```

**The exact command:**

```bash
npm test
```

A new `test/floor-sites.test.mjs` is picked up automatically — no config change, no `include`
edit. `test/` otherwise holds `validate-batch.mjs` (the 27-fixture batch, a plain node script) and
~60 one-off `diag-*.mjs` / `probes/*.mjs` scripts run by hand.

One caveat for the build: `environment: 'jsdom'` costs ~550 ms of setup per run and is irrelevant
to pure-stats modules, but it is global config and changing it is out of P67's scope. It is not a
blocker.

**No CI runs the tests.** `.github/workflows/deploy.yml` is the only workflow and runs
`npm ci && npm run build`. A P67 assertion suite would be a local gate unless a CI step is added —
that is a decision, not a finding.

### Q3 — Can a site's floor be measured rather than derived?

**Yes, at 23 of 23 sites.** See §2 Drivability. No site's p path is unreachable without changing
`src/`; nothing needs to be newly exported.

The honest caveat: **measuring the floor means constructing an input that reaches zero
exceedances, and for the 16 shuffle-null sites that construction is per-site work, not boilerplate.**
The 7 parametric-simulation sites are cheap. A build that starts with those and adds shuffle-null
fixtures one at a time will get value earlier than one that tries all 23 at once.

A second route exists and is worth naming because it is cheaper and tests the same claim: **assert
the floor by driving the site to its floor from the other side** — construct an input at which the
site returns a p, then assert that p is an exact integer multiple of `c/(B+1)`, i.e. that it sits
on the declared grid. Grid membership falsifies a wrong `c` or a wrong `B` without needing the
extreme case. It does not verify the floor is *reachable*, only that the arithmetic is what the
manifest says. The two together are stronger than either.

### Q4 — Where would `m` be readable at run time?

**Expectation 5 inverts. `m` is in the same scope as the p at 10 of the 11 BH-fed sites.**

The 11 sites sit in 9 `bhFDR` families (S10 shares a call with S11, S14 with S15):

| site | p site | `bhFDR` call | same function scope? |
|---|---|---|---|
| S2 | `constantOffset.js:243` | `:244` | yes (adjacent lines) |
| S4 | `regionalNoise.js:176` | `:177` | yes (adjacent lines) |
| S5 | `windowedAutocorrelation.js:140` | `:189` | yes |
| S10/S11 | `loessResidual.js:422-423` | `:436` | yes |
| S14/S15 | `blockedMahalanobis.js:588-589` | `:593` | yes |
| S21 | `crossConditionConsistency.js:528` | `:567`, `:571`, `:575` | yes |
| S22 | `entropyTest.js:103` | `:128` | yes |
| S23 | `columnGof.js:195` | `:224` | yes |
| S18 | `kurtosis.js:425` (inside `stratifyKurtosis`, `:401`) | `:479` / `:498` (outer body) | **no** |

`m` is never a named variable — it is the implicit `pValues.length` inside `bhFDR`
(`primitives.js:236`). But the array is built at the call site in every case, so `m` is one
`.length` away.

**The real obstacle is not `m`. It is `j`.** The coarseness step is `(m/j) × c/(B+1)`, where `j`
is the rank supplying the family minimum. `bhFDR` computes `j` implicitly and **throws it away**:

```js
for(let r = n - 1; r >= 0; r--) {
  const raw = indexed[r].p * n / (r + 1);
  minAdj = Math.min(minAdj, raw);
  adj[indexed[r].i] = Math.min(minAdj, 1);
}
return adj;                       // primitives.js:246
```

The return is the adjusted vector only. Nothing in `src/` records which rank won, and nothing
downstream can recover it from `adj` alone. So:

- **The floor needs one home**, at the p site, where `c` and `B` both live. Reachable everywhere.
- **The coarseness ratio needs a second home** — and it needs `bhFDR` to return the winning rank,
  or a parallel helper that recomputes it. That is a `src/` change to a function 37 call sites
  consume, which puts it outside a `test/`-only P67 as the design lean scopes it.

**Recommendation: scope P67 to the floor and leave coarseness out.** The floor is deterministic
given `c` and `B`, assertable from `test/`, and is the thing METHODOLOGY got wrong. Coarseness is
per-run, needs a `src/` signature change, and METHODOLOGY already states it as a property of a run
rather than a test.

### Q5 — Is there an existing generated-map pattern to follow?

**Yes, and it is a good one.** `docs/TEST-DISPLAY-MAP.md` is generated by
**`scripts/build-test-display-map.mjs`**, which is its only writer:

- `scripts/build-test-display-map.mjs:34` — `const OUT_PATH = 'docs/TEST-DISPLAY-MAP.md';`
- `scripts/build-test-display-map.mjs:230` — `writeFileSync(OUT_PATH, out);`
- Header comment `:1-5`: *"The output doc is regenerated by this script alone — never hand-edited
  (a hand-edit gets clobbered on the next regen)."*

Run by hand: `node scripts/build-test-display-map.mjs`. It imports `src/` live, runs the
27-fixture batch, and derives every column from source plus batch output.

**The pattern's transferable part is `--check` (`:8-12`, `:35`).** It regenerates in memory, diffs
table/legend/notes against the committed doc ignoring the provenance block, and exits non-zero on
drift, with no file write. That is exactly the shape P67's manifest wants: a doc that cannot go
stale silently.

Two gaps to inherit deliberately rather than by accident:

1. **`--check` is not wired to anything.** No CI job, no npm script, no call from
   `validate-batch.mjs` (which only mentions the generator in a comment at `:51`). It is a command
   somebody has to remember. A P67 manifest whose freshness gate is equally unwired inherits the
   same failure mode METHODOLOGY had.
2. **`build-test-display-map.mjs` runs the full batch** (~30 s+). A floor manifest does not need
   fixtures — `c`, `B` and the family shape are static properties of the source. It can be
   generated far more cheaply, which makes wiring it into `npm test` realistic in a way the display
   map is not.

The counter-example is `test/probes/probe-resample-census.mjs`: a hand-maintained `CENSUS` array of
the same facts, with no generator and no check, which has drifted on five rows (§1d). **That file
is the shape to avoid**, and it is the shape the METHODOLOGY table was.

---

## 4. The analytic sites, briefly

**15 of the 29 tests produce no p from a resample count.** METHODOLOGY names eight of them, which
is not a count of the analytic tests — it is a list of the ones a shuffle-grep surfaces. It also
includes IRC's per-pair arm, which belongs to a resampling *test*.

| test | analytic p | `file:line` | in METHODOLOGY's eight? |
|---|---|---|---|
| Terminal Digit Uniformity | chi-squared | `terminalDigits.js:65` | yes |
| Decimal Precision | analytic + BH | `decimalPrecision.js:101, 103` | yes |
| Value-Frequency Spike | Poisson tail + BH ×2 | `valueFrequencySpike.js:474, 484` | no |
| Duplicate Detection | 4 binomial survivals + BH | `duplicateDetection.js:808, 817` | no |
| Sequential Duplication | analytic + BH | `sequentialDuplication.js:170` | no |
| Baseline Balance (Carlisle) | `min(binomP, ksP)` | `carlisleBalance.js:144` | no |
| Cross-Condition Rank Corr. | Spearman + BH | `rankCorrelation.js:93, 108` | no |
| Mahalanobis Row Outlier | χ² + binomial + BH | `mahalanobis.js:162, 230` | no |
| Noise Scaling (Mean-Variance) | slope t | `meanVariance.js:117, 124` | yes |
| Modality Test | dip table + `P_FLOOR` clamp | `modality.js:243, 250` | no |
| Autocorrelation | `zToP` + BH ×3 | `autocorrelation.js:56, 142, 157` | yes |
| Within-Row Variance | `normalCDF` + BH | `withinRowVariance.js:141, 151` | yes |
| Row-Mean Runs | `zToP` + BH | `rowMeanRuns.js:144` | yes |
| Selective Noise | Bartlett χ² + Levene + BH | `selectiveNoise.js:140, 205` | yes |
| Missing Data Pattern | exact tests + BH ×4 | `missingDataPattern.js:98, 145, 159, 170` | no |

`testWithinRowVariance(matrix, rng, rowSemantics)` **takes an `rng` and never uses it** —
`withinRowVariance.js:29` documents it as "reserved for future permutation null". A grep for tests
that receive an `rng` over-counts the resampling set by one.

### The two min-over-arms cases

Both are on Table 1 already; the split is stated here.

**Inter-Replicate Correlation** — `interReplicateCorrelation.js:331`:
`const bestP = Math.min(globalBestP, scanP);`
`globalBestP` is the min BH-adjusted per-pair Fisher-z p (**analytic**, `zToP` at `:117`, `bhFDR`
at `:143`). `scanP` is **site S6**, permutation. The permutation arm's floor caps at MODERATE;
the analytic arm has no floor, so **IRC can reach HIGH on the analytic arm at any `B`.** A floor
assertion on S6 says nothing about the test's reachable minimum.

**Runs Test** — `runs.js:276`:
`const bestP = Math.min(minAdjP, scanP, bestWindowP);`
Two of three arms are **analytic**: `minAdjP` (per-pair `zToP` at `:54`, `bhFDR` at `:75`) and
`bestWindowP` (per-window `zToP` at `:258`, `bhFDR` at `:259`). Only `scanP` is **site S13**. Same
consequence: Runs reaches HIGH through an analytic arm, and the permutation arm's MODERATE ceiling
does not bound the test.

**Excess Kurtosis is not a min-over-arms case**, despite having an analytic per-pair family at
`kurtosis.js:132`. That family feeds only the `nSignificant` / `nPlatykurtic` display counts; both
`primaryP` branches (`:540-542`) are simulation-based.

---

## 5. Expectations

| # | expectation | verdict |
|---|---|---|
| 1 | Site count is larger than thirteen | **Holds — 23**, but the stated basis is mostly wrong. CCC has **one** p site feeding three BH families, not three sites. Runs and IRC each contribute exactly **one** resampling site; their other arms are analytic and are not resampling sites at all. The count is larger because LOESS carries five sites at four `B` values, Kurtosis three, and every test with a per-unit BH family carries a second site alongside its scan. |
| 2 | `B` in scope at most p sites | **Holds at 23 of 23.** One subtlety: at S16–S18 the in-scope literal (`N_SIM = 1999`) is not the denominator — `simKurts.length` is. An assertion reading `N_SIM` there would assert the comment. |
| 3 | No shared p helper; most sites inline | **Holds outright.** No such function exists in `src/stats/` or anywhere else. 23 of 23 inline. P67 stays small. |
| 4 | The 10/3 split holds over sites with different numbers | **Half wrong.** The "ten" is wrong even over tests — Benford first and second are two dispatch entries, so it is **11 one-sided / 3 doubled = 14 tests**. Over sites it is **20 / 3 = 23**. The 13 is a count of table rows, not of tests. |
| 5 | `m` and the p site are not in the same scope | **Inverts.** Same function scope at **10 of 11** BH-fed sites (9 families — S10/S11 and S14/S15 each share a call), usually on adjacent lines; only S18 spans two scopes. The genuine obstacle is `j`, which `bhFDR` computes and discards (`primitives.js:246`) — coarseness needs a `src/` signature change, the floor does not. |
| 6 | Modality is not the only clamp | **Fails as stated, holds as intent.** Modality's `P_FLOOR` is the **only** hardcoded p-floor in the battery, and it sits on an analytic test with no count behind it. But the census found an adjacent class the expectation did not name: five hardcoded `p = 1` overrides, and one aggregation-layer Šidák transform (`aggregation.js:154`) that raises the *reported* floor to `1 − (1 − c/(B+1))^G` on every condition-grouped file. |

---

## 6. Is the design lean reachable?

**Yes, with one carve-out.** Point by point:

- **Assertion in `test/`, not `src/`** — supported. Vitest is configured, `npm test` picks up a new
  file with no config change, and every module is directly callable.
- **Each site declares construction and count as data** — supported at 23 of 23. `c` is readable
  from the expression; `B` is in scope at all 23 and published on the result at 20.
- **A test measures the site's p at zero exceedances and checks it against the declared floor** —
  supported at 23 of 23, but for the 16 shuffle-null sites the extreme input is per-site
  construction work. The 7 parametric-simulation sites are cheap. Consider the grid-membership
  assertion in Q3 as a cheaper complement.
- **METHODOLOGY points at a generated manifest** — supported, with `build-test-display-map.mjs` as
  the pattern and its unwired `--check` as the lesson. A floor manifest needs no fixtures, so it
  can be generated in milliseconds and wired into `npm test` in a way the display map cannot.

**The carve-out is coarseness.** `(m/j) × c/(B+1)` cannot be computed from `test/` because `j` is
discarded inside `bhFDR`. Adding it means changing a function with 37 call sites. Recommend P67
scope to the floor and treat coarseness as separate.

**Three things to decide at build time, surfaced now rather than mid-build:**

1. **Module return value or engine output?** A floor assertion on the module's `primaryP` is not an
   assertion about what a condition-grouped file reports — Šidák (`aggregation.js:154`) sits in
   between. The two are different claims; pick one deliberately.
2. **Kurtosis's declared `B`.** `N_SIM = 1999` (the comment's claim) or `simKurts.length` (the
   code's denominator)? Asserting the former makes the assertion vacuous in exactly the way the
   design lean warns about.
3. **Does the manifest cover the sites that never reach a verdict?** S7 (LOESS segment,
   display-only), the two early-exit floor probes at `blockedMahalanobis.js:565-566`, and the
   display-only BH at `kurtosis.js:498`. They use the same arithmetic and would drift the same
   way, but asserting them asserts things no verdict depends on.

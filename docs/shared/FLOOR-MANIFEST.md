# Floor manifest — PARTIAL

**Generated, not hand-maintained.** The only writer is
`test/floors/measure.js`, via `UPDATE_FLOOR_MANIFEST=1 npx vitest run test/floor-manifest.test.js`.
Edit the declarations or the measurement, never this file — `test/floor-manifest.test.js`
fails if the committed copy and a fresh generation disagree.

**Coverage: 7 of 23 p-computation sites.**

The 7 are the parametric-simulation nulls, whose null draws do not depend on the
input — forcing zero exceedances needs only an observed statistic outside the simulated
support. The remaining 16 are shuffle/permutation sites: their null is a permutation of
the observed data, so each needs a structured synthetic input built to its own mechanism.
Site inventory in `SESSION344-FLOOR-SITE-CENSUS.md`; drivability in
`SESSION345-DRIVABILITY-CLASSIFICATION.md`.

**This manifest supersedes nothing yet.** `test/probes/probe-resample-census.mjs` stays until
coverage is complete.

Every **observed** value below is a module return value from a run, not a figure read out of
source. Every **declared** value is authored by hand in `test/floors/declarations.js`. The
two are produced independently; the test is that they agree.

---

## Measured floors

| site | module · entry | construction | `c` | `B` source | `B` | declared floor | observed | evidence |
|---|---|---|---|---|---|---|---|---|
| S16 | `kurtosis.js` · `testKurtosis` | `kurtP = (nExceed + 1) / (simKurts.length + 1)` | 1 | run-length | 1999 | `0.0005` | `0.0005` | nSimulations = 1999 |
| S17 | `kurtosis.js` · `testKurtosis` | `adP = (nExceed + 1) / (simADs.length + 1)` | 1 | run-length | 1999 | `0.0005` | `0.0005` | nSimulations = 1999 |
| S18 | `kurtosis.js` · `testKurtosis (stratifyKurtosis)` | `condP = (nExceed + 1) / (simKurts.length + 1)` | 1 | run-length | 1999 | `0.0005` | `0.0005` | nSimulations = 1999, 2 conditions |
| S19 | `benford.js` · `testBenford` | `pMAD = (madExceedCount + 1) / (N_SIM_BENFORD + 1)` | 1 | constant | 5000 | `0.0001999600079984003` | `0.0001999600079984003` | — |
| S20 | `benford2.js` · `testBenford2` | `pMAD = (madExceedCount + 1) / (N_SIM + 1)` | 1 | constant | 5000 | `0.0001999600079984003` | `0.0001999600079984003` | — |
| S22 | `entropyTest.js` · `testEntropy` | `rawP = Math.min(1.0, Math.min(pLow, pHigh) * 2)` | 2 | constant | 999 | `0.002` | `0.002` | 1 column — BH is the identity at m = 1 |
| S23 | `columnGof.js` · `testColumnGof` | `rawP = Math.min(1, Math.min(pLow, pHigh) * 2)` | 2 | constant | 2000 | `0.0009995002498750624` | `0.0009995002498750624` | 1 column — BH is the identity at m = 1 |

## Sites whose `B` is not a constant

A single number per site would assert something true only on the path the run happened to
take. These sites carry one floor per path, and the manifest names each.

**S16 — `kurtosis.js:347`.** `B` is `simKurts.length` (run-length).

| path | `B` | floor | |
|---|---|---|---|
| full simulation | 1999 | `0.0005` | gate did not fire **← measured** |
| S159d early exit | 50 | `0.0196078431372549` | masked — kurtP is overridden to 1.0 at :341 |

**S17 — `kurtosis.js:359`.** `B` is `simADs.length` (run-length).

| path | `B` | floor | |
|---|---|---|---|
| full simulation | 1999 | `0.0005` | gate did not fire **← measured** |
| S159d early exit | 50 | `0.0196078431372549` | masked — adP is overridden to 1.0 at :352 |

**S18 — `kurtosis.js:425`.** `B` is `simKurts.length — the SHARED pooled null` (run-length).

| path | `B` | floor | |
|---|---|---|---|
| full simulation | 1999 | `0.0005` | gate did not fire **← measured** |
| S159d early exit | 50 | `0.0196078431372549` | NOT masked — no override; floor moves by a factor of 39 |

The early-exit path is not reachable from a floor-forcing input — the S159d pilot gate fires
only when the observed statistic is close to the null body — so its floor is declared but not
measured. `nSimulations` is asserted on every Kurtosis measurement to prove which path ran.

## Recorded separately — not part of any floor

**Šidák.** On condition-grouped files `aggregation.js:154` transforms a module's p before the
engine reports it, raising the *reported* floor to `1 − (1 − c/(B+1))^G` over `G` groups. Every
figure in this manifest is a module return value taken before that transform. The inflation is
real and belongs in a reader's model of what the UI shows, but it is not a site's floor and is
deliberately not folded into one.

**Stale counts found in comments.** Nothing computes from these, so no p is wrong — but a
comment naming a count the code no longer uses is the drift this manifest exists to catch.

- S23: columnGof.js:146 says "the B=999 bootstrap"; the constant at :48 is 2000

## Not covered, with their shape recorded

**S21 — `crossConditionConsistency.js`.** shuffle null, not parametric — outside this manifest's seven. `B` is row-rule: `B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199 (crossConditionConsistency.js:167)`.

| arm | `B` | floor |
|---|---|---|
| max(N_c) <= 1000 | 999 | `0.002` |
| max(N_c) <= 10000 | 499 | `0.004` |
| max(N_c) > 10000 | 199 | `0.01` |

Third arm is arithmetically locked to LOW at any effect size.

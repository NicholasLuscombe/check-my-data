# S341 — What the row-count resample-count branch costs

**Status:** measurement. Nothing landed. `src/` was never edited — the count overrides are ESM
load-time rewrites (`test/probes/s341-count-hook.mjs`), so `git diff -- src/` is empty by
construction rather than by revert.

**Instrument.** Three arms × 8 seeds × 27 fixtures, `test/probes/probe-s341-branch-cost.mjs`.
Arm `shipped` asserts every anchor line exists and rewrites nothing; it was verified
byte-identical to an unhooked run (same flags, same p, every test, seed 0).

**Result in one line:** the branch is real but small in arm 1→2 (three tier moves, all upward,
all at 8/8 seeds, +8% wallclock), large and destructive in arm 1→3 (five tier moves, all
downward, four batch fixtures broken, −46% wallclock), and **the premise that the battery has
been running the coarse side is only true for two of the eight tests.**

---

## 0. Stream separation — CLEAN

Across both override arms, **no test outside the eight scoped ones changed a single p or flag
at any seed on any fixture.** The S340 per-test streams hold. Nothing to escalate.

## 0b. Incidental: the S340 seed hook is broken against current main

`test/probes/s340-seed-hook.mjs` anchors on `let _state = hashMatrix(matrix);` in
`src/stats/prng.js`. That line was removed by S340's own per-test-stream commit (bbd6332) —
seeding now routes through the private `createPRNGFromSeed(seed)`. The hook throws on load, so
**any re-run of `probe-s340-seedsweep.mjs` fails outright**; the artefacts in
`docs/shared/s340-eight-seed.{json,txt}` were produced before that refactor landed.
`test/probes/s341-seed-hook.mjs` replaces it, anchoring on `let _state = seed | 0;` — the single
constructor both `createPRNG` and `createPRNGFactory` route through, so one rewrite shifts every
stream. Reported, not fixed.

---

## A. Branch census

All eight confirmed at source; the set is exactly eight.

| test | selector | trip points | counts | fine-side fixtures | coarse-side | N/A |
|---|---|---|---|---|---|---|
| Constant-Offset Blocks | `nR` | >10000 / >1000 | 199 / 499 / **999** | **24** | 1 (DS11 @499) | 2 |
| LOESS Residual Analysis | `validRows.length` | ≤100 | 499 / **4999** | **10** | 14 | 3 |
| Regional Noise Homogeneity | `validRows.length` | ≤100 | 499 / **4999** | **10** | 11 | 6 |
| Blocked Mahalanobis | `maxN` | ≤500 | 999 / **4999** | **14 (all applicable)** | **0** | 13 |
| Inter-Replicate Correlation | `maxN` | ≤100 / ≤1000 | 199 / 499 / **999** | **7** | 10 (@499) | 10 |
| Runs Test | `maxN` | ≤100 / ≤1000 | 199 / 499 / **999** | **10** | 14 (@499) | 3 |
| Cross-Condition Consistency | `maxN` | ≤1000 / ≤10000 | 199 / 499 / **999** | **8** | 8 (@499) | 11 |
| Windowed Autocorrelation | `nR` | ≤500 / ≤5000 | 199 / 499 / **999** | **25** | 1 (DS11 @499) | 1 |

**Fine-side fixtures, named** (the only ones the shipped battery has ever measured at the
higher count):

- **LOESS / Regional Noise @4999** — DS01, DS02, DS03, DS04, DS05, DS06, DS07, DS08, DS16, DS17.
- **Blocked Mahalanobis @4999** — DS07, DS08, DS09, DS10, DS12a, DS12b, DS15, DS16, DS17, DS20,
  DS21, DS22, DS23, DS24. *(every fixture on which it is applicable)*
- **Constant-Offset @999** — all but DS11.
- **Windowed Autocorrelation @999** — all but DS11.
- **Runs @999** — DS01–DS08, DS16, DS17. **IRC @999** — DS01, DS02, DS07, DS08, DS15, DS16, DS17.
- **CCC @999** — DS01, DS02, DS03, DS04, DS15, DS16, DS17, DS19.

**The scoping premise is wrong for six of the eight.** The brief expected "the branch trips at
around 100 rows and most fixtures are well above it, so the battery has been running the coarse
side all along." That holds only for **LOESS and Regional Noise** (trip at ≤100 valid rows;
14 and 11 fixtures on the coarse side). Constant-Offset and Windowed Autocorrelation trip at
>1000 and >500 rows respectively — 24 and 25 of 27 fixtures sit on the **fine** side. And
**Blocked Mahalanobis has never run its coarse side at all**: it is applicable on 14 fixtures,
every one of them at `maxN ≤ 500`, so the 999 branch is dead code on this corpus.

That last one matters for cost (§E): the single most expensive test in the battery is the one
whose branch has never been exercised.

---

## B. Diff table

216 (test, fixture) cells in scope. Verdict counts:

| | forced-high | forced-199 |
|---|---|---|
| unchanged | 172 | 88 |
| p moved, tier held | 36 | 117 |
| tier moved (all 8 seeds) | **3** | **5** |
| tier moved (partial — unstable) | 5 | 6 |

### Tier moves at 8/8 seeds

| test | fixture | rows | arm | move |
|---|---|---|---|---|
| LOESS Residual Analysis | 10-proteomics-fabricated | 400 | high | **MODERATE → HIGH** |
| LOESS Residual Analysis | 12b-uniform-mixture-fabricated | 400 | high | **MODERATE → HIGH** |
| Regional Noise Homogeneity | 21-localised-ar | 400 | high | **MODERATE → HIGH** |
| LOESS Residual Analysis | 08-elisa-fabricated | 65 | low199 | HIGH → MODERATE |
| Blocked Mahalanobis | 21-localised-ar | 400 | low199 | **HIGH → LOW** |
| Blocked Mahalanobis | 15-missing-carlisle | 160 | low199 | MODERATE → LOW |
| Blocked Mahalanobis | 22-covariance-block | 400 | low199 | MODERATE → LOW |
| Cross-Condition Consistency | 19-inheritance-fabricated | 1200 | low199 | MODERATE → LOW |

Every forced-high move is **upward** and every one lands on a 400-row fixture — i.e. on the
coarse side of the ≤100 trip. Every forced-199 move is **downward**. Blocked Mahalanobis on
DS21 goes HIGH → LOW in one step.

### Unstable cells (tier varies across seeds *within* one arm)

| test | fixture | shipped | high | low199 |
|---|---|---|---|---|
| Regional Noise Homogeneity | 12b-uniform-mixture-fabricated | **MODERATE\|LOW** | MODERATE\|LOW | LOW\|MODERATE |
| Cross-Condition Consistency | 09-proteomics-clean | **LOW\|MODERATE** | LOW\|MODERATE | LOW |
| Cross-Condition Consistency | 15-missing-carlisle | **MODERATE\|LOW** | MODERATE\|LOW | LOW |
| Regional Noise Homogeneity | 08-elisa-fabricated | — | — | LOW\|MODERATE |
| Regional Noise Homogeneity | 10-proteomics-fabricated | — | HIGH\|MODERATE | MODERATE\|LOW |
| Inter-Replicate Correlation | 02-densitometry-fabricated | — | — | MODERATE\|LOW |
| Inter-Replicate Correlation | 10-proteomics-fabricated | — | LOW\|MODERATE | — |
| Cross-Condition Consistency | 21-localised-ar | — | LOW\|MODERATE | — |

**Three cells are already seed-unstable at shipped counts** (bolded). Those are not a
consequence of any override — the battery reports a different tier for them depending on the
PRNG draw today. Raising the count does not stabilise them: Regional Noise/DS12b and both CCC
cells stay split at forced-high.

---

## C. File-level severity

| fixture | expected | shipped | high | low199 |
|---|---|---|---|---|
| 02-densitometry-fabricated | 3 | 3 | 3 | **3\|1** |
| 09-proteomics-clean | 0 | **0\|1** | **0\|1** | 0 |
| 12b-uniform-mixture-fabricated | 1 | 1 | **2** | 1 |
| 15-missing-carlisle | 3 | **3\|2** | **3\|2** | **2** |
| 19-inheritance-fabricated | 1 | 1 | 1 | **0** |
| 22-covariance-block | 1 | 1 | 1 | **0** |

All 21 other fixtures hold their band in all three arms.

**Two fixtures are seed-unstable at shipped counts.** DS09 (a *clean* fixture, expected 0)
reports severity 1 on some seeds; DS15 reports 2 instead of its expected 3 on some seeds.
Neither is caused by an override and neither is stabilised by forced-high.

**The `severity.js:19-26` branch-5 check the brief asked for.** DS12b moves **1 → 2** under
forced-high while no HIGH exists on it in the shipped arm — its LOESS cell goes MODERATE → HIGH
at 8/8 seeds, and `high>=1` alone promotes 1 → 2. So yes: a single tier move on one test moved
the band, and it moved it **away from the declared expectation** (`expected=1`). Forced-high is
not a free improvement — it breaks DS12b's ground truth.

Going the other way, DS19 and DS22 fall to severity **0** at 199 — from "minor flags" to
"clean". DS22's entire severity rests on the Blocked Mahalanobis cell that 199 extinguishes.

**Batch gate as an instrument (not a gate):** shipped 26/28, forced-high 26/28, forced-199
24/28. The two shipped failures (DS08, DS12b) are pre-existing unexpected-fire entries, not
arm-induced. Forced-199 adds four: DS15, DS19, DS21, DS22. Note that forced-199 *silences* the
two baseline failures — it "fixes" them by suppressing the detections that caused them.

---

## D. Reachability, re-measured

Observed minimum p across all fixtures and all 8 seeds, per arm:

| test | shipped | high | low199 | HIGH observed |
|---|---|---|---|---|
| Constant-Offset Blocks | 1.000e-3 | 1.000e-3 | 5.000e-3 | never |
| LOESS Residual Analysis | 2.000e-4 | 2.000e-4 | 2.727e-3 | shipped ✓ high ✓ 199 ✗ |
| Regional Noise Homogeneity | 2.000e-3 | **2.000e-4** | 5.000e-3 | shipped ✗ **high ✓** 199 ✗ |
| Blocked Mahalanobis | 8.000e-4 | 8.000e-4 | 1.000e-2 | shipped ✓ high ✓ 199 ✗ |
| Inter-Replicate Correlation | 6.298e-4 | 6.298e-4 | 6.298e-4 | ✓ in all three |
| Runs Test | 9.671e-3 | 9.671e-3 | 9.671e-3 | never |
| Cross-Condition Consistency | 6.000e-3 | 3.000e-3 | 1.500e-2 | never |
| Windowed Autocorrelation | 5.000e-3 | 5.000e-3 | 2.500e-2 | never |

Three readings worth pulling out.

1. **Constant-Offset Blocks sits exactly on `ALPHA.FLAG`.** Its observed minimum is `1.000e-3`
   in both shipped and forced-high, because 999 *is* its highest declared tier. `flagFromP`
   needs strictly less. This test cannot reach HIGH at any count the code offers, and the
   forced-high arm proves it rather than deriving it.
2. **IRC and Runs are bit-identical across all three arms.** V1X §5.9's claim that these two
   "reach HIGH off the grid entirely" is confirmed by measurement: their verdicts come from the
   analytic arm and the resample count does not touch them. IRC's `6.298e-4` on DS08 is the same
   value at 4999, 999 and 199.
3. **Regional Noise's HIGH is unreachable on the shipped battery for branch reasons alone.**
   Its floor is 2.000e-4 when forced high and 2.000e-3 as shipped — the only thing standing
   between it and a reachable HIGH on DS21 is which side of the ≤100 trip DS21 lands on.

### The §5.9 count of seven, restated at each count

§5.9's seven (Entropy/Zipf, Column GoF, Residual Spike Correlation, Modality, Constant-Offset
Blocks, Windowed Autocorrelation, Cross-Condition Consistency) contains three tests in this
scope. All three are unreachable in **every** arm — the branch is not what blocks them.

| basis | tests that cannot reach HIGH |
|---|---|
| §5.9, at fixture sizes | **7** |
| if every fixture were on the coarse side | **10** — adds LOESS, Regional Noise, Blocked Mahalanobis |
| at 199 | **10** — same three; IRC and Runs stay reachable via their analytic arms |

The coarse side and the 199 floor cost the same three tests. Nothing recovers between 499/999
and 199, because those three lose HIGH the moment they leave 4999.

*(Independent of this pass, the S341 classification found §5.9's membership wrong in two places
— Column GoF is reachable under a flat-family BH condition, and Cross-Condition Rank Correlation
is capped at MODERATE by `rankCorrelation.js:101-103`. That correction is orthogonal to the
branch and is recorded in `SESSION341-HIGH-REACHABILITY-CLASSIFICATION.md`, not re-argued here.)*

---

## E. Cost

**Battery wallclock, 8 seeds × 27 fixtures** (sequential arms, no concurrency, same machine):

| arm | total | vs shipped |
|---|---|---|
| shipped | 380.1 s | 1.000× |
| forced-high | 410.1 s | **1.079×** |
| forced-199 | 203.6 s | 0.536× |

Single-seed batch (`PERF=1`, 22 timed fixtures): shipped 49.42 s, forced-high 53.13 s,
forced-199 28.34 s.

**Per-test share for the eight in scope** (single-seed, ms):

| test | shipped | high | low199 | high−shipped |
|---|---|---|---|---|
| Blocked Mahalanobis | 17905 | 17972 | 241 | **+67** |
| Runs Test | 1829 | 3275 | 910 | +1446 |
| Cross-Condition Consistency | 1577 | 2609 | 568 | +1032 |
| LOESS Residual Analysis | 1919 | 2011 | 1602 | +92 |
| Windowed Autocorrelation | 1273 | 1265 | 339 | −8 |
| Constant-Offset Blocks | 891 | 922 | 288 | +31 |
| Inter-Replicate Correlation | 499 | 806 | 230 | +307 |
| Regional Noise Homogeneity | 310 | 760 | 98 | +450 |
| **scoped total** | **26203** | **29620** | **4276** | **+3417** |

**The branch is defending almost nothing on this corpus.** Taking all eight to their highest
declared count costs **+3.4 s on a 49 s battery, +8%**. For comparison, V1X §5.9 prices taking
all twelve short tests to their minimum required B at **+198 s, ×4.9** — that figure is
dominated by tests outside this branch set (Excess Kurtosis +75%, Entropy +67%, Column GoF
+45%), not by the row-count branch.

**Blocked Mahalanobis is 68% of the scoped cost and its branch contributes +67 ms.** It is the
most expensive test in the battery at 17.9 s of a 49 s run, and every fixture it runs on is
already on the fine side, so forcing high changes nothing for it. The saving the branch buys on
this corpus comes almost entirely from Runs (+1.4 s) and CCC (+1.0 s) — two tests whose HIGH
verdicts the count does not touch at all (Runs' verdict is analytic; CCC cannot reach HIGH at any
declared count).

The 199 arm halves the battery, and the halving is Blocked Mahalanobis collapsing 17.9 s → 0.24 s.
That is the number to weigh against four broken fixtures and a HIGH → LOW on DS21.

---

## Expectations, checked

**"Movement between arms one and two, concentrated in tests whose coarse-side floor sits above
the HIGH threshold."** Confirmed exactly. All three 8/8 moves are LOESS (×2) and Regional Noise
(×1), all MODERATE → HIGH, all on 400-row fixtures sitting on the coarse side of the ≤100 trip
— the two tests whose coarse floor (2.0e-3) is above `ALPHA.FLAG` and whose fine floor (2.0e-4)
is below it. No other test moved at 8/8 in that arm.

**"Arm three worse than arm two by more than arm one is."** Confirmed, and by a wider margin
than the phrasing implies: forced-high produced 3 tier moves, all upward, no severity band lost;
forced-199 produced 5 tier moves, all downward, four broken fixtures, two severity bands falling
to 0, and a HIGH → LOW in a single step.

**Not expected, and the more consequential finding:** the brief's scoping premise — that most
fixtures run the coarse side — is false for six of the eight tests, and specifically false for
the one that dominates the cost. Any decision that prices this branch off "the battery has been
running coarse all along" is pricing two tests, not eight.

---

## Artefacts kept

| file | why |
|---|---|
| `test/probes/s341-count-hook.mjs` | the instrument. Pins any of the eight branches at load time with no `src/` edit, asserts every anchor, and fails loudly if a module never loads. Re-runnable whenever a count question comes back. |
| `test/probes/s341-seed-hook.mjs` | replaces `s340-seed-hook.mjs`, which throws against current `prng.js`. Any future multi-seed probe needs this one. |
| `test/probes/probe-s341-branch-cost.mjs` | the three-arm sweep. Import pipeline copied verbatim from `probe-s340-seedsweep.mjs` so the two stay comparable. |
| `test/probes/analyse-s341-branch.mjs` | reduces the arms to these tables, and carries the stream-separation assertion — that check should run on any future count experiment. |

`test/probes/out-s341-branch/` is **not** committed — four ~167 KB JSON dumps, and no probe
output directory is tracked anywhere in this repo (`git ls-files test/probes/ | grep out-` is empty),
so this follows the existing convention. The whole directory regenerates from the three committed
probes in ~19 minutes.

**Nothing was tuned toward any outcome. `git diff -- src/` is empty.**

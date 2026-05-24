# Per-Test Performance Baseline

Baseline captured by the `PERF=1` instrument in `test/validate-batch.mjs`
(see commit `844a1b0`). Replaces the prior fixture-level-only wallclock
signal in STATUS.md cross-validation. Use this file for regression
tracking — re-run with the same instrument on the same machine and diff
against these numbers.

## Capture environment

| Field | Value |
|---|---|
| Date | 2026-05-24 |
| Machine | darwin arm64 (Nick's primary) |
| Node version | v25.8.1 |
| Build | unbuilt (Node import direct from `src/`) |
| Pre SHA | `85cd2c8` (pre-S169 main; instrument cherry-picked to branch `s169-perf-pre`) |
| Post SHA | `9157f61` (post-S169 main; instrument committed to `claude/zen-hugle-59a378` as `844a1b0`) |
| Runs | one full batch each, fresh `node` process per run, back-to-back |

## How to reproduce

```sh
# From any worktree on the branch carrying commit 844a1b0
PERF=1 node test/validate-batch.mjs                          # uses git SHA as label
PERF=1 PERF_LABEL=my-label node test/validate-batch.mjs      # custom label
```

Sidecar JSON is written to `test/perf-out/<label>.json` (gitignored).
Diff two runs with `node -e "const a = require('./test/perf-out/A.json'); const b = require('./test/perf-out/B.json'); ..."`.

## Table 1 — Per-test totals across all 22 fixtures (POST-fix, descending)

Sum of per-test wallclock across the full 22-fixture batch. Identifies
which test absorbs the most engine time.

| Test | Total ms | Share |
|---|---:|---:|
| Blocked Mahalanobis | 17 965 | 38.2% |
| Kurtosis | 9 848 | 21.0% |
| Entropy / Zipf Analysis | 2 058 | 4.4% |
| Runs Test | 1 886 | 4.0% |
| LOESS Residual Analysis | 1 725 | 3.7% |
| Benford's Law (2nd Digit) | 1 715 | 3.7% |
| Cross-Condition Consistency | 1 595 | 3.4% |
| Duplicate Detection | 1 458 | 3.1% |
| Column Goodness-of-Fit | 1 343 | 2.9% |
| Windowed Autocorrelation | 1 101 | 2.3% |
| Constant-Offset Blocks | 912 | 1.9% |
| Benford's Law | 653 | 1.4% |
| Residual Spike Correlation | 606 | 1.3% |
| Inter-Replicate Correlation | 561 | 1.2% |
| Regional Noise Homogeneity | 299 | 0.6% |
| Modality Test | 108 | 0.2% |
| Mahalanobis Row Outlier | 95 | 0.2% |
| Selective Noise | 66 | 0.1% |
| Autocorrelation | 36 | 0.1% |
| Row-Mean Runs | 32 | 0.1% |
| Value-Frequency Spike | 27 | 0.1% |
| Noise Scaling With Measurement Size | 8 | <0.1% |
| Within-Row Variance | 7 | <0.1% |
| Decimal Precision | 6 | <0.1% |
| Terminal Digit Uniformity | 6 | <0.1% |
| Baseline Balance | 4 | <0.1% |
| Cross-Condition Rank Corr. | 4 | <0.1% |
| Missing Data Pattern | 2 | <0.1% |
| **Total engine work** | **44 124** | |

Batch wallclock 46 992 ms; ~2.9 s overhead is parser / orchestration / `tick()`
yields outside the per-test slice.

Top three (BM + Kurtosis + Entropy) account for 63.6% of engine time.

## Table 2 — Per-test breakdown for the three heaviest fixtures (POST-fix)

Engine time in ms per test, three highest-cost fixtures.

| Test | DS21 (localised AR) | DS22 (cov-block) | DS20 (bimodal) |
|---|---:|---:|---:|
| Blocked Mahalanobis | 8 522 | 6 979 | 197 |
| Kurtosis | 1 003 | 731 | 1 479 |
| Column Goodness-of-Fit | 370 | 243 | 180 |
| Runs Test | 318 | 228 | 213 |
| Entropy / Zipf Analysis | 210 | 176 | 162 |
| Benford's Law (2nd Digit) | 200 | 173 | 150 |
| Cross-Condition Consistency | 152 | 129 | 109 |
| Windowed Autocorrelation | 150 | 123 | 125 |
| LOESS Residual Analysis | 143 | 135 | 95 |
| Duplicate Detection | 112 | 137 | 126 |
| Constant-Offset Blocks | 82 | 62 | 63 |
| Inter-Replicate Correlation | 57 | 51 | 42 |
| Residual Spike Correlation | 42 | 40 | 29 |
| Regional Noise Homogeneity | 26 | 12 | 12 |
| Modality Test | 9 | 7 | 4 |
| Selective Noise | 5 | 4 | 4 |
| Mahalanobis Row Outlier | 4 | 6 | 7 |
| Everything else | <5 each | <5 each | <5 each |
| **Fixture total** | **11 410** | **9 242** | **3 002** |

DS21 and DS22 are BM-bound (~74% / ~76% of fixture time). DS20 is
Kurtosis-bound (~49% of fixture time, since BM is dispatch-skipped on
this row-condition shape).

## Table 3 — Blocked Mahalanobis parity (PRE-fix vs POST-fix)

This is the load-bearing parity check for S169. The yield change must
not alter arithmetic; the draw sequence must be identical.

| Fixture | Pre BM ms | Post BM ms | Δ ms | Δ % | primaryP pre | primaryP post | primary unit | exceed pre | exceed post | sumExceed pre | sumExceed post |
|---|---:|---:|---:|---:|---:|---:|:---|---:|---:|---:|---:|
| `21-localised-ar.csv` | 8 311 | 8 522 | +211 | +2.5% | 0.0008 | 0.0008 | μ-pass / Control | 0 | **0** | 6 336 | **6 336** |
| `22-covariance-block.csv` | 6 801 | 6 979 | +179 | +2.6% | 0.0056 | 0.0056 | Σ-pass / Control | 6 | **6** | 7 156 | **7 156** |
| `15-missing-carlisle.csv` | 279 | 397 | +118 | +42.2% | 0.0040 | 0.0040 | Σ-pass / Control | 9 | **9** | 3 194 | **3 194** |

**Arithmetic parity: PASSED.** Every BM exceedance count, every
`primaryP`, and every `sumExceed` (totalled across all (pass × condition)
units) is byte-identical pre vs post. The sequential-await dispatch
gate (`engine.js:455-460`) plus `rng.shuffle(idx)` running on every
permutation (per the S159d early-exit PRNG-preservation comment, still
intact post-S169) preserves the draw sequence across the yield boundary.

**Timing parity: PASSED (flat-to-slightly-up).** BM Node time is up on
every measured fixture, never down — exactly the expected pattern for
~100 added `setTimeout(0)` macrotask hops per BM call (`N_PERM=4999` /
`PERM_CHUNK=50`). Per-hop overhead works out to ~1-2 ms on Node 25.8.1
arm64, consistent across DS15 and the two big-N fixtures. A Node-time
DROP would have been the alarm; nothing dropped.

Note on the prompt's reference values: the prompt named
`DS15 primaryP = 0.004800` as the post-fix expected value, but the
measured POST run on `9157f61` returns `0.0040` exactly (rawP = (9+1)/5000
= 0.002, BH-FDR with m=2 → 0.004). The PRE run on `85cd2c8` returns the
same `0.0040`, so the pre/post parity holds; the prompt's stated value
was likely a transcription drift. DS21 (`0.000800`) and DS22 (`0.005600`)
match the prompt exactly.

## Table 4 — Per-fixture total wallclock (PRE vs POST)

Sanity check that the yield overhead concentrates on the BM-heavy
fixtures, not on unrelated fixtures.

| Fixture | Pre ms | Post ms | Δ ms |
|---|---:|---:|---:|
| `01-densitometry-clean.csv` | 444 | 452 | +8 |
| `02-densitometry-fabricated.csv` | 470 | 472 | +2 |
| `03-qpcr-clean.csv` | 151 | 146 | -5 |
| `04-qpcr-fabricated.csv` | 135 | 108 | -27 |
| `05-cellcount-clean.csv` | 178 | 148 | -30 |
| `06-cellcount-fabricated.csv` | 153 | 139 | -14 |
| `07-elisa-clean.csv` | 182 | 302 | +121 |
| `08-elisa-fabricated.csv` | 158 | 318 | +160 |
| `09-proteomics-clean.csv` | 2 705 | 2 824 | +120 |
| `10-proteomics-fabricated.csv` | 2 628 | 2 978 | +349 |
| `11-rnaseq-multicondition.csv` | 2 746 | 2 712 | -35 |
| `12a-uniform-mixture-clean.csv` | 2 530 | 2 647 | +117 |
| `12b-uniform-mixture-fabricated.csv` | 2 477 | 2 385 | -92 |
| `13-vfstest-cellcountest.csv` | 265 | 276 | +11 |
| `14-crctest-survey.csv` | 346 | 346 | -1 |
| `15-missing-carlisle.csv` | 1 162 | 1 285 | +124 |
| `16-densitometry-carlisle-overbalanced.csv` | 1 175 | 1 233 | +58 |
| `17-densitometry-carlisle-clean.csv` | 1 060 | 1 237 | +177 |
| `19-inheritance-fabricated.csv` | 466 | 463 | -2 |
| `20-bimodal-fab.csv` | 2 953 | 3 002 | +48 |
| `21-localised-ar.csv` | 11 129 | 11 410 | +281 |
| `22-covariance-block.csv` | 9 126 | 9 242 | +115 |
| **Batch total** | **45 497** | **46 992** | **+1 495** |

Batch overhead +1.5 s (+3.3%), aligned with the prior STATUS estimate
("S169 yield batching ~+1-2s overhead"). Small fixtures fluctuate ±30 ms
in either direction (single-run noise on sub-200 ms slices); fixtures
that exercise BM consistently move up.

## Future regression tracking

To detect a regression: re-run on the same machine, same Node, fresh
process, diff against Table 1 (per-test totals) and Table 2 (per-fixture
totals). A single-test total swinging > 20% (or a single big-fixture
total swinging > 10%) without a deliberate logic change is the alarm.
The PERF instrument is permanent — keep using it.

Any future test added to `engine.js` will automatically appear in Tables 1
and 2 on the next PERF run; no changes needed to the instrument. If a
test other than Blocked Mahalanobis grows non-uniform-under-H0 primaryP
behaviour and needs its own arithmetic-parity check, model the
`_perfExceedances` field on that test the way `blockedMahalanobis.js`
exposes it.

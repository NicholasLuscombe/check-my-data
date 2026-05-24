# Test → display map

**GENERATED — DO NOT HAND-EDIT** — regenerate via
`node scripts/build-test-display-map.mjs`

- Generated: 2026-05-24 01:57:31Z
- Commit:    `1057eef` (`1057eef27f640403b6940d82771cba71ec806a84`)
- Branch:    `claude/bold-meitner-4fa588`
- Batch:     `node test/validate-batch.mjs` (this script reproduces the validate-batch pipeline against 22 fixtures on the branch above)

## What this is

Single source-of-truth reference mapping every active engine test to:

1. its `result.name` (engine identifier, the key shared by `MINIPLOT_REGISTRY`, `TEMPLATE_MAP`, and the seven dispatch maps in `src/constants/mechanisms.js`);
2. its user-facing display name from `DISPLAY_NAMES` (`src/constants/mechanisms.js`);
3. the **UI cluster** it renders under in §3 — the `MECHANISMS[k].label` corresponding to `TEST_MECHANISM[name]`. `ReportView.jsx` threads this label through to `ForensicsCategoryBlock` for §3 grouping; it IS the on-screen cluster heading.
4. the fixtures it fired on (HIGH or MOD), taken from the engine's `result.flag` output across the 22-fixture batch. Tests that returned only LOW / N/A across every fixture are listed as "none — latent".

Replaces methodology-prose reasoning about display behaviour with empirical batch output.

## UI cluster vs working-cluster vocabulary

The §3 UI grouping uses the five `MECHANISMS` labels: **Copy, paste, edit** / **Unusual digits** / **Distribution shapes** / **Cross-replicate comparisons** / **Cross-condition comparisons** (`MECHANISM_ORDER`). This map's "Cluster" column carries that vocabulary because that is what the user reads on screen.

The working-cluster names used in `docs/shared/TESTCARD-FINDINGS.md` for A2 chrome passes — _clone-duplication_, _cross-condition consistency_, _distribution shape_, _spread / heteroscedasticity_, _ordering / sequence_, _cell-level_ — are a finer vocabulary that cross-cuts the UI clusters. The correspondences are not 1:1:

| Working cluster (TESTCARD-FINDINGS)        | UI clusters it touches                                   |
|--------------------------------------------|----------------------------------------------------------|
| clone-duplication                          | Copy, paste, edit                                        |
| cross-condition consistency                | Copy, paste, edit (RSC); Cross-condition comparisons (CCC) |
| distribution shape                         | Unusual digits; Distribution shapes                      |
| spread / heteroscedasticity                | Cross-replicate comparisons (IRC, Kurtosis, …)           |
| ordering / sequence                        | Cross-replicate comparisons (Autocorr, Runs, Row-Mean Runs, LOESS) |
| cell-level                                 | Cross-replicate comparisons (Mahalanobis, Within-Row Variance) |

Flag this mismatch — it is real and worth carrying. The map below renders the UI cluster only.

## The map

Sorted by `MECHANISM_ORDER` (copied → digits → shapes → replicate → group), then by display name within cluster.

| Display name | Engine name | Cluster (§3 UI) | Flagged on (HIGH / MOD) |
|---|---|---|---|
| Correlated residuals | Residual Spike Correlation | Copy, paste, edit | DS02 MOD, DS11 MOD |
| Duplicated and offset | Constant-Offset Blocks | Copy, paste, edit | DS08 MOD |
| Duplicated data | Exact Duplicate Detection | Copy, paste, edit | DS04 HIGH, DS06 HIGH, DS10 HIGH, DS14 HIGH |
| Decimal places | Decimal Precision Consistency | Unusual digits | none — latent |
| First-digit frequencies | Benford's Law (First Digit) | Unusual digits | DS08 HIGH |
| Last-digit frequencies | Terminal Digit Uniformity | Unusual digits | DS04 HIGH |
| Repeated digits | Value-Frequency Spike | Unusual digits | DS04 MOD, DS06 MOD, DS13 HIGH |
| Second-digit frequencies | Benford's Law (Second Digit) | Unusual digits | DS10 HIGH, DS11 HIGH |
| Column modality | Modality Test | Distribution shapes | none — latent |
| Column shape fit | Column Goodness-of-Fit | Distribution shapes | DS10 MOD, DS19 MOD, DS20 MOD |
| Value entropy | Entropy / Zipf Analysis | Distribution shapes | none — latent |
| Block covariance anomaly | Blocked Mahalanobis | Cross-replicate comparisons | DS15 MOD, DS21 HIGH, DS22 MOD |
| Distribution of noise across columns | Selective Noise Partitioning | Cross-replicate comparisons | DS08 HIGH, DS20 HIGH |
| Inter-replicate correlation | Inter-Replicate Correlation | Cross-replicate comparisons | DS02 MOD, DS08 HIGH |
| Missing data patterns | Missing Data Pattern | Cross-replicate comparisons | DS15 HIGH |
| Noise consistency | LOESS Residual Analysis | Cross-replicate comparisons | DS08 HIGH, DS10 MOD, DS12b MOD |
| Noise predictability | Autocorrelation | Cross-replicate comparisons | DS02 MOD, DS11 HIGH, DS20 MOD, DS21 HIGH, DS22 MOD |
| Noise scaling | Noise Scaling With Measurement Size | Cross-replicate comparisons | DS06 HIGH |
| Regional noise | Regional Noise Homogeneity | Cross-replicate comparisons | DS10 MOD, DS21 MOD |
| Replicate noise shape | Excess Kurtosis | Cross-replicate comparisons | none — latent |
| Row variance scan | Within-Row Variance | Cross-replicate comparisons | DS14 HIGH |
| Row-mean patterns | Row-Mean Runs | Cross-replicate comparisons | DS21 HIGH |
| Row-order randomness | Runs Test | Cross-replicate comparisons | DS02 MOD, DS21 HIGH, DS22 HIGH |
| Unusual rows | Mahalanobis Row Outlier | Cross-replicate comparisons | DS06 HIGH, DS08 MOD |
| Windowed autocorrelation | Windowed Autocorrelation | Cross-replicate comparisons | none — latent |
| Condition balance | Baseline Balance | Cross-condition comparisons | DS16 HIGH |
| Cross-condition consistency | Cross-Condition Consistency | Cross-condition comparisons | DS15 MOD, DS19 MOD |
| Cross-condition similarity | Cross-Condition Rank Correlation | Cross-condition comparisons | none — latent |

---

Fixtures covered (22): DS01, DS02, DS03, DS04, DS05, DS06, DS07, DS08, DS09, DS10, DS11, DS12a, DS12b, DS13, DS14, DS15, DS16, DS17, DS19, DS20, DS21, DS22.

# Test → fixture lookup

**GENERATED — DO NOT HAND-EDIT** — regenerate via
`node scripts/build-test-display-map.mjs`

- Generated: 2026-06-29 01:54:05Z
- Commit:    `11b5a03` (`11b5a03077da5a1a70fa5b753f96c068291c50f1`)
- Branch:    `main`
- Batch:     live `result.flag` via the validate-batch pipeline over the shared 22-fixture set (`test/batch-fixtures.mjs`)

Answers one question for the visual walk: **which dataset do I load to see a
visible flag for test X.**

## Source basis

Every cell is derived from source, not transcribed from any prior version of
this file:

- **Code test name** — the canonical key of `TEST_MECHANISM` in
  `src/constants/mechanisms.js`. This is the engine `result.name`, shared by
  the dispatch maps.
- **UI name** — the `DISPLAY_NAMES` value for that key
  (`src/constants/mechanisms.js`).
- **Cluster** — the §3 display category. `TEST_MECHANISM[name]` gives the
  internal key (`copied` / `digits` / `shapes` / `replicate` / `group`); the
  display name is `MECHANISMS[key].label`.
- **Fires on** — presence from live batch output: a test appears under a
  fixture when its `result.flag` is HIGH or MOD there. The mark is set by
  cross-referencing the shared `EXPECTED` allow-sets in
  `test/batch-fixtures.mjs` — a fire declared in that fixture's
  `EXPECTED.flags` is credited (bare); a fire that renders but is not a
  declared channel is acknowledged (`(ack)`).

**Tier rendering.** Credited fires take the declared allow-set: a singleton
`['HIGH']` renders `HIGH`, and a two-value `['MODERATE','HIGH']` renders
`MOD/HIGH` (the fixture permits either tier). Acknowledged fires take the live
tier — `HIGH` or `MOD` — followed by `(ack)`. A test with no fire on any
fixture is `— latent`.

Sorted by cluster in fixed display order (copied → digits → shapes → replicate
→ group); tests alphabetical by UI name within each cluster.

## Lookup table

### Copy, Paste, Edit

| Code test name | UI name | Cluster | Fires on |
|---|---|---|---|
| Exact Duplicate Detection | Duplicated Data | Copy, Paste, Edit | DS04 HIGH, DS06 HIGH, DS10 HIGH, DS14 HIGH |
| Constant-Offset Blocks | Offset copies | Copy, Paste, Edit | DS08 MOD/HIGH |
| Residual Spike Correlation | Shared noisy rows | Copy, Paste, Edit | DS02 MOD/HIGH, DS11 MOD/HIGH |

### Unusual Digits

| Code test name | UI name | Cluster | Fires on |
|---|---|---|---|
| Decimal Precision Consistency | Decimal precision | Unusual Digits | — latent |
| Benford's Law (First Digit) | First-Digit Frequencies | Unusual Digits | DS08 HIGH |
| Terminal Digit Uniformity | Last-Digit Frequencies | Unusual Digits | DS04 HIGH |
| Value-Frequency Spike | Over-used numbers | Unusual Digits | DS04 MOD/HIGH, DS06 MOD/HIGH, DS13 HIGH |
| Benford's Law (Second Digit) | Second-Digit Frequencies | Unusual Digits | DS10 HIGH, DS11 HIGH |

### Distribution Shapes

| Code test name | UI name | Cluster | Fires on |
|---|---|---|---|
| Column Goodness-of-Fit | Column Goodness-of-Fit | Distribution Shapes | DS10 MOD/HIGH, DS20 MOD/HIGH |
| Entropy / Zipf Analysis | Distinct numbers | Distribution Shapes | — latent |
| Modality Test | Number of peaks | Distribution Shapes | — latent |

### Cross-Replicate Comparisons

| Code test name | UI name | Cluster | Fires on |
|---|---|---|---|
| Selective Noise Partitioning | Column-to-column noise | Cross-Replicate Comparisons | DS08 MOD/HIGH, DS20 HIGH |
| Inter-Replicate Correlation | Inter-Replicate Correlation | Cross-Replicate Comparisons | DS02 MOD/HIGH, DS08 MOD/HIGH |
| Windowed Autocorrelation | Local noise correlation | Cross-Replicate Comparisons | — latent |
| Missing Data Pattern | Missing-data pattern | Cross-Replicate Comparisons | DS15 HIGH |
| Autocorrelation | Noise correlation | Cross-Replicate Comparisons | DS02 MOD/HIGH, DS11 HIGH, DS20 MOD/HIGH, DS21 HIGH, DS22 MOD/HIGH |
| LOESS Residual Analysis | Noise level trend | Cross-Replicate Comparisons | DS08 MOD/HIGH, DS10 MOD/HIGH, DS12b MOD/HIGH |
| Noise Scaling With Measurement Size | Noise scaling | Cross-Replicate Comparisons | DS06 HIGH |
| Excess Kurtosis | Noise shape | Cross-Replicate Comparisons | — latent |
| Runs Test | Noise sign-pattern | Cross-Replicate Comparisons | DS02 MOD/HIGH, DS21 MOD/HIGH, DS22 MOD/HIGH |
| Regional Noise Homogeneity | Region-to-region noise | Cross-Replicate Comparisons | DS10 MOD/HIGH, DS21 MOD/HIGH |
| Row-Mean Runs | Row-mean patterns | Cross-Replicate Comparisons | DS21 MOD/HIGH |
| Blocked Mahalanobis | Shifted blocks | Cross-Replicate Comparisons | DS15 MOD/HIGH, DS21 MOD/HIGH, DS22 MOD/HIGH |
| Mahalanobis Row Outlier | Unusual rows | Cross-Replicate Comparisons | DS06 HIGH (ack), DS08 MOD (ack) |
| Within-Row Variance | Within-row noise | Cross-Replicate Comparisons | — latent |

### Cross-Condition Comparisons

| Code test name | UI name | Cluster | Fires on |
|---|---|---|---|
| Baseline Balance | Baseline Balance | Cross-Condition Comparisons | DS16 MOD/HIGH |
| Cross-Condition Rank Correlation | Cross-Condition Rank Correlation | Cross-Condition Comparisons | — latent |
| Cross-Condition Consistency | Overall condition similarity | Cross-Condition Comparisons | DS15 MOD/HIGH, DS19 MOD/HIGH |

Credited fires are unmarked; `(ack)` marks a fire that renders on screen but is not a declared detection channel for that fixture (incidental or corroborating — see TEST-GROUND-TRUTH for the per-fixture rationale).

## Notes

- 28 active tests, matching the 28 keys of `TEST_MECHANISM`.
- Seven tests are `— latent`: no fixture in `EXPECTED` declares a HIGH or MOD
  allow-set for them, and they carry no acknowledged fire. They are Decimal
  Precision Consistency, Distinct numbers (Entropy / Zipf), Number of peaks
  (Modality), Local noise correlation (Windowed Autocorrelation), Noise
  distribution (Excess Kurtosis), Within-row noise (Within-Row Variance), and
  Cross-Condition Rank Correlation.
- The acknowledged fires come from the `ACKNOWLEDGED` side-map in
  `test/batch-fixtures.mjs`, which holds two entries: Mahalanobis Row Outlier
  on DS06 (HIGH) and DS08 (MOD), both incidental single-row outliers downstream
  of other manipulations. Tiers are the live engine flag on those two
  fixtures; the side-map itself stores a reason string, not a tier.
- DS12b is the fabricated half of the uniform-mixture pair (file
  `12b-uniform-mixture-fabricated.csv`); DS12a is clean and carries no flags.

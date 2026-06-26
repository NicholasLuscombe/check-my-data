# Card copy — canonical source

Investigator-facing copy for every test card: **How this test works** / **What a positive result means** /
**What to look for**. This is the **source of truth** for the card copy — the build table that Code
transcribes into `src/constants/mechanisms.js` (`TEST_METHODS`, body) and the per-card MiniCard components
(implications / lookFor) is *generated from this doc*, not the reverse. Edit copy here first.

Chat-owned, tracked. Grouped by UI family in display order.

**Authoring conventions** (the S261 standing rules — apply to any edit):
1. Observable matches the computation (name the correct difference; never "residual" in user copy).
2. One term per concept across the whole surface.
3. Look-for ends performable (a real action, never "check whether it was faked").
4. Look-for directs, doesn't narrate (no unverified plot-element references).
5. Variants are self-contained — each branch shown alone, independently complete.
6. How-it-works opens with the test's action (load-bearing scene-set only where the action is
   incomprehensible without it).
7. No-real-check honesty — screening signals say so; don't manufacture a check.
8. Confirm scope at source (whole-dataset / per-column / per-row / per-condition).
9. Statistic named in how-it-works, trailing parenthesis on the ACTION sentence; the ACTUAL statistic.
10. Statistic + null where the null is non-obvious; statistic alone for a standard named test.
Noise / variability / spread: **noise** = replicate/measurement error; **variability** = possibly-genuine
(biological) dispersion; **spread** = the distribution-shape sense. Orwell override above all.

**Transcription note.** Markdown emphasis markers (`*word*`) here are doc-only — they aid the human
reading this source. Strip them (keep the words) when transcribing to `TEST_METHODS`: `methodText`
renders raw in a div (`CardLayout.jsx`), so literal asterisks would show in the card. Entries carrying
emphasis are therefore intentionally **not** byte-identical between this doc and `TEST_METHODS`; that
is not drift. (Strip the leading `**How this test works.**` label on the same basis.)

**Parked (not locked):**
- **Row-block shift (Row-Mean Runs)** — copy held pending the engine broadening to column-grouped data
  (BANKED). Stub only below.
- **Noise distribution (Excess Kurtosis)** — directional sentence LOCKED + relocated S268 (`63895bc`).
  The #23 audit confirmed the leptokurtic suppression is directionally correct; the meaning claim moved
  from "not forensically meaningful" to naming the spread tests that catch the too-similar signature.

---

## Copy-Paste-Edit family

### Duplicate values (Exact Duplicate Detection)

**How this test works.** Looks for identical values within rows, identical whole rows, and repeated blocks of values, and tests whether they appear more often than they would if the values were shuffled at random (several exact binomial tests, combined). The same duplicate can show up in more than one of them.

**What a positive result means.** Repeated values can arise naturally: integer or bounded scales allow only so many distinct values, and measurements at a detection limit can pile up. Duplication can arise accidentally: e.g., pasting between spreadsheets, or merging files with overlapping rows. Repeated whole rows or blocks can also be deliberate: e.g., rows copied to pad a thin dataset, inflate the sample size, or manufacture replicates that were never measured.

**What to look for.** Identical whole rows or rectangular blocks are a strong sign of copy-paste. Check whether the duplicated rows sit in specific conditions or span several. Inspect the raw data files to confirm the submitted values arise from independent measurements.

---

### Offset copies (Constant-Offset Blocks)

**How this test works.** For each row, takes the difference between replicate pairs and checks whether the same difference repeats in neighbouring rows more often than it would if the row order were shuffled at random, producing a block of rows all offset by the same amount (consecutive-difference run count, permutation null). A second pass checks for offsets by a constant *ratio*.

**What a positive result means.** A constant difference or ratio between replicates across consecutive rows can arise from a batch correction or a drift adjustment applied evenly to a stretch of rows. It can also indicate that one column was copied into another and a fixed amount added, subtracted, or multiplied — turning a copied column into a "replicate" that looks different while staying locked to the original.

**What to look for.** Look at the flagged rows: does the same offset repeat across replicate pairs at the same rows? That points to one column built from another by applying a constant. Inspect the raw data files and compare the replicate columns directly — a fixed difference or ratio that holds row after row is the signature. Check whether the flagged rows cluster in one part of the dataset or run throughout.

---

### Inter-replicate correlation (Inter-Replicate Correlation)

**How this test works.** Checks whether replicate columns correlate more closely than expected. Compares a pair's correlation against the average of all other pairs in the same condition, both across the whole column and in a sliding window that highlights any correlated stretch (winsorised Pearson correlation).

**What a positive result means.** Replicates that correlate unusually closely can reflect a high signal-to-noise experiment, where a strong biological signal dominates the random scatter. They can also indicate that one replicate was derived from another; e.g., copied and given small perturbations to make it look like an independent measurement.

**What to look for** *(per-pair)*. One or more replicate pairs correlate more strongly than the dataset's signal-to-noise ratio expects. Check whether those columns might be copies or near-copies. Inspect the raw data files to confirm the submitted values arise from independent measurements.

**What to look for** *(windowed)*. The scan found a stretch of rows where replicates agree more closely than elsewhere. Inspect the raw data files for those rows: check whether they match a particular condition, were added from a different source, or are copies of one another.

---

### Shared noisy rows (Residual Spike Correlation)

**How this test works.** Finds rows that are unusually noisy between replicate pairs, then checks whether those rows are similarly noisy across several conditions. Tests whether the overlap is greater than if rows were randomly shuffled (Spearman correlation, permutation test).

**What a positive result means.** In typical data, the noisy rows differ from one condition to the next. The same rows being noisy everywhere suggests shared structure. This can arise when an outlier sample or outlier rows affect every measurement. It can also indicate that specific rows were edited across several conditions at once, leaving the same fingerprint of noise across conditions.

**What to look for** *(global)*. The heat-map marks each condition's noisiest rows, and the matrix below shows how much those sets overlap between conditions. The signal is the high overlap between conditions that should be independent. Check which rows and conditions are highlighted, and inspect the raw data files for those rows to confirm they were measured independently in each condition.

**What to look for** *(concentrated)*. The heat-map marks each condition's noisiest rows; the matrix below shows how much those sets overlap. The signal is the unusually high noise in a few shared rows. The number of overlapping rows is small and the overall correlation between conditions is low. Find the noisiest rows across multiple conditions and inspect the raw data files to confirm that they were measured independently in each condition.

---

## Unusual Digits family

### Last-digit pattern (Terminal Digit Uniformity)

**How this test works.** Pools the last digit of every value across the dataset and counts how often the digits 0-9 appear, comparing with the flat spread expected in typical datasets: each digit should turn up about equally often (chi-squared goodness-of-fit against a uniform spread). It counts digits 1-9 only if the data appears to have stripped trailing zeros.

**What a positive result means.** An uneven spread of last digits can arise from instrument truncations or file conversions: e.g., strip trailing zeros, rounding during export. It can also indicate manually entered values: e.g., typed numbers display patterns favouring some digits and avoiding others.

**What to look for.** Check which digits are over- or under-used. A trend toward 0 and 5 suggests rounding. A trend across other digits points to manual entry, with trends involving several digits being more indicative.

---

### First-digit pattern (Benford's Law (First Digit))

**How this test works.** Within each column, counts how often the digits 1-9 appear as the first digit and compares with the Benford pattern — lower first digits typically occur more often than higher ones (mean absolute deviation from Benford against a simulated null). It tests each column separately and names the columns that depart from the pattern; it applies only to wide-range, positive data and does not run on whole numbers.

**What a positive result means.** A departure from the Benford pattern can arise in data with a narrow range or a bounded scale, where the pattern does not apply. It can also indicate chosen or manually generated values: e.g., typed numbers rarely reproduce the trend toward low first digits.

**What to look for.** Treat the positive test as a screening signal. Confirm the data really is wide-range positive — the pattern does not apply otherwise and that is the most common innocent cause — and weigh it alongside the other tests rather than on its own. A flag is corroborating evidence, not a standalone finding.

---

### Second-digit pattern (Benford's Law (Second Digit))

**How this test works.** Within each column, counts how often each digit 0–9 appears as the second digit and compares with the expected pattern — lower second digits occur slightly more often than higher ones (mean absolute deviation from the expected pattern against a simulated null). It tests each column separately and names the columns that depart; it applies only to wide-range, positive data and does not run on whole numbers, where second digits concentrate at 0. Most powerful on large datasets, where small departures become detectable.

**What a positive result means.** Departure from the Benford second digit pattern can arise in data with a narrow range or a bounded scale, where the pattern does not apply. It can also indicate chosen or manually generated values and it is harder to mimic than the first digit pattern: e.g., adjustments to the first digits to look natural often leave the less-familiar second-digit pattern wrong.

**What to look for.** As with First-digit pattern, treat the positive test as a screening signal: confirm the data really is wide-range positive — the pattern does not apply otherwise and that is the most common innocent cause — and weigh it alongside the other tests rather than on its own. A second-digit flag is corroborating evidence, not a standalone finding.

---

### Decimal precision (Decimal Precision Consistency)

**How this test works.** A single instrument records every value in a column at the same precision, and export tools then strip trailing zeros at predictable rates, leaving a smooth tail of shorter values. Within each column, this test checks whether the decimal places follow that pattern, or whether some precision levels are oddly underused (one-tailed binomial deficit test against the trailing-zero model). It tests each column separately and names the columns that fall short.

**What a positive result means.** A shortfall at an intermediate precision level can arise from a change in recording precision partway through a study, or from an instrument that re-ranges automatically. It can also indicate values from more than one source merged into one column: e.g., hand-entered numbers rarely follow the trailing-zero pattern a single instrument produces.

**What to look for** *(gap)*. A precision gap — values at one and three decimal places but none at two — cannot come from a single instrument. Inspect the raw data files to check whether the values were transcribed from more than one source or entered by hand.

**What to look for** *(no gap)*. The precision levels fall short of the single-instrument pattern without a clean gap. Inspect the raw data files to check whether the precision matches the stated instrument — one instrument should produce a single dominant precision, stripped into one or two adjacent levels.

---

### Over-used numbers (Value-Frequency Spike)

**How this test works.** Checks whether any value appears far more often than the values immediately around it (Poisson tail test against a local smoothed expectation). A second pass checks whether the same digits after the decimal point recur across unrelated whole numbers. It runs on mostly-whole-number data, where hand entry leaves the clearest trace.

**What a positive result means.** A value that appears far more often than its neighbours can reflect a natural mode in the data, such as a detection limit many samples reach. It can also indicate values entered by hand: e.g., spikes at adjacent numpad keys point to manual entry, and the same fractional part recurring across unrelated rows points to a copied template.

**What to look for.** Check whether the over-used values are round numbers or sit on adjacent numpad keys. For the recurring-fraction case, look for the same digits after the decimal point across unrelated rows. Cross-reference Last-digit pattern — if both flag, the case for manual entry is stronger. Check whether the over-used values cluster in particular rows or conditions, or run throughout.

---

## Distribution Shapes family

### Value diversity (Entropy / Zipf Analysis)

**How this test works.** Counts how many distinct values appear in each column, checks how evenly they are spread, and then compares that against the spread a smooth distribution of the same average and variability would give (Shannon entropy against a fitted model). Runs each condition separately, and does not run on whole-number counts or ordinal scales, where there is no reliable baseline.

**What a positive result means** *(too few)*. Fewer distinct values than expected: entries in ${columns} repeat more than the distribution predicts. This can arise from instrument resolution limits or heavy rounding. It can also indicate values entered by hand: e.g., reuse of a small set of favourite numbers rather than the full spread a typical measurement generates.

**What a positive result means** *(too many)*. More distinct values or more even spacing between values than expected: entries in ${columns} are spread more evenly than the distribution predicts. This can arise from a high-resolution instrument. It can also indicate generated values: e.g., a random-number source that produces more evenly spaced values than a typical measurement.

**What a positive result means** *(mixed)*. Some columns show too few distinct values whereas others show too many. This can arise from combining data from different sources. It can also indicate values entered by hand in some columns — e.g., reuse of a small set of favourite numbers — and generated values in others — e.g., a random-number source with evenly spaced values.

**What to look for.** Check whether flagged columns carry the key results or a particular treatment group. For a low-diversity column, cross-reference Over-used numbers — if the same columns flag there, the case for hand entry is stronger. For a high-diversity column, look for values spaced more finely than the instrument's precision should allow.

---

### Distribution shape (Column Goodness-of-Fit)

**How this test works.** Fits each column to the distribution shape its mean and variance predict, then measures how closely the column's actual shape matches it (Anderson–Darling against a fitted family). Each column is tested separately. Does not run on whole-number counts or ordinal scales, where fitted shapes do not apply.

**What a positive result means** *(mismatch)*. Values in ${columns} do not match the shape their mean and variance predict: heavier-tailed, multi-peaked, or otherwise off-shape. This can arise from mixing genuinely different sources. It can also indicate copied or hand-entered values: e.g., hand-typed numbers keep roughly the right mean and variance but get the tail shape wrong, because how often extreme values occur is not intuitive to fabricate.

**What a positive result means** *(too tight)*. Values in ${columns} match their predicted shape more closely than measurement noise usually allows. This can happen occasionally by chance. It more often indicates values generated from an underlying distribution: e.g., a random-number source drawing from the exact fitted shape.

**What a positive result means** *(mixed)*. Some columns are off-shape — heavier-tailed, multi-peaked, or otherwise not matching the shape their mean and variance predict — while others fit their predicted shape more closely than measurement noise allows. The off-shape columns can come from mixed sources or hand entry; the too-close columns from values generated to fit. Together this points to a dataset assembled from more than one origin.

**What to look for** *(mismatch)*. Check whether the flagged columns carry the key results. Inspect each column's histogram — the average and spread will look normal, so focus on the tails and any extra peaks or clustering, where the signal sits. Cross-reference Multiple peaks, which catches the bimodal case directly.

**What to look for** *(too tight)*. Check whether the flagged columns carry the key results. Compare them against the raw data files: values matching their predicted shape this closely are hard to obtain by measurement. Cross-reference Value diversity — generated values that fit too cleanly often also show unnaturally even spacing.

**What to look for** *(mixed)*. Check whether the flagged columns carry the key results. For the off-shape columns, inspect each histogram — the average and spread will look normal, so focus on the tails and any extra peaks or clustering — and cross-reference Multiple peaks, which catches the bimodal case directly. For the too-close columns, compare them against the raw data files, since values matching their predicted shape this closely are hard to obtain by measurement; cross-reference Value diversity, as generated values often also show unnaturally even spacing.

---

### Multiple peaks (Modality Test)

**How this test works.** Measures how far each column's distribution sits from a single-peaked shape (Hartigan dip statistic against a uniform-reference null). Each column is tested separately. Does not run on whole-number counts or ordinal scales.

**What a positive result means.** Values in ${columns} have more than one peak or a gap too deep for a single-peaked distribution. This can arise from real sub-populations within a condition: e.g., multiple populations or batches that behave differently. It can also indicate two separate sources — e.g., different cohorts, runs, or conditions — combined and presented as one declared condition.

**What to look for.** Check whether the flagged columns carry the key results. Inspect the histogram to confirm two distinct peaks rather than one skewed spread, then check whether the two groups map onto a recorded split — a batch, plate, or date. Two peaks that cut across a single declared condition with no recorded reason are the concern; two that line up with a known sub-group are likely genuine. Cross-reference Distribution shape, which flags the same columns when the extra peak distorts the overall shape.

---

## Cross-Replicate Comparisons family

### Noise correlation (Autocorrelation)

**How this test works.** Takes the difference between each replicate pair and checks whether that difference is correlated from one row to the next (lag-1 autocorrelation, one-sample t-test). In independent measurements, one row's difference tells you nothing about the next. It pools all rows into a single dataset-wide measure rather than locating where the correlation sits — a pattern confined to one stretch is the windowed test's job. It runs only when the rows are in a meaningful order set at import; in an arbitrary order, such as a gene list, row-to-row correlation has no meaning.

**What a positive result means.** A correlation from row to row can arise from a time-dependent process: e.g., temperature drift or reagent degradation affecting neighbouring samples. It can also indicate values edited row by row, each nudged slightly from the one above — hand editing that follows a hidden template leaves exactly this kind of serial trail, which independent measurement does not.

**What to look for** *(strong)*. A correlation this size means one row's difference predicts the next. Inspect the raw data files and compare the row order against the submitted data. Check whether the pattern concentrates in particular conditions, and examine the flagged rows for values that follow too smooth or too regular a sequence to have been obtained independently.

**What to look for** *(other)*. A correlation like this has several possible sources. Check whether the data was sorted or re-ordered before submission, which can break the natural measurement order and introduce a pattern. Inspect the raw data files for a fresh export to rule out post-processing.

---

### Localised noise correlation (Windowed Autocorrelation)

**How this test works.** Slides a 15-row window across the data and checks whether the difference between replicates is correlated from one row to the next within any window — a pattern confined to one stretch is detected here even when the dataset as a whole clears (windowed lag-1 autocorrelation, permutation null within each replicate pair). Like the whole-dataset test, it runs only when the rows are in a meaningful order set at import.

**What a positive result means.** A row-to-row correlation within one window can arise from a time-dependent process affecting neighbouring rows, or a plate read out of order. It can also indicate that values in that stretch were edited or built — a region drawn from a smooth curve, or one block given correlated noise — while the rest of the data was obtained independently.

**What to look for.** Check whether the flagged window matches a sub-experiment, plate segment, or batch. Inspect those rows in the raw data files, obtain a fresh export to rule out a post-processing re-order, and examine them for values that follow too smooth a sequence.

---

### Replicate lead pattern (Runs Test)

**How this test works.** For each replicate pair, tracks which replicate is larger at each row and counts how often the lead changes, comparing that against the number of changes the values would give if shuffled at random (Wald–Wolfowitz runs test). It looks only at which replicate leads, not how large the difference is, and runs only when the rows are in a meaningful order set at import.

**What a positive result means** *(too few)*. Long stretches where the same replicate stays larger mean the difference between replicates is more block-like than independent measurement would produce. This can arise from a slow drift across neighbouring samples; it can also indicate values typed row by row, each anchored to the last.

**What a positive result means** *(too many)*. The lead switches far more often than chance. There is no common innocent cause for this: over-alternation is itself the signal, and points to values arranged to look random rather than recorded in their natural order.

**What to look for** *(windowed)*. Rows ${X}–${Y} show long stretches where one replicate stays larger. Inspect those rows in the raw data files for signs of sequential construction — values unusually smooth, evenly spaced, or trending one way — and compare the lead pattern there against the rest of the dataset.

**What to look for** *(pooled)*. This is a dataset-wide verdict on the sign pattern, not a flag on particular rows. Inspect the raw data files and compare the row order against the submitted data: re-sorted data can explain the pattern on its own. Otherwise, examine the data for values that run too smoothly from one row to the next to have been measured independently.

---

---

### Row-block shift (Row-Mean Runs) — PARKED

> Scope change banked (v1.0): broaden the test to handle column-grouped (wide-format) data. The current
> requirement for a row-level condition column is an input-form limitation, not a methodological one.
> How-it-works, what-it-means, and look-for held until the engine scope is settled.

---

### Column-to-column noise (Selective Noise Partitioning)

**How this test works.** Measures how much each replicate column varies around the row averages and checks whether one column is noisier or quieter than the others (Bartlett's test for equal variance across columns). Replicate measurements should typically carry about the same amount of noise.

**What a positive result means.** A column varying more or less than the others can arise from a real difference in how a replicate was run: e.g., a different operator, instrument, or day. It can also indicate a fabricated column: e.g., values typed with too little noise come out quieter than real replicates, and values padded with added noise come out louder.

**What to look for.** Identify which column is the outlier and whether it is quiet or noisy. Inspect the raw data files for that column and compare it against the others to confirm it was measured the same way.

---

### Regional noise (Regional Noise Homogeneity)

**How this test works.** Slides a window down each column and checks whether the replicate noise in any stretch of rows — how far that column's values sit from their row averages — is unusually high or low compared with the same column overall (sliding-window variance ratio, row-shuffle permutation null). It catches a small fabricated region that a whole-column test would miss, and runs only when the rows are in a meaningful order set at import.

**What a positive result means.** A stretch of rows that is noisier or quieter than the rest of its column can arise from a real change partway through: e.g., a reagent batch, recalibration, run break. It can also indicate localised fabrication: e.g., one column smoothed or padded for a block of rows while the rest was left as measured.

**What to look for.** Note which column and which stretch of rows are identified, and whether the stretch is quieter or noisier than the column overall. Check whether it lines up with a batch, plate segment, or run break. Inspect those rows in the raw data files and compare their spread against the rest of the column.

---

### Within-row uniformity (Within-Row Variance)

**How this test works.** For each row, measures how much the replicates vary around the row's own average and compares that against the spread expected at that signal level. The test identifies rows that are unusually smooth, indicating replicates too alike to have been measured independently (binomial test on the count of too-smooth rows). Unusually noisy rows are shown for context but do not drive the flag, since high biological variability is common.

**What a positive result means.** Rows whose replicates are too alike point to a single value entered and then copied across the replicates with little or no added noise. It is the signature of "type a number, then fill the replicates." Real replicates of the same sample differ by at least the measurement's own noise.

**What to look for.** Identify the flagged rows and inspect them in the raw data files: replicates that match exactly, or differ only in the last digit, are the concern. Check whether the smooth rows cluster in particular conditions or a stretch of the dataset, which points to a fabricated block rather than scattered chance. Cross-reference Noise distribution: if the dataset's replicate differences are also too flat in shape, the two together point to noise drawn from a uniform range rather than measured — the same fabrication seen as too-alike rows here and as the wrong noise shape there.

---

### Noise vs signal level (Noise Scaling With Measurement Size)

**How this test works.** Checks how noise changes with signal level across the dataset and compares it against what the measurement type should typically show: e.g., qPCR counts, where spread grows with the count; fluorescence or densitometry intensities, where spread grows faster still (log-log slope of variance against mean, z-test against the assay's expected slope). It fits one slope over the whole dataset and assesses it as a whole, rather than pointing to particular rows or columns.

**What a positive result means.** A slope below what the assay predicts can arise when values are entered with a uniform amount of noise regardless of signal level: it is the mark of a single noise figure applied across the board, rather than the signal-dependent spread real measurement produces. A slope above the expected value can arise from mixing samples of very different quality, or from values built to exaggerate the spread at high signal.

**What to look for.** The wrong assay setting is the most common innocent cause: confirm the assay type is set correctly, since the expected slope depends on it. If the assay is right, inspect the raw data files for whether the noise tracks the signal as it should. Values with the same noise at high and low signal point to a uniform noise figure added by hand.

---

### Noise distribution (Excess Kurtosis)

**How this test works.** Takes the difference between each replicate pair and checks the shape of those differences across the dataset. Differences typically follow a bell-shaped curve. Tests for distribution shape, flagging when the spread is too flat — too few values near zero and too few far out (excess kurtosis and Anderson–Darling against a simulated null). A too-peaked shape does not drive the flag here; replicates that are too alike show up instead through the spread tests (Within-row noise, Column-to-column noise).

**What a positive result means.** A too-flat spread of replicate differences points to noise added from a uniform range — picking each value evenly between limits — rather than the bell-shaped noise real measurement produces. It is a common signature of replicates generated by adding "random" noise that is actually uniform, not Gaussian.

**What to look for.** Inspect the raw data files and examine the replicate differences: values spread evenly across a range, rather than clustering near zero, point to noise drawn from a flat distribution. Check whether the pattern holds across the whole dataset or concentrates in particular conditions, using the per-condition breakdown. Cross-reference Within-row uniformity: rows whose replicates are too alike, alongside this too-flat shape, locate where the uniform noise was added — the dataset-wide shape here, the specific rows there.

---

### Unusual rows (Mahalanobis Row Outlier)

**How this test works.** Treats each row's replicates as a point in space and measures how far that point sits from the centre of its condition, accounting for how the replicates normally vary together (Mahalanobis distance against a chi-squared reference). It reports only the specific rows that stand out; if no row is far enough to survive correction, the test returns a clean result rather than a general flag.

**What a positive result means.** A row sitting far from its condition's centre can be a genuine biological outlier — a sample that really did behave differently. It can also indicate a row built or edited to values that do not sit naturally with the rest, such as a figure transcribed into the wrong row or a fabricated entry that ignores how the replicates normally move together.

**What to look for.** The test names the specific rows. Inspect those rows in the raw data files and check whether each is a recorded anomaly — a known bad sample, a flagged well — or has no explanation. Cross-reference the other row-level tests: a row that also flags for smoothness or duplication is more than a lone outlier. Cross-reference Covariance anomalies as well — a row that sits inside a block flagged there is part of a structured anomaly, not a stray point, which the per-row view alone cannot tell you.

---

### Covariance anomalies (Blocked Mahalanobis)

**How this test works.** Scans contiguous blocks of rows within each condition and checks whether a block's replicates differ from the rest — either in their average (a shifted block) or in how the replicates move together (an altered correlation between replicates). The two checks run independently, so a block can flag on either (two-sample Hotelling's T² for the average, a shrinkage covariance comparison for the correlation). It runs only when the rows are in a meaningful order set at import.

**What a positive result means.** A block that differs in average can arise from a real batch effect or a recording change for that stretch. A block that differs in how the replicates move together is harder to produce by accident: it points to values injected from a model or copied with added noise, which carries its own correlation structure rather than the experiment's. The per-row test misses this: a stretch of fabricated rows can each look unremarkable on their own while the block as a whole carries the wrong average or correlation structure.

**What to look for.** Note which block of rows is identified and whether it flagged on average or on correlation. Inspect those rows in the raw data files and check whether the block lines up with a batch, plate, or run. A correlation difference with no recorded batch reason is the stronger signal — compare the block's replicate relationships against the rest of the condition. Cross-reference Unusual rows: if individual rows in the block also flag there, the block is anomalous both point by point and as a whole; if none do, the signal is purely structural — values that look ordinary alone but carry the wrong joint behaviour.

---

### Variance trend break (LOESS Residual Analysis)

**How this test works.** Fits a smooth curve to how the replicate noise changes down the rows, then looks for a stretch where the noise departs from that curve and for the row where it changes abruptly (windowed variance scan for the region, CUSUM for the changepoint). It finds both a fabricated region and its boundary, which whole-dataset tests miss when only part of the data is built. It runs only when the rows are in a meaningful order set at import.

**What a positive result means.** A stretch where the noise level shifts can arise from a real change partway through — a reagent change, a recalibration, a different operator for part of the run. It can also indicate a region that was smoothed, extrapolated, or built from a curve, where the noise stops behaving like the rest of the data.

**What to look for.** Note the flagged stretch of rows and the changepoint. Check whether the boundary lines up with a batch, plate, or run break. Inspect those rows in the raw data files and compare their noise against the rest of the column — a region that is too smooth, or whose values follow a curve, is the concern.

---

### Missing data pattern (Missing Data Pattern)

**How this test works.** Looks at where values are missing — not their size — and checks whether the gaps cluster into a block of rows or a region, rather than scattering at random as dropout usually does (Fisher's exact test on the missing-value pattern, with a block-concentration scan). It works on the pattern of presence and absence across the table.

**What a positive result means.** Missing values normally scatter: a failed well here, an unreadable cell there. A rectangular block of missing values, or missingness concentrated in one stretch, can arise innocently from a plate that was never run or a section dropped during collection. It can also indicate selective deletion — rows or values removed because they did not fit, leaving a clean gap where data was taken out.

**What to look for.** Note where the missing values cluster and whether they form a block or a region. Check whether the gap matches a known event — a failed plate, a sample lost in transit. Inspect the raw data files for those rows and check whether values were present in the original and removed, rather than never recorded.

---


---

## Cross-Group Comparisons family

### Profile rank agreement (Cross-Condition Rank Correlation)

**How this test works.** Builds an average profile for each condition — the row means across that condition's replicates — and measures how closely the conditions agree on the rank order of those rows: do the same rows come out high, and the same rows low, from one condition to the next (Spearman correlation between each pair of condition profiles, tested against a biological-similarity null). It assesses the conditions as a whole and runs only when there are at least three condition pairs to compare.

**What a positive result means.** Conditions whose rows rank in nearly the same order can genuinely share structure — the same control samples, a shared baseline, or treatments that really do move the rows together. They can also indicate one condition copied or derived from another, or several conditions generated from one template, leaving the row order matched where independent treatments would reshuffle it.

**What to look for.** This is a screening signal, not a standalone finding: strong rank agreement can always reflect real biology, so it carries weight only alongside the other tests. Confirm the conditions are meant to be independent — shared controls or a common reference is the most common innocent cause. Cross-reference Duplicate values and Offset copies: a condition pair that also shares rows or a constant offset points to one built from another. Cross-reference Cross-condition similarity and Baseline balance: these three read condition similarity from different angles, and a finding that holds across them is far harder to explain as biology than any one alone.

---

### Cross-condition similarity (Cross-Condition Consistency)

**How this test works.** Compares conditions against each other on a set of properties — their spread, their shape, their digit patterns, the way noise scales with signal — and checks whether any pair is more alike, or for some properties more different, than independent conditions should be (pairwise comparison across conditions, permutation null, corrected across all property-and-pair comparisons). For spread and shape, only unusual *similarity* counts as a signal, since real treatments are expected to differ. For properties that should hold across conditions regardless of treatment, both too-similar and too-different count.

**What a positive result means.** Conditions that are more alike than independent measurement allows can arise when they genuinely share structure — the same control samples, a shared baseline. They can also indicate one condition copied from another, or several conditions generated from one template, leaving them matched on properties that real treatments would separate.

**What to look for.** Note which pair of conditions flagged and on which property. Inspect those conditions in the raw data files and check whether the similarity has a recorded reason — shared controls, a common reference. Cross-reference Duplicate values and Offset copies: conditions that also share rows or a constant offset point to one built from another. Cross-reference Profile rank agreement and Baseline balance: these three read condition similarity from different angles, and a finding that holds across them is far harder to explain as biology than any one alone.

---

### Baseline balance (Baseline Balance)

**How this test works.** Tests each measured variable — each baseline characteristic, such as age, weight, or a marker level — for a difference between the conditions (per-feature ANOVA across conditions). It then checks the spread of those per-feature results: under honest random allocation the differences vary feature to feature, and a set of features that are all *too* well matched between conditions is the signal (a test for an excess of near-perfect matches against the uniform spread honest allocation produces). It looks for overall over-balance, not for any single matched variable.

**What a positive result means.** Groups that are too evenly matched across many features can arise from careful stratified randomisation or a large, well-balanced study. They can also indicate baselines adjusted to look matched — the signature of groups tuned after the fact, where real random allocation would leave more feature-to-feature variation.

**What to look for.** This is a screening signal across the whole table, not a single feature. Confirm the conditions are meant to be randomised groups — a comparison where balance is not expected is the most common innocent cause. If they are, inspect the raw data files and the reported per-variable results, and weigh the finding alongside the other tests rather than on its own. Cross-reference Profile rank agreement and Cross-condition similarity: these three read condition similarity from different angles, and groups that look engineered across all three are far harder to explain as careful randomisation than any one alone.

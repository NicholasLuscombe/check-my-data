/* ── Mechanism-based grouping for investigation display ── */
// Visual tokens (MECH_COLOR, DUP_GROUP_PALETTE) live in tokens.js — this file is text-only.
// Keys match METHODOLOGY-MAP v3 five dimensions (I–V). Display order = concreteness:
// most tangible evidence first (I, II), most abstract last (IV).
// `clusterLabel` (S161, A1.D2): lowercase noun phrase used inline in §4 prompt
// body finding headers ("{testName} — {clusterLabel} cluster"). Distinct from
// `label` (title-case section header). Renderer capitalises first letter when
// the same phrase heads the "Other clusters — all applicable tests cleared"
// list.
export const MECHANISMS = {
  copied:    { label: "Copy, paste, edit",            clusterLabel: "copy-paste/edit" },     // Dim I
  digits:    { label: "Unusual digits",               clusterLabel: "unusual digits" },      // Dim II
  shapes:    { label: "Distribution shapes",          clusterLabel: "distribution shapes" }, // Dim V
  replicate: { label: "Cross-replicate comparisons",  clusterLabel: "cross-replicate" },     // Dim III
  group:     { label: "Cross-condition comparisons",  clusterLabel: "cross-condition" },     // Dim IV (engine key `group` stays per S132g engine-identifier-stays / display-label-moves)
};
export const MECHANISM_ORDER = ["copied", "digits", "shapes", "replicate", "group"];

/* Map test name → primary mechanism category.
   Order within each category controls display order (via engine execution sequence). */
export const TEST_MECHANISM = {
  // Copy, Paste, Edit (3) — Dim I — display order: DupDet, ConstOffset, RSC
  "Exact Duplicate Detection":        "copied",
  "Constant-Offset Blocks":           "copied",
  "Residual Spike Correlation":       "copied",
  // Unusual Digits (5) — Dim II
  "Benford's Law (First Digit)":      "digits",
  "Benford's Law (Second Digit)":     "digits",
  "Terminal Digit Uniformity":        "digits",
  "Decimal Precision Consistency":    "digits",
  "Value-Frequency Spike":            "digits",
  // Distribution Shapes (3) — Dim V
  "Entropy / Zipf Analysis":          "shapes",
  "Column Goodness-of-Fit":           "shapes",
  "Modality Test":                    "shapes",
  // Cross-Replicate Comparisons (14) — Dim III
  "Inter-Replicate Correlation":      "replicate",
  "Excess Kurtosis":                  "replicate",
  "Autocorrelation":                  "replicate",
  "Windowed Autocorrelation":         "replicate",
  "Runs Test":                        "replicate",
  "Noise Scaling With Measurement Size": "replicate",
  "Within-Row Variance":              "replicate",
  "Selective Noise Partitioning":     "replicate",
  "Regional Noise Homogeneity":       "replicate",
  "LOESS Residual Analysis":          "replicate",
  "Row-Mean Runs":                    "replicate",
  "Mahalanobis Row Outlier":          "replicate",
  "Blocked Mahalanobis":              "replicate",
  // Cross-Condition Comparisons (3) — Dim IV
  "Cross-Condition Rank Correlation": "group",
  "Baseline Balance":                 "group",
  "Cross-Condition Consistency":      "group",
  // Interim placement (S95) — Missing Data Pattern detects structural missingness,
  // not replicate-value variation. Parked for re-homing when Dim VI File Integrity
  // lands, or for scope-restriction to cross-condition missingness. See STATUS.md.
  "Missing Data Pattern":             "replicate",
};

// Display names — internal test names → user-facing labels
export const DISPLAY_NAMES = {
  "Exact Duplicate Detection": "Duplicated Data",
  "Constant-Offset Blocks": "Offset copies",
  "Inter-Replicate Correlation": "Inter-Replicate Correlation",
  "Cross-Condition Rank Correlation": "Cross-Condition Rank Correlation",
  "Autocorrelation": "Noise correlation",
  "Windowed Autocorrelation": "Local noise correlation",
  "Excess Kurtosis": "Noise distribution",
  "Selective Noise Partitioning": "Column-to-column noise",
  "Runs Test": "Noise sign-pattern",
  "Noise Scaling With Measurement Size": "Noise scaling",
  "Row-Mean Runs": "Row-mean patterns",
  "Regional Noise Homogeneity": "Region-to-region noise",
  "LOESS Residual Analysis": "Noise level trend",
  "Terminal Digit Uniformity": "Last-Digit Frequencies",
  "Benford's Law (First Digit)": "First-Digit Frequencies",
  "Decimal Precision Consistency": "Decimal precision",
  "Benford's Law (Second Digit)": "Second-Digit Frequencies",
  "Value-Frequency Spike": "Over-used numbers",
  "Mahalanobis Row Outlier": "Unusual rows",
  "Blocked Mahalanobis": "Shifted blocks",
  "Residual Spike Correlation": "Shared noisy rows",
  "Within-Row Variance": "Within-row noise",
  "Missing Data Pattern": "Missing-data pattern",
  "Baseline Balance": "Baseline Balance",
  "Entropy / Zipf Analysis": "Distinct numbers",
  "Column Goodness-of-Fit": "Column Goodness-of-Fit",
  "Modality Test": "Number of peaks",
  "Cross-Condition Consistency": "Overall condition similarity",
};

// ── Shared marker symbols ──
// Circled numbers for hotspots and Key Findings list
export const RANK_NUMS = ["\u2460","\u2461","\u2462","\u2463","\u2464","\u2465","\u2466","\u2467","\u2468","\u2469",
  "\u246A","\u246B","\u246C","\u246D","\u246E","\u246F","\u2470","\u2471","\u2472","\u2473"];

// Per-type group markers (distinct namespaces to avoid collision with hotspot ①②③)
export const GROUP_MARKERS = {
  exact:     ["\u24B6","\u24B7","\u24B8","\u24B9","\u24BA","\u24BB","\u24BC","\u24BD","\u24BE","\u24BF","\u24C0","\u24C1","\u24C2","\u24C3","\u24C4","\u24C5","\u24C6","\u24C7","\u24C8","\u24C9"], // Ⓐ Ⓑ Ⓒ ...
  offset:    Array.from({length:20},(_,i)=>`C${i+1}`),
};

// ── Global vs localizing test classification ──
// Global tests describe dataset-wide character; they don't localize to specific cells.
export const GLOBAL_TESTS = new Set([
  "Benford's Law (First Digit)",
  "Benford's Law (Second Digit)",
  "Terminal Digit Uniformity",
  "Decimal Precision Consistency",
  "Excess Kurtosis",
  "Autocorrelation",
  "Noise Scaling With Measurement Size",
  "Entropy / Zipf Analysis",
  "Column Goodness-of-Fit",
  "Modality Test",
  "Cross-Condition Rank Correlation",
  "Baseline Balance",
  "Cross-Condition Consistency",
]);

// testKey → full test name (for mapping group testKeys back to result names)
export const TEST_KEY_TO_NAME = {
  dupDet:       "Exact Duplicate Detection",
  constOffset:  "Constant-Offset Blocks",
};

// Short observation-focused descriptions for compact test lists (~5 words each)
export const TEST_DESCRIPTIONS = {
  "Exact Duplicate Detection": "Are the same rows or blocks repeated?",
  "Constant-Offset Blocks": "Are numbers copied and shifted by a constant?",
  "Inter-Replicate Correlation": "How closely do replicates correlate with each other?",
  "Residual Spike Correlation": "Are the same rows the noisiest in every condition?",
  "Terminal Digit Uniformity": "How are the last digits distributed?",
  "Benford's Law (First Digit)": "How are the leading digits distributed?",
  "Benford's Law (Second Digit)": "How are the second digits distributed?",
  "Decimal Precision Consistency": "Do the numbers share a consistent precision?",
  "Value-Frequency Spike": "Does any number or digit combination recur more than chance allows?",
  "Selective Noise Partitioning": "Is the noise even from column to column?",
  "LOESS Residual Analysis": "Does the noise change partway through the dataset?",
  "Row-Mean Runs": "Do the row averages run in streaks?",
  "Regional Noise Homogeneity": "Is the noise even across regions of the data?",
  "Missing Data Pattern": "Where are the missing values?",
  "Autocorrelation": "Does the noise correlate from one row to the next?",
  "Windowed Autocorrelation": "Does the noise correlate within any short stretch of rows?",
  "Excess Kurtosis": "What is the distribution of the noise between replicates?",
  "Runs Test": "Does the noise flip between positive and negative at random?",
  "Noise Scaling With Measurement Size": "Does the noise scale the way this assay should?",
  "Within-Row Variance": "Are any rows' replicates unusually uniform?",
  "Entropy / Zipf Analysis": "How many distinct numbers does each column have?",
  "Column Goodness-of-Fit": "Do the values in each column follow an expected shape?",
  "Modality Test": "How many peaks do a column's values cluster around?",
  "Cross-Condition Rank Correlation": "Do conditions rank their rows in the same order?",
  "Mahalanobis Row Outlier": "Do any rows have an unusual combination of values?",
  "Blocked Mahalanobis": "Do any blocks of data show coordinated shifts in values?",
  "Baseline Balance": "Are the differences between conditions suspiciously small?",
  "Cross-Condition Consistency": "Are any two conditions alike across many different measures at once?",
};

// One-sentence method descriptions for "How this test works" expandable (Forensics mode)
export const TEST_METHODS = {
  // --- Copy, Paste, Edit ---
  'Exact Duplicate Detection': 'Looks for identical values within rows, identical whole rows, and repeated blocks of values, and tests whether they appear more often than they would if the values were shuffled at random (several exact binomial tests, combined). The same duplicate can show up in more than one of them.',

  'Constant-Offset Blocks': 'For each row, takes the difference between replicate pairs and checks whether the same difference repeats in neighbouring rows more often than it would if the row order were shuffled at random, producing a block of rows all offset by the same amount (consecutive-difference run count, permutation null). A second pass checks for offsets by a constant ratio.',

  'Inter-Replicate Correlation': 'Checks whether replicate columns correlate more closely than expected. Compares a pair\'s correlation against the average of all other pairs in the same condition, both across the whole column and in a sliding window that highlights any correlated stretch (winsorised Pearson correlation).',

  'Residual Spike Correlation': 'Finds rows that are unusually noisy between replicate pairs, then checks whether those rows are similarly noisy across several conditions. Tests whether the overlap is greater than if rows were randomly shuffled (Spearman correlation, permutation test).',

  // --- Unusual Digits ---
  'Terminal Digit Uniformity': 'Pools the last digit of every value across the dataset and counts how often the digits 0-9 appear, comparing with the flat spread expected in typical datasets: each digit should turn up about equally often (chi-squared goodness-of-fit against a uniform spread). It counts digits 1-9 only if the data appears to have stripped trailing zeros.',

  'Benford\'s Law (First Digit)': 'Within each column, counts how often the digits 1-9 appear as the first digit and compares with the Benford pattern — lower first digits typically occur more often than higher ones (mean absolute deviation from Benford against a simulated null). It tests each column separately and names the columns that depart from the pattern; it applies only to wide-range, positive data and does not run on whole numbers.',

  'Benford\'s Law (Second Digit)': 'Within each column, counts how often each digit 0–9 appears as the second digit and compares with the expected pattern — lower second digits occur slightly more often than higher ones (mean absolute deviation from the expected pattern against a simulated null). It tests each column separately and names the columns that depart; it applies only to wide-range, positive data and does not run on whole numbers, where second digits concentrate at 0. Most powerful on large datasets, where small departures become detectable.',

  'Decimal Precision Consistency': 'A single instrument records every value in a column at the same precision, and export tools then strip trailing zeros at predictable rates, leaving a smooth tail of shorter values. Within each column, this test checks whether the decimal places follow that pattern, or whether some precision levels are oddly underused (one-tailed binomial deficit test against the trailing-zero model). It tests each column separately and names the columns that fall short.',

  'Value-Frequency Spike': 'Checks whether any value appears far more often than the values immediately around it (Poisson tail test against a local smoothed expectation). A second pass checks whether the same digits after the decimal point recur across unrelated whole numbers. It runs on mostly-whole-number data, where hand entry leaves the clearest trace.',

  // --- Cross-Replicate Comparisons (spatial / sectional) ---
  'Selective Noise Partitioning': 'Measures how much each replicate column varies around the row averages and checks whether one column is noisier or quieter than the others (Bartlett\'s test for equal variance across columns). Replicate measurements should typically carry about the same amount of noise.',

  'LOESS Residual Analysis': 'Fits a smooth curve to how the replicate noise changes down the rows, then looks for a stretch where the noise departs from that curve and for the row where it changes abruptly (windowed variance scan for the region, CUSUM for the changepoint). It finds both a fabricated region and its boundary, which whole-dataset tests miss when only part of the data is built. It runs only when the rows are in a meaningful order set at import.',

  'Row-Mean Runs': 'Within each condition, computes the average value for each row, fits a straight-line trend through those row averages, and records whether each row sits above or below that fitted trend. The Wald\u2013Wolfowitz runs test then counts the unbroken runs of above- or below-trend rows: far fewer runs than chance means the averages clump into streaks \u2014 the signature of a shift applied to a block of rows \u2014 while far more runs than chance means they alternate more regularly than real measurements would. The number of runs expected under random alternation is 1 + 2\u00b7n\u208a\u00b7n\u208b / n, where n\u208a and n\u208b are the counts of above- and below-trend rows and n is their total \u2014 for a 200-row condition split roughly evenly, about 101. Each condition is tested independently against its own expected count, and the card flags on the condition with the strongest result.',

  'Regional Noise Homogeneity': 'Slides a window down each column and checks whether the replicate noise in any stretch of rows — how far that column\'s values sit from their row averages — is unusually high or low compared with the same column overall (sliding-window variance ratio, row-shuffle permutation null). It catches a small fabricated region that a whole-column test would miss, and runs only when the rows are in a meaningful order set at import.',

  'Missing Data Pattern': 'Looks at where values are missing — not their size — and checks whether the gaps cluster into a block of rows or a region, rather than scattering at random as dropout usually does (Fisher\'s exact test on the missing-value pattern, with a block-concentration scan). It works on the pattern of presence and absence across the table.',

  // --- Cross-Replicate Comparisons (serial structure + scale) ---
  'Autocorrelation': 'Takes the difference between each replicate pair and checks whether that difference is correlated from one row to the next (lag-1 autocorrelation, one-sample t-test). In independent measurements, one row\'s difference tells you nothing about the next. It pools all rows into a single dataset-wide measure rather than locating where the correlation sits — a pattern confined to one stretch is the windowed test\'s job. It runs only when the rows are in a meaningful order set at import; in an arbitrary order, such as a gene list, row-to-row correlation has no meaning.',

  'Windowed Autocorrelation': 'Slides a 15-row window across the data and checks whether the difference between replicates is correlated from one row to the next within any window — a pattern confined to one stretch is detected here even when the dataset as a whole clears (windowed lag-1 autocorrelation, permutation null within each replicate pair). Like the whole-dataset test, it runs only when the rows are in a meaningful order set at import.',

  'Excess Kurtosis': 'Takes the difference between each replicate pair and checks the shape of those differences across the dataset. Differences typically follow a bell-shaped curve. Tests for distribution shape, flagging when the spread is too flat — too few values near zero and too few far out (excess kurtosis and Anderson–Darling against a simulated null). A too-peaked shape does not drive the flag here; replicates that are too alike show up instead through the spread tests (Within-row noise, Column-to-column noise).',

  'Runs Test': 'For each replicate pair, tracks which replicate is larger at each row and counts how often the lead changes, comparing that against the number of changes the values would give if shuffled at random (Wald–Wolfowitz runs test). It looks only at which replicate leads, not how large the difference is, and runs only when the rows are in a meaningful order set at import.',

  'Noise Scaling With Measurement Size': 'Checks how noise changes with signal level across the dataset and compares it against what the measurement type should typically show: e.g., qPCR counts, where spread grows with the count; fluorescence or densitometry intensities, where spread grows faster still (log-log slope of variance against mean, z-test against the assay\'s expected slope). It fits one slope over the whole dataset and assesses it as a whole, rather than pointing to particular rows or columns.',

  // --- Cross-Replicate + Distribution Shapes + Cross-Condition ---
  'Within-Row Variance': 'For each row, measures how much the replicates vary around the row\'s own average and compares that against the spread expected at that signal level. The test identifies rows that are unusually smooth, indicating replicates too alike to have been measured independently (binomial test on the count of too-smooth rows). Unusually noisy rows are shown for context but do not drive the flag, since high biological variability is common.',

  'Entropy / Zipf Analysis': 'Counts how many distinct values appear in each column, checks how evenly they are spread, and then compares that against the spread a smooth distribution of the same average and variability would give (Shannon entropy against a fitted model). Runs each condition separately, and does not run on whole-number counts or ordinal scales, where there is no reliable baseline.',

  'Column Goodness-of-Fit': 'Fits each column to the distribution shape its mean and variance predict, then measures how closely the column\'s actual shape matches it (Anderson–Darling against a fitted family). Each column is tested separately. Does not run on whole-number counts or ordinal scales, where fitted shapes do not apply.',

  'Modality Test': 'Measures how far each column\'s distribution sits from a single-peaked shape (Hartigan dip statistic against a uniform-reference null). Each column is tested separately. Does not run on whole-number counts or ordinal scales.',

  'Cross-Condition Rank Correlation': 'Builds an average profile for each condition — the row means across that condition\'s replicates — and measures how closely the conditions agree on the rank order of those rows: do the same rows come out high, and the same rows low, from one condition to the next (Spearman correlation between each pair of condition profiles, tested against a biological-similarity null). It assesses the conditions as a whole and runs only when there are at least three condition pairs to compare.',

  'Mahalanobis Row Outlier': 'Treats each row\'s replicates as a point in space and measures how far that point sits from the centre of its condition, accounting for how the replicates normally vary together (Mahalanobis distance against a chi-squared reference). It reports only the specific rows that stand out; if no row is far enough to survive correction, the test returns a clean result rather than a general flag.',

  'Blocked Mahalanobis': 'Scans contiguous blocks of rows within each condition and checks whether a block\'s replicates differ from the rest — either in their average (a shifted block) or in how the replicates move together (an altered correlation between replicates). The two checks run independently, so a block can flag on either (two-sample Hotelling\'s T² for the average, a shrinkage covariance comparison for the correlation). It runs only when the rows are in a meaningful order set at import.',

  'Baseline Balance': 'Tests each measured variable — each baseline characteristic, such as age, weight, or a marker level — for a difference between the conditions (per-feature ANOVA across conditions). It then checks the spread of those per-feature results: under honest random allocation the differences vary feature to feature, and a set of features that are all too well matched between conditions is the signal (a test for an excess of near-perfect matches against the uniform spread honest allocation produces). It looks for overall over-balance, not for any single matched variable.',

  'Cross-Condition Consistency': 'Compares conditions against each other on a set of properties — their spread, their shape, their digit patterns, the way noise scales with signal — and checks whether any pair is more alike, or for some properties more different, than independent conditions should be (pairwise comparison across conditions, permutation null, corrected across all property-and-pair comparisons). For spread and shape, only unusual similarity counts as a signal, since real treatments are expected to differ. For properties that should hold across conditions regardless of treatment, both too-similar and too-different count.',
};

// Raw-cell visibility classification for the A1.D3 panel status line
// (S163 Phase 3a). Per-test answer to the question: when this test flags
// rows or cells in a localised region, does a reader looking at the
// flagged cells see something visibly anomalous?
//
//   "visible"     \u2014 the flagged cells themselves show the pattern (identical
//                   rows, offset blocks, repeated values, missing-data gaps).
//   "statistical" \u2014 the anomaly is computed (correlations, residuals,
//                   distances, distributional shape, frequency tests).
//                   The cells look unremarkable; the reasoning lives on
//                   the test card.
//
// Consumed by the panel status line as `(lane, rawVisibility)` dispatch.
// Dataset-wide findings (chips in the Dataset-wide patterns lane) take
// Case 3 status copy via lane regardless of this field; rawVisibility is
// load-bearing only for localised findings. Dataset-wide tests still
// classify here for completeness; "statistical" is the conservative
// default when raw-cell legibility is moot.
//
// Authored S163 Phase 3a; consumer wiring lands at Phase 3c.
export const TEST_RAW_VISIBILITY = {
  // Copy, Paste, Edit
  "Exact Duplicate Detection":           "visible",
  "Constant-Offset Blocks":              "visible",
  "Residual Spike Correlation":          "statistical",
  // Unusual Digits
  "Benford's Law (First Digit)":         "statistical",
  "Benford's Law (Second Digit)":        "statistical",
  "Terminal Digit Uniformity":           "statistical",
  "Decimal Precision Consistency":       "statistical",
  "Value-Frequency Spike":               "visible",
  // Distribution Shapes
  "Entropy / Zipf Analysis":             "statistical",
  "Column Goodness-of-Fit":              "statistical",
  "Modality Test":                       "statistical",
  // Cross-Replicate Comparisons
  "Inter-Replicate Correlation":         "statistical",
  "Excess Kurtosis":                     "statistical",
  "Autocorrelation":                     "statistical",
  "Windowed Autocorrelation":            "statistical",
  "Runs Test":                           "statistical",
  "Noise Scaling With Measurement Size": "statistical",
  "Within-Row Variance":                 "statistical",
  "Selective Noise Partitioning":        "statistical",
  "Regional Noise Homogeneity":          "statistical",
  "LOESS Residual Analysis":             "statistical",
  "Row-Mean Runs":                       "statistical",
  "Mahalanobis Row Outlier":             "statistical",
  "Blocked Mahalanobis":                 "statistical",
  // Cross-Condition Comparisons
  "Cross-Condition Rank Correlation":    "statistical",
  "Baseline Balance":                    "statistical",
  "Cross-Condition Consistency":         "statistical",
  // Other
  "Missing Data Pattern":                "visible",
};

// S166 B1: tests whose forensic verdict is constructively pooled — the
// flag is a property of the aggregate (pooled mean-z, pooled mean r, etc.)
// distributed across replicate pairs with no per-pair attribution by
// design. When such a test lands in the §2 `unscoped` lane (region.raw
// empty because there's no per-unit localisation to emit), the generic
// "couldn't isolate specific rows" caption reads as found-nothing —
// caption dispatch in FindingDetailPanel overrides to an affirming
// "distributed across pairs" framing for members of this set.
//
// Membership is static — pooled-by-design is an architectural property
// of the test, not a per-fixture outcome. Per S165's note, Runs Test
// pooled is the canonical case: whole-table wash is the correct floor
// because per-pair attribution does not exist; the §2 caption should
// say so rather than imply localisation failed.
export const POOLED_BY_DESIGN = new Set([
  "Runs Test",
]);

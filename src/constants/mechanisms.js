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

// Prose fragments for building the Layer 1 global summary sentence.
export const MECHANISM_PROSE = {
  copied:    "value repetition",
  digits:    "digit patterns",
  shapes:    "distributional shape",
  replicate: "replicate agreement",
  group:     "cross-condition similarity",
};

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
  "Row-Mean Runs": "Row averages trend unexpectedly",
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
  'Exact Duplicate Detection': 'Scans the dataset for identical values and tests the observed count against what would be expected if values were shuffled randomly (permutation test). Tests are computed independently; some duplicates may appear in more than one test.',

  'Constant-Offset Blocks': 'Checks for clusters of constant offsets. For each row, computes the difference between replicate pairs and checks whether that difference repeats in neighbouring rows. Significance assessed by shuffling row order (permutation test).',

  'Inter-Replicate Correlation': 'Checks whether replicate columns track each other more closely than expected. Compares each pair\'s correlation against the leave-one-out average of all other pairs in the same condition (winsorised Pearson r).',

  'Residual Spike Correlation': 'Identifies which rows are unusually variable between replicate pairs and tests whether the same rows are noisy across multiple conditions. In typical data, noisy rows vary independently across conditions \u2014 coordinated residual spikes suggest shared structure. Significance assessed by shuffling row order (permutation test).',

  // --- Unusual Digits ---
  'Terminal Digit Uniformity': 'Counts the frequency of each last digit (0\u20139) across all values and tests for deviation from a uniform distribution (chi-squared test).',

  'Benford\'s Law (First Digit)': 'Counts the frequency of each first digit (1\u20139) across all values. In naturally occurring datasets, lower leading digits (1, 2, 3\u2026) appear more often than higher ones (Benford distribution). This test checks whether the data follows that pattern (chi-squared goodness-of-fit with MAD simulation).',

  'Benford\'s Law (Second Digit)': 'Counts the frequency of each second digit (0\u20139) across all values. As with first digits, lower second digits (0, 1, 2\u2026) appear slightly more often than higher ones, following a predictable distribution (Benford distribution). This test checks whether the data follows that pattern (chi-squared goodness-of-fit with MAD simulation).',

  'Decimal Precision Consistency': 'Tests whether a column’s decimal-precision distribution is consistent with a single measurement source. Real data has a uniform precision policy — either all values measured to two decimal places, or all values rounded to integers. Mixed-source data (e.g. values copied from one experiment at higher precision, padded with values from another at lower precision) shows fewer mid-range precision values than a single-source explanation predicts. For each intermediate precision level, the test compares the observed count of values to a single-source prediction and flags shortfalls. See METHODOLOGY.md §3.3 for the formal statement.',

  'Value-Frequency Spike': 'Tests whether any value in a column appears far more often than its neighbours. Hand-typed fabricated data tends to reuse "comfortable" values \u2014 round numbers, favourite digits \u2014 producing sharp frequency spikes against the smooth distribution real measurements produce. The test smooths each value\u2019s frequency by comparing against its neighbours in value-space, then flags any value whose observed count is too high to be explained by the smoothed expectation. See METHODOLOGY.md \u00a73.5 for the formal statement (leave-one-out neighbour smoothing; Poisson tail probability for the spike-vs-expected comparison).',

  // --- Cross-Replicate Comparisons (spatial / sectional) ---
  'Selective Noise Partitioning': 'Checks whether all replicate columns have similar variability. A significant result means the noise levels are unequal (Bartlett\'s test), but with few columns it may not be possible to pinpoint which one differs.',

  'LOESS Residual Analysis': 'Measures how variable each row\'s replicates are, then fits a smooth trend to see whether noise changes gradually across the dataset. A cumulative-sum test (CUSUM) pinpoints the exact row where the noise character shifts \u2014 the changepoint.',

  'Row-Mean Runs': 'Within each condition, computes the average value for each row and tracks how often it crosses the condition-wide mean. Too few crossings indicates trending or block shifts; too many suggests unusual alternation (Wald\u2013Wolfowitz runs test).',

  'Regional Noise Homogeneity': 'Divides the replicate columns into spatial blocks and checks whether some blocks are more or less variable than others. Significance assessed by shuffling row order (Levene\u2019s test with permutation null).',

  'Missing Data Pattern': 'Checks whether missing values are scattered randomly or form patterns \u2014 for example, the same columns going missing together, one condition having more gaps than another, or a rectangular block of missing cells (Fisher\u2019s exact and spatial clustering tests).',

  // --- Cross-Replicate Comparisons (serial structure + scale) ---
  'Autocorrelation': 'Checks whether the inter-replicate noise is correlated between adjacent rows. In independent measurements, knowing the noise at one row tells you nothing about the next \u2014 significant correlation means the noise follows a pattern rather than varying freely (lag-1 autocorrelation, pooled t-test).',

  'Windowed Autocorrelation': 'Tests whether adjacent rows show coordinated patterns that aren\u2019t explained by the dataset\u2019s overall row-to-row variation. Slides a 15-row window across the data, measuring within each window how strongly each row\u2019s inter-replicate residuals predict the next row\u2019s. Localised serial structure \u2014 e.g. a fabricated region where rows were generated from a smooth curve, or AR(1)-shaped noise injected into one block \u2014 flags here even when the overall dataset autocorrelation reads normal. Compares against a permutation null that shuffles rows within each replicate pair. See METHODOLOGY.md \u00a72.1b for the formal statement.',

  'Excess Kurtosis': 'Tests whether the spread of inter-replicate differences is consistent with real measurement noise. Honest noise produces a characteristic bell-shaped distribution; fabricated replicates tend to be either too smooth (over-averaged values cluster tightly around the centre) or wrong-shaped in the tails. Uses two complementary statistics: excess kurtosis (a single summary of tail weight versus a Normal reference) and Anderson-Darling (a full comparison of the observed distribution against the Normal CDF, weighted toward the tails). The test adaptively selects which statistic drives the flag based on the number of replicates per row. See METHODOLOGY.md \u00a72.2 for the formal statement.',

  'Runs Test': 'For each replicate pair, tracks which replicate has the larger value at each row and checks how often the lead switches. Too few switches means one replicate stays consistently above the other \u2014 either across the full column or within localised stretches (Wald\u2013Wolfowitz runs test).',

  'Noise Scaling With Measurement Size': 'Checks whether noise scales with signal magnitude in the way the instrument type predicts \u2014 for example, constant variability for qPCR or proportional variability for ELISA. Fits a trend line on a log-log scale and compares the observed slope to the expected slope for the selected assay (z-test with block-robust standard error).',

  // --- Cross-Replicate + Distribution Shapes + Cross-Condition ---
  'Within-Row Variance': 'Computes how much replicates vary around each row\'s mean, then compares that spread to what the overall noise pattern predicts for a row at that signal level. Rows with unusually low spread are flagged as outliers (binomial test on z-score exceedances).',

  'Entropy / Zipf Analysis': 'Measures how many distinct values appear in each column and how evenly they\'re spread (Shannon entropy). Compares the observed diversity to what the column\'s distribution would produce. Flags columns where values repeat more than expected, or where values are more evenly spread than expected (parametric bootstrap).',

  'Column Goodness-of-Fit': 'For each column, fits a parametric family (Normal, Poisson, or Negative Binomial) and measures how closely the column\'s CDF shape matches the fit (Anderson\u2013Darling). A parametric bootstrap with refit calibrates the expected AD\u00b2; too-large values indicate shape mismatch (hand-typed, truncated, copied from a different-shape source), too-small values indicate a too-tight fit suggesting RNG padding.',

  'Modality Test': 'For each column, measures how far the empirical distribution deviates from the closest unimodal shape (Hartigan dip statistic). A uniform-reference bootstrap calibrates the dip expected under any unimodal distribution; dips exceeding the uniform ceiling are strong evidence of multimodality, a fingerprint of mixture fabrication.',

  'Cross-Condition Rank Correlation': 'Checks whether different experimental conditions produce unusually similar row-level patterns. In typical experiments, the rank order of rows varies between conditions \u2014 consistently similar rankings across multiple condition pairs suggests shared underlying structure (Spearman rank correlation).',

  'Mahalanobis Row Outlier': 'Checks whether any rows have an unusual combination of values across replicate columns. Each individual value might look plausible, but together they can fall outside the pattern that other rows follow \u2014 for example, replicates that all sit on the same side of their respective means (Mahalanobis distance against \u03C7\u00B2 distribution).',

  'Blocked Mahalanobis': 'Tests whether any contiguous block of rows shows a different mean or correlation structure than the rest of the dataset. Slides a window across the data, comparing each window\u2019s column means and inter-column correlations against the surrounding rows. A fabricated insert \u2014 rows generated with a different covariance pattern than the rest, even when individual columns look unremarkable \u2014 flags here. See METHODOLOGY.md \u00A72.6b for the formal statement (Hotelling T\u00B2 with Ledoit-Wolf covariance shrinkage; covariance-shape component via the dominant eigenvalue of the between-vs-rest covariance ratio).',

  'Baseline Balance': 'When subjects are randomly assigned to groups, some measurements \u2014 like age or weight \u2014 will naturally differ a little between groups. If every measurement matches almost perfectly across groups, the assignment may not be genuinely random. This test checks whether the between-group differences are too consistently small (Carlisle\'s method).',

  'Cross-Condition Consistency': 'Compares each condition pair on a set of robust distribution properties (trimmed span, dispersion, CDF shape) and flags pairs that are suspiciously close to each other — condition pairs that match more than random re-assignment of pooled values would produce. Real experimental conditions legitimately differ on location and scale, so the forensic signal for these properties lives in the "too similar" tail. Two-sided permutation null at the cell level, BH-FDR across all property \u00d7 pair units; only similar-direction units contribute to the flag.',
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

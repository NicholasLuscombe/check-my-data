/* ── Mechanism-based grouping for investigation display ── */
// Visual tokens (MECH_COLOR, MECH_ACCENT) live in tokens.js — this file is text-only.
// Keys match METHODOLOGY-MAP v3 five dimensions (I–V). Display order = concreteness:
// most tangible evidence first (I, II), most abstract last (IV).
export const MECHANISMS = {
  copied:    { label: "Copy, Paste, Edit" },              // Dim I
  digits:    { label: "Unusual Digits" },                 // Dim II
  shapes:    { label: "Distribution Shapes" },            // Dim V
  replicate: { label: "Cross-Replicate Comparisons" },    // Dim III
  group:     { label: "Cross-Group Comparisons" },        // Dim IV
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
  // Cross-Replicate Comparisons (11) — Dim III
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
  // Cross-Group Comparisons (3) — Dim IV
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
  "Constant-Offset Blocks": "Duplicated and Offset",
  "Inter-Replicate Correlation": "Inter-Replicate Correlation",
  "Cross-Condition Rank Correlation": "Cross-Condition Similarity",
  "Autocorrelation": "Noise Predictability",
  "Windowed Autocorrelation": "Windowed Autocorrelation",
  "Excess Kurtosis": "Replicate Noise Shape",
  "Selective Noise Partitioning": "Distribution of Noise Across Columns",
  "Runs Test": "Row-Order Randomness",
  "Noise Scaling With Measurement Size": "Noise Scaling",
  "Row-Mean Runs": "Row-Mean Patterns",
  "Regional Noise Homogeneity": "Regional Noise",
  "LOESS Residual Analysis": "Noise Consistency",
  "Terminal Digit Uniformity": "Last-Digit Frequencies",
  "Benford's Law (First Digit)": "First-Digit Frequencies",
  "Decimal Precision Consistency": "Decimal Places",
  "Benford's Law (Second Digit)": "Second-Digit Frequencies",
  "Value-Frequency Spike": "Repeated Digits",
  "Mahalanobis Row Outlier": "Unusual Rows",
  "Blocked Mahalanobis": "Block Covariance Anomaly",
  "Residual Spike Correlation": "Correlated Residuals",
  "Within-Row Variance": "Row Variance Scan",
  "Missing Data Pattern": "Missing Data Patterns",
  "Baseline Balance": "Condition Balance",
  "Entropy / Zipf Analysis": "Value Entropy",
  "Column Goodness-of-Fit": "Column Shape Fit",
  "Modality Test": "Column Modality",
  "Cross-Condition Consistency": "Cross-Condition Consistency",
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
  group:     "cross-group similarity",
};

// testKey → full test name (for mapping group testKeys back to result names)
export const TEST_KEY_TO_NAME = {
  dupDet:       "Exact Duplicate Detection",
  constOffset:  "Constant-Offset Blocks",
};

// Short observation-focused descriptions for compact test lists (~5 words each)
export const TEST_DESCRIPTIONS = {
  "Exact Duplicate Detection": "Rows, blocks, or column segments copied",
  "Constant-Offset Blocks": "Values shifted by a fixed amount",
  "Inter-Replicate Correlation": "Replicates track too closely",
  "Residual Spike Correlation": "Same rows anomalous across conditions",
  "Terminal Digit Uniformity": "Unexpected last digit pattern",
  "Benford's Law (First Digit)": "Unexpected leading digit pattern",
  "Benford's Law (Second Digit)": "Unexpected second digit pattern",
  "Decimal Precision Consistency": "Inconsistent decimal places",
  "Value-Frequency Spike": "Some digit sequences appear too often",
  "Selective Noise Partitioning": "Some columns more variable than others",
  "LOESS Residual Analysis": "Noise character changes partway",
  "Row-Mean Runs": "Row averages trend unexpectedly",
  "Regional Noise Homogeneity": "Variability changes in patches",
  "Missing Data Pattern": "Missing values cluster spatially",
  "Autocorrelation": "Adjacent noise values too predictable",
  "Windowed Autocorrelation": "Localised serial structure in replicate differences.",
  "Excess Kurtosis": "Noise distribution too flat or too peaked",
  "Runs Test": "Noise values not randomly ordered",
  "Noise Scaling With Measurement Size": "Spread doesn't scale with magnitude",
  "Within-Row Variance": "Some rows unusually uniform",
  "Entropy / Zipf Analysis": "Too many or too few distinct values",
  "Column Goodness-of-Fit": "Column shape wrong or too-tight fit",
  "Modality Test": "Column values cluster around multiple peaks",
  "Cross-Condition Rank Correlation": "Conditions rank too similarly",
  "Mahalanobis Row Outlier": "Rows with unusual combinations of values",
  "Blocked Mahalanobis": "Block of rows with shifted covariance or mean",
  "Baseline Balance": "Groups match too precisely",
  "Cross-Condition Consistency": "Condition pair suspiciously similar",
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

  'Decimal Precision Consistency': 'Counts the number of decimal places per value and tests whether the distribution of precisions matches what trailing-zero stripping from a single recording precision would produce (binomial deficit test).',

  'Value-Frequency Spike': 'Builds a frequency histogram of all values and checks whether any individual value appears far more often than its neighbours \u2014 for example, the value 67 recorded 8 times when neighbouring values 66 and 68 are never recorded. Each value\'s frequency is compared to a smoothed local expectation from surrounding values (Poisson survival test).',

  // --- Cross-Replicate Comparisons (spatial / sectional) ---
  'Selective Noise Partitioning': 'Checks whether all replicate columns have similar variability. A significant result means the noise levels are unequal (Bartlett\'s test), but with few columns it may not be possible to pinpoint which one differs.',

  'LOESS Residual Analysis': 'Measures how variable each row\'s replicates are, then fits a smooth trend to see whether noise changes gradually across the dataset. A cumulative-sum test (CUSUM) pinpoints the exact row where the noise character shifts \u2014 the changepoint.',

  'Row-Mean Runs': 'Within each condition, computes the average value for each row and tracks how often it crosses the condition-wide mean. Too few crossings indicates trending or block shifts; too many suggests unusual alternation (Wald\u2013Wolfowitz runs test).',

  'Regional Noise Homogeneity': 'Divides the replicate columns into spatial blocks and checks whether some blocks are more or less variable than others. Significance assessed by shuffling row order (Levene\u2019s test with permutation null).',

  'Missing Data Pattern': 'Checks whether missing values are scattered randomly or form patterns \u2014 for example, the same columns going missing together, one condition having more gaps than another, or a rectangular block of missing cells (Fisher\u2019s exact and spatial clustering tests).',

  // --- Cross-Replicate Comparisons (serial structure + scale) ---
  'Autocorrelation': 'Checks whether the inter-replicate noise is correlated between adjacent rows. In independent measurements, knowing the noise at one row tells you nothing about the next \u2014 significant correlation means the noise follows a pattern rather than varying freely (lag-1 autocorrelation, pooled t-test).',

  'Windowed Autocorrelation': 'Sliding 15-row window, lag-1 r per window, permutation null (B=999, within-pair shuffle), BH-FDR across (pair \u00d7 window).',

  'Excess Kurtosis': 'Checks whether the variability between replicate columns has the bell-shaped distribution expected from measurement noise \u2014 not too peaked (leptokurtic) with noise clustered near the centre and depleted in the shoulders, nor too flat (platykurtic) with noise evenly spread with less concentration at the centre (excess kurtosis with Anderson\u2013Darling test).',

  'Runs Test': 'For each replicate pair, tracks which replicate has the larger value at each row and checks how often the lead switches. Too few switches means one replicate stays consistently above the other \u2014 either across the full column or within localised stretches (Wald\u2013Wolfowitz runs test).',

  'Noise Scaling With Measurement Size': 'Checks whether noise scales with signal magnitude in the way the instrument type predicts \u2014 for example, constant variability for qPCR or proportional variability for ELISA. Fits a trend line on a log-log scale and compares the observed slope to the expected slope for the selected assay (z-test with block-robust standard error).',

  // --- Cross-Replicate + Distribution Shapes + Cross-Group ---
  'Within-Row Variance': 'Computes how much replicates vary around each row\'s mean, then compares that spread to what the overall noise pattern predicts for a row at that signal level. Rows with unusually low spread are flagged as outliers (binomial test on z-score exceedances).',

  'Entropy / Zipf Analysis': 'Measures how many distinct values appear in each column and how evenly they\'re spread (Shannon entropy). Compares the observed diversity to what the column\'s distribution would produce. Flags columns where values repeat more than expected, or where values are more evenly spread than expected (parametric bootstrap).',

  'Column Goodness-of-Fit': 'For each column, fits a parametric family (Normal, Poisson, or Negative Binomial) and measures how closely the column\'s CDF shape matches the fit (Anderson\u2013Darling). A parametric bootstrap with refit calibrates the expected AD\u00b2; too-large values indicate shape mismatch (hand-typed, truncated, copied from a different-shape source), too-small values indicate a too-tight fit suggesting RNG padding.',

  'Modality Test': 'For each column, measures how far the empirical distribution deviates from the closest unimodal shape (Hartigan dip statistic). A uniform-reference bootstrap calibrates the dip expected under any unimodal distribution; dips exceeding the uniform ceiling are strong evidence of multimodality, a fingerprint of mixture fabrication.',

  'Cross-Condition Rank Correlation': 'Checks whether different experimental conditions produce unusually similar row-level patterns. In typical experiments, the rank order of rows varies between conditions \u2014 consistently similar rankings across multiple condition pairs suggests shared underlying structure (Spearman rank correlation).',

  'Mahalanobis Row Outlier': 'Checks whether any rows have an unusual combination of values across replicate columns. Each individual value might look plausible, but together they can fall outside the pattern that other rows follow \u2014 for example, replicates that all sit on the same side of their respective means (Mahalanobis distance against \u03C7\u00B2 distribution).',

  'Blocked Mahalanobis': 'Slides a window along each condition and tests whether any block of rows has a different correlation pattern or block mean than the surrounding rows. Two passes per window \u2014 the \u03BC-pass uses a two-sample Hotelling T\u00B2 on block-vs-rest means with Ledoit-Wolf-shrunk pooled covariance, and the \u03A3-pass takes \u03BB_max of \u03A3\u0302_B \u00B7 \u03A3\u0302_{\\B}\u207B\u00B9 to measure covariance inflation. Within-condition row-shuffle permutation null on the scan-max statistic; BH-FDR across (pass \u00D7 condition).',

  'Baseline Balance': 'When subjects are randomly assigned to groups, some measurements \u2014 like age or weight \u2014 will naturally differ a little between groups. If every measurement matches almost perfectly across groups, the assignment may not be genuinely random. This test checks whether the between-group differences are too consistently small (Carlisle\'s method).',

  'Cross-Condition Consistency': 'Compares each condition pair on a set of robust distribution properties (trimmed span, dispersion, CDF shape) and flags pairs that are suspiciously close to each other — condition pairs that match more than random re-assignment of pooled values would produce. Real experimental conditions legitimately differ on location and scale, so the forensic signal for these properties lives in the "too similar" tail. Two-sided permutation null at the cell level, BH-FDR across all property \u00d7 pair units; only similar-direction units contribute to the flag.',
};

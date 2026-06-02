/* ── Centralized user-facing description strings ── */

// Category short descriptions shown in category header rows (after em-dash).
// Keyed by MECHANISM_ORDER (mechanisms.js): copied / digits / shapes /
// replicate / group. Pre-S95 keys (perfect / noise / uneven) removed —
// MECHANISM_ORDER has not used them since Track C.
export const CATEGORY_SHORT_DESCRIPTIONS = {
  copied:    'are values repeated or too similar?',
  digits:    'do the numbers themselves look odd?',
  shapes:    'do the value distributions look unusual?',
  replicate: 'do the replicates look unusual?',
  group:     'do the conditions look unusual?',
};

// Long-format vs wide-format explainer — shared by LongFormatModal preamble
// and ImportView Row Semantics card help popover. Three short paragraphs.
export const LONG_FORMAT_EXPLAINER = [
  "Long format means each row holds a single measurement, with extra columns labelling it (which subject, which condition, which timepoint). Many rows per subject, one value per row.",
  "Wide format means each row holds everything about one subject, with different measurements across columns.",
  "Most data mixes the two \u2014 some dimensions long, others wide. The tool offers to pivot only when pivoting actually helps your analysis.",
];

// QC mode: longer process-focused paragraphs shown under flagged category headers
export const QC_CATEGORY_DESCRIPTIONS = {
  copied: 'Some values in your data are duplicated or follow repeating patterns \u2014 this includes identical rows, blocks of similar values, columns that track each other too closely, or rows where every replicate gives the same answer. Check your data assembly process for accidental duplication \u2014 for example when copying between spreadsheets, merging files, or combining data from different runs.',

  digits: 'The pattern of digits in your data looks different from what measurements typically produce \u2014 this includes unusual rounding, inconsistent decimal places, or certain values appearing too often. Check whether any values were rounded, reformatted, or altered during data handling \u2014 for example when transferring between software, converting file formats, or transcribing from records.',

  uneven: 'Parts of your data behave differently from other parts \u2014 this includes one section being more or less variable, averages shifting partway, or missing values that cluster in an area of the table. Check whether conditions changed during the experiment or whether data from different sessions were combined \u2014 for example a new batch of reagents, recalibration of instruments, or a gap between collection dates.',

  noise: 'The random scatter in your data doesn\'t follow typical measurement noise \u2014 this includes consecutive values being too similar, the spread not matching the magnitude, or the overall distribution being unusual. Check whether any transformation, smoothing, or normalisation was applied during data processing \u2014 for example log transforms, baseline subtraction, or batch correction.',

  perfect: 'Your measurements agree with each other more closely than expected \u2014 this includes replicates that are too similar, conditions that track each other too well, or experimental groups that match more closely than random assignment would produce. Check whether any averaging, filtering, or outlier removal was applied during data processing \u2014 for example summarising replicates before export, removing failed runs, or selecting best-of-three readings.',
};

// Shared flagged-branch caption for the localised-row evidence tables
// (Windowed Autocorrelation, Blocked Mahalanobis). Reads the table \u2014 names
// what the highlight + sort show, not the \u03b1 / BH-FDR convention (method
// detail lives on the How-this-works surface). S204 caption arc.
export const LOCALISED_ROWS_CAPTION = "Highlighted rows shifted most from the rest; most-shifted first.";

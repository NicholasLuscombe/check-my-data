export const ASSAYS = [
  { v: "general",       l: "Unspecified / General",       d: "No instrument-specific noise model" },
  { v: "qpcr",          l: "qPCR (Ct values)",           d: "Normal noise on Ct scale. Range 10–40" },
  { v: "densitometry",  l: "Western Blot Densitometry",  d: "Proportional error. CV 5–20%" },
  { v: "plate_reader",  l: "Plate Reader (Abs / Fluor)", d: "Poisson at low, proportional at high" },
  { v: "cell_count",    l: "Cell Counting / Viability",  d: "Poisson counts, binomial proportions" },
  { v: "elisa",         l: "ELISA / Immunoassay",        d: "Log-normal. Heteroscedastic" },
  { v: "genomics",      l: "Genomics (Counts / TPM)",    d: "Negative binomial for raw counts" },
  { v: "physiological", l: "Physiological Measurements", d: "Normal or log-normal. Known ranges" },
  { v: "proteomics",   l: "Proteomics (Intensity / LFQ)", d: "Log-normal. Proportional error. Wide dynamic range" },
  { v: "survey",       l: "Survey / Likert Scale",     d: "Ordinal response items (1–5, 1–7, etc.)" },
];

// Data types — governs which tests are applicable and VST routing
export const DATA_TYPES = [
  { v: "continuous", l: "Continuous",     d: "Real-valued measurements (OD, Ct, mass, intensity)" },
  { v: "count",      l: "Count / Integer", d: "Non-negative integer counts (cells, reads, colonies)" },
  { v: "ordinal",    l: "Ordinal / Rank",  d: "Ordered categories (Likert 1–7, ranks, scores)" },
];

// Assay → suggested data type
export const ASSAY_DATATYPE_MAP = {
  general: "continuous", qpcr: "continuous", densitometry: "continuous",
  plate_reader: "continuous", elisa: "continuous", physiological: "continuous",
  proteomics: "continuous",
  cell_count: "count", genomics: "count", survey: "ordinal",
};

// Data type → the one sentence every test skipped for that data type shares.
// Every entry in a DATATYPE_SKIP block opened with this sentence and then
// closed with its own; the shared half now lives here once, so the no-verdict
// panel can state it once and list the tests beneath it. A data type with no
// skips needs no cause.
export const DATATYPE_CAUSE = {
  ordinal: "Not applicable to ordinal data such as ratings from 1 to 5.",
  count:   "Not applicable to count data.",
};

// Data type → tests to suppress (return N/A with explanation). Values are the
// PER-TEST TAIL only — what this test alone has to say. DATATYPE_CAUSE holds
// the shared opener, and joinDeclineReason puts the two back together for
// `description`. A tail of "" means the shared cause says everything there is
// to say about that test.
export const DATATYPE_SKIP = {
  ordinal: {
    "Selective Noise":            "The columns are different scale items, not repeats of one measurement, so a difference in spread between them is expected rather than suspicious.",
    "Autocorrelation":            "This test compares repeat measurements of the same quantity column by column, and these columns are separate scale items instead.",
    "Kurtosis":                   "This test measures the shape of the differences between repeat measurements, which has no meaning when the columns are separate scale items.",
    "Runs Test":                  "This test reads the run of ups and downs between repeat measurements, and these columns are separate scale items rather than repeats.",
    "Row-Mean Runs":              "This test averages each row across the columns, and averaging different rating items together gives a number that means nothing.",
    "Inter-Replicate Correlation":"The columns are different scale items rather than repeats of one measurement, so correlation between them is expected rather than a warning sign.",
    "Regional Noise Homogeneity": "This test checks whether measurement noise stays even across the table, which needs repeat measurements that share one noise pattern.",
    "Noise Scaling With Measurement Size": "This test checks whether the scatter of repeat measurements grows with their size, which needs numbers on a continuous scale.",
    "LOESS Residual Analysis":    "This test studies the noise left after fitting a smooth trend through repeat measurements, and these columns are separate scale items.",
    "Residual Spike Correlation": "This test compares the leftover noise across repeat measurements, and these columns are separate scale items rather than repeats.",
    "Within-Row Variance":        "This test measures the spread within each row across repeat measurements, which needs numbers on a continuous scale.",
    "Constant-Offset Blocks":     "This test looks for blocks of values copied and shifted by a fixed amount between repeat columns, which needs those columns to be repeats.",
    "Mahalanobis Row Outlier":     "This test flags rows that sit far from the rest, assuming a smooth bell-shaped spread; a scale of a few fixed values cannot provide one.",
    "Entropy / Zipf Analysis":     "These scales take only a few distinct values, so the measure of how spread out the values are cannot separate fabricated data from real.",
    "Column Goodness-of-Fit":      "This test checks whether a column follows a standard distribution — normal, Poisson, or negative binomial — and ranked categories follow none of them.",
    "Modality Test":               "This test looks for separate peaks in the distribution, which needs a continuous scale with many possible values; a few ranked categories cannot show them.",
    // Before this key existed dtSkip returned null here and the test's own
    // ordinal guard (blockedMahalanobis.js) answered instead, in wording that
    // differed from every other ordinal decline and so could never group with
    // them. The tail below is that guard's own second sentence, kept verbatim —
    // only the opener changed.
    "Blocked Mahalanobis":         "This test compares how the replicate columns vary together against a reference that only holds for measurements on a continuous scale.",
  },
  count: {
    "Entropy / Zipf Analysis":     "To judge whether a column is unusual this test compares it against a single standard distribution, and real count data rarely matches any one of them closely enough for the comparison to be fair.",
    "Column Goodness-of-Fit":      "This test checks whether a column matches a standard distribution — normal, Poisson, or negative binomial — but real counts often fit none of them well enough to give a trustworthy result.",
    "Modality Test":               "This test looks for more than one peak in the distribution, and its reference assumes a smooth single-peak continuous curve that whole-number counts do not follow.",
  },
  continuous: {},
};

// Put a shared cause and a per-test tail back together into the one sentence
// pair `description` has always carried. An empty tail returns the cause
// alone — no trailing space, no doubled full stop. Both dtSkip sites (engine
// and the confirmed-grouping re-run) join through here so the two can't drift.
export function joinDeclineReason(cause, tail) {
  return tail ? `${cause} ${tail}` : cause;
}

// The one sentence both Benford tests share when the values are too flat for a
// leading-digit argument. First and second digit measure the same quantity with
// the same estimator (robustLogSpan) and decline at different thresholds — 1.5
// and 1, deliberately, see the note at benford.js. The threshold, the fold-range
// gloss and the digit named all belong to the test, so they live in its tail;
// only the sentence that is genuinely the same lives here. Splitting at the full
// stop is what lets the two group under one cause. It is NOT shared with Noise
// Scaling's narrow-range decline, which spans row averages rather than values,
// uses a plain min-to-max range rather than a trimmed one, and carries an
// expected-slope exemption — a different gate that happens to read alike.
export const BENFORD_SPAN_CAUSE =
  "Not applicable — these values span too narrow a range for Benford's law.";

// The one sentence every test skipped for want of replicate columns shares.
// Fourteen sites said this fourteen ways, so fourteen declines that are the
// same decline rendered as fourteen blocks. It carries no number, because the
// minimum differs per test and belongs in the tail, and no test noun, because
// it heads a group of one as readily as a group of nine.
//
// It claims REPLICATE columns — repeats of one measurement. A test that needs
// columns for some other reason does not take this cause. Missing Data Pattern
// reads only which cells are empty and never compares values, so it keeps its
// own; Baseline Balance needs five distinct measured features, not repeats, and
// keeps its own too.
export const TOO_FEW_REPLICATE_COLS_CAUSE =
  "Not applicable — this file does not have enough replicate columns.";

// Auto-detect assay type from filename and column headers.
// Returns { assay, confidence: "high"|"low" } or null if no signal found.
export function detectAssay(fileName, headers) {
  const fn = (fileName||"").toLowerCase().replace(/[-_.\s]/g,"");
  const hdrs = (headers||[]).map(h=>String(h||"").toLowerCase().replace(/[-_.\s]/g,""));

  const score = { qpcr:0, densitometry:0, plate_reader:0, cell_count:0, elisa:0, genomics:0, physiological:0, proteomics:0, survey:0 };

  // ── filename signals ──────────────────────────────────────────────
  if(/qpcr|rtpcr|rtqpcr/.test(fn))                     score.qpcr         += 3;
  if(/\bpcr\b|cqvalue|ctvalue/.test(fn))                score.qpcr         += 2;
  if(/densitom|western|wblot|bandint/.test(fn))         score.densitometry += 3;
  if(/platereader|absorbance|fluoresc|luminesc/.test(fn))score.plate_reader += 3;
  if(/elisa|immunoassay|eia\b/.test(fn))                score.elisa        += 3;
  if(/cellcount|viabilit|mtt\b|celltiter|cytox/.test(fn))score.cell_count  += 3;
  if(/rnaseq|rnacount|tpm|fpkm|rpkm|deseq|edger/.test(fn))score.genomics  += 3;
  if(/rawcount|gse\d{4,}/.test(fn))                       score.genomics  += 3;
  if(/grch3[78]|hg3[89]|hg19|mm10|mm39|ncbi/.test(fn))    score.genomics  += 2;
  if(/proteomi|massspec|lcmsms|itraq|tmt\b|silac|swath\b|dia\b|maxquant|spectronaut|progenesis/.test(fn)) score.proteomics += 3;
  if(/heartrate|bloodpress|bodymass|temperature/.test(fn))score.physiological+=3;
  if(/survey|likert|questionnaire|rating|selfreport/.test(fn))score.survey+=3;

  // ── header signals (shared helper — scores both combined and header-only) ──
  function scoreHeaders(hdrs, target) {
    for(const h of hdrs){
      if(/^ct\d*$|^cq\d*$|deltact|ddct|dct|cycling/.test(h))  target.qpcr         += 3;
      if(/^tm\d*$|^eff$|^cpd\d*$|melttemp|melting|pcr.*eff|amplif/.test(h)) target.qpcr += 2;
      if(/ct_|_ct|cq_|_cq/.test(h))                            target.qpcr         += 2;
      if(/density|banddens|normband|bandint/.test(h))           target.densitometry += 2;
      if(/^od\d|^abs\d|absorbance|fluoresc|rfu\d|rlu\d|lum\d/.test(h)) target.plate_reader += 2;
      if(/pgml|ngml|concen|pg\/ml|ng\/ml/.test(h))             target.elisa        += 2;
      if(/od450|od490|od620/.test(h))                           target.elisa        += 2;
      if(/cellcount|viabilit|viable|livecell|deadcell|cells?$/.test(h)) target.cell_count += 2;
      if(/^tpm$|^fpkm$|^rpkm$|readcount|normcount/.test(h))   target.genomics     += 3;
      if(/^geneid$|^ensembl|^ensg\d|^enst\d/.test(h))          target.genomics     += 2;
      if(/^gsm\d{4,}/.test(h))                                  target.genomics     += 2;
      if(/heartrate|bpm|systol|diastol|weight|height|bmi/.test(h)) target.physiological+=2;
      if(/protein|peptide|abundance|intensity|lfq\b|ibaq\b|razor|ms1area|ms2area|precursor/.test(h)) target.proteomics+=2;
      if(/likert|scale|agree|disagree|satisf|rating|item[_\s]?[0-9]|q[0-9]/.test(h)) target.survey+=2;
    }
    if(hdrs.some(h=>/^plate\d/.test(h))){ target.elisa += 1; target.plate_reader += 1; }
  }
  scoreHeaders(hdrs, score);

  const best = Object.entries(score).reduce((a,b)=>b[1]>a[1]?b:a, ["general",0]);
  if(best[1]===0) return null;

  // Compute header-only score (without filename contribution).
  // AUTO badge requires headers to provide independent signal — filename alone
  // is too unreliable (researchers name files arbitrarily).
  const headerScore = { qpcr:0, densitometry:0, plate_reader:0, cell_count:0, elisa:0, genomics:0, physiological:0, proteomics:0, survey:0 };
  scoreHeaders(hdrs, headerScore);
  const headerContribution = headerScore[best[0]] || 0;

  // Require headers to contribute at least 2 points for AUTO badge.
  // Filename-only matches (headerContribution===0) still set the assay silently
  // but don't show AUTO — the user can confirm or override.
  const confidence = headerContribution >= 2 ? "high" : best[1] >= 3 ? "low" : "none";
  if(confidence === "none") return null;
  return { assay: best[0], confidence };
}

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

// Data type → tests to suppress (return N/A with explanation)
export const DATATYPE_SKIP = {
  ordinal: {
    "Selective Noise":            "Not applicable to ordinal data. Columns represent different scale items, not replicate measurements — variance differences between items are expected by design.",
    "Autocorrelation":            "Not applicable to ordinal data. Inter-replicate difference sequences require columns to be replicate measurements of the same quantity.",
    "Kurtosis":                   "Not applicable to ordinal data. Distribution shape of inter-replicate differences is undefined when columns are not replicates.",
    "Runs Test":                  "Not applicable to ordinal data. Sign-change sequences require columns to be replicate measurements.",
    "Row-Mean Runs":              "Not applicable to ordinal data. Row means are not meaningful for heterogeneous scale items.",
    "Inter-Replicate Correlation":"Not applicable to ordinal data. Columns are different scale items, not replicates — inter-item correlation is expected, not suspicious.",
    "Regional Noise Homogeneity": "Not applicable to ordinal data. Noise homogeneity requires replicate measurements with a common noise model.",
    "Noise Scaling With Measurement Size": "Not applicable to ordinal data. Mean–variance scaling requires continuous replicate measurements.",
    "LOESS Residual Analysis":    "Not applicable to ordinal data. Residual noise character analysis requires replicate measurements.",
    "Residual Spike Correlation": "Not applicable to ordinal data. Normalised residuals require replicate measurements.",
    "Within-Row Variance":        "Not applicable to ordinal data. Within-row SD requires continuous replicate measurements.",
    "Constant-Offset Blocks":     "Not applicable to ordinal data. Constant-offset detection requires replicate measurements.",
    "Mahalanobis Row Outlier":     "Not applicable to ordinal data. Mahalanobis distance assumes continuous multivariate normal — discrete ordinal scales produce quantisation artifacts.",
    "Entropy / Zipf Analysis":     "Not applicable to ordinal data — discrete ordinal scales have inherently constrained entropy.",
    "Column Goodness-of-Fit":      "Not applicable to ordinal data — discrete ordinal scales do not fit {Normal, Poisson, NB} families.",
    "Modality Test":               "Not applicable to ordinal data — Hartigan dip is not meaningful on sparse discrete support.",
  },
  count: {},
  continuous: {},
};

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

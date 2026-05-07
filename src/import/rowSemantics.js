// Row Semantics Gate auto-suggest (S118).
//
// `rowSemantics ∈ {ordered, arbitrary}` declares whether row index carries
// meaning. Sequential and spatial tests (Constant-Offset, Autocorrelation,
// Windowed Autocorrelation, Runs, Row-Mean Runs, Blocked Mahalanobis,
// LOESS, Regional Noise) require ordered rows; sub-units of IRC and
// Within-Row Variance also require ordered rows for their windowed scans.
// Under `arbitrary`, those tests are gated to N/A (full-test or sub-unit).
//
// Auto-suggest precedence (D2):
//   1. detectLongFormat() truthy            → arbitrary (AUTO, long-format)
//   2. assay === 'genomics'                 → arbitrary (AUTO, genomics)
//   3. assay ∈ INSTRUMENT_ASSAYS            → ordered   (AUTO, assay)
//   4. assay ∈ {general, proteomics, survey} → null (user choice REQUIRED)
//
// Caller threads detection separately (predicate above is assay-only) and
// supplies it via `longFormatDetected`. When the detector returns truthy
// the long-format branch wins regardless of assay.

// Wide-format instrument assays whose rows correspond to plate position,
// instrument run sequence, or other spatial/temporal layout that makes
// row order forensically meaningful.
const INSTRUMENT_ASSAYS = new Set([
  'qpcr', 'elisa', 'plate_reader', 'densitometry',
  'physiological', 'cell_count',
]);

/**
 * Auto-suggest a rowSemantics value for the import-stage gate.
 *
 * @param {{ assay?: string, longFormatDetected?: boolean }} opts
 * @returns {{ value: 'ordered' | 'arbitrary' | null,
 *             auto: boolean,
 *             reason: string }}
 *   `value === null` means the user must choose; `auto: true` means the UI
 *   should render the AUTO badge and may keep the gate hidden.
 */
export function suggestRowSemantics({ assay = null, longFormatDetected = false } = {}) {
  if (longFormatDetected) {
    return { value: 'arbitrary', auto: true, reason: 'long-format' };
  }
  if (assay === 'genomics') {
    return { value: 'arbitrary', auto: true, reason: 'genomics' };
  }
  if (assay && INSTRUMENT_ASSAYS.has(assay)) {
    return { value: 'ordered', auto: true, reason: 'assay' };
  }
  return { value: null, auto: false, reason: 'user-choice' };
}

/**
 * Test names whose entire result is N/A under `rowSemantics === 'arbitrary'`.
 * The engine reads this set in `runFullAnalysis` to dispatch the
 * row-semantics skip lane (see engine.js `rsSkip` helper).
 *
 * Sub-unit suppression (IRC windowed scan, Within-Row Variance windowed
 * scan) lives inside the test functions, gated on the `rowSemantics`
 * parameter — those tests still produce a result.
 *
 * Three sequential tests are intentionally *not* gated here because their
 * own nulls/gates handle the arbitrary-order case — §1.2 Constant-Offset
 * Blocks (row-shuffle permutation null by construction), §2.1 Autocorrelation
 * (Tier 2 effect-size floor |mean r| ≥ 0.25 at N ≥ 500), §2.1b Windowed
 * Autocorrelation (within-pair row-shuffle permutation null). See
 * METHODOLOGY §"Row Semantics Gate" and the individual test sections.
 */
export const ROW_SEMANTICS_FULL_SKIP = new Set([
  'Runs Test',
  'Row-Mean Runs',
  'Blocked Mahalanobis',
  'LOESS Residual Analysis',
  'Regional Noise Homogeneity',
]);

/**
 * Reason text emitted on the test-result `description` field when a test
 * is skipped via the row-semantics gate. Generic across the 8 full-skip
 * tests; sub-unit suppression in IRC / WRV uses test-specific phrasing.
 */
export const ROW_SEMANTICS_SKIP_REASON =
  "Not applicable when row order is arbitrary. " +
  "This test depends on meaningful row sequence (plate position, " +
  "instrument run order, dose gradient); under long-format pivots " +
  "or arbitrary-order data (gene lists, alphabetised protein IDs) " +
  "the per-row position carries no forensic signal.";

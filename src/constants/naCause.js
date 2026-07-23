/* ── Structured shortfall / decline codes for N/A results (P39 step 1) ──
   Every `flag: "N/A"` return in the test suite and the dispatch layer records
   WHY it declined, as a machine-readable `naCause`, so a later step can name the
   shortfall instead of the fixed string "No group had sufficient data for this
   test". This build only stamps the code; nothing reads it yet.

   The code set is derived from the site-by-site classification in
   S331-CODE-READ-NA-SITE-CLASSIFICATION.md. Two families:

     Declines — the data KIND or structure is wrong for the test. More data or a
     different grouping would not help. Not a sufficiency failure.

     Shortfalls — the test could run but there is not enough of something. The
     code names WHAT is short, never at what scale (whole-file vs one group) and
     never whether a different grouping would help. Three reads established the
     tool cannot compute scale from a return site, so this field does not claim
     to.

   One code stands apart: SCAN_CAP_EXCEEDED is a limit of the scan, hit when there
   is TOO MUCH data, not too little. It is neither a shortfall nor a decline.

   ── Count fields (P39 step 2b) ──
   Count-based sites (tooFewRows, tooFewObservations, tooFewDistinct,
   tooFewColumns, tooFewConditions) additionally carry two numbers when both are
   in scope at the return:

     naObserved — the count that tripped the shortfall (this column's
                  observations, this group's rows, whatever the guard compared).
     naMinimum  — the declared minimum it fell short of.

   The pair lets a reader compare the two — 12 against 30 — and judge for
   themselves whether they have a lever. The tool asserts no remedy. Both are
   plain numbers, and they are paired: an observed count always sits beside the
   minimum it was measured against, never a minimum from a different cause.

   Absent on decline codes (a number implies a threshold a reader could cross,
   which is false for a wrong data kind). Absent, too, on the emptiness sites
   where the tripping count is discarded before the return and only a misleading
   number survives — a deliberate omission, not a gap (see
   S331-CODE-READ-COUNT-REACHABILITY.md). */

export const NA_CAUSE = {
  // ── Declines (data kind / structure wrong; not a sufficiency failure) ──
  DATA_TYPE_MISMATCH: 'dataTypeMismatch',       // ordinal / count / integer data the test cannot use
  COLUMNS_NOT_REPLICATES: 'columnsNotReplicates', // columns are separate conditions, not replicates
  ROW_ORDER_ARBITRARY: 'rowOrderArbitrary',     // row order carries no meaning (long-format, gene lists)
  ASSAY_NOT_APPLICABLE: 'assayNotApplicable',   // assay biology makes the test meaningless (genomics, cell count)
  PREMISE_VOID: 'premiseVoid',                  // the test's premise is void (conditions genuinely differ, no grouping, too-high missingness)

  // ── Shortfalls (could run, not enough of something) ──
  TOO_FEW_COLUMNS: 'tooFewColumns',             // fewer replicate / feature columns than the minimum
  TOO_FEW_ROWS: 'tooFewRows',                   // fewer rows / valid rows / values than the minimum
  TOO_FEW_OBSERVATIONS: 'tooFewObservations',   // fewer non-null observations per column (within a group) than the minimum
  TOO_FEW_DISTINCT: 'tooFewDistinct',           // fewer distinct values than the minimum
  TOO_FEW_CONDITIONS: 'tooFewConditions',       // fewer conditions / condition pairs than the minimum
  RANGE_OUT_OF_BAND: 'rangeOutOfBand',          // value span / range outside the usable band — too narrow (Benford, Noise Scaling) or too wide (Value-Frequency Spike)
  SHAPE_NOT_COVERED: 'shapeNotCovered',         // distribution shape (or scale/positivity) outside what the test's model covers
  SINGULAR_COMPUTATION: 'singularComputation',  // a required computation is degenerate (singular covariance); only found by running
  MISSINGNESS_OUT_OF_BAND: 'missingnessOutOfBand', // missing-cell count / rate outside the testable band
  EMPTY_INPUT: 'emptyInput',                    // nothing usable produced (no data columns, no valid pairs / windows / digits)

  // ── Neither shortfall nor decline ──
  SCAN_CAP_EXCEEDED: 'scanCapExceeded',         // scan skipped because the dataset is too LARGE — a limit of the scan, not a shortage
};

/**
 * Most frequent naCause among a set of per-column skip codes; first-seen wins a
 * tie. Used by the three shape tests to give their all-columns-skipped rollup a
 * single representative code, since the columns can skip for different reasons.
 * Pure summary of codes already present on the per-column skips — no new
 * classification.
 * @param {string[]} codes
 * @returns {string|null}
 */
export function dominantCause(codes) {
  const counts = new Map();
  let best = null, bestN = 0;
  for (const c of (codes || [])) {
    if (c == null) continue;
    const n = (counts.get(c) || 0) + 1;
    counts.set(c, n);
    if (n > bestN) { bestN = n; best = c; }
  }
  return best;
}

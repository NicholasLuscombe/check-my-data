// ── Severity & Applicability ─────────────────────────────────────────
// Extracted from App.jsx — pure functions.

import { TEST_MECHANISM } from "../constants/mechanisms.js";
import { DATATYPE_SKIP } from "../constants/assays.js";
import { ROW_SEMANTICS_FULL_SKIP } from "../import/rowSemantics.js";

export function computeSeverity(results) {
  const high=results.filter(r=>r.flag==="HIGH").length;
  const mod=results.filter(r=>r.flag==="MODERATE").length;
  // Mechanism-category keys (copied/digits/shapes/replicate/group) are 1:1 with
  // the five METHODOLOGY-MAP dimensions — this Set is the cross-dimension diversity count.
  // Test-emitted r.category is stale (structural/distributional/etc.) — use TEST_MECHANISM mapping.
  const flaggedDimensions=new Set(results.filter(r=>r.flag==="HIGH"||r.flag==="MODERATE").map(r=>TEST_MECHANISM[r.name]||r.category));
  const nFlaggedDimensions=flaggedDimensions.size;
  // 0=clean, 1=minor flags, 2=single anomaly, 3=multiple anomalies
  const severity=high>=3?3:
    high>=2?3:
    (high>=1&&nFlaggedDimensions>=2)?3:
    high>=1?2:
    (mod>=2&&nFlaggedDimensions>=2)?3:  // 2+ MODs cross-dimension
    mod>=3?1:
    mod>=1?1:0;
  return { severity, high, mod, nFlaggedDimensions };
}

// -- Applicability prediction, derived from the engine's own decision inputs --
// Replaces the former hand-written boolean list. The battery, the mechanism
// grouping, and the dispatch-level skips all read the same sources the engine
// reads at run time, so the two cannot drift on those axes:
//   - the test set and its mechanism family come from TEST_MECHANISM (29);
//   - the dataType skips come from DATATYPE_SKIP (what dtSkip reads);
//   - the arbitrary-row-order skips come from ROW_SEMANTICS_FULL_SKIP (rsSkip).
// What stays hand-written is each test's summary-statistic minimums: those
// thresholds live as bare literals inside the test bodies and are not exported,
// so they are transcribed here and kept aligned to the engine by hand. The
// matrix-tier declines (distinct counts, valid-row counts, per-condition sizes)
// and the run-only declines are deliberately NOT predicted here.
//
// dtSkip / condSkip / rsSkip themselves are inner closures of runFullAnalysis
// and cannot be called from the import path without exporting them, which would
// be an engine refactor; consulting the same exported tables reaches the same
// verdict without touching the engine.

// Two tests carry a result name that differs from the dispatch label the skip
// table is keyed by; map result name -> dispatch label for the lookup.
const DT_SKIP_ALIAS = {
  "Excess Kurtosis": "Kurtosis",
  "Selective Noise Partitioning": "Selective Noise",
};

// Tests whose decline can only be known by running (singular covariance, a shape
// the fitted families do not cover, no valid pairs/patterns, conditions that
// genuinely differ). They clear the predictable tiers, so the screen counts them
// as "depend on the data" rather than as applicable. Result-name space.
export const RUN_ONLY_TESTS = new Set([
  "Mahalanobis Row Outlier",
  "Baseline Balance",
  "Cross-Condition Rank Correlation",
  "Cross-Condition Consistency",
  "Entropy / Zipf Analysis",
  "Column Goodness-of-Fit",
  "Modality Test",
  "Missing Data Pattern",
]);

// Each test's summary-statistic applicability, keyed by result name. Returns true
// when the summary the import screen holds clears the test's own minimums.
// Conditions-mode membership (condSkip) rides the `!isCond` guards here, the same
// way the former list encoded it.
function summaryApplicable(name, s, isCond) {
  const nDC = s.nDC, nR = s.nR, total = s.total, nC = s.nC;
  const intF = s.intF, span = s.span || 0, condSource = s.condSource;
  const miss = s.miss || 0, nCells = nR * nDC;
  const missRate = nCells > 0 ? miss / nCells : 0;
  const nonInt = total * (1 - intF);
  switch (name) {
    case "Exact Duplicate Detection":            return nDC >= 2;
    case "Sequential Duplication":               return nR >= 4 && nR <= 5000;
    case "Constant-Offset Blocks":               return !isCond && nDC >= 2 && nR >= 4;
    case "Residual Spike Correlation":           return !isCond && nC >= 2 && nR >= 10;
    case "Terminal Digit Uniformity":            return total >= 50 && intF <= 0.95;
    case "Benford's Law (First Digit)":          return total >= 100 && span >= 1.5;
    case "Benford's Law (Second Digit)":         return total >= 100 && span >= 1.0 && intF <= 0.9;
    case "Decimal Precision Consistency":        return nonInt >= 30;
    case "Value-Frequency Spike":                return total >= 100 && intF >= 0.8;
    case "Entropy / Zipf Analysis":              return nDC >= 1 && nR >= 20;
    case "Column Goodness-of-Fit":               return nDC >= 1 && nR >= 30;
    case "Modality Test":                        return nDC >= 1 && nR >= 50;
    case "Inter-Replicate Correlation":          return !isCond && nDC >= 2 && nR >= 10;
    case "Excess Kurtosis":                      return !isCond && nDC >= 2 && nR >= 20;
    case "Autocorrelation":                      return !isCond && nDC >= 2 && nR >= 10;
    case "Windowed Autocorrelation":             return !isCond && nDC >= 2 && nR >= 30;
    case "Runs Test":                            return !isCond && nDC >= 2 && nR >= 10;
    case "Noise Scaling With Measurement Size":  return !isCond && nDC >= 3 && nR >= 5;
    case "Within-Row Variance":                  return !isCond && nDC >= 3 && nR >= 40;
    case "Selective Noise Partitioning":         return !isCond && nDC >= 3 && nR >= 10;
    case "Regional Noise Homogeneity":           return !isCond && nDC >= 3 && nR >= 20;
    case "LOESS Residual Analysis":              return !isCond && nDC >= 2 && nR >= 30;
    case "Row-Mean Runs":                        return !isCond && nDC >= 2 && nR >= 10 && condSource === "row";
    case "Mahalanobis Row Outlier":              return !isCond && nDC >= 3 && nR >= 3 * nDC;
    case "Blocked Mahalanobis":                  return !isCond && nDC >= 3 && nR >= 60;
    case "Missing Data Pattern":                 return nDC >= 2 && nR >= 10 && miss >= 10 && missRate >= 0.01 && missRate <= 0.50;
    case "Cross-Condition Rank Correlation":     return (isCond ? nDC >= 2 : nC >= 2) && nR >= 10;
    case "Baseline Balance":                     return isCond ? nDC >= 5 : (nC >= 2 && nR >= 10);
    case "Cross-Condition Consistency":          return (isCond ? nDC >= 2 : nC >= 2) && total >= 60;
    default:                                     return true;
  }
}

/**
 * Predict which tests apply to a dataset, from the summary the import screen
 * holds plus the three dispatch axes the engine keys on (dataType, colRel,
 * rowSemantics). One entry per battery test: { name, fam, ok, runOnly }.
 * `ok` is true when the test clears the dispatch and summary tiers (it will or
 * might run); `runOnly` marks a test whose final decline is only knowable by
 * running. The matrix tier is not predicted, so `ok` can still overshoot on a
 * test that declines on a distinct-count or valid-row check.
 */
export function getApplicabilityTests(s, colRel, dataType = 'continuous', rowSemantics = 'ordered') {
  const isCond = colRel === 'conditions';
  const dtMap = DATATYPE_SKIP[dataType] || {};
  const arbitrary = rowSemantics === 'arbitrary';
  return Object.keys(TEST_MECHANISM).map(name => {
    const fam = TEST_MECHANISM[name];
    const dtName = DT_SKIP_ALIAS[name] || name;
    // Dispatch tier -- the same tables dtSkip and rsSkip read, plus Blocked
    // Mahalanobis's own continuous-only guard (not in the skip table).
    const dataTypeNA = !!dtMap[dtName] || (name === "Blocked Mahalanobis" && dataType !== 'continuous');
    const rowSemNA = arbitrary && ROW_SEMANTICS_FULL_SKIP.has(name);
    const ok = !dataTypeNA && !rowSemNA && summaryApplicable(name, s, isCond);
    return { name, fam, ok, runOnly: RUN_ONLY_TESTS.has(name) };
  });
}

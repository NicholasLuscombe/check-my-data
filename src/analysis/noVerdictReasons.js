/* ── No-verdict reason composition ──────────────────────────────────────
   Composes the "why a test did not run" lines for tests that produced no
   verdict — the not-applicable and errored coverage states. Lifted out of
   ForensicsCategoryBlock.jsx so the section-5 test-coverage surface can compose
   the same reasons from the same code later. This module owns the composition;
   the section keeps the rendering (renderNoVerdictSection / renderErroredSection
   / CollapsedSummaryRow) and calls in.

   Two behaviours the next reader must not undo:

   1. Errored reasons are composed from `naCause`, never read from `description`.
      An errored result's `description` is a generic "No group had sufficient
      data" sentence that can be flatly wrong — on 09-proteomics-clean it reports
      insufficient group data when the real cause was shape. notRunReasonLine
      builds the line from `naCause` instead.

   2. groupNotApplicableByReason keys on the EXACT `description` string. The
      exact match is deliberate — near-identical reasons stay separate so a
      genuinely different cause is never merged into another. There is a matching
      note at confirmGrouping.js:33. Do not loosen the match. */

import { resolveDisplayName } from "../constants/mechanisms.js";
import { NA_CAUSE } from "../constants/naCause.js";
import { formatSkipDetail, isGroupingRefusal } from "./handoffModel.js";

// Two different things route to N/A and they must not share a header. A test
// that was SKIPPED could have run; the data supports it and the scan declined
// on cost. A test that is NOT APPLICABLE genuinely cannot run on this shape.
// Calling a skip "not applicable" states something false about the data — on
// C14 it says the sequence scan does not apply to a file where Duplicated Data
// fires High. Both still classify as notApplicable internally; this is display
// only, and coverage.js is untouched.
//
// A third case joins them: a REFUSAL. The user confirmed a grouping, and the
// test cannot run on it. That is neither of the other two — the data shape is
// fine and nothing declined on cost. It is also the only one of the three the
// reader can act on, by unticking a condition column, so it must not hide
// under a word that says nothing can be done.
//
// Each marker is the one its own producer already sets. A skip carries the
// size-ceiling figures; a refusal carries the confirmed-grouping figures.
// No extra booleans, no coverage state, coverage.js untouched.
export function splitNotApplicable(notApplicableTests) {
  const refusedTests = notApplicableTests.filter(r => isGroupingRefusal(r));
  const skippedTests = notApplicableTests.filter(r => !isGroupingRefusal(r) && formatSkipDetail(r) != null);
  const trueNaTests = notApplicableTests.filter(r => !isGroupingRefusal(r) && formatSkipDetail(r) == null);
  return { refusedTests, skippedTests, trueNaTests };
}

// Group not-applicable tests by their exact reason string (S324). One
// dataset-level cause (columns are non-replicates, row order arbitrary, too few
// columns) drives many tests at once; stating it once, then the test names,
// reads as accounting rather than a wall of identical rows. Order follows first
// appearance so the layout is stable. Match is exact — near-identical reasons
// stay separate, which keeps a genuinely different cause from being merged.
export function groupNotApplicableByReason(tests) {
  const order = [];
  const byReason = new Map();
  for (const r of tests) {
    const reason = r.description || "";
    if (!byReason.has(reason)) { byReason.set(reason, { names: [], detail: null }); order.push(reason); }
    const g = byReason.get(reason);
    g.names.push(resolveDisplayName(r.name));
    // Size-ceiling numbers, when the test carries them. Only Sequential
    // Duplication does today, so a stanza holds at most one detail and first
    // wins. If a second test ever joins, what a shared stanza should show is
    // a Chat decision, not a shape to guess at here.
    if (g.detail == null) g.detail = formatSkipDetail(r);
  }
  return order.map(reason => {
    const g = byReason.get(reason);
    return { reason, names: g.names, detail: g.detail };
  });
}

// ── "Not run" reason composition (P39 step 3) ──
// An errored result carries a structured naCause (and naCauses when the groups
// disagreed). The reason line is built from that, never from the generic
// "No group had sufficient data" description, which is false when the cause is
// shape and the groups were large. naObserved / naMinimum are read when present,
// but the aggregator does not carry them onto an errored result today, so the
// numbered line stays dormant here until a later step reduces the per-group
// counts.

// Noun for each count cause, for the numbered line.
const NOT_RUN_NOUN = {
  [NA_CAUSE.TOO_FEW_ROWS]: "rows",
  [NA_CAUSE.TOO_FEW_OBSERVATIONS]: "observations",
  [NA_CAUSE.TOO_FEW_DISTINCT]: "distinct values",
  [NA_CAUSE.TOO_FEW_COLUMNS]: "columns",
  [NA_CAUSE.TOO_FEW_CONDITIONS]: "conditions",
};

// Plain sentence per cause when no number is available — no number, no implied
// threshold.
const NOT_RUN_SENTENCE = {
  [NA_CAUSE.TOO_FEW_ROWS]: "No group had enough rows for this test.",
  [NA_CAUSE.TOO_FEW_OBSERVATIONS]: "No group had enough observations for this test.",
  [NA_CAUSE.TOO_FEW_DISTINCT]: "No group had enough distinct values for this test.",
  [NA_CAUSE.TOO_FEW_COLUMNS]: "There were too few columns for this test.",
  [NA_CAUSE.TOO_FEW_CONDITIONS]: "There were too few conditions for this test.",
  [NA_CAUSE.EMPTY_INPUT]: "No group produced any values this test could use.",
  [NA_CAUSE.SINGULAR_COMPUTATION]: "The columns were too collinear for this test to compute.",
};

// shapeNotCovered means different things per test, and the distribution names
// belong to Column Goodness-of-Fit alone — they live in that test's skip prose,
// not on the result. Keyed by test so the message is never wrong for another
// (Modality and Column Goodness-of-Fit both reach this section).
const NOT_RUN_SHAPE = {
  "Column Goodness-of-Fit": "None of the standard distributions this test checks — normal, Poisson, negative binomial — fit these columns.",
  "Modality Test": "The columns are too close to uniform for this test's shape check.",
};
const NOT_RUN_SHAPE_DEFAULT = "The column shapes fall outside what this test can model.";

export function notRunReasonLine(r) {
  // A thrown test — the other errored producer. It carries no cause code.
  if (r.error === true || r.flag === "ERROR") {
    return "This test hit an error and could not run.";
  }
  // Groups disagreed — no single cause. Placeholder; no fixture exercises it.
  if (!r.naCause && Array.isArray(r.naCauses) && r.naCauses.length > 1) {
    return `Groups failed for more than one reason (${r.naCauses.join(", ")}).`;
  }
  const cause = r.naCause;
  if (cause === NA_CAUSE.SHAPE_NOT_COVERED) {
    return NOT_RUN_SHAPE[r.name] || NOT_RUN_SHAPE_DEFAULT;
  }
  // Numbered line, when both numbers are present (dormant on errored results).
  if (r.naObserved != null && r.naMinimum != null && NOT_RUN_NOUN[cause]) {
    return `Smallest group has ${r.naObserved} ${NOT_RUN_NOUN[cause]}; this test needs ${r.naMinimum}.`;
  }
  return NOT_RUN_SENTENCE[cause] || r.description || "This test could not run on the data as grouped.";
}

// Group errored tests by their composed reason, so an identical reason is stated
// once with the test names beneath it — the same accounting shape the
// not-applicable section uses, but keyed on the composed reason.
export function groupErroredByReason(tests) {
  const order = [];
  const byReason = new Map();
  for (const r of tests) {
    const reason = notRunReasonLine(r);
    if (!byReason.has(reason)) { byReason.set(reason, []); order.push(reason); }
    byReason.get(reason).push(resolveDisplayName(r.name));
  }
  return order.map(reason => ({ reason, names: byReason.get(reason) }));
}

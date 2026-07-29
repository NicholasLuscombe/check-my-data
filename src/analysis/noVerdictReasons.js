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

   2. groupNotApplicableByReason matches EXACTLY, on one of two keys. A producer
      that emits `naCauseText` (the data-type skips, which share one sentence per
      data type and differ only in a per-test tail) is keyed on that cause. Every
      other producer writes its reason whole and is keyed on the EXACT
      `description` string, as all of them were before. Both matches are exact —
      near-identical reasons stay separate so a genuinely different cause is
      never merged into another. There is a matching note at
      confirmGrouping.js:33. Do not loosen either match, and do not make the
      cause key a prefix or fuzzy match on `description`. */

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

// Group not-applicable tests by their reason (S324). One dataset-level cause
// (columns are non-replicates, row order arbitrary, too few columns) drives many
// tests at once; stating it once, then the test names, reads as accounting
// rather than a wall of identical rows. Order follows first appearance so the
// layout is stable.
//
// Two group shapes come out, and the caller tells them apart by `tails`:
//
//   tails === null — one reason for the whole group. Every member's whole
//     `description` was identical, so the group states it once. This is the
//     only shape that existed before, and it is still how the fully shared
//     reasons group: the row-order constant and the separate-conditions
//     constant hand every test the same string with nothing test-specific
//     after it.
//
//   tails is an array parallel to `names` — the members share a cause sentence
//     but each has its own tail. The data-type skips are the case: sixteen
//     ordinal declines opened with one sentence and closed with sixteen
//     different ones, so keying on the whole string put each in its own block.
//     A tail may be "", meaning the shared cause is that test's whole reason.
//
// Both matches are exact. The two key spaces are kept apart by a prefix so a
// cause sentence can never collide with some other test's whole description.
export function groupNotApplicableByReason(tests) {
  const order = [];
  const byKey = new Map();
  for (const r of tests) {
    const cause = r.naCauseText || null;
    const key = cause ? "cause: " + cause : "whole: " + (r.description || "");
    if (!byKey.has(key)) {
      byKey.set(key, { reason: cause || r.description || "", names: [], tails: cause ? [] : null, detail: null });
      order.push(key);
    }
    const g = byKey.get(key);
    g.names.push(resolveDisplayName(r.name));
    if (g.tails) g.tails.push(r.naTailText || "");
    // Size-ceiling numbers, when the test carries them. Only Sequential
    // Duplication does today, so a stanza holds at most one detail and first
    // wins. If a second test ever joins, what a shared stanza should show is
    // a Chat decision, not a shape to guess at here.
    if (g.detail == null) g.detail = formatSkipDetail(r);
  }
  return order.map(key => {
    const g = byKey.get(key);
    return { reason: g.reason, names: g.names, tails: g.tails, detail: g.detail };
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

/* ── Coverage vocabulary — what ran, what did not, and why ──
   Every test result lands in exactly one coverage state. Five of the six
   describe a test that produced no verdict; "ran" is the sixth.

     ran            — the test produced a verdict (High / Moderate / Low).
     notApplicable  — the data shape does not support the test.
     withheld       — the test applies, would have run, and is deliberately not
                      reported (P82 / P86, the paired-design skip). Distinct
                      from notApplicable in the one way that matters to a
                      reader: the test WAS on the table for this data. Nothing
                      about the data disqualified it and nothing the user can
                      change makes it run.
     unassessed     — the user declined to confirm the grouping, so the test
                      was not run.
     errored        — the test began and could not complete (a thrown error,
                      or a per-group dispatch where no group had enough data).
     pending        — grouping confirmation is still outstanding; transient.

   The invariant the report leans on:
       ran + notApplicable + withheld + unassessed + errored + pending === full battery.
   A category header, the clean-result copy, and the coverage line all read
   these counts, so the buckets agree by construction rather than by three
   separately hand-rolled filters. If the six counts ever fail to sum to the
   battery, a test went missing in the pipeline and that must surface, never as
   a silently shrunk denominator.

   Source of truth per state:
     - ran / notApplicable / pending / unassessed read the flag and the engine's
       own stamps (`groupingPending`, `groupingUnassessed`).
     - errored reads two explicit stamps: the engine's thrown-test path
       (`error: true` / flag "ERROR") and the per-group aggregator's
       `erroredCoverage` flag, set when no group had enough data to test. The
       aggregator still writes its human-readable note, but the classifier reads
       the flag, so a reword of that note cannot silently empty this bucket.
     - withheld reads `naCause`, via isWithheld() below. */

import { NA_CAUSE } from "../constants/naCause.js";

const VERDICT_FLAGS = new Set(["HIGH", "MODERATE", "LOW"]);

/**
 * The two words a reader sees wherever the withheld state needs a short label
 * rather than a whole sentence — the Excel legend key and the Excel per-test
 * flag column today. It is not a new string: it is the opener of the decline
 * §5 already renders, and subjectPairing.js composes PAIRED_CAUSE from it, so
 * there is one source rather than three copies that can drift.
 */
export const WITHHELD_LABEL = "Not evaluated";

/**
 * Was this test withheld by decision?
 *
 * This predicate and `groupNotApplicableByReason` are the only readers of the
 * withheld cause code in src/. Every surface that needs the state asks here or
 * asks classifyCoverage — a bespoke `naCause` comparison anywhere else is the
 * defect this module exists to prevent, as is the older `flag !== "N/A"` proxy
 * (a withheld test's flag is "N/A", indistinguishable from not-applicable).
 *
 * A second withheld cause is one more comparison here and nothing else.
 *
 * @param {object} r - engine test result
 * @returns {boolean}
 */
export function isWithheld(r) {
  return !!r && r.naCause === NA_CAUSE.SUBJECTS_SHARED_ACROSS_CONDITIONS;
}

/**
 * Classify one test result into its coverage state.
 * @param {object} r - engine test result
 * @returns {"ran"|"notApplicable"|"withheld"|"unassessed"|"errored"|"pending"}
 */
export function classifyCoverage(r) {
  if (!r) return "errored";
  if (VERDICT_FLAGS.has(r.flag)) return "ran";
  // Explicit engine / UI stamps win over any note inspection.
  if (r.groupingPending) return "pending";
  if (r.groupingUnassessed) return "unassessed";
  // Errored comes from two explicit stamps: the engine's thrown-test path
  // (error / flag "ERROR") and the per-group aggregator's no-group-completed
  // case (erroredCoverage). Both mean "began and could not finish". Reading the
  // flags, not the human-readable note, keeps this off any reword of that note.
  if (r.error === true || r.flag === "ERROR" || r.erroredCoverage === true) return "errored";
  // Withheld sits immediately before the not-applicable fallback because that
  // fallback is what used to swallow it: both carry flag "N/A" and only the
  // cause code tells them apart.
  if (isWithheld(r)) return "withheld";
  return "notApplicable";
}

/**
 * Sum coverage states across a set of results.
 * @param {object[]} tests - engine test results
 * @returns {{ran:number, notApplicable:number, withheld:number, unassessed:number, errored:number, pending:number, total:number}}
 */
export function summarizeCoverage(tests) {
  const c = { ran: 0, notApplicable: 0, withheld: 0, unassessed: 0, errored: 0, pending: 0, total: 0 };
  for (const r of (tests || [])) {
    c.total += 1;
    c[classifyCoverage(r)] += 1;
  }
  // The invariant the report leans on: the five no-verdict buckets plus ran sum
  // to the battery. It holds by construction (each test increments total and one
  // bucket in the same step), so a mismatch means a result carried a state this
  // classifier does not know — surface that rather than let the denominator
  // silently shrink.
  const summed = c.ran + c.notApplicable + c.withheld + c.unassessed + c.errored + c.pending;
  if (summed !== c.total && typeof console !== "undefined") {
    console.warn(`[coverage] bucket sum ${summed} does not equal battery ${c.total} — a result was misclassified`);
  }
  return c;
}

/**
 * The cluster header's coverage word, its tone, and its trailing clauses.
 *
 * Lives here rather than in ClusterRow so the vocabulary stays in the module
 * that owns the buckets, and so an instrument can read the same word the header
 * renders instead of a copy of the derivation. ClusterRow keeps the chrome: it
 * maps `tone` to a colour and lays the spans out.
 *
 * @param {object} coverage - summarizeCoverage() output for the cluster's full member list
 * @param {{isFlagged?:boolean, hasHigh?:boolean}} verdict - the cluster's own flag state
 * @returns {{word:string, tone:"high"|"moderate"|"clear"|"neutral", couldRun:number, clauses:string[]}}
 */
export function clusterCoverageState(coverage, { isFlagged = false, hasHigh = false } = {}) {
  const cov = coverage || { ran: 0, notApplicable: 0, withheld: 0, unassessed: 0, errored: 0, pending: 0, total: 0 };
  // The fraction counts every test that was on the table for this data. Both
  // not-applicable and errored come out of numerator and denominator: a
  // not-applicable test was never on the table for this data, and an errored test
  // could not finish — neither bears on whether the cluster is clean. A withheld
  // test stays in the denominator, because it WAS on the table: the fraction has
  // to show the gap it leaves. §5 is the coverage surface and accounts for all of
  // them; the header verdict comes from what actually ran.
  const couldRun = cov.total - cov.notApplicable - cov.errored;
  // Header word + tone. A flagged cluster keeps High / Moderate. A clean cluster
  // reports coverage: green "Clear" only when every test that could run completed;
  // a neutral word when work is genuinely outstanding (unassessed / pending, both
  // resolved by a user action). A withheld member cannot be "Clear", which would
  // claim a determination the cluster did not make, and cannot be "Clear so far",
  // which promises a resolution no user action can reach. It takes one of two
  // words depending on whether anything else in the cluster reported: "Partly
  // assessed" when some member ran, and the withheld state's own label when none
  // did — "Partly assessed" over a cluster where nothing ran asserts a part that
  // does not exist. When nothing could run, the label names why: "Not applicable"
  // when every decline genuinely does not apply, the neutral "Not run" when any
  // decline is an error (all-errored or mixed) — an errored test is neither
  // applicable nor inapplicable, so "Not applicable" would state something false
  // about the data.
  let word, tone;
  if (hasHigh) {
    word = "High"; tone = "high";
  } else if (isFlagged) {
    word = "Moderate"; tone = "moderate";
  } else if (couldRun === 0) {
    // A withheld test is never subtracted from couldRun, so couldRun === 0
    // implies cov.withheld === 0 and this branch cannot state "Not applicable"
    // over a withheld member.
    word = cov.errored > 0 ? "Not run" : "Not applicable"; tone = "neutral";
  } else if (cov.withheld > 0) {
    word = cov.ran > 0 ? "Partly assessed" : WITHHELD_LABEL; tone = "neutral";
  } else if ((cov.unassessed + cov.pending) > 0) {
    word = "Clear so far"; tone = "neutral";
  } else {
    word = "Clear"; tone = "clear";
  }
  // Coverage clauses, kept short so the cluster subtitle stays readable. The
  // fraction runs against couldRun (which excludes errored as well as
  // not-applicable) and carries no "completed" label — the word plus the fraction
  // already says it. Errored is not shown at cluster level: like not-applicable
  // the fraction already excludes it, and §5 keeps the full count. Only the states
  // a user action resolves — unassessed and pending — trail as clauses.
  const clauses = [];
  // The ratio is the cluster's only test count — the "(N tests)" parenthetical was
  // retired in its favour. Keep it only when nothing is outstanding, so it still
  // reports the count on a clear or flagged cluster. When an unassessed / pending
  // clause is present, that clause already states the coverage gap; the ratio
  // would only restate it and make the reader subtract, so drop it and let the
  // clause stand.
  const outstanding = cov.unassessed + cov.pending;
  if (couldRun > 0 && outstanding === 0) clauses.push(`${cov.ran} of ${couldRun}`);
  if (cov.unassessed > 0) clauses.push(`${cov.unassessed} unassessed`);
  if (cov.pending > 0)    clauses.push(`${cov.pending} pending`);
  return { word, tone, couldRun, clauses };
}

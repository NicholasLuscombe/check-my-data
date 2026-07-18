/* ── Coverage vocabulary — what ran, what did not, and why ──
   Every test result lands in exactly one coverage state. Four of the five
   describe a test that produced no verdict; "ran" is the fifth.

     ran            — the test produced a verdict (High / Moderate / Low).
     notApplicable  — the data shape does not support the test.
     unassessed     — the user declined to confirm the grouping, so the test
                      was not run.
     errored        — the test began and could not complete (a thrown error,
                      or a per-group dispatch where no group had enough data).
     pending        — grouping confirmation is still outstanding; transient.

   The invariant the report leans on:
       ran + notApplicable + unassessed + errored + pending === full battery.
   A category header, the clean-result copy, and the coverage line all read
   these counts, so the four buckets agree by construction rather than by three
   separately hand-rolled filters. If the five counts ever fail to sum to the
   battery, a test went missing in the pipeline and that must surface, never as
   a silently shrunk denominator.

   Source of truth per state:
     - ran / notApplicable / pending / unassessed read the flag and the engine's
       own stamps (`groupingPending`, `groupingUnassessed`).
     - errored reads two explicit stamps: the engine's thrown-test path
       (`error: true` / flag "ERROR") and the per-group aggregator's
       `erroredCoverage` flag, set when no group had enough data to test. The
       aggregator still writes its human-readable note, but the classifier reads
       the flag, so a reword of that note cannot silently empty this bucket. */

const VERDICT_FLAGS = new Set(["HIGH", "MODERATE", "LOW"]);

/**
 * Classify one test result into its coverage state.
 * @param {object} r - engine test result
 * @returns {"ran"|"notApplicable"|"unassessed"|"errored"|"pending"}
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
  return "notApplicable";
}

/**
 * Sum coverage states across a set of results.
 * @param {object[]} tests - engine test results
 * @returns {{ran:number, notApplicable:number, unassessed:number, errored:number, pending:number, total:number}}
 */
export function summarizeCoverage(tests) {
  const c = { ran: 0, notApplicable: 0, unassessed: 0, errored: 0, pending: 0, total: 0 };
  for (const r of (tests || [])) {
    c.total += 1;
    c[classifyCoverage(r)] += 1;
  }
  // The invariant the report leans on: the four no-verdict buckets plus ran sum
  // to the battery. It holds by construction (each test increments total and one
  // bucket in the same step), so a mismatch means a result carried a state this
  // classifier does not know — surface that rather than let the denominator
  // silently shrink.
  const summed = c.ran + c.notApplicable + c.unassessed + c.errored + c.pending;
  if (summed !== c.total && typeof console !== "undefined") {
    console.warn(`[coverage] bucket sum ${summed} does not equal battery ${c.total} — a result was misclassified`);
  }
  return c;
}

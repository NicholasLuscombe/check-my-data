/* ── Upfront applicability gate (S324, extracted to a module at S325) ──
   rowGroups() admits a group at 3 rows, but the distribution-shape tests need
   more observations per column than that. When no group clears a test's declared
   minimum, the dispatch site says so once — a clean not-applicable — rather than
   fanning the test over every group and having each return N/A, which the
   coverage classifier reads as an errored state, not a clean not-applicable one.

   Two dispatch sites run the grouped tests and must agree on this gate:
   runFullAnalysis in engine.js and runConfirmedGroupedTests in confirmGrouping.js.
   The predicate lives here, in one place, so the two sites cannot drift — the
   drift they carried before S325 is exactly what put the confirm path's grouped
   tests into the errored bucket where the engine returned not-applicable. */

export function noGroupMeetsMin(rowGroups, minRows) {
  return !Array.isArray(rowGroups) || !rowGroups.some(g => (g.matrix?.length || 0) >= minRows);
}

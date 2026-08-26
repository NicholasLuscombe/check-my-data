// ── S384 — the known failure list ───────────────────────────────────────────
//
// A check named here is one `test/validate-batch.mjs` is expected to fail
// today. Declaring it lets a run whose only failures are these ones still be
// called clean, and — the reason this file exists — makes a failure that is
// NOT declared stand out instead of disappearing into a report that already
// says "failing".
//
// Each entry keys on a failure SIGNATURE, not on a fixture name: the check,
// the gate that rejected it, and the specific test at fault. Keying on the
// fixture alone would rebuild the same blind spot one level down, because the
// declared red would go on hiding a second, different failure inside the same
// fixture. All three parts must match exactly for a failure to count as
// declared.
//
// `test` is null for a gate that rejects the whole check rather than one test
// inside it — that is the severity gate and the cross-shape routing gate.
//
// `check` is the fixture's filename for the 27 fixture checks. The DS01
// cross-shape check has its own name — '01-densitometry-clean.csv (long-form
// cross-shape)' — because it shares a CSV with a fixture check and declaring
// one must not declare the other. The runner prints whichever name applies.
//
// ── The gate names, exactly as the runner emits them ────────────────────────
//
//   severity              the fixture's severity did not match expected.severity
//   per-test flag         a cell declared in expected.flags landed outside its
//                         allow-set
//   completeness          a test fired MODERATE or HIGH and neither a cell in
//                         expected.flags nor an entry in ACKNOWLEDGED accounts
//                         for it
//   flag matrix           a cell differs from the value pinned for it in
//                         test/flag-matrix.json
//   cross-shape routing   the DS01 long-form check's rowGroups precondition
//                         did not hold
//   cross-shape trio      a DS01 long-form trio test landed outside {N/A, LOW}
//
// ── Which run this list is judged against ───────────────────────────────────
//
// Seed offset 0 — the shipped stream, the offset test/flag-matrix.json pins,
// and the mode CI runs. Under SEEDS>1 the extra offsets report through the
// multi-seed section and do not feed this list, which matters here: DS12b's
// Regional Noise cell is measured LOW at three of eight offsets, so at those
// offsets the completeness gate does not fire at all. Judging the list across
// offsets would read that silence as a fix.
//
// ── To add an entry ─────────────────────────────────────────────────────────
//
// Run `node test/validate-batch.mjs`. Beside every new failure it prints the
// signature in the exact three parts below. Copy them here and write a `why`
// that says what is broken and what would settle it. Diagnose first: an entry
// added to quieten a run nobody understood is the failure this file was built
// to prevent, one file further along.
//
// ── To retire an entry ──────────────────────────────────────────────────────
//
// Delete it. Order does not matter, because the runner fails loudly on a
// declared failure that stops firing — so if you fix the underlying problem
// first, the very next run tells you the entry is now stale and names it.

export const KNOWN_FAILURES = [
  {
    check: '12b-uniform-mixture-fabricated.csv',
    gate: 'completeness',
    test: 'Regional Noise Homogeneity',
    why:
      'Regional Noise Homogeneity fires MODERATE on this fixture, and no cell in ' +
      'expected.flags and no entry in ACKNOWLEDGED accounts for it, so the ' +
      'completeness gate rejects the fixture. S341 adjudicated the firing as a ' +
      'false positive: p is about 0.81 inside the planted region (rows 201-400), ' +
      'the window it reports (rows 51-65) lies wholly in the clean half and only ' +
      'reaches p about 0.25 there, and the tier survives a tenfold rise in the ' +
      'resample count, so it is not a resolution artefact. It is deliberately ' +
      'not in ACKNOWLEDGED: that lane records genuine incidental firings, and ' +
      'putting a false positive there would set the opposite precedent to the ' +
      'DS10 entry, which requires a firing to localise inside the fabricated ' +
      'range. S341 left the fixture needing a decision above the level of that ' +
      'pass — either regenerate it so the planted uniform noise is measurable by ' +
      'a channel that claims it, or re-scope it as a comparator with an expected ' +
      'severity of 0. Until that decision is taken the red stays, and it is ' +
      'declared here so that it stops masking anything else. ' +
      'See docs/shared/SESSION341-DS08-DS12B-ADJUDICATION.md.',
  },
];

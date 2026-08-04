// ── Subject pairing (P82, S351) ───────────────────────────────────────────
//
// Decides whether a file's conditions hold THE SAME subjects. A test whose null
// destroys the correspondence between row r in one condition and row r in
// another cannot be run on such a file: the reference distribution it compares
// against describes data the file is not.
//
// The scope rule is the DESTROYED CORRESPONDENCE, direction-agnostic — not the
// direction of the shuffle. Cross-Condition Consistency shuffles row tuples
// across conditions, so the condition tags move under fixed rows. Residual
// Spike Correlation shuffles each condition's residual vector within itself, so
// the rows move under fixed tags. Both break the matched pair. A rule phrased as
// "shuffles rows across conditions" would reach all of the first and none of the
// second, which is not the distinction that matters.
//
// ── The rule ───────────────────────────────────────────────────────────────
//
//   Column-grouped   paired, structurally and universally. Each condition is a
//                    column subset of the same rows, so row r is the same
//                    subject in every condition. No detection and no gate; no
//                    evidence could contradict it.
//   Row-grouped      paired only on evidence. Some identifier column must have
//                    every subject appearing exactly once in every condition,
//                    with identical subject sets across conditions.
//   Otherwise        unpaired.
//
// Default unpaired when the evidence is absent. The two errors are not
// symmetric: a false UNPAIRED runs a test whose null is too wide and can produce
// a false accusation, while a false PAIRED withholds a test and reports nothing.
// Only one of those lets a fabricator through.
//
// ── Two things a naive implementation gets wrong ──────────────────────────
//
// The identifier is NOT the first label column. DS03 and DS04 carry two: `ID` is
// distinct within each condition and disjoint across them, `Target` is distinct
// within and identical across. They are paired on `Target`. Reading only the
// first label column returns seven paired fixtures where the corpus has nine,
// and it fails silently — the disqualifying shape (one value per row, distinct
// within a condition, disjoint across) is uniform across the corpus, so a
// first-column reading looks like a clean negative. Every non-data column is
// tested here, and a condition column simply fails the distinctness check at no
// cost.
//
// The identifier is dropped before either test sees the data.
// `extractAnalysisInputs` builds the numeric matrix from DATA columns only, so
// this must be computed in that scope — the only one holding `data`, `roles` and
// `filteredIndices` together — and stamped onto the condition context.
//
// Deliberately NOT wired to `condCtx.paired`. That field has one reader in all
// of src/ (the conditions-mode predicate in engine.js), it is `false` on the
// row-grouped branch, and `forSubMatrix` rebuilds children with `groups: null`
// so every child reads `false`. An implementation built on it would look
// complete and leave the measured defect in place.

/**
 * @typedef {Object} SubjectPairing
 * @property {boolean} paired       Do the conditions hold the same subjects?
 * @property {'structural'|'identifier'|'none'} basis  How it was established.
 * @property {string|null} idColumn Header of the identifier column, when one carried it.
 * @property {number|null} idColIndex Its index in the raw row, when one carried it.
 * @property {number} nConditions   Conditions the verdict was taken over.
 */

/** Unpaired, with nothing found. */
const UNPAIRED = (nConditions = 0) => ({
  paired: false, basis: 'none', idColumn: null, idColIndex: null, nConditions,
});

/**
 * Establish whether the conditions hold the same subjects.
 *
 * Evidence is read over `condCtx.slices()` — the same slices the tests consume,
 * which drop any row-condition group below three rows. Taking the verdict over a
 * different row set from the one the tests see would make it describe a file
 * nobody analyses.
 *
 * @param {Object} opts
 * @param {import('./conditionContext.js').ConditionContext} opts.condCtx
 * @param {any[][]} opts.data            Raw rows, post-header.
 * @param {string[]} opts.roles          Per-column role, parallel to a raw row.
 * @param {number[]} opts.filteredIndices Matrix row -> raw data row.
 * @param {string[]} [opts.headers]      Raw headers, for naming the id column.
 * @returns {SubjectPairing}
 */
export function computeSubjectPairing({ condCtx, data, roles, filteredIndices, headers }) {
  if (!condCtx || !condCtx.has) return UNPAIRED(0);

  if (condCtx.type === 'column-grouped') {
    const slices = condCtx.slices();
    return {
      paired: true, basis: 'structural', idColumn: null, idColIndex: null,
      nConditions: slices.length,
    };
  }

  if (condCtx.type !== 'row-grouped') return UNPAIRED(0);

  const slices = condCtx.slices();
  if (!slices || slices.length < 2) return UNPAIRED(slices?.length ?? 0);
  if (!Array.isArray(data) || !Array.isArray(roles) || !Array.isArray(filteredIndices)) {
    return UNPAIRED(slices.length);
  }

  for (let col = 0; col < roles.length; col++) {
    if (roles[col] === 'data') continue;

    // The identifier values of each condition's rows, in slice order.
    const perCondition = [];
    let usable = true;
    for (const s of slices) {
      const rowIndices = s.rowIndices || [];
      if (!rowIndices.length) { usable = false; break; }
      const vals = [];
      for (const matrixRow of rowIndices) {
        const rawRow = data[filteredIndices[matrixRow]];
        const v = rawRow == null ? null : rawRow[col];
        const str = v == null ? '' : String(v).trim();
        if (str === '') { usable = false; break; }
        vals.push(str);
      }
      if (!usable) break;
      perCondition.push(vals);
    }
    if (!usable || perCondition.length !== slices.length) continue;

    // Exactly once in every condition.
    const sets = perCondition.map(v => new Set(v));
    if (sets.some((set, i) => set.size !== perCondition[i].length)) continue;

    // Identical subject sets across conditions.
    const ref = sets[0];
    let same = true;
    for (let i = 1; i < sets.length && same; i++) {
      if (sets[i].size !== ref.size) { same = false; break; }
      for (const v of sets[i]) if (!ref.has(v)) { same = false; break; }
    }
    if (!same) continue;

    return {
      paired: true, basis: 'identifier',
      idColumn: headers?.[col] ?? null, idColIndex: col,
      nConditions: slices.length,
    };
  }

  return UNPAIRED(slices.length);
}

// ── Decline wording ───────────────────────────────────────────────────────
//
// Shaped like the DATATYPE_CAUSE / DATATYPE_SKIP pair: a shared cause sentence
// that every test skipped for this reason carries, plus a per-test tail that
// only that test has to say. `joinDeclineReason` puts them back together for
// `description`, and the dispatch site emits `naCauseText` / `naTailText`
// alongside so `groupNotApplicableByReason` can state the cause once and indent
// the per-test lines under it.
//
// The constants live here rather than in constants/assays.js because they key on
// neither assay nor data type — the same reasoning that puts
// ROW_SEMANTICS_SKIP_REASON in the row-semantics module. The machinery they
// route through is the shared one either way.
//
// Three things the wording has to do, and none is negotiable:
//   - It says NOT EVALUATED. Not clean, not a pass, not applicable-therefore-
//     fine. A reader must not be able to take the skip for a result.
//   - It carries no statistic. A number in a forensics report is read as
//     evidence whatever label sits next to it, so the skip result carries no p,
//     no distance and no percentile.
//   - It explains itself in plain words. The term "paired" never appears; it
//     names what is actually true of the file instead.

/** Shared opener for every test withheld because the conditions share subjects. */
export const PAIRED_CAUSE =
  "Not evaluated — the same subjects appear in every condition.";

/** Per-test tail. Keyed on the engine's dispatch-map key. */
export const PAIRED_SKIP = {
  "Cross-Condition Consistency":
    "This check compares each pair of conditions against a reference it builds by " +
    "reshuffling subjects between them, which only describes a study where the " +
    "conditions hold different subjects. Here they hold the same ones, so the " +
    "comparison is withheld rather than reported: a result from it would not mean " +
    "what it appears to mean.",
};

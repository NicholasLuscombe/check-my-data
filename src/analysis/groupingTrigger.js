// ── Grouping-enforcement trigger (S320 move 2) ──────────────────────
// Single source of truth for the row-grouping enforcement decision.
//
// When a row-grouping can't be trusted, four row-grouped dispatch tests
// (Mahalanobis Row Outlier, Entropy/Zipf, Column Goodness-of-Fit, Modality)
// return N/A pending user confirmation instead of a pooled verdict a reader
// would mistake for a grouped pass. Two arms:
//   Arm 1 (combinatorial merge)         — ≥3 columns tagged condition.
//   Arm 2 (can't support a permutation) — no usable partition, OR the
//          partition is thin: median group size ≤ 4.
//
// This module holds the arm arithmetic in ONE place. Two callers:
//   • the engine (extractAnalysisInputs), on the full inferred condition set;
//   • the confirm card, per checkbox untick, on the ticked subset.
// Neither carries its own copy of the logic — that is the whole point.
//
// The function is pure: it takes raw import inputs and a candidate condition-
// column set, rebuilds the row-condition partition for that set, and returns
// the grouping shape plus the arm evaluation. No test runs, no side effects.
//
// Parity contract with the pre-extraction inline code (engine.js @ a9d3c61):
//   • The merged row-condition label is built exactly as extractAnalysisInputs
//     did (trim → empty-to-null → `.filter(Boolean)` → `" | "`-join), so the
//     partition is byte-identical.
//   • nCondCols counts NON-EMPTY condition columns (mirrors the
//     `.filter(Boolean)` at the old engine.js:150), not raw selected columns —
//     a blank condition column must not inflate the Arm-1 count.
//   • The partition, sizes, and median mirror conditionContext.rowGroupsStatus
//     (all groups counted, singletons included; even-length median = mean of
//     the middle two).
//   • `attempted` is false when the candidate set yields no row conditions.
//     The engine passes an EMPTY set on column-grouped data, reproducing the
//     old `hasGroups` guard (rowGroupsStatus returned attempted:false there).

const MIN_PER_GROUP = 3;   // a group needs ≥3 rows to be "usable" (matches rowGroupsStatus default)
const THIN_MEDIAN = 4;     // Arm 2 fires when the median group size is ≤ this

/**
 * Compute the grouping-enforcement trigger for a candidate condition-column set.
 *
 * @param {Object} args
 * @param {any[][]} args.data - Raw imported rows (all columns, pre-filter).
 * @param {string[]} args.roles - Per-column role map (unused directly; accepted
 *   so the card can pass importConfig.roles verbatim and future callers can
 *   derive condColSet from it — the engine passes condColSet explicitly).
 * @param {number[]} args.condColSet - Candidate condition-column indices.
 *   Empty → not row-grouped → attempted:false.
 * @param {number[]} args.filteredIndices - Surviving row indices (data-column
 *   filter), i.e. rowMap. Maps raw rows to matrix rows.
 * @returns {{ attempted:boolean, nGroups:number|null, sizes:number[],
 *   median:number|null, condCols:number, arm1:boolean, arm2:boolean,
 *   pending:boolean }}
 */
export function computeTrigger({ data, roles, condColSet, filteredIndices }) {
  const cols = Array.isArray(condColSet) ? condColSet : [];

  // ── Rebuild the merged row-condition labels for this candidate set ──
  // Identical to extractAnalysisInputs' rowConditions build: per row, take each
  // condition column's trimmed non-empty value, join the survivors with " | ".
  const rc = data.map(row => {
    const parts = cols
      .map(ci => (row[ci] != null && String(row[ci]).trim() ? String(row[ci]).trim() : null))
      .filter(Boolean);
    return parts.join(" | ") || null;
  });
  const rowConditions = rc.some(c => c) ? filteredIndices.map(i => rc[i] || null) : null;

  // ── Non-empty condition-column count (Arm 1 input) ──
  // Mirrors extractAnalysisInputs:145-151 + the old engine.js:208-209 nCondCols
  // derivation. Per-column arrays are built only when >1 candidate column, with
  // all-empty columns dropped; a single column falls back to (rowConditions?1:0).
  let rowConditionsCols = null;
  if (cols.length > 1) {
    rowConditionsCols = cols.map(ci => {
      const col = data.map(row => (row[ci] != null && String(row[ci]).trim() ? String(row[ci]).trim() : null));
      const filtered = filteredIndices.map(i => col[i] || null);
      return filtered.some(c => c) ? filtered : null;
    }).filter(Boolean);
  }
  const nCondCols = rowConditionsCols ? rowConditionsCols.length : (rowConditions ? 1 : 0);

  // ── Partition the surviving rows by merged label (rowGroupsStatus mirror) ──
  const attempted = rowConditions != null;
  if (!attempted) {
    return { attempted: false, nGroups: null, sizes: [], median: null, condCols: nCondCols,
             arm1: nCondCols >= 3, arm2: false, pending: false };
  }

  const counts = {};
  for (let r = 0; r < rowConditions.length; r++) {
    const c = rowConditions[r];
    if (!c) continue;
    counts[c] = (counts[c] || 0) + 1;
  }
  const sizes = Object.values(counts);
  const nGroups = sizes.length;
  const usable = nGroups >= 2 && sizes.every(n => n >= MIN_PER_GROUP);

  // Median over ALL groups (singletons included), even-length = mean of middle two.
  const sorted = [...sizes].sort((a, b) => a - b);
  const median = sorted.length
    ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
                         : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : null;

  // ── Arm evaluation ──
  const arm1 = nCondCols >= 3;
  const arm2 = !usable || (Number.isFinite(median) && median <= THIN_MEDIAN);
  const pending = arm1 || arm2;   // attempted is true in this branch

  return { attempted, nGroups, sizes, median, condCols: nCondCols, arm1, arm2, pending };
}

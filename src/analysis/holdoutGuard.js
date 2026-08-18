/* ── Hold-out guard (P177) ──────────────────────────────────────────────
   Refuses a column role change in the import view when the change would
   cost the analysis a whole column group.

   Why this exists. A header click takes a column out of the analysis
   matrix. On a sheet whose groups are two columns wide, that leaves one
   column, aggregation.js drops the group, and the tests that compare
   columns within a group quietly start comparing the whole file instead.
   The verdict moves — measured on 02-densitometry-fabricated, severity 1
   to 3 on full collapse and 1 to 0 several clicks earlier — and nothing
   on the page says it happened. The direction is not predictable, so the
   click is refused rather than announced.

   Why it does not restate the drop rule. The rule lives in one place,
   aggregation.js's groupIsUsable, and this module asks the real import
   path which groups survive before and after the change. A group four
   columns wide still clears the rule with three, so a wide group is safe
   without a special case, and the two halves of the rule — enough rows,
   at least two columns — are both covered because the code deciding them
   is the code that ships.

   The refusal message lives here too. It cannot use the naCause codes in
   constants/naCause.js: those stamp a test result, and this refusal
   happens before any test runs. It follows their naObserved / naMinimum
   convention instead, naming the count that fell short beside the
   minimum it fell short of, so a reader can judge for themselves. */

import { extractAnalysisInputs } from './engine.js';
import { MIN_GROUP_ROWS, MIN_GROUP_COLUMNS } from './aggregation.js';

const ALLOWED = {
  refused: false, group: null, kind: null,
  observed: null, minimum: null, message: null,
};

function tail() {
  return "The group would drop out, and tests that compare columns within a group " +
         "would switch to comparing the whole file — with nothing on the page to say so.";
}

function compose(name, kind, observed, minimum) {
  const unit = kind === 'columns'
    ? `${observed} column${observed === 1 ? '' : 's'}`
    : `${observed} row${observed === 1 ? '' : 's'} of data`;
  return `Group "${name}" would be left with ${unit} and the analysis needs at least ${minimum}. ${tail()}`;
}

/**
 * Would this role change cost the analysis a column group?
 *
 * Pure. Takes the data and the two role arrays, returns a verdict. No UI
 * dependency, nothing rendered, nothing mutated.
 *
 * @param {Object}   o
 * @param {any[][]}  o.data           raw imported rows
 * @param {string[]} o.roles          roles as they stand
 * @param {string[]} o.nextRoles      roles the click would produce
 * @param {(string|null)[]|null} o.condPerCol  per-column group names
 * @param {boolean}  [o.zeroAsMissing=false]
 * @returns {{refused:boolean, group:string|null, kind:('columns'|'rows'|null),
 *            observed:number|null, minimum:number|null, message:string|null}}
 */
export function checkColumnRoleChange({
  data, roles, nextRoles, condPerCol, zeroAsMissing = false,
  colRelationship, dataColHeaders,
}) {
  if (!data || !data.length || !roles || !nextRoles) return ALLOWED;
  // No column groups means there is no group to lose.
  if (!condPerCol || !condPerCol.some(c => c)) return ALLOWED;

  const args = { data, condPerCol, zeroAsMissing, colRelationship, dataColHeaders };
  const before = extractAnalysisInputs({ ...args, roles });
  const kept = new Set((before.groups || []).map(g => g.name));
  // Nothing survives today, so this click cannot be what loses it.
  if (kept.size === 0) return ALLOWED;

  const after = extractAnalysisInputs({ ...args, roles: nextRoles });
  const stillKept = new Set((after.groups || []).map(g => g.name));

  const lostName = [...kept].find(n => !stillKept.has(n));
  if (lostName === undefined) return ALLOWED;

  // The group as it would stand after the change. Absent from allGroups when
  // the change takes its last data column, which counts as nought columns.
  const lost = (after.allGroups || []).find(g => g.name === lostName);
  const cols = lost && lost.matrix[0] ? lost.matrix[0].length : 0;
  const rows = lost ? lost.matrix.length : 0;

  const kind = cols < MIN_GROUP_COLUMNS ? 'columns' : 'rows';
  const observed = kind === 'columns' ? cols : rows;
  const minimum = kind === 'columns' ? MIN_GROUP_COLUMNS : MIN_GROUP_ROWS;

  return {
    refused: true, group: lostName, kind, observed, minimum,
    message: compose(lostName, kind, observed, minimum),
  };
}

/* ── Hold-out guard (P177) ──────────────────────────────────────────────
   Two questions about the import view's column roles, and the sentences
   that answer them.

     checkColumnRoleChange — may this column change role?
     checkGroupExclusion   — may this whole group be skipped?

   Why the first exists. A header click takes a column out of the analysis.
   On a sheet whose groups are two columns wide, that leaves one column,
   aggregation.js drops the group, and the tests that compare columns
   within a group quietly start comparing the whole file instead. The
   verdict moves — measured on 02-densitometry-fabricated, severity 1 to 3
   on full collapse and 1 to 0 several clicks earlier — and nothing on the
   page says it happened. The direction is not predictable, so the click is
   refused.

   Why the second exists. Refusing every click that would lose a group also
   made it impossible to drop a whole condition, which is ordinary work.
   Skipping a group deliberately is not the silent event the first guard is
   about, so it is offered as an action. But the analysis needs two groups
   (conditionContext.js), and until now nothing had to check that, because
   no route could lose a group at all. This route can, so it carries the
   check itself.

   Neither function restates a rule. Both run the real import path and
   compare which groups survive, so aggregation.js's drop rule and the
   two-group minimum are both enforced by the code that ships.

   The sentences live here with the predicates. They cannot use the naCause
   codes in constants/naCause.js: those stamp a test result, and both
   refusals happen before any test runs. They are built from the names the
   user can see — the group, the column, the role words on the chips. */

import { extractAnalysisInputs } from './engine.js';
import { MIN_GROUP_ROWS, MIN_GROUP_COLUMNS } from './aggregation.js';
import { ROLES } from '../constants/roles.js';

/** The analysis needs two groups to compare. conditionContext.js decides it;
 *  this is the number we report, never the test itself. */
export const MIN_GROUPS = 2;

/** The fork's button label. Deliberately carries no interpolated string — the
 *  message beside it already names the group. */
export const SKIP_GROUP_LABEL = 'Skip this group';

const ALLOWED = Object.freeze({
  refused: false, group: null, kind: null,
  observed: null, minimum: null, message: null, fork: null,
});

// A group name comes from the user's file. It is never the subject of a verb
// and never sits bare beside a word it could be mistaken for, so it is quoted
// wherever it appears inline. A name like `TL curves (2 h)` or `Data` then
// reads as a name rather than as part of the sentence.
const q = name => `"${name}"`;

const SMALL = ['none', 'one', 'two', 'three', 'four', 'five'];
const count = n => SMALL[n] !== undefined ? SMALL[n] : String(n);

/** What the user sees on the chip for a role. */
const roleWord = r => ROLES[r]?.chipLabel || r;

/** What the user sees at the top of a column, or its position when blank. */
function colName(hdrs, ci) {
  const h = hdrs && hdrs[ci] != null ? String(hdrs[ci]).trim() : '';
  return h || `column ${ci + 1}`;
}

/** "Rep3", "Rep3 or Rep4", "Rep3, Rep4 or Rep5", "Rep3, Rep4 or one of the others". */
function joinNames(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} or ${names[2]}`;
  return `${names[0]}, ${names[1]} or one of the others`;
}

function survivingGroups(args, roles) {
  const { groups } = extractAnalysisInputs({ ...args, roles });
  return (groups || []).map(g => g.name);
}

/** Original column indices belonging to a group and still set to Data. */
function dataColsOf(roles, condPerCol, group) {
  const out = [];
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === 'data' && condPerCol[i] === group) out.push(i);
  }
  return out;
}

/** Original column indices in a group that are NOT set to Data — what the user changed. */
function changedColsOf(roles, condPerCol, group) {
  const out = [];
  for (let i = 0; i < roles.length; i++) {
    if (condPerCol[i] === group && roles[i] !== 'data') out.push(i);
  }
  return out;
}

/**
 * May this whole group be skipped?
 *
 * Refuses when skipping would leave fewer than two groups for the analysis to
 * compare. Pure: no UI dependency, nothing mutated.
 *
 * @returns {{refused:boolean, remaining:string[], minimum:number,
 *            message:string|null, nextRoles:string[]|null}}
 */
export function checkGroupExclusion({
  data, roles, condPerCol, group, zeroAsMissing = false,
  colRelationship, dataColHeaders,
}) {
  const nextRoles = [...roles];
  for (const ci of dataColsOf(roles, condPerCol, group)) nextRoles[ci] = 'ignore';

  const args = { data, condPerCol, zeroAsMissing, colRelationship, dataColHeaders };
  const remaining = survivingGroups(args, nextRoles);

  if (remaining.length >= MIN_GROUPS) {
    return { refused: false, remaining, minimum: MIN_GROUPS, message: null, nextRoles };
  }
  const left = remaining.length === 0
    ? 'no groups would be left'
    : `only ${q(remaining[0])} would be left`;
  return {
    refused: true, remaining, minimum: MIN_GROUPS, nextRoles: null,
    message: `Skipping the whole group is not an option here — the analysis compares ` +
             `at least ${count(MIN_GROUPS)} groups, and ${left}.`,
  };
}

/**
 * May this column change role?
 *
 * Refuses when the change would cost the analysis a whole column group. When
 * skipping that group outright is allowed, the verdict carries a `fork` the
 * caller can offer as an action.
 *
 * @returns {{refused:boolean, group:string|null, kind:('columns'|'rows'|null),
 *            observed:number|null, minimum:number|null, message:string|null,
 *            fork:{group:string, nextRoles:string[], label:string}|null}}
 */
export function checkColumnRoleChange({
  data, roles, nextRoles, condPerCol, hdrs, changedIndex, zeroAsMissing = false,
  colRelationship, dataColHeaders,
}) {
  if (!data || !data.length || !roles || !nextRoles) return ALLOWED;
  if (!condPerCol || !condPerCol.some(c => c)) return ALLOWED;

  const args = { data, condPerCol, zeroAsMissing, colRelationship, dataColHeaders };
  const kept = survivingGroups(args, roles);
  if (kept.length === 0) return ALLOWED;

  const stillKept = new Set(survivingGroups(args, nextRoles));
  const lostName = kept.find(n => !stillKept.has(n));
  if (lostName === undefined) return ALLOWED;

  // The group as it would stand after the change. Absent from allGroups when
  // the change takes its last data column, which counts as nought columns.
  const after = extractAnalysisInputs({ ...args, roles: nextRoles });
  const lost = (after.allGroups || []).find(g => g.name === lostName);
  const cols = lost && lost.matrix[0] ? lost.matrix[0].length : 0;
  const rows = lost ? lost.matrix.length : 0;

  const kind = cols < MIN_GROUP_COLUMNS ? 'columns' : 'rows';
  const observed = kind === 'columns' ? cols : rows;
  const minimum = kind === 'columns' ? MIN_GROUP_COLUMNS : MIN_GROUP_ROWS;

  // Is skipping the whole group available as a way out?
  const exclusion = checkGroupExclusion({ ...args, roles, group: lostName });
  const fork = exclusion.refused ? null : {
    group: lostName,
    nextRoles: exclusion.nextRoles,
    label: SKIP_GROUP_LABEL,
  };

  // ── The sentence ──
  const idx = typeof changedIndex === 'number' ? changedIndex : -1;
  const changed = idx >= 0 ? colName(hdrs, idx) : 'this column';
  const toRole = idx >= 0 && nextRoles[idx] ? roleWord(nextRoles[idx]) : 'something else';

  const need = kind === 'columns'
    ? `Keep at least ${count(MIN_GROUP_COLUMNS)} columns in ${q(lostName)} set to Data.`
    : `Keep at least ${count(MIN_GROUP_ROWS)} rows of data in ${q(lostName)}.`;
  const effect = `Changing ${changed} to ${toRole} would leave ${count(observed)}`;

  const restorable = changedColsOf(roles, condPerCol, lostName).map(ci => colName(hdrs, ci));
  const putBack = restorable.length > 0
    ? `set ${joinNames(restorable)} back to Data`
    : `leave ${changed} as Data`;

  // With the fork, two ways out in one sentence. Without it, the way out first
  // and then why the other one is closed — which is the floor sentence verbatim,
  // so the two routes to that refusal read identically.
  const message = fork
    ? `${need} ${effect}. Skip all of ${q(lostName)}, or ${putBack}.`
    : `${need} ${effect}, so ${putBack}. ${exclusion.message}`;

  return { refused: true, group: lostName, kind, observed, minimum, fork, message };
}

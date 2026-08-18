/* P177 — the hold-out guard, asserted as a predicate.
 *
 * No UI, no probe of its own, and no second copy of the drop rule: every case
 * drives src/analysis/holdoutGuard.js, which drives the real
 * extractAnalysisInputs. Two cases use a shipped fixture. Two build their
 * column shape in the test, because corpus-data/ is not present in a worktree
 * and the shapes they stand for (a two-wide group, and C25 / Fig. 3g's five
 * groups of four) have no fixture. */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';
import { checkColumnRoleChange } from '../src/analysis/holdoutGuard.js';
import { forwardFill, preprocessRaw, detectHeaderRows } from '../src/import/parser.js';
import { inferRoles } from '../src/import/roles.js';

/** Load a fixture the way ImportView does. */
function loadFixture(name) {
  const csv = readFileSync(join(process.cwd(), 'test/fixtures', name), 'utf-8');
  const raw = preprocessRaw(Papa.parse(csv, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const data = raw.slice(headerRows);
  return { data, condPerCol, roles: inferRoles(data, raw[headerRows - 1], condPerCol) };
}

/** A grid of nGroups groups, each width columns wide, over nRows rows. */
function makeShape(nGroups, width, nRows = 12) {
  const condPerCol = [], roles = [];
  for (let g = 0; g < nGroups; g++) {
    for (let c = 0; c < width; c++) { condPerCol.push(`G${g + 1}`); roles.push('data'); }
  }
  const nCols = nGroups * width;
  const data = [];
  for (let r = 0; r < nRows; r++) {
    const row = [];
    // Values vary by row and column so no column is constant or a copy.
    for (let c = 0; c < nCols; c++) row.push(String(10 + r * 3 + c * 7 + ((r * c) % 5)));
    data.push(row);
  }
  return { data, roles, condPerCol };
}

/** Apply one click: take the first still-'data' column of the named group out. */
function clickOnce(roles, condPerCol, groupName) {
  const next = [...roles];
  const i = next.findIndex((r, k) => r === 'data' && condPerCol[k] === groupName);
  expect(i).toBeGreaterThanOrEqual(0);
  next[i] = 'ignore';
  return next;
}

function check(state, groupName) {
  const nextRoles = clickOnce(state.roles, state.condPerCol, groupName);
  const verdict = checkColumnRoleChange({ ...state, nextRoles });
  return { verdict, nextRoles };
}

describe('P177 hold-out guard', () => {
  it('a four-wide group allows the first two clicks and refuses the third', () => {
    const state = loadFixture('01-densitometry-clean.csv');
    const group = state.condPerCol.find(Boolean);
    const width = state.condPerCol.filter((c, i) => c === group && state.roles[i] === 'data').length;
    expect(width).toBe(4);            // guard against the fixture changing shape under us

    let roles = state.roles;
    // click 1 — four columns become three
    let r = check({ ...state, roles }, group);
    expect(r.verdict.refused).toBe(false);
    roles = r.nextRoles;
    // click 2 — three become two
    r = check({ ...state, roles }, group);
    expect(r.verdict.refused).toBe(false);
    roles = r.nextRoles;
    // click 3 — two would become one
    r = check({ ...state, roles }, group);
    expect(r.verdict.refused).toBe(true);
    expect(r.verdict.group).toBe(group);
    expect(r.verdict.kind).toBe('columns');
    expect(r.verdict.observed).toBe(1);
    expect(r.verdict.minimum).toBe(2);
    expect(r.verdict.message).toContain(group);
  });

  it('a two-wide group refuses the first click', () => {
    const state = makeShape(3, 2);
    const { verdict } = check(state, 'G1');
    expect(verdict.refused).toBe(true);
    expect(verdict.group).toBe('G1');
    expect(verdict.kind).toBe('columns');
    expect(verdict.observed).toBe(1);
    expect(verdict.minimum).toBe(2);
  });

  it('the C25 / Fig. 3g shape — five groups of four — allows the first click', () => {
    const state = makeShape(5, 4);
    const { verdict } = check(state, 'G1');
    expect(verdict.refused).toBe(false);
    expect(verdict.message).toBeNull();
  });

  it('a file with no column groups is never refused', () => {
    const state = loadFixture('09-proteomics-clean.csv');
    expect(state.condPerCol === null || !state.condPerCol.some(Boolean)).toBe(true);
    const next = [...state.roles];
    const i = next.findIndex(r => r === 'data');
    next[i] = 'ignore';
    expect(checkColumnRoleChange({ ...state, nextRoles: next }).refused).toBe(false);
  });
});

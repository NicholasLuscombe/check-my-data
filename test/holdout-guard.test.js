/* P177 — the hold-out guard, the exclusion fork, and the summary it needs.
 *
 * No UI, no probe of its own, and no second copy of any rule: every case drives
 * src/analysis/holdoutGuard.js or src/import/summary.js, which drive the real
 * import path. Shipped fixtures where a fixture has the shape; two shapes built
 * in the test, because corpus-data/ is not present in a worktree and neither a
 * two-wide group nor C25 / Fig. 3g's five groups of four has a fixture. */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';
import { checkColumnRoleChange, checkGroupExclusion, MIN_GROUPS } from '../src/analysis/holdoutGuard.js';
import { forwardFill, preprocessRaw, detectHeaderRows } from '../src/import/parser.js';
import { inferRoles } from '../src/import/roles.js';
import { summarize } from '../src/import/summary.js';

/** Load a fixture the way ImportView does. */
function loadFixture(name) {
  const csv = readFileSync(join(process.cwd(), 'test/fixtures', name), 'utf-8');
  const raw = preprocessRaw(Papa.parse(csv, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const data = raw.slice(headerRows);
  const hdrs = raw[headerRows - 1];
  return { data, hdrs, condPerCol, roles: inferRoles(data, hdrs, condPerCol) };
}

/** A grid of nGroups groups, each width columns wide, over nRows rows. */
function makeShape(nGroups, width, nRows = 12) {
  const condPerCol = [], roles = [], hdrs = [];
  for (let g = 0; g < nGroups; g++) {
    for (let c = 0; c < width; c++) {
      condPerCol.push(`G${g + 1}`); roles.push('data'); hdrs.push(`Rep${c + 1}`);
    }
  }
  const nCols = nGroups * width;
  const data = [];
  for (let r = 0; r < nRows; r++) {
    const row = [];
    for (let c = 0; c < nCols; c++) row.push(String(10 + r * 3 + c * 7 + ((r * c) % 5)));
    data.push(row);
  }
  return { data, hdrs, roles, condPerCol };
}

/** Apply one click: cycle the first still-Data column of the named group. */
const ROLE_KEYS = ['data', 'label', 'condition', 'attribute', 'ignore'];
function click(state, groupName) {
  const ci = state.roles.findIndex((r, k) => r === 'data' && state.condPerCol[k] === groupName);
  expect(ci).toBeGreaterThanOrEqual(0);
  const nextRoles = [...state.roles];
  nextRoles[ci] = ROLE_KEYS[(ROLE_KEYS.indexOf(nextRoles[ci]) + 1) % ROLE_KEYS.length];
  return { ci, nextRoles, verdict: checkColumnRoleChange({ ...state, nextRoles, changedIndex: ci }) };
}

/** Set every Data column of a group to ignore, as the fork button does. */
function excludeGroup(state, groupName) {
  const roles = [...state.roles];
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] === 'data' && state.condPerCol[i] === groupName) roles[i] = 'ignore';
  }
  return { ...state, roles };
}

describe('P177 — the column guard', () => {
  it('a four-wide group allows the first two clicks and refuses the third', () => {
    const state = loadFixture('01-densitometry-clean.csv');
    const group = state.condPerCol.find(Boolean);
    const width = state.condPerCol.filter((c, i) => c === group && state.roles[i] === 'data').length;
    expect(width).toBe(4);

    let s = state;
    let r = click(s, group); expect(r.verdict.refused).toBe(false); s = { ...s, roles: r.nextRoles };
    r = click(s, group);     expect(r.verdict.refused).toBe(false); s = { ...s, roles: r.nextRoles };
    r = click(s, group);
    expect(r.verdict.refused).toBe(true);
    expect(r.verdict.group).toBe(group);
    expect(r.verdict.kind).toBe('columns');
    expect(r.verdict.observed).toBe(1);
    expect(r.verdict.minimum).toBe(2);
    // The sentence names the group, the column changed, and both ways out.
    expect(r.verdict.message).toContain(group);
    expect(r.verdict.message).toContain('back to Data');
    expect(r.verdict.fork.label).toBe(`Skip the whole ${group} group`);
  });

  it('a two-wide group refuses the first click', () => {
    const state = makeShape(3, 2);
    const { verdict } = click(state, 'G1');
    expect(verdict.refused).toBe(true);
    expect(verdict.kind).toBe('columns');
    expect(verdict.observed).toBe(1);
  });

  it('the C25 / Fig. 3g shape — five groups of four — allows the first click', () => {
    const { verdict } = click(makeShape(5, 4), 'G1');
    expect(verdict.refused).toBe(false);
    expect(verdict.message).toBeNull();
  });

  it('a file with no column groups is never refused', () => {
    const state = loadFixture('09-proteomics-clean.csv');
    expect(state.condPerCol === null || !state.condPerCol.some(Boolean)).toBe(true);
    const nextRoles = [...state.roles];
    nextRoles[state.roles.indexOf('data')] = 'ignore';
    expect(checkColumnRoleChange({ ...state, nextRoles }).refused).toBe(false);
  });
});

describe('P177 — the exclusion fork and the group floor', () => {
  it('skipping a whole group is allowed while two or more groups survive', () => {
    const state = makeShape(3, 2);
    const r = checkGroupExclusion({ ...state, group: 'G1' });
    expect(r.refused).toBe(false);
    expect(r.remaining).toEqual(['G2', 'G3']);
    expect(r.nextRoles.filter((x, i) => state.condPerCol[i] === 'G1' && x === 'data')).toHaveLength(0);
  });

  it('skipping is refused when it would leave fewer than two groups', () => {
    const state = excludeGroup(makeShape(3, 2), 'G1');   // two groups left
    const r = checkGroupExclusion({ ...state, group: 'G2' });
    expect(r.refused).toBe(true);
    expect(r.remaining).toEqual(['G3']);
    expect(r.minimum).toBe(MIN_GROUPS);
    expect(r.message).toContain('at least two groups');
    expect(r.message).toContain('G3');
    expect(r.nextRoles).toBeNull();
  });

  // The floor reached by exclusion rather than by column width: every group here
  // is four wide, so no click could ever trip the column rule.
  it('the floor is reached by exclusion on a file no click could collapse', () => {
    const wide = makeShape(3, 4);
    expect(click(wide, 'G1').verdict.refused).toBe(false);        // width is not the binding rule
    const after = excludeGroup(wide, 'G1');
    const r = checkGroupExclusion({ ...after, group: 'G2' });
    expect(r.refused).toBe(true);
    expect(r.remaining).toEqual(['G3']);
  });

  it('the column refusal withholds the fork when skipping would break the floor', () => {
    // Two groups of two: the click is refused, and so is the way out.
    const state = makeShape(2, 2);
    const { verdict } = click(state, 'G1');
    expect(verdict.refused).toBe(true);
    expect(verdict.fork).toBeNull();
    expect(verdict.message).toContain('at least two groups');
  });
});

describe('P177 — summarize() counts the analysis, not the file', () => {
  // The mirror. summary.js had two sources for the condition list: the row half
  // read roles already, the column half did not. These two assertions are the
  // same claim on each half, so a pass means the exception is gone rather than
  // that one case now works.
  const ROW_GROUPED = [
    '03-qpcr-clean.csv', '04-qpcr-fabricated.csv', '09-proteomics-clean.csv',
    '10-proteomics-fabricated.csv', '11-rnaseq-multicondition.csv',
    '12a-uniform-mixture-clean.csv', '12b-uniform-mixture-fabricated.csv',
    '15-missing-carlisle.csv', '19-inheritance-fabricated.csv', '20-bimodal-fab.csv',
    '21-localised-ar.csv', '22-covariance-block.csv',
  ];
  const COLUMN_GROUPED = [
    '01-densitometry-clean.csv', '02-densitometry-fabricated.csv',
    '16-densitometry-carlisle-overbalanced.csv', '17-densitometry-carlisle-clean.csv',
  ];

  it('the row half: setting the condition column to Skip empties the condition list', () => {
    expect(ROW_GROUPED).toHaveLength(12);
    for (const name of ROW_GROUPED) {
      const s = loadFixture(name);
      const ci = s.roles.indexOf('condition');
      expect(ci, `${name} has a condition column`).toBeGreaterThanOrEqual(0);
      expect(summarize(s.data, s.roles, s.condPerCol, false).cNames.length).toBeGreaterThan(0);
      const roles = [...s.roles]; roles[ci] = 'ignore';
      expect(summarize(s.data, roles, s.condPerCol, false).cNames, name).toEqual([]);
    }
  });

  it('the column half: excluding a group drops it from the condition list', () => {
    expect(COLUMN_GROUPED).toHaveLength(4);
    for (const name of COLUMN_GROUPED) {
      const s = loadFixture(name);
      const before = summarize(s.data, s.roles, s.condPerCol, false);
      expect(before.cNames.length, name).toBe(3);
      const dropped = before.cNames[0];
      const excluded = excludeGroup(s, dropped);
      const sum = summarize(s.data, excluded.roles, s.condPerCol, false);
      expect(sum.cNames, name).toEqual(before.cNames.filter(c => c !== dropped));
      expect(sum.nC, name).toBe(before.nC - 1);
    }
  });
});

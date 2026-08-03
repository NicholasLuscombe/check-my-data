// probe-s350-ds16-provenance.mjs — S350 Part 7.
//
// DS16 does not regenerate. Neither definition of gen_carlisle_overbalanced
// reproduces the shipped fixture: the live one (generate-test-datasets.py:877)
// builds a different dataset entirely, and the dead first one (:676) builds the
// right shape with different values and a different cell [0][0]. The hash
// comparison is done in Python and is recorded in the audit summary; this probe
// asks the question that survives the loss of byte-exactness.
//
// If the construction cannot be replayed, can the described mechanism still be
// checked against the shipped file? The dead first definition's accept-reject
// loop (:779-805) targets 48 of 60 features with a one-way ANOVA p above 0.95
// across the three conditions, and DS17 is its clean comparator built the same
// way without the cherry-picking. So the signature is a large excess of
// features in the extreme upper tail of the ANOVA p distribution on DS16 and
// none on DS17. That is testable from the shipped bytes alone.
//
// The ANOVA is the one the app already ships — carlisleBalance.js:236-271,
// reproduced here so the probe reports the same quantity the test reads.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY on src/.
//
// Usage:  node test/probes/probe-s350-ds16-provenance.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { regIncBeta } = await import('../../src/stats/primitives.js');

const FIXTURES = 'test/fixtures';
const FILES = [
  ['16-densitometry-carlisle-overbalanced.csv', 'DS16 — the accept-reject positive'],
  ['17-densitometry-carlisle-clean.csv',        'DS17 — its clean comparator'],
];
// The dead first definition's own target: n_target_high = 48 of n_rows = 60,
// accepted at p > 0.95 (generate-test-datasets.py:781, :795-802).
const TARGET_HIGH = 48;
const ACCEPT_P = 0.95;

/** One-way ANOVA F-test p-value — carlisleBalance.js:236-271. */
function anovaP(groups) {
  const k = groups.length;
  const all = groups.flat();
  const N = all.length;
  if (k < 2 || N <= k) return null;
  const gm = all.reduce((a, b) => a + b, 0) / N;
  let ssB = 0, ssW = 0;
  for (const g of groups) {
    const m = g.reduce((a, b) => a + b, 0) / g.length;
    ssB += g.length * (m - gm) ** 2;
    for (const v of g) ssW += (v - m) ** 2;
  }
  const dfB = k - 1, dfW = N - k;
  if (dfW <= 0 || ssW === 0) return null;
  const F = (ssB / dfB) / (ssW / dfW);
  const x = dfB * F / (dfB * F + dfW);
  return 1 - regIncBeta(dfB / 2, dfW / 2, x);
}

console.log('S350 Part 7 — DS16 provenance: the mechanism, when the construction cannot be replayed\n');
console.log(`The dead first definition targets ${TARGET_HIGH} of 60 features accepted at ANOVA p > ${ACCEPT_P}.`);
console.log('Under a genuine null the p-values are uniform, so about 3 of 60 would clear it by chance.\n');

for (const [file, label] of FILES) {
  const text = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(text, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const slices = condCtx.slices();

  const ps = [];
  for (let r = 0; r < matrix.length; r++) {
    const groups = slices.map(s => s.matrix[r].filter(v => v != null && isFinite(v)));
    if (groups.some(g => g.length < 2)) continue;
    const p = anovaP(groups);
    if (p != null && isFinite(p)) ps.push(p);
  }
  ps.sort((a, b) => a - b);

  const above = (t) => ps.filter(p => p > t).length;
  const med = ps.length % 2 ? ps[(ps.length - 1) / 2] : 0.5 * (ps[ps.length / 2 - 1] + ps[ps.length / 2]);

  console.log(`── ${file}  (${label}) ──`);
  console.log(`   ${matrix.length} features x ${slices.length} conditions (${slices.map(s => s.name).join(', ')}), ${matrix[0].length} data columns`);
  console.log(`   ANOVA p across conditions, per feature: n ${ps.length}, min ${ps[0].toFixed(4)}, median ${med.toFixed(4)}, max ${ps[ps.length - 1].toFixed(4)}`);
  console.log(`   above 0.50: ${above(0.50)}   above 0.80: ${above(0.80)}   above 0.90: ${above(0.90)}   above ${ACCEPT_P}: ${above(ACCEPT_P)}   above 0.99: ${above(0.99)}`);
  console.log(`   expected above ${ACCEPT_P} under a uniform null: ${(ps.length * (1 - ACCEPT_P)).toFixed(1)}`);
  const verdict = above(ACCEPT_P) >= TARGET_HIGH * 0.8
    ? `PRESENT at roughly the stated strength (${above(ACCEPT_P)} against a target of ${TARGET_HIGH})`
    : above(ACCEPT_P) > ps.length * (1 - ACCEPT_P) * 3
      ? `PRESENT but weaker than the stated target (${above(ACCEPT_P)} against ${TARGET_HIGH})`
      : `NOT PRESENT at the stated strength (${above(ACCEPT_P)} against ${TARGET_HIGH}, chance ${(ps.length * (1 - ACCEPT_P)).toFixed(1)})`;
  console.log(`   accept-reject signature: ${verdict}\n`);
}

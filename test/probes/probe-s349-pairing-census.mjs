// probe-s349-pairing-census.mjs — S349 Part 3c.
//
// Structural census of the eight clean fixtures: how each one's conditions are
// laid out, and whether an identifier column pairs rows across them. The
// identifier counts are COUNTED FROM THE FIXTURE, not read off the generator —
// the generator says what was intended, the file says what shipped.
//
// The condition structure comes from the engine's own import chain
// (inferRoles -> extractAnalysisInputs -> conditionContext), so "row-grouped
// with N levels" here means what the engine means by it.
//
// READ-ONLY on src/. Imports the import chain; runs no test.
//
// Usage:  node test/probes/probe-s349-pairing-census.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const FILES = [
  '01-densitometry-clean.csv',
  '03-qpcr-clean.csv',
  '05-cellcount-clean.csv',
  '07-elisa-clean.csv',
  '09-proteomics-clean.csv',
  '12a-uniform-mixture-clean.csv',
  '17-densitometry-carlisle-clean.csv',
  'vfs-a-pigeonhole-clear.csv',
];

console.log('S349 Part 3c — pairing census, eight clean fixtures');
console.log('Condition structure from the engine import chain. Identifier counts from the file.\n');

for (const file of FILES) {
  const assay = EXPECTED[file]?.assay ?? '(not in EXPECTED)';
  const text = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(text, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

  const rowGroups = condCtx?.rowGroups ? condCtx.rowGroups() : null;
  const slices = condCtx?.slices ? condCtx.slices() : null;
  const mode = !condCtx || !condCtx.has ? 'none'
    : (rowGroups && rowGroups.length >= 2) ? 'row-grouped' : 'column-grouped';

  console.log(`── ${file}  (${matrix.length} x ${matrix[0]?.length ?? 0} data, ${assay}) ──`);
  console.log(`   header rows ${headerRows}; roles: ${headers.map((h, i) => `${h}:${roles[i]}`).join('  ')}`);
  console.log(`   condition structure: ${mode}, ${condCtx?.count ?? 0} level(s)` +
    (slices ? ` — ${slices.map(s => `${s.name}(${s.matrix.length} rows)`).join(', ')}` : ''));

  // identifier columns = every non-data, non-cond role column
  const condIdx = roles.findIndex(r => r === 'condition');
  const labelIdx = roles.map((r, i) => (r === 'label' ? i : -1)).filter(i => i >= 0);

  if (mode === 'none') {
    console.log(`   identifier pairing: N/A — no conditions, so CCC returns N/A and Stage 1 never runs`);
    console.log(`   label columns present: ${labelIdx.length ? labelIdx.map(i => headers[i]).join(', ') : '(none)'}\n`);
    continue;
  }

  if (mode === 'column-grouped') {
    // Every condition is a COLUMN subset of the same rows, so slice row r is the
    // same subject in every condition. Pairing is structural and total — there is
    // no identifier column to check, the row index IS the pairing key. Confirmed
    // by counting: all slices must have identical row counts.
    const lens = [...new Set(slices.map(s => s.matrix.length))];
    const ok = lens.length === 1 && lens[0] === matrix.length;
    console.log(`   identifier pairing: STRUCTURAL — column-grouped, so matrix row r is the same subject in all ` +
      `${slices.length} conditions. Row counts per slice: ${slices.map(s => s.matrix.length).join('/')} of ${matrix.length} -> ` +
      `${ok ? 'FULLY PAIRED (every subject in every condition, exactly once)' : 'RAGGED — check'}`);
    console.log(`   subject label: ${labelIdx.length ? labelIdx.map(i => headers[i]).join(', ') : '(none — row index only)'}\n`);
    continue;
  }

  const condNames = [...new Set(data.map(r => String(r[condIdx]).trim()))];
  let reported = false;
  for (const li of labelIdx) {
    const per = new Map();
    for (const r of data) {
      const id = String(r[li]).trim(), c = String(r[condIdx]).trim();
      const e = per.get(id) || {};
      e[c] = (e[c] || 0) + 1;
      per.set(id, e);
    }
    const ids = [...per.keys()];
    const exactlyOnceEach = ids.filter(id => condNames.every(c => per.get(id)[c] === 1)).length;
    const perfect = exactlyOnceEach === ids.length && ids.length * condNames.length === data.length;
    console.log(`   identifier "${headers[li]}": ${ids.length} distinct; exactly once in every condition: ${exactlyOnceEach}/${ids.length}` +
      `  -> ${perfect ? 'FULLY PAIRED' : 'NOT fully paired'}`);
    reported = true;
  }
  if (!reported) console.log(`   identifier pairing: no label column — rows cannot be matched across conditions`);
  console.log('');
}

// S360 — prove the joint-null capture hook changes nothing.
//
// The hook in test/probes/s360-joint-null-hook.mjs rewrites three modules as
// they load. Every statement it inserts reads a value the loop has already
// computed and pushes it onto an array; none of them draws from the PRNG or
// branches on a captured value. This probe is the measurement rather than the
// argument: it dumps every test's flag and primaryP on the fixtures the Part 3
// cells sit on, and the caller diffs a hooked run against an unhooked one.
//
// Seed offset 0 — no seed hook is registered.
//
//   node test/probes/probe-s360-hook-inert.mjs > /tmp/plain.txt
//   node --import ./test/probes/s360-joint-null-hook.mjs test/probes/probe-s360-hook-inert.mjs > /tmp/hooked.txt
//   diff /tmp/plain.txt /tmp/hooked.txt      # must be empty

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const FILES = [
  '08-elisa-fabricated.csv',
  '10-proteomics-fabricated.csv',
  '12b-uniform-mixture-fabricated.csv',
  '21-localised-ar.csv',
  '15-missing-carlisle.csv',
  '19-inheritance-fabricated.csv',
];

for (const file of FILES) {
  const expected = EXPECTED[file];
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  let raw = preprocessRaw(Papa.default.parse(csv, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix: m, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(m, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  const results = await runFullAnalysis(m, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
  const { severity } = computeSeverity(results);
  console.log(`${file}  severity ${severity}`);
  for (const r of [...results].sort((a, b) => a.name.localeCompare(b.name))) {
    const p = r.primaryP == null || !Number.isFinite(r.primaryP) ? 'null' : r.primaryP.toPrecision(18);
    console.log(`  ${r.name.padEnd(38)} ${String(r.flag).padEnd(9)} ${p}`);
  }
}

// probe-s343-neighbours.mjs — S343 part 4.
//
// The seed sweep asks "what would this file do under a stream it cannot
// produce". This probe asks the reachable version of the same question: take
// 09-proteomics-clean, change ONE cell by one unit in the last recorded decimal
// place, and re-run. The data is still clean — one 0.01 nudge on one of 2400
// proteomics intensities is inside measurement noise — but the numeric matrix
// is different, so the file derives a different seed and every test draws a
// different stream.
//
// Each perturbed file is a file a user could actually have. The fraction that
// come back non-clean is the rate at which the shipped tool reports minor
// anomalies on clean data of this shape.
//
// READ-ONLY on src/. No seed hook — every run here is a plain unhooked run at
// whatever seed the perturbed matrix derives.
//
// Usage: N=40 node test/probes/probe-s343-neighbours.mjs
//        FILE=12a-uniform-mixture-clean.csv N=20 node test/probes/probe-s343-neighbours.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

const N = Math.max(1, Number(process.env.N) || 40);
const FILE = process.env.FILE || '09-proteomics-clean.csv';

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
const { createPRNG } = await import('../../src/stats/prng.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const assay = EXPECTED[FILE].assay;

function prepFromText(csv) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, vst, dataType, rowSemantics, roles, headerRows };
}

async function run(p) {
  const results = await runFullAnalysis(p.matrix, p.rawMatrix, p.condCtx, assay, null, p.vst, {}, p.dataType, p.rowSemantics);
  return { results, ...computeSeverity(results) };
}

const original = readFileSync(join(FIXTURES, FILE), 'utf-8');
const lines = original.replace(/\n+$/, '').split('\n');

// Locate every (line, field) that holds a value in a data-role column, so the
// perturbation always lands on a number the engine actually hashes and tests.
const basePrep = prepFromText(original);
const dataColIdx = basePrep.roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
const firstDataLine = basePrep.headerRows;

const cells = [];
for (let L = firstDataLine; L < lines.length; L++) {
  const f = lines[L].split(',');
  for (const c of dataColIdx) {
    if (f[c] != null && f[c].trim() !== '' && Number.isFinite(Number(f[c]))) cells.push([L, c, f[c].trim()]);
  }
}

// Nudge by one unit in the value's own last decimal place — the smallest edit
// the file's recorded precision can express.
function nudge(s, up) {
  const dot = s.indexOf('.');
  const dp = dot < 0 ? 0 : s.length - dot - 1;
  const step = Math.pow(10, -dp);
  return (Number(s) + (up ? step : -step)).toFixed(dp);
}

function seedOf(matrix) { return createPRNG(matrix).random(); }

console.log(`S343 — one-cell neighbours of ${FILE}\n`);
console.log(`${cells.length} data cells available; sampling ${N} of them at an even stride.`);
console.log('Each run is unhooked: the perturbed file derives its own seed, exactly as a user\'s upload would.\n');

const baseline = await run(basePrep);
console.log(`baseline severity ${baseline.severity} (HIGH ${baseline.high}, MOD ${baseline.mod})\n`);

// Stride must not be a multiple of the data-column count, or every sample lands
// in the same column. cells[] is row-major, so a stride of cells.length/N (2400/40
// = 60, with 6 data cols) sampled column 2 forty times. +1 makes it cycle.
const stride = Math.max(1, Math.floor(cells.length / N)) + 1;
const bySeverity = { 0: 0, 1: 0, 2: 0, 3: 0 };
const drivers = {};
const flagged = [];
let ran = 0;

for (let k = 0; k < N; k++) {
  const [L, c, val] = cells[(k * stride) % cells.length];
  const up = k % 2 === 0;
  const f = lines[L].split(',');
  const before = f[c];
  f[c] = nudge(val, up);
  const mutated = lines.slice(); mutated[L] = f.join(',');
  const p = prepFromText(mutated.join('\n') + '\n');
  if (seedOf(p.matrix) === seedOf(basePrep.matrix)) { console.log(`  (skip ${L}:${c} — matrix unchanged)`); continue; }
  const { results, severity } = await run(p);
  ran++;
  bySeverity[severity]++;
  const firing = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE');
  for (const r of firing) { const key = `${r.name} [${r.flag}]`; drivers[key] = (drivers[key] || 0) + 1; }
  if (severity > 0) {
    flagged.push(`line ${L + 1} col ${c} ${before}->${f[c]}: sev ${severity} via ${firing.map(r => `${r.name}(${r.flag}, p=${r.primaryP})`).join(' + ')}`);
  }
}

const nonClean = ran - bySeverity[0];
console.log(`\n${ran} neighbours run, each differing from the fixture in exactly one cell.`);
console.log(`non-clean ${nonClean}/${ran} = ${(100 * nonClean / ran).toFixed(1)}%   severity counts 0:${bySeverity[0]} 1:${bySeverity[1]} 2:${bySeverity[2]} 3:${bySeverity[3]}`);
if (nonClean) {
  console.log('\ndrivers:');
  for (const [k, v] of Object.entries(drivers).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
  console.log('\nthe flagging neighbours:');
  for (const f of flagged) console.log('  ' + f);
}

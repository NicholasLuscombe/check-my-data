// probe-s350-disable-scope.mjs — S350 Part 9.
//
// How much of the corpus would a "skip on paired data" rule silence?
//
// Column-grouped data is paired by construction: every condition is a column
// subset of the same rows, so row r is the same subject in every condition and
// no identifier column is needed. A paired-disable rule therefore reaches every
// column-grouped fixture automatically, plus any row-grouped one whose
// identifier pairs its rows. Nobody has counted that.
//
// The pairing rule is the one probe-s349-pairing-census.mjs established and
// probe-s350-classb-bound.mjs ported; it is applied here across every fixture in
// test/batch-fixtures.mjs rather than re-derived.
//
// Whether a test actually RUNS on a fixture is asked of the engine, not
// reconstructed from the dispatch gates, because the gates differ per test
// (Residual Spike Correlation carries a conditions-mode skip and a data-type
// skip; Cross-Condition Consistency carries neither). One full runFullAnalysis
// per fixture, results cached to disk so a re-run is cheap.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY on src/.
//
// Usage:  node test/probes/probe-s350-disable-scope.mjs
// Env: CACHE (path, default test/probes/out-s350-scope/engine-cache.json),
//      REFRESH=1 to ignore the cache.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const CCC = 'Cross-Condition Consistency';
const RSC = 'Residual Spike Correlation';
const CACHE = process.env.CACHE || 'test/probes/out-s350-scope/engine-cache.json';
const REFRESH = process.env.REFRESH === '1';

function prepFromText(csv, assay) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
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
  return { matrix, rawMatrix, condCtx, vst, dataType, rowSemantics, roles, headers, data, assay };
}

// Pairing rule — probe-s350-classb-bound.mjs:129-193, unchanged.
function classify(file) {
  const assay = EXPECTED[file].assay;
  const prep = prepFromText(readFileSync(join(FIXTURES, file), 'utf-8'), assay);
  const { matrix, condCtx, roles, headers, data } = prep;
  const rowGroups = condCtx?.rowGroups ? condCtx.rowGroups() : null;
  const slices = condCtx?.slices ? condCtx.slices() : null;
  const mode = !condCtx || !condCtx.has ? 'none'
    : (rowGroups && rowGroups.length >= 2) ? 'row-grouped' : 'column-grouped';
  const out = { file, assay, mode, prep, severity: EXPECTED[file].severity,
    nConds: condCtx?.count ?? 0, paired: false, pairKey: null, nSubjects: 0 };
  if (mode === 'none' || !slices || slices.length < 2) return out;

  const condIdx = roles.findIndex(r => r === 'condition');
  const labelIdx = roles.map((r, i) => (r === 'label' ? i : -1)).filter(i => i >= 0);
  if (mode === 'column-grouped') {
    const lens = [...new Set(slices.map(s => s.matrix.length))];
    out.paired = lens.length === 1 && lens[0] === matrix.length;
    out.pairKey = 'row index (structural)';
    out.nSubjects = matrix.length;
  } else {
    const condNames = [...new Set(data.map(r => String(r[condIdx]).trim()))];
    for (const li of labelIdx) {
      const per = new Map();
      for (const r of data) {
        const id = String(r[li]).trim(), c = String(r[condIdx]).trim();
        const e = per.get(id) || {}; e[c] = (e[c] || 0) + 1; per.set(id, e);
      }
      const ids = [...per.keys()];
      const exactlyOnce = ids.filter(id => condNames.every(c => per.get(id)[c] === 1)).length;
      if (exactlyOnce === ids.length && ids.length * condNames.length === data.length) {
        out.paired = true; out.pairKey = headers[li]; out.nSubjects = ids.length; break;
      }
    }
  }
  return out;
}

const allFiles = Object.keys(EXPECTED);
const rows = allFiles.map(classify);

// ── engine pass, cached ─────────────────────────────────────────────────
let cache = {};
if (!REFRESH && existsSync(CACHE)) {
  cache = JSON.parse(readFileSync(CACHE, 'utf-8'));
  console.error(`[cache] reusing ${Object.keys(cache).length} engine results from ${CACHE}`);
}
let ran = 0;
for (const r of rows) {
  if (cache[r.file]) continue;
  const p = r.prep;
  const results = await runFullAnalysis(p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
  const pick = (name) => {
    const x = results.find(y => y.name === name);
    return x ? { flag: x.flag, naCause: x.naCause ?? null, primaryP: x.primaryP ?? null } : { flag: 'ABSENT', naCause: null, primaryP: null };
  };
  cache[r.file] = { ccc: pick(CCC), rsc: pick(RSC) };
  ran++;
  console.error(`[engine] ${r.file}`);
}
if (ran) {
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.error(`[cache] wrote ${ran} new result(s) to ${CACHE}`);
}
for (const r of rows) { r.ccc = cache[r.file].ccc; r.rsc = cache[r.file].rsc; }

// ── declared channels ───────────────────────────────────────────────────
for (const r of rows) {
  const f = EXPECTED[r.file].flags || {};
  r.cccDeclared = CCC in f ? f[CCC] : null;
  r.rscDeclared = RSC in f ? f[RSC] : null;
}

const runs = (x) => x.flag !== 'N/A' && x.flag !== 'ABSENT';
const fmt = (n, d) => `${n}/${d}`;

console.log('S350 Part 9 — how much of the corpus would a paired-disable rule silence?\n');
console.log('Pairing rule: probe-s349-pairing-census.mjs, as ported in probe-s350-classb-bound.mjs.');
console.log('Whether a test runs: read from a full runFullAnalysis per fixture, not reconstructed.\n');

console.log('| fixture | sev | routing | paired | CCC | CCC declared | RSC | RSC declared |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.file} | ${r.severity} | ${r.mode}${r.nConds ? ` ×${r.nConds}` : ''} | ${r.paired ? 'yes' : 'no'} |` +
    ` ${r.ccc.flag} | ${r.cccDeclared ? r.cccDeclared.join('/') : '—'} |` +
    ` ${r.rsc.flag} | ${r.rscDeclared ? r.rscDeclared.join('/') : '—'} |`);
}

const N = rows.length;
const colG = rows.filter(r => r.mode === 'column-grouped');
const rowG = rows.filter(r => r.mode === 'row-grouped');
const none = rows.filter(r => r.mode === 'none');
const rowGPaired = rowG.filter(r => r.paired);
const colGPaired = colG.filter(r => r.paired);
const paired = rows.filter(r => r.paired);

console.log(`\n── routing, over all ${N} fixtures ──`);
console.log(`   column-grouped: ${colG.length}   row-grouped: ${rowG.length}   no conditions: ${none.length}`);
console.log(`   of the ${colG.length} column-grouped, paired by construction: ${colGPaired.length}` +
  (colGPaired.length !== colG.length ? `  (${colG.length - colGPaired.length} not — ragged slices)` : ''));
console.log(`   of the ${rowG.length} row-grouped, fully paired by the census rule: ${rowGPaired.length}`);
console.log(`   paired in total: ${paired.length}`);

for (const [label, key, dkey] of [['Cross-Condition Consistency', 'ccc', 'cccDeclared'], ['Residual Spike Correlation', 'rsc', 'rscDeclared']]) {
  const runsOn = rows.filter(r => runs(r[key]));
  const lost = rows.filter(r => r.paired && runs(r[key]));
  const declaredAnywhere = rows.filter(r => r[dkey]);
  const lostDeclared = lost.filter(r => r[dkey]);
  const lostAsserted = lostDeclared.filter(r => r[key].flag === 'MODERATE' || r[key].flag === 'HIGH');
  console.log(`\n── ${label} ──`);
  console.log(`   runs (not N/A) on: ${fmt(runsOn.length, N)} fixtures`);
  console.log(`   would be silenced by a paired-disable rule: ${fmt(lost.length, N)} fixtures` +
    ` — that is ${lost.length} of the ${runsOn.length} it currently runs on`);
  console.log(`      ${lost.map(r => r.file.replace('.csv', '')).join(', ') || '(none)'}`);
  console.log(`   carries a declared channel in batch-fixtures.mjs anywhere: ${declaredAnywhere.length}` +
    ` — ${declaredAnywhere.map(r => r.file.replace('.csv', '')).join(', ') || '(none)'}`);
  console.log(`   of the silenced, carrying a declared channel: ${lostDeclared.length}` +
    ` — ${lostDeclared.map(r => r.file.replace('.csv', '')).join(', ') || '(none)'}`);
  console.log(`   of those, currently firing MODERATE or HIGH, so the batch assertion would break: ${lostAsserted.length}` +
    ` — ${lostAsserted.map(r => `${r.file.replace('.csv', '')} (${r[key].flag})`).join(', ') || '(none)'}`);
  const survivors = runsOn.filter(r => !r.paired);
  console.log(`   left running after the rule: ${survivors.length} — ${survivors.map(r => r.file.replace('.csv', '')).join(', ') || '(none)'}`);
}

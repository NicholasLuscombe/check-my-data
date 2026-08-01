/* S340 steps 1 and 2 — who draws from the stream, and which resample tier each
   fixture actually lands on.

   Step 1 asks whether a test that returns N/A still advances the shared PRNG.
   If it does, a file's p-values depend on which tests happened to apply to it,
   which makes the answer for one file depend on facts about a different file's
   shape. Measured two ways: per-test draw counts recorded in dispatch order,
   and a forced-skip experiment that removes one upstream test and diffs every
   downstream p.

   Step 2 reports maxN per fixture for the three tests that branch on it rather
   than on row count, so the tiers the batch has never exercised can be named.

     node --import ./test/probes/s340-stream-trace-hook.mjs test/probes/probe-s340-stream-audit.mjs

   Reads src/, writes nothing there. */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { resetTrace, takeTrace } = await import('./s340-stream-trace-hook.mjs');
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

function prepare(file, expected) {
  const raw = preprocessRaw(Papa.default.parse(readFileSync(join(FIXTURES, file), 'utf-8'), { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return {
    matrix, rawMatrix, condCtx, assay,
    vst: detectVST(matrix, assay),
    dataType: ASSAY_DATATYPE_MAP[assay] || 'continuous',
    rowSemantics: suggestRowSemantics({ assay, longFormatDetected: !!detectLongFormat(headers, data) }).value || 'ordered',
  };
}

async function runOnce(p, forceSkip = []) {
  resetTrace(forceSkip);
  const results = await runFullAnalysis(p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
  return { results, ...takeTrace() };
}

const prepared = {};
for (const [file, exp] of Object.entries(EXPECTED)) prepared[file] = prepare(file, exp);

// ── Step 1a: per-test draw counts, in dispatch order, across every fixture ──
const perTest = {};   // name → { drawsWhenRan: [], drawsWhenNA: [], naCount, ranCount }
const baseRuns = {};
for (const [file] of Object.entries(EXPECTED)) {
  const r = await runOnce(prepared[file]);
  baseRuns[file] = r;
  for (const t of r.trace) {
    if (!perTest[t.name]) perTest[t.name] = { drawsWhenRan: [], drawsWhenNA: [], naCount: 0, ranCount: 0 };
    const e = perTest[t.name];
    if (t.flag === 'N/A') { e.naCount++; e.drawsWhenNA.push(t.draws); }
    else { e.ranCount++; e.drawsWhenRan.push(t.draws); }
  }
  process.stderr.write(`traced ${file}: ${r.totalDraws.toLocaleString()} draws\n`);
}

const order = baseRuns[Object.keys(EXPECTED)[0]].trace.map(t => t.name);
const sum = a => a.reduce((s, x) => s + x, 0);
const maxOf = a => a.length ? Math.max(...a) : 0;

console.log('S340 STEP 1 — draws consumed per test, dispatch order, across all 27 fixtures');
console.log('"draws" counts every advance of createPRNG\'s state, so randn() and shuffle() are included.\n');
console.log(`${'#'.padStart(3)} ${'test'.padEnd(36)} ${'ran'.padStart(4)} ${'max draws'.padStart(11)} ${'N/A'.padStart(4)} ${'max draws'.padStart(11)}  N/A consumes?`);
const naConsumers = [], neverDraw = [];
order.forEach((name, i) => {
  const e = perTest[name];
  const naMax = maxOf(e.drawsWhenNA);
  const ranMax = maxOf(e.drawsWhenRan);
  const naDraws = sum(e.drawsWhenNA) > 0;
  if (naDraws) naConsumers.push(name);
  if (ranMax === 0 && naMax === 0) neverDraw.push(name);
  console.log(
    `${String(i + 1).padStart(3)} ${name.padEnd(36)} ${String(e.ranCount).padStart(4)} ${ranMax.toLocaleString().padStart(11)} ` +
    `${String(e.naCount).padStart(4)} ${naMax.toLocaleString().padStart(11)}  ${e.naCount === 0 ? '—' : (naDraws ? `YES (max ${naMax})` : 'no')}`
  );
});

console.log(`\nTests that consume while returning N/A: ${naConsumers.length ? naConsumers.join(', ') : 'NONE'}`);
console.log(`Tests that never draw on any fixture:   ${neverDraw.length ? neverDraw.join(', ') : 'NONE'}`);

// ── Step 1b: forced-skip experiment ──
// Remove one upstream test that draws, and diff every downstream p. If the
// engine's answer for the columns a downstream test reads depends on whether an
// unrelated upstream test happened to apply, the coupling is not theoretical.
const EXPERIMENTS = [
  ['02-densitometry-fabricated.csv', "Benford's Law"],
  ['08-elisa-fabricated.csv', "Benford's Law"],
  ['08-elisa-fabricated.csv', 'Inter-Replicate Correlation'],
  ['21-localised-ar.csv', 'Blocked Mahalanobis'],
];
console.log('\n\nS340 STEP 1b — force one upstream test to N/A, then diff every downstream p');
console.log('The skipped test is removed at the dispatch site, exactly as a real applicability skip removes it.\n');
for (const [file, skipName] of EXPERIMENTS) {
  const base = baseRuns[file];
  const alt = await runOnce(prepared[file], [skipName]);
  const skipIdx = order.indexOf(skipName);
  const baseByName = new Map(base.results.map(r => [r.name, r]));
  const moved = [];
  // Position is the index in the results array, which is pushed in dispatch
  // order. Do NOT resolve it by name: several tests carry one name where they
  // are dispatched and another in their result, so a name lookup silently
  // returns -1 and mislabels a downstream test as upstream.
  alt.results.forEach((r, i) => {
    if (i === skipIdx) return;
    const b = base.results[i];
    if (!b || b.name !== r.name) { moved.push({ name: r.name, idx: i, pa: null, pb: null, fa: '?', fb: '?', misaligned: true }); return; }
    const pa = typeof b.primaryP === 'number' ? b.primaryP : null;
    const pb = typeof r.primaryP === 'number' ? r.primaryP : null;
    if (pa === null && pb === null) return;
    if (pa === null || pb === null || pa !== pb) {
      moved.push({ name: r.name, idx: i, pa, pb, fa: b.flag, fb: r.flag });
    }
  });
  const drew = base.trace.find(t => t.name === skipName);
  console.log(`── ${file}, skipping "${skipName}" (dispatch position ${skipIdx + 1}, consumed ${drew ? drew.draws.toLocaleString() : '?'} draws) ──`);
  console.log(`   total draws ${base.totalDraws.toLocaleString()} -> ${alt.totalDraws.toLocaleString()}`);
  console.log(`   downstream p-values that moved: ${moved.length}`);
  for (const m of moved) {
    const where = m.idx > skipIdx ? 'downstream' : 'UPSTREAM (should be impossible)';
    const fl = m.fa !== m.fb ? `   FLAG ${m.fa} -> ${m.fb}` : '';
    console.log(`     ${m.name.padEnd(34)} ${String(m.pa).padEnd(12)} -> ${String(m.pb).padEnd(12)} ${where}${fl}`);
  }
  console.log('');
}

// ── Step 2: which resample tier does each fixture land on? ──
console.log('\nS340 STEP 2 — maxN and the tier each fixture lands on');
console.log('Inter-Replicate Correlation: maxN = largest per-pair valid row count; 999 / 499 / 199 at <=100 / <=1000 / above.');
console.log('Runs Test: maxN = longest difference sequence; same tiers.');
console.log('Cross-Condition Consistency: maxN = largest condition size; 999 / 499 / 199 at <=1000 / <=10000 / above.\n');
const THREE = ['Inter-Replicate Correlation', 'Runs Test', 'Cross-Condition Consistency'];
const tiersSeen = { 'Inter-Replicate Correlation': new Set(), 'Runs Test': new Set(), 'Cross-Condition Consistency': new Set() };
console.log(`${'fixture'.padEnd(42)} ${'rows'.padStart(5)} ${'cols'.padStart(5)}  ` + THREE.map(t => `${t.split(' ')[0].slice(0, 12)} maxN/B`.padEnd(22)).join(''));
for (const [file] of Object.entries(EXPECTED)) {
  const p = prepared[file];
  const m = baseRuns[file].maxN;
  const cells = THREE.map(t => {
    const calls = m[t];
    if (!calls || !calls.length) return 'scan not run'.padEnd(22);
    const maxNs = [...new Set(calls.map(c => c.maxN))];
    const Bs = [...new Set(calls.map(c => c.nPerm))];
    Bs.forEach(b => tiersSeen[t].add(b));
    return `${maxNs.join('/')} → ${Bs.join('/')}`.padEnd(22);
  });
  console.log(`${file.padEnd(42)} ${String(p.matrix.length).padStart(5)} ${String(p.matrix[0].length).padStart(5)}  ${cells.join('')}`);
}
console.log('\nTiers the 27-fixture batch has ever exercised:');
for (const t of THREE) {
  const seen = [...tiersSeen[t]].sort((a, b) => b - a);
  const all = [999, 499, 199];
  const never = all.filter(b => !tiersSeen[t].has(b));
  console.log(`  ${t.padEnd(32)} exercised: ${seen.join(', ') || 'none'}   NEVER RUN: ${never.join(', ') || 'none'}`);
}

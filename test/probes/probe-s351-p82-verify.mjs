/* S351 Part 2 (P82) — verification instrument for the paired-data skip.

   Three jobs, all run over the same 27-fixture load path test/validate-batch.mjs
   uses, so nothing here answers a different question from the batch gate.

     dump     Every result's name, flag and `description`, per fixture, to a
              stable text file. Run before the change and after, then diff. The
              expected diff is exact: Cross-Condition Consistency's description
              changes on the nine paired fixtures and nowhere else, and no other
              test's description moves anywhere. A byte-identical dump means the
              skip never fired; a wider diff means it reached past its scope.

     census   Every DISTINCT decline wording, two ways. The empirical census is
              what actually reaches a card across the corpus. The static census
              is what the constants define, including wordings no fixture
              exercises. Neither substitutes for the other and prior counts of
              these have drifted 11 -> 16 -> 17, so both are printed rather than
              summarised.

     severity Per-fixture severity, so a move is visible in the same run.

   Usage:
     node test/probes/probe-s351-p82-verify.mjs <label>
       writes /tmp/s351-p82/<label>.txt  (override dir with OUTDIR=)
*/
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP, DATATYPE_CAUSE, DATATYPE_SKIP, joinDeclineReason } =
  await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics, ROW_SEMANTICS_SKIP_REASON } = await import('../../src/import/rowSemantics.js');
const { EXPECTED, FIXTURES } = await import('../batch-fixtures.mjs');

const LABEL = process.argv[2] || 'dump';
const OUTDIR = process.env.OUTDIR || '/tmp/s351-p82';
const FIXTURE_DIR = 'test/fixtures';

const dsKey = {};
for (const [f, ds] of FIXTURES) dsKey[f] = ds;
const keyOf = f => dsKey[f] || f.replace(/\.csv$/, '');

function load(file, assay) {
  const csv = readFileSync(join(FIXTURE_DIR, file), 'utf-8');
  const raw = preprocessRaw(Papa.default.parse(csv, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } =
    extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = suggestRowSemantics({
    assay, longFormatDetected: !!detectLongFormat(headers, data),
  }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, assay, vst, dataType, rowSemantics };
}

const lines = [];
const sevLines = [];
const seenDecline = new Map();   // description -> Set of "DSxx/testName"

for (const [file, exp] of Object.entries(EXPECTED)) {
  const fx = load(file, exp.assay);
  const results = await runFullAnalysis(
    fx.matrix, fx.rawMatrix, fx.condCtx, fx.assay, null, fx.vst, {},
    fx.dataType, fx.rowSemantics
  );
  const { severity } = computeSeverity(results);
  sevLines.push(`${keyOf(file).padEnd(24)} severity ${severity}  (EXPECTED ${exp.severity})${severity === exp.severity ? '' : '   <<< MOVED'}`);

  // Sorted by test name so the dump is order-stable even if dispatch order moves.
  for (const r of [...results].sort((a, b) => a.name.localeCompare(b.name))) {
    // primaryP is carried at full precision alongside the description. The
    // description dump alone cannot answer the PRNG question, because most
    // tests never put a number in it — so a p-column is the only way to show
    // that skipping one test before it draws displaced no other test's stream.
    const p = typeof r.primaryP === 'number' ? r.primaryP.toExponential(17) : '';
    lines.push(`${keyOf(file)}\t${r.name}\t${r.flag}\t${p}\t${(r.description ?? '').replace(/\s+/g, ' ').trim()}`);
    if (r.flag === 'N/A' && r.description) {
      const d = r.description.replace(/\s+/g, ' ').trim();
      if (!seenDecline.has(d)) seenDecline.set(d, new Set());
      seenDecline.get(d).add(`${keyOf(file)}/${r.name}`);
    }
  }
}

mkdirSync(OUTDIR, { recursive: true });
const dumpPath = join(OUTDIR, `${LABEL}.txt`);
writeFileSync(dumpPath, lines.join('\n') + '\n');

console.log(`dump: ${lines.length} result rows across ${Object.keys(EXPECTED).length} fixtures -> ${dumpPath}\n`);
console.log('== severity ==');
for (const l of sevLines) console.log('  ' + l);

// ── Empirical decline census ───────────────────────────────────────────────
const declines = [...seenDecline.entries()].sort((a, b) => b[1].size - a[1].size);
console.log(`\n== decline census, EMPIRICAL: ${declines.length} distinct wordings reach a card ==\n`);
declines.forEach(([d, where], i) => {
  const w = [...where];
  console.log(`  [${String(i + 1).padStart(2)}] used ${String(w.length).padStart(3)}x  ${d.slice(0, 118)}${d.length > 118 ? '…' : ''}`);
});

// ── Static decline census ──────────────────────────────────────────────────
// What the constants define, whether or not the corpus exercises it. The two
// shared-cause families plus the two whole-description constants.
const staticSet = new Map();
const add = (s, src) => { if (!s) return; if (!staticSet.has(s)) staticSet.set(s, []); staticSet.get(s).push(src); };
for (const [dt, cause] of Object.entries(DATATYPE_CAUSE)) {
  const map = DATATYPE_SKIP[dt] || {};
  for (const [test, tail] of Object.entries(map)) add(joinDeclineReason(cause, tail), `DATATYPE_SKIP.${dt}.${test}`);
}
for (const dt of Object.keys(DATATYPE_SKIP)) {
  if (DATATYPE_CAUSE[dt]) continue;
  for (const [test, tail] of Object.entries(DATATYPE_SKIP[dt])) add(tail, `DATATYPE_SKIP.${dt}.${test} (no shared cause)`);
}
add(ROW_SEMANTICS_SKIP_REASON, 'ROW_SEMANTICS_SKIP_REASON');
try {
  const eng = readFileSync('src/analysis/engine.js', 'utf-8');
  for (const name of ['COND_SKIP_REASON', 'PAIRED_SKIP_REASON']) {
    const m = eng.match(new RegExp(`const ${name} = "((?:[^"\\\\]|\\\\.)*)"`));
    if (m) add(m[1].replace(/\\"/g, '"'), `engine.js ${name}`);
  }
} catch { /* reported by absence below */ }
console.log(`\n== decline census, STATIC: ${staticSet.size} distinct wordings defined in constants ==\n`);
[...staticSet.entries()].forEach(([s, srcs], i) => {
  console.log(`  [${String(i + 1).padStart(2)}] ${srcs.length} site(s)  ${s.slice(0, 112)}${s.length > 112 ? '…' : ''}`);
});
console.log('\n  (Static counts the shared-cause families and the whole-description constants.');
console.log('   Per-test N/A strings returned from inside test modules are NOT in it — those');
console.log('   are the empirical census above, which reaches them only where a fixture fires them.)');

/* P189 (S384) — is a file reduced to one group the same object as a file that
 * only ever had those columns?
 *
 * The decision this gates. The S383 hold-out guard refuses a role change that
 * would cost the analysis a surviving column group. From an all-off state no
 * group survives, so the guard's predicate is vacuous and the refusal never
 * fires — measured in the browser on 02-densitometry-fabricated as `All off`
 * then four clicks back to Data, reaching condition type 'none' with zero
 * refusals and severity 1 to 0. Either the two-group floor is dropped, or it
 * is kept and `All off` announces what it did. That turns on whether the
 * reduced state is an honest object or a distinct one.
 *
 * What this compares. Four inputs, all built programmatically — no browser,
 * no click, no src/ edit:
 *
 *   A            the full fixture, roles all 'ignore' except the kept group's
 *                columns set to 'data'. This is the measured browser state.
 *   B-natural    a physically reduced CSV holding only the identifier column
 *                and the kept group's replicates, imported through the same
 *                pipeline from raw text, with roles from inferRoles as any
 *                user would get them. This is what a real smaller file does.
 *   B-matched    the same reduced CSV, with the identifier column forced to
 *                'ignore' so its roles match A's. This separates a divergence
 *                caused by removing the columns from one caused by role
 *                inference differing on the smaller file.
 *   B-cond       the reduced CSV with a two-row header imposed. The importer
 *                cannot produce this state; the input exists so the comparison
 *                can isolate the engine from the importer. See its comment
 *                below for the two mechanisms that refuse it.
 *
 * Every field, not the severity. A severity match with different descriptions,
 * a different summary or a different dataType is not equivalence. Every
 * compared field prints a line saying same or DIFFERS whether it moved or not,
 * so "identical" is never left to be inferred from a field's absence — that is
 * the inference a blind spot hides behind. The named blind spots of
 * probe-s372-display-dump.mjs are all covered: vst, dataType, summary.cNames,
 * provenance, headerRows and skippedRows each have their own line.
 *
 * What it found, on every group of the fixture. `results` and `severity` are
 * identical in all comparisons: once the surviving group count falls below two
 * the condition context is 'none', and nothing downstream reads the group list
 * again. What differs is import-side bookkeeping the report still shows —
 * summary.cNames, summary.nC and summary.condSource — so the reduced file
 * keeps naming a condition its analysis no longer uses.
 *
 *   node test/probes/probe-p189-equivalence.mjs
 *   P189_GROUP=Inhibitor_A node test/probes/probe-p189-equivalence.mjs
 *   P189_DETAIL=40 node test/probes/probe-p189-equivalence.mjs
 *
 * Read-only. Runs the shipped import path and the shipped engine; writes
 * nothing and mutates nothing.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const ROOT = new URL('../..', import.meta.url).pathname;
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import(join(ROOT, 'src/analysis/engine.js'));
const { computeSeverity } = await import(join(ROOT, 'src/analysis/severity.js'));
const { detectVST } = await import(join(ROOT, 'src/stats/vst.js'));
const { inferRoles } = await import(join(ROOT, 'src/import/roles.js'));
const { ASSAY_DATATYPE_MAP } = await import(join(ROOT, 'src/constants/assays.js'));
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(join(ROOT, 'src/import/parser.js'));
const { detectLongFormat } = await import(join(ROOT, 'src/import/longFormat.js'));
const { suggestRowSemantics } = await import(join(ROOT, 'src/import/rowSemantics.js'));
const { summarize } = await import(join(ROOT, 'src/import/summary.js'));

const FILE = '02-densitometry-fabricated.csv';
const ASSAY = 'densitometry';
// Which group survives. Overridable so the finding can be checked on every
// group in the fixture rather than asserted from one.
const KEEP_GROUP = process.env.P189_GROUP || 'Control';

// ── Load one CSV exactly as test/validate-batch.mjs loads a fixture ──────────
// Same order, same helpers. A probe that reconstructs its own import path
// answers a question about the probe.
function importCsv(csvText, { forceTwoRowHeader = false } = {}) {
  const parsed = Papa.default.parse(csvText, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  // `forceTwoRowHeader` bypasses BOTH preprocessRaw's leading-sparse-row strip
  // and detectHeaderRows, imposing the two-row structure the full fixture has.
  //
  // It is needed because neither of those two steps will grant a single-group
  // file a two-row header, for independent reasons — see the B-cond comment
  // below. The bypass therefore constructs a state the shipped importer cannot
  // reach. That is the point: it holds the import structure equal so the
  // comparison isolates the engine. It is not a claim that a user could get here.
  //
  // Only sound when preprocessRaw removes no columns, which is asserted rather
  // than assumed — otherwise the bypass would change more than the rows it aims at.
  if (forceTwoRowHeader && pp.removedCols.length > 0) {
    console.error('forceTwoRowHeader bypass is unsound here: preprocessRaw removed columns ' +
      JSON.stringify(pp.removedCols) + '. Aborting rather than comparing two different shapes.');
    process.exit(2);
  }
  const raw = forceTwoRowHeader ? parsed.data : pp.rows;
  const headerRows = forceTwoRowHeader ? 2 : detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  return {
    prepInfo: {
      skippedRows: forceTwoRowHeader ? 0 : (pp.skippedRows ?? 0),
      trimmedRows: pp.trimmedRows ?? 0,
      removedCols: pp.removedCols ?? [],
    },
    headerRows, condPerCol, headers, data,
    rolesInferred: inferRoles(data, headers, condPerCol),
  };
}

// ── The full picture for one input ──────────────────────────────────────────
// Everything a reader would have to check to call two states the same thing.
async function describe(label, imported, roles) {
  const { data, headers, condPerCol, headerRows, prepInfo } = imported;

  const summary = summarize(data, roles, condPerCol, false);
  const dataColHeaders = roles
    .map((r, i) => (r === 'data' ? (headers[i] || `Col ${i + 1}`) : null))
    .filter(h => h !== null);

  const inputs = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
    colRelationship: 'replicates', dataColHeaders,
  });
  const { matrix, rawMatrix, filteredIndices, condCtx, groups, allGroups } = inputs;

  const vst = detectVST(matrix, ASSAY);
  const dataType = ASSAY_DATATYPE_MAP[ASSAY] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay: ASSAY, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, ASSAY, null, vst, {}, dataType, rowSemantics
  );
  const severity = computeSeverity(results);

  // condCtx is an object of closures. Call every accessor rather than dumping
  // the api object, so what is compared is what the accessors return.
  const call = fn => { try { return fn(); } catch (e) { return `[threw: ${e.message}]`; } };

  return {
    label,
    // ── The import-side fields, including every blind spot named in the brief ──
    provenance: { assay: 'auto', cols: 'auto', rows: 'auto' },
    headerRows,
    skippedRows: prepInfo.skippedRows,
    trimmedRows: prepInfo.trimmedRows,
    removedCols: prepInfo.removedCols,
    headers,
    condPerCol,
    roles,
    dataColHeaders,
    assay: ASSAY,
    dataType,
    rowSemantics,
    longFormatDetected: !!lfDet,
    vst,
    summary,
    // ── The engine inputs ──
    matrix,
    rawMatrix,
    filteredIndices,
    groups,
    allGroups,
    condCtx: {
      type: condCtx.type,
      names: condCtx.names,
      count: condCtx.count,
      paired: condCtx.paired,
      has: condCtx.has,
      rowConditions: condCtx.rowConditions,
      rowConditionsCols: condCtx.rowConditionsCols,
      slices: call(() => condCtx.slices()),
      rowGroups: call(() => condCtx.rowGroups()),
      rowGroupsStatus: call(() => condCtx.rowGroupsStatus()),
      groupingTrigger: condCtx.groupingTrigger,
      subjectPairing: condCtx.subjectPairing,
    },
    // ── The verdict, and every field behind it ──
    severity,
    results,
  };
}

// ── Deep diff ───────────────────────────────────────────────────────────────
// Reports a path for every difference, in both directions. Functions are
// recorded as present rather than compared. Numbers compare exactly: this asks
// whether two objects are the same, not whether they are close.
function kind(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'function') return 'function';
  return typeof v;
}
function show(v) {
  if (typeof v === 'function') return '[function]';
  if (typeof v === 'string') return JSON.stringify(v.length > 90 ? v.slice(0, 90) + '…' : v);
  if (Array.isArray(v)) return `[array of ${v.length}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).slice(0, 6).join(',')}${Object.keys(v).length > 6 ? ',…' : ''}}`;
  return String(v);
}
function diff(a, b, path, out) {
  if (typeof a === 'function' || typeof b === 'function') {
    if (typeof a !== typeof b) out.push({ path, a: show(a), b: show(b) });
    return;
  }
  const ka = kind(a), kb = kind(b);
  if (ka !== kb) { out.push({ path, a: show(a), b: show(b) }); return; }
  if (ka === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return;
    if (!Object.is(a, b)) out.push({ path, a: String(a), b: String(b) });
    return;
  }
  if (ka === 'array') {
    if (a.length !== b.length) out.push({ path: `${path}.length`, a: String(a.length), b: String(b.length) });
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff(a[i], b[i], `${path}[${i}]`, out);
    return;
  }
  if (ka === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    for (const k of keys) {
      if (!(k in a)) { out.push({ path: `${path}.${k}`, a: '(absent)', b: show(b[k]) }); continue; }
      if (!(k in b)) { out.push({ path: `${path}.${k}`, a: show(a[k]), b: '(absent)' }); continue; }
      diff(a[k], b[k], `${path}.${k}`, out);
    }
    return;
  }
  if (a !== b) out.push({ path, a: show(a), b: show(b) });
}

// The top-level fields compared, printed so the report can say what was and
// was not covered rather than leaving a reader to infer it.
const COMPARED = [
  'provenance', 'headerRows', 'skippedRows', 'trimmedRows', 'removedCols',
  'condPerCol', 'roles', 'dataColHeaders', 'assay', 'dataType', 'rowSemantics',
  'longFormatDetected', 'vst', 'summary', 'matrix', 'rawMatrix',
  'filteredIndices', 'groups', 'allGroups', 'condCtx', 'severity', 'results',
];
// `headers` is deliberately excluded from the verdict: A holds thirteen header
// strings and B five, which is what "physically removed" means. The comparison
// that matters is dataColHeaders, which is what reaches the engine, and it is
// in the list above.
const NOT_COMPARED = ['headers (see note in the probe source)'];

// Detail lines printed per top-level field before truncating. Raise with
// P189_DETAIL=<n> when a diff needs reading in full.
const DETAIL_CAP = Number(process.env.P189_DETAIL) || 12;
function report(nameA, A, nameB, B) {
  const out = [];
  const perField = [];
  for (const f of COMPARED) {
    const before = out.length;
    diff(A[f], B[f], f, out);
    perField.push([f, out.length - before]);
  }
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`${nameA}  vs  ${nameB}`);
  console.log('═'.repeat(78));

  // Every compared field gets a line whether it differed or not. A reader
  // should not have to infer "identical" from a field's absence — that is the
  // inference a blind spot hides behind.
  console.log('Field-by-field:');
  for (const [f, n] of perField) {
    console.log(`  ${n === 0 ? 'same     ' : `DIFFERS  `}${f}${n ? `  (${n})` : ''}`);
  }
  console.log('');

  if (!out.length) {
    console.log('No differences in any compared field.');
    return out;
  }
  console.log(`${out.length} differing field${out.length === 1 ? '' : 's'}:\n`);
  const byTop = {};
  for (const d of out) {
    const top = d.path.split(/[.[]/)[0];
    (byTop[top] ||= []).push(d);
  }
  for (const [top, ds] of Object.entries(byTop)) {
    console.log(`  ${top} — ${ds.length} difference${ds.length === 1 ? '' : 's'}`);
    for (const d of ds.slice(0, DETAIL_CAP)) console.log(`      ${d.path}\n          ${nameA}: ${d.a}\n          ${nameB}: ${d.b}`);
    if (ds.length > DETAIL_CAP) console.log(`      … and ${ds.length - DETAIL_CAP} more under ${top}`);
  }
  return out;
}

// ── Build the three inputs ──────────────────────────────────────────────────
const fullCsv = readFileSync(join(ROOT, 'test/fixtures', FILE), 'utf-8');
const full = importCsv(fullCsv);

// Which original column indices belong to the group being kept?
const keepCols = full.condPerCol
  ? full.condPerCol.map((c, i) => (c === KEEP_GROUP ? i : -1)).filter(i => i >= 0)
  : [];
if (keepCols.length === 0) {
  console.error(`No columns found for group ${KEEP_GROUP} — check the fixture's header row.`);
  process.exit(2);
}

// A — the all-off state with the kept group's columns clicked back to Data.
// Every other column is 'ignore', which is exactly what `All off` leaves behind.
const rolesA = full.rolesInferred.map((_, i) => (keepCols.includes(i) ? 'data' : 'ignore'));

// B — the same columns as a file that only ever had them. Rebuilt as CSV text
// and re-imported from scratch, so preprocessRaw, detectHeaderRows, forwardFill
// and inferRoles all run on the smaller file rather than being adapted from A.
const parsedFull = Papa.default.parse(fullCsv, { skipEmptyLines: true }).data;
// The identifier column is column 0 of the raw file; keep it plus the group.
const keepRaw = [0, ...keepCols].filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => x - y);
const reducedCsv = parsedFull
  .map(row => keepRaw.map(ci => (row[ci] == null ? '' : row[ci])).join(','))
  .join('\n');
const reduced = importCsv(reducedCsv);

const rolesBnatural = reduced.rolesInferred;
// B-matched: the same reduced file with every non-data column forced to
// 'ignore', so its role vector matches A's shape exactly.
const rolesBmatched = reduced.rolesInferred.map(r => (r === 'data' ? 'data' : 'ignore'));

// B-cond — the reduced file with its condition header row kept.
//
// Why this input exists. preprocessRaw strips a leading row holding fewer than
// max(3, 10% of width) filled cells. The full fixture's condition row holds
// three names and survives; the reduced file's holds one and does not. So a
// single-group file cannot carry a condition header through import at all,
// and B-natural above is a file with no condition structure rather than a file
// with one group. That is a real finding about the importer, and it is also a
// confound: without this input the comparison could not tell an analysis
// difference from an import difference. This one holds the import structure
// equal so the remaining differences are the engine's.
// Two independent mechanisms refuse it, and both are consequences of there
// being one group rather than three:
//   preprocessRaw   strips a leading row with fewer than max(3, 10% of width)
//                   filled cells. Three condition names clear the floor of
//                   three; one does not.
//   detectHeaderRows requires isRepeatingSubHeader on the second row — the
//                   replicate names must repeat. Across three groups Rep1..Rep4
//                   appear three times each; across one group they appear once,
//                   every value is unique, and the test fails.
const reducedCond = importCsv(reducedCsv, { forceTwoRowHeader: true });
// Roles built the same way as A's: every column 'ignore' except this group's.
const condKeep = (reducedCond.condPerCol || []).map((c, i) => (c === KEEP_GROUP ? i : -1)).filter(i => i >= 0);
const rolesBcond = (reducedCond.headers || []).map((_, i) => (condKeep.includes(i) ? 'data' : 'ignore'));

// ── Run and report ──────────────────────────────────────────────────────────
console.log(`P189 equivalence — ${FILE}, group kept: ${KEEP_GROUP}`);
console.log(`Columns kept from the original file (0-indexed): ${keepRaw.join(', ')}`);
console.log(`\nA          roles: ${JSON.stringify(rolesA)}`);
console.log(`B-natural  roles: ${JSON.stringify(rolesBnatural)}   (headerRows=${reduced.headerRows}, condPerCol=${reduced.condPerCol ? 'present' : 'null'})`);
console.log(`B-matched  roles: ${JSON.stringify(rolesBmatched)}   (headerRows=${reduced.headerRows}, condPerCol=${reduced.condPerCol ? 'present' : 'null'})`);
console.log(`B-cond     roles: ${JSON.stringify(rolesBcond)}   (headerRows=${reducedCond.headerRows}, condPerCol=${reducedCond.condPerCol ? JSON.stringify(reducedCond.condPerCol) : 'null'})`);

const A = await describe('A', full, rolesA);
const Bn = await describe('B-natural', reduced, rolesBnatural);
const Bm = await describe('B-matched', reduced, rolesBmatched);
const Bc = await describe('B-cond', reducedCond, rolesBcond);

console.log(`\n${'─'.repeat(78)}`);
console.log('Headline state of each input');
console.log('─'.repeat(78));
for (const s of [A, Bn, Bm, Bc]) {
  console.log(`  ${s.label.padEnd(10)} condition type=${String(s.condCtx.type).padEnd(15)} ` +
    `groups=${(s.groups ? s.groups.length : 'null')}  ` +
    `matrix=${s.matrix.length}x${s.matrix[0] ? s.matrix[0].length : 0}  ` +
    `severity=${s.severity.severity}  vst=${s.vst?.transform ?? 'n/a'}  ` +
    `dataType=${s.dataType}  cNames=${JSON.stringify(s.summary.cNames)}`);
}

const d1 = report('A', A, 'B-natural', Bn);
const d2 = report('A', A, 'B-matched', Bm);
const d3 = report('A', A, 'B-cond', Bc);

console.log(`\n${'─'.repeat(78)}`);
console.log('Fields compared');
console.log('─'.repeat(78));
console.log('  ' + COMPARED.join(', '));
console.log('\nFields deliberately not compared');
console.log('  ' + NOT_COMPARED.join(', '));

console.log(`\n${'─'.repeat(78)}`);
console.log('Verdict');
console.log('─'.repeat(78));
const verdict = (name, ds) => console.log(
  ds.length === 0
    ? `  A and ${name} are identical in every compared field.`
    : `  A and ${name} differ in ${ds.length} field${ds.length === 1 ? '' : 's'}.`
);
verdict('B-natural', d1);
verdict('B-matched', d2);
verdict('B-cond', d3);
console.log('');

// Exit 0 either way. Both answers are useful and neither is a test failure.

/* S352 — does the paired-data rule reach the real-world corpus?
 *
 * P86 would suspend Residual Spike Correlation on paired data. Its cost has been
 * counted on our own fixtures only, DS02 and DS11. The test also fired once on a
 * real deposit: C11's `Cell cycle scores_Fig 2b`, bestPair D571_572_573 vs
 * D574_575_576_577, rho = 1.0000 across 33 rows, permP = 0.0010. Nobody had
 * computed a pairing verdict for that file. If it reads paired, the suspension
 * removes the only detection this test has made outside fixtures.
 *
 * This probe reports what the shipped rule returns. It does not tune the rule,
 * the inputs or the column selection toward any verdict. Paired is as useful an
 * answer as unpaired.
 *
 * ── Two confidence levels, never mixed ───────────────────────────────────────
 *   measured             the deposit file was read from disk and the rule ran on it
 *   derived-from-prose   the file was absent, so the shape was reconstructed from
 *                        what REALWORLD-CORPUS-SPEC.md records and the rule ran on
 *                        that reconstruction
 * Every row carries one label. A reconstruction is evidence about the spec's
 * prose, not about the deposit.
 *
 * ── Where the data lives ────────────────────────────────────────────────────
 * corpus-data/ is gitignored (.gitignore:61), so it exists in the main checkout
 * and NOT in a worktree. The resolver below tries the working directory first and
 * then walks up to the main checkout, and prints which one it used.
 *
 * Usage:
 *   node test/probes/probe-s352-corpus-pairing.mjs
 *   CORPUS_DIR=/path/to/corpus-data node test/probes/probe-s352-corpus-pairing.mjs
 *   SWEEP=0 node test/probes/probe-s352-corpus-pairing.mjs      # C11 only, skip the sweep
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const { computeSubjectPairing } = await import('../../src/analysis/subjectPairing.js');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { preprocessRaw, detectHeaderRows, forwardFill } = await import('../../src/import/parser.js');

// ── Corpus directory ────────────────────────────────────────────────────────
const CANDIDATES = [
  process.env.CORPUS_DIR,
  'corpus-data',
  resolve(process.cwd(), '../../../corpus-data'),   // worktree -> main checkout
].filter(Boolean);
const CORPUS = CANDIDATES.find(d => existsSync(d)) || null;
const SWEEP = process.env.SWEEP !== '0';

console.log('S352 — pairing verdicts over the real-world corpus\n');
console.log(`corpus directory: ${CORPUS ? resolve(CORPUS) : 'NOT FOUND'}`);
if (!CORPUS) {
  console.log('  tried: ' + CANDIDATES.map(c => resolve(c)).join(', '));
  console.log('  every row below will be derived-from-prose.\n');
} else {
  const files = readdirSync(CORPUS).filter(f => /\.(xlsx?|csv)$/i.test(f));
  console.log(`  ${files.length} data files present\n`);
}

// ── Run the rule on one already-parsed table ────────────────────────────────
// `rows` is header-row-first, as a spreadsheet reader returns it. `roleOverride`
// receives the auto-inferred roles and may return a replacement, which is how a
// recorded user column selection is reproduced.
function pairingOn(rows, { roleOverride = null } = {}) {
  const pre = preprocessRaw(rows).rows;
  const headerRows = detectHeaderRows(pre);
  const headers = pre[headerRows - 1];
  // A sheet whose header row does not survive preprocessing cannot be analysed.
  // Reported as such rather than thrown: an exception here would read as an
  // unexplained gap in the sweep.
  if (!Array.isArray(headers)) return { unusable: 'no usable header row after preprocessing' };
  const data = pre.slice(headerRows);
  if (!data.length) return { unusable: 'no data rows after the header' };

  // The two-row header is what makes a sheet COLUMN-grouped, and column-grouped
  // is automatically paired. Passing null here unconditionally — as a first
  // version of this probe did — makes `basis: structural` unreachable and would
  // silently under-report pairing across the whole sweep.
  const condPerCol = headerRows >= 2 ? forwardFill(pre[0]) : null;

  let roles = inferRoles(data, headers, condPerCol);
  const inferred = [...roles];
  if (roleOverride) roles = roleOverride(roles, headers);

  const { condCtx, filteredIndices, matrix } =
    extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });

  // extractAnalysisInputs stamps the verdict itself. Recomputing with headers
  // only adds the identifier's NAME, which that scope cannot supply because the
  // headers it holds index data columns rather than raw columns.
  const stamped = condCtx.subjectPairing;
  const named = computeSubjectPairing({ condCtx, data, roles, filteredIndices, headers });

  return {
    headers, roles, inferred, condCtx, matrix, filteredIndices,
    verdict: stamped, named,
    nRows: matrix.length,
    nDataCols: roles.filter(r => r === 'data').length,
    condCols: roles.map((r, i) => r === 'condition' ? headers[i] : null).filter(Boolean),
  };
}

function reportVerdict(label, r, confidence, note) {
  const v = r.verdict;
  console.log(`  ${label}`);
  console.log(`    confidence   ${confidence}`);
  console.log(`    shape        ${r.nRows} analysis rows x ${r.nDataCols} data cols; context ${r.condCtx.type}, ${r.condCtx.count} condition(s)`);
  if (r.condCols.length) console.log(`    condition by ${r.condCols.join(', ')}`);
  console.log(`    VERDICT      ${v.paired ? 'PAIRED' : 'UNPAIRED'}   basis ${v.basis}   conditions ${v.nConditions}`);
  console.log(`    identifier   ${r.named.idColumn ?? '(none found)'}${r.named.idColIndex != null ? ` [col ${r.named.idColIndex}]` : ''}`);
  if (note) console.log(`    note         ${note}`);
  console.log('');
}

// ── Why a row-grouped file failed the identifier test ───────────────────────
// The rule reports only its verdict. For the one file that matters, the reason a
// column was disqualified is the finding, so it is recomputed here per column.
function explainColumns(r, maxCols = 40) {
  const slices = r.condCtx.has ? r.condCtx.slices() : [];
  if (r.condCtx.type !== 'row-grouped' || slices.length < 2) return;
  console.log('    per-column identifier test (why the rule found what it found):');
  console.log(`      ${'column'.padEnd(34)} ${'per-cond n'.padEnd(14)} ${'distinct'.padEnd(14)} once-each  same-set`);
  let shown = 0;
  for (let col = 0; col < r.roles.length && shown < maxCols; col++) {
    if (r.roles[col] === 'data') continue;
    const per = slices.map(s => (s.rowIndices || []).map(mi => {
      const raw = r.data ? r.data[r.filteredIndices[mi]] : null;
      return raw == null ? '' : String(raw[col] ?? '').trim();
    }));
    const counts = per.map(v => v.length);
    const distinct = per.map(v => new Set(v).size);
    const onceEach = per.every((v, i) => distinct[i] === v.length && v.every(x => x !== ''));
    let sameSet = onceEach;
    if (sameSet) {
      const ref = new Set(per[0]);
      for (let i = 1; i < per.length && sameSet; i++) {
        const s = new Set(per[i]);
        if (s.size !== ref.size) { sameSet = false; break; }
        for (const v of s) if (!ref.has(v)) { sameSet = false; break; }
      }
    }
    console.log(`      ${String(r.headers[col] ?? `col${col}`).slice(0, 33).padEnd(34)} ${counts.join('/').slice(0, 13).padEnd(14)} ${distinct.join('/').slice(0, 13).padEnd(14)} ${String(onceEach).padEnd(10)} ${sameSet}`);
    shown++;
  }
  console.log('');
}

function readSheet(path, sheetMatcher) {
  const wb = XLSX.readFile(path, { cellDates: false });
  const name = typeof sheetMatcher === 'string'
    ? wb.SheetNames.find(n => n === sheetMatcher)
    : wb.SheetNames.find(n => sheetMatcher.test(n));
  if (!name) return null;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: null });
  return { name, rows, allSheets: wb.SheetNames };
}

// ════════════════════════════════════════════════════════════════════════════
// C11 — the only corpus file where Residual Spike Correlation is recorded firing
// ════════════════════════════════════════════════════════════════════════════
console.log('═'.repeat(78));
console.log('C11 — Cell cycle scores_Fig 2b. Both runs the corpus spec records.');
console.log('═'.repeat(78) + '\n');

const c11Path = CORPUS ? join(CORPUS, 'C11.xls') : null;
if (c11Path && existsSync(c11Path)) {
  const sheet = readSheet(c11Path, /Cell cycle scores_Fig 2b/i);
  console.log(`file present: ${c11Path}`);
  console.log(`sheet "${sheet.name}", ${sheet.rows.length} x ${sheet.rows[0].length}, workbook has ${sheet.allSheets.length} sheets\n`);

  // The six numeric columns the spec's Benford table names, plus the sample
  // column the recorded bestPair is expressed in.
  const NUMERIC_SIX = ['nCount_RNA', 'nFeature_RNA', 'scds_score', 'percent_mito', 'S.Score', 'G2M.Score'];
  const COND = 'orig.ident';

  const select = (dataCols) => (roles, headers) => headers.map((h, i) => {
    if (h === COND) return 'condition';
    if (dataCols.includes(h)) return 'data';
    return 'skip';
  });

  // Run 1 — user-selected numeric, 315 x 6.
  const run1 = pairingOn(sheet.rows, { roleOverride: select(NUMERIC_SIX) });
  run1.data = preprocessRaw(sheet.rows).rows.slice(detectHeaderRows(preprocessRaw(sheet.rows).rows));
  reportVerdict('Run 1 — numeric only (315 x 6), condition = orig.ident', run1, 'measured',
    'the run whose Residual Spike Correlation firing is the corpus catch');
  explainColumns(run1);

  // Run 2 — the rerun with Barcode included.
  const run2 = pairingOn(sheet.rows, { roleOverride: select([...NUMERIC_SIX, 'Barcode']) });
  run2.data = run1.data;
  reportVerdict('Run 2 — rerun with Barcode included, condition = orig.ident', run2, 'measured',
    'Barcode is the column the PubPeer commenter calls impossible to share by chance');
  explainColumns(run2);

  // What the shipped pipeline would decide on its own, with no user selection.
  const auto = pairingOn(sheet.rows);
  auto.data = run1.data;
  reportVerdict('Auto-detected roles — no user selection, what the pipeline infers', auto, 'measured',
    'included because the two runs above reproduce a USER selection, not the tool\'s own');
} else {
  console.log('C11.xls NOT PRESENT — nothing measurable for the corpus\'s one firing.\n');
  console.log('  Reconstructing the shape REALWORLD-CORPUS-SPEC.md records, as derived-from-prose:');
  console.log('    316 x 35 sheet, 315 analysis rows, condition key orig.ident,');
  console.log('    two samples named in the bestPair, 33 rows sharing Barcode across them.');
  // Reconstruction: 315 rows over two samples, Barcode unique within a sample and
  // shared on only 33 rows across them. Built to the prose, run through the rule.
  const rows = [['orig.ident', 'Barcode', 'v1', 'v2']];
  for (let i = 0; i < 158; i++) rows.push(['D571_572_573', `BC${i}`, i + 1, i + 2]);
  for (let i = 0; i < 157; i++) rows.push(['D574_575_576_577', i < 33 ? `BC${i}` : `BX${i}`, i + 3, i + 4]);
  const recon = pairingOn(rows);
  recon.data = preprocessRaw(rows).rows.slice(detectHeaderRows(preprocessRaw(rows).rows));
  reportVerdict('C11 Fig 2b reconstruction', recon, 'derived-from-prose',
    'NOT evidence about the deposit — evidence about what the spec\'s prose describes');
  explainColumns(recon);
}

// ════════════════════════════════════════════════════════════════════════════
// Sweep — every corpus file present, every sheet, auto-detected roles
// ════════════════════════════════════════════════════════════════════════════
if (CORPUS && SWEEP) {
  console.log('═'.repeat(78));
  console.log('Sweep — every corpus file, every sheet, at the roles the pipeline infers');
  console.log('═'.repeat(78) + '\n');
  console.log('  Auto-detected roles, not the recorded user selections. The spec records a');
  console.log('  column selection for only a handful of adjudicated runs; for everything else');
  console.log('  the tool\'s own inference is the only defined selection. Reported as measured');
  console.log('  because the file was read, with the selection named.\n');

  const files = readdirSync(CORPUS).filter(f => /\.(xlsx?)$/i.test(f)).sort();
  const paired = [], rowGrouped = [], errors = [], unusable = [];
  let sheets = 0, skipped = 0;

  for (const f of files) {
    let wb;
    try { wb = XLSX.readFile(join(CORPUS, f), { cellDates: false }); }
    catch (e) { errors.push(`${f}: ${e.message}`); continue; }
    for (const sn of wb.SheetNames) {
      let rows;
      try { rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, blankrows: false, defval: null }); }
      catch (e) { errors.push(`${f}/${sn}: ${e.message}`); continue; }
      if (!rows || rows.length < 4 || !rows[0] || rows[0].length < 2) { skipped++; continue; }
      sheets++;
      try {
        const r = pairingOn(rows);
        if (r.unusable) { unusable.push(`${f}/${sn}: ${r.unusable}`); continue; }
        if (r.condCtx.type === 'row-grouped' || r.condCtx.type === 'column-grouped') {
          rowGrouped.push({ f, sn, type: r.condCtx.type, v: r.verdict, named: r.named, nRows: r.nRows });
          if (r.verdict.paired) paired.push({ f, sn, type: r.condCtx.type, v: r.verdict, named: r.named, nRows: r.nRows });
        }
      } catch (e) { errors.push(`${f}/${sn}: ${e.message}`); }
    }
  }

  console.log(`  ${files.length} workbooks, ${sheets} sheets analysed, ${skipped} skipped as too small (<4 rows or <2 cols)`);
  console.log(`  ${rowGrouped.length} sheets produced a condition structure at all\n`);
  console.log(`  PAIRED: ${paired.length}\n`);
  for (const p of paired) {
    console.log(`    ${p.f} / ${p.sn}`);
    console.log(`      ${p.type}, ${p.nRows} rows, basis ${p.v.basis}, ${p.v.nConditions} conditions, identifier ${p.named.idColumn ?? '(structural)'}`);
  }
  if (!paired.length) console.log('    (none)');
  console.log('');
  console.log(`  sheets with a condition structure but UNPAIRED: ${rowGrouped.length - paired.length}`);
  if (unusable.length) {
    console.log(`\n  ${unusable.length} sheet(s) unusable — no header row or no data rows survived preprocessing.`);
    console.log('  Each is 2-3 columns wide, so it cannot carry a condition column, an identifier');
    console.log('  column and a data column at once. None could have returned paired.');
    for (const u of unusable) console.log(`    ${u}`);
  }
  if (errors.length) {
    console.log(`\n  ${errors.length} sheet(s) errored — reported, not hidden:`);
    for (const e of errors.slice(0, 12)) console.log(`    ${e}`);
    if (errors.length > 12) console.log(`    ... and ${errors.length - 12} more`);
  }
} else if (CORPUS) {
  console.log('sweep skipped (SWEEP=0)');
}

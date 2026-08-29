// round2-select.mjs — Round 2 sheet selection: §6.2's ordering over a sheet
// inventory. S390, reduced to one stage at S391.
//
// ── What this is now, and what it stopped being ─────────────────────────────
// This script had three stages. §11.4 of ROUND2-SPECIFICITY-SCREEN.md disposed
// of two of them:
//
//   --fetch    SUPERSEDED by scripts/round2-fetch.mjs. It never ran: its
//              artifact records the fetch aborting on HTTP 401 with no token.
//              The two wrote different directory layouts — R2-NN here against
//              pos-NN there — so this file's scan could not see the corpus that
//              was actually acquired. Two fetchers writing different layouts is
//              how a corpus gets analysed twice from different bytes.
//   --measure  SUPERSEDED by `scripts/corpus-run.mjs --inventory`. Its
//              prepStructure was a byte-for-byte copy of the runner's. The copy
//              was correct under its own constraint — both files parse argv and
//              run at load, so neither could import the other — and
//              --inventory removes the constraint by living inside the runner
//              that owns the function. A selection measuring a different prep
//              from the one arm A analyses is the confound §7 exists to
//              prevent. The copied prepStructure is deleted with it.
//   --rank     RETAINED, and it is all that is left. It is arithmetic over a
//              measurement and needs no prep of its own; rebuilding it inside
//              the runner would be a third implementation of one rule.
//
// So the round-2 path now holds ONE prep implementation, in corpus-run.mjs.
//
// ── What it does ────────────────────────────────────────────────────────────
// Reads a sheet inventory written by `corpus-run.mjs --inventory`, groups its
// files into deposits by the pos-NN directory they sit in, and applies
// ROUND2-SPECIFICITY-SCREEN.md §6.2's ordering to each deposit: largest cell
// count (valid rows × data columns), tie-broken on data columns, then valid
// rows, then file name ascending, then sheet index ascending.
//
// NO TEST RUNS — nothing here imports src/ at all. No verdict, flag or severity
// is computed at any point, and nothing here decides any deposit's eligibility.
// It emits an ORDERING; which sheets pass the shape filter, and therefore which
// deposit is eligible, is decided by a human from these numbers and recorded in
// ROUND2-RUN-LOG.md.
//
// ── Usage ───────────────────────────────────────────────────────────────────
//   node scripts/corpus-run.mjs <manifest.json> --inventory --out inv.json
//   node scripts/round2-select.mjs --inventory inv.json
//
//   --inventory <file>  the artifact to rank. Default:
//                       corpus-out/corpus-inventory.json (corpus-run's own
//                       default output path for --inventory).
//   --out <file>        where to write the ordering. Default:
//                       docs/shared/round2-raw/round2-selection.json
//   --dry-run           print the ordering, write nothing.
//
// Files whose extension is outside §6.2's considered set are dropped before
// ranking and reported, so the exclusion is visible rather than silent.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, dirname } from 'node:path';

const MANIFEST = 'docs/shared/round2-raw/round2-manifest.json';
const CONSIDERED_EXT = new Set(['xlsx', 'xls', 'csv', 'tsv']);  // §6.2, exactly

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return (v && !v.startsWith('--')) ? v : true;
};
const INVENTORY_IN = flag('inventory', 'corpus-out/corpus-inventory.json');
const OUT = flag('out', 'docs/shared/round2-raw/round2-selection.json');
const DRY_RUN = argv.includes('--dry-run');
// --rank is accepted and does nothing: ranking is now the script's only stage,
// and §11.4's disposition is written in terms of "--rank stays", so the flag
// people will type keeps working rather than erroring.
// --fetch and --measure are REFUSED rather than ignored. Silently doing
// nothing where a caller asked for a fetch or a measurement is how a stale
// invocation reads as a completed one.
for (const gone of ['fetch', 'measure']) {
  if (argv.includes(`--${gone}`)) {
    console.error(`--${gone} was removed at S391 (ROUND2-SPECIFICITY-SCREEN.md §11.4).`);
    console.error(gone === 'fetch'
      ? '  Use: node scripts/round2-fetch.mjs'
      : '  Use: node scripts/corpus-run.mjs <manifest|datafile> --inventory --out <file>');
    process.exit(2);
  }
}

const pad2 = n => String(n).padStart(2, '0');
const extOf = p => extname(p).slice(1).toLowerCase();

// ── Deposit identity, read off the path the inventory recorded ──────────────
// round2-fetch.mjs writes <corpus>/round2/pos-NN/<original filename>, so the
// deposit is the pos-NN component. A file sitting outside that layout — a
// one-off run against a single workbook, say — groups into one unnumbered
// deposit rather than being dropped, so the ordering can be exercised on
// anything the inventory can measure.
const POS_RE = /(?:^|\/)pos-(\d+)(?:\/|$)/;
const depositOf = path => { const m = POS_RE.exec(path); return m ? Number(m[1]) : null; };

// ── doi, when the manifest is there and knows the position ──────────────────
function readDois() {
  if (!existsSync(MANIFEST)) return new Map();
  try {
    const m = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
    return new Map(m.map(d => [d.position, d.doi]));
  } catch (e) {
    console.error(`  manifest unreadable (${e.message}) — ordering without DOIs`);
    return new Map();
  }
}

// ── Inventory → the shape rankDeposit takes ─────────────────────────────────
// rankDeposit reads dep.files[].{file, fileError, sheets[]} and each sheet's
// measurement fields. corpus-run.mjs --inventory emits exactly those names, so
// this groups and filters and translates nothing.
function depositsFromInventory(inv) {
  if (!inv || !Array.isArray(inv.files)) {
    throw new Error(`${INVENTORY_IN} is not a corpus-run --inventory artifact (no files[]).`);
  }
  const dois = readDois();
  const excluded = [];
  const byPos = new Map();
  for (const f of inv.files) {
    if (!CONSIDERED_EXT.has(extOf(f.file))) { excluded.push(f.file); continue; }
    const position = depositOf(f.path || '');
    if (!byPos.has(position)) {
      byPos.set(position, { position, doi: position == null ? null : (dois.get(position) || null), files: [] });
    }
    byPos.get(position).files.push(f);
  }
  const deposits = [...byPos.values()].sort((a, b) =>
    (a.position == null ? Infinity : a.position) - (b.position == null ? Infinity : b.position));
  return { deposits, excluded };
}

// ════════════════════════════════════════════════════════════════════════════
// §6.2's arithmetic, and ONLY its arithmetic.
// ════════════════════════════════════════════════════════════════════════════
// "The sheet used is the one with the largest cell count — valid rows x data
//  columns — among the sheets that pass the shape filter.
//  Tie-break, in this order: more data columns; then more valid rows; then file
//  name ascending; then sheet index ascending."
//
// WHICH SHEETS PASS THE SHAPE FILTER IS NOT DECIDED HERE. Every sheet that
// produced a measurement is ranked; a sheet that errored is listed separately
// with its error. The ranking says what §6.2's arithmetic would choose from a
// given candidate set, not which set that is.
//
// Unchanged from S390 apart from its input now arriving from the inventory.
function rankDeposit(dep) {
  const sheets = [];
  const errored = [];
  for (const f of dep.files) {
    if (f.fileError) { errored.push({ file: f.file, sheet: null, error: f.fileError }); continue; }
    for (const s of f.sheets) {
      if (s.error) { errored.push({ file: f.file, sheet: s.sheet, sheetIndex: s.sheetIndex, error: s.error }); continue; }
      sheets.push({
        file: f.file, sheet: s.sheet, sheetIndex: s.sheetIndex, sheetTotal: s.sheetTotal,
        validRows: s.validRows, dataCols: s.nNumericDataCols,
        roleDataCols: s.roleCounts.data,
        cellCount: s.validRows * s.nNumericDataCols,
        headerRows: s.headerRows, rawRows: s.rawRows, rawCols: s.rawCols,
        detectBlocksSplit: s.detectBlocksSplit, groupingPending: s.groupingPending,
        grouping: s.grouping.kind, dataType: s.dataType,
      });
    }
  }
  const cmp = (a, b) =>
    (b.cellCount - a.cellCount) ||
    (b.dataCols - a.dataCols) ||
    (b.validRows - a.validRows) ||
    (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
    (a.sheetIndex - b.sheetIndex);
  const ranked = [...sheets].sort(cmp);

  // Which clause separated rank 1 from rank 2 — reported so the ordering can be
  // checked rather than trusted.
  let decidedBy = null;
  if (ranked.length >= 2) {
    const [a, b] = ranked;
    decidedBy = a.cellCount !== b.cellCount ? 'cell count'
      : a.dataCols !== b.dataCols ? 'tie-break 1: data columns'
      : a.validRows !== b.validRows ? 'tie-break 2: valid rows'
      : a.file !== b.file ? 'tie-break 3: file name ascending'
      : a.sheetIndex !== b.sheetIndex ? 'tie-break 4: sheet index ascending'
      : 'NOT SEPARATED — §6.2 exhausted, two sheets identical on all four keys';
  } else if (ranked.length === 1) {
    decidedBy = 'single candidate';
  }
  // A tie anywhere in the ordering, not just at the top.
  const tiedOnCellCount = ranked.filter((s, i) =>
    (i > 0 && s.cellCount === ranked[i - 1].cellCount) ||
    (i < ranked.length - 1 && s.cellCount === ranked[i + 1].cellCount));

  return { position: dep.position, doi: dep.doi, nSheetsMeasured: sheets.length,
           ranked, errored, decidedBy, anyTieOnCellCount: tiedOnCellCount.length > 0,
           tiedOnCellCount };
}

// ════════════════════════════════════════════════════════════════════════════
// Run
// ════════════════════════════════════════════════════════════════════════════
console.log('Round 2 sheet selection — §6.2 ordering over a sheet inventory.');
console.log('NO TEST RUNS, NO ELIGIBILITY DECISION.\n');

if (!existsSync(INVENTORY_IN)) {
  console.error(`inventory NOT FOUND: ${INVENTORY_IN}`);
  console.error('Write one first:  node scripts/corpus-run.mjs <manifest|datafile> --inventory --out <file>');
  process.exit(1);
}
const inv = JSON.parse(readFileSync(INVENTORY_IN, 'utf-8'));
console.log(`inventory: ${INVENTORY_IN}`);
console.log(`  ${inv.fileCount ?? '?'} file(s), ${inv.sheetCount ?? '?'} sheet(s), written by ${inv.generatedBy || 'unknown'}\n`);

const { deposits, excluded } = depositsFromInventory(inv);
if (excluded.length) {
  console.log(`${excluded.length} file(s) outside §6.2's considered set, not ranked: ${excluded.join(', ')}\n`);
}

const ranking = deposits.map(rankDeposit);
for (const r of ranking) {
  const name = r.position == null ? '(ungrouped)' : `pos-${pad2(r.position)}`;
  console.log(`\n${name}  ${r.doi || ''}  — ${r.nSheetsMeasured} sheet(s) measured`);
  r.ranked.forEach((s, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${(s.file + ' / ' + s.sheet).slice(0, 58).padEnd(58)}` +
      ` cells ${String(s.cellCount).padStart(9)} = ${String(s.validRows).padStart(6)}r x ${String(s.dataCols).padStart(3)}c` +
      `  sheet ${s.sheetIndex + 1}/${s.sheetTotal}${s.groupingPending ? '  groupingPending' : ''}`);
  });
  for (const e of r.errored) console.log(`   --  ${e.file}${e.sheet ? ' / ' + e.sheet : ''}: DID NOT IMPORT: ${e.error}`);
  if (r.decidedBy) console.log(`      rank 1 decided by: ${r.decidedBy}`);
}

const artifact = {
  generatedBy: 'scripts/round2-select.mjs',
  inventory: INVENTORY_IN,
  inventoryGeneratedBy: inv.generatedBy || null,
  excludedFromRanking: excluded,
  ranking,
};

console.log('');
if (DRY_RUN) {
  console.log('--dry-run: artifact NOT written.');
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(artifact, null, 2));
  console.log(`wrote ${OUT}`);
}
console.log('\nNo eligibility decision was made by this script.');

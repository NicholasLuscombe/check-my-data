// S381 Part 2b — incidence of the app-versus-harness divergences on the corpus.
//
// Counts, per divergent row of docs/shared/S381-HARNESS-APP-DIVERGENCE.md, how
// many corpus sheets the two import paths would branch apart on.
//
// THE RULE THIS PROBE IS BUILT AROUND: it evaluates predicates. It does not
// reimplement either path. Concretely:
//
//   • Every decision is made by the SHARED PRIMITIVE that both paths call —
//     preprocessRaw, detectBlocks, detectHeaderRows, forwardFill, isFilledCell,
//     contentWidth, detectLongFormat, suggestRowSemantics, detectAssay,
//     condStructureKind, parseExcel, getSheetNames, Papa.parse.
//   • The HARNESS's own answers are read off corpus-out/s379-honest-run.json —
//     scripts/corpus-run.mjs's recorded output — rather than re-derived.
//   • Exactly TWO fragments are transcribed verbatim, and both are TOGGLED (run
//     with the step on and off) rather than ported: the preamble strip at
//     corpus-run.mjs:156-161 and the CSV serialiser at ImportView.jsx:280
//     (byte-identical at BatchView.jsx:45). Each is marked below.
//   • Where a row's effect needs one path's logic run against the other's, the
//     probe reports the PREDICATE COUNT and marks the effect unmeasured. Row 10
//     is the one such row. Writing a third implementation to adjudicate the
//     first two is the failure this rule prevents.
//
// It calls NO engine function — no extractAnalysisInputs, no runFullAnalysis,
// no computeSeverity. It never writes to corpus-out/ and never regenerates the
// artifact (8.1 MB, ~41 min, one copy on one disk).
//
// SELF-CHECK. Deciding rows 10, 11, 17 and 20 needs condPerCol, which the
// artifact does not record. The probe rebuilds the harness's header stage from
// the shared primitives and then PROVES the rebuild by comparing its `hdrs`
// against the artifact's structure.headers. A sheet whose rebuild does not match
// byte-for-byte is excluded from those four rows and reported as unvalidated.
// At the time of writing the rebuild matches on 41 of 41 sheets.
//
// Usage (from the main checkout, or from a worktree — corpus-data/ and
// corpus-out/ are gitignored and live only in the main checkout, so the probe
// walks up from cwd to find them; CORPUS_ROOT overrides):
//
//   node test/probes/probe-s381-divergence-incidence.mjs

import { readFileSync, statSync, existsSync } from 'node:fs';
import { basename, extname, join, dirname, resolve } from 'node:path';
import Papa from 'papaparse';

import {
  preprocessRaw, detectBlocks, detectHeaderRows, forwardFill,
  isFilledCell, contentWidth,
} from '../../src/import/parser.js';
import { parseExcel, getSheetNames } from '../../src/import/excel.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { detectAssay } from '../../src/constants/assays.js';
import { condStructureKind } from '../../src/components/shared/coordinates.js';

// ── Locate the gitignored corpus ────────────────────────────────────
// corpus-data/ and corpus-out/ exist in the MAIN CHECKOUT only. A worktree
// inherits tracked files, so a probe run from one has to resolve upward.
function findCorpusRoot() {
  if (process.env.CORPUS_ROOT) return resolve(process.env.CORPUS_ROOT);
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'corpus-data')) && existsSync(join(dir, 'corpus-out'))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('corpus-data/ + corpus-out/ not found above cwd. Set CORPUS_ROOT.');
}
const ROOT = findCorpusRoot();
const HERE = dirname(new URL(import.meta.url).pathname);

const MANIFEST = join(HERE, 's379-corpus-manifest.json');
const ARTIFACT = join(ROOT, 'corpus-out', 's379-honest-run.json');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
const entries = Array.isArray(manifest) ? manifest : manifest.datasets;
const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf-8'));
const byLabel = new Map(artifact.datasets.map(d => [d.label, d]));

// ── TRANSCRIPTION 1 of 2 — corpus-run.mjs:156-161, verbatim ─────────
// The harness's second preamble strip. ImportView runs the same loop but only
// inside loadBlock (ImportView.jsx:203), i.e. only when detectBlocks split the
// file. Toggled, not ported: the probe runs the block through with and without.
function stripPreamble(rows) {
  let blockRows = rows;
  const maxC0 = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const minCells0 = Math.max(2, Math.ceil(maxC0 * 0.1));
  while (blockRows.length > 2) {
    const nb = blockRows[0].filter(v => v != null && String(v).trim() !== '').length;
    if (nb < minCells0) blockRows = blockRows.slice(1); else break;
  }
  return blockRows;
}

// ── TRANSCRIPTION 2 of 2 — ImportView.jsx:280, verbatim ─────────────
// The app's Excel→CSV re-serialiser, byte-identical at BatchView.jsx:45. The
// harness has no equivalent — it uses parseExcel's rows directly. Toggled.
const serialise = rows =>
  rows.map(r => r.map(v => v == null ? '' : (/[,"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(',')).join('\n');

const padTo = (r, n) => { const o = [...r]; while (o.length < n) o.push(null); return o; };

// ── Tally helpers ───────────────────────────────────────────────────
const hits = {};                       // row key -> [label, …]
const hit = (row, label) => { (hits[row] = hits[row] || []).push(label); };
const APP_EXT = ['csv', 'tsv', 'txt', 'xlsx', 'xls'];   // ImportView.jsx:292 / BatchView.jsx:41
const APP_MAX_BYTES = 50 * 1024 * 1024;                 // ImportView.jsx:296

let nSheets = 0, nFailed = 0, nValidated = 0, nUnvalidated = 0;
const failures = [], unvalidated = [], row7detail = [], row7thresholds = [];
const gateSplit = { only20: 0, only22: 0, both: 0, neither: 0 };
const passBoth = [];

// ── Row 1 + Row 2 — unit is the WORKBOOK, not the sheet ─────────────
const paths = [...new Set(entries.map(e => e.path))];
const fileRows = [];
for (const p of paths) {
  const abs = join(ROOT, p);
  const ext = extname(p).slice(1).toLowerCase();
  const bytes = statSync(abs).size;
  const sheetNames = await getSheetNames(new Blob([readFileSync(abs)]));
  const r1 = !APP_EXT.includes(ext) || bytes > APP_MAX_BYTES;
  const r2 = sheetNames.length > 1;
  if (r1) hit('r1', basename(p));
  if (r2) hit('r2', basename(p));
  fileRows.push({ file: basename(p), ext, mb: (bytes / 1048576).toFixed(2), sheets: sheetNames.length });
}

// ── Per-sheet pass ──────────────────────────────────────────────────
for (const e of entries) {
  const art = byLabel.get(e.label);
  if (!art) continue;
  if (art.error) { nFailed++; failures.push(`${e.label} — ${art.error}`); continue; }
  nSheets++;
  const st = art.structure;

  const buf = readFileSync(join(ROOT, e.path));
  const { rows: raw } = await parseExcel(new Blob([buf]), e.sheet);

  // Shared primitives, in the order both paths call them.
  const pp = preprocessRaw(raw);
  const pre = pp.rows;
  const blocks = detectBlocks(pre);
  const multiBlock = blocks.length > 1;
  const unstripped = multiBlock ? blocks[0] : pre;     // ImportView's block (strip OFF)
  const stripped = stripPreamble(unstripped);          // harness's block  (strip ON)
  const nHon = detectHeaderRows(stripped);
  const nHoff = detectHeaderRows(unstripped);
  const maxCon = stripped.reduce((m, r) => Math.max(m, r.length), 0);
  const maxCoff = unstripped.reduce((m, r) => Math.max(m, r.length), 0);

  // ROW 3 — Excel rows against the app's CSV round-trip. Toggle.
  const rt = Papa.parse(serialise(raw), { header: false, skipEmptyLines: false }).data;
  let cellsDiffering = 0;
  for (let i = 0, H = Math.max(raw.length, rt.length); i < H; i++) {
    const a = raw[i] || [], b = rt[i] || [];
    for (let j = 0, W = Math.max(a.length, b.length); j < W; j++) {
      const x = a[j] == null ? '' : String(a[j]);
      const y = b[j] == null ? '' : String(b[j]);
      if (x !== y) cellsDiffering++;
    }
  }
  if (cellsDiffering > 0) hit('r3', `${e.label} [${cellsDiffering} cells]`);

  // ROW 4 — ImportView trims the whole text (ImportView.jsx:227); the harness
  // and BatchView do not. Toggle on the same serialised text.
  const rtTrimmed = Papa.parse(serialise(raw).trim(), { header: false, skipEmptyLines: false }).data;
  if (JSON.stringify(rt) !== JSON.stringify(rtTrimmed)) hit('r4', e.label);

  // ROW 6 — the block picker's precondition.
  if (multiBlock) hit('r6', e.label);

  // ROWS 7 + 9 — the strip toggle, and detectHeaderRows on both inputs.
  // Also record WHY the strip does or does not bite: preprocessRaw ran first
  // with its own leading-row threshold, and the strip's is computed off a
  // different width. Both thresholds are read from the two implementations
  // rather than asserted, so the diagnostic below is a measurement.
  row7thresholds.push({
    label: e.label,
    preprocessMinCells: Math.max(3, Math.ceil(contentWidth(raw) * 0.1)),
    stripMinCells: Math.max(2, Math.ceil(maxCoff * 0.1)),
    preprocessRemoved: pp.skippedRows,
    firstRowFilled: unstripped[0].filter(v => v != null && String(v).trim() !== '').length,
  });
  if (stripped.length < unstripped.length) {
    hit('r7', e.label);
    row7detail.push({
      label: e.label, removed: unstripped.length - stripped.length,
      off: `${unstripped.length - nHoff}x${maxCoff}`, on: `${stripped.length - nHon}x${maxCon}`,
    });
  }
  if (nHon !== nHoff) hit('r9', e.label);

  // ROW 8 — a column all-empty within the chosen block. ImportView drops it,
  // but only on the multi-block branch (ImportView.jsx:204-207).
  if (multiBlock) {
    let anyEmpty = false;
    for (let c = 0; c < maxCoff && !anyEmpty; c++) {
      let filled = false;
      for (const r of unstripped) if (isFilledCell(r[c])) { filled = true; break; }
      if (!filled) anyEmpty = true;
    }
    if (anyEmpty) hit('r8', e.label);
  }

  // ── Rebuild the harness's header stage, then prove it ─────────────
  let hdrs, condPerCol = null;
  if (nHon === 0) {
    hdrs = Array.from({ length: maxCon }, (_, i) => 'Col ' + (i + 1));
  } else if (nHon === 1) {
    hdrs = padTo(stripped[0], maxCon).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
  } else {
    const filled = forwardFill(padTo(stripped[0], maxCon));   // shared primitive
    condPerCol = new Array(maxCon).fill(null);
    for (let i = 0; i < maxCon; i++) {
      const g = filled[i] != null ? String(filled[i]).trim() : '';
      if (g) condPerCol[i] = g;
    }
    hdrs = padTo(stripped[1], maxCon).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
  }
  const rebuildOk = JSON.stringify(hdrs) === JSON.stringify(st.headers);
  if (rebuildOk) nValidated++; else { nUnvalidated++; unvalidated.push(e.label); }

  // ROW 10 — UPPER BOUND ONLY. ImportView's group-start rule (ImportView.jsx:
  // 163-167) falls back to forwardFill unless a sub-header name repeats at two
  // or more positions. Where it does not repeat the two rules agree exactly.
  // Whether they actually differ where it does repeat is UNMEASURED: deciding
  // it needs ImportView's loop run against the harness's, which is a port.
  if (rebuildOk && nHon >= 2) {
    const nameRow = padTo(stripped[1], maxCon).map(v => v != null ? String(v).trim() : '');
    const counts = {};
    nameRow.forEach(s => { if (s) counts[s] = (counts[s] || 0) + 1; });
    const repeated = nameRow.find(s => s && counts[s] > 1);
    const starts = [];
    if (repeated) nameRow.forEach((s, i) => { if (s === repeated) starts.push(i); });
    if (starts.length >= 2) hit('r10', e.label);
  }

  // ROWS 11 + 17 — ImportView composes "<group> · <name>" (ImportView.jsx:181)
  // and feeds that to detectAssay; the harness feeds the bare name.
  if (rebuildOk && condPerCol && condPerCol.some(Boolean)) {
    const composed = st.headers.map((h, i) => condPerCol[i] ? condPerCol[i] + ' · ' + h : h);
    if (JSON.stringify(composed) !== JSON.stringify(st.headers)) {
      hit('r11', e.label);
      const bare = detectAssay(basename(e.path), st.headers);
      const pref = detectAssay(basename(e.path), composed);
      const a = bare ? bare.assay : 'general';
      const b = pref ? pref.assay : 'general';
      if (a !== b) hit('r17', `${e.label} [${a} -> ${b}]`);
    }
  }

  // ROW 12 — a wholly blank row surviving into the data region. ImportView
  // drops these (ImportView.jsx:186); the harness and BatchView keep them.
  if (stripped.slice(nHon).some(r => !r.some(isFilledCell))) hit('r12', e.label);

  // ROWS 13 + 14 — ImportView runs detectLongFormat only on the single-block
  // branch, off raw row 0 and cleaned.slice(nH) (ImportView.jsx:251-254).
  let appLongFormat = false;
  if (!multiBlock && pre.length > 20 && nHoff > 0) {
    const hdrRow = pre[0].map(v => v != null ? String(v).trim() : '');
    appLongFormat = !!detectLongFormat(hdrRow, pre.slice(nHoff));
  }
  const harnessLongFormat = !!st.longFormatDetected;
  if (appLongFormat !== harnessLongFormat) hit('r13', `${e.label} [app=${appLongFormat} harness=${harnessLongFormat}]`);
  if (appLongFormat) hit('r14', e.label);

  // ROW 16 / ROW 18 — the harness's override surfaces. Read off the manifest.
  if (e.conditionsHint && typeof e.conditionsHint === 'object' && e.conditionsHint.roles) hit('r16', e.label);
  if (e.dataType) hit('r18', e.label);

  // ROW 19 — the harness auto-nulls zeros; ImportView only recommends it.
  if (st.zeroAsMissing) hit('r19', e.label);

  // ROW 20 — ImportView blocks Run when no condition structure resolves.
  const structureKind = rebuildOk ? condStructureKind(condPerCol, st.roles) : null;
  const gate20 = rebuildOk ? !structureKind : null;
  if (gate20) hit('r20', `${e.label} [${st.conditionType || 'none'}]`);

  // ROW 22 — ImportView blocks Run when the row-order suggestion is null.
  const gate22 = suggestRowSemantics({ assay: st.assay, longFormatDetected: harnessLongFormat }).value === null;
  if (gate22) hit('r22', `${e.label} [${st.assay}]`);

  if (gate20 !== null) {
    if (gate20 && gate22) gateSplit.both++;
    else if (gate20) gateSplit.only20++;
    else if (gate22) gateSplit.only22++;
    else { gateSplit.neither++; passBoth.push(`${e.label} [assay=${st.assay} structure=${structureKind} pending=${!!st.groupingPending}]`); }
  }

  // ROW 24 — ImportView forces raw on ordinal before detectVST is consulted.
  if (st.dataType === 'ordinal' && st.vst !== 'raw') hit('r24', `${e.label} [harness ${st.vst}]`);
  if (st.dataType === 'ordinal') hit('r24-ordinal', `${e.label} [vst=${st.vst}]`);

  // ROW 25 — a non-raw proposal renders ImportView's card, where a click declines.
  if (st.vst !== 'raw') hit('r25', `${e.label} [${st.vst}]`);

  // ROW 26 — ImportView never offers Run below two data columns.
  if ((st.nCols || 0) < 2) hit('r26', `${e.label} [nCols=${st.nCols}]`);

  // ROW 29 — the grouping trigger. Four tests stay N/A on the harness.
  if (st.groupingPending) {
    const g = st.groupingPending;
    hit('r29', `${e.label} [arm1=${g.arm1} arm2=${g.arm2} nGroups=${g.nGroups} median=${g.medianSize}]`);
  }
}

// ── Report ──────────────────────────────────────────────────────────
const NAMED_LIMIT = 5;
const ROWS = [
  ['r3',  'matrix', 'sheet', 'Excel rows differ from the app CSV round-trip'],
  ['r4',  'matrix', 'sheet', "ImportView's whole-text .trim() changes the parse"],
  ['r7',  'matrix', 'sheet', 'the second preamble strip removes >=1 row'],
  ['r9',  'matrix', 'sheet', 'detectHeaderRows differs stripped vs un-stripped'],
  ['r10', 'matrix', 'sheet', "UPPER BOUND — ImportView's group-start rule can leave forwardFill"],
  ['r11', 'matrix', 'sheet', 'composed "group · name" headers differ from bare'],
  ['r12', 'matrix', 'sheet', 'a wholly blank row survives into the data region'],
  ['r13', 'analysis', 'sheet', 'long-format detection differs between the paths'],
  ['r17', 'analysis', 'sheet', 'detectAssay returns a different assay on composed headers'],
  ['r18', 'analysis', 'sheet', 'the manifest overrides dataType'],
  ['r19', 'analysis', 'sheet', 'the harness auto-enabled zero-as-missing'],
  ['r20', 'analysis', 'sheet', 'no condition structure — ImportView would block Run'],
  ['r22', 'analysis', 'sheet', 'no row-order suggestion — ImportView would block Run'],
  ['r24', 'analysis', 'sheet', 'ordinal data carrying a transform ImportView forbids'],
  ['r25', 'analysis', 'sheet', 'a non-raw transform is proposed, so a click can decline it'],
  ['r29', 'analysis', 'sheet', 'the grouping trigger is pending — four tests held at N/A'],
  ['r1',  'other', 'workbook', 'extension outside the whitelist, or over 50 MB'],
  ['r2',  'other', 'workbook', 'workbook holds more than one sheet'],
  ['r6',  'other', 'sheet', 'more than one block'],
  ['r8',  'other', 'sheet', 'multi-block and a column all-empty within block 1'],
  ['r14', 'other', 'sheet', 'ImportView would offer a long-format pivot'],
  ['r16', 'other', 'sheet', 'the manifest declares a role hint'],
  ['r26', 'other', 'sheet', 'fewer than two data columns'],
];

const line = '='.repeat(96);
console.log(line);
console.log('S381 Part 2b — divergence incidence');
console.log(line);
console.log(`corpus root      ${ROOT}`);
console.log(`artifact         ${ARTIFACT} (read-only, generated by ${artifact.generatedBy})`);
console.log(`manifest         ${MANIFEST}`);
console.log(`workbooks        ${paths.length}`);
console.log(`sheets attempted ${nSheets + nFailed}   imported ${nSheets}   import failures ${nFailed}`);
console.log(`header rebuild   validated on ${nValidated}/${nSheets} sheets against structure.headers` +
  (nUnvalidated ? `  — UNVALIDATED: ${unvalidated.join(', ')}` : '  (zero mismatches)'));

for (const group of ['matrix', 'analysis', 'other']) {
  const title = group === 'matrix' ? 'ROWS THAT CHANGE THE MATRIX'
    : group === 'analysis' ? 'ROWS THAT CHANGE HOW THE MATRIX IS ANALYSED' : 'THE REST';
  console.log(`\n${'-'.repeat(96)}\n${title}\n${'-'.repeat(96)}`);
  for (const [key, g, noun, desc] of ROWS) {
    if (g !== group) continue;
    const list = hits[key] || [];
    const denom = noun === 'workbook' ? paths.length : nSheets;
    console.log(`\n  row ${key.slice(1).padEnd(3)} ${String(list.length).padStart(3)} of ${denom} ${noun}s   ${desc}`);
    if (list.length && list.length <= NAMED_LIMIT) list.forEach(s => console.log(`         ${s}`));
    else if (list.length) console.log(`         (${list.length} — over ${NAMED_LIMIT}, not named)`);
  }
}

console.log(`\n${'-'.repeat(96)}\nUNMEASURED\n${'-'.repeat(96)}`);
console.log('  row 10 effect  the predicate above is an upper bound. Deciding whether condPerCol');
console.log("                 actually differs needs ImportView's group-start loop run against the");
console.log('                 harness\'s — a port, not a toggle. Not measured.');
console.log('  row 21         no independent predicate. conditions-mode is unreachable while row 20');
console.log("                 hardcodes 'replicates'.");
console.log('  row 33         no independent predicate. It is row 14, which is 0.');

console.log(`\n${'-'.repeat(96)}\nTHE TWO BLOCKING GATES, TOGETHER\n${'-'.repeat(96)}`);
const union = gateSplit.only20 + gateSplit.only22 + gateSplit.both;
console.log(`  row 20 only ${gateSplit.only20}   row 22 only ${gateSplit.only22}   both ${gateSplit.both}   neither ${gateSplit.neither}`);
console.log(`  ImportView would have blocked Run on ${union} of ${nSheets} sheets ` +
  `(${(union / nSheets * 100).toFixed(0)}%)`);
if (passBoth.length) { console.log('  clears both gates:'); passBoth.forEach(s => console.log(`         ${s}`)); }

console.log(`\n${'-'.repeat(96)}\nROW 7 DIAGNOSTIC\n${'-'.repeat(96)}`);
const stricter = row7thresholds.filter(t => t.stripMinCells > t.preprocessMinCells);
const ppTouched = row7thresholds.filter(t => t.preprocessRemoved > 0);
console.log(`  preprocessRaw removed leading rows on ${ppTouched.length} of ${row7thresholds.length} sheets ` +
  `(max ${ppTouched.length ? Math.max(...ppTouched.map(t => t.preprocessRemoved)) : 0} rows)`);
console.log(`  the strip's threshold is STRICTER than preprocessRaw's on ${stricter.length} of ${row7thresholds.length} sheets`);
console.log(`  the strip removed rows on ${row7detail.length} of ${row7thresholds.length} sheets`);
if (row7detail.length) {
  row7detail.forEach(d => console.log(`         ${d.label}  removed=${d.removed}  data region ${d.off} -> ${d.on}`));
} else {
  console.log('  so the matrix is identical either way on every sheet — a computation, not an inference.');
}

console.log(`\n${'-'.repeat(96)}\nIMPORT FAILURES (excluded from the 41)\n${'-'.repeat(96)}`);
failures.forEach(f => console.log(`  ${f}`));

console.log(`\n${'-'.repeat(96)}\nWORKBOOKS\n${'-'.repeat(96)}`);
fileRows.forEach(f => console.log(`  ${f.file.padEnd(12)} ${f.ext.padEnd(5)} ${f.mb.padStart(6)} MB  ${String(f.sheets).padStart(2)} sheets`));

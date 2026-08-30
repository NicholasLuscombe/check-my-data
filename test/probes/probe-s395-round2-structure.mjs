/* S395 — the structural read of ONE round-2 deposit's §6.2-selected sheet.
   READ-ONLY. No src/ file is modified, no test is run, no gate is answered and
   no role is reassigned (§14.3). Stops at `extractAnalysisInputs`.

   This is the WORKER. `run-s395-round2-structure.mjs` is the parent that spawns
   one of these per deposit with a kill timer. Run alone for one deposit:

     node --import ./test/probes/s395-corpus-run-hook.mjs \
          test/probes/probe-s395-round2-structure.mjs --pos 31 --pretty

   NAMING HAZARD. `s395-corpus-run-hook.mjs` and `probe-s395-role-inversion.mjs`
   are S394's despite the prefix. This file, `probe-s395-pos01-structure.mjs`,
   `probe-s395-pos01-trigger.mjs` and `probe-s395-pos01-gates.test.jsx` are
   S395's. The hook is reused unchanged.

   Instrument. The hook replaces `scripts/corpus-run.mjs`'s CLI tail with an
   export list, so `prepStructure`, `buildAnalysisConfig` and `readRawMatrix`
   are the census path's own source text executed. Everything else is imported
   from `src/` under the specifiers the engine and the view already use. The
   only arithmetic done here is over those functions' outputs.

   Emits one JSON object on stdout. Every failure is a recorded field, never a
   silent absence: `error` on a throw, `disagreements` on a manifest mismatch.
*/
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const POS = Number(argv[argv.indexOf('--pos') + 1]);
const PRETTY = argv.includes('--pretty');
if (!Number.isFinite(POS)) { console.error('usage: --pos <n>'); process.exit(2); }

// corpus-data/ and corpus-out/ are gitignored and live only in the main checkout.
const MAIN = '/Users/hedgehog/Projects/check-my-data';
const ROUND2 = resolve(MAIN, 'corpus-data/round2');

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CR = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
if (typeof CR.prepStructure !== 'function') {
  console.error('hook not loaded — run with --import ./test/probes/s395-corpus-run-hook.mjs');
  process.exit(2);
}
const { extractAnalysisInputs } = await import(resolve(ROOT, 'src/analysis/engine.js'));
const { inferBaseRoles, detectGroupAttributes } = await import(resolve(ROOT, 'src/import/roles.js'));
const { preprocessRaw, detectBlocks, detectHeaderRows, isSparseGroupRow, isRepeatingSubHeader } =
  await import(resolve(ROOT, 'src/import/parser.js'));
const { getSheetNames } = await import(resolve(ROOT, 'src/import/excel.js'));

const t0 = Date.now();
const out = { position: POS, error: null, disagreements: [], timings: {} };
const mark = (k) => { out.timings[k] = Date.now() - t0; };

try {
  // ── 1. resolve from the manifests, never from the run log's prose ──
  const receipt = JSON.parse(readFileSync(resolve(ROUND2, 'round2-files.json'), 'utf-8'));
  const ranking = JSON.parse(readFileSync(
    resolve(MAIN, 'docs/shared/round2-raw/round2-ranking.json'), 'utf-8'));

  // The receipt is PER FILE, not per position: 199 entries over 39 positions,
  // up to 54 files in one deposit. A `.find(r => r.position === POS)` returns
  // the deposit's FIRST file, which is not the one §6.2 chose — that read
  // produced 12 false disagreements before it was caught. Match on the file too.
  const recs = receipt.filter(r => r.position === POS);
  if (!recs.length) throw new Error(`position ${POS} absent from round2-files.json`);
  const rnk = ranking.ranking.find(r => r.position === POS);
  if (!rnk) throw new Error(`position ${POS} absent from round2-ranking.json`);
  const top = rnk.ranked && rnk.ranked[0];
  if (!top) throw new Error(`position ${POS} has no ranked sheet (errored: ${JSON.stringify(rnk.errored || [])})`);

  const rec = recs.find(r => r.file === top.file);
  out.nFilesInDeposit = recs.length;          // §6.2 ranked across this many files
  out.doi = recs[0].doi;
  out.receiptFile = rec ? rec.file : null;
  out.file = top.file;
  out.sheet = top.sheet;
  out.sheetIndex = top.sheetIndex;          // 0-based, as both artefacts store it
  out.sheetTotal = top.sheetTotal;
  out.decidedBy = rnk.decidedBy;
  out.anyTieOnCellCount = rnk.anyTieOnCellCount;
  out.rankedCellCount = top.cellCount;
  out.nSheetsMeasured = rnk.nSheetsMeasured;
  out.erroredSheets = (rnk.errored || []).map(e => ({ sheet: e.sheet, error: e.error }));

  if (!rec) out.disagreements.push(
    `ranking file "${top.file}" is not among the ${recs.length} receipt entries for this position`);
  if (rec && recs.some(r => r.doi !== recs[0].doi)) out.disagreements.push(
    'receipt entries for this position carry more than one DOI');

  const path = resolve(ROUND2, `pos-${String(POS).padStart(2, '0')}`, top.file);
  out.path = path;
  // Integrity: the bytes read here are the bytes the receipt recorded.
  const bytes = readFileSync(path);
  out.sizeBytes = bytes.length;
  out.sha256 = createHash('sha256').update(bytes).digest('hex');
  if (rec && rec.sha256 !== out.sha256) out.disagreements.push(
    `sha256 on disk ${out.sha256.slice(0, 12)}… vs receipt ${String(rec.sha256).slice(0, 12)}…`);
  if (rec && rec.size !== out.sizeBytes) out.disagreements.push(
    `size on disk ${out.sizeBytes} vs receipt ${rec.size}`);

  // The run log §4 row, parsed rather than transcribed, purely to record any
  // disagreement. Nothing downstream reads it.
  // Scoped to §4's own table. An unscoped search over the whole file matches
  // §3's enumeration log first — its rows are `| n | date | ... |` and also open
  // with a bare integer, so the parse silently reads a different table. Caught
  // on pos-01, where it returned file "2026-08-28".
  const log = readFileSync(resolve(MAIN, 'docs/shared/ROUND2-RUN-LOG.md'), 'utf-8').split('\n');
  const s4 = log.findIndex(l => /^## 4 — /.test(l));
  const s5 = log.findIndex((l, i) => i > s4 && /^## 5 — /.test(l));
  if (s4 < 0 || s5 < 0) throw new Error('could not locate §4 in ROUND2-RUN-LOG.md');
  const row = log.slice(s4, s5).find(l => new RegExp(`^\\|\\s*${POS}\\s*\\|`).test(l));
  if (!row) out.disagreements.push('no run log §4 row for this position');
  else {
    const f = row.split('|').map(x => x.trim());
    out.logRow = { file: f[3], sheet: f[4], indexTotal: f[5] };
    if (f[3] !== top.file) out.disagreements.push(`run log file "${f[3]}" vs ranking "${top.file}"`);
    if (f[4] !== top.sheet) out.disagreements.push(`run log sheet "${f[4]}" vs ranking "${top.sheet}"`);
    const want = `${top.sheetIndex + 1} / ${top.sheetTotal}`;   // §4's column is 1-based
    if (f[5] !== want) out.disagreements.push(`run log index "${f[5]}" vs ranking 1-based "${want}"`);
  }
  mark('resolve');

  // ── 2. SheetNames, live. §7 wants the discarded alternative named. ──
  const ext = extname(path).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    out.sheetNames = await getSheetNames(new Blob([readFileSync(path)]));
  } else {
    out.sheetNames = [basename(path)];   // corpus-run.mjs:494's pseudo-sheet
  }
  out.sheetNames0 = out.sheetNames[0] ?? null;
  if (out.sheetNames.length !== out.sheetTotal) out.disagreements.push(
    `live sheet count ${out.sheetNames.length} vs ranking sheetTotal ${out.sheetTotal}`);
  if (out.sheetNames[out.sheetIndex] !== out.sheet) out.disagreements.push(
    `sheetNames[${out.sheetIndex}] is "${out.sheetNames[out.sheetIndex]}" not "${out.sheet}"`);
  mark('sheetNames');

  // ── 3. the raw grid, through the census path's own reader ──
  const { raw, sheetUsed } = await CR.readRawMatrix({ path, sheet: out.sheet });
  if (sheetUsed != null && sheetUsed !== out.sheet) out.disagreements.push(
    `parseExcel returned sheet "${sheetUsed}" not "${out.sheet}"`);
  out.rawRows = raw.length;
  out.rawCols = raw.reduce((m, r) => Math.max(m, r.length), 0);
  mark('read');

  // ── 4. the two strips, derived from the shipped functions' own outputs ──
  // preprocessRaw strips sparse rows from the TOP and BOTTOM only and may drop
  // near-empty COLUMNS; it publishes all three counts itself. prepStructure
  // then strips further preamble rows inline (:171-174) and publishes nothing,
  // so that one is derived as blockRows-before minus (nH + data rows).
  const prep = preprocessRaw(raw);
  out.preprocess = { skippedRows: prep.skippedRows, trimmedRows: prep.trimmedRows,
                     removedCols: prep.removedCols, rowsAfter: prep.rows.length };
  const blocks = detectBlocks(prep.rows);
  const blockRows0 = blocks.length > 1 ? blocks[0] : prep.rows;
  out.nBlocksDerived = blocks.length;
  mark('preprocess');

  // ── 5. prepStructure — the census path's own prep ──
  const s = CR.prepStructure(raw, undefined);
  out.headerRows = s.nH;                 // detectHeaderRows' return, on blockRows
  out.nBlocks = s.nBlocks;
  out.dataRows = s.data.length;
  out.nHdrs = s.hdrs.length;
  out.condPerCol = s.condPerCol;
  out.longFormatDetected = s.longFormatDetected;
  out.prepStructurePreambleStrip = blockRows0.length - (s.nH + s.data.length);
  mark('prep');

  // ── 6. WHY detectHeaderRows returned what it did ──
  // The two-row branch (parser.js:22) is a three-way conjunction. Reporting
  // which conjunct failed is the difference between "a band row was lost" and
  // "there was no band row", and §16 turns on exactly that.
  const hd = { returned: s.nH, tooShort: blockRows0.length < 3 };
  if (!hd.tooShort) {
    const r0 = blockRows0[0], r1 = blockRows0[1], r2 = blockRows0[2];
    hd.isSparseGroupRow_row0 = isSparseGroupRow(r0);
    hd.isRepeatingSubHeader_row1 = isRepeatingSubHeader(r1);
    hd.numericFraction_row2 = r2.filter(v => v != null && v !== '' && !isNaN(Number(v))).length /
                              Math.max(r2.length, 1);
    hd.twoRowBranchTaken = hd.isSparseGroupRow_row0 && hd.isRepeatingSubHeader_row1 &&
                           hd.numericFraction_row2 > 0.5;
    hd.failedConjuncts = [
      !hd.isSparseGroupRow_row0 ? 'row0 is not a sparse group row' : null,
      !hd.isRepeatingSubHeader_row1 ? 'row1 is not a repeating sub-header' : null,
      !(hd.numericFraction_row2 > 0.5) ? `row2 numeric fraction ${hd.numericFraction_row2.toFixed(3)} <= 0.5` : null,
    ].filter(Boolean);
    // parser.js:23 is `return nf0<0.5?1:1` — both branches are 1, so the
    // fallthrough is unconditional and nf0 is computed and discarded. Recorded
    // because it means "returned 1" carries no information about nf0.
    hd.fallthroughIsUnconditional = true;
  }
  out.headerDetection = hd;
  // Also: the raw row that BECAME the header, verbatim, so a band row is visible
  // in the record rather than only inferable from the Col N count.
  out.headerRowVerbatim = s.nH > 0 ? blockRows0[s.nH - 1].map(v => v == null ? null : String(v)) : null;
  mark('headerDetect');

  // ── 7. synthesised headers and the band map ──
  const SYNTH = /^Col \d+$/;
  const synthIdx = [], realIdx = [];
  s.hdrs.forEach((h, c) => (SYNTH.test(String(h)) ? synthIdx : realIdx).push(c));
  out.synthesisedHeaders = { count: synthIdx.length, of: s.hdrs.length, columns: synthIdx };
  // A band is a real header cell plus every synthesised column to its right.
  // Reported even when every band is width 1 (i.e. no spanning label exists) so
  // the absence is stated rather than left blank.
  const bands = realIdx.map((from, i) => {
    const to = (i + 1 < realIdx.length ? realIdx[i + 1] : s.hdrs.length) - 1;
    return { from, to, width: to - from + 1, label: String(s.hdrs[from]) };
  });
  // A synthesised header with NO real header to its left cannot be a
  // continuation cell of a spanning label — there is nothing to continue. Those
  // columns belong to no band, and saying so keeps the synthesised-header count
  // from reading as evidence of a band everywhere it appears. pos-45 is the
  // case: one synthesised header, at column 0, and no band at all.
  out.leadingOrphanColumns = realIdx.length ? [...Array(realIdx[0]).keys()] : [...Array(s.hdrs.length).keys()];
  out.bands = bands;
  out.spanningBands = bands.filter(b => b.width > 1);
  out.hasSpanningHeader = out.spanningBands.length > 0;
  out.bandWidthsEqual = out.spanningBands.length > 1 &&
    new Set(out.spanningBands.map(b => b.width)).size === 1;
  mark('bands');

  // ── 8. roles, and §2.8 ──
  const baseRoles = inferBaseRoles(s.data, s.hdrs, s.condPerCol);
  const g28 = detectGroupAttributes(s.data, baseRoles);
  const MIN_ROWS_FOR_GROUPING = 50;   // roles.js:8, module-private; restated to report the gap
  const movedBy = new Map();
  for (const g of g28.groupings) for (const a of g.attrCols) movedBy.set(a, g);
  out.groupAttributes = {
    reachedThePass: s.data.length >= MIN_ROWS_FOR_GROUPING && baseRoles.length >= 2,
    rowsHandedToPass: s.data.length,
    rowFloor: MIN_ROWS_FOR_GROUPING,
    groupings: g28.groupings.map(g => ({ groupCol: g.groupCol, groupHeader: String(s.hdrs[g.groupCol]),
                                         nLevels: g.nLevels, attrCols: g.attrCols })),
    columnsMoved: [...movedBy.keys()].sort((a, b) => a - b),
    baseVsShippedDiffer: baseRoles.reduce((n, r, c) => n + (r !== s.roles[c] ? 1 : 0), 0),
    identityWithBaseRoles: g28.roles === baseRoles,
  };
  const roleCounts = { condition: 0, label: 0, data: 0, attribute: 0, ignore: 0 };
  for (const r of s.roles) roleCounts[r] = (roleCounts[r] || 0) + 1;
  out.roleCounts = roleCounts;
  mark('roles');

  // ── 9. the analysis config and the two gate objects ──
  const cfg = CR.buildAnalysisConfig({ entry: { path }, hdrs: s.hdrs, data: s.data,
    condPerCol: s.condPerCol, roles: s.roles, longFormatDetected: s.longFormatDetected });
  out.assay = cfg.assay; out.assaySource = cfg.assaySource;
  out.dataType = cfg.dataType; out.dataTypeSource = cfg.dataTypeSource;
  out.zeroAsMissing = cfg.zeroAsMissing;
  out.colRelationshipAnswer = cfg.config.colRelationship;   // corpus-run.mjs:247, hardcoded
  out.rsSuggestion = cfg.rsSuggestion;                      // value / auto / reason
  out.rowSemanticsHeadlessFallback = cfg.rowSemantics;      // :246's `value || 'ordered'`
  mark('config');

  const { matrix, condCtx } = extractAnalysisInputs(cfg.config);
  out.validRows = matrix.length;
  out.nNumericDataCols = matrix[0]?.length ?? 0;
  out.cellCount = out.validRows * out.nNumericDataCols;
  out.condCtxType = condCtx.type;
  out.groupingTrigger = condCtx.groupingTrigger;            // engine.js:174-178's stamp
  const st = typeof condCtx.rowGroupsStatus === 'function' ? condCtx.rowGroupsStatus() : null;
  const sl = typeof condCtx.slices === 'function' ? condCtx.slices() : null;
  out.rowGroups = st ? { attempted: st.attempted, usable: st.usable, nGroups: st.sizes.length,
                         medianSize: st.medianSize,
                         singletons: st.sizes.filter(n => n === 1).length,
                         survivingSlices: sl ? sl.length : null } : null;
  mark('extract');

  // ── 10. per-column, over `data` (the post-header rows) ──
  // The shipped predicates verbatim: missing is `v == null || v === ''`
  // (inferBaseRoles:35), numeric is `!isNaN(Number(v))` (:37). So `NA` is
  // non-numeric, not missing.
  const WINDOW = 40;
  out.columns = s.hdrs.map((h, c) => {
    let missing = 0, numeric = 0, nonNumeric = 0;
    const seen = new Set(), tok = new Set();
    for (const row of s.data) {
      const v = row[c];
      if (v == null || v === '') { missing++; continue; }
      seen.add(String(v));
      if (!isNaN(Number(v))) numeric++;
      else { nonNumeric++; if (tok.size < 6) tok.add(String(v)); }
    }
    const sample = s.data.slice(0, WINDOW).map(r => r[c]).filter(v => v != null && v !== '');
    const uniqW = new Set(sample.map(String)).size;
    const mv = movedBy.get(c);
    return {
      i: c, header: String(h), synthesised: SYNTH.test(String(h)),
      band: bands.find(b => c >= b.from && c <= b.to)?.label ?? null,
      baseRole: baseRoles[c], role: s.roles[c],
      numeric, nonNumeric, missing,
      distinct: seen.size, distinctWindow: uniqW, windowN: sample.length,
      nfWindow: sample.length ? sample.filter(v => !isNaN(Number(v))).length / sample.length : null,
      movedBy28: mv ? { groupCol: mv.groupCol, groupHeader: String(s.hdrs[mv.groupCol]), nLevels: mv.nLevels } : null,
      nonNumericTokens: [...tok],
    };
  });
  out.windowCoversWholeColumn = s.data.length <= WINDOW;
  out.columnsWhereWindowIsAStrictSample =
    out.columns.filter(c => c.distinct !== c.distinctWindow).length;
  mark('columns');

  // ── 11. blank rows surviving into `data` ──
  const blank = [];
  s.data.forEach((r, i) => { if (r.every(v => v == null || v === '')) blank.push(i); });
  out.blankDataRows = { count: blank.length, indices: blank.slice(0, 20) };
  out.rowsDroppedByExtract = s.data.length - matrix.length;

  // ── 12. is the last data row a column total? ──
  // Reported as a residual, NOT classified. An exact match would prove a live
  // formula; a small residual is equally consistent with a total reported at a
  // precision the rounded cells above cannot reproduce, and the record leaves
  // both open (S395-POS01-STRUCTURE.md §3).
  if (matrix.length >= 2 && out.nNumericDataCols > 0) {
    const last = matrix[matrix.length - 1];
    let maxAbs = 0, maxRel = 0, nCmp = 0, exact = 0, maxRelCol = null;
    for (let c = 0; c < out.nNumericDataCols; c++) {
      if (last[c] == null) continue;
      let t = 0, any = false;
      for (let r = 0; r < matrix.length - 1; r++) { const v = matrix[r][c]; if (v != null) { t += v; any = true; } }
      if (!any) continue;
      nCmp++;
      const abs = Math.abs(t - last[c]);
      if (abs < 1e-6) exact++;
      if (abs > maxAbs) maxAbs = abs;
      if (Math.abs(last[c]) > 0) {
        const rel = abs / Math.abs(last[c]);
        if (rel > maxRel) { maxRel = rel; maxRelCol = c; }
      }
    }
    out.lastRowIsColumnTotal = { columnsCompared: nCmp, exactTo1e6: exact,
      maxAbsResidual: maxAbs, maxRelativeResidual: nCmp ? maxRel : null, maxRelativeAtColumn: maxRelCol };
  } else {
    out.lastRowIsColumnTotal = { columnsCompared: 0, exactTo1e6: 0, maxAbsResidual: null,
      maxRelativeResidual: null, maxRelativeAtColumn: null, note: 'fewer than 2 matrix rows' };
  }
  mark('total');

} catch (e) {
  out.error = e && e.message ? e.message : String(e);
  out.errorStack = e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : null;
}

out.elapsedMs = Date.now() - t0;
process.stdout.write(JSON.stringify(out, null, PRETTY ? 1 : 0) + '\n');

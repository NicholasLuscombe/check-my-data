// round2-select.mjs — Round 2 selection pass: fetch, measure, rank. S390.
//
// Three stages, each rerunnable on its own:
//
//   --fetch      Pull every considered file (.xlsx/.xls/.csv/.tsv) of every
//                deposit in round2-manifest.json into <corpus>/round2/R2-NN/,
//                original filenames, using the manifest's own stash:download
//                href. Idempotent: a file already on disk at the manifest's
//                size and sha-256 is not re-fetched.
//   --measure    Every sheet of every fetched file through the product's import
//                and role inference, stopping at extractAnalysisInputs. This is
//                the S373 census path (ROUND2-SPECIFICITY-SCREEN.md §6.2).
//   --rank       ROUND2-SPECIFICITY-SCREEN.md §6.2's arithmetic over the
//                measurements: largest cell count (valid rows x data columns),
//                tie-broken on data columns, then valid rows, then file name
//                ascending, then sheet index ascending.
//
// With no stage flag all three run in order.
//
// NO TEST RUNS. No verdict, flag or severity is computed at any point, and
// nothing here decides any deposit's eligibility. --rank emits an ORDERING;
// which sheets pass the shape filter, and therefore which deposit is eligible,
// is decided by a human from these numbers and recorded in ROUND2-RUN-LOG.md.
//
// READ-ONLY on src/. Every import below is a call into the shipped module.
//
// ── The one copied function, and why ────────────────────────────────────────
// prepStructure is copied BYTE-FOR-BYTE from
// test/probes/probe-s373-corpus-shape-census.mjs, which copied it from
// scripts/corpus-run.mjs:146-195. §6.2 names the S373 census path by name, so
// this is that path rather than a second one. It is a copy because both of
// those files are scripts, not modules: each parses argv and runs at load, so
// neither can be imported. S381 found 25 divergences between corpus-run.mjs's
// hand port and ImportView.jsx; copying rather than re-deriving is what keeps
// this from being a twenty-sixth. Byte-identity is checkable:
//
//   diff <(sed -n '/^function prepStructure(raw) {$/,/^}$/p' \
//            test/probes/probe-s373-corpus-shape-census.mjs) \
//        <(sed -n '/^function prepStructure(raw) {$/,/^}$/p' \
//            scripts/round2-select.mjs)
//
// The CSV read adapter is copied from corpus-run.mjs's readRawMatrix for the
// same reason. It is BatchView's parse call, not ImportView's — the app trims
// the whole text first and the harness does not (S381 row 4). The census path
// is the harness form, and §6.2 names the census path.
//
// ── Usage ───────────────────────────────────────────────────────────────────
//   node scripts/round2-select.mjs                       # fetch, measure, rank
//   node scripts/round2-select.mjs --fetch --dry-run     # fetch plan, no network
//   node scripts/round2-select.mjs --measure --rank      # skip the network
//   DRYAD_TOKEN=... node scripts/round2-select.mjs --fetch
//   ROOT=/some/dir node scripts/round2-select.mjs --measure   # measure elsewhere
//
// Env:
//   DRYAD_TOKEN   bearer token for the Dryad API. WITHOUT IT --fetch CANNOT
//                 RUN: /api/v2/files/<id>/download answers 401 "Unauthorized,
//                 must have current bearer token" to an anonymous client.
//   CORPUS_DIR    the corpus-data directory (default: found by walking up).
//   ROOT          the directory holding the R2-NN folders (default:
//                 <CORPUS_DIR>/round2).
//   THROTTLE_MS   delay between fetches, default 1200.
//
// Output:
//   <ROOT>/R2-NN/<original filename>          the fetched files
//   docs/shared/round2-raw/round2-selection.json   every sheet's measurements

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import Papa from 'papaparse';

// The engine yields the Blocked-Mahalanobis permutation loop via this; Node has
// no rAF. extractAnalysisInputs does not need it, but engine.js is imported
// whole, so polyfill it exactly as validate-batch.mjs and the S373 probe do.
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { inferBaseRoles, detectGroupAttributes } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { summarize } = await import('../src/import/summary.js');
const { parseExcel, getSheetNames } = await import('../src/import/excel.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../src/constants/assays.js');

// ── Constants that are READ OFF src/, not restated ──────────────────────────
// The cap is ImportView.jsx:298 (File.size) and :215 (decoded text length),
// both `50 * 1024 * 1024`. It is written here as the same expression so the
// number is not paraphrased; a change in src/ makes this stale and the S390
// part-1 answer is the record of where it was read from.
const IMPORT_CAP_BYTES = 50 * 1024 * 1024;
const CONSIDERED_EXT = new Set(['xlsx', 'xls', 'csv', 'tsv']);  // §6.2, exactly

const DRYAD_BASE = 'https://datadryad.org';
const MANIFEST = 'docs/shared/round2-raw/round2-manifest.json';
const SELECTION_OUT = 'docs/shared/round2-raw/round2-selection.json';
const THROTTLE_MS = Number(process.env.THROTTLE_MS || 1200);
const MAX_ATTEMPTS = 2;   // "record any fetch failure per file rather than retrying past two attempts"

// ── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const staged = has('--fetch') || has('--measure') || has('--rank');
const DO_FETCH = staged ? has('--fetch') : true;
const DO_MEASURE = staged ? has('--measure') : true;
const DO_RANK = staged ? has('--rank') : true;
const DRY_RUN = has('--dry-run');

// ── Where the data lives ────────────────────────────────────────────────────
// corpus-data/ is gitignored (.gitignore:61) and lives in the MAIN CHECKOUT,
// not in a worktree — same resolver shape as probe-s373-corpus-shape-census.mjs
// and probe-s352-corpus-pairing.mjs. Landing round 2 beside round 1 is what
// makes it survive worktree teardown.
function findCorpusDir() {
  const candidates = [process.env.CORPUS_DIR, 'corpus-data', resolve(process.cwd(), '../../../corpus-data')].filter(Boolean);
  const found = candidates.find(d => existsSync(d));
  if (!found) {
    console.error('corpus directory NOT FOUND. Tried: ' + candidates.map(c => resolve(c)).join(', '));
    console.error('Set CORPUS_DIR to the corpus-data directory.');
    process.exit(1);
  }
  return resolve(found);
}
const ROOT = process.env.ROOT ? resolve(process.env.ROOT) : join(findCorpusDir(), 'round2');
const pad2 = n => String(n).padStart(2, '0');
const depositDir = pos => join(ROOT, `R2-${pad2(pos)}`);

const extOf = p => { const e = extname(p).slice(1).toLowerCase(); return e; };
const sha256 = buf => createHash('sha256').update(buf).digest('hex');

// ── The considered set, straight off the manifest ───────────────────────────
function readManifest() {
  const m = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
  return m.map(d => {
    const considered = (d.files || []).filter(f => CONSIDERED_EXT.has(extOf(f.path)));
    return {
      position: d.position, doi: d.doi, storageSize: d.storageSize,
      publicationDate: d.publicationDate,
      considered: considered.map(f => ({
        path: f.path, size: f.size, digest: f.digest, digestType: f.digestType,
        href: f._links?.['stash:download']?.href || null,
      })),
    };
  }).filter(d => d.considered.length > 0);
}

// ════════════════════════════════════════════════════════════════════════════
// STAGE 1 — fetch
// ════════════════════════════════════════════════════════════════════════════
const sleep = ms => new Promise(r => setTimeout(r, ms));

// One request. Returns {ok, status, buf} or {ok:false, status, error}.
async function getOnce(url) {
  const headers = { 'Accept': '*/*' };
  if (process.env.DRYAD_TOKEN) headers.Authorization = `Bearer ${process.env.DRYAD_TOKEN}`;
  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    if (!res.ok) return { ok: false, status: res.status, error: `HTTP ${res.status} ${res.statusText}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, status: res.status, buf };
  } catch (e) {
    return { ok: false, status: null, error: e.message };
  }
}

async function fetchAll(deposits) {
  const report = { root: ROOT, throttleMs: THROTTLE_MS, capBytes: IMPORT_CAP_BYTES,
                   tokenPresent: !!process.env.DRYAD_TOKEN, dryRun: DRY_RUN,
                   files: [], bytesFetched: 0, bytesSkippedOverCap: 0, aborted: null };

  // The over-cap skip is decided before any request, so a file we cannot import
  // is never pulled. Recorded with its size, per the dispatch.
  const work = [];
  for (const d of deposits) {
    for (const f of d.considered) {
      if (f.size > IMPORT_CAP_BYTES) {
        report.files.push({ position: d.position, doi: d.doi, path: f.path, size: f.size,
                            outcome: 'skipped-over-cap',
                            note: `${f.size} bytes exceeds ImportView's ${IMPORT_CAP_BYTES}-byte cap (ImportView.jsx:298)` });
        report.bytesSkippedOverCap += f.size;
        continue;
      }
      work.push({ d, f });
    }
  }

  if (DRY_RUN) {
    report.files.push(...work.map(({ d, f }) => ({ position: d.position, doi: d.doi, path: f.path,
                                                   size: f.size, outcome: 'would-fetch', url: DRYAD_BASE + f.href })));
    return report;
  }

  for (let i = 0; i < work.length; i++) {
    const { d, f } = work[i];
    const dir = depositDir(d.position);
    const dest = join(dir, f.path);
    const rec = { position: d.position, doi: d.doi, path: f.path, size: f.size, dest };

    // Already on disk and intact — rerunnable without re-pulling.
    if (existsSync(dest)) {
      const buf = readFileSync(dest);
      const digestOk = f.digestType === 'sha-256' ? sha256(buf) === f.digest : null;
      if (buf.length === f.size && digestOk !== false) {
        rec.outcome = 'already-present'; rec.bytesOnDisk = buf.length; rec.digestOk = digestOk;
        report.files.push(rec); continue;
      }
    }

    if (!f.href) { rec.outcome = 'no-download-href'; report.files.push(rec); continue; }
    const url = DRYAD_BASE + f.href;
    rec.url = url;

    let res = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await getOnce(url);
      rec.attempts = attempt;
      if (res.ok) break;
      if (attempt < MAX_ATTEMPTS) await sleep(THROTTLE_MS);
    }

    if (!res.ok) {
      rec.outcome = 'failed'; rec.error = res.error;
      report.files.push(rec);
      // 401/403 on the FIRST file is a credential wall, not a per-file fault.
      // Abort rather than make 201 more requests that will all fail the same
      // way — that is the polite behaviour and it keeps the report honest.
      if ((res.status === 401 || res.status === 403) && report.files.filter(x => x.outcome === 'failed').length === 1) {
        report.aborted = `HTTP ${res.status} on the first fetch (${f.path}). ` +
          (process.env.DRYAD_TOKEN
            ? 'DRYAD_TOKEN is set but was rejected.'
            : 'DRYAD_TOKEN is not set; /api/v2/files/<id>/download requires a bearer token.');
        break;
      }
      await sleep(THROTTLE_MS);
      continue;
    }

    mkdirSync(dir, { recursive: true });
    writeFileSync(dest, res.buf);
    rec.outcome = 'fetched';
    rec.bytesOnDisk = res.buf.length;
    rec.sizeMatchesManifest = res.buf.length === f.size;
    rec.digestOk = f.digestType === 'sha-256' ? sha256(res.buf) === f.digest : null;
    report.bytesFetched += res.buf.length;
    report.files.push(rec);
    if (i < work.length - 1) await sleep(THROTTLE_MS);
  }
  return report;
}

// ════════════════════════════════════════════════════════════════════════════
// STAGE 2 — measure. The S373 census path.
// ════════════════════════════════════════════════════════════════════════════

// ── prepStructure — copied from scripts/corpus-run.mjs:146-195, minus the
// conditionsHint override (no file in this census carries a hint). Kept a copy
// rather than an import because the runner is a script, not a module: it parses
// argv and runs at load. `nBlocks` is the one addition — detectBlocks' result is
// discarded by the runner and is worth recording here, since taking block 1 of
// several is a silent narrowing of what the sheet contained.
function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('Empty after preprocessing.');

  const blocks = detectBlocks(preprocessed);
  let blockRows = blocks.length > 1 ? blocks[0] : preprocessed;
  const nBlocks = blocks.length;

  const maxC0 = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const minCells0 = Math.max(2, Math.ceil(maxC0 * 0.1));
  while (blockRows.length > 2) {
    const nb = blockRows[0].filter(v => v != null && String(v).trim() !== '').length;
    if (nb < minCells0) blockRows = blockRows.slice(1); else break;
  }

  const nH = detectHeaderRows(blockRows);
  const maxC = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = r => { const o = [...r]; while (o.length < maxC) o.push(null); return o; };

  let hdrs, data, condPerCol = null;
  if (nH === 0) {
    hdrs = Array.from({ length: maxC }, (_, i) => 'Col ' + (i + 1));
    data = blockRows.map(pad);
  } else if (nH === 1) {
    hdrs = pad(blockRows[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(1).map(pad);
  } else {
    const rawGR = pad(blockRows[0]), nameRow = pad(blockRows[1]);
    const groups = forwardFill(rawGR);
    condPerCol = new Array(maxC).fill(null);
    for (let i = 0; i < maxC; i++) {
      const g = groups[i] != null ? String(groups[i]).trim() : '';
      if (g) condPerCol[i] = g;
    }
    hdrs = nameRow.map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(2).map(pad);
  }

  const longFormatDetected = !!detectLongFormat(hdrs, data);
  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles, groupings } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, groupings, longFormatDetected, nH, nBlocks };
}

const median = a => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const nameOf = (hdrs, c) => (hdrs[c] != null && String(hdrs[c]).trim()) ? String(hdrs[c]).trim() : `Col ${c + 1}`;

// Raw 2D array for one sheet. Excel goes through the shipped parseExcel wrapped
// in a Node Blob (it only needs .arrayBuffer()); csv/tsv/txt take corpus-run.mjs's
// readRawMatrix parse call verbatim.
async function readRaw(path, sheetName) {
  const ext = extname(path).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const blob = new Blob([readFileSync(path)]);
    const { rows, sheetName: used } = await parseExcel(blob, sheetName);
    return { raw: rows, sheetUsed: used, textLength: null };
  }
  const text = readFileSync(path, 'utf-8');
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: false });
  return { raw: parsed.data, sheetUsed: null, textLength: text.length };
}

// AUXILIARY, and deliberately outside the census pipeline: the length of the
// text ImportView's SECOND cap (ImportView.jsx:215) would measure. For a
// workbook that is the CSV re-serialisation of the chosen sheet
// (ImportView.jsx:280 / BatchView.jsx:44, expression copied verbatim); for a
// csv/tsv it is the decoded file text. Nothing downstream reads this — it is
// recorded because a sheet can clear the on-disk cap and fail the text cap.
const serializeCsv = rows =>
  rows.map(r => r.map(v => v == null ? "" : (/[,"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(",")).join("\n");

async function measureSheet(path, sheetName, sheetIndex, sheetTotal) {
  const { raw, sheetUsed, textLength } = await readRaw(path, sheetName);
  const rawRows = raw.length;
  const rawCols = raw.reduce((m, r) => Math.max(m, r.length), 0);
  const capTextLength = textLength != null ? textLength : serializeCsv(raw).length;

  const { hdrs, data, condPerCol, roles, longFormatDetected, nH, nBlocks } = prepStructure(raw);

  // assay / dataType / zeroAsMissing — corpus-run.mjs's no-override path. Not
  // cosmetic: zeroAsMissing decides which rows survive completeness filtering,
  // so a census that skipped it would report the wrong valid row count on any
  // genomics or cell-count deposit.
  const auto = detectAssay(basename(path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;

  const dataCols = roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const dataColHeaders = dataCols.map(c => nameOf(hdrs, c));

  const { matrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing,
    colRelationship: 'replicates', dataColHeaders,
  });

  const byRole = {};
  roles.forEach((r, c) => { (byRole[r] ||= []).push(nameOf(hdrs, c)); });

  let grouping;
  if (condCtx.type === 'column-grouped') {
    const sizes = condCtx.slices().map(s => (s.colIndices || []).length);
    grouping = { kind: 'column-grouped', nGroups: condCtx.count, groupNames: condCtx.names,
                 sizeUnit: 'columns per group', min: sizes.length ? Math.min(...sizes) : null,
                 median: median(sizes), max: sizes.length ? Math.max(...sizes) : null, sizes };
  } else if (condCtx.type === 'row-grouped') {
    const st = condCtx.rowGroupsStatus();
    const sizes = st.sizes || [];
    grouping = { kind: 'row-grouped', nGroups: st.nGroups ?? null, usable: st.usable, reason: st.reason,
                 sizeUnit: 'rows per group', min: sizes.length ? Math.min(...sizes) : null,
                 median: st.medianSize, max: sizes.length ? Math.max(...sizes) : null, sizes };
  } else {
    grouping = { kind: 'neither', nGroups: 0, sizeUnit: null, min: null, median: null, max: null, sizes: [] };
  }

  // groupingPending is stamped onto condCtx by extractAnalysisInputs itself
  // (engine.js:172-177 calls computeTrigger; runFullAnalysis only READS it at
  // :242). So it is available at the census stopping point and no test has to
  // run to see it. This is a field read, not a re-derivation of the arm logic.
  const trig = condCtx.groupingTrigger || { pending: false };

  return {
    sheet: sheetUsed != null ? sheetUsed : basename(path),
    sheetIndex, sheetTotal,
    rawRows, rawCols, headerRows: nH, nBlocks, detectBlocksSplit: nBlocks > 1,
    parsedRows: data.length, parsedCols: hdrs.length,
    assay, dataType, zeroAsMissing, longFormatDetected,
    capTextLength, capTextOverCap: capTextLength > IMPORT_CAP_BYTES,
    roleCounts: {
      condition: (byRole.condition || []).length,
      label: (byRole.label || []).length,
      data: (byRole.data || []).length,
      attribute: (byRole.attribute || []).length,
      ignore: (byRole.ignore || []).length,
    },
    conditionCols: byRole.condition || [],
    labelCols: byRole.label || [],
    dataColsNamed: byRole.data || [],
    attributeCols: byRole.attribute || [],
    roles,
    headers: hdrs,
    nNumericDataCols: matrix[0]?.length || 0,
    validRows: matrix.length,
    grouping,
    groupingPending: !!trig.pending,
    groupingTrigger: { arm1: !!trig.arm1, arm2: !!trig.arm2, condCols: trig.condCols ?? 0,
                       nGroups: trig.nGroups ?? null,
                       medianSize: Number.isFinite(trig.median) ? trig.median : null },
    error: null,
  };
}

async function measureFile(path) {
  const out = { file: basename(path), path: resolve(path), sheetCount: null, sheetNames: null, sheets: [] };
  const ext = extname(path).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    let names;
    try {
      names = await getSheetNames(new Blob([readFileSync(path)]));
    } catch (e) {
      // A workbook whose sheet list will not read is a RESULT, not an absence.
      out.fileError = e.message;
      return out;
    }
    out.sheetCount = names.length;
    out.sheetNames = names;
    for (let i = 0; i < names.length; i++) {
      try { out.sheets.push(await measureSheet(path, names[i], i, names.length)); }
      catch (e) {
        // Verbatim, and move on. A file that fails on the shipped path has
        // failed, and that is a measurement — no retry with altered options.
        out.sheets.push({ sheet: names[i], sheetIndex: i, sheetTotal: names.length, error: e.message });
      }
    }
    return out;
  }
  out.sheetCount = 1;
  out.sheetNames = [basename(path)];
  try { out.sheets.push(await measureSheet(path, null, 0, 1)); }
  catch (e) { out.sheets.push({ sheet: basename(path), sheetIndex: 0, sheetTotal: 1, error: e.message }); }
  return out;
}

function depositDirs() {
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT).filter(n => /^R2-\d+$/.test(n)).sort()
    .map(n => ({ name: n, position: Number(n.slice(3)), dir: join(ROOT, n) }));
}

async function measureAll(deposits) {
  const byPos = new Map(deposits.map(d => [d.position, d]));
  const out = [];
  for (const { name, position, dir } of depositDirs()) {
    const meta = byPos.get(position) || {};
    const files = readdirSync(dir).filter(f => CONSIDERED_EXT.has(extOf(f))).sort()
      .map(f => join(dir, f));
    const rec = { position, folder: name, doi: meta.doi || null, files: [] };
    for (const p of files) {
      process.stderr.write(`  measuring ${name}/${basename(p)}\n`);
      rec.files.push(await measureFile(p));
    }
    out.push(rec);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// STAGE 3 — §6.2's arithmetic, and ONLY its arithmetic.
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
console.log('S390 — Round 2 selection pass');
console.log('fetch + shape measurement + §6.2 ordering. NO TEST RUNS, NO ELIGIBILITY DECISION.\n');
console.log(`manifest: ${resolve(MANIFEST)}`);
console.log(`root:     ${ROOT}\n`);

const deposits = readManifest();
console.log(`${deposits.length} deposits carry at least one considered file (${deposits.reduce((n, d) => n + d.considered.length, 0)} files)\n`);

const artifact = { generatedBy: 'scripts/round2-select.mjs', root: ROOT, capBytes: IMPORT_CAP_BYTES };

if (DO_FETCH) {
  console.log('── stage 1: fetch ──');
  const report = await fetchAll(deposits);
  artifact.fetch = report;
  const by = o => report.files.filter(f => f.outcome === o);
  console.log(`  fetched         ${by('fetched').length}`);
  console.log(`  already present ${by('already-present').length}`);
  console.log(`  skipped >cap    ${by('skipped-over-cap').length}  (${by('skipped-over-cap').reduce((n, f) => n + f.size, 0).toLocaleString()} bytes)`);
  console.log(`  failed          ${by('failed').length}`);
  console.log(`  bytes fetched   ${report.bytesFetched.toLocaleString()}`);
  for (const f of by('failed')) console.log(`    FAIL R2-${pad2(f.position)}/${f.path}: ${f.error}`);
  for (const f of by('fetched').filter(x => x.sizeMatchesManifest === false)) {
    console.log(`    SIZE MISMATCH R2-${pad2(f.position)}/${f.path}: manifest ${f.size}, got ${f.bytesOnDisk} — the deposit moved`);
  }
  for (const f of by('fetched').filter(x => x.digestOk === false)) {
    console.log(`    DIGEST MISMATCH R2-${pad2(f.position)}/${f.path} — the deposit moved`);
  }
  if (report.aborted) console.log(`  ABORTED: ${report.aborted}`);
  console.log('');
}

if (DO_MEASURE) {
  console.log('── stage 2: measure ──');
  const dirs = depositDirs();
  if (!dirs.length) {
    console.log(`  no R2-NN directories under ${ROOT} — nothing to measure.\n`);
    artifact.measure = [];
  } else {
    artifact.measure = await measureAll(deposits);
    const nSheets = artifact.measure.reduce((n, d) => n + d.files.reduce((m, f) => m + f.sheets.length, 0), 0);
    const nErr = artifact.measure.reduce((n, d) => n + d.files.reduce((m, f) => m + (f.fileError ? 1 : 0) + f.sheets.filter(s => s.error).length, 0), 0);
    console.log(`  ${artifact.measure.length} deposits, ${nSheets} sheets, ${nErr} import errors\n`);
  }
}

if (DO_RANK) {
  console.log('── stage 3: §6.2 ordering ──');
  const src = artifact.measure || [];
  artifact.ranking = src.map(rankDeposit);
  for (const r of artifact.ranking) {
    console.log(`\nR2-${pad2(r.position)}  ${r.doi || ''}  — ${r.nSheetsMeasured} sheet(s) measured`);
    r.ranked.forEach((s, i) => {
      console.log(`  ${String(i + 1).padStart(2)}. ${(s.file + ' / ' + s.sheet).slice(0, 58).padEnd(58)}` +
        ` cells ${String(s.cellCount).padStart(9)} = ${String(s.validRows).padStart(6)}r x ${String(s.dataCols).padStart(3)}c` +
        `  sheet ${s.sheetIndex + 1}/${s.sheetTotal}${s.groupingPending ? '  groupingPending' : ''}`);
    });
    for (const e of r.errored) console.log(`   --  ${e.file}${e.sheet ? ' / ' + e.sheet : ''}: DID NOT IMPORT: ${e.error}`);
    if (r.decidedBy) console.log(`      rank 1 decided by: ${r.decidedBy}`);
  }
  console.log('');
}

// A --dry-run never writes the artifact: it would overwrite a real measurement
// with a plan.
if (DRY_RUN) {
  console.log("--dry-run: artifact NOT written.");
} else {
  mkdirSync("docs/shared/round2-raw", { recursive: true });
  writeFileSync(SELECTION_OUT, JSON.stringify(artifact, null, 2));
  console.log(`wrote ${SELECTION_OUT}`);
}
console.log('\nNo eligibility decision was made by this script.');

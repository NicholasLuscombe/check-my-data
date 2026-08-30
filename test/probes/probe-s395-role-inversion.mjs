/* S395 — does role inference invert a design, and how often.
   READ-ONLY. No src/ file is modified by this probe and none is written.

   Instrument. `scripts/corpus-run.mjs` is loaded through
   test/probes/s395-corpus-run-hook.mjs, which replaces the CLI tail with an
   export list and touches nothing above it. So `prepStructure` and
   `buildAnalysisConfig` here ARE the census path's own source text executed —
   there is no reconstruction and nothing to drift. `--verify` proves it anyway,
   by recomputing every field of the recorded round-2 inventory and requiring
   exact agreement on every sheet.

   Modes:
     --anchor   report the hook's anchor and the census path's role plumbing
     --verify   recompute corpus-out/round2-inventory.json and diff every field
     --part0    per-column roles on the three deposits, against the screen read
     --part1    the 27 batch fixtures
     --part2    the thirty of ROUND2-RUN-LOG.md §4

   Usage:
     node --import ./test/probes/s395-corpus-run-hook.mjs \
          test/probes/probe-s395-role-inversion.mjs --part0
*/
import { readFileSync, existsSync } from 'node:fs';
import { basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = new Set(process.argv.slice(2));
const has = f => args.has('--' + f);

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CR = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
if (typeof CR.prepStructure !== 'function') {
  console.error('The hook did not load. Run with:\n  node --import ./test/probes/s395-corpus-run-hook.mjs ' +
                'test/probes/probe-s395-role-inversion.mjs <mode>');
  process.exit(2);
}

// ── The screen read, transcribed from the dispatch BEFORE the run ────
// Vocabulary: the ImportView chips read Data / Label / Cond / Attr.
const SCREEN = {
  'pos-02': {
    file: 'corpus-data/round2/pos-02/os_cells_new.csv',
    rows: 26532, dataCols: 1,
    cols: [
      ['collection_no', 'data'], ['genus2', 'label'], ['geoplate_rev_com', 'condition'],
      ['paleolatOld', 'attribute'], ['paleolngOld', 'attribute'], ['lat', 'attribute'],
      ['lng', 'attribute'], ['paleolng', 'attribute'], ['paleolat', 'attribute'],
      ['series', 'condition'], ['short', 'condition'], ['bottom', 'attribute'],
      ['mid', 'attribute'], ['top', 'attribute'], ['dur', 'attribute'], ['stg', 'attribute'],
      ['cell5', 'condition'], ['cell9', 'condition'], ['early_com_stage', 'condition'],
      ['bin', 'attribute'], ['formation', 'condition'],
    ],
  },
  'pos-44': {
    file: 'corpus-data/round2/pos-44/subset_dets.csv',
    rows: 52948, dataCols: 1,
    cols: [
      ['datetime', 'label'], ['Date', 'condition'], ['monthB', 'condition'], ['month', 'attribute'],
      ['year', 'attribute'], ['lon', 'attribute'], ['lat', 'attribute'], ['node', 'condition'],
      ['SFC', 'condition'], ['FishID', 'condition'], ['station', 'condition'], ['timediff', 'data'],
    ],
  },
  'pos-47': {
    file: 'corpus-data/round2/pos-47/seed-density.csv',
    rows: 760, dataCols: 1,
    cols: [
      ['date', 'condition'], ['plot_id', 'label'], ['seed_density', 'attribute'],
      ['burial_treatment', 'attribute'], ['clam_code', 'condition'], ['shoot_count', 'data'],
      ['length_cm_1', 'condition'], ['length_cm_2', 'condition'], ['length_cm_3', 'condition'],
      ['length_cm_4', 'condition'], ['length_cm_5', 'condition'],
    ],
  },
};

const ABBR = { data: 'Data', label: 'Label', condition: 'Cond', attribute: 'Attr', ignore: 'ign' };
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

function roleCountsOf(roles) {
  const c = { condition: 0, label: 0, data: 0, attribute: 0, ignore: 0 };
  for (const r of roles) c[r] = (c[r] || 0) + 1;
  return c;
}

// ── --anchor ─────────────────────────────────────────────────────────
if (has('anchor')) {
  const hook = await import(resolve(ROOT, 'test/probes/s395-corpus-run-hook.mjs'));
  const src = readFileSync(resolve(ROOT, 'scripts/corpus-run.mjs'), 'utf8');
  console.log('ANCHOR');
  console.log(`  anchor present in scripts/corpus-run.mjs : ${src.includes(hook.ANCHOR)}`);
  console.log(`  anchor occurrences                       : ${src.split(hook.ANCHOR).length - 1}`);
  console.log(`  hooked exports                           : ${Object.keys(CR).sort().join(', ')}`);
  const inv = readFileSync(resolve(ROOT, 'scripts/corpus-run.mjs'), 'utf8');
  console.log('\nWHAT THE INVENTORY ARTIFACT PUBLISHES ABOUT ROLES');
  const m = inv.match(/const roleCounts = \{[\s\S]*?\n {2}for \(const r of roles\).*\n/);
  console.log(m ? '  ' + m[0].trim().split('\n').map(s => s.trim()).join('\n  ') : '  (roleCounts block not found)');
  console.log(`  per-column roles in the artifact          : no — roleCounts only`);
  console.log(`  per-column roles returned by prepStructure: yes — the \`roles\` array`);
  console.log(`  dataColHeaders set by buildAnalysisConfig : ${/dataColHeaders/.test(inv) ? 'yes' : 'no (undefined on this path)'}`);
}

// ── --verify ─────────────────────────────────────────────────────────
// Recompute the recorded round-2 inventory from the same entries and diff every
// field on every sheet. This is the by-product proof: nNumericDataCols,
// validRows, roleCounts, assay, dataType, headerRows, nBlocks, grouping and the
// rest are all recomputed, not read.
if (has('verify')) {
  const recPath = resolve(ROOT, 'corpus-out/round2-inventory.json');
  const entPath = resolve(ROOT, 'corpus-out/round2-manifest-entries.json');
  if (!existsSync(recPath) || !existsSync(entPath)) {
    console.error('verify: corpus-out/round2-inventory.json or round2-manifest-entries.json is absent.');
    process.exit(2);
  }
  const recorded = JSON.parse(readFileSync(recPath, 'utf8'));
  const entries = JSON.parse(readFileSync(entPath, 'utf8'));
  const byPath = new Map(recorded.files.map(f => [f.path, f]));

  let sheets = 0, cells = 0, mismatches = 0, filesSeen = 0;
  const FIELDS = ['sheet', 'sheetIndex', 'sheetTotal', 'passed', 'error', 'rawRows', 'rawCols',
    'headerRows', 'nBlocks', 'detectBlocksSplit', 'validRows', 'nNumericDataCols', 'cellCount',
    'missingFraction', 'grouping', 'groupingPending', 'assay', 'dataType', 'zeroAsMissing',
    'longFormatDetected', 'roleCounts'];

  for (const entry of entries) {
    const abs = resolve(ROOT, entry.path);
    const rec = byPath.get(abs);
    if (!rec) { console.log(`  MISSING from recorded artifact: ${entry.path}`); mismatches++; continue; }
    filesSeen++;
    const ext = entry.path.toLowerCase().replace(/^.*\./, '');
    let mine = [];
    try {
      if (ext === 'xlsx' || ext === 'xls') {
        const { getSheetNames, parseExcel } = await import(resolve(ROOT, 'src/import/excel.js'));
        const blob = new Blob([readFileSync(abs)]);
        const names = await getSheetNames(blob);
        for (let i = 0; i < names.length; i++) {
          try {
            const { rows } = await parseExcel(blob, names[i]);
            mine.push(CR.inventorySheet({ entry: { ...entry, path: abs }, raw: rows, sheetName: names[i], sheetIndex: i, sheetTotal: names.length }));
          } catch (e) {
            mine.push({ sheet: names[i], sheetIndex: i, sheetTotal: names.length, passed: false, error: e.message });
          }
        }
      } else {
        const Papa = (await import('papaparse')).default;
        const text = readFileSync(abs, 'utf-8');
        const parsed = Papa.parse(text, { header: false, skipEmptyLines: false });
        try {
          mine.push(CR.inventorySheet({ entry: { ...entry, path: abs }, raw: parsed.data, sheetName: basename(abs), sheetIndex: 0, sheetTotal: 1 }));
        } catch (e) {
          mine.push({ sheet: basename(abs), sheetIndex: 0, sheetTotal: 1, passed: false, error: e.message });
        }
      }
    } catch (e) {
      console.log(`  file-level throw on ${entry.path}: ${e.message}`);
    }
    if (mine.length !== rec.sheets.length) {
      console.log(`  SHEET COUNT ${entry.path}: mine ${mine.length} vs recorded ${rec.sheets.length}`);
      mismatches++;
    }
    for (let i = 0; i < Math.min(mine.length, rec.sheets.length); i++) {
      sheets++;
      for (const f of FIELDS) {
        cells++;
        const a = JSON.stringify(mine[i][f] ?? null), b = JSON.stringify(rec.sheets[i][f] ?? null);
        if (a !== b) { mismatches++; console.log(`  DIFF ${entry.path} [${rec.sheets[i].sheet}] ${f}: mine ${a} vs recorded ${b}`); }
      }
    }
  }
  console.log('\nVERIFY — recomputed inventory against corpus-out/round2-inventory.json');
  console.log(`  files walked        : ${filesSeen} / ${entries.length}`);
  console.log(`  sheets compared     : ${sheets} (recorded artifact holds ${recorded.sheetCount})`);
  console.log(`  fields compared     : ${cells}`);
  console.log(`  mismatches          : ${mismatches}`);
  console.log(`  VERDICT             : ${mismatches === 0 ? 'IDENTICAL — the probe is the census path' : 'DIVERGENT — do not trust anything downstream'}`);
}

// ── --part0 ──────────────────────────────────────────────────────────
async function censusRoles(absPath) {
  const { raw } = await CR.readRawMatrix({ path: absPath });
  const s = CR.prepStructure(raw, undefined);
  // Base roles: the same inputs prepStructure just used, read a second time.
  // Not a second inference path — inferBaseRoles is what prepStructure calls.
  const { inferBaseRoles } = await import(resolve(ROOT, "src/import/roles.js"));
  const baseRolesForReport = inferBaseRoles(s.data, s.hdrs, s.condPerCol);
  const cfg = CR.buildAnalysisConfig({ entry: { path: absPath }, hdrs: s.hdrs, data: s.data,
    condPerCol: s.condPerCol, roles: s.roles, longFormatDetected: s.longFormatDetected });
  return { ...s, ...cfg, baseRolesForReport, rawRows: raw.length };
}

if (has('part0')) {
  console.log('PART 0 — the census path against the screen read\n');
  let allExact = true;
  for (const [pos, exp] of Object.entries(SCREEN)) {
    const abs = resolve(ROOT, exp.file);
    const got = await censusRoles(abs);
    const n = Math.max(got.hdrs.length, exp.cols.length);
    let colDiffs = 0, hdrDiffs = 0;
    console.log(`${pos} · ${basename(exp.file)}`);
    console.log(`  ${pad('#', 3)}${pad('header (census)', 22)}${pad('header (screen)', 22)}${pad('base', 7)}${pad('census', 7)}${pad('screen', 7)}`);
    for (let c = 0; c < n; c++) {
      const h = got.hdrs[c] ?? '(absent)';
      const eh = exp.cols[c]?.[0] ?? '(absent)';
      const mine = got.roles[c] ?? '(absent)';
      const base = got.baseRolesForReport?.[c] ?? '';
      const theirs = exp.cols[c]?.[1] ?? '(absent)';
      const bad = mine !== theirs;
      if (bad) colDiffs++;
      if (h !== eh) hdrDiffs++;
      console.log(`  ${pad(c + 1, 3)}${pad(h, 22)}${pad(eh, 22)}${pad(ABBR[base] || '', 7)}${pad(ABBR[mine] || mine, 7)}${pad(ABBR[theirs] || theirs, 7)}${bad ? '  <-- DIFFERS' : ''}`);
    }
    const rc = roleCountsOf(got.roles);
    console.log(`  counts census : Data ${rc.data} / Label ${rc.label} / Cond ${rc.condition} / Attr ${rc.attribute} / ign ${rc.ignore}`);
    console.log(`  rows census   : ${got.data.length}   rows screen: ${exp.rows}   ${got.data.length === exp.rows ? '' : '<-- DIFFERS'}`);
    console.log(`  assay census  : ${got.assay}  dataType ${got.dataType}`);
    console.log(`  header diffs  : ${hdrDiffs}   role diffs: ${colDiffs}`);
    console.log(`  VERDICT       : ${colDiffs === 0 && hdrDiffs === 0 ? 'EXACT, per column' : 'DISAGREES'}\n`);
    if (colDiffs || hdrDiffs) allExact = false;
  }
  console.log(`PART 0 VERDICT: ${allExact ? 'exact on all three, per column' : 'at least one per-column disagreement — STOP'}`);
}

// ── --part1 ──────────────────────────────────────────────────────────
// The 27 batch fixtures. Two preps are read, not one: the census path
// (prepStructure, the instrument Parts 0 and 2 use) and validate-batch.mjs's own
// prep, which is different code. Reporting both is the batch-parity check — a
// Part 1 result that only holds on one prep would not describe what the batch
// sees.
async function batchPrepRoles(absPath) {
  const Papa = (await import('papaparse')).default;
  const { preprocessRaw, detectHeaderRows, forwardFill } = await import(resolve(ROOT, 'src/import/parser.js'));
  const { inferRoles, inferBaseRoles } = await import(resolve(ROOT, 'src/import/roles.js'));
  const parsed = Papa.parse(readFileSync(absPath, 'utf-8'), { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  return { hdrs: headers, roles: inferRoles(data, headers, condPerCol),
           base: inferBaseRoles(data, headers, condPerCol), nH: headerRows, nRows: data.length, condPerCol };
}

if (has('part1')) {
  const { EXPECTED } = await import(resolve(ROOT, 'test/batch-fixtures.mjs'));
  const names = Object.keys(EXPECTED);
  console.log(`PART 1 — role inference over the ${names.length} batch fixtures\n`);
  const rows = [];
  let prepDisagreements = 0;
  for (const name of names) {
    const abs = resolve(ROOT, 'test/fixtures', name);
    const c = await censusRoles(abs);
    const b = await batchPrepRoles(abs);
    const same = JSON.stringify(c.roles) === JSON.stringify(b.roles) &&
                 JSON.stringify(c.hdrs.map(String)) === JSON.stringify(b.hdrs.map(String));
    if (!same) prepDisagreements++;
    const rc = roleCountsOf(c.roles);
    rows.push({ name, nH: c.nH, nCols: c.hdrs.length, nRows: c.data.length, rc, same,
                hdrs: c.hdrs, base: c.baseRolesForReport, roles: c.roles,
                condPerCol: c.condPerCol, groupings: c.groupings, assay: c.assay });
    console.log(`${name}  (nH=${c.nH}, ${c.hdrs.length} cols, ${c.data.length} rows, assay=${c.assay})`);
    console.log('  ' + c.hdrs.map((h, i) => {
      const cg = c.condPerCol?.[i] ? `[${c.condPerCol[i]}]` : '';
      const moved = c.baseRolesForReport[i] !== c.roles[i] ? `${ABBR[c.baseRolesForReport[i]]}→` : '';
      return `${h}${cg}=${moved}${ABBR[c.roles[i]]}`;
    }).join('  '));
    console.log(`  counts: Data ${rc.data} / Label ${rc.label} / Cond ${rc.condition} / Attr ${rc.attribute} / ign ${rc.ignore}` +
                `   batch-prep agrees: ${same ? 'yes' : 'NO'}` +
                (c.groupings.length ? `   §2.8 groupings: ${c.groupings.map(g => `${c.hdrs[g.groupCol]}(${g.nLevels}) holds ${g.attrCols.map(a => c.hdrs[a]).join('/')}`).join('; ')}` : ''));
    console.log('');
  }
  console.log('SUMMARY');
  console.log(`  fixtures                          : ${rows.length}`);
  console.log(`  census prep vs validate-batch prep: ${prepDisagreements === 0 ? 'identical on all' : prepDisagreements + ' disagree'}`);
  console.log(`  fixtures with any Attr held out   : ${rows.filter(r => r.rc.attribute > 0).length}`);
  console.log(`  fixtures with 0 Data columns      : ${rows.filter(r => r.rc.data === 0).length}`);
  console.log(`  fixtures with 1 Data column       : ${rows.filter(r => r.rc.data === 1).length}`);
}

// ── --part1x ─────────────────────────────────────────────────────────
// Why no fixture shows the failure. Reports the INPUTS to each role decision —
// the 40-row sample's numeric fraction, its distinct count, and whether the
// header matches either keyword regex — rather than restating the decision. The
// clauses are in src/import/roles.js inferBaseRoles; this prints what they read.
const LABEL_RE = /^(id|name|sample|subject|patient|well|row|res|residue|index|idx|num|no|n|number|#|pos|position|frame|step|time|timepoint|obs|gene|geneid|protein|accession)\b/i;
const COND_RE = /^(group|condition|treatment|dose|conc|ctrl|control|type|category|class|arm|genotype|strain)\b/;

function decisionInputs(data, hdrs, c) {
  const sample = data.slice(0, 40).map(r => r[c]).filter(v => v != null && v !== '');
  const nf = sample.length ? sample.filter(v => !isNaN(Number(v))).length / sample.length : null;
  const uniq = new Set(sample.map(String)).size;
  let full = 0, nonEmpty = 0;
  for (const r of data) { const v = r[c]; if (v == null || v === '') continue; nonEmpty++; if (!isNaN(Number(v))) full++; }
  const lo = hdrs[c] != null ? String(hdrs[c]).toLowerCase().trim() : '';
  return { nSample: sample.length, nf, uniq, uniqFrac: sample.length ? uniq / sample.length : null,
           fullNumericFrac: nonEmpty ? full / nonEmpty : null, nonEmpty,
           labelKw: LABEL_RE.test(lo), condKw: COND_RE.test(lo) };
}

if (has('part1x')) {
  const { EXPECTED } = await import(resolve(ROOT, 'test/batch-fixtures.mjs'));
  console.log('PART 1x — the inputs each role decision reads, on the 27 fixtures\n');
  let condCols = 0, numericCond = 0, reach28 = 0, withGroupings = 0, naHeavy = 0;
  console.log(`${pad('fixture', 40)}${rpad('rows', 6)}${rpad('§2.8', 6)}${rpad('grp', 5)}  condition columns (sample nf / distinct / full-col numeric / condKw)`);
  for (const name of Object.keys(EXPECTED)) {
    const abs = resolve(ROOT, 'test/fixtures', name);
    const c = await censusRoles(abs);
    const reaches = c.data.length >= 50 && c.roles.length >= 2;
    if (reaches) reach28++;
    if (c.groupings.length) withGroupings++;
    const parts = [];
    for (let i = 0; i < c.roles.length; i++) {
      if (c.roles[i] !== 'condition') continue;
      condCols++;
      const d = decisionInputs(c.data, c.hdrs, i);
      if (d.fullNumericFrac >= 0.5) numericCond++;
      if (d.nonEmpty < c.data.length * 0.5) naHeavy++;
      parts.push(`${c.hdrs[i]}(nf=${d.nf.toFixed(2)} u=${d.uniq} full=${d.fullNumericFrac.toFixed(2)} kw=${d.condKw ? 'Y' : 'n'})`);
    }
    console.log(`${pad(name, 40)}${rpad(c.data.length, 6)}${rpad(reaches ? 'yes' : 'no', 6)}${rpad(c.groupings.length, 5)}  ${parts.join(' ') || '—'}`);
  }
  console.log('\nSUMMARY');
  console.log(`  fixtures reaching the §2.8 group-attribute pass (rows >= 50): ${reach28} / 27`);
  console.log(`  fixtures where §2.8 held ANY column out                     : ${withGroupings} / 27`);
  console.log(`  condition-role columns across all 27 fixtures               : ${condCols}`);
  console.log(`  ... of those, majority-numeric over the full column         : ${numericCond}`);
  console.log(`  ... of those, under half the rows populated                 : ${naHeavy}`);
}

// ── --part0x ─────────────────────────────────────────────────────────
// Attribution on the three deposits: the inputs each role decision reads. This
// describes ONE observed instance per file. It is not a census signature and
// nothing is derived from it — see the halt condition in Part 1.
if (has('part0x')) {
  console.log('PART 0x — the inputs each role decision reads, on the three deposits\n');
  for (const [pos, exp] of Object.entries(SCREEN)) {
    const c = await censusRoles(resolve(ROOT, exp.file));
    console.log(`${pos} · ${basename(exp.file)}  (${c.data.length} rows)`);
    console.log(`  ${pad('header', 20)}${pad('base', 7)}${pad('final', 7)}${rpad('nSample', 8)}${rpad('nf', 7)}${rpad('uniq', 6)}${rpad('u/n', 7)}${rpad('fullNum', 9)}${rpad('popFrac', 9)}  kw`);
    for (let i = 0; i < c.roles.length; i++) {
      const d = decisionInputs(c.data, c.hdrs, i);
      const kw = (d.labelKw ? 'label ' : '') + (d.condKw ? 'cond' : '');
      console.log(`  ${pad(c.hdrs[i], 20)}${pad(ABBR[c.baseRolesForReport[i]], 7)}${pad(ABBR[c.roles[i]], 7)}` +
        `${rpad(d.nSample, 8)}${rpad(d.nf == null ? '-' : d.nf.toFixed(2), 7)}${rpad(d.uniq, 6)}` +
        `${rpad(d.uniqFrac == null ? '-' : d.uniqFrac.toFixed(2), 7)}` +
        `${rpad(d.fullNumericFrac == null ? '-' : d.fullNumericFrac.toFixed(2), 9)}` +
        `${rpad((d.nonEmpty / c.data.length).toFixed(2), 9)}  ${kw}`);
    }
    if (c.groupings.length) {
      console.log('  §2.8 groupings:');
      for (const g of c.groupings) {
        console.log(`    ${c.hdrs[g.groupCol]} (${g.nLevels} levels) holds constant: ${g.attrCols.map(a => c.hdrs[a]).join(', ')}`);
      }
    }
    // What the non-numeric cells in the base-Cond columns actually are.
    const tokens = {};
    for (let i = 0; i < c.roles.length; i++) {
      if (c.baseRolesForReport[i] !== 'condition') continue;
      for (const r of c.data.slice(0, 40)) {
        const v = r[i];
        if (v == null || v === '') continue;
        if (isNaN(Number(v))) tokens[String(v)] = (tokens[String(v)] || 0) + 1;
      }
    }
    const top = Object.entries(tokens).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length) console.log(`  non-numeric tokens in the 40-row sample of base-Cond columns: ${top.map(([t, n]) => `"${t}"×${n}`).join(', ')}`);
    console.log('');
  }
}

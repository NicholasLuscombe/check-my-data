/* S394 — will the round-2 sitting measure a starved battery? A fragmentation forecast.
   READ-ONLY on src/. No src/ file is modified. NOTHING HERE RUNS A TEST.
   No runFullAnalysis, no verdict, no flag, no severity on any round-2 deposit —
   this stops where §6.2's own selection path stops, at extractAnalysisInputs.

   Fourth pass of S394. The three committed probes carry s395/s396 in their
   filenames; there are no sessions 395 or 396.

   Instrument. The same load-time hook, test/probes/s395-corpus-run-hook.mjs.
   The condition structure is read off the SHIPPED condCtx — `slices()`,
   `rowGroupsStatus()` and the `groupingTrigger` that extractAnalysisInputs
   stamps on — never re-derived. The only thing this probe supplies that
   corpus-run does not is the `colRelationship` value, which is a shipped
   parameter of extractAnalysisInputs and the first gate the sitting asks.

   Modes:
     --source                     what the source says about condition formation
     --pop thirty|round1          population
     --structure                  Part 1: fragmentation under both configurations
     --calibrate                  Part 2: cov.ran against fragmentation, round 1
     --forecast                   Part 3: apply Part 2 to Part 1
     --roles <path>               the census artifact supplying the m1B marks
     --out <path>                 write per-sheet records as JSON

   Usage:
     node --import ./test/probes/s395-corpus-run-hook.mjs \
          test/probes/probe-s394-fragmentation.mjs --source
*/
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : undefined; };
const has = n => argv.includes('--' + n);

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CR = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
if (typeof CR.prepStructure !== 'function') {
  console.error('The hook did not load. Run with:\n  node --import ./test/probes/s395-corpus-run-hook.mjs ' +
                'test/probes/probe-s394-fragmentation.mjs --source');
  process.exit(2);
}
const { extractAnalysisInputs } = await import(resolve(ROOT, 'src/analysis/engine.js'));
const { MIN_GROUP_ROWS, MIN_GROUP_COLUMNS } = await import(resolve(ROOT, 'src/analysis/aggregation.js'));
const { parseExcel, getSheetNames } = await import(resolve(ROOT, 'src/import/excel.js'));
const Papa = (await import('papaparse')).default;

const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

// ── The thresholds the CODE uses, read from source rather than assumed ──
// MIN_PER_GROUP and THIN_MEDIAN are module-private in groupingTrigger.js, so
// they cannot be imported. They are read off the declaration with an anchor
// that throws if it moves — never transcribed. §2.8's MIN_ROWS_FOR_GROUPING
// (50) is a DIFFERENT threshold governing a different pass and does not carry
// over here; it is read too, so the record can say so with a number.
function readConst(file, name) {
  const src = readFileSync(resolve(ROOT, file), 'utf8');
  const m = src.match(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*(\\d+)\\s*;`));
  if (!m) throw new Error(`anchor for ${name} not found in ${file}`);
  return { value: Number(m[1]), file };
}
const MIN_PER_GROUP = readConst('src/analysis/groupingTrigger.js', 'MIN_PER_GROUP');
const THIN_MEDIAN = readConst('src/analysis/groupingTrigger.js', 'THIN_MEDIAN');
const MIN_ROWS_FOR_GROUPING = readConst('src/import/roles.js', 'MIN_ROWS_FOR_GROUPING');

if (has('source')) {
  const cc = readFileSync(resolve(ROOT, 'src/analysis/conditionContext.js'), 'utf8');
  const en = readFileSync(resolve(ROOT, 'src/analysis/engine.js'), 'utf8');
  console.log('HOW A CONDITION IS FORMED, read at source\n');
  console.log('  engine.js extractAnalysisInputs builds the row-condition label as:');
  const m = en.match(/const parts=condCols\.map[\s\S]*?\n\s*return parts\.join\([^)]*\)\|\|null;/);
  console.log(m ? '    ' + m[0].split('\n').map(s => s.trim()).join('\n    ') : '    (anchor not found)');
  console.log('\n  So multiple condition columns MERGE into one label per row — the levels are the');
  console.log('  DISTINCT OBSERVED COMBINATIONS, a cross-product restricted to what occurs, not one');
  console.log('  factor and not the product of the cardinalities. `.filter(Boolean)` drops a blank');
  console.log('  part, so two rows differing only in which condition column is blank land in');
  console.log('  DIFFERENT groups.');
  console.log('\n  conditionContext.js type selection:');
  const t = cc.match(/let type, paired;[\s\S]*?\n  const has = type/);
  console.log(t ? '    ' + t[0].split('\n').map(s => s.trim()).join('\n    ') : '    (anchor not found)');
  console.log('\n  Under colRelationship="conditions" with >= 2 data columns the sheet is claimed');
  console.log('  column-grouped and EACH DATA COLUMN becomes its own condition; slices() then');
  console.log('  returns one single-column sub-matrix per data column with >= 3 non-null rows.');
  console.log('  engine.js:176 passes an EMPTY condColSet on the column-grouped branch, so the');
  console.log('  grouping trigger reads attempted:false and the row partition is not consulted');
  console.log('  for grouping — but rowGroups()/rowGroupsStatus() still partition by row');
  console.log('  condition, because their guard is `hasGroups || !hasRowConds`.');
  console.log('\nTHRESHOLDS THE CODE ITSELF USES\n');
  console.log(`  MIN_PER_GROUP          = ${MIN_PER_GROUP.value}   (${MIN_PER_GROUP.file}) a group is "usable" at >= this many rows`);
  console.log(`  THIN_MEDIAN            = ${THIN_MEDIAN.value}   (${THIN_MEDIAN.file}) arm 2 fires when the median group size is <= this`);
  console.log(`  slices() row filter    = 3   (conditionContext.js) a row-grouped slice needs >= 3 rows to exist`);
  console.log(`  MIN_GROUP_ROWS         = ${MIN_GROUP_ROWS}   (aggregation.js) column-group drop rule`);
  console.log(`  MIN_GROUP_COLUMNS      = ${MIN_GROUP_COLUMNS}   (aggregation.js) column-group drop rule`);
  console.log(`  MIN_ROWS_FOR_GROUPING  = ${MIN_ROWS_FOR_GROUPING.value}  (${MIN_ROWS_FOR_GROUPING.file}) — the §2.8 group-attribute pass's ROW floor.`);
  console.log('                              A different pass and a different question. It does NOT');
  console.log('                              carry over to group formation and is not used below.');
}

// ── Populations ──────────────────────────────────────────────────────
const DATA_EXT = new Set(['.csv', '.tsv', '.txt', '.xlsx', '.xls']);
async function readRound1() {
  const dir = resolve(ROOT, 'corpus-data');
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) continue;                 // skips round2/
    if (!DATA_EXT.has(extname(name).toLowerCase())) continue;
    const ext = extname(name).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      let names;
      try { names = await getSheetNames(new Blob([readFileSync(abs)])); } catch { continue; }
      names.forEach((sh, i) => out.push({ file: name, sheet: sh, sheetIndex1: i + 1, path: `corpus-data/${name}`,
                                          label: `${name.replace(/\.(xlsx|xls)$/i, '')} :: ${sh}` }));
    } else {
      out.push({ file: name, sheet: name, sheetIndex1: 1, path: `corpus-data/${name}`, label: name });
    }
  }
  return out;
}
function readThirty() {
  const doc = readFileSync(resolve(ROOT, 'docs/shared/ROUND2-RUN-LOG.md'), 'utf8');
  const start = doc.indexOf('## 4 — The thirty'), end = doc.indexOf('## 5 — Counts');
  if (start < 0 || end < 0) throw new Error('ROUND2-RUN-LOG.md §4/§5 heading not found.');
  const out = [];
  for (const line of doc.slice(start, end).split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(doi:[^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\|/);
    if (!m) continue;
    const pos = Number(m[1]);
    out.push({ position: pos, file: m[3], sheet: m[4], path: `corpus-data/round2/pos-${String(pos).padStart(2, '0')}/${m[3]}`,
               label: `pos-${String(pos).padStart(2, '0')} ${m[3]}` });
  }
  return out;
}

async function rawOf(entry) {
  const abs = resolve(ROOT, entry.path);
  const ext = extname(abs).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const { rows } = await parseExcel(new Blob([readFileSync(abs)]), entry.sheet);
    return rows;
  }
  return Papa.parse(readFileSync(abs, 'utf-8'), { header: false, skipEmptyLines: false }).data;
}

const stats = arr => {
  if (!arr.length) return { n: 0, min: null, med: null, mode: null, ones: 0, belowUsable: 0 };
  const s = [...arr].sort((a, b) => a - b);
  const med = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const freq = new Map();
  for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
  let mode = null, best = -1;
  for (const [v, c] of [...freq.entries()].sort((a, b) => a[0] - b[0])) if (c > best) { best = c; mode = v; }
  return { n: arr.length, min: s[0], med, mode, ones: arr.filter(v => v === 1).length,
           belowUsable: arr.filter(v => v < MIN_PER_GROUP.value).length };
};

// ── One sheet, both configurations ───────────────────────────────────
async function measure(entry) {
  const raw = await rawOf(entry);
  const s = CR.prepStructure(raw, undefined);
  const { config, assay, dataType } = CR.buildAnalysisConfig({
    entry: { path: resolve(ROOT, entry.path) }, hdrs: s.hdrs, data: s.data,
    condPerCol: s.condPerCol, roles: s.roles, longFormatDetected: s.longFormatDetected });

  // ImportView builds this (App.jsx) and corpus-run does not; it names conditions
  // in conditions-mode and changes no count. Supplied for fidelity.
  const dataColHeaders = s.roles.map((r, i) => r === 'data' ? (s.hdrs?.[i] ?? `Col ${i + 1}`) : null).filter(h => h !== null);

  const rec = { ...entry, assay, dataType, nRows: s.data.length, nCols: s.hdrs.length,
                nDataCols: s.roles.filter(r => r === 'data').length,
                condCols: s.roles.map((r, i) => r === 'condition' ? i : -1).filter(i => i >= 0)
                            .map(i => ({ idx: i, header: String(s.hdrs[i]),
                                         levels: new Set(s.data.map(r => r[i]).filter(v => v != null && String(v).trim() !== '').map(String)).size })),
                cfg: {} };

  for (const colRel of ['replicates', 'conditions']) {
    let out;
    try {
      const { matrix, condCtx } = extractAnalysisInputs({ ...config, colRelationship: colRel, dataColHeaders });
      const sl = condCtx.slices();
      const rowSizes = sl.map(x => x.matrix.length);
      const colWidths = sl.map(x => (x.matrix[0]?.length ?? 0));
      const trig = condCtx.groupingTrigger || {};
      const rgs = condCtx.rowGroupsStatus ? condCtx.rowGroupsStatus() : null;
      out = {
        ok: true, type: condCtx.type, paired: condCtx.paired, count: condCtx.count,
        validRows: matrix.length, nMatrixCols: matrix[0]?.length || 0,
        nSlices: sl.length, rowSizes: stats(rowSizes), colWidths: stats(colWidths),
        // the trigger's own partition — under `conditions` engine.js passes an
        // empty condColSet, so this reads attempted:false by construction
        trigger: { attempted: !!trig.attempted, nGroups: trig.nGroups ?? null, median: trig.median ?? null,
                   condCols: trig.condCols ?? null, arm1: !!trig.arm1, arm2: !!trig.arm2, pending: !!trig.pending,
                   sizes: trig.sizes || [] },
        rowPartition: rgs ? { attempted: rgs.attempted, usable: rgs.usable, reason: rgs.reason ?? null,
                              nGroups: rgs.nGroups ?? null, medianSize: rgs.medianSize ?? null,
                              stats: stats(rgs.sizes || []) } : null,
      };
    } catch (e) { out = { ok: false, error: e.message }; }
    rec.cfg[colRel] = out;
  }
  return rec;
}

// ── Drive ────────────────────────────────────────────────────────────
const POP = flag('pop');
let recs = [];
if (POP) {
  if (!['thirty', 'round1'].includes(POP)) { console.error('--pop thirty | round1'); process.exit(2); }
  const entries = POP === 'thirty' ? readThirty() : await readRound1();
  if (POP === 'thirty' && entries.length !== 30) { console.error(`§4 parsed ${entries.length} rows, expected 30.`); process.exit(2); }
  for (const e of entries) {
    try { recs.push(await measure(e)); }
    catch (err) { recs.push({ ...e, error: err.message }); }
  }
}
const ok = recs.filter(r => !r.error && r.cfg?.replicates?.ok);

// m1B marks come from the census artifact, not from a re-derivation here.
let m1byLabel = null;
const rolesPath = flag('roles');
if (typeof rolesPath === 'string') {
  const j = JSON.parse(readFileSync(resolve(ROOT, rolesPath), 'utf8'));
  m1byLabel = new Map();
  for (const r of j.records) {
    const key = `pos-${String(r.position).padStart(2, '0')} ${r.file}`;
    m1byLabel.set(key, { m1: r.m1 || [], m1B: r.m1B || [], hdrs: r.hdrs || [] });
  }
}

if (has('structure')) {
  console.log(`\nPART 1 — fragmentation of ${POP}, from structure alone\n`);
  console.log(`Group size is ROWS per group. "thin" is the code's own THIN_MEDIAN = ${THIN_MEDIAN.value};`);
  console.log(`"unusable" is below MIN_PER_GROUP = ${MIN_PER_GROUP.value}. Both read from source, not assumed.\n`);
  for (const cfgName of ['replicates', 'conditions']) {
    console.log(`── configuration: colRelationship = ${cfgName} ${cfgName === 'replicates' ? "(arm A's hardcoded default, row semantics ordered)" : '(the other gate answer)'}\n`);
    // TWO partitions are reported and they are different objects.
    //   part…  the FULL row-condition partition (rowGroupsStatus), singletons
    //          included — this is where n=1 and below-MIN_PER_GROUP live.
    //   surv…  the slices the tests actually receive. slices() pre-filters at
    //          >= 3 rows, so a singleton count taken from it is structurally 0.
    // `drop` is how many groups the >= 3 filter removes: the starvation itself.
    console.log(`${pad('sheet', 32)}${rpad('type', 14)}| full partition: ${rpad('grp', 5)}${rpad('min', 5)}${rpad('med', 6)}${rpad('n=1', 5)}${rpad('<' + MIN_PER_GROUP.value, 4)}` +
                ` | surviving: ${rpad('grp', 5)}${rpad('drop', 5)}${rpad('med', 6)}${rpad('wid', 5)}${rpad('thin', 6)}  condition columns (levels)`);
    for (const r of ok) {
      const c = r.cfg[cfgName];
      if (!c?.ok) { console.log(`${pad(r.label.slice(0, 33), 34)}  ERROR ${c?.error || ''}`); continue; }
      const marks = m1byLabel?.get(r.label);
      const cc = r.condCols.map(x => {
        const inv = marks && marks.m1B.includes(x.idx);
        return `${x.header}(${x.levels})${inv ? '*' : ''}`;
      }).join(' ');
      const thin = c.rowSizes.med != null && c.rowSizes.med <= THIN_MEDIAN.value;
      const P = c.rowPartition?.attempted ? c.rowPartition.stats : null;
      const drop = P ? P.n - c.nSlices : null;
      console.log(`${pad(r.label.slice(0, 31), 32)}${rpad(c.type, 14)}|                 ${rpad(P ? P.n : '-', 5)}${rpad(P ? P.min : '-', 5)}` +
        `${rpad(P ? P.med : '-', 6)}${rpad(P ? P.ones : '-', 5)}${rpad(P ? P.belowUsable : '-', 4)}` +
        ` |            ${rpad(c.nSlices, 5)}${rpad(drop ?? '-', 5)}${rpad(c.rowSizes.med ?? '-', 6)}` +
        `${rpad(c.colWidths.med ?? '-', 5)}${rpad(thin ? 'THIN' : '-', 6)}  ${cc.slice(0, 62) || '(none)'}`);
    }
    const sizes = ok.map(r => r.cfg[cfgName]).filter(c => c?.ok);
    const thinN = sizes.filter(c => c.rowSizes.med != null && c.rowSizes.med <= THIN_MEDIAN.value).length;
    const withPart = sizes.filter(c => c.rowPartition?.attempted);
    console.log(`\n  sheets                              : ${sizes.length}`);
    console.log(`  median group size <= ${THIN_MEDIAN.value} (thin), surviving: ${thinN}`);
    console.log(`  FULL PARTITION, over the ${withPart.length} sheets that have one:`);
    console.log(`    any group below MIN_PER_GROUP = ${MIN_PER_GROUP.value} : ${withPart.filter(c => c.rowPartition.stats.belowUsable > 0).length}`);
    console.log(`    any singleton group               : ${withPart.filter(c => c.rowPartition.stats.ones > 0).length}`);
    console.log(`    groups dropped by the >= 3 filter : ${withPart.reduce((a, c) => a + (c.rowPartition.stats.n - c.nSlices), 0)}` +
                ` of ${withPart.reduce((a, c) => a + c.rowPartition.stats.n, 0)}`);
    console.log(`    sheets losing ANY group to it     : ${withPart.filter(c => c.rowPartition.stats.n > c.nSlices).length}`);
    console.log(`    sheets left with ZERO groups      : ${withPart.filter(c => c.nSlices === 0).length}`);
    console.log(`  groups, median across sheets        : ${stats(sizes.map(c => c.nSlices)).med}`);
    console.log(`  group WIDTH, median across sheets   : ${stats(sizes.map(c => c.colWidths.med ?? 0)).med}`);
    console.log(`  condCtx.type = column-grouped       : ${sizes.filter(c => c.type === 'column-grouped').length}`);
    console.log(`  grouping trigger pending            : ${sizes.filter(c => c.trigger.pending).length}\n`);
  }
  if (m1byLabel) {
    const owed = ok.filter(r => {
      const marks = m1byLabel.get(r.label);
      return marks && r.condCols.some(x => marks.m1B.includes(x.idx));
    });
    console.log(`SHEETS WHOSE CONDITION STRUCTURE OWES SOMETHING TO AN INVERTED COLUMN (census m1B): ${owed.length} of ${ok.length}\n`);
    for (const r of owed) {
      const marks = m1byLabel.get(r.label);
      const inv = r.condCols.filter(x => marks.m1B.includes(x.idx));
      const invLevels = inv.reduce((a, x) => a + x.levels, 0);
      const c = r.cfg.replicates;
      console.log(`  ${pad(r.label.slice(0, 32), 33)} ${rpad(c.nSlices, 5)} groups  |  inverted: ${inv.map(x => `${x.header}(${x.levels})`).join(', ')}` +
                  `  |  all cond levels ${r.condCols.reduce((a, x) => a + x.levels, 0)}, inverted share ${invLevels}`);
    }
  }
}

const outPath = flag('out');
if (typeof outPath === 'string' && recs.length) {
  writeFileSync(resolve(ROOT, outPath), JSON.stringify({ population: POP, records: recs }, null, 1));
  console.log(`\nwrote ${outPath}`);
}

// ── --calibrate — Part 2: cov.ran against fragmentation, on round 1 ──
// cov.ran is derivable exactly from a recorded run: classifyCoverage returns
// "ran" iff the flag is HIGH / MODERATE / LOW (coverage.js VERDICT_FLAGS), and
// nothing else in that function can reclassify a verdict flag. So the s379
// artifact's per-test flag array is enough and no re-run is needed.
const VERDICT = new Set(['HIGH', 'MODERATE', 'LOW']);

// Fragmentation band, from the SURVIVING slices — the groups a test is handed.
// `none` is not a band on the same axis: it means the sheet has no condition
// column at all and the whole matrix is one group, which is the opposite of
// fragmented and must not be averaged in with it.
function band(c) {
  if (!c?.ok) return 'error';
  if (c.type === 'none') return 'no conditions';
  const n = c.nSlices;
  if (n === 0) return '0 groups (starved)';
  const m = c.rowSizes.med;
  if (m <= THIN_MEDIAN.value) return `median <= ${THIN_MEDIAN.value} (thin)`;
  if (m < 10) return 'median 5-9';
  if (m < 20) return 'median 10-19';
  if (m < 50) return 'median 20-49';
  return 'median >= 50';
}
const BAND_ORDER = ['0 groups (starved)', `median <= ${THIN_MEDIAN.value} (thin)`, 'median 5-9',
                    'median 10-19', 'median 20-49', 'median >= 50', 'no conditions'];

if (has('calibrate')) {
  const s379Path = resolve(ROOT, 'corpus-out/s379-honest-run.json');
  if (!existsSync(s379Path)) { console.error('corpus-out/s379-honest-run.json is absent — the calibration base.'); process.exit(2); }
  const s379 = JSON.parse(readFileSync(s379Path, 'utf8'));
  const runByLabel = new Map();
  for (const d of s379.datasets || []) {
    if (d.error || !Array.isArray(d.tests)) continue;
    runByLabel.set(d.label, d);
  }
  // Optional cross-check against this session's measured cov, when present.
  const stage1 = flag('stage1');
  let measured = new Map();
  if (typeof stage1 === 'string' && existsSync(resolve(ROOT, stage1))) {
    // The sensitivity probe labels a sheet `file.xlsx [Sheet]`; this one uses
    // `file :: Sheet`. Join on (path, sheet), which both carry, rather than on
    // either label — a label join silently found zero overlaps on first run.
    const j = JSON.parse(readFileSync(resolve(ROOT, stage1), 'utf8'));
    for (const r of j.records) {
      const a = r.offsets?.[0]?.A;
      if (a?.ok) measured.set(`${r.path}|${r.sheet}`, a.cov.ran);
    }
  }

  const joined = [];
  for (const r of ok) {
    const d = runByLabel.get(r.label);
    if (!d) continue;
    const ran = d.tests.filter(t => VERDICT.has(t.flag)).length;
    joined.push({ r, d, ran, band: band(r.cfg.replicates) });
  }
  console.log(`\nPART 2 — cov.ran against fragmentation, round 1\n`);
  console.log(`  round-1 sheets measured for structure : ${ok.length}`);
  console.log(`  ... with a recorded run in s379       : ${joined.length}`);
  console.log(`  cov.ran derived from the flag array   : "ran" iff flag in {HIGH, MODERATE, LOW}\n`);

  if (measured.size) {
    console.log('  CROSS-CHECK against this session\'s measured cov.ran (arm A):');
    let agree = 0, seen = 0;
    for (const j of joined) {
      const m = measured.get(`${j.r.path}|${j.r.sheet}`);
      if (m == null) continue;
      seen++; if (m === j.ran) agree++;
      console.log(`    ${pad(j.r.label.slice(0, 40), 41)} s379-derived ${rpad(j.ran, 3)}  measured ${rpad(m, 3)}  ${m === j.ran ? 'agree' : 'DIFFER'}`);
    }
    console.log(`    ${agree} of ${seen} agree\n`);
  }

  console.log(`${pad('band', 26)}${rpad('sheets', 8)}${rpad('cov.ran min', 13)}${rpad('median', 8)}${rpad('max', 6)}${rpad('mean', 7)}`);
  for (const b of BAND_ORDER) {
    const rows = joined.filter(j => j.band === b);
    if (!rows.length) continue;
    const v = rows.map(j => j.ran).sort((a, x) => a - x);
    const med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    console.log(`${pad(b, 26)}${rpad(rows.length, 8)}${rpad(v[0], 13)}${rpad(med, 8)}${rpad(v[v.length - 1], 6)}${rpad((v.reduce((a, x) => a + x, 0) / v.length).toFixed(1), 7)}`);
  }

  console.log('\n  per sheet — with the two confounders alongside, because they dominate\n');
  console.log(`${pad('sheet', 40)}${rpad('rows', 7)}${rpad('dCols', 6)}${rpad('grp', 5)}${rpad('med', 7)}${rpad('cov.ran', 9)}  band`);
  for (const j of [...joined].sort((a, b) => a.ran - b.ran)) {
    const c = j.r.cfg.replicates;
    console.log(`${pad(j.r.label.slice(0, 39), 40)}${rpad(c.validRows, 7)}${rpad(c.nMatrixCols, 6)}${rpad(c.nSlices, 5)}` +
                `${rpad(c.rowSizes.med ?? '-', 7)}${rpad(j.ran, 9)}  ${j.band}`);
  }

  // ── the confound, controlled rather than mentioned ──
  // Sheet size and data-column count both cap cov.ran on their own: a 3-row
  // figure sheet starves for size, not for fragmentation. Re-run the band table
  // over sheets big enough that neither can be the binding constraint.
  const MIN_ROWS = 50, MIN_DCOLS = 3;
  const big = joined.filter(j => j.r.cfg.replicates.validRows >= MIN_ROWS && j.r.cfg.replicates.nMatrixCols >= MIN_DCOLS);
  console.log(`\n  CONTROLLED — sheets with >= ${MIN_ROWS} valid rows AND >= ${MIN_DCOLS} data columns (${big.length} of ${joined.length})\n`);
  console.log(`${pad('band', 26)}${rpad('sheets', 8)}${rpad('cov.ran min', 13)}${rpad('median', 8)}${rpad('max', 6)}`);
  for (const b of BAND_ORDER) {
    const rows = big.filter(j => j.band === b);
    if (!rows.length) continue;
    const v = rows.map(j => j.ran).sort((a, x) => a - x);
    const med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    console.log(`${pad(b, 26)}${rpad(rows.length, 8)}${rpad(v[0], 13)}${rpad(med, 8)}${rpad(v[v.length - 1], 6)}`);
  }

  // ── the mechanism, not the correlation: which tests go N/A as groups thin ──
  console.log('\n  WHICH TESTS ARE NOT-APPLICABLE, BY BAND (share of sheets in the band)\n');
  const bands = BAND_ORDER.filter(b => joined.some(j => j.band === b));
  const names = [...new Set(joined.flatMap(j => j.d.tests.map(t => t.name)))].sort();
  console.log(`${pad('test', 34)}${bands.map(b => rpad(b.slice(0, 11), 13)).join('')}`);
  for (const n of names) {
    const cells = bands.map(b => {
      const rows = joined.filter(j => j.band === b);
      const na = rows.filter(j => { const t = j.d.tests.find(x => x.name === n); return t && !VERDICT.has(t.flag); }).length;
      return rpad(rows.length ? `${na}/${rows.length}` : '-', 13);
    });
    // only print tests that are not-applicable somewhere and applicable somewhere
    const anyNA = cells.some(c => !/^ *0\//.test(c) && c.trim() !== '-');
    const anyRan = bands.some(b => joined.filter(j => j.band === b)
      .some(j => { const t = j.d.tests.find(x => x.name === n); return t && VERDICT.has(t.flag); }));
    if (anyNA && anyRan) console.log(`${pad(n.slice(0, 33), 34)}${cells.join('')}`);
  }

  // ── the fragmentation-starved set, derived rather than asserted ──
  // A test starved by FRAGMENTATION runs on an ungrouped sheet and stops when
  // groups thin. A test that needs conditions at all is N/A on both and is a
  // different thing. Split on the two band columns.
  {
    const thinB = `median <= ${THIN_MEDIAN.value} (thin)`;
    const thinRows = joined.filter(j => j.band === thinB);
    const noneRows = joined.filter(j => j.band === 'no conditions');
    const naRate = (rows, n) => rows.length
      ? rows.filter(j => { const t = j.d.tests.find(x => x.name === n); return t && !VERDICT.has(t.flag); }).length / rows.length : null;
    const starved = [], condOnly = [];
    for (const n of names) {
      const a = naRate(thinRows, n), b = naRate(noneRows, n);
      if (a == null || b == null) continue;
      if (a >= 0.8 && b <= 0.5) starved.push([n, a, b]);
      else if (a >= 0.8 && b >= 0.8) condOnly.push([n, a, b]);
    }
    console.log('\n  STARVED BY FRAGMENTATION — N/A on >= 80% of thin sheets, but on <= 50% of ungrouped ones\n');
    for (const [n, a, b] of starved) console.log(`    ${pad(n, 36)} thin ${(100 * a).toFixed(0)}%   ungrouped ${(100 * b).toFixed(0)}%`);
    console.log(`    -> ${starved.length} tests\n`);
    console.log('  NEEDS CONDITIONS AT ALL — N/A on >= 80% of both, so not a fragmentation effect\n');
    for (const [n, a, b] of condOnly) console.log(`    ${pad(n, 36)} thin ${(100 * a).toFixed(0)}%   ungrouped ${(100 * b).toFixed(0)}%`);
    console.log(`    -> ${condOnly.length} tests`);
  }

  // At what group size does a test stop running? Smallest median group size at
  // which each test still ran, and largest at which it did not.
  console.log('\n  THE SIZE AT WHICH EACH TEST STOPS — median surviving group size\n');
  console.log(`${pad('test', 34)}${rpad('ran at med >=', 15)}${rpad('N/A at med <=', 15)}${rpad('ran/total', 10)}`);
  for (const n of names) {
    const ranMeds = [], naMeds = [];
    for (const j of joined) {
      const t = j.d.tests.find(x => x.name === n);
      if (!t) continue;
      const m = j.r.cfg.replicates.type === 'none' ? Infinity : j.r.cfg.replicates.rowSizes.med;
      (VERDICT.has(t.flag) ? ranMeds : naMeds).push(m);
    }
    if (!ranMeds.length || !naMeds.length) continue;
    const minRan = Math.min(...ranMeds), maxNA = Math.max(...naMeds.filter(Number.isFinite));
    console.log(`${pad(n.slice(0, 33), 34)}${rpad(Number.isFinite(minRan) ? minRan : 'no conds only', 15)}` +
                `${rpad(Number.isFinite(maxNA) ? maxNA : '-', 15)}${rpad(`${ranMeds.length}/${ranMeds.length + naMeds.length}`, 10)}`);
  }
}

// ── --forecast — Part 3 ──────────────────────────────────────────────
// Applies Part 2's band relationship to Part 1's structure. Walks both
// populations itself so the two halves cannot drift apart between runs.
// Reports a band median with the band's observed range; never a point, because
// the controlled bands hold 2 to 12 sheets.
if (has('forecast')) {
  const s379 = JSON.parse(readFileSync(resolve(ROOT, 'corpus-out/s379-honest-run.json'), 'utf8'));
  const runByLabel = new Map();
  for (const d of s379.datasets || []) if (!d.error && Array.isArray(d.tests)) runByLabel.set(d.label, d);

  const r1 = [];
  for (const e of await readRound1()) {
    try { const m = await measure(e); if (m.cfg?.replicates?.ok) r1.push(m); } catch { /* not importable */ }
  }
  const joined = [];
  for (const r of r1) {
    const d = runByLabel.get(r.label);
    if (!d) continue;
    joined.push({ r, ran: d.tests.filter(t => VERDICT.has(t.flag)).length, band: band(r.cfg.replicates) });
  }
  const MIN_ROWS = 50, MIN_DCOLS = 3;
  const big = joined.filter(j => j.r.cfg.replicates.validRows >= MIN_ROWS && j.r.cfg.replicates.nMatrixCols >= MIN_DCOLS);
  const bandStat = new Map();
  for (const b of BAND_ORDER) {
    const v = big.filter(j => j.band === b).map(j => j.ran).sort((a, x) => a - x);
    if (!v.length) continue;
    bandStat.set(b, { n: v.length, min: v[0], max: v[v.length - 1],
                      med: v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2 });
  }
  const maxGroupsSeen = Math.max(...big.map(j => j.r.cfg.replicates.nSlices));

  console.log('\nPART 3 — the forecast\n');
  console.log('  calibration: round 1, controlled to >= 50 valid rows and >= 3 data columns');
  console.log(`${pad('  band', 28)}${rpad('sheets', 8)}${rpad('cov.ran med', 13)}${rpad('range', 10)}`);
  for (const [b, st] of bandStat) console.log(`${pad('  ' + b, 28)}${rpad(st.n, 8)}${rpad(st.med, 13)}${rpad(st.min + '-' + st.max, 10)}`);
  console.log(`\n  round-1 calibration tops out at ${maxGroupsSeen} surviving groups; anything above that is`);
  console.log('  an extrapolation and is marked EXTRAP below.\n');

  const thirty = [];
  for (const e of readThirty()) { try { thirty.push(await measure(e)); } catch (err) { thirty.push({ ...e, error: err.message }); } }

  for (const cfgName of ['replicates', 'conditions']) {
    console.log(`\n── forecast under colRelationship = ${cfgName}\n`);
    console.log(`${pad('deposit', 34)}${rpad('grp', 6)}${rpad('med', 6)}${pad('band', 24)}${rpad('cov.ran', 9)}${rpad('range', 10)}  note`);
    const preds = [];
    for (const r of thirty) {
      const c = r.cfg?.[cfgName];
      if (!c?.ok) { console.log(`${pad(r.label.slice(0, 33), 34)}  (not measurable)`); continue; }
      const b = band(c);
      const st = bandStat.get(b);
      const extrap = c.nSlices > maxGroupsSeen;
      const notes = [];
      if (extrap) notes.push('EXTRAP');
      if (!st) notes.push('NO CALIBRATION BAND');
      if (c.colWidths.med === 1) notes.push('groups 1 col wide');
      if (st) preds.push(st.med);
      console.log(`${pad(r.label.slice(0, 33), 34)}${rpad(c.nSlices, 6)}${rpad(c.rowSizes.med ?? '-', 6)}${pad(b, 24)}` +
                  `${rpad(st ? st.med : '-', 9)}${rpad(st ? st.min + '-' + st.max : '-', 10)}  ${notes.join(', ')}`);
    }
    const v = [...preds].sort((a, b2) => a - b2);
    const med = v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null;
    console.log(`\n  forecast distribution over ${v.length} of 30 deposits: min ${v[0]} median ${med} max ${v[v.length - 1]}`);
    const hist = new Map();
    for (const x of v) hist.set(x, (hist.get(x) || 0) + 1);
    console.log('  ' + [...hist.entries()].sort((a, b2) => a[0] - b2[0]).map(([k, n]) => `${k}: ${n}`).join('   '));
  }

  const rv = joined.map(j => j.ran).sort((a, b2) => a - b2);
  const rbig = big.map(j => j.ran).sort((a, b2) => a - b2);
  const medOf = v => v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  console.log(`\n── round 1's MEASURED coverage distribution, for the comparison\n`);
  console.log(`  all ${rv.length} sheets with a recorded run : min ${rv[0]} median ${medOf(rv)} max ${rv[rv.length - 1]}`);
  console.log(`  controlled subset (${rbig.length})            : min ${rbig[0]} median ${medOf(rbig)} max ${rbig[rbig.length - 1]}`);
  const h2 = new Map();
  for (const x of rbig) h2.set(x, (h2.get(x) || 0) + 1);
  console.log('  ' + [...h2.entries()].sort((a, b2) => a[0] - b2[0]).map(([k, n]) => `${k}: ${n}`).join('   '));
}

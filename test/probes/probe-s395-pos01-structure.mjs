/* S395 — the per-column structural read of round-2 pos-01, sheet `1300-3`.
   READ-ONLY. No src/ file is modified by this probe and none is written.

   NAMING HAZARD, read before assuming a session from a filename. The four
   probes `probe-s395-role-inversion.mjs`, `probe-s396-inversion-incidence.mjs`,
   `probe-s394-verdict-sensitivity.mjs` and `probe-s394-fragmentation.mjs` are
   ALL S394's, whatever their prefix says. THIS file is genuinely S395's, and it
   shares the `s395` prefix with one of S394's. The hook it loads,
   `s395-corpus-run-hook.mjs`, is also S394's and is reused unchanged.

   Instrument. `scripts/corpus-run.mjs` is loaded through that hook, which
   replaces the CLI tail with an export list and touches nothing above it. So
   `prepStructure` and `buildAnalysisConfig` here ARE the census path's own
   source text executed. `inferBaseRoles` and `detectGroupAttributes` are
   imported from `src/import/roles.js` — the same module specifier
   corpus-run.mjs:53 imports, so the same module instance, not a copy.

   `--verify` recomputes the recorded inventory record for this sheet field by
   field and requires exact agreement before any per-column figure is believed.

   Modes:
     --verify   recompute this sheet's corpus-out/round2-inventory.json record
     --cols     the per-column read, as a plain table
     --md       the per-column read, as the markdown rows the record carries
     --g28      the §2.8 group-attribute pass, measured rather than argued

   Usage:
     node --import ./test/probes/s395-corpus-run-hook.mjs \
          test/probes/probe-s395-pos01-structure.mjs --verify --cols --g28
*/
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = new Set(process.argv.slice(2));
const has = f => args.has('--' + f);

// corpus-data/ and corpus-out/ are gitignored and live only in the main
// checkout, so a worktree run has to reach across. Resolved once, reported.
const MAIN = '/Users/hedgehog/Projects/check-my-data';
const DEPOSIT = resolve(MAIN, 'corpus-data/round2/pos-01/micro_data_compiled.xlsx');
const INVENTORY = resolve(MAIN, 'corpus-out/round2-inventory.json');
const SHEET = '1300-3';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CR = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
if (typeof CR.prepStructure !== 'function') {
  console.error('The hook did not load. Run with:\n  node --import ./test/probes/s395-corpus-run-hook.mjs ' +
                'test/probes/probe-s395-pos01-structure.mjs <mode>');
  process.exit(2);
}
const { inferBaseRoles, detectGroupAttributes } = await import(resolve(ROOT, 'src/import/roles.js'));

const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

// ── The prep, once ───────────────────────────────────────────────────
const entry = { path: DEPOSIT, sheet: SHEET };
const { raw, sheetUsed } = await CR.readRawMatrix(entry);
if (sheetUsed !== SHEET) {
  console.error(`parseExcel returned sheet "${sheetUsed}", not "${SHEET}" — STOP.`);
  process.exit(3);
}
const s = CR.prepStructure(raw, undefined);
const baseRoles = inferBaseRoles(s.data, s.hdrs, s.condPerCol);
const g28 = detectGroupAttributes(s.data, baseRoles);
const cfg = CR.buildAnalysisConfig({ entry, hdrs: s.hdrs, data: s.data, condPerCol: s.condPerCol,
  roles: s.roles, longFormatDetected: s.longFormatDetected });

console.log(`deposit : ${DEPOSIT}`);
console.log(`sheet   : ${sheetUsed}   raw ${raw.length} rows`);
console.log(`prep    : headerRows ${s.nH}  nBlocks ${s.nBlocks}  data ${s.data.length} rows x ${s.hdrs.length} cols`);
console.log(`config  : assay ${cfg.assay}  dataType ${cfg.dataType}  zeroAsMissing ${cfg.zeroAsMissing}  longFormat ${s.longFormatDetected}\n`);

// ── --verify ─────────────────────────────────────────────────────────
// Prove the reconstruction against the recorded artefact before believing any
// per-column figure taken off the same prep.
if (has('verify')) {
  const inv = JSON.parse(readFileSync(INVENTORY, 'utf-8'));
  const f = inv.files.find(x => x.path === DEPOSIT);
  const recorded = f.sheets.find(x => x.sheet === SHEET);
  const recomputed = CR.inventorySheet({ entry, raw, sheetName: SHEET,
    sheetIndex: recorded.sheetIndex, sheetTotal: recorded.sheetTotal });
  let diffs = 0;
  console.log('VERIFY — recomputed against corpus-out/round2-inventory.json');
  for (const k of Object.keys(recorded)) {
    const a = JSON.stringify(recorded[k]), b = JSON.stringify(recomputed[k]);
    if (a !== b) { diffs++; console.log(`  ${pad(k, 20)} recorded ${a}  recomputed ${b}   <-- DIFFERS`); }
  }
  console.log(`  fields compared: ${Object.keys(recorded).length}   differing: ${diffs}`);
  console.log(`  VERDICT: ${diffs === 0 ? 'EXACT on every field' : 'DISAGREES — STOP'}\n`);
  if (diffs) process.exit(4);
}

// ── the per-column measurements ──────────────────────────────────────
// Missing / numeric / non-numeric use the SHIPPED predicates verbatim:
//   missing      v == null || v === ''     (inferBaseRoles:35, detectGroupAttributes:102)
//   numeric      !isNaN(Number(v))         (inferBaseRoles:37)
//   non-numeric  present and not numeric
// So `NA` is non-numeric, not missing. That split is the pos-44 open item.
const WINDOW = 40;
function measure(c) {
  const col = s.data.map(r => r[c]);
  let missing = 0, numeric = 0, nonNumeric = 0;
  const seen = new Set(), nonNumTok = new Set();
  for (const v of col) {
    if (v == null || v === '') { missing++; continue; }
    seen.add(String(v));
    if (!isNaN(Number(v))) numeric++;
    else { nonNumeric++; nonNumTok.add(String(v)); }
  }
  // The window inferBaseRoles actually decides on, its own two tests included.
  const sample = s.data.slice(0, WINDOW).map(r => r[c]).filter(v => v != null && v !== '');
  const uniqW = new Set(sample.map(String)).size;
  const nf = sample.length ? sample.filter(v => !isNaN(Number(v))).length / sample.length : null;
  return { header: s.hdrs[c], missing, numeric, nonNumeric, present: numeric + nonNumeric,
           distinct: seen.size, distinctW: uniqW, nSample: sample.length, nf,
           uniqFrac: sample.length ? uniqW / sample.length : null,
           nonNumTok: [...nonNumTok].slice(0, 4) };
}
const M = s.hdrs.map((_, c) => measure(c));

// §2.8 provenance, per column: which grouping key held it out, if any.
const movedBy = new Map();
for (const g of g28.groupings) for (const a of g.attrCols) movedBy.set(a, g);

if (has('cols')) {
  console.log('PER-COLUMN READ — one row per raw column as the parser sees it\n');
  console.log(`  ${pad('#', 3)}${pad('header (verbatim)', 26)}${pad('role', 11)}${rpad('num', 5)}${rpad('nonNum', 7)}${rpad('miss', 6)}${rpad('distinct', 9)}${rpad('d40', 5)}${rpad('n40', 5)}${rpad('nf40', 7)}  §2.8`);
  for (let c = 0; c < M.length; c++) {
    const m = M[c];
    const mv = movedBy.get(c);
    console.log(`  ${pad(c, 3)}${pad(JSON.stringify(m.header), 26)}${pad(s.roles[c], 11)}${rpad(m.numeric, 5)}${rpad(m.nonNumeric, 7)}${rpad(m.missing, 6)}${rpad(m.distinct, 9)}${rpad(m.distinctW, 5)}${rpad(m.nSample, 5)}${rpad(m.nf == null ? '—' : m.nf.toFixed(2), 7)}  ${mv ? `moved: const within col ${mv.groupCol} "${s.hdrs[mv.groupCol]}" (${mv.nLevels} levels)` : 'not moved'}`);
  }
  const rc = { condition: 0, label: 0, data: 0, attribute: 0, ignore: 0 };
  for (const r of s.roles) rc[r] = (rc[r] || 0) + 1;
  console.log(`\n  role counts : Data ${rc.data} / Label ${rc.label} / Cond ${rc.condition} / Attr ${rc.attribute} / ignore ${rc.ignore}`);
  const tok = new Set(); for (const m of M) for (const t of m.nonNumTok) tok.add(t);
  console.log(`  non-numeric tokens present anywhere: ${tok.size ? [...tok].map(t => JSON.stringify(t)).join(', ') : 'none'}`);
  console.log(`  columns with any missing cell       : ${M.filter(m => m.missing > 0).length} of ${M.length}\n`);
}

if (has('md')) {
  console.log('MARKDOWN ROWS — copy verbatim into the record\n');
  // Band membership: the nearest real header cell at or to the left. Additive to
  // the fields the dispatch names — it is the one per-column fact the two arm-B
  // gates turn on, and it is invisible in the role column.
  const bandOf = new Array(s.hdrs.length).fill(null);
  { let cur = null;
    for (let c = 0; c < s.hdrs.length; c++) { if (!/^Col \d+$/.test(s.hdrs[c])) cur = s.hdrs[c]; bandOf[c] = cur; } }
  console.log('| # | Header (verbatim) | Band | Role | Numeric | Non-num | Missing | Distinct | Distinct ≤40 | nf ≤40 | §2.8 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (let c = 0; c < M.length; c++) {
    const m = M[c];
    const mv = movedBy.get(c);
    const synth = /^Col \d+$/.test(m.header);
    console.log(`| ${c} | \`${m.header}\`${synth ? ' *(synth)*' : ''} | ${bandOf[c] === m.header ? '—' : '`' + bandOf[c] + '`'} | ${s.roles[c]} | ${m.numeric} | ${m.nonNumeric} | ${m.missing} | ${m.distinct} | ${m.distinctW} | ${m.nf == null ? '—' : m.nf.toFixed(2)} | ${mv ? `moved — constant within col ${mv.groupCol}` : 'not moved'} |`);
  }
  console.log('');
}

// ── --g28 ────────────────────────────────────────────────────────────
// Measured, not argued: run the pass and report what it returned, plus which
// precondition decided the outcome.
if (has('g28')) {
  const MIN_ROWS_FOR_GROUPING = 50; // roles.js:8, module-private — restated to report the gap, not to re-implement
  console.log('§2.8 — detectGroupAttributes, run on this sheet');
  console.log(`  rows handed to the pass      : ${s.data.length}`);
  console.log(`  columns handed to the pass   : ${baseRoles.length}`);
  console.log(`  row floor (roles.js:8)       : ${MIN_ROWS_FOR_GROUPING}   ${s.data.length < MIN_ROWS_FOR_GROUPING ? 'NOT MET — the pass returns at roles.js:90' : 'met'}`);
  console.log(`  column floor (roles.js:90)   : 2    ${baseRoles.length < 2 ? 'NOT MET' : 'met'}`);
  console.log(`  groupings returned           : ${g28.groupings.length}`);
  console.log(`  columns re-roled 'attribute' : ${g28.roles.filter(r => r === 'attribute').length}`);
  // The direct observable: base roles against the roles prepStructure shipped.
  let moved = 0;
  for (let c = 0; c < baseRoles.length; c++) if (baseRoles[c] !== s.roles[c]) moved++;
  console.log(`  base vs shipped roles differ : ${moved} of ${baseRoles.length} columns`);
  // Identity against the array HANDED IN. All three of :90, :125 and :186
  // return `roles` unchanged, so identity proves nothing was re-roled; the row
  // count against the floor is what isolates WHICH of the three returned.
  console.log(`  identity vs baseRoles        : ${g28.roles === baseRoles ? 'same array object — nothing re-roled' : 'a new array was built — something was re-roled'}`);
  console.log(`  VERDICT: §2.8 ${moved === 0 && g28.groupings.length === 0 ? 'moved no column on this sheet' : 'MOVED at least one column'}\n`);
}

// ── --layout ─────────────────────────────────────────────────────────
// What the sheet's own geometry is, measured. These are the facts arm B's two
// gates would follow from. This probe does NOT answer either gate (§14.3, and
// the dispatch): it records structure only.
if (has('layout')) {
  const LABEL_RE = /^(id|name|sample|subject|patient|well|row|res|residue|index|idx|num|no|n|number|#|pos|position|frame|step|time|timepoint|obs|gene|geneid|protein|accession)\b/i;
  const COND_RE  = /^(group|condition|treatment|dose|conc|ctrl|control|type|category|class|arm|genotype|strain)\b/;

  console.log('LAYOUT — measured from the raw grid\n');

  // 1. What the preamble strip and header detection consumed.
  const rawNonEmpty = raw.map(r => r.filter(v => v != null && String(v).trim() !== '').length);
  console.log(`  raw rows                    : ${raw.length}   non-empty cell counts: [${rawNonEmpty.join(', ')}]`);
  console.log(`  detectHeaderRows returned   : ${s.nH}`);
  console.log(`  condPerCol                  : ${s.condPerCol === null ? 'null — no band row forward-filled' : JSON.stringify(s.condPerCol)}`);
  console.log(`  data rows after the header  : ${s.data.length}`);

  // 2. Which header cells are real and which prepStructure:185 synthesised.
  const synth = [], real = [];
  for (let c = 0; c < s.hdrs.length; c++) (/^Col \d+$/.test(s.hdrs[c]) ? synth : real).push(c);
  console.log(`  real header text at columns : ${real.join(', ')}`);
  console.log(`  synthesised 'Col N' headers : ${synth.length} of ${s.hdrs.length} (columns ${synth.join(', ')})`);

  // 3. Bands: a real header cell owns every synthesised column to its right.
  console.log('  bands implied by the header row (a real label, then the blank cells after it):');
  for (let i = 0; i < real.length; i++) {
    const from = real[i];
    const to = (i + 1 < real.length ? real[i + 1] : s.hdrs.length) - 1;
    console.log(`    cols ${String(from).padStart(2)}..${String(to).padStart(2)}  width ${to - from + 1}  ${JSON.stringify(s.hdrs[from])}`);
  }

  // 4. Header keyword pass — a band label landing on a keyword would re-role a
  //    measurement column. Measured on every header, not assumed.
  const hits = [];
  for (let c = 0; c < s.hdrs.length; c++) {
    const lo = String(s.hdrs[c]).toLowerCase().trim();
    if (LABEL_RE.test(lo)) hits.push(`${c} ${JSON.stringify(s.hdrs[c])} -> label`);
    if (COND_RE.test(lo)) hits.push(`${c} ${JSON.stringify(s.hdrs[c])} -> condition`);
  }
  console.log(`  header-keyword matches      : ${hits.length ? hits.join(' | ') : 'none on any of the 16 headers'}`);

  // 5. Rows: the blank one, and any row whose label is a derived total.
  const blank = [];
  for (let r = 0; r < s.data.length; r++) {
    if (s.data[r].every(v => v == null || v === '')) blank.push(r);
  }
  console.log(`  all-blank data rows         : ${blank.length} (at data-row ${blank.length ? 'index ' + blank.join(', ') : 'n/a'})`);
  console.log(`  row labels (col 0)          : ${s.data.map(r => r[0]).filter(v => v != null && v !== '').map(v => JSON.stringify(String(v))).join(', ')}`);

  // 6. The matrix extractAnalysisInputs actually returns, against the data rows.
  const { extractAnalysisInputs } = await import(resolve(ROOT, 'src/analysis/engine.js'));
  const { matrix, condCtx } = extractAnalysisInputs(cfg.config);
  console.log(`  matrix                      : ${matrix.length} rows x ${matrix[0]?.length ?? 0} cols   (data rows ${s.data.length}, so ${s.data.length - matrix.length} dropped)`);
  console.log(`  condCtx.type                : ${condCtx.type}`);
  // Column sums of the matrix against its own last row — is that row a total?
  const last = matrix[matrix.length - 1];
  const sums = [];
  for (let c = 0; c < matrix[0].length; c++) {
    let t = 0; for (let r = 0; r < matrix.length - 1; r++) { const v = matrix[r][c]; if (v != null) t += v; }
    sums.push(t);
  }
  // Reported as a residual, not a yes/no. An exact match would prove the row is
  // a formula over the rows above; a small residual is consistent with a total
  // reported at a precision the rounded cells above cannot reproduce, and does
  // not distinguish the two. Both readings are left open here on purpose.
  const resid = sums.map((t, c) => last[c] == null ? null : Math.abs(t - last[c])).filter(v => v != null);
  const maxR = Math.max(...resid), meanR = resid.reduce((a, b) => a + b, 0) / resid.length;
  const close = resid.filter(v => v < 1e-6).length;
  console.log(`  last matrix row against the sum of the 15 rows above it, per column:`);
  console.log(`    exact to 1e-6      : ${close} of ${matrix[0].length}`);
  console.log(`    residual max/mean  : ${maxR.toExponential(3)} / ${meanR.toExponential(3)}  (values are wt%, column sums ~100)`);
  console.log(`    largest residual as a fraction of the reported total: ${(maxR / 100).toExponential(2)}`);
  console.log(`    first three columns: sum ${sums.slice(0,3).map(v=>v.toFixed(4)).join(', ')}  vs last row ${last.slice(0,3).map(v=>v==null?'null':v.toFixed(4)).join(', ')}`);
  console.log('');
}

// ── --rows ───────────────────────────────────────────────────────────
// §15.2 asks for the fraction of rows in surviving groups, PER ARM. Neither arm
// has been answered, so this reports the DEFAULT prep only — the state the
// census path produces with no gate answered — and forecasts nothing.
if (has('rows')) {
  const { extractAnalysisInputs } = await import(resolve(ROOT, 'src/analysis/engine.js'));
  const { matrix, condCtx } = extractAnalysisInputs(cfg.config);
  console.log('ROW PARTITION — default prep only, neither gate answered\n');
  console.log(`  condCtx.type          : ${condCtx.type}`);
  console.log(`  matrix rows           : ${matrix.length}`);
  const st = typeof condCtx.rowGroupsStatus === 'function' ? condCtx.rowGroupsStatus() : null;
  console.log(`  rowGroupsStatus()     : ${st ? JSON.stringify(st) : 'not available on this context'}`);
  const sl = typeof condCtx.slices === 'function' ? condCtx.slices() : null;
  console.log(`  slices() returned     : ${sl ? sl.length + ' slice(s)' : 'not available'}`);
  if (sl && sl.length) {
    const n = sl.reduce((a, s2) => a + (s2.rows?.length ?? s2.matrix?.length ?? 0), 0);
    console.log(`  rows in surviving slices: ${n} of ${matrix.length}  (${(100 * n / matrix.length).toFixed(1)}%)`);
  }
  console.log(`  condition columns     : ${s.roles.filter(r => r === 'condition').length}\n`);
}

// ── --m1 ─────────────────────────────────────────────────────────────
// Which arm of inferBaseRoles each column left by, measured rather than argued.
// The branches are roles.js:36 (empty), :38 (nf<0.5), :41 (condPerCol),
// :43/:44 (header keywords), :47 (integer run -> label), :48 (data).
if (has('m1')) {
  const LABEL_RE = /^(id|name|sample|subject|patient|well|row|res|residue|index|idx|num|no|n|number|#|pos|position|frame|step|time|timepoint|obs|gene|geneid|protein|accession)\b/i;
  const COND_RE  = /^(group|condition|treatment|dose|conc|ctrl|control|type|category|class|arm|genotype|strain)\b/;
  console.log('M1 — the branch each column left inferBaseRoles by\n');
  console.log(`  window = data.slice(0,40); this sheet has ${s.data.length} data rows, so the window IS the column on every one.`);
  let allCovered = true, seqTrap = 0;
  console.log(`  ${pad('#', 3)}${pad('header', 26)}${rpad('nf', 6)}${rpad('uniq', 6)}${rpad('u/n', 7)}${rpad('intRun', 8)}  branch -> role`);
  for (let c = 0; c < s.hdrs.length; c++) {
    const m = M[c];
    if (m.distinct !== m.distinctW) allCovered = false;
    const sample = s.data.slice(0, WINDOW).map(r => r[c]).filter(v => v != null && v !== '');
    const nums = sample.map(Number).filter(n => !isNaN(n));
    // roles.js:47 — the integer-run label trap. Reported for every column so a
    // near miss is visible, not only where it fired.
    let intRun = 'n/a';
    if (nums.length >= 4 && nums.every(n => Number.isInteger(n))) {
      let seq = 0; for (let i = 1; i < nums.length; i++) if (nums[i] === nums[i - 1] + 1) seq++;
      intRun = (seq / (nums.length - 1)).toFixed(2); if (seq / (nums.length - 1) > 0.85) seqTrap++;
    } else if (nums.length >= 4) intRun = 'not all int';
    const lo = String(s.hdrs[c]).toLowerCase().trim();
    let branch;
    if (!sample.length) branch = ':36 empty';
    else if (m.nf < 0.5) branch = `:38 nf<0.5, uniq ${m.uniqFrac < 0.3 && m.distinctW <= 20 ? '< 0.3 -> condition' : '>= 0.3 -> label'}`;
    else if (s.condPerCol && s.condPerCol[c]) branch = ':41 condPerCol';
    else if (LABEL_RE.test(lo)) branch = ':43 label keyword';
    else if (COND_RE.test(lo)) branch = ':44 condition keyword';
    else if (intRun !== 'n/a' && intRun !== 'not all int' && Number(intRun) > 0.85) branch = ':47 integer run';
    else branch = ':48 fallthrough';
    console.log(`  ${pad(c, 3)}${pad(s.hdrs[c], 26)}${rpad(m.nf.toFixed(2), 6)}${rpad(m.distinctW, 6)}${rpad(m.uniqFrac.toFixed(2), 7)}${rpad(intRun, 8)}  ${branch} -> ${s.roles[c]}`);
  }
  console.log(`\n  distinct == distinct(window) on every column : ${allCovered ? 'yes, all ' + s.hdrs.length : 'NO — the window is a strict sample somewhere'}`);
  console.log(`  columns tripping the :47 integer-run trap    : ${seqTrap}\n`);
}

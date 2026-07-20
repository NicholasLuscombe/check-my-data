// S327 — verdict identity across the dedup optimisation.
//
// The dominance dedup feeds Sequential Duplication's verdict. An optimisation
// that changes which sequences survive changes primaryP. So the bar is not
// "looks the same" — it is byte-identical output on the data that exercises the
// slow path.
//
// BEFORE is read from `git show main:src/tests/sequentialDuplication.js` — the
// committed pre-change source, not a copy that could drift. AFTER is the working
// tree. Both get BLOCK_SCAN_LIMIT rewritten to Infinity so the scan actually
// runs above 5,000 rows; that rewrite is asserted to match exactly once and is
// the ONLY difference applied to either side.
//
// Compares flag, primaryP, nSequences, the derived top* fields, and the returned
// sequence list element by element, then the whole object as canonical JSON.
//
// Usage: node test/probes/probe-s327-dedup-identity.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(REPO, 'src', 'tests');
const CORPUS = '/Users/hedgehog/Projects/check-my-data/corpus-data';
const TMP = mkdtempSync(join(tmpdir(), 's327-ident-'));
const SIZES = [1250, 2500, 5000, 7500, 9398];

function liftLimit(src, label) {
  const needle = 'const BLOCK_SCAN_LIMIT = 5000;';
  const n = src.split(needle).length - 1;
  if (n !== 1) throw new Error(`${label}: expected exactly 1 "${needle}", found ${n}`);
  return src.replace(needle, 'const BLOCK_SCAN_LIMIT = Infinity;');
}

async function loadVariant(src, tag) {
  const rebased = liftLimit(src, tag).replace(/from ["']\.\.\/([^"']+)["']/g,
    (_, p) => `from "${pathToFileURL(join(SRC, '..', p)).href}"`);
  const out = join(TMP, `${tag}.js`);
  writeFileSync(out, rebased);
  return await import(pathToFileURL(out).href);
}

const beforeSrc = execFileSync('git', ['-C', REPO, 'show', 'main:src/tests/sequentialDuplication.js'], { encoding: 'utf-8' });
const afterSrc = readFileSync(join(SRC, 'sequentialDuplication.js'), 'utf-8');
if (beforeSrc === afterSrc) throw new Error('before and after are identical — nothing to verify');

const before = await loadVariant(beforeSrc, 'before');
const after = await loadVariant(afterSrc, 'after');

// ── Load C14 Data ───────────────────────────────────────────────────
function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  let blockRows = prep.rows;
  const blocks = detectBlocks(blockRows);
  if (blocks.length > 1) blockRows = blocks[0];
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
  if (nH === 0) { hdrs = Array.from({ length: maxC }, (_, i) => 'Col ' + (i + 1)); data = blockRows.map(pad); }
  else if (nH === 1) {
    hdrs = pad(blockRows[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(1).map(pad);
  } else {
    const rawGR = pad(blockRows[0]), nameRow = pad(blockRows[1]);
    const groups = forwardFill(rawGR);
    condPerCol = new Array(maxC).fill(null);
    for (let i = 0; i < maxC; i++) { const g = groups[i] != null ? String(groups[i]).trim() : ''; if (g) condPerCol[i] = g; }
    hdrs = nameRow.map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(2).map(pad);
  }
  const longFormatDetected = !!detectLongFormat(hdrs, data);
  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, longFormatDetected };
}

const path = `${CORPUS}/C14.xlsx`;
const { rows } = await parseExcel(new Blob([readFileSync(path)]), 'Data');
const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(rows);
const auto = detectAssay(basename(path), hdrs);
const assay = auto ? auto.assay : 'general';
const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';
const { matrix } = extractAnalysisInputs({
  data, roles, hdrs, condPerCol, zeroAsMissing: false, assay, dataType,
  fileName: path, colRelationship: 'replicates', rowSemantics });

console.log('S327 — verdict identity across the dedup optimisation');
console.log(`  before : git main:src/tests/sequentialDuplication.js`);
console.log(`  after  : working tree`);
console.log(`  data   : C14.xlsx / "Data" — ${matrix.length} rows x ${matrix[0]?.length || 0} data cols`);
console.log(`  only edit applied to either side: BLOCK_SCAN_LIMIT 5000 -> Infinity\n`);

// Stable stringify so key insertion order cannot mask or manufacture a diff.
function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

let allMatch = true;
for (const n of SIZES) {
  if (n > matrix.length) continue;
  const sub = matrix.slice(0, n);
  const a = before.testSequentialDuplication(sub, assay);
  const b = after.testSequentialDuplication(sub, assay);

  const scalars = ['flag', 'primaryP', 'nSequences', 'topHeight', 'topOffset', 'topCol', 'description'];
  const scalarDiffs = scalars.filter(k => canon(a[k]) !== canon(b[k]));

  // Element-by-element over the returned sequence list.
  let seqDiffs = 0, firstSeqDiff = null;
  const la = a.sequences?.length ?? -1, lb = b.sequences?.length ?? -1;
  if (la !== lb) { seqDiffs = Math.abs(la - lb); firstSeqDiff = `length ${la} vs ${lb}`; }
  else for (let i = 0; i < la; i++) {
    if (canon(a.sequences[i]) !== canon(b.sequences[i])) {
      seqDiffs++;
      if (!firstSeqDiff) firstSeqDiff = `index ${i}: ${canon(a.sequences[i])} vs ${canon(b.sequences[i])}`;
    }
  }

  const whole = canon(a) === canon(b);
  if (!whole) allMatch = false;

  console.log(`  n=${String(n).padStart(5)}  flag=${String(a.flag).padEnd(9)} primaryP=${String(a.primaryP)}`);
  console.log(`           nSequences=${String(a.nSequences).padStart(6)}  returned list=${la} entries`);
  console.log(`           scalar fields differing : ${scalarDiffs.length ? scalarDiffs.join(', ') : 'none'}`);
  console.log(`           sequence entries differing: ${seqDiffs}${firstSeqDiff ? '  first: ' + firstSeqDiff : ''}`);
  console.log(`           WHOLE OBJECT IDENTICAL   : ${whole ? 'YES' : 'NO'}\n`);
}

console.log(allMatch
  ? '  RESULT: byte-identical at every size. The optimisation is verdict-safe on this file.'
  : '  RESULT: A DIFFERENCE EXISTS. Stop — this is not a safe optimisation.');
console.log('');

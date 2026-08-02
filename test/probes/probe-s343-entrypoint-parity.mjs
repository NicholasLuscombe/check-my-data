// probe-s343-entrypoint-parity.mjs — S343 part 2.
//
// Does the browser path derive the same seed as validate-batch.mjs?
//
// The seed is hashMatrix64(matrix) and nothing else, so the question reduces to:
// do the two entry points hand extractAnalysisInputs the same `data`, `roles`,
// `condPerCol` and `zeroAsMissing`? They reach it by different routes:
//
//   batch   Papa.parse(csv, {skipEmptyLines:true})
//             -> preprocessRaw -> detectHeaderRows -> raw.slice(headerRows)
//             -> inferRoles
//   browser Papa.parse(text.trim(), {skipEmptyLines:false})       ImportView:227
//             -> preprocessRaw                                    ImportView:238
//             -> detectBlocks (multi-block files take a different branch)  :241
//             -> detectHeaderRows                                 ImportView:245
//             -> applyHeaders  (pads short rows to maxC, drops all-blank
//                               rows, builds condPerCol from row 0)  :151-189
//             -> inferRoles                                       ImportView:189
//
// This replays the browser chain headless against the real modules and compares
// the resulting seed with the batch chain's, fixture by fixture.
//
// READ-ONLY on src/. Usage: node test/probes/probe-s343-entrypoint-parity.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { createPRNG } = await import('../../src/stats/prng.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

// Identify a matrix by its stream rather than by re-deriving the private hash:
// two matrices produce the same first 4 draws iff (to any useful confidence)
// they hashed to the same seed.
function streamId(matrix) {
  const r = createPRNG(matrix);
  return [r.random(), r.random(), r.random(), r.random()].map(x => x.toFixed(12)).join('|');
}

// ── batch chain, copied from test/validate-batch.mjs:74-100 ─────────────
function batchPath(csv) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { matrix, roles, data, headers, nBlocks: 1 };
}

// ── browser chain, replaying ImportView.parseAndLoad + applyHeaders ─────
function applyHeaders(raw, nH) {
  const maxC = raw.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = r => { const o = [...r]; while (o.length < maxC) o.push(null); return o; };
  let h, d, cpc = null;
  if (nH === 0) {
    h = Array.from({ length: maxC }, (_, i) => 'Col ' + (i + 1)); d = raw.map(pad);
  } else if (nH === 1) {
    h = pad(raw[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    d = raw.slice(1).map(pad);
  } else {
    const rawGR = pad(raw[0]), nameRow = pad(raw[1]);
    const subNames = nameRow.map(v => v != null ? String(v).trim() : '');
    const counts = {}; subNames.forEach(s => { if (s) counts[s] = (counts[s] || 0) + 1; });
    const repeatedName = subNames.find(s => s && counts[s] > 1);
    let groupStarts = [];
    if (repeatedName) subNames.forEach((s, i) => { if (s === repeatedName) groupStarts.push(i); });
    cpc = new Array(maxC).fill(null);
    if (groupStarts.length >= 2) {
      for (let g = 0; g < groupStarts.length; g++) {
        const gS = groupStarts[g], gE = g + 1 < groupStarts.length ? groupStarts[g + 1] - 1 : maxC - 1;
        let cn = null;
        for (let c = gS; c <= gE; c++) { const v = rawGR[c] != null ? String(rawGR[c]).trim() : ''; if (v) { cn = v; break; } }
        if (!cn) for (let c = gS - 1; c >= Math.max(0, gS - 2); c--) { const v = rawGR[c] != null ? String(rawGR[c]).trim() : ''; if (v) { cn = v; break; } }
        if (cn) for (let c = gS; c <= gE; c++) cpc[c] = cn;
      }
    } else {
      const filled = forwardFill(rawGR);
      cpc = filled.map(v => v ? String(v).trim() || null : null);
    }
    h = nameRow.map((v, i) => { const nm = v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1); const grp = cpc[i] || ''; return grp ? grp + ' · ' + nm : nm; });
    d = raw.slice(2).map(pad);
  }
  d = d.filter(r => r.some(v => v != null && v !== ''));
  return { h, d, cpc };
}

function loadBlock(blockRows) {
  // ImportView:199-209
  let rows = blockRows;
  const maxC = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const minCells = Math.max(2, Math.ceil(maxC * 0.1));
  while (rows.length > 2) { const nb = rows[0].filter(v => v != null && String(v).trim() !== '').length; if (nb < minCells) rows = rows.slice(1); else break; }
  const emptySet = new Set();
  for (let c = 0; c < maxC; c++) { let all = true; for (const row of rows) { const v = row[c]; if (v != null && String(v).trim() !== '') { all = false; break; } } if (all) emptySet.add(c); }
  let cleaned = rows;
  if (emptySet.size > 0 && emptySet.size < maxC) cleaned = rows.map(row => row.filter((_, ci) => !emptySet.has(ci)));
  return { cleaned, nH: detectHeaderRows(cleaned) };
}

function browserPath(text) {
  const result = Papa.default.parse(text.trim(), { skipEmptyLines: false }); // ImportView:227
  const cleaned = preprocessRaw(result.data).rows;                            // ImportView:238
  const det = detectBlocks(cleaned);                                          // ImportView:241
  let rows, nH, longFormat = false;
  if (det.length > 1) {
    const b = loadBlock(det[0]); rows = b.cleaned; nH = b.nH;                  // first block, as mounted
  } else {
    rows = cleaned; nH = detectHeaderRows(cleaned);                            // ImportView:245
    if (cleaned.length > 20 && nH > 0) {
      const hdrRow = cleaned[0].map(v => v != null ? String(v).trim() : '');
      if (detectLongFormat(hdrRow, cleaned.slice(nH))) longFormat = true;      // pivot modal opens
    }
  }
  const { h, d, cpc } = applyHeaders(rows, nH);
  const roles = inferRoles(d, h, cpc);
  const { matrix } = extractAnalysisInputs({ data: d, roles, condPerCol: cpc, zeroAsMissing: false });
  return { matrix, roles, data: d, headers: h, nBlocks: det.length, longFormat };
}

const CLEAN = Object.entries(EXPECTED).filter(([, e]) => e.severity === 0).map(([f]) => f);
const ALL = Object.keys(EXPECTED);

function report(list, title) {
  console.log(`\n── ${title} ──\n`);
  console.log('fixture'.padEnd(46) + 'shape (batch)'.padEnd(16) + 'shape (browser)'.padEnd(16) + 'seed');
  let same = 0, diff = 0;
  for (const file of list) {
    const csv = readFileSync(join(FIXTURES, file), 'utf-8');
    let b, w;
    try { b = batchPath(csv); } catch (e) { console.log(file.padEnd(46) + 'batch ERROR ' + e.message); continue; }
    try { w = browserPath(csv); } catch (e) { console.log(file.padEnd(46) + 'browser ERROR ' + e.message); continue; }
    const bs = `${b.matrix.length}x${b.matrix[0]?.length ?? 0}`;
    const ws = `${w.matrix.length}x${w.matrix[0]?.length ?? 0}`;
    const eq = streamId(b.matrix) === streamId(w.matrix);
    if (eq) same++; else diff++;
    const notes = [];
    if (w.nBlocks > 1) notes.push(`${w.nBlocks} blocks -> browser mounts block 1`);
    if (w.longFormat) notes.push('long-format: browser opens pivot modal');
    console.log(file.padEnd(46) + bs.padEnd(16) + ws.padEnd(16) + (eq ? 'SAME' : 'DIFFERENT') + (notes.length ? '   [' + notes.join('; ') + ']' : ''));
  }
  console.log(`\n${same} same, ${diff} different, of ${list.length}`);
}

console.log('S343 — browser entry point vs validate-batch.mjs: same derived seed?\n');
console.log('CSV files only. Excel fixtures take a different reader and are skipped.');
report(CLEAN.filter(f => f.endsWith('.csv')), 'the eight clean fixtures');
report(ALL.filter(f => f.endsWith('.csv')), 'the whole batch corpus');

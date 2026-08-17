// S380 Part 5 items 2–3 — where C10's mean-variance slope of 2.78 comes from.
//
// C10's nine sheets carry 20–35 OD columns that are FIVE dilution levels with
// several replicates each (`OD 1.0_1`, `OD 0.5_1`, …). Nothing in the import
// reads the level: there is no condition column, every OD column infers to
// `data`, and Noise Scaling therefore receives one flat replicate set.
//
// This probe measures two slopes on each sheet with the SAME estimator, by
// calling the shipped `testMeanVariance` both times:
//
//   pooled       — the whole data matrix, exactly what the engine dispatches
//   within-level — one call per dilution level, on that level's columns only
//
// If the within-level slopes sit near 1 or 2 while pooled reads 2.78, the
// pooling is producing the slope. If they also read ~2.78, the data scales that
// steeply and the grouping is not the story. The probe reports; it decides
// nothing about whether any flag is correct.
//
// READ-ONLY. No src/ change, no fixture written, no engine run. Reuses the
// import chain from scripts/corpus-run.mjs verbatim so the matrix is the one
// the S379 run actually analysed.
//
// Usage:
//   node test/probes/probe-s380-c10-slope.mjs            # all nine C10 sheets
//   node test/probes/probe-s380-c10-slope.mjs --sheet "B. cereus Experiment1"
//   node test/probes/probe-s380-c10-slope.mjs --json      # machine-readable dump

import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const { extractAnalysisInputs } = await import(ROOT + 'src/analysis/engine.js');
const { testMeanVariance } = await import(ROOT + 'src/tests/meanVariance.js');
const { inferBaseRoles, detectGroupAttributes } = await import(ROOT + 'src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } = await import(ROOT + 'src/import/parser.js');
const { parseExcel } = await import(ROOT + 'src/import/excel.js');

// `corpus-data/` is gitignored and lives in the main checkout only, so a run
// from a worktree needs the main checkout's copy. Resolve here rather than
// hardcoding: env override first, then this tree, then the main checkout.
const WORKBOOK = (() => {
  const cands = [
    process.env.C10_XLSX,
    ROOT + 'corpus-data/C10.xlsx',
    '/Users/hedgehog/Projects/check-my-data/corpus-data/C10.xlsx',
  ].filter(Boolean);
  for (const p of cands) { try { readFileSync(p); return p; } catch { /* next */ } }
  throw new Error(`C10.xlsx not found. Tried:\n  ${cands.join('\n  ')}\nSet C10_XLSX=<path>.`);
})();
const ASSAY = 'plate_reader';   // what detectAssay returned on all nine sheets
const SHEETS = [
  'Exiguobacterium sp. Experiment1', 'Exiguobacterium sp. Experiment2',
  'B. pumilus Experiment1', 'B. pumilus Experiment2',
  'P. megatetrium Experiment1', 'P. megatetrium Experiment2', 'P. megatetrium Experiment3',
  'B. cereus Experiment1', 'B. cereus Experiment2',
];

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const oneSheet = argv.includes('--sheet') ? argv[argv.indexOf('--sheet') + 1] : null;

// ── Import chain, ported from scripts/corpus-run.mjs prepStructure ──────
// Kept step-for-step so roles and the matrix are byte-identical to the run that
// produced corpus-out/s379-honest-run.json.
function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('Empty after preprocessing.');

  const blocks = detectBlocks(preprocessed);
  let blockRows = blocks.length > 1 ? blocks[0] : preprocessed;

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

  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles };
}

// The level token is everything before the trailing `_<replicate>`. Two sheets
// spell the lowest dilution `OD 006_*` and three spell it `OD 0.06_*`, so the
// token is taken verbatim from the header rather than normalised — grouping on
// a cleaned-up value would merge columns the file itself keeps apart.
const levelOf = h => {
  const m = String(h).match(/^(.*)_\d+$/);
  return m ? m[1] : String(h);
};

// 95% interval on whichever SE the shipped test selected for its own z-test.
const ci = (slope, se) =>
  Number.isFinite(se) ? [slope - 1.96 * se, slope + 1.96 * se] : null;

const f2 = v => (v == null ? '  —  ' : Number(v).toFixed(2).padStart(6));
const fmtCI = c => (c ? `[${c[0].toFixed(2)}, ${c[1].toFixed(2)}]` : '—');

function summarise(res) {
  if (res.flag === 'N/A') return { na: true, cause: res.naCause || null, note: res.description };
  const slope = parseFloat(res.observedSlope);
  const se = parseFloat(res.slopeSE);
  return {
    na: false,
    slope, se,
    regressionSE: parseFloat(res.regressionSE),
    blockRobust: !!res.blockRobust,
    ci: ci(slope, se),
    nPoints: res.nPoints,
    expectedSlope: res.expectedSlope,
    primaryP: res.primaryP,
    flag: res.flag,
  };
}

const out = [];

for (const sheet of (oneSheet ? [oneSheet] : SHEETS)) {
  // Same read adapter as corpus-run.mjs: excel.js needs only .arrayBuffer(),
  // which a Node Blob provides.
  const { rows: raw } = await parseExcel(new Blob([readFileSync(WORKBOOK)]), sheet);
  const { hdrs, data, condPerCol, roles } = prepStructure(raw);

  // The engine's own matrix: data-role columns only, in file order.
  const { matrix } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
    colRelationship: 'replicates', dataColHeaders: null,
  });
  const dataHdrs = hdrs.filter((_, i) => roles[i] === 'data');

  // ── pooled: exactly the engine's dispatch, testMeanVariance(matrix, assay) ──
  const pooled = summarise(testMeanVariance(matrix, ASSAY));

  // Row accounting for the pooled arm, reproducing meanVariance.js's own two
  // filters so the point count is explained rather than just reported: a row
  // needs >= 3 non-null cells, then a positive mean AND a positive variance.
  let tooFewVals = 0, nonPositive = 0, kept = 0;
  for (const row of matrix) {
    const vals = row.filter(v => v != null);
    if (vals.length < 3) { tooFewVals++; continue; }
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const v = vals.reduce((s, x) => s + (x - m) ** 2, 0) / (vals.length - 1);
    if (m > 0 && v > 0) kept++; else nonPositive++;
  }
  const rowAccount = { rows: matrix.length, tooFewVals, nonPositive, kept };

  // ── within level: same function, same assay, one level's columns ──
  const levels = [];
  const seen = new Map();
  dataHdrs.forEach((h, i) => {
    const k = levelOf(h);
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(i);
  });
  for (const [level, idxs] of seen) {
    const sub = matrix.map(row => idxs.map(i => row[i]));
    levels.push({ level, nCols: idxs.length, ...summarise(testMeanVariance(sub, ASSAY)) });
  }

  out.push({ sheet, nRows: matrix.length, nDataCols: dataHdrs.length, rowAccount, pooled, levels });
}

if (JSON_OUT) {
  console.log(JSON.stringify({ workbook: 'corpus-data/C10.xlsx', assay: ASSAY, sheets: out }, null, 1));
} else {
  console.log(`S380 — C10 mean-variance slope, pooled against within-dilution-level`);
  console.log(`  workbook corpus-data/C10.xlsx, assay '${ASSAY}' (expected slope 1)`);
  console.log(`  both arms call the shipped testMeanVariance; the only difference is which columns it sees\n`);
  for (const s of out) {
    console.log(`── ${s.sheet}  (${s.nRows} rows × ${s.nDataCols} data cols) ──`);
    const p = s.pooled;
    if (p.na) {
      console.log(`  pooled       N/A — ${p.cause}`);
    } else {
      console.log(`  pooled       slope ${f2(p.slope)}  95% CI ${fmtCI(p.ci)}  SE ${p.se.toFixed(4)}` +
        `${p.blockRobust ? ' (block-robust)' : ''}  n=${p.nPoints} points  flag ${p.flag}`);
    }
    const a = s.rowAccount;
    console.log(`               rows ${a.rows} → ${a.kept} points   dropped: ` +
      `${a.tooFewVals} with <3 valid cells, ${a.nonPositive} with mean or variance not positive`);
    for (const l of s.levels) {
      if (l.na) {
        console.log(`  ${String(l.level).padEnd(11)} (${l.nCols} col${l.nCols === 1 ? '' : 's'})  N/A — ${l.cause}`);
      } else {
        console.log(`  ${String(l.level).padEnd(11)} (${l.nCols} cols)  slope ${f2(l.slope)}  95% CI ${fmtCI(l.ci)}` +
          `  SE ${l.se.toFixed(4)}${l.blockRobust ? ' (block-robust)' : ''}  n=${l.nPoints}  flag ${l.flag}`);
      }
    }
    const ran = s.levels.filter(l => !l.na);
    if (ran.length && !s.pooled.na) {
      const lo = Math.min(...ran.map(l => l.slope)), hi = Math.max(...ran.map(l => l.slope));
      console.log(`  → within-level range ${lo.toFixed(2)} … ${hi.toFixed(2)}` +
        `   pooled ${s.pooled.slope.toFixed(2)}   levels computed ${ran.length}/${s.levels.length}\n`);
    } else {
      console.log('');
    }
  }
}

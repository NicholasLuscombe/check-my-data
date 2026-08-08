// probe-s359-loess-floor-census.mjs — P51/DS12b, the LOESS floor census.
//
// Question: DS12b's severity rests on LOESS Residual Analysis at
// cusumP = 0.002, which is exactly its own 1/(B+1) permutation floor. A
// p-value pinned to the floor reports the resample count, not the data. Is
// LOESS responding to DS12b's fabrication, or producing a value the statistic
// produces on any file of that shape?
//
// One file against one file cannot answer that. This runs the census over all
// 27 fixtures and asks, per fixture: does cusumP sit on the floor by identity
// on the double, does scanP, and does the changepoint land at a condition
// boundary.
//
// READ-ONLY on src/. This probe imports the engine and reads what it returns.
// It changes nothing, re-implements no test, and hardcodes no threshold or
// resample count — ALPHA comes from src/constants/thresholds.js and B is read
// off each result's own nPerm field, because the two permutation counts are
// bare literals inside loessResidual.js and are not exported.
//
// Engine setup is copied from test/validate-batch.mjs (its per-fixture block)
// so the numbers here are the numbers a batch run sees. Seed offset 0, one run
// per fixture: the tool is deterministic per file, so that is what a user gets.
//
// Usage:
//   node test/probes/probe-s359-loess-floor-census.mjs
//   OUT=test/probes/out-s359 node test/probes/probe-s359-loess-floor-census.mjs
//
// Output dir defaults to test/probes/out-s359/, matched by the
// `test/probes/out-*/` line already in .gitignore — promote.sh runs
// `git add -A` and would otherwise ship the dump (P56).

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { ALPHA, flagFromP } = await import('../../src/constants/thresholds.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const OUT_DIR = process.env.OUT || 'test/probes/out-s359';
const TEST_NAME = 'LOESS Residual Analysis';

// How near a condition boundary counts as "at" it, for the summary count only.
// Every per-fixture distance is reported in full, so this constant narrows the
// summary and hides nothing.
const NEAR_BOUNDARY_ROWS = 5;

// ── Coordinate conventions, stated once ─────────────────────────────────
//
// LOESS reports `changepointRow` as validRows[cpIdx] + 1 — a 1-indexed row of
// the matrix the test received, and the LAST row before the shift (the card
// copy reads "between rows X and Y"). So the first row of the new segment is
// changepointRow + 1.
//
// A row-condition boundary is the 1-indexed row of the FIRST row of each
// condition after the first. Both quantities therefore name "the first row on
// the new side", and the distance between them is a plain subtraction in one
// coordinate system. DS12b: Genuine rows 1-200, Fabricated 201-400, so its
// boundary is 201; a changepoint reported at 196 means the shift is placed
// between rows 196 and 197, i.e. 4 rows early.
//
// On the per-group dispatch path the reported row is 1-indexed within ONE
// group's sub-matrix, not the file. That path only ever runs on column-grouped
// fixtures, which carry no row boundaries at all, so no distance is computed
// there and none is implied.
//
// A row label is not the same thing as a row BLOCK. Some fixtures carry
// contiguous condition blocks (DS12b: Genuine 1-200, Fabricated 201-400) and
// some alternate the label every row (DS03: WT, KO, WT, KO...). On an
// alternating file every row is a label transition, so a changepoint anywhere
// scores a distance of zero by construction and the number carries nothing.
// The census counts label runs and refuses the distance where the count
// exceeds the condition count, rather than reporting a zero it cannot defend.

const num = v => {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/** Full-precision double, so a floor identity is never judged from rounded output. */
const full = v => (v === null || v === undefined ? '—' : Number(v).toPrecision(17));

/**
 * Condition structure of a fixture, on whichever axis carries it.
 * Column groups take priority in createConditionContext, so report both when
 * a fixture happens to carry both and let the reader see the conflict.
 */
function readConditionStructure(condCtx, matrix) {
  const out = {
    axis: 'none',
    nConditions: condCtx.count,
    names: condCtx.names.slice(),
    rowBoundaries: null,
    nRowBlocks: null,
    rowLayout: 'none',
    columnGroups: null,
  };
  if (condCtx.type === 'column-grouped') {
    out.axis = 'column groups';
    out.columnGroups = condCtx.slices().map(s => ({
      name: s.name,
      // 1-indexed DATA-matrix columns, so the axis reads the same way the row
      // axis does. These are matrix columns, not spreadsheet letters.
      columns: (s.colIndices || []).map(ci => ci + 1),
    }));
  } else if (condCtx.type === 'row-grouped') {
    out.axis = 'row blocks';
  }

  // Row boundaries are computed whenever row labels exist, independent of which
  // axis won the type, so a column-grouped fixture that also carries row labels
  // does not silently lose them.
  const rc = condCtx.rowConditions;
  if (rc && rc.some(c => c)) {
    const bounds = [];
    let prev = null;
    for (let r = 0; r < matrix.length && r < rc.length; r++) {
      const c = rc[r];
      if (c == null) continue;
      if (prev !== null && c !== prev) bounds.push(r + 1); // 1-indexed first row of the new block
      prev = c;
    }
    out.rowBoundaries = bounds;
    // Runs of the label, not distinct labels. Contiguous blocks give one run
    // per condition; an alternating file gives one run per row.
    out.nRowBlocks = bounds.length + 1;
    out.rowLayout = out.nRowBlocks === out.nConditions ? 'contiguous' : 'interleaved';
  }
  return out;
}

/**
 * Distance from the changepoint to the nearest row boundary.
 * Returns null where the question is not answerable: no row labels, or labels
 * that alternate rather than block, where every row is a transition and any
 * changepoint scores zero regardless of the data.
 */
function boundaryDistance(changepointRow, cond) {
  if (changepointRow == null) return null;
  if (cond.rowLayout !== 'contiguous') return null;
  if (!cond.rowBoundaries || !cond.rowBoundaries.length) return null;
  const firstRowAfter = changepointRow + 1;
  return Math.min(...cond.rowBoundaries.map(b => Math.abs(firstRowAfter - b)));
}

/**
 * Which arm produced the tier. Reads returned fields only; re-derives nothing
 * the test did not already decide.
 */
function attributeArm(r, perGroup) {
  const scanP = num(r.scanP);
  const cusumP = num(r.cusumP);
  const arms = [];
  if (scanP !== null && flagFromP(scanP) === r.flag) arms.push('window scan');
  // Mirrors loessResidual.js:224 — a cusumP of exactly 1 is neutralised to LOW
  // rather than read through the ladder.
  if (cusumP !== null && cusumP < 1 && flagFromP(cusumP) === r.flag) arms.push('CUSUM');
  if (r.pairPromoted && r.flag === 'MODERATE') arms.push('per-pair BH-FDR promotion');
  if (perGroup) {
    const fisherP = num(r.fisherP);
    if (fisherP !== null && flagFromP(fisherP) === r.flag) arms.push('Fisher across groups');
    const adj = num(r.groupMinPAdj);
    if (adj !== null && flagFromP(adj) === r.flag) arms.push('Sidak worst-group arm');
  }
  return arms.length ? arms.join(' + ') : '—';
}

async function runFixture(file, expected) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;

  const pp = preprocessRaw(raw);
  raw = pp.rows;

  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);

  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;

  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false
  });

  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );

  const r = results.find(x => x.name === TEST_NAME);
  const cond = readConditionStructure(condCtx, matrix);

  // The per-group dispatch predicate, read from the same expression engine.js
  // uses at :217. Matching it here rather than inferring the path from the
  // shape of the returned object keeps the census honest about which branch ran.
  const perGroup = condCtx.type === 'column-grouped' && condCtx.count >= 2;

  const row = {
    fixture: file,
    expectedSeverity: expected.severity,
    declared: !!(expected.flags && TEST_NAME in expected.flags),
    declaredAllow: expected.flags?.[TEST_NAME] || null,
    rows: matrix.length,
    cols: matrix[0]?.length ?? 0,
    condAxis: cond.axis,
    nConditions: cond.nConditions,
    conditionNames: cond.names,
    rowBoundaries: cond.rowBoundaries,
    nRowBlocks: cond.nRowBlocks,
    rowLayout: cond.rowLayout,
    columnGroups: cond.columnGroups,
    dispatch: perGroup ? 'per-group' : 'whole-file',
    nGroups: perGroup ? (r?.groupsAssessed ?? null) : null,
    reportingGroup: perGroup ? (r?.worstGroup ?? null) : null,
    tier: r ? r.flag : 'ABSENT',
    naCause: r?.naCause ?? null,
  };

  if (!r || r.flag === 'N/A' || r.cusumP === undefined) {
    // Three ways to land here: the test was withheld at dispatch (row-semantics
    // or data-type skip), it returned N/A on a size guard, or it took the
    // near-zero-variance early return at loessResidual.js:82, which emits a LOW
    // with no cusumP and no nPerm. Recorded distinctly rather than merged.
    return {
      ...row,
      reason: !r ? 'not in results'
        : r.flag === 'N/A' ? 'not applicable'
        : 'returned before the permutation loop',
      nValidRows: num(r?.nValidRows),
      nPerm: null, floor: null,
      cusumP: null, cusumOnFloor: null,
      scanP: null, scanOnFloor: null,
      highReachableCusum: null, highReachableScan: null,
      changepointRow: null, boundaryDistance: null,
      arm: '—',
      combinedP: null, tierRaw: null, tierDoubled: null, doublingMoves: null,
    };
  }

  // ── The §2.7 documentation gap, sized ────────────────────────────────
  //
  // METHODOLOGY §2.7 states `primaryP = min(scanP, cusumP) × 2 (Bonferroni for
  // 2 statistics)`. loessResidual.js:225 computes the minimum and applies no
  // multiplier, and the flag never reads that quantity at all — it takes the
  // higher-ranked of two flags derived from the raw p-values. Both routes agree
  // on which p decides, so the counterfactual is one multiplication: does the
  // documented doubling move the tier the ladder returns?
  //
  // Computed on the pooled arm only. On the per-group dispatch path the
  // aggregate flag is composed downstream from every group's primaryP, so a
  // fixture whose pooled tier moves here has not necessarily had its verdict
  // moved — that is called out per fixture rather than folded into the count.
  const combinedP = Math.min(
    num(r.scanP) ?? 1,
    (num(r.cusumP) !== null && num(r.cusumP) < 1) ? num(r.cusumP) : 1
  );
  const tierRaw = flagFromP(combinedP);
  const tierDoubled = flagFromP(Math.min(1, combinedP * 2));

  const nPerm = num(r.nPerm);
  // The exact floor for this fixture's branch: c/(B+1) with c = 1, the add-one
  // numerator in loessResidual.js:213-214. Computed the same way the test
  // computes its p, so an exceedance count of zero compares equal on the double.
  const floor = 1 / (nPerm + 1);
  const cusumP = num(r.cusumP);
  const scanP = num(r.scanP);

  return {
    ...row,
    reason: null,
    nValidRows: num(r.nValidRows),
    nPerm,
    floor,
    cusumP,
    cusumOnFloor: cusumP === floor,
    scanP,
    scanOnFloor: scanP === floor,
    // ALPHA.FLAG below the floor means HIGH is arithmetically unreachable from
    // that arm on this fixture, whatever the data says.
    highReachableCusum: ALPHA.FLAG > floor,
    highReachableScan: ALPHA.FLAG > floor,
    changepointRow: num(r.changepointRow),
    changepointDirection: r.changepointDirection ?? null,
    boundaryDistance: perGroup ? null : boundaryDistance(num(r.changepointRow), cond),
    bestVarRatio: r.bestVarRatio ?? null,
    pairPromoted: !!r.pairPromoted,
    arm: attributeArm(r, perGroup),
    combinedP,
    tierRaw,
    tierDoubled,
    doublingMoves: tierRaw !== tierDoubled,
  };
}

// ── Run ─────────────────────────────────────────────────────────────────

const files = Object.keys(EXPECTED);
console.log(`S359 — LOESS floor and changepoint census`);
console.log(`${files.length} fixtures, seed offset 0, one run each.`);
console.log(`ALPHA.FLAG = ${ALPHA.FLAG}, ALPHA.NOTE = ${ALPHA.NOTE} (imported, not restated).\n`);

const rows = [];
for (const [file, expected] of Object.entries(EXPECTED)) {
  process.stderr.write(`  ${file} … `);
  const row = await runFixture(file, expected);
  rows.push(row);
  process.stderr.write(`${row.tier}\n`);
}

// ── Table 1: dispatch, geometry and condition structure ────────────────
const pad = (s, n) => String(s ?? '—').padEnd(n);
const lpad = (s, n) => String(s ?? '—').padStart(n);

console.log('\n── Dispatch, geometry, condition structure ' + '─'.repeat(46));
console.log(
  pad('fixture', 42) + lpad('rows', 5) + lpad('cols', 5) + '  ' +
  pad('path', 11) + lpad('grp', 4) + '  ' + pad('reporting grp', 14) +
  lpad('validRows', 10) + '  ' + pad('cond axis', 14) + lpad('n', 3) + '  ' +
  pad('layout', 12) + 'boundaries'
);
for (const r of rows) {
  let bounds;
  if (r.condAxis === 'column groups') {
    bounds = (r.columnGroups || []).map(g => `${g.name}:c${g.columns.join(',')}`).join(' ');
  } else if (r.rowLayout === 'contiguous') {
    bounds = `r${r.rowBoundaries.join(' r')}`;
  } else if (r.rowLayout === 'interleaved') {
    // Never print 400 of them. The count is the fact; the full list is in JSON.
    bounds = `${r.nRowBlocks} label runs over ${r.rows} rows — every row a transition`;
  } else {
    bounds = '—';
  }
  console.log(
    pad(r.fixture, 42) + lpad(r.rows, 5) + lpad(r.cols, 5) + '  ' +
    pad(r.dispatch, 11) + lpad(r.nGroups, 4) + '  ' + pad(r.reportingGroup, 14) +
    lpad(r.nValidRows, 10) + '  ' + pad(r.condAxis, 14) + lpad(r.nConditions, 3) + '  ' +
    pad(r.rowLayout, 12) + bounds
  );
}

// ── Table 2: the floor ─────────────────────────────────────────────────
console.log('\n── The floor ' + '─'.repeat(76));
console.log(
  pad('fixture', 38) + lpad('B', 6) + lpad('floor', 10) + '  ' +
  pad('cusumP', 24) + pad('=floor', 7) + pad('scanP', 24) + pad('=floor', 7) +
  pad('HIGH reachable', 15)
);
for (const r of rows) {
  const yn = v => (v === null ? '—' : v ? 'yes' : 'no');
  const reach = r.floor === null ? '—'
    : `${yn(r.highReachableCusum)}/${yn(r.highReachableScan)}`;
  console.log(
    pad(r.fixture, 38) + lpad(r.nPerm, 6) + lpad(r.floor === null ? '—' : r.floor, 10) + '  ' +
    pad(full(r.cusumP), 24) + pad(yn(r.cusumOnFloor), 7) +
    pad(full(r.scanP), 24) + pad(yn(r.scanOnFloor), 7) +
    pad(reach, 15)
  );
}
console.log('  HIGH reachable column is cusum/scan. Both read ALPHA.FLAG > floor for this fixture.');

// ── Table 3: changepoint, tier, declaration ────────────────────────────
console.log('\n── Changepoint and verdict ' + '─'.repeat(62));
console.log(
  pad('fixture', 38) + lpad('cp row', 7) + '  ' + pad('direction', 11) +
  lpad('dist', 6) + '  ' + pad('tier', 9) + pad('declared', 10) + 'arm'
);
for (const r of rows) {
  console.log(
    pad(r.fixture, 38) + lpad(r.changepointRow, 7) + '  ' + pad(r.changepointDirection, 11) +
    lpad(r.boundaryDistance, 6) + '  ' + pad(r.tier, 9) +
    pad(r.declared ? 'yes' : 'no', 10) + (r.arm || '—')
  );
}
console.log('  dist = |changepointRow + 1 - nearest row boundary|, contiguous-block fixtures only.');
console.log('  blank where the fixture has no row labels, or where its labels alternate per row');
console.log('  so that every row is a transition and any changepoint would score zero.');

// ── Table 4: the METHODOLOGY §2.7 doubling counterfactual ──────────────
console.log('\n── Documented x2 against the shipped raw p ' + '─'.repeat(46));
console.log(
  pad('fixture', 42) + pad('min(scanP,cusumP)', 24) + pad('shipped', 10) +
  pad('with x2', 10) + pad('moves', 7) + 'returned tier'
);
for (const r of rows) {
  if (r.combinedP === null) continue;
  console.log(
    pad(r.fixture, 42) + pad(full(r.combinedP), 24) + pad(r.tierRaw, 10) +
    pad(r.tierDoubled, 10) + pad(r.doublingMoves ? 'YES' : 'no', 7) +
    r.tier + (r.dispatch === 'per-group' ? '  (aggregate, per-group)' : '')
  );
}

// ── Summary counts ─────────────────────────────────────────────────────
const ran = rows.filter(r => r.cusumP !== null);
const onFloorCusum = ran.filter(r => r.cusumOnFloor);
const onFloorScan = ran.filter(r => r.scanOnFloor);
const onFloorClean = onFloorCusum.filter(r => r.expectedSeverity === 0);
const withDistance = rows.filter(r => r.boundaryDistance !== null);
const nearBoundary = withDistance.filter(r => r.boundaryDistance <= NEAR_BOUNDARY_ROWS);
const highs = ran.filter(r => r.tier === 'HIGH');
// Reported so the denominator above is never mistaken for "all row-labelled
// fixtures". These carry row labels and are excluded on layout, not on data.
const interleaved = rows.filter(r => r.rowLayout === 'interleaved' && r.changepointRow !== null);
const doublingMovers = ran.filter(r => r.doublingMoves);

console.log('\n── Summary ' + '─'.repeat(78));
console.log(`  fixtures in the census                              ${rows.length}`);
console.log(`  LOESS reached the permutation loop                  ${ran.length}`);
console.log(`  cusumP exactly on the floor (identity on double)    ${onFloorCusum.length}`);
console.log(`    of those, clean fixtures at expected severity 0   ${onFloorClean.length}`);
console.log(`  scanP exactly on the floor                          ${onFloorScan.length}`);
console.log(`  contiguous row blocks + a changepoint               ${withDistance.length}`);
console.log(`  changepoints within ${NEAR_BOUNDARY_ROWS} rows of a boundary            ${nearBoundary.length}`);
console.log(`  row-labelled but interleaved, distance refused      ${interleaved.length}`);
console.log(`  fixtures returning HIGH from LOESS                  ${highs.length}`);
console.log(`  tiers moved by the documented x2                   ${doublingMovers.length}`);
if (onFloorCusum.length) console.log(`\n  on the cusumP floor: ${onFloorCusum.map(r => r.fixture).join(', ')}`);
if (onFloorScan.length) console.log(`  on the scanP floor:  ${onFloorScan.map(r => r.fixture).join(', ')}`);
if (withDistance.length) console.log(`  distances measured: ${withDistance.map(r => `${r.fixture} (${r.boundaryDistance})`).join(', ')}`);
if (interleaved.length) console.log(`  distance refused, interleaved labels: ${interleaved.map(r => r.fixture).join(', ')}`);
if (highs.length) console.log(`  HIGH: ${highs.map(r => `${r.fixture} via ${r.arm}`).join(', ')}`);
if (doublingMovers.length) console.log(`  moved by x2: ${doublingMovers.map(r => `${r.fixture} ${r.tierRaw}->${r.tierDoubled}`).join(', ')}`);

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, 'census.json');
writeFileSync(outPath, JSON.stringify({
  alpha: ALPHA,
  nearBoundaryRows: NEAR_BOUNDARY_ROWS,
  rows,
  summary: {
    fixtures: rows.length,
    reachedPermutationLoop: ran.length,
    cusumOnFloor: onFloorCusum.map(r => r.fixture),
    cusumOnFloorClean: onFloorClean.map(r => r.fixture),
    scanOnFloor: onFloorScan.map(r => r.fixture),
    contiguousWithDistance: withDistance.map(r => ({ fixture: r.fixture, distance: r.boundaryDistance })),
    nearBoundary: nearBoundary.map(r => ({ fixture: r.fixture, distance: r.boundaryDistance })),
    interleavedDistanceRefused: interleaved.map(r => r.fixture),
    doublingMovers: doublingMovers.map(r => ({ fixture: r.fixture, from: r.tierRaw, to: r.tierDoubled, returned: r.tier })),
    high: highs.map(r => ({ fixture: r.fixture, arm: r.arm })),
  },
}, null, 2));
console.log(`\nwrote ${outPath}`);

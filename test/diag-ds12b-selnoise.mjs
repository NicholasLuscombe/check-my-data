#!/usr/bin/env node
// DS12b Selective Noise diagnostic — investigation only, no code changes.
// Run: node test/diag-ds12b-selnoise.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Inline CSV parser (minimal, no PapaParse dependency) ──
function parseCSV(text) {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const vals = [];
    let inQuote = false, cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    return vals;
  });
}

// ── Load stats primitives ──
const { mean, variance, chiSquaredP } = await import('../src/stats/primitives.js');
const { testSelectiveNoise } = await import('../src/tests/selectiveNoise.js');
const { inferRoles } = await import('../src/import/roles.js');
const { createConditionContext } = await import('../src/analysis/conditionContext.js');
const { buildGroups } = await import('../src/analysis/aggregation.js');
const { flagFromP } = await import('../src/constants/thresholds.js');

// ── Load DS12b ──
const csvPath = path.join(__dirname, 'fixtures', '12b-uniform-mixture-fabricated.csv');
const raw = parseCSV(fs.readFileSync(csvPath, 'utf-8'));
const headers = raw[0];
const data = raw.slice(1);

console.log('=== DS12b SELECTIVE NOISE DIAGNOSTIC ===\n');

// ── Q1: Import pipeline analysis ──
console.log('─── Q1: Import Pipeline ───');
console.log('Headers:', headers);
console.log('Total rows:', data.length);

const roles = inferRoles(data, headers, null);
console.log('Inferred roles:', headers.map((h, i) => `${h}=${roles[i]}`).join(', '));

const dataCols = roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
const condCols = roles.map((r, i) => r === 'condition' ? i : -1).filter(i => i >= 0);
console.log('DATA columns:', dataCols.length, '→', dataCols.map(i => headers[i]));
console.log('CONDITION columns:', condCols.length, '→', condCols.map(i => headers[i]));

// Build numeric matrix
const filteredIndices = [];
const matrix = data.map(row =>
  dataCols.map(ci => {
    const v = row[ci];
    if (v == null || v === '') return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    return n;
  })
).filter((row, i) => { const keep = row.some(v => v !== null); if (keep) filteredIndices.push(i); return keep; });

console.log('Matrix dimensions:', matrix.length, '×', matrix[0].length);

// Row-level conditions
let rowConditions = null;
if (condCols.length) {
  const rc = data.map(row => {
    const parts = condCols.map(ci => row[ci] != null && String(row[ci]).trim() ? String(row[ci]).trim() : null).filter(Boolean);
    return parts.join(' | ') || null;
  });
  if (rc.some(c => c)) rowConditions = filteredIndices.map(i => rc[i] || null);
}

// ConditionContext
const groups = buildGroups(matrix, dataCols, null);
const condCtx = createConditionContext({ groups, rowConditions, matrix });

console.log('condCtx.type:', condCtx.type);
console.log('condCtx.paired:', condCtx.paired);
console.log('condCtx.count:', condCtx.count);
console.log('condCtx.names:', condCtx.names);
console.log('condCtx.has:', condCtx.has);

if (rowConditions) {
  const condCounts = {};
  rowConditions.forEach(c => { if (c) condCounts[c] = (condCounts[c] || 0) + 1; });
  console.log('Row condition distribution:', condCounts);
}

// ── Q2: What matrix does SelNoise receive? ──
console.log('\n─── Q2: SelNoise Input Matrix ───');
// From engine.js line 241: SelNoise uses runPairVST(testSelectiveNoise)
// runPairVST calls runPair which checks useAggregate
const useAggregate = condCtx.type === 'column-grouped' && condCtx.count >= 2;
const isConditionsMode = condCtx.type === 'column-grouped' && !condCtx.paired;
console.log('useAggregate:', useAggregate);
console.log('isConditionsMode:', isConditionsMode);

if (useAggregate) {
  console.log('SelNoise goes through aggregatePerGroup — receives per-group sub-matrices');
  const slices = condCtx.slices();
  slices.forEach(s => {
    console.log(`  Group "${s.name}": ${s.matrix.length} × ${s.matrix[0]?.length || 0} cols, colIndices=${JSON.stringify(s.colIndices)}, rowIndices=${s.rowIndices ? s.rowIndices.length + ' rows' : 'N/A'}`);
  });
} else {
  console.log('SelNoise receives the FULL matrix:', matrix.length, '×', matrix[0].length);
}

// Since condCtx is row-grouped, runPair calls testSelectiveNoise(matrix, null)
// i.e. the full matrix. Let's verify:
console.log('\nActual SelNoise call path:');
if (condCtx.type === 'row-grouped') {
  console.log('  condCtx.type === "row-grouped" → useAggregate = false');
  console.log('  runPairVST → runPair → testSelectiveNoise(matrix)');
  console.log('  SelNoise receives FULL matrix:', matrix.length, '×', matrix[0].length);
}

// ── Q3: Per-column residual variances on full matrix ──
console.log('\n─── Q3: Per-Column Residual Variances (Full Matrix) ───');
const nR = matrix.length, nC = matrix[0].length;
const rowMeans = matrix.map(row => {
  const v = row.filter(x => x != null);
  return v.length ? mean(v) : null;
});

const colResidualVars = [];
for (let c = 0; c < nC; c++) {
  const res = [];
  for (let r = 0; r < nR; r++) {
    if (matrix[r][c] != null && rowMeans[r] != null) res.push(matrix[r][c] - rowMeans[r]);
  }
  const v = variance(res);
  colResidualVars.push({ col: c, colName: headers[dataCols[c]], n: res.length, variance: v, std: Math.sqrt(v) });
}

console.log('Column residual variances:');
colResidualVars.forEach(cv => {
  console.log(`  ${cv.colName} (col ${cv.col}): var=${cv.variance.toFixed(6)}, std=${cv.std.toFixed(6)}, n=${cv.n}`);
});
const vars = colResidualVars.map(c => c.variance);
const maxV = Math.max(...vars), minV = Math.min(...vars);
console.log(`Max/min ratio: ${(maxV / minV).toFixed(6)}`);
console.log(`Max variance: ${maxV.toFixed(6)} (col ${colResidualVars[vars.indexOf(maxV)].colName})`);
console.log(`Min variance: ${minV.toFixed(6)} (col ${colResidualVars[vars.indexOf(minV)].colName})`);

// ── Q4: Bartlett p-value ──
console.log('\n─── Q4: Bartlett Test on Full Matrix ───');
const fullResult = testSelectiveNoise(matrix);
console.log('Result:', JSON.stringify(fullResult, null, 2));

// ── Q5: Per-condition split ──
console.log('\n─── Q5: Per-Condition Split ───');
const conditions = [...new Set(rowConditions.filter(Boolean))];
for (const cond of conditions) {
  console.log(`\n  --- Condition: "${cond}" ---`);
  const condRows = [];
  for (let r = 0; r < matrix.length; r++) {
    if (rowConditions[r] === cond) condRows.push(matrix[r]);
  }
  console.log(`  Rows: ${condRows.length} × ${condRows[0].length}`);

  // Residual variances within this condition
  const cRowMeans = condRows.map(row => {
    const v = row.filter(x => x != null);
    return v.length ? mean(v) : null;
  });
  const cColVars = [];
  for (let c = 0; c < nC; c++) {
    const res = [];
    for (let r = 0; r < condRows.length; r++) {
      if (condRows[r][c] != null && cRowMeans[r] != null) res.push(condRows[r][c] - cRowMeans[r]);
    }
    const v = variance(res);
    cColVars.push({ col: c, colName: headers[dataCols[c]], n: res.length, variance: v, std: Math.sqrt(v) });
  }

  console.log('  Column residual variances:');
  cColVars.forEach(cv => {
    console.log(`    ${cv.colName}: var=${cv.variance.toFixed(6)}, std=${cv.std.toFixed(6)}, n=${cv.n}`);
  });
  const cVars = cColVars.map(c => c.variance);
  const cMaxV = Math.max(...cVars), cMinV = Math.min(...cVars);
  console.log(`  Max/min ratio: ${(cMaxV / cMinV).toFixed(6)}`);

  // Run Bartlett on this condition's sub-matrix
  const condResult = testSelectiveNoise(condRows);
  console.log(`  Bartlett chi²: ${condResult.bartlettChi}, p: ${condResult.pBartlett}, flag: ${condResult.flag}`);
  console.log(`  Variance ratio: ${condResult.maxMinVarianceRatio}`);
}

// ── Q6: Engine routing analysis ──
console.log('\n─── Q6: Engine Routing Analysis ───');
console.log('In engine.js line 241:');
console.log('  ["Selective Noise", async () => condSkip(...) || dtSkip(...) || tagVST(await runPairVST(testSelectiveNoise))]');
console.log('');
console.log('runPairVST calls runPair (no VST for this dataset):');
console.log('  async function runPair(testFn, parentCondCtx) {');
console.log('    return useAggregate');
console.log('      ? await aggregatePerGroup(testFn, condCtx.slices(), parentCondCtx || null)');
console.log('      : testFn(matrix, parentCondCtx || null);');
console.log('  }');
console.log('');
console.log('Key: SelNoise is called as runPairVST(testSelectiveNoise) — NO parentCondCtx arg passed.');
console.log('So runPair(testSelectiveNoise, undefined) is called.');
console.log('useAggregate =', useAggregate, '(type=' + condCtx.type + ', count=' + condCtx.count + ')');
console.log('');
if (!useAggregate) {
  console.log('RESULT: testSelectiveNoise(matrix, null) — runs ONCE on the FULL 400-row matrix.');
  console.log('It does NOT split by condition. All 6 columns compared as if they were replicates.');
} else {
  console.log('RESULT: Goes through aggregatePerGroup — split by groups');
}

// ── Additional diagnostic: What's causing the variance difference? ──
console.log('\n─── Additional: Variance Breakdown by Condition ───');
// Check if genuine vs fabricated rows have different within-row spread patterns
for (const cond of conditions) {
  const condRows = [];
  for (let r = 0; r < matrix.length; r++) {
    if (rowConditions[r] === cond) condRows.push(matrix[r]);
  }
  const rowSDs = condRows.map(row => {
    const v = row.filter(x => x != null);
    const m = mean(v);
    return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(v.length - 1, 1));
  });
  console.log(`"${cond}" rows: mean within-row SD = ${mean(rowSDs).toFixed(4)}, row SD variance = ${variance(rowSDs).toFixed(4)}`);
}

// Check if row means differ systematically between conditions
console.log('\n─── Additional: Row Mean Distributions ───');
for (const cond of conditions) {
  const condMeans = [];
  for (let r = 0; r < matrix.length; r++) {
    if (rowConditions[r] === cond && rowMeans[r] != null) condMeans.push(rowMeans[r]);
  }
  console.log(`"${cond}" row means: mean=${mean(condMeans).toFixed(4)}, var=${variance(condMeans).toFixed(4)}, min=${Math.min(...condMeans).toFixed(4)}, max=${Math.max(...condMeans).toFixed(4)}`);
}

// Check: does mixing conditions with different means inflate residual variance differently per column?
console.log('\n─── Additional: Column-Level Condition Interaction ───');
console.log('If Genuine and Fabricated have different mean levels, residuals = val - rowMean');
console.log('should still be symmetric. But if the NOISE DISTRIBUTION differs between conditions');
console.log('and conditions have different representation in each column (they dont — same 6 cols),');
console.log('then variance could differ. Let us check if noise SD differs between conditions:');

for (const cond of conditions) {
  const condIdxs = [];
  for (let r = 0; r < matrix.length; r++) {
    if (rowConditions[r] === cond) condIdxs.push(r);
  }
  for (let c = 0; c < nC; c++) {
    const vals = condIdxs.map(r => matrix[r][c]).filter(x => x != null);
    const rMeans = condIdxs.map(r => rowMeans[r]);
    const residuals = condIdxs.map(r => matrix[r][c] != null && rowMeans[r] != null ? matrix[r][c] - rowMeans[r] : null).filter(x => x != null);
    const v = variance(residuals);
    console.log(`  ${cond} col ${headers[dataCols[c]]}: residual var = ${v.toFixed(6)} (n=${residuals.length})`);
  }
}

// Key insight: when we compute residuals as val - rowMean across the POOLED dataset,
// the row means are computed from all 6 columns. If Genuine and Fabricated have
// different underlying noise patterns, the POOLED residual variances per column
// might differ even if per-condition they don't.
console.log('\n─── Additional: Effect of Pooling on Residual Variance ───');
console.log('Comparing pooled residual variance vs condition-weighted average:');
for (let c = 0; c < nC; c++) {
  // Pooled (what SelNoise computes)
  const pooledRes = [];
  for (let r = 0; r < nR; r++) {
    if (matrix[r][c] != null && rowMeans[r] != null) pooledRes.push(matrix[r][c] - rowMeans[r]);
  }
  const pooledVar = variance(pooledRes);

  // Per-condition then average
  const condVars = [];
  for (const cond of conditions) {
    const condRes = [];
    for (let r = 0; r < nR; r++) {
      if (rowConditions[r] === cond && matrix[r][c] != null) {
        const condRowVals = matrix[r].filter(x => x != null);
        const condRowMean = mean(condRowVals);
        condRes.push(matrix[r][c] - condRowMean);
      }
    }
    condVars.push({ cond, var: variance(condRes), n: condRes.length });
  }
  const weightedAvg = condVars.reduce((s, cv) => s + cv.var * cv.n, 0) / condVars.reduce((s, cv) => s + cv.n, 0);
  console.log(`  ${headers[dataCols[c]]}: pooled=${pooledVar.toFixed(6)}, weighted-avg=${weightedAvg.toFixed(6)}, diff=${(pooledVar - weightedAvg).toFixed(6)}`);
}

console.log('\n=== DIAGNOSTIC COMPLETE ===');

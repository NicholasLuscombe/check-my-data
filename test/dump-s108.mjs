// S108 Part 2 Phase 3 — per-test detail for DS20 v2 + DS21 v2.
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';

async function runOne(file, assay) {
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
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  return { results, roles, headers, condPerCol, matrix, condCtx };
}

function byName(results, name) {
  return results.find(r => r.name === name || (r.name && r.name.toLowerCase().includes(name.toLowerCase())));
}
function fmtP(p) {
  if (p == null || isNaN(p)) return 'n/a';
  if (p < 1e-4) return p.toExponential(2);
  return p.toFixed(4);
}

// γ₁ / γ₂ identical to modality.js centralMoments (/N denominator).
function skewKurt(vals) {
  const v = vals.filter(x => x != null && isFinite(x));
  const n = v.length;
  if (n === 0) return { n: 0, g1: NaN, g2: NaN };
  const mu = v.reduce((a, b) => a + b, 0) / n;
  let m2 = 0, m3 = 0, m4 = 0;
  for (const x of v) {
    const d = x - mu, d2 = d * d;
    m2 += d2; m3 += d2 * d; m4 += d2 * d2;
  }
  m2 /= n; m3 /= n; m4 /= n;
  const g1 = m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
  const g2 = m2 > 0 ? m4 / (m2 * m2) - 3 : 0;
  return { n, g1, g2 };
}

function modalityRouting(g2, n) {
  // Mirrors modality.js pre-skip: γ₂ < −1.2 universal; γ₂ < −0.8 at N≥100.
  if (g2 < -1.2) return 'γ₂<-1.2 (universal skip)';
  if (g2 < -0.8 && n >= 100) return 'γ₂<-0.8 @N≥100 (skip)';
  return 'applicable';
}

function columnVals(matrix, ci) {
  const out = [];
  for (let r = 0; r < matrix.length; r++) {
    const v = matrix[r][ci];
    if (v != null && isFinite(v)) out.push(v);
  }
  return out;
}

async function dumpDS20() {
  console.log('\n══════════ DS20 v2 (70/30 asymmetric mixture) ══════════');
  const { results, matrix } = await runOne('20-bimodal-fab.csv', 'general');
  const nCols = matrix[0].length;
  console.log(`matrix: ${matrix.length} rows × ${nCols} data cols`);

  // Per-col γ₁/γ₂/N/distinct routing
  console.log('\nPer-col shape (γ₁, γ₂, N) + Modality routing:');
  const colShape = [];
  for (let ci = 0; ci < nCols; ci++) {
    const vals = columnVals(matrix, ci);
    const { n, g1, g2 } = skewKurt(vals);
    const distinct = new Set(vals).size;
    const route = modalityRouting(g2, n);
    colShape.push({ ci, n, distinct, g1, g2, route });
    console.log(`  col${ci+1}: n=${n} distinct=${distinct} γ₁=${g1.toFixed(3)} γ₂=${g2.toFixed(3)} → ${route}`);
  }

  // Modality result
  const mod = byName(results, 'Modality');
  console.log(`\nModality overall: flag=${mod?.flag} primaryP=${fmtP(mod?.primaryP)} nTested=${mod?.nTested} nSkipped=${mod?.nSkipped} nFlagged=${mod?.nFlagged}`);
  if (mod?.skippedColumns?.length) {
    console.log('  Skipped cols:');
    for (const s of mod.skippedColumns) console.log(`    col${s.col}: ${s.reason}`);
  }
  if (mod?.colDips?.length) {
    console.log('  Tested cols (dip, flagged):');
    for (const c of mod.colDips) console.log(`    col${c.col}: dip=${c.dip.toFixed(4)}  flagged=${c.flagged}`);
  }
  if (mod?.details?.length) {
    console.log('  Flagged-detail (col, Dip, adjP):');
    for (const d of mod.details) console.log(`    col${d.Col}: Dip=${d.Dip} adjP=${fmtP(d.adjP)}`);
  }

  // Column GoF
  const cg = byName(results, 'Column Goodness-of-Fit');
  console.log(`\nColumn GoF: flag=${cg?.flag} primaryP=${fmtP(cg?.primaryP)} nTested=${cg?.nTested ?? '?'} nFlagged=${cg?.nFlagged ?? '?'}`);
  for (const key of ['details', 'colFits', 'perCol', 'units']) {
    if (cg?.[key] && Array.isArray(cg[key])) {
      console.log(`  [${key}] count=${cg[key].length}, first 12:`);
      for (const d of cg[key].slice(0, 12)) console.log(`    ${JSON.stringify(d)}`);
      break;
    }
  }

  // Cross-rep flags
  console.log('\nCross-rep test flags (Dim III):');
  const candidates = ['Inter-Replicate Correlation', 'Excess Kurtosis', 'Autocorrelation',
    'Runs Test', 'Within-Row Variance', 'Selective Noise Partitioning',
    'Regional Noise', 'LOESS Residual', 'Row-Mean Runs', 'Mahalanobis',
    'Mean-Variance', 'Windowed Autocorr'];
  for (const name of candidates) {
    const r = byName(results, name);
    if (r) console.log(`  ${r.name}: flag=${r.flag} primaryP=${fmtP(r.primaryP)}`);
  }

  console.log('\nAll flags (MOD+HIGH) driving severity:');
  for (const r of results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')) {
    console.log(`  ${r.flag}: ${r.name} (${r.category || '?'}) p=${fmtP(r.primaryP)}`);
  }
}

async function dumpDS21() {
  console.log('\n══════════ DS21 v2 (Control-only AR ρ=0.92, window [60,140)) ══════════');
  const { results, matrix, condCtx } = await runOne('21-localised-ar.csv', 'general');
  console.log(`matrix: ${matrix.length} rows × ${matrix[0].length} cols. Control = rows 0-199; Treatment = rows 200-399. Injection rows 60-139.`);

  // Windowed Autocorrelation
  const wa = byName(results, 'Windowed Autocorrelation');
  console.log(`\nWindowed Autocorrelation: flag=${wa?.flag} primaryP=${fmtP(wa?.primaryP)} nPairs=${wa?.nPairs} nWindowsTotal=${wa?.nWindowsTotal} nSig05=${wa?.nSig05} nSig01=${wa?.nSig01}`);
  if (wa?.details) {
    // Group by "in injection window" (startRow in 60..139, endRow ≤ 140 means fully inside Control injection)
    const inInj = wa.details.filter(d => d.startRow >= 60 && d.endRow <= 140);
    const fabFabPairs = new Set(['4–5','4–6','4–7','4–8','5–6','5–7','5–8','6–7','6–8','7–8']);
    const fabFabInInj = inInj.filter(d => fabFabPairs.has(d.pair));
    console.log(`  details.length=${wa.details.length}. Inside-injection windows (60 ≤ start, end ≤ 140): ${inInj.length}. Fab-fab pairs inside: ${fabFabInInj.length}`);
    const sigInInj = inInj.filter(d => d.significant);
    console.log(`  Significant windows inside injection: ${sigInInj.length}`);
    for (const d of sigInInj.slice(0, 20)) console.log(`    ${JSON.stringify(d)}`);

    // Show representative fab-fab inside-injection even if not significant
    console.log('  Sample fab-fab inside-injection windows (first 15):');
    for (const d of fabFabInInj.slice(0, 15)) console.log(`    ${JSON.stringify(d)}`);
  }

  // Cross-Cond Consistency — Stage 2 focus
  const ccc = byName(results, 'Cross-Condition Consistency');
  console.log(`\nCross-Condition Consistency: flag=${ccc?.flag} primaryP=${fmtP(ccc?.primaryP)} nFlagged=${ccc?.nFlagged}`);
  if (ccc?.details) {
    console.log('  All property × pair units:');
    for (const d of ccc.details) console.log(`    ${JSON.stringify(d)}`);
  }

  // Regular Autocorrelation for contrast
  const ac = byName(results, 'Autocorrelation');
  if (ac) console.log(`\nAutocorrelation (global): flag=${ac.flag} primaryP=${fmtP(ac.primaryP)}`);

  console.log('\nAll flags (MOD+HIGH) driving severity:');
  for (const r of results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')) {
    console.log(`  ${r.flag}: ${r.name} (${r.category || '?'}) p=${fmtP(r.primaryP)}`);
  }
}

await dumpDS20();
await dumpDS21();

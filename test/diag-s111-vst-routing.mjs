// S111 Phase 1 Target A — VST-routing decision characterisation.
// Read-only diagnostic: for each of the 22 fixtures, reports `detectVST`
// output, slope CI, mean>0 row-survival vs total, positivity fraction of
// full matrix, fraction of v<0 cells, post-VST row survival, and Σ_B
// λ_max relative drift (raw vs post-VST) on a canonical window (first 40
// rows of the first condition, LW-shrunk, p = nCols). DS15 additionally
// gets a supplementary row reporting λ_max drift at its S110-argmax
// window (Control rows 1–40).
//
// No src/ modifications. No METHODOLOGY / MAP / GT edits. Snapshot to
// /tmp/s111-vst-routing.txt (tee externally).

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { invertMatrix } = await import('../src/stats/primitives.js');

const FIXTURES = 'test/fixtures';
const DATASETS = [
  { file: '01-densitometry-clean.csv',           assay: 'densitometry' },
  { file: '02-densitometry-fabricated.csv',      assay: 'densitometry' },
  { file: '03-qpcr-clean.csv',                   assay: 'qpcr' },
  { file: '04-qpcr-fabricated.csv',              assay: 'qpcr' },
  { file: '05-cellcount-clean.csv',              assay: 'cell_count' },
  { file: '06-cellcount-fabricated.csv',         assay: 'cell_count' },
  { file: '07-elisa-clean.csv',                  assay: 'elisa' },
  { file: '08-elisa-fabricated.csv',             assay: 'elisa' },
  { file: '09-proteomics-clean.csv',             assay: 'proteomics' },
  { file: '10-proteomics-fabricated.csv',        assay: 'proteomics' },
  { file: '11-rnaseq-multicondition.csv',        assay: 'genomics' },
  { file: '12a-uniform-mixture-clean.csv',       assay: 'general' },
  { file: '12b-uniform-mixture-fabricated.csv',  assay: 'general' },
  { file: '13-vfstest-cellcountest.csv',         assay: 'cell_count' },
  { file: '14-crctest-survey.csv',               assay: 'survey' },
  { file: '15-missing-carlisle.csv',             assay: 'general' },
  { file: '16-densitometry-carlisle-overbalanced.csv', assay: 'densitometry' },
  { file: '17-densitometry-carlisle-clean.csv',  assay: 'densitometry' },
  { file: '19-inheritance-fabricated.csv',       assay: 'general' },
  { file: '20-bimodal-fab.csv',                  assay: 'general' },
  { file: '21-localised-ar.csv',                 assay: 'general' },
  { file: '22-covariance-block.csv',             assay: 'general' },
];

// ── LW shrinkage + dominant eigenvalue (copied from blockedMahalanobis.js
//    for diagnostic self-containment; no src/ changes) ──
function sampleCov(rows, mean, p) {
  const N = rows.length;
  const S = Array.from({ length: p }, () => new Array(p).fill(0));
  if (N < 2) return S;
  for (const row of rows) {
    for (let a = 0; a < p; a++) {
      const da = row[a] - mean[a];
      for (let b = a; b < p; b++) {
        S[a][b] += da * (row[b] - mean[b]);
      }
    }
  }
  const denom = N - 1;
  for (let a = 0; a < p; a++) {
    for (let b = a; b < p; b++) {
      S[a][b] /= denom;
      if (a !== b) S[b][a] = S[a][b];
    }
  }
  return S;
}

function ledoitWolfShrink(rows, mean, S, p) {
  const N = rows.length;
  if (N < 2) return { shrunk: S.map(r => r.slice()), alpha: 0 };
  let trS = 0;
  for (let i = 0; i < p; i++) trS += S[i][i];
  const mu = trS / p;
  let delta2 = 0;
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < p; b++) {
      const t = (a === b) ? mu : 0;
      const d = S[a][b] - t;
      delta2 += d * d;
    }
  }
  let sumBeta = 0;
  for (const row of rows) {
    for (let a = 0; a < p; a++) {
      const da = row[a] - mean[a];
      for (let b = 0; b < p; b++) {
        const diff = da * (row[b] - mean[b]) - S[a][b];
        sumBeta += diff * diff;
      }
    }
  }
  const beta2Raw = sumBeta / (N * N);
  const beta2 = Math.min(beta2Raw, delta2);
  let alpha = delta2 > 0 ? beta2 / delta2 : 0;
  if (alpha < 0) alpha = 0;
  if (alpha > 1) alpha = 1;
  const out = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < p; b++) {
      const t = (a === b) ? mu : 0;
      out[a][b] = (1 - alpha) * S[a][b] + alpha * t;
    }
  }
  return { shrunk: out, alpha };
}

function dominantEigenvalue(A, p) {
  const MAX_IT = 200;
  const TOL = 1e-9;
  let v = new Array(p).fill(0);
  v[0] = 1;
  let lambda = 0;
  for (let it = 0; it < MAX_IT; it++) {
    const w = new Array(p);
    for (let i = 0; i < p; i++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += A[i][j] * v[j];
      w[i] = s;
    }
    let num = 0, den = 0;
    for (let i = 0; i < p; i++) { num += w[i] * v[i]; den += v[i] * v[i]; }
    const newLambda = den > 0 ? num / den : 0;
    let norm = 0;
    for (let i = 0; i < p; i++) norm += w[i] * w[i];
    norm = Math.sqrt(norm);
    if (!isFinite(norm) || norm < 1e-300) return lambda;
    for (let i = 0; i < p; i++) v[i] = w[i] / norm;
    if (it > 0 && Math.abs(newLambda - lambda) < TOL * (1 + Math.abs(newLambda))) {
      return newLambda;
    }
    lambda = newLambda;
  }
  return lambda;
}

/** Compute LW-shrunk λ_max of Σ̂_B on a block of rows of length p. */
function lambdaMaxShrunkCov(rows, p) {
  if (rows.length < 2) return null;
  const mu = new Array(p).fill(0);
  for (const r of rows) for (let j = 0; j < p; j++) mu[j] += r[j];
  for (let j = 0; j < p; j++) mu[j] /= rows.length;
  const S = sampleCov(rows, mu, p);
  const { shrunk } = ledoitWolfShrink(rows, mu, S, p);
  return dominantEigenvalue(shrunk, p);
}

/** Extract first-N complete rows from a (maybe-null-containing) row set,
 *  returning the rows in raw form and also in post-VST-log form for the
 *  same original row indices. Rows with ANY null in EITHER raw or post-VST
 *  are excluded — this isolates the v<0-filter effect cleanly. */
function takeFirstNRaw(rawRows, n, p) {
  const out = [];
  for (const r of rawRows) {
    if (out.length === n) break;
    if (r.every(v => v != null && isFinite(v))) out.push(r);
  }
  return out;
}

/** Apply VST-log to a row (v>0 → log, else null). */
function vstLogRow(row) {
  return row.map(v => (v != null && v > 0) ? Math.log(v) : null);
}

/** For a raw block of `nTarget` complete rows, return paired (raw, vst)
 *  blocks where both are restricted to the intersection of raw-complete and
 *  vst-complete rows (i.e. post-VST NaN rows dropped). Reports nRawKept
 *  (should be nTarget) and nVstKept. */
function pairedBlockForVST(rawRows, nTarget, p) {
  const selectedRaw = takeFirstNRaw(rawRows, nTarget, p);
  const selectedVst = [];
  const rawKeptForVst = [];
  for (const r of selectedRaw) {
    const v = vstLogRow(r);
    if (v.every(x => x != null && isFinite(x))) {
      rawKeptForVst.push(r);
      selectedVst.push(v);
    }
  }
  return { selectedRaw, selectedVst, rawKeptForVst, nRawSelected: selectedRaw.length, nVstKept: selectedVst.length };
}

function loadFixture(file, assay) {
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
  const { matrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false
  });
  return { matrix, condCtx, assay };
}

/** Return detectVST-style slope fit over rows with mean>0 AND var>0 (same
 *  conditioning as detectVST). Exposes numRowsWithMeanPositive so we can
 *  report (mean>0 survivors) / nRows. */
function rerunVstSlopeFit(matrix) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  let numMeanPositive = 0;
  const points = [];
  for (let r = 0; r < nR; r++) {
    const vals = matrix[r].filter(v => v != null && v > 0);
    if (vals.length >= 3) {
      const m = vals.reduce((a, b) => a + b, 0) / vals.length;
      const v = vals.reduce((s, x) => s + (x - m) ** 2, 0) / (vals.length - 1);
      if (m > 0 && v > 0) {
        points.push({ lm: Math.log(m), lv: Math.log(v) });
        numMeanPositive++;
      }
    }
  }
  return { nPoints: points.length, numMeanPositive, nR, nC };
}

function matrixStats(matrix) {
  const allVals = matrix.flat().filter(v => v != null);
  const n = allVals.length;
  let nPos = 0, nNeg = 0, nZero = 0;
  for (const v of allVals) {
    if (v > 0) nPos++; else if (v < 0) nNeg++; else nZero++;
  }
  return { n, nPos, nNeg, nZero, posFrac: nPos / (n || 1), negFrac: nNeg / (n || 1) };
}

function applyVstLogMatrix(matrix) {
  return matrix.map(row => row.map(v => (v != null && v > 0) ? Math.log(v) : null));
}

function applyVstAnscombeMatrix(matrix) {
  return matrix.map(row => row.map(v => (v != null && v >= 0) ? Math.sqrt(v + 0.375) : null));
}

/** Post-VST row survival: for the full matrix, count rows fully preserved
 *  (all cells non-null after transform), rows with at least one NaN, rows
 *  fully NaN'd. NaN correlation: of the NaN cells post-VST, what fraction
 *  were v<0 in raw (confirms v<0 → NaN mechanism). */
function postVstRowSurvival(rawMatrix, vstMatrix) {
  const nR = rawMatrix.length;
  const nC = rawMatrix[0].length;
  let rowsPreserved = 0, rowsPartialNull = 0, rowsFullyNull = 0;
  let vstNaNCells = 0, vstNaNFromNegative = 0, vstNaNFromZero = 0, vstNaNFromRawNull = 0;
  for (let i = 0; i < nR; i++) {
    const rawRow = rawMatrix[i];
    const vstRow = vstMatrix[i];
    let nullInRow = 0, allNull = true;
    for (let j = 0; j < nC; j++) {
      const rv = rawRow[j], vv = vstRow[j];
      if (vv == null || !isFinite(vv)) {
        nullInRow++;
        vstNaNCells++;
        if (rv == null) vstNaNFromRawNull++;
        else if (rv < 0) vstNaNFromNegative++;
        else if (rv === 0) vstNaNFromZero++;
      } else {
        allNull = false;
      }
    }
    if (nullInRow === 0) rowsPreserved++;
    else if (nullInRow === nC) rowsFullyNull++;
    else rowsPartialNull++;
  }
  return { nR, rowsPreserved, rowsPartialNull, rowsFullyNull, vstNaNCells, vstNaNFromNegative, vstNaNFromZero, vstNaNFromRawNull };
}

/** First 40 rows of slice 0 (canonical window). If DS15, also run the
 *  Control rows 1–40 check (which for DS15 collapses to slice-named
 *  "Control" if present — report both whether or not they coincide). */
function canonicalLambdaDrift(matrix, condCtx, vstMatrixOrNull, windowN = 40, sliceName = null) {
  const slices = (condCtx && condCtx.has && condCtx.count >= 1)
    ? condCtx.slices()
    : [{ name: "All data", matrix, rowIndices: matrix.map((_, i) => i) }];
  let slice;
  if (sliceName) {
    slice = slices.find(s => s.name === sliceName) || null;
    if (!slice) return { error: `slice "${sliceName}" not found; available: ${slices.map(s => s.name).join(', ')}` };
  } else {
    slice = slices[0];
  }
  const sMatrix = slice.matrix;
  const p = sMatrix[0]?.length || 0;
  if (p < 3) return { error: `p=${p} < 3` };

  // Take first `windowN` complete rows (in the raw sense)
  const rawBlock = [];
  const rawBlockSliceIdx = [];
  for (let i = 0; i < sMatrix.length; i++) {
    if (rawBlock.length === windowN) break;
    if (sMatrix[i].every(v => v != null && isFinite(v))) {
      rawBlock.push(sMatrix[i]);
      rawBlockSliceIdx.push(i);
    }
  }
  if (rawBlock.length < windowN) {
    return { error: `fewer than ${windowN} complete raw rows in slice "${slice.name}" (have ${rawBlock.length})` };
  }

  // λ_max on raw block
  const lamRaw = lambdaMaxShrunkCov(rawBlock, p);

  if (!vstMatrixOrNull) {
    return { slice: slice.name, p, windowN, nRawComplete: rawBlock.length, lamRaw, lamVst: null, drift: null, nVstComplete: null };
  }

  // For post-VST: map slice indices back to vst slice via condCtx with vst matrix.
  // Easier: apply VST-log to the rawBlock rows directly and drop NaN rows.
  const vstBlockRows = [];
  for (const row of rawBlock) {
    const vrow = row.map(v => (v != null && v > 0) ? Math.log(v) : null);
    if (vrow.every(x => x != null && isFinite(x))) vstBlockRows.push(vrow);
  }
  if (vstBlockRows.length < 2) {
    return { slice: slice.name, p, windowN, nRawComplete: rawBlock.length, lamRaw, lamVst: null, drift: null, nVstComplete: vstBlockRows.length, note: 'fewer than 2 post-VST complete rows — λ_max undefined' };
  }
  const lamVst = lambdaMaxShrunkCov(vstBlockRows, p);
  const drift = (lamRaw != null && lamVst != null && lamRaw !== 0)
    ? (lamVst - lamRaw) / lamRaw
    : null;
  return { slice: slice.name, p, windowN, nRawComplete: rawBlock.length, lamRaw, lamVst, drift, nVstComplete: vstBlockRows.length };
}

// ── Main loop ──
console.log('='.repeat(100));
console.log('S111 Phase 1 — Target A: detectVST routing characterisation (22 fixtures)');
console.log('='.repeat(100));
console.log('');

const header = [
  'fixture'.padEnd(44), 'assay'.padEnd(13), 'transform'.padEnd(9), 'slope'.padEnd(8),
  'CI95'.padEnd(16), 'meanPos/nR'.padEnd(12), 'posFrac'.padEnd(8), 'negFrac'.padEnd(8),
  'vstPreserved'.padEnd(14), 'vstPartial'.padEnd(11), 'vstFullNull'.padEnd(12),
  'λmax_raw'.padEnd(11), 'λmax_vst'.padEnd(11), 'drift%'.padEnd(9)
].join(' ');
console.log(header);
console.log('-'.repeat(header.length));

const rowsOut = [];
const ds15Supplementary = [];
for (const { file, assay } of DATASETS) {
  const { matrix, condCtx } = loadFixture(file, assay);
  const vst = detectVST(matrix, assay);
  const slopeFit = rerunVstSlopeFit(matrix);
  const stats = matrixStats(matrix);

  let vstMatrix = null;
  if (vst.transform === 'log') vstMatrix = applyVstLogMatrix(matrix);
  else if (vst.transform === 'anscombe') vstMatrix = applyVstAnscombeMatrix(matrix);

  const surv = vstMatrix
    ? postVstRowSurvival(matrix, vstMatrix)
    : { nR: matrix.length, rowsPreserved: matrix.length, rowsPartialNull: 0, rowsFullyNull: 0, vstNaNCells: 0, vstNaNFromNegative: 0, vstNaNFromZero: 0, vstNaNFromRawNull: 0 };

  // λ_max drift on canonical window (first 40 rows of first slice), raw vs post-VST
  const drift = canonicalLambdaDrift(matrix, condCtx, vstMatrix, 40, null);

  const slopeStr = vst.dataSlope != null ? vst.dataSlope.toFixed(2) : '—';
  const ciStr = vst.slopeCI ? `[${vst.slopeCI[0].toFixed(2)},${vst.slopeCI[1].toFixed(2)}]` : '—';
  const meanPosStr = `${slopeFit.numMeanPositive}/${slopeFit.nR}`;
  const posStr = (stats.posFrac * 100).toFixed(1) + '%';
  const negStr = (stats.negFrac * 100).toFixed(1) + '%';
  const preservedStr = vstMatrix ? `${surv.rowsPreserved}/${surv.nR}` : `${surv.rowsPreserved}/${surv.nR} (raw)`;
  const partialStr = vstMatrix ? String(surv.rowsPartialNull) : '0';
  const fullNullStr = vstMatrix ? String(surv.rowsFullyNull) : '0';
  const lamRawStr = drift.lamRaw != null ? drift.lamRaw.toExponential(2) : '—';
  const lamVstStr = drift.lamVst != null ? drift.lamVst.toExponential(2) : (vstMatrix ? (drift.nVstComplete != null ? `n=${drift.nVstComplete}` : 'N/A') : '—');
  let driftStr;
  if (drift.drift != null) driftStr = (drift.drift * 100).toFixed(1) + '%';
  else if (drift.error && drift.error.startsWith('fewer than')) driftStr = 'win<40';
  else if (drift.error) driftStr = 'err';
  else if (!vstMatrix) driftStr = '—';
  else driftStr = 'N/A';

  console.log([
    file.padEnd(44), assay.padEnd(13), vst.transform.padEnd(9), slopeStr.padEnd(8),
    ciStr.padEnd(16), meanPosStr.padEnd(12), posStr.padEnd(8), negStr.padEnd(8),
    preservedStr.padEnd(14), partialStr.padEnd(11), fullNullStr.padEnd(12),
    lamRawStr.padEnd(11), lamVstStr.padEnd(11), driftStr.padEnd(9)
  ].join(' '));

  rowsOut.push({
    file, assay, transform: vst.transform, dataSlope: vst.dataSlope, slopeCI: vst.slopeCI,
    slopeTest: vst.slopeTest, meanPosRows: slopeFit.numMeanPositive, nR: slopeFit.nR,
    posFrac: stats.posFrac, negFrac: stats.negFrac, zeroFrac: stats.nZero / (stats.n || 1),
    surv, drift, vst
  });

  if (file.startsWith('15-')) {
    const driftControl = canonicalLambdaDrift(matrix, condCtx, vstMatrix, 40, 'Control');
    ds15Supplementary.push({ file, window: 'Control rows 1–40 (S110 argmax)', drift: driftControl });
  }
}

// ── Post-table — notes on VST NaN mechanism ──
console.log('');
console.log('-'.repeat(100));
console.log('Post-VST NaN mechanism attribution (VST-log-routed fixtures only)');
console.log('-'.repeat(100));
console.log('fixture'.padEnd(44) + 'vstNaNCells'.padEnd(14) + 'fromNeg'.padEnd(10) + 'fromZero'.padEnd(10) + 'fromRawNull'.padEnd(13));
console.log('-'.repeat(100));
for (const r of rowsOut) {
  if (r.transform !== 'log') continue;
  console.log([
    r.file.padEnd(44),
    String(r.surv.vstNaNCells).padEnd(14),
    String(r.surv.vstNaNFromNegative).padEnd(10),
    String(r.surv.vstNaNFromZero).padEnd(10),
    String(r.surv.vstNaNFromRawNull).padEnd(13)
  ].join(''));
}

// ── DS15 supplementary ──
if (ds15Supplementary.length) {
  console.log('');
  console.log('-'.repeat(100));
  console.log('DS15 supplementary — λ_max drift at S110-argmax window (Control rows 1–40)');
  console.log('-'.repeat(100));
  for (const s of ds15Supplementary) {
    console.log(`${s.file}: ${s.window}`);
    const d = s.drift;
    if (d.error) {
      console.log(`  error: ${d.error}`);
    } else {
      console.log(`  slice=${d.slice}, p=${d.p}, windowN=${d.windowN}, nRawComplete=${d.nRawComplete}, nVstComplete=${d.nVstComplete}`);
      console.log(`  λ_max_raw=${d.lamRaw?.toExponential(4)}, λ_max_vst=${d.lamVst != null ? d.lamVst.toExponential(4) : 'N/A'}, drift=${d.drift != null ? (d.drift * 100).toFixed(2) + '%' : 'N/A'}`);
      if (d.note) console.log(`  note: ${d.note}`);
    }
  }
}

// ── Summary ──
console.log('');
console.log('-'.repeat(100));
console.log('Summary');
console.log('-'.repeat(100));
const nLog = rowsOut.filter(r => r.transform === 'log').length;
const nAns = rowsOut.filter(r => r.transform === 'anscombe').length;
const nRaw = rowsOut.filter(r => r.transform === 'raw').length;
console.log(`routing counts: log=${nLog}, anscombe=${nAns}, raw=${nRaw}`);

const signedLogRouted = rowsOut.filter(r => r.transform === 'log' && r.negFrac > 0.2);
console.log(`VST-log routed with ≥20% v<0 cells (signed-centered risk class): ${signedLogRouted.length}`);
for (const r of signedLogRouted) {
  console.log(`  ${r.file}: negFrac=${(r.negFrac * 100).toFixed(1)}%, post-VST rowsPreserved=${r.surv.rowsPreserved}/${r.surv.nR} (${(r.surv.rowsPreserved / r.surv.nR * 100).toFixed(1)}%)`);
}

const largeDrift = rowsOut.filter(r => r.transform === 'log' && r.drift.drift != null && Math.abs(r.drift.drift) > 0.05);
console.log(`VST-log routed with |λ_max drift| > 5% on canonical window: ${largeDrift.length}`);
for (const r of largeDrift) {
  console.log(`  ${r.file}: drift=${(r.drift.drift * 100).toFixed(1)}%, λ_max_raw=${r.drift.lamRaw?.toExponential(2)}, λ_max_vst=${r.drift.lamVst?.toExponential(2)}`);
}

console.log('');
console.log('='.repeat(100));
console.log('end of Target A report');
console.log('='.repeat(100));

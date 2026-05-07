// S109 Part 1 — direct flag attribution dump for DS21 v2 + DS22.
// Confirms Benford / Kurtosis HIGH via full engine pipeline on the real
// fixture data. Complements the diag-s109-benford.mjs + diag-s109-kurtosis-ds.mjs
// synthetic-iid runs (which show FP-rate is ≤6% at N=200×nRep=7/8 on iid N(0,1)
// but each fixture is ONE specific sample).
//
// Run: node test/diag-s109-ds-flags.mjs

import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

async function runOne(file, assay) {
  const csv = readFileSync(join('test/fixtures', file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw); raw = pp.rows;
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
  return { results, matrix };
}

for (const [file, assay] of [['21-localised-ar.csv', 'general'], ['22-covariance-block.csv', 'general']]) {
  console.log(`\n════════ ${file} (assay=${assay}) ════════`);
  const { results, matrix } = await runOne(file, assay);
  console.log(`matrix: ${matrix.length} rows × ${matrix[0]?.length} cols`);
  for (const name of ['Benford\'s Law (First Digit)', 'Excess Kurtosis']) {
    const r = results.find(x => x.name === name);
    if (!r) { console.log(`  ${name}: (not in results)`); continue; }
    console.log(`\n  ${name}`);
    console.log(`    flag=${r.flag}   primaryP=${r.primaryP}`);
    if (name.startsWith('Benford')) {
      console.log(`    MAD=${r.MAD}  pMAD=${r.pMAD}  nValues=${r.nValues}  simN=${r.simN}`);
      console.log(`    MADConformity=${r.MADConformity}`);
    } else {
      console.log(`    pooledP=${r.pooledP}  pooledKurtosis=${r.pooledKurtosis}  simKurt=${r.simKurtosis}`);
      console.log(`    kurtDeviation=${r.kurtDeviation}  pooledN=${r.pooledN}  isPromoted=${r.isPromoted}`);
      console.log(`    _kurtosisP=${r._kurtosisP}  _andersonDarlingP=${r._andersonDarlingP}`);
    }
    // per-group breakdown
    if (r.details) {
      console.log(`    details (first 5):`);
      for (const d of r.details.slice(0, 5)) {
        const snip = typeof d === 'object' ? JSON.stringify(d).slice(0, 180) : String(d);
        console.log(`      ${snip}`);
      }
    }
  }
}

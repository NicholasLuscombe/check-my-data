// Dump γ₁, γ₂ and column values for pre-skip diagnostic
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { mean } = await import('../src/stats/primitives.js');

const FIXTURES = 'test/fixtures';

function centralMoments(vals, mu) {
  let m2 = 0, m3 = 0, m4 = 0;
  for (const v of vals) {
    const d = v - mu;
    const d2 = d*d;
    m2 += d2; m3 += d2*d; m4 += d2*d2;
  }
  const N = vals.length;
  return { m2: m2/N, m3: m3/N, m4: m4/N };
}

async function dump(file, assay, label) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw); raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const nC = matrix[0]?.length || 0;
  console.log(`\n=== ${file} [${label}] nR=${matrix.length} nC=${nC} ===`);
  for (let ci = 0; ci < nC; ci++) {
    const vals = [];
    for (let ri = 0; ri < matrix.length; ri++) {
      const v = matrix[ri][ci];
      if (v != null && isFinite(v)) vals.push(v);
    }
    if (vals.length < 30) { console.log(`  col${ci+1} n=${vals.length} SKIP(n<30)`); continue; }
    const distinct = new Set(vals).size;
    const mu = mean(vals);
    const { m2, m3, m4 } = centralMoments(vals, mu);
    const g1 = m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
    const g2 = m2 > 0 ? m4 / (m2*m2) - 3 : 0;
    const status = Math.abs(g1) > 1.5 ? `SKIP(|γ₁|=${Math.abs(g1).toFixed(2)}>1.5)` :
                   g2 < -0.8 ? `SKIP(γ₂=${g2.toFixed(2)}<-0.8)` : 'OK';
    console.log(`  col${ci+1} n=${vals.length} distinct=${distinct} μ=${mu.toFixed(3)} γ₁=${g1.toFixed(3)} γ₂=${g2.toFixed(3)} ${status}`);
  }
}

// All fixtures with a focus on those hitting high-γ pre-skip or flagging
const targets = [
  ['03-qpcr-clean.csv', 'qpcr', 'all N/A — qpcr expected Normal on Ct scale'],
  ['04-qpcr-fabricated.csv', 'qpcr', '3 tested — contrast'],
  ['07-elisa-clean.csv', 'elisa', 'all N/A — elisa log-normal expected'],
  ['09-proteomics-clean.csv', 'proteomics', 'all N/A — proteomics log-normal'],
  ['10-proteomics-fabricated.csv', 'proteomics', 'col5 MOD flag — need context'],
  ['12a-uniform-mixture-clean.csv', 'general', 'all N/A — uniform expected'],
  ['12b-uniform-mixture-fabricated.csv', 'general', 'all N/A — uniform fab'],
  ['17-densitometry-carlisle-clean.csv', 'densitometry', 'mostly tested — healthy'],
  ['19-inheritance-fabricated.csv', 'general', 'col1 MOD — need to inspect'],
  ['01-densitometry-clean.csv', 'densitometry', '4 γ-skipped vs 8 tested'],
];
for (const [f, a, l] of targets) await dump(f, a, l);

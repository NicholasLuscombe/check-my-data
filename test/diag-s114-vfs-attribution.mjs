// S114 Phase 2 attribution — runs VFS per-pass on every fixture and
// reports pass-1 / pass-2 tier contributions. Used to classify Track E (c)
// as detection extension (pass 2 contributes a novel flag somewhere) vs
// zero-regression infrastructure extension (pass 2 never novel on batch).
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../src/analysis/engine.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { testValueFrequencySpike } = await import('../src/tests/valueFrequencySpike.js');
const { flagRankOf } = await import('../src/constants/thresholds.js');

const FIXTURES = 'test/fixtures';
// Mirror validate-batch's fixture list + assay.
const FIX = [
  ['01-densitometry-clean.csv', 'densitometry', 'clean'],
  ['02-densitometry-fabricated.csv', 'densitometry', 'fabricated'],
  ['03-qpcr-clean.csv', 'qpcr', 'clean'],
  ['04-qpcr-fabricated.csv', 'qpcr', 'fabricated'],
  ['05-cellcount-clean.csv', 'cell_count', 'clean'],
  ['06-cellcount-fabricated.csv', 'cell_count', 'fabricated'],
  ['07-elisa-clean.csv', 'elisa', 'clean'],
  ['08-elisa-fabricated.csv', 'elisa', 'fabricated'],
  ['09-proteomics-clean.csv', 'proteomics', 'clean'],
  ['10-proteomics-fabricated.csv', 'proteomics', 'fabricated'],
  ['11-rnaseq-multicondition.csv', 'genomics', 'fabricated'],
  ['12a-uniform-mixture-clean.csv', 'general', 'clean'],
  ['12b-uniform-mixture-fabricated.csv', 'general', 'fabricated'],
  ['13-vfstest-cellcountest.csv', 'cell_count', 'fabricated'],
  ['14-crctest-survey.csv', 'survey', 'fabricated'],
  ['15-missing-carlisle.csv', 'general', 'fabricated'],
  ['16-densitometry-carlisle-overbalanced.csv', 'densitometry', 'fabricated'],
  ['17-densitometry-carlisle-clean.csv', 'densitometry', 'clean'],
  ['19-inheritance-fabricated.csv', 'general', 'fabricated'],
  ['20-bimodal-fab.csv', 'general', 'fabricated'],
  ['21-localised-ar.csv', 'general', 'fabricated'],
  ['22-covariance-block.csv', 'general', 'fabricated'],
];

function loadFixture(file) {
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
  const { matrix, rawMatrix } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { matrix, rawMatrix };
}

function pad(s, n) { return String(s).padEnd(n); }

console.log(`Fixture                                   type         P1-tier  P1#sp P2-tier  P2raw P2#sp Driver        Attribution`);
console.log(`${'-'.repeat(130)}`);

for (const [file, assay, kind] of FIX) {
  const { matrix, rawMatrix } = loadFixture(file);
  const r = testValueFrequencySpike(matrix, rawMatrix);

  const p1BestP = r.nSpikesPass1 > 0 && r.details.find(d => d.pass === 'full')
    ? Math.min(...r.details.filter(d => d.pass === 'full').map(d => parseFloat(d.adjP)))
    : 1;
  const p1Tier = r.nSpikesPass1 > 0 ? (p1BestP < 0.001 ? 'HIGH' : p1BestP < 0.01 ? 'MOD' : 'LOW') : '—';
  const p2Tier = r.pass2SpikeCount > 0 && r.pass2MultiSpikeCleared
    ? (r.pass2TierRaw === 'HIGH' ? 'HIGH' : r.pass2TierRaw === 'MODERATE' ? 'MOD' : 'LOW')
    : (r.pass2SpikeCount === 1 ? 'LOW*' : '—');
  const p2Raw = r.pass2TierRaw === 'HIGH' ? 'HIGH' : r.pass2TierRaw === 'MODERATE' ? 'MOD' : 'LOW';
  const driver = r.drivingPass || '—';

  // Attribution classification for fabricated fixtures
  let attribution = '';
  if (kind === 'fabricated') {
    const p1Contributed = r.nSpikesPass1 > 0 && p1Tier !== '—';
    const p2Contributed = r.pass2SpikeCount > 0;
    const p2AboveLow = r.pass2MultiSpikeCleared && r.pass2TierRaw !== 'LOW';
    if (!p2Contributed) attribution = 'no pass-2';
    else if (!p1Contributed && p2AboveLow) attribution = 'NOVEL (pass-2 only, above LOW)';
    else if (p1Contributed && p2AboveLow) attribution = 'convergent (both passes ≥ MOD)';
    else if (r.pass2SpikeCount === 1) attribution = 'pass-2 single-spike (gated → LOW)';
    else attribution = 'pass-2 LOW multi-spike';
  } else {
    // Clean fixtures: any pass-2 activity is noteworthy
    const n2 = r.pass2SpikeCount || 0;
    if (r.pass2Status) attribution = 'pass-2 N/A (clean)';
    else if (n2 === 0) attribution = 'no pass-2 spikes (clean)';
    else if (n2 === 1) attribution = 'pass-2 single-spike (gated OK)';
    else attribution = `pass-2 ${n2} spikes (INVESTIGATE)`;
  }

  console.log(`${pad(file, 42)} ${pad(kind, 12)} ${pad(p1Tier, 8)} ${pad(r.nSpikesPass1 || 0, 5)} ${pad(p2Tier, 8)} ${pad(p2Raw, 5)} ${pad(r.pass2SpikeCount || 0, 5)} ${pad(driver, 13)} ${attribution}`);
}

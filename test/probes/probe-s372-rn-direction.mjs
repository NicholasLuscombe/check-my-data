/* S372 — Regional Noise headline direction. READ-ONLY over src/.
 *
 * The instrument for Fix 1. It answers two questions across all 27 fixtures:
 *
 *   Q1 (the fix's precondition) — is details[0] the window the headline names?
 *      `bestWindowRows` is the headline's row range, so a direction read off a
 *      different window would be correct about the wrong place. Measured true
 *      on all four flagged fixtures.
 *
 *   Q2 (the measurement) — how many fixtures flip? The old headline branched on
 *      `parseFloat(bestVarRatio) > 1`, and `bestVarRatio` is Math.max(a/b, b/a)
 *      in regionalNoise.js, so it is >= 1 by construction and "quieter" was
 *      unreachable outside an exact tie. Answer: 4 of 4 — every fixture where
 *      the headline renders was wrong, so the dead branch never once produced a
 *      correct reading on this corpus.
 *
 * It DERIVES both headlines from engine fields using the card's own
 * expressions; it does not render the card. Engine output does not move when
 * the card changes, so this probe reads identically before and after the fix —
 * the OLD column is the pre-fix headline and CORRECT is the post-fix one.
 *
 * It also dumps the aggregated-path shape, where the aggregator rebuilds
 * `details` as a per-group summary carrying no `direction` field. No fixture
 * reaches that branch above LOW today, which is why the card's aggregated arm
 * is a guard rather than a measured path.
 *
 * Mirrors validate-batch.mjs's load block exactly.
 *
 *   node test/probes/probe-s372-rn-direction.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const ROOT = new URL('../..', import.meta.url).pathname;
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import(join(ROOT, 'src/analysis/engine.js'));
const { detectVST } = await import(join(ROOT, 'src/stats/vst.js'));
const { inferRoles } = await import(join(ROOT, 'src/import/roles.js'));
const { ASSAY_DATATYPE_MAP } = await import(join(ROOT, 'src/constants/assays.js'));
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(join(ROOT, 'src/import/parser.js'));
const { detectLongFormat } = await import(join(ROOT, 'src/import/longFormat.js'));
const { suggestRowSemantics } = await import(join(ROOT, 'src/import/rowSemantics.js'));
const { EXPECTED } = await import(join(ROOT, 'test/batch-fixtures.mjs'));

const FIXTURES = join(ROOT, 'test/fixtures');

// The card's CURRENT headline direction expression, verbatim.
const oldDir = (bestVarRatio) => parseFloat(bestVarRatio) > 1 ? 'noisier' : 'quieter';
// The producer's signed direction, mapped to the headline's vocabulary.
const mapDir = (d) => d === 'reduced' ? 'quieter' : d === 'elevated' ? 'noisier' : 'anomalous';

const rows = [];
for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  let raw = Papa.default.parse(csv, { skipEmptyLines: true }).data;
  raw = preprocessRaw(raw).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lf = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lf }).value || 'ordered';
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);

  const r = results.find(x => x.name === 'Regional Noise Homogeneity');
  if (!r) { rows.push({ file, flag: 'MISSING' }); continue; }

  const isAgg = r.groupsAssessed !== undefined;
  const details = r.details || [];
  const sub = r.subDetails || [];
  const d0 = details[0];
  // On the aggregated path the correct source is the first subDetails entry
  // belonging to the worst group (whose fields the top-level spread carries).
  const worstEntry = isAgg ? sub.find(s => s.group === r.worstGroup) : null;

  rows.push({
    file,
    flag: r.flag,
    isAgg,
    worstGroup: r.worstGroup ?? null,
    bestWindowRows: r.bestWindowRows ?? null,
    bestVarRatio: r.bestVarRatio ?? null,
    d0rows: d0?.rows ?? null,
    d0dir: d0?.direction ?? null,
    d0HasDirection: d0 ? ('direction' in d0) : false,
    d0MatchesHeadline: d0 ? (String(d0.rows) === String(r.bestWindowRows)) : null,
    sub0group: sub[0]?.group ?? null,
    subWorstRows: worstEntry?.rows ?? null,
    subWorstDir: worstEntry?.direction ?? null,
    subWorstMatches: worstEntry ? (String(worstEntry.rows) === String(r.bestWindowRows)) : null,
    nDetails: details.length,
    nSub: sub.length,
  });
}

console.log('=== ALL 27 FIXTURES: Regional Noise ===');
for (const x of rows) {
  console.log(
    `${x.file.padEnd(34)} flag=${String(x.flag).padEnd(9)} agg=${String(x.isAgg).padEnd(5)} ` +
    `nDet=${String(x.nDetails).padEnd(3)} d0.direction=${String(x.d0dir).padEnd(10)} ` +
    `hasDir=${String(x.d0HasDirection).padEnd(5)} d0==headline=${String(x.d0MatchesHeadline)}`
  );
}

const flagged = rows.filter(x => x.flag !== 'LOW' && x.flag !== 'N/A' && x.flag !== 'MISSING');
console.log('\n=== HEADLINE-RENDERING FIXTURES (flag not LOW/N-A) ===');
if (!flagged.length) console.log('(none)');
for (const x of flagged) {
  const correct = x.isAgg ? mapDir(x.subWorstDir) : mapDir(x.d0dir);
  const old = oldDir(x.bestVarRatio);
  console.log(
    `${x.file.padEnd(34)} flag=${x.flag} agg=${x.isAgg} worstGroup=${x.worstGroup}\n` +
    `    bestWindowRows=${x.bestWindowRows}  bestVarRatio=${x.bestVarRatio}\n` +
    `    details[0].rows=${x.d0rows} dir=${x.d0dir} matches=${x.d0MatchesHeadline}\n` +
    `    subDetails[0].group=${x.sub0group} worstEntry.rows=${x.subWorstRows} dir=${x.subWorstDir} matches=${x.subWorstMatches}\n` +
    `    OLD="${old}"  CORRECT="${correct}"  FLIP=${old !== correct}`
  );
}

console.log('\n=== PRECONDITION 1: details[0].rows === bestWindowRows, on non-aggregated flagged ===');
const nonAggFlagged = flagged.filter(x => !x.isAgg);
console.log(`non-aggregated flagged fixtures: ${nonAggFlagged.length}`);
console.log(`  all match: ${nonAggFlagged.every(x => x.d0MatchesHeadline)}`);
const aggFlagged = flagged.filter(x => x.isAgg);
console.log(`aggregated flagged fixtures: ${aggFlagged.length}`);
console.log(`  details[0] carries a direction field: ${aggFlagged.map(x => x.d0HasDirection).join(', ') || '(n/a)'}`);

console.log('\n=== AGGREGATED PATH SHAPE (all fixtures where Regional Noise aggregated) ===');
for (const x of rows.filter(x => x.isAgg)) {
  console.log(`${x.file.padEnd(34)} flag=${x.flag} worstGroup=${x.worstGroup} sub[0].group=${x.sub0group} ` +
    `sameGroup=${x.worstGroup === x.sub0group} d0HasDirection=${x.d0HasDirection}`);
}

const flips = flagged.filter(x => {
  const correct = x.isAgg ? mapDir(x.subWorstDir) : mapDir(x.d0dir);
  return oldDir(x.bestVarRatio) !== correct;
});
console.log(`\n=== FLIP COUNT: ${flips.length} of ${flagged.length} headline-rendering fixtures ===`);
for (const x of flips) console.log(`  ${x.file}`);

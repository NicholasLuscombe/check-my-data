/* S385 — VFS card-boundary read.
 *
 * Check B of the S385 read: is the S288 `allTested` BH family on the object
 * `MiniCard_ValueFrequency.jsx` RECEIVES, or merely computed inside
 * `valueFrequencySpike.js` and dropped between the two?
 *
 * The distinction is the whole point. A field computed at the test's return
 * site and lost at any layer above it reads identically from inside the
 * module and is unusable from the card. So this probe reads the result object
 * at the card's boundary — the element of `runFullAnalysis`'s output that
 * `MiniPlot` looks up by `result.name` and hands to the card as its `result`
 * prop — never `testValueFrequencySpike` directly.
 *
 * It also reports, on that same object:
 *   - the spike set's reachability (`details`, `nSpikes`, `_spikeCells`)
 *   - `droveVerdict` coverage — the field the verdict promotes on, which the
 *     forest's `flagged` mark must gate on rather than on a threshold
 *     comparison re-derived at display time
 *   - `groupsAssessed` — the `isAgg` marker every card uses to detect the
 *     aggregated path (Check C: VFS is dispatched on the single matrix and
 *     never routes `aggregatePerGroup`, so this is expected absent everywhere,
 *     including on the multi-condition fixture)
 *
 *   node test/probes/probe-s385-vfs-card-boundary.mjs
 */
import { readFileSync } from 'fs';
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
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

// One fixture per VFS state that matters: a pass-1 full-value HIGH, the two
// pass-2 near-dup HIGHs (concentration and depth keep-paths — the deep one
// carries the separate S312 BH subfamily), a multi-condition file (the isAgg
// probe), and a clean file (cleared-only background).
const TARGETS = [
  '13-vfstest-cellcountest.csv',
  'vfs-b-recurrence-high.csv',
  'vfs-c-deeptail-high.csv',
  '11-rnaseq-multicondition.csv',
  '03-qpcr-clean.csv',
];

for (const file of TARGETS) {
  const expected = EXPECTED[file];
  if (!expected) { console.log(`SKIP ${file} — not in EXPECTED`); continue; }
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

  // The card's boundary: MiniPlot resolves the renderer by `result.name` and
  // passes this exact object through as the `result` prop.
  const r = results.find(x => x.name === 'Value-Frequency Spike');
  if (!r) { console.log(`${file} :: no Value-Frequency Spike result`); continue; }

  const at = r.allTested;
  const hasAll = Array.isArray(at);
  const drove = hasAll ? at.filter(t => t.droveVerdict === true) : [];
  const droveFalse = hasAll ? at.filter(t => t.droveVerdict === false) : [];
  const cleared = hasAll ? at.filter(t => t.droveVerdict === undefined) : [];
  const shapeOK = hasAll && at.every(t =>
    Number.isFinite(t.obs) && Number.isFinite(t.smoothed)
    && Number.isFinite(t.ratio) && Number.isFinite(t.adjP));

  console.log(`######## ${file}`);
  console.log(`  flag=${r.flag}  drivingPass=${r.drivingPass}  nSpikes=${r.nSpikes}  nTested=${r.nTested}`);
  console.log(`  allTested present=${hasAll}  length=${hasAll ? at.length : '-'}  everyEntryHasObs/smoothed/ratio/adjP=${shapeOK}`);
  console.log(`  droveVerdict true=${drove.length}  false=${droveFalse.length}  absent(cleared)=${cleared.length}`);
  console.log(`  spike set reachable: details=${(r.details || []).length}  _spikeCells=${(r._spikeCells || []).length}  _spikeValues=${(r._spikeValues || []).length}`);
  console.log(`  groupsAssessed=${r.groupsAssessed === undefined ? 'undefined (isAgg false)' : r.groupsAssessed}`);
  const passes = hasAll ? [...new Set(at.map(t => t.pass))].sort() : [];
  console.log(`  passes in family=${JSON.stringify(passes)}`);
  // The forest plots `allTested`; the note may only name the BH family size if
  // the plotted set IS that family. Report both so the caller can see whether
  // a subset is being taken.
  console.log(`  nTested(result) === allTested.length : ${hasAll && r.nTested === at.length}`);
}

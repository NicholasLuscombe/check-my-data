/* S341 — adjudicate the DS08 and DS12b undeclared firings.

   Two questions per firing:
     (1) where does the test say it fired (bestWindowRows / changepointRow /
         bestAnomCol), against the planted region read from
         generate-test-datasets.py;
     (2) does the signal survive when the fixture is sliced so the planted
         region is isolated — the DS10 per-slice method already used for
         Regional Noise in batch-fixtures.mjs:88.

   Whole-fixture numbers come from runFullAnalysis so they are the engine's own
   values. Slice numbers call the test directly on a row subset with a fresh
   per-test PRNG, which is what the engine does anyway (rngFor(testName)).

     SEEDS=8 S341_ARM=shipped node --import ./test/probes/s341-count-hook.mjs \
       --import ./test/probes/s341-seed-hook.mjs test/probes/probe-s341-adjudicate.mjs
*/
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const ARM = process.env.S341_ARM || 'shipped';
const N_SEEDS = Math.max(1, Number(process.env.SEEDS) || 8);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { testRegionalNoise } = await import('../../src/tests/regionalNoise.js');
const { testLoessResidual } = await import('../../src/tests/loessResidual.js');
const { testAutocorrelation } = await import('../../src/tests/autocorrelation.js');

const FIXTURES = 'test/fixtures';
const OUT = 'test/probes/out-s341-adjudicate';

/* Planted regions, read from generate-test-datasets.py. 1-indexed DATA rows
   (generator rows[] is header-at-0, so rows[i] is data row i). */
const PLANT = {
  '08-elisa-fabricated.csv': {
    assay: 'elisa',
    components: [
      { name: 'AR(1) residuals phi=0.55 sigma=0.09', rows: [1, 65], cols: 'all 3 plates', src: 'gen:262-264' },
      { name: 'Benford push (leading<=3 x U(2,3))',   rows: [1, 24], cols: 'all 3 plates', src: 'gen:275-285' },
      { name: 'Constant offset P2 = P1 x 1.047',      rows: [35, 48], cols: 'Plate2',      src: 'gen:288-294' },
      { name: 'Selective noise P3 = mean(P1,P2)x(1+0.01N)', rows: [50, 64], cols: 'Plate3', src: 'gen:296-301' },
    ],
    /* the component Regional Noise would plausibly detect */
    focus: { name: 'selective noise', rows: [50, 64] },
    slices: { inside: [50, 64], outside: [1, 49] },
  },
  '12b-uniform-mixture-fabricated.csv': {
    assay: 'general',
    components: [
      { name: 'Genuine: log-normal noise CV~18%', rows: [1, 200],   cols: 'rep1-6', src: 'gen:578-583' },
      { name: 'Fabricated: uniform +/-40% of base', rows: [201, 400], cols: 'rep1-6', src: 'gen:587-594' },
    ],
    focus: { name: 'uniform-noise condition', rows: [201, 400] },
    slices: { inside: [201, 400], outside: [1, 200] },
  },
};

function prepare(file, assay) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  const raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, assay, vst, dataType, rowSemantics };
}

const pick = (r) => r ? ({
  flag: r.flag, primaryP: r.primaryP, scanP: r.scanP, cusumP: r.cusumP,
  nPerm: r.nPerm, nRows: r.nRows, nWindows: r.nWindows,
  bestWindowRows: r.bestWindowRows, bestVarRatio: r.bestVarRatio,
  bestAnomCol: r.bestAnomCol, bestDirection: r.bestDirection,
  changepointRow: r.changepointRow, changepointDirection: r.changepointDirection,
}) : null;

const out = { arm: ARM, seeds: N_SEEDS, plant: PLANT, whole: {}, slice: {} };

for (const [file, spec] of Object.entries(PLANT)) {
  const p = prepare(file, spec.assay);
  out.whole[file] = { nRows: p.matrix.length, nCols: p.matrix[0]?.length || 0, bySeed: [] };
  out.slice[file] = { inside: [], outside: [] };

  for (let s = 0; s < N_SEEDS; s++) {
    globalThis.__S341_SEED = s;

    /* whole fixture, through the engine */
    const results = await runFullAnalysis(
      p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics
    );
    const byName = Object.fromEntries(results.map((r) => [r.name, r]));
    out.whole[file].bySeed.push({
      seed: s,
      'Regional Noise Homogeneity': pick(byName['Regional Noise Homogeneity']),
      'LOESS Residual Analysis':    pick(byName['LOESS Residual Analysis']),
      'Autocorrelation':            pick(byName['Autocorrelation']),
      'Selective Noise Partitioning': byName['Selective Noise Partitioning']
        ? { flag: byName['Selective Noise Partitioning'].flag, primaryP: byName['Selective Noise Partitioning'].primaryP } : null,
    });

    /* slices — direct test calls on a row subset, fresh per-test PRNG */
    for (const key of ['inside', 'outside']) {
      const [a, b] = spec.slices[key];
      const sub = p.matrix.slice(a - 1, b);
      const rngFor = createPRNGFactory(sub);
      let rn = null, lo = null;
      try { rn = pick(testRegionalNoise(sub, rngFor('Regional Noise Homogeneity'))); } catch (e) { rn = { error: String(e.message) }; }
      try { lo = pick(testLoessResidual(sub, rngFor('LOESS Residual Analysis'))); } catch (e) { lo = { error: String(e.message) }; }
      out.slice[file][key].push({ seed: s, rows: [a, b], n: sub.length,
        'Regional Noise Homogeneity': rn, 'LOESS Residual Analysis': lo });
    }
  }
  console.log(`[${ARM}] ${file} done (${N_SEEDS} seeds)`);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `${ARM}.json`), JSON.stringify(out, null, 1));
console.log(`-> ${join(OUT, ARM + '.json')}`);

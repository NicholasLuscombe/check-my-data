// S364 — P120, the promotion gap. Read-only over `src/`.
//
// S363 measured two numbers about Excess Kurtosis's per-condition arm on honest
// data (`docs/shared/S363-KURTOSIS-DOSE-RESPONSE.md`, "Found in passing"):
//
//   - `rawP` below 0.001 on 30 of 478 honest condition-units
//   - the promotion arm fired once in 240 draws
//
// Thirty floored units across 240 draws should put a floored unit in roughly
// thirty draws. One promoted. This probe reads what stops the other twenty-nine,
// names each stop by file and line, and derives the nominal rate the 6.3% should
// be compared against instead of assuming it.
//
// Three modes, all read-only. Nothing is written to test/fixtures and nothing
// enters the batch. Output lands in test/probes/out-s364/ (gitignored).
//
//   --census   Steps 1 and 2. The same 240-draw grid as
//              probe-s363-kurtosis-dose.mjs --strat, with every field of every
//              condition-unit that bears on promotion. Classifies each floored
//              unit by its stopping site; derives the p-value expression's
//              nominal; renders the full rawP distribution.
//
//   --derive   Step 2.4 and step 3, on single draws — no grid.
//              (a) Re-derives the per-condition kurtosis from the transformed
//                  matrix AND from the raw matrix, and reports which one the
//                  shipped figure matches. That answers "does the transform
//                  reach this arm" numerically rather than by routing alone.
//              (b) Re-derives kurtosis.js:441-449's family selector on the draw
//                  that returned no condition table, showing the spread
//                  arithmetic that drops it.
//
//   --replay   Re-renders --census from a saved out-s364/units.json without
//              re-running the grid.
//
//   node test/probes/probe-s364-promotion-gap.mjs --census
//   node test/probes/probe-s364-promotion-gap.mjs --derive
//   DRAWS=2 node test/probes/probe-s364-promotion-gap.mjs --census

import { writeFileSync, mkdirSync, readFileSync } from 'fs';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { fitPredictedSigma, kurtosis, trimmedKurtosis } = await import('../../src/stats/primitives.js');
const { ALPHA, EFFECT_SIZE } = await import('../../src/constants/thresholds.js');
const { generate } = await import('../gen-copy-fidelity.mjs');

// Identical to probe-s363-kurtosis-dose.mjs so the counts are the same counts.
const DRAWS = Number(process.env.DRAWS) || 20;
const REPS = process.env.REPS ? [Number(process.env.REPS)] : [4, 6];
const SUBJECTS = 120;
const SEED_BASE = 6100;
const ASSAYS = (process.env.ASSAYS || 'general,plate_reader').split(',');
const RUNGS = (process.env.RUNGS || '1,1.5,2.5').split(',').map(Number);

const gen = (opts) => generate({ k: 1, sigmaS: 0, nSubjects: SUBJECTS, ...opts });

async function battery(csv, assay) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, null);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol: null, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, 'ordered');
  return { results, vst, condCtx, matrix };
}

// engine.js:295-298, one line each. The matrix Excess Kurtosis is handed.
function vstMatrixOf(matrix, vstType) {
  if (vstType === 'log') return matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  if (vstType === 'anscombe') return matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  return matrix;
}

const num = (x) => (x == null ? NaN : typeof x === 'string' ? parseFloat(x) : x);
const f = (x, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : '—');
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '—');

// ── Capture one draw's Excess Kurtosis result, promotion fields intact ──
//
// The pooled gate is re-derived here rather than read off `esGateMode`, which
// names only the first true OR arm (P62), and `flag` on the returned object is
// already `finalFlag` (`:508`) — post-promotion. `:484` gates on the PRE-
// promotion `flag` (`:383`), so that is what has to be reconstructed.
function readDraw(res) {
  const pooledKurtosis = res.pooledKurtosis;
  const simKurt = res.simKurtosis;
  const kurtDeviation = (pooledKurtosis != null && simKurt != null) ? pooledKurtosis - simKurt : 0;
  const adaptiveThreshold = num(res.adaptiveThreshold);
  const pooledP = num(res.pooledP);
  const directional = kurtDeviation >= 0;                          // :380
  const effectSize = Math.abs(kurtDeviation) < adaptiveThreshold;  // :381
  const esGate = directional || effectSize;                        // :382
  const preFlag = !Number.isFinite(pooledP) ? 'N/A'                // :383
    : (esGate ? 'LOW' : (pooledP < ALPHA.FLAG ? 'HIGH' : pooledP < ALPHA.NOTE ? 'MODERATE' : 'LOW'));
  return {
    pooledKurtosis, simKurt, kurtDeviation, adaptiveThreshold,
    directional, effectSize, esGate, preFlag,
    pooledP, primaryP: res.primaryP,
    finalFlag: res.flag, isPromoted: !!res.isPromoted,
    nSimulations: res.nSimulations, pooledN: res.pooledN, nPairs: res.nPairs,
    conds: (res.condKurtosis || []).map(c => ({
      name: c.condition, n: c.n, nDiffs: c.nDiffs,
      kurtosis: c.kurtosis,            // the 4-dp STRING, as shipped
      kurtDeviation: c.kurtDeviation,  // the 4-dp STRING — what :477 parses
      rawP: c.rawP,
      flag: c.flag,                    // flagFromP(rawP) at :426 — the condition card's tier
      p: c.p,                          // overwritten with pAdjFull at :501
      pAdjFull: c.pAdjFull == null ? null : c.pAdjFull,
      condAdjP: c.condAdjP === undefined ? undefined : c.condAdjP,
      condPromoted: c.condPromoted === undefined ? undefined : c.condPromoted,
      platykurtic: c.platykurtic, isLeptokurtic: c.isLeptokurtic,
    })),
  };
}

// The platykurtic family exactly as :476-477 builds it. `kurtDeviation` is a
// toFixed(4) string, so this is a comparison on the ROUNDED value; "-0.0000"
// parses to -0 and `-0 < 0` is false.
const inPlatyFamily = (c) =>
  parseFloat(c.kurtDeviation) < 0 && c.rawP != null && isFinite(c.rawP) && c.rawP > 0;

// ── --census ────────────────────────────────────────────────────────────
async function grid() {
  const recs = [];
  const total = REPS.length * RUNGS.length * DRAWS * ASSAYS.length;
  const t0 = Date.now();
  let done = 0;
  for (const nReps of REPS) {
    for (const r of RUNGS) {
      for (let i = 0; i < DRAWS; i++) {
        const d = gen({ seed: SEED_BASE + i, nReps, condNoiseRatio: r });
        for (const assay of ASSAYS) {
          const { results, vst, matrix, condCtx } = await battery(d.rowGroupedCsv, assay);
          const res = results.find(x => x.name === 'Excess Kurtosis');
          recs.push({
            assay, nReps, ratio: r, seed: SEED_BASE + i,
            transform: vst.transform,
            nRows: matrix.length, nCols: matrix[0].length,
            condType: condCtx?.type, condCount: condCtx?.count,
            nCondCols: condCtx?.rowConditionsCols ? condCtx.rowConditionsCols.length : 0,
            kurt: readDraw(res),
          });
          done++;
          if (done % 10 === 0) {
            const rate = (Date.now() - t0) / done;
            process.stderr.write(`  ${done}/${total}  eta ${((total - done) * rate / 60000).toFixed(1)} min\n`);
          }
        }
      }
    }
  }
  return recs;
}

// Where a floored condition-unit stops, in the order the code applies the tests.
// `rec` is the grid record; the pooled fields live on rec.kurt.
function stopSite(c, rec) {
  if (!inPlatyFamily(c)) return 'A';                     // :476-477
  if (!(c.condAdjP < ALPHA.FLAG)) return 'B';            // :482 / :484, strict <
  if (rec.kurt.preFlag !== 'LOW') return 'C';            // :484
  return 'D';                                            // promoted — ceiling at :485/:508
}

function render(recs) {
  const out = [];
  const draws = recs.filter(x => x.kurt);
  const units = draws.flatMap(x => x.kurt.conds.map(c => ({ ...c, draw: x })));
  const floored = units.filter(c => c.rawP != null && c.rawP < ALPHA.FLAG);
  const noTable = draws.filter(x => x.kurt.conds.length !== 2);

  out.push('# S364 — P120, the promotion gap');
  out.push('');
  out.push(`Grid: ${ASSAYS.join('/')} x ${REPS.join('/')} reps x r = ${RUNGS.join('/')} x ${DRAWS} draws ` +
    `= ${draws.length} draws, seeds ${SEED_BASE}..${SEED_BASE + DRAWS - 1}. Same parameters as ` +
    'probe-s363-kurtosis-dose.mjs --strat.');
  out.push('');

  // ── Step 1 ────────────────────────────────────────────────────────────
  out.push('## Step 1 — what happens to the other twenty-nine');
  out.push('');
  out.push('Every gate a floored per-condition unit must clear to lift the test flag, in source order:');
  out.push('');
  out.push('| site | file:line | test | what it does to a floored unit |');
  out.push('|---|---|---|---|');
  out.push('| A | `kurtosis.js:476-477` | `parseFloat(c.kurtDeviation) < 0` | only PLATYKURTIC conditions join the promotion family; `rawP` at `:423-425` is two-sided, so a leptokurtic condition can floor and never enter |');
  out.push('| B | `kurtosis.js:479-482` | `bhFDR(platyFamily.map(rawP))[i] < ALPHA.FLAG` | BH across the platykurtic family, `m = platyFamily.length`, strict `<` against 0.001 |');
  out.push('| C | `kurtosis.js:484` | `flag === "LOW"` | the aggregate promotion also requires the POOLED arm to have produced no flag |');
  out.push('| D | `kurtosis.js:485`, `:508` | `promotedFlag: "MODERATE"` | the ceiling: a promotion can only ever produce MODERATE, never HIGH |');
  out.push('');
  const sites = { A: [], B: [], C: [], D: [] };
  for (const c of floored) sites[stopSite(c, c.draw)].push(c);
  out.push(`**${floored.length} floored condition-units** (rawP < ${ALPHA.FLAG}) over ${draws.length} draws, ` +
    `on ${new Set(floored.map(c => `${c.draw.assay}|${c.draw.nReps}|${c.draw.ratio}|${c.draw.seed}`)).size} distinct draws.`);
  out.push('');
  const SITE_NAME = {
    A: 'not platykurtic — never joins the family (`:476-477`)',
    B: 'in the family, BH lifts condAdjP to ≥ 0.001 (`:479-482`)',
    C: 'family cleared, but the pooled arm had already flagged (`:484`)',
    D: 'promoted — and capped at MODERATE (`:485`, `:508`)',
  };
  out.push('| stopping site | units | share |');
  out.push('|---|---:|---:|');
  for (const k of ['A', 'B', 'C', 'D']) {
    out.push(`| **${k}** — ${SITE_NAME[k]} | ${sites[k].length} | ${pct(sites[k].length, floored.length)} |`);
  }
  out.push('');
  const aPos = sites.A.filter(c => parseFloat(c.kurtDeviation) > 0).length;
  const aZero = sites.A.filter(c => parseFloat(c.kurtDeviation) === 0 || Object.is(parseFloat(c.kurtDeviation), -0)).length;
  out.push(`Site A breakdown by sign of the 4-dp κDev: **${aPos} strictly positive** (leptokurtic), ` +
    `${aZero} at zero. Range of κDev among site-A units: ` +
    `${f(Math.min(...sites.A.map(c => parseFloat(c.kurtDeviation))))} to ` +
    `${f(Math.max(...sites.A.map(c => parseFloat(c.kurtDeviation))))}.`);
  out.push('');
  out.push('**The per-condition `rawP` is two-sided** — `obsDev = |condK − simMedian|` at `:423` and ' +
    '`|sk − simMedian| >= obsDev` at `:424` — so a condition that is too PEAKED floors its p exactly ' +
    'as readily as one that is too FLAT. The promotion family at `:476-477` then admits only the flat ' +
    'ones. **A two-sided p feeding a one-sided family is the whole gap.**');
  out.push('');
  out.push('### every floored unit, one row each');
  out.push('');
  out.push('| assay | reps | r | seed | cond | κDev (4dp, as `:477` parses) | rawP | B | m | condAdjP | condPromoted | pooled preFlag | finalFlag | site |');
  out.push('|---|---:|---:|---:|---|---:|---:|---:|---:|---:|:--|:--|:--|:--|');
  for (const c of floored.sort((a, b) =>
    a.draw.assay.localeCompare(b.draw.assay) || a.draw.nReps - b.draw.nReps ||
    a.draw.ratio - b.draw.ratio || a.draw.seed - b.draw.seed)) {
    const m = c.draw.kurt.conds.filter(inPlatyFamily).length;
    out.push(`| ${c.draw.assay} | ${c.draw.nReps} | ${c.draw.ratio} | ${c.draw.seed} | ${c.name} | ` +
      `${c.kurtDeviation} | ${c.rawP} | ${c.draw.kurt.nSimulations} | ${m} | ` +
      `${c.condAdjP === undefined ? '— (not in family)' : c.condAdjP} | ` +
      `${c.condPromoted === undefined ? '—' : c.condPromoted} | ${c.draw.kurt.preFlag} | ` +
      `${c.draw.kurt.finalFlag} | ${stopSite(c, c.draw)} |`);
  }
  out.push('');

  // Site B needs its arithmetic shown: what does BH do at each family size?
  out.push('### family size at each floored unit, and what BH does with it');
  out.push('');
  const byM = {};
  for (const c of floored) {
    const m = c.draw.kurt.conds.filter(inPlatyFamily).length;
    (byM[m] ||= []).push(c);
  }
  out.push('| m = platyFamily.length | floored units | condAdjP values seen | any < 0.001 |');
  out.push('|---:|---:|---|:--|');
  for (const m of Object.keys(byM).sort()) {
    const vals = [...new Set(byM[m].map(c => c.condAdjP === undefined ? 'n/a' : String(c.condAdjP)))];
    out.push(`| ${m} | ${byM[m].length} | ${vals.join(', ')} | ${byM[m].some(c => c.condAdjP < ALPHA.FLAG)} |`);
  }
  out.push('');
  out.push('Note the arithmetic at `m = 2`: BH gives the smaller of two p-values ' +
    '`min(p₍₂₎·2/2, p₍₁₎·2/1)`. With `p₍₁₎ = 1/2000` that is `0.001` exactly, and `:482` tests ' +
    '`< ALPHA.FLAG` with `ALPHA.FLAG = 0.001` — strictly less. **A floored unit in a two-member ' +
    'platykurtic family lands exactly on the threshold and fails it.**');
  out.push('');

  // The promotions themselves.
  const promotedDraws = draws.filter(x => x.kurt.isPromoted);
  out.push(`### promotions on the grid: ${promotedDraws.length}`);
  out.push('');
  if (promotedDraws.length) {
    out.push('| assay | reps | r | seed | promoting cond | κDev | rawP | m | condAdjP | pooled preFlag | finalFlag | primaryP |');
    out.push('|---|---:|---:|---:|---|---:|---:|---:|---:|:--|:--|---:|');
    for (const x of promotedDraws) {
      const p = x.kurt.conds.find(c => c.condPromoted);
      out.push(`| ${x.assay} | ${x.nReps} | ${x.ratio} | ${x.seed} | ${p?.name} | ${p?.kurtDeviation} | ` +
        `${p?.rawP} | ${x.kurt.conds.filter(inPlatyFamily).length} | ${p?.condAdjP} | ${x.kurt.preFlag} | ` +
        `${x.kurt.finalFlag} | ${x.kurt.primaryP} |`);
    }
    out.push('');
  }

  // The tier the condition CARD shows, independent of promotion — P52's surface.
  out.push('### what the condition card shows for these units, promotion aside');
  out.push('');
  const cardFlags = {};
  for (const c of floored) cardFlags[c.flag] = (cardFlags[c.flag] || 0) + 1;
  out.push('`c.flag` is `flagFromP(rawP)` at `:426` and is never touched by the promotion arm. ' +
    'Over the floored units: ' + Object.entries(cardFlags).map(([k, v]) => `${k} ${v}`).join(', ') + '.');
  out.push('');
  const mismatched = floored.filter(c => c.pAdjFull != null && c.pAdjFull >= ALPHA.FLAG);
  out.push(`The displayed \`p\` is overwritten with \`pAdjFull\` at \`:499-502\` while \`flag\` still comes ` +
    `from \`rawP\`. Floored units whose displayed p is ≥ 0.001 while the tier still reads from the ` +
    `raw p: **${mismatched.length} of ${floored.length}**.`);
  out.push('');

  // ── Step 2 ────────────────────────────────────────────────────────────
  out.push('## Step 2 — what the 6.3% should be compared against');
  out.push('');
  out.push('### 2.1 the denominator');
  out.push('');
  out.push(`- draws on the grid: **${draws.length}**`);
  out.push(`- conditions per draw when a table is returned: ${[...new Set(draws.map(x => x.kurt.conds.length))].sort().join(', ')}`);
  out.push(`- condition-units returned: **${units.length}**`);
  out.push(`- draws returning no condition table at all: **${noTable.length}**` +
    (noTable.length ? ` — ${noTable.map(x => `${x.assay} ${x.nReps}rep r=${x.ratio} seed ${x.seed} (conds=${x.kurt.conds.length}, B=${x.kurt.nSimulations})`).join('; ')}` : ''));
  out.push(`- arithmetic: ${draws.length} × 2 = ${draws.length * 2}; ${draws.length * 2} − ${draws.length * 2 - units.length} = ${units.length}`);
  out.push('');
  out.push('The unit is a (draw × condition) pair — one row of `condKurtosis`, one row of the ' +
    'condition table on the card.');
  out.push('');

  out.push('### 2.2 the nominal, derived');
  out.push('');
  out.push('The per-condition p at `kurtosis.js:423-425`:');
  out.push('');
  out.push('```js');
  out.push('const obsDev  = Math.abs(condK - simMedian);');
  out.push('const nExceed = simKurts.filter(sk => Math.abs(sk - simMedian) >= obsDev).length;');
  out.push('const condP   = (nExceed + 1) / (simKurts.length + 1);');
  out.push('```');
  out.push('');
  const Bs = [...new Set(draws.map(x => x.kurt.nSimulations))].sort((a, b) => a - b);
  const BsFloored = [...new Set(floored.map(c => c.draw.kurt.nSimulations))].sort((a, b) => a - b);
  const distinctFlooredP = [...new Set(floored.map(c => c.rawP))].sort((a, b) => a - b);
  out.push(`- \`B\` = \`simKurts.length\`, capped by \`N_SIM = 1999\` at \`:167\`. Values on this grid: ${Bs.join(', ')}. On the floored units: ${BsFloored.join(', ')}.`);
  out.push(`- the p is \`(1 + #{sim ≥ obs}) / (B + 1)\`, so with \`B = 1999\` it takes values \`k/2000\`, k = 1..2000, and its floor is \`1/2000 = 0.0005\`.`);
  out.push(`- the comparison is **strict**: \`rawP < 0.001\` (\`flagFromP\` at \`thresholds.js:40\`, \`ALPHA.FLAG = 0.001\` at \`:23\`). \`2/2000 = 0.001\` is **not** \`< 0.001\`.`);
  out.push(`- therefore \`rawP < 0.001\` is satisfiable **only at \`1/2000\`**. Distinct rawP values among the floored units, measured: ${distinctFlooredP.join(', ')}.`);
  out.push(`- that event's null probability is \`1/2000\` = **0.05%**, not 0.1%.`);
  out.push('');
  out.push(`**Observed ${floored.length}/${units.length} = ${(100 * floored.length / units.length).toFixed(2)}%.** ` +
    `Against 0.05% that is **${(floored.length / units.length / 0.0005).toFixed(0)}-fold**; ` +
    `against the 0.1% S363 assumed it is ${(floored.length / units.length / 0.001).toFixed(0)}-fold. ` +
    `The multiplier moves by two; the rate does not dissolve.`);
  out.push('');
  const modBand = units.filter(c => c.rawP >= ALPHA.FLAG && c.rawP < ALPHA.NOTE);
  out.push(`For the MODERATE band the same correction applies in the other direction: \`0.001 <= rawP < 0.01\` ` +
    `covers \`k/2000\` for k = 2..19, which is **18/2000 = 0.9%** — the nominal S363 used, and it is right. ` +
    `Observed **${modBand.length}/${units.length} = ${(100 * modBand.length / units.length).toFixed(2)}%**, ` +
    `${(modBand.length / units.length / 0.009).toFixed(1)}-fold.`);
  out.push('');

  out.push('### 2.3 the distribution of `rawP` across all condition-units');
  out.push('');
  const edges = [0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0001];
  out.push('| rawP band | count | share | uniform expectation |');
  out.push('|---|---:|---:|---:|');
  out.push(`| exactly 1/2000 = 0.0005 (the floor) | ${units.filter(c => c.rawP === 0.0005).length} | ${pct(units.filter(c => c.rawP === 0.0005).length, units.length)} | 0.05% |`);
  let lo = 0.0005;
  for (const hi of edges.slice(1)) {
    const n = units.filter(c => c.rawP > lo && c.rawP <= hi).length;
    out.push(`| (${lo}, ${hi > 1 ? '1' : hi}] | ${n} | ${pct(n, units.length)} | ${((Math.min(hi, 1) - lo) * 100).toFixed(2)}% |`);
    lo = hi;
  }
  out.push('');
  const sortedP = units.map(c => c.rawP).filter(Number.isFinite).sort((a, b) => a - b);
  const q = (fr) => sortedP[Math.min(sortedP.length - 1, Math.floor(fr * (sortedP.length - 1)))];
  out.push(`Deciles of \`rawP\`: ${[0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1].map(x => f(q(x), 4)).join(' · ')}`);
  out.push(`Smallest twenty: ${sortedP.slice(0, 20).map(x => f(x, 4)).join(' ')}`);
  out.push('');
  const nBelowMedianHalf = units.filter(c => c.rawP < 0.5).length;
  out.push(`Mass below 0.5: ${nBelowMedianHalf}/${units.length} = ${pct(nBelowMedianHalf, units.length)} (uniform: 50%).`);
  out.push('');

  out.push('### 2.4 does the transform reach this arm');
  out.push('');
  out.push('Routing, by file and line: `engine.js:581` registers Excess Kurtosis through `runPairVST`; ' +
    '`runPairVST` calls `testFn(vstMatrix, vstCtx)` at `engine.js:310` when a transform is active; ' +
    '`testKurtosis` reads `matrix[r][c1]` for the per-condition differences at `kurtosis.js:411-418` — ' +
    'the same `matrix` argument the pooled arm uses at `:109-122`. **The per-condition arm is on the ' +
    'transformed path, and it reads whatever the pooled arm reads.** `--derive` confirms it ' +
    'numerically: on the assay where a transform is active, the shipped per-condition κ matches the ' +
    're-derivation on the TRANSFORMED matrix and not on the raw one.');
  out.push('');
  out.push('But which transform `detectVST` actually returns is a separate question from the routing, ' +
    'and it splits this grid:');
  out.push('');
  out.push('| assay | `detectVST` transform | draws | units | floored | rate | vs nominal 0.05% | median pooled κDev |');
  out.push('|---|---|---:|---:|---:|---:|---:|---:|');
  for (const assay of ASSAYS) {
    const dr = draws.filter(x => x.assay === assay);
    const un = units.filter(c => c.draw.assay === assay);
    const fl = un.filter(c => c.rawP < ALPHA.FLAG);
    const tfs = [...new Set(dr.map(x => x.transform))].join('/');
    const kd = dr.map(x => x.kurt.kurtDeviation).filter(Number.isFinite).sort((a, b) => a - b);
    out.push(`| ${assay} | \`${tfs}\` | ${dr.length} | ${un.length} | ${fl.length} | ` +
      `${pct(fl.length, un.length)} | ${(fl.length / un.length / 0.0005).toFixed(0)}× | ` +
      `${f(kd[kd.length >> 1], 4)} |`);
  }
  out.push('');
  out.push('**This is the dispatch\'s stated falsification condition, and it is half-met.** On ' +
    '`plate_reader` the arm does read raw values — not because the routing skips the transform, but ' +
    'because `detectVST` returns `raw` for that assay label, so `hasVST` is false (`engine.js:300`) ' +
    'and `runPairVST` falls through to `runPair` at `engine.js:312`. That is P118\'s shape reached ' +
    'by a different ' +
    'route, and it carries the larger share of the excess. **It does not dissolve P120**: the ' +
    '`general` block IS log-transformed and its per-condition arm still floors at the rate in the ' +
    'table above, tens of times nominal. The transform explains part of the split between the two ' +
    'assays and none of the excess that remains inside the transformed one.');
  out.push('');
  return out.join('\n');
}

// ── --derive ────────────────────────────────────────────────────────────
//
// Re-derives kurtosis.js:401-449 outside src/, on the raw matrix and on the
// transformed one, so both questions are answered by arithmetic rather than by
// reading the dispatch table.
function stratifyLocal(matrix, condArray, simKurt, useRobust) {
  const nR = matrix.length, nC = matrix[0].length;
  const { sigma: predictedSigma, used } = fitPredictedSigma(matrix);   // :99-102
  const localSigma = matrix.map(row => {
    const vals = row.filter(v => v != null);
    if (vals.length < 2) return null;
    const m = vals.reduce((s, v) => s + v, 0) / vals.length;
    return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
  });
  const sigma = used ? predictedSigma : localSigma;
  const condIdx = {};
  for (let r = 0; r < nR; r++) { const c = condArray[r]; if (c) (condIdx[c] ||= []).push(r); }
  const results = [];
  for (const [cond, idxs] of Object.entries(condIdx)) {
    if (idxs.length < 20) continue;                                     // :409
    const condDiffs = [];
    for (let c1 = 0; c1 < nC; c1++) for (let c2 = c1 + 1; c2 < nC; c2++) {
      for (const r of idxs) {
        if (matrix[r][c1] != null && matrix[r][c2] != null && sigma[r] && sigma[r] > 0) {
          condDiffs.push((matrix[r][c1] - matrix[r][c2]) / sigma[r]);   // :413-414
        }
      }
    }
    if (condDiffs.length < 20) continue;                                // :418
    const condK = useRobust ? trimmedKurtosis(condDiffs) : kurtosis(condDiffs);  // :419
    if (isNaN(condK)) continue;
    const condKDev = condK - (isNaN(simKurt) ? 0 : simKurt);            // :421
    results.push({ condition: cond, n: idxs.length, nDiffs: condDiffs.length,
      kurtosis: condK.toFixed(4), kurtDeviation: condKDev.toFixed(4), kRaw: condK });
  }
  return { sigmaUsed: used, results: results.sort((a, b) =>
    parseFloat(a.kurtDeviation) - parseFloat(b.kurtDeviation)) };       // :438
}

async function deriveMode() {
  console.log('# S364 --derive\n');

  // (a) Transform reach — one representative draw per assay.
  console.log('## Step 2.4 — the per-condition arm re-derived from both matrices\n');
  for (const assay of ASSAYS) {
    const d = gen({ seed: SEED_BASE, nReps: 6, condNoiseRatio: 1 });
    const { results, vst, matrix, condCtx } = await battery(d.rowGroupedCsv, assay);
    const res = results.find(x => x.name === 'Excess Kurtosis');
    const useRobust = matrix.length >= 200;                             // :139
    const simKurt = res.simKurtosis;
    const vm = vstMatrixOf(matrix, vst.transform);
    const onVst = stratifyLocal(vm, condCtx.rowConditions, simKurt, useRobust);
    const onRaw = stratifyLocal(matrix, condCtx.rowConditions, simKurt, useRobust);
    console.log(`### ${assay}, 6 reps, r = 1, seed ${SEED_BASE} — ${matrix.length} rows x ${matrix[0].length} cols, ` +
      `transform '${vst.transform}', useRobust ${useRobust} (nR >= 200, :139)`);
    console.log(`    condCtx.type '${condCtx.type}'  count ${condCtx.count}  ` +
      `rowConditionsCols ${condCtx.rowConditionsCols ? condCtx.rowConditionsCols.length : 'null'} ` +
      `-> condArraysToTest length ${(condCtx.rowConditionsCols && condCtx.rowConditionsCols.length >= 2) ? condCtx.rowConditionsCols.length : (condCtx.rowConditions ? 1 : 0)} (:396-398)`);
    console.log('');
    console.log('    | cond | shipped κ | re-derived on TRANSFORMED | re-derived on RAW |');
    console.log('    |---|---|---|---|');
    for (const c of res.condKurtosis || []) {
      const v = onVst.results.find(x => x.condition === c.condition);
      const r = onRaw.results.find(x => x.condition === c.condition);
      console.log(`    | ${c.condition} | ${c.kurtosis} | ${v?.kurtosis ?? '—'} ` +
        `${v?.kurtosis === c.kurtosis ? '**match**' : ''} | ${r?.kurtosis ?? '—'} ` +
        `${r?.kurtosis === c.kurtosis ? '**match**' : ''} |`);
    }
    console.log('');
  }

  // (b) The selector, on the draw that returned no table.
  console.log('## Step 3 — the family selector on the draw that returned no condition table\n');
  const cases = (process.env.TIE_CASES || 'general:6:2.5:6105').split(',').map(s => {
    const [assay, nReps, ratio, seed] = s.split(':');
    return { assay, nReps: Number(nReps), ratio: Number(ratio), seed: Number(seed) };
  });
  for (const cs of cases) {
    const d = gen({ seed: cs.seed, nReps: cs.nReps, condNoiseRatio: cs.ratio });
    const { results, vst, matrix, condCtx } = await battery(d.rowGroupedCsv, cs.assay);
    const res = results.find(x => x.name === 'Excess Kurtosis');
    const useRobust = matrix.length >= 200;
    const vm = vstMatrixOf(matrix, vst.transform);
    const { results: rows } = stratifyLocal(vm, condCtx.rowConditions, res.simKurtosis, useRobust);
    console.log(`### ${cs.assay}, ${cs.nReps} reps, r = ${cs.ratio}, seed ${cs.seed}`);
    console.log(`    shipped condKurtosis: ${res.condKurtosis === null ? 'null' : `${res.condKurtosis.length} rows`}   ` +
      `B = ${res.nSimulations}   simKurts.length >= 20 ? ${res.nSimulations >= 20} (:393)`);
    console.log(`    condArraysToTest: ${(condCtx.rowConditionsCols && condCtx.rowConditionsCols.length >= 2)
      ? `${condCtx.rowConditionsCols.length} per-column arrays` : '1 (merged rowConditions)'} (:396-398)`);
    console.log(`    merged-labels second pass runs? condArraysToTest.length > 1 -> ` +
      `${(condCtx.rowConditionsCols && condCtx.rowConditionsCols.length >= 2)} (:451)`);
    console.log('');
    console.log('    re-derived stratifyKurtosis rows, sorted ascending by kurtDeviation (:438):');
    for (const r of rows) {
      console.log(`      ${String(r.condition).padEnd(8)} n=${r.n} nDiffs=${r.nDiffs}  ` +
        `κ ${r.kurtosis}  κDev ${r.kurtDeviation}  (κDev unrounded ${(r.kRaw - res.simKurtosis).toPrecision(17)})`);
    }
    if (rows.length >= 2) {
      const spread = parseFloat(rows[rows.length - 1].kurtDeviation) - parseFloat(rows[0].kurtDeviation);
      const unrounded = (rows[rows.length - 1].kRaw - rows[0].kRaw);
      console.log('');
      console.log(`    spread (:447) = parseFloat("${rows[rows.length - 1].kurtDeviation}") - parseFloat("${rows[0].kurtDeviation}") = ${spread}`);
      console.log(`    spread on the UNROUNDED κ would be ${unrounded.toPrecision(17)}`);
      console.log(`    bestSpread initialised to 0 (:443);  spread > bestSpread  ->  ${spread} > 0  ->  ${spread > 0}   (:448)`);
      console.log(`    => bestResults ${spread > 0 ? 'assigned' : 'stays null'};  condKurtosis ${spread > 0 ? 'set' : '**null** (:459 not entered)'}`);
    } else {
      console.log(`\n    only ${rows.length} row(s) survived :409/:418 — res.length < 2 continues at :446`);
    }
    console.log('');
  }
}

// ── entry ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--derive')) await deriveMode();
if (args.includes('--census') || args.includes('--replay')) {
  mkdirSync('test/probes/out-s364', { recursive: true });
  let recs;
  if (args.includes('--replay')) {
    recs = JSON.parse(readFileSync('test/probes/out-s364/units.json', 'utf8'));
  } else {
    recs = await grid();
    writeFileSync('test/probes/out-s364/units.json', JSON.stringify(recs, null, 1));
  }
  const md = render(recs);
  writeFileSync('test/probes/out-s364/report.md', md);
  console.log(md);
  console.log('\nwrote test/probes/out-s364/units.json and report.md');
}
if (!args.length) console.log('pass --census, --derive and/or --replay');

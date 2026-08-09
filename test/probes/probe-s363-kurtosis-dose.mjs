// S363 — the Excess Kurtosis dose-response, read at source.
//
// S361's ladder (`docs/shared/S361-CONDITION-NOISE-LADDER.md`) reports Excess
// Kurtosis's median p falling from ~0.47 at condNoiseRatio 1 to 0.000500 — its
// own permutation floor — by r = 2, on all four blocks, while its flag rate
// stays 0% in 27 of 28 cells. This probe asks what that is.
//
// Three modes, all read-only over `src/`. Nothing is written to test/fixtures
// and nothing enters the batch.
//
//   --gate     Step 1. One file, every field of the Kurtosis result that bears
//              on the flag. Evaluates BOTH suppression arms independently of
//              `esGateMode`, which names only the first OR arm checked (P62),
//              and reports which `B` sits under the p (P77).
//
//   --strat    Step 2. The DS12b measurement applied to a ladder: kurtDeviation
//              within condition A alone, within condition B alone, and pooled
//              across both, per draw, at r = 1 / 1.5 / 2.5.
//
//   --selnoise Step 3. Selective Noise's per-condition and pooled Bartlett p on
//              the same draws, to separate "blind to the axis" from "reading a
//              constant".
//
// --strat and --selnoise share one grid; passing both costs one grid, not two.
//
//   node test/probes/probe-s363-kurtosis-dose.mjs --gate
//   node test/probes/probe-s363-kurtosis-dose.mjs --strat --selnoise
//   DRAWS=5 node test/probes/probe-s363-kurtosis-dose.mjs --strat

import { writeFileSync, mkdirSync } from 'fs';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { fitPredictedSigma, kurtosis } = await import('../../src/stats/primitives.js');
const { generate } = await import('../gen-copy-fidelity.mjs');

// Same parameters as probe-s361-ladder.mjs. The point of reusing them exactly is
// that every number below is comparable, cell for cell, with the ladder tables
// this probe is auditing.
const DRAWS = Number(process.env.DRAWS) || 20;
const REPS = process.env.REPS ? [Number(process.env.REPS)] : [4, 6];
const SUBJECTS = 120;
const SEED_BASE = 6100;
const ASSAYS = (process.env.ASSAYS || 'general,plate_reader').split(',');
const RUNGS = (process.env.RUNGS || '1,1.5,2.5').split(',').map(Number);

const gen = (opts) => generate({ k: 1, sigmaS: 0, nSubjects: SUBJECTS, ...opts });

// Same load path as probe-s361-ladder.mjs and test/validate-batch.mjs.
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

// The matrix Kurtosis actually receives. Re-derives engine.js:295-298 — one
// line, so the normalisation branch below is read on the same input the test
// saw rather than on the raw matrix.
function vstMatrixOf(matrix, vstType) {
  if (vstType === 'log') return matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  if (vstType === 'anscombe') return matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  return matrix;
}

const num = (x) => (x == null ? NaN : typeof x === 'string' ? parseFloat(x) : x);
const median = (xs) => {
  const s = [...xs].filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const f = (x, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : '—');
const sd = (xs) => {
  const a = xs.filter(Number.isFinite);
  if (a.length < 2) return NaN;
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
// `condKurtosis` is sorted ascending by kurtDeviation (kurtosis.js:438), so
// index 0 is NOT condition A — it is whichever condition read lower on this
// draw. Every per-condition read below selects by name.
const condBy = (k, name) => (k.conds || []).find(c => c.name === name);

// ── Read one Kurtosis result into the fields the gate turns on ──────────
function readKurtosis(res) {
  const pooledKurtosis = res.pooledKurtosis;
  const simKurt = res.simKurtosis;
  // Full precision: the published kurtDeviation is toFixed(4). The gate itself
  // uses the unrounded difference, so recompute it the way kurtosis.js:330 does.
  const kurtDeviation = (pooledKurtosis != null && simKurt != null) ? pooledKurtosis - simKurt : 0;
  const adaptiveThreshold = num(res.adaptiveThreshold);
  // Both arms, evaluated independently. `esGateMode` reports only the first OR
  // arm that is true (kurtosis.js:545-547), so it cannot answer "which gate
  // stops the flag" when both are true — P62.
  const directional = kurtDeviation >= 0;
  const effectSize = Math.abs(kurtDeviation) < adaptiveThreshold;
  return {
    flag: res.flag,
    esGateMode: res.esGateMode,
    isPromoted: !!res.isPromoted,
    pooledKurtosis, simKurt,
    simKurtMedian: res.simKurtMedian, simKurtSD: res.simKurtSD,
    kurtDeviation, adaptiveThreshold, directional, effectSize,
    pooledN: res.pooledN,
    nSimulations: res.nSimulations,
    // The observed normalised-difference pool, UNTRIMMED. `pooledKurtosis` is
    // the 2%-trimmed figure at nR >= 200, and a trim removes exactly the tail
    // mass a scale mixture puts there — so the untrimmed reading is the one
    // that can be checked against the closed-form two-component mixture.
    kurtUntrimmed: res.normDiffs && res.normDiffs.length >= 20 ? kurtosis(res.normDiffs) : NaN,
    nNormDiffs: res.normDiffs ? res.normDiffs.length : 0,
    pooledP: num(res.pooledP),
    primaryP: res.primaryP,
    kurtP: num(res._kurtosisP),
    adP: num(res._andersonDarlingP),
    nPairs: res.nPairs,
    conds: (res.condKurtosis || []).map(c => ({
      name: c.condition, n: c.n, nDiffs: c.nDiffs,
      kurtosis: num(c.kurtosis),
      kurtDeviation: num(c.kurtDeviation),
      rawP: c.rawP, flag: c.flag,
      condAdjP: c.condAdjP == null ? null : c.condAdjP,
      condPromoted: c.condPromoted == null ? null : c.condPromoted,
    })),
  };
}

function readSelNoise(res) {
  const cond = (res.condResults || []).map(c => ({
    name: c.condition, nRows: c.nRows,
    ratio: num(c.maxMinVarianceRatio), chi: num(c.bartlettChi),
    pBartlett: num(c.pBartlett), flag: c.flag,
  }));
  return {
    flag: res.flag,
    primaryP: res.primaryP,
    primaryPUngated: res.primaryPUngated,
    nGateSuppressed: res.nGateSuppressed,
    pooledRatio: num(res.maxMinVarianceRatio),
    pooledPBartlett: num(res.pBartlett),
    nRows: res.nRows,
    cond,
  };
}

// ── --gate ──────────────────────────────────────────────────────────────
async function gateMode() {
  console.log('S363 step 1 — the suppression, read at source\n');
  for (const nReps of REPS) {
    for (const r of RUNGS) {
      const d = gen({ seed: SEED_BASE, nReps, condNoiseRatio: r });
      for (const assay of ASSAYS) {
        const { results, vst, matrix, condCtx } = await battery(d.rowGroupedCsv, assay);
        const res = results.find(x => x.name === 'Excess Kurtosis');
        const k = readKurtosis(res);
        const vm = vstMatrixOf(matrix, vst.transform);
        const fit = fitPredictedSigma(vm);
        console.log(`── ${assay}, ${nReps} reps, r = ${r}, seed ${SEED_BASE} ` +
          `(${matrix.length} rows x ${matrix[0].length} cols, ${condCtx?.count} conditions, transform '${vst.transform}')`);
        console.log(`   normalisation      predicted-sigma used: ${fit.used}   (kurtosis.js:99-102)`);
        console.log(`   useRobust          ${matrix.length >= 200}  (nR >= 200, kurtosis.js:139 — 2% trim per tail)`);
        console.log(`   pooledKurtosis     ${f(k.pooledKurtosis, 6)}`);
        console.log(`   simKurtosis (mean) ${f(k.simKurt, 6)}     median ${f(k.simKurtMedian, 6)}  sd ${f(k.simKurtSD, 6)}`);
        console.log(`   kurtDeviation      ${f(k.kurtDeviation, 6)}   (published ${f(k.kurtDeviation, 4)})`);
        console.log(`   adaptiveThreshold  ${f(k.adaptiveThreshold, 4)}   pooledN ${k.pooledN}`);
        console.log(`   directionalSuppress (kurtDev >= 0)          ${k.directional}`);
        console.log(`   effectSizeSuppress  (|kurtDev| < threshold) ${k.effectSize}`);
        console.log(`   esGateMode         "${k.esGateMode}"`);
        console.log(`   nSimulations (B)   ${k.nSimulations}   -> floor 1/${k.nSimulations + 1} = ${(1 / (k.nSimulations + 1)).toPrecision(3)}`);
        console.log(`   kurtP ${f(k.kurtP)}   adP ${f(k.adP)}   pooledP ${f(k.pooledP)}   primaryP ${k.primaryP}`);
        console.log(`   primaryP === pooledP ? ${Math.abs(k.primaryP - k.pooledP) < 1e-12}    isPromoted ${k.isPromoted}`);
        console.log(`   flag ${k.flag}`);
        for (const c of k.conds) {
          console.log(`     cond ${String(c.name).padEnd(10)} n=${c.n} nDiffs=${c.nDiffs}  ` +
            `kurt ${f(c.kurtosis)}  kurtDev ${f(c.kurtDeviation)}  rawP ${f(c.rawP)}  ` +
            `flag ${String(c.flag).padEnd(8)} condAdjP ${c.condAdjP == null ? '—' : f(c.condAdjP)} promoted ${c.condPromoted}`);
        }
        console.log('');
      }
    }
  }
}

// ── --strat / --selnoise ────────────────────────────────────────────────
async function grid(wantKurt, wantSel) {
  const recs = [];
  const total = REPS.length * RUNGS.length * DRAWS * ASSAYS.length;
  const t0 = Date.now();
  let done = 0;
  for (const nReps of REPS) {
    for (const r of RUNGS) {
      for (let i = 0; i < DRAWS; i++) {
        const d = gen({ seed: SEED_BASE + i, nReps, condNoiseRatio: r });
        for (const assay of ASSAYS) {
          const { results } = await battery(d.rowGroupedCsv, assay);
          const rec = { assay, nReps, ratio: r, seed: SEED_BASE + i,
            realisedRatio: d.diagnostics?.condNoiseRatioRealised };
          if (wantKurt) rec.kurt = readKurtosis(results.find(x => x.name === 'Excess Kurtosis'));
          if (wantSel) {
            const sn = results.find(x => x.name === 'Selective Noise Partitioning');
            rec.sel = sn && sn.flag !== 'N/A' ? readSelNoise(sn) : null;
          }
          recs.push(rec);
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

function renderStrat(recs) {
  const out = [];
  out.push('S363 step 2 — the three kurtosis figures per draw');
  out.push('');
  out.push('kurtDeviation = kurtosis - simKurtosis, the SAME subtrahend for all three columns');
  out.push('(kurtosis.js:330 for pooled, :421 per condition). CondA / CondB are the test\'s own');
  out.push('condition-stratified figures, selected BY NAME because condKurtosis is sorted ascending');
  out.push('by kurtDeviation (:438); pooled is the one the gate reads.');
  out.push('');
  for (const assay of ASSAYS) for (const nReps of REPS) {
    out.push(`## assay ${assay}, ${nReps} replicates`);
    out.push('');
    out.push('|  r  | draws | kurtDev CondA | kurtDev CondB | kurtDev pooled | pooled - max(cond) | median primaryP | B | flags |');
    out.push('|----:|------:|--------------:|--------------:|---------------:|-------------------:|----------------:|--:|:------|');
    for (const r of RUNGS) {
      const cells = recs.filter(x => x.assay === assay && x.nReps === nReps && x.ratio === r && x.kurt);
      if (!cells.length) continue;
      const a = median(cells.map(x => condBy(x.kurt, 'CondA')?.kurtDeviation));
      const b = median(cells.map(x => condBy(x.kurt, 'CondB')?.kurtDeviation));
      const p = median(cells.map(x => x.kurt.kurtDeviation));
      const gap = median(cells.map(x => x.kurt.kurtDeviation - Math.max(
        condBy(x.kurt, 'CondA')?.kurtDeviation ?? -Infinity, condBy(x.kurt, 'CondB')?.kurtDeviation ?? -Infinity)));
      const mp = median(cells.map(x => x.kurt.primaryP));
      const Bs = [...new Set(cells.map(x => x.kurt.nSimulations))].join('/');
      const flags = [...new Set(cells.map(x => x.kurt.flag))].join(',');
      out.push(`| ${r} | ${cells.length} | ${f(a)} | ${f(b)} | ${f(p)} | ${f(gap)} | ${mp.toPrecision(3)} | ${Bs} | ${flags} |`);
    }
    out.push('');
  }
  // Gate census — which arm stops the flag, over every draw.
  out.push('## which arm suppresses, over every draw');
  out.push('');
  out.push('| assay | reps |  r  | directional only | effect-size only | both | neither | promoted | primaryP != pooledP |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const assay of ASSAYS) for (const nReps of REPS) for (const r of RUNGS) {
    const cells = recs.filter(x => x.assay === assay && x.nReps === nReps && x.ratio === r && x.kurt);
    if (!cells.length) continue;
    const d = cells.filter(x => x.kurt.directional && !x.kurt.effectSize).length;
    const e = cells.filter(x => !x.kurt.directional && x.kurt.effectSize).length;
    const both = cells.filter(x => x.kurt.directional && x.kurt.effectSize).length;
    const none = cells.filter(x => !x.kurt.directional && !x.kurt.effectSize).length;
    const prom = cells.filter(x => x.kurt.isPromoted).length;
    const diff = cells.filter(x => Math.abs(x.kurt.primaryP - x.kurt.pooledP) > 1e-9).length;
    out.push(`| ${assay} | ${nReps} | ${r} | ${d} | ${e} | ${both} | ${none} | ${prom} | ${diff} |`);
  }
  out.push('');
  // Mechanism check. A 50/50 mixture of two zero-mean normals at sd ratio q has
  // excess kurtosis 6(1+q^4)/(1+q^2)^2 - 3 exactly. If the pooled reading IS the
  // mixture of the two conditions' scales seen through one condition-blind
  // sigma-hat, the paired rise from rung 1 should land on that number. Untrimmed
  // both sides — the shipped 2% trim removes the tail the mixture lives in.
  const mixPredict = (q) => 6 * (1 + q ** 4) / (1 + q * q) ** 2 - 3;
  out.push('## closed-form mixture check (untrimmed kurtosis of the observed normalised diffs)');
  out.push('');
  out.push('| assay | reps |  r  | realised q | observed rise from r=1 | 6(1+q^4)/(1+q^2)^2 - 3 | observed/predicted |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const assay of ASSAYS) for (const nReps of REPS) for (const r of RUNGS) {
    const cells = recs.filter(x => x.assay === assay && x.nReps === nReps && x.ratio === r && x.kurt);
    if (!cells.length) continue;
    const rises = cells.map(x => {
      const base = recs.find(y => y.assay === assay && y.nReps === nReps && y.ratio === RUNGS[0] && y.seed === x.seed && y.kurt);
      return base ? x.kurt.kurtUntrimmed - base.kurt.kurtUntrimmed : NaN;
    });
    const q = median(cells.map(x => x.realisedRatio));
    const rise = median(rises);
    const pred = mixPredict(q) - mixPredict(median(recs.filter(y => y.assay === assay && y.nReps === nReps && y.ratio === RUNGS[0]).map(y => y.realisedRatio)));
    out.push(`| ${assay} | ${nReps} | ${r} | ${f(q, 4)} | ${f(rise, 4)} | ${f(pred, 4)} | ${pred === 0 ? '—' : f(rise / pred, 3)} |`);
  }
  out.push('');
  // The per-condition arm's own calibration. Its kappa is computed on one
  // condition's rows and ranked against `simKurts`, whose batches are built
  // from ALL valid rows (kurtosis.js:176-179, :422-425). Spread across draws is
  // the statistic's own sampling sd on this generator; simKurtSD is the sd of
  // the null it is ranked against. The pooled row is the control: same rows on
  // both sides, so it should read near 1 wherever the pool is not itself a
  // mixture (i.e. at rung 1).
  out.push('## per-condition statistic against the null it is ranked against');
  out.push('');
  out.push('| assay | reps |  r  | sd(CondA kappa) | sd(CondB kappa) | sd(pooled kappa) | median simKurtSD | ratio A | ratio B | ratio pooled |');
  out.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const assay of ASSAYS) for (const nReps of REPS) for (const r of RUNGS) {
    const cells = recs.filter(x => x.assay === assay && x.nReps === nReps && x.ratio === r && x.kurt);
    if (cells.length < 2) continue;
    const sA = sd(cells.map(x => condBy(x.kurt, 'CondA')?.kurtosis));
    const sB = sd(cells.map(x => condBy(x.kurt, 'CondB')?.kurtosis));
    const sP = sd(cells.map(x => x.kurt.pooledKurtosis));
    const s0 = median(cells.map(x => x.kurt.simKurtSD));
    out.push(`| ${assay} | ${nReps} | ${r} | ${f(sA)} | ${f(sB)} | ${f(sP)} | ${f(s0)} | ${f(sA / s0, 3)} | ${f(sB / s0, 3)} | ${f(sP / s0, 3)} |`);
  }
  out.push('');
  // What that costs on the per-condition tier, counted rather than argued.
  const units = recs.filter(x => x.kurt).flatMap(x => x.kurt.conds);
  const atFloor = units.filter(c => c.rawP != null && c.rawP < 0.001).length;
  const mid = units.filter(c => c.rawP != null && c.rawP >= 0.001 && c.rawP < 0.01).length;
  const noTable = recs.filter(x => x.kurt && x.kurt.conds.length !== 2);
  out.push('## per-condition tail, on honest data');
  out.push('');
  out.push(`- condition-units returned: **${units.length}** over ${recs.filter(x => x.kurt).length} draws`);
  out.push(`- rawP < 0.001 (HIGH on the condition card): **${atFloor}** = ${(100 * atFloor / units.length).toFixed(1)}%, nominal 0.1%`);
  out.push(`- 0.001 <= rawP < 0.01 (MODERATE): **${mid}** = ${(100 * mid / units.length).toFixed(1)}%, nominal 0.9%`);
  out.push(`- draws returning no two-condition table at all: **${noTable.length}**` +
    (noTable.length ? ` — ${noTable.map(x => `${x.assay} ${x.nReps}rep r=${x.ratio} seed ${x.seed} (B=${x.kurt.nSimulations}, conds=${x.kurt.conds.length})`).join('; ')}` : ''));
  out.push('');
  return out.join('\n');
}

function renderSel(recs) {
  const out = [];
  out.push('S363 step 3 — Selective Noise on the same draws');
  out.push('');
  out.push('condA / condB are per-condition Bartlett p (selectiveNoise.js:189). pooled is the');
  out.push('display-only whole-matrix Bartlett. primaryP is the BH minimum over the per-condition');
  out.push('family, in which a gate-suppressed condition contributes the literal 1.0 (`:184`).');
  out.push('');
  for (const assay of ASSAYS) for (const nReps of REPS) {
    const any = recs.some(x => x.assay === assay && x.nReps === nReps && x.sel);
    if (!any) continue;
    out.push(`## assay ${assay}, ${nReps} replicates`);
    out.push('');
    out.push('|  r  | pBartlett condA | pBartlett condB | pBartlett pooled | ratio condA | ratio condB | median primaryP | gate-suppressed |');
    out.push('|----:|----------------:|----------------:|-----------------:|------------:|------------:|----------------:|----------------:|');
    for (const r of RUNGS) {
      const cells = recs.filter(x => x.assay === assay && x.nReps === nReps && x.ratio === r && x.sel);
      if (!cells.length) continue;
      const selBy = (x, nm) => x.sel.cond.find(c => c.name === nm);
      const pa = median(cells.map(x => selBy(x, 'CondA')?.pBartlett));
      const pb = median(cells.map(x => selBy(x, 'CondB')?.pBartlett));
      const pp = median(cells.map(x => x.sel.pooledPBartlett));
      const ra = median(cells.map(x => selBy(x, 'CondA')?.ratio));
      const rb = median(cells.map(x => selBy(x, 'CondB')?.ratio));
      const mp = median(cells.map(x => x.sel.primaryP));
      const gs = [...new Set(cells.map(x => x.sel.nGateSuppressed))].join('/');
      out.push(`| ${r} | ${pa.toPrecision(10)} | ${pb.toPrecision(10)} | ${pp.toPrecision(10)} | ${f(ra, 4)} | ${f(rb, 4)} | ${mp.toPrecision(6)} | ${gs} |`);
    }
    out.push('');
  }
  // The identity check: is a given seed's per-condition p literally the same
  // number at every rung? A median can be stable while its members move.
  out.push('## per-seed identity across rungs (condition-A Bartlett p, 17 significant digits)');
  out.push('');
  for (const assay of ASSAYS) for (const nReps of REPS) {
    const seeds = [...new Set(recs.filter(x => x.assay === assay && x.nReps === nReps && x.sel).map(x => x.seed))].slice(0, 3);
    for (const s of seeds) {
      const row = RUNGS.map(r => {
        const c = recs.find(x => x.assay === assay && x.nReps === nReps && x.ratio === r && x.seed === s && x.sel);
        return c ? c.sel.cond.find(z => z.name === 'CondA')?.pBartlett : NaN;
      });
      const identical = row.every(v => Object.is(v, row[0]));
      out.push(`- ${assay} ${nReps}rep seed ${s}: ` + row.map(v => (Number.isFinite(v) ? v.toPrecision(17) : '—')).join('  ') +
        `   identical: ${identical}`);
    }
  }
  out.push('');
  return out.join('\n');
}

const args = process.argv.slice(2);
if (args.includes('--gate')) await gateMode();
const wantKurt = args.includes('--strat');
const wantSel = args.includes('--selnoise');
if (wantKurt || wantSel) {
  const recs = await grid(wantKurt, wantSel);
  mkdirSync('test/probes/out-s363', { recursive: true });
  writeFileSync('test/probes/out-s363/dose.json', JSON.stringify(recs, null, 1));
  if (wantKurt) console.log('\n' + renderStrat(recs));
  if (wantSel) console.log('\n' + renderSel(recs));
  console.log('wrote test/probes/out-s363/dose.json');
}
if (!args.length) console.log('pass --gate, --strat and/or --selnoise');

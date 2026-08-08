// S360 Part 2 — price the Šidák bound on the cells that are live.
//
// The S360 census (docs/shared/S360-EXTREME-STATISTIC-CENSUS.md) found fourteen
// tests whose reported flag is the best of two or more separately calibrated
// statistics, with nothing paid for the choice. It named the cells currently at
// MODERATE or HIGH on one of those tests but left most of them unpriced, because
// test/flag-matrix.json records flags and not p-values.
//
// This probe recovers the arm-level p-values for those cells from the shipped
// result objects — no src/ change, no new export — and reports per cell: each
// arm's p, the arm count, the Šidák-corrected value 1 - (1-min_p)^k, and the
// tier that value lands in.
//
// Šidák needs only the minimum and the arm count. The other arms are printed
// because a reader wants to see them, not because the arithmetic uses them.
// Where an arm's p is not recoverable from the shipped result it is printed as
// "not exported" rather than reconstructed; on every live cell the arm that is
// missing is the one that did not drive the flag, so the corrected figure is
// still exact.
//
// Seed offset 0 throughout — no seed hook is registered, so this is the shipped
// PRNG stream, the same one test/flag-matrix.json was pinned at.
//
//   node test/probes/probe-s360-arm-pricing.mjs
//   node test/probes/probe-s360-arm-pricing.mjs --json    # machine-readable dump

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
const { ALPHA, flagFromP } = await import('../../src/constants/thresholds.js');

const FIXTURES = 'test/fixtures';
const SEED_OFFSET = 0;
const JSON_OUT = process.argv.includes('--json');

// ── The fourteen Class A tests, by result name ──────────────────────
// Taken from the census table. Value-Frequency Spike is Class A only on the
// branch where its deep-tail BH family is non-empty; the extractor reports
// k = 1 when it is empty, which is the Class C case.
const CLASS_A = new Set([
  'Inter-Replicate Correlation',
  'Sequential Duplication',
  'Constant-Offset Blocks',
  'Baseline Balance',
  'Cross-Condition Consistency',
  'Excess Kurtosis',
  'Autocorrelation',
  'Windowed Autocorrelation',
  'Runs Test',
  'Within-Row Variance',
  'LOESS Residual Analysis',
  'Row-Mean Runs',
  'Regional Noise Homogeneity',
  'Value-Frequency Spike',
]);

const sidak = (p, k) => 1 - Math.pow(1 - p, k);
const num = (v) => (v == null || !Number.isFinite(v) ? null : v);
const fmt = (v) => (v == null ? '     —    ' : v < 1e-4 ? v.toExponential(2).padStart(10) : v.toFixed(6).padStart(10));

// ── Arm extractors ──────────────────────────────────────────────────
// Each returns { arms: [{name, p, note}], k, minP, kNote }.
// `p` null means the arm exists but its value is not on the shipped result.
// `minP` is the smallest recoverable arm p — the quantity Šidák acts on.

const EXTRACTORS = {
  'LOESS Residual Analysis'(r) {
    // loessResidual.js:226 — flag is the higher-ranked of flagFromP(scanP) and
    // flagFromP(cusumP). The per-pair promotion arm (:442) is a third arm but
    // caps at MODERATE, so it is reported separately rather than folded into k.
    const pairBest = Array.isArray(r.pairResults) && r.pairResults.length
      ? Math.min(...r.pairResults.map(p => (p.adjP != null ? p.adjP : 1)))
      : null;
    return {
      arms: [
        { name: 'scanP (window max)', p: num(r.scanP) },
        { name: 'cusumP (changepoint max)', p: num(r.cusumP) },
      ],
      k: 2,
      extra: [{ name: 'pair promotion (BH min, caps at MODERATE)', p: num(pairBest) }],
      kNote: 'scan and cusum; promotion arm excluded (MODERATE ceiling)',
    };
  },

  'Regional Noise Homogeneity'(r) {
    // regionalNoise.js:186-188 — flagFromP(scanP), promoted to MODERATE when any
    // per-column BH-adjusted p clears ALPHA.FLAG. colPromoters[].adjP is exported.
    const colBest = Array.isArray(r.colPromoters) && r.colPromoters.length
      ? Math.min(...r.colPromoters.map(c => (c.adjP != null ? c.adjP : 1)))
      : null;
    return {
      arms: [
        { name: 'scanP (window x column max)', p: num(r.scanP) },
        { name: 'per-column BH min', p: num(colBest) },
      ],
      k: 2,
      kNote: 'global scan and per-column family',
    };
  },

  'Cross-Condition Consistency'(r) {
    // crossConditionConsistency.js:565-575 build one BH family per stage;
    // :619 takes the minimum across all three with no cross-stage correction.
    // A unit contributes only when it ran, is forensic-direction and gate-passed.
    const det = Array.isArray(r.details) ? r.details : [];
    const perStage = [1, 2, 3].map(s => {
      const elig = det.filter(d => d.ran && d.stage === s && d.forensic && d.gatePassed && d.adjP != null);
      return elig.length ? Math.min(...elig.map(d => d.adjP)) : null;
    });
    const sizes = [r.bhMStage1 || 0, r.bhMStage2 || 0, r.bhMStage3 || 0];
    const populated = sizes.filter(n => n > 0).length;
    return {
      arms: perStage.map((p, i) => ({ name: `stage ${i + 1} BH min (m=${sizes[i]})`, p: num(p) })),
      k: Math.max(populated, 1),
      kNote: `${populated} of 3 stages carry running units`,
    };
  },

  'Baseline Balance'(r) {
    // carlisleBalance.js:144 — primaryP = min(binomP, ksP), both closed-form.
    return {
      arms: [
        { name: 'binomP (excess p>0.95)', p: num(r.binomP) },
        { name: 'ksP (uniformity)', p: num(r.ksP) },
      ],
      k: 2,
      kNote: 'binomial tail and KS survival',
    };
  },

  'Autocorrelation'(r) {
    // autocorrelation.js:113 lag-1 per-pair BH family; :172 lags 2-5 pooled BH
    // family promotes LOW to MODERATE. lagTable[0] is lag 1 and belongs to
    // neither promotion arm, so the higher-lag arm is the minimum over 1..4.
    const lt = Array.isArray(r.lagTable) ? r.lagTable.slice(1) : [];
    const higher = lt.length ? Math.min(...lt.map(l => (l.rawAdjP != null ? l.rawAdjP : 1))) : null;
    return {
      arms: [
        { name: 'lag-1 per-pair BH min', p: num(r.minAdjP) },
        { name: 'lags 2-5 pooled BH min', p: num(higher) },
      ],
      k: 2,
      kNote: 'lag-1 pair family and higher-lag pooled family',
    };
  },

  'Inter-Replicate Correlation'(r) {
    // interReplicateCorrelation.js:282-307 — the global arm is the best adj-p
    // among suspicious pairs when any pair is suspicious, otherwise the best
    // adj-p over all pairs (the anyPairSig promotion). :306 takes the
    // higher-ranked of that and the windowed scan flag.
    const pairs = (Array.isArray(r.details) ? r.details : []).filter(d => d.source !== 'window' && d.adjP != null);
    const susp = pairs.filter(d => d.suspicious);
    const src = susp.length ? susp : pairs;
    const globalBest = src.length ? Math.min(...src.map(d => d.adjP)) : null;
    return {
      arms: [
        { name: susp.length ? 'suspicious-pair BH min' : 'all-pair BH min', p: num(globalBest) },
        { name: 'windowScanP (permutation)', p: num(r.windowScanP) },
      ],
      k: 2,
      kNote: 'pair family and windowed scan',
    };
  },

  'Constant-Offset Blocks'(r) {
    // constantOffset.js:78-84 — the pass with the lower permutation p is kept
    // and its p becomes primaryP, uncorrected. Both are exported for diagnostics.
    return {
      arms: [
        { name: 'additive pass permP', p: num(r.addP) },
        { name: 'multiplicative pass permP', p: num(r.mulP) },
      ],
      k: r.mulP == null ? 1 : 2,
      kNote: r.mulP == null ? 'multiplicative pass did not run' : 'additive and multiplicative passes',
    };
  },

  'Runs Test'(r) {
    // runs.js:265 — pair BH family against window BH family. The window family's
    // adjusted minimum is computed at :276 and never exported; windowScanP is the
    // separate permutation scan, which does not feed the flag.
    return {
      arms: [
        { name: 'per-pair BH min', p: num(r.minAdjP) },
        { name: 'window BH min', p: null, note: 'not exported (windowSigCount=' + (r.windowSigCount ?? '?') + ')' },
      ],
      k: 2,
      kNote: 'pair family and window family',
    };
  },

  'Row-Mean Runs'(r) {
    // rowMeanRuns.js:105-107 takes an uncorrected minimum across per-condition
    // sequences; :155 then takes the higher-ranked of that and the window family.
    // windowBestP is the RAW window minimum, not the BH-adjusted one the
    // promotion reads, so the window arm is reported as not exported.
    const g = num(parseFloat(r.globalP));
    const nSeq = r.nSequences || 1;
    return {
      arms: [
        { name: `per-condition sequence min (${nSeq} sequences)`, p: g },
        { name: 'window BH min', p: null, note: 'not exported (raw min ' + (r.windowBestP ?? '?') + ')' },
      ],
      k: nSeq + 1,
      kNote: `${nSeq} sequence arms plus the window family`,
    };
  },

  'Value-Frequency Spike'(r) {
    // valueFrequencySpike.js:474 corrects pass 1 and pass 2 in ONE union BH
    // family, so that part is Class C. :483-485 gives the depth-admitted deep
    // buckets their own family, and :561 combines the two minima uncorrected.
    // Deep entries are appended to the exported allTested tail; their count is
    // read from pass2Diag.buckets.
    const all = Array.isArray(r.allTested) ? r.allTested : [];
    const buckets = r.pass2Diag && Array.isArray(r.pass2Diag.buckets) ? r.pass2Diag.buckets : [];
    const nDeep = buckets.filter(b => b.deepBucket).reduce((s, b) => s + (b.nTested || 0), 0);
    const shared = nDeep > 0 ? all.slice(0, all.length - nDeep) : all;
    const deep = nDeep > 0 ? all.slice(all.length - nDeep) : [];
    const minOf = (xs) => (xs.length ? Math.min(...xs.map(t => (t.adjP != null ? t.adjP : 1))) : null);
    return {
      arms: [
        { name: `union BH min (pass1+pass2, n=${shared.length})`, p: num(minOf(shared)) },
        { name: `deep-tail BH min (n=${deep.length})`, p: num(minOf(deep)) },
      ],
      k: nDeep > 0 ? 2 : 1,
      kNote: nDeep > 0 ? 'union family and deep-tail family' : 'deep-tail family empty — Class C on this fixture',
    };
  },

  'Excess Kurtosis'(r) {
    // kurtosis.js:508 — pooled arm, per-condition BH promotion arm.
    const ck = Array.isArray(r.condKurtosis) ? r.condKurtosis : [];
    const condBest = ck.length && ck.some(c => c.condAdjP != null)
      ? Math.min(...ck.filter(c => c.condAdjP != null).map(c => c.condAdjP))
      : null;
    return {
      arms: [
        { name: 'pooled simulation p', p: num(parseFloat(r.pooledP)) },
        { name: 'per-condition BH min', p: num(condBest) },
      ],
      k: 2,
      kNote: 'pooled and per-condition families',
    };
  },

  'Within-Row Variance'(r) {
    // withinRowVariance.js:147-150 — global binomial against window BH family.
    return {
      arms: [
        { name: 'global binomial', p: null, note: 'not exported' },
        { name: 'window BH min', p: num(parseFloat(r.windowScanP)) },
      ],
      k: 2,
      kNote: 'global binomial and window family',
    };
  },

  'Windowed Autocorrelation'(r) {
    // windowedAutocorrelation.js:192-194 runs BH inside each pair; :202 takes the
    // minimum across pairs with nothing paid. Arms = pairs.
    const nPairs = Array.isArray(r.nWindowsByPair) ? r.nWindowsByPair.length : (r.nPairs || 1);
    return {
      arms: [{ name: `min over ${nPairs} per-pair BH families`, p: num(r.primaryP) }],
      k: nPairs,
      kNote: `${nPairs} replicate pairs, each its own BH family`,
    };
  },

  'Sequential Duplication'(r) {
    // sequentialDuplication.js:169-171 — the Bonferroni denominator covers
    // offsets x start positions; the minimum then ranges over columns and heights.
    return {
      arms: [{ name: 'min pAdj over kept sequences', p: num(r.primaryP) }],
      k: null,
      kNote: 'arm count is columns x heights, data-dependent — not priced here',
    };
  },
};

// ── Load the cell list from the pinned flag matrix ──────────────────
const matrix = JSON.parse(readFileSync('test/flag-matrix.json', 'utf-8'));
const cells = matrix.cells || matrix;
const liveByFixture = new Map();
for (const [file, row] of Object.entries(cells)) {
  const hits = Object.entries(row)
    .filter(([t, v]) => CLASS_A.has(t) && (v === 'HIGH' || v === 'MODERATE'))
    .map(([t, v]) => ({ test: t, flag: v }));
  if (hits.length) liveByFixture.set(file, hits);
}

const totalCells = [...liveByFixture.values()].reduce((s, a) => s + a.length, 0);

// ── Run the engine, fixture by fixture ─────────────────────────────
// Same load path as test/validate-batch.mjs, so the results are the ones the
// matrix was pinned from.
async function runFixture(file) {
  const expected = EXPECTED[file];
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix: m, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(m, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return runFullAnalysis(m, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
}

const out = [];
for (const [file, hits] of liveByFixture) {
  const results = await runFixture(file);
  const byName = new Map(results.map(r => [r.name, r]));
  for (const { test, flag } of hits) {
    const r = byName.get(test);
    const rec = { fixture: file, test, matrixFlag: flag, engineFlag: r ? r.flag : null };
    if (!r) { rec.error = 'result not present'; out.push(rec); continue; }
    if (r.flag !== flag) rec.drift = `matrix says ${flag}, engine says ${r.flag}`;
    const ex = EXTRACTORS[test];
    if (!ex) { rec.error = 'no extractor'; out.push(rec); continue; }
    const a = ex(r);
    const known = a.arms.filter(x => x.p != null).map(x => x.p);
    const minP = known.length ? Math.min(...known) : null;
    rec.arms = a.arms;
    rec.extra = a.extra || null;
    rec.k = a.k;
    rec.kNote = a.kNote;
    rec.primaryP = num(r.primaryP);
    rec.minArmP = minP;
    rec.sidak = minP != null && a.k ? sidak(minP, a.k) : null;
    rec.tierAfter = rec.sidak != null ? flagFromP(rec.sidak) : null;
    rec.moves = rec.tierAfter != null && rec.tierAfter !== r.flag;
    out.push(rec);
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ seedOffset: SEED_OFFSET, alpha: ALPHA, cells: out }, null, 2));
} else {
  console.log('S360 Part 2 — Šidák bound priced on live Class A cells');
  console.log(`seed offset ${SEED_OFFSET} (shipped stream) · ALPHA.FLAG=${ALPHA.FLAG} ALPHA.NOTE=${ALPHA.NOTE}, both strict`);
  console.log(`${totalCells} cells across ${liveByFixture.size} fixtures\n`);
  let moved = 0, unpriced = 0;
  for (const rec of out) {
    console.log(`${rec.fixture}  ·  ${rec.test}  ·  now ${rec.engineFlag}`);
    if (rec.drift) console.log(`  !! ${rec.drift}`);
    if (rec.error) { console.log(`  !! ${rec.error}\n`); continue; }
    for (const arm of rec.arms) {
      console.log(`    arm  ${fmt(arm.p)}   ${arm.name}${arm.note ? '   [' + arm.note + ']' : ''}`);
    }
    for (const arm of rec.extra || []) {
      console.log(`    (+)  ${fmt(arm.p)}   ${arm.name}`);
    }
    if (rec.k == null) {
      console.log(`    k    — ${rec.kNote}`);
      console.log('    →    not priced\n');
      unpriced++;
      continue;
    }
    console.log(`    k    ${rec.k}  (${rec.kNote})`);
    console.log(`    min  ${fmt(rec.minArmP)}   primaryP ${fmt(rec.primaryP)}`);
    console.log(`    →    Šidák ${fmt(rec.sidak)}  tier ${rec.tierAfter}${rec.moves ? '   ** MOVES **' : '   (holds)'}\n`);
    if (rec.moves) moved++;
  }
  console.log(`— ${moved} of ${totalCells} cells cross a threshold under the bound; ${unpriced} not priced —`);
}

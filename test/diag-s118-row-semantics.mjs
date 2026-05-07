// S118 Phase 2 — Track H row-semantics gate diagnostic (read-only).
// Iterates the 22-fixture batch (same fixture list and engine scaffold as
// test/validate-batch.mjs) and emits four labelled stdout sections:
//   §1 per-fixture × per-test skip audit (CSV, 10 + 1 split rows = 11 per fixture)
//   §2 detectLongFormat() per fixture (CSV)
//   §3 row-index usage grep (CSV)
//   §4 IRC bracket-strip audit (prose)
//
// Mirrors S117 Phase 1 pattern: extracts only what the engine emits or what
// can be observed by a static read; no engine change, no doc edit, no
// fixture creation. Unresolved fields go in a final "### Missing fields" block.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');

const FIXTURES = 'test/fixtures';
const FIXTURE_LIST = [
  ['DS01',  '01-densitometry-clean.csv',                 'densitometry'],
  ['DS02',  '02-densitometry-fabricated.csv',            'densitometry'],
  ['DS03',  '03-qpcr-clean.csv',                         'qpcr'],
  ['DS04',  '04-qpcr-fabricated.csv',                    'qpcr'],
  ['DS05',  '05-cellcount-clean.csv',                    'cell_count'],
  ['DS06',  '06-cellcount-fabricated.csv',               'cell_count'],
  ['DS07',  '07-elisa-clean.csv',                        'elisa'],
  ['DS08',  '08-elisa-fabricated.csv',                   'elisa'],
  ['DS09',  '09-proteomics-clean.csv',                   'proteomics'],
  ['DS10', '10-proteomics-fabricated.csv',               'proteomics'],
  ['DS11', '11-rnaseq-multicondition.csv',               'genomics'],
  ['DS12a','12a-uniform-mixture-clean.csv',              'general'],
  ['DS12b','12b-uniform-mixture-fabricated.csv',         'general'],
  ['DS13', '13-vfstest-cellcountest.csv',                'cell_count'],
  ['DS14', '14-crctest-survey.csv',                      'survey'],
  ['DS15', '15-missing-carlisle.csv',                    'general'],
  ['DS16', '16-densitometry-carlisle-overbalanced.csv',  'densitometry'],
  ['DS17', '17-densitometry-carlisle-clean.csv',         'densitometry'],
  ['DS19', '19-inheritance-fabricated.csv',              'general'],
  ['DS20', '20-bimodal-fab.csv',                         'general'],
  ['DS21', '21-localised-ar.csv',                        'general'],
  ['DS22', '22-covariance-block.csv',                    'general'],
];

const TEN_TESTS = [
  // [resultName, displayKey]
  ['Constant-Offset Blocks',         '1.2-ConstOffset'],
  ['Autocorrelation',                '2.1-Autocorr'],
  ['Windowed Autocorrelation',       '2.1b-WindowedAutocorr'],
  ['Runs Test',                      '2.3-Runs'],
  ['Row-Mean Runs',                  '2.4-RowMeanRuns'],
  ['Blocked Mahalanobis',            '2.6b-BlockedMahal'],
  ['LOESS Residual Analysis',        '2.7-LOESS'],
  ['Regional Noise Homogeneity',     '4.2-RegionalNoise'],
  // §4.3 Within-Row Variance — split into global + windowed sub-units below.
  // §1.9 CCC Stage 2 P5 — handled separately below.
];

// ── CSV formatting ──────────────────────────────────────────────────
function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (!isFinite(v) || Number.isNaN(v)) return '';
    return String(v);
  }
  const s = String(v);
  if (s === '') return '';
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function emit(title, header, rows) {
  console.log(`# ${title}`);
  console.log(header.join(','));
  for (const row of rows) console.log(row.map(fmt).join(','));
  console.log('');
}

// ── Mechanism classifier ────────────────────────────────────────────
// Rules (first-match wins, applied to the test-result.description text
// emitted by the engine wrapper or test internals):
//
//   gate-column-relationship: engine condSkip wrapper
//   gate-dataType-skip:       engine dtSkip wrapper (DATATYPE_SKIP[dataType])
//   gate-assay-skip:          engine `assay === "genomics" || "cell_count"` branches
//   gate-applicability-N:     test-internal "Need ≥X cols / rows" or "Insufficient" gates
//   gate-other:               anything else
function classifySkip(desc) {
  if (!desc) return 'gate-other';
  const d = String(desc);
  if (/Not applicable when columns are non-replicates/.test(d)) return 'gate-column-relationship';
  if (/Not applicable to ordinal data/.test(d)) return 'gate-dataType-skip';
  if (/Not applicable to genomics data/.test(d)) return 'gate-assay-skip';
  if (/Not applicable to cell count data/.test(d)) return 'gate-assay-skip';
  if (/Not applicable to .* data/.test(d)) return 'gate-dataType-skip';
  if (/Need\s*[≥\u2265>]/.test(d)) return 'gate-applicability-N';
  if (/Insufficient (data|rows)/.test(d)) return 'gate-applicability-N';
  if (/Only \d+ rows? with/.test(d)) return 'gate-applicability-N';
  if (/Need ≥2 experimental conditions/.test(d)) return 'gate-applicability-N';
  if (/Need ≥2 conditions/.test(d)) return 'gate-applicability-N';
  if (/sequences too short/i.test(d)) return 'gate-applicability-N';
  if (/integer values/.test(d)) return 'gate-applicability-N';
  if (/per-condition sequences too short/i.test(d)) return 'gate-applicability-N';
  if (/Requires row-level condition labels/.test(d)) return 'gate-applicability-N';
  if (/scan/i.test(d) && /window/i.test(d)) return 'gate-applicability-N';
  return 'gate-other';
}

// ── Per-fixture extraction ─────────────────────────────────────────
const rowsSec1 = [];
const rowsSec2 = [];
const missing = [];

const ds11Annotations = []; // flat strings collected for prose annotation

for (const [fid, file, assay] of FIXTURE_LIST) {
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

  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });

  const vst = detectVST(matrix, assay);
  // Mirrors validate-batch.mjs ternary (genomics → continuous, parked #13).
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');

  // ── §2: detectLongFormat() probe ──
  // Called on the same (headers, dataRows) form ImportView/BatchView use:
  // pre-pivot, post-preprocessing. detectLongFormat returns a candidates
  // object or null; no reason string is exposed → reported `missing-reason`.
  const lfDet = detectLongFormat(headers, data);
  rowsSec2.push([fid, lfDet ? 'true' : 'false', 'missing-reason']);
  if (!('reason' in (lfDet || {}))) {
    // Recorded once per fixture in missing-fields if not already.
    missing.push(['detectLongFormat', 'reason', fid]);
  }

  // ── §1: Engine run ──
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType
  );

  const byName = name => results.find(r => r.name === name);

  // 8 standalone tests
  for (const [testName, displayKey] of TEN_TESTS) {
    const r = byName(testName);
    let ran, naReason, mechanism;
    if (!r) {
      ran = 'false';
      naReason = 'engine-result-absent';
      mechanism = 'gate-other';
      missing.push([testName, 'result-object', fid]);
    } else if (r.flag === 'N/A') {
      ran = 'false';
      naReason = r.description || '';
      mechanism = classifySkip(r.description);
    } else if (r.flag === 'ERROR') {
      ran = 'false';
      naReason = `error: ${r.description || ''}`;
      mechanism = 'gate-other';
    } else {
      ran = 'true';
      naReason = '';
      mechanism = 'ran-no-gate';
    }
    rowsSec1.push([fid, displayKey, ran, naReason, mechanism]);

    // DS11 routing annotation: capture which of the 10 tests would hit
    // gate-assay-skip via the Node batch (genomics → continuous fallthrough,
    // parked #13). Browser routing is identical for these tests because the
    // `assay === "genomics"` checks are wrapper-level (not dataType-driven).
    if (fid === 'DS11' && r && r.flag === 'N/A' && /Not applicable to genomics data/.test(r.description || '')) {
      ds11Annotations.push(`${displayKey}: gate-assay-skip via assay==='genomics' wrapper`);
    }
  }

  // §4.3 Within-Row Variance — global + windowed split.
  {
    const r = byName('Within-Row Variance');
    if (!r || r.flag === 'N/A' || r.flag === 'ERROR') {
      const ran = 'false';
      const naReason = r ? (r.description || '') : 'engine-result-absent';
      const mechanism = r ? classifySkip(r.description) : 'gate-other';
      rowsSec1.push([fid, '4.3-global',   ran, naReason, mechanism]);
      rowsSec1.push([fid, '4.3-windowed', ran, naReason, mechanism]);
    } else {
      // Both sub-units ran when the test ran. Engine doesn't expose a per-
      // sub-unit applicability gate; the whole-test gates above (≥3 cols,
      // ≥40 rows) cover both. Report `ran-no-gate` for both, surfacing
      // windowSigCount/windowScanP/globalP for the windowed sub-unit isn't
      // requested by the spec (Section 1 columns are the 5 fixed ones).
      rowsSec1.push([fid, '4.3-global',   'true', '', 'ran-no-gate']);
      rowsSec1.push([fid, '4.3-windowed', 'true', '', 'ran-no-gate']);
      // Confirm the windowed sub-unit fields are accessible — log to missing
      // if the test result drops them in any future regression.
      if (r.windowScanP === undefined) missing.push(['Within-Row Variance', 'windowScanP', fid]);
      if (r.windowSigCount === undefined) missing.push(['Within-Row Variance', 'windowSigCount', fid]);
      if (r.globalP === undefined) missing.push(['Within-Row Variance', 'globalP', fid]);
    }
  }

  // §1.9 Cross-Condition Consistency — Stage 2 P5 (Residual lag-1 AC) row.
  // Walk r.details for property === "Residual lag-1 AC". A unit is "ran"
  // iff `unit.ran === true`. If no P5 unit ran (all degenerate / below
  // applicability) → gate-applicability-N. If the entire CCC test was N/A
  // upstream → carry that mechanism.
  {
    const r = byName('Cross-Condition Consistency');
    if (!r || r.flag === 'N/A' || r.flag === 'ERROR') {
      const ran = 'false';
      const naReason = r ? (r.description || '') : 'engine-result-absent';
      const mechanism = r ? classifySkip(r.description) : 'gate-other';
      rowsSec1.push([fid, '1.9-P5-residAC', ran, naReason, mechanism]);
    } else {
      const p5Units = (r.details || []).filter(d => d && d.property === 'Residual lag-1 AC');
      if (!p5Units.length) {
        rowsSec1.push([fid, '1.9-P5-residAC', 'false', 'no-P5-units-emitted', 'gate-other']);
        missing.push(['Cross-Condition Consistency', 'P5-units', fid]);
      } else {
        const ranUnits = p5Units.filter(u => u.ran === true);
        if (!ranUnits.length) {
          // All P5 units below applicability (minN=50) or degenerate.
          const reasons = [...new Set(p5Units.map(u => u.reason).filter(Boolean))];
          const naReason = reasons.length ? reasons.join(' | ') : 'all-P5-units-skipped';
          rowsSec1.push([fid, '1.9-P5-residAC', 'false', naReason, 'gate-applicability-N']);
        } else {
          rowsSec1.push([fid, '1.9-P5-residAC', 'true', '', 'ran-no-gate']);
        }
      }
    }
  }
}

// ── §1 ──
emit(
  'Section 1 — Per-fixture × per-test skip audit',
  ['fixture', 'test', 'ran', 'naReason', 'mechanism'],
  rowsSec1,
);

// ── §2 ──
emit(
  'Section 2 — detectLongFormat() per fixture',
  ['fixture', 'detectedLongFormat', 'detectorReason'],
  rowsSec2,
);

// ── §3 — Row-index usage grep ───────────────────────────────────────
// Static enumeration drawn from CLAUDE.md + the four grep patterns
// invoked at script-write time. Excludes the 10 tests already in §1
// (Constant-Offset, Autocorrelation, Windowed Autocorrelation, Runs Test,
// Row-Mean Runs, Blocked Mahalanobis, LOESS Residual Analysis,
// Regional Noise, Within-Row Variance, CCC P5).
//
// Risk classes per spec:
//   known-benign     — position-invariant once row set is fixed
//   known-dependent  — row-position dependent in implementation but the
//                      property tested is row-order invariant, OR test
//                      was never row-order safe by design
//   unknown-unknown  — flag for Chat review
const sec3 = [
  // IRC windowed scan — per-pair sliding window over row order with
  // Fisher-Yates row-shuffle permutation null. The pair-level Pearson r
  // (winsorized) over the full series is row-order invariant; the
  // windowed scan is NOT.
  ['src/tests/interReplicateCorrelation.js:166-256',
   'IRC windowed scan',
   'sliding window over row order + row-shuffle permutation null on max windowed r-excess',
   'unknown-unknown'],

  // DupDet block-copy detector — h-row consecutive hash matching.
  // Row hashing per spec is known-benign; the consecutive-row block scan
  // built on top is row-position dependent (block-copy fabrication is
  // itself a row-position phenomenon, but the test would silently miss
  // real copy-paste under arbitrary row order).
  ['src/tests/duplicateDetection.js:342-410',
   'DupDet block-copy detector',
   'hashes h consecutive rows, groups starting positions by hash key — finds adjacent block copies',
   'unknown-unknown'],

  // MissingDataPattern _scanBlocks — rectangular contiguous-row missing
  // block detector with Bonferroni MCAR p-value. Inherently row-position
  // dependent; spatial clustering is the entire forensic target.
  ['src/tests/missingDataPattern.js:253-322',
   'MDP _scanBlocks',
   'scans for h-consecutive-row × w-column all-missing rectangles, Bonferroni p under MCAR',
   'unknown-unknown'],

  // MeanVariance Cochran-Q block split — sortedIdx is row index
  // sorted by logM (mean), not by raw row index. Row-order invariant.
  ['src/tests/meanVariance.js:61-103',
   'MeanVariance Cochran-Q blocks',
   'splits rows into blocks SORTED BY logM (mean) — block identity invariant under row reordering',
   'known-dependent'],

  // Mahalanobis pooled D² — per-row D² depends on cell values only;
  // per-row classification is row-position invariant.
  ['src/tests/mahalanobis.js:168-173',
   'Mahalanobis row outlier',
   '`rowIdx: validIdx[i]` is just row LABEL carried for display; D² computed from cell values',
   'known-benign'],

  // RSC overlap detection — top-K rows by abs residual + Spearman over
  // residual values. Row identity matters (which rows have largest
  // residuals); row position does not.
  ['src/tests/residualSpikeCorrelation.js:140-175',
   'RSC overlap + Spearman',
   'top-K row-set intersection + Spearman on residual VALUES — row-set identity, not row position',
   'known-benign'],

  // CUSUM (used only by LOESS, which is in §1).
  ['src/stats/primitives.js:43-57',
   'cusumStat helper',
   'cumulative sum over values in input order — only caller is LOESS Residual Analysis (in §1)',
   'known-benign'],

  // Kurtosis row-subsample shuffle — shuffles `validRowIdxs` to draw
  // a sub-sample for the simulation null. Operates on row IDENTITIES,
  // not on row order; the kurtosis statistic itself is invariant under
  // permutation of its inputs.
  ['src/tests/kurtosis.js:122-131',
   'Kurtosis sub-sample shuffle',
   'Fisher-Yates sub-samples row IDs into MAX_SIM_ROWS — kurtosis invariant under input permutation',
   'known-benign'],

  // CCC permutation engine (Stages 1/2/3) — shuffles rows across
  // condition labels; the per-row tuples (cells, residuals, mvslope
  // pair) are pre-computed and row-order independent. Permutation
  // tests row labels, not row positions within the matrix.
  ['src/tests/crossConditionConsistency.js:266-470',
   'CCC permutation engine',
   'pre-computes per-row tuples then Fisher-Yates shuffles ROW LABELS across conditions — row-order invariant',
   'known-benign'],
];

emit(
  'Section 3 — Row-index usage grep (excludes the 10 tests in §1)',
  ['fileLine', 'testOrHelper', 'usagePattern', 'riskClass'],
  sec3,
);

// ── §4 — IRC bracket-strip prose ────────────────────────────────────
console.log('# Section 4 — HotspotExcerpt IRC bracket-strip audit');
console.log('');
console.log('(a) Location:');
console.log('    src/components/views/HotspotExcerpt.jsx:25-170 — IrcBracketStrip');
console.log('       component definition (BRACKET_BASE_H / BRACKET_ROW_H constants,');
console.log('       assignBracketRows helper, IrcBracketStrip render + measurement);');
console.log('    src/components/views/HotspotExcerpt.jsx:816-823 — commented-out');
console.log('       JSX render call inside the data-table flex container.');
console.log('');
console.log('(b) What the bracket strip does:');
console.log('    Renders U-shaped SVG brackets above the data table that span');
console.log('    pairs of replicate columns identified as "elevated" by the IRC');
console.log('    highlight spec (`spec.brackets`). Each bracket connects two');
console.log('    column centres (viStart / viEnd) with vertical drop-ticks and a');
console.log('    horizontal top bar; a centred mono-font label sits inside the U.');
console.log('    Multi-bracket layout uses assignBracketRows() to stack non-');
console.log('    overlapping brackets vertically (BRACKET_ROW_H = 16px per row,');
console.log('    BRACKET_BASE_H = 24px). Column-centre x-coords are DOM-measured');
console.log('    from the rendered <th> letter row via getBoundingClientRect; the');
console.log('    strip syncs horizontal scroll with the table. Brackets sit ABOVE');
console.log('    the table header and push the minimap down by stripH (notified');
console.log('    via onHeightChange → setBracketH at HotspotExcerpt.jsx:509,806).');
console.log('    The strip strips/removes nothing FROM the table — it overlays');
console.log('    column-pair connectors. It does NOT depend on row order: every');
console.log('    bracket spans columns, not rows.');
console.log('');
console.log('(c) Inline rationale (HotspotExcerpt.jsx:816-819):');
console.log('    "IRC pair brackets — disabled until long-format handling is');
console.log('     implemented. On stacked-condition datasets, IRC treats all');
console.log('     replicate columns as independent, producing dozens of pairwise');
console.log('     brackets that stack vertically and push the minimap off-screen.');
console.log('     Revisit when multi-measure long-format pivot lands (see');
console.log('     STATUS.md parked #7)."');
console.log('    Note: the comment references parked #7 (Excel forensics, v1.1)');
console.log('    but the actual blocker tracked in STATUS.md is parked #8 (IRC');
console.log('    bracket strip re-enable, gated on Track H long-format fix).');
console.log('    Cross-reference is stale — same blocker, wrong parked-item');
console.log('    number. Worth a one-character edit when re-enabling.');
console.log('');
console.log('(d) Signals a `rowOrder` flag would need to expose for safe');
console.log('    re-enable:');
console.log('    The bracket strip itself is row-order INVARIANT (it draws over');
console.log('    columns). The disable rationale targets a DIFFERENT failure mode:');
console.log('    long-format datasets pivoted into wide-format produce many pseudo-');
console.log('    replicate columns (one per condition value) that IRC treats as');
console.log('    independent replicate columns, generating O(n²) elevated pairs.');
console.log('    The required signals are therefore column-semantics rather than');
console.log('    row-order:');
console.log('      1. Pivot provenance flag (is this matrix the result of a');
console.log('         long-format pivot? — already partially threaded as');
console.log('         `opts.isPivoted` in engine.js:437 → Selective Noise note).');
console.log('         Propagate to the IRC card display layer + spec.brackets.');
console.log('      2. Per-column "group" identity, so');
console.log('         the bracket builder can suppress cross-condition pairs and');
console.log('         restrict to within-group pairs only (already available');
console.log('         via condCtx.slices() / wrColGroup at engine.js:256-264).');
console.log('      3. A bracket-count cap or "collapse to top-K" rule for high-');
console.log('         cardinality wide matrices, so even legitimate wide-format');
console.log('         experiments with many true replicates do not push the');
console.log('         minimap off-screen.');
console.log('    A `rowOrder` flag is NOT one of them — that flag belongs to the');
console.log('    8 row-order-dependent tests in §1, not to the bracket strip.');
console.log('');

// ── DS11 routing annotation prose ──
if (ds11Annotations.length) {
  console.log('# DS11 routing annotation');
  console.log(`assay='genomics', dataType (Node batch ternary)='continuous' (parked #13).`);
  console.log('Tests in the 10-test list that hit gate-assay-skip via the');
  console.log("`assay === 'genomics'` wrapper (engine.js wrappers, identical");
  console.log('routing in browser runtime — wrapper checks `assay`, not `dataType`):');
  for (const a of ds11Annotations) console.log(`  - ${a}`);
  console.log('');
}

// ── Missing fields block ────────────────────────────────────────────
if (missing.length) {
  const grouped = new Map();
  for (const [test, field, fixture] of missing) {
    const key = `${test}::${field}`;
    if (!grouped.has(key)) grouped.set(key, { test, field, fixtures: [] });
    grouped.get(key).fixtures.push(fixture);
  }
  console.log('### Missing fields');
  for (const { test, field, fixtures } of grouped.values()) {
    console.log(`${test}, ${field}, ${[...new Set(fixtures)].join('|')}`);
  }
}

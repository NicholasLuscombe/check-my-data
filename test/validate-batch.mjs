// Quick Node.js batch validation — checks all 17 CSV datasets produce expected severity scores.
// Polyfills browser APIs that the analysis engine uses.
//
// PERF=1 mode: in addition to severity validation, records per-test
// wallclock per fixture (from engine.js's PERF instrument) and Blocked
// Mahalanobis exceedance metadata (from blockedMahalanobis.js's
// _perfExceedances field). Prints per-test totals sorted descending, the
// per-fixture × per-test matrix for the three heaviest fixtures, and a BM
// parity table for DS21/DS22/DS15. Writes a JSON sidecar at
// test/perf-out/<label>.json (label defaults to git SHA, override with
// PERF_LABEL=<name>) so PRE/POST runs can be diffed offline.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Polyfill requestAnimationFrame for Node.js
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Dynamic imports
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');

const FIXTURES = 'test/fixtures';
const EXPECTED = {
  '01-densitometry-clean.csv':    { severity: 0, assay: 'densitometry' },  // clean-fixture severity 0 post-S109 directional suppression; S82 Kurtosis borderline flip reverted
  '02-densitometry-fabricated.csv': { severity: 3, assay: 'densitometry', flags: {
    'Inter-Replicate Correlation': ['MODERATE', 'HIGH'],   // rescaled-copy near-linear replicate dep.
    'Residual Spike Correlation':  ['MODERATE', 'HIGH'],   // FISHER_EXEMPT, shared row-noise across cond
    'Autocorrelation':             ['MODERATE', 'HIGH'],   // near-linear serial structure (lag-1)
    'Runs Test':                   ['MODERATE', 'HIGH'],   // sign-clustering from serial structure
  } },
  '03-qpcr-clean.csv':            { severity: 0, assay: 'qpcr' },
  '04-qpcr-fabricated.csv':       { severity: 3, assay: 'qpcr', flags: {
    'Terminal Digit Uniformity':    ['HIGH'],                // p≈4.5e-7; GT-named target (S183 Phase 2)
    'Exact Duplicate Detection':    ['HIGH'],                // p≈1.7e-6; repeated-digit/value mechanism
    'Value-Frequency Spike':        ['MODERATE', 'HIGH'],    // p≈1e-3; repeated-value concentration near MOD/HIGH boundary
  } },
  '05-cellcount-clean.csv':       { severity: 0, assay: 'cell_count' },  // GT revised to 0 at S95 (DupDet 4-way BH-FDR fix); EXPECTED alignment deferred to S109.6
  '06-cellcount-fabricated.csv':  { severity: 3, assay: 'cell_count', flags: {
    'Noise Scaling With Measurement Size': ['HIGH'],         // p≈1.5e-5; Poisson-variance violation (slope 0.12 vs 1.0); VST-legitimacy detector on raw input (S183 Phase 2)
    'Exact Duplicate Detection':           ['HIGH'],         // p≈5.7e-25
    'Value-Frequency Spike':               ['MODERATE', 'HIGH'], // p≈9.5e-3; near MOD/HIGH boundary
  } },
  '07-elisa-clean.csv':           { severity: 0, assay: 'elisa' },
  '08-elisa-fabricated.csv':      { severity: 3, assay: 'elisa', flags: {
    'Selective Noise Partitioning':  ['MODERATE', 'HIGH'], // plate-localised noise reduction direct readout
    'LOESS Residual Analysis':       ['MODERATE', 'HIGH'], // CUSUM changepoint row 32, smoother window 37–56
    'Inter-Replicate Correlation':   ['MODERATE', 'HIGH'], // multiplicative offset inflates within-pair r
    'Constant-Offset Blocks':        ['MODERATE', 'HIGH'], // multiplicative offset → additive under log
    "Benford's Law (First Digit)":   ['HIGH'],             // primaryP≈0; leading-1 deficit, see GT S182
  } },
  '09-proteomics-clean.csv':      { severity: 0, assay: 'proteomics' },
  '10-proteomics-fabricated.csv': { severity: 3, assay: 'proteomics', flags: {
    'Column Goodness-of-Fit':       ['MODERATE', 'HIGH'],   // S176 anchor MOD, AD ratio 105×
    "Benford's Law (Second Digit)": ['HIGH'],               // p≈0; planted 2nd-digit avoidance of 0 (METHODOLOGY §1103) (S183 Phase 2)
    'Exact Duplicate Detection':    ['HIGH'],               // p≈0
    'LOESS Residual Analysis':      ['MODERATE', 'HIGH'],   // p≈2e-3; CUSUM CP at row 159 = fab onset; survives MOD on both per-condition slices (S183)
    'Regional Noise Homogeneity':   ['MODERATE', 'HIGH'],   // p≈4e-3; bestWindow inside fab range, both per-slice runs localise to fab P0080–P0120 (S183)
  } },
  '11-rnaseq-multicondition.csv': { severity: 3, assay: 'genomics', flags: {
    'Autocorrelation':              ['HIGH'],                    // p≈0 self-gating canonical positive
    'Residual Spike Correlation':   ['MODERATE', 'HIGH'],        // RSC MOD on shared row-noise across cond
    "Benford's Law (Second Digit)": ['HIGH'],                    // p≈0; GT-named severity-load-bearing HIGH (METHODOLOGY §1103) (S183 Phase 2)
  } },
  '12a-uniform-mixture-clean.csv':      { severity: 0, assay: 'general' },
  '12b-uniform-mixture-fabricated.csv':  { severity: 1, assay: 'general', flags: {
    'LOESS Residual Analysis': ['MODERATE', 'HIGH'],       // CUSUM changepoint row 196 = Genuine/Fabricated boundary
  } },
  '13-vfstest-cellcountest.csv':  { severity: 2, assay: 'cell_count', flags: {
    'Value-Frequency Spike':       ['HIGH'],                     // p≈1.6e-6; VFS sensitivity-fixture target (S183 Phase 2)
  } },
  // S172 methodology call: single-mechanism (copy-paste dup rows), single
  // flagged dim (DupDet HIGH); WRV redundant non-independent signal, correctly
  // N/A on ordinal. See TEST-GROUND-TRUTH DS14.
  '14-crctest-survey.csv':        { severity: 2, assay: 'survey', flags: {
    'Exact Duplicate Detection': ['HIGH'],                 // primaryP≈0; 27 constant-across-item copy-paste rows
  } },
  '15-missing-carlisle.csv':      { severity: 3, assay: 'general', flags: {
    'Missing Data Pattern':         ['HIGH'],                 // GT line 29, structural HIGH
    'Blocked Mahalanobis':          ['MODERATE', 'HIGH'],     // FISHER_EXEMPT → widened
    'Cross-Condition Consistency':  ['MODERATE', 'HIGH'],     // p≈9e-3; GT-named severity channel (S182), declared S183 Phase 2
    // Baseline Balance retracted post-Phase 0: GT composes DS15 severity as
    // Missing Data + Blocked Mahalanobis + Cross-Condition Consistency (S182
    // attribution correction; Excess Kurtosis is LOW/informational, not a
    // severity channel). Baseline Balance LOW here is correct engine
    // behaviour. Its real positive anchor is DS16.
  } },
  '16-densitometry-carlisle-overbalanced.csv': { severity: 2, assay: 'densitometry', flags: {
    'Baseline Balance':           ['MODERATE', 'HIGH'],     // GT line 30, pure Carlisle over-balancing
  } },
  '17-densitometry-carlisle-clean.csv':        { severity: 0, assay: 'densitometry' },
  // DS19: inheritance fabrication calibration fixture (S98 Part B).
  // Pre-S99: severity 0 (direction-blind gate demoted the forensic-similar
  // signal on P3 KS). S99 fix (per-direction similarity gate at R=0.5) lifts
  // Cross-Cond Consistency to MODERATE (primaryP=0.006) → severity 1.
  // S107: Column GoF landed; col1 shape mismatch flagged MODERATE (A² ratio 5.01
  // against moment-matched Normal at N=1200, direction "high"). Two MOD flags
  // across two families → severity 3.
  //
  // S179 A1: GoF MODERATE on DS19 was a condition-pooling artifact (item 29).
  // GoF dispatched as a bare full-matrix call fit one distribution to the
  // pooled Control+Treatment `value` column; Treatment = Control + σ=0.02·MAD
  // jitter made the mixture ECDF spike on near-duplicates while each
  // condition alone is clean. A1 routes the trio per-condition via
  // aggregatePerGroup(condCtx.rowGroups()); GoF now fits the 600-row Control
  // and 600-row Treatment slices independently, each clean (LOW, p=0.078
  // post-fix). Cross-Cond Consistency Stage 1 — per-condition by construction,
  // the genuine inheritance detector — remains sole real channel (MOD),
  // returning DS19 to the single-channel ceiling of 1. See GT line 32 + Accepted
  // deltas (S179) and SESSION179-SUMMARY.md.
  '19-inheritance-fabricated.csv': { severity: 1, assay: 'general', flags: {
    'Cross-Condition Consistency': ['MODERATE', 'HIGH'],    // GT line 32, the real channel
  } },
  // S108 new fixtures (fixture-gen workstream):
  // DS20: bimodal-fab gradient. Modality is structurally un-exerciseable on
  //   DS20 at N=300 — the γ₂ pre-skip × dip-magnitude gate at the v2 mixture
  //   separations holds it at LOW. Not a routing artefact; per-condition
  //   routing leaves it unchanged. No positive-anchor fixture for Modality
  //   exists in the current suite. Expected severity 3 lands via Column GoF
  //   (Dim V, the live primary channel — DS20 MOD per-condition) plus Dim III
  //   collateral (Selective Noise, Autocorrelation).
  '20-bimodal-fab.csv': { severity: 3, assay: 'general', flags: {
    'Column Goodness-of-Fit':         ['MODERATE', 'HIGH'],   // GT line 33, calibration gradient cols 4–7
    'Selective Noise Partitioning':   ['HIGH'],               // p≈0; GT-named Dim III collateral (S183 Phase 2)
    'Autocorrelation':                ['MODERATE', 'HIGH'],   // p≈1.7e-3; GT-named Dim III collateral, near MOD/HIGH boundary (S183)
  } },
  // DS21: localised AR(1) in Control only. Primary targets Windowed Autocorr
  //   (Dim III) + Cross-Cond Consistency Stage 2 (Dim IV).
  //   S111 — signed-data gate on detectVST reroutes DS21 (posFrac 50.2%,
  //   negFrac 49.8%) from log to raw. Under raw: 4× HIGH (Blocked Mahal,
  //   Autocorrelation, Runs, Row-Mean Runs) + Regional Noise MOD converge
  //   from real AR-injection drivers. Previous Kurtosis HIGH (VST-induced
  //   artefact on positive-half log-transformed cells) drops to LOW.
  //   Severity 2 → 3 per S111 Phase 2 forecast; GT entry updated.
  '21-localised-ar.csv': { severity: 3, assay: 'general', flags: {
    'Autocorrelation':            ['HIGH'],                  // lag-1 HIGH p=2.5e-8, rock-solid
    'Runs Test':                  ['MODERATE', 'HIGH'],      // HIGH p=0.0004, widened (near HIGH/MOD line)
    'Row-Mean Runs':              ['MODERATE', 'HIGH'],      // HIGH p=0.0007, widened
    'Blocked Mahalanobis':        ['MODERATE', 'HIGH'],      // HIGH, FISHER_EXEMPT → widened
    'Regional Noise Homogeneity': ['MODERATE', 'HIGH'],      // MOD p=0.002
  } },
  // DS22: covariance-block fabrication. S111 — signed-data gate reroutes
  //   DS22 (posFrac 50.5%, negFrac 49.5%) from log to raw, matching §2.6b's
  //   raw-diagnostic output. Severity held at 2; attribution restructured
  //   from VST-induced Kurtosis HIGH single-channel to Runs HIGH + Blocked
  //   Mahalanobis MOD + Autocorrelation MOD convergent. Blocked Mahal
  //   attribution gap (S110 parked) cleared; K/N=0.15 detection ceiling
  //   holds per METHODOLOGY §2.6b.
  '22-covariance-block.csv': { severity: 2, assay: 'general', flags: {
    'Runs Test':                  ['MODERATE', 'HIGH'],     // HIGH p=0.0002, widened
    'Blocked Mahalanobis':        ['MODERATE', 'HIGH'],     // MOD, FISHER_EXEMPT → widened
    'Autocorrelation':            ['MODERATE', 'HIGH'],     // MOD p=0.0012
  } },
};

// S183 Phase 2 — adjudicated incidental firings. A MOD/HIGH result that is
// genuine (real anomaly, not a false positive) but downstream of a primary
// channel rather than the GT-named target lives here with a short reason.
// The completeness gate counts entries here as accounted, so the gate does
// not trip on a known-and-explained side-effect firing. New entries require
// an adjudication record in the session log naming the primary channel
// that the firing is downstream of.
const ACKNOWLEDGED = {
  '06-cellcount-fabricated.csv': {
    'Mahalanobis Row Outlier': "incidental 1-row outlier downstream of the Poisson-variance manipulation; primary channel is Noise Scaling (S183 Phase 2)",
  },
  '08-elisa-fabricated.csv': {
    'Mahalanobis Row Outlier': "incidental 1-row outlier downstream of the localised noise suppression; primary channels SNP/LOESS/IRC/Const-Offset/Benford (S182 disposition, recorded S183 Phase 2)",
  },
};

const PERF = process.env.PERF === '1';
const PERF_LABEL = process.env.PERF_LABEL || null;
const perfPerFixture = PERF ? {} : null;
const batchStart = PERF ? performance.now() : 0;

let passed = 0, failed = 0, pending = 0;

for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;

  // Preprocess: trim, remove empty columns, etc.
  const pp = preprocessRaw(raw);
  raw = pp.rows;

  // Detect headers
  const headerRows = detectHeaderRows(raw);

  // Forward-fill the condition row for two-row headers
  let condPerCol = null;
  if (headerRows >= 2) {
    condPerCol = forwardFill(raw[0]);
  }
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);

  // Infer roles — inferRoles(data, headers, condPerCol)
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;

  // Extract inputs (includes condCtx)
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false
  });

  // Detect VST
  const vst = detectVST(matrix, assay);

  // Determine data type via the canonical resolver (S172). Prior to S172 this
  // was a hand-rolled ternary that emitted 'survey' for the survey assay; the
  // UI / BatchView path used ASSAY_DATATYPE_MAP which emits 'ordinal'. The
  // divergence bypassed DATATYPE_SKIP['ordinal'] in the harness only, running
  // 11 extra tests on DS14 and lifting batch severity 2 → 3.
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';

  // S118 Track H — Row Semantics Gate. Auto-suggest from detectLongFormat()
  // (long-format detection on raw post-preprocessing rows, mirroring the UI
  // path) and assay. Batch mode default is 'ordered'; the UI prompts the
  // user when neither signal resolves (general / proteomics / survey on
  // wide-format input). Conservative default keeps sequential tests live
  // unless detection succeeds.
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';

  // Run analysis
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );

  // Compute severity
  const { severity } = computeSeverity(results);

  // S177 Phase 0 — per-test flag assertion (positives-only cells declared in
  // EXPECTED[file].flags). Allow-set semantics: each entry is the set of
  // tier strings the test's r.flag must land in; HIGH|MODERATE|LOW|N/A
  // (the producer vocabulary — no CLEAR / N-A). Declared cells are
  // ground-truth-derived (TEST-GROUND-TRUTH.md), not snapshotted from
  // output. A non-resolving key (typo or producer rename) silently never
  // asserts; the bind-at-source name binding above guards against that.
  const cellMisses = [];
  if (expected.flags) {
    const resultsByName = new Map(results.map(r => [r.name, r]));
    for (const [name, allow] of Object.entries(expected.flags)) {
      const r = resultsByName.get(name);
      if (!r) {
        cellMisses.push(`${name}: result not present (unresolved name binding?)`);
      } else if (!allow.includes(r.flag)) {
        cellMisses.push(`${name}: got ${r.flag}, expected ∈ [${allow.join(', ')}]`);
      }
    }
  }
  const cellsOk = cellMisses.length === 0;

  // S183 Phase 2 — completeness gate. The allow-set check above catches a
  // declared channel that goes quiet or fires the wrong tier; this gate
  // catches the other half — a MOD/HIGH firing that no cell or
  // ACKNOWLEDGED entry accounts for. On a positive fixture (severity ≥ 1)
  // every MOD/HIGH must be in expected.flags (tier-asserted) or
  // ACKNOWLEDGED[file] (named-and-reasoned). On a clean fixture
  // (severity === 0) any MOD/HIGH is a false positive.
  const ackForFile = ACKNOWLEDGED[file] || {};
  const firingNames = results
    .filter(r => r.flag === 'MODERATE' || r.flag === 'HIGH')
    .map(r => r.name);
  const completenessMisses = [];
  if (expected.severity === 0) {
    if (firingNames.length > 0) {
      completenessMisses.push(`clean fixture fired ${firingNames.join(', ')} — false positive`);
    }
  } else {
    const accountedNames = new Set([
      ...Object.keys(expected.flags || {}),
      ...Object.keys(ackForFile),
    ]);
    const undeclared = firingNames.filter(n => !accountedNames.has(n));
    if (undeclared.length > 0) {
      completenessMisses.push(`undeclared MOD/HIGH firing(s): ${undeclared.join(', ')} — declare a cell in expected.flags or add to ACKNOWLEDGED with a reason`);
    }
  }
  const completenessOk = completenessMisses.length === 0;

  const ok = severity === expected.severity && cellsOk && completenessOk;
  const flags = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => `${r.name}:${r.flag}`).join(', ');
  if (expected.pending) {
    // Pending-verification lane: fabricated fixture with no applicable active
    // test yet. Report status but don't count as pass/fail.
    console.log(`◦ ${file}: severity=${severity} (pending — ${expected.pendingNote})${flags ? ' [' + flags + ']' : ''}`);
    pending++;
  } else {
    const mark = ok ? '✓' : '✗';
    const sevSuffix = severity === expected.severity ? '' : ` (expected=${expected.severity})`;
    const sevLine = `${mark} ${file}: severity=${severity}${sevSuffix}${!ok && flags ? ' [' + flags + ']' : ''}`;
    console.log(sevLine);
    if (!cellsOk) {
      for (const m of cellMisses) console.log(`    ↳ per-test miss — ${m}`);
    }
    if (!completenessOk) {
      for (const m of completenessMisses) console.log(`    ↳ completeness gate — ${m}`);
    }
    if (ok) passed++; else failed++;
  }

  if (PERF) {
    const timings = results._perfTimings || [];
    const bm = results.find(r => r.name === 'Blocked Mahalanobis');
    const bmExceed = bm && bm._perfExceedances ? bm._perfExceedances : null;
    let bmPrimaryExceed = null;
    if (bmExceed && bmExceed.length) {
      // Primary unit = arg-min(adjP); if ties, the lowest-index unit wins
      // (Math.min behaviour). We mirror that with reduce for an explicit
      // tie-break.
      const primary = bmExceed.reduce((best, u) => (u.adjP < best.adjP ? u : best), bmExceed[0]);
      bmPrimaryExceed = { ...primary };
    }
    perfPerFixture[file] = {
      timings,
      bmPrimaryP: bm ? bm.primaryP : null,
      bmFlag: bm ? bm.flag : null,
      bmNPerm: bm ? bm.nPerm : null,
      bmExceedances: bmExceed,
      bmPrimaryExceed,
    };
  }
}

// ── S181 — DS01 cross-shape invariance (long-form with conditions) ──────
// Active assertion (replaces the S177 Phase 0 pending block). What this
// proves: when DS01's DATA cells are pooled into ONE data column but
// presented WITH a row-level condition column, A1's per-condition routing
// (engine.js trio dispatch via condCtx.rowGroups()) lands the distribution-
// shape trio on each condition slice independently, and every slice
// clears — Column Goodness-of-Fit, Entropy / Zipf Analysis, Modality Test
// each ∈ {N/A, LOW} at the aggregate. CLEAR = {N/A, LOW}, not "LOW only":
// the Inhibitor_B slice trips the §3.7 |γ₁| > 1.5 family pre-skip on this
// fixture (lowest-base condition, right-tailed log-normal-like residual),
// returning N/A per-column; that is a passing applicability outcome, not
// a failure.
//
// Contrast (not asserted, kept as comment to ground the test's purpose):
// the SAME pool with NO condition column (an unlabelled mixture) fires
// GoF MODERATE p≈0.004 — that is correct behaviour, not a defect to
// suppress, because an unlabelled multi-condition mixture genuinely is
// wrong-shape against any single-family fit. The shape-invariance
// property this assertion guards is: presenting the mixture WITH its
// conditions, the engine's per-condition routing absorbs the
// between-condition mean differences and the trio fits within-condition
// shape only. Regression target: a future change that bypasses A1
// (e.g. a refactor that drops the rowGroups() guard or routes the trio
// pooled when conditions are present) would break this.
{
  const file = '01-densitometry-clean.csv';
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  const raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let nativeCondPerCol = null;
  if (headerRows >= 2) nativeCondPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const nativeRoles = inferRoles(data, headers, nativeCondPerCol);
  const dataColIdxs = nativeRoles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);

  // Build a long-form 2-col matrix: [value, condLabel] per cell. The
  // condition label comes from the DATA col the cell originated from in
  // the native wide layout.
  const longRows = [];
  for (const row of data) {
    for (const ci of dataColIdxs) {
      const v = row[ci];
      if (v == null || v === '') continue;
      const n = Number(v);
      if (isNaN(n)) continue;
      const condLabel = nativeCondPerCol ? nativeCondPerCol[ci] : null;
      longRows.push([n, condLabel]);
    }
  }

  const longRoles = ['data', 'condition'];
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data: longRows, roles: longRoles, condPerCol: null, zeroAsMissing: false,
  });
  const assay = 'densitometry';
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = 'ordered';

  const longResults = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );

  // Precondition: rowGroups() must return 3 groups (the routing surface
  // A1 dispatches through). If it returns null the trio falls back to the
  // pooled full-matrix path and the test loses its meaning.
  const rg = condCtx.rowGroups();
  const rgOk = Array.isArray(rg) && rg.length === 3;

  const trioNames = ['Column Goodness-of-Fit', 'Entropy / Zipf Analysis', 'Modality Test'];
  const allow = ['N/A', 'LOW'];
  const trio = trioNames.map(n => {
    const r = longResults.find(x => x.name === n);
    return r ? { name: n, flag: r.flag } : { name: n, flag: '?' };
  });
  const trioViolations = trio.filter(t => !allow.includes(t.flag));
  const ok = rgOk && trioViolations.length === 0;
  const mark = ok ? '✓' : '✗';
  const trioLine = trio.map(t => `${t.name}:${t.flag}`).join(', ');
  const rgLabel = rgOk
    ? `rowGroups=${rg.map(g => `${g.name}(n=${g.rowIndices.length})`).join(',')}`
    : `rowGroups=${rg === null ? 'null' : (Array.isArray(rg) ? `${rg.length} groups` : 'unexpected')} (expected 3)`;
  console.log(`${mark} ${file} (long-form, ${longRows.length} cells + COND col): ${rgLabel}; trio [${trioLine}]`);
  if (!ok) {
    if (!rgOk) console.log(`    ↳ routing precondition failed — A1 per-condition path not engaged`);
    for (const v of trioViolations) {
      console.log(`    ↳ ${v.name} flag=${v.flag}, expected ∈ [${allow.join(', ')}]`);
    }
  }
  if (ok) passed++; else failed++;
}

const pendingSuffix = pending ? ` (+ ${pending} pending)` : '';
console.log(`\n${passed}/${passed + failed} passed${pendingSuffix}` + (failed ? ` — ${failed} FAILED` : ' — all clear'));

if (PERF) {
  const batchMs = performance.now() - batchStart;
  let sha = 'unknown';
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {}
  const label = PERF_LABEL || sha;
  const nodeVersion = process.version;
  const platform = `${process.platform} ${process.arch}`;
  const capturedAt = new Date().toISOString();

  // ── Per-test totals across all fixtures, sorted descending ──
  const perTestTotal = {};
  for (const [file, p] of Object.entries(perfPerFixture)) {
    for (const t of p.timings) {
      perTestTotal[t.name] = (perTestTotal[t.name] || 0) + t.ms;
    }
  }
  const perTestRanked = Object.entries(perTestTotal)
    .sort((a, b) => b[1] - a[1])
    .map(([name, ms]) => ({ name, totalMs: ms }));

  // ── Per-fixture totals, sorted descending ──
  const perFixtureTotal = Object.entries(perfPerFixture)
    .map(([file, p]) => ({ file, totalMs: p.timings.reduce((s, t) => s + t.ms, 0) }))
    .sort((a, b) => b.totalMs - a.totalMs);

  console.log('\n── PERF: batch ' + label + ' (' + nodeVersion + ', ' + platform + ') ──');
  console.log(`Total wallclock: ${(batchMs / 1000).toFixed(2)}s`);
  console.log('\nPer-test totals across 22 fixtures (ms, descending):');
  for (const t of perTestRanked) {
    console.log(`  ${t.totalMs.toFixed(0).padStart(8)}  ${t.name}`);
  }
  console.log('\nPer-fixture totals (ms, descending):');
  for (const f of perFixtureTotal) {
    console.log(`  ${f.totalMs.toFixed(0).padStart(8)}  ${f.file}`);
  }
  console.log('\nBM parity (DS21/DS22/DS15):');
  for (const file of ['21-localised-ar.csv', '22-covariance-block.csv', '15-missing-carlisle.csv']) {
    const p = perfPerFixture[file];
    if (!p) { console.log(`  ${file}: not in batch`); continue; }
    const bmT = p.timings.find(t => t.name === 'Blocked Mahalanobis');
    const exc = p.bmPrimaryExceed
      ? `pass=${p.bmPrimaryExceed.pass} cond=${p.bmPrimaryExceed.condition} exceed=${p.bmPrimaryExceed.exceed} rawP=${p.bmPrimaryExceed.rawP.toFixed(6)} adjP=${p.bmPrimaryExceed.adjP.toFixed(6)}`
      : '(none)';
    const totExc = p.bmExceedances ? p.bmExceedances.reduce((s, u) => s + u.exceed, 0) : 0;
    console.log(`  ${file}: BM=${bmT?.ms.toFixed(0)}ms primaryP=${p.bmPrimaryP} flag=${p.bmFlag} nPerm=${p.bmNPerm}`);
    console.log(`    primary: ${exc}`);
    console.log(`    sumExceed across ${p.bmExceedances?.length || 0} units = ${totExc}`);
  }

  // ── Sidecar JSON for offline diff ──
  const outDir = 'test/perf-out';
  try { mkdirSync(outDir, { recursive: true }); } catch {}
  const sidecar = {
    label, sha, nodeVersion, platform, capturedAt,
    batchMs, perTestRanked, perFixtureTotal,
    perFixture: perfPerFixture,
  };
  const outPath = join(outDir, `${label}.json`);
  writeFileSync(outPath, JSON.stringify(sidecar, null, 2));
  console.log(`\nSidecar written: ${outPath}`);
}

process.exit(failed > 0 ? 1 : 0);

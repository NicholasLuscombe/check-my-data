// Quick Node.js batch validation — checks all 17 CSV datasets produce expected severity scores.
// Polyfills browser APIs that the analysis engine uses.
import { readFileSync } from 'fs';
import { join } from 'path';

// Polyfill requestAnimationFrame for Node.js
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Dynamic imports
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { detectAssay } = await import('../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');

const FIXTURES = 'test/fixtures';
const EXPECTED = {
  '01-densitometry-clean.csv':    { severity: 0, assay: 'densitometry' },  // clean-fixture severity 0 post-S109 directional suppression; S82 Kurtosis borderline flip reverted
  '02-densitometry-fabricated.csv': { severity: 3, assay: 'densitometry' },
  '03-qpcr-clean.csv':            { severity: 0, assay: 'qpcr' },
  '04-qpcr-fabricated.csv':       { severity: 3, assay: 'qpcr' },
  '05-cellcount-clean.csv':       { severity: 0, assay: 'cell_count' },  // GT revised to 0 at S95 (DupDet 4-way BH-FDR fix); EXPECTED alignment deferred to S109.6
  '06-cellcount-fabricated.csv':  { severity: 3, assay: 'cell_count' },
  '07-elisa-clean.csv':           { severity: 0, assay: 'elisa' },
  '08-elisa-fabricated.csv':      { severity: 3, assay: 'elisa' },
  '09-proteomics-clean.csv':      { severity: 0, assay: 'proteomics' },
  '10-proteomics-fabricated.csv': { severity: 3, assay: 'proteomics' },
  '11-rnaseq-multicondition.csv': { severity: 3, assay: 'genomics' },
  '12a-uniform-mixture-clean.csv':      { severity: 0, assay: 'general' },
  '12b-uniform-mixture-fabricated.csv':  { severity: 1, assay: 'general' },
  '13-vfstest-cellcountest.csv':  { severity: 2, assay: 'cell_count' },
  '14-crctest-survey.csv':        { severity: 3, assay: 'survey' },
  '15-missing-carlisle.csv':      { severity: 3, assay: 'general' },
  '16-densitometry-carlisle-overbalanced.csv': { severity: 2, assay: 'densitometry' },
  '17-densitometry-carlisle-clean.csv':        { severity: 0, assay: 'densitometry' },
  // DS19: inheritance fabrication calibration fixture (S98 Part B).
  // Pre-S99: severity 0 (direction-blind gate demoted the forensic-similar
  // signal on P3 KS). S99 fix (per-direction similarity gate at R=0.5) lifts
  // Cross-Cond Consistency to MODERATE (primaryP=0.006) → severity 1.
  // S107: Column GoF landed; col1 shape mismatch flags MODERATE (A² ratio 5.01
  // against moment-matched Normal at N=1200, direction "high"). Two MOD flags
  // across two families (Cross-Cond Consistency + Column GoF) → severity 3.
  // This is a sensitivity gain on a fabricated fixture, not a regression.
  '19-inheritance-fabricated.csv': { severity: 3, assay: 'general' },
  // S108 new fixtures (fixture-gen workstream):
  // DS20: bimodal-fab gradient. Primary target Modality; expected severity 3
  //   via cross-dim convergence (Modality + Column GoF + IRC/cross-rep
  //   collateral on Rep1-3 vs Rep4-8 distributional mismatch).
  '20-bimodal-fab.csv': { severity: 3, assay: 'general' },
  // DS21: localised AR(1) in Control only. Primary targets Windowed Autocorr
  //   (Dim III) + Cross-Cond Consistency Stage 2 (Dim IV).
  //   S111 — signed-data gate on detectVST reroutes DS21 (posFrac 50.2%,
  //   negFrac 49.8%) from log to raw. Under raw: 4× HIGH (Blocked Mahal,
  //   Autocorrelation, Runs, Row-Mean Runs) + Regional Noise MOD converge
  //   from real AR-injection drivers. Previous Kurtosis HIGH (VST-induced
  //   artefact on positive-half log-transformed cells) drops to LOW.
  //   Severity 2 → 3 per S111 Phase 2 forecast; GT entry updated.
  '21-localised-ar.csv': { severity: 3, assay: 'general' },
  // DS22: covariance-block fabrication. S111 — signed-data gate reroutes
  //   DS22 (posFrac 50.5%, negFrac 49.5%) from log to raw, matching §2.6b's
  //   raw-diagnostic output. Severity held at 2; attribution restructured
  //   from VST-induced Kurtosis HIGH single-channel to Runs HIGH + Blocked
  //   Mahalanobis MOD + Autocorrelation MOD convergent. Blocked Mahal
  //   attribution gap (S110 parked) cleared; K/N=0.15 detection ceiling
  //   holds per METHODOLOGY §2.6b.
  '22-covariance-block.csv': { severity: 2, assay: 'general' },
};

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

  // Determine data type
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');

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

  const ok = severity === expected.severity;
  const flags = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => `${r.name}:${r.flag}`).join(', ');
  if (expected.pending) {
    // Pending-verification lane: fabricated fixture with no applicable active
    // test yet. Report status but don't count as pass/fail.
    console.log(`◦ ${file}: severity=${severity} (pending — ${expected.pendingNote})${flags ? ' [' + flags + ']' : ''}`);
    pending++;
  } else {
    const mark = ok ? '✓' : '✗';
    console.log(`${mark} ${file}: severity=${severity} (expected=${expected.severity})${!ok && flags ? ' [' + flags + ']' : ''}`);
    if (ok) passed++; else failed++;
  }
}

const pendingSuffix = pending ? ` (+ ${pending} pending)` : '';
console.log(`\n${passed}/${passed + failed} passed${pendingSuffix}` + (failed ? ` — ${failed} FAILED` : ' — all clear'));
process.exit(failed > 0 ? 1 : 0);

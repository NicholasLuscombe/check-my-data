// Shared batch-fixture data — single source of truth for the 22-fixture suite.
//
// Data-only: no executable batch logic, no side effects on import. Both
// `test/validate-batch.mjs` (the quality gate) and
// `scripts/build-test-display-map.mjs` (the lookup-table generator) import
// from here, so the fixture set, the per-test EXPECTED allow-sets, the
// ACKNOWLEDGED incidental-fire map, and the assay → dataType routing can't
// drift between the two.
//
// Previously the generator carried its own duplicate fixture list and a
// hand-rolled dataType ternary that diverged from the validator's routing
// (it ran tests on DS14 that should N/A under ordinal, and routed DS11 as
// continuous not count). Centralising the routing here removes that drift.

// Re-exported from its canonical home so consumers route dataType through one
// map. assay → dataType (continuous / count / ordinal).
export { ASSAY_DATATYPE_MAP } from '../src/constants/assays.js';

// Ordered fixture list: [file, DSxx key, assay]. Kept in this order so the
// generated doc reads DS01..DS22 left-to-right. The assay here matches each
// fixture's EXPECTED[file].assay below.
export const FIXTURES = [
  ['01-densitometry-clean.csv',                  'DS01',  'densitometry'],
  ['02-densitometry-fabricated.csv',             'DS02',  'densitometry'],
  ['03-qpcr-clean.csv',                          'DS03',  'qpcr'],
  ['04-qpcr-fabricated.csv',                     'DS04',  'qpcr'],
  ['05-cellcount-clean.csv',                     'DS05',  'cell_count'],
  ['06-cellcount-fabricated.csv',                'DS06',  'cell_count'],
  ['07-elisa-clean.csv',                         'DS07',  'elisa'],
  ['08-elisa-fabricated.csv',                    'DS08',  'elisa'],
  ['09-proteomics-clean.csv',                    'DS09',  'proteomics'],
  ['10-proteomics-fabricated.csv',               'DS10',  'proteomics'],
  ['11-rnaseq-multicondition.csv',               'DS11',  'genomics'],
  ['12a-uniform-mixture-clean.csv',              'DS12a', 'general'],
  ['12b-uniform-mixture-fabricated.csv',         'DS12b', 'general'],
  ['13-vfstest-cellcountest.csv',                'DS13',  'cell_count'],
  ['14-crctest-survey.csv',                      'DS14',  'survey'],
  ['15-missing-carlisle.csv',                    'DS15',  'general'],
  ['16-densitometry-carlisle-overbalanced.csv',  'DS16',  'densitometry'],
  ['17-densitometry-carlisle-clean.csv',         'DS17',  'densitometry'],
  ['19-inheritance-fabricated.csv',              'DS19',  'general'],
  ['20-bimodal-fab.csv',                         'DS20',  'general'],
  ['21-localised-ar.csv',                        'DS21',  'general'],
  ['22-covariance-block.csv',                    'DS22',  'general'],
];

// Per-test flag assertion. Each fixture entry carries severity + assay, and
// (on positives) a `flags` map of testName → allow-set: the set of tier
// strings the test's r.flag must land in. Declared cells are ground-truth-
// derived (TEST-GROUND-TRUTH.md), not snapshotted from output.
export const EXPECTED = {
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
export const ACKNOWLEDGED = {
  '06-cellcount-fabricated.csv': {
    'Mahalanobis Row Outlier': "incidental 1-row outlier downstream of the Poisson-variance manipulation; primary channel is Noise Scaling (S183 Phase 2)",
  },
  '08-elisa-fabricated.csv': {
    'Mahalanobis Row Outlier': "incidental 1-row outlier downstream of the localised noise suppression; primary channels SNP/LOESS/IRC/Const-Offset/Benford (S182 disposition, recorded S183 Phase 2)",
  },
};

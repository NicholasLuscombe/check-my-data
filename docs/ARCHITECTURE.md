# Check My Data — Architecture

## Overview

Check My Data is a client-side React application that detects data fabrication in scientific datasets using 25 statistical forensic tests across 5 categories. It runs entirely in the browser — no API calls, no server-side processing. Deployable to GitHub Pages as a static site.

## Tech Stack

- **React 18** — UI rendering (no class components except ErrorBoundary)
- **Vite 6** — Build tooling, HMR during development
- **PapaParse** — CSV/TSV parsing
- **SheetJS** — Excel (.xlsx/.xls) import (dynamic import, code-split)
- **JSZip** — Excel metadata forensics + export style injection (dynamic import, code-split)
- **No external state management** — all state is local React state in App.jsx
- **No CSS framework** — inline styles using design tokens from `constants/tokens.js`
- **Deterministic seeded PRNG** (Mulberry32) for reproducible analysis

## Module Structure

```
src/
  main.jsx                          Entry point
  App.jsx                           Root component — phase routing shell (~115 lines)

  constants/                        Shared constants (pure data, no logic)
    tokens.js                       Colours, typography, chart config, derived constants
    thresholds.js                   Significance thresholds (α), flag styles, p-value formatting
    assays.js                       Assay types, data types, assay-datatype map, skip rules
    mechanisms.js                   Mechanism taxonomy, display names, test→mechanism mapping
    roles.js                        Column role definitions, condition colours
    guidance.js                     Three-mode presentation text, category guidance, hotspot patterns

  stats/                            Statistical primitives (pure functions, no React/DOM)
    primitives.js                   ~30 functions: mean, variance, distributions, FDR, etc.
    prng.js                         Seeded Mulberry32 PRNG factory + Box-Muller normal deviates
    vst.js                          Variance-stabilising transform detection

  tests/                            25 forensic test functions (pure, no React/DOM)
    duplicateDetection.js           Exact duplicates + within-row coincidences
    constantOffset.js               Constant-offset row blocks (additive + multiplicative)
    selectiveNoise.js               Non-uniform replicate noise (Bartlett, condition-stratified)
    constantResponse.js             Constant response across conditions
    crossConditionDuplication.js    Copied values between conditions
    interReplicateCorrelation.js    Implausibly uniform pairwise Pearson r
    rankCorrelation.js              Preserved rank ordering across conditions
    autocorrelation.js              Serial correlation in differences
    kurtosis.js                     Non-normal noise (platykurtic)
    runs.js                         Non-random sign patterns
    rowMeanRuns.js                  Additive row-block shifts
    terminalDigits.js               Non-uniform last digits
    benford.js                      First-digit Benford deviation
    benford2.js                     Second-digit Benford deviation
    decimalPrecision.js             Inconsistent decimal places
    meanVariance.js                 Absent mean-variance scaling
    regionalNoise.js                Locally anomalous column noise
    mahalanobis.js                  Multivariate row outliers (D²)
    valueFrequencySpike.js          Abnormally frequent integer values
    residualSpikeCorrelation.js     Coordinated editing across groups
    loessResidual.js                Changepoint in noise character
    withinRowVariance.js            Anomalous within-row replicate spread
    missingDataPattern.js           Structured missingness (pairwise, condition, block)
    carlisleBalance.js              Implausible baseline balance (Carlisle test)
    entropyTest.js                  Shannon entropy anomalies via parametric bootstrap

  analysis/                         Analysis orchestration (pure, no React/DOM)
    engine.js                       runFullAnalysis — runs all 25 tests with progress
    aggregation.js                  Per-group grouping and Fisher's method meta-analysis
    severity.js                     Overall severity score (0–3)
    narrative.js                    Template-driven narrative generation
    localization.js                 Row-level anomaly localization, mechanism grouping
    conditionContext.js             Unified condition handling (column/row-grouped/none)
    convergence.js                  Cell-level flag accumulation, hotspot detection

  import/                           Import pipeline (pure, no React/DOM)
    parser.js                       Header detection, preprocessing, block splitting
    longFormat.js                   Long-format detection and pivot-to-wide
    roles.js                        Column role inference, assay detection hints
    summary.js                      Dataset summary statistics
    demo.js                         Demo dataset generators
    excel.js                        Excel import via dynamic SheetJS (multi-sheet support)
    excelMeta.js                    Excel metadata forensics via dynamic JSZip (7 signals)

  export/                           Export pipeline
    excelExport.js                  Investigation .xlsx workbook (3–4 sheets, convergence colours)

  components/
    shared/                         Shared UI components
      Logo.jsx                      SVG logo
      ErrorBoundary.jsx             React error boundary for ReportView/BatchView
      CardLayout.jsx                MiniCardLayout, headlines, footers, guidance
      DataTable.jsx                 Sortable data table
      ConditionTable.jsx            Condition-grouped summary table
      coordinates.js                Original file coordinate mapping (Excel letters, row numbers)
      styles.js                     Shared inline style objects
      utils.js                      UI utility functions

    plots/                          SVG plot components
      PlotSVG.jsx                   Base SVG container with axes
      stripTicks.js                 Axis tick utilities
      HBarPlot.jsx                  Horizontal bar chart
      VBarPlot.jsx                  Vertical bar chart
      DotStrip.jsx                  Dot strip plot
      MahalanobisDistPlot.jsx       Mahalanobis distance distribution
      MeanVarianceScatter.jsx       Mean-variance scatter plot
      NoiseSpreadPlot.jsx           Noise spread visualization
      AutocorrDecayPlot.jsx         Autocorrelation decay plot
      KurtosisDistPlot.jsx          Kurtosis distribution plot
      NoiseProfilePlot.jsx          Noise profile plot
      SignStripPlot.jsx             Sign pattern strip plot
      RegionalNoiseStrip.jsx        Regional noise strip plot
      CoordResidualProfile.jsx      Coordinated residual profile plot

    cards/                          Per-test result cards
      MiniPlot.jsx                  Plot dispatcher — routes test name to plot component
      TestCard.jsx                  Full-detail test card
      ExcelMetaCard.jsx             Excel file metadata forensics card
      MiniCard_DuplicateDetection.jsx
      MiniCard_ConstantOffset.jsx
      MiniCard_SelectiveNoise.jsx
      MiniCard_InterReplicateCorrelation.jsx
      MiniCard_RankCorrelation.jsx
      MiniCard_Autocorrelation.jsx
      MiniCard_Kurtosis.jsx
      MiniCard_Runs.jsx
      MiniCard_RowMean.jsx
      MiniCard_TerminalDigit.jsx
      MiniCard_Benford.jsx
      MiniCard_DecimalPrecision.jsx
      MiniCard_NoiseScaling.jsx
      MiniCard_RegionalNoise.jsx
      MiniCard_Mahalanobis.jsx
      MiniCard_ValueFrequency.jsx
      MiniCard_ResidualSpike.jsx
      MiniCard_LOESS.jsx
      MiniCard_WithinRowVariance.jsx
      MiniCard_MissingDataPattern.jsx
      MiniCard_CarlisleBalance.jsx
      MiniCard_Entropy.jsx

    views/                          Top-level page views
      ImportView.jsx                File upload, role assignment, assay selection (4-zone layout)
      ReportView.jsx                Single-file analysis report (3-mode presentation)
      BatchView.jsx                 Multi-file batch analysis
      VerdictBanner.jsx             Severity verdict header with data profile
      LongFormatModal.jsx           Long-format pivot confirmation modal
```

## Dependency Graph

```
constants/  ← (no dependencies)
    ↑
stats/      ← constants/
    ↑
tests/      ← stats/, constants/
    ↑
analysis/   ← tests/, stats/, constants/
    ↑
import/     ← constants/ (excel.js, excelMeta.js dynamically import xlsx/jszip)

export/     ← analysis/, constants/, components/shared/coordinates.js
                (dynamically imports xlsx + jszip)

components/ ← analysis/, import/, export/, stats/, constants/
App.jsx     ← components/, analysis/, stats/, constants/
```

Key constraint: **No circular dependencies.** The graph is a strict DAG. `constants/` is a leaf module with no intra-project dependencies.

## Data Flow

```
CSV/Excel file → PapaParse/SheetJS → preprocessRaw → detectBlocks → detectHeaderRows
                                                           ↓
                                              applyHeaders → inferRoles
                                                           ↓
                                              detectLongFormat? → pivotLongToWide
                                                           ↓
                                              detectAssay → detectVST
                                                           ↓
                                              extractAnalysisInputs → createConditionContext
                                                           ↓
                                    validateMatrix → createPRNG → runFullAnalysis
                                                           ↓
                          25 tests (each wrapped in try/catch) → results[]
                                                           ↓
                                    computeSeverity → extractLocalizations
                                                           ↓
                                    buildConvergence → buildMechanismGroups
                                                           ↓
                                              ReportView renders results (3 modes)
                                                           ↓
                                              exportToExcel (optional, dynamic import)
```

## State Management

All state lives in the root `CheckMyData` component in App.jsx:

| State | Type | Purpose |
|-------|------|---------|
| `phase` | `"import"\|"running"\|"report"\|"batch"` | Current app phase |
| `results` | `Array<TestResult>` | 25-element array of test results |
| `narrative` | `string` | Template-generated narrative summary |
| `analysisMatrix` | `number[][]` | Numeric matrix used for analysis |
| `importConfig` | `object` | Import settings (assay, roles, VST, summary, etc.) |
| `rowMap` | `number[]` | Matrix row → original data row mapping |
| `mode` | `"qc"\|"review"\|"full"` | Report presentation mode (persists within analysis) |
| `convergence` | `object` | `{ grid, hotspots, pattern }` from convergence layer |
| `coordCtx` | `object` | Original file coordinate mapping context |
| `pendingFile` | `File\|null` | File picked from report page "Change file" |
| `importKey` | `number` | Counter to force ImportView remount on file change |

No Redux, no Context, no stores. State flows downward via props. This is intentional — the app is a single-pipeline tool, not a multi-view dashboard.

## Design Decisions

### Why no Redux/Zustand?
The app has a linear pipeline: import → analyse → display. There's no concurrent editing, no shared mutable state across views, no undo/redo. React's built-in state is sufficient.

### Why inline styles?
Styles reference design tokens (`C.BG`, `TF.BODY`, `CR.SM`), which is a reasonable pattern for a React app with no build-time CSS solution. The token system provides consistency without the overhead of a CSS framework. CSS extraction is possible but out of scope.

### Why seeded PRNG?
Permutation tests require random shuffles. A seeded PRNG (Mulberry32) ensures that running the same dataset twice produces identical results. The seed is derived from a hash of the input data.

### Why no TypeScript?
The original monolith was built in Claude artifacts (JavaScript). TypeScript migration would be valuable but is a separate initiative — the current focus is modular decomposition and correctness validation.

### Why Fisher's method with "can only promote"?
When data has multiple groups (e.g., two-row headers grouping columns), each test runs per-group and results are combined. Fisher's method (meta-analysis of p-values) combines evidence across groups. The "can only promote" principle means a group-level HIGH can promote the overall flag from LOW to HIGH, but a group-level LOW cannot demote a HIGH from another group.

### Three-mode presentation
The report view renders the same engine output in three modes (no recomputation):
- **Check my data (QC):** Plain-language, no p-values or test names
- **Peer review:** Category badges, convergence metrics, investigation guidance
- **Detailed analysis:** Full technical output for experts

Mode definitions and text live in `constants/guidance.js`.

## Error Handling

### Per-Test Error Boundaries (Phase 8)
Each test invocation in `runFullAnalysis` is wrapped in try/catch. A failing test produces:
```js
{ name, flag: "ERROR", primaryP: null, description: "Test failed: ...", error: true }
```
The other 24 tests continue running. ERROR results are excluded from severity calculation.

### Input Validation
`validateMatrix()` runs before the test battery:
- Replaces non-finite values (NaN, Infinity) with null
- Warns if >50% missing values
- Rejects empty matrices

### UI Error Boundary
`AnalysisErrorBoundary` (React class component) wraps ReportView and BatchView. On render crash, it shows an error message with a "Back to Import" button.

### Import Validation
- File size limit: reject >50 MB, warn >10 MB
- PapaParse errors surfaced to user
- File type validation (.csv/.tsv/.xlsx/.xls)

## PRNG Factory Pattern

**`stats/prng.js` exports `createPRNG(matrix)`** — a factory that returns a PRNG instance with `.random()`, `.randn()`, `.shuffle()` methods and fully encapsulated state. This is Web Worker safe — each Worker can create its own instance without state races.

The engine (`analysis/engine.js`) creates one instance and threads it through all 11 test functions that use randomness. Legacy module-scoped exports (`sRand`, `seedRNG`, `randn`, `shuffleArray`) are retained as backward-compatible wrappers but should not be used in new code.

```js
// Factory pattern (Web Worker safe):
import { createPRNG } from '../stats/prng.js';
const rng = createPRNG(matrix);
rng.random();   // Mulberry32 uniform [0,1)
rng.randn();    // Box-Muller N(0,1)
rng.shuffle(arr); // Fisher-Yates in-place
```

Test functions that use PRNG accept an `rng` parameter as their last argument (e.g., `testBenford(matrix, rng)`).

## How to Add a New Test

1. **Create `src/tests/myNewTest.js`**
   - Export a single function: `export function testMyNewTest(matrix, ...)`
   - Return `{ name, category, flag, primaryP, description, ...extras }`
   - Use primitives from `stats/primitives.js`; if PRNG needed, accept `rng` parameter (instance from `createPRNG`)
   - If condition-aware, accept `condCtx` parameter and use `condCtx.slices()`, `condCtx.paired`, etc.
   - Add JSDoc with `@see METHODOLOGY.md §"..."` reference

2. **Register in `src/analysis/engine.js`**
   - Import the test function
   - Add an entry to the `tests` array in `runFullAnalysis`

3. **Add to mechanism taxonomy** in `src/constants/mechanisms.js`
   - Add entry to `TEST_MECHANISM` mapping (use category keys: copied/digits/uneven/noise/perfect)
   - Add display name to `DISPLAY_NAMES`

4. **Update severity** in `src/analysis/severity.js`
   - Add the test to the appropriate category in `getApplicabilityTests()`

5. **Create a MiniCard** in `src/components/cards/MiniCard_MyNewTest.jsx`
   - Follow the pattern of existing MiniCards

6. **Register the MiniCard** in `src/components/cards/MiniPlot.jsx`
   - Add the test name → component mapping

7. **Update ground truth** in `TEST-GROUND-TRUTH.md`
   - Run all 17 validation datasets and record expected flags

8. **Document the algorithm** in `METHODOLOGY.md`

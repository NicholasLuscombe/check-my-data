# Contributing to Check My Data

## Development Setup

```bash
# Clone and install
npm install

# Start dev server (HMR on localhost:5173)
npm run dev

# Production build
npm run build

# Run tests
npm test
```

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full module map and dependency graph.

Key directories:
- `src/constants/` — Shared constants (tokens, thresholds, assay types, mechanisms, guidance)
- `src/stats/` — Statistical primitives (mean, variance, FDR, PRNG)
- `src/tests/` — 25 forensic test functions
- `src/analysis/` — Analysis engine, aggregation, severity, narrative, convergence
- `src/import/` — CSV/Excel parsing and import pipeline
- `src/export/` — Excel investigation workbook export
- `src/components/` — React UI components

## Running the Validation Suite

17 test datasets (CSV files) in `test/fixtures/` validate that all tests produce expected results:

| File | Description | Expected Severity |
|------|-------------|-------------------|
| 01-densitometry-clean.csv | Clean densitometry | 0 |
| 02-densitometry-fabricated.csv | Fabricated densitometry | 3 |
| 03-qpcr-clean.csv | Clean qPCR | 0 |
| 04-qpcr-fabricated.csv | Fabricated qPCR | 3 |
| 05-elisa-clean.csv | Clean ELISA | 0 |
| 06-elisa-fabricated.csv | Fabricated ELISA | 3 |
| 07-benford-clean.csv | Clean Benford data | 0 |
| 08-benford-fabricated.csv | Fabricated Benford data | 3 |
| 09-genomics-clean.csv | Clean genomics | 0 |
| 10-genomics-fabricated.csv | Fabricated genomics | 3 |
| 11-cell-count-clean.csv | Clean cell counts | 0 |
| 12a-cell-count-clean.csv | Clean cell counts (designed-clean) | 0 |
| 12b-cell-count-fabricated.csv | Fabricated cell counts | 1 |
| 13-crctest-clean.csv | Clean CRC test | 0 |
| 14-crctest-survey.csv | CRC survey data | 3 |
| 15-missing-carlisle.csv | Missing data + Carlisle signals | 3 |
| 16-densitometry-carlisle-overbalanced.csv | Overbalanced baseline (Carlisle) | 2 |
| 17-densitometry-carlisle-clean.csv | Clean baseline comparator | 0 |

To validate: open the app, load each CSV from `test/fixtures/`, run analysis, and verify the severity rating matches. Alternatively, run `node test/validate-batch.mjs` for automated batch validation. The `TEST-GROUND-TRUTH.md` file has per-test expected flags for each dataset.

## Adding a New Statistical Test

Follow these steps in order (see ARCHITECTURE.md for more detail):

### 1. Write the test function

Create `src/tests/myNewTest.js`:

```js
import { mean, variance, bhFDR } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

/**
 * Detects [fabrication pattern description].
 * @param {Array<Array<?number>>} matrix - Numeric data matrix
 * @returns {{name: string, category: string, flag: string, primaryP: ?number, description: string}}
 * @see METHODOLOGY.md §"[section name]"
 */
export function testMyNewTest(matrix) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;

  // Guard: minimum data requirements
  if (nC < 2 || nR < 10) {
    return { name: "My New Test", category: "noise", flag: "N/A",
      description: "Insufficient data." };
  }

  // ... test logic ...

  const flag = flagFromP(pValue);
  return {
    name: "My New Test",
    category: "noise", // use mechanism key: copied, digits, uneven, noise, or perfect
    flag,
    primaryP: pValue,
    description: `[What was found]. p = ${pValue.toFixed(4)}.`,
    // ... any extra fields for the MiniCard to display
  };
}
```

### 2. Register in the analysis engine

In `src/analysis/engine.js`, add the import and a new entry in the `tests` array.

### 3. Add mechanism taxonomy

In `src/constants/mechanisms.js`:
- Add `"My New Test": "noise"` to `TEST_MECHANISM` (use category keys: `copied`, `digits`, `uneven`, `noise`, `perfect`)
- Add `"My New Test": "Display Name"` to `DISPLAY_NAMES`

### 4. Create a MiniCard

Create `src/components/cards/MiniCard_MyNewTest.jsx` following the pattern of existing cards. Register it in `MiniPlot.jsx`.

### 5. Document and validate

- Document the algorithm in `METHODOLOGY.md`
- Run all 17 datasets and update `TEST-GROUND-TRUTH.md`

## Adding a New MiniCard

Each test has a corresponding MiniCard that displays its results. Follow the pattern:

1. Create `src/components/cards/MiniCard_YourTest.jsx`
2. Import shared components: `CardLayout`, `FlagBadge`, `DetailTable`, etc.
3. Export a named function component accepting `{ result }` as props
4. Register in `src/components/cards/MiniPlot.jsx`

## Modifying Design Tokens

All colours, typography, spacing, and chart configuration live in `src/constants/tokens.js`. Changes here propagate everywhere. The key namespaces:

- `C` — Core colours (background, text, borders)
- `SIGNAL` — Severity colours (red/amber/green with bg/border/text/dot)
- `ACCENT` — Accent colours (blue/purple)
- `FF` — Font families
- `FW` — Font weights
- `TF` — Type sizes
- `CR` — Border radii
- `CP` / `CS` — Chart padding, sizes

## Code Conventions

- **Named exports only** (no default exports except App.jsx)
- **No barrel files** for `tests/` or `components/` (preserves tree-shaking)
- **Pure functions** in `stats/`, `tests/`, `analysis/`, `import/` — no React, no DOM
- **Inline styles** using design tokens — no CSS files
- **JSDoc** on all exported functions in `stats/` and `tests/`

/* ── Findings — central aggregator (S126a) ──────────────────────────
   Single source of truth for finding-level data consumed by:
     - HotspotExcerpt (cell shading via convergence grid built on findings)
     - WhereToLookSection (Layer 0 / 1A / 1B / 4 reads)
     - GlobalKeyFindings + LocalKeyFindings
     - Any future surface needing "what did the analysis find?"

   Engine producers untouched — buildFindings is a transform layer over
   the existing test result objects.

   Schema (per finding):
     id          stable string ID, ordinal in finding list
     type        'localised' | 'global'   — global tests describe dataset-wide
                 character; localised carry a region.
     severity    'HIGH' | 'MOD' | 'LOW' | 'CLEAR' | 'NA'
     dimensions  string[] of MECHANISM_ORDER keys, dominant first
     tests       [{ testId, displayName, pValue, effectSize?, adjP? }]
     region      null for global. For localised, an object carrying:
                   raw          — array of {rows, cols} from extractCellFlags;
                                  preserved verbatim so the convergence
                                  grid can be rebuilt deterministically
                   rows         — sorted unique union of touched rows
                                  (0-based; null when finding is column-only)
                   cols         — sorted unique union of touched cols
                                  (0-based; null when finding is row-only)
                   cells        — [r,c][] union of explicit cell hits
                                  (0-based; empty when only row/col scope)
                   rowRange     — [first, last] across rows, or null
                   columnHeaders— string[] of column labels for `cols`
                                  (looked up via colHeaders[ci]; empty if
                                  no headers were supplied)
     summary     plain-English one-liner, suitable for both display and
                 annotated-report export. Generated via keyFindingTemplates.
     pinned      false — reserved for v1.1 (SESSION126-DESIGN-SPEC §1.8);
                 every finding carries the field so downstream consumers
                 don't have to retrofit later.
     regionNumber  null for global findings. For localised findings with a
                 cell-bearing region (rowRange present), a 1-based ordinal
                 assigned by ascending first-row position. Computed in the
                 aggregator (S126b §1.6) so chips, minimap overlays, and
                 any other consumer agree on the [N] label without
                 re-deriving the mapping. Localised findings without a
                 row-bearing region (e.g. column-only) carry null.

   v1.0 emits findings only for HIGH and MODERATE flagged tests, matching
   what existing surfaces render. The schema permits LOW/CLEAR/NA but
   they're not produced yet — adding them would expand consumers'
   filtering surface without behaviour change. */

import { TEST_MECHANISM, GLOBAL_TESTS, DISPLAY_NAMES } from "../constants/mechanisms.js";
import { extractCellFlags } from "./convergence.js";
import { keyFinding } from "../constants/keyFindingTemplates.js";

const SEV_FROM_FLAG = {
  HIGH:     "HIGH",
  FLAGGED:  "HIGH",
  MODERATE: "MOD",
  NOTED:    "MOD",
  LOW:      "LOW",
  CLEAR:    "CLEAR",
  "N/A":    "NA",
};

const SEV_RANK = { HIGH: 3, MOD: 2, LOW: 1, CLEAR: 0, NA: -1 };

function isFlaggedFlag(flag) {
  return flag === "HIGH" || flag === "FLAGGED" || flag === "MODERATE" || flag === "NOTED";
}

/** Aggregate a finding's per-region {rows, cols} entries into flat row/col/cell sets.
 *
 *  S126b addendum 2: row-only emits (rows present, cols null) expand to
 *  cells = {rows × all-DATA-cols}. Tests producing row-only emits are
 *  conceptually flagging "this whole row" — the painted cells are the
 *  user-visible projection of that claim. The convergence grid already
 *  expanded null-cols to all-cols at marking time
 *  (`buildConvergenceGridFromFindings`), but `region.cells` was empty,
 *  causing the sticky-surface State C false negative on row-level-only
 *  fixtures (DS11). Aggregator-level expansion makes findings.cells the
 *  single source of truth across consumers.
 *
 *  Per-producer audit (extractCellFlags walk in convergence.js):
 *
 *    | Producer                          | Emitted shape         | Expand? |
 *    |-----------------------------------|-----------------------|---------|
 *    | Exact Duplicate Detection         | block: rows+cols      | as-is   |
 *    |                                   | rowDup: rows+null     | row→all |
 *    |                                   | within-row: row+cols  | as-is   |
 *    | Constant-Offset Blocks            | rows + (cols or null) | row→all when null |
 *    | Residual Spike Correlation        | rows + (cols or null) | row→all when null |
 *    | Inter-Replicate Correlation       | rows + cols (window)  | as-is   |
 *    | Value-Frequency Spike             | row + cols            | as-is   |
 *    | Selective Noise Partitioning      | null + cols (col-only)| stays col-only — no row scope |
 *    | LOESS Residual Analysis           | rows + null           | row→all |
 *    | Row-Mean Runs                     | rows + null           | row→all |
 *    | Regional Noise Homogeneity        | rows + (col or null)  | row→all when null |
 *    | Missing Data Pattern              | rows + cols (block)   | as-is   |
 *    | Runs Test                         | rows + cols (window)  | as-is   |
 *    | Windowed Autocorrelation          | rows + cols (window)  | as-is   |
 *    | Within-Row Variance               | rows + null           | row→all |
 *    | Mahalanobis Row Outlier           | rows + null           | row→all |
 *    | Blocked Mahalanobis               | rows + null           | row→all |
 *
 *  Universal expansion rule (covers all producers above): `rows present
 *  AND cols null` → cells = {rows × [0..nCols-1]}. Producers stay
 *  untouched. Selective Noise Partitioning's col-only emit (rows null)
 *  is preserved unchanged — col-only is a column-scope claim, not a
 *  spatial region; no rowRange means no chip and no minimap region
 *  overlay (correct semantics — SelNoise paints columns via the
 *  convergence grid's null-rows expansion in
 *  `buildConvergenceGridFromFindings`).
 */
function aggregateRegions(regions, nRows, nCols) {
  const rowSet = new Set();
  const colSet = new Set();
  const cellSet = new Set();
  for (const { rows, cols } of regions) {
    if (rows && rows.length) for (const r of rows) rowSet.add(r);
    if (cols && cols.length) for (const c of cols) colSet.add(c);
    // Cell-creation rule:
    //   rows + cols  → cross-product (cell-level emit)
    //   rows + null  → row × all DATA cols (row-level emit, expanded)
    //   null + cols  → no cells (col-only emit; SelNoise; preserved)
    //   null + null  → no cells (defensive — shouldn't occur)
    if (rows && rows.length) {
      const cList = (cols && cols.length)
        ? cols
        : Array.from({ length: nCols }, (_, i) => i);
      for (const r of rows) for (const c of cList) cellSet.add(`${r},${c}`);
    }
  }
  const rows = rowSet.size ? [...rowSet].sort((a, b) => a - b) : null;
  const cols = colSet.size ? [...colSet].sort((a, b) => a - b) : null;
  const cells = cellSet.size
    ? [...cellSet].map(k => k.split(",").map(Number))
    : [];
  const rowRange = rows && rows.length ? [rows[0], rows[rows.length - 1]] : null;
  return { rows, cols, cells, rowRange };
}

/**
 * Build the canonical findings[] list from raw test results.
 *
 * @param {object[]} results — engine output (one entry per test)
 * @param {number}   nRows   — matrix row count (used by extractCellFlags clamps)
 * @param {number}   nCols   — matrix col count
 * @param {object}   [opts]
 * @param {function} [opts.toFileRow] — (matRow|dataRow) → file row (1-indexed),
 *                                       passed to keyFindingTemplates that
 *                                       embed row numbers in their summary
 * @param {string[]} [opts.colHeaders] — column header labels by 0-based col index;
 *                                        used to populate region.columnHeaders
 * @returns {Array<Finding>}
 */
export function buildFindings(results, nRows, nCols, opts = {}) {
  const { toFileRow, colHeaders } = opts;
  const findings = [];
  let nextId = 0;

  for (const r of results) {
    if (!r || !isFlaggedFlag(r.flag)) continue;

    // 'noise' default matches buildConvergenceGrid (convergence.js) — every
    // test in the current 28-test build is keyed, so the fallback is dead in
    // practice; kept for parity with the existing aggregator.
    const dim = TEST_MECHANISM[r.name] || "noise";
    const isGlobal = GLOBAL_TESTS.has(r.name);
    const severity = SEV_FROM_FLAG[r.flag] || "LOW";
    const summary = keyFinding(r, toFileRow) || `${r.name}: flagged.`;

    const test = {
      testId:     r.name,
      displayName: DISPLAY_NAMES[r.name] || r.name,
      pValue:     r.primaryP ?? null,
      effectSize: r.effectSize ?? null,
      adjP:       r.adjP ?? null,
    };

    let region = null;
    if (!isGlobal) {
      const raw = extractCellFlags(r, nRows, nCols);
      if (raw.length) {
        const agg = aggregateRegions(raw, nRows, nCols);
        const columnHeaders = colHeaders && agg.cols
          ? agg.cols.map(c => colHeaders[c]).filter(h => h != null)
          : [];
        region = {
          raw: raw.map(({ rows, cols }) => ({
            rows: rows ? [...rows] : null,
            cols: cols ? [...cols] : null,
          })),
          rows:          agg.rows,
          cols:          agg.cols,
          cells:         agg.cells,
          rowRange:      agg.rowRange,
          columnHeaders,
        };
      } else if (r.nRows > 0 && isFlaggedFlag(r.flag)) {
        // S126b add-8: synthesize a dataset-wide rowRange so the chip
        // surfaces in §2's Localised Patterns lane. Real-world case is
        // Mahalanobis Row Outlier on DS15: stratified Fisher's combination
        // promotes the aggregate flag past LOW (binomP-combined ~ 0.0019
        // < ALPHA.NOTE), but each per-group testFn run hit the S126b
        // add-5b verdict gate (nOut === 0 → LOW) and produced empty
        // details. The aggregator's flatMapped subDetails is therefore
        // empty, extractCellFlags returns [], region stays null, and no
        // chip emits — leaving the user with a §3-FLAGGED test card and
        // no §2 signal. Underlying methodology gap (Fisher promotion
        // bypassing per-group row-evidence gate) is parked #37 / S127
        // dispatch repair; add-8 is the surface fix.
        //
        // `raw` left EMPTY so buildConvergenceGridFromFindings doesn't
        // mass-shade every cell in the dataset — that would drown out
        // genuine localised hotspots in the convergence grid. The chip
        // lane only needs `rowRange` for regionNumber assignment; the
        // minimap region-[N] overlay is suppressed too because
        // ForensicsBody filters those by `region.cells.length > 0`. The
        // fallback chip is purely a "test fired across the data, no
        // specific row identified" signal, semantically honest given the
        // missing per-row evidence.
        //
        // S127b fold-in: explicit `isFlaggedFlag(r.flag)` re-guard at the
        // fallback's own scope. The outer guard at line 161 already
        // filters non-flagged results (LOW/CLEAR/N/A) before this branch
        // runs, so the inner check is redundant under current code. It
        // is the defensive form of the fallback's intent — "the test
        // fired with severity > LOW but produced no per-row evidence".
        // Without this explicit guard, a future loosening of the outer
        // filter (e.g. to surface LOW findings for a different consumer)
        // would silently re-route through the add-8 fallback and emit
        // chips for tests whose name promises per-row evidence and whose
        // verdict is "no rows found" — exactly the LOW-with-chip false
        // positive the principle "fallback rules need verdict guards"
        // is meant to prevent. See CLAUDE.md "Fallback rules need verdict
        // guards" for the broader principle.
        region = {
          raw: [],
          rows: Array.from({ length: r.nRows }, (_, i) => i),
          cols: null,
          cells: [],
          rowRange: [0, r.nRows - 1],
          columnHeaders: [],
        };
      }
    }

    findings.push({
      id: `f${nextId++}`,
      // Localised tests with no extractable region (rare — e.g. an
      // emit-pending edge case) still classify as 'localised' but carry
      // null region. Consumers that need a region should treat null as
      // "no spatial scope yet".
      type: isGlobal ? "global" : "localised",
      severity,
      dimensions: [dim],
      tests: [test],
      region,
      summary,
      pinned: false,
      regionNumber: null,
    });
  }

  // Sort by severity desc, then by primary p-value asc — matches
  // existing KeyFindings sort and Forensics top-down reading order.
  findings.sort((a, b) => {
    const dr = (SEV_RANK[b.severity] ?? -1) - (SEV_RANK[a.severity] ?? -1);
    if (dr !== 0) return dr;
    return (a.tests[0].pValue ?? 1) - (b.tests[0].pValue ?? 1);
  });

  // Assign 1-based region numbers to localised findings whose region
  // carries a row range. Ordering: ascending first-row, then ascending
  // first-col on ties. Consumers (FindingChip, minimap overlay) read
  // this number rather than re-deriving it, so chips and overlays stay
  // in lock-step.
  const numbered = findings
    .filter(f => f.type === "localised" && f.region && f.region.rowRange)
    .slice()
    .sort((a, b) => {
      const ar = a.region.rowRange[0];
      const br = b.region.rowRange[0];
      if (ar !== br) return ar - br;
      const ac = a.region.cols ? a.region.cols[0] : 0;
      const bc = b.region.cols ? b.region.cols[0] : 0;
      return ac - bc;
    });
  numbered.forEach((f, i) => { f.regionNumber = i + 1; });

  return findings;
}

/** Filter helper — split a findings list into global vs localised. */
export function partitionFindings(findings) {
  const globalF = [];
  const localF = [];
  for (const f of findings) {
    (f.type === "global" ? globalF : localF).push(f);
  }
  return { global: globalF, local: localF };
}

export const FINDING_SEV_RANK = SEV_RANK;

/**
 * Unified click-to-highlight dispatch.
 *
 * Single entry point: buildHighlightSpec(testKey, results, ctx) → HighlightSpec.
 * Internal dispatch map routes each test to its builder. HotspotExcerpt renders
 * from the spec — no component reads test result details for highlight decisions.
 */

import { C, CC, SIGNAL, ACCENT, withAlpha } from "../constants/tokens.js";
import { LOCALITY_WHOLE_TABLE_WASH } from "../components/shared/heatmapColors.js";

// ── Test names ──────────────────────────────────────────────────────
const RSC  = "Residual Spike Correlation";
const IRC  = "Inter-Replicate Correlation";
const LOESS = "LOESS Residual Analysis";
const DUP  = "Exact Duplicate Detection";
const MAHAL = "Mahalanobis Row Outlier";
const WAC  = "Windowed Autocorrelation";
const BMAHAL = "Blocked Mahalanobis";

// ── Highlight colors ────────────────────────────────────────────────
// Exported for rendering code that needs the raw values (counterpart rows, etc.)

// IRC: warm amber/cream column tint. Pre-composited SIGNAL.AMBER.dot onto white at ~0.12α.
export const IRC_TINT = "rgb(254,238,227)";

// LOESS two-tone changepoint tints
export const LOESS_ANOMALOUS_TINT = "rgba(245,158,11,0.15)"; // warm — noisier/anomalous
export const LOESS_EXPECTED_TINT  = withAlpha(CC.OBS, 0.10);  // cool — expected

// DupDet group row tints (cycles for groups beyond 3)
export const DUP_GROUP_TINTS = [
  withAlpha(SIGNAL.RED.dot, 0.12),    // pink  — group Ⓐ
  withAlpha(CC.OBS, 0.12),            // blue  — group Ⓑ
  withAlpha(SIGNAL.GREEN.dot, 0.12),  // green — group Ⓒ
];
export const DUP_COUNTERPART_TINTS = [
  withAlpha(SIGNAL.RED.dot, 0.07),
  withAlpha(CC.OBS, 0.07),
  withAlpha(SIGNAL.GREEN.dot, 0.07),
];
export const DUP_COUNTERPART_BORDERS = [
  withAlpha(SIGNAL.RED.dot, 0.5),
  withAlpha(CC.OBS, 0.5),
  withAlpha(SIGNAL.GREEN.dot, 0.5),
];
export const DUP_WITHIN_ROW_PALETTE = [
  withAlpha(ACCENT.PURPLE.color, 0.25),  // violet
  withAlpha(ACCENT.TEAL.color, 0.25),    // teal
  "rgba(245,158,11,0.25)",   // amber  (no token — left inline)
  "rgba(244,63,94,0.25)",    // rose   (no token — left inline)
];
export const DUP_DIM_OPACITY = 0.35;

// Generic click-to-highlight tint. S163 B2a: amber → light purple to
// match the §2 density axis (CONVERGENCE_RAMP is now purple too, so
// active-finding cells read as a saturated step on the same axis
// rather than a competing severity hue). ACCENT.PURPLE.color blended
// at ~0.20 sits a touch above the count-1 swatch.
export const HIGHLIGHT_TINT = withAlpha(ACCENT.PURPLE.color, 0.22);

// RSC cell color ramp: SIGNAL.RED.bg → CC.THRESH
export function rscCellColor(intensity) {
  if (intensity < 0.02) return null;
  const r = Math.round(253 + (239 - 253) * intensity);
  const g = Math.round(242 + (68 - 242) * intensity);
  const b = Math.round(242 + (68 - 242) * intensity);
  return `rgb(${r},${g},${b})`;
}

// ── Empty spec (no highlighting) ────────────────────────────────────
// S163 B2a: `localityCompose` carries the multi-finding locality
// dispatch (overlap counts + union border edges + whole-table flag).
// Built once at spec time so renderCell does not re-derive per cell.
// LOCALITY_WHOLE_TABLE_WASH is the wash applied across the data block
// for the dataset-wide / unscoped tiers — re-exported here so the
// renderer can paint without reaching back into heatmapColors.
//
// S163 B2b: `localityRegion` (single-finding shape) retired and
// replaced by `localityCompose` (multi-finding shape). One active
// finding is just the count=1 case of the compose object.
const EMPTY_COMPOSE = Object.freeze({
  hasWholeTable: false,
  hasUnscoped: false,
  unionCells: new Set(),
  unionRows: new Set(),
  unionCols: new Set(),
  countCells: new Map(),
  countRows: new Map(),
  countCols: new Map(),
});

const EMPTY_SPEC = Object.freeze({
  tintedVisCols: null,
  tintColor: null,
  brackets: [],
  rowTint: null,
  changepointVisRows: [],
  cellColor: null,
  cellTextColor: null,
  dimNonRelevant: true,
  boldRelevant: true,
  suppressConvergenceHeat: false,
  dupGroupStyleMap: null,
  dupGroupTintMap: null,
  dupWithinRowMap: null,
  localityCompose: EMPTY_COMPOSE,
});

export { LOCALITY_WHOLE_TABLE_WASH };

/**
 * Build a multi-finding locality-compose object from a list of active
 * findings (S163 B2b W3 / W4).
 *
 * Returns:
 *   hasWholeTable — true if any active finding is dataset-wide.
 *                   The renderer paints LOCALITY_WHOLE_TABLE_WASH on data
 *                   cells whose localised count is zero (cells with at
 *                   least one localised finding suppress the wash —
 *                   localised fills composite over, never with, the wash).
 *   hasUnscoped   — true if any active finding is unscoped (S193 add-8):
 *                   a localised test that fired but isolated no location.
 *                   Carries NO table treatment (no wash, no dim) — the
 *                   data block stays at rest and the caption alone
 *                   reports it.
 *   unionCells / unionRows / unionCols — UNION of all active findings'
 *                   visible-coord extents. The renderer draws the
 *                   deeper-purple identity border at edges of these
 *                   unions: cell-local cells get all four; row-band cells
 *                   get top + bottom at run boundaries; column-band
 *                   cells get left + right at run boundaries.
 *                   Overlapping active regions produce a coincident
 *                   union edge — interior boundaries don't paint.
 *   countCells / countRows / countCols — per-axis ACTIVE-FINDING count.
 *                   Sum across the three at a given cell = the total
 *                   localised count on that cell, which keys into
 *                   CONVERGENCE_RAMP for the fill intensity.
 *
 * Cell-local findings contribute to unionCells + countCells (NOT to
 * row / col unions or counts — the cell-local treatment is per-cell,
 * not per-row / per-col, even if the cells happen to share rows).
 * Row-local findings contribute to unionRows + countRows.
 * Column-local findings contribute to unionCols + countCols.
 * Whole-table findings only flip hasWholeTable; they don't paint
 * borders or contribute to per-cell counts.
 */
function buildLocalityCompose(findings, ctx) {
  if (!findings || !findings.length) return EMPTY_COMPOSE;
  const { rowMap, matColToVisCol, nVisRows } = ctx;
  const mapRow = (r) => (rowMap ? (rowMap[r] ?? r) : r);
  const mapCol = (c) => (matColToVisCol ? matColToVisCol[c] : c);

  let hasWholeTable = false;
  let hasUnscoped = false;
  const unionCells = new Set();
  const unionRows  = new Set();
  const unionCols  = new Set();
  const countCells = new Map();
  const countRows  = new Map();
  const countCols  = new Map();
  const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  for (const f of findings) {
    switch (f.locality) {
      case "cell-local": {
        for (const [r, c] of f.region?.cells || []) {
          const vr = mapRow(r);
          const vc = mapCol(c);
          if (vr >= 0 && vr < nVisRows && vc != null) {
            const k = `${vr},${vc}`;
            unionCells.add(k);
            inc(countCells, k);
          }
        }
        break;
      }
      case "row-local": {
        for (const r of f.region?.rows || []) {
          const vr = mapRow(r);
          if (vr >= 0 && vr < nVisRows) {
            unionRows.add(vr);
            inc(countRows, vr);
          }
        }
        break;
      }
      case "column-local": {
        for (const c of f.region?.cols || []) {
          const vc = mapCol(c);
          if (vc != null) {
            unionCols.add(vc);
            inc(countCols, vc);
          }
        }
        break;
      }
      case "dataset-wide":
        hasWholeTable = true;
        break;
      case "unscoped":
        // S193 add-8: unscoped findings (localised test fired but the
        // location could not be isolated) flip hasUnscoped, NOT
        // hasWholeTable. Any table treatment (wash OR dim) would be a
        // false localisation claim; the caption carries the message and
        // the data block stays at rest. dataset-wide keeps the wash.
        hasUnscoped = true;
        break;
      // No default — unknown localities contribute nothing.
    }
  }

  return { hasWholeTable, hasUnscoped, unionCells, unionRows, unionCols, countCells, countRows, countCols };
}

// ── Per-test builders ───────────────────────────────────────────────

/**
 * IRC: column tint + brackets. No row highlighting.
 * Source: globally suspicious pairs (d.suspicious === true) — individual brackets.
 * Windowed pairs are informational only (shown in card evidence table).
 */
function buildIrcSpec(results, ctx) {
  const ircResult = results.find(r => r.name === IRC);
  if (!ircResult?.details?.length) return { ...EMPTY_SPEC, dimNonRelevant: false, suppressConvergenceHeat: true };

  const { matColToVisCol } = ctx;
  const globalPairs = ircResult.details.filter(d => !d.source);

  const tintedVisCols = new Set();
  const brackets = [];

  // Helper: resolve matCol to visCol and add tint + bracket
  const addPair = (matCol1, matCol2, label) => {
    if (matCol1 == null || matCol2 == null) return;
    const vi1 = matColToVisCol[matCol1];
    const vi2 = matColToVisCol[matCol2];
    if (vi1 == null || vi2 == null) return;
    tintedVisCols.add(vi1);
    tintedVisCols.add(vi2);
    brackets.push({ viStart: Math.min(vi1, vi2), viEnd: Math.max(vi1, vi2), label });
  };

  // Globally suspicious pairs — individual brackets
  for (const d of globalPairs) {
    if (!d.suspicious) continue;
    addPair(d.matCol1, d.matCol2, `r = ${parseFloat(d.r).toFixed(2)}`);
  }

  return {
    ...EMPTY_SPEC,
    tintedVisCols: tintedVisCols.size > 0 ? tintedVisCols : null,
    tintColor: IRC_TINT,
    brackets,
    // IRC: no row dimming, no convergence-based highlight — column tint only
    dimNonRelevant: false,
    boldRelevant: false,
    suppressConvergenceHeat: true,
  };
}

/**
 * RSC: per-cell residual intensity heatmap by condition.
 */
function buildRscSpec(results, ctx) {
  const { condPerCol, visColIndices } = ctx;
  if (!condPerCol) return { ...EMPTY_SPEC };

  const rscResult = results.find(r => r.name === RSC);
  if (!rscResult?.allProfiles?.length) return { ...EMPTY_SPEC };

  const byName = {};
  let globalMax = 0;
  for (const p of rscResult.allProfiles) {
    byName[p.name] = p.absResid;
    for (const v of p.absResid) {
      if (v != null && Math.abs(v) > globalMax) globalMax = Math.abs(v);
    }
  }
  if (globalMax === 0) return { ...EMPTY_SPEC };

  // Build condition lookup per visual column
  const visColCond = visColIndices.map(ci => condPerCol[ci] || "");

  const cellColor = (ri, vi) => {
    const condName = visColCond[vi];
    const profile = condName ? byName[condName] : null;
    const residual = profile ? profile[ri] : null;
    const intensity = residual != null ? Math.abs(residual) / globalMax : 0;
    return rscCellColor(intensity);
  };

  const cellTextColor = (ri, vi) => {
    const bg = cellColor(ri, vi);
    return bg ? C.TEXT : null;
  };

  return {
    ...EMPTY_SPEC,
    cellColor,
    cellTextColor,
    dimNonRelevant: false,
    suppressConvergenceHeat: true,
  };
}

/**
 * LOESS: two-tone row tint + changepoint boundaries.
 */
function buildLoessSpec(results, ctx) {
  const { rowMap, nVisRows } = ctx;
  const loess = results.find(r => r.name === LOESS);
  if (!loess?.regionComparison?.length) return { ...EMPTY_SPEC };

  const expandRange = (s) => {
    const m = String(s).match(/(\d+)\s*[–\-]\s*(\d+)/);
    if (!m) return [];
    const start = parseInt(m[1]) - 1, end = parseInt(m[2]) - 1;
    const rows = [];
    for (let r = start; r <= end; r++) rows.push(r);
    return rows;
  };

  const rowTint = new Map();
  const changepointVisRows = new Set();

  for (const seg of loess.regionComparison) {
    const rows = expandRange(seg.rows);
    const tint = seg.finding === "As expected" ? LOESS_EXPECTED_TINT : LOESS_ANOMALOUS_TINT;
    for (const mr of rows) {
      const vr = rowMap ? (rowMap[mr] ?? mr) : mr;
      if (vr >= 0 && vr < nVisRows) rowTint.set(vr, tint);
    }
  }

  for (let i = 0; i < loess.regionComparison.length - 1; i++) {
    const rows = expandRange(loess.regionComparison[i].rows);
    if (rows.length) {
      const lastMr = rows[rows.length - 1];
      const vr = rowMap ? (rowMap[lastMr] ?? lastMr) : lastMr;
      if (vr >= 0 && vr < nVisRows) changepointVisRows.add(vr);
    }
  }

  if (rowTint.size === 0) return { ...EMPTY_SPEC };

  return {
    ...EMPTY_SPEC,
    rowTint,
    changepointVisRows: [...changepointVisRows],
    dimNonRelevant: false,
    suppressConvergenceHeat: true,
  };
}

/**
 * DupDet: group row tints + within-row cell tints.
 * Group style maps are used by HotspotExcerpt for marker cell rendering
 * and counterpart row expansion (which require interactive state).
 */
function buildDupDetSpec(results, ctx) {
  const { groups, rowMap, nVisRows, matColToVisCol } = ctx;

  // Group style map — cycling colors for exact-duplicate groups
  const dupGroupStyleMap = new Map();
  let idx = 0;
  for (const g of groups) {
    if (g.type === "exact") {
      const ci = idx % DUP_GROUP_TINTS.length;
      dupGroupStyleMap.set(g.id, {
        tint: DUP_GROUP_TINTS[ci],
        counterpartTint: DUP_COUNTERPART_TINTS[ci],
        border: DUP_COUNTERPART_BORDERS[ci],
      });
      idx++;
    }
  }

  // Shortcut: tint-only lookup
  const dupGroupTintMap = new Map();
  for (const [id, s] of dupGroupStyleMap) dupGroupTintMap.set(id, s.tint);

  // Within-row match map
  let dupWithinRowMap = null;
  const dupResult = results.find(r => r.name === DUP);
  if (dupResult?.withinRowLocs?.length) {
    // First pass: stable color per unique column-pair set
    const pairColorMap = new Map();
    for (const loc of dupResult.withinRowLocs) {
      for (const g of loc.groups) {
        const key = [...g.cols].sort((a, b) => a - b).join(",");
        if (!pairColorMap.has(key)) {
          pairColorMap.set(key, DUP_WITHIN_ROW_PALETTE[pairColorMap.size % DUP_WITHIN_ROW_PALETTE.length]);
        }
      }
    }
    // Second pass: build per-row col→color map
    const map = new Map();
    for (const loc of dupResult.withinRowLocs) {
      const matRow = loc.row - 1;
      const visRow = rowMap ? (rowMap[matRow] ?? matRow) : matRow;
      if (visRow < 0 || visRow >= nVisRows) continue;
      const colMap = new Map();
      for (const g of loc.groups) {
        const key = [...g.cols].sort((a, b) => a - b).join(",");
        const tint = pairColorMap.get(key);
        for (const mc of g.cols) {
          const vc = matColToVisCol[mc];
          if (vc != null) colMap.set(vc, tint);
        }
      }
      if (colMap.size > 0) map.set(visRow, colMap);
    }
    if (map.size > 0) dupWithinRowMap = map;
  }

  return {
    ...EMPTY_SPEC,
    dupGroupStyleMap,
    dupGroupTintMap,
    dupWithinRowMap,
    dimNonRelevant: true,
    boldRelevant: true,
  };
}

/**
 * Mahalanobis: uses generic convergence grid highlighting but suppresses bold text.
 * Individual values look normal — the flag is about joint improbability.
 */
function buildMahalSpec() {
  return {
    ...EMPTY_SPEC,
    dimNonRelevant: true,
    boldRelevant: false,
  };
}

/**
 * Generic: convergence-grid-based cell relevance. Dim non-relevant, bold relevant.
 */
function buildGenericSpec() {
  return {
    ...EMPTY_SPEC,
    dimNonRelevant: true,
    boldRelevant: true,
  };
}

// ── Dispatch map ────────────────────────────────────────────────────
const BUILDERS = {
  [RSC]:   buildRscSpec,
  [IRC]:   buildIrcSpec,
  [LOESS]: buildLoessSpec,
  [DUP]:   buildDupDetSpec,
  [MAHAL]: buildMahalSpec,
  // Windowed Autocorrelation uses the generic convergence-grid path —
  // flagged-window row × pair-col pairs flow through convergence.js
  // (source:'window' + significant=true) and render via HotspotExcerpt's
  // convergence heat + dimNonRelevant/boldRelevant.
  [WAC]:   buildGenericSpec,
  // Blocked Mahalanobis uses the generic convergence-grid path — flagged-
  // block row ranges (source:'block' + significant=true) flow through
  // convergence.js and render via HotspotExcerpt's convergence heat +
  // dimNonRelevant/boldRelevant. Covariance is a joint row property, so
  // the whole block row range highlights across all columns (no col filter).
  [BMAHAL]: buildGenericSpec,
};

/**
 * Build the highlight specification for the active selection.
 *
 * @param {string|null} testKey - Active test name (drives per-test
 *                                specialised builders); typically the
 *                                last-added finding's first testId in
 *                                B2b multi-select.
 * @param {object[]|null} results - Test result array from engine
 * @param {object} ctx - Context: { dColMap, visColIndices, condPerCol,
 *                                    rowMap, nVisRows, matColToVisCol,
 *                                    groups, activeFindings? }
 *                       activeFindings: array of active §2 findings
 *                       (S163 B2b multi-select). Each finding's
 *                       locality contributes to the spec's
 *                       `localityCompose` per buildLocalityCompose.
 *                       Empty array → no locality dispatch layered.
 * @returns {HighlightSpec}
 */
export function buildHighlightSpec(testKey, results, ctx) {
  // S163 B2a / B2b: locality dispatch layers even on the empty-builder
  // paths (no test key, no results). Compute the compose first; the
  // builder-driven body still short-circuits to EMPTY_SPEC's fields when
  // there is nothing to paint test-specifically.
  //
  // `dimUncovered` is true when the user has expressed targeted interest
  // (subset mode with ≥1 active finding) — cells outside the active
  // coverage dim to focus attention. In all-on mode dimUncovered stays
  // false even with findings active: the message is "show me everything",
  // and dimming the few uncovered cells would contradict that.
  const localityCompose = buildLocalityCompose(ctx.activeFindings, ctx);
  const dimUncovered = !!ctx.dimUncovered;
  const composed = { ...localityCompose, dimUncovered };
  if (!testKey) return { ...EMPTY_SPEC, localityCompose: composed };
  if (!results) return { ...EMPTY_SPEC, localityCompose: composed };
  const builder = BUILDERS[testKey] || buildGenericSpec;
  const spec = builder(results, ctx);
  return { ...spec, localityCompose: composed };
}

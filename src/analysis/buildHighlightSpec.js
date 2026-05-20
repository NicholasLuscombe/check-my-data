/**
 * Unified click-to-highlight dispatch.
 *
 * Single entry point: buildHighlightSpec(testKey, results, ctx) → HighlightSpec.
 * Internal dispatch map routes each test to its builder. HotspotExcerpt renders
 * from the spec — no component reads test result details for highlight decisions.
 */

import { C } from "../constants/tokens.js";
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
export const LOESS_EXPECTED_TINT  = "rgba(59,130,246,0.10)";  // cool — expected

// DupDet group row tints (cycles for groups beyond 3)
export const DUP_GROUP_TINTS = [
  "rgba(239,68,68,0.12)",   // pink  — group Ⓐ
  "rgba(59,130,246,0.12)",  // blue  — group Ⓑ
  "rgba(34,197,94,0.12)",   // green — group Ⓒ
];
export const DUP_COUNTERPART_TINTS = [
  "rgba(239,68,68,0.07)",
  "rgba(59,130,246,0.07)",
  "rgba(34,197,94,0.07)",
];
export const DUP_COUNTERPART_BORDERS = [
  "rgba(239,68,68,0.5)",
  "rgba(59,130,246,0.5)",
  "rgba(34,197,94,0.5)",
];
export const DUP_WITHIN_ROW_PALETTE = [
  "rgba(139,92,246,0.25)",   // violet
  "rgba(20,184,166,0.25)",   // teal
  "rgba(245,158,11,0.25)",   // amber
  "rgba(244,63,94,0.25)",    // rose
];
export const DUP_DIM_OPACITY = 0.35;

// Generic click-to-highlight tint. S163 B2a: amber → light purple to
// match the §2 density axis (CONVERGENCE_RAMP is now purple too, so
// active-finding cells read as a saturated step on the same axis
// rather than a competing severity hue). ACCENT.PURPLE.color blended
// at ~0.20 sits a touch above the count-1 swatch.
export const HIGHLIGHT_TINT = "rgba(139, 92, 246, 0.22)";

// RSC cell color ramp: SIGNAL.RED.bg → CC.THRESH
export function rscCellColor(intensity) {
  if (intensity < 0.02) return null;
  const r = Math.round(253 + (239 - 253) * intensity);
  const g = Math.round(242 + (68 - 242) * intensity);
  const b = Math.round(242 + (68 - 242) * intensity);
  return `rgb(${r},${g},${b})`;
}

// ── Empty spec (no highlighting) ────────────────────────────────────
// S163 B2a: `localityRegion` carries the active finding's locality
// dispatch (cell-band / row-band / column-band / whole-table). Built
// once at spec time so renderCell does not re-derive per cell.
// LOCALITY_WHOLE_TABLE_WASH is the wash applied across the data block
// for the dataset-wide / unscoped tiers — re-exported here so the
// renderer can paint without reaching back into heatmapColors.
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
  localityRegion: null,
});

export { LOCALITY_WHOLE_TABLE_WASH };

/**
 * Build a locality region for the active finding (S163 B2a W2 / W4).
 * Translates the finding's matrix-coord region into visible-coord sets
 * the renderer can hit-test cheaply, and tags the dispatch kind so the
 * renderer knows which extent + border treatment to apply.
 *
 * Kinds:
 *   "cells"        — cell-local: each flagged cell gets fill + 4-sided
 *                     deeper-purple border.
 *   "row-band"     — row-local: every cell in flagged rows gets fill;
 *                     border on top + bottom edges of each contiguous run.
 *   "column-band"  — column-local: every cell in flagged cols gets fill;
 *                     border on left + right edges of each contiguous run.
 *   "whole-table"  — dataset-wide / unscoped: every data cell gets a
 *                     subtle uniform wash, no border.
 *
 * Returns null when there is no active finding or the locality cannot be
 * classified — the renderer falls back to its no-active-finding path
 * (convergence density only).
 */
function buildLocalityRegion(finding, ctx) {
  if (!finding) return null;
  const { rowMap, matColToVisCol, nVisRows } = ctx;
  const mapRow = (r) => (rowMap ? (rowMap[r] ?? r) : r);
  const mapCol = (c) => (matColToVisCol ? matColToVisCol[c] : c);

  switch (finding.locality) {
    case "cell-local": {
      const visCells = new Set();
      const visRows  = new Set();
      const visCols  = new Set();
      for (const [r, c] of finding.region?.cells || []) {
        const vr = mapRow(r);
        const vc = mapCol(c);
        if (vr >= 0 && vr < nVisRows && vc != null) {
          visCells.add(`${vr},${vc}`);
          visRows.add(vr);
          visCols.add(vc);
        }
      }
      if (!visCells.size) return null;
      return { kind: "cells", visCells, visRows, visCols };
    }
    case "row-local": {
      const visRows = new Set();
      for (const r of finding.region?.rows || []) {
        const vr = mapRow(r);
        if (vr >= 0 && vr < nVisRows) visRows.add(vr);
      }
      if (!visRows.size) return null;
      return { kind: "row-band", visRows };
    }
    case "column-local": {
      const visCols = new Set();
      for (const c of finding.region?.cols || []) {
        const vc = mapCol(c);
        if (vc != null) visCols.add(vc);
      }
      if (!visCols.size) return null;
      return { kind: "column-band", visCols };
    }
    case "dataset-wide":
    case "unscoped":
      return { kind: "whole-table" };
    default:
      return null;
  }
}

// ── Shared IRC pair classification ──────────────────────────────────
/**
 * Classify IRC pairs into two tiers. Used by both the card and the highlight spec.
 * Windowed pairs are informational only (shown in the card's evidence table, not in
 * the heatmap or highlight).
 *
 * @param {object} ircResult - The IRC test result object
 * @returns {{ elevatedConds: Set<string> }}
 *   elevatedConds: condition names where mean Fisher-z > overall + 1×SD
 */
export function classifyIrcPairs(ircResult) {
  const empty = { elevatedConds: new Set() };
  if (!ircResult?.details?.length) return empty;

  const globalPairs = ircResult.details.filter(d => !d.source);
  if (!globalPairs.length) return empty;

  // Group global pairs by condition
  const condMap = {};
  for (const d of globalPairs) {
    if (!condMap[d.condition]) condMap[d.condition] = [];
    condMap[d.condition].push(d);
  }
  const condNames = Object.keys(condMap);

  // Condition-level elevation: mean Fisher-z per condition > overall + 1×SD
  const elevatedConds = new Set();
  if (condNames.length >= 2) {
    const arctanh = (r) => 0.5 * Math.log((1 + r) / (1 - r));
    const condMeanZ = condNames.map(cond => {
      const rs = condMap[cond].map(d => Math.min(parseFloat(d.r), 0.9999));
      const zs = rs.map(arctanh);
      return zs.reduce((a, b) => a + b, 0) / zs.length;
    });
    const overallMeanZ = condMeanZ.reduce((a, b) => a + b, 0) / condMeanZ.length;
    const sdZ = Math.sqrt(condMeanZ.reduce((s, z) => s + (z - overallMeanZ) ** 2, 0) / condMeanZ.length);
    const threshold = overallMeanZ + sdZ;
    condNames.forEach((cond, i) => {
      if (condMeanZ[i] > threshold) elevatedConds.add(cond);
    });
  }

  return { elevatedConds };
}

// ── Per-test builders ───────────────────────────────────────────────

/**
 * IRC: column tint + brackets. No row highlighting.
 * Two sources via classifyIrcPairs:
 *   1. Globally suspicious pairs (d.suspicious === true) — individual brackets
 *   2. Condition-level elevation — single spanning bracket per condition
 * Windowed pairs are informational only (shown in card evidence table).
 */
function buildIrcSpec(results, ctx) {
  const ircResult = results.find(r => r.name === IRC);
  if (!ircResult?.details?.length) return { ...EMPTY_SPEC, dimNonRelevant: false, suppressConvergenceHeat: true };

  const { matColToVisCol } = ctx;
  const globalPairs = ircResult.details.filter(d => !d.source);
  const { elevatedConds } = classifyIrcPairs(ircResult);

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

  // 1. Globally suspicious pairs — individual brackets
  for (const d of globalPairs) {
    if (!d.suspicious) continue;
    addPair(d.matCol1, d.matCol2, `r = ${parseFloat(d.r).toFixed(2)}`);
  }

  // 2. Elevated conditions — tint all columns, one spanning bracket with mean r
  for (const cond of elevatedConds) {
    const pairs = globalPairs.filter(d => d.condition === cond);
    const condVisCols = new Set();
    for (const d of pairs) {
      if (d.matCol1 != null) { const v = matColToVisCol[d.matCol1]; if (v != null) condVisCols.add(v); }
      if (d.matCol2 != null) { const v = matColToVisCol[d.matCol2]; if (v != null) condVisCols.add(v); }
    }
    if (condVisCols.size === 0) continue;
    for (const vi of condVisCols) tintedVisCols.add(vi);
    const sorted = [...condVisCols].sort((a, b) => a - b);
    const rs = pairs.map(d => parseFloat(d.r));
    const label = rs.length === 1
      ? `r = ${rs[0].toFixed(2)}`
      : `r = ${Math.min(...rs).toFixed(2)}–${Math.max(...rs).toFixed(2)}`;
    brackets.push({ viStart: sorted[0], viEnd: sorted[sorted.length - 1], label });
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
 * Build the highlight specification for the active test.
 *
 * @param {string|null} testKey - Active test name, or null for no highlight
 * @param {object[]|null} results - Test result array from engine
 * @param {object} ctx - Context: { dColMap, visColIndices, condPerCol,
 *                                    rowMap, nVisRows, matColToVisCol,
 *                                    groups, activeFinding? }
 *                       activeFinding: the active §2 finding object (S163
 *                       B2a). Read for finding.locality to dispatch the
 *                       table highlight extent — cell / row-band /
 *                       column-band / whole-table. When null, no locality
 *                       dispatch is layered.
 * @returns {HighlightSpec}
 */
export function buildHighlightSpec(testKey, results, ctx) {
  // S163 B2a: locality dispatch needs to layer even on the empty-builder
  // paths (no test key, no results). Compute the region first; the
  // builder-driven body still short-circuits to EMPTY_SPEC's fields when
  // there is nothing to paint test-specifically.
  const localityRegion = buildLocalityRegion(ctx.activeFinding, ctx);
  if (!testKey) return { ...EMPTY_SPEC, localityRegion };
  if (!results) return { ...EMPTY_SPEC, localityRegion };
  const builder = BUILDERS[testKey] || buildGenericSpec;
  const spec = builder(results, ctx);
  return { ...spec, localityRegion };
}

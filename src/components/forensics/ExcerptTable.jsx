/* ── ExcerptTable — deep-look table excerpt for spatial findings (S126c-b) ──
   Mounted inside the click-to-zoom modal (DeepLookModal) as the deeper-
   inspection surface beneath the modal's pill cluster + chip cluster +
   full-resolution MinimapStrip. Internally still composes a vertical
   row strip (table-coupled SegmentMinimap, with viewport indicator +
   click-to-scroll) and a horizontal column-density strip (ColMinimap)
   alongside the scrollable ScrollTable; that triad is the deep-look's
   own visual chrome — distinct from the inline §2 MinimapStrip which
   is a lightweight standalone spatial-nav surface that needs no table.

   Decoupling rationale (S126c-a recovery + S126c-b decouple): the
   minimap-and-table tangle that lived inside HotspotExcerpt pre-S126c-a
   was split conceptually in S126c-a (inline MinimapStrip surfaced; this
   component deferred to modal scope). S126c-b lands the physical
   decouple: ExcerptTable is the canonical home of the table-excerpt
   surface; views/HotspotExcerpt.jsx remains as a back-compat re-export
   shim for the dormant WhereToLookSection consumer.

   Layout:
     Left: SVG minimap of focused-row range coloured by convergence density.
     Right: Scrollable data table with heatmap cell shading.
     Below: Horizontal column-density minimap (when h-scroll active).

   New `region` prop (S126c-b): when supplied, the table auto-scrolls
   to `region.rowRange[0]` on mount so the modal opens pre-zoomed to the
   clicked region. Falls back to the existing scrollToHotspot(0)
   auto-scroll behaviour when `region` is null/absent (back-compat for
   the WhereToLookSection import path). */

import { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback, Fragment } from "react";
import { C, FS, FW, FF, CR, SIGNAL, SEV_VERDICT, UI, MECH_COLOR } from "../../constants/tokens.js";
import { MINIMAP_CALLOUT_TYPOGRAPHY } from "../shared/Section.jsx";
import { MECHANISMS, TEST_MECHANISM, TEST_KEY_TO_NAME, RANK_NUMS } from "../../constants/mechanisms.js";
import { ROLES, buildCondColorMap } from "../../constants/roles.js";
import { colToExcelLetter, shortColName, buildCondSpansForColumns } from "../shared/coordinates.js";
import { convergenceCellBg, convergenceCellTextColor, convergenceRampStyle, convergenceMinimapStyle, CONVERGENCE_RAMP } from "../shared/heatmapColors.js";
import { TD_NUM_CELL, TD_ID_CELL, COL_W, FREEZE_COL_W, FREEZE_Z, countFrozenCols } from "../shared/styles.js";
import { ScrollTable, blendOnto } from "../shared/ScrollTable.jsx";

const CONTEXT_ROWS = 2;
const EDGE_THRESHOLD = 5; // extend to dataset edge rather than skipping ≤ this many rows
// Cell text colors matching import table: label=purple, condition=gold, data=default
const ROLE_COLOR = { label: ROLES.label.color, condition: UI.WARN.text, data: C.TEXT };

// ── Highlight dispatch — all click-to-highlight logic centralized ──
import { buildHighlightSpec, IRC_TINT, DUP_DIM_OPACITY, HIGHLIGHT_TINT } from "../../analysis/buildHighlightSpec.js";

// ── S126b: pulse-target context for region overlays on the minimap ──
import { usePulseTick } from "./pulseContext.jsx";

const DUP_DET_TEST_NAME = "Exact Duplicate Detection";

// ── IRC bracket strip — connecting arcs between elevated pairs ──
const BRACKET_BASE_H = 24;  // height for a single row of brackets
const BRACKET_ROW_H = 16;   // additional height per extra bracket row
const BRACKET_PAD = 8;      // horizontal padding around label for overlap test

/**
 * Assign each bracket to a row (0-indexed from top) so that no two brackets
 * in the same row overlap horizontally. Brackets sorted by viStart; each is
 * placed in the lowest row where its x-range doesn't collide.
 */
function assignBracketRows(brackets, colCenters) {
  // Resolve x-ranges and sort by start
  const items = brackets.map((b, i) => {
    const x1 = colCenters[b.viStart] ?? 0;
    const x2 = colCenters[b.viEnd] ?? 0;
    return { i, x1: Math.min(x1, x2), x2: Math.max(x1, x2), label: b.label };
  }).sort((a, b) => a.x1 - b.x1);

  // rows[r] = rightmost x-end of brackets assigned to row r
  const rows = [];
  const assignment = new Array(brackets.length).fill(0);

  for (const item of items) {
    // Use the wider of: bracket span, or label width estimate (± padding)
    const labelW = item.label.length * 6 + BRACKET_PAD * 2; // ~6px per mono char
    const xMid = (item.x1 + item.x2) / 2;
    const rangeStart = Math.min(item.x1, xMid - labelW / 2);
    const rangeEnd = Math.max(item.x2, xMid + labelW / 2);

    let placed = false;
    for (let r = 0; r < rows.length; r++) {
      if (rows[r] <= rangeStart) {
        rows[r] = rangeEnd;
        assignment[item.i] = r;
        placed = true;
        break;
      }
    }
    if (!placed) {
      assignment[item.i] = rows.length;
      rows.push(rangeEnd);
    }
  }

  return { assignment, nRows: rows.length };
}

function IrcBracketStrip({ brackets, colEntries, hasMarker, tableRef, onHeightChange }) {
  const stripRef = useRef(null);
  const [colCenters, setColCenters] = useState({});
  const [svgWidth, setSvgWidth] = useState(0);

  // Measure column centers from actual rendered <th> positions using getBoundingClientRect
  // relative to the strip container, so coordinates match the SVG coordinate space.
  const measure = useCallback(() => {
    const scrollEl = tableRef?.current;
    const strip = stripRef.current;
    if (!scrollEl || !strip) return;
    const letterRow = scrollEl.querySelector("thead tr");
    if (!letterRow) return;
    const ths = letterRow.querySelectorAll("th");
    const stripRect = strip.getBoundingClientRect();
    // Letter row: th[0] = #, th[1] = marker (if hasMarker), then colEntries[0..n]
    const skip = 1 + (hasMarker ? 1 : 0);
    const centers = {};
    for (let i = skip; i < ths.length && (i - skip) < colEntries.length; i++) {
      const thRect = ths[i].getBoundingClientRect();
      centers[colEntries[i - skip].vi] = thRect.left - stripRect.left + strip.scrollLeft + thRect.width / 2;
    }
    setColCenters(centers);
    const table = scrollEl.querySelector("table");
    if (table) setSvgWidth(table.scrollWidth);
  }, [tableRef, colEntries, hasMarker]);

  // Run after DOM layout so <th> elements have positions
  useLayoutEffect(measure, [measure]);

  // Recalculate on container resize
  useEffect(() => {
    const scrollEl = tableRef?.current;
    if (!scrollEl) return;
    const ro = new ResizeObserver(measure);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [tableRef, measure]);

  // Sync horizontal scroll with the table
  useEffect(() => {
    const el = tableRef?.current;
    const strip = stripRef.current;
    if (!el || !strip) return;
    const sync = () => { strip.scrollLeft = el.scrollLeft; };
    el.addEventListener("scroll", sync, { passive: true });
    sync();
    return () => el.removeEventListener("scroll", sync);
  }, [tableRef]);

  // Assign brackets to rows to avoid label overlap
  const { assignment, nRows } = useMemo(
    () => assignBracketRows(brackets, colCenters),
    [brackets, colCenters]
  );

  const stripH = nRows <= 1 ? BRACKET_BASE_H : BRACKET_BASE_H + (nRows - 1) * BRACKET_ROW_H;

  // Notify parent of height changes (for minimap offset)
  const prevH = useRef(0);
  useEffect(() => {
    const h = svgWidth > 0 ? stripH : 0;
    if (h !== prevH.current) {
      prevH.current = h;
      onHeightChange?.(h);
    }
  }, [stripH, svgWidth, onHeightChange]);

  // Container div always mounts so stripRef is available for measurement.
  // SVG content renders only after measurement completes (svgWidth > 0).
  return (
    <div ref={stripRef} style={{ overflowX: "hidden", width: "100%", height: svgWidth ? stripH : 0 }}>
      {svgWidth > 0 && (
        <svg width={svgWidth} height={stripH} style={{ display: "block" }}>
          {brackets.map((b, i) => {
            const x1 = colCenters[b.viStart] ?? 0;
            const x2 = colCenters[b.viEnd] ?? 0;
            const xMid = (x1 + x2) / 2;
            const row = assignment[i] || 0;
            const yTop = 4 + row * BRACKET_ROW_H;
            const yBot = stripH - 2;
            // U-shaped bracket: vertical tick down at each end + horizontal line across top
            return (
              <g key={i}>
                <line x1={x1} y1={yTop} x2={x1} y2={yBot} stroke={C.TEXT_3} strokeWidth={1} />
                <line x1={x2} y1={yTop} x2={x2} y2={yBot} stroke={C.TEXT_3} strokeWidth={1} />
                <line x1={x1} y1={yTop} x2={x2} y2={yTop} stroke={C.TEXT_3} strokeWidth={1} />
                <text x={xMid} y={yTop + 12} textAnchor="middle"
                  style={{ fontSize: "9px", fontFamily: FF.MONO, fill: C.TEXT_3 }}>
                  {/* Chart-annotation glyph — carve-out per TYPOGRAPHY-SYSTEM.md
                      §"What this system does NOT cover" (charts + chart-internal
                      labels). Hardcoded pending the chart-typography pass. */}
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ── Coordinate helpers ──────────────────────────────────────────────

function remapGrid(grid, rowMap, matColToVisCol, nVisRows, nVisCols) {
  const remapped = new Map();
  for (const [key, cell] of grid) {
    const [mr, mc] = key.split(",").map(Number);
    const visRow = rowMap ? (rowMap[mr] ?? mr) : mr;
    const visCol = matColToVisCol[mc];
    if (visCol == null || visRow < 0 || visRow >= nVisRows) continue;
    const nk = `${visRow},${visCol}`;
    const existing = remapped.get(nk);
    if (existing) {
      for (const t of cell.tests) { if (!existing.tests.includes(t)) { existing.tests.push(t); existing.count++; } }
      for (const c of cell.categories) { if (!existing.categories.includes(c)) existing.categories.push(c); }
      if (cell.maxSeverity > existing.maxSeverity) existing.maxSeverity = cell.maxSeverity;
    } else {
      remapped.set(nk, { ...cell, tests: [...cell.tests], categories: [...cell.categories] });
    }
  }
  return remapped;
}

function remapHotspots(hotspots, rowMap, matColToVisCol) {
  return hotspots.map(h => ({
    ...h,
    rowStart: rowMap ? (rowMap[h.rowStart] ?? h.rowStart) : h.rowStart,
    rowEnd:   rowMap ? (rowMap[h.rowEnd]   ?? h.rowEnd)   : h.rowEnd,
    colStart: matColToVisCol[h.colStart] ?? h.colStart,
    colEnd:   matColToVisCol[h.colEnd]   ?? h.colEnd,
  }));
}

// Merge overlapping/adjacent hotspots
function mergeHotspots(raw) {
  if (raw.length <= 1) return raw;
  const sorted = [...raw].sort((a, b) => a.rowStart - b.rowStart);
  const merged = [{ ...sorted[0], tests: [...sorted[0].tests], categories: [...sorted[0].categories] }];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.rowStart <= prev.rowEnd + 2) {
      prev.rowEnd = Math.max(prev.rowEnd, cur.rowEnd);
      prev.colStart = Math.min(prev.colStart, cur.colStart);
      prev.colEnd = Math.max(prev.colEnd, cur.colEnd);
      prev.maxCount = Math.max(prev.maxCount, cur.maxCount);
      for (const t of cur.tests) { if (!prev.tests.includes(t)) prev.tests.push(t); }
      for (const c of cur.categories) { if (!prev.categories.includes(c)) prev.categories.push(c); }
      prev.score = prev.maxCount * prev.tests.length;
      prev.cellCount += cur.cellCount;
      prev.maxSeverity = Math.max(prev.maxSeverity, cur.maxSeverity);
    } else {
      merged.push({ ...cur, tests: [...cur.tests], categories: [...cur.categories] });
    }
  }
  merged.sort((a, b) => b.score - a.score || b.maxCount - a.maxCount);
  return merged;
}

const TABLE_H = 400;
const MINIMAP_W = 40;

function fmtLoc(h, coordCtx) {
  const fr = coordCtx?.fileRow || ((r) => r + 1);
  const fc = coordCtx?.fileColVis || ((c) => String(c + 1));
  const r1 = fr(h.rowStart), r2 = fr(h.rowEnd);
  const c1 = fc(h.colStart), c2 = fc(h.colEnd);
  const rows = r1 === r2 ? `Row ${r1}` : `Rows ${r1}–${r2}`;
  const cols = c1 === c2 ? `Col ${c1}` : `Cols ${c1}–${c2}`;
  return `${rows}, ${cols}`;
}

// ── SVG Minimap ─────────────────────────────────────────────────────

const GAP_WEIGHT = 2; // gap takes 2 row-heights — enough for visible dashed pair

/** SVG minimap that maps proportionally into the visible table height.
 *  Click to scroll. Viewport indicator tracks visible portion.
 *
 *  S126b: also renders region-number overlays for State B sticky surface.
 *  regionOverlays: [{ regionNumber, severity, visRowStart }] — displayed as
 *  small badges anchored to their first row's y-position. Click → fires
 *  onRegionActivate(regionNumber). */
function SegmentMinimap({ visGrid, rowSegments, height, tableRef, headerH, activeTestKey = null,
  regionOverlays = null, onRegionActivate = null }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const [viewFrac, setViewFrac] = useState([0, 1]); // [startFrac, endFrac] of content

  // Build row layout: compute total weight and per-row positions
  const layout = useMemo(() => {
    const items = []; // { type:"row"|"gap", ri?, y, h }
    let totalW = 0;
    for (const seg of rowSegments) {
      totalW += seg.rows.length;
      if (seg.gapAfter > 0) totalW += GAP_WEIGHT;
    }
    if (totalW === 0) return { items: [], totalW: 0 };

    // Pre-compute max flag count per visible row (filter by active test when set)
    const rowMaxMap = new Map();
    for (const [key, c] of visGrid) {
      if (activeTestKey && !c.tests.includes(activeTestKey)) continue;
      const r = parseInt(key.split(",")[0]);
      const cur = rowMaxMap.get(r) || 0;
      if (c.count > cur) rowMaxMap.set(r, c.count);
    }

    let y = 0;
    for (const seg of rowSegments) {
      for (const ri of seg.rows) {
        const h = height / totalW;
        items.push({ type: "row", ri, y, h, count: rowMaxMap.get(ri) || 0 });
        y += h;
      }
      if (seg.gapAfter > 0) {
        const h = (GAP_WEIGHT * height) / totalW;
        items.push({ type: "gap", y, h });
        y += h;
      }
    }
    return { items, totalW };
  }, [rowSegments, visGrid, height, activeTestKey]);

  // Track table scroll to update viewport indicator
  const updateViewFrac = useCallback(() => {
    const el = tableRef?.current;
    if (!el) return;
    const scrollableH = el.scrollHeight - headerH;
    const viewportH = el.clientHeight - headerH;
    if (scrollableH <= 0 || viewportH <= 0) { setViewFrac([0, 1]); return; }
    const scrollTop = Math.max(0, el.scrollTop);
    const start = scrollTop / scrollableH;
    const end = Math.min(1, (scrollTop + viewportH) / scrollableH);
    setViewFrac([start, end]);
  }, [tableRef, headerH]);

  useEffect(() => {
    const el = tableRef?.current;
    if (!el) return;
    el.addEventListener("scroll", updateViewFrac, { passive: true });
    updateViewFrac();
    return () => el.removeEventListener("scroll", updateViewFrac);
  }, [tableRef, updateViewFrac]);

  // Click/drag to scroll the table
  const scrollToY = useCallback((clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const el = tableRef?.current;
    if (!rect || !el) return;
    const frac = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const scrollableH = el.scrollHeight - headerH;
    el.scrollTop = frac * scrollableH;
  }, [tableRef, headerH]);

  const handlePointerDown = useCallback((e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrollToY(e.clientY);
  }, [scrollToY]);

  const handlePointerMove = useCallback((e) => {
    if (dragging.current) scrollToY(e.clientY);
  }, [scrollToY]);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  if (!layout.items.length) return null;

  return (
    <div ref={svgRef} style={{ width: MINIMAP_W, flexShrink: 0, cursor: "pointer", touchAction: "none" }}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <svg width={MINIMAP_W} height={height} style={{ display: "block", border: `1px solid ${C.BORDER_L}`, borderRadius: 4, background: C.WHITE }}>
        {layout.items.map((item, i) => {
          if (item.type === "gap") {
            return (
              <g key={`g${i}`}>
                <rect x={0} y={item.y} width={MINIMAP_W} height={item.h} fill={C.BG} />
                <line x1={2} y1={item.y + 1} x2={MINIMAP_W - 2} y2={item.y + 1}
                  stroke={C.TEXT_3} strokeWidth={0.5} strokeDasharray="2,2" />
                <line x1={2} y1={item.y + item.h - 1} x2={MINIMAP_W - 2} y2={item.y + item.h - 1}
                  stroke={C.TEXT_3} strokeWidth={0.5} strokeDasharray="2,2" />
              </g>
            );
          }
          if (activeTestKey) {
            // Active test: tint highlighted rows, dim the rest
            const hit = item.count > 0;
            return (
              <rect key={item.ri} x={0} y={item.y} width={MINIMAP_W} height={Math.max(item.h, 1)}
                fill={hit ? "#F59E0B" : C.BG_L} opacity={hit ? 0.45 : 0.5} />
            );
          }
          const rs = convergenceMinimapStyle(item.count);
          return (
            <rect key={item.ri} x={0} y={item.y} width={MINIMAP_W} height={Math.max(item.h, 1)}
              fill={rs ? rs.color : "transparent"} opacity={rs ? rs.opacity : 0} />
          );
        })}
        {/* Viewport indicator */}
        <rect x={0} y={viewFrac[0] * height} width={MINIMAP_W}
          height={Math.max((viewFrac[1] - viewFrac[0]) * height, 4)}
          fill="none" stroke={SEV_VERDICT[3].color} strokeWidth={1.5} rx={2} opacity={0.7} />
        {/* S126b: region-number overlays — anchored to each region's first row */}
        {regionOverlays && regionOverlays.length > 0 && regionOverlays.map(ov => {
          const item = layout.items.find(it => it.type === "row" && it.ri === ov.visRowStart);
          if (!item) return null;
          return (
            <RegionBadge key={ov.regionNumber} overlay={ov} y={item.y}
              onActivate={onRegionActivate} />
          );
        })}
      </svg>
    </div>
  );
}

/** Single region-number badge. Listens to its own pulse tick so a chip
 *  click pulses the corresponding overlay. Click stops propagation so the
 *  enclosing minimap drag-to-scroll handler doesn't fire.
 *
 *  Pulse visual: a transient ring overlay fades out via a setTimeout-
 *  driven local state. CSS box-shadow doesn't apply to SVG elements, so
 *  the `usePulseAnimation` HTML-element hook can't drive this directly. */
function RegionBadge({ overlay, y, onActivate }) {
  const tick = usePulseTick(`region:${overlay.regionNumber}`);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (!tick) return;
    setPulsing(true);
    const id = setTimeout(() => setPulsing(false), 1400);
    return () => clearTimeout(id);
  }, [tick]);
  const fill = overlay.severity === "HIGH" ? SEV_VERDICT[3].color
              : overlay.severity === "MOD" ? SEV_VERDICT[2].color
              : SEV_VERDICT[0].color;
  const handleClick = (e) => {
    e.stopPropagation();
    onActivate?.(overlay.regionNumber);
  };
  return (
    <g onClick={handleClick} style={{ cursor: "pointer" }}>
      <rect x={2} y={y} width={MINIMAP_W - 4} height={12}
        fill={fill} rx={2} />
      {/* RegionBadge glyph — chart-annotation carve-out per TYPOGRAPHY-SYSTEM.md
          §"What this system does NOT cover". Mirrors MinimapStrip's RegionBadge
          (retired 9px legacy token → hardcoded literal at S149-fix1 piece 2). */}
      <text x={MINIMAP_W / 2} y={y + 9} textAnchor="middle"
        style={{ fontSize: "9px", fontFamily: FF.UI, fontWeight: FW.BOLD, fill: C.WHITE,
          pointerEvents: "none" }}>
        {overlay.regionNumber}
      </text>
      {pulsing && (
        <rect x={0} y={y - 2} width={MINIMAP_W} height={16}
          fill="none" stroke={fill} strokeWidth={2.5} rx={3}
          style={{ pointerEvents: "none" }}>
          <animate attributeName="opacity" from="1" to="0" dur="1.4s" repeatCount="1" />
          <animate attributeName="stroke-width" from="3" to="0" dur="1.4s" repeatCount="1" />
        </rect>
      )}
    </g>
  );
}

// ── Horizontal column minimap ───────────────────────────────────────

const COL_MINIMAP_H = 14;

/** Horizontal minimap below the table — proportional to actual column widths.
 *  Frozen columns shown in neutral grey, DATA columns use warm convergence ramp.
 *  Click/drag to scroll horizontally. Viewport indicator tracks visible columns. */
function ColMinimap({ visGrid, colEntries, tableRef, freeze, activeTestKey = null, hasGroups = false }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const [viewFrac, setViewFrac] = useState([0, 1]); // [startFrac, endFrac] of scrollWidth

  // Build column layout: only scrollable (non-frozen) data columns.
  // Frozen columns are excluded — the minimap represents the scrollable region only.
  const layout = useMemo(() => {
    const nFrz = freeze ? freeze.n : 0;
    const cols = []; // { x, w, ci }
    let x = 0;
    for (let ci = nFrz; ci < colEntries.length; ci++) {
      const isData = colEntries[ci].role === "data";
      const w = isData ? COL_W.DATA : COL_W.ID_MIN;
      cols.push({ x, w, ci, isData });
      x += w;
    }
    return { cols, totalW: x };
  }, [colEntries, freeze]);

  // Max flag count per visible column (filter by active test when set)
  const colMax = useMemo(() => {
    const cm = new Map();
    for (const [key, cell] of visGrid) {
      if (activeTestKey && !cell.tests.includes(activeTestKey)) continue;
      const c = parseInt(key.split(",")[1]);
      const cur = cm.get(c) || 0;
      if (cell.count > cur) cm.set(c, cell.count);
    }
    return cm;
  }, [visGrid, activeTestKey]);

  // Compute frozen-column pixel width (# + marker + frozen entries)
  const frozenW = useMemo(() => {
    let w = COL_W.ROW_NUM + (hasGroups ? COL_W.MARKER : 0);
    const nFrz = freeze ? freeze.n : 0;
    for (let ci = 0; ci < nFrz; ci++) w += FREEZE_COL_W.ID_COL;
    return w;
  }, [freeze, hasGroups]);

  // Track horizontal scroll fraction relative to the scrollable (non-frozen) region
  const updateViewFrac = useCallback(() => {
    const el = tableRef?.current;
    if (!el) return;
    const scrollRange = el.scrollWidth - el.clientWidth;
    if (scrollRange <= 0) { setViewFrac([0, 1]); return; }
    const scrollableW = el.scrollWidth - frozenW;
    if (scrollableW <= 0) { setViewFrac([0, 1]); return; }
    const visibleDataW = el.clientWidth - frozenW;
    const frac = el.scrollLeft / scrollableW;
    const viewW = visibleDataW / scrollableW;
    setViewFrac([frac, Math.min(1, frac + viewW)]);
  }, [tableRef, frozenW]);

  useEffect(() => {
    const el = tableRef?.current;
    if (!el) return;
    el.addEventListener("scroll", updateViewFrac, { passive: true });
    updateViewFrac();
    return () => el.removeEventListener("scroll", updateViewFrac);
  }, [tableRef, updateViewFrac]);

  // Click/drag to scroll horizontally — map minimap position to scrollable range
  const scrollToX = useCallback((clientX) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const el = tableRef?.current;
    if (!rect || !el) return;
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const scrollableW = el.scrollWidth - frozenW;
    const visibleDataW = el.clientWidth - frozenW;
    el.scrollLeft = frac * scrollableW - visibleDataW / 2;
  }, [tableRef, frozenW]);

  const handlePointerDown = useCallback((e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrollToX(e.clientX);
  }, [scrollToX]);

  const handlePointerMove = useCallback((e) => {
    if (dragging.current) scrollToX(e.clientX);
  }, [scrollToX]);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  if (!layout.cols.length) return null;

  const W = layout.totalW;
  return (
    <div ref={svgRef} style={{ cursor: "pointer", touchAction: "none" }}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <svg width="100%" height={COL_MINIMAP_H} viewBox={`0 0 ${W} ${COL_MINIMAP_H}`} preserveAspectRatio="none"
        style={{ display: "block", border: `1px solid ${C.BORDER_L}`, borderRadius: 4, background: C.WHITE }}>
        {/* Data columns only — frozen columns excluded from minimap */}
        {layout.cols.map(({ x, w, ci, isData }) => {
          const count = colMax.get(ci) || 0;
          const rs = convergenceMinimapStyle(count);
          return (
            <rect key={ci} x={x} y={0} width={w} height={COL_MINIMAP_H}
              fill={rs ? rs.color : "transparent"} opacity={rs ? rs.opacity : 0} />
          );
        })}
        {/* Viewport indicator */}
        <rect x={viewFrac[0] * W} y={0}
          width={Math.max((viewFrac[1] - viewFrac[0]) * W, 4)} height={COL_MINIMAP_H}
          fill="none" stroke={SEV_VERDICT[3].color} strokeWidth={1.5} rx={2} opacity={0.7} />
      </svg>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function ExcerptTable({
  convergence, rawData, rowMap, colHeaders, visColIndices, dColMap, roles, coordCtx, condPerCol,
  activeTestKey = null, groupMarkerMap = null, middleContent = null, onScrollReady = null,
  results = null,
  // S126b sticky-surface props (optional). regionOverlays paints region-N
  // badges on the row minimap; onRegionActivate is fired on overlay click;
  // hotspotScrollRef receives { scrollToHotspot, scrollToVisRow } so that
  // surfaces rendered outside ExcerptTable (chips, layered narrative) can
  // drive the table scroll.
  findings = null, regionOverlays = null, onRegionActivate = null, hotspotScrollRef = null,
  // S126c-b: when supplied, ExcerptTable auto-scrolls to `region.rowRange[0]`
  // on mount so the modal opens pre-zoomed to the clicked region. Region
  // shape: `{ rowRange: [matFirst, matLast], regionNumber, severity, ... }`
  // (per `findings.js` schema). Fall back to the existing scrollToHotspot(0)
  // auto-scroll when `region` is null.
  region = null,
}) {
  const { grid, hotspots, pattern, groups: rawGroups } = convergence;
  const nVisRows = rawData.length;
  const nVisCols = visColIndices.length;
  const tableRef = useRef(null);
  const theadRef = useRef(null);
  const rowRefs = useRef({});
  const headerZoneRef = useRef(null); // right flex column wrapper (above + including the table)
  const [activeHotspot, setActiveHotspot] = useState(0);
  const [expandedGroup, setExpandedGroup] = useState(null); // { groupId, anchorRow } or null
  const [viewRange, setViewRange] = useState(null);
  const [colViewRange, setColViewRange] = useState(null);
  const [headerH, setHeaderH] = useState(0);
  // headerZoneH: offset from the right flex column's top to the first tbody
  // row, captured in one DOM measurement. Used as the minimap's paddingTop so
  // the strip aligns with the start of table content. Replaces an earlier
  // sum of two separately-measured pieces (thead height + a height-callback
  // from the IRC bracket strip); when the bracket strip re-enables under
  // parked #8a, its contribution is picked up automatically.
  const [headerZoneH, setHeaderZoneH] = useState(0);
  const [needsVScroll, setNeedsVScroll] = useState(false);
  const [needsHScroll, setNeedsHScroll] = useState(false);

  // Collapse group expansion when highlight changes
  useEffect(() => { setExpandedGroup(null); }, [activeTestKey]);

  // Measure thead height + header-zone offset and detect scroll need.
  useEffect(() => {
    if (tableRef.current) {
      const thead = tableRef.current.querySelector("thead");
      if (thead) setHeaderH(thead.getBoundingClientRect().height);
      const tbody = tableRef.current.querySelector("tbody");
      if (tbody && headerZoneRef.current) {
        const zoneTop = headerZoneRef.current.getBoundingClientRect().top;
        const tbodyTop = tbody.getBoundingClientRect().top;
        setHeaderZoneH(Math.max(0, tbodyTop - zoneTop));
      }
      setNeedsVScroll(tableRef.current.scrollHeight > tableRef.current.clientHeight);
      setNeedsHScroll(tableRef.current.scrollWidth > tableRef.current.clientWidth);
    }
  });

  const matColToVisCol = useMemo(() => {
    const map = {};
    dColMap.forEach((rawCI, matCI) => {
      const visIdx = visColIndices.indexOf(rawCI);
      if (visIdx >= 0) map[matCI] = visIdx;
    });
    return map;
  }, [dColMap, visColIndices]);

  const visGrid = useMemo(() => remapGrid(grid, rowMap, matColToVisCol, nVisRows, nVisCols), [grid, rowMap, matColToVisCol, nVisRows, nVisCols]);
  const rawVisHotspots = useMemo(() => remapHotspots(hotspots, rowMap, matColToVisCol), [hotspots, rowMap, matColToVisCol]);
  const visHotspots = useMemo(() => mergeHotspots(rawVisHotspots), [rawVisHotspots]);

  const fr = coordCtx?.fileRow || ((r) => r + 1);

  // Column entries
  const colEntries = useMemo(() => visColIndices.map((rawCI, vi) => ({
    vi, rawCI, role: roles[rawCI],
    label: colHeaders[vi],
  })), [visColIndices, roles, colHeaders]);

  // Condition spans for header
  const condSpans = useMemo(() => {
    if (!condPerCol) return null;
    const visCondPerCol = visColIndices.map(ci => condPerCol[ci] || "");
    if (!visCondPerCol.some(c => c)) return null;
    const spans = [];
    let cur = visCondPerCol[0], len = 1;
    for (let i = 1; i < visCondPerCol.length; i++) {
      if (visCondPerCol[i] === cur) { len++; }
      else { spans.push({ name: cur, len }); cur = visCondPerCol[i]; len = 1; }
    }
    spans.push({ name: cur, len });
    return spans;
  }, [condPerCol, visColIndices]);

  const condColorMap = useMemo(() => buildCondColorMap(condPerCol), [condPerCol]);

  // ── Group data (must be before freeze computation) ──
  const groups = rawGroups || [];
  const hasGroups = groups.length > 0;

  // ── Frozen column computation ──
  // Freeze # col + marker col (if groups) + all consecutive non-DATA columns from the left.
  const freeze = useMemo(() => {
    const colRoles = colEntries.map(c => c.role);
    const n = countFrozenCols(colRoles);
    if (n === 0 && !hasGroups) return null;
    // Cumulative left offsets: index 0 = # col (left:0), index 1..n = frozen data cols
    // Marker column sits between # and the first ID col when hasGroups
    const markerW = hasGroups ? COL_W.MARKER : 0;
    const offsets = [0];
    let left = FREEZE_COL_W.ROW_NUM + markerW;
    for (let i = 0; i < n; i++) {
      offsets.push(left);
      left += FREEZE_COL_W.ID_COL;
    }
    // Condition span analysis: which spans are entirely within frozen zone
    const spanFrozen = [];
    if (condSpans) {
      let spanStart = 0;
      for (const sp of condSpans) {
        const spanEnd = spanStart + sp.len - 1;
        spanFrozen.push(spanEnd < n);
        spanStart += sp.len;
      }
    }
    return { n, offsets, totalW: left, spanFrozen };
  }, [colEntries, condSpans, hasGroups]);

  // Map visible rows → groups (remap matrix rows via rowMap)
  const rowGroupMap = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      for (const matRow of g.rows) {
        const visRow = rowMap ? (rowMap[matRow] ?? matRow) : matRow;
        if (visRow < 0 || visRow >= nVisRows) continue;
        if (!map.has(visRow)) map.set(visRow, []);
        const list = map.get(visRow);
        if (!list.find(eg => eg.id === g.id)) list.push(g);
      }
    }
    return map;
  }, [groups, rowMap, nVisRows]);

  // Marker column left offset (after # col, before frozen ID cols)
  const markerLeft = hasGroups ? FREEZE_COL_W.ROW_NUM : 0;

  // ── Unified highlight spec — single dispatch for all click-to-highlight ──
  const spec = useMemo(
    () => buildHighlightSpec(activeTestKey, results, {
      dColMap, visColIndices, condPerCol, rowMap, nVisRows, matColToVisCol, groups,
    }),
    [activeTestKey, results, dColMap, visColIndices, condPerCol, rowMap, nVisRows, matColToVisCol, groups]
  );

  // Compute exact table width as sum of col widths (for tableLayout:fixed)
  const tableWidth = useMemo(() => {
    let w = COL_W.ROW_NUM + (hasGroups ? COL_W.MARKER : 0);
    for (let ci = 0; ci < colEntries.length; ci++) {
      const isFrozen = freeze && ci < freeze.n;
      const isData = colEntries[ci].role === "data";
      w += isFrozen ? FREEZE_COL_W.ID_COL : isData ? COL_W.DATA : COL_W.ID_MIN;
    }
    return w;
  }, [colEntries, freeze]);

  // Build visible rows: flagged rows ±CONTEXT_ROWS, with dashed breaks between regions.
  // Edge proximity: extend to dataset start/end if the gap would be ≤ EDGE_THRESHOLD rows.
  const visibleRowSet = useMemo(() => {
    const flaggedRows = new Set();
    for (const [key] of visGrid) {
      flaggedRows.add(parseInt(key.split(",")[0]));
    }
    // Also include hotspot ranges
    for (const h of visHotspots) {
      for (let r = h.rowStart; r <= h.rowEnd; r++) flaggedRows.add(r);
    }
    // Expand by ±CONTEXT_ROWS
    const expanded = new Set();
    for (const r of flaggedRows) {
      for (let d = -CONTEXT_ROWS; d <= CONTEXT_ROWS; d++) {
        const ri = r + d;
        if (ri >= 0 && ri < nVisRows) expanded.add(ri);
      }
    }
    // Edge proximity: if the first visible row is within EDGE_THRESHOLD of row 0,
    // extend to include all rows from the start. Same at the bottom.
    if (expanded.size > 0) {
      const minRow = Math.min(...expanded);
      const maxRow = Math.max(...expanded);
      if (minRow > 0 && minRow <= EDGE_THRESHOLD) {
        for (let r = 0; r < minRow; r++) expanded.add(r);
      }
      if (maxRow < nVisRows - 1 && (nVisRows - 1 - maxRow) <= EDGE_THRESHOLD) {
        for (let r = maxRow + 1; r < nVisRows; r++) expanded.add(r);
      }
    }
    return expanded;
  }, [visGrid, visHotspots, nVisRows]);

  // Build row segments: runs of consecutive visible rows, with gap info between.
  // gapBefore on first segment = rows skipped at the top.
  // gapAfter on last segment = rows skipped at the bottom.
  const rowSegments = useMemo(() => {
    const sorted = [...visibleRowSet].sort((a, b) => a - b);
    if (!sorted.length) return [];
    const segs = [];
    let curSeg = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        curSeg.push(sorted[i]);
      } else {
        segs.push({ rows: curSeg, gapAfter: sorted[i] - sorted[i - 1] - 1, gapBefore: 0 });
        curSeg = [sorted[i]];
      }
    }
    segs.push({ rows: curSeg, gapAfter: 0, gapBefore: 0 });
    // Top gap: rows before first visible row
    if (segs.length > 0 && sorted[0] > 0) {
      segs[0].gapBefore = sorted[0];
    }
    // Bottom gap: rows after last visible row
    if (segs.length > 0 && sorted[sorted.length - 1] < nVisRows - 1) {
      segs[segs.length - 1].gapAfter = nVisRows - 1 - sorted[sorted.length - 1];
    }
    return segs;
  }, [visibleRowSet, nVisRows]);

  // Scroll to a specific row — virtualized tables use __scrollToRow (row may not be in DOM)
  const scrollToRow = useCallback((row) => {
    if (rowRefs.current.__scrollToRow) {
      rowRefs.current.__scrollToRow(row);
      return;
    }
    const el = rowRefs.current[row];
    if (el && tableRef.current) {
      const containerH = tableRef.current.clientHeight;
      tableRef.current.scrollTop = el.offsetTop - containerH / 2 + el.offsetHeight / 2;
    }
  }, []);

  // Scroll to a specific column
  const scrollToCol = useCallback((col) => {
    const el = tableRef.current;
    if (!el || nVisCols <= 0) return;
    const scrollW = el.scrollWidth - el.clientWidth;
    if (scrollW > 0) {
      el.scrollLeft = (col / nVisCols) * el.scrollWidth;
    }
  }, [nVisCols]);

  // Scroll to hotspot
  const scrollToHotspot = useCallback((idx) => {
    setActiveHotspot(idx);
    const h = visHotspots[idx];
    if (h) scrollToRow(h.rowStart);
  }, [visHotspots, scrollToRow]);

  // Track visible row + column range from table scroll position
  const handleTableScroll = useCallback(() => {
    const el = tableRef.current;
    if (!el || nVisRows <= 0) return;
    // Vertical
    const scrollH = el.scrollHeight - el.clientHeight;
    const frac = scrollH > 0 ? el.scrollTop / scrollH : 0;
    const visibleRows = Math.round(el.clientHeight / 30);
    const firstRow = Math.round(frac * (nVisRows - visibleRows));
    setViewRange([Math.max(0, firstRow), Math.min(nVisRows, firstRow + visibleRows)]);
    // Horizontal
    const scrollW = el.scrollWidth - el.clientWidth;
    if (scrollW > 0 && nVisCols > 0) {
      const fracX = el.scrollLeft / scrollW;
      const visibleCols = Math.round((el.clientWidth / el.scrollWidth) * nVisCols);
      const firstCol = Math.round(fracX * (nVisCols - visibleCols));
      setColViewRange([Math.max(0, firstCol), Math.min(nVisCols, firstCol + visibleCols)]);
    } else {
      setColViewRange([0, nVisCols]);
    }
  }, [nVisRows, nVisCols]);

  // Register scroll function for external callers (WhereToLookSection Layer 2)
  useEffect(() => {
    if (onScrollReady) onScrollReady(scrollToHotspot);
  }, [onScrollReady, scrollToHotspot]);

  // S126b: expose scroll fns via shared ref so chips / region overlays
  // rendered outside ExcerptTable can drive the table.
  useEffect(() => {
    if (hotspotScrollRef) {
      hotspotScrollRef.current = { scrollToHotspot, scrollToVisRow: scrollToRow };
    }
    return () => {
      if (hotspotScrollRef) hotspotScrollRef.current = null;
    };
  }, [hotspotScrollRef, scrollToHotspot, scrollToRow]);

  // Auto-scroll on mount.
  //   S126c-b: when `region` prop is supplied, scroll to its rowRange[0]
  //     (mapped through rowMap) so the modal opens pre-zoomed to the
  //     clicked region. The `region` value comes from a finding object;
  //     `region.rowRange` is matrix coords, mapped to vis coords via
  //     rowMap when supplied (rowMap[matRow] = visRow, with identity
  //     fallback when rowMap is undefined).
  //   Fallback (region null): existing scrollToHotspot(0) behaviour
  //     so the WhereToLookSection re-export shim continues to work.
  useEffect(() => {
    if (region && region.rowRange) {
      const matRow = region.rowRange[0];
      const visRow = rowMap ? (rowMap[matRow] ?? matRow) : matRow;
      // Delay to ensure DOM is rendered.
      setTimeout(() => scrollToRow(visRow), 50);
      return;
    }
    if (visHotspots.length > 0) {
      setTimeout(() => scrollToHotspot(0), 50);
    }
  }, [region, visHotspots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Truly clean — no flagged cells and no groups
  if ((pattern === "clean" || visGrid.size === 0) && !hasGroups) {
    return null;
  }

  const hasHotspots = visHotspots.length > 0;

  // Helper: render a gap row with text repeated across frozen + DATA columns
  const GAP_REPEAT = 5;
  const nFrz = freeze ? freeze.n : 0;
  const renderGapRow = (count, key, topOnly = false) => {
    const text = `${count} row${count !== 1 ? "s" : ""} not shown`;
    const topBorder = topOnly ? "none" : `1px dashed ${C.BORDER}`;
    const gapBase = { padding: "4px 8px", textAlign: "center", fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3, background: C.BG, borderTop: topBorder, borderBottom: `1px dashed ${C.BORDER}` };
    // DATA-zone cells: text every GAP_REPEAT columns
    const nData = colEntries.length - nFrz;
    const dataCells = [];
    let di = 0;
    while (di < nData) {
      const span = Math.min(GAP_REPEAT, nData - di);
      dataCells.push(<td key={nFrz + di} colSpan={span} style={gapBase}>{text}</td>);
      di += span;
    }
    return (
      <tr key={key}>
        {/* # col — shows text, sticky, overflow visible so text isn't clipped */}
        <td style={{ ...gapBase, overflow: "visible", zIndex: FREEZE_Z.FROZEN_BODY + 1, ...(freeze ? { position: "sticky", left: 0 } : {}) }}>{text}</td>
        {/* Marker col — empty, sticky */}
        {hasGroups && <td style={{ ...gapBase, position: "sticky", left: markerLeft, zIndex: FREEZE_Z.FROZEN_BODY }} />}
        {/* Frozen ID cols — empty, sticky at their offsets */}
        {Array.from({ length: nFrz }, (_, ci) => (
          <td key={`f${ci}`} style={{ ...gapBase, ...(freeze ? { position: "sticky", left: freeze.offsets[ci + 1], zIndex: FREEZE_Z.FROZEN_BODY } : {}) }} />
        ))}
        {dataCells}
      </tr>
    );
  };

  const hasDataRows = rowSegments.length > 0;
  return (
    <div>
      {/* Where flags are concentrated — heatmap + density minimaps caption */}
      {hasDataRows && (
        <div style={{ marginBottom: 6, lineHeight: 1.5 }}>
          <span style={{ ...MINIMAP_CALLOUT_TYPOGRAPHY, fontWeight: FW.SEMI }}>Where flags are concentrated.</span>{" "}
          <span style={MINIMAP_CALLOUT_TYPOGRAPHY}>
            Rows × columns of your data, shaded by how many tests flag each cell.
            {needsVScroll && " The strip to the left of the table projects flag density along rows."}
            {needsHScroll && " The strip below the table projects flag density along columns."}
          </span>
        </div>
      )}
      {/* Minimap + scrollable data table side by side — only when there are data rows */}
      {hasDataRows && <><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {needsVScroll && (
          <div style={{ paddingTop: headerZoneH }}>
            <SegmentMinimap visGrid={visGrid} rowSegments={rowSegments}
              height={Math.max(TABLE_H - headerH, 100)} tableRef={tableRef} headerH={headerH}
              activeTestKey={activeTestKey}
              regionOverlays={regionOverlays} onRegionActivate={onRegionActivate} />
          </div>
        )}
        <div ref={headerZoneRef} style={{ flex: 1, minWidth: 0 }}>
          {/* IRC pair brackets — disabled at the display layer; gated on
              rowSemantics propagation to the IRC card display surface.
              On stacked-condition / long-format-pivoted datasets, IRC
              treats all replicate columns as independent, producing dozens
              of pairwise brackets that stack vertically and push the
              minimap off-screen. S118 Track H landed the import-stage gate
              and IRC sub-unit suppression for the windowed scan; bracket-
              strip re-enable is the remaining display work tracked at
              STATUS.md parked #8a. */}
          {/* spec.brackets?.length > 0 && (
            <IrcBracketStrip brackets={spec.brackets} colEntries={colEntries}
              hasMarker={hasGroups} tableRef={tableRef} />
          ) */}
          <ScrollTable
            columns={colEntries.map(col => ({ letter: colToExcelLetter(coordCtx?.origColMap?.[col.rawCI] ?? col.rawCI), name: col.label, role: col.role }))}
            condSpans={condSpans}
            condColorMap={condColorMap}
            freeze={freeze}
            hasMarker={hasGroups}
            markerLeft={markerLeft}
            headerTintCols={spec.tintedVisCols}
            headerTintColor={spec.tintColor}
            rowSegments={rowSegments}
            rawData={rawData}
            height={TABLE_H}
            tableRef={tableRef}
            theadRef={theadRef}
            rowRefs={rowRefs}
            renderRowNum={(ri) => fr(ri)}
            renderRowExtra={(ri) => {
              const inHotspot = hasHotspots && visHotspots.some(h => ri >= h.rowStart && ri <= h.rowEnd);
              const extra = inHotspot ? { fontWeight: FW.SEMI } : {};
              if (spec.changepointVisRows?.includes(ri)) {
                extra.borderBottom = `2px dashed ${SIGNAL.RED.dot}`;
              }
              return extra;
            }}
            renderMarker={hasGroups ? (ri, zebraBg) => {
              const rowGrps = rowGroupMap.get(ri) || [];
              const isDupActive = activeTestKey === DUP_DET_TEST_NAME;
              const dupGrp = isDupActive ? rowGrps.find(g => g.type === "exact") : null;
              const markerBg = dupGrp ? spec.dupGroupTintMap?.get(dupGrp.id) || zebraBg : zebraBg;
              const markerCpBorder = spec.changepointVisRows?.includes(ri);
              return (
                /* Group-marker glyph cell (e.g. ① ② ③) — chart-annotation carve-out
                   per TYPOGRAPHY-SYSTEM.md §"What this system does NOT cover".
                   The marker glyphs are inline-coloured by mechanism and sized
                   below the type-scale floor. Hardcoded pending the chart pass. */
                <td style={{
                  ...TD_ID_CELL, boxSizing: "border-box",
                  width: COL_W.MARKER, minWidth: COL_W.MARKER, maxWidth: COL_W.MARKER,
                  padding: "1px 2px", textAlign: "center", fontSize: "9px", lineHeight: "1.2",
                  borderBottom: markerCpBorder ? `2px dashed ${SIGNAL.RED.dot}` : `1px solid ${C.BORDER_L}`,
                  borderRight: `1px solid ${C.BORDER_L}`,
                  background: blendOnto(markerBg, zebraBg),
                  position: "sticky", left: markerLeft, zIndex: FREEZE_Z.FROZEN_BODY,
                  ...(isDupActive && !dupGrp ? { opacity: DUP_DIM_OPACITY } : {}),
                }}>
                  {rowGrps.map(g => {
                    const dim = activeTestKey && TEST_KEY_TO_NAME[g.testKey] !== activeTestKey;
                    const clickable = isDupActive && g.type === "exact";
                    const isExpanded = expandedGroup?.groupId === g.id;
                    return (
                      <span key={g.id}
                        style={{
                          color: MECH_COLOR[TEST_MECHANISM[g.testKey]] || C.TEXT_3,
                          opacity: dim ? 0.3 : 1,
                          ...(clickable ? { cursor: "pointer", textDecoration: isExpanded ? "underline" : "none" } : {}),
                        }}
                        title={g.type === "exact" ? `Duplicate group (${g.count} rows) — click to show counterparts` : g.type === "offset" ? `Offset pair: ${g.offset}` : `Cross-condition pair`}
                        onClick={clickable ? (e) => { e.stopPropagation(); setExpandedGroup(isExpanded ? null : { groupId: g.id, anchorRow: ri }); } : undefined}>
                        {groupMarkerMap?.get(g.id) || RANK_NUMS[g.id] || `(${g.id + 1})`}
                      </span>
                    );
                  })}
                </td>
              );
            } : null}
            renderInsertedRows={(expandedGroup || spec.changepointVisRows?.length) ? (ri) => {
              const inserted = [];

              // LOESS changepoint label row
              if (spec.changepointVisRows?.includes(ri)) {
                const nCols = 1 + (hasGroups ? 1 : 0) + colEntries.length;
                inserted.push(
                  <tr key={`cp-label-${ri}`}>
                    <td colSpan={nCols} style={{
                      padding: "2px 8px", fontSize: FS.xs, fontFamily: FF.UI,
                      color: SIGNAL.RED.dot, background: C.WHITE, border: "none",
                      ...(freeze ? { position: "sticky", left: 0, zIndex: FREEZE_Z.FROZEN_BODY } : {}),
                    }}>
                      ▲ Changepoint between rows {fr(ri)} and {fr(ri + 1)}
                    </td>
                  </tr>
                );
              }

              // DupDet counterpart rows
              if (expandedGroup && ri === expandedGroup.anchorRow) {
                const grp = groups.find(g => g.id === expandedGroup.groupId);
                if (grp) {
                  const style = spec.dupGroupStyleMap?.get(grp.id);
                  if (style) {
                    const counterpartMatRows = grp.rows
                      .map(mr => rowMap ? (rowMap[mr] ?? mr) : mr)
                      .filter(vr => vr !== ri && vr >= 0 && vr < nVisRows);
                    const marker = groupMarkerMap?.get(grp.id) || "";
                    for (const cpRow of counterpartMatRows) {
                      const cpData = rawData[cpRow];
                      if (!cpData) continue;
                      inserted.push(
                        <tr key={`cp-${cpRow}`}>
                          <td style={{
                            ...TD_ID_CELL, borderBottom: `1px solid ${C.BORDER_L}`,
                            borderLeft: `3px solid ${style.border}`,
                            background: style.counterpartTint, color: C.TEXT_3,
                            fontSize: FS.xs, fontStyle: "italic", fontWeight: FW.NORM,
                            ...(freeze ? { position: "sticky", left: 0, zIndex: FREEZE_Z.FROZEN_BODY } : {}),
                          }}>
                            {"↳ " + fr(cpRow)}
                          </td>
                          {hasGroups && (
                            /* Counterpart-row group marker — same chart-annotation
                               carve-out as the primary group marker above; mirrors
                               its inline literal so the two cells render at the
                               same glyph size. */
                            <td style={{
                              ...TD_ID_CELL, boxSizing: "border-box",
                              width: COL_W.MARKER, minWidth: COL_W.MARKER, maxWidth: COL_W.MARKER,
                              padding: "1px 2px", textAlign: "center", fontSize: "9px", lineHeight: "1.2",
                              borderBottom: `1px solid ${C.BORDER_L}`, background: style.counterpartTint,
                              position: "sticky", left: markerLeft, zIndex: FREEZE_Z.FROZEN_BODY,
                              color: MECH_COLOR[TEST_MECHANISM[grp.testKey]] || C.TEXT_3,
                            }}>
                              {marker}
                            </td>
                          )}
                          {colEntries.map((colEntry, ci) => {
                            const isData = colEntry.role === "data";
                            const isFrozen = freeze && ci < (freeze?.n || 0);
                            const isLastFrozen = freeze && ci === (freeze?.n || 0) - 1;
                            const value = cpData[colEntry.rawCI];
                            const displayVal = value == null || value === "" ? "" : String(value);
                            const base = isData ? TD_NUM_CELL : TD_ID_CELL;
                            const bg = isData ? style.tint : style.counterpartTint;
                            return (
                              <td key={ci} style={{
                                ...base, boxSizing: "border-box",
                                borderBottom: `1px solid ${C.BORDER_L}`,
                                ...(!isFrozen && ci > 0 ? { borderLeft: `1px solid ${C.BORDER_L}` } : {}),
                                ...(isFrozen ? { position: "sticky", left: freeze.offsets[ci + 1], zIndex: FREEZE_Z.FROZEN_BODY } : {}),
                                ...(isLastFrozen ? { borderRight: `1px solid ${C.BORDER_L}` } : {}),
                                background: bg, color: C.TEXT,
                                ...(isData ? { fontWeight: FW.SEMI } : {}),
                              }}>
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }
                  }
                }
              }

              return inserted.length > 0 ? inserted : null;
            } : null}
            renderCell={(row, col, ci, ri, zebraBg) => {
              const isData = col.role === "data";
              const colEntry = colEntries[ci];
              const value = row[colEntry.rawCI];
              const displayVal = value == null || value === "" ? "" : String(value);
              const base = isData ? TD_NUM_CELL : TD_ID_CELL;
              const isFrozen = freeze && ci < (freeze?.n || 0);
              const vi = colEntry.vi;

              // ── Spec-driven highlighting (priority: cell > row > col > convergence) ──

              // 1. Cell-level color (RSC heatmap, DupDet within-row)
              const specCellBg = isData ? spec.cellColor?.(ri, vi) : null;
              const specCellText = isData ? spec.cellTextColor?.(ri, vi) : null;

              // 2. Row-level tint (LOESS two-tone, DupDet group row bg)
              const rowBg = spec.rowTint?.get(ri) || null;

              // 3. DupDet group tint (from convergence groups, not test results)
              const isDupActive = activeTestKey === DUP_DET_TEST_NAME;
              const dupGrp = isDupActive ? (rowGroupMap.get(ri) || []).find(g => g.type === "exact") : null;
              const groupTint = dupGrp ? spec.dupGroupTintMap?.get(dupGrp.id) : null;
              // DupDet within-row cell tint
              const withinRowTint = isDupActive && isData ? spec.dupWithinRowMap?.get(ri)?.get(vi) : undefined;
              const withinRowHit = !!withinRowTint;
              const dupHighlighted = isData && (groupTint || withinRowHit);

              // 4. Column-level tint (IRC)
              const colBg = isData && spec.tintedVisCols?.has(vi) ? spec.tintColor : null;

              // 5. Convergence-grid-based generic highlight (only when spec doesn't override)
              const cell = isData ? visGrid.get(`${ri},${vi}`) : null;
              const isRelevant = !activeTestKey || (cell && cell.tests.includes(activeTestKey));
              const hasSpecOverride = specCellBg || rowBg || colBg || dupHighlighted;
              const genericHighlight = !hasSpecOverride && !spec.suppressConvergenceHeat && activeTestKey && isData && isRelevant;
              const dimmed = spec.dimNonRelevant && !hasSpecOverride && activeTestKey && isData && !isRelevant;

              // Convergence heatmap only when nothing else applies and spec allows it
              const cellHighlighted = dupHighlighted || genericHighlight;
              const heatBg = (isData && !dimmed && !cellHighlighted && !hasSpecOverride && !spec.suppressConvergenceHeat)
                ? convergenceCellBg(cell) : null;
              const hasHeat = heatBg && heatBg.backgroundColor;

              // Background priority stack
              const baseBg = specCellBg
                || withinRowTint
                || groupTint
                || rowBg
                || colBg
                || (genericHighlight ? HIGHLIGHT_TINT : null)
                || zebraBg;

              // Changepoint border (LOESS)
              const isCpRow = spec.changepointVisRows?.includes(ri);

              // Text color + weight
              const textColor = dimmed ? "#CCC"
                : specCellText ? specCellText
                : (cellHighlighted && !spec.boldRelevant) ? "#CCC"   // Mahalanobis-style
                : (cellHighlighted && spec.boldRelevant) ? C.TEXT
                : isData ? convergenceCellTextColor(cell)
                : ROLE_COLOR[col.role] || C.TEXT_3;
              const fontWeight = (cellHighlighted && spec.boldRelevant) ? FW.SEMI : undefined;

              const finalBg = dimmed ? C.WHITE : hasHeat ? undefined : baseBg;
              return {
                content: displayVal,
                style: {
                  ...base, color: textColor, background: finalBg,
                  ...(fontWeight ? { fontWeight } : {}),
                  ...(hasHeat ? heatBg : {}),
                  ...(isCpRow ? { borderBottom: `2px dashed ${SIGNAL.RED.dot}` } : {}),
                  ...(isFrozen ? { background: dimmed ? C.WHITE : hasHeat ? heatBg.backgroundColor : baseBg } : {}),
                },
              };
            }}
          />
        </div>
      </div>

      {/* Horizontal column minimap — L-shape below table, right of vertical minimap corner */}
      {needsHScroll && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {/* Corner spacer (aligns with vertical minimap) */}
          {needsVScroll && (
            <div style={{ width: MINIMAP_W, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, marginLeft: COL_W.ROW_NUM + (hasGroups ? COL_W.MARKER : 0) + nFrz * FREEZE_COL_W.ID_COL }}>
            <ColMinimap visGrid={visGrid} colEntries={colEntries} tableRef={tableRef} freeze={freeze}
              activeTestKey={activeTestKey} hasGroups={hasGroups} />
          </div>
        </div>
      )}
      {/* Convergence colour-ramp legend — shared by cells, row minimap, column minimap */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: FS.xs, color: C.TEXT_3, flexWrap: "wrap" }}>
        <span style={{ color: C.TEXT_3 }}>Tests flagging each cell:</span>
        {CONVERGENCE_RAMP.slice(1).map((color, i) => {
          const count = i + 1;
          const rs = convergenceRampStyle(count);
          const isLast = count === CONVERGENCE_RAMP.length - 1;
          const label = isLast ? `${count}+` : String(count);
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{
                display: "inline-block", width: 12, height: 12, borderRadius: 2,
                background: color, opacity: rs?.opacity ?? 1,
                border: `1px solid ${C.BORDER_L}`,
              }} />
              <span>{label}</span>
            </span>
          );
        })}
      </div>
      </>}

      {/* No-data-rows fallback — groups/global findings exist but no cells flagged in heatmap */}
      {!hasDataRows && (
        <div style={{ padding: "16px 0", color: C.TEXT_3, fontSize: FS.base }}>
          No spatially localised hotspots detected. Flags are from dataset-wide statistical tests rather than localised regions.
        </div>
      )}

      {/* Findings below table: middleContent (layered) or simple fallback */}
      {middleContent ? middleContent : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Simple mode: convergence hotspots (multi-row numbered, single-row collapsed) */}
          {hasHotspots && (() => {
            const tagged = visHotspots.map((h, i) => ({ ...h, origIdx: i }));
            const multi = tagged.filter(h => h.rowStart !== h.rowEnd);
            const single = tagged.filter(h => h.rowStart === h.rowEnd);
            return <>
              {multi.map((h, i) => (
                <div key={`h${h.origIdx}`}
                  onClick={() => scrollToHotspot(h.origIdx)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                    cursor: "pointer", borderRadius: CR.SM,
                    background: h.origIdx === activeHotspot ? C.BG_L : "transparent",
                  }}
                  onMouseEnter={e => { if (h.origIdx !== activeHotspot) e.currentTarget.style.background = C.BG; }}
                  onMouseLeave={e => { if (h.origIdx !== activeHotspot) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: FS.base, fontWeight: FW.BOLD, color: C.TEXT }}>{RANK_NUMS[i] || `(${i+1})`}</span>
                  <span style={{ fontSize: FS.base, fontWeight: FW.SEMI, color: C.TEXT }}>{fmtLoc(h, coordCtx)}</span>
                  <span style={{ fontSize: FS.xs, color: C.TEXT_3 }}>
                    — {h.categories.map(cat => MECHANISMS[cat]?.label || cat).join(", ")}
                  </span>
                </div>
              ))}
              {single.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: FS.xs, color: C.TEXT_3, padding: "4px 8px" }}>
                    {single.length} additional single-row hotspot{single.length !== 1 ? "s" : ""} detected.
                  </div>
                </div>
              )}
            </>;
          })()}
          {/* Simple mode: group findings */}
          {hasGroups && groups.map(g => {
            const marker = groupMarkerMap?.get(g.id) || RANK_NUMS[g.id] || `(${g.id + 1})`;
            const rowNums = g.rows.map(r => fr(r)).join(" & ");
            const desc = g.type === "exact" ? "Exact duplicates"
              : g.type === "offset" ? `Constant offset (${g.offset})`
              : `Cross-condition pair${g.cond1 ? ` (${g.cond1} ↔ ${g.cond2})` : ""}`;
            return (
              <div key={`g${g.id}`} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                fontSize: FS.base, color: C.TEXT_2,
              }}>
                <span style={{ color: MECH_COLOR[TEST_MECHANISM[g.testKey]] || C.TEXT_3, fontWeight: FW.BOLD, fontSize: FS.base, flexShrink: 0 }}>
                  {marker}
                </span>
                <span>Rows {rowNums} — {desc}</span>
              </div>
            );
          })}
          {/* Fallback when nothing */}
          {!hasHotspots && !hasGroups && (
            <div style={{ padding: "8px 0", color: C.TEXT_3, fontSize: FS.xs, lineHeight: "1.6" }}>
              Highlighted cells are flagged by individual tests.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

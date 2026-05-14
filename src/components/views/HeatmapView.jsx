import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { C, TF, FW, FF, CR } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { colToExcelLetter } from "../shared/coordinates.js";
import { CONVERGENCE_RAMP, convergenceRampStyle, convergenceCellBg, convergenceCellTextColor } from "../shared/heatmapColors.js";

// ── Helpers ──────────────────────────────────────────────────────────

/** Severity label from numeric rank */
const SEV_LABEL = { 3: "HIGH", 2: "MODERATE", 1: "LOW", 0: "—" };

// ── Remap convergence grid from matrix coords to raw-data coords ─────

function remapGrid(grid, rowMap, matColToVisCol, nVisRows, nVisCols) {
  const remapped = new Map();
  for (const [key, cell] of grid) {
    const [mr, mc] = key.split(",").map(Number);
    const visRow = rowMap ? (rowMap[mr] ?? mr) : mr;
    const visCol = matColToVisCol[mc];
    if (visCol == null || visRow < 0 || visRow >= nVisRows) continue;
    const nk = `${visRow},${visCol}`;
    // Merge if multiple matrix cells map to same vis cell (shouldn't happen but safe)
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

function remapHotspots(hotspots, rowMap, matColToVisCol, dColMap) {
  return hotspots.map(h => ({
    ...h,
    rowStart: rowMap ? (rowMap[h.rowStart] ?? h.rowStart) : h.rowStart,
    rowEnd:   rowMap ? (rowMap[h.rowEnd]   ?? h.rowEnd)   : h.rowEnd,
    colStart: matColToVisCol[h.colStart] ?? h.colStart,
    colEnd:   matColToVisCol[h.colEnd]   ?? h.colEnd,
  }));
}

// ── Density strip (row projection) ───────────────────────────────────

function RowDensityStrip({ grid, nRows, nCols }) {
  // Project grid to max count per row
  const rowMax = new Array(nRows).fill(0);
  for (const [key, cell] of grid) {
    const r = parseInt(key.split(",")[0]);
    if (r >= 0 && r < nRows && cell.count > rowMax[r]) {
      rowMax[r] = cell.count;
    }
  }
  const cellH = Math.max(2, Math.min(4, Math.floor(300 / nRows)));

  return (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 12, flexShrink: 0 }}>
      <div style={{ fontSize: TF.SMALL, color: C.TEXT_3, marginBottom: 4, textAlign: "center", fontWeight: FW.SEMI }}>
        Density
      </div>
      <div style={{ display: "flex", flexDirection: "column", border: `1px solid ${C.BORDER_L}`, borderRadius: CR.SM, overflow: "hidden" }}>
        {rowMax.map((count, i) => {
          const rs = convergenceRampStyle(count);
          return (
            <div
              key={i}
              style={{
                width: 16,
                height: cellH,
                backgroundColor: rs ? rs.color : "transparent",
                opacity: rs ? rs.opacity : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────

function CellTooltip({ cell, x, y }) {
  if (!cell) return null;
  return (
    <div style={{
      position: "fixed", left: x + 12, top: y - 8,
      background: C.TEXT, color: C.BG_L,
      padding: "8px 12px", borderRadius: CR.MD,
      fontSize: TF.DETAIL, lineHeight: "1.5",
      pointerEvents: "none", zIndex: 9999,
      maxWidth: 280, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      <div style={{ fontWeight: FW.SEMI, marginBottom: 4 }}>
        {cell.count} test{cell.count !== 1 ? "s" : ""} flagged
      </div>
      <div style={{ marginBottom: 4 }}>
        {cell.tests.map((t, i) => <div key={i} style={{ fontSize: TF.SMALL }}>• {t}</div>)}
      </div>
      <div style={{ fontSize: TF.SMALL, color: C.TEXT_4 }}>
        {cell.categories.map(c => MECHANISMS[c]?.label || c).join(", ")}
        {" — "}{SEV_LABEL[cell.maxSeverity] || "—"}
      </div>
    </div>
  );
}

// ── Hotspot summary bar ──────────────────────────────────────────────

function HotspotSummaryBar({ hotspots, onScrollTo, coordCtx }) {
  if (!hotspots.length) return null;
  const top3 = hotspots.slice(0, 3);
  const labels = ["①", "②", "③"];
  const fr = coordCtx?.fileRow || ((r) => r + 1);
  const fc = coordCtx?.fileColVis || ((c) => String(c + 1));
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "8px 16px", marginBottom: 12,
      background: C.BG_L, border: `1px solid ${C.BORDER_L}`,
      borderRadius: CR.MD, fontSize: TF.DETAIL, color: C.TEXT_2,
    }}>
      <span style={{ fontWeight: FW.SEMI, color: C.TEXT }}>
        {hotspots.length} hotspot{hotspots.length !== 1 ? "s" : ""}
      </span>
      {top3.map((h, i) => {
        const cat = h.categories[0];
        const color = MECHANISMS[cat]?.color || C.TEXT_3;
        return (
          <button
            key={i}
            onClick={() => onScrollTo(h)}
            style={{
              background: "none", border: `1px solid ${color}`, borderRadius: CR.SM,
              padding: "2px 8px", cursor: "pointer", color: color,
              fontFamily: FF.MONO, fontSize: TF.DETAIL, fontWeight: FW.SEMI,
            }}
          >
            {labels[i]} {fc(h.colStart)}{fr(h.rowStart)}–{fc(h.colEnd)}{fr(h.rowEnd)}
            <span style={{ marginLeft: 6, color: C.TEXT_3, fontWeight: FW.NORM }}>
              · {h.tests.length} test{h.tests.length!==1?"s":""}, {h.categories.length} categor{h.categories.length!==1?"ies":"y"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Ghost column builder ─────────────────────────────────────────────

/**
 * Build a unified column list interleaving real visible columns with ghost
 * columns for sparse separators removed by preprocessRaw. Each entry:
 *   { type: "real"|"ghost", origIdx, visIdx?, rawCI?, label? }
 *
 * Ghost columns are capped at 5 — if more exist they're omitted (the Excel
 * letter sequence already accounts for gaps via origColMap).
 */
function buildUnifiedCols(visColIndices, roles, colHeaders, coordCtx) {
  if (!coordCtx) {
    return visColIndices.map((rawCI, vi) => ({
      type: "real", origIdx: vi, visIdx: vi, rawCI, label: colHeaders[vi],
    }));
  }
  const { origColMap, removedCols } = coordCtx;
  // Map each vis col to its original file col index
  const realEntries = visColIndices.map((rawCI, vi) => ({
    type: "real",
    origIdx: origColMap?.[rawCI] ?? rawCI,
    visIdx: vi,
    rawCI,
    label: colHeaders[vi],
    role: roles[rawCI],
  }));

  // Ghost columns from removedCols (sparse separators)
  const ghostCols = (removedCols || []).slice(0, 5); // cap at 5
  const ghostEntries = ghostCols.map(origIdx => ({
    type: "ghost",
    origIdx,
    label: "—",
  }));

  // Merge and sort by original file column index
  const merged = [...realEntries, ...ghostEntries];
  merged.sort((a, b) => a.origIdx - b.origIdx);
  return merged;
}

// ── Main component ───────────────────────────────────────────────────

export function HeatmapView({
  convergence,     // { grid, hotspots, pattern, nRows, nCols }
  rawData,         // importConfig.data — array of arrays (original parsed rows)
  rowMap,          // matrix row → original data row
  colHeaders,      // visible column headers
  visColIndices,   // raw col indices that are visible
  dColMap,         // raw col indices of DATA columns → matCol index mapping
  roles,           // rawRoles array
  simplified,      // QC mode: simplified legend text
  hideTitle,       // suppress internal heading (when parent provides section header)
  coordCtx,        // { fileRow, fileCol, fileColVis, origColMap, headerRows, skippedRows, removedCols, headerContent }
}) {
  const scrollRef = useRef(null);
  const tableRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [cellGeom, setCellGeom] = useState(null); // { headerH, rowNumW, cellW, cellH }

  const { grid, hotspots, pattern, nRows: matRows, nCols: matCols } = convergence;

  // Build matrix col → visible col index mapping
  const matColToVisCol = useMemo(() => {
    const map = {};
    dColMap.forEach((rawCI, matCI) => {
      const visIdx = visColIndices.indexOf(rawCI);
      if (visIdx >= 0) map[matCI] = visIdx;
    });
    return map;
  }, [dColMap, visColIndices]);

  const nVisRows = rawData.length;
  const nVisCols = visColIndices.length;

  // Unified columns: real + ghost interleaved at original file positions
  const unifiedCols = useMemo(
    () => buildUnifiedCols(visColIndices, roles, colHeaders, coordCtx),
    [visColIndices, roles, colHeaders, coordCtx]
  );

  // Remap grid and hotspots to raw-data coordinates
  const visGrid = useMemo(
    () => remapGrid(grid, rowMap, matColToVisCol, nVisRows, nVisCols),
    [grid, rowMap, matColToVisCol, nVisRows, nVisCols]
  );
  const visHotspots = useMemo(
    () => remapHotspots(hotspots, rowMap, matColToVisCol, dColMap),
    [hotspots, rowMap, matColToVisCol, dColMap]
  );

  // Clean check — no flagged cells, nothing to show
  if (pattern === "clean" || grid.size === 0) return null;

  // Cell dimensions
  const CELL_W = 72;
  const GHOST_W = 40; // narrower for ghost/stripped columns
  const CELL_H = 26;
  const ROW_NUM_W = 48;
  const HEADER_H = 38;
  const GHOST_ROW_H = 22; // shorter for ghost header rows
  const maxVisibleRows = 400;
  const nGhostHeaderRows = (coordCtx?.headerContent?.length || 0);
  const MAX_CONTAINER_H = 400;
  const showScroll = nVisRows > 100;
  const naturalH = nVisRows * CELL_H + HEADER_H + nGhostHeaderRows * GHOST_ROW_H + 8;
  const containerH = Math.min(naturalH, MAX_CONTAINER_H);

  // ── Row virtualization ──────────────────────────────────────────────
  // Only render rows visible in the scroll viewport (+ buffer) to avoid
  // creating hundreds of thousands of DOM nodes for large datasets.
  const VIRT_BUFFER = 20; // extra rows above/below viewport
  const [scrollTop, setScrollTop] = useState(0);

  const virtRange = useMemo(() => {
    if (!showScroll) return { startRow: 0, endRow: nVisRows }; // small dataset, render all
    const viewH = containerH || (maxVisibleRows * CELL_H);
    const topOffset = HEADER_H + nGhostHeaderRows * GHOST_ROW_H;
    const firstVisible = Math.max(0, Math.floor((scrollTop - topOffset) / CELL_H) - VIRT_BUFFER);
    const lastVisible = Math.min(nVisRows, Math.ceil((scrollTop - topOffset + viewH) / CELL_H) + VIRT_BUFFER);
    return { startRow: Math.max(0, firstVisible), endRow: Math.max(0, lastVisible) };
  }, [scrollTop, nVisRows, containerH, showScroll, nGhostHeaderRows]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Total table width accounting for ghost column widths
  const tableW = ROW_NUM_W + unifiedCols.reduce((s, c) => s + (c.type === "ghost" ? GHOST_W : CELL_W), 0);

  const getCell = (r, c) => visGrid.get(`${r},${c}`) || null;

  // Scroll to hotspot
  const scrollToHotspot = useCallback((h) => {
    if (!scrollRef.current) return;
    const sg = cellGeom || { cellH: CELL_H, cellW: CELL_W, rowNumW: ROW_NUM_W };
    const top = h.rowStart * sg.cellH;
    const left = h.colStart * sg.cellW;
    scrollRef.current.scrollTo({ top: Math.max(0, top - 40), left: Math.max(0, left - sg.rowNumW - 20), behavior: "smooth" });
  }, [cellGeom]);

  // Mouse handlers for tooltip
  const handleMouseEnter = useCallback((e, r, c) => {
    const cell = getCell(r, c);
    if (cell && cell.count > 0) {
      setTooltip({ cell, x: e.clientX, y: e.clientY });
    }
  }, [visGrid]);

  const handleMouseMove = useCallback((e) => {
    if (tooltip) setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, [tooltip]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Measure actual cell geometry from DOM after render
  useEffect(() => {
    const tbl = tableRef.current;
    if (!tbl) return;
    const thead = tbl.querySelector("thead tr");
    const firstDataRow = tbl.querySelector("tbody tr");
    if (!thead || !firstDataRow) return;
    const cells = firstDataRow.querySelectorAll("td");
    if (cells.length < 2) return;
    setCellGeom({
      headerH: thead.getBoundingClientRect().height,
      rowNumW: cells[0].getBoundingClientRect().width,
      cellW: cells[1].getBoundingClientRect().width,
      cellH: cells[0].getBoundingClientRect().height,
    });
  }, [rawData, visColIndices]);

  // Build vis-col → x-offset map accounting for ghost columns
  const visColX = useMemo(() => {
    const xMap = {};
    let x = 0;
    for (const col of unifiedCols) {
      if (col.type === "real") {
        xMap[col.visIdx] = x;
        x += CELL_W;
      } else {
        x += GHOST_W;
      }
    }
    return xMap;
  }, [unifiedCols]);

  // Hotspot overlay data — positioned absolutely within the grid using measured geometry
  const g = cellGeom || { headerH: HEADER_H, rowNumW: ROW_NUM_W, cellW: CELL_W, cellH: CELL_H };
  const ghostRowOffset = nGhostHeaderRows * GHOST_ROW_H;
  const hotspotOverlays = visHotspots.slice(0, 10).map((h, idx) => {
    const cat = h.categories[0];
    const color = MECHANISMS[cat]?.color || C.TEXT_3;
    const top = h.rowStart * g.cellH + g.headerH + ghostRowOffset;
    const left = (visColX[h.colStart] ?? (h.colStart * g.cellW)) + g.rowNumW;
    const endX = (visColX[h.colEnd] ?? (h.colEnd * g.cellW)) + CELL_W;
    const width = endX - (visColX[h.colStart] ?? (h.colStart * g.cellW));
    const height = (h.rowEnd - h.rowStart + 1) * g.cellH;
    const labels = ["①", "②", "③"];
    return (
      <div
        key={idx}
        style={{
          position: "absolute", top, left, width, height,
          outline: `2px solid ${color}`,
          outlineOffset: "-1px",
          borderRadius: CR.SM,
          pointerEvents: "none",
          zIndex: 10 - idx, // higher ranked = on top
          boxSizing: "border-box",
        }}
      >
        {idx < 3 && (
          <span style={{
            position: "absolute", top: -1, left: -1,
            background: color, color: "#fff",
            fontSize: TF.SMALL, fontWeight: FW.SEMI,
            padding: "1px 4px", borderRadius: `${CR.SM} 0 ${CR.SM} 0`,
            lineHeight: "1.2",
          }}>
            {labels[idx]}
          </span>
        )}
      </div>
    );
  });

  return (
    <div style={{ marginTop: 16 }}>
      {/* Section header — suppressed when parent provides its own */}
      {!hideTitle && (
        <div style={{
          fontSize: TF.TITLE, fontWeight: FW.SEMI, color: C.TEXT,
          marginBottom: 8,
        }}>
          {simplified ? "Data overview" : "Convergence heatmap"}
          <span style={{ fontSize: TF.DETAIL, fontWeight: FW.NORM, color: C.TEXT_3, marginLeft: 8 }}>
            {simplified
              ? "Areas where multiple checks found issues are highlighted"
              : <>
                  {visGrid.size} cell{visGrid.size !== 1 ? "s" : ""} flagged
                  {pattern === "saturated" && " — saturated pattern"}
                  {pattern === "scattered" && " — scattered (limited overlap)"}
                </>
            }
          </span>
        </div>
      )}
      {hideTitle && (
        <div style={{ fontSize: TF.DETAIL, color: C.TEXT_3, marginBottom: 8 }}>
          {visGrid.size} cell{visGrid.size !== 1 ? "s" : ""} flagged
          {pattern === "saturated" && " — saturated pattern"}
          {pattern === "scattered" && " — scattered (limited overlap)"}
        </div>
      )}

      {/* Hotspot summary bar */}
      <HotspotSummaryBar hotspots={visHotspots} onScrollTo={scrollToHotspot} coordCtx={coordCtx} />

      {/* Heatmap body: density strip + data grid */}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* Density strip — row projection */}
        {nVisRows <= 600 && <RowDensityStrip grid={visGrid} nRows={nVisRows} nCols={nVisCols} />}

        {/* Main heatmap grid */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflow: "auto",
            maxHeight: containerH,
            border: `1px solid ${C.BORDER}`,
            borderRadius: CR.MD,
            position: "relative",
            background: C.WHITE,
          }}
          onMouseMove={handleMouseMove}
          onScroll={handleScroll}
        >
          <table
            ref={tableRef}
            style={{
              borderCollapse: "collapse",
              fontFamily: FF.MONO,
              fontSize: TF.DETAIL,
              tableLayout: "fixed",
              minWidth: tableW,
            }}
          >
            {/* Column headers — sticky: Excel letter + header name */}
            <thead>
              <tr style={{
                position: "sticky", top: 0, zIndex: 20,
                background: C.BG,
              }}>
                {/* Row number header */}
                <th style={{
                  position: "sticky", left: 0, zIndex: 30,
                  width: ROW_NUM_W, minWidth: ROW_NUM_W,
                  height: HEADER_H,
                  background: C.BG,
                  borderBottom: `1px solid ${C.BORDER}`,
                  borderRight: `1px solid ${C.BORDER}`,
                  fontSize: TF.SMALL, color: C.TEXT_3,
                  padding: "0 4px",
                  textAlign: "center",
                }}>
                  Row
                </th>
                {unifiedCols.map((col, ui) => {
                  const letter = colToExcelLetter(col.origIdx);
                  if (col.type === "ghost") {
                    return (
                      <th key={`g${ui}`} style={{
                        width: GHOST_W, minWidth: GHOST_W, height: HEADER_H,
                        borderBottom: `1px solid ${C.BORDER}`,
                        borderRight: `1px solid ${C.BORDER_L}`,
                        padding: "0 2px", textAlign: "center",
                        fontSize: TF.SMALL, color: C.TEXT_4, fontWeight: FW.NORM,
                        background: "#EAECF0",
                      }}>
                        <div style={{ lineHeight: "1.1" }}>
                          <div style={{ fontWeight: FW.SEMI, fontSize: "10px", color: C.TEXT_4 }}>{letter}</div>
                          <div style={{ fontSize: "7px", color: C.TEXT_4, fontStyle: "italic" }}>—</div>
                        </div>
                      </th>
                    );
                  }
                  const isData = col.role === "data";
                  return (
                    <th
                      key={ui}
                      title={col.label}
                      style={{
                        width: CELL_W, minWidth: CELL_W,
                        height: HEADER_H,
                        borderBottom: `1px solid ${C.BORDER}`,
                        borderRight: `1px solid ${C.BORDER_L}`,
                        padding: "0 4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: TF.SMALL,
                        color: isData ? C.TEXT_2 : C.TEXT_4,
                        fontWeight: FW.SEMI,
                        textAlign: "center",
                        background: isData ? C.BG : "#F1F5F9",
                      }}
                    >
                      <div style={{ lineHeight: "1.1" }}>
                        <div style={{ fontWeight: FW.BOLD, fontSize: "10px" }}>{letter}</div>
                        <div style={{ fontSize: "8px", fontWeight: FW.NORM, overflow: "hidden", textOverflow: "ellipsis" }}>{col.label}</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Ghost header/preamble rows — muted, above data */}
            {nGhostHeaderRows > 0 && (
              <tbody>
                {coordCtx.headerContent.map((hdrRow, hi) => (
                  <tr key={`hdr${hi}`} style={{ background: "#F1F3F5" }}>
                    <td style={{
                      position: "sticky", left: 0, zIndex: 15,
                      width: ROW_NUM_W, minWidth: ROW_NUM_W, height: GHOST_ROW_H,
                      background: "#F1F3F5",
                      borderRight: `1px solid ${C.BORDER}`,
                      borderBottom: `1px solid ${C.BORDER_L}`,
                      fontSize: TF.SMALL, color: C.TEXT_4,
                      textAlign: "center", padding: "0 2px",
                      fontStyle: "italic",
                    }}>
                      {(coordCtx.skippedRows || 0) + hi + 1}
                    </td>
                    {unifiedCols.map((col, ui) => {
                      const w = col.type === "ghost" ? GHOST_W : CELL_W;
                      // For real columns, show the header row value at this rawCI position
                      const val = col.type === "real" && hdrRow
                        ? (hdrRow[col.rawCI] != null ? String(hdrRow[col.rawCI]).trim() : "")
                        : "";
                      return (
                        <td key={ui} style={{
                          width: w, minWidth: w, height: GHOST_ROW_H,
                          borderBottom: `1px solid ${C.BORDER_L}`,
                          borderRight: `1px solid ${C.BORDER_L}`,
                          padding: "0 4px",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontSize: "8px", color: C.TEXT_4, fontStyle: "italic",
                          background: "#F1F3F5",
                        }}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            )}

            {/* Data rows — virtualized: only render rows in/near viewport */}
            <tbody>
              {/* Spacer row above visible range */}
              {virtRange.startRow > 0 && (
                <tr style={{ height: virtRange.startRow * CELL_H }}>
                  <td colSpan={unifiedCols.length + 1} />
                </tr>
              )}
              {rawData.slice(virtRange.startRow, virtRange.endRow).map((row, offset) => {
                const ri = virtRange.startRow + offset;
                const fileRowNum = coordCtx?.fileRow?.(ri) ?? (ri + 1);
                return (
                <tr key={ri}>
                  {/* Sticky row number — original file row */}
                  <td style={{
                    position: "sticky", left: 0, zIndex: 15,
                    width: ROW_NUM_W, minWidth: ROW_NUM_W,
                    height: CELL_H,
                    background: ri % 2 === 0 ? C.WHITE : C.BG_L,
                    borderRight: `1px solid ${C.BORDER}`,
                    borderBottom: `1px solid ${C.BORDER_L}`,
                    fontSize: TF.SMALL, color: C.TEXT_4,
                    textAlign: "center",
                    padding: "0 2px",
                  }}>
                    {fileRowNum}
                  </td>
                  {unifiedCols.map((col, ui) => {
                    if (col.type === "ghost") {
                      return (
                        <td key={`g${ui}`} style={{
                          width: GHOST_W, minWidth: GHOST_W, height: CELL_H,
                          borderBottom: `1px solid ${C.BORDER_L}`,
                          borderRight: `1px solid ${C.BORDER_L}`,
                          background: "#EAECF0",
                        }} />
                      );
                    }
                    const { visIdx, rawCI } = col;
                    const isData = roles[rawCI] === "data";
                    const cell = getCell(ri, visIdx);
                    const bg = isData ? convergenceCellBg(cell) : {};
                    const textColor = isData ? convergenceCellTextColor(cell) : C.TEXT_4;
                    const value = row[rawCI];
                    const displayVal = value == null || value === "" ? "" : String(value);
                    return (
                      <td
                        key={ui}
                        style={{
                          width: CELL_W, minWidth: CELL_W,
                          height: CELL_H,
                          borderBottom: `1px solid ${C.BORDER_L}`,
                          borderRight: `1px solid ${C.BORDER_L}`,
                          padding: "0 4px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textAlign: typeof value === "number" || !isNaN(Number(value)) ? "right" : "left",
                          color: textColor,
                          fontSize: TF.SMALL,
                          background: isData ? undefined : C.BG_L,
                          fontStyle: isData ? "normal" : "italic",
                          ...bg,
                        }}
                        onMouseEnter={isData ? (e) => handleMouseEnter(e, ri, visIdx) : undefined}
                        onMouseLeave={isData ? handleMouseLeave : undefined}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
              {/* Spacer row below visible range */}
              {virtRange.endRow < nVisRows && (
                <tr style={{ height: (nVisRows - virtRange.endRow) * CELL_H }}>
                  <td colSpan={unifiedCols.length + 1} />
                </tr>
              )}
            </tbody>
          </table>

          {/* Hotspot outlines overlaid on the table */}
          {hotspotOverlays}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && <CellTooltip cell={tooltip.cell} x={tooltip.x} y={tooltip.y} />}

      {/* Heatmap legend — warm ramp scale */}
      <div style={{
        display: "flex", gap: 16, marginTop: 8,
        fontSize: TF.SMALL, color: C.TEXT_3,
        flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: C.TEXT_4, fontStyle: "italic" }}>Flags:</span>
          {CONVERGENCE_RAMP.slice(1).map((color, i) => {
            const count = i + 1;
            const rs = convergenceRampStyle(count);
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                <span style={{
                  display: "inline-block", width: 12, height: 12,
                  borderRadius: 2, background: color, opacity: rs?.opacity ?? 1,
                }} />
                <span style={{ color: C.TEXT_4 }}>{count === CONVERGENCE_RAMP.length - 1 ? `${count}+` : count}</span>
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}

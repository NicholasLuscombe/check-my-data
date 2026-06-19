/* ── HotspotExcerptList — Peer Review "WHERE TO LOOK" ──────────────────
   Hotspot list with expandable table excerpts. No minimap, no interactive
   detail table. Reuses convergence cell shading from HotspotExcerpt.
   Each hotspot: header (location + categories) + "▸ Show data excerpt"
   expandable with hotspot rows ± 2 context rows, fixed 200px scrollable. */

import { useState, useMemo } from "react";
import { C, FS, FW, FF, CR, SIGNAL, SEV_VERDICT } from "../../constants/tokens.js";
import { TD_NUM_CELL, TD_ID_CELL, TH_EVIDENCE } from "../shared/styles.js";
import { MECHANISMS, RANK_NUMS } from "../../constants/mechanisms.js";
import { buildCondSpansForColumns, shortColName } from "../shared/coordinates.js";

// RANK_NUMS imported from mechanisms.js
const CONTEXT_ROWS = 2;
const EXCERPT_H = 200;

function intensityOpacity(count) {
  if (count <= 0) return 0;
  if (count === 1) return 0.15;
  if (count === 2) return 0.30;
  if (count === 3) return 0.50;
  return 0.70;
}

function cellBg(cell) {
  if (!cell || cell.count <= 0) return {};
  const cat = cell.categories[0];
  const color = MECHANISMS[cat]?.color || "#4682B4";
  const opacity = intensityOpacity(cell.count);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return { background: `rgba(${r},${g},${b},${opacity})` };
}

function cellTextColor(cell) {
  if (!cell || cell.count <= 0) return C.TEXT_3;
  return intensityOpacity(cell.count) >= 0.45 ? C.WHITE : C.TEXT;
}

function fmtLoc(h, coordCtx) {
  const fr = coordCtx?.fileRow || ((r) => r + 1);
  const fc = coordCtx?.fileColVis || ((c) => String(c + 1));
  const r1 = fr(h.rowStart), r2 = fr(h.rowEnd);
  const c1 = fc(h.colStart), c2 = fc(h.colEnd);
  const rows = r1 === r2 ? `Row ${r1}` : `Rows ${r1}\u2013${r2}`;
  const cols = c1 === c2 ? `Col ${c1}` : `Cols ${c1}\u2013${c2}`;
  return `${rows}, ${cols}`;
}

// Remap convergence grid from matrix coords to visible coords
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

// ── Excerpt table for a single hotspot ──

function ExcerptTable({ hotspot, visGrid, rawData, colEntries, nVisRows, coordCtx, condSpans }) {
  const fr = coordCtx?.fileRow || ((r) => r + 1);
  const rowStart = Math.max(0, hotspot.rowStart - CONTEXT_ROWS);
  const rowEnd = Math.min(nVisRows - 1, hotspot.rowEnd + CONTEXT_ROWS);
  const rows = [];
  for (let ri = rowStart; ri <= rowEnd; ri++) rows.push(ri);

  return (
    <div style={{
      height: EXCERPT_H, overflowY: "auto", overflowX: "auto",
      border: `1px solid ${C.BORDER_L}`, borderRadius: CR.SM, background: C.WHITE,
    }}>
      <table style={{ borderCollapse: "collapse", fontFamily: FF.UI, width: "100%" }}>
        <thead>
          {condSpans && condSpans.length > 0 && (
            <tr style={{ background: C.BG, position: "sticky", top: 0, zIndex: 3 }}>
              <th style={{ borderBottom: "none", borderRight: `1px solid ${C.BORDER}`, padding: "4px 8px", background: C.BG }} />
              {condSpans.map((sp, si) => (
                <th key={si} colSpan={sp.len} style={{
                  borderBottom: "none", padding: sp.name ? "4px 8px" : "4px 2px",
                  textAlign: "center", whiteSpace: "nowrap",
                  fontSize: FS.xs, fontWeight: FW.BOLD,
                  color: sp.name ? C.TEXT_2 : C.BORDER, background: C.BG,
                  borderLeft: si > 0 && sp.name ? `2px solid ${C.WHITE}` : "none",
                }}>{sp.name || ""}</th>
              ))}
            </tr>
          )}
          <tr style={{ background: C.BG, position: "sticky", top: condSpans && condSpans.length > 0 ? 24 : 0, zIndex: 2 }}>
            <th style={{ ...TH_EVIDENCE, borderBottom: `1px solid ${C.BORDER}`, borderRight: `1px solid ${C.BORDER}`, background: C.BG }}>#</th>
            {colEntries.map((col, ci) => (
              <th key={ci} style={{
                ...TH_EVIDENCE,
                borderBottom: `1px solid ${C.BORDER}`, borderRight: `1px solid ${C.BORDER_L}`,
                color: col.role === "data" ? C.TEXT_2 : C.TEXT_3,
                background: C.BG,
              }}>{condSpans && condSpans.length > 0 ? shortColName(col.label) : col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(ri => {
            const row = rawData[ri];
            if (!row) return null;
            const inHotspot = ri >= hotspot.rowStart && ri <= hotspot.rowEnd;
            return (
              <tr key={ri}>
                <td style={{
                  ...TD_ID_CELL,
                  borderRight: `1px solid ${C.BORDER}`, borderBottom: `1px solid ${C.BORDER_L}`,
                  color: C.TEXT_3, fontWeight: inHotspot ? FW.SEMI : FW.NORM,
                  background: ri % 2 === 0 ? C.WHITE : C.BG_L,
                }}>
                  {fr(ri)}
                </td>
                {colEntries.map((col, ci) => {
                  const isData = col.role === "data";
                  const cell = isData ? visGrid.get(`${ri},${col.vi}`) : null;
                  const bg = isData ? cellBg(cell) : {};
                  const textColor = isData ? cellTextColor(cell) : C.TEXT_3;
                  const value = row[col.rawCI];
                  const displayVal = value == null || value === "" ? "" : String(value);
                  const base = isData ? TD_NUM_CELL : TD_ID_CELL;
                  return (
                    <td key={ci} style={{
                      ...base,
                      borderBottom: `1px solid ${C.BORDER_L}`, borderRight: `1px solid ${C.BORDER_L}`,
                      color: textColor,
                      background: isData ? undefined : C.BG_L,
                      fontStyle: isData ? "normal" : "italic",
                      ...bg,
                    }}>
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ──

export function HotspotExcerptList({
  convergence, rawData, rowMap, colHeaders, visColIndices, dColMap, roles, coordCtx, condPerCol,
}) {
  const { grid, hotspots, pattern } = convergence;
  const nVisRows = rawData.length;
  const nVisCols = visColIndices.length;
  const [expandedExcerpts, setExpandedExcerpts] = useState({});

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

  const colEntries = useMemo(() => visColIndices.map((rawCI, vi) => ({
    vi, rawCI, role: roles[rawCI],
    label: colHeaders[vi],
  })), [visColIndices, roles, colHeaders]);

  // Build condition spans for visible columns
  const condSpans = useMemo(() => {
    if (!condPerCol) return [];
    // visColIndices maps to raw hdrs indices — build condPerCol for visible cols
    const visCondPerCol = visColIndices.map(ci => condPerCol[ci] || "");
    if (!visCondPerCol.some(c => c)) return [];
    const spans = [];
    let cur = visCondPerCol[0], len = 1;
    for (let i = 1; i < visCondPerCol.length; i++) {
      if (visCondPerCol[i] === cur) { len++; }
      else { spans.push({ name: cur, len }); cur = visCondPerCol[i]; len = 1; }
    }
    spans.push({ name: cur, len });
    return spans;
  }, [condPerCol, visColIndices]);

  // No hotspots
  if (!visHotspots.length) {
    if (pattern === "clean" || grid.size === 0) {
      return <div style={{ padding: "16px 0", color: C.TEXT_3, fontSize: FS.base }}>No convergent spatial patterns detected.</div>;
    }
    return <div style={{ padding: "16px 0", color: C.TEXT_2, fontSize: FS.base, lineHeight: "1.6" }}>No spatially localised hotspots detected. Flags are from dataset-wide statistical tests rather than localised regions.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {visHotspots.map((h, i) => {
        const isOpen = expandedExcerpts[i] || false;
        return (
          <div key={i} style={{
            border: `1px solid ${C.BORDER_L}`, borderRadius: CR.MD,
            overflow: "hidden", background: C.WHITE,
          }}>
            {/* Hotspot header */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: FS.base, fontWeight: FW.BOLD, color: C.TEXT }}>{RANK_NUMS[i] || `(${i + 1})`}</span>
                <span style={{ fontSize: FS.base, fontWeight: FW.SEMI, color: C.TEXT }}>
                  {fmtLoc(h, coordCtx)}
                </span>
                <span style={{ fontSize: FS.xs, color: C.TEXT_3 }}>
                  — {h.categories.map(cat => MECHANISMS[cat]?.label || cat).join(", ")}
                </span>
              </div>
              <div style={{ fontSize: FS.xs, color: C.TEXT_3, marginLeft: 22 }}>
                {h.tests.length} test{h.tests.length !== 1 ? "s" : ""}, {h.categories.length} categor{h.categories.length !== 1 ? "ies" : "y"} converging
              </div>
              {/* Show data excerpt toggle */}
              <button
                onClick={() => setExpandedExcerpts(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: C.TEXT_3, fontSize: FS.xs, display: "flex", alignItems: "center",
                  gap: "4px", marginTop: "6px", marginLeft: 22,
                }}
              >
                <span>{isOpen ? "\u25BE" : "\u25B8"}</span>
                <span>Show data excerpt</span>
              </button>
            </div>

            {/* Expandable table excerpt */}
            {isOpen && (
              <div style={{ padding: "0 16px 12px" }}>
                <ExcerptTable
                  hotspot={h} visGrid={visGrid} rawData={rawData}
                  colEntries={colEntries} nVisRows={nVisRows} coordCtx={coordCtx}
                  condSpans={condSpans}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

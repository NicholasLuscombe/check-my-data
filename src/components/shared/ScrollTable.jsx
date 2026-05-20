/* ── ScrollTable — shared scrollable data table with frozen columns ──
   Used by ImportView (preview table) and HotspotExcerpt (detail table).
   Handles: colgroup, ColumnHeaders, frozen sticky columns, gap rows,
   zebra striping, border-box sizing, scrollbar clearance.
   Cell rendering delegated to caller via renderCell callback.
   Large tables (>500 data rows) are virtualized: only visible rows + buffer
   are mounted in the DOM. */

import { Fragment, useRef, useMemo, useState, useCallback, useEffect } from "react";
import { C, FS, FW, FF, CR } from "../../constants/tokens.js";
import { TD_ID_CELL, COL_W, FREEZE_COL_W, FREEZE_Z, COMPACT_ROW_H, COMPACT_CELL_PADDING } from "./styles.js";
import { ColumnHeaders } from "./ColumnHeaders.jsx";

const BB = { boxSizing: "border-box" };

/** Composite an rgba() color onto a solid hex base → opaque hex.
 *  Needed so sticky/frozen cells fully occlude scrolling content beneath. */
export const blendOnto = (fg, baseBg) => {
  if (!fg || !fg.startsWith("rgba(")) return fg || baseBg;
  const m = fg.match(/rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
  if (!m) return fg;
  const [, rs, gs, bs, as] = m;
  const a = parseFloat(as);
  if (a >= 1) return fg;
  // Parse base hex
  const hex = baseBg?.replace("#", "") || "FFFFFF";
  const br = parseInt(hex.slice(0, 2), 16), bg = parseInt(hex.slice(2, 4), 16), bb = parseInt(hex.slice(4, 6), 16);
  const r = Math.round(parseFloat(rs) * a + br * (1 - a));
  const g = Math.round(parseFloat(gs) * a + bg * (1 - a));
  const b = Math.round(parseFloat(bs) * a + bb * (1 - a));
  return `rgb(${r},${g},${b})`;
};

// ── Virtualization constants ──
// ROW_H is now mode-aware: default (non-compact) callers render at the
// historical 28 px row; the forensics §2 sticky-surface data block
// (compactMode=true) tightens body padding to 2px 8px which measures
// at 22 px (COMPACT_ROW_H). The virtualisation spacer math reads the
// mode-appropriate value so spacer pixels match actual rendered row
// height — without this, the scrollbar thumb size and minimap viewport
// band drift on large fixtures (DS11 1499 rows ≈ 9 000 px spacer drift
// pre-fix).
const ROW_H_DEFAULT = 28;
const VIRT_THRESHOLD = 500; // virtualize only when total data rows exceed this
const VIRT_BUFFER = 20;     // extra rows rendered above/below viewport

/**
 * @param {object} props
 * @param {Array<{letter:string, name:string, role:string}>} props.columns
 * @param {Array<{name:string, len:number}>} [props.condSpans]
 * @param {object} [props.condColorMap]
 * @param {object|null} props.freeze — {n, offsets, totalW, spanFrozen}
 * @param {boolean} [props.hasMarker=false]
 * @param {number} [props.markerLeft=0]
 *
 * Row data — provide ONE of:
 * @param {Array<{rows:number[], gapAfter:number, gapBefore?:number}>} [props.rowSegments]
 * @param {Array<{row:any[], idx:number}|{gap:true, skipped:number}>} [props.previewRows]
 * @param {any[]} [props.rawData] — backing data array for segment-based rows
 *
 * @param {function} props.renderRowNum — (ri, rowData) => display value
 * @param {function} props.renderCell — (row, col, ci, ri, zebraBg) => {content, style}
 * @param {function} [props.renderMarker] — (ri, zebraBg) => JSX
 * @param {function} [props.renderInsertedRows] — (ri) => JSX|null — extra rows after data row ri
 * @param {function} [props.renderRowExtra] — (ri, row, zebraBg) => {fontWeight?, color?} for # cell
 * @param {function} [props.onHeaderClick] — (ci) => void
 * @param {number[]} [props.highlightCols]
 * @param {number|string} [props.height="360px"]
 * @param {React.Ref} [props.tableRef]
 * @param {React.Ref} [props.theadRef]
 * @param {object} [props.rowRefs] — mutable ref for row elements
 * @param {React.ReactNode} [props.children] — after table (minimaps, findings)
 */
export function ScrollTable({
  columns, condSpans = null, condColorMap = null,
  freeze = null, hasMarker = false, markerLeft = 0,
  rowSegments = null, previewRows = null, rawData = null,
  renderRowNum, renderCell, renderMarker = null, renderInsertedRows = null, renderRowExtra = null,
  onHeaderClick = null, highlightCols = [],
  headerTintCols = null, headerTintColor = null,
  height = "360px", tableRef: externalRef = null, theadRef: externalTheadRef = null,
  rowRefs = null, children = null,
  compactMode = false,
}) {
  const ROW_H = compactMode ? COMPACT_ROW_H : ROW_H_DEFAULT;
  const internalRef = useRef(null);
  const scrollRef = externalRef || internalRef;
  const internalTheadRef = useRef(null);
  const headRef = externalTheadRef || internalTheadRef;

  const nFrz = freeze ? freeze.n : 0;
  const GAP_REPEAT = 5;

  // Compute table width as sum of col widths
  const tableWidth = useMemo(() => {
    let w = COL_W.ROW_NUM + (hasMarker ? COL_W.MARKER : 0);
    for (let ci = 0; ci < columns.length; ci++) {
      const isFrozen = freeze && ci < nFrz;
      const isData = columns[ci].role === "data";
      w += isFrozen ? FREEZE_COL_W.ID_COL : isData ? COL_W.DATA : COL_W.ID_MIN;
    }
    return w;
  }, [columns, freeze, nFrz, hasMarker]);

  // ── Flatten rowSegments into an ordered item list for virtualization ──
  const flatItems = useMemo(() => {
    if (!rowSegments) return null;
    const items = [];
    for (let si = 0; si < rowSegments.length; si++) {
      const seg = rowSegments[si];
      if (si === 0 && seg.gapBefore > 0) {
        items.push({ type: "gap", count: seg.gapBefore, key: `gb${si}`, topOnly: true });
      }
      for (let idx = 0; idx < seg.rows.length; idx++) {
        items.push({ type: "row", ri: seg.rows[idx], idx, key: `r${seg.rows[idx]}` });
      }
      if (seg.gapAfter > 0) {
        items.push({ type: "gap", count: seg.gapAfter, key: `ga${si}`, topOnly: false });
      }
    }
    return items;
  }, [rowSegments]);

  // Total data rows for virtualization threshold check
  const totalDataRows = useMemo(() => {
    if (!flatItems) return 0;
    return flatItems.filter(it => it.type === "row").length;
  }, [flatItems]);

  const shouldVirtualize = rowSegments && totalDataRows > VIRT_THRESHOLD;

  // Scroll state for virtualization
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(400);

  // Scroll handler — throttled via rAF
  const rafRef = useRef(null);
  const handleScroll = useCallback(() => {
    if (rafRef.current) return; // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (el) {
        setScrollTop(el.scrollTop);
        setContainerH(el.clientHeight);
      }
    });
  }, [scrollRef]);

  // Attach scroll listener for virtualization
  useEffect(() => {
    if (!shouldVirtualize) return;
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    // Initial measurement
    setContainerH(el.clientHeight);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [shouldVirtualize, scrollRef, handleScroll]);

  // Build a row-index → flat-item-index map for scrollToRow support
  const rowToItemIdx = useMemo(() => {
    if (!shouldVirtualize || !flatItems) return null;
    const map = {};
    for (let i = 0; i < flatItems.length; i++) {
      if (flatItems[i].type === "row") map[flatItems[i].ri] = i;
    }
    return map;
  }, [shouldVirtualize, flatItems]);

  // Expose scrollToRow via rowRefs — HotspotExcerpt calls scrollToRow which
  // looks up rowRefs.current[row]. For virtualized tables, we also set a
  // __scrollToRow function on rowRefs so HotspotExcerpt can call it.
  useEffect(() => {
    if (!shouldVirtualize || !rowRefs || !rowToItemIdx) return;
    rowRefs.current.__scrollToRow = (row) => {
      const itemIdx = rowToItemIdx[row];
      if (itemIdx == null) return;
      const el = scrollRef.current;
      if (!el) return;
      const targetTop = itemIdx * ROW_H;
      el.scrollTop = Math.max(0, targetTop - el.clientHeight / 2);
    };
    return () => { if (rowRefs.current) delete rowRefs.current.__scrollToRow; };
  }, [shouldVirtualize, rowRefs, rowToItemIdx, scrollRef]);

  // ── Gap row ──
  const renderGapRow = (count, key, topOnly = false) => {
    const text = `${count} row${count !== 1 ? "s" : ""} not shown`;
    const topBorder = topOnly ? "none" : `1px dashed ${C.BORDER}`;
    const gapBase = { ...BB, padding: "4px 8px", textAlign: "center", fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3, background: C.BG, borderTop: topBorder, borderBottom: `1px dashed ${C.BORDER}` };
    const nData = columns.length - nFrz;
    const dataCells = [];
    let di = 0;
    while (di < nData) {
      const span = Math.min(GAP_REPEAT, nData - di);
      dataCells.push(<td key={nFrz + di} colSpan={span} style={gapBase}>{text}</td>);
      di += span;
    }
    return (
      <tr key={key}>
        <td style={{ ...gapBase, overflow: "visible", zIndex: FREEZE_Z.FROZEN_BODY + 1, ...(freeze ? { position: "sticky", left: 0 } : {}) }}>{text}</td>
        {hasMarker && <td style={{ ...gapBase, position: "sticky", left: markerLeft, zIndex: FREEZE_Z.FROZEN_BODY }} />}
        {Array.from({ length: nFrz }, (_, ci) => (
          <td key={`f${ci}`} style={{ ...gapBase, ...(freeze ? { position: "sticky", left: freeze.offsets[ci + 1], zIndex: FREEZE_Z.FROZEN_BODY } : {}) }} />
        ))}
        {dataCells}
      </tr>
    );
  };

  // ── Data row ──
  const renderDataRow = (row, ri, idx) => {
    const zebraBg = idx % 2 === 0 ? C.WHITE : C.BG_L;
    const rowExtra = renderRowExtra ? renderRowExtra(ri, row, zebraBg) : {};
    // Row-level borderBottom (e.g. LOESS changepoint) — applied to ALL cells for gap-free rendering
    const rowBB = rowExtra.borderBottom || `1px solid ${C.BORDER_L}`;
    return (
      <tr key={ri} ref={rowRefs ? (el => { if (el) rowRefs.current[ri] = el; }) : undefined}>
        <td style={{
          ...TD_ID_CELL, borderBottom: rowBB, borderRight: `1px solid ${C.BORDER_L}`,
          color: rowExtra.color || C.TEXT_3, fontWeight: rowExtra.fontWeight || FW.NORM,
          background: zebraBg, overflow: "hidden",
          ...(freeze ? { position: "sticky", left: 0, zIndex: FREEZE_Z.FROZEN_BODY } : {}),
          // S163 A1.D3 density pass: the # column cell would otherwise
          // keep TD_ID_CELL's 4px 8px padding and pin the row height at
          // ~26.5 px even when data cells shrink. Compact mode applies
          // the body-padding override here too so all cells in the row
          // share the new ~22 px height.
          ...(compactMode ? { padding: COMPACT_CELL_PADDING } : {}),
        }}>
          {renderRowNum(ri, row)}
        </td>
        {hasMarker && renderMarker && renderMarker(ri, zebraBg)}
        {columns.map((col, ci) => {
          const isFrozen = freeze && ci < nFrz;
          const isLastFrozen = freeze && ci === nFrz - 1;
          const { content, style: cellStyle = {} } = renderCell(row, col, ci, ri, zebraBg);
          const frozenBg = isFrozen ? { background: blendOnto(cellStyle.background, zebraBg) } : {};
          return (
            <td key={ci} style={{
              ...BB,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              borderBottom: rowBB,
              ...(!isFrozen && ci > 0 ? { borderLeft: `1px solid ${C.BORDER_L}` } : {}),
              ...(isFrozen ? { position: "sticky", left: freeze.offsets[ci + 1], zIndex: FREEZE_Z.FROZEN_BODY } : {}),
              ...(isLastFrozen ? { borderRight: `1px solid ${C.BORDER_L}` } : {}),
              ...cellStyle,
              ...frozenBg,
            }}>
              {content}
            </td>
          );
        })}
      </tr>
    );
  };

  // ── Spacer row: a single transparent <tr> with a set height ──
  const spacerRow = (h, key) => h > 0 ? (
    <tr key={key}><td colSpan={1 + (hasMarker ? 1 : 0) + columns.length} style={{ height: h, padding: 0, border: "none" }} /></tr>
  ) : null;

  // ── Virtualized body for rowSegments ──
  const renderVirtualizedBody = () => {
    const nItems = flatItems.length;
    const totalH = nItems * ROW_H;
    // Compute visible range
    const startPx = scrollTop;
    const endPx = scrollTop + containerH;
    const startIdx = Math.max(0, Math.floor(startPx / ROW_H) - VIRT_BUFFER);
    const endIdx = Math.min(nItems, Math.ceil(endPx / ROW_H) + VIRT_BUFFER);

    const topH = startIdx * ROW_H;
    const bottomH = Math.max(0, totalH - endIdx * ROW_H);

    const rendered = [];
    for (let i = startIdx; i < endIdx; i++) {
      const item = flatItems[i];
      if (item.type === "gap") {
        rendered.push(renderGapRow(item.count, item.key, item.topOnly));
      } else {
        const row = rawData?.[item.ri];
        if (!row) continue;
        rendered.push(
          <Fragment key={item.ri}>
            {renderDataRow(row, item.ri, item.idx)}
            {renderInsertedRows && renderInsertedRows(item.ri)}
          </Fragment>
        );
      }
    }

    return (
      <>
        {spacerRow(topH, "__virt_top")}
        {rendered}
        {spacerRow(bottomH, "__virt_bot")}
      </>
    );
  };

  // ── Non-virtualized body (original code path) ──
  const renderFullBody = () => (
    <>
      {rowSegments && rowSegments.map((seg, si) => (
        <Fragment key={si}>
          {si === 0 && seg.gapBefore > 0 && renderGapRow(seg.gapBefore, `gb${si}`, true)}
          {seg.rows.map((ri, idx) => {
            const row = rawData?.[ri];
            if (!row) return null;
            return (
              <Fragment key={ri}>
                {renderDataRow(row, ri, idx)}
                {renderInsertedRows && renderInsertedRows(ri)}
              </Fragment>
            );
          })}
          {seg.gapAfter > 0 && renderGapRow(seg.gapAfter, `ga${si}`)}
        </Fragment>
      ))}
      {previewRows && previewRows.map((item, ri) => {
        if (item.gap) return renderGapRow(item.skipped, `gap${ri}`);
        return renderDataRow(item.row, item.idx, ri);
      })}
    </>
  );

  return (
    <div ref={scrollRef} style={{
      overflowY: "auto", overflowX: "auto", paddingBottom: 14,
      // S163 virtualisation rework (W6): contain trackpad overscroll
      // so a gesture that hits the table's scroll limit doesn't chain
      // out to the page. Reserve a stable scrollbar gutter so the
      // table width doesn't jump as content overflow toggles.
      overscrollBehavior: "contain",
      scrollbarGutter: "stable",
      ...(typeof height === "number" ? { height } : typeof height === "string" ? { maxHeight: height } : {}),
      border: `1px solid ${C.BORDER_L}`, borderRadius: CR.SM, background: C.WHITE,
    }}>
      <table style={{
        borderCollapse: "separate", borderSpacing: 0,
        fontSize: FS.xs, width: tableWidth, minWidth: "100%", tableLayout: "fixed",
      }}>
        <colgroup>
          <col style={{ width: COL_W.ROW_NUM }} />
          {hasMarker && <col style={{ width: COL_W.MARKER }} />}
          {columns.map((col, ci) => {
            const isFrozen = freeze && ci < nFrz;
            const isData = col.role === "data";
            return <col key={ci} style={{ width: isFrozen ? FREEZE_COL_W.ID_COL : isData ? COL_W.DATA : COL_W.ID_MIN }} />;
          })}
        </colgroup>

        <ColumnHeaders
          columns={columns}
          highlightCols={highlightCols}
          headerTintCols={headerTintCols}
          headerTintColor={headerTintColor}
          showLetterRow={true}
          showRoleBadge={true}
          condSpans={condSpans}
          condColorMap={condColorMap}
          freeze={freeze}
          hasMarker={hasMarker}
          markerLeft={markerLeft}
          onColumnClick={onHeaderClick}
          theadRef={headRef}
          compactMode={compactMode}
        />

        <tbody>
          {shouldVirtualize ? renderVirtualizedBody() : renderFullBody()}
        </tbody>
      </table>
      {children}
    </div>
  );
}

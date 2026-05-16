/* ── ColumnHeaders — shared sticky column header for all data tables ──
   Row 0: Excel column letters (A, B, C...)
   Row 1 (optional): Condition group spans
   Row 2: Column names + role badges
   Row 3 (optional): Role labels (LABEL, COND, DATA)

   Supports frozen columns (sticky left), condColorMap for condition tints,
   click-to-cycle role, marker column, and box-sizing: border-box.
   Used by ImportView, HotspotExcerpt, HotspotExcerptList, DupDet. */

import { useRef, useState, useLayoutEffect } from "react";
import { C, CC, FW, FF, FS, CR } from "../../constants/tokens.js";
import { FLAG_STYLES } from "../../constants/thresholds.js";
import { ROLES } from "../../constants/roles.js";
import { TH_EVIDENCE, COL_W, FREEZE_COL_W, FREEZE_Z } from "./styles.js";
import { shortColName } from "./coordinates.js";

const BB = { boxSizing: "border-box" };

/**
 * @param {object} props
 * @param {Array<{letter:string, name:string, role?:string}>} props.columns
 * @param {number[]} [props.highlightCols] — indices to highlight (flag colors)
 * @param {boolean} [props.sticky=true] — sticky top positioning
 * @param {{keep:Set,omitted:number}} [props.visCols] — wide-dataset column pruning
 * @param {boolean} [props.showLetterRow=true]
 * @param {boolean} [props.showRoleRow=false] — show LABEL/COND/DATA row
 * @param {boolean} [props.showRoleBadge=false] — show RoleBadge in name row
 * @param {Array<{name:string, len:number}>} [props.condSpans]
 * @param {object} [props.condColorMap] — condition name → {bg, text, border}
 * @param {number|null} [props.condRowNum] — file row number for condition header
 * @param {number|null} [props.nameRowNum] — file row number for names header
 * @param {object|null} [props.freeze] — {n, offsets, spanFrozen} from countFrozenCols
 * @param {boolean} [props.hasMarker=false] — marker column between # and first ID col
 * @param {number} [props.markerLeft=0] — sticky left offset for marker column
 * @param {function} [props.onColumnClick] — (colIndex) => void, for role cycling
 * @param {Set<number>} [props.headerTintCols] — column indices that get a subtle background tint (e.g. IRC column highlight)
 * @param {string} [props.headerTintColor] — CSS background colour for tinted headers
 */
export function ColumnHeaders({
  columns, highlightCols = [], sticky = true, visCols = null,
  showLetterRow = true, showRoleRow = false, showRoleBadge = false,
  condSpans = null, condColorMap = null, condRowNum = null, nameRowNum = null,
  freeze = null, hasMarker = false, markerLeft = 0, onColumnClick = null,
  headerTintCols = null, headerTintColor = null,
  theadRef = null,
}) {
  const vc = visCols;
  const hl = new Set(highlightCols);
  const hasCondRow = condSpans && condSpans.length > 0;
  const nFrz = freeze ? freeze.n : 0;

  // Sticky top offsets measured from actual rendered row heights
  const lettersRef = useRef(null);
  const condRef = useRef(null);
  const nameRef = useRef(null);
  const [stickyTops, setStickyTops] = useState({ cond: 0, name: 0, role: 0 });

  useLayoutEffect(() => {
    const lH = lettersRef.current?.getBoundingClientRect().height || 0;
    const cH = condRef.current?.getBoundingClientRect().height || 0;
    const nH = nameRef.current?.getBoundingClientRect().height || 0;
    setStickyTops({ cond: lH, name: lH + cH, role: lH + cH + nH });
  }, [showLetterRow, hasCondRow, showRoleRow, columns.length]);

  // ── Sticky style helpers ──
  const frozenStyle = (ci, row) => {
    if (!freeze || ci >= nFrz) return {};
    return { position: "sticky", left: freeze.offsets[ci + 1], zIndex: row === "header" ? FREEZE_Z.FROZEN_HEADER : FREEZE_Z.FROZEN_BODY };
  };
  const cornerStyle = (row) => {
    if (!freeze && !sticky) return {};
    return { position: "sticky", left: 0, zIndex: row === "header" ? FREEZE_Z.FROZEN_HEADER : FREEZE_Z.FROZEN_BODY };
  };
  const markerStyle = () => hasMarker ? { position: "sticky", left: markerLeft, zIndex: FREEZE_Z.FROZEN_HEADER } : {};
  const isLastFrz = (ci) => freeze && ci === nFrz - 1;
  const isLastFrzSpan = (spanEnd) => freeze && spanEnd === nFrz - 1;
  const freezeBorder = { borderRight: `1px solid ${C.BORDER_L}` };
  const nonFrzBorderLeft = (ci) => (!freeze || ci >= nFrz) && ci > 0 ? { borderLeft: `1px solid ${C.BORDER_L}` } : {};

  // Top offsets for each header row
  const letterTop = 0;
  const condTop = stickyTops.cond;
  const nameTop = stickyTops.name;
  const roleTop = stickyTops.role;

  // Vertical stickiness on <thead> element. Individual <th> cells only get
  // position:sticky when they need horizontal freeze (left offset).
  const stickyRow = (_top, z) => sticky ? { zIndex: z } : {};

  let ellL = false, ellN = false;

  return (
    <thead ref={theadRef} style={{ background: C.BG, ...(sticky ? { position: "sticky", top: 0, zIndex: FREEZE_Z.FROZEN_HEADER } : {}) }}>
      {/* Row 0: Excel column letters */}
      {showLetterRow && (
        <tr ref={lettersRef} style={{ background: C.BG }}>
          <th style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, borderBottom: "none", borderRight: `1px solid ${C.BORDER_L}`,
            color: C.TEXT_3, background: C.BG, overflow: "hidden",
            ...stickyRow(letterTop, 6), ...cornerStyle("header") }} />
          {hasMarker && <th style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, borderBottom: "none",
            borderRight: `1px solid ${C.BORDER_L}`,
            color: C.TEXT_3, background: C.BG, overflow: "hidden", width: COL_W.MARKER,
            ...stickyRow(letterTop, 6), ...markerStyle() }} />}
          {columns.map((col, ci) => {
            if (vc && !vc.keep.has(ci)) {
              if (ellL) return null;
              ellL = true;
              return <th key="ell" style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, borderBottom: "none", color: C.BORDER, background: C.BG, ...stickyRow(letterTop, 6) }}>⋯</th>;
            }
            ellL = false;
            const isHl = hl.has(ci);
            const isTinted = !isHl && headerTintCols?.has(ci);
            return <th key={ci} style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, borderBottom: "none",
              color: isHl ? CC.THRESH : C.TEXT_3, background: isHl ? FLAG_STYLES.HIGH.bg : isTinted ? headerTintColor : C.BG,
              overflow: "hidden",
              ...nonFrzBorderLeft(ci),
              ...stickyRow(letterTop, 6), ...frozenStyle(ci, "header"),
              ...(isLastFrz(ci) ? freezeBorder : {}),
            }}>{col.letter}</th>;
          })}
        </tr>
      )}

      {/* Row 1: Condition group spans */}
      {hasCondRow && (
        <tr ref={condRef} style={{ background: C.BG }}>
          <th style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, borderBottom: "none", borderRight: `1px solid ${C.BORDER_L}`,
            background: C.BG, overflow: "hidden",
            ...stickyRow(condTop, 5), ...cornerStyle("header") }}>{condRowNum ?? ""}</th>
          {hasMarker && <th style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, borderBottom: "none",
            borderRight: `1px solid ${C.BORDER_L}`,
            background: C.BG, overflow: "hidden", width: COL_W.MARKER,
            ...stickyRow(condTop, 5), ...markerStyle() }} />}
          {(() => {
            if (!vc) {
              let spanStart = 0;
              return condSpans.map((sp, si) => {
                const isFrz = freeze?.spanFrozen?.[si];
                const spanLeft = isFrz ? FREEZE_COL_W.ROW_NUM + (hasMarker ? COL_W.MARKER : 0) + spanStart * FREEZE_COL_W.ID_COL : undefined;
                const spanEnd = spanStart + sp.len - 1;
                spanStart += sp.len;
                const ccm = condColorMap?.[sp.name];
                return (
                  <th key={si} colSpan={sp.len} style={{
                    ...BB, ...TH_EVIDENCE,
                    fontSize: FS.xs,
                    fontWeight: showRoleBadge ? FW.NORM : FW.BOLD,
                    ...(showRoleBadge ? {} : { letterSpacing: "0.04em" }),
                    textAlign: "center", whiteSpace: "nowrap",
                    borderBottom: "none", overflow: "hidden",
                    padding: sp.name ? "4px 8px" : "4px 2px",
                    color: sp.name ? (ccm?.text || C.TEXT_2) : C.BORDER,
                    background: sp.name ? (ccm?.bg || C.BORDER_L) : C.BG,
                    ...stickyRow(condTop, 5),
                    ...(isFrz ? { position: "sticky", left: spanLeft, zIndex: FREEZE_Z.FROZEN_HEADER } : {}),
                    ...(isLastFrzSpan(spanEnd) ? freezeBorder : {}),
                  }}>{sp.name || ""}</th>
                );
              });
            }
            // visCols pruning path (unchanged from original)
            const expanded = [];
            let idx = 0;
            for (const sp of condSpans) {
              for (let j = 0; j < sp.len; j++) expanded.push({ name: sp.name, colIdx: idx++ });
            }
            const filtered = expanded.filter(e => vc.keep.has(e.colIdx));
            if (filtered.length === 0) return null;
            const groups = [];
            let cur = { name: filtered[0].name, len: 1 };
            for (let i = 1; i < filtered.length; i++) {
              if (filtered[i].name === cur.name) cur.len++;
              else { groups.push(cur); cur = { name: filtered[i].name, len: 1 }; }
            }
            groups.push(cur);
            return groups.map((g, gi) => {
              const ccm = condColorMap?.[g.name];
              return (
                <th key={gi} colSpan={g.len} style={{
                  ...BB, ...TH_EVIDENCE,
                  fontSize: FS.xs,
                  fontWeight: showRoleBadge ? FW.NORM : FW.BOLD,
                  ...(showRoleBadge ? {} : { letterSpacing: "0.04em" }),
                  textAlign: "center", whiteSpace: "nowrap",
                  borderBottom: "none", overflow: "hidden",
                  padding: g.name ? "4px 8px" : "4px 2px",
                  color: g.name ? (ccm?.text || C.TEXT_2) : C.BORDER,
                  background: g.name ? (ccm?.bg || C.BORDER_L) : C.BG,
                  ...stickyRow(condTop, 5),
                }}>{g.name || ""}</th>
              );
            });
          })()}
        </tr>
      )}

      {/* Row 2: Column names (+ optional RoleBadge) */}
      <tr ref={nameRef} style={{ background: showRoleBadge ? C.WHITE : C.BG_L }}>
        <th style={{ ...BB, ...TH_EVIDENCE,
          padding: showLetterRow || hasCondRow ? "8px 8px 6px" : "6px 8px",
          borderRight: `1px solid ${C.BORDER_L}`, background: showRoleBadge ? C.WHITE : C.BG_L,
          overflow: "hidden",
          ...(showRoleBadge ? { borderBottom: "none", boxShadow: `inset 0 -2px 0 ${C.BORDER}` } : {}),
          ...stickyRow(nameTop, 4), ...cornerStyle("header"),
        }}>{nameRowNum ?? (showRoleBadge ? "#" : "Row")}</th>
        {hasMarker && <th style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs,
          padding: "4px 2px", background: showRoleBadge ? C.WHITE : C.BG_L,
          overflow: "hidden", width: COL_W.MARKER, borderRight: `1px solid ${C.BORDER_L}`,
          ...(showRoleBadge ? { borderBottom: "none", boxShadow: `inset 0 -2px 0 ${C.BORDER}` } : {}),
          ...stickyRow(nameTop, 4), ...markerStyle(),
        }} />}
        {columns.map((col, ci) => {
          if (vc && !vc.keep.has(ci)) {
            if (ellN) return null;
            ellN = true;
            return <th key="ell" style={{ ...BB, ...TH_EVIDENCE, padding: "8px 8px 6px", color: C.TEXT_3, background: showRoleBadge ? C.WHITE : C.BG_L,
              ...stickyRow(nameTop, 4) }}>⋯{vc.omitted} cols</th>;
          }
          ellN = false;
          const isHl = hl.has(ci);
          const displayName = hasCondRow ? shortColName(col.name) : col.name;

          if (showRoleBadge) {
            // Import/hotspot style: role-colored bg, RoleBadge, clickable
            const r = ROLES[col.role] || ROLES.data;
            const isData = col.role === "data";
            return (
              <th key={ci} onClick={onColumnClick ? () => onColumnClick(ci) : undefined}
                style={{ ...BB, padding: 0, background: r.bg,
                  textAlign: "center", overflow: "hidden",
                  ...(onColumnClick ? { cursor: "pointer", userSelect: "none" } : {}),
                  ...nonFrzBorderLeft(ci),
                  boxShadow: `inset 0 -2px 0 ${r.border}`,
                  ...stickyRow(nameTop, 4), ...frozenStyle(ci, "header"),
                  ...(isLastFrz(ci) ? freezeBorder : {}),
                }}>
                <div style={{ padding: "5px 6px 2px", fontSize: FS.xs, fontWeight: FW.SEMI, color: C.TEXT,
                  whiteSpace: isData ? "normal" : "nowrap", wordBreak: isData ? "break-word" : undefined,
                  overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
                <div style={{ padding: "2px 6px 5px" }}>
                  <span style={{ display: "inline-block", background: C.WHITE, color: r.color,
                    borderRadius: CR.S2, padding: "2px 6px", fontSize: FS.xs, fontFamily: FF.UI,
                    fontWeight: FW.MED, userSelect: "none" }}>{r.chipLabel || r.label}</span>
                </div>
              </th>
            );
          }

          // Simple style: plain text header (DupDet, HotspotExcerptList)
          const nameColor = isHl ? CC.THRESH : col.role === "data" ? CC.OBS : C.TEXT_3;
          return <th key={ci} style={{ ...BB, ...TH_EVIDENCE,
            padding: showLetterRow || hasCondRow ? "8px 8px 6px" : "6px 8px",
            color: nameColor, background: isHl ? FLAG_STYLES.HIGH.bg : C.BG_L,
            overflow: "hidden",
            ...stickyRow(nameTop, 4), ...frozenStyle(ci, "header"),
          }}>{displayName}</th>;
        })}
      </tr>

      {/* Row 3 (optional): Role labels — plain colored text */}
      {showRoleRow && (() => {
        let ellR = false;
        return (
          <tr style={{ background: C.WHITE }}>
            <th style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, padding: "2px 8px",
              borderRight: `1px solid ${C.BORDER_L}`, background: C.WHITE, overflow: "hidden",
              ...stickyRow(roleTop, 3), ...cornerStyle("header") }} />
            {columns.map((col, ci) => {
              if (vc && !vc.keep.has(ci)) {
                if (ellR) return null;
                ellR = true;
                return <th key="ell" style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, padding: "2px 8px", color: C.BORDER, background: C.WHITE, ...stickyRow(roleTop, 3) }} />;
              }
              ellR = false;
              const roleInfo = ROLES[col.role] || ROLES.data;
              return <th key={ci} style={{ ...BB, ...TH_EVIDENCE, fontSize: FS.xs, padding: "2px 8px",
                color: roleInfo.color, fontWeight: FW.SEMI, letterSpacing: "0.04em", background: C.WHITE,
                ...stickyRow(roleTop, 3) }}>{roleInfo.label}</th>;
            })}
          </tr>
        );
      })()}
    </thead>
  );
}

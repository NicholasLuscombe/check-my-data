/* ── Shared inline styles — single source of truth for repeated patterns ── */

import { C, TF, FW, FF, UI, CC, SIGNAL, ACCENT } from "../../constants/tokens.js";
import { FLAG_STYLES } from "../../constants/thresholds.js";

// Sub-heading inside MiniCards — used by all 24 cards for section labels.
export const SUB_HEAD = { fontSize: TF.DETAIL, fontFamily: FF.UI, fontWeight: FW.SEMI, color: C.TEXT_3, marginBottom: "8px" };

export const S_NOTE  = { fontFamily: FF.UI, fontSize: TF.DETAIL, color: C.TEXT_4, marginTop: "2px", paddingLeft: "4px" };
// Shared header style for all data tables (evidence, hotspot, import preview).
// Background applied at <tr> level.
export const TH_EVIDENCE = { boxSizing:"border-box", padding:"6px 8px", fontSize:TF.DETAIL, fontFamily:FF.UI, fontWeight:FW.SEMI, color:C.TEXT_3, textAlign:"center", borderBottom:`1px solid ${C.BORDER_L}`, whiteSpace:"nowrap" };

// Data excerpt cell styles — used by DupDet, HotspotExcerptList, and any raw data table.
// Override only background/color/fontWeight for highlighting; dimensions are baked in.
export const TD_NUM_CELL = { boxSizing:"border-box", padding:"4px 8px", fontSize:TF.DETAIL, fontFamily:FF.MONO, fontVariantNumeric:"tabular-nums", textAlign:"center", whiteSpace:"nowrap" };
export const TD_ID_CELL  = { boxSizing:"border-box", padding:"4px 8px", fontSize:TF.DETAIL, fontFamily:FF.UI, textAlign:"center", whiteSpace:"nowrap" };

// Contextual banner for test cards — info (blue), warn (amber), caution (amber-highlight).
// Edit here to change banner appearance for all cards at once.
export const BANNER_STYLES = {
  info:    { bg: UI.INFO.bg,             border: ACCENT.BLUE.border,  color: CC.OBS },
  warn:    { bg: UI.WARN.bg,             border: ACCENT.GOLD.border,  color: UI.WARN.text },
  caution: { bg: FLAG_STYLES.MODERATE.bg, border: SIGNAL.AMBER.border, color: FLAG_STYLES.MODERATE.text },
};

// ── Column width rules — shared by HotspotExcerpt and ImportView ──
// DATA columns: uniform fixed width (fits "0.5398" in monospace at TF.DETAIL).
// LABEL/COND columns: sized to content with min/max bounds.
// # column: compact, fits 2–4 digit row numbers.
export const COL_W = {
  ROW_NUM: 42,        // # column — compact row number
  DATA:    72,        // uniform for all DATA columns (6-char decimal values)
  DATA_MAX: 72,       // max-width for DATA header text (wrap beyond this)
  ID_MIN:  60,        // LABEL/COND minimum
  ID_MAX:  160,       // LABEL/COND maximum (ellipsis beyond)
  MARKER:  24,        // group marker column (①②③)
};

// ── Sticky frozen columns — shared by HotspotExcerpt and ImportView ──
// Frozen column widths use COL_W for the # column and ID columns.
export const FREEZE_COL_W = { ROW_NUM: COL_W.ROW_NUM, ID_COL: 80 };
// Z-index layering for sticky cells (higher = on top).
// Frozen header cells are sticky in both axes, frozen body cells sticky-left only.
export const FREEZE_Z = {
  FROZEN_HEADER: 12,  // sticky top + left (corner cells in frozen zone)
  FROZEN_BODY:   5,   // sticky left only (data rows in frozen zone)
  HEADER:        4,   // sticky top only (scrolling header cells)
};
// Freeze boundary line color — rendered as a positioned overlay div, not per-cell border.
export const FREEZE_LINE_COLOR = "rgba(0,0,0,0.08)";

/**
 * Count how many columns from the left should be frozen.
 * Rule: freeze consecutive LABEL/COND columns from index 0.
 * The # (row number) column is always frozen separately.
 * Stop at the first DATA, SKIP/ignore, or any other role.
 * @param {string[]} roles — role per column ("data", "label", "condition", "ignore")
 * @returns {number} — number of columns to freeze (excludes the # column)
 */
export function countFrozenCols(roles) {
  let n = 0;
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] !== "label" && roles[i] !== "condition") break;
    n++;
  }
  return n;
}

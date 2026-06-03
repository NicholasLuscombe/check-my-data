/* ── Shared inline styles — single source of truth for repeated patterns ── */

import { C, FS, FW, FF, UI, CC, SIGNAL, ACCENT } from "../../constants/tokens.js";
import { FLAG_STYLES } from "../../constants/thresholds.js";

// Sub-heading inside MiniCards — used across the §3 mini-card surface for
// section labels above charts, tables, and per-condition breakdowns. Co-consumed
// at 35+ sites across 26 mini-cards plus CorrMatrix + ConditionTable.
//
// Register: sm Semibold C.TEXT_3 sans — added to TYPOGRAPHY-SYSTEM.md § Register
// inventory at S150 (C.8 / B1) as a genuinely new tuple. Pre-S150 the size was
// TF.DETAIL (11px); the size lift to FS.sm (14px) makes the label legible at
// the same physical distance the rest of §3 reads at, without crossing into
// table-header weight + colour.
export const SUB_HEAD = { fontSize: FS.sm, fontFamily: FF.UI, fontWeight: FW.SEMI, color: C.TEXT_3, marginBottom: "8px" };

// S210 (card composition): the footer fragment promoted to the body's lead
// header on an expanded card — the finding-in-plain-words that heads the first
// data surface. One tier above SUB_HEAD (dark + Semibold vs muted) so a
// demoted secondary-surface heading reads clearly below it.
export const LEAD_HEAD = { fontSize: FS.sm, fontFamily: FF.UI, fontWeight: FW.SEMI, color: C.TEXT };

// S210 (card composition): the two — and only two — vertical-rhythm units for
// the card body. BLOCK_GAP separates major blocks (header line → footer-lead →
// surface → secondary surface → disclosure row); BLOCK_GAP_TIGHT is the
// within-block gap from a surface heading to its own plot/table. Applied at
// every inter-block gap rather than per-card ad-hoc margins. Not a glyph
// register, so these live here rather than in TYPOGRAPHY-SYSTEM.md.
export const BLOCK_GAP = "12px";
export const BLOCK_GAP_TIGHT = "6px";

// S151 (C.9 / B1): full spec match for footnote/reference register.
// Pre-S151: fontSize TF.DETAIL (11px) + color C.TEXT_4. Now sm Regular C.TEXT_2 sans
// per TYPOGRAPHY-SYSTEM.md § Tables "Footnote / reference under table" row.
export const S_NOTE  = { fontFamily: FF.UI, fontSize: FS.sm, color: C.TEXT_2, marginTop: "2px", paddingLeft: "4px" };
// Shared header style for all data tables (evidence, hotspot, import preview).
// Background applied at <tr> level. S151 (C.9): fontSize TF.DETAIL → FS.sm
// per TYPOGRAPHY-SYSTEM.md § Tables "Header (semantic)" row.
export const TH_EVIDENCE = { boxSizing:"border-box", padding:"6px 8px", fontSize:FS.sm, fontFamily:FF.UI, fontWeight:FW.SEMI, color:C.TEXT_3, textAlign:"center", borderBottom:`1px solid ${C.BORDER_L}`, whiteSpace:"nowrap" };

// Data excerpt cell styles — used by DupDet, HotspotExcerptList, and any raw data table.
// Override only background/color/fontWeight for highlighting; dimensions are baked in.
// S150 (C.8 / B5): size pegged to FS.xs (13px) per TYPOGRAPHY-SYSTEM.md § Tables
// "Body cells (text / numeric values)" row. Pre-S150 was TF.DETAIL (11px) — the
// 11px residual preference noted at S136 (parked #14) re-evaluated and resolved
// in favour of the spec target.
export const TD_NUM_CELL = { boxSizing:"border-box", padding:"4px 8px", fontSize:FS.xs, fontFamily:FF.MONO, fontVariantNumeric:"tabular-nums", textAlign:"center", whiteSpace:"nowrap" };
export const TD_ID_CELL  = { boxSizing:"border-box", padding:"4px 8px", fontSize:FS.xs, fontFamily:FF.UI, textAlign:"center", whiteSpace:"nowrap" };

// Contextual banner for test cards — info (blue), warn (amber), caution (amber-highlight).
// Edit here to change banner appearance for all cards at once.
export const BANNER_STYLES = {
  info:    { bg: UI.INFO.bg,             border: ACCENT.BLUE.border,  color: CC.OBS },
  warn:    { bg: UI.WARN.bg,             border: ACCENT.GOLD.border,  color: UI.WARN.text },
  caution: { bg: FLAG_STYLES.MODERATE.bg, border: SIGNAL.AMBER.border, color: FLAG_STYLES.MODERATE.text },
};

// ── Column width rules — shared by HotspotExcerpt and ImportView ──
// DATA columns: uniform fixed width (fits "0.5398" in monospace at FS.xs).
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

// ── compactMode density overrides (S163 A1.D3 density pass) ──
// The forensics §2 sticky-surface data block mounts ExcerptTable with
// compactMode=true and a 320 px height budget. Default body cell padding
// (4px 8px) gives a 26.5 px row; the 100 px header stack (letter +
// condition + name+chip rows) eats most of the budget, leaving ~8 rows
// visible. These overrides tighten the vertical rhythm for the
// sticky-surface mount only — non-compact callers (ImportView, modal-era
// shim) keep the default paddings via TD_NUM_CELL / TD_ID_CELL / the
// inline header literals.
//
// Padding-only changes: font size, weight, and colour roles are
// untouched per TYPOGRAPHY-SYSTEM.md (the lock is on the type scale, not
// on spacing). The compactRowH constant is the measured rendered height
// after the padding tighten — ScrollTable's virtualisation spacer math
// reads it when compactMode is true so spacer pixels match actual row
// height (no scrollbar-thumb / minimap-band drift on virtualised
// fixtures like DS11/DS19).
export const COMPACT_CELL_PADDING       = "2px 8px";  // body cells
export const COMPACT_HEADER_PADDING_TIGHT = "2px 8px"; // letter row, condition span, role label row
export const COMPACT_HEADER_NAME_INNER_TOP    = "2px 6px 1px"; // name <div> inside the name+chip <th>
export const COMPACT_HEADER_NAME_INNER_BOTTOM = "1px 6px 2px"; // chip wrapper <div>
export const COMPACT_ROW_H = 22.5;      // measured row height after compactMode body-padding tighten
// Exact rendered height — DPR=2 (Retina) renders 22.5 CSS px as 45
// device px (integer), stable across rows. Verified via 20-row sample
// on DS11: every per-row height + every consecutive-row offsetTop
// delta + the 19-row span midpoint all = 22.5 exactly. The integer
// 22 would compound 0.5 px of drift per row → ~750 px of misalignment
// across DS11's 1499 rows, surfacing as scrollbar-thumb and minimap
// viewport-band drift toward the bottom of the dataset.

// ── Content-aware column-width derivation (S163 A1.D3 final pass) ──
// Width formula for a data column:
//   colW = max(maxLen × DATA_CHAR_W + DATA_CELL_PADDING_H + DATA_CELL_BORDER_W,
//              MIN_DATA_COL_W)
// where maxLen is the longest formatted-value string in the column
// (carried in summary.colMaxLen). Char advance width measured live on
// the dev server: JetBrains Mono at 13 px with font-variant-numeric:
// tabular-nums renders every character at exactly 7.8 CSS px (verified
// across digits, dot, sign — stable to 0.005 px). Horizontal cell
// padding is 8 px each side; left border is 1 px. MIN_DATA_COL_W is the
// floor so a 1-2-char value column doesn't collapse below a legible
// minimum.
//
// The width replaces COL_W.DATA / COL_W.ID_MIN / FREEZE_COL_W.ID_COL
// for non-marker, non-#-column cols when supplied at the consumer's
// column-build site. ScrollTable's colgroup picks col.width ?? the
// role-keyed COL_W fallback — when col.width is provided, the role-
// keyed constant is bypassed (a side-benefit: ImportView role-cycle
// stops reflowing because the width no longer keys off role).
//
// Truncation-safety: the formula derives width from the column's
// MAXIMUM value, so no data value ever ellipsis-clips. Forensic signal
// in trailing decimals (precision consistency, last-digit) is
// preserved.
export const DATA_CHAR_W = 7.8;            // CSS px per char, JetBrains Mono 13px tabular
export const DATA_CELL_PADDING_H = 16;     // 8px × 2 (2px 8px cell padding)
export const DATA_CELL_BORDER_W = 1;       // 1px left border (right border absent on most cells)
export const MIN_DATA_COL_W = 48;          // floor — fits ~4 chars + padding

/**
 * Per-column rendered width from a max-content-length scalar.
 * Used by ImportView + ExcerptTable when building the `columns` prop;
 * the colgroup in ScrollTable consumes the resulting `width` field per
 * column.
 */
export function colWidthFromMaxLen(maxLen) {
  const contentW = (maxLen || 0) * DATA_CHAR_W + DATA_CELL_PADDING_H + DATA_CELL_BORDER_W;
  return Math.max(MIN_DATA_COL_W, Math.ceil(contentW));
}

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

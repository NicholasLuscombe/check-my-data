import React from "react";
import { FS, FW, FF, C, UI } from "../../constants/tokens.js";

/* ── AsideCallout — typography-system aside-callout chrome ────────────
 *
 * Three-consumer extraction landed S161 (A1.D2):
 *   - S139c report-level screening-aid disclaimer ("info" tone)
 *   - S137 replicate-structure advisory ("warn" tone, with strongLabel)
 *   - S161 §4 confidentiality callout ("frame" tone)
 *
 * Pre-S161 each site rendered the chrome inline; the comment at
 * ReportView.jsx:828 read "helper extraction defers until a third cross-
 * sub-type consumer." The §4 callout is that third consumer, so the
 * extraction lands here and all three sites re-point.
 *
 * Tone tokens map onto UI.{INFO,WARN,FRAME}.callout in tokens.js. The
 * registered chrome shape is a left-rule aside (3px coloured rule on the
 * left edge, soft-tinted background, square left + rounded right border
 * radius). Body register: FS.sm regular, C.TEXT, FF.UI, lineHeight 1.6.
 *
 * lineHeight standardised at 1.6 across all three consumers in S161. The
 * S137 site explicitly set lineHeight 1.6; the S139c site relied on the
 * browser default (≈1.5). Unifying produces a marginally looser leading
 * at the S139c surface — the prior asymmetry was an oversight, not an
 * intentional register difference.
 *
 * `strongLabel` renders inline before the body with Semibold weight and
 * 8px right margin. Used by the S137 warn variant's "⚠ Column structure
 * note" prefix. Body content arrives as `children`.
 */

const TONE_TOKEN = {
  info:  UI.INFO.callout,
  warn:  UI.WARN.callout,
  frame: UI.FRAME.callout,
};

export function AsideCallout({
  tone = "info",
  strongLabel,
  children,
  marginBottom = "12px",
}) {
  const t = TONE_TOKEN[tone] || TONE_TOKEN.info;
  return (
    <div style={{
      background: t.bg,
      borderLeft: `3px solid ${t.rule}`,
      borderRadius: "0 4px 4px 0",
      padding: "14px 18px",
      marginBottom,
      fontSize: FS.sm,
      color: C.TEXT,
      lineHeight: "1.6",
      fontFamily: FF.UI,
    }}>
      {strongLabel && (
        <span style={{ fontWeight: FW.SEMI, marginRight: "8px" }}>
          {strongLabel}
        </span>
      )}
      {children}
    </div>
  );
}

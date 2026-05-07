/* ── PlotLayout — shared wrapper for SVG charts ──
   Replaces miniCardWrap(<><Plot/><S_NOTE>...</S_NOTE></>) pattern.
   Provides consistent container styling.
   Chart-specific margins, axes, and gridlines stay inside each plot. */

import { C, CR } from "../../constants/tokens.js";

/**
 * @param {object} props
 * @param {boolean} [props.fitContent] - shrink-wrap to content width and centre horizontally
 * @param {JSX.Element} [props.children] - SVG chart content (PlotSVG output)
 */
export function PlotLayout({ children, fitContent }) {
  return (
    <div style={{
      margin: fitContent ? "0 auto 8px auto" : "0 0 8px 0",
      ...(fitContent && { width: "fit-content" }),
      padding: "10px",
      background: C.BG,
      border: `1px solid ${C.BORDER_L}`,
      borderRadius: CR.MD,
      overflowX: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

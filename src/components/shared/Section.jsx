/* ── Section — numbered section wrapper for report view ──
   Renders "─── 1 · SUMMARY ───" divider + padded content container.
   Spacing between sections controlled here, not by parent.

   S126b add-3: SectionHeader extracted as its own export so callers
   can render the divider+title strip outside the BG_ZONE card body —
   needed for §2 WHAT WAS FOUND, where the section header lives in
   normal scroll flow but the body (sticky pills+chips) pins to viewport
   top. Section continues to compose SectionHeader + card body for
   sections that fit the standard mould. */

import { C, FS, FW, CR } from "../../constants/tokens.js";

/** Section-header typography chrome — single source of truth for the
 *  numbered "1 · Summary" divider strip. S137 (Phase C.1): values
 *  re-registered onto the typography system's section heading row
 *  (lg / Semibold / C.TEXT / sans, sentence case, no tracking). Pre-S137
 *  values were 14px ALL CAPS C.TEXT_2 with 0.12em tracking — retired
 *  under the system's "ALL CAPS retires entirely / letter-spacing → 0"
 *  rule. Lane labels (StickySurface / DeepLookModal) keep their own
 *  local sub-header register (TF.BODY Semibold C.TEXT) — they're not
 *  consumers of this helper. */
export const SECTION_HEADER_TYPOGRAPHY = {
  fontSize: FS.lg,
  color: C.TEXT,
  fontWeight: FW.SEMI,
  whiteSpace: "nowrap",
};

/** Bare divider+title strip — same chrome as Section, no card body. */
export function SectionHeader({ number, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
      <div style={{ flex: 1, height: "1px", background: C.BORDER }} />
      <span style={SECTION_HEADER_TYPOGRAPHY}>
        {number} · {title}
      </span>
      <div style={{ flex: 1, height: "1px", background: C.BORDER }} />
    </div>
  );
}

/**
 * @param {object} props
 * @param {number} props.number - section number (1, 2, 3...)
 * @param {string} props.title - section title ("SUMMARY", "WHAT WAS FOUND", etc.)
 * @param {JSX.Element} props.children - section content
 * @param {boolean} [props.flatBottom] - S126b add-7b: when true, render with
 *   top-only border-radius and zero bottom margin so a SectionContinuation
 *   element rendered as the next sibling visually merges into one card.
 *   Used by §2 WHAT WAS FOUND so its pills+chips body can live as a
 *   sibling element with sticky scope independent of this Section's
 *   containing block, while the visual chrome reads as one card.
 */
export function Section({ number, title, children, flatBottom = false }) {
  return (
    <div style={{
      background: C.BG_ZONE,
      borderRadius: flatBottom ? `${CR.LG} ${CR.LG} 0 0` : CR.LG,
      padding: "16px 20px",
      marginBottom: flatBottom ? 0 : "12px",
    }}>
      <SectionHeader number={number} title={title} />
      {children}
    </div>
  );
}


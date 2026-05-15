/* ── Section — numbered section wrapper for report view ──
   Renders "─── 1 · SUMMARY ───" divider + padded content container.
   Spacing between sections controlled here, not by parent.

   S126b add-3: SectionHeader extracted as its own export so callers
   can render the divider+title strip outside the BG_ZONE card body —
   needed for §2 WHAT WAS FOUND, where the section header lives in
   normal scroll flow but the body (sticky pills+chips) pins to viewport
   top. Section continues to compose SectionHeader + card body for
   sections that fit the standard mould. */

import { C, FS, FW, FF, CR } from "../../constants/tokens.js";

/** Section-header typography chrome — single source of truth for the
 *  numbered "1 · Summary" divider strip. S137 (Phase C.1): values
 *  re-registered onto the typography system's section heading row
 *  (lg / Semibold / C.TEXT / sans, sentence case, no tracking). Pre-S137
 *  values were 14px ALL CAPS C.TEXT_2 with 0.12em tracking — retired
 *  under the system's "ALL CAPS retires entirely / letter-spacing → 0"
 *  rule. */
export const SECTION_HEADER_TYPOGRAPHY = {
  fontSize: FS.lg,
  color: C.TEXT,
  fontWeight: FW.SEMI,
  whiteSpace: "nowrap",
};

/** Lane-label typography — dimension-header peers in §2 (StickySurface)
 *  and in DeepLookModal. Sentence-case content-tier register, semibold,
 *  C.TEXT body colour. Sized at FS.base so the label outranks adjacent
 *  FindingChip / FindingPill content (FS.sm) without crossing into the
 *  sub-heading register (FS.md). S149 (C.6+C.7): extracted from the
 *  byte-identical local consts that lived in StickySurface and
 *  DeepLookModal so register changes land in one place.
 *
 *  Layout-only properties (whiteSpace, flexShrink) stay at the consumer
 *  spread sites — they're layout, not typography. */
export const LANE_LABEL_TYPOGRAPHY = {
  fontFamily: FF.UI,
  fontSize: FS.base,
  fontWeight: FW.SEMI,
  color: C.TEXT,
};

/** Minimap callout typography — inline-bold-prefix-plus-body pattern used at
 *  the strip caption in §2 (MinimapStrip) and at the deep-look-modal
 *  equivalent (ExcerptTable). Bold prefix and body declared as separate
 *  spans at consumer sites; this export carries the shared base register.
 *  Bold-prefix sites override `fontWeight` to `FW.SEMI`; the body inherits
 *  `FW.NORM` from this export. S149-fix1 (C.4 + C.7 remainder): extracted
 *  to retire byte-similar inline declarations across the two consumers. */
export const MINIMAP_CALLOUT_TYPOGRAPHY = {
  fontFamily: FF.UI,
  fontSize: FS.base,
  fontWeight: FW.NORM,
  color: C.TEXT,
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


/* ── MechIcon — cluster-keyed identity glyph (S157) ──
   Five inline SVG icons, one per MECHANISM_ORDER cluster. Carries the
   mechanism handle alongside the existing MECH_COLOR hue: hue does
   broad-scale family suggestion, icon does compact-scale identification.
   Resolves the post-S156 hue-adjacency problem (Copy/paste/edit slate
   blue ↔ Cross-replicate violet collapsing at chip-stripe scale) by
   adding a second axis rather than redistributing the hue palette.

   No icon library in the project's deps as of S157 — inline SVG keeps
   bundle small (~5 × short paths) and avoids a new dependency for
   five glyphs. Paths approximate the Tabler-icons semantics named in
   the S157 prompt: copy / 123 / chart-histogram / arrows-left-right /
   checkerboard. The "digits" icon uses a # (Tabler ti-hash) rather
   than literal "1 2 3" letterforms — the latter collapse to illegible
   strokes at the 14px breadcrumb scale.

   viewBox 0 0 24 24 lets the size prop scale linearly: 16px at chips,
   20px at cluster headers, 14px at card breadcrumbs. Stroke colour
   defaults to MECH_COLOR[mk]; callers can override (e.g. for testing
   or future muted-state palettes). */

import { MECH_COLOR } from "../../constants/tokens.js";

// Per-icon size compensation — some glyphs occupy less of their bounding
// box than peers at any given font-size, reading as visually smaller.
// S157-fix2: ti-123 numerals sit tighter inside the 24×24 viewBox than
// ti-copy / ti-arrows-left-right / ti-chart-histogram / ti-checkerboard,
// so consumers add +2px at every render site to optically match. Keyed
// on mk (mechanism key) directly rather than on icon-name string —
// MechIcon owns both the icon registry and the compensation table, so
// the string-name indirection from the original Tabler-library spec is
// not needed.
const ICON_SIZE_COMPENSATION = { digits: 2 };

export function mechIconSize(mk, baseSize) {
  return baseSize + (ICON_SIZE_COMPENSATION[mk] || 0);
}

const ICONS = {
  // Two overlapping rectangles — the copy/duplicate metaphor.
  copied: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M16 9 V6 a2 2 0 0 0 -2 -2 H6 a2 2 0 0 0 -2 2 v8 a2 2 0 0 0 2 2 h3" />
    </>
  ),
  // "123" letterforms — literal numeral display per Tabler ti-123.
  // S157-fix1 swap back from ti-hash (#) per Chat preference for the
  // more cluster-specific glyph; verify legibility at 14px breadcrumb.
  digits: (
    <>
      {/* "1" — vertical with top-left serif */}
      <path d="M5 7 L3 9 M5 7 V17" />
      {/* "2" — top arc + diagonal + bottom horizontal */}
      <path d="M9 9 a2 2 0 0 1 4 0 c0 1.5 -4 2.5 -4 6 h4" />
      {/* "3" — two stacked right-opening curves */}
      <path d="M16 8 h3 a1.5 1.5 0 0 1 0 3 h-1 h1 a1.5 1.5 0 0 1 0 3 h-3" />
    </>
  ),
  // Histogram — axis with four bars of varying heights.
  shapes: (
    <>
      <path d="M3 3 v18 h18" />
      <line x1="7" y1="17" x2="7" y2="21" />
      <line x1="11" y1="11" x2="11" y2="21" />
      <line x1="15" y1="14" x2="15" y2="21" />
      <line x1="19" y1="7" x2="19" y2="21" />
    </>
  ),
  // Horizontal bidirectional arrows — comparing across replicate columns.
  replicate: (
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <polyline points="7 8 3 12 7 16" />
      <polyline points="17 8 21 12 17 16" />
    </>
  ),
  // 2×2 checkerboard with two filled and two outlined cells — the
  // condition×replicate matrix metaphor.
  group: (
    <>
      <rect x="3" y="3" width="9" height="9" fill="currentColor" stroke="none" />
      <rect x="12" y="12" width="9" height="9" fill="currentColor" stroke="none" />
      <rect x="12" y="3" width="9" height="9" />
      <rect x="3" y="12" width="9" height="9" />
    </>
  ),
};

/**
 * @param {object} props
 * @param {string} props.mk - mechanism cluster key (copied/digits/shapes/replicate/group)
 * @param {number} [props.size=16] - pixel size; viewBox is 24×24 so the icon scales linearly
 * @param {string} [props.color] - overrides MECH_COLOR[mk]
 * @param {number} [props.opacity=1] - 0.4 used for cleared-tier chips + breadcrumbs
 */
export function MechIcon({ mk, size = 16, color, opacity = 1 }) {
  const icon = ICONS[mk];
  if (!icon) return null;
  const stroke = color ?? MECH_COLOR[mk] ?? "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity, flexShrink: 0, display: "inline-block", verticalAlign: "middle", color: stroke }}
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}

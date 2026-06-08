/**
 * Shared colour utilities for all pairwise correlation / residual matrices.
 *
 * TIER_COLOR — the single source of flat tier colours.
 *   Sourced from HEATMAP_TIER in tokens.js. Edit tokens.js to retheme globally.
 *   Two-regime ramp — slate floor below the flag threshold, amber → red above.
 *
 *   LOW   #CBD5E1  (light slate — tested, not flagged)
 *   MID   #F97316  (amber)
 *   HIGH  #EF4444  (red)
 *
 * Usage:
 *   CCR — call rhoColor(rho)  (ρ ≥ 0.6 → HIGH, ρ ≥ 0.3 → MID, else LOW)
 *   IRC — import TIER_COLOR directly and apply your own tier logic
 *         (suspicious flag → HIGH, r > ICC+0.01 → MID, else LOW)
 */

import { HEATMAP_TIER, C, SIGNAL, ACCENT } from "../../constants/tokens.js";

/** Flat fill colour constants — imported by both IRC and CCR. */
export const TIER_COLOR = {
  LOW:  HEATMAP_TIER.LOW.color,
  MID:  HEATMAP_TIER.MID.color,
  HIGH: HEATMAP_TIER.HIGH.color,
};

/**
 * Background fill for a CCR ρ-threshold cell.
 * Thresholds: ρ ≥ 0.6 → HIGH, ρ ≥ 0.3 → MID, else LOW.
 */
export function rhoColor(rho) {
  if (rho == null) return "transparent";
  if (rho >= 0.6) return TIER_COLOR.HIGH;
  if (rho >= 0.3) return TIER_COLOR.MID;
  return TIER_COLOR.LOW;
}

// Relative luminance of a #RRGGBB hex; returns light text on dark fills, dark on light.
export function cellTextOn(bg) {
  if (typeof bg !== "string" || bg[0] !== "#" || bg.length < 7) return C.TEXT;
  const r = parseInt(bg.slice(1, 3), 16) / 255;
  const g = parseInt(bg.slice(3, 5), 16) / 255;
  const b = parseInt(bg.slice(5, 7), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L < 0.5 ? C.WHITE : C.TEXT;
}

/**
 * Legend items for a ρ matrix, filtered to tiers present in the data.
 * @param {number[]} rhoValues — flat array of all ρ values in the matrix
 */
export function rhoLegendItems(rhoValues) {
  const tiers = new Set();
  for (const rho of rhoValues) {
    if (rho >= 0.6) tiers.add("high");
    else if (rho >= 0.3) tiers.add("mid");
    else tiers.add("low");
  }
  return [
    ...(tiers.has("low")  ? [{ color: TIER_COLOR.LOW,  label: HEATMAP_TIER.LOW.label  }] : []),
    ...(tiers.has("mid")  ? [{ color: TIER_COLOR.MID,  label: HEATMAP_TIER.MID.label  }] : []),
    ...(tiers.has("high") ? [{ color: TIER_COLOR.HIGH, label: HEATMAP_TIER.HIGH.label }] : []),
  ];
}

// ── Convergence heatmap purple ramp ──────────────────────────────────
// Shared by HeatmapView, HotspotExcerpt, and density strips. Single
// source of truth for the density axis (where + how many tests agree).
//
// S163 B2a: ramp recoloured orange → purple. Pre-B2a the ramp ran buff →
// amber → red as count climbed, which collided with the severity scale
// (green → amber → orange → red on §2 chips / §3 cards) — density read
// as severity. Purple is a distinct axis: §2 chips / §3 cards still own
// orange severity, this surface owns purple density. Sequential single-
// hue ramp: light purple (1 test) → deep purple (N agree). Each step is
// from the Tailwind v4 purple scale that ACCENT.PURPLE shades sit on, so
// ACCENT.PURPLE.{border,color,text} slot in at indices 2 / 4 / 5.
//
// IDENTITY_BORDER (below) reads the deepest purple of the ramp as the
// active-region border colour — fill lighter, border deeper, monochromatic.

export const CONVERGENCE_RAMP = [
  null,                  // 0 flags — no shading
  "#DDD6FE",            // 1 flag  — purple-200 (very light)
  ACCENT.PURPLE.border, // 2 flags — purple-300 (#C4B5FD)
  "#A78BFA",            // 3 flags — purple-400 (medium)
  ACCENT.PURPLE.color,  // 4 flags — purple-500 (#8B5CF6, solid)
  ACCENT.PURPLE.text,   // 5+ flags — purple-700 (#6D28D9, deep)
];

// Deeper-purple identity border colour for the active finding's region
// (S163 B2a W4). Monochromatic with the density ramp — same purple axis,
// saturated edge against the lighter fills. Read by ExcerptTable's
// renderCell when an active finding is set.
//
// S163 B2c F6: IDENTITY_BORDER lifted one step deeper, from purple-700
// (`ACCENT.PURPLE.text` = #6D28D9 — the ramp's top shade) to purple-900
// (#4C1D95). Pre-B2c the border and the ramp top were both #6D28D9, so
// at maximum convergence (CONVERGENCE_RAMP[5+] at 0.85 opacity) the
// border vanished into the fill. Purple-900 sits beyond the ramp's top
// stop and reads as unambiguously deeper than the densest cell fill,
// preserving the "fill lighter, border deeper" monochromatic identity
// at any overlap level. ACCENT.PURPLE doesn't carry a 900-step shade,
// so this value is defined directly here — the token IS the source for
// this slot. Call sites continue to consume IDENTITY_BORDER; no inline
// hexes downstream.
export const IDENTITY_BORDER = "#4C1D95";

// Whole-table wash for dataset-wide / unscoped active findings (S163
// B2a W2). A finding that classifies as dataset-wide or unscoped has
// no specific cells / rows / columns to point at; a uniform light-
// purple wash signals "the test fired across the data, nothing to
// isolate" without lighting nothing. Lighter than the count-1 swatch
// so it reads as a wash, not an unintended density signal.
export const LOCALITY_WHOLE_TABLE_WASH = "rgba(139, 92, 246, 0.08)";

/** Get { color, opacity } for a convergence flag count (detail table cells).
 *  S163 B2b: floor lift — count=1 opacity 0.35 → 0.55, count=2 0.55 → 0.7,
 *  count=3+ 0.75 → 0.85. The pre-B2b count=1 swatch sat too close to the
 *  LOCALITY_WHOLE_TABLE_WASH (0.08 alpha) — a lone-test active finding on a
 *  cell read as barely-tinted, indistinguishable from the wash. The lift
 *  preserves the step-by-step gradient (count=1 still visibly lighter than
 *  count=2, etc.) while pulling the bottom clear of the wash. Applies to
 *  the no-active-finding resting state too — convergence density at count=1
 *  was undersold pre-B2b. */
export function convergenceRampStyle(count) {
  if (count <= 0) return null;
  const idx = Math.min(count, CONVERGENCE_RAMP.length - 1);
  const opacity = count === 1 ? 0.55 : count === 2 ? 0.7 : 0.85;
  return { color: CONVERGENCE_RAMP[idx], opacity };
}

/** Get { color, opacity } for minimap bars — higher opacity for visibility at small size */
export function convergenceMinimapStyle(count) {
  if (count <= 0) return null;
  const idx = Math.min(count, CONVERGENCE_RAMP.length - 1);
  const opacity = count === 1 ? 0.7 : count === 2 ? 0.85 : 1.0;
  return { color: CONVERGENCE_RAMP[idx], opacity };
}

/** Cell background style object for a convergence grid cell */
export function convergenceCellBg(cell) {
  if (!cell || cell.count === 0) return {};
  const r = convergenceRampStyle(cell.count);
  if (!r) return {};
  return { backgroundColor: r.color, opacity: r.opacity };
}

/** Text color for a convergence cell: white on warm/dark, dark on light */
export function convergenceCellTextColor(cell) {
  if (!cell || cell.count === 0) return C.TEXT;
  return cell.count >= 3 ? "#FFFFFF" : C.TEXT;
}

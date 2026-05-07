/**
 * Shared colour utilities for all pairwise correlation / residual matrices.
 *
 * TIER_COLOR — the single source of flat tier colours.
 *   Sourced from HEATMAP_TIER in tokens.js. Edit tokens.js to retheme globally.
 *
 *   LOW  (blue)   rgba(59,130,246,0.25)
 *   MID  (amber)  rgba(245,158,11,0.45)
 *   HIGH (red)    rgba(239,68,68,0.55)
 *
 * Usage:
 *   CCR — call rhoColor(rho)  (ρ ≥ 0.6 → HIGH, ρ ≥ 0.3 → MID, else LOW)
 *   IRC — import TIER_COLOR directly and apply your own tier logic
 *         (suspicious flag → HIGH, r > ICC+0.01 → MID, else LOW)
 */

import { HEATMAP_TIER, C, SIGNAL } from "../../constants/tokens.js";

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

/**
 * Text colour for a ρ cell — white on HIGH tier, default text otherwise.
 */
export function rhoTextColor(rho) {
  return rho != null && rho >= 0.6 ? "#FFFFFF" : C.TEXT;
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

// ── Convergence heatmap warm ramp ────────────────────────────────────
// Shared by HeatmapView, HotspotExcerpt, and density strips.
// 0 = white, 1 = buff, 2 = amber, 3 = red, 4+ = deepening red.

export const CONVERGENCE_RAMP = [
  null,              // 0 flags — no shading
  "#F5E6D3",        // 1 flag  — pale buff / warm neutral
  SIGNAL.AMBER.dot, // 2 flags — amber
  SIGNAL.RED.dot,   // 3 flags — red
  "#DC2626",        // 4 flags — deeper red
  "#991B1B",        // 5+ flags — dark red
];

/** Get { color, opacity } for a convergence flag count (detail table cells) */
export function convergenceRampStyle(count) {
  if (count <= 0) return null;
  const idx = Math.min(count, CONVERGENCE_RAMP.length - 1);
  const opacity = count === 1 ? 0.35 : count === 2 ? 0.55 : 0.75;
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

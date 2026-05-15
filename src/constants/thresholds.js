import { C, SIGNAL } from './tokens.js';

export const FLAG_STYLES = {
  HIGH:     { bg:SIGNAL.RED.bg,   border:SIGNAL.RED.border,   text:SIGNAL.RED.text,   dot:SIGNAL.RED.dot,   label:"FLAGGED" },
  MODERATE: { bg:SIGNAL.AMBER.bg, border:SIGNAL.AMBER.border, text:SIGNAL.AMBER.text, dot:SIGNAL.AMBER.dot, label:"NOTED" },
  LOW:      { bg:SIGNAL.GREEN.bg, border:SIGNAL.GREEN.border, text:SIGNAL.GREEN.text, dot:SIGNAL.GREEN.dot, label:"CLEAR" },
  "N/A":    { bg:C.BG,            border:C.BORDER,            text:C.TEXT_3,           dot:C.TEXT_4,         label:"N/A" },
  ERROR:    { bg:SIGNAL.RED.bg,   border:"#fca5a5",           text:SIGNAL.RED.text,    dot:"#dc2626",        label:"ERROR" },
};
export const PLOT_FC = { HIGH:SIGNAL.RED.dot, MODERATE:SIGNAL.AMBER.dot, LOW:SIGNAL.GREEN.dot, "N/A":C.TEXT_4 };

// Shared significance thresholds — single source of truth for all tests.
// Change these once to adjust flag sensitivity across the entire tool.
export const ALPHA = {
  FLAG: 0.001,   // p < this → HIGH (displayed as "FLAGGED")
  NOTE: 0.01,    // p < this → MODERATE (displayed as "NOTED")
};

// Effect-size gates — used by engine code only. Display reads classifications.
export const EFFECT_SIZE = {
  AUTOCORR_STRONG: 0.25,         // |r₁| ≥ this → "strong"
  AUTOCORR_MODERATE: 0.15,       // |r₁| ≥ this → "moderate"
  KURTOSIS_DEV: 0.20,            // |κ_dev| > this → leptokurtic/platykurtic at large N
  RSC_HIGH_RHO: 0.5,             // |ρ| > this → high correlation pair
  CONST_OFFSET_HIGH_BLOCKS: 5,   // ≥ this blocks → "high" severity
};

// Standard p → flag mapping. Tests with extra gates (effect size, direction)
// apply their gate first, then call this for the p-value decision.
export function flagFromP(p) {
  return p < ALPHA.FLAG ? "HIGH" : p < ALPHA.NOTE ? "MODERATE" : "LOW";
}

/** Numeric rank for flag comparison. Single source of truth. */
export const FLAG_RANK = { "HIGH": 3, "MODERATE": 2, "LOW": 1, "N/A": 0, "ERROR": -1 };
export function flagRankOf(f) { return FLAG_RANK[f] || 0; }

/** Format p-value for display: <0.0001, 4dp, or "—" */
export function fmtP(v) { const n = typeof v === "string" ? parseFloat(v) : v; return isNaN(n) ? "—" : n < 0.0001 ? "<0.0001" : n.toFixed(4); }

/** Format p-value operator + value: "< 0.0001" or "= 0.0234" (thin spaces) */
export function fmtPOp(v) { const s = fmtP(v); return s === "—" ? "=\u202f—" : s.startsWith("<") ? `<\u202f${s.slice(1)}` : `=\u202f${s}`; }

/** Format p-value as badge text: "p < 0.0001" or "p = 0.0234" (thin spaces) */
export function fmtPBadge(v) { return `p\u202f${fmtPOp(v)}`; }


/** Parse hex colour to [r,g,b] array */
export function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n>>16)&255, (n>>8)&255, n&255]; }

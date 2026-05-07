import { C, ACCENT } from './tokens.js';

export const ROLES = {
  data:      { label:"DATA",  color:ACCENT.BLUE.color,   bg:ACCENT.BLUE.bg,   border:ACCENT.BLUE.border },
  label:     { label:"LABEL", color:ACCENT.PURPLE.color,  bg:ACCENT.PURPLE.bg,  border:ACCENT.PURPLE.border },
  condition: { label:"COND",  color:ACCENT.GOLD.color,   bg:ACCENT.GOLD.bg,   border:ACCENT.GOLD.border },
  ignore:    { label:"SKIP",  color:C.TEXT_3,             bg:C.BG,             border:C.BORDER },
};
export const ROLE_KEYS = ["data", "label", "condition", "ignore"];

// Condition colours: saturated enough to distinguish adjacent conditions.
// Each entry: { bg, text, border } for badge rendering.
export const COND_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },  // blue
  { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },  // red
  { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },  // green
  { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },  // amber
  { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },  // purple
  { bg: "#CFFAFE", text: "#155E75", border: "#67E8F9" },  // cyan
  { bg: "#FFF1F2", text: "#9F1239", border: "#FDA4AF" },  // rose
  { bg: "#ECFCCB", text: "#3F6212", border: "#BEF264" },  // lime
];

/** Rebuild the condition → colour map from importConfig.condPerCol.
 *  Matches the assignment order used in ImportView so colours are consistent
 *  throughout the app without threading state from ImportView. */
export function buildCondColorMap(condPerCol) {
  if (!condPerCol) return {};
  const map = {};
  let i = 0;
  for (const cond of condPerCol) {
    if (cond && !map[cond]) {
      map[cond] = COND_COLORS[i % COND_COLORS.length];
      i++;
    }
  }
  return map;
}

import { C, ACCENT } from './tokens.js';

export const ROLES = {
  data:      { label:"DATA",  chipLabel:"Data",  color:ACCENT.BLUE.color,   bg:ACCENT.BLUE.bg,   border:ACCENT.BLUE.border },
  label:     { label:"LABEL", chipLabel:"Label", color:ACCENT.PURPLE.color,  bg:ACCENT.PURPLE.bg,  border:ACCENT.PURPLE.border },
  condition: { label:"COND",  chipLabel:"Cond",  color:ACCENT.GOLD.color,   bg:ACCENT.GOLD.bg,   border:ACCENT.GOLD.border },
  ignore:    { label:"SKIP",  chipLabel:"Skip",  color:C.TEXT_3,             bg:C.BG,             border:C.BORDER },
};
export const ROLE_KEYS = ["data", "label", "condition", "ignore"];

// Condition colours: eight non-severity hues, saturated enough to distinguish
// adjacent conditions. Each entry: { bg, text, border } for badge rendering;
// condition marks read the .text shade everywhere. None falls in the severity
// red/amber family — the old red (entry 2), amber (entry 4) and rose (entry 7)
// collided with severity and are replaced by magenta, ochre and slate. Ordering
// and hexes track PLOT-COLOUR-SEMANTICS.md (the condition palette table).
export const COND_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },  // blue
  { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },  // green
  { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },  // purple
  { bg: "#CFFAFE", text: "#155E75", border: "#67E8F9" },  // cyan
  { bg: "#ECFCCB", text: "#3F6212", border: "#BEF264" },  // lime
  { bg: "#FCE7F3", text: "#9D174D", border: "#F9A8D4" },  // magenta
  { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" },  // ochre
  { bg: "#E2E8F0", text: "#334155", border: "#94A3B8" },  // slate
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

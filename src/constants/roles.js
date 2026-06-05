import { C, ACCENT } from './tokens.js';

export const ROLES = {
  data:      { label:"DATA",  chipLabel:"Data",  color:ACCENT.BLUE.color,   bg:ACCENT.BLUE.bg,   border:ACCENT.BLUE.border },
  label:     { label:"LABEL", chipLabel:"Label", color:ACCENT.PURPLE.color,  bg:ACCENT.PURPLE.bg,  border:ACCENT.PURPLE.border },
  condition: { label:"COND",  chipLabel:"Cond",  color:ACCENT.GOLD.color,   bg:ACCENT.GOLD.bg,   border:ACCENT.GOLD.border },
  ignore:    { label:"SKIP",  chipLabel:"Skip",  color:C.TEXT_3,             bg:C.BG,             border:C.BORDER },
};
export const ROLE_KEYS = ["data", "label", "condition", "ignore"];

// Condition colours: eight hues in a lighter register, ordered so the common
// first-three case spreads across the wheel. Each entry: { bg, text, border };
// condition marks read the .text shade everywhere, the import chip reads .bg
// (pale fill) + .text (label), so .bg / .border are tints/shades of the entry's
// .text hue — one hue per condition across import and plot. Hues are picked for
// mutual separation as thin lines, not for avoiding the severity family
// (channel 1 is a role-not-hue rule). Ordering and .text anchors track
// PLOT-COLOUR-SEMANTICS.md (the condition palette table).
export const COND_COLORS = [
  { bg: "#DBEAFE", text: "#3B82F6", border: "#93C5FD" },  // blue
  { bg: "#ECFCCB", text: "#4D7C0F", border: "#BEF264" },  // lime (.text darkened to lime-700 for small-text contrast on white)
  { bg: "#F3E8FF", text: "#A855F7", border: "#D8B4FE" },  // purple
  { bg: "#CFFAFE", text: "#06B6D4", border: "#67E8F9" },  // cyan
  { bg: "#FCE7F3", text: "#EC4899", border: "#F9A8D4" },  // pink
  { bg: "#D1FAE5", text: "#10B981", border: "#6EE7B7" },  // green
  { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" },  // amber (.text darkened to amber-700 for small-text contrast on white)
  { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1" },  // slate
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

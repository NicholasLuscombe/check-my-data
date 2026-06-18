import { C, ACCENT } from './tokens.js';

export const ROLES = {
  data:      { label:"DATA",  chipLabel:"Data",  color:ACCENT.BLUE.color,   bg:ACCENT.BLUE.bg,   border:ACCENT.BLUE.border },
  label:     { label:"LABEL", chipLabel:"Label", color:ACCENT.PURPLE.color,  bg:ACCENT.PURPLE.bg,  border:ACCENT.PURPLE.border },
  condition: { label:"COND",  chipLabel:"Cond",  color:ACCENT.GOLD.color,   bg:ACCENT.GOLD.bg,   border:ACCENT.GOLD.border },
  ignore:    { label:"SKIP",  chipLabel:"Skip",  color:C.TEXT_3,             bg:C.BG,             border:C.BORDER },
};
export const ROLE_KEYS = ["data", "label", "condition", "ignore"];

// Condition colours: eight hues in a lighter register, ordered (S250) so the
// hue byte-identical to a signal colour (blue .text #3B82F6 == CC.OBS) is
// demoted out of the common first-three case — see channel-2 signal-sensitivity
// in PLOT-COLOUR-SEMANTICS.md. Each entry: { bg, text, border };
// condition marks read the .text shade everywhere, the import chip reads .bg
// (pale fill) + .text (label), so .bg / .border are tints/shades of the entry's
// .text hue — one hue per condition across import and plot. Exception
// (tint-not-text): the import condition span-header band renders identity on
// .bg (fill) with a neutral C.TEXT label, not the .text hue, because it sits
// directly above the data-role-blue chips (a channel-2 signal-sensitive
// surface); the Zone-1/Zone-4 summary chips still read .text, not being
// adjacent to a role-blue element (the collision is span-header-only). Hues are
// picked for mutual separation as thin lines, not for avoiding the severity
// family (channel 1 is a role-not-hue rule). Ordering and .text anchors track
// PLOT-COLOUR-SEMANTICS.md (the condition palette table).
export const COND_COLORS = [
  { bg: "#ECFCCB", text: "#4D7C0F", border: "#BEF264" },  // lime (.text darkened to lime-700 for small-text contrast on white)
  { bg: "#F3E8FF", text: "#A855F7", border: "#D8B4FE" },  // purple
  { bg: "#CFFAFE", text: "#06B6D4", border: "#67E8F9" },  // cyan
  { bg: "#FCE7F3", text: "#EC4899", border: "#F9A8D4" },  // pink
  { bg: "#D1FAE5", text: "#10B981", border: "#6EE7B7" },  // green
  { bg: "#DBEAFE", text: "#3B82F6", border: "#93C5FD" },  // blue
  { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" },  // amber (.text darkened to amber-700 for small-text contrast on white)
  { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1" },  // slate
];

/** Per-row condition labels for row-grouped data (condition-in-a-column).
 *  Display-layer MIRROR of the engine's rowConditions derivation in
 *  src/analysis/engine.js `extractAnalysisInputs` (the condCols → " | "-joined
 *  per-row labels block, ~lines 135-142): same .trim(), same " | " join across
 *  multiple condition columns, same null handling — so the label STRINGS match
 *  condCtx.names and per-condition consumers' lookups (condColorMap[c.condition])
 *  resolve. Reads data + roles ONLY; never touches condCtx / the engine / any
 *  verdict-path field. DRIFT GUARD: if the engine's label logic moves, this
 *  display-layer twin must move with it. */
export function rowConditionLabels(importConfig) {
  const data = importConfig?.data, roles = importConfig?.roles;
  if (!data || !roles) return null;
  const condCols = roles.map((r, i) => r === "condition" ? i : -1).filter(i => i >= 0);
  if (!condCols.length) return null;
  const rc = data.map(row => {
    const parts = condCols
      .map(ci => (row[ci] != null && String(row[ci]).trim()) ? String(row[ci]).trim() : null)
      .filter(Boolean);
    return parts.join(" | ") || null;
  });
  return rc.some(c => c) ? rc : null;
}

/** Rebuild the condition → colour map from importConfig.
 *  Column-grouped data keys off condPerCol (per-column condition names from the
 *  two-row header); row-grouped data (condition-in-a-column) falls back to
 *  rowConditionLabels(). The map-construction loop below is unchanged from the
 *  original column-only version, so the column-grouped output stays byte-identical
 *  (this is what protects the column-grouped fixtures). Matches the assignment
 *  order used in ImportView so colours are consistent app-wide without threading
 *  state. Callers pass an importConfig-shaped object: ExcerptTable passes
 *  { condPerCol } alone (column path only); cards / ImportView pass the fuller
 *  { condPerCol, data, roles }. */
export function buildCondColorMap(importConfig) {
  const condPerCol = importConfig?.condPerCol || null;
  const source = (condPerCol && condPerCol.some(c => c))
    ? condPerCol
    : rowConditionLabels(importConfig);
  if (!source) return {};
  const map = {};
  let i = 0;
  for (const cond of source) {
    if (cond && !map[cond]) {
      map[cond] = COND_COLORS[i % COND_COLORS.length];
      i++;
    }
  }
  return map;
}

/* ── Palette — 4 primitives, everything else derived ───────────────── */

// 1. NEUTRALS — slate ramp. Change these 9 values to re-theme the entire UI.
//    S136: TEXT/TEXT_2/TEXT_3 hex shifted to neutral-700/600/500 ramp per
//    typography system. TEXT_4 alias retired S151 C.9 (Phase C close).
export const C = {
  TEXT:     "#1F1F1F",  // headings, primary labels
  TEXT_2:   "#525252",  // secondary text
  TEXT_3:   "#737373",  // table headers, axis labels, fine print
  BORDER:   "#CBD5E1",  // primary borders, dividers (slate-300)
  BORDER_L: "#E2E8F0",  // light row separators (slate-200)
  BG:       "#F1F5F9",  // card/row alt backgrounds (slate-100)
  BG_L:     "#F8FAFC",  // lightest background (slate-50)
  WHITE:    "#FFFFFF",  // pure white — cards, row-even backgrounds
  BG_ZONE:  "#EDF0F5",  // zone panel backgrounds (import page, report sections)
};

// Section-divider treatment — heavier than the C.BORDER hairline used
// for SectionHeader's flanking 1px rules. Used at the §2 sticky
// surface bottom (and any future site that needs a section-break-
// weight rule rendered standalone, not framing a centred title).
//
// S163 B2e E4: introduced as a dedicated token after B2c F3's
// 2px-C.BORDER nudge AND B2d G4's borderBottom-retirement both
// failed Nick's eye — doubling a hairline is still a hairline, and
// "let §3's SectionHeader carry it" doesn't hold when the user
// scrolls past §3's SectionHeader and §3 cards bleed up to the §2
// sticky bottom with no boundary. Slate-500 (#64748B) at 3 px reads
// as a real section break against the C.BG_ZONE backdrop.
// Flagged for the typography system: this token may consolidate with
// other "section-break-weight rule" sites (currently only one) at
// the next type-system pass.
export const SECTION_DIVIDER = {
  color: "#64748B",  // slate-500 — heavier contrast than C.BORDER
  width: "3px",
};

// 2. SIGNAL — red / amber / green severity hues.
//    Each has 4 shades: text (dark), dot (vivid), bg (tint), border (light).
export const SIGNAL = {
  RED:   { text:"#991B1B", dot:"#EF4444", bg:"#FEF2F2", border:"#FECACA" },
  AMBER: { text:"#713F12", dot:"#F97316", bg:"#FEFCE8", border:"#FEF08A" },
  GREEN: { text:"#166534", dot:"#22C55E", bg:"#F0FDF4", border:"#BBF7D0" },
};

// 3. ACCENT — 5 functional hues for UI chrome, roles, badges, mechanisms.
//    Each has 4 shades: color (vivid), text (dark readable), bg (tint), border (light).
export const ACCENT = {
  BLUE:    { color:"#3B82F6", text:"#2a4a6a", bg:"#EFF6FF", border:"#93C5FD" },
  PURPLE:  { color:"#8B5CF6", text:"#6D28D9", bg:"#F5F3FF", border:"#C4B5FD" },
  TEAL:    { color:"#14B8A6", text:"#0F766E", bg:"#CCFBF1", border:"#a0d8d8" },
  GOLD:    { color:"#D97706", text:"#9a7010", bg:"#FFFBEB", border:"#e8c97a" },
  PINK:    { color:"#EC4899", text:"#9D174D", bg:"#FDF2F8", border:"#FBCFE8" },
};

// 4. CHART — data-visualisation specifics.
export const CHART = {
  SERIES: ["#4878cf","#e47528","#60ac5d","#d53e4f","#b39bca",
           "#a06838","#e884bb","#aaaa55","#56bfc0","#7faad8","#c3a07a"],
  S_ORANGE:  "#E67E22",   // SERIES7 slot — distinct from ACCENT.GOLD
  S_INDIGO:  "#6366F1",   // SERIES7 slot — distinct from ACCENT.PURPLE
  EXP:       "#0D9488",   // expected / null — teal
  GAP:       "#c05a5a",   // precision: missing decimal gap
  REF:       "#4a7a4a",   // expected-range reference line
};

// Two-tone strip-series colours — neutral sign / crossing encodings, NOT
// flag state. Shared so card-side and plot-side can't drift (S212):
//   runs sign strip — Oxford / Cambridge blue (+1 / −1);
//   row-mean trend  — indigo crossing emphasis / lavender run segment.
export const SIGN = {
  POS:      "#002147",  // Oxford blue (+1) — runs sign strip
  NEG:      "#A3C1DA",  // Cambridge blue (−1) — runs sign strip
  CROSSING: "#4A3D8F",  // deep indigo — row-mean crossing emphasis
  RUN:      "#A0A0CC",  // muted lavender — row-mean run segment
};

// withAlpha(hex, a) — rgba string at alpha a, derived from a hex token so
// opacity-tinted fills stay sourced from the palette rather than drifting
// rgba literals. Used for SIGNAL.RED.dot at reduced opacity (missing-data
// cells, regional-noise divergence gradient).
export const withAlpha = (hex, a) => {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
};


// 5. TYPOGRAPHY — font stacks, weights, sizes.
//    Change these to re-font the entire app.
//    S136: FF.UI/FF.MONO swapped onto Inter + JetBrains Mono web fonts (loaded
//    via index.html <link> tags). FF.PRINT and FF.SERIF retired — system rule
//    "two-face system" (sans + mono only). FW.MED added for the typography
//    system's table-header / button / tab-inactive register.
export const FF = {
  MONO:  "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",                // data tables, code, stats, report grid
  UI:    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", // app UI, SVG charts, report body
};
export const FW = {
  BOLD:  700,   // verdict headline only (system: narrowed register)
  SEMI:  600,   // section headings, sub-headings, tabs (active), filename
  MED:   500,   // table headers, buttons, tabs (inactive), tier word
  NORM:  400,   // body prose, identity rows, table cells, fine print
};
// SVG chart font sizes — 6 levels (nothing below 9pt)
export const CF = {
  TICK: "10",      // axis tick numbers
  AXIS: "11",      // axis title labels
  LABEL: "10",     // group names, bar labels, legend text
  VALUE: "10",     // data value annotations on bars/points
  SMALL: "9",      // secondary annotations, reference line labels
  TINY: "9",       // floor — nothing smaller than 9pt in any chart
};
// Typography system size scale (S136) — six steps, 1.25 ratio anchored at 16px.
// Sole HTML/DOM size token rail post-S151 C.9 (legacy TF.* scaffold retired).
export const FS = {
  xs:   "13px",  // table cells, fine print, deep footnotes
  sm:   "14px",  // secondary text, captions, table headers, footnotes, aside callouts
  base: "16px",  // body, identity rows, settings, tabs, buttons (reference register)
  md:   "20px",  // sub-headings, modal headers, test card titles
  lg:   "25px",  // section headings (1 · Summary, 2 · What was found, ...)
  xl:   "32px",  // verdict headline only
};
// Chart plot widths — heights stay per-component
export const CP = {
  W:    420,   // standard detail chart
  W_MD: 360,   // compact summary
  W_SM: 320,   // inline embedded
  W_XS: 200,   // thumbnail
  W_LG: 540,   // wide
};
// Chart visual style — standardised stroke, point, and reference line appearance.
// Edit here to change line weights and point sizes for all charts at once.
export const CS = {
  GRID:    { w: "0.8" },                              // background gridlines
  REF:     { w: "1.5", dash: "4,3", opacity: 0.7 },   // reference/threshold dashed lines
  DATA:    { w: "1.2" },                               // data series lines
  FIT:     { w: "2" },                                 // fitted/expected curves
  PT:      { r: 3.5 },                                 // standard data point
  PT_SM:   { r: 2 },                                   // dense/background points
  PT_LG:   { r: 4 },                                   // emphasis/outlier points
};
// Border radii — 6 levels. Edit here to change rounding for all UI at once.
// S152: CR.S2 added between SM and MD as the chip-family signature (10
// consumer sites — AUTO ×7 + REQUIRED ×2 + SET ME ×1 + role chip +
// condition chip — collapse from inline "4px" literals onto this slot).
export const CR = {
  XS: "2px",   // cell highlights, mini swatches
  SM: "3px",   // badges, inline tags, heatmap cells
  S2: "4px",   // chip-family signature (State / Identity chip)
  MD: "5px",   // banners, buttons, inputs, panels
  LG: "6px",   // major cards, report sections
  XL: "8px",   // hero cards, modals, drop zones
};

/* ── Derived — assembled from the 4 primitives above ──────────────── */

export const CC = { OBS:ACCENT.BLUE.color, EXP:CHART.EXP, EXP_SOFT:"#7BC8A4", THRESH:SIGNAL.RED.dot, WARN:SIGNAL.AMBER.dot };

/* Mechanism category visual identity — keyed by mechanism slug */
// MECH_COLOR is keyed by MECHANISM_ORDER (mechanisms.js): five distinct hues
// so the §1 mechanism-count strip and §2 chip/pill mechanism layer can encode
// category alongside severity. Pre-S95 keys (uneven, noise, perfect) removed —
// MECHANISM_ORDER has been copied/digits/shapes/replicate/group since Track C.
export const MECH_COLOR = {
  copied:    "#4A6FA5",  // slate blue
  digits:    "#BE185D",  // magenta
  shapes:    "#6B7C32",  // olive
  replicate: "#6B46C1",  // violet
  group:     "#9B4F76",  // dusty rose
};

// DUP_GROUP_PALETTE — six-entry rotation for the within-row duplicate group
// shading in MiniCard_DuplicateDetection (and the matching cell-bg rotation in
// ReportView's Excel-export pass). Group rotation is NOT mechanism-keyed —
// these are arbitrary slot identifiers — so the palette stays semantically
// independent of MECH_COLOR. Hues chosen for visual distinctness from each
// other AND from the five MECH_COLOR hues, so a within-row group shading on a
// chip's neighbouring cell can't be confused for a mechanism stripe. Each
// entry pairs `text` (saturated, used for cell text colour) with `bg` (pale
// wash, used for cell background).
//
// Pre-S133f the rotation read from MECH_ACCENT (a pre-S95 5-key map) padded
// with MECH_COLOR entries, leaving three of six slots resolving to undefined
// after S133e-palette retired the pre-S95 MECH_COLOR keys. DUP_GROUP_PALETTE
// supersedes both — MECH_ACCENT is retired with no remaining consumers.
export const DUP_GROUP_PALETTE = [
  { text: "#B91C1C", bg: "#FEE2E2" },  // red
  { text: "#C2410C", bg: "#FFEDD5" },  // orange
  { text: "#B45309", bg: "#FEF3C7" },  // amber
  { text: "#0F766E", bg: "#CCFBF1" },  // teal
  { text: "#155E75", bg: "#CFFAFE" },  // cyan
  { text: "#78350F", bg: "#FDE68A" },  // brown
];
export const SERIES7 = [CC.OBS, CHART.S_ORANGE, ACCENT.TEAL.color, ACCENT.PURPLE.color, ACCENT.PINK.color, CHART.S_INDIGO, SIGNAL.AMBER.dot];

// S136: .text retired per typography system "single saturation level" rule.
// Pre-S136 consumers (FindingPill, FindingChip × 2) re-pointed to .color.
export const SEV_VERDICT = {
  0: { color:SIGNAL.GREEN.dot, bg:SIGNAL.GREEN.bg, border:SIGNAL.GREEN.border },
  1: { color:"#84CC16", bg:"#F7FEE7", border:"#BEF264" },
  2: { color:"#F97316", bg:"#FFF7ED", border:"#FDBA74" },
  3: { color:SIGNAL.RED.dot, bg:SIGNAL.RED.bg, border:SIGNAL.RED.border },
};

// S156 (A1.D0c-bis B1 retire): SEVERITY_WORD retired. Pre-S156 consumers
// retired at S133h FIX3 (VerdictBanner dot-row label) and S138-fix2
// (StickySurface severity echo); sole remaining consumer at
// ReportView.jsx:582 (Excel HTML export header) repointed to ACTION_LABEL
// (narrative.js) per D5 dataset-level canon.

// S136: .callout sub-objects extend each UI tier with the typography system's
// aside-callout pattern values (background tint + saturated left rule). Existing
// .text/.bg/.border slots untouched — they back current banner / hint chrome
// across the app. UI.FRAME.callout is new (neutral grey, no existing chrome).
// Phase C consumers re-point onto .callout for the canonical aside pattern.
export const UI = {
  WARN:  { text:ACCENT.GOLD.text, bg:ACCENT.GOLD.bg, border:ACCENT.GOLD.border, callout: { bg:"#FEF3C7", rule:"#CA8A04" } },
  OK:    { text:ACCENT.TEAL.text, bg:ACCENT.TEAL.bg, border:ACCENT.TEAL.border, callout: { bg:"#F0FDF4", rule:"#16A34A" } },
  INFO:  { text:ACCENT.BLUE.text, bg:ACCENT.BLUE.bg, border:ACCENT.BLUE.border, callout: { bg:"#EFF6FF", rule:"#2563EB" } },
  FRAME: { callout: { bg:"#F5F5F5", rule:C.TEXT_3 } },
};
// S152 badge-family pass: SET_ME retuned to neutral (text:C.TEXT_2 + bg:C.BG
// — was ACCENT.GOLD-tinted; lone consumer at ImportView.jsx:615 had always
// bypassed the token in favour of inline neutrals, retune unifies the path).
// AUTO + REQUIRED .border slots retired (no consumer reads them — A2 lock).
// VST_LOG retired entirely (orphan since S136; chip-tint shape never landed).
// VST_ANS retired entirely (single-property .text consumer at BatchView.jsx
// re-pointed direct to ACCENT.TEAL.text — three-property slot didn't earn its
// keep for one property in a <td> cell). PROMOTED unchanged (Marker pill —
// canonical accent-axis register per A6).
export const BADGE = {
  PROMOTED: { text:ACCENT.GOLD.text, bg:ACCENT.GOLD.bg, border:ACCENT.GOLD.border },
  AUTO:     { text:ACCENT.TEAL.text, bg:ACCENT.TEAL.bg },
  SET_ME:   { text:C.TEXT_2,          bg:C.BG },
  REQUIRED: { text:ACCENT.GOLD.text, bg:ACCENT.GOLD.bg },
};

export const M = { fontFamily: FF.MONO };

// Heatmap tier colours — flat per-tier fills shared by all correlation/residual matrices.
// Edit here to change heatmap colours globally. heatmapColors.js re-exports as TIER_COLOR.
// Single-hue red intensity ramp (pale low → full red high): more red = stronger
// correlation/residual. Pre-S214 this ran blue → amber → red, which borrowed the
// severity amber and a low-tier blue; both retired so the matrices read on one
// red magnitude axis (severity red #EF4444 at rising opacity).
export const HEATMAP_TIER = {
  LOW:  { color: "rgba(239,68,68,0.15)",  label: "Low" },
  MID:  { color: "rgba(239,68,68,0.35)",  label: "Moderate" },
  HIGH: { color: "rgba(239,68,68,0.55)",   label: "High" },
};

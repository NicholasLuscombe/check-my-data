/* ── Palette — 4 primitives, everything else derived ───────────────── */

// 1. NEUTRALS — slate ramp. Change these 9 values to re-theme the entire UI.
//    S136: TEXT/TEXT_2/TEXT_3 hex shifted to neutral-700/600/500 ramp per
//    typography system. TEXT_4 alias retired S151 C.9 (Phase C close).
export const C = {
  TEXT:     "#1F1F1F",  // headings, primary labels
  TEXT_2:   "#525252",  // secondary text
  TEXT_3:   "#737373",  // table headers, axis labels, fine print
  BORDER:   "#CBD5E1",  // primary borders, dividers (slate-300)
  AXIS:     "#94A3B8",  // plot axis lines and tick marks (slate-400): one step
                        // darker than BORDER so the line reads as structure on the
                        // tinted panel, still lighter than TEXT_2 so it does not
                        // compete with the tick numbers it carries
  GRID:     "#CBD5E1",  // interior plot gridlines (slate-300): one step darker than
                        // the panel background BG and one step lighter than the axis
                        // line AXIS, so the grey layers step evenly from panel to grid
                        // to axis to text. Its own role, kept apart from BORDER so
                        // tuning panel and table borders never drags the gridlines
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
  // ERROR — error-PATH alarm state, deliberately distinct from fabrication-severity
  // red (lighter border / darker dot). Only the two distinct shades live here; the
  // ERROR badge's bg/text reuse SIGNAL.RED (see FLAG_STYLES.ERROR).
  ERROR: { dot:"#dc2626", border:"#fca5a5" },
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

// Salient-state navy for the two-tone observed encodings (S246). The dark pole
// shared by the runs sign strip (+1) and the row-mean trend (crossing); the
// non-salient pole is observed-blue CC.OBS. These carry sign / crossing, NOT flag
// state. Cambridge blue, indigo, and lavender retired S246 (the 16b "wrong blue").
export const SIGN = {
  POS:      "#002147",  // Oxford navy — salient pole (+1 / crossing)
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
// SVG chart font sizes — 7 levels (nothing below 11pt)
export const CF = {
  TITLE: "14",     // axis/plot titles (was the SvgLabel title:"12" literal)
  TICK:  "12",     // axis tick numbers
  AXIS:  "13",     // axis title labels
  LABEL: "12",     // group names, bar labels, legend text
  VALUE: "12",     // data value annotations on bars/points
  SMALL: "11",     // secondary annotations, reference line labels
  TINY:  "11",     // floor — nothing smaller than 11pt in any chart
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

// OBS.* — observed-mark fill TREATMENTS (S255, arc 1 of the token-composition
// programme). The observed HUE is already one token (CC.OBS #3B82F6); these
// bundle the opacity + stroke that were per-plot literals, so a surface routes
// the whole observed treatment, not a bare alpha. Selection of WHICH bundle a
// mark gets stays per-plot.
//   areaFill — muted fill + crisp full-opacity same-token 1px stroke, so an
//              overlaid reference line reads through (VBar, HBar, KurtosisDist,
//              MissingData per-column bars, ColumnStatBar cleared bars).
//   solid    — verdict tile (correlation matrices); no stroke, carries digits.
//              fillOpacity softened from the old 1.0 to 0.35 (Nick-approved) — i.e.
//              areaFill's weight without the stroke; the digit colour auto-contrasts
//              off the COMPOSITED render via cellTextOn(compositeOver(...)).
//   strip    — sign-strip observed (−1) block; no stroke, no overlay, hue carries
//              the two-tone so opacity is free. SIGN.POS (+1, salient navy) is a
//              separate channel and keeps its own weight — not part of OBS.
export const OBS = {
  areaFill: { fill: CC.OBS, fillOpacity: 0.35, stroke: CC.OBS, strokeOpacity: 1 },
  // solid 0.35 stays below the ~0.47–0.50 luminance crossover over C.BG (below →
  // dark digits, above → white, between → low contrast) — safely in the dark zone.
  solid:    { fill: CC.OBS, fillOpacity: 0.35, stroke: "none" },
  strip:    { fill: CC.OBS, fillOpacity: 0.35, stroke: "none" },
  // dot — discrete observed point (scatter, distance, strip, per-lag). No
  //       stroke: the per-plot white separator stroke is geometry, stays local.
  // line — observed series / slope / observed-derived smooth. No strokeWidth:
  //       weight stays per-plot (a raw series and a heavier smooth both read
  //       OBS.line but differ in weight).
  dot:      { fill: CC.OBS, fillOpacity: 0.7 },
  line:     { stroke: CC.OBS, strokeOpacity: 0.85 },
};

// EXP.* — non-observed null fill/stroke TREATMENTS (S259, arc 3 of the
// token-composition programme). The teal-channel siblings of OBS.*: the null
// HUE is already one token (CC.EXP #0D9488); these bundle the opacity that was a
// per-plot literal on the null bands and the simulated-null density curves, so a
// surface routes the whole null treatment, not a bare alpha. As with OBS, soften
// by OPACITY on the shared CC.EXP token — never a second lighter teal. CC.EXP_SOFT
// (#7BC8A4) stays unused on purpose: a second hex reintroduces the hue drift this
// programme exists to remove.
//   band  — null tolerance fill, where clean data sits: the DotStrip expected
//           band and the NoiseSpread median-of-observed-SDs band. No stroke —
//           neither band overlays a line through its own fill. fillOpacity is
//           PROVISIONAL: the two bands were 0.15 / 0.25, collapsed onto one value
//           pending Nick's two-state screenshot call, the render-gated decision
//           arc 2 made on its dot/line values. 0.25 is the placeholder (the more
//           legible of the two), not a settled value.
//   curve — simulated-null density stroke: the Kurtosis distribution sim curve
//           and its per-condition sparkline twin. No strokeWidth: weight stays
//           per-plot (CS.FIT.w), the same split OBS.line keeps. 0.85 collapses the
//           prior 0.85 / 0.9 pair onto the lighter value.
export const EXP = {
  band:  { fill: CC.EXP, fillOpacity: 0.25 },
  curve: { stroke: CC.EXP, strokeOpacity: 0.85 },
};

// observedSwatchColor — resolves an observed legend swatch's colour from the
// mark's flag state, the colour-channel sibling of the OBS opacity treatment
// above. Flat-red flip: the whole observed series turns CC.THRESH when the test
// flags (a global statistic with no per-mark attribution — the series flips, not
// individual marks), else cleared CC.OBS. The HIGH/MODERATE predicate matches
// the observed bars in VBarPlot and KurtosisDistPlot verbatim, so the swatch and
// the mark render the identical token in both states. The next step routes the
// companion-swatch cards through the same resolver, retiring their second swatch.
export const observedSwatchColor = (flag) =>
  flag === "HIGH" || flag === "MODERATE" ? CC.THRESH : CC.OBS;

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
// these are arbitrary slot identifiers carrying no decodable meaning — so the
// hue must stay clear of the signal family. Red and amber are reserved for
// flags battery-wide; a severity hue on an arbitrary group is both meaningless
// and a "no red/amber on numeric cells" violation, since the grid paints the
// `text` colour onto the numbers themselves.
//
// A frozen literal copy of the original (pre-S250) condition palette's first
// six hues (blue, lime, purple, cyan, pink, green) — chosen away from the
// severity family by design (no red/amber in the set). It is NOT kept in sync
// with COND_COLORS: COND_COLORS was reordered in S250 (blue moved slot 0→5) and
// this copy was intentionally left unchanged, so the duplicate-group rotation
// stays stable regardless of the condition-palette order. Copied rather than
// imported because tokens.js is the primitive leaf module and roles.js already
// imports from it — importing back would be circular. The full
// {bg, text, border} objects are kept (a literal slice); consumers read `text`
// (cell text colour) and `bg` (cell background); `border` is inert here.
export const DUP_GROUP_PALETTE = [
  { bg: "#DBEAFE", text: "#3B82F6", border: "#93C5FD" },  // blue
  { bg: "#ECFCCB", text: "#4D7C0F", border: "#BEF264" },  // lime (.text darkened to lime-700 for small-text contrast on white)
  { bg: "#F3E8FF", text: "#A855F7", border: "#D8B4FE" },  // purple
  { bg: "#CFFAFE", text: "#06B6D4", border: "#67E8F9" },  // cyan
  { bg: "#FCE7F3", text: "#EC4899", border: "#F9A8D4" },  // pink
  { bg: "#D1FAE5", text: "#10B981", border: "#6EE7B7" },  // green
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
  REQUIRED: { text:ACCENT.GOLD.text, bg:ACCENT.GOLD.bg, rule:"#F59E0B" },  // .rule = amber-500 left-stripe (ImportView REQUIRED-family borderLeft)
};

export const M = { fontFamily: FF.MONO };

// Heatmap tier colours — flat per-tier fills shared by all correlation/residual matrices.
// Edit here to change heatmap colours globally. heatmapColors.js re-exports as TIER_COLOR.
// Two-regime magnitude ramp: a light-slate resting floor below the flag
// threshold (LOW = "tested, not flagged"), handing off to amber → red above it
// (MID/HIGH carry magnitude in the flagged range). The colour break at the
// threshold reads as the categorical "this crossed the line". A first S214 pass
// ran single-hue red at three opacities, which compressed not-significant /
// elevated / high into indistinguishable pinks; the slate floor restores low-
// range legibility while keeping amber → red the severity scale. Slate, not
// blue: blue is spent on observed, condition-1, and the sign two-tone. The
// slate floor (slate-300) reads clear of the condition slate label (slate-500,
// darker) on the IRC / residual matrices.
export const HEATMAP_TIER = {
  LOW:  { color: "#CBD5E1",  label: "Low" },
  MID:  { color: "#F97316",  label: "Moderate" },
  HIGH: { color: "#EF4444",  label: "High" },
};

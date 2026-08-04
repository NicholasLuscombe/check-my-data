/* ── ClusterRow — §3 cluster header row (label · count · description · word badge · chevron) ──
   S150 (C.8): extracted from the byte-identical 5-span flex composition that
   lived inline at ForensicsCategoryBlock.jsx and CategoryRow.jsx. Same hazard
   pattern as LANE_LABEL (S149) — touching one without the other would create
   drift, and the typography registers on the three text spans are
   load-bearing for the cluster-row rhythm (S150 A1 lock).

   Typography registers (A1 Option B lock):
     - Label:               FS.base / FW.SEMI / C.TEXT
                            (co-consumes Lane-label tuple — name-cased category
                             label, the primary span)
     - Count parenthetical: FS.base / FW.NORM / C.TEXT_3
                            (co-consumes Identity-row-label tuple — peer with
                             description, no longer reads as metadata)
     - Description prose:   FS.base / FW.NORM / C.TEXT_3
                            (co-consumes Identity-row-label tuple — same as
                             count; both at C.TEXT_3 surround the primary label)

   S156 (A1.D0c-bis D6 lock): parallel encoding — the borderLeft now carries
   MECH_COLOR keyed off the cluster mechanism, and the inline-left ⚠/✓ glyph
   retires. The worst-tier word badge ("High" / "Moderate" / "Clear") moves
   to the right side of the row in SEV_VERDICT colour, plain weight. The
   parallel-encoding pair: mechanism on the left (matching §2 chip border),
   severity on the right (matching §3 per-card badge colour). When `mk` is
   omitted (defensive fallback), the row degrades to the pre-S156 SEV-coded
   left border + glyph.

   Chevron is a typeset glyph but renders as an icon, not text — bypasses
   the typography system per TYPOGRAPHY-SYSTEM.md §"What this system does
   NOT cover" (chart-annotation / icon-glyph carve-out).

   The 3px borderLeft sidebar and 10px outer padding are part of the row's
   chrome and live inside this component — consumers don't wrap. */

import { C, FS, FW, MECH_COLOR, SEV_VERDICT } from "../../constants/tokens.js";
import { clusterCoverageState } from "../../analysis/coverage.js";
import { LANE_LABEL_TYPOGRAPHY } from "./Section.jsx";
import { MechIcon, mechIconSize } from "./MechIcon.jsx";
import { RAIL_GUTTER, RAIL_RIGHT } from "./styles.js";

// Tone → colour. The word itself is decided in coverage.js; only the paint is
// here. Neutral is the coverage-gap tone (nothing ran, work outstanding, or a
// member withheld) — green is reserved for a determination the cluster made.
const WORD_TONE_COLOR = {
  high: SEV_VERDICT[3].color,
  moderate: SEV_VERDICT[2].color,
  clear: SEV_VERDICT[0].color,
  neutral: C.TEXT_3,
};

/**
 * @param {object} props
 * @param {string} props.label - cluster display name (e.g. "Copy, paste, edit")
 * @param {string} props.description - one-liner shown after the em-dash
 * @param {boolean} props.isFlagged - any HIGH or MODERATE tests
 * @param {boolean} [props.hasHigh] - any HIGH tests (drives worst-tier word)
 * @param {object} [props.coverage] - coverage summary for the cluster's full
 *   member list, from summarizeCoverage(): { ran, notApplicable, withheld,
 *   unassessed, errored, pending, total }. Drives the "X of Y ran · …"
 *   reconciling line.
 * @param {string} [props.mk] - mechanism cluster key for MECH_COLOR border resolution
 * @param {string} [props.flagColor] - legacy SEV-coded border colour, used only
 *   when `mk` is absent (defensive fallback)
 * @param {boolean} props.isExpanded - chevron orientation (▾ vs ▸)
 * @param {boolean} [props.isExpandable=true] - when false, cursor stays default
 *   and chevron + onClick suppressed (CategoryRow clean-state path).
 * @param {function} [props.onToggle] - click handler; gated by isExpandable
 */
export function ClusterRow({
  label, description,
  isFlagged, hasHigh,
  coverage,
  mk, flagColor,
  isExpanded, isExpandable = true,
  onToggle,
}) {
  const borderColor = (mk && MECH_COLOR[mk]) || flagColor;
  // Word, tone and clauses come from clusterCoverageState in analysis/coverage.js
  // — the module that owns the buckets owns the vocabulary they resolve to. This
  // component maps the tone to a colour and lays the spans out; it derives no
  // coverage arithmetic of its own.
  const { word: wordText, tone, clauses } = clusterCoverageState(coverage, { isFlagged, hasHigh });
  const wordColor = WORD_TONE_COLOR[tone] || C.TEXT_3;
  const coverageText = clauses.join(" · ");
  return (
    <div style={{ padding: `10px ${RAIL_RIGHT} 10px 10px`, borderLeft: `3px solid ${borderColor}` }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 0, cursor: isExpandable ? "pointer" : "default" }}
        onClick={isExpandable ? onToggle : undefined}
      >
        {/* S210: the gutter now holds only the disclosure triangle — the
            mechanism icon moved to the right of the title (below), so the rail
            sits close to the left edge. Glyph is the icon-glyph carve-out per
            TYPOGRAPHY-SYSTEM.md §"What this system does NOT cover". */}
        <span style={{ width: RAIL_GUTTER, flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
          {isExpandable && (
            <span style={{ color: C.TEXT_2, fontSize: "14px", flexShrink: 0 }}>
              {isExpanded ? "▾" : "▸"}
            </span>
          )}
        </span>
        {/* Text group — starts on the rail (gutter's right edge). Keeps the
            label↔count↔description rhythm and the right-pinned word badge. */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1, minWidth: 0 }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY }}>
            {label}
          </span>
          {/* S157/S210: cluster-identity icon — now immediately AFTER the title,
              before the description: [title] [icon] — description. 20px
              (mechIconSize +2 for digits), MECH_COLOR hue via the mk key.
              (The "(N tests)" parenthetical retired — the badge's "X of Y ran"
              coverage form is the single count on the row.) */}
          {mk && <span style={{ flexShrink: 0, display: "inline-flex" }}><MechIcon mk={mk} size={mechIconSize(mk, 20)} /></span>}
          <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: C.TEXT_3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {"— "}{description}
          </span>
          {/* Header word — colour-on-chrome / words-stay-plain rule. Flagged
              clusters carry High / Moderate in SEV colour; a clean cluster
              carries a coverage-gated word (Clear / Clear so far / Partly
              assessed / Not evaluated / Not run / Not applicable), green only
              when every test that could run completed. The short coverage
              clauses trail the word; "Not run" and "Not applicable" stand alone
              with no trailing separator. */}
          <span style={{ fontSize: FS.base, fontWeight: FW.NORM, marginLeft: "auto", flexShrink: 0 }}>
            <span style={{ color: wordColor }}>{wordText}</span>
            {coverageText && <span style={{ color: C.TEXT_3 }}>{` · ${coverageText}`}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

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
import { LANE_LABEL_TYPOGRAPHY } from "./Section.jsx";
import { MechIcon, mechIconSize } from "./MechIcon.jsx";

/**
 * @param {object} props
 * @param {string} props.label - cluster display name (e.g. "Copy, paste, edit")
 * @param {number} props.count - applicable test/check count for the cluster
 * @param {string} props.description - one-liner shown after the em-dash
 * @param {"test"|"check"} [props.noun="test"] - QC mode uses "check"; Forensics + Review use "test"
 * @param {boolean} props.isFlagged - any HIGH or MODERATE tests
 * @param {boolean} [props.hasHigh] - any HIGH tests (drives worst-tier word)
 * @param {string} [props.mk] - mechanism cluster key for MECH_COLOR border resolution
 * @param {string} [props.flagColor] - legacy SEV-coded border colour, used only
 *   when `mk` is absent (defensive fallback)
 * @param {boolean} props.isExpanded - chevron orientation (▾ vs ▸)
 * @param {boolean} [props.isExpandable=true] - when false, cursor stays default
 *   and chevron + onClick suppressed (CategoryRow clean-state path).
 * @param {function} [props.onToggle] - click handler; gated by isExpandable
 */
export function ClusterRow({
  label, count, description,
  noun = "test",
  isFlagged, hasHigh,
  mk, flagColor,
  isExpanded, isExpandable = true,
  onToggle,
}) {
  const borderColor = (mk && MECH_COLOR[mk]) || flagColor;
  // Worst-tier word + colour: HIGH → "High", MODERATE → "Moderate", LOW → "Clear".
  const wordColor = hasHigh ? SEV_VERDICT[3].color : isFlagged ? SEV_VERDICT[2].color : SEV_VERDICT[0].color;
  const wordText  = hasHigh ? "High"               : isFlagged ? "Moderate"           : "Clear";
  return (
    <div style={{ padding: "10px 10px", borderLeft: `3px solid ${borderColor}` }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: isExpandable ? "pointer" : "default" }}
        onClick={isExpandable ? onToggle : undefined}
      >
        {/* S195: disclosure glyph leads the row (left/leading), matching
            the CardLayout disclosure pattern (glyph then label). Spacing
            comes from the row's gap:8px, so no marginRight is added.
            Icon-glyph carve-out per TYPOGRAPHY-SYSTEM.md §"What this
            system does NOT cover". */}
        {isExpandable && (
          <span style={{ color: C.TEXT_2, fontSize: "14px", flexShrink: 0 }}>
            {isExpanded ? "▾" : "▸"}
          </span>
        )}
        {/* S157: cluster-identity icon at the row's leading position.
            20px to match the cluster-header text weight; MECH_COLOR
            hue carried through MechIcon's default colour resolution
            via the mk key. Renders at full opacity in all tiers — the
            right-side worst-tier word badge does the cleared/flagged
            muting work via SEV_VERDICT colour. */}
        {mk && <MechIcon mk={mk} size={mechIconSize(mk, 20)} />}
        <span style={{ ...LANE_LABEL_TYPOGRAPHY }}>
          {label}
        </span>
        <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: C.TEXT_3, flexShrink: 0 }}>
          ({count} {noun}{count !== 1 ? "s" : ""})
        </span>
        <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: C.TEXT_3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {"— "}{description}
        </span>
        {/* Worst-tier word badge — colour-on-chrome / words-stay-plain rule.
            SEV_VERDICT colour matches the per-card badge at TestCardLayout
            for visual continuity. */}
        <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: wordColor, marginLeft: "auto", flexShrink: 0 }}>
          {wordText}
        </span>
      </div>
    </div>
  );
}

/* ── ClusterRow — §3 cluster header row (icon · label · count · description · chevron) ──
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

   Icon and chevron are typeset glyphs but render as icons, not text — they
   bypass the typography system per TYPOGRAPHY-SYSTEM.md §"What this system
   does NOT cover" (chart-annotation / icon-glyph carve-out). S149 ✕ button
   precedent: hardcoded literal size + carve-out comment.

   The 3px borderLeft sidebar and 10px outer padding are part of the row's
   chrome and live inside this component — consumers don't wrap. */

import { C, FS, FW } from "../../constants/tokens.js";
import { LANE_LABEL_TYPOGRAPHY } from "./Section.jsx";

/**
 * @param {object} props
 * @param {string} props.label - cluster display name (e.g. "Copy, paste, edit")
 * @param {number} props.count - applicable test/check count for the cluster
 * @param {string} props.description - one-liner shown after the em-dash
 * @param {"test"|"check"} [props.noun="test"] - QC mode uses "check"; Forensics + Review use "test"
 * @param {boolean} props.isFlagged - ⚠︎ icon when true; ✓︎ when false
 * @param {string} props.flagColor - icon + borderLeft tier colour
 * @param {boolean} props.isExpanded - chevron orientation (▾ vs ▸)
 * @param {boolean} [props.isExpandable=true] - when false, cursor stays default
 *   and chevron + onClick suppressed (CategoryRow clean-state path).
 * @param {function} [props.onToggle] - click handler; gated by isExpandable
 */
export function ClusterRow({
  label, count, description,
  noun = "test",
  isFlagged, flagColor,
  isExpanded, isExpandable = true,
  onToggle,
}) {
  return (
    <div style={{ padding: "10px 10px", borderLeft: `3px solid ${flagColor}` }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: isExpandable ? "pointer" : "default" }}
        onClick={isExpandable ? onToggle : undefined}
      >
        {/* Icon glyph — carve-out per TYPOGRAPHY-SYSTEM.md §"What this system
            does NOT cover". Hardcoded pending icon-sizing system; do NOT
            promote to text-register tokens. */}
        <span style={{ color: flagColor, fontSize: "15px", flexShrink: 0 }}>
          {isFlagged ? "⚠︎" : "✓︎"}
        </span>
        <span style={{ ...LANE_LABEL_TYPOGRAPHY }}>
          {label}
        </span>
        <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: C.TEXT_3, flexShrink: 0 }}>
          ({count} {noun}{count !== 1 ? "s" : ""})
        </span>
        <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: C.TEXT_3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {"— "}{description}
        </span>
        {isExpandable && (
          /* Chevron glyph — same carve-out as the icon above. */
          <span style={{ color: C.TEXT_2, fontSize: "14px", marginLeft: "auto", flexShrink: 0 }}>
            {isExpanded ? "▾" : "▸"}
          </span>
        )}
      </div>
    </div>
  );
}

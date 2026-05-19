/* ── FindingDetailPanel — persistent docked finding panel (S163 Phase 3b) ──
   Mounts below StickySurface inside §2 WHAT WAS FOUND. Driven by
   ForensicsBody's `activeRegionNumber` state — a chip click activates a
   region, the parent resolves the matching finding object, and this
   panel receives it as the `finding` prop.

   Phase 3b is the first UI-visible step of the A1.D3 arc. Render
   contract here is intentionally minimal:

     - Header row carries the [N] region-number prefix (when present),
       the finding name (single-test displayName, else dominant-dimension
       label), and a ✕ close button on the far right.
     - Status placeholder line below the header reports either the row
       count for the region or the dataset-wide marker.

   Out of scope for Phase 3b (lands at 3c):
     - Show data toggle.
     - Excerpt table mount.
     - Vertical minimap mount.
     - TEST_RAW_VISIBILITY consumer dispatch (three-case status copy by
       lane × raw-visibility).

   Chrome matches the §2 visual register — white card, light border,
   moderate radius — so the panel reads as a continuation of the sticky
   surface above it without competing with the chip lanes for emphasis. */

import { C, FS, FW, FF, CR, SEV_VERDICT } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";

// HIGH / MOD / LOW → SEV_VERDICT tier index. Mirrors the FindingChip
// chipStyle dispatch; centralised here so the [N] prefix colour matches
// the chip colour for the same finding.
const SEV_TIER = { HIGH: 3, MOD: 2, LOW: 1 };

function sevColor(severity) {
  const tier = SEV_TIER[severity] ?? 0;
  return SEV_VERDICT[tier].color;
}

function findingName(finding) {
  const tests = finding.tests || [];
  if (tests.length === 1) return tests[0]?.displayName || "";
  const dimKey = finding.dimensions?.[0];
  return MECHANISMS[dimKey]?.label || dimKey || "";
}

function statusCopy(finding) {
  if (finding.regionNumber != null) {
    const range = finding.region?.rowRange;
    if (range && range.length === 2) {
      const n = range[1] - range[0] + 1;
      return `${n} rows flagged`;
    }
    return "";
  }
  return "Dataset-wide finding";
}

export function FindingDetailPanel({ finding, onClose }) {
  if (!finding) return null;

  const N = finding.regionNumber;
  const name = findingName(finding);
  const status = statusCopy(finding);
  const accent = sevColor(finding.severity);

  return (
    <div
      data-finding-detail-panel
      style={{
        background: C.WHITE,
        border: `1px solid ${C.BORDER_L}`,
        borderRadius: CR.LG,
        padding: "12px 16px",
        marginBottom: "12px",
        fontFamily: FF.UI,
      }}
    >
      {/* Header row — [N] prefix + finding name on the left, ✕ on the right. */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          flex: 1,
          display: "flex", alignItems: "baseline", gap: "6px",
          minWidth: 0,
        }}>
          {N != null && (
            <span style={{
              fontSize: FS.sm,
              fontWeight: FW.BOLD,
              color: accent,
            }}>
              [{N}]
            </span>
          )}
          <span style={{
            fontSize: FS.sm,
            fontWeight: FW.SEMI,
            color: C.TEXT,
          }}>
            {name}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close finding panel"
          style={{
            background: "none", border: "none",
            // Icon glyph — TYPOGRAPHY-SYSTEM.md §4.2 carve-out: icon
            // sizing is separate from text register. Hardcoded pending
            // that system's land.
            fontSize: "16px", fontWeight: FW.NORM,
            color: C.TEXT_3, cursor: "pointer",
            padding: "2px 6px", lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Status placeholder row — Phase 3c replaces with the three-case
          dispatch by (lane, raw-visibility). */}
      {status && (
        <div style={{
          marginTop: "6px",
          fontSize: FS.base,
          fontWeight: FW.NORM,
          color: C.TEXT_2,
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

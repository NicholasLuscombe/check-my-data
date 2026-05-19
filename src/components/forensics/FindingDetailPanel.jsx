/* ── FindingDetailPanel — persistent docked finding panel (S163 Phase 3b/3c/3d) ──
   Mounts below the chip lanes inside §2 WHAT WAS FOUND. Driven by
   ForensicsBody's `activeRegionNumber` state — a chip click activates a
   region, the parent resolves the matching finding object, and this
   panel receives it as the `finding` prop.

   Phase 3b authored the scaffold (header + status placeholder + ✕).
   Phase 3c adds:
     - Show data toggle. Default collapsed on first activation; the
       toggle state inherits across region activations so the user's
       "show me data" intent carries forward until they collapse it.
     - Three-case status copy via `TEST_RAW_VISIBILITY` from
       mechanisms.js (Phase 3a artefact). Dispatch keyed by chip class
       (localised vs fallback) and raw-visibility tag.
     - Data block: MinimapStripVertical + ExcerptTable side-by-side
       inside the panel when the toggle is expanded AND the chip is
       localised. Fallback chips (no per-cell evidence) hide the toggle
       entirely; the panel reduces to header + status copy that points
       to the test card.
   Phase 3d adds:
     - position: sticky. The panel pins to viewport top during §3
       scroll so the user can read test cards with the panel still
       visible. Chip lanes above scroll off normally; the panel is
       the sole sticky element in §2. ForensicsBody mounts this as a
       Fragment sibling of §3-§5 so the pin range covers the whole
       report (sticky un-pins at parent's bottom edge, parent is the
       ForensicsBody Fragment / ReportView outer wrapper).
     - `data-finding-detail-panel` is the load-bearing DOM marker that
       scrollToCard reads to offset the chip-click landing position
       past the panel.

   Chrome — white card, light border, moderate radius — sits cleanly
   below the §2 BG_ZONE chip lanes without competing with them. */

import { useMemo, useState } from "react";
import { C, FS, FW, FF, CR, SEV_VERDICT } from "../../constants/tokens.js";
import { MECHANISMS, TEST_RAW_VISIBILITY, GROUP_MARKERS, RANK_NUMS } from "../../constants/mechanisms.js";
import { MinimapStripVertical } from "./MinimapStripVertical.jsx";
import { ExcerptTable } from "./ExcerptTable.jsx";

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

// Chip-class predicate. Localised chips carry per-cell evidence
// (region.cells populated → the table excerpt has cells to tint).
// Fallback chips fired severity > LOW but produced no specific cells;
// the panel cannot mount a data view for them.
function isLocalisedChip(finding) {
  return (finding?.region?.cells?.length || 0) > 0;
}

// Three-case status copy per A1.D3 §5. The first two cases tag a
// localised chip's status line by whether a reader inspecting the
// flagged cells sees the pattern in those cells (Case 1, visible) or
// has to read it off the test card's reasoning (Case 2, statistical).
// Case 3 covers fallback chips whose evidence is dataset-wide.
function statusCopy(finding) {
  if (!isLocalisedChip(finding)) {
    return "Flagged across your data — see the test card for the reasoning.";
  }
  const range = finding.region?.rowRange;
  const n = range && range.length === 2 ? range[1] - range[0] + 1 : 0;
  const firstTestId = finding.tests?.[0]?.testId;
  let visibility = firstTestId ? TEST_RAW_VISIBILITY[firstTestId] : undefined;
  if (visibility !== "visible" && visibility !== "statistical") {
    if (firstTestId && typeof console !== "undefined") {
      console.warn(`FindingDetailPanel: no TEST_RAW_VISIBILITY entry for "${firstTestId}", defaulting to "statistical"`);
    }
    visibility = "statistical";
  }
  if (visibility === "visible") {
    return `${n} rows flagged — highlighted cells below`;
  }
  return `${n} rows flagged — the pattern is statistical, not visible in cell values. See the test card for the reasoning.`;
}

// Group-marker map derivation — DupDet exact-row groups + ConstOffset
// offset pairs flow from convergence.groups through this map into
// ExcerptTable via the optional `groupMarkerMap` prop, which renders
// rank / marker tokens in the table's leading column.
function buildGroupMarkerMap(convergence) {
  const groups = convergence?.groups || [];
  const map = new Map();
  const typeIdx = { exact: 0, offset: 0 };
  for (const g of groups) {
    const markers = GROUP_MARKERS[g.type] || RANK_NUMS;
    const idx = typeIdx[g.type] ?? 0;
    map.set(g.id, markers[idx] || `(${idx + 1})`);
    if (g.type in typeIdx) typeIdx[g.type]++;
  }
  return map;
}

export function FindingDetailPanel({ finding, onClose, heatmapProps = null, onActivateRegion = null }) {
  // Show data persistence: state lives on the panel itself, not on
  // ForensicsBody. React keeps the value across re-renders so when the
  // `finding` prop changes (chip click → new region), the expanded
  // state carries forward — the user already signalled "I want to see
  // data" once and shouldn't have to re-toggle on every chip switch.
  const [dataExpanded, setDataExpanded] = useState(false);

  const groupMarkerMap = useMemo(
    () => buildGroupMarkerMap(heatmapProps?.convergence),
    [heatmapProps?.convergence]
  );

  if (!finding) return null;

  const N = finding.regionNumber;
  const name = findingName(finding);
  const status = statusCopy(finding);
  const accent = sevColor(finding.severity);
  const localised = isLocalisedChip(finding);
  const showDataBlock = dataExpanded && localised && heatmapProps;

  return (
    <div
      data-finding-detail-panel
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: C.WHITE,
        border: `1px solid ${C.BORDER_L}`,
        borderRadius: CR.LG,
        padding: "12px 16px",
        marginBottom: "12px",
        fontFamily: FF.UI,
        boxShadow: "0 4px 6px -2px rgba(0,0,0,0.05)",
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

      {/* Status row — three-case dispatch via TEST_RAW_VISIBILITY. */}
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

      {/* Show data toggle — only rendered for localised chips. Fallback
          chips (no per-cell evidence) drop the toggle entirely; their
          status copy already points to the test card. */}
      {localised && (
        <button
          onClick={() => setDataExpanded(v => !v)}
          aria-expanded={dataExpanded}
          style={{
            marginTop: "8px",
            background: "none", border: "none",
            padding: 0,
            fontSize: FS.sm,
            fontWeight: FW.NORM,
            fontFamily: FF.UI,
            color: C.TEXT_2,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: "4px",
          }}
        >
          <span>Show data</span>
          <span style={{ fontSize: "10px" }}>{dataExpanded ? "▴" : "▾"}</span>
        </button>
      )}

      {/* Data block — vertical minimap + excerpt side by side. Mount is
          gated on (a) the toggle being open, (b) the chip being
          localised (the table has cells to tint), and (c) heatmapProps
          being threaded through from ReportView. */}
      {showDataBlock && (
        <div style={{
          marginTop: "10px",
          display: "flex",
          gap: "10px",
          alignItems: "stretch",
          maxHeight: "320px",
        }}>
          <div style={{ flexShrink: 0, height: "320px" }}>
            <MinimapStripVertical
              convergence={heatmapProps.convergence}
              findings={heatmapProps.findings}
              rowMap={heatmapProps.rowMap}
              nVisRows={heatmapProps.rawData?.length || 0}
              onActivateRegion={onActivateRegion}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: "auto", maxHeight: "320px" }}>
            <ExcerptTable
              convergence={heatmapProps.convergence}
              rawData={heatmapProps.rawData}
              rowMap={heatmapProps.rowMap}
              colHeaders={heatmapProps.colHeaders}
              visColIndices={heatmapProps.visColIndices}
              dColMap={heatmapProps.dColMap}
              roles={heatmapProps.roles}
              coordCtx={heatmapProps.coordCtx}
              condPerCol={heatmapProps.condPerCol}
              findings={heatmapProps.findings}
              groupMarkerMap={groupMarkerMap}
              region={finding.region}
              activeTestKey={finding.tests?.[0]?.testId || null}
            />
          </div>
        </div>
      )}
    </div>
  );
}

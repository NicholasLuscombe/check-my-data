/* ── StickySurface — Forensics-mode §2 chip lanes (S126b → S163) ──
   Sits inside §2 WHAT WAS FOUND, below the section header. Renders the
   three chip-lane rows over the findings[] data layer.

   Pre-S163 (S126b add-7b through Phase 3c): this element carried
   `position: sticky` and pinned to viewport top during §3 scroll. The
   inline horizontal MinimapStrip rendered below the chip lanes inside
   the sticky wrapper.

   S163 Phase 3d (A1.D3 close): sticky chrome retires here. The
   FindingDetailPanel (sibling below) is the sole sticky element in §2
   now — chip lanes scroll off normally and the panel pins for the
   active region. The inline MinimapStrip mount retires entirely; the
   panel-internal MinimapStripVertical covers the navigation role.

   The visual chrome stays — BG_ZONE bg + flat-top continuation of the
   §2 Section header card, with bottom-rounded corners. The two DOM
   elements still merge visually into one card from the section header
   through the chip lanes. */

import { C, CR } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { LANE_LABEL_TYPOGRAPHY, LANE_LABELS } from "../shared/Section.jsx";
import { FindingPill } from "./FindingPill.jsx";
import { FindingChip } from "./FindingChip.jsx";

// Layout-only properties for the lane-label spans. Typography lives in
// LANE_LABEL_TYPOGRAPHY (Section.jsx). Spread both at each consumer site.
const LANE_LABEL_LAYOUT = { whiteSpace: "nowrap", flexShrink: 0 };

// Severity-descending sort with alphabetical fallback within the tier.
// Pills are always single-test (HIGH/MOD globals) so the sort key is the
// test displayName. Chips today are also single-test but the comparator
// reads the chip-render label (test displayName for single-test, dim
// label for multi-test) so future multi-test chips sort consistently
// with what's drawn on screen.
const SEV_RANK = { HIGH: 3, MOD: 2, LOW: 1 };
const sevRank = (sev) => SEV_RANK[sev] || 0;
const pillSortKey = (f) => f.tests?.[0]?.displayName || "";
const chipSortKey = (f) => {
  if ((f.tests?.length || 0) === 1) return f.tests[0]?.displayName || "";
  const dim = f.dimensions?.[0];
  return MECHANISMS[dim]?.label || dim || "";
};
const compareBy = (getKey) => (a, b) => {
  const sr = sevRank(b.severity) - sevRank(a.severity);
  if (sr !== 0) return sr;
  return getKey(a).localeCompare(getKey(b));
};

// S133f: a localised finding with `region.cells.length === 0` carries no per-
// row evidence — it's the S126b add-8 fallback (test fired with severity > LOW
// but produced no specific rows / cells, so MinimapStrip filters it out of the
// region overlays). Pre-S133f these chips were rendered alongside true
// localised chips in a single lane, claiming a localisation the minimap
// couldn't confirm. S133f routes them into a separate "Broadly flagged
// patterns" lane so the §2 surface tells the truth about scope.
const isFallbackChip = (f) => (f.region?.cells?.length || 0) === 0;

/**
 * Partition findings into pill (HIGH/MOD globals), localised-chip, and
 * fallback-chip ("flagged broadly") lanes. Each lane sorted severity-
 * descending then alphabetically within a tier (S126b add-5).
 */
export function pillsAndChips(findings = []) {
  const pills = [];
  const localisedChips = [];
  const fallbackChips = [];
  for (const f of findings) {
    if (f.type === "global" && (f.severity === "HIGH" || f.severity === "MOD")) {
      pills.push(f);
    } else if (f.type === "localised" && f.regionNumber != null) {
      if (isFallbackChip(f)) fallbackChips.push(f);
      else localisedChips.push(f);
    }
  }
  pills.sort(compareBy(pillSortKey));
  localisedChips.sort(compareBy(chipSortKey));
  fallbackChips.sort(compareBy(chipSortKey));
  return { pills, localisedChips, fallbackChips };
}

/**
 * Boolean predicate — true when StickySurface should render at all (i.e.
 * there is at least one pill or chip to display, in any lane). Caller
 * branches on this to decide whether to mount StickySurface or fall back
 * to a clean-state §2 body. Name preserved from the pre-3d sticky era;
 * the chip lanes still gate on this predicate even though the surface
 * itself no longer pins.
 */
export function shouldRenderSticky(findings = []) {
  const { pills, localisedChips, fallbackChips } = pillsAndChips(findings);
  return pills.length > 0 || localisedChips.length > 0 || fallbackChips.length > 0;
}

export function StickySurface({ findings, onActivateTest, activeRegionNumber = null }) {
  const { pills, localisedChips, fallbackChips } = pillsAndChips(findings);
  if (!pills.length && !localisedChips.length && !fallbackChips.length) return null;

  // Rendered as a flat-top continuation of the <Section flatBottom>
  // sibling above. Same BG_ZONE bg + matching radii on the abutting
  // edge so the visual reads as one card. Normal scroll flow at Phase
  // 3d — the FindingDetailPanel sibling below is the §2 sticky
  // element now.
  return (
    <div data-forensics-chip-lanes style={{
      background: C.BG_ZONE,
      borderRadius: `0 0 ${CR.LG} ${CR.LG}`,
      padding: "0 20px 16px 20px",
      marginBottom: "12px",
    }}>
      {pills.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap",
          marginBottom: (localisedChips.length > 0 || fallbackChips.length > 0) ? "8px" : 0,
        }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>{LANE_LABELS.pills}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {pills.map(f => (
              <FindingPill key={f.id} finding={f} onActivate={onActivateTest} />
            ))}
          </div>
        </div>
      )}
      {localisedChips.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap",
          marginBottom: fallbackChips.length > 0 ? "8px" : 0,
        }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>{LANE_LABELS.localised}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {localisedChips.map(f => (
              <FindingChip
                key={f.id}
                finding={f}
                onActivate={onActivateTest}
                showRegionNumber={f.regionNumber === activeRegionNumber}
              />
            ))}
          </div>
        </div>
      )}
      {/* S133f: fallback chips (region.cells.length === 0) — tests that fired
          severity > LOW but produced no specific rows. Routed out of the
          Localised lane so the surface doesn't claim a localisation that
          can't be drawn on a minimap. */}
      {fallbackChips.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap",
        }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>{LANE_LABELS.fallback}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {fallbackChips.map(f => (
              <FindingChip
                key={f.id}
                finding={f}
                onActivate={onActivateTest}
                showRegionNumber={f.regionNumber === activeRegionNumber}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

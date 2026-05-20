/* ── StickySurface — Forensics-mode §2 sticky surface (S126b → S163) ──
   Sits inside §2 WHAT WAS FOUND, below the section header. Pins to
   viewport top during §3 scroll. Renders three lanes of pills/chips
   over the findings[] data layer, a permanent Data toggle below the
   lanes, and (when the toggle is open) the active-region data view
   provided by FindingDetailPanel.

   S163 fix-pass 1 (this rev) lands the post-triage design:
     - Chips lose the [N] prefix; an active chip rings instead.
     - Re-clicking the active chip deactivates it (toggle behaviour).
     - Header row / status row / ✕ button retire entirely. Active-
       region context lives in the chip's ring + the data block's
       filtered minimap + region-zoomed table.
     - "Data" toggle (▼/▲) lives at the sticky-surface level,
       independent of activeRegionNumber. First chip click in
       session auto-expands; user-toggle persists thereafter.
     - Stronger bottom drop-shadow so the sticky/scrolling boundary
       is visible.

   Pre-fix-pass shape (Phase 3e) split the active-region content
   into a FindingDetailPanel mounted below a horizontal-rule
   separator. Triage surfaced that the [N] / status / ✕ chrome
   was redundant once the chip ring + filtered minimap + zoomed
   table carry the same information; fix-pass 1 retires that
   chrome and promotes the Data toggle to a permanent affordance. */

import { useId } from "react";
import { C, CR, FS, FW, FF } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { LANE_LABEL_TYPOGRAPHY, LANE_LABELS, MINIMAP_CALLOUT_TYPOGRAPHY } from "../shared/Section.jsx";
import { FindingPill } from "./FindingPill.jsx";
import { FindingChip } from "./FindingChip.jsx";
import { FindingDetailPanel } from "./FindingDetailPanel.jsx";

const STICKY_TOP = 0;

// Stable DOM marker so chip-click scroll handlers can read the sticky
// surface's measured height and offset their landing position. Writer
// is the outer div below; reader is `scrollToCard` in ForensicsBody.
// Exported as a selector so consumers don't repeat the magic string.
export const STICKY_SURFACE_SELECTOR = '[data-sticky-surface="forensics"]';

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
// but produced no specific rows / cells). Pre-S133f these chips were rendered
// alongside true localised chips in a single lane, claiming a localisation
// the minimap couldn't confirm. S133f routes them into a separate "Broadly
// flagged" lane so the §2 surface tells the truth about scope.
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
 * Boolean predicate — true when StickySurface should render at all
 * (i.e. there is at least one pill or chip to display, in any lane).
 * Caller branches on this to decide whether to mount StickySurface or
 * fall back to a clean-state §2 body.
 */
export function shouldRenderSticky(findings = []) {
  const { pills, localisedChips, fallbackChips } = pillsAndChips(findings);
  return pills.length > 0 || localisedChips.length > 0 || fallbackChips.length > 0;
}

export function StickySurface({
  findings, onActivateTest,
  activeRegionNumber = null,
  activeFinding = null,
  heatmapProps = null,
  dataExpanded = false,
  onToggleDataExpanded = null,
  cleanStateLead = null,
  cleanStateTail = null,
  // S163 virtualisation rework: passes the panel's scroll-driving
  // ref through. ForensicsBody owns the ref; chip-click writers call
  // its scrollToVisRow API to scroll the data table to the active
  // region. The panel-level minimaps inside FindingDetailPanel
  // attach their viewport-band coordination through a sibling ref
  // owned in FindingDetailPanel itself — that one stays panel-local.
  hotspotScrollRef = null,
}) {
  const { pills, localisedChips, fallbackChips } = pillsAndChips(findings);
  const hasAnyChip = pills.length > 0 || localisedChips.length > 0 || fallbackChips.length > 0;

  const toggleId = useId();
  const dataReady = !!heatmapProps;

  // S126b add-7b: rendered as a flat-top continuation of the
  // <Section flatBottom> sibling above. Same BG_ZONE bg + matching
  // radii on the abutting edge → visual reads as one card.
  // position:sticky here gives the surface enough vertical span to
  // pin past §3-§5 (sticky un-pins at parent's bottom edge; this
  // element's parent is the ForensicsBody Fragment / ReportView
  // outer div, which extends the whole report).
  return (
    <div data-sticky-surface="forensics" style={{
      position: "sticky",
      top: STICKY_TOP,
      zIndex: 20,
      background: C.BG_ZONE,
      borderRadius: `0 0 ${CR.LG} ${CR.LG}`,
      padding: "0 20px 16px 20px",
      marginBottom: "12px",
      // S163 fix-pass 2: hairline bottom border replaces the prior
      // drop-shadow. The shadow read as ambient haze; a hairline
      // reads as a clean "surface ends here" cue with less visual
      // weight against the BG_ZONE backdrop.
      borderBottom: `1px solid #E5E5E5`,
    }}>
      {/* S163 fix-pass 1: clean-state copy when no chips in any lane.
          Replaces the pre-fix-pass standalone Section card that wrapped
          this copy when severity = 0. The Data toggle below stays
          available so the user can inspect the raw table even on a
          clean fixture. */}
      {!hasAnyChip && cleanStateLead && (
        <div>
          <span style={{ ...MINIMAP_CALLOUT_TYPOGRAPHY, fontWeight: FW.SEMI }}>{cleanStateLead}</span>
          {cleanStateTail && <span style={MINIMAP_CALLOUT_TYPOGRAPHY}>{cleanStateTail}</span>}
        </div>
      )}
      {pills.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap",
          marginBottom: (localisedChips.length > 0 || fallbackChips.length > 0) ? "8px" : 0,
        }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>{LANE_LABELS.pills}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", flex: 1, minWidth: 0 }}>
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", flex: 1, minWidth: 0 }}>
            {localisedChips.map(f => (
              <FindingChip
                key={f.id}
                finding={f}
                onActivate={onActivateTest}
                isActive={f.regionNumber === activeRegionNumber}
              />
            ))}
          </div>
        </div>
      )}
      {/* S133f: fallback chips (region.cells.length === 0) — tests
          that fired severity > LOW but produced no specific rows.
          Routed out of the Localised lane so the surface doesn't
          claim a localisation that can't be drawn on a minimap. */}
      {fallbackChips.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap",
        }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>{LANE_LABELS.fallback}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", flex: 1, minWidth: 0 }}>
            {fallbackChips.map(f => (
              <FindingChip
                key={f.id}
                finding={f}
                onActivate={onActivateTest}
                isActive={f.regionNumber === activeRegionNumber}
              />
            ))}
          </div>
        </div>
      )}

      {/* S163 virtualisation rework: Data toggle renders for ALL
          fixtures including clean ones. The fix-pass-1 `hasAnyChip`
          gate retires — ExcerptTable's full-table semantic in
          compactMode now renders rows regardless of convergence
          state, so the clean-fixture empty-DOM bug is resolved at
          the source. */}
      {dataReady && (
        <button
          id={toggleId}
          onClick={() => onToggleDataExpanded?.()}
          aria-expanded={dataExpanded}
          aria-controls={`${toggleId}-block`}
          style={{
            marginTop: "10px",
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
          <span>Data table</span>
          <span style={{ fontSize: "10px" }}>{dataExpanded ? "▲" : "▼"}</span>
        </button>
      )}

      {/* Data block — vertical minimap + ExcerptTable side-by-side
          in compactMode. Mount is gated on the parent's
          dataExpanded state. Filtering of the minimap + cell
          highlights to the active region happens inside
          FindingDetailPanel based on the `finding` prop. */}
      {dataReady && dataExpanded && (
        <div id={`${toggleId}-block`}>
          <FindingDetailPanel
            finding={activeFinding}
            heatmapProps={heatmapProps}
            hotspotScrollRef={hotspotScrollRef}
          />
        </div>
      )}
    </div>
  );
}

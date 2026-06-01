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
import { C, CR, FS, FW, FF, SECTION_DIVIDER } from "../../constants/tokens.js";
import { MECHANISM_ORDER, TEST_MECHANISM } from "../../constants/mechanisms.js";
import { LANE_LABEL_TYPOGRAPHY, LANE_LABELS, MINIMAP_CALLOUT_TYPOGRAPHY } from "../shared/Section.jsx";
import { FindingPill } from "./FindingPill.jsx";
import { FindingChip } from "./FindingChip.jsx";
import { FindingDetailPanel, guidanceCaption } from "./FindingDetailPanel.jsx";

const STICKY_TOP = 0;

// Stable DOM marker so chip-click scroll handlers can read the sticky
// surface's measured height and offset their landing position. Writer
// is the outer div below; reader is `scrollToCard` in ForensicsBody.
// Exported as a selector so consumers don't repeat the magic string.
export const STICKY_SURFACE_SELECTOR = '[data-sticky-surface="forensics"]';

// Layout-only properties for the lane-label spans. Typography lives in
// LANE_LABEL_TYPOGRAPHY (Section.jsx). Spread both at each consumer site.
const LANE_LABEL_LAYOUT = { whiteSpace: "nowrap", flexShrink: 0 };

// Severity-descending sort, then canonical cluster + within-cluster card
// order as the within-tier tiebreaker — the MECHANISM_ORDER arrangement
// §2/§3 read in. S200: keyed on canonical position (dimension + the test's
// index in TEST_MECHANISM), NOT the display label, so retitling a card
// (DISPLAY_NAMES) never reorders the chip/pill lanes.
const SEV_RANK = { HIGH: 3, MOD: 2, LOW: 1 };
const sevRank = (sev) => SEV_RANK[sev] || 0;
const TEST_ORDER = Object.keys(TEST_MECHANISM);
const clusterIdx = (f) => {
  const i = MECHANISM_ORDER.indexOf(f.dimensions?.[0]);
  return i < 0 ? MECHANISM_ORDER.length : i;
};
const cardIdx = (f) => {
  const i = TEST_ORDER.indexOf(f.tests?.[0]?.testId);
  return i < 0 ? TEST_ORDER.length : i;
};
const compareCanonical = (a, b) => {
  const sr = sevRank(b.severity) - sevRank(a.severity);
  if (sr !== 0) return sr;
  const ci = clusterIdx(a) - clusterIdx(b);
  if (ci !== 0) return ci;
  return cardIdx(a) - cardIdx(b);
};

/**
 * Partition findings into pill (dataset-wide), localised-chip
 * (cell/row/column-local), and fallback-chip (unscoped) lanes. Each lane
 * sorted severity-descending then alphabetically within a tier (S126b
 * add-5).
 *
 * S163 B1: lane assignment reads the canonical `finding.locality` field
 * computed by classifyLocality (analysis/findings.js). Pre-B1 this routed
 * via a composite predicate (type/severity + region.cells.length) that
 * conflated column-only-by-design tests (Selective Noise Partitioning)
 * with verdict-vs-evidence mismatches (S126b add-8 fallback). Reading
 * locality resolves the conflation: column-local findings join the
 * Localised lane; only genuinely unscoped findings stay in fallback.
 */
export function pillsAndChips(findings = []) {
  const pills = [];
  const localisedChips = [];
  const fallbackChips = [];
  for (const f of findings) {
    if (f.locality === "dataset-wide") {
      pills.push(f);
    } else if (f.locality === "unscoped") {
      fallbackChips.push(f);
    } else {
      // cell-local | row-local | column-local
      localisedChips.push(f);
    }
  }
  pills.sort(compareCanonical);
  localisedChips.sort(compareCanonical);
  fallbackChips.sort(compareCanonical);
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
  // S163 B2b: selection state replaces the single-scalar
  // `activeRegionNumber`. Shape:
  //   { mode: 'all' | 'subset', selected: Set<regionNumber>, lastAdded }
  // - mode 'all'      → every finding contributes to the data-block
  //                     overlay; chips/pills all render in active style.
  // - mode 'subset'   → only `selected` contribute; chips/pills render
  //                     active iff their regionNumber is in `selected`.
  // - lastAdded       → drives panel chrome (caption + focus); null
  //                     in all-on default and empty subset.
  selection = { mode: 'all', selected: new Set(), lastAdded: null },
  onShowAll = null,
  onClearAll = null,
  activeFindings = null,    // computed by ForensicsBody from selection + findings
  focusFinding = null,      // last-added finding (drives panel chrome)
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

  // S163 B2b: chip/pill active predicate folded over selection state.
  //   mode 'all'    → every finding renders active.
  //   mode 'subset' → only findings in selection.selected.
  // Pills inherit the same predicate — dataset-wide pills participate
  // in Model B per B2b (their whole-table treatment composites with
  // localised fills in the data block).
  const isFindingActive = (f) => {
    if (f.regionNumber == null) return false;
    if (selection.mode === "all") return true;
    return selection.selected.has(f.regionNumber);
  };

  // S163 B2b W2: Show all / Clear all live alongside the lane chrome —
  // two PERSISTENT controls (not one context-switching button) so
  // direction can switch mid-investigation. Rendered only when there
  // is at least one finding to act on, and only when at least one
  // chip lane is mounted (no controls on the clean-state surface).
  // Disabled state matches the current mode so the affordance reads
  // as "you're already showing all" / "nothing to clear".
  const showAllDisabled = selection.mode === "all";
  const clearAllDisabled = selection.mode === "subset" && selection.selected.size === 0;
  const controlBtnStyle = (disabled) => ({
    background: "none",
    border: "none",
    padding: "2px 6px",
    fontSize: FS.sm,
    fontWeight: FW.NORM,
    fontFamily: FF.UI,
    color: disabled ? C.TEXT_3 : C.TEXT_2,
    cursor: disabled ? "default" : "pointer",
    textDecoration: disabled ? "none" : "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: "3px",
  });
  const selectionControls = hasAnyChip ? (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "8px",
      flexShrink: 0, marginLeft: "auto",
    }}>
      <button
        onClick={() => !showAllDisabled && onShowAll?.()}
        disabled={showAllDisabled}
        style={controlBtnStyle(showAllDisabled)}
      >Show all</button>
      <span style={{ color: C.TEXT_3, fontSize: FS.sm }}>·</span>
      <button
        onClick={() => !clearAllDisabled && onClearAll?.()}
        disabled={clearAllDisabled}
        style={controlBtnStyle(clearAllDisabled)}
      >Clear all</button>
    </div>
  ) : null;

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
      // S163 B2c F2: top padding lifted 0 → 12 px so the first
      // chip lane has clearance from the sticky surface's upper
      // edge. Pre-B2c the lane sat flush against the top of the
      // sticky box, and when the surface pinned to the viewport
      // top, chips touched the upper visual edge — crowded
      // against the §2 section header above (which now uses
      // `flatBottom` to abut the sticky's flat top).
      padding: "12px 20px 16px 20px",
      // S163 B2e E4 + B2f C3: marginBottom carries the breathing room
      // below the SECTION_DIVIDER rule on the §2 sticky bottom. B2e
      // lifted from 12 → 24 px so the divider has clear gap from §3
      // cards (the failure mode B2d's G4 missed — scrolled deeply
      // with §2 pinned, §3 cards bleed up to the §2 sticky bottom
      // with §3's SectionHeader rule no longer in view). B2f C3 adds
      // 5 px more (24 → 29 px) so the divider rule itself has a hint
      // of breathing room below it, separating its line from §3's
      // first content. Nick judged the divider clean at B2e; this is
      // a nicety to soften the line→content edge.
      marginBottom: "29px",
      // S163 B2e E4: section-break divider on the §2 sticky bottom.
      // Pre-B2e history:
      //   - pre-B2c: 1 px solid `#E5E5E5` literal — hairline.
      //   - B2c F3: 2 px solid C.BORDER — still read as hairline.
      //   - B2d G4: removed entirely; bet on §3 SectionHeader.
      //     Failed when scrolled past §3 header (§3 cards bleed up
      //     to flush against §2 sticky bottom).
      // Now: 3 px solid SECTION_DIVIDER.color (slate-500 / #64748B)
      // — a real section-break-weight rule defined as its own token
      // in tokens.js, not inlined. Always visible regardless of
      // scroll position because it lives on the sticky surface
      // itself. Pairs with the 24 px marginBottom above to keep §3
      // content from touching the divider.
      borderBottom: `${SECTION_DIVIDER.width} solid ${SECTION_DIVIDER.color}`,
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
              <FindingPill
                key={f.id}
                finding={f}
                onActivate={onActivateTest}
                // S163 B2b: pills participate in Model B alongside chips.
                // Active iff selection.mode === 'all' OR
                // selection.selected has the pill's regionNumber.
                isActive={isFindingActive(f)}
              />
            ))}
          </div>
          {/* S163 B2c F1: Show all / Clear all relocated off the
              lane chrome onto the Data table toggle row below.
              Selection controls drive the table overlay, so they
              belong with the table toggle, not the chip lanes. */}
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
                isActive={isFindingActive(f)}
              />
            ))}
          </div>
        </div>
      )}
      {/* S163 B1: fallback chips are findings with locality === "unscoped"
          — the test fired with severity > LOW but produced no per-row
          evidence to localise it. Routed separately from the Localised
          lane so the §2 surface doesn't claim a localisation it can't
          draw. */}
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
                isActive={isFindingActive(f)}
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
          the source.

          S163 B2c F1: Show all / Clear all live on this row, right-
          aligned. The controls drive the table overlay, so they
          belong with the table toggle. They render whether the
          table is expanded or collapsed (selection drives the chip
          rings too — useful even when the data block is folded). */}
      {dataReady && (
        <div style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          {/* S163 B2d G3: Data table toggle matches the §5 "Test
              battery details" expandable register — same font size
              (FS.base), weight (FW.MED), colour (C.TEXT), arrow on
              the LEFT with ▸/▾ glyphs. Pre-B2d this was a smaller
              FS.sm FW.NORM C.TEXT_2 toggle with the arrow on the
              right — visually subordinate to the chip lanes above.
              Matching §5 reads the toggle as a section-peer
              disclosure, which it is. */}
          <button
            id={toggleId}
            onClick={() => onToggleDataExpanded?.()}
            aria-expanded={dataExpanded}
            aria-controls={`${toggleId}-block`}
            style={{
              background: "none", border: "none",
              padding: 0,
              fontSize: FS.base,
              fontWeight: FW.MED,
              fontFamily: FF.UI,
              color: C.TEXT,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "4px",
            }}
          >
            <span>{dataExpanded ? "▾" : "▸"}</span>
            <span>Data table</span>
          </button>
          {selectionControls}
        </div>
      )}

      {/* S163 B2f C2: guidance caption renders OUTSIDE the max-height
          wrapper below — caption is chrome / status (names the active
          finding) and must persist when the data table is collapsed.
          Pre-B2f the caption lived inside FindingDetailPanel, folding
          with the data block; per B2f the collapse target is "table +
          minimap ONLY". Rendered only when focusFinding resolves to
          a caption string. Token: shared
          MINIMAP_CALLOUT_TYPOGRAPHY (same register the strip caption
          uses on the deep-look modal). */}
      {focusFinding && guidanceCaption(focusFinding) && (
        <div style={{
          ...MINIMAP_CALLOUT_TYPOGRAPHY,
          fontWeight: FW.NORM,
          lineHeight: 1.5,
          marginTop: "10px",
        }}>
          {guidanceCaption(focusFinding)}
        </div>
      )}

      {/* Data block — vertical minimap + ExcerptTable side-by-side in
          compactMode. S163 B2b W6: always mounted via a max-height
          transition rather than mount/unmount on dataExpanded. The
          old conditional mount caused position:sticky reflow jank on
          collapse (fix-pass A item 7 diagnosed-deferred). Wrapper
          owns the transition; FindingDetailPanel renders inside it
          unconditionally so the table + minimaps don't tear down /
          rebuild on every collapse cycle. */}
      {dataReady && (
        <div
          id={`${toggleId}-block`}
          aria-hidden={!dataExpanded}
          style={{
            maxHeight: dataExpanded ? "600px" : "0px",
            overflow: "hidden",
            // Pointer events go through to children only when
            // expanded; otherwise the collapsed panel can't capture
            // clicks meant for siblings below.
            pointerEvents: dataExpanded ? "auto" : "none",
            transition: "max-height 220ms ease",
          }}
        >
          <FindingDetailPanel
            activeFindings={activeFindings}
            focusFinding={focusFinding}
            selectionMode={selection.mode}
            heatmapProps={heatmapProps}
            hotspotScrollRef={hotspotScrollRef}
          />
        </div>
      )}
    </div>
  );
}

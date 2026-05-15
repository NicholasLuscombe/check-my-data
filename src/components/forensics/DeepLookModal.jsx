/* ── DeepLookModal — click-to-zoom modal for spatial findings (S126c-b) ──
   Spec §1.3 (modal opens) + §1.7 (interaction model) + §4.3 (modal
   inheritance — chip/pill clusters inside the modal lean confirmed).
   Contents top → bottom: pill cluster, chip cluster, full-resolution
   MinimapStrip, ExcerptTable. Compact pill+chip lane keeps inter-region
   navigation in-modal so the user doesn't have to dismiss to chip-hop.

   Trigger: click anywhere on the inline §2 MinimapStrip → modal opens
   pre-zoomed to the region nearest the click x-coordinate. The whole
   inline strip is the click target; region [N] badges remain visual
   anchors. Region selection inside the modal (chip / minimap badge)
   updates the focused region (re-zooms the modal's MinimapStrip +
   ExcerptTable) AND pulses the matching test card on the underlying
   page; the modal stays open. Modal dismiss (ESC / backdrop click /
   dedicated ✕ button) returns to the sticky surface, no state lost.

   Pulse model (S126b PulseProvider, shared bus):
     - Chip click in modal → trigger `chip:N` + `region:N` + every
       `card:<testId>`. Inline §2 chip [N], inline §2 minimap badge [N],
       modal-internal minimap badge [N], and the underlying page's test
       card all pulse together — the same shared bus as the inline path.
     - Pill click in modal → trigger `pill:<testId>` + `card:<testId>`.
       Underlying page scrolls to that test card via the
       `scrollToCardOutside` callback.

   Layout:
     - Backdrop (`position: fixed, inset: 0`, rgba(0,0,0,0.5) per spec
       §3 line 331). Click → onDismiss.
     - Card (white BG, CR.XL radius, padding, max-width 92vw,
       max-height 92vh, internal overflow). Click stops propagation
       so backdrop dismiss only fires on backdrop hits.
     - Compact pill row (Dataset-wide patterns lane).
     - Compact chip row (Localised patterns lane).
     - Full-resolution MinimapStrip (showRegionNumber=true so the
       inline-suppressed [N] prefix on chips re-shows in the modal —
       the modal IS the surface where the [N] reference makes sense).
     - ExcerptTable scoped to focused region via the new `region` prop.

   Sticky-scope guarantee: modal is rendered as a Fragment sibling at
   the ForensicsBody outer level. position:fixed takes it out of
   document flow → sticky's parent extent unchanged → S126b add-7b
   pin range preserved on dismiss. */

import { useEffect, useState, useMemo, useCallback } from "react";
import { C, FS, FW, FF, CR, SEV_VERDICT } from "../../constants/tokens.js";
import { MECHANISMS, GROUP_MARKERS, RANK_NUMS } from "../../constants/mechanisms.js";
import { LANE_LABEL_TYPOGRAPHY } from "../shared/Section.jsx";
import { MinimapStrip } from "./MinimapStrip.jsx";
import { ExcerptTable } from "./ExcerptTable.jsx";
import { FindingPill } from "./FindingPill.jsx";
import { FindingChip } from "./FindingChip.jsx";
import { pillsAndChips } from "./StickySurface.jsx";
import { usePulseTrigger } from "./pulseContext.jsx";

// Layout-only properties for the lane-label spans. Typography lives in
// LANE_LABEL_TYPOGRAPHY (Section.jsx). Spread both at each consumer site.
const LANE_LABEL_LAYOUT = { whiteSpace: "nowrap", flexShrink: 0 };

export function DeepLookModal({
  // Data props (threaded from ForensicsBody as a single `heatmapProps`
  // bundle, same shape ReportView uses for HotspotExcerptList and the
  // legacy heatmapProps consumers). DeepLookModal does no engine work
  // — it composes existing forensics components over the same
  // finding/convergence layer.
  heatmapProps,
  results, findings,
  // Modal-specific.
  initialRegionNumber,        // regionNumber selected by inline-strip click
  onDismiss,                  // ESC / backdrop / ✕ button
  scrollToCardOutside,        // (testId) → scrollIntoView on underlying page
}) {
  const {
    convergence, rawData, rowMap, colHeaders, visColIndices, dColMap,
    roles, coordCtx, condPerCol,
  } = heatmapProps || {};
  // Resolve focused region from regionNumber. State lives at this level
  // so chip / minimap-badge clicks inside the modal can hop between
  // regions without dismissing.
  const [focusedRegionNumber, setFocusedRegionNumber] = useState(initialRegionNumber);

  const trigger = usePulseTrigger();

  // Look up the finding (and its region object) for the focused regionNumber.
  const focusedFinding = useMemo(
    () => (findings || []).find(f => f.regionNumber === focusedRegionNumber) || null,
    [findings, focusedRegionNumber]
  );
  const focusedRegion = focusedFinding?.region || null;

  // Group marker map — derive from convergence.groups (DupDet exact-row
  // groups + ConstOffset offset pairs). Mirrors the WhereToLookSection
  // derivation; ExcerptTable consumes it via the optional `groupMarkerMap`
  // prop to render rank/marker tokens in the leading column.
  const groupMarkerMap = useMemo(() => {
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
  }, [convergence]);

  // ESC dismiss. Listener attaches/detaches with the modal's mount lifecycle.
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onDismiss?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  // Modal-side onActivate handler shared between pill / chip / minimap-badge
  // clicks. Three concerns:
  //   1) Pulse the shared bus for symmetry across inline + modal surfaces.
  //   2) Re-focus the modal's region (so MinimapStrip + ExcerptTable re-zoom).
  //   3) Scroll the underlying-page test card via scrollToCardOutside (modal
  //      stays open per spec §1.7 — chip-hop in modal, peek at underlying card).
  const onActivateInModal = useCallback((finding) => {
    if (!finding) return;
    const tests = finding.tests || [];
    const cardKeys = tests.map(t => `card:${t.testId}`);
    if (finding.type === "global") {
      // Pill case — no regionNumber.
      tests.forEach(t => trigger(`pill:${t.testId}`));
      trigger(...cardKeys);
    } else if (finding.regionNumber != null) {
      // Chip case — re-focus region + pulse chip + region + cards.
      setFocusedRegionNumber(finding.regionNumber);
      trigger(`chip:${finding.regionNumber}`, `region:${finding.regionNumber}`, ...cardKeys);
    } else {
      trigger(...cardKeys);
    }
    if (tests[0]) scrollToCardOutside?.(tests[0].testId);
  }, [trigger, scrollToCardOutside]);

  // Region badge click inside the modal's MinimapStrip — same activation
  // as a chip click on the same region. The badge handler in MinimapStrip
  // already fires `chip:N + region:N` triggers itself; this callback adds
  // the focus-update + underlying-card scroll without redundant pulses.
  const onActivateRegionInModal = useCallback((overlay) => {
    if (!overlay || overlay.regionNumber == null) return;
    const finding = (findings || []).find(f => f.regionNumber === overlay.regionNumber);
    if (!finding) return;
    setFocusedRegionNumber(overlay.regionNumber);
    const firstTestId = finding.tests?.[0]?.testId;
    if (firstTestId) scrollToCardOutside?.(firstTestId);
  }, [findings, scrollToCardOutside]);

  const { pills, localisedChips, fallbackChips } = pillsAndChips(findings || []);
  const nVisRows = rawData?.length || 0;

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.WHITE,
          borderRadius: CR.XL,
          padding: "20px 24px 24px 24px",
          maxWidth: "92vw",
          maxHeight: "92vh",
          width: "1100px",
          overflow: "auto",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          fontFamily: FF.UI,
          position: "relative",
        }}
      >
        {/* Dedicated dismiss button — top-right, mirrors LongFormatModal pattern. */}
        <button
          onClick={onDismiss}
          aria-label="Close deep-look"
          style={{
            position: "absolute", top: 12, right: 12,
            background: "none", border: "none",
            // Icon glyph — TYPOGRAPHY-SYSTEM.md §4.2 carve-out (icon-sizing
            // system is separate from text register). Hardcoded pending
            // that system's land; do NOT promote to text-register tokens.
            fontSize: "16px", fontWeight: FW.NORM,
            color: C.TEXT_3, cursor: "pointer",
            padding: "4px 8px", lineHeight: 1,
          }}
        >
          ✕
        </button>

        {/* Header — modal title + focused region context. */}
        <div style={{ marginBottom: 14, paddingRight: 32 }}>
          <div style={{ fontSize: FS.md, fontWeight: FW.SEMI, color: C.TEXT }}>
            Deep look
          </div>
          {focusedFinding && (
            <div style={{ fontSize: FS.sm, fontWeight: FW.NORM, color: C.TEXT_2, marginTop: 2 }}>
              Region [{focusedFinding.regionNumber}] —
              {" "}{focusedFinding.tests?.[0]?.displayName || MECHANISMS[focusedFinding.dimensions?.[0]]?.label || ""}
            </div>
          )}
        </div>

        {/* Pill cluster (Dataset-wide patterns) — compact lane, reuses
            FindingPill verbatim. Hidden when no global findings. */}
        {pills.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            flexWrap: "wrap",
            marginBottom: (localisedChips.length > 0 || fallbackChips.length > 0) ? 8 : 12,
          }}>
            <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>Dataset-wide patterns</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {pills.map(f => (
                <FindingPill key={f.id} finding={f} onActivate={onActivateInModal} />
              ))}
            </div>
          </div>
        )}

        {/* Chip cluster (Localised patterns) — compact lane, reuses
            FindingChip with `showRegionNumber=true` (spec §4.3 — the
            modal IS the surface where the [N] prefix has meaning since
            the modal-internal MinimapStrip carries the [N] anchors). */}
        {localisedChips.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            flexWrap: "wrap",
            marginBottom: fallbackChips.length > 0 ? 8 : 14,
          }}>
            <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>Localised patterns</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {localisedChips.map(f => (
                <FindingChip
                  key={f.id}
                  finding={f}
                  onActivate={onActivateInModal}
                  showRegionNumber={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* S133f: fallback chip lane — mirrors §2 sticky's three-lane shape
            so the modal stays consistent with the inline surface on scope
            honesty. region-number prefix still rendered (modal context). */}
        {fallbackChips.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            flexWrap: "wrap", marginBottom: 14,
          }}>
            <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>Patterns flagged broadly</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {fallbackChips.map(f => (
                <FindingChip
                  key={f.id}
                  finding={f}
                  onActivate={onActivateInModal}
                  showRegionNumber={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Full-resolution MinimapStrip — same component as inline §2.
            Shares the convergence + findings layer; PulseProvider
            connects badges across inline + modal instances. */}
        <MinimapStrip
          convergence={convergence}
          findings={findings}
          rowMap={rowMap}
          nVisRows={nVisRows}
          onActivateRegion={onActivateRegionInModal}
          caption={false}
        />

        {/* Excerpt table — scoped to focused region via `region` prop.
            Auto-scrolls to region.rowRange[0] on mount + on every
            region-prop change (S126c-b useEffect dep on `region`). */}
        <div style={{ marginTop: 16 }}>
          <ExcerptTable
            convergence={convergence}
            rawData={rawData}
            rowMap={rowMap}
            colHeaders={colHeaders}
            visColIndices={visColIndices}
            dColMap={dColMap}
            roles={roles}
            coordCtx={coordCtx}
            condPerCol={condPerCol}
            results={results}
            findings={findings}
            groupMarkerMap={groupMarkerMap}
            region={focusedRegion}
          />
        </div>
      </div>
    </div>
  );
}

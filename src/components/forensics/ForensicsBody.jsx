/* ── ForensicsBody — Forensics document branch §2 + §3 chrome ──
   Owns:
     - §2 WHAT WAS FOUND  — section header + sticky surface (StickySurface).
                            The sticky surface composes chip lanes + the
                            active-region FindingDetailPanel content as
                            one sticky element. Clean (no findings)
                            renders an "all checks passed" line in
                            place of the chip lanes.
     - §3 DETAILED TEST RESULTS — dimension-grouped cards via
                                   ForensicsCategoryBlock (severity-
                                   descending order + CLEAR collapse).

   Why a child component: needs `usePulseTrigger` from PulseProvider.
   ReportView wraps the Forensics return in <PulseProvider>, then renders
   <ForensicsBody …/> here so chips/pills/test-card badge clicks all
   share the same pulse bus.

   Click model:
     - chip click       → pulse(chip:N, region:N, card:<each>) + scroll
                          card + activate region (chip click sets
                          activeRegionNumber, which renders the panel
                          content inline inside StickySurface)
     - pill click       → pulse(pill:test, card:test) + scroll card
                          (no panel activation — writer scope is
                          localised chips only)
     - badge click on
       a test card      → pulse(card:test, pill or chip+region from
                          finding)
     - region [N] badge → pulse(region:N, chip:N) + onActivateRegion
                          (sets activeRegionNumber → panel re-renders
                          for the new region; badge lives on the
                          panel's internal MinimapStripVertical)

   S163 lifecycle: `activeRegionNumber` is the §2 state and drives both
   the panel content's inline mount inside StickySurface and the
   per-chip `showRegionNumber` derivation. Initial value null → panel
   content not auto-open on load.

   S163 Phase 3e (rework, A1.D3): single sticky surface composes chip
   lanes + active-region content. Pre-3e the panel had its own
   position:sticky chrome and rendered as a separate sibling beneath
   StickySurface; that produced two stacked sticky boundaries and a
   "two clicks to see the table" friction surface. Phase 3e folds the
   panel content back inside one sticky element. */

import { useMemo, useState, useCallback } from "react";
import { Section, MINIMAP_CALLOUT_TYPOGRAPHY } from "../shared/Section.jsx";
import { MECHANISM_ORDER, TEST_MECHANISM } from "../../constants/mechanisms.js";
import { CATEGORY_SHORT_DESCRIPTIONS } from "../../constants/descriptions.js";
import { C, FW } from "../../constants/tokens.js";
import { StickySurface, STICKY_SURFACE_SELECTOR, shouldRenderSticky } from "./StickySurface.jsx";
import { ForensicsCategoryBlock } from "./ForensicsCategoryBlock.jsx";
import { usePulseTrigger } from "./pulseContext.jsx";

// S150-fix1: clean-state copy renders as bold sentence-lead + body
// continuation, co-consuming MINIMAP_CALLOUT_TYPOGRAPHY. Body-prose
// register lifts the empty-state from sub-body 13px to FS.base 16px.
const CLEAN_STATE_LEAD = "All checks passed";
const CLEAN_STATE_TAIL = " — no patterns to flag.";

// Visual gap between the pinned sticky surface's bottom edge and the
// scrolled-into-view card title (px). Used by `scrollToCard` below.
const SCROLL_BREATHING_MARGIN = 8;

export function ForensicsBody({
  findings, results, catSummaries,
  expandedCats, toggleCat, ensureCatExpanded,
  expandedTestEvidence, setExpandedTestEvidence, ensureTestCardExpanded,
  importConfig, rowMap,
  // Dataset severity (0/1/2/3 from computeSeverity). Threaded through
  // for parity with sibling chrome — not consumed by §2 / §3 today.
  severity,
  // Full heatmap data bundle from ReportView. Same shape ReportView
  // builds for HotspotExcerptList — `{ convergence, rawData, rowMap,
  // colHeaders, visColIndices, dColMap, roles, coordCtx, condPerCol,
  // findings }`. Passed through to FindingDetailPanel so the panel can
  // mount MinimapStripVertical + ExcerptTable when Show data is open.
  heatmapProps = null,
}) {
  const trigger = usePulseTrigger();

  // Quick test-id → finding lookup for badge-click pulse routing.
  const testToFinding = useMemo(() => {
    const m = new Map();
    for (const f of findings) {
      for (const t of f.tests || []) m.set(t.testId, f);
    }
    return m;
  }, [findings]);

  const stickyVisible = shouldRenderSticky(findings);

  // Scroll-to-card via the data-test-id attribute that ForensicsTestCard
  // sets. CSS.escape handles test-id strings that contain spaces / parens
  // / quotes. The arithmetic offsets the landing position past the §2
  // sticky surface — its offsetHeight tracks the full surface
  // composition (chip lanes plus, when a region is active, the inline
  // FindingDetailPanel content). When no sticky surface is mounted
  // (severity 0 path), height falls through to 0 and the card lands
  // BREATHING_MARGIN below viewport top.
  const scrollToCard = useCallback((testId) => {
    if (typeof document === "undefined" || !testId) return;
    const sel = `[data-test-id="${(typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(testId) : testId.replace(/"/g, '\\"')}"]`;
    const el = document.querySelector(sel);
    if (!el) return;
    const stickyEl = document.querySelector(STICKY_SURFACE_SELECTOR);
    const stickyHeight = stickyEl ? stickyEl.offsetHeight : 0;
    const elTop = el.getBoundingClientRect().top;
    const target = window.scrollY + elTop - stickyHeight - SCROLL_BREATHING_MARGIN;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, []);

  // Active-region state. `activeRegionNumber` non-null →
  // FindingDetailPanel mounts (and sticky-pins to viewport top during
  // §3 scroll) focused on that region; every chip whose finding shares
  // the regionNumber lights up with the [N] prefix. Writers: chip
  // click via `onActivateTest` below; panel-internal MinimapStripVertical
  // [N] badge via `onActivateRegion` below. Reader: the panel mount +
  // the activeRegionNumber prop threaded into StickySurface for per-chip
  // showRegionNumber derivation. Initial value null → panel does not
  // auto-open on first load.
  const [activeRegionNumber, setActiveRegionNumber] = useState(null);

  // Sticky-surface activation. Receives the full finding so multi-test
  // chips can expand every relevant test card (and all touched
  // dimensions). For pills + single-test chips this collapses to the
  // single-card / single-dim case.
  //
  // S126b add-4: ensure the parent dimension wrapper is expanded
  //              (otherwise the test card isn't even in the DOM).
  // S126b add-6: also ensure the specific test card body is expanded
  //              (otherwise the user lands on a collapsed card and
  //              has to click again to see content).
  // Double-rAF defers the scroll until after React commits both
  // expansion-state writes and the browser paints the new layout —
  // otherwise scrollIntoView lands on the pre-expansion position.
  // Pulse animation is fired by the chip/pill itself via PulseProvider;
  // it lands on the card the first time the card mounts (or replays if
  // already mounted).
  //
  // Localised chips (finding.regionNumber non-null) also set the active
  // region. FindingDetailPanel mounts below the chip lanes and
  // sticky-pins to viewport top; every chip whose finding shares the
  // active region lights up with the [N] prefix.
  const onActivateTest = useCallback((finding) => {
    if (!finding) return;
    const tests = finding.tests || [];
    if (!tests.length) return;
    // Expand every dimension touched by this finding (multi-test chips
    // may span multiple dimensions in a future aggregator merge; today
    // each test maps to one dimension).
    if (ensureCatExpanded) {
      const dims = new Set();
      for (const t of tests) {
        const dim = TEST_MECHANISM[t.testId];
        if (dim) dims.add(dim);
      }
      for (const dim of dims) ensureCatExpanded(dim);
    }
    // Expand every relevant test card body.
    if (ensureTestCardExpanded) {
      for (const t of tests) ensureTestCardExpanded(t.testId);
    }
    // Activate the panel for localised findings. Dataset-wide findings
    // (pills) carry no regionNumber and leave activeRegionNumber alone
    // — Phase 3b does not open the panel for global findings yet.
    if (finding.regionNumber != null) {
      setActiveRegionNumber(finding.regionNumber);
    }
    // Scroll to the first test card. Double-rAF waits for both expand
    // commits + browser paint before reading layout geometry.
    const firstTestId = tests[0].testId;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToCard(firstTestId)));
    } else {
      scrollToCard(firstTestId);
    }
  }, [scrollToCard, ensureCatExpanded, ensureTestCardExpanded]);

  // Test-card severity-badge click. Routes the pulse back to the
  // finding's pill (global) or chip+region overlay (localised). The
  // panel-internal MinimapStripVertical's RegionBadge listens on
  // `region:N` so badge → chip → region pulse symmetry covers the
  // panel minimap too.
  const onCardBadgeClick = useCallback((result) => {
    const f = testToFinding.get(result.name);
    const keys = [`card:${result.name}`];
    if (f) {
      if (f.type === "global") keys.push(`pill:${result.name}`);
      else if (f.regionNumber != null) keys.push(`chip:${f.regionNumber}`, `region:${f.regionNumber}`);
    }
    trigger(...keys);
  }, [testToFinding, trigger]);

  // Region-badge click handler. Receives the overlay descriptor
  // `{ regionNumber, severity, visRowStart, visRowEnd, tests }`
  // computed by the panel-internal MinimapStripVertical from the
  // focused finding. Sets active-region state → panel re-mounts for
  // that region. The chip:N + region:N pulse triggers are fired by
  // MinimapStripVertical itself so this callback is purely the
  // activate dispatch.
  const onActivateRegion = useCallback((overlay) => {
    if (!overlay || overlay.regionNumber == null) return;
    setActiveRegionNumber(overlay.regionNumber);
  }, []);

  // Panel ✕ button writer. Clears active-region state → panel unmounts;
  // chips revert to no-[N] state.
  const onClosePanel = useCallback(() => setActiveRegionNumber(null), []);

  // S163 Phase 3b: derive the active finding from activeRegionNumber.
  // The lookup matches against finding.regionNumber (localised findings
  // only); when activeRegionNumber is null, activeFinding is null too,
  // and FindingDetailPanel renders nothing.
  const activeFinding = useMemo(() => {
    if (activeRegionNumber == null) return null;
    return findings.find(f => f.regionNumber === activeRegionNumber) || null;
  }, [findings, activeRegionNumber]);

  const catDescs = CATEGORY_SHORT_DESCRIPTIONS;

  return (
    <>
      {/* §2 WHAT WAS FOUND — two DOM elements that merge visually
          into one §2 surface. Section header in its own flat-bottom
          wrapper; StickySurface as a flat-top continuation, sticky-
          pinned to viewport top during §3 scroll. StickySurface owns
          the inline FindingDetailPanel mount internally — chip lanes
          and active-region content share one sticky element. Both
          DOM elements are Fragment siblings of §3-§5 so the sticky
          surface's pin range spans the whole report (sticky un-pins
          at its parent's bottom edge; the parent is the ForensicsBody
          Fragment / ReportView outer wrapper).

          Clean state (no findings): no sticky surface — §2 renders as
          a normal Section card with the clean-state copy inside (full
          radii, full marginBottom). */}
      {stickyVisible
        ? <>
            <Section number={2} title="What was found" flatBottom />
            <StickySurface
              findings={findings}
              onActivateTest={onActivateTest}
              activeRegionNumber={activeRegionNumber}
              activeFinding={activeFinding}
              onClosePanel={onClosePanel}
              heatmapProps={heatmapProps}
              onActivateRegion={onActivateRegion}
            />
          </>
        : <Section number={2} title="What was found">
            <div>
              <span style={{ ...MINIMAP_CALLOUT_TYPOGRAPHY, fontWeight: FW.SEMI }}>{CLEAN_STATE_LEAD}</span>
              <span style={MINIMAP_CALLOUT_TYPOGRAPHY}>{CLEAN_STATE_TAIL}</span>
            </div>
          </Section>
      }

      {/* §3 DETAILED TEST RESULTS — dimension cards */}
      <Section number={3} title="Detailed test results">
        {MECHANISM_ORDER.map((mk, idx) => {
          const cat = catSummaries.find(c => c.mk === mk);
          if (!cat) return null;
          const { group, flagged, applicable, isFlagged } = cat;
          return (
            <div key={mk}>
              {idx > 0 && <div style={{borderTop:`1px solid ${C.BORDER_L}`, margin:"8px 0"}}/>}
              <ForensicsCategoryBlock mk={mk}
                label={group.label}
                isFlagged={isFlagged}
                hasHigh={flagged.length > 0}
                description={catDescs[mk]}
                testResults={applicable}
                isExpanded={expandedCats[mk]} onToggle={()=>toggleCat(mk)}
                expandedTestEvidence={expandedTestEvidence}
                onToggleTestEvidence={(name, defaultOpen)=>setExpandedTestEvidence(prev=>{
                  const cur = name in prev ? prev[name] : defaultOpen;
                  return { ...prev, [name]: !cur };
                })}
                importConfig={importConfig} rowMap={rowMap}
                onCardBadgeClick={onCardBadgeClick}
              />
            </div>
          );
        })}
      </Section>

    </>
  );
}

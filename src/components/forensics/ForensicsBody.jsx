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
   panel content back inside one sticky element.

   S163 fix-pass 1: chrome retirements + permanent Data disclosure.
   Chip [N] prefix, status row, header row, ✕ button all retire;
   chips ring when active and re-clicking the active chip deactivates
   it (toggle). The Data ▼/▲ toggle becomes a permanent affordance
   at the sticky-surface level, independent of activeRegionNumber.
   First chip click in session auto-expands the data block; user
   toggle persists thereafter (no re-auto-expand on subsequent
   chip clicks). */

import { useMemo, useState, useRef, useCallback } from "react";
import { Section } from "../shared/Section.jsx";
import { MECHANISM_ORDER, TEST_MECHANISM } from "../../constants/mechanisms.js";
import { CATEGORY_SHORT_DESCRIPTIONS } from "../../constants/descriptions.js";
import { C } from "../../constants/tokens.js";
import { StickySurface, STICKY_SURFACE_SELECTOR } from "./StickySurface.jsx";
import { ForensicsCategoryBlock } from "./ForensicsCategoryBlock.jsx";
import { usePulseTrigger } from "./pulseContext.jsx";

// S150-fix1: clean-state copy renders as bold sentence-lead + body
// continuation. Threaded through to StickySurface where it renders
// above the Data toggle when no chips exist in any lane (S163
// fix-pass 1 promoted clean-state rendering into the sticky surface
// so the Data toggle is always available).
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
  // FindingDetailPanel filters the §2 data block to that region (the
  // vertical minimap filters to the active finding's tests; the table
  // scrolls to region and tints cells per buildHighlightSpec); the
  // matching chip in StickySurface rings via its isActive prop.
  // Writers: chip click via `onActivateTest` below (sets, or toggles
  // back to null when re-clicking the active chip); panel-internal
  // MinimapStripVertical [N] badge via `onActivateRegion` below.
  // Initial value null → no active chip, aggregated minimap view.
  const [activeRegionNumber, setActiveRegionNumber] = useState(null);

  // S163 fix-pass 1: data-disclosure state. `dataExpanded` controls
  // whether the §2 sticky surface renders the inline data block
  // (vertical minimap + ExcerptTable). Independent of
  // activeRegionNumber — the user can inspect the raw table even
  // without an active chip. First chip click in session auto-expands
  // via the hasAutoExpanded ref; subsequent chip clicks do not.
  // User-toggle clicks on the Data ▼/▲ affordance flip the state
  // and do not affect hasAutoExpanded (so an explicit collapse stays
  // collapsed across later chip clicks).
  const [dataExpanded, setDataExpanded] = useState(false);
  const hasAutoExpanded = useRef(false);

  const onToggleDataExpanded = useCallback(() => {
    setDataExpanded(v => !v);
  }, []);

  // S163 fix-pass 2: scrubber window state. Both axes are owned here
  // so chip-click writers can snap the window to centre the active
  // region. windowRowSize / windowColSize are constants tuned to the
  // data block's bounded height + cell metrics; the *Start values are
  // the navigable state. Manual scrubber drags on either minimap
  // call the corresponding writer.
  const WINDOW_ROW_SIZE = 10;
  const WINDOW_COL_SIZE = 8;
  const [windowRowStart, setWindowRowStart] = useState(0);
  const [windowColStart, setWindowColStart] = useState(0);
  const onWindowRowChange = useCallback((start) => setWindowRowStart(start), []);
  const onWindowColChange = useCallback((start) => setWindowColStart(start), []);

  // Map a matRow → visRow via rowMap, with identity fallback.
  const visRowOf = useCallback((matRow) => {
    const rm = heatmapProps?.rowMap;
    if (!rm) return matRow;
    return rm[matRow] ?? matRow;
  }, [heatmapProps]);

  // Map a matCol → visCol by linear scan over visColIndices.
  const visColOf = useCallback((matCol) => {
    const ids = heatmapProps?.visColIndices;
    if (!ids) return matCol;
    const i = ids.indexOf(matCol);
    return i === -1 ? null : i;
  }, [heatmapProps]);

  // Centre the window on a centre row/col, clamped to the dataset
  // bounds. Called from chip-click activation when a region is
  // selected.
  const snapWindowToRegion = useCallback((region) => {
    if (!region) return;
    const nVisRows = heatmapProps?.rawData?.length || 0;
    const nVisCols = heatmapProps?.visColIndices?.length || 0;
    // Row snap — midpoint of rowRange in vis-row space.
    if (region.rowRange && Array.isArray(region.rowRange) && region.rowRange.length === 2) {
      const visStart = visRowOf(region.rowRange[0]);
      const visEnd = visRowOf(region.rowRange[1]);
      if (Number.isFinite(visStart) && Number.isFinite(visEnd)) {
        const centre = (visStart + visEnd) / 2;
        let rowStart = Math.floor(centre - WINDOW_ROW_SIZE / 2);
        const maxRowStart = Math.max(0, nVisRows - WINDOW_ROW_SIZE);
        rowStart = Math.max(0, Math.min(maxRowStart, rowStart));
        setWindowRowStart(rowStart);
      }
    }
    // Col snap — midpoint of cell mat-cols in vis-col space. Only
    // when region.cells carries per-cell coordinates; fallback chips
    // (empty cells) leave windowColStart untouched.
    if (region.cells && region.cells.length > 0) {
      let minVis = Infinity;
      let maxVis = -Infinity;
      for (const [, mc] of region.cells) {
        const v = visColOf(mc);
        if (v == null) continue;
        if (v < minVis) minVis = v;
        if (v > maxVis) maxVis = v;
      }
      if (Number.isFinite(minVis) && Number.isFinite(maxVis)) {
        // Subtract the leading frozen-column count so windowColStart
        // is relative to the data-column range (matches what the
        // horizontal minimap and ExcerptTable's compactMode slicing
        // use as their axis).
        const ids = heatmapProps?.visColIndices || [];
        const roles = heatmapProps?.roles || [];
        let nFrz = 0;
        while (nFrz < ids.length && roles[ids[nFrz]] !== "data") nFrz++;
        const centre = (minVis + maxVis) / 2 - nFrz;
        let colStart = Math.floor(centre - WINDOW_COL_SIZE / 2);
        const nDataCols = Math.max(0, nVisCols - nFrz);
        const maxColStart = Math.max(0, nDataCols - WINDOW_COL_SIZE);
        colStart = Math.max(0, Math.min(maxColStart, colStart));
        setWindowColStart(colStart);
      }
    }
  }, [heatmapProps, visRowOf, visColOf]);

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
  // Chip / pill activation. Two paths through the state machine:
  //   - Localised chip click on an INACTIVE chip → set activeRegionNumber,
  //     expand dimension + card, auto-expand data block on first chip
  //     click in session, scroll to first test card.
  //   - Localised chip click on the CURRENTLY ACTIVE chip → write
  //     activeRegionNumber back to null (toggle off). No re-scroll, no
  //     auto-expand re-fire. The chip ring clears; the data block's
  //     minimap unfilters and the table scrolls to row 1 unhighlighted.
  //   - Pill click (no regionNumber) → expand dimension + card, scroll
  //     to card; activeRegionNumber stays as-is (pills are not panel
  //     writers).
  //
  // S163 fix-pass 1: auto-expand on first chip click. hasAutoExpanded
  // ref guards against re-firing — once the data block opens on first
  // click, the user owns the disclosure state from there.
  const onActivateTest = useCallback((finding) => {
    if (!finding) return;
    const tests = finding.tests || [];
    if (!tests.length) return;
    // Toggle-off branch: re-clicking the currently active chip
    // deactivates. No card scroll, no auto-expand re-fire.
    if (finding.regionNumber != null && finding.regionNumber === activeRegionNumber) {
      setActiveRegionNumber(null);
      return;
    }
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
    // (pills) carry no regionNumber and leave activeRegionNumber alone.
    if (finding.regionNumber != null) {
      setActiveRegionNumber(finding.regionNumber);
      // First chip click in session — auto-expand the data block.
      // hasAutoExpanded gates re-fire so explicit collapse stays
      // collapsed across later chip clicks.
      if (!hasAutoExpanded.current) {
        hasAutoExpanded.current = true;
        setDataExpanded(true);
      }
      // S163 fix-pass 2: snap the scrubber window to centre the
      // active region. Row snap always fires (rowRange is reliable);
      // column snap fires only when region.cells carry per-cell
      // coordinates. Toggle-deactivate (re-click active chip) above
      // exits early so the window stays where the user scrubbed to.
      snapWindowToRegion(finding.region);
    }
    // Scroll to the first test card. Double-rAF waits for both expand
    // commits + browser paint before reading layout geometry.
    const firstTestId = tests[0].testId;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToCard(firstTestId)));
    } else {
      scrollToCard(firstTestId);
    }
  }, [scrollToCard, ensureCatExpanded, ensureTestCardExpanded, activeRegionNumber, snapWindowToRegion]);

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
  // focused finding. Sets active-region state → the §2 data block
  // re-filters for that region. The chip:N + region:N pulse triggers
  // are fired by MinimapStripVertical itself so this callback is
  // purely the activate dispatch.
  const onActivateRegion = useCallback((overlay) => {
    if (!overlay || overlay.regionNumber == null) return;
    setActiveRegionNumber(overlay.regionNumber);
  }, []);

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
          the lane render, the Data toggle, and (when expanded) the
          active-region data block. Both DOM elements are Fragment
          siblings of §3-§5 so the sticky surface's pin range spans
          the whole report (sticky un-pins at its parent's bottom
          edge; the parent is the ForensicsBody Fragment / ReportView
          outer wrapper).

          S163 fix-pass 1: StickySurface always renders in Forensics
          mode, even when the dataset is fully clean. The Data toggle
          is a permanent affordance — clean fixtures still let the
          user inspect the raw table. Clean-state copy ("All checks
          passed — no patterns to flag.") lives inside StickySurface
          above the Data toggle when no chips exist. */}
      <Section number={2} title="What was found" flatBottom />
      <StickySurface
        findings={findings}
        onActivateTest={onActivateTest}
        activeRegionNumber={activeRegionNumber}
        activeFinding={activeFinding}
        heatmapProps={heatmapProps}
        onActivateRegion={onActivateRegion}
        dataExpanded={dataExpanded}
        onToggleDataExpanded={onToggleDataExpanded}
        cleanStateLead={CLEAN_STATE_LEAD}
        cleanStateTail={CLEAN_STATE_TAIL}
        windowRowStart={windowRowStart}
        windowRowSize={WINDOW_ROW_SIZE}
        onWindowRowChange={onWindowRowChange}
        windowColStart={windowColStart}
        windowColSize={WINDOW_COL_SIZE}
        onWindowColChange={onWindowColChange}
      />

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

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

   S163 lifecycle: `activeRegionNumber` is the §2 state and drives
   per-chip `isActive` (ring colour) in StickySurface plus the
   filter on the panel's minimaps + cell tints. Initial value
   null → no chip active on first load.

   S163 fix-pass 1: chrome retirements + permanent Data disclosure.
   Chip [N] prefix, status row, header row, ✕ button all retire;
   chips ring when active and re-clicking the active chip
   deactivates it (toggle). The Data ▼/▲ toggle becomes a permanent
   affordance at the sticky-surface level, independent of
   activeRegionNumber. First chip click in session auto-expands the
   data block; user toggle persists thereafter (no re-auto-expand on
   subsequent chip clicks).

   S163 virtualisation rework: ExcerptTable in compactMode now emits
   the full data table and ScrollTable's existing hand-rolled
   virtualisation (ROW_H=28, VIRT_THRESHOLD=500) handles large
   datasets. Panel-level minimaps flipped from window-slicer
   scrubbers to scroll-position viewport-band indicators. Chip
   click scrolls the table to the active region via the imperative
   scrollToVisRow API exposed through hotspotScrollRef.
   Toggle-deactivate (re-click active chip) preserves the user's
   current scroll position; only the chip ring clears. */

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

  // S163 B2b: Model B multi-select selection state.
  //   mode: 'all' | 'subset'
  //     - 'all'    — every finding contributes to the data-block
  //                  overlay; chips / pills all render in active style.
  //                  This is the panel-expand default ("show me
  //                  everything").
  //     - 'subset' — only `selected` contribute; `selected` may be
  //                  empty (nothing highlighted; panel stays mounted).
  //   selected: Set<regionNumber> — populated only in 'subset' mode.
  //   lastAdded: regionNumber | null — drives panel chrome (caption
  //                  + focus) and the scroll-on-add path.
  //
  // Transitions:
  //   First click while mode === 'all'        → ISOLATE: subset = {clicked}.
  //   Click while mode === 'subset', not in   → ADD: add to subset.
  //   Click while mode === 'subset',     in   → REMOVE: drop from subset.
  //   Show all                                → mode 'all',  selected.clear().
  //   Clear all                               → mode 'subset', selected.clear().
  //
  // Writer: `onActivateTest` below for chip / pill clicks; `onShowAll`
  // / `onClearAll` for the StickySurface controls.
  const [selection, setSelection] = useState({
    mode: "all",
    selected: new Set(),
    lastAdded: null,
  });

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

  // S163 virtualisation rework: scroll-to-region via the table's
  // imperative scroll API. The fix-pass-2 windowed-state machinery
  // (WINDOW_ROW_SIZE / WINDOW_COL_SIZE constants, windowRowStart /
  // windowColStart state, scrubber-based snap) retires. The
  // FindingDetailPanel's ExcerptTable mounts with a shared
  // hotspotScrollRef whose `scrollToVisRow(row)` writes scrollTop on
  // the scroll container; ScrollTable's existing __scrollToRow
  // handles the virtualised case (above 500 rows) by computing the
  // target spacer offset rather than looking up a DOM ref.
  //
  // Toggle-deactivate (re-click active chip → setActiveRegionNumber
  // null) exits BEFORE the scroll-to-region call, so the user's
  // current scroll position survives the deactivation.
  const hotspotScrollRef = useRef(null);

  // Map a matRow → visRow via rowMap, with identity fallback.
  const visRowOf = useCallback((matRow) => {
    const rm = heatmapProps?.rowMap;
    if (!rm) return matRow;
    return rm[matRow] ?? matRow;
  }, [heatmapProps]);

  // Scroll the §2 data table to centre the active region's row
  // range. Called from chip-click activation. region.rowRange is in
  // matrix-row space; map through rowMap to vis-row space and pick
  // the midpoint of the range.
  const scrollToRegion = useCallback((region) => {
    const scrollApi = hotspotScrollRef.current;
    if (!scrollApi || !region) return;
    if (!region.rowRange || !Array.isArray(region.rowRange) || region.rowRange.length !== 2) return;
    const visStart = visRowOf(region.rowRange[0]);
    const visEnd = visRowOf(region.rowRange[1]);
    if (!Number.isFinite(visStart) || !Number.isFinite(visEnd)) return;
    const centre = Math.round((visStart + visEnd) / 2);
    scrollApi.scrollToVisRow?.(centre);
  }, [visRowOf]);

  // Sticky-surface activation under S163 B2b Model B multi-select.
  //
  // State transitions on a chip / pill click (let N = clicked
  // finding's regionNumber):
  //   - mode 'all'     → ISOLATE: subset = {N}, lastAdded = N.
  //                       (First click out of the all-on default
  //                        narrows attention to the clicked finding.)
  //   - mode 'subset':
  //       - selected.has(N)   → REMOVE: subset \ {N}, lastAdded
  //                              becomes the next-most-recent active
  //                              finding (or null when subset emptied).
  //                              NO scroll; the user is narrowing, not
  //                              opening, attention.
  //       - !selected.has(N)  → ADD: subset ∪ {N}, lastAdded = N.
  //                              Scrolls §3 to that finding's card.
  //
  // First chip / pill click in session also auto-expands the data
  // block (hasAutoExpanded guards against re-fire so an explicit
  // collapse holds across later activations). Dimension + test-card
  // expand still fires on every activate path so the §3 card is ready
  // when §3 scrolls to it.
  const onActivateTest = useCallback((finding) => {
    if (!finding) return;
    const tests = finding.tests || [];
    if (!tests.length) return;
    if (finding.regionNumber == null) return;
    const N = finding.regionNumber;

    // Compute whether this click is an ADD (vs REMOVE). REMOVE = mode
    // 'subset' AND the finding was already in selection. Everything
    // else is an ADD (including the all-on → isolate transition).
    const isRemove = selection.mode === "subset" && selection.selected.has(N);

    // State update via functional setter so concurrent updates compose.
    setSelection(prev => {
      if (prev.mode === "all") {
        // ISOLATE.
        return { mode: "subset", selected: new Set([N]), lastAdded: N };
      }
      const next = new Set(prev.selected);
      if (next.has(N)) {
        // REMOVE.
        next.delete(N);
        // Demote lastAdded if it was this finding — pick any remaining
        // active finding (Set iteration order is insertion order in
        // modern JS; pop returns the most recent). lastAdded = null
        // when the subset emptied.
        const newLastAdded = (prev.lastAdded === N)
          ? (next.size ? [...next].pop() : null)
          : prev.lastAdded;
        return { mode: "subset", selected: next, lastAdded: newLastAdded };
      }
      // ADD.
      next.add(N);
      return { mode: "subset", selected: next, lastAdded: N };
    });

    // REMOVE branch exits before card expand + scroll. Removing a
    // chip narrows focus — no need to re-target §3 or open card
    // bodies the user already had open.
    if (isRemove) return;

    // Expand every dimension touched by this finding (multi-test
    // chips may span multiple dimensions in a future aggregator
    // merge; today each test maps to one dimension).
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
    // First activation in session — auto-expand the data block.
    if (!hasAutoExpanded.current) {
      hasAutoExpanded.current = true;
      setDataExpanded(true);
    }
    // Scroll the data table to centre the added finding's rowRange
    // (no-op for findings without rowRange — dataset-wide / column-
    // local). Deferred via rAF so dataExpanded has committed.
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => scrollToRegion(finding.region));
    } else {
      scrollToRegion(finding.region);
    }
    // Scroll §3 to the added finding's first test card. Double-rAF
    // waits for both expand commits + browser paint.
    const firstTestId = tests[0].testId;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToCard(firstTestId)));
    } else {
      scrollToCard(firstTestId);
    }
  }, [scrollToCard, ensureCatExpanded, ensureTestCardExpanded, selection, scrollToRegion]);

  // S163 B2b W2: Show all / Clear all writers.
  // Show all  → mode 'all',    selected cleared, lastAdded null
  //             (no specific focus when everything is showing).
  // Clear all → mode 'subset', selected cleared, lastAdded null.
  const onShowAll  = useCallback(() => {
    setSelection({ mode: "all",    selected: new Set(), lastAdded: null });
  }, []);
  const onClearAll = useCallback(() => {
    setSelection({ mode: "subset", selected: new Set(), lastAdded: null });
  }, []);

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

  // S163 B2b: derive `activeFindings` (array) and `focusFinding`
  // (single, the last-added) from selection state. `activeFindings`
  // drives the data-block compositing in FindingDetailPanel /
  // ExcerptTable; `focusFinding` drives the panel chrome (caption,
  // per-test specialised builder key, auto-scroll target on add).
  const activeFindings = useMemo(() => {
    if (selection.mode === "all") return findings;
    if (!selection.selected.size) return [];
    return findings.filter(f => f.regionNumber != null && selection.selected.has(f.regionNumber));
  }, [findings, selection]);

  const focusFinding = useMemo(() => {
    if (selection.lastAdded == null) return null;
    return findings.find(f => f.regionNumber === selection.lastAdded) || null;
  }, [findings, selection.lastAdded]);

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
        selection={selection}
        onShowAll={onShowAll}
        onClearAll={onClearAll}
        activeFindings={activeFindings}
        focusFinding={focusFinding}
        heatmapProps={heatmapProps}
        dataExpanded={dataExpanded}
        onToggleDataExpanded={onToggleDataExpanded}
        cleanStateLead={CLEAN_STATE_LEAD}
        cleanStateTail={CLEAN_STATE_TAIL}
        hotspotScrollRef={hotspotScrollRef}
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

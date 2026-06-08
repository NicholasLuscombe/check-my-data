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

   Why a child component: its descendant chips and pills read the pulse
   bus from PulseProvider. ReportView wraps the Forensics return in
   <PulseProvider>, then renders <ForensicsBody …/> here so those
   descendants all share the same bus.

   Click model:
     - chip click       → pulse(chip:N, region:N, card:<each>) + scroll
                          card + activate region (chip click sets
                          activeRegionNumber, which renders the panel
                          content inline inside StickySurface)
     - pill click       → pulse(pill:test, card:test) + scroll card
                          (no panel activation — writer scope is
                          localised chips only)

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

  // S163 B2e E2: selection state — click always toggles. The B2b
  // Model B isolate-on-first-click special case retires: it was
  // inconsistent ("3 on, click one" isolated, "2 on, click one"
  // deselected — same gesture, opposite result, depending on a
  // count the user wasn't tracking). Click now always toggles the
  // clicked finding (active → inactive, inactive → active);
  // default panel-expand state stays all-on (every finding active),
  // only the meaning of the first click changes — it now peels one
  // off, instead of isolating to one.
  //
  // Representation: a single Set of active regionNumbers, plus
  // lastAdded (which drives panel chrome + scroll-on-add). The
  // mode='all' / 'subset' distinction is DERIVED from the Set size
  // vs the universe of finding ids — kept as a derived value
  // (`selectionMode` below) for the G1 default-all-on early-return
  // in FindingDetailPanel and for dimUncovered. Primary state stops
  // tracking mode explicitly.
  //
  // Sentinel: `selection === null` means "uninitialized" — treat as
  // all-on without allocating a Set. This protects the G1 default-
  // all-on early-return on initial render (and on any later reset
  // via Show all, which DOES allocate a Set covering all ids — that
  // path also resolves to mode='all' via the size comparison).
  const allFindingIds = useMemo(() => {
    const s = new Set();
    for (const f of findings) if (f.regionNumber != null) s.add(f.regionNumber);
    return s;
  }, [findings]);

  const [selection, setSelection] = useState(null);
  // Derived: the active Set. When selection is null, treat as
  // all-active (returns the allFindingIds Set without allocating
  // a copy — read-only consumers).
  const activeSelected = selection?.selected ?? allFindingIds;
  const lastAdded = selection?.lastAdded ?? null;
  // Derived: mode === 'all' iff the active Set covers every finding
  // id. This is the only place 'all' vs 'subset' is computed — every
  // consumer (StickySurface chip predicate, FindingDetailPanel G1
  // early-return + dimUncovered) reads this derived value.
  const selectionMode = activeSelected.size === allFindingIds.size ? "all" : "subset";

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

  // S163 B2e E2: chip / pill click — ALWAYS toggles. Same gesture,
  // same result, regardless of how many findings are currently
  // active. The B2b isolate-on-first-click special case retires.
  //
  // State transitions (let N = clicked finding's regionNumber):
  //   - activeSelected.has(N)    → REMOVE: drop N from the set.
  //                                  lastAdded demotes to next-most-
  //                                  recent active finding (or null
  //                                  when the set empties). NO scroll;
  //                                  removing narrows focus, doesn't
  //                                  re-target §3.
  //   - !activeSelected.has(N)   → ADD: insert N into the set.
  //                                  lastAdded = N. Scrolls §3 to
  //                                  that finding's card; expands
  //                                  dimension + test card; auto-
  //                                  expands the data block on first
  //                                  activation.
  //
  // Default panel-expand state: every finding active (selection ===
  // null → activeSelected reads allFindingIds without allocation).
  // First click from default: peels one off → selectionMode flips
  // to 'subset' since the Set is now smaller than allFindingIds.
  //
  // Path to "just this one" gesture retires: was "click chip from
  // all-on" (which ISOLATED in B2b). Now requires "Clear all → click
  // chip" (two clicks instead of one). Confirmed acceptable per the
  // B2e revision: predictability over saving a click.
  const onActivateTest = useCallback((finding) => {
    if (!finding) return;
    const tests = finding.tests || [];
    if (!tests.length) return;
    if (finding.regionNumber == null) return;
    const N = finding.regionNumber;

    // isRemove determined BEFORE the toggle. Used to gate the
    // scroll-on-add path (REMOVE exits before scroll).
    const isRemove = activeSelected.has(N);

    // State update via functional setter so concurrent updates compose.
    // First write (selection === null → fully active): the setter
    // materialises the all-active baseline from `allFindingIds`, then
    // applies the toggle. Subsequent writes operate on `prev.selected`.
    setSelection(prev => {
      const prevSelected = prev?.selected ?? allFindingIds;
      const prevLastAdded = prev?.lastAdded ?? null;
      const next = new Set(prevSelected);
      let isAdd;
      if (next.has(N)) {
        next.delete(N);
        isAdd = false;
      } else {
        next.add(N);
        isAdd = true;
      }
      const newLastAdded = isAdd
        ? N
        : (prevLastAdded === N
          // lastAdded was the just-removed finding — demote to the
          // next-most-recent active (Set iteration order is insertion
          // order; pop returns the most recent). null when set empties.
          ? (next.size ? [...next].pop() : null)
          : prevLastAdded);
      return { selected: next, lastAdded: newLastAdded };
    });

    if (isRemove) return;  // No card expand / scroll on REMOVE.

    // ADD path: dimension expand + test-card expand + auto-expand
    // data block on first activation + scroll table to region +
    // scroll §3 to the added finding's first card.
    if (ensureCatExpanded) {
      const dims = new Set();
      for (const t of tests) {
        const dim = TEST_MECHANISM[t.testId];
        if (dim) dims.add(dim);
      }
      for (const dim of dims) ensureCatExpanded(dim);
    }
    if (ensureTestCardExpanded) {
      for (const t of tests) ensureTestCardExpanded(t.testId);
    }
    if (!hasAutoExpanded.current) {
      hasAutoExpanded.current = true;
      setDataExpanded(true);
    }
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => scrollToRegion(finding.region));
    } else {
      scrollToRegion(finding.region);
    }
    const firstTestId = tests[0].testId;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToCard(firstTestId)));
    } else {
      scrollToCard(firstTestId);
    }
  }, [scrollToCard, ensureCatExpanded, ensureTestCardExpanded, activeSelected, allFindingIds, scrollToRegion]);

  // S163 B2b W2 / B2e E2: Show all / Clear all writers.
  // Show all  → fully-active Set covering every finding id.
  //             selectionMode resolves to 'all' (size === allIds.size).
  // Clear all → empty Set. selectionMode resolves to 'subset'.
  // Both clear lastAdded — no specific focus when the user has just
  // bulk-modified the set.
  const onShowAll  = useCallback(() => {
    setSelection({ selected: new Set(allFindingIds), lastAdded: null });
  }, [allFindingIds]);
  const onClearAll = useCallback(() => {
    setSelection({ selected: new Set(), lastAdded: null });
  }, []);

  // S163 B2b / B2e: derive `activeFindings` (array) and `focusFinding`
  // (single, the last-added) from selection state. `activeFindings`
  // drives the data-block compositing in FindingDetailPanel /
  // ExcerptTable; `focusFinding` drives the panel chrome (caption,
  // per-test specialised builder key, auto-scroll target on add).
  //
  // E2 update: activeFindings reads `selectionMode` to early-return
  // the full `findings` array when mode='all' — protects the G1
  // default-all-on byte-identical path (FindingDetailPanel's
  // activeConvergence memo early-returns when activeFindings ===
  // findings). When mode='subset', filter to the active set.
  const activeFindings = useMemo(() => {
    if (selectionMode === "all") return findings;
    if (!activeSelected.size) return [];
    return findings.filter(f => f.regionNumber != null && activeSelected.has(f.regionNumber));
  }, [findings, selectionMode, activeSelected]);

  const focusFinding = useMemo(() => {
    if (lastAdded == null) return null;
    return findings.find(f => f.regionNumber === lastAdded) || null;
  }, [findings, lastAdded]);

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
        // S163 B2e E2: selection prop carries the derived mode +
        // active set + lastAdded. StickySurface reads `mode` for
        // Show all / Clear all disabled state, `selected` for the
        // chip isActive predicate (`isFindingActive`). The shape
        // matches the pre-B2e selection prop so StickySurface
        // doesn't need a signature update.
        selection={{ mode: selectionMode, selected: activeSelected, lastAdded }}
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
              />
            </div>
          );
        })}
      </Section>

    </>
  );
}

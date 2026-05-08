/* ── ForensicsBody — Forensics document branch §2 + §3 chrome (S126b) ──
   Owns:
     - §2 WHAT WAS FOUND  — section header (normal scroll flow) + sticky
                            pills+chips+minimap body. Sticky pins to
                            viewport top once the section header scrolls
                            past. Clean (no findings) renders an "all
                            checks passed" line in place of the sticky.
     - §3 DETAILED TEST RESULTS — dimension-grouped cards via
                                   ForensicsCategoryBlock (severity-
                                   descending order + CLEAR collapse).

   S126b add-3 changes:
     - §2 was the dimension-cards section; renamed to §3 DETAILED TEST
       RESULTS and §2 now carries the sticky pills+chips as a numbered
       section (deletion of old §3 WHERE TO LOOK happened in parallel).
     - HotspotExcerpt mount removed — the minimap+table block returned
       in S126c modal. `regionOverlays` + `hotspotScrollRef` plumbing
       kept dormant for that future wiring.
     - Section header for §2 lives outside the sticky container so it
       scrolls away with the verdict banner; sticky body holds only the
       lane rows, ~80–120px tall.

   S126c-a recovery (per SESSION126b-SUMMARY §3(e) scoping
   acknowledgment): the lightweight MinimapStrip is restored inline as
   a sibling to the chip lane inside the sticky wrapper. The deeper
   table excerpt still defers to S126c-b modal — that surface needs a
   meaningful zoom location and breaks for spatially-diffuse findings.
   `hotspotScrollRef` plumbing kept dormant; the modal mounts
   ExcerptTable with that ref pre-wired.

   Why a child component: needs `usePulseTrigger` from PulseProvider.
   ReportView wraps the Forensics return in <PulseProvider>, then renders
   <ForensicsBody …/> here so chips/pills/test-card badge clicks all
   share the same pulse bus.

   Click model (spec §1.7):
     - chip click       → pulse(chip:N, region:N, card:<each>) + scroll card
     - pill click       → pulse(pill:test, card:test) + scroll card
     - badge click on
       a test card      → pulse(card:test, pill or chip+region from finding)
     - region [N] badge → pulse(region:N, chip:N) + onActivateRegion
                          (S126c-b modal-open hook; null-stub today)

   The `region:N` pulse target now has a listener (MinimapStrip's
   RegionBadge) — chip clicks reflect to the minimap visually.
   Reverse direction (badge → chip) wired via the badge handler. */

import { useMemo, useRef, useState, useCallback } from "react";
import { Section } from "../shared/Section.jsx";
import { MECHANISM_ORDER, TEST_MECHANISM } from "../../constants/mechanisms.js";
import { CATEGORY_SHORT_DESCRIPTIONS } from "../../constants/descriptions.js";
import { C, TF, FW, FF } from "../../constants/tokens.js";
import { StickySurface, STICKY_SURFACE_SELECTOR, shouldRenderSticky } from "./StickySurface.jsx";
import { ForensicsCategoryBlock } from "./ForensicsCategoryBlock.jsx";
import { MinimapStrip } from "./MinimapStrip.jsx";
import { DeepLookModal } from "./DeepLookModal.jsx";
import { usePulseTrigger } from "./pulseContext.jsx";

const CLEAN_STATE_COPY = "All checks passed — no patterns to flag.";

// Visual gap between the pinned sticky surface's bottom edge and the
// scrolled-into-view card title (px). Used by `scrollToCard` below.
const SCROLL_BREATHING_MARGIN = 8;

export function ForensicsBody({
  findings, results, catSummaries,
  expandedCats, toggleCat, ensureCatExpanded,
  expandedTestEvidence, setExpandedTestEvidence, ensureTestCardExpanded,
  importConfig, rowMap,
  // Dataset severity (0/1/2/3 from computeSeverity). Threaded through to
  // StickySurface for the §2 severity-echo top row.
  severity,
  // S126c-b: full heatmap data bundle for the inline MinimapStrip (uses
  // convergence + rawData) and the DeepLookModal's ExcerptTable mount
  // (uses every field). Same shape ReportView builds for HotspotExcerptList
  // — `{ convergence, rawData, rowMap, colHeaders, visColIndices, dColMap,
  //     roles, coordCtx, condPerCol, findings }`.
  heatmapProps = null,
}) {
  const convergence = heatmapProps?.convergence || null;
  const rawData = heatmapProps?.rawData || null;
  const trigger = usePulseTrigger();
  // Dormant under S126b add-3: the minimap+table that this ref drives
  // exits inline render and returns in S126c modal. Plumbing kept so
  // the modal mount can plug in without ForensicsBody changes.
  const hotspotScrollRef = useRef(null);

  // Quick test-id → finding lookup for badge-click pulse routing.
  const testToFinding = useMemo(() => {
    const m = new Map();
    for (const f of findings) {
      for (const t of f.tests || []) m.set(t.testId, f);
    }
    return m;
  }, [findings]);

  const stickyVisible = shouldRenderSticky(findings);

  // Scroll-to-card via the data-test-id attribute that ForensicsTestCard sets.
  // CSS.escape handles test-id strings that contain spaces / parens / quotes.
  //
  // S133f-fix2: replaces scrollIntoView({block:"center"}) with offset-aware
  // top-alignment. block:"center" centred the card on the viewport, which
  // for cards taller than the viewport (Missing Data Patterns: per-column
  // missing-rate plot + spatial heatmap; Block Covariance Anomaly with
  // expanded Σ-pass heatmap) pushed the card title above the viewport
  // top and landed the user at "Implications" / "What to look for". The
  // new arithmetic reads the sticky surface's measured offsetHeight at
  // scroll-time and lands the card title just below the pinned sticky:
  //   target = window.scrollY + el.top - stickyHeight - BREATHING_MARGIN
  // offsetHeight is read live (no caching) so the height tracks the
  // sticky's lane composition (pills / localised / fallback / minimap).
  // When no sticky surface is mounted (severity 0 path), stickyHeight
  // falls through to 0 and the card lands BREATHING_MARGIN below
  // viewport top.
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
  // Minimap-scroll path is dormant under add-3 (no inline minimap to
  // scroll); restored in S126c modal.
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
    // Scroll to the first test card. Double-rAF waits for both expand
    // commits + browser paint before reading layout geometry.
    const firstTestId = tests[0].testId;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToCard(firstTestId)));
    } else {
      scrollToCard(firstTestId);
    }
  }, [scrollToCard, ensureCatExpanded, ensureTestCardExpanded]);

  // Test-card severity-badge click. Routes the pulse back to the finding's
  // pill (global) or chip+region overlay (localised). S126c-a wires the
  // `region:N` listener via MinimapStrip's RegionBadge, so badge → chip
  // → region pulse symmetry now lights up the inline minimap too.
  const onCardBadgeClick = useCallback((result) => {
    const f = testToFinding.get(result.name);
    const keys = [`card:${result.name}`];
    if (f) {
      if (f.type === "global") keys.push(`pill:${result.name}`);
      else if (f.regionNumber != null) keys.push(`chip:${f.regionNumber}`, `region:${f.regionNumber}`);
    }
    trigger(...keys);
  }, [testToFinding, trigger]);

  // S126c-b: deep-look modal state. `modalRegionNumber` non-null →
  // DeepLookModal is mounted, focused on that regionNumber. The whole
  // inline strip + each [N] badge are click targets that set this state.
  const [modalRegionNumber, setModalRegionNumber] = useState(null);

  // Region-badge / strip-area click handler. Receives the overlay
  // descriptor `{ regionNumber, severity, visRowStart, visRowEnd, tests }`
  // computed by MinimapStrip from the focused finding. Sets modal state
  // → modal mount renders pre-zoomed to that region. The chip:N + region:N
  // pulse triggers are fired by MinimapStrip itself (badge handler and
  // strip-area handler both fire) so this callback is purely the
  // modal-open dispatch.
  const onActivateRegion = useCallback((overlay) => {
    if (!overlay || overlay.regionNumber == null) return;
    setModalRegionNumber(overlay.regionNumber);
  }, []);

  const onDismissModal = useCallback(() => setModalRegionNumber(null), []);

  // Build the MinimapStrip slot once for the sticky surface. Mounting
  // is conditional on the data being available (convergence + rawData
  // come from ReportView, which builds them once via
  // buildConvergenceFromFindings + importConfig.data); the component
  // also self-guards via an internal "no shading and no overlays →
  // return null" check, so passing it always is safe.
  const minimapSlot = (convergence && rawData)
    ? (
      <MinimapStrip
        convergence={convergence}
        findings={findings}
        rowMap={rowMap}
        nVisRows={rawData.length}
        onActivateRegion={onActivateRegion}
      />
    )
    : null;

  const catDescs = CATEGORY_SHORT_DESCRIPTIONS;

  return (
    <>
      {/* §2 WHAT WAS FOUND — Path B-2 (S126b add-7b): the section is
          split into two DOM elements that merge visually into one card.
          The Section header renders inside its own flat-bottom wrapper;
          the StickySurface renders as a SECTION SIBLING in a flat-top
          continuation wrapper. Both share BG_ZONE bg + matching radii
          on the abutting edge, so the visual reads as one Section card.
          Critically, StickySurface's DOM parent is the Fragment / outer
          ReportView wrapper rather than the Section's BG_ZONE card —
          this is what gives `position: sticky` enough vertical span to
          pin past §3, §4, §5 (sticky is bound by its PARENT's bottom
          edge, and §2's wrapper is only ~83px tall). Pre-add-7b sticky
          was inside Section §2 → un-pinned at 83px scroll; now sticky
          is sibling-of-§3-§4-§5 → pins through the entire report.

          Clean state (severity = 0): no sticky, no continuation — §2
          renders as a normal Section card with the clean-state copy
          inside (full radii, full marginBottom). */}
      {stickyVisible
        ? <>
            <Section number={2} title="WHAT WAS FOUND" flatBottom />
            <StickySurface
              findings={findings}
              severity={severity}
              onActivateTest={onActivateTest}
              minimapSlot={minimapSlot}
            />
          </>
        : <Section number={2} title="WHAT WAS FOUND">
            <div style={{
              fontSize: TF.BODY,
              fontFamily: FF.UI,
              color: C.TEXT_2,
            }}>
              {CLEAN_STATE_COPY}
            </div>
          </Section>
      }

      {/* §3 DETAILED TEST RESULTS — dimension cards */}
      <Section number={3} title="DETAILED TEST RESULTS">
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

      {/* S126c-b — DeepLookModal mount. Rendered as a Fragment sibling
          (position:fixed inside the modal takes it out of document
          flow). Sticky scope unchanged: StickySurface's parent extent
          is unaffected by adding/removing a fixed-positioned sibling
          → S126b add-7b pin range preserved on dismiss. */}
      {modalRegionNumber != null && heatmapProps && (
        <DeepLookModal
          heatmapProps={heatmapProps}
          results={results}
          findings={findings}
          initialRegionNumber={modalRegionNumber}
          onDismiss={onDismissModal}
          scrollToCardOutside={scrollToCard}
        />
      )}
    </>
  );
}

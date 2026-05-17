/* ── StickySurface — Forensics-mode sticky navigation surface (S126b) ──
   Sits inside §2 WHAT WAS FOUND, below the section header. Pins to
   viewport top once user scrolls past the verdict banner + section
   header. Renders a pill row + chip row over the findings[] data layer.

   S126b add-2 retired the 3-state (A/B/C) machine — aggregator-level
   row→cell expansion in findings.js made the State C trigger
   structurally unreachable.

   S126b add-3 retired the lone State B → null hotspotBlock slot too.
   The minimap+table block exited inline render entirely (returned in
   S126c modal). Sticky carried pills + chips only, ~80–120px tall.
   `partitionForSticky` collapsed to `shouldRenderSticky(findings)` —
   simple boolean. `pillsAndChips(findings)` returns the lanes for the
   render path.

   S126c-a recovery (add-3 scoping error per SESSION126b-SUMMARY §3(e)):
   the lightweight minimap (works for clustered AND diffuse findings)
   should not have shared add-3's deferral with the table excerpt. The
   sticky now accepts an optional `minimapSlot` prop rendered below the
   chip lane; ForensicsBody mounts MinimapStrip there. The deeper
   table excerpt still defers to S126c-b modal. */

import { C, CR } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { LANE_LABEL_TYPOGRAPHY } from "../shared/Section.jsx";
import { FindingPill } from "./FindingPill.jsx";
import { FindingChip } from "./FindingChip.jsx";

const STICKY_TOP = 0;

// Stable DOM marker so chip-click scroll handlers can read the sticky
// surface's measured height and offset their landing position. Writer is
// the outer div below; reader is `scrollToCard` in ForensicsBody.jsx.
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
// but produced no specific rows / cells, so MinimapStrip filters it out of the
// region overlays). Pre-S133f these chips were rendered alongside true
// localised chips in a single lane, claiming a localisation the minimap
// couldn't confirm. S133f routes them into a separate "Patterns flagged
// broadly" lane so the §2 surface tells the truth about scope.
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
 * Boolean predicate — true when sticky should render at all (i.e. there
 * is at least one pill or chip to display, in any lane). Caller branches
 * on this to decide whether to mount StickySurface or fall back to a
 * clean-state §2 body.
 */
export function shouldRenderSticky(findings = []) {
  const { pills, localisedChips, fallbackChips } = pillsAndChips(findings);
  return pills.length > 0 || localisedChips.length > 0 || fallbackChips.length > 0;
}

export function StickySurface({ findings, onActivateTest, minimapSlot = null }) {
  const { pills, localisedChips, fallbackChips } = pillsAndChips(findings);
  if (!pills.length && !localisedChips.length && !fallbackChips.length) return null;

  // S126b add-7b: rendered as a flat-top continuation of the
  // <Section flatBottom> sibling above. Same BG_ZONE bg + matching radii
  // on the abutting edge → visual reads as one card. position:sticky
  // here (not on a child wrapper) so the sticky element's parent is the
  // ForensicsBody fragment / ReportView outer div, giving sticky enough
  // vertical span to pin past §3-§5 (sticky un-pins at parent's bottom
  // edge — fragment's parent is ReportView's outer div extending the
  // whole report, not §2's 83px-tall wrapper).
  //
  // S126c-a: `minimapSlot` renders below the chip lane when localised
  // findings exist (caller decides whether to mount). The slot lives
  // inside this sticky wrapper so the minimap pins together with the
  // pills + chips. Sticky's DOM parent is unchanged — pin range still
  // extends past §3-§5 via the Fragment / ReportView outer wrapper.
  return (
    <div data-sticky-surface="forensics" style={{
      position: "sticky",
      top: STICKY_TOP,
      zIndex: 20,
      background: C.BG_ZONE,
      borderRadius: `0 0 ${CR.LG} ${CR.LG}`,
      padding: "0 20px 16px 20px",
      marginBottom: "12px",
      boxShadow: "0 4px 6px -2px rgba(0,0,0,0.05)",
    }}>
      {pills.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap",
          marginBottom: (localisedChips.length > 0 || fallbackChips.length > 0) ? "8px" : 0,
        }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>Dataset-wide patterns</span>
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
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>Localised patterns</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {localisedChips.map(f => (
              <FindingChip key={f.id} finding={f} onActivate={onActivateTest} />
            ))}
          </div>
        </div>
      )}
      {/* S133f: fallback chips (region.cells.length === 0) — tests that fired
          severity > LOW but produced no specific rows. Routed out of the
          Localised lane so the surface doesn't claim a localisation the
          minimap can't show. The minimap continues to filter these out via
          its own `region.cells.length > 0` predicate. */}
      {fallbackChips.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          flexWrap: "wrap",
        }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY, ...LANE_LABEL_LAYOUT }}>Broadly flagged patterns</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {fallbackChips.map(f => (
              <FindingChip key={f.id} finding={f} onActivate={onActivateTest} />
            ))}
          </div>
        </div>
      )}
      {minimapSlot}
    </div>
  );
}

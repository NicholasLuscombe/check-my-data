/* ── ClusterRow — §3 cluster header row (label · count · description · word badge · chevron) ──
   S150 (C.8): extracted from the byte-identical 5-span flex composition that
   lived inline at ForensicsCategoryBlock.jsx and CategoryRow.jsx. Same hazard
   pattern as LANE_LABEL (S149) — touching one without the other would create
   drift, and the typography registers on the three text spans are
   load-bearing for the cluster-row rhythm (S150 A1 lock).

   Typography registers (A1 Option B lock):
     - Label:               FS.base / FW.SEMI / C.TEXT
                            (co-consumes Lane-label tuple — name-cased category
                             label, the primary span)
     - Count parenthetical: FS.base / FW.NORM / C.TEXT_3
                            (co-consumes Identity-row-label tuple — peer with
                             description, no longer reads as metadata)
     - Description prose:   FS.base / FW.NORM / C.TEXT_3
                            (co-consumes Identity-row-label tuple — same as
                             count; both at C.TEXT_3 surround the primary label)

   S156 (A1.D0c-bis D6 lock): parallel encoding — the borderLeft now carries
   MECH_COLOR keyed off the cluster mechanism, and the inline-left ⚠/✓ glyph
   retires. The worst-tier word badge ("High" / "Moderate" / "Clear") moves
   to the right side of the row in SEV_VERDICT colour, plain weight. The
   parallel-encoding pair: mechanism on the left (matching §2 chip border),
   severity on the right (matching §3 per-card badge colour). When `mk` is
   omitted (defensive fallback), the row degrades to the pre-S156 SEV-coded
   left border + glyph.

   Chevron is a typeset glyph but renders as an icon, not text — bypasses
   the typography system per TYPOGRAPHY-SYSTEM.md §"What this system does
   NOT cover" (chart-annotation / icon-glyph carve-out).

   The 3px borderLeft sidebar and 10px outer padding are part of the row's
   chrome and live inside this component — consumers don't wrap. */

import { C, FS, FW, MECH_COLOR, SEV_VERDICT } from "../../constants/tokens.js";
import { LANE_LABEL_TYPOGRAPHY } from "./Section.jsx";
import { MechIcon, mechIconSize } from "./MechIcon.jsx";
import { RAIL_GUTTER, RAIL_RIGHT } from "./styles.js";

/**
 * @param {object} props
 * @param {string} props.label - cluster display name (e.g. "Copy, paste, edit")
 * @param {string} props.description - one-liner shown after the em-dash
 * @param {boolean} props.isFlagged - any HIGH or MODERATE tests
 * @param {boolean} [props.hasHigh] - any HIGH tests (drives worst-tier word)
 * @param {object} [props.coverage] - coverage summary for the cluster's full
 *   member list, from summarizeCoverage(): { ran, notApplicable, unassessed,
 *   errored, pending, total }. Drives the "X of Y ran · …" reconciling line.
 * @param {string} [props.mk] - mechanism cluster key for MECH_COLOR border resolution
 * @param {string} [props.flagColor] - legacy SEV-coded border colour, used only
 *   when `mk` is absent (defensive fallback)
 * @param {boolean} props.isExpanded - chevron orientation (▾ vs ▸)
 * @param {boolean} [props.isExpandable=true] - when false, cursor stays default
 *   and chevron + onClick suppressed (CategoryRow clean-state path).
 * @param {function} [props.onToggle] - click handler; gated by isExpandable
 */
export function ClusterRow({
  label, description,
  isFlagged, hasHigh,
  coverage,
  mk, flagColor,
  isExpanded, isExpandable = true,
  onToggle,
}) {
  const borderColor = (mk && MECH_COLOR[mk]) || flagColor;
  const cov = coverage || { ran: 0, notApplicable: 0, unassessed: 0, errored: 0, pending: 0, total: 0 };
  // The fraction counts only tests that could have run — not-applicable comes out
  // of both numerator and denominator, because those tests were never on the
  // table for this data. couldRun is the honest denominator for "did this cluster
  // reach a verdict"; not-applicable is reported separately as a trailing clause.
  const couldRun = cov.total - cov.notApplicable;
  // Header word + colour. A flagged cluster keeps High / Moderate. A clean
  // cluster reports coverage: green "Clear" only when every test that could run
  // completed; a neutral word when work is genuinely outstanding. Not-applicable
  // no longer holds a cluster below "Clear" — only errored, unassessed, or
  // pending do (the last two a user action resolves). "Not assessed" is the case
  // where nothing was applicable at all.
  let wordText, wordColor;
  if (hasHigh) {
    wordText = "High"; wordColor = SEV_VERDICT[3].color;
  } else if (isFlagged) {
    wordText = "Moderate"; wordColor = SEV_VERDICT[2].color;
  } else if (couldRun === 0) {
    wordText = "Not assessed"; wordColor = C.TEXT_3;
  } else if (cov.errored > 0) {
    wordText = "Incomplete"; wordColor = C.TEXT_3;
  } else if ((cov.unassessed + cov.pending) > 0) {
    wordText = "Clear so far"; wordColor = C.TEXT_3;
  } else {
    wordText = "Clear"; wordColor = SEV_VERDICT[0].color;
  }
  // Coverage clauses, kept short so the cluster subtitle stays readable. The
  // fraction runs against couldRun (not the full battery) and carries no
  // "completed" label — the word plus the fraction already says it. Then only the
  // outstanding buckets that explain a gap in the fraction. Not-applicable is not
  // shown at cluster level (the fraction already excludes it; §5 keeps the full
  // count). "could not complete" matches §4 and §5 — one phrase for one state.
  const clauses = [];
  if (couldRun > 0)       clauses.push(`${cov.ran} of ${couldRun}`);
  if (cov.errored > 0)    clauses.push(`${cov.errored} could not complete`);
  if (cov.unassessed > 0) clauses.push(`${cov.unassessed} unassessed`);
  if (cov.pending > 0)    clauses.push(`${cov.pending} pending`);
  const coverageText = clauses.join(" · ");
  return (
    <div style={{ padding: `10px ${RAIL_RIGHT} 10px 10px`, borderLeft: `3px solid ${borderColor}` }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 0, cursor: isExpandable ? "pointer" : "default" }}
        onClick={isExpandable ? onToggle : undefined}
      >
        {/* S210: the gutter now holds only the disclosure triangle — the
            mechanism icon moved to the right of the title (below), so the rail
            sits close to the left edge. Glyph is the icon-glyph carve-out per
            TYPOGRAPHY-SYSTEM.md §"What this system does NOT cover". */}
        <span style={{ width: RAIL_GUTTER, flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
          {isExpandable && (
            <span style={{ color: C.TEXT_2, fontSize: "14px", flexShrink: 0 }}>
              {isExpanded ? "▾" : "▸"}
            </span>
          )}
        </span>
        {/* Text group — starts on the rail (gutter's right edge). Keeps the
            label↔count↔description rhythm and the right-pinned word badge. */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1, minWidth: 0 }}>
          <span style={{ ...LANE_LABEL_TYPOGRAPHY }}>
            {label}
          </span>
          {/* S157/S210: cluster-identity icon — now immediately AFTER the title,
              before the description: [title] [icon] — description. 20px
              (mechIconSize +2 for digits), MECH_COLOR hue via the mk key.
              (The "(N tests)" parenthetical retired — the badge's "X of Y ran"
              coverage form is the single count on the row.) */}
          {mk && <span style={{ flexShrink: 0, display: "inline-flex" }}><MechIcon mk={mk} size={mechIconSize(mk, 20)} /></span>}
          <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: C.TEXT_3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {"— "}{description}
          </span>
          {/* Header word — colour-on-chrome / words-stay-plain rule. Flagged
              clusters carry High / Moderate in SEV colour; a clean cluster
              carries a coverage-gated word (Clear / Clear so far / Incomplete /
              Not assessed), green only when every test that could run completed.
              The short coverage clauses trail the word; "Not assessed" stands
              alone with no trailing separator. */}
          <span style={{ fontSize: FS.base, fontWeight: FW.NORM, marginLeft: "auto", flexShrink: 0 }}>
            <span style={{ color: wordColor }}>{wordText}</span>
            {coverageText && <span style={{ color: C.TEXT_3 }}>{` · ${coverageText}`}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

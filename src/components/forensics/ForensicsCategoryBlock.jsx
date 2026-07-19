/* ── ForensicsCategoryBlock — Forensics-mode category section (S126b §1.9) ──
   Replaces shared CategoryRow inside the Forensics document branch when
   severity > 0. Visual header layout matches CategoryRow (sidebar colour,
   ⚠/✓ icon, label, count, description, chevron) but the expanded body
   re-orders sub-tests and collapses CLEAR into a single line.

   Differences from shared CategoryRow:
     - Sub-tests sorted severity-descending (HIGH → MOD → LOW).
     - LOW (CLEAR in spec terminology) collapse to one-line summary by
       default, click-to-expand per dimension.
     - Each visible test card carries a data-test-id attribute for chip /
       pill scroll targeting.
     - Severity-badge click on a card pulses the card + any chip / pill /
       region the card belongs to.
*/

import { useState, useMemo } from "react";
import { C, FS, FW, FF, CR, SEV_VERDICT, UI } from "../../constants/tokens.js";
import { DISPLAY_NAMES } from "../../constants/mechanisms.js";
import { TestCardLayout } from "../shared/TestCardLayout.jsx";
import { ClusterRow } from "../shared/ClusterRow.jsx";
import { TestCard } from "../cards/TestCard.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";
import { RAIL_GUTTER, RAIL_RIGHT } from "../shared/styles.js";

const SEV_RANK = { HIGH: 3, MOD: 2, MODERATE: 2, LOW: 1, CLEAR: 0, "N/A": -1 };

function rankOf(flag) { return SEV_RANK[flag] ?? -1; }

function pulseColorForFlag(flag) {
  if (flag === "HIGH" || flag === "FLAGGED") return SEV_VERDICT[3].color;
  if (flag === "MODERATE" || flag === "NOTED") return SEV_VERDICT[2].color;
  return SEV_VERDICT[0].color;
}

/**
 * Single forensics test card. Wraps TestCardLayout in an outer div that:
 *   - exposes data-test-id so chip / pill click handlers can scroll to it,
 *   - listens to its own pulse tick from the shared PulseProvider (fired
 *     by §2 chip / pill activation — see FindingChip / FindingPill).
 */
function ForensicsTestCard({ result, mk, expanded, onToggle, importConfig, rowMap }) {
  const pulseColor = pulseColorForFlag(result.flag);
  const ref = usePulseAnimation(`card:${result.name}`, pulseColor);
  const evidenceChildren = expanded ? (
    <TestCard result={result} importConfig={importConfig} rowMap={rowMap} />
  ) : null;
  return (
    <div
      ref={ref}
      data-test-id={result.name}
      style={{ borderRadius: CR.LG }}
    >
      <TestCardLayout
        result={result} mode="full" mk={mk}
        expanded={expanded}
        onToggle={onToggle}
      >
        {evidenceChildren}
      </TestCardLayout>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.mk - mechanism key
 * @param {string} props.label - category display name
 * @param {boolean} props.isFlagged - any HIGH or MODERATE tests
 * @param {boolean} props.hasHigh - any HIGH tests
 * @param {string} props.description - one-liner after em-dash
 * @param {object[]} props.testResults - filtered results (flag !== "N/A")
 * @param {object} props.coverage - coverage summary for the cluster's full
 *   member list (summarizeCoverage), forwarded to ClusterRow's reconciling line
 * @param {boolean} props.isExpanded - category expanded state
 * @param {function} props.onToggle - toggle category expansion
 * @param {object} props.expandedTestEvidence - { [testName]: boolean }
 * @param {function} props.onToggleTestEvidence - (testName, defaultOpen) => void
 * @param {object} props.importConfig - passed to TestCard
 * @param {object} props.rowMap - passed to TestCard
 */
export function ForensicsCategoryBlock({
  mk, label, isFlagged, hasHigh, description, testResults,
  pendingTests = [], unassessedTests = [],
  notApplicableTests = [],
  coverage,
  isExpanded, onToggle,
  expandedTestEvidence, onToggleTestEvidence,
  importConfig, rowMap,
}) {
  const flagColor = hasHigh ? SEV_VERDICT[3].color : isFlagged ? SEV_VERDICT[2].color : SEV_VERDICT[0].color;

  // Severity-descending order: HIGH → MOD/NOTED → LOW. Stable within a tier.
  const sorted = useMemo(() => {
    return [...testResults].sort((a, b) => rankOf(b.flag) - rankOf(a.flag));
  }, [testResults]);

  // CLEAR (= LOW) tests collapse to a one-line summary by default.
  const flaggedTests = sorted.filter(r => r.flag === "HIGH" || r.flag === "MODERATE");
  const clearTests = sorted.filter(r => r.flag === "LOW");
  const [clearOpen, setClearOpen] = useState(false);
  // Not-applicable tests collapse the same way (S324). Always start collapsed,
  // regardless of count — one row for two tests or eleven.
  const [naOpen, setNaOpen] = useState(false);
  const clearNames = clearTests.map(r => DISPLAY_NAMES[r.name] || r.name).join(", ");
  const naNames = notApplicableTests.map(r => DISPLAY_NAMES[r.name] || r.name).join(", ");
  const naGroups = groupNotApplicableByReason(notApplicableTests);
  const clearIcon = <span style={{ color: SEV_VERDICT[0].color, fontSize: FS.base, flexShrink: 0 }}>✓</span>;

  return (
    <div style={{ paddingBottom: isExpanded ? "4px" : "0" }}>
      <ClusterRow
        mk={mk}
        label={label}
        description={description}
        isFlagged={isFlagged}
        hasHigh={hasHigh}
        coverage={coverage}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />

      {isExpanded && (
        // S210: right padding dropped (10→0) so card/strip boxes span to the
        // block right edge like the cluster row — shared right edge for the
        // verdict rail. Left stays 0 (shared x=0 left origin, S210 left rail).
        <div style={{ padding: "0 0 10px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            {flaggedTests.map(r => {
              const defaultOpen = true;
              const isOpen = r.name in (expandedTestEvidence || {})
                ? expandedTestEvidence[r.name]
                : defaultOpen;
              return (
                <ForensicsTestCard
                  key={r.name}
                  result={r}
                  mk={mk}
                  expanded={!!isOpen}
                  onToggle={(e) => { e.stopPropagation(); onToggleTestEvidence?.(r.name, defaultOpen); }}
                  importConfig={importConfig}
                  rowMap={rowMap}
                />
              );
            })}

            {clearTests.length > 0 && !clearOpen && (
              <CollapsedSummaryRow count={clearTests.length} label="cleared" names={clearNames}
                leadIcon={clearIcon} onToggle={() => setClearOpen(true)} />
            )}
            {clearTests.length > 0 && clearOpen && (
              <>
                <CollapsedSummaryRow count={clearTests.length} label="cleared" names={clearNames}
                  leadIcon={clearIcon} onToggle={() => setClearOpen(false)} expanded />
                {clearTests.map(r => {
                  // S196: cleared/LOW cards mount COLLAPSED by default
                  // (defaultOpen=false) but are now expandable via the same
                  // ReportView-owned expandedTestEvidence map the flagged
                  // cards use — keyed by r.name, test-name-agnostic.
                  const defaultOpen = false;
                  const isOpen = r.name in (expandedTestEvidence || {})
                    ? expandedTestEvidence[r.name]
                    : defaultOpen;
                  return (
                    <ForensicsTestCard
                      key={r.name}
                      result={r}
                      mk={mk}
                      expanded={!!isOpen}
                      onToggle={(e) => { e.stopPropagation(); onToggleTestEvidence?.(r.name, defaultOpen); }}
                      importConfig={importConfig}
                      rowMap={rowMap}
                    />
                  );
                })}
              </>
            )}

            {/* Grouping-pending tests — held N/A until the user confirms the
                grouping. Distinct copy from ordinary "not applicable" N/A
                (S321 move 2, round 1). */}
            {pendingTests.map(r => (
              <PendingRow key={r.name} result={r} />
            ))}
            {/* Grouping-unassessed tests — the user took the "I can't say" exit.
                Same amber register as the pending rows they replace, distinct
                copy. The header now counts these in its own "unassessed" bucket
                (the coverage summary is built off the same member list these
                rows come from), so the header and the rows agree. */}
            {unassessedTests.map(r => (
              <PendingRow key={r.name} result={r} />
            ))}
            {/* Not-applicable tests (S324). Settled N/A with a reason string —
                the tests that left the header fraction because the data does
                not support them. Collapsed by default into one summary row (the
                same shape the cleared group uses), so the section reads as a
                single line a scanner passes over. Expanded, it shows the reason
                stanzas grouped by cause — reason once, then the test names, no
                card chrome. The collapsed row's count replaces the old heading. */}
            {notApplicableTests.length > 0 && !naOpen && (
              <CollapsedSummaryRow count={notApplicableTests.length} label="not applicable"
                names={naNames} onToggle={() => setNaOpen(true)} />
            )}
            {notApplicableTests.length > 0 && naOpen && (
              <>
                <CollapsedSummaryRow count={notApplicableTests.length} label="not applicable"
                  names={naNames} onToggle={() => setNaOpen(false)} expanded />
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingLeft: RAIL_GUTTER }}>
                  {naGroups.map((g, i) => (
                    <div key={i}>
                      <div style={{ fontSize: FS.sm, fontWeight: FW.NORM, color: C.TEXT_3, lineHeight: "1.5" }}>
                        {g.reason}
                      </div>
                      <div style={{ fontSize: FS.sm, fontWeight: FW.MED, color: C.TEXT_2, marginTop: "2px" }}>
                        {g.names.join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Group not-applicable tests by their exact reason string (S324). One
// dataset-level cause (columns are non-replicates, row order arbitrary, too few
// columns) drives many tests at once; stating it once, then the test names,
// reads as accounting rather than a wall of identical rows. Order follows first
// appearance so the layout is stable. Match is exact — near-identical reasons
// stay separate, which keeps a genuinely different cause from being merged.
function groupNotApplicableByReason(tests) {
  const order = [];
  const byReason = new Map();
  for (const r of tests) {
    const reason = r.description || "";
    if (!byReason.has(reason)) { byReason.set(reason, []); order.push(reason); }
    byReason.get(reason).push(DISPLAY_NAMES[r.name] || r.name);
  }
  return order.map(reason => ({ reason, names: byReason.get(reason) }));
}

// A held-pending test row, visually distinct (amber attention rule) from a
// settled "N/A — not applicable". The reason reflects why the grouping is
// unconfirmed: when the groups are too thin to test (arm 2) that is the most
// common case and the most useful thing to say, so it leads; otherwise the
// grouping simply needs confirmation.
function PendingRow({ result }) {
  // Three grouping-held row states, same amber register, distinct copy:
  //   • groupingUnassessed — the user took the "I can't say" exit; the tests
  //     were left unconfirmed and not assessed (no longer waiting on anyone).
  //   • groupingPending arm2 — held pending, groups too thin to test.
  //   • groupingPending (else) — held pending, grouping needs confirmation.
  const reason = result.groupingUnassessed
    ? "N/A — not assessed (grouping left unconfirmed)"
    : result.groupingPending?.arm2
    ? "N/A — groups too small to test"
    : "N/A — grouping needs confirmation";
  return (
    <div style={{
      padding: `8px ${RAIL_RIGHT} 8px 12px`,
      background: UI.WARN.callout.bg,
      border: `1px solid ${UI.WARN.border}`,
      borderLeft: `3px solid ${UI.WARN.callout.rule}`,
      borderRadius: CR.LG,
      fontSize: FS.base,
      fontFamily: FF.UI,
      color: C.TEXT,
      display: "flex", alignItems: "center", gap: "8px", minWidth: 0,
    }}>
      <span style={{ fontWeight: FW.SEMI, flexShrink: 0 }}>
        {DISPLAY_NAMES[result.name] || result.name}
      </span>
      <span style={{ color: C.TEXT_3, flexShrink: 0 }}>—</span>
      <span style={{ color: UI.WARN.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
        {reason}
      </span>
    </div>
  );
}

// Collapsed one-line summary for a group of test rows (the S210 cleared-row
// shape, generalised in S324 so the not-applicable group reuses it). Disclosure
// triangle in the gutter, an optional lead icon, the count with its predicate
// word, an em dash, then the truncated name list. The cleared group passes the
// green ✓ and "cleared"; the not-applicable group passes no icon and "not
// applicable". The name list truncates via CSS ellipsis — one rule for both.
function CollapsedSummaryRow({ count, label, names, leadIcon = null, onToggle, expanded = false }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: `8px ${RAIL_RIGHT} 8px 12px`,
        background: C.BG_L,
        border: `1px solid ${C.BORDER_L}`,
        borderRadius: CR.LG,
        cursor: "pointer",
        fontSize: FS.base,
        fontFamily: FF.UI,
        color: C.TEXT_3,
        display: "flex", alignItems: "center", gap: 0,
      }}
    >
      {/* S210: gutter holds only the disclosure triangle (matching the cluster
          header + cards); any status icon moves onto the rail as the lead of the
          text group. Triangle is the icon-glyph carve-out. */}
      <span style={{ width: RAIL_GUTTER, flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
        <span style={{ color: C.TEXT_3, flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>
      </span>
      {/* Text group on the rail, optionally led by a status icon. S156
          (A1.D0c-bis D4 lock): ALL CAPS "CLEAR" retired; sentence-case
          predicate words ("cleared" / "not applicable"). */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
        {leadIcon}
        <span style={{ fontWeight: FW.SEMI, color: C.TEXT, flexShrink: 0 }}>{count} test{count !== 1 ? "s" : ""} {label}</span>
        <span style={{ color: C.TEXT_3, flexShrink: 0 }}>—</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {names}
        </span>
      </div>
    </div>
  );
}

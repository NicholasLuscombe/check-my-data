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
import { C, FS, FW, FF, CR, SEV_VERDICT } from "../../constants/tokens.js";
import { DISPLAY_NAMES } from "../../constants/mechanisms.js";
import { TestCardLayout } from "../shared/TestCardLayout.jsx";
import { ClusterRow } from "../shared/ClusterRow.jsx";
import { TestCard } from "../cards/TestCard.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";

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
 *   - listens to its own pulse tick from the shared PulseProvider,
 *   - intercepts severity-badge click to fire the symmetric pulse via
 *     onBadgeClick(result) — does not touch the existing onToggle path.
 */
function ForensicsTestCard({ result, expanded, onToggle, importConfig, rowMap, onBadgeClick }) {
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
        result={result} mode="full"
        expanded={expanded}
        onToggle={onToggle}
        onSeverityBadgeClick={onBadgeClick ? (e) => { e.stopPropagation(); onBadgeClick(result); } : undefined}
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
 * @param {boolean} props.isExpanded - category expanded state
 * @param {function} props.onToggle - toggle category expansion
 * @param {object} props.expandedTestEvidence - { [testName]: boolean }
 * @param {function} props.onToggleTestEvidence - (testName, defaultOpen) => void
 * @param {object} props.importConfig - passed to TestCard
 * @param {object} props.rowMap - passed to TestCard
 * @param {function} [props.onCardBadgeClick] - (result) => void; pulses chip/pill/region
 */
export function ForensicsCategoryBlock({
  mk, label, isFlagged, hasHigh, description, testResults,
  isExpanded, onToggle,
  expandedTestEvidence, onToggleTestEvidence,
  importConfig, rowMap,
  onCardBadgeClick,
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

  const checkCount = testResults.length;

  return (
    <div style={{ paddingBottom: isExpanded ? "4px" : "0" }}>
      <ClusterRow
        mk={mk}
        label={label}
        count={checkCount}
        description={description}
        noun="test"
        isFlagged={isFlagged}
        hasHigh={hasHigh}
        isExpanded={isExpanded}
        onToggle={onToggle}
      />

      {isExpanded && (
        <div style={{ padding: "0 10px 10px 0" }}>
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
                  expanded={!!isOpen}
                  onToggle={(e) => { e.stopPropagation(); onToggleTestEvidence?.(r.name, defaultOpen); }}
                  importConfig={importConfig}
                  rowMap={rowMap}
                  onBadgeClick={onCardBadgeClick}
                />
              );
            })}

            {clearTests.length > 0 && !clearOpen && (
              <ClearSummaryRow tests={clearTests} onExpand={() => setClearOpen(true)} />
            )}
            {clearTests.length > 0 && clearOpen && (
              <>
                <ClearSummaryRow tests={clearTests} onExpand={() => setClearOpen(false)} expanded />
                {clearTests.map(r => (
                  <ForensicsTestCard
                    key={r.name}
                    result={r}
                    expanded={false}
                    onToggle={undefined}
                    importConfig={importConfig}
                    rowMap={rowMap}
                    onBadgeClick={onCardBadgeClick}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClearSummaryRow({ tests, onExpand, expanded = false }) {
  const names = tests.map(r => DISPLAY_NAMES[r.name] || r.name).join(", ");
  return (
    <div
      onClick={onExpand}
      style={{
        padding: "8px 12px",
        background: C.BG_L,
        border: `1px solid ${C.BORDER_L}`,
        borderRadius: CR.LG,
        cursor: "pointer",
        fontSize: FS.base,
        fontFamily: FF.UI,
        color: C.TEXT_3,
        display: "flex", alignItems: "center", gap: "6px",
      }}
    >
      <span style={{ color: SEV_VERDICT[0].color, fontSize: FS.base }}>✓</span>
      {/* S156 (A1.D0c-bis D4 lock): ALL CAPS "CLEAR" retired; sentence-case
          past-tense "cleared" verb matches the post-S137 canon. */}
      <span style={{ fontWeight: FW.SEMI, color: C.TEXT }}>{tests.length} test{tests.length !== 1 ? "s" : ""} cleared</span>
      <span style={{ color: C.TEXT_3 }}>—</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
        {names}
      </span>
      <span style={{ marginLeft: "auto", color: C.TEXT_3 }}>{expanded ? "▾" : "▸"}</span>
    </div>
  );
}

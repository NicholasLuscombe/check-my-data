/* ── Shared category row component ──
   Used by all three report modes (QC, Review, Forensics).
   QC visual style is the base — same colours, fonts, ⚠/✓ icons.
   Mode prop controls expanded content.
   Individual tests render as white TestCardLayout cards. */

import { C, FS, FW, CR, SIGNAL } from "../../constants/tokens.js";
import { DISPLAY_NAMES, TEST_DESCRIPTIONS } from "../../constants/mechanisms.js";
import { fmtP } from "../../constants/thresholds.js";
import { TestCardLayout } from "./TestCardLayout.jsx";
import { ClusterRow } from "./ClusterRow.jsx";
import { TestCard } from "../cards/TestCard.jsx";

/**
 * @param {object} props
 * @param {string} props.mk - mechanism key
 * @param {"qc"|"review"|"full"} props.mode
 * @param {string} props.label - category display name
 * @param {boolean} props.isFlagged - any HIGH or MODERATE tests
 * @param {boolean} props.hasHigh - any HIGH tests
 * @param {string} props.description - one-liner after em-dash
 * @param {number} props.checkCount - number of applicable tests
 * @param {boolean} props.isLast - suppress bottom border
 * @param {boolean} props.isExpanded - category expanded state
 * @param {function} props.onToggle - toggle category expansion
 * @param {boolean} props.alwaysExpandable - clean categories expandable too
 * @param {object[]} props.testResults - filtered results (flag !== "N/A")
 * @param {boolean} props.isTechExpanded - "Show technical details" state
 * @param {function} props.onToggleTech - toggle tech details
 * @param {string} [props.qcDescription] - QC process-focused paragraph
 * @param {object} [props.guidance] - CATEGORY_GUIDANCE[mk].review or .qc
 * @param {object} [props.expandedTestEvidence] - { [testName]: boolean }
 * @param {function} [props.onToggleTestEvidence] - (testName, defaultOpen) => void
 * @param {object} [props.importConfig] - passed to TestCard
 * @param {object} [props.rowMap] - passed to TestCard
 * @param {function} [props.getPrimaryFinding] - (result) => string|null (review mode simplified evidence)
 */
export function CategoryRow({
  mk, mode, label, isFlagged, hasHigh, description, checkCount, isLast,
  isExpanded, onToggle, alwaysExpandable,
  testResults, isTechExpanded, onToggleTech,
  qcDescription, guidance,
  expandedTestEvidence, onToggleTestEvidence,
  importConfig, rowMap, getPrimaryFinding,
}) {
  const isExpandable = alwaysExpandable || isFlagged;
  const countNoun = mode === "qc" ? "check" : "test";

  return (
    <div style={{paddingBottom:isExpanded?"4px":"0"}}>
      {/* ── Category header row — sidebar lives here only ── */}
      <ClusterRow
        mk={mk}
        label={label}
        count={checkCount}
        description={description}
        noun={countNoun}
        isFlagged={isFlagged}
        hasHigh={hasHigh}
        isExpanded={isExpanded}
        isExpandable={isExpandable}
        onToggle={onToggle}
      />

      {/* ── Expanded content — no sidebar ── */}
      {isExpanded && isExpandable && (
        <div style={{padding:"0 10px 10px 0"}}>
          {mode === "qc" ? renderQCExpanded() :
           mode === "review" ? renderReviewExpanded() :
           renderForensicsExpanded()}
        </div>
      )}
    </div>
  );

  // ── Helper: render a list of test cards ──
  function renderTestCards(results, { defaultOpen }) {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginTop:"8px"}}>
        {results.map(r => {
          const fl = r.flag || "LOW";
          const isFl = fl==="HIGH" || fl==="FLAGGED";
          const isNt = fl==="MODERATE" || fl==="NOTED";
          const hasEvidence = isFl || isNt;
          const isTestOpen = hasEvidence && (r.name in (expandedTestEvidence||{}) ? expandedTestEvidence[r.name] : defaultOpen);

          // Evidence children — only rendered when expanded
          let evidenceChildren = null;
          if (isTestOpen && mode === "review") {
            const finding = getPrimaryFinding ? getPrimaryFinding(r) : null;
            evidenceChildren = finding ? (
              <div style={{fontSize:FS.xs,color:C.TEXT_2,lineHeight:"1.5"}}>{finding}</div>
            ) : null;
          } else if (isTestOpen && mode === "full") {
            evidenceChildren = (
              <TestCard result={r} importConfig={importConfig} rowMap={rowMap} />
            );
          }

          return (
            <TestCardLayout
              key={r.name}
              result={r}
              mode={mode}
              mk={mk}
              expanded={!!isTestOpen}
              onToggle={hasEvidence ? (e) => { e.stopPropagation(); onToggleTestEvidence?.(r.name, defaultOpen); } : undefined}
            >
              {evidenceChildren}
            </TestCardLayout>
          );
        })}
      </div>
    );
  }

  // ── QC expanded ──
  function renderQCExpanded() {
    if (isFlagged) {
      return (
        <div style={{marginTop:"8px",paddingBottom:"6px"}}>
          {qcDescription && <div style={{fontSize:FS.base,color:C.TEXT_2,lineHeight:"1.65",marginBottom:"10px"}}>{qcDescription}</div>}
          {renderTechDetails()}
        </div>
      );
    }
    // QC clean (severity 0): show test cards directly (collapsed, no expansion)
    return testResults.length > 0 ? (
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginTop:"8px"}}>
        {testResults.map(r => (
          <TestCardLayout key={r.name} result={r} mode="qc" mk={mk} expanded={false} />
        ))}
      </div>
    ) : null;
  }

  // ── Review expanded ──
  function renderReviewExpanded() {
    if (!testResults.length) return null;
    return renderTestCards(testResults, { defaultOpen: false });
  }

  // ── Forensics expanded ──
  function renderForensicsExpanded() {
    if (!testResults.length) return null;
    return renderTestCards(testResults, { defaultOpen: true });
  }

  // ── "Show technical details" collapsible (QC only) ──
  function renderTechDetails() {
    if (!testResults.length) return null;
    return (
      <div style={{marginTop:"6px"}}>
        <button onClick={e=>{e.stopPropagation();onToggleTech?.();}} style={{background:"none",border:"none",padding:0,cursor:"pointer",color:C.TEXT_3,fontSize:FS.xs,display:"flex",alignItems:"center",gap:"4px"}}>
          <span>{isTechExpanded?"\u25BE":"\u25B8"}</span>
          <span>Show technical details</span>
        </button>
        {isTechExpanded && (
          <div style={{display:"flex",flexDirection:"column",gap:"8px",marginTop:"8px"}}>
            {testResults.map(r => (
              <TestCardLayout key={r.name} result={r} mode="qc" mk={mk} expanded={false} />
            ))}
          </div>
        )}
      </div>
    );
  }
}

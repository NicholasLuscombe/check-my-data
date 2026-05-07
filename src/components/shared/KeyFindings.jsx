/* ── KeyFindings — finding cards for Layer 1A (global) and Layer 1B (localised) ──
   Layer 1A: dataset-wide findings, no numbers, no click-to-highlight.
   Layer 1B: localised findings, numbered ①②③, click-to-highlight active.
   Both share visual treatment: red border+bg for HIGH, amber for MODERATE.
   Sorted by p-value ascending (already sorted in buildFindings).

   S126a: reads the canonical findings[] aggregator
   (analysis/findings.js) instead of filtering raw results. Backward-
   compatible — accepts `findings` directly. The legacy `results` prop is
   no longer consumed; callers should migrate. */

import { useState } from "react";
import { C, TF, FW, FF, CR, SIGNAL } from "../../constants/tokens.js";
import { RANK_NUMS } from "../../constants/mechanisms.js";

/** Shared finding card — used by both 1A and 1B */
function FindingCard({ f, index, numbered, isActive, hasActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const borderColor = f.isHigh ? SIGNAL.RED.dot : SIGNAL.AMBER.dot;
  const baseBg = f.isHigh ? SIGNAL.RED.bg : SIGNAL.AMBER.bg;
  const clickable = !!onClick;
  return (
    <div
      onClick={clickable ? () => onClick(isActive ? null : f.testId) : undefined}
      onMouseEnter={clickable ? () => setHovered(true) : undefined}
      onMouseLeave={clickable ? () => setHovered(false) : undefined}
      style={{
        display: "flex", gap: "8px", alignItems: "flex-start",
        padding: "8px 12px",
        borderLeft: `${isActive ? 4 : 3}px solid ${borderColor}`,
        background: baseBg,
        borderRadius: CR.SM,
        cursor: clickable ? "pointer" : "default",
        opacity: hasActive && !isActive ? 0.35 : 1,
        outline: isActive ? `2px solid ${borderColor}` : "none",
        outlineOffset: -1,
        filter: clickable && hovered && !isActive ? "brightness(0.96)" : "none",
        transition: "opacity 0.15s, outline 0.15s, filter 0.1s",
      }}>
      {numbered && (
        <span style={{
          fontSize: TF.BODY, fontWeight: FW.BOLD, color: C.TEXT,
          flexShrink: 0, lineHeight: "1.5",
        }}>
          {RANK_NUMS[index] || `(${index + 1})`}
        </span>
      )}
      <div style={{ fontSize: TF.BODY, color: C.TEXT_2, lineHeight: "1.5" }}>
        <span style={{ fontWeight: FW.SEMI, color: C.TEXT }}>
          {f.displayName}
        </span>
        {" — "}
        {f.text}
      </div>
    </div>
  );
}

/** Map a Finding (from analysis/findings.js) to FindingCard's view-model. */
function toCardModel(finding) {
  const test = finding.tests?.[0] || {};
  return {
    testId:     test.testId,
    displayName: test.displayName || test.testId,
    text:       finding.summary,
    isHigh:     finding.severity === "HIGH",
    p:          test.pValue ?? 1,
  };
}

/**
 * Layer 1A — Dataset-wide findings (global tests).
 * No numbers, no click-to-highlight.
 */
export function GlobalKeyFindings({ findings = [] }) {
  const cards = findings
    .filter(f => f.type === "global")
    .map(toCardModel);
  if (!cards.length) return null;

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        fontSize: TF.DETAIL, fontFamily: FF.UI, fontWeight: FW.SEMI,
        color: C.TEXT_3, marginBottom: "4px",
      }}>
        Dataset-wide findings
      </div>
      <div style={{
        fontSize: TF.DETAIL, fontFamily: FF.UI,
        color: C.TEXT_4, marginBottom: "8px",
      }}>
        These test results apply across the entire dataset
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {cards.map((f) => (
          <FindingCard key={f.testId} f={f} index={0}
            numbered={false} isActive={false} hasActive={false} />
        ))}
      </div>
    </div>
  );
}

/**
 * Layer 1B — Localised findings (non-global tests).
 * Numbered ①②③, click-to-highlight active.
 */
export function LocalKeyFindings({ findings = [], activeTestKey = null, onFindingClick }) {
  const cards = findings
    .filter(f => f.type === "localised")
    .map(toCardModel);
  const hasActive = activeTestKey != null;

  if (!cards.length) {
    return (
      <div style={{ padding: "8px 0", color: C.TEXT_4, fontSize: TF.BODY, fontFamily: FF.UI, marginBottom: "16px" }}>
        No localised anomalies detected.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        fontSize: TF.DETAIL, fontFamily: FF.UI, fontWeight: FW.SEMI,
        color: C.TEXT_3, marginBottom: "4px",
      }}>
        Localised findings
      </div>
      <div style={{
        fontSize: TF.DETAIL, fontFamily: FF.UI,
        color: C.TEXT_4, marginBottom: "8px",
      }}>
        Click a finding to highlight in table
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {cards.map((f, i) => (
          <FindingCard key={f.testId} f={f} index={i}
            numbered={true}
            isActive={activeTestKey === f.testId}
            hasActive={hasActive}
            onClick={onFindingClick} />
        ))}
      </div>
    </div>
  );
}

/**
 * Legacy export — keep for backward compatibility if referenced elsewhere.
 * @deprecated Use GlobalKeyFindings and LocalKeyFindings with findings[].
 */
export function KeyFindings({ findings, activeTestKey = null, onFindingClick }) {
  return (
    <>
      <GlobalKeyFindings findings={findings} />
      <LocalKeyFindings findings={findings} activeTestKey={activeTestKey} onFindingClick={onFindingClick} />
    </>
  );
}

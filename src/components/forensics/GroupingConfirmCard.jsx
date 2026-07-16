/* ── GroupingConfirmCard — confirm-the-grouping surface (S321 move 2) ──
   Renders when the grouping-enforcement trigger is pending (any result
   carries `groupingPending`). Shows the condition columns inference chose,
   the resulting group count, and the group-size summary, so the user can
   confirm the grouping before the four row-grouped tests are trusted.

   METHODOLOGY §Enforcement is the design source: show the set of condition
   columns and its consequence, with NO ranking — the columns are a set,
   never ordered by any importance signal.

   ROUND 1 (this build): static display only. The checkboxes render ticked
   and visually present but are inert — unticking, live recompute, and the
   confirm action land in later rounds. No computeTrigger call from here.

   Payload: reads `result.groupingPending = { arm1, arm2, condCols, nGroups,
   medianSize, sizes }` (stamped by the engine) plus the condition-column names
   from importConfig.roles / importConfig.hdrs. `sizes` drives the size
   distribution strip; nGroups + median are shown alongside. */

import { C, FS, FW, FF, CR, UI, CC } from "../../constants/tokens.js";

// The four tests the trigger gates, for the "held pending" note. Display
// names come from DISPLAY_NAMES at the call sites that already render them;
// here we only need the count, derived from the pending results.

export function GroupingConfirmCard({ results, importConfig }) {
  const pendingResult = (results || []).find(r => r.groupingPending);
  if (!pendingResult) return null;
  const gp = pendingResult.groupingPending;

  // Condition columns inference chose, in DATA COLUMN ORDER — no sorting, no
  // ranking. Mirrors extractAnalysisInputs' condCols derivation (roles filter
  // 'condition'); names from the header row, falling back to "Col N".
  const roles = importConfig?.roles || [];
  const hdrs = importConfig?.hdrs || [];
  const condColumns = roles
    .map((role, i) => role === "condition"
      ? { idx: i, name: (hdrs[i] != null && String(hdrs[i]).trim()) ? String(hdrs[i]).trim() : `Col ${i + 1}` }
      : null)
    .filter(Boolean);

  // How many tests are held pending (Mahalanobis Row, Entropy/Zipf, Column
  // Goodness-of-Fit, Modality on a fully-pending dataset).
  const nHeld = (results || []).filter(r => r.groupingPending).length;

  const nGroups = gp.nGroups;
  const median = gp.medianSize;
  // Per-group sizes in partition order (first-appearance of each label) — a
  // stable, neutral order, NOT sorted by size. The no-ranking rule governs the
  // condition columns; the size bars carry no ranking either way.
  const sizes = Array.isArray(gp.sizes) ? gp.sizes : [];
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const minSize = sizes.length ? Math.min(...sizes) : 0;

  return (
    <div style={{
      background: C.WHITE,
      border: `1px solid ${UI.WARN.border}`,
      borderLeft: `3px solid ${UI.WARN.callout.rule}`,
      borderRadius: CR.LG,
      padding: "16px 18px",
      marginBottom: "16px",
    }}>
      {/* Heading */}
      <div style={{ fontSize: FS.md, fontWeight: FW.SEMI, color: C.TEXT, marginBottom: "6px" }}>
        Confirm the grouping
      </div>

      {/* Explanation */}
      <div style={{ fontSize: FS.base, color: C.TEXT_2, lineHeight: 1.6, marginBottom: "14px" }}>
        {nHeld} test{nHeld === 1 ? "" : "s"} that compare groups {nHeld === 1 ? "is" : "are"} paused
        until you confirm how the rows are grouped. Inference grouped the data on
        the condition columns below, producing {nGroups} group{nGroups === 1 ? "" : "s"}.
        Review the columns and their consequence before the grouped tests run.
      </div>

      {/* Condition columns — ticked, inert checkboxes, column order, no ranking */}
      <div style={{ fontSize: FS.sm, fontWeight: FW.SEMI, color: C.TEXT_3, marginBottom: "8px" }}>
        Condition columns ({condColumns.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        {condColumns.map(col => (
          <label key={col.idx} style={{
            display: "flex", alignItems: "center", gap: "8px",
            fontSize: FS.base, color: C.TEXT, cursor: "default",
          }}>
            <input type="checkbox" checked readOnly onChange={() => {}} style={{ cursor: "default" }} />
            <span style={{ fontFamily: FF.UI }}>{col.name}</span>
          </label>
        ))}
      </div>

      {/* Consequence — the resulting grouping: count, size distribution, median.
          One bar per group, height proportional to group size, in partition
          order. This is what the user reacts to: how many groups and how big. */}
      <div style={{ fontSize: FS.sm, fontWeight: FW.SEMI, color: C.TEXT_3, marginBottom: "8px" }}>
        Resulting groups
      </div>
      {sizes.length > 0 && (
        <div style={{
          display: "flex", alignItems: "flex-end", gap: "2px",
          height: "44px", marginBottom: "8px",
          padding: "0 2px",
        }}>
          {sizes.map((s, i) => (
            <div key={i} title={`Group ${i + 1}: ${s} row${s === 1 ? "" : "s"}`} style={{
              flex: 1, minWidth: "2px",
              height: `${maxSize ? Math.max(6, (s / maxSize) * 100) : 6}%`,
              background: CC.OBS,
              borderRadius: `${CR.SM} ${CR.SM} 0 0`,
            }} />
          ))}
        </div>
      )}
      <div style={{ fontSize: FS.base, color: C.TEXT_2, fontFamily: FF.UI }}>
        <span style={{ fontWeight: FW.SEMI, color: C.TEXT, fontFamily: FF.MONO }}>{nGroups}</span> group{nGroups === 1 ? "" : "s"}
        {" · median size "}<span style={{ fontWeight: FW.SEMI, color: C.TEXT, fontFamily: FF.MONO }}>{median}</span>
        {sizes.length > 0 && <> · sizes range <span style={{ fontFamily: FF.MONO }}>{minSize}</span>–<span style={{ fontFamily: FF.MONO }}>{maxSize}</span></>}
      </div>
    </div>
  );
}

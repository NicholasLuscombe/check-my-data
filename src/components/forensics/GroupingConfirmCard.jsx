/* ── GroupingConfirmCard — confirm-the-grouping surface (S321 move 2) ──
   Renders when the grouping-enforcement trigger is pending (any result
   carries `groupingPending`). Shows the condition columns inference chose,
   the resulting group count, and the group-size distribution, so the user can
   confirm the grouping before the four row-grouped tests are trusted.

   METHODOLOGY §Enforcement is the design source: show the set of condition
   columns and its consequence, with NO ranking — the columns are a set,
   never ordered by any importance signal.

   ROUND 2 (this build): the checkboxes are a live control. Unticking (or
   re-ticking) a column changes the working set; the card recomputes the
   grouping and the trigger state live via computeTrigger — the SAME helper
   the engine calls (single-source, no test/battery run, sub-millisecond).
   A fire/clear indicator shows whether the current set still trips the
   trigger. The indicator INFORMS; it does not gate — the user is the domain
   expert and may confirm a set the tool would flag. Not yet in: the confirm
   action (runs the tests), boundary guards, persistence.

   Data: the ticked-set state lives in ForensicsBody (`tickedCols` + toggle).
   The live call reads importConfig.data / importConfig.roles / rowMap
   (= filteredIndices). Before any toggle the ticked set is the full inferred
   set, so the live return equals the engine's stamped payload (same single
   computation) — the hand-off from stamp to live is seamless. */

import { useMemo } from "react";
import { C, FS, FW, FF, CR, UI, CC } from "../../constants/tokens.js";
import { computeTrigger } from "../../analysis/groupingTrigger.js";

export function GroupingConfirmCard({ results, importConfig, rowMap, tickedCols, onToggleCol }) {
  // Card visibility is driven by the ENGINE's stamped pending state — it does
  // not change as the user unticks. The live indicator (below) reflects the
  // user's current working set; the card stays mounted either way.
  const pendingResult = (results || []).find(r => r.groupingPending);

  // Condition columns inference chose, in DATA COLUMN ORDER — no sorting, no
  // ranking. Mirrors extractAnalysisInputs' condCols derivation (roles filter
  // 'condition'); names from the header row, falling back to "Col N".
  const roles = importConfig?.roles || [];
  const hdrs = importConfig?.hdrs || [];
  const condColumns = useMemo(() => roles
    .map((role, i) => role === "condition"
      ? { idx: i, name: (hdrs[i] != null && String(hdrs[i]).trim()) ? String(hdrs[i]).trim() : `Col ${i + 1}` }
      : null)
    .filter(Boolean), [roles, hdrs]);

  // The current ticked subset, in column order.
  const ticked = tickedCols || new Set(condColumns.map(c => c.idx));
  const tickedSubset = useMemo(
    () => condColumns.filter(c => ticked.has(c.idx)).map(c => c.idx),
    [condColumns, ticked]
  );

  // Live recompute — the SAME helper the engine calls, on the current set.
  // No test execution: grouping + sizes + arms only. Round 2 does NOT guard
  // the zero/one-column edge — whatever computeTrigger returns is rendered.
  const live = useMemo(() => computeTrigger({
    data: importConfig?.data || [],
    roles,
    condColSet: tickedSubset,
    filteredIndices: rowMap || [],
  }), [importConfig, roles, tickedSubset, rowMap]);

  if (!pendingResult) return null;

  const nHeld = (results || []).filter(r => r.groupingPending).length;

  const nGroups = live.nGroups;
  const median = live.median;
  const sizes = Array.isArray(live.sizes) ? live.sizes : [];
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const minSize = sizes.length ? Math.min(...sizes) : 0;

  // Fire/clear indicator copy — derived from the live return. Informs, never
  // gates.
  let armReason = "";
  if (live.arm1 && live.arm2) armReason = "3 or more condition columns are merged, and the groups are too thin to permute";
  else if (live.arm1) armReason = "3 or more condition columns are merged into the grouping key";
  else if (live.arm2) armReason = "the groups are too thin to support a permutation test";

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
        the condition columns below. Untick a column to see how the grouping and
        the tool's assessment change.
      </div>

      {/* Condition columns — live checkboxes, column order, no ranking */}
      <div style={{ fontSize: FS.sm, fontWeight: FW.SEMI, color: C.TEXT_3, marginBottom: "8px" }}>
        Condition columns ({condColumns.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        {condColumns.map(col => (
          <label key={col.idx} style={{
            display: "flex", alignItems: "center", gap: "8px",
            fontSize: FS.base, color: C.TEXT, cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={ticked.has(col.idx)}
              onChange={() => onToggleCol?.(col.idx)}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontFamily: FF.UI }}>{col.name}</span>
          </label>
        ))}
      </div>

      {/* Consequence — the resulting grouping: count, size distribution, median.
          One bar per group, height proportional to group size, in partition
          order. Updates live as the ticked set changes. */}
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
      <div style={{ fontSize: FS.base, color: C.TEXT_2, fontFamily: FF.UI, marginBottom: "14px" }}>
        <span style={{ fontWeight: FW.SEMI, color: C.TEXT, fontFamily: FF.MONO }}>{nGroups}</span> group{nGroups === 1 ? "" : "s"}
        {" · median size "}<span style={{ fontWeight: FW.SEMI, color: C.TEXT, fontFamily: FF.MONO }}>{median}</span>
        {sizes.length > 0 && <> · sizes range <span style={{ fontFamily: FF.MONO }}>{minSize}</span>–<span style={{ fontFamily: FF.MONO }}>{maxSize}</span></>}
      </div>

      {/* Fire/clear indicator — informs, does not gate. Amber when the current
          set still trips the trigger; green when the tool would not flag it. */}
      {live.pending ? (
        <div style={{
          fontSize: FS.base, color: UI.WARN.text, background: UI.WARN.callout.bg,
          border: `1px solid ${UI.WARN.border}`, borderRadius: CR.MD,
          padding: "8px 12px", lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: FW.SEMI }}>Needs confirmation</span> — {armReason}. You can still confirm this grouping if it is correct.
        </div>
      ) : (
        <div style={{
          fontSize: FS.base, color: UI.OK.text, background: UI.OK.callout.bg,
          border: `1px solid ${UI.OK.border}`, borderRadius: CR.MD,
          padding: "8px 12px", lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: FW.SEMI }}>Looks sound</span> — the tool would not flag this grouping.
        </div>
      )}
    </div>
  );
}

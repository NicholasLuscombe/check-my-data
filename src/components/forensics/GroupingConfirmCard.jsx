/* ── GroupingConfirmCard — confirm-the-grouping surface (S321 move 2) ──
   Renders when the grouping-enforcement trigger is pending. Shows the
   condition columns inference chose, the resulting group count and size
   distribution, and lets the user confirm the grouping so the four paused
   row-grouped tests run and produce real verdicts.

   METHODOLOGY §Enforcement is the design source: show the set of condition
   columns and its consequence, with NO ranking — the columns are a set,
   never ordered by any importance signal.

   ROUND 3 (this build): the confirm action. Pressing Confirm runs the four
   grouped tests (via runConfirmedGroupedTests) on the ticked set and hands the
   results up to ReportView, which swaps them in for the N/A-pending ones — the
   four §3 cards transition pending → verdict in place. The four tests were
   measured at ~0.19 s on C09, so confirm is synchronous: no spinner, no
   running state. The fire/clear indicator (round 2) informs but never gates —
   a "needs confirmation" grouping can still be confirmed. Unticking after a
   confirm clears it (ForensicsBody), returning the four to pending.

   Data: ticked-set state + the confirm handoff live in ForensicsBody /
   ReportView. The live recompute and the confirm run both read
   importConfig.data / roles / rowMap — the same single-source helpers the
   engine uses (computeTrigger for the trigger, runConfirmedGroupedTests for
   the four tests). Nothing here is persisted. */

import { useMemo, useState } from "react";
import { C, FS, FW, FF, CR, UI, CC } from "../../constants/tokens.js";
import { computeTrigger } from "../../analysis/groupingTrigger.js";
import { runConfirmedGroupedTests } from "../../analysis/confirmGrouping.js";

export function GroupingConfirmCard({
  results, importConfig, rowMap, tickedCols, onToggleCol,
  groupingPendingBase = false, confirmedActive = false, onConfirmGrouping = null,
}) {
  const [confirming, setConfirming] = useState(false);

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

  const ticked = tickedCols || new Set(condColumns.map(c => c.idx));
  const tickedSubset = useMemo(
    () => condColumns.filter(c => ticked.has(c.idx)).map(c => c.idx),
    [condColumns, ticked]
  );

  // Live recompute — the SAME helper the engine calls, on the current set.
  const live = useMemo(() => computeTrigger({
    data: importConfig?.data || [],
    roles,
    condColSet: tickedSubset,
    filteredIndices: rowMap || [],
  }), [importConfig, roles, tickedSubset, rowMap]);

  // Visibility gates on the ENGINE's stamped pending state (base results), so
  // the card stays mounted after a confirm — the swap removes groupingPending
  // from the effective results, but the card must remain for re-untick.
  if (!groupingPendingBase) return null;

  const nGroups = live.nGroups;
  const median = live.median;
  const sizes = Array.isArray(live.sizes) ? live.sizes : [];
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const minSize = sizes.length ? Math.min(...sizes) : 0;

  let armReason = "";
  if (live.arm1 && live.arm2) armReason = "3 or more condition columns are merged, and the groups are too thin to permute";
  else if (live.arm1) armReason = "3 or more condition columns are merged into the grouping key";
  else if (live.arm2) armReason = "the groups are too thin to support a permutation test";

  const onConfirm = async () => {
    if (!onConfirmGrouping || confirming) return;
    setConfirming(true);
    try {
      const four = await runConfirmedGroupedTests({
        data: importConfig?.data || [],
        roles,
        condColSet: tickedSubset,
        zeroAsMissing: importConfig?.zeroAsMissing,
        assay: importConfig?.assay,
        dataType: importConfig?.dataType || "continuous",
        vst: importConfig?.vst,
      });
      onConfirmGrouping(four);
    } finally {
      setConfirming(false);
    }
  };

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

      {/* Explanation — adapts to confirmed state */}
      <div style={{ fontSize: FS.base, color: C.TEXT_2, lineHeight: 1.6, marginBottom: "14px" }}>
        {confirmedActive
          ? <>The grouped tests below ran on this grouping. Untick a column to change the grouping and confirm again.</>
          : <>The grouped tests that compare groups are paused until you confirm how the rows are grouped. Inference grouped the data on the condition columns below. Untick a column to see how the grouping and the tool's assessment change, then confirm.</>}
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
          One bar per group, height proportional to group size, partition order.
          Updates live as the ticked set changes. */}
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

      {/* Fire/clear indicator — informs, does not gate. */}
      {live.pending ? (
        <div style={{
          fontSize: FS.base, color: UI.WARN.text, background: UI.WARN.callout.bg,
          border: `1px solid ${UI.WARN.border}`, borderRadius: CR.MD,
          padding: "8px 12px", lineHeight: 1.5, marginBottom: "14px",
        }}>
          <span style={{ fontWeight: FW.SEMI }}>Needs confirmation</span> — {armReason}. You can still confirm this grouping if it is correct.
        </div>
      ) : (
        <div style={{
          fontSize: FS.base, color: UI.OK.text, background: UI.OK.callout.bg,
          border: `1px solid ${UI.OK.border}`, borderRadius: CR.MD,
          padding: "8px 12px", lineHeight: 1.5, marginBottom: "14px",
        }}>
          <span style={{ fontWeight: FW.SEMI }}>Looks sound</span> — the tool would not flag this grouping.
        </div>
      )}

      {/* Confirm action — runs the four grouped tests on the ticked set. Enabled
          in both indicator states (informs, does not gate). After a confirm,
          shows a confirmed acknowledgement; unticking clears it. */}
      {confirmedActive ? (
        <div style={{ fontSize: FS.base, color: UI.OK.text, fontWeight: FW.SEMI }}>
          ✓ Grouping confirmed — the grouped tests ran on it.
        </div>
      ) : (
        <button
          onClick={onConfirm}
          disabled={confirming}
          style={{
            background: C.BG, color: C.TEXT,
            border: `1px solid ${C.BORDER}`, borderRadius: CR.MD,
            padding: "8px 16px", fontSize: FS.base, fontWeight: FW.MED,
            fontFamily: FF.UI, cursor: confirming ? "default" : "pointer",
          }}
        >
          Confirm this grouping and run the grouped tests
        </button>
      )}
    </div>
  );
}

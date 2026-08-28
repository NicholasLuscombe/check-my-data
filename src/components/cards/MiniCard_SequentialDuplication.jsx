/* ── MiniCard: Sequential Duplication (§2.4 — recurring value sequences) ── */

import { C, FS, FW, FF, SIGNAL } from "../../constants/tokens.js";
import { TD_NUM_CELL, TD_ID_CELL, LEAD_HEAD, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { EvidenceBlock } from "../shared/EvidenceBlock.jsx";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { colToExcelLetter, buildOriginalColMap, makeRowMapper } from "../shared/coordinates.js";

export function MiniCard_SequentialDuplication({ result, importConfig, rowMap }) {
  const sequences = result.sequences || [];
  const hasSeq = sequences.length > 0;
  // S388 — the heading names the engine total; `sequences` is capped at 50 for
  // display and the panels below cap at 8. `nSequences` is `kept.length`, taken
  // before that slice.
  const seqTotal = result.nSequences ?? sequences.length;

  const { fileRow, toOrigRow } = makeRowMapper(importConfig, rowMap);
  const roles = importConfig?.roles || [];
  const hdrs = importConfig?.hdrs || [];
  // Matrix data-column index → raw column index (mirrors the Duplicate Detection card).
  const dataColMap = roles.map((r, i) => r === "data" ? i : -1).filter(i => i >= 0);
  const _origColMap = buildOriginalColMap(hdrs.length, importConfig?.removedCols);
  const colName = (matIdx) => hdrs[dataColMap[matIdx]] || `Column ${matIdx + 1}`;
  const colLetter = (matIdx) => colToExcelLetter(_origColMap[dataColMap[matIdx]] ?? dataColMap[matIdx]);

  // File row number for a 0-indexed full-matrix row.
  const fRow = (matRow) => fileRow(toOrigRow(matRow));

  // ── Footer: one-line result ──
  const footer = (() => {
    if (!hasSeq) return "No recurring value sequences found";
    const top = sequences[0];
    const nClause = seqTotal === 1
      ? "1 recurring sequence"
      : `${seqTotal} recurring sequences`;
    return `Column ${colLetter(top.col)} · ${nClause} · run of ${top.height} recurs at offset ${top.offset}`;
  })();

  return (
    <MiniCardLayout result={result}
      footer={hasSeq ? undefined : footer}
      lookFor="A run of values in one column that reappears further down the same column, shifted by a fixed number of rows, is a sign that a block of cells was copied and pasted to a new position. Inspect the raw data to confirm the repeated run reflects independent measurements rather than a duplicated entry."
      implications="A short run of repeated values can occur by chance when a column has few distinct values or sits against a detection limit. A longer run of distinct values recurring at a fixed offset is harder to explain innocently: it is consistent with a block of measurements copied and pasted lower in the same column, for example to fill in missing observations or manufacture a sequence that was never recorded.">

      {hasSeq && (
        <>
          <div style={{ ...LEAD_HEAD, marginBottom: BLOCK_GAP_TIGHT }}>
            Recurring value sequences
            <span style={{ fontWeight: FW.NORM, color: C.TEXT_2 }}>
              {` — ${seqTotal} found`}
            </span>
          </div>
          <EvidenceBlock lead>
            {sequences.slice(0, 8).map((seq, si) => {
              const srcStart = fRow(seq.srcRows[0]);
              const srcEnd = fRow(seq.srcRows[1]);
              const dstStart = fRow(seq.dstRows[0]);
              const dstEnd = fRow(seq.dstRows[1]);
              const vals = seq.values || [];
              const shown = vals.slice(0, 12);
              return (
                <div key={si} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: FS.sm, fontFamily: FF.UI, marginBottom: "4px" }}>
                    <span style={LEAD_HEAD}>
                      Column {colLetter(seq.col)} ({colName(seq.col)})
                    </span>
                    <span style={{ fontSize: FS.xs, color: C.TEXT_3 }}>
                      {` — rows ${srcStart}–${srcEnd} recur at rows ${dstStart}–${dstEnd} (offset ${seq.offset}, ${seq.height} values)`}
                    </span>
                  </div>
                  <table style={{ borderCollapse: "separate", borderSpacing: 0, fontFamily: FF.UI, width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ ...TD_ID_CELL, color: C.TEXT_3, textAlign: "left" }}>Original row</th>
                        <th style={{ ...TD_ID_CELL, color: C.TEXT_3, textAlign: "left" }}>Copy row</th>
                        <th style={{ ...TD_ID_CELL, color: C.TEXT_3, textAlign: "left" }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((v, i) => (
                        <tr key={i} style={{ background: i % 2 ? C.BG_L : C.WHITE }}>
                          <td style={{ ...TD_ID_CELL, fontFamily: FF.MONO, color: C.TEXT_2 }}>{fRow(seq.srcRows[0] + i)}</td>
                          <td style={{ ...TD_ID_CELL, fontFamily: FF.MONO, color: C.TEXT_2 }}>{fRow(seq.dstRows[0] + i)}</td>
                          <td style={{ ...TD_NUM_CELL, color: SIGNAL.RED.text, fontWeight: FW.BOLD, background: SIGNAL.RED.bg }}>
                            {v != null ? String(v) : "—"}
                          </td>
                        </tr>
                      ))}
                      {vals.length > shown.length && (
                        <tr><td colSpan={3} style={{ ...TD_ID_CELL, color: C.TEXT_3 }}>… {vals.length - shown.length} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {seqTotal > 8 && (
              <div style={{ fontSize: FS.xs, color: C.TEXT_3, fontFamily: FF.UI }}>
                … and {seqTotal - 8} more recurring sequences
              </div>
            )}
          </EvidenceBlock>
        </>
      )}
    </MiniCardLayout>
  );
}

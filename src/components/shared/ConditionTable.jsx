import { C, TF, FW, FF, CR, CC, SIGNAL, BADGE } from "../../constants/tokens.js";
import { EvidenceTable } from "./EvidenceTable.jsx";
import { SUB_HEAD } from "./styles.js";

/** Per-condition breakdown table — shared by ConstOffset, Autocorr, Runs, RegNoise.
 *  columns: [{header, align?, bold?, render: row => value}]. Last column is always p-coloured.
 *  condColorMap: optional {conditionName → {bg,text,border}} for colouring condition name cells. */
export function ConditionTable({ data, title, columns, condColorMap = {} }) {
  if (!data?.length || data.length < 2) return null;
  const cols = columns.map(c => ({ label: c.header, align: c.align || "right" }));
  const rows = data.map(row => {
    const isFlagged = row.flag === "HIGH";
    const isNoted = isFlagged || row.flag === "MODERATE";
    const pCol = isFlagged ? CC.THRESH : isNoted ? SIGNAL.AMBER.dot : CC.OBS;
    return columns.map((c, ci) => {
      const isLast = ci === columns.length - 1;
      const val = c.render(row);
      const style = {};
      // Column 0 is always the condition name — apply palette colour if available
      if (ci === 0 && condColorMap[val]) style.color = condColorMap[val].text;
      if (c.bold) style.fontWeight = FW.BOLD;
      if (isLast) style.color = pCol;
      return Object.keys(style).length ? { value: val, style } : val;
    });
  });
  return (
    <div style={{ marginTop: "10px" }}>
      <div style={SUB_HEAD}>
        {title}
        {data.promoted && <span style={{ marginLeft: "8px", fontSize: TF.SMALL, color: BADGE.PROMOTED.text, background: BADGE.PROMOTED.bg, border: `1px solid ${BADGE.PROMOTED.border}`, borderRadius: CR.SM, padding: "1px 5px" }}>differs between conditions — promoted</span>}
      </div>
      <EvidenceTable columns={cols} rows={rows} identifierColumns={1} />
    </div>
  );
}

/* ── EvidenceTable — single source of truth for data table rendering ──
   Every evidence/data table in the app should use this component.
   Font split: <th> and identifier <td>s use FF.UI (sans-serif),
   data <td>s use FF.MONO (monospace — crossbar 0s, fixed-width digits).
   Callers only override colour/background for flag highlighting. */

import { C, TF, FW, FF, CR } from "../../constants/tokens.js";

const TH = { padding:"6px 8px", fontSize:TF.DETAIL, fontFamily:FF.UI, fontWeight:FW.SEMI, color:C.TEXT_3, textAlign:"center", borderBottom:`1px solid ${C.BORDER_L}`, whiteSpace:"nowrap", background:C.BG_L, position:"sticky", top:0, zIndex:1 };
const TD_DATA = { padding:"4px 8px", fontSize:TF.DETAIL, fontFamily:FF.MONO, fontVariantNumeric:"tabular-nums", textAlign:"center", whiteSpace:"nowrap" };
const TD_ID   = { padding:"4px 8px", fontSize:TF.DETAIL, fontFamily:FF.UI, textAlign:"center", whiteSpace:"nowrap" };

/**
 * @param {object} props
 * @param {Array<string|{label,align?,width?}>} props.columns - header definitions
 * @param {Array<Array<any|{value,style}>>} props.rows - row data; each cell is a value or {value, style}
 * @param {number} [props.identifierColumns=0] - leading columns that are identifiers (sans-serif)
 * @param {number} [props.maxHeight=200] - scroll container max-height in px (0 = no limit)
 * @param {function} [props.rowBg] - (row, index) => background colour override
 * @param {boolean} [props.compact] - tighter padding for dense tables
 * @param {string} [props.footerText] - summary text below the table
 */
export function EvidenceTable({ columns, rows, identifierColumns = 0, maxHeight = 200, rowBg, compact, footerText }) {
  if (!rows?.length) return null;
  const cols = columns.map(c => typeof c === "string" ? { label: c } : c);
  const thPad = compact ? "3px 4px" : undefined;
  const tdPad = compact ? "2px 4px" : undefined;
  const containerStyle = {
    border: `1px solid ${C.BORDER_L}`,
    borderRadius: CR.MD,
    overflow: "auto",
    ...(maxHeight > 0 ? { maxHeight: `${maxHeight}px` } : {}),
  };
  return (
    <>
      <div style={containerStyle}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: TF.DETAIL }}>
          <thead>
            <tr style={{ background: C.BG_L }}>
              {cols.map((c, i) => (
                <th key={i} style={{ ...TH, ...(c.align ? { textAlign: c.align } : {}), ...(c.width ? { width: c.width } : {}), ...(thPad ? { padding: thPad } : {}) }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const bg = rowBg ? rowBg(row, ri) : (ri % 2 ? C.BG : C.WHITE);
              return (
                <tr key={ri} style={{ background: bg, borderBottom: `1px solid ${C.BORDER_L}` }}>
                  {row.map((cell, ci) => {
                    const isObj = cell != null && typeof cell === "object" && "value" in cell;
                    const val = isObj ? cell.value : cell;
                    const cellStyle = isObj ? cell.style : undefined;
                    const base = ci < identifierColumns ? TD_ID : TD_DATA;
                    return (
                      <td key={ci} style={{ ...base, ...(cols[ci]?.align ? { textAlign: cols[ci].align } : {}), ...(tdPad ? { padding: tdPad } : {}), ...cellStyle }}>
                        {val ?? ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footerText && <div style={{ fontSize: TF.DETAIL, fontFamily: FF.UI, color: C.TEXT_3, marginTop: "6px" }}>{footerText}</div>}
    </>
  );
}

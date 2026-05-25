import { C, FW, M } from "../../constants/tokens.js";
import { EvidenceTable } from "./EvidenceTable.jsx";

// Thin wrapper: converts the column-render API to EvidenceTable's cell array API.
// columns: [{header, render, align?, bold?, color?}]
// totalCount (optional): when supplied, the "Showing N of M" footer uses
// this true total instead of data.length — for consumers whose engine caps
// `data` below the true count (e.g. Carlisle's 30-row details slice).
export function DataTable({ columns, data, maxRows = 20, rowBg, compact, identifierColumns = 0, totalCount }) {
  if (!data?.length) return null;
  const shown = data.slice(0, maxRows);
  const cols = columns.map(c => ({ label: c.header, align: c.align }));
  const rows = shown.map(row =>
    columns.map(c => {
      const val = c.render(row);
      const isBold = typeof c.bold === "function" ? c.bold(row) : c.bold;
      const col = typeof c.color === "function" ? c.color(row) : c.color;
      const style = (isBold || col) ? { ...(isBold ? { fontWeight: FW.BOLD } : {}), ...(col ? { color: col } : {}) } : undefined;
      return style ? { value: val, style } : val;
    })
  );
  const total = totalCount != null ? totalCount : data.length;
  const more = total > maxRows ? `Showing ${maxRows} of ${total}.` : undefined;
  return <EvidenceTable columns={cols} rows={rows} identifierColumns={identifierColumns} rowBg={rowBg ? (row, i) => rowBg(shown[i], i) : undefined} compact={compact} footerText={more} />;
}

import { C, FW, M } from "../../constants/tokens.js";
import { EvidenceTable } from "./EvidenceTable.jsx";

// Thin wrapper: converts the column-render API to EvidenceTable's cell array API.
// columns: [{header, render, align?, bold?, color?}]
export function DataTable({ columns, data, maxRows = 20, rowBg, compact, identifierColumns = 0 }) {
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
  const more = data.length > maxRows ? `Showing ${maxRows} of ${data.length}.` : undefined;
  return <EvidenceTable columns={cols} rows={rows} identifierColumns={identifierColumns} rowBg={rowBg ? (row, i) => rowBg(shown[i], i) : undefined} compact={compact} footerText={more} />;
}

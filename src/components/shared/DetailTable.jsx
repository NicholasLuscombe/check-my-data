import { C, FS, CC, SIGNAL } from "../../constants/tokens.js";
import { EvidenceTable } from "./EvidenceTable.jsx";

// Thin wrapper: auto-generates columns from object keys in data[0].
export function DetailTable({ data, maxRows = 12 }) {
  if (!data?.length) return <p style={{ color: C.TEXT_3, fontSize: FS.base, margin: "6px 0" }}>No notable findings.</p>;
  const keys = Object.keys(data[0]);
  const cols = keys.map(k => ({ label: k }));
  const shown = data.slice(0, maxRows);
  const rows = shown.map(row =>
    keys.map(k => {
      const v = row[k];
      const display = typeof v === "boolean" ? (v ? "yes" : "no") : String(v ?? "");
      if (k === "significant") {
        return { value: display, style: { color: v ? CC.THRESH : SIGNAL.GREEN.dot } };
      }
      return display;
    })
  );
  const more = data.length > maxRows ? `Showing ${maxRows} of ${data.length}.` : undefined;
  return <EvidenceTable columns={cols} rows={rows} footerText={more} />;
}

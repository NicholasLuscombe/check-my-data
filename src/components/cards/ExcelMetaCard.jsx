/**
 * ExcelMetaCard — displays forensic metadata extracted from .xlsx files.
 *
 * Shows 7 forensic signals:
 * 1. File provenance (creator, modifier, dates) with mismatch highlighting
 * 2. Temporal anomalies (suspicious date gaps)
 * 3. Font anomalies per column (name, size, color source mismatches)
 * 4. Number format anomalies per column (General vs Number vs explicit dp)
 * 5. Hidden sheets
 * 6. External links / named ranges
 * 7. Formula residue (cells with formulas in data columns)
 *
 * Conditionally rendered in ReportView only when importConfig.excelMeta exists.
 * Visually distinct from the 22 statistical test cards.
 */

import { useState } from "react";
import { C, TF, FW, FF, CR, CC, ACCENT, SIGNAL } from "../../constants/tokens.js";
import { FLAG_STYLES } from "../../constants/thresholds.js";
import { FlagBadge } from "../shared/FlagBadge.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";

const SEC = { fontFamily: FF.UI, fontSize: TF.DETAIL, fontWeight: FW.BOLD, marginBottom: "6px", marginTop: "12px", textTransform: "uppercase", letterSpacing: "0.08em" };

export function ExcelMetaCard({ meta }) {
  const [open, setOpen] = useState(false);
  if (!meta) return null;

  const {
    provenance, temporalFlags = [],
    fontAnomalies = [], formatAnomalies = [],
    hiddenSheets = [], externalLinks = [], formulaResidue = [],
    flag, findings = [],
  } = meta;

  const cardBg = flag === "HIGH" ? FLAG_STYLES.HIGH.bg : flag === "MODERATE" ? FLAG_STYLES.MODERATE.bg : ACCENT.PURPLE.bg;
  const cardBorder = flag === "HIGH" ? FLAG_STYLES.HIGH.border : flag === "MODERATE" ? FLAG_STYLES.MODERATE.border : ACCENT.PURPLE.border;

  // Build summary chips
  const chips = [];
  if (provenance.creatorMismatch) chips.push("creator mismatch");
  if (temporalFlags.length) chips.push("temporal");
  if (fontAnomalies.length) chips.push(`${fontAnomalies.length} font`);
  if (formatAnomalies.length) chips.push(`${formatAnomalies.length} format`);
  if (hiddenSheets.length) chips.push(`${hiddenSheets.length} hidden sheet${hiddenSheets.length > 1 ? "s" : ""}`);
  if (externalLinks.length) chips.push(`${externalLinks.length} ext. link${externalLinks.length > 1 ? "s" : ""}`);
  if (formulaResidue.length) chips.push(`${formulaResidue.length} formula col${formulaResidue.length > 1 ? "s" : ""}`);

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: CR.LG, padding: "14px 18px", marginBottom: "12px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
        onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: FF.UI, fontSize: TF.DETAIL, color: C.TEXT_2, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: FW.BOLD }}>
            Excel File Forensics
          </span>
          <FlagBadge flag={flag} />
        </div>
        <span style={{ fontFamily: FF.UI, fontSize: TF.BODY, color: C.TEXT_3, userSelect: "none" }}>{open ? "▾" : "▸"}</span>
      </div>

      {/* Summary line */}
      <div style={{ fontSize: TF.BODY, color: C.TEXT_2, marginTop: "6px", lineHeight: "1.5" }}>
        {provenance.creator && <span>Creator: <strong>{provenance.creator}</strong></span>}
        {provenance.lastModifiedBy && <span>{provenance.creator ? " · " : ""}Last modified by: <strong>{provenance.lastModifiedBy}</strong></span>}
        {chips.length > 0 && (
          <span style={{ marginLeft: "8px", color: flag === "HIGH" ? FLAG_STYLES.HIGH.text : FLAG_STYLES.MODERATE.text, fontWeight: FW.SEMI }}>
            — {chips.join(", ")}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop: "12px" }}>
          {/* ── Provenance ── */}
          <table style={{ borderCollapse: "collapse", fontSize: TF.DETAIL, fontFamily: FF.UI, marginBottom: "4px" }}>
            <tbody>
              {provenance.creator && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: C.TEXT_3, fontWeight: FW.SEMI }}>Creator</td>
                  <td style={{ padding: "3px 0", color: C.TEXT }}>{provenance.creator}</td>
                </tr>
              )}
              {provenance.lastModifiedBy && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: C.TEXT_3, fontWeight: FW.SEMI }}>Last modified by</td>
                  <td style={{ padding: "3px 0", color: provenance.creatorMismatch ? FLAG_STYLES.MODERATE.text : C.TEXT, fontWeight: provenance.creatorMismatch ? FW.BOLD : FW.REG }}>
                    {provenance.lastModifiedBy}
                    {provenance.creatorMismatch && <span style={{ marginLeft: "8px", fontSize: TF.DETAIL, color: FLAG_STYLES.MODERATE.text }}>⚠ differs from creator</span>}
                  </td>
                </tr>
              )}
              {provenance.created && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: C.TEXT_3, fontWeight: FW.SEMI }}>Created</td>
                  <td style={{ padding: "3px 0", color: C.TEXT }}>{provenance.created}</td>
                </tr>
              )}
              {provenance.modified && (
                <tr>
                  <td style={{ padding: "3px 12px 3px 0", color: C.TEXT_3, fontWeight: FW.SEMI }}>Modified</td>
                  <td style={{ padding: "3px 0", color: C.TEXT }}>{provenance.modified}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Temporal anomalies ── */}
          {temporalFlags.length > 0 && (
            <div>
              <div style={{ ...SEC, color: FLAG_STYLES.MODERATE.text }}>Temporal anomalies</div>
              {temporalFlags.map((t, i) => (
                <div key={i} style={{ fontSize: TF.BODY, color: FLAG_STYLES.MODERATE.text, marginBottom: "4px" }}>⚠ {t.description}</div>
              ))}
            </div>
          )}

          {/* ── Font anomalies ── */}
          {fontAnomalies.length > 0 && (
            <div>
              <div style={{ ...SEC, color: FLAG_STYLES.HIGH.text }}>Font metadata anomalies</div>
              <AnomalyTable items={fontAnomalies} />
            </div>
          )}

          {/* ── Number format anomalies ── */}
          {formatAnomalies.length > 0 && (
            <div>
              <div style={{ ...SEC, color: FLAG_STYLES.MODERATE.text }}>Number format inconsistencies</div>
              <AnomalyTable items={formatAnomalies} />
            </div>
          )}

          {/* ── Hidden sheets ── */}
          {hiddenSheets.length > 0 && (
            <div>
              <div style={{ ...SEC, color: FLAG_STYLES.MODERATE.text }}>Hidden sheets</div>
              {hiddenSheets.map((h, i) => (
                <div key={i} style={{ fontSize: TF.BODY, color: C.TEXT_2, marginBottom: "4px" }}>
                  <strong style={{ color: CC.OBS }}>{h.name}</strong>
                  <span style={{ marginLeft: "6px", fontSize: TF.DETAIL, color: FLAG_STYLES.MODERATE.text }}>({h.state})</span>
                  <span style={{ marginLeft: "6px", color: C.TEXT_3 }}>{h.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── External links ── */}
          {externalLinks.length > 0 && (
            <div>
              <div style={{ ...SEC, color: FLAG_STYLES.MODERATE.text }}>External Links / Named Ranges</div>
              {externalLinks.map((e, i) => (
                <div key={i} style={{ fontSize: TF.BODY, color: C.TEXT_2, marginBottom: "4px" }}>
                  <span style={{ color: C.TEXT_3 }}>{e.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Formula residue ── */}
          {formulaResidue.length > 0 && (
            <div>
              <div style={{ ...SEC, color: FLAG_STYLES.MODERATE.text }}>Formula residue</div>
              <EvidenceTable
                columns={[{label:"Column"},{label:"Formulas"},{label:"Sample"}]}
                identifierColumns={1}
                maxHeight={0}
                rows={formulaResidue.map(f => [
                  {value: f.column, style: {color: CC.OBS, fontWeight: FW.SEMI}},
                  {value: `${f.count} — ${f.rowNote || `${f.percentage}% of column`}`, style: {color: FLAG_STYLES.HIGH.text, fontWeight: FW.SEMI}},
                  f.samples?.join(", ")?.substring(0, 80) || "—",
                ])}
              />
            </div>
          )}

          {/* ── All clear ── */}
          {findings.length === 0 && (
            <div style={{ fontSize: TF.BODY, color: SIGNAL.GREEN.text, marginTop: "8px" }}>
              No formatting anomalies or provenance concerns detected.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Reusable table for font/format anomalies (column + rows + description). */
function AnomalyTable({ items }) {
  return (
    <EvidenceTable
      columns={[{label:"Column"},{label:"Affected rows"},{label:"Description"}]}
      identifierColumns={1}
      maxHeight={0}
      rows={items.map(a => [
        {value: a.column, style: {color: CC.OBS, fontWeight: FW.SEMI}},
        {value: `${a.rows.slice(0, 12).join(", ")}${a.rows.length > 12 ? ` +${a.rows.length - 12} more` : ""}`, style: {color: FLAG_STYLES.HIGH.text, fontWeight: FW.SEMI}},
        {value: a.description, style: {color: C.TEXT_3}},
      ])}
    />
  );
}

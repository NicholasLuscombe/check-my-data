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
import { C, FS, FW, FF, CR, CC, ACCENT, SEV_VERDICT, SIGNAL } from "../../constants/tokens.js";
import { FLAG_STYLES } from "../../constants/thresholds.js";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";

// S150 (C.8 / B4): sub-section header. Pre-S150 carried ALL CAPS + letterSpacing
// 0.08em + FW.BOLD + 11px; now co-consumes the Mini-card sub-section label
// (SUB_HEAD) register — sm Semibold C.TEXT_3 sans, sentence case. Each consumer
// overrides `color` with a tier hue per section flag.
const SEC = { fontFamily: FF.UI, fontSize: FS.sm, fontWeight: FW.SEMI, color: C.TEXT_3, marginBottom: "6px", marginTop: "12px" };

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
          <span style={{ fontFamily: FF.UI, fontSize: FS.md, color: C.TEXT, fontWeight: FW.SEMI }}>
            Excel file forensics
          </span>
          {/* S152 (A3): bounded FlagBadge retired in favour of A6 "Severity
              label" register — bare-text xs Semibold tier sans, ⚠/dot glyph
              preserved per "alarm marker, separate from chrome" rule. Text
              colour migrated from FLAG_STYLES[flag].text → SEV_VERDICT[s].color
              (closes the cross-surface hue/saturation drift FindingPill.jsx:15-22
              comment flags). Glyph fill stays on FLAG_STYLES[flag].dot — alarm
              colour is independent of the typography hierarchy. Label copy
              preserved verbatim from FLAG_STYLES[flag].label. */}
          {(() => {
            const sevColor =
              flag === "HIGH" || flag === "ERROR" ? SEV_VERDICT[3].color
              : flag === "MODERATE"               ? SEV_VERDICT[2].color
              : flag === "LOW"                    ? SEV_VERDICT[0].color
              :                                     C.TEXT_3;
            const dotColor = flag === "ERROR" ? SIGNAL.RED.dot : (FLAG_STYLES[flag] || FLAG_STYLES["N/A"]).dot;
            const label = (FLAG_STYLES[flag] || FLAG_STYLES["N/A"]).label;
            return (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px",
                fontFamily: FF.UI, fontSize: FS.xs, fontWeight: FW.SEMI, color: sevColor, whiteSpace: "nowrap" }}>
                {flag === "ERROR"
                  ? <span style={{ fontSize: "10px", lineHeight: 1, flexShrink: 0 }} aria-hidden="true">⚠</span>
                  : <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor, flexShrink: 0 }}/>}
                {label}
              </span>
            );
          })()}
        </div>
        {/* Chevron glyph — hardcoded size per TYPOGRAPHY-SYSTEM.md §"What this system does NOT cover" (icon carve-out). */}
        <span style={{ fontFamily: FF.UI, fontSize: "13px", color: C.TEXT_3, userSelect: "none" }}>{open ? "▾" : "▸"}</span>
      </div>

      {/* Summary line */}
      <div style={{ fontSize: FS.base, color: C.TEXT_2, marginTop: "6px", lineHeight: "1.5" }}>
        {provenance.creator && <span>Creator: <strong>{provenance.creator}</strong></span>}
        {provenance.lastModifiedBy && <span>{provenance.creator ? " · " : ""}Last modified by: <strong>{provenance.lastModifiedBy}</strong></span>}
        {chips.length > 0 && (
          <span style={{ marginLeft: "8px", color: flag === "HIGH" ? SEV_VERDICT[3].color : SEV_VERDICT[2].color, fontWeight: FW.SEMI }}>
            — {chips.join(", ")}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop: "12px" }}>
          {/* ── Provenance ── */}
          {/* Provenance rows are paired-fact identity-row-pattern (label | value)
              per TYPOGRAPHY-SYSTEM.md §"Identity row pattern": base Regular sans,
              colour split between C.TEXT_3 label and C.TEXT value. */}
          <table style={{ borderCollapse: "collapse", fontSize: FS.base, fontFamily: FF.UI, marginBottom: "4px" }}>
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
                  <td style={{ padding: "3px 0", color: provenance.creatorMismatch ? SEV_VERDICT[2].color : C.TEXT, fontWeight: provenance.creatorMismatch ? FW.SEMI : FW.NORM }}>
                    {provenance.lastModifiedBy}
                    {provenance.creatorMismatch && <span style={{ marginLeft: "8px", fontSize: FS.xs, color: SEV_VERDICT[2].color }}>⚠ differs from creator</span>}
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
              <div style={{ ...SEC, color: SEV_VERDICT[2].color }}>Temporal anomalies</div>
              {temporalFlags.map((t, i) => (
                <div key={i} style={{ fontSize: FS.base, color: SEV_VERDICT[2].color, marginBottom: "4px" }}>⚠ {t.description}</div>
              ))}
            </div>
          )}

          {/* ── Font anomalies ── */}
          {fontAnomalies.length > 0 && (
            <div>
              <div style={{ ...SEC, color: SEV_VERDICT[3].color }}>Font metadata anomalies</div>
              <AnomalyTable items={fontAnomalies} />
            </div>
          )}

          {/* ── Number format anomalies ── */}
          {formatAnomalies.length > 0 && (
            <div>
              <div style={{ ...SEC, color: SEV_VERDICT[2].color }}>Number format inconsistencies</div>
              <AnomalyTable items={formatAnomalies} />
            </div>
          )}

          {/* ── Hidden sheets ── */}
          {hiddenSheets.length > 0 && (
            <div>
              <div style={{ ...SEC, color: SEV_VERDICT[2].color }}>Hidden sheets</div>
              {hiddenSheets.map((h, i) => (
                <div key={i} style={{ fontSize: FS.base, color: C.TEXT_2, marginBottom: "4px" }}>
                  <strong style={{ color: CC.OBS }}>{h.name}</strong>
                  <span style={{ marginLeft: "6px", fontSize: FS.xs, color: SEV_VERDICT[2].color }}>({h.state})</span>
                  <span style={{ marginLeft: "6px", color: C.TEXT_3 }}>{h.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── External links ── */}
          {externalLinks.length > 0 && (
            <div>
              <div style={{ ...SEC, color: SEV_VERDICT[2].color }}>External links / named ranges</div>
              {externalLinks.map((e, i) => (
                <div key={i} style={{ fontSize: FS.base, color: C.TEXT_2, marginBottom: "4px" }}>
                  <span style={{ color: C.TEXT_3 }}>{e.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Formula residue ── */}
          {formulaResidue.length > 0 && (
            <div>
              <div style={{ ...SEC, color: SEV_VERDICT[2].color }}>Formula residue</div>
              <EvidenceTable
                columns={[{label:"Column"},{label:"Formulas"},{label:"Sample"}]}
                identifierColumns={1}
                maxHeight={0}
                rows={formulaResidue.map(f => [
                  {value: f.column, style: {color: CC.OBS, fontWeight: FW.SEMI}},
                  {value: `${f.count} — ${f.rowNote || `${f.percentage}% of column`}`, style: {color: SEV_VERDICT[3].color, fontWeight: FW.SEMI}},
                  f.samples?.join(", ")?.substring(0, 80) || "—",
                ])}
              />
            </div>
          )}

          {/* ── All clear ── */}
          {findings.length === 0 && (
            <div style={{ fontSize: FS.base, color: SEV_VERDICT[0].color, marginTop: "8px" }}>
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
        {value: `${a.rows.slice(0, 12).join(", ")}${a.rows.length > 12 ? ` +${a.rows.length - 12} more` : ""}`, style: {color: SEV_VERDICT[3].color, fontWeight: FW.SEMI}},
        {value: a.description, style: {color: C.TEXT_3}},
      ])}
    />
  );
}

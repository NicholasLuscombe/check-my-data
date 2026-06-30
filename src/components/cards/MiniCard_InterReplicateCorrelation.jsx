/* ── MiniCard: Inter-Replicate Correlation ── */

import { C, CC, FS, FW, FF, OBS } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { TIER_COLOR, cellTextOn, compositeOver } from "../shared/heatmapColors.js";
import { COND_COLORS, buildCondColorMap } from "../../constants/roles.js";
import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { CorrMatrixSVG } from "../plots/CorrMatrixSVG.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { shortColName, makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


export function MiniCard_InterReplicateCorrelation({ result, importConfig, rowMap }) {
  // Producer emits 1-indexed matrix rows in w.startRow/w.endRow; render file
  // rows so the card matches the §2 highlight's `#` column.
  const { toFileRow } = makeRowMapper(importConfig, rowMap);
  const details = result.details || [];
  const sub = result.subDetails || [];
  const name = result.name;
  const isAgg = result.groupsAssessed !== undefined;
const pairDetails=(details||[]).filter(d=>!d.source); // exclude windowed entries
const rVals=pairDetails.map(d=>parseFloat(d.r)).filter(v=>!isNaN(v));
if(!rVals.length) return null;
const nSusp = result.nSuspicious || 0;
const wins=(details||[]).filter(d=>d.source==="window");

// ── Build per-condition replicate name lookup ──
// Maps condition name → ordered array of short replicate names
// Pair number N (1-indexed) → condColNames[condition][N-1]
const hdrs = importConfig?.hdrs || [];
const roles = importConfig?.roles || [];
const condPerCol = importConfig?.condPerCol || null;
const condColorMap = buildCondColorMap(importConfig);
const condCell = (name) => { const color = condColorMap[name]?.text; return color ? {value: name, style: {color}} : name; };
const dataColMap = roles.map((r,i) => r === "data" ? i : -1).filter(i => i >= 0);
const condColNames = {};
if (condPerCol) {
  // Multi-condition: group data columns by condition
  for (let i = 0; i < hdrs.length; i++) {
    if (roles[i] !== "data") continue;
    const cond = condPerCol[i] || "All data";
    if (!condColNames[cond]) condColNames[cond] = [];
    condColNames[cond].push(shortColName(hdrs[i]));
  }
} else {
  // Single condition: all data columns
  const names = dataColMap.map(ci => hdrs[ci] || `Col ${ci + 1}`);
  condColNames["All data"] = names;
}
// Resolve a pair string "1–2" to replicate names "R1–R2" for a condition
const repName = (colNum, cond) => {
  const names = condColNames[cond];
  if (names && colNum >= 1 && colNum <= names.length) return names[colNum - 1];
  return String(colNum);
};
const pairLabel = (pairStr, cond) => {
  const [a, b] = pairStr.split("\u2013").map(Number);
  return `${repName(a, cond)}\u2013${repName(b, cond)}`;
};

// ── Build per-condition correlation matrices for heatmap ──
const condMap = {};
for (const d of pairDetails) {
  if (!condMap[d.condition]) condMap[d.condition] = [];
  condMap[d.condition].push(d);
}
const condNames = Object.keys(condMap);
const matrices = condNames.map(cond => {
  const pairs = condMap[cond];
  const colSet = new Set();
  pairs.forEach(p => { const [a,b] = p.pair.split("\u2013").map(Number); colSet.add(a); colSet.add(b); });
  const cols = [...colSet].sort((a,b) => a - b);
  const idx = {}; cols.forEach((c,i) => idx[c] = i);
  const mat = Array.from({length:cols.length}, () => Array(cols.length).fill(null));
  pairs.forEach(p => {
    const [a,b] = p.pair.split("\u2013").map(Number);
    mat[idx[a]][idx[b]] = p; mat[idx[b]][idx[a]] = p;
  });
  return { cond, cols, mat };
});

// Cell colour — two tiers (same filter as highlight spec):
// Red = globally suspicious (dual-gated outlier pair). Slate = expected.
// Windowed pairs are informational only (shown in the evidence table below).
const cellBg = (p) => {
  if (!p) return C.BORDER_L;
  if (p.isPromotionTrigger) return TIER_COLOR.HIGH;
  return CC.OBS;
};
// Cleared (observed CC.OBS) tiles render at OBS.solid opacity; flagged tiles stay
// full-opacity tier colour. Digit colour is picked off the COMPOSITED appearance
// so it stays legible as the tile softens (compositeOver α=1 → bg unchanged).
const cellOp = (p) => (p && !p.isPromotionTrigger) ? OBS.solid.fillOpacity : 1;
const cellTxt = (p) => cellTextOn(compositeOver(cellBg(p), cellOp(p), C.BG));

// Legend items
const legend = [
  { color: CC.OBS, label: "Within expected range", opacity: OBS.solid.fillOpacity },
];
if (nSusp > 0) legend.push({ color: TIER_COLOR.HIGH, label: "Highly correlated (outlier pair)" });

// All flagged windows, sorted by observed r desc then condition
const topWins = [...wins].sort((a, b) => {
  const rd = parseFloat(b.rWin) - parseFloat(a.rWin);
  if (rd !== 0) return rd;
  return (a.condition || "").localeCompare(b.condition || "");
});

// -- Surface hierarchy (S290): the per-pair correlation heatmap is the lead
// surface -- the pairwise unit's honest object. It always shows when per-pair
// data exists (guaranteed past the early return above); an all-within-range
// matrix is meaningful evidence, not dead weight. The windowed arm follows
// beneath it.

// Matrix surface -- the legend travels with the matrix wherever it sits.
const matrixSurface = (
  <>
    {/* S210 (multi-surface): primary-surface heading dropped — the footer
        fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
    <PlotLayout fitContent>
        <div style={{display:"flex",flexWrap:"wrap",gap:"12px",alignItems:"flex-start",justifyContent:"center"}}>
          {matrices.map(({cond, cols, mat}) => {
            const colNames = cols.map(c => repName(c, cond));
            const idx = {}; cols.forEach((c,i) => idx[c] = i);
            // Build name→index lookup for getValue
            const nameToIdx = {}; cols.forEach((c, i) => { nameToIdx[colNames[i]] = i; });
            return (
              <div key={cond} style={{flex:"0 0 auto"}}>
                <CorrMatrixSVG
                  labels={colNames}
                  getValue={(rowL, colL) => mat[nameToIdx[rowL]]?.[nameToIdx[colL]] || null}
                  formatCell={p => { const r = p ? parseFloat(p.r) : null; return r != null ? r.toFixed(2) : ""; }}
                  cellBg={cellBg} cellText={cellTxt} cellBold={p => !!p?.isPromotionTrigger}
                  cellOpacity={cellOp}
                  title={condNames.length > 1 ? cond : undefined}
                  titleColor={condNames.length > 1 ? (condColorMap[cond]?.text || COND_COLORS[condNames.indexOf(cond) % COND_COLORS.length].text) : undefined}
                />
              </div>
            );
          })}
        </div>
    </PlotLayout>
    <ChartLegend items={legend} />
  </>
);

// Windows table -- only built when windowed entries exist (the leading surface
// whenever present, per the hierarchy above).
const windowsTable = (
      <div style={{marginTop: BLOCK_GAP}}>
        {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
        <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Highly correlated row windows</div>
        <EvidenceTable
          columns={condNames.length > 1 ? ["Condition", "Columns", "Rows", "Observed r", "Expected r", "Adj. p", "Flag"] : ["Columns", "Rows", "Observed r", "Expected r", "Adj. p", "Flag"]}
          rows={topWins.map(w => {
            // The window-promotion decision: the scan-statistic permutation p
            // (shared across the flagged window family \u2014 the max-statistic
            // carries the multiplicity correction) and the engine's per-window
            // `significant` mark. A flagged window is the verdict's visible
            // driver, so it reads red ("Flagged", CC.THRESH \u2014 channel 4 data
            // model) per PLOT-COLOUR-SEMANTICS; the label is exactly "Flagged".
            const flagCell = w.significant === true
              ? { value: "Flagged", style: { color: CC.THRESH, fontWeight: FW.SEMI } }
              : { value: "\u2014", style: { color: C.TEXT_3 } };
            const base = [
              pairLabel(w.pair, w.condition || "All data"),
              `${toFileRow(w.startRow)}\u2013${toFileRow(w.endRow)}`,
              Number(w.rWin).toFixed(2),
              Number(w.baseline).toFixed(2),
              fmtP(w.scanP),
              flagCell,
            ];
            return condNames.length > 1 ? [condCell(w.condition), ...base] : base;
          })}
          identifierColumns={condNames.length > 1 ? 3 : 2}
          footerText={topWins.length < result.nWindowsTested ? `Showing ${topWins.length} of ${result.nWindowsTested}. Adjusted p is the scan-statistic permutation p shared across the flagged window family.` : "Adjusted p is the scan-statistic permutation p shared across the flagged window family."}
        />
      </div>
);

// Shown only when no windowed ranges exist and the test still flagged.
const noWindowsMessage = (topWins.length === 0 && result.flag !== "LOW") ? (
      <div style={{marginTop:"12px",fontSize:FS.base,fontFamily:FF.UI,color:C.TEXT}}>
        No localised row ranges detected — elevated correlation is uniform across all rows.
      </div>
) : null;

return (

  <MiniCardLayout result={result}
    footer={result.flag !== "LOW" && result.flag !== "N/A"
      ? "Replicates correlate more closely than expected"
      : "Replicates correlate as expected"}
    lookFor={wins.length > 0 ? "The scan found a stretch of rows where replicates agree more closely than elsewhere. Inspect the raw data files for those rows: check whether they match a particular condition, were added from a different source, or are copies of one another." : "One or more replicate pairs correlate more strongly than the dataset's signal-to-noise ratio expects. Check whether those columns might be copies or near-copies. Inspect the raw data files to confirm the submitted values arise from independent measurements." }
    implications="Replicates that correlate unusually closely can reflect a high signal-to-noise experiment, where a strong biological signal dominates the random scatter. They can also indicate that one replicate was derived from another; e.g., copied and given small perturbations to make it look like an independent measurement.">

    {result.highSNRWarning&&(
      <CardBanner type="warn">
        <strong>High-SNR data</strong> — ICC-predicted r ≈ {result.iccPredicted}. When signal greatly
        exceeds noise, r near 1.0 is expected and not suspicious.
      </CardBanner>
    )}

    {/* Lead surface (S290): the per-pair correlation heatmap — the pairwise
        unit's honest object. Cells colour on the engine's `isPromotionTrigger`
        (a pair that drove the verdict reads red), so flag-gating is inherited,
        not re-derived. */}
    {matrixSurface}

    {/* Connector (window-driven branch): when the card flagged but no whole
        replicate pair is anomalous (every heatmap cell stays within range), the
        driver is the localised row windows — point the reader there. */}
    {result.flag !== "LOW" && result.flag !== "N/A"
      && !pairDetails.some(d => d.isPromotionTrigger === true)
      && wins.length > 0 && (
      <div style={{...SUB_HEAD, marginTop: "6px", marginBottom: 0, color: C.TEXT_3, fontWeight: FW.NORM}}>
        No single replicate pair is anomalous overall — the verdict is driven by the localised row windows shown below.
      </div>
    )}

    {/* Windowed arm beneath the heatmap: the row-window evidence table when
        localised ranges exist, otherwise the no-windows message. */}
    <div style={{ marginTop: BLOCK_GAP }}>
      {wins.length > 0 ? windowsTable : noWindowsMessage}
    </div>


  </MiniCardLayout>

);

}

/* ── MiniCard: Inter-Replicate Correlation ── */

import { C, FS, FW, FF } from "../../constants/tokens.js";
import { TIER_COLOR, cellTextOn } from "../shared/heatmapColors.js";
import { COND_COLORS, buildCondColorMap } from "../../constants/roles.js";
import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { CorrMatrixSVG } from "../plots/CorrMatrixSVG.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { classifyIrcPairs } from "../../analysis/buildHighlightSpec.js";
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
const condColorMap = buildCondColorMap(condPerCol);
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

// ── Two-tier classification via shared utility ──
const { elevatedConds } = classifyIrcPairs(result);

// Cell colour — two tiers (same filter as highlight spec):
// Red = globally suspicious. Amber = elevated condition. Blue = expected.
// Windowed pairs are informational only (shown in the evidence table below).
const cellBg = (p) => {
  if (!p) return C.BORDER_L;
  if (p.suspicious) return TIER_COLOR.HIGH;
  if (elevatedConds.has(p.condition)) return TIER_COLOR.MID;
  return TIER_COLOR.LOW;
};
const cellTxt = (p) => cellTextOn(cellBg(p));

// Legend items
const legend = [
  { color: TIER_COLOR.LOW, label: "Expected" },
  { color: TIER_COLOR.MID, label: "Elevated replicates" },
];
if (nSusp > 0) legend.push({ color: TIER_COLOR.HIGH, label: "Highly correlated (outlier pair)" });

// All flagged windows, sorted by observed r desc then condition
const topWins = [...wins].sort((a, b) => {
  const rd = parseFloat(b.rWin) - parseFloat(a.rWin);
  if (rd !== 0) return rd;
  return (a.condition || "").localeCompare(b.condition || "");
});

return (

  <MiniCardLayout result={result}
    footer={result.flag !== "LOW" && result.flag !== "N/A"
      ? "Replicates correlate more closely than expected"
      : "Replicates correlate as expected"}
    lookFor={wins.length > 0 ? "The windowed scan found a stretch of rows where replicates agree more closely than elsewhere. Check whether those rows correspond to a particular experimental group or were added later. Ask for the raw instrument output to verify that the submitted replicates are distinct measurements." : "One or more replicate pairs correlate more strongly than the dataset's signal-to-noise ratio predicts. Check whether those columns might be copies or near-copies of each other. Compare the original instrument files against the submitted data to confirm independent measurements." }
    implications="Replicates that track each other unusually closely can reflect a high signal-to-noise ratio experiment where the true biological signal dominates random noise. They can also indicate that one replicate was derived from another — for example, by copying a column and adding small perturbations.">

    {result.highSNRWarning&&(
      <CardBanner type="warn">
        <strong>High-SNR data</strong> — ICC-predicted r ≈ {result.iccPredicted}. When signal greatly
        exceeds noise, r near 1.0 is expected and not suspicious.
      </CardBanner>
    )}
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
                  cellBg={cellBg} cellText={cellTxt} cellBold={p => !!p?.suspicious}
                  title={condNames.length > 1 ? cond : undefined}
                  titleColor={condNames.length > 1 ? (condColorMap[cond]?.text || COND_COLORS[condNames.indexOf(cond) % COND_COLORS.length].text) : undefined}
                />
              </div>
            );
          })}
        </div>
    </PlotLayout>
    <ChartLegend items={legend} />
    {topWins.length > 0 && (
      <div style={{marginTop: BLOCK_GAP}}>
        {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
        <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Highly correlated row windows</div>
        <EvidenceTable
          columns={condNames.length > 1 ? ["Condition", "Columns", "Rows", "Observed r", "Expected r"] : ["Columns", "Rows", "Observed r", "Expected r"]}
          rows={topWins.map(w => condNames.length > 1
            ? [condCell(w.condition), pairLabel(w.pair, w.condition), `${toFileRow(w.startRow)}\u2013${toFileRow(w.endRow)}`, Number(w.rWin).toFixed(2), Number(w.baseline).toFixed(2)]
            : [pairLabel(w.pair, w.condition || "All data"), `${toFileRow(w.startRow)}\u2013${toFileRow(w.endRow)}`, Number(w.rWin).toFixed(2), Number(w.baseline).toFixed(2)]
          )}
          identifierColumns={condNames.length > 1 ? 3 : 2}
          footerText={topWins.length < result.nWindowsTested ? `Showing ${topWins.length} of ${result.nWindowsTested}.` : undefined}
        />
      </div>
    )}
    {topWins.length === 0 && result.flag !== "LOW" && (
      <div style={{marginTop:"12px",fontSize:FS.base,fontFamily:FF.UI,color:C.TEXT}}>
        No localised row ranges detected — elevated correlation is uniform across all rows.
      </div>
    )}


  </MiniCardLayout>

);

}

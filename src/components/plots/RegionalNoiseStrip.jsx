import { CC, CP, CS, C, FF, CF, FW } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { stripTicks } from "./stripTicks.js";

// Regional Noise position strip: shows WHERE anomalous windows land per column
// colNames: array mapping 1-indexed anomCol → display name
// toFileRow: fn(matrixRow1) → spreadsheet row number
export function RegionalNoiseStrip({ details, nRows, colNames, toFileRow, yAxisTitle = "Column" }) {
  if(!details?.length || !nRows) return null;
  // Parse details: rows="31–45", anomCol="2", ratio="9.80×"
  const windowsByCol = {};
  let maxRatio = 0;
  for(const d of details) {
    const m = String(d.rows).match(/(\d+)\D+(\d+)/);
    if(!m) continue;
    const start = parseInt(m[1]), end = parseInt(m[2]);
    const col = String(d.anomCol);
    const ratioNum = parseFloat(d.ratio) || 1;
    if(ratioNum > maxRatio) maxRatio = ratioNum;
    if(!windowsByCol[col]) windowsByCol[col] = [];
    windowsByCol[col].push({ start, end, ratio: d.ratio, ratioNum });
  }
  const cols = Object.keys(windowsByCol).sort((a,b) => parseInt(a)-parseInt(b));
  if(!cols.length) return null;

  // Left-axis label text per row (column name, pass×cond key, or "Col N").
  const labelFor = col => (colNames && colNames[parseInt(col)]) || ("Col " + col);
  const maxLabelLen = Math.max(...cols.map(c => labelFor(c).length), 1);

  // Left pad adapts to the longest left label. With a rotated y-axis title
  // (Region-to-region noise, "Column") it clears the title at x=8 and floors
  // at 72 so that consumer renders exactly as before. With no title (Blocked
  // Mahalanobis — rows are already labelled inline) the title's reserved
  // space is reclaimed: smaller pad + lower floor, no blank gutter.
  const W=CP.W, ROW_H=16, GAP=4, PR=16, PT=8, PB=38;
  const PL=Math.max(yAxisTitle ? 72 : 24, Math.ceil(maxLabelLen * 6) + (yAxisTitle ? 24 : 10));
  const CW=W-PL-PR;
  const H = PT + cols.length*(ROW_H+GAP) + PB;
  const xs = r => PL + ((r-1)/(nRows)) * CW;

  // Map tick values to file rows
  const ticks = stripTicks(nRows);
  const fn = toFileRow || (r => r);

  // Opacity ramp: ratio 1× → 0.15, maxRatio → 0.7
  const opacityForRatio = (r) => {
    if(maxRatio <= 1) return 0.4;
    const t = Math.min((r - 1) / (maxRatio - 1), 1);
    return 0.15 + t * 0.55;
  };

  return (
    <PlotSVG W={W} H={H}>
      {/* Y-axis label — omitted entirely when no title (no empty <text>, so
          the reclaimed left pad reads as tighter chrome, not a blank gutter). */}
      {yAxisTitle && (
        <text x={8} y={PT + cols.length*(ROW_H+GAP)/2} textAnchor="middle"
          fontSize={CF.AXIS} fill={C.TEXT_2} fontFamily={FF.UI} transform={`rotate(-90,8,${PT + cols.length*(ROW_H+GAP)/2})`}>{yAxisTitle}</text>
      )}
      {cols.map((col, ci) => {
        const y = PT + ci*(ROW_H+GAP);
        const wins = windowsByCol[col];
        const label = labelFor(col);
        return (
          <g key={ci}>
            <text x={PL-6} y={y+ROW_H/2+3.5} fontSize={CF.LABEL} fill={C.TEXT_2}
              textAnchor="end" fontFamily={FF.UI} fontWeight={FW.SEMI}>{label}</text>
            <rect x={PL} y={y} width={CW} height={ROW_H} rx="2"
              fill={C.BG} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
            {wins.map((w,wi) => {
              const x1 = xs(w.start), x2 = xs(w.end+1);
              const op = opacityForRatio(w.ratioNum);
              return (
                <rect key={wi} x={x1} y={y+1} width={Math.max(x2-x1, 4)} height={ROW_H-2}
                  fill={CC.THRESH} rx="2" opacity={op}>
                  <title>Rows {fn(w.start)}–{fn(w.end)}: {w.ratio} variance ratio</title>
                </rect>
              );
            })}
          </g>
        );
      })}
      {/* X-axis: "Row" label + tick marks using file row numbers */}
      <text x={PL+CW/2} y={H-2} fontSize={CF.AXIS} fill={C.TEXT_2} textAnchor="middle" fontFamily={FF.UI}>Row</text>
      {ticks.map(t => (
        <text key={t} x={xs(t)} y={H-16} fontSize={CF.SMALL} fill={C.TEXT_2}
          textAnchor="middle" fontFamily={FF.MONO}>{fn(t)}</text>
      ))}
    </PlotSVG>
  );
}

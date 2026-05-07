import { CC, CP, CS, C, FF, CF, FW } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { stripTicks } from "./stripTicks.js";

// Constant-Offset position strip: shows WHERE blocks cluster along the row axis
export function ConstOffsetStrip({ details, nRows }) {
  if(!details?.length || !nRows) return null;
  // Parse positions: "35–36" → row 35
  const blocksByPair = {};
  for(const d of details) {
    const m = String(d.positions).match(/(\d+)/);
    if(!m) continue;
    const row = parseInt(m[1]);
    if(!blocksByPair[d.pair]) blocksByPair[d.pair] = [];
    blocksByPair[d.pair].push({ row, diff: d.diff });
  }
  const pairs = Object.keys(blocksByPair);
  if(!pairs.length) return null;

  const W=CP.W, ROW_H=14, GAP=3, PL=54, PR=16, PT=8, PB=24;
  const CW=W-PL-PR;
  const H = PT + pairs.length*(ROW_H+GAP) + PB;
  const xs = r => PL + ((r-1)/(nRows-1)) * CW;

  const ticks = stripTicks(nRows);

  return (
    <PlotSVG W={W} H={H}>
      {pairs.map((pair, pi) => {
        const y = PT + pi*(ROW_H+GAP);
        const blocks = blocksByPair[pair];
        return (
          <g key={pi}>
            {/* pair label */}
            <text x={PL-6} y={y+ROW_H/2+3.5} fontSize={CF.LABEL} fill={C.TEXT_2}
              textAnchor="end" fontFamily={FF.UI} fontWeight={FW.SEMI}>{pair}</text>
            {/* row strip background */}
            <rect x={PL} y={y} width={CW} height={ROW_H} rx="2"
              fill={C.BG} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
            {/* block markers */}
            {blocks.map((b,bi) => (
              <rect key={bi} x={xs(b.row)-2} y={y+1} width={4} height={ROW_H-2}
                fill={CC.THRESH} rx="1" opacity="0.85">
                <title>Row {b.row}: offset {b.diff}</title>
              </rect>
            ))}
          </g>
        );
      })}
      {/* x axis ticks */}
      {ticks.map(t => (
        <text key={t} x={xs(t)} y={H-4} fontSize={CF.SMALL} fill={C.TEXT_4}
          textAnchor="middle" fontFamily={FF.MONO}>{t}</text>
      ))}
    </PlotSVG>
  );
}

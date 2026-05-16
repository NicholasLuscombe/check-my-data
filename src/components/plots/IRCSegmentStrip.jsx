import { CC, CP, CS, C, FF, CF, FW } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { stripTicks } from "./stripTicks.js";

// IRC Segment Strip: shows WHERE windowed-scan segments land per pair
// Each row = one pair, coloured rectangles = row ranges with elevated r
export function IRCSegmentStrip({ windows, nRows }) {
  if(!windows?.length || !nRows || nRows < 10) return null;
  // Group by pair
  const byPair = {};
  for(const w of windows) {
    const key = `${w.condition ? w.condition + " " : ""}${w.pair}`;
    if(!byPair[key]) byPair[key] = [];
    byPair[key].push(w);
  }
  const pairs = Object.keys(byPair);
  if(!pairs.length) return null;

  const W=CP.W, ROW_H=14, GAP=3, PL=70, PR=16, PT=8, PB=24;
  const CW=W-PL-PR;
  const H = PT + pairs.length*(ROW_H+GAP) + PB;
  const xs = r => PL + ((r-1)/(nRows)) * CW;

  const ticks = stripTicks(nRows);

  // Colour by excess: higher excess = more opaque red
  const maxExcess = Math.max(...windows.map(w => w.rExcess || 0), 0.01);
  const opacity = w => 0.25 + 0.60 * Math.min(1, (w.rExcess || 0) / maxExcess);

  return (
    <PlotSVG W={W} H={H}>
      {pairs.map((pair, pi) => {
        const y = PT + pi*(ROW_H+GAP);
        const segs = byPair[pair];
        return (
          <g key={pi}>
            <text x={PL-6} y={y+ROW_H/2+3.5} fontSize={CF.SMALL} fill={C.TEXT_2}
              textAnchor="end" fontFamily={FF.UI} fontWeight={FW.SEMI}>{pair}</text>
            <rect x={PL} y={y} width={CW} height={ROW_H} rx="2"
              fill={C.BG} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
            {segs.map((w,wi) => {
              const x1 = xs(w.startRow), x2 = xs(w.endRow+1);
              return (
                <rect key={wi} x={x1} y={y+1} width={Math.max(x2-x1, 4)} height={ROW_H-2}
                  fill={CC.THRESH} rx="2" opacity={opacity(w)}>
                  <title>Rows {w.startRow}–{w.endRow}: r={w.rWin} (excess {w.excess})</title>
                </rect>
              );
            })}
          </g>
        );
      })}
      {ticks.map(t => (
        <text key={t} x={xs(t)} y={H-4} fontSize={CF.SMALL} fill={C.TEXT_3}
          textAnchor="middle" fontFamily={FF.MONO}>{t}</text>
      ))}
    </PlotSVG>
  );
}

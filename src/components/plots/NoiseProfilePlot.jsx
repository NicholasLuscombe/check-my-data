import { CC, CP, CS, C, FF, CF, OBS } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

export function NoiseProfilePlot({ noiseProfile, changepointRow, secondaryRow, toFileRow, W=CP.W, H=180 }) {
  if (!noiseProfile || noiseProfile.length < 5) return null;
  const PL = 48, PR = 14, PT = 14, PB = 28;
  const CW = W - PL - PR, CH = H - PT - PB;
  const pts = noiseProfile;
  const xMin = pts[0].row, xMax = pts[pts.length - 1].row;
  const xRange = xMax - xMin || 1;
  const noiseMax = Math.max(...pts.map(p => p.noise)) * 1.1;
  const px = r => PL + ((r - xMin) / xRange) * CW;
  const py = v => PT + CH - (v / noiseMax) * CH;
  const fn = toFileRow || (r => r);

  const cpRow = changepointRow;

  // Y ticks
  const ySteps = [0.25, 0.5, 0.75, 1].map(f => f * noiseMax).filter(v => v > 0);

  // X ticks — use matrix row numbers for positioning, display as file rows
  const xTicks = [];
  const step = Math.pow(10, Math.floor(Math.log10(xRange))) || 10;
  const xStep = step > xRange / 2 ? Math.round(step / 5) : step;
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) xTicks.push(x);
  if (xTicks.length < 2) xTicks.push(xMin, xMax);

  const obsPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.row).toFixed(1)},${py(p.noise).toFixed(1)}`).join("");
  const fitPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.row).toFixed(1)},${py(p.fit).toFixed(1)}`).join("");

  return (
    <PlotSVG W={W} H={H} overflow>
      {/* Axes */}
      <line x1={PL} y1={PT} x2={PL} y2={PT + CH} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      <line x1={PL} y1={PT + CH} x2={PL + CW} y2={PT + CH} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      {/* Y grid */}
      {ySteps.map(v => (
        <g key={v}>
          <line x1={PL} y1={py(v)} x2={PL + CW} y2={py(v)} stroke={C.GRID} strokeWidth={CS.GRID.w}/>
          <text x={PL - 4} y={py(v) + 3} fontSize={CF.SMALL} fill={C.TEXT_2} textAnchor="end" fontFamily={FF.MONO}>
            {v < 0.01 ? v.toExponential(0) : v < 1 ? v.toFixed(2) : v.toFixed(1)}
          </text>
        </g>
      ))}
      {/* X ticks — display file row numbers */}
      {xTicks.map(x => (
        <g key={x}>
          <line x1={px(x)} y1={PT + CH} x2={px(x)} y2={PT + CH + 4} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
          <text x={px(x)} y={PT + CH + 14} fontSize={CF.SMALL} fill={C.TEXT_2} textAnchor="middle" fontFamily={FF.MONO}>{fn(x)}</text>
        </g>
      ))}
      {/* Observed noise — dots + line */}
      <path d={obsPath} fill="none" stroke={OBS.line.stroke} strokeWidth={CS.DATA.w} strokeOpacity={OBS.line.strokeOpacity}/>
      {pts.length <= 120 && pts.map((p, i) => (
        <circle key={i} cx={px(p.row)} cy={py(p.noise)} r={CS.PT_SM.r} fill={OBS.dot.fill} fillOpacity={OBS.dot.fillOpacity}/>
      ))}
      {/* LOESS fit */}
      <path d={fitPath} fill="none" stroke={OBS.line.stroke} strokeWidth={CS.FIT.w} strokeOpacity={OBS.line.strokeOpacity}/>
      {/* Changepoint line */}
      {cpRow != null && (
        <g>
          <line x1={px(cpRow)} y1={PT} x2={px(cpRow)} y2={PT + CH}
            stroke={CC.THRESH} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
          <text x={px(cpRow) + 4} y={PT + 10} fontSize={CF.SMALL} fill={CC.THRESH} fontFamily={FF.MONO}>
            rows {fn(cpRow - 1)} &amp; {fn(cpRow)}
          </text>
        </g>
      )}
      {/* Secondary changepoint line (dotted, lighter) */}
      {secondaryRow != null && (
        <g>
          <line x1={px(secondaryRow)} y1={PT} x2={px(secondaryRow)} y2={PT + CH}
            stroke={CC.THRESH} strokeWidth={1} strokeDasharray="2,3" opacity="0.5"/>
          <text x={px(secondaryRow) + 4} y={PT + 22} fontSize={CF.SMALL} fill={CC.THRESH} opacity="0.7" fontFamily={FF.MONO}>
            rows {fn(secondaryRow - 1)} &amp; {fn(secondaryRow)}
          </text>
        </g>
      )}
      {/* Axis labels */}
      <text x={10} y={PT + CH / 2} fontSize={CF.AXIS} fill={C.TEXT_2} textAnchor="middle"
        fontFamily={FF.UI} transform={`rotate(-90,10,${PT + CH / 2})`}>Noise level</text>
      <text x={PL + CW / 2} y={H - 2} fontSize={CF.AXIS} fill={C.TEXT_2} textAnchor="middle"
        fontFamily={FF.UI}>Row</text>
    </PlotSVG>
  );
}

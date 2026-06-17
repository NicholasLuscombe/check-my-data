import { CC, CP, CS, C, FF, CF, SIGNAL } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

/* ── Noise Spread Plot — error-bar style per-column residual spread ── */
export function NoiseSpreadPlot({ colDetails, flaggedCols, outlierCol, flag, W=CP.W, H=240 }) {
  if (!colDetails?.length) return null;
  const n = colDetails.length;
  const stds = colDetails.map(d => parseFloat(d.residualStd) || 0);
  const maxStd = Math.max(...stds);
  const PL = 58, PR = 20, PT = 18, PB = 52;
  const CW = W - PL - PR, CH = H - PT - PB;
  const yMax = maxStd * 1.25;
  const py = v => PT + CH / 2 - (v / yMax) * (CH / 2);
  const midY = PT + CH / 2;
  // Column spacing
  const gap = CW / (n + 1);
  const cx = i => PL + gap * (i + 1);
  // Median std for reference band
  const sortedStds = [...stds].sort((a, b) => a - b);
  const medianStd = sortedStds[Math.floor(sortedStds.length / 2)];
  // Y-axis ticks
  const yTicks = [];
  const step = parseFloat((maxStd / 3).toPrecision(1)) || 0.01;
  for (let v = step; v <= yMax; v += step) { yTicks.push(v); yTicks.push(-v); }
  yTicks.push(0);

  // Determine which columns are flagged
  const flagSet = flaggedCols instanceof Set ? flaggedCols : null;
  const isFlagged = (d) => {
    if (flagSet) return flagSet.has(d.col);
    // Legacy fallback: single outlierCol
    return d.col === outlierCol;
  };

  return (
    <PlotSVG W={W} H={H} responsive>
      {/* Median reference band — empirical central reference (null), teal */}
      {flag && flag !== "LOW" && (
        <rect x={PL} y={py(medianStd)} width={CW} height={py(-medianStd) - py(medianStd)}
          fill={CC.EXP} opacity="0.25" rx="2"/>
      )}
      {/* Horizontal gridlines */}
      {yTicks.map((v, i) => (
        <line key={`g${i}`} x1={PL} x2={PL+CW} y1={py(v)} y2={py(v)}
          stroke={C.GRID} strokeWidth={CS.GRID.w}/>
      ))}
      {/* Zero line — neutral baseline (grey, dashed) per shared treatment */}
      <line x1={PL} x2={PL+CW} y1={midY} y2={midY} stroke={C.AXIS} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
      {/* Y-axis ticks */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PL-3} x2={PL} y1={py(v)} y2={py(v)} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
          <text x={PL-5} y={py(v)+3.5} textAnchor="end" fontSize={CF.TICK} fill={C.TEXT_2} fontFamily={FF.MONO}>
            {fmtTick(v)}
          </text>
        </g>
      ))}
      {/* Per-column error bars */}
      {colDetails.map((d, i) => {
        const sd = stds[i];
        const x = cx(i);
        const isOutlier = isFlagged(d);
        const color = isOutlier ? CC.THRESH : CC.OBS;
        const capW = 8;
        return (
          <g key={i}>
            {/* Whisker line */}
            <line x1={x} x2={x} y1={py(sd)} y2={py(-sd)}
              stroke={color} strokeWidth={isOutlier ? 2.5 : 2} opacity={isOutlier ? 1 : 0.8}/>
            {/* Top cap */}
            <line x1={x-capW} x2={x+capW} y1={py(sd)} y2={py(sd)}
              stroke={color} strokeWidth={isOutlier ? 2.5 : 2} opacity={isOutlier ? 1 : 0.8}/>
            {/* Bottom cap */}
            <line x1={x-capW} x2={x+capW} y1={py(-sd)} y2={py(-sd)}
              stroke={color} strokeWidth={isOutlier ? 2.5 : 2} opacity={isOutlier ? 1 : 0.8}/>
            {/* Centre dot */}
            <circle cx={x} cy={midY} r={isOutlier ? CS.PT_LG.r : CS.PT.r}
              fill={color} stroke={C.WHITE} strokeWidth="1"/>
            {/* Column label */}
            <text x={x} y={H-PB+15} textAnchor="middle" fontSize={CF.AXIS}
              fill={isOutlier ? SIGNAL.RED.dot : C.TEXT_2} fontWeight={isOutlier ? 700 : 400} fontFamily={FF.UI}>
              {d.label || ("Col " + d.col)}
            </text>
            <text x={x} y={H-PB+28} textAnchor="middle" fontSize={CF.TICK} fill={C.TEXT_3} fontFamily={FF.MONO}>
              n={d.n}
            </text>
            {/* SD value */}
            <text x={x} y={py(sd)-7} textAnchor="middle" fontSize={CF.TICK} fontFamily={FF.MONO}
              fill={isOutlier ? SIGNAL.RED.dot : C.TEXT_3} fontWeight={isOutlier ? 600 : 400}>
              {sd.toFixed(2)}
            </text>
          </g>
        );
      })}
      {/* Y-axis label */}
      <text x={10} y={midY} textAnchor="middle" fontSize={CF.AXIS} fill={C.TEXT_2}
        fontFamily={FF.UI} transform={`rotate(-90,10,${midY})`}>±1 SD residual</text>
    </PlotSVG>
  );
}

function fmtTick(v) {
  if (v === 0) return "0";
  if (Number.isInteger(v)) return String(v);
  // Remove trailing zeros after decimal
  const s = v.toFixed(2);
  return s.replace(/\.?0+$/, "");
}

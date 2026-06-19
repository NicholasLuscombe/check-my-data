import { CC, CP, CS, C, FF, CF, OBS } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { shortName } from "../shared/utils.js";

/** Pick ~4-6 nice round tick values for an axis from 0 to max. */
function niceTicksTo(max) {
  if (max <= 0) return [0];
  const rough = max / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  const step = residual <= 1.5 ? mag : residual <= 3 ? 2 * mag : residual <= 7 ? 5 * mag : 10 * mag;
  const ticks = [];
  for (let v = 0; v <= max; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(Math.ceil(max / step) * step);
  return ticks;
}

export function HBarPlot({ items, accessor, xlabel, refVal, refLabel, maxOverride, flag }) {
  if(!items?.length) return null;
  // Data model (channel 4): observed bars blue when clear, flat-red when the
  // verdict flags (global statistic — no per-bar attribution).
  const obsCol = (flag==="HIGH"||flag==="MODERATE") ? CC.THRESH : CC.OBS;
  const BH=13, GAP=3, LW=72, PL=6, PR=28, PT=12, PB=38;
  const vals = items.map(d=>accessor(d)||0);
  const mx = maxOverride || Math.max(...vals, refVal||0, 0.001);
  const CW = CP.W_MD - LW - PR;
  const svgH = PT + items.length*(BH+GAP) + PB;
  const axisY = PT + items.length*(BH+GAP) - GAP + 2;
  const ticks = niceTicksTo(mx);
  return (
    <PlotSVG W={LW+CW+PR} H={svgH} overflow>
      {/* reference line */}
      {refVal !== undefined && refVal > 0 && (
        <>
          <line x1={LW+(refVal/mx)*CW} y1={PT-4} x2={LW+(refVal/mx)*CW} y2={axisY}
            stroke={CC.EXP} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
          <text x={LW+(refVal/mx)*CW} y={PT-6} fontSize={CF.LABEL} fill={CC.EXP} textAnchor="middle"
            fontFamily={FF.UI}>{refLabel || refVal}</text>
        </>
      )}
      {items.map((d,i)=>{
        const v=vals[i], bw=Math.max(1,(v/mx)*CW);
        const y=PT+i*(BH+GAP);
        return (
          <g key={i}>
            <text x={LW-PL} y={y+BH*0.78} textAnchor="end" fontSize={CF.LABEL} fill={C.TEXT_2}
              fontFamily={FF.UI}>{shortName(d.group||d.col||`#${i+1}`)}</text>
            <rect x={LW} y={y} width={bw} height={BH} rx="2"
              fill={obsCol} fillOpacity={OBS.areaFill.fillOpacity} stroke={obsCol} strokeWidth="1"/>
            <text x={LW+bw+4} y={y+BH*0.78} fontSize={CF.LABEL} fill={C.TEXT_2} fontFamily={FF.MONO}>
              {Number.isInteger(v)?v:v.toFixed?.(2)}
            </text>
          </g>
        );
      })}
      {/* x-axis line */}
      <line x1={LW} y1={axisY} x2={LW+CW} y2={axisY} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      {/* x-axis ticks */}
      {ticks.map((t,i) => {
        const x = LW + (t/mx)*CW;
        return (
          <g key={i}>
            <line x1={x} y1={axisY} x2={x} y2={axisY+3} stroke={C.AXIS} strokeWidth={0.5}/>
            <text x={x} y={axisY+18} fontSize={CF.SMALL} fill={C.TEXT_2} textAnchor="middle"
              fontFamily={FF.MONO}>{t % 1 === 0 ? t : t.toFixed(1)}</text>
          </g>
        );
      })}
      {/* x-axis label — inside the bottom gutter (PB), not in overflow */}
      {xlabel && <text x={LW+CW/2} y={axisY+32} fontSize={CF.AXIS} fill={C.TEXT_2} textAnchor="middle"
        fontFamily={FF.UI}>{xlabel}</text>}
    </PlotSVG>
  );
}

import { CC, CP, CS, C, FF, CF, SIGNAL } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

// Observed vs expected dot chart (runs test)
export function ObsVsExpPlot({ items, obsKey, expKey, xlabel, W=CP.W_MD, H=100 }) {
  if(!items?.length) return null;
  const PL=20, PR=20, PT=16, PB=28;
  const CW=W-PL-PR, CH=H-PT-PB;
  const obs=items.map(d=>parseFloat(d[obsKey])||0);
  const exp=items.map(d=>parseFloat(d[expKey])||0);
  const mx=Math.max(...obs,...exp,1)*1.05;
  function xs(i){ return PL+(i/(items.length-1||1))*CW; }
  function ys(v){ return PT+CH-(v/mx)*CH; }
  return (
    <PlotSVG W={W} H={H}>
      {/* diagonal reference y=x line */}
      <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT} stroke={C.BORDER_L} strokeWidth={CS.GRID.w}/>
      {/* expected points */}
      {items.map((_,i)=><circle key={"e"+i} cx={xs(i)} cy={ys(exp[i])} r={CS.PT.r}
        fill={CC.OBS} opacity="0.5"/>)}
      {/* observed points */}
      {items.map((d,i)=>{
        const sig=d.significant;
        return <circle key={"o"+i} cx={xs(i)} cy={ys(obs[i])} r={CS.PT_LG.r}
          fill={sig?CC.THRESH:SIGNAL.GREEN.dot} opacity="0.8" stroke={C.WHITE} strokeWidth="0.8"/>;
      })}
      {/* legend */}
      <circle cx={PL} cy={PT-4} r={CS.PT.r} fill={CC.OBS} opacity="0.5"/>
      <text x={PL+6} y={PT-1} fontSize={CF.SMALL} fill={C.TEXT_3} fontFamily={FF.UI}>expected</text>
      <circle cx={PL+55} cy={PT-4} r={CS.PT.r} fill={CC.THRESH} opacity="0.8"/>
      <text x={PL+61} y={PT-1} fontSize={CF.SMALL} fill={C.TEXT_3} fontFamily={FF.UI}>observed (sig)</text>
      <circle cx={PL+130} cy={PT-4} r={CS.PT.r} fill={SIGNAL.GREEN.dot} opacity="0.8"/>
      <text x={PL+136} y={PT-1} fontSize={CF.SMALL} fill={C.TEXT_3} fontFamily={FF.UI}>observed (ns)</text>
      <line x1={PL} y1={PT+CH} x2={W-PR} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {xlabel&&<text x={PL+CW/2} y={H-2} fontSize={CF.LABEL} fill={C.TEXT_4} textAnchor="middle"
        fontFamily={FF.UI}>{xlabel}</text>}
    </PlotSVG>
  );
}

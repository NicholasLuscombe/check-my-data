import { CC, CP, CS, C, FF, CF, SIGNAL } from "../../constants/tokens.js";
import { PLOT_FC } from "../../constants/thresholds.js";
import { PlotSVG } from "./PlotSVG.jsx";

// Dot strip — each dot = one replicate pair, x = metric value, with reference band
export function DotStrip({ items, valueKey, refMin, refMax, refLabel, xlabel, colorKey, W=CP.W_MD, H=80 }) {
  if(!items?.length) return null;
  const PL=20, PR=20, PT=20, PB=24;
  const CW=W-PL-PR;
  const vals=items.map(d=>parseFloat(d[valueKey])||0).filter(v=>!isNaN(v));
  if(!vals.length) return null;
  const mn=Math.min(...vals,refMin??0), mx=Math.max(...vals,refMax??0);
  const pad=(mx-mn)*0.1||0.1;
  const lo=mn-pad, hi=mx+pad;
  function xscale(v){ return PL+(v-lo)/(hi-lo)*CW; }
  const cy=PT+10;
  return (
    <PlotSVG W={W} H={H}>
      {/* reference band */}
      {refMin!==undefined&&refMax!==undefined&&(
        <rect x={xscale(refMin)} y={PT} width={Math.max(1,xscale(refMax)-xscale(refMin))} height={20}
          fill={CC.EXP} opacity="0.15" rx="2"/>
      )}
      {/* zero / ref line */}
      {refMin!==undefined&&(
        <>
          <line x1={xscale((refMin+refMax)/2)} y1={PT-4} x2={xscale((refMin+refMax)/2)} y2={PT+22}
            stroke={CC.EXP} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
          <text x={xscale((refMin+refMax)/2)} y={PT-6} fontSize={CF.SMALL} fill={CC.EXP}
            textAnchor="middle" fontFamily={FF.MONO}>{refLabel||"expected"}</text>
        </>
      )}
      {/* dots */}
      {items.map((d,i)=>{
        const v=parseFloat(d[valueKey])||0;
        const sig=d.significant||d[colorKey];
        const col=sig===true?CC.THRESH:sig===false?SIGNAL.GREEN.dot:PLOT_FC[d.flag]||CC.OBS;
        return <circle key={i} cx={xscale(v)} cy={cy+Math.sin(i*2.5)*5} r={CS.PT_LG.r}
          fill={col} opacity="0.7" stroke={C.WHITE} strokeWidth="0.8"/>;
      })}
      {/* axis */}
      <line x1={PL} y1={PT+22} x2={W-PR} y2={PT+22} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {[lo,0,(lo+hi)/2,hi].filter((v,i,a)=>a.indexOf(v)===i).map((v,i)=>(
        <text key={i} x={xscale(v)} y={H-8} fontSize={CF.SMALL} fill={C.TEXT_4} textAnchor="middle"
          fontFamily={FF.MONO}>{v.toFixed(2)}</text>
      ))}
      {xlabel&&<text x={PL+CW/2} y={H-1} fontSize={CF.LABEL} fill={C.TEXT_4} textAnchor="middle"
        fontFamily={FF.UI}>{xlabel}</text>}
    </PlotSVG>
  );
}

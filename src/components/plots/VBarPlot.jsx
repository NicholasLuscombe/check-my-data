import { CC, CP, CS, C, FF, CF } from "../../constants/tokens.js";
import { PLOT_FC } from "../../constants/thresholds.js";
import { PlotSVG } from "./PlotSVG.jsx";

/* Nice-step algorithm: pick 1/2/5 × 10^n step so ~4 ticks fit the range */
function niceStep(range) {
  if (range <= 0) return 1;
  const rough = range / 4;
  const p = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / p;
  return (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * p;
}

function fmtTick(v) {
  return v === Math.round(v) ? String(Math.round(v)) : v.toFixed(1);
}

// Vertical bar chart (digit frequencies)
export function VBarPlot({ items, xKey, obsKey, expKey, xlabel, ylabel, obsColor, expColor, flagKey, barColorKey }) {
  if(!items?.length) return null;
  const W=CP.W_MD, H=110, PL=40, PR=8, PT=8, PB=30;
  const CW=W-PL-PR, CH=H-PT-PB;
  const obsVals=items.map(d=>d[obsKey]||0), expVals=expKey ? items.map(d=>d[expKey]||0) : [];
  const rawMax=Math.max(...obsVals,...expVals,1);
  const step=niceStep(rawMax);
  const ticks=[];
  for(let t=0; t<=rawMax+step*0.01; t+=step) ticks.push(Math.round(t*1e6)/1e6);
  if(ticks[ticks.length-1]<rawMax) ticks.push(ticks[ticks.length-1]+step);
  const mx=ticks[ticks.length-1]||1;
  const bw=Math.floor(CW/items.length)-2;
  function yscale(v){ return PT+CH-(v/mx)*CH; }
  return (
    <PlotSVG W={W} H={H}>
      {/* y-axis gridlines + tick labels */}
      {ticks.map(t=>(
        <g key={t}>
          {t>0&&<line x1={PL} y1={yscale(t)} x2={W-PR} y2={yscale(t)}
            stroke={C.BORDER_L} strokeWidth={CS.GRID.w}/>}
          <text x={PL-4} y={yscale(t)+3.5} fontSize={CF.TICK} fill={C.TEXT_4}
            textAnchor="end" fontFamily={FF.MONO}>{fmtTick(t)}</text>
        </g>
      ))}
      {/* expected line — spans full chart width */}
      {expVals.length>1&&(
        <polyline points={items.map((_,i)=>{
          const x = i===0 ? PL : i===items.length-1 ? PL+CW : PL+i*(bw+2)+bw/2;
          return `${x},${yscale(expVals[i])}`;
        }).join(" ")}
          fill="none" stroke={expColor||CC.OBS} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
      )}
      {/* observed bars */}
      {items.map((d,i)=>{
        const v=d[obsKey]||0;
        const col = barColorKey ? (d[barColorKey]||CC.OBS)
                  : obsColor ? obsColor
                  : (flagKey&&d[flagKey]?PLOT_FC[d[flagKey]]||CC.OBS:CC.OBS);
        const barH = v===0 ? 0 : Math.max(1,(v/mx)*CH);
        return (
          <g key={i}>
            {barH>0&&<rect x={PL+i*(bw+2)} y={yscale(v)} width={bw} height={barH}
              rx="1" fill={col} fillOpacity="0.35" stroke={col} strokeWidth="1"/>}
            <text x={PL+i*(bw+2)+bw/2} y={H-PB+11} fontSize={CF.LABEL} fill={C.TEXT_3}
              textAnchor="middle" fontFamily={FF.MONO}>{d[xKey]}</text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={PL} y1={PT} x2={PL} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      <line x1={PL} y1={PT+CH} x2={W-PR} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {xlabel&&<text x={PL+CW/2} y={H-2} fontSize={CF.LABEL} fill={C.TEXT_4} textAnchor="middle"
        fontFamily={FF.UI}>{xlabel}</text>}
      {ylabel&&<text x={10} y={PT+CH/2} fontSize={CF.LABEL} fill={C.TEXT_4}
        textAnchor="middle" fontFamily={FF.UI}
        transform={`rotate(-90,10,${PT+CH/2})`}>{ylabel}</text>}
    </PlotSVG>
  );
}

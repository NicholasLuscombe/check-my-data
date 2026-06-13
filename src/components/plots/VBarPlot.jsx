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
export function VBarPlot({ items, xKey, obsKey, expKey, loKey, xlabel, ylabel, obsColor, expColor, flagKey, barColorKey }) {
  if(!items?.length) return null;
  const W=CP.W_MD, H=110, PL=40, PR=8, PT=8, PB=30;
  const CW=W-PL-PR, CH=H-PT-PB;
  const obsVals=items.map(d=>d[obsKey]||0), expVals=expKey ? items.map(d=>d[expKey]||0) : [];
  // Indices that actually carry an expected value. Full-coverage consumers
  // (Benford, Terminal Digit) have every item defined; partial-coverage ones
  // (Decimal Precision — intermediate levels only) leave the edge bars undefined.
  const expIdx = expKey ? items.reduce((a,d,i)=>{ if(d[expKey]!=null) a.push(i); return a; }, []) : [];
  const fullExp = expKey && expIdx.length===items.length;
  const rawMax=Math.max(...obsVals,...expVals,1);
  const step=niceStep(rawMax);
  const ticks=[];
  for(let t=0; t<=rawMax+step*0.01; t+=step) ticks.push(Math.round(t*1e6)/1e6);
  if(ticks[ticks.length-1]<rawMax) ticks.push(ticks[ticks.length-1]+step);
  const mx=ticks[ticks.length-1]||1;
  const bw=Math.floor(CW/items.length)-2;
  function yscale(v){ return PT+CH-(v/mx)*CH; }
  // Full-coverage expected lines snap their endpoints to the chart edges (Benford
  // span-the-width aesthetic); partial-coverage lines stay on bar centres so they
  // don't dive to the axis at the unbanded edge bars.
  const expX = i => (fullExp && i===0) ? PL : (fullExp && i===items.length-1) ? PL+CW : PL+i*(bw+2)+bw/2;
  // 99.9% deficit band: a polygon from the expected line (top) down to the per-level
  // lower bound (bottom), over the contiguous run of levels carrying both. One-sided
  // (no upper edge) — the test is a one-tailed deficit. Gated identically to the line.
  const bandIdx = loKey ? expIdx.filter(i => items[i][loKey] != null) : [];
  const bandPoints = bandIdx.length>1
    ? [...bandIdx.map(i=>`${expX(i)},${yscale(expVals[i])}`),
       ...bandIdx.slice().reverse().map(i=>`${expX(i)},${yscale(items[i][loKey])}`)].join(" ")
    : null;
  return (
    <PlotSVG W={W} H={H}>
      {/* y-axis gridlines + tick labels */}
      {ticks.map(t=>(
        <g key={t}>
          {t>0&&<line x1={PL} y1={yscale(t)} x2={W-PR} y2={yscale(t)}
            stroke={C.GRID} strokeWidth={CS.GRID.w}/>}
          <text x={PL-4} y={yscale(t)+3.5} fontSize={CF.TICK} fill={C.TEXT_2}
            textAnchor="end" fontFamily={FF.MONO}>{fmtTick(t)}</text>
        </g>
      ))}
      {/* 99.9% deficit band — sits under the bars and the expected line */}
      {bandPoints&&(
        <polygon points={bandPoints} fill={expColor||CC.EXP} opacity="0.10" stroke="none"/>
      )}
      {/* expected line — full width when every bar has an expected value, else bar-centred */}
      {expIdx.length>1&&(
        <polyline points={expIdx.map(i=>`${expX(i)},${yscale(expVals[i])}`).join(" ")}
          fill="none" stroke={expColor||CC.EXP} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
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
            <text x={PL+i*(bw+2)+bw/2} y={H-PB+11} fontSize={CF.LABEL} fill={C.TEXT_2}
              textAnchor="middle" fontFamily={FF.MONO}>{d[xKey]}</text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={PL} y1={PT} x2={PL} y2={PT+CH} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      <line x1={PL} y1={PT+CH} x2={W-PR} y2={PT+CH} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      {xlabel&&<text x={PL+CW/2} y={H-2} fontSize={CF.AXIS} fill={C.TEXT_2} textAnchor="middle"
        fontFamily={FF.UI}>{xlabel}</text>}
      {ylabel&&<text x={10} y={PT+CH/2} fontSize={CF.AXIS} fill={C.TEXT_2}
        textAnchor="middle" fontFamily={FF.UI}
        transform={`rotate(-90,10,${PT+CH/2})`}>{ylabel}</text>}
    </PlotSVG>
  );
}

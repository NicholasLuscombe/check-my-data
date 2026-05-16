import { CC, CP, CS, C, FF, CF } from "../../constants/tokens.js";
import { arrayMin, arrayMax } from "../../stats/primitives.js";
import { PlotSVG } from "./PlotSVG.jsx";

// Log-log mean–variance scatter plot with observed + expected slope lines
export function MeanVarianceScatter({ logPoints, logCentroid, observedSlope, expectedSlope, slopeSE, W=CP.W, H=240 }) {
  const PL=50, PR=18, PT=16, PB=36;
  const CW=W-PL-PR, CH=H-PT-PB;
  if(!logPoints||!logPoints.length) return null;
  const obsSlope=parseFloat(observedSlope)||0;
  const expSlope=expectedSlope!=null&&expectedSlope!=="\u2014"?parseFloat(expectedSlope):null;
  const se=parseFloat(slopeSE)||0;
  const cx=logCentroid?logCentroid[0]:logPoints.reduce((s,p)=>s+p.lm,0)/logPoints.length;
  const cy=logCentroid?logCentroid[1]:logPoints.reduce((s,p)=>s+p.lv,0)/logPoints.length;

  // Data extents
  const allX=logPoints.map(p=>p.lm), allY=logPoints.map(p=>p.lv);
  const xMin=arrayMin(allX), xMax=arrayMax(allX);
  const yMin=arrayMin(allY), yMax=arrayMax(allY);
  // Pad
  const xPad=(xMax-xMin)*0.12||0.5, yPad=(yMax-yMin)*0.15||0.5;
  const x0=xMin-xPad, x1=xMax+xPad;
  // For y, ensure slope lines fit but NOT CI band (clip it instead)
  const lineYatX=(slope,x)=>cy+slope*(x-cx);
  const ciHi=obsSlope+1.96*se, ciLo=obsSlope-1.96*se;
  const lineYs=[obsSlope,expSlope].filter(s=>s!=null).flatMap(s=>[lineYatX(s,x0),lineYatX(s,x1)]);
  const y0=Math.min(yMin-yPad,...lineYs), y1=Math.max(yMax+yPad,...lineYs);

  const px=x=>PL+(x-x0)/(x1-x0)*CW;
  const py=y=>PT+CH-(y-y0)/(y1-y0)*CH;
  const clipId=`mv-clip-${Math.random().toString(36).slice(2,8)}`;

  // Line endpoints through centroid
  const lineEndpoints=(slope)=>[{x:px(x0),y:py(lineYatX(slope,x0))},{x:px(x1),y:py(lineYatX(slope,x1))}];
  const obs=lineEndpoints(obsSlope);
  const expL=expSlope!=null?lineEndpoints(expSlope):null;

  // Observed line always blue; expected always green
  const obsCol = CC.OBS;
  const expCol = CC.EXP;

  // 95% CI: always show numbers in legend, but only render band when narrow enough to be informative
  const hasCINumbers=se>0&&se<Infinity&&se<50;
  const showCIBand=hasCINumbers&&se<2; // band useless when CI spans >~8 slope units
  const ciUpper=showCIBand?lineEndpoints(ciHi):null;
  const ciLower=showCIBand?lineEndpoints(ciLo):null;

  // Axis tick values — target ~5 ticks, using "nice" round steps
  function niceTicks(mn,mx,target=5){
    if(mx<=mn) return [mn,mx];
    const range=mx-mn;
    const rawStep=range/target;
    const k=Math.floor(Math.log10(rawStep));
    const base=Math.pow(10,k);
    const step=[1,2,5,10].map(m=>m*base).find(s=>range/s<=target+2)||base*10;
    const ticks=[];
    for(let v=Math.ceil(mn/step)*step;v<=mx+step*0.01;v=Math.round((v+step)*1e10)/1e10){
      if(v>=mn-step*0.01&&v<=mx+step*0.01) ticks.push(parseFloat(v.toFixed(8)));
    }
    return ticks;
  }
  const xTicks=niceTicks(x0,x1,5);
  const yTicksRaw=niceTicks(y0,y1,5);
  const minPxGap=17;
  const yTicks=yTicksRaw.filter((t,i,arr)=>{
    if(i===0) return true;
    return Math.abs(py(arr[i-1])-py(t))>=minPxGap;
  });

  return (
    <PlotSVG W={W} H={H} overflow>
      <defs><clipPath id={clipId}><rect x={PL} y={PT} width={CW} height={CH}/></clipPath></defs>
      {/* axes */}
      <line x1={PL} y1={PT} x2={PL} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {/* grid + ticks */}
      {xTicks.map(t=>(
        <g key={t}>
          <line x1={px(t)} y1={PT} x2={px(t)} y2={PT+CH} stroke={C.BORDER_L} strokeWidth={CS.GRID.w}/>
          <line x1={px(t)} y1={PT+CH} x2={px(t)} y2={PT+CH+4} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
          <text x={px(t)} y={PT+CH+15} fontSize={CF.TICK} fill={C.TEXT_3} textAnchor="middle" fontFamily={FF.MONO}>{t.toFixed(1)}</text>
        </g>
      ))}
      {yTicks.map(t=>(
        <g key={t}>
          <line x1={PL} y1={py(t)} x2={PL+CW} y2={py(t)} stroke={C.BORDER_L} strokeWidth={CS.GRID.w}/>
          <line x1={PL-4} y1={py(t)} x2={PL} y2={py(t)} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
          <text x={PL-6} y={py(t)+3} fontSize={CF.TICK} fill={C.TEXT_3} textAnchor="end" fontFamily={FF.MONO}>{t.toFixed(1)}</text>
        </g>
      ))}
      {/* axis labels */}
      <text x={PL+CW/2} y={H-2} fontSize={CF.AXIS} fill={C.TEXT_3} textAnchor="middle" fontFamily={FF.UI}>log₁₀(mean)</text>
      <text x={12} y={PT+CH/2} fontSize={CF.AXIS} fill={C.TEXT_3} textAnchor="middle"
        fontFamily={FF.UI} transform={`rotate(-90,12,${PT+CH/2})`}>log₁₀(variance)</text>
      {/* 95% CI band (clipped to plot area) */}
      {showCIBand&&ciUpper&&ciLower&&(
        <polygon clipPath={`url(#${clipId})`}
          points={`${ciUpper[0].x},${ciUpper[0].y} ${ciUpper[1].x},${ciUpper[1].y} ${ciLower[1].x},${ciLower[1].y} ${ciLower[0].x},${ciLower[0].y}`}
          fill={obsCol} opacity="0.10" stroke="none"/>
      )}
      {/* data points */}
      {logPoints.map((p,i)=>(
        <circle key={i} cx={px(p.lm)} cy={py(p.lv)} r={CS.PT.r} fill={CC.OBS} opacity="0.35" stroke="none"/>
      ))}
      {/* expected slope line (dashed green) */}
      {expL&&(
        <line x1={expL[0].x} y1={expL[0].y} x2={expL[1].x} y2={expL[1].y}
          stroke={expCol} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
      )}
      {/* observed slope line */}
      <line x1={obs[0].x} y1={obs[0].y} x2={obs[1].x} y2={obs[1].y}
        stroke={obsCol} strokeWidth={CS.FIT.w} opacity="0.95"/>
      {/* centroid dot */}
      <circle cx={px(cx)} cy={py(cy)} r={CS.PT_LG.r} fill={C.WHITE} stroke={C.TEXT_2} strokeWidth="1.4"/>
      {/* legend */}
      <line x1={PL+4} y1={PT+10} x2={PL+20} y2={PT+10} stroke={obsCol} strokeWidth={CS.FIT.w}/>
      <text x={PL+24} y={PT+14} fontSize={CF.AXIS} fill={obsCol} fontFamily={FF.UI}>
        Observed slope {parseFloat(observedSlope).toFixed(2)}{hasCINumbers?` (95% CI: ${ciLo.toFixed(2)} – ${ciHi.toFixed(2)})`:""}
      </text>
      {expSlope!==null&&(<>
        <line x1={PL+4} y1={PT+26} x2={PL+20} y2={PT+26} stroke={expCol} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity}/>
        <text x={PL+24} y={PT+30} fontSize={CF.AXIS} fill={expCol} fontFamily={FF.UI}>
          Expected slope {expSlope} ({expSlope===0?"additive":expSlope===1?"Poisson":expSlope===2?"proportional":"custom"})
        </text>
      </>)}
      {expSlope===null&&(
        <text x={PL+4} y={PT+30} fontSize={CF.AXIS} fill={C.TEXT_3} fontFamily={FF.UI}>
          No assay-specific expected slope — select assay type for comparison
        </text>
      )}
    </PlotSVG>
  );
}

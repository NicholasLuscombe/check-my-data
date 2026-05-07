import { CC, CP, CS, C, FF, CF, CHART, SIGNAL } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { shortName } from "../shared/utils.js";

// Group-colour palette matching reference figure
const GROUP_COLORS = CHART.SERIES;

export function AutocorrDecayPlot({ perGroupDecay, singleCurve, condColorMap }) {
  const curves = perGroupDecay || (singleCurve ? [{group:"All data", curve:singleCurve}] : null);
  if(!curves || !curves.length) return null;

  const W=CP.W, H=170;
  const PL=34, PR=10, PT=12, PB=36;
  const CW=W-PL-PR, CH=H-PT-PB;
  const LAGS=10;

  const grandMean = Array.from({length:LAGS}, (_,i)=>
    curves.reduce((s,c)=>s+(c.curve[i]||0),0)/curves.length
  );

  // Auto-scale y-axis to data range, always include ±0.2 minimum
  const allVals = curves.flatMap(c=>c.curve).concat(grandMean);
  const dataMin = Math.min(...allVals, -0.2);
  const dataMax = Math.max(...allVals, 0.2);
  const pad = (dataMax - dataMin) * 0.12;
  const YMIN = Math.floor((dataMin - pad) * 5) / 5;  // round down to nearest 0.2
  const YMAX = Math.ceil((dataMax + pad) * 5) / 5;   // round up to nearest 0.2
  function xs(lag){ return PL+(lag-1)/(LAGS-1)*CW; }
  function ys(v){ return PT+CH-(v-YMIN)/(YMAX-YMIN)*CH; }
  // Generate ticks at 0.2 intervals
  const yTicks=[];
  for(let v=YMIN;v<=YMAX+0.01;v+=0.2) yTicks.push(Math.round(v*10)/10);

  return (
    <PlotSVG W={W} H={H}>
      {/* expected band */}
      <rect x={PL} y={ys(0.15)} width={CW} height={ys(-0.15)-ys(0.15)}
        fill={CC.EXP} opacity="0.15"/>
      {/* gridlines */}
      {yTicks.map(v=>(
        <g key={v}>
          <line x1={PL} y1={ys(v)} x2={PL+CW} y2={ys(v)}
            stroke={v===0?C.BORDER:C.BORDER_L} strokeWidth={v===0?1:0.7}
            strokeDasharray={v===0?"4,3":""}/>
          <text x={PL-4} y={ys(v)+3.5} fontSize={CF.LABEL} fill={C.TEXT_4}
            textAnchor="end" fontFamily={FF.MONO}>{v.toFixed(1)}</text>
        </g>
      ))}
      {/* group lines */}
      {curves.map((c,ci)=>{
        const col=condColorMap?.[c.group]?.border || GROUP_COLORS[ci%GROUP_COLORS.length];
        const pts=c.curve.map((v,i)=>`${xs(i+1)},${ys(v)}`).join(" ");
        return (
          <g key={ci}>
            <polyline points={pts} fill="none" stroke={col} strokeWidth={CS.DATA.w} opacity="0.7"/>
            {c.curve.map((v,i)=>(
              <circle key={i} cx={xs(i+1)} cy={ys(v)} r={CS.PT_SM.r} fill={col} opacity="0.8"/>
            ))}
          </g>
        );
      })}
      {/* grand mean */}
      <polyline
        points={grandMean.map((v,i)=>`${xs(i+1)},${ys(v)}`).join(" ")}
        fill="none" stroke={C.TEXT} strokeWidth={CS.FIT.w} opacity="0.9"/>
      {grandMean.map((v,i)=>(
        <circle key={i} cx={xs(i+1)} cy={ys(v)} r={CS.PT_LG.r}
          fill={C.TEXT} stroke={C.WHITE} strokeWidth="1.2"/>
      ))}
      {/* x axis */}
      <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {Array.from({length:LAGS},(_,i)=>(
        <text key={i} x={xs(i+1)} y={H-PB+14} fontSize={CF.LABEL} fill={C.TEXT_4}
          textAnchor="middle" fontFamily={FF.MONO}>{i+1}</text>
      ))}
      <text x={PL+CW/2} y={H-2} fontSize={CF.LABEL} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.UI}>Lag (rows apart)</text>
      {/* Y-axis label */}
      <text x={8} y={PT+CH/2} fontSize={CF.AXIS} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.UI} transform={`rotate(-90,8,${PT+CH/2})`}>Autocorrelation (r)</text>
    </PlotSVG>
  );
}

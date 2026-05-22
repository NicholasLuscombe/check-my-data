import { CP, CS, C, FF, CF, CHART } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

// Group-colour palette matching reference figure
const GROUP_COLORS = CHART.SERIES;

/**
 * Autocorrelation-by-lag plot.
 *
 * S166 A1 recalibration: the hardcoded ±0.15 "Expected range" band is gone
 * (METHODOLOGY §2.1 v0.4 removed that effect-size floor; the band was
 * stale visual chrome that invited per-pair outlier-hunting). The
 * verdict-driving statistic — the producer's pooled lag-1 mean from the
 * one-sample t on allR1 — is now drawn explicitly at lag 1 with its 95%
 * CI whisker via the `verdictMarker` prop. The interval excluding zero
 * IS the verdict. The pre-S166 component-locally-recomputed unweighted
 * grand mean (sum of per-condition curves / nCurves) was a different
 * quantity from the producer's pooled mean and is dropped.
 *
 * @param {object[]} [perGroupDecay] — [{group, curve: number[]}]
 * @param {number[]} [singleCurve] — fallback dataset-wide decay
 * @param {object} [condColorMap]
 * @param {{value:number, ci:[number,number]|null, lag:number}} [verdictMarker]
 *   pooled-t mean + 95% CI from the producer (autocorrelation.js).
 *   Absent → no marker drawn (e.g. n_pairs < 2).
 */
export function AutocorrDecayPlot({ perGroupDecay, singleCurve, condColorMap, verdictMarker }) {
  const curves = perGroupDecay || (singleCurve ? [{group:"All data", curve:singleCurve}] : null);
  if(!curves || !curves.length) return null;

  const W=CP.W, H=170;
  const PL=34, PR=10, PT=12, PB=36;
  const CW=W-PL-PR, CH=H-PT-PB;
  const LAGS=10;

  // Auto-scale y-axis to data range, always include ±0.2 minimum.
  // Verdict-marker bounds participate so the CI whisker is never clipped.
  const markerVals = verdictMarker
    ? [verdictMarker.value, ...(verdictMarker.ci || [])]
    : [];
  const allVals = curves.flatMap(c=>c.curve).concat(markerVals);
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
      {/* gridlines — r=0 reference is the dashed prominent line */}
      {yTicks.map(v=>(
        <g key={v}>
          <line x1={PL} y1={ys(v)} x2={PL+CW} y2={ys(v)}
            stroke={v===0?C.BORDER:C.BORDER_L} strokeWidth={v===0?1:0.7}
            strokeDasharray={v===0?"4,3":""}/>
          <text x={PL-4} y={ys(v)+3.5} fontSize={CF.LABEL} fill={C.TEXT_3}
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
      {/* verdict marker — pooled lag-k mean from the one-sample t with 95% CI
          whisker. Drawn last so it sits over the per-condition dots; the
          interval-vs-zero relationship is the visual verdict. */}
      {verdictMarker && Number.isFinite(verdictMarker.value) && (() => {
        const lag = verdictMarker.lag || 1;
        const cx = xs(lag);
        const cy = ys(verdictMarker.value);
        const ci = verdictMarker.ci;
        return (
          <g>
            {ci && Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && (
              <>
                <line x1={cx} y1={ys(ci[0])} x2={cx} y2={ys(ci[1])}
                  stroke={C.TEXT} strokeWidth="1.5"/>
                <line x1={cx-5} y1={ys(ci[0])} x2={cx+5} y2={ys(ci[0])}
                  stroke={C.TEXT} strokeWidth="1.5"/>
                <line x1={cx-5} y1={ys(ci[1])} x2={cx+5} y2={ys(ci[1])}
                  stroke={C.TEXT} strokeWidth="1.5"/>
              </>
            )}
            <circle cx={cx} cy={cy} r={CS.PT_LG.r+1}
              fill={C.TEXT} stroke={C.WHITE} strokeWidth="1.5"/>
          </g>
        );
      })()}
      {/* x axis */}
      <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {Array.from({length:LAGS},(_,i)=>(
        <text key={i} x={xs(i+1)} y={H-PB+14} fontSize={CF.LABEL} fill={C.TEXT_3}
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

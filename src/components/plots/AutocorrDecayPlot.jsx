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
  const PL=52, PR=10, PT=12, PB=36;
  const CW=W-PL-PR, CH=H-PT-PB;
  const LAGS=10;

  // Data-aware y-axis (S166 fix-2 FIX 1). Symmetric around zero so the
  // r = 0 reference is always on-axis, the CI marker's relation to zero
  // reads as a directional gap, and per-condition lines + the verdict
  // marker + its CI bounds all participate in the fit (no clipping of
  // the whisker). MIN_HALF_SPAN floor stops near-zero-but-significant
  // CIs (DS21: pooled mean 0.0628, CI [0.0355, 0.0900]) from collapsing
  // against the reference line — the floor leaves visible breathing
  // space between the whisker's near end and r = 0. Floor is a MINIMUM:
  // wider-r fixtures (METHODOLOGY §2.1 records r up to ~0.8 for strong
  // fabrication) expand the axis above it via the fit. Tick step adapts
  // to span so the near-zero case gets useful sub-divisions instead of
  // a single tick per half-axis.
  const markerVals = verdictMarker
    ? [verdictMarker.value, ...(Array.isArray(verdictMarker.ci) ? verdictMarker.ci : [])]
    : [];
  const fitVals = curves.flatMap(c => c.curve).concat(markerVals)
    .filter(v => Number.isFinite(v));
  const rawHalfSpan = fitVals.length ? Math.max(...fitVals.map(v => Math.abs(v))) : 0;
  const paddedHalfSpan = rawHalfSpan * 1.15;   // ~15% padding above the fit
  const MIN_HALF_SPAN = 0.12;                  // floor — see comment above
  const fitHalfSpan = Math.max(paddedHalfSpan, MIN_HALF_SPAN);
  // Tick step keyed to span: 0.05 for tight (near-zero) ranges, 0.1 for
  // medium, 0.2 for wide. Keeps tick density readable at every scale.
  const tickStep = fitHalfSpan <= 0.25 ? 0.05 : fitHalfSpan <= 0.6 ? 0.1 : 0.2;
  // Round half-span UP to the next tick-step multiple so axis bounds
  // land on a tick value (and r = 0 always appears as a tick).
  const niceHalfSpan = Math.ceil(fitHalfSpan / tickStep) * tickStep;
  const YMIN = -niceHalfSpan, YMAX = niceHalfSpan;
  function xs(lag){ return PL+(lag-1)/(LAGS-1)*CW; }
  function ys(v){ return PT+CH-(v-YMIN)/(YMAX-YMIN)*CH; }
  const tickDp = tickStep < 0.1 ? 2 : 1;
  const yTicks = [];
  for (let v = YMIN; v <= YMAX + 1e-9; v += tickStep) {
    yTicks.push(Math.round(v * 1000) / 1000);  // kill float drift
  }

  return (
    <PlotSVG W={W} H={H}>
      {/* gridlines — r=0 reference is the dashed prominent line */}
      {yTicks.map(v=>(
        <g key={v}>
          <line x1={PL} y1={ys(v)} x2={PL+CW} y2={ys(v)}
            stroke={v===0?C.BORDER:C.BORDER_L} strokeWidth={v===0?1:0.7}
            strokeDasharray={v===0?"4,3":""}/>
          <text x={PL-4} y={ys(v)+3.5} fontSize={CF.LABEL} fill={C.TEXT_3}
            textAnchor="end" fontFamily={FF.MONO}>{v.toFixed(tickDp)}</text>
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

import { CC, CP, CS, C, FF, CF, OBS } from "../../constants/tokens.js";
import { COND_COLORS } from "../../constants/roles.js";
import { PlotSVG } from "./PlotSVG.jsx";

// Condition-colour fallback when no condColorMap is supplied — the .text shades
// of COND_COLORS, in palette order, so an unmapped group matches its condition hue.
const GROUP_COLORS = COND_COLORS.map(c => c.text);

/**
 * Autocorrelation-by-lag plot.
 *
 * S166 A1 recalibration: the hardcoded ±0.15 "Expected range" band is gone
 * (METHODOLOGY §2.1 v0.4 removed that effect-size floor; the band was
 * stale visual chrome that invited per-pair outlier-hunting). The
 * verdict-driving statistic — the producer's pooled lag-1 mean ± 99.9% CI
 * from the one-sample t on allR1 — no longer lives here: as of S232 it has
 * its own dedicated 1-D number-line surface above this plot
 * (MiniCard_Autocorrelation's PooledR1Marker), where the CI's exclusion of
 * zero reads as an interval. This plot is now purely the per-lag decay
 * evidence — per-condition (or dataset-wide) lag-k curves across lags 1–10.
 *
 * @param {object[]} [perGroupDecay] — [{group, curve: number[]}]
 * @param {number[]} [singleCurve] — fallback dataset-wide decay
 * @param {object} [condColorMap]
 */
export function AutocorrDecayPlot({ perGroupDecay, singleCurve, condColorMap }) {
  const curves = perGroupDecay || (singleCurve ? [{group:"All data", curve:singleCurve}] : null);
  if(!curves || !curves.length) return null;

  const W=CP.W, H=170;
  const PL=52, PR=10, PT=12, PB=36;
  const CW=W-PL-PR, CH=H-PT-PB;
  const LAGS=10;

  // Data-aware y-axis (S166 fix-2 FIX 1). Symmetric around zero so the
  // r = 0 reference is always on-axis and each curve's relation to zero
  // reads as a directional gap. MIN_HALF_SPAN floor stops near-zero decay
  // curves (DS21: pooled lag-1 mean ~0.06) from collapsing against the
  // reference line — the floor leaves visible breathing space. Floor is a
  // MINIMUM: wider-r fixtures (METHODOLOGY §2.1 records r up to ~0.8 for
  // strong fabrication) expand the axis above it via the fit. Tick step
  // adapts to span so the near-zero case gets useful sub-divisions instead
  // of a single tick per half-axis.
  const fitVals = curves.flatMap(c => c.curve).filter(v => Number.isFinite(v));
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
            stroke={v===0?CC.EXP:C.GRID} strokeWidth={v===0?CS.REF.w:CS.GRID.w}
            strokeDasharray={v===0?CS.REF.dash:""} opacity={v===0?CS.REF.opacity:1}/>
          <text x={PL-4} y={ys(v)+3.5} fontSize={CF.LABEL} fill={C.TEXT_2}
            textAnchor="end" fontFamily={FF.MONO}>{v.toFixed(tickDp)}</text>
        </g>
      ))}
      {/* group lines */}
      {curves.map((c,ci)=>{
        // Row-13 drift guard (S246): the no-condition "All data" curve reads
        // observed-blue (CC.OBS) directly, not via the COND_COLORS palette
        // (slot 0 is lime since the S250 reorder) — keeps the dataset-wide
        // curve on the observed-blue channel regardless of palette order.
        const col=c.group==="All data" ? CC.OBS : (condColorMap?.[c.group]?.text || GROUP_COLORS[ci%GROUP_COLORS.length]);
        const pts=c.curve.map((v,i)=>`${xs(i+1)},${ys(v)}`).join(" ");
        return (
          <g key={ci}>
            <polyline points={pts} fill="none" stroke={col} strokeWidth={CS.DATA.w} strokeOpacity={OBS.line.strokeOpacity}/>
            {c.curve.map((v,i)=>(
              <circle key={i} cx={xs(i+1)} cy={ys(v)} r={CS.PT_SM.r} fill={col} fillOpacity={OBS.dot.fillOpacity}/>
            ))}
          </g>
        );
      })}
      {/* x axis */}
      <line x1={PL} y1={PT+CH} x2={PL+CW} y2={PT+CH} stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      {Array.from({length:LAGS},(_,i)=>(
        <text key={i} x={xs(i+1)} y={H-PB+14} fontSize={CF.LABEL} fill={C.TEXT_2}
          textAnchor="middle" fontFamily={FF.MONO}>{i+1}</text>
      ))}
      <text x={PL+CW/2} y={H-2} fontSize={CF.AXIS} fill={C.TEXT_2}
        textAnchor="middle" fontFamily={FF.UI}>Lag (rows apart)</text>
      {/* Y-axis label */}
      <text x={8} y={PT+CH/2} fontSize={CF.AXIS} fill={C.TEXT_2}
        textAnchor="middle" fontFamily={FF.UI} transform={`rotate(-90,8,${PT+CH/2})`}>Autocorrelation (r)</text>
    </PlotSVG>
  );
}

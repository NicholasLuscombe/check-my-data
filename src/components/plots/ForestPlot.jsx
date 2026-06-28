/* ── ForestPlot — per-unit display primitive ── */

import { C, CC, CP, CS, CF, FF } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

// One shared per-unit forest, the first piece of the per-unit display
// programme. Each unit is a point at its own estimate on a horizontal effect
// axis, plotted against a reference, with the flagged units marked apart from
// the cleared ones. The reader reads distance from the reference as the size
// of the effect; the colour reads the unit's own significance decision. The
// two are kept separate on purpose: a unit can sit far from the reference and
// still be cleared, or sit close and still be flagged — the geometry shows the
// effect, the colour shows whether it cleared the boundary the verdict uses.
//
// Colour follows the observed-data model (PLOT-COLOUR-SEMANTICS channel 4):
// blue for a cleared mark, red for a flagged one. There is no green resting
// state and no neutral-grey unit — an observed mark is blue when clear and red
// when flagged, nothing in between. The reference is axis furniture, drawn in
// the axis colour, not a signal colour: significance rides on each unit's
// decision, not on its distance from the reference line.
//
// `referenceMode` rides on the data and drives the render — it is a property
// of the units, never a per-card choice:
//   'zero'   — every unit's reference is zero; one shared origin line.
//   'stored' — each unit carries its own reference value; a per-unit tick.
//   'none'   — strip mode: significance-ranked, no effect axis. Not built in
//              this pass — it lands with its first consumer (LOESS). The tuple
//              already carries `referenceMode` and `adjP`, so the strip render
//              slots in here as another branch without reshaping the unit.
//
// The unit tuple (per the per-unit display spec §2.1):
//   { unitLabel, estimate, reference, referenceMode, adjP, flagged,
//     direction?, interval? }
// Display-level context, set once per card: `flagBoundary` (the p threshold a
// strip ranks against), `multiplicityNote` (the correction applied, shown so
// the reader sees the units were corrected), `effectAxisLabel` (forest only).

export function ForestPlot({
  units,
  effectAxisLabel,
  multiplicityNote,
  // flagBoundary drives the strip-mode threshold line; unused in forest mode,
  // where each unit's `flagged` already carries the gated decision. Kept on the
  // contract so the strip branch reads it without a signature change.
  flagBoundary,
  W = CP.W,
}) {
  if (!units?.length) return null;
  const mode = units[0].referenceMode;
  if (mode === "none") return null; // strip mode deferred — see the header note

  const ROW_H = 18;
  const PL = 58, PR = 18, PT = 20, PB = 54;
  const CW = W - PL - PR;
  const n = units.length;
  const H = PT + n * ROW_H + PB;

  // x-domain: every estimate, plus each stored reference, plus the origin in
  // zero mode (so r = 0 always sits on the axis).
  const xsVals = [];
  for (const u of units) {
    if (Number.isFinite(u.estimate)) xsVals.push(u.estimate);
    if (mode === "stored" && Number.isFinite(u.reference)) xsVals.push(u.reference);
  }
  if (!xsVals.length) return null;
  let lo, hi;
  if (mode === "zero") {
    // Symmetric around zero; a floor keeps near-zero estimates legible.
    const half = Math.max(0.12, Math.max(...xsVals.map(v => Math.abs(v))) * 1.15);
    lo = -half; hi = half;
  } else {
    const mn = Math.min(...xsVals), mx = Math.max(...xsVals);
    const pad = (mx - mn) * 0.1 || 0.1;
    lo = mn - pad; hi = mx + pad;
  }
  const xs = v => PL + (v - lo) / (hi - lo) * CW;

  // Nice tick step targeting roughly five ticks across the domain.
  const span = hi - lo;
  const rawStep = span / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normStep = rawStep / magnitude;
  const step = (normStep < 1.5 ? 1 : normStep < 3 ? 2 : normStep < 7 ? 5 : 10) * magnitude;
  const dp = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    ticks.push(Math.round(v / step) * step);
  }

  const axisY = PT + n * ROW_H + 6;

  return (
    <PlotSVG W={W} H={H}>
      {/* zero-mode origin — one shared reference at r = 0. Axis furniture in
          the axis colour, not a verdict null: the flag decision rides on each
          unit's own significance, not on distance from this line. */}
      {mode === "zero" && (
        <>
          <line x1={xs(0)} y1={PT - 2} x2={xs(0)} y2={axisY}
            stroke={C.AXIS} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={0.8} />
          <text x={xs(0)} y={PT - 6} fontSize={CF.SMALL} fill={C.TEXT_2}
            textAnchor="middle" fontFamily={FF.MONO}>r = 0</text>
        </>
      )}

      {/* one row per unit */}
      {units.map((u, i) => {
        const cy = PT + i * ROW_H + ROW_H / 2;
        const col = u.flagged === true ? CC.THRESH : CC.OBS;
        const hasInterval = Array.isArray(u.interval)
          && Number.isFinite(u.interval[0]) && Number.isFinite(u.interval[1]);
        return (
          <g key={i}>
            <text x={PL - 8} y={cy + 3} fontSize={CF.SMALL} fill={C.TEXT_2}
              textAnchor="end" fontFamily={FF.MONO}>{u.unitLabel}</text>
            {/* stored-mode per-unit reference tick */}
            {mode === "stored" && Number.isFinite(u.reference) && (
              <line x1={xs(u.reference)} y1={cy - 5} x2={xs(u.reference)} y2={cy + 5}
                stroke={C.AXIS} strokeWidth={CS.GRID.w} />
            )}
            {/* interval whisker, when a unit carries one */}
            {hasInterval && (
              <line x1={xs(u.interval[0])} y1={cy} x2={xs(u.interval[1])} y2={cy}
                stroke={col} strokeWidth="1.5" />
            )}
            {Number.isFinite(u.estimate) && (
              <circle cx={xs(u.estimate)} cy={cy} r={CS.PT_LG.r}
                fill={col} stroke={C.WHITE} strokeWidth="1" />
            )}
          </g>
        );
      })}

      {/* effect axis + ticks */}
      <line x1={PL} y1={axisY} x2={PL + CW} y2={axisY} stroke={C.AXIS} strokeWidth={CS.GRID.w} />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={xs(t)} y1={axisY} x2={xs(t)} y2={axisY + 4} stroke={C.AXIS} strokeWidth={CS.GRID.w} />
          <text x={xs(t)} y={axisY + 15} fontSize={CF.SMALL} fill={C.TEXT_2}
            textAnchor="middle" fontFamily={FF.MONO}>{t.toFixed(dp)}</text>
        </g>
      ))}
      {effectAxisLabel && (
        <text x={PL + CW / 2} y={axisY + 30} fontSize={CF.AXIS} fill={C.TEXT_2}
          textAnchor="middle" fontFamily={FF.UI}>{effectAxisLabel}</text>
      )}
      {/* multiplicity made visible — the reader sees the units were corrected */}
      {multiplicityNote && (
        <text x={PL + CW / 2} y={axisY + 44} fontSize={CF.SMALL} fill={C.TEXT_3}
          textAnchor="middle" fontFamily={FF.UI}>{multiplicityNote}</text>
      )}
    </PlotSVG>
  );
}

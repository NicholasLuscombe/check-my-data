/* ── MiniCard: Autocorrelation ── */

import { C, CP, CS, CF, FF, FW, SIGNAL } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { buildCondColorMap, COND_COLORS } from "../../constants/roles.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { AutocorrDecayPlot } from "../plots/AutocorrDecayPlot.jsx";
import { PlotSVG } from "../plots/PlotSVG.jsx";
import { DotStrip } from "../plots/DotStrip.jsx";
import { shortName } from "../shared/utils.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


// ── Pooled lag-1 verdict number-line (S232) ─────────────────────────
// Dedicated horizontal 1-D r-axis carrying the producer's pooled lag-1
// mean (one-sample t on allR1, autocorrelation.js) with its 99.9% CI
// whisker, against the dashed r = 0 reference. The interval's relation to
// zero IS the verdict — when the CI excludes zero, average serial
// correlation across pairs is reliably above independence. Mirrors the
// Runs PooledZMarker treatment; r-scale ticks adapt to span (verdict r and
// its CI run small, ~0.06, so a fixed integer scale would be illegible).
function PooledR1Marker({ value, ci }) {
  if (!Number.isFinite(value)) return null;
  const W = CP.W_LG, H = 60;
  const PL = 50, PR = 50, PT = 16;
  const CW = W - PL - PR;
  // Symmetric r-axis around 0; floor keeps near-zero CIs legible (mirrors
  // the decay plot's MIN_HALF_SPAN). Widen if marker / CI exceeds it.
  const rawSpan = Math.max(
    Math.abs(value) * 1.3,
    ...(Array.isArray(ci) ? ci.filter(Number.isFinite).map(v => Math.abs(v) * 1.3) : [0])
  );
  const span = Math.max(0.12, rawSpan);
  // Tick step keyed to span (mirrors AutocorrDecayPlot): 0.05 tight, 0.1
  // medium, 0.2 wide. Round span UP to a tick multiple so r = 0 lands on a tick.
  const tickStep = span <= 0.25 ? 0.05 : span <= 0.6 ? 0.1 : 0.2;
  const niceSpan = Math.ceil(span / tickStep) * tickStep;
  const RMIN = -niceSpan, RMAX = niceSpan;
  const xs = (r) => PL + (r - RMIN) / (RMAX - RMIN) * CW;
  const cy = PT + 14;
  const tickDp = tickStep < 0.1 ? 2 : 1;
  const ticks = [];
  for (let v = RMIN; v <= RMAX + 1e-9; v += tickStep) ticks.push(Math.round(v * 1000) / 1000);
  return (
    <PlotSVG W={W} H={H}>
      {/* r = 0 dashed reference */}
      <line x1={xs(0)} y1={PT} x2={xs(0)} y2={PT + 28}
        stroke={C.AXIS} strokeWidth={CS.GRID.w} strokeDasharray="4,3"/>
      <text x={xs(0)} y={PT - 4} fontSize={CF.SMALL} fill={C.TEXT_2}
        textAnchor="middle" fontFamily={FF.MONO}>r = 0</text>
      {/* CI whisker */}
      {Array.isArray(ci) && Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && (
        <>
          <line x1={xs(ci[0])} y1={cy} x2={xs(ci[1])} y2={cy}
            stroke={C.TEXT} strokeWidth="1.5"/>
          <line x1={xs(ci[0])} y1={cy - 5} x2={xs(ci[0])} y2={cy + 5}
            stroke={C.TEXT} strokeWidth="1.5"/>
          <line x1={xs(ci[1])} y1={cy - 5} x2={xs(ci[1])} y2={cy + 5}
            stroke={C.TEXT} strokeWidth="1.5"/>
        </>
      )}
      {/* Marker dot */}
      <circle cx={xs(value)} cy={cy} r={CS.PT_LG.r + 1}
        fill={C.TEXT} stroke={C.WHITE} strokeWidth="1.5"/>
      {/* Axis */}
      <line x1={PL} y1={PT + 28} x2={PL + CW} y2={PT + 28}
        stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      {ticks.map(t => (
        <g key={t}>
          <line x1={xs(t)} y1={PT + 28} x2={xs(t)} y2={PT + 32}
            stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
          <text x={xs(t)} y={PT + 42} fontSize={CF.SMALL} fill={C.TEXT_2}
            textAnchor="middle" fontFamily={FF.MONO}>{t.toFixed(tickDp)}</text>
        </g>
      ))}
    </PlotSVG>
  );
}

export function MiniCard_Autocorrelation({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const meanR1 = typeof result.pooledMeanR1 === "number" ? result.pooledMeanR1 : parseFloat(result.pooledMeanR1);

  // ── Decay chart (Surface 2) ──
  // The verdict statistic (pooled lag-1 mean ± 99.9% CI) now lives on its
  // own number-line surface above (PooledR1Marker); this plot carries only
  // the per-lag decay evidence.
  const hasDecay = result.perGroupDecay?.length || result.decayCurve;
  let mainChart = null;
  if (result.perGroupDecay?.length) {
    mainChart = <AutocorrDecayPlot perGroupDecay={result.perGroupDecay} condColorMap={condColorMap} />;
  } else if (result.decayCurve) {
    mainChart = <AutocorrDecayPlot singleCurve={result.decayCurve} condColorMap={condColorMap} />;
  } else {
    const pairData = sub.length ? sub : details;
    if (pairData.length && pairData[0].lag1 !== undefined) {
      // S166 A1: ±0.15 reference band dropped (stale v0.3 effect-size floor
      // removed by METHODOLOGY §2.1 v0.4). The DotStrip fallback keeps the
      // r=0 reference line via refMin=refMax=0; per-pair dots are texture,
      // verdict-marker would attach here in a future pass (the decayCurve
      // branch above is the dominant path).
      mainChart = (
        <DotStrip items={pairData} valueKey="lag1" refMin={0} refMax={0}
          refLabel="0 (independent)" xlabel="Lag-1 autocorrelation of inter-replicate differences"
          colorKey="significant" />
      );
    }
  }

  // ── Legend items — per-condition lines + r=0 reference. The verdict
  //    marker swatch retires from here in S232: the verdict moved to its
  //    own number-line surface above, with its own r = 0 reference. The
  //    pre-S166 "Expected range" swatch retired alongside the ±0.15 rect. ──
  const legendItems = hasDecay ? [
    ...(result.perGroupDecay || [{ group: "All data" }]).map((c, ci) => ({
      color: condColorMap[c.group]?.text || COND_COLORS[ci % COND_COLORS.length].text,
      label: shortName(c.group),
      opacity: 0.7,
      swatchType: "line",
    })),
    { color: C.BORDER, label: "r = 0 (independent)", swatchType: "line", dashed: true },
  ] : null;

  // ── Footer ──
  const footer = (result.flag !== "LOW" && result.flag !== "N/A")
    ? "Noise correlates from one row to the next"
    : "Noise independent row to row";

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor={result.effectSizeClass === "strong" ? "Autocorrelation this size means that knowing one row's noise lets you predict the next — a hallmark of manually constructed sequences. Ask for the original instrument output files and compare the row ordering against the submitted data. Check whether the autocorrelation is concentrated in specific conditions by comparing the per-condition lines in the decay chart." : "Autocorrelation like this can arise from several sources. Check whether the data was sorted or re-ordered before submission — this can break the natural measurement sequence and introduce artificial patterns. Compare against a fresh export from the instrument to rule out post-processing artefacts."}
      implications="Correlated consecutive noise can result from time-dependent biological processes — for example, temperature drift or reagent degradation affecting adjacent samples. It can also indicate that values were generated using a formula that links each row to its neighbours rather than recording independent measurements.">

      {/* Surface 1 (S232): pooled lag-1 verdict number-line — the verdict
          statistic (one-sample t on allR1, autocorrelation.js) drawn against
          r = 0 with its 99.9% CI whisker. The interval-vs-zero relation IS the
          verdict; the per-lag decay surface below is the evidence. The footer
          fragment (LEAD_HEAD in MiniCardLayout) heads this primary surface, so
          no heading here (mirrors Runs). */}
      {Number.isFinite(meanR1) && Array.isArray(result.pooledR1CI) && (
        <PlotLayout>
          <PooledR1Marker value={meanR1} ci={result.pooledR1CI} />
        </PlotLayout>
      )}

      {mainChart && (
        <>
          {/* Surface 2 (S232): per-lag decay evidence — demoted to a secondary
              surface beneath the verdict number-line (S210 secondary-heading
              treatment, Regular weight). */}
          <div style={{...SUB_HEAD, marginTop: BLOCK_GAP, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Autocorrelation by lag</div>
          <PlotLayout fitContent>
            {mainChart}
          </PlotLayout>
          {legendItems && <ChartLegend items={legendItems} />}
          {/* Plot caption (S166 A1; S166 fix-2 FIX 2: adapt to actual
              line count). The plot renders one line per perGroupDecay
              entry, falling back to a single "All data" line when no
              per-condition decay is available. Caption text follows the
              same branch so the wording matches what's actually drawn —
              pre-fix the caption asserted "per-condition" even on the
              single-line fallback, contradicting the legend. The verdict
              statement now lives on the number-line surface above. */}
          {hasDecay && (
            <div style={{...SUB_HEAD, marginTop: "6px", marginBottom: 0, color: C.TEXT_3, fontWeight: FW.NORM}}>
              {(result.perGroupDecay?.length || 0) > 1
                ? "Lines are per-condition lag-k means"
                : "The line shows lag-k means across pairs"}
              ; dots are per-lag values.
            </div>
          )}
        </>
      )}

      {result.lagTable?.length > 0 && (() => {
        const cols = [{label:"Lag"}, {label:"Pooled r"}, {label:"Pairs sig."}, {label:"Adj. p"}];
        const rows = result.lagTable.map(r => {
          const sig = r.isPromotionTrigger === true;
          const cell = v => sig ? { value: v, style:{ color: SIGNAL.AMBER.text, fontWeight: FW.SEMI } } : v;
          const pairsStr = r.pairsSig == null ? "—" : `${r.pairsSig}/${r.pairsTotal}`;
          return [cell(r.lag), cell(Number(r.pooledR).toFixed(2)), cell(pairsStr), cell(fmtP(r.rawAdjP))];
        });
        // S166 A2: condition the "promoted to MODERATE" string on the
        // producer's `higherLagWasDecisive` boolean — true only when
        // higher-lag evidence actually moved the flag (lag-1 was LOW).
        // The legacy `higherLagPromoted` field stays set whenever the
        // (i)∧(ii)∧(iii) trio fires on any lag 2–5, even on HIGH cards
        // where lag-1 already drove the verdict; reading it for the
        // footer string produced a false "promoted" claim. When the
        // structure is present but lag-1 was already flagged, the new
        // string acknowledges corroboration without claiming promotion.
        const footerText = result.higherLagWasDecisive
          ? "The pattern repeats at longer gaps (every 2–5 rows), not just between adjacent rows — that wider structure raised this to Moderate."
          : result.higherLagPromoted
            ? "The pattern repeats at longer gaps (every 2–5 rows), not just between adjacent rows — backing up the adjacent-row finding."
            : "The main check is between adjacent rows; longer-gap patterns (2–5 rows apart) act as backup evidence.";
        return (
          <>
            {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
            <div style={{...SUB_HEAD, marginTop: BLOCK_GAP, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Pooled autocorrelation by lag</div>
            <EvidenceTable columns={cols} rows={rows} identifierColumns={1} compact
              footerText={footerText} />
          </>
        );
      })()}

    </MiniCardLayout>
  );
}

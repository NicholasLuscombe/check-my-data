/* ── MiniCard: Autocorrelation ── */

import { C, FW, SIGNAL } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { buildCondColorMap, COND_COLORS } from "../../constants/roles.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { AutocorrDecayPlot } from "../plots/AutocorrDecayPlot.jsx";
import { DotStrip } from "../plots/DotStrip.jsx";
import { shortName } from "../shared/utils.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


export function MiniCard_Autocorrelation({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const meanR1 = typeof result.pooledMeanR1 === "number" ? result.pooledMeanR1 : parseFloat(result.pooledMeanR1);

  // ── Verdict marker (S166 A1) ──
  // The producer's pooled lag-1 mean + 95% CI from the one-sample t on
  // allR1 (autocorrelation.js). The plot draws it at lag 1; the CI's
  // exclusion of zero is the verdict in visual form.
  const verdictMarker = Number.isFinite(meanR1) ? {
    value: meanR1,
    ci: Array.isArray(result.pooledR1CI95) ? result.pooledR1CI95 : null,
    lag: 1,
  } : null;

  // ── Chart ──
  const hasDecay = result.perGroupDecay?.length || result.decayCurve;
  let mainChart = null;
  if (result.perGroupDecay?.length) {
    mainChart = <AutocorrDecayPlot perGroupDecay={result.perGroupDecay} condColorMap={condColorMap} verdictMarker={verdictMarker} />;
  } else if (result.decayCurve) {
    mainChart = <AutocorrDecayPlot singleCurve={result.decayCurve} condColorMap={condColorMap} verdictMarker={verdictMarker} />;
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

  // ── Legend items — per-condition lines, r=0 reference, and the verdict
  //    marker (pooled lag-1 mean ± 95% CI). The pre-S166 "Expected range"
  //    swatch retires alongside the ±0.15 rectangle. ──
  const legendItems = hasDecay ? [
    ...(result.perGroupDecay || [{ group: "All data" }]).map((c, ci) => ({
      color: condColorMap[c.group]?.text || COND_COLORS[ci % COND_COLORS.length].text,
      label: shortName(c.group),
      opacity: 0.7,
      swatchType: "line",
    })),
    { color: C.TEXT, label: "Mean ± 95% CI at lag 1 (verdict)", swatchType: "dot" },
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

      {mainChart && (
        <>
          {/* S210 (multi-surface): primary-surface heading dropped — the footer
              fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
          <PlotLayout>
            {mainChart}
          </PlotLayout>
          {legendItems && <ChartLegend items={legendItems} />}
          {/* Plot caption (S166 A1; S166 fix-2 FIX 2: adapt to actual
              line count). The plot renders one line per perGroupDecay
              entry, falling back to a single "All data" line when no
              per-condition decay is available. Caption text follows the
              same branch so the wording matches what's actually drawn —
              pre-fix the caption asserted "per-condition" even on the
              single-line fallback, contradicting the legend. The pooled-
              mean marker and its CI carry the verdict regardless. */}
          {hasDecay && (
            <div style={{...SUB_HEAD, marginTop: "6px", marginBottom: 0, color: C.TEXT_3, fontWeight: FW.NORM}}>
              {(result.perGroupDecay?.length || 0) > 1
                ? "Lines are per-condition lag-k means"
                : "The line shows lag-k means across pairs"}
              ; dots are per-lag values. The mean ± 95% CI marker at lag 1 carries the verdict — average serial correlation across pairs is reliably above zero when the interval excludes the dashed reference.
            </div>
          )}
        </>
      )}

      {result.lagTable?.length > 0 && (() => {
        const cols = [{label:"Lag"}, {label:"Pooled r"}, {label:"Adj. p"}, {label:"Pairs sig."}];
        const rows = result.lagTable.map(r => {
          const sig = r.isPromotionTrigger === true;
          const cell = v => sig ? { value: v, style:{ color: SIGNAL.AMBER.text, fontWeight: FW.SEMI } } : v;
          const pairsStr = r.pairsSig == null ? "—" : `${r.pairsSig}/${r.pairsTotal}`;
          return [cell(r.lag), cell(Number(r.pooledR).toFixed(2)), cell(fmtP(r.rawAdjP)), cell(pairsStr)];
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

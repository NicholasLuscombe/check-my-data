/* ── MiniCard: Autocorrelation ── */

import { C, CC, TF, FW, FF, CHART, SIGNAL } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { buildCondColorMap } from "../../constants/roles.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { AutocorrDecayPlot } from "../plots/AutocorrDecayPlot.jsx";
import { DotStrip } from "../plots/DotStrip.jsx";
import { shortName } from "../shared/utils.js";
import { SUB_HEAD } from "../shared/styles.js";


export function MiniCard_Autocorrelation({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const meanR1 = typeof result.pooledMeanR1 === "number" ? result.pooledMeanR1 : parseFloat(result.pooledMeanR1);
  const absR1 = Math.abs(meanR1);

  // ── Headline ──
  let headline;
  if (result.flag === "LOW" || result.flag === "N/A") {
    headline = "Row-to-row noise is random — no predictable patterns between successive measurements.";
  } else if (result.effectSizeClass === "strong") {
    headline = `Each row's noise strongly resembles the row before it (r\u2009=\u2009${meanR1.toFixed(3)}) — knowing one row's error lets you predict the next.`;
  } else {
    headline = `Each row's noise weakly resembles the row before it (r\u2009=\u2009${meanR1.toFixed(3)}) — successive measurements are not fully independent.`;
  }

  // ── Chart ──
  const hasDecay = result.perGroupDecay?.length || result.decayCurve;
  let mainChart = null;
  if (result.perGroupDecay?.length) {
    mainChart = <AutocorrDecayPlot perGroupDecay={result.perGroupDecay} condColorMap={condColorMap} />;
  } else if (result.decayCurve) {
    mainChart = <AutocorrDecayPlot singleCurve={result.decayCurve} condColorMap={condColorMap} />;
  } else {
    const pairData = sub.length ? sub : details;
    if (pairData.length && pairData[0].lag1 !== undefined) {
      mainChart = (
        <DotStrip items={pairData} valueKey="lag1" refMin={-0.15} refMax={0.15}
          refLabel="≈ 0 (independent)" xlabel="Lag-1 autocorrelation of inter-replicate differences"
          colorKey="significant" />
      );
    }
  }

  // ── Legend items — line swatches for conditions + average, square for expected range ──
  const legendItems = hasDecay ? [
    ...(result.perGroupDecay || [{ group: "All data" }]).map((c, ci) => ({
      color: condColorMap[c.group]?.border || CHART.SERIES[ci % CHART.SERIES.length],
      label: shortName(c.group),
      opacity: 0.7,
      swatchType: "line",
    })),
    { color: C.TEXT, label: "Average (tested)", swatchType: "line" },
    { color: CC.EXP, label: "Expected range" },
  ] : null;

  // ── Footer ──
  const pStr = fmtP(result.primaryP);
  const acDir = isNaN(meanR1) ? "" : meanR1 > 0 ? " · positive autocorrelation" : " · negative autocorrelation";
  const footer = `${result.nPairs} pair${result.nPairs !== 1 ? "s" : ""} tested${acDir} · mean |r| = ${isNaN(meanR1) ? "—" : Math.abs(meanR1).toFixed(3)} · p ${pStr.startsWith("<") ? pStr : "= " + pStr}`;

  return (
    <MiniCardLayout result={result} headline={headline}
      desc={result.description}
      footer={footer}
      lookFor={result.effectSizeClass === "strong" ? "Strong autocorrelation means that knowing one row's noise lets you predict the next — a hallmark of manually constructed sequences. Ask for the original instrument output files and compare the row ordering against the submitted data. Check whether the autocorrelation is concentrated in specific conditions by comparing the per-condition lines in the decay chart." : "Moderate autocorrelation can arise from several sources. Check whether the data was sorted or re-ordered before submission — this can break the natural measurement sequence and introduce artificial patterns. Compare against a fresh export from the instrument to rule out post-processing artefacts."}
      implications="Correlated consecutive noise can result from time-dependent biological processes — for example, temperature drift or reagent degradation affecting adjacent samples. It can also indicate that values were generated using a formula that links each row to its neighbours rather than recording independent measurements.">

      {mainChart && (
        <>
          <div style={SUB_HEAD}>Autocorrelation by lag</div>
          <PlotLayout>
            {mainChart}
          </PlotLayout>
          {legendItems && <ChartLegend items={legendItems} />}
        </>
      )}

      {result.lagTable?.length > 0 && (() => {
        const cols = [{label:"Lag"}, {label:"Pooled r"}, {label:"p"}, {label:"adj p"}, {label:"pairs sig"}];
        const rows = result.lagTable.map(r => {
          const sig = r.isPromotionTrigger === true;
          const cell = v => sig ? { value: v, style:{ color: SIGNAL.AMBER.text, fontWeight: FW.SEMI } } : v;
          const pairsStr = r.pairsSig == null ? "—" : `${r.pairsSig}/${r.pairsTotal}`;
          return [cell(r.lag), cell(r.pooledR), cell(fmtP(r.rawP)), cell(fmtP(r.rawAdjP)), cell(pairsStr)];
        });
        return (
          <>
            <div style={{...SUB_HEAD, marginTop: "12px"}}>Pooled autocorrelation by lag</div>
            <EvidenceTable columns={cols} rows={rows} identifierColumns={1} compact
              footerText={result.higherLagPromoted
                ? "Higher-lag (2–5) serial structure survives pooled BH-FDR at α = 0.001 AND ≥ 2 pairs corroborate per-pair — sub-unit evidence promoted this test to MODERATE."
                : "Lag 1 is the primary statistic; lags 2–5 are sub-unit evidence (promotion requires pooled adj p < 0.001 plus ≥ 2 pairs at per-pair adj p < 0.05)."} />
          </>
        );
      })()}

    </MiniCardLayout>
  );
}

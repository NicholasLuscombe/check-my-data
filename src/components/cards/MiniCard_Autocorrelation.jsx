/* ── MiniCard: Autocorrelation ── */

import { C, CC, FW, FS, SEV_VERDICT, OBS } from "../../constants/tokens.js";
import { fmtP, EFFECT_SIZE } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { buildCondColorMap, COND_COLORS } from "../../constants/roles.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { AutocorrDecayPlot } from "../plots/AutocorrDecayPlot.jsx";
import { ForestPlot } from "../plots/ForestPlot.jsx";
import { DotStrip } from "../plots/DotStrip.jsx";
import { shortName } from "../shared/utils.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


export function MiniCard_Autocorrelation({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const condColorMap = buildCondColorMap(importConfig);
  // Aggregated (column-grouped) path marker — the same predicate Runs uses.
  // The forest is suppressed on this path (see the mount below).
  const isAgg = result.groupsAssessed !== undefined;

  // ── Per-unit forest (S283): the verdict geometry. Replaces the old pooled
  //    lag-1 band. The band plotted one pooled quantity, while the flag also
  //    promotes on per-pair lag-1 evidence and on the higher lags (2–5) — so a
  //    clean band could sit beside a flagged verdict. The forest shows each
  //    unit against r = 0, marked by its own decision, so the geometry carries
  //    the same claim the verdict rests on.
  //
  //    Two unit kinds, both lag-k autocorrelation r against r = 0:
  //      • per-pair lag-1 — each replicate pair's lag-1 r, from `details` (the
  //        single-matrix per-pair array). Flagged off the engine's per-pair
  //        `significant`. That boolean fires at the Moderate boundary (adjusted
  //        p below 0.01), which is looser than the verdict's own per-pair
  //        promotion (below 0.001). Reconciling the two is a pending retention
  //        question: the engine computes the adjusted per-pair p, sets the
  //        boolean, and drops the number, so the mount cannot route on 0.001
  //        without an engine change.
  //      • higher-lag promoters (lags 2–5) — each lag's pooled r. Flagged off
  //        `isPromotionTrigger`, the exact field the verdict promotes on, so a
  //        lag that is individually significant but small reads cleared when the
  //        effect-size floor withholds promotion (the caption below says so).
  //
  //    The forest renders on the single-matrix path only. On the column-grouped
  //    path the verdict is combined across conditions and no single pair can
  //    clear, so the forest would carry no markable unit; it is suppressed there
  //    (the mount gates on `!isAgg`) and the per-condition decay plot plus the
  //    pooled lag table carry that path instead.
  const perPairUnits = details
    .filter(d => d.lag1 !== undefined)
    .map(d => ({
      unitLabel: d.pair,
      estimate: parseFloat(d.lag1),
      reference: 0,
      referenceMode: "zero",
      adjP: undefined, // adjusted per-pair p is computed then dropped in the engine
      flagged: d.significant === true,
    }));
  const higherLagUnits = (result.lagTable || [])
    .filter(r => r.lag > 1 && r.pooledR !== undefined)
    .map(r => ({
      unitLabel: `Lag ${r.lag}`,
      estimate: parseFloat(r.pooledR),
      reference: 0,
      referenceMode: "zero",
      adjP: typeof r.rawAdjP === "number" ? r.rawAdjP : undefined,
      flagged: r.isPromotionTrigger === true,
    }));
  const forestUnits = [...perPairUnits, ...higherLagUnits];
  const nPairs = result.nPairs ?? perPairUnits.length;

  // ── Decay chart (Surface 2) ──
  // The verdict geometry lives on the per-unit forest above; this plot carries
  // only the per-lag decay evidence (lag-k means across pairs).
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
          refLabel="Expected r = 0 (independent)" xlabel="Lag-1 autocorrelation of inter-replicate differences"
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
      // Swatch samples its mark: the single "All data" decay line is drawn in
      // observed-blue (CC.OBS) by AutocorrDecayPlot, not a condition colour, so
      // its swatch must be blue too. Per-condition lines keep their condition
      // colour. Mirrors AutocorrDecayPlot's own "All data" special-case.
      color: c.group === "All data" ? CC.OBS : (condColorMap[c.group]?.text || COND_COLORS[ci % COND_COLORS.length].text),
      label: shortName(c.group),
      opacity: OBS.line.strokeOpacity,
      swatchType: "line",
    })),
    { color: CC.EXP, label: "Expected r = 0 (independent)", swatchType: "line", dashed: true },
  ] : null;

  // ── Footer ──
  const footer = (result.flag !== "LOW" && result.flag !== "N/A")
    ? "Noise correlates from one row to the next"
    : "Noise independent row to row";

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor={result.effectSizeClass === "strong" ? "A correlation this size means one row's difference predicts the next. Inspect the raw data files and compare the row order against the submitted data. Check whether the pattern concentrates in particular conditions, and examine the flagged rows for values that follow too smooth or too regular a sequence to have been obtained independently." : "A correlation like this has several possible sources. Check whether the data was sorted or re-ordered before submission, which can break the natural measurement order and introduce a pattern. Inspect the raw data files for a fresh export to rule out post-processing."}
      implications="A correlation from row to row can arise from a time-dependent process: e.g., temperature drift or reagent degradation affecting neighbouring samples. It can also indicate values edited row by row, each nudged slightly from the one above — hand editing that follows a hidden template leaves exactly this kind of serial trail, which independent measurement does not.">

      {/* Surface 1 (S283): per-unit forest — the verdict geometry. Each unit
          (per-pair lag-1 and the higher-lag promoters) sits at its estimate
          against r = 0, marked by its own decision, with the multiplicity
          correction shown. Single-matrix path only — suppressed on the
          column-grouped path (`!isAgg`), where no per-unit can clear and the
          decay plot plus pooled table carry the evidence. The footer fragment
          (LEAD_HEAD in MiniCardLayout) heads this primary surface, so no
          heading here. */}
      {!isAgg && forestUnits.length > 0 && (
        <>
        <PlotLayout fitContent>
          <ForestPlot
            units={forestUnits}
            effectAxisLabel="Lag-k autocorrelation (r)"
            multiplicityNote={`Across ${nPairs} pair${nPairs === 1 ? "" : "s"} and lags 1–5`}
            referenceLabel="Expected (r = 0, independent)"
          />
        </PlotLayout>
        {/* The forest renders the canonical legend itself (flagged / within
            expected range / expected reference) — no card-side legend. */}
        {/* A lag can be individually significant yet read cleared: higher-lag
            promotion also requires the correlation to clear the effect-size
            floor on large samples. The floor value is read from source
            (AUTOCORR_STRONG) so the caption tracks the constant; the 500-row
            condition mirrors the engine's row-count gate. */}
        <div style={{...SUB_HEAD, marginTop: "6px", marginBottom: 0, color: C.TEXT_3, fontWeight: FW.NORM}}>
          {`Lags promote only when the correlation also clears the effect-size floor (r ≥ ${EFFECT_SIZE.AUTOCORR_STRONG} on samples of 500 rows or more).`}
        </div>
        </>
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
        // S276: flagged row marked by a 2px left edge in the card's verdict-tier
        // colour (red at High, amber at Moderate), from the same SEV_VERDICT scale
        // the verdict word uses. Numerals stay body colour; Semibold is the cue.
        const flagColor = result.flag === "HIGH" ? SEV_VERDICT[3].color : SEV_VERDICT[2].color;
        const rows = result.lagTable.map(r => {
          const sig = r.isPromotionTrigger === true;
          const cell = v => sig ? { value: v, style:{ fontWeight: FW.SEMI } } : v;
          const pairsStr = r.pairsSig == null ? "—" : `${r.pairsSig}/${r.pairsTotal}`;
          const row = [cell(r.lag), cell(Number(r.pooledR).toFixed(2)), cell(pairsStr), cell(fmtP(r.rawAdjP))];
          if (sig) row[0] = { ...row[0], style: { ...row[0].style, borderLeft: `2px solid ${flagColor}` } };
          return row;
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
            <div style={{fontSize: FS.sm, color: C.TEXT_3, marginBottom: BLOCK_GAP_TIGHT}}>{"These rows show pooled autocorrelation by lag. The card's verdict is the pooled lag-1 test across all replicate pairs — an individual pair can read 'as expected' while the pooled pattern is flagged."}</div>
            <EvidenceTable columns={cols} rows={rows} identifierColumns={1} compact
              footerText={footerText} />
          </>
        );
      })()}

    </MiniCardLayout>
  );
}

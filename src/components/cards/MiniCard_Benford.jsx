import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { VBarPlot } from "../plots/VBarPlot.jsx";
import { CC, OBS, observedSwatchColor } from "../../constants/tokens.js";


export function MiniCard_Benford({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const name = result.name;
if(!details.length) return null;
const isSecond = name.includes("Second");
const items=details.map(d=>({...d,
  expNum:parseFloat(d.benfordPct)||0,
  obsNum:parseFloat(d.observedPct)||0}));
return (

  <MiniCardLayout result={result}
    footer={result.flag !== "LOW" && result.flag !== "N/A"
      ? (isSecond ? "Second digits depart from the expected pattern" : "Leading digits depart from the expected pattern")
      : (isSecond ? "Second digits match the expected pattern" : "Leading digits match the expected pattern")}
    lookFor={isSecond ? "As with First-digit pattern, treat the positive test as a screening signal: confirm the data really is wide-range positive — the pattern does not apply otherwise and that is the most common innocent cause — and weigh it alongside the other tests rather than on its own. A second-digit flag is corroborating evidence, not a standalone finding." : "Treat the positive test as a screening signal. Confirm the data really is wide-range positive — the pattern does not apply otherwise and that is the most common innocent cause — and weigh it alongside the other tests rather than on its own. A flag is corroborating evidence, not a standalone finding." }
    implications={isSecond
      ? "Departure from the Benford second digit pattern can arise in data with a narrow range or a bounded scale, where the pattern does not apply. It can also indicate chosen or manually generated values and it is harder to mimic than the first digit pattern: e.g., adjustments to the first digits to look natural often leave the less-familiar second-digit pattern wrong."
      : "A departure from the Benford pattern can arise in data with a narrow range or a bounded scale, where the pattern does not apply. It can also indicate chosen or manually generated values: e.g., typed numbers rarely reproduce the trend toward low first digits."}>

    {/* S210 (single-surface): section heading dropped — the footer
        fragment (LEAD_HEAD in MiniCardLayout) heads this sole plot. */}
    <PlotLayout fitContent>
        <VBarPlot
          items={items}
          xKey="digit" obsKey="obsNum"
          expKey="expNum"
          obsColor={CC.OBS}
          expColor={CC.EXP}
          xlabel={isSecond ? "Second digit (0–9)" : "Leading digit (1–9)"}
          ylabel="Frequency (%)" flag={result.flag}/>
    </PlotLayout>
    <ChartLegend items={[
      { color: observedSwatchColor(result.flag), label: "Observed %", opacity: OBS.areaFill.fillOpacity },
      { color: CC.EXP, label: "Expected (Benford)", swatchType: "line", dashed: true },
    ]} />


  </MiniCardLayout>

);

}

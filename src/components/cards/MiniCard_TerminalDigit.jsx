import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { VBarPlot } from "../plots/VBarPlot.jsx";
import { CC, C, FF, FW } from "../../constants/tokens.js";
import { SUB_HEAD } from "../shared/styles.js";


export function MiniCard_TerminalDigit({ result, importConfig, rowMap }) {
  const details = result.details || [];
if(!details.length) return null;

const implications = "Non-uniform last digits can result from instrument truncation, software rounding during export, or file format conversion that strips trailing zeros. They can also indicate hand-entered or hand-adjusted values — humans tend to avoid certain digits and over-use others when typing numbers.";

return (

  <MiniCardLayout result={result}
    implications={implications}
    footer={<>
      {result.flag !== "LOW" && result.flag !== "N/A" ? "last digits are not evenly spread" : "last digits evenly spread"}
      {result.trailingZeroWarning && <span style={{color:C.TEXT_3,fontFamily:FF.UI}}> · 9-digit test (digit 0 excluded)</span>}
    </>}
    lookFor="Check which digits are over- or under-represented. Humans tend to favour digits 0 and 5 (rounding) and avoid extremes like 0 and 9 at the end. If the dataset has trailing-zero suppression, focus on digits 1–9. A non-uniform pattern across multiple digits is stronger evidence than a single digit being slightly off.">

    <div style={SUB_HEAD}>Terminal digit frequencies</div>
    <PlotLayout>
        <VBarPlot
          items={details}
          xKey="digit" obsKey="observed"
          expKey="expected"
          obsColor={CC.OBS}
          expColor={CC.EXP}
          xlabel="Terminal digit (0–9)"
          ylabel="Count"/>
    </PlotLayout>
    <ChartLegend items={[
      { color: CC.OBS, label: "Observed count", opacity: 0.35 },
      { color: CC.EXP, label: "Uniform expected", swatchType: "line" },
    ]} />


  </MiniCardLayout>

);

}

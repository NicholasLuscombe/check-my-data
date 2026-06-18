import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { VBarPlot } from "../plots/VBarPlot.jsx";
import { CC, C, FF, FW } from "../../constants/tokens.js";


export function MiniCard_TerminalDigit({ result, importConfig, rowMap }) {
  const details = result.details || [];
if(!details.length) return null;

  // Per-unit display follows the corrected decision the verdict used
  // (INVESTIGATION-DISPLAY-SPEC §544): under trailing-zero suppression the gate
  // runs the 9-digit test with digit 0 excluded (terminalDigits.js:46-54), so the
  // plot drops digit 0 and centres on the 9-digit uniform (exp9 = total9/9), not
  // the ten-digit exp10. Display-only — the engine result is unchanged.
  const tzw = result.trailingZeroWarning;
  let plotDetails = details;
  if (tzw) {
    const digit0 = details.find(d => d.digit === 0);
    const exp9 = (result.nValues - (digit0 ? digit0.observed : 0)) / 9;
    plotDetails = details.filter(d => d.digit !== 0).map(d => ({ ...d, expected: exp9 }));
  }
  const xlabel = tzw ? "Terminal digit (1–9)" : "Terminal digit (0–9)";

const implications = "Non-uniform last digits can result from instrument truncation, software rounding during export, or file format conversion that strips trailing zeros. They can also indicate hand-entered or hand-adjusted values — humans tend to avoid certain digits and over-use others when typing numbers.";

return (

  <MiniCardLayout result={result}
    implications={implications}
    footer={<>
      {result.flag !== "LOW" && result.flag !== "N/A" ? "Last digits are not evenly spread" : "Last digits evenly spread"}
      {result.trailingZeroWarning && <span style={{color:C.TEXT_3,fontFamily:FF.UI}}> · 9-digit test (digit 0 excluded)</span>}
    </>}
    lookFor="Check which digits are over- or under-represented. Humans tend to favour digits 0 and 5 (rounding) and avoid extremes like 0 and 9 at the end. If the dataset has trailing-zero suppression, focus on digits 1–9. A non-uniform pattern across multiple digits is stronger evidence than a single digit being slightly off.">

    {/* S210 (single-surface): section heading dropped — the footer
        fragment (LEAD_HEAD in MiniCardLayout) heads this sole plot. */}
    <PlotLayout fitContent>
        <VBarPlot
          items={plotDetails}
          xKey="digit" obsKey="observed"
          expKey="expected"
          obsColor={CC.OBS}
          expColor={CC.EXP}
          xlabel={xlabel}
          ylabel="Count" flag={result.flag}/>
    </PlotLayout>
    <ChartLegend items={[
      { color: CC.OBS, label: "Observed count", opacity: 0.35 },
      { color: CC.EXP, label: "Uniform expected", swatchType: "line", dashed: true },
    ]} />


  </MiniCardLayout>

);

}

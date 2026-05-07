import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { VBarPlot } from "../plots/VBarPlot.jsx";
import { CC, C, TF, FF, FW } from "../../constants/tokens.js";
import { fmtPBadge } from "../../constants/thresholds.js";
import { SUB_HEAD } from "../shared/styles.js";


export function MiniCard_TerminalDigit({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const name = result.name;
  const isAgg = result.groupsAssessed !== undefined;
if(!details.length) return null;
const chi = result.chiSquared || "?";
const nVals = result.nValues || "?";
let headline;
if (result.flag === "LOW") {
  headline = "Last digits are evenly distributed — consistent with instrument-generated values.";
} else {
  // Find most over/under-represented digit
  const sorted = [...details].sort((a,b) => (parseInt(b.observed)||0) - (parseInt(b.expected)||0) - ((parseInt(a.observed)||0) - (parseInt(a.expected)||0)));
  const top = sorted[0];
  headline = top
    ? `Digit ${top.digit} appears ${parseInt(top.observed)||0} times (expected ~${parseInt(top.expected)||0}) — last digits are not uniformly distributed.`
    : "Last digits are not uniformly distributed across values.";
}
const desc = "Instrument readings produce last digits that are roughly equally likely (0–9 each ~10%). When values are typed by hand, people unconsciously favour certain digits and avoid others — creating a detectable fingerprint.";

const implications = "Non-uniform last digits can result from instrument truncation, software rounding during export, or file format conversion that strips trailing zeros. They can also indicate hand-entered or hand-adjusted values — humans tend to avoid certain digits and over-use others when typing numbers.";

return (

  <MiniCardLayout result={result} headline={headline}
    desc={desc}
    implications={implications}
    footer={<>
      {nVals} values tested · χ²={chi} · df={result.df||"?"} · {fmtPBadge(result.primaryP)}
      {result.trailingZeroWarning && <span style={{color:C.TEXT_4,fontFamily:FF.UI}}> · 9-digit test (digit 0 excluded)</span>}
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

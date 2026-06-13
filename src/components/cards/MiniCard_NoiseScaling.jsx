import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { MeanVarianceScatter } from "../plots/MeanVarianceScatter.jsx";
import { ASSAYS } from "../../constants/assays.js";
import { C, FS, FF } from "../../constants/tokens.js";

export function MiniCard_NoiseScaling({ result, importConfig, rowMap }) {
if(!result.logPoints||!result.logPoints.length) return null;
const obs=parseFloat(result.observedSlope)||0;
const se=parseFloat(result.slopeSE)||0;
const assayLabel = result.assay === "general" ? "this measurement type" : (ASSAYS.find(a=>a.v===result.assay)?.l || result.assay).toLowerCase();
return (

  <MiniCardLayout result={result}
    footer={result.flag !== "LOW" && result.flag !== "N/A"
      ? "Noise scaling doesn't match this assay"
      : "Noise scales as expected for this assay"}
    lookFor={obs < 0.3 ? "Nearly constant noise regardless of signal size is unusual for most biological assays — it can indicate that noise was added artificially (e.g. from a random number generator with fixed variance). Check whether the variance of replicates is suspiciously uniform across high and low measurements." : obs > 2 ? "Noise that grows much faster than expected can indicate data constructed by scaling a template — multiplying a base pattern by different factors amplifies both signal and noise proportionally, steepening the slope." : "The noise-to-signal relationship doesn't match what this instrument type typically produces. Compare against other datasets from the same instrument and protocol to determine whether this pattern is unusual for your lab." }
    implications="The observed noise-magnitude relationship does not match the expected pattern for this instrument type. This can result from analysing data from a different assay than selected, applying an incorrect transformation, or mixing data from instruments with different noise characteristics. It can also indicate that noise was added or generated using a model that does not match the instrument's actual behaviour.">

    <PlotLayout>
        <MeanVarianceScatter
          logPoints={result.logPoints}
          logCentroid={result.logCentroid}
          observedSlope={result.observedSlope}
          expectedSlope={result.expectedSlope}
          slopeSE={result.slopeSE}/>
    </PlotLayout>
    <div style={{fontSize:FS.sm,fontFamily:FF.UI,color:C.TEXT_2,marginTop:"4px"}}>
      Each dot = one row ({result.nPoints} rows). Solid line = observed fit{se>0&&se<2?" with 99.9% CI band":""}. Dashed = expected for {assayLabel}.
    </div>


  </MiniCardLayout>

);

}

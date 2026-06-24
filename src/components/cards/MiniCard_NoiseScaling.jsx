import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { MeanVarianceScatter } from "../plots/MeanVarianceScatter.jsx";
import { ASSAYS } from "../../constants/assays.js";
import { C, FS, FF } from "../../constants/tokens.js";

export function MiniCard_NoiseScaling({ result, importConfig, rowMap }) {
if(!result.logPoints||!result.logPoints.length) return null;
const se=parseFloat(result.slopeSE)||0;
const assayLabel = result.assay === "general" ? "this measurement type" : (ASSAYS.find(a=>a.v===result.assay)?.l || result.assay).toLowerCase();
return (

  <MiniCardLayout result={result}
    footer={result.flag !== "LOW" && result.flag !== "N/A"
      ? "Noise scaling doesn't match this assay"
      : "Noise scales as expected for this assay"}
    lookFor="The wrong assay setting is the most common innocent cause: confirm the assay type is set correctly, since the expected slope depends on it. If the assay is right, inspect the raw data files for whether the noise tracks the signal as it should. Values with the same noise at high and low signal point to a uniform noise figure added by hand."
    implications="A slope below what the assay predicts can arise when values are entered with a uniform amount of noise regardless of signal level: it is the mark of a single noise figure applied across the board, rather than the signal-dependent spread real measurement produces. A slope above the expected value can arise from mixing samples of very different quality, or from values built to exaggerate the spread at high signal.">

    <PlotLayout fitContent>
        <MeanVarianceScatter
          logPoints={result.logPoints}
          logCentroid={result.logCentroid}
          observedSlope={result.observedSlope}
          expectedSlope={result.expectedSlope}
          slopeSE={result.slopeSE}/>
    </PlotLayout>
    <div style={{fontSize:FS.sm,fontFamily:FF.UI,color:C.TEXT_2,marginTop:"4px"}}>
      Each dot = one row ({result.nPoints} rows). Solid line = observed fit{se>0&&se<2?"; shaded band shows how precisely the slope is estimated (99.9%)":""}. Dashed = expected for {assayLabel}.
    </div>


  </MiniCardLayout>

);

}

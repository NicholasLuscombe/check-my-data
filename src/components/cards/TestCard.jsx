import { HideHeadlineCtx } from "../shared/CardLayout.jsx";
import { MiniPlot } from "./MiniPlot.jsx";

/**
 * TestCard — renders a single test result inside its TestCardLayout wrapper.
 * All 24 tests have MiniCard components registered in MINIPLOT_REGISTRY,
 * so TestCard simply provides the HideHeadlineCtx and delegates to MiniPlot.
 */
export function TestCard({ result, importConfig, rowMap }) {
  return (
    <div>
      <HideHeadlineCtx.Provider value={true}>
        <MiniPlot result={result} importConfig={importConfig} rowMap={rowMap}/>
      </HideHeadlineCtx.Provider>
    </div>
  );
}

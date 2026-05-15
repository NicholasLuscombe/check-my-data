import { MiniPlot } from "./MiniPlot.jsx";

/**
 * TestCard — renders a single test result inside its TestCardLayout wrapper.
 *
 * All 24 tests have MiniCard components registered in MINIPLOT_REGISTRY, so
 * TestCard delegates to MiniPlot.
 *
 * S150 (C.8 / A2): HideHeadlineCtx.Provider wrapper retired. The context
 * suppressed CardHeadline and CardDesc in every mounted mini-card, which made
 * both components (and the HEADLINE_COLOR per-tier text colour that fed them)
 * dead code — retired across the same commit.
 */
export function TestCard({ result, importConfig, rowMap }) {
  return (
    <div>
      <MiniPlot result={result} importConfig={importConfig} rowMap={rowMap}/>
    </div>
  );
}

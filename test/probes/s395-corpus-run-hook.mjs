/* S395 — expose the census path's own functions WITHOUT editing scripts/ or src/.

   `scripts/corpus-run.mjs` runs its CLI at module top level, so importing it
   executes a run. This hook replaces everything from the `── Main ──` banner to
   EOF with a bare export list as the module loads. Nothing above the banner is
   touched, so `prepStructure` and `buildAnalysisConfig` are the SHIPPED SOURCE
   TEXT executed, not a reconstruction — there is no copy that can drift.

   Same mechanism as test/probes/s341-count-hook.mjs.

   Throws if the anchor has moved, so a silent no-op run is impossible.

     node --import ./test/probes/s395-corpus-run-hook.mjs test/probes/probe-s395-role-inversion.mjs --part0
*/
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "scripts/corpus-run.mjs";

// Verbatim from scripts/corpus-run.mjs. The dashes are part of the anchor.
export const ANCHOR = "// ── Main ────────────────────────────────────────────────────────────";

export const EXPORT_LINE =
  "export { prepStructure, buildAnalysisConfig, inventorySheet, readRawMatrix, applyRoleHint };\n";

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    const src = readFileSync(fileURLToPath(url), "utf8");
    const i = src.indexOf(ANCHOR);
    if (i < 0) throw new Error(`s395 hook: anchor not found in ${TARGET} — the CLI tail has moved.`);
    if (src.indexOf(ANCHOR, i + 1) >= 0) throw new Error(`s395 hook: anchor is not unique in ${TARGET}.`);
    return { format: "module", shortCircuit: true, source: src.slice(0, i) + EXPORT_LINE };
  },
});

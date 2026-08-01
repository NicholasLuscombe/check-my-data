/* S340 step 3 — raise Windowed Autocorrelation's N_PERM to 4999 WITHOUT
   editing src/. Registers a synchronous module load hook that rewrites the
   one N_PERM line in memory as the module is loaded.

   Usage:
     node --import ./test/probes/s340-nperm-hook.mjs test/validate-batch.mjs
     PERF=1 node --import ./test/probes/s340-nperm-hook.mjs test/validate-batch.mjs

   Throws if the anchor line has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/tests/windowedAutocorrelation.js";
const FROM = "const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;";
const TO = "const N_PERM = nR <= 500 ? 4999 : nR <= 5000 ? 499 : 199;";

let applied = false;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    const src = readFileSync(fileURLToPath(url), "utf8");
    if (!src.includes(FROM)) {
      throw new Error(`S340 hook: anchor not found in ${TARGET}. Re-locate the N_PERM line.`);
    }
    applied = true;
    process.stderr.write("[S340 hook] Windowed Autocorrelation N_PERM 999 -> 4999 (in memory)\n");
    return { format: "module", shortCircuit: true, source: src.replace(FROM, TO) };
  },
});

process.on("exit", () => {
  if (!applied) process.stderr.write("[S340 hook] WARNING: hook never fired — module not loaded?\n");
});

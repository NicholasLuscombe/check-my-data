/* S341 — injectable PRNG seed, current source.

   Replaces test/probes/s340-seed-hook.mjs, whose anchor
   (`let _state = hashMatrix(matrix);`) was removed by S340's own per-test-stream
   commit bbd6332 — that hook throws against current main.

   Both createPRNG(matrix) and createPRNGFactory(matrix) route through the single
   private constructor createPRNGFromSeed(seed), so offsetting its one state line
   shifts every stream — global and per-test — from one place.

   Offset 0 is the identity (XOR with 0), so seed 0 reproduces the shipped stream.

     node --import ./test/probes/s341-seed-hook.mjs <probe>

   Throws if the anchor line has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/stats/prng.js";
const FROM = "  let _state = seed | 0;";
const TO = "  let _state = (seed ^ Math.imul((globalThis.__S341_SEED | 0), 0x9E3779B1)) | 0;";

let applied = false;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    const src = readFileSync(fileURLToPath(url), "utf8");
    if (!src.includes(FROM)) {
      throw new Error(`s341-seed-hook: anchor not found in ${TARGET}. Re-locate the createPRNGFromSeed state line.`);
    }
    applied = true;
    return { format: "module", shortCircuit: true, source: src.replace(FROM, TO) };
  },
});

process.on("exit", () => {
  if (!applied) console.error("!! s341-seed-hook: never fired — prng.js not loaded?");
});

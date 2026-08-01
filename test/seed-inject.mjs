/* Seed injection for the batch gate.

   The engine has no seed parameter. `createPRNG(matrix)` in src/stats/prng.js
   seeds itself from an FNV-1a hash of the data, so the stream is structural and
   every run reproduces one draw. That makes the batch measure whether the
   engine reproduces the draw the ground truth was recorded from, rather than
   whether it detects the planted mechanism. The two come apart.

   This rewrites that one line as prng.js loads so the starting state can be
   offset by a value read at each createPRNG call. Nothing under src/ changes on
   disk, and the hook is only ever registered when a caller asks for it.

   Offset 0 XORs nothing, so seed 0 is the shipped stream byte-for-byte —
   test/probes/probe-s340-seedcheck.mjs verifies that across every cell.

   registerSeedHook() must run BEFORE the first import of anything that pulls in
   prng.js (that is, before src/analysis/engine.js). */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/stats/prng.js";
const FROM = "  let _state = hashMatrix(matrix);";
const TO =
  "  let _state = (hashMatrix(matrix) ^ Math.imul((globalThis.__S340_SEED | 0), 0x9E3779B1)) | 0;";

let registered = false;
let fired = false;

/** Register the load hook. Idempotent. Throws if the anchor line has moved,
 *  so a seed sweep can never silently run eight identical seeds. */
export function registerSeedHook() {
  if (registered) return;
  registered = true;
  registerHooks({
    load(url, context, nextLoad) {
      if (!url.endsWith(TARGET)) return nextLoad(url, context);
      const src = readFileSync(fileURLToPath(url), "utf8");
      if (!src.includes(FROM)) {
        throw new Error(
          `seed-inject: anchor line not found in ${TARGET}. Re-locate the createPRNG seed line before running multi-seed.`
        );
      }
      fired = true;
      return { format: "module", shortCircuit: true, source: src.replace(FROM, TO) };
    },
  });
  process.on("exit", () => {
    if (!fired) process.stderr.write("seed-inject: WARNING — hook registered but never fired; prng.js was not loaded through it.\n");
  });
}

/** Set the offset applied at the next createPRNG call. */
export function setSeed(n) {
  globalThis.__S340_SEED = n | 0;
}

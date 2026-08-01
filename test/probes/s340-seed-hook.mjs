/* S340 step 2 — make the PRNG seed injectable WITHOUT editing src/.

   The engine has no seed parameter. `createPRNG(matrix)` in src/stats/prng.js
   seeds itself from an FNV-1a hash of the data, so the stream is structural.
   This hook rewrites that one line as the module loads so the starting state
   can be offset by a value read from `globalThis.__S340_SEED` at each
   createPRNG call — one process can therefore sweep many seeds.

   Offset 0 is the identity (XOR with 0), so seed 0 reproduces the shipped
   stream exactly. The sweep asserts that against an unhooked run.

   Usage:
     node --import ./test/probes/s340-seed-hook.mjs test/probes/probe-s340-seedsweep.mjs

   Throws if the anchor line has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/stats/prng.js";
const FROM = "  let _state = hashMatrix(matrix);";
const TO =
  "  let _state = (hashMatrix(matrix) ^ Math.imul((globalThis.__S340_SEED | 0), 0x9E3779B1)) | 0;";

let applied = false;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    const src = readFileSync(fileURLToPath(url), "utf8");
    if (!src.includes(FROM)) {
      throw new Error(`S340 seed hook: anchor not found in ${TARGET}. Re-locate the createPRNG seed line.`);
    }
    applied = true;
    process.stderr.write("[S340 seed hook] createPRNG seed is now offset by globalThis.__S340_SEED\n");
    return { format: "module", shortCircuit: true, source: src.replace(FROM, TO) };
  },
});

process.on("exit", () => {
  if (!applied) process.stderr.write("[S340 seed hook] WARNING: hook never fired — prng.js not loaded?\n");
});

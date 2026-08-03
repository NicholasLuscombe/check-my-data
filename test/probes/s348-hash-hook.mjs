/* S348 — data-hash substitution hook.

   The three existing seed hooks (test/seed-inject.mjs, test/probes/s341-seed-hook.mjs,
   and the dead s340-seed-hook.mjs) all XOR a constant into createPRNGFromSeed's
   state line. That offsets every stream by the same amount, which is a
   counterfactual stream, not another file's stream.

   This hook works one level up, at the source of the derivation. hashMatrix64 is
   the only thing that turns data into a seed: createPRNGFactory calls it once per
   run and mixes its {h1, h2} pair with each test's dispatch key. Substituting the
   pair therefore reproduces, exactly, the streams some OTHER matrix would have
   produced — while the data the tests see stays whatever the caller passed.

   Two globals:
     __S348_HASH   set to {h1, h2} to substitute; null/undefined to run normally.
     __S348_LAST   written on every unsubstituted call — the pair the engine just
                   derived from the matrix it was actually handed, after
                   validateMatrix. Read it to capture a file's real seed without
                   re-deriving the private hash by hand.

   Usage: node --import ./test/probes/s348-hash-hook.mjs <probe>

   Throws if the anchor has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/stats/prng.js";
const FROM = "function hashMatrix64(matrix) {";
// A second, independent landmark. If prng.js is refactored so the walk returns
// somewhere else, the rename below would still apply cleanly and silently
// produce a wrong hash; this makes that case throw instead.
const LANDMARK = "return { h1: h1 | 0, h2: h2 | 0 };";
const TO = `function hashMatrix64(matrix) {
  const __o = globalThis.__S348_HASH;
  if (__o) return { h1: __o.h1 | 0, h2: __o.h2 | 0 };
  const __r = __s348_real(matrix);
  globalThis.__S348_LAST = { h1: __r.h1, h2: __r.h2 };
  return __r;
}
function __s348_real(matrix) {`;

let applied = false;

// Set at registration, before prng.js is loaded, so a probe can refuse to start
// rather than discovering mid-run that every substitution was a no-op.
globalThis.__S348_HOOK = true;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    const src = readFileSync(fileURLToPath(url), "utf8");
    if (!src.includes(FROM)) {
      throw new Error(`s348-hash-hook: anchor "${FROM}" not found in ${TARGET}.`);
    }
    if (!src.includes(LANDMARK)) {
      throw new Error(`s348-hash-hook: landmark "${LANDMARK}" not found in ${TARGET} — the hash walk has been restructured, re-derive the hook.`);
    }
    applied = true;
    return { format: "module", shortCircuit: true, source: src.replace(FROM, TO) };
  },
});

process.on("exit", () => {
  if (!applied) console.error("!! s348-hash-hook: never fired — prng.js not loaded?");
});

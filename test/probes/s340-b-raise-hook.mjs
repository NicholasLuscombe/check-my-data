/* S340 step 2 — cost of raising one resample-count branch, without editing src/.

   Set S340_RAISE to a key below; the hook rewrites that one line in memory as
   the module loads, raising its 499 tier to 4999. One key at a time, so the
   measured delta attributes to a single test.

     S340_RAISE=regionalNoise PERF=1 node --import ./test/probes/s340-b-raise-hook.mjs test/validate-batch.mjs

   Throws if the anchor has moved. This sizes the fix; it does not do it. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// key → [module path suffix, exact line to find, replacement]
export const RAISES = {
  loessResidual: [
    "src/tests/loessResidual.js",
    "  const N_PERM = validRows.length <= 100 ? 4999 : 499;",
    "  const N_PERM = validRows.length <= 100 ? 4999 : 4999;",
  ],
  loessPerPair: [
    "src/tests/loessResidual.js",
    "    const PP_PERM = 499;",
    "    const PP_PERM = 4999;",
  ],
  regionalNoise: [
    "src/tests/regionalNoise.js",
    "  const N_PERM = validRows.length <= 100 ? 4999 : 499;",
    "  const N_PERM = validRows.length <= 100 ? 4999 : 4999;",
  ],
  constantOffset: [
    "src/tests/constantOffset.js",
    "  const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;",
    "  const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 4999 : 999;",
  ],
  interReplicateCorrelation: [
    "src/tests/interReplicateCorrelation.js",
    "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;",
    "    const N_PERM=maxN<=100?999:maxN<=1000?4999:199;",
  ],
  runs: [
    "src/tests/runs.js",
    "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;",
    "    const N_PERM=maxN<=100?999:maxN<=1000?4999:199;",
  ],
  crossConditionConsistency: [
    "src/tests/crossConditionConsistency.js",
    "  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;",
    "  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 4999 : 199;",
  ],
  windowedAutocorrelation: [
    "src/tests/windowedAutocorrelation.js",
    "  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;",
    "  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 4999 : 199;",
  ],
};

const key = process.env.S340_RAISE;
if (key) {
  const spec = RAISES[key];
  if (!spec) throw new Error(`S340_RAISE: unknown key "${key}". Known: ${Object.keys(RAISES).join(', ')}`);
  const [target, from, to] = spec;
  let fired = false;
  registerHooks({
    load(url, context, nextLoad) {
      if (!url.endsWith(target)) return nextLoad(url, context);
      const src = readFileSync(fileURLToPath(url), "utf8");
      if (!src.includes(from)) throw new Error(`S340_RAISE ${key}: anchor not found in ${target}.`);
      fired = true;
      process.stderr.write(`[S340 raise] ${key}: 499 -> 4999 in ${target}\n`);
      return { format: "module", shortCircuit: true, source: src.replace(from, to) };
    },
  });
  process.on("exit", () => {
    if (!fired) process.stderr.write(`[S340 raise] WARNING: ${key} hook never fired.\n`);
  });
}

/* S340 — set ONE test's resample count, to measure what raising it costs.

   Per-test streams landed, so a raise now moves only its own test's cells and
   its own time. That makes the cost attributable, which it was not before.

     S340_TEST=columnGof S340_B=19999 PERF=1 node --import ./test/probes/s340-one-b-hook.mjs test/validate-batch.mjs

   Every count that test can take is replaced by S340_B, so the branch collapses
   to one value — which is the point: the branch existed to bound wallclock
   under coupling. The batch will fail; the run is a stopwatch, not a gate.
   Throws if an anchor moves. Nothing under src/ changes on disk. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** key → [module suffix, [from, toTemplate] ...]. ${B} interpolates the count. */
export const TESTS = {
  benford:        ["src/tests/benford.js", [["  const N_SIM_BENFORD = 5000;", "  const N_SIM_BENFORD = ${B};"]]],
  benford2:       ["src/tests/benford2.js", [["  const N_SIM = 5000;", "  const N_SIM = ${B};"]]],
  residualSpike:  ["src/tests/residualSpikeCorrelation.js", [["  const N_PERM = 999;", "  const N_PERM = ${B};"]]],
  regionalNoise:  ["src/tests/regionalNoise.js", [["  const N_PERM = validRows.length <= 100 ? 4999 : 499;", "  const N_PERM = ${B};"]]],
  constantOffset: ["src/tests/constantOffset.js", [["  const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;", "  const N_PERM = ${B};"]]],
  kurtosis:       ["src/tests/kurtosis.js", [["  const N_SIM = 1999; // p-value floor = 1/2000 = 0.0005 — allows FLAGGED (p < 0.001)", "  const N_SIM = ${B};"]]],
  windowedAutocorr: ["src/tests/windowedAutocorrelation.js", [["  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;", "  const N_PERM = ${B};"]]],
  crossCondConsistency: ["src/tests/crossConditionConsistency.js", [["  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;", "  const B = ${B};"]]],
  blockedMahalanobis: ["src/tests/blockedMahalanobis.js", [["  const N_PERM = maxN <= 500 ? 4999 : 999;", "  const N_PERM = ${B};"]]],
  entropy:        ["src/tests/entropyTest.js", [["  const B = 999; // bootstrap iterations", "  const B = ${B}; // bootstrap iterations"]]],
  columnGof:      ["src/tests/columnGof.js", [["const B    = 2000;", "const B    = ${B};"]]],
  interReplicate: ["src/tests/interReplicateCorrelation.js", [["    const N_PERM=maxN<=100?999:maxN<=1000?499:199;", "    const N_PERM=${B};"]]],
  runs:           ["src/tests/runs.js", [["    const N_PERM=maxN<=100?999:maxN<=1000?499:199;", "    const N_PERM=${B};"]]],
  loess:          ["src/tests/loessResidual.js", [
    ["  const N_PERM = validRows.length <= 100 ? 4999 : 499;", "  const N_PERM = ${B};"],
    ["    const PP_PERM = 499;", "    const PP_PERM = ${B};"],
  ]],
};

const key = process.env.S340_TEST;
const B = Number(process.env.S340_B || 4999);
if (key) {
  const spec = TESTS[key];
  if (!spec) throw new Error(`S340_TEST: unknown key "${key}". Known: ${Object.keys(TESTS).join(', ')}`);
  const [target, edits] = spec;
  let fired = false;
  registerHooks({
    load(url, context, nextLoad) {
      if (!url.endsWith(target)) return nextLoad(url, context);
      let src = readFileSync(fileURLToPath(url), "utf8");
      for (const [from, tpl] of edits) {
        if (!src.includes(from)) throw new Error(`S340_TEST ${key}: anchor not found in ${target}:\n${from}`);
        src = src.replace(from, tpl.replace("${B}", String(B)));
      }
      fired = true;
      process.stderr.write(`[S340 one-B] ${key}: every count -> ${B} in ${target}\n`);
      return { format: "module", shortCircuit: true, source: src };
    },
  });
  process.on("exit", () => { if (!fired) process.stderr.write(`[S340 one-B] WARNING: ${key} hook never fired.\n`); });
}

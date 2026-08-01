/* S340 step 3 — cost of a single flat resample count across the whole battery.

   Sets every resample count to S340_FLAT_B (default 4999) in memory, so the
   proposal can quote a measured wallclock for the simple landing point —
   uncoupled streams with one fixed count per test — rather than an
   extrapolation from the per-branch measurements.

     S340_FLAT_B=4999 PERF=1 PERF_LABEL=flat4999 node --import ./test/probes/s340-flat-b-hook.mjs test/validate-batch.mjs

   This changes p-values everywhere, so the batch will fail. That is expected:
   the run is a stopwatch, not a gate. Nothing under src/ changes on disk. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const B = Number(process.env.S340_FLAT_B || 4999);

const EDITS = {
  "src/tests/benford.js": [["  const N_SIM_BENFORD = 5000;", `  const N_SIM_BENFORD = ${B};`]],
  "src/tests/benford2.js": [["  const N_SIM = 5000;", `  const N_SIM = ${B};`]],
  "src/tests/residualSpikeCorrelation.js": [["  const N_PERM = 999;", `  const N_PERM = ${B};`]],
  "src/tests/entropyTest.js": [["  const B = 999; // bootstrap iterations", `  const B = ${B}; // bootstrap iterations`]],
  "src/tests/columnGof.js": [["const B    = 2000;", `const B    = ${B};`]],
  "src/tests/kurtosis.js": [["  const N_SIM = 1999; // p-value floor = 1/2000 = 0.0005 — allows FLAGGED (p < 0.001)", `  const N_SIM = ${B};`]],
  "src/tests/blockedMahalanobis.js": [["  const N_PERM = maxN <= 500 ? 4999 : 999;", `  const N_PERM = ${B};`]],
  "src/tests/constantOffset.js": [["  const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;", `  const N_PERM = ${B};`]],
  "src/tests/interReplicateCorrelation.js": [["    const N_PERM=maxN<=100?999:maxN<=1000?499:199;", `    const N_PERM=${B};`]],
  "src/tests/runs.js": [["    const N_PERM=maxN<=100?999:maxN<=1000?499:199;", `    const N_PERM=${B};`]],
  "src/tests/crossConditionConsistency.js": [["  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;", `  const B = ${B};`]],
  "src/tests/windowedAutocorrelation.js": [["  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;", `  const N_PERM = ${B};`]],
  "src/tests/loessResidual.js": [
    ["  const N_PERM = validRows.length <= 100 ? 4999 : 499;", `  const N_PERM = ${B};`],
    ["    const PP_PERM = 499;", `    const PP_PERM = ${B};`],
  ],
  "src/tests/regionalNoise.js": [["  const N_PERM = validRows.length <= 100 ? 4999 : 499;", `  const N_PERM = ${B};`]],
};

registerHooks({
  load(url, context, nextLoad) {
    const hit = Object.keys(EDITS).find(k => url.endsWith(k));
    if (!hit) return nextLoad(url, context);
    let src = readFileSync(fileURLToPath(url), "utf8");
    for (const [from, to] of EDITS[hit]) {
      if (!src.includes(from)) throw new Error(`S340 flat-B hook: anchor not found in ${hit}:\n${from}`);
      src = src.replace(from, to);
    }
    return { format: "module", shortCircuit: true, source: src };
  },
});

process.stderr.write(`[S340 flat-B] every resample count set to ${B}\n`);

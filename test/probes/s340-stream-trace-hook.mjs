/* S340 step 1 — instrument the PRNG stream without editing src/.

   Rewrites four lines in memory as their modules load:

     prng.js     every advance of createPRNG's state bumps a global counter, so
                 draws inside randn() and shuffle() are counted too, not just
                 direct random() calls.
     engine.js   the dispatch loop records draws consumed per test, alongside
                 the flag that test returned, and honours a forced-skip set so a
                 test can be made to return N/A without running.
     irc / runs  the two tests whose permutation count branches on maxN but
                 which never publish it record maxN and the resulting count.

   Globals it uses:
     __S340_DRAWS       running count of stream advances
     __S340_TRACE       [{ name, draws, flag }] in dispatch order
     __S340_FORCE_SKIP  Set of test names to short-circuit to N/A
     __S340_MAXN        { testName: [{ maxN, nPerm }] } per call

   Nothing under src/ changes on disk. Throws if any anchor moves. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EDITS = {
  "src/stats/prng.js": [
    [
      "    _state |= 0; _state = (_state + 0x6D2B79F5) | 0;",
      "    _state |= 0; _state = (_state + 0x6D2B79F5) | 0; globalThis.__S340_DRAWS = (globalThis.__S340_DRAWS || 0) + 1;",
    ],
  ],
  "src/analysis/engine.js": [
    [
      "    const tStart = PERF_ENABLED ? performance.now() : 0;",
      "    const tStart = PERF_ENABLED ? performance.now() : 0;\n    const __s340d0 = globalThis.__S340_DRAWS || 0;",
    ],
    [
      "    try {\n      results.push(await fn());\n    } catch (err) {",
      "    try {\n      if (globalThis.__S340_FORCE_SKIP && globalThis.__S340_FORCE_SKIP.has(name)) {\n" +
      "        results.push({ name, flag: \"N/A\", primaryP: null, description: \"S340 probe: forced skip\" });\n" +
      "      } else {\n        results.push(await fn());\n      }\n    } catch (err) {",
    ],
    [
      "    if (PERF_ENABLED) perfTimings.push({ name, ms: performance.now() - tStart });",
      "    if (PERF_ENABLED) perfTimings.push({ name, ms: performance.now() - tStart });\n" +
      "    (globalThis.__S340_TRACE = globalThis.__S340_TRACE || []).push({ name, draws: (globalThis.__S340_DRAWS || 0) - __s340d0, flag: results[results.length - 1] && results[results.length - 1].flag });",
    ],
  ],
  "src/tests/interReplicateCorrelation.js": [
    [
      "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;",
      "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;\n" +
      "    ((globalThis.__S340_MAXN = globalThis.__S340_MAXN || {})['Inter-Replicate Correlation'] = (globalThis.__S340_MAXN['Inter-Replicate Correlation'] || [])).push({ maxN, nPerm: N_PERM });",
    ],
  ],
  "src/tests/runs.js": [
    [
      "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;",
      "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;\n" +
      "    ((globalThis.__S340_MAXN = globalThis.__S340_MAXN || {})['Runs Test'] = (globalThis.__S340_MAXN['Runs Test'] || [])).push({ maxN, nPerm: N_PERM });",
    ],
  ],
  "src/tests/crossConditionConsistency.js": [
    [
      "  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;",
      "  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;\n" +
      "  ((globalThis.__S340_MAXN = globalThis.__S340_MAXN || {})['Cross-Condition Consistency'] = (globalThis.__S340_MAXN['Cross-Condition Consistency'] || [])).push({ maxN, nPerm: B });",
    ],
  ],
};

registerHooks({
  load(url, context, nextLoad) {
    const hit = Object.keys(EDITS).find(k => url.endsWith(k));
    if (!hit) return nextLoad(url, context);
    let src = readFileSync(fileURLToPath(url), "utf8");
    for (const [from, to] of EDITS[hit]) {
      if (!src.includes(from)) throw new Error(`S340 trace hook: anchor not found in ${hit}:\n${from}`);
      src = src.replace(from, to);
    }
    return { format: "module", shortCircuit: true, source: src };
  },
});

/** Reset the per-run collectors. Call before each runFullAnalysis. */
export function resetTrace(forceSkip = []) {
  globalThis.__S340_DRAWS = 0;
  globalThis.__S340_TRACE = [];
  globalThis.__S340_MAXN = {};
  globalThis.__S340_FORCE_SKIP = new Set(forceSkip);
}

export function takeTrace() {
  return {
    totalDraws: globalThis.__S340_DRAWS || 0,
    trace: globalThis.__S340_TRACE || [],
    maxN: globalThis.__S340_MAXN || {},
  };
}

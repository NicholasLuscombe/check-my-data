/* S349 Part 4 — expose CCC's per-unit internals WITHOUT changing B.

   The sibling hook `s349-ccc-hook.mjs` does two edits: it raises B and it
   captures. The corpus census needs the SHIPPED B, so this hook does the
   capture edit only. Anchor and replacement are byte-identical to that hook's
   second edit; the B edit is absent, deliberately.

   S349 Part 2a established that `u.p2` (the raw doubled permutation p) never
   reaches the returned object, and neither does `gatePassed` — the result
   publishes `nGateSuppressed` as a count but not which unit it was. The capture
   is placed at the primaryP site because `gatePassed` and `forensic` are both
   assigned by then.

   Additive only: it reads fields and writes one global. No control flow and no
   value changes. Verified inert in S349 Part 3a — the B = 499 parity run with
   the capture armed reproduced S348 Part 5 seed-for-seed, 20 of 20.

   Global: __S349_UNITS — after each CCC run, one record per running unit.

   Usage:  node --import ./test/probes/s349-unit-capture-hook.mjs <probe>

   Throws if the anchor has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/tests/crossConditionConsistency.js";

const CAP_FROM = `  const effAdjPs = running.map(u => (u.gatePassed && u.forensic) ? u.adjP : 1);
  const primaryP = effAdjPs.length ? Math.min(...effAdjPs) : 1;`;
const CAP_TO = `  const effAdjPs = running.map(u => (u.gatePassed && u.forensic) ? u.adjP : 1);
  const primaryP = effAdjPs.length ? Math.min(...effAdjPs) : 1;
  globalThis.__S349_UNITS = running.map(u => ({
      id: properties[u.propIdx].id,
      prop: properties[u.propIdx].displayName,
      kind: properties[u.propIdx].kind,
      stage: u.stage,
      a: u.a, b: u.b,
      condA: conditionNames[keptIdx[u.a]], condB: conditionNames[keptIdx[u.b]],
      p2: u.p2, adjP: u.adjP,
      dObs: u.dObs, permMedian: u.permMedian,
      direction: u.direction,
      gatePassed: u.gatePassed, forensic: u.forensic,
      nMin: u.nMin, B,
    }));
  globalThis.__S349_SKIPPED = units.filter(u => !u.ran).map(u => ({
      id: properties[u.propIdx].id,
      prop: properties[u.propIdx].displayName,
      kind: properties[u.propIdx].kind,
      a: u.a, b: u.b,
      reason: u.reason, degenerate: !!u.degenerate,
    }));`;

let applied = false;
globalThis.__S349_CAPTURE_HOOK = true;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    const src = readFileSync(fileURLToPath(url), "utf8");
    const n = src.split(CAP_FROM).length - 1;
    if (n !== 1) {
      throw new Error(`s349-unit-capture-hook: anchor occurs ${n} times in ${TARGET} (need exactly 1).`);
    }
    applied = true;
    process.stderr.write(`[s349 capture] CCC per-unit capture armed, B untouched (in memory)\n`);
    return { format: "module", shortCircuit: true, source: src.replace(CAP_FROM, CAP_TO) };
  },
});

process.on("exit", () => {
  if (!applied) console.error("!! s349-unit-capture-hook: never fired.");
});

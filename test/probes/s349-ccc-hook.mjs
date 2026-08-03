/* S349 — raise Cross-Condition Consistency's permutation count AND expose the
   per-unit raw doubled p, without editing src/.

   Two in-memory edits to src/tests/crossConditionConsistency.js as it loads.

   EDIT 1 — the B override. Anchor and replacement template are taken verbatim
   from the `crossCondConsistency` key in test/probes/s340-one-b-hook.mjs, so
   this is mechanically the established route. It lives here rather than being
   chained because two registerHooks load hooks that both short-circuit on the
   same URL cannot compose — the later-registered one wins and the earlier one
   silently never applies.

   EDIT 2 — the Stage-1 capture. S349 Part 2a established that `u.p2` (the raw
   doubled permutation p) never reaches the returned object: it is assigned once
   and consumed by the three bhFDR calls. `permDist` is deleted. So the raw
   per-unit value is unobservable from runFullAnalysis output. The anchor is the
   primaryP site, chosen because `gatePassed` and `forensic` are both assigned by
   then — capturing at the bhFDR block would miss them. The insert is additive:
   it reads fields and writes one global. It changes no control flow and no value.

   Globals:
     __S349_B        the count actually applied (set at registration).
     __S349_STAGE1   after each CCC run, one record per running Stage-1 unit.

   Usage (compose with the S348 seed hook — different target file, so they
   delegate past each other cleanly):
     S349_B=9999 node --import ./test/probes/s348-hash-hook.mjs \
                      --import ./test/probes/s349-ccc-hook.mjs <probe>

   Throws if either anchor has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/tests/crossConditionConsistency.js";
const B = Number(process.env.S349_B || 9999);

// EDIT 1 — verbatim from s340-one-b-hook.mjs TESTS.crossCondConsistency.
const B_FROM = "  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;";
const B_TO = `  const B = ${B};`;

// EDIT 2 — additive capture at the primaryP site.
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
      p2: u.p2, adjP: u.adjP,
      dObs: u.dObs, permMedian: u.permMedian,
      direction: u.direction,
      gatePassed: u.gatePassed, forensic: u.forensic,
      B,
    }));
  globalThis.__S349_STAGE1 = globalThis.__S349_UNITS.filter(u => u.kind === "pool");`;

let applied = false;

globalThis.__S349_HOOK = true;
globalThis.__S349_B = B;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    let src = readFileSync(fileURLToPath(url), "utf8");
    for (const [from, to] of [[B_FROM, B_TO], [CAP_FROM, CAP_TO]]) {
      const n = src.split(from).length - 1;
      if (n !== 1) {
        throw new Error(`s349-ccc-hook: anchor occurs ${n} times in ${TARGET} (need exactly 1):\n${from}`);
      }
      src = src.replace(from, to);
    }
    applied = true;
    process.stderr.write(`[s349 hook] CCC B -> ${B}; Stage-1 per-unit capture armed (in memory)\n`);
    return { format: "module", shortCircuit: true, source: src };
  },
});

process.on("exit", () => {
  if (!applied) console.error("!! s349-ccc-hook: never fired — crossConditionConsistency.js not loaded?");
});

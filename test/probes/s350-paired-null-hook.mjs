/* S350 — swap Cross-Condition Consistency's permutation for a within-subject
   relabel, and expose the per-unit record, without editing src/.

   Three in-memory edits to src/tests/crossConditionConsistency.js as it loads.
   Same route as test/probes/s349-ccc-hook.mjs; EDIT 1 and EDIT 2 are that
   hook's anchors verbatim, so this file supersedes it rather than chaining
   with it — two load hooks that short-circuit on the same URL cannot compose.

   EDIT 1 — B override, off by default. Set S350_B to force a count; leave it
   unset and the shipped ladder (999 / 499 / 199) stands, which is what the
   shipped flag lattice is built on.

   EDIT 2 — per-unit capture at the primaryP site, where gatePassed and
   forensic are both assigned. Additive: reads fields, writes one global.

   EDIT 3 — the null. When globalThis.__S350_PAIRED is set, the global
   Fisher-Yates over all row-tuples is replaced by an independent relabel of
   each subject's own condition assignment. Row positions never move; only
   which pseudo-condition holds which of the subject's tuples.

   EDIT 3 rests on one structural fact: after tuple construction, condition k
   occupies positions [rowStart[k], rowStart[k] + rowsPerCond[k]) and subject s
   sits at offset s in every block. That holds only when every condition has
   the same tuple count AND the slices list subjects in the same order. The
   first is checked here and throws. The second cannot be checked from inside
   the test — no subject key reaches it — so the caller must verify it before
   the run. probe-s350-classb-bound.mjs does, and refuses to sweep a fixture
   that fails.

   Globals:
     __S350_PAIRED           truthy -> within-subject relabel; falsy -> shipped null.
     __S350_PAIRED_APPLIED   set on the first permutation of a paired run.
     __S350_UNITS            after each CCC run, one record per running unit.
     __S350_B                the count applied, or null when the ladder stands.

   Usage:
     node --import ./test/probes/s348-hash-hook.mjs \
          --import ./test/probes/s350-paired-null-hook.mjs <probe>

   Throws if any anchor has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/tests/crossConditionConsistency.js";
const B_ENV = process.env.S350_B ? Number(process.env.S350_B) : null;

// EDIT 1 — verbatim from s349-ccc-hook.mjs / s340-one-b-hook.mjs.
const B_FROM = "  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;";
const B_TO = `  const B = ${B_ENV};`;

// EDIT 2 — verbatim anchor from s349-ccc-hook.mjs.
const CAP_FROM = `  const effAdjPs = running.map(u => (u.gatePassed && u.forensic) ? u.adjP : 1);
  const primaryP = effAdjPs.length ? Math.min(...effAdjPs) : 1;`;
const CAP_TO = `  const effAdjPs = running.map(u => (u.gatePassed && u.forensic) ? u.adjP : 1);
  const primaryP = effAdjPs.length ? Math.min(...effAdjPs) : 1;
  globalThis.__S350_UNITS = running.map(u => ({
      id: properties[u.propIdx].id,
      prop: properties[u.propIdx].displayName,
      kind: properties[u.propIdx].kind,
      stage: u.stage,
      a: u.a, b: u.b,
      pairName: conditionNames[keptIdx[u.a]] + " vs " + conditionNames[keptIdx[u.b]],
      p2: u.p2, adjP: u.adjP,
      dObs: u.dObs, permMedian: u.permMedian,
      direction: u.direction,
      gatePassed: u.gatePassed, forensic: u.forensic,
      B,
    }));`;

// EDIT 3 — the null.
const PERM_FROM = `    // Fisher–Yates over rows
    for (let i = totalRows - 1; i > 0; i--) {
      const r = Math.floor(rng.random() * (i + 1));
      const tmp = permRow[i]; permRow[i] = permRow[r]; permRow[r] = tmp;
    }`;
const PERM_TO = `    if (globalThis.__S350_PAIRED) {
      // Within-subject relabel of the condition assignment. Subject s sits at
      // offset s in every condition block; each subject draws its own
      // permutation of the condition labels, so every pseudo-condition still
      // receives exactly one tuple per subject.
      if (perm === 0) {
        for (let __k = 1; __k < kCond; __k++) {
          if (rowsPerCond[__k] !== rowsPerCond[0]) {
            throw new Error("s350 paired null: condition blocks differ in size (" +
              rowsPerCond.join("/") + ") — positional pairing is not defined here.");
          }
        }
        globalThis.__S350_PAIRED_APPLIED = true;
      }
      const __nSub = rowsPerCond[0];
      const __pi = new Array(kCond);
      for (let __s = 0; __s < __nSub; __s++) {
        for (let __k = 0; __k < kCond; __k++) __pi[__k] = __k;
        for (let __i = kCond - 1; __i > 0; __i--) {
          const __j = Math.floor(rng.random() * (__i + 1));
          const __t = __pi[__i]; __pi[__i] = __pi[__j]; __pi[__j] = __t;
        }
        for (let __k = 0; __k < kCond; __k++) permRow[rowStart[__k] + __s] = rowStart[__pi[__k]] + __s;
      }
    } else {
      // Fisher–Yates over rows
      for (let i = totalRows - 1; i > 0; i--) {
        const r = Math.floor(rng.random() * (i + 1));
        const tmp = permRow[i]; permRow[i] = permRow[r]; permRow[r] = tmp;
      }
    }`;

let applied = false;

globalThis.__S350_HOOK = true;
globalThis.__S350_B = B_ENV;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    let src = readFileSync(fileURLToPath(url), "utf8");
    const edits = [[CAP_FROM, CAP_TO], [PERM_FROM, PERM_TO]];
    if (B_ENV != null) edits.unshift([B_FROM, B_TO]);
    for (const [from, to] of edits) {
      const n = src.split(from).length - 1;
      if (n !== 1) {
        throw new Error(`s350-paired-null-hook: anchor occurs ${n} times in ${TARGET} (need exactly 1):\n${from}`);
      }
      src = src.replace(from, to);
    }
    applied = true;
    process.stderr.write(`[s350 hook] CCC per-unit capture armed; null switchable via __S350_PAIRED` +
      `${B_ENV != null ? `; B -> ${B_ENV}` : "; B ladder unchanged"} (in memory)\n`);
    return { format: "module", shortCircuit: true, source: src };
  },
});

process.on("exit", () => {
  if (!applied) console.error("!! s350-paired-null-hook: never fired — crossConditionConsistency.js not loaded?");
});

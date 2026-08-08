/* S360 Part 3 — capture the per-permutation arm statistics that the three
   shared-loop tests already draw but do not keep.

   Three in-memory edits, made as each module loads. Nothing on disk changes and
   nothing in src/ moves, so a run with this hook and a run without it consume
   exactly the same PRNG draws in the same order — every inserted statement
   reads values the loop has already computed and pushes them onto an array.
   No shuffle, no random(), no branch on a captured value.

   Why it is needed at all: each of the three tests draws the JOINT null of its
   arms inside one loop and then throws it away, keeping only per-arm counts.
   LOESS keeps exceedScan and exceedCusum; Regional Noise keeps exceedCount and
   colExceed; Cross-Condition Consistency keeps each unit's permDist right up to
   crossConditionConsistency.js:534, where it deletes it. The joint null is
   therefore already paid for on every run and is simply not retained.

   Captures land on globalThis.__S360, keyed by test. Each entry is one
   invocation of the test — a test dispatched per column group appends one entry
   per group, so a consumer matches on the observed statistics rather than
   assuming a single entry.

   Usage:
     node --import ./test/probes/s360-joint-null-hook.mjs test/probes/probe-s360-exact-vs-bound.mjs

   Each anchor is asserted to occur exactly once, so a silent no-op run after a
   source edit is impossible. */

import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

globalThis.__S360 = { loess: [], regionalNoise: [], ccc: [] };

// ── LOESS: keep both per-permutation maxima ─────────────────────────
// loessResidual.js:210-214. The two arms are permScanMax and permCusumMax,
// both already computed from the same shuffled row order.
const LOESS_TARGET = "src/tests/loessResidual.js";
const LOESS_FROM = `    if (permCusumMax >= obsCusumStat) exceedCusum++;
  }
  const scanP = (exceedScan + 1) / (N_PERM + 1);
  const cusumP = (exceedCusum + 1) / (N_PERM + 1);`;
const LOESS_TO = `    if (permCusumMax >= obsCusumStat) exceedCusum++;
    __s360scan.push(permScanMax); __s360cusum.push(permCusumMax);
  }
  const scanP = (exceedScan + 1) / (N_PERM + 1);
  const cusumP = (exceedCusum + 1) / (N_PERM + 1);
  globalThis.__S360.loess.push({ nPerm: N_PERM, scanP, cusumP,
    obs: { scan: obsScanStat, cusum: obsCusumStat },
    perm: { scan: __s360scan, cusum: __s360cusum } });`;

// Declared just above the loop so they are in scope at both sites.
const LOESS_DECL_FROM = `  let exceedScan = 0;
  let exceedCusum = 0;`;
const LOESS_DECL_TO = `  let exceedScan = 0;
  let exceedCusum = 0;
  const __s360scan = []; const __s360cusum = [];`;

// ── Regional Noise: keep the global max and the per-column maxima ───
// regionalNoise.js:169-176. Arm 1 is permMax; arm 2's family is permColMax[].
const RN_TARGET = "src/tests/regionalNoise.js";
const RN_FROM = `    if (permMax >= obsScanStat) exceedCount++;
    for (let c = 0; c < nC; c++) {
      if (permColMax[c] >= obsColMaxRatios[c]) colExceed[c]++;
    }
  }
  const scanP = (exceedCount + 1) / (N_PERM + 1);`;
const RN_TO = `    if (permMax >= obsScanStat) exceedCount++;
    for (let c = 0; c < nC; c++) {
      if (permColMax[c] >= obsColMaxRatios[c]) colExceed[c]++;
    }
    __s360max.push(permMax); __s360cols.push(Array.from(permColMax));
  }
  const scanP = (exceedCount + 1) / (N_PERM + 1);
  globalThis.__S360.regionalNoise.push({ nPerm: N_PERM, scanP, nC,
    obs: { scan: obsScanStat, cols: Array.from(obsColMaxRatios) },
    perm: { scan: __s360max, cols: __s360cols } });`;
const RN_DECL_FROM = `  let exceedCount = 0;
  const colExceed = new Array(nC).fill(0);`;
const RN_DECL_TO = `  let exceedCount = 0;
  const colExceed = new Array(nC).fill(0);
  const __s360max = []; const __s360cols = [];`;

// ── Cross-Condition Consistency: keep permDist instead of dropping it ──
// crossConditionConsistency.js:533-534. The array is complete at this point and
// is deleted on the next line; the unit object itself survives and later gains
// forensic / gatePassed / adjP / stage, so stashing the reference is enough.
const CCC_TARGET = "src/tests/crossConditionConsistency.js";
const CCC_FROM = `    // Drop the large permDist array — not needed downstream.
    delete u.permDist;`;
const CCC_TO = `    u.__s360perm = Array.from(u.permDist);
    (globalThis.__S360.__cccUnits || (globalThis.__S360.__cccUnits = [])).push(u);
    // Drop the large permDist array — not needed downstream.
    delete u.permDist;`;

// The capture array has to be handed over per invocation, so it is closed out
// where the result is built rather than accumulating across fixtures.
const CCC_RET_FROM = `  return {
    name: NAME,
    category: CAT,
    flag,
    primaryP,`;
const CCC_RET_TO = `  globalThis.__S360.ccc.push({ B, primaryP, flag,
    units: (globalThis.__S360.__cccUnits || []),
    bhM: [stage1Units.length, stage2Units.length, stage3Units.length] });
  globalThis.__S360.__cccUnits = [];
  return {
    name: NAME,
    category: CAT,
    flag,
    primaryP,`;

const EDITS = {
  [LOESS_TARGET]: [[LOESS_DECL_FROM, LOESS_DECL_TO], [LOESS_FROM, LOESS_TO]],
  [RN_TARGET]: [[RN_DECL_FROM, RN_DECL_TO], [RN_FROM, RN_TO]],
  [CCC_TARGET]: [[CCC_FROM, CCC_TO], [CCC_RET_FROM, CCC_RET_TO]],
};

const fired = new Set();

registerHooks({
  load(url, context, nextLoad) {
    const target = Object.keys(EDITS).find(t => url.endsWith(t));
    if (!target) return nextLoad(url, context);
    let src = readFileSync(fileURLToPath(url), "utf8");
    for (const [from, to] of EDITS[target]) {
      const n = src.split(from).length - 1;
      if (n !== 1) {
        throw new Error(`s360-joint-null-hook: anchor occurs ${n} times in ${target} (need exactly 1):\n${from.slice(0, 80)}…`);
      }
      src = src.replace(from, to);
    }
    fired.add(target);
    process.stderr.write(`[s360 hook] capturing joint null in ${target}\n`);
    return { format: "module", shortCircuit: true, source: src };
  },
});

process.on("exit", () => {
  const missing = Object.keys(EDITS).filter(t => !fired.has(t));
  if (missing.length) console.error(`!! s360-joint-null-hook: never fired for ${missing.join(", ")}`);
});

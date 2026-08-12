/* S369 Part 1 — publish the two arm flags that aggregatePerGroup computes and
   does not return.

   ONE in-memory edit, made as src/analysis/aggregation.js loads. Nothing on
   disk changes and nothing in src/ moves. The inserted line adds a single
   property, `__s369`, holding three values the function has ALREADY computed by
   the time the return object is built: `fisherFlag` (declared aggregation.js:159,
   assigned :217), `fisherP` at full precision (:160, :216) and `groupArmFlag`
   (:150, :155). No arithmetic is touched, no branch is added, nothing inside the
   module reads the new property, and the insertion sits AFTER the worst-group
   spread at :392-399 so no group result can clobber it.

   Why it is needed at all. The shipped result already publishes three of the four
   quantities this session measures, all at full precision: `worstGroupFlagRaw`
   is the bare uncorrected maximum, `groupMinPAdj` is the Sidak-corrected arm's
   p, and `multiplicityCorrected` says whether the guard at :152 held (all at
   :384). The Fisher arm's flag is the one that is not published and cannot be
   recovered from what is — `fisherP` ships as `.toFixed(4)` (:380) and
   `fisherChi` as `.toFixed(2)`, so any decision re-thresholded from either
   against ALPHA.FLAG = 0.001 would be taken off a rounded string, which is
   P107's failure mode.

   The patch is printed verbatim by the probe's `--hookdiff` mode. Its inertness
   is measured rather than argued: the probe's `--digest` mode dumps only the
   fields the shipped module already returns, and its output is byte-identical
   run with this hook and run without it.

   Usage:
     node --import ./test/probes/s369-arm-flags-hook.mjs \
          test/probes/probe-s369-aggregate-per-group.mjs --grid

   ── S369 Dispatch B extension: LOESS's third arm ────────────────────────────
   LOESS already publishes `scanP`, `cusumP`, `nPerm`, `primaryP` (which IS
   `finalPrimaryP`) and the whole `pairResults` array with each element's `adjP`.
   The one quantity the arm decomposition needs and the result does not carry is
   `pairBestAdjP` (loessResidual.js:450). It is exactly recoverable from the
   published `pairResults`, but recovering it would mean re-running the source's
   own expression and then asserting P1 against that re-run — the assertion would
   be testing my arithmetic rather than the module's. So the local itself is
   published, and P1 compares three shipped numbers.

   `pairCount` (:358, incremented :370) rides along because the funnel middle is
   not recoverable from anything shipped: `pairResults.length` counts pairs that
   passed ALL THREE `continue` gates, while `pairCount` counts those that passed
   only the first (>= 30 usable rows). The difference is "the block ran and
   produced nothing" against "the block never had a pair to look at".

   Nothing is added for Autocorrelation, and that is a finding rather than an
   omission: `allR1` (:51), every `allRk[k]` (:52) and `res` (:53) are pushed
   once each per surviving pair in one block, so their lengths are equal and
   equal to the published `nPairs` (:194). `nPairs` therefore already determines
   every lag member's computed-or-literal status — `:63` gates member 0 on
   `allR1.length >= 2` and `:137` gates members 1-4 on `vals.length >= 2`, the
   same number. No capture is needed to tell them apart.
*/
import { registerHooks } from "node:module";

const TARGET = "src/analysis/aggregation.js";

const FROM = `    details,
    subDetails:subDetails.slice(0,100),`;

const TO = `    __s369: { fisherFlag, fisherPExact: fisherP, groupArmFlag },
    details,
    subDetails:subDetails.slice(0,100),`;

const LOESS_TARGET = "src/tests/loessResidual.js";

const LOESS_FROM = `    primaryP: finalPrimaryP,`;

const LOESS_TO = `    __s369loess: { pairBestAdjP, pairCount, pairResultsLength: pairResults.length },
    primaryP: finalPrimaryP,`;

globalThis.__S369_PATCH = {
  target: TARGET, from: FROM, to: TO, applied: 0,
  loessTarget: LOESS_TARGET, loessFrom: LOESS_FROM, loessTo: LOESS_TO, loessApplied: 0,
};

/** Substitute exactly once, or throw. A silent no-op after a source edit would
 *  leave the probe reading undefined and reporting it as a missing arm. */
function substitute(src, from, to, target) {
  const hits = src.split(from).length - 1;
  if (hits !== 1) {
    throw new Error(`s369 hook: anchor matched ${hits} times in ${target}, expected exactly 1`);
  }
  return src.replace(from, to);
}

registerHooks({
  load(url, context, nextLoad) {
    const r = nextLoad(url, context);
    const isAgg = url.includes(TARGET), isLoess = url.includes(LOESS_TARGET);
    if (!isAgg && !isLoess) return r;
    const src = typeof r.source === "string" ? r.source : Buffer.from(r.source).toString("utf-8");
    if (isAgg) {
      globalThis.__S369_PATCH.applied = 1;
      return { ...r, source: substitute(src, FROM, TO, TARGET) };
    }
    globalThis.__S369_PATCH.loessApplied = 1;
    return { ...r, source: substitute(src, LOESS_FROM, LOESS_TO, LOESS_TARGET) };
  },
});

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
*/
import { registerHooks } from "node:module";

const TARGET = "src/analysis/aggregation.js";

const FROM = `    details,
    subDetails:subDetails.slice(0,100),`;

const TO = `    __s369: { fisherFlag, fisherPExact: fisherP, groupArmFlag },
    details,
    subDetails:subDetails.slice(0,100),`;

globalThis.__S369_PATCH = { target: TARGET, from: FROM, to: TO, applied: 0 };

registerHooks({
  load(url, context, nextLoad) {
    const r = nextLoad(url, context);
    if (!url.includes(TARGET)) return r;
    const src = typeof r.source === "string" ? r.source : Buffer.from(r.source).toString("utf-8");
    const hits = src.split(FROM).length - 1;
    if (hits !== 1) {
      throw new Error(`s369 hook: anchor matched ${hits} times in ${TARGET}, expected exactly 1`);
    }
    globalThis.__S369_PATCH.applied = 1;
    return { ...r, source: src.replace(FROM, TO) };
  },
});

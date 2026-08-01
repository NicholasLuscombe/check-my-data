/* S341 — pin the row-count-branched resample counts WITHOUT editing src/.

   Eight tests select N_PERM (or B) from a row-count ternary. This hook rewrites
   those eight lines as each module loads, so an arm can be measured without a
   working-tree change. Same mechanism as s340-seed-hook.mjs.

   Arm is read from S341_ARM:
     shipped  — no rewrite at all (identity; asserts anchors still exist)
     high     — each test pinned to its own highest declared tier
     low199   — every test pinned to 199

   NOTE on `low199`: 199 is a declared tier in constantOffset, IRC, runs, CCC and
   windowedAutocorrelation. It is NOT declared in loessResidual (min 499),
   regionalNoise (min 499) or blockedMahalanobis (min 999). For those three this
   arm is an extrapolation below any branch the code offers, not a reachable
   shipped state. Reported as such.

   Throws if any anchor line has moved, so a silent no-op run is impossible.

     S341_ARM=high node --import ./test/probes/s341-count-hook.mjs <probe>
*/
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ARM = process.env.S341_ARM || "shipped";
if (!["shipped", "high", "low199"].includes(ARM)) {
  throw new Error(`S341_ARM must be shipped|high|low199, got ${ARM}`);
}

/* file → { from: verbatim anchor, high: forced-high replacement } */
export const BRANCHES = {
  "src/tests/constantOffset.js": {
    from: "  const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;",
    decl: [199, 499, 999], high: 999, sel: "nR",
  },
  "src/tests/loessResidual.js": {
    from: "  const N_PERM = validRows.length <= 100 ? 4999 : 499;",
    decl: [499, 4999], high: 4999, sel: "validRows.length",
  },
  "src/tests/regionalNoise.js": {
    from: "  const N_PERM = validRows.length <= 100 ? 4999 : 499;",
    decl: [499, 4999], high: 4999, sel: "validRows.length",
  },
  "src/tests/blockedMahalanobis.js": {
    from: "  const N_PERM = maxN <= 500 ? 4999 : 999;",
    decl: [999, 4999], high: 4999, sel: "maxN",
  },
  "src/tests/interReplicateCorrelation.js": {
    from: "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;",
    decl: [199, 499, 999], high: 999, sel: "maxN",
  },
  "src/tests/runs.js": {
    from: "    const N_PERM=maxN<=100?999:maxN<=1000?499:199;",
    decl: [199, 499, 999], high: 999, sel: "maxN",
  },
  "src/tests/crossConditionConsistency.js": {
    from: "  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;",
    decl: [199, 499, 999], high: 999, sel: "maxN", varName: "B",
  },
  "src/tests/windowedAutocorrelation.js": {
    from: "  const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;",
    decl: [199, 499, 999], high: 999, sel: "nR",
  },
};

const seen = new Set();

registerHooks({
  load(url, context, nextLoad) {
    const hit = Object.keys(BRANCHES).find((f) => url.endsWith(f));
    if (!hit) return nextLoad(url, context);
    const spec = BRANCHES[hit];
    const src = readFileSync(fileURLToPath(url), "utf8");
    if (!src.includes(spec.from)) {
      throw new Error(`s341-count-hook: anchor moved in ${hit}\n  expected: ${spec.from}`);
    }
    seen.add(hit);
    if (ARM === "shipped") return nextLoad(url, context); // anchor asserted, nothing rewritten
    const name = spec.varName || "N_PERM";
    const value = ARM === "high" ? spec.high : 199;
    const to = `  const ${name} = ${value}; /* S341 ${ARM} */`;
    return { format: "module", shortCircuit: true, source: src.replace(spec.from, to) };
  },
});

process.on("exit", () => {
  const missing = Object.keys(BRANCHES).filter((f) => !seen.has(f));
  if (missing.length) {
    console.error(`\n!! s341-count-hook: these branch modules never loaded: ${missing.join(", ")}`);
  }
});

/* S350 — swap Residual Spike Correlation's permutation for a within-subject
   relabel, without editing src/.

   One in-memory edit to src/tests/residualSpikeCorrelation.js as it loads.
   Same route as test/probes/s350-paired-null-hook.mjs, different target file,
   so the two compose cleanly — each short-circuits on its own URL only.

   THE SHIPPED NULL (residualSpikeCorrelation.js:137-154) shuffles each group's
   per-row residual vector independently across row positions. It never pools
   across conditions, so it is already a within-group null. What it destroys is
   the row-position correspondence BETWEEN groups — which is the subject
   identity a paired design carries.

   THE SWAPPED NULL keeps every value at its own row position and permutes,
   per row, which group holds which of that subject's values. On a paired
   fixture that is the exchangeability the design actually has.

   RSC already position-matches: it truncates to the shortest condition and
   pairs row r of one group with row r of the next (:43). So the relabel below
   is a within-subject relabel exactly when the fixture is genuinely paired
   positionally. The hook cannot check that — no subject key reaches the test —
   so the caller must. probe-s350-rsc-clean.mjs does.

   Globals:
     __S350_RSC_PAIRED           truthy -> within-subject relabel; falsy -> shipped null.
     __S350_RSC_PAIRED_APPLIED   set on the first permutation of a paired run.

   Usage:
     node --import ./test/probes/s348-hash-hook.mjs \
          --import ./test/probes/s350-rsc-null-hook.mjs <probe>

   Throws if the anchor has moved, so a silent no-op run is impossible. */
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TARGET = "src/tests/residualSpikeCorrelation.js";

const FROM = `    // Build top-K mask per group from a fresh permutation.
    for (let g = 0; g < nC; g++) {
      const sc = groupScratch[g];
      const shuf = sc.shuffledBuf;
      const idx = sc.idxBuf;
      const mask = sc.topKMask;
      // Refill + Fisher-Yates shuffle in place.
      for (let i = 0; i < nR; i++) shuf[i] = sc.absResidBuf[i];
      for (let i = nR - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        const tmp = shuf[i]; shuf[i] = shuf[j]; shuf[j] = tmp;
      }
      // Sort indices by shuf value descending.
      for (let i = 0; i < nR; i++) idx[i] = i;
      idx.sort((a, b) => shuf[b] - shuf[a]);
      // Mark top-K positions.
      mask.fill(0);
      for (let k = 0; k < K; k++) mask[idx[k]] = 1;
    }`;

const TO = `    if (globalThis.__S350_RSC_PAIRED) {
      // Within-subject relabel: row positions never move; for each row, the
      // groups permute which of that subject's values they hold.
      const __pi = new Array(nC);
      for (let __r = 0; __r < nR; __r++) {
        for (let __g = 0; __g < nC; __g++) __pi[__g] = __g;
        for (let __i = nC - 1; __i > 0; __i--) {
          const __j = Math.floor(rng.random() * (__i + 1));
          const __t = __pi[__i]; __pi[__i] = __pi[__j]; __pi[__j] = __t;
        }
        for (let __g = 0; __g < nC; __g++) {
          groupScratch[__g].shuffledBuf[__r] = groupScratch[__pi[__g]].absResidBuf[__r];
        }
      }
      for (let __g = 0; __g < nC; __g++) {
        const sc = groupScratch[__g];
        const shuf = sc.shuffledBuf, idx = sc.idxBuf, mask = sc.topKMask;
        for (let __i = 0; __i < nR; __i++) idx[__i] = __i;
        idx.sort((a, b) => shuf[b] - shuf[a]);
        mask.fill(0);
        for (let __k = 0; __k < K; __k++) mask[idx[__k]] = 1;
      }
      globalThis.__S350_RSC_PAIRED_APPLIED = true;
    } else {
    // Build top-K mask per group from a fresh permutation.
    for (let g = 0; g < nC; g++) {
      const sc = groupScratch[g];
      const shuf = sc.shuffledBuf;
      const idx = sc.idxBuf;
      const mask = sc.topKMask;
      // Refill + Fisher-Yates shuffle in place.
      for (let i = 0; i < nR; i++) shuf[i] = sc.absResidBuf[i];
      for (let i = nR - 1; i > 0; i--) {
        const j = Math.floor(rng.random() * (i + 1));
        const tmp = shuf[i]; shuf[i] = shuf[j]; shuf[j] = tmp;
      }
      // Sort indices by shuf value descending.
      for (let i = 0; i < nR; i++) idx[i] = i;
      idx.sort((a, b) => shuf[b] - shuf[a]);
      // Mark top-K positions.
      mask.fill(0);
      for (let k = 0; k < K; k++) mask[idx[k]] = 1;
    }
    }`;

let applied = false;

globalThis.__S350_RSC_HOOK = true;

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(TARGET)) return nextLoad(url, context);
    const src = readFileSync(fileURLToPath(url), "utf8");
    const n = src.split(FROM).length - 1;
    if (n !== 1) {
      throw new Error(`s350-rsc-null-hook: anchor occurs ${n} times in ${TARGET} (need exactly 1).`);
    }
    applied = true;
    process.stderr.write(`[s350 rsc hook] RSC null switchable via __S350_RSC_PAIRED (in memory)\n`);
    return { format: "module", shortCircuit: true, source: src.replace(FROM, TO) };
  },
});

process.on("exit", () => {
  if (!applied) console.error("!! s350-rsc-null-hook: never fired — residualSpikeCorrelation.js not loaded?");
});

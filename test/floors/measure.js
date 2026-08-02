/* P67 — drive the seven parametric sites to their arithmetic floor and render
 * the manifest from what was OBSERVED.
 *
 * Two things this file must not do, both of which would hollow out the check:
 *
 *   1. It must not read a declared value from `declarations.js` and echo it.
 *      Everything in `measure()` comes back from a module call.
 *   2. It must not read the engine. Each module is called DIRECTLY, because
 *      the Šidák transform at `aggregation.js:154` sits between a module's p
 *      and the engine's reported p and inflates the floor to
 *      1 − (1 − c/(B+1))^G on condition-grouped files. That inflation is real
 *      and is recorded as a note in the manifest, but it is not the site's
 *      floor and must never be folded into one.
 *
 * ── Forcing zero exceedances ────────────────────────────────────────────────
 * All seven draw their null independently of the input, so the requirement is
 * only that the OBSERVED statistic falls outside the simulated support. No
 * structured synthetic input is needed — that is what makes these the cheap
 * seven and the sixteen shuffle sites expensive.
 *
 * The inputs below are deterministic: no PRNG, no fixture, no clock. The rng
 * each module receives is `createPRNG(matrix)`, seeded from the matrix itself.
 *
 * Run: npx vitest run test/floor-manifest.test.js
 */

import { createPRNG } from "../../src/stats/prng.js";
import { createConditionContext } from "../../src/analysis/conditionContext.js";
import { testKurtosis } from "../../src/tests/kurtosis.js";
import { testBenford } from "../../src/tests/benford.js";
import { testBenford2 } from "../../src/tests/benford2.js";
import { testEntropy } from "../../src/tests/entropyTest.js";
import { testColumnGof } from "../../src/tests/columnGof.js";
import { DECLARATIONS, FORWARD_REQUIREMENTS, COVERAGE } from "./declarations.js";

// ── Inputs ─────────────────────────────────────────────────────────────────

/* Kurtosis. Replicates are near-identical except for rare large spikes in one
 * column, so the inter-replicate difference distribution is extremely
 * leptokurtic and sits far outside the Gaussian simulated support.
 *
 * Far outside is also what keeps the S159d pilot gate shut. That gate fires
 * when the observed statistic is CLOSE to the null body (kurtosis.js:322), so
 * a floor-forcing input cannot trip it — avoidance by construction, not luck.
 * `nSimulations` is asserted alongside the floor to prove the gate stayed shut:
 * had it fired, the denominator would be 51, not 2000. */
function kurtosisMatrix(nR = 120, nC = 4) {
  return Array.from({ length: nR }, (_, i) =>
    Array.from({ length: nC }, (_, c) => {
      const base = 100 + (i % 13) * 3;
      const spike = i % 37 === 0 && c === 1 ? 5000 : 0;
      return base + spike + c * 0.0001;
    }),
  );
}

/* Benford first digit. Every value has leading digit 1, spanning four orders of
 * magnitude to clear the multi-OOM applicability gate. The observed digit
 * distribution is as far from log10(1 + 1/d) as a sample can be. */
function benfordMatrix() {
  return Array.from({ length: 200 }, (_, i) => {
    const mag = Math.pow(10, i % 4);
    return [1 * mag + (i % 9) * 0.01 * mag, 1.5 * mag, 1.9 * mag];
  });
}

/* Benford second digit. Second significant digit is 1 throughout. */
function benford2Matrix() {
  return Array.from({ length: 200 }, (_, i) => {
    const mag = Math.pow(10, i % 4);
    return [2.1 * mag, 3.1 * mag, 5.1 * mag];
  });
}

/* Entropy. One column, three distinct values on a wide spread: real variance,
 * but far lower Shannon entropy than any draw from the moment-matched
 * parametric null. Single column is deliberate — at m = 1 the BH step is the
 * identity, so the measured value is the SITE's raw floor and not a statement
 * about bhFDR. (Three columns also return the raw floor, because every column
 * floors and the step-up's j = m term wins, but this assertion should not
 * depend on that.) */
function entropyMatrix() {
  return Array.from({ length: 120 }, (_, i) => [(i % 3) * 100]);
}

/* Column goodness-of-fit. The hardest of the seven to construct, because two
 * guards stand in front of the p:
 *
 *   columnGof.js:88     skip any column with fewer than 10 distinct values
 *   columnGof.js:126-133 moment pre-skip — |γ₁| > 1.5, or γ₂ < −1.2, or
 *                        (γ₂ < −0.8 and N ≥ 100) routes the column to N/A as a
 *                        shape the {Normal, Poisson, NB} family set does not
 *                        cover
 *
 * S344's suggested "perfectly uniform or perfectly degenerate column" fails
 * both: degenerate has 1 distinct value, uniform has γ₂ ≈ −1.2. Bimodal
 * (γ₂ = −2.0) and heavy-tailed (γ₁ = 4.1) bounce off the pre-skip too.
 *
 * What passes: symmetric about zero (γ₁ ≈ 0) with a sharp central cluster and
 * rare far outliers (γ₂ positive, admitted by the gate) — moments the family
 * set accepts, wrapped around a shape a fitted Normal is rejected against at
 * every one of 2000 draws. Single column for the same BH-identity reason as
 * Entropy. */
function columnGofMatrix() {
  const spike = (i) => (i % 5 === 0 ? (i % 10 === 0 ? 900 + i : -900 - i) : (i % 7) * 0.9);
  return Array.from({ length: 120 }, (_, i) => [spike(i)]);
}

// ── Measurement ────────────────────────────────────────────────────────────

/** Drive all seven sites. Every returned `observed` is a module return value.
 *  @returns {Map<string, {observed: number, denominatorEvidence: string|null}>} */
export function measure() {
  const out = new Map();

  // S16 / S17 — one call serves both. nC = 4 puts the κ branch in charge of
  // pooledP, but `_kurtosisP` and `_andersonDarlingP` are published on every
  // result, so both arms are readable from the same run. Read the raw numbers
  // via primaryP where possible; the underscore fields are 4-dp strings, which
  // is exact at 0.0005 but is parsed rather than compared as text.
  const kMatrix = kurtosisMatrix();
  const kRes = testKurtosis(kMatrix, null, createPRNG(kMatrix));
  out.set("S16", {
    observed: Number(kRes._kurtosisP),
    denominatorEvidence: `nSimulations = ${kRes.nSimulations}`,
  });
  out.set("S17", {
    observed: Number(kRes._andersonDarlingP),
    denominatorEvidence: `nSimulations = ${kRes.nSimulations}`,
  });

  // S18 — per-condition arm. Needs ≥2 row conditions of ≥20 rows and ≥20
  // usable diffs each. Same leptokurtic construction, split in half.
  const sMatrix = kurtosisMatrix();
  const rowConditions = Array.from({ length: sMatrix.length }, (_, i) => (i < 60 ? "A" : "B"));
  const sRes = testKurtosis(
    sMatrix,
    createConditionContext({ rowConditions, matrix: sMatrix }),
    createPRNG(sMatrix),
  );
  const condPs = (sRes.condKurtosis || []).map((c) => c.rawP);
  out.set("S18", {
    // Min across conditions: every condition floors, so this IS the floor, and
    // taking the min means a single condition failing to floor would surface.
    observed: condPs.length ? Math.min(...condPs) : NaN,
    denominatorEvidence: `nSimulations = ${sRes.nSimulations}, ${condPs.length} conditions`,
  });

  const bMatrix = benfordMatrix();
  out.set("S19", {
    observed: testBenford(bMatrix, createPRNG(bMatrix)).primaryP,
    denominatorEvidence: null,
  });

  const b2Matrix = benford2Matrix();
  out.set("S20", {
    observed: testBenford2(b2Matrix, createPRNG(b2Matrix)).primaryP,
    denominatorEvidence: null,
  });

  const eMatrix = entropyMatrix();
  out.set("S22", {
    observed: testEntropy(eMatrix, createPRNG(eMatrix), "continuous").primaryP,
    denominatorEvidence: "1 column — BH is the identity at m = 1",
  });

  const gMatrix = columnGofMatrix();
  out.set("S23", {
    observed: testColumnGof(gMatrix, createPRNG(gMatrix), "continuous").primaryP,
    denominatorEvidence: "1 column — BH is the identity at m = 1",
  });

  return out;
}

// ── Manifest rendering ─────────────────────────────────────────────────────

/** Full float precision. A floor rounded for display would defeat the point —
 *  1/5001 and 1/5000 agree to four decimals. */
const num = (v) => (Number.isFinite(v) ? String(v) : "—");

/** Render the manifest from declarations + a measured run.
 *  @param {Map} measured output of `measure()`
 *  @returns {string} markdown */
export function renderManifest(measured) {
  const L = [];

  L.push("# Floor manifest — PARTIAL");
  L.push("");
  L.push("**Generated, not hand-maintained.** The only writer is");
  L.push("`test/floors/measure.js`, via `UPDATE_FLOOR_MANIFEST=1 npx vitest run test/floor-manifest.test.js`.");
  L.push("Edit the declarations or the measurement, never this file — `test/floor-manifest.test.js`");
  L.push("fails if the committed copy and a fresh generation disagree.");
  L.push("");
  L.push(`**Coverage: ${COVERAGE.covered} of ${COVERAGE.total} p-computation sites.**`);
  L.push("");
  L.push("The " + COVERAGE.covered + " are the parametric-simulation nulls, whose null draws do not depend on the");
  L.push("input — forcing zero exceedances needs only an observed statistic outside the simulated");
  L.push("support. The remaining " + (COVERAGE.total - COVERAGE.covered) + " are shuffle/permutation sites: their null is a permutation of");
  L.push("the observed data, so each needs a structured synthetic input built to its own mechanism.");
  L.push("Site inventory in `SESSION344-FLOOR-SITE-CENSUS.md`; drivability in");
  L.push("`SESSION345-DRIVABILITY-CLASSIFICATION.md`.");
  L.push("");
  L.push("**This manifest supersedes nothing yet.** `test/probes/probe-resample-census.mjs` stays until");
  L.push("coverage is complete.");
  L.push("");
  L.push("Every **observed** value below is a module return value from a run, not a figure read out of");
  L.push("source. Every **declared** value is authored by hand in `test/floors/declarations.js`. The");
  L.push("two are produced independently; the test is that they agree.");
  L.push("");
  L.push("---");
  L.push("");
  L.push("## Measured floors");
  L.push("");
  L.push("| site | module · entry | construction | `c` | `B` source | `B` | declared floor | observed | evidence |");
  L.push("|---|---|---|---|---|---|---|---|---|");

  for (const d of DECLARATIONS) {
    const m = measured.get(d.id);
    const path = d.paths.find((p) => p.name === d.measuredPath);
    L.push(
      `| ${d.id} | \`${d.module.replace("src/tests/", "")}\` · \`${d.entry}\` | \`${d.construction}\` | ${d.c} | ${d.bSource} | ${path.B} | \`${num(d.expected)}\` | \`${num(m.observed)}\` | ${m.denominatorEvidence || "—"} |`,
    );
  }

  L.push("");
  L.push("## Sites whose `B` is not a constant");
  L.push("");
  L.push("A single number per site would assert something true only on the path the run happened to");
  L.push("take. These sites carry one floor per path, and the manifest names each.");
  L.push("");

  const multi = DECLARATIONS.filter((d) => d.paths.length > 1);
  for (const d of multi) {
    L.push(`**${d.id} — \`${d.site}\`.** \`B\` is \`${d.bExpr}\` (${d.bSource}).`);
    L.push("");
    L.push("| path | `B` | floor | |");
    L.push("|---|---|---|---|");
    for (const p of d.paths) {
      const measuredHere = p.name === d.measuredPath ? " **← measured**" : "";
      L.push(`| ${p.name} | ${p.B} | \`${num(p.floor)}\` | ${p.note || ""}${measuredHere} |`);
    }
    L.push("");
  }

  L.push("The early-exit path is not reachable from a floor-forcing input — the S159d pilot gate fires");
  L.push("only when the observed statistic is close to the null body — so its floor is declared but not");
  L.push("measured. `nSimulations` is asserted on every Kurtosis measurement to prove which path ran.");
  L.push("");
  L.push("## Recorded separately — not part of any floor");
  L.push("");
  L.push("**Šidák.** On condition-grouped files `aggregation.js:154` transforms a module's p before the");
  L.push("engine reports it, raising the *reported* floor to `1 − (1 − c/(B+1))^G` over `G` groups. Every");
  L.push("figure in this manifest is a module return value taken before that transform. The inflation is");
  L.push("real and belongs in a reader's model of what the UI shows, but it is not a site's floor and is");
  L.push("deliberately not folded into one.");
  L.push("");

  const stale = DECLARATIONS.filter((d) => d.staleComment);
  if (stale.length) {
    L.push("**Stale counts found in comments.** Nothing computes from these, so no p is wrong — but a");
    L.push("comment naming a count the code no longer uses is the drift this manifest exists to catch.");
    L.push("");
    for (const d of stale) L.push(`- ${d.id}: ${d.staleComment}`);
    L.push("");
  }

  L.push("## Not covered, with their shape recorded");
  L.push("");
  for (const f of FORWARD_REQUIREMENTS) {
    L.push(`**${f.id} — \`${f.module.replace("src/tests/", "")}\`.** ${f.why}. \`B\` is ${f.bSource}: \`${f.bExpr}\`.`);
    L.push("");
    L.push("| arm | `B` | floor |");
    L.push("|---|---|---|");
    for (const p of f.paths) L.push(`| ${p.name} | ${p.B} | \`${num(p.floor)}\` |`);
    L.push("");
    if (f.note) L.push(`${f.note.charAt(0).toUpperCase()}${f.note.slice(1)}.`);
    L.push("");
  }

  return L.join("\n");
}

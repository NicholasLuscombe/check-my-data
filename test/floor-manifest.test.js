/* P67 — the seven parametric floor assertions, plus the manifest freshness gate.
 *
 * Two independently-produced things are compared here:
 *
 *   declared  — authored by hand in test/floors/declarations.js from the S344
 *               census, read back at source. Never derived from the code.
 *   observed  — what the module actually returns when driven to zero
 *               exceedances.
 *
 * Neither is computed from the other. The assertion is that they agree. If one
 * moves, the first question is which — not which to update.
 *
 * The freshness gate is here rather than in an npm script on purpose:
 * `scripts/build-test-display-map.mjs --check` exists, works, and is wired to
 * nothing, which is what happens to a check someone has to remember to run.
 *
 * Regenerate the manifest:
 *   UPDATE_FLOOR_MANIFEST=1 npx vitest run test/floor-manifest.test.js
 *
 * Run: npx vitest run test/floor-manifest.test.js
 */

import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { DECLARATIONS, COVERAGE, REACHABLE_TIERS, REACHABLE_LADDER } from "./floors/declarations.js";
import { ALPHA, flagFromP } from "../src/constants/thresholds.js";
import { measure, renderManifest } from "./floors/measure.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(HERE, "../docs/shared/FLOOR-MANIFEST.md");

// One measured run shared by every assertion below. Driving seven modules —
// two of them 5000-draw Benford simulations — costs seconds, not milliseconds;
// doing it once keeps that to one payment per test file.
const measured = measure();

describe("P67 — parametric site floors match their authored declarations", () => {
  for (const d of DECLARATIONS) {
    const path = d.paths.find((p) => p.name === d.measuredPath);

    it(`${d.id} ${d.site} — ${d.construction.split("=")[0].trim()} floors at c/(B+1) = ${d.c}/${path.B + 1}`, () => {
      const m = measured.get(d.id);
      expect(m, `${d.id} produced no measurement`).toBeDefined();

      // Exact. These are the same division performed on the same doubles, so
      // there is no tolerance to justify — a mismatch means the construction or
      // the count moved, which is precisely what should fail loudly.
      expect(m.observed).toBe(d.expected);

      // Restate the arithmetic independently of the declaration's own helper,
      // so a mistake in `floor()` cannot make the declaration self-consistent
      // and wrong at the same time.
      expect(m.observed).toBe(d.c / (path.B + 1));
    });
  }

  // The Kurtosis sites divide by an array length rather than a constant, so
  // which path ran is part of the claim. Without this, a run that silently took
  // the early exit would compare 1/51 against a declaration of 1/2000 and fail
  // with no indication of why.
  it("Kurtosis sites ran the full simulation, not the S159d early exit", () => {
    for (const id of ["S16", "S17", "S18"]) {
      expect(measured.get(id).denominatorEvidence).toContain("nSimulations = 1999");
    }
  });
});

describe("P67 — floor manifest is fresh", () => {
  const fresh = renderManifest(measured);

  if (process.env.UPDATE_FLOOR_MANIFEST === "1") {
    it("regenerated the committed manifest (UPDATE_FLOOR_MANIFEST=1)", () => {
      writeFileSync(MANIFEST_PATH, fresh, "utf8");
      expect(readFileSync(MANIFEST_PATH, "utf8")).toBe(fresh);
    });
  } else {
    it("committed manifest matches a fresh generation", () => {
      expect(
        existsSync(MANIFEST_PATH),
        "docs/shared/FLOOR-MANIFEST.md is missing — regenerate with UPDATE_FLOOR_MANIFEST=1",
      ).toBe(true);

      // A test that rewrites the manifest asserts nothing: the diff has to
      // appear in a commit for anyone to see the floor moved. So this compares
      // and fails; it never writes.
      expect(
        readFileSync(MANIFEST_PATH, "utf8"),
        "FLOOR-MANIFEST.md is stale. If the change is intended, regenerate with " +
          "UPDATE_FLOOR_MANIFEST=1 npx vitest run test/floor-manifest.test.js and commit the diff.",
      ).toBe(fresh);
    });
  }

  it(`declares its own partial coverage — ${COVERAGE.covered} of ${COVERAGE.total}`, () => {
    expect(DECLARATIONS).toHaveLength(COVERAGE.covered);
    expect(COVERAGE.covered).toBeLessThan(COVERAGE.total);
    expect(fresh).toContain(`Coverage: ${COVERAGE.covered} of ${COVERAGE.total}`);
    expect(fresh).toContain("PARTIAL");
  });
});

/* ── P105 — reachable tier sets ──────────────────────────────────────────────
 *
 * Same shape as the floor assertions above and for the same reason. The
 * `reachable` array in each declaration is authored by hand; the array compared
 * against it is derived here from the authored count and sidedness using the
 * SHIPPED thresholds and comparator. Neither is computed from the other.
 *
 * That split decides what each half catches. Moving ALPHA.FLAG, ALPHA.NOTE or
 * the strictness of the comparison changes the derived set and fails. Moving a
 * resample count changes neither — so `sourceAnchor` carries that half, by
 * asserting the authored count expression is still the one in the module. A
 * count that moves fails on the anchor rather than silently re-basing the
 * arithmetic underneath a declaration that still passes.
 */
describe("P105 — reachable tier sets match their authored declarations", () => {
  const SRC_ROOT = resolve(HERE, "..");

  // Derived from the declaration's own authored numbers. Nothing here reads the
  // module under test; ALPHA and flagFromP are the shipped comparator, which is
  // the thing a declaration is supposed to be sensitive to.
  function derive(d) {
    if (d.mechanism === "overridden") return ["LOW"];

    const hit = new Set(["LOW"]);
    if (d.mechanism === "resample-floor") {
      // Every attainable p on the lattice, not just the floor: a floor below
      // ALPHA.FLAG does not by itself say MODERATE is attainable, and on a
      // coarse count it may not be.
      for (let j = 1; j <= d.B + 1; j++) {
        const p = (d.c * j) / (d.B + 1);
        if (p > 1) break;
        hit.add(flagFromP(p));
      }
    } else if (d.mechanism === "p-clamp") {
      // p is continuous above the clamp, so every tier at or below the clamp's
      // own tier is attainable. Probing the two thresholds is enough to name them.
      for (const p of [d.floor, ALPHA.FLAG, ALPHA.NOTE, 0.5]) {
        if (p >= d.floor) hit.add(flagFromP(p));
      }
    } else if (d.mechanism === "tier-cap") {
      for (const p of [0, ALPHA.FLAG, ALPHA.NOTE, 0.5]) hit.add(flagFromP(p));
      if (hit.delete("HIGH")) hit.add(d.capTo);
    } else {
      throw new Error(`unknown mechanism ${d.mechanism}`);
    }
    return REACHABLE_LADDER.filter((t) => hit.has(t));
  }

  for (const d of REACHABLE_TIERS) {
    const label = `${d.test} · ${d.branch}`;

    it(`${label} — reaches {${d.reachable.join(", ")}}`, () => {
      expect(derive(d)).toEqual(d.reachable);
    });

    if (d.mechanism === "resample-floor") {
      it(`${label} — floor is c/(B+1) = ${d.c}/${d.B + 1}`, () => {
        // Restated rather than imported, so a mistake in the declarations
        // helper cannot make a declaration self-consistent and wrong at once.
        const f = d.c / (d.B + 1);
        expect(flagFromP(f)).toBe(d.reachable[0]);
      });
    }

    it(`${label} — the authored count expression is still in ${d.sourceAnchor.file}`, () => {
      const src = readFileSync(resolve(SRC_ROOT, d.sourceAnchor.file), "utf8");
      const n = src.split(d.sourceAnchor.text).length - 1;
      expect(
        n,
        `anchor occurs ${n} times — if the count or rule moved, the reachable set moved with it. ` +
          `Re-derive the set; do not edit the declaration to make this pass.`,
      ).toBe(1);
    });
  }

  it("every entry is a proper subset of the ladder", () => {
    // The scope rule, enforced. A full-ladder entry would assert nothing and
    // would quietly turn "absence means full ladder" into "absence means
    // nobody looked".
    for (const d of REACHABLE_TIERS) {
      expect(d.reachable.length, `${d.test} · ${d.branch} is the full ladder`).toBeLessThan(
        REACHABLE_LADDER.length,
      );
      expect(d.reachable).toContain("LOW");
    }
  });

  it("names the branches where the test cannot flag at all", () => {
    // Two, both understood: Cross-Condition Consistency's coarsest count, whose
    // floor sits exactly on ALPHA.NOTE, and Excess Kurtosis's pilot shortcut,
    // which fires only when the observed statistic is already inside the null
    // body and overrides its p to 1.0. A third appearing here is a detection
    // hole, not a declaration to add.
    const locked = REACHABLE_TIERS.filter((d) => d.reachable.length === 1).map(
      (d) => `${d.test} · ${d.branch}`,
    );
    expect(locked).toEqual([
      "Excess Kurtosis · pilot early exit",
      "Cross-Condition Consistency · largest condition over 10000 cells",
    ]);
  });
});

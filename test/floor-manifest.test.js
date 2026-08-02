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

import { DECLARATIONS, COVERAGE } from "./floors/declarations.js";
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

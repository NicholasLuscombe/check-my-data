/* P67 part one — bhFDR is a step-up, and the family minimum is not p_(1) · m.
 *
 * METHODOLOGY carried the wrong arithmetic for this from v0.8 to S343: it read
 * the reachable family minimum as the rank-1 term `p_(1) · m`. That term is one
 * of m candidates, not the minimum. `bhFDR` walks ranks from m down to 1 keeping
 * a running minimum, so what it returns at rank 1 is
 *
 *     min over j of (p_(j) · m/j)
 *
 * and at j = m that term is p_(m) · m/m = p_(m) — no m factor at all. When a
 * whole family sits at the raw floor c/(B+1), the family minimum IS c/(B+1).
 *
 * The consequence the retired form inverted: a STRONGER signal puts MORE units
 * at the floor, which LOWERS the achievable adjusted p. Two parked calibration
 * decisions were made against the wrong direction of that relationship.
 *
 * Three cases, one m and one f across all of them, so the only thing varying is
 * how many units sit at the floor:
 *
 *   1. all m at the floor  -> f          (retired form predicted f · m)
 *   2. one at the floor    -> f · m      (where the retired form is right)
 *   3. k at the floor      -> f · m/k    (between the two)
 *
 * f = 0.001 is 1/(B+1) at B = 999, the battery's most common count, so case 1's
 * number is a real site's real floor rather than an abstract constant.
 *
 * These assert what bhFDR returns. Nothing here reads its internals, and the
 * rank j it computes and discards at primitives.js:242 is out of scope — P67 is
 * the floor only.
 *
 * Run: npx vitest run test/bhfdr-stepup.test.js
 */

import { describe, it, expect } from "vitest";
import { bhFDR } from "../src/stats/primitives.js";

// One family size and one floor across all three cases. m = 12 divides cleanly
// by k = 3, and f · m = 0.012 stays far below the cap of 1 that bhFDR applies
// (`minAdj` starts at 1; the write is `Math.min(minAdj, 1)`).
const M = 12;
const F = 0.001;

// Filler for the units NOT at the floor. Its smallest possible term is
// 0.9 · 12/12 = 0.9 — seventy-five times the largest expected value below — so
// the filler never supplies the minimum in any case.
const HIGH = 0.9;

// bhFDR returns q-values in INPUT order, not sorted order, so the family
// minimum is the min over the whole returned array.
const familyMin = (ps) => Math.min(...bhFDR(ps));

// 12 digits. The three values are exact IEEE-754 doubles today; this is three
// orders tighter than needed to separate 0.001 / 0.004 / 0.012 and survives an
// engine detail changing the last bit.
const PRECISION = 12;

describe("bhFDR is a step-up: the family minimum is min over j of (p_(j) · m/j)", () => {
  it("whole family at the floor returns the floor, not floor × m", () => {
    const family = Array(M).fill(F);
    const min = familyMin(family);

    // The j = m term is p_(m) · m/m = p_(m). No m factor.
    expect(min).toBeCloseTo(F, PRECISION);
    expect(min).toBeCloseTo(0.001, PRECISION);

    // The regression this file exists to lock. The retired arithmetic read this
    // family's minimum as p_(1) · m = 0.012 — a full order out, and out in the
    // direction that made a strong signal look weak.
    expect(min).not.toBeCloseTo(F * M, PRECISION);
  });

  it("one unit at the floor returns floor × m — the rank-1 term", () => {
    const family = [F, ...Array(M - 1).fill(HIGH)];
    const min = familyMin(family);

    // Sparse signal: every higher-rank term is at least HIGH, so rank 1 wins.
    // This is the case the retired form got right, which is why it survived.
    expect(min).toBeCloseTo(F * M, PRECISION);
    expect(min).toBeCloseTo(0.012, PRECISION);
  });

  it("k units at the floor returns floor × m/k", () => {
    const K = 3;
    const family = [...Array(K).fill(F), ...Array(M - K).fill(HIGH)];
    const min = familyMin(family);

    // j = k is the winning term: 0.001 · 12/3 = 0.004. Lower than the sparse
    // case (0.012) and higher than the whole-family case (0.001) — the monotone
    // relationship between units-at-floor and achievable p, in one line.
    expect(min).toBeCloseTo((F * M) / K, PRECISION);
    expect(min).toBeCloseTo(0.004, PRECISION);
  });
});

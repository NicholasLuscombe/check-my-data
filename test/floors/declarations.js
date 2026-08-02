/* P67 — authored floor declarations for the seven parametric-simulation sites.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO ENFORCE ────────────────────────────────
 * Every value below is AUTHORED BY HAND from SESSION344-FLOOR-SITE-CENSUS.md
 * Table 1 and read back at source. NOTHING here may be derived, computed or
 * scraped from the expression it checks. A declaration read out of the code it
 * is checking asserts nothing — it restates the code and passes by
 * construction. That tautology is the whole reason P67 exists: METHODOLOGY's
 * permutation arithmetic was wrong from v0.8 to S343 and nothing caught it,
 * because nothing independent ever stated what the floors should be.
 *
 * If a floor here stops matching the measurement, the correct first question is
 * "which one moved?", not "update the declaration".
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Floor = c / (B + 1).
 *   c = 1 one-sided, 2 doubled.
 *   B = the count the denominator actually uses — NOT necessarily the constant
 *       the module's comment names. See `bSource` and the Kurtosis note.
 *
 * Scope: the 7 parametric-simulation nulls (S16–S20, S22, S23). The 16
 * shuffle/permutation sites need structured synthetic inputs and are not
 * covered — see SESSION345-DRIVABILITY-CLASSIFICATION.md §1.
 *
 * `bSource` is a three-way classification, not decoration:
 *   'constant'    — a literal in the module. One floor.
 *   'run-length'  — the length of an array built at run time. The denominator
 *                   can differ between paths, so the site carries MORE THAN ONE
 *                   floor and the manifest must name each. Declaring a single
 *                   number here would assert something true only on the path
 *                   the test happens to take.
 *   'row-rule'    — a row-count ladder. None of the seven uses one; recorded
 *                   because the shuffle sites do (see FORWARD_REQUIREMENTS).
 */

/** Exact floor as a double. Written as the division so the arithmetic is
 *  visible in the source rather than as an opaque decimal literal. `c` and `B`
 *  are the authored numbers; this is not reading anything from the module. */
const floor = (c, B) => c / (B + 1);

export const DECLARATIONS = [
  {
    id: "S16",
    module: "src/tests/kurtosis.js",
    entry: "testKurtosis",
    site: "kurtosis.js:347",
    construction: "kurtP = (nExceed + 1) / (simKurts.length + 1)",
    c: 1,
    bSource: "run-length",
    bExpr: "simKurts.length",
    // Two paths. The full simulation pushes once per iteration for N_SIM=1999
    // iterations, so the denominator is 2000. On the S159d early exit the loop
    // `continue`s (burning PRNG quota) instead of breaking, so simKurts freezes
    // at N_PILOT=50 and the denominator is 51. The comment at kurtosis.js:167
    // names N_SIM as the count; on the early-exit path that is wrong.
    paths: [
      { name: "full simulation", B: 1999, floor: floor(1, 1999), note: "gate did not fire" },
      { name: "S159d early exit", B: 50, floor: floor(1, 50), note: "masked — kurtP is overridden to 1.0 at :341" },
    ],
    measuredPath: "full simulation",
    expected: floor(1, 1999),
  },
  {
    id: "S17",
    module: "src/tests/kurtosis.js",
    entry: "testKurtosis",
    site: "kurtosis.js:359",
    construction: "adP = (nExceed + 1) / (simADs.length + 1)",
    c: 1,
    bSource: "run-length",
    bExpr: "simADs.length",
    paths: [
      { name: "full simulation", B: 1999, floor: floor(1, 1999), note: "gate did not fire" },
      { name: "S159d early exit", B: 50, floor: floor(1, 50), note: "masked — adP is overridden to 1.0 at :352" },
    ],
    measuredPath: "full simulation",
    expected: floor(1, 1999),
  },
  {
    id: "S18",
    module: "src/tests/kurtosis.js",
    entry: "testKurtosis (stratifyKurtosis)",
    site: "kurtosis.js:425",
    construction: "condP = (nExceed + 1) / (simKurts.length + 1)",
    c: 1,
    bSource: "run-length",
    bExpr: "simKurts.length — the SHARED pooled null",
    // The one that is NOT masked. S16/S17 are overridden to 1.0 on the
    // early-exit path so their truncated denominator never reaches output;
    // this site has no override and would floor at 1/51 instead of 1/2000.
    paths: [
      { name: "full simulation", B: 1999, floor: floor(1, 1999), note: "gate did not fire" },
      { name: "S159d early exit", B: 50, floor: floor(1, 50), note: "NOT masked — no override; floor moves by a factor of 39" },
    ],
    measuredPath: "full simulation",
    expected: floor(1, 1999),
  },
  {
    id: "S19",
    module: "src/tests/benford.js",
    entry: "testBenford",
    site: "benford.js:79",
    construction: "pMAD = (madExceedCount + 1) / (N_SIM_BENFORD + 1)",
    c: 1,
    bSource: "constant",
    bExpr: "N_SIM_BENFORD = 5000 (benford.js:56)",
    paths: [{ name: "only path", B: 5000, floor: floor(1, 5000), note: null }],
    measuredPath: "only path",
    expected: floor(1, 5000),
  },
  {
    id: "S20",
    module: "src/tests/benford2.js",
    entry: "testBenford2",
    site: "benford2.js:117",
    construction: "pMAD = (madExceedCount + 1) / (N_SIM + 1)",
    c: 1,
    bSource: "constant",
    bExpr: "N_SIM = 5000 (benford2.js:88)",
    paths: [{ name: "only path", B: 5000, floor: floor(1, 5000), note: null }],
    measuredPath: "only path",
    expected: floor(1, 5000),
  },
  {
    id: "S22",
    module: "src/tests/entropyTest.js",
    entry: "testEntropy",
    site: "entropyTest.js:103",
    construction: "rawP = Math.min(1.0, Math.min(pLow, pHigh) * 2)",
    c: 2,
    bSource: "constant",
    bExpr: "B = 999 (entropyTest.js:37)",
    paths: [{ name: "only path", B: 999, floor: floor(2, 999), note: null }],
    measuredPath: "only path",
    expected: floor(2, 999),
  },
  {
    id: "S23",
    module: "src/tests/columnGof.js",
    entry: "testColumnGof",
    site: "columnGof.js:195",
    construction: "rawP = Math.min(1, Math.min(pLow, pHigh) * 2)",
    c: 2,
    bSource: "constant",
    bExpr: "B = 2000 (columnGof.js:48)",
    paths: [{ name: "only path", B: 2000, floor: floor(2, 2000), note: null }],
    measuredPath: "only path",
    expected: floor(2, 2000),
    // The worked example of what this manifest is for: columnGof.js:146 still
    // describes "the B=999 bootstrap" while the constant at :48 is 2000. No p
    // is wrong — nothing computes from the comment — but it is exactly the
    // drift a floor manifest catches.
    staleComment: "columnGof.js:146 says \"the B=999 bootstrap\"; the constant at :48 is 2000",
  },
];

/** Sites deliberately outside this manifest whose shape is recorded so the
 *  requirement is not lost when coverage extends. */
export const FORWARD_REQUIREMENTS = [
  {
    id: "S21",
    module: "src/tests/crossConditionConsistency.js",
    why: "shuffle null, not parametric — outside this manifest's seven",
    bSource: "row-rule",
    bExpr: "B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199 (crossConditionConsistency.js:167)",
    // Three arms, three floors, and the third cannot flag at all: 0.010 against
    // a strict `< 0.01` is false. Any entry for this site must carry all three.
    paths: [
      { name: "max(N_c) <= 1000", B: 999, floor: floor(2, 999) },
      { name: "max(N_c) <= 10000", B: 499, floor: floor(2, 499) },
      { name: "max(N_c) > 10000", B: 199, floor: floor(2, 199) },
    ],
    note: "third arm is arithmetically locked to LOW at any effect size",
  },
];

export const COVERAGE = { covered: DECLARATIONS.length, total: 23 };

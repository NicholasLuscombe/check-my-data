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

/* ── P105 — reachable tier sets, declared per test per branch ────────────────
 *
 * A floor says what the smallest p is. It does not say what the test can
 * therefore REPORT. Given a count, a sidedness and the comparison operator, the
 * set of tiers a test can possibly return is fixed arithmetic — and three tests
 * were already known to have HIGH out of reach on at least one branch with
 * nothing in the repository stating it. So a count can be changed, or a
 * correction applied, and a test can quietly lose a tier with no failing
 * assertion anywhere.
 *
 * THE SAME ONE RULE APPLIES. Every `reachable` array below is authored by hand
 * from the arithmetic, not read back from the code. The check derives the set
 * independently from the authored `c` and `B` using the SHIPPED thresholds and
 * comparator, and asserts the two agree. `sourceAnchor` is the other half: it
 * asserts the authored count expression is still the one in the module, so a
 * count that moves fails here rather than silently re-basing the arithmetic.
 *
 * Scope: only branches whose reachable set is a PROPER SUBSET of the ladder.
 * Where a test can return every tier on every branch a declaration adds noise
 * and no signal, so there is no entry — absence here means "full ladder", not
 * "unexamined". The full census is in the S360 part-three session record.
 *
 * Three arithmetic points that are easy to get wrong, all of them load-bearing:
 *
 *   1. The comparison is STRICT on both thresholds (`flagFromP`), so a floor
 *      landing exactly ON a threshold is excluded, not included. That single
 *      fact is why Cross-Condition Consistency cannot flag at all on its
 *      coarsest branch: its floor there is exactly 0.010.
 *
 *   2. Where a family minimum is multiplicity-adjusted, the floor is
 *      min over j of p_(j)·m/j, which at j = m returns the RAW floor. A family
 *      with every unit at the floor is not floored m times over, so the
 *      reachable set is set by the raw floor and not by the rank-1 form p_(1)·m.
 *
 *   3. A tier can arrive by promotion when it is out of reach from the test's
 *      own p. Each entry names the route, because the two fail differently: a
 *      direct route dies when the count changes, a promotion route dies when
 *      the sub-unit family's own floor crosses ALPHA.FLAG.
 *
 * `mechanism` says what fixes the floor, because they do not all come from a
 * resample count and a census that only looked at counts would miss two:
 *   'resample-floor' — c/(B+1) from a permutation or simulation denominator
 *   'p-clamp'        — a hardcoded minimum p (Modality, bootstrap retired)
 *   'tier-cap'       — an unbounded p with the top tier mapped away
 *   'overridden'     — the p is replaced by a constant on that path
 */

const LADDER = ["HIGH", "MODERATE", "LOW"];

export const REACHABLE_TIERS = [
  // ── Excess Kurtosis ──────────────────────────────────────────────────────
  // The effective denominator is simKurts.length, never N_SIM. The pilot gate
  // fires only when the observed statistic sits INSIDE the null body
  // (kurtosis.js:322, obsDev < pilotSimMAD × PILOT_GATE_FACTOR), so this branch
  // is a deliberate null shortcut rather than a detection hole: both pooled
  // arms are overridden to 1.0 at :341 and :352, and the per-condition
  // promotion arm cannot fire because its floor is 1/51.
  {
    test: "Excess Kurtosis", branch: "pilot early exit",
    selector: "b + 1 === N_PILOT && nC >= 4 && observed deviation inside the pilot null body",
    selectorSite: "kurtosis.js:314", countSite: "kurtosis.js:347",
    mechanism: "overridden", c: 1, B: 50, effectiveCount: "simKurts.length = 50",
    routes: { HIGH: null, MODERATE: null },
    reachable: ["LOW"],
    sourceAnchor: { file: "src/tests/kurtosis.js", text: "const N_PILOT = 50;" },
    note: "pooled p overridden to 1.0; promotion floor 1/51 = 0.0196 cannot clear ALPHA.FLAG",
  },

  // ── Blocked Mahalanobis ──────────────────────────────────────────────────
  // Not previously recorded anywhere: above 500 rows in the largest condition
  // the floor is exactly 0.001 and the strict comparison excludes it.
  {
    test: "Blocked Mahalanobis", branch: "largest condition over 500 rows",
    selector: "maxN = max rows across applicable window-sets",
    selectorSite: "blockedMahalanobis.js:509", countSite: "blockedMahalanobis.js:588",
    mechanism: "resample-floor", c: 1, B: 999, effectiveCount: "N_PERM = 999",
    routes: { HIGH: null, MODERATE: "direct" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/blockedMahalanobis.js", text: "const N_PERM = maxN <= 500 ? 4999 : 999;" },
  },

  // ── Constant-Offset Blocks — HIGH is out of reach on ALL THREE branches ───
  {
    test: "Constant-Offset Blocks", branch: "up to 1000 rows",
    selector: "whole-matrix row count nR", selectorSite: "constantOffset.js:173", countSite: "constantOffset.js:240",
    mechanism: "resample-floor", c: 1, B: 999, effectiveCount: "N_PERM = 999",
    routes: { HIGH: null, MODERATE: "direct; the per-pair promotion arm caps at MODERATE anyway" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/constantOffset.js", text: "const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;" },
  },
  {
    test: "Constant-Offset Blocks", branch: "1001 to 10000 rows",
    selector: "whole-matrix row count nR", selectorSite: "constantOffset.js:173", countSite: "constantOffset.js:240",
    mechanism: "resample-floor", c: 1, B: 499, effectiveCount: "N_PERM = 499",
    routes: { HIGH: null, MODERATE: "direct" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/constantOffset.js", text: "const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;" },
  },
  {
    test: "Constant-Offset Blocks", branch: "over 10000 rows",
    selector: "whole-matrix row count nR", selectorSite: "constantOffset.js:173", countSite: "constantOffset.js:240",
    mechanism: "resample-floor", c: 1, B: 199, effectiveCount: "N_PERM = 199",
    routes: { HIGH: null, MODERATE: "direct — one lattice point only, 0.005" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/constantOffset.js", text: "const N_PERM = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;" },
  },

  // ── Windowed Autocorrelation — HIGH out of reach on all three branches ────
  // The known instance, extended: the module's own comment at :183 records HIGH
  // as unreachable at N_PERM = 999 and says nothing about the other two.
  {
    test: "Windowed Autocorrelation", branch: "up to 500 rows",
    selector: "whole-matrix row count nR", selectorSite: "windowedAutocorrelation.js:87", countSite: "windowedAutocorrelation.js:140",
    mechanism: "resample-floor", c: 1, B: 999, effectiveCount: "N_PERM = 999",
    routes: { HIGH: null, MODERATE: "direct, off the per-pair BH minimum" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/windowedAutocorrelation.js", text: "const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;" },
  },
  {
    test: "Windowed Autocorrelation", branch: "501 to 5000 rows",
    selector: "whole-matrix row count nR", selectorSite: "windowedAutocorrelation.js:87", countSite: "windowedAutocorrelation.js:140",
    mechanism: "resample-floor", c: 1, B: 499, effectiveCount: "N_PERM = 499",
    routes: { HIGH: null, MODERATE: "direct" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/windowedAutocorrelation.js", text: "const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;" },
  },
  {
    test: "Windowed Autocorrelation", branch: "over 5000 rows",
    selector: "whole-matrix row count nR", selectorSite: "windowedAutocorrelation.js:87", countSite: "windowedAutocorrelation.js:140",
    mechanism: "resample-floor", c: 1, B: 199, effectiveCount: "N_PERM = 199",
    routes: { HIGH: null, MODERATE: "direct — one lattice point only, 0.005" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/windowedAutocorrelation.js", text: "const N_PERM = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;" },
  },

  // ── LOESS Residual Analysis ──────────────────────────────────────────────
  {
    test: "LOESS Residual Analysis", branch: "over 100 valid rows",
    selector: "validRows.length", selectorSite: "loessResidual.js:179", countSite: "loessResidual.js:213",
    mechanism: "resample-floor", c: 1, B: 499, effectiveCount: "N_PERM = 499",
    routes: { HIGH: null, MODERATE: "direct from either arm; the per-pair promotion arm caps at MODERATE and its own floor is 1/500" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/loessResidual.js", text: "const N_PERM = validRows.length <= 100 ? 4999 : 499;" },
  },

  // ── Regional Noise Homogeneity ───────────────────────────────────────────
  // Same shape as LOESS, same ladder, and not recorded anywhere before.
  {
    test: "Regional Noise Homogeneity", branch: "over 100 valid rows",
    selector: "validRows.length", selectorSite: "regionalNoise.js:148", countSite: "regionalNoise.js:173",
    mechanism: "resample-floor", c: 1, B: 499, effectiveCount: "N_PERM = 499",
    routes: { HIGH: null, MODERATE: "direct; the per-column promotion arm shares the floor so it cannot clear ALPHA.FLAG either" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/regionalNoise.js", text: "const N_PERM = validRows.length <= 100 ? 4999 : 499;" },
  },

  // ── Cross-Condition Consistency ──────────────────────────────────────────
  // The count is picked from FINITE CELLS in the largest condition, not rows,
  // so no row number states its limit and the selector is not the one the other
  // tests use. Doubled two-sided at :528, so c = 2 and every floor is twice
  // what a one-sided reading would give.
  {
    test: "Cross-Condition Consistency", branch: "largest condition up to 1000 cells",
    selector: "max over conditions of the finite-cell count", selectorSite: "crossConditionConsistency.js:142", countSite: "crossConditionConsistency.js:528",
    mechanism: "resample-floor", c: 2, B: 999, effectiveCount: "B = 999",
    routes: { HIGH: null, MODERATE: "direct, off the per-stage BH minimum with every unit at the floor" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/crossConditionConsistency.js", text: "const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;" },
  },
  {
    test: "Cross-Condition Consistency", branch: "largest condition 1001 to 10000 cells",
    selector: "max over conditions of the finite-cell count", selectorSite: "crossConditionConsistency.js:142", countSite: "crossConditionConsistency.js:528",
    mechanism: "resample-floor", c: 2, B: 499, effectiveCount: "B = 499",
    routes: { HIGH: null, MODERATE: "direct — one lattice point only, 0.004" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/crossConditionConsistency.js", text: "const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;" },
  },
  {
    test: "Cross-Condition Consistency", branch: "largest condition over 10000 cells",
    selector: "max over conditions of the finite-cell count", selectorSite: "crossConditionConsistency.js:142", countSite: "crossConditionConsistency.js:528",
    mechanism: "resample-floor", c: 2, B: 199, effectiveCount: "B = 199",
    routes: { HIGH: null, MODERATE: null },
    reachable: ["LOW"],
    note: "floor is exactly 0.010 and the comparison is strict — locked to LOW at any effect size",
    sourceAnchor: { file: "src/tests/crossConditionConsistency.js", text: "const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;" },
  },

  // ── Residual Spike Correlation ───────────────────────────────────────────
  // Single path, and the floor lands exactly on ALPHA.FLAG. Not recorded before.
  {
    test: "Residual Spike Correlation", branch: "only path",
    selector: "none — fixed constant", selectorSite: "residualSpikeCorrelation.js:113", countSite: "residualSpikeCorrelation.js:171",
    mechanism: "resample-floor", c: 1, B: 999, effectiveCount: "N_PERM = 999",
    routes: { HIGH: null, MODERATE: "direct" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/residualSpikeCorrelation.js", text: "const N_PERM = 999;" },
  },

  // ── Entropy / Zipf Analysis ──────────────────────────────────────────────
  // Doubled two-sided at :103, so the floor is 2/1000 rather than 1/1000.
  // Its sibling Column Goodness-of-Fit runs B = 2000 on the same construction
  // and does reach HIGH, at exactly one lattice point.
  {
    test: "Entropy / Zipf Analysis", branch: "only path",
    selector: "none — fixed constant", selectorSite: "entropyTest.js:37", countSite: "entropyTest.js:103",
    mechanism: "resample-floor", c: 2, B: 999, effectiveCount: "B = 999",
    routes: { HIGH: null, MODERATE: "direct, off the per-column BH minimum" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/entropyTest.js", text: "const B = 999; // bootstrap iterations" },
  },

  // ── Modality Test ────────────────────────────────────────────────────────
  // No resample count at all — the bootstrap was retired and replaced by an
  // analytic dip p with a hardcoded clamp that preserves the old floor. A
  // census that only read resample counts would not find this one.
  {
    test: "Modality Test", branch: "only path",
    selector: "none — fixed clamp", selectorSite: "modality.js:66", countSite: "modality.js:162",
    mechanism: "p-clamp", c: null, B: null, floor: 0.001, effectiveCount: "P_FLOOR = 0.001, bootstrap retired",
    routes: { HIGH: null, MODERATE: "direct, off the per-column BH minimum" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/modality.js", text: "const P_FLOOR = 0.001;" },
  },

  // ── Cross-Condition Rank Correlation ─────────────────────────────────────
  // Unbounded analytic p, so nothing arithmetic stops it — the top tier is
  // mapped away on purpose. Included because the reachable set is what a reader
  // needs, and it is a proper subset for a reason unrelated to any count.
  {
    test: "Cross-Condition Rank Correlation", branch: "only path",
    selector: "none — unconditional cap", selectorSite: "rankCorrelation.js:102", countSite: "rankCorrelation.js:103",
    mechanism: "tier-cap", c: null, B: null, capTo: "MODERATE", effectiveCount: "not applicable — analytic p",
    routes: { HIGH: null, MODERATE: "direct, or a capped HIGH arriving as MODERATE" },
    reachable: ["MODERATE", "LOW"],
    sourceAnchor: { file: "src/tests/rankCorrelation.js", text: 'const flagRankCap = {"HIGH":"MODERATE","MODERATE":"MODERATE","LOW":"LOW","N/A":"N/A"};' },
  },
];

export const REACHABLE_LADDER = LADDER;

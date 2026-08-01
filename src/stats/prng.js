/* ── Seeded PRNG ─────────────────────────────────────────────────
   Mulberry32: deterministic 32-bit PRNG. Seeded from data hash at analysis
   start so all simulation/permutation results are reproducible across runs.

   Factory pattern: createPRNG(matrix) returns an instance with encapsulated
   state — safe for concurrent Web Workers. Each instance has .random(),
   .randn(), and .shuffle() methods.

   Legacy exports (sRand, randn, seedRNG, shuffleArray) are retained as
   wrappers around a module-level instance for backward compatibility.

   @see METHODOLOGY.md §"Seeded Pseudorandom Number Generator"
   @module stats/prng */

// ── Matrix → seed hash (FNV-1a over EVERY value, two 32-bit lanes) ─
//
// S340. This used to stop at the first 500 non-null values, which made the seed
// a fingerprint of a file's opening rather than of the file. Twelve of the 27
// batch fixtures reached 500 values before their last row — DS16 and DS17 by
// row 28, DS11 by row 125 — so each hashed identically to a copy of itself with
// every row duplicated, and on DS11 and DS09 an edit to the last row could not
// move the seed at all. Two genuinely different files sharing an opening shared
// every draw the engine made.
//
// Not a statistical bias: under a permutation null one seed is as good as
// another, so a collision never skewed a p-value. It was a fingerprinting
// failure, and per-test derivation would have inherited it — every test's
// stream on both files, not just one.
//
// The walk now covers every non-null value and carries two independent lanes,
// so the derivation below has 64 bits to mix rather than 32. Cost is one extra
// multiply-xor per value on a walk that was already O(cells); measured at well
// under a millisecond on the tallest fixture.
function hashMatrix64(matrix) {
  let h1 = 0x9e3779b9;          // lane 1 — the pre-S340 basis and prime
  let h2 = 0x85ebca6b;          // lane 2 — different basis and prime, so the
  const buf = new ArrayBuffer(8); //          two lanes cannot move in lockstep
  const f64 = new Float64Array(buf);
  const dv = new DataView(buf);
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v == null) continue;
      f64[0] = v;
      const lo = dv.getInt32(0, true), hi = dv.getInt32(4, true);
      h1 = Math.imul(h1 ^ lo, 0x01000193);
      h1 = Math.imul(h1 ^ hi, 0x01000193);
      h2 = Math.imul(h2 ^ hi, 0x27220a95);
      h2 = Math.imul(h2 ^ lo, 0x27220a95);
    }
  }
  return { h1: h1 | 0, h2: h2 | 0 };
}

/** Backwards-compatible single-lane seed. Folds the two lanes together. */
function hashMatrix(matrix) {
  const { h1, h2 } = hashMatrix64(matrix);
  return fmix32(h1 ^ h2);
}

/** FNV-1a over a string — used to turn a test identifier into 32 bits. */
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h | 0;
}

/** Murmur3 finaliser. Avalanches the mixed seed so two test identifiers that
 *  hash to nearby values do not produce nearby streams. */
function fmix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h | 0;
}

// ── Factory: createPRNG(matrix) → { random, randn, shuffle } ─────
/** Create a self-contained PRNG instance seeded from the data matrix.
 *  @param {Array<Array<?number>>} matrix - Data matrix (FNV-1a hash over every value).
 *  @returns {{ random: () => number, randn: () => number, shuffle: (arr: any[]) => any[] }} */
export function createPRNG(matrix) {
  return createPRNGFromSeed(hashMatrix(matrix));
}

/** Instance from an explicit 32-bit seed. The generator itself, with no opinion
 *  about where the seed came from. */
function createPRNGFromSeed(seed) {
  let _state = seed | 0;
  let _bmSpare = null, _bmHas = false;

  /** Mulberry32 PRNG step. Returns a uniform float in [0, 1). */
  function random() {
    _state |= 0; _state = (_state + 0x6D2B79F5) | 0;
    let t = Math.imul(_state ^ (_state >>> 15), 1 | _state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Standard normal deviate via Box-Muller transform (seeded, deterministic). */
  function randn() {
    if (_bmHas) { _bmHas = false; return _bmSpare; }
    let u, v, s;
    do { u = random() * 2 - 1; v = random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const f = Math.sqrt(-2 * Math.log(s) / s);
    _bmSpare = v * f; _bmHas = true; return u * f;
  }

  /** Fisher-Yates shuffle (in-place, uses seeded random). Returns arr for chaining. */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { random, randn, shuffle };
}

// ── Factory of factories: one stream per test ─────────────────────
//
// S340. Before this, one instance was created per analysis run and shared by
// every test in dispatch order. That made a test's draws depend on which tests
// ran before it, and applicability decides which tests run. Two files with
// identical data in the columns Regional Noise reads got different Regional
// Noise p-values when Benford's applicability gate resolved differently between
// them — measured on DS08 at LOW → MODERATE, a whole tier.
//
// Each test now derives its own stream from the data hash and its own
// identifier, so nothing upstream can move it. The identifier is the test's
// DISPATCH-MAP KEY, not its result name: several tests carry one name where
// they are dispatched and another in their result, and the dispatch key is the
// string already load-bearing across the onboarding maps.
//
// RENAMING A DISPATCH KEY IS A STATISTICAL CHANGE UNDER THIS SCHEME — it
// reseeds that test on every file. See the onboarding checklist in CLAUDE.md.
//
// Instances are memoised per identifier, so a test that is invoked repeatedly
// within one run — once per condition through aggregatePerGroup, once per pair
// through runPairVST — keeps drawing from one advancing stream, exactly as it
// did before. Coupling between a test's own groups is preserved and owned by
// that test; coupling between different tests is gone.
/**
 * Create a per-test PRNG factory for one analysis run.
 * @param {Array<Array<?number>>} matrix - Data matrix; hashed over every value.
 * @returns {(testId: string) => { random: () => number, randn: () => number, shuffle: (arr: any[]) => any[] }}
 */
export function createPRNGFactory(matrix) {
  const { h1, h2 } = hashMatrix64(matrix);
  const cache = new Map();
  return function rngFor(testId) {
    const key = String(testId);
    let inst = cache.get(key);
    if (inst) return inst;
    const t = hashString(key);
    // Both data lanes contribute, and the test hash is mixed in twice through
    // different constants so neither the data nor the identifier can dominate.
    let s = h1 ^ Math.imul(t, 0x9e3779b1);
    s = (s ^ Math.imul(h2 ^ (t >>> 15), 0x85ebca6b)) | 0;
    inst = createPRNGFromSeed(fmix32(s));
    cache.set(key, inst);
    return inst;
  };
}

// ── Legacy module-scoped state (backward compatibility) ───────────
let _rngState = 0;

/** Mulberry32 PRNG step. Returns a uniform float in [0, 1).
 *  @deprecated Use createPRNG(matrix).random() for Web Worker safety.
 *  @returns {number} */
export function sRand() {
  _rngState |= 0; _rngState = (_rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(_rngState ^ (_rngState >>> 15), 1 | _rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

let _bmSpare = null, _bmHas = false;

/** Standard normal deviate via Box-Muller transform (seeded, deterministic).
 *  @deprecated Use createPRNG(matrix).randn() for Web Worker safety.
 *  @returns {number} N(0,1) sample */
export function randn() {
  if(_bmHas){ _bmHas=false; return _bmSpare; }
  let u, v, s;
  do { u=sRand()*2-1; v=sRand()*2-1; s=u*u+v*v; } while(s>=1||s===0);
  const f=Math.sqrt(-2*Math.log(s)/s);
  _bmSpare=v*f; _bmHas=true; return u*f;
}

/** Seed the PRNG from the data matrix (FNV-1a hash of first ≤500 values).
 *  @deprecated Use createPRNG(matrix) for Web Worker safety.
 *  @param {Array<Array<?number>>} matrix */
export function seedRNG(matrix) {
  _rngState = hashMatrix(matrix);
  _bmHas = false; _bmSpare = null; // reset Box-Muller state
}

/** Fisher-Yates shuffle (in-place, uses seeded sRand). Returns arr for chaining.
 *  @deprecated Use createPRNG(matrix).shuffle() for Web Worker safety. */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(sRand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

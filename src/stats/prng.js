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

// ── Matrix → seed hash (FNV-1a of first ≤500 values) ──────────────
function hashMatrix(matrix) {
  let h = 0x9e3779b9;
  let count = 0;
  for (let r = 0; r < matrix.length && count < 500; r++) {
    for (let c = 0; c < matrix[r].length && count < 500; c++) {
      const v = matrix[r][c];
      if (v != null) {
        // Float64 → two 32-bit ints via DataView
        const buf = new ArrayBuffer(8);
        new Float64Array(buf)[0] = v;
        const dv = new DataView(buf);
        h = (h ^ dv.getInt32(0, true)) * 0x01000193;
        h = (h ^ dv.getInt32(4, true)) * 0x01000193;
        count++;
      }
    }
  }
  return h | 0;
}

// ── Factory: createPRNG(matrix) → { random, randn, shuffle } ─────
/** Create a self-contained PRNG instance seeded from the data matrix.
 *  @param {Array<Array<?number>>} matrix - Data matrix (FNV-1a hash of first ≤500 values).
 *  @returns {{ random: () => number, randn: () => number, shuffle: (arr: any[]) => any[] }} */
export function createPRNG(matrix) {
  let _state = hashMatrix(matrix);
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

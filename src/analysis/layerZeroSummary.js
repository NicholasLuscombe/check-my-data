/* ── Layer 0 summary — brief algorithmic verdict for WHERE TO LOOK ──
   Counts flagged tests and maps to category-level plain-language phrases.
   1 category → single sentence.  2 → sentence with "and".  3+ → bullet list.
   No test names, no p-values. */

import { TEST_MECHANISM, MECHANISM_ORDER } from '../constants/mechanisms.js';

// Plain-language phrases per mechanism category — lowercase, combinable.
// Keys MUST match `MECHANISM_ORDER` in `mechanisms.js`:
//   copied · digits · shapes · replicate · group
// Prior key set {copied, digits, perfect, noise, uneven} was renamed upstream;
// `perfect` → `group`, `noise` → `replicate` carried their prior prose cleanly
// (same semantic meaning, renamed category). `shapes` (Entropy-only) prose
// landed in S105; the absent-key → dropped-category guard is kept defensively.
const CATEGORY_PHRASES = {
  copied:    "values repeat where each measurement should be unique",
  digits:    "digits don't follow the patterns expected from experimental measurements",
  shapes:    "the distribution of values within columns doesn't match real measurements",
  replicate: "the scatter between replicates doesn't look like natural measurement variation",
  group:     "results are more consistent than experiments typically produce",
};

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build the Layer 0 summary object.
 * @param {object[]} results — full test result array
 * @returns {{ count: number, phrases: string[] } | null}
 *   null when no tests are flagged. phrases are in MECHANISM_ORDER, capitalised.
 */
export function buildLayerZeroSummary(results) {
  const flagged = results.filter(r =>
    r.flag === "HIGH" || r.flag === "FLAGGED" || r.flag === "MODERATE" || r.flag === "NOTED"
  );
  if (!flagged.length) return null;

  // Collect categories that have at least one flagged test
  const activeCats = new Set();
  for (const r of flagged) {
    const cat = TEST_MECHANISM[r.name];
    if (cat) activeCats.add(cat);
  }

  // Order by MECHANISM_ORDER. Drop categories with no phrase yet authored
  // (e.g., `shapes`) rather than crashing — they simply don't appear in the
  // Layer 0 summary until Chat supplies prose.
  const phrases = MECHANISM_ORDER
    .filter(mk => activeCats.has(mk) && CATEGORY_PHRASES[mk])
    .map(mk => capitalize(CATEGORY_PHRASES[mk]));

  return { count: flagged.length, phrases };
}

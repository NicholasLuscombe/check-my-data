import { normalCDF, bhFDR } from "../stats/primitives.js";
import { flagFromP, flagRankOf, ALPHA } from "../constants/thresholds.js";
import { NA_CAUSE } from "../constants/naCause.js";

/* 17. Value-Frequency Spike Detection
   Detects specific integer values that occur far more often than their
   local neighbourhood predicts. Keyboard-entry patterns
   (adjacent numpad keys) show 3–5× exceedance over neighbours.
   Procedure: leave-one-out moving average of ±3 neighbours → Poisson test
   per value → BH-FDR correction.

   S114 digit-substring extension: a second pass operates on the
   fractional-digit substring of each cell (1.234 → "234", 5.07 → "07"),
   detecting fractional-template reuse across differing integer parts —
   a fabrication pattern the full-value pass misses because distinct
   integer parts produce distinct full-value observations. Both passes
   share one BH-FDR family (union of tested entries) so overall
   false-discovery control is preserved. */

// Minimum fraction of cells that must produce a non-null fractional-digit
// substring for the digit-substring pass (pass 2) to run. Below this, the
// data is mostly integer / non-fractional and pass 2 reports N/A. Set at
// 0.5 — a fabrication template in the fractional part only becomes
// detectable when at least half the cells carry a fractional substring.
const DIGIT_PASS_APPLICABILITY_FRAC = 0.5;

// ── Near-duplicate keep-gate (S308) ────────────────────────────────
// Pass 2's forensic purpose is near-duplicate detection: a fractional
// template that recurs where independent measurement would not produce
// it. A raw frequency spike is NOT sufficient — at low decimal precision
// the fractional keyspace (10^L) is small enough that pigeonhole
// collisions push benign tails well above their neighbour baseline
// (measured: C21 2dp `.54` obs 19 across 18 DISTINCT whole parts, a
// routine collision, not fabrication). A pass-2 spike is retained only
// when it clears one of two near-dup keep-paths:
//
//   CONCENTRATION — a single full value carries the majority of the
//     tail's count AND the tail is carried by only a few distinct full
//     values (a tight recurrence of one value; precision-independent, so
//     it catches 2dp near-dups like DS23/DS24's `23.51`×10). The
//     few-distinct clause is load-bearing: a round-number / zero heap
//     (C20's `0.00`×871, 30% of all cells) has a dominant value too, but
//     it is spread across a scatter of distinct round values (15 here) —
//     heaping, not a copy — and must NOT be kept.
//   DEPTH — the fractional keyspace is sparse enough that reaching the
//     near-dup floor is improbable under uniform occupancy, so a tail
//     shared across distinct whole parts is itself the signal (the deep
//     copy-paste template, e.g. C23 `.385732` across 2/6/15/1.*).
//
// A tail clearing NEITHER path is a precision collision, demoted to LOW.
// Replaces the S114 pass2MultiSpikeCleared count gate. See METHODOLOGY §3.5.

// Concentration keep-path threshold: the most-frequent full value behind a
// tail must account for at least this fraction of the tail's count for the
// spike to read as recurrence rather than diffuse collision. 0.5 = strict
// majority (one value carries more of the tail than all others combined).
// Anchors: DS23/DS24 recurrence 0.63–1.0 kept; C21/DS04 pigeonhole
// 0.11–0.25 dropped.
const NEAR_DUP_DOMINANCE = 0.5;

// Concentration keep-path, second clause: the tail must be carried by at
// most this many distinct full values. A copy-paste template lands on a
// handful of whole parts (anchors: DS23/DS24 recurrences 1–4 distinct;
// C23's deep template 4); a benign round/zero heap or a low-precision
// pigeonhole collision spreads across many (C20 15, C21/DS04 7–18). 5
// sits in the empirical gap (≤4 recurrence, ≥7 heap/collision).
const NEAR_DUP_MAX_DISTINCT = 5;

// Depth keep-path floor: the minimum shared-tail count that constitutes a
// near-dup. Matches the pass-2 sparse-region minimum-tested count (the
// obs ≥ 3 floor in poissonNeighbourScan). The depth test asks "is it
// improbable, under uniform occupancy of nCells over 10^L slots, for ANY
// tail to reach this floor?" — a pure property of decimal depth and cell
// count, independent of the (non-uniform) observed histogram. α is
// ALPHA.NOTE, the spike flag threshold. Anchors: 2dp buckets (keyspace
// 100) never clear; C23's 6dp keyspace (10^6, ~410 cells) clears at ~1e-5.
const NEAR_DUP_MIN_COUNT = 3;

/**
 * Poisson upper-tail P(X ≥ k | λ) for small integer k, used by the depth
 * keep-path. P(X ≥ k) = 1 − Σ_{j=0}^{k−1} e^{−λ} λ^j / j!.
 */
function poissonSurvivalAtLeast(k, lambda) {
  if (k <= 0) return 1;
  let term = Math.exp(-lambda); // j = 0
  let cum = term;
  for (let j = 1; j < k; j++) {
    term *= lambda / j;
    cum += term;
  }
  return Math.max(0, 1 - cum);
}

/**
 * Extracts the fractional-digit substring from a single cell. When a raw
 * string is supplied (from the import-preserved rawMatrix) leading AND
 * trailing zeros are preserved (1.07 → "07", 1.200 → "200"). For numeric
 * cells, JS Number parsing has already dropped trailing zeros, so this
 * falls back to String(cell).
 *
 * Non-finite values, null/undefined, and integer-rendered forms return
 * null (no fractional substring — the cell is skipped from pass 2).
 *
 * Exponent-notation strings ("1.2e-5") and any other non-digit-only
 * tails also return null.
 *
 * @param {string|number|null|undefined} cell
 * @returns {string|null}
 */
export function extractFractionalDigitSubstring(cell) {
  if (cell == null) return null;
  let str;
  if (typeof cell === "string") {
    str = cell;
  } else if (typeof cell === "number" && isFinite(cell)) {
    str = String(cell);
  } else {
    return null;
  }
  const dot = str.indexOf(".");
  if (dot < 0) return null;
  const frac = str.slice(dot + 1);
  if (frac.length === 0) return null;
  if (!/^\d+$/.test(frac)) return null;
  return frac;
}

// ── Poisson leave-one-out neighbour scan over an integer histogram.
//    Returns tested entries with raw Ps (BH-FDR applied by caller across
//    the union of pass-1 + pass-2 tested entries).
function poissonNeighbourScan(freq, distinctKeys, halfW, skipValue) {
  const vMin = distinctKeys[0];
  const vMax = distinctKeys[distinctKeys.length - 1];
  const tested = [];
  for (let v = vMin; v <= vMax; v++) {
    if (v === skipValue) continue;

    const obs = freq[v] || 0;

    const neighbours = [];
    for (let nb = v - halfW; nb <= v + halfW; nb++) {
      if (nb === v) continue;
      if (nb < vMin || nb > vMax) continue;
      neighbours.push(freq[nb] || 0);
    }
    if (neighbours.length < 2) continue;

    const smoothed = neighbours.reduce((s, x) => s + x, 0) / neighbours.length;
    // Sparse-region filter: skip truly sparse neighbourhoods unless the
    // observed count is itself ≥ 3 (a spike against near-zero background
    // is the strongest possible signal — preserve sensitivity).
    if (smoothed < 0.5 && obs < 3) continue;
    // Floor for Poisson stability.
    const lambda = Math.max(smoothed, 0.1);

    // Poisson survival: P(X ≥ obs | λ = lambda).
    let pValue;
    if (lambda > 30) {
      const z = (obs - lambda) / Math.sqrt(lambda);
      pValue = z > 0 ? (1 - normalCDF(z)) : 1;
    } else {
      if (obs <= 0) { pValue = 1; }
      else {
        let cumP = 0;
        let logP = -lambda;
        for (let k = 0; k < obs; k++) {
          cumP += Math.exp(logP);
          if (cumP >= 1 - 1e-15) { pValue = 0; break; }
          logP += Math.log(lambda) - Math.log(k + 1);
        }
        if (pValue === undefined) pValue = Math.max(0, 1 - cumP);
      }
    }

    const ratio = smoothed > 0 ? obs / smoothed : 0;
    tested.push({ value: v, obs, smoothed, ratio, rawP: pValue });
  }
  return tested;
}

// ── Distinct-key near-dup scan for depth-admitted deep buckets (S312). ──
//    poissonNeighbourScan iterates every integer in vMin…vMax (O(span)),
//    which the pass-2 `span > 10000` cap exists to avoid. This variant
//    iterates only the occupied tail keys — cost O(nDistinct·halfW) — so a
//    wide but depth-admitted bucket can be scanned without the O(span) blow-up
//    that made the span cap necessary. At deep precision the ±halfW
//    neighbourhood of an occupied key is empty by construction (no other tail
//    within a few integer units), so `smoothed` is ~0 and the scan reduces to
//    flagging any tail with obs ≥ 3 against an empty background — exactly the
//    surviving subset poissonNeighbourScan would produce on the same bucket,
//    minus the empty positions it filters out anyway. The Poisson/ratio maths
//    is identical; only the iteration set differs. Entries feed a SEPARATE
//    BH-FDR family (see testValueFrequencySpike) so pass 1's shared denominator
//    is untouched.
//    Deep-tail keys can exceed 2^53 (a 16- or 17-digit fractional substring),
//    where doubles are spaced two or more apart; the ±halfW neighbourhood is
//    therefore walked by a small integer offset rather than by incrementing the
//    key value directly, so the loop counter always advances and terminates.
function distinctKeyNearDupScan(freq, distinctKeys, halfW) {
  const vMin = distinctKeys[0];
  const vMax = distinctKeys[distinctKeys.length - 1];
  const tested = [];
  for (const v of distinctKeys) {
    const obs = freq[v] || 0;

    const neighbours = [];
    for (let d = -halfW; d <= halfW; d++) {
      if (d === 0) continue;
      const nb = v + d;
      if (nb < vMin || nb > vMax) continue;
      neighbours.push(freq[nb] || 0);
    }
    if (neighbours.length < 2) continue;

    const smoothed = neighbours.reduce((s, x) => s + x, 0) / neighbours.length;
    if (smoothed < 0.5 && obs < 3) continue;
    const lambda = Math.max(smoothed, 0.1);

    let pValue;
    if (lambda > 30) {
      const z = (obs - lambda) / Math.sqrt(lambda);
      pValue = z > 0 ? (1 - normalCDF(z)) : 1;
    } else {
      if (obs <= 0) { pValue = 1; }
      else {
        let cumP = 0;
        let logP = -lambda;
        for (let k = 0; k < obs; k++) {
          cumP += Math.exp(logP);
          if (cumP >= 1 - 1e-15) { pValue = 0; break; }
          logP += Math.log(lambda) - Math.log(k + 1);
        }
        if (pValue === undefined) pValue = Math.max(0, 1 - cumP);
      }
    }

    const ratio = smoothed > 0 ? obs / smoothed : 0;
    tested.push({ value: v, obs, smoothed, ratio, rawP: pValue });
  }
  return tested;
}

// ── Pass 1: full-value scan (integer histogram over entire matrix). ──
// Matches pre-S114 behaviour exactly; returns { tested, diag, na }.
// `na` is a description string when the applicability gate fails.
function buildFullValuePass(matrix) {
  const allVals = matrix.flat().filter(v => v != null && isFinite(v));
  const N = allVals.length;
  if (N < 100) {
    return { tested: [], diag: { nValues: N }, na: "Need ≥100 values for value-frequency spike detection.", naCause: NA_CAUSE.TOO_FEW_ROWS, naObserved: N, naMinimum: 100 };
  }

  const intVals = allVals.filter(v => Number.isInteger(v));
  const intFrac = intVals.length / N;
  if (intFrac < 0.8) {
    return {
      tested: [], diag: { nValues: N, intFrac: (intFrac * 100).toFixed(1) + "%" },
      na: "Not applicable — data is primarily non-integer. This test detects anomalous frequency spikes in integer value distributions.",
      naCause: NA_CAUSE.DATA_TYPE_MISMATCH
    };
  }

  const freq = {};
  for (const v of intVals) { freq[v] = (freq[v] || 0) + 1; }
  const distinctKeys = Object.keys(freq).map(Number).sort((a, b) => a - b);
  const nDistinct = distinctKeys.length;
  if (nDistinct < 20) {
    return {
      tested: [], diag: { nValues: intVals.length, nDistinct },
      na: `Only ${nDistinct} distinct integer values — need ≥20 for local smoothing to distinguish genuine spikes from expected variation on small scales.`,
      naCause: NA_CAUSE.TOO_FEW_DISTINCT, naObserved: nDistinct, naMinimum: 20
    };
  }

  const vMin = distinctKeys[0], vMax = distinctKeys[distinctKeys.length - 1];
  const span = vMax - vMin;
  if (span > 10000) {
    return {
      tested: [], diag: { nValues: intVals.length, nDistinct, span },
      na: `Integer range ${vMin}–${vMax} (span ${span}) is too wide for local frequency analysis. This test is designed for bounded integer scales.`,
      naCause: NA_CAUSE.RANGE_OUT_OF_BAND
    };
  }

  const halfW = span > 200 ? 5 : 3;
  const tested = poissonNeighbourScan(freq, distinctKeys, halfW, /*skipValue*/ 0);
  // Tag pass metadata for downstream reporting.
  for (const t of tested) { t.pass = "full"; }
  return { tested, diag: { nValues: intVals.length, nDistinct, halfW, span }, na: null, naCause: null };
}

// ── Pass 2: fractional-digit-substring scan. Bucketed by substring length. ──
// `rawMatrix` preserves trailing zeros from the source (parser.js); when
// absent, falls back to numeric rendering (trailing zeros lost).
function buildDigitSubstringPass(matrix, rawMatrix) {
  const nRows = matrix.length;
  const nCols = matrix[0]?.length || 0;
  const nCells = nRows * nCols;
  if (nCells === 0) {
    return { tested: [], diag: {}, na: "Empty matrix." };
  }

  // Extract per-cell fractional substring, tracking (row, col) for
  // downstream _spikeCells reconstruction.
  const fracCells = [];  // { row, col, str }
  for (let r = 0; r < nRows; r++) {
    const rawRow = rawMatrix ? rawMatrix[r] : null;
    const numRow = matrix[r];
    for (let c = 0; c < nCols; c++) {
      const rawCell = rawRow ? rawRow[c] : null;
      const numCell = numRow ? numRow[c] : null;
      const source = rawCell != null ? rawCell : numCell;
      if (source == null) continue;
      // Require the numeric cell is finite (otherwise this cell was
      // filtered out of the primary matrix — keep pass 2 in sync).
      if (typeof numCell !== "number" || !isFinite(numCell)) continue;
      const str = extractFractionalDigitSubstring(source);
      if (str == null) continue;
      fracCells.push({ row: r, col: c, str });
    }
  }

  const nFrac = fracCells.length;
  const fracFrac = nFrac / nCells;
  if (fracFrac < DIGIT_PASS_APPLICABILITY_FRAC) {
    return {
      tested: [], diag: { nFrac, nCells, fracFrac: (fracFrac * 100).toFixed(1) + "%" },
      na: `Not applicable — only ${(fracFrac * 100).toFixed(1)}% of cells carry a fractional-digit substring (need ≥${(DIGIT_PASS_APPLICABILITY_FRAC * 100).toFixed(0)}%). Digit-substring pass detects reuse of fractional-digit templates across differing integer parts; insufficient fractional content here.`
    };
  }

  // Group by substring length. For each length L, the histogram keyspace
  // is the parsed integer in [0, 10^L) — "07" → 7, "234" → 234.
  const byLength = new Map();
  for (const cell of fracCells) {
    const L = cell.str.length;
    if (!byLength.has(L)) byLength.set(L, []);
    byLength.get(L).push(cell);
  }

  const tested = [];
  // Depth-admitted deep buckets (span > 10000 but depthKeep true) are scanned
  // by distinct key and collected here, kept OUT of `tested` so the shared
  // union BH-FDR denominator (pass 1 + pass-2 non-deep) is unchanged (S312).
  const deepTested = [];
  const bucketDiag = [];
  for (const [L, cells] of [...byLength.entries()].sort((a, b) => a[0] - b[0])) {
    const freq = {};
    // Per key, track the multiplicity of each distinct full value so the
    // concentration keep-path can ask whether one value carries the tail.
    const valueDist = new Map(); // key → Map(fullValue → count)
    for (const cell of cells) {
      const key = parseInt(cell.str, 10);
      freq[key] = (freq[key] || 0) + 1;
      const fv = matrix[cell.row]?.[cell.col];
      let m = valueDist.get(key);
      if (!m) { m = new Map(); valueDist.set(key, m); }
      m.set(fv, (m.get(fv) || 0) + 1);
    }
    const distinctKeys = Object.keys(freq).map(Number).sort((a, b) => a - b);
    const nDistinct = distinctKeys.length;
    // Apply the same nDistinct ≥ 20 gate as pass 1: below that the
    // local-neighbour scan loses discriminating power.
    if (nDistinct < 20) {
      bucketDiag.push({ length: L, nCells: cells.length, nDistinct, skipped: "nDistinct<20" });
      continue;
    }
    const vMin = distinctKeys[0], vMax = distinctKeys[distinctKeys.length - 1];
    const span = vMax - vMin;
    // Depth keep-path (bucket-level, S308): is reaching the near-dup floor
    // improbable under uniform occupancy of nCells over the 10^L keyspace?
    // This is a pure function of 10^L and cells.length (independent of the
    // histogram), so it is evaluated ahead of the span gate (S312) to decide
    // whether a wide bucket is admitted for a distinct-key scan.
    const keyspace = Math.pow(10, L);
    const depthKeep =
      keyspace * poissonSurvivalAtLeast(NEAR_DUP_MIN_COUNT, cells.length / keyspace) < ALPHA.NOTE;
    const halfW = span > 200 ? 5 : 3;

    // Which BH family this bucket's entries join: the shared union (default)
    // or the separate deep subfamily (span-skipped-but-depth-admitted, S312).
    let bucketTested;
    let deepBucket = false;
    if (span > 10000) {
      if (!depthKeep) {
        // Wide and NOT depth-admitted: the O(span) dense scan is both a perf
        // blow-up (~10^6 iterations at 6 dp) and a model breakdown (the ±halfW
        // baseline is empty almost everywhere). Skip, as pass 1 does at :212.
        bucketDiag.push({ length: L, nCells: cells.length, nDistinct, span, depthKeep, skipped: "span>10000" });
        continue;
      }
      // Wide BUT depth-admitted (S312): scan only the occupied tail keys so the
      // O(span) loop never runs. This is the deep near-duplicate bucket the
      // S308 depth path was built to catch (e.g. C23's `.385732`); the span cap
      // was dropping it before the depth path could run. Its entries feed the
      // separate deep BH family so pass 1's shared denominator is untouched.
      bucketTested = distinctKeyNearDupScan(freq, distinctKeys, halfW);
      deepBucket = true;
    } else {
      // No skipValue for pass 2: "00", "000" etc. ARE forensically
      // interesting (repeat of a zero-fractional template).
      bucketTested = poissonNeighbourScan(freq, distinctKeys, halfW, /*skipValue*/ null);
    }

    const target = deepBucket ? deepTested : tested;
    for (const t of bucketTested) {
      t.pass = "digit";
      t.length = L;
      t.valueStr = String(t.value).padStart(L, "0");
      // Near-dup keep-path signals (S308), consumed at the spike-selection
      // site. domFrac = fraction of the tail's count carried by its single
      // most-frequent full value; nDistinctValues = how many distinct full
      // values share the tail (few = tight recurrence, many = heap /
      // collision); depthKeep = bucket-level sparsity improbability.
      const dist = valueDist.get(t.value);
      const domCount = dist ? Math.max(...dist.values()) : 0;
      t.domFrac = t.obs > 0 ? domCount / t.obs : 0;
      t.nDistinctValues = dist ? dist.size : 0;
      t.depthKeep = depthKeep;
      target.push(t);
    }
    bucketDiag.push({ length: L, nCells: cells.length, nDistinct, halfW, span, depthKeep, deepBucket, nTested: bucketTested.length });
  }

  if (tested.length === 0 && deepTested.length === 0) {
    return {
      tested: [], deepTested: [], diag: { nFrac, fracFrac: (fracFrac * 100).toFixed(1) + "%", buckets: bucketDiag },
      na: "No fractional-digit-substring bucket met the ≥20 distinct values / bounded-range gate."
    };
  }

  return {
    tested, deepTested, diag: { nFrac, fracFrac: (fracFrac * 100).toFixed(1) + "%", buckets: bucketDiag }, na: null
  };
}

/**
 * Detects values with abnormally high frequency relative to their local
 * neighbourhood. Dual-pass (S114): pass 1 over full integer values,
 * pass 2 over fractional-digit substrings (via rawMatrix when available
 * so trailing zeros are preserved). One shared BH-FDR family across both
 * passes; primaryP = min combined adj-P among spikes passing the
 * effect-size gate (ratio ≥ 2).
 *
 * @param {number[][]} matrix - 2D array of numeric values (rows × replicate columns).
 * @param {string[][]|null} [rawMatrix] - 2D raw-string matrix; preserves trailing zeros for pass 2.
 * @returns {object}
 * @see METHODOLOGY.md §"3.5 Value-Frequency Spike Detection"
 */
export function testValueFrequencySpike(matrix, rawMatrix = null) {
  const name = "Value-Frequency Spike";
  const category = "digit";

  const pass1 = buildFullValuePass(matrix);
  const pass2 = buildDigitSubstringPass(matrix, rawMatrix);

  // If both passes are inapplicable, report N/A with pass 1's reason
  // (most informative — mirrors pre-S114 single-pass N/A behaviour).
  if (pass1.na && pass2.na) {
    return {
      name, category, flag: "N/A",
      naCause: pass1.naCause,
      ...(pass1.naObserved !== undefined ? { naObserved: pass1.naObserved, naMinimum: pass1.naMinimum } : {}),
      nValues: pass1.diag.nValues ?? 0,
      description: pass1.na,
      pass1Status: pass1.na,
      pass2Status: pass2.na
    };
  }

  // Union BH-FDR across all tested entries from both passes.
  const allTested = [...pass1.tested, ...pass2.tested];
  const rawPs = allTested.map(t => t.rawP);
  const adjPs = bhFDR(rawPs);
  for (let i = 0; i < allTested.length; i++) { allTested[i].adjP = adjPs[i]; }

  // S312 — depth-admitted deep buckets (span-skipped by the pass-2 cap, but
  // deep enough that a shared tail is improbable) form their OWN BH-FDR family,
  // deliberately kept out of the shared union above. Folding them into `rawPs`
  // would move adj-P for every pass-1 and pass-2 entry — a full recalibration.
  // This separate correction leaves the shared denominator byte-for-byte intact
  // while still giving the deep-tail scan honest multiple-testing control.
  const deepTested = pass2.deepTested || [];
  const deepAdjPs = bhFDR(deepTested.map(t => t.rawP));
  for (let i = 0; i < deepTested.length; i++) { deepTested[i].adjP = deepAdjPs[i]; }

  // Identify spikes (adj-P < ALPHA.NOTE AND ratio ≥ 2) per pass.
  const pass1Spikes = allTested.filter(t => t.pass === "full" && t.adjP < ALPHA.NOTE && t.ratio >= 2.0);
  // Pass 2 additionally requires a near-dup keep-path (S308): a raw
  // frequency spike on a fractional tail is kept only when one full value
  // carries the majority of the tail AND few distinct values share it
  // (concentration — a tight recurrence), OR the 10^L keyspace is sparse
  // enough that the shared tail is improbable under uniform occupancy
  // (depth). A tail clearing neither is a low-precision pigeonhole
  // collision or a round/zero heap (many distinct whole parts, short tail).
  const isNearDup = t =>
    (t.domFrac >= NEAR_DUP_DOMINANCE && t.nDistinctValues <= NEAR_DUP_MAX_DISTINCT)
    || t.depthKeep === true;
  // Effect-size gate for pass 2: ratio ≥ 2, OR an isolated tail whose
  // neighbourhood is empty (smoothed === 0). poissonNeighbourScan codes
  // ratio = 0 when smoothed = 0 (obs/0 guard), but an isolated tail is the
  // MAXIMAL effect, not a null one — it is precisely the deep copy-paste
  // template the depth path targets (C23 `.385732`, neighbours absent).
  // Pass-1 selection keeps the strict ratio ≥ 2 gate (unchanged).
  const passesEffect = t => t.ratio >= 2.0 || t.smoothed === 0;
  const pass2SharedSpikes = allTested.filter(t =>
    t.pass === "digit" && t.adjP < ALPHA.NOTE && passesEffect(t) && isNearDup(t));
  // Deep-subfamily spikes (S312): same per-tail filter, corrected within the
  // separate deep BH family. These tails are depth-admitted by construction
  // (depthKeep true), so isNearDup clears via the depth path — the deep bucket
  // scan is the surfacing mechanism, the depth keep-path the discriminator.
  const pass2DeepSpikes = deepTested.filter(t =>
    t.adjP < ALPHA.NOTE && passesEffect(t) && isNearDup(t));
  const pass2Spikes = [...pass2SharedSpikes, ...pass2DeepSpikes];
  const allSpikes = [...pass1Spikes, ...pass2Spikes];
  allSpikes.sort((a, b) => a.adjP - b.adjP);

  const nSpikes = allSpikes.length;

  // Tier per pass from the (near-dup-gated) spikes. The S114 pass-2
  // multi-spike count gate is retired — the near-dup keep-path above now
  // carries the low-precision suppression, and it does so per-tail rather
  // than by raw spike count (which inverted at low precision, where
  // pigeonhole produces many simultaneous benign spikes). A single
  // surviving near-dup spike is a real detection. Final tier = max rank of
  // (pass-1 tier, pass-2 tier).
  const pass1BestP = pass1Spikes.length > 0 ? Math.min(...pass1Spikes.map(s => s.adjP)) : 1;
  const pass2BestP = pass2Spikes.length > 0 ? Math.min(...pass2Spikes.map(s => s.adjP)) : 1;
  const pass1Tier = pass1Spikes.length > 0 ? flagFromP(pass1BestP) : "LOW";
  const pass2Tier = pass2Spikes.length > 0 ? flagFromP(pass2BestP) : "LOW";
  const pass2SpikeCount = pass2Spikes.length;
  const flag = flagRankOf(pass1Tier) >= flagRankOf(pass2Tier) ? pass1Tier : pass2Tier;

  // S288 — per-unit drove-the-flag decision, written onto each spike here at
  // the flag-decision site (the near-dup keep-gate cannot be reconstructed
  // from the spike's adjP alone, so a gate-suppressed pass-2 spike otherwise
  // reads identically to a driving one). Tie on tier goes to pass 1, mirroring
  // the flag's own >= and the drivingPass assignment below. Report-only.
  const pass1Drove = pass1Tier !== "LOW" && flagRankOf(pass1Tier) >= flagRankOf(pass2Tier);
  const pass2Drove = pass2Tier !== "LOW" && flagRankOf(pass2Tier) > flagRankOf(pass1Tier);
  for (const s of pass1Spikes) s.droveVerdict = pass1Drove;
  for (const s of pass2Spikes) s.droveVerdict = pass2Drove;

  // Keyboard pattern detection (pass 1 only — the numpad-diagonal
  // heuristic is specific to integer-value spikes).
  let keyboardPattern = false;
  if (pass1Spikes.length >= 3) {
    const spikeVals = new Set(pass1Spikes.map(s => s.value));
    const kbSeq = [12, 23, 34, 45, 56, 67, 78, 89];
    const kbHits = kbSeq.filter(v => spikeVals.has(v));
    if (kbHits.length >= 3) keyboardPattern = true;
  }

  // Driving pass: whichever pass's tier wins the max-rank. Ties broken
  // toward pass 1 (its calibration is more mature). When neither pass
  // flagged, null.
  let drivingPass = null;
  if (flag !== "LOW") {
    if (flagRankOf(pass1Tier) >= flagRankOf(pass2Tier) && pass1Tier !== "LOW") drivingPass = "full";
    else if (pass2Tier !== "LOW") drivingPass = "digit";
  } else if (allSpikes.length > 0) {
    // LOW-tier context: driving pass reported for informational display.
    drivingPass = allSpikes[0].pass;
  }

  // Description summarises both passes.
  const descParts = [];
  const p1span = pass1.diag.halfW ? `±${pass1.diag.halfW}` : "±3";
  const nTestedP1 = pass1.tested.length;
  // Pass-2 count includes the separate deep-tail subfamily (S312) for honest
  // reporting; the two are corrected in separate BH families but are both
  // pass-2 tested entries.
  const nTestedP2 = pass2.tested.length + deepTested.length;
  if (!pass1.na) {
    descParts.push(`Pass 1 (full-value): Poisson leave-one-out ${p1span}-neighbour test over ${nTestedP1} integer values.`);
  } else {
    descParts.push(`Pass 1 (full-value): not applicable — ${pass1.na}`);
  }
  if (!pass2.na) {
    const bucketSummary = (pass2.diag.buckets || []).filter(b => b.nTested != null)
      .map(b => `${b.nTested} at ${b.length}-dp`).join(", ");
    descParts.push(`Pass 2 (fractional-digit substring): ${nTestedP2} values tested across ${bucketSummary || "no buckets"}.`);
  } else {
    descParts.push(`Pass 2 (fractional-digit substring): not applicable — ${pass2.na}`);
  }
  descParts.push(`Union BH-FDR across ${allTested.length} tested entries${deepTested.length ? ` (plus a separate ${deepTested.length}-entry deep-tail family)` : ""}; spikes require ratio ≥ 2.0.`);
  const desc = descParts.join(" ");

  // Interpretation text (Peer Review expand line). When the digit pass drives
  // the flag, the surviving spikes are near-duplicate candidates: the finding is
  // that a fractional-digit tail recurs more than independent measurement would
  // produce, which the reader must verify at source. The copy is framed as a
  // candidate to check, not a confirmed copy, because a deep tail carries no
  // information about its generator (a derived, quantized, or repeated-standard
  // column can reproduce it legitimately).
  //   The VFS near-dup framing is authored in THREE places, each at its own
  //   length: this fuller parenthetical form (Peer Review), the compact
  //   MiniCard_ValueFrequency lookFor / implications (Forensics), and the §4
  //   composer line (findingComposers.js). The shared generator triplet lives in
  //   VFS_NEARDUP_GENERATORS (mechanisms.js); the two compact surfaces import it,
  //   this fuller form spells it out. Move all three together when editing.
  let interp;
  if (flag !== "LOW" && nSpikes > 0) {
    const topSpikes = allSpikes.slice(0, 8).map(s => {
      if (s.pass === "digit") {
        return `.${s.valueStr} (${s.obs}× obs, ${s.smoothed.toFixed(1)} exp, ${s.ratio.toFixed(1)}×, digit pass)`;
      }
      return `${s.value} (${s.obs}× obs, ${s.smoothed.toFixed(1)} exp, ${s.ratio.toFixed(1)}×)`;
    });
    if (drivingPass === "digit") {
      interp = `${nSpikes} fractional-digit tail${nSpikes === 1 ? "" : "s"} recur${nSpikes === 1 ? "s" : ""} across the column: ${topSpikes.join(", ")}.`;
    } else {
      interp = `${nSpikes} value${nSpikes === 1 ? "" : "s"} with anomalous frequency: ${topSpikes.join(", ")}.`;
    }
    if (keyboardPattern) {
      interp += " Pattern includes adjacent-key values (numpad diagonal) — consistent with keyboard entry rather than instrument output.";
    }
    if (drivingPass === "digit") {
      interp += " The same fractional-digit tail recurs more often than independent measurement would produce. This is a near-duplicate candidate, not a confirmed copy — verify at source whether the column is derived (a computed or converted quantity), quantized (a fixed instrument resolution), or a repeated standard or control, any of which can reproduce a shared tail legitimately.";
    }
  } else {
    interp = `No anomalous value-frequency spikes detected. ${nTestedP1 + nTestedP2} entries tested (${nTestedP1} full-value + ${nTestedP2} digit), ${nSpikes} with BH-adjusted P < 0.01 and ratio ≥ 2.0.`;
  }

  // Details: top spikes combined across passes, tagged with pass.
  const details = allSpikes.slice(0, 15).map(s => ({
    value: s.pass === "digit" ? `.${s.valueStr}` : s.value,
    observed: s.obs,
    expected: s.smoothed.toFixed(1),
    ratio: s.ratio.toFixed(2) + "×",
    adjP: s.adjP < 1e-6 ? s.adjP.toExponential(2) : s.adjP.toFixed(6),
    pass: s.pass
  }));

  // _spikeCells for convergence / highlighting: unions pass-1 integer
  // matches and pass-2 fractional-substring matches.
  const pass1SpikeSet = new Set(pass1Spikes.map(s => s.value));
  const pass2SpikeKeys = new Set(pass2Spikes.map(s => `${s.length}|${s.valueStr}`));
  const _spikeCells = [];
  if (pass1SpikeSet.size > 0) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < (matrix[r]?.length || 0); c++) {
        const v = matrix[r][c];
        if (v != null && pass1SpikeSet.has(v)) {
          _spikeCells.push({ value: v, row: r, col: c, pass: "full" });
        }
      }
    }
  }
  if (pass2SpikeKeys.size > 0) {
    for (let r = 0; r < matrix.length; r++) {
      const rawRow = rawMatrix ? rawMatrix[r] : null;
      for (let c = 0; c < (matrix[r]?.length || 0); c++) {
        const v = matrix[r][c];
        if (v == null || !isFinite(v)) continue;
        const source = rawRow ? rawRow[c] : v;
        const str = extractFractionalDigitSubstring(source);
        if (str == null) continue;
        const key = `${str.length}|${str}`;
        if (pass2SpikeKeys.has(key)) {
          _spikeCells.push({ value: v, row: r, col: c, pass: "digit", fracStr: str });
        }
      }
    }
  }

  // _spikeValues for localization.js: report both passes so Layer 1B
  // gets the driving-pass values.
  const _spikeValues = allSpikes.map(s => ({
    value: s.pass === "digit" ? `.${s.valueStr}` : s.value,
    observed: s.obs,
    ratio: s.ratio,
    pass: s.pass
  }));

  // primaryP reflects the gated flag. pass2Spikes already excludes tails
  // that failed the near-dup keep-path, so pass2BestP is the post-gate
  // best (1 when no pass-2 spike survived); a suppressed collision can no
  // longer drive a MOD-range p alongside a LOW flag.
  const primaryP = Math.min(pass1BestP, pass2BestP);

  return {
    name, category, flag, description: desc,
    interpretation: interp,
    nValues: pass1.diag.nValues ?? 0,
    nDistinct: pass1.diag.nDistinct ?? 0,
    nTested: allTested.length + deepTested.length,
    nTestedPass1: nTestedP1,
    nTestedPass2: nTestedP2,
    nSpikes, nSpikesPass1: pass1Spikes.length, nSpikesPass2: pass2Spikes.length,
    pass2SpikeCount,
    drivingPass,
    keyboardPattern,
    smoothingWindow: pass1.diag.halfW ? `±${pass1.diag.halfW}` : null,
    bestAdjP: primaryP < 1e-6 ? primaryP.toExponential(2) : primaryP.toFixed(6),
    primaryP,
    pass1Status: pass1.na,
    pass2Status: pass2.na,
    pass2Diag: pass2.diag,
    _spikeValues,
    _spikeCells,
    // S288 — the full BH-FDR family (every tested value with its ratio + adjP +
    // pass), retained so a later per-unit strip has its cleared background.
    // Only the spike subset reaches `details`; the cleared entries live only
    // here. This is the family the verdict's p-values came from — it cannot be
    // re-derived from `details` (the BH adjustment ran over the whole union).
    // Report-only; spikes within it carry the `droveVerdict` boolean set above.
    // The deep-tail subfamily (S312), BH-corrected separately, is appended so a
    // per-unit strip sees its cleared background too.
    allTested: deepTested.length ? [...allTested, ...deepTested] : allTested,
    details
  };
}

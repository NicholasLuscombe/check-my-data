import { normalCDF, bhFDR } from "../stats/primitives.js";
import { flagFromP, flagRankOf, ALPHA } from "../constants/thresholds.js";

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

// ── Pass 1: full-value scan (integer histogram over entire matrix). ──
// Matches pre-S114 behaviour exactly; returns { tested, diag, na }.
// `na` is a description string when the applicability gate fails.
function buildFullValuePass(matrix) {
  const allVals = matrix.flat().filter(v => v != null && isFinite(v));
  const N = allVals.length;
  if (N < 100) {
    return { tested: [], diag: { nValues: N }, na: "Need ≥100 values for value-frequency spike detection." };
  }

  const intVals = allVals.filter(v => Number.isInteger(v));
  const intFrac = intVals.length / N;
  if (intFrac < 0.8) {
    return {
      tested: [], diag: { nValues: N, intFrac: (intFrac * 100).toFixed(1) + "%" },
      na: "Not applicable — data is primarily non-integer. This test detects anomalous frequency spikes in integer value distributions."
    };
  }

  const freq = {};
  for (const v of intVals) { freq[v] = (freq[v] || 0) + 1; }
  const distinctKeys = Object.keys(freq).map(Number).sort((a, b) => a - b);
  const nDistinct = distinctKeys.length;
  if (nDistinct < 20) {
    return {
      tested: [], diag: { nValues: intVals.length, nDistinct },
      na: `Only ${nDistinct} distinct integer values — need ≥20 for local smoothing to distinguish genuine spikes from expected variation on small scales.`
    };
  }

  const vMin = distinctKeys[0], vMax = distinctKeys[distinctKeys.length - 1];
  const span = vMax - vMin;
  if (span > 10000) {
    return {
      tested: [], diag: { nValues: intVals.length, nDistinct, span },
      na: `Integer range ${vMin}–${vMax} (span ${span}) is too wide for local frequency analysis. This test is designed for bounded integer scales.`
    };
  }

  const halfW = span > 200 ? 5 : 3;
  const tested = poissonNeighbourScan(freq, distinctKeys, halfW, /*skipValue*/ 0);
  // Tag pass metadata for downstream reporting.
  for (const t of tested) { t.pass = "full"; }
  return { tested, diag: { nValues: intVals.length, nDistinct, halfW, span }, na: null };
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
  const bucketDiag = [];
  for (const [L, cells] of [...byLength.entries()].sort((a, b) => a[0] - b[0])) {
    const freq = {};
    for (const cell of cells) {
      const key = parseInt(cell.str, 10);
      freq[key] = (freq[key] || 0) + 1;
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
    if (span > 10000) {
      bucketDiag.push({ length: L, nCells: cells.length, nDistinct, span, skipped: "span>10000" });
      continue;
    }
    const halfW = span > 200 ? 5 : 3;
    // No skipValue for pass 2: "00", "000" etc. ARE forensically
    // interesting (repeat of a zero-fractional template).
    const bucketTested = poissonNeighbourScan(freq, distinctKeys, halfW, /*skipValue*/ null);
    for (const t of bucketTested) {
      t.pass = "digit";
      t.length = L;
      t.valueStr = String(t.value).padStart(L, "0");
      tested.push(t);
    }
    bucketDiag.push({ length: L, nCells: cells.length, nDistinct, halfW, span, nTested: bucketTested.length });
  }

  if (tested.length === 0) {
    return {
      tested: [], diag: { nFrac, fracFrac: (fracFrac * 100).toFixed(1) + "%", buckets: bucketDiag },
      na: "No fractional-digit-substring bucket met the ≥20 distinct values / bounded-range gate."
    };
  }

  return {
    tested, diag: { nFrac, fracFrac: (fracFrac * 100).toFixed(1) + "%", buckets: bucketDiag }, na: null
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

  // Identify spikes (adj-P < ALPHA.NOTE AND ratio ≥ 2) per pass.
  const pass1Spikes = allTested.filter(t => t.pass === "full" && t.adjP < ALPHA.NOTE && t.ratio >= 2.0);
  const pass2Spikes = allTested.filter(t => t.pass === "digit" && t.adjP < ALPHA.NOTE && t.ratio >= 2.0);
  const allSpikes = [...pass1Spikes, ...pass2Spikes];
  allSpikes.sort((a, b) => a.adjP - b.adjP);

  const nSpikes = allSpikes.length;
  const bestSpikeP = nSpikes > 0 ? allSpikes[0].adjP : 1;

  // ── Pass-2 multi-spike gate (S114 Phase 2) ─────────────────────────
  // Clean large-N high-coverage data at fixed measurement precision
  // produces single-spike ratio≈2 FPs on pass 2 (see DS12a Phase 1
  // diagnostic). Require ≥ 2 ratio-passing pass-2 spikes to escalate
  // above LOW. Pass-1 tier is unaffected (its multi-spike calibration
  // was empirically settled pre-S114). Final tier = max rank of
  // (pass-1 tier, pass-2 capped tier).
  const pass1BestP = pass1Spikes.length > 0 ? Math.min(...pass1Spikes.map(s => s.adjP)) : 1;
  const pass2BestP = pass2Spikes.length > 0 ? Math.min(...pass2Spikes.map(s => s.adjP)) : 1;
  const pass1Tier = pass1Spikes.length > 0 ? flagFromP(pass1BestP) : "LOW";
  const pass2TierRaw = pass2Spikes.length > 0 ? flagFromP(pass2BestP) : "LOW";
  const pass2SpikeCount = pass2Spikes.length;
  const pass2MultiSpikeCleared = pass2SpikeCount >= 2;
  const pass2Tier = pass2MultiSpikeCleared ? pass2TierRaw : "LOW";
  const flag = flagRankOf(pass1Tier) >= flagRankOf(pass2Tier) ? pass1Tier : pass2Tier;

  // S288 — per-unit drove-the-flag decision, written onto each spike here at
  // the flag-decision site (the multi-spike gate cannot be reconstructed from
  // the spike's adjP alone, so a gate-suppressed pass-2 spike otherwise reads
  // identically to a driving one). Tie on tier goes to pass 1, mirroring the
  // flag's own >= and the drivingPass assignment below. Report-only.
  const pass1Drove = pass1Tier !== "LOW" && flagRankOf(pass1Tier) >= flagRankOf(pass2Tier);
  const pass2Drove = pass2MultiSpikeCleared && pass2Tier !== "LOW"
    && flagRankOf(pass2Tier) > flagRankOf(pass1Tier);
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
  const nTestedP2 = pass2.tested.length;
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
  descParts.push(`Union BH-FDR across ${allTested.length} tested entries; spikes require ratio ≥ 2.0.`);
  const desc = descParts.join(" ");

  // Interpretation text. When pass 2 drives the flag, add a plain-language
  // note on fractional-template reuse. Single-spike pass-2 survivors
  // (LOW tier, gate-degraded) are reported as informational only.
  let interp;
  if (flag !== "LOW" && nSpikes > 0) {
    const topSpikes = allSpikes.slice(0, 8).map(s => {
      if (s.pass === "digit") {
        return `.${s.valueStr} (${s.obs}× obs, ${s.smoothed.toFixed(1)} exp, ${s.ratio.toFixed(1)}×, digit pass)`;
      }
      return `${s.value} (${s.obs}× obs, ${s.smoothed.toFixed(1)} exp, ${s.ratio.toFixed(1)}×)`;
    });
    interp = `${nSpikes} value${nSpikes === 1 ? "" : "s"} with anomalous frequency: ${topSpikes.join(", ")}.`;
    if (keyboardPattern) {
      interp += " Pattern includes adjacent-key values (numpad diagonal) — consistent with keyboard entry rather than instrument output.";
    }
    if (drivingPass === "digit") {
      interp += " Fractional digit substring repeats across differing integer parts — consistent with template reuse (copy-paste of a decimal-digit pattern) rather than independent measurement.";
    }
  } else if (pass2SpikeCount === 1 && pass2TierRaw !== "LOW" && pass1Tier === "LOW") {
    // Pass-2 single spike gate-degraded to LOW (informational only).
    const s = pass2Spikes[0];
    interp = `Fractional digit patterns noted. One substring (.${s.valueStr}, ${s.obs}× obs vs ${s.smoothed.toFixed(1)} expected, ratio ${s.ratio.toFixed(1)}×) exceeds local expectation, but single-substring pass-2 evidence is informational — template-reuse fabrication typically produces multiple co-occurring digit spikes, not a lone deviation.`;
  } else {
    interp = `No anomalous value-frequency spikes detected. ${allTested.length} entries tested (${nTestedP1} full-value + ${nTestedP2} digit), ${nSpikes} with BH-adjusted P < 0.01 and ratio ≥ 2.0.`;
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

  // primaryP reflects the gated flag: when pass 2 is degraded to LOW
  // by the multi-spike gate, its single-spike adj-P must not drive
  // primaryP (which would report a MOD-range p alongside a LOW flag).
  // Rule: primaryP = min of pass-1 best and (pass-2 best if pass-2
  // cleared the gate, else 1). Parallels the kurtosis convention where
  // primaryP tracks the post-gate state.
  const primaryP = Math.min(pass1BestP, pass2MultiSpikeCleared ? pass2BestP : 1);

  return {
    name, category, flag, description: desc,
    interpretation: interp,
    nValues: pass1.diag.nValues ?? 0,
    nDistinct: pass1.diag.nDistinct ?? 0,
    nTested: allTested.length,
    nTestedPass1: nTestedP1,
    nTestedPass2: nTestedP2,
    nSpikes, nSpikesPass1: pass1Spikes.length, nSpikesPass2: pass2Spikes.length,
    pass2SpikeCount,
    pass2MultiSpikeCleared,
    pass2TierRaw,
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
    allTested,
    details
  };
}

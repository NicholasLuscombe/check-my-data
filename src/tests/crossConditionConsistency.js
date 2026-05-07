/* ══════════════════════════════════════════════════════════════════════
   CROSS-CONDITION CONSISTENCY — Track D framework test
   @see docs/shared/METHODOLOGY.md §1.9 Framework scaffolding + Stages 1/2/3

   One card, N properties, pairwise condition comparison, per-stage BH-FDR
   across (property × pair) units within one call. Two-sided permutation p
   per unit.

   Forensic-direction filtering (S97 Part B revision)
   --------------------------------------------------
   Each property declares `forensicDirections ⊆ ["similar", "different"]`.
   BH-FDR still runs over all running units within its stage, any direction
   — the statistical machinery is unchanged. But only units whose observed
   direction is in the property's forensicDirections set contribute to the
   test flag, amber highlighting, headline, and the "N additional" counts.
   For Stage 1 (location/scale/CDF properties), forensicDirections =
   ["similar"] only — real experimental conditions legitimately differ on
   span / MAD / CDF, so forensic evidence lives exclusively in the "too
   similar" tail. Stage 2 (residual-structure) and Stage 3 (structural-
   invariant) properties ship with both directions since their statistics
   are assay-intrinsic rather than biological.

   Per-stage BH families (S102 Option B, S103 Stage 3 extension)
   --------------------------------------------------------------
   Each stage runs a separate BH-FDR call. `primaryP` is the min across
   units that are forensic-direction + gate-passed + non-degenerate, taken
   over ALL THREE stages' adj-p values. Folding stages into a shared family
   reprises the Option A failure mode rejected at S102 (m growth dilutes
   single-pair signals below the B = 999 MOD ceiling; single-family m = 6
   regresses DS15 from adj-p 0.009 at m = 3 to 0.018 at m = 6).
   See METHODOLOGY §1.9 "Stage 2 BH denominator" + "Stage 3 BH family"
   + SESSION102-SUMMARY §3 + SESSION103-SUMMARY §2.4.

   Three property `kind` branches (S104)
   -------------------------------------
   Stage 1 properties are `kind: "pool"` and the driver feeds each
   condition's pre-sorted pooled-value array. Stage 2 properties are
   `kind: "residual"` and consume a residual bundle from the shared
   residual-computation helper. Stage 3 P9 is `kind: "mvslope"` and
   consumes a mean-variance bundle of per-tuple (logMean, logVar) pairs
   computed from ORIGINAL (pre-VST) values — P9 sets
   `useOriginalValues: true` because VST is designed to flatten the
   mean-variance slope. The active matrix remains the source for
   Stages 1/2 cells, reps, and residuals.

   Per-property applicability callback (Stage 3 framework extension)
   -----------------------------------------------------------------
   Stages 1 and 2 use shared framework-level gates: pooled-cell minN for
   Stage 1, condition-has-residuals + minN for Stage 2. Stage 3 introduces
   per-property applicability as an optional `applicable(bundle) →
   { applicable, reason? }` callback that the driver evaluates on each
   condition's bundle before the distance call. P9 uses it to enforce the
   "N_rows ≥ 50 with n_rep ≥ 3 AND log-row-mean span ≥ 1 OOM" floor;
   P7/P8 (deferred) plug in identically. See METHODOLOGY §1.9 Stage 3
   "Framework extension — per-property applicability".

   Stage 1 registers P1 Trimmed span, P2 Dispersion (MAD), P3 CDF/KS.
   Stage 2 registers P4 Residual SD, P5 Residual lag-1 AC, P6 Residual
   kurtosis. Stage 3 registers P9 Mean-variance slope (v1.0; P7/P8
   deferred). Further extensions plug into the registry in
   `crossConditionProperties.js` without touching this driver.

   Permutation unit (spec §"Permutation unit", decision D6)
   --------------------------------------------------------
   Row-based: each row is an indivisible unit that carries all its non-null
   cell values. Permutation shuffles condition tags across rows preserving
   per-condition row counts.

   The "row" is one row of the condition's slice.matrix. This unifies both
   layouts without a per-layout dispatch:
     - row-grouped (COND column): slice.matrix is the row-subset for that
       condition; each slice row is one full DATA row carrying its
       replicates.
     - column-grouped (groups / conditions-mode): slice.matrix is the
       column-subset for that group; each slice row is one subject's
       replicate tuple within that group. A subject that appears in
       multiple groups contributes one tuple per group — these are
       independent permutation units, same as under cell-based.

   Preserving intra-row cell pairings is required for Stage 2 residual
   properties (P4/P5/P6) when they land. At Stage 1 (pool-level
   location/scale/CDF properties) row-based and cell-based are equivalent
   null distributions when all rows carry the same cell count; when rows
   vary in length the two distributions differ marginally, but only at
   the 1/(B+1) resolution floor of the permutation p-value.
══════════════════════════════════════════════════════════════════════ */

import { bhFDR } from "../stats/primitives.js";
import { flagFromP, ALPHA } from "../constants/thresholds.js";
import { CROSS_COND_PROPERTIES } from "./crossConditionProperties.js";

const NAME = "Cross-Condition Consistency";
const CAT  = "group";

/**
 * @param {number[][]} matrix - Numeric matrix (rows × DATA columns). Active
 *   matrix — VST-transformed when VST is active. Stages 1/2 consume this.
 * @param {import('../analysis/conditionContext.js').ConditionContext|null} condCtx
 * @param {{ random: () => number }} rng - PRNG instance from engine.
 * @param {{ originalMatrix?: number[][], hasVST?: boolean }} [opts]
 *   `originalMatrix` is the pre-VST matrix used by `useOriginalValues`
 *   properties (P9 mean-variance slope). Defaults to `matrix` when omitted
 *   (no VST) — safe no-op for tests that lack Stage 3 properties.
 * @returns {{ name, category, flag, primaryP, B, nConditions, nPairs, nUnitsRan,
 *             nFlagged, nFlaggedPairs, top, details, conditionNames, conditionN }}
 */
export function testCrossConditionConsistency(matrix, condCtx, rng, opts = {}) {
  if (!condCtx || !condCtx.has || condCtx.count < 2) {
    return _na("Need ≥2 experimental conditions.");
  }
  const slices = condCtx.slices();
  if (!slices || slices.length < 2) {
    return _na("Need ≥2 conditions with data.");
  }

  // Pre-VST matrix source for properties with useOriginalValues=true
  // (P9 mean-variance slope). When VST is off, `originalMatrix === matrix`.
  // When omitted (legacy callers), fall back to the active matrix — any
  // useOriginalValues property becomes a no-op on VST'd data, but with
  // current registry that only affects P9 which needs the override to be
  // meaningful; legacy callers without Stage 3 properties are unaffected.
  const originalMatrix = opts.originalMatrix || matrix;
  const needsOriginalSlices = originalMatrix !== matrix;
  const originalSlices = needsOriginalSlices
    ? condCtx.withMatrix(originalMatrix).slices()
    : slices;

  // ── Per-condition pooled values ──────────────────────────────────────
  // Flatten each slice's sub-matrix to non-null values. For row-grouped, the
  // slice is a row subset (replicates = DATA cols). For column-grouped, the
  // slice is a column subset (condition = group). Either way, pooling
  // all non-null values is the correct input for Stage 1 properties.
  const conditionNames = slices.map(s => s.name);
  const conditionVals  = slices.map(s => {
    const out = [];
    for (const row of s.matrix) {
      for (const v of row) if (v != null && isFinite(v)) out.push(v);
    }
    return out;
  });
  const conditionN = conditionVals.map(v => v.length);

  // Stage 2 applicability per condition: at least one row with ≥2 non-null
  // cells (needed to produce any residuals at all). Spec §1.9 "Shared
  // residual computation" — "Requires n_rep ≥ 2 per condition; otherwise
  // Stage 2 properties are N/A for that condition."
  const condHasResiduals = slices.map(s =>
    s.matrix.some(row => {
      let nv = 0;
      for (const v of row) if (v != null && isFinite(v)) nv++;
      return nv >= 2;
    })
  );

  // A condition with < minOfAnyProp values can still be compared on properties
  // whose minN floor it clears. Drop conditions with < 2 values entirely.
  const keep = conditionN.map(n => n >= 2);
  const keptIdx = [];
  for (let i = 0; i < keep.length; i++) if (keep[i]) keptIdx.push(i);
  if (keptIdx.length < 2) {
    return _na("Need ≥2 conditions with ≥2 values each.");
  }

  // ── Permutation B scaling ────────────────────────────────────────────
  const maxN = Math.max(...conditionN);
  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;

  // ── Row-based permutation pool ───────────────────────────────────────
  // Each tuple = one row of a slice's matrix, reduced to its non-null cells
  // plus pre-computed row-centered residuals (shared residual computation
  // per §1.9 Stage 2) and a pre-VST (mean, variance) pair for P9 mvslope
  // (§1.9 Stage 3). Residuals and mv-pair depend only on the row's own
  // values — not on condition assignment — so they are computed once up
  // front and reused across permutations. `reps` carries the LOCAL column
  // index of each cell within its original slice row (0..slice.matrix[r]
  // .length − 1); rep identity is local to the tuple, not global to the
  // full matrix. For row-grouped this equals the DATA column index; for
  // column-grouped with uniform group widths it equals the local
  // column index within the group. Groups of different widths
  // share rep indices in [0, min width) and degrade gracefully at
  // higher reps.
  //
  // mvslope fields (logMean / logVar / mvslopeQual) are computed from the
  // ORIGINAL matrix (pre-VST) per property-level useOriginalValues flag —
  // VST is designed to flatten the mean-variance slope, so running P9
  // post-VST would return β ≈ 0 by construction. VST preserves null
  // structure so originalSlice[ci].matrix[r] aligns 1:1 with
  // slice[ci].matrix[r]; the rows filtered by conditionContext's
  // "≥1 non-null" predicate are the same row subset in both.
  //
  // Rows are ordered by source condition so positions [rowStart[k],
  // rowStart[k] + rowsPerCond[k]) belong to condition k pre-shuffle. Each
  // permutation is a Fisher-Yates on permRow[]; after shuffle, tuples at
  // positions in that range belong to pseudo-condition k (total cell count
  // per pseudo-condition varies when tuples differ in length).
  const tuples      = [];            // { cells, reps, residuals, df, logMean, logVar, mvslopeQual }
  const rowStart    = new Array(keptIdx.length);
  const rowsPerCond = new Array(keptIdx.length);
  let maxRep = 0;
  for (let k = 0; k < keptIdx.length; k++) {
    const ci = keptIdx[k];
    rowStart[k] = tuples.length;
    const activeRows = slices[ci].matrix;
    const origRows   = originalSlices[ci].matrix;
    for (let r = 0; r < activeRows.length; r++) {
      const row     = activeRows[r];
      const origRow = origRows[r];
      const cellsArr = [];
      const repsArr  = [];
      for (let ri = 0; ri < row.length; ri++) {
        const v = row[ri];
        if (v != null && isFinite(v)) { cellsArr.push(v); repsArr.push(ri); }
      }
      if (cellsArr.length === 0) continue;
      const cells = Float64Array.from(cellsArr);
      const reps  = Uint16Array.from(repsArr);
      let residuals, df;
      if (cells.length >= 2) {
        let mean = 0;
        for (let i = 0; i < cells.length; i++) mean += cells[i];
        mean /= cells.length;
        residuals = new Float64Array(cells.length);
        for (let i = 0; i < cells.length; i++) residuals[i] = cells[i] - mean;
        df = cells.length - 1;
        if (reps[reps.length - 1] > maxRep) maxRep = reps[reps.length - 1];
      } else {
        residuals = new Float64Array(0);
        df = 0;
      }
      // P9 per-tuple (logMean, logVar) from original (pre-VST) values.
      // Row-level exclusion: n_rep ≥ 3 at the same null positions AND
      // meanOrig > 0 AND varOrig > 0 (log undefined otherwise). Unbiased
      // sample variance (n-1 denominator).
      let logMean = NaN, logVar = NaN, mvslopeQual = false;
      if (origRow && reps.length >= 3) {
        let nOrig = 0, sum = 0;
        for (let i = 0; i < reps.length; i++) {
          const ov = origRow[reps[i]];
          if (ov != null && isFinite(ov)) { sum += ov; nOrig++; }
        }
        if (nOrig >= 3) {
          const meanOrig = sum / nOrig;
          if (meanOrig > 0) {
            let sumSq = 0;
            for (let i = 0; i < reps.length; i++) {
              const ov = origRow[reps[i]];
              if (ov != null && isFinite(ov)) {
                const d = ov - meanOrig;
                sumSq += d * d;
              }
            }
            const varOrig = sumSq / (nOrig - 1);
            if (varOrig > 0) {
              logMean = Math.log(meanOrig);
              logVar  = Math.log(varOrig);
              mvslopeQual = true;
            }
          }
        }
      }
      tuples.push({ cells, reps, residuals, df, logMean, logVar, mvslopeQual });
    }
    rowsPerCond[k] = tuples.length - rowStart[k];
  }
  const totalRows = tuples.length;
  const totalN    = keptIdx.reduce((s, i) => s + conditionN[i], 0);
  const nReps     = maxRep + 1;
  const permRow   = new Uint32Array(totalRows);
  for (let r = 0; r < totalRows; r++) permRow[r] = r;

  // ── Observed per-condition sorted arrays + residual bundles ──────────
  // Residual bundle per condition: { pool, poolLen, dfTotal, perRep,
  // perRepLens, nReps, nRow }. Built once from the observed (unshuffled)
  // tuples; reused for all residual-kind properties. Under permutation the
  // same structure is rebuilt per pseudo-condition (see permutation loop).
  const kCond = keptIdx.length;
  const properties = CROSS_COND_PROPERTIES;
  const nProp = properties.length;
  const hasResidualProp = properties.some(p => p.kind === "residual");
  const hasMvslopeProp  = properties.some(p => p.kind === "mvslope");

  const observedSorted = new Array(kCond);
  for (let k = 0; k < kCond; k++) {
    const ci = keptIdx[k];
    const sorted = Float64Array.from(conditionVals[ci]);
    sorted.sort();
    observedSorted[k] = sorted;
  }

  // Allocate reusable residual buffers (one set per pseudo-condition).
  // Sized to cover the worst-case: all residuals end up in one pseudo-cond.
  function allocResidualBundle() {
    const perRep = new Array(nReps);
    const perRepLens = new Uint32Array(nReps);
    for (let r = 0; r < nReps; r++) perRep[r] = new Float64Array(totalRows);
    return {
      pool: new Float64Array(totalN),
      poolLen: 0,
      dfTotal: 0,
      perRep,
      perRepLens,
      nReps,
      nRow: 0,
    };
  }
  const observedResidualBundles = hasResidualProp ? new Array(kCond) : null;
  const permResidualBundles     = hasResidualProp ? new Array(kCond) : null;
  if (hasResidualProp) {
    for (let k = 0; k < kCond; k++) {
      observedResidualBundles[k] = allocResidualBundle();
      permResidualBundles[k]     = allocResidualBundle();
    }
    for (let k = 0; k < kCond; k++) {
      const start = rowStart[k], end = start + rowsPerCond[k];
      const bundle = observedResidualBundles[k];
      fillResidualBundle(bundle, tuples, permRow, start, end);
    }
  }

  // Allocate reusable mv-slope buffers (one set per pseudo-condition).
  // Stage 3 P9 consumes { logMeans, logVars, len, logMeanSpan } built from
  // per-tuple pre-VST (logMean, logVar) pairs of qualifying rows (n_rep ≥ 3,
  // mean > 0, Var > 0 — row-level exclusion applied in tuple construction).
  function allocMvslopeBundle() {
    return {
      logMeans: new Float64Array(totalRows),
      logVars:  new Float64Array(totalRows),
      len: 0,
      logMeanSpan: 0,
    };
  }
  const observedMvslopeBundles = hasMvslopeProp ? new Array(kCond) : null;
  const permMvslopeBundles     = hasMvslopeProp ? new Array(kCond) : null;
  if (hasMvslopeProp) {
    for (let k = 0; k < kCond; k++) {
      observedMvslopeBundles[k] = allocMvslopeBundle();
      permMvslopeBundles[k]     = allocMvslopeBundle();
    }
    for (let k = 0; k < kCond; k++) {
      const start = rowStart[k], end = start + rowsPerCond[k];
      fillMvslopeBundle(observedMvslopeBundles[k], tuples, permRow, start, end);
    }
  }

  const observedStats = new Array(nProp);
  for (let p = 0; p < nProp; p++) {
    observedStats[p] = new Array(kCond);
    const prop = properties[p];
    for (let k = 0; k < kCond; k++) {
      if (prop.kind === "residual") {
        observedStats[p][k] = prop.statistic(observedResidualBundles[k]);
      } else if (prop.kind === "mvslope") {
        observedStats[p][k] = prop.statistic(observedMvslopeBundles[k]);
      } else {
        observedStats[p][k] = prop.statistic(observedSorted[k]);
      }
    }
  }

  // ── Enumerate (property × pair) units and classify applicability ─────
  // Each unit knows its propIdx, kept-condition indices a<b, observed distance,
  // applicability status (stage-specific), degenerate status, fallback status.
  //   - kind "pool"    : shared minN floor on pooled-cell count.
  //   - kind "residual": minN floor + both conditions must have ≥1 row
  //                      with n_rep ≥ 2 (residuals exist).
  //   - kind "mvslope" : per-property `applicable(bundle)` callback on each
  //                      condition's bundle (no shared minN floor; P9
  //                      enforces N_rows ≥ 50 AND log-mean span ≥ 1 OOM).
  //                      Future P7/P8 plug in via the same callback pattern.
  const units = [];
  for (let p = 0; p < nProp; p++) {
    const prop = properties[p];
    for (let a = 0; a < kCond; a++) {
      for (let b = a + 1; b < kCond; b++) {
        const Na = conditionN[keptIdx[a]], Nb = conditionN[keptIdx[b]];
        const nMin = Math.min(Na, Nb);
        // Stages 1/2: shared pooled-cell minN floor.
        if (prop.kind !== "mvslope" && prop.minN != null && nMin < prop.minN) {
          units.push({
            propIdx: p, a, b, ran: false, reason: `N per condition < ${prop.minN}`,
            nMin, degenerate: false, fallback: false,
          });
          continue;
        }
        // Stage 2 applicability: both conditions must have n_rep ≥ 2 on at
        // least one row (residuals exist). Covers non-replicate layouts
        // (conditions-mode single-column-per-cond, row-grouped with all
        // 1-cell rows) before the distance call.
        if (prop.kind === "residual") {
          if (!condHasResiduals[keptIdx[a]] || !condHasResiduals[keptIdx[b]]) {
            units.push({
              propIdx: p, a, b, ran: false,
              reason: "no row with n_rep ≥ 2 per condition",
              nMin, degenerate: false, fallback: false,
            });
            continue;
          }
        }
        // Stage 3 applicability: per-property callback on each condition's
        // bundle. Either condition failing → N/A with its reason. Runs on
        // the observed bundle; permutation re-uses the same applicability
        // decision (applicability is a property of the observed data, not
        // of any specific permutation).
        if (prop.kind === "mvslope" && typeof prop.applicable === "function") {
          const appA = prop.applicable(observedMvslopeBundles[a]);
          const appB = prop.applicable(observedMvslopeBundles[b]);
          if (!appA.applicable || !appB.applicable) {
            const reasonA = appA.reason ? `cond A: ${appA.reason}` : null;
            const reasonB = appB.reason ? `cond B: ${appB.reason}` : null;
            const combined = !appA.applicable && !appB.applicable
              ? (reasonA === reasonB ? appA.reason : `${reasonA}; ${reasonB}`)
              : (reasonA || reasonB || "applicable=false");
            units.push({
              propIdx: p, a, b, ran: false,
              reason: combined,
              nMin, degenerate: false, fallback: false,
            });
            continue;
          }
        }
        const dRes = prop.distance(observedStats[p][a], observedStats[p][b]);
        if (dRes.degenerate) {
          units.push({
            propIdx: p, a, b, ran: false, reason: dRes.reason || "degenerate",
            nMin, degenerate: true, fallback: false,
          });
          continue;
        }
        units.push({
          propIdx: p, a, b, ran: true, nMin,
          dObs: dRes.d, fallback: !!dRes.fallback,
          permDist: new Float64Array(B),
        });
      }
    }
  }
  const running = units.filter(u => u.ran);
  if (!running.length) {
    return _na(
      "No (property × pair) unit passed applicability gates. " +
      "At least one property needs two conditions with the minimum N per condition.",
    );
  }

  // ── Permutation loop ────────────────────────────────────────────────
  // Fisher–Yates shuffle permRow in-place per permutation. For each pseudo-
  // condition k, concat cells from the tuples now at positions
  // [rowStart[k], rowStart[k] + rowsPerCond[k]), sort, then feed each
  // property. Buffers sized to totalN (worst case: all cells in one cond).
  const permSortedBufs = new Array(kCond);
  const permSortedLens = new Uint32Array(kCond);
  for (let k = 0; k < kCond; k++) permSortedBufs[k] = new Float64Array(totalN);

  for (let perm = 0; perm < B; perm++) {
    // Fisher–Yates over rows
    for (let i = totalRows - 1; i > 0; i--) {
      const r = Math.floor(rng.random() * (i + 1));
      const tmp = permRow[i]; permRow[i] = permRow[r]; permRow[r] = tmp;
    }
    // Pool cells of rows assigned to each pseudo-condition (Stage 1 input)
    for (let k = 0; k < kCond; k++) {
      const buf = permSortedBufs[k];
      const start = rowStart[k], end = start + rowsPerCond[k];
      let pos = 0;
      for (let t = start; t < end; t++) {
        const tuple = tuples[permRow[t]];
        const cells = tuple.cells;
        for (let c = 0; c < cells.length; c++) buf[pos++] = cells[c];
      }
      permSortedLens[k] = pos;
      buf.subarray(0, pos).sort();
    }
    // Build residual bundle per pseudo-condition (Stage 2 input). Skipped
    // when no residual-kind property is registered (Stage 1-only builds).
    if (hasResidualProp) {
      for (let k = 0; k < kCond; k++) {
        const start = rowStart[k], end = start + rowsPerCond[k];
        fillResidualBundle(permResidualBundles[k], tuples, permRow, start, end);
      }
    }
    // Build mv-slope bundle per pseudo-condition (Stage 3 input). Skipped
    // when no mvslope-kind property is registered.
    if (hasMvslopeProp) {
      for (let k = 0; k < kCond; k++) {
        const start = rowStart[k], end = start + rowsPerCond[k];
        fillMvslopeBundle(permMvslopeBundles[k], tuples, permRow, start, end);
      }
    }
    // Per-property statistic on each pseudo-condition
    for (let p = 0; p < nProp; p++) {
      const prop = properties[p];
      const stats = new Array(kCond);
      if (prop.kind === "residual") {
        for (let k = 0; k < kCond; k++) {
          stats[k] = prop.statistic(permResidualBundles[k]);
        }
      } else if (prop.kind === "mvslope") {
        for (let k = 0; k < kCond; k++) {
          stats[k] = prop.statistic(permMvslopeBundles[k]);
        }
      } else {
        for (let k = 0; k < kCond; k++) {
          stats[k] = prop.statistic(permSortedBufs[k].subarray(0, permSortedLens[k]));
        }
      }
      // Fill d_perm for each running unit of this property
      for (const u of running) {
        if (u.propIdx !== p) continue;
        const dRes = prop.distance(stats[u.a], stats[u.b]);
        u.permDist[perm] = dRes.degenerate ? 0 : dRes.d;
      }
    }
  }

  // ── Two-sided p-value + direction tag ───────────────────────────────
  for (const u of running) {
    const perm = u.permDist;
    let nUpper = 0, nLower = 0;
    for (let k = 0; k < B; k++) {
      const d = perm[k];
      if (d >= u.dObs) nUpper++;
      if (d <= u.dObs) nLower++;
    }
    const pUpper = (1 + nUpper) / (B + 1);
    const pLower = (1 + nLower) / (B + 1);
    u.p2 = Math.min(1, 2 * Math.min(pUpper, pLower));
    // Median of permutation distribution — sort in place, then read middle.
    const sortedPerm = Array.from(perm).sort((a, b) => a - b);
    u.permMedian = _median(sortedPerm);
    u.direction = u.dObs <= u.permMedian ? "similar" : "different";
    // Drop the large permDist array — not needed downstream.
    delete u.permDist;
  }

  // ── BH-FDR per stage (Option B S102 + Stage 3 own-family S103) ───────
  // Three stages each run a separate BH-FDR call. `primaryP = min
  // effAdjP` over all three stages. Stage 3 carves its own family per the
  // S103 decision (see METHODOLOGY §1.9 "Stage 3 BH family"): folding
  // Stage 3 into Stage 2 would push single-pair groups from m = 3
  // (MOD reachable at adj-p 0.006) to m = 6 (LOW only at adj-p 0.012) —
  // the Option A failure mode rejected at S102. Own family preserves
  // each stage at m ≤ n_pairs × n_props_in_stage and MOD remains
  // reachable at single-pair groups.
  //
  // S102 calibration data (19-dataset batch) drove the per-stage split
  // for Stage 2 in the first place: single-family m = 6 regressed DS15
  // Stage 1 signal from adj-p 0.009 to 0.018 (tripping the MOD-
  // preservation stop condition). DS15's raw p ≈ 0.003 is above the
  // B = 999 permutation floor, so Option C (bump B to 1999) was ruled
  // out on arithmetic grounds. Stage 3 inherits the same pattern.
  //
  // Cost: loss of cross-stage multiplicity control (three independent
  // families). Accepted — cross-dimension convergence carries the
  // severity-3 bar, not intra-test FWER; semantically the three stages
  // measure distinct anomaly kinds (one-sided pool-level, two-sided
  // residual-structure, two-sided pool-level structural invariant) on
  // different transforms of the data.
  //
  // Forensic-direction filtering + gate still apply per unit; BH is only
  // what changes across options.
  const stage1Units = running.filter(u => properties[u.propIdx].kind === "pool");
  const stage2Units = running.filter(u => properties[u.propIdx].kind === "residual");
  const stage3Units = running.filter(u => properties[u.propIdx].kind === "mvslope");
  if (stage1Units.length) {
    const adj1 = bhFDR(stage1Units.map(u => u.p2));
    stage1Units.forEach((u, k) => { u.adjP = adj1[k]; u.stage = 1; });
  }
  if (stage2Units.length) {
    const adj2 = bhFDR(stage2Units.map(u => u.p2));
    stage2Units.forEach((u, k) => { u.adjP = adj2[k]; u.stage = 2; });
  }
  if (stage3Units.length) {
    const adj3 = bhFDR(stage3Units.map(u => u.p2));
    stage3Units.forEach((u, k) => { u.adjP = adj3[k]; u.stage = 3; });
  }
  running.forEach((u) => {
    // Effect-size gate: normally applies only when min(N_a, N_b) ≥ 500.
    // Direction-aware — for "different" an absolute `d_obs ≥ threshold` floor,
    // for "similar" a ratio `d_obs / permMedian ≤ R` ceiling (absolute floor
    // would demote the exact signal Stage 1 is designed to catch; see
    // crossConditionProperties.js header and TRACK-D-SPEC §Parked issues item 1,
    // S99 fix).
    //
    // Exception: properties with `gateAlwaysEvaluates: true` bypass the
    // nMin<500 auto-pass. P5 (S113 close-out) uses this because its different-
    // direction floor is a per-pair structural SE derived from Fisher-z + rep
    // averaging that scales automatically with N — no small-N guard rail
    // needed, the floor honestly reports non-resolvability at small N.
    //
    // Residual-kind properties receive observed residual bundles for both
    // conditions so per-pair structural metrics (n_rep_min, N_row_min for P5)
    // can be computed inside the gate.
    const prop = properties[u.propIdx];
    const gateArgs = { dObs: u.dObs, permMedian: u.permMedian, direction: u.direction };
    if (prop.kind === "residual") {
      gateArgs.bundleA = observedResidualBundles[u.a];
      gateArgs.bundleB = observedResidualBundles[u.b];
    }
    const alwaysEval = prop.gateAlwaysEvaluates === true;
    u.gatePassed = (alwaysEval || u.nMin >= 500)
      ? prop.effectSizeGate(gateArgs)
      : true;
    // Forensic-direction filter: a unit contributes to the test flag only
    // when its observed direction is declared forensically actionable for
    // its property. For Stage 1 all three properties use ["similar"] only
    // — location/scale/CDF differences between honest conditions are
    // expected biology, not fabrication evidence.
    u.forensic = prop.forensicDirections.includes(u.direction);
  });

  // ── Primary flag ────────────────────────────────────────────────────
  // primaryP = min adj-p across units that are forensic-direction AND
  // gate-passed AND not degenerate. Gate-failed / wrong-direction /
  // degenerate units are neutralised to 1.0 (no flag contribution).
  // Degenerate units are already excluded from `running` by construction.
  const effAdjPs = running.map(u => (u.gatePassed && u.forensic) ? u.adjP : 1);
  const primaryP = effAdjPs.length ? Math.min(...effAdjPs) : 1;
  const flag     = flagFromP(primaryP);

  // ── Pair-level / property-level flag counts ─────────────────────────
  // "N additional properties flagged across M pairs" counts only forensic-
  // direction units at the amber bar. Informational (wrong-direction) units
  // are omitted from these counts but remain in the evidence table.
  const flagged = running.filter(u => u.adjP < ALPHA.FLAG && u.gatePassed && u.forensic);
  const nFlagged = flagged.length;
  const flaggedPairKeys = new Set(flagged.map(u => `${u.a}-${u.b}`));
  const nFlaggedPairs = flaggedPairKeys.size;

  // ── Top unit for headline ───────────────────────────────────────────
  // Prefer a forensic-direction unit (that's what the primary flag rests
  // on). If no forensic-direction unit exists — no conditions, all
  // informational — fall back to null so the card headline emits the
  // "no forensically actionable anomalies" phrasing.
  const forensicRunning = running.filter(u => u.forensic);
  const topCandidates = forensicRunning.sort((a, b) => {
    if (a.adjP !== b.adjP) return a.adjP - b.adjP;
    return (b.gatePassed ? 1 : 0) - (a.gatePassed ? 1 : 0);
  });
  const top = topCandidates[0] || null;
  const topInfo = top ? {
    property: properties[top.propIdx].displayName,
    pair: `${conditionNames[keptIdx[top.a]]} vs ${conditionNames[keptIdx[top.b]]}`,
    direction: top.direction,
    adjP: top.adjP,
    gatePassed: top.gatePassed,
  } : null;

  // ── Build details for evidence table ────────────────────────────────
  // One row per (property × pair). Running units carry full numeric fields;
  // skipped units carry a reason and unit-flag = "N/A" or "degenerate".
  const details = units.map(u => {
    const prop = properties[u.propIdx];
    const pairLabel = `${conditionNames[keptIdx[u.a]]} vs ${conditionNames[keptIdx[u.b]]}`;
    if (!u.ran) {
      return {
        property: prop.displayName,
        pair: pairLabel,
        observed: "—",
        nullMedian: "—",
        direction: "—",
        adjP: null,
        unitFlag: u.degenerate ? "degenerate" : "N/A",
        reason: u.reason,
        nMin: u.nMin,
        ran: false,
        degenerate: !!u.degenerate,
        stage: prop.kind === "residual" ? 2 : prop.kind === "mvslope" ? 3 : 1,
      };
    }
    // Unit-level flag label:
    // - Forensic-direction + gate-passed + flag-level adj-p → HIGH / MODERATE
    // - Non-forensic-direction (any p-value) → "informational"
    // - Otherwise → LOW
    // Amber-contributing iff (HIGH or MODERATE) AND forensic AND gate-passed.
    const atFlag = u.adjP < ALPHA.FLAG;
    const atNote = u.adjP < ALPHA.NOTE;
    let unitFlag;
    if (!u.forensic) {
      unitFlag = "informational";
    } else if (atFlag && u.gatePassed) {
      unitFlag = "HIGH";
    } else if (atNote && u.gatePassed) {
      unitFlag = "MODERATE";
    } else {
      unitFlag = "LOW";
    }
    return {
      property: prop.displayName,
      pair: pairLabel,
      observed: _fmtStat(u.dObs),
      nullMedian: _fmtStat(u.permMedian),
      direction: u.direction,
      adjP: u.adjP,
      unitFlag,
      forensic: u.forensic,
      gatePassed: u.gatePassed,
      fallback: u.fallback,
      nMin: u.nMin,
      ran: true,
      stage: u.stage,
    };
  });

  return {
    name: NAME,
    category: CAT,
    flag,
    primaryP,
    description:
      "Compares condition pairs on a registered set of distribution " +
      "properties — Stage 1 pool-level (trimmed span, MAD, CDF shape, " +
      "similar-direction only), Stage 2 residual-structure (residual SD, " +
      "lag-1 AC, kurtosis, both directions forensic), and Stage 3 " +
      "structural invariants (mean-variance slope, both directions " +
      "forensic, pre-VST values). Two-sided permutation null with " +
      "per-stage BH-FDR across property × pair units within each stage; " +
      "only direction-forensic units contribute to the test flag.",
    bhM: running.length,
    bhMStage1: stage1Units.length,
    bhMStage2: stage2Units.length,
    bhMStage3: stage3Units.length,
    B,
    nConditions: kCond,
    nPairs: (kCond * (kCond - 1)) / 2,
    nProperties: nProp,
    nUnitsRan: running.length,
    nUnitsTotal: units.length,
    nFlagged,
    nFlaggedPairs,
    top: topInfo,
    conditionNames: keptIdx.map(i => conditionNames[i]),
    conditionN:     keptIdx.map(i => conditionN[i]),
    details,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────
function _na(reason) {
  return { name: NAME, category: CAT, flag: "N/A", description: reason };
}

/**
 * Fill a residual bundle for one pseudo-condition from the tuples currently
 * assigned to it. Shared residual computation per §1.9 Stage 2:
 *   - `pool` is the flat concatenation of all row-centered residuals, in
 *     the permuted row order of tuples in [start, end). Residuals were
 *     pre-computed per tuple (independent of condition assignment).
 *   - `perRep[rep]` is the row-ordered series of residuals at LOCAL rep
 *     position `rep`, used for P5 per-replicate lag-1 AC.
 *   - `dfTotal` is Σ_row (n_rep_row − 1) across contributing rows — the
 *     generalised denominator for P4 unbiased SD when rows have variable
 *     widths (nulls).
 *   - Rows with n_rep_row < 2 have empty residuals and contribute 0 df.
 */
function fillResidualBundle(bundle, tuples, permRow, start, end) {
  const pool = bundle.pool;
  const perRep = bundle.perRep;
  const perRepLens = bundle.perRepLens;
  const nReps = bundle.nReps;
  for (let r = 0; r < nReps; r++) perRepLens[r] = 0;
  let poolLen = 0;
  let dfTotal = 0;
  let nRow = 0;
  for (let t = start; t < end; t++) {
    const tuple = tuples[permRow[t]];
    const residuals = tuple.residuals;
    if (residuals.length === 0) continue;
    nRow++;
    dfTotal += tuple.df;
    const reps = tuple.reps;
    for (let i = 0; i < residuals.length; i++) {
      const rv = residuals[i];
      pool[poolLen++] = rv;
      const rep = reps[i];
      perRep[rep][perRepLens[rep]++] = rv;
    }
  }
  bundle.poolLen = poolLen;
  bundle.dfTotal = dfTotal;
  bundle.nRow = nRow;
}

/**
 * Fill an mv-slope bundle for one pseudo-condition from the tuples currently
 * assigned to it. Stage 3 P9 per §1.9 Stage 3.
 *   - Only qualifying tuples contribute (n_rep ≥ 3 AND mean > 0 AND Var > 0 on
 *     the ORIGINAL matrix; row-level degenerate exclusion was applied during
 *     tuple construction). logMean / logVar were pre-computed per tuple, so
 *     this fill is a simple filtered concatenation independent of active-
 *     matrix state.
 *   - `logMeanSpan = max(logMean) − min(logMean)` over contributing rows,
 *     used by P9's applicable() callback to enforce the ≥ 1 OOM floor (ln 10
 *     ≈ 2.303).
 */
function fillMvslopeBundle(bundle, tuples, permRow, start, end) {
  const logMeans = bundle.logMeans;
  const logVars  = bundle.logVars;
  let len = 0;
  let minLM = Infinity, maxLM = -Infinity;
  for (let t = start; t < end; t++) {
    const tuple = tuples[permRow[t]];
    if (!tuple.mvslopeQual) continue;
    const lm = tuple.logMean;
    logMeans[len] = lm;
    logVars[len]  = tuple.logVar;
    if (lm < minLM) minLM = lm;
    if (lm > maxLM) maxLM = lm;
    len++;
  }
  bundle.len = len;
  bundle.logMeanSpan = len > 0 ? (maxLM - minLM) : 0;
}

function _median(sorted) {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 ? sorted[(n - 1) / 2] : 0.5 * (sorted[n / 2 - 1] + sorted[n / 2]);
}

function _fmtStat(d) {
  if (d == null || !isFinite(d)) return "—";
  if (d === 0) return "0";
  const abs = Math.abs(d);
  if (abs < 1e-3 || abs >= 1000) return d.toExponential(2);
  return d.toPrecision(3);
}

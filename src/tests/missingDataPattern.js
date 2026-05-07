import { bhFDR, chiSquaredP, lnGamma } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

/* Missing Data Pattern Analysis
   Detects structured missingness indicating selective deletion or sloppy fabrication.
   Three sub-signals:
   (a) Pairwise column missingness association — Fisher's exact 2×2 per column pair
   (b) Condition × missingness — Fisher's exact or chi-squared per column
   (c) Block missingness scan — rectangular all-missing regions

   Combined flag: BH-FDR across all sub-signal p-values. Min adjusted p → flag.
   Gate: overall missing rate 1–50%, ≥10 missing cells, skip genomics, ≤50 DATA columns for (a). */
/**
 * Detects structured patterns in missing data that suggest selective deletion or fabrication.
 * @param {(number|null)[][]} matrix - Numeric matrix (nulls = missing).
 * @param {import('../analysis/conditionContext.js').ConditionContext} condCtx - Condition context (for sub-signal b).
 * @param {string} assay - Assay type.
 * @returns {{ name: string, category: string, flag: string, primaryP: number|null, nMissing: number, missRate: string, pairwiseHits: object[], condHits: object[], blockHits: object[] }}
 * @see METHODOLOGY.md §X.X (pending)
 */
export function testMissingDataPattern(matrix, condCtx, assay) {
  const NAME = "Missing Data Pattern";
  const CAT = "replicate"; // Cross-Replicate Comparisons (TEST_MECHANISM key — interim home per parked #9)

  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nR < 10 || nC < 2) return _na(NAME, CAT, "Insufficient data for missingness analysis.");

  // Build binary missingness matrix and per-column missing rates
  let nMissing = 0;
  const colMiss = new Float64Array(nC); // count of missing per column
  const miss = []; // miss[r][c] = true if missing
  for (let r = 0; r < nR; r++) {
    const row = new Uint8Array(nC);
    for (let c = 0; c < nC; c++) {
      if (matrix[r][c] === null || matrix[r][c] === undefined) {
        row[c] = 1;
        nMissing++;
        colMiss[c]++;
      }
    }
    miss.push(row);
  }

  const total = nR * nC;
  const missRate = nMissing / total;

  // Gates
  if (missRate < 0.01) return _na(NAME, CAT, `Missing rate ${(missRate * 100).toFixed(1)}% is below 1% threshold.`);
  if (missRate > 0.50) return _na(NAME, CAT, `Missing rate ${(missRate * 100).toFixed(1)}% exceeds 50% threshold.`);
  if (nMissing < 10) return _na(NAME, CAT, `Only ${nMissing} missing cells — too few for pattern analysis.`);
  if (assay === "genomics") return _na(NAME, CAT, "Not applicable to genomics data. Structured missingness from low-expression filtering is biologically expected.");

  const colMissRate = colMiss.map(c => c / nR);
  const allPs = []; // collect all sub-signal raw p-values

  // ── Sub-signal (a): Pairwise missingness association ──────────────
  const pairwiseHits = [];
  if (nC <= 50) {
    const pairPs = [];
    const pairInfo = [];
    for (let i = 0; i < nC - 1; i++) {
      for (let j = i + 1; j < nC; j++) {
        let a = 0, b = 0, c2 = 0, d = 0;
        for (let r = 0; r < nR; r++) {
          const mi = miss[r][i], mj = miss[r][j];
          if (mi && mj) a++;
          else if (mi) b++;
          else if (mj) c2++;
          else d++;
        }
        // Skip if either column has zero missing or all missing
        if ((a + b) === 0 || (a + c2) === 0) continue;
        const p = _fisherExact2x2(a, b, c2, d);
        pairPs.push(p);
        pairInfo.push({ cols: [i + 1, j + 1], bothMissing: a, iOnly: b, jOnly: c2, bothPresent: d, p });
      }
    }
    if (pairPs.length > 0) {
      const adjPs = bhFDR(pairPs);
      for (let k = 0; k < pairPs.length; k++) {
        pairInfo[k].adjP = adjPs[k];
        if (adjPs[k] < 0.05) pairwiseHits.push(pairInfo[k]);
      }
      allPs.push(...pairPs);
    }
  }

  // ── Sub-signal (b): Condition × missingness ───────────────────────
  const condHits = [];
  if (condCtx && condCtx.rowConditions) {
    const rc = condCtx.rowConditions;
    const condNames = condCtx.names;
    const condPs = [];
    const condInfo = [];

    for (let c = 0; c < nC; c++) {
      // Build contingency: condition × (missing/present)
      const counts = {};
      for (let r = 0; r < nR && r < rc.length; r++) {
        const cond = rc[r];
        if (!cond) continue;
        if (!counts[cond]) counts[cond] = { missing: 0, present: 0 };
        if (miss[r][c]) counts[cond].missing++;
        else counts[cond].present++;
      }

      const condList = Object.keys(counts);
      if (condList.length < 2) continue;
      // Skip column if no missing cells in any condition
      const anyMissing = condList.some(cn => counts[cn].missing > 0);
      if (!anyMissing) continue;

      let p;
      if (condList.length === 2) {
        const g0 = counts[condList[0]], g1 = counts[condList[1]];
        p = _fisherExact2x2(g0.missing, g0.present, g1.missing, g1.present);
      } else {
        const table = condList.map(cn => [counts[cn].missing, counts[cn].present]);
        p = _chiSquaredContingency(table);
      }
      condPs.push(p);
      condInfo.push({ col: c + 1, conditions: condList, counts, p });
    }

    if (condPs.length > 0) {
      const adjPs = bhFDR(condPs);
      for (let k = 0; k < condPs.length; k++) {
        condInfo[k].adjP = adjPs[k];
        if (adjPs[k] < 0.05) condHits.push(condInfo[k]);
      }
      allPs.push(...condPs);
    }
  }

  // ── Sub-signal (c): Block missingness scan ────────────────────────
  const blockHits = [];
  const blocks = _scanBlocks(miss, colMissRate, nR, nC);
  const blockPs = blocks.map(b => b.p);
  if (blockPs.length > 0) {
    const adjPs = bhFDR(blockPs);
    for (let k = 0; k < blocks.length; k++) {
      blocks[k].adjP = adjPs[k];
      if (adjPs[k] < 0.05) blockHits.push(blocks[k]);
    }
    allPs.push(...blockPs);
  }

  // ── Combined flag ─────────────────────────────────────────────────
  if (allPs.length === 0) return _na(NAME, CAT, "No testable missingness patterns found.");

  const combinedAdj = bhFDR(allPs);
  const minAdjP = Math.min(...combinedAdj);
  const flag = flagFromP(minAdjP);

  // Build summary details for the detail table
  const details = [];
  for (const h of pairwiseHits.slice(0, 5)) {
    details.push({ Signal: "Pairwise", Location: `Cols ${h.cols.join("+")}`, "Both missing": h.bothMissing, "adj P": h.adjP < 0.0001 ? "<0.0001" : h.adjP.toFixed(4) });
  }
  for (const h of condHits.slice(0, 5)) {
    const rates = h.conditions.map(cn => `${cn}: ${h.counts[cn].missing}/${h.counts[cn].missing + h.counts[cn].present}`).join(", ");
    details.push({ Signal: "Condition", Location: `Col ${h.col}`, Rates: rates, "adj P": h.adjP < 0.0001 ? "<0.0001" : h.adjP.toFixed(4) });
  }
  for (const h of blockHits.slice(0, 5)) {
    details.push({ Signal: "Block", Location: `Rows ${h.startRow}–${h.endRow}, Cols ${h.cols.join(",")}`, Size: `${h.height}×${h.width}`, "adj P": h.adjP < 0.0001 ? "<0.0001" : h.adjP.toFixed(4) });
  }

  // Build missingness heatmap data: per-column missing rate + per-row missing count
  const colMissRates = Array.from(colMissRate).map(r => +r.toFixed(4));
  const rowMissCounts = miss.map(row => row.reduce((s, v) => s + v, 0));

  return {
    name: NAME, category: CAT,
    description: "Maps the spatial distribution of missing values and checks whether they cluster in contiguous blocks, correlate between specific column pairs, or concentrate in one condition more than random missingness would predict (Fisher's exact and spatial clustering tests).",
    flag, primaryP: minAdjP,
    nMissing,
    missRate: (missRate * 100).toFixed(1) + "%",
    nPairwiseHits: pairwiseHits.length,
    nCondHits: condHits.length,
    nBlockHits: blockHits.length,
    pairwiseHits: pairwiseHits.slice(0, 10),
    condHits: condHits.slice(0, 10),
    blockHits: blockHits.slice(0, 5),
    details,
    colMissRates,
    rowMissCounts: rowMissCounts.length > 500
      ? rowMissCounts.filter((_, i) => i % Math.ceil(rowMissCounts.length / 500) === 0)
      : rowMissCounts,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function _na(name, cat, desc) {
  return { name, category: cat, flag: "N/A", primaryP: null, description: desc };
}

/** Fisher's exact test (two-sided) for 2×2 contingency table.
 *  Uses hypergeometric distribution via log-factorials. */
function _fisherExact2x2(a, b, c, d) {
  const n = a + b + c + d;
  if (n === 0) return 1;
  const logFact = x => lnGamma(x + 1);

  // Log of the hypergeometric normalization constant
  const logNorm = logFact(a + b) + logFact(c + d) + logFact(a + c) + logFact(b + d) - logFact(n);

  function logPtable(aa) {
    const bb = (a + b) - aa;
    const cc = (a + c) - aa;
    const dd = (b + d) - bb;
    if (bb < 0 || cc < 0 || dd < 0) return -Infinity;
    return logNorm - logFact(aa) - logFact(bb) - logFact(cc) - logFact(dd);
  }

  const observedLogP = logPtable(a);
  const minA = Math.max(0, (a + c) - (c + d));
  const maxA = Math.min(a + b, a + c);

  let pValue = 0;
  for (let aa = minA; aa <= maxA; aa++) {
    const lp = logPtable(aa);
    if (lp <= observedLogP + 1e-10) { // as extreme or more
      pValue += Math.exp(lp);
    }
  }
  return Math.min(1, Math.max(0, pValue));
}

/** Chi-squared test for r×2 contingency table (conditions × missing/present).
 *  table[i] = [missing_i, present_i]. */
function _chiSquaredContingency(table) {
  const nRows = table.length;
  const rowTotals = table.map(r => r[0] + r[1]);
  const colTotals = [0, 0];
  for (const r of table) { colTotals[0] += r[0]; colTotals[1] += r[1]; }
  const grand = colTotals[0] + colTotals[1];
  if (grand === 0) return 1;

  let chi2 = 0;
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < 2; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / grand;
      if (expected > 0) {
        chi2 += (table[i][j] - expected) ** 2 / expected;
      }
    }
  }
  const df = nRows - 1;
  return df > 0 ? chiSquaredP(chi2, df) : 1;
}

/** Scan for rectangular all-missing blocks (consecutive columns only).
 *  Returns top blocks sorted by p-value. */
function _scanBlocks(miss, colMissRate, nR, nC) {
  const blocks = [];

  // For each pair of start/end columns (consecutive spans, width ≥ 2)
  for (let cs = 0; cs < nC; cs++) {
    for (let ce = cs + 1; ce < nC; ce++) {
      const w = ce - cs + 1;

      // Scan rows for consecutive stretches where ALL columns cs..ce are missing
      let runStart = -1;
      for (let r = 0; r <= nR; r++) {
        let allMiss = r < nR;
        if (allMiss) {
          for (let c = cs; c <= ce; c++) {
            if (!miss[r][c]) { allMiss = false; break; }
          }
        }

        if (allMiss) {
          if (runStart === -1) runStart = r;
        } else if (runStart !== -1) {
          const h = r - runStart;
          if (h >= 2) { // minimum 2 rows
            const cols = [];
            for (let c = cs; c <= ce; c++) cols.push(c);

            // P under MCAR independence: Π(p_c^h) for each column in the block
            let logP = 0;
            for (const c of cols) {
              const p = Math.max(colMissRate[c], 1e-10);
              logP += h * Math.log(p);
            }
            // Bonferroni: (nR - h + 1) starting rows × (nC - w + 1) column positions
            const nPos = (nR - h + 1) * Math.max(1, nC - w + 1);
            const bonP = Math.min(1, Math.exp(logP) * nPos);

            blocks.push({
              startRow: runStart + 1,
              endRow: runStart + h,
              cols: cols.map(c => c + 1),
              height: h, width: w, area: h * w,
              p: bonP,
            });
          }
          runStart = -1;
        }
      }
    }
  }

  // Sort by p-value (most significant first), then dedupe nested sub-blocks.
  // The scan emits one block per (cs, ce) pair, so a single physical missing
  // region produces overlapping rectangles at every column width — counting
  // each as a distinct "block" misleads the user, who sees one outline.
  // Drop any block whose row range and column set are both fully contained
  // in an already-kept block.
  blocks.sort((a, b) => a.p - b.p);
  const kept = [];
  for (const b of blocks) {
    const bCols = new Set(b.cols);
    const dominated = kept.some(k => {
      if (k.startRow > b.startRow || k.endRow < b.endRow) return false;
      for (const c of bCols) if (!k.cols.includes(c)) return false;
      return true;
    });
    if (!dominated) kept.push(b);
    if (kept.length >= 20) break;
  }
  return kept;
}

import { flagFromP } from "../constants/thresholds.js";

/* Reason text for the size-ceiling exit below. Constant, with no row count
   interpolated, so two files that both cross the ceiling produce the same
   string and the display can collapse them into one stanza — the row count
   rides alongside on its own field instead. */
const SCAN_SKIPPED_REASON =
  "The sequence scan was skipped because this dataset is too large for it. " +
  "The scan's cost grows with rows, columns and offsets together, so it carries a size cap. " +
  "This is a limit of the scan, not a property of the data.";

/* §2.4 — Recurring value sequences. Per-column offset scan for a contiguous run
   of h ≥ 3 values in one column whose value sequence recurs lower in the SAME
   column at a fixed offset. Sibling of Exact Duplicate Detection's block-copy
   pass, but keyed on a single column so a coincidental second-column match at
   the same offset cannot sever the run (which the shared set-keyed Pass B
   enumeration would). Targets CORPUS-01's adhesive/pole removal sequences that
   Exact Duplicate Detection's own sub-tests miss. */
/**
 * Detects a contiguous run of distinct values in one column recurring at an offset.
 * Runs on the full analysis matrix (raw values, all rows × all data columns) — a
 * copy-paste ignores condition boundaries, so the scan is grouping-agnostic, and
 * the per-column null was measured on the whole column (S302). RAW input.
 * @param {number[][]} matrix - Full numeric matrix (rows × columns), null for missing.
 * @param {string} [assay] - Assay identifier (accepted for signature parity; unused).
 * @returns {{ name: string, category: string, flag: string, primaryP: number, sequences: object[] }}
 * @see docs/shared/V1X-FUTURE-WORK.md §2.4
 */
export function testSequentialDuplication(matrix, assay) {
  const nR = matrix.length, nC = matrix[0]?.length || 0;
  if (nR === 0 || nC === 0) {
    return { name: "Sequential Duplication", category: "copied", flag: "N/A",
      description: "No data." };
  }
  // Need at least a height-3 run plus a positive offset to have any opportunity.
  if (nR < 4) {
    return { name: "Sequential Duplication", category: "copied", flag: "N/A",
      description: "Too few rows for sequence detection (need at least 4)." };
  }

  const MIN_H = 3;                 // own height floor — the §2.4 N≥3 sequence
  const BLOCK_SCAN_LIMIT = 5000;   // mirror DupDet: skip the O(cols × offsets × rows) scan on huge tables
  // maxOffset — identical range for the scan AND the nOpp correction, so the
  // Bonferroni volume counts only opportunities the scan actually examines.
  const maxOffset = nR > 500 ? Math.min(nR - 1, 200) : nR - 1;

  if (nR > BLOCK_SCAN_LIMIT) {
    // Above the ceiling this test declines to look; it does not look and find
    // nothing. So it returns "N/A" with no primaryP, matching the two guards
    // above, rather than a LOW verdict a reader would take as a clean result.
    return { name: "Sequential Duplication", category: "copied", flag: "N/A",
      sequences: [], nSequences: 0,
      description: SCAN_SKIPPED_REASON,
      scanSkippedRows: nR, scanRowLimit: BLOCK_SCAN_LIMIT };
  }

  // Per-column empirical HHI over non-null values — P(two random positions in the
  // column carry the same value). This is the transferred per-position null term
  // (S302 measured it on the real CORPUS-01 column; self-inflation is negligible
  // for a distinct-value sequence in a near-unique column).
  const colHHI = new Array(nC).fill(1);
  for (let c = 0; c < nC; c++) {
    const freq = {};
    let n = 0;
    for (let r = 0; r < nR; r++) {
      const v = matrix[r]?.[c];
      if (v != null) { const k = v.toFixed(4); freq[k] = (freq[k] || 0) + 1; n++; }
    }
    if (n === 0) { colHHI[c] = 1; continue; }
    let h = 0;
    for (const cnt of Object.values(freq)) h += (cnt / n) ** 2;
    colHHI[c] = h;
  }

  // Bonferroni search volume — offsets × valid starting positions for a run of
  // height h. Depends only on h and the (capped) offset range, so precompute per h.
  // S327: the "precompute" the comment promised is now real. nR and maxOffset are
  // closure constants, so the result is a pure function of h — integer arithmetic,
  // no floating-point accumulation order to disturb. The cache returns the same
  // value the loop would have computed; it is a cache, not a change of formula.
  // Before this, the 200-iteration loop reran once per kept run: ~30 million inner
  // iterations on C14's Data sheet at 9,398 rows, for a handful of distinct h.
  const nOppCache = new Map();
  const nOppForHeight = (h) => {
    const hit = nOppCache.get(h);
    if (hit !== undefined) return hit;
    let nOpp = 0;
    for (let d = 1; d <= maxOffset; d++) nOpp += Math.max(0, nR - d - h + 1);
    const val = nOpp < 1 ? 1 : nOpp;
    nOppCache.set(h, val);
    return val;
  };

  const sequences = [];
  for (let c = 0; c < nC; c++) {
    const pRow = colHHI[c];
    for (let d = 1; d <= maxOffset; d++) {
      // Walk rows, extend maximal runs where col c matches itself at offset d.
      let runStart = -1;
      const closeRun = (endExcl) => {
        if (runStart < 0) return;
        const h = endExcl - runStart;
        if (h >= MIN_H) {
          // Mandatory distinct-value guard — a constant or near-constant run
          // (fewer than two distinct values) is the separately-banked freq/N
          // regime, not this one. Drop it; price nothing. Not left to the HHI
          // floor to suppress.
          const seen = new Set();
          for (let r = runStart; r < endExcl; r++) seen.add(matrix[r][c].toFixed(4));
          if (seen.size >= 2) {
            const pBlock = Math.pow(pRow, h);
            const pAdj = Math.min(1, pBlock * nOppForHeight(h));
            const values = [];
            for (let r = runStart; r < endExcl; r++) values.push(matrix[r][c]);
            sequences.push({
              col: c,
              srcRows: [runStart, endExcl - 1],
              dstRows: [runStart + d, endExcl - 1 + d],
              offset: d, height: h, values, pAdj,
            });
          }
        }
        runStart = -1;
      };
      for (let i = 0; i + d < nR; i++) {
        const a = matrix[i][c], b = matrix[i + d][c];
        const match = a != null && b != null && a === b;
        if (match) { if (runStart < 0) runStart = i; }
        else closeRun(i);
      }
      closeRun(nR - d);
    }
  }

  // Dominance dedup — drop a sequence whose src AND dst row ranges are both
  // contained within another kept sequence in the same column (a triple-repeat
  // surfaces the same content at several offsets; keep the maximal one).
  // S327 — bucketed by column. Only a same-column sequence can dominate, and the
  // old `.some()` over the whole kept array tested `big.col === s.col` first, so
  // every cross-column comparison was wasted work. Scanning one column's bucket
  // instead divides the quadratic by the column count. It does not remove it —
  // the work is still quadratic in the kept count WITHIN a column.
  //
  // Output identity. The old predicate is false for every different-column entry,
  // so `kept.some(col-guard && containment)` and `bucket.some(containment)` agree
  // for all input: the bucket holds exactly the kept same-column sequences, in the
  // same relative order. `.some()` yields a boolean, so which element matched
  // first never mattered. `kept` is still appended in one pass over the same sort,
  // so the returned array's order is unchanged too.
  sequences.sort((a, b) => (b.height - a.height) || (a.pAdj - b.pAdj));
  const kept = [];
  const keptByCol = new Map();
  for (const s of sequences) {
    let bucket = keptByCol.get(s.col);
    const dominated = bucket !== undefined && bucket.some(big =>
      big.srcRows[0] <= s.srcRows[0] && big.srcRows[1] >= s.srcRows[1] &&
      big.dstRows[0] <= s.dstRows[0] && big.dstRows[1] >= s.dstRows[1]);
    if (!dominated) {
      kept.push(s);
      if (bucket === undefined) { bucket = []; keptByCol.set(s.col, bucket); }
      bucket.push(s);
    }
  }

  // Strongest sequence drives the verdict — min pAdj, mirroring bestBlockP's
  // min-over-blocks. Column-count multiplicity is not separately corrected (the
  // block-copy precedent does not, and S302 measured MOD/HIGH under this pricing).
  kept.sort((a, b) => a.pAdj - b.pAdj);
  const primaryP = kept.length ? kept[0].pAdj : 1;
  const flag = flagFromP(primaryP);
  const top = kept[0] || null;

  const description = kept.length
    ? `${kept.length} recurring value sequence${kept.length !== 1 ? "s" : ""} — a run of ${top.height} values in one column recurs ${top.offset} row${top.offset !== 1 ? "s" : ""} later. Priced against the column's own value-repetition rate (HHI^h) over the offset search volume.`
    : "No recurring value sequences found.";

  return {
    name: "Sequential Duplication", category: "copied",
    description,
    flag, primaryP,
    nSequences: kept.length,
    topHeight: top ? top.height : 0,
    topOffset: top ? top.offset : 0,
    topCol: top ? top.col : null,
    sequences: kept.slice(0, 50),
  };
}

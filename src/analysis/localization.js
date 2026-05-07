/* ── Localization helpers ──────────────────────────────────────────────
   These extract row/column/cell positions from test results so the
   2D heatmap and flagged-regions table can highlight specific areas. */

import { MECHANISMS, MECHANISM_ORDER, TEST_MECHANISM } from "../constants/mechanisms.js";

/** For aggregated results, details live in subDetails; otherwise in details. */
export function resultDetails(r) {
  return r.groupsAssessed ? (r.subDetails || []) : (r.details || []);
}

/** Parse a "start–end" row-range string into [startInt, endInt]. Returns null on failure. */
export function parseRowRange(s) {
  const m = String(s).match(/(\d+)\s*[–-]\s*(\d+)/);
  return m ? [parseInt(m[1]), parseInt(m[2])] : null;
}

/** Extract windowed localization from Runs/IRC subDetails (identical logic for both). */
export function windowedRowLocs(r, mech, label) {
  const locs = [];
  for (const d of r.subDetails.filter(d => d.source === "window").slice(0, 3)) {
    if (d.startRow !== undefined && d.endRow !== undefined) {
      locs.push({ mechanism: mech, testName: r.name, flag: r.flag, type: "rowRange",
        rows: [d.startRow - 1, d.endRow - 1], label: `${label} rows ${d.startRow}–${d.endRow}` });
    } else if (d.rows) {
      const rng = parseRowRange(d.rows);
      if (rng) locs.push({ mechanism: mech, testName: r.name, flag: r.flag, type: "rowRange",
        rows: rng, label: `${label} rows ${rng[0]}–${rng[1]}` });
    }
  }
  return locs;
}

/** Scan matrix for cells matching a digit predicate. Used by digit-analysis localizations.
    digitExtractor(value) → digit (int) for each cell; predicate(digit) → boolean. */
export function findAnomalousCells(matrix, digitExtractor, predicate, cap = 5000) {
  const cells = [];
  for (let ri = 0; ri < matrix.length && cells.length < cap; ri++) {
    for (let ci = 0; ci < (matrix[ri]?.length || 0); ci++) {
      const v = matrix[ri][ci];
      if (v == null || typeof v !== 'number') continue;
      const d = digitExtractor(v);
      if (d !== null && predicate(d)) cells.push([ri, ci]);
    }
  }
  return cells;
}

/** Build the full localization array from test results for the 2D heatmap.
    Each entry: { mechanism, testName, flag, type, rows/cols/cells, label } */
export function extractLocalizations(results, nRows, nCols, matrix) {
  const locs = [];
  const push = (loc) => locs.push(loc);
  const base = (r, mech) => ({ mechanism: mech, testName: r.name, flag: r.flag });

  for (const r of results) {
    if (r.flag === "LOW" || r.flag === "N/A") continue;
    const mech = TEST_MECHANISM[r.name] || "noise";
    const B = base(r, mech);

    // ── Copied Values category ──
    if (r.name === "Exact Duplicate Detection") {
      // Block copies → two separate rectangular blocks (src and dst)
      if (r.blockCopies?.length) {
        for (const blk of r.blockCopies.slice(0, 10)) {
          push({ ...B, type: "block",
            rows: [blk.srcRows[0], blk.srcRows[1]],
            cols: blk.cols,
            label: `Block copy src: rows ${blk.srcRows[0]+1}–${blk.srcRows[1]+1}` });
          push({ ...B, type: "block",
            rows: [blk.dstRows[0], blk.dstRows[1]],
            cols: blk.cols,
            label: `Block copy dst: rows ${blk.dstRows[0]+1}–${blk.dstRows[1]+1}` });
        }
      }
      // Row dup groups → full-row localizations (these are genuine full-row matches)
      if (r.rowDupGroupList?.length) {
        const rows = [];
        for (const grp of r.rowDupGroupList) rows.push(...grp.rows);
        if (rows.length) push({ ...B, type: "rows", rows: [...new Set(rows)], label: `${rows.length} identical rows` });
      }
      // Within-row coincidences → cell-level on heatmap when manageable, cell-density when not
      if (r.withinRowLocs?.length) {
        const cells = [];
        const rowPairCounts = {};  // matRow → total coincidence pairs in this row
        const cellPositions = [];  // [matRow, matCol] for all involved cells
        for (const dup of r.withinRowLocs) {
          const matRow = (dup.row || 1) - 1;
          let rowN = 0;
          for (const g of (dup.groups || [])) {
            const np = g.cols.length * (g.cols.length - 1) / 2;
            rowN += np;
            for (const mc of g.cols) {
              cellPositions.push([matRow, mc]);
              if (cells.length <= 1000) cells.push([matRow, mc]);
            }
          }
          rowPairCounts[matRow] = (rowPairCounts[matRow] || 0) + rowN;
        }
        if (cells.length <= 1000) {
          push({ ...B, type: "cells", cells, label: `${cells.length} within-row coincidence cells` });
        } else {
          // Per-cell position, weighted by row's total coincidence pairs (sqrt scale)
          const maxP = Math.max(...Object.values(rowPairCounts));
          const cellWeights = {};
          for (const [r, c] of cellPositions) {
            const w = Math.sqrt((rowPairCounts[r] || 1) / maxP);
            const key = `${r},${c}`;
            cellWeights[key] = Math.max(cellWeights[key] || 0, w);
          }
          push({ ...B, type: "densityCells", cellWeights, label: `${cellPositions.length} cells with within-row coincidences` });
        }
      }
    }
    if (r.name === "Constant-Offset Blocks") {
      const src = resultDetails(r);
      const rows = [];
      for (const d of src) {
        if (d.positions) rows.push(...String(d.positions).split(/[–-]/).map(s => parseInt(s.trim()) - 1).filter(n => n >= 0));
      }
      if (rows.length) push({ ...B, type: "rows", rows: [...new Set(rows)], label: `${src.length} constant-offset blocks` });
    }
    if (r.name === "Residual Spike Correlation") {
      const rows = resultDetails(r).map(d => parseInt(d.row)).filter(n => !isNaN(n));
      if (rows.length) push({ ...B, type: "rows", rows: [...new Set(rows)], label: `${rows.length} coordinated spike rows` });
    }
    // ── Uneven Sections category ──
    if (r.name === "Row-Mean Runs" && r.bestWindowRows) {
      const rng = parseRowRange(r.bestWindowRows);
      if (rng) push({ ...B, type: "rowRange", rows: rng, label: `Row-mean runs anomaly rows ${rng[0]}–${rng[1]}` });
    }
    if (r.name === "LOESS Residual Analysis") {
      if (r.changepointRow) {
        const cp = parseInt(r.changepointRow);
        if (!isNaN(cp)) push({ ...B, type: "rowRange", rows: [Math.max(0, cp - 2), Math.min(nRows - 1, cp + 2)],
          label: `Changepoint at row ${cp} (${r.changepointDirection || ""})` });
      }
      if (r.bestWindowRows && r.bestWindowRows !== "—") {
        const rng = parseRowRange(r.bestWindowRows);
        if (rng) push({ ...B, type: "rowRange", rows: rng, label: `Anomalous window rows ${rng[0]}–${rng[1]} (ratio=${r.bestVarRatio})` });
      }
    }
    if (r.name === "Regional Noise Homogeneity" && r.bestWindowRows && r.bestWindowRows !== "—") {
      const rng = parseRowRange(r.bestWindowRows);
      if (rng) {
        const colIdx = r.bestAnomCol !== undefined ? [parseInt(r.bestAnomCol)] : undefined;
        push({ ...B, type: "block", rows: rng, cols: colIdx,
          label: `Rows ${rng[0]}–${rng[1]}${r.bestAnomCol !== undefined ? ` col ${r.bestAnomCol}` : ""} (ratio=${r.bestVarRatio})` });
      }
    }
    if (r.name === "Runs Test" && r.subDetails?.length) locs.push(...windowedRowLocs(r, mech, "Runs anomaly"));
    if (r.name === "Inter-Replicate Correlation" && r.subDetails?.length) locs.push(...windowedRowLocs(r, mech, "IRC anomaly"));

    // ── Unusual Digits category ──
    if (r.name === "Value-Frequency Spike" && r._spikeValues?.length) {
      push({ ...B, type: "values", values: r._spikeValues, label: `Spiked values: ${r._spikeValues.map(s => s.value).join(", ")}` });
    }
    if (r.name === "Selective Noise Partitioning" && r.colDetails?.length) {
      const maxCol = r.colDetails.reduce((best, d, i) => (!best || parseFloat(d.variance) > parseFloat(best.variance)) ? { ...d, idx: i } : best, null);
      const minCol = r.colDetails.reduce((best, d, i) => (!best || parseFloat(d.variance) < parseFloat(best.variance)) ? { ...d, idx: i } : best, null);
      if (maxCol && minCol && maxCol.idx !== minCol.idx) {
        push({ ...B, type: "columns", cols: [maxCol.idx, minCol.idx], label: `Max variance: col ${maxCol.idx}, Min: col ${minCol.idx} (ratio=${r.varianceRatio})` });
      }
    }

    // ── Digit-level cell localization (Terminal Digit, Benford 1st/2nd) ──
    if (r.name === "Terminal Digit Uniformity" && r.details?.length && matrix) {
      const expected = r.nValues / (r.trailingZeroWarning ? 9 : 10);
      const anomDigits = new Set(r.details.filter(d => d.observed > expected * 1.3 && d.digit !== 0).map(d => d.digit));
      if (anomDigits.size && anomDigits.size <= 4) {
        const cells = findAnomalousCells(matrix,
          v => { const s = Math.abs(v).toFixed(6).replace(/0+$/, '').replace(/\.$/, ''); return parseInt(s[s.length - 1]); },
          d => anomDigits.has(d));
        if (cells.length) push({ ...B, type: "cells", cells, label: `${cells.length} cells with over-represented digit${anomDigits.size>1?"s":""} ${[...anomDigits].join(",")}` });
      }
    }
    if (r.name === "Benford's Law (First Digit)" && r.details?.length && matrix) {
      const anomDigits = new Set(r.details.filter(d => parseFloat(d.expectedPct) > 0 && parseFloat(d.observedPct) / parseFloat(d.expectedPct) > 1.5).map(d => d.digit));
      if (anomDigits.size && anomDigits.size <= 3) {
        const cells = findAnomalousCells(matrix,
          v => v === 0 ? null : parseInt(String(Math.abs(v)).replace(/^0\.0*/, '')[0]),
          d => anomDigits.has(d));
        if (cells.length) push({ ...B, type: "cells", cells, label: `${cells.length} cells with over-represented leading digit${anomDigits.size>1?"s":""} ${[...anomDigits].join(",")}` });
      }
    }
    if (r.name === "Benford's Law (Second Digit)" && r.details?.length && matrix) {
      const anomDigits = new Set(r.details.filter(d => parseFloat(d.expectedPct) > 0 && parseFloat(d.observedPct) / parseFloat(d.expectedPct) > 1.5).map(d => d.digit));
      if (anomDigits.size && anomDigits.size <= 3) {
        const cells = findAnomalousCells(matrix,
          v => { if (v === 0) return null; const ds = String(Math.abs(v)).replace(/[^0-9]/g, '').replace(/^0+/, ''); return ds.length >= 2 ? parseInt(ds[1]) : null; },
          d => anomDigits.has(d));
        if (cells.length) push({ ...B, type: "cells", cells, label: `${cells.length} cells with over-represented second digit${anomDigits.size>1?"s":""} ${[...anomDigits].join(",")}` });
      }
    }

    // ── Too Perfect category ──
    if (r.name === "Mahalanobis Row Outlier") {
      const rows = resultDetails(r).map(d => parseInt(d.Row)).filter(n => !isNaN(n));
      if (rows.length) push({ ...B, type: "rows", rows, label: `${rows.length} outlier rows` });
    }
  }
  return locs;
}

/* Build mechanism group summaries for display */
export function buildMechanismGroups(results) {
  const groups = {};
  for (const mech of MECHANISM_ORDER) {
    groups[mech] = { ...MECHANISMS[mech], tests: [], highCount: 0, modCount: 0, maxFlag: "N/A" };
  }
  for (const r of results) {
    const mech = TEST_MECHANISM[r.name];
    if (!mech || !groups[mech]) continue;
    groups[mech].tests.push(r);
    if (r.flag === "HIGH") { groups[mech].highCount++; groups[mech].maxFlag = "HIGH"; }
    else if (r.flag === "MODERATE") { groups[mech].modCount++; if (groups[mech].maxFlag !== "HIGH") groups[mech].maxFlag = "MODERATE"; }
    else if (r.flag === "LOW" && groups[mech].maxFlag === "N/A") groups[mech].maxFlag = "LOW";
  }
  return groups;
}

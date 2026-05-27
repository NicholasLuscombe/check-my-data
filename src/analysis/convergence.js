// ── Convergence Layer ────────────────────────────────────────────────
// Cell-level flag accumulation from test results + hotspot detection.
// See INVESTIGATION-DISPLAY-SPEC.md v3.0 §Convergence Layer.
// See docs/LOCALISATION-AUDIT.md for per-test output format reference.

import { FLAG_RANK, ALPHA } from '../constants/thresholds.js';
import { TEST_MECHANISM } from '../constants/mechanisms.js';

// ── Helpers ──────────────────────────────────────────────────────────

const cellKey = (r, c) => `${r},${c}`;
const parseKey = (k) => { const p = k.split(','); return [parseInt(p[0]), parseInt(p[1])]; };

/** Parse "12–15" or "12-15" → [11, 12, 13, 14] (1-based → 0-based range) */
function parseRowRange(s) {
  const m = String(s).match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (!m) return [];
  const start = parseInt(m[1]) - 1, end = parseInt(m[2]) - 1;
  const rows = [];
  for (let r = start; r <= end; r++) rows.push(r);
  return rows;
}

/** Parse pair string "1–2" → [0, 1] (1-based → 0-based col indices) */
function parsePairCols(s) {
  const m = String(s).match(/(\d+)\s*[–\-]\s*(\d+)/);
  return m ? [parseInt(m[1]) - 1, parseInt(m[2]) - 1] : [];
}

/** Helper: get subDetails for aggregated results, details for non-aggregated */
function resultDetails(r) {
  return r.groupsAssessed ? (r.subDetails || []) : (r.details || []);
}

// ── extractCellFlags ─────────────────────────────────────────────────
// Extracts flagged cell regions from a single test result.
// Returns Array<{ rows: number[]|null, cols: number[]|null }>
// rows/cols are 0-based. null means "all rows" or "all columns".

export function extractCellFlags(result, nRows, nCols) {
  const name = result.name;
  const flag = result.flag;
  // Only extract from flagged results (MODERATE or HIGH)
  if (!flag || flag === 'LOW' || flag === 'N/A' || flag === 'ERROR') return [];

  const regions = [];
  const push = (rows, cols) => regions.push({ rows, cols });

  // ── Copied Values category ──

  if (name === 'Exact Duplicate Detection') {
    // Block copies → src and dst rectangles
    if (result.blockCopies?.length) {
      for (const blk of result.blockCopies) {
        const expandRows = (range) => {
          const rows = [];
          for (let r = range[0]; r <= range[1]; r++) rows.push(r);
          return rows;
        };
        push(expandRows(blk.srcRows), blk.cols || null);
        push(expandRows(blk.dstRows), blk.cols || null);
      }
    }
    // Row duplicate groups → full rows (0-based)
    if (result.rowDupGroupList?.length) {
      const rows = [];
      for (const grp of result.rowDupGroupList) rows.push(...grp.rows);
      if (rows.length) push([...new Set(rows)], null);
    }
    // Within-row coincidences (row is 1-based in result)
    if (result.withinRowLocs?.length) {
      for (const dup of result.withinRowLocs) {
        const row = (dup.row || 1) - 1;
        const cols = [];
        for (const g of (dup.groups || [])) cols.push(...g.cols);
        if (cols.length) push([row], [...new Set(cols)]);
      }
    }
  }

  if (name === 'Constant-Offset Blocks') {
    const dets = resultDetails(result);
    for (const d of dets) {
      const rows = d.positions ? parseRowRange(d.positions) : [];
      const cols = d.pair ? parsePairCols(d.pair) : null;
      if (rows.length) push(rows, cols);
    }
  }

  if (name === 'Residual Spike Correlation') {
    const dets = resultDetails(result);
    const rows = dets.map(d => parseInt(d.row) - 1).filter(n => !isNaN(n));
    if (rows.length) {
      // Use _groupCols if available to map to specific columns
      if (result._groupCols?.length && result.bestPairIdx?.length >= 2) {
        const [bi, bj] = result.bestPairIdx;
        const cols = [
          ...(result._groupCols[bi] || []),
          ...(result._groupCols[bj] || [])
        ];
        push([...new Set(rows)], [...new Set(cols)]);
      } else {
        push([...new Set(rows)], null);
      }
    }
  }

  if (name === 'Inter-Replicate Correlation') {
    const dets = resultDetails(result);
    // Two-arm gate (A2 fix #2):
    //   • Windowed entries (source==='window') → row-and-col paint over the
    //     window. cols use matCol1/matCol2, NOT parsePairCols(d.pair) —
    //     d.pair is 1-indexed WITHIN the condition's data-column slice, so
    //     parsing it as a matrix-col index paints non-Control windows into
    //     Control's column band (A2 fix #1).
    //   • Dataset-level suspicious entries (d.suspicious === true) → column-
    //     local paint across all rows. The `suspicious` flag is precomputed
    //     by the producer (interReplicateCorrelation.js:156) encoding
    //     METHODOLOGY §2.5: !highSNR && adjP < ALPHA.FLAG && excess >
    //     minExcess. Non-suspicious dataset-level entries are NOT painted.
    for (const d of dets) {
      const isWindow = d.source === 'window' && d.startRow != null && d.endRow != null;
      const isSuspiciousDatasetLevel = d.source !== 'window' && d.suspicious === true;
      if (!isWindow && !isSuspiciousDatasetLevel) continue;
      const cols = (d.matCol1 != null && d.matCol2 != null)
        ? [d.matCol1, d.matCol2]
        : (d.pair ? parsePairCols(d.pair) : null);
      if (isWindow) {
        const rows = [];
        for (let r = d.startRow - 1; r <= d.endRow - 1; r++) rows.push(r);
        if (rows.length) push(rows, cols);
      } else {
        // Suspicious dataset-level: column-local, all rows.
        push(null, cols);
      }
    }
  }

  // ── Unusual Digits category ──

  if (name === 'Value-Frequency Spike' && result._spikeCells?.length) {
    const cells = result._spikeCells;
    // Group by row for efficiency
    const byRow = {};
    for (const { row, col } of cells) {
      (byRow[row] || (byRow[row] = [])).push(col);
    }
    for (const [r, cols] of Object.entries(byRow)) {
      push([parseInt(r)], [...new Set(cols)]);
    }
  }

  // ── Cross-Replicate Comparisons category ──

  if (name === 'Selective Noise Partitioning' && result.colDetails?.length) {
    // Column-level test — flag max/min variance columns across all rows
    const maxCol = result.colDetails.reduce((best, d) => (!best || parseFloat(d.residualStd) > parseFloat(best.residualStd)) ? d : best, null);
    const minCol = result.colDetails.reduce((best, d) => (!best || parseFloat(d.residualStd) < parseFloat(best.residualStd)) ? d : best, null);
    if (maxCol && minCol) {
      const cols = [...new Set([parseInt(maxCol.col) - 1, parseInt(minCol.col) - 1])];
      push(null, cols);
    }
  }

  if (name === 'LOESS Residual Analysis') {
    // Emit narrow band around each changepoint (±2 rows) — not the entire region.
    // The two-tone click-to-highlight shows full regions; convergence grid focuses
    // on the boundary where noise character actually changes.
    const emitCp = (cpRow) => {
      const cp = parseInt(cpRow) - 1;
      if (isNaN(cp)) return;
      const rows = [];
      for (let r = Math.max(0, cp - 2); r <= Math.min(nRows - 1, cp + 2); r++) rows.push(r);
      push(rows, null);
    };
    if (result.changepointRow) emitCp(result.changepointRow);
    if (result.secondaryRow) emitCp(result.secondaryRow);
  }

  if (name === 'Row-Mean Runs') {
    if (result.bestWindowRows && result.bestWindowRows !== '—') {
      const rows = parseRowRange(result.bestWindowRows);
      if (rows.length) push(rows, null);
    }
    const dets = resultDetails(result);
    // A2 fix #4: admit per-condition sequence entries when their p-value drives
    // the flag (parseFloat(d.p) < ALPHA.FLAG). The producer emits `rowIdxs` as
    // 0-indexed matrix-row indices of the condition's row slice
    // (rowMeanRuns.js:213); emit row-local (rows = condition rows, cols = null)
    // so aggregateRegions expands to rows × all-data-cols — a full-width band on
    // the flagged condition's row slice. DS21 is row-grouped, so conditions are
    // row partitions, not column partitions; the location IS row-local.
    for (const d of dets) {
      if (d.source === 'window' && d.startRow == null) continue;
      if (d.source !== 'window' && (parseFloat(d.p) >= ALPHA.FLAG || !d.rowIdxs?.length)) continue;
      if (d.source !== 'window') {
        push([...d.rowIdxs], null);
        continue;
      }
      const rows = [];
      for (let r = d.startRow - 1; r <= d.endRow - 1; r++) rows.push(r);
      if (rows.length) push(rows, null);
    }
  }

  if (name === 'Regional Noise Homogeneity') {
    // Loop the producer's flagged-window set: regionalNoise.js emits top
    // windows with maxRatio ≥ 0.5 × obsScanStat when flagged HIGH/MOD. The
    // outer flag guard (MODERATE/HIGH only) already excludes the LOW-mode
    // "top 5" display details, so no per-window filter is needed here.
    const dets = resultDetails(result);
    for (const d of dets) {
      if (!d.rows || d.rows === '—') continue;
      const rows = parseRowRange(d.rows);
      const col = d.anomCol !== undefined && d.anomCol !== '—'
        ? [parseInt(d.anomCol) - 1] : null;
      if (rows.length) push(rows, col);
    }
  }

  if (name === 'Missing Data Pattern' && result.blockHits?.length) {
    for (const blk of result.blockHits) {
      const rows = [];
      for (let r = blk.startRow - 1; r <= blk.endRow - 1; r++) rows.push(r);
      const cols = blk.cols?.map(c => c - 1) || null;
      if (rows.length) push(rows, cols);
    }
  }

  if (name === 'Runs Test') {
    const dets = resultDetails(result);
    for (const d of dets.filter(d => d.source === 'window' && d.startRow != null)) {
      const rows = [];
      for (let r = d.startRow - 1; r <= d.endRow - 1; r++) rows.push(r);
      const cols = d.pair ? parsePairCols(d.pair) : null;
      if (rows.length) push(rows, cols);
    }
  }

  if (name === 'Windowed Autocorrelation') {
    const dets = resultDetails(result);
    // Only flag windows that actually survived BH-FDR at α=0.05.
    for (const d of dets.filter(d => d.source === 'window' && d.significant && d.startRow != null)) {
      const rows = [];
      for (let r = d.startRow - 1; r <= d.endRow - 1; r++) rows.push(r);
      const cols = d.pair ? parsePairCols(d.pair) : null;
      if (rows.length) push(rows, cols);
    }
  }

  if (name === 'Within-Row Variance' && result.flaggedRows?.length) {
    const rows = result.flaggedRows
      .filter(r => r.direction === 'too smooth')
      .map(r => r.row - 1);
    if (rows.length) push(rows, null);
  }

  if (name === 'Mahalanobis Row Outlier') {
    const dets = resultDetails(result);
    const rows = dets.map(d => parseInt(d.Row) - 1).filter(n => !isNaN(n));
    if (rows.length) push(rows, null);
  }

  if (name === 'Blocked Mahalanobis') {
    // Block row ranges from significant (pass × condition) units only.
    // Each detail carries startRow/endRow (file rows, 1-based) for the
    // argmax (and near-max, within 5%) window. Flagged blocks mark the
    // whole row range across all columns — covariance is a joint property.
    const dets = resultDetails(result);
    for (const d of dets.filter(d => d.source === 'block' && d.significant && d.startRow != null)) {
      const rows = [];
      for (let r = d.startRow - 1; r <= d.endRow - 1; r++) rows.push(r);
      if (rows.length) push(rows, null);
    }
  }

  return regions;
}

// ── buildConvergenceGrid ─────────────────────────────────────────────
// Iterates all test results, calls extractCellFlags for each, accumulates
// into a sparse per-cell evidence grid.

export function buildConvergenceGrid(allResults, nRows, nCols) {
  const grid = new Map(); // "row,col" → { count, tests[], categories[], maxSeverity }

  function mark(r, c, testName, category, flag) {
    if (r < 0 || r >= nRows || c < 0 || c >= nCols) return;
    const k = cellKey(r, c);
    let cell = grid.get(k);
    if (!cell) {
      cell = { count: 0, tests: [], categories: [], maxSeverity: 0 };
      grid.set(k, cell);
    }
    // Only count each test once per cell
    if (!cell.tests.includes(testName)) {
      cell.count++;
      cell.tests.push(testName);
    }
    if (!cell.categories.includes(category)) {
      cell.categories.push(category);
    }
    const sev = FLAG_RANK[flag] || 0;
    if (sev > cell.maxSeverity) cell.maxSeverity = sev;
  }

  for (const result of allResults) {
    const testName = result.name;
    const category = TEST_MECHANISM[testName] || 'noise';
    const flag = result.flag;
    const regions = extractCellFlags(result, nRows, nCols);

    for (const { rows, cols } of regions) {
      const rList = rows || Array.from({ length: nRows }, (_, i) => i);
      const cList = cols || Array.from({ length: nCols }, (_, i) => i);
      for (const r of rList) {
        for (const c of cList) {
          mark(r, c, testName, category, flag);
        }
      }
    }
  }

  return grid;
}

// ── detectHotspots ───────────────────────────────────────────────────
// Finds connected components of qualifying cells, computes bounding
// rectangles, and ranks by depth × diversity.

export function detectHotspots(grid, nRows, nCols, minDepth = 2, minDiversity = 1) {
  // Build set of qualifying cells
  const qualifying = new Set();
  for (const [k, cell] of grid) {
    if (cell.count >= minDepth && cell.categories.length >= minDiversity) {
      qualifying.add(k);
    }
  }
  if (qualifying.size === 0) return [];

  // Flood-fill 8-connected components
  const visited = new Set();
  const components = [];

  for (const k of qualifying) {
    if (visited.has(k)) continue;
    const component = [];
    const stack = [k];
    while (stack.length) {
      const cur = stack.pop();
      if (visited.has(cur) || !qualifying.has(cur)) continue;
      visited.add(cur);
      component.push(cur);
      const [r, c] = parseKey(cur);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nk = cellKey(r + dr, c + dc);
          if (!visited.has(nk) && qualifying.has(nk)) stack.push(nk);
        }
      }
    }
    if (component.length > 0) components.push(component);
  }

  // Compute stats per component
  const hotspots = [];
  for (const comp of components) {
    let rowStart = Infinity, rowEnd = -Infinity, colStart = Infinity, colEnd = -Infinity;
    let maxCount = 0;
    const allTests = new Set();
    const allCats = new Set();
    let maxSev = 0;

    for (const k of comp) {
      const [r, c] = parseKey(k);
      if (r < rowStart) rowStart = r;
      if (r > rowEnd) rowEnd = r;
      if (c < colStart) colStart = c;
      if (c > colEnd) colEnd = c;
      const cell = grid.get(k);
      if (cell.count > maxCount) maxCount = cell.count;
      for (const t of cell.tests) allTests.add(t);
      for (const cat of cell.categories) allCats.add(cat);
      if (cell.maxSeverity > maxSev) maxSev = cell.maxSeverity;
    }

    const rectArea = (rowEnd - rowStart + 1) * (colEnd - colStart + 1);
    const density = comp.length / rectArea;

    // Filter sparse hotspots
    if (density < 0.3) continue;

    const score = maxCount * allTests.size;
    hotspots.push({
      rowStart, rowEnd, colStart, colEnd,
      maxCount, tests: [...allTests], categories: [...allCats],
      score, cellCount: comp.length,
      density: Math.round(density * 100) / 100,
      maxSeverity: maxSev,
    });
  }

  // ── Iterative bounding-rectangle merge ──
  // Merge hotspots whose bounding rectangles overlap or are adjacent (within 1 row/col gap).
  // Repeat until no more merges occur.
  let merged = hotspots;
  let changed = true;
  while (changed) {
    changed = false;
    const next = [];
    const used = new Set();
    for (let i = 0; i < merged.length; i++) {
      if (used.has(i)) continue;
      let h = { ...merged[i], tests: [...merged[i].tests], categories: [...merged[i].categories] };
      for (let j = i + 1; j < merged.length; j++) {
        if (used.has(j)) continue;
        const o = merged[j];
        // Merge when row ranges overlap or are adjacent (gap ≤ 1), regardless of column span
        if (h.rowStart <= o.rowEnd + 2 && o.rowStart <= h.rowEnd + 2) {
          // Merge o into h
          h.rowStart = Math.min(h.rowStart, o.rowStart);
          h.rowEnd = Math.max(h.rowEnd, o.rowEnd);
          h.colStart = Math.min(h.colStart, o.colStart);
          h.colEnd = Math.max(h.colEnd, o.colEnd);
          h.maxCount = Math.max(h.maxCount, o.maxCount);
          h.cellCount += o.cellCount;
          h.maxSeverity = Math.max(h.maxSeverity, o.maxSeverity);
          for (const t of o.tests) { if (!h.tests.includes(t)) h.tests.push(t); }
          for (const c of o.categories) { if (!h.categories.includes(c)) h.categories.push(c); }
          h.score = h.maxCount * h.tests.length;
          used.add(j);
          changed = true;
        }
      }
      next.push(h);
    }
    merged = next;
  }

  merged.sort((a, b) => b.score - a.score || b.maxCount - a.maxCount);
  return merged;
}

// ── classifyPattern ──────────────────────────────────────────────────

function classifyPattern(hotspots, grid, nRows, nCols) {
  const totalCells = nRows * nCols;
  if (grid.size / totalCells > 0.5) return 'saturated';
  if (hotspots.length > 0) return 'sparse';
  if (grid.size > 0) return 'scattered';
  return 'clean';
}

// ── buildConvergenceGridFromFindings ─────────────────────────────────
// Same shape as buildConvergenceGrid but driven by the canonical
// findings[] structure (S126a). Each finding's region.raw carries the
// same {rows, cols} entries that extractCellFlags would emit, so
// downstream cell shading / hotspot detection is byte-identical.
// findings[] excludes global tests and non-flagged tests by construction —
// matching the filters extractCellFlags applies internally for the
// results-based variant.

export function buildConvergenceGridFromFindings(findings, nRows, nCols) {
  const grid = new Map();

  function mark(r, c, testName, category, severity) {
    if (r < 0 || r >= nRows || c < 0 || c >= nCols) return;
    const k = cellKey(r, c);
    let cell = grid.get(k);
    if (!cell) {
      cell = { count: 0, tests: [], categories: [], maxSeverity: 0 };
      grid.set(k, cell);
    }
    if (!cell.tests.includes(testName)) {
      cell.count++;
      cell.tests.push(testName);
    }
    if (!cell.categories.includes(category)) {
      cell.categories.push(category);
    }
    if (severity > cell.maxSeverity) cell.maxSeverity = severity;
  }

  // Map finding.severity → grid cell.maxSeverity rank, matching FLAG_RANK
  // ('HIGH' → 3, 'MOD' → 2). Only HIGH/MOD findings reach this code path.
  const SEV_TO_RANK = { HIGH: 3, MOD: 2, LOW: 1 };

  for (const f of findings) {
    if (f.type !== "localised" || !f.region) continue;
    const testName = f.tests?.[0]?.testId;
    const category = f.dimensions?.[0] || "noise";
    const sev = SEV_TO_RANK[f.severity] || 0;
    if (!testName) continue;
    for (const { rows, cols } of f.region.raw || []) {
      const rList = rows || Array.from({ length: nRows }, (_, i) => i);
      const cList = cols || Array.from({ length: nCols }, (_, i) => i);
      for (const r of rList) {
        for (const c of cList) {
          mark(r, c, testName, category, sev);
        }
      }
    }
  }

  return grid;
}

// ── buildConvergence ─────────────────────────────────────────────────
// Convenience wrapper: grid + hotspots + pattern in one call.
// Results-based path retained for excelExport.js which still consumes
// raw results directly. The findings-based code path
// (buildConvergenceFromFindings) is the canonical wiring used by
// ReportView post-S126a.

export function buildConvergence(allResults, nRows, nCols) {
  const grid = buildConvergenceGrid(allResults, nRows, nCols);
  return finalizeConvergence(grid, allResults, nRows, nCols);
}

/**
 * Findings-based convergence — the v1.0 canonical path.
 * Consumes the central findings[] aggregator (analysis/findings.js).
 * `results` is still needed for groups (DupDet/ConstOffset emit
 *   `result.groups`, which describe sub-units of a finding rather than
 *   a separate finding per group).
 */
export function buildConvergenceFromFindings(findings, results, nRows, nCols) {
  const grid = buildConvergenceGridFromFindings(findings, nRows, nCols);
  return finalizeConvergence(grid, results, nRows, nCols);
}

function finalizeConvergence(grid, allResults, nRows, nCols) {
  const hotspots = detectHotspots(grid, nRows, nCols);
  const pattern = classifyPattern(hotspots, grid, nRows, nCols);

  // ── Collect groups from group-emitting tests (only if flagged/noted) ──
  const groups = [];
  for (const result of allResults) {
    if (result.groups?.length && (result.flag === "HIGH" || result.flag === "MODERATE")) {
      for (const g of result.groups) groups.push({ ...g });
    }
  }
  // Sort by minimum row, assign sequential global IDs
  groups.sort((a, b) => Math.min(...a.rows) - Math.min(...b.rows));
  for (let i = 0; i < groups.length; i++) groups[i].id = i;

  // Annotate grid cells with group membership
  for (const g of groups) {
    for (const r of g.rows) {
      for (let c = 0; c < nCols; c++) {
        const k = `${r},${c}`;
        const cell = grid.get(k);
        if (cell) {
          if (!cell.groupIds) cell.groupIds = [];
          if (!cell.groupIds.includes(g.id)) cell.groupIds.push(g.id);
        }
      }
    }
  }

  return { grid, hotspots, pattern, nRows, nCols, groups };
}

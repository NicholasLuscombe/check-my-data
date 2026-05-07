// Long-format CSV detection and pivoting
// Extracted from App.jsx — no external dependencies

// Returns null if not detected, or a candidates object if likely long-format.
export function detectLongFormat(headers, rows) {
  // Minimum 100 rows + exact divisibility.
  // Instrument long-format files are always large (e.g. 384-well plate = 1536 rows).
  // Small datasets (<100 rows) are always wide-format replicates regardless of crossing.
  // Exact divisibility (remainder ≤ 1) distinguishes balanced instrument exports from
  // unbalanced survey COND columns (e.g. 491 % 3 = 2 → not long-format).
  if (!rows || rows.length < 100 || !headers || headers.length < 3) return null;
  const nRows = rows.length;

  const colInfo = headers.map((h, ci) => {
    const vals = rows.map(r => r[ci]).filter(v => v != null && String(v).trim() !== "");
    if (vals.length < nRows * 0.5) return null; // sparse column — skip
    const nums = vals.filter(v => !isNaN(Number(v)));
    const numFrac = nums.length / vals.length;
    const uniqVals = [...new Set(vals)];
    return { ci, h: String(h || "Col "+(ci+1)), nUniq: uniqVals.length, numFrac, vals, uniqVals };
  }).filter(Boolean);

  // Condition candidates: mostly non-numeric, 2–30 unique values
  const condCandidates = colInfo.filter(c =>
    c.numFrac < 0.3 && c.nUniq >= 2 && c.nUniq <= 30 && c.nUniq < nRows * 0.3
  );

  // Measurement candidates: mostly numeric, enough unique values to be a real measurement.
  // Exclude high-integer low-cardinality columns (metadata like volume, plate ID, etc.):
  // if >90% integers and <15% unique values, it's likely a metadata count not a measurement.
  const measureCandidates = colInfo.filter(c => {
    if(c.numFrac <= 0.85) return false;
    if(c.nUniq <= Math.max(10, nRows * 0.05)) return false;
    const intFrac = c.vals.filter(v=>!isNaN(Number(v))&&Number(v)===Math.floor(Number(v))).length / c.vals.length;
    if(intFrac > 0.9 && c.nUniq < nRows * 0.15) return false; // integer metadata gate
    return true;
  });

  if (!condCandidates.length || measureCandidates.length < 1) return null;

  // Wide-format gate: long-format instrument exports (qPCR, plate readers) have many
  // metadata columns alongside multiple measurement types. Wide-format replicate data has
  // mostly numeric columns with just 1–2 label columns. If 4+ measurement candidates,
  // require at least 3 non-numeric columns (metadata-rich = long-format instrument export).
  if (measureCandidates.length > 3) {
    const nNonNumeric = colInfo.filter(c => c.numFrac < 0.5).length;
    if (nNonNumeric < 3) return null;
  }

  // Key long-format signal: nRows is exactly divisible by nUniq(condCol) (remainder ≤ 1).
  // Instrument exports have balanced designs — every sample measured against every target.
  const crossedCond = condCandidates.find(c => {
    const ratio = nRows / c.nUniq;
    return ratio >= 2 && (nRows % c.nUniq) <= 1;
  });

  if (!crossedCond) return null;

  // Wide-format gate : implicitly enforced by requiring crossedCond above.

  // ID candidates: high-cardinality string columns (likely well IDs, sample IDs, etc.)
  const idCandidates = colInfo.filter(c =>
    c.ci !== crossedCond.ci &&
    c.nUniq > nRows * 0.3 &&
    c.numFrac < 0.15
  );

  return { condCandidates, measureCandidates, idCandidates, primaryCondCol: crossedCond, primaryMeasureCol: measureCandidates[0] };
}

// Pivot long-format rows to wide-format 2D array (header row included at index 0).
// dataRows: array of raw row arrays (no header row).
// headers: column name array.
// measureCol, condCol: column indices. idCol: column index or null.
export function pivotLongToWide(dataRows, headers, { measureCol, condCol, idCol }) {
  const condVals = [...new Set(dataRows.map(r => String(r[condCol] ?? "").trim()))].filter(Boolean).sort();

  if (idCol != null) {
    // Align by ID: each unique ID becomes one row; conditions become columns
    const idVals = [...new Set(dataRows.map(r => String(r[idCol] ?? "").trim()))].filter(Boolean);
    const lookup = {};
    for (const row of dataRows) {
      const id = String(row[idCol] ?? "").trim();
      const cond = String(row[condCol] ?? "").trim();
      if (!id || !cond) continue;
      if (!lookup[id]) lookup[id] = {};
      lookup[id][cond] = row[measureCol] ?? "";
    }
    const wideRows = idVals.map(id => {
      const entry = lookup[id] || {};
      return [id, ...condVals.map(c => entry[c] ?? "")];
    });
    return [[headers[idCol], ...condVals], ...wideRows];
  } else {
    // No ID: chunk by condition, align by order within each group
    const byCondition = {};
    for (const c of condVals) byCondition[c] = [];
    for (const row of dataRows) {
      const cond = String(row[condCol] ?? "").trim();
      if (cond && byCondition[cond] !== undefined) byCondition[cond].push(row[measureCol] ?? "");
    }
    const maxLen = Math.max(...condVals.map(c => byCondition[c].length));
    const wideRows = [];
    for (let i = 0; i < maxLen; i++) {
      wideRows.push(condVals.map(c => i < byCondition[c].length ? byCondition[c][i] : ""));
    }
    return [condVals, ...wideRows];
  }
}

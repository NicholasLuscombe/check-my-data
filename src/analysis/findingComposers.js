/* ── Per-test §4 prompt-body composers (S162b, A1.D2 Phase B) ───────────
 *
 * Registry keyed by canonical test name (the `r.name` field on engine
 * result objects). Each composer takes (r, ctx) and returns
 * `{ location: string, evidenceLines: string[] }` for the §4 prompt body.
 *
 * Phase A behaviour (handoffModel.js's `locationOf` / `evidenceOf`) is the
 * fallback for any test not in the registry: location = a minimal
 * `testLocalisation`-style summary; evidenceLines = `[r.interpretation,
 * primaryP line]`. Phase A was correctness-incomplete on the 19 tests that
 * carry no `interpretation` field — those emit `[undefined, primaryP]` to
 * the §4 surface.
 *
 * Calibration: `docs/shared/S162b-CALIBRATION.md` (chat-owned design
 * artefact). The seven anchor composers (LOESS / Benford 1st / IRC / Selective
 * Noise / Mahalanobis Row / DupDet / Baseline Balance) are target-locked
 * against named fixtures; their output for the calibration fixture's
 * harvested result object is the test/diag-s162b-anchor-lock.mjs gate.
 *
 * Register decisions (locked S162b calibration):
 *  - Location: single line, no trailing period; descriptive forms allowed
 *    for global-statistic-over-structured-features ("Across the K-feature
 *    ANOVA p-value distribution").
 *  - Evidence: 1–3 sentence-case sentences ending in a period; line 1 =
 *    headline statistic + classification verdict; line 2 = per-element
 *    detail; line 3 = supporting context (reserved for genuinely rich
 *    per-element shapes).
 *  - p-value idiom: reader-friendly names (`CUSUM p`, `KS p`, `Bartlett p`)
 *    not engine field names (`cusumP`, `ksP`, `pBartlett`).
 *  - p-value precision: 4 decimal places for small p; `< 0.0001` at floor;
 *    drop trailing zeros below 4 dp.
 *  - Test statistics preserved at engine precision verbatim (D = 0.7512,
 *    not D = 0.751; χ² = 30.83 from "30.830"; cusumStat = 2.169).
 *  - Composer-layer truncation: 5 indices, 3 windows, 6–8 columns/pairs;
 *    full 9-digit Benford 1st listing acceptable; condense middle range
 *    when overflow. No truncation logic in promptBodyRenderer.
 *  - No test-name restatement (test name appears as the §4 section header
 *    above each finding).
 *  - No paraphrased examples — cite engine field values verbatim or
 *    aggregate statistics derived from them.
 */

// ── Formatting helpers ─────────────────────────────────────────────────

/**
 * Format a p-value at 4dp. Handles both numeric inputs (0, 0.0002) and
 * string inputs ("<0.0001", "0.0002", "0.0000"). Returns "< 0.0001" for
 * values below 0.0001 (clamped to the readable floor). Drops trailing
 * zeros below 4dp ("0.005" not "0.0050").
 */
function formatP(p) {
  if (p == null) return "—";
  if (typeof p === "string") {
    if (p === "<0.0001" || p === "< 0.0001") return "< 0.0001";
    const n = parseFloat(p);
    if (!Number.isFinite(n)) return p;
    return formatP(n);
  }
  if (!Number.isFinite(p)) return "—";
  if (p < 0.0001) return "< 0.0001";
  if (p >= 1) return "1.0000";
  // 4dp then drop trailing zeros below 4dp ("0.005" not "0.0050",
  // "0.05" not "0.0500"). Keep 4dp for values like 0.0006 (no zeros to
  // drop) and 0.0017 (no zeros to drop).
  let s = p.toFixed(4);
  // Only drop trailing zeros if the result has more than 2 significant
  // digits past the point — preserves "0.0006" but trims "0.0050" to
  // "0.005". Conservative: strip a single trailing zero only.
  if (s.endsWith("0") && !s.endsWith("00")) s = s.replace(/0$/, "");
  return s;
}

/**
 * Format a string-encoded scientific-notation p-value ("1.66e-6") as
 * Unicode "1.66×10⁻⁶" for prose. Falls through to formatP for non-sci
 * inputs.
 */
function formatPSci(p) {
  if (p == null) return "—";
  const s = typeof p === "string" ? p : String(p);
  const m = s.match(/^([-+]?\d*\.?\d+)e([-+]?\d+)$/i);
  if (!m) return formatP(p);
  const mantissa = m[1];
  const exp = parseInt(m[2], 10);
  const supDigits = String(Math.abs(exp))
    .split("")
    .map(d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d])
    .join("");
  const sign = exp < 0 ? "⁻" : "";
  return `${mantissa}×10${sign}${supDigits}`;
}

/** Add comma thousands-separators to a numeric count. */
function formatCount(n) {
  if (n == null || !Number.isFinite(Number(n))) return String(n);
  return Number(n).toLocaleString("en-US");
}

/** Parse "19.0%" → 19.0; safe on numbers/null. */
function parsePctStr(s) {
  if (s == null) return NaN;
  if (typeof s === "number") return s;
  return parseFloat(String(s).replace(/%$/, ""));
}

/** Parse string-or-number to float; null-safe. */
function parseNum(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  return parseFloat(String(v));
}

/** Format a number to N significant digits, trimming trailing zeros. */
function toSf(n, sf) {
  if (!Number.isFinite(n)) return String(n);
  const s = n.toPrecision(sf);
  // Avoid scientific notation drift for normal-range values
  return parseFloat(s).toString();
}

/** Format a signed delta with sign ("+0.0202", "-0.0103"). */
function formatSignedDelta(n, dp = 4) {
  if (!Number.isFinite(n)) return String(n);
  const s = n.toFixed(dp);
  return n >= 0 ? `+${s}` : s;
}

/** Sentence-case the first character of a string. */
function capFirst(s) {
  return s && s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Pluralise: pl(1, 'row') → 'row'; pl(2, 'row') → 'rows'. */
function pl(n, s, plural) {
  return n === 1 ? s : (plural || s + "s");
}

/** Join a list with Oxford-style commas and "and": [a,b,c] → "a, b, and c". */
function joinList(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

/** Format a row-index array per the cross-anchor truncation rule. */
function formatRowIndexList(indices, totalRows) {
  if (!Array.isArray(indices) || indices.length === 0) return "Global";
  if (indices.length === 1) return `Row ${indices[0]}`;
  if (indices.length <= 5) return `Rows ${indices.join(", ")}`;
  const first = indices.slice(0, 5).join(", ");
  return `Rows ${first}, … (${indices.length} of ${totalRows} total)`;
}

// ── Anchor 1: LOESS Residual Analysis (DS08 lock) ──────────────────────

function loessResidualAnalysis(r /*, ctx */) {
  const cp = r.changepointRow;
  const cpDir = r.changepointDirection || "shifts";
  const cusumP = r.cusumP;
  const scanP = r.scanP;
  const details = Array.isArray(r.details) ? r.details : [];
  const windows = details.filter(d => d?.type === "window");
  const nWindows = windows.length;

  // Aggregate window row range for the location summary.
  let winRowSpan = "";
  let direction = "";
  if (windows.length > 0) {
    let minR = Infinity, maxR = -Infinity;
    for (const w of windows) {
      const m = String(w.rows || "").match(/(\d+)\s*[–-]\s*(\d+)/);
      if (m) {
        const a = parseInt(m[1], 10);
        const b = parseInt(m[2], 10);
        if (a < minR) minR = a;
        if (b > maxR) maxR = b;
      }
    }
    if (Number.isFinite(minR) && Number.isFinite(maxR)) {
      winRowSpan = `${minR}–${maxR}`;
    }
    direction = windows[0]?.direction || "anomalous";
  }

  // Location: changepoint anchor + window anchor (each present-conditional).
  const locParts = [];
  if (Number.isFinite(cp)) locParts.push(`Changepoint at row ${cp}`);
  if (nWindows > 0 && winRowSpan) {
    locParts.push(`${nWindows} ${direction} ${pl(nWindows, "window")} in rows ${winRowSpan}`);
  }
  const location = locParts.length > 0 ? locParts.join("; ") : "Global";

  // Evidence line 1: changepoint + top-3 windows + CUSUM/scan p.
  const evidenceLines = [];
  const topWindows = windows.slice(0, 3);
  const winFragments = topWindows.map((w, i) => {
    if (i === 0) return `rows ${w.rows} (${w.ratio} variance ratio)`;
    return `${w.rows} (${w.ratio})`;
  });
  const line1Parts = [];
  if (Number.isFinite(cp)) {
    const dirWord = cpDir.startsWith("noise ") ? cpDir : `noise ${cpDir}`;
    line1Parts.push(`Changepoint at row ${cp} (${dirWord} after this point)`);
  }
  if (winFragments.length > 0) {
    line1Parts.push(`${direction} windows at ${winFragments.join(", ")}`);
  }
  const pBits = [];
  if (cusumP != null) pBits.push(`CUSUM p = ${formatP(cusumP)}`);
  if (scanP != null) pBits.push(`scan p = ${formatP(scanP)}`);
  let line1 = line1Parts.join("; ");
  if (pBits.length > 0) line1 += `. ${pBits.join(", ")}`;
  if (line1) evidenceLines.push(line1 + ".");

  // Evidence line 2: regionComparison narrative.
  const regions = Array.isArray(r.regionComparison) ? r.regionComparison : [];
  if (regions.length === 2) {
    const parts = regions.map((reg, i) => {
      const label = i === 0 ? "Pre-changepoint" : "post-changepoint";
      const rows = reg.rows;
      const ratio = reg.ratio;
      const finding = (reg.finding || "").toLowerCase();
      if (finding === "as expected") {
        return `${label} rows (${rows}) sit at baseline`;
      }
      const dir = finding === "noisier" ? "noisier" : finding === "smoother" ? "smoother" : finding;
      return `${label} rows (${rows}) are ${ratio} ${dir} than expected`;
    });
    evidenceLines.push(parts.join("; ") + ".");
  }

  return { location, evidenceLines };
}

// ── Anchor 2: Benford's Law (First Digit) (DS08 lock) ──────────────────

function benfordFirstDigit(r /*, ctx */) {
  const chiSq = parseNum(r.chiSquared);
  const df = r.df;
  const MAD = parseNum(r.MAD);
  const conformity = r.MADConformity || "";
  const pMAD = r.pMAD;
  const nValues = r.nValues;
  const details = Array.isArray(r.details) ? r.details : [];

  const chiSqStr = Number.isFinite(chiSq) ? chiSq.toFixed(2) : String(r.chiSquared);
  const MADStr = Number.isFinite(MAD) ? MAD.toFixed(3) : String(r.MAD);

  const evidenceLines = [];

  // Line 1: headline statistic + classification.
  const line1 = `χ² = ${chiSqStr} on ${df} df, MAD = ${MADStr} (${conformity}, MAD p ${formatP(pMAD).replace(/^/, "")}).` +
    (nValues != null ? ` N = ${nValues} first digits.` : "");
  evidenceLines.push(line1.replace("MAD p < 0.0001", "MAD p < 0.0001")
    .replace(/MAD p (\d)/, "MAD p = $1"));

  // Line 2: digit distribution. Show first 5 digits with explicit comparison;
  // collapse 6–9 with "within ~Npp of expected" where N is the rounded
  // average absolute deviation of the collapsed range.
  if (details.length === 9) {
    const fragments = [];
    for (let i = 0; i < 5; i++) {
      const d = details[i];
      const dig = d.digit;
      const obs = d.observedPct;
      const exp = d.benfordPct;
      if (i === 0) fragments.push(`${dig}: ${obs} (vs ${exp} expected)`);
      else fragments.push(`${dig}: ${obs} (${exp})`);
    }
    const tail = details.slice(5);
    const tailDevs = tail.map(d => Math.abs(parsePctStr(d.observedPct) - parsePctStr(d.benfordPct)));
    const avgDev = tailDevs.reduce((a, b) => a + b, 0) / tailDevs.length;
    const avgDevRounded = Math.max(1, Math.floor(avgDev));
    const collapseLabel = `${tail[0].digit}–${tail[tail.length - 1].digit} within ~${avgDevRounded}pp of expected`;
    evidenceLines.push(`Digit distribution: ${fragments.join(", ")}; ${collapseLabel}.`);
  }

  // Line 3: top 2 contributors to χ². Algorithmic: sort by (obs − exp)² / exp,
  // narrate by direction with the percentage delta.
  if (details.length > 0) {
    const ranked = details
      .map(d => {
        const obs = parseNum(d.observed);
        const exp = parseNum(d.expected);
        const obsPct = parsePctStr(d.observedPct);
        const expPct = parsePctStr(d.benfordPct);
        const contribution = Number.isFinite(obs) && Number.isFinite(exp) && exp > 0
          ? ((obs - exp) ** 2) / exp
          : 0;
        return { ...d, contribution, obsPct, expPct };
      })
      .sort((a, b) => b.contribution - a.contribution);
    const top2 = ranked.slice(0, 2);
    if (top2.length === 2) {
      const phrase = (d) => {
        const sign = d.obsPct < d.expPct ? "Underrepresentation" : "Overrepresentation";
        return `${sign.toLowerCase()} of ${d.digit}s (${d.obsPct.toFixed(1)}% vs ${d.expPct.toFixed(1)}%)`;
      };
      const a = phrase(top2[0]);
      const b = phrase(top2[1]);
      const lead = a.charAt(0).toUpperCase() + a.slice(1);
      evidenceLines.push(`${lead} and ${b} are the dominant contributors to the χ².`);
    }
  }

  return { location: "Global", evidenceLines };
}

// ── Anchor 3: Inter-Replicate Correlation (DS08 lock) ──────────────────

function interReplicateCorrelation(r /*, ctx */) {
  const details = Array.isArray(r.details) ? r.details : [];
  const meanR = r.meanR;
  const nPairs = r.nPairs;
  const nSuspicious = r.nSuspicious || 0;
  const conditions = new Set(details.map(d => d?.condition).filter(Boolean));
  const isMultiCondition = conditions.size > 1;

  // Identify the suspicious pair(s) — the forensic signal.
  const suspicious = details.filter(d => d?.suspicious);
  const nonSuspicious = details.filter(d => !d?.suspicious);

  if (suspicious.length === 0) {
    // Fallback: test fired without a suspicious-pair flag. Lean on meanR.
    return {
      location: "Global",
      evidenceLines: [
        `Mean inter-replicate r = ${meanR} across ${nPairs} ${pl(nPairs, "pair")}. ` +
        `${nSuspicious} of ${nPairs} flagged as suspicious by leave-one-out BH-adjusted p < 0.01.`,
      ],
    };
  }

  // Location: lead with the suspicious pair(s).
  const susLabels = suspicious.map(s => {
    const condBit = isMultiCondition && s.condition && s.condition !== "All data" ? ` in ${s.condition}` : "";
    return `${s.pair}${condBit}`;
  });
  const location = suspicious.length === 1 ? `Pair ${susLabels[0]}` : `Pairs ${susLabels.join(", ")}`;

  const evidenceLines = [];
  const top = suspicious[0];
  const meanRNum = parseNum(meanR);
  const alreadyHighQualifier = Number.isFinite(meanRNum) && meanRNum >= 0.9 ? " (already high)" : "";

  // Line 1: global mean r anchor + the top suspicious pair's specifics.
  const excessStr = String(top.excess).startsWith("+") || String(top.excess).startsWith("-")
    ? top.excess
    : `+${top.excess}`;
  const condBit = isMultiCondition && top.condition && top.condition !== "All data" ? ` in ${top.condition}` : "";
  const line1 = `Mean inter-replicate r = ${meanR} globally${alreadyHighQualifier}; pair ${top.pair}${condBit} specifically r = ${top.r} ` +
    `(BH-adjusted p = ${formatP(top.adjP)}, excess ${excessStr} over leave-one-out predicted).`;
  evidenceLines.push(line1);

  // Line 2: count + non-suspicious pair context.
  if (nonSuspicious.length > 0) {
    const nonSusFragments = nonSuspicious.map(d => `${d.pair} (r = ${d.r})`);
    let qual;
    if (nonSuspicious.length === 1) qual = `pair ${nonSusFragments[0]} sits`;
    else qual = `pairs ${nonSusFragments.join(" and ")} sit`;
    evidenceLines.push(`${nSuspicious} of ${nPairs} replicate pairs flagged as suspicious; ${qual} at or below the leave-one-out predicted value.`);
  } else {
    evidenceLines.push(`${nSuspicious} of ${nPairs} replicate pairs flagged as suspicious.`);
  }

  return { location, evidenceLines };
}

// ── Anchor 4: Selective Noise Partitioning (DS08 lock) ─────────────────

function selectiveNoisePartitioning(r /*, ctx */) {
  const bartlett = parseNum(r.bartlettChi);
  const df = r.df;
  const pB = r.pBartlett;
  const maxMin = parseNum(r.maxMinVarianceRatio);
  const cols = Array.isArray(r.perColumnResults) ? r.perColumnResults : [];
  const nCols = cols.length;

  const evidenceLines = [];

  // Line 1: global Bartlett + max/min variance ratio.
  const bartlettStr = Number.isFinite(bartlett) ? bartlett.toFixed(2) : String(r.bartlettChi);
  const ratioStr = Number.isFinite(maxMin) ? maxMin.toFixed(2) : String(r.maxMinVarianceRatio);
  evidenceLines.push(
    `Bartlett χ² = ${bartlettStr} on ${df} df (p = ${formatP(pB)}). ` +
    `Max-to-min residual variance ratio across the ${nCols} columns is ${ratioStr}×, exceeding the 1.5× clean-data ceiling.`
  );

  // Line 2: per-column narration.
  if (cols.length > 0) {
    const sorted = [...cols].sort((a, b) => a.residualStd - b.residualStd);
    const quietest = sorted[0];
    const others = sorted.slice(1).sort((a, b) => a.col - b.col);
    const quietestSD = quietest.residualStd.toFixed(3);
    const quietestVarRatio = quietest.varRatio.toFixed(2);
    const colWord = others.length === 1 ? "column" : "columns";
    const verb = others.length === 1 ? "sits" : "sit";
    const otherCols = others.map(c => c.col).join(" and ");
    const otherSDs = others.map(c => c.residualStd.toFixed(3)).join(" and ");
    const flaggedCols = cols.filter(c => c.adjP < 0.05);
    const flaggedClause = flaggedCols.length === 0
      ? `No single column flags individually at BH-FDR adjusted p ≤ 0.05; the signal is structural across columns.`
      : flaggedCols.length === 1
        ? `Column ${flaggedCols[0].col} also flags individually at BH-FDR adjusted p = ${formatP(flaggedCols[0].adjP)}.`
        : `${flaggedCols.length} columns flag individually at BH-FDR adjusted p < 0.05.`;
    evidenceLines.push(
      `Column ${quietest.col} is the quietest (residual SD = ${quietestSD}, ${quietestVarRatio}× the noisiest column); ` +
      `${colWord} ${otherCols} ${verb} at ${otherSDs} respectively. ${flaggedClause}`
    );
  }

  return { location: "Global (column-level heteroscedasticity)", evidenceLines };
}

// ── Anchor 5: Mahalanobis Row Outlier (DS08 lock) ──────────────────────

function mahalanobisRowOutlier(r /*, ctx */) {
  const indices = Array.isArray(r.flaggedRowIndices) ? r.flaggedRowIndices : [];
  const nRows = r.nRows;
  const details = Array.isArray(r.details) ? r.details : [];
  const plotThreshold = parseNum(r.plotThreshold);
  const binomP = r.binomP;
  const nExceed = r.nExceedP01;
  const expectedExceed = r.expectedExceedP01;
  const exceedFrac = r.exceedFrac;

  const location = formatRowIndexList(indices, nRows);
  const evidenceLines = [];

  // Line 1: top outlier row, distance, per-row p, threshold context.
  if (details.length > 0) {
    const top = details[0];
    const dist = parseNum(top.Distance);
    const distStr = Number.isFinite(dist) ? dist.toFixed(2) : String(top.Distance);
    const pStr = top["p-value"] || top.pValue;
    const thresholdStr = Number.isFinite(plotThreshold) ? plotThreshold.toFixed(2) : String(r.plotThreshold);
    evidenceLines.push(
      `Row ${top.Row} sits at Mahalanobis distance ${distStr} (per-row p = ${formatPSci(pStr)}), ` +
      `far above the outlier threshold at distance ${thresholdStr}.`
    );
  }

  // Line 2: dataset-level binomial context.
  if (nExceed != null) {
    evidenceLines.push(
      `${nExceed} of ${nRows} rows exceed the p < 0.01 reference (${exceedFrac}, vs ${expectedExceed} expected under H₀); ` +
      `binomial tail probability p = ${formatP(binomP)} across the dataset.`
    );
  }

  return { location, evidenceLines };
}

// ── Anchor 6: Exact Duplicate Detection (DS14 lock) ────────────────────

function exactDuplicateDetection(r, ctx) {
  const blockCopies = Array.isArray(r.blockCopies) ? r.blockCopies : [];
  const rowDupGroups = Array.isArray(r.rowDupGroupList) ? r.rowDupGroupList : [];
  const dupRows = r.duplicateRows || 0;
  const wrMatches = r.withinRowMatches || 0;
  const wrExpected = parseNum(r.withinRowExpected);
  const wrPairs = r.withinRowPairTotal || 0;
  const collisionP = r.collisionP;
  const rowDupP = r.rowDupPValue;
  const withinRowP = r.withinRowP;
  const bestBlockP = r.bestBlockP;
  const collisionObs = r.collisionObs;
  const collisionNPairs = r.collisionNPairs;
  const overRep = Array.isArray(r.overRepresented) ? r.overRepresented : [];
  const expectedPerValue = parseNum(r.expectedPerValue);
  const isInteger = !!r.isInteger;
  const nDistinct = r.nDistinct || 0;

  // Location: structural summary.
  const locParts = [];
  if (blockCopies.length > 0) locParts.push(`${blockCopies.length} block ${pl(blockCopies.length, "copy", "copies")}`);
  if (dupRows > 0) locParts.push(`${dupRows} rows in ${rowDupGroups.length} duplicate ${pl(rowDupGroups.length, "group")}`);
  if (wrMatches > 0) locParts.push(`${formatCount(wrMatches)} within-row coincidences`);
  const location = locParts.length > 0 ? locParts.join("; ") : "Global";

  const evidenceLines = [];

  // Line 1: sub-test results in a dense narrative.
  const subTests = [
    {
      label: `value-level collisions (${formatCount(collisionObs)} of ${formatCount(collisionNPairs)} pairs, p ${formatP(collisionP)})`,
      pStr: collisionP, fires: parseNum(collisionP) < 0.01 || collisionP === "<0.0001",
    },
    {
      label: `row duplication (${dupRows} identical row vectors in ${rowDupGroups.length} ${pl(rowDupGroups.length, "group")}, p ${formatP(rowDupP)})`,
      pStr: rowDupP, fires: parseNum(rowDupP) < 0.01 || rowDupP === "<0.0001",
    },
    {
      label: `within-row coincidence (${formatCount(wrMatches)} of ${formatCount(wrPairs)} pairs vs ${Number.isFinite(wrExpected) ? Math.round(wrExpected) : r.withinRowExpected} expected, p ${formatP(withinRowP)})`,
      pStr: withinRowP, fires: parseNum(withinRowP) < 0.01 || withinRowP === "<0.0001",
    },
    {
      label: `block copies (${blockCopies.length} ${pl(blockCopies.length, "site")}, best block p = ${formatP(bestBlockP)})`,
      pStr: bestBlockP, fires: parseNum(bestBlockP) < 0.01,
    },
  ];
  const firing = subTests.filter(t => t.fires);
  const lead = firing.length === subTests.length
    ? "All 4 sub-tests fire"
    : `${firing.length} of ${subTests.length} sub-tests fire`;
  // Format each sub-test with the embedded p-value prefix replaced ("p <" → "p <").
  const fragments = subTests.map(t => t.label.replace(/p (\d|<)/, (m, c) => `p ${c === "<" ? "<" : "= " + c}`));
  evidenceLines.push(`${lead}: ${fragments.join(", ")}.`);

  // Line 2: dominant duplicate group.
  // Likert/survey framing: when ctx tells us the dataset is survey-shaped
  // (small-alphabet integer with categorical interpretation), surface the
  // dominant value's domain meaning ("Likert value K across all N
  // questions"). Otherwise stay generic ("K-value alphabet across N
  // columns"). The two branches diverge only on label wording.
  const ds = ctx?.dataset || {};
  const dataType = (ds.dataType || "").toLowerCase();
  const assayLabel = (ds.assay || "").toLowerCase();
  const isLikert = isInteger && nDistinct > 0 && nDistinct <= 7 &&
    (dataType === "survey" || assayLabel.includes("survey") || assayLabel.includes("likert") || assayLabel.includes("ordinal"));

  if (rowDupGroups.length > 0) {
    const top = rowDupGroups[0];
    const valuesStr = isInteger
      ? String(top.values).replace(/(\d+)\.\d+/g, "$1")
      : String(top.values);
    const nValuesPerRow = String(top.values).split(",").length;
    // Extract the dominant value (first entry in the comma-separated list).
    const dominantValue = String(top.values).split(",")[0].trim().replace(/(\d+)\.\d+/g, "$1");
    const alphabetBit = isLikert
      ? ` (Likert value ${dominantValue} across all ${nValuesPerRow} ${pl(nValuesPerRow, "question")})`
      : isInteger && nDistinct > 0 && nDistinct <= 10
        ? ` (${nDistinct}-value alphabet across all ${nValuesPerRow} ${pl(nValuesPerRow, "column")})`
        : "";
    let line2 = `Dominant duplicate group: ${top.count} identical rows of "${valuesStr}"${alphabetBit}`;
    if (rowDupGroups.length > 1) {
      const others = rowDupGroups.slice(1).map(g => {
        const vstr = isInteger
          ? String(g.values).split(",")[0].trim().replace(/(\d+)\.\d+/g, "$1")
          : String(g.values).split(",")[0].trim();
        return { count: g.count, valueRep: vstr };
      });
      const counts = others.map(o => o.count).join(" and ");
      const valueList = others.map(o => o.valueRep).join(" and ");
      line2 += `; secondary ${pl(others.length, "group")} of ${counts} identical rows on ${pl(others.length, "value")} ${valueList}`;
    }
    evidenceLines.push(line2 + ".");
  }

  // Line 3: over-represented value + alphabet caveat.
  if (overRep.length > 0 && Number.isFinite(expectedPerValue)) {
    const top = overRep[0];
    const expectedRounded = Math.round(expectedPerValue);
    let line3 = `Value ${top.value} is over-represented (count ${formatCount(top.count)} / expected ${expectedRounded})`;
    if (isLikert) {
      line3 += `; the ${nDistinct}-value Likert alphabet means collision baseline is high, but the row-vector duplication and block-copy signals are independent of alphabet size`;
    } else if (isInteger && nDistinct > 0 && nDistinct <= 10) {
      line3 += `; the ${nDistinct}-value alphabet means collision baseline is high, but the row-vector duplication and block-copy signals are independent of alphabet size`;
    }
    evidenceLines.push(line3 + ".");
  }

  return { location, evidenceLines };
}

// ── Anchor 7: Baseline Balance (Carlisle) (DS16 lock) ──────────────────

function baselineBalance(r /*, ctx */) {
  const nExcess = r.nExcess;
  const nFeatures = r.nFeatures;
  const expectedExcess = r.expectedExcess;
  const ksD = parseNum(r.ksD);
  const ksP = r.ksP;
  const binomP = r.binomP;
  const direction = r.direction || "differs from random";
  const histBins = Array.isArray(r.histBins) ? r.histBins : [];
  const nSig = r.nSignificant != null ? r.nSignificant : 0;

  const location = `Across the ${nFeatures}-feature ANOVA p-value distribution`;
  const evidenceLines = [];

  const ksDStr = Number.isFinite(ksD) ? ksD.toFixed(4) : String(r.ksD);

  // Line 1: counts + KS + direction.
  // "too balanced" → "have ANOVA p ≥ 0.9"; "differs more than expected" → "have ANOVA p < 0.05".
  const tooBalanced = String(direction).toLowerCase().includes("balanced");
  const refPhrase = tooBalanced ? "ANOVA p ≥ 0.9" : "ANOVA p < 0.05";
  evidenceLines.push(
    `${nExcess} of ${nFeatures} features have ${refPhrase} across conditions (expected ≈ ${expectedExcess} under random allocation); ` +
    `Kolmogorov–Smirnov D = ${ksDStr} against uniform (KS p ${formatP(ksP).startsWith("<") ? formatP(ksP) : "= " + formatP(ksP)}, ` +
    `binomial p ${formatP(binomP).startsWith("<") ? formatP(binomP) : "= " + formatP(binomP)}). ` +
    `Direction: ${direction}.`
  );

  // Line 2: histogram structure.
  if (histBins.length === 10) {
    const topBin = histBins[9];
    const bottomBin = histBins[0];
    const decileLabel = tooBalanced ? "top decile" : "bottom decile";
    const decileBin = tooBalanced ? `[0.9, 1.0)` : `[0.0, 0.1)`;
    const decileCount = tooBalanced ? topBin : bottomBin;
    evidenceLines.push(
      `Per-feature p-value distribution clusters tightly in the ${decileLabel} (${decileCount} of ${nFeatures} in the ${decileBin} bin) ` +
      `rather than spreading uniformly across [0, 1]; ${nSig} features cross the conventional significance threshold (p < 0.05) in either direction.`
    );
  }

  return { location, evidenceLines };
}

// ── Remaining composers (predicted-shape per calibration §Anchors not in this set) ──

// Benford 2nd — Benford 1st shape (10-digit alphabet 0–9).
function benfordSecondDigit(r /*, ctx */) {
  const chiSq = parseNum(r.chiSquared);
  const df = r.df;
  const MAD = parseNum(r.MAD);
  const conformity = r.MADConformity || "";
  const pMAD = r.pMAD;
  const nValues = r.nValues;
  const details = Array.isArray(r.details) ? r.details : [];

  const chiSqStr = Number.isFinite(chiSq) ? chiSq.toFixed(2) : String(r.chiSquared);
  const MADStr = Number.isFinite(MAD) ? MAD.toFixed(3) : String(r.MAD);
  const evidenceLines = [];

  evidenceLines.push(
    `χ² = ${chiSqStr} on ${df} df, MAD = ${MADStr} (${conformity}, MAD p ${formatP(pMAD).startsWith("<") ? formatP(pMAD) : "= " + formatP(pMAD)}).` +
    (nValues != null ? ` N = ${nValues} second digits.` : "")
  );

  if (details.length > 0) {
    const ranked = details
      .map(d => {
        const obsPct = parsePctStr(d.observedPct);
        const expPct = parsePctStr(d.benfordPct);
        return { ...d, obsPct, expPct, dev: Math.abs(obsPct - expPct) };
      })
      .sort((a, b) => b.dev - a.dev);
    const top3 = ranked.slice(0, 3).sort((a, b) => a.digit - b.digit);
    const frags = top3.map(d =>
      `digit ${d.digit}: ${d.obsPct.toFixed(1)}% (vs ${d.expPct.toFixed(1)}% expected)`
    );
    evidenceLines.push(`Largest deviations — ${frags.join(", ")}.`);
  }

  return { location: "Global", evidenceLines };
}

// Terminal Digit Uniformity — chi-squared against uniform.
function terminalDigitUniformity(r /*, ctx */) {
  const chiSq = parseNum(r.chiSquared);
  const df = r.df;
  const p = r.primaryP;
  const nValues = r.nValues;
  const details = Array.isArray(r.details) ? r.details : [];

  const chiSqStr = Number.isFinite(chiSq) ? chiSq.toFixed(2) : String(r.chiSquared);
  const evidenceLines = [];

  evidenceLines.push(
    `χ² = ${chiSqStr} on ${df} df against uniform (p = ${formatP(p)}). ` +
    (nValues != null ? `N = ${nValues} terminal digits.` : "")
  );

  if (details.length > 0) {
    const avoided = details.filter(d => d?.isAvoided).map(d => d.digit);
    const overUsed = details.filter(d => d && !d.isAvoided && d.deviation != null && parseNum(d.deviation) > 0)
      .sort((a, b) => parseNum(b.deviation) - parseNum(a.deviation))
      .slice(0, 2)
      .map(d => d.digit);
    const parts = [];
    if (avoided.length > 0) parts.push(`avoided: ${avoided.join(", ")}`);
    if (overUsed.length > 0) parts.push(`overused: ${overUsed.join(", ")}`);
    if (parts.length > 0) evidenceLines.push(`Digit-level pattern — ${parts.join("; ")}.`);
  }

  return { location: "Global", evidenceLines };
}

// Decimal Precision Consistency — precision-distribution shape.
function decimalPrecisionConsistency(r /*, ctx */) {
  const gaps = r.gapsDetected;
  const gapAt = r.gapAtDp;
  const dominantDp = r.dominantDecimalPlaces;
  const dominantFrac = r.dominantFraction;
  const maxDp = r.maxDecimalPlaces;
  const p = r.primaryP;

  const evidenceLines = [];
  if (gaps != null && gaps > 0) {
    evidenceLines.push(
      `${gaps} ${pl(gaps, "gap")} in decimal-precision distribution at ${gapAt}-dp (binomial p = ${formatP(p)}); ` +
      `dominant precision is ${dominantDp}dp at ${dominantFrac}, max ${maxDp}dp.`
    );
  } else {
    evidenceLines.push(
      `Precision distribution deviates from the trailing-zero-stripping model (p = ${formatP(p)}); ` +
      `dominant precision is ${dominantDp}dp at ${dominantFrac}, max ${maxDp}dp.`
    );
  }
  if (r.interpretation) {
    evidenceLines.push(r.interpretation);
  }
  return { location: "Global", evidenceLines };
}

// Value-Frequency Spike — VFS multi-pass (DupDet-shaped).
function valueFrequencySpike(r /*, ctx */) {
  const n1 = r.nSpikesPass1 || 0;
  const n2 = r.nSpikesPass2 || 0;
  const drivingPass = r.drivingPass;
  const details = Array.isArray(r.details) ? r.details : [];
  const p = r.primaryP;
  const kb = !!r.keyboardPattern;

  const evidenceLines = [];
  const passBits = [];
  if (n1 > 0) passBits.push(`${n1} full-value ${pl(n1, "spike")}`);
  if (n2 > 0) passBits.push(`${n2} fractional-digit ${pl(n2, "spike")}`);
  const passStr = passBits.length > 0 ? passBits.join(", ") : "no spikes";

  evidenceLines.push(
    `${passStr} detected at BH-FDR adjusted p < 0.01 (best spike p = ${formatP(p)}).` +
    (drivingPass ? ` Driving pass: ${drivingPass === "digit" ? "fractional-digit substring" : "full-value"}.` : "")
  );

  if (details.length > 0) {
    const top = details.slice(0, 5).map(d =>
      `${d.value} (${d.observed}× obs vs ${d.expected} exp, ${d.ratio})`
    );
    evidenceLines.push(`Top ${top.length} ${pl(top.length, "spike")}: ${top.join(", ")}.`);
  }

  if (kb) {
    evidenceLines.push(`Pattern includes adjacent-keypad values — consistent with manual keyboard entry rather than instrument output.`);
  }

  const location = (n1 + n2) > 0 ? `${n1 + n2} value ${pl(n1 + n2, "spike")}` : "Global";
  return { location, evidenceLines };
}

// Constant-Offset Blocks — block-anchored.
function constantOffsetBlocks(r /*, ctx */) {
  const blocks = r.consecutiveEqualDiffs || 0;
  const expectedByChance = r.expectedByChance;
  const totalPairs = r.totalConsecutivePairs;
  const offsetType = r.offsetType;
  const p = r.primaryP;
  const details = Array.isArray(r.details) ? r.details : [];

  const evidenceLines = [];
  const offsetWord = offsetType === "multiplicative" ? "multiplicative" : "additive";
  evidenceLines.push(
    `${blocks} ${pl(blocks, "block")} of consecutive row pairs sharing the same ${offsetWord} offset ` +
    `(${expectedByChance} expected by chance across ${totalPairs} consecutive pairs); permutation p = ${formatP(p)}.`
  );
  if (details.length > 0) {
    const top = details.slice(0, 3).map(d => `pair ${d.pair} at ${d.positions} (offset ${d.diff})`);
    evidenceLines.push(`Top ${pl(top.length, "block")}: ${top.join("; ")}.`);
  }

  const location = blocks > 0 ? `${blocks} offset ${pl(blocks, "block")}` : "Global";
  return { location, evidenceLines };
}

// Residual Spike Correlation — overlap or pair-correlation shape.
function residualSpikeCorrelation(r /*, ctx */) {
  const nOverlap = r.nOverlap || 0;
  const expectedOverlap = r.expectedOverlap;
  const topK = r.topK;
  const nRows = r.nRows;
  const bestPair = r.bestPair;
  const p = r.primaryP;
  const pairDetails = Array.isArray(r.pairDetails) ? r.pairDetails : [];

  const evidenceLines = [];
  evidenceLines.push(
    `${nOverlap} of the top-${topK} residual rows shared between ${bestPair} (${expectedOverlap} expected under independence across ${nRows} rows); ` +
    `permutation p = ${formatP(p)}.`
  );
  const highCorrPairs = pairDetails.filter(p => p?.highCorrelation);
  if (highCorrPairs.length > 0) {
    const frags = highCorrPairs.slice(0, 3).map(p => `${p.pair} (ρ = ${p.r})`);
    evidenceLines.push(`Globally high residual correlation in ${pl(highCorrPairs.length, "pair")}: ${frags.join(", ")}.`);
  }
  return { location: bestPair ? `Pair ${bestPair}` : "Global", evidenceLines };
}

// Excess Kurtosis — global statistic; per-column when stratified.
function excessKurtosis(r /*, ctx */) {
  const pooledKurt = r.pooledKurtosis;
  const kurtDev = parseNum(r.kurtDeviation);
  const adaptive = parseNum(r.adaptiveThreshold);
  const pooledN = r.pooledN;
  const isPromoted = !!r.isPromoted;
  const adP = r._andersonDarlingP;
  const kurtP = r._kurtosisP;
  const direction = Number.isFinite(kurtDev) && kurtDev < 0 ? "platykurtic (too uniform)" : "leptokurtic (too peaked)";

  const evidenceLines = [];
  const stat = Number.isFinite(pooledKurt) ? pooledKurt.toFixed(3) : String(pooledKurt);
  const dev = Number.isFinite(kurtDev) ? formatSignedDelta(kurtDev, 3) : String(r.kurtDeviation);
  const adapStr = Number.isFinite(adaptive) ? adaptive.toFixed(3) : String(r.adaptiveThreshold);

  // Use whichever test drove the flag.
  const usedAD = r.andersonDarlingP != null;
  const testStat = usedAD ? `A² (Anderson–Darling)` : `pooled κ`;
  const testP = usedAD ? formatP(adP) : formatP(kurtP);
  evidenceLines.push(
    `Pooled kurtosis = ${stat}, κ-deviation ${dev} (${direction}; effect-size threshold ${adapStr}); ${testStat} p = ${testP} at pooled N = ${pooledN}.`
  );
  if (isPromoted) {
    evidenceLines.push(`Promoted via condition-stratified BH-FDR — at least one condition flags individually.`);
  }
  return { location: "Global", evidenceLines };
}

// Autocorrelation — global lag-1 + higher-lag promotion.
function autocorrelation(r /*, ctx */) {
  const pooledR1 = r.pooledMeanR1;
  const pooledT = r.pooledT;
  const pooledP = r.pooledP;
  const nSig = r.nSignificant;
  const nPairs = r.nPairs;
  const lagTable = Array.isArray(r.lagTable) ? r.lagTable : [];
  const higherLagPromoted = !!r.higherLagPromoted;

  const evidenceLines = [];
  evidenceLines.push(
    `Pooled lag-1 r = ${pooledR1} across ${nPairs} replicate ${pl(nPairs, "pair")} (t = ${pooledT}, p = ${formatP(pooledP)}); ` +
    `${nSig} of ${nPairs} ${pl(nPairs, "pair")} reach BH-FDR adjusted significance at lag 1.`
  );
  if (higherLagPromoted && lagTable.length > 0) {
    const promoted = lagTable.filter(l => l.isPromotionTrigger);
    if (promoted.length > 0) {
      const frags = promoted.map(l => `lag ${l.lag} (pooled r = ${l.pooledR}, ${l.pairsSig}/${l.pairsTotal} pairs significant)`);
      evidenceLines.push(`Higher-lag promotion to MODERATE: ${frags.join(", ")}.`);
    }
  }
  return { location: "Global", evidenceLines };
}

// Windowed Autocorrelation — per-pair windowed scan.
function windowedAutocorrelation(r /*, ctx */) {
  const nSig05 = r.nSig05;
  const nSig01 = r.nSig01;
  const nWin = r.nWindowsTotal;
  const nPairs = r.nPairs;
  const details = Array.isArray(r.details) ? r.details : [];
  const p = r.primaryP;

  const evidenceLines = [];
  evidenceLines.push(
    `${nSig05} of ${nWin} (pair × window) units flag at BH-FDR adjusted p < 0.05 (${nSig01} at adj-p < 0.01) ` +
    `across ${nPairs} replicate ${pl(nPairs, "pair")}; best adj-p = ${formatP(p)}.`
  );
  if (details.length > 0) {
    const top = details.slice(0, 3).map(d =>
      `pair ${d.pair} rows ${d.startRow}–${d.endRow} (r = ${parseNum(d.r).toFixed(3)}, adj-p = ${formatP(d.adjP)})`
    );
    evidenceLines.push(`Top windows — ${top.join("; ")}.`);
  }

  // Location: list flagged windows or summary if many.
  let location = "Global";
  if (details.length > 0) {
    const sigDetails = details.filter(d => parseNum(d.adjP) < 0.05);
    if (sigDetails.length > 0 && sigDetails.length <= 3) {
      location = sigDetails.map(d => `pair ${d.pair} rows ${d.startRow}–${d.endRow}`).join("; ");
    } else if (sigDetails.length > 3) {
      location = `${sigDetails.length} flagged (pair × window) units across ${nPairs} ${pl(nPairs, "pair")}`;
    }
  }
  return { location, evidenceLines };
}

// Runs Test — global runs Z + per-pair when stratified.
function runsTest(r /*, ctx */) {
  const pooledZ = r.pooledMeanZ;
  const pooledT = r.pooledT;
  const pooledP = r.pooledP;
  const nSig = r.nSignificant;
  const nPairs = r.nPairs;
  const obsOverExp = r.obsOverExp;
  const worstPair = r.worstPairLabel;

  const z = parseNum(pooledZ);
  const direction = Number.isFinite(z) && z < 0 ? "too few runs (consecutive same-sign streaks)" : "too many runs (over-alternation)";

  const evidenceLines = [];
  evidenceLines.push(
    `Pooled runs Z = ${pooledZ} (${direction}); observed/expected runs ratio = ${parseNum(obsOverExp).toFixed(2)}; ` +
    `pooled t = ${pooledT}, p = ${formatP(pooledP)} across ${nPairs} ${pl(nPairs, "pair")}.`
  );
  if (nSig > 0 && worstPair) {
    evidenceLines.push(`${nSig} of ${nPairs} ${pl(nPairs, "pair")} flag individually; most extreme: ${worstPair}.`);
  }
  return { location: "Global", evidenceLines };
}

// Noise Scaling With Measurement Size — global slope vs expected.
function noiseScaling(r /*, ctx */) {
  const obs = r.observedSlope;
  const expSlope = r.expectedSlope;
  const slopeSE = r.slopeSE;
  const assay = r.assay;
  const p = r.primaryP;
  const evidenceLines = [];
  const assayBit = assay && assay !== "general" ? ` for ${assay} data` : "";
  if (expSlope && expSlope !== "—") {
    evidenceLines.push(
      `Observed log-log mean–variance slope = ${obs} ± ${slopeSE} SE${assayBit}; expected slope ≈ ${expSlope} ` +
      `(0=additive, 1=Poisson, 2=proportional); z-test p = ${formatP(p)}.`
    );
  } else {
    evidenceLines.push(
      `Observed log-log mean–variance slope = ${obs} ± ${slopeSE} SE${assayBit}; ` +
      `outside the [0, 2] range of known noise models (p = ${formatP(p)}).`
    );
  }
  return { location: "Global", evidenceLines };
}

// Within-Row Variance — per-row anchoring (Mahalanobis-shaped).
function withinRowVariance(r /*, ctx */) {
  const indices = Array.isArray(r.flaggedRowIndices) ? r.flaggedRowIndices : [];
  const nOutliers = r.nOutliers;
  const nValid = r.nValid;
  const outlierFrac = r.outlierFrac;
  const expectedOut = r.expectedOutliers;
  const flagged = Array.isArray(r.flaggedRows) ? r.flaggedRows : [];
  const smooth = flagged.filter(f => f.direction === "too smooth");
  const noisy = flagged.filter(f => f.direction === "too noisy");
  const p = r.primaryP;

  const location = formatRowIndexList(indices, nValid);
  const evidenceLines = [];

  evidenceLines.push(
    `${nOutliers} of ${nValid} rows have within-row variance flagged (${outlierFrac}, vs ${expectedOut} expected under the mean-variance trend); ` +
    `best per-row p = ${formatP(p)}.`
  );
  if (smooth.length + noisy.length > 0) {
    const directionParts = [];
    if (smooth.length > 0) directionParts.push(`${smooth.length} too-smooth`);
    if (noisy.length > 0) directionParts.push(`${noisy.length} too-noisy`);
    evidenceLines.push(`Direction breakdown: ${directionParts.join(", ")}.`);
  }
  return { location, evidenceLines };
}

// Regional Noise Homogeneity — window-anchored.
function regionalNoiseHomogeneity(r /*, ctx */) {
  const bestWin = r.bestWindowRows;
  const bestRatio = r.bestVarRatio;
  const bestCol = r.bestAnomCol;
  const scanP = parseNum(r.scanP) || r.primaryP;
  const details = Array.isArray(r.details) ? r.details : [];
  const direction = details[0]?.direction || "anomalous";
  const dirWord = direction === "reduced" ? "quieter" : direction === "elevated" ? "noisier" : "anomalous";

  const evidenceLines = [];
  evidenceLines.push(
    `Window scan detects ${dirWord} noise in column ${bestCol} rows ${bestWin} (${bestRatio} variance ratio); ` +
    `scan p = ${formatP(scanP)}.`
  );
  if (details.length > 1) {
    const tops = details.slice(0, 3).map(d => `rows ${d.rows} (${d.ratio} ${d.direction === "reduced" ? "quieter" : d.direction === "elevated" ? "noisier" : "deviation"})`);
    evidenceLines.push(`Top ${tops.length} windows — ${tops.join("; ")}.`);
  }

  const location = bestWin ? `Column ${bestCol}, rows ${bestWin}` : "Global";
  return { location, evidenceLines };
}

// Row-Mean Runs — best-sequence run anchored.
function rowMeanRuns(r /*, ctx */) {
  const seq = r.bestSequence;
  const runs = r.bestRuns;
  const expected = r.bestExpected;
  const z = parseNum(r.bestZ);
  const p = r.primaryP;
  const direction = Number.isFinite(z) && z < 0 ? "too few crossings (sustained trend)" : "too many crossings (over-alternation)";

  const evidenceLines = [];
  evidenceLines.push(
    `Best sequence "${seq}": ${runs} observed runs vs ${expected} expected (Z = ${r.bestZ}, ${direction}); pooled p = ${formatP(p)}.`
  );
  if (r.windowSigCount > 0) {
    evidenceLines.push(`${r.windowSigCount} of ${r.nWindowsTested} windowed sub-units also flag at BH-FDR adjusted p < 0.05.`);
  }
  return { location: `Sequence "${seq}"`, evidenceLines };
}

// Missing Data Pattern — DupDet-shaped structural detail.
function missingDataPattern(r /*, ctx */) {
  const nMissing = r.nMissing;
  const missRate = r.missRate;
  const nPair = r.nPairwiseHits || 0;
  const nCond = r.nCondHits || 0;
  const nBlock = r.nBlockHits || 0;
  const p = r.primaryP;
  const blockHits = Array.isArray(r.blockHits) ? r.blockHits : [];

  const evidenceLines = [];
  const parts = [];
  if (nBlock > 0) parts.push(`${nBlock} rectangular missing ${pl(nBlock, "block")}`);
  if (nCond > 0) parts.push(`${nCond} condition-dependent ${pl(nCond, "column")}`);
  if (nPair > 0) parts.push(`${nPair} pairwise-correlated missing ${pl(nPair, "column pair")}`);
  evidenceLines.push(
    `${formatCount(nMissing)} missing cells (${missRate}); ` +
    (parts.length > 0 ? `${parts.join("; ")}; ` : "") +
    `best adj-p = ${formatP(p)}.`
  );
  if (blockHits.length > 0) {
    const top = blockHits.slice(0, 3).map(b => `rows ${b.startRow}–${b.endRow} × cols ${b.cols.join(",")} (${b.height}×${b.width})`);
    evidenceLines.push(`Top missing ${pl(top.length, "block")}: ${top.join("; ")}.`);
  }
  const location = nBlock > 0
    ? `${nBlock} missing ${pl(nBlock, "block")}`
    : nCond > 0
      ? `${nCond} condition-dependent ${pl(nCond, "column")}`
      : nPair > 0
        ? `${nPair} pairwise ${pl(nPair, "column pair")}`
        : "Global";
  return { location, evidenceLines };
}

// Cross-Condition Rank Correlation — global rank similarity.
function crossConditionRankCorrelation(r /*, ctx */) {
  const meanRho = r.meanRho;
  const nSus = r.nSuspicious || 0;
  const nPairs = r.nConditionPairs;
  const p = r.primaryP;
  const details = Array.isArray(r.details) ? r.details : [];
  const top = details.find(d => d?.suspicious) || details[0];

  const evidenceLines = [];
  evidenceLines.push(
    `Mean cross-condition rank correlation ρ = ${meanRho} across ${nPairs} condition ${pl(nPairs, "pair")}; ` +
    `${nSus} ${pl(nSus, "pair")} flagged as suspicious (best LOO-adjusted p = ${formatP(p)}).`
  );
  if (top?.pair && top.spearmanR != null) {
    evidenceLines.push(`Top pair ${top.pair} at ρ = ${top.spearmanR} (interpretation: ${top.interpretation || "—"}).`);
  }
  return { location: top?.pair ? `Pair ${top.pair}` : "Global", evidenceLines };
}

// Modality Test — per-column dip statistic; collapse to "K of N".
function modalityTest(r /*, ctx */) {
  const nFlagged = r.nFlagged || 0;
  const nTested = r.nTested;
  const colDips = Array.isArray(r.colDips) ? r.colDips : [];
  const flagged = colDips.filter(c => c.flagged);
  const details = Array.isArray(r.details) ? r.details : [];
  const p = r.primaryP;

  const evidenceLines = [];
  evidenceLines.push(
    `${nFlagged} of ${nTested} columns reject unimodality at BH-FDR adjusted p < 0.01 (best column p = ${formatP(p)}). ` +
    `Hartigan dip statistic against uniform-reference null.`
  );
  if (flagged.length > 0) {
    const cols = flagged.slice(0, 6).map(c => `col ${c.col} (dip = ${parseNum(c.dip).toFixed(4)})`);
    evidenceLines.push(`Flagged columns — ${cols.join(", ")}${flagged.length > 6 ? `, … (${flagged.length} total)` : ""}.`);
  }
  const location = nFlagged > 0
    ? `${nFlagged} of ${nTested} ${pl(nTested, "column")}`
    : "Global";
  return { location, evidenceLines };
}

// Column Goodness-of-Fit — per-column A-D ratio; collapse to "K of N".
function columnGoodnessOfFit(r /*, ctx */) {
  const nFlagged = r.nFlagged || 0;
  const nTested = r.nTested;
  const nHigh = r.nHigh || 0;
  const nLow = r.nLow || 0;
  const colRatios = Array.isArray(r.colRatios) ? r.colRatios : [];
  const flagged = colRatios.filter(c => c.flagged);
  const p = r.primaryP;

  const evidenceLines = [];
  const dirBits = [];
  if (nHigh > 0) dirBits.push(`${nHigh} mismatch (A² too large)`);
  if (nLow > 0) dirBits.push(`${nLow} too-tight (A² too small)`);
  evidenceLines.push(
    `${nFlagged} of ${nTested} columns deviate from the moment-matched {Normal, Poisson, NB} family at BH-FDR adjusted p < 0.01 ` +
    `(${dirBits.join(", ")}); best column p = ${formatP(p)}.`
  );
  if (flagged.length > 0) {
    const cols = flagged.slice(0, 6).map(c => `col ${c.col} (A² ratio = ${parseNum(c.ratio).toFixed(2)}, ${c.direction})`);
    evidenceLines.push(`Flagged columns — ${cols.join(", ")}${flagged.length > 6 ? `, … (${flagged.length} total)` : ""}.`);
  }
  const location = nFlagged > 0
    ? `${nFlagged} of ${nTested} ${pl(nTested, "column")}`
    : "Global";
  return { location, evidenceLines };
}

// Entropy / Zipf Analysis — per-column entropy z-score; collapse to "K of N".
function entropyZipf(r /*, ctx */) {
  const nFlagged = r.nFlagged || 0;
  const nLow = r.nLow || 0;
  const nHigh = r.nHigh || 0;
  const nTested = r.nTested;
  const colRatios = Array.isArray(r.colRatios) ? r.colRatios : [];
  const flagged = colRatios.filter(c => c.flagged);
  const p = r.primaryP;

  const evidenceLines = [];
  const dirBits = [];
  if (nLow > 0) dirBits.push(`${nLow} low entropy (few distinct values)`);
  if (nHigh > 0) dirBits.push(`${nHigh} high entropy (over-randomised)`);
  evidenceLines.push(
    `${nFlagged} of ${nTested} columns deviate from the parametric-bootstrap entropy null at BH-FDR adjusted p < 0.01 ` +
    `(${dirBits.join(", ")}); best column p = ${formatP(p)}.`
  );
  if (flagged.length > 0) {
    const cols = flagged.slice(0, 6).map(c => `col ${c.col} (${c.direction})`);
    evidenceLines.push(`Flagged columns — ${cols.join(", ")}${flagged.length > 6 ? `, … (${flagged.length} total)` : ""}.`);
  }
  const location = nFlagged > 0
    ? `${nFlagged} of ${nTested} ${pl(nTested, "column")}`
    : "Global";
  return { location, evidenceLines };
}

// Blocked Mahalanobis — block-anchored sliding-window scan.
function blockedMahalanobis(r /*, ctx */) {
  const details = Array.isArray(r.details) ? r.details : [];
  const sig = details.filter(d => d?.significant);
  const conditions = Array.isArray(r.conditionNames) ? r.conditionNames : [];
  const nUnits = r.nUnits;
  const nWindowsTotal = r.nWindowsTotal;
  const p = r.primaryP;

  const evidenceLines = [];
  evidenceLines.push(
    `${sig.length} of ${nUnits} (pass × condition) BH-FDR units flag (${nWindowsTotal} sliding windows scanned across ${conditions.length} ${pl(conditions.length, "condition")}); ` +
    `best adj-p = ${formatP(p)}.`
  );
  if (sig.length > 0) {
    const top = sig.slice(0, 3).map(d => {
      const dirWord = d.passKey === "mu" ? "block-mean separation" : "covariance inflation";
      return `${d.condition} rows ${d.startRow}–${d.endRow} (${dirWord}, ${d.statType} = ${d.stat})`;
    });
    evidenceLines.push(`Top flagged blocks — ${top.join("; ")}.`);
  }
  let location = "Global";
  if (sig.length === 1) {
    location = `${sig[0].condition} rows ${sig[0].startRow}–${sig[0].endRow}`;
  } else if (sig.length > 1) {
    location = `${sig.length} block-windows across ${conditions.length} ${pl(conditions.length, "condition")}`;
  }
  return { location, evidenceLines };
}

// Cross-Condition Consistency — Track-D framework, per-property × per-pair.
function crossConditionConsistency(r /*, ctx */) {
  const top = r.top;
  const nFlagged = r.nFlagged || 0;
  const nFlaggedPairs = r.nFlaggedPairs || 0;
  const nProp = r.nProperties;
  const nPairs = r.nPairs;
  const p = r.primaryP;

  const evidenceLines = [];
  if (top) {
    const dStat = parseNum(top.d);
    const dThresh = parseNum(top.thresh);
    const statBit = Number.isFinite(dStat) && Number.isFinite(dThresh)
      ? `, statistic = ${dStat.toFixed(3)} vs threshold ${dThresh.toFixed(3)}`
      : "";
    evidenceLines.push(
      `Top flagged unit: ${top.pair} on "${top.property}" — too ${top.direction} (BH-FDR adj-p = ${formatP(top.adjP)}${statBit}).`
    );
  } else {
    evidenceLines.push(`Best adj-p across ${nProp} properties × ${nPairs} condition pairs: ${formatP(p)}.`);
  }
  if (nFlagged > 1) {
    evidenceLines.push(`${nFlagged} property-pair units flagged across ${nFlaggedPairs} ${pl(nFlaggedPairs, "condition pair")}.`);
  }
  const location = top ? `${top.pair} on ${top.property}` : "Global";
  return { location, evidenceLines };
}

// ── Registry ────────────────────────────────────────────────────────────

export const FINDING_COMPOSERS = {
  // Anchors (calibration-locked, S162b)
  "LOESS Residual Analysis":       loessResidualAnalysis,
  "Benford's Law (First Digit)":   benfordFirstDigit,
  "Inter-Replicate Correlation":   interReplicateCorrelation,
  "Selective Noise Partitioning":  selectiveNoisePartitioning,
  "Mahalanobis Row Outlier":       mahalanobisRowOutlier,
  "Exact Duplicate Detection":     exactDuplicateDetection,
  "Baseline Balance":              baselineBalance,

  // Predicted-shape per calibration §Anchors-not-in-this-set
  "Benford's Law (Second Digit)":  benfordSecondDigit,
  "Terminal Digit Uniformity":     terminalDigitUniformity,
  "Decimal Precision Consistency": decimalPrecisionConsistency,
  "Value-Frequency Spike":         valueFrequencySpike,
  "Constant-Offset Blocks":        constantOffsetBlocks,
  "Residual Spike Correlation":    residualSpikeCorrelation,
  "Excess Kurtosis":               excessKurtosis,
  "Autocorrelation":               autocorrelation,
  "Windowed Autocorrelation":      windowedAutocorrelation,
  "Runs Test":                     runsTest,
  "Noise Scaling With Measurement Size": noiseScaling,
  "Within-Row Variance":           withinRowVariance,
  "Regional Noise Homogeneity":    regionalNoiseHomogeneity,
  "Row-Mean Runs":                 rowMeanRuns,
  "Missing Data Pattern":          missingDataPattern,
  "Cross-Condition Rank Correlation": crossConditionRankCorrelation,
  "Modality Test":                 modalityTest,
  "Column Goodness-of-Fit":        columnGoodnessOfFit,
  "Entropy / Zipf Analysis":       entropyZipf,
  "Blocked Mahalanobis":           blockedMahalanobis,
  "Cross-Condition Consistency":   crossConditionConsistency,
};

/**
 * Dispatch: look up the per-test composer for `r.name` and invoke it.
 * Returns null when no composer is registered (caller falls back to
 * Phase A `evidenceOf(r)` + `locationOf(r)` in handoffModel.js).
 *
 * @param {object} r       Engine result object (one element of `results`).
 * @param {object} ctx     Dataset + config context. Minimal shape today:
 *                         `{ dataset: { conditions, nRows, nCols, vstLabel } }`.
 * @returns {{location:string, evidenceLines:string[]}|null}
 */
export function composeFinding(r, ctx) {
  if (!r || typeof r.name !== "string") return null;
  const fn = FINDING_COMPOSERS[r.name];
  if (typeof fn !== "function") return null;
  try {
    return fn(r, ctx);
  } catch (err) {
    // Composer threw on unexpected result shape — fall back to Phase A.
    // Caller treats null as "no bespoke composer ran, use Phase A".
    if (typeof console !== "undefined") {
      console.warn(`[findingComposers] ${r.name} composer threw — falling back to Phase A:`, err);
    }
    return null;
  }
}

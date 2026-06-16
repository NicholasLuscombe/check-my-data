/* ── Key Finding Templates ──
   One function per test. Each receives the test result object and returns
   a plain-text finding string, or null if the test is not flagged.
   Fallback: generic "{testName}: flagged (p = {p})" if fields are missing. */

import { fmtPBadge } from "./thresholds.js";

function isFlagged(r) {
  return r.flag === "HIGH" || r.flag === "FLAGGED" || r.flag === "MODERATE" || r.flag === "NOTED";
}

function fmt(v, d = 2) {
  if (v == null) return "—";
  return typeof v === "number" ? v.toFixed(d) : String(v);
}

function fallback(r) {
  console.warn(`[KeyFindings] Missing fields for ${r.name} — using fallback`);
  return `${r.name}: flagged. ${fmtPBadge(r.primaryP)}`;
}

function pl(n, s = "s") { return n === 1 ? "" : s; }

// ── UNUSUAL DIGITS ──────────────────────────────────────────────────

function terminalDigit(r) {
  if (!isFlagged(r)) return null;
  try {
    const n = r.nValues;
    if (!n) return fallback(r);
    const details = r.details || [];
    // Find digits flagged as strongly avoided by the engine
    const avoided = details.filter(d => d.isAvoided)
      .map(d => d.digit).filter(d => d != null);
    const avStr = avoided.length > 0 ? ` — digit${pl(avoided.length)} ${avoided.join(", ")} appear${avoided.length === 1 ? "s" : ""} far less often than expected` : "";
    return `Last digits are not uniformly distributed${avStr}. ${n} values tested. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function benford1(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.nValues == null) return fallback(r);
    return `Leading digits deviate from the expected Benford distribution (MAD = ${fmt(r.MAD, 4)}). ${r.nValues} values tested. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function benford2(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.nValues == null) return fallback(r);
    const details = r.details || [];
    // Find digit with largest absolute deviation from expected
    const worst = details.length > 0
      ? details.reduce((a, b) => {
          const devA = Math.abs(a.observed - parseFloat(a.expected));
          const devB = Math.abs(b.observed - parseFloat(b.expected));
          return devB > devA ? b : a;
        })
      : null;
    if (worst?.observedPct && worst?.benfordPct) {
      return `Second digits deviate from the expected Benford distribution — digit ${worst.digit} appears at ${worst.observedPct} vs ${worst.benfordPct} expected. ${fmtPBadge(r.primaryP)}`;
    }
    return `Second digits deviate from the expected Benford distribution (MAD = ${fmt(r.MAD, 4)}). ${r.nValues} values tested. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function decimalPrecision(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.gapsDetected == null) return fallback(r);
    const gapDesc = r.gapAtDp != null
      ? `${r.gapsDetected} gap${pl(r.gapsDetected)} in precision at ${r.gapAtDp} decimal place${pl(r.gapAtDp)}`
      : `${r.gapsDetected} gap${pl(r.gapsDetected)} in precision levels`;
    return `Values have inconsistent decimal precision — ${gapDesc}. This pattern is unlikely from a single recording instrument. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function valueFrequency(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.nSpikes == null) return fallback(r);
    const spikes = (r.details || []).filter(d => d.value != null && d.observed != null).slice(0, 3);
    if (spikes.length === 1) {
      const s = spikes[0];
      return `Value ${s.value} appears ${s.observed} times (expected ~${Math.round(parseFloat(s.expected))}). ${fmtPBadge(r.primaryP)}`;
    }
    if (spikes.length > 1) {
      const parts = spikes.map(s => `${s.value} (${s.observed}\u00d7)`);
      return `Values ${parts.join(", ")} appear far more often than expected. ${fmtPBadge(r.primaryP)}`;
    }
    return `${r.nSpikes} value${pl(r.nSpikes)} appear${r.nSpikes === 1 ? "s" : ""} far more often than expected. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

// ── COPIED VALUES ───────────────────────────────────────────────────

function duplicateDetection(r) {
  if (!isFlagged(r)) return null;
  try {
    const parts = [];
    // Duplicated row pairs/groups
    const groups = r.rowDupGroupList || [];
    const nGroups = groups.length;
    if (nGroups > 0) {
      const nPairs = groups.reduce((s, g) => s + (g.rows?.length || g.count || 0) - 1, 0);
      parts.push(`${nPairs} duplicated row pair${pl(nPairs)}`);
    }
    // Block copies (non-column-match) and column-pair matches
    const blocks = r.blockCopies || [];
    const colPairs = blocks.filter(b => b.isColumnMatch);
    const rowBlocks = blocks.filter(b => !b.isColumnMatch);
    if (colPairs.length > 0) parts.push(`${colPairs.length} column pair${pl(colPairs.length)}`);
    if (rowBlocks.length > 0) parts.push(`${rowBlocks.length} block${pl(rowBlocks.length)}`);
    // Within-row coincidences
    const nWR = r.withinRowMatches || 0;
    const expWR = r.withinRowExpected != null ? Math.round(parseFloat(r.withinRowExpected)) : 0;
    if (nWR > 0) parts.push(`${nWR} within-row (${expWR} expected)`);
    if (!parts.length) return fallback(r);
    return `Exact duplicates detected: ${parts.join(", ")}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function constantOffset(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.consecutiveEqualDiffs == null) return fallback(r);
    return `${r.consecutiveEqualDiffs} block${pl(r.consecutiveEqualDiffs)} of rows where values differ by a constant offset. Consistent with copy-paste with a uniform shift applied. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function residualSpike(r) {
  if (!isFlagged(r)) return null;
  try {
    const pairs = (r.pairDetails || [])
      .map(p => ({ pair: p.pair, rho: parseFloat(p.r), highCorrelation: p.highCorrelation }))
      .filter(p => !isNaN(p.rho));

    // Determine signal mode from best overlap pair's ρ
    const bestMatch = r.bestPair ? pairs.find(p => p.pair === r.bestPair) : null;
    const bestRho = bestMatch ? Math.abs(bestMatch.rho) : 0;
    const isGlobalMode = bestRho > 0.3;

    if (isGlobalMode) {
      // Global correlation — ρ is the signal
      const highPairs = pairs.filter(p => p.highCorrelation).sort((a, b) => b.rho - a.rho);
      const reported = highPairs.length > 0 ? highPairs : pairs.length > 0 ? [pairs.sort((a, b) => b.rho - a.rho)[0]] : [];
      if (reported.length === 1) {
        const p = reported[0];
        const [condA, condB] = p.pair.split(" vs ");
        return `Residual noise in ${condA} and ${condB} follows the same pattern (ρ = ${p.rho.toFixed(2)}) — when one condition has a large residual, so does the other. ${fmtPBadge(r.primaryP)}`;
      }
      if (reported.length > 1) {
        const top = reported.length > 3 ? reported.slice(0, 3) : reported;
        const pairList = top.map(p => {
          const [a, b] = p.pair.split(" vs ");
          return `${a} vs ${b} (ρ = ${p.rho.toFixed(2)})`;
        }).join(", ");
        const suffix = reported.length > 3 ? `, and ${reported.length - 3} more pairs show correlated residuals` : "";
        return `Residual noise follows the same pattern across conditions — ${pairList}${suffix}. When one condition has a large residual, so do the others. ${fmtPBadge(r.primaryP)}`;
      }
    } else {
      // Coordinated extremes — overlap count is the signal
      const overlap = r.nOverlap || 0;
      const expected = parseFloat(r.expectedOverlap) || 0;
      const [condA, condB] = (r.bestPair || "").split(" vs ");
      if (condA && condB) {
        return `${overlap} of the noisiest rows are shared between ${condA} and ${condB} (${expected.toFixed(0)} expected) — coordinated noise pattern. ${fmtPBadge(r.primaryP)}`;
      }
      return `${overlap} rows share coordinated noise across conditions (${expected.toFixed(0)} expected by chance). ${fmtPBadge(r.primaryP)}`;
    }

    // Fallback
    if (r.topK == null) return fallback(r);
    return `Residual spikes are correlated across columns — ${r.topK} rows show simultaneous outliers where independent noise would not. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function interReplicateCorrelation(r, toFileRow) {
  if (!isFlagged(r)) return null;
  try {
    const details = r.details || [];
    const f = toFileRow || (x => x);

    // 1. Globally suspicious pairs
    const susPair = details.find(d => d.suspicious);
    if (susPair) {
      const cond = susPair.condition ? ` in ${susPair.condition}` : "";
      return `Replicates ${susPair.pair} are more correlated than expected${cond} (r = ${susPair.r}). ${fmtPBadge(r.primaryP)}`;
    }

    // 2. Windowed-scan entries (informational)
    const winEntry = details.find(d => d.source === "window" && d.significant);
    if (winEntry) {
      const cond = winEntry.condition ? ` in ${winEntry.condition}` : "";
      const rows = winEntry.startRow != null ? `, rows ${f(winEntry.startRow)}–${f(winEntry.endRow)}` : "";
      const rVal = winEntry.rWin ? ` (r = ${winEntry.rWin})` : "";
      return `Replicates ${winEntry.pair}${cond} are locally more correlated than expected${rows}${rVal}. ${fmtPBadge(r.primaryP)}`;
    }

    // 3. Fallback
    if (r.meanR != null) {
      return `Replicate correlations are higher than expected (mean r = ${r.meanR}). ${fmtPBadge(r.primaryP)}`;
    }
    return fallback(r);
  } catch { return fallback(r); }
}

// ── TOO PERFECT ─────────────────────────────────────────────────────

function carlisleBalance(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.nFeatures == null) return fallback(r);
    const metric = r.ksD != null
      ? `${r.nExcess} of ${r.nFeatures} features are more balanced than expected (KS D = ${fmt(r.ksD, 3)})`
      : `${r.nExcess} of ${r.nFeatures} features are more balanced than expected`;
    return `Experimental groups are more balanced than random assignment would produce — ${metric}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function crossCondConsistency(r) {
  if (!isFlagged(r)) return null;
  try {
    const top = r.top;
    if (!top) return fallback(r);
    const moreN = (r.nFlagged || 0) - 1;
    const morePart = moreN > 0
      ? ` ${moreN} additional unit${pl(moreN)} flagged across ${r.nFlaggedPairs || 0} pair${pl(r.nFlaggedPairs || 0)}.`
      : "";
    return `${top.pair} on ${top.property}: too ${top.direction} (${fmtPBadge(r.primaryP)}).${morePart}`;
  } catch { return fallback(r); }
}

function rankCorrelation(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.meanRho == null) return fallback(r);
    const details = r.details || [];
    const top = details.find(d => d.suspicious);
    if (top?.pair) {
      const rho = top.spearmanR != null ? top.spearmanR : r.meanRho;
      return `${top.pair} have near-perfect rank correlation (\u03C1 = ${fmt(Number(rho), 3)}). One condition may be derived from the other. ${fmtPBadge(r.primaryP)}`;
    }
    return `Conditions have near-perfect rank correlation (mean \u03C1 = ${fmt(Number(r.meanRho), 3)}). One condition may be derived from another. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function mahalanobis(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.nOutliers == null || r.nRows == null) return fallback(r);
    return `${r.nOutliers} of ${r.nRows} rows are multivariate outliers — individually plausible values that are jointly improbable. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function blockedMahalanobis(r, toFileRow) {
  if (!isFlagged(r)) return null;
  try {
    const details = r.details || [];
    const sig = details.filter(d => d.significant);
    if (!sig.length) return fallback(r);
    // Best (lowest adj-p) flagged block sets the localised message.
    const best = sig[0];
    const f = toFileRow || (x => x);
    const dir = best.passKey === 'mu'
      ? "block mean differs from the rest of the condition"
      : "block-level cross-replicate correlation differs from the rest of the condition";
    const nBlocks = sig.length;
    const extra = nBlocks > 1 ? ` (+${nBlocks - 1} additional block${pl(nBlocks - 1)})` : "";
    return `In ${best.condition}, rows ${f(best.startRow)}\u2013${f(best.endRow)} — ${dir}${extra}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

// ── UNNATURAL NOISE ─────────────────────────────────────────────────

function noiseScaling(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.observedSlope == null) return fallback(r);
    const assayStr = r.assay && r.assay !== "general" ? ` for ${r.assay} data` : "";
    const dir = r.expectedSlope != null && r.expectedSlope !== "—"
      ? ` (observed ${r.observedSlope} vs expected ${r.expectedSlope})`
      : ` (slope = ${r.observedSlope})`;
    return `Noise does not scale with signal magnitude as expected${assayStr}${dir}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function kurtosis(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.kurtDeviation == null) return fallback(r);
    const dev = Number(r.kurtDeviation);
    // Negative kurtDeviation = platykurtic (too uniform), positive = leptokurtic (too peaked)
    const isPlaty = dev < 0;
    const dir = isPlaty ? "too uniform (platykurtic)" : "too peaked (leptokurtic)";
    const interp = isPlaty
      ? "consistent with generated rather than measured data"
      : "consistent with a mixture of sources";
    return `Residuals are ${dir} — ${interp}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function autocorrelation(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.pooledMeanR1 == null) return fallback(r);
    return `Consecutive residuals are correlated (mean |r| = ${fmt(Math.abs(Number(r.pooledMeanR1)), 3)}) — noise structure is inherited rather than independent. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function runsTest(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.pooledMeanZ == null) return fallback(r);
    const z = Number(r.pooledMeanZ);
    const dir = z < 0 ? "Too few runs (sign changes)" : "Too many runs (over-alternation)";
    const loc = r.worstPairLabel ? `, most extreme in ${r.worstPairLabel}` : "";
    return `${dir} in residual sign sequences${loc}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function withinRowVariance(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.nOutliers == null) return fallback(r);
    return `${r.nOutliers} row${pl(r.nOutliers)} ha${r.nOutliers === 1 ? "s" : "ve"} suspiciously low variance across replicates — values within each row are more similar than the column noise predicts. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function entropy(r) {
  if (!isFlagged(r)) return null;
  try {
    const nLow = r.nLow || 0;
    const nHigh = r.nHigh || 0;
    const nFlagged = r.nFlagged || (nLow + nHigh);
    if (!nFlagged) return fallback(r);
    const dir = nLow > nHigh ? "Too few distinct values (low entropy)" : "Too many distinct values (high entropy)";
    const details = r.details || [];
    const flagged = details.filter(d => d.flag === "HIGH" || d.flag === "MODERATE");
    const colList = flagged.length > 0 && flagged.length <= 3
      ? `: ${flagged.map(d => d.Col != null ? `Col ${d.Col}` : (d.column || d.col || "?")).join(", ")}`
      : "";
    return `${dir} in ${nFlagged} column${pl(nFlagged)}${colList}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

// ── UNEVEN SECTIONS ─────────────────────────────────────────────────

function loessResidual(r, toFileRow) {
  if (!isFlagged(r)) return null;
  try {
    if (r.changepointRow == null) return fallback(r);
    const dirMap = { increasing: "higher", decreasing: "lower", increases: "higher", decreases: "lower" };
    const dir = dirMap[r.changepointDirection] || r.changepointDirection || "different";
    const cp = parseInt(r.changepointRow);
    const f = toFileRow || (x => x);
    let secondary = "";
    if (r.secondaryRow != null) {
      const dir2 = dirMap[r.secondaryDirection] || r.secondaryDirection || "different";
      const cp2 = parseInt(r.secondaryRow);
      secondary = ` A second shift between rows ${f(cp2)} and ${f(cp2 + 1)} (${dir2}).`;
    }
    return `Residual noise changes character between rows ${f(cp)} and ${f(cp + 1)} — noise is ${dir} after the changepoint.${secondary} ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function rowMeanRuns(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.bestSequence == null) return fallback(r);
    const z = Number(r.bestZ);
    const dir = z < 0 ? "trend without enough crossings" : "alternate more than expected";
    return `Row averages ${dir} in ${r.bestSequence} — consecutive rows lean the same direction more than chance predicts. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function selectiveNoise(r) {
  if (!isFlagged(r)) return null;
  try {
    if (r.maxMinVarianceRatio == null) return fallback(r);
    const sdRatio = Math.sqrt(parseFloat(r.maxMinVarianceRatio)).toFixed(3);
    return `Replicate columns have significantly different noise levels — max/min SD ratio is ${sdRatio}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function regionalNoise(r, toFileRow) {
  if (!isFlagged(r)) return null;
  try {
    if (r.bestWindowRows == null) return fallback(r);
    const varR = parseFloat(r.bestVarRatio);
    const sdRatio = isNaN(varR) ? "—" : Math.sqrt(varR).toFixed(2) + "×";
    const dir = r.details?.[0]?.direction;
    const dirLabel = dir === "reduced" ? "quieter" : dir === "elevated" ? "noisier" : "different";
    const col = r.bestAnomCol && r.bestAnomCol !== "—" ? `column ${r.bestAnomCol}` : "the dataset";
    const f = toFileRow || (x => x);
    const m = String(r.bestWindowRows).match(/(\d+)\D+(\d+)/);
    const rows = m ? `${f(parseInt(m[1]))}–${f(parseInt(m[2]))}` : r.bestWindowRows;
    return `Noise levels change within ${col} — rows ${rows} are ${sdRatio} ${dirLabel} than its column average. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function columnGof(r) {
  if (!isFlagged(r)) return null;
  try {
    const nFlagged = r.nFlagged || 0;
    const nHigh = r.nHigh || 0;
    const nLow = r.nLow || 0;
    if (!nFlagged) return fallback(r);
    const dir = nHigh > 0 && nLow === 0
      ? "don't fit the reference distribution shape"
      : nLow > 0 && nHigh === 0
      ? "fit the reference distribution too tightly"
      : `deviate from reference shape (${nHigh} mismatch, ${nLow} too-tight)`;
    const flagged = (r.colRatios || []).filter(c => c.flagged);
    const colList = flagged.length > 0 && flagged.length <= 3
      ? `: ${flagged.map(c => `Col ${c.col}`).join(", ")}`
      : "";
    return `${nFlagged} column${pl(nFlagged)} ${dir}${colList}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function modality(r) {
  if (!isFlagged(r)) return null;
  try {
    const nFlagged = r.nFlagged || 0;
    if (!nFlagged) return fallback(r);
    const flagged = (r.colDips || []).filter(c => c.flagged);
    const colList = flagged.length > 0 && flagged.length <= 3
      ? `: ${flagged.map(c => `Col ${c.col}`).join(", ")}`
      : "";
    return `${nFlagged} column${pl(nFlagged)} ${nFlagged === 1 ? "is" : "are"} non-unimodal${colList} — consistent with mixture of sources combined into one declared condition. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function windowedAutocorrelation(r, toFileRow) {
  if (!isFlagged(r)) return null;
  try {
    if (r.nSig05 == null) return fallback(r);
    const top = (r.details || [])[0];
    const f = toFileRow || (x => x);
    if (top?.pair && top?.startRow != null && top?.endRow != null) {
      return `Localised lag-1 autocorrelation in ${r.nSig05} (pair × window) unit${pl(r.nSig05)} (${r.nSig01} at adj-p < 0.01) — most extreme: pair ${top.pair} rows ${f(top.startRow)}–${f(top.endRow)}. ${fmtPBadge(r.primaryP)}`;
    }
    return `Localised lag-1 autocorrelation in ${r.nSig05} (pair × window) unit${pl(r.nSig05)}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

function missingDataPattern(r) {
  if (!isFlagged(r)) return null;
  try {
    const parts = [];
    const nBlock = r.nBlockHits || 0;
    const nCond = r.nCondHits || 0;
    const nPairwise = r.nPairwiseHits || 0;
    if (nBlock > 0) parts.push(`${nBlock} rectangular block${pl(nBlock)} of missing cells`);
    if (nCond > 0) parts.push(`missingness is condition-dependent in ${nCond} column${pl(nCond)}`);
    if (nPairwise > 0) parts.push(`${nPairwise} column pair${pl(nPairwise)} have correlated missingness`);
    if (!parts.length) return fallback(r);
    return `${parts.join("; ")}. ${fmtPBadge(r.primaryP)}`;
  } catch { return fallback(r); }
}

// ── Dispatch map ────────────────────────────────────────────────────

const TEMPLATE_MAP = {
  "Terminal Digit Uniformity": terminalDigit,
  "Benford's Law (First Digit)": benford1,
  "Benford's Law (Second Digit)": benford2,
  "Decimal Precision Consistency": decimalPrecision,
  "Value-Frequency Spike": valueFrequency,
  "Exact Duplicate Detection": duplicateDetection,
  "Constant-Offset Blocks": constantOffset,
  "Residual Spike Correlation": residualSpike,
  "Inter-Replicate Correlation": interReplicateCorrelation,
  "Baseline Balance": carlisleBalance,
  "Cross-Condition Rank Correlation": rankCorrelation,
  "Cross-Condition Consistency": crossCondConsistency,
  "Mahalanobis Row Outlier": mahalanobis,
  "Blocked Mahalanobis": blockedMahalanobis,
  "Noise Scaling With Measurement Size": noiseScaling,
  "Excess Kurtosis": kurtosis,
  "Autocorrelation": autocorrelation,
  "Windowed Autocorrelation": windowedAutocorrelation,
  "Runs Test": runsTest,
  "Within-Row Variance": withinRowVariance,
  "Entropy / Zipf Analysis": entropy,
  "Column Goodness-of-Fit": columnGof,
  "Modality Test": modality,
  "LOESS Residual Analysis": loessResidual,
  "Row-Mean Runs": rowMeanRuns,
  "Selective Noise Partitioning": selectiveNoise,
  "Regional Noise Homogeneity": regionalNoise,
  "Missing Data Pattern": missingDataPattern,
};

/**
 * Generate a finding string for a single test result.
 * @param {object} result - test result object with .name, .flag, .primaryP, etc.
 * @returns {string|null} finding text, or null if not flagged
 */
export function keyFinding(result, toFileRow) {
  if (!isFlagged(result)) return null;
  const fn = TEMPLATE_MAP[result.name];
  if (!fn) {
    console.warn(`[KeyFindings] No template for test: ${result.name}`);
    return `${result.name}: flagged. ${fmtPBadge(result.primaryP)}`;
  }
  return fn(result, toFileRow);
}

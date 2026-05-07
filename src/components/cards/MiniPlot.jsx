/* ── MiniPlot — registry-based dispatch to MiniCard components ── */

import { MiniCard_DuplicateDetection } from "./MiniCard_DuplicateDetection.jsx";
import { MiniCard_ConstantOffset } from "./MiniCard_ConstantOffset.jsx";
import { MiniCard_SelectiveNoise } from "./MiniCard_SelectiveNoise.jsx";
import { MiniCard_InterReplicateCorrelation } from "./MiniCard_InterReplicateCorrelation.jsx";
import { MiniCard_RankCorrelation } from "./MiniCard_RankCorrelation.jsx";
import { MiniCard_Autocorrelation } from "./MiniCard_Autocorrelation.jsx";
import { MiniCard_WindowedAutocorr } from "./MiniCard_WindowedAutocorr.jsx";
import { MiniCard_Kurtosis } from "./MiniCard_Kurtosis.jsx";
import { MiniCard_RowMean } from "./MiniCard_RowMean.jsx";
import { MiniCard_Runs } from "./MiniCard_Runs.jsx";
import { MiniCard_TerminalDigit } from "./MiniCard_TerminalDigit.jsx";
import { MiniCard_Benford } from "./MiniCard_Benford.jsx";
import { MiniCard_DecimalPrecision } from "./MiniCard_DecimalPrecision.jsx";
import { MiniCard_NoiseScaling } from "./MiniCard_NoiseScaling.jsx";
import { MiniCard_LOESS } from "./MiniCard_LOESS.jsx";
import { MiniCard_RegionalNoise } from "./MiniCard_RegionalNoise.jsx";
import { MiniCard_ValueFrequency } from "./MiniCard_ValueFrequency.jsx";
import { MiniCard_Mahalanobis } from "./MiniCard_Mahalanobis.jsx";
import { MiniCard_BlockedMahalanobis } from "./MiniCard_BlockedMahalanobis.jsx";
import { MiniCard_ResidualSpike } from "./MiniCard_ResidualSpike.jsx";
import { MiniCard_WithinRowVariance } from "./MiniCard_WithinRowVariance.jsx";
import { MiniCard_MissingDataPattern } from "./MiniCard_MissingDataPattern.jsx";
import { MiniCard_CarlisleBalance } from "./MiniCard_CarlisleBalance.jsx";
import { MiniCard_Entropy } from "./MiniCard_Entropy.jsx";
import { MiniCard_CrossCondConsistency } from "./MiniCard_CrossCondConsistency.jsx";
import { MiniCard_ColumnGoF } from "./MiniCard_ColumnGoF.jsx";
import { MiniCard_Modality } from "./MiniCard_Modality.jsx";

/**
 * Registry: exact test result name → MiniCard component.
 * Keys must match the `name` field returned by each test in src/tests/.
 * Benford maps two names (First/Second Digit) to the same component.
 */
const MINIPLOT_REGISTRY = {
  "Exact Duplicate Detection":        MiniCard_DuplicateDetection,
  "Constant-Offset Blocks":           MiniCard_ConstantOffset,
  "Selective Noise Partitioning":      MiniCard_SelectiveNoise,
  "Inter-Replicate Correlation":       MiniCard_InterReplicateCorrelation,
  "Cross-Condition Rank Correlation":  MiniCard_RankCorrelation,
  "Autocorrelation":                   MiniCard_Autocorrelation,
  "Windowed Autocorrelation":          MiniCard_WindowedAutocorr,
  "Excess Kurtosis":                   MiniCard_Kurtosis,
  "Row-Mean Runs":                     MiniCard_RowMean,
  "Runs Test":                         MiniCard_Runs,
  "Terminal Digit Uniformity":         MiniCard_TerminalDigit,
  "Benford's Law (First Digit)":       MiniCard_Benford,
  "Benford's Law (Second Digit)":      MiniCard_Benford,
  "Decimal Precision Consistency":     MiniCard_DecimalPrecision,
  "Noise Scaling With Measurement Size": MiniCard_NoiseScaling,
  "LOESS Residual Analysis":           MiniCard_LOESS,
  "Regional Noise Homogeneity":        MiniCard_RegionalNoise,
  "Value-Frequency Spike":             MiniCard_ValueFrequency,
  "Mahalanobis Row Outlier":           MiniCard_Mahalanobis,
  "Blocked Mahalanobis":               MiniCard_BlockedMahalanobis,
  "Residual Spike Correlation":        MiniCard_ResidualSpike,
  "Within-Row Variance":               MiniCard_WithinRowVariance,
  "Missing Data Pattern":              MiniCard_MissingDataPattern,
  "Baseline Balance":                  MiniCard_CarlisleBalance,
  "Entropy / Zipf Analysis":           MiniCard_Entropy,
  "Cross-Condition Consistency":       MiniCard_CrossCondConsistency,
  "Column Goodness-of-Fit":            MiniCard_ColumnGoF,
  "Modality Test":                     MiniCard_Modality,
};

export function MiniPlot({ result, importConfig, rowMap }) {
  if (!result || result.flag === "N/A") return null;
  const Renderer = MINIPLOT_REGISTRY[result.name];
  if (!Renderer) return null;
  return <Renderer result={result} importConfig={importConfig} rowMap={rowMap} />;
}

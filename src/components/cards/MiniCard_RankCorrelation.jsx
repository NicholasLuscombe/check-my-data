/* ── MiniCard: Rank Correlation ── */

import { C, CC, FW, FF, OBS } from "../../constants/tokens.js";
import { TIER_COLOR, cellTextOn, compositeOver } from "../shared/heatmapColors.js";
import { buildCondColorMap } from "../../constants/roles.js";
import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { CorrMatrixSVG } from "../plots/CorrMatrixSVG.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";

export function MiniCard_RankCorrelation({ result, importConfig, rowMap }) {
  const details = result.details || [];
  if (!details.length) return null;

  const nPairs = result.nConditionPairs || details.length;

  // ── Build condition names and ρ lookup from pair details ──
  const condColorMap = buildCondColorMap(importConfig);
  const nameSet = new Set();
  const lookup = {};
  for (const d of details) {
    const parts = d.pair.split(" vs ");
    if (parts.length === 2) {
      const a = parts[0].trim(), b = parts[1].trim();
      nameSet.add(a);
      nameSet.add(b);
      const rho = parseFloat(d.spearmanR);
      lookup[a + "|" + b] = { rho, suspicious: !!d.suspicious };
      lookup[b + "|" + a] = { rho, suspicious: !!d.suspicious };
    }
  }
  const condNames = [...nameSet];
  const hasMatrix = condNames.length >= 2;
  const labelColors = condNames.map(cn => condColorMap[cn]?.text || null);

  // ── Cell colouring — two tiers: Expected / Elevated ──
  const cellBg = (val) => {
    if (!val) return C.BORDER_L;
    return val.suspicious ? TIER_COLOR.MID : CC.OBS;
  };
  // Cleared (observed CC.OBS) tiles render at OBS.solid opacity; flagged tiles
  // stay full-opacity tier colour. Digit colour is picked off the COMPOSITED
  // appearance (token at its opacity over C.BG) so it stays legible as the tile
  // softens; compositeOver at alpha 1 returns the bg unchanged (flagged path).
  const cellOp = (val) => (val && !val.suspicious) ? OBS.solid.fillOpacity : 1;
  const cellTxt = (val) => cellTextOn(compositeOver(cellBg(val), cellOp(val), C.BG));
  const cellBold = (val) => !!val?.suspicious;

  // ── Legend ──
  const legendItems = [
    { color: CC.OBS, label: "Within expected range", opacity: OBS.solid.fillOpacity },
    { color: TIER_COLOR.MID, label: "Suspicious" },
  ];

  // ── Footer ── cleared branch added (S209): the test returns LOW
  // (rankCorrelation.js flagRankCap maps LOW→LOW), so the card can render
  // in a non-flagged state.
  const footer = (result.flag !== "LOW" && result.flag !== "N/A")
    ? "Conditions rank their rows more alike than typical"
    : "Conditions rank their rows as expected";


  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor="This is a screening signal, not a standalone finding: strong rank agreement can always reflect real biology, so it carries weight only alongside the other tests. Confirm the conditions are meant to be independent — shared controls or a common reference is the most common innocent cause. Cross-reference the duplicate and offset tests: a condition pair that also shares rows or a constant offset points to one built from another. Cross-reference Cross-condition similarity and Baseline balance: these three read condition similarity from different angles, and a finding that holds across them is far harder to explain as biology than any one alone."
      implications="Conditions whose rows rank in nearly the same order can genuinely share structure — the same control samples, a shared baseline, or treatments that really do move the rows together. They can also indicate one condition copied or derived from another, or several conditions generated from one template, leaving the row order matched where independent treatments would reshuffle it.">

      {result.insufficientPairs && (
        <CardBanner type="warn">
          <strong>Informational only</strong> — {nPairs} condition pair{nPairs > 1 ? "s" : ""} is insufficient for statistical inference.
          High ρ between 2 conditions is expected when most features are non-differentially expressed.
        </CardBanner>
      )}

      {hasMatrix && (
        <>
          {/* S210 (single-surface): section heading dropped — the footer
              fragment (LEAD_HEAD in MiniCardLayout) heads this sole surface. */}
          <PlotLayout fitContent>
            <CorrMatrixSVG
              labels={condNames}
              getValue={(rowL, colL) => lookup[rowL + "|" + colL] || null}
              formatCell={val => val ? val.rho.toFixed(2) : ""}
              cellBg={cellBg}
              cellText={cellTxt}
              cellBold={cellBold}
              cellOpacity={cellOp}
              labelColors={labelColors}
            />
          </PlotLayout>
          <ChartLegend items={legendItems} />
        </>
      )}

    </MiniCardLayout>
  );
}

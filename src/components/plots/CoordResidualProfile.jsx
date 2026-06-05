/**
 * CoordResidualProfile — integrated CCR panel.
 * Two independent vertical sections on the white card:
 *   A. Sub-heading + PlotLayout (condition heatmap strips + gradient legend).
 *   B. Sub-heading + PlotLayout (ρ correlation matrix via CorrMatrixSVG + tier legend).
 * No flex row — sections stack vertically, matching IRC/other card patterns.
 */
import { C, FF, FW } from "../../constants/tokens.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { PlotSVG } from "./PlotSVG.jsx";
import { CorrMatrixSVG } from "./CorrMatrixSVG.jsx";
import { SvgLabel } from "../shared/SvgLabel.jsx";
import { SvgAxis } from "../shared/SvgAxis.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { makeRowMapper } from "../shared/coordinates.js";
import { rhoColor, rhoTextColor, rhoLegendItems } from "../shared/heatmapColors.js";
import { SUB_HEAD } from "../shared/styles.js";

// Residual magnitude ramp — the CANONICAL TIER_COLOR family colours: slate
// #CBD5E1 → amber #F97316 → red #EF4444, the same #F97316 / #EF4444 the severity
// scale and every flag mark use. A high residual must read as the SAME red as an
// outlier dot or flagged cell, so the endpoints are not softened. What is local
// here is the GAMMA CURVE (t = intensity ** RESID_GAMMA) applied before the ramp:
// this is a dense, continuous surface (intensity = residual / globalMax, no
// threshold) where a linear map paints most of the grid warm. The gamma reserves
// the warm end for genuinely high values — most cells stay cool/slate, amber
// appears in the upper-mid, full red only at the high rows — while the low-mid
// keeps its variation so the cross-condition correlation texture still reads. The
// sparse categorical matrices (HEATMAP_TIER / IRC / CorrMatrix) map linearly and
// are correct as-is; do NOT add this gamma to them, and do NOT soften these
// endpoints back off canonical.
const RESID_GAMMA = 2.2;
const STRIP_GRAD_FROM = "#CBD5E1";  // light slate — low residual
const STRIP_GRAD_MID = "#F97316";   // amber (canonical)
const STRIP_GRAD_TO = "#EF4444";    // red (canonical) — high residual
const stripCellColor = (intensity) => {
  const t = Math.max(0, Math.min(1, intensity)) ** RESID_GAMMA;
  const lerp = (a, b, f) => Math.round(a + (b - a) * f);
  // slate (203,213,225) → amber (249,115,22) → red (239,68,68)
  if (t <= 0.5) {
    const f = t / 0.5;
    return `rgb(${lerp(203,249,f)},${lerp(213,115,f)},${lerp(225,22,f)})`;
  }
  const f = (t - 0.5) / 0.5;
  return `rgb(${lerp(249,239,f)},${lerp(115,68,f)},${lerp(22,68,f)})`;
};
const MIN_CELL_H = 4;
const MAX_PANEL_H = 400;
const MAX_BINS = 100;
const CHAR_W = 6; // must match SvgAxis heuristic

/** Strip longest common prefix from condition names. */
function buildShortNames(names) {
  if (names.length <= 1) return names.map(n => n);
  const split = names.map(n => n.split(/(?<=[\s_+·-])|(?=[\s_+·-])/));
  let prefixLen = 0;
  outer: for (let i = 0; i < split[0].length; i++) {
    const tok = split[0][i];
    for (let j = 1; j < split.length; j++) {
      if (i >= split[j].length || split[j][i] !== tok) break outer;
    }
    prefixLen = i + 1;
  }
  const stripped = split.map(parts => {
    const tail = parts.slice(prefixLen).join("").replace(/^[\s_+·-]+/, "");
    return tail || parts.join("");
  });
  return stripped;
}

export function CoordResidualProfile({ allProfiles, nRows, pairDetails, condColorMap = {}, importConfig, showRhoMatrix = true }) {
  if (!allProfiles?.length || !nRows || nRows < 3) return null;
  const profiles = allProfiles.filter(p => p.absResid?.length > 0);
  if (profiles.length < 2) return null;

  const nC = profiles.length;

  // ── Binning ──
  const needsBinning = nRows * MIN_CELL_H > MAX_PANEL_H;
  const binSize = needsBinning ? Math.ceil(nRows / MAX_BINS) : 1;
  const nBins = Math.ceil(nRows / binSize);

  const binnedProfiles = profiles.map(p => {
    const binned = [];
    for (let b = 0; b < nBins; b++) {
      const start = b * binSize;
      const end = Math.min(start + binSize, nRows);
      let mx = 0;
      for (let r = start; r < end; r++) {
        const av = Math.abs(p.absResid[r] ?? 0);
        if (av > mx) mx = av;
      }
      binned.push(mx);
    }
    return binned;
  });

  let globalMax = 0;
  for (const bp of binnedProfiles) {
    for (const v of bp) { if (v > globalMax) globalMax = v; }
  }
  if (globalMax < 0.01) globalMax = 1;

  // ── Correlation matrix data ──
  const pd = pairDetails || [];
  const nameSet = new Set();
  for (const d of pd) {
    const parts = d.pair.split(" vs ");
    if (parts.length === 2) { nameSet.add(parts[0].trim()); nameSet.add(parts[1].trim()); }
  }
  const condNames = [...nameSet];
  const nMat = condNames.length;
  const lookup = {};
  for (const d of pd) {
    const parts = d.pair.split(" vs ");
    if (parts.length === 2) {
      const k1 = parts[0].trim() + "|" + parts[1].trim();
      const k2 = parts[1].trim() + "|" + parts[0].trim();
      lookup[k1] = parseFloat(d.r) || 0;
      lookup[k2] = parseFloat(d.r) || 0;
    }
  }
  const hasMatrix = nMat >= 2;

  // ── Short names (common-prefix stripped) ──
  const fullNames = profiles.map(p => p.name);
  const shortNames = buildShortNames(fullNames);
  const condShort = {};
  for (let i = 0; i < fullNames.length; i++) condShort[fullNames[i]] = shortNames[i];
  const matShortNames = condNames.map(cn => condShort[cn] || cn);

  // ── ρ legend items (for HTML ChartLegend) ──
  const legendItems = rhoLegendItems(Object.values(lookup));

  // ── ρ matrix label colours ──
  const matLabelColors = condNames.map(cn => condColorMap[cn]?.text || null);

  // ── Strip layout ──
  const STRIP_GAP = 2;
  const PL = needsBinning ? 44 : 32;

  const STRIP_W = nC > 8 ? 18 : nC > 5 ? 22 : Math.min(80, Math.max(26, Math.floor(200 / nC)));
  const STRIPS_W = nC * STRIP_W + (nC - 1) * STRIP_GAP;
  const PR_S = 8;

  const maxStripLabelLen = Math.max(...shortNames.map(s => s.length), 1);
  const stripRotate = maxStripLabelLen * CHAR_W > STRIP_W;
  const stripLabelOverhang = stripRotate
    ? Math.max(0, Math.ceil(maxStripLabelLen * CHAR_W * 0.71) - STRIP_W)
    : 0;
  const W_STRIP = PL + STRIPS_W + PR_S + stripLabelOverhang;
  const stripLabelGap = 8;
  const LABEL_H = stripRotate
    ? Math.max(28, stripLabelGap + Math.ceil(0.75 * maxStripLabelLen * CHAR_W) + 12)
    : 28;
  const PT = LABEL_H + 12;

  const PB = 6;
  const CELL_H = needsBinning
    ? Math.max(MIN_CELL_H, Math.floor(MAX_PANEL_H / nBins))
    : Math.max(Math.min(8, 300 / nRows), MIN_CELL_H);
  const CHART_H = nBins * CELL_H;
  const H_STRIP = PT + CHART_H + PB;

  const yr = i => PT + i * CELL_H;
  const stripX = ci => PL + ci * (STRIP_W + STRIP_GAP);

  // ── Y-axis ticks ──
  const { fileRow } = makeRowMapper(importConfig);

  const rowStep = nRows < 50 ? 10 : nRows < 200 ? 25 : nRows < 500 ? 50 : 100;
  const yTicks = [];
  yTicks.push({ bin: 0, label: String(fileRow(0)) });
  const firstStep = Math.ceil(1 / rowStep) * rowStep;
  for (let r = firstStep; r < nRows - 1; r += rowStep) {
    yTicks.push({ bin: needsBinning ? Math.floor(r / binSize) : r, label: String(fileRow(r)) });
  }
  const lastDataRow = nRows - 1;
  const lastBin = needsBinning ? nBins - 1 : lastDataRow;
  if (yTicks[yTicks.length - 1].bin !== lastBin) {
    yTicks.push({ bin: lastBin, label: String(fileRow(lastDataRow)) });
  }

  // ── Strip label array ──
  const stripLabelItems = shortNames.map((s, i) => ({
    text: s,
    color: condColorMap[fullNames[i]]?.text || null,
  }));

  return (
    <div>
      {/* ── Section A: Heatmap strips ── */}
      {/* Sub-heading provided by MiniCard_ResidualSpike — not duplicated here */}
      <PlotLayout>
        <PlotSVG W={W_STRIP} H={H_STRIP} responsive>
          {/* Left axis line */}
          <line
            x1={PL} y1={PT} x2={PL} y2={PT + CHART_H}
            stroke={C.BORDER} strokeWidth="1"
          />

          {/* Heatmap strips */}
          {binnedProfiles.map((bp, ci) => (
            <g key={"s" + ci}>
              <rect x={stripX(ci)} y={PT} width={STRIP_W} height={CHART_H}
                fill={C.BG_L} stroke="none" shapeRendering="crispEdges"/>
              {bp.map((v, bi) => {
                const intensity = v / globalMax;
                if (intensity < 0.02) return null;
                const y0 = Math.round(yr(bi));
                const y1 = Math.round(yr(bi + 1));
                return (
                  <rect key={bi}
                    x={stripX(ci)} y={y0} width={STRIP_W} height={y1 - y0 + 1}
                    fill={stripCellColor(intensity)} shapeRendering="crispEdges"
                  />
                );
              })}
            </g>
          ))}

          {/* Strip labels — 11px (role="axis"), centred above each strip */}
          <SvgAxis
            labels={stripLabelItems}
            position="top-strip"
            cellSize={STRIP_W} cellSpacing={STRIP_GAP}
            x0={PL} y0={PT}
            gap={stripLabelGap}
            role="axis"
          />

          {/* Y-axis "Row" label — rotated -90°, centred on strip height */}
          <SvgLabel
            x={8} y={PT + CHART_H / 2}
            text="Row"
            role="axis"
            textAnchor="middle"
            rotate={true} deg={-90}
          />

          {/* Y-axis row ticks */}
          {yTicks.map((t, i) => (
            <SvgLabel key={"yt" + i}
              x={PL - 4} y={yr(t.bin) + CELL_H / 2}
              text={t.label}
              role="yaxis"
              textAnchor="end" dominantBaseline="central"
            />
          ))}
        </PlotSVG>
      </PlotLayout>
      {/* Strip gradient legend — on card, outside PlotLayout */}
      <ChartLegend gradient={{
        from: STRIP_GRAD_FROM,
        mid: STRIP_GRAD_MID,
        // amber (ramp t=0.5) lands at intensity 0.5**(1/gamma) on the Low→High
        // axis, so the legend bar curves the same way the cells do.
        midPos: Math.round(Math.pow(0.5, 1 / RESID_GAMMA) * 100),
        to: STRIP_GRAD_TO,
        startLabel: "Low",
        endLabel: "High residual",
      }} />

      {/* ── Section B: ρ correlation matrix (via CorrMatrixSVG) ── */}
      {hasMatrix && showRhoMatrix && (
        <>
          <div style={{...SUB_HEAD,marginTop:"12px"}}>
            How closely each row pair's noise tracks
          </div>
          <PlotLayout>
            <CorrMatrixSVG
              labels={[...matShortNames].reverse()}
              getValue={(rowL, colL) => {
                const rn = condNames[matShortNames.indexOf(rowL)];
                const cn = condNames[matShortNames.indexOf(colL)];
                return rn && cn ? (lookup[rn + "|" + cn] ?? null) : null;
              }}
              formatCell={v => v != null ? v.toFixed(2) : ""}
              cellBg={v => v != null ? rhoColor(v) : C.BORDER_L}
              cellText={v => rhoTextColor(v)}
              cellBold={v => v != null && v >= 0.4}
              labelColors={[...matLabelColors].reverse()}
            />
          </PlotLayout>
          {/* ρ tier legend — on card, outside PlotLayout */}
          <ChartLegend items={legendItems} />
        </>
      )}
    </div>
  );
}

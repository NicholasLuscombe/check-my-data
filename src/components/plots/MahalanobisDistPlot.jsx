import { CC, CP, CS, C, FF, CF, FW } from "../../constants/tokens.js";
import { COND_COLORS } from "../../constants/roles.js";
import { PlotSVG } from "./PlotSVG.jsx";


/**
 * Mahalanobis distance — small multiples, one mini chart per condition.
 * Shared y-axis scale across all charts. Per-condition threshold lines.
 * Split x-axis: below-threshold region compressed, above-threshold expanded.
 *
 * S126b add-5: prefers `outlierThreshold` (BH-FDR-corrected boundary;
 * matches the `details` table count) over `plotThreshold` (raw χ²(0.99)
 * decorative line). When `outlierThreshold === null` (no row survived
 * BH-FDR), the threshold line + outlier dots disappear entirely so the
 * chart matches the footer's "0 outliers" count instead of showing
 * misleading red dots above the looser raw-χ² line.
 */
export function MahalanobisDistPlot({ allCondD2, condColorMap, plotD2, plotD2Rows, plotThreshold, outlierThreshold, fileRow, W = CP.W }) {
  const pickThresh = (newT, legacyT) =>
    newT !== undefined ? newT : (legacyT ?? null);
  const series = allCondD2?.length > 0
    ? allCondD2.map((cd, ci) => ({
        name: cd.condition,
        d2: cd.plotD2 || [],
        rows: cd.plotD2Rows || [],
        threshold: pickThresh(cd.outlierThreshold, cd.plotThreshold),
        color: condColorMap?.[cd.condition]?.text || COND_COLORS[ci % COND_COLORS.length].text,
      }))
    : plotD2?.length > 0
      ? [{ name: "All data", d2: plotD2, rows: plotD2Rows || [], threshold: pickThresh(outlierThreshold, plotThreshold), color: CC.OBS }]
      : [];
  if (!series.length || !series.some(s => s.d2.length >= 1)) return null;

  // Threshold may be null when no row survived BH-FDR — exclude from
  // axis-range computation and from the threshold-line render.
  const finiteThresholds = series.map(s => s.threshold).filter(t => Number.isFinite(t));
  const maxThresh = finiteThresholds.length ? Math.max(...finiteThresholds) : 0;
  const globalMax = Math.max(...series.flatMap(s => s.d2), maxThresh * 1.1);

  const PL = 44, PR = 8;
  const MINI_H = 100, GAP = 30;
  const nConds = series.length;
  const CW = W - PL - PR;
  const PT_TOP = 25, PB_BOT = 10;
  const totalH = PT_TOP + nConds * MINI_H + (nConds - 1) * GAP + PB_BOT;

  const yscale = v => MINI_H - (v / globalMax) * MINI_H;

  const yStep = niceStep(globalMax, 3);
  const yTicks = [];
  for (let v = 0; v <= globalMax; v += yStep) yTicks.push(v);

  // Break gap between normal and outlier regions
  const BREAK_GAP = 6;

  return (
    <PlotSVG W={W} H={totalH} overflow>
      {/* Y-axis label — centered across all charts */}
      <text x={5} y={totalH / 2} fontSize={CF.SMALL} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.UI}
        transform={`rotate(-90,5,${totalH / 2})`}>Distance</text>
      {series.map((s, ci) => {
        const N = s.d2.length;
        if (N < 1) return null;
        const yOffset = PT_TOP + ci * (MINI_H + GAP);
        const thresh = s.threshold; // per-condition threshold; null when no BH-FDR outliers
        const hasFiniteThresh = Number.isFinite(thresh);
        // Centralised outlier predicate. Naive `v > thresh` is dangerous
        // when `thresh` is null — JS coerces null → 0 in numeric
        // context, so every positive D² evaluates as "outlier" and the
        // chart paints every dot red with a row label (S126b add-5b
        // bug fix). Always go through this guard.
        const isOutlierAt = (v) => hasFiniteThresh && v > thresh;

        // Split x-axis: find the index where outliers start (d2 is sorted ascending)
        const splitIdx = hasFiniteThresh ? s.d2.findIndex(v => v > thresh) : -1;
        const hasOutliers = splitIdx >= 0;
        const nNormal = hasOutliers ? splitIdx : N;
        const nOutlier = hasOutliers ? N - splitIdx : 0;

        // Allocate x-width: if outliers exist, give them proportionally more space
        // Normal region: 40% of width (or full if no outliers)
        // Outlier region: 60% of width
        const NORMAL_FRAC = hasOutliers ? 0.4 : 1;
        const OUTLIER_FRAC = 0.6;
        const normalW = (CW - (hasOutliers ? BREAK_GAP : 0)) * NORMAL_FRAC;
        const outlierW = (CW - BREAK_GAP) * OUTLIER_FRAC;
        const breakX = PL + normalW; // x position of the break

        // Piecewise x-scale: index → pixel
        const xscale = i => {
          if (!hasOutliers) return PL + (i / Math.max(N - 1, 1)) * CW;
          if (i < splitIdx) return PL + (i / Math.max(nNormal - 1, 1)) * normalW;
          const oi = i - splitIdx;
          return breakX + BREAK_GAP + (oi / Math.max(nOutlier - 1, 1)) * outlierW;
        };

        // X-axis ticks for normal region only (outlier region uses row labels)
        const xTicks = [];
        if (nNormal > 1) {
          const xStep = niceStep(nNormal, 3);
          for (let v = xStep; v <= nNormal; v += xStep) xTicks.push(v);
          if (!xTicks.includes(nNormal)) xTicks.push(nNormal);
          if (xTicks.length >= 2 && (xTicks[xTicks.length - 1] - xTicks[xTicks.length - 2]) < xStep * 0.7) {
            xTicks.splice(-2, 1);
          }
        }

        // s.rows is built 1:1 with s.d2 at every producer; fileRow always defined.
        const outliers = [];
        s.d2.forEach((v, i) => {
          if (isOutlierAt(v)) {
            outliers.push({ i, x: xscale(i), y: yscale(v), rowNum: `R${fileRow(s.rows[i])}` });
          }
        });

        // Place labels above dots, alternating left/right and staggering vertically.
        const MIN_DX = 20, MIN_DY = 10;
        const sorted = [...outliers].sort((a, b) => a.x - b.x);
        sorted.forEach((o, oi) => {
          const xNudge = (oi % 2 === 0) ? -12 : 12;
          const outlierLeft = breakX + BREAK_GAP;
          const outlierRight = PL + CW;
          o.labelX = Math.max(outlierLeft + 5, Math.min(outlierRight - 5, o.x + xNudge));
          let ly = o.y - 10;
          for (let pass = 0; pass < 20; pass++) {
            let collision = false;
            for (let pi = 0; pi < oi; pi++) {
              const prev = sorted[pi];
              if (Math.abs(o.labelX - prev.labelX) < MIN_DX && Math.abs(ly - prev.labelY) < MIN_DY) {
                collision = true;
                ly = prev.labelY - MIN_DY;
                break;
              }
            }
            if (!collision) break;
          }
          o.labelY = ly;
        });

        return (
          <g key={ci} transform={`translate(0,${yOffset})`}>
            {/* Condition label above chart */}
            <text x={PL} y={-5} fontSize={CF.LABEL} fill={s.color}
              fontFamily={FF.UI} fontWeight={FW.SEMI}>{s.name}</text>

            {/* Gridlines — normal region */}
            {yTicks.map(v => (
              <line key={`g${v}`} x1={PL} y1={yscale(v)} x2={hasOutliers ? breakX : PL + CW} y2={yscale(v)}
                stroke={C.BORDER_L} strokeWidth={CS.GRID.w} />
            ))}
            {/* Gridlines — outlier region */}
            {hasOutliers && yTicks.map(v => (
              <line key={`go${v}`} x1={breakX + BREAK_GAP} y1={yscale(v)} x2={PL + CW} y2={yscale(v)}
                stroke={C.BORDER_L} strokeWidth={CS.GRID.w} />
            ))}

            {/* Per-condition threshold dashed line — only when a BH-FDR
                outlier boundary exists; suppressed entirely when no row
                survived per-row identification (threshold === null). */}
            {hasFiniteThresh && (
              <line x1={PL} y1={yscale(thresh)} x2={hasOutliers ? breakX : PL + CW} y2={yscale(thresh)}
                stroke={CC.THRESH} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />
            )}
            {hasFiniteThresh && hasOutliers && (
              <line x1={breakX + BREAK_GAP} y1={yscale(thresh)} x2={PL + CW} y2={yscale(thresh)}
                stroke={CC.THRESH} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />
            )}

            {/* Y-axis line */}
            <line x1={PL} y1={0} x2={PL} y2={MINI_H} stroke={C.BORDER} strokeWidth={CS.GRID.w} />

            {/* Y-axis ticks */}
            {yTicks.map(v => (
              <g key={`yt${v}`}>
                <line x1={PL - 3} y1={yscale(v)} x2={PL} y2={yscale(v)}
                  stroke={C.BORDER} strokeWidth={CS.GRID.w} />
                <text x={PL - 5} y={yscale(v) + 3} fontSize={CF.SMALL} fill={C.TEXT_4}
                  textAnchor="end" fontFamily={FF.MONO}>{Math.round(v)}</text>
              </g>
            ))}

            {/* X-axis baseline — normal region */}
            <line x1={PL} y1={MINI_H} x2={hasOutliers ? breakX : PL + CW} y2={MINI_H}
              stroke={C.BORDER} strokeWidth={CS.GRID.w} />
            {/* X-axis baseline — outlier region */}
            {hasOutliers && (
              <line x1={breakX + BREAK_GAP} y1={MINI_H} x2={PL + CW} y2={MINI_H}
                stroke={C.BORDER} strokeWidth={CS.GRID.w} />
            )}

            {/* Break indicator — diagonal slashes */}
            {hasOutliers && (
              <g>
                <line x1={breakX - 1} y1={MINI_H - 4} x2={breakX + 3} y2={MINI_H + 4}
                  stroke={C.BORDER} strokeWidth={1} />
                <line x1={breakX + 3} y1={MINI_H - 4} x2={breakX + 7} y2={MINI_H + 4}
                  stroke={C.BORDER} strokeWidth={1} />
              </g>
            )}

            {/* X-axis ticks — normal region */}
            {xTicks.map(v => (
              <g key={`xt${v}`}>
                <line x1={xscale(v - 1)} y1={MINI_H} x2={xscale(v - 1)} y2={MINI_H + 3}
                  stroke={C.BORDER} strokeWidth={CS.GRID.w} />
                <text x={xscale(v - 1)} y={MINI_H + 12} fontSize={CF.SMALL} fill={C.TEXT_4}
                  textAnchor="middle" fontFamily={FF.MONO}>{v}</text>
              </g>
            ))}

            {/* Dots — condition colour for normal, solid red with white border for outliers */}
            {s.d2.map((v, i) => {
              return isOutlierAt(v) ? (
                <circle key={`d${i}`} cx={xscale(i)} cy={yscale(v)} r={4}
                  fill={CC.THRESH} stroke={C.WHITE} strokeWidth={1.5} opacity={0.85} />
              ) : (
                <circle key={`d${i}`} cx={xscale(i)} cy={yscale(v)}
                  r={2.5} fill={s.color} opacity={0.5} />
              );
            })}

            {/* Outlier row labels — leader lines + staggered text */}
            {outliers.map(o => (
              <g key={`rl${o.i}`}>
                <line x1={o.x} y1={o.y - 5} x2={o.labelX} y2={o.labelY + 3}
                  stroke={C.TEXT_4} strokeWidth={0.5} />
                <text x={o.labelX} y={o.labelY}
                  fontSize="9" fill={C.TEXT_2} textAnchor="middle"
                  fontFamily={FF.MONO}>{o.rowNum}</text>
              </g>
            ))}
          </g>
        );
      })}
    </PlotSVG>
  );
}

function niceStep(range, targetTicks) {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  if (norm <= 1.5) return mag;
  if (norm <= 3.5) return 2 * mag;
  if (norm <= 7.5) return 5 * mag;
  return 10 * mag;
}

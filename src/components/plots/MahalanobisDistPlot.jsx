import { CC, CP, CS, C, FF, CF, FW } from "../../constants/tokens.js";
import { COND_COLORS } from "../../constants/roles.js";
import { PlotSVG } from "./PlotSVG.jsx";


/**
 * Mahalanobis distance — small multiples, one mini chart per condition.
 * Shared y-axis scale across all charts. Per-condition threshold lines.
 * Continuous x-axis (sorted-rank order); flagged outliers render inline
 * (S207 — previously a membership-driven split/break, now removed).
 *
 * S126b add-5: prefers `outlierThreshold` (BH-FDR-corrected boundary;
 * matches the `details` table count) over `plotThreshold` (raw χ²(0.99)
 * decorative line). When `outlierThreshold === null` (no row survived
 * BH-FDR), the threshold line + outlier dots disappear entirely so the
 * chart matches the footer's "0 outliers" count instead of showing
 * misleading red dots above the looser raw-χ² line.
 */
export function MahalanobisDistPlot({ allCondD2, condColorMap, plotD2, plotD2Rows, plotThreshold, outlierThreshold, outlierRowsByCond, pooledOutlierRows, fileRow, W = CP.W }) {
  const pickThresh = (newT, legacyT) =>
    newT !== undefined ? newT : (legacyT ?? null);
  // Outlier membership per series — the SAME set the table/footer use (S207),
  // carried as a Set of 0-indexed matrix rows aligned with each series' `rows`
  // (plotD2Rows). Colour, the x-axis split, and the row labels bind this set,
  // never a distance-vs-threshold re-test.
  const series = allCondD2?.length > 0
    ? allCondD2.map((cd, ci) => ({
        name: cd.condition,
        d2: cd.plotD2 || [],
        rows: cd.plotD2Rows || [],
        threshold: pickThresh(cd.outlierThreshold, cd.plotThreshold),
        outlierRows: new Set(outlierRowsByCond?.[cd.condition] || []),
        color: condColorMap?.[cd.condition]?.text || COND_COLORS[ci % COND_COLORS.length].text,
      }))
    : plotD2?.length > 0
      ? [{ name: "All data", d2: plotD2, rows: plotD2Rows || [], threshold: pickThresh(outlierThreshold, plotThreshold), outlierRows: new Set(pooledOutlierRows || []), color: CC.OBS }]
      : [];
  if (!series.length || !series.some(s => s.d2.length >= 1)) return null;

  // Pooled branch produces a single sentinel "All data" series; the
  // stratified branch always names ≥2 real conditions (S127 dispatch). A
  // lone pooled chart has no sibling condition to disambiguate, so its
  // per-chart condition label is an orphan — suppressed below.
  const isPooled = !(allCondD2?.length > 0);

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
        // Outlier identity is the table/footer membership decision (the
        // BH-FDR per-row set the engine already computed), NOT a re-test of
        // distance against the threshold line. `v > thresh` stranded the
        // boundary-defining row — whose D² equals outlierThreshold by
        // construction — on the Normal side, mis-colouring it blue (S206/S207;
        // with a single outlier it could never paint red). Membership keys on
        // the dot's row, so the threshold-defining row is correctly an outlier.
        const isOutlierAt = (i) => s.outlierRows.has(s.rows[i]);

        // S207: the x-axis runs continuous — it no longer splits or shows an
        // axis-break glyph on outlier membership. The flagged outlier renders
        // inline at its true sorted-rank x-position. (The colour-fix membership
        // rebind had flipped the old split predicate and manufactured a break
        // on single-outlier fixtures; the axis LAYOUT is now decoupled from
        // membership entirely.) Colour (dot fill) and the row labels still bind
        // outlier-set membership via isOutlierAt — only the layout changed here.
        const nNormal = N;
        const xscale = i => PL + (i / Math.max(N - 1, 1)) * CW;

        // X-axis ticks across the full continuous row axis; outlier dots are
        // additionally annotated with row labels below.
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
          if (isOutlierAt(i)) {
            outliers.push({ i, x: xscale(i), y: yscale(v), rowNum: `R${fileRow(s.rows[i])}` });
          }
        });

        // Place labels above dots, alternating left/right and staggering vertically.
        const MIN_DX = 20, MIN_DY = 10;
        const sorted = [...outliers].sort((a, b) => a.x - b.x);
        sorted.forEach((o, oi) => {
          const xNudge = (oi % 2 === 0) ? -12 : 12;
          const chartLeft = PL;
          const chartRight = PL + CW;
          o.labelX = Math.max(chartLeft + 5, Math.min(chartRight - 5, o.x + xNudge));
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
            {/* Condition label above chart — suppressed for the single
                pooled "All data" chart (no sibling conditions to disambiguate). */}
            {!isPooled && (
              <text x={PL} y={-5} fontSize={CF.LABEL} fill={s.color}
                fontFamily={FF.UI} fontWeight={FW.SEMI}>{s.name}</text>
            )}

            {/* Gridlines — continuous axis */}
            {yTicks.map(v => (
              <line key={`g${v}`} x1={PL} y1={yscale(v)} x2={PL + CW} y2={yscale(v)}
                stroke={C.BORDER_L} strokeWidth={CS.GRID.w} />
            ))}

            {/* Per-condition threshold dashed line — only when a BH-FDR
                outlier boundary exists; suppressed entirely when no row
                survived per-row identification (threshold === null). Spans
                the full continuous axis. */}
            {hasFiniteThresh && (
              <line x1={PL} y1={yscale(thresh)} x2={PL + CW} y2={yscale(thresh)}
                stroke={CC.THRESH} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />
            )}

            {/* Y-axis line */}
            <line x1={PL} y1={0} x2={PL} y2={MINI_H} stroke={C.BORDER} strokeWidth={CS.GRID.w} />

            {/* Y-axis ticks */}
            {yTicks.map(v => (
              <g key={`yt${v}`}>
                <line x1={PL - 3} y1={yscale(v)} x2={PL} y2={yscale(v)}
                  stroke={C.BORDER} strokeWidth={CS.GRID.w} />
                <text x={PL - 5} y={yscale(v) + 3} fontSize={CF.SMALL} fill={C.TEXT_3}
                  textAnchor="end" fontFamily={FF.MONO}>{Math.round(v)}</text>
              </g>
            ))}

            {/* X-axis baseline — continuous */}
            <line x1={PL} y1={MINI_H} x2={PL + CW} y2={MINI_H}
              stroke={C.BORDER} strokeWidth={CS.GRID.w} />

            {/* X-axis ticks — continuous axis */}
            {xTicks.map(v => (
              <g key={`xt${v}`}>
                <line x1={xscale(v - 1)} y1={MINI_H} x2={xscale(v - 1)} y2={MINI_H + 3}
                  stroke={C.BORDER} strokeWidth={CS.GRID.w} />
                <text x={xscale(v - 1)} y={MINI_H + 12} fontSize={CF.SMALL} fill={C.TEXT_3}
                  textAnchor="middle" fontFamily={FF.MONO}>{v}</text>
              </g>
            ))}

            {/* Dots — condition colour for normal, solid red with white border for outliers */}
            {s.d2.map((v, i) => {
              return isOutlierAt(i) ? (
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
                  stroke={C.TEXT_3} strokeWidth={0.5} />
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

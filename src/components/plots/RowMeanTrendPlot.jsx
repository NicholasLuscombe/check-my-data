import { CC, C, FF, CF, CP, CS } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

// Observed — purple/indigo pair
const CROSSING_COLOR = "#4A3D8F"; // deep indigo — bold crossing emphasis
const RUN_COLOR = "#A0A0CC";      // muted lavender — calm but visible

// Simulated line uses CC.EXP_SOFT (mint) directly — no local constant needed

/**
 * Line/dot chart of row means with crossing emphasis on both lines.
 * Observed = purple/indigo, Simulated = teal pair.
 */
export function RowMeanTrendPlot({ rowMeans, simMeans, rowIdxs, grandMean, fileRow }) {
  if (!rowMeans?.length || rowMeans.length < 3) return null;
  const valid = rowMeans.map((v, i) => v != null ? { idx: i, y: v } : null).filter(Boolean);
  if (valid.length < 3) return null;

  const simValues = simMeans?.length === valid.length ? simMeans : null;

  // Layout
  const W = CP.W;
  const PL = 52, PR = 8, PT = 12, PB = 34;
  const plotW = W - PL - PR;
  const plotH = 140;
  const H = PT + plotH + PB;

  // Scales
  const yVals = valid.map(v => v.y);
  const allVals = simValues ? [...yVals, ...simValues] : yVals;
  const yMin = Math.min(...allVals, grandMean);
  const yMax = Math.max(...allVals, grandMean);
  const yPad = (yMax - yMin) * 0.08 || 1;
  const yLo = yMin - yPad, yHi = yMax + yPad;
  const xN = valid.length;

  const sx = (i) => PL + (i / Math.max(xN - 1, 1)) * plotW;
  const sy = (v) => PT + plotH - ((v - yLo) / (yHi - yLo)) * plotH;

  // Y-axis ticks
  const yRange = yHi - yLo;
  const yStep = niceStep(yRange, 4);
  const yTicks = [];
  for (let v = Math.ceil(yLo / yStep) * yStep; v <= yHi; v += yStep) yTicks.push(v);

  // X-axis ticks — original file row numbers at nice round intervals
  const fileRows = valid.map(v => {
    const matIdx = rowIdxs ? rowIdxs[v.idx] : v.idx;
    return fileRow ? fileRow(matIdx) : matIdx + 1;
  });
  const frFirst = fileRows[0], frLast = fileRows[fileRows.length - 1];
  const xRowStep = niceStep(frLast - frFirst, 5);
  const xTickIdxs = [];
  const firstTickRow = Math.ceil(frFirst / xRowStep) * xRowStep;
  for (let row = firstTickRow; row <= frLast; row += xRowStep) {
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < fileRows.length; i++) {
      const d = Math.abs(fileRows[i] - row);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    xTickIdxs.push(bestIdx);
  }
  if (xTickIdxs[0] !== 0) xTickIdxs.unshift(0);
  if (xTickIdxs[xTickIdxs.length - 1] !== xN - 1) xTickIdxs.push(xN - 1);
  let xTickSet = [...new Set(xTickIdxs)];
  if (xTickSet.length >= 2) {
    const last = xTickSet[xTickSet.length - 1];
    const prev = xTickSet[xTickSet.length - 2];
    if (Math.abs(fileRows[last] - fileRows[prev]) < xRowStep * 0.6) {
      xTickSet = [...xTickSet.slice(0, -2), last];
    }
  }

  // ── Shared crossing detection ──
  function isCrossing(values, i, gm) {
    if (i === 0) return false;
    return (values[i - 1] >= gm) !== (values[i] >= gm);
  }

  // Build point arrays with crossing flags
  function buildPts(values) {
    return values.map((v, i) => ({
      px: sx(i), py: sy(v),
      crossing: isCrossing(values, i, grandMean),
    }));
  }

  const obsValues = valid.map(v => v.y);
  const obsPts = buildPts(obsValues);
  const simPts = simValues ? buildPts(simValues) : null;

  const gmY = sy(grandMean);

  return (
    <PlotSVG W={W} H={H}>
      {/* gridlines */}
      {yTicks.map(v => (
        <line key={v} x1={PL} y1={sy(v)} x2={PL + plotW} y2={sy(v)}
          stroke={C.BORDER_L} strokeWidth={CS.GRID.w} />
      ))}

      {/* grand mean dashed line */}
      <line x1={PL} y1={gmY} x2={PL + plotW} y2={gmY}
        stroke={C.TEXT_3} strokeWidth="1" strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />

      {/* simulated line — uniform mint, no crossing emphasis, no dots */}
      {simPts && simPts.map((pt, i) => {
        if (i === 0) return null;
        const prev = simPts[i - 1];
        return (
          <line key={`s${i}`} x1={prev.px} y1={prev.py} x2={pt.px} y2={pt.py}
            stroke={CC.EXP_SOFT} strokeWidth="1.5" />
        );
      })}

      {/* observed line segments — purple/indigo with crossing emphasis */}
      {obsPts.map((pt, i) => {
        if (i === 0) return null;
        const prev = obsPts[i - 1];
        const cross = pt.crossing;
        return (
          <line key={`o${i}`} x1={prev.px} y1={prev.py} x2={pt.px} y2={pt.py}
            stroke={cross ? CROSSING_COLOR : RUN_COLOR}
            strokeWidth={cross ? "2.5" : "1.5"} />
        );
      })}

      {/* observed dots — small default, large flanking each crossing */}
      {obsPts.map((pt, i) => {
        const flanksCrossing = pt.crossing || (i + 1 < obsPts.length && obsPts[i + 1].crossing);
        return (
          <circle key={i} cx={pt.px} cy={pt.py}
            r={flanksCrossing ? 4 : 2}
            fill={flanksCrossing ? CROSSING_COLOR : RUN_COLOR} />
        );
      })}

      {/* Y-axis */}
      <line x1={PL} y1={PT} x2={PL} y2={PT + plotH}
        stroke={C.BORDER} strokeWidth={CS.GRID.w} />
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PL - 3} y1={sy(v)} x2={PL} y2={sy(v)}
            stroke={C.BORDER} strokeWidth={CS.GRID.w} />
          <text x={PL - 5} y={sy(v) + 3} fontSize={CF.SMALL} fill={C.TEXT_3}
            textAnchor="end" fontFamily={FF.MONO}>{fmtTick(v)}</text>
        </g>
      ))}
      <text x={10} y={PT + plotH / 2} fontSize={CF.SMALL} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.UI}
        transform={`rotate(-90,10,${PT + plotH / 2})`}>Row mean</text>

      {/* X-axis */}
      <line x1={PL} y1={PT + plotH} x2={PL + plotW} y2={PT + plotH}
        stroke={C.BORDER} strokeWidth={CS.GRID.w} />
      {xTickSet.map(i => (
        <g key={i}>
          <line x1={sx(i)} y1={PT + plotH} x2={sx(i)} y2={PT + plotH + 3}
            stroke={C.BORDER} strokeWidth={CS.GRID.w} />
          <text x={sx(i)} y={PT + plotH + 13} fontSize={CF.SMALL} fill={C.TEXT_3}
            textAnchor="middle" fontFamily={FF.MONO}>{fileRows[i]}</text>
        </g>
      ))}
      <text x={PL + plotW / 2} y={H - 3} fontSize={CF.SMALL} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.UI}>Row</text>
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

function fmtTick(v) {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (Number.isInteger(v) || abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toPrecision(3);
}

import { CC, CP, CS, C, FF, CF, SIGN, OBS } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { shortName } from "../shared/utils.js";

// Strip colours — observed-blue / salient-navy two-tone (S246)
const SIGN_POS = SIGN.POS; // Oxford navy (+1) — the salient state
const SIGN_NEG = CC.OBS;   // observed blue (−1)
// Per-pole opacity (S255): −1 (observed blue) routes OBS.strip, softened toward
// the area-fill family; +1 (salient navy) keeps its heavier weight so the two-
// tone reads. SIGN.POS is a separate channel, not part of the OBS bundle.
const POS_OPACITY = 0.80;

// ── Forward-fill sign array ──────────────────────────────────────
function forwardFillSigns(signs) {
  const filled = [...signs];
  // Forward pass: replace 0 with previous non-zero
  let lastNonZero = null;
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] !== 0) {
      lastNonZero = filled[i];
    } else if (lastNonZero !== null) {
      filled[i] = lastNonZero;
    }
  }
  // Back-fill leading zeros from first non-zero
  if (filled[0] === 0) {
    const firstNZ = filled.find(v => v !== 0) || 1;
    for (let i = 0; i < filled.length; i++) {
      if (filled[i] === 0) filled[i] = firstNZ;
      else break;
    }
  }
  return filled;
}

// S166 A5: the pre-S166 deterministic "expected" simulated strip retires.
// It was constructed by partitioning (nPlus, nMinus) into the rounded
// expected number of runs and ordering alternately — not an H₀ draw, and
// drawn beside real strips it invited single-unit comparison ("does the
// real strip look like the expected one") that contradicts the aggregate-
// verdict thesis: the test fires on a pooled mean-z across pairs with no
// single pair driving the result. The verdict-marker plot above the
// strips (MiniCard_Runs.jsx) carries the pooled statistic explicitly.
// buildSimulatedSigns / buildSimStrip / randomPartition are removed.
export function SignStripPlot({ groupSignSeqs, singleSeq, singleRuns, singleExp,
  fileRow, firstFileRow, lastFileRow, defaultRowLabel="R1–R2", blocks=false }) {
  const rows = groupSignSeqs?.length
    ? groupSignSeqs
    : (singleSeq ? [{group:defaultRowLabel, signs:singleSeq, runs:singleRuns, expected:singleExp}] : []);
  if(!rows.length) return null;

  // Forward-fill zeros for visual continuity. Engine strips zeros then
  // counts runs on the non-zero sequence; forward-fill preserves the same
  // transition points so visual blocks match the stated run count.
  const filledRows = rows.map(r => {
    const filled = forwardFillSigns(r.signs || []);
    return { ...r, filled };
  });

  if (!filledRows.some(r => r.filled.length >= 2)) return null;

  const ROW_H = 17, GAP = 6, LABEL_W = 86, ANN_W = 70;
  const PT = 4, PB = 30;
  const W = CP.W_LG;
  const STRIP_W = W - LABEL_W - ANN_W;

  function rowY(ri) {
    return PT + ri * (ROW_H + GAP);
  }

  const totalH = rowY(filledRows.length - 1) + ROW_H + PB;

  // ── Render the strip ───────────────────────────────────────────
  // Default: one rect per position (per-cell). blocks: coalesce consecutive
  // same-sign cells into runs and draw one rect per run, width proportional to
  // run length, so a long run reads as one wide bar. Run-block layout stays in
  // cell-coordinate space (start/len · STRIP_W) so the file-row x-axis below is
  // preserved. No width floor beyond the 0.5px the per-cell path uses — a larger
  // floor would re-inflate short-run slivers and recreate the dense texture.
  function renderStrip(filled, y) {
    const len = filled.length;
    if (blocks) {
      const rects = [];
      let start = 0;
      for (let i = 1; i <= len; i++) {
        if (i === len || filled[i] !== filled[start]) {
          rects.push(
            <rect key={start}
              x={LABEL_W + (start / len) * STRIP_W} y={y}
              width={Math.max(0.5, ((i - start) / len) * STRIP_W)}
              height={ROW_H}
              fill={filled[start] === 1 ? SIGN_POS : SIGN_NEG}
              opacity={filled[start] === 1 ? POS_OPACITY : OBS.strip.fillOpacity}/>
          );
          start = i;
        }
      }
      return rects;
    }
    const rectW = STRIP_W / len;
    return filled.map((sign, i) => (
      <rect key={i}
        x={LABEL_W + i * rectW} y={y}
        width={Math.max(0.5, rectW)}
        height={ROW_H}
        fill={sign === 1 ? SIGN_POS : SIGN_NEG}
        opacity={sign === 1 ? POS_OPACITY : OBS.strip.fillOpacity}/>
    ));
  }

  // X-axis ticks — span the full dataset file-row range
  const worstPos = rows[0]?.pos;
  const topLen = filledRows[0]?.filled.length || 0;
  const pxPerPosAxis = STRIP_W / Math.max(topLen, 1);
  // Per-position file row labels (for mapping strip index → pixel)
  const fileRowLabels = worstPos && fileRow
    ? worstPos.map(ri => fileRow(ri))
    : Array.from({length: topLen}, (_, i) => i + 1);
  // Full dataset range for axis ticks
  const frFirst = firstFileRow || fileRowLabels[0] || 1;
  const frLast = lastFileRow || fileRowLabels[fileRowLabels.length - 1] || topLen;
  const xRowStep = niceStep(frLast - frFirst, 5);
  // Generate tick values in file-row space, then map to strip pixel positions
  const xTicks = [frFirst]; // always start with first file row
  const firstNiceRow = Math.ceil(frFirst / xRowStep) * xRowStep;
  for (let row = firstNiceRow; row <= frLast; row += xRowStep) {
    if (row > frFirst) xTicks.push(row);
  }
  if (xTicks[xTicks.length - 1] !== frLast) xTicks.push(frLast);
  // Dedupe and drop last if too close to previous
  let xTickVals = [...new Set(xTicks)];
  if (xTickVals.length >= 2) {
    const last = xTickVals[xTickVals.length - 1];
    const prev = xTickVals[xTickVals.length - 2];
    if (last - prev < xRowStep * 0.7) {
      xTickVals = [...xTickVals.slice(0, -2), last];
    }
  }
  // Map file-row value to pixel x position (linear interpolation across strip)
  function fileRowToX(fr) {
    return LABEL_W + ((fr - frFirst) / Math.max(frLast - frFirst, 1)) * STRIP_W;
  }

  const axisY = totalH - PB;

  return (
    <PlotSVG W={W} H={totalH} overflow>
      {/* Data strips */}
      {filledRows.map((row, ri) => {
        const y = rowY(ri);
        return (
          <g key={ri}>
            <text x={LABEL_W - 5} y={y + ROW_H * 0.62} fontSize={CF.LABEL} fill={C.TEXT}
              textAnchor="end" fontFamily={FF.MONO}>{shortName(row.group)}</text>
            {renderStrip(row.filled, y)}
            <text x={LABEL_W + STRIP_W + 6} y={y + ROW_H * 0.7} fontSize={CF.LABEL}
              fill={C.TEXT_2} fontFamily={FF.MONO}>{row.runs} runs</text>
          </g>
        );
      })}

      {/* X-axis */}
      <line x1={LABEL_W} y1={axisY} x2={LABEL_W + STRIP_W} y2={axisY}
        stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
      {xTickVals.map(fr => (
        <g key={fr}>
          <line x1={fileRowToX(fr)} y1={axisY}
            x2={fileRowToX(fr)} y2={axisY + 4}
            stroke={C.AXIS} strokeWidth={CS.GRID.w}/>
          <text x={fileRowToX(fr)} y={axisY + 13} fontSize={CF.SMALL}
            fill={C.TEXT_2} textAnchor="middle" fontFamily={FF.MONO}>
            {fr}
          </text>
        </g>
      ))}
      <text x={LABEL_W + STRIP_W / 2} y={totalH - 3} fontSize={CF.AXIS} fill={C.TEXT_2}
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

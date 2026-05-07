import { CP, CS, C, FF, CF } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { shortName } from "../shared/utils.js";

// Strip colours — two colours only
const SIGN_POS = "#002147"; // Oxford blue  (+1)
const SIGN_NEG = "#A3C1DA"; // Cambridge blue (−1)

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

// ── Count contiguous same-colour blocks in a filled array ────────
function countBlocks(filled) {
  if (!filled.length) return 0;
  let blocks = 1;
  for (let i = 1; i < filled.length; i++) {
    if (filled[i] !== filled[i - 1]) blocks++;
  }
  return blocks;
}

export function SignStripPlot({ groupSignSeqs, singleSeq, singleRuns, singleExp,
  fileRow, firstFileRow, lastFileRow, defaultRowLabel="R1–R2" }) {
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
  const SIM_GAP = 4;    // between top strip and simulated strip
  const SEP_GAP = 18;   // between headline unit and remaining strips
  const PT = 4, PB = 30;
  const W = CP.W_LG;
  const STRIP_W = W - LABEL_W - ANN_W;

  // ── Simulated strip for top pair only ──────────────────────────
  const topFilled = filledRows[0]?.filled || [];
  const topExpected = filledRows[0]?.expected;
  const topName = filledRows[0]?.group || "";
  const simSigns = buildSimStrip(topFilled, topExpected);
  const simRunCount = simSigns ? countBlocks(simSigns) : 0;
  const hasSimStrip = simSigns != null;

  // Layout: strip 0 → sim strip (SIM_GAP) → SEP_GAP → remaining strips (GAP)
  const simY = hasSimStrip ? PT + ROW_H + SIM_GAP : 0;
  const restStartY = hasSimStrip
    ? simY + ROW_H + SEP_GAP
    : PT + ROW_H + SEP_GAP;

  function rowY(ri) {
    if (ri === 0) return PT;
    return restStartY + (ri - 1) * (ROW_H + GAP);
  }

  const totalH = (filledRows.length > 1
    ? rowY(filledRows.length - 1) + ROW_H
    : (hasSimStrip ? simY + ROW_H : PT + ROW_H)
  ) + PB;

  // ── Render one rect per position, full strip width ─────────────
  function renderStrip(filled, y, opacity = 0.80) {
    const rectW = STRIP_W / filled.length;
    return filled.map((sign, i) => (
      <rect key={i}
        x={LABEL_W + i * rectW} y={y}
        width={Math.max(0.5, rectW)}
        height={ROW_H}
        fill={sign === 1 ? SIGN_POS : SIGN_NEG}
        opacity={opacity}/>
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

      {/* Simulated strip — top pair expected, reduced opacity */}
      {hasSimStrip && (
        <g>
          <text x={LABEL_W - 5} y={simY + ROW_H * 0.62} fontSize={CF.LABEL} fill={C.TEXT_4}
            textAnchor="end" fontFamily={FF.MONO}>{shortName(topName)} expected</text>
          {renderStrip(simSigns, simY, 0.4)}
          <text x={LABEL_W + STRIP_W + 6} y={simY + ROW_H * 0.7} fontSize={CF.LABEL}
            fill={C.TEXT_4} fontFamily={FF.MONO}>{simRunCount} runs</text>
        </g>
      )}

      {/* X-axis */}
      <line x1={LABEL_W} y1={axisY} x2={LABEL_W + STRIP_W} y2={axisY}
        stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {xTickVals.map(fr => (
        <g key={fr}>
          <line x1={fileRowToX(fr)} y1={axisY}
            x2={fileRowToX(fr)} y2={axisY + 4}
            stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
          <text x={fileRowToX(fr)} y={axisY + 13} fontSize={CF.SMALL}
            fill={C.TEXT_4} textAnchor="middle" fontFamily={FF.MONO}>
            {fr}
          </text>
        </g>
      ))}
      <text x={LABEL_W + STRIP_W / 2} y={totalH - 3} fontSize={CF.LABEL} fill={C.TEXT_4}
        textAnchor="middle" fontFamily={FF.UI}>Row</text>
    </PlotSVG>
  );
}

// ── Partition integer n into k positive integers summing to n ─────
function randomPartition(n, k, rng) {
  if (k <= 0) return [];
  if (k === 1) return [n];
  if (k >= n) return Array(n).fill(1); // all-ones (can't do k > n positive parts)
  const cuts = new Set();
  let guard = 0;
  while (cuts.size < k - 1 && guard < 10000) {
    cuts.add(Math.floor(rng() * (n - 1)) + 1);
    guard++;
  }
  const sorted = [0, ...Array.from(cuts).sort((a, b) => a - b), n];
  return sorted.slice(1).map((v, i) => v - sorted[i]);
}

// ── Construct a sign array with exactly targetRuns runs ──────────
function buildSimulatedSigns(nPlus, nMinus, targetRuns, rng) {
  const majorSign = nPlus >= nMinus ? 1 : -1;
  const majorN = Math.max(nPlus, nMinus);
  const minorN = Math.min(nPlus, nMinus);
  // Clamp runs so each sign has enough values for its partition
  const majorRuns = Math.min(Math.ceil(targetRuns / 2), majorN);
  const minorRuns = Math.min(Math.floor(targetRuns / 2), minorN);

  const majorLengths = randomPartition(majorN, majorRuns, rng);
  const minorLengths = randomPartition(minorN, minorRuns, rng);

  const result = [];
  for (let i = 0; i < Math.max(majorRuns, minorRuns); i++) {
    if (i < majorRuns) {
      for (let j = 0; j < majorLengths[i]; j++) result.push(majorSign);
    }
    if (i < minorRuns) {
      for (let j = 0; j < minorLengths[i]; j++) result.push(-majorSign);
    }
  }
  return result;
}

// ── Build simulated strip for top pair ───────────────────────────
function buildSimStrip(filledSigns, expected) {
  if (!filledSigns.length || !expected) return null;
  const nPlus = filledSigns.filter(s => s === 1).length;
  const nMinus = filledSigns.filter(s => s === -1).length;
  const targetRuns = Math.round(expected);
  if (targetRuns < 2 || nPlus < 1 || nMinus < 1) return null;

  // Lightweight Mulberry32 seeded deterministically
  let state = ((filledSigns.length * 2654435761) ^ (expected * 2246822519)) | 0;
  function rng() {
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return buildSimulatedSigns(nPlus, nMinus, targetRuns, rng);
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

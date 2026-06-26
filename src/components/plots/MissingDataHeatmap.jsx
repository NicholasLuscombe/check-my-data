import { C, CC, FF, CF, CS, SIGNAL, withAlpha } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";

// Cell colours
const PRESENT_FILL = C.BG_L; // near-white — almost invisible (slate-50, identical hex)
const MISSING_FILL = withAlpha(SIGNAL.RED.dot, 0.45); // visible pink at compressed row heights
const BLOCK_STROKE = CC.THRESH; // bold red outline for significant blocks

/**
 * Spatial heatmap of missing data — rows × columns grid with
 * significant block annotations (bold outlines + p-value labels).
 *
 * Props:
 *   missGrid    - boolean[][] (true = missing), rows × dataCols
 *   colNames    - string[] column names
 *   fileRows    - number[] original file row numbers per matrix row
 *   blocks      - { startRow, endRow, cols, adjP }[] significant blocks
 *                 (1-indexed rows and cols from test result)
 */
export function MissingDataHeatmap({ missGrid, colNames, fileRows, blocks }) {
  if (!missGrid?.length || !missGrid[0]?.length) return null;
  const nR = missGrid.length;
  const nC = missGrid[0].length;

  // Significant-block p-labels render in the right gutter (mono, 11px). Size
  // that gutter to the widest label rather than a fixed width — the same
  // content-sized shape as RegionalNoiseStrip's left pad — so a full
  // "p < 0.0001" never clips the container's right edge. Floor at 60 keeps the
  // prior spacing when no block is present.
  const fmtP = (p) => p < 0.0001 ? "p < 0.0001" : `p = ${p.toFixed(4)}`;
  const P_LABEL_GAP = 4;
  const maxPLabelLen = blocks?.length ? Math.max(...blocks.map(b => fmtP(b.adjP).length)) : 0;
  // Hard cap: grid fits within 300px height
  const PL = 42, PT = 4, PB = 32;
  const PR = Math.max(60, P_LABEL_GAP + Math.ceil(maxPLabelLen * 7) + 6);
  const MAX_GRID_H = 300;
  const maxPlotW = 320;
  const cellW = Math.max(6, Math.min(24, Math.floor(maxPlotW / nC)));
  const cellH = Math.max(1, Math.floor(MAX_GRID_H / nR));
  const gridW = nC * cellW;
  const gridH = nR * cellH;

  const W = PL + gridW + PR;
  const H = PT + gridH + PB;

  // Y-axis ticks — show every Nth row
  const yStep = nR <= 30 ? 5 : nR <= 100 ? 10 : 20;
  const yTicks = [];
  for (let r = 0; r < nR; r += yStep) yTicks.push(r);
  if (yTicks[yTicks.length - 1] !== nR - 1) yTicks.push(nR - 1);

  // Map block coordinates from 1-indexed to 0-indexed grid positions
  const sigBlocks = (blocks || []).map(b => ({
    r0: b.startRow - 1,                     // 0-indexed row start
    r1: b.endRow,                            // 0-indexed row end (exclusive)
    c0: Math.min(...b.cols) - 1,             // 0-indexed col start
    c1: Math.max(...b.cols),                 // 0-indexed col end (exclusive)
    adjP: b.adjP,
  }));

  return (
    <PlotSVG W={W} H={H}>
      {/* Grid cells */}
      {missGrid.map((row, r) =>
        row.map((missing, c) => (
          <rect key={`${r}-${c}`}
            x={PL + c * cellW} y={PT + r * cellH}
            width={cellH <= 3 ? cellW : cellW - 0.5}
            height={cellH <= 3 ? cellH : cellH - 0.5}
            fill={missing ? MISSING_FILL : PRESENT_FILL}
            stroke={cellH <= 3 ? "none" : C.WHITE} strokeWidth="0.5" />
        ))
      )}

      {/* Significant block outlines + p-value labels */}
      {sigBlocks.map((b, i) => {
        const x = PL + b.c0 * cellW;
        const y = PT + b.r0 * cellH;
        const w = (b.c1 - b.c0) * cellW;
        const h = (b.r1 - b.r0) * cellH;
        const labelX = PL + gridW + P_LABEL_GAP;
        const labelY = y + h / 2 + 3;
        return (
          <g key={`blk${i}`}>
            <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2}
              fill="none" stroke={BLOCK_STROKE} strokeWidth="2" rx="1" />
            <text x={labelX} y={labelY} fontSize={CF.SMALL} fill={BLOCK_STROKE}
              fontFamily={FF.MONO} fontWeight="600">
              {fmtP(b.adjP)}
            </text>
          </g>
        );
      })}

      {/* Y-axis ticks — original file row numbers */}
      {yTicks.map(r => (
        <text key={r} x={PL - 3} y={PT + r * cellH + cellH / 2 + 3}
          fontSize={CF.SMALL} fill={C.TEXT_2} textAnchor="end" fontFamily={FF.MONO}>
          {fileRows?.[r] ?? r + 1}
        </text>
      ))}

      {/* X-axis column labels */}
      {colNames.map((name, c) => (
        <text key={c} x={PL + c * cellW + cellW / 2} y={PT + gridH + 12}
          fontSize={CF.SMALL} fill={C.TEXT_2} textAnchor="end" fontFamily={FF.UI}
          transform={`rotate(-45,${PL + c * cellW + cellW / 2},${PT + gridH + 12})`}>
          {name}
        </text>
      ))}

      {/* Y-axis label */}
      <text x={8} y={PT + gridH / 2} fontSize={CF.AXIS} fill={C.TEXT_2}
        textAnchor="middle" fontFamily={FF.UI}
        transform={`rotate(-90,8,${PT + gridH / 2})`}>Row</text>
    </PlotSVG>
  );
}

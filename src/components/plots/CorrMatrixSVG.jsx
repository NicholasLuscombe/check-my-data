/**
 * CorrMatrixSVG — SVG lower-triangle correlation matrix, responsive.
 * Uses shared SvgAxis / SvgHeatmapCell / SvgLegend / SvgLabel utilities
 * to enforce consistent label styling and rotation rules app-wide.
 *
 * @param {string[]} labels        — row/column names (shared)
 * @param {function} getValue      — (rowLabel, colLabel) → cell value
 * @param {function} formatCell    — value → display string
 * @param {function} cellBg        — value → fill colour
 * @param {function} cellText      — value → text colour
 * @param {function} cellBold      — value → boolean
 * @param {string}  [title]        — condition group name above matrix
 * @param {string}  [titleColor]   — COND_COLORS text colour for title
 * @param {Array<{color,label}>} [legend] — legend items below matrix
 * @param {string[]} [labelColors]  — per-label colour strings, same order as labels array
 */
import { C, FW } from "../../constants/tokens.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { SvgLabel } from "../shared/SvgLabel.jsx";
import { SvgAxis } from "../shared/SvgAxis.jsx";
import { SvgHeatmapCell } from "../shared/SvgHeatmapCell.jsx";
import { SvgLegend } from "../shared/SvgLegend.jsx";

const CHAR_W = 6; // must match SvgAxis heuristic

export function CorrMatrixSVG({ labels, getValue, formatCell, cellBg, cellText, cellBold, title, titleColor, legend, labelColors }) {
  if (!labels || labels.length < 2) return null;
  const n = labels.length;
  const fmt = formatCell || (v => v != null && typeof v === "number" ? v.toFixed(2) : "");

  // Cell size: adaptive to n — matches CCR's tiers (42/36/30)
  const CELL = n > 8 ? 30 : n > 5 ? 36 : 42;
  const GAP  = 2;

  // Determine rotation so height can be computed before rendering
  const maxColLabelLen = Math.max(...labels.slice(0, -1).map(l => l.length), 1);
  const rotateCol = maxColLabelLen * CHAR_W > CELL;
  const COL_LABEL_H = rotateCol ? 60 : 20;

  // Layout
  const maxRowLabelLen = Math.max(...labels.slice(1).map(l => l.length), 1);
  const ROW_LABEL_W = Math.min(Math.max(maxRowLabelLen * CHAR_W + 12, 50), 140);
  const TITLE_H  = title  ? 20 : 0;
  const LEGEND_H = legend?.length ? 24 : 0;
  const PAD = 4;

  const nCols = n - 1; // lower-triangle: first n-1 labels are column headers
  const nRows = n - 1; // lower-triangle: last n-1 labels are row headers
  const gridW = nCols * (CELL + GAP);
  const gridH = nRows * (CELL + GAP);
  const gridX = PAD + ROW_LABEL_W;
  const gridY = PAD + TITLE_H;

  const W = gridX + gridW + PAD;
  const H = gridY + gridH + GAP + COL_LABEL_H + LEGEND_H + PAD;

  // Label arrays — when labelColors provided, use {text, color} objects for SvgAxis
  const colLabels = labelColors
    ? labels.slice(0, -1).map((l, i) => ({ text: l, color: labelColors[i] || null }))
    : labels.slice(0, -1);
  const rowLabels = labelColors
    ? labels.slice(1).map((l, i) => ({ text: l, color: labelColors[i + 1] || null }))
    : labels.slice(1);

  return (
    <PlotSVG W={W} H={H}>

      {/* Condition group title */}
      {title && (
        <SvgLabel
          x={gridX} y={PAD + 14}
          text={title} role="axis"
          color={titleColor}
          textAnchor="start"
        />
      )}

      {/* Column labels — below the grid, 10px gap from last cell bottom */}
      <SvgAxis
        labels={colLabels}
        position="bottom-col"
        cellSize={CELL} cellSpacing={GAP}
        x0={gridX} y0={gridY + gridH}
        gap={10}
        role="tick"
      />

      {/* Matrix body: row labels + lower-triangle cells */}
      {rowLabels.map((rowL, ri) => {
        const rowY = gridY + ri * (CELL + GAP);
        const rowText = typeof rowL === "string" ? rowL : rowL.text;
        const rowColor = typeof rowL === "string" ? undefined : rowL.color;
        return (
          <g key={"r" + ri}>
            {/* Row label */}
            <SvgLabel
              x={gridX - 6} y={rowY + CELL / 2}
              text={rowText} role="tick"
              color={rowColor}
              textAnchor="end" dominantBaseline="central"
            />
            {/* Cells — columns 0..ri (lower triangle) */}
            {labels.slice(0, ri + 1).map((colL, ci) => {
              const val = getValue(rowText, colL);
              return (
                <SvgHeatmapCell key={"c" + ci}
                  x={gridX + ci * (CELL + GAP)} y={rowY}
                  width={CELL} height={CELL}
                  fill={cellBg(val)}
                  value={fmt(val)}
                  valueFill={cellText(val)}
                  fontWeight={cellBold(val) ? FW.BOLD : FW.NORM}
                />
              );
            })}
          </g>
        );
      })}

      {/* Legend */}
      {legend?.length > 0 && (
        <SvgLegend
          items={legend}
          x={gridX}
          y={gridY + gridH + GAP + COL_LABEL_H + 4}
          itemWidth={80}
        />
      )}

    </PlotSVG>
  );
}

/**
 * SvgAxis — axis label renderer for heatmaps and correlation matrices.
 *
 * Rotation convention — ALL rotated labels use rotate(-45°), producing the
 * "/" reading direction (bottom-left → top-right). This is the app-wide
 * standard for all heatmap axes.
 *
 * Positions:
 *   "bottom-col"  Column labels below a grid.
 *                 x0 = left edge of first cell, y0 = bottom of grid.
 *                 Rotated: anchor at RIGHT edge of cell, textAnchor="end",
 *                 rotate(-45°) → "/" direction, text fans up-right from anchor.
 *                 Caller must reserve enough vertical space below y0 for labels:
 *                   ≈ gap + 0.75 × maxLabelPx + 12 px
 *
 *   "left-row"    Row labels left of a grid.
 *                 x0 = left edge of cells, y0 = top of first cell.
 *                 Always horizontal, right-aligned, vertically centred.
 *
 *   "top-strip"   Labels above heatmap strips.
 *                 x0 = left edge of first strip, y0 = top of data area.
 *                 Rotated: anchor at LEFT edge of strip, textAnchor="start",
 *                 rotate(-45°) → "/" direction, fanning up-right away from data.
 *                 Caller must reserve enough vertical space above y0 for labels:
 *                   ≈ gap + 0.75 × maxLabelPx + 12 px
 *
 * labels      string[] | {text, color?}[]
 * cellSize    width of each cell (cols) or height (rows) in px
 * cellSpacing gap between cells in px (default 2)
 * gap         px between the label anchor and the data grid edge (default 8)
 * role        SvgLabel role for all items (default "tick")
 */
import { SvgLabel } from "./SvgLabel.jsx";

const CHAR_W = 6; // px per character — font-size ~10px in FF.UI

export function SvgAxis({
  labels,
  position,
  cellSize,
  cellSpacing = 2,
  x0,
  y0,
  gap = 8,
  role = "tick",
}) {
  if (!labels?.length) return null;
  const items = labels.map(l => (typeof l === "string" ? { text: l, color: null } : l));
  const maxLen = Math.max(...items.map(l => (l.text?.length ?? 0)), 1);

  if (position === "left-row") {
    return (
      <g>
        {items.map((item, i) => (
          <SvgLabel key={i}
            x={x0 - gap}
            y={y0 + i * (cellSize + cellSpacing) + cellSize / 2}
            text={item.text}
            role={role}
            color={item.color}
            textAnchor="end"
            dominantBaseline="central"
          />
        ))}
      </g>
    );
  }

  if (position === "bottom-col") {
    const rotate = maxLen * CHAR_W > cellSize;
    return (
      <g>
        {items.map((item, i) => {
          // Rotated:    anchor at RIGHT edge, textAnchor="end", rotate(-45°).
          //   "/" direction — text fans up-right toward data above.
          // Horizontal: anchor at cell centre, textAnchor="middle".
          const x = rotate
            ? x0 + i * (cellSize + cellSpacing) + cellSize
            : x0 + i * (cellSize + cellSpacing) + cellSize / 2;
          return (
            <SvgLabel key={i}
              x={x} y={y0 + gap}
              text={item.text}
              role={role}
              color={item.color}
              textAnchor={rotate ? "end" : "middle"}
              rotate={rotate}
              deg={-45}
            />
          );
        })}
      </g>
    );
  }

  if (position === "top-strip") {
    const rotate = maxLen * CHAR_W > cellSize;
    return (
      <g>
        {items.map((item, i) => {
          // Rotated:    anchor at LEFT edge, textAnchor="start", rotate(-45°).
          //   "/" direction — labels fan up-right, away from data below.
          // Horizontal: anchor at strip centre, textAnchor="middle".
          const x = rotate
            ? x0 + i * (cellSize + cellSpacing)
            : x0 + i * (cellSize + cellSpacing) + cellSize / 2;
          return (
            <SvgLabel key={i}
              x={x} y={y0 - gap}
              text={item.text}
              role={role}
              color={item.color}
              textAnchor={rotate ? "start" : "middle"}
              rotate={rotate}
              deg={-45}
            />
          );
        })}
      </g>
    );
  }

  return null;
}

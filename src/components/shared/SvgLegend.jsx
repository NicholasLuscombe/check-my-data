/**
 * SvgLegend — horizontal legend with colour swatches.
 *
 * items       [{color, label}]
 * x, y        top-left of first swatch (x should align with grid left edge)
 * itemWidth   px between swatch starts (default 80)
 */
import { C, FF, CF, FW } from "../../constants/tokens.js";

const SWATCH = 10;
const TEXT_GAP = 5;

export function SvgLegend({ items, x, y, itemWidth = 80 }) {
  if (!items?.length) return null;
  return (
    <g>
      {items.map((item, i) => (
        <g key={i}>
          <rect
            x={x + i * itemWidth} y={y}
            width={SWATCH} height={SWATCH}
            rx={2} fill={item.color}
          />
          <text
            x={x + i * itemWidth + SWATCH + TEXT_GAP}
            y={y + SWATCH / 2}
            fontSize={CF.SMALL}
            fontFamily={FF.UI}
            fontWeight={FW.NORM}
            fill={C.TEXT_4}
            dominantBaseline="central"
          >
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}

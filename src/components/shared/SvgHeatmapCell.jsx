/**
 * SvgHeatmapCell — single heatmap/matrix cell: coloured rect + optional centred value.
 *
 * showValue   explicit override; auto-derived as width >= 30 when omitted
 * value       string to display (already formatted by caller)
 * valueFill   text colour for the value
 * fontWeight  override font-weight for the value (default FW.NORM)
 * fillOpacity rect opacity (default 1; softened observed tiles pass < 1 — S255)
 */
import { FF, CF, FW } from "../../constants/tokens.js";

export function SvgHeatmapCell({
  x, y, width, height,
  fill,
  fillOpacity = 1,
  rx = 3,
  value,
  valueFill,
  fontWeight,
  showValue,
}) {
  const display = showValue ?? (width >= 30);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={rx} fill={fill} fillOpacity={fillOpacity}/>
      {display && value != null && (
        <text
          x={x + width / 2} y={y + height / 2}
          fontSize={width <= 32 ? CF.SMALL : CF.TICK}
          fontFamily={FF.MONO}
          fontWeight={fontWeight ?? FW.NORM}
          fill={valueFill}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {value}
        </text>
      )}
    </g>
  );
}

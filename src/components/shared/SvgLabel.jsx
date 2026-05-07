/**
 * SvgLabel — single SVG text element with enforced typography conventions.
 * Callers choose a role; font-family, size, weight, colour are derived automatically.
 * A color prop overrides the role default (used for COND_COLORS).
 *
 * Roles
 *   "tick"   — axis/heatmap labels   CF.TICK  FF.UI   FW.SEMI  C.TEXT_2
 *   "axis"   — axis titles            CF.AXIS  FF.UI   FW.SEMI  C.TEXT_2
 *   "title"  — section headings       12       FF.UI   FW.SEMI  C.TEXT_2
 *   "legend" — legend annotation      CF.SMALL FF.UI   FW.NORM  C.TEXT_4
 *   "value"  — in-cell numeric data   CF.TICK  FF.MONO FW.NORM  C.TEXT
 *   "yaxis"  — numeric row-index tick CF.AXIS  FF.MONO FW.NORM  C.TEXT_4
 *
 * Rotation: rotate=true applies rotate(deg ?? 45, x, y).
 *   deg=45  → clockwise "\" (default, for bottom-col labels)
 *   deg=-45 → counter-clockwise "/" (for top-strip labels above grid)
 */
import { C, FF, CF, FW } from "../../constants/tokens.js";

const ROLES = {
  tick:   { fontSize: CF.TICK,  fontFamily: FF.UI,   fontWeight: FW.SEMI, fill: C.TEXT_2 },
  axis:   { fontSize: CF.AXIS,  fontFamily: FF.UI,   fontWeight: FW.SEMI, fill: C.TEXT_2 },
  title:  { fontSize: "12",     fontFamily: FF.UI,   fontWeight: FW.SEMI, fill: C.TEXT_2 },
  legend: { fontSize: CF.SMALL, fontFamily: FF.UI,   fontWeight: FW.NORM, fill: C.TEXT_4 },
  value:  { fontSize: CF.TICK,  fontFamily: FF.MONO, fontWeight: FW.NORM, fill: C.TEXT   },
  yaxis:  { fontSize: CF.AXIS,  fontFamily: FF.MONO, fontWeight: FW.NORM, fill: C.TEXT_4 },
};

export function SvgLabel({
  x, y, text,
  role = "tick",
  color,
  textAnchor = "start",
  dominantBaseline,
  rotate = false,
  deg,
  fontWeight,
}) {
  if (text == null || text === "") return null;
  const s = ROLES[role] || ROLES.tick;
  return (
    <text
      x={x} y={y}
      fontSize={s.fontSize}
      fontFamily={s.fontFamily}
      fontWeight={fontWeight ?? s.fontWeight}
      fill={color ?? s.fill}
      textAnchor={textAnchor}
      dominantBaseline={dominantBaseline}
      transform={rotate ? `rotate(${deg ?? 45}, ${x}, ${y})` : undefined}
    >
      {text}
    </text>
  );
}

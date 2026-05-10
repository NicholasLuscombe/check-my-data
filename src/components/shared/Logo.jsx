import { C, FW } from "../../constants/tokens.js";

export function Logo({ width=280 }) {
  return (
    <svg width={width} viewBox="0 0 580 170" style={{display:"block"}}>
      <text
        x="290"
        y="85"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={FW.BOLD}
        fontSize="64"
        fill={C.TEXT}
        textAnchor="middle"
        dominantBaseline="central"
      >
        Check My Data
      </text>
    </svg>
  );
}

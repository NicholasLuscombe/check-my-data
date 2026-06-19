/* ── ChartLegend — shared HTML legend for charts ──
   Renders outside PlotLayout on the white card background.
   Enforces consistent swatch size, font, and spacing across all cards.

   Three modes:
     items=[{color,label}]  → discrete colour swatches (default square)
     items + swatchType="line" → line+dot swatches for line charts
     gradient={from,to,startLabel,endLabel,mid?,midPos?,width?}  → continuous gradient
       bar (optional mid inserts a three-stop ramp: from → mid → to; optional midPos
       is the mid stop's position in percent, e.g. to mirror a gamma-curved ramp) */

import { C, FF, FS, FW } from "../../constants/tokens.js";

const SWATCH = 12;

export function ChartLegend({ items, gradient, swatchType }) {
  const wrap = { marginBottom: "8px", justifyContent: "flex-start" };

  if (gradient) {
    return (
      <div style={{...wrap, display: "flex", alignItems: "center", gap: "6px"}}>
        <span style={{fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3}}>
          {gradient.startLabel}
        </span>
        <div style={{
          width: gradient.width || 80,
          height: 8,
          borderRadius: 2,
          background: `linear-gradient(to right, ${gradient.from}, ${gradient.mid ? gradient.mid + (gradient.midPos != null ? ` ${gradient.midPos}%` : "") + ", " : ""}${gradient.to})`,
          border: `0.5px solid ${C.BORDER_L}`,
          flexShrink: 0,
        }} />
        <span style={{fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3}}>
          {gradient.endLabel}
        </span>
      </div>
    );
  }

  if (!items?.length) return null;
  const globalLine = swatchType === "line";
  return (
    <div style={{...wrap, display: "flex", flexWrap: "wrap", gap: "12px"}}>
      {items.map((item, i) => {
        if (item.swatchType === "none") return (
          <span key={i} style={{fontSize: FS.xs, fontFamily: FF.UI, fontStyle: "italic", color: C.TEXT_3}}>{item.label}</span>
        );
        const isLine = item.swatchType === "line" || (globalLine && item.swatchType !== "square" && item.swatchType !== "dot");
        const isDot = item.swatchType === "dot";
        return (
        <div key={i} style={{display: "flex", alignItems: "center", gap: "5px"}}>
          {isDot ? (
            <svg width={SWATCH} height={SWATCH} style={{flexShrink: 0, opacity: item.opacity ?? 1}}>
              <circle cx={SWATCH / 2} cy={SWATCH / 2} r={SWATCH / 2 - 1}
                fill={item.color}
                stroke={item.stroke || "none"} strokeWidth={item.stroke ? 1.5 : 0} />
            </svg>
          ) : isLine ? (
            <svg width="20" height={SWATCH} style={{flexShrink: 0, opacity: item.opacity ?? 1}}>
              <line x1="0" y1={SWATCH / 2} x2="20" y2={SWATCH / 2}
                stroke={item.color} strokeWidth={item.strokeWidth ?? 2}
                {...(item.dashed ? {strokeDasharray: "4,3"} : {})} />
              {!item.dashed && item.showDot !== false && <circle cx="10" cy={SWATCH / 2} r="3"
                fill={item.color} />}
            </svg>
          ) : (
            <div style={{
              width: SWATCH, height: SWATCH, borderRadius: 2,
              background: item.color, flexShrink: 0,
              opacity: item.opacity ?? 1,
              ...(item.stroke ? {border: `2px solid ${item.stroke}`} : {}),
            }} />
          )}
          <span style={{fontSize: FS.xs, fontFamily: FF.UI, fontWeight: FW.NORM, color: C.TEXT_3}}>
            {item.label}
          </span>
        </div>
      );})}
    </div>
  );
}

/* ── ColumnStatBar — per-column statistic bar with reference line ──
   Shared visual for the Distribution Shapes trio (Entropy / Zipf,
   Column GoF, Modality). Renders one bar per tested column; flagged
   columns take the card-level tier colour, non-flagged columns take
   the cleared-state neutral grey at low opacity. A horizontal
   dashed reference line marks the test's expected value (entropy
   ratio = 1, AD² null median = 1, dip-magnitude gate). Skipped
   columns surface as outlined no-fill markers at baseline with a
   "skipped" tick so absence is shown rather than implied.

   S184 A2: v1.0 Bik minimum visual — the per-column statistic carries
   the argument card-side without needing matrix access. The richer
   v1.x distribution-histogram with fitted-reference overlay is out
   of scope here. */

import { C, CP, CS, CF, FS, FF } from "../../constants/tokens.js";
import { SEV_VERDICT } from "../../constants/tokens.js";
import { FLAG_RANK } from "../../constants/thresholds.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";

const NEUTRAL = C.TEXT_3;
const CLEARED_OPACITY = 0.4;

function niceStep(range) {
  if (range <= 0) return 1;
  const rough = range / 4;
  const p = Math.pow(10, Math.floor(Math.log10(rough)));
  const n = rough / p;
  return (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * p;
}

function fmtTick(v) {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10) return v.toFixed(0);
  if (Math.abs(v) >= 1)  return v.toFixed(1);
  return v.toFixed(2);
}

/**
 * @param {object} props
 * @param {Array<{colLabel:string,value:number,flagged:boolean}>} props.items - tested columns
 * @param {Array<{colLabel:string,reason?:string}>} [props.skipped] - skipped columns (no value)
 * @param {string} props.cardFlag - card-level result.flag, drives flagged-bar colour
 * @param {number} props.refValue - reference line value (e.g. 1.0 for ratios, DIP_GATE for modality)
 * @param {string} props.refLabel - reference line caption (rendered as figure caption, not on the line)
 * @param {string} props.valueAxisLabel - y-axis label
 */
export function ColumnStatBar({ items, skipped, cardFlag, refValue, refLabel, valueAxisLabel }) {
  if (!items?.length && !skipped?.length) return null;

  const flaggedColor = SEV_VERDICT[FLAG_RANK[cardFlag] ?? 0].color;

  // Merge tested + skipped into a single ordered slot list. Each slot carries
  // either a tested item (with value) or a skipped marker. Numeric ordering by
  // col index when possible; tested items keep their input order otherwise.
  const slotsTested = (items || []).map(d => ({ kind: "tested", ...d }));
  const slotsSkipped = (skipped || []).map(d => ({
    kind: "skipped",
    colLabel: d.colLabel || `Col ${d.col}`,
    col: d.col,
    reason: d.reason || "skipped",
  }));
  const allSlots = [...slotsTested, ...slotsSkipped].sort((a, b) => {
    const na = Number(a.col ?? parseInt(String(a.colLabel).replace(/[^\d]/g, ""), 10));
    const nb = Number(b.col ?? parseInt(String(b.colLabel).replace(/[^\d]/g, ""), 10));
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return 0;
  });

  const W = CP.W_MD, H = 140, PL = 44, PR = 12, PT = 10, PB = 34;
  const CW = W - PL - PR;
  const CH = H - PT - PB;
  const vals = slotsTested.map(d => Number(d.value) || 0);
  const rawMax = Math.max(...vals, refValue || 0, 1e-6);
  const step = niceStep(rawMax);
  const ticks = [];
  for (let t = 0; t <= rawMax + step * 0.01; t += step) {
    ticks.push(Math.round(t * 1e6) / 1e6);
  }
  if (ticks[ticks.length - 1] < rawMax) ticks.push(ticks[ticks.length - 1] + step);
  const mx = ticks[ticks.length - 1] || 1;
  const bw = Math.max(2, Math.floor(CW / allSlots.length) - 4);
  const yscale = v => PT + CH - (v / mx) * CH;
  const baselineY = PT + CH;

  return (
    <PlotLayout fitContent>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <PlotSVG W={W} H={H} overflow>
          {/* y-axis gridlines + tick labels */}
          {ticks.map(t => (
            <g key={t}>
              {t > 0 && (
                <line x1={PL} y1={yscale(t)} x2={W - PR} y2={yscale(t)}
                  stroke={C.BORDER_L} strokeWidth={CS.GRID.w} />
              )}
              <text x={PL - 4} y={yscale(t) + 3.5} fontSize={CF.TICK} fill={C.TEXT_3}
                textAnchor="end" fontFamily={FF.MONO}>{fmtTick(t)}</text>
            </g>
          ))}

          {/* reference line (label appears as caption below, not on the line, so
              it never overlaps a bar at any column count) */}
          {Number.isFinite(refValue) && refValue >= 0 && refValue <= mx && (
            <line x1={PL} y1={yscale(refValue)} x2={W - PR} y2={yscale(refValue)}
              stroke={C.TEXT_3} strokeWidth={CS.REF.w}
              strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />
          )}

          {/* slots — tested bars + skipped markers, ordered by column index */}
          {allSlots.map((s, i) => {
            const x = PL + i * (bw + 4) + 2;
            const cx = x + bw / 2;
            const labelText = (
              <text x={cx} y={H - PB + 12} fontSize={CF.LABEL} fill={C.TEXT_3}
                textAnchor="middle" fontFamily={FF.MONO}>{s.colLabel}</text>
            );
            if (s.kind === "tested") {
              const v = Number(s.value) || 0;
              const isFlagged = !!s.flagged;
              const fill = isFlagged ? flaggedColor : NEUTRAL;
              const fillOpacity = isFlagged ? 0.55 : CLEARED_OPACITY;
              const barH = v <= 0 ? 0 : Math.max(1, (v / mx) * CH);
              return (
                <g key={i}>
                  {barH > 0 && (
                    <rect x={x} y={yscale(v)} width={bw} height={barH} rx="1"
                      fill={fill} fillOpacity={fillOpacity}
                      stroke={fill} strokeWidth="1" />
                  )}
                  {labelText}
                </g>
              );
            }
            // skipped slot — short tick at baseline, no fill (accounting marker)
            const tickH = 4;
            return (
              <g key={i}>
                <line x1={x + 1} y1={baselineY} x2={x + bw - 1} y2={baselineY}
                  stroke={C.TEXT_3} strokeWidth="1" />
                <line x1={cx} y1={baselineY} x2={cx} y2={baselineY + tickH}
                  stroke={C.TEXT_3} strokeWidth="1" />
                {labelText}
                <text x={cx} y={H - PB + 22} fontSize={CF.TINY} fill={C.TEXT_3}
                  textAnchor="middle" fontFamily={FF.UI} fontStyle="italic">skipped</text>
              </g>
            );
          })}

          {/* axes */}
          <line x1={PL} y1={PT} x2={PL} y2={PT + CH}
            stroke={C.BORDER} strokeWidth={CS.GRID.w} />
          <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH}
            stroke={C.BORDER} strokeWidth={CS.GRID.w} />

          {/* y-axis label */}
          {valueAxisLabel && (
            <text x={10} y={PT + CH / 2} fontSize={CF.AXIS} fill={C.TEXT_3}
              textAnchor="middle" fontFamily={FF.UI}
              transform={`rotate(-90,10,${PT + CH / 2})`}>{valueAxisLabel}</text>
          )}
        </PlotSVG>

        {/* Caption row — reference legend (left), skipped count (right when present).
            Captions sit below the SVG so they never collide with bars. */}
        {(refLabel || slotsSkipped.length > 0) && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginTop: "6px", paddingLeft: `${PL}px`, paddingRight: `${PR}px`,
            fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3,
          }}>
            {refLabel && (
              <span>
                <svg width="22" height="6" style={{ verticalAlign: "middle", marginRight: "4px" }}>
                  <line x1="0" y1="3" x2="22" y2="3" stroke={C.TEXT_3}
                    strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />
                </svg>
                {refLabel}
              </span>
            )}
            {slotsSkipped.length > 0 && (
              <span>
                {slotsSkipped.length} skipped (
                {[...new Set(slotsSkipped.map(s => s.reason))].slice(0, 2).join("; ")}
                )
              </span>
            )}
          </div>
        )}
      </div>
    </PlotLayout>
  );
}

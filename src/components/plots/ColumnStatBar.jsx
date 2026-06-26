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

import { C, CC, CP, CS, CF, FS, FF, OBS } from "../../constants/tokens.js";
import { SEV_VERDICT } from "../../constants/tokens.js";
import { FLAG_RANK } from "../../constants/thresholds.js";
import { PlotSVG } from "./PlotSVG.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";

// Cleared bars route the shared OBS.areaFill treatment (token + 0.35 + same-token
// stroke). The prior local CLEARED_OPACITY=0.4 was undocumented drift off that
// family (S255 Q3) — collapsed here so the only deviation, the 0.4, disappears.

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
 * @param {boolean} [props.isAggregated] - true when card is per-condition routed; bars come from
 *   the worst-flagged slice's colRatios via the aggregator's spread, so the bar reflects ONE
 *   condition while the table below shows all conditions. Surfaces a scope caption so a column
 *   marked "skipped" in the bar but flagged in the table reads as two views, not a contradiction.
 *   Full condition-aware bar is parked (item 46).
 * @param {string} [props.skippedClause] - reader-friendly clause appended after "Col N skipped — "
 *   in the caption. Cards author this per-test (different gates skip for different reasons —
 *   ColumnGoF's family-set coverage vs Modality's uniform-reference null). Falls back to an
 *   auto-trim of the producer reason (strips "Pre-skip: γ₁=…, γ₂=… —" diagnostic prefix) when
 *   not supplied.
 */
export function ColumnStatBar({ items, skipped, cardFlag, refValue, refLabel, refColor = CC.EXP, valueAxisLabel, isAggregated, skippedClause }) {
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

  const W = CP.W_MD, PL = 44, PR = 12, PT = 10;
  const CW = W - PL - PR;
  const CH = 96; // plot-area height (was H 140 − PT 10 − PB 34, the horizontal-label case)
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

  // Rotate the per-bar column labels when a label is wider than the bar slot it
  // sits under — the same crowd test SvgAxis applies to its categorical
  // bottom-col labels. Uncrowded charts keep the labels horizontal exactly as
  // before; only a crowded chart rotates and grows its bottom gutter.
  const CHAR_W = 6; // px per char at CF.LABEL — must match SvgAxis heuristic
  const slotPitch = bw + 4;
  const maxLabelLen = Math.max(...allSlots.map(s => String(s.colLabel || "").length), 1);
  const rotateLabels = maxLabelLen * CHAR_W > slotPitch;

  // Bottom gutter: fixed 34 for horizontal labels. When rotated, reserve the
  // labels' vertical extent (about 0.75 of label width at 45 degrees) so they
  // sit inside the SVG box instead of overflowing it, plus one extra line when
  // skipped slots add their "skipped" sub-label below the column name.
  const ROT_GAP = 4; // baseline to rotated-label anchor
  const PB = rotateLabels
    ? Math.max(34, ROT_GAP + Math.ceil(0.75 * maxLabelLen * CHAR_W) + 12 + (slotsSkipped.length ? 11 : 0))
    : 34;
  const H = PT + CH + PB;
  const yscale = v => PT + CH - (v / mx) * CH;
  const baselineY = PT + CH;

  return (
    <>
    <PlotLayout fitContent>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <PlotSVG W={W} H={H} overflow>
          {/* y-axis gridlines + tick labels */}
          {ticks.map(t => (
            <g key={t}>
              {t > 0 && (
                <line x1={PL} y1={yscale(t)} x2={W - PR} y2={yscale(t)}
                  stroke={C.GRID} strokeWidth={CS.GRID.w} />
              )}
              <text x={PL - 4} y={yscale(t) + 3.5} fontSize={CF.TICK} fill={C.TEXT_2}
                textAnchor="end" fontFamily={FF.MONO}>{fmtTick(t)}</text>
            </g>
          ))}

          {/* reference line (label appears as caption below, not on the line, so
              it never overlaps a bar at any column count) */}
          {Number.isFinite(refValue) && refValue >= 0 && refValue <= mx && (
            <line x1={PL} y1={yscale(refValue)} x2={W - PR} y2={yscale(refValue)}
              stroke={refColor} strokeWidth={CS.REF.w}
              strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />
          )}

          {/* slots — tested bars + skipped markers, ordered by column index */}
          {allSlots.map((s, i) => {
            const x = PL + i * (bw + 4) + 2;
            const cx = x + bw / 2;
            const rightEdge = x + bw;
            // Horizontal under the bar centre when uncrowded; rotated -45 at the
            // bar's right edge when crowded (the SvgAxis bottom-col convention).
            const labelText = rotateLabels ? (
              <text x={rightEdge} y={baselineY + ROT_GAP} fontSize={CF.LABEL} fill={C.TEXT_2}
                textAnchor="end" fontFamily={FF.UI}
                transform={`rotate(-45,${rightEdge},${baselineY + ROT_GAP})`}>{s.colLabel}</text>
            ) : (
              <text x={cx} y={H - PB + 12} fontSize={CF.LABEL} fill={C.TEXT_2}
                textAnchor="middle" fontFamily={FF.UI}>{s.colLabel}</text>
            );
            if (s.kind === "tested") {
              const v = Number(s.value) || 0;
              const isFlagged = !!s.flagged;
              const fill = isFlagged ? flaggedColor : OBS.areaFill.fill;
              const fillOpacity = isFlagged ? 1 : OBS.areaFill.fillOpacity;
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
                {rotateLabels ? (
                  <text x={rightEdge} y={baselineY + ROT_GAP + 11} fontSize={CF.TINY} fill={C.TEXT_3}
                    textAnchor="end" fontFamily={FF.UI} fontStyle="italic"
                    transform={`rotate(-45,${rightEdge},${baselineY + ROT_GAP + 11})`}>skipped</text>
                ) : (
                  <text x={cx} y={H - PB + 22} fontSize={CF.TINY} fill={C.TEXT_3}
                    textAnchor="middle" fontFamily={FF.UI} fontStyle="italic">skipped</text>
                )}
              </g>
            );
          })}

          {/* axes */}
          <line x1={PL} y1={PT} x2={PL} y2={PT + CH}
            stroke={C.AXIS} strokeWidth={CS.GRID.w} />
          <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH}
            stroke={C.AXIS} strokeWidth={CS.GRID.w} />

          {/* y-axis label */}
          {valueAxisLabel && (
            <text x={10} y={PT + CH / 2} fontSize={CF.AXIS} fill={C.TEXT_2}
              textAnchor="middle" fontFamily={FF.UI}
              transform={`rotate(-90,10,${PT + CH / 2})`}>{valueAxisLabel}</text>
          )}
        </PlotSVG>
      </div>
    </PlotLayout>

      {/* Caption stack — moved below the plot wrapper (S212) to match the
          battery's below-wrapper caption convention; content + order are
          unchanged. Full-width left-aligned — the in-box PL/PR indent is
          dropped now that the bordered wrapper no longer encloses it. */}
      {(refLabel || slotsSkipped.length > 0 || isAggregated) && (
        <div style={{
          marginTop: "6px",
          fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3,
          display: "flex", flexDirection: "column", gap: "3px",
        }}>
          {refLabel && (
            <div>
              <svg width="22" height="6" style={{ verticalAlign: "middle", marginRight: "4px" }}>
                <line x1="0" y1="3" x2="22" y2="3" stroke={refColor}
                  strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />
              </svg>
              {refLabel}
            </div>
          )}
          {slotsSkipped.length > 0 && (
            <div>{composeSkippedLine(slotsSkipped, skippedClause)}</div>
          )}
          {isAggregated && (
            <div style={{ fontStyle: "italic" }}>
              Bar shows a single condition; full per-condition detail in the table below.
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Compose the skipped-cols caption line. Bar owns the col-list prefix
    ("Col N skipped" / "Cols 8, 11 skipped" / "4 columns skipped"); the
    suffix is the card-supplied skippedClause when provided, else an
    auto-trim of the producer reason (strip "Pre-skip: γ…—" diagnostic
    prefix; flatten leftover nested parens). Caps inline col list at 3. */
function composeSkippedLine(slots, skippedClause) {
  const cols = slots.map(s => s.col).filter(c => c != null);
  let prefix;
  if (cols.length === 1) prefix = `Col ${cols[0]} skipped`;
  else if (cols.length <= 3) prefix = `Cols ${cols.join(", ")} skipped`;
  else prefix = `${cols.length} columns skipped`;
  let suffix = skippedClause;
  if (!suffix) {
    // Fallback — strip diagnostic prefix and flatten nested parens from the
    // most common producer reason (one variant per shape-family pre-skip).
    const reasons = [...new Set(slots.map(s => s.reason || ""))].filter(Boolean);
    const reason = reasons[0] || "";
    suffix = reason.replace(/^Pre-skip:[^—]*—\s*/, "").replace(/\(([^()]*)\)/g, "$1").trim();
  }
  return suffix ? `${prefix} — ${suffix}` : prefix;
}

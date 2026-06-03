import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { ConditionTable } from "../shared/ConditionTable.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { buildCondColorMap } from "../../constants/roles.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { SignStripPlot } from "../plots/SignStripPlot.jsx";
import { PlotSVG } from "../plots/PlotSVG.jsx";
import { C, CC, CP, CS, CF, FW, FF } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { shortColName, makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


// Match SignStripPlot colours
const SIGN_POS = "#002147";
const SIGN_NEG = "#A3C1DA";

// ── Pooled mean-z verdict marker (S166 A5) ──────────────────────────
// Small inline horizontal-axis plot showing the producer's pooled mean-z
// from the one-sample t (runs.js) with its 95% CI whisker, against the
// dashed z = 0 reference. The interval's relation to zero IS the verdict;
// negative-of-zero = too few runs distributed across pairs (the §2.3
// fabrication signal). Drawn above the per-pair sign strips so the
// aggregate verdict reads before the per-unit texture.
function PooledZMarker({ value, ci }) {
  if (!Number.isFinite(value)) return null;
  const W = CP.W_LG, H = 60;
  const PL = 50, PR = 50, PT = 16, PB = 22;
  const CW = W - PL - PR;
  // Symmetric z-axis around 0; widen if marker / CI exceeds default span.
  const span = Math.max(
    2.5,
    Math.abs(value) * 1.3,
    ...(Array.isArray(ci) ? ci.filter(Number.isFinite).map(v => Math.abs(v) * 1.3) : [])
  );
  const ZMIN = -span, ZMAX = span;
  const xs = (z) => PL + (z - ZMIN) / (ZMAX - ZMIN) * CW;
  const cy = PT + 14;
  const ticks = [-2, -1, 0, 1, 2].filter(t => t >= ZMIN && t <= ZMAX);
  return (
    <PlotSVG W={W} H={H}>
      {/* z = 0 dashed reference */}
      <line x1={xs(0)} y1={PT} x2={xs(0)} y2={PT + 28}
        stroke={C.BORDER} strokeWidth={CS.GRID.w} strokeDasharray="4,3"/>
      <text x={xs(0)} y={PT - 4} fontSize={CF.SMALL} fill={C.TEXT_3}
        textAnchor="middle" fontFamily={FF.MONO}>z = 0</text>
      {/* CI whisker */}
      {Array.isArray(ci) && Number.isFinite(ci[0]) && Number.isFinite(ci[1]) && (
        <>
          <line x1={xs(ci[0])} y1={cy} x2={xs(ci[1])} y2={cy}
            stroke={C.TEXT} strokeWidth="1.5"/>
          <line x1={xs(ci[0])} y1={cy - 5} x2={xs(ci[0])} y2={cy + 5}
            stroke={C.TEXT} strokeWidth="1.5"/>
          <line x1={xs(ci[1])} y1={cy - 5} x2={xs(ci[1])} y2={cy + 5}
            stroke={C.TEXT} strokeWidth="1.5"/>
        </>
      )}
      {/* Marker dot */}
      <circle cx={xs(value)} cy={cy} r={CS.PT_LG.r + 1}
        fill={C.TEXT} stroke={C.WHITE} strokeWidth="1.5"/>
      {/* Axis */}
      <line x1={PL} y1={PT + 28} x2={PL + CW} y2={PT + 28}
        stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
      {ticks.map(t => (
        <g key={t}>
          <line x1={xs(t)} y1={PT + 28} x2={xs(t)} y2={PT + 32}
            stroke={C.BORDER} strokeWidth={CS.GRID.w}/>
          <text x={xs(t)} y={PT + 42} fontSize={CF.SMALL} fill={C.TEXT_3}
            textAnchor="middle" fontFamily={FF.MONO}>{t}</text>
        </g>
      ))}
      {/* S166 fix-2 FIX 3: axis title removed (was overlapping the tick
          labels — both rendered at the same horizontal band, y≈57-58).
          The plot section header above ("Pooled mean-z across
          pairs") already names the statistic, and the "z = 0"
          annotation labels the reference, so a third axis-title row was
          redundant. */}
    </PlotSVG>
  );
}

export function MiniCard_Runs({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const isAgg = result.groupsAssessed !== undefined;
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const pooledMeanZ = parseFloat(result.pooledMeanZ);
  const scanPNum = typeof result.windowScanP === 'number' ? result.windowScanP : parseFloat(result.windowScanP);
  const hasWindowed = scanPNum < 1 && result.windowSigCount > 0;
  // S166 A6: when the aggregator path fires (column-grouped), the
  // worst-flagged group's metrics are spread top-level — name it so the
  // footer / table / verdict text don't read as cross-condition pooled.
  // Falls back gracefully when not aggregated (single-matrix path on
  // DS21-style row-grouped data).
  const worstGroup = isAgg && typeof result.worstGroup === "string" ? result.worstGroup : null;

  const tooFew = result.firstPairRuns != null && result.firstPairExp != null && result.firstPairRuns < result.firstPairExp;
  const runsImplications = tooFew
    ? "Long stretches where the same replicate is consistently larger suggest that the difference between replicates is not random across those rows — the pattern is more block-like than independent noise would produce."
    : "Excessive switching between which replicate is larger suggests values may have been arranged to appear random rather than recorded in their natural order.";

  // Resolve replicate names
  const hdrs = importConfig?.hdrs || [];
  const roles = importConfig?.roles || [];
  const dataColMap = roles.map((r, i) => r === "data" ? i : -1).filter(i => i >= 0);
  const repName = (colIdx) => shortColName(hdrs[dataColMap[colIdx]] || `Rep${colIdx + 1}`);

  // Coordinate mapping
  const { fileRow } = makeRowMapper(importConfig, rowMap);
  const nMatrixRows = importConfig?.data?.length || 0;
  const firstFileRow = nMatrixRows > 0 ? fileRow(0) : 1;
  const lastFileRow = nMatrixRows > 0 ? fileRow(nMatrixRows - 1) : null;

  // All significant pairs (engine pre-sorts by z ascending, most extreme first)
  const sigPairs = result.pairSignSeqs || [];

  const stripSeqs = sigPairs.map(p => ({
    group: `${repName(p.col1)}\u2013${repName(p.col2)}`,
    signs: p.signs,
    pos: p.pos,
    runs: p.runs,
    expected: p.expected,
  }));

  const c1 = result.firstPairCol1 ?? 0, c2 = result.firstPairCol2 ?? 1;
  const posLabel = "First column higher";
  const negLabel = "Second column higher";

  // Evidence table data — all pairs.
  // S166 A7 post-fix: condition column is guarded on worstGroup
  // truthiness. Aggregator path \u2192 render the column (constant within a
  // single card, but explicit). Whole-matrix path \u2192 omit the column
  // entirely (DS21 Runs is genuinely pooled across the whole table;
  // naming a condition there would contradict the \u00a72 POOLED_BY_DESIGN
  // caption). identifierColumns drops in lockstep so it covers only
  // the leading text columns actually rendered (EvidenceTable
  // convention: identifierColumns covers ALL leading text columns).
  const allStats = result.allPairStats || [];
  const condColumns = worstGroup
    ? ["Condition", "Pair", "Runs", "Expected", "z", "p", "Finding"]
    : ["Pair", "Runs", "Expected", "z", "p", "Finding"];
  const condIdentifierColumns = worstGroup ? 2 : 1;
  const etRows = allStats.map(p => [
    ...(worstGroup ? [{ value: worstGroup, style: { fontFamily: FF.UI } }] : []),
    { value: `${repName(p.col1)}\u2013${repName(p.col2)}`, style: { fontFamily: FF.UI } },
    p.runs,
    p.expected,
    p.z,
    fmtP(parseFloat(p.p)),
    { value: parseFloat(p.z) < -1.96 ? "Fewer than expected" : parseFloat(p.z) > 1.96 ? "More than expected" : "As expected", style: { fontFamily: FF.UI } },
  ]);

  // Footer: plain finding. When flagged, the pooled mean-z sign picks the
  // direction (clumping vs over-alternation); the worstGroup / no-group
  // branch collapses to the same clause.
  const footerContent = (result.flag !== "LOW" && result.flag !== "N/A")
    ? (pooledMeanZ < 0 ? "Noise signs clump — too few changes" : "Noise signs alternate too regularly")
    : "Noise signs flip as expected";

  return (
    <MiniCardLayout result={result}
      footer={footerContent}
      lookFor={hasWindowed ? `Rows ${details.find(d=>d.source==="window")?.startRow||"?"}\u2013${details.find(d=>d.source==="window")?.endRow||"?"} show unusually long stretches where one replicate stays above the other. Examine those rows for signs of sequential construction — are the values suspiciously smooth, evenly spaced, or trending in one direction? Compare the sign pattern in that region against the rest of the dataset.` : "Too few sign changes means replicate differences persist in the same direction for long stretches. This is the signature of values typed row-by-row, where each value is anchored to the previous one. Ask for the original instrument files and compare the row ordering — if the data was re-sorted before submission, that alone can explain the pattern."}
      implications={runsImplications}>

      {/* S166 A5: pooled mean-z headline marker — the verdict statistic
          (one-sample t on per-pair z, runs.js:72) drawn against z = 0 with
          its 95% CI whisker. The interval-vs-zero relation IS the verdict;
          per-pair strips below are texture. Suppressed when n < 2 (no CI
          defined) or under the windowed-driver branch where the per-pair
          marker isn't the headline. */}
      {Number.isFinite(pooledMeanZ) && Array.isArray(result.pooledZCI95) && (<>
        {/* S210 (multi-surface): primary-surface heading dropped — the footer
            fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
        <PlotLayout>
          <PooledZMarker value={pooledMeanZ} ci={result.pooledZCI95} />
        </PlotLayout>
      </>)}

      {/* Multi-strip with per-pair expected-frequency ticks */}
      {stripSeqs.length > 0 ? (<>
        {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
        <div style={{...SUB_HEAD, marginTop: BLOCK_GAP, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Significant pairs</div>
        <PlotLayout>
          <SignStripPlot
            groupSignSeqs={stripSeqs}
            fileRow={fileRow}
            firstFileRow={firstFileRow}
            lastFileRow={lastFileRow}
          />
        </PlotLayout>
        <ChartLegend items={[
          { color: SIGN_POS, label: posLabel, opacity: 0.8 },
          { color: SIGN_NEG, label: negLabel, opacity: 0.8 },
        ]} />
      </>) : result.firstPairSigns?.length ? (<>
        {/* Fallback: single pair strip */}
        <PlotLayout>
          <SignStripPlot singleSeq={result.firstPairSigns}
            singleRuns={result.firstPairRuns} singleExp={result.firstPairExp}
            defaultRowLabel={`${repName(c1)}\u2013${repName(c2)}`}
            fileRow={fileRow}
            firstFileRow={firstFileRow}
            lastFileRow={lastFileRow} />
        </PlotLayout>
        <ChartLegend items={[
          { color: SIGN_POS, label: posLabel, opacity: 0.8 },
          { color: SIGN_NEG, label: negLabel, opacity: 0.8 },
        ]} />
      </>) : null}

      {/* Evidence table — all pairs */}
      {etRows.length > 0 && (
        <div style={{marginTop: BLOCK_GAP}}>
          {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
          <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>All replicate pairs</div>
          <EvidenceTable
            columns={condColumns}
            rows={etRows}
            identifierColumns={condIdentifierColumns}
          />
        </div>
      )}

      {/* Condition table (aggregated datasets) */}
      <ConditionTable data={result.condRuns} condColorMap={condColorMap} title="Runs test by condition" columns={[
        {header:"Condition",align:"left",render:c=>c.condition},
        {header:"Pairs",render:c=>c.nPairs},
        {header:"Mean z",bold:true,render:c=>c.meanZ.toFixed(3)},
        {header:"p",render:c=>fmtP(c.rawP)},
      ]} />

    </MiniCardLayout>
  );
}

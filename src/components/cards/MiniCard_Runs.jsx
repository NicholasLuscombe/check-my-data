import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { ConditionTable } from "../shared/ConditionTable.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { buildCondColorMap } from "../../constants/roles.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { SignStripPlot } from "../plots/SignStripPlot.jsx";
import { C, CC, FW, FF } from "../../constants/tokens.js";
import { fmtP, fmtPBadge, fmtPOp } from "../../constants/thresholds.js";
import { shortColName, makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD } from "../shared/styles.js";


// Match SignStripPlot colours
const SIGN_POS = "#002147";
const SIGN_NEG = "#A3C1DA";

export function MiniCard_Runs({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const isAgg = result.groupsAssessed !== undefined;
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const pooledMeanZ = parseFloat(result.pooledMeanZ);
  const scanPNum = typeof result.windowScanP === 'number' ? result.windowScanP : parseFloat(result.windowScanP);
  const hasWindowed = scanPNum < 1 && result.windowSigCount > 0;

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

  // Evidence table data — all pairs
  const allStats = result.allPairStats || [];
  const etRows = allStats.map(p => [
    { value: `${repName(p.col1)}\u2013${repName(p.col2)}`, style: { fontFamily: FF.UI } },
    p.runs,
    p.expected,
    p.z,
    fmtP(parseFloat(p.p)),
    { value: parseFloat(p.z) < -1.96 ? "Fewer than expected" : parseFloat(p.z) > 1.96 ? "More than expected" : "As expected", style: { fontFamily: FF.UI } },
  ]);

  // Footer
  const runsDir = pooledMeanZ < 0 ? "too few runs" : "too many runs";
  const footerContent = <>
    {result.nPairs} pair{result.nPairs !== 1 ? "s" : ""} tested · {runsDir} · mean z = {pooledMeanZ.toFixed(2)}
    {" · pooled " + fmtPBadge(result.primaryP)}
    {hasWindowed && ` · scan p\u202f${fmtPOp(scanPNum)} (${result.windowSigCount} window${result.windowSigCount!==1?"s":""})`}
  </>;

  return (
    <MiniCardLayout result={result}
      footer={footerContent}
      lookFor={hasWindowed ? `Rows ${details.find(d=>d.source==="window")?.startRow||"?"}\u2013${details.find(d=>d.source==="window")?.endRow||"?"} show unusually long stretches where one replicate stays above the other. Examine those rows for signs of sequential construction — are the values suspiciously smooth, evenly spaced, or trending in one direction? Compare the sign pattern in that region against the rest of the dataset.` : "Too few sign changes means replicate differences persist in the same direction for long stretches. This is the signature of values typed row-by-row, where each value is anchored to the previous one. Ask for the original instrument files and compare the row ordering — if the data was re-sorted before submission, that alone can explain the pattern."}
      implications={runsImplications}>

      {/* Multi-strip with per-pair expected-frequency ticks */}
      {stripSeqs.length > 0 ? (<>
        <div style={SUB_HEAD}>Significant pairs</div>
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
        <div style={{marginTop:"8px"}}>
          <div style={SUB_HEAD}>All replicate pairs</div>
          <EvidenceTable
            columns={["Pair", "Runs", "Expected", "z", "p", "Finding"]}
            rows={etRows}
            identifierColumns={1}
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

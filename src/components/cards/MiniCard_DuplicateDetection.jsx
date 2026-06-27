/* ── MiniCard: Duplicate Detection ── */

import { C, CC, FS, FW, FF, M, CP, CR, SIGNAL, DUP_GROUP_PALETTE } from "../../constants/tokens.js";
import { TD_NUM_CELL, TD_ID_CELL, LEAD_HEAD } from "../shared/styles.js";
import { EvidenceBlock } from "../shared/EvidenceBlock.jsx";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { ColumnHeaders } from "../shared/ColumnHeaders.jsx";
import { colToExcelLetter, buildOriginalColMap, buildCondSpansForColumns, makeRowMapper } from "../shared/coordinates.js";


export function MiniCard_DuplicateDetection({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const name = result.name;
  const isAgg = result.groupsAssessed !== undefined;
const wrTotal = result.withinRowMatches || 0;
const wrExp = parseFloat(result.withinRowExpected) || 0;
const withinDups = result.withinRowLocs || [];
const blocks = result.blockCopies || [];
const rowGroups = result.rowDupGroupList || [];
const hasRowDups = rowGroups.length > 0;
// Separate block types: multi-row or partial-width blocks vs full-row single-row pairs
// Full-row height=1 blocks are better shown via rowGroups (multi-way clustering)
const structuralBlocks = blocks.filter(b => !(b.isFullRow && b.height === 1));
const wrWithinObs = result.wrWithinObs||0, wrWithinExp = parseFloat(result.wrWithinExp)||0;
const wrCrossObs = result.wrCrossObs||0, wrCrossExp = parseFloat(result.wrCrossExp)||0;
const withinColObs = result.withinColObs||0, withinColExp = parseFloat(result.withinColExp)||0;
const hasBreakdown = wrCrossExp > 0; // only show within/cross split when multiple groups exist
const { fileRow, toOrigRow } = makeRowMapper(importConfig, rowMap);
const rawData = importConfig?.data;
const roles = importConfig?.roles||[];
const hdrs = importConfig?.hdrs||[];
// Map matrix column index → rawData column index
const dataColMap = roles.map((r,i)=>r==="data"?i:-1).filter(i=>i>=0);

// Coordinate mapping — original file positions
const _skip = importConfig?.skippedRows || 0;
const _hdr = importConfig?.headerRows || 0;
const _origColMap = buildOriginalColMap(hdrs.length, importConfig?.removedCols);

// Header row numbers (1-indexed) for ColumnHeaders corner cells
const _nameRowNum = _hdr >= 1 ? _skip + _hdr : null;
const _condRowNum = _hdr >= 2 ? _skip + 1 : null;

// ── Helper: column name from matrix index ──
const colName = (matIdx) => hdrs[dataColMap[matIdx]] || `Column ${matIdx+1}`;

const nDupRows = rowGroups.reduce((s,g) => s + g.count - 1, 0);

// ── Footer ──
const dupBlock = structuralBlocks[0];
const rowDupClause = hasRowDups
  ? (rowGroups.length === 1 ? "1 group of duplicate rows" : `${rowGroups.length} groups of duplicate rows`)
  : null;
let blockClause = null;
if (dupBlock) {
  if (dupBlock.isColumnMatch) {
    const _r0 = fileRow(toOrigRow(dupBlock.srcRows[0]));
    const _r1 = fileRow(toOrigRow(dupBlock.srcRows[1]));
    blockClause = `2 columns are identical over rows ${_r0}–${_r1}`;
  } else {
    const _n = structuralBlocks.length;
    blockClause = `${_n} repeated block${_n !== 1 ? "s" : ""}`;
  }
}
const footer = (rowDupClause && blockClause)
  ? `${rowDupClause} · ${blockClause}`
  : (rowDupClause || blockClause || "No duplicates found");

// ── Shared styles ──
const stickyRow = {position:"sticky",left:0,zIndex:2,background:"inherit"};

// Build column definitions for ColumnHeaders — letters reflect original file positions
const colDefs = hdrs.map((h, ci) => roles[ci] === "ignore" ? null : ({
  letter: colToExcelLetter(_origColMap[ci] ?? ci),
  name: h,
  role: roles[ci],
  rawCI: ci,
})).filter(Boolean);

// Condition spans for multi-condition datasets
const condSpans = buildCondSpansForColumns(importConfig?.condPerCol, roles);

// ── Data row renderer ──
// colorMap: { colIndex: { text: "#hex", bg: "#hex" } } → per-cell coloring
// For wide datasets (>20 visible cols), show only label/cond + highlighted data columns
const nVisibleCols = hdrs.filter((_,ci) => roles[ci] !== "ignore").length;
const isWide = nVisibleCols > 20;
const getVisibleCols = (highlightCols=[], colorMapKeys=[]) => {
  if (!isWide) return null; // null = show all
  const keep = new Set();
  hdrs.forEach((_,ci) => { if (roles[ci]==="label"||roles[ci]==="cond") keep.add(ci); });
  highlightCols.forEach(ci => keep.add(ci));
  colorMapKeys.forEach(ci => keep.add(ci));
  // If no data cols highlighted, show first 6 + last 2 data cols
  const dataCols = hdrs.map((_,ci) => ci).filter(ci => roles[ci]==="data");
  if (highlightCols.length === 0 && colorMapKeys.length === 0) {
    dataCols.slice(0,6).forEach(ci => keep.add(ci));
    dataCols.slice(-2).forEach(ci => keep.add(ci));
  }
  return { keep, omitted: nVisibleCols - keep.size };
};
const DataRow = ({ri, highlightCols=[], colorMap={}, bg=C.WHITE, visCols=null}) => {
  const row = rawData?.[ri]; if(!row) return null;
  const vc = visCols;
  const hlMin = highlightCols.length ? Math.min(...highlightCols) : null;
  const hlMax = highlightCols.length ? Math.max(...highlightCols) : null;
  let insertedEllipsis = false;
  return (
    <tr style={{background:bg}}>
      <td style={{...TD_ID_CELL,fontFamily:FF.MONO,color:C.TEXT_2,borderRight:`1px solid ${C.BORDER_L}`,minWidth:"36px",...stickyRow,background:bg}}>{fileRow(ri)}</td>
      {hdrs.map((h,ci) => {
        if(roles[ci]==="ignore") return null;
        if(vc && !vc.keep.has(ci)) {
          if (insertedEllipsis) return null;
          insertedEllipsis = true;
          return <td key="ell" style={{...TD_ID_CELL,color:C.TEXT_3}}>⋯</td>;
        }
        insertedEllipsis = false;
        const cm = colorMap[ci];
        const isHlCol = highlightCols.includes(ci);
        const base = roles[ci]==="data" ? TD_NUM_CELL : TD_ID_CELL;
        return <td key={ci} style={{...base,
          color:cm?cm.text:isHlCol?CC.THRESH:roles[ci]==="data"?C.TEXT:C.TEXT_3,
          fontWeight:cm?FW.BOLD:FW.NORM,
          background:cm?cm.bg:isHlCol?"#FCEBEB":"transparent",
          ...(isHlCol && ci===hlMin?{borderLeft:"2px solid #E24B4A"}:{}),
          ...(isHlCol && ci===hlMax?{borderRight:"2px solid #E24B4A"}:{})}}>{row[ci]!=null?String(row[ci]):"—"}</td>;
      })}
    </tr>
  );
};
// Map raw column indices to colDefs indices for ColumnHeaders highlightCols
const rawToColDef = {};
colDefs.forEach((cd, di) => { rawToColDef[cd.rawCI] = di; });
const mapHighlightCols = (rawCols) => rawCols.map(ci => rawToColDef[ci]).filter(i => i != null);
// Map visCols (raw CI set) to colDefs indices
const mapVisCols = (vc) => {
  if (!vc) return null;
  const keep = new Set();
  colDefs.forEach((cd, di) => { if (vc.keep.has(cd.rawCI)) keep.add(di); });
  return { keep, omitted: vc.omitted };
};

return (

  <MiniCardLayout result={result}
    footer={footer}
    lookFor="Identical whole rows or rectangular blocks are a strong sign of copy-paste. Check whether the duplicated rows sit in specific conditions or span several. Inspect the raw data files to confirm the submitted values arise from independent measurements."
    implications="Repeated values can arise naturally: integer or bounded scales allow only so many distinct values, and measurements at a detection limit can pile up. Duplication can arise accidentally: e.g., pasting between spreadsheets, or merging files with overlapping rows. Repeated whole rows or blocks can also be deliberate: e.g., rows copied to pad a thin dataset, inflate the sample size, or manufacture replicates that were never measured.">

    {/* ── Duplicated blocks of data evidence ── */}
    {(structuralBlocks.length > 0 || hasRowDups) && (() => {
      // Concise count summary for description line
      const summaryParts = [];
      if (structuralBlocks.length > 0) {
        const totalBlockRows = structuralBlocks.reduce((s, b) => s + b.height, 0);
        summaryParts.push(`${structuralBlocks.length} repeated block${structuralBlocks.length!==1?"s":""} (${totalBlockRows} rows)`);
      }
      if (hasRowDups) {
        summaryParts.push(`${rowGroups.length} group${rowGroups.length!==1?"s":""} of duplicate rows`);
      }
      const totalItems = structuralBlocks.length + (hasRowDups?1:0);
      return (
      <EvidenceBlock label="Duplicated blocks of data" detail={summaryParts.join("; ")} lead>
        {/* Multi-row or partial-width blocks — side-by-side display */}
        {structuralBlocks.slice(0,5).map((blk,bi) => {
          const rawCols = blk.cols.map(c => dataColMap[c] ?? c);
          const srcStart = toOrigRow(blk.srcRows[0]);
          const srcEnd = toOrigRow(blk.srcRows[1]);
          const dstStart = toOrigRow(blk.dstRows[0]);
          const dstEnd = toOrigRow(blk.dstRows[1]);
          const previewRows = Math.min(blk.height, 12);
          const vc = getVisibleCols(rawCols);
          const isColMatch = blk.isColumnMatch;

          // Column match: single table, highlight the two matching columns
          if (isColMatch) {
            const srcName = colName(blk.srcCol ?? blk.cols[0]);
            const dstName = colName(blk.dstCol ?? blk.cols[1]);
            return (
              <div key={`blk${bi}`} style={{marginBottom:"12px"}}>
                {totalItems > 1 && <div style={{fontSize:FS.sm,fontFamily:FF.UI,marginBottom:"4px"}}>
                  <span style={LEAD_HEAD}>
                    {srcName} = {dstName} for rows {fileRow(srcStart)}–{fileRow(srcEnd)}
                  </span>
                  <span style={{fontSize:FS.xs,color:C.TEXT_3}}>{` — ${blk.height} consecutive rows`}</span>
                </div>}
                <table style={{borderCollapse:"separate",borderSpacing:"0",fontFamily:FF.UI,width:"100%"}}>
                  <ColumnHeaders columns={colDefs} highlightCols={mapHighlightCols(rawCols)} visCols={mapVisCols(vc)} condSpans={condSpans} condRowNum={_condRowNum} nameRowNum={_nameRowNum}/>
                  <tbody>
                    {Array.from({length:previewRows},(_, i) => (
                      <DataRow key={i} ri={toOrigRow(blk.srcRows[0]+i)} highlightCols={rawCols} bg={i%2?C.BG_L:C.WHITE} visCols={vc}/>
                    ))}
                    {blk.height > previewRows && <tr><td colSpan={99} style={{...TD_ID_CELL,color:C.TEXT_3}}>… {blk.height - previewRows} more rows</td></tr>}
                  </tbody>
                </table>
              </div>
            );
          }

          // Row-to-row copy: stacked for wide datasets, side-by-side for narrow
          const nDataCols = roles.filter(r=>r==="data").length;
          const useStacked = nDataCols > 8;
          return (
            <div key={`blk${bi}`} style={{marginBottom:"12px"}}>
              {totalItems > 1 && <div style={{fontSize:FS.sm,fontFamily:FF.UI,marginBottom:"4px"}}>
                <span style={LEAD_HEAD}>
                  Rows {fileRow(srcStart)}–{fileRow(srcEnd)} = Rows {fileRow(dstStart)}–{fileRow(dstEnd)}
                </span>
                {!blk.isFullRow && <span style={{fontSize:FS.xs,color:C.TEXT_3}}>
                  {` — ${blk.height}×${blk.width} block (${blk.cols.length} of ${roles.filter(r=>r==="data").length} columns)`}
                </span>}
              </div>}
              <div style={{display:"flex",flexDirection:useStacked?"column":"row",gap:useStacked?"4px":"8px",overflowX:"auto"}}>
                <div style={{flex:useStacked?undefined:"1 0 auto",minWidth:useStacked?undefined:"min-content"}}>
                  <div style={{fontSize:FS.xs,color:C.TEXT_3,fontFamily:FF.UI,marginBottom:"2px"}}>Original (rows {fileRow(srcStart)}–{fileRow(srcEnd)})</div>
                  <table style={{borderCollapse:"separate",borderSpacing:"0",fontFamily:FF.UI,width:"100%"}}>
                    <ColumnHeaders columns={colDefs} highlightCols={mapHighlightCols(rawCols)} visCols={mapVisCols(vc)} condSpans={condSpans} condRowNum={_condRowNum} nameRowNum={_nameRowNum}/>
                    <tbody>
                      {Array.from({length:previewRows},(_, i) => (
                        <DataRow key={i} ri={toOrigRow(blk.srcRows[0]+i)} highlightCols={rawCols} bg={i%2?C.BG_L:C.WHITE} visCols={vc}/>
                      ))}
                      {blk.height > previewRows && <tr><td colSpan={99} style={{...TD_ID_CELL,color:C.TEXT_3}}>… {blk.height - previewRows} more rows</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div style={{flex:useStacked?undefined:"1 0 auto",minWidth:useStacked?undefined:"min-content"}}>
                  <div style={{fontSize:FS.xs,color:C.TEXT_3,fontFamily:FF.UI,marginBottom:"2px"}}>Copy (rows {fileRow(dstStart)}–{fileRow(dstEnd)})</div>
                  <table style={{borderCollapse:"separate",borderSpacing:"0",fontFamily:FF.UI,width:"100%"}}>
                    <ColumnHeaders columns={colDefs} highlightCols={mapHighlightCols(rawCols)} visCols={mapVisCols(vc)} condSpans={condSpans} condRowNum={_condRowNum} nameRowNum={_nameRowNum}/>
                    <tbody>
                      {Array.from({length:previewRows},(_, i) => (
                        <DataRow key={i} ri={toOrigRow(blk.dstRows[0]+i)} highlightCols={rawCols} bg={i%2?C.BG_L:C.WHITE} visCols={vc}/>
                      ))}
                      {blk.height > previewRows && <tr><td colSpan={99} style={{...TD_ID_CELL,color:C.TEXT_3}}>… {blk.height - previewRows} more rows</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
        {/* Row-vector duplicate groups */}
        {rowGroups.slice(0,5).map((grp,gi) => {
          const vc = getVisibleCols();
          const allDataCols = roles.map((_,ci) => ci).filter(ci => roles[ci]==="data");
          return (
          <div key={`row${gi}`} style={{marginBottom:"12px"}}>
            {totalItems > 1 && <div style={{...LEAD_HEAD,marginBottom:"4px"}}>
              {grp.count} rows with identical values
            </div>}
            <table style={{borderCollapse:"separate",borderSpacing:"0",fontFamily:FF.UI,width:"100%"}}>
              <ColumnHeaders columns={colDefs} highlightCols={mapHighlightCols(allDataCols)} visCols={mapVisCols(vc)} condSpans={condSpans} condRowNum={_condRowNum} nameRowNum={_nameRowNum}/>
              <tbody>
                {grp.rows.slice(0,10).map((matIdx,i) => <DataRow key={i} ri={toOrigRow(matIdx)} highlightCols={allDataCols} bg={i%2?C.BG_L:C.WHITE} visCols={vc}/>)}
                {grp.rows.length>10 && <tr><td colSpan={99} style={{...TD_ID_CELL,color:C.TEXT_3}}>… and {grp.rows.length-10} more identical rows</td></tr>}
              </tbody>
            </table>
          </div>
          );
        })}
        {/* Column-pair duplicates removed — superseded by column-segment hash detector */}
      </EvidenceBlock>
      );
    })()}

    {/* ── Duplicate values within a row evidence ── */}
    {withinDups.length > 0 && (() => {
      // Show all within-row coincidences without deduction
      // These are independently computed — overlap with block/row evidence is expected
      const comb2 = n => n*(n-1)/2;
      const allDupRows = withinDups.map(dup => {
        const origRow = toOrigRow((dup.row||1)-1);
        const groups = dup.groups || [];
        if (groups.length === 0) return null;
        return { origRow, filteredGroups: groups };
      }).filter(Boolean);
      if (allDupRows.length === 0) return null;
      const groupColors = DUP_GROUP_PALETTE;
      const cappedDupRows = allDupRows.slice(0, 30);
      const moreDupRows = allDupRows.length - cappedDupRows.length;
      // Compute visCols from all colorMap keys in capped rows
      const allCmKeys = new Set();
      cappedDupRows.forEach(fdr => fdr.filteredGroups.forEach(g => g.cols.forEach(c => allCmKeys.add(dataColMap[c] ?? c))));
      const wrVc = getVisibleCols([], [...allCmKeys]);
      return (
      <EvidenceBlock label="Duplicate values within a row"
        detail={<>
          {`${wrTotal} duplicate pair${wrTotal!==1?"s":""} within a row (${wrExp.toFixed(0)} expected)`}
          <div style={{fontSize:FS.sm,color:C.TEXT_3,marginTop:"2px"}}>Colours mark separate groups of within-row duplicates.</div>
        </>}>
        <table style={{borderCollapse:"separate",borderSpacing:"0",fontFamily:FF.UI,width:"100%"}}>
          <ColumnHeaders columns={colDefs} visCols={mapVisCols(wrVc)} condSpans={condSpans} condRowNum={_condRowNum} nameRowNum={_nameRowNum}/>
          <tbody>
            {cappedDupRows.map((fdr,di) => {
              const cm = {};
              fdr.filteredGroups.forEach((g, gi) => {
                const cp = groupColors[gi % groupColors.length];
                g.cols.forEach(c => { cm[dataColMap[c] ?? c] = cp; });
              });
              return <DataRow key={di} ri={fdr.origRow} colorMap={cm} bg={di%2?C.BG_L:C.WHITE} visCols={wrVc}/>;
            })}
            {moreDupRows > 0 && <tr><td colSpan={99} style={{...TD_ID_CELL,color:C.TEXT_3}}>… and {moreDupRows} more rows with within-row duplicates</td></tr>}
          </tbody>
        </table>
      </EvidenceBlock>
      );
    })()}


  </MiniCardLayout>

);

}

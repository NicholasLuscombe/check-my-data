/* ── MiniCard: Duplicate Detection ── */

import { C, CC, FS, FW, FF, M, CP, CR, SIGNAL, DUP_GROUP_PALETTE } from "../../constants/tokens.js";
import { SUB_HEAD, TD_NUM_CELL, TD_ID_CELL } from "../shared/styles.js";
import { FLAG_STYLES, fmtPBadge } from "../../constants/thresholds.js";
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
const hasWithinRow = wrTotal > 0 && wrTotal > wrExp * 1.5;
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
const nDataRows = rawData?.length || "?";
const nDataCols = dataColMap.length;
const nColPairs = nDataCols * (nDataCols - 1) / 2;
const footerParts = [`${nDataRows} rows · ${nColPairs} column pairs`];
// Lead with the cleared result, not just scope — mirrors VFS's nSpikes===0 footer.
// Aggregate verdict across all four sub-signals: true only when every one is flat zero on a LOW.
const noDuplicates = result.flag === "LOW"
  && result.collisionObs === 0
  && result.duplicateRows === 0
  && wrTotal === 0
  && blocks.length === 0;
if (noDuplicates) footerParts.push("no duplicates found");
if (structuralBlocks.length > 0) footerParts.push(`${structuralBlocks.length} block${structuralBlocks.length!==1?"s":""} (${nDupRows} duplicated row${nDupRows!==1?"s":""})`);
if (hasWithinRow) footerParts.push(`${wrTotal} within-row (${wrExp.toFixed(0)} expected)`);
footerParts.push(fmtPBadge(result.primaryP));
const footer = footerParts.join(" · ");

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
        const isHl = cm || highlightCols.includes(ci);
        const base = roles[ci]==="data" ? TD_NUM_CELL : TD_ID_CELL;
        return <td key={ci} style={{...base,
          color:cm?cm.text:highlightCols.includes(ci)?CC.THRESH:roles[ci]==="data"?C.TEXT:C.TEXT_3,
          fontWeight:isHl?FW.BOLD:FW.NORM,
          background:cm?cm.bg:highlightCols.includes(ci)?FLAG_STYLES.HIGH.bg:"transparent"}}>{row[ci]!=null?String(row[ci]):"—"}</td>;
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

// ── Evidence section with sub-heading + description ──
const EvidenceBlock = ({label, detail, children}) => (
  <div style={{marginTop:"12px"}}>
    <div style={SUB_HEAD}>{label}</div>
    {detail && <div style={{fontSize:FS.base,fontFamily:FF.UI,color:C.TEXT_2,marginBottom:"8px"}}>{detail}</div>}
    <div style={{border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,padding:0,overflowX:"auto",overflowY:"auto",maxHeight:"200px",background:C.WHITE,position:"relative"}}>{children}</div>
  </div>
);

return (

  <MiniCardLayout result={result}
    footer={footer}
    lookFor="Exact duplicates of entire rows or rectangular blocks of data are a strong indicator of copy-paste fabrication. Check whether the duplicated rows appear in the same experimental condition or across conditions. Ask for raw instrument files to verify that the submitted values are independent measurements."
    implications="Repeated values can occur naturally in integer or bounded-scale data where few distinct values are possible, or when measurements hit a detection limit. They can also result from accidental row duplication during data assembly — for example, copy-pasting between spreadsheets or merging files with overlapping row ranges.">

    {/* ── Duplicated blocks of data evidence ── */}
    {(structuralBlocks.length > 0 || hasRowDups) && (() => {
      // Concise count summary for description line
      const summaryParts = [];
      if (structuralBlocks.length > 0) {
        const totalBlockRows = structuralBlocks.reduce((s, b) => s + b.height, 0);
        summaryParts.push(`${structuralBlocks.length} copied block${structuralBlocks.length!==1?"s":""} (${totalBlockRows} rows)`);
      }
      if (hasRowDups) {
        const rowsInvolved = rowGroups.reduce((s,g) => s + g.count, 0);
        summaryParts.push(`${rowGroups.length} duplicate group${rowGroups.length!==1?"s":""} · ${rowsInvolved} row${rowsInvolved!==1?"s":""} · ${nDupRows} ${nDupRows!==1?"are copies":"is a copy"} of ${rowGroups.length!==1?"earlier rows":"an earlier row"}`);
      }
      const totalItems = structuralBlocks.length + (hasRowDups?1:0);
      return (
      <EvidenceBlock label="Duplicated blocks of data" detail={summaryParts.join("; ")}>
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
                  <span style={{color:C.TEXT,fontWeight:FW.SEMI}}>
                    {srcName} = {dstName} for rows {fileRow(srcStart)}–{fileRow(srcEnd)}
                  </span>
                  <span style={{color:C.TEXT_2}}>{` — ${blk.height} consecutive rows`}</span>
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
                <span style={{color:C.TEXT,fontWeight:FW.SEMI}}>
                  Rows {fileRow(srcStart)}–{fileRow(srcEnd)} = Rows {fileRow(dstStart)}–{fileRow(dstEnd)}
                </span>
                {!blk.isFullRow && <span style={{color:C.TEXT_2}}>
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
            {totalItems > 1 && <div style={{fontSize:FS.sm,fontFamily:FF.UI,color:C.TEXT,fontWeight:FW.SEMI,marginBottom:"4px"}}>
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

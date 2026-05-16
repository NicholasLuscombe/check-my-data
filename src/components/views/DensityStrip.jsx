import { useState } from "react";
import { C, FS, CF, FW, M, CR, MECH_COLOR } from "../../constants/tokens.js";
import { hexToRgb } from "../../constants/thresholds.js";
import { MECHANISMS, MECHANISM_ORDER } from "../../constants/mechanisms.js";

/* Density heatmap: 2D visualization proportional to table dimensions.
   Rows on y-axis, columns on x-axis, cells coloured by mechanism. */
export function DensityStrip({ localizations, nRows, nCols, dataColSet, colHeaders }) {
  if (!localizations.length || nRows < 1 || nCols < 1) return null;
  const [hoverCell, setHoverCell] = useState(null);

  // Bin rows and cols to fit a reasonable grid
  const MAX_ROW_BINS = 120, MAX_COL_BINS = Math.min(nCols, 40);
  const rowBinSize = Math.max(1, Math.ceil(nRows / MAX_ROW_BINS));
  const colBinSize = Math.max(1, Math.ceil(nCols / MAX_COL_BINS));
  const nRowBins = Math.ceil(nRows / rowBinSize);
  const nColBins = Math.ceil(nCols / colBinSize);

  // Build 2D density grid: grid[row][col] = {mechanism, weight}
  // Higher-priority mechanism wins (first in MECHANISM_ORDER)
  const mechPriority = {};
  MECHANISM_ORDER.forEach((m, i) => mechPriority[m] = i);
  const grid = Array.from({length: nRowBins}, () => Array.from({length: nColBins}, () => ({mech: null, weight: 0})));

  const setCell = (r, c, mech, w) => {
    const rb = Math.min(Math.floor(r / rowBinSize), nRowBins - 1);
    const cb = Math.min(Math.floor(c / colBinSize), nColBins - 1);
    if (rb < 0 || cb < 0) return;
    const cell = grid[rb][cb];
    if (cell.mech === null || mechPriority[mech] < mechPriority[cell.mech] || w > cell.weight) {
      cell.mech = mech;
      cell.weight = Math.min(1, Math.max(cell.weight, w));
    }
  };

  for (const loc of localizations) {
    const w = loc.flag === "HIGH" ? 1.0 : 0.6;
    const cols = loc.cols || null;
    if (loc.type === "rows" && loc.rows) {
      for (const r of loc.rows) {
        if (cols) { for (const c of cols) setCell(r, c, loc.mechanism, w); }
        else { for (let c = 0; c < nCols; c++) setCell(r, c, loc.mechanism, w); }
      }
    } else if ((loc.type === "rowRange" || loc.type === "block") && loc.rows?.length === 2) {
      for (let r = loc.rows[0]; r <= loc.rows[1] && r < nRows; r++) {
        if (cols) { for (const c of cols) setCell(r, c, loc.mechanism, w); }
        else { for (let c = 0; c < nCols; c++) setCell(r, c, loc.mechanism, w); }
      }
    } else if (loc.type === "columns" && cols) {
      for (let r = 0; r < nRows; r++) { for (const c of cols) setCell(r, c, loc.mechanism, w * 0.4); }
    } else if (loc.type === "cells" && loc.cells) {
      for (const [r, c] of loc.cells) setCell(r, c, loc.mechanism, w);
    } else if (loc.type === "densityCells" && loc.cellWeights) {
      for (const [key, cw] of Object.entries(loc.cellWeights)) {
        const [r, c] = key.split(",").map(Number);
        setCell(r, c, loc.mechanism, cw);
      }
    }
  }

  // Sizing: keep aspect ratio roughly proportional, cap dimensions
  const CELL_H = Math.max(2, Math.min(4, Math.floor(300 / nRowBins)));
  const CELL_W = Math.max(4, Math.min(12, Math.floor(400 / nColBins)));
  const stripH = nRowBins * CELL_H;
  const stripW = nColBins * CELL_W;
  const LABEL_W = 36;

  const hoverLabel = hoverCell
    ? (() => {
        const rowStart = hoverCell.r * rowBinSize + 1;
        const rowEnd = Math.min((hoverCell.r+1)*rowBinSize, nRows);
        const colStart = hoverCell.c * colBinSize;
        const colEnd = Math.min((hoverCell.c+1)*colBinSize, nCols) - 1;
        const rowStr = rowBinSize > 1 ? `Rows ${rowStart}\u2013${rowEnd}` : `Row ${rowStart}`;
        const colStr = colHeaders
          ? (colStart === colEnd ? colHeaders[colStart] || `Col ${colStart+1}` : `${colHeaders[colStart]}\u2013${colHeaders[colEnd]}`)
          : (colBinSize > 1 ? `Cols ${colStart+1}\u2013${colEnd+1}` : `Col ${colStart+1}`);
        return `${rowStr}, ${colStr}`;
      })()
    : null;

  // Collect which mechanisms appear
  const activeMechs = [...new Set(localizations.map(l => l.mechanism))];
  const orderedActive = MECHANISM_ORDER.filter(m => activeMechs.includes(m));

  return (
    <div style={{marginBottom:"16px",background:C.WHITE,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.LG,padding:"12px 14px"}}>
      <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginBottom:"8px",flexWrap:"wrap"}}>
        <span style={{fontSize:FS.base,fontWeight:FW.BOLD,color:C.TEXT}}>Where flags are concentrated</span>
        <span style={{fontSize:FS.xs,color:C.TEXT_3,...M}}>{nRows} rows &times; {nCols} cols{dataColSet ? ` (${dataColSet.size} data)` : ""}</span>
        {hoverLabel && <span style={{fontSize:FS.xs,color:C.TEXT_2,...M,marginLeft:"auto",background:C.BG,padding:"2px 8px",borderRadius:CR.SM}}>{hoverLabel}</span>}
      </div>
      <div style={{display:"flex",gap:"0",alignItems:"flex-start"}}>
        {/* Row axis */}
        <div style={{width:`${LABEL_W}px`,height:`${stripH}px`,position:"relative",fontSize:CF.SMALL,color:C.TEXT_3,...M,flexShrink:0}}>
          <span style={{position:"absolute",top:0}}>1</span>
          {nRowBins > 10 && <span style={{position:"absolute",top:`${Math.floor(stripH/2)-4}px`}}>{Math.floor(nRows/2)}</span>}
          <span style={{position:"absolute",bottom:0}}>{nRows}</span>
        </div>
        {/* 2D grid */}
        <div style={{display:"flex",flexDirection:"column",border:`1px solid ${C.BORDER_L}`,borderRadius:CR.XS,overflow:"hidden"}}
          onMouseLeave={() => setHoverCell(null)}>
          {grid.map((row, rb) => (
            <div key={rb} style={{display:"flex",height:`${CELL_H}px`}}>
              {row.map((cell, cb) => {
                const isHoverRow = hoverCell?.r === rb;
                const isHoverCol = hoverCell?.c === cb;
                const isHover = isHoverRow && isHoverCol;
                // Check if this column bin contains any data columns
                const binStart = cb * colBinSize, binEnd = Math.min((cb+1)*colBinSize, nCols);
                let isDataCol = !dataColSet;
                if (dataColSet) { for (let ci = binStart; ci < binEnd; ci++) { if (dataColSet.has(ci)) { isDataCol = true; break; } } }
                return (
                  <div key={cb}
                    onMouseEnter={() => setHoverCell({r:rb,c:cb})}
                    style={{
                      width:`${CELL_W}px`,height:`${CELL_H}px`,
                      background: cell.mech ? `rgba(${hexToRgb(MECH_COLOR[cell.mech]).join(",")},${Math.max(0.08, cell.weight)})`
                        : isDataCol ? C.BG : C.BG,
                      outline: isHover ? `1px solid ${C.TEXT_3}` : "none",
                      zIndex: isHover ? 1 : 0,
                      ...(isDataCol ? {} : {backgroundImage:"repeating-linear-gradient(45deg,transparent,transparent 2px,#eee 2px,#eee 3px)"})
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Column headers — only when not too many and colBinSize=1 */}
      {colHeaders && colBinSize === 1 && nColBins <= 50 && (
        <div style={{display:"flex",marginLeft:`${LABEL_W}px`,marginTop:"2px"}}>
          {colHeaders.map((h, ci) => {
            const isData = dataColSet ? dataColSet.has(ci) : true;
            return <div key={ci} style={{width:`${CELL_W}px`,fontSize:CF.SMALL,color:isData?C.TEXT_3:C.BORDER,
              transform:"rotate(-45deg)",transformOrigin:"top left",whiteSpace:"nowrap",overflow:"hidden",
              height:"40px",lineHeight:`${CELL_W}px`,...M}}>{h}</div>;
          })}
        </div>
      )}
      {/* Legend */}
      <div style={{display:"flex",gap:"12px",marginTop:"8px",flexWrap:"wrap"}}>
        {orderedActive.map(mech => (
          <span key={mech} style={{display:"flex",alignItems:"center",gap:"4px",fontSize:FS.xs,color:MECH_COLOR[mech],...M}}>
            <span style={{width:"8px",height:"8px",borderRadius:CR.XS,background:MECH_COLOR[mech],display:"inline-block"}}/> {MECHANISMS[mech].label}
          </span>
        ))}
        {dataColSet && <span style={{display:"flex",alignItems:"center",gap:"4px",fontSize:FS.xs,color:C.TEXT_3,...M}}>
          <span style={{width:"8px",height:"8px",borderRadius:CR.XS,background:"repeating-linear-gradient(45deg,transparent,transparent 2px,#ddd 2px,#ddd 3px)",border:"1px solid #ddd",display:"inline-block"}}/> Label / condition
        </span>}
      </div>
    </div>
  );
}

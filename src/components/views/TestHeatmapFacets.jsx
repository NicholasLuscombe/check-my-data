import { C, FS, FW, CR, SIGNAL } from "../../constants/tokens.js";
import { hexToRgb, flagRankOf } from "../../constants/thresholds.js";
import { MECHANISMS, MECHANISM_ORDER, TEST_MECHANISM } from "../../constants/mechanisms.js";

/* Per-test heatmap facets: small multiples showing every applicable test's
   spatial pattern on a miniature of the data grid. Clean tests show blank. */
export function TestHeatmapFacets({ localizations, nRows, nCols, results, dataColSet }) {
  if (nRows < 1 || nCols < 1) return null;
  // All applicable tests
  const applicableTests = (results || []).filter(r => r.flag !== "N/A");
  if (!applicableTests.length) return null;

  // Group localizations by test name
  const locsByTest = {};
  for (const loc of localizations) {
    if (!locsByTest[loc.testName]) locsByTest[loc.testName] = [];
    locsByTest[loc.testName].push(loc);
  }

  // Shared grid dimensions
  const MAX_ROW_BINS = 60, MAX_COL_BINS = Math.min(nCols, 20);
  const rowBinSize = Math.max(1, Math.ceil(nRows / MAX_ROW_BINS));
  const colBinSize = Math.max(1, Math.ceil(nCols / MAX_COL_BINS));
  const nRowBins = Math.ceil(nRows / rowBinSize);
  const nColBins = Math.ceil(nCols / colBinSize);
  const CELL_H = Math.max(2, Math.min(3, Math.floor(160 / nRowBins)));
  const CELL_W = Math.max(3, Math.min(8, Math.floor(160 / nColBins)));

  // Build a grid per test
  const testGrids = applicableTests.map(t => {
    const mech = TEST_MECHANISM[t.name] || "replicate";
    const locs = locsByTest[t.name] || [];
    const grid = Array.from({length: nRowBins}, () => new Float32Array(nColBins));
    for (const loc of locs) {
      const w = loc.flag === "HIGH" ? 1.0 : 0.6;
      const fillRow = (r, cols, wt) => {
        const rb = Math.min(Math.floor(r / rowBinSize), nRowBins - 1);
        if (rb < 0) return;
        const uw = wt ?? w;
        if (cols) {
          for (const c of cols) {
            const cb = Math.min(Math.floor(c / colBinSize), nColBins - 1);
            if (cb >= 0) grid[rb][cb] = Math.min(1, Math.max(grid[rb][cb], uw));
          }
        } else {
          for (let cb = 0; cb < nColBins; cb++) grid[rb][cb] = Math.min(1, Math.max(grid[rb][cb], uw));
        }
      };
      if (loc.type === "rows" && loc.rows) {
        for (const r of loc.rows) fillRow(r, loc.cols || null);
      } else if ((loc.type === "rowRange" || loc.type === "block") && loc.rows?.length === 2) {
        for (let r = loc.rows[0]; r <= loc.rows[1] && r < nRows; r++) fillRow(r, loc.cols || null);
      } else if (loc.type === "columns" && loc.cols) {
        for (let r = 0; r < nRows; r++) fillRow(r, loc.cols);
      } else if (loc.type === "cells" && loc.cells) {
        for (const [r, c] of loc.cells) fillRow(r, [c]);
      } else if (loc.type === "densityCells" && loc.cellWeights) {
        for (const [key, cw] of Object.entries(loc.cellWeights)) {
          const [r, c] = key.split(",").map(Number);
          fillRow(r, [c], cw);
        }
      }
    }
    const hasData = locs.length > 0;
    return { name: t.name, flag: t.flag, mechanism: mech, grid, hasData, label: locs[0]?.label || "" };
  });

  // Sort: flagged tests first (HIGH then MODERATE), then by mechanism order
  const mechRank = m => MECHANISM_ORDER.indexOf(m);
  testGrids.sort((a, b) => flagRankOf(b.flag) - flagRankOf(a.flag) || mechRank(a.mechanism) - mechRank(b.mechanism));

  return (
    <div style={{marginBottom:"16px",background:C.WHITE,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.LG,padding:"12px 14px"}}>
      <div style={{fontSize:FS.base,fontWeight:FW.BOLD,color:C.TEXT,marginBottom:"8px"}}>Per-test breakdown</div>
      <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
        {testGrids.map(t => {
          const info = MECHANISMS[t.mechanism];
          const isFlagged = t.flag === "HIGH" || t.flag === "MODERATE";
          return (
            <div key={t.name} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",opacity:isFlagged?1:0.5}}>
              <div style={{fontSize:FS.xs,color:isFlagged ? info.color : C.TEXT_3,fontWeight:isFlagged?700:500,textAlign:"center",maxWidth:`${nColBins*CELL_W+10}px`}}>{t.name === "Exact Duplicate Detection" ? "Exact Duplicates" : t.name}</div>
              <div style={{display:"flex",flexDirection:"column",border:"1px solid "+(isFlagged ? info.color+"44" : C.BORDER_L),borderRadius:CR.XS,overflow:"hidden",position:"relative"}}>
                {t.grid.map((row, rb) => (
                  <div key={rb} style={{display:"flex",height:`${CELL_H}px`}}>
                    {Array.from({length: nColBins}, (_, cb) => {
                      const v = row[cb];
                      const binStart = cb * colBinSize, binEnd = Math.min((cb+1)*colBinSize, nCols);
                      let isData = !dataColSet;
                      if (dataColSet) { for (let ci = binStart; ci < binEnd; ci++) { if (dataColSet.has(ci)) { isData = true; break; } } }
                      const [cr,cg,cb2] = v > 0 ? hexToRgb(info.color) : [0,0,0];
                      return (
                        <div key={cb} style={{
                          width:`${CELL_W}px`,height:`${CELL_H}px`,
                          background: v > 0 ? `rgba(${cr},${cg},${cb2},${Math.max(0.08, v)})` : isData ? (isFlagged ? C.BG : SIGNAL.GREEN.bg) : C.BG,
                          ...(isData ? {} : {backgroundImage:"repeating-linear-gradient(45deg,transparent,transparent 1px,#eee 1px,#eee 2px)"})
                        }}/>
                      );
                    })}
                  </div>
                ))}
                {!isFlagged && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                  <span style={{fontSize:"16px",color:SIGNAL.GREEN.dot,opacity:0.5}}>{"✓"}</span>
                </div>}
              </div>
              {isFlagged && t.label && <div style={{fontSize:FS.xs,color:C.TEXT_3}}>{t.label.split(" ").slice(0,4).join(" ")}</div>}
              {!isFlagged && <div style={{fontSize:FS.xs,color:SIGNAL.GREEN.dot}}>Clean</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// S326 throwaway probe — candidate definitions of "last column with real content",
// measured across every corpus sheet. Read-only.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { parseExcel } from './src/import/excel.js';

const DIR = '/Users/hedgehog/Projects/check-my-data/corpus-data';

// Today's filled-cell test, verbatim from parser.js:29 / :41
const filled = v => v != null && String(v).trim() !== "";
const PLACEHOLDERS = new Set(['n/a','na','n.a.','#n/a','-','--','','null','none','nd','n.d.','.']);
const isPlaceholder = v => v != null && PLACEHOLDERS.has(String(v).trim().toLowerCase());

// ── Candidate width definitions ──
function widthA(rows) {                       // status quo: widest row array length = used range
  return rows.reduce((m,r)=>Math.max(m,r.length),0);
}
function lastIdx(rows, pred, startRow=0) {
  let last = -1;
  for (let r = startRow; r < rows.length; r++)
    for (let c = rows[r].length - 1; c > last; c--)
      if (pred(rows[r][c])) { last = Math.max(last, c); break; }
  return last + 1;
}
const widthB = rows => lastIdx(rows, v => v != null);                        // non-null
const widthC = rows => lastIdx(rows, filled);                                // non-empty after trim
const widthD = rows => lastIdx(rows, filled, 1);                             // data rows only (skip header)
const widthE = rows => lastIdx(rows, v => filled(v) && !isPlaceholder(v));   // placeholders absent
function widthF(rows) {                       // column would survive the existing column drop
  const nC = widthA(rows);
  const thresh = Math.max(2, Math.floor(rows.length*0.05));
  let last = -1;
  for (let c = 0; c < nC; c++) {
    let f = 0;
    for (let r = 0; r < rows.length; r++) if (filled(rows[r]?.[c])) f++;
    if (f > thresh) last = c;
  }
  return last + 1;
}
const CANDS = { A: widthA, B: widthB, C: widthC, D: widthD, E: widthE, F: widthF };

// preprocessRaw with an injected width (everything else verbatim from parser.js:25-44)
function preprocessWith(raw, width) {
  if(!raw||!raw.length) return {rows:raw,removedCols:[],skippedRows:0,trimmedRows:0};
  const minCells=Math.max(3,Math.ceil(width*0.1));
  const isSparse=row=>row.filter(filled).length<minCells;
  let s=0; while(s<raw.length&&isSparse(raw[s]))s++;
  let e=raw.length-1; while(e>s&&isSparse(raw[e]))e--;
  let rows=raw.slice(s,e+1);
  if(!rows.length) return {rows,removedCols:[],skippedRows:s,trimmedRows:0,minCells,empty:true};
  const trimmedRows=(raw.length-1)-e;
  const nC=rows.reduce((m,r)=>Math.max(m,r.length),0);
  const sparseThresh=Math.max(2,Math.floor(rows.length*0.05));
  const emptyC=new Set();
  for(let c=0;c<nC;c++){let f=0;for(let r=0;r<rows.length;r++){if(filled(rows[r]?.[c]))f++;}if(f<=sparseThresh)emptyC.add(c);}
  if(emptyC.size>0&&emptyC.size<nC) rows=rows.map(row=>row.filter((_,ci)=>!emptyC.has(ci)));
  return {rows,removedCols:[...emptyC],skippedRows:s,trimmedRows,minCells,empty:false};
}

const files = readdirSync(DIR).filter(f=>/\.(xlsx|xls)$/i.test(f) && !/-update|-updated/i.test(f)).sort();
const out = [];
for (const f of files) {
  let names;
  try { names = XLSX.read(readFileSync(`${DIR}/${f}`), {type:'buffer', bookSheets:true}).SheetNames; }
  catch(e){ console.log(`${f}: read error ${e.message}`); continue; }
  for (const sheet of names) {
    let rows;
    try { ({rows} = await parseExcel(new Blob([readFileSync(`${DIR}/${f}`)]), sheet)); }
    catch(e){ out.push({file:f,sheet,error:e.message}); continue; }
    if (!rows || !rows.length) { out.push({file:f,sheet,error:'no rows'}); continue; }
    const rec = { file:f, sheet, rawRows:rows.length, widths:{}, result:{} };
    for (const [k,fn] of Object.entries(CANDS)) {
      const w = fn(rows);
      rec.widths[k] = w;
      const p = preprocessWith(rows, w);
      rec.result[k] = { minCells:p.minCells, survRows:p.empty?0:p.rows.length,
                        finalCols:p.empty?0:(p.rows[0]?.length||0), removed:p.removedCols.length };
    }
    out.push(rec);
  }
}
writeFileSync('/Users/hedgehog/Projects/cmd-s326-import-width/probe-width-out.json', JSON.stringify(out,null,2));
console.log(`measured ${out.length} sheets across ${files.length} files`);

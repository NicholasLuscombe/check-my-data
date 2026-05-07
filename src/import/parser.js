export function forwardFill(row) {
  const out=[...row]; let last="";
  for(let i=0;i<out.length;i++){const v=out[i]!=null?String(out[i]).trim():"";if(v)last=v;else out[i]=last;}
  return out;
}
export function isSparseGroupRow(row) {
  const t=row.length; if(t<3) return false;
  const bl=row.filter(v=>v==null||String(v).trim()==="").length;
  return bl/t>0.4&&(t-bl)>=2;
}
export function isRepeatingSubHeader(row) {
  const vals=row.map(v=>v!=null?String(v).trim():"").filter(Boolean);
  if(vals.length<4) return false;
  const uniq=new Set(vals);
  return uniq.size<=Math.ceil(vals.length/2)&&uniq.size>=2;
}
export function detectHeaderRows(raw) {
  if(raw.length<3) return raw.length>=2?1:0;
  const row0=raw[0],row1=raw[1],row2=raw[2];
  const nf2=row2.filter(v=>v!=null&&v!==""&&!isNaN(Number(v))).length/Math.max(row2.length,1);
  if(isSparseGroupRow(row0)&&isRepeatingSubHeader(row1)&&nf2>0.5) return 2;
  const nf0=row0.filter(v=>v!=null&&v!==""&&!isNaN(Number(v))).length/Math.max(row0.filter(v=>v!=null&&v!=="").length,1);
  return nf0<0.5?1:1;
}
export function preprocessRaw(raw) {
  if(!raw||!raw.length) return{rows:raw,removedCols:[],skippedRows:0,trimmedRows:0};
  const maxC=raw.reduce((m,r)=>Math.max(m,r.length),0);
  const minCells=Math.max(3,Math.ceil(maxC*0.1));
  const isSparse=row=>row.filter(v=>v!=null&&String(v).trim()!=="").length<minCells;
  let s=0; while(s<raw.length&&isSparse(raw[s]))s++;
  let e=raw.length-1; while(e>s&&isSparse(raw[e]))e--;
  let rows=raw.slice(s,e+1);
  if(!rows.length) return{rows,removedCols:[],skippedRows:s,trimmedRows:0};
  const trimmedRows=(raw.length-1)-e;
  const nC=rows.reduce((m,r)=>Math.max(m,r.length),0);
  // Threshold-based separator detection: a column with ≤5% filled cells (min 2)
  // is treated as a separator. Handles stray values (text, typos) in otherwise-empty
  // separator columns common in messy spreadsheet exports.
  const sparseThresh=Math.max(2,Math.floor(rows.length*0.05));
  const emptyC=new Set();
  for(let c=0;c<nC;c++){let filled=0;for(let r=0;r<rows.length;r++){const v=rows[r]?.[c];if(v!=null&&String(v).trim()!=="")filled++;}if(filled<=sparseThresh)emptyC.add(c);}
  if(emptyC.size>0&&emptyC.size<nC) rows=rows.map(row=>row.filter((_,ci)=>!emptyC.has(ci)));
  return{rows,removedCols:[...emptyC],skippedRows:s,trimmedRows};
}
export function detectBlocks(rows) {
  if(!rows||rows.length<2) return[rows];
  const blocks=[]; let cur=[];
  for(let i=0;i<rows.length;i++){
    const nb=rows[i].filter(v=>v!=null&&String(v).trim()!=="").length;
    if(nb===0){if(cur.length){blocks.push(cur);cur=[];}}else cur.push(rows[i]);
  }
  if(cur.length) blocks.push(cur);
  const meaningful=blocks.filter(b=>b.length>=2);
  return meaningful.length<=1?[rows]:meaningful;
}
export function blockSummary(block) {
  if(!block||!block.length) return{rows:0,cols:0,preview:""};
  const maxC=block.reduce((m,r)=>Math.max(m,r.length),0);
  const minCells=Math.max(2,Math.ceil(maxC*0.1));
  let si=0;
  while(si<block.length-1){const nb=block[si].filter(v=>v!=null&&String(v).trim()!=="").length;if(nb<minCells)si++;else break;}
  const first=block[si].slice(0,6).map(v=>v!=null&&String(v).trim()?String(v).trim():"").filter(Boolean);
  const dr=block.filter(r=>r.filter(v=>v!=null&&v!==""&&!isNaN(Number(v))).length>r.length*0.3).length;
  return{rows:block.length,cols:maxC,dataRows:dr,preview:first.join(", ")};
}

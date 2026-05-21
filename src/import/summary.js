/* ── Data summary (pre-analysis statistics) ─────────────────────── */

export function summarize(data,roles,condPerCol,zeroAsMissing) {
  const dI=roles.reduce((a,r,i)=>r==="data"?[...a,i]:a,[]);
  const cI=roles.reduce((a,r,i)=>r==="condition"?[...a,i]:a,[]);
  let total=0,miss=0,ints=0,zeros=0;
  const nums=[],rawPrecStrs=[],textInData={};
  // colMaxLen[ci] — max formatted-string length per column across every
  // non-null cell, used by ImportView's table preview + the forensics
  // ExcerptTable to derive content-aware column widths. Spans ALL roles
  // (data / label / condition / ignore) so role-cycling on ImportView
  // doesn't change the width — the width is purely a function of the
  // longest value the column has ever held. Computed at import-scan
  // time (one pass over the matrix that the summary loop already
  // performs for data cells; extended here to scan every column).
  // Indexed by full column index, not data-column index.
  const nCols=data.length?data[0].length:0;
  const colMaxLen=new Array(nCols).fill(0);
  for(const row of data){
    for(let ci=0;ci<nCols;ci++){
      const v=row[ci];
      if(v==null||v==="")continue;
      const len=String(v).length;
      if(len>colMaxLen[ci])colMaxLen[ci]=len;
    }
  }
  for(const row of data) for(const ci of dI){
    const v=row[ci];
    if(v==null||v===""){miss++;continue;}
    const n=Number(v);
    if(isNaN(n)){const s=String(v).trim();textInData[s]=(textInData[s]||0)+1;continue;}
    if(n===0){zeros++;if(zeroAsMissing){miss++;continue;}}
    total++;nums.push(n);rawPrecStrs.push(String(v).trim());if(Number.isInteger(n))ints++;
  }
  const conds=new Set();
  for(const row of data) for(const ci of cI) if(row[ci]!=null&&row[ci]!=="")conds.add(String(row[ci]));
  if(condPerCol) for(const c of condPerCol) if(c)conds.add(c);
  const prec={};
  const precTrailingZero={};
  for(const s of rawPrecStrs){
    const d=s.indexOf("."),dp=d<0?0:s.length-d-1;
    prec[dp]=(prec[dp]||0)+1;
    if(dp>0&&s.endsWith("0")) precTrailingZero[dp]=(precTrailingZero[dp]||0)+1;
  }
  let mn=null,mx=null;
  if(nums.length){mn=nums[0];mx=nums[0];for(let i=1;i<nums.length;i++){if(nums[i]<mn)mn=nums[i];if(nums[i]>mx)mx=nums[i];}}
  const span=mn>0&&mx>0?Math.log10(mx)-Math.log10(mn):mn!=null&&mx!=null&&mn!==0&&mx!==0?Math.log10(Math.abs(mx))-Math.log10(Math.abs(mn)):null;
  const nText=Object.values(textInData).reduce((a,b)=>a+b,0);
  const hasRowConds=cI.length>0&&conds.size>0;
  const hasColConds=condPerCol&&condPerCol.some(c=>c);
  const condSource=hasColConds?"column":hasRowConds?"row":null;
  return{nDC:dI.length,nR:data.length,total,miss,zeros,nText,textInData,intF:total?ints/total:0,nC:conds.size,cNames:[...conds].slice(0,20),mn,mx,span,prec,precTrailingZero,condSource,colMaxLen};
}

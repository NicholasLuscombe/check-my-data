/* ── Data summary (pre-analysis statistics) ─────────────────────── */

export function summarize(data,roles,condPerCol,zeroAsMissing) {
  const dI=roles.reduce((a,r,i)=>r==="data"?[...a,i]:a,[]);
  const cI=roles.reduce((a,r,i)=>r==="condition"?[...a,i]:a,[]);
  let total=0,miss=0,ints=0,zeros=0;
  const nums=[],rawPrecStrs=[],textInData={};
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
  return{nDC:dI.length,nR:data.length,total,miss,zeros,nText,textInData,intF:total?ints/total:0,nC:conds.size,cNames:[...conds].slice(0,20),mn,mx,span,prec,precTrailingZero,condSource};
}

/* ── Synthetic demo dataset generators ───────────────────────────── */

export function makeDemo() {
  const conds=["Control","Treatment_A","Treatment_B","Treatment_C","Treatment_D","Treatment_E"];
  const rows=[["Sample","Condition","Rep1","Rep2","Rep3"]];
  let n=1;
  for(const c of conds){
    const base=c==="Control"?50:20+Math.random()*70;
    for(let i=0;i<8;i++){
      rows.push(["S"+String(n).padStart(3,"0"),c,
        (base+(Math.random()-0.5)*10).toFixed(2),
        (base+(Math.random()-0.5)*10).toFixed(2),
        (base+(Math.random()-0.5)*10).toFixed(2)]);
      n++;
    }
  }
  return rows.map(r=>r.join(",")).join("\n");
}
export function makeDemo2Row() {
  const conds=["Control","DrugA","DrugB"];
  let csv=","+conds.map(c=>c+",,,").join(",")+"\n";
  csv+="Residue,"+conds.map(()=>"R1,R2,R3,R4").join(",")+"\n";
  for(let i=1;i<=30;i++){
    const vals=conds.flatMap(c=>{
      const base=c==="Control"?0.5:0.3+Math.random()*0.4;
      return[0,1,2,3].map(()=>(base+(Math.random()-0.5)*0.1).toFixed(4));
    });
    csv+=i+","+vals.join(",")+"\n";
  }
  return csv;
}

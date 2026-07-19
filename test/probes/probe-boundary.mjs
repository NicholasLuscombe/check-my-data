import { readFileSync, readdirSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { parseExcel } from './src/import/excel.js';
const DIR='/Users/hedgehog/Projects/check-my-data/corpus-data';
const files=readdirSync(DIR).filter(f=>/\.(xlsx|xls)$/i.test(f)&&!/-update/i.test(f)).sort();
let emptyStr=0, wsOnly=0, nulls=0, total=0, sheetsWithEmptyStr=[], sheetsWithWs=[];
const PL=new Set(['n/a','na','n.a.','#n/a','-','--','null','none','nd','n.d.','.']);
let placeholderCells=0, sheetsWithPlaceholder=new Map();
for(const f of files){
  const names=XLSX.read(readFileSync(`${DIR}/${f}`),{type:'buffer',bookSheets:true}).SheetNames;
  for(const s of names){
    let rows; try{({rows}=await parseExcel(new Blob([readFileSync(`${DIR}/${f}`)]),s));}catch(e){continue;}
    let es=0, ws=0, pl=0;
    for(const r of rows) for(const v of r){
      total++;
      if(v==null){nulls++;continue;}
      const str=String(v);
      if(str===''){es++;emptyStr++;}
      else if(str.trim()===''){ws++;wsOnly++;}
      if(PL.has(str.trim().toLowerCase())){pl++;placeholderCells++;}
    }
    if(es) sheetsWithEmptyStr.push(`${f}/${s}:${es}`);
    if(ws) sheetsWithWs.push(`${f}/${s}:${ws}`);
    if(pl) sheetsWithPlaceholder.set(`${f}/${s}`,pl);
  }
}
console.log('=== boundary case census, all corpus cells ===');
console.log('total cells        :',total);
console.log('genuinely absent   :',nulls,'(null)');
console.log('empty string ""    :',emptyStr, emptyStr?'':'  <- none anywhere');
console.log('whitespace only    :',wsOnly, wsOnly?'':'  <- none anywhere');
console.log('placeholder tokens :',placeholderCells);
if(sheetsWithEmptyStr.length) console.log('  empty-string sheets:',sheetsWithEmptyStr.slice(0,10).join(', '));
if(sheetsWithWs.length) console.log('  whitespace sheets  :',sheetsWithWs.slice(0,10).join(', '));
console.log('\n=== sheets carrying placeholder tokens (top 12) ===');
[...sheetsWithPlaceholder.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12)
  .forEach(([k,v])=>console.log(`  ${k.padEnd(46)} ${v} cells`));

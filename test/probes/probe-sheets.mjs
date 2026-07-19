import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
for (const f of ['C07','C09','C14','C15','C16','C20','C22']) {
  const wb = XLSX.read(readFileSync(`/Users/hedgehog/Projects/check-my-data/corpus-data/${f}.xlsx`), { type: 'buffer' });
  console.log(f.padEnd(5), JSON.stringify(wb.SheetNames));
}

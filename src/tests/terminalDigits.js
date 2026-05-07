import { chiSquaredP } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

/* 8. Terminal Digit Uniformity */
/**
 * Detects non-uniform last-digit distributions indicative of human digit preference when fabricating continuous measurements.
 * @param {number[][]} matrix - 2D array of numeric values (rows x replicate columns)
 * @param {string} [assay='general'] - Assay type identifier (e.g. 'qpcr', 'general')
 * @returns {{ name: string, category: string, flag: string, description: string, chiSquared: string, df: number, p: string, primaryP: number, nValues: number, trailingZeroWarning: boolean, chi10: string, p10: string, details: Array<{ digit: number, observed: number, expected: string, pct: string }> }}
 * @see METHODOLOGY.md §"3.1 Terminal Digit Uniformity"
 */
export function testTerminalDigits(matrix, assay='general') {
  const vals=matrix.flat().filter(v=>v!=null&&isFinite(v));
  if(vals.length<50) return {name:"Terminal Digit Uniformity",category:"digits",flag:"N/A",description:"Insufficient data (need \u226550 values)."};
  // Integer guard: terminal digit analysis tests whether the LAST DECIMAL DIGIT is uniform,
  // which detects human digit preference when fabricating continuous measurements (Simonsohn 2013).
  // For integer data (counts, scores), the "terminal digit" is just the units digit, which has
  // no reason to be uniform — count distributions naturally produce non-uniform units digits.
  // Return N/A to avoid false positives on integer/count data.
  const intFrac=vals.filter(v=>Number.isInteger(v)).length/vals.length;
  if(intFrac>0.95) return {name:"Terminal Digit Uniformity",category:"digits",flag:"N/A",
    description:`Data is ${(intFrac*100).toFixed(0)}% integer values. Terminal digit analysis tests the last decimal digit of continuous measurements \u2014 for integer/count data, the units digit distribution depends on the count-generating process and is not expected to be uniform. Test not applicable.`};  const counts=new Array(10).fill(0); let total=0;
  for(const v of vals){
    const s=Math.abs(v).toString();
    // Only extract terminal digit from values that have a decimal component,
    // OR from integers. For decimals, the last digit in the string is the terminal digit.
    // We do NOT strip trailing zeros from the string — they've already been stripped by
    // the parser (Excel/CSV drop them). The raw last character is what we have.
    const m=s.match(/(\d)$/);
    if(m){counts[parseInt(m[1])]++;total++;}
  }
  if(!total) return {name:"Terminal Digit Uniformity",category:"digits",flag:"N/A",description:"No valid terminal digits extracted."};

  const exp10=total/10; let chi10=0;
  const det=counts.map((c,d)=>{chi10+=(c-exp10)**2/exp10;return{digit:d,observed:c,expected:exp10.toFixed(1),pct:((c/total)*100).toFixed(1)+"%",isAvoided:c<exp10*0.5};});
  const p10=chiSquaredP(chi10,9);

  // Detect trailing-zero suppression: digit 0 observed at <40% of its expected count.
  // Excel and most CSV exports silently drop trailing zeros (1.20 → 1.2), making digit 0
  // systematically absent even in perfectly genuine data. When detected, the 10-digit
  // chi-squared is unreliable — report a secondary 9-digit test (digits 1–9, df=8) instead.
  const zeroExpected=exp10;
  const trailingZeroWarning = counts[0] < zeroExpected * 0.40;

  let reportedChi, reportedDf, reportedP, reportedFlag, rawReportedChi, rawReportedP;
  if(trailingZeroWarning){
    // 9-digit test: exclude digit 0 from both observed and expected
    const total9=total-counts[0];
    const exp9=total9/9; let chi9=0;
    for(let d=1;d<=9;d++) chi9+=(counts[d]-exp9)**2/exp9;
    const p9=chiSquaredP(chi9,8);
    reportedChi=chi9.toFixed(3); reportedDf=8; reportedP=p9.toFixed(4);
    rawReportedChi=chi9; rawReportedP=p9;
    reportedFlag=flagFromP(p9);
  } else {
    reportedChi=chi10.toFixed(3); reportedDf=9; reportedP=p10.toFixed(4);
    rawReportedChi=chi10; rawReportedP=p10;
    reportedFlag=flagFromP(p10);
  }

  return { name:"Terminal Digit Uniformity", category:"digits",
    description:"Tests whether the last significant digit follows a uniform distribution. Humans choosing numbers show systematic digit preferences and avoid 0s and 5s (Simonsohn 2013; Mosimann et al. 2002)." + (assay==='qpcr' && reportedFlag!=='LOW' ? ' Note: qPCR instruments commonly produce digit 5 excess due to 0.05\u00b0C quantisation in Ct peak-finding algorithms \u2014 non-uniform terminal digits on raw Ct data may reflect instrument rounding rather than manual entry. Compare the digit pattern to your instrument\'s known quantisation step.' : ''),
    chiSquared:reportedChi, rawChiSq:rawReportedChi, df:reportedDf,
    p:reportedP, rawPReported:rawReportedP, primaryP:rawReportedP, nValues:total,
    trailingZeroWarning,
    chi10:chi10.toFixed(3), rawChi10:chi10, p10:p10.toFixed(4), rawP10:p10,
    flag:reportedFlag, details:det };
}

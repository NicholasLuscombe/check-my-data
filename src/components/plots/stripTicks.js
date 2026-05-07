/** Row-axis tick marks at regular intervals for strip plots. */
export function stripTicks(nRows) {
  const ticks = [];
  const step = nRows <= 50 ? 10 : nRows <= 200 ? 25 : nRows <= 500 ? 100 : 250;
  for(let t=1; t<=nRows; t+=step) ticks.push(t);
  if(ticks[ticks.length-1] !== nRows) ticks.push(nRows);
  return ticks;
}

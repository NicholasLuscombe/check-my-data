/** Row-axis tick marks at regular intervals for strip plots. */
export function stripTicks(nRows) {
  const ticks = [];
  const step = nRows <= 50 ? 10 : nRows <= 200 ? 25 : nRows <= 500 ? 100 : 250;
  for(let t=1; t<=nRows; t+=step) ticks.push(t);
  // Append the final-row tick only when it clears the last round tick by at
  // least half a step — otherwise its label overprints the neighbour (e.g.
  // nRows=160, step=25: last round tick 151, endpoint 160 → "151160"). Drop
  // rather than overprint; the round ticks still convey the scale. S212.
  const last = ticks[ticks.length-1];
  if(last !== nRows && nRows - last >= step / 2) ticks.push(nRows);
  return ticks;
}

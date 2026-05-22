// S166 fix-2 FIX 1 — sanity-check DS21 Autocorr y-axis fit math
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');

async function runFixture(file, assay) {
  const csv = readFileSync(join('test/fixtures', file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  raw = preprocessRaw(raw).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const lfDet = detectLongFormat(headers, data);
  const rs = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  return runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, 'continuous', rs.value || 'ordered');
}

function simulateAxisFit(curves, verdictMarker) {
  const markerVals = verdictMarker ? [verdictMarker.value, ...(Array.isArray(verdictMarker.ci) ? verdictMarker.ci : [])] : [];
  const fitVals = curves.flatMap(c => c.curve).concat(markerVals).filter(Number.isFinite);
  const rawHalfSpan = fitVals.length ? Math.max(...fitVals.map(v => Math.abs(v))) : 0;
  const paddedHalfSpan = rawHalfSpan * 1.15;
  const MIN_HALF_SPAN = 0.12;
  const fitHalfSpan = Math.max(paddedHalfSpan, MIN_HALF_SPAN);
  const tickStep = fitHalfSpan <= 0.25 ? 0.05 : fitHalfSpan <= 0.6 ? 0.1 : 0.2;
  const niceHalfSpan = Math.ceil(fitHalfSpan / tickStep) * tickStep;
  return { rawHalfSpan, paddedHalfSpan, fitHalfSpan, tickStep, niceHalfSpan, YMIN: -niceHalfSpan, YMAX: niceHalfSpan };
}

for (const [file, assay] of [['21-localised-ar.csv', 'general'], ['02-densitometry-fabricated.csv', 'densitometry'], ['10-proteomics-fabricated.csv', 'proteomics']]) {
  const results = await runFixture(file, assay);
  const ac = results.find(r => r.name === 'Autocorrelation');
  if (!ac) { console.log(`${file}: no Autocorrelation result`); continue; }
  const curves = ac.perGroupDecay?.length
    ? ac.perGroupDecay
    : ac.decayCurve ? [{ group: 'All data', curve: ac.decayCurve }] : [];
  const verdictMarker = Number.isFinite(parseFloat(ac.pooledMeanR1)) ? {
    value: parseFloat(ac.pooledMeanR1),
    ci: Array.isArray(ac.pooledR1CI95) ? ac.pooledR1CI95 : null,
    lag: 1,
  } : null;
  const fit = simulateAxisFit(curves, verdictMarker);
  const ciClearance = verdictMarker?.ci ? verdictMarker.ci[0] : null;  // lower bound
  const clearanceFrac = ciClearance != null ? Math.abs(ciClearance) / fit.niceHalfSpan : null;
  console.log(`${file}:`);
  console.log(`  curves=${curves.length}, marker=${verdictMarker?.value?.toFixed(4)}, ci=[${verdictMarker?.ci?.map(v=>v.toFixed(4))?.join(', ')}]`);
  console.log(`  rawHalfSpan=${fit.rawHalfSpan.toFixed(4)}, fitHalfSpan=${fit.fitHalfSpan.toFixed(4)}, tickStep=${fit.tickStep}, niceHalfSpan=${fit.niceHalfSpan.toFixed(4)}`);
  console.log(`  axis = [${fit.YMIN.toFixed(2)}, ${fit.YMAX.toFixed(2)}], CI-lower-bound at ${clearanceFrac ? (clearanceFrac*100).toFixed(1) : '—'}% of upper half`);
  console.log('');
}

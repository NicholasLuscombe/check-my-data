/* S398 — drive the budget module's halt paths. A guard that never fired proves
 * nothing, so every branch below is exercised against a constructed Response
 * rather than asserted. No network, no token, no writes.
 *
 * Run: node test/probes/probe-s398-ratelimit.mjs
 */
import { headerNumber, validatedResetMs, makeBudget, MAX_WAIT_MS, LOCAL_LIMIT }
  from '../../scripts/lib/round2-ratelimit.mjs';

const R = (h = {}) => new Response('x', { headers: h });
let pass = 0, fail = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? 'ok  ' : 'BAD '}${label}  ->  ${JSON.stringify(got)}`);
  ok ? pass++ : fail++;
};
const halts = (label, fn, needle) => {
  let msg = null;
  try { fn(); } catch (e) { msg = e.message; }
  const ok = msg !== null && msg.includes(needle);
  console.log(`  ${ok ? 'ok  ' : 'BAD '}${label}`);
  if (msg) console.log(`        ${msg.split('\n')[0].slice(0, 150)}`);
  else console.log('        DID NOT HALT');
  ok ? pass++ : fail++;
};

console.log('\n1 — headerNumber: an absent header is null, NEVER a zero');
console.log(`  for reference: Number(null) = ${Number(null)}, isFinite = ${Number.isFinite(Number(null))}`);
check('absent header', headerNumber(R(), 'ratelimit-remaining'), null);
check('blank header', headerNumber(R({ 'ratelimit-remaining': '   ' }), 'ratelimit-remaining'), null);
check('unparseable', headerNumber(R({ 'ratelimit-remaining': 'soon' }), 'ratelimit-remaining'), null);
check('present zero', headerNumber(R({ 'ratelimit-remaining': '0' }), 'ratelimit-remaining'), 0);
check('present 97', headerNumber(R({ 'ratelimit-remaining': '97' }), 'ratelimit-remaining'), 97);

console.log('\n2 — the ABSENT-HEADER case PROCEEDS: no header, full budget, no wait');
const b = makeBudget(LOCAL_LIMIT);
const t0 = Date.UTC(2026, 7, 31, 12, 0, 0);
check('remaining absent -> null (run proceeds)', headerNumber(R(), 'ratelimit-remaining'), null);
check('first reserve grants a slot, 0 ms wait', b.reserve(t0), 0);
for (let i = 1; i < LOCAL_LIMIT; i++) b.reserve(t0);
check(`slots used after ${LOCAL_LIMIT} reserves`, b.used, LOCAL_LIMIT);
check('the 101st in the same hour waits to the next UTC hour (ms)', b.reserve(t0), 3600000);
check('a new UTC hour resets the window', b.reserve(t0 + 3600000), 0);

console.log('\n3 — validatedResetMs HALTS rather than deriving a wait from nothing');
halts('absent ratelimit-reset', () => validatedResetMs(R(), '429 at pos-21', t0, t0), 'absent or unparseable');
halts('unparseable ratelimit-reset', () => validatedResetMs(R({ 'ratelimit-reset': 'later' }), '429 at pos-21', t0, t0), 'absent or unparseable');
halts('the 1970 case — reset 0, the exact defect',
  () => validatedResetMs(R({ 'ratelimit-reset': '0' }), '429 at pos-21', t0, t0), 'at or before this process started');
halts('reset in the past', () => validatedResetMs(R({ 'ratelimit-reset': String((t0 - 60000) / 1000) }), '429 at pos-21', t0, t0), 'at or before this process started');
halts('reset beyond one hour', () => validatedResetMs(R({ 'ratelimit-reset': String((t0 + MAX_WAIT_MS + 60000) / 1000) }), '429 at pos-21', t0, t0), 'beyond the one-hour maximum');
check('a valid near-future reset returns its instant',
  validatedResetMs(R({ 'ratelimit-reset': String((t0 + 120000) / 1000) }), '429 at pos-21', t0, t0), t0 + 120000);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

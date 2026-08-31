/**
 * S398 — request budgeting for the round-2 fetchers.
 *
 * THE DEFECT THIS REPLACES. `scripts/fetch-round2-readmes.mjs` read
 * `ratelimit-remaining` with `Number(res.headers.get(...))`. `Headers.get`
 * returns `null` for an absent header, `Number(null)` is `0`, and
 * `Number.isFinite(0)` is `true` — so a header Dryad does not send on this
 * endpoint was read as a budget of ZERO, and the matching absent
 * `ratelimit-reset` became `new Date(0)`, printing *window reopens at
 * 1970-01-01T00:00:00.000Z* between downloads.
 *
 * TWO FAULTS, AND THE SECOND IS THE GENERAL ONE: a budget read off a header that
 * is not there, and a wait derived from a value never checked for existence.
 * ABSENCE OF A HEADER IS NOT A MEASUREMENT OF A LIMIT. Same shape as P231.
 *
 * THE RULE HERE. The script's own request count is the PRIMARY budget. Headers
 * corroborate it where they appear and are never a precondition — an absent
 * header is normal and the run proceeds. A wait is only ever derived from a
 * value that exists, parses, lies in the future and stays inside an hour;
 * anything else halts by name.
 *
 * Extracted so the halt paths can be DRIVEN rather than assumed — a module that
 * runs a fetch on import cannot be exercised.
 */

/** §6 — 100 requests an hour per API account, resetting on the hour UTC. */
export const LOCAL_LIMIT = 100;
/** No wait this code takes may exceed one hour. */
export const MAX_WAIT_MS = 3_600_000;
const HOUR_MS = 3_600_000;

/**
 * A header value as a number, or null when it is absent, blank or unparseable.
 * NEVER returns 0 by coercion — that distinction is the whole point.
 */
export function headerNumber(res, name) {
  const raw = res?.headers?.get?.(name);
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * A usable reset instant in ms, or a throw naming what was wrong. Called only
 * where a wait is actually required (a 429); never to decide whether to wait.
 *
 * @param {Response} res
 * @param {string} where      names the call site in the halt message
 * @param {number} startedAt  process start — a reset at or before it is invalid
 * @param {number} now
 */
export function validatedResetMs(res, where, startedAt, now = Date.now()) {
  const reset = headerNumber(res, 'ratelimit-reset');
  if (reset === null)
    throw new Error(`HALT — ${where}: a wait was required but the ratelimit-reset header is `
      + `absent or unparseable. Absence of a header is not a measurement of a limit; `
      + `no wait is derived from a value that was never there.`);
  const ms = reset * 1000;
  if (ms <= startedAt)
    throw new Error(`HALT — ${where}: ratelimit-reset resolves to ${new Date(ms).toISOString()}, `
      + `at or before this process started (${new Date(startedAt).toISOString()}). `
      + `That is not a future window; halting rather than waiting on it.`);
  const delay = ms - now;
  if (delay > MAX_WAIT_MS)
    throw new Error(`HALT — ${where}: ratelimit-reset implies a wait of `
      + `${Math.ceil(delay / 60000)} min, beyond the one-hour maximum.`);
  return ms;
}

/**
 * The primary budget: this script's own requests against `limit` per UTC hour.
 * `reserve()` returns 0 when there is room and takes a slot, or the ms until the
 * next UTC hour when there is not. That wait is arithmetic on the clock, not a
 * figure read off a response, so it is always available and always valid.
 */
export function makeBudget(limit = LOCAL_LIMIT) {
  let hour = null, used = 0, total = 0;
  return {
    get used() { return used; },
    get total() { return total; },
    get hour() { return hour; },
    get limit() { return limit; },
    reserve(now = Date.now()) {
      const h = Math.floor(now / HOUR_MS);
      if (h !== hour) { hour = h; used = 0; }
      if (used < limit) { used++; total++; return 0; }
      return (h + 1) * HOUR_MS - now;
    },
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

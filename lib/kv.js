/* ══════════════════════════════════════════════════════════════════════
   THE ONLY DURABLE STORE IN THIS PROJECT.

   There is no database here: memberships live in Whop, contacts in GHL,
   and neither is a place to put session or device state. This is a thin
   wrapper over an Upstash Redis REST endpoint, chosen because it speaks
   plain HTTP and needs no package — this repo has no package.json, so an
   SDK is not an option.

   IT DEGRADES ON PURPOSE. If the env vars are absent every call resolves
   to null rather than throwing. Callers decide what that means, and the
   two callers here decide differently:

     - Membership verification NEVER depends on this. It asks Whop.
     - Device limiting fails OPEN. Locking a paying member out because an
       environment variable is missing is a worse failure than letting a
       shared login through, and the shared login is still bounded by the
       membership check.

   Set these in Vercel -> Settings -> Environment Variables:
     KV_REST_API_URL     https://xxx.upstash.io
     KV_REST_API_TOKEN   the REST token from the Upstash console
══════════════════════════════════════════════════════════════════════ */

/* Vercel provisions Redis from its own Storage tab and injects the
   credentials for you, but the variable names differ by integration
   vintage: older Vercel KV used KV_REST_API_*, the Upstash marketplace
   integration uses UPSTASH_REDIS_REST_*. Accept either, so whichever
   route is taken in the dashboard simply works rather than failing
   silently with "not configured". */
function restUrl() {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
}
function restToken() {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
}
function configured() { return !!(restUrl() && restToken()); }

async function pipeline(commands) {
  if (!configured()) return null;
  try {
    const res = await fetch(`${restUrl()}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${restToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const out = await res.json();
    return Array.isArray(out) ? out.map(r => (r && 'result' in r ? r.result : null)) : null;
  } catch {
    return null;                       // never take a page down over telemetry
  }
}

async function cmd(...args) {
  const out = await pipeline([args]);
  return out ? out[0] : null;
}

/**
 * Record a device against an identity and report how many distinct ones
 * there are. Both arguments are already hashes; raw emails and raw IPs
 * are never written here.
 *
 * Returns { count, known, ok }. ok=false means the store is unavailable
 * and the caller should not enforce a limit it cannot measure.
 */
async function touchDevice(idHash, deviceHash, ttlSeconds) {
  const key = `dev:${idHash}`;
  const out = await pipeline([
    ['SISMEMBER', key, deviceHash],
    ['SADD', key, deviceHash],
    ['SCARD', key],
    ['EXPIRE', key, String(ttlSeconds)],
  ]);
  if (!out) return { count: 0, known: true, ok: false };
  return { known: out[0] === 1, count: Number(out[2] || 0), ok: true };
}

/**
 * Fixed-window counter. Returns { count, ok, limited }.
 *
 * FAILS OPEN when the store is unreachable: you cannot rate limit
 * without somewhere to count, and refusing every login because an
 * environment variable is missing is a worse outage than an unthrottled
 * hour. The membership check behind it still fails closed.
 */
async function bump(key, limit, windowSeconds) {
  const out = await pipeline([
    ['INCR', key],
    ['EXPIRE', key, String(windowSeconds), 'NX'],
  ]);
  if (!out) return { count: 0, ok: false, limited: false };
  const count = Number(out[0] || 0);
  return { count, ok: true, limited: count > limit };
}

module.exports = { configured, cmd, pipeline, touchDevice, bump, restUrl };

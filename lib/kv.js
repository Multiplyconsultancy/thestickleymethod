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

function configured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function pipeline(commands) {
  if (!configured()) return null;
  try {
    const res = await fetch(`${process.env.KV_REST_API_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
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

module.exports = { configured, cmd, pipeline, touchDevice };

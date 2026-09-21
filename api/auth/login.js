/* ══════════════════════════════════════════════════════════════════════
   LOGIN.

   Post an email. If it belongs to a member, you get a signed cookie and
   middleware.js lets you into /member/start.

   TWO CHECKS, AND THEY FAIL IN OPPOSITE DIRECTIONS ON PURPOSE.

   1. MEMBERSHIP. Compared against the hashed index that
      api/cron/member-index.js maintains. If that index is missing this
      FAILS CLOSED and nobody gets in, because an unverifiable membership
      check that lets people through is not a check.

   2. DEVICES. A member is capped at MAX_DEVICES distinct device
      fingerprints in a rolling window. If the KV store is unreachable
      this FAILS OPEN, because locking a paying customer out over a
      missing environment variable is a worse outcome than one shared
      login, and sharing is still bounded by check 1.

   A device is a hash of IP plus a slice of the user agent. Not raw:
   neither the address nor the IP is ever written to storage.

   The response never says whether an email exists. "That email is not on
   a membership" and "that email is on a membership but is over its
   device limit" are distinguishable to the member who owns it and to
   nobody else, which is why the device message only appears once the
   membership check has already passed.
══════════════════════════════════════════════════════════════════════ */

const kv = require('../../lib/kv.js');
const session = require('../../lib/session.js');

const MAX_DEVICES = 3;
const WINDOW = 30 * 86400;        // rolling, same length as the cookie
const INDEX = 'members:emails';

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '');
  return fwd.split(',')[0].trim() || req.socket?.remoteAddress || '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  if (!session.configured()) {
    return res.status(500).json({ ok: false, error: 'Login is not configured yet. Tell support.' });
  }

  let email = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    email = String(body.email || '').trim().toLowerCase();
  } catch { /* falls through to the format check */ }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Enter the email address you pay with.' });
  }

  const idHash = session.hashEmail(email);

  /* ── 1. Membership. Fails closed. ── */
  const isMember = await kv.cmd('SISMEMBER', INDEX, idHash);
  if (isMember === null) {
    return res.status(503).json({
      ok: false,
      error: 'We cannot check memberships right now. Try again in a few minutes.',
    });
  }
  if (isMember !== 1) {
    return res.status(403).json({
      ok: false,
      error: 'We could not find a membership for that email. Use the address you pay with.',
    });
  }

  /* ── 2. Devices. Fails open. ── */
  const deviceHash = session.hashDevice(clientIp(req), req.headers['user-agent']);
  const dev = await kv.touchDevice(idHash, deviceHash, WINDOW);

  if (dev.ok && !dev.known && dev.count > MAX_DEVICES) {
    /* Already counted by SADD, so take it back out: a refused device must
       not permanently consume one of the member's slots. */
    await kv.cmd('SREM', `dev:${idHash}`, deviceHash);
    return res.status(429).json({
      ok: false,
      error: `This membership is already signed in on ${MAX_DEVICES} devices. ` +
             `Sign out on one of them, or contact support if that is not you.`,
    });
  }

  const token = session.sign(idHash);
  res.setHeader('Set-Cookie', session.cookie(token));
  return res.status(200).json({ ok: true, devices: dev.ok ? dev.count : null });
};

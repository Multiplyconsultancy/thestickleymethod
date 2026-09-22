/* ══════════════════════════════════════════════════════════════════════
   SESSION TOKENS.

   A signed cookie, not an account system. Format:

       base64url(payload) "." base64url(HMAC-SHA256(payload))

   The payload carries a HASH of the email and an expiry, never the
   address itself: a cookie ends up in logs, analytics and screenshots,
   and a hash there costs nothing.

   Signed here in the Node runtime and verified in middleware.js on the
   Edge runtime, which has no `crypto.createHmac`. Both sides do
   HMAC-SHA256 over the same bytes, so the two implementations agree;
   if you change the payload shape, change it in both.

   WHAT THIS IS NOT. Email alone is the credential, which is weak, and it
   is weak deliberately: the rest of the member area already works this
   way (see member/audit.html), the content behind it is a course rather
   than a bank, and a password nobody can reset generates more lost
   members than it ever stops. The device cap in api/auth/login.js is
   what actually limits sharing.

   Set SESSION_SECRET in Vercel. Without it nothing signs and login is
   refused outright, which is the correct failure: a token signed with an
   empty key is a token anybody can mint.
══════════════════════════════════════════════════════════════════════ */

const crypto = require('crypto');

const DAYS = 30;
const COOKIE = 'sms_session';

function secret() { return process.env.SESSION_SECRET || ''; }
function configured() { return secret().length >= 16; }

/* ── Why the email hash has its OWN salt ──────────────────────────────
   Two Vercel projects share one Redis. The marketing project's cron
   WRITES the membership index; the app project READS it. Both therefore
   have to hash an address to exactly the same value.

   If that hash used SESSION_SECRET, the marketing side would need the
   app's cookie-signing key just to build an index — and any difference
   between the two would not error, it would simply mean no member ever
   matches and every login fails with "we could not find a membership".

   So the shared hash takes INDEX_SALT, held identically by both
   projects, and SESSION_SECRET stays with the app alone. No fallback
   between them on purpose: a silent mismatch is far worse than a loud
   "not configured".
   ────────────────────────────────────────────────────────────────── */
function indexSalt() { return process.env.INDEX_SALT || ''; }
function indexConfigured() { return indexSalt().length >= 16; }

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Stable, non-reversible id for an email. Also the device-set key. */
function hashEmail(email) {
  if (!indexConfigured()) throw new Error('INDEX_SALT is not set');
  return crypto.createHash('sha256')
    .update(String(email || '').trim().toLowerCase() + '|' + indexSalt())
    .digest('hex').slice(0, 32);
}

/* ── Device identity ──────────────────────────────────────────────
   THIS USED TO BE A HASH OF IP PLUS USER AGENT, AND THAT WAS WRONG.
   A phone on mobile data takes a new IP every time it hands between
   cell towers or joins wifi, so the same handset read as a new device
   over and over. A cap of three would have started refusing paying
   members within days of launch.

   Identity is now a random id in its own long-lived cookie: one value
   per browser, stable across networks. The IP is still hashed and kept
   against the device row, but only as an abuse signal — never as the
   thing that decides who you are.

   Clearing cookies mints a new device, which is correct (it genuinely
   is a fresh browser) and is why an admin needs to be able to clear
   somebody's device set.
   ────────────────────────────────────────────────────────────────── */
const DEVICE_COOKIE = 'sms_device';

function newDeviceId() { return crypto.randomBytes(16).toString('hex'); }

/** Reads the device id out of a Cookie header, or null. */
function deviceFrom(cookieHeader) {
  const m = String(cookieHeader || '').match(/(?:^|;\s*)sms_device=([A-Fa-f0-9]{32})(?:;|$)/);
  return m ? m[1] : null;
}

function deviceCookie(id) {
  return `${DEVICE_COOKIE}=${id}; Path=/; Max-Age=${365 * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

/** An IP is personal data, so it is never stored raw. Signal only. */
function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || '') + '|' + secret()).digest('hex').slice(0, 24);
}

function sign(emailHash, days) {
  const payload = JSON.stringify({
    e: emailHash,
    x: Date.now() + (days || DAYS) * 86400000,
  });
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest();
  return b64url(payload) + '.' + b64url(sig);
}

function cookie(token, days) {
  const age = (days || DAYS) * 86400;
  return `${COOKIE}=${token}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
}
function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

module.exports = {
  COOKIE, DEVICE_COOKIE, DAYS, configured, indexConfigured, hashEmail, hashIp,
  newDeviceId, deviceFrom, deviceCookie, sign, cookie, clearCookie,
};

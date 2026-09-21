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

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Stable, non-reversible id for an email. Also the device-set key. */
function hashEmail(email) {
  return crypto.createHash('sha256')
    .update(String(email || '').trim().toLowerCase() + '|' + secret())
    .digest('hex').slice(0, 32);
}

/** An IP is personal data, so it is never stored raw either. */
function hashDevice(ip, ua) {
  return crypto.createHash('sha256')
    .update(String(ip || '') + '|' + String(ua || '').slice(0, 120) + '|' + secret())
    .digest('hex').slice(0, 24);
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

module.exports = { COOKIE, DAYS, configured, hashEmail, hashDevice, sign, cookie, clearCookie };

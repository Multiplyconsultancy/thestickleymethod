/* ══════════════════════════════════════════════════════════════════════
   THE MEMBER GATE (Vercel Edge Middleware, app project).

   This project serves the member platform at a domain root, so the rule
   is the inverse of the marketing site's: everything is private except
   the login page and the few files that page needs to render itself.

   app/api/auth/login.js signs the session with crypto.createHmac in the
   Node runtime. The Edge runtime has no such thing, so the same
   HMAC-SHA256 is verified here through Web Crypto. Both sides sign the
   identical payload bytes. If the payload shape changes in
   lib/session.js it has to change here too.

   This proves only that the cookie was minted by us and has not
   expired. It deliberately does NOT re-check membership on every page
   load — that would put a lookup in front of every navigation.
   Membership is checked at login, and a thirty-day cookie means a
   cancelled member falls out within a billing cycle.

   WITH NO SESSION_SECRET SET IT SERVES THE PAGE. Nothing can have been
   signed without one, so enforcing the gate would lock out every member
   including the ones who paid. The absence shows up in the login flow
   instead, which says so plainly.
══════════════════════════════════════════════════════════════════════ */

export const config = {
  matcher: ['/((?!_next|_vercel|favicon|apple-touch-icon|.*\\.).*)'],
};

const SESSION_COOKIE = 'sms_session';

/* Reachable signed out: the login page itself, and anything the login
   page loads to look like something. */
function isPublic(p) {
  return p === '/login' || p === '/robots.txt' || p.startsWith('/api/auth/');
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function validSession(token, secret) {
  if (!token || !secret) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return false;

  let payloadBytes, sigBytes;
  try {
    payloadBytes = b64urlToBytes(token.slice(0, dot));
    sigBytes = b64urlToBytes(token.slice(dot + 1));
  } catch { return false; }

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );
  if (!(await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes))) return false;

  try {
    const claims = JSON.parse(new TextDecoder().decode(payloadBytes));
    return typeof claims.x === 'number' && claims.x > Date.now();
  } catch { return false; }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (isPublic(url.pathname)) return;

  const secret = process.env.SESSION_SECRET || '';
  if (!secret) return;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await validSession(token, secret)) return;

  const to = new URL(url);
  to.pathname = '/login';
  to.search = url.pathname === '/' ? '' : '?next=' + encodeURIComponent(url.pathname + url.search);
  return Response.redirect(to, 302);
}

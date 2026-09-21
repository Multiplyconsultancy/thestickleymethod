/* ══════════════════════════════════════════════════════════════════════
   GEO GATE for the Base44 funnel (Vercel Edge Middleware).

   The partnership only pays on activations from the countries below, so
   visitors anywhere else are redirected to an unavailable page
   before the funnel ever renders. Runs at the edge: no flash of the
   wrong page, works with JavaScript off.

   Rules:
   - Unknown country (no header) FAILS OPEN to the funnel. Blocking an
     eligible buyer is worse than letting an occasional unknown through;
     /api/lead tags ineligible submissions as the second net.
   - ?geo=XX overrides the detected country, for testing both paths.
   - Keep the list in sync with ELIGIBLE in api/lead.js by hand; there is
     no bundler in this project to share the constant.
══════════════════════════════════════════════════════════════════════ */

const ELIGIBLE = new Set([
  // The 47 countries the partnership pays commission on, by region.
  // Source: Base44 country list, updated 2026-08-27. An earlier version
  // carried only 19 and was blocking eligible traffic from the Gulf,
  // East Asia, and most of central and southern Europe.
  'US', 'CA', 'AU', 'NZ', 'GB', 'AT', 'BE', 'FR', 'DE',
  'IE', 'LU', 'NL', 'CH', 'DK', 'FI', 'IS', 'NO', 'SE',
  'IT', 'ES', 'PT', 'GR', 'MT', 'CY', 'PL', 'CZ', 'SI',
  'EE', 'LT', 'LV', 'SK', 'HR', 'HU', 'RO', 'JP', 'KR',
  'SG', 'TW', 'HK', 'MO', 'AE', 'QA', 'IL', 'KW', 'SA',
  'OM', 'BH',
]);

export const config = {
  matcher: [
    '/free-course', '/free-course/members', '/member/free-course',
    '/testautomationbase44funnel/yearly', '/testautomationbase44funnel/yearly-steps', '/geo-debug',
    /* The member area. Everything under it is gated except the login
       page itself and the assets that page needs to render. */
    '/member/start', '/member/start/:path*',
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   SESSION VERIFICATION, EDGE SIDE.

   api/auth/login.js signs with crypto.createHmac in the Node runtime.
   The Edge runtime has no such thing, so the same HMAC-SHA256 is done
   through Web Crypto here. Both sides sign the identical payload bytes,
   so the signatures agree. If the payload shape changes in
   lib/session.js it has to change here too.

   This only proves the cookie was minted by us and has not expired. It
   deliberately does NOT re-check the membership on every page load:
   that would put a Whop lookup in front of every navigation. Membership
   is checked at login, and the cookie is short enough (30 days) that a
   cancelled member falls out within a billing cycle.
══════════════════════════════════════════════════════════════════════ */

const SESSION_COOKIE = 'sms_session';

/* Paths under /member/start that must stay reachable signed out, or the
   login page cannot load the stylesheet it needs to look like anything. */
function isPublicMemberPath(p) {
  return p === '/member/start/login' ||
         p.endsWith('.css') || p.endsWith('.js') ||
         p.endsWith('.png') || p.endsWith('.ico') || p.endsWith('.svg');
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

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let payloadBytes, sigBytes;
  try {
    payloadBytes = b64urlToBytes(payloadB64);
    sigBytes = b64urlToBytes(sigB64);
  } catch { return false; }

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, payloadBytes);
  if (!ok) return false;

  try {
    const claims = JSON.parse(new TextDecoder().decode(payloadBytes));
    return typeof claims.x === 'number' && claims.x > Date.now();
  } catch { return false; }
}

export default async function middleware(request) {
  const url = new URL(request.url);

  /* ── The member area gate. Runs before the geo rules, which do not
     apply to it. ── */
  if (url.pathname === '/member/start' || url.pathname.startsWith('/member/start/')) {
    if (isPublicMemberPath(url.pathname)) return;

    const secret = process.env.SESSION_SECRET || '';
    /* No secret configured means nothing can have been signed, so the
       gate would lock out every member including the ones who paid.
       Serve the page and let the absence show up in the login flow
       instead of behind a wall nobody can get past. */
    if (!secret) return;

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (await validSession(token, secret)) return;

    const to = new URL(url);
    to.pathname = '/member/start/login';
    to.search = url.pathname === '/member/start'
      ? ''
      : '?next=' + encodeURIComponent(url.pathname + url.search);
    return Response.redirect(to, 302);
  }

  /* Diagnostic: what does the EDGE actually see? The ?geo= override bypasses
     the header, so testing with it proves nothing about real traffic. */
  if (url.pathname === '/geo-debug') {
    const seen = {};
    for (const [k, v] of request.headers.entries()) {
      if (k.startsWith('x-vercel-ip') || k === 'x-forwarded-for') seen[k] = v;
    }
    return new Response(JSON.stringify({
      country_header: request.headers.get('x-vercel-ip-country'),
      geo_object: request.geo || null,
      all_ip_headers: seen,
    }, null, 2), { headers: { 'content-type': 'application/json' } });
  }

  const country =
    url.searchParams.get('geo') ||
    request.headers.get('x-vercel-ip-country') ||
    '';

  if (!country || ELIGIBLE.has(country.toUpperCase())) {
    return; // eligible or unknown: serve the funnel
  }
  /* The member funnel gets its own ineligible page. The public one signs off
     by offering them The Stickley Method, which everybody landing here from
     /member already pays for. */
  url.pathname = url.pathname.startsWith('/member/')
    ? '/member/free-course-unavailable'
    : '/free-course-unavailable';
  url.search = '';
  return Response.redirect(url, 302);
}

/* ══════════════════════════════════════════════════════════════════════
   GEO GATE for the Base44 funnel (Vercel Edge Middleware).

   The partnership only pays on activations from the countries below, so
   visitors anywhere else are redirected to /free-course-unavailable
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
  matcher: ['/free-course', '/free-course/members', '/geo-debug'],
};

export default function middleware(request) {
  const url = new URL(request.url);

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
  url.pathname = '/free-course-unavailable';
  url.search = '';
  return Response.redirect(url, 302);
}

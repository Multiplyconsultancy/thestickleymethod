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
  'US', 'GB', 'AU', 'CA', 'NZ',                    // Tier 1 English-speaking
  'AT', 'BE', 'DK', 'FR', 'DE', 'IE', 'IT', 'LU',  // Western & Northern Europe
  'NL', 'NO', 'PL', 'ES', 'SE', 'CH',
]);

export const config = {
  matcher: ['/free-course', '/free-course/members'],
};

export default function middleware(request) {
  const url = new URL(request.url);
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

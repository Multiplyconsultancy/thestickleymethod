/* Re-sends any opt-in the partner's webhook missed. api/lead.js tags a
   contact pipedream-failed when the inline retries run out; this sweeps
   that tag every 15 minutes and untags on success, so the tag IS the
   queue, same pattern as the purchase-email crons. */

const PIPEDREAM_URL = 'https://eov48y0mjcaeeco.m.pipedream.net';
const GHL = 'https://services.leadconnectorhq.com';

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  };
}

function authorised(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((req.headers.authorization || '') === `Bearer ${secret}`) return true;
  return new URL(req.url, 'http://x').searchParams.get('secret') === secret;
}

module.exports = async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' });

  const search = await fetch(`${GHL}/contacts/search`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      pageLimit: 50,
      filters: [{ field: 'tags', operator: 'eq', value: 'pipedream-failed' }],
    }),
  });
  const body = await search.json().catch(() => ({}));
  const contacts = body.contacts || [];

  let sent = 0, failed = 0;
  for (const c of contacts) {
    const payload = {
      name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.contactName || '',
      email: c.email || '',
      phone: c.phone || '',
    };
    if (!payload.email) { failed++; continue; }
    let ok = false;
    try {
      const r = await fetch(PIPEDREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      ok = r.ok;
    } catch (e) { /* stays queued */ }
    if (ok) {
      sent++;
      try {
        await fetch(`${GHL}/contacts/${c.id}/tags`, {
          method: 'DELETE',
          headers: ghlHeaders(),
          body: JSON.stringify({ tags: ['pipedream-failed'] }),
        });
      } catch (e) { console.error('[lead-retry] untag failed:', c.id, e.message); }
    } else failed++;
  }
  console.log(`[lead-retry] queued=${contacts.length} sent=${sent} still-failed=${failed}`);
  return res.status(200).json({ queued: contacts.length, sent, failed });
};

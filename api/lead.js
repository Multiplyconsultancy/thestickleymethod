/* ══════════════════════════════════════════════════════════════════════
   FUNNEL OPT-IN RELAY

   The form posts here, same-origin. This endpoint then:
     1. upserts the lead into OUR GoHighLevel (the master record),
     2. forwards {name,email,phone} to the partner's Pipedream webhook,
        retrying a few times inline,
     3. if the forward still fails, tags the contact pipedream-failed so
        the 15-minute cron can re-send it. A lead can arrive late at the
        partner's side; it cannot be lost.

   The Pipedream URL lives HERE, server-side, on purpose: in the page
   source anyone could spam the partner's dialer with junk under our name.

   CommonJS on purpose: this project has no package.json, so ESM breaks.
══════════════════════════════════════════════════════════════════════ */

const PIPEDREAM_URL = 'https://eov48y0mjcaeeco.m.pipedream.net';
const GHL = 'https://services.leadconnectorhq.com';

/* Cloudflare fronts LeadConnector and 403s (error 1010) anything that
   does not look like a browser. Learned the hard way in lib/ghl.js. */
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

/* Best-effort E.164. UK 07… and bare US 10-digit numbers are the two
   shapes this audience actually types; anything else passes through as
   given rather than being mangled by a wrong guess. */
function normalisePhone(raw) {
  let p = String(raw || '').replace(/[\s().-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (!p.startsWith('+')) {
    if (/^07\d{9}$/.test(p)) p = '+44' + p.slice(1);
    else if (/^\d{10}$/.test(p)) p = '+1' + p;
    else if (/^1\d{10}$/.test(p)) p = '+' + p;
  }
  return p;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function forwardToPipedream(payload) {
  for (const wait of [0, 700, 2000]) {
    if (wait) await sleep(wait);
    try {
      const res = await fetch(PIPEDREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
    } catch (e) { /* retry */ }
  }
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const body = req.body || {};
  if (body.company) return res.status(200).json({ ok: true }); // honeypot: swallow bots silently

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const phone = normalisePhone(body.phone);
  const source = body.source === 'members' ? 'members' : 'main';

  if (name.length < 2) return res.status(400).json({ ok: false, error: 'name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ ok: false, error: 'email' });
  if (!/^\+?\d{7,15}$/.test(phone)) return res.status(400).json({ ok: false, error: 'phone' });

  const [firstName, ...rest] = name.split(/\s+/);
  const payload = { name, email, phone };

  // 1 · master record in our GHL
  let contactId = null;
  try {
    const r = await fetch(`${GHL}/contacts/upsert`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        email, phone, firstName, lastName: rest.join(' '),
        tags: ['base44-optin', `base44-optin-${source}`],
      }),
    });
    const j = await r.json().catch(() => ({}));
    contactId = j.contact && j.contact.id;
  } catch (e) {
    console.error('[lead] GHL upsert failed:', e.message);
  }

  // 2 · the partner's copy
  const delivered = await forwardToPipedream(payload);

  // 3 · failed forward: tag it so the cron re-sends until it lands
  if (!delivered && contactId) {
    try {
      await fetch(`${GHL}/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: ghlHeaders(),
        body: JSON.stringify({ tags: ['pipedream-failed'] }),
      });
    } catch (e) { console.error('[lead] failed-tag failed:', e.message); }
  }

  if (!contactId && !delivered) return res.status(502).json({ ok: false, error: 'try_again' });

  const out = { ok: true };
  if (String(req.query && req.query.debug) === '1') { out.ghl = !!contactId; out.pipedream = delivered; }
  return res.status(200).json(out);
};

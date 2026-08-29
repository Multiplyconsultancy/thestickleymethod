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
  /* Honeypot: a filled hidden field USED to silently drop the submission.
     Chrome autofill fills fields named company, which ate at least one real
     lead. Now: process it anyway, tag it hp-flagged for review. */
  const hpFlagged = !!(body.company || body._gotcha);

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const phone = normalisePhone(body.phone);
  const source = body.source === 'members' ? 'members' : 'main';

  /* Country net behind the edge gate: tag ineligible submissions so a
     setter never dials a lead the partnership will not pay on. Keep the
     list in sync with middleware.js by hand. */
  const ELIGIBLE = new Set([
    'US', 'CA', 'AU', 'NZ', 'GB', 'AT', 'BE', 'FR', 'DE',
    'IE', 'LU', 'NL', 'CH', 'DK', 'FI', 'IS', 'NO', 'SE',
    'IT', 'ES', 'PT', 'GR', 'MT', 'CY', 'PL', 'CZ', 'SI',
    'EE', 'LT', 'LV', 'SK', 'HR', 'HU', 'RO', 'JP', 'KR',
    'SG', 'TW', 'HK', 'MO', 'AE', 'QA', 'IL', 'KW', 'SA',
    'OM', 'BH',
  ]);

  /* PHONE-NUMBER GATE, AS AN ALLOWLIST.

     The edge gate reads IP country, which a VPN defeats: we had an opt-in
     with a +91 number whose IP resolved to an eligible country. A dialling
     code is much harder to fake than an exit node.

     This allows only the codes belonging to the countries the partnership
     actually pays commission on, and blocks everything else. An allowlist
     rather than a blocklist because the eligible set is short, known and
     already defined above, whereas the set of everything else is not.

     Caveat worth knowing: +1 covers the US and Canada but also the Caribbean,
     so a Jamaican or Dominican number passes this check. The IP gate is the
     backstop for those. */
  const ELIGIBLE_DIAL_CODES = [
    '+1', '+30', '+31', '+32', '+33', '+34', '+351', '+352', '+353',
    '+354', '+356', '+357', '+358', '+36', '+370', '+371', '+372', '+385',
    '+386', '+39', '+40', '+41', '+420', '+421', '+43', '+44', '+45',
    '+46', '+47', '+48', '+49', '+61', '+64', '+65', '+81', '+82',
    '+852', '+853', '+886', '+965', '+966', '+968', '+971', '+972', '+973',
    '+974',
  ];
  const e164 = String(phone || '').replace(/[^\d+]/g, '');
  /* Longest match first so +353 is not shadowed by +3, and an unparseable
     number is treated as blocked rather than waved through. */
  const blockedPhone = !ELIGIBLE_DIAL_CODES
    .slice()
    .sort((a, b) => b.length - a.length)
    .some((c) => e164.startsWith(c));
  const leadCountry = String(
    (String(req.query && req.query.debug) === '1' && body.geo_test) ||
    req.headers['x-vercel-ip-country'] || ''
  ).toUpperCase();
  const ineligible = !!leadCountry && !ELIGIBLE.has(leadCountry);

  if (name.length < 2) return res.status(400).json({ ok: false, error: 'name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ ok: false, error: 'email' });
  if (!/^\+?\d{7,15}$/.test(phone)) return res.status(400).json({ ok: false, error: 'phone' });

  const [firstName, ...rest] = name.split(/\s+/);
  const payload = { name, email, phone };

  // 1 · master record in our GHL. Upsert reports whether the contact is
  //     brand new, which drives the pipeline step below.
  let contactId = null, isNew = false;
  try {
    const r = await fetch(`${GHL}/contacts/upsert`, {
      method: 'POST',
      headers: ghlHeaders(),
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        email, phone, firstName, lastName: rest.join(' '),
        // `base44-opted-in` is the tag lib/placement.js reads to move a card
        // off Eligible. Writing only `base44-optin` meant reconcile never saw a
        // single opt-in and re-filed everyone under Eligible every five minutes.
        tags: ['base44-opted-in', ...(hpFlagged ? ['hp-flagged'] : [])],
      }),
    });
    const j = await r.json().catch(() => ({}));
    contactId = j.contact && j.contact.id;
    isNew = j.new === true;
  } catch (e) {
    console.error('[lead] GHL upsert failed:', e.message);
  }

  // 2 · the partner's copy
  /* Blocked numbers are recorded but never handed to the partner's dialer. */
  const delivered = blockedPhone ? true : await forwardToPipedream(payload);
  if (blockedPhone) console.log('[lead] blocked dial code, not forwarded:', email);

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


  /* Pipelines, by who this person is:
       brand new to GHL          -> Base44 - New Opt-ins        · Opt-in
       existing, active member   -> Base44 · Active TSM members · Opted in
       existing, churned member  -> Base44 · Churned TSM members· Opted in
       existing, everything else -> Base44 · Everyone else      · Opted in
     If the contact already has a card in the target pipeline it is MOVED
     to the opted-in stage rather than duplicated. */
  const PIPES = {
    new:     { pipe: 'GWRhHdTEnf88NBHhoHPY', stage: '736b5144-5bad-4501-a10f-1797fb39466a' },
    active:  { pipe: 'kYLXJWj7MEnJQdkpEt5d', stage: '1f1a8573-65cf-47a9-b6f6-5e866573e4d3' },
    churned: { pipe: 'wemXCOsoR33ugCTseEMo', stage: '15df4c11-702a-49d7-946c-f579a3443831' },
    other:   { pipe: 'iTbJ6rELAnLBgHcNRGbh', stage: '6345aed6-80b6-4676-a55b-cb5c489b2795' },
  };

  async function routeToPipeline(target, contactTags) {
    const t = PIPES[target];
    try {
      const q = await fetch(
        `${GHL}/opportunities/search?location_id=${process.env.GHL_LOCATION_ID}&contact_id=${contactId}`,
        { headers: ghlHeaders() }
      );
      const found = ((await q.json().catch(() => ({}))).opportunities || [])
        .find((o) => o.pipelineId === t.pipe);
      if (found) {
        await fetch(`${GHL}/opportunities/${found.id}`, {
          method: 'PUT',
          headers: ghlHeaders(),
          body: JSON.stringify({ pipelineId: t.pipe, pipelineStageId: t.stage, status: 'open' }),
        });
      } else {
        await fetch(`${GHL}/opportunities/`, {
          method: 'POST',
          headers: ghlHeaders(),
          body: JSON.stringify({
            locationId: process.env.GHL_LOCATION_ID,
            pipelineId: t.pipe, pipelineStageId: t.stage,
            contactId, name: `${name} — Base44 opt-in`, status: 'open',
          }),
        });
      }
    } catch (e) { console.error('[lead] pipeline route failed:', target, e.message); }
  }

  // 1b · brand new: tag and file under New Opt-ins.
  if (contactId) {
    if (isNew) {
      /* No base44-new-lead tag: it was written and never read. Whether the
         contact was new is already implied by the pipeline they land in. */
      await routeToPipeline('new');
    } else {
      /* segment by the contact's existing tags. Tag spellings are as they
         exist in GHL, including the historical typo variant. */
      let tags = [];
      try {
        const c = await fetch(`${GHL}/contacts/${contactId}`, { headers: ghlHeaders() });
        tags = (((await c.json().catch(() => ({}))).contact || {}).tags || []).map((t) => String(t).toLowerCase());
      } catch (e) { console.error('[lead] tag fetch failed:', e.message); }
      /* The tag GHL actually carries is `customer-churned` (plus churn-N-Nd
         buckets). An earlier version looked for a "stickley method - cancelled"
         tag that does not exist, so every churned member was filed under
         Everyone else. `customer-active` wins if both are present: someone
         mid-cancellation still has access. */
      const active = tags.includes('customer-active');
      const churned = !active && (
        tags.includes('customer-churned')
        || tags.some((t) => t.startsWith('churn-') || t.includes('cancel')));
      await routeToPipeline(active ? 'active' : churned ? 'churned' : 'other');
    }
  }

  if (!contactId && !delivered) return res.status(502).json({ ok: false, error: 'try_again' });

  const out = { ok: true };
  if (String(req.query && req.query.debug) === '1') { out.ghl = !!contactId; out.new = isNew; out.pipedream = delivered; out.country = leadCountry; out.ineligible = ineligible; out.blockedPhone = blockedPhone; }
  return res.status(200).json(out);
};

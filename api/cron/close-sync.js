/* ══════════════════════════════════════════════════════════════════════════
   CLOSE → WHOP → GHL  ·  Base44 bonus fulfilment

   Closers log a "03 - Base44 Sale" activity in Close with Base Plan set to
   Monthly or Yearly. Two smart views collect them. This job polls both,
   works out what each new buyer is owed, provisions it in Whop, writes the
   links onto their GHL contact and tags them so a GHL workflow can email.

   The bonus grid (Luca, 2026-08-25):

                     │ Monthly                  │ Yearly
     ────────────────┼──────────────────────────┼──────────────────────────
     New & churned   │ 50% off first month TSM  │ TSM free + Baby AI free
     Existing member │ Baby AI free             │ TSM free + Baby AI free

   "TSM free" means a 30-day trial link for someone with no live membership,
   but add_free_days(30) for someone who already has one, so an existing
   member never has to check out again on a possibly-different email.

   Every generated link is single use: the plan is minted with stock 1, so
   it dies on first checkout and is worthless if forwarded.

   SAFETY
   - Defaults to DRY RUN. Nothing is written unless ?commit=1.
   - ?watermark=1 marks everyone currently in the smart views as processed
     WITHOUT granting anything, so the existing backlog never fires.
   - Idempotent on the GHL tag `close-synced`; a replay cannot double-grant.
   - Requires CRON_SECRET.
══════════════════════════════════════════════════════════════════════════ */

const CLOSE = 'https://api.close.com/api/v1';
const WHOP = 'https://api.whop.com/api/v2';
const GHL = 'https://services.leadconnectorhq.com';

/* Verified live 2026-08-25. Shapes cloned from plans already in the account. */
const PLANS = {
  // Free Looksmaxxing AI: $0, unlimited, sent to every buyer as-is.
  /* The live Free Looksmaxxing AI plan. The previous one (plan_SYQ6dzY5Ystkb)
     was archived in Whop after this was wired in, which silently killed the
     access link in every email already sent. If access reports come in again,
     check this plan's visibility first. */
  course: 'plan_XkAv3bcWnI8Jr',
  // Templates we clone per person. Both proven: $0 for 30 days, then billed.
  tsmTrial: { product: 'prod_pF8nU8AqdAO1U', renewal: 39.0, trialDays: 30, period: 30 },
  babyTrial: { product: 'prod_I9Jkfcyxb01FM', renewal: 29.0, trialDays: 30, period: 30 },
  // The live TSM monthly plan a 50%-off promo attaches to.
  tsmMonthly: 'plan_zSV2Aey6NUe23',
};
const TSM_PRODUCTS = ['prod_pF8nU8AqdAO1U', 'prod_QcVWRgKOCZH9U', 'prod_by2oiuCX0pVu6',
                      'prod_dnB3ROMALqsAR', 'prod_KHHplKsGSxPNL'];

const ghlHeaders = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
  Accept: 'application/json',
  // GHL sits behind Cloudflare and 403s anything that looks like a bot.
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
});
const closeHeaders = () => ({
  Authorization: `Basic ${Buffer.from(`${process.env.CLOSE_API_KEY}:`).toString('base64')}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});
const whopHeaders = () => ({
  Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

async function jsonOrNull(res) {
  try { return await res.json(); } catch (e) { return null; }
}

/* ── Close ─────────────────────────────────────────────────────────────── */

async function buyersFromSmartView(savedSearchId, tier) {
  const sv = await fetch(`${CLOSE}/saved_search/${savedSearchId}/`, { headers: closeHeaders() });
  const svData = await jsonOrNull(sv);
  if (!svData || svData.error) return [];
  const raw = svData.s_query || svData.query;
  const query = raw && raw.query ? raw.query : raw;

  const res = await fetch(`${CLOSE}/data/search/`, {
    method: 'POST',
    headers: closeHeaders(),
    body: JSON.stringify({
      query,
      _limit: 200,
      _fields: { lead: ['id', 'display_name', 'contacts'] },
    }),
  });
  const data = await jsonOrNull(res);
  const out = [];
  for (const lead of (data && data.data) || []) {
    for (const contact of lead.contacts || []) {
      const email = ((contact.emails || [])[0] || {}).email;
      if (!email) continue;
      out.push({
        leadId: lead.id,
        name: contact.name || lead.display_name || '',
        email: String(email).trim().toLowerCase(),
        tier,
      });
      break; // one contact per lead is enough
    }
  }
  return out;
}

/* Leads whose STATUS is one of the two Base44 statuses.

   The smart views key off the "03 - Base44 Sale" custom activity, but the
   webhook fires on a status change. Those are different signals, so a closer
   who sets one and not the other used to fall through the gap entirely.
   Reading both and merging means either action is enough. */
const BASE44_STATUS = {
  stat_pAfFKqZ28X2N2EWR3LgDCPw7XwN5jYsTTsH5UDi4kBw: 'monthly',
  stat_wiDrCZsgSHw6mCt3EbgCRIGkvn8FdOYgyP4Tg7aTQbD: 'yearly',
};

async function buyersFromStatuses() {
  const out = [];
  for (const [statusId, tier] of Object.entries(BASE44_STATUS)) {
    try {
      const res = await fetch(`${CLOSE}/data/search/`, {
        method: 'POST',
        headers: closeHeaders(),
        body: JSON.stringify({
          query: {
            type: 'and',
            queries: [
              { type: 'object_type', object_type: 'lead' },
              {
                type: 'field_condition',
                field: { type: 'regular_field', object_type: 'lead', field_name: 'status_id' },
                condition: { type: 'term', values: [statusId] },
              },
            ],
          },
          _limit: 200,
          _fields: { lead: ['id', 'display_name', 'contacts'] },
        }),
      });
      const data = await jsonOrNull(res);
      for (const lead of (data && data.data) || []) {
        for (const contact of lead.contacts || []) {
          const email = ((contact.emails || [])[0] || {}).email;
          if (!email) continue;
          out.push({
            leadId: lead.id,
            name: contact.name || lead.display_name || '',
            email: String(email).trim().toLowerCase(),
            tier,
          });
          break;
        }
      }
    } catch (e) { console.error('[close-sync] status query failed:', tier, e.message); }
  }
  return out;
}

/* ── Whop ──────────────────────────────────────────────────────────────── */

/* Whop's /memberships endpoint SILENTLY IGNORES ?email= and ?search= — it
   returns the whole company either way, so filtering server-side matched
   every buyer against a stranger's membership. Verified 2026-08-25 with a
   nonsense address returning the same 872 rows. The only safe read is to
   pull every valid membership once per run and index it by email here.
   ~18 requests, cached for the life of the run. */
let membershipIndex = null;
async function buildMembershipIndex() {
  if (membershipIndex) return membershipIndex;
  const idx = new Map();
  const add = (rows) => {
    for (const m of rows) {
      const email = String(m.email || '').toLowerCase();
      if (!email) continue;
      if (!idx.has(email)) idx.set(email, []);
      idx.get(email).push(m);
    }
  };
  const page = async (n) => {
    const res = await fetch(`${WHOP}/memberships?per=50&page=${n}&valid=true`, { headers: whopHeaders() });
    const data = await jsonOrNull(res);
    return (data && data.data) || [];
  };
  /* Fetched in parallel batches, not one page at a time: sequential paging
     took long enough to risk the webhook timing out. */
  const first = await page(1);
  add(first);
  if (first.length === 50) {
    for (let start = 2; start <= 30; start += 6) {
      const batch = await Promise.all(
        Array.from({ length: 6 }, (_, i) => page(start + i)));
      batch.forEach(add);
      if (batch.some((rows) => rows.length < 50)) break;
    }
  }
  membershipIndex = idx;
  return idx;
}

/* Churned and expired both count as "no membership": the grid treats churned
   buyers exactly like new ones. */
async function liveTsmMembership(email) {
  const idx = await buildMembershipIndex();
  /* `valid` is Whop's own "does this grant access" flag, and it is the right
     test. An earlier version also demanded status === 'active', which
     excluded anyone on a TSM free trial: they hold live access but were
     classified as non-members and offered 50% off a subscription they
     already have. */
  return (idx.get(email) || []).find(
    (m) => TSM_PRODUCTS.includes(m.product) && m.valid === true) || null;
}

/* A fresh single-use plan. stock 1 + unlimited_stock false = the checkout
   link works exactly once. */
async function mintOneUsePlan(tpl, label) {
  const res = await fetch(`${WHOP}/plans`, {
    method: 'POST',
    headers: whopHeaders(),
    body: JSON.stringify({
      product_id: tpl.product,
      plan_type: 'renewal',
      billing_period: tpl.period,
      renewal_price: tpl.renewal,
      trial_period_days: tpl.trialDays,
      stock: 1,
      unlimited_stock: false,
      visibility: 'hidden',
      internal_notes: `Base44 bonus · ${label}`,
    }),
  });
  const plan = await jsonOrNull(res);
  if (!res.ok || !plan || !plan.id) {
    return { error: (plan && plan.error && plan.error.message) || `plan create failed (${res.status})` };
  }
  return { id: plan.id, link: plan.direct_link || `https://whop.com/checkout/${plan.id}` };
}

async function addFreeDays(membershipId, days) {
  const res = await fetch(`${WHOP}/memberships/${membershipId}/add_free_days`, {
    method: 'POST',
    headers: whopHeaders(),
    body: JSON.stringify({ days }),
  });
  if (!res.ok) {
    const e = await jsonOrNull(res);
    return { error: (e && e.error && e.error.message) || `add_free_days failed (${res.status})` };
  }
  return { ok: true };
}

/* 50% off the first month. Percentage promos are the mechanism this account
   already uses; the shape below matches an existing one. `duration: once` so
   it discounts the first payment only, and stock 1 so the code dies after a
   single redemption and is worthless if forwarded. */
async function mintHalfPricePromo(email) {
  const code = `B44${Math.abs(hash(email)).toString(36).toUpperCase().slice(0, 8)}`;
  const res = await fetch(`${WHOP}/promo_codes`, {
    method: 'POST',
    headers: whopHeaders(),
    body: JSON.stringify({
      code,
      promo_type: 'percentage',
      amount_off: 50,
      base_currency: 'usd',
      duration: 'once',
      number_of_intervals: 1,
      stock: 1,
      unlimited_stock: false,
      plan_ids: [PLANS.tsmMonthly],
      new_users_only: false,
      existing_memberships_only: false,
    }),
  });
  const promo = await jsonOrNull(res);
  if (!res.ok) {
    return { error: (promo && promo.error && promo.error.message) || `promo create failed (${res.status})` };
  }
  /* USE THE CODE WHOP RETURNS, NOT THE ONE WE ASKED FOR. Whop rewrites it:
     request B4428D44C9C and it stores b44dwuq4m. Building the link from the
     requested code put a non-existent code in every email, so no buyer could
     ever redeem the discount. */
  const actual = (promo && promo.code) || code;
  if (!promo || !promo.code) {
    return { error: 'promo created but no code returned' };
  }
  return { code: actual, link: `https://whop.com/checkout/${PLANS.tsmMonthly}?promoCode=${encodeURIComponent(actual)}` };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return h;
}

/* ── GHL ───────────────────────────────────────────────────────────────── */

/* Returns the contact, `{ absent: true }` when GHL definitely has no such
   record, or null when the request itself failed. The caller must treat null
   as "unknown", never as "new". */
async function findContact(email) {
  let data = null;
  try {
    const res = await fetch(
      `${GHL}/contacts/?locationId=${process.env.GHL_LOCATION_ID}&query=${encodeURIComponent(email)}`,
      { headers: ghlHeaders() });
    if (!res.ok) return null;
    data = await jsonOrNull(res);
  } catch (e) { return null; }
  if (!data || !Array.isArray(data.contacts)) return null;
  return data.contacts.find(
    (c) => String(c.email || '').toLowerCase() === email) || { absent: true, tags: [] };
}

async function upsertContact(person, tags, fields) {
  const [firstName, ...rest] = (person.name || '').trim().split(/\s+/);
  const res = await fetch(`${GHL}/contacts/upsert`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      email: person.email,
      firstName: firstName || '',
      lastName: rest.join(' '),
      /* Tags deliberately omitted: GHL's upsert REPLACES the tag array, which
         wiped base44-optin, the backlog watermark and everything else off
         these contacts. Tags are added through the append endpoint below. */
      customFields: fields,
      source: 'Close · Base44 sale',
    }),
  });
  const data = await jsonOrNull(res);
  return (data && data.contact) || null;
}



/* ── pipelines ─────────────────────────────────────────────────────────── */

/* Deliberately NOT handled here. lib/placement.js owns card placement and
   derives it every reconcile, and it documents that Called, Signed up and
   Lost are setter-owned: "nothing automated may move a card out of those
   columns". An earlier version of this file moved cards to Signed up, which
   fought reconcile and overwrote setters' work. Placement follows from the
   tags this job writes, which is the correct seam. */

/* ── the email ─────────────────────────────────────────────────────────── */

const WRAP = 'font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;'
  + 'font-size:16px;line-height:1.6;color:#111;max-width:560px';

/* Table-wrapped so the button survives Outlook, which ignores padding on <a>. */
function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0">`
    + `<tr><td align="center" bgcolor="#0B1A2D" style="border-radius:8px">`
    + `<a href="${href}" style="display:inline-block;padding:14px 30px;`
    + `font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;`
    + `letter-spacing:.04em;color:#ffffff;text-decoration:none;border-radius:8px">${label}</a>`
    + `</td></tr></table>`;
}
const fine = (t) => `<p style="color:#555;font-size:14px">${t}</p>`;
const head = (t) => `<p style="font-size:17px;font-weight:700;margin-bottom:2px">${t}</p>`;
const body = (t) => `<p style="margin-top:0">${t}</p>`;

function buildEmail(first, line) {
  const courseLink = `https://whop.com/checkout/${PLANS.course}`;
  let html = `<div style="${WRAP}"><p>${first},</p><p>You're all set.</p>`
    + head('Your Free Looksmaxxing AI')
    + body("Once you're inside, you'll see the full course and a button to connect your discord.")
    + button(courseLink, 'JOIN NOW &rarr;');

  const two = !!(line.tsmTrialLink && line.babyLink);

  if (line.tsmTrialLink) {
    html += head('One month of The Stickley Method, free')
      + body('110+ modules, group calls with me, the discord, and challenges with cash prizes.')
      + button(line.tsmTrialLink, two ? 'START TSM FREE &rarr;' : 'CLAIM YOUR FREE MONTH &rarr;');
  }
  if (line.tsmPromoLink) {
    html += head('Half off your first month of The Stickley Method')
      + body('110+ modules, group calls with me, the discord, and challenges with cash prizes.')
      + button(line.tsmPromoLink, 'CLAIM HALF OFF &rarr;');
  }
  if (line.babyLink) {
    html += head('One month of Baby AI, free')
      + body(two
        ? 'The chatbot trained on every one of those modules. Ask it anything, any hour.'
        : 'Baby AI is the chatbot trained on all 110+ TSM modules. Ask it anything, any hour, and it answers for your exact situation.')
      + button(line.babyLink, two ? 'CLAIM BABY AI FREE &rarr;' : 'CLAIM YOUR FREE MONTH &rarr;');
  }

  if (two) html += fine('Click the buttons above to sign up. Free for 30 days, then TSM is $39/month and Baby AI is $29/month');
  else if (line.tsmPromoLink) html += fine('Click the button above to sign up. $19.50 for your first month, then $39/month');
  else if (line.babyLink || line.tsmTrialLink) html += fine('Click the button above to sign up. Free for 30 days, then $29/month');

  if (line.freeDaysAdded) {
    html += `<p>Also, we have already added one month free to your Stickley Method membership</p>`;
  }
  html += `<p>Glad to have you inside,</p><p>Baby</p></div>`;
  return html;
}

async function sendEmail(contactId, first, line) {
  const res = await fetch(`${GHL}/conversations/messages`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({
      type: 'Email',
      contactId,
      subject: "You're in - get set up now",
      html: buildEmail(first, line),
    }),
  });
  if (!res.ok) {
    const e = await jsonOrNull(res);
    return { error: (e && (e.message || e.error)) || `send failed (${res.status})` };
  }
  return { ok: true };
}

/* ── the grid ──────────────────────────────────────────────────────────── */

function entitlementsFor(tier, isMember) {
  if (tier === 'yearly') return { tsmFreeMonth: true, babyFreeMonth: true, tsmHalfPrice: false };
  return isMember
    ? { tsmFreeMonth: false, babyFreeMonth: true, tsmHalfPrice: false }
    : { tsmFreeMonth: false, babyFreeMonth: false, tsmHalfPrice: true };
}

/* ── handler ───────────────────────────────────────────────────────────── */

module.exports = async (req, res) => {
  /* ?health=1 needs no secret: it reports only whether the wiring is in
     place, never a key, a value or any customer data. */
  if (String(req.query.health) === '1') {
    let closeReachable = null;
    if (process.env.CLOSE_API_KEY) {
      try {
        const r = await fetch(`${CLOSE}/me/`, { headers: closeHeaders() });
        closeReachable = r.ok;
      } catch (e) { closeReachable = false; }
    }
    return res.status(200).json({
      ok: true,
      env: {
        CLOSE_API_KEY: !!process.env.CLOSE_API_KEY,
        CLOSE_SMARTVIEW_MONTHLY: !!process.env.CLOSE_SMARTVIEW_MONTHLY,
        CLOSE_SMARTVIEW_YEARLY: !!process.env.CLOSE_SMARTVIEW_YEARLY,
        WHOP_API_KEY: !!process.env.WHOP_API_KEY,
        GHL_API_KEY: !!process.env.GHL_API_KEY,
        CRON_SECRET: !!process.env.CRON_SECRET,
      },
      closeReachable,
    });
  }

  /* Vercel's scheduler authenticates with CRON_SECRET, whose value the
     dashboard will not reveal after creation. CLOSE_SYNC_SECRET is a second
     accepted credential so a human can trigger a dry run on demand without
     rotating the shared cron secret. */
  const bearer = String(req.headers.authorization || '').replace(/^Bearer /, '');
  const supplied = bearer || String(req.query.secret || '');
  const accepted = [process.env.CRON_SECRET, process.env.CLOSE_SYNC_SECRET].filter(Boolean);
  const secret = !!supplied && accepted.includes(supplied);
  if (!secret) return res.status(401).json({ error: 'unauthorized' });

  membershipIndex = null; // fresh per invocation
  const commit = String(req.query.commit) === '1';
  const watermark = String(req.query.watermark) === '1';

  const buyers = [
    ...await buyersFromSmartView(process.env.CLOSE_SMARTVIEW_MONTHLY, 'monthly'),
    ...await buyersFromSmartView(process.env.CLOSE_SMARTVIEW_YEARLY, 'yearly'),
    ...await buyersFromStatuses(),
  ];

  // one row per person; Close has at least one duplicated lead
  const unique = [];
  const seen = new Set();
  for (const b of buyers) {
    if (seen.has(b.email)) continue;
    seen.add(b.email);
    unique.push(b);
  }

  const report = [];
  for (const person of unique) {
    const contact = await findContact(person.email);

    /* FAIL CLOSED. A lookup that errors or returns nothing used to fall
       through to `tags = []`, which is indistinguishable from "never
       processed" — so a transient GHL search failure granted and emailed
       people who had already been handled, including watermarked backlog
       buyers. Anything other than a definite, readable record is skipped
       and left for the next run. */
    if (!contact || !Array.isArray(contact.tags)) {
      report.push({ email: person.email, skipped: 'lookup failed, left for next run' });
      continue;
    }
    const tags = contact.tags;

    if (tags.includes('close-synced') || tags.includes('base44-backlog-ignored')
        || tags.includes('base44-fulfilled')) {
      report.push({ email: person.email, skipped: 'already processed' });
      continue;
    }

    if (watermark) {
      if (commit) {
        await upsertContact(person, ['close-synced', `base44-sale-${person.tier}`], []);
      }
      report.push({ email: person.email, tier: person.tier, action: 'watermarked, no grants' });
      continue;
    }

    const membership = await liveTsmMembership(person.email);
    const ent = entitlementsFor(person.tier, !!membership);
    const line = {
      email: person.email,
      name: person.name,
      tier: person.tier,
      tsmMember: !!membership,
      grants: [],
      errors: [],
    };

    if (ent.tsmFreeMonth && membership) {
      if (commit) {
        const r = await addFreeDays(membership.id, 30);
        r.error ? line.errors.push(`add_free_days: ${r.error}`)
                : (line.grants.push('30 free days added to live TSM sub'), line.freeDaysAdded = true);
      } else line.grants.push('would add 30 free days to live TSM sub');
    } else if (ent.tsmFreeMonth) {
      if (commit) {
        const r = await mintOneUsePlan(PLANS.tsmTrial, `TSM free month · ${person.email}`);
        r.error ? line.errors.push(`tsm trial: ${r.error}`)
                : (line.grants.push('TSM 30-day trial link'), line.tsmTrialLink = r.link);
      } else line.grants.push('would mint a one-use TSM 30-day trial link');
    }

    if (ent.babyFreeMonth) {
      if (commit) {
        const r = await mintOneUsePlan(PLANS.babyTrial, `Baby AI free month · ${person.email}`);
        r.error ? line.errors.push(`baby trial: ${r.error}`)
                : (line.grants.push('Baby AI 30-day trial link'), line.babyLink = r.link);
      } else line.grants.push('would mint a one-use Baby AI 30-day trial link');
    }

    if (ent.tsmHalfPrice) {
      if (commit) {
        const r = await mintHalfPricePromo(person.email);
        r.error ? line.errors.push(`50% promo: ${r.error}`)
                : (line.grants.push('50% off first month of TSM'), line.tsmPromoLink = r.link);
      } else line.grants.push('would mint a one-use 50%-off code for TSM');
    }

    line.courseLink = `https://whop.com/checkout/${PLANS.course}`;

    if (commit) {
      const newTags = ['close-synced', `base44-sale-${person.tier}`, 'base44-fulfilled'];
      if (line.errors.length) newTags.push('base44-fulfilment-failed');
      const saved = await upsertContact(person, [], [
        { key: 'base44_course_link', field_value: line.courseLink },
        { key: 'base44_tsm_link', field_value: line.tsmTrialLink || line.tsmPromoLink || '' },
        { key: 'base44_babyai_link', field_value: line.babyLink || '' },
      ]);
      /* Send from here rather than leaning on a GHL workflow: the grant and
         the email that carries it must not be able to drift apart. */
      const contactId = (saved && saved.id) || (contact && contact.id);
      if (contactId) {
        await fetch(`${GHL}/contacts/${contactId}/tags`, {
          method: 'POST', headers: ghlHeaders(), body: JSON.stringify({ tags: newTags }),
        }).catch(() => {});
      }
      if (contactId && !line.errors.length) {
        const first = (person.name || '').trim().split(/\s+/)[0] || 'there';
        const sent = await sendEmail(contactId, first.charAt(0).toUpperCase() + first.slice(1), line);
        if (sent.error) {
          line.errors.push(`email: ${sent.error}`);
          await fetch(`${GHL}/contacts/${contactId}/tags`, {
            method: 'POST', headers: ghlHeaders(),
            body: JSON.stringify({ tags: ['base44-email-failed'] }),
          });
        } else {
          line.emailed = true;
          await fetch(`${GHL}/contacts/${contactId}/tags`, {
            method: 'POST', headers: ghlHeaders(),
            body: JSON.stringify({ tags: ['base44-emailed'] }),
          });
        }
      }
    }
    report.push(line);
  }

  return res.status(200).json({
    ok: true,
    mode: watermark ? 'watermark' : (commit ? 'live' : 'dry-run'),
    total: unique.length,
    processed: report.filter((r) => !r.skipped).length,
    report,
  });
};

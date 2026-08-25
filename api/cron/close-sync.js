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
  course: 'plan_SYQ6dzY5Ystkb',
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
  for (let page = 1; page <= 30; page += 1) {
    const res = await fetch(`${WHOP}/memberships?per=50&page=${page}&valid=true`,
      { headers: whopHeaders() });
    const data = await jsonOrNull(res);
    const rows = (data && data.data) || [];
    for (const m of rows) {
      const email = String(m.email || '').toLowerCase();
      if (!email) continue;
      if (!idx.has(email)) idx.set(email, []);
      idx.get(email).push(m);
    }
    if (rows.length < 50) break;
  }
  membershipIndex = idx;
  return idx;
}

/* Churned and expired both count as "no membership": the grid treats churned
   buyers exactly like new ones. */
async function liveTsmMembership(email) {
  const idx = await buildMembershipIndex();
  return (idx.get(email) || []).find(
    (m) => TSM_PRODUCTS.includes(m.product) && m.valid && m.status === 'active') || null;
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
  return { code, link: `https://whop.com/checkout/${PLANS.tsmMonthly}?promo=${code}` };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return h;
}

/* ── GHL ───────────────────────────────────────────────────────────────── */

async function findContact(email) {
  const res = await fetch(
    `${GHL}/contacts/?locationId=${process.env.GHL_LOCATION_ID}&query=${encodeURIComponent(email)}`,
    { headers: ghlHeaders() });
  const data = await jsonOrNull(res);
  return ((data && data.contacts) || []).find(
    (c) => String(c.email || '').toLowerCase() === email) || null;
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
      tags,
      customFields: fields,
      source: 'Close · Base44 sale',
    }),
  });
  const data = await jsonOrNull(res);
  return (data && data.contact) || null;
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
    const tags = (contact && contact.tags) || [];

    if (tags.includes('close-synced')) {
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
                : line.grants.push('30 free days added to live TSM sub');
      } else line.grants.push('would add 30 free days to live TSM sub');
    } else if (ent.tsmFreeMonth) {
      if (commit) {
        const r = await mintOneUsePlan(PLANS.tsmTrial, `TSM free month · ${person.email}`);
        r.error ? line.errors.push(`tsm trial: ${r.error}`)
                : (line.grants.push('TSM 30-day trial link'), line.tsmLink = r.link);
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
                : (line.grants.push('50% off first month of TSM'), line.tsmLink = r.link);
      } else line.grants.push('would mint a one-use 50%-off code for TSM');
    }

    line.courseLink = `https://whop.com/checkout/${PLANS.course}`;

    if (commit) {
      const newTags = ['close-synced', `base44-sale-${person.tier}`, 'base44-fulfilled'];
      if (line.errors.length) newTags.push('base44-fulfilment-failed');
      await upsertContact(person, newTags, [
        { key: 'base44_course_link', field_value: line.courseLink },
        { key: 'base44_tsm_link', field_value: line.tsmLink || '' },
        { key: 'base44_babyai_link', field_value: line.babyLink || '' },
      ]);
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

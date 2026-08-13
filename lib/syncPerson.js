/* ══════════════════════════════════════════════════════════════════════
   The only path that writes customer state into GoHighLevel.

   WHY THIS IS SPLIT IN TWO
   ------------------------
   A first version tried to both gather a person's state and decide their
   tags in one call. It cannot: Whop has no per-user filter, so asking it
   about one person returns all 6,115 memberships unfiltered. Tested
   against live data that version removed has-tsm from a real customer
   and tagged a paying Baby AI member as churned, because absent data
   read as "owns nothing".

   So the two jobs are separated, and the rule is:

       NEVER DECIDE FROM PARTIAL DATA.

   applyAuthoritative()  the caller has COMPLETE state for this person,
                         gathered in bulk. Adds and removes freely. This
                         is what the reconcile uses and it is the only
                         thing allowed to remove a tag.

   applyFromEvent()      a webhook saw ONE thing happen. Adds only what
                         that event proves and removes nothing. The
                         reconcile corrects everything else within 15
                         minutes, which is the cost of not being able to
                         ask Whop about one person.

   Historical facts (has-tsm, has-nightfall-legacy) are never removed by
   either path. Someone who bought in 2024 bought it, forever, and no
   amount of missing data should be able to erase a purchase.

   Server-only. CommonJS: no package.json in this repo.
═══════════════════════════════════════════════════════════════════════ */

const { normEmail, recencyBand, ltvBand } = require('./people')

const GHL = 'https://services.leadconnectorhq.com'
const H = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY || ''}`,
  Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
})
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function ghl(path, method = 'GET', body) {
  for (let a = 0; a < 4; a++) {
    const res = await fetch(GHL + path, { method, headers: H(),
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
    if (res.status === 429 || res.status >= 500) { await sleep(800 * (a + 1)); continue }
    const text = await res.text()
    if (!res.ok) throw new Error(`GHL ${res.status} ${path}: ${text.slice(0, 160)}`)
    try { return JSON.parse(text) } catch { return {} }
  }
  throw new Error(`GHL: gave up on ${path}`)
}

/* ── vocabulary. Must match what phases 3 and 4 wrote, or the reconcile
      and the backfill will rewrite each other's tags forever. ───────── */
const SEG = { paying: 'customer-active', churned: 'customer-churned', stalled: 'customer-never-paid' }
const LTV = {
  under50: 'spent-under-50', '50-149': 'spent-50-149', '150-499': 'spent-150-499',
  '500-999': 'spent-500-999', '1000-2499': 'spent-1000-2499', '2500plus': 'spent-2500-plus',
}
const PLAN_FROM_TITLE = [
  [/3 month/i, 'plan-3-month'], [/6 month/i, 'plan-6-month'],
  [/coaching/i, 'plan-coaching'], [/^the stickley method\s*$/i, 'plan-1-month'],
]

/** Tags this system owns. Everything else is human-owned and untouchable. */
const OWNED = /^(customer-|spent-|churn-|plan-|has-tsm$|has-nightfall-97$|has-nightfall-legacy$|has-baby-ai$)/
/** Purchases that happened. Never removed, by anything, ever. */
const HISTORICAL = /^(has-tsm|has-nightfall-legacy)$/

/**
 * The tags a person should carry, from a COMPLETE truth-table record.
 * Same shape buildTruthTable() produces in lib/people.js.
 */
function desiredTags(p) {
  const t = []
  if (SEG[p.segment]) t.push(SEG[p.segment])
  if (p.everPaid && LTV[p.ltvBand]) t.push(LTV[p.ltvBand])
  if (p.segment === 'churned' && p.recencyBand) t.push(`churn-${p.recencyBand}`)
  if (p.owns?.tsm) t.push('has-tsm')
  if (p.owns?.nightfall97) t.push('has-nightfall-97')
  if (p.owns?.nightfallLegacy) t.push('has-nightfall-legacy')
  if (p.owns?.babyAi) t.push('has-baby-ai')
  if (p.paying) {
    if (p.fanbasis?.active) t.push('plan-fanbasis-legacy')
    for (const title of p.whop?.products || []) {
      const hit = PLAN_FROM_TITLE.find(([re]) => re.test(title))
      if (hit && !t.includes(hit[1])) t.push(hit[1])
    }
  }
  return [...new Set(t)]
}

/** Find by email WITHOUT upserting. Upsert matches on phone and would
    overwrite an existing contact's email, which it did to 125 people. */
async function findContact(email) {
  const j = await ghl('/contacts/search', 'POST', {
    locationId: process.env.GHL_LOCATION_ID, pageLimit: 5,
    filters: [{ field: 'email', operator: 'eq', value: email }],
  })
  return (j.contacts || [])[0] || null
}

/**
 * THE AUTHORITATIVE PATH. Only call this with a complete record.
 * Adds what is missing, removes what is wrong, leaves history alone.
 */
async function applyAuthoritative(email, person, { create = true, name = '' } = {}) {
  const norm = normEmail(email)
  if (!norm) return { email, skipped: 'no_email' }
  if (!person || !person.segment) return { email: norm, skipped: 'unknown_to_processors' }

  const want = desiredTags(person)
  const contact = await findContact(norm)

  if (!contact) {
    if (!create) return { email: norm, skipped: 'not_in_ghl' }
    /* Phone deliberately omitted: sending it lets GHL match on phone and
       silently overwrite a different contact's email address. */
    const [first, ...rest] = String(name || person.name || '').trim().split(' ')
    await ghl('/contacts/upsert', 'POST', {
      locationId: process.env.GHL_LOCATION_ID, email: norm,
      firstName: first || undefined, lastName: rest.join(' ') || undefined, tags: want,
    })
    return { email: norm, created: true, added: want, removed: [], changed: true }
  }

  const has = new Set(contact.tags || [])
  const add = want.filter(t => !has.has(t))
  const remove = [...has].filter(t => OWNED.test(t) && !HISTORICAL.test(t) && !want.includes(t))

  if (add.length) await ghl(`/contacts/${contact.id}/tags`, 'POST', { tags: add })
  if (remove.length) await ghl(`/contacts/${contact.id}/tags`, 'DELETE', { tags: remove })
  return { email: norm, created: false, added: add, removed: remove, changed: !!(add.length || remove.length) }
}

/**
 * THE WEBHOOK PATH. Adds only what the event itself proves. Removes
 * nothing, because one event never shows a person's whole position:
 * a membership going invalid does not mean they hold no other.
 *
 * The reconcile fixes the rest inside 15 minutes. That delay is the
 * price of Whop having no per-user lookup, and it is the difference
 * between "stale briefly" and Zapier's "wrong forever".
 */
async function applyFromEvent(email, { tags = [], name = '' } = {}) {
  const norm = normEmail(email)
  if (!norm) return { email, skipped: 'no_email' }
  const add = [...new Set(tags)].filter(Boolean)
  if (!add.length) return { email: norm, changed: false, added: [] }

  const contact = await findContact(norm)
  if (!contact) {
    const [first, ...rest] = String(name || '').trim().split(' ')
    await ghl('/contacts/upsert', 'POST', {
      locationId: process.env.GHL_LOCATION_ID, email: norm,
      firstName: first || undefined, lastName: rest.join(' ') || undefined, tags: add,
    })
    return { email: norm, created: true, added: add, removed: [], changed: true }
  }
  const missing = add.filter(t => !(contact.tags || []).includes(t))
  if (missing.length) await ghl(`/contacts/${contact.id}/tags`, 'POST', { tags: missing })
  return { email: norm, created: false, added: missing, removed: [], changed: !!missing.length }
}

module.exports = {
  applyAuthoritative, applyFromEvent, desiredTags, findContact, ghl,
  OWNED, HISTORICAL, SEG, LTV, PLAN_FROM_TITLE,
}

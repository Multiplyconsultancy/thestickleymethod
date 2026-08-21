/* ══════════════════════════════════════════════════════════════════════
   The truth table: one record per human, built from the payment
   processors and nothing else.

   THE RULE THIS FILE EXISTS TO ENFORCE
   ------------------------------------
   GoHighLevel tags are not evidence. 547 people paying right now carry
   no customer tag, 45 who are paying are tagged "cancelled", and 6,496
   who churned were never marked at all. So a contact's segment is
   resolved here, from Whop and Fanbasis, and a tag is only ever an
   OUTPUT of that decision. Never an input.

   Server-only. CommonJS: no package.json in this repo.
═══════════════════════════════════════════════════════════════════════ */

const whop = require('./whopMembers')
const fanbasis = require('./fanbasis')

/* ── identity ─────────────────────────────────────────────────────────── */

/**
 * Normalise an address so the same human resolves once.
 *
 * Dots are stripped ONLY for Gmail. Everywhere else a dot is significant
 * and removing it would merge two unrelated people, which is far worse
 * than missing a duplicate: it would fuse their purchase histories and
 * could hand one person's paid access to another.
 */
function normEmail(raw) {
  const e = String(raw || '').trim().toLowerCase()
  if (!e || !e.includes('@')) return ''
  let [local, domain] = e.split('@')
  if (!local || !domain) return ''
  local = local.split('+')[0]
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '')
    domain = 'gmail.com'
  }
  return local && domain ? `${local}@${domain}` : ''
}

const DAY = 86400000
const daysSince = iso => {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / DAY) : null
}

function recencyBand(days) {
  if (days === null) return 'unknown'
  if (days <= 30) return '0-30d'
  if (days <= 90) return '31-90d'
  if (days <= 180) return '91-180d'
  if (days <= 365) return '181-365d'
  if (days <= 730) return '1-2y'
  return '2y+'
}

function ltvBand(v) {
  if (v >= 2500) return '2500plus'
  if (v >= 1000) return '1000-2499'
  if (v >= 500) return '500-999'
  if (v >= 150) return '150-499'
  if (v >= 50) return '50-149'
  return 'under50'
}

/* ── the merge ────────────────────────────────────────────────────────── */

function blank(email) {
  return {
    email,
    name: '', phone: '', country: '',
    whop: { known: false, paying: false, cancelling: false, everPaid: false, spend: 0, refunded: 0,
            lastPaidAt: null, accessEndsAt: null, statuses: [], products: [] },
    fanbasis: { known: false, active: false, everPaid: false, spend: 0,
                lastPaidAt: null, statuses: [], products: [] },
    spend: 0, lastPaidAt: null, daysSinceLastPayment: null, comped: false,
    /* Every address this person was seen under, exactly as typed. The
       map is keyed by the normalised form, but GoHighLevel stores what
       the buyer actually entered and its email filter is exact match, so
       the raw spellings are the only way to find their real contact. */
    rawEmails: [],
    owns: { tsm: false, nightfall97: false, nightfallLegacy: false, babyAi: false, impact: false },
    plans: [], segment: null, lastProduct: '',
  }
}

const newer = (a, b) => (!a ? b : !b ? a : (Date.parse(a) >= Date.parse(b) ? a : b))

/**
 * Build the table.
 *
 * Cross-processor matching is by normalised email only. There is no
 * shared identifier between Whop and Fanbasis, and only 379 people appear
 * in both, so a fuzzier match would buy very little and risk false merges.
 */
function buildTruthTable({ memberships = [], payments = [], fbCustomers = [], fbSubscribers = [],
                          productTitles = new Map() }) {
  const people = new Map()
  const get = email => {
    if (!people.has(email)) people.set(email, blank(email))
    return people.get(email)
  }

  /* A v2 membership carries `product` as a bare id string, so titles have
     to come from the catalogue. Payments carry a product OBJECT with a
     title, so they top the map up for anything the catalogue missed. */
  const titles = new Map(productTitles)
  for (const pay of payments) {
    const id = pay?.product?.id
    const title = String(pay?.product?.title || '').trim()
    if (id && title && !titles.has(String(id))) titles.set(String(id), title)
  }
  const titleOf = id => titles.get(String(id)) || ''

  const classify = (p, title) => {
    if (/stickley/i.test(title)) p.owns.tsm = true
    if (/baby\s*ai/i.test(title)) p.owns.babyAi = true
    if (/impact/i.test(title)) p.owns.impact = true
  }

  /* Whop memberships: status, ownership, plan */
  for (const m of memberships) {
    const raw = String(whop.emailOf(m) || '').trim().toLowerCase()
    const email = normEmail(raw)
    if (!email) continue
    const p = get(email)
    if (raw && !p.rawEmails.includes(raw)) p.rawEmails.push(raw)
    p.whop.known = true
    const status = String(m.status || '').toLowerCase()
    p.whop.statuses.push(status)
    if (whop.isPaying(m)) p.whop.paying = true
    /* Cancelled but still inside the paid period: a save, not a win-back. */
    if (whop.isCancelling(m)) p.whop.cancelling = true
    /* Access with nothing owed. Not paying, not churned. */
    if (whop.isComped(m)) p.comped = true
    /* Latest date access actually runs to, across all their memberships. */
    const ends = whop.accessEndsAt(m)
    if (ends) p.whop.accessEndsAt = newer(p.whop.accessEndsAt, ends)

    const pid = whop.productIdOf(m)
    const title = titleOf(pid)
    if (title) p.whop.products.push(title)
    if (m.plan) p.plans.push(String(m.plan?.id || m.plan))
    classify(p, title)

    /* Ownership of Nightfall means the LIVE lifetime product only. The
       archived one sold 90 days and every membership on it has expired. */
    if (pid === whop.NIGHTFALL_LIVE && whop.retainsAccess(m)) p.owns.nightfall97 = true

    if (!p.name) p.name = String(m.user?.name || m.user?.username || '').trim()
    if (!p.phone) p.phone = String(m.phone_number || '').trim()
  }

  /* Whop payments: money and dates. usd_total is what was collected. */
  for (const pay of payments) {
    const raw = String(pay?.user?.email || '').trim().toLowerCase()
    const email = normEmail(raw)
    if (!email) continue
    if (String(pay.status).toLowerCase() !== 'paid') continue
    const p = get(email)
    if (raw && !p.rawEmails.includes(raw)) p.rawEmails.push(raw)
    /* A payment also proves ownership: someone can pay for a product and
       have no surviving membership row for it. */
    const payTitle = String(pay?.product?.title || '').trim()
    if (payTitle) { p.whop.products.push(payTitle); classify(p, payTitle) }
    p.whop.known = true
    const amount = Number(pay.usd_total ?? pay.total ?? 0) || 0
    const refunded = Number(pay.refunded_amount ?? 0) || 0
    if (amount > 0) {
      p.whop.everPaid = true
      p.whop.spend += amount
      p.whop.refunded += refunded
    }
    if (pay.paid_at) {
      if (!p.whop.lastPaidAt || pay.paid_at > p.whop.lastPaidAt) p.lastProduct = payTitle || p.lastProduct
      p.whop.lastPaidAt = newer(p.whop.lastPaidAt, pay.paid_at)
    }
    if (!p.name) p.name = String(pay.user?.name || '').trim()
    if (!p.phone) p.phone = String(pay.customer_phone || '').trim()
  }

  /* Fanbasis customers: the arbiter of whether they ever paid */
  for (const c of fbCustomers) {
    const raw = String(c.email || '').trim().toLowerCase()
    const email = normEmail(raw)
    if (!email) continue
    const p = get(email)
    if (raw && !p.rawEmails.includes(raw)) p.rawEmails.push(raw)
    p.fanbasis.known = true
    const spent = fanbasis.money(c.total_spent)
    p.fanbasis.spend += spent
    if (spent > 0) p.fanbasis.everPaid = true
    if (c.last_transaction_date) p.fanbasis.lastPaidAt = newer(p.fanbasis.lastPaidAt, c.last_transaction_date)
    if (!p.name) p.name = String(c.name || '').trim()
    if (!p.phone) p.phone = String(c.phone || '').trim()
    if (!p.country && c.country_code) p.country = `+${c.country_code}`
  }

  /* Fanbasis subscriptions: current status and which tier */
  for (const s of fbSubscribers) {
    const email = normEmail(s?.customer?.email)
    if (!email) continue
    const p = get(email)
    p.fanbasis.known = true
    const status = String(s?.subscription?.status || '').toLowerCase()
    p.fanbasis.statuses.push(status)
    if (fanbasis.isActiveSubscription(s.subscription)) p.fanbasis.active = true

    const title = String(s?.product?.title || '').trim()
    if (title) p.fanbasis.products.push(title)
    if (/stickley/i.test(title)) p.owns.tsm = true
    if (/impact/i.test(title)) p.owns.impact = true
    /* Legacy Nightfall: the $927 to $9,997 coaching ladder. Owning it is
       not owning the $97 lectures, but it is a reason not to pitch blind. */
    if (/nightfall/i.test(title)) p.owns.nightfallLegacy = true
  }

  /* Roll up */
  for (const p of people.values()) {
    p.spend = Math.round((p.whop.spend + p.fanbasis.spend) * 100) / 100
    p.lastPaidAt = newer(p.whop.lastPaidAt, p.fanbasis.lastPaidAt)
    p.daysSinceLastPayment = daysSince(p.lastPaidAt)
    p.everPaid = p.whop.everPaid || p.fanbasis.everPaid
    p.paying = p.whop.paying || p.fanbasis.active
    p.cancelling = p.whop.cancelling
    p.segment = p.paying ? 'paying' : p.everPaid ? 'churned' : 'stalled'

    /* WHEN DID ACCESS ACTUALLY LAPSE?
       Not the last payment date, and not renewal_period_end either.

       Someone who paid on 7 July on a monthly plan had access until about
       6 August, so on 14 August they churned last week, not five weeks
       ago. But renewal_period_end cannot be used to say so: on a
       cancelled membership it is stale, and Whop records no cancellation
       date anywhere (updated_at is empty on every row).

       So: last successful payment plus one billing period. That is what
       "paid until" means, it comes from the payment record rather than a
       mutable status field, and it cannot go stale. */
    const days = p.paying ? null : whop.billingDays(p.lastProduct || '')
    p.accessEndedAt = p.lastPaidAt && days
      ? new Date(Date.parse(p.lastPaidAt) + days * DAY).toISOString()
      : p.lastPaidAt
    p.daysSinceAccessEnded = p.accessEndedAt ? Math.max(0, daysSince(p.accessEndedAt)) : null
    p.recencyBand = p.segment === 'churned'
      ? recencyBand(p.daysSinceAccessEnded ?? p.daysSinceLastPayment)
      : null
    p.ltvBand = ltvBand(p.spend)
    p.whop.products = [...new Set(p.whop.products)]
    p.fanbasis.products = [...new Set(p.fanbasis.products)]
    p.plans = [...new Set(p.plans)]
  }

  return people
}

/**
 * Every address a GHL contact can be reached on, primary first.
 *
 * additionalEmails matters more than it looks. People buy with one
 * address and subscribe with another, so the payment processor and the
 * CRM often disagree about which is "the" email. 125 contacts in this
 * location are exactly that case, with the purchase address sitting in
 * additionalEmails alongside the one they actually read.
 */
function emailsOf(contact) {
  const out = []
  const push = e => { const n = normEmail(e); if (n && !out.includes(n)) out.push(n) }
  push(contact?.email)
  for (const a of contact?.additionalEmails || []) push(typeof a === 'string' ? a : a?.email || a?.value)
  return out
}

/**
 * Resolve one GHL contact against the table.
 *
 * Checks every address on the contact, not just the primary, because
 * matching on the primary alone reports a paying customer as cold
 * whenever they bought under a second address.
 *
 * A contact the processors have never heard of is cold, by definition.
 */
function segmentFor(contactOrEmail, table) {
  const contact = typeof contactOrEmail === 'string' ? { email: contactOrEmail } : contactOrEmail
  const emails = emailsOf(contact)
  if (!emails.length) return { segment: null, reason: 'no_email' }
  for (const e of emails) {
    const p = table.get(e)
    if (p) return { segment: p.segment, person: p, matchedOn: e }
  }
  return { segment: 'cold', person: null }
}

module.exports = {
  normEmail, emailsOf, daysSince, recencyBand, ltvBand,
  buildTruthTable, segmentFor,
}

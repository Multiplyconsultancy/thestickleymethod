/* ══════════════════════════════════════════════════════════════════════
   Fanbasis (trading as "Commas") — the OTHER payment processor.

   Nothing in this repo talked to Fanbasis before this file existed, which
   is exactly why 4,138 customers and $861,358 of gross revenue were
   invisible to every count we had. It is not legacy: 130 people are
   paying through it right now.

   Read-only. This client never charges, refunds or cancels anything.

   Auth is an x-api-key header, NOT a bearer token, and the base is a path
   on the marketing domain rather than an api.* host. Both are easy to get
   wrong and both fail in confusing ways.
═══════════════════════════════════════════════════════════════════════ */

const BASE = 'https://www.fanbasis.com/public-api'

/* Same browser-like UA rule as GHL. Cheap insurance, costs nothing. */
const HEADERS = () => ({
  'x-api-key': process.env.FANBASIS_API_KEY || '',
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
})

function configured() {
  return !!process.env.FANBASIS_API_KEY
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fb(path, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(BASE + path, { headers: HEADERS(), cache: 'no-store' })
      if (res.status === 429 || res.status >= 500) { await sleep(1200 * (i + 1)); continue }
      const text = await res.text()
      if (!res.ok) throw new Error(`fanbasis ${res.status}: ${text.slice(0, 160)}`)
      return JSON.parse(text)
    } catch (e) {
      if (i === tries - 1) throw e
      await sleep(1000 * (i + 1))
    }
  }
}

/* Fanbasis nests its arrays differently per endpoint, hence `pick`. */
async function pageThrough(path, pick, { perPage = 100, max = Infinity, onPage } = {}) {
  const rows = []
  let page = 1
  for (;;) {
    const j = await fb(`${path}${path.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`)
    const d = j.data || {}
    const batch = pick(d) || []
    rows.push(...batch)
    if (onPage) onPage(rows.length)
    const pg = d.pagination || d
    const totalPages = Number(pg.total_pages || pg.last_page || 1)
    if (page >= totalPages || !batch.length || rows.length >= max) break
    page++
    await sleep(100)
  }
  return rows
}

/** Every customer. ~4,138 rows over ~42 pages. */
function listCustomers(opts) {
  return pageThrough('/customers', (d) => d.customers, opts)
}

/** Every subscription row. ~4,494 rows. Carries product + status. */
function listSubscribers(opts) {
  return pageThrough('/subscribers', (d) => d.subscribers, opts)
}

function listProducts(opts) {
  return pageThrough('/products', (d) => d.data || d.products, opts)
}

/**
 * One person, by email. Used on the webhook path where scanning 42 pages
 * would be absurd. `search` matches email, name or phone, so we re-check
 * the email ourselves rather than trusting a fuzzy hit.
 */
async function findCustomer(email) {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return null
  const j = await fb(`/customers?per_page=25&page=1&search=${encodeURIComponent(e)}`)
  const rows = (j.data && j.data.customers) || []
  return rows.find((c) => String(c.email || '').trim().toLowerCase() === e) || null
}

/** Subscriptions for one customer id, so we can tell active from cancelled. */
async function subscriptionsFor(customerId) {
  if (!customerId) return []
  const j = await fb(`/subscribers?per_page=100&page=1&customer_id=${encodeURIComponent(customerId)}`)
  return (j.data && j.data.subscribers) || []
}

/* Statuses seen in the live data:
   active 133 · completed 2396 · failed 1698 · onetime_service 235 ·
   cancelled 30 · past_due 2
   Only `active` means money is still arriving. `completed` means the term
   finished, which is churn, not retention. */
const ACTIVE_STATUSES = new Set(['active'])

/**
 * Commercial status for one email.
 * Returns { known, paying, everPaid, spend, transactions, lastPaidAt, statuses }.
 * Never throws; an API failure returns known:false so callers fail closed.
 */
async function statusFor(email) {
  const miss = { known: false, paying: false, everPaid: false, spend: 0, transactions: 0, lastPaidAt: null, statuses: [] }
  if (!configured()) return miss
  try {
    const c = await findCustomer(email)
    if (!c) return miss
    const subs = await subscriptionsFor(c.id)
    const statuses = subs.map((s) => (s.subscription && s.subscription.status) || 'unknown')
    return {
      known: true,
      paying: statuses.some((s) => ACTIVE_STATUSES.has(s)),
      everPaid: Number(c.total_spent || 0) > 0,
      spend: Number(c.total_spent || 0),
      transactions: Number(c.total_transactions || 0),
      lastPaidAt: c.last_transaction_date || null,
      statuses,
      name: c.name || '',
      phone: c.phone || '',
      customerId: c.id,
    }
  } catch (e) {
    console.error(`[fanbasis] statusFor ${email} failed:`, e.message)
    return miss
  }
}

/* Nightfall was sold here as a high-ticket coaching ladder ($927 Foundation
   up to $9,997 Round Table) long before the $97 lecture course existed.
   Product titles are free text and inconsistently spelled, so match broadly. */
const NIGHTFALL_RE = /nightfall|accelerator|apex|amplify|solidify|foundation|elite|round\s*table|roundtable/i


/* ── compatibility with the resolver and the reconcile ────────────────────
   lib/people.js and api/cron/reconcile.js were written against an earlier
   shape of this file. Rather than rewrite either, the two helpers and the
   two collection names they expect are provided here. Same functions,
   second name. */

/** True when a subscription row means money is still arriving. */
const isActiveSubscription = (sub) =>
  ACTIVE_STATUSES.has(String((sub && sub.status) || '').toLowerCase())

/** Fanbasis returns money as a string. Parse defensively, never NaN. */
function money(v) {
  const n = Number(String(v == null ? '0' : v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const fetchCustomers = (onProgress) => listCustomers({ onPage: onProgress })
const fetchSubscribers = (onProgress) => listSubscribers({ onPage: onProgress })
const fetchProducts = () => listProducts()

module.exports = {
  configured, fb, listCustomers, listSubscribers, listProducts,
  findCustomer, subscriptionsFor, statusFor,
  ACTIVE_STATUSES, NIGHTFALL_RE, BASE,
  // aliases used by lib/people.js and api/cron/reconcile.js
  isActiveSubscription, money, fetchCustomers, fetchSubscribers, fetchProducts,
}

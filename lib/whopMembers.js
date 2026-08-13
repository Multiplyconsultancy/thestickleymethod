/* ══════════════════════════════════════════════════════════════════════
   Whop: memberships and payments, for segmentation.

   Two API versions are in play and both are load-bearing, which is not a
   mistake:

     v2 /memberships  status, validity, plan, product, renewal dates.
                      Page-numbered. `per` is HARD CAPPED AT 50: asking
                      for 100 returns 50, so the page size below is the
                      real maximum, not a cautious choice.

     v1 /payments     money and dates. Cursor-paged through page_info.
                      This is the only place spend and last-payment-date
                      can come from; memberships do not carry them.

   The existing crons in api/cron already use v1 for payments, and the
   Baby AI app already uses v2 for memberships, so this file is not
   introducing a split, it is documenting one that exists.

   Server-only. CommonJS: no package.json in this repo.
═══════════════════════════════════════════════════════════════════════ */

const V1 = 'https://api.whop.com/api/v1'
const V2 = 'https://api.whop.com/api/v2'
const PER = 50            // v2 hard cap, verified against the live API
const PAGE_GUARD = 400

const sleep = ms => new Promise(r => setTimeout(r, ms))

function configured() {
  return !!(process.env.WHOP_API_KEY && process.env.WHOP_COMPANY_ID)
}

async function whop(url, { attempts = 4 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY || ''}` },
      cache: 'no-store',
    })
    if (res.status === 429 || res.status >= 500) { await sleep(900 * (i + 1)); continue }
    const text = await res.text()
    if (!res.ok) throw new Error(`Whop ${res.status} ${url}: ${text.slice(0, 180)}`)
    try { return JSON.parse(text) } catch { return {} }
  }
  throw new Error(`Whop: gave up after ${attempts} attempts on ${url}`)
}

/* ── memberships ──────────────────────────────────────────────────────── */

/**
 * Every membership in the company. 6,100 rows, 122 pages at the 50 cap.
 *
 * Page 1 is fetched alone because it reports total_page; the rest go out
 * in concurrent batches. Fetched one at a time this took about 40
 * seconds, which was most of why the reconcile ran to 112s and would
 * have timed out in Vercel. The API is page-numbered, so pages 2..N have
 * no dependency on each other and there is no reason to queue them.
 */
async function fetchAllMemberships(onProgress, { concurrency = 3 } = {}) {
  const first = await whop(`${V2}/memberships?per=${PER}&page=1`)
  const out = [...(first.data || [])]
  const totalPages = Math.min(Number(first.pagination?.total_page ?? 1) || 1, PAGE_GUARD)
  if (onProgress) onProgress(out.length, first.pagination?.total_count ?? null)
  if (totalPages <= 1) return out

  const pages = []
  for (let p = 2; p <= totalPages; p++) pages.push(p)
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency)
    /* A FAILED PAGE MUST ABORT THE WHOLE FETCH.
       Swallowing it and carrying on returns a short membership list, and
       a short list makes the reconcile mark paying customers as churned.
       At concurrency 8 Whop rate-limited and 18 pages failed, quietly
       losing 851 memberships. Silence there would be far worse than
       slowness, so this throws and the caller does nothing at all. */
    const results = await Promise.all(batch.map(p =>
      whop(`${V2}/memberships?per=${PER}&page=${p}`)
        .then(r => ({ p, r }))
        .catch(e => { throw new Error(`memberships page ${p} failed: ${e.message}`) })))
    for (const { r } of results) out.push(...(r.data || []))
    if (onProgress) onProgress(out.length, first.pagination?.total_count ?? null)
    await sleep(120)
  }

  /* Belt and braces: the API told us how many rows exist, so check we
     have them. A short read here corrupts every downstream decision. */
  const expected = Number(first.pagination?.total_count ?? 0)
  if (expected && out.length < expected) {
    throw new Error(`memberships incomplete: got ${out.length} of ${expected}`)
  }
  return out
}

/* ── payments ─────────────────────────────────────────────────────────── */

/**
 * Every payment, newest first, via the v1 cursor.
 *
 * `usd_total` is what was actually collected, which is not `subtotal`:
 * a $39 plan bought with a promo code shows subtotal 39 and usd_total
 * 31.20. Using subtotal would overstate revenue on every discounted sale.
 */
async function fetchAllPayments(onProgress) {
  const out = []
  let cursor = null
  for (let page = 0; page < 1200; page++) {
    const u = new URL(`${V1}/payments`)
    u.searchParams.set('company_id', process.env.WHOP_COMPANY_ID)
    u.searchParams.set('first', '100')
    u.searchParams.set('direction', 'desc')
    if (cursor) u.searchParams.set('after', cursor)

    const j = await whop(u.toString())
    const rows = j.data || []
    if (!rows.length) break
    out.push(...rows)
    if (onProgress) onProgress(out.length)
    if (!j.page_info?.has_next_page) break
    cursor = j.page_info.end_cursor
    await sleep(110)
  }
  return out
}

/**
 * The product catalogue, as an id -> title map.
 *
 * This is not optional detail. A v2 membership carries `product` as a
 * bare id STRING, while a v1 payment carries `product` as an OBJECT with
 * a title on it. Reading `m.product.title` off a membership silently
 * returns undefined, which quietly classifies every Whop member as
 * owning nothing at all. Resolve ids through this map instead.
 */
async function fetchProducts() {
  const out = new Map()
  for (let page = 1; page <= 40; page++) {
    const j = await whop(`${V2}/products?per=${PER}&page=${page}`)
    const rows = j.data || []
    for (const p of rows) if (p?.id) out.set(String(p.id), String(p.title || '').trim())
    const totalPages = Number(j.pagination?.total_page ?? 0)
    if (rows.length < PER || (totalPages && page >= totalPages)) break
    await sleep(110)
  }
  return out
}

/* ── interpretation ───────────────────────────────────────────────────── */

/**
 * Membership statuses, with live counts:
 *   canceled 5,230 · active 665 · expired 116 · completed 63
 *   past_due 14 · trialing 7
 *
 * `completed` is deliberately NOT churn. It is what a one-time purchase
 * looks like once it has been paid, and all five owners of the $97
 * Nightfall lifetime course sit in it. Treating it as churn would drop
 * lifetime owners into the win-back pipeline and pitch them a product
 * they already own.
 *
 * `past_due` is NOT paying. The card has already failed. Dunning handles
 * them; marketing should not.
 */
const PAYING = new Set(['active', 'trialing'])
const ONE_TIME_RETAINS_ACCESS = new Set(['completed'])

const isPaying = m => PAYING.has(String(m?.status || '').toLowerCase())

/**
 * Cancelled, but still inside the period they paid for.
 *
 * A distinct and valuable state: they have access, they are still a
 * customer, and the ask is "resume", not "come back". 81 people are in
 * it right now. Pitching them a win-back offer would be pitching a
 * product they can already log into.
 */
const isCancelling = m => m?.cancel_at_period_end === true && (m?.valid === true || isPaying(m))

/**
 * When access actually ends, which is NOT when they last paid.
 *
 * Churn recency must be measured from here. Measured against 4,962
 * expired memberships, banding on last-payment date puts 19% of people
 * in the wrong band, and always in the same direction: someone who paid
 * on 7 July and lost access on 6 August reads as 31-90 days churned when
 * they actually churned last week. That systematically ages your
 * freshest and most recoverable people out of reach.
 */
function accessEndsAt(m) {
  const s = m?.renewal_period_end || m?.expires_at
  return s && Number.isFinite(Number(s)) ? new Date(Number(s) * 1000).toISOString() : null
}
const retainsAccess = m => m?.valid === true || ONE_TIME_RETAINS_ACCESS.has(String(m?.status || '').toLowerCase())

/** The archived Nightfall product sold 90 days of access, not the lifetime
    course. All five of its memberships are expired, verified 12 Aug 2026.
    It must never count as owning Nightfall. */
const NIGHTFALL_ARCHIVED = 'prod_piliPZbuqQm9j'
const NIGHTFALL_LIVE = 'prod_90nrQ1qZDp1tE'

const emailOf = x => String(x?.email || x?.user?.email || '').trim().toLowerCase()
const productIdOf = m => String(m?.product?.id || m?.product || m?.product_id || '')
const productTitleOf = m => String(m?.product?.title || '').trim()

module.exports = {
  configured,
  fetchAllMemberships,
  fetchAllPayments,
  fetchProducts,
  isPaying,
  isCancelling,
  accessEndsAt,
  retainsAccess,
  emailOf,
  productIdOf,
  productTitleOf,
  NIGHTFALL_ARCHIVED,
  NIGHTFALL_LIVE,
  PER,
}

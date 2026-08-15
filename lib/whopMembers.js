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
 * Every payment, via the v2 endpoint, which is PAGE-NUMBERED and so can
 * be fetched concurrently. The v1 endpoint is cursor-paged and therefore
 * strictly sequential: 350 pages one after another took 268 seconds and
 * pushed the nightly reconcile past Vercel's 300 second ceiling, which
 * meant the safety net could never actually run.
 *
 * v2 carries different shapes to v1 and both matter:
 *   user      an id string, NOT an object with an email on it
 *   product   an id string, not an object
 *   paid_at   a unix timestamp, not an ISO string
 *   amounts   final_amount / total / subtotal, no usd_total
 *
 * So the caller has to resolve user ids to emails through the membership
 * list. Verified across a sample spanning all 350 pages: 338 of 338 paid
 * payments resolved, none lost.
 */
async function fetchAllPaymentsV2(onProgress, { concurrency = 6 } = {}) {
  const first = await whop(`${V2}/payments?per=${PER}&page=1`)
  const out = [...(first.data || [])]
  const totalPages = Math.min(Number(first.pagination?.total_page ?? 1) || 1, 1200)
  const expected = Number(first.pagination?.total_count ?? 0)
  if (onProgress) onProgress(out.length, expected)
  if (totalPages <= 1) return out

  const pages = []
  for (let p = 2; p <= totalPages; p++) pages.push(p)
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency)
    /* A failed page aborts the whole fetch. A short payment list makes
       real customers look like they never paid, which is the single most
       damaging thing this system can get wrong. */
    const results = await Promise.all(batch.map(pg =>
      whop(`${V2}/payments?per=${PER}&page=${pg}`)
        .catch(e => { throw new Error(`payments page ${pg} failed: ${e.message}`) })))
    for (const r of results) out.push(...(r.data || []))
    if (onProgress) onProgress(out.length, expected)
    await sleep(120)
  }
  if (expected && out.length < expected * 0.99) {
    throw new Error(`payments incomplete: got ${out.length} of ${expected}`)
  }
  return out
}

/** user id -> email, built from the membership list, so v2 payments can
    be attributed to a person. */
function userEmailIndex(memberships) {
  const m = new Map()
  for (const x of memberships) {
    const u = typeof x.user === 'string' ? x.user : x.user?.id
    const e = String(x.email || x.user?.email || '').trim().toLowerCase()
    if (u && e && !m.has(u)) m.set(u, e)
  }
  return m
}

/** Normalise a v2 payment into the v1 shape the resolver already expects. */
function normalisePaymentV2(p, userEmails, productTitles) {
  const uid = typeof p.user === 'string' ? p.user : p.user?.id
  const email = userEmails.get(uid) || ''
  const pid = typeof p.product === 'string' ? p.product : p.product?.id
  const paidAt = p.paid_at && Number.isFinite(Number(p.paid_at))
    ? new Date(Number(p.paid_at) * 1000).toISOString() : null
  return {
    id: p.id,
    status: p.status,
    paid_at: paidAt,
    created_at: p.created_at && Number.isFinite(Number(p.created_at))
      ? new Date(Number(p.created_at) * 1000).toISOString() : null,
    usd_total: Number(p.final_amount ?? p.total ?? 0) || 0,
    refunded_amount: Number(p.refunded_amount ?? 0) || 0,
    user: { email },
    product: { id: pid, title: productTitles?.get?.(String(pid)) || '' },
  }
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
 * When access ends, for someone who STILL HAS IT.
 *
 * Only meaningful while `valid` is true. On a cancelled membership
 * renewal_period_end is STALE: it records when the period would have run
 * to, not when access ended. 247 cancelled memberships currently carry a
 * future date while valid is false, and trusting it put 231 people who
 * had already gone into the "just cancelled" bucket, tripling it.
 *
 * Whop stores no cancellation date at all: `updated_at` is empty on all
 * 6,127 memberships. So for anyone already invalid there is nothing here
 * to read, and churn recency has to come from the payment record
 * instead. See accessLapsedAt() in lib/people.js.
 */
function accessEndsAt(m) {
  if (m?.valid !== true) return null
  const s = m?.renewal_period_end || m?.expires_at
  return s && Number.isFinite(Number(s)) ? new Date(Number(s) * 1000).toISOString() : null
}

/** Billing period in days, from the product title. Used to work out when
    a lapsed subscription actually stopped granting access. */
function billingDays(title) {
  const t = String(title || '')
  if (/6 month/i.test(t)) return 180
  if (/3 month/i.test(t)) return 90
  return 30
}
const retainsAccess = m => m?.valid === true || ONE_TIME_RETAINS_ACCESS.has(String(m?.status || '').toLowerCase())

/**
 * Access granted without an ongoing payment.
 *
 * Whop marks a membership `completed` when a payment plan has run all of
 * its instalments: nothing further is owed and access continues. 57
 * people on TSM are in this state and $2,721 has ever been collected
 * from all of them combined, most of them $0. 24 of the 57 are Nightfall
 * legacy buyers who were given TSM as part of a $927 to $9,997 package.
 *
 * They hold access and they are not customers, which is a third thing
 * the paying/churned split has no room for. Worth naming: without a tag
 * they are invisible, and a win-back offer aimed at them is pitching $39
 * to somebody who can already log in, in one case a coaching client who
 * spent thousands.
 */
const isComped = m => String(m?.status || '').toLowerCase() === 'completed' && m?.valid === true

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
  fetchAllPaymentsV2,
  userEmailIndex,
  normalisePaymentV2,
  fetchProducts,
  isPaying,
  isCancelling,
  accessEndsAt,
  billingDays,
  retainsAccess, isComped,
  emailOf,
  productIdOf,
  productTitleOf,
  NIGHTFALL_ARCHIVED,
  NIGHTFALL_LIVE,
  PER,
}

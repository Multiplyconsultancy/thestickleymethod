/* ══════════════════════════════════════════════════════════════════════
   Fanbasis (trading as "Commas"). The OLDER of the two payment
   processors, and still live.

   It matters more than the name suggests: 4,138 customers and $861,358
   of gross revenue, which is more than Whop has ever taken. It is also
   where every legacy Stickley Method tier lives (base, gold, platinum,
   contender, legend, champion), and it is the processor IMPACT is
   currently sold through.

   Two shapes to know about:

     - Every response is wrapped: { status, message, data: {...} }, with
       the rows under a key named after the resource, so /customers gives
       data.customers and /subscribers gives data.subscribers.
     - per_page is capped at 100. Asking for 250 returns a body with no
       pagination block at all rather than an error, so the cap is
       enforced by silently breaking the response. Never raise it.

   Server-only. CommonJS, because this repo has no package.json and
   `export default` fails silently here.
═══════════════════════════════════════════════════════════════════════ */

const BASE = 'https://www.fanbasis.com/public-api'
const PER_PAGE = 100          // hard API cap, see above
const PAGE_GUARD = 500        // runaway guard, ~50,000 rows

function configured() {
  return !!process.env.FANBASIS_API_KEY
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fb(path, { attempts = 4 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(BASE + path, {
      headers: { 'x-api-key': process.env.FANBASIS_API_KEY || '', Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.status === 429 || res.status >= 500) { await sleep(900 * (i + 1)); continue }
    const text = await res.text()
    if (!res.ok) throw new Error(`Fanbasis ${res.status} ${path}: ${text.slice(0, 180)}`)
    try { return JSON.parse(text) } catch { throw new Error(`Fanbasis ${path}: non-JSON response`) }
  }
  throw new Error(`Fanbasis ${path}: gave up after ${attempts} attempts`)
}

/**
 * Page through a collection endpoint.
 * `key` is the property the rows sit under, e.g. 'customers'.
 */
async function paged(resource, key, onProgress, { concurrency = 8 } = {}) {
  /* Page 1 alone, because it carries total_pages. The rest concurrently:
     the endpoint is page-numbered so they are independent, and serial
     paging was costing ~27 seconds across customers and subscribers. */
  const first = await fb(`/${resource}?per_page=${PER_PAGE}&page=1`)
  const out = [...(first?.data?.[key] || [])]
  const meta = first?.data?.pagination
  const totalPages = Math.min(Number(meta?.total_pages ?? 1) || 1, PAGE_GUARD)
  if (onProgress) onProgress(out.length, meta?.total_items ?? null)
  if (totalPages <= 1) return out

  const pages = []
  for (let p = 2; p <= totalPages; p++) pages.push(p)
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency)
    /* Same rule as the Whop client: a failed page aborts rather than
       silently returning a short list. */
    const results = await Promise.all(batch.map(p =>
      fb(`/${resource}?per_page=${PER_PAGE}&page=${p}`)
        .catch(e => { throw new Error(`${resource} page ${p} failed: ${e.message}`) })))
    for (const r of results) out.push(...(r?.data?.[key] || []))
    if (onProgress) onProgress(out.length, meta?.total_items ?? null)
  }
  const expected = Number(meta?.total_items ?? 0)
  if (expected && out.length < expected) {
    throw new Error(`${resource} incomplete: got ${out.length} of ${expected}`)
  }
  return out
}

/** Every customer. One row per person: spend, transaction count, last transaction. */
const fetchCustomers = onProgress => paged('customers', 'customers', onProgress)

/** Every subscription row. A customer can hold several, so this is longer than the customer list. */
const fetchSubscribers = onProgress => paged('subscribers', 'subscribers', onProgress)

/** The product catalogue. Small, single page, and where the legacy tier prices live. */
async function fetchProducts() {
  const j = await fb('/products')
  return j?.data?.data || j?.data?.products || (Array.isArray(j?.data) ? j.data : [])
}

/* ── interpretation ───────────────────────────────────────────────────── */

/**
 * Statuses seen in the live data, with counts at the time of writing:
 *   completed 2,396 · failed 1,698 · onetime_service 235 · active 133
 *   cancelled 30 · past_due 2
 *
 * `active` is the only one that means money is still arriving.
 *
 * `failed` deliberately does NOT mean "never a customer". Someone can pay
 * for eight months and then have a card expire, which lands the row here.
 * Whether they ever paid is decided by total_spent on the CUSTOMER record,
 * never by the status on a subscription row.
 */
const ACTIVE_STATUSES = new Set(['active'])

const isActiveSubscription = sub => ACTIVE_STATUSES.has(String(sub?.status || '').toLowerCase())

/** Fanbasis returns money as a string. Parse defensively, never NaN. */
function money(v) {
  const n = Number(String(v ?? '0').replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

module.exports = {
  configured,
  fetchCustomers,
  fetchSubscribers,
  fetchProducts,
  isActiveSubscription,
  money,
  PER_PAGE,
}

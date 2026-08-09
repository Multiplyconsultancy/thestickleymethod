/* ══════════════════════════════════════════════════════════════════════
   Purchase email safety net.

   The one-click endpoint sends a buyer's email the moment their charge
   settles. That covers the happy path only: a hosted-checkout fallback,
   a direct purchase from the sales pages, or a crashed browser tab all
   bypass it. This polls Whop and emails anyone who slipped through.

   Idempotency is the GHL tag, not a database, so this is safe to run as
   often as you like and safe to re-run by hand.

   GET /api/cron/tsm-emails      Vercel Cron sends the bearer header
   GET /api/cron/tsm-emails?secret=...   manual trigger
═══════════════════════════════════════════════════════════════════════ */

const { sendPurchaseEmail, configured } = require('../../lib/ghl')

const API = 'https://api.whop.com/api/v1'

/* Which Whop product maps to which email. Baby AI is deliberately absent:
   its own app provisions accounts and sends the setup link, and a second
   email from here would confuse rather than help. */
const PRODUCTS = {
  prod_90nrQ1qZDp1tE: 'nightfall',
  // The $497 call product does not exist yet. Add it here once created:
  // prod_XXXXXXXXXXXX: 'call',
}

function authorised(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false      // unset means disabled, not open
  const auth = req.headers.authorization || ''
  if (auth === `Bearer ${secret}`) return true
  const url = new URL(req.url, 'http://x')
  return url.searchParams.get('secret') === secret
}

module.exports = async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' })
  if (!configured()) return res.status(200).json({ ok: false, reason: 'ghl_not_configured' })

  const KEY = process.env.WHOP_API_KEY
  const COMPANY = process.env.WHOP_COMPANY_ID
  if (!KEY || !COMPANY) return res.status(200).json({ ok: false, reason: 'whop_not_configured' })

  const days = Math.min(Number(new URL(req.url, 'http://x').searchParams.get('days')) || 14, 60)
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const seen = new Map()   // email -> { product, name }
  let cursor = null

  try {
    for (let page = 0; page < 20; page++) {
      const url = new URL(`${API}/payments`)
      url.searchParams.set('company_id', COMPANY)
      url.searchParams.set('first', '100')
      url.searchParams.set('direction', 'desc')
      if (cursor) url.searchParams.set('after', cursor)

      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${KEY}` }, cache: 'no-store' })
      if (!r.ok) break
      const j = await r.json()
      const items = j.data || []
      if (!items.length) break

      let past = false
      for (const p of items) {
        const paid = p.paid_at ? String(p.paid_at).slice(0, 10) : null
        if (paid && paid < since) { past = true; continue }
        if (p.status !== 'paid') continue
        const product = PRODUCTS[p.product?.id]
        if (!product) continue
        // Whop carries the buyer email on user, not member.
        const email = (p.user?.email || '').trim().toLowerCase()
        if (!email || seen.has(email)) continue
        seen.set(email, { product, name: p.user?.name || p.billing_address?.name || '' })
      }
      if (past || !j.page_info?.has_next_page) break
      cursor = j.page_info.end_cursor
    }

    let sent = 0, skipped = 0, failed = 0
    for (const [email, info] of seen) {
      const r = await sendPurchaseEmail(info.product, email, info.name)
      if (r.ok && r.skipped) skipped++
      else if (r.ok) sent++
      else { failed++; console.error(`[cron] ${info.product} -> ${email}: ${r.reason}`) }
    }

    console.log(`[cron] tsm-emails: ${seen.size} buyers, ${sent} sent, ${skipped} already had it, ${failed} failed`)
    return res.status(200).json({ ok: true, windowDays: days, buyers: seen.size, sent, skipped, failed })
  } catch (e) {
    console.error('[cron] tsm-emails failed:', e)
    return res.status(500).json({ error: 'cron_failed' })
  }
}

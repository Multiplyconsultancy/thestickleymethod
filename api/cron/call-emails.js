/* ══════════════════════════════════════════════════════════════════════
   Booking email safety net, for the 1-on-1 call ONLY.

   The charge endpoint emails the moment a one-click payment settles.
   That is the happy path only: a hosted-checkout fallback, a direct
   purchase, or a closed tab all bypass it. This polls Whop and emails
   anyone who slipped through.

   Nothing else sends from here. Baby AI onboards through its own app,
   and Nightfall is delivered by Whop.

   Idempotency is the GHL tag, not a database, so this is safe to run as
   often as you like and safe to re-run by hand.

   GET /api/cron/call-emails                  Vercel Cron (bearer header)
   GET /api/cron/call-emails?secret=...       manual trigger
═══════════════════════════════════════════════════════════════════════ */

const { sendCallEmail, sendAuditEmail, configured } = require('../../lib/ghl')

const API = 'https://api.whop.com/api/v1'
/* product id -> which purchase email it needs */
const PRODUCTS = {
  prod_VYHv8ZRFNB9yc: 'call',    // TSM - Call With Baby, $497
  prod_jFpMnbLHRI78t: 'audit',   // TSM - Personalised Video From Baby, $147
}

function authorised(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false            // unset means disabled, not open
  if ((req.headers.authorization || '') === `Bearer ${secret}`) return true
  return new URL(req.url, 'http://x').searchParams.get('secret') === secret
}

module.exports = async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' })
  if (!configured()) return res.status(200).json({ ok: false, reason: 'ghl_not_configured' })

  const KEY = process.env.WHOP_API_KEY
  const COMPANY = process.env.WHOP_COMPANY_ID
  if (!KEY || !COMPANY) return res.status(200).json({ ok: false, reason: 'whop_not_configured' })

  const days = Math.min(Number(new URL(req.url, 'http://x').searchParams.get('days')) || 14, 60)
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  const buyers = new Map()
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
        const kind = PRODUCTS[p.product?.id]
        if (!kind) continue
        // Whop carries the buyer email on user, not member.
        const email = (p.user?.email || '').trim().toLowerCase()
        if (!email || buyers.has(email)) continue
        buyers.set(email, { name: p.user?.name || p.billing_address?.name || '', kind })
      }
      if (past || !j.page_info?.has_next_page) break
      cursor = j.page_info.end_cursor
    }

    let sent = 0, skipped = 0, failed = 0
    const senders = { call: sendCallEmail, audit: sendAuditEmail }
    for (const [email, info] of buyers) {
      const r = await senders[info.kind](email, info.name)
      if (r.ok && r.skipped) skipped++
      else if (r.ok) sent++
      else { failed++; console.error(`[cron] call email -> ${email}: ${r.reason}`) }
    }

    console.log(`[cron] call-emails: ${buyers.size} buyers, ${sent} sent, ${skipped} already had it, ${failed} failed`)
    return res.status(200).json({ ok: true, windowDays: days, buyers: buyers.size, sent, skipped, failed })
  } catch (e) {
    console.error('[cron] call-emails failed:', e)
    return res.status(500).json({ error: 'cron_failed' })
  }
}

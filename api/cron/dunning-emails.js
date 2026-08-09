/* ══════════════════════════════════════════════════════════════════════
   Failed-payment recovery, roughly a day later.

   Runs every 6 hours, scans recent Whop payments for TSM-family products
   whose last charge attempt failed 20-72 hours ago, and sends one
   recovery email per failed payment. The delay is deliberate: Whop and
   the bank retry on their own first, and a same-hour email reads as
   panic. A day later it reads as help.

   Skips anyone who has paid anything since the failure (they recovered),
   and the GHL tag carries the payment id, so one failure = one email but
   a fresh failure months later emails again as it should.

   GET /api/cron/dunning-emails               Vercel Cron (bearer header)
   GET /api/cron/dunning-emails?secret=...    manual trigger
═══════════════════════════════════════════════════════════════════════ */

const { sendDunningEmail, configured } = require('../../lib/ghl')

const API = 'https://api.whop.com/api/v1'

/* Products worth chasing. Label is what the email names. */
const PRODUCTS = {
  prod_pF8nU8AqdAO1U: 'The Stickley Method',
  prod_dnB3ROMALqsAR: 'The Stickley Method (3 months)',
  prod_by2oiuCX0pVu6: 'The Stickley Method (6 months)',
  prod_I9Jkfcyxb01FM: 'Baby AI',
  prod_90nrQ1qZDp1tE: 'Nightfall',
  prod_VYHv8ZRFNB9yc: 'your 1-on-1 call with Baby',
}

const MIN_AGE_H = 20
const MAX_AGE_H = 72

function authorised(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  if ((req.headers.authorization || '') === `Bearer ${secret}`) return true
  return new URL(req.url, 'http://x').searchParams.get('secret') === secret
}

module.exports = async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' })
  if (!configured()) return res.status(200).json({ ok: false, reason: 'ghl_not_configured' })

  const KEY = process.env.WHOP_API_KEY
  const COMPANY = process.env.WHOP_COMPANY_ID
  if (!KEY || !COMPANY) return res.status(200).json({ ok: false, reason: 'whop_not_configured' })

  const now = Date.now()
  const failures = []                    // candidate failed payments
  const paidSince = new Map()            // member -> newest successful paid_at (ms)
  let cursor = null

  try {
    for (let page = 0; page < 15; page++) {
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

      let pastWindow = false
      for (const p of items) {
        const member = (p.member || {}).id
        const created = p.created_at ? Date.parse(p.created_at) : 0
        if (created && now - created > (MAX_AGE_H + 96) * 3600000) pastWindow = true

        if (p.status === 'paid' && p.paid_at && member) {
          const t = Date.parse(p.paid_at)
          if (t > (paidSince.get(member) || 0)) paidSince.set(member, t)
          continue
        }

        // A failed attempt: something tried to charge and did not settle.
        const attempted = p.last_payment_attempt ? Date.parse(p.last_payment_attempt) : created
        const failed = (p.payments_failed || 0) > 0 || p.decline_code || p.failure_message
        if (!failed || !attempted) continue
        const ageH = (now - attempted) / 3600000
        if (ageH < MIN_AGE_H || ageH > MAX_AGE_H) continue
        const label = PRODUCTS[p.product?.id]
        if (!label) continue
        const email = (p.user?.email || '').trim().toLowerCase()
        if (!email) continue
        failures.push({ id: p.id, email, member, attempted,
                        name: p.user?.name || p.billing_address?.name || '', label })
      }
      if (pastWindow || !j.page_info?.has_next_page) break
      cursor = j.page_info.end_cursor
    }

    let sent = 0, skipped = 0, recovered = 0, errors = 0
    const seenEmail = new Set()
    for (const f of failures) {
      if (seenEmail.has(f.email)) continue          // one email per person per run
      seenEmail.add(f.email)
      if (f.member && (paidSince.get(f.member) || 0) > f.attempted) { recovered++; continue }
      const r = await sendDunningEmail(f.email, f.name, f.label, f.id)
      if (r.ok && r.skipped) skipped++
      else if (r.ok) sent++
      else { errors++; console.error(`[cron] dunning -> ${f.email}: ${r.reason}`) }
    }

    console.log(`[cron] dunning: ${failures.length} failures in window, ${sent} sent, ${skipped} already emailed, ${recovered} self-recovered, ${errors} errors`)
    return res.status(200).json({ ok: true, failures: failures.length, sent, skipped, recovered, errors })
  } catch (e) {
    console.error('[cron] dunning failed:', e)
    return res.status(500).json({ error: 'cron_failed' })
  }
}

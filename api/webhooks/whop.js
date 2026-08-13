/* ══════════════════════════════════════════════════════════════════════
   Whop webhook. Verifies the signature, then records only what the
   event itself proves.

   It is deliberately not clever. One event never reveals a person's
   whole position, and Whop has no per-user lookup, so anything that
   needs the full picture is left to the reconcile. This makes a
   duplicate, out-of-order or replayed event harmless.

   SECRET
   ------
   WHOP_WEBHOOK_SECRET may hold several comma-separated secrets and any
   one matching is accepted. Baby AI already has a Whop webhook with its
   own secret, and whether Whop issues one secret per company or one per
   webhook was not something we could determine up front. A list means it
   works either way, and gives zero-downtime rotation for free.

   This endpoint NEVER sends email. It writes tags and moves cards.

     POST /api/webhooks/whop
═══════════════════════════════════════════════════════════════════════ */

const { createHmac, timingSafeEqual } = require('node:crypto')
const { applyFromEvent } = require('../../lib/syncPerson')

/** Raw body, needed because a signature is computed over exact bytes. */
function rawBody(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === 'string') return resolve(req.body)
    if (req.body && typeof req.body === 'object') return resolve(JSON.stringify(req.body))
    let data = ''
    req.on('data', c => { data += c })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function verify(raw, header) {
  const secrets = String(process.env.WHOP_WEBHOOK_SECRET || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (!secrets.length || !header) return false

  const provided = (String(header).match(/(?:^|[,\s])(?:v1=)?([a-f0-9]{64})(?:$|[,\s])/i)?.[1] ?? header)
    .trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(provided)) return false

  for (const secret of secrets) {
    const expected = createHmac('sha256', secret).update(raw, 'utf8').digest('hex')
    try {
      if (timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'))) return true
    } catch { /* length mismatch, try the next secret */ }
  }
  return false
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  let raw
  try { raw = await rawBody(req) } catch { return res.status(400).json({ error: 'bad_body' }) }

  const sig = req.headers['x-whop-signature'] || req.headers['whop-signature'] || req.headers['x-signature']
  if (!verify(raw, sig)) {
    console.error('[whop-hook] signature rejected')
    return res.status(401).json({ error: 'bad_signature' })
  }

  let evt = {}
  try { evt = JSON.parse(raw) } catch { return res.status(400).json({ error: 'bad_json' }) }

  const action = evt.action || evt.event || evt.type || 'unknown'
  const data = evt.data || evt.membership || evt.payment || evt

  const email = String(data?.user?.email || data?.email || '').trim().toLowerCase()
  const membershipId = data?.membership?.id || (action.startsWith('membership') ? data?.id : data?.membership)

  if (!email) {
    /* No email means the reconcile has to pick it up. Logged rather than
       failed, so Whop does not retry something we cannot action. */
    console.warn(`[whop-hook] ${action}: no email on payload, leaving to reconcile`)
    return res.status(200).json({ ok: true, skipped: 'no_email' })
  }

  /* THE REAL WHOP EVENT NAMES, taken from the dashboard on 13 Aug 2026.
     They use underscores, not the dotted names guessed from the Baby AI
     code (`membership.went_valid` and friends). Those would never have
     matched, and the handler would have silently done nothing forever.

     Only these matter to us. Whop can fire around seventy events, most
     of them about cards, payouts and identity checks, and anything not
     listed here is acknowledged and ignored.

       membership_activated ........... they have access
       membership_deactivated ......... access ended
       membership_cancel_at_period_end_changed
                                        cancelled but still inside the
                                        paid period, the "resume" state
       payment_succeeded .............. money arrived
       payment_failed ................. dunning territory
       refund_created / refund_updated  money reversed
       dispute_created / dispute_updated  chargeback

     Removals are still left to the reconcile: one event never shows a
     person's whole position, and Whop cannot be asked about one person. */
  const tags = []
  const title = String(data?.product?.title || data?.product_title || '')
  const isTsm = /stickley/i.test(title)
  const isBabyAi = /baby\s*ai/i.test(title)

  switch (action) {
    case 'membership_activated':
    case 'payment_succeeded':
    case 'invoice_paid':
      tags.push('customer-active')
      if (isTsm) tags.push('has-tsm')
      if (isBabyAi) tags.push('has-baby-ai')
      break

    case 'membership_cancel_at_period_end_changed':
      /* Fires both ways: cancelling, and un-cancelling. Only the
         cancelling direction is safe to act on here, because removing
         the tag on the reverse needs their full position. */
      if (data?.cancel_at_period_end === true) tags.push('cancelling')
      break

    /* Deliberately no tag writes. Deciding someone has churned needs
       their whole position, not one membership ending. The reconcile
       does it, within the hour. */
    case 'membership_deactivated':
    case 'payment_failed':
    case 'refund_created':
    case 'refund_updated':
    case 'dispute_created':
    case 'dispute_updated':
      break

    default:
      return res.status(200).json({ ok: true, action, skipped: 'not_relevant' })
  }

  try {
    const r = await applyFromEvent(email, { tags, name: data?.user?.name || data?.name || '' })
    console.log(`[whop-hook] ${action} ${email}: ${r.changed ? '+' + (r.added || []).join(',') : 'no change'} (reconcile will confirm)`)
    return res.status(200).json({ ok: true, action, ...r })
  } catch (e) {
    console.error(`[whop-hook] ${action} ${email} failed:`, e.message)
    /* 200 on purpose: the reconcile will catch this person within 15
       minutes, and a 500 makes Whop retry a request that will fail the
       same way. */
    return res.status(200).json({ ok: false, error: e.message })
  }
}

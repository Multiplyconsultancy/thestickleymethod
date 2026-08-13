/* ══════════════════════════════════════════════════════════════════════
   Whop webhook. Verifies the signature, then hands the email to
   syncPerson and lets that re-read the truth.

   The payload is used for exactly two things: WHICH person changed, and
   WHICH membership id to look up. Every decision about tags comes from a
   fresh read, so a duplicate, out-of-order or replayed event is harmless.

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

  /* Add only what this event proves. A membership going invalid does
     not mean they hold no other, and Whop cannot be asked, so removals
     are left to the reconcile 15 minutes later. */
  const tags = []
  const title = String(data?.product?.title || data?.product_title || '')
  if (/succeeded|went_valid|valid/i.test(action)) {
    tags.push('customer-active')
    if (/stickley/i.test(title)) tags.push('has-tsm')
    if (/baby\s*ai/i.test(title)) tags.push('has-baby-ai')
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

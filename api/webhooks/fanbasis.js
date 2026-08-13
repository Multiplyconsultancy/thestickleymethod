/* ══════════════════════════════════════════════════════════════════════
   Fanbasis (Commas) webhook. Same shape as the Whop one: verify, then
   let syncPerson re-read the truth rather than trusting the payload.

   Fanbasis matters more than the name suggests. It holds $861,358 of
   gross revenue, more than Whop has ever taken, 130 people are still
   paying through it, and it is the live processor for IMPACT.

   The subscription-cancelled Zap that used to run here wrote NO tag at
   all, only an opportunity, which is the entire reason 6,496 churned
   payers were never marked. This endpoint replaces it.

   Signature arrives as `x-webhook-signature`, verified against the
   secret_key returned when the subscription was created.

     POST /api/webhooks/fanbasis
═══════════════════════════════════════════════════════════════════════ */

const { createHmac, timingSafeEqual } = require('node:crypto')
const { applyFromEvent } = require('../../lib/syncPerson')

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
  const secrets = String(process.env.FANBASIS_WEBHOOK_SECRET || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (!secrets.length || !header) return false
  const provided = String(header).replace(/^sha256=/i, '').trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(provided)) return false
  for (const secret of secrets) {
    const expected = createHmac('sha256', secret).update(raw, 'utf8').digest('hex')
    try {
      if (timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'))) return true
    } catch { /* try next */ }
  }
  return false
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  let raw
  try { raw = await rawBody(req) } catch { return res.status(400).json({ error: 'bad_body' }) }

  if (!verify(raw, req.headers['x-webhook-signature'])) {
    console.error('[fb-hook] signature rejected')
    return res.status(401).json({ error: 'bad_signature' })
  }

  let evt = {}
  try { evt = JSON.parse(raw) } catch { return res.status(400).json({ error: 'bad_json' }) }

  const type = evt.event_type || evt.event || evt.type || 'unknown'
  const d = evt.data || evt
  const email = String(d?.customer?.email || d?.email || '').trim().toLowerCase()

  if (!email) {
    console.warn(`[fb-hook] ${type}: no email on payload, leaving to reconcile`)
    return res.status(200).json({ ok: true, skipped: 'no_email' })
  }

  /* Add-only, same reasoning as the Whop handler. */
  const tags = []
  const title = String(d?.product?.title || '')
  if (/succeeded|created|renewed|recovered/i.test(type)) {
    tags.push('customer-active')
    if (/stickley/i.test(title)) tags.push('has-tsm')
    if (/nightfall/i.test(title)) tags.push('has-nightfall-legacy')
  }

  try {
    const r = await applyFromEvent(email, { tags, name: d?.customer?.name || '' })
    console.log(`[fb-hook] ${type} ${email}: ${r.changed ? '+' + (r.added || []).join(',') : 'no change'} (reconcile will confirm)`)
    return res.status(200).json({ ok: true, event: type, ...r })
  } catch (e) {
    console.error(`[fb-hook] ${type} ${email} failed:`, e.message)
    return res.status(200).json({ ok: false, error: e.message })
  }
}

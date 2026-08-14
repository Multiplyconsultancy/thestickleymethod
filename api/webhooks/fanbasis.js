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
const { applyFromEvent, findContact, applyPlacement } = require('../../lib/syncPerson')

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
  const isPurchase = /succeeded|created|renewed|recovered/i.test(type)
  if (isPurchase) {
    tags.push('customer-active')
    if (/stickley/i.test(title)) tags.push('has-tsm')
    if (/nightfall/i.test(title)) tags.push('has-nightfall-legacy')
  }

  /* WHY A CANCELLATION DOES NOT WRITE customer-churned HERE.
     The Whop handler can, because a deactivation there means access has
     genuinely ended. Fanbasis has no equivalent: a cancelled
     subscription may still be inside its paid term, and the person may
     hold a live Whop membership this payload knows nothing about.
     Marking them churned would move them onto the win-back board and
     start win-back email at somebody who is still a paying member.

     So the segment waits for the reconcile, which sees both processors.
     The cost is bounded: Fanbasis carries 130 active payers against
     Whop's 837, and TSM churn overwhelmingly arrives through Whop. */
  if (!isPurchase) {
    console.log(`[fb-hook] ${type} ${email}: segment deferred to reconcile`)
    return res.status(200).json({ ok: true, event: type, deferred: 'reconcile' })
  }

  try {
    const r = await applyFromEvent(email, { tags, name: d?.customer?.name || '' })

    /* MOVE THE CARD NOW, not at the top of the hour.
       This handler used to write tags and stop, so a Fanbasis buyer sat
       off every board until the reconcile ran. A setter looking at a
       pipeline needs it right, now, or they stop trusting the board.
       Placement is computed from the contact's tags after the event, by
       the same rules the reconcile uses, so the two cannot disagree. */
    let cards = null
    const contact = await findContact(email)
    if (contact?.id) {
      cards = await applyPlacement(contact.id, contact.tags || [], contact.contactName || email)
    }
    console.log(`[fb-hook] ${type} ${email}: ${r.changed ? '+' + (r.added || []).join(',') : 'no tag change'}` +
                (cards ? ` cards +${cards.made}/~${cards.moved}/-${cards.gone}` : ' (contact not readable yet)'))
    return res.status(200).json({ ok: true, event: type, ...r, cards })
  } catch (e) {
    console.error(`[fb-hook] ${type} ${email} failed:`, e.message)
    return res.status(200).json({ ok: false, error: e.message })
  }
}

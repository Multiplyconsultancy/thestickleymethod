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
const { findContact, ghl, tagsAfterEvent, applyPlacement } = require('../../lib/syncPerson')

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

  /* THE REAL WHOP EVENT NAMES, from the dashboard on 13 Aug 2026. They
     use underscores, not the dotted names inferred from the Baby AI code.
     Whop fires around seventy events, mostly about cards, payouts and
     identity checks; anything not handled here is acknowledged and
     ignored.

     Each case says what the event PROVES, as tags to add and remove. The
     card then moves immediately, because a setter looking at a board
     needs it right now rather than within the hour. */
  const title = String(data?.product?.title || data?.product_title || '')
  const isTsm = /stickley/i.test(title)
  const isBabyAi = /baby\s*ai/i.test(title)
  const plan = /6 month/i.test(title) ? 'plan-6-month'
             : /3 month/i.test(title) ? 'plan-3-month'
             : /coaching/i.test(title) ? 'plan-coaching'
             : isTsm ? 'plan-1-month' : null

  let add = [], remove = []
  switch (action) {
    case 'membership_activated':
    case 'payment_succeeded':
    case 'invoice_paid':
      add = ['customer-active']
      if (isTsm) add.push('has-tsm')
      if (isBabyAi) add.push('has-baby-ai')
      if (plan) add.push(plan)
      /* They are paying again, so nothing about churn is true any more.
         And a plan tag is exclusive: upgrading from monthly to six months
         must clear the old one, or they end up holding both and the board
         picks whichever the stage rules happen to check first. */
      remove = ['customer-churned', 'customer-never-paid', 'cancelling',
                'churn-0-30d', 'churn-31-90d', 'churn-91-180d', 'churn-181-365d', 'churn-1-2y']
      if (plan) {
        for (const other of ['plan-1-month', 'plan-3-month', 'plan-6-month', 'plan-coaching']) {
          if (other !== plan) remove.push(other)
        }
      }
      break

    case 'membership_cancel_at_period_end_changed':
      if (data?.cancel_at_period_end === true) add = ['cancelling']
      else remove = ['cancelling']
      break

    case 'membership_deactivated':
      /* Access has ended. 0.5% of people hold a second valid membership,
         and for them this moves the card early; the reconcile corrects it
         within the hour. Worth it so the other 99.5% are instant. */
      add = ['customer-churned', 'churn-0-30d']
      remove = ['customer-active', 'cancelling', 'plan-1-month', 'plan-3-month',
                'plan-6-month', 'plan-coaching', 'plan-fanbasis-legacy']
      break

    /* Money reversed. Segment needs the full picture, so leave it to the
       reconcile rather than guess from one refund. */
    case 'payment_failed':
    case 'refund_created':
    case 'refund_updated':
    case 'dispute_created':
    case 'dispute_updated':
      return res.status(200).json({ ok: true, action, deferred: 'reconcile' })

    default:
      return res.status(200).json({ ok: true, action, skipped: 'not_relevant' })
  }

  try {
    /* Upsert on EMAIL ONLY, always. Two reasons.

       GHL's contact search index lags a write by a second or two, so
       findContact can return nothing for a contact that plainly exists,
       and a handler that branches on that took a create path which only
       added tags and never removed them. Result: tags saying churned
       while the card said active. Upsert is idempotent and returns the
       id either way, so there is no branch to get wrong.

       And phone is deliberately never sent: including it lets GHL match
       on phone and silently overwrite a different contact's email
       address, which it did to 125 people. */
    const [first, ...rest] = String(data?.user?.name || data?.name || '').trim().split(' ')
    const up = await ghl('/contacts/upsert', 'POST', {
      locationId: process.env.GHL_LOCATION_ID, email,
      firstName: first || undefined, lastName: rest.join(' ') || undefined,
    })
    const contactId = up?.contact?.id || up?.id
    if (!contactId) throw new Error('no contact id from upsert')

    /* Read by id, which is immediate, rather than by search. */
    const fresh = (await ghl(`/contacts/${contactId}`))?.contact || {}
    const had = fresh.tags || []
    const missing = add.filter(t => !had.includes(t))
    const present = remove.filter(t => had.includes(t))
    if (missing.length) await ghl(`/contacts/${contactId}/tags`, 'POST', { tags: missing })
    if (present.length) await ghl(`/contacts/${contactId}/tags`, 'DELETE', { tags: present })

    const tags = tagsAfterEvent(had, { add, remove })
    const cards = await applyPlacement(contactId, tags, fresh.contactName || email)
    console.log(`[whop-hook] ${action} ${email}: +[${add}] -[${remove}] cards +${cards.made}/~${cards.moved}/-${cards.gone}`)
    return res.status(200).json({ ok: true, action, added: add, removed: remove, cards })
  } catch (e) {
    console.error(`[whop-hook] ${action} ${email} failed:`, e.message)
    /* 200 on purpose: the reconcile catches this person anyway, and a 500
       makes Whop retry something that will fail the same way. */
    return res.status(200).json({ ok: false, error: e.message })
  }
}

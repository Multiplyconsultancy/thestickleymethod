/* ══════════════════════════════════════════════════════════════════════
   The safety net.

   Webhooks make the CRM fast. This makes it CORRECT. Under Zapier a
   missed event meant a record stayed wrong permanently and silently:
   547 people paying with no customer tag, 45 paying while tagged
   cancelled, 6,496 churning unmarked.

   WHAT THIS ACTUALLY EXISTS FOR
   -----------------------------
   Less than first assumed, and worth being honest about, because an
   over-frequent cron is its own kind of mess.

     - AGEING THROUGH CHURN BANDS. Nobody does anything on day 31.
       8,531 people need re-banding purely because time passed and no
       webhook will ever fire for it. This is the real job.
     - A SAFETY NET for events that were missed.

   Expiry itself IS webhook-covered: membership.went_invalid fires when
   access ends. So this runs hourly for insurance and nightly to do the
   re-banding, not every 15 minutes.

   MODES
     rolling  (hourly) people with recent payment activity plus active
              Fanbasis subscribers. Small, quick, pure insurance.
     nightly  (nightly) everyone the processors know about, plus every
              contact already carrying a machine tag. Reads only the
              ~9,400 contacts that have tags to maintain rather than all
              55,861, because the rest are cold and cannot change.
              Split with &part=N&of=M if it ever needs breaking up.

   THE DRIFT COUNTER
     Every run reports how many contacts it had to correct. Healthy is at
     or near zero. Climbing means webhooks stopped arriving and you know
     the same day. That number is the alarm this business never had.

     GET /api/cron/reconcile                    hourly insurance
     GET /api/cron/reconcile?mode=nightly       full pass
     GET /api/cron/reconcile?mode=nightly&part=0&of=4
     GET /api/cron/reconcile?dry=1              report drift, write nothing
     GET /api/cron/reconcile?email=x@y.z        one person, debugging
═══════════════════════════════════════════════════════════════════════ */

const whop = require('../../lib/whopMembers')
const fanbasis = require('../../lib/fanbasis')
const { buildTruthTable, normEmail, emailsOf } = require('../../lib/people')
const { applyAuthoritative, desiredTags, findContact, OWNED, HISTORICAL, ghl } = require('../../lib/syncPerson')
const { desiredPlacement, planCards } = require('../../lib/placement')

const MAX_WRITES = 1500

function authorised(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false                    // unset means disabled, not open
  if ((req.headers.authorization || '') === `Bearer ${secret}`) return true
  return new URL(req.url, 'http://x').searchParams.get('secret') === secret
}

async function recentPayments(days) {
  const out = []
  const since = Date.now() - days * 86400000
  let cursor = null
  for (let page = 0; page < 20; page++) {
    const u = new URL('https://api.whop.com/api/v1/payments')
    u.searchParams.set('company_id', process.env.WHOP_COMPANY_ID)
    u.searchParams.set('first', '100')
    u.searchParams.set('direction', 'desc')
    if (cursor) u.searchParams.set('after', cursor)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` }, cache: 'no-store' })
    if (!r.ok) break
    const j = await r.json()
    const rows = j.data || []
    if (!rows.length) break
    out.push(...rows)
    const oldest = Date.parse(rows[rows.length - 1]?.created_at || 0)
    if ((oldest && oldest < since) || !j.page_info?.has_next_page) break
    cursor = j.page_info.end_cursor
  }
  return out
}

/**
 * Contacts that carry a machine tag, so have state worth maintaining.
 * The other ~46,000 are cold, hold none of these tags, and nothing about
 * them can change, so reading them nightly would be 90 wasted pages.
 */
async function taggedContacts() {
  const out = []
  for (const tag of ['customer-active', 'customer-churned', 'customer-never-paid']) {
    let after = null
    for (let page = 0; page < 100; page++) {
      const body = {
        locationId: process.env.GHL_LOCATION_ID, pageLimit: 500,
        filters: [{ field: 'tags', operator: 'eq', value: tag }],
        sort: [{ field: 'dateAdded', direction: 'asc' }],
      }
      if (after) body.searchAfter = after
      const j = await ghl('/contacts/search', 'POST', body)
      const rows = j.contacts || []
      if (!rows.length) break
      out.push(...rows)
      after = rows[rows.length - 1]?.searchAfter
      if (!after) break
    }
  }
  const seen = new Set()
  return out.filter(c => (seen.has(c.id) ? false : seen.add(c.id)))
}

module.exports = async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: 'unauthorised' })

  const params = new URL(req.url, 'http://x').searchParams
  const mode = params.get('mode') === 'nightly' ? 'nightly' : 'rolling'
  const dry = params.get('dry') === '1'
  const only = normEmail(params.get('email') || '')
  const part = Math.max(0, Number(params.get('part') || 0))
  const of = Math.max(1, Number(params.get('of') || 1))
  const started = Date.now()

  try {
    /* Gather. Both clients throw rather than return a short list: at
       concurrency 8 Whop rate-limited and silently dropped 851
       memberships, which would have marked paying customers churned. */
    /* NIGHTLY MUST READ EVERY PAYMENT, NOT A WINDOW.
       A 400-day window looked like a sensible optimisation and was a
       serious bug: anyone whose last payment predates it has no payment
       row, so the resolver concludes they never paid, and the pass tries
       to replace customer-churned with customer-never-paid. Caught in a
       dry run wanting to do exactly that to 1,238 people in one quarter.

       Spend and payment history are cumulative facts. A partial read of
       them is not a smaller truth, it is a different and wrong one.

       The hourly pass only ever ADDS from a short window and never
       decides segment from it, so 5 days is fine there. */
    const [memberships, fbSubscribers, fbCustomers, productTitles] = await Promise.all([
      whop.fetchAllMemberships(),
      fanbasis.fetchSubscribers(),
      fanbasis.fetchCustomers(),
      whop.fetchProducts(),
    ])

    /* Payments: v2 for the nightly pass because it is page-numbered and
       so can be fetched concurrently, 62 seconds against 268 for the
       cursor-paged v1. v2 does not carry the email, so ids are resolved
       through the membership list. Verified: 338 of 338 sampled paid
       payments resolved, and revenue reconciles to $505,367 against the
       $503k v1 reports for Whop.

       The hourly pass keeps v1, because it only wants the last few days
       and a cursor is the right tool for that. */
    let payments
    if (mode === 'nightly') {
      const raw = await whop.fetchAllPaymentsV2()
      const idx = whop.userEmailIndex(memberships)
      payments = raw.map(p => whop.normalisePaymentV2(p, idx, productTitles))
    } else {
      payments = await recentPayments(5)
    }

    const table = buildTruthTable({ memberships, payments, fbCustomers, fbSubscribers, productTitles })
    const gathered = Math.round((Date.now() - started) / 1000)

    /* Boards and every card on them, read once. Placement needs to know
       where someone already is, and looking that up per contact would be
       9,400 searches. */
    const pipelines = (await ghl(`/opportunities/pipelines?locationId=${process.env.GHL_LOCATION_ID}`)).pipelines || []
    const pipelinesByName = new Map(pipelines.map(p => [p.name, p]))
    const stageNameById = new Map()
    for (const p of pipelines) for (const st of p.stages || []) stageNameById.set(st.id, st.name)
    /* PAGE 101 DOES NOT EXIST.
       GHL refuses `page` beyond 100 on opportunity search: it returns
       400 SEARCH_USE_START_AFTER_PAGINATION. So the moment a board passed
       10,000 cards, this read threw, the whole reconcile aborted without
       writing, and it stayed dead. Nothing else reported it, because
       failing closed looks identical to having nothing to do.

       The cursor in meta.startAfter/startAfterId has no such limit.

       Boards are read concurrently because this is now the slowest step
       by a distance: 29,401 cards over 294 sequential requests took 157
       seconds against a 300 second function limit, leaving nothing for
       the work the reconcile actually exists to do. */
    const cardsByContact = new Map()
    const managed = pipelines.filter(p => require('../../lib/placement').boardByName(p.name))
    await Promise.all(managed.map(async p => {
      let after = null, afterId = null
      for (let guard = 0; guard < 600; guard++) {
        const q = `/opportunities/search?location_id=${process.env.GHL_LOCATION_ID}&pipeline_id=${p.id}&limit=100` +
                  (afterId ? `&startAfter=${after}&startAfterId=${encodeURIComponent(afterId)}` : '')
        const j = await ghl(q)
        const rows = j.opportunities || []
        for (const o of rows) {
          const cid = o.contactId || o.contact?.id
          if (!cid) continue
          if (!cardsByContact.has(cid)) cardsByContact.set(cid, [])
          cardsByContact.get(cid).push({ id: o.id, pipelineId: o.pipelineId, pipelineStageId: o.pipelineStageId })
        }
        if (rows.length < 100) break
        after = j.meta?.startAfter
        afterId = j.meta?.startAfterId
        if (!afterId) break            // no cursor means no more pages we can reach
      }
    }))

    /* Every contact carrying a machine tag, read once and indexed by all
       of their addresses. Avoids a per-person lookup later. */
    const byEmail = new Map()
    if (!only) {
      for (const c of await taggedContacts()) for (const e of emailsOf(c)) if (!byEmail.has(e)) byEmail.set(e, c)
    }

    /* Choose who to check. */
    let targets = []
    if (only) {
      targets = [only]
    } else if (mode === 'rolling') {
      const t = new Set()
      for (const p of payments) { const e = normEmail(p?.user?.email); if (e) t.add(e) }
      for (const s of fbSubscribers) {
        const e = normEmail(s?.customer?.email)
        if (e && fanbasis.isActiveSubscription(s.subscription)) t.add(e)
      }
      targets = [...t]
    } else {
      /* Everyone the processors know, plus anyone already tagged, so a
         tag that should no longer be there still gets cleaned up. */
      const t = new Set([...table.keys()])
      for (const e of byEmail.keys()) if (table.has(e)) t.add(e)
      targets = [...t].sort()
      if (of > 1) targets = targets.filter((_, i) => i % of === part)
    }

    /* Converge. */
    let checked = 0, drift = 0, created = 0, failed = 0, writes = 0
    let cardsMade = 0, cardsMoved = 0, cardsGone = 0
    const examples = []
    for (const email of targets) {
      const person = table.get(email)
      checked++
      if (!person) continue
      if (writes >= MAX_WRITES) break
      try {
        /* A dry run has to actually COMPARE, or it reports zero drift
           whatever the state of the data, which is worse than no dry run
           at all: it looks like a passing test. */
        if (dry) {
          const want = desiredTags(person)
          const contact = byEmail.has(email) ? byEmail.get(email) : await findContact(email)
          if (!contact) { if (want.length) { drift++; if (examples.length < 10) examples.push({ email, wouldCreate: want }) } ; continue }
          const has = new Set(contact.tags || [])
          const add = want.filter(t => !has.has(t))
          const remove = [...has].filter(t => OWNED.test(t) && !HISTORICAL.test(t) && !want.includes(t))
          if (add.length || remove.length) {
            drift++
            if (examples.length < 10) examples.push({ email, add, remove })
          }
          continue
        }
        const contact = byEmail.has(email) ? byEmail.get(email) : undefined
        const r = await applyAuthoritative(email, person, {
          create: mode === 'nightly', name: person.name, contact,
        })

        /* Cards, from the same state that just drove the tags. Placement
           is derived every run and never stored, so a board cannot drift
           away from the truth the way the old one-off population did. */
        const cid = contact?.id || (await findContact(email))?.id
        if (cid) {
          const tagsNow = new Set([...(contact?.tags || []), ...(r.added || [])])
          for (const t of (r.removed || [])) tagsNow.delete(t)
          const want = desiredPlacement(person, [...tagsNow])
          const plan = planCards(want, cardsByContact.get(cid) || [], { pipelinesByName, stageNameById })
          for (const c of plan.create) {
            const ok = await ghl('/opportunities/', 'POST', {
              pipelineId: c.pipelineId, locationId: process.env.GHL_LOCATION_ID, contactId: cid,
              name: (contact?.contactName || email).slice(0, 80), status: 'open', pipelineStageId: c.stageId,
            }).then(() => true).catch(() => false)
            if (ok) cardsMade++
          }
          for (const m of plan.move) {
            const ok = await ghl(`/opportunities/${m.id}`, 'PUT', {
              pipelineId: m.pipelineId, pipelineStageId: m.stageId, status: 'open',
            }).then(() => true).catch(() => false)
            if (ok) cardsMoved++
          }
          for (const rm of plan.remove) {
            const ok = await ghl(`/opportunities/${rm.id}`, 'DELETE').then(() => true).catch(() => false)
            if (ok) cardsGone++
          }
        }

        if (r.changed) {
          writes++; drift++
          if (r.created) created++
          if (examples.length < 10) examples.push({ email, added: r.added, removed: r.removed })
        }
      } catch (e) { failed++; console.error(`[reconcile] ${email}: ${e.message}`) }
    }

    const secs = Math.round((Date.now() - started) / 1000)
    const line = `[reconcile] mode=${mode}${of > 1 ? ` part=${part}/${of}` : ''} checked=${checked} DRIFT=${drift} cards=+${cardsMade}/~${cardsMoved}/-${cardsGone} created=${created} failed=${failed} gather=${gathered}s total=${secs}s`
    if (drift > Math.max(20, checked * 0.05)) console.error(`${line}  <-- HIGH DRIFT, webhooks may have stopped`)
    else console.log(line)

    return res.status(200).json({
      ok: true, mode, dry, part, of,
      candidates: targets.length, checked, drift, created, failed,
      cardsCreated: cardsMade, cardsMoved, cardsRemoved: cardsGone,
      gatherSeconds: gathered, seconds: secs, examples,
    })
  } catch (e) {
    /* A short read from either processor lands here. Doing nothing is
       always better than deciding from half the facts. */
    console.error('[reconcile] aborted without writing:', e.message)
    return res.status(500).json({ error: 'reconcile_failed', message: e.message })
  }
}

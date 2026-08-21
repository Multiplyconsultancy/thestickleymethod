/* ══════════════════════════════════════════════════════════════════════
   The only path that writes customer state into GoHighLevel.

   WHY THIS IS SPLIT IN TWO
   ------------------------
   A first version tried to both gather a person's state and decide their
   tags in one call. It cannot: Whop has no per-user filter, so asking it
   about one person returns all 6,115 memberships unfiltered. Tested
   against live data that version removed has-tsm from a real customer
   and tagged a paying Baby AI member as churned, because absent data
   read as "owns nothing".

   So the two jobs are separated, and the rule is:

       NEVER DECIDE FROM PARTIAL DATA.

   applyAuthoritative()  the caller has COMPLETE state for this person,
                         gathered in bulk. Adds and removes freely. This
                         is what the reconcile uses and it is the only
                         thing allowed to remove a tag.

   applyFromEvent()      a webhook saw ONE thing happen. Adds only what
                         that event proves and removes nothing. The
                         reconcile corrects everything else within 15
                         minutes, which is the cost of not being able to
                         ask Whop about one person.

   Historical facts (has-tsm, has-nightfall-legacy) are never removed by
   either path. Someone who bought in 2024 bought it, forever, and no
   amount of missing data should be able to erase a purchase.

   Server-only. CommonJS: no package.json in this repo.
═══════════════════════════════════════════════════════════════════════ */

const { normEmail, recencyBand, ltvBand } = require('./people')
const { locationTags } = require('./base44')

const GHL = 'https://services.leadconnectorhq.com'
const H = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY || ''}`,
  Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
})
const sleep = ms => new Promise(r => setTimeout(r, ms))

/* A DROPPED CONNECTION IS NOT AN ERROR RESPONSE, AND IT WAS NOT RETRIED.
   fetch REJECTS on ECONNRESET rather than returning a status, so the
   429/5xx retry below never saw it and the throw went straight to the
   webhook's catch. The contact had already been upserted by then, so the
   result was a contact that exists carrying no tags at all. Seen on
   ivash4enko, douglas.bailly and dirkaely2, roughly one buyer in five.
   Same failure that killed the Base44 backfill at 21,250 of 27,369. */
async function ghl(path, method = 'GET', body) {
  let lastNetworkError = null
  for (let a = 0; a < 4; a++) {
    let res
    try {
      res = await fetch(GHL + path, { method, headers: H(),
        body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
    } catch (e) {
      lastNetworkError = e
      await sleep(800 * (a + 1))
      continue
    }
    if (res.status === 429 || res.status >= 500) { await sleep(800 * (a + 1)); continue }
    const text = await res.text()
    if (!res.ok) throw new Error(`GHL ${res.status} ${path}: ${text.slice(0, 160)}`)
    try { return JSON.parse(text) } catch { return {} }
  }
  throw new Error(`GHL: gave up on ${path}${lastNetworkError ? ` (${lastNetworkError.message})` : ''}`)
}

/* ── vocabulary. Must match what phases 3 and 4 wrote, or the reconcile
      and the backfill will rewrite each other's tags forever. ───────── */
const SEG = { paying: 'customer-active', churned: 'customer-churned', stalled: 'customer-never-paid' }
const LTV = {
  under50: 'spent-under-50', '50-149': 'spent-50-149', '150-499': 'spent-150-499',
  '500-999': 'spent-500-999', '1000-2499': 'spent-1000-2499', '2500plus': 'spent-2500-plus',
}
const PLAN_FROM_TITLE = [
  [/3 month/i, 'plan-3-month'], [/6 month/i, 'plan-6-month'],
  [/coaching/i, 'plan-coaching'], [/^the stickley method\s*$/i, 'plan-1-month'],
]

/** Tags this system owns. Everything else is human-owned and untouchable. */
const OWNED = /^(customer-|spent-|churn-|plan-|cancelling$|access-comped$|has-tsm$|has-nightfall-97$|has-nightfall-legacy$|has-baby-ai$)/
/** Purchases that happened. Never removed, by anything, ever. */
const HISTORICAL = /^(has-tsm|has-nightfall-legacy)$/

/**
 * The tags a person should carry, from a COMPLETE truth-table record.
 * Same shape buildTruthTable() produces in lib/people.js.
 */
function desiredTags(p, { partialSpend = false } = {}) {
  const t = []
  if (SEG[p.segment]) t.push(SEG[p.segment])
  /* SPEND IS CUMULATIVE, SO A WINDOWED READ OF IT IS NOT A SMALLER
     TRUTH, IT IS A WRONG ONE.
     The hourly pass reads five days of payments. frankjamesdickens has
     paid $187 all time and $39 inside that window, so the hourly pass
     computed spent-under-50, removed spent-150-499, and the nightly put
     it back. Measured across one nightly part: 35 people in 1,194 were
     flapping between bands every day.
     When the caller says the payment history is partial, spend is not
     decided here at all, and applyAuthoritative leaves the existing
     band alone rather than replacing it with a smaller one. */
  if (!partialSpend && p.everPaid && LTV[p.ltvBand]) t.push(LTV[p.ltvBand])
  if (p.segment === 'churned' && p.recencyBand) t.push(`churn-${p.recencyBand}`)
  if (p.owns?.tsm) t.push('has-tsm')
  if (p.owns?.nightfall97) t.push('has-nightfall-97')
  if (p.owns?.nightfallLegacy) t.push('has-nightfall-legacy')
  if (p.owns?.babyAi) t.push('has-baby-ai')
  /* Cancelled but still inside the paid period. A distinct state: they
     have access, the ask is "resume", and a win-back offer would be
     pitching a product they can still log into. Whop exposes this as
     cancel_at_period_end with valid still true; Fanbasis has no
     equivalent field, so its members cannot be detected this way. */
  if (p.cancelling) t.push('cancelling')
  /* Comped access. Removable, unlike has-tsm: if the grant ends this
     should go with it, so it lives in OWNED rather than HISTORICAL. */
  if (p.comped) t.push('access-comped')
  if (p.paying) {
    if (p.fanbasis?.active) t.push('plan-fanbasis-legacy')
    for (const title of p.whop?.products || []) {
      const hit = PLAN_FROM_TITLE.find(([re]) => re.test(title))
      if (hit && !t.includes(hit[1])) t.push(hit[1])
    }
  }
  return [...new Set(t)]
}

/** Find by email WITHOUT upserting. Upsert matches on phone and would
    overwrite an existing contact's email, which it did to 125 people. */
async function findContact(email) {
  const j = await ghl('/contacts/search', 'POST', {
    locationId: process.env.GHL_LOCATION_ID, pageLimit: 5,
    filters: [{ field: 'email', operator: 'eq', value: email }],
  })
  return (j.contacts || [])[0] || null
}

/**
 * Every contact that is really this person, across address spellings.
 *
 * GMAIL IGNORES DOTS AND GOHIGHLEVEL DOES NOT.
 * vojtech.herlik@gmail.com and vojtechherlik@gmail.com are one inbox and
 * two GHL contacts. The webhook upserts the address as typed, the
 * reconcile looked up the dot-stripped form, and the two wrote to
 * different records. A buyer with an active paid membership sat with no
 * tags and no card while a second contact carrying his other spelling
 * looked perfectly fine. 282 addresses in this location collide this
 * way.
 *
 * GHL's email filter is exact match, so the dotted spelling cannot be
 * guessed. It has to come from the processor, which is why the truth
 * table now keeps every address as typed.
 *
 * Both records get written, deliberately. Either one is a real inbox and
 * either one might be the record a setter opens, so both have to be
 * right. Deduped by id, so a person with one contact costs one write.
 */
async function findAllContacts(email, rawEmails = []) {
  const tried = new Set()
  const out = new Map()
  for (const addr of [email, ...rawEmails].filter(Boolean)) {
    const a = String(addr).trim().toLowerCase()
    if (!a || tried.has(a)) continue
    tried.add(a)
    const j = await ghl('/contacts/search', 'POST', {
      locationId: process.env.GHL_LOCATION_ID, pageLimit: 5,
      filters: [{ field: 'email', operator: 'eq', value: a }],
    })
    for (const c of j.contacts || []) if (c?.id) out.set(c.id, c)
  }
  return [...out.values()]
}


/* ── phone ────────────────────────────────────────────────────────────
   WRITE BY ID, NEVER BY UPSERT, AND ONLY INTO A BLANK.

   Phone was banned from this file after /contacts/upsert matched on it
   and silently replaced 125 people's email addresses. That ban was right
   for upsert and wrong as a blanket rule: PUT /contacts/{id} addresses
   one known record and performs no matching at all, so it cannot repeat
   that failure.

   Leaving it banned had a cost. Whop collects a phone from 98.5% of new
   buyers, and roughly one in ten of them was landing in GHL with no
   number, which for a business that dials people minutes after they join
   means a lead nobody can call.

   Only ever fills a blank. An existing number is never touched, because
   a human or a form knows more than a payment processor does. */
async function setPhoneIfBlank(contactId, phone, currentPhone) {
  if (!contactId) return { set: false, why: 'no_contact' }
  if (String(currentPhone || '').replace(/\D/g, '').length > 6) return { set: false, why: 'already_set' }
  const clean = String(phone || '').replace(/[^0-9+]/g, '')
  if (clean.replace(/\D/g, '').length < 7) return { set: false, why: 'no_usable_phone' }
  try {
    await ghl(`/contacts/${encodeURIComponent(contactId)}`, 'PUT', { phone: clean })
  } catch (e) {
    /* GHL treats phone as a unique identifier, so it refuses a number
       that already sits on another contact. That is protective rather
       than a fault: it happens on the duplicate spellings of one person,
       and on genuine shared numbers. Report it, do not shout about it. */
    if (/duplicated contacts/i.test(e.message)) return { set: false, why: 'phone_on_another_contact' }
    throw e
  }
  return { set: true, phone: clean }
}

/**
 * THE AUTHORITATIVE PATH. Only call this with a complete record.
 * Adds what is missing, removes what is wrong, leaves history alone.
 */
async function applyAuthoritative(email, person, { create = true, name = '', contact: given, partialSpend = false } = {}) {
  const norm = normEmail(email)
  if (!norm) return { email, skipped: 'no_email' }
  if (!person || !person.segment) return { email: norm, skipped: 'unknown_to_processors' }

  const want = desiredTags(person, { partialSpend })
  /* The caller can hand us the contact it already read. A bulk pass over
     9,400 people that looks each one up individually is 9,400 searches,
     which GHL starts refusing with timeouts. Reading them once and
     passing them in turns that into 19 paged reads. */
  const contact = given !== undefined ? given : await findContact(norm)

  /* BASE44 ELIGIBILITY IS ADD-ONLY, deliberately.
     It is derived from the dialling code, but it is the one derived tag
     that must never be withdrawn. Removing it pulls the person off their
     Base44 board, and that takes a setter's column with it. A stale
     eligible tag costs an email; a withdrawn one destroys work. The tag
     is outside the OWNED pattern for the same reason, so the removal
     pass below cannot touch it either. */
  want.push(...locationTags(contact || {}))

  if (!contact) {
    if (!create) return { email: norm, skipped: 'not_in_ghl' }
    /* Phone deliberately omitted: sending it lets GHL match on phone and
       silently overwrite a different contact's email address. */
    const [first, ...rest] = String(name || person.name || '').trim().split(' ')
    await ghl('/contacts/upsert', 'POST', {
      locationId: process.env.GHL_LOCATION_ID, email: norm,
      firstName: first || undefined, lastName: rest.join(' ') || undefined, tags: want,
    })
    return { email: norm, created: true, added: want, removed: [], changed: true }
  }

  const has = new Set(contact.tags || [])
  const add = want.filter(t => !has.has(t))
  const remove = [...has].filter(t =>
    OWNED.test(t) && !HISTORICAL.test(t) && !want.includes(t) &&
    /* Never strip a spend band on a partial read. Nothing in `want` can
       justify removing it, because spend was not computed. */
    !(partialSpend && /^spent-/.test(t)))

  if (add.length) await ghl(`/contacts/${contact.id}/tags`, 'POST', { tags: add })
  if (remove.length) await ghl(`/contacts/${contact.id}/tags`, 'DELETE', { tags: remove })
  return { email: norm, created: false, added: add, removed: remove, changed: !!(add.length || remove.length) }
}

/**
 * THE WEBHOOK PATH. Adds only what the event itself proves. Removes
 * nothing, because one event never shows a person's whole position:
 * a membership going invalid does not mean they hold no other.
 *
 * The reconcile fixes the rest inside 15 minutes. That delay is the
 * price of Whop having no per-user lookup, and it is the difference
 * between "stale briefly" and Zapier's "wrong forever".
 */
async function applyFromEvent(email, { tags = [], name = '' } = {}) {
  const norm = normEmail(email)
  if (!norm) return { email, skipped: 'no_email' }
  const add = [...new Set(tags)].filter(Boolean)
  if (!add.length) return { email: norm, changed: false, added: [] }

  const contact = await findContact(norm)
  /* Same evaluation on the webhook path. A person who buys through Whop
     at 3am is a new contact nothing else will look at until the next
     reconcile, and without this they would sit off the Base44 boards
     until then. A contact created here has no phone, which resolves to
     eligible: unknown is not ineligible. */
  add.push(...locationTags(contact || {}))

  if (!contact) {
    const [first, ...rest] = String(name || '').trim().split(' ')
    await ghl('/contacts/upsert', 'POST', {
      locationId: process.env.GHL_LOCATION_ID, email: norm,
      firstName: first || undefined, lastName: rest.join(' ') || undefined, tags: add,
    })
    return { email: norm, created: true, added: add, removed: [], changed: true }
  }
  const missing = add.filter(t => !(contact.tags || []).includes(t))
  if (missing.length) await ghl(`/contacts/${contact.id}/tags`, 'POST', { tags: missing })
  return { email: norm, created: false, added: missing, removed: [], changed: !!missing.length }
}

/* ── instant placement, for the webhook path ──────────────────────────
   The reconcile alone is not good enough for the boards. A setter looking
   at a pipeline needs it to be right NOW, not within the hour, or they
   are working from a stale screen and the boards stop being trusted.

   So the webhook applies the card move itself, from the contact's tags
   after the event has been folded in. No extra processor calls: the
   event says what changed, the contact says what was already true, and
   placement is computed from the two.

   THE ONE RISK, MEASURED
   Whop has no per-user lookup, so a cancellation cannot prove the person
   holds no OTHER active membership. Measured against live data: 29 of
   5,771 people hold more than one valid membership, 0.5%. For those, a
   cancellation could move the card early, and the reconcile puts it back
   within the hour. That is the right trade against every setter working
   from an hour-old board.                                               */

/** Fold what an event proves into the tags a contact already has. */
function tagsAfterEvent(current, { add = [], remove = [] }) {
  const t = new Set(current || [])
  for (const x of remove) t.delete(x)
  for (const x of add) t.add(x)
  return [...t]
}

/**
 * Move, create or remove this contact's cards to match a tag set.
 * Reuses the same placement rules the reconcile uses, so the two can
 * never disagree about where somebody belongs.
 */
async function applyPlacement(contactId, tags, contactName = '') {
  const { desiredPlacement, planCards, boardByName } = require('./placement')
  const loc = process.env.GHL_LOCATION_ID
  const pipelines = (await ghl(`/opportunities/pipelines?locationId=${loc}`)).pipelines || []
  const pipelinesByName = new Map(pipelines.map(p => [p.name, p]))
  const stageNameById = new Map()
  for (const p of pipelines) for (const st of p.stages || []) stageNameById.set(st.id, st.name)

  /* Only this contact's cards, and only on boards we manage. */
  const cards = []
  for (const p of pipelines) {
    if (!boardByName(p.name)) continue
    const j = await ghl(`/opportunities/search?location_id=${loc}&pipeline_id=${p.id}&contact_id=${contactId}&limit=50`)
    for (const o of j.opportunities || []) {
      cards.push({ id: o.id, pipelineId: o.pipelineId, pipelineStageId: o.pipelineStageId })
    }
  }

  const plan = planCards(desiredPlacement({}, tags), cards, { pipelinesByName, stageNameById })
  let made = 0, moved = 0, gone = 0
  for (const c of plan.create) {
    await ghl('/opportunities/', 'POST', { pipelineId: c.pipelineId, locationId: loc, contactId,
      name: (contactName || 'Contact').slice(0, 80), status: 'open', pipelineStageId: c.stageId }).catch(() => null)
    made++
  }
  for (const m of plan.move) {
    await ghl(`/opportunities/${m.id}`, 'PUT', { pipelineId: m.pipelineId, pipelineStageId: m.stageId, status: 'open' }).catch(() => null)
    moved++
  }
  for (const r of plan.remove) { await ghl(`/opportunities/${r.id}`, 'DELETE').catch(() => null); gone++ }
  return { made, moved, gone }
}

module.exports = {
  findAllContacts,
  setPhoneIfBlank,
  applyAuthoritative, applyFromEvent, desiredTags, findContact, ghl,
  tagsAfterEvent, applyPlacement,
  OWNED, HISTORICAL, SEG, LTV, PLAN_FROM_TITLE,
}

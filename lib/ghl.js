/* ══════════════════════════════════════════════════════════════════════
   GoHighLevel client + the purchase emails for TSM upsells.
   Server-only. Mirrors the pattern proven in the Baby AI app.

   Everything here is best-effort: a GHL outage delays an email, it never
   breaks a charge. The caller always gets a result object, never a throw.

   Idempotency without a database
   ------------------------------
   The TSM site is static with serverless functions and no Postgres, so
   there is nowhere to record "already emailed". GHL contact tags are used
   as that store instead: a buyer is tagged when their email sends, and
   every sender checks the tag first. Same effect as a provisioned_at
   column, no infrastructure.

   Deliberately unlike the Baby AI provisioner: the tag is written AFTER a
   successful send, never before. Claiming first is what silenced four
   Baby AI buyers, because a single failed send marked them done forever.
═══════════════════════════════════════════════════════════════════════ */

const GHL_BASE = 'https://services.leadconnectorhq.com'

/* The services host sits behind Cloudflare and 403s (error 1010) on the
   default node fetch UA. A browser-like UA is required, not cosmetic. */
const HEADERS = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY || ''}`,
  Version: '2021-07-28',
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
})

const BOOKING_URL = 'https://api.leadconnectorhq.com/widget/bookings/tsm_call_with_baby'

function configured() {
  return !!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID)
}

async function ghl(path, method = 'GET', body) {
  const res = await fetch(GHL_BASE + path, {
    method,
    headers: HEADERS(),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { _raw: text } }
  if (!res.ok) {
    const err = new Error(`GHL ${res.status}: ${text.slice(0, 180)}`)
    err.status = res.status
    throw err
  }
  return json
}

async function upsertContact(email, name) {
  const [firstName, ...rest] = String(name || '').trim().split(' ')
  const r = await ghl('/contacts/upsert', 'POST', {
    email,
    firstName: firstName || undefined,
    lastName: rest.join(' ') || undefined,
    locationId: process.env.GHL_LOCATION_ID,
  })
  return r?.contact?.id || r?.id || null
}

async function contactTags(contactId) {
  try {
    const r = await ghl(`/contacts/${encodeURIComponent(contactId)}`)
    return (r?.contact?.tags || []).map(t => String(t).toLowerCase())
  } catch {
    return []          // never block a send because a tag read failed
  }
}

async function addTags(contactId, tags) {
  try {
    await ghl(`/contacts/${encodeURIComponent(contactId)}/tags`, 'POST', { tags })
  } catch (e) {
    console.error('[ghl] addTags failed:', e.message)
  }
}

/* ── The emails ──────────────────────────────────────────────────── */

const wrap = (inner) => `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;color:#0f1b2a;background:#fff">
  <p style="font-size:11px;letter-spacing:2px;color:#0EC4E6;font-weight:700;margin:0 0 10px">THE STICKLEY METHOD</p>
  ${inner}
  <p style="font-size:13px;color:#8a94a0;margin:26px 0 0">Reply to this email if anything looks wrong with your order.</p>
</div>`

const button = (href, label) => `<p style="text-align:center;margin:26px 0">
  <a href="${href}" style="background:#0a2540;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 32px;border-radius:9px;display:inline-block">${label}</a>
</p>`

const TEMPLATES = {
  call: (name) => ({
    tag: 'tsm-call-booked',
    subject: "You're booked in with Baby, pick your slot",
    html: wrap(`
      <p style="font-size:16px;line-height:1.6;margin:0 0 14px">${name ? `Hey ${name.split(' ')[0]},` : 'Hey,'}</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 14px">Your payment went through and your one to one with Baby is confirmed. One thing left: <b>pick your slot</b>.</p>
      ${button(BOOKING_URL, 'Book my call &rarr;')}
      <p style="font-size:15px;line-height:1.6;margin:0 0 8px"><b>What happens next</b></p>
      <ul style="font-size:15px;line-height:1.7;padding-left:20px;margin:0 0 18px;color:#3a4a5c">
        <li>A 20 minute video call, one to one with Baby</li>
        <li>Bring your questions, all of them</li>
        <li>Baby writes you a custom plan afterwards</li>
        <li>That plan is loaded into your Baby AI, so it answers from it every day</li>
        <li>3 months of Baby AI, included</li>
      </ul>
      <p style="font-size:14px;line-height:1.6;color:#5b6b7d;margin:0">Come having thought about what you most want to fix. Twenty focused minutes beats forty vague ones.</p>
      <p style="font-size:13px;line-height:1.6;color:#5b6b7d;margin:14px 0 0">If the button does not work, paste this in:<br><a href="${BOOKING_URL}" style="color:#0aaac9;word-break:break-all">${BOOKING_URL}</a></p>
    `),
  }),

  nightfall: (name) => ({
    tag: 'tsm-nightfall-sent',
    subject: 'Nightfall is on your account',
    html: wrap(`
      <p style="font-size:16px;line-height:1.6;margin:0 0 14px">${name ? `Hey ${name.split(' ')[0]},` : 'Hey,'}</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 14px">Nightfall is unlocked. All 50+ video modules are sitting in your Whop account now, alongside The Stickley Method.</p>
      ${button('https://whop.com/orders', 'Open my modules &rarr;')}
      <p style="font-size:15px;line-height:1.6;margin:0 0 8px"><b>Where to start</b></p>
      <ul style="font-size:15px;line-height:1.7;padding-left:20px;margin:0 0 18px;color:#3a4a5c">
        <li>Mental Mastery, if you want the foundation first</li>
        <li>Speaking, Presence and Self Belief, if you want the fastest visible change</li>
        <li>The four numbered tracks are three part series, so watch them in order</li>
      </ul>
      <p style="font-size:14px;line-height:1.6;color:#5b6b7d;margin:0">The Stickley Method changes how you look. This is the half that decides whether it lands.</p>
    `),
  }),
}

/**
 * Send a product's purchase email, once per buyer.
 * Returns { ok, skipped?, reason?, contactId? } and never throws.
 */
async function sendPurchaseEmail(product, email, name = '') {
  if (!configured()) return { ok: false, reason: 'ghl_not_configured' }
  const build = TEMPLATES[product]
  if (!build) return { ok: false, reason: 'unknown_product' }

  const to = String(email || '').trim().toLowerCase()
  if (!to) return { ok: false, reason: 'email_required' }

  const tpl = build(name)
  try {
    const contactId = await upsertContact(to, name)
    if (!contactId) return { ok: false, reason: 'contact_upsert_failed' }

    // Already sent? Then stop. This is what makes the cron safe to re-run.
    const tags = await contactTags(contactId)
    if (tags.includes(tpl.tag)) return { ok: true, skipped: true, contactId }

    await ghl('/conversations/messages', 'POST', {
      type: 'Email',
      contactId,
      subject: tpl.subject,
      html: tpl.html,
    })

    // Tag only after the send actually succeeded, so a failure retries.
    await addTags(contactId, [tpl.tag, 'tsm-buyer'])
    return { ok: true, contactId }
  } catch (e) {
    console.error(`[ghl] ${product} email to ${to} failed:`, e.message)
    return { ok: false, reason: e.message }
  }
}

module.exports = { sendPurchaseEmail, configured, TEMPLATES, BOOKING_URL }

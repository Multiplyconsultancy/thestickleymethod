/* ══════════════════════════════════════════════════════════════════════
   GoHighLevel client + the booking email for the 1-on-1 call.
   Server-only. Mirrors the pattern proven in the Baby AI app.

   Scope is deliberately narrow: the CALL ONLY. Baby AI has its own
   onboarding in its own app, and nothing else sends email from here.

   Idempotency without a database
   ------------------------------
   This site is static with serverless functions and no Postgres, so
   there is nowhere to record "already emailed". A GHL contact tag is
   used as that store instead. Same effect as a provisioned_at column,
   no infrastructure.

   The tag is written AFTER a successful send, never before. Claiming
   first is what silenced four Baby AI buyers: one failed send marked
   them welcomed forever and no retry ever fired.
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
const CALL_TAG = 'tsm-call-booked'

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
  if (!res.ok) throw new Error(`GHL ${res.status}: ${text.slice(0, 180)}`)
  try { return JSON.parse(text) } catch { return {} }
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

async function alreadySent(contactId) {
  try {
    const r = await ghl(`/contacts/${encodeURIComponent(contactId)}`)
    return (r?.contact?.tags || []).map(t => String(t).toLowerCase()).includes(CALL_TAG)
  } catch {
    return false          // never skip a send because a tag read failed
  }
}

function callEmailHtml(name) {
  const hi = name ? `Hey ${String(name).split(' ')[0]},` : 'Hey,'
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:540px;margin:0 auto;color:#0f1b2a;background:#fff">
  <p style="font-size:11px;letter-spacing:2px;color:#0EC4E6;font-weight:700;margin:0 0 10px">THE STICKLEY METHOD</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 14px">${hi}</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 14px">Your payment went through and your one to one with Baby is confirmed. One thing left to do: <b>pick your slot</b>.</p>
  <p style="text-align:center;margin:26px 0">
    <a href="${BOOKING_URL}" style="background:#0a2540;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 32px;border-radius:9px;display:inline-block">Book my call &rarr;</a>
  </p>
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
  <p style="font-size:13px;color:#8a94a0;margin:24px 0 0">Reply to this email if anything looks wrong with your order.</p>
</div>`
}

/**
 * Send the booking email for the 1-on-1 call, once per buyer.
 * Returns { ok, skipped?, reason? } and never throws.
 */
async function sendCallEmail(email, name = '') {
  if (!configured()) return { ok: false, reason: 'ghl_not_configured' }
  const to = String(email || '').trim().toLowerCase()
  if (!to) return { ok: false, reason: 'email_required' }

  try {
    const contactId = await upsertContact(to, name)
    if (!contactId) return { ok: false, reason: 'contact_upsert_failed' }

    // Already sent? Stop. This is what makes the cron safe to re-run.
    if (await alreadySent(contactId)) return { ok: true, skipped: true }

    await ghl('/conversations/messages', 'POST', {
      type: 'Email',
      contactId,
      subject: "You're booked in with Baby, pick your slot",
      html: callEmailHtml(name),
    })

    // Tag only after the send succeeded, so a failure retries next tick.
    try { await ghl(`/contacts/${encodeURIComponent(contactId)}/tags`, 'POST', { tags: [CALL_TAG, 'tsm-buyer'] }) }
    catch (e) { console.error('[ghl] tagging failed:', e.message) }

    return { ok: true }
  } catch (e) {
    console.error(`[ghl] call email to ${to} failed:`, e.message)
    return { ok: false, reason: e.message }
  }
}

module.exports = { sendCallEmail, configured, BOOKING_URL }

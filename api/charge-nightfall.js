/* ══════════════════════════════════════════════════════════════════════
   ONE-CLICK UPSELL — charge the card already on file
   POST /api/charge-nightfall   body: { receiptId }

   Flow:
     1. Resolve the receipt from the checkout they just completed
     2. Verify it is genuinely paid, and recent (anti-abuse)
     3. Find the card Whop vaulted during that checkout
     4. Charge the upsell plan against it, off-session

   Required env vars (set in Vercel → Settings → Environment Variables):
     WHOP_API_KEY     Account API key with the permissions listed below
     WHOP_COMPANY_ID  biz_xxxxxxxx
     NIGHTFALL_PLAN_ID  defaults to plan_egsP7USJc6IRk

   API key needs: payment:charge, member:basic:read,
                  member:payment_methods:read, plan:basic:read
══════════════════════════════════════════════════════════════════════ */

const API = 'https://api.whop.com/api/v1';

/* A receipt older than this can't be used to trigger an upsell charge.
   Receipt IDs are unguessable, but this keeps the window tight so a
   leaked one can't be replayed days later. */
const MAX_RECEIPT_AGE_MIN = 60;

function whop(path, options = {}) {
  return fetch(API + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.WHOP_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

async function readJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Fallback only. Verified against the live API: this endpoint rejects
   member_id and company_id together ("Only one of member_id or
   company_id can be provided"), so pass member_id alone. */
async function findPaymentMethod(memberId) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await whop(
      `/payment_methods?member_id=${encodeURIComponent(memberId)}&direction=desc&first=10`
    );
    const body = await readJson(res);

    if (res.ok && Array.isArray(body.data) && body.data.length) {
      // Prefer a card; otherwise take the newest method on file.
      const card = body.data.find((m) => m.payment_method_type === 'card');
      return (card || body.data[0]).id;
    }
    if (!res.ok && res.status !== 404) {
      console.error(`payment_methods ${res.status}`, body);
      return null;
    }
    await sleep(600 * (attempt + 1));
  }
  return null;
}

/* CommonJS on purpose: this repo has no package.json, so Vercel's Node
   runtime treats .js as CJS. `export default` would fail to parse. */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { WHOP_API_KEY, WHOP_COMPANY_ID } = process.env;
  const planId = process.env.NIGHTFALL_PLAN_ID || 'plan_egsP7USJc6IRk';

  if (!WHOP_API_KEY || !WHOP_COMPANY_ID) {
    /* Names only, never values — enough to self-diagnose a misconfigured
       deploy without leaking anything. */
    const missing = [];
    if (!WHOP_API_KEY) missing.push('WHOP_API_KEY');
    if (!WHOP_COMPANY_ID) missing.push('WHOP_COMPANY_ID');
    console.error('not_configured — missing:', missing.join(', '));
    return res.status(500).json({ error: 'not_configured', missing });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const receiptId = (body.receiptId || '').trim();
  if (!receiptId) return res.status(400).json({ error: 'missing_receipt' });

  try {
    /* ── 1. Resolve the original purchase ───────────────────────── */
    const payRes = await whop(`/payments/${encodeURIComponent(receiptId)}`);
    const payment = await readJson(payRes);

    if (!payRes.ok) {
      console.error('receipt lookup failed', payRes.status, payment);
      return res.status(404).json({ error: 'receipt_not_found' });
    }

    /* ── 2. Verify it is real, paid, and recent ─────────────────── */
    const paid = payment.status === 'paid' || payment.substatus === 'succeeded';
    if (!paid) {
      return res.status(409).json({ error: 'original_not_paid', status: payment.status });
    }

    const createdAt = payment.created_at ? new Date(payment.created_at).getTime() : 0;
    const ageMin = createdAt ? (Date.now() - createdAt) / 60000 : Infinity;
    if (ageMin > MAX_RECEIPT_AGE_MIN) {
      return res.status(410).json({ error: 'receipt_expired' });
    }

    const memberId = payment.member?.id || payment.membership?.member_id || payment.member_id;
    if (!memberId) {
      console.error('no member on payment', payment);
      return res.status(422).json({ error: 'no_member_on_receipt' });
    }

    /* ── 3. The card Whop vaulted at checkout ───────────────────────
       The payment carries its own payment_method, so a paid receipt
       always has the card attached — no second call, and no race with
       Whop's async vaulting. The lookup below is just a safety net. */
    const paymentMethodId =
      payment.payment_method?.id || (await findPaymentMethod(memberId));

    if (!paymentMethodId) {
      // No saved card — the page falls back to hosted checkout.
      return res.status(200).json({ ok: false, reason: 'no_saved_card' });
    }

    /* ── 4. Charge the upsell ───────────────────────────────────── */
    const chargeRes = await whop('/payments', {
      method: 'POST',
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        member_id: memberId,
        payment_method_id: paymentMethodId,
        plan_id: planId,
        metadata: { source: 'upsell_step_1', origin_receipt: receiptId },
      }),
    });
    const charge = await readJson(chargeRes);

    if (!chargeRes.ok) {
      console.error('charge failed', chargeRes.status, charge);
      return res.status(200).json({ ok: false, reason: 'charge_failed' });
    }

    /* Whop settles asynchronously — 'pending' here is normal and expected.
       Confirm via webhook before granting anything you gate yourself. */
    return res.status(200).json({
      ok: true,
      paymentId: charge.id,
      status: charge.status,
      substatus: charge.substatus,
    });

  } catch (err) {
    console.error('charge-nightfall error', err);
    return res.status(200).json({ ok: false, reason: 'error' });
  }
};

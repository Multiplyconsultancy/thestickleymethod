/* ══════════════════════════════════════════════════════════════════════
   ONE-CLICK UPSELL, charge the card already on file
   POST /api/charge-upsell   body: { receiptId, product }

   Flow:
     1. Resolve the receipt from the checkout they just completed
     2. Verify it is genuinely paid, and recent (anti-abuse)
     3. Refuse if we already charged this member for this product
     4. Charge the upsell plan against the card that paid the receipt

   Required env vars (Vercel > Settings > Environment Variables):
     WHOP_API_KEY     Account API key
     WHOP_COMPANY_ID  biz_xxxxxxxx

   API key needs: payment:charge, member:basic:read,
                  member:payment_methods:read, plan:basic:read
══════════════════════════════════════════════════════════════════════ */

const API = 'https://api.whop.com/api/v1';

/* The browser sends a product key, never a plan id. If it sent the plan
   id, anyone could point this endpoint at any plan on the account. */
const PRODUCTS = {
  nightfall: { plan: 'plan_egsP7USJc6IRk', label: 'Nightfall', amount: '$97' },
  babyai:    { plan: 'plan_BbYD1fToXHLFk', label: 'Baby AI',   amount: '$29' },
};

/* A receipt older than this can't trigger an upsell charge. Receipt ids
   are unguessable, but this keeps a leaked one from being replayed. */
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

function planIdOf(payment) {
  const p = payment && payment.plan;
  return p && typeof p === 'object' ? p.id : p;
}

/* Whop has no "does this member own X" endpoint on this key, and it
   refuses payments?member_id=. Scanning the company's recent payments
   for the same member and plan is what's actually available, and it is
   enough: a duplicate would have been created seconds ago. */
async function alreadyCharged(memberId, planId, companyId) {
  const res = await whop(
    `/payments?company_id=${encodeURIComponent(companyId)}&first=50&direction=desc`
  );
  if (!res.ok) return false;                 // never block a sale on a failed check
  const body = await readJson(res);
  const cutoff = Date.now() - MAX_RECEIPT_AGE_MIN * 60 * 1000;

  return (body.data || []).some((p) => {
    const sameMember = (p.member || {}).id === memberId;
    const samePlan   = planIdOf(p) === planId;
    const recent     = p.created_at ? new Date(p.created_at).getTime() > cutoff : false;
    return sameMember && samePlan && recent;
  });
}

/* Fallback only. Verified against the live API: this endpoint rejects
   member_id and company_id together, so pass member_id alone. */
async function findPaymentMethod(memberId) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await whop(
      `/payment_methods?member_id=${encodeURIComponent(memberId)}&direction=desc&first=10`
    );
    const body = await readJson(res);
    if (res.ok && Array.isArray(body.data) && body.data.length) {
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { WHOP_API_KEY, WHOP_COMPANY_ID } = process.env;
  if (!WHOP_API_KEY || !WHOP_COMPANY_ID) {
    const missing = [];
    if (!WHOP_API_KEY) missing.push('WHOP_API_KEY');
    if (!WHOP_COMPANY_ID) missing.push('WHOP_COMPANY_ID');
    console.error('not_configured, missing:', missing.join(', '));
    return res.status(500).json({ error: 'not_configured', missing });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const receiptId = (body.receiptId || '').trim();
  const product   = PRODUCTS[(body.product || '').trim()];

  if (!receiptId) return res.status(400).json({ error: 'missing_receipt' });
  if (!product)   return res.status(400).json({ error: 'unknown_product' });

  try {
    /* ── 1. Resolve the original purchase ───────────────────────── */
    const payRes  = await whop(`/payments/${encodeURIComponent(receiptId)}`);
    const payment = await readJson(payRes);
    if (!payRes.ok) {
      console.error('receipt lookup failed', payRes.status, payment);
      return res.status(404).json({ error: 'receipt_not_found' });
    }

    /* ── 2. Verify it is real, paid, and recent ─────────────────── */
    if (!(payment.status === 'paid' || payment.substatus === 'succeeded')) {
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

    /* ── 3. Don't charge the same person twice ──────────────────── */
    if (await alreadyCharged(memberId, product.plan, WHOP_COMPANY_ID)) {
      console.log(`already charged ${memberId} for ${product.label}`);
      return res.status(200).json({ ok: true, alreadyOwned: true, product: product.label });
    }

    /* ── 4. The card that paid the receipt ──────────────────────── */
    const paymentMethodId =
      payment.payment_method?.id || (await findPaymentMethod(memberId));
    if (!paymentMethodId) {
      return res.status(200).json({ ok: false, reason: 'no_saved_card' });
    }

    /* ── 5. Charge ──────────────────────────────────────────────── */
    const chargeRes = await whop('/payments', {
      method: 'POST',
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        member_id: memberId,
        payment_method_id: paymentMethodId,
        plan_id: product.plan,
        metadata: { source: 'upsell', product: product.label, origin_receipt: receiptId },
      }),
    });
    const charge = await readJson(chargeRes);

    if (!chargeRes.ok) {
      console.error(`charge failed for ${product.label}`, chargeRes.status, charge);
      return res.status(200).json({ ok: false, reason: 'charge_failed' });
    }

    /* Whop settles asynchronously, so 'pending' here is normal. Use
       webhooks before granting anything you gate yourself. */
    return res.status(200).json({
      ok: true,
      product: product.label,
      amount: product.amount,
      paymentId: charge.id,
      status: charge.status,
      substatus: charge.substatus,
    });

  } catch (err) {
    console.error('charge-upsell error', err);
    return res.status(200).json({ ok: false, reason: 'error' });
  }
};

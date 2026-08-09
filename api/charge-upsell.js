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

const { sendPurchaseEmail } = require('../lib/ghl')

const API = 'https://api.whop.com/api/v1';

/* The browser sends a product key, never a plan id. If it sent the plan
   id, anyone could point this endpoint at any plan on the account. */
const PRODUCTS = {
  /* emailKey: which purchase email to send once the charge settles.
     Baby AI has none: its own app provisions the account and sends the
     setup link, and a second email from here would just confuse. */
  nightfall: { plan: 'plan_egsP7USJc6IRk', label: 'Nightfall', amount: '$97', emailKey: 'nightfall' },
  babyai:    { plan: 'plan_BbYD1fToXHLFk', label: 'Baby AI',   amount: '$29', emailKey: null },
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

/* Whop settles in the background: a charge comes back open/incomplete
   and only becomes paid a few seconds later. Verified on a real $29
   charge, which flipped to paid in about four seconds. Poll before
   telling anyone their card went through, so a decline or an
   unanswerable 3DS challenge is never reported as a success. */
const SETTLED  = ['paid'];
const REJECTED = ['uncollectible', 'void'];

async function waitForSettlement(paymentId) {
  for (let attempt = 0; attempt < 7; attempt++) {
    await sleep(attempt === 0 ? 1200 : 1600);
    const res = await whop(`/payments/${encodeURIComponent(paymentId)}`);
    if (!res.ok) continue;
    const p = await readJson(res);
    if (SETTLED.includes(p.status) || p.substatus === 'succeeded') return 'paid';
    if (REJECTED.includes(p.status) || p.substatus === 'failed')   return 'failed';
  }
  return 'pending';        // still working; don't claim either way
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
  const { WHOP_API_KEY, WHOP_COMPANY_ID } = process.env;

  /* GET ?selftest=1 reports whether the deployed key can actually
     charge. It sends a deliberately non-existent member and card, so
     no money can move: a 403 means the key still lacks payment:charge,
     a 404 "member not found" means the permission is granted. */
  if (req.method === 'GET' && req.query && req.query.selftest) {
    if (!WHOP_API_KEY || !WHOP_COMPANY_ID) {
      return res.status(200).json({ selftest: 'not_configured' });
    }
    const probe = await whop('/payments', {
      method: 'POST',
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        member_id: 'mber_selftest_does_not_exist',
        payment_method_id: 'payt_selftest_does_not_exist',
        plan_id: PRODUCTS.babyai.plan,
      }),
    });
    const body = await readJson(probe);
    const msg = (body && body.error && body.error.message) || '';
    const blocked = probe.status === 401 || probe.status === 403 ||
                    /permission|not authorized/i.test(msg);
    return res.status(200).json({
      selftest: blocked ? 'MISSING payment:charge' : 'payment:charge OK',
      httpStatus: probe.status,
      whopSaid: msg,
      keyEndsWith: WHOP_API_KEY.slice(-4),
      companyId: WHOP_COMPANY_ID,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
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

    /* Whop carries the buyer email on user, not member. If we ever have
       to send them to a checkout screen, prefilling this is what stops
       Whop treating them as a new visitor and re-verifying a phone
       number that is already attached to the account it just made. */
    const email = payment.user?.email || payment.member?.email || payment.email || '';
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
      return res.status(200).json({ ok: false, reason: 'no_saved_card', email });
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
      const msg = (charge && charge.error && charge.error.message) || '';
      console.error(`charge failed for ${product.label}`, chargeRes.status, charge);
      return res.status(200).json({
        ok: false,
        reason: 'charge_failed',
        httpStatus: chargeRes.status,
        whopSaid: msg,        // config detail, never customer data
        email,
      });
    }

    /* Don't report success on the acknowledgement alone. */
    const settlement = charge.id ? await waitForSettlement(charge.id) : 'pending'

    /* Email only on a settled payment, never on the acknowledgement, so
       nobody is welcomed to something they were not charged for. The
       6-hourly cron is the backstop if this send fails. */
    if (settlement === 'paid' && product.emailKey && email) {
      const mail = await sendPurchaseEmail(product.emailKey, email, payment.user?.name || '')
      if (!mail.ok) console.error(`[charge] ${product.emailKey} email failed:`, mail.reason)
    };

    if (settlement === 'failed') {
      console.error(`charge did not settle for ${product.label}`, charge.id);
      return res.status(200).json({ ok: false, reason: 'charge_declined', paymentId: charge.id, email });
    }

    return res.status(200).json({
      ok: true,
      settlement,                       // 'paid' or 'pending'
      product: product.label,
      amount: product.amount,
      paymentId: charge.id,
    });

  } catch (err) {
    console.error('charge-upsell error', err);
    return res.status(200).json({ ok: false, reason: 'error' });
  }
};

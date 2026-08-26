/* ══════════════════════════════════════════════════════════════════════════
   CLOSE WEBHOOK RECEIVER  ·  instant Base44 fulfilment

   Close fires this the moment a closer sets a lead's status to
   "Base44 — Monthly" or "Base44 — Annual". It runs the same idempotent sync
   the 5-minute cron runs, so the buyer is granted and emailed in seconds
   instead of waiting for the next poll.

   SECURITY
   The payload is deliberately IGNORED. Nothing in the request body can
   create, name or price a grant: the handler only says "go and look at
   Close now", and the sync then reads the real state from Close itself.
   So a forged request cannot invent a sale — the worst it can do is make
   the sync run early, which is harmless and idempotent. Access is still
   gated on CLOSE_SYNC_SECRET in the query string.

   The 5-minute cron stays as the safety net. Webhooks do occasionally fail
   to deliver, and the `close-synced` tag means both paths can run without
   any risk of granting twice.
══════════════════════════════════════════════════════════════════════════ */

module.exports = async (req, res) => {
  const supplied = String(req.query.key || '')
    || String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!supplied || supplied !== process.env.CLOSE_SYNC_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = `https://${host}`;

  try {
    const r = await fetch(`${base}/api/cron/close-sync?commit=1`, {
      headers: { Authorization: `Bearer ${process.env.CLOSE_SYNC_SECRET}` },
    });
    const out = await r.json().catch(() => null);
    const processed = (out && out.processed) || 0;
    const emailed = ((out && out.report) || []).filter((x) => x.emailed).length;
    console.log(`[close-sale] webhook run: processed=${processed} emailed=${emailed}`);
    // Always 200: a non-2xx makes Close retry, and the sync is idempotent so
    // a retry would achieve nothing but noise.
    return res.status(200).json({ ok: true, processed, emailed });
  } catch (e) {
    console.error('[close-sale] sync trigger failed:', e.message);
    return res.status(200).json({ ok: true, note: 'sync trigger failed, cron will catch it' });
  }
};

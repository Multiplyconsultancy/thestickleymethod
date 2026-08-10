"use strict";

/* ══════════════════════════════════════════════════════════════════
   FUNNEL ROUTER

   Three funnels share the same upsell pages; a `flow` flag decides the
   route. It arrives once as ?flow= on the entry redirect and is kept in
   sessionStorage so it survives a hosted-checkout bounce through
   whop.com (plan redirects can't carry per-funnel state, this can).

     (none/tsm)  TSM buyer:      babyai -> call -> nightfall -> done
     ba          Baby AI buyer:  call -> nightfall -> welcome page
     nf          Nightfall buyer: babyai -> call -> done (skip nightfall)

   The receipt id is persisted the same way, so a buyer who fell back to
   hosted checkout mid-funnel gets one-click back on the next step.
══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  var qs = new URLSearchParams(window.location.search);

  var store = { get: function () { return null; }, set: function () {} };
  try { store = {
    get: function (k) { return sessionStorage.getItem(k); },
    set: function (k, v) { sessionStorage.setItem(k, v); },
  }; } catch (e) { /* storage blocked: flags survive via URL only */ }

  var urlReceipt = qs.get('receipt') || qs.get('receipt_id') || qs.get('receiptId') ||
                   qs.get('payment_id') || qs.get('session_id');
  if (urlReceipt) store.set('tsm-receipt', urlReceipt);
  var receipt = urlReceipt || store.get('tsm-receipt');

  var urlFlow = qs.get('flow');
  if (urlFlow) store.set('tsm-flow', urlFlow);
  var flow = urlFlow || store.get('tsm-flow') || '';

  /* Route rewrites come FIRST, so the carry step below decorates the
     final targets. The one-click script reads the decline link at click
     time, so it inherits the right exit without knowing flows exist. */
  if (flow === 'ba') {
    // Baby AI entry: the funnel ends at the app's welcome page.
    document.querySelectorAll('a[href^="/purchase/done"]').forEach(function (a) {
      a.setAttribute('href', 'https://ai.thestickleymethod.com/welcome');
    });
  }
  if (flow === 'nf') {
    // Nightfall entry: they already own Nightfall, skip its page.
    document.querySelectorAll('a[href^="/purchase/nightfall"]').forEach(function (a) {
      a.setAttribute('href', '/purchase/done');
    });
  }

  if (!receipt && !flow) return;
  document.querySelectorAll('a[href^="/purchase/"]').forEach(function (a) {
    var href = a.getAttribute('href');
    var extra = [];
    if (receipt && href.indexOf('receipt=') === -1) extra.push('receipt=' + encodeURIComponent(receipt));
    if (flow && href.indexOf('flow=') === -1) extra.push('flow=' + encodeURIComponent(flow));
    if (!extra.length) return;
    a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') + extra.join('&'));
  });
});

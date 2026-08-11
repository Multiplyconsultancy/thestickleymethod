"use strict";

/* Whop calls this when the embedded checkout succeeds. We forward the
   receipt id to the upsell funnel, which is what lets the one-click
   button charge the card Whop just vaulted.

   Whop passes (planId, receiptId). Older embed builds have passed a
   single object instead, so accept both shapes rather than losing the
   receipt to a signature change. */
function tsmReceiptFrom(a, b) {
  if (typeof b === 'string' && b) return b;
  if (typeof a === 'string' && a.indexOf('pay_') === 0) return a;
  var o = (b && typeof b === 'object') ? b : (a && typeof a === 'object' ? a : null);
  if (o) return o.receiptId || o.receipt_id || o.receipt || o.id || '';
  return '';
}

window.tsmCheckoutComplete = function (planId, receiptId) {
  var receipt = tsmReceiptFrom(planId, receiptId);
  /* Name the funnel explicitly even though tsm is the default. It seeds
     sessionStorage on the first upsell page, so if this buyer later falls
     back to hosted checkout, /purchase/resume reads a known flow instead
     of inferring one from the product and exiting them into the Baby AI
     funnel. */
  var next = '/purchase/babyai?flow=tsm';
  if (receipt) next += '&receipt=' + encodeURIComponent(receipt);
  try { console.log('[tsm] checkout complete, receipt:', receipt || 'NONE'); } catch (e) {}
  window.location.href = next;
};

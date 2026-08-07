"use strict";

/* Whop calls this when the embedded checkout succeeds. We forward the
   receipt id to the upsell page, which is what lets the one-click
   button charge the card Whop just vaulted. */
window.tsmCheckoutComplete = function (planId, receiptId) {
  var next = '/purchase/babyai';
  if (receiptId) next += '?receipt=' + encodeURIComponent(receiptId);
  window.location.href = next;
};

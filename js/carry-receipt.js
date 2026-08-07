"use strict";

/* The receipt id only lands on the first upsell page, but the one-click
   charge lives further down the funnel. Append it to every internal
   /purchase/ link so it survives each hop. */
document.addEventListener('DOMContentLoaded', function () {
  var qs = new URLSearchParams(window.location.search);
  var receipt = qs.get('receipt') || qs.get('receipt_id') || qs.get('receiptId') ||
                qs.get('payment_id') || qs.get('session_id');
  if (!receipt) return;

  document.querySelectorAll('a[href^="/purchase/"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href.indexOf('receipt=') !== -1) return;
    a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') +
                   'receipt=' + encodeURIComponent(receipt));
  });
});

"use strict";

/* The receipt id only lands on the first upsell page, but the one-click
   charge lives further down the funnel. Append it to every internal
   /purchase/ link so it survives each hop.

   Also carries `flow`. flow=ba marks the Baby AI direct funnel (bought
   Baby AI first, not TSM): same upsell pages, but the funnel EXITS to
   the Baby AI welcome page instead of /purchase/done, so a direct buyer
   ends up where their setup email points rather than at a TSM receipt
   page that means nothing to them. */
document.addEventListener('DOMContentLoaded', function () {
  var qs = new URLSearchParams(window.location.search);
  var receipt = qs.get('receipt') || qs.get('receipt_id') || qs.get('receiptId') ||
                qs.get('payment_id') || qs.get('session_id');
  var flow = qs.get('flow');

  /* Baby AI funnel: the end of the line is the app's welcome page. Doing
     this FIRST means the carry step below never decorates it, and the
     one-click script (which reads the decline link at click time) sends
     buyers there too, without knowing flows exist. */
  if (flow === 'ba') {
    document.querySelectorAll('a[href^="/purchase/done"]').forEach(function (a) {
      a.setAttribute('href', 'https://ai.thestickleymethod.com/welcome');
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

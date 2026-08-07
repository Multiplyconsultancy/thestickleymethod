"use strict";

/* The receipt id only lands on the first upsell page, but the one-click
   charge lives further down the funnel. Append it to every internal
   /purchase/ link so it survives each hop. */
document.addEventListener('DOMContentLoaded', function () {
  var receipt = new URLSearchParams(window.location.search).get('receipt');
  if (!receipt) return;

  document.querySelectorAll('a[href^="/purchase/"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href.indexOf('receipt=') !== -1) return;
    a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') +
                   'receipt=' + encodeURIComponent(receipt));
  });
});

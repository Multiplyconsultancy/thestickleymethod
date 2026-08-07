"use strict";

/* ══════════════════════════════════════════════════════════════════
   ONE-CLICK UPSELL BUTTONS

   If we arrived from checkout with a receipt id, these charge the card
   already on file via /api/charge-upsell. No navigation, no re-entry.

   Without a receipt (direct visit), or if the charge can't be made,
   every button stays a plain link to Whop's hosted checkout, so the
   offer always works one way or another.

   Each button declares what it sells:
     <a class="js-one-click"
        data-product="nightfall"          key the server maps to a plan
        data-amount="$97"
        data-done-label="NIGHTFALL ADDED">
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  var buttons = document.querySelectorAll('.js-one-click');
  if (!buttons.length) return;

  var receipt = new URLSearchParams(window.location.search).get('receipt');
  if (!receipt) return;              // no receipt, leave them as plain links

  var first   = buttons[0];
  var product = first.getAttribute('data-product');
  if (!product) return;

  var amount   = first.getAttribute('data-amount') || '';
  var doneLbl  = first.getAttribute('data-done-label') || 'ADDED';
  var original = {
    label: first.querySelector('.oc-label').textContent,
    sub:   first.querySelector('.sm').textContent
  };
  var done = false;

  // We can charge the saved card, so say exactly that.
  var chargeNote = first.getAttribute('data-charge-note') ||
                   ('Your card on file will be charged ' + amount + '. One click, no re-entry.');
  buttons.forEach(function (b) { b.querySelector('.sm').textContent = chargeNote; });

  function setState(cls, labelText, subText) {
    buttons.forEach(function (b) {
      b.classList.remove('is-working', 'is-done', 'is-error');
      if (cls) b.classList.add(cls);
      b.querySelector('.oc-label').textContent = labelText;
      b.querySelector('.sm').textContent = subText;
    });
  }

  function goNext(delay) {
    /* Whatever the decline link points at is the next step in the
       funnel. Read it rather than hardcoding, so reordering the pages
       can't strand anyone here. */
    var declineEl = document.querySelector('.us-decline');
    var next = declineEl ? declineEl.getAttribute('href') : '/purchase/done';
    buttons.forEach(function (b) { b.setAttribute('href', next); });
    setTimeout(function () { window.location.href = next; }, delay);
  }

  function onClick(e) {
    if (done) return;                 // already bought, let the link work
    e.preventDefault();
    if (first.classList.contains('is-working')) return;

    setState('is-working', 'CHARGING YOUR CARD…', 'One moment, do not close this page.');

    fetch('/api/charge-upsell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId: receipt, product: product })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.alreadyOwned) {
          done = true;
          setState('is-done', '✓ ' + doneLbl, 'This is already on your account.');
          goNext(1800);
        } else if (data && data.ok) {
          done = true;
          setState('is-done', '✓ ' + doneLbl, 'Charged ' + amount + '. It is on your account now.');
          goNext(2200);
        } else {
          // Fall back to hosted checkout rather than dead-ending the sale.
          setState('is-error', original.label, 'Tap again to complete it on Whop.');
          done = true;
        }
      })
      .catch(function () {
        setState('is-error', original.label, 'Tap again to complete it on Whop.');
        done = true;
      });
  }

  buttons.forEach(function (b) { b.addEventListener('click', onClick); });
});

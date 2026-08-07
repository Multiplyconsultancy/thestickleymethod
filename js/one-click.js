"use strict";

/* ══════════════════════════════════════════════════════════════════
   ONE-CLICK UPSELL BUTTON

   If we arrived from checkout with a receipt id, the button charges
   the card already on file via /api/charge-nightfall — no navigation.

   If there's no receipt (direct visit, or the charge can't be made),
   it silently stays a normal link to Whop's hosted checkout, so the
   offer always works one way or another.
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* There is more than one buy button on the page now, so every one of
     them has to charge, update and redirect together. */
  var buttons = document.querySelectorAll('.js-one-click');
  if (!buttons.length) return;

  var receipt = new URLSearchParams(window.location.search).get('receipt');
  if (!receipt) return;                 // no receipt → leave it as a plain link

  var original = {
    label: buttons[0].querySelector('.oc-label').textContent,
    sub:   buttons[0].querySelector('.sm').textContent
  };
  var done = false;

  // We can charge the saved card, so promise exactly that.
  buttons.forEach(function (b) {
    b.querySelector('.sm').textContent =
      'Your card on file will be charged $97. One click, no re-entry.';
  });

  function setState(cls, labelText, subText) {
    buttons.forEach(function (b) {
      b.classList.remove('is-working', 'is-done', 'is-error');
      if (cls) b.classList.add(cls);
      b.querySelector('.oc-label').textContent = labelText;
      b.querySelector('.sm').textContent = subText;
    });
  }

  function onClick(e) {
    if (done) return;                   // already bought, let the link work
    e.preventDefault();

    if (buttons[0].classList.contains('is-working')) return;
    setState('is-working', 'CHARGING YOUR CARD…', 'One moment — do not close this page.');

    fetch('/api/charge-nightfall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId: receipt })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          done = true;
          setState('is-done', '✓ NIGHTFALL ADDED', 'Charged $97. It is in your account now.');
          /* Whatever the decline link points at is the next step in the
             funnel — read it rather than hardcoding, so reordering the
             pages can't strand anyone here. */
          var declineEl = document.querySelector('.us-decline');
          var next = declineEl ? declineEl.getAttribute('href') : '/purchase/done';
          buttons.forEach(function (b) { b.setAttribute('href', next); });
          setTimeout(function () { window.location.href = next; }, 2200);
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

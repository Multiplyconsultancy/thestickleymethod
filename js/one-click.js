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

  var btn = document.getElementById('one-click');
  if (!btn) return;

  var receipt = new URLSearchParams(window.location.search).get('receipt');
  if (!receipt) return;                 // no receipt → leave it as a plain link

  var label    = btn.querySelector('.oc-label');
  var sub      = btn.querySelector('.sm');
  var original = { label: label.textContent, sub: sub.textContent };
  var done     = false;

  // We can charge the saved card, so promise exactly that.
  sub.textContent = 'Your card on file will be charged $97. One click, no re-entry.';

  function setState(cls, labelText, subText) {
    btn.classList.remove('is-working', 'is-done', 'is-error');
    if (cls) btn.classList.add(cls);
    label.textContent = labelText;
    sub.textContent   = subText;
  }

  btn.addEventListener('click', function (e) {
    if (done) return;                   // already bought — let the link work
    e.preventDefault();

    if (btn.classList.contains('is-working')) return;
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
          btn.setAttribute('href', '/upsell/step-2');
          setTimeout(function () { window.location.href = '/upsell/step-2'; }, 2200);
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
  });
});

"use strict";

/* ══════════════════════════════════════════════════════════════════
   ONE-CLICK UPSELL BUTTONS

   If we arrived from checkout with a receipt id, these charge the card
   already on file via /api/charge-upsell. No navigation, no re-entry.

   Without a receipt (direct visit), or if the charge can't be made,
   every button stays a plain link to Whop's hosted checkout, so the
   offer always works one way or another.

   A page can sell MORE THAN ONE product (the call page also carries the
   audit downsell popup), so buttons are grouped by data-product and each
   group charges and updates independently:
     <a class="js-one-click"
        data-product="call"               key the server maps to a plan
        data-amount="$497"
        data-done-label="CALL BOOKED"
        data-armed-label="CHARGE MY CARD"
        data-booking-url="https://...">   optional: go here on success
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  var all = document.querySelectorAll('.js-one-click');
  if (!all.length) return;

  /* Our own callback sends ?receipt=, but a redirect configured in the
     Whop dashboard may name it differently. Accept any of them rather
     than silently falling back to hosted checkout. */
  var qs = new URLSearchParams(window.location.search);
  var receipt = qs.get('receipt') || qs.get('receipt_id') || qs.get('receiptId') ||
                qs.get('payment_id') || qs.get('session_id');
  try { receipt = receipt || sessionStorage.getItem('tsm-receipt'); } catch (e) {}
  if (!receipt) return;              // no receipt, leave them as plain links
  var flow = qs.get('flow');
  try { flow = flow || sessionStorage.getItem('tsm-flow') || ''; } catch (e) { flow = flow || ''; }

  var groups = {};
  all.forEach(function (b) {
    var p = b.getAttribute('data-product');
    if (!p) return;
    (groups[p] = groups[p] || []).push(b);
  });

  function goNext(buttons, delay, overrideUrl) {
    /* The page's main decline link is the next step in the funnel. Read
       it rather than hardcoding, so reordering pages can't strand
       anyone here. (querySelector returns the first match, which is the
       page's own decline, not the popup's.) */
    var declineEl = document.querySelector('.us-decline');
    var next = overrideUrl || (declineEl ? declineEl.getAttribute('href') : '/purchase/done');
    buttons.forEach(function (b) { b.setAttribute('href', next); });
    setTimeout(function () { window.location.href = next; }, delay);
  }

  Object.keys(groups).forEach(function (product) {
    var buttons = groups[product];
    var first   = buttons[0];
    var amount  = first.getAttribute('data-amount') || '';
    var doneLbl = first.getAttribute('data-done-label') || 'ADDED';
    var armedLbl = first.getAttribute('data-armed-label') || '';
    var booking  = first.getAttribute('data-booking-url') || '';
    var original = {
      label: first.querySelector('.oc-label').textContent,
      sub:   first.querySelector('.sm').textContent
    };
    var done = false;

    // We can charge the saved card, so say exactly that.
    var chargeNote = first.getAttribute('data-charge-note') ||
                     ('One-time payment of ' + amount + '.');
    buttons.forEach(function (b) {
      b.querySelector('.sm').textContent = chargeNote;
      if (armedLbl) {
        var lbl = b.querySelector('.oc-label');
        var arrow = lbl.querySelector('.cta-arrow');
        lbl.textContent = armedLbl;
        if (arrow) lbl.appendChild(arrow);
      }
    });

    function setState(cls, labelText, subText) {
      buttons.forEach(function (b) {
        b.classList.remove('is-working', 'is-done', 'is-error');
        if (cls) b.classList.add(cls);
        b.querySelector('.oc-label').textContent = labelText;
        b.querySelector('.sm').textContent = subText;
      });
    }

    /* If we have to fall back to a checkout screen, carry the buyer's
       email onto it. Without this Whop treats them as a new visitor,
       tries to create a second account, and the phone number they
       verified minutes ago collides with the one already on file. */
    function prefill(email) {
      if (!email) return;
      buttons.forEach(function (b) {
        var href = b.getAttribute('href') || '';
        if (href.indexOf('whop.com/checkout') === -1) return;
        if (href.indexOf('email=') !== -1) return;
        var sep = href.indexOf('?') > -1 ? '&' : '?';
        b.setAttribute('href', href + sep + 'email=' + encodeURIComponent(email) +
                               '&email.disabled=1');
      });
    }

    function onClick(e) {
      if (done) return;               // already bought, let the link work
      e.preventDefault();
      if (first.classList.contains('is-working')) return;

      /* Guard: an offer with no checkout wired yet moves them on rather
         than leaving them on a button that does nothing. */
      if ((first.getAttribute('href') || '').indexOf('#REPLACE') === 0) {
        done = true;
        goNext(buttons, 0);
        return;
      }

      setState('is-working', 'CHARGING YOUR CARD…', 'Confirming with your bank, do not close this page.');

      fetch('/api/charge-upsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: receipt, product: product, flow: flow })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && data.alreadyOwned) {
            done = true;
            setState('is-done', '✓ ' + doneLbl, 'This is already on your account.');
            goNext(buttons, 1800);
          } else if (data && data.ok && data.settlement === 'pending') {
            /* Accepted but not settled yet. Say so rather than claiming a
               payment that might still fail. */
            done = true;
            setState('is-done', '✓ ' + doneLbl, 'Payment is processing. We will email you once it clears.');
            goNext(buttons, 2600, booking || null);
          } else if (data && data.ok) {
            done = true;
            if (booking) {
              setState('is-done', '✓ ' + doneLbl, 'Charged ' + amount + '. Pick your slot next.');
              goNext(buttons, 1800, booking);
            } else {
              setState('is-done', '✓ ' + doneLbl, 'Charged ' + amount + '. It is on your account now.');
              goNext(buttons, 2200);
            }
          } else if (data && data.reason === 'charge_declined') {
            // The bank refused it. Send them to a form that can ask for 3DS.
            prefill(data.email);
            setState('is-error', original.label, 'That card was declined. Tap again to pay another way.');
            done = true;
          } else {
            // Fall back to hosted checkout rather than dead-ending the sale.
            prefill(data && data.email);
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
});

"use strict";

/* ══════════════════════════════════════════════════════════════════
   UPSELL COUNTDOWN

   The deadline is stored in sessionStorage per page, so the clock
   does NOT reset when someone refreshes — if it says 15 minutes,
   they really do get 15 minutes, once.

   At zero the CTA is genuinely replaced, so "this offer closes"
   is a true statement rather than a decorative timer.
   Set MINUTES to 0 to hide the countdown entirely.
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  var MINUTES = 15;

  var wrap    = document.getElementById('us-timer');
  var minEl   = document.getElementById('t-min');
  var secEl   = document.getElementById('t-sec');
  var cta     = document.querySelector(".btn-accept"); // retained for future use
  var offerNote = document.querySelector('.us-offer-note');
  if (!wrap || !minEl || !secEl) return;

  if (!MINUTES) { wrap.style.display = 'none'; return; }

  var key      = 'tsm-upsell-deadline:' + window.location.pathname;
  var deadline = parseInt(sessionStorage.getItem(key), 10);

  if (!deadline || isNaN(deadline)) {
    deadline = Date.now() + MINUTES * 60 * 1000;
    sessionStorage.setItem(key, String(deadline));
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* At zero the clock simply disappears — the offer and its button stay
     exactly as they are. Nothing on the page tells them it has closed. */
  function expire() {
    wrap.style.display = 'none';
  }

  function tick() {
    var left = deadline - Date.now();
    if (left <= 0) { expire(); return; }
    var total = Math.floor(left / 1000);
    minEl.textContent = String(Math.floor(total / 60));
    secEl.textContent = pad(total % 60);
    requestAnimationFrame(function () { setTimeout(tick, 250); });
  }

  tick();
});

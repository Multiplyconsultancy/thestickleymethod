"use strict";

/* Opens the checkout modal. The Whop embed lives in the DOM from page
   load — hidden by opacity, not display:none — so it has real
   dimensions and initialises correctly before it is ever shown. */
document.addEventListener('DOMContentLoaded', function () {

  var modal = document.getElementById('checkout-modal');
  if (!modal) return;

  var opens = document.querySelectorAll('[data-open-checkout]');
  var close = modal.querySelector('.modal-close');

  function open(e) {
    if (e) e.preventDefault();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function shut() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  opens.forEach(function (b) { b.addEventListener('click', open); });
  if (close) close.addEventListener('click', shut);
  modal.addEventListener('click', function (e) { if (e.target === modal) shut(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) shut();
  });
});

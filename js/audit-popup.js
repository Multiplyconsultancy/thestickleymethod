"use strict";

/* The call page's decline gets intercepted exactly once with the $147
   audit offer. Close it, or decline again, and they continue to the
   next funnel step as normal. */
document.addEventListener('DOMContentLoaded', function () {
  var decline = document.getElementById('decline-main');
  var popup = document.getElementById('audit-popup');
  if (!decline || !popup) return;

  var shown = false;
  decline.addEventListener('click', function (e) {
    if (shown) return;               // second time through, let them leave
    e.preventDefault();
    shown = true;
    popup.classList.add('open');
  });

  function shut() { popup.classList.remove('open'); }
  var close = popup.querySelector('.audit-popup-close');
  if (close) close.addEventListener('click', shut);
  popup.addEventListener('click', function (e) { if (e.target === popup) shut(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup.classList.contains('open')) shut();
  });
});

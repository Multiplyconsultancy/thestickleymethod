"use strict";

/* Before/after sliders. The knob (plus its invisible halo) is the only drag
   handle, so a swipe anywhere else scrolls the rail natively. Same gesture
   split as the funnel, where the two fighting each other was glitchy. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.tf').forEach(function (tf) {
    var after = tf.querySelector('.tf-after'),
        div   = tf.querySelector('.tf-div'),
        knob  = tf.querySelector('.tf-knob');
    function set(clientX) {
      var r = tf.getBoundingClientRect(),
          p = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
      after.style.clipPath = 'inset(0 0 0 ' + p + '%)';
      div.style.left = p + '%';
      knob.style.left = p + '%';
    }
    knob.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      knob.setPointerCapture(e.pointerId);
      set(e.clientX);
    });
    knob.addEventListener('pointermove', function (e) {
      if (knob.hasPointerCapture && knob.hasPointerCapture(e.pointerId)) set(e.clientX);
    });
  });

  var rail = document.querySelector('.tf-rail');
  function step(dir) {
    var card = rail && rail.querySelector('.tf');
    if (!card) return;
    rail.scrollBy({ left: dir * (card.getBoundingClientRect().width + 18), behavior: 'smooth' });
  }
  var p = document.getElementById('tf-prev'), n = document.getElementById('tf-next');
  if (p) p.addEventListener('click', function () { step(-1); });
  if (n) n.addEventListener('click', function () { step(1); });
});

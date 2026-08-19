/* nav background after 40px, sticky mobile CTA after the hero leaves */
var nav = document.getElementById('nav'), sticky = document.getElementById('sticky');
addEventListener('scroll', function () {
  nav.classList.toggle('stuck', scrollY > 40);
  sticky.classList.toggle('show', scrollY > innerHeight * 0.9);
}, { passive: true });

/* scroll reveal, staggered across grids */
var io = new IntersectionObserver(function (es) {
  es.forEach(function (e, i) {
    if (!e.isIntersecting) return;
    // cap the stagger: a long batch must not leave the tail invisible for seconds
    setTimeout(function () { e.target.classList.add('in'); }, Math.min(i, 6) * 60);
    io.unobserve(e.target);
  });
}, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.rise').forEach(function (el) { io.observe(el); });

/* accordion: one open at a time, same as both reference funnels */
document.querySelectorAll('.q').forEach(function (d) {
  d.addEventListener('toggle', function () {
    if (!d.open) return;
    document.querySelectorAll('.q[open]').forEach(function (o) { if (o !== d) o.open = false; });
  });
});

/* Before / after. THE KNOB is the only slider handle: dragging it (or the
   generous invisible halo around it) moves the divider, and a drag anywhere
   else on the card is left alone so it scrolls the rail to the next
   transformation. Splitting the gestures this way is what stops the two
   fighting each other on touch screens. */
document.querySelectorAll('.ba').forEach(function (ba) {
  var after = ba.querySelector('.ba-after'),
      div   = ba.querySelector('.ba-div'),
      knob  = ba.querySelector('.ba-knob');

  function set(clientX) {
    var r = ba.getBoundingClientRect(),
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
  ba.addEventListener('pointermove', function (e) { if (down) set(e.clientX); });
  ba.addEventListener('pointerup',     function () { down = false; });
  ba.addEventListener('pointercancel', function () { down = false; });
});

/* Theme switch — PROTOTYPE ONLY, remove before launch.
   Persists so the choice survives navigating between the two pages. */
(function () {
  var KEY = 'bs-theme';
  try { if (localStorage.getItem(KEY) === 'light') document.documentElement.dataset.theme = 'light'; } catch (e) {}
  var b = document.createElement('button');
  b.className = 'themer';
  function label() { b.textContent = document.documentElement.dataset.theme === 'light' ? 'Dark theme' : 'Light theme'; }
  label();
  b.addEventListener('click', function () {
    var light = document.documentElement.dataset.theme === 'light';
    if (light) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = 'light';
    try { localStorage.setItem(KEY, light ? 'dark' : 'light'); } catch (e) {}
    label();
  });
  addEventListener('DOMContentLoaded', function () { document.body.appendChild(b); });
})();


/* Rotating wheel. Fixed height, so no layout shift when a phrase is long. */
(function () {
  var w = document.getElementById('wheel');
  if (!w) return;
  var ul = w.querySelector('ul'), items = w.querySelectorAll('li');
  if (!items.length) return;
  var i = 0, on = true;
  function paint() {
    var h = items[0].getBoundingClientRect().height;
    ul.style.transform = 'translateY(' + (-(i * h) + w.clientHeight / 2 - h / 2) + 'px)';
    items.forEach(function (el, n) { el.classList.toggle('on', n === i); });
  }
  paint();
  addEventListener('resize', paint);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  new IntersectionObserver(function (e) { on = e[0].isIntersecting; }).observe(w);
  setInterval(function () { if (on) { i = (i + 1) % items.length; paint(); } }, 2200);
})();

/* Results arrows. Dragging a card moves its before/after divider, so paging
   between transformations needs its own control rather than a swipe. */
(function () {
  var rail = document.querySelector('.ba-rail');
  if (!rail) return;
  function step(dir) {
    var card = rail.querySelector('.ba');
    if (!card) return;
    var w = card.getBoundingClientRect().width + 18;
    rail.scrollBy({ left: dir * w, behavior: 'smooth' });
  }
  var p = document.getElementById('baPrev'), n = document.getElementById('baNext');
  if (p) p.addEventListener('click', function () { step(-1); });
  if (n) n.addEventListener('click', function () { step(1); });
})();

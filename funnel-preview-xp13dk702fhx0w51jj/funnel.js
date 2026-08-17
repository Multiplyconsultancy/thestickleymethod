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

/* before / after, drag or click anywhere on the card. Pointer events cover
   mouse and touch in one path. */
document.querySelectorAll('.ba').forEach(function (ba) {
  var after = ba.querySelector('.ba-after'),
      div   = ba.querySelector('.ba-div'),
      knob  = ba.querySelector('.ba-knob'),
      down  = false;

  function set(clientX) {
    var r = ba.getBoundingClientRect(),
        p = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    after.style.clipPath = 'inset(0 0 0 ' + p + '%)';
    div.style.left = p + '%';
    knob.style.left = p + '%';
  }
  ba.addEventListener('pointerdown', function (e) { down = true; ba.setPointerCapture(e.pointerId); set(e.clientX); });
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


/* Rotating band. Pauses when off screen and respects reduced motion. */
(function () {
  var el = document.getElementById('rotator');
  if (!el) return;
  var items = [
    'your daily protocol', 'the consistency you actually hit', 'every streak you build',
    'your progress photos', 'your before and after', 'your day 30, 60 and 90 reveal',
    'the things you quietly skip', 'everything you said you would do'
  ];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var i = 0, on = true, timer;
  new IntersectionObserver(function (e) { on = e[0].isIntersecting; })
    .observe(el.closest('section') || el);
  function tick() {
    if (on) {
      el.classList.add('out');
      setTimeout(function () {
        i = (i + 1) % items.length;
        el.textContent = items[i];
        el.classList.remove('out');
      }, 280);
    }
    timer = setTimeout(tick, 2400);
  }
  timer = setTimeout(tick, 2400);
})();

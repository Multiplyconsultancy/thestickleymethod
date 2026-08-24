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

/* Opt-in modal + form. Every claim CTA opens the modal; the form POSTs to
   /api/lead which stores the lead in our GHL and forwards to the partner.
   Redirect only after the server says ok. */
(function () {
  var modal = document.getElementById('lmodal');
  var f = document.getElementById('lead-form');
  if (!f || !modal) return;

  function open(e) {
    if (e) e.preventDefault();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    var first = f.querySelector('input[name="name"]');
    setTimeout(function () { if (first) first.focus(); }, 60);
  }
  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('a[href="#claim"], .lead-open').forEach(function (el) {
    el.addEventListener('click', open);
  });
  modal.querySelector('.lmodal-x').addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  var btn = f.querySelector('button'), err = f.querySelector('.lf-err');
  var label = btn.innerHTML;
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var cc = f.cc ? f.cc.value : '';
    var rawPhone = f.phone.value.trim().replace(/^0+/, '');
    var data = {
      name:  f.name.value.trim(),
      email: f.email.value.trim(),
      phone: (cc && rawPhone.indexOf('+') !== 0 ? cc : '') + rawPhone,
      company: f.company.value,
      source: f.dataset.source === 'members' ? 'members' : 'main'
    };
    if (f.consent && !f.consent.checked) { err.hidden = false; return; }
    if (data.name.length < 2 || data.email.indexOf('@') < 1 || data.phone.replace(/\D/g, '').length < 7) {
      err.hidden = false; return;
    }
    btn.disabled = true; btn.innerHTML = 'SENDING&hellip;';
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        if (!j.ok) throw new Error('failed');
        try { posthog.capture('lead_optin', { source: data.source }); } catch (e) {}
        try { window.posthog && posthog.partner && posthog.partner.capture('lead_optin', { source: data.source }); } catch (e) {}
        /* published pages live at /slug and /slug/members with no trailing
           slash, so the confirmation path is computed, not hardcoded */
        var path = location.pathname;
        if (/\.html$/.test(path)) location.href = 'confirmed.html';
        else {
          var base = path.replace(/\/(members)?$/, '');
          location.href = base + '/confirmed';
        }
      })
      .catch(function () {
        btn.disabled = false; btn.innerHTML = label; err.hidden = false;
      });
  });
})();

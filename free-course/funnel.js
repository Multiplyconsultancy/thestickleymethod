/* nav background after 40px, sticky mobile CTA after the hero leaves */
var nav = document.getElementById('nav');
addEventListener('scroll', function () {
  nav.classList.toggle('stuck', scrollY > 40);
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
        try { window.__partnerFormEvents && window.__partnerFormEvents(data); } catch (e) {}
        /* the live funnel sits at /free-course with its confirmation at the
           TOP-LEVEL /free-course-confirmed; older preview slugs keep the
           computed /slug/confirmed shape, and local files use the .html */
        var path = location.pathname;
        if (/\.html$/.test(path)) location.href = 'confirmed.html';
        else if (path.indexOf('/free-course') === 0) location.href = '/free-course-confirmed';
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


/* Country picker: full list, search, and geo preselect from our own edge
   header via /api/geo. Falls back to +44 when the country is unknown. */
(function () {
  var cc = document.getElementById('lf-cc');
  if (!cc || typeof LF_COUNTRIES === 'undefined') return;
  var btn = cc.querySelector('.lf-cc-btn'), flag = cc.querySelector('.lf-cc-flag'),
      dial = cc.querySelector('.lf-cc-dial'), hidden = cc.querySelector('input[name="cc"]'),
      panel = cc.querySelector('.lf-cc-panel'), search = cc.querySelector('.lf-cc-search'),
      list = cc.querySelector('.lf-cc-list');

  function choose(iso, d) {
    flag.textContent = lfFlag(iso);
    dial.textContent = d;
    hidden.value = d;
    panel.hidden = true;
  }
  function render(q) {
    q = (q || '').toLowerCase();
    list.innerHTML = '';
    LF_COUNTRIES.forEach(function (c) {
      if (q && c[0].toLowerCase().indexOf(q) === -1 && c[2].indexOf(q) === -1) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'lf-cc-item';
      b.innerHTML = '<span>' + lfFlag(c[1]) + '</span><span>' + c[0] + '</span><span class="d">' + c[2] + '</span>';
      b.addEventListener('click', function () { choose(c[1], c[2]); });
      list.appendChild(b);
    });
  }
  btn.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { search.value = ''; render(''); setTimeout(function () { search.focus(); }, 40); }
  });
  search.addEventListener('input', function () { render(search.value); });
  document.addEventListener('click', function (e) { if (!cc.contains(e.target)) panel.hidden = true; });

  fetch('/api/geo').then(function (r) { return r.json(); }).then(function (g) {
    if (!g.country) return;
    var hit = LF_COUNTRIES.filter(function (c) { return c[1] === g.country; })[0];
    if (hit) choose(hit[1], hit[2]);
  }).catch(function () {});
})();


/* ══════════════════════════════════════════════════════════════════════
   PARTNER FUNNEL EVENTS (Davey's spec, 2026-08-24)
   Numbered steps for his conversion report, fired on HIS PostHog instance
   ('partner'), which runs alongside ours. His snippets assume a single
   instance; ours must not receive these or his dashboard stays empty.
══════════════════════════════════════════════════════════════════════ */
(function () {
  function partner() {
    try { return window.posthog && posthog.partner ? posthog.partner : null; } catch (e) { return null; }
  }

  /* ?debug -> verbose event logging in the console, both projects */
  try {
    if (new URLSearchParams(location.search).has('debug')) {
      if (partner()) partner().debug();
      if (window.posthog && posthog.debug) posthog.debug();
    }
  } catch (e) {}

  /* step 1 and step 3 pageviews, by which page this actually is */
  try {
    var path = location.pathname, page = null;
    if (/free-course-confirmed/.test(path) || /confirmed\.html$/.test(path)) page = '03_page_view';
    else if (/free-course/.test(path) || /\.html$/.test(path)) page = '01_page_view';
    if (page && partner()) partner().capture(page, { funnel: 'looksmaxxing', path: path });
  } catch (e) {}

  /* step 2 + identify are fired from the form success handler below */
  window.__partnerFormEvents = function (data) {
    var p = partner();
    if (!p) return;
    try {
      var parts = data.name.split(/\s+/);
      p.identify(p.get_distinct_id(), {
        email: data.email,
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' '),
        phone: data.phone
      });
    } catch (e) {}
    try {
      p.capture('02_form_submitted', {
        funnel: 'looksmaxxing',
        path: location.pathname,
        cta_source: data.source,
        destination: 'confirmation'
      });
    } catch (e) {}
  };
})();

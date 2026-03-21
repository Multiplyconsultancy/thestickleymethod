"use strict";

document.addEventListener('DOMContentLoaded', function () {

  /* ── 1. MOBILE NAV ──────────────────────────────────────────── */
  var hamburger   = document.getElementById('hamburger');
  var mobileNav   = document.getElementById('mobile-nav');
  var mobileClose = document.getElementById('mobile-close');
  var backdrop    = document.getElementById('nav-backdrop');
  var mnavLinks   = document.querySelectorAll('[data-close]');

  function openNav() {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.classList.remove('show');
    document.body.style.overflow = '';
  }
  if (hamburger)   hamburger.addEventListener('click', openNav);
  if (mobileClose) mobileClose.addEventListener('click', closeNav);
  if (backdrop)    backdrop.addEventListener('click', closeNav);
  mnavLinks.forEach(function (l) { l.addEventListener('click', closeNav); });

  /* ── 2. HEADER HIDE/SHOW ────────────────────────────────────── */
  var header  = document.getElementById('header');
  var lastY   = 0;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 60);
    if (header && mobileNav && !mobileNav.classList.contains('open')) {
      header.classList.toggle('hide', y > lastY && y > 180);
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  /* ── 3. PHOENIX CANVAS ANIMATION ────────────────────────────── */
  var FRAME_COUNT  = 121;
  var FPS          = 24;
  var FRAME_DELAY  = Math.round(1000 / FPS);   // ~41ms
  var REPEAT_AFTER = 17000;                     // ms pause before replay

  var phoenixFrames = [];
  var loadedCount   = 0;

  function padNum(n) { return ('000' + n).slice(-4); }

  /* Draw a single frame centred + cover-fitted onto a canvas */
  function drawFrame(ctx, canvas, img) {
    if (!ctx || !img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var iw = img.naturalWidth,  ih = img.naturalHeight;
    var cw = canvas.width,      ch = canvas.height;
    var scale = Math.min(cw / iw, ch / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  /*
   * makeAnimator — returns a play() function for a given canvas.
   * Plays all 121 frames once, then schedules a replay after REPEAT_AFTER ms.
   */
  function makeAnimator(ctx, canvas) {
    var timer   = null;
    var playing = false;

    function play() {
      if (!ctx || playing) return;
      playing = true;
      var frame = 0;
      clearInterval(timer);

      timer = setInterval(function () {
        if (phoenixFrames[frame]) drawFrame(ctx, canvas, phoenixFrames[frame]);
        frame++;
        if (frame >= FRAME_COUNT) {
          clearInterval(timer);
          playing = false;
          setTimeout(function () { if (!playing) play(); }, REPEAT_AFTER);
        }
      }, FRAME_DELAY);
    }

    return play;
  }

  /* ── Logo canvas (header) ────────────────────────────────── */
  var logoCanvas = document.getElementById('logo-canvas');
  var logoCtx    = logoCanvas ? logoCanvas.getContext('2d') : null;
  var playLogo   = logoCtx ? makeAnimator(logoCtx, logoCanvas) : null;

  /* ── Footer canvas ───────────────────────────────────────── */
  var footerCanvas = document.getElementById('footer-canvas');
  var footerCtx    = footerCanvas ? footerCanvas.getContext('2d') : null;
  var playFooter   = footerCtx ? makeAnimator(footerCtx, footerCanvas) : null;
  var footerTriggered = false;

  /* Load all frames; kick off logo animation once enough are ready */
  for (var i = 0; i < FRAME_COUNT; i++) {
    (function (idx) {
      var img = new Image();
      img.onload = function () {
        phoenixFrames[idx] = img;
        loadedCount++;
        // Show first frame as a still on both canvases
        if (idx === 0) {
          if (logoCtx)   drawFrame(logoCtx,   logoCanvas,   img);
          if (footerCtx) drawFrame(footerCtx, footerCanvas, img);
        }
        // Start logo animation once first 15 frames are ready
        if (loadedCount === 15 && playLogo) playLogo();
      };
      img.src = 'frames/frame_' + padNum(idx + 1) + '.png';
    })(i);
  }

  /* Trigger footer animation when it scrolls into view */
  if (footerCanvas && playFooter) {
    var footerObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !footerTriggered) {
          footerTriggered = true;
          playFooter();
          footerObs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    footerObs.observe(footerCanvas);
  }

  /* ── 4. STATS COUNTER ───────────────────────────────────────── */
  var statNums = document.querySelectorAll('.stat-num[data-target]');

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    var dur    = 1600;
    var start  = null;
    function step(ts) {
      if (!start) start = ts;
      var p     = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var statsObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { statNums.forEach(animateCounter); statsObs.disconnect(); }
    });
  }, { threshold: 0.5 });
  var statsEl = document.getElementById('stats');
  if (statsEl) statsObs.observe(statsEl);

  /* ── 5. LEARN CAROUSEL (infinite loop) ──────────────────────── */
  buildCarousel({
    trackId:  'learn-track',
    prevId:   'learn-prev',
    nextId:   'learn-next',
    dotsId:   'learn-dots',
    cardSel:  '.learn-card',
    loop:     true
  });

  /* ── 6. REVIEWS CAROUSEL (transform-based, dots) ────────────── */
  buildCarousel({
    trackId:  'rev-track',
    prevId:   'rev-prev',
    nextId:   'rev-next',
    dotsId:   'rev-dots',
    cardSel:  '.review-card',
    loop:     true
  });

  /* ── 7. RESULTS TABS ─────────────────────────────────────────── */
  var rtabs    = document.querySelectorAll('.rtab');
  var rContent = document.querySelectorAll('.results-content');
  rtabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.getAttribute('data-tab');
      rtabs.forEach(function (t) { t.classList.remove('active'); });
      rContent.forEach(function (c) { c.classList.remove('active'); });
      tab.classList.add('active');
      var c = document.querySelector('[data-content="' + key + '"]');
      if (c) c.classList.add('active');
    });
  });

  /* ── 8. SCROLL FADE-UP ───────────────────────────────────────── */
  var fadeObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); fadeObs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(function (el) { fadeObs.observe(el); });

  /* ══════════════════════════════════════════════════════════
     HELPER — transform-based carousel with loop + dots
  ══════════════════════════════════════════════════════════ */
  function buildCarousel(opts) {
    var track    = document.getElementById(opts.trackId);
    var prevBtn  = document.getElementById(opts.prevId);
    var nextBtn  = document.getElementById(opts.nextId);
    var dotsWrap = document.getElementById(opts.dotsId);
    if (!track) return;

    var viewport = track.parentElement;  // .carousel-viewport
    var cards = track.querySelectorAll(opts.cardSel);
    var total = cards.length;
    if (!total) return;

    var idx  = 0;
    var GAP  = 14;

    function cardWidth() {
      return (cards[0] ? cards[0].offsetWidth : 260) + GAP;
    }

    function goTo(n) {
      idx = opts.loop ? ((n % total) + total) % total : Math.max(0, Math.min(n, total - 1));
      track.style.transform = 'translateX(-' + (idx * cardWidth()) + 'px)';
      // Animate entering card (fade-up)
      if (cards[idx]) {
        cards[idx].classList.remove('entering');
        void cards[idx].offsetWidth;
        cards[idx].classList.add('entering');
      }
      if (dotsWrap) {
        dotsWrap.querySelectorAll('.dot').forEach(function (d, i) {
          d.classList.toggle('active', i === idx);
        });
      }
      if (!opts.loop) {
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx >= total - 1;
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(idx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(idx + 1); });

    if (dotsWrap) {
      dotsWrap.querySelectorAll('.dot').forEach(function (dot, i) {
        dot.addEventListener('click', function () { goTo(i); });
      });
    }

    // Drag / swipe — listeners on viewport so touch works without prior tap
    var startX = 0, startIdx = 0, dragging = false;

    track.addEventListener('mousedown', function (e) {
      startX = e.clientX; startIdx = idx; dragging = true;
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      track.style.transition = 'none';
      track.style.transform  = 'translateX(-' + (startIdx * cardWidth() - (e.clientX - startX)) + 'px)';
    });
    document.addEventListener('mouseup', function (e) {
      if (!dragging) return;
      dragging = false;
      track.style.transition = '';
      var delta = e.clientX - startX;
      goTo(Math.abs(delta) > 55 ? (delta < 0 ? startIdx + 1 : startIdx - 1) : startIdx);
    });

    // Touch on viewport (not track) so swipe works without a prior tap
    viewport.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX; startIdx = idx;
    }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      var delta = e.changedTouches[0].clientX - startX;
      goTo(Math.abs(delta) > 45 ? (delta < 0 ? startIdx + 1 : startIdx - 1) : startIdx);
    });

    goTo(0);
    window.addEventListener('resize', function () { goTo(idx); });
  }

});

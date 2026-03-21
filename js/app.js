"use strict";

document.addEventListener('DOMContentLoaded', function () {

  /* ── 1. MOBILE NAV ──────────────────────────────────────────── */
  var hamburger   = document.getElementById('hamburger');
  var mobileNav   = document.getElementById('mobile-nav');
  var mobileClose = document.getElementById('mobile-close');
  var mnavLinks   = document.querySelectorAll('[data-close]');

  function openNav() {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeNav() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  if (hamburger)   hamburger.addEventListener('click', openNav);
  if (mobileClose) mobileClose.addEventListener('click', closeNav);
  mnavLinks.forEach(function (l) { l.addEventListener('click', closeNav); });

  /* ── 2. HEADER HIDE/SHOW ────────────────────────────────────── */
  var header  = document.getElementById('header');
  var lastY   = 0;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 60);
    if (!mobileNav.classList.contains('open')) {
      header.classList.toggle('hide', y > lastY && y > 180);
    }
    lastY   = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  /* ── 3. PHOENIX LOGO ANIMATION ──────────────────────────────── */
  var logoImg = document.getElementById('logo-img');

  function triggerPhoenix() {
    if (!logoImg) return;
    logoImg.classList.remove('phoenix-awaken');
    void logoImg.offsetWidth;           // force reflow to restart animation
    logoImg.classList.add('phoenix-awaken');
  }

  // On page load
  triggerPhoenix();

  // Every 17 seconds
  setInterval(triggerPhoenix, 17000);

  // Remove class after animation ends so it can re-trigger cleanly
  if (logoImg) {
    logoImg.addEventListener('animationend', function () {
      logoImg.classList.remove('phoenix-awaken');
    });
  }

  /* ── 4. STATS COUNTER ANIMATION ─────────────────────────────── */
  var statNums = document.querySelectorAll('.stat-num[data-target]');

  function animateCounter(el) {
    var target   = parseInt(el.getAttribute('data-target'), 10);
    var duration = 1600;
    var start    = null;
    function step(ts) {
      if (!start) start = ts;
      var p     = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var statsObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        statNums.forEach(animateCounter);
        statsObs.disconnect();
      }
    });
  }, { threshold: 0.5 });

  var statsEl = document.getElementById('stats');
  if (statsEl) statsObs.observe(statsEl);

  /* ── 5. LEARN CAROUSEL (infinite loop) ──────────────────────── */
  buildCarousel({
    trackId:   'learn-track',
    prevId:    'learn-prev',
    nextId:    'learn-next',
    dotsId:    'learn-dots',
    cardSel:   '.learn-card',
    loop:      true
  });

  /* ── 6. REVIEWS DRAG-SCROLL ─────────────────────────────────── */
  buildDragScroll('reviews-grid', 'rev-prev', 'rev-next');

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
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        fadeObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-up').forEach(function (el) {
    fadeObs.observe(el);
  });

  /* ── 9. FOOTER LOGO ANIMATION ON SCROLL ─────────────────────── */
  var footerLogo = document.getElementById('footer-logo');
  if (footerLogo) {
    var footerObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          footerLogo.classList.remove('animate');
          void footerLogo.offsetWidth;
          footerLogo.classList.add('animate');
          footerObs.disconnect();
        }
      });
    }, { threshold: 0.4 });
    footerObs.observe(footerLogo);
  }

  /* ══════════════════════════════════════════════════════════
     HELPER — transform-based carousel (with optional loop)
  ══════════════════════════════════════════════════════════ */
  function buildCarousel(opts) {
    var track   = document.getElementById(opts.trackId);
    var prevBtn = document.getElementById(opts.prevId);
    var nextBtn = document.getElementById(opts.nextId);
    var dotsWrap = document.getElementById(opts.dotsId);
    if (!track) return;

    var cards = track.querySelectorAll(opts.cardSel);
    var total = cards.length;
    if (!total) return;

    var idx = 0;
    var gap = 14;  // matches CSS gap

    function cardWidth() {
      return (cards[0] ? cards[0].offsetWidth : 260) + gap;
    }

    function goTo(n) {
      if (opts.loop) {
        idx = ((n % total) + total) % total;  // wrap around
      } else {
        idx = Math.max(0, Math.min(n, total - 1));
      }
      track.style.transform = 'translateX(-' + (idx * cardWidth()) + 'px)';
      updateDots();
      if (!opts.loop) {
        if (prevBtn) prevBtn.disabled = idx === 0;
        if (nextBtn) nextBtn.disabled = idx >= total - 1;
      }
    }

    function updateDots() {
      if (!dotsWrap) return;
      dotsWrap.querySelectorAll('.dot').forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(idx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(idx + 1); });

    if (dotsWrap) {
      dotsWrap.querySelectorAll('.dot').forEach(function (dot, i) {
        dot.addEventListener('click', function () { goTo(i); });
      });
    }

    // Touch + mouse drag
    var startX   = 0;
    var startIdx = 0;
    var dragging = false;

    track.addEventListener('mousedown', function (e) {
      startX = e.clientX; startIdx = idx; dragging = true;
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var delta = e.clientX - startX;
      track.style.transition = 'none';
      track.style.transform  = 'translateX(-' + (startIdx * cardWidth() - delta) + 'px)';
    });
    document.addEventListener('mouseup', function (e) {
      if (!dragging) return;
      dragging = false;
      track.style.transition = '';
      var delta = e.clientX - startX;
      goTo(Math.abs(delta) > 55 ? (delta < 0 ? startIdx + 1 : startIdx - 1) : startIdx);
    });

    track.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX; startIdx = idx;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      var delta = e.changedTouches[0].clientX - startX;
      goTo(Math.abs(delta) > 45 ? (delta < 0 ? startIdx + 1 : startIdx - 1) : startIdx);
    });

    goTo(0);
    window.addEventListener('resize', function () { goTo(idx); });
  }

  /* ══════════════════════════════════════════════════════════
     HELPER — native overflow drag-scroll (reviews)
  ══════════════════════════════════════════════════════════ */
  function buildDragScroll(gridId, prevId, nextId) {
    var grid    = document.getElementById(gridId);
    var prevBtn = document.getElementById(prevId);
    var nextBtn = document.getElementById(nextId);
    if (!grid) return;

    var isDown = false, startX = 0, scrollLeft = 0;

    grid.addEventListener('mousedown', function (e) {
      isDown = true; startX = e.pageX - grid.offsetLeft; scrollLeft = grid.scrollLeft;
    });
    document.addEventListener('mouseup',    function () { isDown = false; });
    grid.addEventListener('mouseleave', function () { isDown = false; });
    grid.addEventListener('mousemove',  function (e) {
      if (!isDown) return;
      e.preventDefault();
      grid.scrollLeft = scrollLeft - (e.pageX - grid.offsetLeft - startX) * 1.4;
    });

    function cardW() {
      var c = grid.querySelector('.review-card');
      return c ? c.offsetWidth + 14 : 290;
    }
    if (prevBtn) prevBtn.addEventListener('click', function () { grid.scrollBy({ left: -cardW(), behavior: 'smooth' }); });
    if (nextBtn) nextBtn.addEventListener('click', function () { grid.scrollBy({ left:  cardW(), behavior: 'smooth' }); });
  }

});

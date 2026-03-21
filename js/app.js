"use strict";

/* ══════════════════════════════════════════════════════════════════════
   THE STICKLEY METHOD — app.js
   Traditional website: nav, carousels, counters, tabs, scroll effects
══════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── 1. MOBILE NAV ──────────────────────────────────────────────── */
  var hamburger  = document.getElementById('hamburger');
  var mobileNav  = document.getElementById('mobile-nav');
  var mobileClose = document.getElementById('mobile-close');
  var mnavLinks  = document.querySelectorAll('[data-close]');

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

  if (hamburger) hamburger.addEventListener('click', openNav);
  if (mobileClose) mobileClose.addEventListener('click', closeNav);
  mnavLinks.forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  /* ── 2. HEADER HIDE/SHOW ON SCROLL ─────────────────────────────── */
  var header    = document.getElementById('header');
  var lastY     = 0;
  var ticking   = false;

  function handleScroll() {
    var y = window.scrollY;

    if (y > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Only hide header if menu isn't open
    if (!mobileNav.classList.contains('open')) {
      if (y > lastY && y > 200) {
        header.classList.add('hide');
      } else {
        header.classList.remove('hide');
      }
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });

  /* ── 3. STICKY MOBILE CTA BAR ───────────────────────────────────── */
  var stickyBar = document.getElementById('sticky-bar');
  var hero      = document.getElementById('hero');

  if (stickyBar && hero) {
    var heroObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          stickyBar.classList.add('show');
        } else {
          stickyBar.classList.remove('show');
        }
      });
    }, { threshold: 0.1 });
    heroObs.observe(hero);
  }

  /* ── 4. STATS COUNTER ANIMATION ─────────────────────────────────── */
  var statNums = document.querySelectorAll('.stat-num[data-target]');

  function animateCounter(el) {
    var target   = parseInt(el.getAttribute('data-target'), 10);
    var duration = 1800;
    var start    = null;

    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var val   = Math.round(eased * target);
      el.textContent = val.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var statsObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        statNums.forEach(animateCounter);
        statsObs.disconnect();
      }
    });
  }, { threshold: 0.4 });

  var statsSection = document.getElementById('stats');
  if (statsSection) statsObs.observe(statsSection);

  /* ── 5. LEARN CAROUSEL ───────────────────────────────────────────── */
  buildCarousel({
    trackId:   'learn-track',
    prevId:    'learn-prev',
    nextId:    'learn-next',
    dotsId:    'learn-dots',
    cardClass: '.learn-card'
  });

  /* ── 6. REVIEWS CAROUSEL (drag-scroll on desktop) ───────────────── */
  buildDragScroll('reviews-grid', 'rev-prev', 'rev-next');

  /* ── 7. RESULTS TABS ─────────────────────────────────────────────── */
  var rtabs    = document.querySelectorAll('.rtab');
  var rcontents = document.querySelectorAll('.results-content');

  rtabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-tab');
      rtabs.forEach(function (t) { t.classList.remove('active'); });
      rcontents.forEach(function (c) { c.classList.remove('active'); });
      tab.classList.add('active');
      var content = document.querySelector('[data-content="' + target + '"]');
      if (content) content.classList.add('active');
    });
  });

  /* ── 8. SCROLL FADE-UP ANIMATIONS ───────────────────────────────── */
  var fadeEls = document.querySelectorAll(
    '.section-header, .stat, .learn-card, .event-card, .review-card, ' +
    '.community-inner, .results-tabs, .results-display, .section-cta'
  );
  fadeEls.forEach(function (el) {
    el.classList.add('fade-up');
  });

  var fadeObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  fadeEls.forEach(function (el) { fadeObs.observe(el); });

  /* ════════════════════════════════════════════════════════════════
     HELPER — drag/touch carousel (transform-based)
  ════════════════════════════════════════════════════════════════ */
  function buildCarousel(opts) {
    var track  = document.getElementById(opts.trackId);
    var prevBtn = document.getElementById(opts.prevId);
    var nextBtn = document.getElementById(opts.nextId);
    var dotsWrap = document.getElementById(opts.dotsId);
    if (!track) return;

    var cards = track.querySelectorAll(opts.cardClass);
    var total = cards.length;
    var idx   = 0;

    var gap = parseInt(getComputedStyle(track).gap) || 16;

    function cardWidth() {
      return cards[0] ? cards[0].offsetWidth + gap : 280;
    }

    function goTo(n) {
      idx = Math.max(0, Math.min(n, total - 1));
      var offset = idx * cardWidth();
      track.style.transform = 'translateX(-' + offset + 'px)';
      updateDots();
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx >= total - 1;
    }

    function updateDots() {
      if (!dotsWrap) return;
      var dots = dotsWrap.querySelectorAll('.dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(idx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(idx + 1); });

    if (dotsWrap) {
      var dots = dotsWrap.querySelectorAll('.dot');
      dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { goTo(i); });
      });
    }

    // Touch / drag
    var startX = 0;
    var startIdx = 0;
    var dragging = false;

    track.addEventListener('mousedown', function (e) {
      startX   = e.clientX;
      startIdx = idx;
      dragging = true;
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var delta = e.clientX - startX;
      var tempOffset = startIdx * cardWidth() - delta;
      track.style.transition = 'none';
      track.style.transform  = 'translateX(-' + tempOffset + 'px)';
    });
    document.addEventListener('mouseup', function (e) {
      if (!dragging) return;
      dragging = false;
      track.style.transition = '';
      var delta = e.clientX - startX;
      if (Math.abs(delta) > 60) {
        goTo(delta < 0 ? startIdx + 1 : startIdx - 1);
      } else {
        goTo(startIdx);
      }
    });

    track.addEventListener('touchstart', function (e) {
      startX   = e.touches[0].clientX;
      startIdx = idx;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      var delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 50) {
        goTo(delta < 0 ? startIdx + 1 : startIdx - 1);
      } else {
        goTo(startIdx);
      }
    });

    // Initial state
    goTo(0);

    // Recalculate on resize
    window.addEventListener('resize', function () { goTo(idx); });
  }

  /* ════════════════════════════════════════════════════════════════
     HELPER — drag-scroll for reviews (uses native overflow scroll)
  ════════════════════════════════════════════════════════════════ */
  function buildDragScroll(gridId, prevId, nextId) {
    var grid    = document.getElementById(gridId);
    var prevBtn = document.getElementById(prevId);
    var nextBtn = document.getElementById(nextId);
    if (!grid) return;

    var isDown = false;
    var startX = 0;
    var scrollLeft = 0;

    grid.addEventListener('mousedown', function (e) {
      isDown     = true;
      startX     = e.pageX - grid.offsetLeft;
      scrollLeft = grid.scrollLeft;
    });
    document.addEventListener('mouseup', function () { isDown = false; });
    grid.addEventListener('mouseleave', function () { isDown = false; });
    grid.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x     = e.pageX - grid.offsetLeft;
      var walk  = (x - startX) * 1.5;
      grid.scrollLeft = scrollLeft - walk;
    });

    // Arrow buttons scroll by one card width
    function cardW() {
      var first = grid.querySelector('.review-card');
      return first ? first.offsetWidth + 16 : 300;
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        grid.scrollBy({ left: -cardW(), behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        grid.scrollBy({ left: cardW(), behavior: 'smooth' });
      });
    }
  }

});

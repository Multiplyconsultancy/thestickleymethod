"use strict";

/* ══════════════════════════════════════════════════════════════════════════
   THE STICKLEY METHOD — app.js
   All DOM access happens inside DOMContentLoaded.
   ══════════════════════════════════════════════════════════════════════════ */

const CFG = {
  FRAME_COUNT : 121,
  FRAME_SPEED : 2.0,    // animation finishes at ~50% of scroll container
  IMAGE_SCALE : 0.85,
  FRAMES_DIR  : "frames/",
  LOADER_FPS  : 24,
  LOADER_LOOP : 20,     // first N frames loop during loading
  CANVAS_BG   : "#f5f2ed",
};

window.addEventListener("DOMContentLoaded", () => {

  gsap.registerPlugin(ScrollTrigger);

  /* ── DOM refs (ALL inside DOMContentLoaded) ─────────────────────────── */
  const loader         = document.getElementById("loader");
  const loaderCanvasEl = document.getElementById("loader-canvas");
  const loaderFill     = document.getElementById("loader-fill");
  const loaderPct      = document.getElementById("loader-pct");

  const headerEl       = document.getElementById("header");
  const headerLogo     = document.getElementById("header-logo");
  const hamburger      = document.getElementById("hamburger");
  const mobileNav      = document.getElementById("mobile-nav");
  const mobileClose    = document.getElementById("mobile-nav-close");

  const heroEl         = document.getElementById("hero");
  const canvasWrap     = document.getElementById("canvas-wrap");
  const mainCanvas     = document.getElementById("canvas");
  const darkOverlay    = document.getElementById("dark-overlay");
  const marqueeWrap    = document.getElementById("marquee-wrap");
  const marqueeText    = document.getElementById("marquee-text");
  const scrollCont     = document.getElementById("scroll-container");
  const stickyCta      = document.getElementById("sticky-cta");
  const cursorEl       = document.getElementById("cursor");

  /* ── State ───────────────────────────────────────────────────────────── */
  const frames    = new Array(CFG.FRAME_COUNT).fill(null);
  let   curFrame  = 0;
  let   lctx      = null;   // loader canvas 2d context
  let   mctx      = null;   // main canvas 2d context
  let   lenis;
  let   loopTimer = null;

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const pad = (n) => String(n).padStart(4, "0");
  const isTouch = () => window.matchMedia("(pointer: coarse)").matches;

  function commaNum(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  /* ── Canvas resize ───────────────────────────────────────────────────── */
  function resizeMain() {
    const dpr = window.devicePixelRatio || 1;
    mainCanvas.width  = window.innerWidth  * dpr;
    mainCanvas.height = window.innerHeight * dpr;
    mctx = mainCanvas.getContext("2d");
    mctx.scale(dpr, dpr);
    drawMain(curFrame);
  }

  function resizeLoader() {
    const wrap = document.getElementById("loader-canvas-wrap");
    const dpr  = window.devicePixelRatio || 1;
    const w    = wrap.clientWidth  || 300;
    const h    = wrap.clientHeight || 255;
    loaderCanvasEl.width  = w * dpr;
    loaderCanvasEl.height = h * dpr;
    lctx = loaderCanvasEl.getContext("2d");
    lctx.scale(dpr, dpr);
  }

  /* ── Draw helpers ────────────────────────────────────────────────────── */
  function drawMain(index) {
    if (!mctx) return;
    const img = frames[index];
    const W   = mainCanvas.width  / (window.devicePixelRatio || 1);
    const H   = mainCanvas.height / (window.devicePixelRatio || 1);

    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = CFG.CANVAS_BG;
    mctx.fillRect(0, 0, W, H);

    if (!img?.complete || img.naturalWidth === 0) return;

    const iW    = img.naturalWidth;
    const iH    = img.naturalHeight;
    const scale = Math.max(W / iW, H / iH) * CFG.IMAGE_SCALE;
    const dW    = iW * scale;
    const dH    = iH * scale;
    mctx.drawImage(img, (W - dW) / 2, (H - dH) / 2, dW, dH);
  }

  function drawLoader(index) {
    if (!lctx) return;
    const img = frames[index];
    if (!img?.complete || img.naturalWidth === 0) return;

    const W   = loaderCanvasEl.width  / (window.devicePixelRatio || 1);
    const H   = loaderCanvasEl.height / (window.devicePixelRatio || 1);
    const iW  = img.naturalWidth;
    const iH  = img.naturalHeight;
    const sc  = Math.min(W / iW, H / iH) * 0.95;

    lctx.clearRect(0, 0, W, H);
    lctx.drawImage(img, (W - iW * sc) / 2, (H - iH * sc) / 2, iW * sc, iH * sc);
  }

  /* ── Frame preloader ─────────────────────────────────────────────────── */
  function loadFrames() {
    return new Promise((resolve) => {
      let loaded = 0;
      let loopFrame = 0;

      // Start loader animation as soon as a few frames exist
      function maybeStartLoop() {
        if (loopTimer || !frames[0]?.complete) return;
        loopTimer = setInterval(() => {
          if (frames[loopFrame]?.complete) {
            drawLoader(loopFrame);
          }
          loopFrame = (loopFrame + 1) % CFG.LOADER_LOOP;
        }, 1000 / CFG.LOADER_FPS);
      }

      function onOne() {
        loaded++;
        const pct = Math.round((loaded / CFG.FRAME_COUNT) * 100);
        loaderFill.style.width = pct + "%";
        loaderPct.textContent  = pct + "%";
        if (loaded >= 3) maybeStartLoop();
        if (loaded >= CFG.FRAME_COUNT) resolve();
      }

      // Phase 1: first 10 immediately
      for (let i = 1; i <= Math.min(10, CFG.FRAME_COUNT); i++) {
        const img = new Image();
        img.onload = img.onerror = onOne;
        img.src    = `${CFG.FRAMES_DIR}frame_${pad(i)}.png`;
        frames[i - 1] = img;
      }
      // Phase 2: rest after brief yield
      setTimeout(() => {
        for (let i = 11; i <= CFG.FRAME_COUNT; i++) {
          const img = new Image();
          img.onload = img.onerror = onOne;
          img.src    = `${CFG.FRAMES_DIR}frame_${pad(i)}.png`;
          frames[i - 1] = img;
        }
      }, 40);
    });
  }

  /* ── Loader exit ─────────────────────────────────────────────────────── */
  function exitLoader() {
    clearInterval(loopTimer);
    loopTimer = null;

    // Reveal header so we can get logo bounding rect
    headerEl.classList.add("visible");

    const loaderWrap = document.getElementById("loader-canvas-wrap");
    const wrapRect   = loaderWrap.getBoundingClientRect();
    const logoRect   = headerLogo.getBoundingClientRect();

    const sc    = (logoRect.height * 0.9) / wrapRect.height;
    const dx    = logoRect.left + logoRect.width  / 2 - (wrapRect.left + wrapRect.width  / 2);
    const dy    = logoRect.top  + logoRect.height / 2 - (wrapRect.top  + wrapRect.height / 2);

    gsap.timeline({ defaults: { ease: "power3.inOut" } })
      .to(loaderCanvasEl, { scale: sc, x: dx, y: dy, duration: 0.8 })
      .to(["#loader-fill", "#loader-pct", "#loader-brand"], { opacity: 0, duration: 0.3 }, "-=0.6")
      .to(loader, { opacity: 0, duration: 0.35, ease: "power2.in" }, "-=0.25")
      .call(() => {
        loader.style.display = "none";
        // Setup main canvas now that loader is gone
        resizeMain();
        drawMain(0);
        initScrollExperience();
        // Show hero
        gsap.from(heroEl, { opacity: 0, y: 16, duration: 0.6, ease: "power2.out" });
        // Mobile sticky after delay
        if (isTouch()) {
          setTimeout(() => stickyShow(), 3000);
        }
      });
  }

  /* ── Lenis ───────────────────────────────────────────────────────────── */
  function initLenis() {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ── Hero → canvas circle wipe ───────────────────────────────────────── */
  function initHeroWipe() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        // Hero fades out
        heroEl.style.opacity = Math.max(0, 1 - p * 20).toString();
        // Canvas circle expands
        const wipe = Math.min(1, Math.max(0, (p - 0.005) / 0.075));
        canvasWrap.style.clipPath = `circle(${wipe * 82}% at 50% 50%)`;
      },
    });
  }

  /* ── Frame scrub ─────────────────────────────────────────────────────── */
  function initFrameScrub() {
    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      onUpdate: (self) => {
        const acc   = Math.min(self.progress * CFG.FRAME_SPEED, 1);
        const index = Math.min(Math.floor(acc * CFG.FRAME_COUNT), CFG.FRAME_COUNT - 1);
        if (index !== curFrame) {
          curFrame = index;
          requestAnimationFrame(() => drawMain(curFrame));
        }
      },
    });
  }

  /* ── Marquee ─────────────────────────────────────────────────────────── */
  function initMarquee() {
    gsap.to(marqueeText, {
      xPercent: -25,
      ease: "none",
      scrollTrigger: {
        trigger: scrollCont,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    // Fade in/out based on scroll range (30%–70%)
    ScrollTrigger.create({
      trigger: scrollCont,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        let op = 0;
        if (p > 0.28 && p < 0.72) {
          const fadeIn  = Math.min(1, (p - 0.28) / 0.04);
          const fadeOut = Math.min(1, (0.72 - p) / 0.04);
          op = Math.min(fadeIn, fadeOut);
        }
        marqueeWrap.style.opacity = op.toFixed(3);
      },
    });
  }

  /* ── Dark overlay (stats section) ───────────────────────────────────── */
  function initDarkOverlay() {
    const statsEl = document.getElementById("section-stats");
    if (!statsEl) return;

    ScrollTrigger.create({
      trigger: statsEl,
      start: "top 75%",
      end: "bottom 25%",
      scrub: true,
      onUpdate: (self) => {
        const fadeIn  = Math.min(1, self.progress / 0.1);
        const fadeOut = Math.min(1, (1 - self.progress) / 0.1);
        const op      = Math.min(fadeIn, fadeOut) * 0.93;
        darkOverlay.style.opacity = op.toFixed(3);
      },
    });
  }

  /* ── Section animations ──────────────────────────────────────────────── */
  function initSectionAnimations() {
    document.querySelectorAll(".scroll-section").forEach((section) => {
      const type     = section.dataset.anim || "fade-up";
      const persist  = section.id === "section-cta";

      // Elements to animate — exclude the section itself
      const targets  = section.querySelectorAll(
        ".eyebrow, .section-h, .section-body, .note, .btn, " +
        ".phase-row, .feature-row, .event-row, " +
        ".stats-grid, .stat, " +
        ".reviews-inner > .eyebrow, .reviews-inner > .section-h, " +
        "#carousel-viewport, #carousel-dots, " +
        ".cta-inner > *"
      );

      if (!targets.length) return;

      // Set initial (hidden) state
      function setHidden() {
        switch (type) {
          case "fade-up":    gsap.set(targets, { y: 48, opacity: 0 }); break;
          case "slide-left": gsap.set(targets, { x: -70, opacity: 0 }); break;
          case "slide-right":gsap.set(targets, { x: 70, opacity: 0 }); break;
          case "scale-up":   gsap.set(targets, { scale: 0.9, opacity: 0 }); break;
          case "clip-reveal":gsap.set(targets, { clipPath: "inset(100% 0 0 0)", opacity: 0 }); break;
          case "stagger-up": gsap.set(targets, { y: 60, opacity: 0 }); break;
          default:           gsap.set(targets, { opacity: 0 });
        }
      }
      setHidden();

      // Animate in
      function animateIn() {
        const base = { stagger: 0.10, duration: 0.8, ease: "power3.out" };
        switch (type) {
          case "fade-up":    gsap.to(targets, { y: 0, opacity: 1, ...base }); break;
          case "slide-left": gsap.to(targets, { x: 0, opacity: 1, ...base }); break;
          case "slide-right":gsap.to(targets, { x: 0, opacity: 1, ...base }); break;
          case "scale-up":   gsap.to(targets, { scale: 1, opacity: 1, ...base, ease: "power2.out" }); break;
          case "clip-reveal":gsap.to(targets, { clipPath: "inset(0% 0 0 0)", opacity: 1, ...base, duration: 1.0, ease: "power4.inOut" }); break;
          case "stagger-up": gsap.to(targets, { y: 0, opacity: 1, stagger: 0.12, duration: 0.85, ease: "power3.out" }); break;
          default:           gsap.to(targets, { opacity: 1, ...base });
        }
      }

      // Animate out
      function animateOut() {
        if (persist) return;
        setHidden();
      }

      ScrollTrigger.create({
        trigger: section,
        start: "top 78%",
        end: "bottom 10%",
        onEnter:     animateIn,
        onEnterBack: animateIn,
        onLeave:     animateOut,
        onLeaveBack: animateOut,
      });
    });
  }

  /* ── Stat counters ───────────────────────────────────────────────────── */
  function initCounters() {
    document.querySelectorAll(".stat-num").forEach((el) => {
      const target = parseFloat(el.dataset.val);
      let counted  = false;

      ScrollTrigger.create({
        trigger: el.closest(".stat") || el,
        start: "top 80%",
        onEnter: () => {
          if (counted) return;
          counted = true;
          gsap.to({ v: 0 }, {
            v: target,
            duration: 2.0,
            ease: "power2.out",
            onUpdate: function () {
              el.textContent = commaNum(this.targets()[0].v);
            },
          });
        },
        onLeaveBack: () => {
          counted = false;
          el.textContent = "0";
        },
      });
    });
  }

  /* ── Reviews carousel ────────────────────────────────────────────────── */
  function initCarousel() {
    const track   = document.getElementById("carousel-track");
    const cards   = document.querySelectorAll(".review-card");
    const dots    = document.querySelectorAll(".dot");
    if (!track || !cards.length) return;

    let active  = 0;
    let dragX   = 0;
    let dragging = false;

    function cardWidth() {
      return cards[0].offsetWidth + 16; // 16 = gap
    }

    function goTo(idx) {
      const perView = window.innerWidth >= 768 ? 2 : 1;
      const max     = Math.max(0, cards.length - perView);
      active        = Math.max(0, Math.min(idx, max));
      gsap.to(track, { x: -(active * cardWidth()), duration: 0.45, ease: "power3.out" });
      dots.forEach((d, i) => d.classList.toggle("active", i === active));
    }

    // Dots
    dots.forEach((dot) => {
      dot.addEventListener("click",    () => goTo(parseInt(dot.dataset.idx)));
      dot.addEventListener("touchend", (e) => { e.preventDefault(); goTo(parseInt(dot.dataset.idx)); });
    });

    // Touch swipe on track
    track.addEventListener("touchstart", (e) => { dragX = e.touches[0].clientX; dragging = true; }, { passive: true });
    track.addEventListener("touchend",   (e) => {
      if (!dragging) return;
      dragging = false;
      const diff = dragX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(active + (diff > 0 ? 1 : -1));
    });

    // Mouse drag
    track.addEventListener("mousedown", (e) => { dragX = e.clientX; dragging = true; e.preventDefault(); });
    window.addEventListener("mouseup",  (e) => {
      if (!dragging) return;
      dragging = false;
      const diff = dragX - e.clientX;
      if (Math.abs(diff) > 40) goTo(active + (diff > 0 ? 1 : -1));
    });

    // Recalculate on resize
    window.addEventListener("resize", () => goTo(active), { passive: true });
  }

  /* ── Mobile nav ──────────────────────────────────────────────────────── */
  function initMobileNav() {
    function openNav() {
      mobileNav.classList.add("open");
      mobileNav.setAttribute("aria-hidden", "false");
      hamburger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function closeNav() {
      mobileNav.classList.remove("open");
      mobileNav.setAttribute("aria-hidden", "true");
      hamburger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    hamburger?.addEventListener("click", openNav);
    mobileClose?.addEventListener("click", closeNav);
    document.querySelectorAll(".mobile-nav-link").forEach((l) => l.addEventListener("click", closeNav));
  }

  /* ── Nav scroll links ────────────────────────────────────────────────── */
  function initNavLinks() {
    document.querySelectorAll("[data-target]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.target);
        if (!target || !lenis) return;
        lenis.scrollTo(target, { offset: -64, duration: 1.6 });
      });
    });
  }

  /* ── Header hide on scroll ───────────────────────────────────────────── */
  function initHeaderScroll() {
    let lastY = 0;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (y > lastY && y > 120) {
        headerEl.classList.add("hidden");
      } else {
        headerEl.classList.remove("hidden");
      }
      lastY = y;
    }, { passive: true });
  }

  /* ── Mobile sticky CTA ───────────────────────────────────────────────── */
  function stickyShow() {
    stickyCta.classList.add("visible");
    stickyCta.setAttribute("aria-hidden", "false");
  }
  function initSticky() {
    if (!isTouch()) return;
    const heroH = heroEl.offsetHeight;
    window.addEventListener("scroll", () => {
      const y   = window.scrollY;
      const end = heroH + scrollCont.offsetHeight * 0.88;
      if (y > heroH * 0.7 && y < end) {
        stickyShow();
      } else {
        stickyCta.classList.remove("visible");
        stickyCta.setAttribute("aria-hidden", "true");
      }
    }, { passive: true });
  }

  /* ── Custom cursor ───────────────────────────────────────────────────── */
  function initCursor() {
    if (isTouch()) return;
    cursorEl.style.display = "block";

    const dot  = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");
    let mx = 0, my = 0, rx = 0, ry = 0;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      gsap.set(dot, { x: mx, y: my });
    }, { passive: true });

    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      gsap.set(ring, { x: rx, y: ry });
    });

    const hoverEls = "a, button, .btn, .dot";
    document.querySelectorAll(hoverEls).forEach((el) => {
      el.addEventListener("mouseenter", () => cursorEl.classList.add("hover"));
      el.addEventListener("mouseleave", () => cursorEl.classList.remove("hover"));
    });
  }

  /* ── Window resize ───────────────────────────────────────────────────── */
  window.addEventListener("resize", () => {
    resizeMain();
  }, { passive: true });

  /* ── Main scroll experience (called after loader exits) ─────────────── */
  function initScrollExperience() {
    initHeroWipe();
    initFrameScrub();
    initMarquee();
    initDarkOverlay();
    initSectionAnimations();
    initCounters();
    initHeaderScroll();
    initNavLinks();
    initSticky();
    ScrollTrigger.refresh();
  }

  /* ── Boot sequence ───────────────────────────────────────────────────── */
  initLenis();
  initCursor();
  initMobileNav();
  initCarousel();

  // Size loader canvas
  resizeLoader();

  // Load frames, then exit loader
  loadFrames().then(() => exitLoader());

}); // end DOMContentLoaded

/* ═══════════════════════════════════════════════════════════════════════════
   TSM — THE STICKLEY METHOD
   app.js — scroll-driven site engine
   Requires: Lenis, GSAP, ScrollTrigger (CDN)
   ═══════════════════════════════════════════════════════════════════════════ */

"use strict";

/* ── Config ─────────────────────────────────────────────────────────────── */
const FRAME_COUNT    = 121;
const FRAME_SPEED    = 2.0;   // animation finishes at ~50% scroll progress
const IMAGE_SCALE    = 0.85;  // 0.82-0.90 sweet spot — avoids clipping headers
const FRAMES_DIR     = "frames/";
const FRAME_EXT      = "png"; // transparent processed frames
const LOADER_FPS     = 24;
const LOADER_LOOP_TO = 20;    // frames 0–19 loop during loading

const STATS_ENTER = 0.22;
const STATS_LEAVE = 0.38;
const MARQUEE_ENTER = 0.28;
const MARQUEE_LEAVE = 0.72;

/* ── State ──────────────────────────────────────────────────────────────── */
const frames      = new Array(FRAME_COUNT).fill(null);
let   currentFrame = 0;
let   loaderDone   = false;
let   lenis;

/* ── DOM refs ────────────────────────────────────────────────────────────── */
const loader          = document.getElementById("loader");
const loaderBar       = document.getElementById("loader-bar");
const loaderPercent   = document.getElementById("loader-percent");
const loaderCanvas    = document.getElementById("loader-canvas");
const loaderCtx       = loaderCanvas.getContext("2d");

const siteHeader      = document.getElementById("site-header");
const heroSection     = document.getElementById("hero-standalone");
const canvasWrap      = document.getElementById("canvas-wrap");
const mainCanvas      = document.getElementById("canvas");
const ctx             = mainCanvas.getContext("2d");
const darkOverlay     = document.getElementById("dark-overlay");
const marqueeWrap     = document.getElementById("marquee-wrap");
const marqueeText     = document.getElementById("marquee-text");
const scrollContainer = document.getElementById("scroll-container");
const mobileStickyBtn = document.getElementById("mobile-sticky-cta");
const hamburger       = document.getElementById("nav-hamburger");
const mobileNav       = document.getElementById("mobile-nav");
const mobileClose     = document.getElementById("mobile-nav-close");
const cursorEl        = document.getElementById("custom-cursor");
const cursorDot       = cursorEl?.querySelector(".cursor-dot");
const cursorRing      = cursorEl?.querySelector(".cursor-ring");

/* ── Utility ─────────────────────────────────────────────────────────────── */
function padNum(n, len = 4) {
  return String(n).padStart(len, "0");
}

function formatStat(n) {
  // Format large numbers: 10000 → "10,000"
  return Number(n).toLocaleString("en-US");
}

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

/* ── 1. Canvas Setup ─────────────────────────────────────────────────────── */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.getContext("2d").scale(dpr, dpr);
}

function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete) return;

  const cw = mainCanvas.width  / (window.devicePixelRatio || 1);
  const ch = mainCanvas.height / (window.devicePixelRatio || 1);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw    = iw * scale;
  const dh    = ih * scale;
  const dx    = (cw - dw) / 2;
  const dy    = (ch - dh) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#080810";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

window.addEventListener("resize", () => {
  setupCanvas(mainCanvas);
  requestAnimationFrame(() => drawFrame(currentFrame));
});

/* ── 2. Loader Canvas ────────────────────────────────────────────────────── */
function setupLoaderCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const wrap = document.getElementById("loader-phoenix-wrap");
  const w    = wrap.offsetWidth;
  const h    = wrap.offsetHeight;
  loaderCanvas.width  = w * dpr;
  loaderCanvas.height = h * dpr;
  loaderCtx.scale(dpr, dpr);
}

function drawLoaderFrame(index) {
  const img = frames[index];
  if (!img || !img.complete) return;

  const cw = loaderCanvas.width  / (window.devicePixelRatio || 1);
  const ch = loaderCanvas.height / (window.devicePixelRatio || 1);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.min(cw / iw, ch / ih) * 0.95;
  const dw    = iw * scale;
  const dh    = ih * scale;
  const dx    = (cw - dw) / 2;
  const dy    = (ch - dh) / 2;

  loaderCtx.clearRect(0, 0, cw, ch);
  loaderCtx.drawImage(img, dx, dy, dw, dh);
}

/* ── 3. Frame Preloader ──────────────────────────────────────────────────── */
let loaderAnimFrame   = 0;
let loaderInterval    = null;

function startLoaderAnimation() {
  if (loaderInterval) return;
  loaderInterval = setInterval(() => {
    if (!frames[loaderAnimFrame] || !frames[loaderAnimFrame].complete) return;
    drawLoaderFrame(loaderAnimFrame);
    loaderAnimFrame = (loaderAnimFrame + 1) % LOADER_LOOP_TO;
  }, 1000 / LOADER_FPS);
}

function loadFrames() {
  return new Promise((resolve) => {
    let loaded = 0;

    function onLoad() {
      loaded++;
      const pct = Math.round((loaded / FRAME_COUNT) * 100);
      loaderBar.style.width    = pct + "%";
      loaderPercent.textContent = pct + "%";

      // Start loader animation once we have first 5 frames
      if (loaded === 5) startLoaderAnimation();

      if (loaded >= FRAME_COUNT) resolve();
    }

    // Phase 1: frames 1–10 immediately
    for (let i = 1; i <= Math.min(10, FRAME_COUNT); i++) {
      const img = new Image();
      img.onload = img.onerror = onLoad;
      img.src    = `${FRAMES_DIR}frame_${padNum(i)}.${FRAME_EXT}`;
      frames[i - 1] = img;
    }

    // Phase 2: remaining frames
    setTimeout(() => {
      for (let i = 11; i <= FRAME_COUNT; i++) {
        const img = new Image();
        img.onload = img.onerror = onLoad;
        img.src    = `${FRAMES_DIR}frame_${padNum(i)}.${FRAME_EXT}`;
        frames[i - 1] = img;
      }
    }, 50);
  });
}

/* ── 4. Loader Exit ──────────────────────────────────────────────────────── */
function exitLoader() {
  clearInterval(loaderInterval);

  const headerLogo = document.getElementById("header-logo");
  const logoRect   = headerLogo.getBoundingClientRect();
  const loaderWrap = document.getElementById("loader-phoenix-wrap");
  const wrapRect   = loaderWrap.getBoundingClientRect();

  // Target: centre of header logo
  const targetX = logoRect.left + logoRect.width  / 2 - (wrapRect.left + wrapRect.width  / 2);
  const targetY = logoRect.top  + logoRect.height / 2 - (wrapRect.top  + wrapRect.height / 2);
  const targetScale = logoRect.width / wrapRect.width;

  gsap.timeline()
    .to(loaderWrap, {
      x: targetX,
      y: targetY,
      scale: targetScale,
      duration: 0.9,
      ease: "power3.inOut"
    })
    .to("#loader-bar-wrap, #loader-percent, #loader-brand", {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in"
    }, "-=0.7")
    .to(loader, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        loader.style.display = "none";
        loaderDone = true;
        onLoaderComplete();
      }
    }, "-=0.4");
}

function onLoaderComplete() {
  // Show header
  siteHeader.classList.add("header-visible");

  // Reveal hero
  gsap.fromTo(heroSection,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
  );

  // Show mobile sticky CTA after brief delay on mobile
  if (isTouchDevice()) {
    setTimeout(() => {
      mobileStickyBtn.classList.add("visible");
    }, 2000);
  }

  // Init scroll-driven experience
  initScrollExperience();
}

/* ── 5. Lenis Smooth Scroll ──────────────────────────────────────────────── */
function initLenis() {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ── 6. Hero Transition (circle-wipe) ────────────────────────────────────── */
function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      // Hero fades as scroll begins
      heroSection.style.opacity = Math.max(0, 1 - p * 18).toString();

      // Canvas expands via circle clip-path
      const wipeProgress = Math.min(1, Math.max(0, (p - 0.005) / 0.07));
      const radius       = wipeProgress * 80;
      canvasWrap.style.clipPath = `circle(${radius}% at 50% 50%)`;

      // Draw first frame as soon as canvas is visible
      if (wipeProgress > 0 && currentFrame === 0) {
        drawFrame(0);
      }
    }
  });
}

/* ── 7. Frame-to-Scroll Binding ──────────────────────────────────────────── */
function initFrameScroll() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index       = Math.min(
        Math.floor(accelerated * FRAME_COUNT),
        FRAME_COUNT - 1
      );
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
    }
  });
}

/* ── 8. Dark Overlay ─────────────────────────────────────────────────────── */
function initDarkOverlay() {
  const fadeRange = 0.035;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;

      if (p >= STATS_ENTER - fadeRange && p <= STATS_ENTER) {
        opacity = (p - (STATS_ENTER - fadeRange)) / fadeRange;
      } else if (p > STATS_ENTER && p < STATS_LEAVE) {
        opacity = 0.92;
      } else if (p >= STATS_LEAVE && p <= STATS_LEAVE + fadeRange) {
        opacity = 0.92 * (1 - (p - STATS_LEAVE) / fadeRange);
      }

      darkOverlay.style.opacity = String(Math.max(0, Math.min(0.92, opacity)));
    }
  });
}

/* ── 9. Marquee ──────────────────────────────────────────────────────────── */
function initMarquee() {
  const fadeRange = 0.04;

  // Scroll-driven horizontal movement
  gsap.to(marqueeText, {
    xPercent: -30,
    ease: "none",
    scrollTrigger: {
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true
    }
  });

  // Fade marquee in/out based on scroll range
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;

      if (p >= MARQUEE_ENTER - fadeRange && p < MARQUEE_ENTER) {
        opacity = (p - (MARQUEE_ENTER - fadeRange)) / fadeRange;
      } else if (p >= MARQUEE_ENTER && p <= MARQUEE_LEAVE) {
        opacity = 0.06;
      } else if (p > MARQUEE_LEAVE && p <= MARQUEE_LEAVE + fadeRange) {
        opacity = 0.06 * (1 - (p - MARQUEE_LEAVE) / fadeRange);
      }

      marqueeWrap.style.opacity = String(Math.max(0, opacity));
    }
  });
}

/* ── 10. Section Animation System ────────────────────────────────────────── */
function positionSection(section) {
  const enter  = parseFloat(section.dataset.enter) / 100;
  const leave  = parseFloat(section.dataset.leave) / 100;
  const mid    = (enter + leave) / 2;
  const totalH = scrollContainer.offsetHeight;
  const winH   = window.innerHeight;

  // Place section at the midpoint of its enter/leave range
  const scrollMid = totalH * mid;
  const topPx     = scrollMid - winH / 2;
  section.style.top    = topPx + "px";
  section.style.height = winH + "px";
}

function setupSectionAnimation(section) {
  const type    = section.dataset.animation;
  const persist = section.dataset.persist === "true";
  const enter   = parseFloat(section.dataset.enter) / 100;
  const leave   = parseFloat(section.dataset.leave) / 100;

  const children = section.querySelectorAll(
    ".section-label, .section-heading, .section-body, .section-note, " +
    ".cta-button, .stat, .phase-item, .feature-item, .event-item, .review-card, " +
    ".reviews-inner > .section-label, .reviews-inner > .section-heading, " +
    ".reviews-carousel, .reviews-dots"
  );

  const tl = gsap.timeline({ paused: true });

  const staggerOpts = {
    stagger: { amount: 0.45, ease: "power1.in" },
    duration: 0.85,
    ease: "power3.out"
  };

  switch (type) {
    case "fade-up":
      tl.from(children, { y: 52, opacity: 0, ...staggerOpts });
      break;
    case "slide-left":
      tl.from(children, { x: -80, opacity: 0, ...staggerOpts });
      break;
    case "slide-right":
      tl.from(children, { x: 80, opacity: 0, ...staggerOpts });
      break;
    case "scale-up":
      tl.from(children, { scale: 0.88, opacity: 0, ...staggerOpts, ease: "power2.out" });
      break;
    case "rotate-in":
      tl.from(children, { y: 40, rotation: 2.5, opacity: 0, ...staggerOpts });
      break;
    case "stagger-up":
      tl.from(children, { y: 64, opacity: 0, stagger: { amount: 0.55 }, duration: 0.8, ease: "power3.out" });
      break;
    case "clip-reveal":
      tl.from(children, {
        clipPath: "inset(100% 0 0 0)",
        opacity: 0,
        stagger: { amount: 0.5 },
        duration: 1.1,
        ease: "power4.inOut"
      });
      break;
    default:
      tl.from(children, { opacity: 0, duration: 0.8 });
  }

  let isVisible = false;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: false,
    onUpdate: (self) => {
      const p = self.progress;

      if (p >= enter && !isVisible) {
        isVisible = true;
        tl.restart();
        section.style.opacity = "1";
        section.style.pointerEvents = "auto";
      }

      if (!persist && isVisible && p < enter) {
        isVisible = false;
        tl.reverse();
      }

      if (!persist && isVisible && p > leave) {
        // fade out gently when scrolling past
        const out = Math.min(1, (p - leave) / 0.06);
        section.style.opacity = String(1 - out);
        if (out >= 1) {
          isVisible = false;
          section.style.pointerEvents = "none";
        }
      }
    }
  });
}

/* ── 11. Counter Animations ──────────────────────────────────────────────── */
function initCounters() {
  document.querySelectorAll(".stat-number").forEach((el) => {
    const target   = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0");

    let triggered = false;

    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (!triggered && self.progress >= STATS_ENTER) {
          triggered = true;
          gsap.to({ val: 0 }, {
            val: target,
            duration: 2.2,
            ease: "power2.out",
            onUpdate: function () {
              const v = this.targets()[0].val;
              el.textContent = decimals === 0
                ? formatStat(Math.round(v))
                : v.toFixed(decimals);
            }
          });
        }
        if (triggered && self.progress < STATS_ENTER * 0.9) {
          triggered = false;
          el.textContent = "0";
        }
      }
    });
  });
}

/* ── 12. Header Hide/Show on Scroll ─────────────────────────────────────── */
function initHeaderBehaviour() {
  let lastY = 0;
  let ticking = false;

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > lastY && y > 200) {
          siteHeader.classList.add("header-hidden");
        } else {
          siteHeader.classList.remove("header-hidden");
        }
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ── 13. Mobile Reviews Carousel ─────────────────────────────────────────── */
function initReviewsCarousel() {
  const track     = document.getElementById("reviews-track");
  const dots      = document.querySelectorAll(".dot");
  const cards     = document.querySelectorAll(".review-card");
  let   activeIdx = 0;
  let   startX    = 0;
  let   isDragging = false;

  if (!track || cards.length === 0) return;

  // On desktop show 2 at a time; mobile shows 1
  const cardsPerView = () => window.innerWidth >= 768 ? 2 : 1;

  function goTo(idx) {
    const per  = cardsPerView();
    const max  = Math.max(0, cards.length - per);
    activeIdx  = Math.max(0, Math.min(idx, max));
    const pct  = -(activeIdx * (100 / per));
    gsap.to(track, { xPercent: pct, duration: 0.45, ease: "power3.out" });

    dots.forEach((d, i) => d.classList.toggle("active", i === activeIdx));
  }

  // Dot navigation
  dots.forEach((dot) => {
    dot.addEventListener("click", () => goTo(parseInt(dot.dataset.index)));
    dot.addEventListener("touchend", (e) => {
      e.preventDefault();
      goTo(parseInt(dot.dataset.index));
    });
  });

  // Touch swipe
  track.addEventListener("touchstart", (e) => {
    startX    = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  track.addEventListener("touchend", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(activeIdx + (diff > 0 ? 1 : -1));
  });

  // Mouse drag
  track.addEventListener("mousedown", (e) => {
    startX    = e.clientX;
    isDragging = true;
  });
  window.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 40) goTo(activeIdx + (diff > 0 ? 1 : -1));
  });

  // Keyboard
  track.closest(".reviews-carousel")?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft")  goTo(activeIdx - 1);
    if (e.key === "ArrowRight") goTo(activeIdx + 1);
  });
}

/* ── 14. Mobile Navigation ───────────────────────────────────────────────── */
function initMobileNav() {
  hamburger?.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", isOpen.toString());
    mobileNav.setAttribute("aria-hidden", (!isOpen).toString());
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  mobileClose?.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    hamburger?.setAttribute("aria-expanded", "false");
    mobileNav.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  });

  // Close on link tap
  document.querySelectorAll(".mobile-nav-link, .mobile-nav-cta").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      mobileNav.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    });
  });
}

/* ── 15. Custom Cursor ───────────────────────────────────────────────────── */
function initCustomCursor() {
  if (isTouchDevice() || !cursorEl) return;

  cursorEl.style.display = "block";
  document.body.style.cursor = "none";

  let mx = 0, my = 0;
  let cx = 0, cy = 0;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  }, { passive: true });

  // Ring follows with slight lag
  (function animateCursor() {
    cx += (mx - cx) * 0.15;
    cy += (my - cy) * 0.15;
    cursorRing.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateCursor);
  })();

  // Hover state
  const hoverTargets = "a, button, .cta-button, .dot, .nav-link";
  document.querySelectorAll(hoverTargets).forEach((el) => {
    el.addEventListener("mouseenter", () => cursorEl.classList.add("is-hovering"));
    el.addEventListener("mouseleave", () => cursorEl.classList.remove("is-hovering"));
  });
}

/* ── 16. Mobile Sticky CTA Scroll Listener ────────────────────────────────── */
function initMobileStickyBar() {
  if (!isTouchDevice()) return;

  let heroBottom = 0;

  function recalc() {
    heroBottom = heroSection.offsetHeight;
  }
  recalc();
  window.addEventListener("resize", recalc, { passive: true });

  let lastScrollY = 0;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    // Show once past the hero, hide near the final CTA section
    const scrollTotal = scrollContainer.offsetHeight + heroSection.offsetHeight;
    const nearEnd     = y > scrollTotal * 0.88;

    if (y > heroBottom * 0.6 && !nearEnd) {
      mobileStickyBtn.classList.add("visible");
      mobileStickyBtn.setAttribute("aria-hidden", "false");
    } else {
      mobileStickyBtn.classList.remove("visible");
      mobileStickyBtn.setAttribute("aria-hidden", "true");
    }

    lastScrollY = y;
  }, { passive: true });
}

/* ── 17. Scroll Nav Link Positioning ─────────────────────────────────────── */
function initNavLinks() {
  const links = document.querySelectorAll("[data-scroll-to]");
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = "section-" + link.dataset.scrollTo;
      const target   = document.getElementById(targetId);
      if (!target) return;

      const top = parseFloat(target.style.top) || 0;
      const destY = top + heroSection.offsetHeight;
      lenis?.scrollTo(destY, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 3) });
    });
  });
}

/* ── 18. Main Scroll Experience Initialiser ──────────────────────────────── */
function initScrollExperience() {
  // Register ScrollTrigger plugin
  gsap.registerPlugin(ScrollTrigger);

  // Setup canvases
  setupCanvas(mainCanvas);
  setupLoaderCanvas();

  // Draw first frame immediately
  drawFrame(0);

  // Position and animate each section
  document.querySelectorAll(".scroll-section").forEach((section) => {
    positionSection(section);
    setupSectionAnimation(section);
  });

  initHeroTransition();
  initFrameScroll();
  initDarkOverlay();
  initMarquee();
  initCounters();
  initReviewsCarousel();
  initHeaderBehaviour();
  initNavLinks();
  initMobileStickyBar();

  // Refresh ScrollTrigger after layout
  ScrollTrigger.refresh();
}

/* ── Boot ────────────────────────────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", async () => {
  // Init Lenis immediately so smooth scroll is ready
  initLenis();

  // Init cursor
  initCustomCursor();

  // Init mobile nav
  initMobileNav();

  // Setup canvases before loading so loader canvas is correct size
  setupLoaderCanvas();

  // Start loading frames
  await loadFrames();

  // All frames ready — exit loader
  exitLoader();
});

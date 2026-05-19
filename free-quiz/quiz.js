/* ─────────────────────────────────────────────────────────────────
   The Stickley Method — Free Aesthetic Audit
   Quiz engine with conditional-logic support.

   HOW TO ADD / CHANGE QUESTIONS
   - Add an entry to QUESTIONS. Each item has:
       id, type, title, sub, options[]
     Types: "photo" (image grid), "choice" (text grid), "scale" (1-10).
   - Conditional logic: optionally add `next: (answers) => "questionId"`.
     If omitted, the quiz advances in array order.
   - Photo options use src: "assets/images/<filename>". Drop your real
     photos in /assets/images with the filenames listed below and the
     placeholders disappear automatically.

   IMAGE FOLDERS:
   Photos go in assets/images/<category>/ — any filename works,
   just list them in the `options[]` array below in the order
   you want them to appear (softest → sharpest).
       assets/images/jawline/   ← currently 4 photos
       assets/images/eyes/      ← add when ready
       assets/images/physique/  ← add when ready
       assets/images/skin/      ← add when ready
       assets/images/hair/      ← add when ready
───────────────────────────────────────────────────────────────── */

const QUESTIONS = [
  {
    id: "jawline",
    type: "photo",
    title: "Click the photo closest to your jawline.",
    sub: "Pick the one most similar to yours — not the one you wish you had.",
    options: [
      // Order: softest → sharpest. Reorder freely.
      { value: "soft",     label: "Soft",     src: "assets/images/jawline/1ad0b375-6f7e-4d53-a3f7-fe8a15452c65.JPG" },
      { value: "average",  label: "Average",  src: "assets/images/jawline/b0feb23c-4846-42b6-acce-5dd4d876183b.JPG" },
      { value: "defined",  label: "Defined",  src: "assets/images/jawline/1b5b941d-c57b-4ee8-b129-bf4504717dfa.JPG" },
      { value: "sharp",    label: "Sharp",    src: "assets/images/jawline/a7b46954-d7da-4443-8bd4-8b7e1d840acb.JPG" },
    ],
  },
  {
    id: "eyes",
    type: "photo",
    title: "What best describes your eye area?",
    sub: "Pick the closest match — eye shape, hood, under-eye area.",
    options: [
      // Order: worst → best, left to right.
      { value: "nct",     label: "Negative tilt (NCT)",   src: "assets/images/eye-area/1.jpeg" },
      { value: "uee",     label: "Upper eyelid exposure", src: "assets/images/eye-area/2.jpeg" },
      { value: "bags",    label: "Eye bags",              src: "assets/images/eye-area/3.jpeg" },
      { value: "average", label: "Average",               src: "assets/images/eye-area/4.jpeg" },
      { value: "ideal",   label: "Ideal",                 src: "assets/images/eye-area/5.jpeg" },
    ],
  },
  {
    id: "physique",
    type: "photo",
    title: "Which physique is closest to yours right now?",
    sub: "Be honest — this calibrates the protocol.",
    options: [
      // Order: worst → best, left to right.
      { value: "obese",      label: "Obese",      src: "assets/images/physique/obese.jpeg" },
      { value: "overweight", label: "Overweight", src: "assets/images/physique/overweight.jpeg" },
      { value: "skinny",     label: "Skinny",     src: "assets/images/physique/skinny.jpeg" },
      { value: "athletic",   label: "Athletic",   src: "assets/images/physique/athletic.jpeg" },
    ],
  },
  {
    id: "skin",
    type: "photo",
    title: "What best describes your skin?",
    sub: "Texture, clarity, tone.",
    options: [
      // Order: worst → best, left to right.
      { value: "active-acne", label: "Active acne",          src: "assets/images/skin/active acne.jpeg" },
      { value: "scars",       label: "Acne scars",           src: "assets/images/skin/acne scars.jpeg" },
      { value: "oily",        label: "Oily with blackheads", src: "assets/images/skin/oily with blackheads.jpeg" },
      { value: "dry",         label: "Dry and flaky",        src: "assets/images/skin/dry and flaky.jpeg" },
      { value: "clear",       label: "Clear",                src: "assets/images/skin/clear.jpeg" },
    ],
  },
  {
    id: "hairline",
    type: "photo",
    title: "What best describes your hairline?",
    sub: "Density, frontal hairline, crown.",
    options: [
      // Order: worst → best, left to right.
      { value: "heavy",   label: "Heavy loss",       src: "assets/images/hairline/1.jpeg" },
      { value: "diffuse", label: "Diffuse thinning", src: "assets/images/hairline/2.jpeg" },
      { value: "mild",    label: "Mild thinning",    src: "assets/images/hairline/3.jpeg" },
      { value: "full",    label: "Full hairline",    src: "assets/images/hairline/4.jpeg" },
    ],
  },
  {
    id: "posture",
    type: "photo",
    title: "Which best matches your posture?",
    sub: "Side profile — head, shoulders, hip stack.",
    options: [
      // Order: worst → best, left to right.
      { value: "weak",   label: "I need help",         src: "assets/images/posture/1.jpeg" },
      { value: "ok",     label: "It could be better",  src: "assets/images/posture/2.jpeg" },
      { value: "strong", label: "My posture is great", src: "assets/images/posture/3.jpeg" },
    ],
  },
  {
    id: "confidence",
    type: "scale",
    title: "How confident do you feel walking into a room?",
    sub: "1 = invisible. 10 = the room moves around you.",
    min: 1, max: 10,
    legend: ["Invisible", "Magnetic"],
  },
  {
    id: "priority",
    type: "choice",
    title: "What would change your life most right now?",
    sub: "Pick one — it shapes your protocol order.",
    options: [
      { value: "face",      label: "A sharper, more defined face" },
      { value: "body",      label: "A leaner, more aesthetic physique" },
      { value: "skin-hair", label: "Clear skin & better hair" },
      { value: "presence",  label: "Higher status & presence" },
    ],
  },
  {
    id: "commitment",
    type: "choice",
    title: "How serious are you about fixing this in the next 12 weeks?",
    sub: "Final question. Be straight.",
    options: [
      { value: "casual",    label: "Curious — just exploring" },
      { value: "ready",     label: "Ready to commit if the plan is right" },
      { value: "all-in",    label: "All-in. I want the full protocol now." },
      { value: "post-event",label: "Have a deadline (wedding, shoot, trip)" },
    ],
  },
];

/* ────── State ────── */
const state = {
  step: -1,                  // -1 = welcome, 0..n = question index, "loading", "results"
  answers: {},
  name: "",
  email: "",
};

const app = document.getElementById("quizApp");
const progressFill = document.getElementById("progressFill");
const progressMeta = document.getElementById("progressMeta");

/* ────── Render dispatcher ────── */
function render() {
  if (state.step === -1)            renderWelcome();
  else if (state.step === "email")  renderEmail();
  else if (state.step === "loading")renderLoading();
  else if (state.step === "results")renderResults();
  else                              renderQuestion(state.step);
  updateProgress();
}

function updateProgress() {
  const total = QUESTIONS.length;
  let n = 0;
  if (typeof state.step === "number" && state.step >= 0) n = state.step + 1;
  if (state.step === "email") n = total;
  if (state.step === "loading" || state.step === "results") n = total;
  const pct = state.step === -1 ? 0 : Math.min(100, Math.round((n / total) * 100));
  progressFill.style.width = pct + "%";
  progressMeta.textContent = `${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}

/* ────── Slide swap ────── */
function swap(html) {
  const current = app.firstElementChild;
  const next = document.createElement("section");
  next.className = "slide";
  next.innerHTML = html;
  if (current) {
    current.classList.add("is-leaving");
    current.addEventListener("animationend", () => current.remove(), { once: true });
  }
  app.appendChild(next);
  return next;
}

/* ────── Welcome ────── */
function renderWelcome() {
  const html = `
    <div class="welcome">
      <span class="eyebrow">Free aesthetic audit · 2 minutes</span>
      <h1 class="h-display">
        Find out exactly how far<br/>
        you are from <span class="accent">elite.</span>
      </h1>
      <p class="lede">
        A protocol-grade audit across jawline, eyes, physique, skin, hair and presence —
        benchmarked against the men The Stickley Method has already transformed.
        Walk away with a free guide and the exact next move.
      </p>
      <div class="welcome__cta">
        <button class="btn btn--lg" data-start>
          Start the audit <span class="arrow">→</span>
        </button>
        <span class="welcome__meta">9 questions · ~2 min · free guide on completion</span>
      </div>
    </div>
  `;
  const node = swap(html);
  node.querySelector("[data-start]").addEventListener("click", () => goNext());
}

/* ────── Question rendering ────── */
function renderQuestion(idx) {
  const q = QUESTIONS[idx];
  const total = QUESTIONS.length;
  const num = String(idx + 1).padStart(2, "0");
  const totalStr = String(total).padStart(2, "0");

  let body = "";
  if (q.type === "photo")  body = renderPhotoGrid(q);
  if (q.type === "choice") body = renderChoiceGrid(q);
  if (q.type === "scale")  body = renderScale(q);

  const isLast = idx === QUESTIONS.length - 1;

  const html = `
    <div class="q-screen">
      <div class="q-head">
        <div class="q-head__index">${num}</div>
        <div class="q-head__count">Question ${num} / ${totalStr}</div>
      </div>
      <h2 class="q-title">${q.title}</h2>
      <p class="q-sub">${q.sub}</p>
      ${body}
      <div class="q-foot">
        <button class="btn btn--ghost" data-back ${idx === 0 ? "style='visibility:hidden'" : ""}>
          ← Back
        </button>
        <span class="q-foot__hint">${isLast ? "Last one" : "Tap to select · auto-advances"}</span>
      </div>
    </div>
  `;
  const node = swap(html);
  if (q.type === "photo") bindPhotoFallbacks(node);

  // Bind option clicks
  node.querySelectorAll("[data-option]").forEach((el) => {
    el.addEventListener("click", () => {
      const value = el.dataset.option;
      // Visual selection
      node.querySelectorAll("[data-option]").forEach((e) => e.setAttribute("aria-pressed", "false"));
      el.setAttribute("aria-pressed", "true");
      state.answers[q.id] = value;
      // Brief pause so the user sees the selection, then advance
      setTimeout(() => goNext(), 320);
    });
  });

  const back = node.querySelector("[data-back]");
  if (back) back.addEventListener("click", () => goPrev());
}

/* Per-question cell aspect — chosen to match the natural shape of each
   photo set so `object-fit: contain` shows the full image with minimal padding. */
const PHOTO_ASPECT = {
  jawline:  "5 / 4",   // landscape head shots
  eyes:     "16 / 9",  // wide eye crops
  physique: "5 / 4",   // landscape body shots
  skin:     "5 / 4",   // landscape face crops
  hairline: "4 / 5",   // top-down crown shots
  posture:  "2 / 3",   // tall side-profile shots
};

function renderPhotoGrid(q) {
  const cols = q.options.length;
  const aspect = PHOTO_ASPECT[q.id] || "3 / 4";
  return `
    <div class="photos" data-count="${cols}" style="--cols:${cols}; --photo-aspect:${aspect};">
      ${q.options.map((o, i) => `
        <button class="photo" data-option="${o.value}" aria-pressed="false" aria-label="${o.label}"
                data-fallback-label="${escapeAttr(o.label)}"
                data-fallback-file="${escapeAttr(o.src.split('/').pop())}">
          <span class="photo__num">${String(i + 1).padStart(2, "0")}</span>
          <img src="${o.src}" alt="" data-photo-img />
          <span class="photo__label">${o.label}</span>
        </button>
      `).join("")}
    </div>
  `;
}

/* If a photo's image fails to load, swap to a styled placeholder so the
   layout still looks intentional (and tells the user where to drop the file). */
function bindPhotoFallbacks(scope) {
  scope.querySelectorAll("img[data-photo-img]").forEach((img) => {
    img.addEventListener("error", () => {
      const cell = img.closest(".photo");
      if (!cell) return;
      cell.classList.add("photo--placeholder");
      const label = cell.dataset.fallbackLabel || "";
      const file  = cell.dataset.fallbackFile || "";
      img.remove();
      cell.insertAdjacentHTML(
        "beforeend",
        `<div class="photo__caption"><strong>${label}</strong>Drop image:<br/>${file}</div>`
      );
    });
  });
}

function renderChoiceGrid(q) {
  return `
    <div class="choices">
      ${q.options.map((o, i) => `
        <button class="choice" data-option="${o.value}" aria-pressed="false">
          <span class="choice__key">${String.fromCharCode(65 + i)}</span>
          <span>${o.label}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderScale(q) {
  const pips = [];
  for (let i = q.min; i <= q.max; i++) {
    pips.push(`<button class="scale__pip" data-option="${i}" aria-pressed="false">${i}</button>`);
  }
  return `
    <div class="scale">${pips.join("")}</div>
    <div class="scale__legend">
      <span>${q.legend[0]}</span>
      <span>${q.legend[1]}</span>
    </div>
  `;
}

/* Util — escape strings for inline onerror HTML */
function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ────── Navigation (with conditional logic) ────── */
function goNext() {
  // Welcome → Q0
  if (state.step === -1) {
    state.step = 0;
    return render();
  }

  // From a question — check conditional next
  if (typeof state.step === "number") {
    const q = QUESTIONS[state.step];
    let nextId = null;
    if (typeof q.next === "function") nextId = q.next(state.answers);

    if (nextId) {
      const idx = QUESTIONS.findIndex((x) => x.id === nextId);
      if (idx >= 0) { state.step = idx; return render(); }
    }

    // Default: advance sequentially
    if (state.step < QUESTIONS.length - 1) {
      state.step += 1;
      return render();
    }

    // Last question answered → email capture before results
    state.step = "email";
    return render();
  }

  if (state.step === "email") {
    state.step = "loading";
    return render();
  }
}

function goPrev() {
  if (typeof state.step === "number" && state.step > 0) {
    state.step -= 1;
    render();
  } else if (state.step === "email") {
    state.step = QUESTIONS.length - 1;
    render();
  }
}

/* ────── Name + email capture (sits between last question and results) ────── */
function renderEmail() {
  const html = `
    <div class="capture">
      <span class="eyebrow">Final step</span>
      <h2 class="h-section">Where do we send your audit?</h2>
      <p class="lede lede--muted">We'll deliver your personal report and the free <strong>Aesthetic Foundations</strong> guide
      straight to your inbox. No spam — one email, then it's on you.</p>

      <form id="captureForm" class="capture__form" novalidate>
        <div class="capture__field">
          <input type="text" id="nameInput" placeholder="First name" required autocomplete="given-name" />
        </div>
        <div class="capture__field">
          <input type="email" id="emailInput" placeholder="your@email.com" required autocomplete="email" />
          <button type="submit">Get my audit →</button>
        </div>
      </form>
      <p class="capture__error" id="captureError" role="alert"></p>
      <p class="capture__fineprint">Unsubscribe anytime. We never share your details.</p>

      <div class="q-foot">
        <button class="btn btn--ghost" data-back>← Back</button>
      </div>
    </div>
  `;
  const node  = swap(html);
  const form  = node.querySelector("#captureForm");
  const name  = node.querySelector("#nameInput");
  const email = node.querySelector("#emailInput");
  const err   = node.querySelector("#captureError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const n = name.value.trim();
    const v = email.value.trim();
    if (n.length < 1) { err.textContent = "Enter your first name."; name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      err.textContent = "Enter a valid email address.";
      email.focus();
      return;
    }
    state.name = n;
    state.email = v;
    err.textContent = "";

    // TODO: send to backend / GoHighLevel / Google Sheet / ConvertKit / etc.
    // fetch("/api/lead", { method: "POST", body: JSON.stringify({ name: n, email: v, answers: state.answers }) });

    goNext();
  });

  node.querySelector("[data-back]").addEventListener("click", () => goPrev());
}

/* ────── Loading / "analysing" screen ────── */
function renderLoading() {
  const items = [
    "Calibrating facial structure",
    "Mapping eye-area subtype",
    "Benchmarking physique tier",
    "Cross-referencing skin & hair",
    "Compiling protocol stack",
  ];
  const html = `
    <div class="loading">
      <div>
        <div class="loading__pulse"></div>
        <span class="eyebrow" style="justify-content:center;">Analysing</span>
        <h2 class="h-section" style="text-align:center;">Building your audit</h2>
        <ul class="loading__list">
          ${items.map((t) => `
            <li class="loading__item"><span>${t}</span><span class="tick">···</span></li>
          `).join("")}
        </ul>
      </div>
    </div>
  `;
  const node = swap(html);
  const els = [...node.querySelectorAll(".loading__item")];
  const totalMs = 4200;
  const stepMs = totalMs / els.length;

  els.forEach((el, i) => {
    setTimeout(() => el.classList.add("is-on"), i * stepMs * 0.4);
    setTimeout(() => {
      el.classList.add("is-done");
      el.querySelector(".tick").textContent = "✓";
    }, i * stepMs * 0.4 + stepMs);
  });

  setTimeout(() => { state.step = "results"; render(); }, totalMs);
}

/* ────── Helpers — answer → human label / interpretation ────── */
function answerLabel(qid, val) {
  const q = QUESTIONS.find((x) => x.id === qid);
  if (!q || !q.options) return "—";
  const opt = q.options.find((o) => String(o.value) === String(val));
  return opt ? opt.label : String(val ?? "—");
}

/* Short, descriptive interpretation per cell — no numbers. */
function readBack(qid, val) {
  const map = {
    jawline: {
      soft:    "A softer jaw line. The fastest single fix in your audit.",
      average: "Average definition. Recoverable jaw architecture is in there.",
      defined: "Defined jaw. Train it sharper and the rest of your face moves with it.",
      sharp:   "Sharp jaw. Top-tier marker — protect this with bf% and posture.",
      elite:   "Elite jaw line. This is the standard the Method is benchmarked to.",
    },
    eyes: {
      nct:     "Negative canthal tilt — the eye area's biggest single status lever. Treatable with structured work.",
      uee:     "Upper eyelid exposure. Small change, massive perceived shift toward 'hunter' eyes.",
      bags:    "Eye bags. Sleep, sodium, hydration and a structured periorbital protocol fix this.",
      average: "Average eye area. Big upside in canthal tilt and brow training.",
      ideal:   "Ideal eye area. Already doing the work eyes do for status.",
    },
    physique: {
      obese:      "Obese tier. Biggest physique upside on the programme — structured cut + lift changes everything.",
      overweight: "Overweight. Recomp protocol — cut bf% while building muscle. 12 weeks creates a different person.",
      skinny:     "Skinny frame. Lean bulk + structured lifting builds the V fastest.",
      athletic:   "Athletic build. The hardest part is done — now we sculpt finishing details.",
    },
    skin: {
      "active-acne": "Active acne. Hormonal + topical protocol + diet audit is the priority — fast wins available.",
      scars:         "Acne scars. Treatable — retinoid, microneedling, selective laser. We sequence what works.",
      oily:          "Oily with blackheads. Routine sequencing — cleanser, BHA, retinoid — flips this in weeks.",
      dry:           "Dry and flaky. Mild and reversible — barrier-first routine sorts it.",
      clear:         "Clear skin. Dial in glow and grade — the elite-tier polish.",
    },
    hairline: {
      heavy:   "Heavy loss. Still treatable — restoration + the right cut close the gap fast.",
      diffuse: "Diffuse thinning. Lock in what's left now — finasteride, minox, micro-needling stack.",
      mild:    "Mild thinning. The window is open — prevention beats restoration.",
      full:    "Full hairline. Strong asset — protect with the right cut.",
    },
    posture: {
      weak:   "Posture needs work. Highest-leverage non-surgical change to your presence.",
      ok:     "Decent posture. Small daily corrections compound into a different silhouette.",
      strong: "Strong posture. Already doing the work most men ignore.",
    },
  };
  return (map[qid] && map[qid][val]) || "—";
}

/* ────── Tier (used to choose verdict copy — never shown as a number) ────── */
function deriveTier(answers) {
  const grade = (id, m) => m[answers[id]] ?? 3;
  const J  = grade("jawline",  { soft:1, average:2, defined:3, sharp:4, elite:5 });
  const E  = grade("eyes",     { nct:1, uee:2, bags:2, average:3, ideal:5 });
  const P  = grade("physique", { obese:1, overweight:2, skinny:2, athletic:5 });
  const S  = grade("skin",     { "active-acne":1, scars:1, oily:2, dry:3, clear:5 });
  const H  = grade("hairline", { heavy:1, diffuse:2, mild:4, full:5 });
  const Po = grade("posture",  { weak:1, ok:3, strong:5 });
  const conf = Math.max(1, Math.min(5, Math.round((Number(answers.confidence) || 5) / 2)));
  const avg = (J + E + P + S + H + Po + conf) / 7;
  if (avg >= 4)   return "elite";
  if (avg >= 3.2) return "sharp";
  if (avg >= 2.2) return "foundations";
  return "reset";
}

function verdict(tier, name) {
  const who = name ? `${name}, ` : "";
  if (tier === "elite") return {
    tag: "Top tier",
    title: `${who}you're already operating in the top decile.`,
    body:  "Your audit reads at the level the Method is designed to push past — finishing details, presence, status. The full programme is about taking 'great' to 'unforgettable'.",
  };
  if (tier === "sharp") return {
    tag: "Sharp",
    title: `${who}you're sharper than most men your age.`,
    body:  "You have the foundation. The work now is precision: jaw, eye area, physique fine-tuning, and presence. The Method is built for exactly this jump.",
  };
  if (tier === "foundations") return {
    tag: "Foundations",
    title: `${who}there's real, visible upside in front of you.`,
    body:  "Men in your starting position consistently see the most dramatic 12-week transformations. The free guide gives you the foundations — the Method gives you the full path.",
  };
  return {
    tag: "Reset",
    title: `${who}it's time for a full reset.`,
    body:  "You've been operating on scraps of forum advice. Structured, protocol-driven men starting from this point produce the most dramatic transformations the Method has on tape.",
  };
}

/* Priority callout — driven by Q7 (priority) */
function priorityCopy(priority) {
  const map = {
    face:      { title: "A sharper, more defined face",
                 body:  "Your protocol leads with jaw training, mewing fundamentals, body-fat targeting and the facial-architecture work that drives 80% of perceived attractiveness." },
    body:      { title: "A leaner, more aesthetic physique",
                 body:  "We open with a recomp framework — lift, cut, posture — that pulls double duty by sharpening your facial structure as bf% drops." },
    "skin-hair":{title: "Clear skin and better hair",
                 body:  "Your routine starts with a 4-step skin protocol and a hair-density / styling plan calibrated to your face shape." },
    presence:  { title: "Higher status and presence",
                 body:  "The protocol leads with frame, posture, voice and style — the levers that move how a room reads you before you've spoken." },
  };
  return map[priority] || map.face;
}

/* ────── Results (no numbers, fully descriptive) ────── */
function renderResults() {
  const a = state.answers;
  const tier = deriveTier(a);
  const v = verdict(tier, state.name);
  const p = priorityCopy(a.priority);
  const code = "AUDIT15";

  const cells = [
    ["Face",     "jawline",  a.jawline],
    ["Eyes",     "eyes",     a.eyes],
    ["Physique", "physique", a.physique],
    ["Skin",     "skin",     a.skin],
    ["Hairline", "hairline", a.hairline],
    ["Posture",  "posture",  a.posture],
  ];

  const html = `
    <div class="results">
      <div class="results__hero">
        <span class="eyebrow">Your audit · ${v.tag}</span>
        <h2 class="results__headline">${v.title}</h2>
        <p class="results__copy">${v.body}</p>
      </div>

      <div class="breakdown">
        ${cells.map(([label, qid, val]) => `
          <div class="breakdown__cell">
            <div class="breakdown__label">${label}</div>
            <div class="breakdown__value">${answerLabel(qid, val)}</div>
            <p class="breakdown__note">${readBack(qid, val)}</p>
          </div>
        `).join("")}
      </div>

      <div class="priority">
        <span class="priority__label">Your highest-leverage area</span>
        <h3 class="priority__title">${p.title}</h3>
        <p class="priority__body">${p.body}</p>
      </div>

      <div class="offer">
        <div class="offer__panel">
          <span class="offer__tag">Free guide</span>
          <h3 class="offer__title">Aesthetic Foundations<br/>— sent to ${state.email || "your inbox"}</h3>
          <p class="lede lede--muted" style="margin:0 0 20px;">
            The 28-page primer the Stickley team gives every new client.
            Skin, jaw, hair, training, sleep — the foundations everything else stacks on.
          </p>
          <ul class="offer__list">
            <li>The 4-step skin protocol used by all members</li>
            <li>Jaw &amp; mewing fundamentals (with images)</li>
            <li>Lean-physique training template</li>
            <li>The "Status &amp; Presence" pre-flight checklist</li>
          </ul>
          <a class="btn btn--ghost" href="#" data-download>Download PDF <span class="arrow">↓</span></a>
        </div>

        <div class="offer__panel offer__panel--accent">
          <span class="offer__tag" style="background:var(--white); color:var(--black);">Recommended</span>
          <h3 class="offer__title">The Stickley Method<br/>— exactly what you need.</h3>
          <p class="lede" style="margin:0 0 20px;">
            Based on your audit, the full 12-week programme is the most direct path forward.
            Structured. Accountable. Built for men who refuse to look average.
          </p>

          <div class="offer__code">
            <div>
              <div class="offer__code-label">Your audit-only code · 15% off</div>
              <div class="offer__code-value">${code}</div>
            </div>
            <button class="offer__code-copy" data-copy="${code}">Copy</button>
          </div>

          <div class="offer__cta-row">
            <a class="btn btn--lg" href="https://stickleymethod.com" target="_blank" rel="noopener">
              See the programme <span class="arrow">→</span>
            </a>
            <span class="q-foot__hint">Code auto-applies at checkout</span>
          </div>
        </div>
      </div>

      <div class="q-foot" style="border-top:0;">
        <button class="btn btn--ghost" data-restart>↺ Retake the audit</button>
        <span class="q-foot__hint">© The Stickley Method</span>
      </div>
    </div>
  `;
  const node = swap(html);

  const copyBtn = node.querySelector("[data-copy]");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.copy);
      copyBtn.classList.add("is-copied");
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => { copyBtn.classList.remove("is-copied"); copyBtn.textContent = "Copy"; }, 1800);
    } catch { /* ignore */ }
  });

  node.querySelector("[data-restart]").addEventListener("click", () => {
    state.step = -1; state.answers = {}; state.name = ""; state.email = ""; render();
  });

  node.querySelector("[data-download]").addEventListener("click", (e) => {
    e.preventDefault();
    alert("Hook this up to your real PDF link (e.g. /assets/aesthetic-foundations.pdf).");
  });
}

/* ────── Boot ────── */
render();

/* ─────────────────────────────────────────────────────────────────
   Top-left phoenix logo — flaps every 20s.
   - 121 WebP frames preloaded once.
   - One "flap" plays the full sequence at FPS, then settles on frame 1.
   - Pauses while the tab is hidden (saves CPU).
   - Honours prefers-reduced-motion (renders frame 1 statically).
───────────────────────────────────────────────────────────────── */
(function logoFlap() {
  const canvas = document.getElementById("topbarLogo");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const FRAME_COUNT  = 121;
  const FRAME_DIR    = "assets/logo-frames";
  const FPS          = 30;
  const FLAP_PERIOD  = 20000;            // every 20s
  const PLAY_MS      = (FRAME_COUNT / FPS) * 1000;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const frames = new Array(FRAME_COUNT);
  let loaded = 0;

  function frameUrl(i) {
    return `${FRAME_DIR}/frame_${String(i + 1).padStart(4, "0")}.webp`;
  }

  function drawFrame(idx) {
    const img = frames[idx];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    // Contain — preserves the bird's silhouette inside the canvas box.
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function playFlap() {
    if (document.hidden) return;
    const start = performance.now();
    function tick(now) {
      const t = now - start;
      if (t >= PLAY_MS) { drawFrame(0); return; }
      const idx = Math.min(Math.floor((t / 1000) * FPS), FRAME_COUNT - 1);
      drawFrame(idx);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function startLoop() {
    drawFrame(0);                       // settle pose immediately
    if (reduceMotion) return;           // respect user preference
    playFlap();                         // first flap on load
    setInterval(playFlap, FLAP_PERIOD); // then every 20s
  }

  // Preload all frames in parallel; start loop once they're all in.
  // First-frame draw happens as soon as frame 0 lands, so the bird
  // appears even before the tail of the sequence finishes loading.
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      loaded++;
      if (i === 0) drawFrame(0);
      if (loaded === FRAME_COUNT) startLoop();
    };
    img.onerror = () => {
      loaded++;
      if (loaded === FRAME_COUNT) startLoop();
    };
    img.src = frameUrl(i);
    frames[i] = img;
  }
})();

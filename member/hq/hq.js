/* ══════════════════════════════════════════════════════════════════════
   THE SELF-MASTERY SYSTEM — SHARED RUNTIME

   Three jobs: persistence, navigation, and the handful of helpers every
   page needs. Loaded after data/catalogue.js on every HQ page.

   ── ON PERSISTENCE ──────────────────────────────────────────────────
   THERE IS NO DATABASE IN THIS PROJECT. Membership lives in Whop,
   contacts live in GHL, and neither is a place to put a member's
   journal. So v1 persists to localStorage, and EVERY read and write
   goes through Store below. Nothing else in the codebase is allowed to
   touch localStorage directly.

   That indirection is the point. localStorage is per-device, per-
   browser, and gone when someone clears their data — which is a bad
   home for the thing the brief calls the real retention mechanism
   ("this now contains my system"). When a real store arrives, Store.get
   and Store.set become awaited fetches against /api/hq/state and no
   page changes. Until then the honest position is: this survives a
   refresh and a reboot, not a new phone.

   Every access is wrapped. Private mode and blocked site data both
   throw on read, and a thrown storage error must never take the page
   down with it.
══════════════════════════════════════════════════════════════════════ */

window.HQ = (function () {
  'use strict';

  var NS = 'sms.v1.';

  /* ── Store ────────────────────────────────────────────────────── */
  var Store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(NS + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    del: function (key) {
      try { window.localStorage.removeItem(NS + key); } catch (e) {}
    },
  };

  /* ── Profile. Written by onboarding, read for recommendations. ─── */
  function profile() {
    return Store.get('profile', { focus: [], blockers: [], onboardedAt: null, name: '' });
  }
  function saveProfile(p) { Store.set('profile', p); return p; }
  function isOnboarded() { return !!profile().onboardedAt; }


  /* ── Recommendation ───────────────────────────────────────────────
     ONE implementation, used by onboarding and by the home screen.
     It lived in both places briefly and they disagreed: onboarding
     weighted the blocker, home only looked at focus and additionally
     read pillar ids against a map keyed by raw answers, so it always
     fell through to the default. A member was told "start with Clean
     Days", came back the next day, and was told to start with
     something else. Two copies of a rule is one copy too many.

     WHAT IS IN THE WAY OUTRANKS WHAT THEY WANT. Someone who wants a
     better body but cannot keep a promise for three days needs the
     promise tool first; they will abandon the macro tracker by Friday
     for exactly the reason they ticked "inconsistency".
     ───────────────────────────────────────────────────────────────── */
  var BY_BLOCKER = {
    lust: 'kill-lust-tracker', 'cheap-dopamine': 'dopamine-reset',
    procrastination: 'deep-work-tracker', routines: 'morning-routine',
    direction: 'daily-income-actions', confidence: 'courage-tracker',
    inconsistency: 'daily-promises', structure: 'daily-promises',
  };
  var BY_FOCUS = {
    body: 'macro-tracker', appearance: 'appearance-routine',
    discipline: 'daily-promises', 'emotional-control': 'stoic-reflection',
    character: 'daily-good-deed', confidence: 'courage-tracker',
    income: 'daily-income-actions',
  };

  function recommend(p) {
    p = p || profile();
    var i, id, b;
    var blockers = p.blockers || [], focus = p.rawFocus || [];
    for (i = 0; i < blockers.length; i++) {
      id = BY_BLOCKER[blockers[i]];
      b = id && window.SMS.build(id);
      if (b) return b;
    }
    for (i = 0; i < focus.length; i++) {
      id = BY_FOCUS[focus[i]];
      b = id && window.SMS.build(id);
      if (b) return b;
    }
    return window.SMS.firstBuild();
  }

  /* ── My Builds ────────────────────────────────────────────────────
     A saved build is the member's own Base44 app: a URL plus the
     template it came from, or no template at all when they built their
     own. templateId is nullable on purpose — custom builds are a
     first-class citizen per the brief, not an afterthought.
     ───────────────────────────────────────────────────────────────── */
  function myBuilds() { return Store.get('builds', []); }

  function addBuild(entry) {
    var all = myBuilds();
    all.push({
      key: 'b' + Date.now() + Math.random().toString(36).slice(2, 7),
      templateId: entry.templateId || null,
      title: entry.title,
      pillar: entry.pillar,
      url: entry.url,
      note: entry.note || '',
      addedAt: new Date().toISOString(),
    });
    Store.set('builds', all);
    return all;
  }

  function updateBuild(key, patch) {
    var all = myBuilds().map(function (b) {
      if (b.key !== key) return b;
      for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) b[k] = patch[k];
      return b;
    });
    Store.set('builds', all);
    return all;
  }

  function removeBuild(key) {
    var all = myBuilds().filter(function (b) { return b.key !== key; });
    Store.set('builds', all);
    return all;
  }

  function builtFrom(templateId) {
    return myBuilds().filter(function (b) { return b.templateId === templateId; })[0] || null;
  }
  function buildsIn(pillarId) {
    return myBuilds().filter(function (b) { return b.pillar === pillarId; });
  }

  /* ── URL validation ───────────────────────────────────────────────
     Deliberately permissive. Base44 serves published apps from more
     than one shape of host, and a member who has genuinely built the
     thing and is then told their own link is invalid is a member lost
     at the last step. So: require a real absolute http(s) URL, warn
     when it does not look like Base44, and save it either way.
     ───────────────────────────────────────────────────────────────── */
  function checkUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return { ok: false, msg: 'Paste the link to your app first.' };
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    var u;
    try { u = new URL(s); } catch (e) { return { ok: false, msg: 'That does not look like a link. It should start with https://' }; }
    if (!u.hostname || u.hostname.indexOf('.') === -1) {
      return { ok: false, msg: 'That does not look like a link. It should start with https://' };
    }
    var base44 = /(^|\.)base44\.(app|com)$/i.test(u.hostname);
    return {
      ok: true, url: u.href, base44: base44,
      msg: base44 ? '' : 'Saved. That is not a base44.app link — check it is the published app, not the builder.',
    };
  }

  /* ── Helpers ──────────────────────────────────────────────────── */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function qs(name) {
    try { return new URL(window.location.href).searchParams.get(name); } catch (e) { return null; }
  }

  var toastTimer;
  function toast(msg) {
    var el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2600);
  }

  /* Clipboard with a real fallback: the modern API needs a secure
     context and permission, and this button failing silently is the
     one failure that breaks the entire product loop. */
  function copy(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      toast(done ? (okMsg || 'Copied') : 'Could not copy — select the text and copy it manually.');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || 'Copied'); }, fallback);
    } else { fallback(); }
  }

  /* ── Icons. A small inline set beats an icon font or a sprite
     request for eleven glyphs, and keeps every page self-contained. ─ */
  var ICONS = {
    home:    '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z"/>',
    today:   '<rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8.5h14M7 3v3M13 3v3"/>',
    mastery: '<path d="M10 3 4 6.2v4.3c0 3.4 2.5 5.7 6 6.5 3.5-.8 6-3.1 6-6.5V6.2z"/>',
    builds:  '<rect x="3" y="3.5" width="6" height="6" rx="1.4"/><rect x="11" y="3.5" width="6" height="6" rx="1.4"/><rect x="3" y="11.5" width="6" height="5" rx="1.4"/><path d="M14 11.5v5M11.5 14h5"/>',
    mine:    '<path d="M3.5 6.5h13M3.5 10h13M3.5 13.5h8"/>',
    journal: '<path d="M5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v11L10 13l-5.5 3V5A1.5 1.5 0 0 1 5 3.5z"/>',
    audit:   '<path d="M4 16V9M8 16V5M12 16v-5M16 16V7"/>',
    protocol:'<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/>',
    library: '<path d="M4 4.5h4v11H4zM9.5 4.5h3.5v11H9.5zM14.5 5.2l2.2 10.6"/>',
    settings:'<circle cx="10" cy="10" r="2.6"/><path d="M10 3.2v1.9M10 15v1.9M16.8 10h-1.9M5.1 10H3.2M14.8 5.2l-1.3 1.3M6.5 13.5l-1.3 1.3M14.8 14.8l-1.3-1.3M6.5 6.5 5.2 5.2"/>',
    back:    '<path d="M11.5 5 6.5 10l5 5"/>',
  };
  function icon(name) {
    return '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ── Navigation ───────────────────────────────────────────────────
     One definition, rendered into three places: the desktop rail, the
     mobile top bar and the mobile tab bar. `soon` marks the surfaces
     that are specified and routed but not built yet — shown rather
     than hidden, so the shape of the product is legible from day one
     and nobody wonders where the journal went.
     ───────────────────────────────────────────────────────────────── */
  var NAV = [
    { id: 'home',     label: 'Home',            href: '/member/hq',            icon: 'home',     tab: true },
    { id: 'today',    label: 'Today',           href: '/member/hq/soon?p=today', icon: 'today',  tab: true, soon: true },
    { id: 'mastery',  label: 'Mastery',         href: '/member/hq/mastery',    icon: 'mastery',  tab: true, group: true },
    { id: 'builds',   label: 'Build Library',   href: '/member/hq/builds',     icon: 'builds',   tab: true, tabLabel: 'Builds' },
    { id: 'mine',     label: 'My Builds',       href: '/member/hq/my-builds',  icon: 'mine',     tab: true, tabLabel: 'Mine' },
    { id: 'journal',  label: 'Journal',         href: '/member/hq/soon?p=journal',  icon: 'journal',  soon: true },
    { id: 'audit',    label: 'Self Audit',      href: '/member/hq/soon?p=audit',    icon: 'audit',    soon: true },
    { id: 'protocol', label: "Baby's Protocol", href: '/member/hq/soon?p=protocol', icon: 'protocol', soon: true },
    { id: 'library',  label: 'Library',         href: '/member/hq/soon?p=library',  icon: 'library',  soon: true },
    { id: 'settings', label: 'Settings',        href: '/member/hq/soon?p=settings', icon: 'settings', soon: true },
  ];

  function renderNav(current, pillarId) {
    var mine = myBuilds().length;

    /* Desktop rail. */
    var rail = '<div class="rail__mark"><span class="rail__dot"></span><div><b>Self-Mastery</b>' +
               '<span>The System</span></div></div><nav class="nav">';

    NAV.forEach(function (item) {
      var cur = item.id === current ? ' aria-current="page"' : '';
      var count = item.id === 'mine' && mine ? '<span class="nav__count">' + mine + '</span>' : '';
      var soon  = item.soon ? '<span class="nav__count">soon</span>' : '';
      rail += '<a href="' + item.href + '"' + cur + '>' + icon(item.icon) +
              '<span>' + esc(item.label) + '</span>' + count + soon + '</a>';

      /* The five pillars nest under Mastery so the rail stays short. */
      if (item.group) {
        rail += '<div class="nav__sub">';
        window.SMS.pillars.forEach(function (p) {
          var pc = (current === 'pillar' && pillarId === p.id) ? ' aria-current="page"' : '';
          rail += '<a href="/member/hq/pillar?p=' + p.id + '"' + pc + '>' + esc(p.short) + '</a>';
        });
        rail += '</div>';
      }
    });
    rail += '</nav>';

    var railEl = document.querySelector('.rail');
    if (railEl) railEl.innerHTML = rail;

    /* Mobile top bar. */
    var top = document.querySelector('.topbar');
    if (top) {
      top.innerHTML = '<span class="rail__dot"></span><b>Self-Mastery</b><span class="sp"></span>' +
                      '<a href="/member/hq/soon?p=settings">Settings</a>';
    }

    /* Mobile tab bar: the five daily surfaces only. */
    var tab = document.querySelector('.tabbar');
    if (tab) {
      tab.innerHTML = NAV.filter(function (i) { return i.tab; }).map(function (item) {
        var cur = item.id === current ? ' aria-current="page"' : '';
        return '<a href="' + item.href + '"' + cur + '>' + icon(item.icon) +
               '<span>' + esc(item.tabLabel || item.label) + '</span></a>';
      }).join('');
    }
  }

  /* Every page calls this once. */
  function boot(current, pillarId) {
    renderNav(current, pillarId);
  }

  return {
    Store: Store,
    profile: profile, saveProfile: saveProfile, isOnboarded: isOnboarded,
    recommend: recommend,
    myBuilds: myBuilds, addBuild: addBuild, updateBuild: updateBuild,
    removeBuild: removeBuild, builtFrom: builtFrom, buildsIn: buildsIn,
    checkUrl: checkUrl,
    esc: esc, qs: qs, toast: toast, copy: copy, icon: icon,
    boot: boot,
  };
})();

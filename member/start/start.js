/* ══════════════════════════════════════════════════════════════════════
   THE FIRST SEVEN — RUNTIME

   Storage, the gate, the prompt generator, and the clock.

   ── GATING, AND WHY IT IS SHAPED THIS WAY ───────────────────────────
   Two separate rules, doing two separate jobs:

     BUILDS unlock on completion. Finish Day 3 and Day 4 opens, even if
     that is twenty minutes later. Somebody motivated on a Saturday
     should be allowed to run, because every extra day they finish is
     more prompts into Base44 on the day they joined.

     THE LADDER needs seven DISTINCT calendar days. Racing ahead does
     not skip the clock. This is the part that produces week-one
     activity rather than one enthusiastic evening followed by silence.

   Hard-locking each day to a calendar day would serve the second goal
   and wreck the first. This serves both.

   ── STORAGE ─────────────────────────────────────────────────────────
   Same position as the first build: no database in this project, so
   this is localStorage behind one Store, and NOTHING else touches
   localStorage directly. It survives a refresh and a reboot, not a new
   phone. When a real store lands, Store.get/set become awaited fetches
   and no page changes.

   The submit-proof check is deliberately client-side for now. It is an
   honour system until it runs server-side, and it should not be sold
   as verification until it does.
══════════════════════════════════════════════════════════════════════ */

window.S = (function () {
  'use strict';

  var NS = 'sms.start.v1.';
  var WEEK = 7;

  var Store = {
    get: function (k, fb) {
      try { var r = window.localStorage.getItem(NS + k); return r === null ? fb : JSON.parse(r); }
      catch (e) { return fb; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
  };

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function state() {
    return Store.get('progress', {
      name: '', startedAt: null, days: {}, app: null, checkins: [], answers: {},
    });
  }
  function save(s) { Store.set('progress', s); return s; }

  /* ── Progress ─────────────────────────────────────────────────── */
  function done(n) { return !!state().days[String(n)]; }
  function doneCount() { return Object.keys(state().days).length; }

  /* Day 1 is always open. After that, finish the one before. */
  function unlocked(n) {
    n = parseInt(n, 10);
    if (n === 1) return true;
    return done(n - 1);
  }
  function currentDay() {
    for (var i = 1; i <= WEEK; i++) if (!done(i)) return i;
    return WEEK;
  }

  function completeDay(n, extra) {
    var s = state();
    s.days[String(n)] = Object.assign({ doneAt: new Date().toISOString(), date: today() }, extra || {});
    if (!s.startedAt) s.startedAt = new Date().toISOString();
    if (s.checkins.indexOf(today()) === -1) s.checkins.push(today());
    return save(s);
  }

  function checkIn() {
    var s = state();
    if (s.checkins.indexOf(today()) === -1) { s.checkins.push(today()); save(s); return true; }
    return false;
  }
  function checkedInToday() { return state().checkins.indexOf(today()) > -1; }

  /* Distinct calendar days on which anything happened. This is the
     number the ladder actually cares about. */
  function activeDays() {
    var s = state(), set = {};
    s.checkins.forEach(function (d) { set[d] = 1; });
    Object.keys(s.days).forEach(function (k) { if (s.days[k].date) set[s.days[k].date] = 1; });
    return Object.keys(set).length;
  }

  function ladderOpen() { return doneCount() >= WEEK && activeDays() >= WEEK; }

  /* ── The clock ────────────────────────────────────────────────────
     Starts when the first app is verified, not at signup: a countdown
     running against somebody who has not begun is just a reason to
     feel behind before they start. */
  function clock() {
    var s = state();
    if (!s.startedAt) return null;
    var ends = new Date(s.startedAt).getTime() + WEEK * 86400000;
    var left = ends - Date.now();
    if (left <= 0) return { expired: true, d: 0, h: 0, m: 0 };
    return {
      expired: false,
      d: Math.floor(left / 86400000),
      h: Math.floor(left / 3600000) % 24,
      m: Math.floor(left / 60000) % 60,
    };
  }

  /* ── The app they built ───────────────────────────────────────── */
  function app() { return state().app; }
  function saveApp(url) {
    var s = state();
    s.app = { url: url, verifiedAt: new Date().toISOString() };
    return save(s);
  }

  /* Permissive on purpose. Base44 serves published apps from more than
     one host shape, and telling somebody who genuinely built the thing
     that their own link is invalid loses them at the last step. */
  function checkUrl(raw) {
    var t = String(raw || '').trim();
    if (!t) return { ok: false, msg: 'Paste the link to your published app first.' };
    if (!/^https?:\/\//i.test(t)) t = 'https://' + t;
    var u;
    try { u = new URL(t); } catch (e) { return { ok: false, msg: 'That is not a link. It should start with https://' }; }
    if (!u.hostname || u.hostname.indexOf('.') === -1) {
      return { ok: false, msg: 'That is not a link. It should start with https://' };
    }
    var b44 = /(^|\.)base44\.(app|com)$/i.test(u.hostname);
    return { ok: true, url: u.href, base44: b44,
      msg: b44 ? '' : 'Saved — but that is not a base44.app link. Check it is the published app, not the builder.' };
  }

  /* ── Answers, remembered ──────────────────────────────────────────
     Somebody who fills in six questions, wanders off to Base44 and
     comes back should not find an empty form. */
  function answers(key) { return state().answers[key] || {}; }
  function saveAnswers(key, obj) {
    var s = state();
    s.answers[key] = obj;
    return save(s);
  }

  /* ── The prompt generator ─────────────────────────────────────────
     The single most important function here. A member staring at an
     empty prompt box does nothing, so they never see one: they answer
     plain questions and the message assembles itself.

     An unanswered question removes its whole line rather than sending
     "- Income right now: {{income}} per month" with a hole in it. A
     half-filled form still produces a clean, sendable prompt. */
  function build(msg, vals) {
    var out = msg.text;
    var qs = msg.questions || [];

    qs.forEach(function (q) {
      var v = (vals[q.id] || '').trim();
      var token = '{{' + q.id + '}}';
      if (!v) {
        /* Drop the line that carried it. */
        out = out.split('\n').filter(function (line) { return line.indexOf(token) === -1; }).join('\n');
        return;
      }
      if (q.area) {
        v = v.split(/\n+/).map(function (l) {
          l = l.trim().replace(/^[-*•]\s*/, '');
          return l ? '- ' + l : '';
        }).filter(Boolean).join('\n');
      }
      out = out.split(token).join(v);
    });

    return out.replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ── UI helpers ───────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function qs(n) { try { return new URL(window.location.href).searchParams.get(n); } catch (e) { return null; } }

  var tt;
  function toast(m) {
    var el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = m; el.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('on'); }, 2600);
  }

  /* Clipboard needs a secure context and permission, and this button
     failing silently breaks the entire product loop. Always fall back. */
  function copy(text, ok) {
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.appendChild(ta); ta.select();
      var d = false;
      try { d = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      toast(d ? (ok || 'Copied') : 'Could not copy — select the text and copy it by hand.');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(ok || 'Copied'); }, fb);
    } else { fb(); }
  }

  var ICONS = {
    home: '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z"/>',
    path: '<path d="M5 16.5v-4a3 3 0 0 1 3-3h4a3 3 0 0 0 3-3v-3"/><circle cx="5" cy="16.5" r="1.6"/><circle cx="15" cy="3.5" r="1.6"/>',
    system: '<rect x="3" y="3.5" width="6" height="6" rx="1.4"/><rect x="11" y="3.5" width="6" height="6" rx="1.4"/><rect x="3" y="11.5" width="6" height="5" rx="1.4"/><rect x="11" y="11.5" width="6" height="5" rx="1.4"/>',
    unlocks: '<rect x="4" y="9" width="12" height="8" rx="2"/><path d="M7 9V6.5a3 3 0 0 1 6 0"/>',
    library: '<path d="M4 4.5h4v11H4zM9.5 4.5h3.5v11H9.5zM14.5 5.2l2.2 10.6"/>',
    lock: '<rect x="5" y="9" width="10" height="7" rx="1.6"/><path d="M7.5 9V7a2.5 2.5 0 0 1 5 0v2"/>',
    back: '<path d="M11.5 5 6.5 10l5 5"/>',
    tick: '<path d="M4.5 10.5l3.5 3.5 7.5-8"/>',
  };
  function icon(n) {
    return '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
  }

  /* ── Navigation. Five items. Never more. ──────────────────────────
     The first build had eleven and that is precisely why it felt like
     a menu instead of a path. */
  var NAV = [
    { id: 'home',    label: 'Home',      href: '/member/start',           icon: 'home' },
    { id: 'path',    label: 'The Path',  href: '/member/start/path',      icon: 'path' },
    { id: 'system',  label: 'My System', href: '/member/start/my-system', icon: 'system' },
    { id: 'unlocks', label: 'Unlocks',   href: '/member/start/unlocks',   icon: 'unlocks' },
    { id: 'library', label: 'Library',   href: '/member/start/library',   icon: 'library', gated: true },
  ];

  function boot(current) {
    var open = ladderOpen();

    var rail = '<a class="mark" href="/member/start"><span class="dot"></span>' +
      '<div><b>Self-Mastery</b><span>The First Seven</span></div></a><nav class="nav">';
    NAV.forEach(function (i) {
      var cur = i.id === current ? ' aria-current="page"' : '';
      var lock = (i.gated && !open) ? '<span class="nav__lock">' + icon('lock') + '</span>' : '';
      rail += '<a href="' + i.href + '"' + cur + '>' + icon(i.icon) + '<span>' + esc(i.label) + '</span>' + lock + '</a>';
    });
    rail += '</nav>';
    rail += '<div class="rail__foot"><span>' + doneCount() + ' of 7 done</span></div>';

    var r = document.querySelector('.rail'); if (r) r.innerHTML = rail;

    var t = document.querySelector('.topbar');
    if (t) t.innerHTML = '<span class="dot"></span><b>Self-Mastery</b><span class="sp"></span>' +
      '<span class="tb-prog">' + doneCount() + '/7</span>';

    var tb = document.querySelector('.tabbar');
    if (tb) tb.innerHTML = NAV.map(function (i) {
      var cur = i.id === current ? ' aria-current="page"' : '';
      return '<a href="' + i.href + '"' + cur + '>' + icon(i.icon) + '<span>' + esc(i.label) + '</span></a>';
    }).join('');
  }

  return {
    Store: Store, state: state, save: save, today: today,
    done: done, doneCount: doneCount, unlocked: unlocked, currentDay: currentDay,
    completeDay: completeDay, checkIn: checkIn, checkedInToday: checkedInToday,
    activeDays: activeDays, ladderOpen: ladderOpen, clock: clock,
    app: app, saveApp: saveApp, checkUrl: checkUrl,
    answers: answers, saveAnswers: saveAnswers, build: build,
    esc: esc, qs: qs, toast: toast, copy: copy, icon: icon, boot: boot, WEEK: WEEK,
  };
})();

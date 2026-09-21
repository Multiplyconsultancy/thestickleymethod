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
    home:'<path d="M3 9.5 10 3.5l7 6V17a1 1 0 0 1-1 1h-3.6v-5H7.6v5H4a1 1 0 0 1-1-1z"/>',
    modules:'<rect x="3" y="3.5" width="14" height="4.2" rx="1.6"/><rect x="3" y="10" width="14" height="6.5" rx="1.6"/>',
    system:'<rect x="3" y="3.5" width="6" height="6" rx="1.6"/><rect x="11" y="3.5" width="6" height="6" rx="1.6"/><rect x="3" y="11" width="6" height="5.5" rx="1.6"/><rect x="11" y="11" width="6" height="5.5" rx="1.6"/>',
    bonus:'<path d="M10 3.2 12 7.4l4.6.6-3.4 3.2.9 4.6L10 13.6 5.9 15.8l.9-4.6L3.4 8l4.6-.6z"/>',
    community:'<circle cx="7.4" cy="8" r="2.4"/><circle cx="13.2" cy="8.6" r="1.9"/><path d="M3.4 16c0-2.2 1.8-3.6 4-3.6s4 1.4 4 3.6M12.4 12.6c2 .1 3.5 1.4 3.5 3.4"/>',
    announce:'<path d="M4 8.2v3.6h2.6L12 15.4V4.6L6.6 8.2z"/><path d="M14.6 7.4a3.6 3.6 0 0 1 0 5.2"/>',
    wins:'<path d="M6 3.5h8v3.2a4 4 0 0 1-8 0z"/><path d="M6 4.6H3.8v1.2A2.6 2.6 0 0 0 6.4 8.4M14 4.6h2.2v1.2a2.6 2.6 0 0 1-2.6 2.6"/><path d="M10 10.8v3M7 16.5h6"/>',
    leaderboard:'<rect x="3.2" y="9" width="3.6" height="7.5" rx="1"/><rect x="8.2" y="4.5" width="3.6" height="12" rx="1"/><rect x="13.2" y="7" width="3.6" height="9.5" rx="1"/>',
    lock:'<rect x="4.6" y="8.8" width="10.8" height="7.6" rx="2"/><path d="M7.2 8.8V6.6a2.8 2.8 0 0 1 5.6 0v2.2"/>',
    tick:'<path d="M4.6 10.3l3.4 3.4 7.4-7.6"/>',
    back:'<path d="M11.6 4.8 6.4 10l5.2 5.2"/>',
    play:'<path d="M7.4 5.2 14.6 10l-7.2 4.8z"/>',
    flame:'<path d="M10 3.2s3.6 3.1 3.6 6.4a3.6 3.6 0 0 1-7.2 0c0-1.3.5-2.3.5-2.3s.7 1 1.5 1c.9 0 1.6-.8 1.6-2.3 0-1.2 0-2.8 0-2.8z"/><path d="M6.4 9.6a3.6 3.6 0 0 0 7.2 0c0 4-1.6 6.6-3.6 6.6s-3.6-2.6-3.6-6.6z"/>',
    heart:'<path d="M10 16.2S3.6 12.4 3.6 8.1A3.3 3.3 0 0 1 10 6.5a3.3 3.3 0 0 1 6.4 1.6c0 4.3-6.4 8.1-6.4 8.1z"/>',
    chart:'<path d="M3.6 16.4h12.8"/><path d="M6 16.4V9.6M10 16.4V4.8M14 16.4v-4.6"/>',
    chat:'<path d="M16.4 11.2a2.4 2.4 0 0 1-2.4 2.4H7.2L3.6 16.4V5.6a2.4 2.4 0 0 1 2.4-2.4h8a2.4 2.4 0 0 1 2.4 2.4z"/>',
    depth:'<circle cx="10" cy="10" r="6.6"/><circle cx="10" cy="10" r="3.4"/><circle cx="10" cy="10" r=".9" fill="currentColor"/>',
    crown:'<path d="M3.4 6.2 6.2 11l3.8-6 3.8 6 2.8-4.8v8.6a1.4 1.4 0 0 1-1.4 1.4H4.8a1.4 1.4 0 0 1-1.4-1.4z"/>',
    grid:'<rect x="3.4" y="3.4" width="5.6" height="5.6" rx="1.5"/><rect x="11" y="3.4" width="5.6" height="5.6" rx="1.5"/><rect x="3.4" y="11" width="5.6" height="5.6" rx="1.5"/><rect x="11" y="11" width="5.6" height="5.6" rx="1.5"/>',
    live:'<circle cx="10" cy="10" r="2.6"/><path d="M6.2 6.2a5.4 5.4 0 0 0 0 7.6M13.8 13.8a5.4 5.4 0 0 0 0-7.6"/>',
  };

  function icon(n) {
    return '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
  }


  /* ── Progress ring. Plain SVG, no library, stroke-dasharray for the
     arc so it animates for free if anything ever transitions it. ── */
  function ring(pct, size, accent) {
    size = size || 138;
    var r = (size / 2) - 9, c = 2 * Math.PI * r;
    var off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
    return '<div class="ring"><svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" ' +
        'stroke="rgba(255,255,255,.07)" stroke-width="9"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" ' +
        'stroke="' + (accent || 'var(--gold)') + '" stroke-width="9" stroke-linecap="round" ' +
        'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg></div>';
  }

  /* ── Activity heatmap. Twelve weeks back, Monday-first columns, and
     today ringed. Reads the same check-in set the ladder counts. ── */
  function heatmap(weeks) {
    weeks = weeks || 12;
    var set = {};
    state().checkins.forEach(function (d) { set[d] = 1; });
    Object.keys(state().days).forEach(function (k) {
      var d = state().days[k]; if (d.date) set[d.date] = (set[d.date] || 0) + 1;
    });

    var now = new Date(); now.setHours(0, 0, 0, 0);
    var end = new Date(now); end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1));
    var startD = new Date(end); startD.setDate(startD.getDate() - (weeks * 7 - 1));
    var tod = today(), out = '<div class="heat">', cur = new Date(startD);

    for (var w = 0; w < weeks; w++) {
      out += '<div class="heat__wk">';
      for (var i = 0; i < 7; i++) {
        var key = cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0') + '-' + String(cur.getDate()).padStart(2, '0');
        var v = set[key] || 0;
        var lvl = v >= 3 ? ' l3' : v === 2 ? ' l2' : v === 1 ? ' l1' : '';
        out += '<i class="heat__d' + lvl + (key === tod ? ' today' : '') + '" title="' + key + '"></i>';
        cur.setDate(cur.getDate() + 1);
      }
      out += '</div>';
    }
    return out + '</div>';
  }

  /* ── Navigation. Five items. Never more. ──────────────────────────
     The first build had eleven and that is precisely why it felt like
     a menu instead of a path. */
  var NAV = [
    { id:'home',    label:'Home',          href:'/member/start',               icon:'home' },
    { id:'modules', label:'Modules',       href:'/member/start/modules',       icon:'modules' },
    { id:'system',  label:'My System',     href:'/member/start/my-system',     icon:'system' },
    { id:'bonus',   label:'Bonus',         href:'/member/start/bonus',         icon:'bonus' },
    { id:'comm',    label:'Community',     href:'/member/start/bonus',         icon:'community',   gated:true },
    { id:'ann',     label:'Announcements', href:'/member/start/announcements', icon:'announce',    badge:3 },
    { id:'wins',    label:'Wins',          href:'/member/start/wins',          icon:'wins' },
    { id:'board',   label:'Leaderboard',   href:'/member/start/bonus',         icon:'leaderboard', gated:true },
  ];

  function boot(current) {
    var open = ladderOpen();
    var logo = '<span class="mark__logo">SM</span>';

    var rail = '<a class="mark" href="/member/start">' + logo +
      '<div><b>Self-Mastery</b><span>The System</span></div></a><nav class="nav">';
    NAV.forEach(function (i) {
      var cur = i.id === current ? ' aria-current="page"' : '';
      var tail = '';
      if (i.gated && !open) tail = '<span class="nav__lock">' + icon('lock') + '</span>';
      else if (i.badge)     tail = '<span class="nav__badge">' + i.badge + '</span>';
      rail += '<a href="' + i.href + '"' + cur + '>' + icon(i.icon) +
              '<span>' + esc(i.label) + '</span>' + tail + '</a>';
    });
    rail += '</nav><div class="rail__foot">' + doneCount() + ' of 7 days done</div>';
    var r = document.querySelector('.rail'); if (r) r.innerHTML = rail;

    var t = document.querySelector('.topbar');
    if (t) t.innerHTML = logo + '<b>Self-Mastery</b><span class="sp"></span>' +
      '<span class="tb-prog">' + doneCount() + '/7</span>';

    /* Five slots on mobile: the ones somebody opens daily. */
    var TABS = ['home', 'modules', 'system', 'bonus', 'wins'];
    var tb = document.querySelector('.tabbar');
    if (tb) tb.innerHTML = NAV.filter(function (i) { return TABS.indexOf(i.id) > -1; })
      .map(function (i) {
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
    ring: ring, heatmap: heatmap,
    esc: esc, qs: qs, toast: toast, copy: copy, icon: icon, boot: boot, WEEK: WEEK,
  };
})();

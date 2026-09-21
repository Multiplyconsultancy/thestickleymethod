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

  /* ── Progress ──────────────────────────────────────────────────
     Days hold MODULES now, so progress is tracked at two levels: which
     modules of a day are finished, and whether the day itself is closed.
     ─────────────────────────────────────────────────────────────── */
  function done(n) { return !!state().days[String(n)]; }
  function doneCount() { return Object.keys(state().days).length; }

  function partsDone(n) { return Store.get('parts.' + n, []); }
  function partDone(n, id) { return partsDone(n).indexOf(id) > -1; }
  function completePart(n, id) {
    var l = partsDone(n);
    if (l.indexOf(id) === -1) { l.push(id); Store.set('parts.' + n, l); }
    return l;
  }
  function uncompletePart(n, id) {
    Store.set('parts.' + n, partsDone(n).filter(function (x) { return x !== id; }));
  }
  function allPartsDone(n) {
    var d = window.PATH.day(n);
    if (!d) return false;
    var done = partsDone(n);
    return d.parts.every(function (p) { return done.indexOf(p.id) > -1; });
  }

  /* ── The two gates ─────────────────────────────────────────────────
     MINIMUM TIME ON A DAY. The complete button stays disabled until the
     day's own minMinutes have passed since the member first opened it.
     Day one is 15 minutes; a build that genuinely takes forty-five
     cannot honestly be submitted ninety seconds after arriving.

     THE NEXT DAY OPENS ON A TIMER. UNLOCK_HOURS after the previous day
     is closed. Twenty rather than twenty-four so that somebody who
     worked at 9pm on Monday is not locked out at 8pm on Tuesday. This
     is the single constant to change if the pacing turns out wrong.
     ─────────────────────────────────────────────────────────────── */
  var UNLOCK_HOURS = 20;

  function firstSeen(n) {
    var k = 'seen.' + n, t = Store.get(k, null);
    if (!t) { t = Date.now(); Store.set(k, t); }
    return t;
  }
  function seenFor(n) { return Date.now() - firstSeen(n); }
  function minMs(n) {
    var d = window.PATH.day(n);
    return ((d && d.minMinutes) || 0) * 60000;
  }
  function submitIn(n) { return Math.max(0, minMs(n) - seenFor(n)); }
  function canSubmit(n) { return submitIn(n) <= 0; }

  /* When does day n open? Day 1 immediately; anything else is a fixed
     gap after the day before it was closed. */
  function unlockAt(n) {
    n = parseInt(n, 10);
    if (n <= 1) return 0;
    var prev = state().days[String(n - 1)];
    if (!prev) return null;                       // previous day not finished
    return new Date(prev.doneAt).getTime() + UNLOCK_HOURS * 3600000;
  }
  function openIn(n) {
    var at = unlockAt(n);
    if (at === null) return null;
    return Math.max(0, at - Date.now());
  }
  function unlocked(n) {
    n = parseInt(n, 10);
    if (n <= 1) return true;
    if (done(n)) return true;
    var left = openIn(n);
    return left !== null && left <= 0;
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

  function activeDays() {
    var s = state(), set = {};
    s.checkins.forEach(function (d) { set[d] = 1; });
    Object.keys(s.days).forEach(function (k) { if (s.days[k].date) set[s.days[k].date] = 1; });
    return Object.keys(set).length;
  }

  /* THE LADDER OPENS ON THE SEVENTH DAY BEING CLOSED, full stop.
     It previously also required seven distinct calendar days, which
     meant somebody could finish all seven and unlock nothing, with no
     explanation on screen. The day-unlock timer already guarantees the
     week takes a week; asking for it twice was a bug, not a rule. */
  function ladderOpen() { return doneCount() >= WEEK; }

  /* ── The clock ────────────────────────────────────────────────────
     Starts when the first app is verified, not at signup: a countdown
     running against somebody who has not begun is just a reason to
     feel behind before they start. */
  function clock() {
    var s = state();
    if (!s.startedAt) return null;
    var ends = new Date(s.startedAt).getTime() + (WEEK + 1) * 86400000;
    return Math.max(0, ends - Date.now());
  }

  /* ── Live countdowns ──────────────────────────────────────────────
     Countdowns previously only moved on a page refresh, which is not a
     countdown. Every timer on the site registers here and one interval
     repaints them all each second. Returns a stop function. */
  var ticks = [], ticking = null;
  function tick(fn) {
    fn();
    ticks.push(fn);
    if (!ticking) ticking = setInterval(function () {
      for (var i = 0; i < ticks.length; i++) { try { ticks[i](); } catch (e) {} }
    }, 1000);
    return function () { ticks = ticks.filter(function (f) { return f !== fn; }); };
  }

  /* ms -> the largest sensible units, for a countdown face. */
  function parts_(ms) {
    if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
    return {
      d: Math.floor(ms / 86400000),
      h: Math.floor(ms / 3600000) % 24,
      m: Math.floor(ms / 60000) % 60,
      s: Math.floor(ms / 1000) % 60,
      over: false,
    };
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function clockFace(ms) {
    var p = parts_(ms);
    return p.d > 0
      ? [{ v: p.d, l: 'Days' }, { v: pad(p.h), l: 'Hours' }, { v: pad(p.m), l: 'Mins' }]
      : [{ v: pad(p.h), l: 'Hours' }, { v: pad(p.m), l: 'Mins' }, { v: pad(p.s), l: 'Secs' }];
  }
  function shortLeft(ms) {
    var p = parts_(ms);
    if (p.over) return 'now';
    if (p.d) return p.d + 'd ' + p.h + 'h';
    if (p.h) return p.h + 'h ' + p.m + 'm';
    return p.m + 'm ' + pad(p.s) + 's';
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


  /* ── Progress ring. Owns its own centre label: pages were
     positioning it with negative margins, which is what clipped the
     panel beside it. ── */
  function ring(pct, size, accent, big, small) {
    size = size || 138;
    var r = (size / 2) - 8, c = 2 * Math.PI * r;
    var off = c * (1 - Math.max(0, Math.min(1, pct / 100)));
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" ' +
          'stroke="rgba(255,255,255,.06)" stroke-width="8"/>' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" ' +
          'stroke="' + (accent || 'var(--gold)') + '" stroke-width="8" stroke-linecap="round" ' +
          'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg>' +
      (big !== undefined
        ? '<div class="ring__mid"><b>' + big + '</b>' + (small ? '<span>' + small + '</span>' : '') + '</div>'
        : '') +
      '</div>';
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
    partsDone: partsDone, partDone: partDone, completePart: completePart,
    uncompletePart: uncompletePart, allPartsDone: allPartsDone,
    unlockAt: unlockAt, openIn: openIn, UNLOCK_HOURS: UNLOCK_HOURS,
    firstSeen: firstSeen, submitIn: submitIn, canSubmit: canSubmit,
    tick: tick, clockFace: clockFace, shortLeft: shortLeft,
    completeDay: completeDay, checkIn: checkIn, checkedInToday: checkedInToday,
    activeDays: activeDays, ladderOpen: ladderOpen, clock: clock,
    app: app, saveApp: saveApp, checkUrl: checkUrl,
    answers: answers, saveAnswers: saveAnswers, build: build,
    ring: ring, heatmap: heatmap,
    esc: esc, qs: qs, toast: toast, copy: copy, icon: icon, boot: boot, WEEK: WEEK,
  };
})();

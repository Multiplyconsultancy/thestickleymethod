"use strict";

/* Add ?debug=1 to any purchase page to see exactly what Whop sent in the
   URL. Shows nothing at all unless the flag is present, so it is safe to
   leave deployed. */
document.addEventListener('DOMContentLoaded', function () {
  var qs = new URLSearchParams(window.location.search);
  if (!qs.get('debug')) return;

  var params = [];
  qs.forEach(function (v, k) { if (k !== 'debug') params.push(k + ' = ' + v); });

  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#111;' +
    'color:#0EC4E6;font:12px/1.5 monospace;padding:12px 16px;white-space:pre-wrap;' +
    'border-top:2px solid #0EC4E6';
  box.textContent = 'URL PARAMS RECEIVED\n' +
    (params.length ? params.join('\n') : '(none, so the one-click cannot arm)') +
    '\n\nfull url: ' + window.location.href;
  document.body.appendChild(box);
});

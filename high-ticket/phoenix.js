"use strict";
/* Shared phoenix animation for the high-ticket funnel.
   .phoenix        -> header logo, replays every 15s
   .phoenix-footer -> bottom banner, replays every 20s */
(function() {
  var FRAME_COUNT = 121;
  var FPS = 24;
  var FRAME_DELAY = Math.round(1000 / FPS);

  var frames = [];
  var loadedCount = 0;

  function padNum(n) { return ('000' + n).slice(-4); }

  function makePlayer(canvas, repeatAfter) {
    var ctx = canvas.getContext('2d');
    var playing = false;
    var timer = null;

    function draw(img) {
      if (!img) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var cw = canvas.width, ch = canvas.height;
      var scale = Math.min(cw / iw, ch / ih);
      ctx.drawImage(img, (cw - iw*scale)/2, (ch - ih*scale)/2, iw*scale, ih*scale);
    }

    function play() {
      if (playing) return;
      playing = true;
      var frame = 0;
      clearInterval(timer);
      timer = setInterval(function() {
        if (frames[frame]) draw(frames[frame]);
        frame++;
        if (frame >= FRAME_COUNT) {
          clearInterval(timer);
          playing = false;
          setTimeout(function() { if (!playing) play(); }, repeatAfter);
        }
      }, FRAME_DELAY);
    }

    return { draw: draw, play: play };
  }

  var players = [];
  document.querySelectorAll('.phoenix').forEach(function(c) {
    players.push(makePlayer(c, 15000));
  });
  document.querySelectorAll('.phoenix-footer').forEach(function(c) {
    players.push(makePlayer(c, 20000));
  });

  for (var i = 0; i < FRAME_COUNT; i++) {
    (function(idx) {
      var img = new Image();
      img.onload = function() {
        frames[idx] = img;
        loadedCount++;
        if (idx === 0) players.forEach(function(p) { p.draw(img); });
        if (loadedCount === 15) players.forEach(function(p) { p.play(); });
      };
      img.src = '../frames/frame_' + padNum(idx + 1) + '.png';
    })(i);
  }
})();

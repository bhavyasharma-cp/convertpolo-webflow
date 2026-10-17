/*
 * KNEETOES case study — the two-slide step carousel on mobile.
 * Figma: 1:2453, where each step shows the desktop screen first and the phone
 * mockup as a second slide, with two dots underneath.
 *
 * The scrolling and snapping are CSS (overflow-x + scroll-snap on
 * [data-cp="bbs-slides"]); this only keeps the dots in step with the position,
 * and lets a dot scroll to its slide.
 *
 * Markup (Webflow):
 *   [data-cp="bbs-slides"]        the scroller; its element children are the slides
 *   .bbs-step_dots               sibling row of .bbs-step_dot / .bbs-step_dot-on
 *
 * Above 767px the scroller is a plain positioned block and the dots are hidden,
 * so the script simply has nothing to keep in sync.
 */
(function () {
  'use strict';

  var ON = 'bbs-step_dot-on';
  var OFF = 'bbs-step_dot';

  function init(track) {
    var step = track.closest ? track.closest('.bbs-step') : null;
    if (!step) return;
    var dots = Array.prototype.slice.call(step.querySelectorAll('.' + ON + ', .' + OFF));
    var slides = Array.prototype.slice.call(track.children);
    if (dots.length < 2 || slides.length < 2) return;

    function mark(i) {
      dots.forEach(function (dot, n) {
        dot.className = n === i ? ON : OFF;
        dot.setAttribute('aria-current', n === i ? 'true' : 'false');
      });
    }

    function nearest() {
      var mid = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      var bestGap = Infinity;
      slides.forEach(function (slide, i) {
        var gap = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - mid);
        if (gap < bestGap) { bestGap = gap; best = i; }
      });
      return best;
    }

    var queued = false;
    track.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        mark(nearest());
      });
    }, { passive: true });

    dots.forEach(function (dot, i) {
      dot.setAttribute('role', 'button');
      dot.setAttribute('tabindex', '0');
      dot.addEventListener('click', function () {
        var slide = slides[i];
        if (!slide) return;
        var left = slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2;
        try { track.scrollTo({ left: left, behavior: 'smooth' }); }
        catch (e) { track.scrollLeft = left; }
      });
    });

    mark(0);
  }

  function start() {
    try {
      var tracks = document.querySelectorAll('[data-cp="bbs-slides"]');
      Array.prototype.forEach.call(tracks, function (track) {
        try { init(track); } catch (e) { console.debug('bbs-slides: init failed', e); }
      });
    } catch (e) {
      console.debug('bbs-slides: no carousels on this page', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

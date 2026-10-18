/*
 * KNEETOES case study — the two-slide step carousel on mobile.
 * Figma: 1:2453, where each step shows the desktop screen first and the phone
 * mockup as a second slide, with two dots underneath.
 *
 * The scrolling and snapping are CSS (overflow-x + scroll-snap on
 * [data-cp="bbs-slides"]); this keeps the dots in step with the position, lets a
 * dot scroll to its slide, and sizes the scroller to whichever slide is showing.
 *
 * That last part matters on step 04, where Figma gives the component two states:
 * the cart screen is only 295 tall, so the number and copy sit right under it,
 * while the phone slide is 547 and pushes them down (variants 1:5201 / 1:5214).
 * Without it the phone would simply overlap the copy.
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
      fit(slides[i]);
    }

    // Only while the scroller is actually a carousel — above 767px it is a
    // plain positioned block and must keep the height its class gives it.
    function fit(slide) {
      if (!slide || getComputedStyle(track).overflowX !== 'auto') return;
      track.style.height = slide.offsetHeight + 'px';
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
    window.addEventListener('resize', function () {
      if (getComputedStyle(track).overflowX !== 'auto') { track.style.height = ''; return; }
      mark(nearest());
    });
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

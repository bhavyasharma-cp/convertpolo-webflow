/*
 * Careers page — the application-process card row.
 * Figma: desktop 117:5996 (cards at x 120 / 639 / 1158, 499 wide),
 *        mobile 123:7329 (cards at x 14 / 348, 320 wide).
 *
 * In both frames the row is wider than the canvas and the last card is cut off
 * by the right edge, so the row scrolls sideways. The scrolling and snapping are
 * CSS (overflow-x + scroll-snap on [data-cp="jobs-cards"]); touch and trackpad
 * already work from that alone, and the page renders correctly with no JS.
 *
 * All this adds is grab-and-drag with a mouse, because a desktop visitor with a
 * plain wheel has no other way to reach card 03.
 *
 * Markup (Webflow):
 *   [data-cp="jobs-cards"]   the scroller; its element children are the cards
 *
 * While a drag is in progress the row carries `is-dragging`, which the page
 * embed uses to swap the cursor, suspend snapping and stop the pointer landing
 * on a link inside a card.
 */
(function () {
  'use strict';

  var MOVED = 4; // px of travel before a press counts as a drag, not a click

  function init(track) {
    var down = false;
    var dragging = false;
    var startX = 0;
    var startScroll = 0;

    // Snapping is suspended while dragging, and Chrome does not reliably re-snap
    // when the property comes back, so put the nearest card on the gutter here.
    function settle() {
      var pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      var best = null;
      var bestGap = Infinity;
      Array.prototype.forEach.call(track.children, function (card) {
        var gap = Math.abs(card.offsetLeft - pad - track.scrollLeft);
        if (gap < bestGap) { bestGap = gap; best = card; }
      });
      if (!best) return;
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      track.scrollTo({ left: best.offsetLeft - pad, behavior: still ? 'auto' : 'smooth' });
    }

    function end() {
      if (!down) return;
      down = false;
      if (dragging) {
        dragging = false;
        // let the class drop after this event, so the click it would have
        // fired on a card is still swallowed by pointer-events: none
        window.setTimeout(function () {
          track.classList.remove('is-dragging');
          settle();
        }, 0);
      }
    }

    track.addEventListener('pointerdown', function (event) {
      // mouse only — touch and pen already scroll natively, and hijacking them
      // breaks the momentum fling
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      down = true;
      startX = event.clientX;
      startScroll = track.scrollLeft;
    });

    track.addEventListener('pointermove', function (event) {
      if (!down) return;
      var dx = event.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < MOVED) return;
        dragging = true;
        track.classList.add('is-dragging');
        try { track.setPointerCapture(event.pointerId); } catch (err) { /* older browser */ }
      }
      track.scrollLeft = startScroll - dx;
      event.preventDefault();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (name) {
      track.addEventListener(name, end);
    });

    // a drag that ends over a card would otherwise open its link
    track.addEventListener('click', function (event) {
      if (dragging) { event.preventDefault(); event.stopPropagation(); }
    }, true);

    // the browser's own image drag fights the pointer drag
    track.addEventListener('dragstart', function (event) {
      if (down) event.preventDefault();
    });
  }

  function start() {
    try {
      var tracks = document.querySelectorAll('[data-cp="jobs-cards"]');
      Array.prototype.forEach.call(tracks, init);
    } catch (err) {
      console.debug('jobs-cards: ' + err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

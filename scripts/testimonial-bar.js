/*
 * Testimonial bar — the tick ruler under the testimonial cards (CRO / LPO / BBS).
 *
 * Figma draws it (desktop "Bar", mobile "Slider") with the orange tick at the start in every
 * frame and gives it no behaviour, so it was static markup and never moved. The behaviour here
 * was agreed with the client: it is the row's scroll position.
 *
 *   - The orange tick follows the card row: first tick when the row is at its start, last tick
 *     when it has scrolled to its end.
 *   - Clicking the bar scrolls the row to that point; dragging along it scrubs the row. That
 *     matters on desktop, where a mouse wheel drives the page's pinned sequence, not the row.
 *
 * Markup:
 *   [data-cp="testimonials"]        the scrolling card row
 *   [data-cp="testimonial-bar"]     the bar, a sibling of the row; its ticks are <i> elements
 *                                   and the orange one carries .is-active
 *
 * Every bar on the page is wired, so the section can be reused. Only the tick's class and the
 * row's scrollLeft change; the pinned sequences that move the whole section are untouched.
 */
(function () {
  'use strict';

  var BAR = '[data-cp="testimonial-bar"]';
  var LIST = '[data-cp="testimonials"]';
  var ACTIVE = 'is-active';

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // The row the bar belongs to: the nearest [data-cp="testimonials"] before it, else the first
  // one in the same parent.
  function findList(bar) {
    for (var el = bar.previousElementSibling; el; el = el.previousElementSibling) {
      if (el.matches && el.matches(LIST)) return el;
      var inner = el.querySelector && el.querySelector(LIST);
      if (inner) return inner;
    }
    return bar.parentNode ? bar.parentNode.querySelector(LIST) : null;
  }

  function init(bar) {
    var list = findList(bar);
    var ticks = Array.prototype.slice.call(bar.querySelectorAll('i'));
    if (!list || ticks.length < 2) return;

    var current = -1;
    function maxScroll() { return Math.max(0, list.scrollWidth - list.clientWidth); }

    function render() {
      var max = maxScroll();
      var p = max > 0 ? list.scrollLeft / max : 0;
      var i = Math.round(Math.min(1, Math.max(0, p)) * (ticks.length - 1));
      if (i === current) return;
      if (current >= 0 && ticks[current]) ticks[current].classList.remove(ACTIVE);
      else ticks.forEach(function (t) { t.classList.remove(ACTIVE); });
      ticks[i].classList.add(ACTIVE);
      current = i;
    }

    var queued = false;
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; render(); });
    }
    list.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);

    // ---- Click / drag on the bar ------------------------------------------------------------
    // Positions are measured against the tick row itself, so the bar's padding does not count.
    function fractionAt(clientX) {
      var first = ticks[0].getBoundingClientRect();
      var last = ticks[ticks.length - 1].getBoundingClientRect();
      var start = first.left + first.width / 2, end = last.left + last.width / 2;
      if (end <= start) return 0;
      return Math.min(1, Math.max(0, (clientX - start) / (end - start)));
    }

    var dragging = false, snap = '';
    function scrollToFraction(f, smooth) {
      var left = f * maxScroll();
      if (smooth && !reduced() && list.scrollTo) list.scrollTo({ left: left, behavior: 'smooth' });
      else list.scrollLeft = left;
    }

    bar.style.cursor = 'pointer';
    bar.style.touchAction = 'pan-y';

    bar.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      try {
        dragging = true;
        // Scroll snapping would yank the row back to a card on every step of a drag.
        snap = list.style.scrollSnapType;
        list.style.scrollSnapType = 'none';
        if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId);
        scrollToFraction(fractionAt(e.clientX), false);
        e.preventDefault();
      } catch (err) { console.debug('testimonial-bar: pointerdown', err); }
    });

    bar.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      scrollToFraction(fractionAt(e.clientX), false);
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      try {
        if (bar.releasePointerCapture && e && e.pointerId !== undefined) bar.releasePointerCapture(e.pointerId);
        var left = list.scrollLeft;
        list.style.scrollSnapType = snap;
        // Let the row settle on the nearest card again, smoothly, from where the drag left it.
        list.scrollLeft = left;
      } catch (err) { console.debug('testimonial-bar: end', err); }
    }
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    bar.addEventListener('lostpointercapture', end);

    render();
  }

  function start() {
    try {
      var bars = document.querySelectorAll(BAR);
      for (var i = 0; i < bars.length; i++) {
        try { init(bars[i]); } catch (err) { console.debug('testimonial-bar', err); }
      }
    } catch (err) {
      console.debug('testimonial-bar', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

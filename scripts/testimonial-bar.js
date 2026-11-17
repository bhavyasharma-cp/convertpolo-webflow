/*
 * Testimonial bar — the tick ruler under the testimonial cards (CRO / LPO / BBS).
 *
 * Figma draws it (desktop "Bar", mobile "Slider") as a ruler of thin ticks with a taller dark
 * tick every fifth and the first one orange, and gives it no behaviour. The behaviour here was
 * agreed with the client:
 *
 *   - The ruler is built from the cards: one tall dark tick per review, thin ticks between them,
 *     so adding or removing a card in Webflow updates the ruler by itself.
 *   - The orange tick is the review in view. It moves with the row as it scrolls, and rests on
 *     the review's tick when the row settles.
 *   - Clicking the bar goes to the review nearest the click; dragging along it scrubs through
 *     the reviews and settles on the nearest one on release. On desktop this is the main way
 *     to move the row, since the mouse wheel drives the page's pinned sequence.
 *
 * Markup:
 *   [data-cp="testimonials"]        the scrolling card row; its children are the cards
 *   [data-cp="testimonial-bar"]     the bar, a sibling of the row, holding .cro-ticks
 *
 * The ticks use the existing classes: plain <i> is a thin tick, .is-major a tall dark one and
 * .is-active the orange one. Only the ticks and the row's scrollLeft change; the pinned
 * sequences that move the whole section are untouched.
 */
(function () {
  'use strict';

  var BAR = '[data-cp="testimonial-bar"]';
  var LIST = '[data-cp="testimonials"]';
  var MAX_TICKS = 25;          // the Figma bar holds 26 ticks at 7px; keep inside its width
  var SETTLE_MS = 700;         // fallback for browsers without the scrollend event

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

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
    var holder = bar.querySelector('.cro-ticks') || bar;
    if (!list) return;
    var cards = Array.prototype.slice.call(list.children).filter(function (c) { return c.offsetWidth > 0 || c.offsetHeight > 0 || c.children.length; });
    var n = cards.length;
    if (n < 1) return;

    // ---- Build the ruler: a major tick per card, `gap` ticks per step between cards ---------
    var gap = n > 1 ? Math.max(1, Math.floor((MAX_TICKS - 1) / (n - 1))) : 1;
    var count = n > 1 ? (n - 1) * gap + 1 : 1;
    holder.innerHTML = '';
    var ticks = [];
    for (var t = 0; t < count; t++) {
      var tick = document.createElement('i');
      if (t % gap === 0) tick.className = 'is-major';
      holder.appendChild(tick);
      ticks.push(tick);
    }

    // ---- Where each card sits when it is "the one in view" ----------------------------------
    function maxScroll() { return Math.max(0, list.scrollWidth - list.clientWidth); }
    function targets() {
      var lr = list.getBoundingClientRect();
      var cs = getComputedStyle(list);
      var pad = parseFloat(cs.scrollPaddingLeft) || parseFloat(cs.paddingLeft) || 0;
      var border = parseFloat(cs.borderLeftWidth) || 0;
      var max = maxScroll();
      return cards.map(function (c) {
        var x = c.getBoundingClientRect().left - lr.left - border + list.scrollLeft - pad;
        return Math.min(max, Math.max(0, Math.round(x)));
      });
    }

    // The last cards on a wide screen can all share the end of the row; remember which one was
    // asked for so clicking card 6 of 7 lights card 6, not 7.
    var chosen = -1;

    // Scroll position → tick index: interpolate between the cards either side of it.
    function tickForScroll(x) {
      var tg = targets();
      if (n === 1) return 0;
      var max = maxScroll();
      if (x >= max - 1) {
        var last = n - 1;
        if (chosen >= 0 && tg[chosen] >= max - 1) last = chosen;
        return last * gap;
      }
      for (var i = 0; i < n - 1; i++) {
        var a = tg[i], b = tg[i + 1];
        if (x <= b) {
          if (b <= a) return (i + 1) * gap;
          var f = Math.min(1, Math.max(0, (x - a) / (b - a)));
          return Math.round((i + f) * gap);
        }
      }
      return (n - 1) * gap;
    }

    var current = -1;
    function setActive(i) {
      i = Math.max(0, Math.min(ticks.length - 1, i));
      if (i === current) return;
      if (current >= 0) ticks[current].classList.remove('is-active');
      ticks[i].classList.add('is-active');
      current = i;
    }

    var dragging = false;
    var queued = false;
    function onScroll() {
      if (dragging || queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; setActive(tickForScroll(list.scrollLeft)); });
    }
    list.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // ---- Click / drag ------------------------------------------------------------------------
    function fractionAt(clientX) {
      var a = ticks[0].getBoundingClientRect(), b = ticks[ticks.length - 1].getBoundingClientRect();
      var start = a.left + a.width / 2, end = b.left + b.width / 2;
      if (end <= start) return 0;
      return Math.min(1, Math.max(0, (clientX - start) / (end - start)));
    }

    var snap = '';
    function freeSnap() { snap = list.style.scrollSnapType; list.style.scrollSnapType = 'none'; }
    function restoreSnap() { list.style.scrollSnapType = snap; }

    function goTo(card) {
      card = Math.max(0, Math.min(n - 1, card));
      chosen = card;
      setActive(card * gap);
      var left = targets()[card];
      freeSnap();
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        list.removeEventListener('scrollend', finish);
        restoreSnap();
        setActive(card * gap);
      }
      if ('onscrollend' in window) list.addEventListener('scrollend', finish);
      setTimeout(finish, SETTLE_MS);
      if (!reduced() && list.scrollTo) list.scrollTo({ left: left, behavior: 'smooth' });
      else { list.scrollLeft = left; finish(); }
      if (Math.abs(list.scrollLeft - left) < 1) finish();
    }

    // While dragging, the row follows the pointer between the cards' positions.
    function scrubTo(f) {
      var pos = f * (n - 1);
      var i = Math.floor(pos), r = pos - i;
      var tg = targets();
      var a = tg[Math.min(i, n - 1)], b = tg[Math.min(i + 1, n - 1)];
      list.scrollLeft = a + (b - a) * r;
      setActive(Math.round(f * (ticks.length - 1)));
    }

    bar.style.cursor = 'pointer';
    bar.style.touchAction = 'pan-y';
    bar.style.userSelect = 'none';

    var startX = 0, moved = false, lastF = 0;
    bar.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      try {
        dragging = true; moved = false; startX = e.clientX;
        lastF = fractionAt(e.clientX);
        freeSnap();
        if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId);
        e.preventDefault();
      } catch (err) { console.debug('testimonial-bar: pointerdown', err); }
    });

    bar.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (!moved && Math.abs(e.clientX - startX) < 4) return;
      moved = true;
      lastF = fractionAt(e.clientX);
      try { scrubTo(lastF); } catch (err) { console.debug('testimonial-bar: drag', err); }
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      try {
        if (bar.releasePointerCapture && e && e.pointerId !== undefined && bar.hasPointerCapture && bar.hasPointerCapture(e.pointerId)) {
          bar.releasePointerCapture(e.pointerId);
        }
        restoreSnap();
        // A click or the end of a drag both land on the nearest review.
        goTo(Math.round(lastF * (n - 1)));
      } catch (err) { console.debug('testimonial-bar: end', err); }
    }
    bar.addEventListener('pointerup', end);
    // The browser took the gesture (e.g. a vertical page swipe that began on the bar): just let
    // go, and let the row snap back onto a card by itself.
    bar.addEventListener('pointercancel', function () {
      if (!dragging) return;
      dragging = false;
      restoreSnap();
      onScroll();
    });

    setActive(tickForScroll(list.scrollLeft));
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

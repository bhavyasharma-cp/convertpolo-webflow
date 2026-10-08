/*
 * Before / after comparison — the phone slider on the Landing Page Optimization page.
 *
 * Figma 117:5449, prototype 1:9580 → 1:9618: the "After" page (variation) covers the top 104px of the
 * "Before" page (control); dragging the bar reveals it down to 828px (Smart Animate 0.6s ease-out).
 * Here the bar follows the pointer anywhere between the top and bottom of the phone; a click or tap
 * on the handle without dragging plays the prototype's move (104 ↔ 828) instead. Arrow keys move it
 * too, so the slider works without a pointer.
 *
 * Markup (Webflow):
 *   [data-cp="compare"]                 the phone (390×864)
 *     [data-cp="compare-after"]         the variation layer, clipped to the bar's position (its height)
 *     [data-cp="compare-bar"]           the white line + handle, positioned at the same height (its top)
 *       [data-cp="compare-handle"]      the DRAG pill
 *
 * No GSAP needed. A failure leaves the static Figma state (104px) in place.
 */
(function () {
  'use strict';

  var START = 104, OPEN = 828;    // Figma: After clipped to 104px (1:9580) and 828px (1:9618)
  var DURATION = 600;             // ms, Smart Animate 0.6s ease-out
  var KEY_STEP = 24;              // px per arrow key press
  var CLICK_SLOP = 4;             // px of movement before a press counts as a drag

  function log(msg, e) { try { console.debug('[compare] ' + msg, e || ''); } catch (_) {} }

  // Figma's "Ease out" curve: cubic-bezier(0, 0, 0.58, 1).
  function figmaEaseOut(t) {
    var u = t;
    for (var i = 0; i < 8; i++) {
      var x = 3 * (1 - u) * u * u * 0.58 + u * u * u - t;
      var dx = 3 * (2 * u - 3 * u * u) * 0.58 + 3 * u * u;
      if (Math.abs(x) < 1e-6 || dx === 0) break;
      u = Math.min(1, Math.max(0, u - x / dx));
    }
    return 3 * (1 - u) * u * u + u * u * u;
  }

  function init(root) {
    var after = root.querySelector('[data-cp="compare-after"]');
    var bar = root.querySelector('[data-cp="compare-bar"]');
    var handle = root.querySelector('[data-cp="compare-handle"]');
    if (!after || !bar || !handle) return log('markup incomplete');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pos = START, frame = 0;

    function max() { return root.clientHeight || 864; }
    function set(y) {
      pos = Math.max(0, Math.min(max(), y));
      after.style.height = pos + 'px';
      bar.style.top = pos + 'px';
      handle.setAttribute('aria-valuenow', String(Math.round(pos / max() * 100)));
    }
    function animateTo(y) {
      cancelAnimationFrame(frame);
      if (reduced) return set(y);
      var from = pos, t0 = performance.now();
      (function step(now) {
        var t = Math.min(1, (now - t0) / DURATION);
        set(from + (y - from) * figmaEaseOut(t));
        if (t < 1) frame = requestAnimationFrame(step);
      })(t0);
    }

    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', 'Reveal the page after optimisation');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    set(START);

    // Pointer: drag follows the pointer; a press without movement plays the prototype's move.
    var startY = 0, startPos = 0, dragging = false, pressed = false;
    handle.addEventListener('pointerdown', function (e) {
      pressed = true; dragging = false;
      startY = e.clientY; startPos = pos;
      cancelAnimationFrame(frame);
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!pressed) return;
      var dy = e.clientY - startY;
      if (!dragging && Math.abs(dy) < CLICK_SLOP) return;
      dragging = true;
      set(startPos + dy);
    });
    function release() {
      if (!pressed) return;
      pressed = false;
      if (!dragging) animateTo(pos < (START + OPEN) / 2 ? OPEN : START);
    }
    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', function () { pressed = false; });

    // Keyboard.
    handle.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowRight') set(pos + KEY_STEP);
      else if (k === 'ArrowUp' || k === 'ArrowLeft') set(pos - KEY_STEP);
      else if (k === 'Home') animateTo(0);
      else if (k === 'End') animateTo(max());
      else if (k === 'Enter' || k === ' ') animateTo(pos < (START + OPEN) / 2 ? OPEN : START);
      else return;
      e.preventDefault();
    });
  }

  function boot() {
    var roots = document.querySelectorAll('[data-cp="compare"]');
    for (var i = 0; i < roots.length; i++) {
      try { init(roots[i]); } catch (e) { log('init failed', e); }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

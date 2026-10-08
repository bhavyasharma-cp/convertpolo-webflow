/*
 * Before / after comparison — the phone slider on the Landing Page Optimization page.
 *
 * Figma 117:5449 (desktop), 213:5332 (mobile). Prototype 1:9580 → 1:9618 (desktop): the "After"
 * page (variation) covers the top 104px of the "Before" page (control); dragging the bar reveals
 * it down to 828px (Smart Animate 0.6s ease-out). Mobile is the same at 290px wide: 77.33px → 619px,
 * with the After layer starting 7.67px above the Before page.
 * Here the bar follows the pointer anywhere between the top and bottom of the phone; a click or tap
 * on the handle without dragging plays the prototype's move (start ↔ open) instead. Arrow keys move
 * it too, so the slider works without a pointer.
 *
 * Markup (Webflow):
 *   [data-cp="compare"]                 the phone (390×864 desktop, 290×642.46 mobile)
 *     [data-cp="compare-after"]         the variation layer, clipped to the bar's position (its height);
 *                                       its CSS `top` is where it starts (−7.67px on mobile)
 *     [data-cp="compare-bar"]           the white line + handle, positioned at the layer's bottom (its top)
 *       [data-cp="compare-handle"]      the DRAG pill
 * Positions come from CSS custom properties on the phone, per breakpoint:
 *   --compare-start (default 104px) and --compare-open (default 828px), measured from the layer's top.
 *
 * No GSAP needed. A failure leaves the static Figma state in place.
 */
(function () {
  'use strict';

  var DEFAULT_START = 104, DEFAULT_OPEN = 828;   // Figma desktop: After clipped to 104px (1:9580) and 828px (1:9618)
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
    var pos = 0, frame = 0, cfg = null;

    function readPx(name, fallback) {
      var v = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return isNaN(v) ? fallback : v;
    }
    // Breakpoint values from CSS: where the layer starts, its resting and open heights.
    function config() {
      return {
        offset: after.offsetTop,
        start: readPx('--compare-start', DEFAULT_START),
        open: readPx('--compare-open', DEFAULT_OPEN)
      };
    }
    function max() { return (root.clientHeight || 864) - cfg.offset; }
    function set(y) {
      pos = Math.max(0, Math.min(max(), y));
      after.style.height = pos + 'px';
      bar.style.top = (pos + cfg.offset) + 'px';
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
    function toggle() { animateTo(pos < (cfg.start + cfg.open) / 2 ? cfg.open : cfg.start); }

    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', 'Reveal the page after optimisation');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    cfg = config();
    set(cfg.start);

    // Crossing a breakpoint changes the phone's size: back to that breakpoint's resting state.
    var lastKey = cfg.offset + '|' + cfg.start + '|' + cfg.open;
    window.addEventListener('resize', function () {
      var c = config(), key = c.offset + '|' + c.start + '|' + c.open;
      if (key === lastKey) return;
      lastKey = key; cfg = c;
      cancelAnimationFrame(frame);
      set(cfg.start);
    });

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
      if (!dragging) toggle();
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
      else if (k === 'Enter' || k === ' ') toggle();
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

/*
 * KNEETOES case study — the "who they are" tab block.
 * Figma: component set 1:8177 (variants 1:8178 → 1:8233), placed at 1:12748.
 *
 * The prototype is a three-state loop: the active tab draws a 368px rule under its
 * label over 10s (LINEAR), then hands over to the next tab (SMART_ANIMATE 0.3s).
 * Pointing at a tab switches to it straight away (MOUSE_ENTER / ON_CLICK) and the
 * 10s timer starts again from that tab.
 *
 * Markup (Webflow):
 *   [data-cp="bbs-tabs"]
 *     .bbs-tabs_list > .bbs-tabs_tab (×3)   the active one carries `is-active`
 *     .bbs-tabs_panels > .bbs-tabs_panel    same order, same `is-active`
 *
 * Everything visual (label colour and indent, arrow, rule growth, panel cross-fade)
 * is CSS in the page's head code, keyed off `is-active`; this script only moves
 * that class and keeps the timer.
 */
(function () {
  'use strict';

  var HOLD = 10000; // ms the rule takes to fill — matches the Figma AFTER_TIMEOUT

  function init(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('.bbs-tabs_tab'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.bbs-tabs_panel'));
    if (!tabs.length || tabs.length !== panels.length) return;

    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Below 768px the block is an accordion (Figma 1:2453) and the panels change height,
    // so rotating on a timer would shift the page under the reader. Tap only.
    var accordion = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    var index = 0;
    var timer = null;

    function show(next, restart) {
      index = (next + tabs.length) % tabs.length;
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        panels[i].classList.toggle('is-active', on);
      });
      if (restart) schedule();
    }

    function schedule() {
      if (timer) clearTimeout(timer);
      if (still || accordion) return; // hold this tab; no auto-advance
      timer = setTimeout(function () { show(index + 1, true); }, HOLD);
    }

    tabs.forEach(function (tab, i) {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', '0');
      if (!accordion) tab.addEventListener('mouseenter', function () { show(i, true); });
      tab.addEventListener('click', function () { show(i, true); });
      tab.addEventListener('focus', function () { show(i, true); });
    });

    root.addEventListener('mouseleave', schedule);
    show(0, true);
  }

  function start() {
    try {
      var roots = document.querySelectorAll('[data-cp="bbs-tabs"]');
      Array.prototype.forEach.call(roots, function (root) {
        try { init(root); } catch (e) { console.debug('bbs-tabs: init failed', e); }
      });
    } catch (e) {
      console.debug('bbs-tabs: no tabs on this page', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

/*
 * Header service switcher (CRO / BBS / LPO bars) on touch screens.
 *
 * On desktop the labels slide out on hover (CSS in the header embed: `.header_switcher:hover`).
 * A phone or tablet has no hover, so a tap went straight to the page under the finger and the
 * labels were never seen — the visitor was choosing between three unlabelled bars.
 *
 * On touch screens (hover: none) the first tap now opens the switcher (labels out), and a tap
 * on a label then goes to that page. Tapping outside, or on the current page's item, closes it.
 * Desktop hover is untouched.
 *
 * Markup: nav[data-cp="switcher"] holding the a.header_switcher-item links (the current page's
 * link has aria-current). Open state: .is-open on the nav, styled below to match the hover.
 */
(function () {
  'use strict';

  var NAV = '[data-cp="switcher"]';
  var OPEN = 'is-open';

  function touchOnly() {
    try { return window.matchMedia('(hover: none)').matches; } catch (e) { return false; }
  }

  function addStyles() {
    if (document.getElementById('cp-switcher-css')) return;
    var style = document.createElement('style');
    style.id = 'cp-switcher-css';
    // Same values as the desktop hover in the header embed (phone margins below 768).
    style.textContent =
      '.header_switcher.is-open .header_switcher-item:not([aria-current]) .header_switcher-label' +
      '{max-width:40px;opacity:1;margin-left:5px;margin-right:3px}' +
      '@media (max-width:767px){.header_switcher.is-open .header_switcher-item:not([aria-current]) .header_switcher-label' +
      '{margin-left:3px;margin-right:2px}}';
    document.head.appendChild(style);
  }

  function init(nav) {
    nav.addEventListener('click', function (e) {
      if (!touchOnly()) return;
      var item = e.target.closest ? e.target.closest('a') : null;
      if (!item || !nav.contains(item)) return;
      try {
        if (!nav.classList.contains(OPEN)) {
          // First tap: show the labels instead of leaving the page.
          e.preventDefault();
          nav.classList.add(OPEN);
          return;
        }
        if (item.getAttribute('aria-current')) {
          // Already on this page: close.
          e.preventDefault();
          nav.classList.remove(OPEN);
          if (item.blur) item.blur();
        }
        // Otherwise let the link take the visitor to that page.
      } catch (err) { console.debug('switcher', err); }
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains(OPEN) || nav.contains(e.target)) return;
      nav.classList.remove(OPEN);
      var focused = document.activeElement;
      if (focused && nav.contains(focused) && focused.blur) focused.blur();
    });
  }

  function start() {
    try {
      var navs = document.querySelectorAll(NAV);
      if (!navs.length) return;
      addStyles();
      for (var i = 0; i < navs.length; i++) init(navs[i]);
    } catch (err) {
      console.debug('switcher', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

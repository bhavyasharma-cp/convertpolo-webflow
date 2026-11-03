/*
 * In-page anchor links — the header's "Get Website Audit" and the menu's Contact.
 *
 * The site has no Contact page and no separate audit page: the live WordPress site
 * sends both of those to the footer (its audit button points at `/#form1`), so this
 * build does the same — `#audit` is the footer's heading + form block, `#contact`
 * the footer's email / phone line. Both ids live on the Footer component, so every
 * page answers both links, including pages a non-developer builds later.
 *
 * Three things stop a plain browser jump from working here:
 *
 *   1. The header is `position: fixed`, so a native jump parks the target underneath
 *      it. The scroll is offset by the header's own measured height.
 *   2. Lenis owns the scroll (see smooth-scroll.js). Anything that moves the page
 *      itself fights the lerp, so this goes through `window.cpLenis.scrollTo`.
 *   3. Contact and the menu's two audit buttons sit INSIDE the full-screen menu,
 *      which locks the page while it is open — scrolling to the footer behind it
 *      would do nothing visible. So the menu is closed first, by clicking its own
 *      close button (a Webflow interaction, with no class marker to drive directly),
 *      and the scroll waits until Lenis is running again.
 *
 * Links to another page are left completely alone; so is a bare `href="#"`, which
 * means "not wired up yet" rather than "top of page".
 */
(function () {
  'use strict';

  var GAP = 24;        // breathing room between the header and the target
  var WAIT = 1200;     // ms to wait for the menu to finish closing

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  function offset() {
    var header = document.querySelector('[data-cp="header"], .header_component');
    var height = header ? header.getBoundingClientRect().height : 0;
    return -(height + GAP);
  }

  function go(target) {
    var lenis = window.cpLenis;
    if (lenis && lenis.scrollTo) {
      lenis.scrollTo(target, { offset: offset(), immediate: reduced() });
      return;
    }
    // No Lenis on this page: fall back to the browser's own smooth scroll.
    var top = target.getBoundingClientRect().top + window.pageYOffset + offset();
    window.scrollTo({ top: top, behavior: reduced() ? 'auto' : 'smooth' });
  }

  // Lenis is stopped for as long as the menu holds the page, so its own state is
  // the signal that the overlay has let go — no need to know the interaction's
  // duration. The backstop fires anyway if it never reports running.
  function whenFree(fn) {
    var waited = 0;
    var poll = setInterval(function () {
      waited += 50;
      var lenis = window.cpLenis;
      if (!lenis || !lenis.isStopped || waited >= WAIT) {
        clearInterval(poll);
        fn();
      }
    }, 50);
  }

  function onClick(event) {
    var link = event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#' || href === '#') return;

    var target;
    try {
      target = document.querySelector(href);
    } catch (err) {
      return;                                   // not a usable selector
    }
    if (!target) return;

    event.preventDefault();

    var menu = link.closest('[data-cp="menu"]');
    if (!menu) return go(target);

    var close = document.querySelector('[data-cp="menu-close"]');
    if (close) close.click();                   // the overlay's own interaction
    whenFree(function () { go(target); });
  }

  function init() {
    try {
      document.addEventListener('click', onClick);
    } catch (err) {
      console.debug('nav-anchors:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

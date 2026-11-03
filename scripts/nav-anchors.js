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
 * means "not wired up yet" rather than "top of page". There is no
 * prefers-reduced-motion branch because the scroll is already instant — see go().
 */
(function () {
  'use strict';

  var GAP = 24;        // breathing room between the header and the target
  var WAIT = 1200;     // ms to wait for the menu to finish closing

  function offset() {
    var header = document.querySelector('[data-cp="header"], .header_component');
    var height = header ? header.getBoundingClientRect().height : 0;
    return -(height + GAP);
  }

  // Pinned sections make an anchor's destination unknowable from where you stand.
  // The footer on a service page is the clear case: from the top of the CRO page it
  // measures 4340px away, but ~6000px of that page is pinned storytelling, which
  // holds the footer still while the scroll runs through it. Travel 4340px and the
  // footer is 4340px further on again. Nor can you measure it from the bottom and
  // scroll back: coming back re-enters the pin, and the footer moves again.
  //
  // What is true is that the target's distance down the viewport only ever shrinks
  // as you scroll down. So there is one scroll position where it sits where we want
  // it, and a halving search finds it in a dozen probes.
  //
  // Those probes run inside a single frame, scrolling the window and asking
  // ScrollTrigger to settle the pins each time, so the page is painted once, at the
  // answer — a visible sweep through every sequence on the page is exactly what we
  // are trying to avoid. Lenis is then told where we ended up, or it would ease the
  // page back to where it thought it was.
  var PROBES = 16;

  function bottom() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function settle(y) {
    window.scrollTo(0, y);
    // Pins are transforms ScrollTrigger applies on its own schedule; ask for them
    // now so the measurement that follows is of the page as it will really look.
    if (window.ScrollTrigger && ScrollTrigger.update) ScrollTrigger.update();
    return y;
  }

  function go(target) {
    var want = -offset();                 // where the target should end up
    var from = window.pageYOffset;
    var lo = 0;
    var hi = bottom();

    // Already past it? Search the whole page rather than only what lies below.
    if (target.getBoundingClientRect().top > want) lo = from;

    for (var i = 0; i < PROBES && hi - lo > 1; i++) {
      var mid = (lo + hi) / 2;
      settle(mid);
      if (target.getBoundingClientRect().top > want) lo = mid; else hi = mid;
    }

    var answer = Math.round(hi);
    settle(answer);

    var lenis = window.cpLenis;
    if (lenis && lenis.scrollTo) lenis.scrollTo(answer, { immediate: true });
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

    // Webflow's own script animates in-page anchors, and preventDefault alone does
    // not stop a listener that has already been registered from running. This one
    // listens in the capture phase and takes the click out of circulation, so the
    // page is scrolled once, by us.
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    var menu = link.closest('[data-cp="menu"]');
    if (!menu) return go(target);

    var close = document.querySelector('[data-cp="menu-close"]');
    if (close) close.click();                   // the overlay's own interaction
    whenFree(function () { go(target); });
  }

  function init() {
    try {
      document.addEventListener('click', onClick, true);
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

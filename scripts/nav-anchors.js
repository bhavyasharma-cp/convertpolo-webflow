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

  // Pinned sections make an anchor's destination unknowable from where you start.
  // The footer on a service page is a clear case: at the top of the CRO page it
  // measures 4340px away, but ~6000px of that page is pinned storytelling, which
  // holds the footer still while the scroll runs through it — so by the time you
  // have travelled 4340px the footer is 4340px further on again. Each step gets
  // closer, so re-measuring and stepping again converges; what it converges on is
  // the bottom of the page, which for the footer is exactly right.
  //
  // The steps are instant rather than eased. An eased scroll here would take a
  // second or more and rip through every pinned sequence on the way, and the
  // stepping would be visible as a stutter; a nav link that simply arrives reads
  // as navigation, which is what it is.
  var CLOSE = 4;
  var STEPS = 12;

  function go(target) {
    var want = -offset();                       // where the target should end up
    var lenis = window.cpLenis;
    var step = 0;
    var last = null;

    function bottom() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }

    function jump(y) {
      if (lenis && lenis.scrollTo) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    }

    function hop() {
      var at = window.pageYOffset;
      var off = target.getBoundingClientRect().top - want;
      if (Math.abs(off) <= CLOSE) return;       // arrived
      if (++step > STEPS) return;

      var next = Math.max(0, Math.min(at + off, bottom()));
      if (next === last || Math.abs(next - at) <= CLOSE) return;   // nowhere left to go
      last = next;
      jump(next);
      window.requestAnimationFrame(hop);
    }

    hop();
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

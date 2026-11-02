/*
 * Site header — cream background once the page is scrolled.
 *
 * The header is `position: fixed` site-wide (style `.header_component`), so from
 * the moment a page moves, its content passes behind a transparent bar: the tool
 * logos on the service pages run under the ConvertPolo mark, the footer heading
 * runs under it on mobile. Figma only ever draws the header over a clean hero and
 * has no scrolled state, so this is the user's call (2026-11-02): fade the page
 * background in behind the header once past the first 40px.
 *
 * Runs on every page: it is registered as a SITE-level script, not per page, so a
 * page a non-developer builds later gets the same behaviour with no extra step.
 *
 * The colour is the Webflow token `--_colors---background--primary`, so changing
 * the page background in the Designer changes this too. The two rules are injected
 * from here rather than being Webflow styles because the Data API cannot create a
 * combo class (`.header_component.is-scrolled`), and a bare global `.is-scrolled`
 * would be a Client-First violation waiting to hit some other element. The
 * transition itself IS a Webflow style on `.header_component`, so it stays
 * visible and editable in the Designer.
 *
 * Markup (Webflow): the Header component root, `[data-cp="header"]` when it has
 * the attribute, otherwise `.header_component`.
 */
(function () {
  'use strict';

  var SHOW_AT = 40; // px of scroll before the background appears

  var CSS =
    '.header_component.is-scrolled{' +
    'background-color:var(--_colors---background--primary)}' +
    '@media (prefers-reduced-motion:reduce){.header_component{transition:none}}';

  function init() {
    try {
      var header = document.querySelector('[data-cp="header"], .header_component');
      if (!header) return;

      var style = document.createElement('style');
      style.textContent = CSS;
      document.head.appendChild(style);

      var on = null; // last state written, so we only touch the class on a change
      var queued = false;

      function apply() {
        queued = false;
        var next = (window.pageYOffset || document.documentElement.scrollTop) > SHOW_AT;
        if (next === on) return;
        on = next;
        header.classList.toggle('is-scrolled', next);
      }

      function onScroll() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(apply);
      }

      apply(); // a reload part-way down a page starts in the right state
      window.addEventListener('scroll', onScroll, { passive: true });
    } catch (e) {
      console.debug('header-scroll:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

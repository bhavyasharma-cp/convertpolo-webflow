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
      tuckForFooter(header);
    } catch (e) {
      console.debug('header-scroll:', e);
    }
  }

  /*
   * Footer: the header steps aside while it would cover the footer heading.
   *
   * The footer (heading + audit form + contact line + social links) is ~811px tall on desktop,
   * so on a window under ~950px it cannot fit below the fixed, cream header, and the last scroll
   * to the social links pulled "READY FOR AN EPIC GROWTH UPGRADE?" up under the header, cut
   * through its letters (reported on the CRO page; on a laptop ~800px tall the CRO sequence even
   * ends with it there). In the footer the header has nothing to add — its "Get Website Audit"
   * button points at the form already on screen — so while the heading is at or above the
   * header's bottom edge the header slides up out of view, and slides back as soon as the
   * heading is below it again. It uses `translate`, not `transform`, so it never fights a
   * transform set on the header elsewhere.
   *
   * Only while the footer is actually showing (the CRO / LPO / BBS sequences park it, invisible,
   * over the step animation), never while the full-screen menu holds the page, and never while
   * focus is inside the header.
   */
  var TUCK_GAP = 12;   // px kept between the header's bottom edge and the heading

  function tuckForFooter(header) {
    var footer = document.querySelector('.footer_component');
    var heading = footer && (footer.querySelector('#audit h1, #audit h2, #audit h3') || footer.querySelector('h1, h2, h3'));
    if (!heading || !('IntersectionObserver' in window)) return;

    var style = document.createElement('style');
    style.textContent = '.header_component.is-tucked{translate:0 calc(-100% - 24px)}';
    document.head.appendChild(style);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      var t = window.getComputedStyle(header).transition;
      header.style.transition = (t && t !== 'all 0s ease 0s' ? t + ', ' : '') + 'translate 0.35s ease';
    }

    var tucked = false, looping = false, near = false, focused = false;

    function pageLocked() {
      var b = window.getComputedStyle(document.body), h = window.getComputedStyle(document.documentElement);
      return b.overflow === 'hidden' || h.overflow === 'hidden';
    }

    function check() {
      var want = false;
      if (near && !focused && !pageLocked()) {
        var fs = window.getComputedStyle(footer);
        var shown = fs.visibility !== 'hidden' && parseFloat(fs.opacity) > 0.5;
        var r = heading.getBoundingClientRect(), f = footer.getBoundingClientRect();
        // header.offsetHeight: the bar's height, unaffected by the slide itself.
        var edge = header.offsetHeight + TUCK_GAP;
        want = shown && r.top < edge && f.bottom > edge;
      }
      if (want !== tucked) { tucked = want; header.classList.toggle('is-tucked', want); }
    }

    // Checked every frame only while the footer is near the screen: the sequences fade it in
    // without any scrolling, so a scroll listener alone would miss that.
    function loop() {
      if (!near) { looping = false; check(); return; }
      check();
      window.requestAnimationFrame(loop);
    }

    new IntersectionObserver(function (entries) {
      near = entries[entries.length - 1].isIntersecting;
      if (near && !looping) { looping = true; window.requestAnimationFrame(loop); }
      if (!near) check();
    }, { rootMargin: '200px 0px' }).observe(footer);

    header.addEventListener('focusin', function () { focused = true; check(); });
    header.addEventListener('focusout', function () { focused = false; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

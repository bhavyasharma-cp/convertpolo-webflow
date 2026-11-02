/*
 * Case study cards — the row travels sideways while the section is pinned.
 * On the CRO, Brand Building Studio and Landing Page Optimization pages.
 *
 * Reference: the projects carousel on mango-media.eu, which the client asked us to match.
 * There the section pins under the nav and `.ProjectTrack` translates horizontally 1:1
 * with the wheel (x -257 at scrollY 4000, -1257 at 5000) under `scrub: 1`. The scrub is
 * what makes it feel weighted rather than glued to the scrollbar. Same thing here.
 *
 * The markup already wanted this: five `.cro-case` cards sit in a flex row that is wider
 * than the container (2180px against 1440), bleeding 400px off each side, and there is a
 * ready-made `[data-cp="case-dots"]` strip with one dot per card and an `.is-active`
 * class that nothing was setting. So this only has to move the row and light the dots.
 *
 * Markup (Webflow):
 *   section
 *     .cro-cases_list            the row; found as the cards' own parent
 *       [data-cp="case"] * 5     the cards
 *     [data-cp="case-dots"] > i  one per card, `.is-active` marks the current one
 *
 * Below 768 the row is already a native scroll-snap strip, which is the better phone
 * interaction, so this stays out of the way entirely.
 *
 * The travel is measured, not assumed: the row starts with the first card against the
 * container's left padding and ends with the last card against its right padding, so it
 * stays right whatever the breakpoint does to card widths. If the row already fits, the
 * section is left completely alone rather than pinned for no reason.
 */
(function () {
  'use strict';

  var DESKTOP = '(min-width: 768px)';
  var SCRUB = 1;            // mango-media uses 1
  var FALLBACK_PAD = 30;    // if padding-global cannot be read

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  function pad(section) {
    var box = section.querySelector('.padding-global') || section;
    var value = parseFloat(getComputedStyle(box).paddingLeft);
    return isNaN(value) || !value ? FALLBACK_PAD : value;
  }

  function build(section, row, cards, dots) {
    // Measure at rest, in viewport coordinates.
    gsap.set(row, { x: 0 });
    var first = cards[0].getBoundingClientRect();
    var last = cards[cards.length - 1].getBoundingClientRect();
    var gutter = pad(section);

    var from = gutter - first.left;                            // first card to the left edge
    var to = (window.innerWidth - gutter) - last.right;        // last card to the right edge
    var travel = from - to;
    if (travel <= 1) return null;                              // the row already fits

    gsap.set(row, { x: from });

    var tl = gsap.to(row, {
      x: to,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'center center',
        end: '+=' + Math.round(travel),
        pin: true,
        pinSpacing: true,
        scrub: SCRUB,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (!dots.length) return;
          var i = Math.round(self.progress * (dots.length - 1));
          for (var d = 0; d < dots.length; d++) {
            dots[d].classList.toggle('is-active', d === i);
          }
        }
      }
    });
    return tl;
  }

  function init(section) {
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-cp="case"]'));
    if (cards.length < 2) return;
    var row = cards[0].parentNode;
    var strip = section.querySelector('[data-cp="case-dots"]');
    var dots = strip ? Array.prototype.slice.call(strip.querySelectorAll('i')) : [];

    var mq = window.matchMedia(DESKTOP);
    var tween = null;

    function apply() {
      if (tween) {
        if (tween.scrollTrigger) tween.scrollTrigger.kill(true);
        tween.kill();
        tween = null;
      }
      gsap.set(row, { clearProps: 'transform' });
      if (!mq.matches || reduced()) return;     // phones keep their native snap strip
      tween = build(section, row, cards, dots);
    }

    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);

    var resize = null;
    window.addEventListener('resize', function () {
      clearTimeout(resize);
      resize = setTimeout(apply, 250);
    });
  }

  function boot() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    // Find the section through the cards' own marker rather than a layout class.
    var cards = document.querySelectorAll('[data-cp="case"]');
    var done = [];
    for (var i = 0; i < cards.length; i++) {
      var section = cards[i].closest('section');
      if (!section || done.indexOf(section) > -1) continue;
      done.push(section);
      try {
        init(section);
      } catch (err) {
        console.debug('[cases] init failed', err);
      }
    }
  }

  function ready() {
    var waited = 0;
    var poll = setInterval(function () {
      waited += 50;
      if ((window.gsap && window.ScrollTrigger) || waited >= 4000) {
        clearInterval(poll);
        try {
          boot();
        } catch (err) {
          console.debug('[cases] boot failed', err);
        }
      }
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

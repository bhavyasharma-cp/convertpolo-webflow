/*
 * Case study cards — the row travels sideways while the section is pinned.
 * On the CRO, Brand Building Studio and Landing Page Optimization pages.
 *
 * Reference: the projects carousel on mango-media.eu, which the client asked us to match.
 * There the section pins under the nav and `.ProjectTrack` translates horizontally 1:1
 * with the wheel (x -257 at scrollY 4000, -1257 at 5000) under `scrub: 1`. The scrub is
 * what makes it feel weighted rather than glued to the scrollbar. Same thing here.
 *
 * The markup already wanted this: the `.cro-case` cards sit in a flex row that is wider
 * than the container, bleeding off each side, and there is a ready-made
 * `[data-cp="case-dots"]` strip with an `.is-active` class that nothing was setting. So
 * this only has to move the row and light the dots.
 *
 * The row is a Collection List: the CRO and LPO pages draw from Case Studies filtered by
 * the Service field, the Brand page from Brand Case Studies. So the number of cards is
 * whatever the CMS holds, which is why the dot strip is trimmed or extended to match and
 * why a service with nothing tagged to it yet hides its section rather than showing an
 * empty strip under a heading.
 *
 * Markup (Webflow):
 *   section[data-cp="cases"]
 *     .cro-cases_list            the row; the Collection List itself
 *       .w-dyn-item              display:contents, so the card is still the flex child
 *         [data-cp="case"]       the card
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

  // The dots strip is written by hand with a fixed number of dots; the row is a CMS list
  // whose length changes as case studies are added. Match one to the other.
  function tune(strip, count) {
    if (!strip) return [];
    var dots = strip.children;
    while (dots.length > count) strip.removeChild(strip.lastChild);
    while (dots.length && dots.length < count) {
      strip.appendChild(dots[0].cloneNode(false));
    }
    return Array.prototype.slice.call(strip.children);
  }

  function init(section) {
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-cp="case"]'));
    var dots = tune(section.querySelector('[data-cp="case-dots"]'), cards.length);
    if (cards.length < 2) return;      // a single card needs no travel, but still one dot

    // A Collection List wraps every card in a .w-dyn-item. The section's embed gives that
    // wrapper `display: contents` so the card itself stays the flex child the layout
    // sizes — which also leaves the wrapper with no box of its own, so the cards are what
    // we measure and the row is the list one step above the wrapper.
    var row = cards[0].parentNode;
    if (row.classList.contains('w-dyn-item')) row = row.parentNode;

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
    var sections = document.querySelectorAll('[data-cp="cases"]');
    for (var i = 0; i < sections.length; i++) {
      try {
        // The row is a Collection List now, so a service with no case studies tagged to
        // it yet would leave a heading over an empty strip. Hide the section instead.
        if (!sections[i].querySelector('[data-cp="case"]')) {
          sections[i].style.display = 'none';
          continue;
        }
        init(sections[i]);
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

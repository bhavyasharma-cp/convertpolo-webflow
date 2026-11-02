/*
 * CRO metric cards — the four cards slide in from the sides.
 *
 * Figma prototype (file ilR0e7FUzxMXN2TgwhvSgm, frame 1:9238 -> 1:9269): a SMART_ANIMATE
 * step, 0.6s, EASE_OUT. The cards sit off-canvas in the start frame and travel purely
 * horizontally into place — the left column from the left, the right column from the
 * right. No fade: every card is opacity 1 in both frames.
 *
 *   Component 10  "200%"   x -670 -> 170   (608 wide, so it starts 62px past the left edge)
 *   Component 12  "1300+"  x 1458 -> 808   (18px past the right edge of a 1440 frame)
 *   Component 11  "150+"   x -540 -> 170   (33px past the left edge)
 *   Component 13  "10+"    x 1507 -> 707   (67px past the right edge)
 *
 * The badges (the orange pill and the chart chip) are children of their cards in the
 * markup, so they ride along exactly as Components 7 and 9 do in the prototype.
 *
 * The travel is measured from each card's resting box rather than hard-coded, so the
 * cards are always just off their own edge whatever the breakpoint does to their widths;
 * the OFF values above are the only numbers taken from the frame. At 1440 this reproduces
 * the prototype's positions exactly (-840, +650, -710, +800).
 *
 * Markup (Webflow):
 *   section[data-cp="metrics"]
 *     .cro-metrics_list
 *       .cro-metrics_row
 *         .cro-metric * 2        left-hand card, then right-hand card
 *
 * The section is clipped while the cards are parked off-canvas so they cannot give the
 * page a horizontal scrollbar; the clip is released once they have landed.
 *
 * Nothing is hidden in CSS, only by this script, so a page whose JS fails to load still
 * renders the cards in place — they simply do not animate.
 */
(function () {
  'use strict';

  var DURATION = 0.6;           // Figma: 0.6s
  var START = 'top 85%';        // fires as the section comes up the viewport

  // How far past its own edge each card starts, in DOM order, read from the frame.
  var OFF = [62, 18, 33, 67];
  var FALLBACK_OFF = 40;

  // Figma EASE_OUT is cubic-bezier(0, 0, 0.58, 1). GSAP's named eases are all a shade
  // off it, so solve the curve directly rather than picking the nearest one.
  function bezier(x1, y1, x2, y2) {
    function curve(a, b, t) {
      return (((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t + 3 * a) * t;
    }
    return function (t) {
      var lo = 0, hi = 1, mid = t, i;
      for (i = 0; i < 20; i++) {
        mid = (lo + hi) / 2;
        if (curve(x1, x2, mid) < t) lo = mid; else hi = mid;
      }
      return curve(y1, y2, mid);
    };
  }
  var EASE = bezier(0, 0, 0.58, 1);

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  // Left-hand cards come from the left, right-hand cards from the right. Which is which
  // is decided by where the card sits against the middle of its own row, so an editor
  // can add a row without the script needing to know the page.
  function fromLeft(card) {
    var row = card.parentNode;
    var mine = card.getBoundingClientRect();
    var theirs = row.getBoundingClientRect();
    return (mine.left + mine.right) / 2 < (theirs.left + theirs.right) / 2;
  }

  function init(section) {
    var cards = Array.prototype.slice.call(section.querySelectorAll('.cro-metric'));
    if (!cards.length) return;

    var starts = [];
    var i;
    for (i = 0; i < cards.length; i++) {
      var box = cards[i].getBoundingClientRect();
      if (!box.width) return;                      // hidden at this breakpoint
      var off = i < OFF.length ? OFF[i] : FALLBACK_OFF;
      starts.push(fromLeft(cards[i])
        ? -(box.right + off)                       // clear of the left edge
        : (window.innerWidth - box.left) + off);   // clear of the right edge
    }

    if (reduced()) return;                         // leave them where they are

    var clipped = section.style.overflow;
    section.style.overflow = 'hidden';
    gsap.set(cards, { x: function (n) { return starts[n]; } });

    gsap.to(cards, {
      x: 0,
      duration: DURATION,
      ease: EASE,
      scrollTrigger: { trigger: section, start: START, once: true },
      onComplete: function () {
        section.style.overflow = clipped;
        gsap.set(cards, { clearProps: 'transform' });
      }
    });
  }

  function boot() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    var sections = document.querySelectorAll('[data-cp="metrics"]');
    for (var i = 0; i < sections.length; i++) {
      try {
        init(sections[i]);
      } catch (err) {
        console.debug('[metrics] init failed', err);
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
          console.debug('[metrics] boot failed', err);
        }
      }
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

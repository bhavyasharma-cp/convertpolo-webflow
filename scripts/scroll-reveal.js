/*
 * Site-wide scroll reveal — the quiet "premium" layer under every page.
 *
 * Reference: mango-media.eu, which the client asked us to match. It uses no smooth-scroll
 * library at all (no Lenis, no Locomotive — native scrolling throughout); the feel comes
 * entirely from GSAP ScrollTrigger with `scrub`, so each block eases in step with the
 * wheel rather than firing a fixed animation once. That is what this reproduces: content
 * lifts 32px and fades up as it crosses from 90% to 55% of the viewport, scrubbed, so it
 * tracks the scroll both ways.
 *
 * Deliberately NOT copied: their Three.js backdrops and pinned WebGL canvases.
 *
 * What it leaves alone:
 *   - anything inside a section that already owns its scroll choreography (see SKIP) —
 *     a reveal inside a pinned sequence fights the pin and reads as a bug;
 *   - anything already on screen when the page loads. Hiding that and fading it back in
 *     would mean a visible flash on every load, and a first screen that animates for no
 *     reason. Only blocks below the fold are armed;
 *   - nested matches. Only the outermost block in any branch animates, so a card does not
 *     fade in while its own heading fades in on top of it.
 *
 * Opt out of a single element with data-cp-reveal="off".
 *
 * Nothing is hidden in CSS, only by this script, so a page whose JS fails to load renders
 * completely — it just does not animate.
 */
(function () {
  'use strict';

  var RISE = 32;          // px the block travels up
  var START = 'top 90%';
  var END = 'top 55%';
  var SCRUB = 0.6;        // the lag that gives it the weight; mango-media uses 0.5

  // Sections that animate themselves. Everything inside one of these is off limits.
  var SKIP = [
    '[data-cp="intro"]', '[data-cp="experience"]',
    '[data-cp="home-hero"]', '[data-cp="cro-hero"]', '[data-cp="study-hero"]',
    '[data-cp="infinity"]', '[data-cp="circle"]', '[data-cp="wave"]',
    '[data-cp="story-team"]', '[data-cp="cards"]', '[data-cp="jobs-cards"]',
    '[data-cp="bbs-tabs"]', '[data-cp="bbs-slides"]', '[data-cp="compare"]',
    '[data-cp="logos"]', '[data-cp="testimonials"]', '[data-cp="metric-shaped"]',
    '[data-cp="menu"]', '[data-cp="menu-panel"]', '[data-cp="blog-filter"]',
    '[data-cp-reveal="off"]',
    '.section_cro-cases',          // case-carousel.js drives this one
    'header', 'nav', '.w-form'
  ].join(',');

  // Coarse content blocks, not every node — a heading, a paragraph, a picture, a card.
  var PICK = [
    'h1', 'h2', 'h3', 'h4',
    'p', 'blockquote', 'figure', 'img',
    '.button',
    '[class*="_card"]', '[class*="-card"]',
    '[class*="_item"]', '[class*="_tile"]'
  ].join(',');

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  function collect() {
    var all = Array.prototype.slice.call(document.querySelectorAll(PICK));
    var fold = window.innerHeight;
    var keep = [];

    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest(SKIP)) continue;

      var box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;        // hidden or collapsed
      if (box.top < fold) continue;                   // already on screen: leave it be
      if (getComputedStyle(el).position === 'fixed') continue;

      keep.push(el);
    }

    // Outermost only. The list is in document order, so an ancestor is always seen first.
    return keep.filter(function (el) {
      for (var j = 0; j < keep.length; j++) {
        if (keep[j] !== el && keep[j].contains(el)) return false;
      }
      return true;
    });
  }

  function boot() {
    if (reduced()) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var blocks;
    try {
      blocks = collect();
    } catch (err) {
      return console.debug('[reveal] collect failed', err);
    }

    for (var i = 0; i < blocks.length; i++) {
      try {
        gsap.fromTo(blocks[i],
          { y: RISE, opacity: 0 },
          {
            y: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: blocks[i], start: START, end: END, scrub: SCRUB }
          });
      } catch (err) {
        console.debug('[reveal] skipped a block', err);
      }
    }
  }

  // Webflow injects GSAP late, and ScrollTrigger comes from the page's own loader.
  function ready() {
    var waited = 0;
    var poll = setInterval(function () {
      waited += 50;
      if ((window.gsap && window.ScrollTrigger) || waited >= 4000) {
        clearInterval(poll);
        try {
          boot();
        } catch (err) {
          console.debug('[reveal] boot failed', err);
        }
      }
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

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
 * Repeated things move as whole things. A card lifting in one piece reads as deliberate;
 * its image, its heading and its quote each lifting separately reads as a bug. So the
 * items of a list or grid are taken as the units, and only loose content outside them is
 * picked up element by element. Items in the same row start a beat apart.
 *
 * Opt out of a single element with data-cp-reveal="off".
 *
 * Nothing is hidden in CSS, only by this script, so a page whose JS fails to load renders
 * completely — it just does not animate.
 */
(function () {
  'use strict';

  var RISE = 32;          // px the block travels up
  var START = 90;         // % of the viewport where it begins
  var END = 55;           // ... and where it has arrived
  var STAGGER = 3;        // % of the viewport between items of the same row
  var SCRUB = 0.6;        // the lag that gives it the weight; mango-media uses 0.5

  // Sections that animate themselves. Everything inside one of these is off limits.
  var SKIP = [
    '[data-cp="intro"]', '[data-cp="experience"]',
    '[data-cp="home-hero"]', '[data-cp="cro-hero"]', '[data-cp="study-hero"]',
    '[data-cp="infinity"]', '[data-cp="circle"]', '[data-cp="wave"]',
    '[data-cp="story-team"]', '[data-cp="cards"]', '[data-cp="jobs-cards"]',
    '[data-cp="bbs-tabs"]', '[data-cp="bbs-slides"]', '[data-cp="compare"]',
    '[data-cp="logos"]', '[data-cp="testimonials"]',
    '[data-cp="metrics"]', '[data-cp="metric-shaped"]',
    '[data-cp="menu"]', '[data-cp="menu-panel"]', '[data-cp="blog-filter"]',
    '[data-cp-reveal="off"]',
    '.section_cro-cases',          // case-carousel.js drives this one
    '.footer_component',           // site chrome; and the anchor links land on it, so it must hold still
    'header', 'nav', '.w-form',
    '[aria-hidden="true"]'         // decorative scaffolding, e.g. .cro_grid
  ].join(',');

  // Lists and grids of repeated things. Their items are the units, not their innards.
  var GROUPS = [
    '.w-dyn-items',
    '[class*="_list"]', '[class*="_grid"]', '[class*="_cards"]', '[class*="_row"]'
  ].join(',');

  // Loose content outside those: a heading, a paragraph, a picture, a button.
  var PICK = [
    'h1', 'h2', 'h3', 'h4',
    'p', 'blockquote', 'figure', 'img',
    '.button',
    '[class*="_card"]', '[class*="-card"]', '[class*="_tile"]'
  ].join(',');

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  function usable(el, fold) {
    if (el.closest(SKIP)) return false;
    var box = el.getBoundingClientRect();
    if (!box.width || !box.height) return false;      // hidden or collapsed
    if (box.top < fold) return false;                 // already on screen: leave it be
    return getComputedStyle(el).position !== 'fixed';
  }

  // Can this element's top still climb to `mark`% of the viewport before the page runs
  // out of scroll? Anything in the last stretch of the document cannot, and a scrubbed
  // tween that never reaches its end stays parked part-way through it — faded and 32px
  // out of place for good. That is how the footer's social icons ended up sitting below
  // their own labels. Leaving such a block alone is the lesser of the two.
  function reaches(el, mark) {
    var top = el.getBoundingClientRect().top + (window.pageYOffset || 0);
    var most = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return top - window.innerHeight * (mark / 100) <= most + 1;
  }

  function collect() {
    var fold = window.innerHeight;
    var units = [];
    var i, j;

    // The items of every list and grid, each carrying its place in the row for the beat.
    var groups = document.querySelectorAll(GROUPS);
    for (i = 0; i < groups.length; i++) {
      if (groups[i].closest(SKIP)) continue;
      var items = groups[i].children;
      for (j = 0; j < items.length; j++) {
        if (usable(items[j], fold)) units.push({ el: items[j], nth: j });
      }
    }

    // Loose content that is not part of one of those items.
    var loose = document.querySelectorAll(PICK);
    for (i = 0; i < loose.length; i++) {
      var el = loose[i];
      if (!usable(el, fold)) continue;
      var inside = false;
      for (j = 0; j < units.length; j++) {
        if (units[j].el === el || units[j].el.contains(el)) { inside = true; break; }
      }
      if (!inside) units.push({ el: el, nth: 0 });
    }

    // Outermost only, so nothing animates inside something else that is animating.
    return units.filter(function (u) {
      for (var k = 0; k < units.length; k++) {
        if (units[k].el !== u.el && units[k].el.contains(u.el)) return false;
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
        // Siblings in a row share a top edge, so without this they would all land at
        // once. Each item starts a touch lower down the viewport than the one before,
        // which gives the row its sweep. Capped so a long list does not trail off.
        var beat = Math.min(blocks[i].nth, 4) * STAGGER;
        if (!reaches(blocks[i].el, END - beat)) continue;
        gsap.fromTo(blocks[i].el,
          { y: RISE, opacity: 0 },
          {
            y: 0, opacity: 1, ease: 'none',
            scrollTrigger: {
              trigger: blocks[i].el,
              start: 'top ' + (START - beat) + '%',
              end: 'top ' + (END - beat) + '%',
              scrub: SCRUB
            }
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

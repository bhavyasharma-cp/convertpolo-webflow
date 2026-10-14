/*
 * Case study page sequence — CRO case study (AnotherSole).
 *
 * Figma 1:12886 (desktop layout). Prototype 1:11565 → 1:12073 → 1:12102 → 1:12133 → 1:12163,
 * every step Smart Animate 0.6s ease-out; the first fires on its own after a 0.3s timeout, the
 * rest on click — which on a real page is the scroll down to each block.
 *
 * The prototype's four steps, read off the frame coordinates:
 *   1. Hero (auto, 0.3s after load): the cover image is 1149x746 and shrinks to 850x552
 *      (uniform 1.3516x) while the headline rises 50px.
 *   2. Overview / Challenge / Solution slide in: Overview from 370px left, Challenge from 70px
 *      right, Solution from 690px right.
 *   3. Experiment block: the phones come in from 640px left, the text column from 720px right.
 *   4. Result panel: 1440x649 full bleed shrinking to the 1180x532 container (uniform 1.2203x).
 * Steps 3 and 4 repeat per experiment — 01, 02 and 03 all behave the same.
 *
 * Markup (Webflow), found by data attribute so the blocks can be reused anywhere:
 *   [data-cp="study-hero"]              hero section
 *     [data-study="hero-media"]         cover image wrapper (scaled)
 *     [data-study="hero-heading"]       headline (rises)
 *   [data-study="overview"|"challenge"|"solution"]   the three intro cards
 *   [data-study="images"]               a phone pair   (slides from the left)
 *   [data-study="content"]              its text column (slides from the right)
 *   [data-study="result"]               the result panel (scales down)
 *
 * Only transform and opacity are animated. Without GSAP, or with reduced motion, every element
 * is left in its final Figma position, so the page always reads correctly.
 */
(function () {
  'use strict';

  var DURATION = 0.6;        // Smart Animate 0.6s
  var HERO_DELAY = 0.3;      // the prototype's AFTER_TIMEOUT before the hero settles
  var HERO_SCALE = 1.3516;   // 1149/850 and 746/552
  var HERO_RISE = 50;        // headline 216 -> 166
  var RESULT_SCALE = 1.2203; // 1440/1180 and 649/532
  var SHIFT = {
    overview: -370,          // card x -240 -> 130
    challenge: 70,           //         200 -> 130
    solution: 690,           //        1339 -> 649
    images: -640,            // phones  -501 -> 139
    content: 720             // text    1456 -> 736
  };

  function log(msg, e) { try { console.debug('[case-study] ' + msg, e || ''); } catch (_) {} }

  // Figma's "Ease out": cubic-bezier(0, 0, 0.58, 1).
  function easeOut(t) {
    var u = t;
    for (var i = 0; i < 8; i++) {
      var x = 3 * (1 - u) * u * u * 0.58 + u * u * u - t;
      var dx = 3 * (2 * u - 3 * u * u) * 0.58 + 3 * u * u;
      if (Math.abs(x) < 1e-6 || dx === 0) break;
      u = Math.min(1, Math.max(0, u - x / dx));
    }
    return 3 * (1 - u) * u * u + u * u * u;
  }

  function all(sel, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    catch (e) { log('query failed: ' + sel, e); return []; }
  }

  function start(gsap) {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return log('reduced motion: final state kept');

    var base = { duration: DURATION, ease: easeOut };
    // Each block plays once, when it has clearly entered the viewport.
    function onEnter(el, vars) {
      var trigger = { trigger: el, start: 'top 85%', once: true };
      gsap.from(el, Object.assign({}, base, vars, { scrollTrigger: trigger }));
    }

    // 1. Hero: the cover settles from near full-bleed, the headline rises with it.
    all('[data-cp="study-hero"]').forEach(function (hero) {
      var media = hero.querySelector('[data-study="hero-media"]');
      var heading = hero.querySelector('[data-study="hero-heading"]');
      if (media) gsap.from(media, Object.assign({}, base, { delay: HERO_DELAY, scale: HERO_SCALE }));
      if (heading) gsap.from(heading, Object.assign({}, base, { delay: HERO_DELAY, y: HERO_RISE }));
    });

    // 2. Intro cards.
    ['overview', 'challenge', 'solution'].forEach(function (name) {
      all('[data-study="' + name + '"]').forEach(function (el) {
        onEnter(el, { x: SHIFT[name], opacity: 0 });
      });
    });

    // 3. Every experiment: phones from the left, text from the right.
    ['images', 'content'].forEach(function (name) {
      all('[data-study="' + name + '"]').forEach(function (el) {
        onEnter(el, { x: SHIFT[name], opacity: 0 });
      });
    });

    // 4. Every result panel shrinks into its container.
    all('[data-study="result"]').forEach(function (el) {
      onEnter(el, { scale: RESULT_SCALE });
    });

    log('ready');
  }

  function boot() {
    var tries = 0;
    (function wait() {
      // Webflow injects GSAP late, and the loader adds ScrollTrigger after it.
      if (window.gsap && window.ScrollTrigger) {
        try {
          window.gsap.registerPlugin(window.ScrollTrigger);
          start(window.gsap);
        } catch (e) { log('init failed', e); }
        return;
      }
      if (++tries > 100) return log('gsap/ScrollTrigger never arrived');
      setTimeout(wait, 50);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

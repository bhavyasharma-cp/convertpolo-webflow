/*
 * Smooth scrolling — the layer the reference site's "premium" feel actually comes from.
 *
 * Measured on mango-media.eu rather than guessed: one wheel tick there moves the page
 * 10, 20, 29, 38, 47, 55, 63px over successive frames and keeps easing for ~1.5s. A
 * native page jumps the whole 400px in a single frame and is done in 56ms. That long
 * lerped tail is the difference, and no amount of reveal animation substitutes for it.
 * (Their library is bundled, so it never appears as a global — checking for one is how
 * this got missed the first time round.)
 *
 * Lenis drives it here, vendored next to this file so everything still comes from one
 * origin. It scrolls the window for real rather than transforming a wrapper, so
 * ScrollTrigger pins, anchor offsets and the browser's own scrollbar all keep working —
 * it only needs its rAF driven by GSAP's ticker and `ScrollTrigger.update` on each tick.
 *
 * Three things it deliberately yields to:
 *   - a locked page. Anything that sets `overflow: hidden` on <html> or <body> — the
 *     intro overlay, the full-screen menu, any modal — means scrolling is meant to stop,
 *     so Lenis stops too. Watched generically rather than by class name, because the
 *     menu is a Webflow interaction with no marker of its own.
 *   - touch. Lenis leaves phones on native scrolling by default and that is the right
 *     call: smoothing touch fights the platform's own momentum and breaks pull-to-refresh.
 *   - prefers-reduced-motion, where it never starts at all.
 *
 * Exposed as window.cpLenis so anything that scrolls the page programmatically can go
 * through it instead of fighting it — see the hand-off in home-experience.js.
 */
(function () {
  'use strict';

  // Matched to the reference rather than taken from Lenis's defaults. Its wheel response
  // is a slow exponential lerp, not a fixed-duration ramp: one tick moves ~10px on the
  // first frame and barely decays (10, 9, 10, 8, 9, 9, 8…), settling after ~1.5s — a
  // per-frame factor near 0.032. Lenis's own default felt right in kind but four times
  // too eager: 42px on the first frame against their 10.
  //
  // Then taken a step quicker than the reference at the client's request: same glide,
  // less of a tail. 0.05 settles in ~1.0s rather than ~1.5s, and one notch of the wheel
  // covers a little more ground.
  //
  // These two numbers are the whole feel. LERP is the weight (lower = heavier, longer
  // glide); WHEEL is how far one notch of the wheel asks to travel.
  var LERP = 0.05;         // the reference measures 0.035
  var WHEEL = 0.9;         // the reference covers ~317px for a 400px wheel delta

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  function locked() {
    try {
      return getComputedStyle(document.body).overflow === 'hidden' ||
        getComputedStyle(document.documentElement).overflow === 'hidden';
    } catch (err) {
      return false;
    }
  }

  function start() {
    if (reduced() || !window.Lenis || !window.gsap) return;
    if (window.cpLenis) return;

    var lenis = new Lenis({
      lerp: LERP,
      wheelMultiplier: WHEEL,
      smoothWheel: true,
      // Phones keep their native momentum; see the note above.
      syncTouch: false
    });
    window.cpLenis = lenis;

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      // A pinned section changes the page height, so Lenis has to re-measure.
      ScrollTrigger.addEventListener('refresh', function () { lenis.resize(); });
    }

    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Hand the page back whenever something locks it, and take it again afterwards.
    var stopped = false;
    function sync() {
      var now = locked();
      if (now === stopped) return;
      stopped = now;
      if (now) lenis.stop(); else lenis.start();
    }
    sync();
    try {
      var watch = new MutationObserver(sync);
      watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
      watch.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    } catch (err) {
      console.debug('[smooth] observer', err);
    }
    // The intro's own failsafe drops its class on a timer rather than an attribute we
    // can see change in time, so check again on a slow interval as a backstop.
    setInterval(sync, 500);

    // In-page anchors have to go through Lenis or they fight it.
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id === '#' || a.getAttribute('data-cp')) return;   // '#' buttons are triggers
      var to = document.querySelector(id);
      if (!to) return;
      e.preventDefault();
      lenis.scrollTo(to);
    });
  }

  function ready() {
    var waited = 0;
    var poll = setInterval(function () {
      waited += 50;
      if ((window.Lenis && window.gsap) || waited >= 5000) {
        clearInterval(poll);
        try {
          start();
        } catch (err) {
          console.debug('[smooth] start failed', err);
        }
      }
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

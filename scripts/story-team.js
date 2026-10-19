/*
 * About Us — the team carousel that fans across the bottom of the page.
 * Figma: desktop 117:6065 -> 1:12514 -> 1:12553 -> 1:12598 -> 1:12642 -> 1:12686,
 *        mobile  123:7386 -> 1:2067 -> 1:2097 -> 1:2130.
 *
 * Every frame is the same picture one step on: the portraits travel up a diagonal
 * through fixed slots, growing towards the middle and shrinking again, and a new
 * face enters from the bottom left. Each hop is Smart Animate EASE_OUT, 1s on
 * desktop and 0.8s on mobile, held 0.8s in between.
 *
 * The geometry is not here — it lives in the page embed as .is-slot-0 ... .is-slot-6,
 * which set --cp-x / --cp-y / --cp-s per breakpoint and decide which slots show a
 * caption. This file only rotates those classes, so the page renders the opening
 * Figma frame exactly even if the script never loads.
 *
 * Markup (Webflow):
 *   [data-cp="story-team"]   wraps .story_stage > .story_member * N
 *
 * There are more members (10) than slots (7). A member past the last slot is
 * parked on slot 0 — both ends sit off canvas, so the wrap is invisible as long as
 * the hop that crosses it carries no transition (.is-jump).
 */
(function () {
  'use strict';

  var SLOTS = 7;                 // .is-slot-0 ... .is-slot-6
  var BASE = { w: 1440, h: 1820 };
  var BASE_M = { w: 390, h: 1107 };
  var FIRST = 1200, STEP = 1800;      // Figma: 1.2s, then 0.8s hold + 1s move
  var FIRST_M = 1500, STEP_M = 1600;  // mobile: 1.5s, then 0.8s hold + 0.8s move

  function isMobile() {
    return window.innerWidth < 768;
  }

  function init(root) {
    var stage = root.querySelector('.story_stage');
    if (!stage) return;
    var members = Array.prototype.slice.call(stage.querySelectorAll('.story_member'));
    if (members.length < 2) return;

    var section = root.parentNode;
    var total = members.length;
    var tick = 0;
    var timer = null;

    // The fan is drawn at the Figma width; below that it scales down as a whole,
    // the way the tablet sizes fall between the two Figma frames.
    function fit() {
      var base = isMobile() ? BASE_M : BASE;
      var scale = Math.min(1, window.innerWidth / base.w);
      stage.style.setProperty('--cp-scale', scale);
      if (section && section.style) {
        section.style.minHeight = Math.round(base.h * scale) + 'px';
      }
    }

    function place(member, slot, jump) {
      var cls = 'is-slot-' + (slot < SLOTS ? slot : 0);
      if (jump) member.classList.add('is-jump');
      for (var i = 0; i < SLOTS; i++) member.classList.remove('is-slot-' + i);
      member.classList.add(cls);
      if (jump) {
        void member.offsetWidth; // commit the move before transitions come back
        member.classList.remove('is-jump');
      }
    }

    function advance() {
      var previous = tick;
      tick = (tick + 1) % total;
      for (var i = 0; i < total; i++) {
        var was = (i + previous) % total;
        place(members[i], (i + tick) % total, was === SLOTS - 1);
      }
      schedule(isMobile() ? STEP_M : STEP);
    }

    function schedule(delay) {
      window.clearTimeout(timer);
      timer = window.setTimeout(advance, delay);
    }

    function start() {
      if (timer !== null) return;
      schedule(isMobile() ? FIRST_M : FIRST);
    }

    fit();
    window.addEventListener('resize', fit);

    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (still && still.matches) return; // the opening frame is the final still state

    if (typeof IntersectionObserver === 'function') {
      var watcher = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            start();
            watcher.disconnect();
          }
        }
      }, { rootMargin: '0px 0px -10% 0px' });
      watcher.observe(stage);
    } else {
      start();
    }
  }

  function boot() {
    try {
      var roots = document.querySelectorAll('[data-cp="story-team"]');
      for (var i = 0; i < roots.length; i++) init(roots[i]);
    } catch (err) {
      console.debug('story-team: ' + err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

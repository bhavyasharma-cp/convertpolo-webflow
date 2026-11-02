/*
 * Home — the EXPERIENCE screen, the first viewport the intro loader hands off to.
 * Figma: the four panels of 1:11076, which on the DEV READY board (117:3974) sit at
 * negative y above the hero. Their inner motion is three variant sets:
 *   Component 16 (1:7604)  the word rows        — 4 variants, Smart Animate LINEAR 1.2s
 *   Frame 55     (1:7643)  the word rotator     — 5 variants, 0.8s hold + 0.3s LINEAR, loops
 *   Component 14 (1:7669)  the testimonial cards— 4 variants, GENTLE 2.56s / 1.53s, then 0.3s
 *
 * The entrance (1:11013 -> 1:11076, Smart Animate EASE_OUT 1.2s) slides all four panels
 * in from off canvas: Component 16 from x 1447, Frame 55 from -730, Component 18 from
 * -868, Frame 61 from 1445. It runs on the intro loader's `cp:intro-done` cue, or
 * straight away when the intro is not playing (a repeat visit in the same session).
 *
 * Every Figma coordinate below is in that panel's own units — 833 wide for the two wide
 * panels, 1440 for the board — and is converted at run time against the measured width,
 * so the whole thing survives the board scaling with the viewport. A resize rebuilds the
 * timelines from scratch rather than trying to retarget them mid-flight.
 *
 * Markup (Webflow): see the section's embed for the geometry.
 *   [data-cp="experience"]        .section_home-experience
 *     .home-experience_board
 *       [data-cp="exp-words"]     Component 16
 *       [data-cp="exp-statement"] Frame 55
 *       .experience_panel.is-tall Frame 61 (static)
 *       [data-cp="exp-cards"]     Component 18
 */
(function () {
  'use strict';

  var BOARD = 1440;          // the Figma board the panels are placed on
  var PANEL = 833;           // the two wide panels' own width
  var LINEAR = 'none';
  var GENTLE = 'power2.inOut';   // Figma's "Gentle" spring, near enough
  var OUT = 'power2.out';

  // Entrance: where each panel starts, in board units, against where it rests.
  var ENTRY = [
    ['[data-cp="exp-words"]', 1447, 535],
    ['[data-cp="exp-statement"]', -730, 72],
    ['.experience_panel.is-tall', 1445, 975],
    ['[data-cp="exp-cards"]', -868, 72]
  ];

  // Component 16, per row: [word width, bar x/width per variant, word x per variant].
  // Bars are one full-width div scaled from its left edge, so a Figma width becomes
  // a scaleX and a Figma x becomes a translate.
  var ROWS = [
    { bar: [[-230, 156], [0, 526], [0, 833], [0, 833]], word: [-352, -172, 248, -352], fade: [1, 1, 1, 1] },
    { bar: [[-230, 100], [0, 409], [0, 833], [0, 833]], word: [-352, -172, 297, 297], fade: [1, 1, 1, 0] },
    { bar: [[-230, 230], [0, 702], [0, 833], [0, 833]], word: [-352, -122, 244, 834], fade: [1, 1, 1, 1] }
  ];
  var RULES = [1013, 0];     // the two hairlines slide in from the right on the last hop

  // Component 18, per card: Figma [x, y, width] at each of the four variants.
  // Cards are rendered at their variant-3 width (345) and scaled for the rest.
  var CARD_W = 345;
  var CARDS = [
    { sel: '.is-1', at: [[222, -93, 390], [222, 152, 390], [36, 188, 345], [-254, 308, 345]] },
    { sel: '.is-2', at: [[252, -189, 330], [252, 122, 330], [452, 32, 345], [792, -78, 345]] },
    { sel: '.is-3', at: [[283, -184, 270], [283, 92, 270], [45, 54, 345], [-165, -76, 345]] },
    { sel: '.is-4', at: [[315, -262, 210], [315, 67, 210], [443, 169, 345], [775, 306, 345]] }
  ];
  // The rings, as a scale of the widest one (140) and its opacity, at variants 3 and 4.
  var RINGS = [
    { sel: '.is-1', v3: [40 / 140, 1], v4: [13 / 140, 1] },
    { sel: '.is-2', v3: [90 / 140, 0.4], v4: [29 / 140, 0.4] },
    { sel: '.is-3', v3: [140 / 140, 0.15], v4: [45 / 140, 0.15] },
    { sel: '.is-4', v3: [0.001, 0], v4: [61 / 140, 0.15] }
  ];

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  function build(root) {
    var board = root.querySelector('.home-experience_board');
    if (!board) return null;
    var u = board.clientWidth / BOARD;            // board units -> px
    if (!u) return null;

    var words = root.querySelector('[data-cp="exp-words"]');
    var cards = root.querySelector('[data-cp="exp-cards"]');
    var statement = root.querySelector('[data-cp="exp-statement"]');
    var p = (words ? words.clientWidth : 0) / PANEL;   // panel units -> px

    var master = gsap.timeline();

    // ---- entrance (1:11013 -> 1:11076) -------------------------------------
    for (var i = 0; i < ENTRY.length; i++) {
      var el = root.querySelector(ENTRY[i][0]);
      if (!el) continue;
      var from = (ENTRY[i][1] - ENTRY[i][2]) * u;       // offset from its resting place
      gsap.set(el, { x: from });
      master.to(el, { x: 0, duration: 1.2, ease: OUT }, 0);
    }

    // ---- Component 16: the word rows ---------------------------------------
    if (words && p) {
      var bg = words.querySelector('.experience_words-bg');
      var rows = words.querySelectorAll('.experience_words-row');
      var rules = words.querySelectorAll('.experience_words-rule');
      var t = master.add(gsap.timeline(), 0.1);        // Figma holds the first frame 0.1s

      for (var r = 0; r < ROWS.length && r < rows.length; r++) {
        var spec = ROWS[r];
        var bar = rows[r].querySelector('.experience_words-bar');
        var word = rows[r].querySelector('.experience_words-word');
        gsap.set(bar, { x: spec.bar[0][0] * p, scaleX: spec.bar[0][1] / PANEL });
        gsap.set(word, { x: spec.word[0] * p, opacity: spec.fade[0] });
        // three hops: 0 -> 1.2, 1.2 -> 2.4, then a 0.3s hold before the last 1.2
        for (var v = 1; v <= 3; v++) {
          var at = v < 3 ? (v - 1) * 1.2 : 2.7;
          t.to(bar, { x: spec.bar[v][0] * p, scaleX: spec.bar[v][1] / PANEL, duration: 1.2, ease: LINEAR }, at);
          t.to(word, { x: spec.word[v] * p, opacity: spec.fade[v], duration: 1.2, ease: LINEAR }, at);
        }
      }
      // the panel turns from cream to white on the second hop
      if (bg) t.to(bg, { opacity: 1, duration: 1.2, ease: LINEAR }, 1.2);
      for (var q = 0; q < rules.length; q++) {
        gsap.set(rules[q], { x: RULES[0] * p });
        t.to(rules[q], { x: RULES[1] * p, duration: 1.2, ease: LINEAR }, 2.7);
      }
    }

    // ---- Component 18: the testimonial cards -------------------------------
    if (cards && p) {
      var c = master.add(gsap.timeline(), 0.3);
      var k;
      for (k = 0; k < CARDS.length; k++) {
        var card = cards.querySelector('.experience_card' + CARDS[k].sel);
        if (!card) continue;
        var a = CARDS[k].at;
        gsap.set(card, { x: a[0][0] * p, y: a[0][1] * p, scale: a[0][2] / CARD_W });
        c.to(card, { x: a[1][0] * p, y: a[1][1] * p, scale: a[1][2] / CARD_W, duration: 2.555, ease: GENTLE }, 0);
        c.to(card, { x: a[2][0] * p, y: a[2][1] * p, scale: a[2][2] / CARD_W, duration: 1.533, ease: GENTLE }, 2.556);
        c.to(card, { x: a[3][0] * p, y: a[3][1] * p, scale: a[3][2] / CARD_W, duration: 0.3, ease: OUT }, 4.189);
      }
      for (k = 0; k < RINGS.length; k++) {
        var ring = cards.querySelector('.experience_pulse' + RINGS[k].sel);
        if (!ring) continue;
        gsap.set(ring, { xPercent: -50, yPercent: -50, scale: RINGS[k].v3[0], opacity: 0 });
        c.to(ring, { scale: RINGS[k].v3[0], opacity: RINGS[k].v3[1], duration: 1.533, ease: GENTLE }, 2.556);
        c.to(ring, { scale: RINGS[k].v4[0], opacity: RINGS[k].v4[1], duration: 0.3, ease: OUT }, 4.189);
      }
      // the line-art drifts and turns a little across the whole run
      var waveA = cards.querySelector('.experience_wave.is-cards-a');
      var waveB = cards.querySelector('.experience_wave.is-cards-b');
      if (waveA) c.to(waveA, { x: -62 * p, y: -17 * p, rotation: 6, duration: 4.489, ease: GENTLE }, 0);
      if (waveB) c.to(waveB, { x: -54 * p, y: -89 * p, scale: 0.884, duration: 4.489, ease: GENTLE }, 0);
    }

    // ---- Frame 55: the word rotator ----------------------------------------
    // Its own loop, not part of the master timeline, because Figma loops it forever.
    var loop = null;
    if (statement) {
      var track = statement.querySelector('.experience_statement-track');
      var list = statement.querySelectorAll('.experience_statement-word');
      var step = statement.clientHeight;
      if (track && list.length > 1 && step) {
        for (var w = 0; w < list.length; w++) gsap.set(list[w], { y: w * step });
        loop = gsap.timeline({ repeat: -1, delay: 0.8 });
        for (var s = 1; s <= list.length; s++) {
          loop.to(list, { y: '-=' + step, duration: 0.3, ease: LINEAR });
          // the word that has just left the window goes back to the bottom of the stack
          loop.set(list[(s - 1) % list.length], { y: (list.length - 1) * step });
          if (s < list.length) loop.to({}, { duration: 0.8 });
        }
      }
    }

    return { master: master, loop: loop };
  }

  function rest(root) {
    // The still state Figma ends on, for reduced motion and for a failed build.
    var words = root.querySelector('[data-cp="exp-words"]');
    var cards = root.querySelector('[data-cp="exp-cards"]');
    if (!words) return;
    var p = words.clientWidth / PANEL;
    var bg = words.querySelector('.experience_words-bg');
    if (bg) gsap.set(bg, { opacity: 1 });
    var rows = words.querySelectorAll('.experience_words-row');
    for (var r = 0; r < rows.length && r < ROWS.length; r++) {
      gsap.set(rows[r].querySelector('.experience_words-bar'), { x: 0, scaleX: 1 });
      gsap.set(rows[r].querySelector('.experience_words-word'), {
        x: ROWS[r].word[2] * p, opacity: ROWS[r].fade[2]
      });
    }
    gsap.set(words.querySelectorAll('.experience_words-rule'), { x: 0 });
    if (!cards) return;
    for (var k = 0; k < CARDS.length; k++) {
      var card = cards.querySelector('.experience_card' + CARDS[k].sel);
      var a = CARDS[k].at[2];
      if (card) gsap.set(card, { x: a[0] * p, y: a[1] * p, scale: a[2] / CARD_W });
    }
    for (var n = 0; n < RINGS.length; n++) {
      var ring = cards.querySelector('.experience_pulse' + RINGS[n].sel);
      if (ring) gsap.set(ring, { xPercent: -50, yPercent: -50, scale: RINGS[n].v3[0], opacity: RINGS[n].v3[1] });
    }
  }

  function init(root) {
    if (reduced()) return rest(root);

    var running = null;
    function start() {
      if (running) {
        if (running.master) running.master.kill();
        if (running.loop) running.loop.kill();
      }
      running = build(root);
      if (!running) rest(root);
    }

    // Wait for the intro loader's cue when it is playing, otherwise go now.
    if (document.documentElement.classList.contains('cp-intro-running')) {
      var fired = false;
      var go = function () {
        if (fired) return;
        fired = true;
        start();
      };
      window.addEventListener('cp:intro-done', go);
      setTimeout(go, 8000);   // the gate's own failsafe, so a stalled intro cannot hold this
    } else {
      start();
    }

    var resize = null;
    window.addEventListener('resize', function () {
      clearTimeout(resize);
      resize = setTimeout(function () {
        if (running) start();
      }, 250);
    });
  }

  function boot() {
    var roots = document.querySelectorAll('[data-cp="experience"]');
    for (var i = 0; i < roots.length; i++) {
      try {
        init(roots[i]);
      } catch (err) {
        console.debug('[experience] init failed', err);
      }
    }
  }

  function ready() {
    if (window.gsap) return boot();
    var waited = 0;
    var poll = setInterval(function () {
      waited += 50;
      if (window.gsap || waited >= 3000) {
        clearInterval(poll);
        if (window.gsap) boot();
      }
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

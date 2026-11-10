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
 * Figma then holds the screen 4s and glides to the hero in 0.8s (1:11076 -> 1:8790).
 * handOff() does the same, but only while the visitor has done nothing at all — the
 * first wheel, touch, key or scroll of their own cancels it permanently, and a wheel
 * mid-glide stops it dead. Nobody gets scrolled somewhere they were already leaving.
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
  var WORD = 120;            // the statement's Figma type size, in board units (1:7645)
  var PANEL = 833;           // the two wide panels' own width
  var LINEAR = 'none';
  var GENTLE = 'power2.inOut';   // Figma's "Gentle" spring, near enough
  var OUT = 'power2.out';

  var ENTRANCE = 1.2;        // the panels' slide-in, after which Figma starts its hold
  var HOLD = 4;              // 1:11076 holds 4s ...
  var GLIDE = 0.8;           // ... then Smart Animate 0.8s to the hero (1:8790)
  var SETTLED = 4;           // px of scroll that counts as the visitor taking over

  // Entrance: where each panel starts, in board units, against where it rests.
  var ENTRY = [
    ['[data-cp="exp-words"]', 1447, 535],
    ['[data-cp="exp-statement"]', -730, 72],
    ['.experience_panel.is-tall', 1445, 975],
    ['[data-cp="exp-cards"]', -868, 72]
  ];

  // Component 16, per row: bar [x, width] and word x at each variant, in panel units.
  // Bars are one full-width div scaled from its left edge, so a Figma width becomes
  // a scaleX and a Figma x becomes a translate.
  //
  // Figma has a fourth variant that clears the words out again and slides two hairlines
  // in — but that is the screen leaving for the hero (1:11076 -> 1:8790 after a 4s hold),
  // not a resting state. On a page the visitor scrolls themselves, so this stops at
  // variant 3, the full picture. See the note by STOP_AT below.
  var ROWS = [
    { bar: [[-230, 156], [0, 526], [0, 833]], word: [-352, -172, 248], fade: [1, 1, 1] },
    { bar: [[-230, 100], [0, 409], [0, 833]], word: [-352, -172, 297], fade: [1, 1, 1] },
    { bar: [[-230, 230], [0, 702], [0, 833]], word: [-352, -122, 244], fade: [1, 1, 1] }
  ];

  // Component 18, per card: Figma [x, y, width] at each variant, in panel units.
  // Cards are rendered at their variant-3 width (345) and scaled for the rest.
  // Variant 4 flies them off again; see the ROWS note — it is the exit, not a rest.
  var CARD_W = 345;
  var CARDS = [
    { sel: '.is-1', at: [[222, -93, 390], [222, 152, 390], [36, 188, 345]] },
    { sel: '.is-2', at: [[252, -189, 330], [252, 122, 330], [452, 32, 345]] },
    { sel: '.is-3', at: [[283, -184, 270], [283, 92, 270], [45, 54, 345]] },
    { sel: '.is-4', at: [[315, -262, 210], [315, 67, 210], [443, 169, 345]] }
  ];
  // The rings, as a scale of the widest one (140) and its opacity, at variant 3.
  var RINGS = [
    { sel: '.is-1', to: [40 / 140, 1] },
    { sel: '.is-2', to: [90 / 140, 0.4] },
    { sel: '.is-3', to: [140 / 140, 0.15] }
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
    // Figma holds variant 1 for 0.1s, then two 1.2s LINEAR hops. The hold runs while the
    // panel is still sliding in, exactly as the prototype plays it.
    if (words && p) {
      var bg = words.querySelector('.experience_words-bg');
      var rows = words.querySelectorAll('.experience_words-row');

      for (var r = 0; r < ROWS.length && r < rows.length; r++) {
        var spec = ROWS[r];
        var bar = rows[r].querySelector('.experience_words-bar');
        var word = rows[r].querySelector('.experience_words-word');
        gsap.set(bar, { x: spec.bar[0][0] * p, scaleX: spec.bar[0][1] / PANEL });
        gsap.set(word, { x: spec.word[0] * p, opacity: spec.fade[0] });
        for (var v = 1; v < ROWS[r].bar.length; v++) {
          var at = 0.1 + (v - 1) * 1.2;
          master.to(bar, { x: spec.bar[v][0] * p, scaleX: spec.bar[v][1] / PANEL, duration: 1.2, ease: LINEAR }, at);
          master.to(word, { x: spec.word[v] * p, opacity: spec.fade[v], duration: 1.2, ease: LINEAR }, at);
        }
      }
      // the panel turns from cream to white on the second hop
      if (bg) master.to(bg, { opacity: 1, duration: 1.2, ease: LINEAR }, 1.3);
    }

    // ---- Component 18: the testimonial cards -------------------------------
    // Figma: 0.3s hold, 2.555s GENTLE as they fall into a stack, then 1.533s GENTLE as
    // they spread and the rings open behind them.
    if (cards && p) {
      var k;
      for (k = 0; k < CARDS.length; k++) {
        var card = cards.querySelector('.experience_card' + CARDS[k].sel);
        if (!card) continue;
        var a = CARDS[k].at;
        gsap.set(card, { x: a[0][0] * p, y: a[0][1] * p, scale: a[0][2] / CARD_W });
        master.to(card, { x: a[1][0] * p, y: a[1][1] * p, scale: a[1][2] / CARD_W, duration: 2.555, ease: GENTLE }, 0.3);
        master.to(card, { x: a[2][0] * p, y: a[2][1] * p, scale: a[2][2] / CARD_W, duration: 1.533, ease: GENTLE }, 2.856);
      }
      for (k = 0; k < RINGS.length; k++) {
        var ring = cards.querySelector('.experience_pulse' + RINGS[k].sel);
        if (!ring) continue;
        gsap.set(ring, { xPercent: -50, yPercent: -50, scale: RINGS[k].to[0] * 0.4, opacity: 0 });
        master.to(ring, { scale: RINGS[k].to[0], opacity: RINGS[k].to[1], duration: 1.533, ease: GENTLE }, 2.856);
      }
      // the line-art drifts and turns a little across the whole run
      var waveA = cards.querySelector('.experience_wave.is-cards-a');
      var waveB = cards.querySelector('.experience_wave.is-cards-b');
      if (waveA) master.to(waveA, { x: -62 * p, y: -17 * p, rotation: 6, duration: 4.389, ease: GENTLE }, 0.3);
      if (waveB) master.to(waveB, { x: -54 * p, y: -89 * p, scale: 0.884, duration: 4.389, ease: GENTLE }, 0.3);
    }

    // ---- Frame 55: the word rotator ----------------------------------------
    // Its own loop, not part of the master timeline, because Figma loops it forever.
    var loop = null;
    if (statement) {
      var track = statement.querySelector('.experience_statement-track');
      var list = statement.querySelectorAll('.experience_statement-word');
      // Every dimension on this board is a fraction of it, so the board scaling with the
      // viewport scales the whole composition — except the type, which Webflow pins at
      // Figma's 120px. At a 1440 viewport the board is 1266 wide, so the window shrinks to
      // 641 while the word still wants 713, and EXPERIENCE. lost its last letter and a half
      // to the clip. Scale the type with the board like everything else here. Figma 1:7645:
      // 120px Medium, tracking -3.6px, in a 729x128 window (50.625% x 12.5% of the board).
      for (var f = 0; f < list.length; f++) {
        gsap.set(list[f], { fontSize: Math.round(WORD * u * 100) / 100 + 'px' });
      }
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

  // Figma holds 1:11076 for 4s and then glides to the hero in 0.8s. Two things start that
  // glide here: the hold running out while the visitor sits still, and — because these are
  // two whole screens, not a scrolling page — the visitor's own first move downwards. One
  // gesture should land on the hero rather than leaving them stranded between the two, which
  // is what free scrolling did. The glide is locked while it runs so the gesture that began
  // it cannot also scroll past it, and it happens once.
  function handOff() {
    var hero = document.querySelector('[data-cp="home-hero"]');
    if (!hero) return;

    var done = false;          // handed over, or given up on
    var gliding = false;       // our own scrolling must not read as theirs

    function heroTop() { return Math.round(hero.getBoundingClientRect().top + window.scrollY); }

    function glide() {
      if (done || gliding) return;
      // On a window taller than the hero the page cannot scroll it flush to the top, so aim
      // for the furthest the page actually goes rather than a place it can never reach.
      var most = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      var top = Math.min(heroTop(), most);
      if (top - window.scrollY <= SETTLED) { done = true; return; }
      gliding = true;

      function landed() {
        gliding = false;
        done = true;
        // Lenis eases towards the destination and can stop a handful of pixels short of it,
        // which on two full screens reads as a sliver of the one above still showing. Put it
        // exactly on the mark, re-measured in case the page has moved under the glide.
        try {
          var end = Math.min(heroTop(), Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
          if (Math.abs(end - window.scrollY) > 1) {
            if (window.cpLenis) window.cpLenis.scrollTo(end, { immediate: true, force: true });
            else window.scrollTo(0, end);
          }
        } catch (err) {
          console.debug('[experience] landing failed', err);
        }
      }
      // However the glide ends, the page must not be left locked.
      window.setTimeout(function () {
        if (!gliding) return;
        landed();
        try { if (window.cpLenis) window.cpLenis.start(); } catch (err) { console.debug('[experience] unlock failed', err); }
      }, (GLIDE + 1.2) * 1000);

      // With smooth scrolling on, Lenis owns the scroll position — driving window.scrollTo
      // per frame would just fight its lerp. Hand it the destination instead, and lock it so
      // the wheel or swipe that asked for the hero does not also carry on past it.
      if (window.cpLenis) {
        window.cpLenis.scrollTo(top, { duration: GLIDE, lock: true, force: true, onComplete: landed });
        return;
      }

      var at = { y: window.scrollY };
      gsap.to(at, {
        y: top, duration: GLIDE, ease: OUT,
        onUpdate: function () { window.scrollTo(0, at.y); },
        onComplete: landed
      });
    }

    // Figma's own hold, for a visitor who does nothing.
    gsap.delayedCall(ENTRANCE + HOLD, function () {
      if (window.scrollY > SETTLED) { done = true; return; }
      glide();
    });

    // ... and the visitor's first move downwards, whichever comes first.
    function take(down) {
      if (done || gliding) return;
      if (window.scrollY > SETTLED) { done = true; return; }   // already past: leave them alone
      if (down) glide();
    }
    window.addEventListener('wheel', function (e) { take(!e || e.deltaY > 0); }, { passive: true });
    window.addEventListener('keydown', function (e) {
      var k = e && e.key;
      if (k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Spacebar') take(true);
    });
    var from = null;
    window.addEventListener('touchstart', function (e) {
      from = e.touches && e.touches[0] ? e.touches[0].clientY : null;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
      var y = e.touches && e.touches[0] ? e.touches[0].clientY : null;
      if (from === null || y === null) return;
      if (from - y > 8) take(true);
    }, { passive: true });
  }


  // Figma puts the logo on the intro frames but the Nav only on the hero frame
  // (230:5852 inside 117:3974), so Menu / Get Website Audit wait for the hero rather
  // than sitting over the EXPERIENCE screen. The embed hides them while <html> carries
  // .cp-nav-wait and does nothing otherwise, so a script that never runs leaves the nav
  // visible — the safe way round.
  function navGate(root) {
    var html = document.documentElement;
    function sync() {
      // Below 768 there is no EXPERIENCE screen, so the hero is the first thing you see.
      if (window.innerWidth < 768) return html.classList.remove('cp-nav-wait');
      var screen = root.offsetHeight || window.innerHeight;
      html.classList.toggle('cp-nav-wait', window.scrollY < screen * 0.45);
    }
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
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
    if (!cards) return;
    for (var k = 0; k < CARDS.length; k++) {
      var card = cards.querySelector('.experience_card' + CARDS[k].sel);
      var a = CARDS[k].at[2];
      if (card) gsap.set(card, { x: a[0] * p, y: a[1] * p, scale: a[2] / CARD_W });
    }
    for (var n = 0; n < RINGS.length; n++) {
      var ring = cards.querySelector('.experience_pulse' + RINGS[n].sel);
      if (ring) gsap.set(ring, { xPercent: -50, yPercent: -50, scale: RINGS[n].to[0], opacity: RINGS[n].to[1] });
    }
  }

  // Figma's hero is one 1024-tall frame and it is built at that size, so on any laptop
  // shorter than 1024 the service card at the bottom is cut off — the screen the visitor
  // lands on after the hand-off is the one screen that must be whole. Scale the section to
  // the height it actually has, the way the board above it already scales to its width, and
  // take the difference back out of the flow so the page is no taller than what it shows.
  // Below 768 there is no hand-off and the hero is a column that is meant to scroll, so it
  // is left alone.
  function fitHero() {
    var hero = document.querySelector('[data-cp="home-hero"]');
    if (!hero) return;
    var inner = hero.querySelector('.padding-global');
    if (!inner || !inner.style) return;

    function fit() {
      try {
        inner.style.width = '';
        inner.style.transform = '';
        hero.style.height = '';
        if (window.innerWidth < 768) return;
        var need = inner.offsetHeight;
        var room = window.innerHeight;
        if (!need || !room) return;
        // Taller screens get the same treatment: leaving 1024 in a 1080 window puts a strip
        // of the screen above showing under the hero, and the hand-off cannot even scroll
        // that far. Stretching one Figma frame a long way is its own kind of wrong, though,
        // so past a quarter over it stops and the room is left as room.
        var k = Math.min(room / need, 1.25);
        if (Math.abs(k - 1) < 0.002) return;
        // Widen the content by as much as the scale will take back, so the hero still runs
        // edge to edge afterwards. Scaling it as it stands would pull its sides in by the
        // same fraction and leave the grid rule stopping short of both edges.
        inner.style.width = Math.round(10000 / k) / 100 + '%';
        inner.style.transformOrigin = 'top left';
        inner.style.transform = 'scale(' + Math.round(k * 10000) / 10000 + ')';
        hero.style.height = Math.round(room) + 'px';
      } catch (err) {
        console.debug('[experience] hero fit failed', err);
      }
    }

    fit();
    window.addEventListener('resize', fit);
    // Webfonts and the card videos land late and change the height this is measured from.
    window.addEventListener('load', fit);
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); } catch (err) { /* ignore */ }
  }


  function init(root) {
    navGate(root);                 // runs whatever the motion preference is
    fitHero();
    if (reduced()) return rest(root);

    var running = null;
    var handed = false;
    // Every position is derived from the measured width, so a resize has to rebuild.
    // Once the screen has played, though, rebuilding must not replay it — it jumps
    // straight to the end instead, and only the word rotator keeps running.
    function start(settled) {
      if (running) {
        if (running.master) running.master.kill();
        if (running.loop) running.loop.kill();
      }
      running = build(root);
      if (!running) return rest(root);
      if (settled) running.master.progress(1);
      if (!handed) {
        handed = true;          // a resize rebuilds the panels, not the hand-off
        handOff();
      }
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
        if (!running) return;
        start(running.master.progress() >= 1);
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

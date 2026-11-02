/*
 * Home intro loader — the logo builds itself, then flies into the header.
 * Figma: 1:10975 -> 1:10984 -> 1:10994 -> 1:11004 -> 1:11008 -> 1:11013 -> 1:11076.
 *
 * Seven frames, every hop Smart Animate EASE_OUT:
 *
 *   1:10975  0.30s hold  the four dots sit at opacity 0 and the three bars are
 *                        collapsed to nothing — a blank white screen
 *            0.30s       dots fade up, bars draw out between them: the chart mark
 *   1:10984  0.15s hold   writes itself. An orange disc waits behind it at 174px,
 *                        still invisible
 *            0.30s       the disc fades in and grows 174 -> 317, and the mark turns
 *   1:10994  0.001s hold   from orange to white as the disc arrives under it
 *            (cut)       Figma swaps the dots-and-bars for one combined vector here.
 *   1:11004  0.15s hold   Same picture, so this file keeps the one set of shapes.
 *            0.30s       mark shrinks 263 -> 204 wide, held on the disc's centre
 *   1:11008  0.30s hold  the wordmark is already parked at the header's x, 80px above
 *                        the viewport
 *            0.80s       disc 317 -> 45 and flies to the header slot, mark follows it
 *   1:11013               down to 28 wide, wordmark drops into place beside it
 *            1.20s       the EXPERIENCE panels slide in — that is home-experience.js,
 *   1:11076               which this file starts with a `cp:intro-done` event
 *
 * The landing is measured, not hard-coded: the overlay reads the real header logo's
 * box and lands the disc and the wordmark exactly on top of it, then cross-dissolves
 * the whole overlay away. The real logo is underneath at the same pixels, so the
 * handover is invisible and nothing has to be hidden or un-hidden on the header.
 *
 * Markup (Webflow) — the component is the FIRST element in the Body, above the header,
 * so the overlay is parsed before anything can paint behind it:
 *   [data-cp="intro"]        .intro_component, fixed, white, only shown while
 *                            <html> carries .cp-intro-running
 *     .intro_logo              317x317 box, transform-origin 0 0 — the flight
 *       .intro_circle          the orange disc
 *       .intro_mark.is-dark    chart mark, orange (steps 1-2)
 *       .intro_mark.is-light   chart mark, white (steps 3-6)
 *     .intro_wordmark          "ConvertPolo", transform-origin 0 0
 *
 * .cp-intro-running is set by a tiny inline script in the same embed, before this file
 * loads: it owns the once-per-session check and an 8s failsafe that drops the class
 * even if this script never arrives. That is why a broken intro cannot strand the page
 * behind a white overlay.
 */
(function () {
  'use strict';

  var RUNNING = 'cp-intro-running';
  var BOX = 317;              // the .intro_logo box, = the disc at its widest (Figma 1:10994)
  var MARK_W = 263;           // the mark's natural width (Figma 1:11004)
  var START_SCALE = 174 / BOX;      // the disc is seeded at 174 (Figma 1:10984)
  var MARK_MID = 204 / MARK_W;      // 1:11008
  var WORD_W = 198.37;        // the wordmark asset's own width
  var WORD_RISE = 80;         // Figma: the wordmark drops from y -35 to y 45

  // Where the disc and the wordmark sit inside each header lockup, in that SVG's own
  // viewBox units. Measured from the published logo assets, not guessed.
  var SLOTS = {
    desktop: { box: 254, circle: [0, 0, 45], word: [55.63, 7.64, 198.37] },
    mobile: { box: 150, circle: [0, 0, 28], word: [34, 6, 116] }
  };

  function reduced() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (err) {
      return false;
    }
  }

  // The header shows one of two lockups. Take whichever is actually displayed, and the
  // slot geometry that goes with it.
  function headerLogo() {
    var pairs = [
      ['.header_logo', SLOTS.desktop],
      ['.header_logo-mobile', SLOTS.mobile]
    ];
    for (var i = 0; i < pairs.length; i++) {
      var el = document.querySelector(pairs[i][0]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return { rect: r, slot: pairs[i][1] };
    }
    // The images have not loaded yet — the link is still the right box, and the site
    // only serves the mobile lockup under 768.
    var link = document.querySelector('.header_logo-link');
    if (!link) return null;
    var lr = link.getBoundingClientRect();
    if (!lr.width) return null;
    return { rect: lr, slot: window.innerWidth < 768 ? SLOTS.mobile : SLOTS.desktop };
  }

  // The panels' cue. Fires once, whether the sequence played out or was skipped.
  var signalled = false;
  function signal() {
    if (signalled) return;
    signalled = true;
    try {
      window.dispatchEvent(new CustomEvent('cp:intro-done'));
    } catch (err) {
      console.debug('[intro] event', err);
    }
  }

  function finish(root) {
    document.documentElement.classList.remove(RUNNING);
    if (root) root.style.display = 'none';
    signal();
  }

  function init(root) {
    var logo = root.querySelector('.intro_logo');
    var circle = root.querySelector('.intro_circle');
    var dark = root.querySelector('.intro_mark.is-dark');
    var light = root.querySelector('.intro_mark.is-light');
    var word = root.querySelector('.intro_wordmark');
    if (!logo || !circle || !dark || !light || !word) return finish(root);

    var header = headerLogo();
    if (!header) return finish(root);

    var marks = [dark, light];
    var dots = root.querySelectorAll('.intro_mark-dots');
    var lines = root.querySelectorAll('.intro_mark-lines line');

    var slot = header.slot;
    var r = header.rect;
    var k = r.width / slot.box;                    // header px per lockup unit
    var endSize = slot.circle[2] * k;
    var endX = r.left + slot.circle[0] * k;
    var endY = r.top + slot.circle[1] * k;
    var wordX = r.left + slot.word[0] * k;
    var wordY = r.top + slot.word[1] * k;
    var wordScale = (slot.word[2] * k) / WORD_W;

    // The disc is 317 on the 1440x1024 board. Hold that on desktop and let it come down
    // with the viewport so it never crowds a phone.
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var big = Math.min(BOX, vw * 0.46, vh * 0.31);

    // In the header the mark is 28 wide inside a 45 disc. The flight scales the whole
    // box by endSize/BOX, so the mark only has to give up the last fraction itself.
    var markEnd = (slot.circle[2] === 45 ? 28 / 45 : 21.83 / 28) * (BOX / MARK_W);

    gsap.set(logo, { x: (vw - big) / 2, y: (vh - big) / 2, scale: big / BOX });
    gsap.set(circle, { scale: START_SCALE, opacity: 0 });
    gsap.set(marks, { scale: 1 });
    gsap.set(dark, { opacity: 1 });
    gsap.set(light, { opacity: 0 });
    gsap.set(dots, { opacity: 0 });
    gsap.set(word, { x: wordX, y: wordY - WORD_RISE * k, scale: wordScale });

    // Draw the bars rather than stretch them: scaling a <line> would thin its stroke.
    for (var i = 0; i < lines.length; i++) {
      var len = lines[i].getTotalLength();
      gsap.set(lines[i], { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
    }

    var out = 'power2.out';
    var tl = gsap.timeline({ delay: 0.3, onComplete: function () { finish(root); } });

    // 1:10975 -> 1:10984 — the mark writes itself
    tl.to(dots, { opacity: 1, duration: 0.3, ease: out }, 0)
      .to(lines, { strokeDashoffset: 0, opacity: 1, duration: 0.3, ease: out }, 0)
      // 1:10984 -> 1:10994 — the disc arrives and the mark flips to white
      .to(circle, { opacity: 1, scale: 1, duration: 0.3, ease: out }, 0.45)
      .to(dark, { opacity: 0, duration: 0.3, ease: out }, 0.45)
      .to(light, { opacity: 1, duration: 0.3, ease: out }, 0.45)
      // 1:11004 -> 1:11008 — the mark settles to 204 wide
      .to(marks, { scale: MARK_MID, duration: 0.3, ease: out }, 0.9)
      // 1:11008 -> 1:11013 — everything flies to the header
      .to(logo, { x: endX, y: endY, scale: endSize / BOX, duration: 0.8, ease: out }, 1.5)
      .to(marks, { scale: markEnd, duration: 0.8, ease: out }, 1.5)
      .to(word, { y: wordY, duration: 0.8, ease: out }, 1.5)
      // 1:11013 -> 1:11076 — hand the panels their cue and dissolve away over the
      // real header logo, which has been sitting underneath at these pixels all along
      .add(signal, 2.3)
      .to(root, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 2.3);
  }

  function boot() {
    var root = document.querySelector('[data-cp="intro"]');
    if (!root) return;
    if (!document.documentElement.classList.contains(RUNNING)) {
      // Already played this session, or the gate script decided against it.
      root.style.display = 'none';
      return;
    }
    if (reduced() || !window.gsap) return finish(root);
    try {
      init(root);
    } catch (err) {
      console.debug('[intro] init failed', err);
      finish(root);
    }
  }

  // Webflow injects GSAP late, so wait for it rather than assume it.
  function ready() {
    if (window.gsap) return boot();
    var waited = 0;
    var poll = setInterval(function () {
      waited += 50;
      if (window.gsap || waited >= 3000) {
        clearInterval(poll);
        boot();
      }
    }, 50);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();

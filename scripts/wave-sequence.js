/*
 * Wave sequence — "How it works" on the Brand Building Studio page.
 *
 * Figma prototype (Brand flow from 117:4777). Desktop frames:
 *   1:9395  → 1:11225  zoomed view slides up into place (0.6s ease-out) — here: the scroll-in
 *   1:11225 → 1:11168 → 1:11284 → 1:11341 → 1:11398   steps 01→05, Smart Animate 1.2s ease-out each
 *   1:11398 → 1:11455  zoom out to the whole wave, 1.2s ease-out
 *   1:11455 → 1:10392  next scroll: wave and testimonials rise together (−748 / −740px), 0.6s ease-out
 *   1:10392 → 1:10771  next scroll: testimonials out left, footer (form) fades in, 0.6s ease-out
 * Each frame waits for a click in the prototype; on the site each step holds while you scroll, and a
 * step's video playing to the end moves on to the next step.
 *
 * Like Smart Animate, this interpolates every element between the frames' recorded positions
 * (KEYFRAMES below, read from the Figma file). Dots also pulse (65 ↔ 53px, 0.8s).
 *
 * Markup (Webflow):
 *   [data-cp="wave"]                     the section
 *     .brand-how_component               the stage (1440×439, the page's 1440 frame from y 2795)
 *       svg[data-cp="wave-svg"]
 *         path[data-cp="wave-track"] / path[data-cp="wave-progress"] (clipped by an ellipse) / g[data-cp="wave-dot"] ×5
 *       [data-cp="wave-step"] ×5         step text, 01→05
 *       [data-cp="wave-media"] ×5        video slot per step, 01→05 (hidden until the script shows it),
 *         holding video[data-cp="wave-video"][data-media="desktop"]; only the current step's video plays
 *
 * Mobile (≤767px) has no design yet: it shows the whole wave, still. Reduced motion: the same.
 * Needs GSAP + ScrollTrigger.
 */
(function () {
  'use strict';

  /*
   * Keyframes, one per prototype frame, in stage pixels. Zoomed frames: the prototype frame's
   * position minus the stage's (y 334 in 1:11455). The last keyframe is the whole wave = the page layout.
   *   path:  [x, y, w, h] of the wave's bounding box
   *   dots:  [centreX, centreY, diameter] per step
   *   text:  [x, y, width] per step
   *   media: [x, y] per step (980×540 video slot); none in the whole view, so they fade out
   *   mask:  the "Mask group" ellipse that reveals the dark line: [centreX, centreY, w, h, rotation°]
   */
  var KEYFRAMES = [
    { path: [-625, -118, 11775, 679.12], mask: [720, 561, 32, 32, 0],
      dots: [[720.5, 560.5, 65], [1988.5, -113.5, 65], [3317.5, 560.5, 65], [4582.5, -118.5, 65], [5929.5, 560.5, 65]],
      text: [[458, 372, 501], [1734, -61, 509], [3048, 372, 511], [4349, -66, 467], [5707, 372, 427]],
      media: [[217, -191], [1508, 105], [2813, -191], [4111, 100], [5418, -198]] },
    { path: [-1893, -118, 11775, 679.12], mask: [-7.5, 58.5, 1479, 1479, 0],
      dots: [[-547.5, 560.5, 65], [720.5, -113.5, 65], [2049.5, 560.5, 65], [3314.5, -118.5, 65], [4661.5, 560.5, 65]],
      text: [[-810, 372, 501], [466, -61, 509], [1780, 372, 511], [3081, -66, 467], [4439, 372, 427]],
      media: [[-1051, -191], [240, 105], [1545, -191], [2843, 100], [4150, -198]] },
    { path: [-3222, -73, 11775, 679.12], mask: [98.5, 222.5, 1479, 1479, 0],
      dots: [[-1876.5, 605.5, 65], [-608.5, -68.5, 65], [720.5, 605.5, 65], [1985.5, -73.5, 65], [3332.5, 605.5, 65]],
      text: [[-2139, 417, 501], [-863, -16, 509], [451, 417, 511], [1752, -21, 467], [3110, 417, 427]],
      media: [[-2380, -146], [-1089, 150], [216, -146], [1514, 145], [2821, -153]] },
    { path: [-4488, -118, 11775, 679.12], mask: [42.5, 177.5, 1479, 1479, 0],
      dots: [[-3142.5, 560.5, 65], [-1874.5, -113.5, 65], [-545.5, 560.5, 65], [719.5, -118.5, 65], [2066.5, 560.5, 65]],
      text: [[-3405, 372, 501], [-2129, -61, 509], [-815, 372, 511], [486, -66, 467], [1844, 372, 427]],
      media: [[-3646, -191], [-2355, 105], [-1050, -191], [248, 100], [1555, -198]] },
    { path: [-5835, -118, 11775, 679.12], mask: [95.5, 177.5, 1479, 1479, 0],
      dots: [[-4489.5, 560.5, 65], [-3221.5, -113.5, 65], [-1892.5, 560.5, 65], [-627.5, -118.5, 65], [719.5, 560.5, 65]],
      text: [[-4752, 372, 501], [-3476, -61, 509], [-2162, 372, 511], [-861, -66, 467], [497, 372, 427]],
      media: [[-4993, -191], [-3702, 105], [-2397, -191], [-1099, 100], [208, -198]] },
    { path: [-70, 132.66, 2338, 134.84], mask: [711.5, 191.5, 1061, 1073, 0],
      dots: [[189.5, 267.5, 35], [448.5, 132.5, 35], [712.5, 267.5, 35], [972.5, 132.5, 35], [1233.5, 267.5, 35]],
      text: [[73, 1, 249], [335, 173, 247], [580, 0, 263], [850.5, 213, 239], [1101, 0, 247]],
      media: null }
  ];

  var MODE = {
    query: '(min-width: 768px)',
    media: { w: 980, h: 540 },                       // video slot (Figma 980×540)
    strokeZoomed: 15,                                // line thickness while zoomed (10 in the whole view)
    stageTop: 334, frameHeight: 1024,                // stage top in the 1440×1024 frame 1:11455
    travel: 1.2, zoomOut: 1.2,                       // 01→05 and 05 → whole, Smart Animate 1.2s ease-out
    autoAdvance: true,                               // step videos play once, then move to the next step
    // 1:11455 → 1:10392 (0.6s ease-out): wave −748px, testimonials −740px; their cards start 705px
    // below the stage top (1039 vs 334). Then 1:10392 → 1:10771 (0.6s ease-out): testimonials leave
    // left (80 → −1770 at 1440), footer fades in with its heading 154px above the stage top (180 vs 334).
    tail: {
      cardsBelowStage: 705, stageRise: 748, cardsRise: 740, duration: 0.6, ease: figmaEaseOut,
      offscreenGap: 20, scrollPerStep: 0.6, headingBelowStage: -154
    }
  };
  var HOLD = 1;                  // scroll spent resting on each step, in the same units as `travel`
  var SCROLL_PER_UNIT = 0.45;    // viewport heights of scrolling per timeline second
  var PULSE = { ratio: 53 / 65, duration: 0.8, ease: 'power1.out' };

  // Figma's "Ease out" curve: cubic-bezier(0, 0, 0.58, 1).
  function figmaEaseOut(t) {
    // Solve x(u) = t for the bezier parameter u (x1 = 0, x2 = 0.58), then return y(u) (y1 = 0, y2 = 1).
    var u = t;
    for (var i = 0; i < 8; i++) {
      var x = 3 * (1 - u) * u * u * 0.58 + u * u * u - t;
      var dx = 3 * (2 * u - 3 * u * u) * 0.58 + 3 * u * u;
      if (Math.abs(x) < 1e-6 || dx === 0) break;
      u = Math.min(1, Math.max(0, u - x / dx));
    }
    return 3 * (1 - u) * u * u + u * u * u;
  }

  function log(msg, e) { try { console.debug('[wave] ' + msg, e || ''); } catch (_) {} }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function setup(section) {
    var svg = section.querySelector('svg[data-cp="wave-svg"]');
    var stage = section.querySelector('.brand-how_component') || (svg && svg.parentNode.parentNode);
    var steps = all(section, '[data-cp="wave-step"]');
    if (!svg || !stage || steps.length !== 5) return null;
    var progress = svg.querySelector('[data-cp="wave-progress"]');
    var dots = all(svg, '[data-cp="wave-dot"]');
    if (!progress || dots.length !== 5) return null;
    var m = progress.parentNode.transform.baseVal.consolidate();
    var pm = m ? m.matrix : { a: 1, d: 1, e: 0, f: 0 }, bb = progress.getBBox();
    return {
      svg: svg, stage: stage, steps: steps, dots: dots, progress: progress, pathMatrix: pm,
      // The path's real box in stage pixels (what the camera maps onto each frame's path box).
      pathBox: [pm.e + pm.a * bb.x, pm.f + pm.d * bb.y, pm.a * bb.width, pm.d * bb.height],
      media: all(section, '[data-cp="wave-media"]'),
      centers: dots.map(function (d) {
        var c = d.querySelector('circle');
        return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') };
      })
    };
  }

  // The reveal ellipse inside the progress path's clipPath (from the markup, or made here).
  function clipEllipse(c) {
    var ref = /url\(#([^)]+)\)/.exec(c.progress.getAttribute('clip-path') || '');
    var clip = ref && c.svg.querySelector('[id="' + ref[1] + '"]');
    var ellipse = clip && clip.querySelector('ellipse');
    if (ellipse) return ellipse;
    var id = 'cp-wave-clip-' + Math.random().toString(36).slice(2, 8);
    clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    clip.setAttribute('id', id);
    clip.appendChild(ellipse);
    c.progress.parentNode.insertBefore(clip, c.progress);
    c.progress.setAttribute('clip-path', 'url(#' + id + ')');
    return ellipse;
  }

  function init(section, gsap) {
    var c = setup(section);
    if (!c) return log('markup incomplete');
    var media = c.media.length === 5 ? c.media : [];
    var K = KEYFRAMES, last = K.length - 1;

    // The camera scales one <g> holding the path and dots; step text and videos are HTML and only move.
    var world = c.svg.querySelector('g[data-cp-world]');
    if (!world) {
      world = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      world.setAttribute('data-cp-world', '');
      all(c.svg, ':scope > :not(defs)').forEach(function (n) { world.appendChild(n); });
      c.svg.appendChild(world);
    }
    // Line thickness on screen: the frames' stroke while zoomed, the static layout's in the whole view.
    var strokes = all(c.svg, 'path').map(function (p) {
      var gm = p.parentNode.transform.baseVal.consolidate(), gs = gm ? (gm.matrix.a + gm.matrix.d) / 2 : 1;
      return { el: p, gs: gs, whole: (+p.getAttribute('stroke-width') || 1) * gs };
    });
    gsap.set(c.svg, { overflow: 'visible' });
    gsap.set(section, { overflowX: 'clip' });
    media.forEach(function (el) { gsap.set(el, { width: MODE.media.w, height: MODE.media.h, left: 0, top: 0 }); });
    var base = c.steps.map(function (s) { return { x: s.offsetLeft, y: s.offsetTop }; });

    // World transform for a keyframe: maps the page's path box onto the frame's path box.
    var box = c.pathBox;
    function camera(k) {
      var s = k.path[2] / box[2];
      return { s: s, tx: k.path[0] - s * box[0], ty: k.path[1] - s * box[1] };
    }
    var ellipse = clipEllipse(c);
    ellipse.setAttribute('cx', 0);
    ellipse.setAttribute('cy', 0);
    var pm = c.pathMatrix;

    // Halo pulse (prototype: dot variant Default ↔ Variant2, 0.8s ease-out, looping).
    c.dots.forEach(function (d) {
      var halo = d.querySelector('circle');
      gsap.to(halo, { scale: PULSE.ratio, svgOrigin: halo.getAttribute('cx') + ' ' + halo.getAttribute('cy'),
        duration: PULSE.duration, ease: PULSE.ease, yoyo: true, repeat: -1 });
    });

    var videos = media.map(function (el) {
      var v = el.querySelector('video[data-cp="wave-video"]');
      if (v && v.preload === 'none') v.preload = 'auto';
      return v;
    });

    // Only the current step's video plays, from the start each time its step is reached.
    var playing = -1;
    function playStep(n) {
      if (n === playing) return;
      try {
        if (videos[playing]) videos[playing].pause();
        if (videos[n]) { videos[n].currentTime = 0; var p = videos[n].play(); if (p && p.catch) p.catch(function () {}); }
      } catch (e) { log('video', e); }
      playing = n;
    }

    var state = { p: 0 };
    function render() {
      playStep(state.p < last - 0.5 ? Math.round(state.p) : -1);
      var i = Math.min(Math.floor(state.p), last - 1), f = state.p - i, a = K[i], b = K[i + 1];
      var ca = camera(a), cb = camera(b);
      var s = lerp(ca.s, cb.s, f), tx = lerp(ca.tx, cb.tx, f), ty = lerp(ca.ty, cb.ty, f);
      world.setAttribute('transform', 'translate(' + tx + ' ' + ty + ') scale(' + s + ')');
      strokes.forEach(function (p) {
        var wa = i === last ? p.whole : MODE.strokeZoomed, wb = i + 1 === last ? p.whole : MODE.strokeZoomed;
        p.el.setAttribute('stroke-width', lerp(wa, wb, f) / (p.gs * s));
      });
      c.dots.forEach(function (d, n) {
        var x = lerp(a.dots[n][0], b.dots[n][0], f), y = lerp(a.dots[n][1], b.dots[n][1], f);
        var size = lerp(a.dots[n][2], b.dots[n][2], f), p = c.centers[n];
        var k = size / (p.r * 2) / s;
        d.setAttribute('transform', 'translate(' + (x - tx) / s + ' ' + (y - ty) / s + ') scale(' + k + ') translate(' + -p.x + ' ' + -p.y + ')');
      });
      c.steps.forEach(function (el, n) {
        gsap.set(el, {
          x: lerp(a.text[n][0], b.text[n][0], f) - base[n].x,
          y: lerp(a.text[n][1], b.text[n][1], f) - base[n].y,
          width: lerp(a.text[n][2], b.text[n][2], f)
        });
      });
      media.forEach(function (el, n) {
        var from = a.media[n], to = b.media ? b.media[n] : from;   // into the whole view: fade in place
        gsap.set(el, { x: lerp(from[0], to[0], f), y: lerp(from[1], to[1], f), autoAlpha: b.media ? 1 : 1 - f });
      });
      // Mask: [centreX, centreY, width, height, rotation] on screen → path coordinates.
      var mk = a.mask.map(function (v, q) { return lerp(v, b.mask[q], f); });
      var lx = ((mk[0] - tx) / s - pm.e) / pm.a, ly = ((mk[1] - ty) / s - pm.f) / pm.d;
      ellipse.setAttribute('rx', mk[2] / 2 / (s * pm.a));
      ellipse.setAttribute('ry', mk[3] / 2 / (s * pm.d));
      ellipse.setAttribute('transform', 'translate(' + lx + ' ' + ly + ') rotate(' + mk[4] + ')');
    }

    // Pin so the stage sits where Figma puts it, with the Figma frame centred on the screen's real
    // height (as the prototype viewer does); never so low that the whole wave doesn't fit.
    var stageInSection = c.stage.getBoundingClientRect().top - section.getBoundingClientRect().top;
    function pinTop() {
      var vh = window.innerHeight;
      var top = Math.max(0, Math.min(MODE.stageTop + (vh - MODE.frameHeight) / 2, vh - c.stage.offsetHeight - 10));
      return Math.round(top - stageInSection);
    }

    // After the whole wave (prototype 1:11455 → 1:10392 → 1:10671): the wave and the next section
    // (testimonials) rise together; then the testimonials slide out left and the section after them
    // (the footer) fades in where they were. Both are pulled up next to the stage, measured now from
    // the natural layout, before pinning. The rise and slide move the testimonials' inner wrapper,
    // since the section itself is held in place against the pin with `y`.
    var o = MODE.tail;
    var next = section.nextElementSibling;
    var inner = next && next.firstElementChild;
    var after = next && next.parentNode ? next.parentNode.nextElementSibling : null;
    var afterHeading = after ? after.querySelector('h1, h2, h3') : null;
    if (!inner) next = null;
    if (!afterHeading) after = null;
    var stageTopInSection = c.stage.offsetTop;
    var nextMargin = 0, afterMargin = 0;
    var cards = [];
    if (next) {
      var docTop = function (el) { return el.getBoundingClientRect().top + window.pageYOffset; };
      var margin = function (el) { return parseFloat(getComputedStyle(el).marginTop) || 0; };
      var S = docTop(section);
      cards = all(next, '*').filter(function (el) { var r = el.getBoundingClientRect(); return r.width > 300 && r.width < 900 && r.height > 200; });
      var cardsTop = cards.length ? Math.min.apply(null, cards.map(function (el) { return docTop(el); })) : docTop(next);
      // Testimonial cards land o.cardsBelowStage below the stage top.
      var dNext = (stageTopInSection + o.cardsBelowStage) - (cardsTop - S);
      nextMargin = margin(next) + dNext;
      if (after) {
        // The footer heading lands o.headingBelowStage below the stage top (it moves by dNext too).
        var dAfter = (stageTopInSection + o.headingBelowStage) - (docTop(afterHeading) + dNext - S);
        afterMargin = margin(after) + dAfter;
      }
    }

    // The wave part (01 → 05 → whole) follows the scroll, smoothed like a 0.6s scrub; each step's
    // travel uses the prototype's ease-out.
    var units = HOLD * 6 + MODE.travel * 4 + MODE.zoomOut;
    var tl = gsap.timeline({ paused: true, onUpdate: render });
    tl.to({}, { duration: HOLD });
    for (var n = 1; n <= last; n++) {
      tl.to(state, { p: n, duration: n === last ? MODE.zoomOut : MODE.travel, ease: figmaEaseOut });
      tl.to({}, { duration: HOLD });
    }

    // Then, like the prototype's clicks, one scroll step each: rise (0.6s), form (0.6s).
    // Each step plays its whole transition on time; scrolling back plays it in reverse.
    var steps = !next ? 0 : after ? 2 : 1;
    var stepPx = function () { return window.innerHeight * o.scrollPerStep; };
    var wavePx = function () { return window.innerHeight * SCROLL_PER_UNIT * units; };
    var stage = c.stage, tailStep = 0, level = [], nextOut = 0;

    if (next) {
      var cardsRight = -Infinity;
      cards.forEach(function (el) { cardsRight = Math.max(cardsRight, el.getBoundingClientRect().right); });
      if (!cards.length) cardsRight = window.innerWidth;
      nextOut = cardsRight + o.offscreenGap;                                    // testimonials: out left
      gsap.set(section.parentNode, { overflowX: 'clip' });
      gsap.set(next, { marginTop: nextMargin, position: 'relative', zIndex: 1 });
      level.push(next);
      if (after) {
        // The footer is pulled up over the testimonials' place, so the page wrapper ends at the footer
        // while the main area still runs past it: clip that overflow, or it scrolls on as blank space.
        if (after.parentNode) gsap.set(after.parentNode, { overflow: 'clip' });
        gsap.set(after, { marginTop: afterMargin, autoAlpha: 0, position: 'relative', zIndex: 1 });
        level.push(after);
      }
    }

    function goToTail(s) {
      if (s === tailStep) return;
      var tw = { duration: o.duration, ease: o.ease, overwrite: 'auto' };
      gsap.to(stage, Object.assign({ y: s === 0 ? 0 : -o.stageRise }, tw));
      gsap.to(inner, Object.assign({ y: s === 0 ? 0 : -o.cardsRise, x: s === 2 ? -nextOut : 0 }, tw));
      if (after) gsap.to(after, Object.assign({ autoAlpha: s === 2 ? 1 : 0 }, tw));
      tailStep = s;
    }

    var pin = window.ScrollTrigger.create({
      trigger: section,
      start: function () { return 'top ' + pinTop() + 'px'; },
      end: function () { return '+=' + Math.round(wavePx() + steps * stepPx()); },
      pin: true,
      invalidateOnRefresh: true,
      onRefresh: function (self) { update(self, true); },
      onUpdate: function (self) { update(self, false); }
    });

    if (MODE.autoAdvance) {
      // Auto-advance: when a step's video ends and the visitor hasn't scrolled, scroll on to the
      // next step (01 → … → 05 → whole wave) at the prototype's own pace. Any wheel, touch,
      // key or click cancels it, so the visitor always stays in control.
      var holdTime = function (k) { return k < last ? HOLD / 2 + k * (HOLD + MODE.travel) : units - HOLD / 2; };
      var auto = null;
      var cancelAuto = function () {
        if (!auto) return;
        auto.kill(); auto = null;
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) { window.removeEventListener(t, cancelAuto, true); });
      };
      var advanceFrom = function (n) {
        if (auto || !pin.isActive || playing !== n || Math.abs(state.p - n) > 0.02) return;
        var to = n + 1, seconds = to === last ? MODE.zoomOut : MODE.travel;
        var y = pin.start + (holdTime(to) / units) * wavePx();
        var pos = { y: window.pageYOffset };
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (t) { window.addEventListener(t, cancelAuto, true); });
        auto = gsap.to(pos, {
          y: y, duration: seconds, ease: 'none',
          onUpdate: function () { window.scrollTo(0, pos.y); },
          onComplete: function () { auto = null; cancelAuto(); }
        });
      };
      videos.forEach(function (v, n) {
        if (!v) return;
        v.loop = false;   // play once, then move on
        v.addEventListener('ended', function () { advanceFrom(n); });
      });
    }

    function update(self, instant) {
      var into = self.scroll() - self.start, wave = wavePx();
      var prog = Math.max(0, Math.min(1, into / wave));
      if (instant) tl.progress(prog);
      else gsap.to(tl, { progress: prog, duration: 0.6, ease: 'power3.out', overwrite: true });
      if (steps) {
        // Content after the section stays exactly where it will be when the pin ends.
        gsap.set(level, { y: Math.min(0, Math.max(self.start - self.end, self.scroll() - self.end)) });
        // Each step starts as soon as its slice of scroll is entered.
        var s = into <= wave + 1 ? 0 : Math.min(steps, 1 + Math.floor((into - wave) / stepPx() + 0.0001));
        if (instant) { tailStep = -1; }
        goToTail(s);
      }
    }
    render();
  }

  // Whole wave, still: the layout as published, with the reveal ellipse from the markup.
  function showFinal(section) {
    var c = setup(section);
    if (c) clipEllipse(c);
  }

  function boot() {
    var sections = document.querySelectorAll('[data-cp="wave"]');
    if (!sections.length) return;
    var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (var i = 0; i < sections.length; i++) {
      var section = sections[i];
      try {
        if (reduced || !gsap || !ScrollTrigger) {
          if (!gsap || !ScrollTrigger) log('GSAP/ScrollTrigger missing — showing final state');
          showFinal(section);
          continue;
        }
        gsap.registerPlugin(ScrollTrigger);
        // Phones resize the viewport as the address bar hides/shows; don't re-layout pins for that.
        ScrollTrigger.config({ ignoreMobileResize: true });
        (function (s) {
          gsap.matchMedia().add(MODE.query, function () {
            try { init(s, gsap); } catch (e) { log('init failed', e); showFinal(s); }
          });
        })(section);
      } catch (e) {
        log('init failed', e);
        try { showFinal(section); } catch (_) {}
      }
    }
  }

  // Webflow injects its own GSAP late, so wait for GSAP + ScrollTrigger (max ~5s), then boot.
  // If they never arrive, boot() falls back to the final still state.
  function whenReady() {
    if (!document.querySelector('[data-cp="wave"]')) return;
    var tries = 0;
    (function check() {
      if ((window.gsap && window.ScrollTrigger) || ++tries > 50) return boot();
      setTimeout(check, 100);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenReady);
  else whenReady();
})();

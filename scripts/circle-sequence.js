/*
 * Circle sequence — "How it works" on the Landing Page Optimization page.
 *
 * Figma prototype (LPO flow from 117:5329). Desktop frames:
 *   1:9580  → 1:9650   zoomed view slides up into place (0.3s ease-out) — here: the scroll-in
 *   1:9650  → 1:9711 → 1:9772 → 1:9833 → 1:9894   steps 01→05, Smart Animate 1.2s ease-out each
 *   1:9894  → 1:9955   zoom out to the whole circle, 1.2s ease-out
 *   1:9955  → 1:10538  next scroll: circle fades out, testimonials slide in from the right
 *                      (1460 → 80), 0.6s ease-out
 *   1:10538 → 1:10871  next scroll: testimonials out left (80 → −1760), footer (form) fades in, 0.6s ease-out
 * Each frame waits for a click in the prototype; on the site each step holds while you scroll, and a
 * step's video playing to the end moves on to the next step.
 *
 * Like Smart Animate, this interpolates every element between the frames' recorded positions
 * (KEYFRAMES below, read from the Figma file). Dots also pulse (65 ↔ 53px, 0.8s).
 *
 * Markup (Webflow):
 *   [data-cp="circle"]                   the section
 *     .lpo-how_component                 the stage (1440×793, the page's 1440 frame from y 3721)
 *       svg[data-cp="circle-svg"]        one per breakpoint; the visible one is used
 *         circle[data-cp="circle-track"] / circle[data-cp="circle-progress"] (clipped by an ellipse) /
 *         g[data-cp="circle-dot"] ×5
 *       [data-cp="circle-step"] ×5       step text, 01→05
 *       [data-cp="circle-media"] ×5      video slot per step, 01→05 (hidden until the script shows it),
 *         holding video[data-cp="circle-video"][data-media="desktop"]; only the current step's video plays
 *
 * Mobile (≤767px) has no design yet: it shows the whole circle, still. Reduced motion: the same.
 * Needs GSAP + ScrollTrigger.
 */
(function () {
  'use strict';

  /*
   * Keyframes, one per prototype frame, in stage pixels: the prototype frame's position minus the
   * stage's top in the whole-circle frame (y 172 in 1:9955). The last keyframe is the whole circle
   * = the page layout.
   *   path:  [x, y, w, h] of the circle's bounding box
   *   dots:  [centreX, centreY, diameter] per step
   *   text:  [x, y, width] per step
   *   media: [x, y] per step (980×540 video slot); none in the whole view, so they fade out
   *   mask:  the "Mask group" disc that reveals the dark line: [centreX, centreY, w, h, rotation°]
   */
  var KEYFRAMES = [
    { path: [161, -259, 2525, 2525], mask: [646.5, 8.5, 27, 27, 0],
      dots: [[645.5, 8.5, 65], [1903.5, -163.5, 65], [2683.5, 921.5, 65], [2241.5, 1964.5, 65], [378.5, 1710.5, 65]],
      text: [[752, -8, 443], [1587, -127, 408], [2170, 783, 417], [1722, 1770, 417], [566, 1676, 417]],
      media: [[128, 192], [1519, 73], [1931, 995], [37, 1081], [1162, 1976]] },
    { path: [-1134, -42, 2525, 2525], mask: [-28, 98, 1276, 1276, 0],
      dots: [[-649.5, 225.5, 65], [608.5, 53.5, 65], [1388.5, 1138.5, 65], [946.5, 2181.5, 65], [-916.5, 1927.5, 65]],
      text: [[-543, 209, 443], [292, 90, 408], [875, 1000, 417], [427, 1987, 417], [-729, 1893, 417]],
      media: [[-1167, 409], [227, 290], [636, 1212], [-1258, 1298], [-133, 2193]] },
    { path: [-1572, -1061, 2525, 2525], mask: [130.5, -799.5, 2469, 2469, 0],
      dots: [[-1087.5, -793.5, 65], [170.5, -965.5, 65], [950.5, 119.5, 65], [508.5, 1162.5, 65], [-1354.5, 908.5, 65]],
      text: [[-981, -810, 443], [-146, -929, 408], [437, -19, 417], [-11, 968, 417], [-1167, 874, 417]],
      media: [[-1605, -610], [-211, -729], [198, 193], [-1696, 279], [-571, 1174]] },
    { path: [-870, -1997, 2525, 2525], mask: [1291.5, -1001.5, 2469, 2469, 0],
      dots: [[-385.5, -1729.5, 65], [872.5, -1901.5, 65], [1652.5, -816.5, 65], [1210.5, 226.5, 65], [-652.5, -27.5, 65]],
      text: [[-279, -1746, 443], [556, -1865, 408], [1139, -955, 417], [691, 32, 417], [-465, -62, 417]],
      media: [[-903, -1546], [491, -1665], [900, -743], [-994, -657], [131, 238]] },
    { path: [350, -1327, 2525, 2525], mask: [1303, 797, 1492, 1492, 0],
      dots: [[834.5, -1059.5, 65], [2092.5, -1231.5, 65], [2872.5, -146.5, 65], [2430.5, 896.5, 65], [567.5, 642.5, 65]],
      text: [[941, -1076, 443], [1776, -1195, 408], [2359, -285, 417], [1911, 702, 417], [755, 608, 417]],
      media: [[317, -876], [1711, -995], [2120, -73], [226, 13], [1351, 908]] },
    { path: [429.73, 106.35, 504.4, 504.4], mask: [691.62, 367.44, 567.72, 567.72, 0],
      dots: [[471.5, 219.5, 35], [763.5, 120.5, 35], [932.5, 331.5, 35], [787.5, 587.5, 35], [484.5, 514.5, 35]],
      text: [[123, 62, 307], [907, 0, 401], [1000, 294, 329], [866, 587, 417], [161, 438, 324]],
      media: null }
  ];

  var MODE = {
    query: '(min-width: 768px)',
    media: { w: 980, h: 540 },                       // video slot (Figma 980×540)
    strokeZoomed: 15,                                // line thickness while zoomed (10 in the whole view)
    stageTop: 172, frameHeight: 1024,                // stage top in the 1440×1024 frame 1:9955
    travel: 1.2, zoomOut: 1.2,                       // 01→05 and 05 → whole, Smart Animate 1.2s ease-out
    // 1:9955 → 1:10538 (0.6s ease-out): circle fades, testimonials 1460 → 80 with their cards 127px
    // below the stage top (299 vs 172). Then 1:10538 → 1:10871 (0.6s ease-out): testimonials leave
    // left (80 → −1760 at 1440), footer fades in with its heading 8px below the stage top (180 vs 172).
    // Distances are measured on the page so the slides start/end just off screen at any width.
    tail: { cardsBelowStage: 127, headingBelowStage: 8, duration: 0.6, ease: figmaEaseOut, offscreenGap: 20, scrollPerStep: 0.6 }
  };
  var HOLD = 1;                  // scroll spent resting on each step, in the same units as `travel`
  var SCROLL_PER_UNIT = 0.45;    // viewport heights of scrolling per timeline second
  var PULSE = { ratio: 53 / 65, duration: 0.8, ease: 'power1.out' };
  var USER_INPUT = ['wheel', 'touchstart', 'keydown', 'mousedown'];

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

  function log(msg, e) { try { console.debug('[circle] ' + msg, e || ''); } catch (_) {} }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function visibleSvg(section) {
    var svgs = all(section, 'svg[data-cp="circle-svg"]');
    for (var i = 0; i < svgs.length; i++) if (svgs[i].getBoundingClientRect().width > 0) return svgs[i];
    return null;
  }

  function setup(section) {
    var svg = visibleSvg(section);
    var stage = section.querySelector('.lpo-how_component') || (svg && svg.parentNode.parentNode);
    var steps = all(section, '[data-cp="circle-step"]');
    if (!svg || !stage || steps.length !== 5) return null;
    var progress = svg.querySelector('[data-cp="circle-progress"]');
    var dots = all(svg, '[data-cp="circle-dot"]');
    if (!progress || dots.length !== 5) return null;
    var m = progress.parentNode.transform.baseVal.consolidate();
    var pm = m ? m.matrix : { a: 1, d: 1, e: 0, f: 0 }, bb = progress.getBBox();
    return {
      svg: svg, stage: stage, steps: steps, dots: dots, progress: progress, pathMatrix: pm,
      // The circle's real box in stage pixels (what the camera maps onto each frame's circle box).
      pathBox: [pm.e + pm.a * bb.x, pm.f + pm.d * bb.y, pm.a * bb.width, pm.d * bb.height],
      media: all(section, '[data-cp="circle-media"]'),
      centers: dots.map(function (d) {
        var c = d.querySelector('circle');
        return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') };
      })
    };
  }

  // The reveal ellipse inside the progress circle's clipPath (from the markup, or made here).
  function clipEllipse(c) {
    var ref = /url\(#([^)]+)\)/.exec(c.progress.getAttribute('clip-path') || '');
    var clip = ref && c.svg.querySelector('[id="' + ref[1] + '"]');
    var ellipse = clip && clip.querySelector('ellipse');
    if (ellipse) return ellipse;
    var id = 'cp-circle-clip-' + Math.random().toString(36).slice(2, 8);
    clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    clip.setAttribute('id', id);
    clip.appendChild(ellipse);
    c.progress.parentNode.insertBefore(clip, c.progress);
    c.progress.setAttribute('clip-path', 'url(#' + id + ')');
    return ellipse;
  }

  // Scrolls the window to `y` over `seconds`; any wheel, touch, key or click cancels it, so the
  // visitor always stays in control.
  function autoScroll(gsap, y, seconds, done) {
    var pos = { y: window.pageYOffset }, tween = null;
    function cancel() {
      if (!tween) return;
      tween.kill(); tween = null;
      USER_INPUT.forEach(function (t) { window.removeEventListener(t, cancel, true); });
      done();
    }
    USER_INPUT.forEach(function (t) { window.addEventListener(t, cancel, true); });
    tween = gsap.to(pos, {
      y: y, duration: seconds, ease: 'none',
      onUpdate: function () { window.scrollTo(0, pos.y); },
      onComplete: function () { tween = { kill: function () {} }; cancel(); }
    });
  }

  function init(section, gsap) {
    var c = setup(section);
    if (!c) return log('markup incomplete');
    var media = c.media.length === 5 ? c.media : [];
    var K = KEYFRAMES, last = K.length - 1;

    // The camera scales one <g> holding the circle and dots; step text and videos are HTML and only move.
    var world = c.svg.querySelector('g[data-cp-world]');
    if (!world) {
      world = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      world.setAttribute('data-cp-world', '');
      all(c.svg, ':scope > :not(defs)').forEach(function (n) { world.appendChild(n); });
      c.svg.appendChild(world);
    }
    // Line thickness on screen: the frames' stroke while zoomed, the static layout's in the whole view.
    var strokes = all(c.svg, '[data-cp="circle-track"], [data-cp="circle-progress"]').map(function (p) {
      var gm = p.parentNode.transform.baseVal.consolidate(), gs = gm ? (gm.matrix.a + gm.matrix.d) / 2 : 1;
      return { el: p, gs: gs, whole: (+p.getAttribute('stroke-width') || 1) * gs };
    });
    gsap.set(c.svg, { overflow: 'visible' });
    gsap.set(section, { overflowX: 'clip' });
    media.forEach(function (el) { gsap.set(el, { width: MODE.media.w, height: MODE.media.h, left: 0, top: 0 }); });
    var base = c.steps.map(function (s) { return { x: s.offsetLeft, y: s.offsetTop }; });

    // World transform for a keyframe: maps the page's circle box onto the frame's circle box.
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
      var v = el.querySelector('video[data-cp="circle-video"]');
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
      // Mask: [centreX, centreY, width, height, rotation] on screen → circle coordinates.
      var mk = a.mask.map(function (v, q) { return lerp(v, b.mask[q], f); });
      var lx = ((mk[0] - tx) / s - pm.e) / pm.a, ly = ((mk[1] - ty) / s - pm.f) / pm.d;
      ellipse.setAttribute('rx', mk[2] / 2 / (s * pm.a));
      ellipse.setAttribute('ry', mk[3] / 2 / (s * pm.d));
      ellipse.setAttribute('transform', 'translate(' + lx + ' ' + ly + ') rotate(' + mk[4] + ')');
    }

    // Pin so the stage sits where Figma puts it, with the Figma frame centred on the screen's real
    // height (as the prototype viewer does); never so low that the whole circle doesn't fit.
    var stageInSection = c.stage.getBoundingClientRect().top - section.getBoundingClientRect().top;
    function pinTop() {
      var vh = window.innerHeight;
      var top = Math.max(0, Math.min(MODE.stageTop + (vh - MODE.frameHeight) / 2, vh - c.stage.offsetHeight - 10));
      return Math.round(top - stageInSection);
    }

    // After the whole circle (prototype 1:9955 → 1:10538 → 1:10871): the circle fades out as the next
    // section (testimonials) slides in from the right; then the testimonials slide out left and the
    // section after them (the footer) fades in where they were. Both are pulled up next to the stage,
    // measured now from the natural layout, before pinning.
    var o = MODE.tail;
    var next = section.nextElementSibling;
    var after = next && next.parentNode ? next.parentNode.nextElementSibling : null;
    var afterHeading = after ? after.querySelector('h1, h2, h3') : null;
    if (!afterHeading) after = null;
    var stageTopInSection = c.stage.offsetTop;
    var nextMargin = 0, afterMargin = 0, cards = [];
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

    // The circle part (01 → 05 → whole) follows the scroll, smoothed like a 0.6s scrub; each step's
    // travel uses the prototype's ease-out.
    var units = HOLD * 6 + MODE.travel * 4 + MODE.zoomOut;
    var tl = gsap.timeline({ paused: true, onUpdate: render });
    tl.to({}, { duration: HOLD });
    for (var n = 1; n <= last; n++) {
      tl.to(state, { p: n, duration: n === last ? MODE.zoomOut : MODE.travel, ease: figmaEaseOut });
      tl.to({}, { duration: HOLD });
    }

    // Then, like the prototype's clicks, one scroll step each: testimonials in (0.6s), form (0.6s).
    // Each step plays its whole transition on time; scrolling back plays it in reverse.
    var steps = !next ? 0 : after ? 2 : 1;
    var stepPx = function () { return window.innerHeight * o.scrollPerStep; };
    var circlePx = function () { return window.innerHeight * SCROLL_PER_UNIT * units; };
    var stage = c.stage, tailStep = 0, level = [], nextIn = 0, nextOut = 0;

    if (next) {
      // Card row extents in the natural layout, so the slides start and end just off screen at any
      // screen width (Figma 1440: testimonials start at 1460, leave to −1760 + 1750 = −10).
      var cardsLeft = Infinity, cardsRight = -Infinity;
      cards.forEach(function (el) { var r = el.getBoundingClientRect(); cardsLeft = Math.min(cardsLeft, r.left); cardsRight = Math.max(cardsRight, r.right); });
      if (!cards.length) { cardsLeft = 0; cardsRight = window.innerWidth; }
      nextIn = window.innerWidth + o.offscreenGap - cardsLeft;                  // testimonials: from right
      nextOut = cardsRight + o.offscreenGap;                                    // testimonials: out left
      gsap.set(section.parentNode, { overflowX: 'clip' });
      gsap.set(next, { marginTop: nextMargin, x: nextIn, autoAlpha: 0, position: 'relative', zIndex: 1 });
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
      gsap.to(stage, Object.assign({ autoAlpha: s === 0 ? 1 : 0 }, tw));
      if (s === 0) gsap.to(next, Object.assign({ x: nextIn, onComplete: function () { gsap.set(next, { autoAlpha: 0 }); } }, tw));
      else { gsap.set(next, { autoAlpha: 1 }); gsap.to(next, Object.assign({ x: s === 1 ? 0 : -nextOut }, tw)); }
      if (after) gsap.to(after, Object.assign({ autoAlpha: s === 2 ? 1 : 0 }, tw));
      tailStep = s;
    }

    var pin = window.ScrollTrigger.create({
      trigger: section,
      start: function () { return 'top ' + pinTop() + 'px'; },
      end: function () { return '+=' + Math.round(circlePx() + steps * stepPx()); },
      pin: true,
      invalidateOnRefresh: true,
      onRefresh: function (self) { update(self, true); },
      onUpdate: function (self) { update(self, false); }
    });

    // Step videos play once; when one ends and the visitor hasn't scrolled, scroll on to the next
    // step (01 → … → 05 → whole circle) at the prototype's own pace.
    var holdTime = function (k) { return k < last ? HOLD / 2 + k * (HOLD + MODE.travel) : units - HOLD / 2; };
    var auto = null;
    videos.forEach(function (v, k) {
      if (!v) return;
      v.loop = false;
      v.addEventListener('ended', function () {
        if (auto || !pin.isActive || playing !== k || Math.abs(state.p - k) > 0.02) return;
        var to = k + 1;
        auto = true;
        autoScroll(gsap, pin.start + (holdTime(to) / units) * circlePx(), to === last ? MODE.zoomOut : MODE.travel,
          function () { auto = null; });
      });
    });

    function update(self, instant) {
      var into = self.scroll() - self.start, span = circlePx();
      var prog = Math.max(0, Math.min(1, into / span));
      if (instant) tl.progress(prog);
      else gsap.to(tl, { progress: prog, duration: 0.6, ease: 'power3.out', overwrite: true });
      if (steps) {
        // Content after the section stays exactly where it will be when the pin ends.
        gsap.set(level, { y: Math.min(0, Math.max(self.start - self.end, self.scroll() - self.end)) });
        // Each step starts as soon as its slice of scroll is entered.
        var s = into <= span + 1 ? 0 : Math.min(steps, 1 + Math.floor((into - span) / stepPx() + 0.0001));
        if (instant) { tailStep = -1; }
        goToTail(s);
      }
    }
    render();
  }

  // Whole circle, still: the layout as published, with the reveal disc from the markup.
  function showFinal(section) {
    var c = setup(section);
    if (c) clipEllipse(c);
  }

  function boot() {
    var sections = document.querySelectorAll('[data-cp="circle"]');
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
    if (!document.querySelector('[data-cp="circle"]')) return;
    var tries = 0;
    (function check() {
      if ((window.gsap && window.ScrollTrigger) || ++tries > 50) return boot();
      setTimeout(check, 100);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenReady);
  else whenReady();
})();

/*
 * Infinity sequence — "How it works" on the CRO page.
 *
 * Figma prototype (CRO flow from 1:9238). Desktop frames:
 *   1:10189 → 1:10069  zoomed view slides up into place (0.8s ease-out) — here: the scroll-in
 *   1:10069 → 1:8432 → 1:8493 → 1:8554 → 1:8615   steps 01→05, Smart Animate 1.5s linear each
 *   1:8615  → 1:8676   zoom out to the whole infinity, 0.8s linear
 *   1:8676  → 1:10281  next scroll: infinity out left, testimonials in from the right, 1s ease-out
 *   1:10281 → 1:10671  next scroll: testimonials out left, footer (form) fades in, 0.6s ease-out
 * Mobile frames: 1:588 (01) → 1:674 → 1:731 → 1:788 → 1:845 (05) → 1:902 (whole), 0.6s ease-out each.
 * Each frame waits for a click in the prototype; on the site each step holds while you scroll.
 *
 * The zoomed frames are not a scaled copy of the whole infinity — the designer placed dots, text and
 * videos per frame — so, like Smart Animate, this interpolates every element between the frames'
 * recorded positions (KEYFRAMES below, read from the Figma file). Dots also pulse (65 ↔ 53px, 0.8s).
 *
 * Markup (Webflow):
 *   [data-cp="infinity"]                 the section
 *     .cro-how_component                 the stage (1233×707 desktop, 371×567 mobile)
 *       svg[data-cp="infinity-svg"]      one per breakpoint; the visible one is used
 *         path[data-cp="infinity-track"] / path[data-cp="infinity-progress"] / g[data-cp="infinity-dot"] ×5
 *       [data-cp="infinity-step"] ×5     step text, 01→05
 *       [data-cp="infinity-media"] ×5    video slot per step, 01→05 (hidden until the script shows it),
 *         holding video[data-cp="infinity-video"][data-media="desktop"|"mobile"] — the one for the
 *         current breakpoint is shown; only the current step's video plays
 *
 * Reduced motion: whole infinity, fully drawn, no pinning, no videos. Needs GSAP + ScrollTrigger.
 */
(function () {
  'use strict';

  /*
   * Keyframes, one per prototype frame, in stage pixels (frame position minus the stage's position
   * in the whole-infinity frame). The last keyframe is the whole infinity = the static layout.
   *   path:  [x, y, w, h] of the infinity's bounding box
   *   dots:  [centreX, centreY, diameter] per step
   *   text:  [x, y, width] per step
   *   media: [x, y] per step (video slot); none in the whole view, so they fade out
   * Desktop zoomed frames carry +32px x: the prototype's stage is at x 175, DEV READY's (the page) at 143.
   */
  var KEYFRAMES = {
    desktop: [
      { path: [-2412, 150, 4057, 1575], dots: [[776.5, 154.5, 65], [1537.5, 1336.5, 65], [640.5, 1696.5, 65], [-849.5, 494.5, 65], [-2342.5, 1265.5, 65]], text: [[760, 230, 361], [1608, 1320, 634], [624, 1464, 396], [-865, 286, 361], [-2198, 1241, 430]], media: [[-165, 96], [1211, 771], [-303, 1220], [-1782, 82], [-2342, 1428]] },
      { path: [-3482, -586, 4057, 1575], dots: [[-293.5, -581.5, 65], [467.5, 600.5, 65], [-429.5, 960.5, 65], [-1919.5, -241.5, 65], [-3412.5, 529.5, 65]], text: [[-310, -506, 361], [538, 584, 634], [-446, 728, 396], [-1935, -450, 361], [-3268, 505, 430]], media: [[-1235, -640], [141, 35], [-1373, 484], [-2852, -654], [-3412, 692]] },
      { path: [-2264, -946, 4057, 1575], dots: [[924.5, -941.5, 65], [1685.5, 240.5, 65], [788.5, 600.5, 65], [-701.5, -601.5, 65], [-2194.5, 169.5, 65]], text: [[908, -866, 361], [1756, 224, 634], [772, 368, 396], [-717, -810, 361], [-2050, 145, 430]], media: [[-17, -1000], [1359, -325], [-155, 124], [-1634, -1014], [-2194, 332]] },
      { path: [-722, 129.2, 4057, 1575], dots: [[2466.5, 133.7, 65], [3227.5, 1315.7, 65], [2330.5, 1675.7, 65], [840.5, 473.7, 65], [-652.5, 1244.7, 65]], text: [[2450, 209.2, 361], [3298, 1299.2, 634], [2314, 1443.2, 396], [825, 265.2, 361], [-508, 1220.2, 430]], media: [[1525, 75.2], [2901, 750.2], [1387, 1199.2], [-92, 61.2], [-652, 1407.2]] },
      { path: [176, -975.8, 4057, 1575], dots: [[3364.5, -971.3, 65], [4125.5, 210.7, 65], [3228.5, 570.7, 65], [1738.5, -631.3, 65], [245.5, 139.7, 65]], text: [[3348, -895.8, 361], [4196, 194.2, 634], [3212, 338.2, 396], [1723, -839.8, 361], [390, 115.2, 430]], media: [[2423, -1029.8], [3799, -354.8], [2285, 94.2], [806, -1043.8], [246, 302.2]] },
      { path: [124.3771, 211.0109, 750.967, 291.539], dots: [[704.5, 211.5, 35], [874.5, 326.5, 35], [600.5, 447.5, 35], [233.5, 216.5, 35], [170.5, 464.5, 35]], text: [[632, 0, 450], [911, 294, 322], [573, 511, 324], [13, 41, 305], [0, 474, 280]], media: null }
    ],
    mobile: [
      { path: [-1346, 90, 1640, 644], dots: [[21, 94, 40], [40, 726, 40], [-383, 550, 40], [-1180, 127, 40], [-1110, 720, 40]], text: [[19, -50, 332], [21, 784, 284], [-503, 618, 240], [-1200, -24, 286], [-1180, 761, 280]], media: [[82, 84], [22, 925], [-504, 755], [-1201, -655], [-1181, 877]] },
      { path: [-1206, -700, 1640, 644], dots: [[161, -696, 40], [180, -64, 40], [-243, -240, 40], [-1040, -663, 40], [-970, -70, 40]], text: [[159, -840, 332], [11, -35, 350], [-363, -172, 240], [-1060, -814, 286], [-1040, -29, 280]], media: [[222, -746], [37, 84], [-364, -35], [-1061, -1445], [-1041, 87]] },
      { path: [-756, -560, 1640, 644], dots: [[611, -556, 40], [630, 76, 40], [207, -100, 40], [-590, -523, 40], [-520, 70, 40]], text: [[609, -700, 332], [461, 105, 350], [36, -57, 240], [-610, -674, 286], [-590, 111, 280]], media: [[672, -606], [487, 223], [35, 81], [-611, -1305], [-591, 227]] },
      { path: [-116, 670, 1640, 644], dots: [[1251, 674, 40], [1270, 1306, 40], [847, 1130, 40], [260, 677, 40], [120, 1300, 40]], text: [[1249, 530, 332], [1101, 1335, 350], [676, 1173, 240], [30, 556, 286], [50, 1341, 280]], media: [[1312, 624], [1127, 1453], [675, 1310], [29, -74], [49, 1457]] },
      { path: [-254.1, -690, 1640, 644], dots: [[1112.9, -686, 40], [1131.9, -54, 40], [708.9, -230, 40], [121.9, -683, 40], [61.9, -50, 40]], text: [[1110.9, -830, 332], [962.9, -25, 350], [537.9, -187, 240], [-108.1, -804, 286], [5.9, -20, 280]], media: [[1173.9, -736], [988.9, 93], [536.9, -50], [-109.1, -1435], [5.9, 84]] },
      { path: [14, 191, 334, 131], dots: [[284.5, 190.5, 21], [338.5, 289.5, 21], [206.5, 280.5, 21], [39.5, 204.5, 21], [75.5, 321.5, 21]], text: [[153, 3, 211], [251, 343, 120], [121, 331, 115], [4, 0, 123], [0, 345, 103]], media: null }
    ]
  };
  // Reveal mask per keyframe (the prototype's "Mask group" ellipse): [centreX, centreY, w, h, rotation°].
  var MASKS = {
    desktop: [[774.5, 154.5, 27, 27, 0], [164.5, -38.5, 1417, 1417, 0], [1347.5, 5.5, 1631, 1631, 0],
      [1982, 1172.2, 3008.1, 804.9, 39.5], [1756.6, -249.4, 5126.9, 1766.9, 14], [499, 359, 681.2, 781.9, 88.8]],
    mobile: [[-525.2, 414.8, 1489.6, 1709.7, 88.8], [-385.2, -375.2, 1489.6, 1709.7, 88.8], [64.8, -235.2, 1489.6, 1709.7, 88.8],
      [704.8, 994.8, 1489.6, 1709.7, 88.8], [566.6, -365.2, 1489.6, 1709.7, 88.8], [181.2, 257.1, 303.2, 348, 88.8]]
  };
  Object.keys(MASKS).forEach(function (k) { MASKS[k].forEach(function (m, i) { KEYFRAMES[k][i].mask = m; }); });
  var DESKTOP_X_SHIFT = 32;

  var MODES = {
    desktop: {
      name: 'desktop', query: '(min-width: 768px)', keyframes: KEYFRAMES.desktop,
      media: { w: 870, h: 489 },                       // video slot (Figma 870×489)
      strokeZoomed: 15,                                // line thickness while zoomed (6 in the whole view)
      stageTop: 203, frameHeight: 1024,                // stage top in the 1440×1024 frame 1:8676
      travel: 1.5, travelEase: 'none',                 // 01→05
      zoomOut: 0.8, zoomOutEase: 'none',               // 05 → whole
      // 1:8676 → 1:10281 (1s ease-out): infinity −1430px, testimonials −1380px (1460 → 80),
      // cards 96px below the stage top (299 vs 203). Then 1:10281 → 1:10671 (0.6s ease-out):
      // testimonials −1850px, footer fades in with its heading 23px above the stage top (180 vs 203).
      // Distances are measured on the page so the slides start/end just off screen at any width
      // (Figma at 1440: 1460 → 80, then 80 → −1770; the infinity ends at −22 past the left edge).
      slideOut: {
        cardsBelowStage: 96, duration: 1, ease: figmaEaseOut, offscreenGap: 20, scrollPerStep: 0.6,
        exit: { duration: 0.6, headingBelowStage: -23 }
      }
    },
    mobile: {
      name: 'mobile', query: '(max-width: 767px)', keyframes: KEYFRAMES.mobile,
      media: { w: 275, h: 598 },                       // portrait video slot (Figma 275×598)
      strokeZoomed: 10,
      stageTop: 139, frameHeight: 844,                 // frame 1:902 (390×844)
      // Stepped, like the prototype: each step owns a slice of the scroll, and entering it plays
      // the frame's own transition (Smart Animate 0.6s ease-out) instead of following the finger.
      stepped: { duration: 0.6, scrollPerStep: 0.5 },
      slideOut: null
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

  function log(msg, e) { try { console.debug('[infinity] ' + msg, e || ''); } catch (_) {} }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function visibleSvg(section) {
    var svgs = all(section, 'svg[data-cp="infinity-svg"]');
    for (var i = 0; i < svgs.length; i++) if (svgs[i].getBoundingClientRect().width > 0) return svgs[i];
    return null;
  }

  function setup(section) {
    var svg = visibleSvg(section);
    var stage = section.querySelector('.cro-how_component') || (svg && svg.parentNode.parentNode);
    var steps = all(section, '[data-cp="infinity-step"]');
    if (!svg || !stage || steps.length !== 5) return null;
    var progress = svg.querySelector('[data-cp="infinity-progress"]');
    var dots = all(svg, '[data-cp="infinity-dot"]');
    if (!progress || dots.length !== 5) return null;
    var m = progress.parentNode.transform.baseVal.consolidate();
    var pm = m ? m.matrix : { a: 1, d: 1, e: 0, f: 0 }, bb = progress.getBBox();
    progress.setAttribute('opacity', '1');   // the dark path; the reveal mask decides how much shows
    return {
      svg: svg, stage: stage, steps: steps, dots: dots, progress: progress, pathMatrix: pm,
      // The path's real box in stage pixels (what the camera maps onto each frame's path box).
      pathBox: [pm.e + pm.a * bb.x, pm.f + pm.d * bb.y, pm.a * bb.width, pm.d * bb.height],
      media: all(section, '[data-cp="infinity-media"]'),
      centers: dots.map(function (d) {
        var c = d.querySelector('circle');
        return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') };
      })
    };
  }

  function init(section, gsap, mode) {
    var c = setup(section);
    if (!c) return log('markup incomplete');
    var media = c.media.length === 5 ? c.media : [];

    // Keyframes: desktop zoomed frames shift onto the prototype's screen positions.
    var K = mode.keyframes.map(function (k, i) {
      if (mode !== MODES.desktop || i === mode.keyframes.length - 1) return k;
      var sx = function (a) { var b = a.slice(); b[0] += DESKTOP_X_SHIFT; return b; };
      return { path: sx(k.path), dots: k.dots.map(sx), text: k.text.map(sx), media: k.media && k.media.map(sx), mask: sx(k.mask) };
    });
    var last = K.length - 1;

    // The camera scales one <g> holding the path and dots; step text and videos are HTML and only move.
    var world = c.svg.querySelector('g[data-cp-world]');
    if (!world) {
      world = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      world.setAttribute('data-cp-world', '');
      while (c.svg.firstChild) world.appendChild(c.svg.firstChild);
      c.svg.appendChild(world);
    }
    // Line thickness on screen: the frames' stroke while zoomed, the static layout's in the whole view.
    // Drawn without vector-effect: non-scaling-stroke — with it, Chrome measures the progress dash in
    // screen pixels and the dark part lands in the wrong place.
    var strokes = all(c.svg, 'path').map(function (p) {
      var gm = p.parentNode.transform.baseVal.consolidate(), gs = gm ? (gm.matrix.a + gm.matrix.d) / 2 : 1;
      var w = +p.getAttribute('stroke-width') || 1, nonScaling = p.getAttribute('vector-effect') === 'non-scaling-stroke';
      p.removeAttribute('vector-effect');
      return { el: p, gs: gs, whole: nonScaling ? w : w * gs };
    });
    gsap.set(c.svg, { overflow: 'visible' });
    gsap.set(section, { overflowX: 'clip' });
    media.forEach(function (el) { gsap.set(el, { width: mode.media.w, height: mode.media.h, left: 0, top: 0 }); });
    var base = c.steps.map(function (s) { return { x: s.offsetLeft, y: s.offsetTop }; });

    // World transform for a keyframe: maps the page's path box onto the frame's path box.
    var box = c.pathBox;
    function camera(k) {
      var s = k.path[2] / box[2];
      return { s: s, tx: k.path[0] - s * box[0], ty: k.path[1] - s * box[1] };
    }
    // The dark path shows only inside an ellipse, exactly like the prototype's "Mask group": it grows
    // and turns frame by frame. The clip lives in the path's own coordinates (inside its <g>).
    var clipId = 'cp-infinity-clip-' + Math.random().toString(36).slice(2, 8);
    var clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    var ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    clip.setAttribute('id', clipId);
    clip.appendChild(ellipse);
    c.progress.parentNode.insertBefore(clip, c.progress);
    c.progress.setAttribute('clip-path', 'url(#' + clipId + ')');
    var pm = c.pathMatrix;

    // Halo pulse (prototype: dot variant Default ↔ Variant2, 0.8s ease-out, looping).
    c.dots.forEach(function (d) {
      var halo = d.querySelector('circle');
      gsap.to(halo, { scale: PULSE.ratio, svgOrigin: halo.getAttribute('cx') + ' ' + halo.getAttribute('cy'),
        duration: PULSE.duration, ease: PULSE.ease, yoyo: true, repeat: -1 });
    });

    // Each slot holds a desktop and a mobile cut; show this breakpoint's, hide (and stop) the other.
    var videos = media.map(function (el) {
      var mine = null;
      all(el, 'video[data-cp="infinity-video"]').forEach(function (v) {
        var match = (v.getAttribute('data-media') || mode.name) === mode.name;
        if (match && !mine) mine = v;
        else { try { v.pause(); } catch (_) {} }
        gsap.set(v, { display: match && v === mine ? 'block' : 'none' });
      });
      if (mine && mine.preload === 'none') mine.preload = 'auto';
      return mine;
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
        var wa = i === last ? p.whole : mode.strokeZoomed, wb = i + 1 === last ? p.whole : mode.strokeZoomed;
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
    // height (as the prototype viewer does); never so low that the whole infinity doesn't fit.
    var stageInSection = c.stage.getBoundingClientRect().top - section.getBoundingClientRect().top;
    function pinTop() {
      var vh = window.innerHeight;
      var top = Math.max(0, Math.min(mode.stageTop + (vh - mode.frameHeight) / 2, vh - c.stage.offsetHeight - 10));
      return Math.round(top - stageInSection);
    }

    if (mode.stepped) {
      // One slice of scroll per frame (01…05, whole). Crossing into a slice plays the prototype's
      // transition to that frame; fast flicks go straight to the frame that was reached.
      var zones = last + 1, current = 0, st = mode.stepped;
      window.ScrollTrigger.create({
        trigger: section,
        start: function () { return 'top ' + pinTop() + 'px'; },
        end: function () { return '+=' + Math.round(window.innerHeight * st.scrollPerStep * zones); },
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var target = Math.min(last, Math.floor(self.progress * zones));
          if (target === current) return;
          current = target;
          gsap.to(state, { p: target, duration: st.duration, ease: figmaEaseOut, overwrite: true, onUpdate: render });
        }
      });
      render();
      return;
    }

    // After the whole infinity (prototype 1:8676 → 1:10281 → 1:10671): the infinity slides out left
    // as the next section (testimonials) slides in from the right; then the testimonials slide out
    // left too and the section after them (the footer) fades in where they were. Both sections are
    // pulled up over the infinity's place, measured now from the natural layout, before pinning.
    var o = mode.slideOut;
    var next = o ? section.nextElementSibling : null;
    var after = next && next.parentNode ? next.parentNode.nextElementSibling : null;
    var afterHeading = after ? after.querySelector('h1, h2, h3') : null;
    if (!afterHeading) after = null;
    // When the pin ends, content after the section sits at (its offset from the section top) +
    // (section top on screen), and the stage top is stageTopInSection below the section top.
    // So each offset is chosen to put the content where Figma has it relative to the stage.
    var stageTopInSection = c.stage.offsetTop;
    var nextMargin = 0, afterMargin = 0;
    if (next) {
      var docTop = function (el) { return el.getBoundingClientRect().top + window.pageYOffset; };
      var margin = function (el) { return parseFloat(getComputedStyle(el).marginTop) || 0; };
      var S = docTop(section);
      // Testimonial cards (top of the next section's padding) land o.cardsBelowStage below the stage.
      var nextPad = parseFloat(getComputedStyle(next).paddingTop) || 0;
      var dNext = (stageTopInSection + o.cardsBelowStage - nextPad) - (docTop(next) - S);
      nextMargin = margin(next) + dNext;
      if (after) {
        // The footer heading lands o.exit.headingBelowStage below the stage (it moves by dNext too).
        var headingInAfter = docTop(afterHeading) - docTop(after);
        var dAfter = (stageTopInSection + o.exit.headingBelowStage - headingInAfter) - (docTop(after) + dNext - S);
        afterMargin = margin(after) + dAfter;
      }
    }

    // The infinity part (01 → 05 → whole) follows the scroll, smoothed like a 0.6s scrub.
    var units = HOLD * 6 + mode.travel * 4 + mode.zoomOut;
    var tl = gsap.timeline({ paused: true, onUpdate: render });
    tl.to({}, { duration: HOLD });
    for (var n = 1; n <= last; n++) {
      var zoomOut = n === last;
      tl.to(state, { p: n, duration: zoomOut ? mode.zoomOut : mode.travel, ease: zoomOut ? mode.zoomOutEase : mode.travelEase });
      tl.to({}, { duration: HOLD });
    }

    // Then, like the prototype's clicks, one scroll step each: testimonials in (1s), form (0.6s).
    // Each step plays its whole transition on time; scrolling back plays it in reverse.
    var steps = !next ? 0 : after ? 2 : 1;
    var stepPx = function () { return window.innerHeight * o.scrollPerStep; };
    var infinityPx = function () { return window.innerHeight * SCROLL_PER_UNIT * units; };
    var stage = c.stage, tailStep = 0, level = [];
    var stageOut = 0, nextIn = 0, nextOut = 0;

    if (next) {
      // Card row extents in the natural layout, so the slides start and end just off screen at
      // any screen width (Figma 1440: testimonials start at 1460, leave to −1770 + 1750 = −20).
      var cards = all(next, '*').filter(function (el) { var r = el.getBoundingClientRect(); return r.width > 300 && r.width < 900 && r.height > 200; });
      var cardsLeft = Infinity, cardsRight = -Infinity;
      cards.forEach(function (el) { var r = el.getBoundingClientRect(); cardsLeft = Math.min(cardsLeft, r.left); cardsRight = Math.max(cardsRight, r.right); });
      if (!cards.length) { cardsLeft = 0; cardsRight = window.innerWidth; }
      stageOut = stage.getBoundingClientRect().right + o.offscreenGap;           // infinity: left edge
      nextIn = window.innerWidth + o.offscreenGap - cardsLeft;                  // testimonials: from right
      nextOut = cardsRight + o.offscreenGap;                                    // testimonials: out left

      gsap.set(section.parentNode, { overflowX: 'clip' });
      gsap.set(next, { marginTop: nextMargin, x: nextIn, autoAlpha: 0, position: 'relative', zIndex: 1 });
      level.push(next);
      if (after) {
        if (after.parentNode) gsap.set(after.parentNode, { overflowX: 'clip' });
        gsap.set(after, { marginTop: afterMargin, autoAlpha: 0, position: 'relative', zIndex: 1 });
        level.push(after);
      }
    }

    function goToTail(s) {
      if (s === tailStep) return;
      var dur = (s === 2 && tailStep === 1) || (s === 1 && tailStep === 2) ? o.exit.duration : o.duration;
      var tw = { duration: dur, ease: o.ease, overwrite: 'auto' };
      gsap.to(stage, Object.assign({ x: s === 0 ? 0 : -stageOut }, tw));
      if (s === 0) gsap.to(next, Object.assign({ x: nextIn, onComplete: function () { gsap.set(next, { autoAlpha: 0 }); } }, tw));
      else { gsap.set(next, { autoAlpha: 1 }); gsap.to(next, Object.assign({ x: s === 1 ? 0 : -nextOut }, tw)); }
      if (after) gsap.to(after, Object.assign({ autoAlpha: s === 2 ? 1 : 0 }, tw));
      tailStep = s;
    }

    window.ScrollTrigger.create({
      trigger: section,
      start: function () { return 'top ' + pinTop() + 'px'; },
      end: function () { return '+=' + Math.round(infinityPx() + steps * stepPx()); },
      pin: true,
      invalidateOnRefresh: true,
      onRefresh: function (self) { update(self, true); },
      onUpdate: function (self) { update(self, false); }
    });

    function update(self, instant) {
      var into = self.scroll() - self.start, inf = infinityPx();
      var prog = Math.max(0, Math.min(1, into / inf));
      if (instant) tl.progress(prog);
      else gsap.to(tl, { progress: prog, duration: 0.6, ease: 'power3.out', overwrite: true });
      if (steps) {
        // Content after the section stays exactly where it will be when the pin ends.
        gsap.set(level, { y: Math.min(0, Math.max(self.start - self.end, self.scroll() - self.end)) });
        // Each step starts as soon as its slice of scroll is entered.
        var s = into <= inf + 1 ? 0 : Math.min(steps, 1 + Math.floor((into - inf) / stepPx() + 0.0001));
        if (instant) { tailStep = -1; }
        goToTail(s);
      }
    }
    render();
  }

  function showFinal(section) {
    setup(section);   // shows the whole dark path
  }

  function boot() {
    var sections = document.querySelectorAll('[data-cp="infinity"]');
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
          var mm = gsap.matchMedia();
          Object.keys(MODES).forEach(function (k) {
            mm.add(MODES[k].query, function () {
              try { init(s, gsap, MODES[k]); } catch (e) { log(k + ' init failed', e); showFinal(s); }
            });
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
    if (!document.querySelector('[data-cp="infinity"]')) return;
    var tries = 0;
    (function check() {
      if ((window.gsap && window.ScrollTrigger) || ++tries > 50) return boot();
      setTimeout(check, 100);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenReady);
  else whenReady();
})();

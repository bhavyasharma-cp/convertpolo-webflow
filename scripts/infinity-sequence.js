/*
 * Infinity sequence — "How it works" on the CRO page.
 * Figma: desktop 117:4421 (static) and prototype frames 1:10069 → 1:8432 → 1:8493 → 1:8554
 *        → 1:8615 → 1:8676 (camera along the path, 1.5s linear per step, 0.8s zoom-out).
 *        Mobile 123:6388 (no zoom in the prototype).
 *
 * Markup (Webflow):
 *   [data-cp="infinity"]                 the section (one per instance)
 *     .cro-how_component                 the 1233×707 stage (371×567 on mobile)
 *       svg[data-cp="infinity-svg"]      one per breakpoint; the visible one is used
 *         path[data-cp="infinity-track"]     grey path
 *         path[data-cp="infinity-progress"]  dark path, drawn as you scroll
 *         g[data-cp="infinity-dot"] ×5       dots, in path order 01→05
 *       [data-cp="infinity-step"] ×5     step text blocks, 01→05
 *
 * Desktop: the section pins and scroll scrubs a camera move — zoomed in on step 01, travel
 * 02→05 drawing the dark path, then zoom out to the whole infinity. Step text keeps its size;
 * only the path and dots zoom. Mobile: no zoom; the path draws and the steps light up in turn.
 * Reduced motion: final state (whole path drawn, every step visible), no pinning.
 *
 * Needs GSAP + ScrollTrigger (loaded once, site-wide).
 */
(function () {
  'use strict';

  var DESKTOP = '(min-width: 768px)';
  var ZOOM = 5.402;          // Figma: path 751px → 4057px wide when zoomed
  var DOT_ZOOM = 65 / 35;    // dots grow 35px → 65px, not by the full zoom

  // Where each dot sits (stage coordinates) while the camera is on it, from the prototype frames.
  var CAMERA = [
    { x: 776.5, y: 154.5 },  // 01  frame 1:10069
    { x: 467.5, y: 600.5 },  // 02  frame 1:8432
    { x: 788.5, y: 600.5 },  // 03  frame 1:8493
    { x: 840.5, y: 473.5 },  // 04  frame 1:8554
    { x: 245.5, y: 139.5 }   // 05  frame 1:8615
  ];
  // Step text position relative to its dot centre while zoomed (prototype frames).
  var STEP_ZOOM_OFFSET = [
    { x: -16.5, y: 75.5 }, { x: 70.5, y: -16.5 }, { x: -16.5, y: -232.5 },
    { x: -15.5, y: -208.5 }, { x: 144.5, y: -24.5 }
  ];

  function log(msg, e) { try { console.debug('[infinity] ' + msg, e || ''); } catch (_) {} }

  function visibleSvg(section) {
    var svgs = section.querySelectorAll('svg[data-cp="infinity-svg"]');
    for (var i = 0; i < svgs.length; i++) {
      if (svgs[i].getBoundingClientRect().width > 0) return svgs[i];
    }
    return null;
  }

  // Fraction of the path length closest to a point (path-local coordinates).
  function lengthAt(path, x, y) {
    var total = path.getTotalLength(), best = 0, bestD = Infinity, steps = 400;
    for (var i = 0; i <= steps; i++) {
      var l = (total * i) / steps, p = path.getPointAtLength(l);
      var d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < bestD) { bestD = d; best = l; }
    }
    return best;
  }

  function dotCenter(dot) {
    var c = dot.querySelector('circle');
    return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') };
  }

  function setup(section) {
    var svg = visibleSvg(section);
    var stage = section.querySelector('.cro-how_component');
    var steps = Array.prototype.slice.call(section.querySelectorAll('[data-cp="infinity-step"]'));
    if (!svg || !stage || steps.length !== 5) return null;
    var track = svg.querySelector('[data-cp="infinity-track"]');
    var progress = svg.querySelector('[data-cp="infinity-progress"]');
    var dots = Array.prototype.slice.call(svg.querySelectorAll('[data-cp="infinity-dot"]'));
    if (!track || !progress || dots.length !== 5) return null;

    var total = progress.getTotalLength();
    var group = progress.parentNode;                       // <g transform="translate(..)">
    var m = group.transform.baseVal.consolidate();
    var ox = m ? m.matrix.e : 0, oy = m ? m.matrix.f : 0;
    var sx = m ? m.matrix.a : 1, sy = m ? m.matrix.d : 1;
    var centers = dots.map(dotCenter);
    // Path length (from the path start) at each dot, made increasing in step order.
    var lens = centers.map(function (c) { return lengthAt(progress, (c.x - ox) / sx, (c.y - oy) / sy); });
    for (var k = 1; k < lens.length; k++) if (lens[k] < lens[k - 1]) lens[k] += total;
    var start = lens[0];

    progress.setAttribute('opacity', '1');
    function draw(len) {
      // Draw from the 01 dot forwards. The dash pattern is exactly one path long, so the dash
      // wraps past the path's start point (which sits just after dot 01) instead of being cut off.
      var drawn = Math.max(0, Math.min(len - start, total));
      progress.style.strokeDasharray = drawn + ' ' + Math.max(total - drawn, 0.01);
      progress.style.strokeDashoffset = String(-start);
    }

    return { svg: svg, stage: stage, steps: steps, dots: dots, centers: centers, lens: lens, total: total, draw: draw, start: start };
  }

  function initDesktop(section, gsap) {
    var c = setup(section);
    if (!c) return log('desktop markup incomplete');

    // Everything the camera scales lives in one <g>; step text is HTML and only moves.
    var world = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    while (c.svg.firstChild) world.appendChild(c.svg.firstChild);
    c.svg.appendChild(world);
    c.svg.querySelectorAll('path').forEach(function (p) { p.setAttribute('vector-effect', 'non-scaling-stroke'); });

    var base = c.steps.map(function (s) { return { x: s.offsetLeft, y: s.offsetTop }; });
    var rel = base.map(function (b, i) { return { x: b.x - c.centers[i].x, y: b.y - c.centers[i].y }; });

    function cam(i) { return { tx: CAMERA[i].x - ZOOM * c.centers[i].x, ty: CAMERA[i].y - ZOOM * c.centers[i].y }; }
    var state = { s: ZOOM, tx: cam(0).tx, ty: cam(0).ty, len: c.lens[0] };

    function render() {
      var z = (state.s - 1) / (ZOOM - 1); // 1 = fully zoomed, 0 = whole infinity
      world.setAttribute('transform', 'translate(' + state.tx + ' ' + state.ty + ') scale(' + state.s + ')');
      var dotScale = (1 + (DOT_ZOOM - 1) * z) / state.s;
      c.dots.forEach(function (d, i) {
        var p = c.centers[i];
        d.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ') scale(' + dotScale + ') translate(' + -p.x + ' ' + -p.y + ')');
      });
      c.steps.forEach(function (s, i) {
        var p = c.centers[i];
        var off = { x: rel[i].x + (STEP_ZOOM_OFFSET[i].x - rel[i].x) * z, y: rel[i].y + (STEP_ZOOM_OFFSET[i].y - rel[i].y) * z };
        var x = state.s * p.x + state.tx + off.x - base[i].x;
        var y = state.s * p.y + state.ty + off.y - base[i].y;
        gsap.set(s, { x: x, y: y });
      });
      c.draw(state.len);
    }

    // The zoomed path is far larger than the stage: let it spill out. Clip sideways only — while
    // pinned, the space below the section is the (empty) pin spacer, so vertical spill is fine.
    c.svg.style.overflow = 'visible';
    section.style.overflowX = 'clip';
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * 4); },
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });
    for (var i = 1; i < 5; i++) {
      var t = cam(i);
      tl.to(state, { tx: t.tx, ty: t.ty, len: c.lens[i], duration: 1.5 });  // Figma: 1.5s linear per step
    }
    tl.to(state, { s: 1, tx: 0, ty: 0, len: c.start + c.total, duration: 0.8 }); // Figma: 0.8s linear zoom-out
    render();
    return tl;
  }

  function initMobile(section, gsap) {
    var c = setup(section);
    if (!c) return log('mobile markup incomplete');
    var state = { len: c.lens[0] };
    gsap.set(c.steps, { opacity: 0.3 });
    gsap.set(c.steps[0], { opacity: 1 });
    c.draw(state.len);
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: function () { c.draw(state.len); },
      scrollTrigger: { trigger: section, start: 'top 75%', end: 'bottom 35%', scrub: 0.6 }
    });
    for (var i = 1; i < 5; i++) {
      tl.to(state, { len: c.lens[i], duration: 1 });
      tl.to(c.steps[i], { opacity: 1, duration: 0.3 }, '<0.7');
    }
    tl.to(state, { len: c.start + c.total, duration: 0.6 });
    return tl;
  }

  function showFinal(section) {
    var c = setup(section);
    if (c) c.draw(c.start + c.total);
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
        (function (s) {
          gsap.matchMedia().add(DESKTOP, function () { initDesktop(s, gsap); });
          gsap.matchMedia().add('(max-width: 767px)', function () { initMobile(s, gsap); });
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

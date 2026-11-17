/*
 * Testimonial bar — the tick ruler under the testimonial cards (CRO / LPO / BBS).
 *
 * Figma draws it (desktop "Bar", mobile "Slider") as a ruler of light ticks with a taller dark
 * tick every fifth and the first one orange, and gives it no behaviour. Agreed with the client:
 * the tall ticks are the reviews.
 *
 *   - One tall tick per review card, with light ticks between, so the ruler keeps Figma's length
 *     and rhythm (6 reviews gives Figma's exact 26 ticks; fewer reviews space them further apart).
 *   - The review currently at the start of the row is the orange tick.
 *   - Clicking (or tapping) the bar scrolls the row to the nearest review's card. The tall ticks
 *     are also focusable, so Enter / Space does the same from a keyboard.
 *
 * The ticks are rebuilt from the number of cards, so editors add or remove a review and the bar
 * follows. A row with a single card hides the bar.
 *
 * Markup:
 *   [data-cp="testimonials"]        the scrolling card row; each child element is one card
 *   [data-cp="testimonial-bar"]     the bar, after the row; it holds a .cro-ticks container
 *
 * Only the ticks and the row's scrollLeft change; the pinned sequences that move the whole
 * section are untouched.
 */
(function () {
  'use strict';

  var BAR = '[data-cp="testimonial-bar"]';
  var LIST = '[data-cp="testimonials"]';
  var ACTIVE = 'is-active';
  var MAJOR = 'is-major';
  var FIGMA_TICKS = 26;   // Figma's ruler: 26 ticks
  var MIN_BETWEEN = 4;    // and at least 4 light ticks between two reviews, as in Figma

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function addStyles() {
    if (document.getElementById('cp-testimonial-bar-css')) return;
    var style = document.createElement('style');
    style.id = 'cp-testimonial-bar-css';
    style.textContent =
      BAR + '{cursor:pointer;-webkit-tap-highlight-color:transparent}' +
      BAR + ' i[role="button"]{outline:none}' +
      BAR + ' i[role="button"]:focus-visible{box-shadow:0 0 0 2px var(--_colors---brand--orange,#e55e25)}' +
      BAR + ' i{transition:' + (reduced() ? 'none' : 'background-color .3s cubic-bezier(0,0,.58,1),height .3s cubic-bezier(0,0,.58,1)') + '}';
    document.head.appendChild(style);
  }

  // The row the bar belongs to: the nearest [data-cp="testimonials"] before it, else the first
  // one in the same parent.
  function findList(bar) {
    for (var el = bar.previousElementSibling; el; el = el.previousElementSibling) {
      if (el.matches && el.matches(LIST)) return el;
      var inner = el.querySelector && el.querySelector(LIST);
      if (inner) return inner;
    }
    return bar.parentNode ? bar.parentNode.querySelector(LIST) : null;
  }

  function init(bar) {
    var list = findList(bar);
    if (!list) return;
    var cards = Array.prototype.slice.call(list.children).filter(function (c) {
      return c.nodeType === 1 && c.offsetWidth > 0;
    });
    var n = cards.length;
    if (n < 2) { bar.style.display = 'none'; return; }

    // ---- Rebuild the ruler: one tall tick per review --------------------------------------
    var holder = bar.querySelector('.cro-ticks') || bar;
    // As many ticks as fit inside the bar (its left padding kept as the right margin too),
    // measured from the tick width and gap the breakpoint actually uses.
    var sample = holder.querySelector('i');
    var tickW = sample ? sample.getBoundingClientRect().width || 2 : 2;
    var gap = parseFloat(getComputedStyle(holder).columnGap || getComputedStyle(holder).gap) || 5;
    var padL = parseFloat(getComputedStyle(bar).paddingLeft) || 0;
    var room = bar.clientWidth - 2 * padL;
    var fit = Math.max(n, Math.floor((room + gap) / (tickW + gap)));
    var between = Math.min(Math.round((FIGMA_TICKS - n) / (n - 1)), Math.floor((fit - n) / (n - 1)));
    between = Math.max(Math.min(MIN_BETWEEN, Math.floor((fit - n) / (n - 1))), between, 0);
    holder.innerHTML = '';
    var majors = [];
    for (var r = 0; r < n; r++) {
      if (r > 0) for (var k = 0; k < between; k++) holder.appendChild(document.createElement('i'));
      var tick = document.createElement('i');
      tick.className = MAJOR;
      tick.setAttribute('role', 'button');
      tick.setAttribute('tabindex', '0');
      tick.setAttribute('aria-label', 'Show review ' + (r + 1) + ' of ' + n);
      holder.appendChild(tick);
      majors.push(tick);
    }
    // It is a control now, so screen readers should see it.
    bar.removeAttribute('aria-hidden');

    // ---- Where each review sits in the row -------------------------------------------------
    function maxScroll() { return Math.max(0, list.scrollWidth - list.clientWidth); }
    function targets() {
      var lr = list.getBoundingClientRect();
      var pad = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
      var max = maxScroll();
      return cards.map(function (c) {
        var left = c.getBoundingClientRect().left - lr.left + list.scrollLeft - pad;
        return Math.min(max, Math.max(0, left));
      });
    }

    // On a wide screen the last few cards can share one scroll position (the row's end), so a
    // review picked from the bar stays picked while the row is still where that click put it.
    var picked = -1, current = -1;
    // While the row glides to a picked review it passes other cards; that is not a new pick.
    var steering = false, settle = null;

    function compute() {
      if (steering && picked >= 0) return picked;
      var t = targets(), x = list.scrollLeft, best = Infinity;
      t.forEach(function (v) { best = Math.min(best, Math.abs(v - x)); });
      var near = [];
      t.forEach(function (v, i) { if (Math.abs(v - x) <= best + 2) near.push(i); });
      if (picked >= 0 && near.indexOf(picked) > -1) return picked;
      picked = -1;
      return near[near.length - 1];
    }

    function render() {
      var i = compute();
      if (i === current) return;
      majors.forEach(function (m, j) {
        m.classList.toggle(ACTIVE, j === i);
        m.setAttribute('aria-current', j === i ? 'true' : 'false');
      });
      current = i;
    }

    var queued = false;
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; render(); });
    }
    function idle() {
      clearTimeout(settle);
      settle = setTimeout(function () { steering = false; queue(); }, 200);
    }
    list.addEventListener('scroll', function () { if (steering) idle(); queue(); }, { passive: true });
    window.addEventListener('resize', queue);

    function go(i) {
      picked = i;
      steering = true;
      idle();
      var left = targets()[i];
      if (!reduced() && list.scrollTo) list.scrollTo({ left: left, behavior: 'smooth' });
      else list.scrollLeft = left;
      render();
    }

    // A click anywhere on the bar picks the nearest review, so the 2px ticks need no aiming.
    bar.addEventListener('click', function (e) {
      try {
        var best = 0, dist = Infinity;
        majors.forEach(function (m, i) {
          var b = m.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - e.clientX);
          if (d < dist) { dist = d; best = i; }
        });
        go(best);
      } catch (err) { console.debug('testimonial-bar: click', err); }
    });
    bar.addEventListener('keydown', function (e) {
      var i = majors.indexOf(e.target);
      if (i < 0) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i); }
      else if (e.key === 'ArrowRight' && i < n - 1) { e.preventDefault(); majors[i + 1].focus(); go(i + 1); }
      else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); majors[i - 1].focus(); go(i - 1); }
    });

    render();
  }

  function start() {
    try {
      var bars = document.querySelectorAll(BAR);
      if (!bars.length) return;
      addStyles();
      for (var i = 0; i < bars.length; i++) {
        try { init(bars[i]); } catch (err) { console.debug('testimonial-bar', err); }
      }
    } catch (err) {
      console.debug('testimonial-bar', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

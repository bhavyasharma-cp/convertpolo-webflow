/*
 * Home hero form — a way back out, on phone and tablet.
 *
 * Tapping "Get Started" plays a Webflow interaction that slides three things at once: the
 * button itself off to the left, the audit form in from the left, and the card row off to
 * the right. Below 992 the form then fills the screen the button used to be on, and nothing
 * closes it again — the button that opened it has slid away, so a visitor who did not want
 * the form is stuck with it until they reload the page.
 *
 * This file adds the missing control: a close button in the form's top-right corner (and
 * Escape for a keyboard). Closing puts the three elements back exactly as they were the
 * instant before the interaction ran — their transforms are photographed on the way in and
 * put back on the way out — so nothing here hard-codes an off-screen position, and the
 * breakpoints stay the only place that decides where the closed form sits.
 *
 * The button is styled from here: the Figma file has no close state for this form, so there
 * is no class in Webflow to use. It borrows the menu button's shape and colour. Remove this
 * block if one is designed.
 */
(function () {
  'use strict';

  var WRAP = '[data-cp="form"]';
  var OPENER = '[data-cp="form-open"]';
  var CARDS = '[data-cp="cards"]';
  var CLOSE = 'home-hero_form-close';
  var SHOWN = 'is-shown';
  var DURATION = 450;
  var MOVED = ['transform', 'translate', 'rotate', 'scale'];

  // The interaction writes exactly this on the wrapper while the form is open.
  function isOpen(wrap) {
    return (wrap.style.transform || '').indexOf('translate3d(0px, 0px, 0px)') !== -1;
  }

  var CSS =
    '.' + CLOSE + '{position:absolute;top:-46px;right:0;width:36px;height:36px;' +
    'display:none;align-items:center;justify-content:center;padding:0;border:0;' +
    'border-radius:20px;background:rgb(48,47,47);cursor:pointer;opacity:0;' +
    'transition:opacity .25s ease;z-index:3}' +
    '.' + CLOSE + '.' + SHOWN + '{opacity:1}' +
    '.' + CLOSE + ' span{position:absolute;width:14px;height:2px;border-radius:2px;background:#fff}' +
    '.' + CLOSE + ' span:first-child{transform:rotate(45deg)}' +
    '.' + CLOSE + ' span:last-child{transform:rotate(-45deg)}' +
    // Above 991 the form opens beside the headline and the button that opened it is still
    // on screen, so the close button belongs to the small screens only.
    '@media screen and (max-width:991px){.' + CLOSE + '{display:flex}}';

  function style() {
    try {
      if (document.getElementById('cp-hero-form-close-style')) return;
      var el = document.createElement('style');
      el.id = 'cp-hero-form-close-style';
      el.textContent = CSS;
      document.head.appendChild(el);
    } catch (err) { console.debug('[hero-form] style failed', err); }
  }

  function button(wrap) {
    var found = wrap.querySelector('.' + CLOSE);
    if (found) return found;
    var el = document.createElement('button');
    el.type = 'button';
    el.className = CLOSE;
    el.setAttribute('aria-label', 'Close the form');
    el.innerHTML = '<span></span><span></span>';
    wrap.appendChild(el);
    return el;
  }

  // Only the transform properties are remembered, never the whole style attribute: the card
  // row is also driven by GSAP on tablet, and handing it back a stale attribute would undo
  // whatever that has done since.
  function photograph(el) {
    var shot = { el: el };
    for (var i = 0; i < MOVED.length; i++) shot[MOVED[i]] = el.style[MOVED[i]] || '';
    return shot;
  }

  function restore(shot) {
    var el = shot.el;
    el.style.transition = 'transform ' + DURATION + 'ms cubic-bezier(.4,0,.2,1)';
    for (var i = 0; i < MOVED.length; i++) el.style[MOVED[i]] = shot[MOVED[i]];
    window.setTimeout(function () { el.style.transition = ''; }, DURATION + 60);
  }

  function init(wrap) {
    if (wrap.getAttribute('data-cp-closable')) return;
    wrap.setAttribute('data-cp-closable', 'true');

    var hero = wrap.closest ? wrap.closest('[data-cp="home-hero"]') : null;
    var scope = hero || document;
    var close = button(wrap);
    var shots = null;

    function show() { close.classList.toggle(SHOWN, isOpen(wrap)); }

    // Photographed on the click itself, before the interaction has written anything, so what
    // goes back is the page as it stood — not an off-screen value guessed here.
    var taken = 0;
    function remember() {
      try {
        // A tap fires pointerdown and then click; the second one would photograph a page the
        // interaction has already started to move.
        var now = Date.now();
        if (now - taken < 1200) return;
        taken = now;
        var list = [wrap];
        var opener = scope.querySelector(OPENER);
        var cards = scope.querySelector(CARDS);
        if (opener) list.push(opener);
        if (cards) list.push(cards);
        shots = list.map(photograph);
      } catch (err) { console.debug('[hero-form] snapshot failed', err); }
    }

    function shut(e) {
      if (e) e.preventDefault();
      try {
        close.classList.remove(SHOWN);
        if (shots && shots.length) shots.forEach(restore);
        else restore(photograph(wrap));   // nothing remembered: at least put the form back
        var opener = scope.querySelector(OPENER);
        if (opener) try { opener.focus({ preventScroll: true }); } catch (err) { }
      } catch (err) { console.debug('[hero-form] close failed', err); }
    }

    var opener = scope.querySelector(OPENER);
    if (opener) opener.addEventListener('click', remember, true);
    // Touch devices can fire the interaction from the tap before any click arrives.
    if (opener) opener.addEventListener('pointerdown', remember, true);

    close.addEventListener('click', shut);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen(wrap) && window.innerWidth < 992) shut();
    });

    // The interaction writes the inline style; watching it is what tells us the form is open,
    // without this file having to know how it was opened.
    try {
      new MutationObserver(show).observe(wrap, { attributes: true, attributeFilter: ['style'] });
    } catch (err) { console.debug('[hero-form] observer failed', err); }
    show();
  }

  function boot() {
    style();
    var list = document.querySelectorAll(WRAP);
    for (var i = 0; i < list.length; i++) {
      try { init(list[i]); } catch (err) { console.debug('[hero-form] init failed', err); }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

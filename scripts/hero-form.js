/*
 * Home hero form — a way back out, on phone and tablet.
 *
 * Tapping "Get Started" slides the audit form over the hero (a Webflow interaction, which
 * writes `transform: translate3d(0,0,0)` on `[data-cp="form"]`). Below 992 that form covers
 * the button that opened it, and nothing else on the screen closes it: the visitor who did
 * not want the form is stuck with it until they reload.
 *
 * This file adds the missing control — a close button in the form's top-right corner — and
 * closes the form by clearing the interaction's own inline transform, so the form eases back
 * to wherever the stylesheet parks it at that width. Nothing here hard-codes the closed
 * position, so the breakpoints stay the single source of truth for it, and the Webflow
 * interaction is left free to run again on the next tap.
 *
 * The button is styled from here: the Figma file has no close state for this form, so there
 * is no class in Webflow to use. It borrows the menu button's shape and colour. Remove this
 * block if one is designed.
 */
(function () {
  'use strict';

  var WRAP = '[data-cp="form"]';
  var CLOSE = 'home-hero_form-close';
  var SHOWN = 'is-shown';
  var DURATION = 450;

  // Webflow's interaction writes exactly this when the form is open.
  function isOpen(wrap) {
    var t = wrap.style.transform || '';
    return t.indexOf('translate3d(0px, 0px, 0px)') !== -1 || t === 'translate3d(0px, 0px, 0px)';
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
    // Above 991 the form opens beside the headline and the button that opened it stays
    // reachable, so the close button belongs to the small screens only.
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

  function init(wrap) {
    if (wrap.getAttribute('data-cp-closable')) return;
    wrap.setAttribute('data-cp-closable', 'true');

    // The wrapper is what the interaction moves; the button rides with it.
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

    var close = button(wrap);
    var timer = null;

    function show() { close.classList.toggle(SHOWN, isOpen(wrap)); }

    function shut(e) {
      if (e) e.preventDefault();
      try {
        close.classList.remove(SHOWN);
        // Ease back to the position the stylesheet gives this width, whatever it is, by
        // handing the property back to CSS rather than naming an off-screen value here.
        wrap.style.transition = 'transform ' + DURATION + 'ms cubic-bezier(.4,0,.2,1)';
        wrap.style.transform = '';
        wrap.style.translate = '';
        wrap.style.rotate = '';
        wrap.style.scale = '';
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { wrap.style.transition = ''; }, DURATION + 60);
        var opener = document.querySelector('[data-cp="form-open"]');
        if (opener) try { opener.focus({ preventScroll: true }); } catch (err) { }
      } catch (err) { console.debug('[hero-form] close failed', err); }
    }

    close.addEventListener('click', shut);
    // A keyboard visitor gets the same way out as the one who can see the button.
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

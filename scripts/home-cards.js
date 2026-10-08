/*
 * Home hero service cards — click / keyboard / swipe to open a card.
 * Figma: 1:8790 (CRO open), 1:8976 (Brand Building open), 1:9166 (Landing Page open).
 *
 * Markup (Webflow):
 *   [data-cp="cards"]            the row of cards
 *     [data-cp="card"]           one card; the open one carries the combo class `is-active`;
 *                                `data-href` is its service page — clicking the open card goes there
 *       video (optional)         plays only while its card is open
 *
 * The open/narrow look (width 574 → 118, 0.6s ease-out) is CSS in the hero's embed,
 * keyed off `.is-active`, so this script only moves that class.
 * Narrow cards only exist from 768px up; below that the row scrolls natively.
 */
(function () {
  'use strict';

  var DESKTOP = '(min-width: 768px)';
  var SWIPE_MIN = 40; // px of horizontal travel before a drag counts as a swipe

  function setActive(cards, next) {
    cards.forEach(function (card) {
      var on = card === next;
      card.classList.toggle('is-active', on);
      card.setAttribute('aria-expanded', on ? 'true' : 'false');
      var video = card.querySelector('video');
      if (!video) return;
      try {
        if (on) video.play(); else video.pause();
      } catch (e) {
        console.debug('[home-cards] video', e);
      }
    });
  }

  function init(row) {
    var cards = Array.prototype.slice.call(row.querySelectorAll('[data-cp="card"]'));
    if (cards.length < 2) return;
    var mq = window.matchMedia(DESKTOP);

    function activeIndex() {
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].classList.contains('is-active')) return i;
      }
      return 0;
    }

    // Sync the open card (and which video plays). On mobile every card is full and
    // every video keeps autoplaying, so leave them alone there.
    if (mq.matches) setActive(cards, cards[activeIndex()]);

    var swiped = false; // a swipe ends in a click; ignore that click

    // An open card (every card on mobile) goes to its service page: `data-href` on the card.
    function go(card, newTab) {
      var href = card.getAttribute('data-href');
      if (!href) return;
      if (newTab) window.open(href, '_blank', 'noopener');
      else window.location.href = href;
    }
    function isOpen(card) { return !mq.matches || card.classList.contains('is-active'); }

    cards.forEach(function (card) {
      if (card.getAttribute('data-href')) card.setAttribute('role', 'link');
      card.addEventListener('click', function (e) {
        if (swiped) { swiped = false; return; }
        if (isOpen(card)) return go(card, e.ctrlKey || e.metaKey);
        setActive(cards, card);
      });
      card.addEventListener('auxclick', function (e) {
        if (e.button === 1 && isOpen(card)) go(card, true);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (isOpen(card)) go(card, false);
        else setActive(cards, card);
      });
    });

    // Swipe (the Figma prototype switches cards on drag)
    var startX = null;
    row.addEventListener('pointerdown', function (e) {
      if (mq.matches) startX = e.clientX;
    });
    row.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < SWIPE_MIN) return;
      swiped = true;
      var i = activeIndex() + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < cards.length) setActive(cards, cards[i]);
    });
    row.addEventListener('pointercancel', function () { startX = null; });
  }

  function boot() {
    var rows = document.querySelectorAll('[data-cp="cards"]');
    for (var i = 0; i < rows.length; i++) {
      try {
        init(rows[i]);
      } catch (e) {
        console.debug('[home-cards] init failed', e);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

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
  var ZONE = 0.35;    // viewport heights of scroll that one card holds while it is open

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

  // Scrolling opens the cards in turn, the way the screen above hands over to the hero:
  // the hero holds still while each scroll opens the next card, and the page carries on
  // once the last one is open. Click, keyboard and swipe are untouched — this moves the
  // same is-active class they do, and tells them where the scroll now has to be.
  //
  // Desktop only. Below 768 there are no narrow cards and the row scrolls sideways itself.
  function drive(row, cards) {
    var hero = row.closest ? row.closest('[data-cp="home-hero"]') : null;
    if (!hero || !window.gsap || !window.ScrollTrigger) return null;

    var zones = cards.length;
    var at = 0, timer = null, settling = false, pin = null;

    function zonePx() { return Math.round(window.innerHeight * ZONE); }
    // A card rests at the start of its own slice, so the first one rests exactly where the
    // hand-off above puts the visitor — at the top of the hero — and the slice after the last
    // one is the room they need to scroll out again.
    function mark(i) { return Math.round(pin.start + (i / zones) * (pin.end - pin.start)); }

    function goTo(y) {
      settling = true;
      var done = function () { settling = false; };
      window.setTimeout(done, 900);            // never leave the flag stuck
      try {
        if (window.cpLenis) window.cpLenis.scrollTo(y, { duration: 0.4, onComplete: done });
        else { window.scrollTo(0, y); done(); }
      } catch (err) { done(); console.debug('[home-cards] scroll failed', err); }
    }

    // Come to rest on a card rather than between two of them, once the scrolling stops.
    function settle() {
      timer = null;
      if (!pin || !pin.isActive || settling) return;
      var y = pin.scroll();
      // Only between the first card and the last. Past either end the visitor is leaving the
      // hero, and pulling them back to a card would shut them inside it.
      if (y <= pin.start || y >= mark(zones - 1)) return;
      var want = mark(at);
      if (Math.abs(want - y) > 2) goTo(want);
    }

    gsap.registerPlugin(ScrollTrigger);
    pin = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: function () { return '+=' + zonePx() * zones; },
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        var want = Math.max(0, Math.min(zones - 1, Math.floor(self.progress * zones)));
        if (want !== at) {
          at = want;
          setActive(cards, cards[at]);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(settle, 140);
      }
    });

    // The hero's height is settled late (webfonts, the card videos), and the pin is measured
    // from it, so take the measurement again once the page has finished arriving.
    window.addEventListener('load', function () {
      try { ScrollTrigger.refresh(); } catch (err) { console.debug('[home-cards] refresh', err); }
    });

    // Opening a card by hand moves the scroll to match it, so the next scroll carries on
    // from that card instead of the page snapping back to where it happens to be.
    return function (i) {
      if (!pin || i < 0 || i >= zones || i === at) return;
      at = i;
      if (pin.isActive) goTo(mark(i));
    };
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
    var sync = null;    // set once the scroll driver is up; moves the page to match a card

    function choose(card) {
      setActive(cards, card);
      if (sync) sync(cards.indexOf(card));
    }

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
        choose(card);
      });
      card.addEventListener('auxclick', function (e) {
        if (e.button === 1 && isOpen(card)) go(card, true);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (isOpen(card)) go(card, false);
        else choose(card);
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
      if (i >= 0 && i < cards.length) choose(cards[i]);
    });
    row.addEventListener('pointercancel', function () { startX = null; });

    // Webflow injects GSAP late and ScrollTrigger comes from the site's own loader, so wait
    // for both rather than giving up. Without them the cards simply stay click-driven.
    if (!mq.matches) return;
    var waited = 0;
    var poll = window.setInterval(function () {
      waited += 50;
      if (!window.gsap || !window.ScrollTrigger) {
        if (waited < 6000) return;
        window.clearInterval(poll);
        return console.debug('[home-cards] no ScrollTrigger; cards stay click-driven');
      }
      window.clearInterval(poll);
      try {
        sync = drive(row, cards);
      } catch (err) {
        console.debug('[home-cards] scroll driver failed', err);
      }
    }, 50);
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

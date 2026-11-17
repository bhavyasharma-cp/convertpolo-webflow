/*
 * Testimonial cards — "Read More" and "Play Video".
 *
 * Both were bare `href="#"` links, so a click only jumped the page to the top. The Figma file
 * (CRO / LPO / BBS testimonials) draws them but gives neither a click state, so the behaviour
 * here was agreed with the client: Read More expands the quote in place, and Play Video opens
 * the clip in a lightbox.
 *
 * Markup (set in the Designer, Settings → Custom attributes):
 *
 *   a[data-cp="testimonial-more"][data-full="<the whole quote>"]
 *       Sits inside the quote paragraph, after a line break, as in Figma. Clicking swaps the
 *       paragraph's visible text for data-full and the link becomes "Read Less". With no
 *       data-full the link stays hidden (site head CSS), so a short quote shows no dead link.
 *
 *   a[data-cp="testimonial-play"][data-video="<URL>"]
 *       An .mp4/.webm file, or a YouTube or Vimeo link. With no URL the button stays hidden
 *       (site head CSS), so editors switch it on just by pasting a link.
 *
 * Every instance on the page is wired, so the cards can be copied anywhere.
 *
 * The cards sit inside pinned scroll sequences (infinity / circle / wave), which measure
 * the testimonial row when ScrollTrigger refreshes. So an expanded quote is capped in
 * height and scrolls inside the card (Lenis is told to leave that scroll alone), and every
 * card folds back before a refresh measures the row.
 */
(function () {
  'use strict';

  var MORE = '[data-cp="testimonial-more"]';
  var PLAY = '[data-cp="testimonial-play"]';
  var LIST = '[data-cp="testimonials"]';
  var MODAL = 'testimonial-video_modal';
  var LESS_LABEL = 'Read Less';

  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function addStyles() {
    if (document.getElementById('cp-testimonials-css')) return;
    var fade = reduced() ? 'none' : 'opacity .3s cubic-bezier(0,0,.58,1)';
    var css =
      // While a card is open the others keep their own height instead of stretching to it.
      LIST + '[data-cp-open]{align-items:flex-start}' +
      'p[data-cp-expanded]{max-height:50vh;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}' +
      '.' + MODAL + '{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;' +
        'padding:24px;background:rgba(0,0,0,.85);opacity:0;transition:' + fade + '}' +
      '.' + MODAL + '.is-shown{opacity:1}' +
      '.' + MODAL + '_frame{position:relative;width:min(960px,100%);max-height:100%;display:flex;justify-content:center}' +
      '.' + MODAL + '_frame.is-embed{aspect-ratio:16/9}' +
      '.' + MODAL + '_frame iframe{width:100%;height:100%;border:0;border-radius:10px;background:#000}' +
      '.' + MODAL + '_frame video{display:block;max-width:100%;max-height:calc(100vh - 48px);border-radius:10px;background:#000}' +
      '.' + MODAL + '_close{position:absolute;top:16px;right:16px;width:44px;height:44px;border:0;border-radius:50%;' +
        'background:var(--_colors---background--surface,#fff);color:var(--_colors---text--dark,#000);font-size:24px;' +
        'line-height:44px;text-align:center;cursor:pointer;padding:0}';
    var style = document.createElement('style');
    style.id = 'cp-testimonials-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---- Read More ----------------------------------------------------------------------

  // The quote is the paragraph's text before the link; Webflow writes it as one text node.
  function quoteNode(p) {
    for (var n = p.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return n;
    }
    return null;
  }

  function setExpanded(link, open) {
    var p = link.parentNode;
    var node = p && quoteNode(p);
    if (!node) return;
    if (link._cpShort == null) {
      link._cpShort = node.nodeValue;
      link._cpLabel = link.textContent;
    }
    node.nodeValue = open ? link.getAttribute('data-full') : link._cpShort;
    link.textContent = open ? LESS_LABEL : link._cpLabel;
    link.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      p.setAttribute('data-cp-expanded', '');
      p.setAttribute('data-lenis-prevent', '');
    } else {
      p.removeAttribute('data-cp-expanded');
      p.removeAttribute('data-lenis-prevent');
      p.scrollTop = 0;
    }
    var list = p.closest ? p.closest(LIST) : null;
    if (list) {
      if (list.querySelector('p[data-cp-expanded]')) list.setAttribute('data-cp-open', '');
      else list.removeAttribute('data-cp-open');
    }
  }

  function collapseAll() {
    var open = document.querySelectorAll(MORE + '[aria-expanded="true"]');
    for (var i = 0; i < open.length; i++) setExpanded(open[i], false);
  }

  function initMore(link) {
    var full = (link.getAttribute('data-full') || '').trim();
    if (!full) return;
    link.setAttribute('role', 'button');
    link.setAttribute('aria-expanded', 'false');
    link.addEventListener('click', function (e) {
      e.preventDefault();
      try { setExpanded(link, link.getAttribute('aria-expanded') !== 'true'); } catch (err) { console.debug('testimonials: read more', err); }
    });
  }

  // ---- Play Video ---------------------------------------------------------------------

  function embedUrl(url) {
    var m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1&rel=0';
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1] + '?autoplay=1';
    return null;
  }

  var current = null;

  function closeVideo() {
    if (!current) return;
    var modal = current.modal, opener = current.opener;
    current = null;
    document.removeEventListener('keydown', onKey, true);
    var v = modal.querySelector('video');
    if (v) { try { v.pause(); } catch (e) {} }
    modal.classList.remove('is-shown');
    setTimeout(function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      document.documentElement.style.overflow = current ? 'hidden' : '';
    }, reduced() ? 0 : 300);
    if (opener && opener.focus) opener.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeVideo(); }
  }

  function openVideo(link) {
    var url = (link.getAttribute('data-video') || '').trim();
    if (!url) return;
    closeVideo();

    var modal = document.createElement('div');
    modal.className = MODAL;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Video testimonial');

    var frame = document.createElement('div');
    frame.className = MODAL + '_frame';
    var embed = embedUrl(url);
    if (embed) {
      frame.className += ' is-embed';
      var iframe = document.createElement('iframe');
      iframe.src = embed;
      iframe.title = 'Video testimonial';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
    } else {
      var video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      frame.appendChild(video);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = MODAL + '_close';
    close.setAttribute('aria-label', 'Close video');
    close.textContent = '×';
    close.addEventListener('click', closeVideo);

    modal.appendChild(frame);
    modal.appendChild(close);
    // A click on the dark backdrop closes; a click on the player does not.
    modal.addEventListener('click', function (e) { if (e.target === modal) closeVideo(); });

    document.body.appendChild(modal);
    // Locking <html> also stops Lenis (smooth-scroll.js yields to a locked page).
    document.documentElement.style.overflow = 'hidden';
    current = { modal: modal, opener: link };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { modal.classList.add('is-shown'); });
    close.focus();
  }

  function initPlay(link) {
    if (!(link.getAttribute('data-video') || '').trim()) return;
    link.setAttribute('role', 'button');
    link.addEventListener('click', function (e) {
      e.preventDefault();
      try { openVideo(link); } catch (err) { console.debug('testimonials: play video', err); }
    });
  }

  // ---- Start ---------------------------------------------------------------------------

  function init() {
    try {
      var more = document.querySelectorAll(MORE);
      var play = document.querySelectorAll(PLAY);
      if (!more.length && !play.length) return;
      addStyles();
      for (var i = 0; i < more.length; i++) initMore(more[i]);
      for (var j = 0; j < play.length; j++) initPlay(play[j]);

      // Fold every card back before ScrollTrigger re-measures the pinned sequences. It may
      // arrive after this file, so wait for it briefly.
      var tries = 0;
      (function hook() {
        if (window.ScrollTrigger && ScrollTrigger.addEventListener) {
          ScrollTrigger.addEventListener('refreshInit', collapseAll);
          return;
        }
        if (++tries < 40) setTimeout(hook, 250);
      })();
    } catch (err) {
      console.debug('testimonials', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

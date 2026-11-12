/*
 * Audit forms — field validation with visible messages.
 *
 * Every audit form on the site is the same five fields (`.home-hero_form`): website,
 * full name, work email, phone, monthly traffic, and an optional start timeline.
 * Webflow gives them `required` and nothing else, so "abc", "not a domain" and
 * "letters here" were all accepted, and a Turnstile-protected form takes the submit
 * click before the browser's own validation ever runs — the visitor pressed Get Started
 * and nothing at all happened.
 *
 * This file owns the rules and the messages:
 *   - it checks on blur, clears a message as soon as the field is right,
 *     and checks everything again on submit;
 *   - it listens in the CAPTURE phase and stops the event there, so it runs ahead of
 *     Webflow's handler and of Turnstile;
 *   - `novalidate` goes on only once this is attached, so a file that never loads
 *     leaves the browser's own validation in place rather than removing it.
 *
 * Markup it writes: one `.form_error` div after each field, and `.is-error` on the input.
 * Both are styled from here — the Figma file has no error state, so there is no class in
 * Webflow to use. Remove this block if one is designed.
 */
(function () {
  'use strict';

  var FORMS = '.home-hero_form';
  var ERROR = 'form_error';

  // A field is found by its `name`, the same name the submission arrives under.
  var RULES = {
    'Website': {
      empty: 'Enter your website domain.',
      test: function (v) { return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v); },
      bad: 'That does not look like a domain — try example.com.'
    },
    'Full-Name': {
      empty: 'Enter your full name.',
      test: function (v) { return v.length >= 2 && !/\d/.test(v) && /[A-Za-zÀ-ɏЀ-ӿ]/.test(v); },
      bad: 'Enter your name as you would write it — letters only.'
    },
    'Work-Email': {
      empty: 'Enter your work email.',
      // Deliberately stricter than type="email", which accepts "a@b" with no domain.
      test: function (v) { return /^[^\s@]+@([\w-]+\.)+[A-Za-z]{2,}$/.test(v); },
      bad: 'Enter a complete email address, like name@company.com.'
    },
    'Phone': {
      empty: 'Enter a phone number.',
      test: function (v) { return /^\+?\d{7,15}$/.test(v.replace(/[\s().-]/g, '')); },
      bad: 'Enter a phone number — digits only, 7 to 15 of them.'
    },
    'Monthly-Traffic': {
      empty: 'Choose your monthly traffic.',
      test: function () { return true; },
      bad: ''
    },
    'Start-Timeline': {
      empty: '',                       // optional by design
      test: function () { return true; },
      bad: ''
    }
  };

  var CSS = '.' + ERROR + '{color:#c0341d;font-size:.8rem;line-height:1.3;margin-top:6px}' +
            '.form_input.is-error{border-color:#c0341d}';

  function style() {
    try {
      if (document.getElementById('cp-form-error-style')) return;
      var el = document.createElement('style');
      el.id = 'cp-form-error-style';
      el.textContent = CSS;
      document.head.appendChild(el);
    } catch (err) { console.debug('[audit-form] style failed', err); }
  }

  // The message sits after the field itself, or after the wrapper a select lives in, so
  // it never lands between the wrapper and the select.
  function slot(field) {
    var anchor = field.closest('.form_select-wrapper') || field;
    var next = anchor.nextElementSibling;
    if (next && next.classList.contains(ERROR)) return next;
    var el = document.createElement('div');
    el.className = ERROR;
    el.setAttribute('aria-live', 'polite');
    anchor.parentNode.insertBefore(el, anchor.nextSibling);
    return el;
  }

  function problem(field) {
    var rule = RULES[field.name];
    if (!rule) return '';
    var value = (field.value || '').trim();
    if (!value) return field.required ? rule.empty : '';
    return rule.test(value) ? '' : rule.bad;
  }

  function mark(field, message) {
    var box = slot(field);
    box.textContent = message || '';
    field.classList.toggle('is-error', !!message);
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !message;
  }

  function fields(form) {
    return Array.prototype.slice.call(form.querySelectorAll('input,select,textarea'))
      .filter(function (el) { return el.type !== 'submit' && RULES[el.name]; });
  }

  function init(form) {
    if (form.getAttribute('data-cp-validated')) return;
    form.setAttribute('data-cp-validated', 'true');

    var list = fields(form);
    if (!list.length) return;

    list.forEach(function (field) {
      field.addEventListener('blur', function () { mark(field, problem(field)); });
      // Once a field is right again the message goes immediately; while it is still
      // wrong the visitor is left to finish typing rather than nagged per keystroke.
      var clear = function () { if (!problem(field)) mark(field, ''); };
      field.addEventListener('input', clear);
      field.addEventListener('change', function () { mark(field, problem(field)); });
    });

    function check(e) {
      var first = null;
      list.forEach(function (field) {
        var message = problem(field);
        if (!mark(field, message) && !first) first = field;
      });
      if (!first) return;                  // all good: leave the submit alone
      e.preventDefault();
      e.stopImmediatePropagation();        // ahead of Webflow's handler and Turnstile's
      try { first.focus({ preventScroll: false }); } catch (err) { first.focus(); }
    }

    form.addEventListener('submit', check, true);
    // Turnstile puts the form into its loading state from the button's click, before any
    // submit event exists, so the click has to be caught as well.
    var button = form.querySelector('input[type="submit"],button[type="submit"]');
    if (button) button.addEventListener('click', check, true);

    // Only now, with our own messages in place, hand the browser's off.
    form.setAttribute('novalidate', 'novalidate');
  }

  function boot() {
    style();
    var forms = document.querySelectorAll(FORMS);
    for (var i = 0; i < forms.length; i++) {
      try {
        init(forms[i]);
      } catch (err) {
        console.debug('[audit-form] init failed', err);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

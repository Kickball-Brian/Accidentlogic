/**
 * Dynamic phone number — first-touch attribution.
 *
 * Captures the visitor's first landing path on initial visit and stores it in
 * sessionStorage. On every page, any element with `data-dynamic-phone` (or the
 * `[data-dynamic-phone-tel]` link) is rewritten based on the first-touch path.
 *
 * To override the phone for a landing page, edit the `landingPages` map below.
 * Match rule: longest matching path PREFIX wins. Falls back to `default`.
 */
(function () {
  'use strict';

  var CONFIG = {
    default: { raw: '8776651553', formatted: '877-665-1553' },
    landingPages: {
      // First-touch overrides. Match rule: key === path  OR  path starts with key + '/'.
      // (So '/' here matches ONLY the homepage, not every path.)
      '/':           { raw: '8332007101', formatted: '833-200-7101' },
      // '/lp/example': { raw: '8005551234', formatted: '800-555-1234' }
    },
    // Pages that ALWAYS show the default phone, regardless of first-touch.
    // Add a path here to lock it to the brand default (e.g. transactional pages).
    forceDefaultOn: ['/thank-you-int']
  };

  var STORAGE_KEY = 'al_first_touch_path';
  var firstTouch;
  try {
    firstTouch = sessionStorage.getItem(STORAGE_KEY);
    if (!firstTouch) {
      firstTouch = window.location.pathname || '/';
      sessionStorage.setItem(STORAGE_KEY, firstTouch);
    }
  } catch (e) {
    firstTouch = window.location.pathname || '/';
  }

  function pickPhone(path) {
    // Normalize: strip trailing slash (except root)
    var p = path.length > 1 ? path.replace(/\/$/, '') : path;
    var keys = Object.keys(CONFIG.landingPages).sort(function (a, b) {
      return b.length - a.length;
    });
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i].length > 1 ? keys[i].replace(/\/$/, '') : keys[i];
      if (p === k || (k !== '/' && p.indexOf(k + '/') === 0)) {
        return CONFIG.landingPages[keys[i]];
      }
    }
    return CONFIG.default;
  }

  // forceDefaultOn check uses CURRENT path, not first-touch.
  var currentPath = (window.location.pathname || '/').replace(/\/$/, '') || '/';
  var forceDefault = (CONFIG.forceDefaultOn || []).some(function (p) {
    var k = p.length > 1 ? p.replace(/\/$/, '') : p;
    return currentPath === k || (k !== '/' && currentPath.indexOf(k + '/') === 0);
  });

  var phone = forceDefault ? CONFIG.default : pickPhone(firstTouch);

  function apply() {
    document.querySelectorAll('[data-dynamic-phone]').forEach(function (el) {
      el.textContent = phone.formatted;
    });
    document.querySelectorAll('[data-dynamic-phone-tel]').forEach(function (el) {
      el.setAttribute('href', 'tel:+1' + phone.raw);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

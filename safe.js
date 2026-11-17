/* TAP shared guards. Exposes window.TapSafe: { apiBase(search), esc(v), isToken(v) }
 * Loaded by index.html and ceremony.html before their inline scripts.
 */
(function (global) {
  'use strict';

  // Every backend call carries the signed Telegram initData, so the backend
  // host must not be choosable by a link. ?api= is honoured only for a local
  // dev server; anything else is ignored and calls stay same-origin.
  const DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
  function apiBase(search) {
    const v = new URLSearchParams(search || '').get('api');
    if (!v) return '';
    try {
      const u = new URL(v);
      if ((u.protocol === 'http:' || u.protocol === 'https:') && DEV_HOSTS.includes(u.hostname)) return u.origin;
    } catch (e) {}
    return '';
  }

  // Backend strings are untrusted: escape before innerHTML.
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Meeting tokens end up in URLs; accept only URL-safe base64 characters.
  function isToken(v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v); }

  global.TapSafe = { apiBase, esc, isToken };
})(typeof window !== 'undefined' ? window : globalThis);

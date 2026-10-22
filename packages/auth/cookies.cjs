'use strict';

const { siteUrl } = require('./site.cjs');

/** Cookie operations shared by Netlify Function auth handlers. Parsers and
 * serializers are injected so each app can use the cookie version it ships. */
function createCookieHelpers({ parse, serialize }) {
  if (typeof parse !== 'function' || typeof serialize !== 'function') {
    throw new TypeError('Cookie parse and serialize functions are required');
  }

  function read(event, name) {
    const headers = event?.headers || {};
    const header = Object.keys(headers).find((key) => key.toLowerCase() === 'cookie');
    const cookies = parse(header ? headers[header] || '' : '');
    return cookies[name] || null;
  }

  // Browsers drop Secure cookies on plain-http sites such as the local one.
  function build(name, token, { clear = false, maxAge, secure = !siteUrl().startsWith('http://') } = {}) {
    return serialize(name, clear ? '' : token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      ...(Number.isFinite(maxAge) ? { maxAge: clear ? 0 : maxAge } : {}),
    });
  }

  return { read, build };
}

module.exports = { createCookieHelpers };

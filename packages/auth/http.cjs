'use strict';

const crypto = require('node:crypto');

function createHttpHelpers({ noStore = true } = {}) {
  function json(body, { statusCode = 200, headers = {}, cookies = [] } = {}) {
    const responseHeaders = { 'Content-Type': 'application/json', ...headers };
    if (noStore) responseHeaders['Cache-Control'] = 'no-store';
    const response = { statusCode, headers: responseHeaders, body: JSON.stringify(body) };
    if (cookies.length) response.multiValueHeaders = { 'Set-Cookie': cookies };
    return response;
  }

  function methodNotAllowed(allowed) {
    return json({ error: 'method_not_allowed' }, {
      statusCode: 405,
      headers: { Allow: allowed.join(', ') },
    });
  }

  function parseJsonBody(event) {
    if (!event.body) return {};
    try {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  return { json, methodNotAllowed, parseJsonBody };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a == null ? '' : a), 'utf8');
  const right = Buffer.from(String(b == null ? '' : b), 'utf8');
  if (left.length !== right.length) return false;
  try { return crypto.timingSafeEqual(left, right); } catch { return false; }
}

function verifyConfiguredSecret(expected, provided) {
  if (!String(expected || '')) {
    return { ok: false, error: 'missing_secret_configuration', statusCode: 500 };
  }
  if (!safeEqual(provided, expected)) {
    return { ok: false, error: 'unauthorized', statusCode: 401 };
  }
  return { ok: true, error: null, statusCode: 200 };
}

function headerCI(event, name) {
  if (!event?.headers) return '';
  const key = Object.keys(event.headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? event.headers[key] : '';
}

function allowedOrigins(event) {
  const out = new Set();
  (process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim())
    .filter(Boolean).forEach((origin) => out.add(origin.replace(/\/$/, '')));
  [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL]
    .filter(Boolean).forEach((origin) => out.add(origin.replace(/\/$/, '')));
  const host = headerCI(event, 'host');
  if (host) {
    out.add(`https://${host}`);
    out.add(`http://${host}`);
  }
  return out;
}

function verifyOrigin(event) {
  let candidate = headerCI(event, 'origin');
  if (!candidate) {
    const referer = headerCI(event, 'referer') || headerCI(event, 'referrer');
    if (referer) {
      try { candidate = new URL(referer).origin; } catch { /* invalid referrer */ }
    }
  }
  return !candidate || allowedOrigins(event).has(candidate.replace(/\/$/, ''));
}

module.exports = {
  createHttpHelpers,
  safeEqual,
  verifyConfiguredSecret,
  headerCI,
  allowedOrigins,
  verifyOrigin,
};

// Resolve the shared Robin login before changing credentials in RobinJr.
const { parse: parseCookies } = require('cookie');
const { siteUrl } = require('../../../packages/auth/site.cjs');

async function readApplicationIdentity(event) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  const token = cookies.robin_portal_session;
  if (!token) return null;
  const response = await fetch(`${siteUrl()}/portal/api/me`, {
    headers: { Cookie: `robin_portal_session=${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

module.exports = { readApplicationIdentity };

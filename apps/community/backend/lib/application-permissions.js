// Server-side application permissions helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const { parse: parseCookies } = require('cookie');
const { siteUrl } = require('../../../../packages/auth/site.cjs');

async function readApplicationIdentity(event) {
  const headers = event.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';
  const token = parseCookies(cookieHeader).robin_portal_session;
  if (!token) return null;
  const response = await fetch(`${siteUrl()}/portal/api/me`, {
    headers: { Cookie: `robin_portal_session=${token}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

function canUseRobinPlan(identity) {
  return identity?.is_application_admin === true;
}

module.exports = { readApplicationIdentity, canUseRobinPlan };

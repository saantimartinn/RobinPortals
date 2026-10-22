// Server-side application permissions helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const { parse: parseCookies } = require('cookie');

const APPLICATION_ME_URL = 'https://project-robin.com/portal/api/me';

async function readApplicationIdentity(event) {
  const headers = event.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';
  const token = parseCookies(cookieHeader).robin_portal_session;
  if (!token) return null;
  const response = await fetch(APPLICATION_ME_URL, {
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
